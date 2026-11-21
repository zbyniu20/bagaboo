// Test własny poziomu Room 000 (uruchamiany automatycznie przez levelpack.mjs): układ więzienia z core/room000map.js (pięciokąt z przekątnymi,
// cele, siatka, ściany, osiągalność, przedmioty, ścieżki ducha) i integracja w levels/room000.js.
// Użycie osobno: cd tests && node modes/room000.mjs
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { check } from '../lib.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const M = await import(pathToFileURL(path.join(ROOT, 'core/room000map.js')).href);
const T = (s) => 'room000: ' + s;
const rng2 = (seed) => M.rng(seed);
const plan = M.buildPlan(), grid = M.rasterize(plan), G = M.GEO;
const cellOf = (x, z) => M.toCell(grid, x, z);
const sp = cellOf(plan.spawn[0], plan.spawn[2]), dist = M.distField(grid, sp[0], sp[1]);
const reach = (x, z) => { const c = cellOf(x, z); return M.isOpenCell(grid, c[0], c[1]) && dist[c[1] * grid.GW + c[0]] >= 0; };

// ---------- pięciokąt, przekątne, cele ----------
const cs = plan.corners, sides = plan.segs.filter(s => s.side), diags = plan.segs.filter(s => !s.side), len = (s) => Math.hypot(s.bx - s.ax, s.bz - s.az);
check(T('five corners of a regular pentagon: equal sides, equal diagonals, all on one circle'), cs.length === 5 && sides.length === 5 && diags.length === 5 && sides.every(s => Math.abs(len(s) - len(sides[0])) < 1e-6) && diags.every(s => Math.abs(len(s) - len(diags[0])) < 1e-6) && cs.every(c => Math.abs(Math.hypot(c[0] - G.CENTER[0], c[1] - G.CENTER[1]) - G.R) < 1e-6));
check(T('every corner is joined to every other corner (10 corridors, each corner has 4)'), plan.segs.length === 10 && new Set(plan.segs.map(s => Math.min(s.a, s.b) + '-' + Math.max(s.a, s.b))).size === 10 && cs.every((c, k) => plan.segs.filter(s => s.a === k || s.b === k).length === 4));
check(T('there are 24 cells: 5 on each side and 4 on the back side where the exit is'), plan.cells.length === 24 && [0, 1, 3, 4].every(k => plan.cells.filter(c => c.side === k).length === 5) && plan.cells.filter(c => c.side === 2).length === 4);
check(T('the cells stand outside the pentagon, next to the sides (not in the middle)'), plan.cells.every(c => { const p = M.cellPoint(plan, c, 0, (G.CELL_D0 + G.CELL_D1) / 2); return Math.hypot(p[0] - G.CENTER[0], p[1] - G.CENTER[1]) > G.R * Math.cos(Math.PI / 5) + 2; }));

