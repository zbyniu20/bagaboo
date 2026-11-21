// ==========================================
// POZIOM: ROOM 000 (opuszczone więzienie, horror: biały duch goni gracza w prawie całkowitej ciemności)
// Korytarze tworzą pięciokąt z przekątnymi (pentagram): każdy z pięciu narożników łączy się z każdym innym, a od zewnątrz wzdłuż boków stoją cele
// (układ i siatka: core/room000map.js). W celach leży 5 przedmiotów: 3 książki, pistolet i nóż (po jednym na każdym boku, miejsca losuje się co wejście).
// Zbierz wszystkie, a krata przy wyjściu na tylnym boku się otworzy. Biały Duch widzi daleko, słyszy bieg i każdy zabrany przedmiot, a po zniknięciu gracza
// jeszcze długo szuka. Latarka jest słaba, światła mrugają, wszędzie krew, szkielety, zwłoki i połamane meble. Po przedmiocie zapisuje się punkt kontrolny (Easy i Normal).
// ==========================================
import { THREE, L, tex, addCrispBlock, addInstancedBlocks } from '../core/engine.js';
import * as T from '../core/textures.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { levelReward, recordTime, diffOf } from '../core/economy.js';
import { toast } from '../core/terminal.js';
import { setPlayerPosition, releaseAll } from '../core/player.js';
import * as SFX from '../core/audio.js';
import { buzz } from '../core/haptics.js';
import { createGhost } from '../core/runkit.js';
import { createEvents } from '../core/events.js';
import { ARRIVAL_FROM_ROOM000 } from './levels.js';
import { buildDoor, cameraPanel, panelBg, drawInstructions, createJumpscare, introSeen, takeRespawn } from '../core/levelkit.js';
import * as M from '../core/room000map.js';

const PLAN = M.buildPlan(), GRID = M.rasterize(PLAN), DOORS = M.doorSpots(PLAN, GRID), H = M.GEO.H, G = M.GEO.CELL;
const SEE_DIST = 17, HEAR_RUN = 13, LOSE_TIME = 9, MEMORY_TIME = 5, CATCH_DIST = 1.0, ITEMS = 5;
const WALK = 1.9, INVESTIGATE = 3.2, CHASE = 4.6, ITEM_BOOST = 0.06;   // każdy przedmiot przyspiesza Ducha o 6%
const REWARD_FIRST = 4000, REWARD_REPEAT = 400, INTRO_TIME = 10, DECOR_SEED = 31337;
const NAMES = { book: 'a book', pistol: 'the pistol', knife: 'the knife' };
export const info = { id: 'room000', name: 'Room 000', spawn: [0, 1.0, -2.6] };
let S = null;

export function build() {
    L.spawn = info.spawn.slice();
    const W = GRID.GW * G, D = GRID.GH * G;
    L.bounds = { minX: GRID.X0 + 1, maxX: GRID.X0 + W - 1, minZ: GRID.Z0 + 1, maxZ: GRID.Z0 + D - 1, maxY: H - 0.3 };
    const df = diffOf('room000');
    S = { df: df, ghost: createGhost('room000'), ev: createEvents('room000', { skip: ['fog'] }), clock: 0, runT: 0, introT: INTRO_TIME, phase: 'intro', items: M.pickItems(PLAN, (Math.random() * 1e6) | 0), got: [], cp: -1, mon: null, caughtT: -1, leaving: false, hudT: 0, seen: 0, carried: false, whisperT: 6, lights: [], itemMesh: [] };
    S.got = S.items.map(() => false);
    buildShell(W, D);
    buildDecor();
    buildLights();
    buildItems();
    buildGate();
    buildGhost();
    buildDoor({ x: DOORS.start.x, z: DOORS.start.z, rotY: DOORS.start.rotY, label: 'LEVELS', color: '#bfe8ff', wood: 0x3a3228, portal: { target: 'levels', spawn: ARRIVAL_FROM_ROOM000, onEnter: () => toast('Back to the levels') } });
    S.hud = cameraPanel(1024, 200, 0.42, 0.082, 0.2, -0.75, 990);
    S.intro = cameraPanel(1280, 820, 1.0, 0.64, -0.04, -1.05, 995); S.intro.last = -1;
    S.scare = createJumpscare({ head: ghostHead(), scale: 2.1, y: -0.3, restZ: -1.3, fromZ: -4.2, eyes: false, flash: 0xffffff });
    if (df.id !== 'normal') toast('Difficulty: ' + df.name + (df.checkpoints ? '' : ' (no checkpoints)'), df.color);
}

// ---------- POWŁOKA: podłoga, sufit, ściany z siatki (instancje z osiowymi kolizjami) ----------
function buildShell(W, D) {
    const cx = GRID.X0 + W / 2, cz = GRID.Z0 + D / 2, R = T.mkRng(7070), tints = [0x6a6258, 0x5e5850, 0x756b60, 0x4e4a44, 0x625a52];
    addCrispBlock(cx, -0.5, cz, W + 4, 1, D + 4, 0x3a3632, 0x0a0806, tex.floor, { rough: tex.floorRough });
    addCrispBlock(cx, H + 0.5, cz, W + 4, 1, D + 4, 0x1c1a18, 0x0a0806, tex.wall);
    addInstancedBlocks(M.wallBlocks(GRID).map(b => ({ x: b.x, y: H / 2, z: b.z, w: b.w, h: H, d: b.d, color: tints[(R() * tints.length) | 0] })), tex.wall, { uvMeters: 3 });
}

