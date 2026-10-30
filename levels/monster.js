// ==========================================
// GAME MODE: BECOME THE MONSTER (wejście z salonu BagaBoo Games)
// Host losuje jednego gracza na potwora. Potwór łapie dłonią resztę. Runda trwa 2 minuty.
// Kto nie zostanie złapany, dostaje 200 Bagabucks. Potwór dostaje 200, jeśli złapie wszystkich.
// Gdy grasz sam, goni cię manekin-bot.
// ==========================================
import { THREE, L, tex, camera, addCrispBlock } from '../core/engine.js';
import * as T from '../core/textures.js';
import { buildMannequin } from '../core/mannequin.js';
import { levelReward } from '../core/economy.js';
import { toast } from '../core/terminal.js';
import { hands } from '../core/player.js';
import * as N from '../core/network.js';
import * as SFX from '../core/audio.js';
import { buzz } from '../core/haptics.js';
import { buildDoor, cameraPanel, panelBg, drawInstructions } from '../core/levelkit.js';
import { ARRIVAL_FROM_MONSTER } from './games.js';

const A = 15, H = 10;                       // hala 30 x 30 m
const WAIT = 10, ROUND = 120, RESULTS = 8, REWARD = 200;
const CATCH_DIST = 0.5;                     // dłoń potwora tak blisko głowy lub tułowia = złapany
const BOT_SPEED = 3.0, BOT_SPEED_MAX = 4.2, BOT_REACH_Y = 2.8;
const MONSTER_BOOST = 1.15;                 // potwór jest trochę szybszy
export const info = { id: 'monster', name: 'Become the Monster', spawn: [0, 1.0, 12.5] };
let S = null;
const _p = new THREE.Vector3(), _h = new THREE.Vector3();

export function build() {
    L.spawn = info.spawn.slice();
    L.bounds = { minX: -A + 0.4, maxX: A - 0.4, minZ: -A + 0.4, maxZ: A - 0.4, maxY: H - 0.4 };
    S = { clock: 0, phase: 'wait', t: WAIT, mon: null, caught: new Set(), surv: [], lastHostMsg: -10, netT: 0, introT: 10, hudT: 0, rewarded: false, tinted: false, bot: null };
    buildArena();
    buildDoor({ x: 0, z: A - 0.03, rotY: Math.PI, label: 'GAMES', color: '#d080ff', wood: 0x3a3048, portal: { target: 'games', spawn: ARRIVAL_FROM_MONSTER, onEnter: () => toast('Back to BagaBoo Games') } });
    // Znacznik potwora (czerwona poświata i napis nad głową)
    const mc = T.makeCanvas(256, 64), mx = mc.getContext('2d');
    mx.font = 'bold 48px sans-serif'; mx.textAlign = 'center'; mx.textBaseline = 'middle'; mx.fillStyle = '#ff3a2a'; mx.shadowColor = '#ff0000'; mx.shadowBlur = 16; mx.fillText('MONSTER', 128, 34);
    S.tag = new THREE.Sprite(new THREE.SpriteMaterial({ map: T.toTex(mc, false), transparent: true, depthWrite: false })); S.tag.scale.set(1.2, 0.3, 1); S.tag.visible = false; L.root.add(S.tag);
    S.aura = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex.dot, color: 0xff1a00, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.7 })); S.aura.scale.set(2.2, 2.2, 1); S.aura.visible = false; L.root.add(S.aura);
    S.auraLight = new THREE.PointLight(0xff2010, 0, 8, 2); L.root.add(S.auraLight);
    // Bot (gdy grasz sam)
    const b = buildMannequin(T.mkRng(666)); b.group.scale.setScalar(1.25); b.group.visible = false; L.root.add(b.group);
    for (const sx of [-1, 1]) { const e = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex.dot, color: 0xff2000, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); e.scale.set(0.1, 0.1, 1); e.position.set(sx * 0.04, 0.152, 0.11); b.head.add(e); }
    S.botMesh = b;
    S.hud = cameraPanel(1024, 200, 0.42, 0.082, 0.2, -0.75, 990);
    S.intro = cameraPanel(1280, 760, 1.0, 0.594, -0.04, -1.05, 995); S.intro.last = -1;
    N.onLevelMsg(onNet);
}

