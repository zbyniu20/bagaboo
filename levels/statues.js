// ==========================================
// GAME MODE: STATUES (wejście z salonu BagaBoo Games, grupa PARTY GAMES)
// Parkiet z muzyką. Gdy muzyka gra, tańczysz i biegasz, gdy nagle ucichnie, musisz zamrzeć jak posąg. Kto ruszy się podczas ciszy
// (po krótkiej chwili na wyhamowanie), odpada na balkon. Muzyka jest coraz krótsza, a cisza coraz dłuższa i podstępniejsza.
// Ostatni na parkiecie wygrywa 200 Bagabucks (2+ osoby). Solo: przetrwaj jak najwięcej rund ciszy (rekord, nagroda za 12 rund).
// Host liczy rundy i rozsyła stan co 0,2 s; ruch sprawdza każdy u siebie i zgłasza hostowi, że odpadł (jak w Last Tile).
// ==========================================
import { THREE, L, tex, camera, addCrispBlock } from '../core/engine.js';
import * as T from '../core/textures.js';
import { levelReward, recordScore } from '../core/economy.js';
import { toast } from '../core/terminal.js';
import { setPlayerPosition } from '../core/player.js';
import * as N from '../core/network.js';
import * as SFX from '../core/audio.js';
import { setMusicMute } from '../core/music.js';
import { buzz } from '../core/haptics.js';
import { buildDoor, cameraPanel, panelBg, drawInstructions, introSeen } from '../core/levelkit.js';
import { participants, isAuthority, toNet, fromNet } from '../core/roundkit.js';
import { ARRIVAL_FROM_STATUES } from './games.js';

const A = 18, H = 11, BALCONY_Y = 6;
const WAIT = 15, SOLO_WAIT = 4, MAX_ROUND = 240, RESULTS = 9, REWARD = 200, SOLO_PAR = 12;
const GRACE = 0.9, MOVE_BODY = 0.5, MOVE_HEAD = 0.8;   // sekundy na wyhamowanie po zgaśnięciu muzyki, progi ruchu ciała (m/s) i głowy (m/s)
export const info = { id: 'statues', name: 'Statues', spawn: [0, 1.0, 12] };
let S = null;
const _p = new THREE.Vector3(), _last = new THREE.Vector3();
let haveLast = false;
// Długości faz zależą od numeru rundy (c = 0, 1, 2...): muzyka krótsza, cisza dłuższa
const musicLen = (c) => Math.max(2.2, 7 - 0.3 * c) + Math.random() * 1.6;
const silenceLen = (c) => Math.min(4.6, 2.4 + 0.14 * c);

