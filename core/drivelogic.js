// ==========================================
// SCARY GTA: SWOBODNA JAZDA SKRADZIONYM AUTEM (czysta logika, bez THREE i sieci). Model ARCADE (kinematyczny rowerowy), nie fizyka kół: ciało gracza porusza się skryptem (collisionFilterMask 0),
// więc zawieszenie i koła Cannona walczyłyby z własnymi kolizjami. KOMFORT VR bierze stałe z jazdy po szynach (`RIDE` w core/vehiclelogic.js: prędkość najwyżej 7 m/s, przyspieszenie 2 m/s^2,
// przyspieszenie boczne 2 m/s^2) i pilnuje ich ASYSTĄ KRZYWIZNY: prędkość nie przekracza sqrt(ALAT / krzywizna) (liczonej z WIĘKSZEGO z aktualnego i zadanego skrętu, więc auto zwalnia, zanim skręt się
// wybierze), a skręt narasta z ograniczoną szybkością. Kamera NIGDY się nie obraca (obraca się tylko auto pod graczem); ciało stoi przy TYLNEJ osi (`BED_BACK`), gdzie zakręt przesuwa je najmniej.
// Kolizje: trzy okręgi (przód, środek, tył) wypychane z prostokątów (budynki, auta, przeszkody) i z granic miasta; uderzenie zbija prędkość. Wejście: gaz, hamulec/wsteczny i skręt (-1 lewo, +1 prawo; zob. `cleanInput`).
// Konwencja kierunku jak w jeździe po szynach: yaw = atan2(dx, dz), przód = (sin yaw, cos yaw), więc WZROST yaw to skręt w LEWO kierowcy; skręt w prawo zmniejsza yaw.
// Kierowca liczy auto LOKALNIE (bez opóźnienia wejścia), host tylko waliduje i przekazuje pozę (`cleanPose`, `poseOk`), a inni klienci interpolują (`blendPose`).
// Testy: tests/logic.mjs (blok "jazda"), w przeglądarce tests/drive.mjs.
// ==========================================
import { RIDE, kindOf } from './vehiclelogic.js';
export const DRIVE = {
    L: 2.8, VMAX: RIDE.VMAX, REV_MAX: 2.5, ACC: RIDE.ACC, BRAKE: 3.0, COAST: 1.0, ALAT: RIDE.ALAT,
    STEER_MAX: 0.55, STEER_RATE: 1.1, STEER_BACK: 1.8, MAX_DT: 0.05,
    CIRCLES: [1.35, 0, -1.35], R: 1.08, BOUNCE: 0.25, SCRAPE: 0.9, MARGIN: 1.6,
    BED_BACK: 1.1, DOOR: { SIDE: 1.1, FWD: 1.2, R: 0.6 }, RUN_V: 2.2, RUN_R: 1.15, RUN_AHEAD: 1.9,
    RETURN_AFTER: 45, FAR: 40, MAX_COORD: 400, POSE_RATE: 8, POSE_SLACK: 1.5
};
// Parametry aut (rodzaj -> nadpisania DRIVE): różnią się wolniejszą jazdą, skrętem, rozmiarem i pokładem, ale NIGDY nie są szybsze ani bardziej gwałtowne niż limit komfortu RIDE (prędkość, przyspieszenie, boczne)
export const SPECS = {
    pickup: { SEAT: [{ back: 1.85, side: -0.3 }] },
    hauler: { L: 3.6, VMAX: 5.5, STEER_MAX: 0.45, STEER_RATE: 0.9, CIRCLES: [1.9, 0, -1.9], R: 1.15, BED_BACK: 1.5, DOOR: { SIDE: 1.25, FWD: 1.8, R: 0.6 }, DECK: 1.0, SEAT: [{ back: 2.4, side: -0.55 }, { back: 2.4, side: 0.55 }] },
    buggy: { L: 2.2, STEER_MAX: 0.7, STEER_RATE: 1.4, STEER_BACK: 2.2, CIRCLES: [0.95, 0, -0.95], R: 0.9, BED_BACK: 0.7, DOOR: { SIDE: 0.95, FWD: 0.5, R: 0.6 }, RUN_AHEAD: 1.5, DECK: 0.5, SEAT: [{ back: 0.7, side: -0.6 }] },
    moto: { L: 1.6, STEER_MAX: 0.6, STEER_RATE: 1.6, STEER_BACK: 2.4, CIRCLES: [0.7, -0.7], R: 0.55, BED_BACK: 0.3, DOOR: { SIDE: 0.6, FWD: 0.1, R: 0.55 }, RUN_AHEAD: 1.2, RUN_R: 0.8, DECK: 0.45, SEAT: [] }
};
for (const k of Object.keys(SPECS)) { SPECS[k] = Object.assign({}, DRIVE, { DECK: RIDE.BED_Y, SEAT: [] }, SPECS[k]); SPECS[k].SEATS = SPECS[k].SEAT.length; }
export const specOf = (kind) => SPECS[kind] || SPECS.pickup;
const fin = (n) => typeof n === 'number' && Number.isFinite(n);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const newCar = (x, z, yaw) => ({ x: fin(x) ? x : 0, z: fin(z) ? z : 0, yaw: fin(yaw) ? yaw : 0, v: 0, steer: 0 });
// Wejście od gracza (z VR albo klawiatury): tylko skończone liczby w granicach, śmieci to zero
export function cleanInput(i) {
    const o = i && typeof i === 'object' ? i : {};
    return { gas: fin(o.gas) ? clamp(o.gas, 0, 1) : 0, brake: fin(o.brake) ? clamp(o.brake, 0, 1) : 0, steer: fin(o.steer) ? clamp(o.steer, -1, 1) : 0 };
}
// Krzywizna (1/m) przy skręcie steer (-1..1)
export const curvature = (steer, sp) => { const q = sp || DRIVE; return Math.tan(clamp(steer, -1, 1) * q.STEER_MAX) / q.L; };
// Największa prędkość, jaką wolno jechać przy skręcie steer (asysta krzywizny: przyspieszenie boczne nie większe niż ALAT)
export const speedLimit = (steer, sp) => { const q = sp || DRIVE, k = Math.abs(curvature(steer, q)); return k < 1e-6 ? q.VMAX : Math.min(q.VMAX, Math.sqrt(q.ALAT / k)); };
// Największy dopuszczalny skręt (-1..1 w skali STEER_MAX) przy prędkości v: skręt zależny od prędkości (jak w grach wyścigowych), więc przyspieszenie boczne v^2 * krzywizna nigdy nie przekracza ALAT
export const steerLimit = (v, sp) => { const q = sp || DRIVE, a = Math.abs(v); return a < 0.1 ? 1 : clamp(Math.atan(q.L * q.ALAT / (a * a)) / q.STEER_MAX, 0, 1); };
export const forward = (yaw) => ({ x: Math.sin(yaw), z: Math.cos(yaw) });
const lateral = (yaw) => ({ x: Math.cos(yaw), z: -Math.sin(yaw) });   // w stronę lewej ręki kierowcy (jak wektor `s` klamek w vehiclelogic.js)
export const circles = (car, sp) => { const q = sp || DRIVE, f = forward(car.yaw); return q.CIRCLES.map(d => ({ x: car.x + f.x * d, z: car.z + f.z * d, r: q.R })); };
// Ciało gracza: przy tylnej osi (przesunięte do tyłu od środka auta)
export const bodyPos = (car, sp) => { const q = sp || DRIVE, f = forward(car.yaw); return { x: car.x - f.x * q.BED_BACK, z: car.z - f.z * q.BED_BACK }; };
// Drzwi kierowcy (lewa strona, przy kabinie): dotknięcie dłonią zabiera gracza za kierownicę
export const doorPoint = (car, sp) => { const q = sp || DRIVE, f = forward(car.yaw), s = lateral(car.yaw); return { x: car.x + s.x * q.DOOR.SIDE + f.x * q.DOOR.FWD, z: car.z + s.z * q.DOOR.SIDE + f.z * q.DOOR.FWD }; };
// PASAŻER: miejsca na pokładzie za kierowcą (SPEC.SEAT: odległość do tyłu od środka auta i przesunięcie w bok, ujemne = po prawej kierowcy); dotknięcie miejsca dłonią wsadza gracza (host sprawdza `boardCheck`)
export const BOARD = { R: 3.4, V: 2, TOUCH_R: 0.7, MAX_AGE: 0.35 };
export const seatPos = (car, sp, k) => { const q = sp || DRIVE, st = q.SEAT && q.SEAT[k]; if (!st) return null; const f = forward(car.yaw), s = lateral(car.yaw); return { x: car.x - f.x * st.back + s.x * st.side, z: car.z - f.z * st.back + s.z * st.side }; };
// Poza auta przesunięta o `age` s do przodu wg prędkości (dla pasażera: 8 Hz migawki bez schodków), najwyżej BOARD.MAX_AGE
export const extrapolate = (p, age) => { const a = clamp(fin(age) ? age : 0, 0, BOARD.MAX_AGE), f = forward(p.yaw), v = fin(p.v) ? p.v : 0; return { x: p.x + f.x * v * a, z: p.z + f.z * v * a, yaw: p.yaw, v: v }; };
// Czy `who` może wsiąść: o = { car: { pose: {x,z,yaw,v}, driver, pass: [id|null...], spec }, who, head: {x,z}, busy } -> { ok, reason, seat }. Pierwsze wolne miejsce, głowa najwyżej BOARD.R od niego (z widoku hosta), auto jedzie wolniej niż BOARD.V
export function boardCheck(o) {
    const c = o && o.car; if (!c || !c.pose || !c.spec) return { ok: false, reason: 'unknown', seat: -1 };
    if (!c.driver) return { ok: false, reason: 'nodriver', seat: -1 }; if (c.driver === o.who) return { ok: false, reason: 'self', seat: -1 };
    if (o.busy) return { ok: false, reason: 'busy', seat: -1 }; if (!c.spec.SEATS) return { ok: false, reason: 'noseat', seat: -1 };
    if (!o.head || !fin(o.head.x) || !fin(o.head.z)) return { ok: false, reason: 'nohead', seat: -1 };
    if (Math.abs(c.pose.v || 0) > BOARD.V) return { ok: false, reason: 'fast', seat: -1 };
    const pass = c.pass || []; let seat = -1; for (let k = 0; k < c.spec.SEATS; k++) if (!pass[k]) { seat = k; break; }
    if (seat < 0) return { ok: false, reason: 'full', seat: -1 };
    const sp = seatPos(c.pose, c.spec, seat); if (Math.hypot(o.head.x - sp.x, o.head.z - sp.z) > BOARD.R) return { ok: false, reason: 'far', seat: -1 };
    return { ok: true, reason: '', seat: seat };
}
// Okrąg przed autem, który zbiera przechodniów (potrącenie): tylko gdy auto jedzie szybciej niż RUN_V do przodu
export const runOverSpot = (car, sp) => { const q = sp || DRIVE; if (!(car.v >= q.RUN_V)) return null; const f = forward(car.yaw); return { x: car.x + f.x * q.RUN_AHEAD, z: car.z + f.z * q.RUN_AHEAD, r: q.RUN_R }; };

