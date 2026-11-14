// ==========================================
// GAME MODE: DODGEBALL (wejście z salonu BagaBoo Games)
// Dwie drużyny po dwóch stronach linii środkowej (nie wolno jej przekroczyć). Na linii leży 6 piłek. Złap piłkę (chwyt jak w lobby)
// i rzuć w przeciwnika: trafiony szybką piłką wypada z gry (idzie na balkon). Wygrywa drużyna, która wyeliminuje wszystkich
// albo ma więcej graczy po 2,5 minuty (200 Bagabucks dla drużyny).
// Solo: 4 manekiny wędrują po drugiej stronie; trafiaj je piłkami w 2 minuty.
// Trafienie liczy każdy gracz u siebie (piłka musi lecieć szybko i być ostatnio dotknięta przez wroga) i zgłasza to hostowi.
// ==========================================
import { THREE, CANNON, L, tex, camera, addBody, physicsMat, GROUP, addCrispBlock } from '../core/engine.js';
import * as T from '../core/textures.js';
import { buildMannequin } from '../core/mannequin.js';
import { levelReward } from '../core/economy.js';
import { toast } from '../core/terminal.js';
import { setPlayerPosition } from '../core/player.js';
import * as N from '../core/network.js';
import * as SFX from '../core/audio.js';
import { buzz } from '../core/haptics.js';
import { createBot, stepBot } from '../core/botkit.js';
import { participants, isAuthority, handsOf, headOf, toNet, fromNet } from '../core/roundkit.js';
import { buildDoor, cameraPanel, panelBg, drawInstructions, introSeen } from '../core/levelkit.js';
import { ARRIVAL_FROM_DODGEBALL } from './games.js';

const A = 14.6, H = 14, BALCONY_Y = 7;
const WAIT = 15, SOLO_WAIT = 4, ROUND = 150, SOLO_ROUND = 120, RESULTS = 8, REWARD = 200;
const HIT_SPEED = 4.5, HIT_DIST = 0.5, OWNER_WINDOW = 5;
const TEAM = [{ name: 'RED', css: '#ff5a4a', hex: 0xff4030 }, { name: 'BLUE', css: '#4aa8ff', hex: 0x3090ff }];
const BALL_X = [-10, -6, -2, 2, 6, 10];
export const info = { id: 'dodgeball', name: 'Dodgeball', spawn: [0, 1.0, 8] };
let S = null;

export function build() {
    L.spawn = info.spawn.slice();
    L.bounds = { minX: -A + 0.4, maxX: A - 0.4, minZ: 1.0, maxZ: A - 0.4, maxY: H - 0.4 };
    S = { clock: 0, phase: 'wait', t: N.NET.mode === 'solo' ? SOLO_WAIT : WAIT, teams: {}, out: new Set(), solo: true, bots: [], balls: [], lastHostMsg: -10, netT: 0, hudT: 0, introT: 10, rewarded: false, winner: -1, myTeam: 0, iAmOut: false, ev: { n: 0 }, seenEv: 0 };
    buildArena();
    buildDoor({ x: 0, z: A - 0.03, rotY: Math.PI, label: 'GAMES', color: '#d080ff', wood: 0x3a3048, portal: { target: 'games', spawn: ARRIVAL_FROM_DODGEBALL, onEnter: () => toast('Back to BagaBoo Games') } });
    BALL_X.forEach((x, i) => S.balls.push(buildBall('dball' + i, x)));
    for (let i = 0; i < 4; i++) {   // manekiny-cele (solo)
        const m = buildMannequin(T.mkRng(600 + i)); m.group.scale.setScalar(1.2); m.group.visible = false; L.root.add(m.group);
        S.bots.push({ mesh: m, st: null, out: false, goal: null });
    }
    S.hud = cameraPanel(1024, 200, 0.42, 0.082, 0.2, -0.75, 990);
    S.intro = cameraPanel(1280, 760, 1.0, 0.594, -0.04, -1.05, 995); S.intro.last = -1;
    N.onLevelMsg(onNet);
}