// Hala magazynowa: kontenery, wieże i niskie murki do ucieczki i wspinaczki
function buildArena() {
    addCrispBlock(0, -0.5, 0, A * 2 + 2, 1, A * 2 + 2, 0x8a8a90, 0x101018, tex.floor, { rough: tex.floorRough });
    addCrispBlock(0, H + 0.5, 0, A * 2 + 2, 1, A * 2 + 2, 0x2a2a30, 0x101018);
    for (const [x, z, w, d] of [[0, -A - 0.5, A * 2 + 2, 1], [0, A + 0.5, A * 2 + 2, 1], [-A - 0.5, 0, 1, A * 2], [A + 0.5, 0, 1, A * 2]]) addCrispBlock(x, H / 2, z, w, H, d, 0x6a6e74, 0x101018);
    const cont = [[-8, -6, 2.4, 6, 0x7a2a1a], [-8, -6, 2.4, 6, 0x2a4a7a, 2.6], [7, -8, 6, 2.4, 0x2a6a3a], [6, 4, 2.4, 6, 0x7a6a1a], [-6, 6, 6, 2.4, 0x5a2a6a], [0, -1, 2.4, 2.4, 0x4a4a52]];
    for (const c of cont) addCrispBlock(c[0], (c[5] || 0) + 1.3, c[1], c[2], 2.6, c[3], c[4], 0x0a0a0a, tex.wall);
    for (const [x, z, h] of [[11, 11, 3.5], [-11, -12, 4.5], [11, -2, 2.2], [-12, 1, 3]]) addCrispBlock(x, h / 2, z, 2, h, 2, 0x5a5a60, 0x101018);
    for (const [x, z, w, d] of [[2, 8, 5, 0.4], [-2, -10, 0.4, 5], [10, 6, 0.4, 4]]) addCrispBlock(x, 0.6, z, w, 1.2, d, 0x6a6a70, 0x101018);
    for (const [x, z, c] of [[-8, -8, 0x6080ff], [8, 8, 0x6080ff], [8, -8, 0xff8040], [-8, 8, 0xff8040], [0, 0, 0xffffff]]) { const l = new THREE.PointLight(c, 14, 16, 1.8); l.position.set(x, H - 1, z); L.root.add(l); }
}

// ---------- SIEĆ I ROLA ----------
function isAuthority() {
    if (N.NET.mode !== 'guest') return true;
    const hs = N.hostState();
    return !(hs && hs.lvl === 'monster' && S.clock - S.lastHostMsg < 1.5);
}
function participants() {
    const list = ['me'];
    if (N.NET.mode === 'host') for (const id in N.playersState) { if (id === N.myId()) continue; const st = N.playersState[id]; if (st && st.lvl === 'monster' && st.head) list.push(id); }
    return list;
}
const toNet = (id) => id === 'me' ? N.myId() : id;
const fromNet = (id) => id === N.myId() ? 'me' : id;
function onNet(msg) {
    if (!S || !msg || N.NET.mode === 'host' || msg.k !== 'st') return;
    S.lastHostMsg = S.clock;
    const prev = S.phase;
    S.phase = msg.ph; S.t = msg.t; S.mon = msg.mon ? fromNet(msg.mon) : null;
    const wasCaught = S.caught.has('me');
    S.caught = new Set((msg.caught || []).map(fromNet)); S.surv = (msg.surv || []).map(fromNet);
    if (!wasCaught && S.caught.has('me')) localCaught();
    if (msg.ph === 'play' && prev !== 'play') startedRound();
    if (msg.ph === 'results' && prev !== 'results') roundOver();
}
function broadcast() {
    N.sendLevelMsg({ k: 'st', ph: S.phase, t: S.t, mon: S.mon && S.mon !== 'bot' ? toNet(S.mon) : null, caught: [...S.caught].map(toNet), surv: S.surv.map(toNet) });
}
function startedRound() {
    S.rewarded = false;
    if (S.mon === 'me') { toast('You are the MONSTER! Catch everyone!', '#ff4a2a'); SFX.roar(0.8); buzz('both', 0.8, 400); }
    else if (S.mon === 'bot') toast('The mannequin is hunting you. Survive 2 minutes!', '#ff6a4a');
    else toast('Run! Do not let the monster touch you!', '#ff6a4a');
}
function roundOver() {
    if (S.rewarded) return; S.rewarded = true;
    if (S.surv.includes('me')) { toast('You survived!', '#7fc47f'); levelReward('monster', REWARD, REWARD, 'survived the monster'); }
    else if (S.mon === 'me' && S.surv.length === 0) { toast('You caught everyone!', '#7fc47f'); levelReward('monster', REWARD, REWARD, 'caught everyone'); }
    else if (S.mon === 'me') toast('Time is up. Some escaped you.', '#ffb030');
    else toast('You were caught. No reward this round.', '#e0533f');
}

