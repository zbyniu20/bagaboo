// ==========================================
// SCARY GTA: ŻYWE MIASTO (czysta logika, bez THREE): przechodnie na chodnikach i ruch uliczny, jak w prawdziwym GTA, tylko że miasto jest nocne i niepokojące.
// Wszystko jest TYLKO WIZUALNE i LOKALNE: bez ciał fizyki, bez wpisów w S.boxes (nie zasłania wzroku policji ani strzałów), bez ciepła i bez sieci; strzały i policja przechodzą przez przechodniów
// i auta (strzały rozstrzyga host, a przechodnie są lokalni, więc trafień i tak nie dałoby się zsynchronizować). Nikt tu nie łapie i nie goni gracza.
//  - Przechodnie: pojawiają się w pierścieniu 20-70 m od gracza, idą po chodnikach (graf ulic z core/cityai.js, przesunięcie 5 m od osi), znikają dalej niż 90 m. W BLACKOUCIE wszyscy w promieniu 45 m
//    zastygają i patrzą na gracza, a gdy nie patrzysz w ich stronę, skradają się o 0,45 m/s (nigdy bliżej niż 2,6 m, jak manekiny w witrynach); gdy światło wraca, ZNIKAJĄ. W hordzie miasto jest puste.
//    Na poziomie brutalności Gentle tylko zastygają i patrzą (bez skradania).
//  - Ruch: auta jeżdżą po ulicach wschód-zachód (oś ulicy, pas +-2 m, najwyżej 6,5 m/s), stają przed przeszkodą (gracz, pickup, policjant) bliżej niż 7 m z przodu, w blackoucie gasną i stoją,
//    a jedno najbliższe budzi się z włączonymi światłami (nie rusza się).
// STRZAŁY W PRZECHODNIÓW: każdy klient sprawdza tor KAŻDEGO strzału (host z własnego `hostShot`, gość z komunikatu `fx`) względem SWOICH przechodniów (są lokalni); trafiony pada i leży w kałuży
// (core/gtacorpsefx.js, rodzaj `ped`). Tor jest przycięty do pierwszej przeszkody (budynek zasłania), a przechodnie NIE zatrzymują pocisku (host ich nie zna, więc pocisk leci dalej do gracza albo policjanta).
// Bez ciepła, nagród i sieci: zabicie przechodnia nic nie kosztuje ani nie płaci, bo nie dałoby się go zweryfikować u hosta.
// 3D i zapis: core/gtacrowdfx.js (instancje). Testy: tests/logic.mjs (blok "żywe miasto"), w przeglądarce tests/gtalife.mjs.
// ==========================================
import { CITY, cityWithInteriors } from './citylayout.js';
import { streetGraph, lineBlocked } from './cityai.js';
import { seenBy } from './statuelogic.js';
const fin = (n) => typeof n === 'number' && Number.isFinite(n);
const dtOf = (dt) => Math.min(Math.max(+dt || 0, 0), 0.5);

export const LIFE = {
    PED: { high: 40, medium: 24, low: 0 }, CARS: { high: 8, medium: 5, low: 0 },
    RING: [20, 70], DESPAWN: 90, WALK: [1.0, 1.5], SIDEWALK: 5.0, FREEZE_R: 45, CREEP: 0.45, KEEP: 2.6,
    LANE: 2.8, CAR_SPEED: [4.5, 6.5], CAR_STOP: 7, CAR_LAT: 2.6, CAR_ACC: 3, CAR_BRAKE: 6, CAR_RING: [30, 85], CAR_DESPAWN: 105, HAUNT_R: 45
};
export function lifeCounts(quality, calm) {
    if (calm) return { ped: 0, cars: 0 };
    return { ped: fin(LIFE.PED[quality]) ? LIFE.PED[quality] : LIFE.PED.medium, cars: fin(LIFE.CARS[quality]) ? LIFE.CARS[quality] : LIFE.CARS.medium };
}