export function build() {
    L.spawn = info.spawn.slice();
    L.bounds = { minX: -A + 0.4, maxX: A - 0.4, minZ: -A + 0.4, maxZ: A - 0.4, maxY: H - 0.4 };
    S = { clock: 0, phase: 'wait', t: N.NET.mode === 'solo' ? SOLO_WAIT : WAIT, rt: 0, mode: 'music', mt: 3, cycle: 0, alive: new Set(), out: new Set(), solo: true, winner: null, iAmOut: false, survived: 0, rewarded: false, lastHostMsg: -10, netT: 0, hudT: 0, introT: 10, silentFor: 0, beat: 0, lights: [], cells: null };
    buildHall();
    buildDoor({ x: 0, z: A - 0.03, rotY: Math.PI, label: 'GAMES', color: '#d080ff', wood: 0x3a3048, portal: { target: 'games', spawn: ARRIVAL_FROM_STATUES, onEnter: () => toast('Back to BagaBoo Games') } });
    S.hud = cameraPanel(1024, 200, 0.42, 0.082, 0.2, -0.75, 990);
    S.intro = cameraPanel(1280, 760, 1.0, 0.594, -0.04, -1.05, 995); S.intro.last = -1;
    haveLast = false;
    N.onLevelMsg(onNet);
}
function buildHall() {
    const wall = 0x2a2238;
    addCrispBlock(0, H + 0.5, 0, A * 2 + 2, 1, A * 2 + 2, 0x181028, 0x302040);
    for (const [x, z, w, d] of [[0, -A - 0.5, A * 2 + 2, 1], [0, A + 0.5, A * 2 + 2, 1], [-A - 0.5, 0, 1, A * 2], [A + 0.5, 0, 1, A * 2]]) addCrispBlock(x, H / 2, z, w, H, d, wall, 0x302040);
    // Parkiet z kolorowych pól (tekstura rysowana co uderzenie rytmu); w ciszy robi się ciemny
    const fc = T.makeCanvas(256, 256); S.floorCtx = fc.getContext('2d'); S.floorTex = T.toTex(fc, true);
    const floor = addCrispBlock(0, -0.5, 0, A * 2 + 2, 1, A * 2 + 2, 0xffffff, 0x302040);
    floor.material.map = S.floorTex; floor.material.normalMap = null; floor.material.emissive = new THREE.Color(0xffffff); floor.material.emissiveMap = S.floorTex; floor.material.emissiveIntensity = 0.3; floor.material.needsUpdate = true; S.floor = floor;
    paintFloor(true);
    // Scena DJ-a przy północnej ścianie z głośnikami
    addCrispBlock(0, 0.6, -A + 1.6, 12, 1.2, 3, 0x1a1428, 0xc040ff);
    S.speakers = [];
    for (const sx of [-1, 1]) { const m = addCrispBlock(sx * 8.5, 2.2, -A + 1.4, 2.6, 4.4, 2.2, 0x14101e, 0xff40a0); S.speakers.push(m); }
    const c = T.makeCanvas(1024, 160), x = c.getContext('2d');
    x.textAlign = 'center'; x.textBaseline = 'middle'; x.font = 'bold 110px "Courier New", monospace'; x.shadowColor = '#ff40c0'; x.shadowBlur = 30; x.fillStyle = '#ffd0f4'; x.fillText('STATUES', 512, 84);
    const title = new THREE.Mesh(new THREE.PlaneGeometry(9, 1.4), new THREE.MeshBasicMaterial({ map: T.toTex(c, false), transparent: true, toneMapped: false })); title.position.set(0, 7, -A + 0.06); L.root.add(title);
    // Kula disco i reflektory (zmieniają kolor w rytm, w ciszy gasną)
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.9, 18, 14), new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 1, roughness: 0.15, envMapIntensity: 1.5 })); ball.position.set(0, H - 2.2, 0); L.root.add(ball); S.ball = ball;
    for (const [lx, lz, col] of [[-10, -10, 0xff3a8a], [10, -10, 0x3acaff], [-10, 10, 0xffe03a], [10, 10, 0x8aff3a], [0, 0, 0xc040ff]]) {
        const l = new THREE.PointLight(col, 60, 30, 1.5); l.position.set(lx, H - 1.5, lz); L.root.add(l); S.lights.push({ l: l, base: 60, col: col });
    }
    // Balkon dla wyeliminowanych (nad drzwiami, przy południowej ścianie)
    addCrispBlock(0, BALCONY_Y - 0.25, A - 1.6, A * 2 - 4, 0.5, 3.2, 0x5a4a2a, 0xffb020);
}
const HUES = [330, 190, 55, 95, 280, 20];
function paintFloor(dark) {
    const x = S.floorCtx, n = 8, cs = 256 / n;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { x.fillStyle = dark ? ((i + j) % 2 ? '#14101c' : '#1c1628') : 'hsl(' + HUES[(i * 3 + j * 5 + S.beat) % HUES.length] + ',' + (55 + ((i + j + S.beat) % 3) * 10) + '%,' + (26 + ((i * j + S.beat) % 4) * 5) + '%)'; x.fillRect(i * cs, j * cs, cs, cs); }
    S.floorTex.needsUpdate = true;
}

