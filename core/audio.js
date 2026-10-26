// ==========================================
// DŹWIĘK (Web Audio, bez plików): mroczne tło, krzyk, huk, skrzypienie, bicie serca
// initAudio() musi zostać wywołane po kliknięciu przycisku (wymóg przeglądarek)
// ==========================================
let ctx = null, master = null, droneGain = null, scareBus = null, shaper = null;
const DRONE = 0.07;
const hb = { next: 0 };

export function initAudio() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = 0.9; master.connect(ctx.destination);
    // Osobny, głośniejszy tor dla jumpscare'ów: przester + kompresor (głośno, ale bez trzasków)
    const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -12; comp.knee.value = 6; comp.ratio.value = 6; comp.attack.value = 0.002; comp.release.value = 0.25;
    comp.connect(ctx.destination);
    scareBus = ctx.createGain(); scareBus.gain.value = 2.2; scareBus.connect(comp);
    shaper = ctx.createWaveShaper(); shaper.curve = distortionCurve(60); shaper.oversample = '4x'; shaper.connect(scareBus);
    // Niskie, pulsujące tło
    droneGain = ctx.createGain(); droneGain.gain.value = DRONE;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 220;
    droneGain.connect(lp); lp.connect(master);
    for (const f of [41, 41.6, 61.7]) { const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.connect(droneGain); o.start(); }
    const lfo = ctx.createOscillator(), lfoG = ctx.createGain(); lfo.frequency.value = 0.07; lfoG.gain.value = 120;
    lfo.connect(lfoG); lfoG.connect(lp.frequency); lfo.start();
    // Co jakiś czas odległe skrzypienie
    setInterval(() => { if (Math.random() < 0.35) creak(0.25); }, 9000);
}
export function setDrone(level) { if (droneGain) droneGain.gain.setTargetAtTime(level, ctx.currentTime, 0.8); }

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
    droneGain.gain.setTargetAtTime(DRONE, t0 + 2.2, 0.8);
}
function saw(t0, f, f2, dur, vol, out) {
    const o = ctx.createOscillator(), g = ctx.createGain(), vib = ctx.createOscillator(), vg = ctx.createGain();
    o.type = 'sawtooth'; o.frequency.setValueAtTime(f, t0); o.frequency.exponentialRampToValueAtTime(f2, t0 + dur);
    vib.frequency.value = 9 + Math.random() * 6; vg.gain.value = f * 0.04; vib.connect(vg); vg.connect(o.frequency);
    env(g, t0, vol, 0.008, dur); o.connect(g); g.connect(out);
    o.start(t0); vib.start(t0); o.stop(t0 + dur + 0.1); vib.stop(t0 + dur + 0.1);
}
// Wrzask manekina (scenka z klatką)
export function scream() {
    if (!ctx) return;
    const t0 = ctx.currentTime;
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
    duckDrone(t0);
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
export function stinger() {
    if (!ctx) return;
    const t0 = ctx.currentTime;
    duckDrone(t0);
    for (const f of [1318, 1396, 1975]) saw(t0, f, f * 0.8, 0.7, 0.28, shaper);
    const n = ctx.createBufferSource(); n.buffer = noiseBuffer(0.4);
    const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 2500;
    const ng = ctx.createGain(); env(ng, t0, 0.8, 0.003, 0.35);
    n.connect(hp); hp.connect(ng); ng.connect(scareBus); n.start(t0);
}
// Szept za plecami (cichy, niepokojący)
export function whisper() {
    if (!ctx) return;
    const t0 = ctx.currentTime, n = ctx.createBufferSource(); n.buffer = noiseBuffer(1.6);
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 6;
    for (let i = 0; i <= 8; i++) bp.frequency.setValueAtTime(1500 + Math.random() * 2500, t0 + i * 0.18);
    const g = ctx.createGain(); env(g, t0, 0.35, 0.2, 1.3);
    const pan = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    n.connect(bp); bp.connect(g);
    if (pan) { pan.pan.value = Math.random() < 0.5 ? -0.9 : 0.9; g.connect(pan); pan.connect(master); } else g.connect(master);
    n.start(t0);
}
// Metaliczny huk (wyłamane drzwi klatki)
export function bang() {
    if (!ctx) return;
    const t0 = ctx.currentTime;
    const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sine';
    o.frequency.setValueAtTime(120, t0); o.frequency.exponentialRampToValueAtTime(35, t0 + 0.5);
    env(g, t0, 0.9, 0.005, 0.6); o.connect(g); g.connect(master); o.start(t0); o.stop(t0 + 0.7);
    const n = ctx.createBufferSource(); n.buffer = noiseBuffer(0.5);
    const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 1500;
    const ng = ctx.createGain(); env(ng, t0, 0.5, 0.003, 0.4);
    n.connect(hp); hp.connect(ng); ng.connect(master); n.start(t0);
}
// Skrzypienie metalu
export function creak(vol) {
    if (!ctx) return;
    const t0 = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain(), bp = ctx.createBiquadFilter();
    o.type = 'sawtooth'; bp.type = 'bandpass'; bp.frequency.value = 900; bp.Q.value = 8;
    o.frequency.setValueAtTime(70 + Math.random() * 30, t0);
    for (let i = 1; i <= 8; i++) o.frequency.linearRampToValueAtTime(60 + Math.random() * 60, t0 + i * 0.18);
    env(g, t0, vol || 0.4, 0.1, 1.4); o.connect(bp); bp.connect(g); g.connect(master); o.start(t0); o.stop(t0 + 1.6);
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
    hb.next = now + 60 / (55 + 95 * intensity);
}
