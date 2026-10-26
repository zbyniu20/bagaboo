// ==========================================
// POZIOM 3: STUDNIA (The Well)
// Wąski szyb 4,6 x 4,6 m i 64 m wysokości. Od dołu podnosi się czarna maź z rękami.
// Ściany są śliskie, dobrze trzymają tylko kości, rury i półki. Kraty blokują drogę, dopóki nie
// pociągniesz za łańcuchy. Klapa na szczycie otwiera się najwcześniej po ponad 3 minutach.
// ==========================================
import { THREE, CANNON, L, tex, camera, lighting, world, addCrispBlock, addStaticBody, scaleBoxUVs } from '../core/engine.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { LIGHT_PRESETS } from '../core/config.js';
import * as T from '../core/textures.js';
import { buildMannequin } from '../core/mannequin.js';
import { addBones, saveGame, SAVE } from '../core/economy.js';
import { toast } from '../core/terminal.js';
import { hands } from '../core/player.js';
import * as SFX from '../core/audio.js';
import { ARRIVAL_WELL } from './lobby-door.js';

// ---------- USTAWIENIA (trudność) ----------
const NP = LIGHT_PRESETS.night;
const HS = 2.3, TOP = 64;                  // pół szerokości szybu i wysokość wyjścia
const GRATES = [16, 32, 48];               // kraty na tych wysokościach
const PULLS_PER_GRATE = 6, HATCH_PULLS = 3;
const MIN_TIME = 190;                      // klapa na szczycie nie otworzy się wcześniej (ponad 3 minuty)
const INTRO_TIME = 10, RESTART_INTRO = 3;
const WALL_GRIP = 0.3, HOLD_GRIP = 1.0, PIPE_GRIP = 0.9;   // przyczepność: śliska ściana / kość / rura
const MOVE_SCALE = 0.72;                   // ogólne osłabienie odepchnięć
const MAX_UP = 3.2;                        // maks. prędkość w górę (m/s)
const EXTRA_GRAVITY = 3.0;                 // dodatkowe przyciąganie w dół (m/s²)
const OOZE_SPEED = 0.11, OOZE_ACCEL = 0.00035;      // maź: prędkość startowa i przyspieszenie
const SURGE_MIN = 35, SURGE_MAX = 55, SURGE_HEIGHT = 2.2;
const SCARE_MIN = 22, SCARE_MAX = 38;      // co ile sekund jumpscare
const CRUMBLE_TIME = 1.2;                  // tyle wytrzyma pękająca kość
const REWARD_FIRST = 2500, REWARD_REPEAT = 250;
export const info = { id: 'well', name: 'The Well', spawn: [0, 1.0, 0.8] };

let S = null, restartFlag = false;
const _c = new THREE.Vector3(), _d = new THREE.Vector3();

// ---------- BUDOWA ----------
export function build() {
    const quick = restartFlag; restartFlag = false;
    const R = T.mkRng((Math.random() * 1e9) | 0);
    L.spawn = info.spawn.slice();
    L.bounds = { minX: -HS + 0.2, maxX: HS - 0.2, minZ: -HS + 0.2, maxZ: HS - 0.2, maxY: TOP + 2 };
    L.moveScale = MOVE_SCALE; L.maxUp = MAX_UP; L.noHeightTrack = true;
    S = {
        clock: 0, playT: 0, introT: quick ? RESTART_INTRO : INTRO_TIME, phase: 'intro', ooze: -1.2, nextSurge: rnd(R, SURGE_MIN, SURGE_MAX), surge: 0,
        nextScare: rnd(R, SCARE_MIN, SCARE_MAX), scareT: -1, faller: null, reach: null, blackout: 0, caughtT: -1, leaving: false,
        grates: [], crumbles: [], hatch: null, hudT: 0, R: R, lastHand: [null, null]
    };
    buildShaft();
    buildHolds(R);
    GRATES.forEach((y) => S.grates.push(buildGrate(y)));
    buildHatch();
    buildLobbyDoor();
    buildOoze();
    buildScares();
    buildHud();
    buildIntro(quick);
    if (quick) toast('Again. Climb faster...', '#b8ffcf');
}
function rnd(R, a, b) { return a + R() * (b - a); }
function setGrip(g) { L.obstacles[L.obstacles.length - 1].grip = g; return L.obstacles[L.obstacles.length - 1]; }