// ---------- SIEĆ ----------
function onNet(msg, from) {
    if (!S || !msg) return;
    if (N.NET.mode === 'host') { if (msg.k === 'out') { S.out.add(from); S.alive.delete(from); checkEnd(); } return; }
    if (msg.k !== 'st') return;
    S.lastHostMsg = S.clock;
    const prev = S.phase, prevMode = S.mode;
    S.phase = msg.ph; S.t = msg.t; S.solo = !!msg.solo; S.cycle = msg.cy || 0; S.winner = msg.w ? fromNet(msg.w) : null;
    S.alive = new Set((msg.al || []).map(fromNet)); S.out = new Set((msg.out || []).map(fromNet));
    S.mode = msg.md ? 'silent' : 'music'; if (S.mode !== prevMode) setMode(S.mode);
    if (msg.ph === 'play' && prev !== 'play') startedPlay();
    if (msg.ph === 'results' && prev !== 'results') roundOver();
}
function broadcast() {
    N.sendLevelMsg({ k: 'st', ph: S.phase, t: S.t, cy: S.cycle, md: S.mode === 'silent' ? 1 : 0, solo: S.solo, w: S.winner ? toNet(S.winner) : null, al: [...S.alive].map(toNet), out: [...S.out].map(toNet) });
}
function setMode(m) {
    S.mode = m; S.silentFor = 0;
    if (m === 'silent') { setMusicMute(true); SFX.stinger({ x: 0, y: 3, z: 0 }); S.freezeToast = true; }
    else setMusicMute(false);
    paintFloor(m === 'silent');
}
function startedPlay() {
    S.rewarded = false; S.iAmOut = false; S.survived = 0; haveLast = false;
    L.bounds = { minX: -A + 0.4, maxX: A - 0.4, minZ: -A + 0.4, maxZ: A - 0.4, maxY: H - 0.4 };
    setPlayerPosition((Math.random() * 2 - 1) * 10, 1.0, (Math.random() * 2 - 1) * 10);
    setMode('music'); toast('Dance! When the music stops, freeze!', '#ff7ae0');
}
function roundOver() {
    if (S.rewarded) return; S.rewarded = true;
    setMusicMute(false);
    L.bounds = { minX: -A + 0.4, maxX: A - 0.4, minZ: -A + 0.4, maxZ: A - 0.4, maxY: H - 0.4 };
    if (S.solo) {
        const n = S.survived || S.cycle; recordScore('statues', n);
        if (n >= SOLO_PAR) { toast('You survived ' + n + ' silences!', '#7fc47f'); levelReward('statues', 150, 150, 'survived Statues'); } else toast('You froze ' + n + ' times. Reach ' + SOLO_PAR + ' for a reward.', '#ffd27a');
    } else if (S.alive.has('me')) { toast(S.alive.size > 1 ? 'You survived!' : 'You are the last statue standing!', '#7fc47f'); levelReward('statues', REWARD, REWARD, 'won Statues'); }
    else toast('You moved! Better luck next time.', '#e0533f');
}
// Odpadnięcie lokalnego gracza: balkon, zgłoszenie hostowi
function goOut() {
    if (S.iAmOut || S.phase !== 'play') return;
    S.iAmOut = true; S.survived = S.cycle;
    L.bounds = { minX: -A + 3, maxX: A - 3, minZ: A - 3.4, maxZ: A - 0.4, maxY: H - 0.4 };
    setPlayerPosition((Math.random() * 2 - 1) * 6, BALCONY_Y + 0.9, A - 1.6);
    toast('You moved! You are out.', '#ff6a4a'); SFX.scare(); buzz('both', 0.8, 300);
    if (N.NET.mode === 'host' || N.NET.mode === 'solo') { S.out.add('me'); S.alive.delete('me'); checkEnd(); } else N.sendLevelMsg({ k: 'out' });
}
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
            const parts = participants('statues');
            S.solo = parts.length < 2; S.alive = new Set(parts); S.out = new Set(); S.winner = null; S.rt = 0; S.cycle = 0; S.mt = musicLen(0);
            S.phase = 'play'; S.t = MAX_ROUND; startedPlay();
        }
    } else if (S.phase === 'play') {
        S.rt += dt; S.mt -= dt;
        if (S.mt <= 0) {
            if (S.mode === 'music') { setMode('silent'); S.mt = silenceLen(S.cycle); }
            else { S.cycle++; setMode('music'); S.mt = musicLen(S.cycle); if (S.solo && S.cycle >= SOLO_PAR) { /* nagroda przy wyniku rundy */ } }
        }
        if (S.t <= 0) { S.survived = S.cycle; endRound(S.solo ? null : [...S.alive][0] || null); }
    } else if (S.phase === 'results' && S.t <= 0) { S.phase = 'wait'; S.t = N.NET.mode === 'solo' ? SOLO_WAIT : WAIT; setMusicMute(false); }
}

