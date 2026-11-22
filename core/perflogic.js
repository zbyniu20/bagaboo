// ==========================================
// REGULATOR WYDAJNOŚCI: czysta logika (bez przeglądarki, testy: tests/logic.mjs). Używają jej xrperf.js (VR) i desktopperf.js (komputer, telefon).
// Mierzy średni czas klatki i, gdy ekran nie wyrabia, stopniowo podnosi poziom oszczędzania; gdy klatki są stabilnie szybkie, poziom spada.
// ==========================================
export const GOV = { slowMs: 2000, fastMs: 20000, slowRatio: 1.18, fastRatio: 1.05, cooldownMs: 3000, maxLevel: 3, alpha: 0.05 };
// s: { avg, slow, fast, cool, level }. dtMs: czas klatki, budgetMs: docelowy czas klatki. Zwraca nowy poziom (0..maxLevel).
export function govern(s, dtMs, budgetMs, maxLevel = GOV.maxLevel) {
    s.avg = s.avg ? s.avg + (dtMs - s.avg) * GOV.alpha : dtMs;
    s.cool = Math.max(0, s.cool - dtMs);
    s.slow = s.avg > budgetMs * GOV.slowRatio ? s.slow + dtMs : 0;
    s.fast = s.avg < budgetMs * GOV.fastRatio ? s.fast + dtMs : 0;
    if (s.slow > GOV.slowMs && s.cool <= 0 && s.level < maxLevel) { s.level++; s.slow = 0; s.cool = GOV.cooldownMs; return s.level; }
    if (s.fast > GOV.fastMs && s.level > 0) { s.level--; s.fast = 0; s.cool = GOV.cooldownMs; return s.level; }
    return s.level;
}
export const newGovernor = () => ({ avg: 0, slow: 0, fast: 0, cool: 0, level: 0 });
// Czas klatki do regulatora: skoki po przełączeniu karty, ładowaniu poziomu i zawieszeniu nie mogą obniżyć jakości (ucinamy do 120 ms), a błędne liczby dają 16,7 ms
export const clampFrame = (ms) => Number.isFinite(ms) ? Math.min(Math.max(ms, 0), 120) : 1000 / 60;
// Rozdzielczość poza VR: kolejne poziomy to ułamek bazowego pixel ratio (nigdy poniżej 0,5)
export const DESKTOP_STEPS = [1, 0.85, 0.7, 0.55];
export const desktopRatio = (base, level) => Math.max(0.5, Math.round(base * DESKTOP_STEPS[Math.max(0, Math.min(DESKTOP_STEPS.length - 1, Math.floor(level) || 0))] * 100) / 100);
