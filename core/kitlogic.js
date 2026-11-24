// ==========================================
// Elementy architektury (czysta logika, bez THREE): listwy przypodłogowe i sufitowe, rury, korytka kablowe i kratki wentylacyjne przy ścianach.
// Dobór wg RODZINY KOLORYSTYCZNEJ poziomu (core/artlogic.js), więc obejmuje każdy poziom z rejestru. Gry (kind 'game', rodzina arcade) nic nie dostają, sale (hub)
// połowę, Room 000 jest pominięty jawnie (KIT_SKIP: nie ma L.obstacles). Bez kolizji, tylko wizualne; elementy wystają najwyżej ok. 0,3 m, a poziome
// (rura, korytko) wiszą wysoko pod sufitem (>= 2,4 m), poza zasięgiem rąk, więc nie wyglądają na chwytne. Modele: tools/blender/props.py (kit_*), 3D: core/kit.js.
// Rozmieszczanie opiera się na wspólnym core/spotlogic.js (płaskie ściany, omijanie portali i rezerwacji).
// ==========================================
import { wallFaces, faceIntervals } from './spotlogic.js';

export const KIT = {   // nazwa -> siatka w GLB, tryb: strip (skalowana wzdłuż ściany), seg (stała długość len), one (pojedyncza)
    base: { mesh: 'kit_base', mode: 'strip' }, crown: { mesh: 'kit_crown', mode: 'strip' },
    pipe: { mesh: 'kit_pipe', mode: 'seg', len: 2.0 }, tray: { mesh: 'kit_tray', mode: 'seg', len: 2.0 }, vent: { mesh: 'kit_vent', mode: 'one' },
};
export const FAMILY_KIT = {   // prawdopodobieństwo elementu na odcinek ściany
    clinical: { base: 0.8, crown: 0.0, pipe: 0.45, tray: 0.3, vent: 0.35 },
    crypt: { base: 0.0, crown: 0.0, pipe: 0.2, tray: 0.0, vent: 0.1 },
    industrial: { base: 0.4, crown: 0.0, pipe: 0.85, tray: 0.55, vent: 0.4 },
    hotel: { base: 0.9, crown: 0.8, pipe: 0.1, tray: 0.0, vent: 0.25 },
    dread: { base: 0.5, crown: 0.3, pipe: 0.3, tray: 0.2, vent: 0.2 },
    neutral: { base: 0.6, crown: 0.3, pipe: 0.1, tray: 0.0, vent: 0.1 },
};
export const KIT_SKIP = ['room000'];   // ściany z siatki (core/room000map.js), bez L.obstacles
export const KIT_MAX = { high: 140, medium: 80 };
export const KIT_LIMITS = { pipeMinHeight: 2.95, pipeY: 2.75, ventY: 2.15, crownMaxWall: 4.2, minLen: 1.2, trayDrop: 0.2, trayPipeGap: 0.25 };
const baseId = (id) => String(id || '').split(/[_:\-.]/)[0];

export function kitSet(levelId, family, kind) {
    if (kind === 'game' || kind === 'virtual' || family === 'arcade' || KIT_SKIP.includes(baseId(levelId))) return null;
    const p = FAMILY_KIT[family]; if (!p) return null;
    let h = 17; for (const ch of baseId(levelId)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    return { seed: 700 + (h % 1000), p: p, factor: kind === 'hub' ? 0.5 : 1 };
}
export const kitEnabled = (quality, calm) => !calm && quality !== 'low';
export const kitMax = (quality) => quality === 'high' ? KIT_MAX.high : KIT_MAX.medium;

function mulberry(seed) { let a = (Number.isFinite(seed) ? Math.floor(seed) : 1) >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// o: { seed, p, factor, max, area, floorY, boxes, spawn, reserved, portals }. Zwraca [{ name, x, y, z, rotY, sx }] (mesh: początek przy ścianie, +Z na zewnątrz)
export function placeKit(o) {
    const fy = o.floorY || 0, L = KIT_LIMITS, p = o.p || {}, k = o.factor === undefined ? 1 : o.factor, max = o.max > 0 ? o.max : 0;
    if (!max || !o.area) return [];
    const faces = wallFaces(o).sort((a, b) => a.cx - b.cx || a.cz - b.cz || a.nx - b.nx || a.nz - b.nz), out = [];
    const put = (name, f, t, y, sx) => { if (out.length < max) out.push({ name: name, x: f.cx + f.tx * t, y: y, z: f.cz + f.tz * t, rotY: Math.atan2(f.nx, f.nz), sx: sx }); };
    faces.forEach((f, fi) => {
        const R = mulberry(o.seed * 131 + fi), h = f.top - fy, ivs = faceIntervals(f, o, 0.6);
        for (const [a, b] of ivs) {
            const len = b - a; if (len < L.minLen) continue;
            if (R() < (p.base || 0) * k) put('base', f, (a + b) / 2, fy, len - 0.1);
            if (h >= 2.4 && h <= L.crownMaxWall && R() < (p.crown || 0) * k) put('crown', f, (a + b) / 2, f.top, len - 0.1);
            let pipeY = null;
            if (h >= L.pipeMinHeight && R() < (p.pipe || 0) * k) {
                const n = Math.min(3, Math.floor((len - 0.2) / 2.02)); if (n >= 1) {
                    const cnt = 1 + ((R() * n) | 0), span = cnt * 2.02 - 0.02, s0 = a + 0.1 + R() * Math.max(0, len - 0.2 - span); pipeY = Math.min(f.top - 0.3, fy + L.pipeY);
                    for (let i = 0; i < cnt; i++) put('pipe', f, s0 + 1.0 + i * 2.02, pipeY, 1);
                }
            }
            if (h >= L.pipeMinHeight && R() < (p.tray || 0) * k) {
                const ty = f.top - L.trayDrop, n = Math.min(3, Math.floor((len - 0.2) / 2.02));
                if (n >= 1 && (pipeY === null || ty - pipeY >= L.trayPipeGap)) { const cnt = 1 + ((R() * n) | 0), span = cnt * 2.02 - 0.02, s0 = a + 0.1 + R() * Math.max(0, len - 0.2 - span); for (let i = 0; i < cnt; i++) put('tray', f, s0 + 1.0 + i * 2.02, ty, 1); }
            }
            if (h >= 2.8 && len >= 1.5 && R() < (p.vent || 0) * 0.5 * k) put('vent', f, a + 0.5 + R() * (len - 1.0), fy + L.ventY, 1);
        }
    });
    return out;
}