// ---------- MÓZG RUNDY (host albo gracz solo) ----------
function think(dt, p) {
    S.t -= dt;
    if (S.phase === 'wait') {
        if (S.t <= 0) {
            const parts = participants();
            S.mon = parts.length >= 2 ? parts[(Math.random() * parts.length) | 0] : 'bot';
            S.caught = new Set(); S.surv = []; S.phase = 'play'; S.t = ROUND;
            if (S.mon === 'bot') { S.bot = { x: 0, z: -12, speed: BOT_SPEED }; }
            startedRound();
        }
    } else if (S.phase === 'play') {
        const parts = participants().filter(id => id !== S.mon);
        if (S.mon === 'bot') moveBot(dt, p);
        else for (const id of parts) if (!S.caught.has(id) && touched(id)) catchPlayer(id);
        if (S.t <= 0 || parts.every(id => S.caught.has(id))) {
            S.surv = parts.filter(id => !S.caught.has(id)); S.phase = 'results'; S.t = RESULTS; roundOver();
        }
    } else if (S.phase === 'results' && S.t <= 0) { S.phase = 'wait'; S.t = WAIT; S.mon = null; S.bot = null; }
}
// Pozycja dłoni potwora i głowy gracza (lokalnie albo z sieci)
function handsOf(id) {
    if (id === 'me') return hands.L ? [hands.L.position, hands.R.position] : [];
    const st = N.playersState[id]; if (!st || !st.h1) return [];
    return [new THREE.Vector3().fromArray(st.h1.p), new THREE.Vector3().fromArray(st.h2.p)];
}
function headOf(id) {
    if (id === 'me') { camera.getWorldPosition(_p); return _p.clone(); }
    const st = N.playersState[id]; return st && st.head ? new THREE.Vector3().fromArray(st.head.p) : null;
}
function touched(id) {
    const hd = headOf(id); if (!hd) return false;
    const body = hd.clone(); body.y -= 0.45;
    return handsOf(S.mon).some(h => h.distanceTo(hd) < CATCH_DIST || h.distanceTo(body) < CATCH_DIST + 0.05);
}
function catchPlayer(id) {
    S.caught.add(id);
    if (id === 'me') localCaught();
    if (S.mon === 'me') { SFX.stinger(); buzz('both', 0.7, 150); toast('Caught one!', '#ff6a4a'); }
}
function localCaught() { SFX.scare(); toast('You were caught! Watch the others.', '#e0533f'); }
function moveBot(dt, p) {
    const b = S.bot; b.speed = Math.min(BOT_SPEED_MAX, b.speed + dt * 0.01);
    const dx = p.x - b.x, dz = p.z - b.z, d = Math.hypot(dx, dz);
    if (d > 0.05) { b.x += dx / d * b.speed * dt; b.z += dz / d * b.speed * dt; }
    // Bot omija przeszkody (wypychanie z pudełek kolizji)
    for (const o of L.obstacles) {
        const bb = o.box3; if (bb.max.y < 0.5 || bb.min.y > 2) continue;
        const r = 0.5;
        if (b.x > bb.min.x - r && b.x < bb.max.x + r && b.z > bb.min.z - r && b.z < bb.max.z + r) {
            const ex = Math.min(b.x - (bb.min.x - r), bb.max.x + r - b.x), ez = Math.min(b.z - (bb.min.z - r), bb.max.z + r - b.z);
            if (ex < ez) b.x = b.x < (bb.min.x + bb.max.x) / 2 ? bb.min.x - r : bb.max.x + r; else b.z = b.z < (bb.min.z + bb.max.z) / 2 ? bb.min.z - r : bb.max.z + r;
        }
    }
    if (d < 0.9 && p.y < BOT_REACH_Y && !S.caught.has('me')) catchPlayer('me');
}

