// ==========================================
// Pyłki w powietrzu (czysta logika, bez THREE): ile ich jest, jak dryfują i jak zawijają się wokół gracza.
// Rysuje je core/dust.js jako jedną siatkę punktów (jedno wywołanie rysowania). Tylko wizualne i lokalne.
// ==========================================
export const DUST = { R: 6, H: 3.2, size: 0.035, opacity: 0.32, drift: 0.05, rise: 0.012, counts: { low: 0, medium: 140, high: 260 } };

export function dustCount(quality, calm) {
    if (calm) return 0;
    const n = DUST.counts[quality];
    return Number.isFinite(n) ? n : DUST.counts.medium;
}
// Zawija współrzędną do przedziału [c - r, c + r), żeby pyłki zawsze otaczały gracza
export function wrap(v, c, r) {
    const span = 2 * r;
    let d = (v - (c - r)) % span; if (d < 0) d += span;
    return c - r + d;
}
// Jeden krok dryfu: powolne falowanie w bok i leciutki wznos; t to czas w sekundach, i numer pyłku (faza)
export function driftStep(p, i, t, dt) {
    const ph = i * 12.9898;
    return {
        x: p.x + Math.sin(t * 0.31 + ph) * DUST.drift * dt,
        y: p.y + (DUST.rise + Math.sin(t * 0.23 + ph * 1.7) * DUST.drift * 0.5) * dt,
        z: p.z + Math.cos(t * 0.27 + ph * 0.7) * DUST.drift * dt,
    };
}
// Pozycja po dryfie i zawinięciu wokół środka c (x, y, z); y trzymane w pasie od c.y - 1,2 do c.y + H
export function advance(p, i, t, dt, c) {
    const q = driftStep(p, i, t, dt);
    return { x: wrap(q.x, c.x, DUST.R), y: wrap(q.y, c.y + (DUST.H - 1.2) / 2, (DUST.H + 1.2) / 2), z: wrap(q.z, c.z, DUST.R) };
}
