// ==========================================
// DŹWIĘK (Web Audio, bez plików): mroczne tło, krzyk, huk, skrzypienie, bicie serca
// Dźwięk przestrzenny 3D (HRTF): przekaż pozycję {x, y, z}, a słychać go z właściwego kierunku i odległości.
// initAudio() musi zostać wywołane po kliknięciu przycisku (wymóg przeglądarek)
// ==========================================
import { SETTINGS, GAMES_CALM } from './settings.js';
import { buzz } from './haptics.js';
import { LEVEL_DEFS } from './registry.js';
let ctx = null, master = null, droneGain = null, scareBus = null, shaper = null;
const DRONE = 0.07;
const hb = { next: 0 };
// Haki dla muzyki i ambientu (music.js, ambience.js): zmiana głośności, wyciszenie przy jumpscare'ie, poziom zagrożenia
export const hooks = { onVolumes: null, onDuck: null, onScare: null };
let threat = { i: 0, until: 0 };
// Zagrożenie 0..1: bicie serca (im bliżej potwór) i głośne zdarzenia podbijają je na krótko; muzyka robi się szybsza i gęstsza
export function bumpThreat(i, secs) { if (!ctx) return; const t = ctx.currentTime; if (i >= threat.i || t > threat.until) threat = { i: i, until: t + (secs || 0.4) }; }
export function threatLevel() { return ctx && ctx.currentTime < threat.until ? threat.i : 0; }
export function audioBus() { return ctx ? { ctx: ctx, master: master } : null; }
export function spatial(pos, dest, raw) { return ctx ? outAt(pos, dest, raw) : null; }   // raw = bez filtra odległości i pogłosu (dla źródeł działających długo, bo odległość się zmienia)
export function noiseBuf(sec) { return ctx ? noiseBuffer(sec) : null; }

