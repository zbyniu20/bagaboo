// ==========================================
// GAME MODE: INFECTION (wejście z salonu BagaBoo Games)
// Host losuje pacjenta zero. Zarażony dotyka dłonią innych graczy (głowa albo tułów) i zaraża ich. Runda trwa 90 sekund.
// Kto nie zostanie zarażony do końca, wygrywa 200 Bagabucks. Gdy zarażą się wszyscy, wygrywa ten, kto zaraził najwięcej.
// Solo: dwa zarażone manekiny polują na ciebie przez 90 sekund.
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
import { ARRIVAL_FROM_INFECTION } from './games.js';

const A = 18, H = 10;                      // arena 36 x 36 m
const WAIT = 15, SOLO_WAIT = 4, ROUND = 90, RESULTS = 8, REWARD = 200, GRACE = 6;   // GRACE: tyle sekund pacjent zero stoi, żeby reszta mogła uciec
const SPAWNS = [[-15, 1, 15], [15, 1, 15], [-15, 1, -15], [15, 1, -15], [0, 1, 15.5], [0, 1, -15.5], [-15.5, 1, 0], [15.5, 1, 0]];
export const info = { id: 'infection', name: 'Infection', spawn: [0, 1.0, 0] };
let S = null;
const bots = {};

export function build() {
    L.spawn = info.spawn.slice();
    L.bounds = { minX: -A + 0.4, maxX: A - 0.4, minZ: -A + 0.4, maxZ: A - 0.4, maxY: H - 0.4 };
    S = { clock: 0, phase: 'wait', t: N.NET.mode === 'solo' ? SOLO_WAIT : WAIT, inf: new Set(), kills: {}, zero: null, solo: true, bots: [], lastHostMsg: -10, netT: 0, hudT: 0, introT: 10, rewarded: false, winners: [], ev: { n: 0 }, seenEv: 0, tags: {}, started: 0 };
    buildArena();
    buildDoor({ x: 0, z: A - 0.03, rotY: Math.PI, label: 'GAMES', color: '#d080ff', wood: 0x3a3048, portal: { target: 'games', spawn: ARRIVAL_FROM_INFECTION, onEnter: () => toast('Back to BagaBoo Games') } });
    // Zielony nalot na ekranie, gdy jesteś zarażony
    S.tint = new THREE.Mesh(new THREE.PlaneGeometry(3, 3), new THREE.MeshBasicMaterial({ color: 0x30ff50, transparent: true, opacity: 0, depthTest: false }));
    S.tint.position.z = -0.25; S.tint.renderOrder = 1003; camera.add(S.tint);
    // Boty (solo): dwa zarażone manekiny
    for (let i = 0; i < 2; i++) {
        const m = buildMannequin(T.mkRng(500 + i)); m.group.scale.setScalar(1.2); m.group.visible = false; L.root.add(m.group);
        m.group.traverse(o => { if (o.isMesh && o.material && o.material.map) o.material = new THREE.MeshStandardMaterial({ color: 0x5a7a4a, roughness: 0.9, emissive: 0x103010 }); });
        for (const sx of [-1, 1]) { const e = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex.dot, color: 0x40ff50, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); e.scale.set(0.1, 0.1, 1); e.position.set(sx * 0.04, 0.152, 0.11); m.head.add(e); }
        S.bots.push({ mesh: m, st: null });
    }
    S.hud = cameraPanel(1024, 200, 0.42, 0.082, 0.2, -0.75, 990);
    S.intro = cameraPanel(1280, 760, 1.0, 0.594, -0.04, -1.05, 995); S.intro.last = -1;
    N.onLevelMsg(onNet);
}

