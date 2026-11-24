// ==========================================
// WIBRACJE KONTROLERÓW: dotyk ścian, jumpscare'y, bicie serca, chwyt liny, a od dodatku wzory zdarzeń (kroki, warczenie, szept, stukanie, oddech)
// hand: 0 lub 1 (indeks kontrolera w kolejności inputSources, tak jak dłonie gracza), 'both' = oba, 'left' / 'right' = wg handedness (dla sygnałów kierunkowych)
// Wzory i ich skalowanie: czysty core/hapticlogic.js. Nowy impuls zastępuje trwający na tym kontrolerze, więc wzory są ograniczane (canPulse).
// ==========================================
import { renderer } from './engine.js';
import { SETTINGS } from './settings.js';
import { shape, canPulse } from './hapticlogic.js';

const lastPulse = {};
export const hapticStats = { pulses: 0, blocked: 0 };
function actuators(hand) {
    const session = renderer.xr.getSession && renderer.xr.getSession(); if (!session) return [];
    const out = []; let i = 0;
    for (const src of session.inputSources) {
        const ok = hand === 'both' || hand === i || (hand === 'left' && src.handedness === 'left') || (hand === 'right' && src.handedness === 'right');
        if (ok) { const gp = src.gamepad, act = gp && ((gp.hapticActuators && gp.hapticActuators[0]) || gp.vibrationActuator); if (act) out.push({ act: act, key: src.handedness || String(i) }); }
        i++;
    }
    return out;
}
export function buzz(hand, intensity, ms) {
    if (SETTINGS.haptics === false) return;
    const v = Math.max(0, Math.min(1, intensity));
    if (v <= 0.01) return;
    for (const { act } of actuators(hand)) {
        try {
            if (act.pulse) act.pulse(v, ms);
            else if (act.playEffect) act.playEffect('dual-rumble', { duration: ms, strongMagnitude: v, weakMagnitude: v });
        } catch (e) {}
    }
}
// Wzór zdarzenia: name z PATTERNS, scale 0..1,5 (zwykle z odległości), side 'left' | 'right' (opcjonalnie)
export function hapticPlay(name, scale, side) {
    if (SETTINGS.haptics === false) return 0;
    const pats = shape(name, scale, side); let n = 0;
    for (const p of pats) {
        const fire = () => {
            const now = (typeof performance !== 'undefined' ? performance.now() : Date.now());
            for (const { act, key } of actuators(p.hand)) {
                if (!canPulse(lastPulse, key, now)) { hapticStats.blocked++; continue; }
                lastPulse[key] = now; hapticStats.pulses++;
                try { if (act.pulse) act.pulse(p.i, p.ms); else if (act.playEffect) act.playEffect('dual-rumble', { duration: p.ms, strongMagnitude: p.i, weakMagnitude: p.i }); } catch (e) {}
            }
        };
        if (p.at > 0) setTimeout(fire, p.at); else fire();
        n++;
    }
    return n;
}
