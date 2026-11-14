// ==========================================
// GAME MODE: HOT POTATO (grupa PARTY GAMES w salonie Games)
// Jeden gracz dostaje bombę z odliczaniem i przekazuje ją, dotykając dłonią głowy lub tułowia innego gracza.
// Bomba wybucha u tego, kto ją akurat trzyma, i ten gracz odpada na balkon. Potem rusza następna bomba.
// Ostatni żywy wygrywa 200 Bagabucks. Solo: ty i 3 manekiny (uciekają przed trzymającym i gonią, gdy sami trzymają bombę).
// Host (albo gracz solo) liczy wszystko i rozsyła stan; zdarzenia mają numer, żeby nie powtarzały się u graczy.
// ==========================================
import { THREE, L, tex, addCrispBlock } from '../core/engine.js';
import * as T from '../core/textures.js';
import { buildMannequin } from '../core/mannequin.js';
import { levelReward } from '../core/economy.js';
import { toast } from '../core/terminal.js';
import { setPlayerPosition } from '../core/player.js';
import * as N from '../core/network.js';
import * as SFX from '../core/audio.js';
import { buzz } from '../core/haptics.js';
import { createBot, stepBot } from '../core/botkit.js';
import { participants, isAuthority, handsOf, headOf, touching, toNet, fromNet } from '../core/roundkit.js';
import { buildDoor, cameraPanel, panelBg, drawInstructions, introSeen } from '../core/levelkit.js';
import { ARRIVAL_FROM_POTATO } from './games.js';

const A = 15, H = 10, BALCONY_Y = 6;
const WAIT = 15, SOLO_WAIT = 4, MAX_ROUND = 200, RESULTS = 8, REWARD = 200, FIRST_DELAY = 4, NEXT_DELAY = 3.5;
const PASS_COOLDOWN = 1.3, HOLD_LOCK = 0.5;
export const info = { id: 'potato', name: 'Hot Potato', spawn: [0, 1.0, 12] };
let S = null;
const bots = {};

