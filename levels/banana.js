// ==========================================
// GAME MODE: CAPTURE THE BANANA (wejście z salonu BagaBoo Games)
// Dwie drużyny (czerwona i niebieska), każda ma swój banan na postumencie w bazie. Ukradnij banana wroga, dotykając go dłonią,
// i zanieś na swój postument. Dotknięcie dłonią niosącego zwraca banana do bazy, a niosący wraca do swojej bazy.
// Pierwsza drużyna z 3 zdobyczami (albo więcej po 3 minutach) wygrywa 200 Bagabucks.
// Solo: grasz czerwonymi przeciw manekinowi-strażnikowi niebieskiego banana: zanieś 3 banany w 3 minuty.
// Host liczy wszystko (drużyny, banany, punkty) i rozsyła stan; zdarzenia mają numer, żeby nie powtarzały się u graczy.
// ==========================================
import { THREE, L, tex, camera, addCrispBlock } from '../core/engine.js';
import * as T from '../core/textures.js';
import { buildMannequin } from '../core/mannequin.js';
import { levelReward } from '../core/economy.js';
import { toast } from '../core/terminal.js';
import { hands, setPlayerPosition } from '../core/player.js';
import * as N from '../core/network.js';
import * as SFX from '../core/audio.js';
import { buzz } from '../core/haptics.js';
import { createBot, stepBot } from '../core/botkit.js';
import { buildDoor, cameraPanel, panelBg, drawInstructions, introSeen } from '../core/levelkit.js';
import { ARRIVAL_FROM_BANANA } from './games.js';
import { PACE } from '../core/config.js';   // mnożnik tempa ruchu gracza (core/config.js): prędkości potworów skalowane razem z ruchem

const AX = 12, AZ = 26, H = 10;                // arena 24 x 52 m
const WAIT = 15, SOLO_WAIT = 4, ROUND = 180, RESULTS = 8, REWARD = 200, WIN_SCORE = 3;
const GRAB_DIST = 0.55, CATCH_DIST = 0.5, CAPTURE_DIST = 2.2;
const BASES = [[0, 22], [0, -22]];             // baza czerwonych (zachód, z +22) i niebieskich (z -22)
const SPAWNS = [[0, 1.0, 24.5], [0, 1.0, -24.5]];
const TEAM = [{ name: 'RED', css: '#ff5a4a', hex: 0xff4030 }, { name: 'BLUE', css: '#4aa8ff', hex: 0x3090ff }];
export const info = { id: 'banana', name: 'Capture the Banana', spawn: [0, 1.0, 0] };
let S = null;
const _p = new THREE.Vector3();

export function build() {
    L.spawn = info.spawn.slice();
    L.bounds = { minX: -AX + 0.4, maxX: AX - 0.4, minZ: -AZ + 0.4, maxZ: AZ - 0.4, maxY: H - 0.4 };
    S = { clock: 0, phase: 'wait', t: N.NET.mode === 'solo' ? SOLO_WAIT : WAIT, teams: {}, score: [0, 0], carrier: [null, null], solo: true, bot: null, lastHostMsg: -10, netT: 0, hudT: 0, introT: 10, rewarded: false, ev: { n: 0 }, seenEv: 0, tags: {}, winner: -1, myTeam: 0 };
    buildArena();
    buildDoor({ x: 0, z: AZ - 0.03, rotY: Math.PI, label: 'GAMES', color: '#d080ff', wood: 0x3a3048, portal: { target: 'games', spawn: ARRIVAL_FROM_BANANA, onEnter: () => toast('Back to BagaBoo Games') } });
    // Banany (czerwony i niebieski blask pod spodem)
    S.bananas = [0, 1].map(k => buildBanana(k));
    // Bot-strażnik (solo)
    const b = buildMannequin(T.mkRng(909)); b.group.scale.setScalar(1.2); b.group.visible = false; L.root.add(b.group);
    for (const sx of [-1, 1]) { const e = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex.dot, color: 0x3090ff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); e.scale.set(0.1, 0.1, 1); e.position.set(sx * 0.04, 0.152, 0.07); b.head.add(e); }
    S.botMesh = b;
    S.hud = cameraPanel(1024, 200, 0.42, 0.082, 0.2, -0.75, 990);
    S.intro = cameraPanel(1280, 760, 1.0, 0.594, -0.04, -1.05, 995); S.intro.last = -1;
    N.onLevelMsg(onNet);
}

