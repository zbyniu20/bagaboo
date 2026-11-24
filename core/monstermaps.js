// ==========================================
// MAPY DLA "BECOME THE MONSTER": czysty generator (bez THREE, DOM i sieci), testowany w Node (tests/modes/monster.mjs).
// Jedna mapa = jedna wartość MAPS (nazwa, opis, rozmiar). generateMap(id, seed) zwraca deterministyczny układ z listy prostopadłościanów
// (środek x, y, z oraz wymiary w, h, d, kolor c i rodzaj powierzchni k), światła, miejsce wejścia, start potwora i starty uciekających.
// Rysuje je levels/monster.js (addCrispBlock). Ta sama para (mapa, ziarno) daje u hosta i u gościa dokładnie ten sam układ,
// więc przez sieć idzie tylko numer mapy i ziarno (cleanMapPick). Stacja kolejowa jest ręcznie zbudowana w monster.js (tu tylko dane).
// Układ wejścia: drzwi GAMES i start graczy są przy południowej ścianie (z = +A), potwór zaczyna daleko na północy.
// ==========================================
export const MAPS = [
    { id: 'station', name: 'Train Station', blurb: 'Two platforms, a train, a footbridge and vents to crawl through.', A: 30, H: 12, fixed: true },
    { id: 'hedge', name: 'Hedge Maze', blurb: 'A new maze every round. Tall hedges, loops to run in circles, no climbing.', A: 18.9, H: 6 },
    { id: 'yard', name: 'Container Yard', blurb: 'Stacks of shipping containers with steps up to the roofs and planks between them.', A: 28, H: 14 },
    { id: 'aisles', name: 'Night Supermarket', blurb: 'Long shelf aisles, checkout counters and shelves you can jump over.', A: 24, H: 7 },
    { id: 'rooftops', name: 'City Rooftops', blurb: 'Nine buildings, fire escapes and plank bridges. The monster can leap up walls.', A: 24, H: 26 },
    { id: 'temple', name: 'Ruined Temple', blurb: 'Rings of tall pillars, broken walls and a stepped dais in the middle.', A: 26, H: 18 },
    { id: 'carnival', name: 'Abandoned Carnival', blurb: 'A carousel, ferris wheel legs, stalls and tents. Crate steps lead to a rickety walkway.', A: 26, H: 14 },
];
export const MAP_IDS = MAPS.map(m => m.id);
export const MAX_SEED = 999999;

