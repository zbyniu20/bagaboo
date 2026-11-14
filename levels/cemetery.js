// ==========================================
// POZIOM 7: THE CEMETERY (cmentarz, skradanie)
// Mglisty cmentarz w nocy. Zbierz 5 zielonych relikwii, a brama na końcu się otworzy. Po alejkach chodzi Grabarz z lampą (na Nightmare dwóch).
// Widzi przed sobą (do 14 m) i tylko gdy nic go nie zasłania, a biegnącego słyszy z 7 m. Chowaj się w kryptach i za żywopłotami.
// Układ jest stały (działa duch). Po każdej relikwii zapisuje się punkt kontrolny (Easy i Normal).
// ==========================================
import { THREE, L, tex, camera, addCrispBlock } from '../core/engine.js';
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
import { ARRIVAL_FROM_CEMETERY } from './levels.js';
import { buildDoor, cameraPanel, panelBg, drawInstructions, createJumpscare, introSeen } from '../core/levelkit.js';

const X = 24, Z0 = 4, Z1 = -62;                                       // cmentarz 48 x 66 m
const AISLES_Z = [-4, -12, -20, -28, -36, -44, -52], AISLES_X = [-21, 0, 21];   // alejki (poziome i pionowe), tędy patrolują grabarze
const ROWS_Z = [-8, -16, -24, -32, -40, -48, -56];                    // rzędy nagrobków (między alejkami)
const CRYPTS = [[-10, -16, 1], [10, -16, 1], [-10, -32, -1], [10, -32, 1], [-10, -48, 1], [10, -48, -1]];   // [x, z, strona otwarta: +1 = w stronę +z]
const RELICS = [[-13, -12], [14, -20], [-12, -36], [13, -44], [-14, -52]];
const GATE_Z = -57.2, EXIT_Z = Z1 + 0.03;
const SEE_DIST = 14, HEAR_DIST = 7, LOSE_TIME = 6, CATCH_DIST = 1.0;
const WALK = 2.3, INVESTIGATE = 3.0, CHASE = 4.4;
const REWARD_FIRST = 2400, REWARD_REPEAT = 240, INTRO_TIME = 10;
export const info = { id: 'cemetery', name: 'The Cemetery', spawn: [0, 1.0, 2.0] };
let S = null;
const _q = new THREE.Vector3();

export function build() {
    L.spawn = info.spawn.slice();
    L.bounds = { minX: -X + 0.4, maxX: X - 0.4, minZ: Z1 + 0.4, maxZ: Z0 - 0.4, maxY: 9 };
    const df = diffOf('cemetery');
    S = { df: df, ghost: createGhost('cemetery'), ev: createEvents('cemetery'), clock: 0, runT: 0, introT: INTRO_TIME, phase: 'intro', relics: 0, got: [false, false, false, false, false], cp: -1, bots: [], caughtT: -1, leaving: false, hudT: 0, seen: 0, carried: false };
    buildYard();
    buildCrypts();
    buildDecor();
    buildRelics();
    buildGate();
    buildDiggers();
    buildDoor({ x: 0, z: Z0 - 0.03, rotY: Math.PI, label: 'LEVELS', color: '#bfe8ff', wood: 0x4a5a52, portal: { target: 'levels', spawn: ARRIVAL_FROM_CEMETERY, onEnter: () => toast('Back to the levels') } });
    S.hud = cameraPanel(1024, 200, 0.42, 0.082, 0.2, -0.75, 990);
    S.intro = cameraPanel(1280, 820, 1.0, 0.64, -0.04, -1.05, 995); S.intro.last = -1;
    S.scare = createJumpscare({ seed: 7171 });
    if (df.id !== 'normal') toast('Difficulty: ' + df.name + (df.checkpoints ? '' : ' (no checkpoints, 2 gravediggers)'), df.color);
}

