// ==========================================
// GAME MODE: RED LIGHT, GREEN LIGHT (grupa RACE & SKILL w salonie Games)
// Długa hala, na końcu lalka-manekin. Na ZIELONE światło biegniesz do linii mety, na CZERWONE musisz zastygnąć:
// kto się rusza, wraca na start (po 1,5 s kary). Pierwszy za linią wygrywa 200 Bagabucks (gdy gra 2+ osób).
// Solo: próba czasowa, poniżej czasu wzorcowego dostajesz nagrodę; jest rekord i duch najlepszego biegu.
// Światłem steruje host (albo gracz solo): losowe okresy zielonego (2,5-5,5 s) i czerwonego (2-3,5 s).
// ==========================================
import { THREE, L, tex, addCrispBlock } from '../core/engine.js';
import * as T from '../core/textures.js';
import { buildMannequin } from '../core/mannequin.js';
import { levelReward, recordTime } from '../core/economy.js';
import { toast } from '../core/terminal.js';
import { setPlayerPosition } from '../core/player.js';
import * as N from '../core/network.js';
import * as SFX from '../core/audio.js';
import { buzz } from '../core/haptics.js';
import { createGhost } from '../core/runkit.js';
import { buildDoor, cameraPanel, panelBg, drawInstructions, introSeen } from '../core/levelkit.js';
import { ARRIVAL_FROM_REDLIGHT } from './games.js';

const AX = 7, Z0 = 22, Z1 = -24, START_Z = 18, FINISH_Z = -16, DOLL_Z = -20.5, H = 9;
const WAIT = 12, SOLO_WAIT = 4, COUNTDOWN = 3, ROUND = 90, GRACE = 15, RESULTS = 8, REWARD = 200, PAR = 55;
const RED_GRACE = 1.0, MOVE_SPEED = 0.8, PENALTY = 1.5;   // po zapaleniu czerwonego masz 1 s na wyhamowanie
export const info = { id: 'redlight', name: 'Red Light, Green Light', spawn: [0, 1.0, 20] };
let S = null;

export function build() {
    L.spawn = info.spawn.slice();
    L.bounds = { minX: -AX + 0.4, maxX: AX - 0.4, minZ: Z1 + 0.4, maxZ: Z0 - 0.4, maxY: H - 0.4 };
    S = { ghost: createGhost('redlight'), clock: 0, phase: 'wait', t: N.NET.mode === 'solo' ? SOLO_WAIT : WAIT, order: [], times: {}, light: 'green', lightT: 3, lightN: 0, redAt: -9, penalty: 0, myT: 0, finished: false, lastHostMsg: -10, netT: 0, hudT: 0, introT: 10, rewarded: false, total: 1, caught: 0, lastBeep: -1 };
    buildHall();
    buildDoor({ x: 0, z: Z0 - 0.03, rotY: Math.PI, label: 'GAMES', color: '#d080ff', wood: 0x3a3048, portal: { target: 'games', spawn: ARRIVAL_FROM_REDLIGHT, onEnter: () => toast('Back to BagaBoo Games') } });
    // Lalka na końcu hali: odwrócona tyłem na zielonym, twarzą do graczy na czerwonym
    const d = buildMannequin(T.mkRng(8181)); d.group.scale.setScalar(2.4); d.group.position.set(0, 0.5, DOLL_Z); L.root.add(d.group);
    d.group.traverse(o => { if (o.isMesh && o.material && o.material.map) o.material = new THREE.MeshStandardMaterial({ color: 0xe8d8c8, roughness: 0.5 }); });
    S.eyes = [-1, 1].map(sx => { const e = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex.dot, color: 0xff2000, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0 })); e.scale.set(0.18, 0.18, 1); e.position.set(sx * 0.04, 0.152, 0.11); d.head.add(e); return e; });
    S.doll = d; S.dollYaw = Math.PI;
    d.group.rotation.y = Math.PI;
    S.hud = cameraPanel(1024, 200, 0.42, 0.082, 0.2, -0.75, 990);
    S.intro = cameraPanel(1280, 760, 1.0, 0.594, -0.04, -1.05, 995); S.intro.last = -1;
    N.onLevelMsg(onNet);
}

