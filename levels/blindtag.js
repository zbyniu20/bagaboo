// ==========================================
// GAME MODE: BLIND TAG (wejście z salonu BagaBoo Games, grupa PARTY GAMES)
// Ciemna hala ze słupami i skrzyniami. Jeden gracz jest ŚLEPYM szukającym: widzi tylko na kilka metrów (gęsta mgła), ale SŁYSZY kroki
// biegnących i każdy taki dźwięk zostawia na chwilę świetlny pierścień (sonar) w miejscu, skąd dobiegł. Reszta skrada się: chodzenie jest
// ciche, bieg robi hałas. Szukający łapie dłonią (głowa lub tułów). Gdy złapie wszystkich, wygrywa 200 Bagabucks; kto przetrwa do końca, też 200.
// Solo: szuka cię manekin-bot, który reaguje na twój bieg (hałas), a skradającego się usłyszy dopiero z bliska. Rekord: ile sekund przetrwasz.
// ==========================================
import { THREE, L, tex, scene, camera, addCrispBlock } from '../core/engine.js';
import * as T from '../core/textures.js';
import { buildMannequin } from '../core/mannequin.js';
import { levelReward, recordScore } from '../core/economy.js';
import { toast } from '../core/terminal.js';
import { hands, setPlayerPosition } from '../core/player.js';
import * as N from '../core/network.js';
import { TAGS } from '../core/avatar.js';
import * as SFX from '../core/audio.js';
import { setMusicMute } from '../core/music.js';
import { buzz } from '../core/haptics.js';
import { createBot, stepBot } from '../core/botkit.js';
import { buildDoor, cameraPanel, panelBg, drawInstructions, introSeen } from '../core/levelkit.js';
import { participants, isAuthority, toNet, fromNet, headOf, handsOf, touching } from '../core/roundkit.js';
import { ARRIVAL_FROM_BLINDTAG } from './games.js';

const A = 19, H = 8;
const WAIT = 12, SOLO_WAIT = 4, HEAD = 8, HUNT = 100, RESULTS = 8, REWARD = 200;
const RUN_NOISE = 1.9, WALK_QUIET = 1.2, NOISE_EVERY = 0.5;       // m/s: powyżej RUN_NOISE robisz hałas, poniżej WALK_QUIET jesteś cichy
const CATCH_DIST = 0.5, SEEKER_FOG = 0.3, SEEKER_SPAWN = [0, 1.0, 0];
const BOT = { walk: 2.4, chase: 4.6, hear: 16, close: 2.5, lose: 5 };
const SPAWNS = [[-16, 1, 16], [16, 1, 16], [-16, 1, -16], [16, 1, -16], [-16, 1, 0], [16, 1, 0], [0, 1, 16], [0, 1, -16]];
export const info = { id: 'blindtag', name: 'Blind Tag', spawn: [0, 1.0, 16] };
let S = null, baseFog = 0.02;
const WAYPOINTS = [];
const _v = new THREE.Vector3();

