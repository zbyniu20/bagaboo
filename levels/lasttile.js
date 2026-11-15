// ==========================================
// GAME MODE: LAST TILE (grupa RACE & SKILL w salonie Games)
// Podłoga z 64 płytek nad przepaścią. Co chwilę kolejna płytka miga na czerwono (2 s) i spada, a coraz szybciej.
// Kto spadnie, ląduje na balkonie. Ostatni stojący wygrywa 200 Bagabucks (gdy gra 2+ osób).
// Solo: przetrwaj jak najdłużej (rekord w sekundach); 60 s i więcej daje nagrodę.
// Kolejność spadania zależy od ziarna rundy (wspólne dla wszystkich), czas liczy host.
// ==========================================
import { THREE, L, tex, addCrispBlock } from '../core/engine.js';
import * as T from '../core/textures.js';
import { levelReward, recordScore } from '../core/economy.js';
import { toast } from '../core/terminal.js';
import { setPlayerPosition } from '../core/player.js';
import * as N from '../core/network.js';
import * as SFX from '../core/audio.js';
import { buzz } from '../core/haptics.js';
import { participants, isAuthority, toNet, fromNet } from '../core/roundkit.js';
import { buildDoor, cameraPanel, panelBg, drawInstructions, introSeen } from '../core/levelkit.js';
import { ARRIVAL_FROM_LASTTILE } from './games.js';

const N_T = 8, SIZE = 3.0, PITCH = 3.2, H = 14, A = 17, BALCONY_Y = 6;
const WAIT = 15, SOLO_WAIT = 4, MAX_ROUND = 150, RESULTS = 8, REWARD = 200, FIRST_FALL = 8, WARN = 2.0, SOLO_PAR = 60, FALL_Y = -2.0;
export const info = { id: 'lasttile', name: 'Last Tile', spawn: [0, 1.0, 14] };
let S = null;

