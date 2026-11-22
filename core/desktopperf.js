// ==========================================
// AUTOMATYCZNA ROZDZIELCZOŚĆ POZA VR (komputer, telefon): gdy gra nie wyrabia ~50 klatek/s, pixel ratio spada stopniowo (do 0,55 bazowego),
// a gdy klatki są stabilnie szybkie przez ~20 s, rośnie z powrotem. W VR działa xrperf.js. Logika decyzji jest w czystym core/perflogic.js (testy w tests/logic.mjs).
// ==========================================
import { renderer } from './engine.js';
import { govern, newGovernor, clampFrame, desktopRatio } from './perflogic.js';

const st = newGovernor(), BUDGET_MS = 1000 / 50, BASE = Math.min(window.devicePixelRatio || 1, 2.0);
let applied = 0, warmup = 5000;
export const desktopPerfInfo = () => ({ level: st.level, avgMs: Math.round(st.avg * 10) / 10, ratio: desktopRatio(BASE, st.level) });
// Wołane co klatkę poza VR (rawDtSec: surowy czas klatki)
export function updateDesktopPerf(rawDtSec) {
    if (document.hidden) return;
    const ms = clampFrame(rawDtSec * 1000);
    if (warmup > 0) { warmup -= ms; return; }   // pierwsze sekundy (kompilacja shaderów, ładowanie) nie liczą się
    const lv = govern(st, ms, BUDGET_MS);
    if (lv !== applied) { applied = lv; renderer.setPixelRatio(desktopRatio(BASE, lv)); renderer.setSize(window.innerWidth, window.innerHeight); }
}
// Po wejściu w VR wracamy do pełnej rozdzielczości (VR ma własny regulator)
export function resetDesktopPerf() {
    Object.assign(st, newGovernor()); warmup = 5000;
    if (applied !== 0) { applied = 0; renderer.setPixelRatio(desktopRatio(BASE, 0)); renderer.setSize(window.innerWidth, window.innerHeight); }
}