export function build() {
    TAGS.hidden = true;   // nazwy nie mogą zdradzać pozycji
    setMusicMute(true);   // cisza: liczą się kroki
    L.spawn = info.spawn.slice();
    L.bounds = { minX: -A + 0.4, maxX: A - 0.4, minZ: -A + 0.4, maxZ: A - 0.4, maxY: H - 0.4 };
    baseFog = scene.fog ? scene.fog.density : 0.02;
    S = { clock: 0, phase: 'wait', t: N.NET.mode === 'solo' ? SOLO_WAIT : WAIT, seeker: null, caught: new Set(), surv: [], lastHostMsg: -10, netT: 0, introT: 10, hudT: 0, rewarded: false, bot: null, myLastNoise: 0, track: {}, noiseT: 0, survivedT: 0, stepT: 0, rings: [] };
    buildArena();
    buildDoor({ x: 0, z: A - 0.03, rotY: Math.PI, label: 'GAMES', color: '#d080ff', wood: 0x3a3048, portal: { target: 'games', spawn: ARRIVAL_FROM_BLINDTAG, onEnter: () => toast('Back to BagaBoo Games') } });
    // Znacznik szukającego (widoczny dla reszty) i bot
    const mc = T.makeCanvas(256, 64), mx = mc.getContext('2d');
    mx.font = 'bold 44px sans-serif'; mx.textAlign = 'center'; mx.textBaseline = 'middle'; mx.fillStyle = '#ff8a5a'; mx.shadowColor = '#ff4a10'; mx.shadowBlur = 14; mx.fillText('SEEKER', 128, 34);
    S.tag = new THREE.Sprite(new THREE.SpriteMaterial({ map: T.toTex(mc, false), transparent: true, depthWrite: false })); S.tag.scale.set(1.2, 0.3, 1); S.tag.visible = false; L.root.add(S.tag);
    const b = buildMannequin(T.mkRng(5151)); b.group.scale.setScalar(1.2); b.group.visible = false; L.root.add(b.group);
    for (const sx of [-1, 1]) { const e = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex.dot, color: 0xff6a20, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); e.scale.set(0.12, 0.12, 1); e.position.set(sx * 0.05, 1.6, -0.1); b.group.add(e); }
    S.botMesh = b;
    // Opaska na oczy w fazie przewagi i pierścienie sonaru (rysowane ponad ciemnością)
    S.blind = new THREE.Mesh(new THREE.PlaneGeometry(3, 3), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0, depthTest: false }));
    S.blind.position.z = -0.25; S.blind.renderOrder = 1004; camera.add(S.blind);
    const rc = T.makeCanvas(128, 128), rx = rc.getContext('2d');
    rx.strokeStyle = '#a0f0ff'; rx.lineWidth = 10; rx.beginPath(); rx.arc(64, 64, 50, 0, 7); rx.stroke(); rx.strokeStyle = 'rgba(160,240,255,0.35)'; rx.lineWidth = 22; rx.beginPath(); rx.arc(64, 64, 38, 0, 7); rx.stroke();
    S.ringTex = T.toTex(rc, false);
    for (let i = 0; i < 10; i++) {
        const r = new THREE.Sprite(new THREE.SpriteMaterial({ map: S.ringTex, transparent: true, blending: THREE.AdditiveBlending, depthTest: false, depthWrite: false, fog: false, opacity: 0 }));
        r.renderOrder = 1010; r.visible = false; L.root.add(r); S.rings.push({ s: r, age: 9 });
    }
    S.hud = cameraPanel(1024, 200, 0.42, 0.082, 0.2, -0.75, 990);
    S.intro = cameraPanel(1280, 760, 1.0, 0.594, -0.04, -1.05, 995); S.intro.last = -1;
    N.onLevelMsg(onNet);
}
// Hala: słupy i skrzynie ułożone stałym ziarnem (te same u wszystkich)
function buildArena() {
    const R = T.mkRng(6363), boxes = [];
    addCrispBlock(0, -0.5, 0, A * 2 + 2, 1, A * 2 + 2, 0x4a4a52, 0x101014, tex.floor, { rough: tex.floorRough });
    addCrispBlock(0, H + 0.5, 0, A * 2 + 2, 1, A * 2 + 2, 0x24242c, 0x101014);
    for (const [x, z, w, d] of [[0, -A - 0.5, A * 2 + 2, 1], [0, A + 0.5, A * 2 + 2, 1], [-A - 0.5, 0, 1, A * 2], [A + 0.5, 0, 1, A * 2]]) addCrispBlock(x, H / 2, z, w, H, d, 0x6a6a74, 0x14141a, tex.wall);
    const fits = (x, z, w, d) => Math.abs(x) + w / 2 < A - 3 && Math.abs(z) + d / 2 < A - 3 && !(Math.abs(x) < 2.5 && Math.abs(z) < 2.5) && boxes.every(b => Math.abs(x - b.x) > (w + b.w) / 2 + 1.0 || Math.abs(z - b.z) > (d + b.d) / 2 + 1.0);
    const place = (w, h, d, col, tx, tries) => {
        for (let i = 0; i < tries; i++) {
            const x = (R() * 2 - 1) * (A - 4), z = (R() * 2 - 1) * (A - 4);
            if (!fits(x, z, w, d)) continue;
            addCrispBlock(x, h / 2, z, w, h, d, col, 0x201808, tx); boxes.push({ x: x, z: z, w: w, d: d }); return true;
        }
        return false;
    };
    for (let i = 0; i < 16; i++) place(0.9, H - 0.5, 0.9, 0x7a7a84, tex.wall, 40);           // słupy do chowania się za nimi
    for (let i = 0; i < 18; i++) place(1.6 + R() * 1.4, 0.9 + R() * 1.1, 1.6 + R() * 1.4, 0x8a7258, tex.wood, 30);
    WAYPOINTS.length = 0;
    for (let x = -15; x <= 15; x += 5) for (let z = -15; z <= 15; z += 5) if (boxes.every(b => Math.abs(x - b.x) > b.w / 2 + 1 || Math.abs(z - b.z) > b.d / 2 + 1)) WAYPOINTS.push([x, z]);
    for (const [x, z] of [[-12, -12], [12, -12], [-12, 12], [12, 12], [0, 0]]) { const l = new THREE.PointLight(0x7a90b8, 10, 14, 1.8); l.position.set(x, H - 1, z); L.root.add(l); }   // bardzo słabe światło: ledwo widać
}

