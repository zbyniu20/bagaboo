// ==========================================
// PULA ŚWIATEŁ: tyle dynamicznych świateł punktowych naraz, ile uniesie jakość grafiki (low 5, medium 8, high 12)
// Poziomy tworzą po kilkanaście, a nawet kilkadziesiąt świateł punktowych (hale, lawa, szpital), a w renderowaniu forward każde światło
// kosztuje w każdym pikselu każdego materiału. Zamiast wyłączać światła na stałe, poziom zachowuje wszystkie, a do renderu
// trafia tylko K najważniejszych dla gracza (moc / odległość²). Liczba świateł w scenie jest stała, więc nie ma przekompilowania shaderów,
// a przy zmianie wyboru światła płynnie się wygaszają i zapalają (bez migania).
// Poziomy z liczbą świateł <= K nie są ruszane. Źródła nadal animują swoje własne światła (migotanie), pula je tylko kopiuje.
// ==========================================
import { THREE, scene, camera } from './engine.js';
import { GFX } from './config.js';

const K = GFX.lights || 8;
let pool = null, sources = [], pooled = false;
const _p = new THREE.Vector3(), _c = new THREE.Vector3();

function ensurePool() {
    if (pool) return;
    pool = [];
    for (let i = 0; i < K; i++) { const l = new THREE.PointLight(0xffffff, 0, 10, 2); l.visible = false; l.userData.pooled = true; scene.add(l); pool.push({ light: l, src: null, cur: 0 }); }
}
// Wołać po zbudowaniu poziomu (po onLevelBuilt, bo halo zbierają światła z widocznych źródeł)
export function registerLevelLights(root) {
    ensurePool();
    sources = [];
    root.traverse(o => { if (o.isPointLight && !o.userData.pooled && o.visible) sources.push({ l: o, score: 0, slot: -1 }); });
    pooled = sources.length > K;
    for (const slot of pool) { slot.src = null; slot.cur = 0; slot.light.intensity = 0; slot.light.visible = pooled; }
    if (pooled) for (const s of sources) { s.l.visible = false; s.l.userData.pooledSrc = true; }   // oryginały nie liczą się w renderze, kopiuje je pula
}
export const lightPoolInfo = () => ({ sources: sources.length, pooled: pooled, K: K });

export function updateLightPool(dt, focus) {
    if (!pooled || !pool) return;
    if (focus) _c.copy(focus); else camera.getWorldPosition(_c);   // focus: np. miejsce startu przy robieniu zdjęcia odbić
    for (const s of sources) {
        s.l.getWorldPosition(_p);
        const d2 = _p.distanceToSquared(_c), lim = s.l.distance;
        s.score = (lim > 0 && d2 > lim * lim * 1.3) ? 0 : (s.l.intensity > 0 ? s.l.intensity / (d2 + 4) : 0);
        s.x = _p.x; s.y = _p.y; s.z = _p.z;
    }
    const top = sources.slice().sort((a, b) => b.score - a.score).slice(0, K).filter(s => s.score > 0);
    const topSet = new Set(top);
    // Przypisz brakujące źródła do wolnych (wygaszonych) slotów
    for (const s of top) {
        if (pool.some(sl => sl.src === s)) continue;
        const free = pool.find(sl => !sl.src || (!topSet.has(sl.src) && sl.cur < 0.05));
        if (free) { free.src = s; free.cur = 0; }
    }
    const k = Math.min(1, dt * 9);
    for (const sl of pool) {
        const s = sl.src; if (!s) { sl.light.intensity = 0; continue; }
        const want = topSet.has(s) ? s.l.intensity : 0;
        sl.cur += (want - sl.cur) * k;
        if (!topSet.has(s) && sl.cur < 0.05) { sl.src = null; sl.light.intensity = 0; continue; }
        const l = sl.light; l.position.set(s.x, s.y, s.z); l.color.copy(s.l.color); l.distance = s.l.distance; l.decay = s.l.decay; l.intensity = sl.cur;
    }
}