export function rng(seed) {   // mulberry32: małe, szybkie i deterministyczne
    let a = (Number.isFinite(seed) ? Math.floor(seed) : 1) >>> 0;
    return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
// Numer mapy i ziarno od hosta: tylko liczby całkowite w zakresach, inaczej null
export function cleanMapPick(mp, sd) {
    if (!Number.isInteger(mp) || mp < 0 || mp >= MAPS.length || !Number.isInteger(sd) || sd < 0 || sd > MAX_SEED) return null;
    return { i: mp, seed: sd };
}
// Wybór mapy na rundę: sel >= 0 to konkretna mapa, inaczej losowa inna niż poprzednia
export function pickMap(sel, prev, rnd) {
    const r = typeof rnd === 'function' ? rnd : Math.random;
    const i = Number.isInteger(sel) && sel >= 0 && sel < MAPS.length ? sel : (() => { const others = MAPS.map((m, k) => k).filter(k => k !== prev); return others[Math.min(others.length - 1, Math.floor(r() * others.length))]; })();
    return { i: i, seed: Math.floor(r() * (MAX_SEED + 1)) };
}

const PAL = { container: [0xb04a2a, 0x2a6a9a, 0x4a8a3a, 0xc8a02a, 0x8a3a5a, 0x5a5a6a], shelf: [0xd8d0b8, 0xa0b8c8, 0xc8a890], stone: [0xb8a888, 0xa89878, 0x98886a], brick: [0x8a4a3a, 0x7a5a4a, 0x6a6a72, 0x5a4a3a] };
const pick = (R, arr) => arr[Math.min(arr.length - 1, Math.floor(R() * arr.length))];
const box = (x, y, z, w, h, d, c, k) => ({ x: x, y: y, z: z, w: w, h: h, d: d, c: c, k: k || 'wall' });
// Prostopadłościan o podstawie na ziemi (y od 0 do h)
const gbox = (x, z, w, h, d, c, k) => box(x, h / 2, z, w, h, d, c, k);
// Schody: n stopni po dy wysokości i głębokości dz, pierwszy przy ścianie budynku; dir = (dx, dz) kierunek wznoszenia, a offset = przesunięcie bocznie
function stairs(x0, z0, n, rise, run, width, dirx, dirz, c) {
    const out = [];
    for (let k = 1; k <= n; k++) {
        const along = (k - 0.5) * run, h = rise * k;
        out.push(gbox(x0 + dirx * along, z0 + dirz * along, dirx ? run : width, h, dirx ? width : run, c, 'step'));
    }
    return out;
}
const free = (boxes, x, z, m) => !boxes.some(b => b.h > 0.4 && b.y - b.h / 2 < 1.6 && Math.abs(x - b.x) < b.w / 2 + m && Math.abs(z - b.z) < b.d / 2 + m);
// Wolne miejsca (poza przeszkodami) w pasie z od zA do zB; krok siatki 1.5 m
function spots(boxes, A, zA, zB, m) {
    const out = [];
    for (let z = Math.min(zA, zB); z <= Math.max(zA, zB); z += 1.5) for (let x = -A + 2; x <= A - 2; x += 1.5) if (free(boxes, x, z, m)) out.push([x, z]);
    return out;
}
function takeSpots(list, n, minGap, R) {
    const chosen = [], pool = list.slice();
    while (pool.length && chosen.length < n) {
        const [x, z] = pool.splice(Math.floor(R() * pool.length), 1)[0];
        if (chosen.every(c => Math.hypot(c[0] - x, c[1] - z) >= minGap)) chosen.push([x, z]);
    }
    return chosen;
}
function starts(boxes, A, R, y) {   // potwór daleko na północy, uciekający przy wejściu na południu
    const mon = takeSpots(spots(boxes, A, -A + 2.5, -A * 0.55, 1.1), 1, 1, R)[0] || [0, -A + 2.5];
    let surv = takeSpots(spots(boxes, A, A * 0.35, A - 3, 1.1), 6, 2.4, R);
    for (let k = 0; surv.length < 6 && k < 40; k++) { const x = -A + 3 + (2 * A - 6) * R(), z = A - 4 - 8 * R(); if (free(boxes, x, z, 1.1)) surv.push([x, z]); }
    return { monster: [mon[0], y, mon[1]], survivors: surv.map(s => [s[0], y, s[1]]) };
}
const lightGrid = (A, H, nx, nz, zMax) => { const out = []; for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) out.push([-A + (i + 0.5) * 2 * A / nx, H - 0.8, -A + (j + 0.5) * (Math.min(zMax === undefined ? A : zMax, A) + A) / nz]); return out; };