// ---------- CO KLATKĘ ----------
export function update(dt, t, ctx) {
    if (!S) return;
    S.clock += dt;
    const p = ctx.body.position, auth = isAuthority();
    if (S.introT > 0) {
        S.introT -= dt;
        const sec = Math.max(0, Math.ceil(S.introT));
        if (sec !== S.intro.last) { S.intro.last = sec; drawInstructions(S.intro, 'Become the Monster', [
            'One player becomes the monster. Everyone else runs and climbs to stay out of reach.',
            'The monster catches you by touching your head or body with a hand.',
            'Not caught after 2 minutes = 200 Bagabucks. The monster wins 200 if it catches everyone.',
            'Playing alone? A mannequin hunts you instead. It cannot climb high.',
            'The GAMES door behind you takes you back.'], 'This closes in ' + sec + ' s', { bg: 'rgba(16,4,4,0.9)', border: '#ff4a4a', title: '#ffd0c8', text: '#f4e0dc', footer: '#ffb030', size: 30 }); }
        S.intro.mesh.visible = S.introT > 0;
    }
    if (auth) {
        think(dt, p);
        if (N.NET.mode === 'host') { S.netT -= dt; if (S.netT <= 0) { S.netT = 0.2; broadcast(); } }
    }
    // Potwór: czerwona poświata nad głową, u siebie czerwone dłonie i szybszy ruch
    const mon = S.phase === 'play' ? S.mon : null;
    let mpos = null;
    if (mon === 'bot') {
        const b = S.bot, m = S.botMesh; m.group.visible = true;
        m.group.position.set(b.x, Math.abs(Math.sin(t * 7)) * 0.05, b.z); m.group.rotation.y = Math.atan2(p.x - b.x, p.z - b.z);
        mpos = new THREE.Vector3(b.x, 2.3, b.z);
        if (Math.floor(t * 2.2) !== S.step) { S.step = Math.floor(t * 2.2); SFX.step(0.8, { x: b.x, y: 0, z: b.z }); }
    } else S.botMesh.group.visible = false;
    if (mon && mon !== 'bot') mpos = headOf(mon);
    S.tag.visible = S.aura.visible = !!mpos && mon !== 'me';
    S.auraLight.intensity = mpos && mon !== 'me' ? 5 : 0;
    if (mpos) { S.tag.position.copy(mpos).y += 0.55; S.aura.position.copy(mpos); S.auraLight.position.copy(mpos); }
    setTint(mon === 'me');
    L.moveScale = mon === 'me' ? MONSTER_BOOST : 1;
    if (mpos && mon !== 'me' && !S.caught.has('me')) { _h.copy(mpos); SFX.heartbeat(Math.max(0, 1 - _h.distanceTo(p) / 12)); }
    S.hudT -= dt; if (S.hudT <= 0) { S.hudT = 0.15; drawHud(); }
}
// Czerwone, świecące dłonie gdy jesteś potworem
function setTint(on) {
    if (on === S.tinted || !hands.L) return;
    S.tinted = on;
    for (const h of [hands.L, hands.R]) h.traverse(o => { if (o.isMesh && o.material && o.material.emissive) { if (on) { o.userData.em = o.material.emissive.getHex(); o.material.emissive.setHex(0xaa1000); } else if (o.userData.em !== undefined) o.material.emissive.setHex(o.userData.em); } });
}
function fmt(t) { t = Math.max(0, Math.ceil(t)); return Math.floor(t / 60) + ':' + String(t % 60).padStart(2, '0'); }
function drawHud() {
    const x = S.hud.ctx; panelBg(S.hud, 'rgba(16,4,4,0.72)');
    x.textBaseline = 'middle'; x.textAlign = 'left';
    x.font = 'bold 80px "Courier New", monospace'; x.fillStyle = '#ffd8d0'; x.fillText(fmt(S.t), 30, 74);
    x.font = 'bold 32px "Courier New", monospace';
    let role = '', col = '#ffd8d0';
    if (S.phase === 'wait') { role = 'Next round starts soon'; col = '#ffb030'; }
    else if (S.phase === 'results') { role = S.surv.includes('me') ? 'You survived! +200' : 'Round over'; col = '#9aff60'; }
    else if (S.mon === 'me') { role = 'You are the MONSTER'; col = '#ff4a2a'; }
    else if (S.caught.has('me')) { role = 'Caught. Watch the others.'; col = '#ff8a6a'; }
    else { role = 'Run! Stay out of reach.'; col = '#9aff60'; }
    x.fillStyle = col; x.fillText(role, 330, 52);
    const total = participants().length;
    x.fillStyle = '#ffd8d0'; x.fillText(S.phase === 'play' && S.mon !== 'bot' ? 'Caught ' + S.caught.size : (N.NET.mode === 'solo' ? 'Solo vs the mannequin' : 'Players here: ' + total), 330, 110);
    S.hud.update();
}
export function dispose() {
    if (S) { setTint(false); S.hud.dispose(); S.intro.dispose(); }
    L.moveScale = 1;
    N.onLevelMsg(null);
    S = null;
}
