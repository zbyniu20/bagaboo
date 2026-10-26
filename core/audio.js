// ==========================================
// DŹWIĘK (Web Audio, bez plików): mroczne tło, krzyk, huk, skrzypienie, bicie serca
// initAudio() musi zostać wywołane po kliknięciu przycisku (wymóg przeglądarek)
// ==========================================
let ctx = null, master = null, droneGain = null;
const hb = { next: 0 };

export function initAudio() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = 0.9; master.connect(ctx.destination);
    // Niskie, pulsujące tło
    droneGain = ctx.createGain(); droneGain.gain.value = 0.07;
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
// Wrzask przy jumpscare
export function scream() {
    if (!ctx) return;
    const t0 = ctx.currentTime;
    const n = ctx.createBufferSource(); n.buffer = noiseBuffer(1.3);
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 3;
    bp.frequency.setValueAtTime(2400, t0); bp.frequency.exponentialRampToValueAtTime(700, t0 + 1.2);
    const g = ctx.createGain(); env(g, t0, 1.0, 0.02, 1.2);
    n.connect(bp); bp.connect(g); g.connect(master); n.start(t0);
    for (const f of [880, 933, 1240]) {
        const o = ctx.createOscillator(), og = ctx.createGain(); o.type = 'sawtooth';
        o.frequency.setValueAtTime(f, t0); o.frequency.exponentialRampToValueAtTime(f * 0.45, t0 + 1.1);
        env(og, t0, 0.18, 0.02, 1.1); o.connect(og); og.connect(master); o.start(t0); o.stop(t0 + 1.3);
    }
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
    thump(now, 0.7 * intensity); thump(now + 0.17, 0.45 * intensity);
    hb.next = now + 60 / (55 + 95 * intensity);
}
