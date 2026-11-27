// ==========================================
// SCARY GTA: BILLBOARDY (czysta logika, bez THREE): neonowe reklamy z horrorem na ścianach wysokich budynków, jak w prawdziwym GTA. Do 6 sztuk, jedna na budynek, na wysokości 5-9 m (poza zasięgiem rąk),
// zawsze na ścianie, przed którą jest co najmniej 6 m wolnego miejsca (ulica albo plac), nigdy na rusztowaniu, wieży z torbą ani wnętrzu z drzwiami. Tylko wizualne: bez kolizji, bez zapisu, bez sieci.
// Wszystkie billboardy to JEDNA scalona siatka z jednym atlasem tekstury (+1 wywołanie rysowania); układ z `buildCity(1337)` zostaje bez zmian (nic nie trafia do SPECIAL).
// 3D: core/gtabillboardfx.js. Testy: tests/logic.mjs (blok "billboardy").
// ==========================================
import { CITY, cityWithInteriors } from './citylayout.js';

export const BB = { MAX: 6, MIN_H: 14, FRONT: 6, Y: [5, 9], W: 6, H: 3, GAP: 0.06, COLS: 2, ROWS: 3 };
// Teksty reklam (krótkie, zwykły ASCII, wymyślone marki); kolor to akcent neonu
export const ADS = [
    { id: 'hollow', top: 'HOLLOW BEACH', bottom: 'LEAVE ANY TIME', color: '#ff2a9a' },
    { id: 'deadair', top: 'DEAD AIR FM', bottom: 'ALWAYS LISTENING', color: '#20e0ff' },
    { id: 'smile', top: 'SMILE', bottom: 'YOU ARE ON CAMERA', color: '#ffd23a' },
    { id: 'sleep', top: 'SLEEP IS FOR', bottom: 'THE LIVING', color: '#ff3a3a' },
    { id: 'driver', top: 'NOBODY IS', bottom: 'DRIVING TONIGHT', color: '#7fff90' },
    { id: 'coming', top: 'SCARY CITY VI', bottom: 'COMING NEVER', color: '#b070ff' }
];
const FACES = (b) => [{ d: '+z', x: (b.x0 + b.x1) / 2, z: b.z1, nx: 0, nz: 1, w: b.x1 - b.x0 }, { d: '-z', x: (b.x0 + b.x1) / 2, z: b.z0, nx: 0, nz: -1, w: b.x1 - b.x0 }, { d: '+x', x: b.x1, z: (b.z0 + b.z1) / 2, nx: 1, nz: 0, w: b.z1 - b.z0 }, { d: '-x', x: b.x0, z: (b.z0 + b.z1) / 2, nx: -1, nz: 0, w: b.z1 - b.z0 }];
export function billboardSpots(B) {
    B = /** @type {any[]} */ (B || cityWithInteriors(1337));
    const free = (x, z) => !B.some(q => x > q.x0 && x < q.x1 && z > q.z0 && z < q.z1), out = [];
    for (const b of B.slice().sort((p, q) => (p.id < q.id ? -1 : 1))) {
        if (out.length >= BB.MAX) break;
        if (b.h < BB.MIN_H || b.scaffold || b.roofBag || b.interior || b.bag) continue;
        const faces = FACES(b), start = out.length % 4;   // kierunki naprzemiennie, żeby reklamy nie patrzyły wszystkie w jedną stronę
        for (let k = 0; k < 4; k++) {
            const f = faces[(start + k) % 4], fx = f.x + f.nx * BB.FRONT, fz = f.z + f.nz * BB.FRONT, sx = fx + f.nz * 2, sz = fz + f.nx * 2, gx = f.x + f.nx * (BB.FRONT + 0.5), gz = f.z + f.nz * (BB.FRONT + 0.5);
            if (f.w < BB.W + 2 || !free(fx, fz) || !free(sx, sz) || !free(gx, gz) || Math.abs(fx) > CITY.X1 - 4 || fz < CITY.Z0 + 4 || fz > CITY.Z1 - 4) continue;
            const ad = ADS[out.length % ADS.length], y = Math.min(BB.Y[1], Math.max(BB.Y[0], b.h * 0.45));
            out.push({ ad: ad.id, bid: b.id, d: f.d, x: f.x + f.nx * BB.GAP, y: y, z: f.z + f.nz * BB.GAP, nx: f.nx, nz: f.nz, yaw: Math.atan2(f.nx, f.nz), w: BB.W, h: BB.H, cell: out.length % ADS.length });
            break;
        }
    }
    return out;
}
export function billboardProblems() {
    const bad = [], B = /** @type {any[]} */ (cityWithInteriors(1337)), sp = billboardSpots(B), byId = Object.fromEntries(B.map(b => [b.id, b]));
    if (sp.length < 4) bad.push('too few billboards fit (' + sp.length + ')');
    if (new Set(sp.map(s => s.bid)).size !== sp.length) bad.push('two billboards on one building');
    for (const s of sp) {
        const b = byId[s.bid];
        if (!b) { bad.push('billboard on a missing building'); continue; }
        if (b.scaffold || b.roofBag || b.interior) bad.push('billboard ' + s.ad + ' sits on a climbable or interior building');
        if (s.y - s.h / 2 < 3.5 || s.y + s.h / 2 > b.h - 0.5) bad.push('billboard ' + s.ad + ' is out of reach range or above the roof');
        const onFace = (s.nx !== 0 ? Math.abs(s.x - (s.nx > 0 ? b.x1 : b.x0)) < 0.1 && Math.abs(s.z - (b.z0 + b.z1) / 2) < 0.1 : Math.abs(s.z - (s.nz > 0 ? b.z1 : b.z0)) < 0.1 && Math.abs(s.x - (b.x0 + b.x1) / 2) < 0.1);
        if (!onFace) bad.push('billboard ' + s.ad + ' is not on the middle of a wall');
        const fx = s.x + s.nx * BB.FRONT, fz = s.z + s.nz * BB.FRONT; if (B.some(q => fx > q.x0 && fx < q.x1 && fz > q.z0 && fz < q.z1)) bad.push('billboard ' + s.ad + ' faces a wall');
    }
    for (const a of ADS) for (const t of [a.top, a.bottom]) if (!/^[A-Z0-9 ]+$/.test(t) || t.length > 18) bad.push('ad text is malformed: ' + t);
    if (new Set(ADS.map(a => a.id)).size !== ADS.length || ADS.length > BB.COLS * BB.ROWS) bad.push('ad list does not fit the atlas');
    return bad;
}
