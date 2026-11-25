// ==========================================
// POZIOM: THE MINE (kopalnia)
// Jaskinia 18 x 18 m i 25 m wysokości. Cztery galerie (piętra 5, 10, 15 i 20 m) idą kolejno wzdłuż ścian, a między nimi są drabiny ze szczebli.
// Z pierwszych trzech galerii wchodzi się do bocznych komór: w każdej leży zasilacz (3 sztuki). Wyjście jest na najwyższym piętrze i otwiera się po trzech zasilaczach.
// Lampa na hełmie ma baterię (G albo prawy spust gasi i zapala): potwór, Kopacz, widzi światło, słyszy bieg, upadek, głos z mikrofonu i podniesiony zasilacz.
// Po ciemku widzi cię dopiero z kilku metrów. Paczki baterii leżą na podłodze i galeriach. Kopacz chodzi po grafie z core/minelogic.js (galerie, komory, drabiny).
// ==========================================
import { THREE, L, tex, camera, addCrispBlock, addInstancedBlocks, renderer, lighting } from '../core/engine.js';
import * as T from '../core/textures.js';
import { buildMannequin, addMonsterFace } from '../core/mannequin.js';
import { swapModel } from '../core/glbmonster.js';
import { levelReward, recordTime, diffOf } from '../core/economy.js';
import { toast } from '../core/terminal.js';
import { setPlayerPosition, releaseAll } from '../core/player.js';
import * as SFX from '../core/audio.js';
import { buzz } from '../core/haptics.js';
import { createGhost } from '../core/runkit.js';
import { createEvents } from '../core/events.js';
import { LIGHT_PRESETS } from '../core/config.js';
import { ARRIVAL_FROM_MINE } from './levels.js';
import { buildDoor, cameraPanel, panelBg, drawInstructions, createJumpscare, introSeen, takeRespawn, addStoryProps } from '../core/levelkit.js';
import { setDread, heardVoice } from '../core/ambience.js';
import * as ML from '../core/minelogic.js';

const { HW, WALL, HEIGHT: CH, TIERS, LEDGE, GALLERY, OPEN_W, OPEN_H, CHAMBER } = ML.GEOM;
const OUT = HW + WALL;
const CELLS = 3, REWARD_FIRST = 3200, REWARD_REPEAT = 320, INTRO_TIME = 10, CATCH_DIST = 1.15, LOSE_TIME = 6, PICK_R = 1.0;
const ROCK = 0x8c765a, ROCK_DARK = 0x6c5a46, WOOD = 0x8a6038, FLOOR = 0x5c4c3c, IRON = 0x2b2b30;
export const info = { id: 'mine', name: 'The Mine', spawn: [0, 1.0, 6.5] };
let S = null;
const _v = new THREE.Vector3(), _up = new THREE.Vector3(0, 1, 0), _q = new THREE.Quaternion();

// Zasilacze: końce komór; baterie: podłoga i galerie
const CELL_POS = [ML.NODES[ML.IDX.CHA], ML.NODES[ML.IDX.CHB], ML.NODES[ML.IDX.CHC]].map((q, i) => [i === 0 ? -15.6 : (i === 1 ? 0 : 15.6), q.y + 1.0, i === 1 ? -15.6 : 0]);
const PACK_POS = [[4.6, 0.5, 3.2], [-7.4, TIERS[0] + 0.5, -4.5], [3.5, TIERS[1] + 0.5, -7.3], [7.3, TIERS[2] + 0.5, 4.5]];
const LANTERNS = [[3, 2.6, 6], [-6, 2.6, -2], [-7, TIERS[0] + 2.6, -2], [3, TIERS[1] + 2.6, -7.5], [7.5, TIERS[2] + 2.6, 2], [-3, TIERS[3] + 2.6, 7.5]];
const CRYSTAL_LIGHTS = [[0, 1.6, -8.3, 0x3a70ff], [-8.3, 12, 0, 0x5a50ff]];

