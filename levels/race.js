// ==========================================
// GAME MODE: PARKOUR RACE (wejście z salonu BagaBoo Games)
// Wyścig po torze nad przepaścią: kamienie, belki, schody w górę, zygzak w dół i most z przeszkodami.
// Kto pierwszy dotrze do mety, wygrywa 200 Bagabucks (gdy gra 2 lub więcej osób). Spadek = powrót do ostatniego punktu kontrolnego.
// Gdy grasz sam, to próba czasowa: poniżej czasu wzorcowego dostajesz nagrodę, jest rekord i duch najlepszego biegu.
// Układ toru jest stały (ten sam u wszystkich). Rundy: oczekiwanie, odliczanie, wyścig, wyniki, od nowa.
// ==========================================
import { THREE, L, tex, camera, addCrispBlock } from '../core/engine.js';
import * as T from '../core/textures.js';
import { levelReward, recordTime } from '../core/economy.js';
import { toast } from '../core/terminal.js';
import { setPlayerPosition, isGrounded } from '../core/player.js';
import * as N from '../core/network.js';
import * as SFX from '../core/audio.js';
import { buzz } from '../core/haptics.js';
import { createGhost } from '../core/runkit.js';
import { buildDoor, cameraPanel, panelBg, drawInstructions, introSeen } from '../core/levelkit.js';
import { ARRIVAL_FROM_RACE } from './games.js';

const WAIT = 12, SOLO_WAIT = 4, COUNTDOWN = 4, RACE_MAX = 170, GRACE = 20, RESULTS = 9, REWARD = 200, PAR = 95;
const FALL_Y = -5;
// Ten sam sposób poruszania się co w Floor is Lava: cięższy skok, więc odstępy 0,7-1,2 m da się pokonać
const MOVE_SCALE = 0.8, MAX_UP = 4.2, MAX_SPEED_XZ = 3.8, EXTRA_GRAVITY = 1.5;   // wcześniej 3.0: trochę lżejszy skok
export const info = { id: 'race', name: 'Parkour Race', spawn: [0, 1.9, 3] };
const START = [0, 1.9, 3];
let S = null;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export function build() {
    L.spawn = info.spawn.slice();
    L.bounds = { minX: -9.6, maxX: 9.6, minZ: -139, maxZ: 8.6, maxY: 38 };
    L.moveScale = MOVE_SCALE; L.maxUp = MAX_UP; L.maxSpeedXZ = MAX_SPEED_XZ;
    L.floorY = -40;   // bez globalnej podłogi: upadek w przepaść jest naprawdę wykrywany (FALL_Y)
    S = { ghost: createGhost('race'), clock: 0, phase: 'wait', t: 0, order: [], times: {}, cps: [START.slice()], cp: 0, falls: 0, myT: 0, finished: false, lastHostMsg: -10, netT: 0, hudT: 0, introT: 10, rewarded: false, solo: true, lastBeep: -1 };
    S.t = N.NET.mode === 'solo' ? SOLO_WAIT : WAIT;
    buildHall();
    buildCourse();
    addCrispBlock(0, 3.0, 9.1, 3.4, 4, 0.4, 0x3a3248, 0x302040);   // ścianka za drzwiami wyjścia
    buildDoor({ x: 0, y: 1.0, z: 8.47, rotY: Math.PI, label: 'GAMES', color: '#d080ff', wood: 0x3a3048, portal: { target: 'games', spawn: ARRIVAL_FROM_RACE, onEnter: () => toast('Back to BagaBoo Games') } });
    S.hud = cameraPanel(1024, 200, 0.42, 0.082, 0.2, -0.75, 990);
    S.intro = cameraPanel(1280, 760, 1.0, 0.594, -0.04, -1.05, 995); S.intro.last = -1;
    N.onLevelMsg(onNet);
}