export function build() {
    L.spawn = info.spawn.slice();
    L.bounds = { minX: -A + 0.4, maxX: A - 0.4, minZ: -A + 0.4, maxZ: A - 0.4, maxY: H - 0.4 };
    S = { clock: 0, phase: 'wait', t: N.NET.mode === 'solo' ? SOLO_WAIT : WAIT, alive: new Set(), out: new Set(), holder: null, from: null, fuse: 0, delay: 0, coolUntil: 0, lockUntil: 0, solo: true, winner: null, iAmOut: false, lastHostMsg: -10, netT: 0, hudT: 0, introT: 10, rewarded: false, ev: { n: 0 }, seenEv: 0, tickT: 0, spriteSec: -1, roundT: 0 };
    buildArena();
    buildDoor({ x: 0, z: A - 0.03, rotY: Math.PI, label: 'GAMES', color: '#d080ff', wood: 0x3a3048, portal: { target: 'games', spawn: ARRIVAL_FROM_POTATO, onEnter: () => toast('Back to BagaBoo Games') } });
    // Bomba nad głową trzymającego: tekst z liczbą sekund
    S.bombCanvas = T.makeCanvas(128, 96);
    S.bomb = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(S.bombCanvas), transparent: true, depthTest: false })); S.bomb.scale.set(0.5, 0.375, 1); S.bomb.renderOrder = 999; S.bomb.visible = false; L.root.add(S.bomb);
    S.bombGlow = new THREE.PointLight(0xff5020, 0, 8, 2); L.root.add(S.bombGlow);
    for (let i = 0; i < 3; i++) {   // manekiny (solo)
        const m = buildMannequin(T.mkRng(300 + i)); m.group.scale.setScalar(1.2); m.group.visible = false; L.root.add(m.group);
        S['bot' + i] = { mesh: m, st: null };
    }
    S.hud = cameraPanel(1024, 200, 0.42, 0.082, 0.2, -0.75, 990);
    S.intro = cameraPanel(1280, 760, 1.0, 0.594, -0.04, -1.05, 995); S.intro.last = -1;
    N.onLevelMsg(onNet);
}
function buildArena() {
    const R = T.mkRng(5151), boxes = [];
    addCrispBlock(0, -0.5, 0, A * 2 + 2, 1, A * 2 + 2, 0x7a6a62, 0x181008, tex.floor, { rough: tex.floorRough });
    addCrispBlock(0, H + 0.5, 0, A * 2 + 2, 1, A * 2 + 2, 0x4a4046, 0x101018);
    for (const [x, z, w, d] of [[0, -A - 0.5, A * 2 + 2, 1], [0, A + 0.5, A * 2 + 2, 1], [-A - 0.5, 0, 1, A * 2], [A + 0.5, 0, 1, A * 2]]) addCrispBlock(x, H / 2, z, w, H, d, 0xaa9a90, 0x20202a, tex.wall);
    const fits = (x, z, w, d) => Math.abs(x) + w / 2 < A - 3 && z + d / 2 < A - 4 && z - d / 2 > -A + 5 && boxes.every(b => Math.abs(x - b.x) > (w + b.w) / 2 + 1.1 || Math.abs(z - b.z) > (d + b.d) / 2 + 1.1);
    for (let i = 0; i < 60 && boxes.length < 12; i++) {
        const w = 1.2 + R() * 1.8, d = 1.2 + R() * 1.8, h = 0.8 + R() * 1.0, x = (R() * 2 - 1) * (A - 3), z = (R() * 2 - 1) * (A - 5);
        if (!fits(x, z, w, d)) continue;
        addCrispBlock(x, h / 2, z, w, h, d, R() < 0.5 ? 0x8a6a50 : 0x6a7a8a, 0x201810, tex.wall); boxes.push({ x: x, z: z, w: w, d: d });
    }
    addCrispBlock(0, BALCONY_Y - 0.25, -A + 1.6, A * 2 - 4, 0.5, 3.2, 0x5a2a2a, 0xff5a20);   // balkon dla wyeliminowanych
    for (const [x, z] of [[-8, -6], [8, -6], [-8, 8], [8, 8], [0, 0]]) { const l = new THREE.PointLight(0xfff0d8, 40, 26, 1.5); l.position.set(x, H - 2, z); L.root.add(l); const f = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.08, 0.3), new THREE.MeshBasicMaterial({ color: 0xfff0d8 })); f.position.set(x, H - 0.1, z); L.root.add(f); }
}

// ---------- POMOCNIKI ----------
function drawBomb(sec) {
    const c = S.bombCanvas.getContext('2d'); c.clearRect(0, 0, 128, 96);
    c.fillStyle = '#1a1a1a'; c.beginPath(); c.arc(64, 58, 30, 0, 7); c.fill(); c.strokeStyle = '#ff8a30'; c.lineWidth = 5; c.beginPath(); c.moveTo(64, 28); c.quadraticCurveTo(80, 8, 96, 18); c.stroke();
    c.fillStyle = sec <= 3 ? '#ff3030' : '#ffd030'; c.beginPath(); c.arc(98, 16, 7, 0, 7); c.fill();
    c.fillStyle = '#fff'; c.font = 'bold 40px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(String(sec), 64, 60);
    S.bomb.material.map.needsUpdate = true;
}
const nameOf = (id) => { if (id === 'me') return 'You'; if (String(id).startsWith('b')) return 'Mannequin'; const st = N.playersState[id]; return st && st.profile ? st.profile.name : 'Player'; };
function post(k, id) { S.ev = { n: S.ev.n + 1, k: k, id: id }; S.seenEv = S.ev.n; applyEvent({ k: k, id: id }); }
function applyEvent(e) {
    if (e.k === 'boom') {
        const hd = headOf(e.id, bots); if (hd) SFX.bang({ x: hd.x, y: hd.y, z: hd.z });
        if (e.id === 'me') localOut(); else toast(nameOf(e.id) + ' blew up!', '#ffb030');
        if (bots[e.id]) bots[e.id].dead = true;
    } else if (e.k === 'pass') toast((e.id === 'me' ? 'You have' : nameOf(e.id) + ' has') + ' the bomb!', e.id === 'me' ? '#ff4a2a' : '#ffd27a');
}
function localOut() {
    if (S.iAmOut) return;
    S.iAmOut = true; S.out.add('me');
    L.bounds = { minX: -A + 3, maxX: A - 3, minZ: -A + 0.4, maxZ: -A + 3.4, maxY: H - 0.4 };
    setPlayerPosition((Math.random() * 2 - 1) * 6, BALCONY_Y + 0.9, -A + 1.6);
    toast('BOOM! You are out. Watch from the balcony.', '#ff4a2a'); SFX.scare(); buzz('both', 1, 400);
}
function startedPlay() {
    S.rewarded = false; S.iAmOut = false;
    L.bounds = { minX: -A + 0.4, maxX: A - 0.4, minZ: -A + 0.4, maxZ: A - 0.4, maxY: H - 0.4 };
    setPlayerPosition((Math.random() * 2 - 1) * 8, 1.0, 4 + Math.random() * 8);
    toast('Pass the bomb by touching someone!', '#ff9a40');
}
function roundOver() {
    if (S.rewarded) return; S.rewarded = true;
    L.bounds = { minX: -A + 0.4, maxX: A - 0.4, minZ: -A + 0.4, maxZ: A - 0.4, maxY: H - 0.4 };
    if (S.winner === 'me') { toast('You are the last one standing!', '#7fc47f'); levelReward('potato', S.solo ? 150 : REWARD, S.solo ? 150 : REWARD, 'won Hot Potato'); }
    else if (S.winner) toast(nameOf(S.winner) + ' wins.', '#ffd27a'); else toast('Draw!', '#ffd27a');
}