// ---------- BUDOWA ----------
function box(x0, x1, y0, y1, z0, z1, color, texture, edge) {
    return addCrispBlock((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2, Math.abs(x1 - x0), Math.abs(y1 - y0), Math.abs(z1 - z0), color, edge === undefined ? 0x0c0a08 : edge, texture || tex.wall);
}
// Ściana jaskini (płaszczyzna x = ±HW albo z = ±HW) z jednym prostokątnym otworem na komorę (hole = { y0, y1, c0, c1 }) albo bez niego
function wall(axis, s, hole) {
    const span = axis === 'x' ? OUT : HW;   // ściany wschodnia i zachodnia sięgają rogów
    const put = (t0, t1, y0, y1) => { if (t1 - t0 < 0.01 || y1 - y0 < 0.01) return; if (axis === 'x') box(s * HW, s * OUT, y0, y1, t0, t1, ROCK); else box(t0, t1, y0, y1, s * HW, s * OUT, ROCK); };
    if (!hole) { put(-span, span, 0, CH + 1); return; }
    put(-span, hole.c0, 0, CH + 1); put(hole.c1, span, 0, CH + 1); put(hole.c0, hole.c1, 0, hole.y0); put(hole.c0, hole.c1, hole.y1, CH + 1);
}
// Boczna komora za otworem w ścianie: podłoga, strop, boki i tył (u = głębokość od środka jaskini, v = wzdłuż ściany)
function chamber(axis, s, y0) {
    const hw = OPEN_W / 2 + 0.25;
    const put = (u0, u1, v0, v1, ya, yb) => { if (axis === 'x') box(s * u0, s * u1, ya, yb, v0, v1, ROCK_DARK); else box(v0, v1, ya, yb, s * u0, s * u1, ROCK_DARK); };
    put(HW, CHAMBER, -hw, hw, y0 - 0.5, y0);
    put(HW, CHAMBER, -hw, hw, y0 + OPEN_H, y0 + OPEN_H + 0.5);
    put(OUT, CHAMBER, -hw, -OPEN_W / 2, y0 - 0.5, y0 + OPEN_H + 0.5);
    put(OUT, CHAMBER, OPEN_W / 2, hw, y0 - 0.5, y0 + OPEN_H + 0.5);
    put(CHAMBER, CHAMBER + 0.5, -hw, hw, y0 - 0.5, y0 + OPEN_H + 0.5);
}
function buildCave() {
    box(-OUT, OUT, -1, 0, -OUT, OUT, FLOOR, tex.floor);
    box(-OUT, OUT, CH, CH + 1, -OUT, OUT, ROCK_DARK);
    wall('x', -1, { y0: TIERS[0], y1: TIERS[0] + OPEN_H, c0: -OPEN_W / 2, c1: OPEN_W / 2 });   // zachód: komora piętra 1
    wall('z', -1, { y0: TIERS[1], y1: TIERS[1] + OPEN_H, c0: -OPEN_W / 2, c1: OPEN_W / 2 });   // północ: komora piętra 2
    wall('x', 1, { y0: TIERS[2], y1: TIERS[2] + OPEN_H, c0: -OPEN_W / 2, c1: OPEN_W / 2 });    // wschód: komora piętra 3
    wall('z', 1, null);                                                                         // południe: drzwi (start i wyjście)
    chamber('x', -1, TIERS[0]); chamber('z', -1, TIERS[1]); chamber('x', 1, TIERS[2]);
    // Galerie (deski): A zachód, B północ, C wschód, D południe; naroża nad drabinami zostają otwarte
    const g = [[-HW, -HW + GALLERY, -HW, 5.5, 0], [-5.5, HW, -HW, -HW + GALLERY, 1], [HW - GALLERY, HW, -5.5, HW, 2], [-HW, 5.5, HW - GALLERY, HW, 3]];
    for (const [x0, x1, z0, z1, k] of g) box(x0, x1, TIERS[k] - LEDGE, TIERS[k], z0, z1, WOOD, tex.wood, 0x120a04);
    // Zapora przy wyjściu (znika po trzech zasilaczach)
    S.gate = box(-1.7, 1.7, TIERS[3], TIERS[3] + 3, HW - 0.9, HW - 0.6, IRON, tex.wall, 0xff3030); S.gateOb = L.obstacles[L.obstacles.length - 1];
}
// Drabiny: szczeble wystają ze ściany (można je chwytać), po bokach dwie szyny
function buildLadders() {
    const rungs = [], ys = (a, b) => { const o = []; for (let y = a; y <= b + 0.01; y += 0.8) o.push(y); return o; };
    const spec = [['W', 6.2, 0.8, 4.8], ['N', -6.2, TIERS[0] + 0.8, TIERS[1] - 0.2], ['E', -6.2, TIERS[1] + 0.8, TIERS[2] - 0.2], ['S', 6.2, TIERS[2] + 0.8, TIERS[3] - 0.2]];
    for (const [face, v, y0, y1] of spec) {
        const horizontal = face === 'N' || face === 'S', off = HW - 0.22, sgn = face === 'W' || face === 'N' ? -1 : 1;
        for (const y of ys(y0, y1)) rungs.push(horizontal ? { x: v, y: y, z: sgn * off, w: 1.3, h: 0.1, d: 0.44, color: 0x8a6034 } : { x: sgn * off, y: y, z: v, w: 0.44, h: 0.1, d: 1.3, color: 0x8a6034 });
        for (const side of [-0.7, 0.7]) rungs.push(horizontal ? { x: v + side, y: (y0 + y1) / 2, z: sgn * (HW - 0.1), w: 0.1, h: y1 - y0 + 0.8, d: 0.2, color: 0x5a3c20 } : { x: sgn * (HW - 0.1), y: (y0 + y1) / 2, z: v + side, w: 0.2, h: y1 - y0 + 0.8, d: 0.1, color: 0x5a3c20 });
    }
    addInstancedBlocks(rungs, tex.wood, { uvMeters: 1 });
}
// Słupy podpierające galerie (też uchwyty do wspinaczki) i skrzynie na podłodze
function buildTimber() {
    const posts = [];
    for (const z of [-8, -4, 0, 4]) posts.push({ x: -5.6, y: (TIERS[0] - LEDGE) / 2, z: z, w: 0.35, h: TIERS[0] - LEDGE, d: 0.35, color: 0x5a3c20 });
    for (const x of [-4, 0, 4, 8]) posts.push({ x: x, y: (TIERS[1] - LEDGE) / 2, z: -5.6, w: 0.35, h: TIERS[1] - LEDGE, d: 0.35, color: 0x5a3c20 });
    for (const z of [-4, 0, 4, 8]) posts.push({ x: 5.6, y: (TIERS[2] - LEDGE) / 2, z: z, w: 0.35, h: TIERS[2] - LEDGE, d: 0.35, color: 0x5a3c20 });
    for (const x of [-8, -4, 0, 4]) posts.push({ x: x, y: (TIERS[3] - LEDGE) / 2, z: 5.6, w: 0.35, h: TIERS[3] - LEDGE, d: 0.35, color: 0x5a3c20 });
    for (const [x, z] of [[4.5, 4.5], [5.6, 3.7], [4.9, 5.4]]) posts.push({ x: x, y: 0.45, z: z, w: 0.9, h: 0.9, d: 0.9, color: 0x6a4a28 });   // skrzynie
    posts.push({ x: -2.7, y: 0.55, z: -3, w: 1.2, h: 0.7, d: 1.9, color: 0x4a4a50 });   // wózek
    addInstancedBlocks(posts, tex.wood, { uvMeters: 1 });
}
// Dekoracje bez kolizji: szyny, kryształy, łańcuchy, lampy
function buildDecor() {
    const R = T.mkRng(4747), m4 = new THREE.Matrix4(), c = new THREE.Color();
    const dark = new THREE.MeshStandardMaterial({ color: 0x2a2622, roughness: 0.6, metalness: 0.6 });
    const sleepers = new THREE.InstancedMesh(new THREE.BoxGeometry(1.6, 0.06, 0.18), new THREE.MeshStandardMaterial({ color: 0x4a321c, roughness: 0.9 }), 16);
    for (let i = 0; i < 16; i++) { m4.makeTranslation(-2.7, 0.03, -8 + i * 1.05); sleepers.setMatrixAt(i, m4); }
    L.root.add(sleepers);
    for (const x of [-3.3, -2.1]) { const r = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.09, 16.4), dark); r.position.set(x, 0.1, 0); L.root.add(r); }
    // Kryształy na ścianach: zimne, świecące stożki
    const crystals = new THREE.InstancedMesh(new THREE.ConeGeometry(0.1, 0.55, 5), new THREE.MeshStandardMaterial({ color: 0x4a8cff, emissive: 0x2a60ff, emissiveIntensity: 1.6, roughness: 0.25 }), 46);
    for (let i = 0; i < 46; i++) {
        const side = (R() * 4) | 0, v = (R() - 0.5) * 16, y = 0.8 + R() * (CH - 3);
        const n = [[1, 0, 0], [-1, 0, 0], [0, 0, 1], [0, 0, -1]][side], pos = [[-HW + 0.1, y, v], [HW - 0.1, y, v], [v, y, -HW + 0.1], [v, y, HW - 0.1]][side];
        _v.set(n[0] + (R() - 0.5) * 0.5, n[1] + (R() - 0.5) * 0.4, n[2] + (R() - 0.5) * 0.5).normalize(); _q.setFromUnitVectors(_up, _v);
        const s = 0.7 + R() * 1.3; m4.compose(new THREE.Vector3(pos[0], pos[1], pos[2]), _q, new THREE.Vector3(s, s, s)); crystals.setMatrixAt(i, m4);
        crystals.setColorAt(i, c.set(R() < 0.7 ? 0x4a8cff : 0x9a6aff));
    }
    crystals.frustumCulled = false; L.root.add(crystals);
    const chains = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.025, 0.025, 1, 5), dark, 14);
    for (let i = 0; i < 14; i++) { const len = 4 + R() * 9; m4.compose(new THREE.Vector3((R() - 0.5) * 12, CH - len / 2, (R() - 0.5) * 12), new THREE.Quaternion(), new THREE.Vector3(1, len, 1)); chains.setMatrixAt(i, m4); }
    chains.frustumCulled = false; L.root.add(chains);
    // Lampy naftowe: ciepłe światło z lekkim migotaniem
    S.lanterns = LANTERNS.map((p, i) => {
        const l = new THREE.PointLight(0xff9a40, 18, 15, 1.6); l.position.set(p[0], p[1], p[2]); L.root.add(l);
        const f = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex.dot, color: 0xffa860, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); f.scale.set(0.6, 0.6, 1); f.position.copy(l.position); L.root.add(f);
        return { l: l, ph: i * 1.7 };
    });
    for (const q of CRYSTAL_LIGHTS) { const l = new THREE.PointLight(q[3], 8, 11, 1.8); l.position.set(q[0], q[1], q[2]); L.root.add(l); }
    const ex = new THREE.PointLight(0xfff0d0, 9, 10, 1.6); ex.position.set(0, TIERS[3] + 2.4, HW - 1.8); L.root.add(ex);   // światło dnia przy wyjściu
}
function buildPickups() {
    S.cellMesh = CELL_POS.map((p) => {
        const g = new THREE.Group(); g.position.set(p[0], p[1], p[2]);
        const core = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.5, 12), new THREE.MeshStandardMaterial({ color: 0x40ff80, emissive: 0x20e060, emissiveIntensity: 1.6 })); g.add(core);
        for (const y of [-0.2, 0.2]) { const ring = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.025, 6, 16), new THREE.MeshStandardMaterial({ color: 0x2a2a30, metalness: 0.7, roughness: 0.4 })); ring.rotation.x = Math.PI / 2; ring.position.y = y; g.add(ring); }
        const l = new THREE.PointLight(0x40ff80, 9, 9, 1.8); g.add(l); L.root.add(g); return g;
    });
    S.packMesh = PACK_POS.map((p) => {
        const g = new THREE.Group(); g.position.set(p[0], p[1], p[2]);
        g.add(new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.3, 0.14), new THREE.MeshStandardMaterial({ color: 0xe8c030, emissive: 0x806010, emissiveIntensity: 0.6, roughness: 0.5 })));
        const cap = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.06, 0.08), new THREE.MeshStandardMaterial({ color: 0x2a2a30, metalness: 0.7 })); cap.position.y = 0.18; g.add(cap);
        const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex.dot, color: 0xffd860, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.7 })); glow.scale.set(0.7, 0.7, 1); g.add(glow);
        L.root.add(g); return g;
    });
}
function addDigger(i, startNode) {
    const m = buildMannequin(T.mkRng(5200 + i)); m.group.scale.set(1.2, 1.5, 1.2); L.root.add(m.group);
    m.group.traverse(o => { if (o.isMesh && o.material) o.material = new THREE.MeshStandardMaterial({ color: 0x1a1612, roughness: 1 }); });
    addMonsterFace(m.head, { width: 0.058, open: 0.05, teeth: 12, toothColor: 0xcfc6a8, long: 1.6, horns: 0x8a7a60 }); swapModel(m, 'gravedigger');
    for (const sx of [-1, 1]) { const e = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex.dot, color: 0xffb020, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); e.scale.set(0.13, 0.13, 1); e.position.set(sx * 0.04, 0.152, 0.11); m.head.add(e); }
    const n = ML.NODES[startNode], c = { m: m, node: startNode, last: startNode, path: [], mode: 'patrol', pos: new THREE.Vector3(n.x, n.y, n.z), dir: 0, wait: 3, noticeT: 0, lostT: 0, huntT: 0, stepT: 0, goal: -1 };
    m.group.position.copy(c.pos); S.bots.push(c);
}