function buildShaft() {
    const root = L.root;
    addCrispBlock(0, -2.5, 0, 10, 5, 10, 0x8a8478, 0x0a0a08, tex.floor, { rough: tex.floorRough });
    // Śliskie ściany: mokry kamień
    const wallC = 0x6a705e;
    addCrispBlock(0, TOP / 2 + 1, -HS - 0.5, HS * 2 + 2, TOP + 6, 1, wallC, 0x0a120a); setGrip(WALL_GRIP);
    addCrispBlock(0, TOP / 2 + 1, HS + 0.5, HS * 2 + 2, TOP + 6, 1, wallC, 0x0a120a); setGrip(WALL_GRIP);
    addCrispBlock(-HS - 0.5, TOP / 2 + 1, 0, 1, TOP + 6, HS * 2, wallC, 0x0a120a); setGrip(WALL_GRIP);
    addCrispBlock(HS + 0.5, TOP / 2 + 1, 0, 1, TOP + 6, HS * 2, wallC, 0x0a120a); setGrip(WALL_GRIP);
    // Mokre zacieki na ścianach (połysk)
    const slime = new THREE.MeshStandardMaterial({ color: 0x1a2a14, roughness: 0.05, metalness: 0.2, transparent: true, opacity: 0.55, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    const R = T.mkRng(31), sl = [];
    for (let i = 0; i < 40; i++) {
        const side = (R() * 4) | 0, len = 2 + R() * 8, y = R() * TOP, t = (R() * 2 - 1) * (HS - 0.3), w = 0.15 + R() * 0.4;
        const g = new THREE.PlaneGeometry(w, len);
        if (side === 0) g.translate(t, y, -HS + 0.01);
        else if (side === 1) { g.rotateY(Math.PI); g.translate(t, y, HS - 0.01); }
        else if (side === 2) { g.rotateY(Math.PI / 2); g.translate(-HS + 0.01, y, t); }
        else { g.rotateY(-Math.PI / 2); g.translate(HS - 0.01, y, t); }
        sl.push(g);
    }
    root.add(new THREE.Mesh(mergeGeometries(sl), slime));
    // Świecące grzyby dla orientacji (bez dodatkowych świateł)
    const fung = [];
    for (let i = 0; i < 70; i++) {
        const side = (R() * 4) | 0, y = 1 + R() * (TOP - 2), t = (R() * 2 - 1) * (HS - 0.2), s = 0.04 + R() * 0.06;
        const p = side === 0 ? [t, y, -HS + 0.03] : side === 1 ? [t, y, HS - 0.03] : side === 2 ? [-HS + 0.03, y, t] : [HS - 0.03, y, t];
        fung.push(new THREE.SphereGeometry(s, 8, 6).translate(p[0], p[1], p[2]));
    }
    root.add(new THREE.Mesh(mergeGeometries(fung), new THREE.MeshBasicMaterial({ color: 0x5aff8a })));
    // Księżycowe światło z góry i lampy pod kratami
    const moon = new THREE.PointLight(0xa8c8ff, 40, 34, 1.6); moon.position.set(0, TOP + 1.5, 0); root.add(moon);
    for (const y of GRATES) { const l = new THREE.PointLight(0xffa860, 9, 9, 2); l.position.set(0, y - 0.8, 0); root.add(l); }
}

// Uchwyty: kości (dobre), rury, półki do odpoczynku i pękające kości
function buildHolds(R) {
    const boneMat = new THREE.MeshStandardMaterial({ color: 0xcfc2a8, roughness: 0.75, bumpMap: tex.plaster, bumpScale: 1 });
    const crackMat = new THREE.MeshStandardMaterial({ color: 0xa89a7c, roughness: 0.9, bumpMap: tex.plaster, bumpScale: 3 });
    const pipeMat = new THREE.MeshStandardMaterial({ map: tex.wall, color: 0x7a4a2a, metalness: 0.7, roughness: 0.45 });
    const wallPos = (side, t, y, out) => side === 0 ? [t, y, -HS + out] : side === 1 ? [t, y, HS - out] : side === 2 ? [-HS + out, y, t] : [HS - out, y, t];
    const sections = [0].concat(GRATES);
    for (let s = 0; s < sections.length; s++) {
        // Sekcja zaczyna się tuż pod poprzednią kratą, żeby po jej otwarciu było się czego chwycić
        const y0 = s === 0 ? 1.0 : sections[s] - 1.4, y1 = (s < GRATES.length ? GRATES[s] - 3.4 : TOP - 3.2);
        let y = y0 + 0.4, lastSide = -1;
        while (y < y1) {
            const n = 1 + (R() < 0.35 ? 1 : 0);
            for (let k = 0; k < n; k++) {
                let side = (R() * 4) | 0; if (side === lastSide) side = (side + 1 + ((R() * 3) | 0)) % 4;
                if (y < 3 && side === 1) side = 0;   // nie zasłaniaj drzwi do lobby na dole
                lastSide = side;
                const t = (R() * 2 - 1) * (HS - 0.6), roll = R();
                if (roll < 0.14) {   // półka
                    const p = wallPos(side, t, y, 0.35), horiz = side < 2;
                    addCrispBlock(p[0], p[1], p[2], horiz ? 1.3 : 0.7, 0.2, horiz ? 0.7 : 1.3, 0x5a5a52, 0x0a0a08); setGrip(HOLD_GRIP);
                } else if (roll < 0.28) {   // rura w poprzek szybu
                    const pz = (R() * 2 - 1) * (HS - 0.8), alongX = R() < 0.5;
                    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, HS * 2, 10), pipeMat); m.castShadow = true;
                    if (alongX) { m.rotation.z = Math.PI / 2; m.position.set(0, y, pz); } else { m.rotation.x = Math.PI / 2; m.position.set(pz, y, 0); }
                    L.root.add(m);
                    addStaticBody(alongX ? 0 : pz, y, alongX ? pz : 0, new CANNON.Box(new CANNON.Vec3(alongX ? HS : 0.09, 0.09, alongX ? 0.09 : HS)), m, false); setGrip(PIPE_GRIP);
                } else {   // kość (co czwarta pęka)
                    const crumbly = R() < 0.27, p = wallPos(side, t, y, 0.2), horiz = side < 2;
                    const w = 0.5, d = 0.36;
                    const geo = new THREE.BoxGeometry(horiz ? w : d, 0.22, horiz ? d : w); scaleBoxUVs(geo, w, 0.22, d, 1);
                    const m = new THREE.Mesh(geo, crumbly ? crackMat : boneMat); m.position.set(p[0], p[1], p[2]); m.castShadow = true; L.root.add(m);
                    addStaticBody(p[0], p[1], p[2], new CANNON.Box(new CANNON.Vec3((horiz ? w : d) / 2, 0.11, (horiz ? d : w) / 2)), m, false);
                    const ob = setGrip(HOLD_GRIP);
                    if (crumbly) S.crumbles.push({ ob: ob, mesh: m, t: 0, falling: false, vy: 0 });
                }
            }
            y += 1.25 + R() * 0.6;
        }
    }
}

