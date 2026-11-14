// ==========================================
// GAME MODE: HIDE AND SEEK (wejście z salonu BagaBoo Games)
// Ciemny magazyn ze skrzyniami i regałami. Host losuje jednego szukającego. Szukający stoi z zawiązanymi oczami
// przez 25 s, a reszta w tym czasie się chowa. Potem 2 minuty polowania: szukający łapie dłonią.
// Kto nie zostanie znaleziony, dostaje 200 Bagabucks. Szukający dostaje 200, jeśli znajdzie wszystkich.
// Gdy grasz sam, szuka cię manekin-bot: patrzy przed siebie, widzi tylko na wprost i nie przez skrzynie.
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
import { buildDoor, cameraPanel, panelBg, drawInstructions, createJumpscare, introSeen } from '../core/levelkit.js';
import { ARRIVAL_FROM_HIDESEEK } from './games.js';

const A = 20, H = 8;                          // magazyn 40 x 40 m
const WAIT = 10, HIDE = 25, SEEK = 120, RESULTS = 8, REWARD = 200;
const CATCH_DIST = 0.5;                       // dłoń szukającego tak blisko głowy lub tułowia = znaleziony
const SEEKER_SPAWN = [0, 1.0, -17.5];         // tu stoi szukający podczas chowania
const HIDER_SPAWNS = [[-17, 1.0, 17], [17, 1.0, 17], [-17, 1.0, 5], [17, 1.0, 5], [-17, 1.0, -8], [17, 1.0, -8], [-8, 1.0, 17.5], [8, 1.0, 17.5]];
const BOT = { walk: 2.6, search: 3.6, chase: 5.0, see: 13, lose: 6, gravity: 18, jumpMax: 3.6 };   // bot: m/s, zasięg wzroku (m), sekundy do utraty śladu
export const info = { id: 'hideseek', name: 'Hide and Seek', spawn: [0, 1.0, 18.5] };
let S = null;
const _p = new THREE.Vector3(), _q = new THREE.Vector3();
const WAYPOINTS = [];   // punkty patrolu bota w alejkach (wypełniane przy budowie)

export function build() {
    L.spawn = info.spawn.slice();
    L.bounds = { minX: -A + 0.4, maxX: A - 0.4, minZ: -A + 0.4, maxZ: A - 0.4, maxY: H - 0.4 };
    S = { clock: 0, phase: 'wait', t: WAIT, seeker: null, caught: new Set(), surv: [], lastHostMsg: -10, netT: 0, introT: 10, hudT: 0, rewarded: false, bot: null, step: -1 };
    buildArena();
    buildDoor({ x: 0, z: A - 0.03, rotY: Math.PI, label: 'GAMES', color: '#d080ff', wood: 0x3a3048, portal: { target: 'games', spawn: ARRIVAL_FROM_HIDESEEK, onEnter: () => toast('Back to BagaBoo Games') } });
    // Znacznik szukającego (poświata i napis nad głową)
    const mc = T.makeCanvas(256, 64), mx = mc.getContext('2d');
    mx.font = 'bold 48px sans-serif'; mx.textAlign = 'center'; mx.textBaseline = 'middle'; mx.fillStyle = '#7fe8ff'; mx.shadowColor = '#30c0ff'; mx.shadowBlur = 16; mx.fillText('SEEKER', 128, 34);
    S.tag = new THREE.Sprite(new THREE.SpriteMaterial({ map: T.toTex(mc, false), transparent: true, depthWrite: false })); S.tag.scale.set(1.2, 0.3, 1); S.tag.visible = false; L.root.add(S.tag);
    // Bot-szukający (gdy grasz sam)
    const b = buildMannequin(T.mkRng(4711)); b.group.scale.setScalar(1.2); b.group.visible = false; L.root.add(b.group);
    for (const sx of [-1, 1]) { const e = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex.dot, color: 0x30c0ff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); e.scale.set(0.1, 0.1, 1); e.position.set(sx * 0.04, 0.152, 0.07); b.head.add(e); }
    S.botMesh = b;
    // Opaska na oczy szukającego podczas chowania
    S.blind = new THREE.Mesh(new THREE.PlaneGeometry(3, 3), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0, depthTest: false }));
    S.blind.position.z = -0.25; S.blind.renderOrder = 1004; camera.add(S.blind);
    S.hud = cameraPanel(1024, 200, 0.42, 0.082, 0.2, -0.75, 990);
    S.scare = createJumpscare({ seed: 5522 });
    S.intro = cameraPanel(1280, 760, 1.0, 0.594, -0.04, -1.05, 995); S.intro.last = -1;
    N.onLevelMsg(onNet);
}

