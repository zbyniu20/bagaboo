// ==========================================
// SCARY GTA: SZTUCZNA INTELIGENCJA MIASTA (czysta logika, bez THREE; testy: tests/logic.mjs, używa jej levels/scarygta.js).
// Graf ulic (skrzyżowania i punkty pośrednie) z core/citylayout.js, najkrótsza ścieżka, linia widzenia na bryłach budynków (slab test), percepcja policjanta
// (stożek, odległość, kryjówka, hałas) i maszyna stanów: patrol -> badanie hałasu -> pościg -> szukanie -> patrol. Ruch w poziomie wykonuje stepBot (core/botkit.js).
// ==========================================
import { CITY, blockRect } from './citylayout.js';
export const AI = { WALK: 2.0, INVESTIGATE: 3.4, CHASE: 4.8, FOV_COS: 0.35, CLOSE: 4, LOSE_T: 4.5, SEARCH_T: 9, CATCH: 1.15, CATCH_DY: 2.2, ROOF_Y: 3.2 };
export const NOISE_R = { run: 12, shout: 20, glass: 18, alarm: 26, shot: 42 };   // promień słyszenia zdarzenia (m)
// ----- graf ulic: linie ulic i skrzyżowania -----
const vx = () => [0, 1, 2].map(i => blockRect(i, 0).x1 + CITY.STREET / 2);
export const STREET_V = () => [CITY.X0 + 5].concat(vx(), [CITY.X1 - 5]);
export const STREET_H = () => [CITY.Z0 + 2, blockRect(0, 0).z1 + CITY.STREET / 2, blockRect(0, 1).z1 + CITY.STREET / 2, (CITY.BLV[0] + CITY.BLV[1]) / 2];
export function streetGraph() {
    const V = STREET_V(), H = STREET_H(), nodes = [], idx = {}, edges = [];
    const key = (x, z) => x.toFixed(1) + ',' + z.toFixed(1), add = (x, z) => { const k = key(x, z); if (idx[k] === undefined) { idx[k] = nodes.length; nodes.push({ x: x, z: z, adj: [] }); } return idx[k]; };
    const link = (a, b) => { if (a === b || nodes[a].adj.includes(b)) return; nodes[a].adj.push(b); nodes[b].adj.push(a); edges.push([a, b]); };
    for (const z of H) { let prev = -1; for (const x of V) { if (prev >= 0) { const pn = nodes[prev]; const n = Math.round((x - pn.x) / 22); let p = prev; for (let k = 1; k <= n; k++) { const c = add(pn.x + (x - pn.x) * k / n, z); link(p, c); p = c; } prev = p; } else prev = add(x, z); } }
    for (const x of V) { let prev = -1; for (const z of H) { if (prev >= 0) { const pn = nodes[prev]; const n = Math.max(1, Math.round((z - pn.z) / 22)); let p = prev; for (let k = 1; k <= n; k++) { const c = add(x, pn.z + (z - pn.z) * k / n); link(p, c); p = c; } prev = p; } else prev = add(x, z); } }
    return { nodes: nodes, edges: edges };
}
export function nearestNode(g, x, z) { let b = 0, bd = 1e9; g.nodes.forEach((n, i) => { const d = Math.hypot(n.x - x, n.z - z); if (d < bd) { bd = d; b = i; } }); return b; }
export function findPath(g, from, to) {
    if (from === to) return [from];
    const prev = new Array(g.nodes.length).fill(-1), dist = new Array(g.nodes.length).fill(1e9), todo = [from]; dist[from] = 0;
    while (todo.length) {
        let bi = 0; for (let i = 1; i < todo.length; i++) if (dist[todo[i]] < dist[todo[bi]]) bi = i;
        const u = todo.splice(bi, 1)[0]; if (u === to) break;
        for (const v of g.nodes[u].adj) { const w = dist[u] + Math.hypot(g.nodes[u].x - g.nodes[v].x, g.nodes[u].z - g.nodes[v].z); if (w < dist[v]) { dist[v] = w; prev[v] = u; todo.push(v); } }
    }
    if (prev[to] < 0) return [];
    const out = [to]; for (let c = to; prev[c] >= 0; c = prev[c]) out.unshift(prev[c]); return out;
}
export const pathLength = (g, p) => { let s = 0; for (let i = 1; i < p.length; i++) s += Math.hypot(g.nodes[p[i]].x - g.nodes[p[i - 1]].x, g.nodes[p[i]].z - g.nodes[p[i - 1]].z); return s; };
// ----- linia widzenia: odcinek kontra prostopadłościany { x0,x1,y0,y1,z0,z1 } (metoda płyt) -----
export function segmentHitsBox(a, b, q) {
    let t0 = 0, t1 = 1; const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], lo = [q.x0, q.y0, q.z0], hi = [q.x1, q.y1, q.z1];
    for (let i = 0; i < 3; i++) {
        if (Math.abs(d[i]) < 1e-9) { if (a[i] < lo[i] || a[i] > hi[i]) return false; continue; }
        let u0 = (lo[i] - a[i]) / d[i], u1 = (hi[i] - a[i]) / d[i]; if (u0 > u1) { const t = u0; u0 = u1; u1 = t; }
        t0 = Math.max(t0, u0); t1 = Math.min(t1, u1); if (t0 > t1) return false;
    }
    return true;
}
export const lineBlocked = (a, b, boxes) => boxes.some(q => segmentHitsBox(a, b, q));
// ----- percepcja: widzenie (stożek, zasięg, kryjówka, LOS) i słyszenie -----
export function copSees(cop, p, o) {
    const dx = p.x - cop.x, dz = p.z - cop.z, d = Math.hypot(dx, dz);
    if (Math.abs(p.y - cop.y) > 9) return false;
    const range = (o.hidden ? Math.min(o.sight, 3.5) : o.sight) * (o.dark === undefined ? 1 : o.dark);
    if (d > range) return false;
    if (d > AI.CLOSE) { const c = d > 1e-6 ? (Math.sin(cop.dir) * dx + Math.cos(cop.dir) * dz) / d : 1; if (c < AI.FOV_COS) return false; }
    return !o.blocked;
}
export const copHears = (cop, ev) => Math.hypot(ev.x - cop.x, ev.z - cop.z) <= (NOISE_R[ev.kind] || 10);
// ----- maszyna stanów: zwraca { mode, goal:{x,z}|null, speed } i zmienia cop (mode, lostT, searchT, last) -----
export function newCop(node) { return { mode: 'patrol', lostT: 0, searchT: 0, last: null, node: node, pathI: 0, path: [], goalNode: -1, wait: 0 }; }
export function copDecide(cop, v, dt) {
    const d = Math.min(Math.max(dt, 0), 0.5), rules = v.rules;
    if (v.sees) { cop.last = { x: v.px, z: v.pz }; cop.lostT = 0; if (cop.mode !== 'chase') { cop.notice = (cop.notice || 0) + d; if (cop.notice >= rules.noticeT) { cop.mode = 'chase'; cop.notice = 0; } } }
    else { cop.notice = Math.max(0, (cop.notice || 0) - d * 0.5); if (cop.mode === 'chase') { cop.lostT += d; if (cop.lostT > AI.LOSE_T) { cop.mode = 'search'; cop.searchT = 0; } } }
    if (cop.mode === 'patrol' || cop.mode === 'search') {
        const ev = v.heard; if (ev && cop.mode === 'patrol') { cop.mode = 'investigate'; cop.last = { x: ev.x, z: ev.z }; cop.searchT = 0; }
        else if (rules.alert && cop.mode === 'patrol' && v.radioPos) { cop.mode = 'investigate'; cop.last = v.radioPos; cop.searchT = 0; }
    }
    if (cop.mode === 'investigate') { cop.searchT += d; if (cop.last && Math.hypot(cop.last.x - cop.x, cop.last.z - cop.z) < 2.2) { cop.mode = 'search'; cop.searchT = 0; } else if (cop.searchT > 25) { cop.mode = 'patrol'; } }
    if (cop.mode === 'search') { cop.searchT += d; if (cop.searchT > AI.SEARCH_T) { cop.mode = 'patrol'; cop.last = null; } }
    const m = rules.speedMul;
    if (cop.mode === 'chase') return { mode: 'chase', goal: { x: v.px, z: v.pz }, speed: AI.CHASE * m };
    if (cop.mode === 'investigate' && cop.last) return { mode: 'investigate', goal: cop.last, speed: AI.INVESTIGATE * m };
    if (cop.mode === 'search' && cop.last) return { mode: 'search', goal: cop.last, speed: AI.WALK * 1.2 * m };
    return { mode: 'patrol', goal: null, speed: AI.WALK * m };
}
// Patrol po grafie: kolejny punkt trasy (losuje cel co kilka skrzyżowań); zwraca { x, z } do podejścia
export function patrolTarget(g, cop, rand) {
    if (cop.path.length === 0 || cop.pathI >= cop.path.length) {
        let to; do { to = Math.floor(rand() * g.nodes.length); } while (to === cop.node);
        cop.path = findPath(g, cop.node, to); cop.pathI = 1; cop.goalNode = to;
        if (cop.path.length < 2) { cop.path = []; return null; }
    }
    const n = g.nodes[cop.path[cop.pathI]];
    return { x: n.x, z: n.z, node: cop.path[cop.pathI] };
}
export function patrolArrived(g, cop) { if (!cop.path.length) return; cop.node = cop.path[cop.pathI]; cop.pathI++; }
// Czy gracz jest poza zasięgiem policji (dach, wysoko): policjanci czekają na dole
export const playerOnRoof = (p) => p.y - 1 > AI.ROOF_Y;
export const caughtBy = (cop, p) => Math.hypot(p.x - cop.x, p.z - cop.z) < AI.CATCH && Math.abs((p.y - 1) - cop.y) < AI.CATCH_DY;
// Miejsca do odrodzenia policji: węzły w pierścieniu odległości od gracza (poza zasięgiem wzroku), deterministycznie z generatora
export function spawnNodes(g, px, pz, min, max) { const out = []; g.nodes.forEach((n, i) => { const d = Math.hypot(n.x - px, n.z - pz); if (d >= min && d <= max) out.push(i); }); return out; }