// ---------- SIEĆ ----------
function onNet(msg) {
    if (!S || !msg || N.NET.mode === 'host' || msg.k !== 'st') return;
    S.lastHostMsg = S.clock;
    const prev = S.phase;
    S.phase = msg.ph; S.t = msg.t; S.seeker = msg.sk ? fromNet(msg.sk) : null;
    const was = S.caught.has('me');
    S.caught = new Set((msg.caught || []).map(fromNet)); S.surv = (msg.surv || []).map(fromNet);
    if (!was && S.caught.has('me')) localCaught();
    if (msg.ph === 'head' && prev !== 'head') startedHead();
    if (msg.ph === 'hunt' && prev !== 'hunt') startedHunt();
    if (msg.ph === 'results' && prev !== 'results') roundOver();
}
function broadcast() { N.sendLevelMsg({ k: 'st', ph: S.phase, t: S.t, sk: S.seeker && S.seeker !== 'bot' ? toNet(S.seeker) : null, caught: [...S.caught].map(toNet), surv: S.surv.map(toNet) }); }
function startedHead() {
    S.rewarded = false; S.survivedT = 0;
    if (S.seeker === 'me') { setPlayerPosition(SEEKER_SPAWN[0], SEEKER_SPAWN[1], SEEKER_SPAWN[2]); toast('You are the BLIND SEEKER. Count to ' + HEAD + '...', '#ff8a5a'); }
    else { const sp = SPAWNS[(Math.random() * SPAWNS.length) | 0]; setPlayerPosition(sp[0] + (Math.random() - 0.5) * 2, sp[1], sp[2] + (Math.random() - 0.5) * 2); toast((S.seeker === 'bot' ? 'A mannequin hunts you by sound. ' : 'Hide! ') + 'Walk slowly: running makes noise.', '#ffd27a'); }
}
function startedHunt() {
    if (S.seeker === 'me') { toast('Hunt! Listen for footsteps. Rings show the noise.', '#ff8a5a'); SFX.roar(0.5); buzz('both', 0.6, 300); }
    else toast('The seeker is loose. Stay quiet!', '#ff6a4a');
}
function roundOver() {
    if (S.rewarded) return; S.rewarded = true;
    if (S.seeker === 'bot') {
        const n = Math.floor(S.survivedT); recordScore('blindtag', n);
        if (S.surv.includes('me')) { toast('You outlasted the hunter!', '#7fc47f'); levelReward('blindtag', 150, 150, 'survived Blind Tag'); } else toast('You were found after ' + n + ' s.', '#ffd27a');
    } else if (S.surv.includes('me')) { toast('You stayed hidden!', '#7fc47f'); levelReward('blindtag', REWARD, REWARD, 'survived Blind Tag'); }
    else if (S.seeker === 'me' && S.surv.length === 0) { toast('You found everyone!', '#7fc47f'); levelReward('blindtag', REWARD, REWARD, 'caught everyone'); }
    else if (S.seeker === 'me') toast('Time is up. Some got away.', '#ffb030');
    else toast('You were caught. No reward this round.', '#e0533f');
}
function localCaught() { SFX.scare(); toast('You were caught! Watch the others.', '#e0533f'); }
function catchPlayer(id) { S.caught.add(id); if (id === 'me') localCaught(); if (S.seeker === 'me') { SFX.stinger(); buzz('both', 0.7, 150); toast('Caught one! ' + S.caught.size, '#ff8a5a'); } }