// Arena: kilkanaście skrzyń i murków w stałym układzie (ten sam u wszystkich), wolne pasy przy ścianach
function buildArena() {
    const R = T.mkRng(1313), boxes = [];
    addCrispBlock(0, -0.5, 0, A * 2 + 2, 1, A * 2 + 2, 0x5a6a5a, 0x101810, tex.floor, { rough: tex.floorRough });
    addCrispBlock(0, H + 0.5, 0, A * 2 + 2, 1, A * 2 + 2, 0x34403a, 0x101810);
    for (const [x, z, w, d] of [[0, -A - 0.5, A * 2 + 2, 1], [0, A + 0.5, A * 2 + 2, 1], [-A - 0.5, 0, 1, A * 2], [A + 0.5, 0, 1, A * 2]]) addCrispBlock(x, H / 2, z, w, H, d, 0x8a9a8a, 0x182018, tex.wall);
    const fits = (x, z, w, d) => Math.abs(x) + w / 2 < A - 4 && Math.abs(z) + d / 2 < A - 4 && Math.hypot(x, z) > 2.5 && boxes.every(b => Math.abs(x - b.x) > (w + b.w) / 2 + 0.9 || Math.abs(z - b.z) > (d + b.d) / 2 + 0.9);
    for (let i = 0; i < 70 && boxes.length < 20; i++) {
        const horiz = R() < 0.5, wall = R() < 0.35, w = wall ? (horiz ? 4.5 : 0.8) : 1.2 + R() * 1.4, d = wall ? (horiz ? 0.8 : 4.5) : 1.2 + R() * 1.4, h = wall ? 2.4 : 0.9 + R() * 1.3;
        const x = (R() * 2 - 1) * (A - 4), z = (R() * 2 - 1) * (A - 4);
        if (!fits(x, z, w, d)) continue;
        addCrispBlock(x, h / 2, z, w, h, d, wall ? 0x5a6a5a : (R() < 0.5 ? 0x8a8a5a : 0x6a7a8a), 0x182018, tex.wall); boxes.push({ x: x, z: z, w: w, d: d });
    }
    for (const [x, z] of [[-9, -9], [9, -9], [-9, 9], [9, 9], [0, 0]]) {
        const l = new THREE.PointLight(0xe8ffe8, 38, 26, 1.5); l.position.set(x, H - 1.5, z); L.root.add(l);
        const f = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.08, 0.3), new THREE.MeshBasicMaterial({ color: 0xe8ffe8 })); f.position.set(x, H - 0.1, z); L.root.add(f);
    }
}
function tagSprite() {
    const c = T.makeCanvas(256, 64), x = c.getContext('2d');
    x.font = 'bold 44px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = '#40ff50'; x.shadowColor = '#00ff30'; x.shadowBlur = 14; x.fillText('INFECTED', 128, 34);
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: T.toTex(c, false), transparent: true, depthTest: false })); sp.scale.set(1.0, 0.25, 1); sp.renderOrder = 999; L.root.add(sp);
    return sp;
}

// ---------- SIEĆ ----------
function onNet(msg) {
    if (!S || !msg || N.NET.mode === 'host' || msg.k !== 'st') return;
    S.lastHostMsg = S.clock;
    const prev = S.phase, wasInf = S.inf.has('me');
    S.phase = msg.ph; S.t = msg.t; S.solo = !!msg.solo;
    S.inf = new Set((msg.inf || []).map(fromNet)); S.winners = (msg.win || []).map(fromNet); S.zero = msg.z ? fromNet(msg.z) : null;
    if (msg.ev && msg.ev.n > S.seenEv) { S.seenEv = msg.ev.n; applyEvent({ k: msg.ev.k, id: msg.ev.id ? fromNet(msg.ev.id) : null }); }
    if (!wasInf && S.inf.has('me') && msg.ph === 'play') localInfected();
    if (msg.ph === 'play' && prev !== 'play') startedPlay();
    if (msg.ph === 'results' && prev !== 'results') roundOver();
}
function broadcast() {
    N.sendLevelMsg({ k: 'st', ph: S.phase, t: S.t, solo: S.solo, inf: [...S.inf].map(toNet), win: S.winners.map(toNet), z: S.zero ? toNet(S.zero) : null, ev: { n: S.ev.n, k: S.ev.k, id: S.ev.id ? toNet(S.ev.id) : null } });
}
function applyEvent(e) { if (e.k === 'inf' && e.id !== 'me') toast((e.id === 'bot' ? 'A mannequin' : 'Someone') + ' got infected!', '#9aff60'); }
function post(k, id) { S.ev = { n: S.ev.n + 1, k: k, id: id }; S.seenEv = S.ev.n; applyEvent({ k: k, id: id }); }
function localInfected() { toast('You are INFECTED! Touch the others!', '#40ff50'); SFX.scare(); buzz('both', 0.8, 300); }
function startedPlay() {
    S.rewarded = false; S.started = S.clock;
    const sp = SPAWNS[(Math.random() * SPAWNS.length) | 0];
    setPlayerPosition(sp[0] + (Math.random() - 0.5) * 3, sp[1], sp[2] + (Math.random() - 0.5) * 2);
    if (S.inf.has('me')) { setPlayerPosition(0, 1.0, 0); localInfected(); } else toast(S.solo ? 'Two mannequins are infected. Survive 90 s!' : 'Someone is infected! Do not get touched!', '#ff6a4a');
}
function roundOver() {
    if (S.rewarded) return; S.rewarded = true;
    if (S.winners.includes('me')) { toast('You win Infection!', '#7fc47f'); levelReward('infection', REWARD, REWARD, 'won Infection'); }
    else if (S.inf.has('me')) toast('You were infected. No reward.', '#e0533f');
    else toast('Round over.', '#ffd27a');
}

