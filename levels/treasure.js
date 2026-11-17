// ==========================================
// GAME MODE: TREASURE HUNT (grupa PARTY GAMES w salonie Games)
// Ciemna hala ze skrzyniami i murkami (stały układ). W każdej rundzie 8 skarbów ląduje w losowych miejscach (ziarno od hosta).
// Detektor piszczy coraz szybciej i wyżej, gdy zbliżasz się do najbliższego skarbu. Dotknij skarbu, żeby go zabrać.
// Wygrywa gracz z największą liczbą skarbów (200 Bagabucks, remis = brak nagrody). Solo: zbierz wszystkie 8 w 150 s.
// ==========================================
import { THREE, L, tex, addCrispBlock } from '../core/engine.js';
import * as T from '../core/textures.js';
import { levelReward } from '../core/economy.js';
import { toast } from '../core/terminal.js';
import { setPlayerPosition } from '../core/player.js';
import * as N from '../core/network.js';
import * as SFX from '../core/audio.js';
import { buzz } from '../core/haptics.js';
import { participants, isAuthority, toNet, fromNet, headOf } from '../core/roundkit.js';
import { nearTarget, validIndex, TOL } from '../core/netguard.js';
import { buildDoor, cameraPanel, panelBg, drawInstructions, introSeen } from '../core/levelkit.js';
import { ARRIVAL_FROM_TREASURE } from './games.js';

const A = 20, H = 8, COUNT = 8;
const WAIT = 15, SOLO_WAIT = 4, ROUND = 150, RESULTS = 8, REWARD = 200, GRAB = 0.9;
export const info = { id: 'treasure', name: 'Treasure Hunt', spawn: [0, 1.0, 17] };
let S = null;
const BOXES = [];   // pudełka układu (do sprawdzania wolnych miejsc na skarby)