// ---------- MÓZG RUNDY (host albo gracz solo) ----------
function think(dt, p) {
    S.t -= dt;
    if (S.phase === 'wait') {
        if (S.t <= 0) {
            const parts = participants('blindtag');
            S.seeker = parts.length >= 2 ? parts[(Math.random() * parts.length) | 0] : 'bot';
            S.caught = new Set(); S.surv = []; S.phase = 'head'; S.t = HEAD;
            if (S.seeker === 'bot') S.bot = createBot(SEEKER_SPAWN[0], SEEKER_SPAWN[2]);
            startedHead();
        }
    } else if (S.phase === 'head') {
        if (S.t <= 0) { S.phase = 'hunt'; S.t = HUNT; startedHunt(); }
    } else if (S.phase === 'hunt') {
        const runners = participants('blindtag').filter(id => id !== S.seeker);
        if (S.seeker === 'bot') botThink(dt, p);
        else for (const id of runners) if (!S.caught.has(id) && touching(handsOf(S.seeker), headOf(id), CATCH_DIST)) catchPlayer(id);
        if (S.seeker === 'bot' && !S.caught.has('me')) S.survivedT += dt;
        if (S.t <= 0 || runners.every(id => S.caught.has(id))) { S.surv = runners.filter(id => !S.caught.has(id)); S.phase = 'results'; S.t = RESULTS; roundOver(); }
    } else if (S.phase === 'results' && S.t <= 0) { S.phase = 'wait'; S.t = N.NET.mode === 'solo' ? SOLO_WAIT : WAIT; S.seeker = null; S.bot = null; }
}

// ---------- BOT: słyszy bieg, skradającego się usłyszy dopiero z bliska ----------
function botThink(dt, p) {
    const b = S.bot;
    if (S.caught.has('me')) { b.mode = 'patrol'; return; }
    const d = Math.hypot(p.x - b.x, p.z - b.z), noisy = S.mySpeed > RUN_NOISE && d < BOT.hear, near = d < BOT.close;
    if (noisy || near) { b.mode = 'chase'; b.lostT = 0; b.last = [p.x, p.z]; }
    else if (b.mode === 'chase') { b.lostT += dt; if (b.lostT > BOT.lose) { b.mode = 'patrol'; b.goal = null; } }
    let tx, tz, speed = BOT.walk;
    if (b.mode === 'chase' && b.last) { tx = b.last[0]; tz = b.last[1]; speed = BOT.chase; if (Math.hypot(tx - b.x, tz - b.z) < 1.2) { b.mode = 'patrol'; b.goal = null; } }
    else {
        if (!b.goal || Math.hypot(b.goal[0] - b.x, b.goal[1] - b.z) < 1.3) b.goal = WAYPOINTS.length ? WAYPOINTS[(Math.random() * WAYPOINTS.length) | 0] : [0, 0];
        tx = b.goal[0]; tz = b.goal[1];
    }
    stepBot(b, dt, tx, tz, p.y - 0.35, speed, b.mode === 'chase');
    if (d < 1.0 && Math.abs(p.y - (b.y + 1.0)) < 1.5) catchPlayer('me');
}

