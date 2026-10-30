// ==========================================
// GAME MODE: SHOOTING RANGE (wejście z salonu BagaBoo Games)
// Pistolet w prawej dłoni, spust = strzał. Potwory wyskakują zza osłon w losowych miejscach.
// Trafiony znika, a po chwili pojawia się nowy. Runda 2 minuty. Najwięcej trafień wygrywa 200 Bagabucks.
// W multiplayerze host liczy czas i wyniki wszystkich graczy. Solo: wygrana od 25 trafień.
// ==========================================
import { THREE, L, tex, camera, addCrispBlock, addCollider } from '../core/engine.js';
import * as T from '../core/textures.js';
import { levelReward, recordScore, SAVE } from '../core/economy.js';
import { toast } from '../core/terminal.js';
import { hands } from '../core/player.js';
import * as N from '../core/network.js';
import * as SFX from '../core/audio.js';
import { buzz } from '../core/haptics.js';
import { buildDoor, cameraPanel, panelBg, drawInstructions } from '../core/levelkit.js';
import { ARRIVAL_FROM_RANGE } from './games.js';

const WAIT = 8, ROUND = 120, RESULTS = 8, REWARD = 200, SOLO_WIN = 25;
const MAX_ACTIVE = 3, SHOW_TIME = 3.5;
// Miejsca, w których potwory wyskakują (x, y dołu, z): zza skrzyń, beczek i z okien w ścianach
const SPOTS = [[-5, 1.1, -7.8], [-1, 1.1, -7.8], [4, 1.1, -8.8], [6.5, 0, -12.2], [-6.5, 0, -13.2], [0, 0, -13.2], [-3, 1.6, -15.9], [3, 1.6, -15.9],
    [-6, 0, -19.2], [6, 0, -19.2], [0, 2.2, -20.7], [-4, 0, -23.2], [4, 0, -23.2], [-7.3, 2.4, -14], [7.3, 2.4, -9], [0, 3.2, -24.7]];
export const info = { id: 'range', name: 'Shooting Range', spawn: [0, 1.0, 3.2] };
let S = null;
const _o = new THREE.Vector3(), _d = new THREE.Vector3(), _q = new THREE.Quaternion();

export function build() {
    L.spawn = info.spawn.slice();
    L.bounds = { minX: -7.6, maxX: 7.6, minZ: 0.75, maxZ: 7.6, maxY: 5 };   // gracz zostaje za ladą
    S = { clock: 0, phase: 'wait', t: WAIT, kills: 0, scores: {}, targets: [], spawnT: 1, lastHostMsg: -10, netT: 0, sendT: 0, introT: 10, hudT: 0, boardT: 0, rewarded: false, fx: [] };
    buildRoom();
    buildGun();
    S.hud = cameraPanel(1024, 200, 0.42, 0.082, 0.2, -0.75, 990);
    S.intro = cameraPanel(1280, 760, 1.0, 0.594, -0.04, -1.05, 995); S.intro.last = -1;
    L.onTrigger = () => shoot();
    N.onLevelMsg(onNet);
}