// Wypchnięcie okręgu z prostokąta { x0, x1, z0, z1 }: zwraca { dx, dz, nx, nz } albo null
function push(c, b) {
    const qx = clamp(c.x, b.x0, b.x1), qz = clamp(c.z, b.z0, b.z1); let dx = c.x - qx, dz = c.z - qz; const d2 = dx * dx + dz * dz;
    if (d2 >= c.r * c.r) return null;
    if (d2 > 1e-10) { const d = Math.sqrt(d2), k = (c.r - d) / d; return { dx: dx * k, dz: dz * k, nx: dx / d, nz: dz / d }; }
    const e = [c.x - b.x0, b.x1 - c.x, c.z - b.z0, b.z1 - c.z]; let i = 0; for (let k = 1; k < 4; k++) if (e[k] < e[i]) i = k;   // środek w środku bryły: wypchnij najkrótszą drogą
    return i === 0 ? { dx: -(e[0] + c.r), dz: 0, nx: -1, nz: 0 } : i === 1 ? { dx: e[1] + c.r, dz: 0, nx: 1, nz: 0 } : i === 2 ? { dx: 0, dz: -(e[2] + c.r), nx: 0, nz: -1 } : { dx: 0, dz: e[3] + c.r, nx: 0, nz: 1 };
}
// Wolna droga przed (dir 1) albo za (dir -1) autem WZDŁUŻ ŁUKU bieżącego skrętu: odległość (m) przejechana przez środek auta, zanim czołowy okrąg trafi w przeszkodę, najwyżej `look`; Infinity, gdy wolno
function clearAhead(c, dir, look, boxes, blockers, q) {
    const k = Math.tan(c.steer * q.STEER_MAX) / q.L; let x = c.x, z = c.z, yaw = c.yaw;
    for (let s = 0.5; s <= look; s += 0.5) {
        const ym = yaw - k * dir * 0.25; x += Math.sin(ym) * dir * 0.5; z += Math.cos(ym) * dir * 0.5; yaw -= k * dir * 0.5;
        const ci = { x: x + Math.sin(yaw) * q.CIRCLES[0] * dir, z: z + Math.cos(yaw) * q.CIRCLES[0] * dir, r: q.R - 0.08 };
        for (const b of boxes) if (push(ci, b)) return s;
        for (const bl of blockers) if (push(ci, { x0: bl.x - bl.r, x1: bl.x + bl.r, z0: bl.z - bl.r, z1: bl.z + bl.r })) return s;
    }
    return Infinity;
}
// Krok jazdy: car (stan), inp (wejście), dt, world { boxes: [{x0,x1,z0,z1}], bounds: {x0,x1,z0,z1}, blockers: [{x,z,r}] }; zwraca { car, impact (m/s uderzenia), a (przyspieszenie wzdłuż), lat (przyspieszenie boczne) }
export function driveStep(car, inp, dt, world, spec) {
    const q = spec || DRIVE;
    const w0 = world || {}, i = cleanInput(inp), d = fin(dt) ? clamp(dt, 0, q.MAX_DT) : 0, c = { x: car.x, z: car.z, yaw: car.yaw, v: car.v, steer: car.steer };
    // bryły i blokady tylko z okolicy auta (przewidywanie przeszkody patrzy najwyżej 16 m przed siebie): tanio także przy kilkuset bryłach w mieście
    const NEAR = 26, near = (b) => b.x1 > c.x - NEAR && b.x0 < c.x + NEAR && b.z1 > c.z - NEAR && b.z0 < c.z + NEAR, w = { bounds: w0.bounds, boxes: (w0.boxes || []).filter(near), blockers: (w0.blockers || []).filter(b => Math.abs(b.x - c.x) < NEAR && Math.abs(b.z - c.z) < NEAR) };
    // skręt: zadany skręt jest ograniczony prędkością (steerLimit), narasta z ograniczoną szybkością (wraca szybciej, gdy gałka puszczona)
    const sl = steerLimit(c.v, q), target = clamp(i.steer, -sl, sl), rate = (i.steer === 0 ? q.STEER_BACK : q.STEER_RATE) / q.STEER_MAX * d, ds = target - c.steer; c.steer = clamp(c.steer + clamp(ds, -rate, rate), -sl, sl);
    // prędkość wzdłuż: gaz, hamulec (przy staniu wsteczny), toczenie się, asysta krzywizny i automatyczne hamowanie przed przeszkodą; CAŁKOWITE opóźnienie nie przekracza BRAKE
    const v0 = c.v; let a = 0;
    if (i.gas > 0 && i.brake === 0) a = c.v < 0 ? q.BRAKE : q.ACC * i.gas;
    else if (i.brake > 0 && i.gas === 0) a = c.v > 0.05 ? -q.BRAKE * i.brake : -q.ACC * i.brake;
    else if (i.gas === 0 && i.brake === 0) a = c.v > 0 ? -q.COAST : (c.v < 0 ? q.COAST : 0);
    let vn = v0 + a * d; if (i.gas === 0 && i.brake === 0 && (v0 > 0) !== (vn > 0)) vn = 0;
    let lim = speedLimit(c.steer, q), cap = (v0 >= 0 ? lim : Math.min(lim, q.REV_MAX));
    // automatyczne hamowanie przed przeszkodą (uderzenie z pełną prędkością zatrzymałoby ciało gracza w jednej klatce): prędkość taka, żeby zdążyć stanąć z hamowaniem BRAKE
    if (Math.abs(v0) > 0.05 && (w.boxes || w.blockers)) { const look = Math.min(16, v0 * v0 / (2 * q.BRAKE) + 3), free = clearAhead(c, v0 > 0 ? 1 : -1, look, w.boxes || [], w.blockers || [], q); if (free < Infinity) cap = Math.min(cap, Math.sqrt(2 * q.BRAKE * 0.85 * Math.max(0, free - 0.4))); }
    if (Math.abs(vn) > cap) vn = Math.sign(vn) * Math.max(cap, Math.abs(v0) - q.BRAKE * d, 0);   // zwalnia do limitu, ale nie ostrzej niż BRAKE na sekundę
    c.v = clamp(vn, -q.REV_MAX, q.VMAX);
    // ruch po łuku (model rowerowy; skręt w prawo zmniejsza yaw)
    const yawRate = -c.v * Math.tan(c.steer * q.STEER_MAX) / q.L, yawMid = c.yaw + yawRate * d / 2;
    c.yaw += yawRate * d; c.x += Math.sin(yawMid) * c.v * d; c.z += Math.cos(yawMid) * c.v * d;
    // kolizje: okręgi wypychane z prostokątów i z blokad, potem granice miasta
    let impact = 0;
    const boxes = w.boxes || [], blockers = w.blockers || [];
    for (let pass = 0; pass < 3; pass++) {
        let any = false;
        for (const ci of circles(c, q)) {
            for (const b of boxes) { const p = push(ci, b); if (p) { c.x += p.dx; c.z += p.dz; ci.x += p.dx; ci.z += p.dz; any = true; const f = forward(c.yaw), al = Math.abs(f.x * p.nx + f.z * p.nz); impact = Math.max(impact, Math.abs(c.v) * al); c.v *= al > 0.5 ? q.BOUNCE : q.SCRAPE; } }
            for (const bl of blockers) { const p = push(ci, { x0: bl.x - bl.r, x1: bl.x + bl.r, z0: bl.z - bl.r, z1: bl.z + bl.r }); if (p) { c.x += p.dx; c.z += p.dz; any = true; impact = Math.max(impact, Math.abs(c.v)); c.v *= q.BOUNCE; } }
        }
        if (!any) break;
    }
    const bd = w.bounds; if (bd) { const x = clamp(c.x, bd.x0 + q.MARGIN, bd.x1 - q.MARGIN), z = clamp(c.z, bd.z0 + q.MARGIN, bd.z1 - q.MARGIN); if (x !== c.x || z !== c.z) { impact = Math.max(impact, Math.abs(c.v) * 0.5); c.v *= 0.5; } c.x = x; c.z = z; }
    return { car: c, impact: impact, a: d > 0 ? (c.v - v0) / d : 0, lat: Math.abs(c.v * yawRate) };
}
// Porzucone auto wraca na miejsce parkowania, gdy nikt nim nie jedzie i gracz jest daleko (poza zasięgiem wzroku) przez RETURN_AFTER s; zwraca nowy licznik i czy wrócić
export function returnStep(idle, dt, driven, playerDist) {
    if (driven || !fin(playerDist) || playerDist < DRIVE.FAR) return { idle: 0, back: false };
    const t = idle + (fin(dt) ? clamp(dt, 0, 0.5) : 0); return { idle: t, back: t >= DRIVE.RETURN_AFTER };
}
// ----- poza (sieć): kierowca liczy auto lokalnie i wysyła { car, x, z, yaw, v }; host sprawdza, a inni interpolują -----
export function cleanPose(m, spec) {
    if (!m || typeof m !== 'object' || typeof m.car !== 'string' || m.car.length > 24) return null;
    const q = spec || specOf(kindOf(m.car));
    const M = DRIVE.MAX_COORD; if (![m.x, m.z, m.yaw, m.v].every(fin) || Math.abs(m.x) > M || Math.abs(m.z) > M || Math.abs(m.yaw) > 20) return null;
    return { car: m.car, x: m.x, z: m.z, yaw: Math.atan2(Math.sin(m.yaw), Math.cos(m.yaw)), v: clamp(m.v, -q.REV_MAX, q.VMAX) };
}
// Czy nowa poza jest wiarygodna względem poprzedniej po dt sekundach: ruch nie szybszy niż prędkość limitu z zapasem, obrót nie szybszy niż możliwy, auto nie w bryle, w granicach miasta
export function poseOk(prev, next, dt, world, spec) {
    if (!prev || !next || !fin(dt)) return false;
    const q = spec || DRIVE;
    const d = clamp(dt, 0.02, 2), moved = Math.hypot(next.x - prev.x, next.z - prev.z);
    if (moved > (q.VMAX * q.POSE_SLACK) * d + 0.5) return false;
    let dy = next.yaw - prev.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); if (Math.abs(dy) > (Math.tan(q.STEER_MAX) / q.L) * q.VMAX * q.POSE_SLACK * d + 0.2) return false;
    const w = world || {}, bd = w.bounds; if (bd && (next.x < bd.x0 || next.x > bd.x1 || next.z < bd.z0 || next.z > bd.z1)) return false;
    for (const ci of circles(next, q)) for (const b of (w.boxes || [])) if (push({ x: ci.x, z: ci.z, r: ci.r - 0.15 }, b)) return false;
    return true;
}
// Interpolacja pozy u innych klientów: gładko dochodzi do ostatniej pozy z sieci (obrót po najkrótszej drodze)
export function blendPose(cur, target, dt) {
    if (!cur) return target ? { x: target.x, z: target.z, yaw: target.yaw, v: target.v } : null; if (!target) return cur;
    const k = 1 - Math.exp(-DRIVE.POSE_RATE * clamp(dt, 0, 0.2)); let dy = target.yaw - cur.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy));
    return { x: cur.x + (target.x - cur.x) * k, z: cur.z + (target.z - cur.z) * k, yaw: cur.yaw + dy * k, v: cur.v + (target.v - cur.v) * k };
}
// Migawka swobodnych aut od hosta: [[auto, kierowca albo null, x, z, yaw, v], ...] -> [{ car, driver, pose }]; tylko znane auta (known: funkcja, zbiór albo tablica), jedna pozycja na auto, poza przez cleanPose, najwyżej 8 wpisów
export function cleanFree(a, known) {
    if (!Array.isArray(a)) return [];
    const has = typeof known === 'function' ? known : (known instanceof Set ? (id) => known.has(id) : (id) => Array.isArray(known) && known.includes(id)), out = [], seen = new Set();
    for (const e of a.slice(0, 12)) {
        if (!Array.isArray(e) || typeof e[0] !== 'string' || !has(e[0]) || seen.has(e[0])) continue;
        const p = cleanPose({ car: e[0], x: e[2], z: e[3], yaw: e[4], v: e[5] }); if (!p) continue;
        const drv = typeof e[1] === 'string' ? e[1].replace(/[^\w:.-]/g, '').slice(0, 48) : '';
        const pass = Array.isArray(e[6]) ? e[6].slice(0, 2).map(q => typeof q === 'string' ? (q.replace(/[^\w:.-]/g, '').slice(0, 48) || null) : null) : [];
        seen.add(e[0]); out.push({ car: p.car, driver: drv || null, pass: pass, pose: { x: p.x, z: p.z, yaw: p.yaw, v: p.v } });
    }
    return out;
}
