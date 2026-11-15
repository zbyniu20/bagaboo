// ==========================================
// POZIOM 9: THE NURSERY (pokój dziecięcy, horror z pozytywką)
// Opuszczony dom pełen zabawek. Nosisz pozytywkę: dopóki gra, Lalka stoi bez ruchu. Gdy muzyka cichnie (poniżej 30%), zaczyna się skradać,
// a gdy zamilknie, rzuca się za tobą po całym domu i zna twoją pozycję. Nakręcaj pozytywkę przy kluczykach w pokojach (każdy po użyciu
// odpoczywa 20 s, więc trzeba iść dalej). Znajdź 4 pluszowe misie-klucze w ślepych zaułkach, a brama przy wyjściu się otworzy.
// Każdy miś mruczy i zjada część muzyki. Układ jest stały (działa duch). Po każdym misiu zapisuje się punkt kontrolny (Easy i Normal).
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
import { createGridMaze } from '../core/gridmaze.js';
import { ARRIVAL_FROM_NURSERY } from './levels.js';
import { buildDoor, cameraPanel, panelBg, drawInstructions, createJumpscare, introSeen } from '../core/levelkit.js';

const N = 7, P = 6.5, WT = 0.6, H = 3.2, X = N * P / 2;               // siatka 7 x 7 pokoi po 6,5 m (45,5 x 45,5 m)
const KEYS = 4, CATCH_DIST = 0.95, CREEP = 1.3, CHASE = 4.4, FREEZE_AT = 0.3;   // FREEZE_AT: poniżej tej części muzyki Lalka zaczyna się skradać
const MUSIC = { easy: 70, normal: 45, nightmare: 32 }, COOLDOWN = { easy: 14, normal: 20, nightmare: 28 }, TEDDY_BITE = 0.2;   // sekundy muzyki, odpoczynek stacji, część muzyki zjadana przez misia
const REWARD_FIRST = 3200, REWARD_REPEAT = 320, INTRO_TIME = 10;
export const info = { id: 'nursery', name: 'The Nursery', spawn: [-X + P / 2, 1.0, -1.6] };
let S = null;

const GM = createGridMaze({ N: N, P: P, WT: WT, H: H, seed: 6060, loops: 7 });   // układ i pathfinding: core/gridmaze.js
const { cx, cz, cellOf, bfs } = GM;
const START = [0, 0], EXIT_CELL = [N - 1, N - 1];
const EXIT_Z = -N * P + WT / 2 + 0.03, GATE_Z = -N * P + P * 0.55;
const KEY_CELLS = GM.pickDeadEnds(KEYS, START, [START, EXIT_CELL], 4);
const KEY_POS = KEY_CELLS.map(c => [cx(c[0]), cz(c[1])]);
const STATION_CELLS = [[2, 1], [5, 2], [1, 4], [4, 5], [6, 3]];                  // kluczyki do nakręcania pozytywki (w rogu pokoju)
const STATION_POS = STATION_CELLS.map(c => [cx(c[0]) + 1.7, cz(c[1]) + 1.7]);
const DOLL_START = [[3, 3], [5, 1]];