// ---------- Hedge Maze: DFS z ziarnem plus pętle; ściany scalone w ciągi; bot idzie trasą po komórkach (nav) ----------
const HEDGE = { N: 9, P: 4.2, WT: 0.8 };
function hedge(seed) {
    const { N, P, WT } = HEDGE, X = N * P / 2, H = 6, R = rng(seed), open = new Set(), id = (i, j) => j * N + i, key = (a, b) => (a < b ? a + '|' + b : b + '|' + a);
    const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]], seen = new Set([0]), stack = [[0, 0]];
    while (stack.length) {
        const [i, j] = stack[stack.length - 1], nb = DIRS.map(d => [i + d[0], j + d[1]]).filter(q => q[0] >= 0 && q[1] >= 0 && q[0] < N && q[1] < N && !seen.has(id(q[0], q[1])));
        if (!nb.length) { stack.pop(); continue; }
        const q = nb[Math.floor(R() * nb.length)]; open.add(key(id(i, j), id(q[0], q[1]))); seen.add(id(q[0], q[1])); stack.push(q);
    }
    for (let k = 0; k < 16; k++) { const i = Math.floor(R() * (N - 1)), j = Math.floor(R() * (N - 1)), d = R() < 0.5 ? [1, 0] : [0, 1]; open.add(key(id(i, j), id(i + d[0], j + d[1]))); }
    const link = (i, j, a, b) => open.has(key(id(i, j), id(a, b)));
    const cx = (i) => -X + (i + 0.5) * P, cz = (j) => -X + (j + 0.5) * P, col = pick(R, [0x2e6a34, 0x3a7a3a, 0x285a30]), boxes = [];
    for (let k = 1; k < N; k++) {   // linia k: ściana pozioma (z = const) i pionowa (x = const), ciągi zamkniętych krawędzi
        let s = -1;
        for (let i = 0; i <= N; i++) {
            const closed = i < N && !link(i, k - 1, i, k);
            if (closed && s < 0) s = i;
            if (!closed && s >= 0) { const len = (i - s) * P + WT; boxes.push(gbox(-X + (s + i) * P / 2, -X + k * P, len, H - 0.2, WT, col, 'hedge')); s = -1; }
        }
        s = -1;
        for (let j = 0; j <= N; j++) {
            const closed = j < N && !link(k - 1, j, k, j);
            if (closed && s < 0) s = j;
            if (!closed && s >= 0) { const len = (j - s) * P + WT; boxes.push(gbox(-X + k * P, -X + (s + j) * P / 2, WT, H - 0.2, len, col, 'hedge')); s = -1; }
        }
    }
    for (const b of boxes) {   // końce ścian przy murze hali nie wystają poza niego
        const x0 = Math.max(-X, b.x - b.w / 2), x1 = Math.min(X, b.x + b.w / 2), z0 = Math.max(-X, b.z - b.d / 2), z1 = Math.min(X, b.z + b.d / 2);
        b.x = (x0 + x1) / 2; b.w = x1 - x0; b.z = (z0 + z1) / 2; b.d = z1 - z0;
    }
    const cell = (x, z) => [Math.max(0, Math.min(N - 1, Math.floor((x + X) / P))), Math.max(0, Math.min(N - 1, Math.floor((z + X) / P)))];
    const nav = {   // następny punkt trasy z (fx, fz) do (tx, tz): środek sąsiedniej komórki na najkrótszej drodze
        next(fx, fz, tx, tz) {
            const from = cell(fx, fz), to = cell(tx, tz), dist = new Map([[id(to[0], to[1]), 0]]), q = [to];
            while (q.length) { const [i, j] = q.shift(); for (const d of DIRS) { const a = i + d[0], b = j + d[1]; if (a < 0 || b < 0 || a >= N || b >= N || dist.has(id(a, b)) || !link(i, j, a, b)) continue; dist.set(id(a, b), dist.get(id(i, j)) + 1); q.push([a, b]); } }
            const here = dist.get(id(from[0], from[1]));
            if (here === undefined || here === 0) return { x: tx, z: tz };
            for (const d of DIRS) { const a = from[0] + d[0], b = from[1] + d[1]; if (a >= 0 && b >= 0 && a < N && b < N && link(from[0], from[1], a, b) && dist.get(id(a, b)) === here - 1) return { x: cx(a), z: cz(b) }; }
            return { x: tx, z: tz };
        }, cell: cell,
    };
    const mid = Math.floor(N / 2), used = new Set([id(mid, N - 1)]), survivors = [[cx(mid), 1.0, cz(N - 1)]];
    while (survivors.length < 6) { const i = Math.floor(R() * N), j = N - 1 - Math.floor(R() * 3); if (used.has(id(i, j))) continue; used.add(id(i, j)); survivors.push([cx(i), 1.0, cz(j)]); }
    const lights = []; for (const i of [1, 4, 7]) for (const j of [1, 4, 7]) lights.push([cx(i), H - 0.6, cz(j)]);
    return { boxes, lights, entry: [cx(mid), 1.0, X - 1.2], monster: [cx(Math.floor(R() * N)), 1.0, cz(0)], survivors, nav, botJump: 4.2, floor: 0x3a4a2a, wall: 0x2a3a24, ceil: 0x10181a };
}

