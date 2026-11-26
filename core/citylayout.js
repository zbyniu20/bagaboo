// ==========================================
// SCARY GTA: UKŁAD MIASTA (czysta logika, bez THREE; używa go levels/scarygta.js, testy: tests/logic.mjs).
// Miasto 160 x 150 m (ok. 24 000 m^2, 2x Maze), nocne, neonowe: siatka 4 x 3 kwartały po 24 m (ulice 14 m), bulwar, plaża z pirsem i marina. Kwartał dzieli się na cztery działki 10 m
// z zaułkami 4 m (zaułek da się przeskoczyć po dachach, ulicy 14 m nie). Układ jest deterministyczny (ziarno), a budynki specjalne (bank, kasyno, jubiler, stacja benzynowa,
// wieża radiowa) są zadane w tabeli. Chunk = jeden kwartał (poza renderem, gdy gracz jest dalej niż VIS_R, tnie to budżet rysowania).
// Reguły ruchu (po zmianie tempa gracza na 1,15): ulice >= 12 m, zaułki <= 5 m, ściany budynków śliskie (GRIP), wspinaczka tylko po rusztowaniach (SCAFFOLD).
// ==========================================
export const CITY = {
    X0: -80, X1: 80, Z0: -75, Z1: 75, GX: -69, GZ: -70, PITCH: 38, BLOCK: 24, COLS: 4, ROWS: 3, LOT: 10, ALLEY: 4, STREET: 14,
    MAX_H: 48, BLV: [30, 50], BEACH_Z: 50, SEA_Z: 58, PIER: { x: 0, z0: 52, z1: 72, w: 5 }, VIS_R: 85, GRIP: 0.3, WALL_T: 0.6, DOOR_W: 3.2,
    SPAWN: [0, 1, 56], EXIT: [0, 0, 70], EXIT_R: 3.2
};
export const ROLES = [['downtown', 'downtown', 'casino', 'casino'], ['old', 'old', 'motel', 'industrial'], ['marina', 'plaza', 'motel', 'warehouse']];
export const ROLE_H = { downtown: [22, 44], casino: [9, 16], old: [8, 14], motel: [6, 9], industrial: [8, 12], warehouse: [7, 9], plaza: [4, 5], marina: [3, 4] };
// Kwartał (i, j): prostokąt i środek
export const blockRect = (i, j) => { const x0 = CITY.GX + CITY.PITCH * i, z0 = CITY.GZ + CITY.PITCH * j; return { x0: x0, x1: x0 + CITY.BLOCK, z0: z0, z1: z0 + CITY.BLOCK }; };
export const lotRect = (i, j, k) => { const b = blockRect(i, j), a = k % 2, c = Math.floor(k / 2), x0 = b.x0 + a * (CITY.LOT + CITY.ALLEY), z0 = b.z0 + c * (CITY.LOT + CITY.ALLEY); return { x0: x0, x1: x0 + CITY.LOT, z0: z0, z1: z0 + CITY.LOT }; };
export const chunkId = (i, j) => i + ',' + j;
export const chunkCenter = (i, j) => { const b = blockRect(i, j); return [(b.x0 + b.x1) / 2, (b.z0 + b.z1) / 2]; };
// Budynki specjalne: klucz "i,j,k". hollow: parter z drzwiami (strona S/N/E/W) i wysokością bazy; scaffold: rusztowanie do wspinania na dach (strona); bag: torba łupu
export const SPECIAL = {
    '1,0,0': { name: 'bank', h: 38, hollow: { door: 'S', baseH: 6 }, bag: 'bank' },
    '2,0,0': { name: 'casino', h: 46, scaffold: { face: 'S' }, bag: 'casino', roofBag: true },
    '1,1,0': { name: 'jewelry', h: 8, hollow: { door: 'S', baseH: 8 }, bag: 'jewelry' },
    '3,1,0': { name: 'gas', h: 5, hollow: { door: 'W', baseH: 5 }, bag: 'gas' },
    '3,0,3': { name: 'radio', h: 42, scaffold: { face: 'W' }, bag: 'radio', roofBag: true, tower: true }
};
function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
// Lista budynków miasta. Każdy: { id, i, j, k, role, x0, x1, z0, z1, h, hollow, scaffold, bag, roofBag, name, tint }
export function buildCity(seed) {
    const R = rng(seed || 1337), out = [];
    for (let j = 0; j < CITY.ROWS; j++) for (let i = 0; i < CITY.COLS; i++) {
        const role = ROLES[j][i];
        for (let k = 0; k < 4; k++) {
            const sp = SPECIAL[i + ',' + j + ',' + k], hr = ROLE_H[role], lot = lotRect(i, j, k), r1 = R(), r2 = R(), r3 = R();
            if (!sp && (role === 'plaza' || role === 'marina')) continue;                     // plac i marina: bez zwykłych budynków
            if (!sp && r1 < 0.2) continue;                                                       // ok. 20% działek to parking (pusto)
            let h = sp ? sp.h : Math.round(hr[0] + r2 * (hr[1] - hr[0]));
            let x0 = lot.x0, x1 = lot.x1, z0 = lot.z0, z1 = lot.z1;
            if (sp && sp.tower) { x0 += 3.5; x1 -= 3.5; z0 += 3.5; z1 -= 3.5; }               // wieża radiowa: smukła
            else if (!sp && r3 < 0.35) { x1 -= 2; z1 -= 2; }                                    // część budynków ma mniejszy obrys (różnorodność)
            out.push({ id: i + ',' + j + ',' + k, i: i, j: j, k: k, role: role, x0: x0, x1: x1, z0: z0, z1: z1, h: h, hollow: sp && sp.hollow ? sp.hollow : null, scaffold: sp && sp.scaffold ? sp.scaffold : null,
                bag: sp && sp.bag ? sp.bag : null, roofBag: !!(sp && sp.roofBag), name: sp ? sp.name : '', tint: R() });
        }
    }
    return out;
}
// Torby łupu: 5 w budynkach specjalnych (parter albo dach) i jedna na jachcie w marinie
export const YACHT = { x: -57, z: 18, w: 5, d: 14, h: 3 };
export function bagSpots(buildings) {
    const out = [];
    for (const b of buildings) if (b.bag) {
        const cx = (b.x0 + b.x1) / 2, cz = (b.z0 + b.z1) / 2;
        out.push({ id: b.bag, x: cx, y: b.roofBag ? b.h + 0.5 : 0.7, z: cz });
    }
    out.push({ id: 'yacht', x: YACHT.x, y: YACHT.h + 0.7, z: YACHT.z });
    return out;
}
// Bryły ścian budynku z drzwiami (hollow): lista { x0, x1, y0, y1, z0, z1 }; baza pusta w środku (ściany grubości WALL_T + drzwi szerokości DOOR_W), dach bazy i pełny blok nad nią
export function hollowBoxes(b) {
    const t = CITY.WALL_T, bh = b.hollow.baseH, door = b.hollow.door, dw = CITY.DOOR_W, out = [];
    const cx = (b.x0 + b.x1) / 2, cz = (b.z0 + b.z1) / 2, DH = 2.9;
    const wallZ = (z0, z1, withDoor) => { if (!withDoor) out.push({ x0: b.x0, x1: b.x1, y0: 0, y1: bh, z0: z0, z1: z1 }); else { out.push({ x0: b.x0, x1: cx - dw / 2, y0: 0, y1: bh, z0: z0, z1: z1 }, { x0: cx + dw / 2, x1: b.x1, y0: 0, y1: bh, z0: z0, z1: z1 }, { x0: cx - dw / 2, x1: cx + dw / 2, y0: DH, y1: bh, z0: z0, z1: z1 }); } };
    const wallX = (x0, x1, withDoor) => { if (!withDoor) out.push({ x0: x0, x1: x1, y0: 0, y1: bh, z0: b.z0 + t, z1: b.z1 - t }); else { out.push({ x0: x0, x1: x1, y0: 0, y1: bh, z0: b.z0 + t, z1: cz - dw / 2 }, { x0: x0, x1: x1, y0: 0, y1: bh, z0: cz + dw / 2, z1: b.z1 - t }, { x0: x0, x1: x1, y0: DH, y1: bh, z0: cz - dw / 2, z1: cz + dw / 2 }); } };
    wallZ(b.z0, b.z0 + t, door === 'N'); wallZ(b.z1 - t, b.z1, door === 'S'); wallX(b.x0, b.x0 + t, door === 'W'); wallX(b.x1 - t, b.x1, door === 'E');
    if (b.h > bh) out.push({ x0: b.x0, x1: b.x1, y0: bh, y1: b.h, z0: b.z0, z1: b.z1 });   // dach bazy i reszta budynku (pełne)
    else out.push({ x0: b.x0, x1: b.x1, y0: bh - 0.4, y1: bh, z0: b.z0, z1: b.z1 });       // sam dach
    return out;
}
// Rusztowanie przy ścianie: płyta grubości 0.5 m i szerokości 4 m na całej wysokości (chwyt 1, w przeciwieństwie do śliskich ścian)
export function scaffoldBox(b) {
    const w = 4, t = 0.5, f = b.scaffold.face, cx = (b.x0 + b.x1) / 2, cz = (b.z0 + b.z1) / 2;
    if (f === 'S') return { x0: cx - w / 2, x1: cx + w / 2, y0: 0, y1: b.h, z0: b.z1, z1: b.z1 + t };
    if (f === 'N') return { x0: cx - w / 2, x1: cx + w / 2, y0: 0, y1: b.h, z0: b.z0 - t, z1: b.z0 };
    if (f === 'E') return { x0: b.x1, x1: b.x1 + t, y0: 0, y1: b.h, z0: cz - w / 2, z1: cz + w / 2 };
    return { x0: b.x0 - t, x1: b.x0, y0: 0, y1: b.h, z0: cz - w / 2, z1: cz + w / 2 };
}
const rectsOverlap = (a, b) => a.x0 < b.x1 && b.x0 < a.x1 && a.z0 < b.z1 && b.z0 < a.z1;
// Usterki układu (pusta lista = dobrze)
export function cityProblems(seed) {
    const bad = [], B = buildCity(seed), bags = bagSpots(B);
    if ((CITY.X1 - CITY.X0) * (CITY.Z1 - CITY.Z0) < 23600) bad.push('the city is smaller than 2x the Maze');
    if (CITY.STREET < 12) bad.push('streets are narrow enough to jump across');
    if (CITY.ALLEY > 5) bad.push('alleys are too wide to hop over');
    if (CITY.PITCH !== CITY.BLOCK + CITY.STREET) bad.push('pitch does not equal block + street');
    if (2 * CITY.LOT + CITY.ALLEY !== CITY.BLOCK) bad.push('lots and alley do not fill the block');
    for (let j = 0; j < CITY.ROWS; j++) for (let i = 0; i < CITY.COLS; i++) { const r = blockRect(i, j); if (r.x0 < CITY.X0 + 4 || r.x1 > CITY.X1 - 4 || r.z0 < CITY.Z0 + 4 || r.z1 > CITY.BLV[0]) bad.push('block ' + i + ',' + j + ' is outside the city'); }
    const last = blockRect(CITY.COLS - 1, CITY.ROWS - 1); if (last.z1 > CITY.BLV[0]) bad.push('the last row runs into the boulevard');
    for (const b of B) {
        const lot = lotRect(b.i, b.j, b.k);
        if (b.x0 < lot.x0 - 1e-9 || b.x1 > lot.x1 + 1e-9 || b.z0 < lot.z0 - 1e-9 || b.z1 > lot.z1 + 1e-9) bad.push(b.id + ' leaves its lot');
        if (b.h > CITY.MAX_H || b.h < 3) bad.push(b.id + ' has a bad height');
        if (b.hollow && (b.x1 - b.x0 < 8 || b.z1 - b.z0 < 8)) bad.push(b.id + ' is too small to enter');
        if (b.hollow) {
            const bs = hollowBoxes(b), dh = bs.filter(q => q.y0 >= 2.9 - 1e-9 && q.y1 <= b.hollow.baseH + 1e-9);
            if (b.hollow.baseH < 4 + 1e-9 && b.hollow.baseH < 5) bad.push(b.id + ' interior is too low');
            if (!dh.length) bad.push(b.id + ' has no door lintel');
        }
        if (b.scaffold) { const s = scaffoldBox(b); if (s.y1 < b.h - 1e-9) bad.push(b.id + ' scaffold does not reach the roof'); const blk = blockRect(b.i, b.j); if (s.x0 < blk.x0 - 1 || s.x1 > blk.x1 + 1 || s.z0 < blk.z0 - 1 || s.z1 > blk.z1 + 1) bad.push(b.id + ' scaffold sticks out of the block'); }
    }
    for (let a = 0; a < B.length; a++) for (let c = a + 1; c < B.length; c++) if (rectsOverlap(B[a], B[c])) bad.push(B[a].id + ' overlaps ' + B[c].id);
    const specials = Object.keys(SPECIAL); for (const key of specials) if (!B.some(b => b.id === key)) bad.push('special building ' + key + ' is missing');
    if (bags.length !== 6 || new Set(bags.map(x => x.id)).size !== 6) bad.push('there must be six distinct bags');
    for (const g of bags) {
        if (g.id === 'yacht') continue;
        const b = B.find(q => q.bag === g.id);
        if (!b) { bad.push('bag ' + g.id + ' has no building'); continue; }
        if (g.x < b.x0 || g.x > b.x1 || g.z < b.z0 || g.z > b.z1) bad.push('bag ' + g.id + ' is outside its building');
        if (!b.roofBag && !b.hollow) bad.push('bag ' + g.id + ' is inside a solid building');
        if (b.roofBag && !b.scaffold) bad.push('roof bag ' + g.id + ' cannot be climbed to');
        if (g.y > CITY.MAX_H) bad.push('bag ' + g.id + ' is too high');
    }
    const yb = { x0: YACHT.x - YACHT.w / 2, x1: YACHT.x + YACHT.w / 2, z0: YACHT.z - YACHT.d / 2, z1: YACHT.z + YACHT.d / 2 }, mb = blockRect(0, 2);
    if (yb.x0 < mb.x0 || yb.x1 > mb.x1 || yb.z0 < mb.z0 || yb.z1 > mb.z1) bad.push('the yacht is outside the marina block');
    const sp = CITY.SPAWN, ex = CITY.EXIT;
    if (sp[2] < CITY.BEACH_Z || sp[2] > CITY.SEA_Z) bad.push('spawn is not on the beach');
    if (ex[2] < CITY.PIER.z0 || ex[2] > CITY.PIER.z1 || Math.abs(ex[0] - CITY.PIER.x) > CITY.PIER.w / 2) bad.push('the exit is not on the pier');
    if (CITY.BLV[1] > CITY.BEACH_Z) bad.push('boulevard overlaps the beach');
    if (CITY.PIER.z1 + 2 > CITY.Z1) bad.push('the pier leaves the map');
    return bad;
}
export const cityChunks = () => { const o = []; for (let j = 0; j < CITY.ROWS; j++) for (let i = 0; i < CITY.COLS; i++) o.push({ id: chunkId(i, j), i: i, j: j, center: chunkCenter(i, j), role: ROLES[j][i] }); return o; };