function buildArena() {
    addCrispBlock(0, -0.5, 0, A * 2 + 2, 1, A * 2 + 2, 0x8a7a62, 0x181008, tex.floor, { rough: tex.floorRough });
    addCrispBlock(0, H + 0.5, 0, A * 2 + 2, 1, A * 2 + 2, 0x4a4a56, 0x101018);
    for (const [x, z, w, d] of [[0, -A - 0.5, A * 2 + 2, 1], [0, A + 0.5, A * 2 + 2, 1], [-A - 0.5, 0, 1, A * 2], [A + 0.5, 0, 1, A * 2]]) addCrispBlock(x, H / 2, z, w, H, d, 0xaaa090, 0x20202a, tex.wall);
    // Połowy boiska w kolorach drużyn i linia środkowa
    for (const k of [0, 1]) {
        const half = new THREE.Mesh(new THREE.PlaneGeometry(A * 2, A), new THREE.MeshBasicMaterial({ color: TEAM[k].hex, transparent: true, opacity: 0.22 }));
        half.rotation.x = -Math.PI / 2; half.position.set(0, 0.012, (k ? -1 : 1) * A / 2); L.root.add(half);
    }
    const line = new THREE.Mesh(new THREE.PlaneGeometry(A * 2, 0.35), new THREE.MeshBasicMaterial({ color: 0xffffff })); line.rotation.x = -Math.PI / 2; line.position.set(0, 0.015, 0); L.root.add(line);
    addCrispBlock(0, 1.1, 0, 0.2, 2.2, 0.2, 0xffffff, 0x101018).position.x = 0;   // znacznik środka
    // Balkony dla wyeliminowanych (za tylnymi ścianami boisk, wysoko)
    for (const k of [0, 1]) addCrispBlock(0, BALCONY_Y - 0.25, (k ? -1 : 1) * (A - 1.6), A * 2 - 4, 0.5, 3, TEAM[k].hex, 0x101018);
    for (const [x, z] of [[-8, -8], [8, -8], [-8, 8], [8, 8], [0, 0]]) {
        const l = new THREE.PointLight(0xfff0d8, 42, 28, 1.5); l.position.set(x, H - 2, z); L.root.add(l);
        const f = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.08, 0.3), new THREE.MeshBasicMaterial({ color: 0xfff0d8 })); f.position.set(x, H - 0.1, z); L.root.add(f);
    }
}
function buildBall(id, x) {
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.2, 24, 18), new THREE.MeshStandardMaterial({ color: 0xff3a3a, roughness: 0.4, emissive: 0x401010 }));
    mesh.castShadow = true; L.root.add(mesh);
    const body = addBody(new CANNON.Body({ mass: 1, shape: new CANNON.Sphere(0.2), position: new CANNON.Vec3(x, 0.4, 0), material: physicsMat, linearDamping: 0.05, collisionFilterGroup: GROUP.BALL, collisionFilterMask: GROUP.ENV | GROUP.BALL | GROUP.ROPE }));
    mesh.userData = { id: id, body: body }; L.throwables.push(mesh);
    return { mesh: mesh, prev: new THREE.Vector3(x, 0.4, 0), team: -1, lastT: -99, home: x };
}
function resetBalls() { for (const b of S.balls) { const body = b.mesh.userData.body; body.position.set(b.home, 0.4, 0); body.velocity.set(0, 0, 0); body.angularVelocity.set(0, 0, 0); b.team = -1; } }
function setBoundsFor(team, out) {
    const k = team === 0 ? 1 : -1;
    if (out) L.bounds = { minX: -A + 3, maxX: A - 3, minZ: k > 0 ? A - 2.9 : -A + 0.4, maxZ: k > 0 ? A - 0.4 : -A + 2.9, maxY: H - 0.4 };
    else L.bounds = { minX: -A + 0.4, maxX: A - 0.4, minZ: k > 0 ? 1.0 : -A + 0.4, maxZ: k > 0 ? A - 0.4 : -1.0, maxY: H - 0.4 };
}