function buildHall() {
    const wall = 0x3a3248;
    addCrispBlock(0, 36, -65, 24, 1, 156, 0x201830, 0x302040);                        // sufit
    addCrispBlock(-12.5, 18, -65, 5, 40, 156, wall, 0x302040);
    addCrispBlock(12.5, 18, -65, 5, 40, 156, wall, 0x302040);
    addCrispBlock(0, 18, 12.5, 30, 40, 5, wall, 0x302040);
    addCrispBlock(0, 18, -142, 30, 40, 5, wall, 0x302040);
    // Przepaść: ciemna płaszczyzna z siatką daleko pod torem
    const c = T.makeCanvas(256, 256), x = c.getContext('2d');
    x.fillStyle = '#0a0612'; x.fillRect(0, 0, 256, 256); x.strokeStyle = 'rgba(255,60,200,0.5)'; x.lineWidth = 3;
    for (let i = 0; i <= 256; i += 64) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, 256); x.stroke(); x.beginPath(); x.moveTo(0, i); x.lineTo(256, i); x.stroke(); }
    const gt = T.toTex(c, true); gt.repeat.set(5, 38);
    const grid = new THREE.Mesh(new THREE.PlaneGeometry(20, 150), new THREE.MeshBasicMaterial({ map: gt, toneMapped: false }));
    grid.rotation.x = -Math.PI / 2; grid.position.set(0, -14, -66); L.root.add(grid);
    // Światła wzdłuż toru
    for (let z = 0; z >= -136; z -= 17) {
        const l = new THREE.PointLight(z % 34 === 0 ? 0xff5ac8 : 0x5ac8ff, 70, 30, 1.5); l.position.set(0, 14, z); L.root.add(l);
        const b = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffffff })); b.position.copy(l.position); L.root.add(b);
    }
}

function slab(x, top, z, w, d, col, edge) { return addCrispBlock(x, top - 0.25, z, w, 0.5, d, col, edge || 0x302040); }
function checkpoint(x, top, z) {
    slab(x, top, z, 4.2, 3.2, 0x2a5a3a, 0x60ff90);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.8, 0.045, 8, 32), new THREE.MeshBasicMaterial({ color: 0x60ff90 }));
    ring.rotation.x = -Math.PI / 2; ring.position.set(x, top + 0.02, z); L.root.add(ring);
    S.cps.push([x, top + 0.9, z]);
}
function buildCourse() {
    const R = T.mkRng(777), cols = [0x5a4a78, 0x4a5a78, 0x78486a];
    slab(0, 1.0, 4.0, 8, 9.2, 0x4a4a6a, 0xff5ac8);   // start (sięga aż do drzwi wyjścia)                                       // start
    let z = -2.4, x = 0, top = 1.0;
    // 1) Kamienie: odstęp 0,7-1,2 m, zmiany wysokości w górę o maks. 0,45 m
    while (z > -29) {
        const size = 1.4 + R() * 0.7; x = clamp(x + (R() * 2 - 1) * 1.9, -5.5, 5.5); top = clamp(top + (R() - 0.45) * 0.9, 0.5, 1.9);
        slab(x, top, z, size, size, cols[(R() * 3) | 0]);
        z -= size / 2 + 0.7 + R() * 0.5 + 0.85;
    }
    top = Math.max(top, 1.2); checkpoint(0, top, -31.5);   // pad -33,1..-29,9
    // 2) Belki 0,7 m szerokości, 6 m długości
    z = -36; x = 0;
    for (let i = 0; i < 4; i++) { x = clamp(x + (i % 2 ? -1.6 : 1.6), -3.2, 3.2); slab(x, top, z, 0.8, 6, 0x6a5a38, 0xffd23a); z -= 7.0; }
    checkpoint(0, top, -62.6);
    // 3) Schody w górę: 8 płyt, każda 0,55 m wyżej
    z = -66.2;
    for (let i = 0; i < 8; i++) { top += 0.55; slab(i % 2 ? 1.5 : -1.5, top, z, 2.2, 2.0, cols[i % 3]); z -= 2.9; }
    // 4) Zygzak w dół
    for (let i = 0; i < 5; i++) { top -= 0.5; slab(i % 2 ? 1.2 : -1.2, top, z, 1.8, 1.8, cols[(i + 1) % 3]); z -= 2.7; }
    checkpoint(0, top, z - 0.3);
    // 5) Most z przeszkodami i meta
    const bz = z - 0.3 - 1.6 - 1.0 - 7;                                               // środek mostu (14 m), 1 m za płytą kontrolną
    slab(0, top, bz, 2.6, 14, 0x4a5a6a, 0x5ac8ff);
    for (let i = 0; i < 3; i++) addCrispBlock(i % 2 ? 0.55 : -0.55, top + 0.7, bz + 4.5 - i * 4, 1.0, 1.4, 1.0, 0xa02a5a, 0xff5ac8);
    const padZ = bz - 7 - 1.0 - 3.5;
    slab(0, top, padZ, 8, 7, 0x6a5a2a, 0xffd23a);
    S.finish = { z: padZ + 3.0, top: top };
    // Wyjście za metą: ścianka na tylnej krawędzi platformy mety i drzwi EXIT do salonu Games
    addCrispBlock(0, top + 2, padZ - 3.7, 3.4, 4, 0.4, 0x3a3248, 0x302040);
    buildDoor({ x: 0, y: top, z: padZ - 3.47, rotY: 0, label: 'EXIT', color: '#70ff90', glow: 0x60ff90, wood: 0x3a4a3a, light: true, portal: { target: 'games', spawn: ARRIVAL_FROM_RACE, onEnter: () => toast('Back to BagaBoo Games') } });
    // Brama mety: dwa słupy i belka z napisem
    const FINISH_Z = padZ + 1.5;
    for (const s of [-1, 1]) addCrispBlock(s * 3.6, top + 2.2, FINISH_Z - 1.5, 0.5, 4.4, 0.5, 0xffd23a, 0x302040);
    const c = T.makeCanvas(512, 128), g = c.getContext('2d');
    g.fillStyle = '#ffd23a'; g.fillRect(0, 0, 512, 128);
    for (let i = 0; i < 16; i++) for (let j = 0; j < 4; j++) if ((i + j) % 2) { g.fillStyle = '#101010'; g.fillRect(i * 32, j * 32, 32, 32); }
    g.fillStyle = 'rgba(0,0,0,0.6)'; g.fillRect(96, 32, 320, 64); g.fillStyle = '#ffffff'; g.font = 'bold 52px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('FINISH', 256, 66);
    const banner = new THREE.Mesh(new THREE.PlaneGeometry(7.4, 1.8), new THREE.MeshBasicMaterial({ map: T.toTex(c, false), toneMapped: false, side: THREE.DoubleSide }));
    banner.position.set(0, top + 4.6, FINISH_Z - 1.5); L.root.add(banner);
}

