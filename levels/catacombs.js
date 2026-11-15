// ==========================================
// POZIOM 8: THE CATACOMBS (katakumby, horror na słuch)
// Ciemny labirynt z kości i czaszek (układ stały, działa duch). Znajdź 4 czaszki-klucze w ślepych zaułkach, a brama przy wyjściu się otworzy.
// Strażnik nie nosi lampy: widać tylko jego czerwone oczy. Słyszy bieg (9 m), trzask kości na posadzce (22 m) i krzyk czaszki przy podniesieniu.
// Widzi przed sobą do 13 m, gdy nic go nie zasłania. Po kościach chodź bokiem, a przy Strażniku stój cicho za rogiem.
// Czerwone oczy na ścianach to ułuda: znikają, gdy podejdziesz. Po każdym kluczu zapisuje się punkt kontrolny (Easy i Normal).
// ==========================================
import { THREE, L, tex, addCrispBlock } from '../core/engine.js';
import * as T from '../core/textures.js';
import { buildMannequin } from '../core/mannequin.js';
import { levelReward, recordTime, diffOf } from '../core/economy.js';
import { toast } from '../core/terminal.js';
import { setPlayerPosition, releaseAll } from '../core/player.js';
import * as SFX from '../core/audio.js';
import { buzz } from '../core/haptics.js';
import { createGhost } from '../core/runkit.js';
import { createEvents } from '../core/events.js';
import { createBot, stepBot } from '../core/botkit.js';
import { ARRIVAL_FROM_CATACOMBS } from './levels.js';
import { createGridMaze } from '../core/gridmaze.js';
import { buildDoor, cameraPanel, panelBg, drawInstructions, createJumpscare, introSeen } from '../core/levelkit.js';

const N = 8, P = 5.5, WT = 0.8, H = 3.4, X = N * P / 2;              // siatka 8 x 8 komórek po 5,5 m (44 x 44 m), ściany 0,8 m
const SEE_DIST = 13, HEAR_RUN = 9, HEAR_BONE = 22, LOSE_TIME = 7, CATCH_DIST = 1.0, KEYS = 4;
const WALK = 2.0, INVESTIGATE = 3.0, CHASE = 4.2;
const REWARD_FIRST = 3000, REWARD_REPEAT = 300, INTRO_TIME = 10;
export const info = { id: 'catacombs', name: 'The Catacombs', spawn: [-X + P / 2, 1.0, -1.6] };
let S = null;
const _q = new THREE.Vector3();

// ---------- UKŁAD LABIRYNTU (deterministyczny: DFS z ziarnem + kilka dodatkowych przejść, żeby dało się uciekać pętlami) ----------
const GM = createGridMaze({ N: N, P: P, WT: WT, H: H, seed: 8888, loops: 9 });   // układ i pathfinding: core/gridmaze.js
const { cx, cz, cellOf, bfs } = GM;
const START = [0, 0], EXIT_CELL = [N - 1, N - 1];
const EXIT_Z = -N * P + WT / 2 + 0.03, GATE_Z = -N * P + P * 0.55;
// Klucze: 4 ślepe zaułki jak najdalej od siebie i od startu
const KEY_CELLS = GM.pickDeadEnds(KEYS, START, [START, EXIT_CELL], 4);
const KEY_POS = KEY_CELLS.map(c => [cx(c[0]), cz(c[1])]);
// Stosy kości: w korytarzach (nie w komórkach startu, wyjścia i kluczy), ok. co trzecia komórka
function pickBones() {
    const R = T.mkRng(4141), out = [];
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
        if (Math.abs(i - START[0]) + Math.abs(j - START[1]) < 2 || (i === EXIT_CELL[0] && j === EXIT_CELL[1]) || KEY_CELLS.some(c => c[0] === i && c[1] === j)) continue;
        if (R() < 0.34) out.push([cx(i) + (R() - 0.5) * 1.2, cz(j) + (R() - 0.5) * 1.2]);
    }
    return out;
}
const BONES = pickBones();