// ---------- BUDOWA ----------
function buildYard() {
    addCrispBlock(0, -0.5, (Z0 + Z1) / 2, X * 2 + 2, 1, Z0 - Z1 + 2, 0x3a4a3a, 0x0a100a, tex.floor, { rough: tex.floorRough });
    const stone = 0x6a7270;
    for (const s of [-1, 1]) addCrispBlock(s * (X + 0.3), 1.6, (Z0 + Z1) / 2, 0.6, 3.2, Z0 - Z1 + 1, stone, 0x101414, tex.wall);
    addCrispBlock(0, 1.6, Z0 + 0.3, X * 2 + 1, 3.2, 0.6, stone, 0x101414, tex.wall);
    addCrispBlock(0, 1.6, Z1 - 0.3, X * 2 + 1, 3.2, 0.6, stone, 0x101414, tex.wall);
    // Zagroda przy wyjściu: dwie ściany boczne, brama zamyka ją od strony cmentarza
    for (const s of [-1, 1]) addCrispBlock(s * 3.7, 1.6, (GATE_Z + Z1) / 2, 0.4, 3.2, GATE_Z - Z1, stone, 0x101414, tex.wall);
    // Księżyc: chłodne światło z góry i kilka latarni przy alejkach
    const moon = new THREE.PointLight(0x8aa0d0, 120, 60, 1.2); moon.position.set(0, 22, -30); L.root.add(moon);
    for (const [x, z] of [[-21, -4], [21, -20], [-21, -36], [21, -52], [0, -60]]) {
        const l = new THREE.PointLight(0xffc880, 22, 16, 1.6); l.position.set(x, 3.2, z); L.root.add(l);
        const post = addCrispBlock(x, 1.6, z, 0.2, 3.2, 0.2, 0x2a2a2e, 0x101012); void post;
        const b = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffd8a0 })); b.position.set(x, 3.3, z); L.root.add(b);
    }
}
// Krypty: trzy ściany i dach, otwarte od strony alejki
function buildCrypts() {
    for (const [cx, cz, open] of CRYPTS) {
        const c = 0x8a9290, e = 0x181c1c, w = 3.8, h = 2.8, t = 0.4;
        addCrispBlock(cx, h / 2, cz - open * (w / 2 - t / 2), w, h, t, c, e, tex.wall);                          // tylna ściana (po stronie przeciwnej do otwarcia)
        for (const s of [-1, 1]) addCrispBlock(cx + s * (w / 2 - t / 2), h / 2, cz, t, h, w, c, e, tex.wall);     // ściany boczne
        addCrispBlock(cx, h + 0.2, cz, w + 0.6, 0.4, w + 0.6, 0x5a6260, e, tex.wall);                         // dach
        const l = new THREE.PointLight(0x70ffb0, 4, 5, 2); l.position.set(cx, 1.2, cz); L.root.add(l);         // słaby zielony blask w środku
    }
}
// Nagrobki w rzędach (z lukami przy kryptach i w alejkach pionowych), żywopłoty i martwe drzewa
function buildDecor() {
    const R = T.mkRng(7070), cols = [0x7a8280, 0x6a7270, 0x8a9290];
    for (const z of ROWS_Z) {
        for (let x = -X + 2.5; x < X - 1.5; x += 2.6 + R() * 0.8) {
            if (AISLES_X.some(a => Math.abs(x - a) < 2.2) || (Math.abs(x) < 4.6 && z < -54)) continue;
            if (CRYPTS.some(c => Math.abs(x - c[0]) < 3.2 && Math.abs(z - c[1]) < 4)) continue;
            const h = 0.8 + R() * 0.8;
            const m = addCrispBlock(x, h / 2, z + (R() - 0.5) * 0.8, 0.8, h, 0.25, cols[(R() * 3) | 0], 0x101414, tex.wall);
            if (R() < 0.3) m.rotation.y = (R() - 0.5) * 0.3;
        }
    }
    const hedge = new THREE.MeshStandardMaterial({ color: 0x1f3a1f, roughness: 1, bumpMap: tex.plaster, bumpScale: 3 });
    for (const [x, z, w, d] of [[-16, -8, 7, 1], [16, -8, 7, 1], [16, -24, 7, 1], [-16, -24, 7, 1], [16, -40, 7, 1], [-16, -40, 7, 1], [16, -56, 7, 1], [-16, -56, 7, 1]]) {
        const b = addCrispBlock(x, 1.0, z, w, 2.0, d, 0x1f3a1f, 0x0a140a); b.material = hedge;   // żywopłot (niski mur, blokuje wzrok)
    }
    for (const [x, z] of [[-18, -2], [17, -6], [-5, -18], [6, -42], [-18, -58], [18, -30]]) {   // martwe drzewa
        const tr = addCrispBlock(x, 2.2, z, 0.5, 4.4, 0.5, 0x3a2a20, 0x100a06, tex.wood); void tr;
        for (let k = 0; k < 4; k++) { const br = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.08, 1.6, 5), new THREE.MeshStandardMaterial({ color: 0x3a2a20 })); br.position.set(x + (k % 2 ? 0.7 : -0.7), 3.6 + k * 0.15, z + (k > 1 ? 0.5 : -0.5)); br.rotation.z = (k % 2 ? -1 : 1) * 0.9; L.root.add(br); }
    }
    // Mgła przy ziemi
    const n = 220, pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { pos[i * 3] = (R() * 2 - 1) * X; pos[i * 3 + 1] = 0.2 + R() * 1.2; pos[i * 3 + 2] = Z0 - R() * (Z0 - Z1); }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const fog = new THREE.Points(geo, new THREE.PointsMaterial({ size: 3.2, map: tex.dot, color: 0x8a9aa0, transparent: true, opacity: 0.12, depthWrite: false })); fog.frustumCulled = false; L.root.add(fog);
}
function buildRelics() {
    S.relicMesh = RELICS.map((p, i) => {
        const g = new THREE.Group(); g.position.set(p[0], 1.0, p[1]);
        const skull = new THREE.Mesh(new THREE.SphereGeometry(0.16, 14, 10), new THREE.MeshStandardMaterial({ color: 0xc8ffd8, emissive: 0x30ff80, emissiveIntensity: 1.4 })); skull.scale.y = 1.15; g.add(skull);
        const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex.dot, color: 0x50ff90, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.8 })); glow.scale.set(1.4, 1.4, 1); g.add(glow);
        const l = new THREE.PointLight(0x50ff90, 14, 9, 1.8); g.add(l); L.root.add(g);
        void i; return g;
    });
}
function buildGate() {
    S.gate = addCrispBlock(0, 1.6, GATE_Z, 7.4, 3.2, 0.3, 0x2a2a30, 0xff3030);
    S.gateOb = L.obstacles[L.obstacles.length - 1];
    S.gateLamp = new THREE.PointLight(0xff3030, 16, 10, 1.6); S.gateLamp.position.set(0, 2.6, GATE_Z + 1.5); L.root.add(S.gateLamp);
    buildDoor({ x: 0, z: EXIT_Z, rotY: 0, label: 'EXIT', color: '#70ff90', glow: 0x60ff90, wood: 0x2a3a2a, light: true, portal: { target: 'levels', spawn: ARRIVAL_FROM_CEMETERY, onEnter: finish } });
}
function buildDiggers() {
    const count = S.df.id === 'nightmare' ? 2 : 1;
    for (let i = 0; i < count; i++) {
        const m = buildMannequin(T.mkRng(1200 + i)); m.group.scale.setScalar(1.25); L.root.add(m.group);
        m.group.traverse(o => { if (o.isMesh && o.material && o.material.map) o.material = new THREE.MeshStandardMaterial({ color: 0x2a2420, roughness: 0.9 }); });
        for (const sx of [-1, 1]) { const e = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex.dot, color: 0xffb030, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); e.scale.set(0.09, 0.09, 1); e.position.set(sx * 0.04, 0.152, 0.11); m.head.add(e); }
        const lamp = new THREE.PointLight(0xffb050, 26, 14, 1.6); lamp.position.set(0.4, 1.3, 0.3); m.group.add(lamp);
        const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex.dot, color: 0xffc070, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.9 })); glow.scale.set(0.8, 0.8, 1); glow.position.set(0.4, 1.3, 0.3); m.group.add(glow);
        const start = i ? [14, -50] : [-14, -26];
        const st = createBot(start[0], start[1]); st.mode = 'patrol'; st.wi = 0; st.wj = 0; st.goal = null;
        m.group.position.set(start[0], 0, start[1]);
        S.bots.push({ m: m, st: st, lostT: 0, last: null });
    }
}