// ---------- DEKORACJE: cała statyczna reszta (krew, kości, szkielety, zwłoki, meble, kraty) w JEDNEJ scalonej siatce z kolorami w wierzchołkach ----------
const GEOS = { box: new THREE.BoxGeometry(1, 1, 1), cyl: new THREE.CylinderGeometry(1, 1, 1, 6, 1), sph: new THREE.SphereGeometry(1, 8, 6), cone: new THREE.ConeGeometry(1, 1, 6, 1) };
function makeDecor() {
    const parts = [], base = new THREE.Matrix4(), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), pp = new THREE.Vector3(), ss = new THREE.Vector3(), col = new THREE.Color();
    return {
        // base: położenie i obrót całego przedmiotu (yaw, przechył wokół osi X i Z)
        at(x, y, z, yaw, rx, rz) { e.set(rx || 0, yaw || 0, rz || 0, 'YXZ'); q.setFromEuler(e); pp.set(x, y, z); ss.set(1, 1, 1); base.compose(pp, q, ss); },
        // część w układzie przedmiotu: kształt, położenie, rozmiar, obrót (rx, ry, rz) i kolor
        add(geo, x, y, z, sx, sy, sz, rx, ry, rz, color) {
            e.set(rx || 0, ry || 0, rz || 0, 'YXZ'); q.setFromEuler(e); pp.set(x, y, z); ss.set(sx, sy, sz); m4.compose(pp, q, ss); m4.premultiply(base);
            const c = geo.clone().applyMatrix4(m4), n = c.attributes.position.count, arr = new Float32Array(n * 3); col.set(color);
            for (let i = 0; i < n; i++) { arr[i * 3] = col.r; arr[i * 3 + 1] = col.g; arr[i * 3 + 2] = col.b; }
            c.setAttribute('color', new THREE.BufferAttribute(arr, 3)); parts.push(c);
        },
        flush() {
            if (!parts.length) return null;
            const mesh = new THREE.Mesh(mergeGeometries(parts), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, metalness: 0.12 }));
            mesh.receiveShadow = true; mesh.frustumCulled = false; L.root.add(mesh); return mesh;
        }
    };
}
const BONE = 0xd0c7ad, IRON = 0x2a2622, BLOOD = 0x2e0505, CLOTH = 0x7a5a24, SKIN = 0x9a9a88, WOOD = 0x4a3826;
// Przedmioty leżą wzdłuż lokalnej osi X; yaw ustawia je w świecie
function propBed(d, tipped) {
    d.add(GEOS.box, 0, 0.42, 0, 1.9, 0.1, 0.8, 0, 0, 0, 0x4b443a);
    for (const [x, z] of [[-0.9, -0.38], [0.9, -0.38], [-0.9, 0.38], [0.9, 0.38]]) d.add(GEOS.cyl, x, 0.2, z, 0.03, 0.4, 0.03, 0, 0, 0, IRON);
    for (const z of [-0.4, 0.4]) d.add(GEOS.box, 0, 0.38, z, 1.9, 0.05, 0.04, 0, 0, 0, IRON);
    if (!tipped) d.add(GEOS.box, 0.55, 0.49, 0, 0.5, 0.06, 0.55, 0, 0, 0, 0x6a5a40);   // sflaczała poduszka
}
function propToilet(d) { d.add(GEOS.cyl, 0, 0.18, 0, 0.19, 0.36, 0.19, 0, 0, 0, 0x8a8780); d.add(GEOS.box, 0, 0.5, -0.2, 0.42, 0.34, 0.14, 0, 0, 0, 0x7a7770); d.add(GEOS.cyl, 0, 0.37, 0, 0.17, 0.03, 0.17, 0, 0, 0, 0x2a2018); }
function propTable(d, broken) {
    d.add(GEOS.box, 0, 0.72, 0, 1.0, 0.05, 0.6, 0, 0, 0, WOOD);
    for (const [x, z, k] of [[-0.45, -0.25, 0], [0.45, -0.25, 1], [-0.45, 0.25, 2], [0.45, 0.25, 3]]) { if (broken && k === 2) continue; d.add(GEOS.cyl, x, 0.35, z, 0.035, 0.7, 0.035, 0, 0, 0, 0x3a2c1e); }
}
function propChair(d) {
    d.add(GEOS.box, 0, 0.45, 0, 0.42, 0.04, 0.42, 0, 0, 0, WOOD); d.add(GEOS.box, 0, 0.72, -0.2, 0.42, 0.5, 0.04, 0, 0, 0, WOOD);
    for (const [x, z] of [[-0.18, -0.18], [0.18, -0.18], [-0.18, 0.18]]) d.add(GEOS.cyl, x, 0.22, z, 0.025, 0.44, 0.025, 0, 0, 0, 0x3a2c1e);
}
function propSkeleton(d) {
    d.add(GEOS.sph, -0.62, 0.11, 0, 0.11, 0.13, 0.1, 0, 0, 0, BONE); d.add(GEOS.sph, -0.66, 0.04, 0, 0.07, 0.03, 0.07, 0, 0, 0, BONE);
    d.add(GEOS.cyl, -0.12, 0.05, 0, 0.025, 0.72, 0.025, 0, 0, Math.PI / 2, BONE);
    for (let i = 0; i < 5; i++) d.add(GEOS.box, -0.38 + i * 0.07, 0.08, 0, 0.02, 0.03, 0.34 - Math.abs(i - 2) * 0.05, 0, 0, 0, BONE);
    d.add(GEOS.box, 0.3, 0.05, 0, 0.14, 0.06, 0.3, 0, 0, 0, BONE);
    for (const z of [-1, 1]) { d.add(GEOS.cyl, 0.58, 0.04, z * 0.12, 0.022, 0.5, 0.022, 0, z * 0.25, Math.PI / 2, BONE); d.add(GEOS.cyl, 0.98, 0.03, z * 0.2, 0.02, 0.4, 0.02, 0, z * -0.35, Math.PI / 2, BONE); d.add(GEOS.cyl, -0.3, 0.04, z * 0.28, 0.02, 0.36, 0.02, 0, z * 0.7, Math.PI / 2, BONE); }
}
function propCorpse(d) {
    d.add(GEOS.box, 0, 0.12, 0, 0.5, 0.2, 0.3, 0, 0, 0, CLOTH); d.add(GEOS.sph, -0.38, 0.1, 0, 0.12, 0.12, 0.12, 0, 0, 0, SKIN);
    for (const z of [-1, 1]) { d.add(GEOS.box, 0.5, 0.08, z * 0.1, 0.55, 0.12, 0.13, 0, z * 0.15, 0, 0x6a4c1c); d.add(GEOS.box, -0.05, 0.08, z * 0.3, 0.45, 0.1, 0.1, 0, z * 0.5, 0, SKIN); }
}
function propBars(d) {   // wyłamane drzwi celi: skrzydło z prętami, uchylone
    for (let i = 0; i < 8; i++) d.add(GEOS.cyl, i * 0.12, 1.1, 0, 0.018, 2.2, 0.018, 0, 0, 0, IRON);
    for (const y of [0.1, 1.1, 2.15]) d.add(GEOS.box, 0.42, y, 0, 0.9, 0.04, 0.04, 0, 0, 0, IRON);
}
function buildDecor() {
    const d = makeDecor(), R = T.mkRng(DECOR_SEED), hw = M.GEO.CORR_W / 2;
    // cele: wyposażenie z map, kałuże krwi, wyłamane drzwi
    for (const cell of PLAN.cells) {
        for (const p of M.cellProps(PLAN, cell, DECOR_SEED)) {
            d.at(p.x, 0, p.z, p.rotY, 0, p.type === 'bed' && p.tipped ? 0.8 : (p.type === 'table' || p.type === 'chair') && p.broken ? (R() - 0.5) * 0.6 : 0);
            if (p.type === 'bed') propBed(d, p.tipped); else if (p.type === 'toilet') propToilet(d); else if (p.type === 'table') propTable(d, p.broken);
            else if (p.type === 'chair') propChair(d); else if (p.type === 'skeleton') propSkeleton(d); else if (p.type === 'corpse') propCorpse(d);
            else if (p.type === 'blood') { d.at(p.x, 0.008, p.z, 0); d.add(GEOS.cyl, 0, 0, 0, p.r, 0.006, p.r * 0.75, 0, R() * 6, 0, BLOOD); }
        }
        const hinge = M.cellPoint(PLAN, cell, -M.GEO.DOOR_W / 2 - 0.05, hw + 0.45), swing = (R() < 0.5 ? -1 : 1) * (0.9 + R() * 0.7);
        d.at(hinge[0], 0, hinge[1], M.cellYaw(PLAN, cell) + swing, 0, 0); propBars(d);
    }
    // korytarze i sale narożne: szkielety, zwłoki, krew, połamane meble, kości
    const spots = M.corridorSpots(GRID, PLAN, 70, DECOR_SEED + 1, 2.4);
    spots.forEach((s, i) => {
        const k = i % 7;
        if (k === 0 || k === 5) { d.at(s.x, 0, s.z, s.rotY); propSkeleton(d); }
        else if (k === 1) { d.at(s.x, 0, s.z, s.rotY); propCorpse(d); d.at(s.x, 0.008, s.z, 0); d.add(GEOS.cyl, 0, 0, 0, 0.9, 0.006, 0.7, 0, R() * 6, 0, BLOOD); }
        else if (k === 2 || k === 6) { const r = 0.5 + R() * 0.9; d.at(s.x, 0.008, s.z, 0); d.add(GEOS.cyl, 0, 0, 0, r, 0.006, r * 0.7, 0, R() * 6, 0, BLOOD); for (let n = 0; n < 4; n++) d.add(GEOS.cyl, (R() - 0.5) * 1.8, 0, (R() - 0.5) * 1.8, 0.06 + R() * 0.12, 0.006, 0.06 + R() * 0.1, 0, 0, 0, BLOOD); }
        else if (k === 3) { d.at(s.x, 0, s.z, s.rotY, 0, (R() - 0.5) * 0.7); propTable(d, true); d.at(s.x + 0.9, 0, s.z + 0.5, R() * 6, 0, (R() - 0.5) * 0.5); propChair(d); }
        else { d.at(s.x, 0, s.z, s.rotY); for (let n = 0; n < 7; n++) d.add(GEOS.box, (R() - 0.5) * 1.0, 0.03, (R() - 0.5) * 1.0, 0.35, 0.04, 0.04, 0, R() * 6, 0, BONE); d.add(GEOS.sph, 0.1, 0.1, 0.1, 0.11, 0.13, 0.1, 0, 0, 0, BONE); }
    });
    d.flush();
    buildWallMarks();
}
// Plamy krwi i napisy na ścianach (przy komórkach graniczących ze ścianą, zwrócone do wnętrza), tablice z numerami cel nad wejściami
function blotTexture(seed) {
    const c = T.makeCanvas(256, 256), x = c.getContext('2d'), R = T.mkRng(seed);
    for (let k = 0; k < 7; k++) {
        const cx = 40 + R() * 176, cy = 30 + R() * 90, r = 8 + R() * 26; x.fillStyle = 'rgba(' + (60 + (R() * 30 | 0)) + ',4,4,' + (0.7 + R() * 0.25) + ')';
        x.beginPath(); x.arc(cx, cy, r, 0, 7); x.fill();
        const len = 40 + R() * 150; x.fillRect(cx - 2 - R() * 3, cy, 3 + R() * 5, len); x.beginPath(); x.arc(cx, cy + len, 3 + R() * 3, 0, 7); x.fill();
    }
    return T.toTex(c, false);
}
function scrawlTexture(text) {
    const c = T.makeCanvas(256, 128), x = c.getContext('2d');
    x.font = 'bold 44px "Courier New", monospace'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = 'rgba(120,10,10,0.92)'; x.shadowColor = 'rgba(60,0,0,0.9)'; x.shadowBlur = 6;
    x.save(); x.translate(128, 64); x.rotate(-0.06); x.fillText(text, 0, 0); x.restore();
    return T.toTex(c, false);
}
function buildWallMarks() {
    const R = T.mkRng(DECOR_SEED + 5), blots = [1, 2, 3].map(i => blotTexture(900 + i)), words = ['HE IS WHITE', 'DO NOT RUN', 'LET ME OUT', 'IT SEES YOU', 'CELL 000', 'HELP', '5 THINGS'];
    const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    let placed = 0, tries = 0;
    while (placed < 46 && tries++ < 4000) {
        const i = (R() * GRID.GW) | 0, j = (R() * GRID.GH) | 0; if (!M.isOpenCell(GRID, i, j)) continue;
        const x = M.cellX(GRID, i), z = M.cellZ(GRID, j);
        if (Math.hypot(x - PLAN.spawn[0], z - PLAN.spawn[2]) < 3) continue;
        const dr = dirs[(R() * 4) | 0], wi = i + dr[0], wj = j + dr[1]; if (GRID.g[wj * GRID.GW + wi] !== 2) continue;
        const word = placed % 5 === 0, mat = new THREE.MeshStandardMaterial({ map: word ? scrawlTexture(words[(R() * words.length) | 0]) : blots[(R() * 3) | 0], transparent: true, roughness: 0.4, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
        const sz = word ? 1.5 : 1.0 + R() * 1.1, m = new THREE.Mesh(new THREE.PlaneGeometry(sz, word ? sz / 2 : sz), mat);
        m.position.set(x + dr[0] * (G / 2 - 0.01), word ? 1.5 + R() * 0.5 : 1.3 + R() * 0.8, z + dr[1] * (G / 2 - 0.01)); m.rotation.y = Math.atan2(-dr[0], -dr[1]); L.root.add(m); placed++;
    }
    // numery cel obok wejść (od strony korytarza)
    for (const cell of PLAN.cells) {
        const sd = PLAN.sides[cell.side], mid = M.sidePoint(sd, cell.c + 1.5, 0), p = M.wallFace(GRID, mid[0], mid[1], sd.n[0], sd.n[1]), c = T.makeCanvas(128, 64), x = c.getContext('2d');   // z boku od drzwi, na samej ścianie
        x.fillStyle = 'rgba(14,12,10,0.9)'; x.fillRect(0, 0, 128, 64); x.strokeStyle = 'rgba(180,170,150,0.5)'; x.strokeRect(2, 2, 124, 60);
        x.font = 'bold 40px "Courier New", monospace'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = 'rgba(200,190,170,0.85)'; x.fillText(String(cell.id + 1).padStart(3, '0'), 64, 34);
        const m = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.25), new THREE.MeshStandardMaterial({ map: T.toTex(c, false), roughness: 0.7 }));
        m.position.set(p[0] - sd.n[0] * 0.02, 2.45, p[1] - sd.n[1] * 0.02); m.rotation.y = Math.atan2(-sd.n[0], -sd.n[1]); L.root.add(m);
    }
}