// Symetryczna arena: dla każdej przeszkody powstaje jej odbicie po drugiej stronie, żeby żadna drużyna nie miała przewagi
function buildArena() {
    const floor = addCrispBlock(0, -0.5, 0, AX * 2 + 2, 1, AZ * 2 + 2, 0x7a7a82, 0x101018, tex.floor, { rough: tex.floorRough });
    addCrispBlock(0, H + 0.5, 0, AX * 2 + 2, 1, AZ * 2 + 2, 0x4a4a56, 0x101018);
    for (const [x, z, w, d] of [[0, -AZ - 0.5, AX * 2 + 2, 1], [0, AZ + 0.5, AX * 2 + 2, 1], [-AX - 0.5, 0, 1, AZ * 2], [AX + 0.5, 0, 1, AZ * 2]]) addCrispBlock(x, H / 2, z, w, H, d, 0x9a9aa8, 0x20202a, tex.wall);
    // Pasy kolorów drużyn na podłodze i podesty baz
    for (const k of [0, 1]) {
        const z = BASES[k][1], zone = new THREE.Mesh(new THREE.PlaneGeometry(AX * 2, 7), new THREE.MeshBasicMaterial({ color: TEAM[k].hex, transparent: true, opacity: 0.28 }));
        zone.rotation.x = -Math.PI / 2; zone.position.set(0, 0.012, z + (k ? -1.5 : 1.5)); L.root.add(zone);
        addCrispBlock(0, 0.15, z, 3, 0.3, 3, TEAM[k].hex, 0x101018);                                   // postument
        const ring = new THREE.Mesh(new THREE.TorusGeometry(CAPTURE_DIST, 0.05, 8, 40), new THREE.MeshBasicMaterial({ color: TEAM[k].hex })); ring.rotation.x = -Math.PI / 2; ring.position.set(0, 0.03, z); L.root.add(ring);
        const l = new THREE.PointLight(TEAM[k].hex, 40, 20, 1.6); l.position.set(0, 4, z); L.root.add(l);
    }
    const col = [0x8a6a50, 0x6a7a8a, 0x7a6a8a];
    const mirror = (x, y, z, w, h, d, c) => { addCrispBlock(x, y, z, w, h, d, c, 0x201810); if (x !== 0 || z !== 0) addCrispBlock(-x, y, -z, w, h, d, c, 0x201810); };
    // Skrzynie i słupy po bokach, platforma pośrodku ze schodkami, wysokie murki do chowania się
    mirror(-7, 0.8, 9, 3, 1.6, 2, col[0]); mirror(6, 0.6, 14, 2, 1.2, 2, col[1]); mirror(-3, 1, 5, 1.6, 2, 1.6, col[2]);
    mirror(7.5, 1.5, 3, 1.2, 3, 5, col[0]); mirror(-8, 1.5, -2, 1.2, 3, 4, col[1]);
    mirror(2.5, 0.4, 1.2, 2.4, 0.8, 1.6, col[2]); mirror(4.2, 0.8, 2.6, 2.0, 1.6, 1.6, col[2]);
    addCrispBlock(0, 1.1, 0, 5, 0.4, 5, 0x5a5a72, 0xffe040);                                          // platforma środkowa (2,3 m wysokości górą)
    addCrispBlock(0, 0.55, 0, 1.2, 1.1, 1.2, 0x44445a, 0x101018);
    // Jasne lampy
    for (const [x, z] of [[-6, -12], [6, -12], [-6, 12], [6, 12], [0, 0]]) {
        const l = new THREE.PointLight(0xfff0d8, 40, 26, 1.5); l.position.set(x, H - 1.5, z); L.root.add(l);
        const f = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.08, 0.3), new THREE.MeshBasicMaterial({ color: 0xfff0d8 })); f.position.set(x, H - 0.1, z); L.root.add(f);
    }
    void floor;
}
function buildBanana(k) {
    const g = new THREE.Group(), y = new THREE.MeshStandardMaterial({ color: 0xffe040, emissive: 0xa88a10, emissiveIntensity: 0.7, roughness: 0.4 });
    const body = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.06, 10, 20, Math.PI * 0.85), y); body.rotation.set(0, 0, Math.PI * 0.575); g.add(body);
    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), new THREE.MeshStandardMaterial({ color: 0x4a3010 })); tip.position.set(-0.17, 0.12, 0); g.add(tip);
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex.dot, color: TEAM[k].hex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.8 })); glow.scale.set(1.1, 1.1, 1); g.add(glow);
    g.position.set(BASES[k][0], 1.4, BASES[k][1]); L.root.add(g);
    return g;
}
function tagSprite(k) {
    const c = T.makeCanvas(64, 64), x = c.getContext('2d');
    x.fillStyle = TEAM[k].css; x.beginPath(); x.arc(32, 32, 24, 0, 7); x.fill(); x.fillStyle = '#fff'; x.font = 'bold 30px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(k ? 'B' : 'R', 32, 34);
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: T.toTex(c, false), transparent: true, depthTest: false })); sp.scale.set(0.3, 0.3, 1); sp.renderOrder = 999; L.root.add(sp);
    return sp;
}