// Krata nad sekcją: dwa łańcuchy pod spodem, każde pociągnięcie podnosi ją trochę
function buildGrate(y) {
    const bars = [];
    for (let i = -5; i <= 5; i++) { bars.push(new THREE.BoxGeometry(0.06, 0.12, HS * 2).translate(i * 0.42, 0, 0)); bars.push(new THREE.BoxGeometry(HS * 2, 0.12, 0.06).translate(0, 0, i * 0.42)); }
    const g = new THREE.Group(); g.position.set(0, y, 0); L.root.add(g);
    const mesh = new THREE.Mesh(mergeGeometries(bars), new THREE.MeshStandardMaterial({ color: 0x3a2a20, metalness: 0.8, roughness: 0.55 })); mesh.castShadow = true; g.add(mesh);
    addStaticBody(0, y, 0, new CANNON.Box(new CANNON.Vec3(HS, 0.08, HS)), g, false);
    const ob = setGrip(0.6), body = ob.body;
    const chains = [];
    for (const c of [[-(HS - 0.6), -(HS - 0.6)], [HS - 0.6, HS - 0.6]]) {
        const handle = makeChain(c[0], y, c[1], 1.6);
        chains.push({ handle: handle, pos: new THREE.Vector3(c[0], y - 1.6, c[1]), cool: 0, armed: [true, true], startY: [null, null] });
        // Półka pod łańcuchem
        const sz = Math.sign(c[1]);
        addCrispBlock(c[0], y - 3.0, c[1] + sz * 0.35, 1.2, 0.2, 1.0, 0x5a5a52, 0x0a0a08); setGrip(HOLD_GRIP);
    }
    return { y: y, g: g, ob: ob, body: body, chains: chains, pulls: 0, open: false, lift: 0 };
}
function makeChain(x, yTop, z, len) {
    const links = [];
    for (let k = 0; k < len / 0.12; k++) links.push(new THREE.TorusGeometry(0.035, 0.01, 5, 8).rotateY(k % 2 ? Math.PI / 2 : 0).translate(0, -k * 0.12, 0));
    const g = new THREE.Group(); g.position.set(x, yTop, z); L.root.add(g);
    g.add(new THREE.Mesh(mergeGeometries(links), new THREE.MeshStandardMaterial({ color: 0x4a4a4a, metalness: 0.9, roughness: 0.4 })));
    const handle = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.02, 8, 18), new THREE.MeshStandardMaterial({ color: 0xc8a040, metalness: 0.9, roughness: 0.3, emissive: 0x2a1a00 }));
    handle.position.set(0, -len, 0); g.add(handle);
    return g;
}
// Klapa na szczycie: zamknięta do MIN_TIME, potem trzy pociągnięcia łańcucha
function buildHatch() {
    const root = L.root, c = 0x4a4a44;
    // Strop wokół otworu 1.6 x 1.6
    addCrispBlock(0, TOP + 0.6, -(HS + 0.8) / 2 - 0.4, HS * 2, 1.2, HS - 0.8 + 0.8, c, 0x0a0a08);
    addCrispBlock(0, TOP + 0.6, (HS + 0.8) / 2 + 0.4, HS * 2, 1.2, HS - 0.8 + 0.8, c, 0x0a0a08);
    addCrispBlock(-(HS + 0.8) / 2 - 0.4, TOP + 0.6, 0, HS - 0.8 + 0.8, 1.2, 1.6, c, 0x0a0a08);
    addCrispBlock((HS + 0.8) / 2 + 0.4, TOP + 0.6, 0, HS - 0.8 + 0.8, 1.2, 1.6, c, 0x0a0a08);
    addCrispBlock(0, TOP + 4, 0, 6, 1, 6, c, 0x0a0a08);   // dach nad wyjściem
    const lid = new THREE.Group(); lid.position.set(-0.8, TOP + 0.05, 0); root.add(lid);
    const plate = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.1, 1.6), new THREE.MeshStandardMaterial({ map: tex.wall, color: 0x6a5a4a, metalness: 0.6, roughness: 0.5 }));
    plate.position.set(0.8, 0, 0); lid.add(plate);
    addStaticBody(0, TOP + 0.05, 0, new CANNON.Box(new CANNON.Vec3(0.8, 0.06, 0.8)), lid, false);
    const ob = setGrip(0.6);
    addCrispBlock(HS - 0.4, TOP - 2.6, 0, 0.8, 0.2, 1.4, 0x5a5a52, 0x0a0a08); setGrip(HOLD_GRIP);   // półka pod łańcuchem klapy
    const chain = makeChain(HS - 0.9, TOP, 0.5, 1.4);
    S.hatch = { lid: lid, ob: ob, pulls: 0, open: false, lift: 0, chain: { handle: chain, pos: new THREE.Vector3(HS - 0.9, TOP - 1.4, 0.5), cool: 0, armed: [true, true], startY: [null, null] } };
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex.dot, color: 0xa8c8ff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.5 }));
    glow.scale.set(3, 3, 1); glow.position.set(0, TOP + 1.2, 0); root.add(glow);
}
function buildLobbyDoor() {
    const g = new THREE.Group(); g.position.set(0, 0, HS - 0.02); g.rotation.y = Math.PI; L.root.add(g);
    const frame = new THREE.MeshStandardMaterial({ color: 0x1c1416, metalness: 0.7, roughness: 0.45 });
    for (const s of [-1, 1]) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2.2, 0.1), frame); p.position.set(s * 0.6, 1.1, 0.05); g.add(p); }
    const panel = new THREE.Mesh(new THREE.BoxGeometry(1.1, 2.1, 0.05), new THREE.MeshStandardMaterial({ map: tex.wood, color: 0x6a7a6a, roughness: 0.6 })); panel.position.set(0, 1.05, 0.04); g.add(panel);
    const sc = T.makeCanvas(512, 128), sx = sc.getContext('2d');
    sx.fillStyle = '#040806'; sx.fillRect(0, 0, 512, 128);
    sx.font = 'bold 76px serif'; sx.textAlign = 'center'; sx.textBaseline = 'middle'; sx.shadowColor = '#70ff90'; sx.shadowBlur = 24; sx.fillStyle = '#70ff90'; sx.fillText('LOBBY', 256, 66);
    const st = new THREE.CanvasTexture(sc); st.colorSpace = THREE.SRGBColorSpace;
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.28), new THREE.MeshBasicMaterial({ map: st, toneMapped: false })); sign.position.set(0, 2.45, 0.06); g.add(sign);
    L.portals.push({
        box3: new THREE.Box3(new THREE.Vector3(-0.6, -0.5, HS - 0.75), new THREE.Vector3(0.6, 2.2, HS + 0.2)),
        target: 'lobby', spawn: ARRIVAL_WELL, onEnter: () => toast('Back to the lobby')
    });
}

