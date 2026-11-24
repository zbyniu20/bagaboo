// ==========================================
// Decale na ścianach i podłogach (czysta logika, bez THREE): plamy wilgoci, pleśń, łuszcząca się farba, pęknięcia, zacieki, sadza, kałuże, brud.
// Zestaw zależy od RODZINY KOLORYSTYCZNEJ poziomu (core/artlogic.js), więc obejmuje każdy poziom z rejestru, także przyszłe. Gry (rodzina arcade i kind 'game')
// nie dostają nic, sale (hub) około 45% ilości. Room 000 nie ma L.obstacles (ściany z siatki), więc jest pominięty jawnie (DECAL_SKIP).
// Rysuje je core/decals.js jako jedną siatkę z atlasu tekstur. Rozmieszczanie: core/spotlogic.js (wspólne z rekwizytami). Tylko wizualne i lokalne.
// ==========================================
import { makeSpots, wallFaces, faceIntervals } from './spotlogic.js';

export const DECALS = {   // nazwa -> komórka atlasu (4 x 2), powierzchnia, zakres szerokości i wysokości (m), zakotwiczenie i krycie
    damp: { cell: 0, on: 'wall', w: [1.2, 2.6], h: [1.4, 3.0], anchor: 'top', alpha: [0.45, 0.7] },
    mold: { cell: 1, on: 'wall', w: [0.8, 1.8], h: [0.6, 1.5], anchor: 'low', alpha: [0.5, 0.75] },
    peel: { cell: 2, on: 'wall', w: [0.9, 2.0], h: [0.9, 2.0], anchor: 'free', alpha: [0.55, 0.8] },
    crack: { cell: 3, on: 'wall', w: [1.0, 2.2], h: [1.0, 2.2], anchor: 'free', alpha: [0.6, 0.85] },
    streak: { cell: 4, on: 'wall', w: [0.5, 1.0], h: [1.6, 3.2], anchor: 'top', alpha: [0.5, 0.75] },
    soot: { cell: 5, on: 'wall', w: [1.4, 2.6], h: [1.2, 2.4], anchor: 'top', alpha: [0.4, 0.65] },
    puddle: { cell: 6, on: 'floor', w: [1.0, 2.4], h: [1.0, 2.4], anchor: 'floor', alpha: [0.6, 0.85] },
    grime: { cell: 7, on: 'floor', w: [1.4, 3.0], h: [1.4, 3.0], anchor: 'floor', alpha: [0.45, 0.7] },
};
export const FAMILY_DECALS = {
    clinical: { count: 30, kinds: [['damp', 3], ['peel', 3], ['streak', 2], ['crack', 2], ['grime', 1], ['puddle', 1]] },
    crypt: { count: 32, kinds: [['mold', 3], ['damp', 3], ['crack', 2], ['soot', 1], ['puddle', 1], ['grime', 1]] },
    industrial: { count: 30, kinds: [['streak', 3], ['damp', 2], ['soot', 2], ['puddle', 2], ['grime', 2], ['crack', 1]] },
    hotel: { count: 28, kinds: [['damp', 2], ['peel', 3], ['soot', 2], ['crack', 2], ['grime', 1]] },
    dread: { count: 30, kinds: [['soot', 3], ['crack', 3], ['mold', 2], ['damp', 1], ['grime', 1]] },
    neutral: { count: 14, kinds: [['damp', 2], ['crack', 2], ['grime', 2]] },
};
export const DECAL_SKIP = ['room000'];   // brak L.obstacles: ściany z siatki (core/room000map.js), dekoracje ścian robi tam placeOnWall
export const baseId = (id) => String(id || '').split(/[_:\-.]/)[0];
// Zestaw dla poziomu: rodzina (z artlogic), rodzaj z rejestru (level, hub, game, virtual)
export function decalSet(levelId, family, kind) {
    if (kind === 'game' || kind === 'virtual' || family === 'arcade' || DECAL_SKIP.includes(baseId(levelId))) return null;
    const f = FAMILY_DECALS[family]; if (!f) return null;
    return { seed: 500 + (baseId(levelId).length * 37 + baseId(levelId).charCodeAt(0)), count: kind === 'hub' ? Math.ceil(f.count * 0.45) : f.count, kinds: f.kinds };
}
export const decalEnabled = (quality, calm) => !calm && quality !== 'low';
export const decalCount = (set, quality) => set ? (quality === 'high' ? set.count : Math.ceil(set.count * 0.6)) : 0;

