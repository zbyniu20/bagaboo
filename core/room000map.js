// ==========================================
// ROOM 000: UKŁAD OPUSZCZONEGO WIĘZIENIA (czysty generator, bez THREE, DOM i sieci; testy: tests/modes/room000.mjs).
// Pięć narożników pięciokąta foremnego i KAŻDY z KAŻDYM połączony korytarzem: pięć boków i pięć przekątnych (pentagram), więc z każdego narożnika
// odchodzą cztery korytarze. Wzdłuż boków, od zewnątrz, stoją cele więzienne (po pięć na bok, na tylnym boku cztery, bo w środku jest wyjście).
// Wszystko leży na siatce 0,5 m (raster): komórka jest pusta (korytarz, sala narożna, cela, drzwi celi) albo ścianą (pas 1 m wokół pustych komórek).
// Ściany levels/room000.js rysuje jako instancje z osiowymi kolizjami, a duch chodzi po tej samej siatce (BFS, linia widzenia).
// Plik nie ma importów: działa w przeglądarce i w Node.
// ==========================================
export const GEO = {
    CELL: 0.5,            // rozdzielczość siatki (m)
    R: 27,                // promień okręgu opisanego na pięciokącie (m)
    CENTER: [0, -33],     // środek pięciokąta (x, z); narożnik 0 jest od strony wejścia (+z)
    CORR_W: 3.0,          // szerokość korytarza
    HUB_R: 3.2,           // promień okrągłej sali w narożniku
    WALL_N: 2,            // grubość ściany w komórkach (2 = 1 m)
    H: 3.4,               // wysokość korytarzy
    CELLS_PER_SIDE: 5, CELL_W: 4.2, CELL_PITCH: 4.8, CELL_D0: 2.5, CELL_D1: 6.1,   // cela: szerokość wzdłuż boku, odstęp, głębokość od osi korytarza (od, do)
    DOOR_W: 1.8, ITEM_COUNT: 5
};
export const ITEM_KINDS = ['book', 'book', 'book', 'pistol', 'knife'];   // 3 książki, pistolet i nóż
export const ZONE = { NONE: 0, CORRIDOR: 1, CELL: 2, DOORWAY: 3 };

