// ==========================================
// POZIOM: LABIRYNT 100 x 100 m, ściany 20 m, ciemność (preset 'night')
// Przy każdym wejściu losuje się nowy układ. Start na południu, wyjście na północy.
// Po 20 s manekin wyłamuje się z klatki i goni gracza. Złapanie = nowy labirynt od początku.
// Jumpscare'y: ślepe zaułki, błądzenie, zjawy na końcu korytarzy. Dotarcie do pokoju końcowego = 2000 Bagabucks
// (kolejne razy 200) i otwiera się dziura w podłodze prowadząca prosto do poziomu Cisza.
// ==========================================
import { THREE, L, tex, camera, lighting, addCrispBlock, addCollider, scaleBoxUVs } from '../core/engine.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { LIGHT_PRESETS } from '../core/config.js';
import * as T from '../core/textures.js';
import { buildMannequin } from '../core/mannequin.js';
import { levelReward, recordTime, unlockAchievement } from '../core/economy.js';
import { toast } from '../core/terminal.js';
import * as SFX from '../core/audio.js';
import * as NET from '../core/network.js';
import { ARRIVAL } from './lobby-door.js';
import { buildDoor, createJumpscare } from '../core/levelkit.js';

const NP = LIGHT_PRESETS.night;
const N = 25, CELL = 4, HALF = 50, WT = 0.6, H = 20;   // 25 x 25 komórek po 4 m = 100 x 100 m
const START_I = 12;
const REWARD_FIRST = 2000, REWARD_REPEAT = 200;   // pierwsze przejście / każde kolejne
const CAGE_TIME = 20;          // po ilu sekundach manekin się uwalnia
const SPEED_START = 2.2, SPEED_MAX = 3.4, SPEED_RAMP = 120;   // m/s, rośnie przez 2 minuty
const LOST_TIME = 10;          // ile sekund błądzenia poza główną drogą do jumpscare'a
const SCARE_COOLDOWN = 15;     // minimalna przerwa między jumpscare'ami
const DEADEND_CHANCE = 0.6;    // szansa na jumpscare po wejściu w ślepy zaułek
const PHANTOM_MIN = 22, PHANTOM_MAX = 45;   // co ile sekund zjawa na końcu korytarza
const START_NODE = N * N, END_NODE = N * N + 1;

export const info = { id: 'maze', name: 'The Maze', spawn: [2, 1.0, 56] };
let S = null;   // stan poziomu

// ---------- GENEROWANIE LABIRYNTU ----------
function generate(seed) {
    const R = T.mkRng(seed);
    const hW = [], vW = [];   // hW[j][i]: ściana nad komórką (i,j); vW[j][i]: ściana po lewej komórki (i,j)
    for (let j = 0; j <= N; j++) hW.push(new Array(N).fill(true));
    for (let j = 0; j < N; j++) vW.push(new Array(N + 1).fill(true));
    const open = (i, j, d) => { if (d === 0) hW[j][i] = false; else if (d === 1) hW[j + 1][i] = false; else if (d === 2) vW[j][i] = false; else vW[j][i + 1] = false; };
    const DIRS = [[0, -1], [0, 1], [-1, 0], [1, 0]];   // N, S, W, E
    const vis = new Uint8Array(N * N), stack = [[START_I, N - 1]]; vis[(N - 1) * N + START_I] = 1;
    while (stack.length) {
        const c = stack[stack.length - 1], nb = [];
        for (let d = 0; d < 4; d++) { const ni = c[0] + DIRS[d][0], nj = c[1] + DIRS[d][1]; if (ni >= 0 && nj >= 0 && ni < N && nj < N && !vis[nj * N + ni]) nb.push(d); }
        if (!nb.length) { stack.pop(); continue; }
        const d = nb[(R() * nb.length) | 0], ni = c[0] + DIRS[d][0], nj = c[1] + DIRS[d][1];
        open(c[0], c[1], d); vis[nj * N + ni] = 1; stack.push([ni, nj]);
    }
    // Kilka pętli, żeby nie było jednej oczywistej ścieżki
    for (let k = 0; k < 24; k++) {
        const i = 1 + ((R() * (N - 2)) | 0), j = 1 + ((R() * (N - 2)) | 0);
        open(i, j, (R() * 4) | 0);
    }
    hW[N][START_I] = false;   // wejście od strony pokoju startowego
    hW[0][START_I] = false;   // wyjście do pokoju końcowego
    return { hW, vW };
}
function cellCenter(i, j) { return [-HALF + i * CELL + CELL / 2, -HALF + j * CELL + CELL / 2]; }
function nodeAt(x, z) {
    if (z > HALF) return START_NODE;
    if (z < -HALF) return END_NODE;
    const i = Math.max(0, Math.min(N - 1, Math.floor((x + HALF) / CELL))), j = Math.max(0, Math.min(N - 1, Math.floor((z + HALF) / CELL)));
    return j * N + i;
}
function nodeCenter(n) { if (n === START_NODE) return [2, 55]; if (n === END_NODE) return [2, -55]; return cellCenter(n % N, (n / N) | 0); }
function neighbors(M, n) {
    const out = [];
    if (n === START_NODE) return [(N - 1) * N + START_I];
    if (n === END_NODE) return [START_I];
    const i = n % N, j = (n / N) | 0;
    if (!M.hW[j][i]) out.push(j > 0 ? n - N : END_NODE);
    if (!M.hW[j + 1][i]) out.push(j < N - 1 ? n + N : START_NODE);
    if (i > 0 && !M.vW[j][i]) out.push(n - 1);
    if (i < N - 1 && !M.vW[j][i + 1]) out.push(n + 1);
    return out;
}
function bfs(M, from) {
    const dist = new Int16Array(N * N + 2).fill(-1), prev = new Int16Array(N * N + 2).fill(-1), q = [from]; dist[from] = 0;
    for (let h = 0; h < q.length; h++) { const n = q[h]; for (const m of neighbors(M, n)) if (dist[m] < 0) { dist[m] = dist[n] + 1; prev[m] = n; q.push(m); } }
    return { dist, prev };
}

