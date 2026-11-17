// ==========================================
// WARSZTAT: FORMAT I WALIDACJA MAPY GRACZA (czyste funkcje, bez importów, testowane w Node: tests/modes/workshop.mjs).
// Mapa to siatka 20x20 pól po 1 m z blokami [x, z, y, szer, głęb, wys] (liczby całkowite), polem startu i mety. Gracze budują ją w edytorze
// (levels/workshop.js) i grają jako wyścig (levels/custom.js, fabryka core/racemode.js). Mapa ma kod tekstowy; goście dostają go od hosta
// (core/leveldata.js) i przyjmują WYŁĄCZNIE przez decodeMap, czyli pełną walidację: struktura, zakresy, limit bloków i osiągalność mety.
// ==========================================
export const LIM = { GRID: 20, BLOCKS: 80, W: 6, D: 6, H: 3, Y: 12, NAME: 16, JUMP_GAP: 1.4, RISE: 1.0, MAX_CODE: 6000 };
const isInt = (v) => typeof v === 'number' && Number.isInteger(v);
const clampInt = (v, a, b) => Math.max(a, Math.min(b, v));

// Mapa zapasowa: gdy gość dostanie zepsute dane albo host nie ma jeszcze zapisanej mapy, wyścig i tak działa
export const demoMap = () => ({ v: 1, n: 'Demo course', b: [[8, 16, 0, 4, 3, 1], [8, 13, 0, 4, 2, 1], [8, 10, 0, 4, 2, 1], [8, 7, 1, 4, 2, 1], [8, 4, 2, 4, 2, 1], [8, 1, 2, 4, 3, 1]], s: [10, 17], f: [10, 2] });
export const emptyMap = () => ({ v: 1, n: 'My course', b: [[7, 15, 0, 6, 4, 1], [7, 1, 0, 6, 4, 1]], s: [10, 17], f: [10, 2] });
export const safeMapName = (n) => { const s = String(n === undefined || n === null ? '' : n).replace(/[^A-Za-z0-9 _-]/g, '').trim().slice(0, LIM.NAME); return s || 'My course'; };

// ---------- bloki ----------
export function blockError(b) {
    if (!Array.isArray(b) || b.length !== 6 || !b.every(isInt)) return 'block must be 6 whole numbers';
    const [x, z, y, w, d, h] = b;
    if (w < 1 || w > LIM.W || d < 1 || d > LIM.D || h < 1 || h > LIM.H) return 'block size out of range';
    if (x < 0 || z < 0 || x + w > LIM.GRID || z + d > LIM.GRID) return 'block outside the grid';
    if (y < 0 || y > LIM.Y) return 'block height out of range';
    return null;
}
const covers = (b, x, z) => x >= b[0] && x < b[0] + b[3] && z >= b[1] && z < b[1] + b[4];
export const topOf = (b) => b[2] + b[5];
// Wysokość najwyższej powierzchni nad polem (x, z); -1 gdy pole jest puste
export function topAt(map, x, z) { let t = -1; for (const b of map.b) if (covers(b, x, z)) t = Math.max(t, topOf(b)); return t; }

// ---------- edycja (funkcje nie zmieniają wejścia, zwracają nową mapę) ----------
const copy = (map) => ({ v: 1, n: map.n, b: map.b.map(b => b.slice()), s: map.s ? map.s.slice() : null, f: map.f ? map.f.slice() : null });
export function placeBlock(map, blk) {
    const e = blockError(blk); if (e) return { map: map, error: e };
    if (map.b.some(b => b.every((v, i) => v === blk[i]))) return { map: map, error: 'already there' };
    if (map.b.length >= LIM.BLOCKS) return { map: map, error: 'limit of ' + LIM.BLOCKS + ' blocks' };
    const m = copy(map); m.b.push(blk.slice()); return { map: m, error: null };
}
// Usuwa najwyższy blok nad polem; start i meta bez podparcia są kasowane
export function eraseAt(map, x, z) {
    let bi = -1, bt = -1; map.b.forEach((b, i) => { if (covers(b, x, z) && topOf(b) > bt) { bt = topOf(b); bi = i; } });
    if (bi < 0) return { map: map, error: 'nothing here' };
    const m = copy(map); m.b.splice(bi, 1);
    if (m.s && topAt(m, m.s[0], m.s[1]) < 0) m.s = null;
    if (m.f && topAt(m, m.f[0], m.f[1]) < 0) m.f = null;
    return { map: m, error: null };
}
export function setMark(map, which, x, z) {
    if (which !== 's' && which !== 'f') return { map: map, error: 'bad mark' };
    if (!isInt(x) || !isInt(z) || x < 0 || z < 0 || x >= LIM.GRID || z >= LIM.GRID || topAt(map, x, z) < 0) return { map: map, error: 'needs a block under it' };
    const m = copy(map); m[which] = [x, z]; return { map: m, error: null };
}