export function getAudioContext() { return ctx; }
export function initAudio() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = 0.9 * SETTINGS.effects; master.connect(ctx.destination);
    // Osobny, głośniejszy tor dla jumpscare'ów: przester + kompresor (głośno, ale bez trzasków)
    const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -12; comp.knee.value = 6; comp.ratio.value = 6; comp.attack.value = 0.002; comp.release.value = 0.25;
    comp.connect(ctx.destination);
    scareBus = ctx.createGain(); scareBus.gain.value = 2.2 * SETTINGS.scare; scareBus.connect(comp);
    shaper = ctx.createWaveShaper(); shaper.curve = distortionCurve(60); shaper.oversample = '4x'; shaper.connect(scareBus);
    // Niskie, pulsujące tło
    droneGain = ctx.createGain(); droneGain.gain.value = DRONE * SETTINGS.music;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 220;
    droneGain.connect(lp); lp.connect(master);
    for (const f of [41, 41.6, 61.7]) { const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.connect(droneGain); o.start(); }
    const lfo = ctx.createOscillator(), lfoG = ctx.createGain(); lfo.frequency.value = 0.07; lfoG.gain.value = 120;
    lfo.connect(lfoG); lfoG.connect(lp.frequency); lfo.start();
    // Co jakiś czas odległe skrzypienie
    setInterval(() => { if (Math.random() < 0.35) creak(0.25); }, 9000);
}
export function setDrone(level) { if (droneGain) droneGain.gain.setTargetAtTime(level * SETTINGS.music, ctx.currentTime, 0.8); }
// Zastosuj głośności z ustawień (muzyka, efekty, jumpscare'y)
export function applyVolumes() {
    if (!ctx) return;
    const t = ctx.currentTime;
    master.gain.setTargetAtTime(0.9 * SETTINGS.effects, t, 0.05);
    scareBus.gain.setTargetAtTime(2.2 * SETTINGS.scare, t, 0.05);
    droneGain.gain.setTargetAtTime(DRONE * SETTINGS.music, t, 0.05);
    if (hooks.onVolumes) hooks.onVolumes();
}
// Słuchacz = głowa gracza (wołane co klatkę)
const _f = { x: 0, y: 0, z: -1 }, _u = { x: 0, y: 1, z: 0 };
export function updateListener(camera) {
    if (!ctx) return;
    const e = camera.matrixWorld.elements, L = ctx.listener;
    const px = e[12], py = e[13], pz = e[14];
    lis.x = px; lis.y = py; lis.z = pz;
    _f.x = -e[8]; _f.y = -e[9]; _f.z = -e[10]; _u.x = e[4]; _u.y = e[5]; _u.z = e[6];
    if (L.positionX) {
        const t = ctx.currentTime;
        L.positionX.setValueAtTime(px, t); L.positionY.setValueAtTime(py, t); L.positionZ.setValueAtTime(pz, t);
        L.forwardX.setValueAtTime(_f.x, t); L.forwardY.setValueAtTime(_f.y, t); L.forwardZ.setValueAtTime(_f.z, t);
        L.upX.setValueAtTime(_u.x, t); L.upY.setValueAtTime(_u.y, t); L.upZ.setValueAtTime(_u.z, t);
    } else { L.setPosition(px, py, pz); L.setOrientation(_f.x, _f.y, _f.z, _u.x, _u.y, _u.z); }
}
// ---------- POGŁOS POMIESZCZENIA ----------
// Wspólna szyna pogłosu (ConvolverNode z syntetyczną odpowiedzią impulsową): każdy dźwięk 3D wysyła do niej część sygnału, tym więcej, im dalej jest źródło.
// Dzięki temu bliski krok jest suchy i konkretny, a daleki huk rozmywa się w hali. Parametry zależą od poziomu (setRoom).
const ROOMS = Object.fromEntries(LEVEL_DEFS.filter(d => d.room).map(d => [d.id, d.room]));   // z core/registry.js
const ROOM_DEFAULT = { sec: 1.4, wet: 0.1 };
const rv = { conv: null, ret: null, wet: ROOM_DEFAULT.wet, sec: 0 };
const lis = { x: 0, y: 0, z: 0 };   // ostatnia pozycja słuchacza (do liczenia odległości źródeł)
function impulse(sec) {
    const n = Math.floor(ctx.sampleRate * sec), b = ctx.createBuffer(2, n, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
        const d = b.getChannelData(c); let lp = 0;
        for (let i = 0; i < n; i++) {
            const k = i / n, a = 0.15 + 0.7 * (1 - k);          // z czasem coraz ciemniejszy ogon (wysokie tony giną pierwsze)
            lp += (Math.random() * 2 - 1 - lp) * a;
            d[i] = lp * Math.pow(1 - k, 2.4) * (i < 400 ? i / 400 : 1);
        }
    }
    return b;
}
function ensureReverb() {
    if (!ctx || rv.conv) return;
    rv.conv = ctx.createConvolver(); rv.ret = ctx.createGain(); rv.ret.gain.value = 1;
    rv.conv.connect(rv.ret); rv.ret.connect(master);
    setRoom(rv.pendingRoom);
}
export function setRoom(id) {
    const r = ROOMS[id] || ROOM_DEFAULT; rv.pendingRoom = id; rv.wet = r.wet;
    if (!ctx) return;
    if (!rv.conv) { ensureReverb(); return; }
    if (Math.abs(rv.sec - r.sec) > 0.05) { rv.conv.buffer = impulse(r.sec); rv.sec = r.sec; }
}
// Wyjście dźwięku: pozycja 3D {x,y,z}, stary pan -1..1 albo prosto do głośników.
// Dźwięk 3D: HRTF, filtr dolnoprzepustowy rosnący z odległością (powietrze tłumi wysokie tony) i wysyłka do pogłosu.
function outAt(pos, dest, raw) {
    const toMaster = !raw && (!dest || dest === master);
    dest = dest || master;
    if (pos && typeof pos === 'object') {
        const p = ctx.createPanner();
        p.panningModel = 'HRTF'; p.distanceModel = 'inverse'; p.refDistance = 2.5; p.maxDistance = 60; p.rolloffFactor = 1.1;
        if (p.positionX) { p.positionX.value = pos.x; p.positionY.value = pos.y; p.positionZ.value = pos.z; } else p.setPosition(pos.x, pos.y, pos.z);
        if (!toMaster) { p.connect(dest); return p; }
        ensureReverb();
        const dist = Math.hypot(pos.x - lis.x, pos.y - lis.y, pos.z - lis.z);
        const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 0.5;
        lp.frequency.value = Math.max(1800, 18000 / (1 + dist * 0.14));
        p.connect(lp); lp.connect(dest);
        if (rv.conv) { const send = ctx.createGain(); send.gain.value = rv.wet * Math.min(2.2, 0.35 + dist / 14); lp.connect(send); send.connect(rv.conv); }
        return p;
    }
    if (typeof pos === 'number' && ctx.createStereoPanner) { const sp = ctx.createStereoPanner(); sp.pan.value = Math.max(-1, Math.min(1, pos)); sp.connect(dest); return sp; }
    return dest;
}