// ---------- BUDOWA ----------
export function build() {
    // Ziarno od main.js (w multiplayerze wspólne z hostem, więc cała drużyna ma ten sam układ)
    const seed = L.levelSeed !== undefined ? L.levelSeed : (Math.random() * 1e9) | 0, M = generate(seed), root = L.root;
    L.levelId = 'maze-' + seed;   // każdy gracz ma swój labirynt, więc inni gracze są ukryci
    S = { M: M, seed: seed, time: 0, phase: 'intro', phaseT: 0, chaseT: 0, lost: 0, lastScare: -99, scareT: -1, playerNode: -1, dist: null, target: null, introShown: false, lights: [],
          lastNode: -1, nextPhantom: PHANTOM_MIN + Math.random() * (PHANTOM_MAX - PHANTOM_MIN), phantom: null, blackout: 0 };
    L.spawn = info.spawn.slice();
    L.bounds = { minX: -49.5, maxX: 49.5, minZ: -59.5, maxZ: 59.5, maxY: 19.6 };

    // Ścieżka od startu do wyjścia (do podpowiedzi, świateł i wykrywania błądzenia)
    const sol = bfs(M, START_NODE), path = [];
    for (let n = END_NODE; n >= 0; n = sol.prev[n]) path.push(n);
    path.reverse();
    S.onPath = new Set(path);

    // Podłoga i sufit (sufit zamyka górę, więc nie da się przejść nad ścianami)
    addCrispBlock(0, -2.5, 0, 112, 5, 132, NP.floorTint, 0x220000, tex.floor, { rough: tex.floorRough, physical: true });
    addCrispBlock(0, 22.5, 0, 112, 5, 132, 0x3a3a3a, 0x110000);

    // Ściany labiryntu, połączone w dłuższe odcinki i scalone w jedną siatkę
    const geos = [];
    const wall = (x0, z0, x1, z1) => {
        const w = Math.abs(x1 - x0) + WT, d = Math.abs(z1 - z0) + WT, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
        const g = new THREE.BoxGeometry(w, H, d); scaleBoxUVs(g, w, H, d, 4); g.translate(cx, H / 2, cz); geos.push(g);
        addCollider(cx - w / 2, 0, cz - d / 2, cx + w / 2, H, cz + d / 2);
    };
    for (let j = 0; j <= N; j++) { let s = -1; for (let i = 0; i <= N; i++) { const on = i < N && M.hW[j][i]; if (on && s < 0) s = i; if (!on && s >= 0) { wall(-HALF + s * CELL, -HALF + j * CELL, -HALF + i * CELL, -HALF + j * CELL); s = -1; } } }
    for (let i = 0; i <= N; i++) { let s = -1; for (let j = 0; j <= N; j++) { const on = j < N && M.vW[j][i]; if (on && s < 0) s = j; if (!on && s >= 0) { wall(-HALF + i * CELL, -HALF + s * CELL, -HALF + i * CELL, -HALF + j * CELL); s = -1; } } }
    // Pokój startowy (południe) i końcowy (północ): 12 x 10 m
    wall(-4, 50, -4, 60); wall(8, 50, 8, 60); wall(-4, 60, 8, 60);
    wall(-4, -60, -4, -50); wall(8, -60, 8, -50); wall(-4, -60, 8, -60);
    const wallMat = new THREE.MeshStandardMaterial({ map: tex.wall, bumpMap: tex.wall, bumpScale: 1.4, color: 0xa8a2a0, roughness: 0.85, metalness: 0.1 });
    const walls = new THREE.Mesh(mergeGeometries(geos), wallMat); walls.castShadow = true; walls.receiveShadow = true; root.add(walls);

    buildHintsAndLights(M, path);
    buildRooms();
    buildCage();
    S.scare = createJumpscare({});
    buildPhantom();
    buildDecor();
}

