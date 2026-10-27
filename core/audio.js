// ==========================================
// DŹWIĘK (Web Audio, bez plików): mroczne tło, krzyk, huk, skrzypienie, bicie serca
// Dźwięk przestrzenny 3D (HRTF): przekaż pozycję {x, y, z}, a słychać go z właściwego kierunku i odległości.
// initAudio() musi zostać wywołane po kliknięciu przycisku (wymóg przeglądarek)
// ==========================================
import { SETTINGS } from './settings.js';
import { buzz } from './haptics.js';
let ctx = null, master = null, droneGain = null, scareBus = null, shaper = null;
const DRONE = 0.07;
const hb = { next: 0 };

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
}
// Słuchacz = głowa gracza (wołane co klatkę)
const _f = { x: 0, y: 0, z: -1 }, _u = { x: 0, y: 1, z: 0 };
export function updateListener(camera) {
    if (!ctx) return;
    const e = camera.matrixWorld.elements, L = ctx.listener;
    const px = e[12], py = e[13], pz = e[14];
    _f.x = -e[8]; _f.y = -e[9]; _f.z = -e[10]; _u.x = e[4]; _u.y = e[5]; _u.z = e[6];
    if (L.positionX) {
        const t = ctx.currentTime;
        L.positionX.setValueAtTime(px, t); L.positionY.setValueAtTime(py, t); L.positionZ.setValueAtTime(pz, t);
        L.forwardX.setValueAtTime(_f.x, t); L.forwardY.setValueAtTime(_f.y, t); L.forwardZ.setValueAtTime(_f.z, t);
        L.upX.setValueAtTime(_u.x, t); L.upY.setValueAtTime(_u.y, t); L.upZ.setValueAtTime(_u.z, t);
    } else { L.setPosition(px, py, pz); L.setOrientation(_f.x, _f.y, _f.z, _u.x, _u.y, _u.z); }
}
// Wyjście dźwięku: pozycja 3D {x,y,z}, stary pan -1..1 albo prosto do głośników
function outAt(pos, dest) {
    dest = dest || master;
    if (pos && typeof pos === 'object') {
        const p = ctx.createPanner();
        p.panningModel = 'HRTF'; p.distanceModel = 'inverse'; p.refDistance = 2.5; p.maxDistance = 60; p.rolloffFactor = 1.1;
        if (p.positionX) { p.positionX.value = pos.x; p.positionY.value = pos.y; p.positionZ.value = pos.z; } else p.setPosition(pos.x, pos.y, pos.z);
        p.connect(dest); return p;
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
// Pełny jumpscare: cisza, potem uderzenie basu, przesterowany wrzask i zgrzyt dysonansu
export function scare() {
    if (!ctx) return;
    const t0 = ctx.currentTime;
    duckDrone(t0); lastLoud = t0 + 1.2;
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
    thump(now, 1.0 * intensity); thump(now + 0.17, 0.65 * intensity);
    buzz('both', 0.6 * intensity, 60); setTimeout(() => buzz('both', 0.4 * intensity, 50), 170);   // bicie serca w dłoniach
    hb.next = now + 60 / (55 + 95 * intensity);
}

// ---------- TRYB CISZA: ryk, kroki, bezpiecznik, mikrofon ----------
let lastLoud = -10, micAnalyser = null, micBuf = null, micStream = null;
// Ryk (vol 0..1, pos = pozycja potwora {x,y,z})
export function roar(vol, pos) {
    if (!ctx) return;
    const t0 = ctx.currentTime, dest = outAt(pos); lastLoud = t0;
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