function noiseBuffer(sec) {
    const b = ctx.createBuffer(1, Math.floor(ctx.sampleRate * sec), ctx.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return b;
}
function env(g, t0, peak, attack, decay) {
    g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(peak, t0 + attack); g.gain.exponentialRampToValueAtTime(0.0001, t0 + attack + decay);
}
function distortionCurve(k) {
    const n = 1024, c = new Float32Array(n);
    for (let i = 0; i < n; i++) { const x = i * 2 / n - 1; c[i] = (3 + k) * x * 20 * Math.PI / 180 / (Math.PI + k * Math.abs(x)); }
    return c;
}
// Tło na chwilę cichnie, żeby uderzenie było mocniejsze
function duckDrone(t0) {
    if (hooks.onDuck) hooks.onDuck(t0);
    if (!droneGain) return;
    droneGain.gain.cancelScheduledValues(t0);
    droneGain.gain.setValueAtTime(0.0001, t0);
    droneGain.gain.setTargetAtTime(DRONE * SETTINGS.music, t0 + 2.2, 0.8);
}
function saw(t0, f, f2, dur, vol, out) {
    const o = ctx.createOscillator(), g = ctx.createGain(), vib = ctx.createOscillator(), vg = ctx.createGain();
    o.type = 'sawtooth'; o.frequency.setValueAtTime(f, t0); o.frequency.exponentialRampToValueAtTime(f2, t0 + dur);
    vib.frequency.value = 9 + Math.random() * 6; vg.gain.value = f * 0.04; vib.connect(vg); vg.connect(o.frequency);
    env(g, t0, vol, 0.008, dur); o.connect(g); g.connect(out);
    o.start(t0); vib.start(t0); o.stop(t0 + dur + 0.1); vib.stop(t0 + dur + 0.1);
}
// Wrzask manekina (scenka z klatką); z pozycją słychać go z kierunku klatki
export function scream(pos) {
    if (!ctx) return;
    const t0 = ctx.currentTime;
    if (pos) {
        const out = outAt(pos), g0 = ctx.createGain(); g0.gain.value = 2.0; g0.connect(out);
        for (const f of [880, 933, 1240]) saw(t0, f, f * 0.45, 1.1, 0.25, g0);
        const n0 = ctx.createBufferSource(); n0.buffer = noiseBuffer(1.3);
        const b0 = ctx.createBiquadFilter(); b0.type = 'bandpass'; b0.Q.value = 3; b0.frequency.setValueAtTime(2400, t0); b0.frequency.exponentialRampToValueAtTime(700, t0 + 1.2);
        const ng0 = ctx.createGain(); env(ng0, t0, 0.8, 0.02, 1.2); n0.connect(b0); b0.connect(ng0); ng0.connect(g0); n0.start(t0);
        return;
    }
    const n = ctx.createBufferSource(); n.buffer = noiseBuffer(1.3);
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 3;
    bp.frequency.setValueAtTime(2400, t0); bp.frequency.exponentialRampToValueAtTime(700, t0 + 1.2);
    const g = ctx.createGain(); env(g, t0, 0.8, 0.02, 1.2);
    n.connect(bp); bp.connect(g); g.connect(shaper); n.start(t0);
    for (const f of [880, 933, 1240]) saw(t0, f, f * 0.45, 1.1, 0.2, shaper);
}
// Głos "gooby" (syntezowany, bez pliku dźwiękowego): źródło krtaniowe (dwie piły, lekkie vibrato) przechodzi przez trzy ruchome filtry formantowe.
// Samogłoski kolejno: "u" (goo), zwarcie "b", "a" i "i" (by). f0 = wysokość głosu w Hz, vol = głośność.
function goobyVoice(t0, f0, vol) {
    const dur = 1.05, g = ctx.createGain(), out = ctx.createGain(), dirt = ctx.createGain();
    out.gain.value = vol; dirt.gain.value = 0.3;   // dirt: część głosu idzie przez przester, żeby był chropowaty
    out.connect(scareBus); out.connect(dirt); dirt.connect(shaper);   // do wyjścia trafia tylko głos przepuszczony przez formanty
    // amplituda: "goo", cisza zwarcia przy "b", potem "by" i wybrzmienie
    g.gain.setValueAtTime(0.0001, t0);
    for (const [dt, v] of [[0.05, 1], [0.4, 0.9], [0.47, 0.08], [0.55, 0.08], [0.62, 1], [0.9, 0.85], [dur, 0.0001]]) g.gain.linearRampToValueAtTime(v, t0 + dt);
    // wysokość: "goo" opada, "by" idzie w górę i opada
    const src = [ctx.createOscillator(), ctx.createOscillator()];
    src.forEach((o, i) => {
        o.type = 'sawtooth'; o.detune.value = i ? 14 : 0;
        o.frequency.setValueAtTime(f0 * 1.12, t0);
        for (const [dt, m] of [[0.35, 0.95], [0.5, 0.9], [0.62, 1.2], [0.85, 1.38], [dur, 0.85]]) o.frequency.linearRampToValueAtTime(f0 * m, t0 + dt);
        o.connect(g); o.start(t0); o.stop(t0 + dur + 0.05);
    });
    const vib = ctx.createOscillator(), vg = ctx.createGain(); vib.frequency.value = 6; vg.gain.value = f0 * 0.025;
    vib.connect(vg); src.forEach(o => vg.connect(o.frequency)); vib.start(t0); vib.stop(t0 + dur + 0.05);
    // formanty F1, F2, F3 w czasie: [czas, F1, F2, F3]
    const path = [[0, 350, 1100, 2300], [0.08, 300, 870, 2240], [0.42, 300, 870, 2240], [0.56, 700, 1220, 2600], [0.72, 640, 1400, 2500], [0.9, 290, 2250, 3010], [dur, 290, 2250, 3010]];
    [[1, 9, 1.0], [2, 11, 0.75], [3, 13, 0.45]].forEach(([k, q, gain]) => {
        const bp = ctx.createBiquadFilter(), fg = ctx.createGain(); bp.type = 'bandpass'; bp.Q.value = q; fg.gain.value = gain * 3;
        bp.frequency.setValueAtTime(path[0][k], t0);
        for (const row of path) bp.frequency.linearRampToValueAtTime(row[k], t0 + row[0]);
        g.connect(bp); bp.connect(fg); fg.connect(out);
    });
    // krótki "p" przy "b": szmer szumu
    const n = ctx.createBufferSource(); n.buffer = noiseBuffer(0.1);
    const nf = ctx.createBiquadFilter(); nf.type = 'bandpass'; nf.frequency.value = 900; nf.Q.value = 1.5;
    const ng = ctx.createGain(); env(ng, t0 + 0.5, 0.6, 0.004, 0.05);
    n.connect(nf); nf.connect(ng); ng.connect(out); n.start(t0 + 0.5);
}
// Pełny jumpscare: cisza, potem uderzenie basu, przesterowany wrzask i zgrzyt dysonansu; gooby = true dokłada głos "gooby"
export function scare(gooby) {
    if (!ctx || GAMES_CALM.on) return;   // w BagaBoo Games nie ma jumpscare'ów (dźwięk też)
    if (hooks.onScare) hooks.onScare();
    const t0 = ctx.currentTime;
    duckDrone(t0); lastLoud = t0 + 1.2; bumpThreat(1, 5);
    buzz('both', 1.0, 450);   // jumpscare: mocna wibracja obu kontrolerów
    const sub = ctx.createOscillator(), sg = ctx.createGain(); sub.type = 'sine';
    sub.frequency.setValueAtTime(110, t0); sub.frequency.exponentialRampToValueAtTime(26, t0 + 0.7);
    env(sg, t0, 1.0, 0.004, 0.8); sub.connect(sg); sg.connect(scareBus); sub.start(t0); sub.stop(t0 + 0.9);
    const n = ctx.createBufferSource(); n.buffer = noiseBuffer(1.6);
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 2.5;
    bp.frequency.setValueAtTime(3400, t0); bp.frequency.exponentialRampToValueAtTime(800, t0 + 1.4);
    const ng = ctx.createGain(); env(ng, t0, 1.0, 0.006, 1.45);
    n.connect(bp); bp.connect(ng); ng.connect(shaper); n.start(t0);
    for (const f of [740, 784, 1046, 1480, 1568]) saw(t0, f, f * 0.42, 1.35, 0.22, shaper);
    if (gooby) { goobyVoice(t0 + 0.08, 150, 2.4); goobyVoice(t0 + 0.08, 75, 1.8); }   // "gooby" (tylko jumpscare od Nothing Hammer): wysoki głos i demoniczna warstwa o oktawę niżej
}
// Krótki, ostry zgrzyt, gdy znika zjawa
export function stinger(pos) {
    if (!ctx) return;
    const t0 = ctx.currentTime;
    duckDrone(t0); lastLoud = t0;
    buzz('both', 0.7, 180);
    const dst = pos ? outAt(pos) : shaper;
    for (const f of [1318, 1396, 1975]) saw(t0, f, f * 0.8, 0.7, pos ? 0.45 : 0.28, dst);
    const n = ctx.createBufferSource(); n.buffer = noiseBuffer(0.4);
    const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 2500;
    const ng = ctx.createGain(); env(ng, t0, 0.8, 0.003, 0.35);
    n.connect(hp); hp.connect(ng); ng.connect(scareBus); n.start(t0);
}
// Szept (z pozycją: dokładnie z tego miejsca, bez pozycji: z boku)
export function whisper(pos) {
    if (!ctx) return;
    const t0 = ctx.currentTime, n = ctx.createBufferSource(); n.buffer = noiseBuffer(1.6);
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 6;
    for (let i = 0; i <= 8; i++) bp.frequency.setValueAtTime(1500 + Math.random() * 2500, t0 + i * 0.18);
    const g = ctx.createGain(); env(g, t0, pos ? 0.9 : 0.35, 0.2, 1.3);
    n.connect(bp); bp.connect(g); g.connect(outAt(pos || (Math.random() < 0.5 ? -0.9 : 0.9)));
    n.start(t0);
}
// Metaliczny huk (wyłamane drzwi klatki, otwarta krata)
export function bang(pos) {
    if (!ctx) return;
    const t0 = ctx.currentTime, dst = outAt(pos);
    const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sine';
    o.frequency.setValueAtTime(120, t0); o.frequency.exponentialRampToValueAtTime(35, t0 + 0.5);
    env(g, t0, 0.9, 0.005, 0.6); o.connect(g); g.connect(dst); o.start(t0); o.stop(t0 + 0.7);
    const n = ctx.createBufferSource(); n.buffer = noiseBuffer(0.5);
    const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 1500;
    const ng = ctx.createGain(); env(ng, t0, 0.5, 0.003, 0.4);
    n.connect(hp); hp.connect(ng); ng.connect(dst); n.start(t0);
}
// Skrzypienie metalu
export function creak(vol, pos) {
    if (!ctx) return;
    const t0 = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain(), bp = ctx.createBiquadFilter();
    o.type = 'sawtooth'; bp.type = 'bandpass'; bp.frequency.value = 900; bp.Q.value = 8;
    o.frequency.setValueAtTime(70 + Math.random() * 30, t0);
    for (let i = 1; i <= 8; i++) o.frequency.linearRampToValueAtTime(60 + Math.random() * 60, t0 + i * 0.18);
    env(g, t0, vol || 0.4, 0.1, 1.4); o.connect(bp); bp.connect(g); g.connect(outAt(pos)); o.start(t0); o.stop(t0 + 1.6);
}
function thump(t0, vol) {
    const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(62, t0); o.frequency.exponentialRampToValueAtTime(40, t0 + 0.2);
    env(g, t0, Math.max(0.001, vol), 0.012, 0.22); o.connect(g); g.connect(master); o.start(t0); o.stop(t0 + 0.3);
}
// Bicie serca: intensywność 0..1 (im bliżej potwór, tym szybciej i głośniej). Wołać co klatkę.
export function heartbeat(intensity) {
    if (!ctx || intensity <= 0.02) return;
    const now = ctx.currentTime;
    if (now < hb.next) return;
    bumpThreat(Math.min(1, intensity), 1.3);
    thump(now, 1.0 * intensity); thump(now + 0.17, 0.65 * intensity);
    buzz('both', 0.6 * intensity, 60); setTimeout(() => buzz('both', 0.4 * intensity, 50), 170);   // bicie serca w dłoniach
    hb.next = now + 60 / (55 + 95 * intensity);
}

// ---------- TRYB CISZA: ryk, kroki, bezpiecznik, mikrofon ----------
let lastLoud = -10, micAnalyser = null, micBuf = null, micStream = null;
// Ryk (vol 0..1, pos = pozycja potwora {x,y,z})
export function roar(vol, pos) {
    if (!ctx) return;
    const t0 = ctx.currentTime, dest = outAt(pos); lastLoud = t0; bumpThreat(0.9, 4);
    buzz('both', 0.35 * (vol || 1), 700);
    const g = ctx.createGain(); env(g, t0, Math.max(0.01, vol), 0.15, 1.6);
    const ws = ctx.createWaveShaper(); ws.curve = distortionCurve(80);
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1400;
    ws.connect(lp); lp.connect(g); g.connect(dest);
    for (const f of [68, 71, 103, 140]) {
        const o = ctx.createOscillator(); o.type = 'sawtooth';
        o.frequency.setValueAtTime(f * 1.3, t0); o.frequency.linearRampToValueAtTime(f, t0 + 0.4); o.frequency.linearRampToValueAtTime(f * 0.8, t0 + 1.7);
        const og = ctx.createGain(); og.gain.value = 0.35; o.connect(og); og.connect(ws); o.start(t0); o.stop(t0 + 1.9);
    }
    const n = ctx.createBufferSource(); n.buffer = noiseBuffer(1.8);
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 500; bp.Q.value = 1.2;
    const ng = ctx.createGain(); ng.gain.value = 0.6; n.connect(bp); bp.connect(ng); ng.connect(ws); n.start(t0);
}
// Ciężki krok potwora (pos = miejsce stopy)
export function step(vol, pos) {
    if (!ctx || vol < 0.02) return;
    const t0 = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(70, t0); o.frequency.exponentialRampToValueAtTime(32, t0 + 0.25);
    env(g, t0, vol, 0.01, 0.3); o.connect(g); g.connect(outAt(pos)); o.start(t0); o.stop(t0 + 0.35);
}
// Uderzenie kuli o podłogę lub ścianę (pos = miejsce uderzenia)
export function ballHit(vol, pos) {
    if (!ctx) return;
    const t0 = ctx.currentTime, dst = outAt(pos), n = ctx.createBufferSource(); n.buffer = noiseBuffer(0.3);
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900;
    const g = ctx.createGain(); env(g, t0, vol, 0.003, 0.25); n.connect(lp); lp.connect(g); g.connect(dst); n.start(t0);
    const o = ctx.createOscillator(), og = ctx.createGain(); o.frequency.setValueAtTime(180, t0); o.frequency.exponentialRampToValueAtTime(60, t0 + 0.2);
    env(og, t0, vol * 0.8, 0.003, 0.22); o.connect(og); og.connect(dst); o.start(t0); o.stop(t0 + 0.3);
}
// Krótki sygnał detektora: wysokość tonu w Hz, głośność, czas w sekundach
export function beep(freq, vol, dur) {
    if (!ctx) return;
    const t0 = ctx.currentTime, d = dur || 0.1, o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sine'; o.frequency.value = freq;
    env(g, t0, vol || 0.2, 0.005, d); o.connect(g); g.connect(master); o.start(t0); o.stop(t0 + d + 0.05);
}
// Bezpiecznik włożony do panelu
export function fuse() {
    if (!ctx) return;
    const t0 = ctx.currentTime;
    for (const [f, d] of [[660, 0], [990, 0.08], [1320, 0.16]]) {
        const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'square'; o.frequency.value = f;
        env(g, t0 + d, 0.12, 0.005, 0.18); o.connect(g); g.connect(master); o.start(t0 + d); o.stop(t0 + d + 0.25);
    }
}
// Mikrofon: poziom głośności 0..1 (bez podłączania do głośników)
export function attachMic(stream) {
    if (!ctx || !stream || micStream === stream) return;
    try {
        const src = ctx.createMediaStreamSource(stream);
        micAnalyser = ctx.createAnalyser(); micAnalyser.fftSize = 1024;
        micBuf = new Float32Array(micAnalyser.fftSize);
        src.connect(micAnalyser); micStream = stream;
    } catch (e) { micAnalyser = null; }
}
// Zaraz po głośnym dźwięku gry mikrofon jest ignorowany, żeby gra nie "usłyszała" samej siebie z głośnika
export function micLevel() {
    if (!micAnalyser || !ctx || ctx.currentTime - lastLoud < 1.4) return 0;
    if (micStream && !micStream.getAudioTracks().some(t => t.enabled)) return 0;
    micAnalyser.getFloatTimeDomainData(micBuf);
    let s = 0; for (let i = 0; i < micBuf.length; i++) s += micBuf[i] * micBuf[i];
    return Math.sqrt(s / micBuf.length);
}
export function markLoud() { if (ctx) lastLoud = ctx.currentTime; }

// Strzał z pistoletu (krótki trzask) i trafienie potwora (pisk z miejsca trafienia)
export function shot() {
    if (!ctx) return;
    const t0 = ctx.currentTime, n = ctx.createBufferSource(); n.buffer = noiseBuffer(0.25);
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1800; bp.Q.value = 0.8;
    const g = ctx.createGain(); env(g, t0, 0.7, 0.002, 0.18); n.connect(bp); bp.connect(g); g.connect(master); n.start(t0);
    const o = ctx.createOscillator(), og = ctx.createGain(); o.frequency.setValueAtTime(220, t0); o.frequency.exponentialRampToValueAtTime(50, t0 + 0.12);
    env(og, t0, 0.6, 0.002, 0.12); o.connect(og); og.connect(master); o.start(t0); o.stop(t0 + 0.2);
}
export function splat(pos) {
    if (!ctx) return;
    const t0 = ctx.currentTime, dst = outAt(pos);
    const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sawtooth';
    o.frequency.setValueAtTime(900, t0); o.frequency.exponentialRampToValueAtTime(140, t0 + 0.35);
    env(g, t0, 0.4, 0.005, 0.35); o.connect(g); g.connect(dst); o.start(t0); o.stop(t0 + 0.4);
}

// ---------- PRALNIA ----------
// Wysoki, przeszywający pisk Szmaciarza, gdy zauważy gracza (głośny, przez kanał straszaków)
export function screech(pos) {
    if (!ctx) return;
    const t0 = ctx.currentTime, dst = pos ? outAt(pos, scareBus) : scareBus;
    for (const [f0, f1, d] of [[1500, 3400, 0.9], [2100, 4200, 0.75], [900, 1900, 1.0]]) {
        const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sawtooth';
        o.frequency.setValueAtTime(f0, t0); o.frequency.exponentialRampToValueAtTime(f1, t0 + d * 0.6); o.frequency.exponentialRampToValueAtTime(f0 * 0.8, t0 + d);
        env(g, t0, 0.35, 0.01, d); o.connect(g); g.connect(dst); o.start(t0); o.stop(t0 + d + 0.05);
    }
    const n = ctx.createBufferSource(); n.buffer = noiseBuffer(0.8);
    const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 3000;
    const ng = ctx.createGain(); env(ng, t0, 0.5, 0.005, 0.7); n.connect(hp); hp.connect(ng); ng.connect(dst); n.start(t0);
    duckDrone(t0); lastLoud = t0; bumpThreat(1, 4);
    buzz('both', 0.8, 400);
}
// Syk gorącej pary z rury
export function hiss(pos, vol) {
    if (!ctx) return;
    const t0 = ctx.currentTime, n = ctx.createBufferSource(); n.buffer = noiseBuffer(2.2);
    const bp = ctx.createBiquadFilter(); bp.type = 'highpass'; bp.frequency.value = 2200;
    const g = ctx.createGain(); g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(0.6 * (vol || 1), t0 + 0.05); g.gain.exponentialRampToValueAtTime(0.001, t0 + 2.0);
    n.connect(bp); bp.connect(g); g.connect(pos ? outAt(pos) : master); n.start(t0);
}
// Pomruk wielkiego kota (Furas): szum przepuszczony przez niski filtr, modulowany ok. 24 razy na sekundę + niski sinus. vol 0..1
export function purr(pos, vol) {
    if (!ctx) return;
    const t0 = ctx.currentTime, dur = 1.3, dst = pos ? outAt(pos) : master, v = vol === undefined ? 1 : vol;
    const n = ctx.createBufferSource(); n.buffer = noiseBuffer(dur + 0.1);
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 280;
    const am = ctx.createGain(); am.gain.value = 0.5;
    const lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = 23 + Math.random() * 3; lg.gain.value = 0.5; lfo.connect(lg); lg.connect(am.gain);
    const e = ctx.createGain(); e.gain.setValueAtTime(0.0001, t0); e.gain.linearRampToValueAtTime(1.6 * v, t0 + 0.25); e.gain.linearRampToValueAtTime(1.2 * v, t0 + dur - 0.3); e.gain.linearRampToValueAtTime(0.0001, t0 + dur);
    n.connect(lp); lp.connect(am); am.connect(e);
    const sub = ctx.createOscillator(), sg = ctx.createGain(); sub.type = 'sine'; sub.frequency.value = 48; sg.gain.value = 0.35; sub.connect(sg); sg.connect(am);
    e.connect(dst); n.start(t0); lfo.start(t0); sub.start(t0); lfo.stop(t0 + dur + 0.05); sub.stop(t0 + dur + 0.05); n.stop(t0 + dur + 0.1);
}
// Warkot przed skokiem (Furas): niska piła z szybką modulacją i szumem, z kierunku potwora
export function growl(pos) {
    if (!ctx) return;
    const t0 = ctx.currentTime, dst = pos ? outAt(pos, scareBus) : scareBus;
    const o = ctx.createOscillator(), o2 = ctx.createOscillator(), lp = ctx.createBiquadFilter(), am = ctx.createGain(), e = ctx.createGain(), lfo = ctx.createOscillator(), lg = ctx.createGain();
    o.type = 'sawtooth'; o2.type = 'square'; o.frequency.setValueAtTime(95, t0); o.frequency.linearRampToValueAtTime(58, t0 + 0.9); o2.frequency.setValueAtTime(47, t0); o2.frequency.linearRampToValueAtTime(30, t0 + 0.9);
    lp.type = 'lowpass'; lp.frequency.setValueAtTime(900, t0); lp.frequency.linearRampToValueAtTime(380, t0 + 0.9);
    am.gain.value = 0.5; lfo.frequency.value = 38; lg.gain.value = 0.5; lfo.connect(lg); lg.connect(am.gain);
    env(e, t0, 0.9, 0.12, 0.8); o.connect(lp); o2.connect(lp); lp.connect(am); am.connect(e); e.connect(dst);
    o.start(t0); o2.start(t0); lfo.start(t0); o.stop(t0 + 1.0); o2.stop(t0 + 1.0); lfo.stop(t0 + 1.0);
    duckDrone(t0); lastLoud = t0; bumpThreat(1, 3);
}
// Pisk mokrych dłoni na mydlinach
export function squeak(pos) {
    if (!ctx) return;
    const t0 = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'square';
    o.frequency.setValueAtTime(900 + Math.random() * 400, t0); o.frequency.linearRampToValueAtTime(1600 + Math.random() * 600, t0 + 0.18);
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2400;
    env(g, t0, 0.35, 0.01, 0.22); o.connect(lp); lp.connect(g); g.connect(pos ? outAt(pos) : master); o.start(t0); o.stop(t0 + 0.3);
}
// Dzwonek: brama otwarta
export function bell() {
    if (!ctx) return;
    const t0 = ctx.currentTime;
    for (let k = 0; k < 3; k++) for (const f of [880, 1320, 2210]) {
        const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sine'; o.frequency.value = f;
        env(g, t0 + k * 0.45, 0.25 / (f / 880), 0.003, 1.4); o.connect(g); g.connect(master); o.start(t0 + k * 0.45); o.stop(t0 + k * 0.45 + 1.5);
    }
}

// Klaśnięcie dłoni (przybita piątka): krótki trzask szumu + niski stuk, z miejsca spotkania dłoni
export function slap(pos) {
    if (!ctx) return;
    const t0 = ctx.currentTime, dst = outAt(pos), n = ctx.createBufferSource(); n.buffer = noiseBuffer(0.2);
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 2400; bp.Q.value = 0.8;
    const g = ctx.createGain(); env(g, t0, 0.9, 0.002, 0.09); n.connect(bp); bp.connect(g); g.connect(dst); n.start(t0);
    const o = ctx.createOscillator(), og = ctx.createGain(); o.frequency.setValueAtTime(220, t0); o.frequency.exponentialRampToValueAtTime(90, t0 + 0.08);
    env(og, t0, 0.5, 0.002, 0.1); o.connect(og); og.connect(dst); o.start(t0); o.stop(t0 + 0.15);
}