// ---------- SIEĆ ----------
function onNet(msg) {
    if (!S || !msg || N.NET.mode === 'host' || msg.k !== 'st') return;
    S.lastHostMsg = S.clock;
    const prev = S.phase;
    S.phase = msg.ph; S.t = msg.t; S.solo = !!msg.solo; S.fuse = msg.f; S.winner = msg.w ? fromNet(msg.w) : null;
    S.alive = new Set((msg.al || []).map(fromNet)); S.out = new Set((msg.out || []).map(fromNet));
    S.holder = msg.h ? fromNet(msg.h) : null;
    if (msg.ev && msg.ev.n > S.seenEv) { S.seenEv = msg.ev.n; applyEvent({ k: msg.ev.k, id: msg.ev.id ? fromNet(msg.ev.id) : null }); }
    if (msg.ph === 'play' && prev !== 'play') startedPlay();
    if (msg.ph === 'results' && prev !== 'results') roundOver();
}
function broadcast() {
    N.sendLevelMsg({ k: 'st', ph: S.phase, t: S.t, solo: S.solo, f: Math.round(S.fuse * 10) / 10, w: S.winner ? toNet(S.winner) : null, al: [...S.alive].map(toNet), out: [...S.out].map(toNet), h: S.holder ? toNet(S.holder) : null, ev: { n: S.ev.n, k: S.ev.k, id: S.ev.id ? toNet(S.ev.id) : null } });
}

