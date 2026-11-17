// ==========================================
// GAME MODE: GENERATOR (grupa TEAM GAMES w salonie Games)
// Ciemna hala z czterema zepsutymi generatorami i potworem. Gracze współpracują: stoją przy generatorze (do ok. 2,3 m),
// aż naprawa dojdzie do 100%, a po naprawie wszystkich czterech otwiera się brama na północy. Kto przez nią ucieknie, dostaje 200 Bagabucks.
// Potwór (mannequin) nie widzi daleko, za to SŁYSZY: głos z mikrofonu, bieg i praca przy generatorze zwiększają promień, z którego cię namierza.
// Złapany gracz trafia do klatki. Uwolni go współgracz, który postoi przy klatce 2,5 s. Gdy wszyscy są w klatkach albo uciekli, runda się kończy.
// Solo: bez współgraczy złapanie kończy rundę. Rundą rządzi host (albo gracz solo), jak w innych trybach rund.
// ==========================================
import { THREE, L, tex, addCrispBlock } from '../core/engine.js';
import * as T from '../core/textures.js';
import { buildMannequin } from '../core/mannequin.js';
import { levelReward } from '../core/economy.js';
import { toast } from '../core/terminal.js';
import { setPlayerPosition } from '../core/player.js';
import * as N from '../core/network.js';
import * as SFX from '../core/audio.js';
import { buzz } from '../core/haptics.js';
import { createBot, stepBot } from '../core/botkit.js';
import { participants, isAuthority, headOf, toNet, fromNet } from '../core/roundkit.js';
import { buildDoor, cameraPanel, panelBg, drawInstructions, createJumpscare, introSeen } from '../core/levelkit.js';
import { ARRIVAL_FROM_GENERATOR } from './games.js';
import { A, GENS, GATE_Z, TIMES, MON, NOISE, noiseAt, micNoise, moveNoise, repairStep, helpersAt, rescueStep, helpersAtCage, pickTarget, canCatch, monsterSpeed, gateOpen, doneCount, roundOver as isRoundOver, outcomeOf, rewardFor } from '../core/generatorlogic.js';

const H = 8;                                          // wysokość hali; wymiary, stałe i logika rundy: core/generatorlogic.js
export const info = { id: 'generator', name: 'Generator', spawn: [0, 1.0, 18.5] };
let S = null;
const WAYPOINTS = [];                                 // punkty patrolu potwora (wypełniane przy budowie)

export function build() {
    L.spawn = info.spawn.slice();
    L.bounds = { minX: -A + 0.4, maxX: A - 0.4, minZ: -A + 0.4, maxZ: A - 0.4, maxY: H - 0.4 };
    S = {
        clock: 0, phase: 'wait', t: N.NET.mode === 'solo' ? TIMES.SOLO_WAIT : TIMES.WAIT, gen: GENS.map(() => 0), caged: new Map(), esc: new Set(), imm: {}, noise: {},
        bot: createBot(0, -12), lastHostMsg: -10, netT: 0, noiseT: 0, introT: 10, hudT: 0, rewarded: false, myNoise: 0, step: -1, gateWarn: -9, cages: new Map(), flicker: 0
    };
    S.bot.stun = 0;
    buildArena();
    buildDoor({ x: 0, z: A - 0.03, rotY: Math.PI, label: 'GAMES', color: '#d080ff', wood: 0x3a3048, portal: { target: 'games', spawn: ARRIVAL_FROM_GENERATOR, onEnter: () => toast('Back to BagaBoo Games') } });
    buildDoor({ x: -15, z: -A + 0.03, rotY: 0, label: 'EXIT', color: '#70ff90', glow: 0x60ff90, wood: 0x3a4a3a, light: true, portal: { target: 'games', spawn: ARRIVAL_FROM_GENERATOR, onEnter: () => toast('Back to BagaBoo Games') } });
    // Potwór: wysoki manekin z czerwonymi oczami i słabą czerwoną poświatą, żeby było widać, że się zbliża
    const m = buildMannequin(T.mkRng(7331)); m.group.scale.setScalar(1.5); m.group.visible = false; L.root.add(m.group);
    for (const sx of [-1, 1]) { const e = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex.dot, color: 0xff2000, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); e.scale.set(0.12, 0.12, 1); e.position.set(sx * 0.04, 0.152, 0.07); m.head.add(e); }
    S.mm = m;
    S.glow = new THREE.PointLight(0xff2010, 14, 9, 2); S.glow.visible = false; L.root.add(S.glow);
    S.hud = cameraPanel(1024, 200, 0.42, 0.082, 0.2, -0.75, 990);
    S.scare = createJumpscare({ seed: 7311 });
    S.intro = cameraPanel(1280, 760, 1.0, 0.594, -0.04, -1.05, 995); S.intro.last = -1;
    N.onLevelMsg(onNet);
}