// ---------- CO KLATKĘ ----------
export function update(dt, t, ctx) {
    if (!S) return;
    S.clock += dt;
    const p = ctx.body.position, auth = isAuthority('statues', S);
    if (S.introSkip === undefined) { S.introSkip = introSeen('statues'); if (S.introSkip) S.introT = Math.min(S.introT, 3); }
    if (S.introT > 0) {
        S.introT -= dt; const sec = Math.max(0, Math.ceil(S.introT));
        if (sec !== S.intro.last) { S.intro.last = sec; drawInstructions(S.intro, 'Statues', [
            'Dance and run while the music plays. When it stops, FREEZE like a statue.',
            'You get a moment to brake. After that any movement of your body or head puts you out on the balcony.',
            'Rounds get faster: shorter music, longer silence. Last one standing wins 200 Bagabucks.',
            'Playing alone? Survive as many silences as you can. 12 is worth a reward.',
            'The GAMES door behind you takes you back.'], 'This closes in ' + sec + ' s', { bg: 'rgba(20,6,24,0.9)', border: '#ff7ae0', title: '#ffd8f6', text: '#f2dcee', footer: '#ffb030', size: 28 }); }
        S.intro.mesh.visible = S.introT > 0 && !S.introSkip;
    }
    if (auth) { think(dt); if (N.NET.mode === 'host') { S.netT -= dt; if (S.netT <= 0) { S.netT = 0.2; broadcast(); } } }
    // Ruch w ciszy: po GRACE sekundach ciało (> MOVE_BODY m/s) albo głowa (> MOVE_HEAD m/s) w ruchu = odpadasz
    camera.getWorldPosition(_p);
    const headSpeed = haveLast && dt > 0 ? _p.distanceTo(_last) / dt : 0; _last.copy(_p); haveLast = true;
    if (S.phase === 'play' && S.mode === 'silent' && !S.iAmOut) {
        S.silentFor += dt;
        if (S.silentFor > GRACE && (Math.hypot(ctx.body.velocity.x, ctx.body.velocity.z) > MOVE_BODY || headSpeed > MOVE_HEAD)) goOut();
        if (S.freezeToast) { S.freezeToast = false; if (!S.iAmOut) { toast('FREEZE!', '#ff4a4a'); buzz('both', 0.5, 200); } }
    }
    // Rytm: lampy i głośniki pulsują, parkiet zmienia kolory na każde uderzenie (ok. 112 BPM), w ciszy wszystko przygasa
    const music = S.phase === 'play' ? S.mode === 'music' : S.phase !== 'results' || true;
    const beat = Math.floor(t * 1.87);
    if (music && S.mode === 'music' && beat !== S.beatN) { S.beatN = beat; S.beat++; paintFloor(false); }
    const k = S.mode === 'music' ? 0.6 + 0.4 * Math.abs(Math.sin(t * 1.87 * Math.PI)) : 0.12;
    for (const l of S.lights) { l.l.intensity = l.base * k; l.l.color.setHex(S.mode === 'music' ? l.col : 0xff2020); }
    for (const sp of S.speakers) sp.scale.setScalar(1 + (S.mode === 'music' ? 0.04 * Math.abs(Math.sin(t * 1.87 * Math.PI)) : 0));
    S.ball.rotation.y = t * 0.8; S.floor.material.emissiveIntensity = S.mode === 'music' ? 0.3 : 0.04;
    S.hudT -= dt; if (S.hudT <= 0) { S.hudT = 0.1; drawHud(); }
    void tex;
}
function fmt(t) { t = Math.max(0, Math.ceil(t)); return Math.floor(t / 60) + ':' + String(t % 60).padStart(2, '0'); }
function drawHud() {
    const x = S.hud.ctx; panelBg(S.hud, 'rgba(20,6,24,0.72)');
    x.textBaseline = 'middle'; x.textAlign = 'left';
    x.font = 'bold 72px "Courier New", monospace'; x.fillStyle = '#ffe0f8'; x.fillText(S.phase === 'play' ? fmt(S.t) : fmt(S.t), 30, 74);
    x.font = 'bold 42px "Courier New", monospace';
    let msg, col = '#ffe0f8';
    if (S.phase === 'wait') { msg = 'Round starts soon'; col = '#ffb030'; }
    else if (S.phase === 'results') { msg = S.solo ? 'Froze ' + (S.survived || S.cycle) + ' times' : (S.alive.has('me') ? 'You win! +200' : 'Round over'); col = '#9aff60'; }
    else if (S.iAmOut) { msg = 'You moved. Watch the others.'; col = '#ff8a6a'; x.font = 'bold 30px "Courier New", monospace'; }
    else if (S.mode === 'silent') { msg = S.silentFor < GRACE ? 'FREEZE!' : 'DO NOT MOVE'; col = '#ff3a3a'; }
    else { msg = 'DANCE!'; col = '#ff7ae0'; }
    x.fillStyle = col; x.fillText(msg, 330, 56);
    x.font = '24px "Courier New", monospace'; x.fillStyle = '#d8b8d8'; x.fillText('Silences: ' + S.cycle + (S.solo ? '   Reach ' + SOLO_PAR + ' for a reward' : '   Still standing: ' + S.alive.size), 330, 112);
    S.hud.update();
}
export const debug = () => S ? { phase: S.phase, mode: S.mode, cycle: S.cycle, out: S.iAmOut, solo: S.solo } : null;   // dla testów
export function dispose() {
    setMusicMute(false);
    if (S) { S.hud.dispose(); S.intro.dispose(); }
    N.onLevelMsg(null);
    S = null;
}