// Maź z rękami
function buildOoze() {
    const geo = new THREE.PlaneGeometry(HS * 2, HS * 2, 24, 24); geo.rotateX(-Math.PI / 2);
    const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0x030303, roughness: 0.04, metalness: 0.4, emissive: 0x140004 }));
    L.root.add(mesh);
    const armMat = new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 0.08, metalness: 0.3 }), arms = [];
    for (let i = 0; i < 4; i++) {
        const a = new THREE.Group(), parts = [];
        const pts = [new THREE.Vector3(0, -0.5, 0), new THREE.Vector3(0.05, 0.4, 0.05), new THREE.Vector3(0, 1.1, 0.2), new THREE.Vector3(0.02, 1.5, 0.35)];
        for (let k = 0; k < 3; k++) { const d = new THREE.Vector3().subVectors(pts[k + 1], pts[k]); const c = new THREE.CylinderGeometry(0.06 - k * 0.012, 0.08 - k * 0.012, d.length(), 8); c.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize())); c.translate((pts[k].x + pts[k + 1].x) / 2, (pts[k].y + pts[k + 1].y) / 2, (pts[k].z + pts[k + 1].z) / 2); parts.push(c); }
        for (let f = 0; f < 4; f++) parts.push(new THREE.CylinderGeometry(0.006, 0.014, 0.28, 5).translate(0, 0.14, 0).rotateZ((f - 1.5) * 0.25).rotateX(0.4).translate(0.02, 1.5, 0.35));
        a.add(new THREE.Mesh(mergeGeometries(parts), armMat)); L.root.add(a); arms.push({ g: a, ph: Math.random() * 6, x: (Math.random() * 2 - 1) * (HS - 0.6), z: (Math.random() * 2 - 1) * (HS - 0.6) });
    }
    const light = new THREE.PointLight(0xff1a10, 6, 6, 2); L.root.add(light);
    S.oozeMesh = { mesh: mesh, geo: geo, arms: arms, light: light, base: geo.attributes.position.array.slice() };
}