export function build() {
    L.spawn = info.spawn.slice();
    L.bounds = { minX: -17.2, maxX: 17.2, minZ: -17.2, maxZ: 10, maxY: CH - 0.3 };
    const df = diffOf('mine');
    S = { df: df, ghost: createGhost('mine'), ev: createEvents('mine', { skip: ['fog'] }), clock: 0, runT: 0, introT: INTRO_TIME, phase: 'intro', cells: 0, got: CELL_POS.map(() => false), packGot: PACK_POS.map(() => false),
        bat: 1, lampOn: true, lampBase: LIGHT_PRESETS.mine.flashlight, deadWarned: false, bots: [], cp: -1, caughtT: -1, leaving: false, hudT: 0, seen: 0, pvy: 0, flickerOff: false, noticeT: 0 };
    buildCave(); buildLadders(); buildTimber(); buildDecor(); buildPickups();
    const start = ML.farthestNode(info.spawn[0], 0, info.spawn[2]);
    addDigger(0, start);
    setDread(() => S.bots.map(b => b.m.group.position), { hide: (on) => S.bots.forEach(b => { b.m.group.visible = !on; }) });
    buildDoor({ x: 0, z: HW - 0.03, rotY: Math.PI, label: 'LEVELS', color: '#bfe8ff', wood: 0x3a3228, portal: { target: 'levels', spawn: ARRIVAL_FROM_MINE, onEnter: () => toast('Back to the levels') } });
    buildDoor({ x: 0, y: TIERS[3], z: HW - 0.03, rotY: Math.PI, label: 'EXIT', color: '#ff9a60', glow: 0xff7030, wood: 0x2a1e18, light: true, portal: { target: 'levels', spawn: ARRIVAL_FROM_MINE, onEnter: finish } });
    S.hud = cameraPanel(1024, 200, 0.42, 0.082, 0.2, -0.75, 990);
    S.intro = cameraPanel(1280, 820, 1.0, 0.64, -0.04, -1.05, 995); S.intro.last = -1;
    S.scare = createJumpscare({ seed: 9393, variant: 'grave' });
    L.onTrigger = (i) => { if (renderer.xr.isPresenting && i === 1) toggleLamp(); };   // VR: spust prawej ręki (na komputerze: klawisz G)
    L.onKeyG = toggleLamp;
    if (df.id !== 'normal') toast('Difficulty: ' + df.name + (df.checkpoints ? '' : ' (no checkpoints, a shorter battery, a second Digger after 2 cells)'), df.color);
    addStoryProps({ seed: 202, count: 26, corpses: 2 });   // krew, ślady, napisy i ciała (core/levelkit.js)
}