// ---------- SIEĆ ----------
function onNet(msg, from) {
    if (!S || !msg) return;
    if (N.NET.mode === 'host') { if (msg.k === 'out') { S.out.add(from); checkEnd(); } return; }
    if (msg.k !== 'st') return;
    S.lastHostMsg = S.clock;
    const prev = S.phase;
    S.phase = msg.ph; S.t = msg.t; S.solo = !!msg.solo; S.winner = msg.w === undefined ? -1 : msg.w;
    S.teams = {}; for (const id in (msg.teams || {})) S.teams[fromNet(id)] = msg.teams[id];
    S.out = new Set((msg.out || []).map(fromNet));
    S.myTeam = S.teams.me === undefined ? 0 : S.teams.me;
    if (msg.ph === 'play' && prev !== 'play') startedPlay();
    if (msg.ph === 'results' && prev !== 'results') roundOver();
}
function broadcast() {
    const teams = {}; for (const id in S.teams) teams[toNet(id)] = S.teams[id];
    N.sendLevelMsg({ k: 'st', ph: S.phase, t: S.t, solo: S.solo, w: S.winner, teams: teams, out: [...S.out].map(toNet) });
}
function startedPlay() {
    S.rewarded = false; S.iAmOut = false; S.myTeam = S.teams.me === undefined ? 0 : S.teams.me;
    setBoundsFor(S.myTeam, false);
    setPlayerPosition((Math.random() * 2 - 1) * 8, 1.0, (S.myTeam ? -1 : 1) * (4 + Math.random() * 6));
    toast('You are on the ' + TEAM[S.myTeam].name + ' team! Grab a ball!', TEAM[S.myTeam].css);
}
function roundOver() {
    if (S.rewarded) return; S.rewarded = true;
    L.bounds = { minX: -A + 0.4, maxX: A - 0.4, minZ: 1.0, maxZ: A - 0.4, maxY: H - 0.4 };
    if (S.winner < 0) toast('Draw!', '#ffd27a');
    else if (S.winner === S.myTeam) { toast(TEAM[S.winner].name + ' team wins!', '#7fc47f'); levelReward('dodgeball', REWARD, REWARD, 'won Dodgeball'); }
    else toast(TEAM[S.winner].name + ' team wins. Next time!', '#e0533f');
}
function goOut() {
    if (S.iAmOut || S.phase !== 'play') return;
    S.iAmOut = true; setBoundsFor(S.myTeam, true);
    setPlayerPosition((Math.random() * 2 - 1) * 6, BALCONY_Y + 0.9, (S.myTeam ? -1 : 1) * (A - 1.6));
    toast('You are OUT! Watch from the balcony.', '#ff6a4a'); SFX.scare(); buzz('both', 0.8, 300);
    if (N.NET.mode === 'host' || N.NET.mode === 'solo') { S.out.add('me'); checkEnd(); } else N.sendLevelMsg({ k: 'out' });
}