// ---------- HAŁAS I SONAR ----------
function ring(x, y, z) {
    const r = S.rings.reduce((a, b) => (b.age > a.age ? b : a), S.rings[0]);
    r.age = 0; r.s.position.set(x, y, z); r.s.visible = true;
}
function trackNoise(dt) {
    // Szukający widzi i słyszy hałas innych (pierścienie + kroki z ich pozycji); reszta słyszy kroki szukającego
    S.noiseT -= dt;
    const others = Object.keys(N.playersState).filter(id => { const st = N.playersState[id]; return id !== N.myId() && st && st.lvl === 'blindtag' && st.head; });   // każdy klient widzi pozycje innych graczy w tym poziomie
    for (const id of others.concat(S.bot ? ['bot'] : [])) {
        const head = id === 'bot' ? new THREE.Vector3(S.bot.x, S.bot.y + 1.6, S.bot.z) : headOf(id); if (!head) continue;
        const tr = S.track[id] || (S.track[id] = { x: head.x, z: head.z, t: S.clock, speed: 0, next: 0 });
        const dtt = S.clock - tr.t; if (dtt > 0.05) { tr.speed = Math.hypot(head.x - tr.x, head.z - tr.z) / dtt; tr.x = head.x; tr.z = head.z; tr.t = S.clock; }
        if (S.phase !== 'hunt' || tr.speed < (id === S.seeker || id === 'bot' ? WALK_QUIET : RUN_NOISE) || S.clock < tr.next) continue;
        tr.next = S.clock + NOISE_EVERY;
        const amI = S.seeker === 'me', isSeeker = id === S.seeker || id === 'bot';
        if (amI && !isSeeker && !S.caught.has(id)) { SFX.step(Math.min(1, 0.4 + tr.speed / 6), { x: head.x, y: 0, z: head.z }); ring(head.x, 1.3, head.z); }
        if (!amI && isSeeker) SFX.step(0.9, { x: head.x, y: 0, z: head.z });
    }
}

