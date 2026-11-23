// ==========================================
// Muzyka napięcia (czysta logika, bez Web Audio): z napięcia 0..1 liczy parametry tła.
// Używa jej audio.js (setTension); napięcie daje reżyser grozy (DREAD.tension), a po jumpscare'ie opada powoli.
// ==========================================
export const TENSION = { rise: 1.6, fall: 0.22, cutoffLow: 220, cutoffHigh: 1400, dissonant: 0.9, pulseLow: 0.07, pulseHigh: 2.4, droneBoost: 1.5, hushMul: 0.35 };

const clamp01 = x => Math.max(0, Math.min(1, x));
// Wygładzanie: szybko rośnie, wolno opada (dt w sekundach)
export function tensionSmooth(cur, target, dt) {
    const t = clamp01(target), k = t > cur ? TENSION.rise : TENSION.fall;
    return clamp01(cur + (t - cur) * Math.min(1, k * Math.max(0, dt)));
}
// Parametry tła dla napięcia t: filtr drone'a (otwiera się), druga warstwa dysonansu (tryton), tempo pulsu, mnożnik głośności
export function tensionParams(t) {
    t = clamp01(t);
    const e = t * t;
    return {
        cutoff: TENSION.cutoffLow + (TENSION.cutoffHigh - TENSION.cutoffLow) * e,
        dissonant: TENSION.dissonant * Math.max(0, (t - 0.25) / 0.75) ** 1.5,
        pulse: TENSION.pulseLow + (TENSION.pulseHigh - TENSION.pulseLow) * e,
        droneMul: 1 + (TENSION.droneBoost - 1) * t,
    };
}
// Gdy potwór jest blisko (hush), muzyka cichnie przed uderzeniem; bez tego rośnie z napięciem
export function hushMul(hush, t) { return hush && t > 0.5 ? TENSION.hushMul : 1; }
