// ==========================================
// WYPALANE OŚWIETLENIE: CZYSTA LOGIKA (światło pośrednie z punktowych świateł poziomu, liczone raz po zbudowaniu poziomu).
// Bez THREE: testy w tests/logic.mjs. Rysunkiem i geometrią zajmuje się core/lightbake.js, shaderem addShaderEdges w core/engine.js.
// Każdy wierzchołek dostaje kolor światła (RGB) z KAŻDEGO światła punktowego poziomu (także tych, które pula świateł wyłącza z renderu), z okluzją
// na bryłach poziomu i miękkim "owinięciem" (wrap), czyli tanim odbiciem. Shader dodaje ten kolor razy albedo do emisji.
// Światła: { x, y, z, r, g, b (kolor razy moc), dist (0 = bez limitu), decay }. Bryły: { min: {x,y,z}, max: {x,y,z} }.
// ==========================================
import { rayBox } from './acousticlogic.js';
export const BAKE = { cell: 1.0, maxSeg: 40, maxVerts: 60000, k: 0.38, wrap: 0.35, leak: 0.18, minH: 0.3, push: 0.06, cap: 1.0 };
// Ile segmentów na długości len (komórka ok. 1 m, ograniczone)
export function segCount(len, cell) { return Math.max(1, Math.min(BAKE.maxSeg, Math.ceil(len / (cell || BAKE.cell)))); }
// Liczba wierzchołków podzielonego pudełka w x h x d (6 ścian siatki)
export function boxVerts(w, h, d, cell) { const a = segCount(w, cell) + 1, b = segCount(h, cell) + 1, c = segCount(d, cell) + 1; return 2 * (b * c + a * c + a * b); }
// Komórka dobrana tak, żeby cały poziom zmieścił się w maxVerts (grubsza siatka przy bardzo dużych poziomach)
export function cellFor(dims, maxVerts) {
    maxVerts = maxVerts || BAKE.maxVerts; let cell = BAKE.cell;
    for (let i = 0; i < 12; i++) { let n = 0; for (const [w, h, d] of dims) n += boxVerts(w, h, d, cell); if (n <= maxVerts) break; cell *= 1.4; }
    return cell;
}
// Natężenie światła w odległości d (jak w three.js: 1/d^decay z oknem odcięcia przy distance)
export function falloff(d, dist, decay) {
    let f = 1 / Math.max(Math.pow(d, decay === undefined ? 2 : decay), 0.01);
    if (dist > 0) { const q = Math.min(1, d / dist); f *= Math.pow(Math.max(0, 1 - q * q * q * q), 2); }
    return f;
}
// Bryły z zasięgu światła (do liczenia okluzji): tylko wysokie, w kuli o promieniu dist (albo wszystkie przy dist 0)
export function cullBoxes(light, boxes) {
    return boxes.filter((b) => {
        if (b.max.y - b.min.y < BAKE.minH) return false;
        if (!(light.dist > 0)) return true;
        const dx = Math.max(b.min.x - light.x, 0, light.x - b.max.x), dy = Math.max(b.min.y - light.y, 0, light.y - b.max.y), dz = Math.max(b.min.z - light.z, 0, light.z - b.max.z);
        return dx * dx + dy * dy + dz * dz <= light.dist * light.dist;
    });
}
export function prepareLights(lights, boxes) { return lights.map(l => Object.assign({}, l, { near: cullBoxes(l, boxes) })); }
function inside(p, b) { return p.x > b.min.x && p.x < b.max.x && p.y > b.min.y && p.y < b.max.y && p.z > b.min.z && p.z < b.max.z; }
// Czy odcinek a -> b przecina którąś bryłę (pomijając bryłę własną i te, w których zaczyna się odcinek)
export function blocked(a, b, boxes, self) {
    const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z, len = Math.hypot(dx, dy, dz); if (len < 0.1) return false;
    const d = { x: dx / len, y: dy / len, z: dz / len };
    for (const bx of boxes) { if (bx === self || inside(a, bx)) continue; const t = rayBox(a, d, bx, len - 0.05); if (t < len - 0.05) return true; }
    return false;
}
// Kolor wypalony w jednym wierzchołku: p (świat), n (normalna jednostkowa)
export function bakeVertex(p, n, lights, self) {
    let r = 0, g = 0, bl = 0;
    const o = { x: p.x + n.x * BAKE.push, y: p.y + n.y * BAKE.push, z: p.z + n.z * BAKE.push };
    for (const l of lights) {
        const dx = l.x - p.x, dy = l.y - p.y, dz = l.z - p.z, d = Math.hypot(dx, dy, dz);
        if (l.dist > 0 && d >= l.dist) continue;
        const ndl = d > 1e-6 ? (n.x * dx + n.y * dy + n.z * dz) / d : 1, w = Math.max(0, (ndl + BAKE.wrap) / (1 + BAKE.wrap));
        if (w <= 0) continue;
        let v = falloff(Math.max(d, 0.4), l.dist, l.decay) * w * BAKE.k / Math.PI;
        if (blocked(o, l, l.near || [], self)) v *= BAKE.leak;   // za ścianą zostaje tylko miękkie odbicie
        r += l.r * v; g += l.g * v; bl += l.b * v;
    }
    const c = BAKE.cap; return [Math.min(c, r), Math.min(c, g), Math.min(c, bl)];
}