// ---------- ŚWIATŁA: słabe, migoczące żarówki; reszta tonie w ciemności ----------
function buildLights() {
    for (const s of M.lightSpots(PLAN)) {
        const col = s.exit ? 0xff6a40 : s.hub ? 0xffa860 : 0xd8c8a0, l = new THREE.PointLight(col, s.hub ? 5.5 : 3.6, s.hub ? 11 : 8, 1.8);
        l.position.set(s.x, H - 0.45, s.z); L.root.add(l);
        const b = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), new THREE.MeshBasicMaterial({ color: col })); b.position.copy(l.position); L.root.add(b);
        S.lights.push({ l: l, b: b, base: l.intensity, ph: Math.random() * 20, dead: Math.random() < 0.25 });
    }
}

// ---------- PRZEDMIOTY: książka, pistolet, nóż (słaby poblask, żeby dało się je wypatrzeć w ciemności) ----------
function itemModel(kind, k) {
    const g = new THREE.Group(), mat = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.6 }, o || {}));
    if (kind === 'book') {
        const cover = [0x6a1a1a, 0x1a3a5a, 0x2a4a2a][k % 3];
        g.add(new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.045, 0.3), mat(cover, { emissive: cover, emissiveIntensity: 0.25 })));
        const pages = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.03, 0.28), mat(0xe8dcc0, { emissive: 0xe8dcc0, emissiveIntensity: 0.18 })); pages.position.set(0.012, 0, 0); g.add(pages);
    } else if (kind === 'pistol') {
        const metal = mat(0x2a2c30, { metalness: 0.9, roughness: 0.3, emissive: 0x3a4048, emissiveIntensity: 0.35 });
        const slide = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.05, 0.036), metal); slide.position.y = 0.045; g.add(slide);
        const grip = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.12, 0.034), metal); grip.position.set(-0.07, -0.005, 0); grip.rotation.z = 0.25; g.add(grip);
        const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.07, 8), metal); barrel.rotation.z = Math.PI / 2; barrel.position.set(0.14, 0.045, 0); g.add(barrel);
    } else {
        const blade = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.012, 0.042), mat(0xc8ccd4, { metalness: 0.95, roughness: 0.2, emissive: 0x8890a0, emissiveIntensity: 0.4 })); blade.position.x = 0.1; g.add(blade);
        const tip = new THREE.Mesh(new THREE.ConeGeometry(0.021, 0.07, 4), blade.material); tip.rotation.z = -Math.PI / 2; tip.position.set(0.265, 0, 0); tip.scale.set(1, 1, 0.5); g.add(tip);
        const handle = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.03, 0.036), mat(0x2a1a10)); handle.position.x = -0.095; g.add(handle);
    }
    return g;
}
function buildItems() {
    let books = 0;
    S.itemMesh = S.items.map((it) => {
        const g = new THREE.Group(), m = itemModel(it.kind, it.kind === 'book' ? books++ : 0); m.position.y = 0.06; m.rotation.y = Math.random() * 6.28; g.add(m); g.position.set(it.x, 0.02, it.z);
        const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex.dot, color: 0xb8c8ff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.35 })); glow.scale.set(0.8, 0.8, 1); glow.position.y = 0.15; g.add(glow);
        g.userData.glow = glow; L.root.add(g); return g;
    });
}
function buildGate() {
    const gx = DOORS.exit.x;
    S.gate = addCrispBlock(gx, H / 2, PLAN.gateZ, M.GEO.CORR_W - 0.1, H, 0.3, 0x2a2a30, 0xff3030);
    S.gateOb = L.obstacles[L.obstacles.length - 1];
    S.gateLamp = new THREE.PointLight(0xff3030, 6, 9, 1.6); S.gateLamp.position.set(gx, 2.4, PLAN.gateZ + 1.6); L.root.add(S.gateLamp);
    buildDoor({ x: gx, z: DOORS.exit.z, rotY: DOORS.exit.rotY, label: 'EXIT', color: '#ff9a60', glow: 0xff7030, wood: 0x2a1e18, light: true, portal: { target: 'levels', spawn: ARRIVAL_FROM_ROOM000, onEnter: finish } });
}