// ---------- MÓZG RUNDY (host albo solo) ----------
function aliveIn(team) { return Object.keys(S.teams).filter(id => S.teams[id] === team && !S.out.has(id)).length; }
function endRound(winner) { S.winner = winner; S.phase = 'results'; S.t = RESULTS; roundOver(); }
function checkEnd() {
    if (S.phase !== 'play' || S.solo) return;
    const a = aliveIn(0), b = aliveIn(1);
    if (a === 0 && b === 0) endRound(-1); else if (a === 0) endRound(1); else if (b === 0) endRound(0);
}
function think(dt, p) {
    S.t -= dt;
    if (S.phase === 'wait') {
        if (S.t <= 0) {
            const parts = participants('dodgeball');
            S.solo = parts.length < 2; S.out = new Set(); S.teams = {}; S.winner = -1; resetBalls();
            if (S.solo) { S.teams.me = 0; S.bots.forEach((b, i) => { b.out = false; b.st = createBot((i - 1.5) * 6, -8); b.goal = null; }); }
            else { parts.slice().sort(() => Math.random() - 0.5).forEach((id, i) => { S.teams[id] = i % 2; }); }
            S.phase = 'play'; S.t = S.solo ? SOLO_ROUND : ROUND; startedPlay();
        }
    } else if (S.phase === 'play') {
        if (S.solo) {
            botsThink(dt);
            if (S.bots.every(b => b.out)) { S.winner = 0; S.phase = 'results'; S.t = RESULTS; roundOver(); return; }
            if (S.t <= 0) endRound(-1);
        } else if (S.t <= 0) { const a = aliveIn(0), b = aliveIn(1); endRound(a === b ? -1 : (a > b ? 0 : 1)); }
    } else if (S.phase === 'results' && S.t <= 0) { S.phase = 'wait'; S.t = N.NET.mode === 'solo' ? SOLO_WAIT : WAIT; }
}
// Manekiny-cele chodzą po swojej połowie od punktu do punktu
function botsThink(dt) {
    for (const b of S.bots) {
        if (b.out) continue;
        if (!b.goal || Math.hypot(b.goal[0] - b.st.x, b.goal[1] - b.st.z) < 1.2) b.goal = [(Math.random() * 2 - 1) * 11, -2.5 - Math.random() * 10.5];
        stepBot(b.st, dt, b.goal[0], b.goal[1], 0, 2.0, false);
        b.st.z = Math.min(-1.2, b.st.z);
    }
}

// ---------- TRAFIENIA ----------
// Kto ostatnio dotknął piłkę (każdy klient liczy to u siebie z pozycji dłoni wszystkich) i jak szybko leci
function trackBalls(dt) {
    const ids = Object.keys(S.teams);
    for (const b of S.balls) {
        const pos = b.mesh.position, sp = Math.max(b.mesh.userData.body.velocity.length(), pos.distanceTo(b.prev) / Math.max(dt, 1e-3));
        b.speed = Math.min(30, sp); b.prev.copy(pos);
        for (const id of ids) {
            if (S.out.has(id)) continue;
            if (handsOf(id).some(h => h.distanceTo(pos) < 0.4)) { b.team = S.teams[id]; b.lastT = S.clock; }
        }
    }
}
function checkHits() {
    const head = headOf('me'); if (!head) return;
    const body = head.clone(); body.y -= 0.45;
    if (!S.iAmOut && S.phase === 'play' && !S.solo) {
        for (const b of S.balls) {
            if (b.team < 0 || b.team === S.myTeam || b.speed < HIT_SPEED || S.clock - b.lastT > OWNER_WINDOW || L.heldId === b.mesh.userData.id) continue;
            const pos = b.mesh.position;
            if (pos.distanceTo(head) < HIT_DIST || pos.distanceTo(body) < HIT_DIST + 0.1) { b.team = -1; goOut(); break; }
        }
    }
    if (S.solo && S.phase === 'play') {
        for (const bot of S.bots) {
            if (bot.out) continue;
            const hd = new THREE.Vector3(bot.st.x, bot.st.y + 1.6, bot.st.z), bd = hd.clone(); bd.y -= 0.5;
            for (const b of S.balls) {
                if (b.team !== 0 || b.speed < HIT_SPEED || S.clock - b.lastT > OWNER_WINDOW) continue;
                const pos = b.mesh.position;
                if (pos.distanceTo(hd) < 0.6 || pos.distanceTo(bd) < 0.7) { bot.out = true; b.team = -1; SFX.stinger({ x: hd.x, y: hd.y, z: hd.z }); toast('Hit! ' + S.bots.filter(x => x.out).length + '/4', '#7fc47f'); break; }
            }
        }
    }
}