// Podpowiedzi (strzałki na ważnych skrzyżowaniach, znaki X przed ślepymi odnogami) i światła
function buildHintsAndLights(M, path) {
    const arrowTex = hintTexture('arrow'), xTex = hintTexture('x');
    const decal = (texMap, x, z, ang, size) => {
        const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size), new THREE.MeshStandardMaterial({ map: texMap, emissiveMap: texMap, emissive: 0xff2a10, emissiveIntensity: 0.55, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 }));
        m.rotation.set(-Math.PI / 2, 0, ang); m.position.set(x, 0.02, z); L.root.add(m);
    };
    const junctions = [];
    for (let k = 1; k < path.length - 1; k++) { const n = path[k]; if (n < N * N && neighbors(M, n).length >= 3) junctions.push(k); }
    // Strzałka co drugie skrzyżowanie, znak X co trzecie
    junctions.forEach((k, idx) => {
        const n = path[k], next = path[k + 1], c = nodeCenter(n), nc = nodeCenter(next);
        const dx = Math.sign(nc[0] - c[0]), dz = Math.sign(nc[1] - c[1]);
        if (idx % 2 === 0) decal(arrowTex, c[0], c[1], Math.atan2(-dx, -dz), 1.8);
        if (idx % 3 === 1) for (const m of neighbors(M, n)) {
            if (m === path[k - 1] || m === next || m >= N * N) continue;
            const w = nodeCenter(m), ex = Math.sign(w[0] - c[0]), ez = Math.sign(w[1] - c[1]);
            decal(xTex, c[0] + ex * 1.5, c[1] + ez * 1.5, 0, 1.2);
        }
    });
    // Mocniejsze światło na co ~5. skrzyżowaniu głównej drogi (maks. 7 lamp)
    const step = Math.max(1, Math.floor(junctions.length / 7));
    for (let q = 0; q < junctions.length && S.lights.length < 7; q += step) { const c = nodeCenter(path[junctions[q]]); addLamp(c[0], c[1], 0xffb070, 28); }
}
function hintTexture(kind) {
    const c = T.makeCanvas(256, 256), x = c.getContext('2d'), R = T.mkRng(kind === 'x' ? 11 : 22);
    x.strokeStyle = 'rgba(150,8,4,0.95)'; x.fillStyle = 'rgba(150,8,4,0.95)'; x.lineCap = 'round'; x.lineJoin = 'round'; x.lineWidth = 26;
    if (kind === 'arrow') { x.beginPath(); x.moveTo(128, 230); x.lineTo(128, 50); x.stroke(); x.beginPath(); x.moveTo(60, 110); x.lineTo(128, 30); x.lineTo(196, 110); x.stroke(); }
    else { x.beginPath(); x.moveTo(50, 50); x.lineTo(206, 206); x.moveTo(206, 50); x.lineTo(50, 206); x.stroke(); }
    for (let i = 0; i < 26; i++) { x.beginPath(); x.arc(40 + R() * 176, 40 + R() * 176, 2 + R() * 7, 0, 7); x.fill(); }
    return T.toTex(c, false);
}
function addLamp(x, z, color, intensity) {
    const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 15, 5), new THREE.MeshStandardMaterial({ color: 0x111111 })); cord.position.set(x, 12.5, z); L.root.add(cord);
    const shade = new THREE.Mesh(new THREE.ConeGeometry(0.35, 0.3, 16, 1, true), new THREE.MeshStandardMaterial({ color: 0x1a1a1a, metalness: 0.7, roughness: 0.4, side: THREE.DoubleSide })); shade.position.set(x, 5.1, z); L.root.add(shade);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 8), new THREE.MeshBasicMaterial({ color: color })); bulb.position.set(x, 4.95, z); L.root.add(bulb);
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex.dot, color: color, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.8 }));
    glow.scale.set(1.8, 1.8, 1); glow.position.set(x, 4.95, z); L.root.add(glow);
    const pool = new THREE.Mesh(new THREE.PlaneGeometry(6, 6), new THREE.MeshBasicMaterial({ map: tex.dot, color: color, transparent: true, opacity: 0.18, blending: THREE.AdditiveBlending, depthWrite: false }));
    pool.rotation.x = -Math.PI / 2; pool.position.set(x, 0.03, z); L.root.add(pool);
    const l = new THREE.PointLight(color, intensity, 14, 2); l.position.set(x, 4.7, z); L.root.add(l);
    S.lights.push({ l: l, base: intensity, ph: Math.random() * 100, glow: glow });
}