export function build() {
    L.spawn = info.spawn.slice();
    L.bounds = { minX: -A + 0.4, maxX: A - 0.4, minZ: -A + 0.4, maxZ: A - 0.4, maxY: H - 0.4 };
    L.floorY = -40;   // pod płytkami jest przepaść: bez tego gracza trzymała globalna podłoga i nigdy nie spadał
    S = { clock: 0, phase: 'wait', t: N.NET.mode === 'solo' ? SOLO_WAIT : WAIT, rt: 0, rtNet: 0, seed: 1, order: [], fall: [], alive: new Set(), out: new Set(), solo: true, winner: null, iAmOut: false, lastHostMsg: -10, netT: 0, hudT: 0, introT: 10, rewarded: false, tiles: [], survived: 0, lastTick: -1 };
    buildHall();
    buildTiles();
    buildDoor({ x: 0, z: A - 0.03, rotY: Math.PI, label: 'GAMES', color: '#d080ff', wood: 0x3a3048, portal: { target: 'games', spawn: ARRIVAL_FROM_LASTTILE, onEnter: () => toast('Back to BagaBoo Games') } });
    S.hud = cameraPanel(1024, 200, 0.42, 0.082, 0.2, -0.75, 990);
    S.intro = cameraPanel(1280, 760, 1.0, 0.594, -0.04, -1.05, 995); S.intro.last = -1;
    makeSchedule(1);
    N.onLevelMsg(onNet);
}
function buildHall() {
    const wall = 0x3a3248;
    addCrispBlock(0, H + 0.5, 0, A * 2 + 2, 1, A * 2 + 2, 0x201830, 0x302040);
    for (const [x, z, w, d] of [[0, -A - 0.5, A * 2 + 2, 1], [0, A + 0.5, A * 2 + 2, 1], [-A - 0.5, 0, 1, A * 2], [A + 0.5, 0, 1, A * 2]]) addCrispBlock(x, H / 2, z, w, H, d, wall, 0x302040);
    // Przepaść: siatka daleko pod płytkami
    const c = T.makeCanvas(256, 256), x = c.getContext('2d');
    x.fillStyle = '#0a0612'; x.fillRect(0, 0, 256, 256); x.strokeStyle = 'rgba(255,170,40,0.5)'; x.lineWidth = 3;
    for (let i = 0; i <= 256; i += 64) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, 256); x.stroke(); x.beginPath(); x.moveTo(0, i); x.lineTo(256, i); x.stroke(); }
    const gt = T.toTex(c, true); gt.repeat.set(8, 8);
    const grid = new THREE.Mesh(new THREE.PlaneGeometry(A * 2, A * 2), new THREE.MeshBasicMaterial({ map: gt, toneMapped: false })); grid.rotation.x = -Math.PI / 2; grid.position.set(0, -14, 0); L.root.add(grid);
    // Balkon dla wyeliminowanych (za tylną ścianą od strony drzwi) i światła
    addCrispBlock(0, BALCONY_Y - 0.25, A - 1.6, A * 2 - 4, 0.5, 3.2, 0x5a4a2a, 0xffb020);
    for (const [lx, lz] of [[-9, -9], [9, -9], [-9, 9], [9, 9], [0, 0]]) { const l = new THREE.PointLight(0xffe8c0, 70, 34, 1.4); l.position.set(lx, H - 2, lz); L.root.add(l); const f = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.08, 0.3), new THREE.MeshBasicMaterial({ color: 0xffe8c0 })); f.position.set(lx, H - 0.1, lz); L.root.add(f); }
    const l2 = new THREE.PointLight(0xffa030, 40, 30, 1.6); l2.position.set(0, -4, 0); L.root.add(l2);
}
function buildTiles() {
    for (let j = 0; j < N_T; j++) for (let i = 0; i < N_T; i++) {
        const x = (i - (N_T - 1) / 2) * PITCH, z = (j - (N_T - 1) / 2) * PITCH - 1.5;
        const m = addCrispBlock(x, -0.25, z, SIZE, 0.5, SIZE, (i + j) % 2 ? 0x7a6a9a : 0x5a4a7a, 0x302040, tex.floor);
        const ob = L.obstacles[L.obstacles.length - 1];
        S.tiles.push({ mesh: m, ob: ob, x: x, z: z, y: 0, state: 'up', base: (i + j) % 2 ? 0x7a6a9a : 0x5a4a7a });
    }
}
// Harmonogram spadania: kolejność z ziarna, odstępy maleją od 2,6 s do 0,8 s; ostatnia płytka nie spada
function makeSchedule(seed) {
    S.seed = seed; const R = T.mkRng(seed), idx = S.tiles.map((_, i) => i);
    for (let i = idx.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [idx[i], idx[j]] = [idx[j], idx[i]]; }
    S.order = idx.slice(0, idx.length - 1); S.fall = [];
    let tm = FIRST_FALL; S.order.forEach((tile, k) => { S.fall[tile] = tm; tm += Math.max(0.8, 2.6 - 0.035 * k); });
}
function resetTiles() {
    for (const t of S.tiles) {
        t.state = 'up'; t.y = 0; t.mesh.position.y = -0.25; t.mesh.visible = true; t.mesh.material.color.setHex(t.base);
        if (!L.obstacles.includes(t.ob)) L.obstacles.push(t.ob);
        const b = t.ob.box3; b.min.y = -0.5; b.max.y = 0; if (t.ob.body) t.ob.body.position.y = -0.25;
    }
}