// ---------- SIEĆ I POMOCNIKI ----------
function isAuthority() {
    if (N.NET.mode !== 'guest') return true;
    const hs = N.hostState();
    return !(hs && hs.lvl === 'banana' && S.clock - S.lastHostMsg < 1.5);
}
function participants() {
    const list = ['me'];
    if (N.NET.mode === 'host') for (const id in N.playersState) { if (id === N.myId()) continue; const st = N.playersState[id]; if (st && st.lvl === 'banana' && st.head) list.push(id); }
    return list;
}
const toNet = (id) => id === 'me' ? N.myId() : id;
const fromNet = (id) => id === N.myId() ? 'me' : id;
function onNet(msg) {
    if (!S || !msg || N.NET.mode === 'host' || msg.k !== 'st') return;
    S.lastHostMsg = S.clock;
    const prev = S.phase;
    S.phase = msg.ph; S.t = msg.t; S.score = msg.sc || [0, 0]; S.winner = msg.w === undefined ? -1 : msg.w;
    S.carrier = (msg.car || [null, null]).map(c => c ? fromNet(c) : null);
    S.teams = {}; for (const id in (msg.teams || {})) S.teams[fromNet(id)] = msg.teams[id];
    S.myTeam = S.teams.me === undefined ? 0 : S.teams.me; S.solo = !!msg.solo;
    if (msg.ev && msg.ev.n > S.seenEv) { S.seenEv = msg.ev.n; applyEvent({ k: msg.ev.k, id: msg.ev.id ? fromNet(msg.ev.id) : null, team: msg.ev.team }); }
    if (msg.ph === 'play' && prev !== 'play') startedPlay();
    if (msg.ph === 'results' && prev !== 'results') roundOver();
}
function broadcast() {
    const teams = {}; for (const id in S.teams) teams[toNet(id)] = S.teams[id];
    N.sendLevelMsg({ k: 'st', ph: S.phase, t: S.t, sc: S.score, w: S.winner, car: S.carrier.map(c => c ? toNet(c) : null), teams: teams, solo: S.solo,
        ev: { n: S.ev.n, k: S.ev.k, id: S.ev.id ? toNet(S.ev.id) : null, team: S.ev.team } });
}
// Zdarzenie od hosta (albo własne): u każdego gracza reaguje tylko to, co go dotyczy
function applyEvent(e) {
    if (e.k === 'tag') {
        if (e.id === 'me') { const sp = SPAWNS[S.myTeam]; setPlayerPosition(sp[0], sp[1], sp[2]); toast('Tagged! The banana flies home.', '#ff6a4a'); SFX.scare(); buzz('both', 0.8, 250); }
        else toast('Banana carrier tagged!', '#ffd27a');
    } else if (e.k === 'grab') toast(e.id === 'me' ? 'You have the banana! Run home!' : TEAM[e.team].name + ' stole a banana!', e.id === 'me' ? '#ffe040' : TEAM[e.team].css);
    else if (e.k === 'cap') { toast(TEAM[e.team].name + ' scored! ' + S.score[0] + ' - ' + S.score[1], TEAM[e.team].css); SFX.bell && SFX.bell(); }
}
function post(k, id, team) { S.ev = { n: S.ev.n + 1, k: k, id: id, team: team }; S.seenEv = S.ev.n; applyEvent({ k: k, id: id, team: team }); }
function startedPlay() {
    S.rewarded = false; S.myTeam = S.teams.me === undefined ? 0 : S.teams.me;
    const sp = SPAWNS[S.myTeam]; setPlayerPosition(sp[0] + (Math.random() - 0.5) * 6, sp[1], sp[2] - (S.myTeam ? -1 : 1) * Math.random() * 1.5);
    toast('You are on the ' + TEAM[S.myTeam].name + ' team!', TEAM[S.myTeam].css);
}
function roundOver() {
    if (S.rewarded) return; S.rewarded = true;
    if (S.winner < 0) toast('Draw! Nobody wins this round.', '#ffd27a');
    else if (S.winner === S.myTeam) { toast(TEAM[S.winner].name + ' team wins!', '#7fc47f'); levelReward('banana', REWARD, REWARD, 'won Capture the Banana'); }
    else toast(TEAM[S.winner].name + ' team wins. Next time!', '#e0533f');
}
function handsOf(id) {
    if (id === 'me') return hands.L ? [hands.L.position, hands.R.position] : [];
    const st = N.playersState[id]; if (!st || !st.h1) return [];
    return [new THREE.Vector3().fromArray(st.h1.p), new THREE.Vector3().fromArray(st.h2.p)];
}
function headOf(id) {
    if (id === 'me') { camera.getWorldPosition(_p); return _p.clone(); }
    const st = N.playersState[id]; return st && st.head ? new THREE.Vector3().fromArray(st.head.p) : null;
}
const homePos = (k) => new THREE.Vector3(BASES[k][0], 1.4, BASES[k][1]);
const carrying = (id) => S.carrier.findIndex(c => c === id);   // numer banana (drużyny właściciela), który niesie id, albo -1