// ---------- BIAŁY DUCH ----------
function ghostHead() {
    const g = new THREE.Group(), white = new THREE.MeshStandardMaterial({ color: 0xf4f6ff, emissive: 0xb8c4ff, emissiveIntensity: 0.6, roughness: 0.9 }), black = new THREE.MeshBasicMaterial({ color: 0x000000 });
    const skull = new THREE.Mesh(new THREE.SphereGeometry(0.2, 14, 10), white); skull.scale.set(0.85, 1.3, 0.92); g.add(skull);
    for (const sx of [-1, 1]) { const eye = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), black); eye.scale.set(1, 1.7, 0.5); eye.position.set(sx * 0.075, 0.05, 0.17); eye.rotation.z = sx * 0.25; g.add(eye); }
    const mouth = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), black); mouth.scale.set(0.9, 2.1, 0.4); mouth.position.set(0, -0.14, 0.17); g.add(mouth);
    for (let i = 0; i < 9; i++) { const a = (i / 9 - 0.5) * 2.2, h = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.7 + (i % 3) * 0.15, 5), white); h.position.set(Math.sin(a) * 0.17, -0.3, -0.12 - Math.cos(a) * 0.04); h.rotation.x = Math.PI + (i % 2) * 0.05; g.add(h); }
    return g;
}
function buildGhost() {
    const g = new THREE.Group(), white = new THREE.MeshStandardMaterial({ color: 0xf4f6ff, emissive: 0xaab6ff, emissiveIntensity: 0.55, roughness: 0.9, transparent: true, opacity: 0.88, side: THREE.DoubleSide });
    const body = new THREE.Mesh(new THREE.LatheGeometry([[0.02, 0], [0.34, 0.05], [0.4, 0.4], [0.3, 1.0], [0.22, 1.5], [0.15, 1.75], [0.02, 1.8]].map(p => new THREE.Vector2(p[0], p[1])), 14), white); body.position.y = 0.25; g.add(body);
    for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2, t = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.5 + (i % 3) * 0.15, 5), white); t.rotation.x = Math.PI; t.position.set(Math.cos(a) * 0.32, 0.12, Math.sin(a) * 0.32); g.add(t); }
    const head = ghostHead(); head.position.y = 2.2; g.add(head);
    const arms = [];
    for (const sx of [-1, 1]) {
        const pivot = new THREE.Group(); pivot.position.set(sx * 0.3, 1.95, 0.02); g.add(pivot);
        const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.03, 1.15, 8), white); arm.position.y = -0.55; pivot.add(arm);
        for (let f = 0; f < 4; f++) { const fg = new THREE.Mesh(new THREE.ConeGeometry(0.014, 0.3, 5), white); fg.rotation.x = Math.PI + (f - 1.5) * 0.18; fg.position.set((f - 1.5) * 0.03, -1.22, 0); pivot.add(fg); }
        arms.push(pivot);
    }
    const light = new THREE.PointLight(0xc8d8ff, 4.5, 9, 2); light.position.y = 1.6; g.add(light);
    const aura = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex.dot, color: 0xc8d4ff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.35 })); aura.scale.set(3.2, 3.2, 1); aura.position.y = 1.5; g.add(aura);
    g.scale.setScalar(1.12); L.root.add(g);
    const far = [PLAN.corners[2], PLAN.corners[3], PLAN.corners[1], PLAN.corners[4]][(Math.random() * 4) | 0];
    S.mon = { g: g, mat: white, arms: arms, light: light, aura: aura, x: far[0], z: far[1], y: 0, dir: 0, mode: 'patrol', dist: null, goal: null, repath: 0, lostT: 0, smellT: 0, last: null, start: far.slice(), phase: Math.random() * 9 };
    g.position.set(S.mon.x, 0, S.mon.z);
}