function buildHall() {
    addCrispBlock(0, -0.5, (Z0 + Z1) / 2, AX * 2 + 2, 1, Z0 - Z1 + 2, 0x6a6a74, 0x101018, tex.floor, { rough: tex.floorRough });
    addCrispBlock(0, H + 0.5, (Z0 + Z1) / 2, AX * 2 + 2, 1, Z0 - Z1 + 2, 0x3a3a46, 0x101018);
    for (const s of [-1, 1]) addCrispBlock(s * (AX + 0.5), H / 2, (Z0 + Z1) / 2, 1, H, Z0 - Z1 + 2, 0x9a9aa8, 0x20202a, tex.wall);
    addCrispBlock(0, H / 2, Z0 + 0.5, AX * 2 + 2, H, 1, 0x9a9aa8, 0x20202a, tex.wall);
    addCrispBlock(0, H / 2, Z1 - 0.5, AX * 2 + 2, H, 1, 0x9a9aa8, 0x20202a, tex.wall);
    addCrispBlock(0, 0.25, DOLL_Z, 3.4, 0.5, 2, 0x3a3048, 0xff3030);   // podest lalki
    // Linie startu (biała) i mety (czerwona szachownica)
    const line = (z, col, w) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(AX * 2, w), new THREE.MeshBasicMaterial({ color: col })); m.rotation.x = -Math.PI / 2; m.position.set(0, 0.012, z); L.root.add(m); };
    line(START_Z, 0xffffff, 0.3); line(FINISH_Z, 0xff4040, 0.6);
    const c = T.makeCanvas(1024, 128), g = c.getContext('2d');
    g.fillStyle = '#ffd23a'; g.fillRect(0, 0, 1024, 128); for (let i = 0; i < 32; i++) for (let j = 0; j < 4; j++) if ((i + j) % 2) { g.fillStyle = '#101010'; g.fillRect(i * 32, j * 32, 32, 32); }
    g.fillStyle = 'rgba(0,0,0,0.6)'; g.fillRect(352, 32, 320, 64); g.fillStyle = '#fff'; g.font = 'bold 52px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('FINISH', 512, 66);
    const ban = new THREE.Mesh(new THREE.PlaneGeometry(AX * 2, 1.8), new THREE.MeshBasicMaterial({ map: T.toTex(c, false), toneMapped: false, side: THREE.DoubleSide })); ban.position.set(0, 4.5, FINISH_Z); L.root.add(ban);
    // Światło sygnalizacyjne: dwie duże lampy pod sufitem po bokach lalki + światło punktowe
    S.lamps = [-1, 1].map(sx => { const m = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.4, 2.4), new THREE.MeshBasicMaterial({ color: 0x30ff60 })); m.position.set(sx * 4.2, H - 0.4, DOLL_Z + 1); L.root.add(m); return m; });
    S.sig = new THREE.PointLight(0x30ff60, 90, 40, 1.3); S.sig.position.set(0, H - 1.5, -6); L.root.add(S.sig);
    for (let z = 14; z > Z1; z -= 12) { const l = new THREE.PointLight(0xffe8d0, 30, 22, 1.5); l.position.set(0, H - 1.5, z); L.root.add(l); }
}