// ---------- Container Yard: kontenery w siatce 11 x 10 m, schody na dachy i deski między sąsiadami ----------
function yard(seed) {
    const R = rng(seed), A = 28, H = 14, boxes = [], xs = [-22, -11, 0, 11, 22], zs = [-22, -12, -2, 8], placed = {};
    for (const z of zs) for (const x of xs) {
        if (R() > 0.78) continue;
        const along = R() < 0.5, jx = (R() - 0.5) * 2, jz = (R() - 0.5) * 2, cx = x + jx, cz = z + jz, c = pick(R, PAL.container);
        boxes.push(gbox(cx, cz, along ? 6 : 2.4, 2.6, along ? 2.4 : 6, c, 'metal'));
        placed[x + ',' + z] = { cx, cz, along };
        if (R() < 0.65) {   // schody 5 x 0.52 m od środka długiego boku, w losową stronę (przy murze w stronę środka)
            let sgn = R() < 0.5 ? -1 : 1; const off = (R() - 0.5) * 3, edge = (along ? cz : cx) + sgn * 5.3;
            if (Math.abs(edge) > A - 0.2) sgn = -sgn;
            if (along) boxes.push(...stairs(cx + off, cz + sgn * 1.2, 5, 0.52, 0.8, 1.4, 0, sgn, 0x6a6a72));
            else boxes.push(...stairs(cx + sgn * 1.2, cz + off, 5, 0.52, 0.8, 1.4, sgn, 0, 0x6a6a72));
        }
    }
    for (const z of zs) for (let i = 0; i < xs.length - 1; i++) {   // deski między sąsiadami ułożonymi wzdłuż x w tym samym rzędzie
        const a = placed[xs[i] + ',' + z], b = placed[xs[i + 1] + ',' + z];
        if (!a || !b || !a.along || !b.along || Math.abs(a.cz - b.cz) > 0.8 || R() > 0.7) continue;
        const x1 = a.cx + 3, x2 = b.cx - 3; if (x2 - x1 < 1) continue;
        boxes.push(box((x1 + x2) / 2, 2.5, (a.cz + b.cz) / 2, x2 - x1 + 0.6, 0.2, 1.3, 0x7a5a3a, 'wood'));
    }
    for (const [x, z] of [[-26, 14], [26, 14], [-26, -26], [26, -26]]) if (R() < 0.8) boxes.push(gbox(x, z, 1.2, 1.2, 1.2, 0x8a6a3a, 'wood'));   // skrzynie w rogach
    const st = starts(boxes, A, R, 1.0), lights = []; for (const x of [-18, 0, 18]) for (const z of [-18, 2]) lights.push([x, H - 1, z]);
    return { boxes, lights, entry: [0, 1.0, A - 2], monster: st.monster, survivors: st.survivors, botJump: 4.2, floor: 0x55555a, wall: 0x4a4a52, ceil: 0x14161c };
}

// ---------- Night Supermarket: regały w rzędach z lukami (część wyższa), kasy przy wejściu, palety ----------
function aisles(seed) {
    const R = rng(seed), A = 24, H = 7, boxes = [], rows = [-19, -13, -7, -1, 5];
    for (const z of rows) for (const sx of [-1, 1]) for (const cx of [9, 17]) {
        if (R() < 0.12) continue;   // luka w rzędzie
        const tall = R() < 0.2;
        boxes.push(gbox(sx * cx, z, 7.2, tall ? 3.4 : 2.2, 1.0, pick(R, PAL.shelf), 'shelf'));
    }
    for (const x of [-16, -9, 9, 16]) boxes.push(gbox(x, 12, 1.2, 1.0, 3.4, 0x4a4a52, 'metal'));   // kasy
    for (const [x, z] of [[-2, -20], [2.5, -14], [-3, -8], [3, -2], [-2, 4]]) if (R() < 0.8) boxes.push(gbox(x, z, 2.0, 1.2, 1.6, 0x9a7a4a, 'wood'));   // palety w środkowej alei
    const st = starts(boxes, A, R, 1.0), lights = []; for (const x of [-16, 0, 16]) for (const z of [-18, -2, 14]) lights.push([x, H - 0.7, z]);
    return { boxes, lights, entry: [0, 1.0, A - 2], monster: st.monster, survivors: st.survivors, botJump: 4.2, floor: 0x8a8a92, wall: 0xc8c0a8, ceil: 0x2a2a30 };
}