// ---------- SIEĆ ----------
function isAuthority() {
    if (N.NET.mode !== 'guest') return true;
    const hs = N.hostState();
    return !(hs && hs.lvl === 'race' && S.clock - S.lastHostMsg < 1.5);
}
function participants() {
    const list = ['me'];
    if (N.NET.mode === 'host') for (const id in N.playersState) { if (id === N.myId()) continue; const st = N.playersState[id]; if (st && st.lvl === 'race' && st.head) list.push(id); }
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
    S.phase = msg.ph; S.t = msg.t; S.order = (msg.order || []).map(fromNet); S.times = {};
    for (const id in (msg.times || {})) S.times[fromNet(id)] = msg.times[id];
    S.total = msg.n || 1;
    if (msg.ph === 'countdown' && prev !== 'countdown') startedCountdown();
    if (msg.ph === 'race' && prev !== 'race') startedRace();
    if (msg.ph === 'results' && prev !== 'results') roundOver();
}
function broadcast() {
    const times = {}; for (const id in S.times) times[toNet(id)] = S.times[id];
    N.sendLevelMsg({ k: 'st', ph: S.phase, t: S.t, order: S.order.map(toNet), times: times, n: participants().length });
}
function startedCountdown() {
    S.rewarded = false; S.finished = false; S.cp = 0; S.lastPlat = null; S.falls = 0; S.myT = 0; S.order = []; S.times = {}; S.ghost.reset();
    setPlayerPosition(START[0] + (Math.random() - 0.5) * 5, START[1], START[2] + (Math.random() - 0.5) * 3);
    toast('Get ready!', '#ff7ac0');
}
function startedRace() { toast('GO!', '#7fff90'); SFX.roar(0.5); buzz('both', 0.6, 250); }
function handleFinish(id, t) {
    if (S.phase !== 'race' || S.order.includes(id)) return;
    S.order.push(id); S.times[id] = Math.round(t * 10) / 10;
    if (S.order.length === 1) S.t = Math.min(S.t, GRACE);   // po pierwszym na mecie reszta ma jeszcze chwilę
}
function roundOver() {
    if (S.rewarded) return; S.rewarded = true;
    const total = S.total || participants().length, mine = S.order.indexOf('me');
    if (total >= 2) {
        if (mine === 0) { toast('You won the race!', '#7fc47f'); levelReward('race', REWARD, REWARD, 'won the race'); }
        else if (mine > 0) toast('You finished #' + (mine + 1), '#ffd27a');
        else toast('You did not finish', '#e0533f');
    } else if (mine === 0) {
        const t = S.times.me, rec = recordTime('race', t);
        S.ghost.finish(rec, t);
        if (t <= PAR) { toast('Under par (' + PAR + ' s)! ' + t.toFixed(1) + ' s', '#7fc47f'); levelReward('race', 150, 150, 'beat the par time'); }
        else toast('Finished in ' + t.toFixed(1) + ' s. Par is ' + PAR + ' s', '#ffd27a');
    } else toast('Time ran out. Try again!', '#e0533f');
}