// ---------- SIEĆ ----------
function onNet(msg, from) {
    if (!S || !msg) return;
    if (N.NET.mode === 'host') { if (msg.k === 'out') { S.out.add(from); S.alive.delete(from); checkEnd(); } return; }
    if (msg.k !== 'st') return;
    S.lastHostMsg = S.clock;
    const prev = S.phase;
    S.phase = msg.ph; S.t = msg.t; S.solo = !!msg.solo; S.rtNet = msg.rt || 0; S.rt = S.rtNet; S.winner = msg.w ? fromNet(msg.w) : null;
    S.alive = new Set((msg.al || []).map(fromNet)); S.out = new Set((msg.out || []).map(fromNet));
    if (msg.sd && msg.sd !== S.seed) makeSchedule(msg.sd);
    if (msg.ph === 'play' && prev !== 'play') startedPlay();
    if (msg.ph === 'results' && prev !== 'results') roundOver();
}
function broadcast() {
    N.sendLevelMsg({ k: 'st', ph: S.phase, t: S.t, rt: Math.round(S.rt * 10) / 10, sd: S.seed, solo: S.solo, w: S.winner ? toNet(S.winner) : null, al: [...S.alive].map(toNet), out: [...S.out].map(toNet) });
}
function startedPlay() {
    S.rewarded = false; S.iAmOut = false; S.survived = 0; resetTiles();
    L.bounds = { minX: -A + 0.4, maxX: A - 0.4, minZ: -A + 0.4, maxZ: A - 0.4, maxY: H - 0.4 };
    setPlayerPosition((Math.random() * 2 - 1) * 7, 1.0, -1.5 + (Math.random() * 2 - 1) * 7);
    toast('Stay on the floor! Red tiles fall in 2 s.', '#ffd060');
}
function roundOver() {
    if (S.rewarded) return; S.rewarded = true;
    L.bounds = { minX: -A + 0.4, maxX: A - 0.4, minZ: -A + 0.4, maxZ: A - 0.4, maxY: H - 0.4 };
    if (S.solo) {
        const secs = Math.floor(S.survived || S.rt); recordScore('lasttile', secs);
        if (secs >= SOLO_PAR) { toast('You survived ' + secs + ' s!', '#7fc47f'); levelReward('lasttile', 150, 150, 'survived Last Tile'); } else toast('You lasted ' + secs + ' s. Reach ' + SOLO_PAR + ' s for a reward.', '#ffd27a');
    } else if (S.alive.has('me')) { toast(S.alive.size > 1 ? 'You survived!' : 'You are the last one standing!', '#7fc47f'); levelReward('lasttile', REWARD, REWARD, 'won Last Tile'); }
    else toast('You fell. Better luck next time!', '#e0533f');
}
function goOut() {
    if (S.iAmOut || S.phase !== 'play') return;
    S.iAmOut = true; S.survived = S.rt;
    L.bounds = { minX: -A + 3, maxX: A - 3, minZ: A - 3.4, maxZ: A - 0.4, maxY: H - 0.4 };
    setPlayerPosition((Math.random() * 2 - 1) * 6, BALCONY_Y + 0.9, A - 1.6);
    toast('You fell!', '#ff6a4a'); SFX.scare(); buzz('both', 0.8, 300);
    if (N.NET.mode === 'host' || N.NET.mode === 'solo') { S.out.add('me'); S.alive.delete('me'); checkEnd(); } else N.sendLevelMsg({ k: 'out' });
}

// ---------- MÓZG RUNDY ----------
function endRound(w) { S.winner = w; S.phase = 'results'; S.t = RESULTS; roundOver(); }
function checkEnd() {
    if (S.phase !== 'play') return;
    if (S.solo) { if (!S.alive.has('me')) endRound(null); return; }
    if (S.alive.size <= 1) endRound([...S.alive][0] || null);
}
function think(dt) {
    S.t -= dt;
    if (S.phase === 'wait') {
        if (S.t <= 0) {
            const parts = participants('lasttile');
            S.solo = parts.length < 2; S.alive = new Set(parts); S.out = new Set(); S.winner = null; S.rt = 0;
            makeSchedule(1 + ((Math.random() * 1e6) | 0));
            S.phase = 'play'; S.t = MAX_ROUND; startedPlay();
        }
    } else if (S.phase === 'play') {
        S.rt += dt;
        if (S.t <= 0) { S.survived = S.rt; endRound(S.solo ? null : [...S.alive][0] || null); }
    } else if (S.phase === 'results' && S.t <= 0) { S.phase = 'wait'; S.t = N.NET.mode === 'solo' ? SOLO_WAIT : WAIT; resetTiles(); }
}

