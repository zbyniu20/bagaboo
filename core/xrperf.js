// ==========================================
// REGULATOR WYDAJNOŚCI W VR (Quest): mierzy czas klatek i, gdy gogle nie wyrabiają, stopniowo tnie koszt obrazu.
//   poziom 1: mocniejsze foveation (rozmyte brzegi obrazu, tańsze piksele na obwodzie)
//   poziom 2: foveation maksymalne + mniejsze mapy cieni (słońce i latarka)
//   poziom 3: jak 2, a dodatkowo zapamiętujemy niższą rozdzielczość na KOLEJNĄ sesję VR (rozdzielczości nie da się zmienić w trakcie sesji)
// Gdy klatki są stabilnie szybkie przez ~20 s, poziom spada o jeden. Docelowa częstotliwość: 72 Hz (90 Hz na jakości high), jeśli gogle ją wspierają.
// Nie ma tu pomiaru GPU, tylko czasu klatek: działa tak samo na każdym goglach, ale progi dobrano bez dostępu do prawdziwego Quest.
// ==========================================
import { renderer, lighting } from './engine.js';
import { GFX } from './config.js';
import { SETTINGS, saveSettings } from './settings.js';

import { GOV, govern } from './perflogic.js';
export { GOV, govern };   // regulator jest w czystym core/perflogic.js (testy: tests/logic.mjs); eksport zostaje tu dla testów w przeglądarce (tests/smoke.mjs)

const st = { avg: 0, slow: 0, fast: 0, cool: 0, level: 0 };
let active = false, budget = 1000 / 72, applied = -1, lastScaleSave = 0, warmup = 0;
export const xrPerfInfo = () => ({ active: active, level: st.level, avgMs: Math.round(st.avg * 10) / 10, budgetMs: Math.round(budget * 10) / 10 });

function resizeShadow(light, size) { light.shadow.mapSize.set(size, size); if (light.shadow.map) { light.shadow.map.dispose(); light.shadow.map = null; } }
function apply(level) {
    if (level === applied) return; applied = level;
    const base = GFX.foveation;
    renderer.xr.setFoveation(level === 0 ? base : level === 1 ? Math.max(base, 0.75) : 1.0);
    const k = level >= 2 ? 0.5 : 1;
    resizeShadow(lighting.sun, Math.max(512, Math.round(GFX.shadowMap * k)));
    resizeShadow(lighting.headLamp, Math.max(512, Math.round(1024 * k)));
}
export function startXrPerf(session) {
    active = true; st.avg = st.slow = st.fast = st.cool = 0; st.level = 0; applied = -1; warmup = 4000;
    let target = SETTINGS.quality === 'high' ? 90 : 72;
    try {
        const rates = session && session.supportedFrameRates ? Array.from(session.supportedFrameRates) : [];
        if (rates.length) { if (!rates.includes(target)) target = rates.includes(72) ? 72 : Math.max.apply(null, rates); if (session.updateTargetFrameRate) session.updateTargetFrameRate(target).catch(() => {}); }
    } catch (e) { /* nie wszystkie przeglądarki wspierają */ }
    budget = 1000 / target;
    apply(0);
}
export function stopXrPerf() { active = false; apply(0); applied = -1; }
// Wołane co klatkę w VR (dtSec: surowy czas klatki)
export function updateXrPerf(dtSec) {
    if (!active) return;
    const ms = dtSec * 1000;
    if (warmup > 0) { warmup -= ms; return; }   // pierwsze sekundy sesji (kompilacja shaderów, ładowanie) nie liczą się
    const before = st.level, lv = govern(st, ms, budget);
    if (lv !== before) {
        apply(lv);
        // Poziom 3: zapamiętaj niższą rozdzielczość na kolejną sesję (najwyżej raz na 30 s, nie niżej niż 0.7)
        if (lv >= GOV.maxLevel && performance.now() - lastScaleSave > 30000) { lastScaleSave = performance.now(); SETTINGS.perfScale = Math.max(0.7, Math.round(((SETTINGS.perfScale || 1) - 0.1) * 100) / 100); saveSettings(); }
    }
}