// Pokój startowy z wyjściem do lobby i pokój końcowy z drzwiami do lobby (nagroda)
function buildRooms() {
    addLamp(2, 57, 0xff8a50, 22);
    addLamp(2, -55, 0x60ff90, 30);
    buildDoor({ x: 2, z: 59.68, rotY: Math.PI, label: 'LOBBY', color: '#ffb070', wood: 0x8a6a5a, portal: { target: 'lobby', spawn: ARRIVAL, onEnter: () => toast('Back to the lobby') } });
    buildDoor({ x: 2, z: -59.68, rotY: 0, label: 'EXIT', color: '#70ff90', wood: 0x8a6a5a, portal: { target: 'lobby', spawn: ARRIVAL, onEnter: () => toast('Back to the lobby') } });
    buildHole();
}
// Zapadnia w pokoju końcowym: otwiera się po dotarciu do końca, prowadzi na poziom Cisza
const HOLE = [-1.6, -55.8];
function buildHole() {
    const g = new THREE.Group(); g.position.set(HOLE[0], 0.03, HOLE[1]); L.root.add(g);
    const pit = new THREE.Mesh(new THREE.CircleGeometry(0.95, 32), new THREE.MeshBasicMaterial({ color: 0x000000 })); pit.rotation.x = -Math.PI / 2; pit.visible = false; g.add(pit);
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex.dot, color: 0x3a7aff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0 }));
    glow.scale.set(3, 1.2, 1); glow.position.y = 0.3; g.add(glow);
    const hinge = new THREE.Group(); hinge.position.set(-1.0, 0, 0); g.add(hinge);
    const lid = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.06, 2.0), new THREE.MeshStandardMaterial({ map: tex.wood, color: 0x6a5040, roughness: 0.7 }));
    lid.position.set(1.0, 0.03, 0); lid.castShadow = true; lid.receiveShadow = true; hinge.add(lid);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.015, 6, 16), new THREE.MeshStandardMaterial({ color: 0x5a5a5a, metalness: 0.9 })); ring.rotation.x = -Math.PI / 2; ring.position.set(1.6, 0.07, 0); hinge.add(ring);
    S.hole = { pit: pit, glow: glow, hinge: hinge, open: 0, opening: false };
}
// Dotarcie do pokoju końcowego: nagroda i otwarcie zapadni
function finishMaze() {
    S.phase = 'done';
    S.mq.group.visible = false; S.mq.aura.intensity = 0;
    toast('You escaped!', '#7fc47f');
    levelReward('maze', REWARD_FIRST, REWARD_REPEAT, 'maze escape');
    recordTime('maze', S.runT || 0);
    if (!S.scares) unlockAchievement('maze_runner');
    setTimeout(() => toast('A hatch opened in the floor... or take the EXIT door', '#9fc8ff'), 2600);
    SFX.creak(0.7, { x: HOLE[0], y: 0.2, z: HOLE[1] });
    S.hole.opening = true; S.hole.pit.visible = true;
    L.portals.push({
        box3: new THREE.Box3(new THREE.Vector3(HOLE[0] - 0.8, -0.5, HOLE[1] - 0.8), new THREE.Vector3(HOLE[0] + 0.8, 1.4, HOLE[1] + 0.8)),
        target: 'silence', spawn: null, onEnter: () => toast('You fall into the dark...', '#9fc8ff')
    });
}
// Klatka z manekinem w pokoju startowym (po lewej, przed wejściem do labiryntu)
function buildCage() {
    const cx = -1.6, cz = 52.6, s = 0.7, h = 2.4;
    const cage = new THREE.Group(); cage.position.set(cx, 0, cz); L.root.add(cage);
    const metal = new THREE.MeshStandardMaterial({ color: 0x2a2624, metalness: 0.85, roughness: 0.35 });
    const bars = [];
    for (let k = -3; k <= 3; k++) {
        const t = k / 3 * s;
        bars.push(new THREE.CylinderGeometry(0.025, 0.025, h, 6).translate(t, h / 2, -s));
        bars.push(new THREE.CylinderGeometry(0.025, 0.025, h, 6).translate(-s, h / 2, t));
        bars.push(new THREE.CylinderGeometry(0.025, 0.025, h, 6).translate(t, h / 2, s));
    }
    bars.push(new THREE.BoxGeometry(2 * s + 0.1, 0.08, 2 * s + 0.1).translate(0, h, 0));
    bars.push(new THREE.BoxGeometry(2 * s + 0.1, 0.08, 2 * s + 0.1).translate(0, 0.04, 0));
    const cm = new THREE.Mesh(mergeGeometries(bars), metal); cm.castShadow = true; cage.add(cm);
    // Drzwi klatki od strony środka pokoju (+X), na zawiasie przy krawędzi -Z
    const pivot = new THREE.Group(); pivot.position.set(s, 0, -s); cage.add(pivot);
    const dbars = [];
    for (let k = 0; k <= 6; k++) dbars.push(new THREE.CylinderGeometry(0.025, 0.025, h, 6).translate(0, h / 2, k / 6 * 2 * s));
    for (const y of [0.3, 1.2, 2.1]) dbars.push(new THREE.BoxGeometry(0.04, 0.04, 2 * s).translate(0, y, s));
    const dm = new THREE.Mesh(mergeGeometries(dbars), metal); dm.castShadow = true; pivot.add(dm);
    addCollider(cx - s - 0.05, 0, cz - s - 0.05, cx + s + 0.05, h, cz + s + 0.05);
    // Łańcuchy i kłódka
    const lock = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, 0.06), new THREE.MeshStandardMaterial({ color: 0x8a6a2a, metalness: 0.9, roughness: 0.3 })); lock.position.set(s + 0.04, 1.2, s * 0.7); cage.add(lock);
    const lamp = new THREE.PointLight(0xff3020, 6, 5, 2); lamp.position.set(cx + 0.6, 2.9, cz); L.root.add(lamp);
    // Manekin w środku (ten sam wygląd co w lobby)
    const m = buildMannequin(T.mkRng(777)); L.root.add(m.group);
    const eyes = new THREE.Group(); eyes.visible = false; m.head.add(eyes);
    for (const sx of [-1, 1]) { const e = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex.dot, color: 0xff2000, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); e.scale.set(0.09, 0.09, 1); e.position.set(sx * 0.04, 0.152, 0.11); eyes.add(e); }
    const aura = new THREE.PointLight(0xff1a00, 0, 7, 2); aura.position.set(0, 1.9, 0.3); m.group.add(aura);
    S.cage = { group: cage, pivot: pivot, lock: lock, lamp: lamp, home: [cx, cz] };
    S.mq = { group: m.group, head: m.head, eyes: eyes, aura: aura, x: cx, z: cz, yaw: Math.PI / 2 };
    resetMannequin();
}
function resetMannequin() {
    const q = S.mq, c = S.cage;
    q.x = c.home[0]; q.z = c.home[1]; q.yaw = Math.PI / 2; q.eyes.visible = false; q.aura.intensity = 0; q.target = null;
    q.group.position.set(q.x, 0, q.z); q.group.rotation.y = q.yaw;
    c.pivot.rotation.y = 0; c.pivot.position.set(0.7, 0, -0.7); c.lock.visible = true; c.group.position.set(c.home[0], 0, c.home[1]);
}