// Stały układ (ten sam u wszystkich graczy): skrzynie, regały, szafki i manekiny stojące w alejkach.
// Skrzynie mają co najmniej 0,8 m przerwy, więc da się między nimi przejść i się ukryć.
function buildArena() {
    const R = T.mkRng(4242), boxes = [];
    addCrispBlock(0, -0.5, 0, A * 2 + 2, 1, A * 2 + 2, 0x4a4a4e, 0x101014, tex.floor, { rough: tex.floorRough });
    addCrispBlock(0, H + 0.5, 0, A * 2 + 2, 1, A * 2 + 2, 0x222228, 0x101014);
    for (const [x, z, w, d] of [[0, -A - 0.5, A * 2 + 2, 1], [0, A + 0.5, A * 2 + 2, 1], [-A - 0.5, 0, 1, A * 2], [A + 0.5, 0, 1, A * 2]]) addCrispBlock(x, H / 2, z, w, H, d, 0x6a625a, 0x1a1814, tex.wall);
    const fits = (x, z, w, d) => {
        if (Math.abs(x) + w / 2 > A - 4.5 || z + d / 2 > A - 6.5 || z - d / 2 < -A + 5.5) return false;   // wolne pasy przy ścianach: starty i drzwi
        return boxes.every(b => Math.abs(x - b.x) > (w + b.w) / 2 + 0.8 || Math.abs(z - b.z) > (d + b.d) / 2 + 0.8);
    };
    const place = (w, h, d, col, tx, tries) => {
        for (let i = 0; i < tries; i++) {
            const x = (R() * 2 - 1) * (A - 5), z = (R() * 2 - 1) * (A - 7);
            if (!fits(x, z, w, d)) continue;
            addCrispBlock(x, h / 2, z, w, h, d, col, 0x201408, tx); boxes.push({ x: x, z: z, w: w, d: d }); return true;
        }
        return false;
    };
    // Regały (długie i wysokie, tworzą alejki) i skrzynie różnej wielkości
    for (let i = 0; i < 9; i++) { const horiz = R() < 0.5; place(horiz ? 5.5 : 0.8, 2.6, horiz ? 0.8 : 5.5, 0x5a4a3a, tex.wood, 40); }
    for (let i = 0; i < 40; i++) place(1.1 + R() * 1.5, 0.9 + R() * 1.3, 1.1 + R() * 1.5, R() < 0.5 ? 0x8a6a40 : 0x6a5438, tex.wood, 30);
    // Szafki pod zachodnią ścianą (ozdoba i osłona)
    for (let z = -16; z <= 12; z += 2.2) addCrispBlock(-A + 0.6, 1.1, z, 0.9, 2.2, 0.9, 0x4a5a6a, 0x10141a);
    // Manekiny w alejkach (ambient, nie łapią)
    for (let i = 0; i < 6; i++) {
        const m = buildMannequin(T.mkRng(100 + i)); const x = (R() * 2 - 1) * 14, z = (R() * 2 - 1) * 12;
        if (boxes.some(b => Math.abs(x - b.x) < b.w / 2 + 0.6 && Math.abs(z - b.z) < b.d / 2 + 0.6)) continue;
        m.group.position.set(x, 0, z); m.group.rotation.y = R() * 6.28; L.root.add(m.group);
    }
    // Wolne punkty patrolu bota: siatka punktów niezasłoniętych skrzyniami
    WAYPOINTS.length = 0;
    for (let x = -14; x <= 14; x += 4.7) for (let z = -13; z <= 14; z += 4.7) if (boxes.every(b => Math.abs(x - b.x) > b.w / 2 + 0.9 || Math.abs(z - b.z) > b.d / 2 + 0.9)) WAYPOINTS.push([x, z]);
    // Lampy
    for (const [x, z] of [[-10, -10], [10, -10], [-10, 10], [10, 10]]) {
        const l = new THREE.PointLight(0xffd8a0, 14, 20, 1.8); l.position.set(x, H - 1, z); L.root.add(l);
        const f = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.08, 0.3), new THREE.MeshBasicMaterial({ color: 0xffe8c0 })); f.position.set(x, H - 0.1, z); L.root.add(f);
    }
}

