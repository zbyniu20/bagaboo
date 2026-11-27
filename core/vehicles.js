// ==========================================
// SCARY GTA: POJAZDY (3D i sterowanie ciałem gracza; reguły, trasy i flota w czystym core/vehiclelogic.js; testy: tests/vehicles.mjs).
// Trzy pickupy ucieczki (jedna scalona siatka na auto = jedno wywołanie rysowania, bez światła w locie). Dotknięcie klamki zabiera gracza na stojąco na pakę; jazda to tylko PRZESUNIĘCIE ciała
// (kamera się nie obraca, prędkość trafia do playerBody, więc działa komfortowa winieta). Jazdę przerywasz, trzymając obie chwyty przez pół sekundy.
// Stan floty trzyma poziom (host liczy, goście odtwarzają migawkę); ten moduł rysuje auta i prowadzi TYLKO ciało lokalnego gracza.
// ==========================================
import { THREE, L } from './engine.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { playerBody, releaseAll, gripDown } from './player.js';
import { touching } from './gtaprops.js';
import * as VL from './vehiclelogic.js';

const paint = (g, r, gr, b) => { const n = g.attributes.position.count, a = new Float32Array(n * 3); for (let i = 0; i < n; i++) { a[i * 3] = r; a[i * 3 + 1] = gr; a[i * 3 + 2] = b; } g.setAttribute('color', new THREE.BufferAttribute(a, 3)); return g; };
const box = (w, h, d, x, y, z, c) => paint(new THREE.BoxGeometry(w, h, d).translate(x, y, z), c[0], c[1], c[2]);
const BODY = { bank: [0.9, 0.15, 0.15], casino: [0.55, 0.15, 0.8], motel: [0.15, 0.55, 0.75] };
function carGeometry(col) {
    const dark = [0.06, 0.06, 0.08], glass = [0.08, 0.14, 0.2], parts = [box(2.0, 0.55, 4.4, 0, 0.65, 0, col), box(1.9, 0.75, 1.5, 0, 1.2, 1.25, col), box(1.7, 0.4, 0.06, 0, 1.3, 2.02, glass), box(1.8, 0.1, 2.3, 0, 0.95, -1.15, dark)];
    for (const sx of [-0.95, 0.95]) parts.push(box(0.08, 0.35, 2.3, sx, 1.1, -1.15, col));
    parts.push(box(1.9, 0.35, 0.08, 0, 1.1, -2.3, col));
    for (const sx of [-1, 1]) { parts.push(box(0.3, 0.18, 0.06, sx * 0.65, 0.7, 2.22, [3, 3, 2.2])); parts.push(box(0.3, 0.14, 0.06, sx * 0.7, 0.7, -2.22, [2.4, 0.2, 0.2])); for (const z of [-1.4, 1.4]) { const w = new THREE.CylinderGeometry(0.38, 0.38, 0.26, 12); w.rotateZ(Math.PI / 2); w.translate(sx * 1.0, 0.38, z); parts.push(paint(w, 0.04, 0.04, 0.05)); } }
    return mergeGeometries(parts);
}
// api: { clock() -> s, myKey: 'me', requestStart(carId, routeIndex), onBoard(carId, routeId), onArrive(), dismount() }
export function createVehicles(api) {
    const G = { geos: [], mats: [], cars: [], ride: null, lastReq: -9, hold: 0, arrived: false, boards: 0, dismounts: 0 };
    const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.4, metalness: 0.5 }); G.mats.push(mat);
    for (const v of VL.VEHICLES) {
        const g = carGeometry(BODY[v.id] || [0.5, 0.5, 0.5]); G.geos.push(g);
        const m = new THREE.Mesh(g, mat); const pp = VL.parkedPose(v.id); m.position.set(pp.x, 0, pp.z); m.rotation.y = pp.yaw; L.root.add(m);
        G.cars.push({ id: v.id, m: m, handles: VL.handlePoints(v.id), yaw: pp.yaw });
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
            } else { const pp = VL.parkedPose(car.id); car.m.position.set(pp.x, 0, pp.z); car.yaw = pp.yaw; car.m.rotation.y = pp.yaw; }
            // start: dotknięcie klamki wolnego auta (rzadkie żądania)
            if (!mine && !G.ride && (!f || !f.occ) && now - G.lastReq > 1) for (const h of car.handles) if (touching(h.x, h.y, h.z, VL.RIDE.HANDLE_R)) { G.lastReq = now; api.requestStart(car.id, h.route); break; }
        }
        // jazda lokalnego gracza: tylko przesunięcie ciała (kamera się nie obraca)
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
    G.riding = () => !!G.ride;
    G.debug = () => ({ riding: !!G.ride, boards: G.boards, dismounts: G.dismounts, cars: G.cars.map(c => [c.id, +c.m.position.x.toFixed(1), +c.m.position.z.toFixed(1)]), speed: G.ride ? +G.ride.pose.speed.toFixed(2) : 0 });
    G.dispose = () => { for (const c of G.cars) c.m.removeFromParent(); for (const g of G.geos) g.dispose(); for (const m of G.mats) m.dispose(); };
    return G;
}
