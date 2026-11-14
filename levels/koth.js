// ==========================================
// GAME MODE: KING OF THE HILL (wejście z salonu BagaBoo Games)
// Każdy na każdego. Na środku areny jest wzgórze ze świecącym kręgiem. Gdy stoisz w kręgu SAM, zbierasz punkty (sekundy).
// Gdy w kręgu stoi więcej osób, nikt nie punktuje. Dotknięcie dłonią gracza w kręgu zrzuca go na brzeg areny (3 s kary).
// Pierwszy z 40 sekundami albo najwięcej po 2,5 minuty wygrywa 200 Bagabucks.
// Solo: rywalem jest manekin, który wchodzi na wzgórze; zrzuć go dłonią i zajmij krąg.
// ==========================================
import { THREE, L, tex, camera, addCrispBlock } from '../core/engine.js';
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
import { ARRIVAL_FROM_KOTH } from './games.js';

const A = 17, H = 12;                      // arena 34 x 34 m
const HILL_TOP = 1.4, ZONE_R = 3.3;
const WAIT = 15, SOLO_WAIT = 4, ROUND = 150, RESULTS = 8, REWARD = 200, WIN_SECONDS = 40, STUN = 3, KNOCK_COOLDOWN = 2;
export const info = { id: 'koth', name: 'King of the Hill', spawn: [0, 1.0, 15] };
let S = null;

export function build() {
    L.spawn = info.spawn.slice();
    L.bounds = { minX: -A + 0.4, maxX: A - 0.4, minZ: -A + 0.4, maxZ: A - 0.4, maxY: H - 0.4 };
    S = { clock: 0, phase: 'wait', t: N.NET.mode === 'solo' ? SOLO_WAIT : WAIT, scores: {}, occ: null, stun: {}, immune: {}, bot: null, lastHostMsg: -10, netT: 0, hudT: 0, introT: 10, rewarded: false, winner: null, ev: { n: 0 }, seenEv: 0, solo: true };
    buildArena();
    buildDoor({ x: 0, z: A - 0.03, rotY: Math.PI, label: 'GAMES', color: '#d080ff', wood: 0x3a3048, portal: { target: 'games', spawn: ARRIVAL_FROM_KOTH, onEnter: () => toast('Back to BagaBoo Games') } });
    // Krąg wzgórza: tarcza i obręcz zmieniają kolor (zielony wolny, żółty ktoś trzyma, czerwony spór)
    S.zone = new THREE.Mesh(new THREE.CircleGeometry(ZONE_R, 40), new THREE.MeshBasicMaterial({ color: 0x40ff70, transparent: true, opacity: 0.35, depthWrite: false }));
    S.zone.rotation.x = -Math.PI / 2; S.zone.position.set(0, HILL_TOP + 0.02, 0); L.root.add(S.zone);
    S.ring = new THREE.Mesh(new THREE.TorusGeometry(ZONE_R, 0.06, 8, 48), new THREE.MeshBasicMaterial({ color: 0x40ff70 }));
    S.ring.rotation.x = -Math.PI / 2; S.ring.position.set(0, HILL_TOP + 0.05, 0); L.root.add(S.ring);
    S.light = new THREE.PointLight(0x40ff70, 40, 14, 1.6); S.light.position.set(0, HILL_TOP + 3, 0); L.root.add(S.light);
    // Bot (solo)
    const b = buildMannequin(T.mkRng(321)); b.group.scale.setScalar(1.2); b.group.visible = false; L.root.add(b.group);
    for (const sx of [-1, 1]) { const e = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex.dot, color: 0xffd030, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); e.scale.set(0.1, 0.1, 1); e.position.set(sx * 0.04, 0.152, 0.11); b.head.add(e); }
    S.botMesh = b;
    S.hud = cameraPanel(1024, 200, 0.42, 0.082, 0.2, -0.75, 990);
    S.intro = cameraPanel(1280, 760, 1.0, 0.594, -0.04, -1.05, 995); S.intro.last = -1;
    N.onLevelMsg(onNet);
}