// ----- odcinki ulic z grafu (oś ulicy), po których chodzą przechodnie i jeżdżą auta -----
/** @type {any[] | null} */
let SEGS = null;
export function lifeSegs() {
    if (SEGS) return SEGS;
    const g = streetGraph();
    const B = cityWithInteriors(1337), inside = (x, z, m) => B.some(q => x > q.x0 - m && x < q.x1 + m && z > q.z0 - m && z < q.z1 + m);
    const sideOk = (s, side) => { for (let t = 0; t <= 1.0001; t += 3 / s.len) { const x = s.ax + s.ux * s.len * Math.min(1, t) - s.uz * side * LIFE.SIDEWALK, z = s.az + s.uz * s.len * Math.min(1, t) + s.ux * side * LIFE.SIDEWALK; if (x < CITY.X0 + 1 || x > CITY.X1 - 1 || z < CITY.Z0 + 1 || z > CITY.Z1 - 1 || inside(x, z, 0.6)) return false; } return true; };
    SEGS = g.edges.map(([a, b]) => { const A = g.nodes[a], B = g.nodes[b], dx = B.x - A.x, dz = B.z - A.z, len = Math.hypot(dx, dz); return { ax: A.x, az: A.z, bx: B.x, bz: B.z, len: len, ux: len ? dx / len : 1, uz: len ? dz / len : 0, ew: Math.abs(dz) < 1e-6 }; }).filter(s => s.len > 1);
    for (const s of SEGS) s.ok = { '-1': sideOk(s, -1), '1': sideOk(s, 1) };
    return SEGS;
}
// Punkt na odcinku: t od 0 do 1, off = przesunięcie w bok od osi (dodatnie to lewa strona względem kierunku a -> b)
export const onSeg = (s, t, off) => ({ x: s.ax + s.ux * s.len * t - s.uz * off, z: s.az + s.uz * s.len * t + s.ux * off });
// Linie ulic wschód-zachód: { z, x0, x1 } (auta jeżdżą tylko po nich, więc nie ma skrzyżowań z ruchem poprzecznym)
/** @type {any[] | null} */
let LINES = null;
export function carLines() {
    if (LINES) return LINES;
    const by = {};
    for (const s of lifeSegs()) if (s.ew) { const k = s.az.toFixed(1), l = by[k] || (by[k] = { z: s.az, x0: 1e9, x1: -1e9 }); l.x0 = Math.min(l.x0, s.ax, s.bx); l.x1 = Math.max(l.x1, s.ax, s.bx); }
    LINES = Object.values(by).filter(l => l.z - LIFE.LANE >= CITY.Z0 + 1 && l.z + LIFE.LANE <= CITY.Z1 - 1).sort((a, b) => a.z - b.z);
    return LINES;
}

// ----- przechodnie -----
const turnToward = (cur, target, k) => { let d = target - cur; d = Math.atan2(Math.sin(d), Math.cos(d)); return cur + d * Math.min(1, k); };
export function spawnPed(R, px, pz) {
    const rnd = R || Math.random, segs = lifeSegs();
    for (let i = 0; i < 30; i++) {
        const si = Math.floor(rnd() * segs.length) % segs.length, s = segs[si], t = rnd(), side = rnd() < 0.5 ? -1 : 1;
        if (!s.ok[side]) continue;
        const pt = onSeg(s, t, side * LIFE.SIDEWALK), d = Math.hypot(pt.x - px, pt.z - pz);
        if (d < LIFE.RING[0] || d > LIFE.RING[1]) continue;
        const dir = rnd() < 0.5 ? 1 : -1;
        return { s: si, t: t, dir: dir, side: side, speed: LIFE.WALK[0] + rnd() * (LIFE.WALK[1] - LIFE.WALK[0]), hue: Math.floor(rnd() * 6) % 6, x: pt.x, z: pt.z, yaw: Math.atan2(dir * s.ux, dir * s.uz), headYaw: Math.atan2(dir * s.ux, dir * s.uz), mode: 'walk', ox: 0, oz: 0, gone: false, bob: rnd() * 6.28 };
    }
    return null;
}
// ctx: { px, pz, lx, lz (kierunek patrzenia gracza), night: 'calm'|'blackout'|'horde', gentle }; zmienia p (p.gone = true oznacza "usuń i odrodź")
export function pedStep(p, dt, ctx) {
    const d = dtOf(dt), s = lifeSegs()[p.s]; if (!s || !fin(ctx.px) || !fin(ctx.pz)) { p.gone = true; return p; }
    if (ctx.night === 'horde') { p.gone = true; return p; }
    const base = onSeg(s, p.t, p.side * LIFE.SIDEWALK); p.x = base.x + p.ox; p.z = base.z + p.oz;
    const dist = Math.hypot(ctx.px - p.x, ctx.pz - p.z);
    if (ctx.night === 'blackout' && dist < LIFE.FREEZE_R) {
        p.mode = 'freeze'; p.bob += 0;
        const face = Math.atan2(ctx.px - p.x, ctx.pz - p.z); p.headYaw = turnToward(p.headYaw, face, 3 * d); p.yaw = turnToward(p.yaw, face, 0.8 * d);
        if (!ctx.gentle && dist > LIFE.KEEP && !seenBy(ctx.px, ctx.pz, ctx.lx, ctx.lz, p.x, p.z)) { const step = Math.min(LIFE.CREEP * d, dist - LIFE.KEEP); p.ox += (ctx.px - p.x) / dist * step; p.oz += (ctx.pz - p.z) / dist * step; p.x = base.x + p.ox; p.z = base.z + p.oz; }
        return p;
    }
    if (p.mode === 'freeze') { p.gone = true; return p; }   // światło wraca: zastygli znikają
    p.t += p.dir * p.speed * d / s.len; p.bob += d * 7;
    if (p.t < 0 || p.t > 1) { p.t = Math.min(1, Math.max(0, p.t)); p.dir = -p.dir; }
    p.yaw = Math.atan2(p.dir * s.ux, p.dir * s.uz); p.headYaw = p.yaw;
    const nb = onSeg(s, p.t, p.side * LIFE.SIDEWALK); p.x = nb.x; p.z = nb.z;
    if (dist > LIFE.DESPAWN) p.gone = true;
    return p;
}