// ---------- osiągalność ----------
function gap(A, B) {
    const dx = Math.max(0, B[0] - (A[0] + A[3]), A[0] - (B[0] + B[3])), dz = Math.max(0, B[1] - (A[1] + A[4]), A[1] - (B[1] + B[4]));
    return Math.hypot(dx, dz);
}
const canGo = (A, B) => A !== B && gap(A, B) <= LIM.JUMP_GAP && topOf(B) - topOf(A) <= LIM.RISE;
const centre = (b) => [b[0] + b[3] / 2, b[1] + b[4] / 2, topOf(b)];
// Najkrótsza trasa (po krawędziach skoków) od bloku startu do bloku mety: { hops, length } albo null
export function route(map) {
    if (!map.s || !map.f) return null;
    const ts = topAt(map, map.s[0], map.s[1]), tf = topAt(map, map.f[0], map.f[1]);
    const starts = map.b.map((b, i) => covers(b, map.s[0], map.s[1]) && topOf(b) === ts ? i : -1).filter(i => i >= 0);
    const ends = new Set(map.b.map((b, i) => covers(b, map.f[0], map.f[1]) && topOf(b) === tf ? i : -1).filter(i => i >= 0));
    const n = map.b.length, dist = new Array(n).fill(Infinity), hops = new Array(n).fill(0), done = new Array(n).fill(false);
    starts.forEach(i => { dist[i] = 0; });
    for (let k = 0; k < n; k++) {
        let u = -1; for (let i = 0; i < n; i++) if (!done[i] && dist[i] < Infinity && (u < 0 || dist[i] < dist[u])) u = i;
        if (u < 0) break; done[u] = true;
        for (let v = 0; v < n; v++) if (!done[v] && canGo(map.b[u], map.b[v])) {
            const a = centre(map.b[u]), c = centre(map.b[v]), w = Math.hypot(a[0] - c[0], a[1] - c[1]) + Math.abs(a[2] - c[2]);
            if (dist[u] + w < dist[v]) { dist[v] = dist[u] + w; hops[v] = hops[u] + 1; }
        }
    }
    let best = -1; ends.forEach(i => { if (dist[i] < Infinity && (best < 0 || dist[i] < dist[best])) best = i; });
    return best < 0 ? null : { hops: hops[best], length: Math.round(dist[best] * 10) / 10 };
}
// Czas wzorcowy do HUD: trasa w ok. 2,5 m/s plus zapas na pomyłki
export const parOf = (map) => { const r = route(map); return r ? Math.max(20, Math.round(r.length / 2.5 + 15)) : 60; };