// Wzgórze ze schodami, filary i skrzynie dookoła (symetrycznie), jasne lampy
function buildArena() {
    addCrispBlock(0, -0.5, 0, A * 2 + 2, 1, A * 2 + 2, 0x7a7a82, 0x101018, tex.floor, { rough: tex.floorRough });
    addCrispBlock(0, H + 0.5, 0, A * 2 + 2, 1, A * 2 + 2, 0x4a4a56, 0x101018);
    for (const [x, z, w, d] of [[0, -A - 0.5, A * 2 + 2, 1], [0, A + 0.5, A * 2 + 2, 1], [-A - 0.5, 0, 1, A * 2], [A + 0.5, 0, 1, A * 2]]) addCrispBlock(x, H / 2, z, w, H, d, 0x9a9aa8, 0x20202a, tex.wall);
    addCrispBlock(0, HILL_TOP / 2, 0, 9.4, HILL_TOP, 9.4, 0x6a5a8a, 0xffe040);        // wzgórze
    addCrispBlock(0, 0.35, 0, 12.4, 0.7, 12.4, 0x5a4a7a, 0x302040);                   // niski stopień dookoła
    const col = [0x8a6a50, 0x6a7a8a, 0x7a6a8a];
    for (let i = 0; i < 8; i++) {   // 8 skrzyń na pierścieniu, co 45°
        const a = i / 8 * Math.PI * 2 + 0.3, r = 11.5 + (i % 2) * 2, w = 1.6 + (i % 3) * 0.5;
        addCrispBlock(Math.cos(a) * r, 0.5 + (i % 2) * 0.5, Math.sin(a) * r, w, 1 + (i % 2), w, col[i % 3], 0x201810);
    }
    for (const [x, z] of [[-13, -13], [13, -13], [-13, 13], [13, 13]]) addCrispBlock(x, H / 2, z, 1.4, H, 1.4, 0x6a6a76, 0x20202a);
    for (const [x, z] of [[-9, -9], [9, -9], [-9, 9], [9, 9], [0, 0]]) {
        const l = new THREE.PointLight(0xfff0d8, 40, 26, 1.5); l.position.set(x, H - 1.5, z); L.root.add(l);
        const f = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.08, 0.3), new THREE.MeshBasicMaterial({ color: 0xfff0d8 })); f.position.set(x, H - 0.1, z); L.root.add(f);
    }
}

// ---------- POMOCNIKI ----------
const bots = {};   // id -> { head() } dla bota (solo)
function ringSpawn() { const a = Math.random() * Math.PI * 2, r = 13.5; return [Math.cos(a) * r, 1.0, Math.sin(a) * r]; }
const inZone = (h) => h && Math.hypot(h.x, h.z) < ZONE_R + 0.2 && h.y > HILL_TOP + 0.8;
function post(k, id) { S.ev = { n: S.ev.n + 1, k: k, id: id }; S.seenEv = S.ev.n; applyEvent({ k: k, id: id }); }
function applyEvent(e) {
    if (e.k !== 'knock') return;
    if (e.id === 'me') { const sp = ringSpawn(); setPlayerPosition(sp[0], sp[1], sp[2]); toast('Knocked off the hill! 3 s penalty.', '#ff6a4a'); SFX.scare(); buzz('both', 0.8, 250); }
    else if (e.id === 'bot') { const sp = ringSpawn(); S.bot.x = sp[0]; S.bot.z = sp[2]; S.bot.y = 0; toast('You knocked the mannequin off!', '#7fc47f'); }
    else toast('A king was knocked off!', '#ffd27a');
}

// ---------- SIEĆ ----------
function onNet(msg) {
    if (!S || !msg || N.NET.mode === 'host' || msg.k !== 'st') return;
    S.lastHostMsg = S.clock;
    const prev = S.phase;
    S.phase = msg.ph; S.t = msg.t; S.solo = !!msg.solo; S.winner = msg.w ? fromNet(msg.w) : null;
    S.scores = {}; for (const id in (msg.sc || {})) S.scores[fromNet(id)] = msg.sc[id];
    S.occ = msg.occ === 'contested' ? 'contested' : (msg.occ ? fromNet(msg.occ) : null);
    if (msg.ev && msg.ev.n > S.seenEv) { S.seenEv = msg.ev.n; applyEvent({ k: msg.ev.k, id: msg.ev.id ? fromNet(msg.ev.id) : null }); }
    if (msg.ph === 'play' && prev !== 'play') startedPlay();
    if (msg.ph === 'results' && prev !== 'results') roundOver();
}
function broadcast() {
    const sc = {}; for (const id in S.scores) sc[toNet(id)] = Math.round(S.scores[id] * 10) / 10;
    N.sendLevelMsg({ k: 'st', ph: S.phase, t: S.t, sc: sc, occ: S.occ === 'contested' ? 'contested' : (S.occ ? toNet(S.occ) : null), w: S.winner ? toNet(S.winner) : null, solo: S.solo, ev: { n: S.ev.n, k: S.ev.k, id: S.ev.id ? toNet(S.ev.id) : null } });
}
function startedPlay() { S.rewarded = false; const sp = ringSpawn(); setPlayerPosition(sp[0], sp[1], sp[2]); toast('Take the hill and hold it alone!', '#40ff70'); }
function roundOver() {
    if (S.rewarded) return; S.rewarded = true;
    if (S.winner === 'me') { toast('You are the king!', '#7fc47f'); levelReward('koth', REWARD, REWARD, 'ruled the hill'); }
    else if (S.winner) toast('Someone else rules the hill.', '#e0533f');
    else toast('Nobody scored. No king this round.', '#ffd27a');
}