export function build() {
    L.spawn = info.spawn.slice();
    L.bounds = { minX: -X + 0.5, maxX: X - 0.5, minZ: -N * P + 0.5, maxZ: -0.5, maxY: H - 0.3 };
    const df = diffOf('nursery'), m0 = MUSIC[df.id] || MUSIC.normal;
    S = { df: df, m0: m0, music: m0, cool: COOLDOWN[df.id] || 20, ghost: createGhost('nursery'), ev: createEvents('nursery', { skip: ['fog'] }), clock: 0, runT: 0, introT: INTRO_TIME, phase: 'intro', keys: 0, got: KEY_POS.map(() => false), cp: -1, bots: [], caughtT: -1, leaving: false, hudT: 0, carried: false, noteT: 0, noteI: 0, wasZero: false, stationT: STATION_POS.map(() => 0), awake: false };
    GM.buildWalls({ wall: 0x9a8478, edge: 0x1a1008, floor: 0x6a4a3a, ceil: 0x3a2a24 });
    buildDecor();
    buildKeys();
    buildStations();
    buildGate();
    buildDolls();
    buildDoor({ x: cx(0), z: -WT / 2 - 0.03, rotY: Math.PI, label: 'LEVELS', color: '#ffd8c8', wood: 0x5a4034, portal: { target: 'levels', spawn: ARRIVAL_FROM_NURSERY, onEnter: () => toast('Back to the levels') } });
    S.hud = cameraPanel(1024, 200, 0.42, 0.082, 0.2, -0.75, 990);
    S.intro = cameraPanel(1280, 820, 1.0, 0.64, -0.04, -1.05, 995); S.intro.last = -1;
    S.scare = createJumpscare({ seed: 9393 });
    if (df.id !== 'normal') toast('Difficulty: ' + df.name + ' (music lasts ' + m0 + ' s' + (df.checkpoints ? '' : ', no checkpoints, 2 dolls') + ')', df.color);
}

