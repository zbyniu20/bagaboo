// ==========================================
// FABRYKA TRYBÓW WYŚCIGOWYCH (Custom Race): runda oczekiwanie -> odliczanie -> wyścig -> wyniki, kolejność mety,
// host liczy stan i rozsyła go co 0,2 s, tryb solo to próba czasowa z czasem wzorcowym, rekordem i duchem (core/runkit.js).
// Wyścig Red Light robi to samo na sztywno; tutaj tor, kryteria mety i dodatkowe reguły podaje konfiguracja.
//   cfg.build(S)             buduje halę i tor (L.root), zwraca { finish(p) -> bool, exit: opcje drzwi EXIT za metą (buildDoor) }; może dopisać pola do S
//   cfg.frame(S, dt, p, ctx) co klatkę w wyścigu; zwrócenie 'caught' cofa gracza na start (np. maź), ustawia S.extra do HUD
//   cfg.respawn              'platform' (po upadku wracasz na ostatnią platformę) albo 'start'
// ==========================================
import { THREE, L, camera, addCrispBlock } from './engine.js';
import { levelReward, recordTime } from './economy.js';
import { toast } from './terminal.js';
import { setPlayerPosition, isGrounded } from './player.js';
import * as N from './network.js';
import * as SFX from './audio.js';
import { buzz } from './haptics.js';
import { createGhost } from './runkit.js';
import { buildDoor, cameraPanel, panelBg, drawInstructions, introSeen } from './levelkit.js';
import { stepPhase, registerFinish, raceOutcome, outcomeReward } from './racelogic.js';
import { pastFinishLine, validHead, elapsedSince, TOL } from './netguard.js';
import { headOf } from './roundkit.js';

void THREE; void camera; void addCrispBlock;
const WAIT = 12, SOLO_WAIT = 4, COUNTDOWN = 4, GRACE = 20, RESULTS = 9;
const fmt = (t) => { t = Math.max(0, t); return Math.floor(t / 60) + ':' + String(Math.floor(t % 60)).padStart(2, '0') + '.' + Math.floor((t * 10) % 10); };