// Jumpscare'y: twarz przed oczami, spadający manekin, ręka ze ściany w ciemności
function buildScares() {
    const m = buildMannequin(T.mkRng(4242)), head = m.head;
    head.parent.remove(head);
    head.traverse((o) => { if (o.material) { o.material = o.material.clone(); o.material.depthTest = false; o.renderOrder = 1000; } });
    for (const sx of [-1, 1]) { const e = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex.dot, color: 0xff1000, transparent: true, blending: THREE.AdditiveBlending, depthTest: false })); e.scale.set(0.16, 0.16, 1); e.position.set(sx * 0.04, 0.152, 0.1); e.renderOrder = 1001; head.add(e); }
    head.scale.setScalar(2.4);
    const plane = (col) => { const p = new THREE.Mesh(new THREE.PlaneGeometry(3, 3), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0, depthTest: false })); p.position.z = -0.25; return p; };
    const black = plane(0x000000), red = plane(0xff0000); black.renderOrder = 998; red.renderOrder = 999;
    const g = new THREE.Group(); g.add(black, red, head); g.visible = false; camera.add(g);
    S.face = { g: g, head: head, red: red, black: black };
    const fm = buildMannequin(T.mkRng(999)); fm.group.visible = false; L.root.add(fm.group); S.fallerMesh = fm.group;
    const arm = new THREE.Group(), parts = [];
    parts.push(new THREE.CylinderGeometry(0.05, 0.07, 1.2, 8).rotateX(Math.PI / 2).translate(0, 0, 0.6));
    for (let f = 0; f < 5; f++) parts.push(new THREE.CylinderGeometry(0.008, 0.015, 0.22, 5).rotateX(Math.PI / 2).translate((f - 2) * 0.025, 0, 1.3));
    arm.add(new THREE.Mesh(mergeGeometries(parts), new THREE.MeshStandardMaterial({ color: 0xd8d0c2, map: tex.plaster, roughness: 0.6 })));
    arm.visible = false; L.root.add(arm); S.reachMesh = arm;
}
function faceScare() { if (S.scareT >= 0) return; S.scareT = 0; S.face.g.visible = true; SFX.scare(); }
function updateFace(dt) {
    if (S.scareT < 0) return;
    S.scareT += dt;
    const k = S.scareT, sc = S.face, j = (a) => (Math.random() - 0.5) * a;
    const z = k < 0.1 ? -1.9 + 1.58 * (k / 0.1) : -0.32;
    sc.head.position.set(j(0.03), -0.36 + j(0.02), z + j(0.015));
    sc.head.rotation.set(j(0.15), j(0.2), j(0.35));
    const ph = Math.floor(k / 0.05) % 3;
    if (k < 0.8) { sc.red.material.opacity = ph === 0 ? 0.6 : 0; sc.black.material.opacity = ph === 1 ? 0.92 : 0.5; }
    else { const f = Math.max(0, 1 - (k - 0.8) / 0.6); sc.red.material.opacity = 0.35 * f; sc.black.material.opacity = 0.6 * f; }
    if (k > 1.4) { sc.g.visible = false; S.scareT = -1; }
}
function randomScare(p) {
    const r = S.R();
    if (r < 0.34) faceScare();
    else if (r < 0.67) {   // manekin spada obok gracza z wrzaskiem
        camera.getWorldDirection(_d);
        const x = Math.max(-HS + 0.5, Math.min(HS - 0.5, p.x + _d.x * 1.4)), z = Math.max(-HS + 0.5, Math.min(HS - 0.5, p.z + _d.z * 1.4));
        S.faller = { x: x, z: z, y: p.y + 10, v: 0, screamed: false };
        S.fallerMesh.visible = true; S.fallerMesh.rotation.set(Math.PI, S.R() * 6, 0.3);
    } else {               // ciemność, szept i ręka ze ściany tuż przy twarzy
        S.blackout = 1.4; SFX.whisper();
        camera.getWorldPosition(_c);
        const dists = [_c.z + HS, HS - _c.z, _c.x + HS, HS - _c.x], side = dists.indexOf(Math.min(...dists));
        const pos = side === 0 ? [_c.x, _c.y, -HS] : side === 1 ? [_c.x, _c.y, HS] : side === 2 ? [-HS, _c.y, _c.z] : [HS, _c.y, _c.z];
        const yaw = side === 0 ? 0 : side === 1 ? Math.PI : side === 2 ? Math.PI / 2 : -Math.PI / 2;
        S.reach = { t: 0, pos: pos, yaw: yaw };
    }
}