function buildRoom() {
    addCrispBlock(0, -0.5, -11, 18, 1, 38, 0x6a6a70, 0x101018, tex.floor, { rough: tex.floorRough });
    addCrispBlock(0, 6.5, -11, 18, 1, 38, 0x2a2a30, 0x101018);
    for (const [x, z, w, d] of [[-8.5, -11, 1, 38], [8.5, -11, 1, 38], [0, 8.5, 18, 1], [0, -30.5, 18, 1]]) addCrispBlock(x, 3, z, w, 6, d, 0x4a4a54, 0x101018);
    // Lada strzelecka i niewidzialna ściana nad nią (nie da się wejść na strzelnicę)
    addCrispBlock(0, 0.55, 0, 15, 1.1, 0.8, 0x5a3a24, 0x2a1a10, tex.wood, { uvMeters: 1.5 });
    addCollider(-8, 1.1, -0.4, 8, 6, 0.4);
    // Osłony na strzelnicy: skrzynie, beczki, ścianki
    for (const [x, z, w, h, d] of [[-5, -7, 2, 1.1, 1], [-1, -7, 2, 1.1, 1], [4, -8, 2, 1.1, 1], [-3, -15, 1.6, 1.6, 1.6], [3, -15, 1.6, 1.6, 1.6], [0, -20, 3, 2.2, 1], [0, -24, 4, 3.2, 1]])
        addCrispBlock(x, h / 2, z, w, h, d, 0xffffff, 0x1a0a05, tex.wood, { uvMeters: 1.2 });
    for (const [x, z] of [[6.5, -11.6], [-6.5, -12.6], [0, -12.6], [-6, -18.6], [6, -18.6], [-4, -22.6], [4, -22.6]]) addCrispBlock(x, 0.5, z, 1.2, 1.0, 0.5, 0x3a3a40, 0x101018);
    for (const [x, z] of [[-7.6, -14], [7.6, -9]]) { const m = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1.2), new THREE.MeshBasicMaterial({ color: 0x050505 })); m.position.set(x + (x < 0 ? 0.11 : -0.11), 3.0, z); m.rotation.y = x < 0 ? Math.PI / 2 : -Math.PI / 2; L.root.add(m); }
    // Światła nad strzelnicą i tablica wyników na ścianie z tyłu
    for (const z of [-6, -13, -20, -26]) { const l = new THREE.PointLight(0xfff0d0, 16, 12, 1.8); l.position.set(0, 5.6, z); L.root.add(l); }
    const bl = new THREE.PointLight(0xffd8a0, 8, 8, 2); bl.position.set(0, 4.5, 4); L.root.add(bl);
    const c = T.makeCanvas(1024, 512); S.board = { c: c, tex: new THREE.CanvasTexture(c) }; S.board.tex.colorSpace = THREE.SRGBColorSpace;
    const bm = new THREE.Mesh(new THREE.PlaneGeometry(6, 3), new THREE.MeshBasicMaterial({ map: S.board.tex, toneMapped: false })); bm.position.set(0, 4.3, -29.9); L.root.add(bm);
    buildDoor({ x: 0, z: 7.97, rotY: Math.PI, label: 'GAMES', color: '#d080ff', wood: 0x3a3048, portal: { target: 'games', spawn: ARRIVAL_FROM_RANGE, onEnter: () => toast('Back to BagaBoo Games') } });
}

