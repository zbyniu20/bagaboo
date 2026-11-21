// ==========================================
// LOBBY: NOCNA ZMIANA (oprawa 3D, sieć i nagrody; reguły są w core/lobbylogic.js i core/generatorlogic.js, testowane w Node)
//
// (Brama Wspólna, czyli głosowanie na tryb w lobby, została usunięta: głosowanie na mapę jest teraz w lobby trybu Become the Monster, levels/monster.js.)
//
// NOCNA ZMIANA: co kilkanaście minut lobby zapowiada awarię, gaśnie, po sali chodzi potwór (słyszy ruch, z bliska widzi),
//   a gracze razem naprawiają trzy bezpieczniki. Złapany wraca na start. Kto pomagał, dostaje nagrodę (dzienny limit powtórek).
//   Wyłączane w menu pauzy (Lobby events).
//
// ŚCIANA GRAFFITI: wspólny mural, konkurs i Galeria na wschodniej ścianie (core/graffiti.js, reguły w core/graffitilogic.js i core/graffitiround.js); lobbyplay tylko buduje ją, sprząta i przekazuje jej wiadomości sieciowe. Potwór i naprawa liczą się na hoście, goście dostają stan co 0,25 s.
// ==========================================
import { THREE, L, tex, applyLighting } from './engine.js';
import * as T from './textures.js';
import { LP, LIGHT_PRESETS } from './config.js';
import { SETTINGS } from './settings.js';
import { levelReward } from './economy.js';
import { toast } from './terminal.js';
import { setPlayerPosition } from './player.js';
import * as N from './network.js';
import * as SFX from './audio.js';
import { buzz } from './haptics.js';
import { buildMannequin } from './mannequin.js';
import { createBot, stepBot } from './botkit.js';
import { participants, isAuthority, headOf, toNet, fromNet } from './roundkit.js';
import { cameraPanel, panelBg } from './levelkit.js';
import { MON, REPAIR, pickTarget, canCatch, moveNoise, noiseAt, repairStep, helpersAt, gateOpen } from './generatorlogic.js';
import { buildGraffiti, disposeGraffiti, updateGraffiti, onGraffitiMsg } from './graffiti.js';
import { NIGHT, nextNightIn, nightStep, winners, nightDim } from './lobbylogic.js';

let S = null, dimNow = 1;
export const lobbyDim = () => dimNow;   // lobby.js mnoży przez to jasność swoich świateł

export function buildLobbyPlay() {
    S = {
        clock: 0, lastHostMsg: -10, netT: 0, hudT: 0, ctx: null,
        night: { ph: 'calm', t: nextNightIn(true, Math.random) }, outcome: null, fuse: NIGHT.FUSES.map(() => 0), contrib: {}, hits: {}, imm: {}, noise: {}, pos: {},
        win: null, bot: createBot(NIGHT.MONSTER_START[0], NIGHT.MONSTER_START[1]), botTarget: null, botSeen: false, myHits: 0, waypoints: null, step: -1, hud: null, light: false
    };
    S.bot.stun = 0; S.bot.mode = 'patrol';
    buildNight(); buildGraffiti();
    N.onLevelMsg(onMsg);
}
export function disposeLobbyPlay() {
    if (S && S.hud) S.hud.dispose();
    if (S && S.light) applyLighting(LP);
    disposeGraffiti(); dimNow = 1; N.onLevelMsg(null); S = null;
}

// ---------- NOC: budowa ----------
function buildNight() {
    S.fuses = NIGHT.FUSES.map(([x, z]) => {
        const grp = new THREE.Group(); grp.position.set(x, 0, z); L.root.add(grp);
        const box = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.2, 0.5), new THREE.MeshStandardMaterial({ color: 0x3a4a3a, roughness: 0.7 })); box.position.y = 0.6; grp.add(box);
        const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 10), new THREE.MeshBasicMaterial({ color: 0xff2020, toneMapped: false })); lamp.position.set(0, 1.35, 0); grp.add(lamp);
        const gb = new THREE.PlaneGeometry(0.7, 0.14); gb.translate(0.35, 0, 0);
        const bar = new THREE.Mesh(gb, new THREE.MeshBasicMaterial({ color: 0xffd030, toneMapped: false, side: THREE.DoubleSide })); bar.position.set(-0.35, 1.7, 0); bar.scale.x = 0.001; grp.add(bar);
        grp.visible = false;
        return { grp: grp, lamp: lamp, bar: bar };
    });
    const m = buildMannequin(T.mkRng(5151)); m.group.scale.setScalar(1.5); m.group.visible = false; L.root.add(m.group);
    for (const sx of [-1, 1]) { const e = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex.dot, color: 0xff2000, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); e.scale.set(0.12, 0.12, 1); e.position.set(sx * 0.04, 0.152, 0.07); m.head.add(e); }
    S.mm = m; S.glow = new THREE.PointLight(0xff2010, 14, 9, 2); S.glow.visible = false; L.root.add(S.glow);
}
function makeWaypoints() {
    const pts = [];
    for (let x = -12; x <= 12; x += 4) for (let z = -12; z <= 12; z += 4) if (L.obstacles.every(o => { const b = o.box3; return b.min.y > 2.2 || b.max.y < 0.2 || x < b.min.x - 1 || x > b.max.x + 1 || z < b.min.z - 1 || z > b.max.z + 1; })) pts.push([x, z]);
    return pts;
}