export function build() {
    L.spawn = info.spawn.slice();
    L.bounds = { minX: -A + 0.4, maxX: A - 0.4, minZ: -A + 0.4, maxZ: A - 0.4, maxY: H - 0.4 };
    S = { clock: 0, phase: 'wait', t: N.NET.mode === 'solo' ? SOLO_WAIT : WAIT, seed: 1, tre: [], taken: [], scores: {}, solo: true, winner: null, lastHostMsg: -10, netT: 0, hudT: 0, introT: 10, rewarded: false, pingT: 0, near: 99, mine: 0, startT: 0 };
    buildArena();
    buildDoor({ x: 0, z: A - 0.03, rotY: Math.PI, label: 'GAMES', color: '#d080ff', wood: 0x3a3048, portal: { target: 'games', spawn: ARRIVAL_FROM_TREASURE, onEnter: () => toast('Back to BagaBoo Games') } });
    // Skarby: 8 skrzyń ze złotym blaskiem (widoczny tylko z bliska), ustawianych na start rundy
    for (let i = 0; i < COUNT; i++) {
        const g = new THREE.Group();
        const body = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.32, 0.34), new THREE.MeshStandardMaterial({ color: 0xd4a640, metalness: 0.9, roughness: 0.25, emissive: 0x402a00, emissiveIntensity: 0.6 })); body.position.y = 0.18; g.add(body);
        const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.5, 12, 1, false, 0, Math.PI), new THREE.MeshStandardMaterial({ color: 0xb48a30, metalness: 0.9, roughness: 0.3 })); lid.rotation.z = Math.PI / 2; lid.position.y = 0.34; g.add(lid);
        const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex.dot, color: 0xffd060, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0 })); glow.scale.set(1.6, 1.6, 1); glow.position.y = 0.4; g.add(glow);
        g.visible = false; L.root.add(g); S.tre.push({ g: g, glow: glow, x: 0, z: 0 });
    }
    S.hud = cameraPanel(1024, 200, 0.42, 0.082, 0.2, -0.75, 990);
    S.intro = cameraPanel(1280, 760, 1.0, 0.594, -0.04, -1.05, 995); S.intro.last = -1;
    N.onLevelMsg(onNet);
}
function buildArena() {
    BOXES.length = 0;
    const R = T.mkRng(9090);
    addCrispBlock(0, -0.5, 0, A * 2 + 2, 1, A * 2 + 2, 0x6a6a72, 0x101014, tex.floor, { rough: tex.floorRough });
    addCrispBlock(0, H + 0.5, 0, A * 2 + 2, 1, A * 2 + 2, 0x3a3a42, 0x101014);
    for (const [x, z, w, d] of [[0, -A - 0.5, A * 2 + 2, 1], [0, A + 0.5, A * 2 + 2, 1], [-A - 0.5, 0, 1, A * 2], [A + 0.5, 0, 1, A * 2]]) addCrispBlock(x, H / 2, z, w, H, d, 0x9a9288, 0x1a1814, tex.wall);
    const fits = (x, z, w, d) => Math.abs(x) + w / 2 < A - 3 && z + d / 2 < A - 6 && z - d / 2 > -A + 2 && BOXES.every(b => Math.abs(x - b.x) > (w + b.w) / 2 + 1.0 || Math.abs(z - b.z) > (d + b.d) / 2 + 1.0);
    const add = (w, h, d, col, tries) => {
        for (let i = 0; i < tries; i++) { const x = (R() * 2 - 1) * (A - 3), z = (R() * 2 - 1) * (A - 4); if (!fits(x, z, w, d)) continue; addCrispBlock(x, h / 2, z, w, h, d, col, 0x201810, tex.wall); BOXES.push({ x: x, z: z, w: w, d: d }); return; }
    };
    for (let i = 0; i < 8; i++) { const horiz = R() < 0.5; add(horiz ? 6 : 0.8, 2.4, horiz ? 0.8 : 6, 0x6a5a48, 40); }          // wysokie murki
    for (let i = 0; i < 24; i++) add(1.2 + R() * 1.4, 1.0 + R() * 1.4, 1.2 + R() * 1.4, R() < 0.5 ? 0x8a6a40 : 0x6a7a8a, 30);   // skrzynie
    for (const [x, z] of [[-10, -10], [10, -10], [-10, 8], [10, 8], [0, -2]]) { const l = new THREE.PointLight(0xffe8c0, 22, 22, 1.6); l.position.set(x, H - 1.5, z); L.root.add(l); const f = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.08, 0.3), new THREE.MeshBasicMaterial({ color: 0xffe8c0 })); f.position.set(x, H - 0.1, z); L.root.add(f); }
}
// Pozycje skarbów z ziarna: wolne miejsca poza pudełkami i co najmniej 8 m od siebie
function placeTreasures(seed) {
    S.seed = seed; const R = T.mkRng(seed), pts = [];
    for (let tries = 0; pts.length < COUNT && tries < 600; tries++) {
        const x = (R() * 2 - 1) * (A - 3), z = (R() * 2 - 1) * (A - 5);
        if (z > A - 8 || BOXES.some(b => Math.abs(x - b.x) < b.w / 2 + 0.9 && Math.abs(z - b.z) < b.d / 2 + 0.9) || pts.some(q => Math.hypot(q[0] - x, q[1] - z) < 8)) continue;
        pts.push([x, z]);
    }
    S.tre.forEach((t, i) => { const q = pts[i % Math.max(1, pts.length)] || [0, 0]; t.x = q[0]; t.z = q[1]; t.g.position.set(q[0], 0, q[1]); t.g.visible = true; t.glow.material.opacity = 0; });
}