// ---------- MÓZG RUNDY ----------
function endRound() {
    let best = null, bv = 0;
    for (const id in S.scores) if (S.scores[id] > bv + 1e-6) { best = id; bv = S.scores[id]; }
    S.winner = best; S.phase = 'results'; S.t = RESULTS; roundOver();
}
function think(dt, p) {
    S.t -= dt;
    if (S.phase === 'wait') {
        if (S.t <= 0) {
            const parts = participants('koth');
            S.solo = parts.length < 2; S.scores = {}; S.stun = {}; S.immune = {}; S.winner = null; S.occ = null;
            for (const id of parts) S.scores[id] = 0;
            if (S.solo) { S.scores.bot = 0; S.bot = createBot(0, -14); for (const k in bots) delete bots[k]; bots.bot = { head: () => new THREE.Vector3(S.bot.x, S.bot.y + 1.6, S.bot.z) }; } else S.bot = null;
            S.phase = 'play'; S.t = ROUND; startedPlay();
        }
    } else if (S.phase === 'play') {
        const ids = Object.keys(S.scores), occupants = [];
        for (const id of ids) { if ((S.stun[id] || 0) > S.clock) continue; if (inZone(headOf(id, bots))) occupants.push(id); }
        S.occ = occupants.length === 1 ? occupants[0] : (occupants.length > 1 ? 'contested' : null);
        if (S.occ && S.occ !== 'contested') { S.scores[S.occ] += dt; if (S.scores[S.occ] >= WIN_SECONDS) { endRound(); return; } }
        // Zrzucanie: dłoń przy graczu w kręgu (atakujący nie może być ogłuszony)
        for (const v of occupants) {
            if ((S.immune[v] || 0) > S.clock) continue;
            for (const a of ids) {
                if (a === v || (S.stun[a] || 0) > S.clock) continue;
                if (touching(handsOf(a, bots), headOf(v, bots))) { S.stun[v] = S.clock + STUN; S.immune[v] = S.clock + STUN + KNOCK_COOLDOWN; post('knock', v); break; }
            }
        }
        if (S.bot) botThink(dt, p);
        if (S.t <= 0) endRound();
    } else if (S.phase === 'results' && S.t <= 0) { S.phase = 'wait'; S.t = N.NET.mode === 'solo' ? SOLO_WAIT : WAIT; S.bot = null; }
}
// Bot: wchodzi na wzgórze i stoi w kręgu; gdy jesteś w kręgu, idzie do ciebie i zrzuca cię dotykiem
function botThink(dt, p) {
    const b = S.bot;
    if ((S.stun.bot || 0) > S.clock) return;
    const me = headOf('me'), meIn = inZone(me);
    let tx = 0, tz = 0, chase = false;
    if (meIn && (S.stun.me || 0) <= S.clock) { tx = p.x; tz = p.z; chase = true; }
    else if (S.occ === 'bot') { tx = Math.sin(S.clock * 0.7) * 1.2; tz = Math.cos(S.clock * 0.7) * 1.2; }
    stepBot(b, dt, tx, tz, p.y - 0.35, chase ? 3.3 : 3.0, chase || Math.hypot(b.x, b.z) > 4);
    if (chase && Math.hypot(p.x - b.x, p.z - b.z) < 0.9 && (S.immune.me || 0) <= S.clock && S.occ !== null) { S.stun.me = S.clock + STUN; S.immune.me = S.clock + STUN + KNOCK_COOLDOWN; post('knock', 'me'); }
}