// ---------- MÓZG RUNDY (host albo gracz solo) ----------
function think(dt) {
    S.t -= dt;
    if (S.phase === 'wait') {
        if (S.t <= 0) { S.phase = 'countdown'; S.t = COUNTDOWN; S.total = participants().length; startedCountdown(); }
    } else if (S.phase === 'countdown') {
        if (S.t <= 0) { S.phase = 'race'; S.t = RACE_MAX; startedRace(); }
    } else if (S.phase === 'race') {
        const parts = participants();
        if (S.t <= 0 || parts.every(id => S.order.includes(id))) { S.phase = 'results'; S.t = RESULTS; roundOver(); }
    } else if (S.phase === 'results' && S.t <= 0) { S.phase = 'wait'; S.t = N.NET.mode === 'solo' ? SOLO_WAIT : WAIT; S.order = []; S.times = {}; }
}

// ---------- CO KLATKĘ ----------
export function update(dt, t, ctx) {
    if (!S) return;
    S.clock += dt;
    const p = ctx.body.position, auth = isAuthority();
    ctx.body.velocity.y -= EXTRA_GRAVITY * dt;
    if (S.introSkip === undefined) { S.introSkip = introSeen('race'); if (S.introSkip) S.introT = Math.min(S.introT, 3); }
    if (S.introT > 0) {
        S.introT -= dt;
        const sec = Math.max(0, Math.ceil(S.introT));
        if (sec !== S.intro.last) { S.intro.last = sec; drawInstructions(S.intro, 'Parkour Race', [
            'Race over the void to the FINISH gate. First one there wins 200 Bagabucks.',
            'The track has stones, narrow beams, stairs up, a zigzag down and a bridge with blocks.',
            'Green pads are checkpoints. If you fall, you return to the last one you touched.',
            'Playing alone? It is a time trial: beat the par time for a reward. Your best run shows as a ghost.',
            'The GAMES door behind you takes you back.'], 'This closes in ' + sec + ' s', { bg: 'rgba(14,6,24,0.9)', border: '#ff7ac0', title: '#ffd0ee', text: '#f0dcec', footer: '#ffb030', size: 29 }); }
        S.intro.mesh.visible = S.introT > 0 && !S.introSkip;
    }
    if (auth) {
        think(dt);
        if (N.NET.mode === 'host') { S.netT -= dt; if (S.netT <= 0) { S.netT = 0.2; broadcast(); } }
    }
    // Odliczanie: gracze stoją na linii startu
    if (S.phase === 'countdown') {
        ctx.body.velocity.set(0, 0, 0);
        const sec = Math.ceil(S.t); if (sec !== S.lastBeep && sec > 0) { S.lastBeep = sec; SFX.step(0.6); toast(String(sec), '#ffd27a'); }
    }
    if (S.phase === 'race' && !S.finished) {
        S.myT += dt;
        // Punkty kontrolne: stań na zielonej płycie
        for (let i = S.cp + 1; i < S.cps.length; i++) {
            const c = S.cps[i];
            if (Math.abs(p.x - c[0]) < 2.1 && Math.abs(p.z - c[2]) < 1.6 && Math.abs(p.y - c[1]) < 1.2) { S.cp = i; SFX.fuse(); toast('Checkpoint ' + i + '/' + (S.cps.length - 1), '#7fc47f'); }
        }
        // Ostatnia platforma, na której stałeś: tam wracasz po upadku (środek płyty, żeby nie spaść znowu z krawędzi)
        if (isGrounded()) {
            const feet = p.y - 0.35;
            for (const ob of L.obstacles) { const b = ob.box3; if (p.x >= b.min.x && p.x <= b.max.x && p.z >= b.min.z && p.z <= b.max.z && Math.abs(b.max.y - feet) < 0.45 && b.max.y > 0.4) { S.lastPlat = [(b.min.x + b.max.x) / 2, b.max.y, (b.min.z + b.max.z) / 2]; break; } }
        }
        // Spadek w przepaść: z powrotem na platformę, z której spadłeś
        if (p.y < FALL_Y) {
            const c = S.lastPlat || [S.cps[S.cp][0], S.cps[S.cp][1] - 0.9, S.cps[S.cp][2]]; setPlayerPosition(c[0], c[1] + 1.2, c[2]); ctx.body.velocity.set(0, 0, 0); S.falls++;
            toast('Fell! Back to the last platform', '#ff6a4a'); buzz('both', 0.7, 200);
        }
        // Meta
        if (p.z < S.finish.z && p.y > S.finish.top - 1) {
            S.finished = true; toast('Finished! ' + S.myT.toFixed(1) + ' s', '#7fc47f'); SFX.bell && SFX.bell();
            if (N.NET.mode === 'host' || N.NET.mode === 'solo') handleFinish('me', S.myT); else N.sendLevelMsg({ k: 'fin', t: S.myT });
        }
    }
    S.ghost.tick(dt, p, S.phase === 'race' && !S.finished);
    S.hudT -= dt; if (S.hudT <= 0) { S.hudT = 0.15; drawHud(); }
}
function fmt(t) { t = Math.max(0, t); return Math.floor(t / 60) + ':' + String(Math.floor(t % 60)).padStart(2, '0') + '.' + Math.floor((t * 10) % 10); }
function drawHud() {
    const x = S.hud.ctx; panelBg(S.hud, 'rgba(14,6,24,0.72)');
    x.textBaseline = 'middle'; x.textAlign = 'left';
    x.font = 'bold 74px "Courier New", monospace'; x.fillStyle = '#ffd8f0'; x.fillText(S.phase === 'race' || S.finished ? fmt(S.finished ? S.times.me || S.myT : S.myT) : fmt(Math.max(0, S.t)), 30, 74);
    x.font = 'bold 30px "Courier New", monospace';
    let msg, col = '#ffd8f0';
    if (S.phase === 'wait') { msg = 'Race starts soon'; col = '#ffb030'; }
    else if (S.phase === 'countdown') { msg = 'Get ready... ' + Math.ceil(S.t); col = '#ffd27a'; }
    else if (S.phase === 'results') { const i = S.order.indexOf('me'); msg = i >= 0 ? 'You finished #' + (i + 1) : 'Round over'; col = '#9aff60'; }
    else if (S.finished) { const i = S.order.indexOf('me'); msg = 'Finished #' + (i + 1); col = '#9aff60'; }
    else { msg = 'RACE!  Falls ' + S.falls; col = '#7fff90'; }
    x.fillStyle = col; x.fillText(msg, 330, 52);
    x.fillStyle = '#ffd8f0'; x.fillText('Checkpoint ' + S.cp + '/' + (S.cps.length - 1), 330, 110);
    x.font = '22px "Courier New", monospace'; x.fillStyle = '#c0a8c0'; x.fillText(N.NET.mode === 'solo' ? 'Time trial, par ' + PAR + ' s' : 'Racers here: ' + participants().length, 30, 162);
    S.hud.update();
}
export function dispose() {
    if (S) { S.ghost.dispose(); S.hud.dispose(); S.intro.dispose(); }
    L.moveScale = 1; L.maxUp = 99; L.maxSpeedXZ = 0;
    N.onLevelMsg(null);
    S = null;
}