// ---------- MÓZG RUNDY ----------
function endRound(w) { S.winner = w; S.phase = 'results'; S.t = RESULTS; S.holder = null; roundOver(); }
function think(dt, p) {
    S.t -= dt;
    if (S.phase === 'wait') {
        if (S.t <= 0) {
            const parts = participants('potato');
            S.solo = parts.length < 2; S.alive = new Set(parts); S.out = new Set(); S.winner = null; S.holder = null; S.from = null; S.roundT = 0; S.delay = FIRST_DELAY;
            for (const k in bots) delete bots[k];
            if (S.solo) for (let i = 0; i < 3; i++) { const b = S['bot' + i], id = 'b' + i; b.st = createBot((i - 1) * 8, -6); b.dead = false; bots[id] = { head: () => new THREE.Vector3(b.st.x, b.st.y + 1.6, b.st.z), st: b.st, mesh: b.mesh, dead: false }; S.alive.add(id); }
            S.phase = 'play'; S.t = MAX_ROUND; startedPlay();
        }
    } else if (S.phase === 'play') {
        S.roundT += dt;
        const alive = [...S.alive];
        if (!S.holder) {
            S.delay -= dt;
            if (S.delay <= 0 && alive.length > 1) { S.holder = alive[(Math.random() * alive.length) | 0]; S.from = null; S.fuse = Math.min(18, 7 + 2 * alive.length); S.lockUntil = S.clock + 0.8; post('pass', S.holder); }
        } else {
            S.fuse -= dt;
            if (S.clock > S.lockUntil) for (const o of alive) {
                if (o === S.holder || (o === S.from && S.clock < S.coolUntil)) continue;
                if (touching(handsOf(S.holder, bots), headOf(o, bots))) { S.from = S.holder; S.holder = o; S.coolUntil = S.clock + PASS_COOLDOWN; S.lockUntil = S.clock + HOLD_LOCK; post('pass', o); break; }
            }
            if (S.fuse <= 0) {
                const dead = S.holder; S.alive.delete(dead); S.out.add(dead); S.holder = null; S.delay = NEXT_DELAY; post('boom', dead);
                if (S.alive.size <= 1) { endRound([...S.alive][0] || null); return; }
            }
        }
        if (S.solo) botsThink(dt, p);
        if (S.t <= 0) endRound(null);
    } else if (S.phase === 'results' && S.t <= 0) { S.phase = 'wait'; S.t = N.NET.mode === 'solo' ? SOLO_WAIT : WAIT; S.holder = null; }
}
// Manekiny: trzymający goni najbliższego żywego, reszta ucieka od trzymającego
function botsThink(dt, p) {
    const hpos = S.holder ? headOf(S.holder, bots) : null, me = headOf('me');
    for (const id in bots) {
        const b = bots[id]; if (S.out.has(id)) continue;
        const st = b.st; let tx, tz, speed = 3.0;
        if (S.holder === id) {
            let best = null, bd = 1e9; for (const o of S.alive) { if (o === id || (o === S.from && S.clock < S.coolUntil)) continue; const h = headOf(o, bots); if (!h) continue; const d = Math.hypot(h.x - st.x, h.z - st.z); if (d < bd) { bd = d; best = h; } }
            if (best) { tx = best.x; tz = best.z; } else { tx = st.x; tz = st.z; } speed = 3.5;
        } else if (hpos) {
            const dx = st.x - hpos.x, dz = st.z - hpos.z, d = Math.max(0.5, Math.hypot(dx, dz));
            tx = Math.max(-A + 2, Math.min(A - 2, st.x + dx / d * 6)); tz = Math.max(-A + 6, Math.min(A - 2, st.z + dz / d * 6)); speed = 3.2;
        } else { tx = st.x + Math.sin(S.clock * 0.5 + id.charCodeAt(1)) * 2; tz = st.z + Math.cos(S.clock * 0.5) * 2; speed = 1.5; }
        stepBot(st, dt, tx, tz, p.y - 0.35, speed, S.holder === id);
        st.x = Math.max(-A + 1, Math.min(A - 1, st.x)); st.z = Math.max(-A + 5, Math.min(A - 1, st.z));
    }
    void me;
}