// ---------- SIEĆ I ROLA ----------
function isAuthority() {
    if (N.NET.mode !== 'guest') return true;
    const hs = N.hostState();
    return !(hs && hs.lvl === 'hideseek' && S.clock - S.lastHostMsg < 1.5);
}
function participants() {
    const list = ['me'];
    if (N.NET.mode === 'host') for (const id in N.playersState) { if (id === N.myId()) continue; const st = N.playersState[id]; if (st && st.lvl === 'hideseek' && st.head) list.push(id); }
    return list;
}
const toNet = (id) => id === 'me' ? N.myId() : id;
const fromNet = (id) => id === N.myId() ? 'me' : id;
function onNet(msg) {
    if (!S || !msg || N.NET.mode === 'host' || msg.k !== 'st') return;
    S.lastHostMsg = S.clock;
    const prev = S.phase;
    S.phase = msg.ph; S.t = msg.t; S.seeker = msg.sk ? fromNet(msg.sk) : null;
    const wasCaught = S.caught.has('me');
    S.caught = new Set((msg.caught || []).map(fromNet)); S.surv = (msg.surv || []).map(fromNet);
    if (!wasCaught && S.caught.has('me')) localCaught();
    if (msg.ph === 'hide' && prev !== 'hide') startedHide();
    if (msg.ph === 'seek' && prev !== 'seek') startedSeek();
    if (msg.ph === 'results' && prev !== 'results') roundOver();
}
function broadcast() {
    N.sendLevelMsg({ k: 'st', ph: S.phase, t: S.t, sk: S.seeker && S.seeker !== 'bot' ? toNet(S.seeker) : null, caught: [...S.caught].map(toNet), surv: S.surv.map(toNet) });
}
function startedHide() {
    S.rewarded = false;
    if (S.seeker === 'me') { setPlayerPosition(SEEKER_SPAWN[0], SEEKER_SPAWN[1], SEEKER_SPAWN[2]); toast('You are the SEEKER. Count to 25...', '#7fe8ff'); }
    else { const sp = HIDER_SPAWNS[(Math.random() * HIDER_SPAWNS.length) | 0]; setPlayerPosition(sp[0] + (Math.random() - 0.5) * 2, sp[1], sp[2] + (Math.random() - 0.5) * 2); toast(S.seeker === 'bot' ? 'The mannequin is counting. Hide!' : 'Hide! The seeker is counting.', '#7fe8ff'); }
}
function startedSeek() {
    if (S.seeker === 'me') { toast('Seek! Touch them with your hand.', '#7fe8ff'); SFX.roar(0.5); buzz('both', 0.6, 300); }
    else { toast('The seeker is loose! Stay hidden.', '#ff6a4a'); if (S.scare) S.scare.trigger(); }
}
function roundOver() {
    if (S.rewarded) return; S.rewarded = true;
    if (S.surv.includes('me')) { toast('You stayed hidden!', '#7fc47f'); levelReward('hideseek', REWARD, REWARD, 'stayed hidden'); }
    else if (S.seeker === 'me' && S.surv.length === 0) { toast('You found everyone!', '#7fc47f'); levelReward('hideseek', REWARD, REWARD, 'found everyone'); }
    else if (S.seeker === 'me') toast('Time is up. Some stayed hidden.', '#ffb030');
    else toast('You were found. No reward this round.', '#e0533f');
}