// Pistolet i efekty strzału
function buildGun() {
    const g = new THREE.Group(), metal = new THREE.MeshStandardMaterial({ color: 0x1a1a1e, metalness: 0.8, roughness: 0.35 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.05, 0.18), metal); body.position.set(0, 0.02, -0.08); g.add(body);
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.08, 10), metal); barrel.rotation.x = Math.PI / 2; barrel.position.set(0, 0.03, -0.2); g.add(barrel);
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.09, 0.045), new THREE.MeshStandardMaterial({ color: 0x5a3a20, roughness: 0.7 })); grip.position.set(0, -0.03, 0.0); grip.rotation.x = 0.25; g.add(grip);
    const sight = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.01, 0.01), new THREE.MeshBasicMaterial({ color: 0xff3020 })); sight.position.set(0, 0.05, -0.16); g.add(sight);
    L.root.add(g); S.gun = g;
    S.flash = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex.dot, color: 0xffd080, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); S.flash.scale.set(0.25, 0.25, 1); S.flash.visible = false; L.root.add(S.flash);
    S.tracer = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(0, 0, -1)]), new THREE.LineBasicMaterial({ color: 0xffe0a0, transparent: true, opacity: 0.8 }));
    S.tracer.visible = false; S.tracer.frustumCulled = false; L.root.add(S.tracer);
}
function muzzle() {
    const h = hands.R; if (!h) return false;
    h.getWorldQuaternion(_q);
    _o.set(0, 0.03, -0.24).applyQuaternion(_q).add(h.position);
    _d.set(0, 0, -1).applyQuaternion(_q).normalize();
    return true;
}
function shoot() {
    if (!S || !muzzle()) return;
    SFX.shot(); buzz(1, 0.6, 50);
    S.flash.position.copy(_o); S.flash.visible = true; S.flashT = 0.05;
    let best = null, bestT = 60;
    for (const tg of S.targets) {
        if (!tg.alive || tg.up < 0.5) continue;
        const c = tg.center, oc = new THREE.Vector3().subVectors(_o, c), b = oc.dot(_d), cc = oc.lengthSq() - tg.r * tg.r, disc = b * b - cc;
        if (disc < 0) continue;
        const tt = -b - Math.sqrt(disc); if (tt > 0 && tt < bestT) { bestT = tt; best = tg; }
    }
    const end = _o.clone().addScaledVector(_d, best ? bestT : 40);
    S.tracer.geometry.setFromPoints([_o.clone(), end]); S.tracer.visible = true; S.tracerT = 0.06;
    if (best && S.phase === 'play') hit(best);
}
// Potwór: łysa, szara głowa ze świecącymi oczami i zębami na krótkim tułowiu
function makeTarget(spot) {
    const g = new THREE.Group(), skin = new THREE.MeshStandardMaterial({ map: tex.skin, color: 0x8a8078, roughness: 0.5 });
    const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.24, 0.6, 12), skin); torso.position.y = 0.3; g.add(torso);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.26, 18, 14), skin); head.position.y = 0.82; head.scale.set(1, 1.15, 0.95); g.add(head);
    for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 8), new THREE.MeshBasicMaterial({ color: 0xff2a10 })); e.position.set(s * 0.09, 0.88, 0.22); g.add(e); }
    const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.06, 0.04), new THREE.MeshBasicMaterial({ color: 0x100202 })); mouth.position.set(0, 0.7, 0.23); g.add(mouth);
    for (let i = 0; i < 5; i++) { const t = new THREE.Mesh(new THREE.ConeGeometry(0.014, 0.05, 5), new THREE.MeshStandardMaterial({ color: 0xe8e0c8 })); t.position.set(-0.08 + i * 0.04, 0.72, 0.245); t.rotation.x = Math.PI; g.add(t); }
    for (const s of [-1, 1]) { const a = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.03, 0.5, 8), skin); a.position.set(s * 0.26, 0.45, 0.05); a.rotation.z = s * 0.9; g.add(a); }
    g.position.set(spot[0], spot[1] - 1.1, spot[2]); g.rotation.y = Math.atan2(-spot[0], 3 - spot[2]);
    L.root.add(g);
    return { g: g, spot: spot, base: spot[1], up: 0, life: SHOW_TIME, alive: true, r: 0.42, center: new THREE.Vector3() };
}
function hit(tg) {
    tg.alive = false; S.kills++;
    SFX.splat(tg.center); toast('Hit! ' + S.kills, '#ffd27a');
    // Rozbryzg czerwonych kropel
    const n = 40, pos = new Float32Array(n * 3), vel = [];
    for (let i = 0; i < n; i++) { pos[i * 3] = tg.center.x; pos[i * 3 + 1] = tg.center.y; pos[i * 3 + 2] = tg.center.z; vel.push(new THREE.Vector3((Math.random() - 0.5) * 4, Math.random() * 3, (Math.random() - 0.5) * 4)); }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const pts = new THREE.Points(geo, new THREE.PointsMaterial({ size: 0.06, color: 0xaa0000, transparent: true, map: tex.dot, depthWrite: false })); pts.frustumCulled = false; L.root.add(pts);
    S.fx.push({ pts: pts, pos: pos, vel: vel, t: 0.9 });
    L.root.remove(tg.g);
}