// HUD i instrukcja
function buildHud() {
    const c = T.makeCanvas(1024, 200), tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.082), new THREE.MeshBasicMaterial({ map: tx, transparent: true, depthTest: false, toneMapped: false }));
    m.position.set(0, 0.2, -0.75); m.renderOrder = 990; camera.add(m);
    S.hud = { canvas: c, tex: tx, mesh: m };
}
function fmt(t) { t = Math.max(0, Math.ceil(t)); const m = Math.floor(t / 60), s = t % 60; return m + ':' + (s < 10 ? '0' : '') + s; }
function drawHud(p) {
    const x = S.hud.canvas.getContext('2d');
    x.clearRect(0, 0, 1024, 200);
    x.fillStyle = 'rgba(4,10,6,0.72)'; x.beginPath(); x.roundRect(4, 4, 1016, 192, 26); x.fill();
    x.textBaseline = 'middle'; x.textAlign = 'left';
    const h = Math.max(0, p.y - 0.35);
    x.font = 'bold 76px "Courier New", monospace'; x.fillStyle = '#d8ffe4'; x.fillText(Math.floor(h) + ' / ' + TOP + ' m', 30, 70);
    const gap = h - S.ooze;
    x.font = 'bold 36px "Courier New", monospace';
    x.fillStyle = gap < 3 ? '#ff4a2a' : (gap < 7 ? '#ffb030' : '#9fb3a8');
    x.fillText(S.phase === 'intro' ? 'Ooze: waiting' : 'Ooze ' + gap.toFixed(1) + ' m below', 560, 50);
    x.fillStyle = '#9fb3a8'; x.fillText('Time ' + fmt(S.playT), 560, 100);
    // Najbliższa przeszkoda nad graczem
    let msg = '', col = '#b8ffcf';
    const g = S.grates.find(gr => !gr.open && gr.y > h);
    if (S.surge > 0) { msg = 'The ooze surges!'; col = '#ff4a2a'; }
    else if (g && g.y - h < 6) { msg = 'Grate above: squeeze a chain handle and pull down (' + g.pulls + '/' + PULLS_PER_GRATE + ')'; }
    else if (!g && h > TOP - 6) {
        const left = MIN_TIME - S.playT;
        if (left > 0) { msg = 'The hatch is jammed. It loosens in ' + fmt(left); col = '#ffb030'; }
        else if (!S.hatch.open) msg = 'Pull the hatch chain (' + S.hatch.pulls + '/' + HATCH_PULLS + ')';
        else msg = 'The hatch is open! Climb out!';
    }
    x.font = 'bold 28px "Courier New", monospace'; x.fillStyle = col; x.fillText(msg, 30, 162);
    S.hud.tex.needsUpdate = true;
}
const INTRO_LINES = [
    'Climb out of the well before the black ooze swallows you.',
    'The walls are slimy. Bones, pipes and ledges grip much better. Cracked bones crumble.',
    'Grates block the way. Squeeze a chain handle and pull it down to lift the grate.',
    'The hatch at the top stays jammed for a while. Keep climbing.',
    'Do not look down. Something is down there.',
    'The LOBBY door down here takes you back, until the ooze covers it.'
];
function buildIntro(quick) {
    const c = T.makeCanvas(1280, 760), tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 0.594), new THREE.MeshBasicMaterial({ map: tx, transparent: true, depthTest: false, toneMapped: false }));
    m.position.set(0, -0.04, -1.05); m.renderOrder = 995; camera.add(m);
    S.intro = { canvas: c, tex: tx, mesh: m, last: -1, quick: quick };
}
function drawIntro(sec) {
    const x = S.intro.canvas.getContext('2d'), W = 1280, H = 760;
    x.clearRect(0, 0, W, H);
    x.fillStyle = 'rgba(4,10,6,0.9)'; x.beginPath(); x.roundRect(6, 6, W - 12, H - 12, 34); x.fill();
    x.strokeStyle = '#3a8a5a'; x.lineWidth = 4; x.stroke();
    x.textAlign = 'center'; x.textBaseline = 'middle';
    x.font = 'bold 72px serif'; x.fillStyle = '#d8ffe4'; x.fillText('The Well', W / 2, 80);
    x.textAlign = 'left'; x.font = '32px sans-serif'; x.fillStyle = '#dceee2';
    let y = 170;
    for (const line of INTRO_LINES) {
        const words = line.split(' '); let cur = '', first = true;
        for (const w of words) { const test = cur ? cur + ' ' + w : w; if (x.measureText(test).width > 1100) { x.fillText((first ? '•  ' : '    ') + cur, 70, y); y += 42; cur = w; first = false; } else cur = test; }
        x.fillText((first ? '•  ' : '    ') + cur, 70, y); y += 60;
    }
    x.textAlign = 'center'; x.font = 'bold 42px "Courier New", monospace'; x.fillStyle = '#ffb030';
    x.fillText('The ooze starts rising in ' + sec + ' s', W / 2, H - 54);
    S.intro.tex.needsUpdate = true;
}