// ---------- walidacja i kod ----------
export function validateMap(map) {
    const errors = [];
    if (!map || typeof map !== 'object' || !Array.isArray(map.b)) return { ok: false, errors: ['not a map'], stats: null };
    if (map.b.length < 2) errors.push('needs at least 2 blocks');
    if (map.b.length > LIM.BLOCKS) errors.push('too many blocks (max ' + LIM.BLOCKS + ')');
    map.b.forEach((b, i) => { const e = blockError(b); if (e) errors.push('block ' + (i + 1) + ': ' + e); });
    const mark = (m) => Array.isArray(m) && m.length === 2 && m.every(isInt) && m[0] >= 0 && m[1] >= 0 && m[0] < LIM.GRID && m[1] < LIM.GRID;
    if (!mark(map.s)) errors.push('set the START'); else if (!errors.length && topAt(map, map.s[0], map.s[1]) < 0) errors.push('START needs a block under it');
    if (!mark(map.f)) errors.push('set the FINISH'); else if (!errors.length && topAt(map, map.f[0], map.f[1]) < 0) errors.push('FINISH needs a block under it');
    if (!errors.length && map.s[0] === map.f[0] && map.s[1] === map.f[1]) errors.push('START and FINISH are on the same cell');
    let r = null;
    if (!errors.length) { r = route(map); if (!r) errors.push('no way from START to FINISH (gaps over ' + LIM.JUMP_GAP + ' m or steps over ' + LIM.RISE + ' m)'); }
    return { ok: errors.length === 0, errors: errors, stats: errors.length ? null : { blocks: map.b.length, hops: r.hops, length: r.length, par: parOf(map) } };
}
// Czyści dowolny obiekt do kształtu mapy (nie sprawdza reguł gry: to robi validateMap); null, gdy to nie jest mapa
export function normalizeMap(raw) {
    if (!raw || typeof raw !== 'object' || !Array.isArray(raw.b) || raw.b.length > LIM.BLOCKS) return null;
    const mark = (m) => Array.isArray(m) && m.length === 2 && m.every(isInt) ? [m[0], m[1]] : null;
    return { v: 1, n: safeMapName(raw.n), b: raw.b.map(b => Array.isArray(b) ? b.slice(0, 6) : null).filter(b => b !== null), s: mark(raw.s), f: mark(raw.f) };
}
const toB64u = (str) => { const bytes = new TextEncoder().encode(str); let bin = ''; for (const b of bytes) bin += String.fromCharCode(b); return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); };
const fromB64u = (s) => { s = s.replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '='; const bin = atob(s), bytes = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i); return new TextDecoder().decode(bytes); };
export const encodeMap = (map) => toB64u(JSON.stringify({ v: 1, n: map.n, b: map.b, s: map.s, f: map.f }));
// Kod -> zwalidowana mapa albo { map: null, errors }. To jedyna droga, którą mapa z sieci albo z pamięci wchodzi do gry
export function decodeMap(code) {
    if (typeof code !== 'string' || code.length === 0 || code.length > LIM.MAX_CODE || !/^[A-Za-z0-9_-]+$/.test(code)) return { map: null, errors: ['bad code'] };
    let raw; try { raw = JSON.parse(fromB64u(code)); } catch (e) { return { map: null, errors: ['unreadable code'] }; }
    const map = normalizeMap(raw); if (!map) return { map: null, errors: ['not a map'] };
    const v = validateMap(map); return v.ok ? { map: map, errors: [] } : { map: null, errors: v.errors };
}

// ---------- świat gry ----------
const PAL = [0x6a5a8a, 0x5a7a9a, 0x5a9a7a, 0x9a8a5a, 0x9a5a6a, 0x7a6a5a];
// Bloki w metrach, z początkiem w polu startu (start = x 0, z 3). cy to środek bloku, col zależy od wysokości
export function levelOf(map) {
    const ox = map.s[0] + 0.5, oz = map.s[1] + 0.5, tS = topAt(map, map.s[0], map.s[1]), tF = topAt(map, map.f[0], map.f[1]);
    const blocks = map.b.map(b => ({ cx: b[0] + b[3] / 2 - ox, cy: b[2] + b[5] / 2, cz: b[1] + b[4] / 2 - oz + 3, w: b[3], h: b[5], d: b[4], col: PAL[(b[2] + b[5]) % PAL.length] }));
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity, maxY = 0;
    for (const b of blocks) { minX = Math.min(minX, b.cx - b.w / 2); maxX = Math.max(maxX, b.cx + b.w / 2); minZ = Math.min(minZ, b.cz - b.d / 2); maxZ = Math.max(maxZ, b.cz + b.d / 2); maxY = Math.max(maxY, b.cy + b.h / 2); }
    const sb = map.b.find(b => covers(b, map.s[0], map.s[1]) && topOf(b) === tS), fb = map.b.find(b => covers(b, map.f[0], map.f[1]) && topOf(b) === tF);
    return {
        blocks: blocks, spawn: [0, tS + 0.9, 3], finish: { x: map.f[0] + 0.5 - ox, y: tF, z: map.f[1] + 0.5 - oz + 3 },
        startTop: tS, startEdgeZ: sb[1] + sb[4] - oz + 3,                              // tylna krawędź bloku startu (drzwi GAMES)
        exitTop: tF, exitZ: fb[1] - oz + 3, exitX: map.f[0] + 0.5 - ox,                // przednia krawędź bloku mety (drzwi EXIT)
        bounds: { minX: minX - 6, maxX: maxX + 6, minZ: minZ - 6, maxZ: maxZ + 6, maxY: maxY + 14 }
    };
}
// Meta: w promieniu 1,6 m od środka pola mety, ciało gracza (stoi ok. 0,9 m nad powierzchnią) powyżej niej i nie wyżej niż 4 m nad nią
export const atFinish = (p, fin, r = 1.6) => Math.hypot(p.x - fin.x, p.z - fin.z) < r && p.y > fin.y + 0.3 && p.y < fin.y + 4;
