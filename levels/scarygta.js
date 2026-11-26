// ==========================================
// POZIOM: SCARY GTA (nocne, neonowe miasto w stylu Florydy, 160 x 150 m, ok. 24 000 m^2 = 2x Maze). Układ w czystym core/citylayout.js (testy: tests/logic.mjs, tests/city.mjs).
// Etap 1: miasto z chunków (kwartał = jedna scalona siatka, wyłączana poza CITY.VIS_R), neony, latarnie, samochody i palmy (instancje), marina z jachtem, plaża z pirsem,
// sześć toreb łupu (jubiler, bank, kasyno na dachu, stacja benzynowa, wieża radiowa na szczycie, jacht) i wyjście łodzią z pirsu (drzwi EXIT, wymaga co najmniej jednej torby).
// Ciężar łupu: z torbą ruch jest wolniejszy o 8% (L.moveScale). Kolejne etapy: policja i gwiazdki, online i strzelanie graczy, helikopter, nowy potwór.
// ==========================================
import { THREE, CANNON, L, scene, camera, addStaticBody } from '../core/engine.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { levelReward } from '../core/economy.js';
import { toast } from '../core/terminal.js';
import * as SFX from '../core/audio.js';
import { PACE } from '../core/config.js';
import { ARRIVAL_FROM_SCARYGTA } from './levels.js';
import { buildDoor, cameraPanel, panelBg } from '../core/levelkit.js';
import * as C from '../core/citylayout.js';

export const info = { id: 'scarygta', name: 'Scary GTA', spawn: [0, 1, 56] };   // = CITY.SPAWN (test w tests/logic.mjs pilnuje zgodności)
const TILE = 8, CARRY_SLOW = 0.92, NEON = [0xff2a9a, 0x20e0ff, 0xff8a20, 0xa050ff, 0x40ff80, 0xff3050];
const ROLE_TINT = { downtown: [0.5, 0.58, 0.72], casino: [0.62, 0.42, 0.74], old: [0.74, 0.58, 0.46], motel: [0.78, 0.5, 0.56], industrial: [0.5, 0.52, 0.5], warehouse: [0.46, 0.5, 0.56], plaza: [0.6, 0.6, 0.55], marina: [0.5, 0.45, 0.38] };
let S = null;
const _p = new THREE.Vector3(), _d = new THREE.Vector3();

