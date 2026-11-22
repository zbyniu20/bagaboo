// ==========================================
// GRAFIKA: czysta logika wypalonego w shaderze ambient occlusion bloków (bez THREE; testy: tests/logic.mjs). Używa jej core/engine.js (addCrispBlock -> addShaderEdges).
// Zwraca, jak mocno przyciemnić albedo bloku przy styku z innymi bryłami: b = podstawa ściany (0,9 m od podłogi), t = góra ściany przy suficie (0,5 m),
// f = brzeg dużej podłogi (0,9 m od krawędzi, tam stoją ściany), c = brzeg dużego sufitu od spodu. Wartość 0,5 = przyciemnienie do 50%. null = brak AO.
// Bez AO: małe bryły, platformy, schodki i bloki z opts.noAO.
// ==========================================
export const AO = { BASE_RANGE: 0.9, TOP_RANGE: 0.5, EDGE_RANGE: 0.9, WALL: 0.5, WALL_TOP: 0.35, FLOOR: 0.42, CEILING: 0.4, MIN_WALL_H: 1.8, TALL_WALL_H: 2.8, BIG: 8 };
const num = (v) => typeof v === 'number' && Number.isFinite(v);
export function aoFor(x, y, z, w, h, d, opts) {
    if (opts && opts.noAO) return null;
    if (![x, y, z, w, h, d].every(num) || w <= 0 || h <= 0 || d <= 0) return null;
    const bottom = y - h / 2, top = y + h / 2, big = w >= AO.BIG && d >= AO.BIG;
    if (h >= AO.MIN_WALL_H && bottom <= 0.35 && !big) return { b: AO.WALL, t: h >= AO.TALL_WALL_H ? AO.WALL_TOP : 0, f: 0, c: 0 };   // ściana stojąca na podłodze
    if (big && top > -0.05 && top < 0.12 && h <= 6) return { b: 0, t: 0, f: AO.FLOOR, c: 0 };                                          // podłoga
    if (big && bottom >= 2.4 && h <= 2) return { b: 0, t: 0, f: 0, c: AO.CEILING };                                                  // sufit od spodu
    return null;
}