// ---------- SIEĆ ----------
function onMsg(msg, from) {
    if (!S || !msg) return;
    if (onGraffitiMsg(msg, from)) return;   // Ściana Graffiti ma własne wiadomości (gp, gd, gs)
    if (N.NET.mode === 'host' || msg.k !== 'lb') return;
    S.lastHostMsg = S.clock;
    const n = msg.n || {};
    const prev = S.night.ph; S.night = { ph: n.ph || 'calm', t: +n.t || 0 }; S.outcome = n.oc || null; S.fuse = n.f || S.fuse; S.win = n.w ? n.w.map(fromNet) : null;
    if (n.m) { S.botTarget = n.m; if (!S.botSeen) { S.bot.x = n.m[0]; S.bot.y = n.m[1]; S.bot.z = n.m[2]; S.botSeen = true; } S.bot.mode = n.m[4] ? 'hunt' : 'patrol'; S.bot.stun = n.m[5]; }
    const mine = n.h ? (n.h[N.myId()] || 0) : 0; if (mine > S.myHits) { S.myHits = mine; knockMe(); }
    if (prev !== S.night.ph) nightEvent(prev, S.night.ph, S.outcome);
}
function broadcast() {
    const b = S.bot, h = {}; for (const id in S.hits) h[toNet(id)] = S.hits[id];
    N.sendLevelMsg({ k: 'lb',
        n: { ph: S.night.ph, t: Math.round(S.night.t * 10) / 10, oc: S.outcome, f: S.fuse.map(v => Math.round(v * 100) / 100), w: S.win ? S.win.map(toNet) : null, h: h,
            m: [Math.round(b.x * 10) / 10, Math.round(b.y * 10) / 10, Math.round(b.z * 10) / 10, Math.round(b.dir * 100) / 100, b.mode === 'hunt' ? 1 : 0, Math.round(b.stun * 10) / 10] } });
}

// ---------- NOC: zdarzenia (te same na hoście i u gości) ----------
function nightEvent(prev, next, outcome) {
    if (next === 'warn') { toast('Night Shift in ' + NIGHT.WARN_SEC + ' s: stay together, fix the 3 fuse boxes', '#ffb347'); SFX.bell && SFX.bell(); }
    else if (next === 'night') {
        S.light = true; applyLighting(LIGHT_PRESETS.hideseek);
        toast('BLACKOUT! Repair all fuse boxes. It hears you run.', '#ff6a4a'); SFX.roar(0.5);
        S.fuses.forEach(f => { f.grp.visible = true; }); S.mm.group.visible = true; S.glow.visible = true;
        if (!S.hud) S.hud = cameraPanel(1024, 200, 0.42, 0.082, 0.2, -0.75, 990);
        S.myHits = S.myHits || 0;
    } else if (prev === 'night' && next === 'result') {
        S.light = false; applyLighting(LP);
        if (outcome === 'win') {
            toast('The lights are back!', '#7fff90'); SFX.bell && SFX.bell();
            if (S.win && S.win.includes('me')) levelReward('nightshift', NIGHT.REWARD, NIGHT.REWARD_REPEAT, 'saved the lobby');
        } else toast('The darkness won this time...', '#e0533f');
    } else if (next === 'calm') {
        S.fuses.forEach(f => { f.grp.visible = false; }); S.mm.group.visible = false; S.glow.visible = false; S.win = null;
        if (S.hud) { S.hud.dispose(); S.hud = null; }
    }
}
function knockMe() { const sp = L.spawn || [0, 2, 0]; setPlayerPosition(sp[0], sp[1], sp[2]); SFX.scare(); buzz('both', 0.9, 300); toast('It got you! Back to the start.', '#e0533f'); }

