// ==========================================
// Wzory wibracji kontrolerów (czysta logika, bez THREE i przeglądarki): bicie serca, kroki, warczenie, szept, krzyk, stukanie, oddech.
// Wzór to lista impulsów { hand: 'both' | 'left' | 'right', i: siła 0..1, ms: czas, at: opóźnienie w ms }. Siłę skaluje odległość źródła od gracza (attenuate),
// a stronę (lewa, prawa) wyznacza kierunek źródła względem kierunku patrzenia (sideOf). Nowy impuls na kontrolerze zastępuje trwający, więc haptics.js
// ogranicza częstotliwość (canPulse: najmniej HAPTIC.minGap ms między impulsami na dłoń), a shape() przycina zbyt długie lub zbyt gęste wzory.
// ==========================================
export const HAPTIC = { minGap: 40, maxMs: 900, maxDuty: 0.7, minI: 0.04, range: 12 };

// Siła w zależności od odległości źródła: 1 przy 0 m, 0 od range
export function attenuate(dist, range) {
    const r = range > 0 ? range : HAPTIC.range;
    if (!Number.isFinite(dist) || dist >= r) return 0;
    return Math.max(0, 1 - Math.max(0, dist) / r);
}
// Strona źródła względem gracza: forward (fx, fz) = kierunek patrzenia na płaszczyźnie, (dx, dz) = wektor do źródła. 'left' | 'right' | 'both' (prosto przed albo za plecami)
export function sideOf(fx, fz, dx, dz) {
    const fl = Math.hypot(fx, fz), dl = Math.hypot(dx, dz);
    if (fl < 1e-6 || dl < 1e-6) return 'both';
    const cross = (fx * dz - fz * dx) / (fl * dl);   // > 0: źródło po prawej stronie patrzenia (w three.js przód to -Z, prawo to +X)
    if (Math.abs(cross) < 0.25) return 'both';
    return cross > 0 ? 'right' : 'left';
}
const P = (hand, i, ms, at) => ({ hand: hand, i: i, ms: ms, at: at || 0 });
export const PATTERNS = {
    heartbeat: (s) => [P('both', 0.6 * s, 60, 0), P('both', 0.4 * s, 50, 170)],
    step: (s, side) => [P(side || 'both', 0.55 * s, 35, 0)],
    growl: (s) => [0, 1, 2, 3, 4, 5].map(k => P('both', (0.35 + 0.08 * k) * s, 80, k * 95)),
    whisper: (s, side) => [0, 1, 2, 3, 4].map(k => P(side || 'both', 0.16 * s, 12, k * 55)),
    scream: (s) => [0, 1, 2, 3, 4, 5, 6, 7].map(k => P(k % 2 ? 'left' : 'right', (0.3 + 0.09 * k) * s, 60, k * 70)),
    knock: (s, side) => [0, 1, 2].map(k => P(side || 'both', 0.7 * s, 45, k * 140)),
    breath: (s) => [0, 1, 2, 3].map(k => P('both', (0.1 + 0.06 * Math.sin(k / 3 * Math.PI)) * s, 120, k * 150)),
};
// Wzór po przycięciu: słabe impulsy odpadają, czasy i opóźnienia mieszczą się w granicach, a gęstość (suma ms na rozpiętość) nie przekracza maxDuty
export function shape(name, scale, side) {
    const f = PATTERNS[name]; if (!f || !(scale > 0)) return [];
    const out = [];
    for (const p of f(Math.min(1.5, scale), side)) {
        const i = Math.min(1, p.i); if (i < HAPTIC.minI) continue;
        out.push({ hand: p.hand, i: i, ms: Math.max(10, Math.min(HAPTIC.maxMs, p.ms)), at: Math.max(0, Math.min(HAPTIC.maxMs * 2, p.at)) });
    }
    let span = 0, sum = 0; for (const p of out) { span = Math.max(span, p.at + p.ms); sum += p.ms; }
    if (span > 0 && out.length > 1 && sum / span > HAPTIC.maxDuty * out.length) return out.slice(0, Math.max(1, Math.floor(out.length / 2)));
    return out;
}
// Czy na tej dłoni wolno teraz wysłać impuls (nowy zastępuje trwający, więc zbyt gęste impulsy tylko się zagłuszają)
export function canPulse(last, hand, now, gap) {
    const g = gap === undefined ? HAPTIC.minGap : gap, t = last && last[hand];
    return !(Number.isFinite(t) && now - t < g);
}