// ---------- LAMPA I BATERIA ----------
function toggleLamp() {
    if (!S || S.phase !== 'play') return;
    if (S.bat <= 0) { toast('The battery is dead. Find a battery pack.', '#e0533f'); return; }
    S.lampOn = !S.lampOn; SFX.beep(S.lampOn ? 1100 : 700, 0.1, 0.05); buzz(1, 0.25, 40);
}
function updateLamp(dt) {
    const lamp = lighting.headLamp, lit = S.lampOn && S.bat > 0;
    S.bat = ML.batteryStep(S.bat, dt, lit && S.phase === 'play', ML.lampSeconds(S.df.id));
    if (S.bat <= 0 && !S.deadWarned) { S.deadWarned = true; S.lampOn = false; toast('The lamp died! Find a battery pack. It hears you now...', '#e0533f'); SFX.stinger && SFX.stinger(); }
    if (S.bat > 0.4) S.deadWarned = false;
    S.flickerOff = ML.lampFlickers(S.bat, Math.random()) && lit;
    lamp.visible = lit && !S.flickerOff;
    lamp.distance = S.lampBase.distance * Math.max(0.2, ML.lampReach(S.bat));
}
function lampShines() { return S.lampOn && S.bat > 0; }

// ---------- PRZEBIEG ----------
function finish() {
    if (S.leaving) return; S.leaving = true;
    toast('You made it out of the mine!', '#ffb070');
    levelReward('mine', REWARD_FIRST, REWARD_REPEAT, 'escaping the mine');
    S.ghost.finish(recordTime('mine', S.runT) && !S.carried, S.runT);
}
function caught() {
    if (S.caughtT >= 0) return;
    S.caughtT = 0; S.scare.trigger(); releaseAll(); buzz('both', 1, 400);
    toast('The Digger found you...', '#e0533f');
}
function mul() { return ML.DIFF_MUL[S.df.id] || 1; }
// Hałas: Kopacze w zasięgu idą sprawdzić miejsce
function makeNoise(x, y, z, range) {
    for (const c of S.bots) {
        if (c.mode === 'chase') continue;
        if (Math.hypot(x - c.pos.x, y - c.pos.y, z - c.pos.z) < range * mul()) { c.mode = 'investigate'; c.goal = ML.nearestNode(x, y - 1, z); c.wait = 0; replan(c, c.goal); }
    }
}
function takeCell(i, p) {
    S.got[i] = true; S.cells++; S.cellMesh[i].visible = false; SFX.scream && SFX.scream(S.cellMesh[i].position); buzz('both', 0.8, 250);
    toast('Power cell ' + S.cells + '/' + CELLS + '. It clanked loudly!', '#7fff90');
    makeNoise(CELL_POS[i][0], CELL_POS[i][1], CELL_POS[i][2], ML.SENSE.CELL);
    if (S.df.checkpoints) { S.cp = i; toast('Checkpoint saved', '#7fc47f'); }
    if (S.cells === 2 && S.df.id === 'nightmare' && S.bots.length < 2) { const n = ML.farthestNode(p.x, p.y - 1, p.z); addDigger(1, n); toast('A second Digger wakes up...', '#ff4a2a'); SFX.stinger && SFX.stinger(); }
    if (S.cells === CELLS) {
        const k = L.obstacles.indexOf(S.gateOb); if (k >= 0) L.obstacles.splice(k, 1);
        if (S.gateOb.body) S.gateOb.body.position.y = -50;
        S.gate.visible = false; SFX.bell && SFX.bell();
        toast('The exit is open! Climb to the top!', '#ffd27a');
    }
}
function takePack(i) {
    S.packGot[i] = true; S.packMesh[i].visible = false; S.bat = ML.batteryAdd(S.bat, ML.BATTERY.PACK); SFX.beep(1400, 0.1, 0.06); buzz('both', 0.4, 80);
    toast('Battery +' + Math.round(ML.BATTERY.PACK * 100) + '%', '#ffd860'); if (S.bat > 0 && !S.lampOn && S.phase === 'play') S.lampOn = true;
}