// ---------- HOST: Nocna Zmiana ----------
function noiseOf(id) { return noiseAt(S.noise[id], S.clock); }
function sampleNoise(id, head, ctx) {
    if (id === 'me') { S.noise.me = { v: moveNoise(Math.hypot(ctx.body.velocity.x, ctx.body.velocity.z)), t: S.clock }; return; }
    const p = S.pos[id];
    if (!p) { S.pos[id] = { x: head.x, z: head.z, t: S.clock }; return; }
    const d = Math.hypot(head.x - p.x, head.z - p.z);
    if (d > 0.001) { S.noise[id] = { v: moveNoise(d / Math.max(0.05, S.clock - p.t)), t: S.clock }; p.x = head.x; p.z = head.z; p.t = S.clock; }
}
function monsterThink(dt, ids, heads) {
    const b = S.bot;
    if (b.stun > 0) { b.stun -= dt; return; }
    const players = ids.map(id => { const h = heads[id]; return h && { id: id, x: h.x, y: h.y, z: h.z, noise: noiseOf(id), immune: (S.imm[id] || 0) > S.clock }; }).filter(Boolean);
    const best = pickTarget(b, players);
    if (best) { b.mode = 'hunt'; b.lostT = 0; b.last = [best.x, best.z, best.y]; }
    else if (b.mode === 'hunt') { b.lostT += dt; if (b.lostT > MON.lose || !b.last || Math.hypot(b.last[0] - b.x, b.last[1] - b.z) < 1.3) { b.mode = 'patrol'; b.goal = null; } }
    let tx, tz, ty = 0, speed = NIGHT.PATROL;
    if (b.mode === 'hunt' && b.last) { tx = b.last[0]; tz = b.last[1]; ty = (b.last[2] || 1.6) - 1.2; speed = NIGHT.HUNT; }
    else {
        if (!b.goal || Math.hypot(b.goal[0] - b.x, b.goal[1] - b.z) < 1.3) {
            const open = NIGHT.FUSES.filter((f, i) => S.fuse[i] < 1);   // w patrolu zagląda do niedokończonych bezpieczników
            if (open.length && Math.random() < 0.35) { const f = open[(Math.random() * open.length) | 0]; b.goal = [f[0] + (Math.random() - 0.5) * 3, f[1] + (Math.random() - 0.5) * 3]; }
            else { S.waypoints = S.waypoints || makeWaypoints(); b.goal = S.waypoints.length ? S.waypoints[(Math.random() * S.waypoints.length) | 0] : [0, 0]; }
        }
        tx = b.goal[0]; tz = b.goal[1];
    }
    stepBot(b, dt, tx, tz, ty, speed, b.mode === 'hunt');
    for (const p of players) if (!p.immune && canCatch(b, p)) {
        S.hits[p.id] = (S.hits[p.id] || 0) + 1; S.imm[p.id] = S.clock + MON.immune; b.stun = MON.stun; b.mode = 'patrol'; b.goal = null;
        if (p.id === 'me') { S.myHits = S.hits.me; knockMe(); }
        break;
    }
}
function hostNight(dt, ids, heads, ctx) {
    const night = S.night.ph === 'night';
    if (night) {
        for (const id of ids) sampleNoise(id, heads[id], ctx);
        NIGHT.FUSES.forEach((f, i) => {
            if (S.fuse[i] >= 1) return;
            const near = ids.filter(id => helpersAt(f, [heads[id]]) > 0);
            if (!near.length) return;
            for (const id of near) S.contrib[id] = (S.contrib[id] || 0) + dt;
            S.fuse[i] = repairStep(S.fuse[i], near.length, dt * (REPAIR.SEC / NIGHT.FUSE_SEC));
            if (S.fuse[i] >= 1) { toast('Fuse box ' + (i + 1) + ' repaired (' + S.fuse.filter(v => v >= 1).length + '/' + NIGHT.FUSES.length + ')', '#7fff90'); SFX.bell && SFX.bell(); }
        });
        monsterThink(dt, ids, heads);
    }
    const prev = S.night.ph, r = nightStep(S.night, dt, { enabled: SETTINGS.lobbyEvents !== false, present: ids.length, allFuses: night && gateOpen(S.fuse) }, Math.random);
    S.night = { ph: r.ph, t: r.t }; if (r.outcome) S.outcome = r.outcome;
    if (r.event === 'warn' || r.event === 'start') {
        if (r.event === 'start') { S.fuse = NIGHT.FUSES.map(() => 0); S.contrib = {}; S.hits = {}; S.imm = {}; S.noise = {}; S.pos = {}; S.bot = createBot(NIGHT.MONSTER_START[0], NIGHT.MONSTER_START[1]); S.bot.stun = 6; S.botSeen = false; S.myHits = 0; }
        nightEvent(prev, r.ph, null);
    } else if (r.event === 'win' || r.event === 'lose') {
        S.win = r.event === 'win' ? winners(ids, S.contrib) : null; S.outcome = r.outcome; nightEvent('night', 'result', r.outcome);
    } else if (r.event === 'end') { S.outcome = null; nightEvent('result', 'calm', null); }
}