// ---------- SIEĆ ----------
const isAuth = () => { if (N.NET.mode !== 'guest') return true; const hs = N.hostState(); return !(hs && hs.lvl === 'redlight' && S.clock - S.lastHostMsg < 1.5); };
function participants() {
    const list = ['me'];
    if (N.NET.mode === 'host') for (const id in N.playersState) { if (id === N.myId()) continue; const st = N.playersState[id]; if (st && st.lvl === 'redlight' && st.head) list.push(id); }
    return list;
}
const toNet = (id) => id === 'me' ? N.myId() : id;
const fromNet = (id) => id === N.myId() ? 'me' : id;
function onNet(msg, from) {
    if (!S || !msg) return;
    if (N.NET.mode === 'host') { if (msg.k === 'fin') handleFinish(from, msg.t); return; }
    if (msg.k !== 'st') return;
    S.lastHostMsg = S.clock;
    const prev = S.phase;
    S.phase = msg.ph; S.t = msg.t; S.order = (msg.order || []).map(fromNet); S.times = {}; S.total = msg.n || 1;
    for (const id in (msg.times || {})) S.times[fromNet(id)] = msg.times[id];
    if (msg.ln !== S.lightN) { S.lightN = msg.ln; setLight(msg.lg ? 'red' : 'green'); }
    if (msg.ph === 'countdown' && prev !== 'countdown') startedCountdown();
    if (msg.ph === 'play' && prev !== 'play') startedPlay();
    if (msg.ph === 'results' && prev !== 'results') roundOver();
}
function broadcast() {
    const times = {}; for (const id in S.times) times[toNet(id)] = S.times[id];
    N.sendLevelMsg({ k: 'st', ph: S.phase, t: S.t, order: S.order.map(toNet), times: times, n: participants().length, lg: S.light === 'red' ? 1 : 0, ln: S.lightN });
}
function setLight(l) {
    if (S.light === l) return;
    S.light = l; if (l === 'red') { S.redAt = S.clock; SFX.stinger({ x: 0, y: 2, z: DOLL_Z }); buzz('both', 0.5, 150); } else SFX.fuse();
}
function startedCountdown() {
    S.rewarded = false; S.finished = false; S.myT = 0; S.caught = 0; S.penalty = 0; S.order = []; S.times = {}; S.ghost.reset(); setLight('green');
    setPlayerPosition((Math.random() * 2 - 1) * 5, 1.0, START_Z + 1.5 + Math.random() * 2);
    toast('Get ready!', '#ff7a7a');
}
function startedPlay() { toast('GO! Run on green, freeze on red!', '#7fff90'); SFX.roar(0.4); }
function handleFinish(id, t) {
    if (S.phase !== 'play' || S.order.includes(id)) return;
    S.order.push(id); S.times[id] = Math.round(t * 10) / 10;
    if (S.order.length === 1) S.t = Math.min(S.t, GRACE);
}
function roundOver() {
    if (S.rewarded) return; S.rewarded = true;
    const total = S.total || participants().length, mine = S.order.indexOf('me');
    if (total >= 2) {
        if (mine === 0) { toast('You won!', '#7fc47f'); levelReward('redlight', REWARD, REWARD, 'won Red Light'); }
        else if (mine > 0) toast('You finished #' + (mine + 1), '#ffd27a'); else toast('You did not make it', '#e0533f');
    } else if (mine === 0) {
        const t = S.times.me, rec = recordTime('redlight', t); S.ghost.finish(rec, t);
        if (t <= PAR) { toast('Under par (' + PAR + ' s)! ' + t.toFixed(1) + ' s', '#7fc47f'); levelReward('redlight', 150, 150, 'beat the par time'); }
        else toast('Finished in ' + t.toFixed(1) + ' s. Par is ' + PAR + ' s', '#ffd27a');
    } else toast('Time ran out. Try again!', '#e0533f');
}

// ---------- MÓZG RUNDY ----------
function think(dt) {
    S.t -= dt;
    if (S.phase === 'wait') { if (S.t <= 0) { S.phase = 'countdown'; S.t = COUNTDOWN; S.total = participants().length; startedCountdown(); } }
    else if (S.phase === 'countdown') { if (S.t <= 0) { S.phase = 'play'; S.t = N.NET.mode === 'solo' ? ROUND : ROUND; S.lightT = 3; startedPlay(); } }
    else if (S.phase === 'play') {
        S.lightT -= dt;
        if (S.lightT <= 0) {
            const next = S.light === 'green' ? 'red' : 'green';
            S.lightN++; setLight(next); S.lightT = next === 'green' ? 2.5 + Math.random() * 3 : 2 + Math.random() * 1.5;
        }
        const parts = participants();
        if (S.t <= 0 || parts.every(id => S.order.includes(id))) { S.phase = 'results'; S.t = RESULTS; roundOver(); }
    } else if (S.phase === 'results' && S.t <= 0) { S.phase = 'wait'; S.t = N.NET.mode === 'solo' ? SOLO_WAIT : WAIT; S.order = []; S.times = {}; setLight('green'); }
}