function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function paint(g, r, gr, b) { const n = g.attributes.position.count, a = new Float32Array(n * 3); for (let i = 0; i < n; i++) { a[i * 3] = r; a[i * 3 + 1] = gr; a[i * 3 + 2] = b; } g.setAttribute('color', new THREE.BufferAttribute(a, 3)); return g; }
// Prostopadłościan z UV w metrach (okna kafelkują się co TILE m), dachy i spody na jednolitym polu tekstury (róg 0,01 / 0,99)
function boxGeo(b, col) {
    const w = b.x1 - b.x0, h = b.y1 - b.y0, d = b.z1 - b.z0, g = new THREE.BoxGeometry(w, h, d);
    g.translate((b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2, (b.z0 + b.z1) / 2);
    const uv = g.attributes.uv;
    for (let f = 0; f < 6; f++) for (let v = 0; v < 4; v++) {
        const i = f * 4 + v, u0 = uv.getX(i), v0 = uv.getY(i);
        if (f < 2) uv.setXY(i, (u0 * d + b.z0) / TILE, (v0 * h + b.y0) / TILE);
        else if (f < 4) uv.setXY(i, 0.01, 0.99);
        else uv.setXY(i, (u0 * w + b.x0) / TILE, (v0 * h + b.y0) / TILE);
    }
    return paint(g, col[0], col[1], col[2]);
}
// Tekstury okien: 512 px = 8 x 8 m, 4 x 4 okna; część świeci (mapa emisji). Róg (0..10 px) zostaje jednolity dla dachów
function windowTextures() {
    const R = rng(77), c = document.createElement('canvas'), e = document.createElement('canvas'); c.width = c.height = e.width = e.height = 512;
    const x = c.getContext('2d'), y = e.getContext('2d'), LIT = ['#ffd27a', '#7fe8ff', '#ff7ac8', '#fff0c0'];
    x.fillStyle = '#7a7f88'; x.fillRect(0, 0, 512, 512); y.fillStyle = '#000'; y.fillRect(0, 0, 512, 512);
    for (let r = 0; r < 4; r++) for (let q = 0; q < 4; q++) {
        const wx = q * 128 + 22, wy = r * 128 + 28, lit = R() < 0.38;
        x.fillStyle = '#58606a'; x.fillRect(wx - 6, wy - 6, 96, 86);
        x.fillStyle = lit ? LIT[(R() * LIT.length) | 0] : '#10151c'; x.fillRect(wx, wy, 84, 74);
        if (lit) { y.fillStyle = x.fillStyle; y.fillRect(wx, wy, 84, 74); }
        x.fillStyle = 'rgba(0,0,0,0.25)'; x.fillRect(wx, wy + 36, 84, 4);
    }
    for (let i = 0; i < 400; i++) { x.fillStyle = 'rgba(0,0,0,' + (R() * 0.08).toFixed(3) + ')'; x.fillRect(R() * 512, R() * 512, 3, 3); }
    x.fillStyle = '#7a7f88'; x.fillRect(0, 0, 12, 12); y.fillStyle = '#000'; y.fillRect(0, 0, 12, 12);
    const mk = (cv) => { const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4; return t; };
    return [mk(c), mk(e)];
}
const add = (arr, g) => { arr.push(g); return g; };

export function build() {
    const CI = C.CITY, R = rng(4242);
    L.spawn = CI.SPAWN.slice();
    L.bounds = { minX: CI.X0 + 0.6, maxX: CI.X1 - 0.6, minZ: CI.Z0 + 0.6, maxZ: CI.Z1 - 0.6, maxY: CI.MAX_H + 6 };
    L.ballBounds = { minX: CI.X0 + 0.3, maxX: CI.X1 - 0.3, minZ: CI.Z0 + 0.3, maxZ: CI.Z1 - 0.3, maxY: CI.MAX_H + 6 };   // piłki i torby nie są teleportowane do pokoju 30 x 30 (core/engine.js: containBall)
    scene.fog.density = 0.024;
    S = { geos: [], mats: [], texs: [], chunks: [], bags: [], got: 0, clock: 0, visT: 0, hudT: 0, leaving: false, buildings: C.buildCity(1337) };
    const geo = (g) => { S.geos.push(g); return g; }, mat = (m) => { S.mats.push(m); return m; };
    const [wt, et] = windowTextures(); S.texs.push(wt, et);
    const facade = mat(new THREE.MeshStandardMaterial({ map: wt, emissiveMap: et, emissive: 0xffffff, emissiveIntensity: 1.1, vertexColors: true, roughness: 0.78, metalness: 0.08 }));
    const neonMat = mat(new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false }));
    // ----- podłoże: asfalt, plaża, morze, kolizja podłogi i barierka od morza -----
    const ground = new THREE.Mesh(geo(new THREE.PlaneGeometry(CI.X1 - CI.X0, CI.SEA_Z - CI.Z0)), mat(new THREE.MeshStandardMaterial({ color: 0x1a1c22, roughness: 0.55, metalness: 0.2 })));
    ground.rotation.x = -Math.PI / 2; ground.position.set(0, 0, (CI.Z0 + CI.SEA_Z) / 2); ground.receiveShadow = false; L.root.add(ground);
    const sand = new THREE.Mesh(geo(new THREE.PlaneGeometry(CI.X1 - CI.X0, CI.SEA_Z - CI.BEACH_Z)), mat(new THREE.MeshStandardMaterial({ color: 0x6a5a40, roughness: 1 })));
    sand.rotation.x = -Math.PI / 2; sand.position.set(0, 0.02, (CI.BEACH_Z + CI.SEA_Z) / 2); L.root.add(sand);
    const sea = new THREE.Mesh(geo(new THREE.PlaneGeometry(CI.X1 - CI.X0 + 60, CI.Z1 - CI.SEA_Z + 40)), mat(new THREE.MeshStandardMaterial({ color: 0x06121e, roughness: 0.12, metalness: 0.5 })));
    sea.rotation.x = -Math.PI / 2; sea.position.set(0, -0.5, (CI.SEA_Z + CI.Z1 + 40) / 2); L.root.add(sea);
    addStaticBody(0, -0.5, (CI.Z0 + CI.Z1) / 2, new CANNON.Box(new CANNON.Vec3((CI.X1 - CI.X0) / 2 + 2, 0.5, (CI.Z1 - CI.Z0) / 2 + 2)), ground, false);
    for (const sx of [-1, 1]) { const w = (CI.X1 - CI.PIER.w / 2 - 0.5) / 2 + 0.2, cx = sx * (CI.PIER.w / 2 + w); addStaticBody(cx, 1.5, CI.SEA_Z + 0.5, new CANNON.Box(new CANNON.Vec3(w, 1.5, 0.3)), ground, false); }   // barierka od morza po obu stronach pirsu
    // ----- chunki: kwartały z budynkami, rusztowaniami, neonami i podstawą chodnika -----
    for (const ch of C.cityChunks()) {
        const geos = [], neon = [], blk = C.blockRect(ch.i, ch.j), rt = ROLE_TINT[ch.role];
        add(geos, boxGeo({ x0: blk.x0, x1: blk.x1, y0: 0, y1: 0.16, z0: blk.z0, z1: blk.z1 }, [rt[0] * 0.8, rt[1] * 0.8, rt[2] * 0.8]));   // chodnik (bez kolizji, tylko wygląd)
        for (const b of S.buildings.filter(q => q.i === ch.i && q.j === ch.j)) {
            const tn = 0.78 + b.tint * 0.35, col = [rt[0] * tn, rt[1] * tn, rt[2] * tn];
            const boxes = b.hollow ? C.hollowBoxes(b) : [{ x0: b.x0, x1: b.x1, y0: 0, y1: b.h, z0: b.z0, z1: b.z1 }];
            for (const q of boxes) {
                add(geos, boxGeo(q, col));
                addStaticBody((q.x0 + q.x1) / 2, (q.y0 + q.y1) / 2, (q.z0 + q.z1) / 2, new CANNON.Box(new CANNON.Vec3((q.x1 - q.x0) / 2, (q.y1 - q.y0) / 2, (q.z1 - q.z0) / 2)), ground, false);
                L.obstacles[L.obstacles.length - 1].grip = CI.GRIP;   // ściany budynków są śliskie: na dach wchodzi się rusztowaniem
            }
            if (b.scaffold) { const s = C.scaffoldBox(b); add(geos, boxGeo(s, [0.28, 0.3, 0.34])); addStaticBody((s.x0 + s.x1) / 2, (s.y0 + s.y1) / 2, (s.z0 + s.z1) / 2, new CANNON.Box(new CANNON.Vec3((s.x1 - s.x0) / 2, (s.y1 - s.y0) / 2, (s.z1 - s.z0) / 2)), ground, false); }
            if (b.hollow) { const l = new THREE.PointLight(0xffc880, 11, 16, 2); l.position.set((b.x0 + b.x1) / 2, Math.min(b.hollow.baseH, 6) - 1.4, (b.z0 + b.z1) / 2); L.root.add(l); }
            // neon na ścianie od strony ulicy (południe albo północ), 5 m nad chodnikiem
            if (b.h >= 8 && !b.tower) { const nc = NEON[(R() * NEON.length) | 0], sz = R() < 0.5, zc = sz ? b.z1 + 0.12 : b.z0 - 0.12, sw = 3 + R() * 3, xc = (b.x0 + b.x1) / 2 + (R() - 0.5) * 2; add(neon, paint(new THREE.BoxGeometry(sw, 0.9, 0.2).translate(xc, 4.6 + R() * 2, zc), ((nc >> 16) & 255) / 255 * 1.6, ((nc >> 8) & 255) / 255 * 1.6, (nc & 255) / 255 * 1.6)); }
        }
        const grp = new THREE.Group(); L.root.add(grp);
        const fm = new THREE.Mesh(mergeGeometries(geos), facade); geo(fm.geometry); fm.castShadow = false; fm.receiveShadow = false; grp.add(fm);
        if (neon.length) { const nm = new THREE.Mesh(mergeGeometries(neon), neonMat); geo(nm.geometry); grp.add(nm); }
        const nl = new THREE.PointLight(NEON[(ch.i + ch.j * 3) % NEON.length], 16, 34, 2); nl.position.set(ch.center[0], 7, ch.center[1]); L.root.add(nl);
        S.chunks.push({ id: ch.id, c: ch.center, g: grp });
    }
    buildStreets(geo, mat, R); buildPier(geo, mat); buildMarina(geo, mat);
    buildProps(geo, mat, R);
    buildBags(geo, mat);
    // drzwi: wyjście na pirsie (wymaga torby) i powrót do Levels na plaży
    buildDoor({ x: 0, z: CI.EXIT[2] - 2, rotY: Math.PI, label: 'EXIT', color: '#ff9a60', glow: 0xff7030, wood: 0x2a1e18, light: true, collider: true,
        portal: { target: 'levels', spawn: ARRIVAL_FROM_SCARYGTA, cond: () => S && S.got > 0, deny: 'Take at least one bag before you leave.', onEnter: finish } });
    buildDoor({ x: -7, z: CI.BEACH_Z + 1, rotY: 0, label: 'LEVELS', color: '#bfe8ff', wood: 0x3a3228, collider: true, portal: { target: 'levels', spawn: ARRIVAL_FROM_SCARYGTA, onEnter: () => toast('Back to the levels') } });
    S.hud = cameraPanel(1024, 190, 0.42, 0.078, 0.2, -0.75, 990);
    toast('Steal the bags. Reach the pier. Walls are slippery: climb the scaffolds.', '#ff7ac8');
}