export function build() {
    L.spawn = info.spawn.slice();
    L.bounds = { minX: -X + 0.5, maxX: X - 0.5, minZ: -N * P + 0.5, maxZ: -0.5, maxY: H - 0.3 };
    const df = diffOf('catacombs');
    S = { df: df, ghost: createGhost('catacombs'), ev: createEvents('catacombs', { skip: ['fog'] }), clock: 0, runT: 0, introT: INTRO_TIME, phase: 'intro', keys: 0, got: KEY_POS.map(() => false), cp: -1, bots: [], caughtT: -1, leaving: false, hudT: 0, seen: 0, carried: false, bonesHit: BONES.map(() => 0), noise: 0, decoys: [] };
    buildWalls();
    buildDecor();
    buildKeys();
    buildGate();
    buildWardens();
    buildDoor({ x: cx(0), z: -WT / 2 - 0.03, rotY: Math.PI, label: 'LEVELS', color: '#bfe8ff', wood: 0x3a3228, portal: { target: 'levels', spawn: ARRIVAL_FROM_CATACOMBS, onEnter: () => toast('Back to the levels') } });
    S.hud = cameraPanel(1024, 200, 0.42, 0.082, 0.2, -0.75, 990);
    S.intro = cameraPanel(1280, 820, 1.0, 0.64, -0.04, -1.05, 995); S.intro.last = -1;
    S.scare = createJumpscare({ seed: 8181 });
    if (df.id !== 'normal') toast('Difficulty: ' + df.name + (df.checkpoints ? '' : ' (no checkpoints, 2 wardens)'), df.color);
}