// ---------- ZDARZENIA ----------
function finish() {
    if (S.leaving) return; S.leaving = true;
    toast('You escaped the cemetery!', '#7fc47f');
    levelReward('cemetery', REWARD_FIRST, REWARD_REPEAT, 'escaping the cemetery');
    S.ghost.finish(recordTime('cemetery', S.runT) && !S.carried, S.runT);
}
function caught() {
    if (S.caughtT >= 0) return;
    S.caughtT = 0; S.scare.trigger(); releaseAll(); buzz('both', 1, 400);
    toast('The gravedigger caught you...', '#e0533f');
}
function takeRelic(i) {
    S.got[i] = true; S.relics++; S.relicMesh[i].visible = false; SFX.fuse(); buzz('both', 0.7, 200);
    toast('Relic ' + S.relics + '/5', '#7fff90');
    if (S.df.checkpoints) { S.cp = i; toast('Checkpoint saved', '#7fc47f'); }
    if (S.relics === 5) {
        const k = L.obstacles.indexOf(S.gateOb); if (k >= 0) L.obstacles.splice(k, 1);
        if (S.gateOb.body) S.gateOb.body.position.y = -50;
        S.gate.visible = false; S.gateLamp.color.setHex(0x30ff60); SFX.bell && SFX.bell();
        toast('The gate is open! Run to the EXIT!', '#ffd27a');
    }
}
const INTRO = [
    'A gravedigger walks the aisles with a lantern. Watch the glow: it shows where he is.',
    'He sees only in front of him, up to 14 m, and not through walls, hedges or crypts.',
    'Running is loud: he hears you from 7 m. Walk to stay quiet, hide in crypts when he comes.',
    'Collect 5 green relics. The gate at the back opens when you have all of them.',
    'Each relic saves a checkpoint (not on Nightmare).'
];