// ---------- CO KLATKĘ ----------
export function update(dt, t, ctx) {
    if (!S) return;
    S.clock += dt;
    const p = ctx.body.position, auth = isAuthority('koth', S);
    if (S.introSkip === undefined) { S.introSkip = introSeen('koth'); if (S.introSkip) S.introT = Math.min(S.introT, 3); }
    if (S.introT > 0) {
        S.introT -= dt;
        const sec = Math.max(0, Math.ceil(S.introT));
        if (sec !== S.intro.last) { S.intro.last = sec; drawInstructions(S.intro, 'King of the Hill', [
            'Climb the hill in the middle and stand inside the glowing ring.',
            'Alone in the ring = you collect seconds. Two or more people in it = nobody scores.',
            'Touch a king with your hand to knock them off. They get a 3 s penalty at the edge.',
            'First to 40 seconds, or the highest score after 2.5 minutes, wins 200 Bagabucks.',
            'Playing alone? A mannequin fights you for the hill.',
            'The GAMES door behind you takes you back.'], 'This closes in ' + sec + ' s', { bg: 'rgba(8,16,8,0.9)', border: '#40ff70', title: '#d0ffd8', text: '#dcf0e0', footer: '#ffb030', size: 29 }); }
        S.intro.mesh.visible = S.introT > 0 && !S.introSkip;
    }
    if (auth) {
        think(dt, p);
        if (N.NET.mode === 'host') { S.netT -= dt; if (S.netT <= 0) { S.netT = 0.2; broadcast(); } }
    }
    // Kara: ogłuszony gracz nie może wejść na wzgórze (lokalnie trzymamy go z dala od kręgu)
    // Bot
    if (S.bot && S.phase === 'play') {
        const b = S.bot, m = S.botMesh; m.group.visible = true;
        m.group.position.set(b.x, b.y + (b.ground ? Math.abs(Math.sin(t * 8)) * 0.05 : 0), b.z); m.group.rotation.y = b.dir;
    } else S.botMesh.group.visible = false;
    // Krąg: kolor wg stanu
    const col = S.occ === 'contested' ? 0xff4030 : (S.occ ? 0xffd030 : 0x40ff70);
    S.zone.material.color.setHex(col); S.ring.material.color.setHex(col); S.light.color.setHex(col);
    S.zone.material.opacity = 0.3 + 0.1 * Math.sin(t * 3);
    S.hudT -= dt; if (S.hudT <= 0) { S.hudT = 0.15; drawHud(); }
}
function fmt(t) { t = Math.max(0, Math.ceil(t)); return Math.floor(t / 60) + ':' + String(t % 60).padStart(2, '0'); }
function nameOf(id) { if (id === 'me') return 'You'; if (id === 'bot') return 'Mannequin'; const st = N.playersState[id]; return st && st.profile ? st.profile.name : 'Player'; }
function drawHud() {
    const x = S.hud.ctx; panelBg(S.hud, 'rgba(8,16,8,0.72)');
    x.textBaseline = 'middle'; x.textAlign = 'left';
    x.font = 'bold 76px "Courier New", monospace'; x.fillStyle = '#d8ffe0'; x.fillText(fmt(S.t), 30, 74);
    x.font = 'bold 28px "Courier New", monospace';
    let msg, col = '#d8ffe0';
    if (S.phase === 'wait') { msg = 'Round starts soon'; col = '#ffb030'; }
    else if (S.phase === 'results') { msg = S.winner === 'me' ? 'You are the KING! +200' : (S.winner ? nameOf(S.winner) + ' won' : 'No winner'); col = '#9aff60'; }
    else if ((S.stun.me || 0) > S.clock) { msg = 'Knocked off! Wait ' + Math.ceil(S.stun.me - S.clock) + ' s'; col = '#ff6a4a'; }
    else if (S.occ === 'me') { msg = 'You hold the hill!'; col = '#ffd030'; }
    else if (S.occ === 'contested') { msg = 'Contested! Nobody scores'; col = '#ff6a4a'; }
    else if (S.occ) { msg = nameOf(S.occ) + ' holds the hill'; col = '#ffd27a'; }
    else { msg = 'The hill is free!'; col = '#40ff70'; }
    x.fillStyle = col; x.fillText(msg, 330, 52);
    const top = Object.keys(S.scores).sort((a, b) => S.scores[b] - S.scores[a]).slice(0, 2);
    x.font = '24px "Courier New", monospace'; x.fillStyle = '#d8ffe0';
    top.forEach((id, i) => x.fillText(nameOf(id) + ': ' + Math.floor(S.scores[id]) + '/' + WIN_SECONDS, 330, 100 + i * 30));
    if (!top.length) x.fillText('First to ' + WIN_SECONDS + ' s of holding', 330, 100);
    S.hud.update();
}
export function dispose() {
    if (S) { S.hud.dispose(); S.intro.dispose(); }
    N.onLevelMsg(null);
    for (const k in bots) delete bots[k];
    S = null;
}
