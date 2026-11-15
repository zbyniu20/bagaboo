// ==========================================
// DŹWIĘK PRZESTRZENNY POZIOMÓW (ambient 3D, bez plików)
// Stałe źródła w konkretnych miejscach (buczenie świetlówek w szpitalu, trzask lawy, huk maszyn w pralni, wiatr na cmentarzu)
// oraz losowe odgłosy z kierunku wokół gracza (kapanie, odległe huki, skrzypienie, pohukiwanie sowy, dzwon, kliknięcia automatów).
// Dźwięk idzie przez HRTF, więc słychać kierunek i odległość. Głośność = suwak Effects.
// ==========================================
import { camera } from './engine.js';
import { audioBus, spatial, noiseBuf, creak, bang, whisper, setRoom } from './audio.js';

// loops: stałe źródła [typ, [[x,y,z], ...]], rand: losowe odgłosy { t: typ, e: [min,max] s między, d: [min,max] m od gracza, v: głośność }
const DEFS = {
    levels: { rand: [{ t: 'creak', e: [12, 24], d: [5, 12], v: 0.12 }] },
    maze: { rand: [{ t: 'creak', e: [7, 15], d: [15, 32], v: 0.18 }, { t: 'whisper', e: [28, 55], d: [8, 20], v: 0.5 }] },
    silence: { rand: [{ t: 'creak', e: [9, 18], d: [10, 22], v: 0.14 }] },
    well: { rand: [{ t: 'drip', e: [2, 5], d: [2, 6], v: 0.3 }, { t: 'creak', e: [10, 20], d: [6, 14], v: 0.18 }] },
    laundry: { loops: [['machine', [[-10, 2, -10], [10, 2, -22], [-10, 2, -36], [10, 2, -46]]]], rand: [{ t: 'thud', e: [4, 9], d: [8, 26], v: 0.35 }, { t: 'drip', e: [3, 7], d: [3, 12], v: 0.2 }] },
    memory: { loops: [['crackle', [[-7, 1, -5], [7, 1, -20], [-7, 1, -35], [7, 1, -50]]]], rand: [{ t: 'thud', e: [8, 16], d: [10, 25], v: 0.3 }] },
    lava: { loops: [['crackle', [[0, 1, -8], [0, 1, -24], [0, 1, -40], [0, 1, -56]]]], rand: [{ t: 'thud', e: [9, 18], d: [10, 25], v: 0.28 }] },
    hospital: { loops: [['hum', [[0, 3.2, -4], [0, 3.2, -13], [0, 3.2, -22], [0, 3.2, -31], [0, 3.2, -40]]]], rand: [{ t: 'drip', e: [3, 8], d: [3, 9], v: 0.25 }, { t: 'bang', e: [18, 40], d: [18, 30], v: 0.3 }, { t: 'creak', e: [10, 22], d: [6, 16], v: 0.15 }] },
    cemetery: { loops: [['wind', null]], rand: [{ t: 'owl', e: [12, 25], d: [18, 34], v: 0.3 }, { t: 'bell', e: [30, 55], d: [25, 40], v: 0.35 }] },
    games: { rand: [{ t: 'blip', e: [0.5, 1.8], d: [4, 22], v: 0.16 }] }
};
let cur = null, loops = [], timers = [], pending = true;
const rnd = (a, b) => a + Math.random() * (b - a);
const _p = { x: 0, y: 0, z: 0 };

export function setAmbience(levelId) { setRoom(levelId); stopLoops(); cur = DEFS[levelId] || null; pending = true; timers = []; }
function stopLoops() { for (const l of loops) { try { l.stop(); } catch (e) {} } loops = []; }