// ---------- BUDOWA ----------
function buildWalls() { GM.buildWalls({ wall: 0x6e6454, edge: 0x0c0a08, floor: 0x4a4238, ceil: 0x2a241e }); }
// Czaszki we wnękach i stosy kości (po jednym InstancedMesh), pochodnie, ułudy z czerwonymi oczami
function buildDecor() {
    const R = T.mkRng(9191);
    const skullGeo = new THREE.SphereGeometry(0.16, 8, 6), skullMat = new THREE.MeshStandardMaterial({ color: 0xd8ceb4, roughness: 0.8 });
    const skulls = []; // czaszki ułożone w rzędach przy ścianach komórek
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
        if (R() > 0.55) continue;
        const side = (R() * 4) | 0, off = (R() - 0.5) * (P - 2.2), h = 0.4 + R() * 1.8;
        const x = cx(i) + (side === 0 ? P / 2 - WT / 2 - 0.1 : side === 1 ? -P / 2 + WT / 2 + 0.1 : off), z = cz(j) + (side === 2 ? P / 2 - WT / 2 - 0.1 : side === 3 ? -P / 2 + WT / 2 + 0.1 : off);
        skulls.push([x, h, z]);
    }
    const im = new THREE.InstancedMesh(skullGeo, skullMat, skulls.length), m4 = new THREE.Matrix4();
    skulls.forEach((s, k) => { m4.makeTranslation(s[0], s[1], s[2]); im.setMatrixAt(k, m4); });
    im.frustumCulled = false; L.root.add(im);
    const boneGeo = new THREE.BoxGeometry(0.5, 0.07, 0.07), boneMat = new THREE.MeshStandardMaterial({ color: 0xe6dcc0, roughness: 0.7 });
    const bn = new THREE.InstancedMesh(boneGeo, boneMat, BONES.length * 9), e = new THREE.Euler(), qq = new THREE.Quaternion(), pp = new THREE.Vector3(), ss = new THREE.Vector3(1, 1, 1);
    BONES.forEach((b, k) => { for (let n = 0; n < 9; n++) { e.set((R() - 0.5) * 0.5, R() * 3.14, (R() - 0.5) * 0.5); qq.setFromEuler(e); pp.set(b[0] + (R() - 0.5) * 1.0, 0.05 + n * 0.02, b[1] + (R() - 0.5) * 1.0); m4.compose(pp, qq, ss); bn.setMatrixAt(k * 9 + n, m4); } });
    bn.frustumCulled = false; L.root.add(bn);
    // Pochodnie: tylko kilka (ogranicza liczbę świateł), reszta tonie w ciemności
    S.torches = [];
    for (const [i, j] of [[0, 0], [3, 2], [6, 4], [2, 6], [7, 7]]) {
        const l = new THREE.PointLight(0xff8a30, 10, 11, 1.8), x = cx(i), z = cz(j); l.position.set(x, 2.2, z); L.root.add(l);
        const f = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex.dot, color: 0xffa050, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); f.scale.set(0.5, 0.5, 1); f.position.set(x, 2.2, z); L.root.add(f);
        S.torches.push({ l: l, ph: Math.random() * 9 });
    }
    // Ułudy: pary czerwonych oczu w ścianach, znikają, gdy podejdziesz
    for (let k = 0; k < 14; k++) {
        const i = (R() * N) | 0, j = (R() * N) | 0, a = R() * 6.28, r = P / 2 - WT / 2 - 0.05;
        const g = new THREE.Group(); g.position.set(cx(i) + Math.cos(a) * r * (Math.abs(Math.cos(a)) > 0.7 ? 1 : 0.3), 1.5 + R() * 0.5, cz(j) + Math.sin(a) * r * (Math.abs(Math.sin(a)) > 0.7 ? 1 : 0.3));
        for (const sx of [-1, 1]) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex.dot, color: 0xff1808, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.9 })); s.scale.set(0.11, 0.11, 1); s.position.set(sx * 0.09, 0, 0); g.add(s); }
        L.root.add(g); S.decoys.push({ g: g, alive: true, ph: R() * 6 });
    }
}
function buildKeys() {
    S.keyMesh = KEY_POS.map((p) => {
        const g = new THREE.Group(); g.position.set(p[0], 1.0, p[1]);
        const skull = new THREE.Mesh(new THREE.SphereGeometry(0.17, 12, 9), new THREE.MeshStandardMaterial({ color: 0xffe0c0, emissive: 0xff5020, emissiveIntensity: 1.3 })); skull.scale.y = 1.15; g.add(skull);
        const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex.dot, color: 0xff6030, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.8 })); glow.scale.set(1.3, 1.3, 1); g.add(glow);
        const l = new THREE.PointLight(0xff5020, 9, 8, 1.8); g.add(l); L.root.add(g);
        return g;
    });
}
function buildGate() {
    const gx = cx(EXIT_CELL[0]);
    S.gate = addCrispBlock(gx, H / 2, GATE_Z, P - WT, H, 0.3, 0x2a2a30, 0xff3030);
    S.gateOb = L.obstacles[L.obstacles.length - 1];
    S.gateLamp = new THREE.PointLight(0xff3030, 10, 9, 1.6); S.gateLamp.position.set(gx, 2.4, GATE_Z + 1.4); L.root.add(S.gateLamp);
    buildDoor({ x: gx, z: EXIT_Z, rotY: 0, label: 'EXIT', color: '#ff9a60', glow: 0xff7030, wood: 0x2a1e18, light: true, portal: { target: 'levels', spawn: ARRIVAL_FROM_CATACOMBS, onEnter: finish } });
}
function buildWardens() {
    const count = S.df.id === 'nightmare' ? 2 : 1;
    for (let i = 0; i < count; i++) {
        const m = buildMannequin(T.mkRng(1700 + i)); m.group.scale.set(1.25, 1.55, 1.25); L.root.add(m.group);
        m.group.traverse(o => { if (o.isMesh && o.material) o.material = new THREE.MeshStandardMaterial({ color: 0x14100e, roughness: 1 }); });
        for (const sx of [-1, 1]) { const e = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex.dot, color: 0xff1808, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); e.scale.set(0.13, 0.13, 1); e.position.set(sx * 0.04, 0.152, 0.11); m.head.add(e); }
        const start = i ? [N - 2, 1] : [N - 3, N - 3];
        const st = createBot(cx(start[0]), cz(start[1])); st.mode = 'patrol'; st.path = []; st.goalCell = null;
        m.group.position.set(st.x, 0, st.z);
        S.bots.push({ m: m, st: st, lostT: 0, last: null, stepT: 0, repath: 0, startCell: start });
    }
}