// ---------- ZDARZENIA ----------
function finish() {
    if (S.leaving) return; S.leaving = true;
    toast('You got out of Room 000!', '#ffb070');
    levelReward('room000', REWARD_FIRST, REWARD_REPEAT, 'escaping Room 000');
    S.ghost.finish(recordTime('room000', S.runT) && !S.carried, S.runT);
}
function caught() {
    if (S.caughtT >= 0) return;
    S.caughtT = 0; S.scare.trigger(); releaseAll(); buzz('both', 1, 400);
    toast('It found you...', '#e0533f');
}
// Hałas: Duch w zasięgu idzie sprawdzić miejsce (o ile akurat nie goni)
function makeNoise(x, z, range) {
    const m = S.mon; if (m.mode === 'chase') return;
    if (Math.hypot(x - m.x, z - m.z) < range * (S.df.id === 'nightmare' ? 1.25 : 1)) setGoal(m, M.toCell(GRID, x, z), 'investigate');
}
function takeItem(i, p) {
    const it = S.items[i]; S.got[i] = true; S.itemMesh[i].visible = false; buzz('both', 0.8, 250);
    const n = S.got.filter(Boolean).length;
    toast('Found ' + NAMES[it.kind] + ' (' + n + '/' + ITEMS + ')', '#ffb88a');
    SFX.stinger({ x: it.x, y: 1.2, z: it.z });
    makeNoise(it.x, it.z, it.kind === 'pistol' ? 60 : 38);   // pistolet brzęczy najgłośniej
    if (S.df.checkpoints) { S.cp = i; toast('Checkpoint saved', '#7fc47f'); }
    if (n === ITEMS) {
        const k = L.obstacles.indexOf(S.gateOb); if (k >= 0) L.obstacles.splice(k, 1);
        if (S.gateOb.body) S.gateOb.body.position.y = -50;
        S.gate.visible = false; S.gateLamp.color.setHex(0x30ff60); SFX.bell && SFX.bell();
        toast('The gate is open! Run to the EXIT!', '#ffd27a');
    }
}
const INTRO = [
    'The White Ghost glows faintly in the dark. It sees far and hears running (13 m).',
    'Find 5 objects in the prison cells: 3 books, a pistol and a knife. One on every side of the pentagon.',
    'Five long corridors connect every corner to every other: the sides and the diagonals. Learn the loops.',
    'Taking an item makes noise and the Ghost grows faster. The gate by the EXIT opens when you have all 5.',
    'Walk, do not run. Lose it around corners and wait in a cell. Each item saves a checkpoint.'
];

