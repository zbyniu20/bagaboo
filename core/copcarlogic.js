// ==========================================
// SCARY GTA: RADIOWOZY OD 4 GWIAZDEK (czysta logika, bez THREE i sieci; testy: tests/logic.mjs (blok "radiowozy"), w przeglądarce tests/copcars.mjs). Od 4 gwiazdek (4★ jeden, 5★ dwa) jeżdżą po GRAFIE ULIC (core/cityai.js)
// radiowozy i ścigają gracza z najwyższym poziomem poszukiwania. Liczy je TYLKO host (albo solo), goście dostają migawkę [x, z, yaw, v] i je interpolują.
// Jadą wolniej niż kradzione auto (6,0 wobec 7,0 m/s): ucieczka jest możliwa, a w VR nie ma nagłych ruchów (przyspieszenie i boczne przyspieszenie są ograniczone, światła stałe, bez stroba).
// Nie popychają auta gracza (kierowca jest autorytatywny, host nie ruszy jego pozy): radiowozy są dla jego jazdy PRZESZKODĄ (okręgi w `blockers` lokalnego `driveStep`), a gracz w aucie jest ZABLOKOWANY (BUSTED), gdy
// jego auto stoi (wolniej niż PIN_V) w zasięgu radiowozu przez PIN_T sekund. Gracz pieszy nie jest rozjeżdżany: radiowóz staje w pobliżu i wysadza dwóch policjantów (raz na UNLOAD_CD sekund).
// Radiowóz stoi przed przeszkodą (inny radiowóz, auto gracza) zamiast przez nią przejeżdżać, dojeżdża na STOP_GAP do auta gracza.
// ==========================================
import { streetGraph, nearestNode, findPath } from './cityai.js';
export const CC = { V: 6.0, ACC: 2.5, BRAKE: 4, ALAT: 3, L: 2.8, STEER_MAX: 0.6, LOOK: 8, STOP_GAP: 3.8, FOLLOW_GAP: 6, R: 1.1, HALF: 1.25, SPAWN_MIN: 70, SPAWN_MAX: 135, MAX: 3, WANT: { 4: 1, 5: 2 }, WANT_MIN_STARS: 4, KEEP_STARS: 3, LEAVE_T: 14, LEAVE_DIST: 80, LEAVE_MAX: 40, SPAWN_CD: 8, REPATH: 1.2, DIRECT: 18, ARRIVE_FOOT: 9, UNLOAD_N: 2, UNLOAD_CD: 25, PIN_R: 5.6, PIN_V: 1.2, PIN_T: 2, MAX_COORD: 400, MAX_DT: 0.1 };
const fin = (n) => typeof n === 'number' && Number.isFinite(n);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
let GR = null; const graph = () => GR || (GR = streetGraph());
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
export const wantCars = (stars) => CC.WANT[stars] || (stars > 5 ? CC.WANT[5] : 0);
export const newFleet = () => ({ cars: [], leaveT: 0, spawnCd: 0, nextId: 1 });
export function newCar(id, node, toward) {
    const n = graph().nodes[node], tw = toward || n; let yaw = Math.atan2(tw.x - n.x, tw.z - n.z); if (!fin(yaw) || (tw.x === n.x && tw.z === n.z)) yaw = 0;
    return { id: id, x: n.x, z: n.z, yaw: yaw, v: 0, path: [], pi: 0, goal: -1, repath: 0, unloadCd: 0, leave: false, leaveT: 0, age: 0 };
}
const ahead = (c, o) => { const dx = o.x - c.x, dz = o.z - c.z, f = dx * Math.sin(c.yaw) + dz * Math.cos(c.yaw), s = Math.abs(dx * Math.cos(c.yaw) - dz * Math.sin(c.yaw)); return { f: f, s: s, d: Math.hypot(dx, dz) }; };
// Krok jednego radiowozu. o = { target: {x,z,v,car}|null, obstacles: [{x,z,r}], clear(x1,z1,x2,z2) -> bool (czy linia wolna od budynków), leaving: bool }. Zwraca { unload: bool }
export function carStep(c, dt, o) {
    const g = graph(), d = clamp(fin(dt) ? dt : 0, 0, CC.MAX_DT); c.age += d; c.unloadCd = Math.max(0, c.unloadCd - d); c.repath -= d;
    const tg = o.target; let unload = false, goalPt = null, vt = CC.V;
    if (o.leaving || !tg) {   // odjeżdża: do najdalszego węzła od celu (albo stoi, gdy nie ma celu)
        if (c.goal < 0 || c.repath <= 0) { const from = tg || { x: c.x, z: c.z }; let b = 0, bd = -1; g.nodes.forEach((n, i) => { const dd = Math.hypot(n.x - from.x, n.z - from.z); if (dd > bd) { bd = dd; b = i; } }); c.goal = b; c.path = findPath(g, nearestNode(g, c.x, c.z), b); c.pi = 1; c.repath = 6; }
    } else {
        const dist = Math.hypot(tg.x - c.x, tg.z - c.z), gn = nearestNode(g, tg.x, tg.z);
        if (c.goal !== gn || c.repath <= 0) { c.goal = gn; c.path = findPath(g, nearestNode(g, c.x, c.z), gn); c.pi = 1; c.repath = CC.REPATH; }
        if (!tg.car && dist < CC.ARRIVE_FOOT + 4 && (dist < CC.ARRIVE_FOOT || (o.clear && o.clear(c.x, c.z, tg.x, tg.z)))) { vt = 0; if (c.unloadCd <= 0 && c.v < 0.6) { unload = true; c.unloadCd = CC.UNLOAD_CD; } }   // pieszy: staje i wysadza policjantów
        else if (dist < CC.DIRECT && (!o.clear || o.clear(c.x, c.z, tg.x, tg.z))) { goalPt = { x: tg.x, z: tg.z }; if (tg.car) { const gap = dist - CC.STOP_GAP; vt = gap <= 0 ? 0 : Math.min(CC.V, Math.max(tg.v + 1.5, gap * 1.2)); } }
    }
    if (!goalPt) {   // następny punkt trasy w grafie (z wyprzedzeniem, żeby zakręty nie były ostre)
        while (c.pi < c.path.length) { const n = g.nodes[c.path[c.pi]]; if (Math.hypot(n.x - c.x, n.z - c.z) < CC.LOOK && c.pi < c.path.length - 1) c.pi++; else break; }
        const n = c.path[c.pi] !== undefined ? g.nodes[c.path[c.pi]] : null; goalPt = n ? { x: n.x, z: n.z } : null;
    }
    // sterowanie: kierunek do punktu, skręt ograniczony przyspieszeniem bocznym, prędkość zwalniana przy dużym błędzie kursu
    let alpha = 0; if (goalPt) { alpha = wrap(Math.atan2(goalPt.x - c.x, goalPt.z - c.z) - c.yaw); vt = Math.min(vt, CC.V * (1 - 0.65 * clamp(Math.abs(alpha) / 1.3, 0, 1))); } else vt = 0;
    for (const ob of (o.obstacles || [])) { const a = ahead(c, ob); if (a.f > 0 && a.s < ob.r + CC.R + 0.6 && a.f < CC.STOP_GAP + ob.r + c.v * 0.9) { vt = a.f < CC.STOP_GAP + ob.r ? 0 : Math.min(vt, Math.max(0, (a.f - CC.STOP_GAP - ob.r) * 1.4)); } }
    const dv = vt > c.v ? CC.ACC * d : -CC.BRAKE * d; c.v = clamp(Math.abs(vt - c.v) < Math.abs(dv) ? vt : c.v + dv, 0, CC.V);
    if (goalPt && c.v > 0.05) { const maxRate = Math.min(CC.ALAT / Math.max(c.v, 1), c.v * Math.tan(CC.STEER_MAX) / CC.L); c.yaw = wrap(c.yaw + clamp(alpha * 3, -maxRate, maxRate) * d); }
    else if (goalPt && c.v <= 0.05 && Math.abs(alpha) > 0.5 && vt > 0) c.v = 0.3;   // stoi bokiem do celu: ruszy bardzo wolno i się obróci
    c.x += Math.sin(c.yaw) * c.v * d; c.z += Math.cos(c.yaw) * c.v * d;
    return { unload: unload };
}
// Flota: o = { stars (najwyższy poziom), lead: {x,z,v,car}|null, players: [{x,z}], obstaclesFor(c) -> [{x,z,r}], clear, rand }; zwraca { unloads: [{ x, z, tx, tz, n }], spawned, removed }
export function fleetStep(F, dt, o) {
    const g = graph(), d = clamp(fin(dt) ? dt : 0, 0, CC.MAX_DT), want = wantCars(o.stars || 0), players = o.players || [], res = { unloads: [], spawned: 0, removed: 0 };
    F.spawnCd = Math.max(0, F.spawnCd - d); F.leaveT = (o.stars || 0) < CC.KEEP_STARS ? F.leaveT + d : 0;
    const leaving = F.leaveT > CC.LEAVE_T || !o.lead;
    if (!leaving && F.cars.length < want && F.spawnCd <= 0 && o.lead) {   // nowy radiowóz wyjeżdża z węzła daleko od WSZYSTKICH graczy (poza widokiem), w pierścieniu wokół celu
        const ok = []; g.nodes.forEach((n, i) => { const dl = Math.hypot(n.x - o.lead.x, n.z - o.lead.z); if (dl >= CC.SPAWN_MIN && dl <= CC.SPAWN_MAX && players.every(p => Math.hypot(n.x - p.x, n.z - p.z) >= CC.SPAWN_MIN) && !F.cars.some(q => Math.hypot(q.x - n.x, q.z - n.z) < 20)) ok.push(i); });
        if (ok.length) { const i = ok[Math.floor((o.rand || Math.random)() * ok.length) % ok.length]; F.cars.push(newCar(F.nextId++, i, o.lead)); F.spawnCd = CC.SPAWN_CD; res.spawned++; }
    }
    for (const c of F.cars) {
        if (leaving) c.leave = true;
        if (c.leave) c.leaveT += d;
        const r = carStep(c, d, { target: o.lead, obstacles: o.obstaclesFor ? o.obstaclesFor(c) : [], clear: o.clear, leaving: c.leave });
        if (r.unload) res.unloads.push({ x: c.x, z: c.z, tx: o.lead.x, tz: o.lead.z, n: CC.UNLOAD_N });
    }
    const before = F.cars.length;
    F.cars = F.cars.filter(c => !(c.leave && (players.length === 0 || players.every(p => Math.hypot(c.x - p.x, c.z - p.z) > CC.LEAVE_DIST) || c.leaveT > CC.LEAVE_MAX)));
    res.removed = before - F.cars.length; return res;
}
// BUSTED w aucie: auto gracza stoi (wolniej niż PIN_V) w zasięgu PIN_R radiowozu przez PIN_T s. pins: mapa id -> sekundy (mutowana); players: [{ id, x, z, inCar, speed }]
export function pinStep(pins, dt, cars, players) {
    const d = clamp(fin(dt) ? dt : 0, 0, 0.5), busts = [];
    for (const p of players) {
        const near = p.inCar && p.speed < CC.PIN_V && cars.some(c => Math.hypot(c.x - p.x, c.z - p.z) < CC.PIN_R);
        pins[p.id] = near ? (pins[p.id] || 0) + d : Math.max(0, (pins[p.id] || 0) - d * 2); if (pins[p.id] >= CC.PIN_T) { pins[p.id] = 0; busts.push(p.id); }
    }
    for (const k of Object.keys(pins)) if (!pins[k] && !players.some(p => p.id === k)) delete pins[k];
    return busts;
}
// Okręgi do kolizji z autem gracza (przód i tył radiowozu)
export const blockersOf = (cars) => { const out = []; for (const c of cars) for (const o of [CC.HALF, -CC.HALF]) out.push({ x: c.x + Math.sin(c.yaw) * o, z: c.z + Math.cos(c.yaw) * o, r: CC.R }); return out; };
// Migawka dla gości i jej czyszczenie
export const snap = (F) => F.cars.map(c => [+c.x.toFixed(2), +c.z.toFixed(2), +c.yaw.toFixed(3), +c.v.toFixed(2)]);
export function cleanCruisers(a) {
    if (!Array.isArray(a)) return [];
    const out = []; for (const e of a.slice(0, 4)) { if (!Array.isArray(e) || e.length < 4 || !e.slice(0, 4).every(fin) || Math.abs(e[0]) > CC.MAX_COORD || Math.abs(e[1]) > CC.MAX_COORD || Math.abs(e[2]) > 20) continue; out.push({ x: e[0], z: e[1], yaw: wrap(e[2]), v: clamp(e[3], 0, CC.V) }); }
    return out;
}
export function copCarProblems() {
    const bad = [], g = graph(); if (CC.V >= 7) bad.push('cruisers must be slower than a stolen car'); if (CC.ALAT > 3.5 || CC.ACC > 3) bad.push('cruiser accelerations are too sharp');
    if (!(wantCars(4) === 1 && wantCars(5) === 2 && wantCars(3) === 0 && wantCars(0) === 0)) bad.push('the cruiser count per star level is wrong');
    if (!g.nodes.some(n => g.nodes.some(m => Math.hypot(n.x - m.x, n.z - m.z) > CC.SPAWN_MAX))) bad.push('the city is too small for the spawn ring');
    return bad;
}
