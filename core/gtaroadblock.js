// ==========================================
// SCARY GTA: BARYKADY (czysta logika, bez THREE). Od 3 gwiazdek policja stawia na ulicach barykady (3★ jedną, 4★ dwie, 5★ trzy; najwyżej RB.MAX), w odległości 25-90 m od gracza z najwyższym poziomem
// poszukiwania, tylko na węzłach grafu ulic leżących na trasach pickupów, z dala od startów aut, kryjówek, kabin Pay 'n' Spray, budek i bulwaru. Barykady znikają po 20 s bez 3 gwiazdek.
// Barykada blokuje POJAZDY (pickup ucieczki staje ~10 m przed nią; ruch uliczny też staje przed barykadą), a pieszy przechodzi przez nią: to znacznik na ulicy, bez ciała fizyki i bez wpisu w przeszkodach
// (te czytają akustyka, decale i wypalanie światła). Gracz zsiada z paki przed barykadą i ucieka pieszo albo po dachach.
// SIEĆ: idą tylko indeksy węzłów grafu ulic (najwyżej RB.MAX, przez `cleanBlocks`); punkt stopu jazdy (metry od startu) ustala host raz, przy starcie jazdy, i niesie go flota (core/vehiclelogic.js).
// Barykada, która powstanie W TRAKCIE jazdy, tej jazdy nie zatrzyma (świadome ograniczenie: każdy klient liczy pozycję auta deterministycznie z trasy, stopu i wieku).
// 3D: core/gtaroadblockfx.js. Testy: tests/logic.mjs (blok "barykady"), w przeglądarce tests/roadblock.mjs.
// ==========================================
import { streetGraph } from './cityai.js';
import { VEHICLES, RIDE, startPoint, nodeDistance, buildRide, cleanStop, posAt, rideStats, routeOf } from './vehiclelogic.js';
import { SAFEHOUSES, hideSpots, CITY } from './citylayout.js';
import { SPRAY } from './gtaextras.js';
import { mysterySpots } from './gtamystery.js';