// ----- ulice: oznaczenia pasów (jedna siatka), latarnie (jedna siatka) -----
function buildStreets(geo, mat, R) {
    const CI = C.CITY, lines = [], lamps = [], lineMat = mat(new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false })), lampMat = mat(new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false }));
    const vx = [0, 1, 2].map(i => C.blockRect(i, 0).x1 + CI.STREET / 2), hz = [0, 1].map(j => C.blockRect(0, j).z1 + CI.STREET / 2), bz = (CI.BLV[0] + CI.BLV[1]) / 2;
    const dash = (x, z, w, d) => add(lines, paint(new THREE.BoxGeometry(w, 0.02, d).translate(x, 0.04, z), 1.4, 1.2, 0.5));
    for (const x of vx) for (let z = CI.Z0 + 4; z < CI.BLV[0]; z += 6) dash(x, z, 0.2, 3);
    for (const z of hz.concat([bz])) for (let x = CI.X0 + 4; x < CI.X1 - 2; x += 6) dash(x, z, 3, 0.2);
    for (let x = CI.X0 + 3; x < CI.X1; x += 6) { add(lines, paint(new THREE.BoxGeometry(2.4, 0.02, 4).translate(x, 0.04, CI.BLV[0] + 3), 0.9, 0.9, 0.9)); }   // zebra przy bulwarze
    const post = (x, z) => { add(lamps, paint(new THREE.CylinderGeometry(0.09, 0.11, 6.2, 6).translate(x, 3.1, z), 0.08, 0.08, 0.1)); add(lamps, paint(new THREE.BoxGeometry(0.7, 0.18, 0.4).translate(x, 6.25, z), 2, 1.6, 1)); };
    for (const x of vx) for (let z = CI.Z0 + 8; z < CI.BLV[0] - 4; z += 19) { post(x - 6.5, z); post(x + 6.5, z + 9); }
    for (const z of hz.concat([bz])) for (let x = CI.X0 + 10; x < CI.X1 - 6; x += 19) { post(x, z - 6.5); post(x + 9, z + 6.5); }
    const lm = new THREE.Mesh(geo(mergeGeometries(lines)), lineMat); L.root.add(lm);
    const pm = new THREE.Mesh(geo(mergeGeometries(lamps)), lampMat); L.root.add(pm);
}
// ----- pirs: deski, słupki, łódź na końcu -----
function buildPier(geo, mat) {
    const P = C.CITY.PIER, parts = [];
    add(parts, paint(new THREE.BoxGeometry(P.w, 0.12, P.z1 - P.z0).translate(P.x, 0.02, (P.z0 + P.z1) / 2), 0.35, 0.24, 0.14));
    for (let z = P.z0 + 1; z <= P.z1; z += 3) for (const sx of [-1, 1]) add(parts, paint(new THREE.CylinderGeometry(0.14, 0.14, 2.4, 6).translate(sx * (P.w / 2 - 0.2), -0.9, z), 0.2, 0.14, 0.1));
    for (const sx of [-1, 1]) add(parts, paint(new THREE.BoxGeometry(0.1, 0.9, P.z1 - P.z0).translate(sx * P.w / 2, 0.55, (P.z0 + P.z1) / 2), 0.4, 0.3, 0.2));   // balustrada
    add(parts, paint(new THREE.BoxGeometry(7, 1.2, 9).translate(0, -0.2, P.z1 + 3), 0.8, 0.78, 0.7));   // kadłub łodzi za końcem pirsu
    add(parts, paint(new THREE.BoxGeometry(3.4, 2.2, 3.4).translate(0, 1.5, P.z1 + 2.2), 0.7, 0.68, 0.62));
    const m = new THREE.Mesh(geo(mergeGeometries(parts)), mat(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8 }))); L.root.add(m);
    const l = new THREE.PointLight(0xff9a60, 14, 20, 2); l.position.set(0, 3.5, P.z1 - 4); L.root.add(l);
}
// ----- marina: pomosty, woda (płytka, do brodzenia: tu będą aligatory), jacht z torbą -----
function buildMarina(geo, mat) {
    const b = C.blockRect(0, 2), Y = C.YACHT, parts = [];
    const water = new THREE.Mesh(geo(new THREE.PlaneGeometry(b.x1 - b.x0 - 4, b.z1 - b.z0 - 4)), mat(new THREE.MeshStandardMaterial({ color: 0x0c2a22, roughness: 0.1, metalness: 0.4, transparent: true, opacity: 0.92 })));
    water.rotation.x = -Math.PI / 2; water.position.set((b.x0 + b.x1) / 2, 0.05, (b.z0 + b.z1) / 2); L.root.add(water);
    for (let z = b.z0 + 2; z < b.z1; z += 6) add(parts, paint(new THREE.BoxGeometry(b.x1 - b.x0, 0.22, 1.4).translate((b.x0 + b.x1) / 2, 0.1, z), 0.32, 0.22, 0.13));   // pomosty
    add(parts, paint(new THREE.BoxGeometry(Y.w, 1.4, Y.d).translate(Y.x, 0.4, Y.z), 0.9, 0.9, 0.92));                                              // kadłub
    add(parts, paint(new THREE.BoxGeometry(Y.w - 0.8, 1.6, Y.d * 0.45).translate(Y.x, Y.h - 0.3, Y.z + 1.8), 0.78, 0.8, 0.85));                        // kabina
    add(parts, paint(new THREE.BoxGeometry(Y.w, 0.2, Y.d * 0.5).translate(Y.x, Y.h - 1.4 + 1.2, Y.z - 3), 0.5, 0.35, 0.2));                           // pokład dziobowy
    const m = new THREE.Mesh(geo(mergeGeometries(parts)), mat(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5, metalness: 0.2 }))); L.root.add(m);
    addStaticBody(Y.x, 1.1, Y.z, new CANNON.Box(new CANNON.Vec3(Y.w / 2, 1.1, Y.d / 2)), m, false);   // jacht jako bryła: wchodzi się na pokład po dachu kabiny z pomostu
    for (const z of [b.z0 + 2, b.z0 + 8, b.z0 + 14, b.z0 + 20]) addStaticBody((b.x0 + b.x1) / 2, 0.1, z, new CANNON.Box(new CANNON.Vec3((b.x1 - b.x0) / 2, 0.11, 0.7)), m, false);
    const l = new THREE.PointLight(0x40ffb0, 12, 26, 2); l.position.set(Y.x, 6, Y.z); L.root.add(l);
}
// ----- rekwizyty: samochody (instancje + kolizje), palmy (instancje) -----
function buildProps(geo, mat, R) {
    const CI = C.CITY, cars = [], palms = [];
    const body = paint(new THREE.BoxGeometry(2, 0.7, 4.3).translate(0, 0.55, 0), 1, 1, 1), cab = paint(new THREE.BoxGeometry(1.7, 0.6, 2.2).translate(0, 1.15, -0.2), 0.45, 0.5, 0.55);
    const carG = geo(mergeGeometries([body, cab])), carI = new THREE.InstancedMesh(carG, mat(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.35, metalness: 0.6 })), 60);
    let n = 0; const col = new THREE.Color(), dummy = new THREE.Object3D(), put = (x, z, alongZ) => { if (n >= 60) return; dummy.position.set(x, 0, z); dummy.rotation.set(0, alongZ ? 0 : Math.PI / 2, (R() - 0.5) * 0.04); dummy.updateMatrix(); carI.setMatrixAt(n, dummy.matrix); col.setHSL(R(), 0.55, 0.28 + R() * 0.2); carI.setColorAt(n, col); n++; addStaticBody(x, 0.7, z, new CANNON.Box(new CANNON.Vec3(alongZ ? 1.0 : 2.15, 0.7, alongZ ? 2.15 : 1.0)), carI, false); };
    const vx = [0, 1, 2].map(i => C.blockRect(i, 0).x1 + CI.STREET / 2), hz = [0, 1].map(j => C.blockRect(0, j).z1 + CI.STREET / 2);
    for (const x of vx) for (let z = CI.Z0 + 10; z < CI.BLV[0] - 6; z += 23) if (R() < 0.55) put(x + (R() < 0.5 ? -4.2 : 4.2), z + R() * 6, true);
    for (const z of hz) for (let x = CI.X0 + 12; x < CI.X1 - 10; x += 27) if (R() < 0.45) put(x + R() * 6, z + (R() < 0.5 ? -4.2 : 4.2), false);
    for (let x = CI.X0 + 14; x < CI.X1 - 10; x += 21) if (R() < 0.6) put(x, CI.BLV[0] + 3 + (R() < 0.5 ? 0 : 12), false);
    carI.count = n; carI.instanceMatrix.needsUpdate = true; if (carI.instanceColor) carI.instanceColor.needsUpdate = true; L.root.add(carI);
    S.carCount = n;
    const trunk = paint(new THREE.CylinderGeometry(0.12, 0.2, 5, 6).translate(0, 2.5, 0), 0.32, 0.22, 0.12), fr = [trunk];
    for (let k = 0; k < 6; k++) { const f = paint(new THREE.BoxGeometry(2.6, 0.05, 0.55).translate(1.3, 0, 0), 0.08, 0.35, 0.12); f.rotateZ(-0.35); f.rotateY(k * Math.PI / 3); f.translate(0, 5, 0); fr.push(f); }
    const palmG = geo(mergeGeometries(fr)), palmI = new THREE.InstancedMesh(palmG, mat(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, side: THREE.DoubleSide })), 120);
    let m = 0; const putP = (x, z) => { if (m >= 120) return; dummy.position.set(x, 0, z); dummy.rotation.set(0, R() * 6.28, 0); const s = 0.8 + R() * 0.5; dummy.scale.set(s, s, s); dummy.updateMatrix(); palmI.setMatrixAt(m++, dummy.matrix); dummy.scale.set(1, 1, 1); };
    for (let x = CI.X0 + 6; x < CI.X1 - 4; x += 9) { putP(x, CI.BLV[0] + 1.2); putP(x + 4, CI.BLV[1] - 1.2); }
    for (let x = CI.X0 + 8; x < CI.X1 - 4; x += 12) putP(x + R() * 3, CI.BEACH_Z + 2 + R() * 4);
    const pz = C.blockRect(1, 2); for (const [x, z] of [[pz.x0 + 3, pz.z0 + 3], [pz.x1 - 3, pz.z0 + 3], [pz.x0 + 3, pz.z1 - 3], [pz.x1 - 3, pz.z1 - 3]]) putP(x, z);
    palmI.count = m; palmI.instanceMatrix.needsUpdate = true; L.root.add(palmI);
}
// ----- torby łupu: worek, pierścień i słup światła widoczny z daleka -----
function buildBags(geo, mat) {
    const spots = C.bagSpots(S.buildings), sack = geo(new THREE.SphereGeometry(0.3, 14, 10)), knot = geo(new THREE.ConeGeometry(0.1, 0.22, 8)), ring = geo(new THREE.TorusGeometry(0.42, 0.025, 6, 20)), beam = geo(new THREE.CylinderGeometry(0.12, 0.12, 36, 8, 1, true));
    const sm = mat(new THREE.MeshStandardMaterial({ color: 0x8a6a2a, roughness: 0.8 })), gm = mat(new THREE.MeshBasicMaterial({ color: 0xffd060, toneMapped: false })), bm = mat(new THREE.MeshBasicMaterial({ color: 0xffc040, transparent: true, opacity: 0.28, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }));
    for (const s of spots) {
        const g = new THREE.Group(); g.position.set(s.x, s.y, s.z); L.root.add(g);
        const a = new THREE.Mesh(sack, sm); a.scale.set(1, 0.9, 1); g.add(a); const k = new THREE.Mesh(knot, sm); k.position.y = 0.34; g.add(k);
        const r = new THREE.Mesh(ring, gm); r.rotation.x = Math.PI / 2; r.position.y = -0.1; g.add(r);
        const b = new THREE.Mesh(beam, bm); b.position.y = 18; g.add(b);
        const l = new THREE.PointLight(0xffc040, 9, 12, 2); l.position.y = 0.6; g.add(l);
        S.bags.push({ id: s.id, x: s.x, y: s.y, z: s.z, g: g, got: false });
    }
}