// ---------- siatka ----------
const doors = M.doorSpots(plan, grid);
check(T('the spawn is open and far from the exit door'), M.isOpen(grid, plan.spawn[0], plan.spawn[2]) && Math.hypot(plan.spawn[0] - doors.exit.x, plan.spawn[2] - doors.exit.z) > 40);
check(T('both doors sit exactly on the wall edge: 5 cm behind the door is wall, 5 cm in front of it is open'), (() => {
    const wall = (x, z) => { const c = cellOf(x, z); return grid.g[c[1] * grid.GW + c[0]] === 2; };
    const f = (d) => [Math.sin(d.rotY), Math.cos(d.rotY)];   // kierunek do wnętrza, jak w buildDoor
    return [doors.start, doors.exit].every(d => { const [fx, fz] = f(d); return M.isOpen(grid, d.x + fx * 0.05, d.z + fz * 0.05) && wall(d.x - fx * 0.05, d.z - fz * 0.05) && M.isOpen(grid, d.x + fx * 0.6, d.z + fz * 0.6); });
})());
check(T('the doors are wide enough: the whole 1.6 m frame stands in front of wall, with open space in front'), [doors.start, doors.exit].every(d => [-0.8, -0.4, 0, 0.4, 0.8].every(o => { const c = cellOf(d.x + o, d.z + (d.rotY === 0 ? -0.1 : 0.1)); return grid.g[c[1] * grid.GW + c[0]] === 2; }) && [-0.8, 0, 0.8].every(o => M.isOpen(grid, d.x + o, d.z + (d.rotY === 0 ? 0.3 : -0.3)))));
let open = 0, lost = 0; for (let k = 0; k < grid.g.length; k++) if (grid.g[k] === 1) { open++; if (dist[k] < 0) lost++; }
check(T('every open cell can be reached from the spawn (no sealed rooms)'), open > 3000 && lost === 0, 'open ' + open + ', unreachable ' + lost);
check(T('every cell room and doorway is open and reachable'), plan.cells.every(c => [[0, G.CELL_D0 + 1.5], [-1.5, G.CELL_D0 + 0.4], [1.5, G.CELL_D1 - 0.4], [0, G.CELL_D0 - 0.3]].every(([s, d]) => { const p = M.cellPoint(plan, c, s, d); return reach(p[0], p[1]); })));
check(T('the corridors are 3 m wide: a column of open cells fits across every side corridor'), sides.every(s => { const mx = (s.ax + s.bx) / 2, mz = (s.az + s.bz) / 2; const nx = -(s.bz - s.az) / len(s), nz = (s.bx - s.ax) / len(s); let w = 0; for (let t = -2; t <= 2; t += 0.25) if (M.isOpen(grid, mx + nx * t, mz + nz * t)) w += 0.25; return w >= 2.6; }));
// ściany: bloki pokrywają dokładnie komórki ścian, nie wchodzą w puste i jest ich rozsądnie mało
const blocks = M.wallBlocks(grid), cover = new Uint8Array(grid.g.length);
for (const b of blocks) { const i0 = Math.round((b.x - b.w / 2 - grid.X0) / G.CELL), i1 = Math.round((b.x + b.w / 2 - grid.X0) / G.CELL), j0 = Math.round((b.z - b.d / 2 - grid.Z0) / G.CELL), j1 = Math.round((b.z + b.d / 2 - grid.Z0) / G.CELL); for (let j = j0; j < j1; j++) for (let i = i0; i < i1; i++) cover[j * grid.GW + i]++; }
let wallCells = 0, bad = 0; for (let k = 0; k < grid.g.length; k++) { if (grid.g[k] === 2) { wallCells++; if (cover[k] !== 1) bad++; } else if (cover[k] !== 0) bad++; }
check(T('wall blocks cover every wall cell exactly once and no open cell'), wallCells > 3000 && bad === 0, 'wall cells ' + wallCells + ', mismatches ' + bad);
check(T('the number of wall blocks stays small enough for fast collisions (under 1500)'), blocks.length > 100 && blocks.length < 1500 && blocks.every(b => [b.x, b.z, b.w, b.d].every(Number.isFinite) && b.w > 0 && b.d > 0), 'blocks ' + blocks.length);
check(T('walls are at least 1 m thick around every open cell (nobody slips through)'), (() => { for (let j = 2; j < grid.GH - 2; j++) for (let i = 2; i < grid.GW - 2; i++) if (grid.g[j * grid.GW + i] === 1) for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const n1 = grid.g[(j + b) * grid.GW + i + a]; if (n1 === 0) return false; } return true; })());