// ---------- ZDARZENIA ----------
function finish() {
    if (S.leaving) return; S.leaving = true;
    toast('You escaped the catacombs!', '#ffb070');
    levelReward('catacombs', REWARD_FIRST, REWARD_REPEAT, 'escaping the catacombs');
    S.ghost.finish(recordTime('catacombs', S.runT) && !S.carried, S.runT);
}
function caught() {
    if (S.caughtT >= 0) return;
    S.caughtT = 0; S.scare.trigger(); releaseAll(); buzz('both', 1, 400);
    toast('The Warden found you...', '#e0533f');
}
// Hałas: Strażnicy w zasięgu idą sprawdzić miejsce
function makeNoise(x, z, range) {
    for (const b of S.bots) {
        if (b.st.mode === 'chase') continue;
        if (Math.hypot(x - b.st.x, z - b.st.z) < range * (S.df.id === 'nightmare' ? 1.25 : 1)) { b.st.mode = 'investigate'; b.st.goalCell = cellOf(x, z); b.st.path = []; b.repath = 0; }
    }
}
function takeKey(i) {
    S.got[i] = true; S.keys++; S.keyMesh[i].visible = false; SFX.scream && SFX.scream(S.keyMesh[i].position); buzz('both', 0.8, 250);
    toast('Skull key ' + S.keys + '/' + KEYS + '. It screamed!', '#ff9a60');
    makeNoise(KEY_POS[i][0], KEY_POS[i][1], 40);   // krzyk niesie się po całych katakumbach
    if (S.df.checkpoints) { S.cp = i; toast('Checkpoint saved', '#7fc47f'); }
    if (S.keys === KEYS) {
        const k = L.obstacles.indexOf(S.gateOb); if (k >= 0) L.obstacles.splice(k, 1);
        if (S.gateOb.body) S.gateOb.body.position.y = -50;
        S.gate.visible = false; S.gateLamp.color.setHex(0x30ff60); SFX.bell && SFX.bell();
        toast('The gate is open! Run to the EXIT!', '#ffd27a');
    }
}
const INTRO = [
    'The Warden carries no light. Watch for two red eyes in the dark.',
    'He hears running (9 m), cracking bones on the floor (22 m) and every skull you take.',
    'Walk around the bone piles and stay quiet. Sneak past, never sprint.',
    'Take 4 screaming skull keys from the dead ends. The gate by the EXIT opens.',
    'Red eyes in the walls are only illusions. Each key saves a checkpoint.'
];