// ---------- CO KLATKĘ ----------
export function updateLobbyPlay(dt, t, ctx) {
    if (!S) return;
    S.clock += dt; S.ctx = ctx;
    const auth = isAuthority('lobby', S), ids = participants('lobby'), heads = {};
    for (const id of ids) { const h = headOf(id); if (h) heads[id] = h; }
    if (auth) {
        hostNight(dt, ids, heads, ctx);
        if (N.NET.mode === 'host') { S.netT -= dt; if (S.netT <= 0) { S.netT = 0.25; broadcast(); } }
    } else if (S.botTarget) {   // gość: potwór płynnie dąży do pozycji z hosta
        const b = S.bot, m = S.botTarget, k = Math.min(1, dt * 8); b.x += (m[0] - b.x) * k; b.y += (m[1] - b.y) * k; b.z += (m[2] - b.z) * k;
        let dd = m[3] - b.dir; dd = Math.atan2(Math.sin(dd), Math.cos(dd)); b.dir += dd * k;
    }
    // Ściemnienie lobby i stan obiektów
    dimNow = nightDim(S.night.ph, S.night.t);
    updateGraffiti(dt, auth, { dim: dimNow, night: S.night.ph, enabled: SETTINGS.lobbyEvents !== false });   // Ściana Graffiti: ciemnieje w nocy, konkurs czeka na koniec Nocnej Zmiany
    const active = S.night.ph === 'night';
    S.fuses.forEach((f, i) => { const v = S.fuse[i] || 0, done = v >= 1; f.lamp.material.color.setHex(done ? 0x40ff60 : (Math.sin(S.clock * 6 + i) > 0 ? 0xff3020 : 0x802010)); f.bar.scale.x = Math.max(0.001, v); f.bar.material.color.setHex(done ? 0x40ff60 : 0xffd030); });
    if (active || S.night.ph === 'result') {
        const b = S.bot, stunned = b.stun > 0;
        S.mm.group.position.set(b.x, b.y + (b.ground && !stunned ? Math.abs(Math.sin(t * 8)) * 0.05 : 0), b.z); S.mm.group.rotation.y = b.dir; S.glow.position.set(b.x, b.y + 1.6, b.z);
        if (active && !stunned && Math.floor(t * 2.2) !== S.step) { S.step = Math.floor(t * 2.2); SFX.step(b.mode === 'hunt' ? 0.9 : 0.45, { x: b.x, y: 0, z: b.z }); }
        const d = Math.hypot(ctx.pos.x - b.x, ctx.pos.z - b.z); if (active && d < 12) SFX.heartbeat(Math.max(0, 1 - d / 12));
    }
    if (S.hud) { S.hudT -= dt; if (S.hudT <= 0) { S.hudT = 0.2; drawHud(); } }
}
function drawHud() {
    const x = S.hud.ctx; panelBg(S.hud, 'rgba(14,8,4,0.72)'); x.textBaseline = 'middle'; x.textAlign = 'left';
    const done = S.fuse.filter(v => v >= 1).length, over = S.night.ph === 'result';
    x.font = 'bold 40px "Courier New", monospace'; x.fillStyle = over ? (S.outcome === 'win' ? '#9aff60' : '#ff6a4a') : '#ffd27a';
    x.fillText(over ? (S.outcome === 'win' ? 'LIGHTS ARE BACK' : 'THE DARK WON') : 'NIGHT SHIFT: fuse boxes ' + done + '/' + NIGHT.FUSES.length, 30, 60);
    x.font = '26px "Courier New", monospace'; x.fillStyle = '#d8c8b0'; x.fillText(over ? 'Next one in a while' : 'Stand by a fuse box to repair it. Running is loud. ' + Math.ceil(S.night.t) + ' s left', 30, 130);
    S.hud.update();
}

// Punkt kontrolny dla testów w przeglądarce (tests/smoke.mjs): odczyt stanu i wymuszenie zdarzeń
export function debugLobbyPlay(cmd) {
    if (!S) return null;
    if (cmd === 'night') S.night = { ph: 'calm', t: 0.05 };   // przyspiesza odliczanie: zapowiedź zaczyna się zwykłą ścieżką (z ustawieniem lobbyEvents)
    if (cmd === 'fuses') S.fuse = S.fuse.map(() => 1);
    if (cmd === 'stun') S.bot.stun = 999;   // potwór stoi (test naprawy bez przerywania)
    return { night: S.night.ph, fuse: S.fuse.slice(), dim: dimNow, hits: { ...S.hits }, light: S.light, hud: !!S.hud, bot: [S.bot.x, S.bot.z, S.bot.stun] };
}