// ---------- City Rooftops: dziewięć budynków 9 x 9 m na siatce 14 m, schody pożarowe i mostki; bot skacze nawet 8,6 m ----------
function rooftops(seed) {
    const R = rng(seed), A = 24, H = 26, boxes = [], xs = [-14, 0, 14], zs = [-14, 0, 14], heights = {}, HS = [4.5, 7.2], RISE = 0.45, RUN = 0.55;
    for (const z of zs) for (const x of xs) {
        const h = pick(R, HS), n = Math.round(h / RISE), side = Math.floor(R() * 4), g = 0x6a6a72;   // 10 stopni (4,5 m) albo 16 (7,2 m): 5,5 albo 8,8 m długości
        heights[x + ',' + z] = h;
        boxes.push(gbox(x, z, 9, h, 9, pick(R, PAL.brick), 'brick'));
        // Schody pożarowe przy jednej z czterech fasad, w stronę ulicy
        if (side === 0) boxes.push(...stairs(x - 4.4, z + 5.2, n, RISE, RUN, 1.4, 1, 0, g));
        else if (side === 1) boxes.push(...stairs(x - 4.4, z - 5.2, n, RISE, RUN, 1.4, 1, 0, g));
        else if (side === 2) boxes.push(...stairs(x - 5.2, z - 4.4, n, RISE, RUN, 1.4, 0, 1, g));
        else boxes.push(...stairs(x + 5.2, z - 4.4, n, RISE, RUN, 1.4, 0, 1, g));
    }
    const plank = (x, y, z, w, d) => boxes.push(box(x, y, z, w, 0.3, d, 0x7a5a3a, 'wood'));
    for (const z of zs) for (let i = 0; i < 2; i++) {   // mostki między budynkami tej samej wysokości
        const h1 = heights[xs[i] + ',' + z], h2 = heights[xs[i + 1] + ',' + z];
        if (h1 === h2 && R() < 0.7) plank((xs[i] + xs[i + 1]) / 2, h1 - 0.15, z, 5.4, 1.6);
    }
    for (const x of xs) for (let j = 0; j < 2; j++) {
        const h1 = heights[x + ',' + zs[j]], h2 = heights[x + ',' + zs[j + 1]];
        if (h1 === h2 && R() < 0.7) plank(x, h1 - 0.15, (zs[j] + zs[j + 1]) / 2, 1.6, 5.4);
    }
    const st = starts(boxes, A, R, 1.0), lights = [[-19, 6, -19], [19, 6, -19], [-19, 6, 19], [19, 6, 19], [0, 12, 0], [-7, 5, -7], [7, 5, 7]];
    return { boxes, lights, entry: [0, 1.0, A - 2], monster: st.monster, survivors: st.survivors, botJump: 8.6, floor: 0x2a2a30, wall: 0x303038, ceil: 0x0a0a14 };
}

// ---------- Ruined Temple: dwa pierścienie kolumn, kamienna platforma w środku, połamane mury ----------
function temple(seed) {
    const R = rng(seed), A = 26, H = 18, boxes = [];
    for (const [r, n] of [[9, 8], [17, 14]]) for (let k = 0; k < n; k++) {
        const a = (k + R() * 0.2) * 2 * Math.PI / n, x = Math.cos(a) * r, z = Math.sin(a) * r;
        boxes.push(gbox(x, z, 1.6, 14 + R() * 3, 1.6, pick(R, PAL.stone), 'stone'));
    }
    boxes.push(gbox(0, 0, 14, 0.6, 14, PAL.stone[0], 'stone'), gbox(0, 0, 9.6, 1.2, 9.6, PAL.stone[1], 'stone'), gbox(0, 0, 5.6, 1.8, 5.6, PAL.stone[2], 'stone'));
    for (let k = 0; k < 9; k++) {   // połamane mury
        const a = R() * 2 * Math.PI, r = 11 + R() * 4, x = Math.cos(a) * r, z = Math.sin(a) * r, along = R() < 0.5;
        if (z > A - 9 && Math.abs(x) < 7) continue;
        boxes.push(gbox(x, z, along ? 6 : 0.8, 1.8 + R() * 2.2, along ? 0.8 : 6, pick(R, PAL.stone), 'stone'));
    }
    const st = starts(boxes, A, R, 1.0), lights = [[0, 3, 0], [-14, 8, -14], [14, 8, -14], [-14, 8, 14], [14, 8, 14], [0, 10, -20]];
    return { boxes, lights, entry: [0, 1.0, A - 2], monster: st.monster, survivors: st.survivors, botJump: 4.2, floor: 0x6a6258, wall: 0x4a4540, ceil: 0x100e12 };
}