// ---------- BUDOWA ----------
// Zabawki (klocki w jednym InstancedMesh), łóżeczka i ciepłe lampy
function buildDecor() {
    const R = T.mkRng(5151), cols = [0xe04a3a, 0x3a7ae0, 0xf0c030, 0x40b060, 0xd060c0];
    const blocks = [];
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
        const n = 1 + ((R() * 3) | 0);
        for (let k = 0; k < n; k++) blocks.push([cx(i) + (R() - 0.5) * (P - 2), cz(j) + (R() - 0.5) * (P - 2), 0.18 + R() * 0.12, cols[(R() * cols.length) | 0], R() * 3]);
    }
    const geo = new THREE.BoxGeometry(1, 1, 1), mat = new THREE.MeshStandardMaterial({ roughness: 0.6 }), im = new THREE.InstancedMesh(geo, mat, blocks.length);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), p = new THREE.Vector3(), s = new THREE.Vector3(), c = new THREE.Color();
    blocks.forEach((b, i) => { e.set(0, b[4], 0); q.setFromEuler(e); p.set(b[0], b[2] / 2, b[1]); s.set(b[2], b[2], b[2]); m4.compose(p, q, s); im.setMatrixAt(i, m4); im.setColorAt(i, c.setHex(b[3])); });
    im.frustumCulled = false; L.root.add(im);
    // Łóżeczka (kolizyjne): w kilku pokojach, pod ścianą
    for (const [i, j] of [[1, 0], [3, 1], [5, 3], [2, 3], [0, 5], [4, 6]]) {
        const x = cx(i) - P / 2 + WT / 2 + 1.3, z = cz(j) - 1.2;
        addCrispBlock(x, 0.45, z, 1.2, 0.9, 2.2, 0xb89878, 0x1a1008, tex.wood);
    }
    // Lampy: ciepłe, trochę migoczące (mało świateł, reszta tonie w półmroku)
    S.lamps = [];
    for (const [i, j] of [[0, 0], [3, 2], [5, 5], [1, 5]]) {
        const l = new THREE.PointLight(0xffa860, 11, 12, 1.8), x = cx(i), z = cz(j); l.position.set(x, 2.5, z); L.root.add(l);
        const f = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex.dot, color: 0xffb870, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); f.scale.set(0.5, 0.5, 1); f.position.set(x, 2.5, z); L.root.add(f);
        S.lamps.push({ l: l, ph: Math.random() * 9 });
    }
}
// Miś-klucz: brązowy pluszak z ciepłym blaskiem
function buildKeys() {
    S.keyMesh = KEY_POS.map((p) => {
        const g = new THREE.Group(); g.position.set(p[0], 0.9, p[1]);
        const fur = new THREE.MeshStandardMaterial({ color: 0xb07840, emissive: 0x602000, emissiveIntensity: 0.9, roughness: 0.9 });
        const body = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 9), fur); body.position.y = -0.05; g.add(body);
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.14, 12, 9), fur); head.position.y = 0.2; g.add(head);
        for (const sx of [-1, 1]) { const ear = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 6), fur); ear.position.set(sx * 0.11, 0.3, 0); g.add(ear); }
        const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex.dot, color: 0xffa050, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.75 })); glow.scale.set(1.2, 1.2, 1); g.add(glow);
        const l = new THREE.PointLight(0xffa050, 8, 8, 1.8); g.add(l); L.root.add(g);
        return g;
    });
}
// Kluczyki do nakręcania: cokół ze złotym kluczykiem; bez światła (budżet świateł), po użyciu szarzeje
function buildStations() {
    S.stationMesh = STATION_POS.map((p) => {
        addCrispBlock(p[0], 0.45, p[1], 0.5, 0.9, 0.5, 0x6a5040, 0x1a1008, tex.wood);
        const g = new THREE.Group(); g.position.set(p[0], 1.25, p[1]);
        const gold = new THREE.MeshStandardMaterial({ color: 0xe8c040, emissive: 0x806010, emissiveIntensity: 0.9, metalness: 0.7, roughness: 0.4 });
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.035, 8, 16), gold); ring.position.y = 0.16; g.add(ring);
        const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.34, 8), gold); g.add(stem);
        const teeth = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.05, 0.03), gold); teeth.position.set(0.07, -0.14, 0); g.add(teeth);
        const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex.dot, color: 0xffd060, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.7 })); glow.scale.set(1.0, 1.0, 1); g.add(glow);
        L.root.add(g);
        return { g: g, gold: gold, glow: glow };
    });
}
function buildGate() {
    const gx = cx(EXIT_CELL[0]);
    S.gate = addCrispBlock(gx, H / 2, GATE_Z, P - WT, H, 0.3, 0x3a2a30, 0xff3030);
    S.gateOb = L.obstacles[L.obstacles.length - 1];
    S.gateLamp = new THREE.PointLight(0xff3030, 9, 9, 1.6); S.gateLamp.position.set(gx, 2.4, GATE_Z + 1.4); L.root.add(S.gateLamp);
    buildDoor({ x: gx, z: EXIT_Z, rotY: 0, label: 'EXIT', color: '#ffb890', glow: 0xff9060, wood: 0x3a2820, light: true, portal: { target: 'levels', spawn: ARRIVAL_FROM_NURSERY, onEnter: finish } });
}
// Lalka: mała, porcelanowa, czerwone oczy świecą tylko, gdy jest obudzona
function buildDolls() {
    const count = S.df.id === 'nightmare' ? 2 : 1;
    for (let i = 0; i < count; i++) {
        const m = buildMannequin(T.mkRng(2300 + i)); m.group.scale.set(0.95, 0.85, 0.95); L.root.add(m.group);
        m.group.traverse(o => { if (o.isMesh && o.material) o.material = new THREE.MeshStandardMaterial({ color: 0xe6d8cc, roughness: 0.35 }); });
        const eyes = [];
        for (const sx of [-1, 1]) { const e = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex.dot, color: 0xff1808, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0 })); e.scale.set(0.16, 0.16, 1); e.position.set(sx * 0.04, 0.152, 0.11); m.head.add(e); eyes.push(e); }
        const start = DOLL_START[i], st = createBot(cx(start[0]), cz(start[1])); st.mode = 'asleep'; st.path = [];
        m.group.position.set(st.x, 0, st.z);
        S.bots.push({ m: m, st: st, eyes: eyes, repath: 0, startCell: start, stepT: 0 });
    }
}