// ---------- CO KLATKĘ ----------
export function update(dt, t, ctx) {
    if (!S) return;
    S.clock += dt;
    const p = ctx.body.position, auth = isAuthority('dodgeball', S);
    if (S.introSkip === undefined) { S.introSkip = introSeen('dodgeball'); if (S.introSkip) S.introT = Math.min(S.introT, 3); }
    if (S.introT > 0) {
        S.introT -= dt;
        const sec = Math.max(0, Math.ceil(S.introT));
        if (sec !== S.intro.last) { S.intro.last = sec; drawInstructions(S.intro, 'Dodgeball', [
            'Two teams, red and blue, on two halves of the court. You cannot cross the center line.',
            'Grab a ball (E on desktop, grip in VR) and throw it hard at the other team.',
            'A fast ball from an enemy hits you and sends you to the balcony. Dodge or duck!',
            'The team that eliminates everyone, or has more players left after 2.5 minutes, wins 200 Bagabucks.',
            'Playing alone? Hit all 4 mannequins on the other side within 2 minutes.',
            'The GAMES door behind you takes you back.'], 'This closes in ' + sec + ' s', { bg: 'rgba(18,10,6,0.9)', border: '#ff7a4a', title: '#ffe0d0', text: '#f4e4dc', footer: '#ffb030', size: 28 }); }
        S.intro.mesh.visible = S.introT > 0 && !S.introSkip;
    }
    if (auth) {
        think(dt, p);
        if (N.NET.mode === 'host') { S.netT -= dt; if (S.netT <= 0) { S.netT = 0.2; broadcast(); } }
    }
    if (S.phase === 'play') { trackBalls(dt); checkHits(); }
    // Boty-cele
    S.bots.forEach((b) => {
        if (S.solo && S.phase === 'play' && b.st && !b.out) { b.mesh.group.visible = true; b.mesh.group.position.set(b.st.x, b.st.y + (b.st.ground ? Math.abs(Math.sin(t * 6)) * 0.04 : 0), b.st.z); b.mesh.group.rotation.y = b.st.dir; }
        else b.mesh.group.visible = false;
    });
    S.hudT -= dt; if (S.hudT <= 0) { S.hudT = 0.15; drawHud(); }
}
function fmt(t) { t = Math.max(0, Math.ceil(t)); return Math.floor(t / 60) + ':' + String(t % 60).padStart(2, '0'); }
function drawHud() {
    const x = S.hud.ctx; panelBg(S.hud, 'rgba(18,10,6,0.72)');
    x.textBaseline = 'middle'; x.textAlign = 'left';
    x.font = 'bold 78px "Courier New", monospace'; x.fillStyle = '#ffe8d8'; x.fillText(fmt(S.t), 30, 74);
    x.font = 'bold 40px "Courier New", monospace';
    if (S.solo) { x.fillStyle = '#ffe8d8'; x.fillText('Hit ' + S.bots.filter(b => b.out).length + '/4', 340, 52); }
    else { x.fillStyle = TEAM[0].css; x.fillText(String(aliveIn(0)), 340, 52); x.fillStyle = '#ffe8d8'; x.fillText('vs', 385, 52); x.fillStyle = TEAM[1].css; x.fillText(String(aliveIn(1)), 450, 52); }
    x.font = 'bold 26px "Courier New", monospace';
    let msg, col = '#ffe8d8';
    if (S.phase === 'wait') { msg = 'Round starts soon'; col = '#ffb030'; }
    else if (S.phase === 'results') { msg = S.winner < 0 ? 'Draw' : TEAM[S.winner].name + ' team wins'; col = S.winner >= 0 ? TEAM[S.winner].css : '#ffd27a'; }
    else if (S.iAmOut) { msg = 'You are out. Watch the game.'; col = '#ff8a6a'; }
    else { msg = 'You: ' + TEAM[S.myTeam].name + '. Grab a ball, throw hard!'; col = TEAM[S.myTeam].css; }
    x.fillStyle = col; x.fillText(msg, 30, 138);
    x.font = '22px "Courier New", monospace'; x.fillStyle = '#c8b8a8'; x.fillText(S.solo ? 'Solo: hit all mannequins' : 'Players here: ' + participants('dodgeball').length, 30, 176);
    S.hud.update();
}
export function dispose() {
    if (S) { S.hud.dispose(); S.intro.dispose(); }
    N.onLevelMsg(null);
    S = null;
}