// Jumpscare (wspólny klocek z core/levelkit.js); liczymy je do osiągnięcia "Maze runner"
function jumpscare() {
    if (S.scare.trigger()) { S.lastScare = S.time; S.scares = (S.scares || 0) + 1; }
}

// Zjawa: manekin stoi na końcu korytarza, w który patrzysz. Gdy na nią spojrzysz, znika ze zgrzytem i gaśnie latarka.
function buildPhantom() {
    const m = buildMannequin(T.mkRng(31337));
    for (const sx of [-1, 1]) { const e = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex.dot, color: 0xff2000, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); e.scale.set(0.1, 0.1, 1); e.position.set(sx * 0.04, 0.152, 0.11); m.head.add(e); }
    m.group.visible = false; L.root.add(m.group);
    S.ph = { group: m.group, active: false, t: 0, seen: 0 };
}
function openDir(i, j, d) {
    const M = S.M;
    if (d === 0) return j > 0 && !M.hW[j][i];
    if (d === 1) return j < N - 1 && !M.hW[j + 1][i];
    if (d === 2) return i > 0 && !M.vW[j][i];
    return i < N - 1 && !M.vW[j][i + 1];
}
const _v = new THREE.Vector3(), _c = new THREE.Vector3();
function trySpawnPhantom(p) {
    const n = nodeAt(p.x, p.z); if (n >= N * N) return false;
    camera.getWorldDirection(_v);
    const D = [[0, -1], [0, 1], [-1, 0], [1, 0]];
    let d = 0, best = -9;
    for (let k = 0; k < 4; k++) { const dot = D[k][0] * _v.x + D[k][1] * _v.z; if (dot > best) { best = dot; d = k; } }
    let i = n % N, j = (n / N) | 0, last = null;
    for (let s = 1; s <= 5; s++) { if (!openDir(i, j, d)) break; i += D[d][0]; j += D[d][1]; if (s >= 2) last = [i, j]; }
    if (!last) return false;
    const c = cellCenter(last[0], last[1]), ph = S.ph;
    ph.group.position.set(c[0], 0, c[1]); ph.group.rotation.y = Math.atan2(p.x - c[0], p.z - c[1]);
    ph.group.visible = true; ph.active = true; ph.t = 0; ph.seen = 0;
    SFX.whisper({ x: c[0], y: 1.6, z: c[1] });   // szept dobiega z miejsca, gdzie stoi zjawa
    return true;
}
function updatePhantom(dt, p) {
    const ph = S.ph; if (!ph.active) return;
    ph.t += dt;
    camera.getWorldPosition(_c); camera.getWorldDirection(_v);
    const dx = ph.group.position.x - _c.x, dy = 1.5 - _c.y, dz = ph.group.position.z - _c.z, d = Math.hypot(dx, dy, dz);
    if ((dx * _v.x + dy * _v.y + dz * _v.z) / d > 0.92) ph.seen += dt;
    const near = Math.hypot(p.x - ph.group.position.x, p.z - ph.group.position.z) < 2.2;
    if (near) { ph.active = false; ph.group.visible = false; jumpscare(); }
    else if (ph.seen > 0.35) { ph.active = false; ph.group.visible = false; SFX.stinger({ x: ph.group.position.x, y: 1.6, z: ph.group.position.z }); S.blackout = 0.45; S.lastScare = S.time; }
    else if (ph.t > 5) { ph.active = false; ph.group.visible = false; }
}