// ---------- SYNTEZA ----------
function tone(ctx, dst, t0, f0, f1, dur, vol, type) {
    const o = ctx.createOscillator(), g = ctx.createGain(); o.type = type || 'sine';
    o.frequency.setValueAtTime(f0, t0); if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), t0 + Math.min(0.02, dur / 3)); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(dst); o.start(t0); o.stop(t0 + dur + 0.05);
}
function oneShot(ctx, def, pos) {
    const t0 = ctx.currentTime, v = def.v;
    if (def.t === 'creak') return creak(v, pos);
    if (def.t === 'bang') return bang(pos);
    if (def.t === 'whisper') return whisper(pos);
    const dst = spatial(pos);
    if (def.t === 'drip') { tone(ctx, dst, t0, 1900, 800, 0.12, v); tone(ctx, dst, t0 + 0.22, 1500, 700, 0.14, v * 0.35); tone(ctx, dst, t0 + 0.42, 1300, 650, 0.16, v * 0.15); }
    else if (def.t === 'owl') { tone(ctx, dst, t0, 420, 360, 0.5, v); tone(ctx, dst, t0 + 0.7, 400, 330, 0.7, v * 0.9); }
    else if (def.t === 'bell') { for (const [m, a] of [[1, 1], [2.76, 0.5], [5.4, 0.25]]) tone(ctx, dst, t0, 196 * m, 196 * m, 4, v * a); }
    else if (def.t === 'thud') { tone(ctx, dst, t0, 70, 32, 0.4, v); }
    else if (def.t === 'blip') { const n = [330, 392, 440, 523, 660, 784, 880][(Math.random() * 7) | 0]; tone(ctx, dst, t0, n, n, 0.09, v, 'square'); if (Math.random() < 0.4) tone(ctx, dst, t0 + 0.1, n * 1.5, n * 1.5, 0.09, v, 'square'); }
}
// Stałe źródła: zwraca { stop(), tick(dt) }
function startLoop(ctx, type, pos) {
    const dst = pos ? spatial({ x: pos[0], y: pos[1], z: pos[2] }, null, true) : audioBus().master, nodes = [];
    const gainNode = ctx.createGain(); gainNode.connect(dst);
    const src = (kind, f, q) => { const s = ctx.createBufferSource(); s.buffer = noiseBuf(2); s.loop = true; const fl = ctx.createBiquadFilter(); fl.type = kind; fl.frequency.value = f; if (q) fl.Q.value = q; s.connect(fl); fl.connect(gainNode); s.start(); nodes.push(s); return fl; };
    const osc = (wave, f) => { const o = ctx.createOscillator(); o.type = wave; o.frequency.value = f; o.connect(gainNode); o.start(); nodes.push(o); return o; };
    let tick = null;
    if (type === 'hum') { gainNode.gain.value = 0.03; const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 500; gainNode.disconnect(); gainNode.connect(f); f.connect(dst); osc('square', 100); osc('sine', 200); }
    else if (type === 'machine') { gainNode.gain.value = 0.06; const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 220; gainNode.disconnect(); gainNode.connect(f); f.connect(dst); osc('sawtooth', 48 + Math.random() * 6); src('lowpass', 300); }
    else if (type === 'crackle') { gainNode.gain.value = 0.05; src('highpass', 2600); src('bandpass', 700, 1.5); tick = () => gainNode.gain.setTargetAtTime(0.01 + Math.random() * 0.13, ctx.currentTime, 0.05); }
    else if (type === 'wind') {
        gainNode.gain.value = 0.07; src('bandpass', 420, 0.6);
        const lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = 0.12; lg.gain.value = 0.05; lfo.connect(lg); lg.connect(gainNode.gain); lfo.start(); nodes.push(lfo);
    }
    return { stop() { for (const n of nodes) { try { n.stop(); } catch (e) {} } gainNode.disconnect(); }, tick: tick };
}

function aroundPlayer(d) {
    camera.getWorldPosition(_q);
    const a = Math.random() * Math.PI * 2, r = rnd(d[0], d[1]);
    return { x: _q.x + Math.cos(a) * r, y: Math.max(0.5, _q.y + rnd(-0.5, 2)), z: _q.z + Math.sin(a) * r };
}
const _q = camera.position.clone();
let last = performance.now();
function tick() {
    const bus = audioBus(), now = performance.now(), dt = Math.min(1, (now - last) / 1000); last = now;
    if (!bus || bus.ctx.state !== 'running' || !cur) return;
    const ctx = bus.ctx;
    if (pending) {
        pending = false;
        for (const [type, poss] of (cur.loops || [])) { if (poss) for (const p of poss) loops.push(startLoop(ctx, type, p)); else loops.push(startLoop(ctx, type, null)); }
        timers = (cur.rand || []).map(r => rnd(r.e[0], r.e[1]) * 0.6);
    }
    for (const l of loops) if (l.tick) l.tick();
    (cur.rand || []).forEach((r, i) => { timers[i] -= dt; if (timers[i] <= 0) { timers[i] = rnd(r.e[0], r.e[1]); oneShot(ctx, r, aroundPlayer(r.d)); } });
}
setInterval(tick, 250);