// ----- ruch uliczny -----
export function spawnCar(R, px, pz) {
    const rnd = R || Math.random, lines = carLines(); if (!lines.length) return null;
    for (let i = 0; i < 30; i++) {
        const l = lines[Math.floor(rnd() * lines.length) % lines.length], dir = rnd() < 0.5 ? 1 : -1, x = l.x0 + rnd() * (l.x1 - l.x0), z = l.z + dir * LIFE.LANE, d = Math.hypot(x - px, z - pz);
        if (d < LIFE.CAR_RING[0] || d > LIFE.CAR_RING[1]) continue;
        return { z: z, x: x, dir: dir, v: 0, speed: LIFE.CAR_SPEED[0] + rnd() * (LIFE.CAR_SPEED[1] - LIFE.CAR_SPEED[0]), tint: Math.floor(rnd() * 5) % 5, x0: l.x0, x1: l.x1, dead: false, haunted: false, gone: false };
    }
    return null;
}
// ctx: { px, pz, night, obstacles: [{ x, z }] }; auto rozpędza się do swojej prędkości, hamuje przed przeszkodą z przodu, w blackoucie staje i gaśnie
export function carStep(c, dt, ctx) {
    const d = dtOf(dt); if (!fin(ctx.px) || !fin(ctx.pz)) { c.gone = true; return c; }
    c.dead = ctx.night === 'blackout';
    let target = c.dead || ctx.night === 'horde' ? 0 : c.speed;
    for (const o of ctx.obstacles || []) { const along = (o.x - c.x) * c.dir, lat = Math.abs(o.z - c.z); if (along > 0 && along < LIFE.CAR_STOP && lat < LIFE.CAR_LAT) { target = 0; break; } }
    const dv = target - c.v; c.v += Math.max(-LIFE.CAR_BRAKE * d, Math.min(LIFE.CAR_ACC * d, dv));
    if (c.v < 0.01) c.v = 0;
    c.x += c.dir * c.v * d;
    if (c.x < c.x0 - 12 || c.x > c.x1 + 12 || Math.hypot(c.x - ctx.px, c.z - ctx.pz) > LIFE.CAR_DESPAWN) c.gone = true;
    return c;
}
// Indeks auta, które budzi się z włączonymi światłami w blackoucie (najbliższe w promieniu HAUNT_R), albo -1
export function hauntedCar(cars, px, pz) {
    let best = -1, bd = LIFE.HAUNT_R;
    cars.forEach((c, i) => { const d = Math.hypot(c.x - px, c.z - pz); if (d < bd) { bd = d; best = i; } });
    return best;
}
// Jasność instancji: żywe auto 1, martwe 0,18, obudzone 1,9 (kolor instancji mnoży kolory wierzchołków, światła mają wartości powyżej 1)
export const carBright = (c) => c.haunted ? 1.9 : (c.dead ? 0.18 : 1);