export function createRaceMode(cfg) {
    let S = null;
    let PAR = cfg.par;   // tryby z mapą z danych (Własna mapa) podają czas wzorcowy z build()
    const START = cfg.spawn, REWARD = cfg.reward === undefined ? 200 : cfg.reward, MAX = cfg.roundMax;
    const info = { id: cfg.id, name: cfg.name, spawn: START.slice() };
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

    // ---------- SIEĆ ----------
    const isAuthority = () => { if (N.NET.mode !== 'guest') return true; const hs = N.hostState(); return !(hs && hs.lvl === cfg.id && S.clock - S.lastHostMsg < 1.5); };
    const participants = () => {
        const list = ['me'];
        if (N.NET.mode === 'host') for (const id in N.playersState) { if (id === N.myId()) continue; const st = N.playersState[id]; if (st && st.lvl === cfg.id && st.head) list.push(id); }
        return list;
    };
    const toNet = (id) => id === 'me' ? N.myId() : id;
    const fromNet = (id) => id === N.myId() ? 'me' : id;
    function onNet(msg, from) {
        if (!S || !msg) return;
        if (N.NET.mode === 'host') { if (msg.k === 'fin') guestFinish(from); return; }
        if (msg.k !== 'st') return;
        S.lastHostMsg = S.clock;
        const prev = S.phase;
        S.phase = msg.ph; S.t = msg.t; S.order = (msg.order || []).map(fromNet); S.times = {};
        for (const id in (msg.times || {})) S.times[fromNet(id)] = msg.times[id];
        S.total = msg.n || 1;
        if (msg.ph === 'countdown' && prev !== 'countdown') startedCountdown();
        if (msg.ph === 'race' && prev !== 'race') startedRace();
        if (msg.ph === 'results' && prev !== 'results') roundOver();
    }
    function broadcast() {
        const times = {}; for (const id in S.times) times[toNet(id)] = S.times[id];
        N.sendLevelMsg({ k: 'st', ph: S.phase, t: S.t, order: S.order.map(toNet), times: times, n: participants().length });
    }
    function startPos() { return [START[0] + (Math.random() - 0.5) * (cfg.startSpread || 3), START[1], START[2] + (Math.random() - 0.5) * 1.5]; }
    function startedCountdown() {
        S.rewarded = false; S.finished = false; S.lastPlat = null; S.falls = 0; S.myT = 0; S.order = []; S.times = {}; S.extra = ''; S.ghost.reset();
        if (cfg.onReset) cfg.onReset(S);
        const s = startPos(); setPlayerPosition(s[0], s[1], s[2]);
        toast('Get ready!', cfg.color || '#ffd27a');
    }
    function startedRace() { S.t0 = S.clock; toast('GO!', '#7fff90'); SFX.roar(0.5); buzz('both', 0.6, 250); }
    // Meta gościa: host nie ufa zgłoszonemu czasowi ani samemu zgłoszeniu. Sprawdza kryterium mety trybu na pozycji głowy gracza (z zapasem na opóźnienie sieci), a czas bierze z własnego zegara
    function guestFinish(id) { const h = validHead(headOf(id)); if (S.phase === 'race' && h && (S.hostFinish ? S.hostFinish(h) : S.finish({ x: h.x, y: h.y + 1, z: h.z - TOL.FINISH }))) handleFinish(id, elapsedSince(S.clock, S.t0)); }
    function handleFinish(id, t) { if (S.phase === 'race') registerFinish(S, id, t, GRACE); }
    function roundOver() {
        if (S.rewarded) return; S.rewarded = true;
        const total = S.total || participants().length, o = raceOutcome(S.order, total, S.times, PAR);
        if (o.kind === 'won') toast('You won!', '#7fc47f');
        else if (o.kind === 'place') toast('You finished #' + o.place, '#ffd27a');
        else if (o.kind === 'dnf') toast('You did not finish', '#e0533f');
        else if (o.kind === 'par' || o.kind === 'slow') {
            if (!cfg.noRecord) { const rec = recordTime(cfg.id, o.time); S.ghost.finish(rec, o.time); }   // mapy graczy nie zapisują rekordów
            toast(o.kind === 'par' ? 'Under par (' + PAR + ' s)! ' + o.time.toFixed(1) + ' s' : 'Finished in ' + o.time.toFixed(1) + ' s. Par is ' + PAR + ' s', o.kind === 'par' ? '#7fc47f' : '#ffd27a');
        } else toast('Time ran out. Try again!', '#e0533f');
        const reward = outcomeReward(o, REWARD, REWARD === 0 ? 0 : 150); if (reward) levelReward(cfg.id, reward, reward, o.kind === 'won' ? 'won ' + cfg.name : 'beat the par time');
    }
    function think(dt) {
        const r = stepPhase(S.phase, S.t, dt, { play: 'race', countdown: COUNTDOWN, roundMax: MAX, results: RESULTS, wait: N.NET.mode === 'solo' ? SOLO_WAIT : WAIT, allFinished: S.phase === 'race' && participants().every(id => S.order.includes(id)) });
        S.phase = r.phase; S.t = r.t;
        if (r.event === 'countdown') { S.total = participants().length; startedCountdown(); }
        else if (r.event === 'play') startedRace();
        else if (r.event === 'results') roundOver();
        else if (r.event === 'wait') { S.order = []; S.times = {}; }
    }

    // reward: 0 wyłącza też nagrodę za czas wzorcowy (mapy graczy), patrz roundOver
    // ---------- BUDOWA ----------
    function build() {
        L.spawn = START.slice();
        L.bounds = cfg.bounds;
        L.moveScale = cfg.moveScale || 1; L.maxUp = cfg.maxUp || 99; L.maxSpeedXZ = cfg.maxSpeedXZ || 0;
        if (cfg.floorY !== undefined) L.floorY = cfg.floorY;
        S = { ghost: createGhost(cfg.id), clock: 0, phase: 'wait', t: 0, order: [], times: {}, falls: 0, myT: 0, finished: false, lastHostMsg: -10, netT: 0, hudT: 0, introT: 10, rewarded: false, lastBeep: -1, lastPlat: null, extra: '', total: 1 };
        S.t = N.NET.mode === 'solo' ? SOLO_WAIT : WAIT;
        const built = cfg.build(S); S.finish = built.finish; S.hostFinish = built.hostFinish; if (built.par) PAR = built.par;
        buildDoor(Object.assign({ label: 'GAMES', color: '#d080ff', wood: 0x3a3048, portal: { target: 'games', spawn: cfg.arrival, onEnter: () => toast('Back to BagaBoo Games') } }, cfg.door));
        // Wyjście na końcu toru (po mecie): drzwi z napisem EXIT wracają do salonu Games, tak jak drzwi GAMES na starcie
        if (built.exit) buildDoor(Object.assign({ label: 'EXIT', color: '#70ff90', glow: 0x60ff90, wood: 0x3a4a3a, light: true, portal: { target: 'games', spawn: cfg.arrival, onEnter: () => toast('Back to BagaBoo Games') } }, built.exit));
        S.hud = cameraPanel(1024, 200, 0.42, 0.082, 0.2, -0.75, 990);
        S.intro = cameraPanel(1280, 760, 1.0, 0.594, -0.04, -1.05, 995); S.intro.last = -1;
        N.onLevelMsg(onNet);
    }

    // ---------- CO KLATKĘ ----------
    function update(dt, t, ctx) {
        if (!S) return;
        S.clock += dt;
        const p = ctx.body.position, auth = isAuthority();
        if (cfg.extraGravity) ctx.body.velocity.y -= cfg.extraGravity * dt;
        if (S.introSkip === undefined) { S.introSkip = introSeen(cfg.id); if (S.introSkip) S.introT = Math.min(S.introT, 3); }
        if (S.introT > 0) {
            S.introT -= dt; const sec = Math.max(0, Math.ceil(S.introT));
            if (sec !== S.intro.last) { S.intro.last = sec; drawInstructions(S.intro, cfg.name, cfg.introLines.concat(['Playing alone? It is a time trial: beat the par time for a reward. Your best run shows as a ghost.', 'The GAMES door takes you back.']), 'This closes in ' + sec + ' s', cfg.introStyle); }
            S.intro.mesh.visible = S.introT > 0 && !S.introSkip;
        }
        if (auth) { think(dt); if (N.NET.mode === 'host') { S.netT -= dt; if (S.netT <= 0) { S.netT = 0.2; broadcast(); } } }
        if (S.phase === 'countdown') {
            ctx.body.velocity.set(0, 0, 0);
            const sec = Math.ceil(S.t); if (sec !== S.lastBeep && sec > 0) { S.lastBeep = sec; SFX.step(0.6); toast(String(sec), '#ffd27a'); }
        }
        if (S.phase === 'race' && !S.finished) {
            S.myT += dt;
            if (cfg.respawn === 'platform') {
                // Ostatnia platforma, na której stałeś: tam wracasz po upadku (środek płyty, żeby nie spaść znowu z krawędzi)
                if (isGrounded()) {
                    const feet = p.y - 0.35;
                    for (const ob of L.obstacles) { const b = ob.box3; if (p.x >= b.min.x && p.x <= b.max.x && p.z >= b.min.z && p.z <= b.max.z && Math.abs(b.max.y - feet) < 0.45 && b.max.y > 0.4) { S.lastPlat = [(b.min.x + b.max.x) / 2, b.max.y, (b.min.z + b.max.z) / 2]; break; } }
                }
                if (p.y < cfg.fallY) {
                    const c = S.lastPlat || [START[0], START[1] - 1.2, START[2]]; setPlayerPosition(c[0], c[1] + 1.2, c[2]); ctx.body.velocity.set(0, 0, 0); S.falls++;
                    toast('Fell! Back to the last platform', '#ff6a4a'); buzz('both', 0.7, 200);
                }
            }
            if (cfg.frame && cfg.frame(S, dt, p, ctx) === 'caught') {
                const s = startPos(); setPlayerPosition(s[0], s[1], s[2]); ctx.body.velocity.set(0, 0, 0); S.falls++;
                toast(cfg.caughtText || 'Caught! Back to the start.', '#ff4a4a'); SFX.scare(); buzz('both', 0.8, 250);
            }
            if (S.finish(p)) {
                S.finished = true; toast('Finished! ' + S.myT.toFixed(1) + ' s', '#7fc47f'); SFX.bell && SFX.bell();
                if (N.NET.mode === 'host' || N.NET.mode === 'solo') handleFinish('me', S.myT); else N.sendLevelMsg({ k: 'fin', t: S.myT });
            }
        }
        S.ghost.tick(dt, p, S.phase === 'race' && !S.finished);
        S.hudT -= dt; if (S.hudT <= 0) { S.hudT = 0.15; drawHud(p); }
    }
    function drawHud(p) {
        const h = cfg.hud || {}, x = S.hud.ctx; panelBg(S.hud, h.bg || 'rgba(14,6,24,0.72)');
        x.textBaseline = 'middle'; x.textAlign = 'left';
        const ink = h.ink || '#ffd8f0';
        x.font = 'bold 74px "Courier New", monospace'; x.fillStyle = ink; x.fillText(S.phase === 'race' || S.finished ? fmt(S.finished ? S.times.me || S.myT : S.myT) : fmt(Math.max(0, S.t)), 30, 74);
        x.font = 'bold 30px "Courier New", monospace';
        let msg, col = ink;
        if (S.phase === 'wait') { msg = 'Race starts soon'; col = '#ffb030'; }
        else if (S.phase === 'countdown') { msg = 'Get ready... ' + Math.ceil(S.t); col = '#ffd27a'; }
        else if (S.phase === 'results') { const i = S.order.indexOf('me'); msg = i >= 0 ? 'You finished #' + (i + 1) : 'Round over'; col = '#9aff60'; }
        else if (S.finished) { const i = S.order.indexOf('me'); msg = 'Finished #' + (i + 1); col = '#9aff60'; }
        else { msg = 'GO!  ' + (cfg.fallsLabel || 'Falls') + ' ' + S.falls; col = '#7fff90'; }
        x.fillStyle = col; x.fillText(msg, 330, 52);
        x.fillStyle = ink; x.fillText(S.extra || '', 330, 110);
        x.font = '22px "Courier New", monospace'; x.fillStyle = '#c0a8c0'; x.fillText(N.NET.mode === 'solo' ? 'Time trial, par ' + PAR + ' s' : 'Racers here: ' + participants().length, 30, 162);
        S.hud.update();
    }
    function dispose() {
        if (S) { S.ghost.dispose(); S.hud.dispose(); S.intro.dispose(); if (cfg.dispose) cfg.dispose(S); }
        L.moveScale = 1; L.maxUp = 99; L.maxSpeedXZ = 0;
        N.onLevelMsg(null);
        S = null;
    }
    void clamp;
    const debug = () => S ? { phase: S.phase, finished: S.finished, falls: S.falls, extra: S.extra, time: S.myT } : null;   // dla testów
    return { info, build, update, dispose, debug };
}
