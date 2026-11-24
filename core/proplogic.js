// ==========================================
// Rekwizyty w poziomach (czysta logika, bez THREE): tabela rekwizytów z assets/props/props.glb, zestawy dla poziomów i rozmieszczanie.
// Rekwizyty to dekoracja BEZ kolizji (gracz i boty przechodzą przez nie), więc nie mogą nic blokować: stoją z dala od startu, rezerwacji i portali,
// poza przeszkodami, a przy ścianach tylko tam, gdzie po drugiej stronie zostaje co najmniej 1,9 m przejścia, a na otwartej podłodze tylko z 0,95 m luzu dookoła. Rysuje je core/props.js (instancje).
// Reguły unikania (start, rezerwacje, portale, przeszkody) są we wspólnym core/spotlogic.js.
// ==========================================
import { makeSpots } from './spotlogic.js';
export const PROPS = {   // nazwa siatki w GLB -> promień zajmowanego miejsca (m); nazwy muszą pasować do tools/blender/props.py (test pilnuje)
    barrel: { mesh: 'prop_barrel', r: 0.38 }, crate: { mesh: 'prop_crate', r: 0.48 }, bench: { mesh: 'prop_bench', r: 0.85 },
    pipes: { mesh: 'prop_pipes', r: 0.95 }, debris: { mesh: 'prop_debris', r: 0.6 }, bucket: { mesh: 'prop_bucket', r: 0.28 },
    chair: { mesh: 'prop_chair', r: 0.34 }, shelf: { mesh: 'prop_shelf', r: 0.62 }, cart: { mesh: 'prop_cart', r: 0.62 },
};
export const PROP_SETS = {   // poziom bazowy -> zestaw: ziarno, ile sztuk i wagi rodzajów
    hospital: { seed: 301, count: 18, kinds: [['cart', 3], ['bench', 2], ['chair', 3], ['bucket', 2], ['shelf', 2], ['crate', 1]] },
    catacombs: { seed: 302, count: 20, kinds: [['debris', 4], ['barrel', 2], ['crate', 2], ['pipes', 2], ['bucket', 1]] },
    cemetery: { seed: 303, count: 16, kinds: [['debris', 3], ['bench', 2], ['crate', 2], ['bucket', 1], ['barrel', 1]] },
    nursery: { seed: 304, count: 16, kinds: [['chair', 4], ['shelf', 3], ['crate', 2], ['bucket', 1]] },
    laundry: { seed: 305, count: 20, kinds: [['barrel', 3], ['crate', 3], ['bucket', 2], ['pipes', 2], ['cart', 2]] },
    silence: { seed: 306, count: 14, kinds: [['debris', 3], ['chair', 2], ['bench', 2], ['crate', 1]] },
    furas: { seed: 307, count: 16, kinds: [['crate', 3], ['barrel', 2], ['chair', 2], ['bench', 2], ['debris', 1]] },
    maze: { seed: 308, count: 24, kinds: [['debris', 3], ['crate', 2], ['bucket', 2], ['chair', 1], ['barrel', 1]] },
};
// Poziom bazowy z id (warianty typu maze_3 dziedziczą po maze)
export const baseLevelId = (id) => String(id || '').replace(/[_-]\d+$/, '');
export function propSetFor(id) { return PROP_SETS[baseLevelId(id)] || null; }
export function propsEnabled(quality, calm) { return !calm && quality !== 'low'; }
export function propCount(set, quality) { return set ? (quality === 'high' ? set.count : Math.ceil(set.count * 0.6)) : 0; }

function mulberry(seed) { let a = (Number.isFinite(seed) ? Math.floor(seed) : 1) >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function pickKind(R, kinds) { let tot = 0; for (const k of kinds) tot += k[1]; let r = R() * tot; for (const k of kinds) { r -= k[1]; if (r <= 0) return k[0]; } return kinds[kinds.length - 1][0]; }

// o: { seed, count, area:{minX,maxX,minZ,maxZ}, floorY, boxes:[{minX,maxX,minY,maxY,minZ,maxZ}], spawn:[x,y,z], reserved:[[x,z,r]], portals:[box], kinds:[[nazwa, waga]] }
// Zwraca [{ name, x, z, rotY, scale, tint }] (y = floorY dokłada rysujący)
export function placeProps(o) {
    const R = mulberry(o.seed), A = o.area, fy = o.floorY || 0, boxes = o.boxes || [], sp = o.spawn || [0, 1, 0], kinds = (o.kinds || []).filter(k => PROPS[k[0]] && k[1] > 0);
    if (!kinds.length || !(o.count > 0) || !A) return [];
    const SP = makeSpots(o), free = SP.free, clear = SP.clear, inside = (x, z) => SP.inside(x, z, 0.8), tall = SP.tall, out = [];
    for (let tries = 0; tries < o.count * 50 && out.length < o.count; tries++) {
        const name = pickKind(R, kinds), r = PROPS[name].r; let x, z, rotY;
        if (tall.length && R() < 0.7) {   // przy ścianie, tyłem do niej
            const q = tall[(R() * tall.length) | 0], f = (R() * 4) | 0, t = 0.1 + R() * 0.8, off = r + 0.05 + R() * 0.25;
            const nx = f === 2 ? -1 : (f === 3 ? 1 : 0), nz = f === 0 ? -1 : (f === 1 ? 1 : 0);
            const bx = f < 2 ? q.minX + (q.maxX - q.minX) * t : (f === 2 ? q.minX : q.maxX), bz = f < 2 ? (f === 0 ? q.minZ : q.maxZ) : q.minZ + (q.maxZ - q.minZ) * t;
            x = bx + nx * off; z = bz + nz * off; rotY = Math.atan2(nx, nz) + (R() - 0.5) * 0.25;
            if (!free(bx + nx * 1.9, bz + nz * 1.9, 0.2)) continue;   // po drugiej stronie za mało miejsca: rekwizyt zwężałby przejście
        } else { x = A.minX + 1 + R() * (A.maxX - A.minX - 2); z = A.minZ + 1 + R() * (A.maxZ - A.minZ - 2); rotY = R() * Math.PI * 2; if (!free(x, z, r + 0.95)) continue; }   // otwarta podłoga: co najmniej 0,95 m luzu od ścian dookoła, więc nie stanie w środku wąskiego korytarza
        if (!inside(x, z) || !clear(x, z) || !free(x, z, r) || out.some(p => Math.hypot(p.x - x, p.z - z) < p.r + r + 0.3)) continue;
        out.push({ name: name, x: x, z: z, rotY: rotY, scale: 0.9 + R() * 0.25, tint: 0.8 + R() * 0.3, r: r });
    }
    return out;
}