// ---------- CO KLATKĘ ----------
export function update(dt, t, ctx) {
    if (!S || S.leaving) return;
    S.clock += dt; const p = ctx.body.position;
    S.ev.update(dt, S.phase === 'play' && S.caughtT < 0);
    S.scare.update(dt);
    if (S.introSkip === undefined) { S.introSkip = introSeen('room000'); if (S.introSkip) S.introT = Math.min(S.introT, 3); }
    if (S.introT > 0) {
        S.introT -= dt;
        const sec = Math.max(0, Math.ceil(S.introT));
        if (sec !== S.intro.last) { S.intro.last = sec; drawInstructions(S.intro, 'Room 000', INTRO, 'It wakes in ' + sec + ' s', { bg: 'rgba(8,8,10,0.94)', border: '#c8d0ff', title: '#eef0ff', text: '#dcdce8', footer: '#ff3020', size: 28 }); }
        S.intro.mesh.visible = S.introT > 0 && !S.introSkip;
        if (S.introT <= 0) { S.phase = 'play'; toast('Find 5 objects. Do not run!', '#c8d0ff'); }
    }
    if (S.phase === 'play' && S.caughtT < 0) S.runT += dt;
    S.ghost.tick(dt, p, S.phase === 'play' && S.caughtT < 0);
    S.itemMesh.forEach((g, i) => { if (!S.got[i]) { g.userData.glow.material.opacity = 0.25 + 0.15 * Math.sin(t * 2 + i); if (Math.hypot(p.x - S.items[i].x, p.z - S.items[i].z) < 1.0 && Math.abs(p.y - 1.0) < 1.5) takeItem(i, p); } });
    for (const L2 of S.lights) {   // mrugające żarówki, część martwa
        const f = L2.dead ? 0.15 * (Math.sin(t * 13 + L2.ph) > 0.6 ? 1 : 0) : 0.55 + 0.45 * Math.sin(t * 7.3 + L2.ph) * Math.sin(t * 3.1 + L2.ph * 2) + (Math.sin(t * 0.7 + L2.ph) > 0.93 ? -0.5 : 0);
        L2.l.intensity = L2.base * Math.max(0, f); L2.b.visible = f > 0.2;
    }
    if (S.caughtT >= 0) {
        S.caughtT += dt;
        if (S.caughtT > 1.6) {
            if (S.cp >= 0 && takeRespawn(S)) { const r = S.items[S.cp]; setPlayerPosition(r.x, 1.0, r.z); resetGhost(); S.caughtT = -1; S.carried = true; toast('Back at the last item. It lost you.', '#7fc47f'); }
            else { S.leaving = true; ctx.goto('room000'); return; }
        }
        animate(t); return;
    }
    if (S.phase === 'play') think(dt, ctx);
    animate(t);
    S.hudT -= dt; if (S.hudT <= 0) { S.hudT = 0.15; drawHud(); }
}
function resetGhost() {
    const m = S.mon; m.x = m.start[0]; m.z = m.start[1]; m.mode = 'patrol'; m.dist = null; m.goal = null; m.lostT = 0; m.smellT = 0; m.last = null;
}
function setGoal(m, cell, mode) { m.goal = cell; m.mode = mode; m.dist = M.distField(GRID, cell[0], cell[1]); m.repath = 0.35; }
function sees(m, p) {
    const dx = p.x - m.x, dz = p.z - m.z, d = Math.hypot(dx, dz), range = SEE_DIST * (S.df.id === 'nightmare' ? 1.2 : (S.df.id === 'easy' ? 0.8 : 1));
    if (d > range) return false;
    if (m.mode !== 'chase' && d > 4 && (dx * Math.sin(m.dir) + dz * Math.cos(m.dir)) / d < 0.1) return false;
    return M.clearLine(GRID, m.x, m.z, p.x, p.z);
}
function think(dt, ctx) {
    const p = ctx.body.position, m = S.mon, speedXZ = Math.hypot(ctx.body.velocity.x, ctx.body.velocity.z), n = S.got.filter(Boolean).length, mul = S.df.speed * (1 + ITEM_BOOST * n);
    const seesMe = sees(m, p), d = Math.hypot(p.x - m.x, p.z - m.z), pc = M.toCell(GRID, p.x, p.z), prev = m.mode;
    S.seen = seesMe ? 1 : 0;
    if (seesMe) { if (prev !== 'chase') { SFX.stinger({ x: m.x, y: 1.6, z: m.z }); SFX.whisper({ x: m.x, y: 1.6, z: m.z }); } m.mode = 'chase'; m.lostT = 0; m.smellT = 0; m.last = [p.x, p.z]; }
    else if (m.mode === 'chase') {
        m.lostT += dt; m.smellT += dt;
        if (m.smellT < MEMORY_TIME) { m.smellR = (m.smellR || 0) - dt; if (m.smellR <= 0) { m.smellR = 1.2; m.last = [p.x + (Math.random() - 0.5) * 9, p.z + (Math.random() - 0.5) * 9]; } }   // jeszcze kilka sekund wie mniej więcej, gdzie jesteś
        if (m.lostT > LOSE_TIME) { m.mode = 'patrol'; m.goal = null; m.dist = null; }
    }
    else if (speedXZ > 3.4 && d < HEAR_RUN * (S.df.id === 'nightmare' ? 1.3 : 1) && M.isOpenCell(GRID, pc[0], pc[1])) setGoal(m, pc, 'investigate');
    let speed = WALK * mul;
    if (m.mode === 'chase') {
        speed = CHASE * mul; m.repath -= dt;
        const tgt = seesMe || !m.last ? [p.x, p.z] : m.last, tc = M.toCell(GRID, tgt[0], tgt[1]);
        if ((m.repath <= 0 || !m.dist) && M.isOpenCell(GRID, tc[0], tc[1])) { m.goal = tc; m.dist = M.distField(GRID, tc[0], tc[1]); m.repath = 0.3; }
    } else if (m.mode === 'investigate') {
        speed = INVESTIGATE * mul;
        if (Math.hypot(M.cellX(GRID, m.goal[0]) - m.x, M.cellZ(GRID, m.goal[1]) - m.z) < 1.5) { m.mode = 'patrol'; m.goal = null; m.dist = null; }
    } else if (!m.goal || Math.hypot(M.cellX(GRID, m.goal[0]) - m.x, M.cellZ(GRID, m.goal[1]) - m.z) < 1.5) {
        const near = Math.random() < (S.df.id === 'nightmare' ? 0.5 : (S.df.id === 'easy' ? 0.1 : 0.3)), base = near ? pc : [((Math.random() * GRID.GW) | 0), ((Math.random() * GRID.GH) | 0)];
        for (let k = 0; k < 40; k++) {
            const c = near ? [base[0] + (((Math.random() * 29) | 0) - 14), base[1] + (((Math.random() * 29) | 0) - 14)] : [((Math.random() * GRID.GW) | 0), ((Math.random() * GRID.GH) | 0)];
            if (M.isOpenCell(GRID, c[0], c[1])) { setGoal(m, c, 'patrol'); break; }
        }
    }
    // Ruch po siatce: kilka komórek w stronę celu (wygładza trasę), bez wchodzenia w ścianę
    if (m.dist) {
        let c = M.toCell(GRID, m.x, m.z), tx = m.x, tz = m.z;
        for (let s = 0; s < 4; s++) { const nx = M.stepToward(GRID, m.dist, c[0], c[1]); if (!nx) break; c = nx; tx = M.cellX(GRID, c[0]); tz = M.cellZ(GRID, c[1]); }
        if (m.mode === 'chase' && seesMe && d < 3.5) { tx = p.x; tz = p.z; }
        const dx = tx - m.x, dz = tz - m.z, l = Math.hypot(dx, dz);
        if (l > 0.05) {
            const nx = m.x + dx / l * speed * dt, nz = m.z + dz / l * speed * dt;
            if (M.isOpen(GRID, nx, nz)) { m.x = nx; m.z = nz; } else if (M.isOpen(GRID, nx, m.z)) m.x = nx; else if (M.isOpen(GRID, m.x, nz)) m.z = nz;
            let dd = Math.atan2(dx, dz) - m.dir; while (dd > Math.PI) dd -= Math.PI * 2; while (dd < -Math.PI) dd += Math.PI * 2; m.dir += dd * Math.min(1, dt * 5);
        }
    }
    // Szepty i bicie serca, gdy jest blisko
    S.whisperT -= dt; if (S.whisperT <= 0 && d < 16) { S.whisperT = 5 + Math.random() * 9; SFX.whisper({ x: m.x, y: 1.6, z: m.z }); }
    if (d < 18) SFX.heartbeat(Math.max(0, 1 - d / 18) * (m.mode === 'chase' ? 1 : 0.7));
    if (d < CATCH_DIST && Math.abs(p.y - 1.1) < 1.6) caught();
}
function animate(t) {
    const m = S.mon, chase = m.mode === 'chase', ph = t + m.phase;
    m.g.position.set(m.x, 0.12 + Math.sin(ph * 1.7) * 0.07, m.z); m.g.rotation.y = m.dir;
    for (let i = 0; i < 2; i++) m.arms[i].rotation.x = chase ? -1.25 + Math.sin(ph * 9 + i * 2) * 0.12 : 0.18 + Math.sin(ph * 1.3 + i * 3) * 0.12;
    m.arms[0].rotation.z = 0.12 + Math.sin(ph * 1.1) * 0.06; m.arms[1].rotation.z = -0.12 - Math.sin(ph * 1.1) * 0.06;
    const flick = 0.85 + 0.15 * Math.sin(ph * 17) * Math.sin(ph * 5.3);
    m.mat.opacity = (chase ? 0.95 : 0.78) * flick; m.light.intensity = (chase ? 6.5 : 3.5) * flick; m.aura.material.opacity = (chase ? 0.5 : 0.28) * flick;
    S.gateLamp.intensity = S.got.every(Boolean) ? 6 : 5 + Math.sin(t * 6) * 2;
}
function fmt(s) { s = Math.max(0, Math.floor(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); }
function drawHud() {
    const x = S.hud.ctx; panelBg(S.hud, 'rgba(8,8,10,0.74)');
    x.textBaseline = 'middle'; x.textAlign = 'left';
    x.font = 'bold 78px "Courier New", monospace'; x.fillStyle = '#e8eaff'; x.fillText(fmt(S.runT), 30, 74);
    if (S.df.id !== 'normal') { x.font = 'bold 22px "Courier New", monospace'; x.fillStyle = S.df.color; x.fillText(S.df.name.toUpperCase(), 330, 18); }
    const has = (k) => S.items.reduce((a, it, i) => a + (it.kind === k && S.got[i] ? 1 : 0), 0), n = S.got.filter(Boolean).length;
    x.font = 'bold 30px "Courier New", monospace'; x.fillStyle = n === ITEMS ? '#7fff90' : '#c8d0ff'; x.fillText('Books ' + has('book') + '/3   Pistol ' + has('pistol') + '/1   Knife ' + has('knife') + '/1', 330, 50);
    x.font = 'bold 26px "Courier New", monospace';
    let msg = 'Walk. Listen. Stay out of its sight.', col = '#cfc8c0';
    if (n === ITEMS) { msg = 'RUN to the EXIT gate!'; col = '#7fff90'; }
    else if (S.seen > 0) { msg = 'IT SEES YOU! Break the line of sight!'; col = '#ff4a2a'; }
    x.fillStyle = col; x.fillText(msg, 330, 108);
    S.hud.update();
}
export const testState = () => S;   // dla testów: dostęp do stanu poziomu
export function dispose() {
    if (S) { S.ev.dispose(); S.ghost.dispose(); S.hud.dispose(); S.intro.dispose(); S.scare.dispose(); }
    S = null;
}
