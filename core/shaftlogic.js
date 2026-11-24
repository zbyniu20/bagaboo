// ==========================================
// Snopy światła pod lampami (czysta logika, bez THREE): które światła dostają stożek, jak duży i jak jasny.
// Rysuje je core/shafts.js jako jedną scaloną siatkę (jedno wywołanie rysowania). Tylko wizualne i lokalne.
// Tylko pod stałymi lampami wiszącymi nad podłogą, nigdy przy kamerze gracza (w VR stożek z własnej głowy zasłaniałby widok).
// ==========================================
export const SHAFT = { max: 6, minHeight: 2.0, maxLength: 6.5, minGap: 3, relMin: 0.2, opacityMin: 0.05, opacityMax: 0.16, topRadius: 0.12, spread: 0.2, floorEnd: 0.15 };

export function shaftsEnabled(quality, calm) { return !calm && (quality === 'medium' || quality === 'high'); }

// light: { x, y, z, intensity, color }. Zwraca do SHAFT.max stożków od najsilniejszego, bez zbyt bliskich sąsiadów i słabych świateł
export function pickShafts(lights, floorY, max) {
    const cap = Math.min(SHAFT.max, Number.isFinite(max) ? max : SHAFT.max);
    const ok = (lights || []).filter(l => l && [l.x, l.y, l.z, l.intensity].every(Number.isFinite) && l.intensity > 0 && l.y - floorY >= SHAFT.minHeight);
    if (!ok.length || cap <= 0) return [];
    ok.sort((a, b) => b.intensity - a.intensity);
    const top = ok[0].intensity, out = [];
    for (const l of ok) {
        if (out.length >= cap) break;
        if (l.intensity < top * SHAFT.relMin) break;
        if (out.some(o => Math.hypot(o.x - l.x, o.z - l.z) < SHAFT.minGap)) continue;
        const len = Math.min(SHAFT.maxLength, l.y - floorY - SHAFT.floorEnd);
        out.push({ x: l.x, y: l.y, z: l.z, length: len, topR: SHAFT.topRadius, botR: SHAFT.topRadius + len * SHAFT.spread, opacity: Math.max(SHAFT.opacityMin, Math.min(SHAFT.opacityMax, SHAFT.opacityMax * l.intensity / top)), color: l.color === undefined ? 0xffffff : l.color });
    }
    return out;
}