// ---------- LOBBY: sala przed rundą, w której gracze głosują na mapę, stając na polach (po jednym polu na mapę z MAPS) ----------
// Pola są dwoma rzędami po trzy na środku sali, tablica z wynikami wisi na północnej ścianie, wejście (i drzwi GAMES) jest przy południowej.
// Host liczy głosy z pozycji głów (padOf z lobbylogic.js), przez sieć idą tylko liczniki (cleanVotes).
export const LOBBY = { A: 14, H: 6.5, R: 1.5, PAD_SIZE: 2.7, BOARD: [0, 3.4, -13.9], MAX_VOTES: 16, OPTIONS: 3, LIGHT: 28, HEMI: 2.2 };   // LIGHT: moc lamp (była 11), HEMI: mnożnik światła otoczenia w lobby   // OPTIONS: tyle losowych map jest w każdym głosowaniu
const LOBBY_PADS = [[-7, -3], [0, -3], [7, -3]];
export function lobbyMap() {
    const A = LOBBY.A, boxes = [];
    for (const [x, z] of [[-4, -1], [4, -1], [-4, -9], [4, -9]]) boxes.push(gbox(x, z, 0.9, LOBBY.H, 0.9, 0x4a4036, 'stone'));   // filary między polami
    for (const [x, z, w, d] of [[-12.4, 8, 2, 1.2], [12.4, 8, 2, 1.2], [-12.4, -2, 1.2, 2.2], [12.4, -2, 1.2, 2.2]]) boxes.push(gbox(x, z, w, 1.1, d, 0x5a4630, 'wood'));   // skrzynie pod ścianami
    for (let i = 0; i < LOBBY.OPTIONS; i++) boxes.push(box(LOBBY_PADS[i][0], 0.03, LOBBY_PADS[i][1], LOBBY.PAD_SIZE, 0.06, LOBBY.PAD_SIZE, [0xa83a3a, 0x3a7ab8, 0xc89a2a, 0x4a9a4a, 0x8a4a9a, 0x9a8a6a][i % 6], 'step'));   // płyty pól (niskie: da się na nie wejść)
    return { id: 'lobby', name: 'Lobby', A: A, H: LOBBY.H, boxes: boxes, pads: LOBBY_PADS.map(p => p.slice()), board: LOBBY.BOARD.slice(),
        lights: [[-8, 5.4, -5], [0, 5.4, -5], [8, 5.4, -5], [-8, 5.4, 3], [0, 5.4, 3], [8, 5.4, 3], [0, 5.4, 10]], lightColor: 0xffd4a8, lightPower: LOBBY.LIGHT, hemiMul: LOBBY.HEMI,   // jasne lobby: mocniejsze lampy, jaśniejsze powierzchnie i światło otoczenia
        entry: [0, 1.0, A - 2], monster: [0, 1.0, -A + 2], survivors: [], botJump: 4.2, floor: 0x4a4038, wall: 0x6a5848, ceil: 0x241e1a };
}
// Losowe 3 różne mapy do głosowania (numery z MAPS); unika ostatnio granej, o ile jest z czego wybierać. rnd: funkcja 0..1
export function pickOptions(prev, rnd) {
    const r = typeof rnd === 'function' ? rnd : Math.random;
    let pool = MAPS.map((m, k) => k).filter(k => k !== prev); if (pool.length < LOBBY.OPTIONS) pool = MAPS.map((m, k) => k);
    const out = []; while (out.length < LOBBY.OPTIONS && pool.length) out.push(pool.splice(Math.min(pool.length - 1, Math.floor(r() * pool.length)), 1)[0]);
    return out;
}
// Propozycje map od hosta: dokładnie OPTIONS różnych numerów z zakresu, inaczej null
export function cleanOptions(o) {
    if (!Array.isArray(o) || o.length !== LOBBY.OPTIONS || !o.every(n => Number.isInteger(n) && n >= 0 && n < MAPS.length) || new Set(o).size !== o.length) return null;
    return o.slice();
}
// Liczniki głosów od hosta: dokładnie jedna liczba całkowita 0..MAX_VOTES na propozycję, inaczej null
export function cleanVotes(v) {
    if (!Array.isArray(v) || v.length !== LOBBY.OPTIONS) return null;
    return v.every(n => Number.isInteger(n) && n >= 0 && n <= LOBBY.MAX_VOTES) ? v.slice() : null;
}