function buildDecor() {
    const R = T.mkRng(909), poolMat = new THREE.MeshStandardMaterial({ map: T.createBloodPoolTexture(), transparent: true, roughness: 0.1, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 });
    for (let k = 0; k < 40; k++) {
        const c = cellCenter((R() * N) | 0, (R() * N) | 0), s = 1 + R() * 1.8, m = new THREE.Mesh(new THREE.PlaneGeometry(s, s), poolMat);
        m.rotation.set(-Math.PI / 2, 0, R() * 6.28); m.position.set(c[0] + (R() - 0.5) * 2, 0.015, c[1] + (R() - 0.5) * 2); L.root.add(m);
    }
    const n = 500, pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { pos[i * 3] = (R() * 2 - 1) * 50; pos[i * 3 + 1] = R() * 8; pos[i * 3 + 2] = (R() * 2 - 1) * 58; }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const dust = new THREE.Points(geo, new THREE.PointsMaterial({ size: 0.05, map: tex.dot, color: NP.dustColor, transparent: true, opacity: NP.dustOpacity, depthWrite: false }));
    dust.frustumCulled = false; L.root.add(dust);
}

// ---------- CO KLATKĘ ----------
function freeze(body) { if (!S.frozen) S.frozen = body.position.clone(); body.position.copy(S.frozen); body.velocity.set(0, 0, 0); }