// ---------- CO KLATKĘ ----------
export function update(dt, t, ctx) {
    if (!S) return;
    S.clock += dt;
    const p = ctx.body.position, auth = isAuthority('blindtag', S);
    S.mySpeed = Math.hypot(ctx.body.velocity.x, ctx.body.velocity.z);
    if (S.introSkip === undefined) { S.introSkip = introSeen('blindtag'); if (S.introSkip) S.introT = Math.min(S.introT, 3); }
    if (S.introT > 0) {
        S.introT -= dt; const sec = Math.max(0, Math.ceil(S.introT));
        if (sec !== S.intro.last) { S.intro.last = sec; drawInstructions(S.intro, 'Blind Tag', [
            'One player is the BLIND SEEKER: dense darkness, but good ears. Everyone else hides in the dark hall.',
            'Running makes noise. The seeker hears your steps and sees a sonar ring where they came from. Walking is silent.',
            'The seeker catches you by touching your head or body. Caught everyone = 200 Bagabucks. Not caught = 200 too.',
            'Playing alone? A mannequin hunts you. It reacts to running and only notices a sneaking player from close by.',
            'The GAMES door behind you takes you back.'], 'This closes in ' + sec + ' s', { bg: 'rgba(8,10,20,0.9)', border: '#ff8a5a', title: '#ffe4d0', text: '#dce4f0', footer: '#ffb030', size: 28 }); }
        S.intro.mesh.visible = S.introT > 0 && !S.introSkip;
    }
    if (auth) { think(dt, p); if (N.NET.mode === 'host') { S.netT -= dt; if (S.netT <= 0) { S.netT = 0.2; broadcast(); } } }
    trackNoise(dt);
    // Ślepy szukający: opaska w fazie przewagi (stoi w miejscu), potem gęsta mgła; reszta widzi normalnie (słabe światło)
    const amSeeker = S.seeker === 'me' && (S.phase === 'head' || S.phase === 'hunt');
    const blindfold = S.seeker === 'me' && S.phase === 'head';
    S.blind.material.opacity += ((blindfold ? 1 : 0) - S.blind.material.opacity) * Math.min(1, dt * 8); S.blind.visible = S.blind.material.opacity > 0.01;
    if (blindfold) { ctx.body.position.set(SEEKER_SPAWN[0], SEEKER_SPAWN[1], SEEKER_SPAWN[2]); ctx.body.velocity.set(0, 0, 0); }
    if (scene.fog) scene.fog.density += ((amSeeker && !blindfold ? SEEKER_FOG : baseFog) - scene.fog.density) * Math.min(1, dt * 3);
    // Pierścienie sonaru: rosną i blakną (widać je tylko szukającemu)
    for (const r of S.rings) { if (!r.s.visible) continue; r.age += dt; const k = r.age / 1.1; if (k >= 1) { r.s.visible = false; continue; } r.s.scale.setScalar(0.6 + k * 3.2); r.s.material.opacity = (S.seeker === 'me' ? 0.9 : 0) * (1 - k); }
    // Bot i znacznik szukającego
    const active = S.phase === 'head' || S.phase === 'hunt' || S.phase === 'results';
    let mpos = null;
    if (active && S.seeker === 'bot' && S.bot) {
        const b = S.bot, m = S.botMesh; m.group.visible = true;
        m.group.position.set(b.x, b.y + (b.ground && S.phase === 'hunt' ? Math.abs(Math.sin(t * 8)) * 0.05 : 0), b.z); m.group.rotation.y = b.dir;
        mpos = new THREE.Vector3(b.x, b.y + 2.3, b.z);
        if (S.phase === 'hunt') { const d = Math.hypot(p.x - b.x, p.z - b.z); if (d < 14) SFX.heartbeat(Math.max(0, 1 - d / 14)); }
    } else S.botMesh.group.visible = false;
    if (active && S.seeker && S.seeker !== 'bot' && S.seeker !== 'me') mpos = headOf(S.seeker);
    S.tag.visible = !!mpos && S.seeker !== 'me'; if (mpos) S.tag.position.copy(mpos).y += 0.55;
    S.hudT -= dt; if (S.hudT <= 0) { S.hudT = 0.15; drawHud(); }
    void hands; void _v;
}
function fmt(t) { t = Math.max(0, Math.ceil(t)); return Math.floor(t / 60) + ':' + String(t % 60).padStart(2, '0'); }
function drawHud() {
    const x = S.hud.ctx; panelBg(S.hud, 'rgba(8,10,20,0.72)');
    x.textBaseline = 'middle'; x.textAlign = 'left';
    x.font = 'bold 80px "Courier New", monospace'; x.fillStyle = '#e0e8ff'; x.fillText(fmt(S.t), 30, 74);
    x.font = 'bold 30px "Courier New", monospace';
    let role, col = '#e0e8ff';
    if (S.phase === 'wait') { role = 'Next round starts soon'; col = '#ffb030'; }
    else if (S.phase === 'results') { role = S.surv.includes('me') ? 'You stayed hidden! +200' : 'Round over'; col = '#9aff60'; }
    else if (S.phase === 'head') { role = S.seeker === 'me' ? 'Counting... eyes closed' : 'HIDE! Walk quietly'; col = S.seeker === 'me' ? '#ff8a5a' : '#ffd27a'; }
    else if (S.seeker === 'me') { role = 'You are the BLIND SEEKER'; col = '#ff8a5a'; }
    else if (S.caught.has('me')) { role = 'Caught. Watch the others.'; col = '#ff8a6a'; }
    else if (S.mySpeed > RUN_NOISE) { role = 'LOUD! Slow down'; col = '#ff5a3a'; }
    else { role = 'Quiet. Stay hidden!'; col = '#9aff60'; }
    x.fillStyle = col; x.fillText(role, 330, 52);
    x.fillStyle = '#e0e8ff'; x.fillText(S.seeker === 'bot' ? 'Solo vs the mannequin' : (S.phase === 'hunt' ? 'Caught ' + S.caught.size : 'Players here: ' + participants('blindtag').length), 330, 110);
    S.hud.update();
}
export const debug = () => S ? { phase: S.phase, seeker: S.seeker, caught: S.caught.size, rings: S.rings.filter(r => r.s.visible).length } : null;   // dla testów
export function dispose() {
    TAGS.hidden = false; setMusicMute(false);
    if (scene.fog) scene.fog.density = baseFog;
    if (S) { S.hud.dispose(); S.intro.dispose(); camera.remove(S.blind); if (S.ringTex) S.ringTex.dispose(); }
    N.onLevelMsg(null);
    S = null;
}