// Kryjówki w zaułkach (śmietnik pośrodku zaułka kwartału) i punkty odrodzenia po złapaniu (kryjówki bezpieczne): jedna na każdy kwartał z pustym środkiem zaułka
export const alleyCenter = (i, j) => { const b = blockRect(i, j); return [(b.x0 + b.x1) / 2, (b.z0 + b.z1) / 2]; };
export function hideSpots() { const out = []; for (let j = 0; j < CITY.ROWS; j++) for (let i = 0; i < CITY.COLS; i++) { const role = ROLES[j][i]; if (role === 'plaza' || role === 'marina') continue; const c = alleyCenter(i, j); out.push({ id: 'h' + i + j, x: c[0], z: c[1] + 3.2 }); } return out; }
export const SAFEHOUSES = [{ id: 'S1', x: -38, z: -39 }, { id: 'S2', x: 38, z: -1 }, { id: 'S3', x: 0, z: -39 }, { id: 'S4', x: -38, z: 40 }, { id: 'S5', x: 38, z: 40 }, { id: 'S6', x: 0, z: 40 }];   // rogi ulic: bezpieczne punkty odrodzenia po złapaniu
// Linie szybkiego transportu (zjazd na linie, ta sama szyna co tyrolka w aneksie: railStep w core/ziplogic.js)
export const RAILS = [
    { id: 'casino', A: [12, 47.4, -59], B: [12, 4.6, 40], SPEED: 6.5, HANG: 0.8, COOLDOWN: 3, MAX_DT: 0.1 },
    { id: 'bank', A: [-26, 39.4, -59], B: [-26, 4.6, 40], SPEED: 6.5, HANG: 0.8, COOLDOWN: 3, MAX_DT: 0.1 },
    { id: 'crane', A: [-19, 30.9, 18], B: [-19, 4.6, 40], SPEED: 6.5, HANG: 0.8, COOLDOWN: 3, MAX_DT: 0.1, crane: true }   // z wierzchołka dźwigu na placu
];
export const CRANE = { x: -19, z: 18, w: 3, h: 30 };   // wspinaczkowy dźwig w środku placu (kwartał 1,2): lita wieża 3 x 3 m, chwytna jak rusztowanie
export function railProblems() {
    const bad = [], B = buildCity(1337);
    for (const r of RAILS) {
        const len = Math.hypot(r.B[0] - r.A[0], r.B[1] - r.A[1], r.B[2] - r.A[2]);
        if (r.SPEED > 7) bad.push(r.id + ' is too fast'); if (len > 140) bad.push(r.id + ' is too long'); if (r.A[1] - r.B[1] < 20) bad.push(r.id + ' does not descend enough');
        if (r.B[1] - r.HANG < 1.2 || r.B[1] > 6) bad.push(r.id + ' ends at a bad height');
        if (r.B[2] < CITY.BLV[0] || r.B[2] > CITY.BLV[1]) bad.push(r.id + ' does not land on the boulevard');
        const top = r.crane ? { h: CRANE.h } : B.filter(b => r.A[0] >= b.x0 - 3 && r.A[0] <= b.x1 + 3 && r.A[2] >= b.z0 - 4 && r.A[2] <= b.z1 + 4).sort((a, c) => c.h - a.h)[0];
        if (!top || r.A[1] < top.h + 0.8 || r.A[1] > top.h + 2.5) bad.push(r.id + ' does not start near a roof');
        if (r.A[0] < CITY.X0 || r.A[0] > CITY.X1 || r.B[0] < CITY.X0 || r.B[0] > CITY.X1) bad.push(r.id + ' leaves the map');
    }
    return bad;
}