// ---------- Abandoned Carnival: karuzela w środku, nogi diabelskiego młyna, rzędy straganów, namioty, skrzynie-schody i kładka ----------
function carnival(seed) {
    const R = rng(seed), A = 26, H = 14, boxes = [], tent = [0xa83a3a, 0x3a5aa8, 0xc8a83a, 0x7a3a8a];
    boxes.push(gbox(0, 0, 9, 0.5, 9, 0x7a6a5a, 'wood'), gbox(0, 0, 1.4, 5, 1.4, 0xb8a050, 'metal'), gbox(0, 0, 9.4, 0.3, 9.4, 0x5a1a1a, 'wall'));
    for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4 + R() * 0.15, x = Math.cos(a) * 3.4, z = Math.sin(a) * 3.4; boxes.push(gbox(x, z, 0.9, 1.5, 0.5, pick(R, tent), 'wood')); }   // konie karuzeli
    for (const sx of [-1, 1]) { boxes.push(gbox(sx * 17, -12, 1.0, 9, 5, 0x6a6a72, 'metal'), gbox(sx * 17, -17, 1.0, 9, 1.0, 0x6a6a72, 'metal')); }   // nogi diabelskiego młyna
    boxes.push(box(0, 9.2, -14.5, 36, 0.6, 1.2, 0x5a5a62, 'metal'));   // oś pod górą (nie do wejścia: za wysoko)
    for (const z of [-4, 14]) for (let k = 0; k < 4; k++) {   // rzędy straganów
        const x = -19 + k * 12.6 + (R() - 0.5) * 2; if (Math.abs(x) < 6 && z === -4) continue;
        boxes.push(gbox(x, z, 4, 2.4, 2, pick(R, tent), 'wood'));
        if (R() < 0.6) boxes.push(...stairs(x, z + (z < 0 ? -1 : 1) * 1.0, 4, 0.55, 0.75, 1.4, 0, z < 0 ? -1 : 1, 0x6a5a4a));
    }
    for (let k = 0; k < 3; k++) { const x = (k - 1) * 15 + (R() - 0.5) * 3, z = -21 + R() * 2; boxes.push(gbox(x, z, 5, 3.2, 5, pick(R, tent), 'wall')); }   // namioty
    const wx = -14 + R() * 6; boxes.push(box(wx, 2.8, 14, 9, 0.2, 1.3, 0x7a5a3a, 'wood'));   // kładka między dwoma straganami nad rzędem
    for (let k = 0; k < 7; k++) { const x = -22 + R() * 44, z = -2 + R() * 22; if (!(z > A - 7 && Math.abs(x) < 6)) boxes.push(gbox(x, z, 1.1, 1.1, 1.1, 0x8a6a3a, 'wood')); }   // skrzynie
    const st = starts(boxes, A, R, 1.0), lights = [[0, 6, 0], [-17, 9, -12], [17, 9, -12], [-14, 5, 14], [14, 5, 14], [0, 5, -20]];
    return { boxes, lights, entry: [0, 1.0, A - 2], monster: st.monster, survivors: st.survivors, botJump: 4.2, floor: 0x3a3430, wall: 0x2a2026, ceil: 0x0c0a10 };
}
const GEN = { hedge, yard, aisles, rooftops, temple, carnival };
// Układ mapy dla (id, ziarno). Stacja jest zbudowana w monster.js, więc dostaje tylko dane startowe.
export function generateMap(id, seed) {
    const def = MAPS.find(m => m.id === id); if (!def) return null;
    const base = { id: id, name: def.name, A: def.A, H: def.H };
    if (def.fixed) return Object.assign(base, { fixed: true, boxes: [], lights: [], entry: [0, 1.0, 27.5], monster: [0, 1.0, -26], survivors: [[-18, 2.2, 26], [18, 2.2, 26], [-12, 2.2, 24], [12, 2.2, 24], [-22, 2.2, 22], [22, 2.2, 22]], botJump: 4.2 });
    return Object.assign(base, GEN[id](seed));
}