function mulberry(seed) { let a = (Number.isFinite(seed) ? Math.floor(seed) : 1) >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const lerp = (r, R) => r[0] + (r[1] - r[0]) * R();
function pickKind(R, kinds) { let tot = 0; for (const k of kinds) tot += k[1]; let r = R() * tot; for (const k of kinds) { r -= k[1]; if (r <= 0) return k[0]; } return kinds[kinds.length - 1][0]; }

// o: { seed, count, area, floorY, boxes, spawn, reserved, portals, kinds }. Zwraca [{ name, on, x, y, z, nx, nz, tx, tz, w, h, rot, alpha, cell }]
export function placeDecals(o) {
    const R = mulberry(o.seed), fy = o.floorY || 0, A = o.area, kinds = (o.kinds || []).filter(k => DECALS[k[0]] && k[1] > 0);
    if (!kinds.length || !(o.count > 0) || !A) return [];
    const SP = makeSpots(o), faces = wallFaces(o), totalLen = faces.reduce((a, f) => a + f.len, 0), out = [];
    const pickFace = () => { let r = R() * totalLen; for (const f of faces) { r -= f.len; if (r <= 0) return f; } return faces[faces.length - 1]; };
    for (let tries = 0; tries < o.count * 40 && out.length < o.count; tries++) {
        const name = pickKind(R, kinds), d = DECALS[name]; let w = lerp(d.w, R), h = lerp(d.h, R);
        if (d.on === 'floor') {
            const x = A.minX + 1.5 + R() * (A.maxX - A.minX - 3), z = A.minZ + 1.5 + R() * (A.maxZ - A.minZ - 3);
            if (!SP.clear(x, z) || !SP.free(x, z, Math.max(w, h) / 2)) continue;
            if (out.some(p => p.on === 'floor' && Math.hypot(p.x - x, p.z - z) < (p.w + w) * 0.4)) continue;
            out.push({ name: name, on: 'floor', x: x, y: fy + 0.014 + R() * 0.004, z: z, nx: 0, nz: 0, tx: 1, tz: 0, w: w, h: h, rot: R() * Math.PI * 2, alpha: lerp(d.alpha, R), cell: d.cell });
            continue;
        }
        if (!faces.length) continue;
        const f = pickFace(), room = f.top - fy;
        if (room < 1.0) continue;
        if (h > room - 0.3) h = Math.max(0.6, room - 0.3);
        const ivs = faceIntervals(f, o, w / 2 + 0.4).filter(([a, b]) => b - a >= w); if (!ivs.length) continue;
        const iv = ivs[(R() * ivs.length) | 0], t = iv[0] + w / 2 + R() * (iv[1] - iv[0] - w);
        let y;
        if (d.anchor === 'top') y = Math.max(fy + h / 2, Math.min(f.top, fy + 3.4) - h / 2 - 0.1 - R() * 0.4);
        else if (d.anchor === 'low') y = fy + h / 2 + 0.05 + R() * 0.3;
        else y = fy + h / 2 + R() * Math.max(0, Math.min(f.top, fy + 3.2) - fy - h);
        const x = f.cx + f.tx * t + f.nx * 0.02, z = f.cz + f.tz * t + f.nz * 0.02;
        if (out.some(p => p.on === 'wall' && p.nx === f.nx && p.nz === f.nz && Math.hypot(p.x - x, p.z - z, (p.y - y) * 0.6) < (p.w + w) * 0.4)) continue;
        out.push({ name: name, on: 'wall', x: x, y: y, z: z, nx: f.nx, nz: f.nz, tx: f.tx, tz: f.tz, w: w, h: h, rot: 0, alpha: lerp(d.alpha, R), cell: d.cell });
    }
    return out;
}
// Prostokąt UV komórki atlasu 4 x 2 (komórka 0 w lewym górnym rogu płótna), z marginesem na rozmycie tekstury
export function cellUV(cell) {
    const col = cell % 4, row = (cell / 4) | 0, e = 0.004;
    return { u0: col / 4 + e, u1: (col + 1) / 4 - e, v0: 1 - (row + 1) / 2 + e, v1: 1 - row / 2 - e };
}