// ---------- ZDARZENIA ----------
function finish() {
    if (S.leaving) return; S.leaving = true;
    toast('You escaped the nursery!', '#ffb070');
    levelReward('nursery', REWARD_FIRST, REWARD_REPEAT, 'escaping the nursery');
    S.ghost.finish(recordTime('nursery', S.runT) && !S.carried, S.runT);
}
function caught() {
    if (S.caughtT >= 0) return;
    S.caughtT = 0; S.scare.trigger(); releaseAll(); buzz('both', 1, 400);
    toast('The doll caught you...', '#e0533f');
}
function takeKey(i) {
    S.got[i] = true; S.keys++; S.keyMesh[i].visible = false; SFX.whisper(S.keyMesh[i].position); buzz('both', 0.8, 250);
    S.music = Math.max(0, S.music - S.m0 * TEDDY_BITE);   // miś mruczy i zjada część muzyki
    toast('Teddy ' + S.keys + '/' + KEYS + '. It hummed over the music box!', '#ffa860');
    if (S.df.checkpoints) { S.cp = i; toast('Checkpoint saved', '#7fc47f'); }
    if (S.keys === KEYS) {
        const k = L.obstacles.indexOf(S.gateOb); if (k >= 0) L.obstacles.splice(k, 1);
        if (S.gateOb.body) S.gateOb.body.position.y = -50;
        S.gate.visible = false; S.gateLamp.color.setHex(0x30ff60); SFX.bell && SFX.bell();
        toast('The gate is open! Run to the EXIT!', '#ffd27a');
    }
}
function windUp(i) {
    S.stationT[i] = S.cool; S.music = S.m0; SFX.fuse(); buzz('both', 0.6, 160);
    toast('Music box wound up', '#ffd27a');
}
const INTRO = [
    'You carry a music box. While it plays, the Doll stands frozen. Watch the bar on your HUD.',
    'Below 30% she starts creeping. When the music stops she runs and she knows where you are.',
    'Wind it up at the golden keys on pedestals. Each key then rests for a while, so keep moving.',
    'Take 4 teddy bears from the dead ends. Each one hums and eats part of the music.',
    'The gate by the EXIT opens with all 4. Each teddy saves a checkpoint (not on Nightmare).'
];

