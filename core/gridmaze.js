// ==========================================
// LABIRYNT NA SIATCE (wspólny dla Catacombs i Nursery): deterministyczny układ (DFS z ziarnem + kilka pętli, żeby dało się uciekać),
// wyszukiwanie trasy po komórkach (BFS), odległości od startu i budowa ścian scalonych w ciągi (mało brył = mało wywołań rysowania).
// Komórka (i, j): i rośnie w +x, j rośnie w -z; labirynt leży w z <= 0, wejście na południowej ścianie (z = 0).
// ==========================================
import { addCrispBlock, tex } from './engine.js';
import * as T from './textures.js';

// o: { N, P (rozmiar komórki, m), WT (grubość ściany), H (wysokość), seed, loops (dodatkowe przejścia) }
export function createGridMaze(o) {
    const N = o.N, P = o.P, WT = o.WT, H = o.H, X = N * P / 2;
    const cx = (i) => -X + (i + 0.5) * P, cz = (j) => -(j + 0.5) * P;
    const cellOf = (x, z) => [Math.max(0, Math.min(N - 1, Math.floor((x + X) / P))), Math.max(0, Math.min(N - 1, Math.floor(-z / P)))];
    const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    // generacja: kolejność losowań musi zostać taka sama (ten sam układ co wcześniej dla tego samego ziarna)
    const R = T.mkRng(o.seed), open = new Set(), seen = new Set(), key = (a, b) => (a < b ? a + '|' + b : b + '|' + a), id = (i, j) => j * N + i;
    const stack = [[0, 0]]; seen.add(0);
    while (stack.length) {
        const [i, j] = stack[stack.length - 1], nb = DIRS.map(d => [i + d[0], j + d[1]]).filter(q => q[0] >= 0 && q[1] >= 0 && q[0] < N && q[1] < N && !seen.has(id(q[0], q[1])));
        if (!nb.length) { stack.pop(); continue; }
        const q = nb[(R() * nb.length) | 0]; open.add(key(id(i, j), id(q[0], q[1]))); seen.add(id(q[0], q[1])); stack.push(q);
    }
    for (let k = 0; k < (o.loops || 0); k++) {
        const i = (R() * (N - 1)) | 0, j = (R() * (N - 1)) | 0, d = R() < 0.5 ? [1, 0] : [0, 1];
        open.add(key(id(i, j), id(i + d[0], j + d[1])));
    }
    const link = (i, j, di, dj) => { const a = i + di, b = j + dj; return a >= 0 && b >= 0 && a < N && b < N && open.has(key(id(i, j), id(a, b))); };
    const bfs = (from, to) => {   // lista komórek [i,j] od następnej po 'from' do 'to'
        const prev = new Map(), q = [from]; prev.set(id(from[0], from[1]), null);
        while (q.length) {
            const c = q.shift(); if (c[0] === to[0] && c[1] === to[1]) break;
            for (const d of DIRS) { const n = [c[0] + d[0], c[1] + d[1]]; if (!link(c[0], c[1], d[0], d[1]) || prev.has(id(n[0], n[1]))) continue; prev.set(id(n[0], n[1]), c); q.push(n); }
        }
        const path = []; let c = to; if (!prev.has(id(c[0], c[1]))) return path;
        while (c && !(c[0] === from[0] && c[1] === from[1])) { path.unshift(c); c = prev.get(id(c[0], c[1])); }
        return path;
    };
    const distMap = (from) => {   // Map(id komórki -> liczba kroków od 'from')
        const dist = new Map(), q = [from]; dist.set(id(from[0], from[1]), 0);
        while (q.length) { const c = q.shift(); for (const d of DIRS) { const n = [c[0] + d[0], c[1] + d[1]]; if (!link(c[0], c[1], d[0], d[1]) || dist.has(id(n[0], n[1]))) continue; dist.set(id(n[0], n[1]), dist.get(id(c[0], c[1])) + 1); q.push(n); } }
        return dist;
    };
    const degree = (i, j) => DIRS.filter(d => link(i, j, d[0], d[1])).length;
    // Ślepe zaułki jak najdalej od siebie i od startu: n komórek na klucze (pomija komórki z 'skip')
    const pickDeadEnds = (n, start, skip, minDist) => {
        const dm = distMap(start), isSkip = (i, j) => skip.some(c => c[0] === i && c[1] === j), ends = [];
        for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) if (!isSkip(i, j) && degree(i, j) === 1 && dm.get(id(i, j)) >= minDist) ends.push([i, j]);
        if (ends.length < n) for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) if (!isSkip(i, j) && !ends.some(e => e[0] === i && e[1] === j) && dm.get(id(i, j)) >= minDist + 2) ends.push([i, j]);
        const picked = [ends.sort((a, b) => dm.get(id(b[0], b[1])) - dm.get(id(a[0], a[1])))[0]];
        while (picked.length < n && picked.length < ends.length) {
            let best = null, bd = -1;
            for (const e of ends) { if (picked.includes(e)) continue; const d = Math.min(...picked.map(p => Math.hypot(p[0] - e[0], p[1] - e[1]))); if (d > bd) { bd = d; best = e; } }
            picked.push(best);
        }
        return picked;
    };
    // Podłoga, sufit i ściany (poziome i pionowe scalone w ciągi). c: { wall, edge, floor, ceil } kolory
    const buildWalls = (c) => {
        addCrispBlock(0, -0.5, -N * P / 2, X * 2 + 4, 1, N * P + 4, c.floor, 0x0a0806, tex.floor, { rough: tex.floorRough });
        addCrispBlock(0, H + 0.5, -N * P / 2, X * 2 + 4, 1, N * P + 4, c.ceil, 0x0a0806, tex.wall);
        for (let k = 0; k <= N; k++) {
            let run = -1;
            for (let i = 0; i <= N; i++) {
                const solid = i < N && (k === 0 || k === N || !link(i, k - 1, 0, 1));
                if (solid && run < 0) run = i;
                if (!solid && run >= 0) { addCrispBlock(-X + (run + i) * P / 2, H / 2, -k * P, (i - run) * P + WT, H, WT, c.wall, c.edge, tex.wall); run = -1; }
            }
        }
        for (let k = 0; k <= N; k++) {
            let run = -1;
            for (let j = 0; j <= N; j++) {
                const solid = j < N && (k === 0 || k === N || !link(k - 1, j, 1, 0));
                if (solid && run < 0) run = j;
                if (!solid && run >= 0) { const len = (j - run) * P - WT; addCrispBlock(-X + k * P, H / 2, -(run + j) * P / 2, WT, H, len, c.wall, c.edge, tex.wall); run = -1; }
            }
        }
    };
    return { N: N, P: P, WT: WT, H: H, X: X, cx: cx, cz: cz, cellOf: cellOf, link: link, bfs: bfs, distMap: distMap, degree: degree, pickDeadEnds: pickDeadEnds, buildWalls: buildWalls, id: id };
}