// ---------- MÓZG RUNDY (host albo gracz solo) ----------
function startRound() {
    const parts = participants();
    S.teams = {}; S.score = [0, 0]; S.carrier = [null, null]; S.winner = -1; S.solo = parts.length < 2;
    if (S.solo) { S.teams.me = 0; S.bot = createBot(BASES[1][0] + 3, BASES[1][1] + 3); S.bot.mode = 'patrol'; }
    else { const order = parts.slice().sort(() => Math.random() - 0.5); order.forEach((id, i) => { S.teams[id] = i % 2; }); S.bot = null; }
    S.phase = 'play'; S.t = ROUND; startedPlay();
}
function endRound() {
    const w = S.score[0] === S.score[1] ? -1 : (S.score[0] > S.score[1] ? 0 : 1);
    S.winner = w; S.phase = 'results'; S.t = RESULTS; roundOver();
}
function think(dt, p) {
    S.t -= dt;
    if (S.phase === 'wait') { if (S.t <= 0) startRound(); }
    else if (S.phase === 'play') {
        const parts = participants().filter(id => S.teams[id] !== undefined);
        for (const id of parts) {
            const team = S.teams[id], head = headOf(id); if (!head) continue;
            const enemy = 1 - team, c = carrying(id);
            if (c < 0) {
                // Kradzież: dłoń (albo głowa) blisko banana wroga, który leży w bazie
                if (S.carrier[enemy] === null) {
                    const bp = homePos(enemy), near = handsOf(id).some(h => h.distanceTo(bp) < GRAB_DIST) || head.distanceTo(bp) < 0.9;
                    if (near) { S.carrier[enemy] = id; post('grab', id, team); }
                }
            } else {
                // Zdobycz: niosący dobiegł do swojej bazy
                const base = BASES[team];
                if (Math.hypot(head.x - base[0], head.z - base[1]) < CAPTURE_DIST && head.y < 3.2) {
                    S.score[team]++; S.carrier[c] = null; post('cap', id, team);
                    if (S.score[team] >= WIN_SCORE) { endRound(); return; }
                }
            }
        }
        // Łapanie niosących przez wrogów
        for (const k of [0, 1]) {
            const cid = S.carrier[k]; if (!cid) continue;
            const hd = headOf(cid); if (!hd) { S.carrier[k] = null; continue; }
            const body = hd.clone(); body.y -= 0.45;
            for (const id of parts) {
                if (S.teams[id] === S.teams[cid]) continue;
                if (handsOf(id).some(h => h.distanceTo(hd) < CATCH_DIST || h.distanceTo(body) < CATCH_DIST + 0.05)) { S.carrier[k] = null; post('tag', cid, S.teams[cid]); break; }
            }
        }
        if (S.solo && S.bot) botThink(dt, p);
        if (S.t <= 0) endRound();
    } else if (S.phase === 'results' && S.t <= 0) { S.phase = 'wait'; S.t = N.NET.mode === 'solo' ? SOLO_WAIT : WAIT; S.bot = null; S.carrier = [null, null]; }
}
// Strażnik solo: patroluje przy swoim bananie, goni cię gdy niesiesz banana albo podejdziesz blisko
function botThink(dt, p) {
    const b = S.bot, base = BASES[1], d = Math.hypot(p.x - b.x, p.z - b.z), carrier = S.carrier[1] === 'me';
    if (carrier || d < 7) b.mode = 'chase'; else if (d > 12) b.mode = 'patrol';
    let tx, tz, speed = 2.4 * PACE;
    if (b.mode === 'chase') { tx = p.x; tz = p.z; speed = (carrier ? 4.1 : 3.6) * PACE; }
    else { if (!b.goal || Math.hypot(b.goal[0] - b.x, b.goal[1] - b.z) < 1.2) b.goal = [base[0] + (Math.random() * 2 - 1) * 5, base[1] + (Math.random() * 2 - 1) * 4]; tx = b.goal[0]; tz = b.goal[1]; }
    stepBot(b, dt, tx, tz, p.y - 0.35, speed, b.mode === 'chase');
    if (d < 1.0 && Math.abs(p.y - (b.y + 1.0)) < 1.5 && S.t < ROUND - 3) {
        if (S.carrier[1] === 'me') S.carrier[1] = null;
        post('tag', 'me', 0); b.mode = 'patrol'; b.goal = null; b.x = base[0] + 3; b.z = base[1] + 3;   // po złapaniu wraca do banana
    }
}