// ---------- RUNDA (host liczy czas i wyniki, solo liczy samo) ----------
function isAuthority() {
    if (N.NET.mode !== 'guest') return true;
    const hs = N.hostState();
    return !(hs && hs.lvl === 'range' && S.clock - S.lastHostMsg < 1.5);
}
function onNet(msg, from) {
    if (!S || !msg) return;
    if (N.NET.mode === 'host') { if (msg.k === 'score') S.scores[from] = { name: msg.name, s: msg.s }; return; }
    if (msg.k !== 'st') return;
    S.lastHostMsg = S.clock;
    const prev = S.phase; S.phase = msg.ph; S.t = msg.t; S.list = msg.list || [];
    if (msg.ph === 'play' && prev !== 'play') startRound();
    if (msg.ph === 'results' && prev !== 'results') endRound(msg.win || []);
}
function startRound() { S.kills = 0; S.rewarded = false; clearTargets(); S.spawnT = 0.5; toast('Shoot the monsters!', '#ffd27a'); }
function endRound(winners) {
    clearTargets();
    if (S.rewarded) return; S.rewarded = true;
    recordScore('range', S.kills);
    const solo = N.NET.mode === 'solo' || (N.NET.mode === 'guest' && !(S.list && S.list.length > 1));
    const me = N.NET.mode === 'solo' ? 'me' : N.myId();
    const won = solo ? S.kills >= SOLO_WIN : winners.includes(me) || (N.NET.mode === 'host' && winners.includes('me'));
    if (won) { toast('You won with ' + S.kills + ' kills!', '#7fc47f'); levelReward('range', REWARD, REWARD, 'won the shooting range'); }
    else toast(solo ? 'Round over: ' + S.kills + ' kills (win from ' + SOLO_WIN + ')' : 'Round over: ' + S.kills + ' kills. Someone shot more.', '#ffb030');
}
function clearTargets() { for (const tg of S.targets) L.root.remove(tg.g); S.targets = []; }
function scoreList() {
    const list = [{ id: 'me', name: SAVE.profile.name, s: S.kills }];
    if (N.NET.mode === 'host') for (const id in S.scores) { const st = N.playersState[id]; if (st && st.lvl === 'range') list.push({ id: id, name: S.scores[id].name, s: S.scores[id].s }); }
    return list.sort((a, b) => b.s - a.s);
}
function think(dt) {
    S.t -= dt;
    if (S.phase === 'wait' && S.t <= 0) { S.phase = 'play'; S.t = ROUND; S.scores = {}; startRound(); }
    else if (S.phase === 'play' && S.t <= 0) {
        S.phase = 'results'; S.t = RESULTS;
        const list = scoreList(), top = list.length ? list[0].s : 0;
        S.winners = list.filter(x => x.s === top && top > 0).map(x => x.id === 'me' ? N.myId() : x.id);
        if (N.NET.mode === 'host') N.sendLevelMsg({ k: 'st', ph: S.phase, t: S.t, list: list.map(x => ({ name: x.name, s: x.s })), win: S.winners });
        endRound(S.winners.map(id => id === N.myId() ? 'me' : id));
    } else if (S.phase === 'results' && S.t <= 0) { S.phase = 'wait'; S.t = WAIT; }
}