// ---------- POTWÓR ----------
function replan(c, goal) {
    const from = ML.nearestNode(c.pos.x, c.pos.y, c.pos.z);
    let path = ML.findPath(from, goal);
    if (path.length > 1) {   // już jesteśmy w drodze od pierwszego węzła do drugiego: nie wracamy
        const a = ML.NODES[path[0]], b = ML.NODES[path[1]], dab = Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z), dcb = Math.hypot(c.pos.x - b.x, c.pos.y - b.y, c.pos.z - b.z);
        if (dcb < dab) path = path.slice(1);
    }
    c.path = path.length > 1 && path[0] === from && Math.hypot(c.pos.x - ML.NODES[from].x, c.pos.y - ML.NODES[from].y, c.pos.z - ML.NODES[from].z) < 0.05 ? path.slice(1) : path;
}
function patrolTarget(c, p) {
    const cur = ML.nearestNode(c.pos.x, c.pos.y, c.pos.z);
    if (c.huntT > 0 && p) { const pn = ML.nearestNode(p.x, p.y - 1, p.z), ns = ML.neighbours(pn).concat([pn]); return ns[(Math.random() * ns.length) | 0]; }   // chwilę kręci się wokół miejsca, gdzie cię stracił
    let g = cur; for (let k = 0; k < 6 && g === cur; k++) g = (Math.random() * ML.NODES.length) | 0;
    return g;
}
function moveDigger(c, dt) {
    if (!c.path.length) return false;
    const tn = ML.NODES[c.path[0]], dx = tn.x - c.pos.x, dy = tn.y - c.pos.y, dz = tn.z - c.pos.z, dist = Math.hypot(dx, dy, dz);
    const kind = ML.edgeKind(c.last, c.path[0]), sp = ML.speedFor(c.mode === 'chase' ? 'chase' : (c.mode === 'investigate' ? 'investigate' : 'patrol'), kind, S.df.id);
    const step = sp * dt;
    if (dist <= step) { c.pos.set(tn.x, tn.y, tn.z); c.last = c.path[0]; c.node = c.path.shift(); }
    else { c.pos.x += dx / dist * step; c.pos.y += dy / dist * step; c.pos.z += dz / dist * step; if (Math.hypot(dx, dz) > 0.05) c.dir = Math.atan2(dx, dz); }
    return true;
}
function thinkDiggers(dt, p, ctx) {
    const feetY = p.y - 1.0, run = Math.hypot(ctx.body.velocity.x, ctx.body.velocity.z), vy = ctx.body.velocity.y, lamp = lampShines();
    let seenBy = 0;
    // Lądowanie po upadku robi hałas
    if (S.pvy < -7 && vy > -2) { makeNoise(p.x, p.y, p.z, ML.SENSE.LANDING); toast('You hit the ground hard!', '#ffb070'); buzz('both', 0.6, 160); }
    S.pvy = vy;
    for (const c of S.bots) {
        const d = Math.hypot(p.x - c.pos.x, p.y - (c.pos.y + 1.0), p.z - c.pos.z);
        const cue = ML.perceive({ d: d, lamp: lamp, runSpeed: run, vy: vy, voice: heardVoice(d, S.df.id === 'nightmare' ? 1.3 : 1), mul: mul() });
        const pn = ML.nearestNode(p.x, feetY, p.z);
        if (cue === 'breath') { if (c.mode !== 'chase') startChase(c); c.lostT = 0; }
        else if (cue === 'light-near') { c.noticeT += dt; if (c.noticeT >= 0.5 && c.mode !== 'chase') startChase(c); if (c.mode === 'chase') c.lostT = 0; }
        else if (cue === 'light') { c.noticeT += dt; if (c.mode === 'chase') c.lostT = 0; else if (c.noticeT >= 1.2 && c.mode !== 'investigate') { c.mode = 'investigate'; c.goal = pn; c.wait = 0; replan(c, pn); } }
        else if (cue === 'voice' || cue === 'run') { if (c.mode === 'chase') c.lostT = 0; else if (c.mode !== 'investigate' || c.goal !== pn) { c.mode = 'investigate'; c.goal = pn; c.wait = 0; replan(c, pn); } }
        else { c.noticeT = Math.max(0, c.noticeT - dt); if (c.mode === 'chase') { c.lostT += dt; if (c.lostT > LOSE_TIME) { c.mode = 'patrol'; c.huntT = 14; c.wait = 1.5; c.path = []; toast('It lost you. Stay quiet...', '#7fc47f'); } } }
        if (c.mode === 'chase') {
            seenBy++; c.repath -= dt;
            if (c.repath <= 0) { c.repath = 0.35; replan(c, pn); }
            if (!c.path.length && Math.abs(p.y - (c.pos.y + 1.0)) < 2.4) {   // na tym samym piętrze: ostatnie metry prosto na gracza
                const dx = p.x - c.pos.x, dz = p.z - c.pos.z, dd = Math.hypot(dx, dz), st = ML.speedFor('chase', null, S.df.id) * dt; if (dd > 0.01) { c.pos.x += dx / dd * Math.min(st, dd); c.pos.z += dz / dd * Math.min(st, dd); c.dir = Math.atan2(dx, dz); }
            } else moveDigger(c, dt);
        } else if (c.path.length) { moveDigger(c, dt); }
        else if (c.wait > 0) { c.wait -= dt; c.dir += Math.sin(S.clock * 2) * dt * 0.8; }   // staje i nasłuchuje
        else if (c.mode === 'investigate') { c.mode = 'patrol'; c.huntT = 10; c.wait = 2.2; }
        else { const g = patrolTarget(c, p); c.huntT = Math.max(0, c.huntT - 5); c.wait = 1.2 + Math.random() * 2.5; replan(c, g); }
        c.stepT -= dt; if (c.stepT <= 0 && c.path.length && d < 26) { c.stepT = c.mode === 'chase' ? 0.3 : 0.7; SFX.step(0.5, { x: c.pos.x, y: c.pos.y + 0.1, z: c.pos.z }); }
        if (d < CATCH_DIST) { caught(); return; }
        if (d < 14) SFX.heartbeat(Math.max(0, 1 - d / 14) * 0.9);
    }
    S.seen = seenBy;
}
function startChase(c) {
    c.mode = 'chase'; c.lostT = 0; c.repath = 0; c.wait = 0; c.noticeT = 0;
    SFX.growl && SFX.growl({ x: c.pos.x, y: c.pos.y + 1.5, z: c.pos.z }); buzz('both', 0.5, 160);
}
function resetDiggers(p) { S.bots.forEach((c, i) => { const n = ML.farthestNode(p[0], p[1], p[2], i === 0 ? null : [S.bots[0].node]), q = ML.NODES[n]; c.pos.set(q.x, q.y, q.z); c.node = c.last = n; c.path = []; c.mode = 'patrol'; c.wait = 3; c.noticeT = 0; c.lostT = 0; c.huntT = 0; }); }

