// ==========================================
// SCARY GTA: POJAZDY (3D i sterowanie ciałem gracza; reguły, trasy i flota w czystym core/vehiclelogic.js; testy: tests/vehicles.mjs).
// Trzy pickupy ucieczki (jedna scalona siatka na auto = jedno wywołanie rysowania, bez światła w locie). Dotknięcie klamki zabiera gracza na stojąco na pakę; jazda to tylko PRZESUNIĘCIE ciała
// (kamera się nie obraca, prędkość trafia do playerBody, więc działa komfortowa winieta). Jazdę przerywasz, trzymając obie chwyty przez pół sekundy.
// Stan floty trzyma poziom (host liczy, goście odtwarzają migawkę); ten moduł rysuje auta i prowadzi TYLKO ciało lokalnego gracza.
// SWOBODNA JAZDA (core/drivelogic.js): dotknięcie DRZWI KIEROWCY (lewy bok przy kabinie) kradnie auto i pozwala jechać gdzie chcesz: gaz, hamulec i skręt z `api.drive.input()`, kolizje z `api.drive.world()`.
// Ciało stoi przy tylnej osi, kamera się NIE obraca, prędkość trafia do playerBody (komfortowa winieta), a po uderzeniu ciało dochodzi do auta gładko (0,18 s). Porzucone auto zostaje tam, gdzie je zostawiono
// (nie da się wtedy jechać nim po szynach), a po 45 s bez kierowcy i z graczem dalej niż 40 m wraca na miejsce parkowania. Poza innych kierowców (sieć) przychodzi przez `setRemote`.
// ==========================================
import { THREE, L } from './engine.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { playerBody, releaseAll, gripDown } from './player.js';
import { touching } from './gtaprops.js';
import * as VL from './vehiclelogic.js';
import * as DL from './drivelogic.js';

