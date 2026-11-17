// ==========================================
// BOTY UZUPEŁNIAJĄCE POKÓJ (czyste funkcje, bez importów, testowane w Node: tests/modes/potato.mjs).
// Tryby, w których za mało graczy psuje zabawę (Hot Potato przy 2 osobach), dostają manekiny-boty do ustalonej liczby uczestników:
// FILL[tryb] = { min: ile uczestników ma być razem, max: ile botów najwyżej }. Gracz sam dostaje komplet botów (jak dotąd w trybie solo),
// dwóch graczy dostaje mniej botów itd. Host liczy ruch botów, a goście dostają ich pozycje w stanie rundy i tylko je wyświetlają
// (decodeBots czyści dane z sieci). Obecność botów obniża nagrodę (rewardWithBots), żeby nie dało się jej farmić na łatwych przeciwnikach.
// Kolejne tryby przejmują ten wzorzec: wpis w FILL, ids botów 'b0', 'b1'..., pozycje w komunikacie hosta.
// ==========================================
export const FILL = { potato: { min: 4, max: 3 } };
const num = (v) => typeof v === 'number' && Number.isFinite(v);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export const isBotId = (id) => typeof id === 'string' && /^b\d{1,2}$/.test(id);
export const humansIn = (ids) => ids.filter(id => !isBotId(id));
// Ile botów dołożyć do 'humans' graczy w trybie 'mode' (0 dla trybu bez wpisu, nieprawidłowej liczby albo pełnego pokoju)
export function botsNeeded(mode, humans) {
    const f = Object.prototype.hasOwnProperty.call(FILL, mode) ? FILL[mode] : null; if (!f || !num(humans) || humans < 0) return 0;
    return Math.max(0, Math.min(f.max, f.min - Math.floor(humans)));
}
// Nagroda: pełna bez botów, obniżona, gdy w rundzie były boty
export const rewardWithBots = (botsIn, full, reduced) => botsIn > 0 ? reduced : full;
// Pozycje botów rozstawione równo wzdłuż osi x (środkowy wokół zera)
export const spawnX = (i, n, spacing = 8) => (i - (n - 1) / 2) * spacing;

// Pozycje botów w komunikacie sieciowym: [x, z, kierunek]
export const encodeBots = (list) => list.map(b => [Math.round(b.x * 10) / 10, Math.round(b.z * 10) / 10, Math.round(b.dir * 100) / 100]);
// Gość przyjmuje najwyżej 'max' botów, każdy tylko jako trzy skończone liczby, położenie przycięte do areny (half = połowa boku)
export function decodeBots(raw, max, half) {
    if (!Array.isArray(raw)) return [];
    const out = [];
    for (const e of raw.slice(0, max)) { if (!Array.isArray(e) || e.length < 3 || !num(e[0]) || !num(e[1]) || !num(e[2])) return out; out.push([clamp(e[0], -half, half), clamp(e[1], -half, half), e[2]]); }
    return out;
}

// ---------- proste zachowania botów ----------
// Najbliższy punkt z listy ({x, z}) w poziomie, albo null
export function nearestTo(from, list) {
    let best = null, bd = Infinity;
    for (const o of list) { if (!o || !num(o.x) || !num(o.z)) continue; const d = Math.hypot(o.x - from.x, o.z - from.z); if (d < bd) { bd = d; best = o; } }
    return best;
}
// Ucieczka od zagrożenia: punkt 'step' metrów dalej na linii od zagrożenia, przycięty do granic ({minX, maxX, minZ, maxZ})
export function fleePoint(self, threat, bounds, step = 6) {
    const dx = self.x - threat.x, dz = self.z - threat.z, d = Math.max(0.5, Math.hypot(dx, dz));
    return { x: clamp(self.x + dx / d * step, bounds.minX, bounds.maxX), z: clamp(self.z + dz / d * step, bounds.minZ, bounds.maxZ) };
}
// Leniwe krążenie w miejscu, gdy nikt nie zagraża (każdy bot z własną fazą)
export const wanderPoint = (self, t, phase) => ({ x: self.x + Math.sin(t * 0.5 + phase) * 2, z: self.z + Math.cos(t * 0.5) * 2 });