// ---------- SIEĆ ----------
function onNet(msg, from) {
    if (!S || !msg) return;
    if (N.NET.mode === 'host') { if (msg.k === 'got') hostGot(msg.i, from); return; }
    if (msg.k !== 'st') return;
    S.lastHostMsg = S.clock;
    const prev = S.phase;
    S.phase = msg.ph; S.t = msg.t; S.solo = !!msg.solo; S.winner = msg.w ? fromNet(msg.w) : (msg.w === 'draw' ? 'draw' : null);
    if (msg.sd && msg.sd !== S.seed) placeTreasures(msg.sd);
    const taken = (msg.tk || []).map(v => v ? fromNet(v) : null);
    taken.forEach((v, i) => { if (v && !S.taken[i] && v === 'me') { toast('Treasure! ' + (S.mine + 1), '#ffd060'); S.mine++; } });
    S.taken = taken; S.scores = {}; for (const id in (msg.sc || {})) S.scores[fromNet(id)] = msg.sc[id];
    if (msg.ph === 'play' && prev !== 'play') startedPlay();
    if (msg.ph === 'results' && prev !== 'results') roundOver();
}
function broadcast() {
    const sc = {}; for (const id in S.scores) sc[toNet(id)] = S.scores[id];
    N.sendLevelMsg({ k: 'st', ph: S.phase, t: S.t, sd: S.seed, solo: S.solo, w: S.winner === 'draw' ? 'draw' : (S.winner ? toNet(S.winner) : null), tk: S.taken.map(v => v ? toNet(v) : null), sc: sc });
}
function startedPlay() {
    S.rewarded = false; S.mine = 0; S.startT = S.clock; S.pingT = 0;
    setPlayerPosition((Math.random() * 2 - 1) * 8, 1.0, A - 3 - Math.random() * 2);
    toast('Find the 8 treasures! Listen to the detector.', '#ffd060');
}
function roundOver() {
    if (S.rewarded) return; S.rewarded = true;
    if (S.solo) {
        if (S.mine >= COUNT) { toast('All treasures found!', '#7fc47f'); levelReward('treasure', 150, 150, 'found every treasure'); } else toast('Found ' + S.mine + '/' + COUNT + '. Try again!', '#ffd27a');
    } else if (S.winner === 'me') { toast('You found the most treasure!', '#7fc47f'); levelReward('treasure', REWARD, REWARD, 'won Treasure Hunt'); }
    else if (S.winner === 'draw' || !S.winner) toast('Draw! No winner this round.', '#ffd27a'); else toast('Someone found more treasure.', '#e0533f');
}

// ---------- MÓZG RUNDY ----------
// Zebranie skarbu przez gościa: host przyjmuje je tylko dla poprawnego indeksu i gdy głowa gracza jest przy tym skarbie (z zapasem na opóźnienie sieci)
function hostGot(i, id) { if (validIndex(i, COUNT) && S.tre[i] && nearTarget(headOf(id), S.tre[i], GRAB + TOL.GRAB)) take(i, id); }
function take(i, id) {
    if (S.phase !== 'play' || !(i >= 0 && i < COUNT) || S.taken[i]) return;
    S.taken[i] = id; S.scores[id] = (S.scores[id] || 0) + 1;
    if (id === 'me') { S.mine++; toast('Treasure! ' + S.mine + '/' + COUNT, '#ffd060'); SFX.fuse(); buzz('both', 0.7, 150); }
    if (S.taken.filter(Boolean).length >= COUNT) endRound();
}
function endRound() {
    let best = null, bv = 0, tie = false;
    for (const id in S.scores) { if (S.scores[id] > bv) { best = id; bv = S.scores[id]; tie = false; } else if (S.scores[id] === bv && bv > 0) tie = true; }
    S.winner = bv === 0 ? null : (tie ? 'draw' : best); S.phase = 'results'; S.t = RESULTS; roundOver();
}
function think(dt) {
    S.t -= dt;
    if (S.phase === 'wait') {
        if (S.t <= 0) { const parts = participants('treasure'); S.solo = parts.length < 2; S.taken = new Array(COUNT).fill(null); S.scores = {}; for (const id of parts) S.scores[id] = 0; S.winner = null; placeTreasures(1 + ((Math.random() * 1e6) | 0)); S.phase = 'play'; S.t = ROUND; startedPlay(); }
    } else if (S.phase === 'play') { if (S.t <= 0) endRound(); }
    else if (S.phase === 'results' && S.t <= 0) { S.phase = 'wait'; S.t = N.NET.mode === 'solo' ? SOLO_WAIT : WAIT; for (const t of S.tre) t.g.visible = false; }
}