// Stały układ (ten sam u wszystkich): skrzynie jako osłony i punkty patrolu, cztery generatory, brama ucieczki
function buildArena() {
    const R = T.mkRng(9090), boxes = [];
    addCrispBlock(0, -0.5, 0, A * 2 + 2, 1, A * 2 + 2, 0x6a6a70, 0x101014, tex.floor, { rough: tex.floorRough });
    addCrispBlock(0, H + 0.5, 0, A * 2 + 2, 1, A * 2 + 2, 0x3a3a42, 0x101014);
    for (const [x, z, w, d] of [[0, -A - 0.5, A * 2 + 2, 1], [0, A + 0.5, A * 2 + 2, 1], [-A - 0.5, 0, 1, A * 2], [A + 0.5, 0, 1, A * 2]]) addCrispBlock(x, H / 2, z, w, H, d, 0x8a8a84, 0x1a1a18, tex.wall);
    const fits = (x, z, w, d) => {
        if (Math.abs(x) + w / 2 > A - 2 || z + d / 2 > A - 5 || z - d / 2 < GATE_Z + 3) return false;   // wolne pasy: start, brama
        if (GENS.some(g => Math.abs(x - g[0]) < w / 2 + 3.2 && Math.abs(z - g[1]) < d / 2 + 3.2)) return false;   // wokół generatora zawsze wolne miejsce
        return boxes.every(b => Math.abs(x - b.x) > (w + b.w) / 2 + 1.0 || Math.abs(z - b.z) > (d + b.d) / 2 + 1.0);
    };
    const place = (w, h, d, col, tx, tries) => {
        for (let i = 0; i < tries; i++) {
            const x = (R() * 2 - 1) * (A - 3), z = (R() * 2 - 1) * (A - 4);
            if (!fits(x, z, w, d)) continue;
            addCrispBlock(x, h / 2, z, w, h, d, col, 0x201408, tx); boxes.push({ x: x, z: z, w: w, d: d }); return true;
        }
        return false;
    };
    for (let i = 0; i < 7; i++) { const horiz = R() < 0.5; place(horiz ? 5 : 0.8, 2.4, horiz ? 0.8 : 5, 0x7a6a58, tex.wood, 40); }
    for (let i = 0; i < 26; i++) place(1.1 + R() * 1.4, 0.9 + R() * 1.2, 1.1 + R() * 1.4, R() < 0.5 ? 0xa88860 : 0x8a7050, tex.wood, 30);
    WAYPOINTS.length = 0;
    for (let x = -16; x <= 16; x += 4.5) for (let z = -10; z <= 15; z += 4.5) if (boxes.every(b => Math.abs(x - b.x) > b.w / 2 + 0.9 || Math.abs(z - b.z) > b.d / 2 + 0.9)) WAYPOINTS.push([x, z]);
    // Generatory: obudowa, panel postępu (pasek rośnie z 0 do 100%) i światło (czerwone zepsute, zielone naprawione)
    S.gens = GENS.map(([x, z]) => {
        const g = new THREE.Group(); g.position.set(x, 0, z); L.root.add(g);
        addCrispBlock(x, 0.7, z, 1.6, 1.4, 1.0, 0x4a5a4a, 0x101810);
        const barGeo = new THREE.PlaneGeometry(1.4, 0.18); barGeo.translate(0.7, 0, 0);   // początek paska przy lewej krawędzi, więc rośnie w prawo
        const bar = new THREE.Mesh(barGeo, new THREE.MeshBasicMaterial({ color: 0x40ff60, toneMapped: false, side: THREE.DoubleSide })); bar.position.set(-0.7, 1.9, 0); bar.scale.x = 0.001; g.add(bar);
        const back = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.26), new THREE.MeshBasicMaterial({ color: 0x101010, side: THREE.DoubleSide })); back.position.set(0, 1.9, -0.01); g.add(back);
        const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 10), new THREE.MeshBasicMaterial({ color: 0xff2020, toneMapped: false })); lamp.position.set(0, 1.55, 0); g.add(lamp);
        const light = new THREE.PointLight(0xff2020, 20, 10, 2); light.position.set(0, 1.7, 0); g.add(light);
        return { g: g, bar: bar, back: back, lamp: lamp, light: light };
    });
    // Brama ucieczki: kraty (czerwone zamknięte, zielone otwarte) i szachownica na podłodze strefy
    const c = T.makeCanvas(1024, 128), g2 = c.getContext('2d');
    g2.clearRect(0, 0, 1024, 128); g2.fillStyle = '#ffffff'; for (let i = 0; i < 40; i++) g2.fillRect(i * 25.6 + 8, 0, 8, 128); g2.fillRect(0, 56, 1024, 12);
    S.gate = new THREE.Mesh(new THREE.PlaneGeometry(A * 2, 4), new THREE.MeshBasicMaterial({ map: T.toTex(c, false), color: 0xff3030, transparent: true, depthWrite: false, toneMapped: false, side: THREE.DoubleSide }));
    S.gate.position.set(0, 2, GATE_Z); L.root.add(S.gate);
    const zone = new THREE.Mesh(new THREE.PlaneGeometry(A * 2, GATE_Z + A), new THREE.MeshBasicMaterial({ color: 0x103018, transparent: true, opacity: 0.8 }));
    zone.rotation.x = -Math.PI / 2; zone.position.set(0, 0.015, (GATE_Z - A) / 2); L.root.add(zone);
    // Słabe lampy, żeby hala nie była całkiem czarna (latarka robi resztę)
    for (const [x, z] of [[0, 10], [0, -4]]) { const l = new THREE.PointLight(0xffe0b0, 16, 20, 1.8); l.position.set(x, H - 1, z); L.root.add(l); }
}

