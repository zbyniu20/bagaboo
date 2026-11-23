// ==========================================
// AKUSTYKA: CZYSTA LOGIKA (pogłos z geometrii poziomu, okluzja dźwięku za ścianami).
// Bez THREE: testy w tests/logic.mjs. Rysunkiem sceny i węzłami audio zajmują się core/acoustics.js i core/audio.js.
// Bryły to osiowe pudełka { min: {x,y,z}, max: {x,y,z} } (box3 z L.obstacles).
// ==========================================
export const AC = { MAXD: 16, MIN_H: 1.0, OPEN_FRAC: 0.4, SEC_MIN: 0.4, SEC_MAX: 3.2, WET_MIN: 0.05, WET_MAX: 0.3 };
// Kierunki próbkujące pomieszczenie: 8 poziomych co 45 stopni i jeden w górę
export const DIRS = (() => { const d = []; for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; d.push({ x: Math.cos(a), y: 0, z: Math.sin(a) }); } d.push({ x: 0, y: 1, z: 0 }); return d; })();
// Odległość wzdłuż promienia (o, d) do pudełka (metoda płyt), Infinity gdy brak trafienia w zasięgu [0, maxD]
export function rayBox(o, d, b, maxD) {
    let t0 = 0, t1 = maxD;
    for (const k of ['x', 'y', 'z']) {
        const dk = d[k], ok = o[k], lo = b.min[k], hi = b.max[k];
        if (Math.abs(dk) < 1e-9) { if (ok < lo || ok > hi) return Infinity; continue; }
        let a = (lo - ok) / dk, c = (hi - ok) / dk; if (a > c) { const t = a; a = c; c = t; }
        t0 = Math.max(t0, a); t1 = Math.min(t1, c); if (t0 > t1) return Infinity;
    }
    return t0;
}
// Odległości do najbliższych ścian we wszystkich kierunkach (Infinity = otwarta przestrzeń)
export function freeDistances(o, boxes, maxD) {
    maxD = maxD || AC.MAXD;
    return DIRS.map((d) => { let best = Infinity; for (const b of boxes) { if (b.max.y - b.min.y < 0.3 && d.y === 0) continue; const t = rayBox(o, d, b, maxD); if (t < best) best = t; } return best; });
}
// Pomieszczenie: { sec, wet } z odległości do ścian. Mało trafień = otwarta przestrzeń (krótki pogłos), inaczej im większa sala, tym dłuższy i głośniejszy pogłos
export function roomFromRays(dists, maxD) {
    maxD = maxD || AC.MAXD;
    const hits = dists.filter(t => isFinite(t) && t < maxD);
    if (!dists.length || hits.length / dists.length < AC.OPEN_FRAC) return { sec: AC.SEC_MIN + 0.1, wet: AC.WET_MIN + 0.02, open: true };
    const mean = hits.reduce((a, b) => a + b, 0) / hits.length;
    return { sec: Math.max(AC.SEC_MIN, Math.min(AC.SEC_MAX, 0.3 + mean * 0.22)), wet: Math.max(AC.WET_MIN, Math.min(AC.WET_MAX, 0.04 + mean * 0.014)), open: false };
}
// Zmierzone pogłosy mieszamy z ustawieniem poziomu z rejestru (projekt poziomu nadal się liczy): w połowie
export function blendRoom(base, measured, k) {
    k = k === undefined ? 0.5 : k;
    return { sec: base.sec * (1 - k) + measured.sec * k, wet: base.wet * (1 - k) + measured.wet * k };
}
// Gładkie dochodzenie do celu (pogłos nie skacze przy wejściu do drzwi)
export function smoothRoom(cur, target, dt) {
    const a = Math.min(1, Math.max(0, dt) * 1.5);
    return { sec: cur.sec + (target.sec - cur.sec) * a, wet: cur.wet + (target.wet - cur.wet) * a };
}
// Ile brył przecina odcinek słuchacz-źródło (pomijamy podłogi i niskie przeszkody, pudełka z którymi odcinek styka się tylko na końcach)
export function blockCount(a, b, boxes) {
    const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z, len = Math.hypot(dx, dy, dz); if (len < 0.5) return 0;
    const d = { x: dx / len, y: dy / len, z: dz / len }; let n = 0;
    for (const bx of boxes) {
        if (bx.max.y - bx.min.y < AC.MIN_H) continue;
        const t = rayBox(a, d, bx, len - 0.15); if (t > 0.15 && t < len - 0.15) n++;
    }
    return n;
}
// Okluzja 0..1 z liczby ścian (każda kolejna tłumi mniej)
export function occlusionFor(count) { return count <= 0 ? 0 : Math.min(0.9, 1 - Math.pow(0.55, count)); }
export function occludedFilter(freq, occ) { return Math.max(350, freq * (1 - 0.85 * occ)); }
export function occludedGain(occ) { return 1 - 0.55 * occ; }