// ---------- CO KLATKĘ ----------
export function update(dt, t, ctx) {
    if (!S) return;
    S.clock += dt;
    const auth = isAuthority();
    if (S.introT > 0) {
        S.introT -= dt;
        const sec = Math.max(0, Math.ceil(S.introT));
        if (sec !== S.intro.last) { S.intro.last = sec; drawInstructions(S.intro, 'Shooting Range', [
            'You hold a pistol in your right hand. Pull the trigger to shoot.',
            'Monsters pop up behind crates, barrels and in the windows. Hit them before they hide.',
            'Each round lasts 2 minutes. The player with the most kills wins 200 Bagabucks.',
            'Playing alone? Get ' + SOLO_WIN + ' kills to win.',
            'The GAMES door behind you takes you back.'], 'This closes in ' + sec + ' s', { bg: 'rgba(4,10,16,0.9)', border: '#60d0ff', title: '#d0f0ff', text: '#e0eef8', footer: '#ffb030', size: 30 }); }
        S.intro.mesh.visible = S.introT > 0;
    }
    if (auth) {
        think(dt);
        if (N.NET.mode === 'host') { S.netT -= dt; if (S.netT <= 0) { S.netT = 0.3; N.sendLevelMsg({ k: 'st', ph: S.phase, t: S.t, list: scoreList().map(x => ({ name: x.name, s: x.s })), win: S.winners || [] }); } }
    } else { S.sendT -= dt; if (S.sendT <= 0) { S.sendT = 0.5; N.sendLevelMsg({ k: 'score', name: SAVE.profile.name, s: S.kills }); } }
    // Pistolet w prawej dłoni
    if (hands.R) { S.gun.position.copy(hands.R.position); S.gun.quaternion.copy(hands.R.getWorldQuaternion(_q)); S.gun.visible = true; }
    if (S.flashT > 0) { S.flashT -= dt; if (S.flashT <= 0) S.flash.visible = false; }
    if (S.tracerT > 0) { S.tracerT -= dt; if (S.tracerT <= 0) S.tracer.visible = false; }
    // Potwory: wyskakują, kołyszą się, chowają się po kilku sekundach
    if (S.phase === 'play') {
        S.spawnT -= dt;
        const alive = S.targets.filter(x => x.alive).length;
        if (S.spawnT <= 0 && alive < MAX_ACTIVE) {
            S.spawnT = 0.6 + Math.random() * 0.8;
            const used = new Set(S.targets.filter(x => x.alive).map(x => x.spot));
            const free = SPOTS.filter(sp => !used.has(sp));
            if (free.length) { S.targets.push(makeTarget(free[(Math.random() * free.length) | 0])); SFX.creak(0.3, { x: 0, y: 1, z: -12 }); }
        }
    }
    for (const tg of S.targets) {
        if (!tg.alive) continue;
        tg.life -= dt;
        tg.up = tg.life > 0.3 ? Math.min(1, tg.up + dt * 4) : Math.max(0, tg.up - dt * 4);
        tg.g.position.y = tg.base - 1.1 + tg.up * 1.1;
        tg.g.rotation.z = Math.sin(t * 6 + tg.spot[0]) * 0.12;
        tg.center.set(tg.g.position.x, tg.g.position.y + 0.75, tg.g.position.z);
        if (tg.life <= 0) { tg.alive = false; L.root.remove(tg.g); }
    }
    S.targets = S.targets.filter(x => x.alive);
    for (const f of S.fx) {
        f.t -= dt;
        for (let i = 0; i < f.vel.length; i++) { f.vel[i].y -= 9 * dt; f.pos[i * 3] += f.vel[i].x * dt; f.pos[i * 3 + 1] += f.vel[i].y * dt; f.pos[i * 3 + 2] += f.vel[i].z * dt; }
        f.pts.geometry.attributes.position.needsUpdate = true;
        if (f.t <= 0) L.root.remove(f.pts);
    }
    S.fx = S.fx.filter(f => f.t > 0);
    S.hudT -= dt; if (S.hudT <= 0) { S.hudT = 0.15; drawHud(); }
    S.boardT -= dt; if (S.boardT <= 0) { S.boardT = 0.5; drawBoard(); }
}
function fmt(t) { t = Math.max(0, Math.ceil(t)); return Math.floor(t / 60) + ':' + String(t % 60).padStart(2, '0'); }
function drawHud() {
    const x = S.hud.ctx; panelBg(S.hud, 'rgba(4,10,16,0.72)');
    x.textBaseline = 'middle'; x.textAlign = 'left';
    x.font = 'bold 80px "Courier New", monospace'; x.fillStyle = '#d0f0ff'; x.fillText(S.phase === 'play' ? fmt(S.t) : '-:--', 30, 74);
    x.font = 'bold 40px "Courier New", monospace'; x.fillStyle = '#ffd27a'; x.fillText('Kills ' + S.kills, 330, 52);
    x.font = 'bold 28px "Courier New", monospace'; x.fillStyle = '#9fd0f0';
    x.fillText(S.phase === 'wait' ? 'Next round in ' + fmt(S.t) : (S.phase === 'results' ? 'Round over' : 'Shoot!'), 330, 112);
    S.hud.update();
}
function drawBoard() {
    const x = S.board.c.getContext('2d');
    x.fillStyle = '#05080c'; x.fillRect(0, 0, 1024, 512);
    x.textAlign = 'center'; x.textBaseline = 'middle'; x.font = 'bold 64px "Courier New", monospace'; x.fillStyle = '#60d0ff';
    x.fillText(S.phase === 'play' ? fmt(S.t) : (S.phase === 'wait' ? 'Next round ' + fmt(S.t) : 'Round over'), 512, 60);
    const list = isAuthority() ? scoreList().map(v => ({ name: v.name, s: v.s })) : (S.list || []);
    x.textAlign = 'left'; x.font = 'bold 40px "Courier New", monospace';
    list.slice(0, 6).forEach((r, i) => { x.fillStyle = i === 0 ? '#ffd27a' : '#e0eef8'; x.fillText((i + 1) + '. ' + r.name, 120, 150 + i * 56); x.textAlign = 'right'; x.fillText(String(r.s), 900, 150 + i * 56); x.textAlign = 'left'; });
    S.board.tex.needsUpdate = true;
}
export function dispose() {
    if (S) { S.hud.dispose(); S.intro.dispose(); }
    L.onTrigger = null;
    N.onLevelMsg(null);
    S = null;
}