const paint = (g, r, gr, b) => { const n = g.attributes.position.count, a = new Float32Array(n * 3); for (let i = 0; i < n; i++) { a[i * 3] = r; a[i * 3 + 1] = gr; a[i * 3 + 2] = b; } g.setAttribute('color', new THREE.BufferAttribute(a, 3)); return g; };
const box = (w, h, d, x, y, z, c) => paint(new THREE.BoxGeometry(w, h, d).translate(x, y, z), c[0], c[1], c[2]);
const BODY = { bank: [0.9, 0.15, 0.15], casino: [0.55, 0.15, 0.8], motel: [0.15, 0.55, 0.75] };
const wheel = (r, w, x, y, z) => { const g = new THREE.CylinderGeometry(r, r, w, 12); g.rotateZ(Math.PI / 2); g.translate(x, y, z); return paint(g, 0.04, 0.04, 0.05); };
// Platforma towarowa: kabina z przodu, długi pokład 1 m nad ziemią (stoi się na nim), niskie burty
function haulerGeometry(col) {
    const dark = [0.08, 0.08, 0.1], glass = [0.08, 0.14, 0.2], parts = [box(2.1, 0.35, 6.2, 0, 0.55, 0, dark), box(2.1, 1.4, 1.7, 0, 1.35, 2.3, col), box(1.9, 0.5, 0.06, 0, 1.7, 3.17, glass), box(2.3, 0.2, 4.1, 0, 0.9, -1.0, [0.35, 0.3, 0.25])];
    for (const sx of [-1.1, 1.1]) parts.push(box(0.08, 0.3, 4.1, sx, 1.1, -1.0, col));
    parts.push(box(2.3, 0.3, 0.08, 0, 1.1, -3.05, col));
    for (const sx of [-1, 1]) { parts.push(box(0.3, 0.18, 0.06, sx * 0.7, 0.8, 3.18, [3, 3, 2.2])); parts.push(box(0.3, 0.14, 0.06, sx * 0.8, 0.8, -3.12, [2.4, 0.2, 0.2])); for (const z of [-2.2, 0, 2.3]) parts.push(wheel(0.45, 0.3, sx * 1.1, 0.45, z)); }
    return mergeGeometries(parts);
}
// Buggy: niska rama, podłoga 0,5 m nad ziemią, klatka bezpieczeństwa i duże koła
function buggyGeometry(col) {
    const dark = [0.07, 0.07, 0.09], parts = [box(1.5, 0.22, 3.2, 0, 0.42, 0, dark), box(1.5, 0.08, 1.4, 0, 0.53, -0.7, [0.3, 0.3, 0.32]), box(1.3, 0.4, 1.1, 0, 0.7, 1.0, col), box(1.2, 0.5, 0.2, 0, 0.95, 0.45, [0.1, 0.1, 0.12])];
    for (const sx of [-0.7, 0.7]) for (const z of [-1.0, 0.4]) parts.push(box(0.06, 1.1, 0.06, sx, 1.0, z, col));
    parts.push(box(1.45, 0.06, 0.06, 0, 1.55, 0.4, col), box(1.45, 0.06, 0.06, 0, 1.55, -1.0, col), box(0.06, 0.06, 1.5, -0.7, 1.55, -0.3, col), box(0.06, 0.06, 1.5, 0.7, 1.55, -0.3, col));
    for (const sx of [-1, 1]) { parts.push(box(0.3, 0.12, 0.06, sx * 0.4, 0.75, 1.58, [3, 3, 2.2])); parts.push(box(0.2, 0.12, 0.06, sx * 0.5, 0.6, -1.62, [2.4, 0.2, 0.2])); for (const z of [-1.0, 1.1]) parts.push(wheel(0.45, 0.35, sx * 0.9, 0.45, z)); }
    return mergeGeometries(parts);
}
// Motocykl: rama, dwa koła, kierownica i podnóżek (stoi się na nim), bez miejsca dla pasażera
function motoGeometry(col) {
    const dark = [0.06, 0.06, 0.08], parts = [box(0.28, 0.4, 1.3, 0, 0.7, 0.1, col), box(0.3, 0.2, 0.6, 0, 0.95, 0.5, col), box(0.2, 0.06, 0.9, 0, 0.42, -0.5, [0.3, 0.3, 0.32]), box(0.6, 0.06, 0.7, 0, 0.4, -0.35, [0.3, 0.3, 0.32]), box(0.7, 0.05, 0.05, 0, 1.2, 0.8, dark), box(0.06, 0.6, 0.06, 0, 0.9, 0.75, dark), box(0.14, 0.14, 0.06, 0, 0.95, 1.12, [3, 3, 2.2]), box(0.16, 0.1, 0.05, 0, 0.7, -0.85, [2.4, 0.2, 0.2])];
    for (const z of [-0.7, 0.85]) parts.push(wheel(0.4, 0.16, 0, 0.4, z));
    return mergeGeometries(parts);
}
const BODY2 = { hauler: [0.85, 0.45, 0.1], buggy: [0.65, 0.85, 0.15], moto: [0.1, 0.1, 0.12], moto2: [0.5, 0.05, 0.05] };
const GEO = { hauler: haulerGeometry, buggy: buggyGeometry, moto: motoGeometry, moto2: motoGeometry };
function carGeometry(col) {
    const dark = [0.06, 0.06, 0.08], glass = [0.08, 0.14, 0.2], parts = [box(2.0, 0.55, 4.4, 0, 0.65, 0, col), box(1.9, 0.75, 1.5, 0, 1.2, 1.25, col), box(1.7, 0.4, 0.06, 0, 1.3, 2.02, glass), box(1.8, 0.1, 2.3, 0, 0.95, -1.15, dark)];
    for (const sx of [-0.95, 0.95]) parts.push(box(0.08, 0.35, 2.3, sx, 1.1, -1.15, col));
    parts.push(box(1.9, 0.35, 0.08, 0, 1.1, -2.3, col));
    for (const sx of [-1, 1]) { parts.push(box(0.3, 0.18, 0.06, sx * 0.65, 0.7, 2.22, [3, 3, 2.2])); parts.push(box(0.3, 0.14, 0.06, sx * 0.7, 0.7, -2.22, [2.4, 0.2, 0.2])); for (const z of [-1.4, 1.4]) { const w = new THREE.CylinderGeometry(0.38, 0.38, 0.26, 12); w.rotateZ(Math.PI / 2); w.translate(sx * 1.0, 0.38, z); parts.push(paint(w, 0.04, 0.04, 0.05)); } }
    return mergeGeometries(parts);
}
// api: { clock() -> s, myKey: 'me', requestStart(carId, routeIndex), onBoard(carId, routeId), onArrive(), dismount(), drive: { requestFree(carId), world() -> { boxes, bounds, blockers }, input() -> { gas, brake, steer },
//   onStart(carId), onStop(carId), requestBoard(carId), onPassStart(carId), onPassStop(carId, notify), onBump(impact), onRunOver(listaPrzechodniów), onPose(poza), auth() -> bool (host albo solo: tylko on cofa porzucone auta na parking) } }
export function createVehicles(api) {
    const G = { geos: [], mats: [], cars: [], ride: null, drv: null, pass: null, lastReq: -9, hold: 0, arrived: false, boards: 0, dismounts: 0, bumps: 0, ranOver: 0, lastPose: 0 };
    const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.4, metalness: 0.5 }); G.mats.push(mat);
    for (const v of VL.VEHICLES) {
        const g = carGeometry(BODY[v.id] || [0.5, 0.5, 0.5]); G.geos.push(g);
        const m = new THREE.Mesh(g, mat); const pp = VL.parkedPose(v.id); m.position.set(pp.x, 0, pp.z); m.rotation.y = pp.yaw; L.root.add(m);
        G.cars.push({ id: v.id, m: m, handles: VL.handlePoints(v.id), yaw: pp.yaw, free: null, spec: DL.specOf('pickup') });
    }
    for (const v of VL.FREE_CARS) {   // auta tylko do swobodnej jazdy: bez klamek jazdy po szynach
        const g = GEO[v.id](BODY2[v.id]); G.geos.push(g);
        const m = new THREE.Mesh(g, mat); m.position.set(v.park.x, 0, v.park.z); m.rotation.y = v.park.yaw; L.root.add(m);
        G.cars.push({ id: v.id, m: m, handles: [], yaw: v.park.yaw, free: null, spec: DL.specOf(v.kind) });
    }
    // fleet: tablica { id, occ, route, t0 } od poziomu; c: { clock }
    G.update = (dt, fleet) => {
        const now = api.clock(); let mine = null;
        for (const car of G.cars) {
            const f = fleet.find(q => q.id === car.id), ride = f && f.occ ? VL.rideFor(f) : null;
            if (ride) {
                const p = VL.posAt(ride, now - f.t0); car.m.position.set(p.x, 0, p.z);
                let da = p.yaw - car.yaw; da = Math.atan2(Math.sin(da), Math.cos(da)); car.yaw += da * Math.min(1, dt * 6); car.m.rotation.y = car.yaw;
                if (f.occ === api.myKey) mine = { car: car.id, route: f.route, ride: ride, pose: p, age: now - f.t0 };
            } else if (car.free) {   // auto wzięte do swobodnej jazdy (moje albo cudze) albo porzucone w miejscu, gdzie je zostawiono
                const fr = car.free; if (fr.remote && fr.target) fr.pose = DL.blendPose(fr.pose, fr.target, dt);
                car.m.position.set(fr.pose.x, 0, fr.pose.z); car.yaw = fr.pose.yaw; car.m.rotation.y = fr.pose.yaw;
                if (fr.remote && fr.driver && api.drive.onRunOver) { const sp = DL.runOverSpot(fr.pose, car.spec); if (sp) api.drive.onRunOver(sp.x, sp.z, sp.r, fr.pose.yaw, true); }   // cudze auto też potrąca MOICH (lokalnych) przechodniów: każdy klient przetwarza to, co widzi (jak strzały)
                if (!fr.driver && (!fr.remote || (api.drive.auth && api.drive.auth()))) { const r = DL.returnStep(fr.idle, dt, false, G.playerDist ? G.playerDist(fr.pose.x, fr.pose.z) : 0); fr.idle = r.idle; if (r.back) car.free = null; }
            } else { const pp = VL.parkedPose(car.id); car.m.position.set(pp.x, 0, pp.z); car.yaw = pp.yaw; car.m.rotation.y = pp.yaw; }
            // start jazdy po szynach: dotknięcie klamki wolnego auta stojącego na miejscu parkowania (rzadkie żądania); drzwi kierowcy: swobodna jazda
            if (!mine && !G.ride && !G.drv && (!f || !f.occ) && now - G.lastReq > 1) {
                if (!car.free) for (const h of car.handles) if (touching(h.x, h.y, h.z, VL.RIDE.HANDLE_R)) { G.lastReq = now; api.requestStart(car.id, h.route); break; }
                if (now - G.lastReq > 1 && api.drive && (!car.free || !car.free.driver)) { const dp = DL.doorPoint(car.free ? car.free.pose : VL.parkedPose(car.id), car.spec); if (touching(dp.x, 1.0, dp.z, DL.DRIVE.DOOR.R)) { G.lastReq = now; api.drive.requestFree(car.id); } }
            }
        }
        // PASAŻER: dotknięcie wolnego miejsca na pokładzie auta z kierowcą (host sprawdza `DL.boardCheck`)
        if (!mine && !G.ride && !G.drv && !G.pass && api.drive && api.drive.requestBoard && now - G.lastReq > 1) for (const car of G.cars) {
            const fr = car.free; if (!fr || !fr.driver || fr.driver === api.myKey) continue;
            for (let k = 0; k < car.spec.SEATS; k++) if (!fr.pass[k]) { const sp = DL.seatPos(fr.pose, car.spec, k); if (touching(sp.x, 1.1, sp.z, DL.BOARD.TOUCH_R)) { G.lastReq = now; api.drive.requestBoard(car.id); break; } }
            if (now - G.lastReq < 0.01) break;
        }
        // swobodna jazda: kierowca liczy auto lokalnie (bez opóźnienia wejścia), ciało przypięte przy tylnej osi
        if (G.drv) {
            const d = G.drv, car = G.cars.find(c => c.id === d.car), step = Math.min(dt, DL.DRIVE.MAX_DT * 2), n = Math.max(1, Math.ceil(step / DL.DRIVE.MAX_DT));
            let impact = 0; for (let k = 0; k < n; k++) { const r = DL.driveStep(d.st, api.drive.input(), step / n, api.drive.world(), d.spec); d.st = r.car; impact = Math.max(impact, r.impact); }
            if (car && car.free) { car.free.pose = { x: d.st.x, z: d.st.z, yaw: d.st.yaw, v: d.st.v }; car.free.idle = 0; }
            const sp = DL.runOverSpot(d.st, d.spec); if (sp && api.drive.onRunOver) { const hit = api.drive.onRunOver(sp.x, sp.z, sp.r, d.st.yaw); if (hit) G.ranOver += hit; }
            if (impact > 1.0) { G.bumps++; d.impactT = 0.4; if (api.drive.onBump) api.drive.onBump(impact); }
            // ciało: dochodzi do punktu przy tylnej osi; zwykła jazda to różnica rzędu milimetrów, a po uderzeniu (auto stanęło) ciało gładko hamuje zamiast stanąć w jednej klatce
            const tgt = DL.bodyPos(d.st, d.spec), px = d.shown.x + d.vx * step, pz = d.shown.z + d.vz * step, ex = tgt.x - px, ez = tgt.z - pz, big = Math.hypot(ex, ez) > 0.03, al = big ? 1 - Math.exp(-step / 0.18) : 1;
            const nx = px + ex * al, nz = pz + ez * al; d.vx = (nx - d.shown.x) / Math.max(step, 1e-3); d.vz = (nz - d.shown.z) / Math.max(step, 1e-3); d.shown.x = nx; d.shown.z = nz;
            playerBody.position.set(nx, d.spec.DECK + 1.0, nz); playerBody.velocity.set(d.vx, 0, d.vz);
            d.hold = gripDown(0) && gripDown(1) ? d.hold + dt : 0; if (d.hold >= VL.RIDE.DISMOUNT_HOLD || (api.drive.wantExit && api.drive.wantExit())) { G.dismounts++; G.endFree(); }
            else if (api.drive.onPose && now - G.lastPose > 1 / DL.DRIVE.POSE_RATE) { G.lastPose = now; api.drive.onPose({ car: d.car, x: d.st.x, z: d.st.z, yaw: d.st.yaw, v: d.st.v }); }
        }
        // pasażer: ciało stoi na pokładzie przy swoim miejscu; pozycja z ekstrapolacji ostatniej pozy auta (prędkość i kurs), wygładzona jak u kierowcy (bez 8 Hz piłokształtnej prędkości)
        if (G.pass) {
            const d = G.pass, car = G.cars.find(c => c.id === d.car), fr = car && car.free;
            if (!fr || !fr.driver || fr.driver === api.myKey || fr.pass[d.k] !== api.myKey) G.endPass(false);
            else {
                const step = Math.min(dt, 0.1), base = fr.target ? DL.extrapolate(fr.target, now - (fr.tAt || now)) : fr.pose, seat = DL.seatPos(base, car.spec, d.k);
                const px = d.shown.x + d.vx * step, pz = d.shown.z + d.vz * step, ex = seat.x - px, ez = seat.z - pz, big = Math.hypot(ex, ez) > 0.03, al = big ? 1 - Math.exp(-step / 0.18) : 1;
                const nx = px + ex * al, nz = pz + ez * al; d.vx = (nx - d.shown.x) / Math.max(step, 1e-3); d.vz = (nz - d.shown.z) / Math.max(step, 1e-3); d.shown.x = nx; d.shown.z = nz;
                playerBody.position.set(nx, car.spec.DECK + 1.0, nz); playerBody.velocity.set(d.vx, 0, d.vz);
                d.hold = gripDown(0) && gripDown(1) ? d.hold + dt : 0; if (d.hold >= VL.RIDE.DISMOUNT_HOLD || (api.drive.wantExit && api.drive.wantExit())) G.endPass(true);
            }
        }
        // jazda lokalnego gracza po szynach: tylko przesunięcie ciała (kamera się nie obraca)
        if (mine && !mine.pose.done) {
            if (!G.ride) { releaseAll(); G.ride = mine; G.arrived = false; G.boards++; api.onBoard(mine.car, mine.route); }
            G.ride = mine; const p = mine.pose, sx = Math.sin(p.yaw), sz = Math.cos(p.yaw);
            playerBody.position.set(p.x - sx * VL.RIDE.BED_BACK, VL.RIDE.BED_Y + 1.0, p.z - sz * VL.RIDE.BED_BACK); playerBody.velocity.set(sx * p.speed, 0, sz * p.speed);
            G.hold = gripDown(0) && gripDown(1) ? G.hold + dt : 0; if (G.hold >= VL.RIDE.DISMOUNT_HOLD) { G.hold = 0; G.dismounts++; api.dismount(); }
        } else if (G.ride) {   // dojazd (albo host zwolnił auto): zatrzymujemy ciało na ziemi
            const done = mine && mine.pose.done; if (done) { const p = mine.pose; playerBody.position.set(p.x - Math.sin(p.yaw) * VL.RIDE.BED_BACK, 1.1, p.z - Math.cos(p.yaw) * VL.RIDE.BED_BACK); }
            playerBody.velocity.set(0, 0, 0); G.ride = null; G.hold = 0; if (done && !G.arrived) { G.arrived = true; api.onArrive(); }
        }
    };
    // ----- swobodna jazda lokalnego gracza -----
    G.beginFree = (carId) => {   // wołane po zatwierdzeniu startu (solo i host od razu, gość po odpowiedzi hosta)
        const car = G.cars.find(c => c.id === carId); if (!car || G.drv || G.ride) return false;
        const pose = car.free ? (car.free.target || car.free.pose) : VL.parkedPose(carId), st = DL.newCar(pose.x, pose.z, pose.yaw), b = DL.bodyPos(st, car.spec);
        releaseAll(); car.free = { pose: { x: st.x, z: st.z, yaw: st.yaw, v: 0 }, driver: api.myKey, idle: 0, remote: false, pass: new Array(car.spec.SEATS).fill(null) };
        G.drv = { car: carId, st: st, spec: car.spec, shown: { x: b.x, z: b.z }, vx: 0, vz: 0, hold: 0, impactT: 0 }; if (api.drive.onStart) api.drive.onStart(carId); return true;
    };
    G.endFree = () => {   // wysiadasz przy drzwiach kierowcy; auto zostaje, gdzie jest
        if (!G.drv) return; const car = G.cars.find(c => c.id === G.drv.car), st = G.drv.st; if (car && car.free) { car.free.driver = null; car.free.idle = 0; car.free.pose.v = 0; car.free.pass.fill(null); }
        const dp = DL.doorPoint(st, G.drv.spec), id = G.drv.car; playerBody.position.set(dp.x + Math.cos(st.yaw) * 0.6, 1.1, dp.z - Math.sin(st.yaw) * 0.6); playerBody.velocity.set(0, 0, 0); G.drv = null; if (api.drive.onStop) api.drive.onStop(id);
    };
    // tylko testy: teleport auta za kierownicą i ustawienie licznika bezczynności porzuconego auta
    G.teleport = (x, z, yaw) => { if (!G.drv) return false; const car = G.cars.find(c => c.id === G.drv.car); G.drv.st = DL.newCar(x, z, yaw); const b = DL.bodyPos(G.drv.st, G.drv.spec); G.drv.shown = { x: b.x, z: b.z }; G.drv.vx = 0; G.drv.vz = 0; if (car && car.free) car.free.pose = { x: x, z: z, yaw: yaw, v: 0 }; return true; };
    G.testIdle = (carId, idle) => { const c = G.cars.find(q => q.id === carId); if (c && c.free) c.free.idle = idle; };
    G.driving = () => !!G.drv;
    G.driveCar = () => G.drv ? { id: G.drv.car, x: G.drv.st.x, z: G.drv.st.z, yaw: G.drv.st.yaw, v: G.drv.st.v } : null;
    G.isFree = (carId) => { const c = G.cars.find(q => q.id === carId); return !!(c && c.free); };   // auto nie stoi na miejscu parkowania (ktoś nim jechał)
    G.freeDriver = (carId) => { const c = G.cars.find(q => q.id === carId); return c && c.free ? c.free.driver : null; };
    // cudze swobodne auto (sieć): kierowca id (albo null, gdy porzucone) i ostatnia poza; interpolacja w update
    G.setRemote = (carId, driver, pose, pass) => {
        const car = G.cars.find(q => q.id === carId); if (!car || (G.drv && G.drv.car === carId)) return;
        if (!driver && !pose) { if (car.free && car.free.remote) car.free = null; return; }
        if (!car.free) car.free = { pose: pose ? { x: pose.x, z: pose.z, yaw: pose.yaw, v: pose.v || 0 } : VL.parkedPose(carId), driver: driver, idle: 0, remote: true, target: null, tAt: 0, pass: new Array(car.spec.SEATS).fill(null) };
        car.free.remote = true; car.free.driver = driver; car.free.idle = 0; if (pose) { car.free.target = { x: pose.x, z: pose.z, yaw: pose.yaw, v: pose.v || 0 }; car.free.tAt = api.clock(); }
        if (pass) G.setPass(carId, pass); else if (!driver) car.free.pass.fill(null);
    };
    // wszystkie swobodne auta (moje, cudze i porzucone) z ostatnią znaną pozą i kierowcą (host wysyła to w migawce)
    G.freePoses = () => G.cars.filter(c => c.free).map(c => { const q = c.free.target || c.free.pose; return { car: c.id, x: +q.x.toFixed(2), z: +q.z.toFixed(2), yaw: +q.yaw.toFixed(3), v: +(q.v || 0).toFixed(2), driver: c.free.driver, pass: c.free.pass.slice() }; });
    G.freePoseOf = (who) => { const c = G.cars.find(q => q.free && q.free.driver === who); return c ? { x: c.free.pose.x, z: c.free.pose.z, v: (c.free.target || c.free.pose).v || 0 } : null; };   // poza auta, którym jedzie `who` (radiowozy: przyszpilenie)
    G.freeCarOf = (who) => { const c = G.cars.find(q => q.free && q.free.driver === who); return c ? c.id : null; };
    G.freeSpeedOf = (who) => { const c = G.cars.find(q => q.free && (q.free.driver === who || q.free.pass.includes(who))); return c ? Math.abs((c.free.target || c.free.pose).v || 0) : 0; };
    G.releaseDriver = (who) => { for (const c of G.cars) if (c.free && c.free.driver === who) { c.free.driver = null; c.free.idle = 0; c.free.pass.fill(null); if (c.free.target) { c.free.pose = Object.assign({}, c.free.target); c.free.target = null; } c.free.pose.v = 0; } };
    G.clearRemoteExcept = (ids) => { for (const c of G.cars) if (c.free && c.free.remote && !ids.has(c.id)) c.free = null; };
    // ----- pasażer (host zapisuje miejsca, goście dostają listę w migawce `fd`) -----
    G.addPass = (carId, who, k) => { const c = G.cars.find(q => q.id === carId); if (!c || !c.free || !c.free.driver || k < 0 || k >= c.spec.SEATS || c.free.pass[k]) return false; c.free.pass[k] = who; return true; };
    G.removePass = (who) => { let n = 0; for (const c of G.cars) if (c.free) for (let k = 0; k < c.free.pass.length; k++) if (c.free.pass[k] === who) { c.free.pass[k] = null; n++; } return n; };
    G.setPass = (carId, ids) => { const c = G.cars.find(q => q.id === carId); if (!c || !c.free) return; c.free.pass = new Array(c.spec.SEATS).fill(null).map((_, k) => (ids && typeof ids[k] === 'string' ? ids[k] : null)); };
    G.passCarOf = (who) => { const c = G.cars.find(q => q.free && q.free.pass.includes(who)); return c ? c.id : null; };
    G.beginPass = (carId) => {   // wołane po zatwierdzeniu miejsca (solo i host od razu, gość po migawce z moim id)
        const car = G.cars.find(c => c.id === carId); if (!car || !car.free || G.drv || G.ride || G.pass) return false; const k = car.free.pass.indexOf(api.myKey); if (k < 0) return false;
        releaseAll(); const base = car.free.target ? DL.extrapolate(car.free.target, api.clock() - (car.free.tAt || api.clock())) : car.free.pose, seat = DL.seatPos(base, car.spec, k);
        G.pass = { car: carId, k: k, shown: { x: seat.x, z: seat.z }, vx: 0, vz: 0, hold: 0 }; playerBody.position.set(seat.x, car.spec.DECK + 1.0, seat.z); if (api.drive.onPassStart) api.drive.onPassStart(carId); return true;
    };
    G.endPass = (notify) => {   // zejście na ziemię po prawej stronie auta (notify: sam wysiadłem; false: host odebrał miejsce)
        if (!G.pass) return; const d = G.pass, car = G.cars.find(c => c.id === d.car); G.pass = null;
        const yaw = car && car.free ? car.free.pose.yaw : 0; playerBody.position.set(d.shown.x - Math.cos(yaw) * 1.3, 1.1, d.shown.z + Math.sin(yaw) * 1.3); playerBody.velocity.set(0, 0, 0);
        if (api.drive.onPassStop) api.drive.onPassStop(d.car, !!notify);
    };
    G.passing = () => !!G.pass;
    G.passInfo = () => G.pass ? { car: G.pass.car, k: G.pass.k, x: +G.pass.shown.x.toFixed(2), z: +G.pass.shown.z.toFixed(2) } : null;
    G.playerDist = (x, z) => Math.hypot(playerBody.position.x - x, playerBody.position.z - z);   // odległość gracza od punktu (porzucone auto wraca, gdy gracz jest daleko)
    G.riding = () => !!G.ride;
    G.debug = () => ({ passing: G.passInfo(), pass: G.cars.filter(c => c.free && c.free.pass.some(Boolean)).map(c => [c.id, c.free.pass.slice()]), driving: !!G.drv, drive: G.drv ? { car: G.drv.car, x: +G.drv.st.x.toFixed(2), z: +G.drv.st.z.toFixed(2), yaw: +G.drv.st.yaw.toFixed(3), v: +G.drv.st.v.toFixed(2), steer: +G.drv.st.steer.toFixed(3) } : null, bumps: G.bumps, ranOver: G.ranOver, free: G.cars.filter(c => c.free).map(c => [c.id, +c.free.pose.x.toFixed(1), +c.free.pose.z.toFixed(1), c.free.driver, c.free.remote, +(c.free.target || c.free.pose).x.toFixed(2), +(c.free.target || c.free.pose).z.toFixed(2)]), riding: !!G.ride, boards: G.boards, dismounts: G.dismounts, cars: G.cars.map(c => [c.id, +c.m.position.x.toFixed(1), +c.m.position.z.toFixed(1)]), speed: G.ride ? +G.ride.pose.speed.toFixed(2) : 0 });
    G.dispose = () => { for (const c of G.cars) c.m.removeFromParent(); for (const g of G.geos) g.dispose(); for (const m of G.mats) m.dispose(); };
    return G;
}