// ---------- CO KLATKĘ ----------
export function update(dt, t, ctx) {
    if (!S) return;
    S.clock += dt;
    const p = ctx.body.position, auth = isAuthority();
    if (S.introSkip === undefined) { S.introSkip = introSeen('banana'); if (S.introSkip) S.introT = Math.min(S.introT, 3); }
    if (S.introT > 0) {
        S.introT -= dt;
        const sec = Math.max(0, Math.ceil(S.introT));
        if (sec !== S.intro.last) { S.intro.last = sec; drawInstructions(S.intro, 'Capture the Banana', [
            'Two teams, red and blue. Each team guards its own banana in its base.',
            'Touch the enemy banana with your hand to steal it, then run it to your own base circle.',
            'If an enemy touches you while you carry it, the banana returns home and you go back to your base.',
            'First to 3 captures wins 200 Bagabucks. After 3 minutes the higher score wins.',
            'Playing alone? You are red and a mannequin guards the blue banana.',
            'The GAMES door behind you takes you back.'], 'This closes in ' + sec + ' s', { bg: 'rgba(20,16,4,0.9)', border: '#ffe040', title: '#fff4b0', text: '#f4ecd0', footer: '#ffb030', size: 28 }); }
        S.intro.mesh.visible = S.introT > 0 && !S.introSkip;
    }
    if (auth) {
        think(dt, p);
        if (N.NET.mode === 'host') { S.netT -= dt; if (S.netT <= 0) { S.netT = 0.2; broadcast(); } }
    }
    // Banany: leżą w bazach (kręcą się i unoszą) albo wiszą nad głową niosącego
    S.bananas.forEach((m, k) => {
        const c = S.carrier[k], head = c ? headOf(c) : null;
        if (head) m.position.set(head.x, head.y + 0.45, head.z); else m.position.set(BASES[k][0], 1.4 + Math.sin(t * 2 + k) * 0.12, BASES[k][1]);
        m.rotation.y = t * 1.6; m.scale.setScalar(c ? 0.8 : 1.3);
    });
    // Strażnik
    if (S.bot && S.phase === 'play') {
        const b = S.bot, m = S.botMesh; m.group.visible = true;
        m.group.position.set(b.x, b.y + (b.ground ? Math.abs(Math.sin(t * 8)) * 0.05 : 0), b.z); m.group.rotation.y = b.dir;
    } else S.botMesh.group.visible = false;
    // Znaczniki drużyn nad głowami (czerwone R, niebieskie B)
    if (S.phase === 'play') for (const id in S.teams) {
        if (id === 'me') continue;
        const head = headOf(id); if (!head) continue;
        const k = S.teams[id]; (S.tags[k + id] || (S.tags[k + id] = tagSprite(k))).position.set(head.x, head.y + 0.5, head.z);
    }
    for (const key in S.tags) S.tags[key].visible = S.phase === 'play';
    S.hudT -= dt; if (S.hudT <= 0) { S.hudT = 0.15; drawHud(); }
}
function fmt(t) { t = Math.max(0, Math.ceil(t)); return Math.floor(t / 60) + ':' + String(t % 60).padStart(2, '0'); }
function drawHud() {
    const x = S.hud.ctx; panelBg(S.hud, 'rgba(20,16,4,0.72)');
    x.textBaseline = 'middle'; x.textAlign = 'left';
    x.font = 'bold 78px "Courier New", monospace'; x.fillStyle = '#fff4c0'; x.fillText(fmt(S.t), 30, 74);
    x.font = 'bold 40px "Courier New", monospace'; x.fillStyle = TEAM[0].css; x.fillText(String(S.score[0]), 340, 52); x.fillStyle = '#fff4c0'; x.fillText('-', 385, 52); x.fillStyle = TEAM[1].css; x.fillText(String(S.score[1]), 420, 52);
    x.font = 'bold 26px "Courier New", monospace';
    let msg, col = '#fff4c0';
    if (S.phase === 'wait') { msg = 'Round starts soon'; col = '#ffb030'; }
    else if (S.phase === 'results') { msg = S.winner < 0 ? 'Draw' : TEAM[S.winner].name + ' team wins'; col = S.winner >= 0 ? TEAM[S.winner].css : '#ffd27a'; }
    else if (carrying('me') >= 0) { msg = 'Run to your base circle!'; col = '#ffe040'; }
    else { msg = 'You: ' + TEAM[S.myTeam].name + '. Steal the enemy banana!'; col = TEAM[S.myTeam].css; }
    x.fillStyle = col; x.fillText(msg, 30, 138);
    x.font = '22px "Courier New", monospace'; x.fillStyle = '#c8bca0'; x.fillText(S.solo ? 'Solo vs the guard, first to ' + WIN_SCORE : 'First to ' + WIN_SCORE + ' captures', 30, 176);
    S.hud.update();
}
export function dispose() {
    if (S) { S.hud.dispose(); S.intro.dispose(); for (const k in S.tags) L.root.remove(S.tags[k]); }
    N.onLevelMsg(null);
    S = null;
}