// ----- przebieg -----
function finish() {
    if (S.leaving) return; S.leaving = true;
    const n = S.got; toast('Heist complete: ' + n + ' bag' + (n === 1 ? '' : 's') + '!', '#7fff90');
    levelReward('scarygta', 120 * n, 60 * n, 'a heist with ' + n + ' bags');
}
const ARROWS = ['↑', '↗', '→', '↘', '↓', '↙', '←', '↖'];
function arrowTo(px, pz, tx, tz) {
    camera.getWorldDirection(_d); const head = Math.atan2(_d.x, _d.z), brg = Math.atan2(tx - px, tz - pz);
    let rel = brg - head; rel = Math.atan2(Math.sin(rel), Math.cos(rel)); return ARROWS[((Math.round(rel / (Math.PI / 4)) % 8) + 8) % 8];   // kierunek w lewo to dodatni kąt w tym układzie, więc strzałki są lustrzane do bearingu
}
function drawHud(p) {
    const x = S.hud.ctx; panelBg(S.hud, 'rgba(12,8,20,0.74)', '#ff2a9a');
    x.textBaseline = 'middle'; x.textAlign = 'left';
    x.font = 'bold 64px "Courier New", monospace'; x.fillStyle = S.got === S.bags.length ? '#7fff90' : '#ff7ac8'; x.fillText('BAGS ' + S.got + '/' + S.bags.length, 30, 62);
    let best = null, bd = 1e9; for (const b of S.bags) if (!b.got) { const d = Math.hypot(b.x - p.x, b.z - p.z); if (d < bd) { bd = d; best = b; } }
    x.font = 'bold 28px "Courier New", monospace'; x.fillStyle = '#ffd27a';
    if (best) x.fillText('NEAREST ' + arrowTo(p.x, p.z, best.x, best.z) + ' ' + Math.round(bd) + ' m   (' + best.id.toUpperCase() + ')', 30, 118);
    const ex = C.CITY.EXIT; x.fillStyle = S.got > 0 ? '#7fff90' : '#8a8090'; x.fillText('PIER ' + arrowTo(p.x, p.z, ex[0], ex[2]) + ' ' + Math.round(Math.hypot(ex[0] - p.x, ex[2] - p.z)) + ' m' + (S.got > 0 ? '  (carrying: slower)' : ''), 30, 158);
    S.hud.update();
}
export function update(dt, t, ctx) {
    if (!S || S.leaving) return;
    S.clock += dt; const p = ctx.body.position;
    L.moveScale = PACE * (S.got > 0 ? CARRY_SLOW : 1);   // ciężar łupu: -8% ruchu z torbą
    S.visT -= dt;
    if (S.visT <= 0) { S.visT = 0.3; camera.getWorldPosition(_p); for (const c of S.chunks) c.g.visible = Math.hypot(_p.x - c.c[0], _p.z - c.c[1]) < C.CITY.VIS_R + 20; }   // chunki poza zasięgiem znikają z renderu
    for (const b of S.bags) {
        if (b.got) continue;
        b.g.rotation.y = t * 1.4; b.g.position.y = b.y + Math.sin(t * 2 + b.x) * 0.07;
        if (Math.hypot(p.x - b.x, p.z - b.z) < 1.5 && Math.abs((p.y - 1.0) - b.y) < 2.4) takeBag(b);
    }
    S.hudT -= dt; if (S.hudT <= 0) { S.hudT = 0.2; drawHud(p); }
}
function takeBag(b) {
    b.got = true; b.g.visible = false; S.got++;
    toast('Bag ' + S.got + '/' + S.bags.length + ': ' + b.id + (S.got === 1 ? '. You are slower while carrying loot. Head for the pier!' : ''), '#ffd27a'); SFX.bell && SFX.bell();
}
export const testState = () => S;   // dla testów
export const debugCity = () => S ? { chunks: S.chunks.length, visible: S.chunks.filter(c => c.g.visible).length, bags: S.bags.length, got: S.got, moveScale: L.moveScale, cars: S.carCount, buildings: S.buildings.length } : null;
export function debugTakeBag(id) { const b = S && S.bags.find(q => q.id === id && !q.got); if (!b) return false; takeBag(b); return true; }
export function dispose() {
    if (S) { S.hud.dispose(); for (const g of S.geos) g.dispose(); for (const m of S.mats) m.dispose(); for (const x of S.texs) x.dispose(); }
    S = null;
}