// ---------- CO KLATKĘ ----------
export function update(dt, t, ctx) {
    if (!S) return;
    S.clock += dt;
    const p = ctx.body.position, auth = isAuthority('potato', S);
    if (S.introSkip === undefined) { S.introSkip = introSeen('potato'); if (S.introSkip) S.introT = Math.min(S.introT, 3); }
    if (S.introT > 0) {
        S.introT -= dt; const sec = Math.max(0, Math.ceil(S.introT));
        if (sec !== S.intro.last) { S.intro.last = sec; drawInstructions(S.intro, 'Hot Potato', [
            'One player holds a bomb with a fuse. Pass it by touching another player with your hand (head or body).',
            'You cannot pass it straight back for a moment, so move and chase.',
            'When the fuse runs out the bomb explodes in the holder hands: they are out and go to the balcony.',
            'Last one standing wins 200 Bagabucks.',
            'Playing alone? You and 3 mannequins. They flee from the bomb and chase when they hold it.',
            'The GAMES door behind you takes you back.'], 'This closes in ' + sec + ' s', { bg: 'rgba(24,10,4,0.9)', border: '#ff9a40', title: '#ffe0c0', text: '#f4e4d8', footer: '#ffb030', size: 28 }); }
        S.intro.mesh.visible = S.introT > 0 && !S.introSkip;
    }
    if (auth) { think(dt, p); if (N.NET.mode === 'host') { S.netT -= dt; if (S.netT <= 0) { S.netT = 0.2; broadcast(); } } }
    else if (S.phase === 'play' && S.holder) S.fuse -= dt;   // gość: odliczanie między wiadomościami hosta
    // Gość: jeśli host uznał mnie za odpadniętego
    if (S.phase === 'play' && !S.iAmOut && S.out.has('me')) localOut();
    // Bomba nad głową i dźwięk tykania
    const hd = S.phase === 'play' && S.holder ? headOf(S.holder, bots) : null;
    S.bomb.visible = !!hd;
    if (hd) {
        S.bomb.position.set(hd.x, hd.y + 0.6, hd.z); S.bombGlow.position.set(hd.x, hd.y + 0.6, hd.z); S.bombGlow.intensity = 6 + Math.sin(t * 14) * 4;
        const sec = Math.max(0, Math.ceil(S.fuse)); if (sec !== S.spriteSec) { S.spriteSec = sec; drawBomb(sec); }
        S.tickT -= dt; if (S.tickT <= 0) { S.tickT = S.fuse < 3 ? 0.35 : 1; SFX.step(S.holder === 'me' ? 0.6 : 0.25); if (S.holder === 'me') buzz('both', 0.5, 80); }
    } else S.bombGlow.intensity = 0;
    // Manekiny
    for (let i = 0; i < 3; i++) { const b = S['bot' + i], id = 'b' + i, show = S.solo && b.st && S.phase === 'play' && !S.out.has(id); b.mesh.group.visible = !!show; if (show) { b.mesh.group.position.set(b.st.x, b.st.y + (b.st.ground ? Math.abs(Math.sin(t * 8)) * 0.04 : 0), b.st.z); b.mesh.group.rotation.y = b.st.dir; } }
    S.hudT -= dt; if (S.hudT <= 0) { S.hudT = 0.15; drawHud(); }
}
function fmt(t) { t = Math.max(0, Math.ceil(t)); return Math.floor(t / 60) + ':' + String(t % 60).padStart(2, '0'); }
function drawHud() {
    const x = S.hud.ctx; panelBg(S.hud, 'rgba(24,10,4,0.72)');
    x.textBaseline = 'middle'; x.textAlign = 'left';
    x.font = 'bold 76px "Courier New", monospace'; x.fillStyle = '#ffe8d0'; x.fillText(S.phase === 'play' && S.holder ? String(Math.max(0, Math.ceil(S.fuse))) : fmt(S.t), 30, 74);
    x.font = 'bold 26px "Courier New", monospace';
    let msg, col = '#ffe8d0';
    if (S.phase === 'wait') { msg = 'Round starts soon'; col = '#ffb030'; }
    else if (S.phase === 'results') { msg = S.winner === 'me' ? 'You win! +200' : (S.winner ? nameOf(S.winner) + ' wins' : 'Draw'); col = '#9aff60'; }
    else if (S.iAmOut) { msg = 'You are out. Watch the game.'; col = '#ff8a6a'; }
    else if (S.holder === 'me') { msg = 'YOU HAVE THE BOMB! Touch someone!'; col = '#ff3a20'; }
    else if (S.holder) { msg = nameOf(S.holder) + ' has the bomb. Keep away!'; col = '#ffd27a'; }
    else { msg = 'Get ready... bomb incoming'; col = '#ffb030'; }
    x.fillStyle = col; x.fillText(msg, 330, 56);
    x.font = '24px "Courier New", monospace'; x.fillStyle = '#d8c0a8'; x.fillText('Alive: ' + S.alive.size, 330, 110);
    S.hud.update();
}
export function dispose() {
    if (S) { S.hud.dispose(); S.intro.dispose(); }
    N.onLevelMsg(null);
    for (const k in bots) delete bots[k];
    L.bounds = { minX: -A + 0.4, maxX: A - 0.4, minZ: -A + 0.4, maxZ: A - 0.4, maxY: H - 0.4 };
    S = null;
}
