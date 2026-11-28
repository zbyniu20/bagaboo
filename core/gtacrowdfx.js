// ==========================================
// SCARY GTA: ŻYWE MIASTO (3D; reguły w czystym core/gtacrowd.js, testy: tests/gtalife.mjs). Przechodnie to DWIE siatki instancjonowane (ciała i głowy, żeby głowa mogła obracać się za graczem), a ruch uliczny
// to JEDNA siatka instancjonowana: razem 3 wywołania rysowania bez względu na liczbę (40 przechodniów i 8 aut na High, 24 i 5 na Medium, nic na Low). Nic tu nie ma ciała fizyki ani wpisu na liście przeszkód dla strzałów i wzroku policji,
// nic nie idzie przez sieć i nic nie rusza ciepła: to tylko wizualna warstwa miasta (strzały i policja przechodzą przez nią). Pojawianie się odbywa się poza polem widzenia gracza (albo daleko), żeby nikt
// nie wyskakiwał z powietrza. W blackoucie przechodnie zastygają i patrzą, skradają się, gdy na nich nie patrzysz (poza Gentle), a gdy światło wraca, znikają; auta gasną, a jedno budzi się ze światłami.
// ==========================================
import { THREE, L } from './engine.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { SETTINGS, GAMES_CALM } from './settings.js';
import { seenBy } from './statuelogic.js';
import * as K from './gtacrowd.js';

const paint = (g, r, gr, b) => { const n = g.attributes.position.count, a = new Float32Array(n * 3); for (let i = 0; i < n; i++) { a[i * 3] = r; a[i * 3 + 1] = gr; a[i * 3 + 2] = b; } g.setAttribute('color', new THREE.BufferAttribute(a, 3)); return g; };
const box = (w, h, d, x, y, z, c) => paint(new THREE.BoxGeometry(w, h, d).translate(x, y, z), c[0], c[1], c[2]);
const COATS = [[0.16, 0.16, 0.18], [0.28, 0.2, 0.14], [0.12, 0.16, 0.28], [0.2, 0.24, 0.16], [0.3, 0.1, 0.12], [0.07, 0.07, 0.08]];