// ---------- CO KLATKĘ ----------
function squeezing(h) { return h.userData.rig.target === 1.0; }
// Łańcuch: ściśnij uchwyt i pociągnij dłoń w dół o 35 cm
function pullCheck(ch, dt) {
    ch.cool = Math.max(0, ch.cool - dt);
    let pulled = false;
    [hands.L, hands.R].forEach((h, i) => {
        if (!h) return;
        const near = h.position.distanceTo(ch.pos) < 0.4;
        if (squeezing(h) && (near || ch.startY[i] !== null)) {
            if (ch.startY[i] === null && near && ch.armed[i]) ch.startY[i] = h.position.y;
            if (ch.startY[i] !== null) {
                const drop = ch.startY[i] - h.position.y;
                ch.handle.position.y = -Math.max(0, Math.min(0.35, drop));
                if (drop > 0.35 && ch.cool <= 0) { pulled = true; ch.cool = 0.8; ch.armed[i] = false; ch.startY[i] = null; }
            }
        } else { ch.startY[i] = null; ch.armed[i] = true; ch.handle.position.y *= 0.8; }
    });
    return pulled;
}
function caught() {
    if (S.caughtT >= 0) return;
    S.caughtT = 0; faceScare();
    toast('The ooze dragged you down...', '#ff4a2a');
}
function win() {
    if (S.leaving) return;
    S.leaving = true;
    const wins = SAVE.wellWins || 0, reward = wins === 0 ? REWARD_FIRST : REWARD_REPEAT;
    SAVE.wellWins = wins + 1;
    addBones(reward, wins === 0 ? 'first escape from the well!' : 'escaped the well');
    saveGame();
    toast('You climbed out! +' + reward + ' bones', '#7fc47f');
    S.ctx.goto('lobby', ARRIVAL_WELL);
}