export const RB = { MAX: 3, NEAR: 25, FAR: 90, SPACING: 30, CLEAR_AFTER: 20, SETBACK: 10, MAX_Z: 30, FROM_CAR: 14, FROM_SPOT: 9, FROM_END: 15, MIN_ALONG: 22, MIN_STARS: 3 };
let G = null; const graph = () => G || (G = streetGraph());
const fin = (n) => typeof n === 'number' && Number.isFinite(n);
export const countFor = (stars) => !fin(stars) || stars < RB.MIN_STARS ? 0 : Math.min(RB.MAX, stars - RB.MIN_STARS + 1);
export const nodePos = (i) => { const n = graph().nodes[i]; return n ? { x: n.x, z: n.z } : null; };
// Kierunek ulicy w węźle (do ustawienia barykady w poprzek): true, gdy ulica biegnie wzdłuż osi X
export function streetAlongX(i) { const g = graph(), n = g.nodes[i]; if (!n || !n.adj.length) return true; let dx = 0, dz = 0; for (const a of n.adj) { dx += Math.abs(g.nodes[a].x - n.x); dz += Math.abs(g.nodes[a].z - n.z); } return dx >= dz; }
// Miejsca, od których barykada musi być z dala: starty aut, kryjówki-domy, śmietniki, kabiny Pay 'n' Spray, budki telefoniczne
function keepOut(B) {
    const out = [], ms = mysterySpots(B);
    for (const v of VEHICLES) { const p = startPoint(v.id); if (p) out.push({ x: p.x, z: p.z, r: RB.FROM_CAR }); }
    for (const s of SAFEHOUSES.concat(hideSpots(), SPRAY.SPOTS)) out.push({ x: s.x, z: s.z, r: RB.FROM_SPOT });
    out.push({ x: ms.boothA.x, z: ms.boothA.z, r: RB.FROM_SPOT }, { x: ms.boothB.x, z: ms.boothB.z, r: RB.FROM_SPOT });
    return out;
}
let CAND = null;
// Dozwolone węzły: na co najmniej jednej trasie pickupa (nie przy jej początku ani końcu), poza bulwarem i poza miejscami z keepOut
export function candidates(B) {
    if (CAND && !B) return CAND;
    const g = graph(), ko = keepOut(B), set = new Set();
    for (const v of VEHICLES) for (const r of v.routes) {
        const base = buildRide(v.id, r.id); if (!base) continue;
        for (let i = 0; i < g.nodes.length; i++) {
            const d = nodeDistance(v.id, r.id, i); if (d < RB.MIN_ALONG || d > base.len - RB.FROM_END) continue;
            const n = g.nodes[i]; if (n.z > RB.MAX_Z || Math.abs(n.x) > CITY.X1 - 6 || n.z < CITY.Z0 + 6) continue;
            if (ko.some(k => Math.hypot(n.x - k.x, n.z - k.z) < k.r)) continue;
            set.add(i);
        }
    }
    const list = Array.from(set).sort((a, b) => a - b); if (!B) CAND = list; return list;
}
// Lista z sieci: unikalne liczby całkowite z zestawu dozwolonych węzłów, najwyżej RB.MAX
export function cleanBlocks(a) {
    if (!Array.isArray(a)) return [];
    const ok = new Set(candidates()), out = [];
    for (const v of a.slice(0, RB.MAX)) if (Number.isInteger(v) && ok.has(v) && !out.includes(v)) out.push(v);
    return out;
}
// Czy trasa przecina barykadę? { kind: 'free' | 'stop' | 'blocked', stop }: stop = metry od startu (RB.SETBACK przed barykadą); 'blocked', gdy barykada jest tak blisko startu, że auto nie ruszyłoby
export function rideBlock(carId, routeId, nodes) {
    if (!routeOf(carId, routeId) || !Array.isArray(nodes)) return { kind: 'free', stop: 0 };
    let best = -1;
    for (const nd of nodes) { const d = nodeDistance(carId, routeId, nd); if (d > 0 && (best < 0 || d < best)) best = d; }
    if (best < 0) return { kind: 'free', stop: 0 };
    const stop = Math.round(best - RB.SETBACK), ok = cleanStop(carId, routeId, stop);
    return ok ? { kind: 'stop', stop: ok } : { kind: 'blocked', stop: 0 };
}
export const newBlocks = () => ({ nodes: [], quiet: 0 });
// Krok hosta: lead = { x, z } gracza z najwyższym poziomem; zwraca { st, placed (nowe węzły), cleared }
export function blockStep(st, dt, o, R) {
    const rnd = R || Math.random, s = { nodes: st.nodes.slice(), quiet: st.quiet }, d = Math.min(Math.max(+dt || 0, 0), 0.5), want = countFor(o.stars), g = graph(), placed = [];
    if (want > 0) {
        s.quiet = 0;
        if (o.lead && fin(o.lead.x) && fin(o.lead.z)) while (s.nodes.length < want) {
            const pool = candidates().filter(i => { if (s.nodes.includes(i)) return false; const n = g.nodes[i], dl = Math.hypot(n.x - o.lead.x, n.z - o.lead.z); return dl >= RB.NEAR && dl <= RB.FAR && s.nodes.every(j => Math.hypot(n.x - g.nodes[j].x, n.z - g.nodes[j].z) >= RB.SPACING); });
            if (!pool.length) break;
            const pick = pool[Math.floor(rnd() * pool.length) % pool.length]; s.nodes.push(pick); placed.push(pick);
        }
        return { st: s, placed: placed, cleared: false };
    }
    if (!s.nodes.length) { s.quiet = 0; return { st: s, placed: placed, cleared: false }; }
    s.quiet += d; if (s.quiet < RB.CLEAR_AFTER) return { st: s, placed: placed, cleared: false };
    return { st: newBlocks(), placed: placed, cleared: true };
}
// Kontrola rozmieszczenia i profilu jazdy (test)
export function roadblockProblems(B) {
    const bad = [], c = candidates(B), g = graph();
    if (c.length < 6) bad.push('too few roadblock nodes (' + c.length + ')');
    const ko = keepOut(B);
    for (const i of c) { const n = g.nodes[i]; if (ko.some(k => Math.hypot(n.x - k.x, n.z - k.z) < k.r)) bad.push('node ' + i + ' is too close to a car start, hideout, spray booth or phone booth'); if (n.z > RB.MAX_Z) bad.push('node ' + i + ' is on the boulevard'); }
    for (const v of VEHICLES) for (const r of v.routes) {
        const base = buildRide(v.id, r.id); if (!base) continue;
        const on = c.filter(i => nodeDistance(v.id, r.id, i) > 0); if (!on.length) bad.push(v.id + '/' + r.id + ': no roadblock node lies on this route');
        for (const i of on) {
            const rb = rideBlock(v.id, r.id, [i]); if (rb.kind === 'free') { bad.push(v.id + '/' + r.id + ': node ' + i + ' is on the route but gives no stop'); continue; }
            if (rb.kind === 'blocked') continue;
            const ride = buildRide(v.id, r.id, rb.stop), end = posAt(ride, ride.T + 1), np = nodePos(i), gap = Math.hypot(end.x - np.x, end.z - np.z), st = rideStats(ride);
            if (gap < 5) bad.push(v.id + '/' + r.id + ': the car stops only ' + gap.toFixed(1) + ' m from the roadblock at node ' + i);
            if (st.vmax > RIDE.VMAX + 1e-6 || st.amax > RIDE.ACC * 1.25 || st.lat > RIDE.ALAT * 1.6) bad.push(v.id + '/' + r.id + ': the stop at ' + rb.stop + ' m breaks the comfort limits ' + JSON.stringify(st));
        }
    }
    return bad;
}