// ---------- CO KLATKĘ ----------
export function update(dt, t, ctx) {
    if (!S || S.leaving) return;
    S.clock += dt; const p = ctx.body.position;
    S.ev.update(dt, S.phase === 'play' && S.caughtT < 0);
    S.scare.update(dt);
    if (S.introSkip === undefined) { S.introSkip = introSeen('nursery'); if (S.introSkip) S.introT = Math.min(S.introT, 3); }
    if (S.introT > 0) {
        S.introT -= dt;
        const sec = Math.max(0, Math.ceil(S.introT));
        if (sec !== S.intro.last) { S.intro.last = sec; drawInstructions(S.intro, 'The Nursery', INTRO, 'The music box starts in ' + sec + ' s', { bg: 'rgba(24,12,8,0.92)', border: '#ffa860', title: '#ffe8d8', text: '#f4e0d0', footer: '#ff6040', size: 28 }); }
        S.intro.mesh.visible = S.introT > 0 && !S.introSkip;
        if (S.introT <= 0) { S.phase = 'play'; toast('Keep the music playing. Find 4 teddies!', '#ffa860'); }
    }
    if (S.phase === 'play' && S.caughtT < 0) S.runT += dt;
    S.ghost.tick(dt, p, S.phase === 'play' && S.caughtT < 0);
    S.keyMesh.forEach((g, i) => { if (!S.got[i]) { g.rotation.y = t * 1.2; g.position.y = 0.9 + Math.sin(t * 2 + i) * 0.08; if (Math.hypot(p.x - KEY_POS[i][0], p.z - KEY_POS[i][1]) < 1.0 && Math.abs(p.y - 1.0) < 1.5) takeKey(i); } });
    for (const l of S.lamps) l.l.intensity = 11 * (0.7 + 0.3 * Math.sin(t * 8 + l.ph) * Math.sin(t * 3.7 + l.ph));
    S.stationMesh.forEach((st, i) => {
        S.stationT[i] = Math.max(0, S.stationT[i] - dt); const ready = S.stationT[i] <= 0;
        st.g.rotation.y = t * 1.5; st.gold.emissiveIntensity = ready ? 0.9 : 0.05; st.glow.material.opacity = ready ? 0.7 : 0.08;
        if (ready && S.phase === 'play' && S.caughtT < 0 && Math.hypot(p.x - STATION_POS[i][0], p.z - STATION_POS[i][1]) < 1.2 && Math.abs(p.y - 1.0) < 1.5) windUp(i);
    });
    if (S.caughtT >= 0) {
        S.caughtT += dt;
        if (S.caughtT > 1.6) {
            if (S.df.checkpoints && S.cp >= 0) { const r = KEY_POS[S.cp]; setPlayerPosition(r[0], 1.0, r[1] + 1.2); S.bots.forEach(resetBot); S.music = S.m0; S.caughtT = -1; S.carried = true; toast('Back at the last teddy. The doll fell asleep again.', '#7fc47f'); }
            else { S.leaving = true; ctx.goto('nursery'); return; }
        }
        animate(t); return;
    }
    if (S.phase === 'play') { playMusic(dt, p); think(dt, ctx); }
    animate(t);
    S.hudT -= dt; if (S.hudT <= 0) { S.hudT = 0.15; drawHud(); }
}
function resetBot(b) { const st = b.st; st.x = cx(b.startCell[0]); st.z = cz(b.startCell[1]); st.mode = 'asleep'; st.path = []; }
// Pozytywka: melodia gra, zwalnia i fałszuje, im mniej muzyki; przy zerze cisza
function playMusic(dt, p) {
    S.music = Math.max(0, S.music - dt);
    const frac = S.music / S.m0;
    if (S.music <= 0) {
        if (!S.wasZero) { S.wasZero = true; SFX.stinger({ x: p.x, y: 1.5, z: p.z }); toast('The music stopped! She is awake!', '#ff4a2a'); buzz('both', 0.9, 300); }
        return;
    }
    if (S.wasZero) { S.wasZero = false; toast('She froze again.', '#7fc47f'); }
    S.noteT -= dt;
    if (S.noteT <= 0) {
        const tune = [523, 659, 784, 659, 587, 698, 880, 698];
        S.noteT = 0.42 + (1 - frac) * 0.5;                                   // zwalnia
        SFX.beep(tune[S.noteI++ % tune.length] * (0.78 + 0.22 * frac) * (frac < FREEZE_AT && S.noteI % 3 === 0 ? 0.94 : 1), 0.16, 0.34);   // opada i fałszuje
    }
}
function waypoint(b, goalCell, gx, gz, dt) {
    const st = b.st, cur = cellOf(st.x, st.z);
    if (cur[0] === goalCell[0] && cur[1] === goalCell[1]) return [gx, gz];
    b.repath -= dt;
    if (b.repath <= 0 || !st.path.length) { st.path = bfs(cur, goalCell); b.repath = 0.4; }
    while (st.path.length && Math.hypot(cx(st.path[0][0]) - st.x, cz(st.path[0][1]) - st.z) < 0.9) st.path.shift();
    return st.path.length ? [cx(st.path[0][0]), cz(st.path[0][1])] : [gx, gz];
}
function think(dt, ctx) {
    const p = ctx.body.position, pc = cellOf(p.x, p.z), mul = S.df.speed, frac = S.music / S.m0;
    S.awake = false;
    for (const b of S.bots) {
        const st = b.st, d = Math.hypot(p.x - st.x, p.z - st.z);
        st.mode = frac > FREEZE_AT ? 'asleep' : (S.music > 0 ? 'creep' : 'chase');
        if (st.mode === 'asleep') {   // stoi i patrzy na gracza
            st.dir = Math.atan2(p.x - st.x, p.z - st.z);
            if (d < 14 && Math.random() < dt * 0.4) SFX.heartbeat(0.25);
            continue;
        }
        S.awake = true;
        const speed = (st.mode === 'chase' ? CHASE : CREEP) * mul;
        const wp = waypoint(b, pc, p.x, p.z, dt);
        stepBot(st, dt, wp[0], wp[1], p.y - 0.35, speed, false);
        b.stepT -= dt; if (b.stepT <= 0 && d < 24) { b.stepT = st.mode === 'chase' ? 0.26 : 0.6; SFX.step(0.45, { x: st.x, y: 0.1, z: st.z }); }
        if (d < CATCH_DIST && Math.abs(p.y - (st.y + 1.0)) < 1.5) { caught(); return; }
        if (d < 18) SFX.heartbeat(Math.max(0, 1 - d / 18) * (st.mode === 'chase' ? 1 : 0.6));
    }
}
function animate(t) {
    S.bots.forEach((b) => {
        const st = b.st, awake = st.mode === 'creep' || st.mode === 'chase';
        b.m.group.position.set(st.x, st.y + (awake && st.ground ? Math.abs(Math.sin(t * 8)) * 0.05 : 0), st.z); b.m.group.rotation.y = st.dir;
        for (const e of b.eyes) e.material.opacity = awake ? 0.95 : 0;
    });
    S.gateLamp.intensity = S.keys === KEYS ? 9 : 7 + Math.sin(t * 6) * 3;
}
function fmt(s) { s = Math.max(0, Math.floor(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); }
function drawHud() {
    const x = S.hud.ctx; panelBg(S.hud, 'rgba(24,12,8,0.72)');
    x.textBaseline = 'middle'; x.textAlign = 'left';
    x.font = 'bold 78px "Courier New", monospace'; x.fillStyle = '#ffe8d8'; x.fillText(fmt(S.runT), 30, 74);
    if (S.df.id !== 'normal') { x.font = 'bold 22px "Courier New", monospace'; x.fillStyle = S.df.color; x.fillText(S.df.name.toUpperCase(), 330, 18); }
    x.font = 'bold 32px "Courier New", monospace'; x.fillStyle = S.keys === KEYS ? '#7fff90' : '#ffa860'; x.fillText('Teddies ' + S.keys + '/' + KEYS, 330, 46);
    const frac = Math.max(0, Math.min(1, S.music / S.m0)), col = frac > FREEZE_AT ? '#7fe8a0' : (S.music > 0 ? '#ffb030' : '#ff3a2a');
    x.fillStyle = 'rgba(255,255,255,0.15)'; x.fillRect(330, 66, 400, 22); x.fillStyle = col; x.fillRect(330, 66, 400 * frac, 22);
    x.fillStyle = '#ffffff'; x.fillRect(330 + 400 * FREEZE_AT - 1, 62, 3, 30);
    x.font = 'bold 24px "Courier New", monospace';
    let msg = 'Music plays. She sleeps.', c = '#e8d4c4';
    if (S.keys === KEYS) { msg = 'RUN to the EXIT gate!'; c = '#7fff90'; }
    else if (S.music <= 0) { msg = 'SHE IS AWAKE! Wind the music box!'; c = '#ff4a2a'; }
    else if (frac <= FREEZE_AT) { msg = 'The music is fading! Find a golden key!'; c = '#ffb030'; }
    x.fillStyle = c; x.fillText(msg, 330, 120);
    S.hud.update();
}
export function dispose() {
    if (S) { S.ev.dispose(); S.ghost.dispose(); S.hud.dispose(); S.intro.dispose(); S.scare.dispose(); }
    S = null;
}
export const debug = () => S ? { phase: S.phase, music: S.music, m0: S.m0, keys: S.keys, awake: S.awake, caught: S.caughtT >= 0, modes: S.bots.map(b => b.st.mode), dolls: S.bots.map(b => [b.st.x, b.st.z]), keyPos: KEY_POS, stationPos: STATION_POS, stationT: S.stationT.slice() } : null;   // dla testów