// o: { api }; api: { night() -> 'calm'|'blackout'|'horde', obstacles() -> [{ x, z }] }
export function createGtaLife(o) {
    const api = o.api, root = L.root, G = { geos: [], mats: [], peds: [], cars: [], t: 0, log: [] };
    const geo = (g) => { G.geos.push(g); return g; }, mat = (m) => { G.mats.push(m); return m; };
    const counts = K.lifeCounts(SETTINGS.quality, GAMES_CALM.on), MAXP = Math.max(1, K.LIFE.PED.high), MAXC = Math.max(1, K.LIFE.CARS.high);
    // ----- przechodnie: ciało (nogi, tors, ręce) i głowa; kolor ubrania niesie kolor instancji -----
    const bodyG = geo(mergeGeometries([box(0.17, 0.78, 0.2, -0.1, 0.39, 0, [1, 1, 1]), box(0.17, 0.78, 0.2, 0.1, 0.39, 0, [0.8, 0.8, 0.8]), box(0.44, 0.62, 0.24, 0, 1.08, 0, [1, 1, 1]), box(0.11, 0.58, 0.13, -0.28, 1.06, 0, [0.9, 0.9, 0.9]), box(0.11, 0.58, 0.13, 0.28, 1.06, 0, [0.9, 0.9, 0.9])]));
    const headG = geo(paint(new THREE.SphereGeometry(0.12, 8, 6), 0.78, 0.74, 0.7));
    G.body = new THREE.InstancedMesh(bodyG, mat(new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false })), MAXP); G.head = new THREE.InstancedMesh(headG, mat(new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false })), MAXP);
    for (const m of [G.body, G.head]) { m.frustumCulled = false; m.count = MAXP; m.visible = counts.ped > 0; root.add(m); }
    const _c = new THREE.Color(), _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s1 = new THREE.Vector3(1, 1, 1), _s0 = new THREE.Vector3(0, 0, 0);
    for (let i = 0; i < MAXP; i++) { _m.compose(_p.set(0, -50, 0), _q.identity(), _s0); G.body.setMatrixAt(i, _m); G.head.setMatrixAt(i, _m); G.body.setColorAt(i, _c.setRGB(1, 1, 1)); G.head.setColorAt(i, _c.setRGB(1, 1, 1)); }
    // ----- auta: korpus, kabina, światła (przód żółtawe, tył czerwone; wartości powyżej 1 świecą); jasność niesie kolor instancji -----
    const carG = geo(mergeGeometries([box(1.8, 0.7, 4.2, 0, 0.55, 0, [0.13, 0.13, 0.16]), box(1.6, 0.55, 2.2, 0, 1.17, -0.2, [0.1, 0.1, 0.14]), box(0.34, 0.16, 0.06, -0.6, 0.62, 2.11, [2.3, 2.1, 1.5]), box(0.34, 0.16, 0.06, 0.6, 0.62, 2.11, [2.3, 2.1, 1.5]), box(0.3, 0.14, 0.06, -0.62, 0.62, -2.11, [2, 0.1, 0.1]), box(0.3, 0.14, 0.06, 0.62, 0.62, -2.11, [2, 0.1, 0.1]), box(1.5, 0.45, 0.04, 0, 1.2, 0.92, [0.35, 0.55, 0.7])]));
    G.carM = new THREE.InstancedMesh(carG, mat(new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false })), MAXC); G.carM.frustumCulled = false; G.carM.count = MAXC; G.carM.visible = counts.cars > 0; root.add(G.carM);
    for (let i = 0; i < MAXC; i++) { _m.compose(_p.set(0, -50, 0), _q.identity(), _s0); G.carM.setMatrixAt(i, _m); G.carM.setColorAt(i, _c.setRGB(1, 1, 1)); }

    const gentle = () => SETTINGS.jumpscares === false;
    // Spawn poza polem widzenia (albo daleko): nikt nie wyskakuje z powietrza
    const hidden = (x, z, c, k) => Math.hypot(x - c.x, z - c.z) > 55 || !seenBy(c.x, c.z, k.lx, k.lz, x, z);
    function update(dt, c) {
        dt = Math.min(dt, 0.1); G.t += dt;
        const night = api.night(), blackout = night === 'blackout', look = Math.hypot(c.dx, c.dz) || 1, ctx = { px: c.x, pz: c.z, lx: c.dx / look, lz: c.dz / look, night: night, gentle: gentle() };
        // --- przechodnie ---
        const wantP = night === 'horde' ? 0 : counts.ped;
        for (let i = G.peds.length - 1; i >= 0; i--) { if (!G.peds[i].fixed) K.pedStep(G.peds[i], dt, ctx); if (G.peds[i].gone) G.peds.splice(i, 1); }
        if (G.peds.length < wantP) { const p = K.spawnPed(Math.random, c.x, c.z); if (p && hidden(p.x, p.z, c, ctx)) G.peds.push(p); }
        else if (G.peds.length > wantP && !blackout) { for (let i = G.peds.length - 1; i >= wantP; i--) if (!G.peds[i].fixed) G.peds.splice(i, 1); }   // nadmiar znika od końca (przechodnie `fixed` z testów zostają)
        for (let i = 0; i < MAXP; i++) {
            const p = G.peds[i];
            if (!p) { G.body.setMatrixAt(i, _m.compose(_p.set(0, -50, 0), _q.identity(), _s0)); G.head.setMatrixAt(i, _m); continue; }
            const bob = p.mode === 'walk' ? Math.abs(Math.sin(p.bob)) * 0.04 : 0;
            _e.set(0, p.yaw, 0); _q.setFromEuler(_e); G.body.setMatrixAt(i, _m.compose(_p.set(p.x, bob, p.z), _q, _s1)); G.body.setColorAt(i, _c.setRGB(COATS[p.hue][0], COATS[p.hue][1], COATS[p.hue][2]).multiplyScalar(1.7));
            _e.set(0, p.headYaw, 0); _q.setFromEuler(_e); G.head.setMatrixAt(i, _m.compose(_p.set(p.x, 1.62 + bob, p.z), _q, _s1));
        }
        G.body.instanceMatrix.needsUpdate = true; G.head.instanceMatrix.needsUpdate = true; if (G.body.instanceColor) G.body.instanceColor.needsUpdate = true;
        // --- auta ---
        if (counts.cars > 0) {
            const obs = (api.obstacles() || []).concat([{ x: c.x, z: c.z }]), cctx = { px: c.x, pz: c.z, night: night, obstacles: obs };
            for (let i = G.cars.length - 1; i >= 0; i--) { K.carStep(G.cars[i], dt, cctx); if (G.cars[i].gone) G.cars.splice(i, 1); }
            if (G.cars.length < counts.cars && night !== 'horde') { const car = K.spawnCar(Math.random, c.x, c.z); if (car && hidden(car.x, car.z, c, ctx)) G.cars.push(car); }
            // w blackoucie jedno auto (najbliższe w promieniu HAUNT_R) budzi się ze światłami; flaga siedzi na obiekcie auta, więc usuwanie innych aut jej nie psuje; poza blackoutem znika
            if (!blackout || gentle()) { for (const car of G.cars) car.haunted = false; }
            else if (!G.cars.some(car => car.haunted)) { const h = K.hauntedCar(G.cars, c.x, c.z); if (h >= 0) G.cars[h].haunted = true; }
        } else G.cars.length = 0;
        for (let i = 0; i < MAXC; i++) {
            const car = G.cars[i];
            if (!car) { G.carM.setMatrixAt(i, _m.compose(_p.set(0, -50, 0), _q.identity(), _s0)); continue; }
            _e.set(0, car.dir > 0 ? Math.PI / 2 : -Math.PI / 2, 0); _q.setFromEuler(_e); G.carM.setMatrixAt(i, _m.compose(_p.set(car.x, 0, car.z), _q, _s1)); G.carM.setColorAt(i, _c.setScalar(K.carBright(car)));
        }
        G.carM.instanceMatrix.needsUpdate = true; if (G.carM.instanceColor) G.carM.instanceColor.needsUpdate = true;
    }
    return {
        update, counts,
        debug: () => ({ peds: G.peds.length, fixed: G.peds.filter(p => p.fixed).length, cars: G.cars.length, frozen: G.peds.filter(p => p.mode === 'freeze').length, creeping: G.peds.filter(p => Math.hypot(p.ox, p.oz) > 0.05).length, dead: G.cars.filter(c => c.dead).length, haunted: G.cars.filter(c => c.haunted).length, moving: G.cars.filter(c => c.v > 0.1).length, wantP: counts.ped, wantC: counts.cars, meshes: [G.body.visible, G.head.visible, G.carM.visible].filter(Boolean).length, list: G.peds.slice(0, 40).map(p => [+p.x.toFixed(1), +p.z.toFixed(1), p.mode]) }),
        // Strzał: pierwszy przechodzień na torze o -> e (przyciętym do budynków z `boxes`) pada; zwraca { x, z, yaw } (yaw: kierunek strzału) albo null. Nie zatrzymuje pocisku.
        shoot(o, e, boxes) { const h = K.shootPeds(G.peds, o, e, boxes); if (!h) return null; const p = G.peds.splice(h.i, 1)[0]; return { x: p.x, z: p.z, yaw: Math.atan2(e[0] - o[0], e[2] - o[2]), zone: h.zone }; },
        // Auto najeżdża: wszyscy w promieniu r od punktu padają (kierunek jazdy yaw); zwraca listę { x, z, yaw }
        runOver(x, z, r, yaw) { const idx = K.pedsNear(G.peds, x, z, r), out = []; for (let k = idx.length - 1; k >= 0; k--) { const p = G.peds.splice(idx[k], 1)[0]; out.push({ x: p.x, z: p.z, yaw: yaw }); } return out; },
        add: (x, z) => { G.peds.push({ s: 0, t: 0, dir: 1, side: 1, speed: 0, hue: 0, x: x, z: z, yaw: 0, headYaw: 0, mode: 'stand', ox: 0, oz: 0, gone: false, bob: 0, fixed: true }); return true; },   // test: przechodzień stojący w znanym miejscu (nie jest ruszany w update)
        seed: (n) => { for (let i = 0; i < n; i++) { const p = K.spawnPed(Math.random, 0, 0); if (p) G.peds.push(p); } },
        dispose() { for (const m of [G.body, G.head, G.carM]) { m.removeFromParent(); m.dispose(); } for (const g of G.geos) g.dispose(); for (const m of G.mats) m.dispose(); G.peds.length = 0; G.cars.length = 0; }
    };
}
