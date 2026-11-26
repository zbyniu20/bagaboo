// ==========================================
// SCARY GTA: POSZUKIWANIE (czysta logika, bez THREE; używa go levels/scarygta.js, testy: tests/logic.mjs).
// "Heat" 0-100 na gracza (osobny dla każdego, bo w trybie FFA host liczy gwiazdki per gracz) zamienia się na 0-5 gwiazdek. Rośnie od hałasu, szkła, alarmu, strzałów i widzenia
// przez helikopter, maleje, gdy jesteś niewidoczny i schowany. Gwiazdki określają, ile policji jest w mieście, jak szybka i jak czujna oraz czy działa helikopter.
// ==========================================
export const HEAT = { MAX: 100, STAR_AT: [12, 32, 55, 78, 95], SEEN_GRACE: 15, DECAY_HIDDEN: 6, DECAY_FREE: 1.2, FREE_AFTER: 4,
    EVENTS: { run: 4, glass: 15, alarm: 30, shout: 8, heli: 12, shot: 12, kill: 35, carry: 0.6 } };   // run, heli, carry: na sekundę; reszta jednorazowo
export const newHeat = () => ({ v: 0, seenT: 99 });
export const clampHeat = (v) => Math.max(0, Math.min(HEAT.MAX, v));
export const starsOf = (v) => { let n = 0; for (const t of HEAT.STAR_AT) if (v >= t) n++; return n; };
export const DIFF_HEAT = { easy: 0.7, normal: 1, nightmare: 1.5 };
export function addHeat(h, amount, diff) { return { v: clampHeat(h.v + amount * (DIFF_HEAT[diff] || 1)), seenT: h.seenT }; }
export function eventHeat(name, dt) { const e = HEAT.EVENTS[name]; if (e === undefined) return 0; return (name === 'run' || name === 'heli' || name === 'carry') ? e * Math.max(0, dt) : e; }
// Krok czasu: seen = ktoś cię teraz widzi (policjant, helikopter), hidden = stoisz w kryjówce
export function heatStep(h, dt, o) {
    const d = Math.min(Math.max(dt, 0), 0.5); let v = h.v, seenT = o.seen ? 0 : h.seenT + d;
    if (!o.seen) { if (o.hidden && seenT > HEAT.SEEN_GRACE) v -= HEAT.DECAY_HIDDEN * d; else if (seenT > HEAT.FREE_AFTER) v -= HEAT.DECAY_FREE * d; }
    return { v: clampHeat(v), seenT: seenT };
}
// Reguły policji dla liczby gwiazdek
export function starRules(stars) {
    const s = Math.max(0, Math.min(5, stars | 0));
    return { maxCops: [3, 4, 6, 8, 9, 10][s], speedMul: 1 + 0.06 * s, sight: 16 + 2.5 * s, alert: s >= 2, radio: s >= 3 ? 6 : 0, heli: s >= 3 ? (s >= 4 ? 'chase' : 'investigate') : 'patrol', swat: s >= 5 ? 2 : 0, blockades: s >= 4, noticeT: [4, 3, 2.2, 1.6, 1.2, 0.8][s] };
}
// Złapanie (BUSTED): heat spada tak, żeby gwiazdek było o jedną mniej (minimum 0)
export function afterBust(h) { const n = starsOf(h.v); if (n <= 0) return { v: 0, seenT: 99 }; const to = n - 1; return { v: to === 0 ? 0 : Math.max(0, HEAT.STAR_AT[to - 1] + 1), seenT: 99 }; }
export const heatBar = (h) => h.v / HEAT.MAX;