// ---------- MÓZG RUNDY ----------
function endRound() {
    const parts = S.solo ? ['me'] : participants('infection');
    const survivors = parts.filter(id => !S.inf.has(id));
    if (survivors.length) S.winners = survivors;
    else { let best = null, bv = -1; for (const id of parts) if ((S.kills[id] || 0) > bv) { best = id; bv = S.kills[id] || 0; } S.winners = best ? [best] : []; }
    S.phase = 'results'; S.t = RESULTS; roundOver();
}
function think(dt, p) {
    S.t -= dt;
    if (S.phase === 'wait') {
        if (S.t <= 0) {
            const parts = participants('infection');
            S.solo = parts.length < 2; S.inf = new Set(); S.kills = {}; S.winners = []; S.zero = null;
            if (S.solo) { S.bots.forEach((b, i) => { b.st = createBot(i ? 15 : -15, i ? -15 : -15); b.st.mode = 'chase'; }); }
            else { S.zero = parts[(Math.random() * parts.length) | 0]; S.inf.add(S.zero); }
            S.phase = 'play'; S.t = ROUND; startedPlay();
        }
    } else if (S.phase === 'play') {
        if (S.solo) { botsThink(dt, p); }
        else {
            const parts = participants('infection');
            for (const a of [...S.inf]) {
                if (a === S.zero && S.clock - S.started < GRACE) continue;
                for (const v of parts) {
                    if (S.inf.has(v)) continue;
                    if (touching(handsOf(a), headOf(v))) { S.inf.add(v); S.kills[a] = (S.kills[a] || 0) + 1; post('inf', v); if (v === 'me') localInfected(); }
                }
            }
            if (parts.every(id => S.inf.has(id))) { endRound(); return; }
        }
        if (S.t <= 0) endRound();
    } else if (S.phase === 'results' && S.t <= 0) { S.phase = 'wait'; S.t = N.NET.mode === 'solo' ? SOLO_WAIT : WAIT; S.inf = new Set(); S.zero = null; }
}
// Zarażone manekiny: ruszają po 6 s i biegną prosto do gracza (skaczą na skrzynie)
function botsThink(dt, p) {
    if (S.clock - S.started < GRACE) return;
    for (const b of S.bots) {
        stepBot(b.st, dt, p.x, p.z, p.y - 0.35, 3.6, true);
        if (!S.inf.has('me') && Math.hypot(p.x - b.st.x, p.z - b.st.z) < 1.0 && Math.abs(p.y - (b.st.y + 1.0)) < 1.5) { S.inf.add('me'); localInfected(); endRound(); return; }
    }
}