export function update(dt, t, ctx) {
    if (!S) return;
    const body = ctx.body, p = body.position, q = S.mq, c = S.cage;
    S.time += dt; S.phaseT += dt; S.runT = (S.runT || 0) + dt;
    const cagePos = { x: c.home[0], y: 1.5, z: c.home[1] };

    if (S.blackout > 0) S.blackout -= dt;
    const dark = S.blackout > 0;
    // Migotanie lamp (i ich zgaśnięcie, gdy znika zjawa)
    for (const lt of S.lights) {
        let v = lt.base * (0.85 + 0.15 * Math.sin(t * 9 + lt.ph) * Math.sin(t * 13.3 + lt.ph * 1.7));
        if (Math.sin(t * 0.4 + lt.ph * 2.1) > 0.99) v *= 0.15;
        if (S.phase === 'cutscene' && S.phaseT < 2.2) v *= Math.random() < 0.5 ? 0.05 : 1.2;
        if (dark) v = 0;
        lt.l.intensity = v; lt.glow.material.opacity = 0.35 + 0.45 * v / lt.base;
    }
    // Latarka: gaśnie przy zjawie i przerywa, gdy manekin jest blisko
    const qd = Math.hypot(p.x - q.x, p.z - q.z);
    let lamp = 1;
    if (dark) lamp = 0;
    else if (S.phase === 'chase' && qd < 10 && Math.random() < 0.12) lamp = 0.15;
    lighting.headLamp.intensity = NP.flashlight.intensity * lamp;

    S.scare.update(dt);
    if (S.phase === 'intro' || S.phase === 'chase') updatePhantom(dt, p);
    // Pokój końcowy
    if (p.z < -50.6 && (S.phase === 'intro' || S.phase === 'chase')) finishMaze();
    if (S.hole && S.hole.opening && S.hole.open < 1) {
        S.hole.open = Math.min(1, S.hole.open + dt * 0.8);
        S.hole.hinge.rotation.z = S.hole.open * 1.9;
        S.hole.glow.material.opacity = 0.6 * S.hole.open;
    }

    if (S.phase === 'intro') {
        if (!S.introShown && S.time > 1) { S.introShown = true; toast('Find the exit. Something is waiting...', '#ff6a40'); }
        q.head.rotation.y = Math.sin(t * 0.7) * 0.4;   // manekin rozgląda się w klatce
        if (S.time >= CAGE_TIME) { S.phase = 'cutscene'; S.phaseT = 0; S.frozen = null; SFX.creak(0.9, cagePos); toast('Something is breaking free...', '#ff6a40'); }
    } else if (S.phase === 'cutscene') {
        // Krótka scenka: klatka się trzęsie, drzwi wylatują, manekin wychodzi. Gracz stoi w miejscu.
        freeze(body);
        const k = S.phaseT;
        if (k < 1.6) c.group.position.set(c.home[0] + (Math.random() - 0.5) * 0.05 * k, 0, c.home[1] + (Math.random() - 0.5) * 0.05 * k);
        else c.group.position.set(c.home[0], 0, c.home[1]);
        if (k >= 1.6 && c.lock.visible) { c.lock.visible = false; SFX.bang(cagePos); q.eyes.visible = true; }
        if (k >= 1.6) c.pivot.rotation.y = Math.min(2.2, (k - 1.6) * 9);
        q.aura.intensity = k >= 1.6 ? 4 : 0;
        // Głowa gwałtownie obraca się do gracza
        const toP = Math.atan2(p.x - q.x, p.z - q.z);
        if (k >= 1.8) q.head.rotation.y += (Math.atan2(Math.sin(toP - q.yaw), Math.cos(toP - q.yaw)) - q.head.rotation.y) * Math.min(1, dt * 12);
        if (k >= 2.4) { const a = Math.min(1, (k - 2.4) / 1.6); q.x = c.home[0] + a * 1.6; q.z = c.home[1]; q.group.position.set(q.x, Math.abs(Math.sin(k * 7)) * 0.05, q.z); }
        if (k >= 2.3 && k - dt < 2.3) SFX.scream({ x: q.x, y: 1.6, z: q.z });
        if (k >= 4.3) { S.phase = 'chase'; S.phaseT = 0; S.frozen = null; toast('RUN!', '#e0533f'); }
    } else if (S.phase === 'chase') {
        S.chaseT += dt;
        chase(dt, t, p);
        const dx = p.x - q.x, dz = p.z - q.z, dist = Math.hypot(dx, dz);
        SFX.heartbeat(Math.max(0, 1 - dist / 22));
        if (dist < 0.85 && p.y < 3.2) { S.phase = 'caught'; S.phaseT = 0; jumpscare(); }
    } else if (S.phase === 'caught') {
        freeze(body);
        if (S.phaseT > 1.5) { S.phase = 'leaving'; S.frozen = null; toast('The mannequin caught you. A new maze awaits...', '#e0533f'); 
            // Solo: nowy labirynt. W drużynie: ten sam układ, żeby nie rozdzielać graczy.
            if (NET.NET.mode === 'solo') ctx.goto('maze'); else ctx.goto('maze', null, { seed: S.seed, noFollow: true }); }
        return;
    } else return;

    if (S.phase === 'cutscene') return;
    // Jumpscare'y za złą drogę
    const pn = nodeAt(p.x, p.z), canScare = S.time - S.lastScare > SCARE_COOLDOWN && !S.scare.active() && !S.ph.active;
    if (pn !== S.lastNode) {
        S.lastNode = pn;
        // Wejście w ślepy zaułek poza główną drogą
        if (pn < N * N && !S.onPath.has(pn) && neighbors(S.M, pn).length === 1 && canScare && Math.random() < DEADEND_CHANCE) jumpscare();
    }
    // Dłuższe błądzenie poza główną drogą
    if (!S.onPath.has(pn)) S.lost += dt; else S.lost = Math.max(0, S.lost - dt * 2);
    if (S.lost > LOST_TIME && canScare) { jumpscare(); S.lost = 0; }
    // Zjawa na końcu korytarza co jakiś czas
    S.nextPhantom -= dt;
    if (S.nextPhantom <= 0 && canScare) {
        S.nextPhantom = trySpawnPhantom(p) ? PHANTOM_MIN + Math.random() * (PHANTOM_MAX - PHANTOM_MIN) : 3;
    }
}