// ---------- CO KLATKĘ ----------
const INTRO = [
    'Find 3 power cells in the side chambers on floors 1, 2 and 3.',
    'Climb the ladders and walls with your hands. Falling is loud.',
    'Your lamp runs on a battery. G or the right trigger turns it off.',
    'The Digger sees light and hears running, falling and voices.',
    'In the dark it finds you only from a few metres. Pick up battery packs.',
    'With all 3 cells the exit at the very top opens.'
];
export function update(dt, t, ctx) {
    if (!S || S.leaving) return;
    S.clock += dt; const p = ctx.body.position;
    S.ev.update(dt, S.phase === 'play' && S.caughtT < 0);
    S.scare.update(dt);
    if (S.introSkip === undefined) { S.introSkip = introSeen('mine'); if (S.introSkip) S.introT = Math.min(S.introT, 3); }
    if (S.introT > 0) {
        S.introT -= dt;
        const sec = Math.max(0, Math.ceil(S.introT));
        if (sec !== S.intro.last) { S.intro.last = sec; drawInstructions(S.intro, 'The Mine', INTRO, 'The Digger wakes in ' + sec + ' s', { bg: 'rgba(14,10,6,0.92)', border: '#ffb030', title: '#ffe8c0', text: '#f0e0cc', footer: '#ff6020', size: 28 }); }
        S.intro.mesh.visible = S.introT > 0 && !S.introSkip;
        if (S.introT <= 0) { S.phase = 'play'; toast('Find 3 power cells. Mind your lamp!', '#ffd27a'); }
    }
    if (S.phase === 'play' && S.caughtT < 0) S.runT += dt;
    S.ghost.tick(dt, p, S.phase === 'play' && S.caughtT < 0);
    updateLamp(dt);
    S.cellMesh.forEach((g, i) => { if (!S.got[i]) { g.rotation.y = t * 1.4; g.position.y = CELL_POS[i][1] + Math.sin(t * 2 + i) * 0.08; if (Math.hypot(p.x - CELL_POS[i][0], p.z - CELL_POS[i][2]) < PICK_R && Math.abs(p.y - CELL_POS[i][1]) < 1.5) takeCell(i, p); } });
    S.packMesh.forEach((g, i) => { if (!S.packGot[i]) { g.rotation.y = t * 1.8; if (Math.hypot(p.x - PACK_POS[i][0], p.z - PACK_POS[i][2]) < PICK_R && Math.abs(p.y - PACK_POS[i][1]) < 1.5) takePack(i); } });
    for (const lt of S.lanterns) lt.l.intensity = 18 * (0.75 + 0.25 * Math.sin(t * 8 + lt.ph) * Math.sin(t * 3.7 + lt.ph));
    if (S.caughtT >= 0) {
        S.caughtT += dt;
        if (S.caughtT > 1.6) {
            if (S.cp >= 0 && takeRespawn(S)) {
                const q = ML.NODES[[ML.IDX.A2, ML.IDX.B2, ML.IDX.C2][S.cp]]; setPlayerPosition(q.x, q.y + 1.0, q.z); resetDiggers([q.x, q.y, q.z]); S.caughtT = -1; S.carried = true; toast('Back at the last chamber. The Digger lost you.', '#7fc47f');
            } else { S.leaving = true; ctx.goto('mine'); return; }
        }
        animate(t); return;
    }
    if (S.phase === 'play') thinkDiggers(dt, p, ctx);
    animate(t);
    S.hudT -= dt; if (S.hudT <= 0) { S.hudT = 0.15; drawHud(); }
}
function animate(t) {
    for (const c of S.bots) { c.m.group.position.set(c.pos.x, c.pos.y + (c.path.length ? Math.abs(Math.sin(t * 6)) * 0.04 : 0), c.pos.z); c.m.group.rotation.y = c.dir; }
}
function fmt(s) { s = Math.max(0, Math.floor(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); }
function drawHud() {
    const x = S.hud.ctx; panelBg(S.hud, 'rgba(14,10,6,0.72)');
    x.textBaseline = 'middle'; x.textAlign = 'left';
    x.font = 'bold 78px "Courier New", monospace'; x.fillStyle = '#ffe8c0'; x.fillText(fmt(S.runT), 30, 74);
    if (S.df.id !== 'normal') { x.font = 'bold 22px "Courier New", monospace'; x.fillStyle = S.df.color; x.fillText(S.df.name.toUpperCase(), 330, 18); }
    x.font = 'bold 34px "Courier New", monospace'; x.fillStyle = S.cells === CELLS ? '#7fff90' : '#ffd27a'; x.fillText('Cells ' + S.cells + '/' + CELLS, 330, 50);
    // Bateria: pasek (czerwony poniżej progu)
    const bw = 220, bx = 640, by = 36, low = S.bat < ML.BATTERY.LOW;
    x.fillStyle = '#2a2018'; x.fillRect(bx, by, bw, 26); x.fillStyle = S.bat <= 0 ? '#802020' : (low ? '#ff5a3a' : '#ffd060'); x.fillRect(bx + 3, by + 3, Math.max(0, (bw - 6) * S.bat), 20);
    x.font = 'bold 22px "Courier New", monospace'; x.fillStyle = '#e8d8c0'; x.fillText(S.lampOn && S.bat > 0 ? 'LAMP' : 'DARK', bx + bw + 14, by + 14);
    x.font = 'bold 26px "Courier New", monospace';
    let msg = 'Light and noise draw it. Climb.', col = '#e0d0b8';
    if (S.cells === CELLS) { msg = 'CLIMB to the EXIT at the top!'; col = '#7fff90'; }
    else if (S.seen > 0) { msg = 'IT IS COMING! Break away!'; col = '#ff4a2a'; }
    else if (S.bat <= 0) { msg = 'Lamp dead. Find a battery pack!'; col = '#ff5a3a'; }
    else if (low) { msg = 'Battery low. Look for a pack.'; col = '#ffb030'; }
    else if (!S.lampOn) { msg = 'Lamp off: it only finds you up close.'; col = '#9ad0ff'; }
    x.fillStyle = col; x.fillText(msg, 330, 108);
    S.hud.update();
}
export const testState = () => S;   // dla testów: dostęp do stanu poziomu
export function dispose() {
    if (S) {
        S.ev.dispose(); S.ghost.dispose(); S.hud.dispose(); S.intro.dispose(); S.scare.dispose();
        const lamp = lighting.headLamp; lamp.distance = S.lampBase.distance;
    }
    L.onTrigger = null; L.onKeyG = null;
    S = null;
}
