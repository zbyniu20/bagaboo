// ==========================================
// AWATAR: CZYSTA LOGIKA EFEKTÓW (futro warstwowe, rany, mokre futro, ślina, powieki).
// Bez THREE: testy w tests/logic.mjs. Rysowaniem zajmuje się core/avatar.js, hakami core/network.js.
// ==========================================
export const FUR = { MAX: 4, NEAR: 5, NEAR_XR: 3.5, XR_MAX: 2, LEN: 0.011 };   // warstwy, zasięg widoczności (m), długość włosa (m)
export const WOUND_MAX = 6;
// Ile warstw futra budować wg jakości (low: wcale)
export function shellCount(quality) { return quality === 'low' ? 0 : quality === 'high' ? FUR.MAX : 3; }
// Ile z zbudowanych warstw rysować: dalej niż zasięg żadna, w VR mniej i bliżej (budżet Quest)
export function shellsVisible(built, dist, xr) {
    const range = xr ? FUR.NEAR_XR : FUR.NEAR, cap = xr ? FUR.XR_MAX : FUR.MAX;
    if (!(built > 0) || !(dist < range)) return 0;
    return Math.min(built, cap);
}
// Warstwa i z n: odsunięcie od skóry (m) i próg alfa (im wyżej, tym mniej włosów)
export function shellOffset(i, n) { return FUR.LEN * (i + 1) / n; }
export function shellCut(i, n) { return 0.18 + 0.62 * (i + 1) / (n + 1); }
export function shellShade(i, n) { return 0.55 + 0.45 * (i + 1) / n; }   // przy skórze ciemniej
// Pogoda poziomu: mokre futro i brud (0..1)
const WET = { laundry: 1, well: 0.8, silence: 0.3, catacombs: 0.4, cemetery: 0.35 };
const DIRT = { catacombs: 0.7, cemetery: 0.5, well: 0.6, maze: 0.3, hospital: 0.2, nursery: 0.2, room000: 0.4, laundry: 0.2 };
export function grimeFor(levelId) { return { wet: WET[levelId] || 0, dirt: DIRT[levelId] || 0 }; }
export function mixFur(base, g, i) {   // składowa koloru 0..1 po zabrudzeniu i zmoczeniu
    return Math.max(0, base * (1 - 0.4 * g.dirt - 0.25 * g.wet));
}
export function furRoughness(base, g) { return Math.max(0.35, base - 0.5 * g.wet); }
// Rany na torsie: pozycja z ziarna (lokalne współrzędne tułowia), maks WOUND_MAX
export function woundSpot(seed) {
    const r = (n) => { const x = Math.sin(seed * 12.9898 + n * 78.233) * 43758.5453; return x - Math.floor(x); };
    return { x: (r(1) - 0.5) * 0.28, y: -0.15 + r(2) * 0.3, rot: (r(3) - 0.5) * 2.4, w: 0.03 + r(4) * 0.04 };
}
export function addWound(list, seed) { const out = list.slice(); out.push(woundSpot(seed)); while (out.length > WOUND_MAX) out.shift(); return out; }
// Ślina z pyska przy ryku: 0 poniżej 0,55 głośności, 1 od 0,9
export function droolLevel(L) { return Math.max(0, Math.min(1, (L - 0.55) / 0.35)); }
// Powieka 0,08..1 (zamknięte..otwarte) z licznika mrugnięcia; drugie oko spóźnione o `lag` s
export function lidFactor(blink, lag) {
    const b = blink + (lag || 0); if (!(b > 0)) return 1;
    return Math.max(0.08, Math.min(1, Math.abs(b / 0.13 - 0.5) * 2));
}
// Drżenie mięśni przy ryku (rad), faza w sekundach
export function tremor(L, t) { return L > 0.6 ? Math.sin(t * 58) * 0.012 * Math.min(1, (L - 0.6) / 0.3) : 0; }