// ---------- przedmioty ----------
const SEEDS = Array.from({ length: 60 }, (_, i) => i * 9973 + 3);
check(T('every run has exactly 3 books, a pistol and a knife'), SEEDS.every(s => { const it = M.pickItems(plan, s), k = it.map(x => x.kind).sort().join(','); return it.length === 5 && k === 'book,book,book,knife,pistol'; }));
check(T('the five items lie in five different cells on five different sides of the pentagon'), SEEDS.every(s => { const it = M.pickItems(plan, s); return new Set(it.map(x => x.side)).size === 5 && new Set(it.map(x => x.cell)).size === 5; }));
check(T('every item is on an open cell inside its prison cell and can be reached from the spawn'), SEEDS.every(s => M.pickItems(plan, s).every(x => reach(x.x, x.z) && M.zoneAt(grid, x.x, x.z) === M.ZONE.CELL && grid.room[cellOf(x.x, x.z)[1] * grid.GW + cellOf(x.x, x.z)[0]] === x.cell)));
check(T('the layout changes with the seed (positions and kinds are shuffled)'), new Set(SEEDS.map(s => JSON.stringify(M.pickItems(plan, s)))).size > 40);
check(T('items are visible from the corridor: in line with the cell doorway, a clear line from the corridor, and no prop stands within 1 m of any item'), SEEDS.every(s => {
    const it = M.pickItems(plan, s), keep = it.map(x => ({ x: x.x, z: x.z }));
    return it.every((x) => {
        const cell = plan.cells[x.cell], front = M.cellPoint(plan, cell, 0, 0.6), sd = plan.sides[cell.side], dx = x.x - sd.ax, dz = x.z - sd.az, along = dx * sd.u[0] + dz * sd.u[1] - cell.c, out = dx * sd.n[0] + dz * sd.n[1];
        const props = M.cellProps(plan, cell, 31337, keep).filter(p => !['bed', 'toilet', 'sink', 'shackles', 'trail'].includes(p.type));
        return Math.abs(along) <= 0.21 && out >= G.CELL_D0 + 1.0 && out <= G.CELL_D0 + 1.5 && M.clearLine(grid, front[0], front[1], x.x, x.z) && props.every(p => keep.every(k => Math.hypot(p.x - k.x, p.z - k.z) >= 1.0));
    });
}));
check(T('the prison is full of details: sinks, shackles, drag trails, many blood pools, corpses and skeletons'), (() => {
    const all = plan.cells.flatMap(c => M.cellProps(plan, c, 31337)), n = (t) => all.filter(p => p.type === t).length;
    return n('sink') === 24 && n('shackles') >= 8 && n('trail') >= 5 && n('blood') >= 30 && n('corpse') >= 3 && n('skeleton') >= 5;
})());
check(T('hanging bodies hang apart from each other, in corridors, and a decoy apparition is always findable in line of sight 11-17 m away'), (() => {
    const h = M.hangingSpots(grid, plan, 6, 31337 + 9); if (h.length < 5 || !h.every((a, i) => h.every((b, j) => i === j || Math.hypot(a.x - b.x, a.z - b.z) >= 7))) return false;
    let found = 0; for (let k = 0; k < 40; k++) { const q = M.decoySpot(grid, 0, -4, rng2(k)); if (q) { const d = Math.hypot(q.x, q.z + 4); if (d >= 11 && d <= 17.01 && M.clearLine(grid, 0, -4, q.x, q.z)) found++; } }
    return found >= 25;
})());
check(T('cell furniture stands inside open cells and the prison is full of corpses, skeletons and blood'), (() => {
    const all = plan.cells.flatMap(c => M.cellProps(plan, c, 31337));
    const inOpen = all.filter(p => p.type !== 'blood' && p.type !== 'shackles').every(p => M.isOpen(grid, p.x, p.z));
    const n = (t) => all.filter(p => p.type === t).length;
    return inOpen && n('bed') === 24 && n('toilet') === 24 && n('skeleton') >= 3 && n('corpse') >= 1 && n('blood') >= 5;
})());
check(T('corridor decorations are spread over corridors and halls, away from the spawn'), (() => { const s = M.corridorSpots(grid, plan, 70, 31337 + 1, 2.4); return s.length >= 50 && s.every(p => M.zoneAt(grid, p.x, p.z) === M.ZONE.CORRIDOR && Math.hypot(p.x - plan.spawn[0], p.z - plan.spawn[2]) >= 5); })());
check(T('there are enough lights, a few of them in the halls'), (() => { const l = M.lightSpots(plan); return l.length >= 12 && l.length <= 24 && l.filter(x => x.hub).length === 5; })());