export function update(dt, t, ctx) {
    if (!S || S.leaving) return;
    S.ctx = ctx; S.clock += dt;
    const body = ctx.body, p = body.position, h = p.y - 0.35;
    body.velocity.y -= EXTRA_GRAVITY * dt;   // studnia ciągnie w dół

    if (S.introT > 0) {
        S.introT -= dt;
        const sec = Math.max(0, Math.ceil(S.introT));
        if (sec !== S.intro.last) { S.intro.last = sec; drawIntro(sec); }
        S.intro.mesh.visible = S.introT > 0;
        if (S.introT <= 0) { S.phase = 'play'; SFX.roar(0.35, 0); toast('Climb!', '#b8ffcf'); }
    }

    if (S.phase === 'play') {
        S.playT += dt;
        // Maź: stały przyrost + nagłe skoki
        let rise = (OOZE_SPEED + OOZE_ACCEL * S.playT) * dt;
        S.nextSurge -= dt;
        if (S.nextSurge <= 0) { S.nextSurge = rnd(S.R, SURGE_MIN, SURGE_MAX); S.surge = 2.5; SFX.roar(0.8, 0); }
        if (S.surge > 0) { S.surge -= dt; rise += SURGE_HEIGHT / 2.5 * dt; }
        S.ooze = Math.min(TOP - 2, S.ooze + rise);
        if (h < S.ooze + 0.1) caught();
        // Jumpscare'y co jakiś czas
        S.nextScare -= dt;
        if (S.nextScare <= 0 && S.caughtT < 0) { S.nextScare = rnd(S.R, SCARE_MIN, SCARE_MAX); randomScare(p); }
    }

    // Kraty i klapa
    for (const g of S.grates) {
        if (g.open) { if (g.lift < 1) { g.lift = Math.min(1, g.lift + dt * 0.7); g.g.position.x = g.lift * (HS * 2 + 0.3); } continue; }
        for (const ch of g.chains) if (pullCheck(ch, dt)) {
            g.pulls++; SFX.creak(0.5); g.g.position.y = g.y + g.pulls * 0.03;
            if (g.pulls >= PULLS_PER_GRATE) {
                g.open = true; SFX.bang(); toast('The grate slides open!', '#b8ffcf');
                const i = L.obstacles.indexOf(g.ob); if (i >= 0) L.obstacles.splice(i, 1);
                world.removeBody(g.body);
            }
        }
    }
    const H = S.hatch;
    if (!H.open && S.playT >= MIN_TIME && pullCheck(H.chain, dt)) {
        H.pulls++; SFX.creak(0.6);
        if (H.pulls >= HATCH_PULLS) {
            H.open = true; SFX.bang(); toast('The hatch is open!', '#b8ffcf');
            const i = L.obstacles.indexOf(H.ob); if (i >= 0) L.obstacles.splice(i, 1);
            if (H.ob.body) world.removeBody(H.ob.body);
        }
    }
    if (H.open && H.lift < 1) { H.lift = Math.min(1, H.lift + dt); H.lid.rotation.z = H.lift * 1.8; }
    if (H.open && h > TOP + 0.1) { win(); return; }

    // Pękające kości: dotyk dłonią albo stanie na nich
    for (const c of S.crumbles) {
        if (c.falling) { c.vy -= 12 * dt; c.mesh.position.y += c.vy * dt; c.mesh.rotation.x += dt * 3; if (c.mesh.position.y < S.ooze - 1) c.mesh.visible = false; continue; }
        const b = c.ob.box3;
        let load = (hands.L && b.distanceToPoint(hands.L.position) < 0.3) || (hands.R && b.distanceToPoint(hands.R.position) < 0.3);
        if (!load && Math.abs(p.y - 0.35 - b.max.y) < 0.15 && p.x > b.min.x - 0.3 && p.x < b.max.x + 0.3 && p.z > b.min.z - 0.3 && p.z < b.max.z + 0.3) load = true;
        if (load) {
            c.t += dt; c.mesh.position.x += (Math.random() - 0.5) * 0.01;
            if (c.t > CRUMBLE_TIME) {
                c.falling = true; SFX.ballHit(0.5);
                const i = L.obstacles.indexOf(c.ob); if (i >= 0) L.obstacles.splice(i, 1);
                if (c.ob.body) world.removeBody(c.ob.body);
            }
        }
    }

    // Maź: falowanie powierzchni i ręce
    const O = S.oozeMesh, pa = O.geo.attributes.position, base = O.base;
    for (let i = 0; i < pa.count; i++) { const bx = base[i * 3], bz = base[i * 3 + 2]; pa.setY(i, S.ooze + Math.sin(bx * 3 + t * 2) * 0.06 + Math.cos(bz * 2.6 + t * 1.7) * 0.06); }
    pa.needsUpdate = true; O.geo.computeVertexNormals();
    O.light.position.set(0, S.ooze + 0.5, 0); O.light.intensity = 4 + Math.sin(t * 3) * 1.5;
    for (const a of O.arms) {
        const reach = Math.max(0, Math.min(1, 1 - (h - S.ooze) / 6));   // ręce wyciągają się, gdy jesteś blisko
        a.g.position.set(a.x + Math.sin(t * 0.7 + a.ph) * 0.3, S.ooze - 0.4 + reach * 0.9 + Math.sin(t * 2 + a.ph) * 0.1, a.z);
        a.g.rotation.set(Math.sin(t * 1.3 + a.ph) * 0.3, t * 0.2 + a.ph, Math.cos(t * 1.1 + a.ph) * 0.3);
    }

    // Spadający manekin
    if (S.faller) {
        const f = S.faller; f.v += 18 * dt; f.y -= f.v * dt;
        S.fallerMesh.position.set(f.x, f.y, f.z); S.fallerMesh.rotation.y += dt * 4;
        if (!f.screamed && f.y < p.y + 2.5) { f.screamed = true; SFX.stinger(); }
        if (f.y < S.ooze - 3) { S.fallerMesh.visible = false; S.faller = null; }
    }
    // Ręka ze ściany w ciemności
    if (S.blackout > 0) S.blackout -= dt;
    if (S.reach) {
        const r = S.reach; r.t += dt;
        if (r.t > 0.9 && !S.reachMesh.visible) { S.reachMesh.visible = true; SFX.scare(); }
        const k = Math.max(0, Math.min(1, (r.t - 0.9) / 0.15));
        S.reachMesh.position.set(r.pos[0], r.pos[1] - 0.1, r.pos[2]); S.reachMesh.rotation.y = r.yaw;
        S.reachMesh.scale.set(1, 1, 0.1 + k * 0.6);
        if (r.t > 1.9) { S.reachMesh.visible = false; S.reach = null; }
    }
    lighting.headLamp.intensity = S.blackout > 0 ? 0 : NP.flashlight.intensity;

    updateFace(dt);
    if (S.caughtT >= 0) {
        S.caughtT += dt;
        body.velocity.set(0, -1, 0);
        if (S.caughtT > 1.5) { S.leaving = true; restartFlag = true; ctx.goto('well'); return; }
    }
    S.hudT -= dt; if (S.hudT <= 0) { S.hudT = 0.12; drawHud(p); }
}

export function dispose() {
    if (S) for (const m of [S.face && S.face.g, S.hud && S.hud.mesh, S.intro && S.intro.mesh]) if (m) camera.remove(m);
    L.moveScale = 1; L.maxUp = 99; L.noHeightTrack = false;
    S = null;
}