// ---------- CO KLATKĘ ----------
export function update(dt, t, ctx) {
    if (!S) return;
    S.clock += dt;
    const p = ctx.body.position, auth = isAuthority('infection', S);
    if (S.introSkip === undefined) { S.introSkip = introSeen('infection'); if (S.introSkip) S.introT = Math.min(S.introT, 3); }
    if (S.introT > 0) {
        S.introT -= dt;
        const sec = Math.max(0, Math.ceil(S.introT));
        if (sec !== S.intro.last) { S.intro.last = sec; drawInstructions(S.intro, 'Infection', [
            'One player starts infected. Infected players touch others with a hand to infect them.',
            'Run, hide and climb. Every touch on your head or body infects you and you join the hunters.',
            'Not infected after 90 seconds = 200 Bagabucks. If everyone is infected, the top infector wins.',
            'Playing alone? Two infected mannequins hunt you. They start after 6 s and can jump.',
            'The GAMES door behind you takes you back.'], 'This closes in ' + sec + ' s', { bg: 'rgba(6,16,6,0.9)', border: '#40ff50', title: '#d0ffd0', text: '#dcf0dc', footer: '#ffb030', size: 29 }); }
        S.intro.mesh.visible = S.introT > 0 && !S.introSkip;
    }
    if (auth) {
        think(dt, p);
        if (N.NET.mode === 'host') { S.netT -= dt; if (S.netT <= 0) { S.netT = 0.2; broadcast(); } }
    }
    // Znaczniki nad zarażonymi graczami i zielony nalot u zarażonego
    for (const id of S.inf) {
        if (id === 'me') continue;
        const hd = headOf(id); if (!hd) continue;
        (S.tags[id] || (S.tags[id] = tagSprite())).position.set(hd.x, hd.y + 0.5, hd.z);
    }
    for (const id in S.tags) S.tags[id].visible = S.phase === 'play' && S.inf.has(id);
    const infMe = S.inf.has('me') && (S.phase === 'play' || S.phase === 'results');
    S.tint.material.opacity += ((infMe ? 0.16 : 0) - S.tint.material.opacity) * Math.min(1, dt * 4); S.tint.visible = S.tint.material.opacity > 0.01;
    L.moveScale = infMe && S.phase === 'play' ? 1.12 : 1;   // zarażeni biegają trochę szybciej
    // Boty
    S.bots.forEach((b) => {
        if (S.solo && S.phase === 'play' && b.st) { b.mesh.group.visible = true; b.mesh.group.position.set(b.st.x, b.st.y + (b.st.ground ? Math.abs(Math.sin(t * 9)) * 0.05 : 0), b.st.z); b.mesh.group.rotation.y = b.st.dir; }
        else b.mesh.group.visible = false;
    });
    S.hudT -= dt; if (S.hudT <= 0) { S.hudT = 0.15; drawHud(); }
}
function fmt(t) { t = Math.max(0, Math.ceil(t)); return Math.floor(t / 60) + ':' + String(t % 60).padStart(2, '0'); }
function drawHud() {
    const x = S.hud.ctx; panelBg(S.hud, 'rgba(6,16,6,0.72)');
    x.textBaseline = 'middle'; x.textAlign = 'left';
    x.font = 'bold 78px "Courier New", monospace'; x.fillStyle = '#d8ffd8'; x.fillText(fmt(S.t), 30, 74);
    x.font = 'bold 28px "Courier New", monospace';
    let msg, col = '#d8ffd8';
    if (S.phase === 'wait') { msg = 'Round starts soon'; col = '#ffb030'; }
    else if (S.phase === 'results') { msg = S.winners.includes('me') ? 'You win! +200' : 'Round over'; col = '#9aff60'; }
    else if (S.inf.has('me')) { msg = 'INFECTED: touch the others!'; col = '#40ff50'; }
    else if (S.solo && S.clock - S.started < GRACE) { msg = 'RUN! Mannequins wake in ' + Math.ceil(GRACE - (S.clock - S.started)) + ' s'; col = '#ffd27a'; }
    else { msg = 'Stay clean! Do not get touched.'; col = '#ff8a6a'; }
    x.fillStyle = col; x.fillText(msg, 330, 52);
    x.font = '24px "Courier New", monospace'; x.fillStyle = '#d8ffd8';
    const total = S.solo ? 1 : participants('infection').length;
    x.fillText(S.solo ? 'Solo vs 2 mannequins' : 'Infected ' + S.inf.size + ' of ' + total, 330, 108);
    S.hud.update();
}
export function dispose() {
    if (S) { S.hud.dispose(); S.intro.dispose(); camera.remove(S.tint); for (const k in S.tags) L.root.remove(S.tags[k]); }
    L.moveScale = 1;
    N.onLevelMsg(null);
    for (const k in bots) delete bots[k];
    S = null;
}