// Manekin idzie środkami komórek najkrótszą drogą do gracza (nie przechodzi przez ściany)
function chase(dt, t, p) {
    const q = S.mq, pn = nodeAt(p.x, p.z);
    if (pn !== S.playerNode) { S.playerNode = pn; S.dist = bfs(S.M, pn).dist; q.target = null; }
    const qn = nodeAt(q.x, q.z);
    let tx, tz;
    if (qn === pn) { tx = p.x; tz = p.z; }
    else {
        if (!q.target || Math.hypot(q.target[0] - q.x, q.target[1] - q.z) < 0.12) {
            let best = -1;
            for (const m of neighbors(S.M, qn)) if (S.dist[m] >= 0 && (best < 0 || S.dist[m] < S.dist[best])) best = m;
            if (best < 0) return;
            if ((qn === START_NODE && best < N * N) || (best === START_NODE)) q.target = [2, best === START_NODE ? 50.5 : 49.6];
            else if ((qn === END_NODE && best < N * N) || (best === END_NODE)) q.target = [2, best === END_NODE ? -50.5 : -49.6];
            else q.target = nodeCenter(best);
        }
        tx = q.target[0]; tz = q.target[1];
    }
    const speed = SPEED_START + (SPEED_MAX - SPEED_START) * Math.min(1, S.chaseT / SPEED_RAMP);
    const dx = tx - q.x, dz = tz - q.z, d = Math.hypot(dx, dz);
    if (d > 0.001) { const s = Math.min(d, speed * dt); q.x += dx / d * s; q.z += dz / d * s; }
    const yaw = Math.atan2(dx, dz); let dy = yaw - q.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); q.yaw += dy * Math.min(1, dt * 6);
    q.group.position.set(q.x, Math.abs(Math.sin(t * 6)) * 0.05, q.z);
    q.group.rotation.set(Math.sin(t * 3) * 0.05, q.yaw, Math.sin(t * 6) * 0.04);
    const toP = Math.atan2(p.x - q.x, p.z - q.z), hd = Math.atan2(Math.sin(toP - q.yaw), Math.cos(toP - q.yaw));
    q.head.rotation.y += (Math.max(-2.4, Math.min(2.4, hd)) - q.head.rotation.y) * Math.min(1, dt * 5);
    q.aura.intensity = 3 + Math.sin(t * 5);
}

// Wywoływane przy wyjściu z poziomu: sprzątanie rzeczy przyczepionych do kamery
export function dispose() {
    if (S && S.scare) S.scare.dispose();
    S = null;
}