// ---------- CO KLATKĘ ----------
export function update(dt, t, ctx) {
    if (!S) return;
    S.clock += dt;
    const p = ctx.body.position, auth = isAuth();
    if (S.introSkip === undefined) { S.introSkip = introSeen('redlight'); if (S.introSkip) S.introT = Math.min(S.introT, 3); }
    if (S.introT > 0) {
        S.introT -= dt; const sec = Math.max(0, Math.ceil(S.introT));
        if (sec !== S.intro.last) { S.intro.last = sec; drawInstructions(S.intro, 'Red Light, Green Light', [
            'Run to the finish line at the end of the hall. The doll watches you.',
            'GREEN: run! RED: freeze at once. After a short moment, any movement sends you back to the start.',
            'First to cross the line wins 200 Bagabucks (with 2+ players).',
            'Playing alone? It is a time trial: beat the par time for a reward. Your best run shows as a ghost.',
            'The GAMES door behind you takes you back.'], 'This closes in ' + sec + ' s', { bg: 'rgba(20,6,6,0.9)', border: '#ff5a5a', title: '#ffd8d8', text: '#f4e0e0', footer: '#ffb030', size: 29 }); }
        S.intro.mesh.visible = S.introT > 0 && !S.introSkip;
    }
    if (auth) { think(dt); if (N.NET.mode === 'host') { S.netT -= dt; if (S.netT <= 0) { S.netT = 0.2; broadcast(); } } }
    // Odliczanie: stój na starcie
    if (S.phase === 'countdown') { ctx.body.velocity.set(0, ctx.body.velocity.y, 0); const sec = Math.ceil(S.t); if (sec !== S.lastBeep && sec > 0) { S.lastBeep = sec; SFX.step(0.6); toast(String(sec), '#ffd27a'); } }
    if (S.phase === 'play' && !S.finished) {
        S.myT += dt;
        if (S.penalty > 0) { S.penalty -= dt; ctx.body.velocity.set(0, ctx.body.velocity.y, 0); }
        else if (S.light === 'red' && S.clock - S.redAt > RED_GRACE && Math.hypot(ctx.body.velocity.x, ctx.body.velocity.z) > MOVE_SPEED) {
            S.caught++; S.penalty = PENALTY; toast('You moved! Back to the start.', '#ff4a4a'); SFX.scare(); buzz('both', 0.8, 250);
            setPlayerPosition((Math.random() * 2 - 1) * 5, 1.0, START_Z + 1.5 + Math.random() * 2); ctx.body.velocity.set(0, 0, 0);
        }
        if (p.z < FINISH_Z) {
            S.finished = true; toast('Finished! ' + S.myT.toFixed(1) + ' s', '#7fc47f'); SFX.bell && SFX.bell();
            if (N.NET.mode === 'host' || N.NET.mode === 'solo') handleFinish('me', S.myT); else N.sendLevelMsg({ k: 'fin', t: S.myT });
        }
    }
    S.ghost.tick(dt, p, S.phase === 'play' && !S.finished);
    // Lalka obraca się (na czerwonym patrzy na graczy), oczy świecą, lampy zmieniają kolor
    const red = S.light === 'red' && S.phase === 'play', target = red ? 0 : Math.PI;
    let dy = target - S.dollYaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); S.dollYaw += dy * Math.min(1, dt * (red ? 14 : 5));
    S.doll.group.rotation.y = S.dollYaw; for (const e of S.eyes) e.material.opacity = red ? 1 : 0;
    const col = S.phase === 'play' ? (red ? 0xff2020 : 0x30ff60) : 0xffd060;
    for (const l of S.lamps) l.material.color.setHex(col); S.sig.color.setHex(col);
    S.hudT -= dt; if (S.hudT <= 0) { S.hudT = 0.1; drawHud(); }
}
function fmt(t) { t = Math.max(0, t); return Math.floor(t / 60) + ':' + String(Math.floor(t % 60)).padStart(2, '0') + '.' + Math.floor((t * 10) % 10); }
function drawHud() {
    const x = S.hud.ctx; panelBg(S.hud, 'rgba(20,6,6,0.72)');
    x.textBaseline = 'middle'; x.textAlign = 'left';
    x.font = 'bold 72px "Courier New", monospace'; x.fillStyle = '#ffe0e0'; x.fillText(S.phase === 'play' || S.finished ? fmt(S.finished ? S.times.me || S.myT : S.myT) : fmt(Math.max(0, S.t)), 30, 74);
    x.font = 'bold 42px "Courier New", monospace';
    let msg, col = '#ffe0e0';
    if (S.phase === 'wait') { msg = 'Starts soon'; col = '#ffb030'; }
    else if (S.phase === 'countdown') { msg = 'Get ready ' + Math.ceil(S.t); col = '#ffd27a'; }
    else if (S.phase === 'results') { const i = S.order.indexOf('me'); msg = i >= 0 ? 'Finished #' + (i + 1) : 'Round over'; col = '#9aff60'; }
    else if (S.finished) { msg = 'Finished #' + (S.order.indexOf('me') + 1); col = '#9aff60'; }
    else if (S.penalty > 0) { msg = 'BACK TO START'; col = '#ff4a4a'; }
    else if (S.light === 'red') { msg = 'FREEZE!'; col = '#ff3030'; }
    else { msg = 'RUN!'; col = '#40ff70'; }
    x.fillStyle = col; x.fillText(msg, 330, 56);
    x.font = '22px "Courier New", monospace'; x.fillStyle = '#c8a8a8'; x.fillText((N.NET.mode === 'solo' ? 'Time trial, par ' + PAR + ' s' : 'Racers: ' + participants().length) + '   Sent back: ' + S.caught, 30, 150);
    S.hud.update();
}
export function dispose() {
    if (S) { S.ghost.dispose(); S.hud.dispose(); S.intro.dispose(); }
    N.onLevelMsg(null);
    S = null;
}