// ---------- SIEĆ ----------
function onNet(msg, from) {
    if (!S || !msg) return;
    if (N.NET.mode === 'host') { if (msg.k === 'nz' && typeof msg.v === 'number') S.noise[from] = { v: Math.max(0, Math.min(1, msg.v)), t: S.clock }; return; }
    if (msg.k !== 'st') return;
    S.lastHostMsg = S.clock;
    const prev = S.phase, wasCaged = S.caged.has('me'), wasEsc = S.esc.has('me'), oldGen = S.gen.slice();
    S.phase = msg.ph; S.t = msg.t; S.gen = msg.g || S.gen;
    S.caged = new Map((msg.cg || []).map(c => [fromNet(c[0]), { x: c[1], z: c[2], p: c[3] }]));
    S.esc = new Set((msg.es || []).map(fromNet));
    const m = msg.m, b = S.bot; if (m) { S.botTarget = m; if (!S.botSeen) { b.x = m[0]; b.y = m[1]; b.z = m[2]; S.botSeen = true; } b.mode = m[4] ? 'hunt' : 'patrol'; b.stun = m[5]; }
    S.gen.forEach((v, i) => { if (v >= 1 && oldGen[i] < 1) genDone(i); });
    if (!wasCaged && S.caged.has('me')) localCaught();
    if (wasCaged && !S.caged.has('me') && msg.ph === 'play') toast('You are free! Run!', '#7fc47f');
    if (!wasEsc && S.esc.has('me')) localEscaped();
    if (msg.ph === 'play' && prev !== 'play') startedPlay();
    if (msg.ph === 'results' && prev !== 'results') roundOver();
}
function broadcast() {
    const b = S.bot;
    N.sendLevelMsg({ k: 'st', ph: S.phase, t: S.t, g: S.gen.map(v => Math.round(v * 100) / 100), m: [Math.round(b.x * 10) / 10, Math.round(b.y * 10) / 10, Math.round(b.z * 10) / 10, Math.round(b.dir * 100) / 100, b.mode === 'hunt' ? 1 : 0, Math.round(b.stun * 10) / 10],
        cg: [...S.caged].map(([id, c]) => [toNet(id), Math.round(c.x * 10) / 10, Math.round(c.z * 10) / 10, Math.round(c.p * 100) / 100]), es: [...S.esc].map(toNet) });
}
function startedPlay() {
    S.rewarded = false; S.gateWarn = -9;
    setPlayerPosition((Math.random() * 2 - 1) * 10, 1.0, A - 3 + Math.random() * 1.5);
    toast('Repair all 4 generators, then escape north. Stay quiet!', '#ffe060');
}
function genDone(i) { toast('Generator ' + (i + 1) + ' online (' + doneCount(S.gen) + '/' + GENS.length + ')', '#7fff90'); SFX.bell && SFX.bell(); if (gateOpen(S.gen)) toast('The gate is open! Run north!', '#7fff90'); }
function localCaught() { toast('Caught! Wait for a teammate to free you.', '#e0533f'); SFX.scare(); buzz('both', 0.9, 300); if (S.scare) S.scare.trigger(); }
function localEscaped() { toast('You escaped!', '#7fc47f'); SFX.bell && SFX.bell(); }
function roundOver() {
    if (S.rewarded) return; S.rewarded = true;
    const res = outcomeOf('me', S.caged, S.esc);
    if (res === 'escaped') { toast('You made it out!', '#7fc47f'); levelReward('generator', rewardFor(res), rewardFor(res), 'escaped the generator hall'); }
    else if (res === 'caged') toast('You were caught. No reward this round.', '#e0533f');
    else toast('Time is up. The monster wins.', '#e0533f');
}