// ---------- CO KLATKĘ ----------
export function update(dt, t, ctx) {
    if (!S) return;
    S.clock += dt;
    const p = ctx.body.position, auth = isAuthority('treasure', S);
    if (S.introSkip === undefined) { S.introSkip = introSeen('treasure'); if (S.introSkip) S.introT = Math.min(S.introT, 3); }
    if (S.introT > 0) {
        S.introT -= dt; const sec = Math.max(0, Math.ceil(S.introT));
        if (sec !== S.intro.last) { S.intro.last = sec; drawInstructions(S.intro, 'Treasure Hunt', [
            '8 treasures are hidden in the dark hall. Search behind crates and walls.',
            'Your detector beeps faster and higher the closer you are to the nearest treasure.',
            'Touch a treasure to take it. Each one can be taken only once, by the first player to reach it.',
            'The player with the most treasures after 2.5 minutes (or when all are found) wins 200 Bagabucks.',
            'Playing alone? Find all 8 in time. The treasure spots change every round.',
            'The GAMES door behind you takes you back.'], 'This closes in ' + sec + ' s', { bg: 'rgba(22,16,4,0.9)', border: '#ffc830', title: '#fff0c0', text: '#f4ecd0', footer: '#ffb030', size: 28 }); }
        S.intro.mesh.visible = S.introT > 0 && !S.introSkip;
    }
    if (auth) { think(dt); if (N.NET.mode === 'host') { S.netT -= dt; if (S.netT <= 0) { S.netT = 0.2; broadcast(); } } }
    // Skarby: widoczność, blask z bliska, zbieranie, detektor
    let near = 99;
    S.tre.forEach((tr, i) => {
        const gone = !!S.taken[i] || S.phase === 'wait' || S.phase === 'results';
        tr.g.visible = !gone; if (gone) return;
        const d = Math.hypot(p.x - tr.x, p.z - tr.z); near = Math.min(near, d);
        tr.g.rotation.y = t * 1.2; tr.g.position.y = Math.sin(t * 2 + i) * 0.05;
        tr.glow.material.opacity = Math.max(0, 1 - d / 7) * 0.9;
        if (S.phase === 'play' && d < GRAB && Math.abs(p.y - 1.0) < 1.6 && !S.taken[i]) {
            if (N.NET.mode === 'host' || N.NET.mode === 'solo') take(i, 'me'); else if (!tr.sent || S.clock - tr.sent > 0.6) { tr.sent = S.clock; N.sendLevelMsg({ k: 'got', i: i }); }
        }
    });
    S.near = near;
    if (S.phase === 'play' && near < 90) {
        S.pingT -= dt;
        if (S.pingT <= 0) { const prox = Math.max(0, 1 - near / 24); SFX.beep(380 + 1100 * prox, 0.12 + 0.12 * prox, 0.08); S.pingT = 0.1 + Math.pow(near / 24, 1.2) * 1.6; }
    }
    S.hudT -= dt; if (S.hudT <= 0) { S.hudT = 0.15; drawHud(); }
}
function fmt(t) { t = Math.max(0, Math.ceil(t)); return Math.floor(t / 60) + ':' + String(t % 60).padStart(2, '0'); }
function drawHud() {
    const x = S.hud.ctx; panelBg(S.hud, 'rgba(22,16,4,0.72)');
    x.textBaseline = 'middle'; x.textAlign = 'left';
    x.font = 'bold 76px "Courier New", monospace'; x.fillStyle = '#fff0d0'; x.fillText(fmt(S.t), 30, 74);
    x.font = 'bold 36px "Courier New", monospace'; x.fillStyle = '#ffd060'; x.fillText('Treasures ' + S.mine + '/' + COUNT, 330, 50);
    x.font = 'bold 28px "Courier New", monospace';
    let msg, col = '#fff0d0';
    if (S.phase === 'wait') { msg = 'Round starts soon'; col = '#ffb030'; }
    else if (S.phase === 'results') { msg = S.winner === 'me' ? 'You win! +200' : 'Round over'; col = '#9aff60'; }
    else { const n = S.near; if (n < 2.5) { msg = 'BURNING! Right here!'; col = '#ff3a20'; } else if (n < 6) { msg = 'Hot'; col = '#ff7a30'; } else if (n < 12) { msg = 'Warm'; col = '#ffd060'; } else if (n < 20) { msg = 'Cool'; col = '#9ac8ff'; } else { msg = 'Cold'; col = '#6a9aff'; } }
    x.fillStyle = col; x.fillText(msg, 330, 108);
    x.font = '22px "Courier New", monospace'; x.fillStyle = '#d8c8a8'; x.fillText(S.solo ? 'Solo: find all ' + COUNT : 'Left: ' + (COUNT - S.taken.filter(Boolean).length), 30, 160);
    S.hud.update();
}
export function dispose() {
    if (S) { S.hud.dispose(); S.intro.dispose(); }
    N.onLevelMsg(null);
    S = null;
}