// ---------- MÓZG RUNDY (host albo gracz solo) ----------
function think(dt, p) {
    S.t -= dt;
    if (S.phase === 'wait') {
        if (S.t <= 0) {
            const parts = participants();
            S.seeker = parts.length >= 2 ? parts[(Math.random() * parts.length) | 0] : 'bot';
            S.caught = new Set(); S.surv = []; S.phase = 'hide'; S.t = HIDE;
            if (S.seeker === 'bot') S.bot = { x: SEEKER_SPAWN[0], y: 0, z: SEEKER_SPAWN[2], vy: 0, ground: true, stuck: 0, side: 0, sideT: 0, mode: 'patrol', wp: 0, goal: null, lostT: 0, last: null, dir: 0, repath: 0 };
            startedHide();
        }
    } else if (S.phase === 'hide') {
        if (S.t <= 0) { S.phase = 'seek'; S.t = SEEK; startedSeek(); }
    } else if (S.phase === 'seek') {
        const hiders = participants().filter(id => id !== S.seeker);
        if (S.seeker === 'bot') botThink(dt, p);
        else for (const id of hiders) if (!S.caught.has(id) && touched(id)) catchPlayer(id);
        if (S.t <= 0 || hiders.every(id => S.caught.has(id))) {
            S.surv = hiders.filter(id => !S.caught.has(id)); S.phase = 'results'; S.t = RESULTS; roundOver();
        }
    } else if (S.phase === 'results' && S.t <= 0) { S.phase = 'wait'; S.t = WAIT; S.seeker = null; S.bot = null; }
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
function touched(id) {
    const hd = headOf(id); if (!hd) return false;
    const body = hd.clone(); body.y -= 0.45;
    return handsOf(S.seeker).some(h => h.distanceTo(hd) < CATCH_DIST || h.distanceTo(body) < CATCH_DIST + 0.05);
}
function catchPlayer(id) {
    S.caught.add(id);
    if (id === 'me') localCaught();
    if (S.seeker === 'me') { SFX.stinger(); buzz('both', 0.7, 150); toast('Found one! ' + S.caught.size, '#7fe8ff'); }
}
function localCaught() { SFX.scare(); toast('You were found! Watch the others.', '#e0533f'); }

// ---------- BOT-SZUKAJĄCY ----------
// Widzi na wprost (stożek ok. 70°) do 13 m i tylko gdy nic go nie zasłania: linia od jego oczu do twoich oczu
// nie może przechodzić przez skrzynię, więc kucnięcie za skrzynią działa. Po utracie śladu przeszukuje ostatnie miejsce.
function botSees(p) {
    const b = S.bot, dx = p.x - b.x, dz = p.z - b.z, d = Math.hypot(dx, dz);
    if (d > BOT.see) return false;
    if (b.mode !== 'chase' && d > 2 && (dx * Math.sin(b.dir) + dz * Math.cos(b.dir)) / d < 0.35) return false;
    const steps = Math.ceil(d / 0.4);
    for (let i = 1; i < steps; i++) {
        const k = i / steps; _q.set(b.x + dx * k, b.y + 1.6 + (p.y - b.y - 1.6) * k, b.z + dz * k);
        for (const o of L.obstacles) if (o.box3.containsPoint(_q)) return false;
    }
    return true;
}
function botThink(dt, p) {
    const b = S.bot;
    if (S.caught.has('me')) { b.mode = 'patrol'; return; }
    const sees = botSees(p);
    if (sees) { if (b.mode !== 'chase') { SFX.stinger({ x: b.x, y: 1.5, z: b.z }); } b.mode = 'chase'; b.lostT = 0; b.last = [p.x, p.z]; }
    else if (b.mode === 'chase') { b.lostT += dt; if (b.lostT > BOT.lose) { b.mode = 'patrol'; b.goal = null; } else if (b.last) b.goal = b.last; }
    let tx, tz, speed = BOT.walk;
    if (b.mode === 'chase') { tx = p.x; tz = p.z; speed = BOT.chase; if (!sees && b.last) { tx = b.last[0]; tz = b.last[1]; speed = BOT.search; } }
    else {
        if (!b.goal || Math.hypot(b.goal[0] - b.x, b.goal[1] - b.z) < 1.3) { b.goal = WAYPOINTS.length ? WAYPOINTS[(Math.random() * WAYPOINTS.length) | 0] : [0, 0]; }
        tx = b.goal[0]; tz = b.goal[1];
    }
    stepBot(dt, tx, tz, p.y - 0.35, speed);
    if (!S.caught.has('me') && Math.hypot(p.x - b.x, p.z - b.z) < 1.0 && Math.abs(p.y - (b.y + 1.0)) < 1.5) catchPlayer('me');
    if (Math.hypot(p.x - b.x, p.z - b.z) < 12) SFX.heartbeat(Math.max(0, 1 - Math.hypot(p.x - b.x, p.z - b.z) / 12));
}
// Ruch po podłodze z kolizją o skrzynie (wejście na niskie krawędzie, skok na wyższe, obejście gdy utknie)
function stepBot(dt, tx, tz, ty, speed) {
    const b = S.bot, R = 0.4, TALL = 1.2;
    let dx = tx - b.x, dz = tz - b.z; const d = Math.hypot(dx, dz);
    if (d > 0.05) { dx /= d; dz /= d; } else { dx = 0; dz = 0; }
    if (b.side) { const sx = -dz * b.side, sz = dx * b.side; dx = dx * 0.4 + sx; dz = dz * 0.4 + sz; b.sideT -= dt; if (b.sideT <= 0) b.side = 0; }
    if (dx || dz) { const want = Math.atan2(dx, dz); let dd = want - b.dir; while (dd > Math.PI) dd -= Math.PI * 2; while (dd < -Math.PI) dd += Math.PI * 2; b.dir += dd * Math.min(1, dt * 6); }
    const ox = b.x, oz = b.z;
    b.x += dx * speed * dt; b.z += dz * speed * dt;
    b.vy -= BOT.gravity * dt; b.y += b.vy * dt;
    let blockedTop = null; b.ground = false;
    for (const o of L.obstacles) {
        const bb = o.box3;
        if (b.x < bb.min.x - R || b.x > bb.max.x + R || b.z < bb.min.z - R || b.z > bb.max.z + R) continue;
        if (b.y + TALL <= bb.min.y || b.y >= bb.max.y) {
            if (b.vy <= 0 && b.y < bb.max.y + 0.05 && b.y > bb.max.y - 0.5 && b.x > bb.min.x - R * 0.5 && b.x < bb.max.x + R * 0.5 && b.z > bb.min.z - R * 0.5 && b.z < bb.max.z + R * 0.5) { b.y = bb.max.y; b.vy = 0; b.ground = true; }
            continue;
        }
        const step = bb.max.y - b.y;
        if (step <= 0.45 && b.vy <= 0) { b.y = bb.max.y; b.vy = 0; b.ground = true; continue; }
        if (b.ground || b.vy <= 0) blockedTop = Math.max(blockedTop || 0, bb.max.y);
        const ex = Math.min(b.x - (bb.min.x - R), bb.max.x + R - b.x), ez = Math.min(b.z - (bb.min.z - R), bb.max.z + R - b.z);
        if (ex < ez) b.x = b.x < (bb.min.x + bb.max.x) / 2 ? bb.min.x - R : bb.max.x + R; else b.z = b.z < (bb.min.z + bb.max.z) / 2 ? bb.min.z - R : bb.max.z + R;
    }
    if (b.y <= 0) { b.y = 0; b.vy = 0; b.ground = true; }
    // Skacze tylko za graczem (do pościgu), a w patrolu omija przeszkody w bok
    const chasing = b.mode === 'chase';
    if (b.ground && chasing && (blockedTop !== null || (ty > b.y + 0.8 && d < 3.5))) {
        const h = Math.min(BOT.jumpMax, Math.max(0.6, (blockedTop !== null ? blockedTop : ty) - b.y + 0.35));
        b.vy = Math.sqrt(2 * BOT.gravity * h); b.ground = false;
    }
    const moved = Math.hypot(b.x - ox, b.z - oz);
    if (moved < speed * dt * 0.3 && b.ground) { b.stuck += dt; if (b.stuck > 0.7) { b.stuck = 0; b.side = Math.random() < 0.5 ? -1 : 1; b.sideT = 1.0; if (!chasing) b.goal = null; } } else b.stuck = 0;
}

// ---------- CO KLATKĘ ----------
export function update(dt, t, ctx) {
    if (!S) return;
    S.clock += dt;
    const p = ctx.body.position, auth = isAuthority();
    if (S.introSkip === undefined) { S.introSkip = introSeen('hideseek'); if (S.introSkip) S.introT = Math.min(S.introT, 3); }   // samouczek tylko za pierwszym razem
    if (S.introT > 0) {
        S.introT -= dt;
        const sec = Math.max(0, Math.ceil(S.introT));
        if (sec !== S.intro.last) { S.intro.last = sec; drawInstructions(S.intro, 'Hide and Seek', [
            'One player is the seeker. The others hide in the dark warehouse.',
            'The seeker is blindfolded for 25 s, so run and hide behind crates and shelves.',
            'Then the hunt lasts 2 minutes. The seeker catches you by touching your head or body.',
            'Not found = 200 Bagabucks. The seeker wins 200 for finding everyone.',
            'Playing alone? A mannequin seeks you. It only sees what is in front of it, so stay behind cover.',
            'The GAMES door behind you takes you back.'], 'This closes in ' + sec + ' s', { bg: 'rgba(4,10,16,0.9)', border: '#30c0ff', title: '#d0f4ff', text: '#dcecf4', footer: '#ffb030', size: 28 }); }
        S.intro.mesh.visible = S.introT > 0 && !S.introSkip;
    }
    if (auth) {
        think(dt, p);
        if (N.NET.mode === 'host') { S.netT -= dt; if (S.netT <= 0) { S.netT = 0.2; broadcast(); } }
    }
    S.scare.update(dt);
    // Szukający: opaska i zamrożenie podczas chowania
    const blind = S.phase === 'hide' && S.seeker === 'me';
    S.blind.material.opacity += ((blind ? 1 : 0) - S.blind.material.opacity) * Math.min(1, dt * 8);
    S.blind.visible = S.blind.material.opacity > 0.01;
    if (blind) { ctx.body.position.set(SEEKER_SPAWN[0], SEEKER_SPAWN[1], SEEKER_SPAWN[2]); ctx.body.velocity.set(0, 0, 0); }
    // Bot i znacznik szukającego
    const active = S.phase === 'hide' || S.phase === 'seek' || S.phase === 'results';
    const seeker = active ? S.seeker : null;
    let mpos = null;
    if (seeker === 'bot' && S.bot) {
        const b = S.bot, m = S.botMesh; m.group.visible = true;
        m.group.position.set(b.x, b.y + (b.ground && S.phase === 'seek' ? Math.abs(Math.sin(t * 8)) * 0.05 : 0), b.z); m.group.rotation.y = b.dir;
        mpos = new THREE.Vector3(b.x, b.y + 2.3, b.z);
        if (S.phase === 'seek' && Math.floor(t * 2.2) !== S.step) { S.step = Math.floor(t * 2.2); SFX.step(b.mode === 'chase' ? 0.9 : 0.4, { x: b.x, y: 0, z: b.z }); }
    } else S.botMesh.group.visible = false;
    if (seeker && seeker !== 'bot' && seeker !== 'me') mpos = headOf(seeker);
    S.tag.visible = !!mpos && seeker !== 'me';
    if (mpos) S.tag.position.copy(mpos).y += 0.55;
    S.hudT -= dt; if (S.hudT <= 0) { S.hudT = 0.15; drawHud(); }
}
function fmt(t) { t = Math.max(0, Math.ceil(t)); return Math.floor(t / 60) + ':' + String(t % 60).padStart(2, '0'); }
function drawHud() {
    const x = S.hud.ctx; panelBg(S.hud, 'rgba(4,10,16,0.72)');
    x.textBaseline = 'middle'; x.textAlign = 'left';
    x.font = 'bold 80px "Courier New", monospace'; x.fillStyle = '#d0f4ff'; x.fillText(fmt(S.t), 30, 74);
    x.font = 'bold 30px "Courier New", monospace';
    let role = '', col = '#d0f4ff';
    if (S.phase === 'wait') { role = 'Next round starts soon'; col = '#ffb030'; }
    else if (S.phase === 'results') { role = S.surv.includes('me') ? 'You stayed hidden! +200' : 'Round over'; col = '#9aff60'; }
    else if (S.phase === 'hide') { role = S.seeker === 'me' ? 'Counting... eyes closed' : 'HIDE! Seeker is counting'; col = S.seeker === 'me' ? '#7fe8ff' : '#ffd27a'; }
    else if (S.seeker === 'me') { role = 'You are the SEEKER'; col = '#7fe8ff'; }
    else if (S.caught.has('me')) { role = 'Found. Watch the others.'; col = '#ff8a6a'; }
    else { role = 'Stay hidden!'; col = '#9aff60'; }
    x.fillStyle = col; x.fillText(role, 330, 52);
    const total = participants().length;
    x.fillStyle = '#d0f4ff'; x.fillText(S.phase === 'seek' && S.seeker !== 'bot' ? 'Found ' + S.caught.size : (N.NET.mode === 'solo' ? 'Solo vs the mannequin' : 'Players here: ' + total), 330, 110);
    S.hud.update();
}
export function dispose() {
    if (S) { S.scare.dispose(); S.hud.dispose(); S.intro.dispose(); camera.remove(S.blind); }
    N.onLevelMsg(null);
    S = null;
}