// ---------- MÓZG RUNDY (host albo gracz solo) ----------
const noiseOf = (id) => noiseAt(S.noise[id], S.clock);
const addNoise = (id, v) => { S.noise[id] = { v: Math.max(noiseOf(id), v), t: S.clock }; };
function resetRound() {
    S.gen = GENS.map(() => 0); S.caged.clear(); S.esc.clear(); S.imm = {}; S.noise = {};
    S.bot = createBot(0, -12); S.bot.stun = TIMES.GRACE;
}
function think(dt) {
    S.t -= dt;
    if (S.phase === 'wait') { if (S.t <= 0) { resetRound(); S.phase = 'play'; S.t = TIMES.ROUND; startedPlay(); } }
    else if (S.phase === 'play') {
        const ids = participants('generator'), act = ids.filter(id => !S.caged.has(id) && !S.esc.has(id));
        // Naprawa: im więcej osób przy generatorze (do 3), tym szybciej; praca robi hałas
        GENS.forEach((g, i) => {
            if (S.gen[i] >= 1) return;
            const near = act.filter(id => helpersAt(g, [headOf(id)]) > 0);
            if (!near.length) return;
            for (const id of near) addNoise(id, NOISE.REPAIR);
            S.gen[i] = repairStep(S.gen[i], near.length, dt);
            if (S.gen[i] >= 1) { genDone(i); S.bot.mode = 'hunt'; S.bot.last = [g[0], g[1], 1.6]; S.bot.lostT = 0; S.bot.stun = 0; }   // alarm: potwór biegnie do naprawionego generatora
        });
        // Uwalnianie z klatek: wolny gracz blisko klatki ładuje pasek, bez nikogo pasek opada
        for (const [id, c] of S.caged) {
            const r = rescueStep(c.p, helpersAtCage(c, act.map(fid => headOf(fid))), dt); c.p = r.p;
            if (r.freed) { S.caged.delete(id); S.imm[id] = S.clock + MON.immune; if (id === 'me') toast('You are free! Run!', '#7fc47f'); }
        }
        monsterThink(dt, act);
        // Ucieczka: brama otwarta po naprawie wszystkich generatorów, strefa za linią GATE_Z
        const open = gateOpen(S.gen);
        for (const id of act) { const h = headOf(id); if (open && h && h.z < GATE_Z && !S.esc.has(id)) { S.esc.add(id); if (id === 'me') localEscaped(); } }
        if (isRoundOver(ids, S.caged, S.esc, S.t)) { S.phase = 'results'; S.t = TIMES.RESULTS; roundOver(); }
    } else if (S.phase === 'results' && S.t <= 0) { S.phase = 'wait'; S.t = N.NET.mode === 'solo' ? TIMES.SOLO_WAIT : TIMES.WAIT; resetRound(); S.bot.stun = 0; }
}
// Potwór: słyszy hałas gracza w promieniu zależnym od jego głośności (plus krótki zasięg wzroku), idzie na ostatni znany ślad, w patrolu zagląda do generatorów
function monsterThink(dt, act) {
    const b = S.bot;
    if (b.stun > 0) { b.stun -= dt; return; }
    const players = act.map(id => { const h = headOf(id); return h && { id: id, x: h.x, y: h.y, z: h.z, noise: noiseOf(id), immune: (S.imm[id] || 0) > S.clock }; }).filter(Boolean);
    const best = pickTarget(b, players);
    if (best) { b.mode = 'hunt'; b.lostT = 0; b.last = [best.x, best.z, best.y]; }
    else if (b.mode === 'hunt') {
        b.lostT += dt;
        if (b.lostT > MON.lose || !b.last || Math.hypot(b.last[0] - b.x, b.last[1] - b.z) < 1.3) { b.mode = 'patrol'; b.goal = null; }
    }
    const done = doneCount(S.gen);
    let tx, tz, ty = 0, speed = MON.patrol;
    if (b.mode === 'hunt' && b.last) { tx = b.last[0]; tz = b.last[1]; ty = (b.last[2] || 1.6) - 1.2; speed = monsterSpeed('hunt', done); }
    else {
        if (!b.goal || Math.hypot(b.goal[0] - b.x, b.goal[1] - b.z) < 1.3) {
            const open = GENS.filter((g, i) => S.gen[i] < 1);
            if (open.length && Math.random() < 0.4) { const g = open[(Math.random() * open.length) | 0]; b.goal = [g[0] + (Math.random() - 0.5) * 3, g[1] + (Math.random() - 0.5) * 3]; }
            else b.goal = WAYPOINTS.length ? WAYPOINTS[(Math.random() * WAYPOINTS.length) | 0] : [0, 0];
        }
        tx = b.goal[0]; tz = b.goal[1]; speed = monsterSpeed('patrol', done);
    }
    stepBot(b, dt, tx, tz, ty, speed, b.mode === 'hunt');
    for (const id of act) {
        if ((S.imm[id] || 0) > S.clock) continue;
        const h = headOf(id); if (!h) continue;
        if (canCatch(b, h)) {
            S.caged.set(id, { x: h.x, z: h.z, p: 0 }); if (id === 'me') localCaught();
            b.stun = MON.stun; b.mode = 'patrol'; b.goal = null; break;
        }
    }
}