export function rng(seed) {   // mulberry32
    let a = (Number.isFinite(seed) ? Math.floor(seed) : 1) >>> 0;
    return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

// ---------- PLAN: narożniki, korytarze, cele, wejście i wyjście ----------
export function corners() {
    const out = [];
    for (let k = 0; k < 5; k++) { const a = k * 2 * Math.PI / 5; out.push([GEO.CENTER[0] + GEO.R * Math.sin(a), GEO.CENTER[1] + GEO.R * Math.cos(a)]); }
    return out;
}
export function buildPlan() {
    const cs = corners(), segs = [], sides = [], cells = [];
    for (let i = 0; i < 5; i++) for (let j = i + 1; j < 5; j++) segs.push({ a: i, b: j, ax: cs[i][0], az: cs[i][1], bx: cs[j][0], bz: cs[j][1], side: j - i === 1 || j - i === 4 });
    for (let k = 0; k < 5; k++) {
        const A = cs[k], B = cs[(k + 1) % 5], len = Math.hypot(B[0] - A[0], B[1] - A[1]), u = [(B[0] - A[0]) / len, (B[1] - A[1]) / len];
        let n = [-u[1], u[0]]; const mx = (A[0] + B[0]) / 2 - GEO.CENTER[0], mz = (A[1] + B[1]) / 2 - GEO.CENTER[1];
        if (n[0] * mx + n[1] * mz < 0) n = [-n[0], -n[1]];   // n: na zewnątrz pięciokąta
        sides.push({ k: k, ax: A[0], az: A[1], len: len, u: u, n: n, exit: k === 2 });
    }
    for (const sd of sides) for (let i = 0; i < GEO.CELLS_PER_SIDE; i++) {
        const c = GEO.HUB_R + 0.8 + GEO.CELL_W / 2 + i * GEO.CELL_PITCH;
        if (sd.exit && Math.abs(c - sd.len / 2) < GEO.CELL_W / 2 + 0.3) continue;   // środek tylnego boku zajmuje wyjście
        cells.push({ id: cells.length, side: sd.k, i: i, c: c });
    }
    const M = [(cs[2][0] + cs[3][0]) / 2, (cs[2][1] + cs[3][1]) / 2];
    const startRect = { x0: -GEO.CORR_W / 2, x1: GEO.CORR_W / 2, z0: cs[0][1], z1: 1.8 };
    const exitRect = { x0: M[0] - GEO.CORR_W / 2, x1: M[0] + GEO.CORR_W / 2, z0: M[1] - 4.4, z1: M[1] };
    return {
        corners: cs, segs: segs, sides: sides, cells: cells, startRect: startRect, exitRect: exitRect,
        spawn: [0, 1.0, -2.6], startDoor: { x: 0, z: 2.0, rotY: Math.PI }, exitDoor: { x: M[0], z: exitRect.z0 - 0.2, rotY: 0 }, gateZ: M[1] - 2.8
    };
}
// Punkt w układzie boku (s wzdłuż boku od narożnika k, d na zewnątrz od osi korytarza) na współrzędne świata i z powrotem
export const sidePoint = (sd, s, d) => [sd.ax + sd.u[0] * s + sd.n[0] * d, sd.az + sd.u[1] * s + sd.n[1] * d];
export const cellPoint = (plan, cell, s, d) => sidePoint(plan.sides[cell.side], cell.c + s, d);   // s względem środka celi
export const cellYaw = (plan, cell) => { const u = plan.sides[cell.side].u; return Math.atan2(-u[1], u[0]); };   // obrót wokół Y, który ustawia lokalną oś X wzdłuż boku

// ---------- RASTER ----------
const segDist = (px, pz, s) => {
    const dx = s.bx - s.ax, dz = s.bz - s.az, l2 = dx * dx + dz * dz, t = Math.max(0, Math.min(1, ((px - s.ax) * dx + (pz - s.az) * dz) / l2));
    return Math.hypot(px - (s.ax + dx * t), pz - (s.az + dz * t));
};
export function rasterize(plan) {
    const G = GEO.CELL, rects = [plan.startRect, plan.exitRect];
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    const ext = (x, z) => { if (x < minX) minX = x; if (x > maxX) maxX = x; if (z < minZ) minZ = z; if (z > maxZ) maxZ = z; };
    for (const c of plan.corners) { ext(c[0] - GEO.HUB_R, c[1] - GEO.HUB_R); ext(c[0] + GEO.HUB_R, c[1] + GEO.HUB_R); }
    for (const r of rects) { ext(r.x0, r.z0); ext(r.x1, r.z1); }
    for (const cell of plan.cells) for (const s of [-GEO.CELL_W / 2, GEO.CELL_W / 2]) for (const d of [GEO.CELL_D0, GEO.CELL_D1]) { const p = cellPoint(plan, cell, s, d); ext(p[0], p[1]); }
    const pad = (GEO.WALL_N + 2) * G, X0 = Math.floor((minX - pad) / G) * G, Z0 = Math.floor((minZ - pad) / G) * G;
    const GW = Math.ceil((maxX + pad - X0) / G), GH = Math.ceil((maxZ + pad - Z0) / G);
    const g = new Uint8Array(GW * GH), zone = new Uint8Array(GW * GH), room = new Int16Array(GW * GH).fill(-1);
    const hw = GEO.CORR_W / 2;
    for (let j = 0; j < GH; j++) for (let i = 0; i < GW; i++) {
        const px = X0 + (i + 0.5) * G, pz = Z0 + (j + 0.5) * G, k = j * GW + i;
        let z = 0, rm = -1;
        for (const s of plan.segs) if (segDist(px, pz, s) <= hw) { z = ZONE.CORRIDOR; break; }
        if (!z) for (const c of plan.corners) if (Math.hypot(px - c[0], pz - c[1]) <= GEO.HUB_R) { z = ZONE.CORRIDOR; break; }
        if (!z) for (const r of rects) if (px >= r.x0 && px <= r.x1 && pz >= r.z0 && pz <= r.z1) { z = ZONE.CORRIDOR; break; }
        if (!z) for (const cell of plan.cells) {
            const sd = plan.sides[cell.side], dx = px - sd.ax, dz = pz - sd.az, s = dx * sd.u[0] + dz * sd.u[1] - cell.c, d = dx * sd.n[0] + dz * sd.n[1];
            if (Math.abs(s) <= GEO.CELL_W / 2 && d >= GEO.CELL_D0 && d <= GEO.CELL_D1) { z = ZONE.CELL; rm = cell.id; break; }
            if (Math.abs(s) <= GEO.DOOR_W / 2 && d >= hw - 0.5 && d < GEO.CELL_D0) { z = ZONE.DOORWAY; rm = cell.id; break; }
        }
        if (z) { g[k] = 1; zone[k] = z; room[k] = rm; }
    }
    // ściana: pas WALL_N komórek wokół pustych komórek
    const N = GEO.WALL_N, w = new Uint8Array(GW * GH);
    for (let j = 0; j < GH; j++) for (let i = 0; i < GW; i++) if (g[j * GW + i] === 1)
        for (let dj = -N; dj <= N; dj++) for (let di = -N; di <= N; di++) { const a = i + di, b = j + dj; if (a >= 0 && b >= 0 && a < GW && b < GH && g[b * GW + a] === 0) w[b * GW + a] = 1; }
    for (let k = 0; k < g.length; k++) if (w[k]) g[k] = 2;
    return { GW: GW, GH: GH, X0: X0, Z0: Z0, G: G, g: g, zone: zone, room: room };
}
export const cellX = (grid, i) => grid.X0 + (i + 0.5) * grid.G;
export const cellZ = (grid, j) => grid.Z0 + (j + 0.5) * grid.G;
export const toCell = (grid, x, z) => [Math.floor((x - grid.X0) / grid.G), Math.floor((z - grid.Z0) / grid.G)];
export const isOpenCell = (grid, i, j) => i >= 0 && j >= 0 && i < grid.GW && j < grid.GH && grid.g[j * grid.GW + i] === 1;
export const isOpen = (grid, x, z) => { const c = toCell(grid, x, z); return isOpenCell(grid, c[0], c[1]); };
export const zoneAt = (grid, x, z) => { const c = toCell(grid, x, z); return c[0] >= 0 && c[1] >= 0 && c[0] < grid.GW && c[1] < grid.GH ? grid.zone[c[1] * grid.GW + c[0]] : 0; };
export const openCount = (grid) => { let n = 0; for (let k = 0; k < grid.g.length; k++) if (grid.g[k] === 1) n++; return n; };

// Ściany jako prostokąty: wiersze komórek scalane w pionie, gdy mają ten sam zasięg (mało bloków = szybkie kolizje i jedno wywołanie rysowania)
export function wallBlocks(grid) {
    const out = [], { GW, GH, G } = grid; let active = new Map();
    const emit = (i0, i1, j0, j1) => out.push({ x: grid.X0 + (i0 + i1) / 2 * G, z: grid.Z0 + (j0 + j1) / 2 * G, w: (i1 - i0) * G, d: (j1 - j0) * G });
    for (let j = 0; j <= GH; j++) {
        const next = new Map();
        if (j < GH) for (let i = 0; i < GW;) {
            if (grid.g[j * GW + i] !== 2) { i++; continue; }
            let e = i; while (e < GW && grid.g[j * GW + e] === 2) e++;
            const key = i + ':' + e; next.set(key, active.has(key) ? active.get(key) : j); i = e;
        }
        for (const [key, j0] of active) if (!next.has(key)) { const [a, b] = key.split(':').map(Number); emit(a, b, j0, j); }
        active = next;
    }
    return out;
}

// ---------- ŚCIEŻKI I WIDZENIE (na siatce) ----------
const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
// Odległości (w krokach) z komórki (ti, tj) do każdej pustej komórki; -1 gdzie się nie da dojść. Skosy tylko bez ścinania rogów ścian.
export function distField(grid, ti, tj) {
    const { GW, GH } = grid, dist = new Int16Array(GW * GH).fill(-1), q = new Int32Array(GW * GH);
    if (!isOpenCell(grid, ti, tj)) return dist;
    let h = 0, t = 0; dist[tj * GW + ti] = 0; q[t++] = tj * GW + ti;
    while (h < t) {
        const k = q[h++], i = k % GW, j = (k - i) / GW, d = dist[k];
        for (const [di, dj] of DIRS) {
            const a = i + di, b = j + dj; if (!isOpenCell(grid, a, b) || dist[b * GW + a] >= 0) continue;
            if (di && dj && (!isOpenCell(grid, i + di, j) || !isOpenCell(grid, i, j + dj))) continue;
            dist[b * GW + a] = d + 1; q[t++] = b * GW + a;
        }
    }
    return dist;
}
// Następna komórka w stronę celu (najniższa odległość wśród sąsiadów); null, gdy już na miejscu albo bez drogi
export function stepToward(grid, dist, i, j) {
    const here = dist[j * grid.GW + i]; if (here <= 0) return null;
    let best = null, bd = here;
    for (const [di, dj] of DIRS) {
        const a = i + di, b = j + dj; if (!isOpenCell(grid, a, b)) continue;
        if (di && dj && (!isOpenCell(grid, i + di, j) || !isOpenCell(grid, i, j + dj))) continue;
        const d = dist[b * grid.GW + a]; if (d >= 0 && d < bd) { bd = d; best = [a, b]; }
    }
    return best;
}
// Linia widzenia: czy między dwoma punktami nie ma ściany (krok 0,25 m)
export function clearLine(grid, x0, z0, x1, z1) {
    const d = Math.hypot(x1 - x0, z1 - z0), n = Math.max(1, Math.ceil(d / 0.25));
    for (let s = 1; s < n; s++) { const t = s / n; if (!isOpen(grid, x0 + (x1 - x0) * t, z0 + (z1 - z0) * t)) return false; }
    return true;
}

// ---------- PRZEDMIOTY, DEKORACJE, ŚWIATŁA ----------
// Pięć przedmiotów (3 książki, pistolet, nóż) w pięciu celach na pięciu RÓŻNYCH bokach pięciokąta; kolejność i miejsce losuje seed
export function pickItems(plan, seed) {
    const R = rng(seed), kinds = ITEM_KINDS.slice();
    for (let i = kinds.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [kinds[i], kinds[j]] = [kinds[j], kinds[i]]; }
    const sides = [0, 1, 2, 3, 4], items = [];
    for (let i = sides.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [sides[i], sides[j]] = [sides[j], sides[i]]; }
    sides.forEach((k, n) => {
        const list = plan.cells.filter(c => c.side === k), cell = list[Math.floor(R() * list.length) % list.length];
        const p = cellPoint(plan, cell, (R() - 0.5) * 1.6, GEO.CELL_D0 + 0.9 + R() * 1.1);
        items.push({ kind: kinds[n], x: p[0], z: p[1], cell: cell.id, side: k });
    });
    return items;
}
// Wyposażenie celi: łóżko pod ścianą, sedes, przewrócony stolik i krzesło, czasem szkielet, zwłoki albo kałuża krwi (lokalne s, d -> świat)
export function cellProps(plan, cell, seed) {
    const R = rng(seed * 7919 + cell.id * 104729 + 13), yaw = cellYaw(plan, cell), out = [];
    const at = (type, s, d, extra) => { const p = cellPoint(plan, cell, s, d); out.push(Object.assign({ type: type, x: p[0], z: p[1], rotY: yaw }, extra || {})); };
    const flip = R() < 0.5 ? -1 : 1;
    at('bed', -1.1 * flip, GEO.CELL_D1 - 0.55, { tipped: R() < 0.3 });
    at('toilet', 1.55 * flip, GEO.CELL_D1 - 0.4);
    if (R() < 0.7) at('table', 1.2 * flip, GEO.CELL_D0 + 1.4 + R() * 0.5, { rotY: yaw + (R() - 0.5) * 2.4, broken: true });
    if (R() < 0.6) at('chair', -0.4 * flip + (R() - 0.5), GEO.CELL_D0 + 1.1 + R() * 1.2, { rotY: R() * 6.28, broken: true });
    if (R() < 0.38) at('skeleton', (R() - 0.5) * 2.2, GEO.CELL_D0 + 0.9 + R() * 1.4, { rotY: R() * 6.28 });
    if (R() < 0.2) at('corpse', (R() - 0.5) * 2.0, GEO.CELL_D0 + 1.0 + R() * 1.2, { rotY: R() * 6.28 });
    if (R() < 0.55) at('blood', (R() - 0.5) * 2.4, GEO.CELL_D0 + 0.6 + R() * 2.0, { r: 0.4 + R() * 0.7 });
    return out;
}
// Losowe miejsca w korytarzach i salach narożnych (puste komórki strefy korytarza, z dala od startu); mindist: odstęp od siebie
export function corridorSpots(grid, plan, count, seed, mindist) {
    const R = rng(seed), out = [], spawn = plan.spawn, tries = count * 60;
    for (let t = 0; t < tries && out.length < count; t++) {
        const i = Math.floor(R() * grid.GW), j = Math.floor(R() * grid.GH);
        if (!isOpenCell(grid, i, j) || grid.zone[j * grid.GW + i] !== ZONE.CORRIDOR) continue;
        const x = cellX(grid, i), z = cellZ(grid, j);
        if (Math.hypot(x - spawn[0], z - spawn[2]) < 5 || out.some(o => Math.hypot(o.x - x, o.z - z) < (mindist || 2))) continue;
        out.push({ x: x, z: z, rotY: R() * 6.28, seed: Math.floor(R() * 1e6) });
    }
    return out;
}
// Żarówki: pięć sal narożnych, środki przekątnych i boków (słabe, migoczące), przy starcie i wyjściu
export function lightSpots(plan) {
    const out = [];
    plan.corners.forEach((c, k) => out.push({ x: c[0], z: c[1], hub: true, k: k }));
    for (const s of plan.segs) { const x = (s.ax + s.bx) / 2, z = (s.az + s.bz) / 2; if (!out.some(o => Math.hypot(o.x - x, o.z - z) < 6)) out.push({ x: x, z: z }); }
    out.push({ x: 0, z: -1.2 }, { x: plan.exitRect.x0 + GEO.CORR_W / 2, z: plan.exitRect.z0 + 1.6, exit: true });
    return out;
}
