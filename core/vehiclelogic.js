// ==========================================
// SCARY GTA: POJAZDY NA SZYNACH (czysta logika, bez THREE). Trzy pickupy ucieczki stoją na ulicach; dotknięcie klamki zabiera gracza na stojąco na pakę i wiezie go po wyznaczonej trasie
// (graf ulic z core/cityai.js, zakręty zaokrąglone). KOMFORT VR: prędkość najwyżej 7 m/s, przyspieszenie około 2 m/s^2, przyspieszenie boczne (v^2/R) około 2 m/s^2, kamera się NIE obraca
// (przesuwa się tylko ciało gracza, a prędkość trafia do playerBody, więc działa winieta); jazdę można przerwać obiema chwytami. Pozycja zawsze liczy się z trasy i WIEKU jazdy,
// więc przez sieć idą tylko (auto, trasa, wiek, pasażer), a nie pozycje. Host trzyma flotę i waliduje start z własnego widoku głowy gracza.
// Testy: tests/logic.mjs (blok "pojazdy"), w przeglądarce tests/vehicles.mjs.
// ==========================================
import { streetGraph, nearestNode, findPath } from './cityai.js';
export const RIDE = { VMAX: 7, ACC: 2, ALAT: 2, R: 6, DS: 0.5, BED_BACK: 1.1, BED_Y: 0.8, START_R: 3.4, HANDLE_R: 0.6, FREE_AFTER: 1.5, MAX_AGE: 120, DISMOUNT_HOLD: 0.5, MIN_STOP: 12, STOP_END: 4, MAX_STOPS: 32 };
// at: gdzie stoi (przyciągane do najbliższego węzła ulicy), routes: cele (przyciągane do węzłów), nazwy po angielsku (pokazuje je napis)
export const VEHICLES = [
    { id: 'bank', name: 'Bank runner', at: [-38, -62], routes: [{ id: 'pier', name: 'To the pier', to: [0, 40] }, { id: 'marina', name: 'To the marina', to: [-38, 40] }] },
    { id: 'casino', name: 'Casino cruiser', at: [0, -62], routes: [{ id: 'plaza', name: 'To the plaza', to: [-38, 18] }, { id: 'east', name: 'To the east boulevard', to: [38, 40] }] },
    { id: 'motel', name: 'Motel mule', at: [0, -24], routes: [{ id: 'warehouse', name: 'To the warehouses', to: [38, 18] }, { id: 'north', name: 'To the north-east', to: [38, -39] }] }
];
// Auta tylko do swobodnej jazdy (bez tras po szynach): stoją przy krawężnikach, każde ma rodzaj z SPECS w core/drivelogic.js (wolniejsze albo zwrotniejsze niż pickup, nigdy poza limitem komfortu RIDE).
// To osobne obiekty (nie auta z ruchu ulicznego, które są instancjami z kolizjami), więc nie ma starego pudła kolizji, które kolidowałoby z kradzionym autem.
export const FREE_CARS = [
    { id: 'hauler', name: 'Cargo hauler', kind: 'hauler', park: { x: 41, z: 12, yaw: 0 } },
    { id: 'buggy', name: 'Dune buggy', kind: 'buggy', park: { x: -20, z: 44, yaw: Math.PI / 2 } },
    { id: 'moto', name: 'Night rider', kind: 'moto', park: { x: -41, z: -6, yaw: 0 } },
    { id: 'moto2', name: 'Grave rider', kind: 'moto', park: { x: 72, z: -30, yaw: Math.PI } }
];
export const kindOf = (carId) => { const f = FREE_CARS.find(v => v.id === carId); return f ? f.kind : 'pickup'; };
export const isCar = (carId) => typeof carId === 'string' && (VEHICLES.some(v => v.id === carId) || FREE_CARS.some(v => v.id === carId));
export const carName = (carId) => { const v = VEHICLES.find(q => q.id === carId) || FREE_CARS.find(q => q.id === carId); return v ? v.name : 'car'; };
export const allCarIds = () => VEHICLES.map(v => v.id).concat(FREE_CARS.map(v => v.id));
let G = null; const graph = () => G || (G = streetGraph());
const cache = {};
const vById = (id) => VEHICLES.find(v => v.id === id) || null;
export const routeOf = (carId, routeId) => { const v = vById(carId); return v ? (v.routes.find(r => r.id === routeId) || null) : null; };
export function startNode(carId) { const v = vById(carId); return v ? nearestNode(graph(), v.at[0], v.at[1]) : -1; }
export function startPoint(carId) { const n = startNode(carId); return n < 0 ? null : { x: graph().nodes[n].x, z: graph().nodes[n].z }; }
// Zaokrąglenie łamanej: przy każdym zakręcie łuk (krzywa Béziera) o promieniu do r
export function roundCorners(pts, r) {
    if (pts.length < 3) return pts.slice();
    const out = [pts[0]];
    for (let i = 1; i < pts.length - 1; i++) {
        const A = pts[i - 1], B = pts[i], C = pts[i + 1], ab = Math.hypot(B.x - A.x, B.z - A.z), bc = Math.hypot(C.x - B.x, C.z - B.z);
        if (ab < 1e-6 || bc < 1e-6) continue;
        const ux = (B.x - A.x) / ab, uz = (B.z - A.z) / ab, wx = (C.x - B.x) / bc, wz = (C.z - B.z) / bc;
        if (Math.abs(ux * wz - uz * wx) < 1e-3 && ux * wx + uz * wz > 0) { out.push(B); continue; }   // prosto
        const d = Math.min(r, ab / 2, bc / 2), P1 = { x: B.x - ux * d, z: B.z - uz * d }, P2 = { x: B.x + wx * d, z: B.z + wz * d };
        for (let k = 0; k <= 8; k++) { const t = k / 8, a = (1 - t) * (1 - t), b = 2 * (1 - t) * t, c = t * t; out.push({ x: a * P1.x + b * B.x + c * P2.x, z: a * P1.z + b * B.z + c * P2.z }); }
    }
    out.push(pts[pts.length - 1]);
    return out;
}
// Wielokąt trasy (zaokrąglony) ze skumulowaną długością i ścieżką węzłów grafu; null, gdy trasy nie ma
const polyCache = {};
function polyOf(carId, routeId) {
    const key = carId + ':' + routeId; if (polyCache[key] !== undefined) return polyCache[key];
    const rt = routeOf(carId, routeId); if (!rt) return (polyCache[key] = null);
    const g = graph(), a = startNode(carId), b = nearestNode(g, rt.to[0], rt.to[1]), path = findPath(g, a, b);
    if (!path || path.length < 2) return (polyCache[key] = null);
    const poly = roundCorners(path.map(i => ({ x: g.nodes[i].x, z: g.nodes[i].z })), RIDE.R), cum = [0];
    for (let i = 1; i < poly.length; i++) cum.push(cum[i - 1] + Math.hypot(poly[i].x - poly[i - 1].x, poly[i].z - poly[i - 1].z));
    return (polyCache[key] = { path: path, poly: poly, cum: cum, name: rt.name });
}
// Odległość wzdłuż jazdy (m od startu) do węzła ulicy leżącego na trasie (najbliższy punkt zaokrąglonego wielokąta); -1, gdy węzeł nie leży na trasie
export function nodeDistance(carId, routeId, node) {
    const P = polyOf(carId, routeId); if (!P || !P.path.includes(node)) return -1;
    const nd = graph().nodes[node]; let bi = 0, bd = 1e9; P.poly.forEach((q, i) => { const d = Math.hypot(q.x - nd.x, q.z - nd.z); if (d < bd) { bd = d; bi = i; } });
    return P.cum[bi];
}
// Stop jazdy (barykada): liczba całkowita metrów od startu albo 0 (brak); poza [MIN_STOP, długość - STOP_END] też 0
export function cleanStop(carId, routeId, v) {
    const P = polyOf(carId, routeId); if (!P || typeof v !== 'number' || !Number.isFinite(v)) return 0;
    const r = Math.round(v); return r >= RIDE.MIN_STOP && r <= P.cum[P.cum.length - 1] - RIDE.STOP_END ? r : 0;
}
// Jazda: próbki co RIDE.DS metrów z prędkością (limit krzywizny, potem przyspieszenia w przód i w tył) i czasem dojazdu; null, gdy trasy nie ma.
// stop > 0: jazda urywa się po `stop` metrach (przed barykadą) i tam hamuje do 0,4 m/s najwyżej z przyspieszeniem RIDE.ACC (klucz pamięci podręcznej ma stop zaokrąglony do 1 m)
const stopKeys = [];
export function buildRide(carId, routeId, stop) {
    const st = stop ? cleanStop(carId, routeId, stop) : 0, key = carId + ':' + routeId + (st ? ':' + st : ''); if (cache[key] !== undefined) return cache[key];
    const P = polyOf(carId, routeId); if (!P) return (cache[key] = null);
    const poly = P.poly, cum = P.cum, len0 = cum[cum.length - 1], n0 = Math.max(2, Math.ceil(len0 / RIDE.DS)), ds = len0 / n0, pts = []; let j = 0;
    const n = st ? Math.max(2, Math.min(n0, Math.round(st / ds))) : n0;
    for (let k = 0; k <= n; k++) { const s = k * ds; while (j < poly.length - 2 && cum[j + 1] < s) j++; const seg = cum[j + 1] - cum[j], f = seg > 1e-9 ? (s - cum[j]) / seg : 0; pts.push({ x: poly[j].x + (poly[j + 1].x - poly[j].x) * f, z: poly[j].z + (poly[j + 1].z - poly[j].z) * f }); }
    const len = n * ds;
    const vmax = pts.map((p, i) => {
        const Pp = pts[Math.max(0, i - 1)], Q = pts[Math.min(n, i + 1)], ab = Math.hypot(p.x - Pp.x, p.z - Pp.z), bc = Math.hypot(Q.x - p.x, Q.z - p.z), ca = Math.hypot(Q.x - Pp.x, Q.z - Pp.z), cr = Math.abs((p.x - Pp.x) * (Q.z - Pp.z) - (p.z - Pp.z) * (Q.x - Pp.x));
        const R = cr < 1e-6 ? 1e9 : ab * bc * ca / (2 * cr); return Math.min(RIDE.VMAX, Math.sqrt(RIDE.ALAT * Math.max(R, 0.1)));
    });
    const v = vmax.slice(); v[0] = 0.4; v[n] = 0.4;
    for (let i = 1; i <= n; i++) v[i] = Math.min(v[i], Math.sqrt(v[i - 1] * v[i - 1] + 2 * RIDE.ACC * ds));
    for (let i = n - 1; i >= 0; i--) v[i] = Math.min(v[i], Math.sqrt(v[i + 1] * v[i + 1] + 2 * RIDE.ACC * ds));
    const t = [0]; for (let i = 1; i <= n; i++) t.push(t[i - 1] + ds / ((v[i - 1] + v[i]) / 2));
    if (st) { stopKeys.push(key); while (stopKeys.length > RIDE.MAX_STOPS) delete cache[stopKeys.shift()]; }
    return (cache[key] = { car: carId, route: routeId, pts: pts, v: v, t: t, len: len, T: t[n], ds: ds, name: P.name, stop: st });
}
// Jazda wpisu floty: JEDYNE miejsce, które zna stop z floty (host, goście i rysowanie liczą pozycję tym samym wywołaniem)
export const rideFor = (e) => e ? buildRide(e.id, e.route, e.stop || 0) : null;
// Pozycja i kierunek jazdy w chwili `age` (s od startu): { x, z, yaw, speed, done }
export function posAt(ride, age) {
    const n = ride.pts.length - 1, a = Math.max(0, Math.min(ride.T, Number.isFinite(age) ? age : 0));
    let lo = 0, hi = n; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (ride.t[m] <= a) lo = m; else hi = m; }
    const seg = ride.t[hi] - ride.t[lo], f = seg > 1e-9 ? (a - ride.t[lo]) / seg : 0, p = ride.pts[lo], q = ride.pts[hi];
    const x = p.x + (q.x - p.x) * f, z = p.z + (q.z - p.z) * f, speed = ride.v[lo] + (ride.v[hi] - ride.v[lo]) * f;
    const k = Math.min(n, hi + 3), kk = Math.max(0, lo - 0), dx = ride.pts[k].x - ride.pts[kk].x, dz = ride.pts[k].z - ride.pts[kk].z;
    return { x: x, z: z, yaw: Math.atan2(dx, dz), speed: speed, done: a >= ride.T };
}
// Granice jazdy (do testów komfortu): największa prędkość, przyspieszenie i przyspieszenie boczne
export function rideStats(ride) {
    let vmax = 0, amax = 0, lat = 0;
    for (let i = 0; i < ride.pts.length; i++) { vmax = Math.max(vmax, ride.v[i]); if (i > 0) { const dt = ride.t[i] - ride.t[i - 1]; amax = Math.max(amax, Math.abs(ride.v[i] - ride.v[i - 1]) / dt); } }
    for (let i = 1; i < ride.pts.length - 1; i++) { const p = ride.pts[i - 1], q = ride.pts[i], r = ride.pts[i + 1], a1 = Math.atan2(q.x - p.x, q.z - p.z), a2 = Math.atan2(r.x - q.x, r.z - q.z); let da = a2 - a1; da = Math.atan2(Math.sin(da), Math.cos(da)); lat = Math.max(lat, ride.v[i] * ride.v[i] * Math.abs(da) / ride.ds); }
    return { vmax: vmax, amax: amax, lat: lat };
}
// Postój: pozycja i kierunek z początku trasy 0; klamki z obu boków (trasa 0 z lewej, trasa 1 z prawej)
export function parkedPose(carId) { const fc = FREE_CARS.find(v => v.id === carId); if (fc) return { x: fc.park.x, z: fc.park.z, yaw: fc.park.yaw }; const r = buildRide(carId, VEHICLES.find(v => v.id === carId).routes[0].id), p = startPoint(carId); return { x: p.x, z: p.z, yaw: posAt(r, 0.01).yaw }; }
export function handlePoints(carId) {
    const pp = parkedPose(carId), sx = Math.cos(pp.yaw), sz = -Math.sin(pp.yaw);   // wektor w prawo od kierunku jazdy
    return [{ route: 0, x: pp.x - sx * 1.1, y: 1.0, z: pp.z - sz * 1.1 }, { route: 1, x: pp.x + sx * 1.1, y: 1.0, z: pp.z + sz * 1.1 }];
}
// ----- flota (host trzyma stan, goście odtwarzają migawkę) -----
export const newFleet = () => VEHICLES.map(v => ({ id: v.id, occ: null, route: '', t0: 0, stop: 0 }));
const freeCar = (c) => ({ id: c.id, occ: null, route: '', t0: 0, stop: 0 });
// Start jazdy: auto istnieje i jest wolne, trasa istnieje, pasażer nie jedzie już innym, głowa gracza blisko auta (dist w m)
export function startDrive(fleet, carId, routeId, who, now, dist, stop) {
    const car = fleet.find(c => c.id === carId);
    if (!car || !buildRide(carId, routeId)) return { fleet: fleet, ok: false, reason: 'unknown' };
    if (car.occ) return { fleet: fleet, ok: false, reason: 'taken' };
    if (fleet.some(c => c.occ === who)) return { fleet: fleet, ok: false, reason: 'busy' };
    if (!Number.isFinite(dist) || dist > RIDE.START_R) return { fleet: fleet, ok: false, reason: 'far' };
    return { fleet: fleet.map(c => c === car ? { id: c.id, occ: who, route: routeId, t0: now, stop: cleanStop(carId, routeId, stop) } : c), ok: true, reason: '' };
}
export const endDriveBy = (fleet, who) => fleet.map(c => c.occ === who ? freeCar(c) : c);
// Krok: wolnimy auta po dojeździe (z zapasem) i gdy pasażera nie ma (wyszedł z poziomu, rozłączył się); present: zbiór identyfikatorów
export function fleetStep(fleet, now, present) {
    return fleet.map(c => { if (!c.occ) return c; const r = rideFor(c); return (!r || now - c.t0 > r.T + RIDE.FREE_AFTER || !present.has(c.occ)) ? freeCar(c) : c; });
}
export const fleetSnap = (fleet, now) => fleet.filter(c => c.occ).map(c => [c.id, c.route, +(now - c.t0).toFixed(2), c.occ, c.stop || 0]);
const tidy = (id) => { const s = typeof id === 'string' ? id.replace(/[^\w:.-]/g, '').slice(0, 48) : ''; return s || null; };
// Migawka z sieci: tylko znane auta i trasy, wiek 0..MAX_AGE, najwyżej jeden wpis na auto
export function cleanVehicles(a) {
    if (!Array.isArray(a)) return [];
    const out = [], seen = new Set();
    for (const e of a.slice(0, VEHICLES.length)) {
        if (!Array.isArray(e) || typeof e[0] !== 'string' || typeof e[1] !== 'string' || seen.has(e[0]) || !routeOf(e[0], e[1]) || typeof e[2] !== 'number' || !Number.isFinite(e[2])) continue;
        const occ = tidy(e[3]); if (!occ) continue; seen.add(e[0]);
        out.push({ car: e[0], route: e[1], age: Math.max(0, Math.min(RIDE.MAX_AGE, e[2])), occ: occ, stop: cleanStop(e[0], e[1], e[4]) });
    }
    return out;
}
// Żądanie gościa: { car, route } tylko ze znanych identyfikatorów
export function cleanDrive(m) { if (!m || typeof m !== 'object') return null; if (m.route === 'drive' && isCar(m.car)) return { car: m.car, route: 'drive' }; if (!routeOf(m.car, m.route)) return null; return { car: m.car, route: m.route }; }   // route 'drive' = swobodna jazda (kradzież auta, core/drivelogic.js)
// Poprawność tras (do testów): węzły startu i celów istnieją, trasy mają długość, nigdy nie wchodzą w budynki (z marginesem), prędkości w granicach
export function vehicleProblems(buildings) {
    const bad = [], ids = new Set();
    for (const v of VEHICLES) {
        if (ids.has(v.id)) bad.push('duplicate car ' + v.id); ids.add(v.id);
        const sp = startPoint(v.id); if (!sp || Math.hypot(sp.x - v.at[0], sp.z - v.at[1]) > 6) bad.push(v.id + ': the start is far from the street');
        if (new Set(v.routes.map(r => r.id)).size !== v.routes.length || v.routes.length < 2) bad.push(v.id + ': needs two distinct routes');
        for (const r of v.routes) {
            const ride = buildRide(v.id, r.id); if (!ride) { bad.push(v.id + '/' + r.id + ': no route'); continue; }
            if (ride.len < 30 || ride.T > 90) bad.push(v.id + '/' + r.id + ': bad length or time');
            const st = rideStats(ride); if (st.vmax > RIDE.VMAX + 1e-6 || st.amax > RIDE.ACC * 1.25 || st.lat > RIDE.ALAT * 1.6) bad.push(v.id + '/' + r.id + ': violates the comfort limits ' + JSON.stringify(st));
            for (const p of ride.pts) if (buildings.some(b => p.x > b.x0 - 1.2 && p.x < b.x1 + 1.2 && p.z > b.z0 - 1.2 && p.z < b.z1 + 1.2)) { bad.push(v.id + '/' + r.id + ': the route goes through a building'); break; }
            const end = ride.pts[ride.pts.length - 1]; if (Math.hypot(end.x - r.to[0], end.z - r.to[1]) > 6) bad.push(v.id + '/' + r.id + ': the destination is far from its target');
        }
    }
    return bad;
}