// ---------- CO KLATKĘ ----------
export function update(dt, t, ctx) {
    if (!S) return;
    S.clock += dt;
    const p = ctx.body.position, auth = isAuthority('lasttile', S);
    if (S.introSkip === undefined) { S.introSkip = introSeen('lasttile'); if (S.introSkip) S.introT = Math.min(S.introT, 3); }
    if (S.introT > 0) {
        S.introT -= dt; const sec = Math.max(0, Math.ceil(S.introT));
        if (sec !== S.intro.last) { S.intro.last = sec; drawInstructions(S.intro, 'Last Tile', [
            'The floor is made of tiles over a bottomless pit. Every few seconds a tile turns red and falls.',
            'Move to a safe tile before yours drops. The pace gets faster and faster.',
            'Fall and you end up on the balcony. The last one standing wins 200 Bagabucks (2+ players).',
            'Playing alone? Survive as long as you can: 60 seconds or more gives a reward, and your best time is saved.',
            'The GAMES door behind you takes you back.'], 'This closes in ' + sec + ' s', { bg: 'rgba(24,18,6,0.9)', border: '#ffb020', title: '#ffe8b0', text: '#f4ecd8', footer: '#ffb030', size: 29 }); }
        S.intro.mesh.visible = S.introT > 0 && !S.introSkip;
    }
    if (auth) { think(dt); if (N.NET.mode === 'host') { S.netT -= dt; if (S.netT <= 0) { S.netT = 0.2; broadcast(); } } }
    else if (S.phase === 'play') S.rt = S.rtNet + (S.clock - S.lastHostMsg);
    // Płytki: ostrzeżenie (miganie na czerwono), spadanie
    const playing = S.phase === 'play';
    for (let i = 0; i < S.tiles.length; i++) {
        const tl = S.tiles[i], ft = S.fall[i];
        if (tl.state === 'gone') continue;
        if (playing && ft !== undefined) {
            if (tl.state === 'up' && S.rt >= ft - WARN) { tl.state = 'warn'; SFX.creak(0.35, { x: tl.x, y: 0, z: tl.z }); }
            if (tl.state === 'warn') {
                const k = (Math.sin(S.clock * 16) + 1) / 2; tl.mesh.material.color.setRGB(0.6 + 0.4 * k, 0.1, 0.1); tl.mesh.position.x = tl.x + (Math.random() - 0.5) * 0.03;
                if (S.rt >= ft) { tl.state = 'fall'; tl.vy = 0; const j = L.obstacles.indexOf(tl.ob); if (j >= 0) L.obstacles.splice(j, 1); if (tl.ob.body) tl.ob.body.position.y = -60; SFX.bang({ x: tl.x, y: 0, z: tl.z }); }
            }
        }
        if (tl.state === 'fall') { tl.vy = (tl.vy || 0) + 14 * dt; tl.mesh.position.y -= tl.vy * dt; tl.mesh.rotation.x += dt; tl.mesh.position.x = tl.x; if (tl.mesh.position.y < -14) { tl.state = 'gone'; tl.mesh.visible = false; } }
    }
    // Spadek lokalnego gracza
    if (playing && !S.iAmOut && p.y < FALL_Y) goOut();
    // Tykanie przy ostrzeżeniu (co sekundę, gdy jest czerwona płytka)
    if (playing && S.tiles.some(x => x.state === 'warn')) { const sec = Math.floor(S.clock * 2); if (sec !== S.lastTick) { S.lastTick = sec; SFX.step(0.25); } }
    S.hudT -= dt; if (S.hudT <= 0) { S.hudT = 0.15; drawHud(); }
}
function fmt(t) { t = Math.max(0, Math.ceil(t)); return Math.floor(t / 60) + ':' + String(t % 60).padStart(2, '0'); }
function drawHud() {
    const x = S.hud.ctx; panelBg(S.hud, 'rgba(24,18,6,0.72)');
    x.textBaseline = 'middle'; x.textAlign = 'left';
    const left = S.tiles.filter(t => t.state === 'up' || t.state === 'warn').length;
    x.font = 'bold 76px "Courier New", monospace'; x.fillStyle = '#fff0d0'; x.fillText(S.phase === 'play' ? fmt(S.rt) : fmt(S.t), 30, 74);
    x.font = 'bold 28px "Courier New", monospace';
    let msg, col = '#fff0d0';
    if (S.phase === 'wait') { msg = 'Round starts soon'; col = '#ffb030'; }
    else if (S.phase === 'results') { msg = S.solo ? 'Survived ' + Math.floor(S.survived || S.rt) + ' s' : (S.alive.has('me') ? 'You win! +200' : 'Round over'); col = '#9aff60'; }
    else if (S.iAmOut) { msg = 'You fell. Watch the others.'; col = '#ff8a6a'; }
    else if (S.rt < FIRST_FALL) { msg = 'Get ready... first tile falls in ' + Math.ceil(FIRST_FALL - S.rt); col = '#ffd27a'; }
    else { msg = 'Keep moving! Avoid red tiles.'; col = '#ffd060'; }
    x.fillStyle = col; x.fillText(msg, 330, 52);
    x.font = '24px "Courier New", monospace'; x.fillStyle = '#d8c8a8'; x.fillText('Tiles left: ' + left + (S.solo ? '' : '   Alive: ' + S.alive.size), 330, 108);
    S.hud.update();
}
export function dispose() {
    if (S) { S.hud.dispose(); S.intro.dispose(); }
    N.onLevelMsg(null);
    S = null;
}
