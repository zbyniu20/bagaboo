// ==========================================
// Syntezator szeptu (Web Audio): zdarzenia z core/voicelogic.js (samogłoski, szum, zwarcia, nosowe) -> szept przez trzy równoległe filtry formantów.
// Stała liczba węzłów na frazę (ok. 20), niezależnie od jej długości: zmienia się tylko automatyzacja parametrów, więc graf audio się nie rozrasta. Po końcu wszystkie
// źródła są zatrzymywane, a węzły odłączane. buildVoice przyjmuje dowolny kontekst (także OfflineAudioContext, dla testów) i miejsce docelowe (np. panner z outAt).
// To pseudo-mowa: nie ma tu słów, tylko kształt samogłosek i szum.
// ==========================================
export function buildVoice(ctx, events, profile, dest, noise, vol) {
    const t0 = ctx.currentTime + 0.02, pr = profile || { f0: 120, breath: 0.8 };
    const out = ctx.createGain(); out.gain.value = vol === undefined ? 0.9 : vol; out.connect(dest);
    const nsrc = ctx.createBufferSource(); nsrc.buffer = noise; nsrc.loop = true;
    const osc = ctx.createOscillator(); osc.type = 'sawtooth'; osc.frequency.setValueAtTime(pr.f0, t0);
    const noiseG = ctx.createGain(), voicedG = ctx.createGain(); noiseG.gain.value = 0.9 * pr.breath; voicedG.gain.value = 0.3 * (1 - pr.breath) + 0.04;
    const mix = ctx.createGain(), env = ctx.createGain(); env.gain.value = 0; env.connect(out);
    nsrc.connect(noiseG); noiseG.connect(mix); osc.connect(voicedG); voicedG.connect(mix);
    const forms = [9, 11, 14].map((q, i) => { const f = ctx.createBiquadFilter(), g = ctx.createGain(); f.type = 'bandpass'; f.Q.value = q; g.gain.value = [1, 0.7, 0.35][i]; mix.connect(f); f.connect(g); g.connect(env); return f; });
    const fric = ctx.createBiquadFilter(), fricG = ctx.createGain(); fric.type = 'bandpass'; fric.Q.value = 1.4; fricG.gain.value = 0; nsrc.connect(fric); fric.connect(fricG); fricG.connect(out);
    let t = t0;
    for (const e of events) {
        if (e.k === 'v' || e.k === 'n' || e.k === 'g') {
            for (let i = 0; i < 3; i++) forms[i].frequency.setTargetAtTime(e.f[i], t, 0.025);
            env.gain.setTargetAtTime(e.amp * 0.55, t, 0.03); env.gain.setTargetAtTime(0.0001, t + e.dur * 0.78, 0.03);
        } else if (e.k === 'f') {
            fric.frequency.setValueAtTime(e.freq, t); fricG.gain.setTargetAtTime(e.amp * 0.6, t, 0.015); fricG.gain.setTargetAtTime(0, t + e.dur * 0.8, 0.02);
        } else if (e.k === 'p') {
            fric.frequency.setValueAtTime(e.freq, t); fricG.gain.setValueAtTime(e.amp, t); fricG.gain.setTargetAtTime(0, t + 0.012, 0.018);
        }
        t += e.dur;
    }
    osc.frequency.linearRampToValueAtTime(pr.f0 * 0.93, t);   // opadająca intonacja
    const end = t + 0.2, total = end - t0; let stopped = false;
    const stop = () => { if (stopped) return; stopped = true; try { nsrc.stop(); osc.stop(); } catch (e) {} try { out.disconnect(); } catch (e) {} };
    nsrc.start(t0); osc.start(t0); nsrc.stop(end); osc.stop(end);
    const api = { duration: total, stop: stop, onend: null };
    nsrc.onended = () => { stop(); if (api.onend) api.onend(); };
    return api;
}