// ----- kontrola rozmieszczenia (używa jej test) -----
export function lifeProblems() {
    const bad = [], B = cityWithInteriors(1337), segs = lifeSegs(), lines = carLines();
    const inside = (x, z, m) => B.some(b => x > b.x0 - m && x < b.x1 + m && z > b.z0 - m && z < b.z1 + m);
    if (segs.length < 20) bad.push('too few street segments');
    if (lines.length < 3) bad.push('too few east-west streets for the traffic');
    if (segs.every(q => !q.ok['-1'] && !q.ok['1'])) bad.push('no usable sidewalk anywhere');
    if (segs.filter(q => q.ok['-1'] || q.ok['1']).length < 12) bad.push('too few usable sidewalk segments');
    for (const l of lines) for (let x = l.x0; x <= l.x1; x += 4) for (const dir of [-1, 1]) if (inside(x, l.z + dir * LIFE.LANE, 0.8)) { bad.push('a traffic lane runs through a building at z ' + l.z); break; }
    for (const l of lines) if (Math.abs(LIFE.LANE) < 2.6) bad.push('traffic lanes would touch the ghost limo path on the boulevard (z 40)');
    if (LIFE.SIDEWALK + 1 > CITY.STREET / 2) bad.push('the sidewalk offset leaves no margin to the buildings');
    if (!(LIFE.PED.high >= LIFE.PED.medium && LIFE.PED.medium > LIFE.PED.low && LIFE.CARS.high >= LIFE.CARS.medium && LIFE.CARS.medium > LIFE.CARS.low)) bad.push('counts must fall with quality');
    if (LIFE.CAR_SPEED[1] > 7) bad.push('traffic must stay slow (comfort)');
    return bad;
}

// ----- strzały i potrącenia przechodniów (czysta geometria; testy: tests/logic.mjs, blok "przechodnie") -----
export const PED_HIT = { R: 0.4, H: 1.85, HEAD: 1.45 };
const lerp3 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
// Odcinek o -> e przycięty do pierwszej przeszkody z `boxes` (dzielenie połówkowe, bo lineBlocked odpowiada tylko tak lub nie)
export function clipSegment(o, e, boxes) {
    if (!Array.isArray(boxes) || !boxes.length || !lineBlocked(o, e, boxes)) return e.slice();
    let lo = 0, hi = 1; for (let i = 0; i < 14; i++) { const m = (lo + hi) / 2; if (lineBlocked(o, lerp3(o, e, m), boxes)) hi = m; else lo = m; }
    return lerp3(o, e, lo);
}
// Pierwszy przechodzień trafiony odcinkiem o -> e (pionowy walec o promieniu PED_HIT.R i wysokości PED_HIT.H): { i, t, zone, x, z } albo null
export function pedHit(peds, o, e) {
    if (!Array.isArray(peds) || !Array.isArray(o) || !Array.isArray(e) || ![...o, ...e].every(fin)) return null;
    const dx = e[0] - o[0], dy = e[1] - o[1], dz = e[2] - o[2], a = dx * dx + dz * dz; let best = null;
    for (let i = 0; i < peds.length; i++) {
        const p = peds[i]; if (!p || p.gone || !fin(p.x) || !fin(p.z)) continue;
        const ox = o[0] - p.x, oz = o[2] - p.z, c = ox * ox + oz * oz - PED_HIT.R * PED_HIT.R;
        let t0 = 0, t1 = 1;
        if (a > 1e-9) { const b = 2 * (ox * dx + oz * dz), disc = b * b - 4 * a * c; if (disc < 0) continue; const sq = Math.sqrt(disc); t0 = Math.max(0, (-b - sq) / (2 * a)); t1 = Math.min(1, (-b + sq) / (2 * a)); }
        else if (c > 0) continue;   // strzał pionowy: tylko gdy zaczyna się nad walcem
        if (t0 > t1) continue;
        if (Math.abs(dy) > 1e-9) { const ya = (0 - o[1]) / dy, yb = (PED_HIT.H - o[1]) / dy; t0 = Math.max(t0, Math.min(ya, yb)); t1 = Math.min(t1, Math.max(ya, yb)); if (t0 > t1) continue; }
        else if (o[1] < 0 || o[1] > PED_HIT.H) continue;
        if (best && t0 >= best.t) continue;
        const y = o[1] + dy * t0; best = { i: i, t: t0, zone: y > PED_HIT.HEAD ? 'head' : 'body', x: p.x, z: p.z };
    }
    return best;
}
// Strzał z przycięciem do przeszkód: pierwszy przechodzień na torze albo null
export const shootPeds = (peds, o, e, boxes) => pedHit(peds, o, clipSegment(o, e, boxes));
// Przechodnie w promieniu r od punktu (auto na nich najeżdża): indeksy
export function pedsNear(peds, x, z, r) { const out = []; if (!Array.isArray(peds) || !fin(x) || !fin(z) || !fin(r)) return out; for (let i = 0; i < peds.length; i++) { const p = peds[i]; if (p && !p.gone && Math.hypot(p.x - x, p.z - z) <= r) out.push(i); } return out; }