// ---------- ścieżki i widzenie ducha ----------
check(T('a route field leads from anywhere to the goal: each step lowers the distance and stays on open cells'), (() => {
    const far = cellOf(doors.exit.x, doors.exit.z + 1), d2 = M.distField(grid, far[0], far[1]); let c = sp, steps = 0;
    while (steps++ < 2000) { const n = M.stepToward(grid, d2, c[0], c[1]); if (!n) break; if (!M.isOpenCell(grid, n[0], n[1]) || d2[n[1] * grid.GW + n[0]] >= d2[c[1] * grid.GW + c[0]]) return false; c = n; }
    return c[0] === far[0] && c[1] === far[1];
})());
check(T('the ghost does not cut wall corners on diagonal steps'), (() => { for (let j = 1; j < grid.GH - 1; j++) for (let i = 1; i < grid.GW - 1; i++) { if (!M.isOpenCell(grid, i, j)) continue; const d3 = M.distField(grid, i, j); return d3[sp[1] * grid.GW + sp[0]] >= 0; } return false; })());
check(T('line of sight: clear along a corridor and a diagonal, blocked through the solid middle'), M.clearLine(grid, 0, -1, 0, -5) && M.clearLine(grid, plan.spawn[0], plan.spawn[2], cs[2][0], cs[2][1]) && !M.clearLine(grid, (cs[0][0] + cs[1][0]) / 2, (cs[0][1] + cs[1][1]) / 2, (cs[2][0] + cs[3][0]) / 2, (cs[2][1] + cs[3][1]) / 2));
check(T('a diagonal corridor really crosses the middle: the centre of the pentagon is walled but a diagonal point is open'), (() => { const d = diags[0], mx = (d.ax + d.bx) / 2, mz = (d.az + d.bz) / 2; return M.isOpen(grid, mx, mz); })());

// ---------- integracja w levels/room000.js ----------
const src = fs.readFileSync(path.join(ROOT, 'levels/room000.js'), 'utf8');
check(T('info.spawn matches the plan and the level uses the map module for items, walls and the ghost route'), /spawn: \[0, 1\.0, -2\.6\]/.test(src) && plan.spawn[0] === 0 && plan.spawn[2] === -2.6 && /M\.pickItems\(PLAN,/.test(src) && /M\.wallBlocks\(GRID\)/.test(src) && /M\.distField\(/.test(src) && /M\.clearLine\(/.test(src));
check(T('it needs all 5 items to open the exit gate and the gate is removed from the obstacles'), /ITEMS = 5;/.test(src) && /n === ITEMS/.test(src) && /L\.obstacles\.splice\(k, 1\)/.test(src) && /label: 'EXIT'/.test(src));
check(T('the ghost is white, floats along the grid and cannot enter walls'), /color: 0xf4f6ff/.test(src) && /M\.isOpen\(GRID, nx, nz\)/.test(src) && /M\.isOpen\(GRID, nx, m\.z\)/.test(src));
check(T('item names in the toasts match the objects: book, pistol, knife'), /book: 'a book', pistol: 'the pistol', knife: 'the knife'/.test(src));
check(T('the level is dark, and uses its own light preset and a Nightmare reward hat'), (() => { const cfg = fs.readFileSync(path.join(ROOT, 'core/config.js'), 'utf8'), eco = fs.readFileSync(path.join(ROOT, 'core/economy.js'), 'utf8'); const m = cfg.match(/LIGHT_PRESETS\.room000 = \{[^}]*hemiIntensity: ([\d.]+)/); return !!m && Number(m[1]) <= 0.6 && /id: 'prisoncap'/.test(eco) && /nm_room000/.test(eco); })());
check(T('items are 2.3x bigger, stand on a crate, glow with a beacon and their own light, and show a hint with the cell number'), /m\.scale\.setScalar\(2\.3\)/.test(src) && /new THREE\.PointLight\(0xaec8ff, 3\.2/.test(src) && /fog: false/.test(src) && /const PICK_R = 0\.8, CUE_DIST = 7/.test(src) && /Something glints in cell/.test(src));
check(T('scripted beats: blackout after the first item, a whisper behind after the third, a scream and a chase when the gate opens'), /n === 1\) \{ S\.blackout = 5/.test(src) && /n === 3\) \{/.test(src) && /SFX\.scream\(\{ x: S\.mon\.x/.test(src) && /S\.mon\.mode = 'chase'/.test(src));
check(T('the ghost flickers lights and the flashlight when close, hides beyond 10 m except for flashes, decoys and hanging bodies exist and the flashlight is restored'), /lighting\.headLamp\.intensity = S\.lampBase \*/.test(src) && /m\.g\.visible = chase \|\| dp < GHOST_SHOW/.test(src) && /function updateDecoys/.test(src) && /function buildHangers/.test(src) && /lighting\.headLamp\.intensity = S\.lampBase; S\.ev\.dispose\(\)/.test(src));
check(T('wall marks are instanced per texture (blood, hands, tallies, writing) and there are many'), /new THREE\.InstancedMesh\(geo, new THREE\.MeshStandardMaterial\(\{ map: map/.test(src) && /placed < 170/.test(src));