// ---------- CO KLATKĘ ----------
export function update(dt, t, ctx) {
    if (!S) return;
    S.clock += dt;
    const p = ctx.body.position, auth = isAuthority('generator', S), playing = S.phase === 'play';
    if (S.introSkip === undefined) { S.introSkip = introSeen('generator'); if (S.introSkip) S.introT = Math.min(S.introT, 3); }
    if (S.introT > 0) {
        S.introT -= dt; const sec = Math.max(0, Math.ceil(S.introT));
        if (sec !== S.intro.last) { S.intro.last = sec; drawInstructions(S.intro, 'Generator', [
            'Four generators are broken in a dark hall, and a monster patrols it.',
            'Stand next to a generator until the bar is full. More people repair it faster.',
            'The monster HEARS you: talking, running and repairing make noise. It only sees you from very close.',
            'If it catches you, you go into a cage. A teammate must stand by the cage for 2.5 s to free you.',
            'When all 4 are online, the north gate opens. Escaping = 200 Bagabucks. Alone, a catch ends the round.',
            'The GAMES door behind you takes you back.'], 'This closes in ' + sec + ' s', { bg: 'rgba(14,12,4,0.9)', border: '#ffd030', title: '#fff0b0', text: '#f4ecd0', footer: '#ffb030', size: 28 }); }
        S.intro.mesh.visible = S.introT > 0 && !S.introSkip;
    }
    // Mój hałas (mikrofon i ruch). Host liczy go od razu, gość wysyła do hosta co 0,25 s
    const caged = S.caged.has('me'), out = S.esc.has('me');
    const micN = micNoise(SFX.micLevel());
    const speedXZ = Math.hypot(ctx.body.velocity.x, ctx.body.velocity.z), moveN = moveNoise(speedXZ);
    S.myNoise += (Math.max(micN, moveN) - S.myNoise) * Math.min(1, dt * 10);
    if (auth) {
        S.noise.me = { v: playing && !caged && !out ? S.myNoise : 0, t: S.clock };
        think(dt);
        if (N.NET.mode === 'host') { S.netT -= dt; if (S.netT <= 0) { S.netT = 0.2; broadcast(); } }
    } else {
        S.noiseT -= dt;
        if (playing && !caged && !out && S.noiseT <= 0 && S.myNoise > 0.03) { S.noiseT = 0.25; N.sendLevelMsg({ k: 'nz', v: Math.round(S.myNoise * 100) / 100 }); }
        // Gość: potwór płynnie dąży do pozycji z hosta
        const b = S.bot, m = S.botTarget;
        if (m) { const k = Math.min(1, dt * 8); b.x += (m[0] - b.x) * k; b.y += (m[1] - b.y) * k; b.z += (m[2] - b.z) * k; let dd = m[3] - b.dir; dd = Math.atan2(Math.sin(dd), Math.cos(dd)); b.dir += dd * k; }
    }
    // Klatka: zamrożenie w miejscu. Brama zamknięta: miękka bariera (wraca przed linię)
    if (caged) { const c = S.caged.get('me'); ctx.body.position.set(c.x, Math.max(p.y, 1.0), c.z); ctx.body.velocity.set(0, 0, 0); }
    const open = gateOpen(S.gen);
    if (playing && !open && !out && p.z < GATE_Z) {
        setPlayerPosition(p.x, p.y, GATE_Z + 1.0); ctx.body.velocity.set(0, 0, 0);
        if (S.clock - S.gateWarn > 3) { S.gateWarn = S.clock; toast('The gate is locked. Repair all generators.', '#ff6a4a'); }
    }
    S.scare.update(dt);
    // Potwór: model, oczy, poświata, kroki i bicie serca
    const b = S.bot, show = playing || S.phase === 'results';
    S.mm.group.visible = show; S.glow.visible = show;
    if (show) {
        const stunned = b.stun > 0;
        S.mm.group.position.set(b.x, b.y + (b.ground && !stunned ? Math.abs(Math.sin(t * 8)) * 0.05 : 0), b.z); S.mm.group.rotation.y = b.dir;
        S.glow.position.set(b.x, b.y + 1.6, b.z);
        if (playing && !stunned && Math.floor(t * 2.2) !== S.step) { S.step = Math.floor(t * 2.2); SFX.step(b.mode === 'hunt' ? 0.9 : 0.45, { x: b.x, y: 0, z: b.z }); }
        const dist = Math.hypot(p.x - b.x, p.z - b.z);
        if (playing && dist < 12) SFX.heartbeat(Math.max(0, 1 - dist / 12));
    }
    // Generatory, klatki i brama
    S.flicker += dt;
    S.gens.forEach((o, i) => {
        const v = S.gen[i], done = v >= 1, col = done ? 0x40ff60 : (Math.sin(S.flicker * 6 + i) > 0 ? 0xff3020 : 0x802010);
        o.lamp.material.color.setHex(col); o.light.color.setHex(col); o.bar.scale.x = Math.max(0.001, v);
        o.bar.material.color.setHex(done ? 0x40ff60 : 0xffd030);
    });
    S.gate.material.color.setHex(open ? 0x40ff60 : 0xff3030); S.gate.material.opacity = open ? 0.25 : 0.8;
    syncCages();
    S.hudT -= dt; if (S.hudT <= 0) { S.hudT = 0.1; drawHud(); }
}
function syncCages() {
    for (const [id, m] of S.cages) if (!S.caged.has(id)) { L.root.remove(m); S.cages.delete(id); }
    for (const [id, c] of S.caged) {
        let m = S.cages.get(id);
        if (!m) {
            m = new THREE.Mesh(new THREE.BoxGeometry(1.3, 2.3, 1.3), new THREE.MeshBasicMaterial({ color: 0xff4040, wireframe: true, toneMapped: false })); L.root.add(m); S.cages.set(id, m);
        }
        m.position.set(c.x, 1.15, c.z); m.material.color.setRGB(1 - c.p * 0.7, 0.25 + c.p * 0.75, 0.25);
    }
}
function fmt(t) { t = Math.max(0, Math.ceil(t)); return Math.floor(t / 60) + ':' + String(t % 60).padStart(2, '0'); }
function drawHud() {
    const x = S.hud.ctx; panelBg(S.hud, 'rgba(14,12,4,0.72)');
    x.textBaseline = 'middle'; x.textAlign = 'left';
    x.font = 'bold 80px "Courier New", monospace'; x.fillStyle = '#fff0b0'; x.fillText(fmt(S.t), 30, 74);
    x.font = 'bold 30px "Courier New", monospace';
    const done = doneCount(S.gen);
    let msg, col = '#fff0b0';
    if (S.phase === 'wait') { msg = 'Next round starts soon'; col = '#ffb030'; }
    else if (S.phase === 'results') { msg = S.esc.has('me') ? 'You escaped! +200' : 'Round over'; col = '#9aff60'; }
    else if (S.esc.has('me')) { msg = 'Escaped!'; col = '#9aff60'; }
    else if (S.caged.has('me')) { msg = 'CAGED: wait for rescue'; col = '#ff5a4a'; }
    else if (done === GENS.length) { msg = 'GATE OPEN: run north!'; col = '#40ff70'; }
    else { msg = 'Repair generators ' + done + '/' + GENS.length; col = '#ffd27a'; }
    x.fillStyle = col; x.fillText(msg, 330, 52);
    // Miernik hałasu: pasek rośnie, gdy mówisz, biegasz albo naprawiasz
    x.font = '22px "Courier New", monospace'; x.fillStyle = '#c8c0a0'; x.fillText('NOISE', 330, 108);
    x.fillStyle = '#2a2418'; x.fillRect(420, 96, 500, 24);
    x.fillStyle = S.myNoise > 0.6 ? '#ff4a3a' : (S.myNoise > 0.25 ? '#ffb030' : '#7fe870'); x.fillRect(420, 96, 500 * Math.min(1, S.myNoise), 24);
    x.font = '22px "Courier New", monospace'; x.fillStyle = '#c8c0a0'; x.fillText(N.NET.mode === 'solo' ? 'Solo: one catch ends the round' : 'Players: ' + participants('generator').length + '   Caged: ' + S.caged.size, 330, 150);
    S.hud.update();
}
export function dispose() {
    if (S) { S.scare.dispose(); S.hud.dispose(); S.intro.dispose(); }
    N.onLevelMsg(null);
    S = null;
}