// ---------- CO KLATKĘ ----------
export function update(dt, t, ctx) {
    if (!S || S.leaving) return;
    S.clock += dt; const p = ctx.body.position;
    S.ev.update(dt, S.phase === 'play' && S.caughtT < 0);
    S.scare.update(dt);
    if (S.introSkip === undefined) { S.introSkip = introSeen('cemetery'); if (S.introSkip) S.introT = Math.min(S.introT, 3); }
    if (S.introT > 0) {
        S.introT -= dt;
        const sec = Math.max(0, Math.ceil(S.introT));
        if (sec !== S.intro.last) { S.intro.last = sec; drawInstructions(S.intro, 'The Cemetery', INTRO, 'The gravedigger wakes in ' + sec + ' s', { bg: 'rgba(8,14,12,0.9)', border: '#50ff90', title: '#d8ffe4', text: '#dcf0e4', footer: '#ffb030', size: 28 }); }
        S.intro.mesh.visible = S.introT > 0 && !S.introSkip;
        if (S.introT <= 0) { S.phase = 'play'; toast('Collect 5 relics. Hide from the lantern!', '#7fff90'); }
    }
    if (S.phase === 'play' && S.caughtT < 0) S.runT += dt;
    S.ghost.tick(dt, p, S.phase === 'play' && S.caughtT < 0);
    S.relicMesh.forEach((g, i) => { if (!S.got[i]) { g.rotation.y = t * 1.4; g.position.y = 1.0 + Math.sin(t * 2 + i) * 0.1; if (Math.hypot(p.x - RELICS[i][0], p.z - RELICS[i][1]) < 1.0 && Math.abs(p.y - 1.0) < 1.5) takeRelic(i); } });
    if (S.caughtT >= 0) {
        S.caughtT += dt;
        if (S.caughtT > 1.6) {
            if (S.df.checkpoints && S.cp >= 0) { const r = RELICS[S.cp]; setPlayerPosition(r[0], 1.0, r[1] + 1.2); S.bots.forEach((b, i) => { b.st.x = i ? 14 : -14; b.st.z = i ? -50 : -26; b.st.mode = 'patrol'; b.st.goal = null; b.lostT = 0; }); S.caughtT = -1; S.carried = true; toast('Back to the last relic. The gravedigger lost you.', '#7fc47f'); }
            else { S.leaving = true; ctx.goto('cemetery'); return; }
        }
        animate(t); return;
    }
    if (S.phase === 'play') think(dt, ctx);
    animate(t);
    S.hudT -= dt; if (S.hudT <= 0) { S.hudT = 0.15; drawHud(); }
}
function sees(b, p) {
    const st = b.st, dx = p.x - st.x, dz = p.z - st.z, d = Math.hypot(dx, dz), range = SEE_DIST * (S.df.id === 'nightmare' ? 1.25 : (S.df.id === 'easy' ? 0.8 : 1));
    if (d > range) return false;
    if (st.mode !== 'chase' && d > 2 && (dx * Math.sin(st.dir) + dz * Math.cos(st.dir)) / d < 0.35) return false;   // widzi tylko przed sobą (stożek ok. 140°)
    const steps = Math.ceil(d / 0.4);
    for (let i = 1; i < steps; i++) {
        const k = i / steps; _q.set(st.x + dx * k, st.y + 1.6 + (p.y - st.y - 1.6) * k, st.z + dz * k);
        for (const o of L.obstacles) { if (o === S.gateOb) continue; if (o.box3.containsPoint(_q)) return false; }
    }
    return true;
}
const nearestAisle = (v, list) => list.reduce((a, b) => Math.abs(b - v) < Math.abs(a - v) ? b : a);
function think(dt, ctx) {
    const p = ctx.body.position, speedXZ = Math.hypot(ctx.body.velocity.x, ctx.body.velocity.z), mul = S.df.speed;
    let seenBy = 0;
    for (const b of S.bots) {
        const st = b.st, seesMe = sees(b, p), d = Math.hypot(p.x - st.x, p.z - st.z);
        const prev = st.mode;
        if (seesMe) { if (prev !== 'chase') { SFX.stinger({ x: st.x, y: 1.5, z: st.z }); } st.mode = 'chase'; b.lostT = 0; b.last = [p.x, p.z]; seenBy++; }
        else if (st.mode === 'chase') { b.lostT += dt; if (b.lostT > LOSE_TIME) { st.mode = 'patrol'; st.goal = null; } }
        else if (speedXZ > 3.4 && d < HEAR_DIST * (S.df.id === 'nightmare' ? 1.3 : 1)) { st.mode = 'investigate'; st.goal = [p.x, p.z]; }   // słyszy bieg
        let tx, tz, speed = WALK * mul;
        if (st.mode === 'chase') { const tgt = seesMe || !b.last ? [p.x, p.z] : b.last; tx = tgt[0]; tz = tgt[1]; speed = CHASE * mul; }
        else if (st.mode === 'investigate') { tx = st.goal[0]; tz = st.goal[1]; speed = INVESTIGATE * mul; if (Math.hypot(tx - st.x, tz - st.z) < 1.5) { st.mode = 'patrol'; st.goal = null; } }
        else {
            // Patrol po alejkach: następny punkt na skrzyżowaniu sąsiedniej alejki
            if (!st.goal || Math.hypot(st.goal[0] - st.x, st.goal[1] - st.z) < 1.3) {
                const ax = nearestAisle(st.x, AISLES_X), az = nearestAisle(st.z, AISLES_Z);
                const opts = [[ax + 21, az], [ax - 21, az], [ax, az + 8], [ax, az - 8]].filter(q => AISLES_X.includes(q[0]) && AISLES_Z.includes(q[1]));
                st.goal = opts[(Math.random() * opts.length) | 0];
            }
            tx = st.goal[0]; tz = st.goal[1];
        }
        stepBot(st, dt, tx, tz, p.y - 0.35, speed, st.mode === 'chase');
        if (d < CATCH_DIST && Math.abs(p.y - (st.y + 1.0)) < 1.5) { caught(); return; }
        if (d < 14) SFX.heartbeat(Math.max(0, 1 - d / 14) * 0.8);
    }
    S.seen = seenBy;
}
function animate(t) {
    S.bots.forEach((b) => { const st = b.st; b.m.group.position.set(st.x, st.y + (st.ground ? Math.abs(Math.sin(t * 7)) * 0.04 : 0), st.z); b.m.group.rotation.y = st.dir; });
    S.gateLamp.intensity = S.relics === 5 ? 14 : 12 + Math.sin(t * 6) * 4;
}
function fmt(s) { s = Math.max(0, Math.floor(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); }
function drawHud() {
    const x = S.hud.ctx; panelBg(S.hud, 'rgba(8,14,12,0.72)');
    x.textBaseline = 'middle'; x.textAlign = 'left';
    x.font = 'bold 78px "Courier New", monospace'; x.fillStyle = '#d8ffe4'; x.fillText(fmt(S.runT), 30, 74);
    if (S.df.id !== 'normal') { x.font = 'bold 22px "Courier New", monospace'; x.fillStyle = S.df.color; x.fillText(S.df.name.toUpperCase(), 330, 18); }
    x.font = 'bold 36px "Courier New", monospace'; x.fillStyle = S.relics === 5 ? '#7fff90' : '#7fffb0'; x.fillText('Relics ' + S.relics + '/5', 330, 52);
    x.font = 'bold 26px "Courier New", monospace';
    let msg = 'Stay quiet. Follow the green glow.', col = '#c8e4d8';
    if (S.relics === 5) { msg = 'RUN to the EXIT gate!'; col = '#7fff90'; }
    else if (S.seen > 0) { msg = 'HE SEES YOU! Break the line of sight!'; col = '#ff4a2a'; }
    x.fillStyle = col; x.fillText(msg, 330, 108);
    S.hud.update();
}
export function dispose() {
    if (S) { S.ev.dispose(); S.ghost.dispose(); S.hud.dispose(); S.intro.dispose(); S.scare.dispose(); }
    S = null;
}