// ---------- CO KLATKĘ ----------
export function update(dt, t, ctx) {
    if (!S || S.leaving) return;
    S.clock += dt; const p = ctx.body.position;
    S.ev.update(dt, S.phase === 'play' && S.caughtT < 0);
    S.scare.update(dt);
    if (S.introSkip === undefined) { S.introSkip = introSeen('catacombs'); if (S.introSkip) S.introT = Math.min(S.introT, 3); }
    if (S.introT > 0) {
        S.introT -= dt;
        const sec = Math.max(0, Math.ceil(S.introT));
        if (sec !== S.intro.last) { S.intro.last = sec; drawInstructions(S.intro, 'The Catacombs', INTRO, 'The Warden wakes in ' + sec + ' s', { bg: 'rgba(14,8,6,0.92)', border: '#ff6a30', title: '#ffe0c8', text: '#f0dccc', footer: '#ff3020', size: 28 }); }
        S.intro.mesh.visible = S.introT > 0 && !S.introSkip;
        if (S.introT <= 0) { S.phase = 'play'; toast('Find 4 skull keys. Do not run!', '#ff9a60'); }
    }
    if (S.phase === 'play' && S.caughtT < 0) S.runT += dt;
    S.ghost.tick(dt, p, S.phase === 'play' && S.caughtT < 0);
    S.keyMesh.forEach((g, i) => { if (!S.got[i]) { g.rotation.y = t * 1.2; g.position.y = 1.0 + Math.sin(t * 2 + i) * 0.1; if (Math.hypot(p.x - KEY_POS[i][0], p.z - KEY_POS[i][1]) < 1.0 && Math.abs(p.y - 1.0) < 1.5) takeKey(i); } });
    for (const tr of S.torches) tr.l.intensity = 10 * (0.7 + 0.3 * Math.sin(t * 9 + tr.ph) * Math.sin(t * 4.1 + tr.ph));
    // Ułudy znikają, gdy podejdziesz, i mrugają
    for (const d of S.decoys) {
        if (!d.alive) continue;
        const dist = Math.hypot(p.x - d.g.position.x, p.z - d.g.position.z);
        if (dist < 4.2) { d.alive = false; d.g.visible = false; if (Math.random() < 0.4) SFX.whisper(d.g.position); continue; }
        d.g.visible = Math.sin(t * 0.8 + d.ph) > -0.7 || Math.sin(t * 7 + d.ph) > 0;
    }
    if (S.caughtT >= 0) {
        S.caughtT += dt;
        if (S.caughtT > 1.6) {
            if (S.df.checkpoints && S.cp >= 0) { const r = KEY_POS[S.cp]; setPlayerPosition(r[0], 1.0, r[1] + 1.2); S.bots.forEach((b) => resetBot(b)); S.caughtT = -1; S.carried = true; toast('Back at the last key. The Warden lost you.', '#7fc47f'); }
            else { S.leaving = true; ctx.goto('catacombs'); return; }
        }
        animate(t); return;
    }
    if (S.phase === 'play') { crunchBones(p, ctx); think(dt, ctx); }
    animate(t);
    S.hudT -= dt; if (S.hudT <= 0) { S.hudT = 0.15; drawHud(); }
}
function resetBot(b) { const st = b.st; st.x = cx(b.startCell[0]); st.z = cz(b.startCell[1]); st.mode = 'patrol'; st.path = []; st.goalCell = null; b.lostT = 0; b.last = null; }
// Stosy kości trzeszczą pod stopą (nie trzeszczą, gdy stoisz): to jedyny stały sposób, w jaki labirynt cię zdradza
function crunchBones(p, ctx) {
    const sp = Math.hypot(ctx.body.velocity.x, ctx.body.velocity.z);
    BONES.forEach((b, i) => {
        if (S.bonesHit[i] > 0) { S.bonesHit[i] -= 0.016; return; }
        if (sp > 0.4 && p.y < 1.6 && Math.hypot(p.x - b[0], p.z - b[1]) < 0.75) {
            S.bonesHit[i] = 3; SFX.bang && SFX.bang({ x: b[0], y: 0.2, z: b[1] }); buzz('both', 0.5, 120);
            toast('Bones crack!', '#ffb070'); makeNoise(b[0], b[1], HEAR_BONE);
        }
    });
}
function sees(b, p) {
    const st = b.st, dx = p.x - st.x, dz = p.z - st.z, d = Math.hypot(dx, dz), range = SEE_DIST * (S.df.id === 'nightmare' ? 1.2 : (S.df.id === 'easy' ? 0.8 : 1));
    if (d > range) return false;
    if (st.mode !== 'chase' && d > 2 && (dx * Math.sin(st.dir) + dz * Math.cos(st.dir)) / d < 0.35) return false;
    const steps = Math.ceil(d / 0.4);
    for (let i = 1; i < steps; i++) {
        const k = i / steps; _q.set(st.x + dx * k, st.y + 1.6 + (p.y - st.y - 1.6) * k, st.z + dz * k);
        for (const o of L.obstacles) { if (o === S.gateOb) continue; if (o.box3.containsPoint(_q)) return false; }
    }
    return true;
}
// Następny punkt na trasie po labiryncie (środki komórek); w tej samej komórce idzie prosto do celu
function waypoint(b, goalCell, gx, gz, dt) {
    const st = b.st, cur = cellOf(st.x, st.z);
    if (cur[0] === goalCell[0] && cur[1] === goalCell[1]) return [gx, gz];
    b.repath -= dt;
    if (b.repath <= 0 || !st.path.length) { st.path = bfs(cur, goalCell); b.repath = 0.4; }
    while (st.path.length && Math.hypot(cx(st.path[0][0]) - st.x, cz(st.path[0][1]) - st.z) < 0.9) st.path.shift();
    return st.path.length ? [cx(st.path[0][0]), cz(st.path[0][1])] : [gx, gz];
}
function think(dt, ctx) {
    const p = ctx.body.position, speedXZ = Math.hypot(ctx.body.velocity.x, ctx.body.velocity.z), mul = S.df.speed, pc = cellOf(p.x, p.z);
    let seenBy = 0;
    for (const b of S.bots) {
        const st = b.st, seesMe = sees(b, p), d = Math.hypot(p.x - st.x, p.z - st.z), prev = st.mode;
        if (seesMe) { if (prev !== 'chase') SFX.stinger({ x: st.x, y: 1.5, z: st.z }); st.mode = 'chase'; b.lostT = 0; b.last = [p.x, p.z]; seenBy++; }
        else if (st.mode === 'chase') { b.lostT += dt; if (b.lostT > LOSE_TIME) { st.mode = 'patrol'; st.goalCell = null; st.path = []; } }
        else if (speedXZ > 3.4 && d < HEAR_RUN * (S.df.id === 'nightmare' ? 1.3 : 1)) { st.mode = 'investigate'; st.goalCell = pc; st.path = []; b.repath = 0; }
        let goal, gx, gz, speed = WALK * mul;
        if (st.mode === 'chase') {
            const tgt = seesMe || !b.last ? [p.x, p.z] : b.last; gx = tgt[0]; gz = tgt[1]; goal = cellOf(gx, gz); speed = CHASE * mul;
            if (seesMe && d < 3.5) { goal = pc; gx = p.x; gz = p.z; }
        } else if (st.mode === 'investigate') {
            goal = st.goalCell; gx = cx(goal[0]); gz = cz(goal[1]); speed = INVESTIGATE * mul;
            if (Math.hypot(gx - st.x, gz - st.z) < 1.4) { st.mode = 'patrol'; st.goalCell = null; st.path = []; }
        } else {
            if (!st.goalCell || (Math.hypot(cx(st.goalCell[0]) - st.x, cz(st.goalCell[1]) - st.z) < 1.4)) st.goalCell = [(Math.random() * N) | 0, (Math.random() * N) | 0];
            goal = st.goalCell; gx = cx(goal[0]); gz = cz(goal[1]);
        }
        const wp = waypoint(b, goal, gx, gz, dt);
        stepBot(st, dt, wp[0], wp[1], p.y - 0.35, speed, false);
        b.stepT -= dt; if (b.stepT <= 0 && d < 24) { b.stepT = st.mode === 'chase' ? 0.32 : 0.7; SFX.step(0.5, { x: st.x, y: 0.1, z: st.z }); }
        if (d < CATCH_DIST && Math.abs(p.y - (st.y + 1.0)) < 1.5) { caught(); return; }
        if (d < 16) SFX.heartbeat(Math.max(0, 1 - d / 16) * 0.9);
    }
    S.seen = seenBy;
}
function animate(t) {
    S.bots.forEach((b) => { const st = b.st; b.m.group.position.set(st.x, st.y + (st.ground ? Math.abs(Math.sin(t * 6)) * 0.04 : 0), st.z); b.m.group.rotation.y = st.dir; });
    S.gateLamp.intensity = S.keys === KEYS ? 10 : 8 + Math.sin(t * 6) * 3;
}
function fmt(s) { s = Math.max(0, Math.floor(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); }
function drawHud() {
    const x = S.hud.ctx; panelBg(S.hud, 'rgba(14,8,6,0.72)');
    x.textBaseline = 'middle'; x.textAlign = 'left';
    x.font = 'bold 78px "Courier New", monospace'; x.fillStyle = '#ffe0c8'; x.fillText(fmt(S.runT), 30, 74);
    if (S.df.id !== 'normal') { x.font = 'bold 22px "Courier New", monospace'; x.fillStyle = S.df.color; x.fillText(S.df.name.toUpperCase(), 330, 18); }
    x.font = 'bold 36px "Courier New", monospace'; x.fillStyle = S.keys === KEYS ? '#7fff90' : '#ff9a60'; x.fillText('Keys ' + S.keys + '/' + KEYS, 330, 52);
    x.font = 'bold 26px "Courier New", monospace';
    let msg = 'Walk. Mind the bones. Listen.', col = '#e0c8b8';
    if (S.keys === KEYS) { msg = 'RUN to the EXIT gate!'; col = '#7fff90'; }
    else if (S.seen > 0) { msg = 'HE SEES YOU! Break the line of sight!'; col = '#ff4a2a'; }
    x.fillStyle = col; x.fillText(msg, 330, 108);
    S.hud.update();
}
export function dispose() {
    if (S) { S.ev.dispose(); S.ghost.dispose(); S.hud.dispose(); S.intro.dispose(); S.scare.dispose(); }
    S = null;
}
