// ==========================================
// POZIOM: LOBBY (zachód słońca, murale, manekiny, komputer, sklep, tablica wyników)
// Każdy poziom eksportuje: info, build(), update(dt, t, ctx)
// ==========================================
import { THREE, CANNON, L, camera, tex, addBody, addConstraint, addStaticBody, addCrispBlock, addBlobAO, place, seg, V3, UNIT_SPHERE, UNIT_BOX, UNIT_CYL, PIPE_CYL, flashlight, physicsMat, GROUP } from '../core/engine.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { GFX, LP } from '../core/config.js';
import * as T from '../core/textures.js';
import * as M from '../core/murals.js';
import { computer, shop, board, onPreview, previewLook } from '../core/ui.js';
import { createHead, createGorillaTorso } from '../core/avatar.js';
import { track } from '../core/economy.js';

export const info = { id: 'lobby', name: 'Lobby', spawn: [0, 2, 0] };
const ENV = LP.envIntensity;
let fx = null;   // stan animacji tego poziomu

export function build() {
    fx = { flickers: [], muralMats: [], trampMats: [], lampSprites: [], shaftMats: [], mist: [], mannequins: [], meatSpots: [], bulbSpots: [], cloudTex: null, preview: null, previewHead: null };
    L.spawn = info.spawn.slice();
    const root = L.root;

    for (const f of LP.flickers) {
        const l = new THREE.PointLight(f[3], f[4], f[5], 2); l.position.set(f[0], f[1], f[2]); root.add(l);
        fx.flickers.push({ l: l, base: f[4], ph: Math.random() * 100, subtle: false });
    }
    if (LP.bounce > 0) { const b = new THREE.PointLight(0xff8a50, LP.bounce, 24, 2); b.position.set(11, 6, 3); root.add(b); }

    // Podłoga i ściany
    addCrispBlock(0, -2.5, 0, 40, 5, 40, LP.floorTint, 0x440000, tex.floor, { rough: tex.floorRough, physical: true });
    addCrispBlock(0, 10, -17.5, 40, 20, 5, LP.wallTint, 0x550000);
    addCrispBlock(0, 10, 17.5, 40, 20, 5, LP.wallTint, 0x550000);
    addCrispBlock(-17.5, 10, 0, 5, 20, 40, LP.wallTint, 0x550000);
    addCrispBlock(17.5, 10, 0, 5, 20, 40, LP.wallTint, 0x550000);

    // Sufit: świetlik z niebem albo betonowa płyta
    if (LP.ceiling === 'concrete') addCrispBlock(0, 22.5, 0, 40, 5, 40, LP.wallTint, 0x440000);
    else {
        const g = new THREE.Group(); root.add(g);
        const base = new THREE.Mesh(new THREE.PlaneGeometry(31, 31), new THREE.MeshBasicMaterial({ map: T.createSkyBaseTexture(LP.sky), fog: false }));
        base.rotation.x = Math.PI / 2; base.position.set(0, 19.995, 0); g.add(base);
        fx.cloudTex = T.createCloudLayerTexture(LP.sky.clouds);
        const clouds = new THREE.Mesh(new THREE.PlaneGeometry(31, 31), new THREE.MeshBasicMaterial({ map: fx.cloudTex, transparent: true, depthWrite: false, fog: false }));
        clouds.rotation.x = Math.PI / 2; clouds.position.set(0, 19.985, 0); g.add(clouds);
        const beams = [];
        for (const p of [-15, -7.5, 0, 7.5, 15]) { beams.push(place(UNIT_BOX, p, 19.82, 0, 0, 0, 0, 0.42, 0.3, 30.4)); beams.push(place(UNIT_BOX, 0, 19.82, p, 0, 0, 0, 30.4, 0.3, 0.42)); }
        for (const px of [-7.5, 0, 7.5]) for (const pz of [-7.5, 0, 7.5]) beams.push(place(UNIT_BOX, px, 19.9, pz, 0, 0, 0, 0.7, 0.2, 0.7));
        const bm = new THREE.Mesh(mergeGeometries(beams), new THREE.MeshStandardMaterial({ color: 0x2b2e31, roughness: 0.5, metalness: 0.8, envMapIntensity: ENV }));
        bm.castShadow = true; bm.receiveShadow = true; g.add(bm);
        addStaticBody(0, 22.5, 0, new CANNON.Box(new CANNON.Vec3(20, 2.5, 20)), g, false);
    }

    // Murale z potworami
    const murals = [[M.monsterScream, 101, -6.5, 10.5, -14.93, 0], [M.monsterTall, 202, 7, 10.5, -14.93, 0], [M.monsterSpider, 303, -6.5, 10.5, 14.93, Math.PI],
        [M.monsterEldritch, 404, 7, 10.5, 14.93, Math.PI], [M.monsterDemon, 505, -14.93, 10.5, 7, Math.PI / 2], [M.monsterCrowd, 606, 14.93, 10.5, -6.5, -Math.PI / 2]];
    for (const mu of murals) {
        const tx = M.createMural(mu[0], mu[1]);
        const mat = new THREE.MeshStandardMaterial({ map: tx, emissiveMap: tx, emissive: 0xffffff, emissiveIntensity: LP.muralBase, transparent: true, roughness: 0.9, metalness: 0, depthWrite: false, envMapIntensity: 0.4, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
        const m = new THREE.Mesh(new THREE.PlaneGeometry(11, 11), mat);
        m.position.set(mu[2], mu[3], mu[4]); m.rotation.y = mu[5]; m.receiveShadow = true; root.add(m); fx.muralMats.push(mat);
    }

    buildTrampoline(0, 5);
    for (let i = 0; i < 12; i++) { const a = i * 0.7; addScaryStep(-7 + Math.cos(a) * 5, 1 + i * 1.2, -7 + Math.sin(a) * 5, 1.5, 3 + (i % 5)); }
    addCrispBlock(-7, 1 + 12 * 1.2, -7, 4, 0.3, 4, 0x6a3030, 0xff0000);
    addCrispBlock(8, 6, 8, 0.5, 12, 0.5, 0x555555, 0xff0000);
    addCrispBlock(8, 6, -2, 0.5, 12, 0.5, 0x555555, 0xff0000);
    addCrispBlock(8, 12, 3, 0.5, 0.5, 10.5, 0x555555, 0xff0000);
    for (let i = 0; i < 5; i++) addCrispBlock(7, 11.5, -1 + i * 2, 3, 0.2, 0.2, 0x333333, 0xff0000);
    buildBoneGrips();
    buildDecor();
    buildComputerDesk(3.5, -9);
    buildScoreboard();
    buildShop();
    buildChains();
    buildParticles();
    buildMannequins();
    for (const r of [[4, 18, -4, 12], [-4, 18, 4, 12], [0, 15, 0, 10], [6, 15, 6, 10], [-8, 14, -2, 9]]) addGutsRope(r[0], r[1], r[2], r[3]);
    createEyeball('ball1', 2, 1, -2); createEyeball('ball2', -2, 1, -2);
}

// Okrągła trampolina: stalowa rama, sprężyny, tkana mata i obręcz w pasy ostrzegawcze
function buildTrampoline(x, z) {
    const g = new THREE.Group(); g.position.set(x, 0, z); L.root.add(g);
    const R0 = 1.45;
    const steel = new THREE.MeshStandardMaterial({ color: 0x1c1d20, metalness: 0.85, roughness: 0.3, envMapIntensity: ENV });
    const chrome = new THREE.MeshStandardMaterial({ color: 0x9aa0a8, metalness: 1.0, roughness: 0.22, envMapIntensity: Math.max(0.6, ENV) });
    for (let i = 0; i < 6; i++) {
        const a = i / 6 * Math.PI * 2, leg = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, 0.38, 10), steel);
        leg.position.set(Math.cos(a) * R0 * 0.95, 0.19, Math.sin(a) * R0 * 0.95); leg.castShadow = true; g.add(leg);
    }
    const ring = new THREE.Mesh(new THREE.TorusGeometry(R0, 0.045, 10, 64), steel); ring.rotation.x = Math.PI / 2; ring.position.y = 0.38; ring.castShadow = true; g.add(ring);
    const padTex = T.createHazardTexture();
    const padMat = new THREE.MeshStandardMaterial({ map: padTex, emissiveMap: padTex, emissive: 0xff2200, emissiveIntensity: LP.trampBase, roughness: 0.6, envMapIntensity: ENV });
    const pad = new THREE.Mesh(new THREE.TorusGeometry(R0 + 0.02, 0.12, 12, 72), padMat);
    pad.rotation.x = Math.PI / 2; pad.position.y = 0.41; pad.scale.z = 0.45; pad.castShadow = true; pad.receiveShadow = true; g.add(pad);
    fx.trampMats.push(padMat);
    const springs = [];
    for (let i = 0; i < 36; i++) { const a = i / 36 * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a); springs.push(seg(V3(ca * (R0 - 0.02), 0.385, sa * (R0 - 0.02)), V3(ca * (R0 - 0.15), 0.365, sa * (R0 - 0.15)), 0.012, 0.012, 6)); }
    const sm = new THREE.Mesh(mergeGeometries(springs), chrome); sm.castShadow = true; g.add(sm);
    const matMesh = new THREE.Mesh(new THREE.CircleGeometry(R0 - 0.14, 64), new THREE.MeshStandardMaterial({ map: T.createTrampMatTexture(), roughness: 0.45, metalness: 0.1, envMapIntensity: ENV }));
    matMesh.rotation.x = -Math.PI / 2; matMesh.position.y = 0.36; matMesh.receiveShadow = true; g.add(matMesh);
    L.tramp = { mat: matMesh, k: 0 };
    addStaticBody(x, 0.2, z, new CANNON.Box(new CANNON.Vec3(1.5, 0.2, 1.5)), g, true);
}

function addScaryStep(x, y, z, size, sides) {
    const group = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ map: tex.wall, bumpMap: tex.wall, bumpScale: 1.2, color: 0x8a4040, metalness: 0.3, roughness: 0.55, envMapIntensity: ENV });
    const geo = new THREE.CylinderGeometry(size, size, 0.3, sides);
    const mesh = new THREE.Mesh(geo, mat); mesh.castShadow = true; mesh.receiveShadow = true;
    mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo), new THREE.LineBasicMaterial({ color: 0xff0000, transparent: true, opacity: 0.5 })));
    group.add(mesh);
    const spikeGeo = new THREE.ConeGeometry(size * 0.6, 1.5, sides), spike = new THREE.Mesh(spikeGeo, mat);
    spike.castShadow = true; spike.rotation.x = Math.PI; spike.position.y = -0.9;
    spike.add(new THREE.LineSegments(new THREE.EdgesGeometry(spikeGeo), new THREE.LineBasicMaterial({ color: 0xff0000, transparent: true, opacity: 0.4 })));
    group.add(spike);
    group.position.set(x, y, z); L.root.add(group);
    const half = size * Math.cos(Math.PI / sides) * 0.8;
    addStaticBody(x, y, z, new CANNON.Box(new CANNON.Vec3(half, 0.15, half)), group, false);
}

function buildBoneGrips() {
    const geo = new THREE.DodecahedronGeometry(0.3);
    const mat = new THREE.MeshStandardMaterial({ color: 0xc8b8a0, emissive: 0x140000, roughness: 0.8, bumpMap: tex.plaster, bumpScale: 0.8, envMapIntensity: ENV });
    const add = (x, y, z) => {
        const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.set(0, Math.random() * Math.PI * 2, 0);
        m.scale.set(0.6 + Math.random(), 0.3 + Math.random() * 0.5, 0.6 + Math.random()); m.castShadow = true; m.receiveShadow = true;
        m.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo), new THREE.LineBasicMaterial({ color: 0x880000, transparent: true, opacity: 0.5 })));
        L.root.add(m);
        addStaticBody(x, y, z, new CANNON.Box(new CANNON.Vec3(0.21 * m.scale.x, 0.21 * m.scale.y, 0.21 * m.scale.z)), m, false);
    };
    for (let i = 0; i < 25; i++) { add(-14.5, 2 + i * 0.7 + Math.random(), -10 + Math.random() * 5); add(14.5, 2 + i * 0.7 + Math.random(), 10 - Math.random() * 5); }
}

function floorPoint(R, near) {
    if (near) {
        const side = (R() * 4) | 0, d = 0.15 + R() * R() * 3.5, t = (R() * 2 - 1) * 14.5;
        if (side === 0) return [t, -14.85 + d];
        if (side === 1) return [t, 14.85 - d];
        if (side === 2) return [-14.85 + d, t];
        return [14.85 - d, t];
    }
    return [(R() * 2 - 1) * 14.5, (R() * 2 - 1) * 14.5];
}

function buildDecor() {
    const root = L.root;
    // Kałuże krwi
    const poolMat = new THREE.MeshStandardMaterial({ map: T.createBloodPoolTexture(), transparent: true, roughness: 0.1, depthWrite: false, envMapIntensity: ENV, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 });
    const poolGeo = new THREE.PlaneGeometry(1, 1);
    for (let i = 0; i < 11; i++) {
        const s = 1.2 + Math.random() * 2.6, m = new THREE.Mesh(poolGeo, poolMat);
        m.rotation.x = -Math.PI / 2; m.rotation.z = Math.random() * 6.28; m.scale.set(s, s * (0.7 + Math.random() * 0.5), 1);
        let x, z, tries = 0;
        do { x = (Math.random() * 2 - 1) * 13; z = (Math.random() * 2 - 1) * 13; tries++; } while ((Math.hypot(x, z) < 5.5 || Math.hypot(x - 3.5, z + 9) < 2 || Math.hypot(x + 13.4, z + 0.8) < 2.5) && tries < 40);
        m.position.set(x, 0.014, z); m.receiveShadow = true; root.add(m);
    }
    // Rytualny krąg
    const sig = new THREE.Mesh(new THREE.PlaneGeometry(13, 13), new THREE.MeshStandardMaterial({ map: T.createSigilTexture(), transparent: true, roughness: 0.28, depthWrite: false, envMapIntensity: ENV, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 }));
    sig.rotation.x = -Math.PI / 2; sig.position.y = 0.009; sig.receiveShadow = true; root.add(sig);
    // Cienie kontaktowe przy ścianach
    const aoC = T.makeCanvas(4, 128), aoX = aoC.getContext('2d'), aoG = aoX.createLinearGradient(0, 0, 0, 128);
    aoG.addColorStop(0, 'rgba(255,255,255,1)'); aoG.addColorStop(1, 'rgba(255,255,255,0)'); aoX.fillStyle = aoG; aoX.fillRect(0, 0, 4, 128);
    const aoMat = new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(aoC), color: 0x000000, transparent: true, opacity: 0.6, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
    const aoGeo = new THREE.PlaneGeometry(30, 1.5); aoGeo.rotateX(-Math.PI / 2);
    for (const w of [[0, -14.25, 0], [0, 14.25, Math.PI], [14.25, 0, -Math.PI / 2], [-14.25, 0, Math.PI / 2]]) { const m = new THREE.Mesh(aoGeo, aoMat); m.position.set(w[0], 0.02, w[1]); m.rotation.y = w[2]; root.add(m); }
    // Listwy
    const parts = [], mk = (cx, cy, cz, w, h, d) => parts.push(place(UNIT_BOX, cx, cy, cz, 0, 0, 0, w, h, d));
    mk(0, 0.13, -14.93, 30, 0.26, 0.14); mk(0, 0.13, 14.93, 30, 0.26, 0.14); mk(-14.93, 0.13, 0, 0.14, 0.26, 30); mk(14.93, 0.13, 0, 0.14, 0.26, 30);
    mk(0, 19.55, -14.93, 30, 0.5, 0.14); mk(0, 19.55, 14.93, 30, 0.5, 0.14); mk(-14.93, 19.55, 0, 0.14, 0.5, 30); mk(14.93, 19.55, 0, 0.14, 0.5, 30);
    const sk = new THREE.Mesh(mergeGeometries(parts), new THREE.MeshStandardMaterial({ map: tex.wall, bumpMap: tex.wall, bumpScale: 1.0, color: 0x555a5e, roughness: 0.8, envMapIntensity: ENV }));
    sk.receiveShadow = true; sk.castShadow = true; root.add(sk);
    // Rury
    const pipes = [], flanges = [];
    for (const s of [-1, 1]) {
        const z = s * 14.82;
        for (const y of [2.6, 3.15]) { pipes.push(place(PIPE_CYL, 0, y, z, 0, 0, Math.PI / 2, 0.065, 29.6, 0.065)); for (let x = -13; x <= 13; x += 3.25) flanges.push(place(PIPE_CYL, x, y, z, 0, 0, Math.PI / 2, 0.1, 0.12, 0.1)); }
        for (const x of [-13.7, 13.7]) { pipes.push(place(PIPE_CYL, x, 9.9, z, 0, 0, 0, 0.075, 19.8, 0.075)); for (let y = 2; y < 19; y += 3.5) flanges.push(place(PIPE_CYL, x, y, z, 0, 0, 0, 0.11, 0.14, 0.11)); }
    }
    const pm = new THREE.Mesh(mergeGeometries(pipes), new THREE.MeshStandardMaterial({ map: tex.wall, bumpMap: tex.wall, bumpScale: 1.2, color: 0x8a5a3a, metalness: 0.7, roughness: 0.45, envMapIntensity: ENV }));
    pm.castShadow = true; pm.receiveShadow = true; root.add(pm);
    const fm = new THREE.Mesh(mergeGeometries(flanges), new THREE.MeshStandardMaterial({ color: 0x2a2c2e, metalness: 0.8, roughness: 0.4, envMapIntensity: ENV })); fm.castShadow = true; root.add(fm);
    // Pajęczyny
    const webMat = new THREE.MeshBasicMaterial({ map: T.createCobwebTexture(), transparent: true, depthWrite: false, side: THREE.DoubleSide, opacity: 0.85 }), webGeo = new THREE.PlaneGeometry(3.2, 3.2);
    for (const c of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const m = new THREE.Mesh(webGeo, webMat); m.position.set(c[0] * 14.2, 18.3, c[1] * 14.2); m.rotation.y = Math.atan2(-c[0], -c[1]); root.add(m); }
    // Lampy alarmowe
    for (const l of [[-14, 16, -14.89, 0], [14, 16, -14.89, 0], [-14, 16, 14.89, Math.PI], [14, 16, 14.89, Math.PI], [14.89, 16, 13, -Math.PI / 2], [-14.89, 16, -13, Math.PI / 2]]) {
        const g = new THREE.Group();
        g.add(new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.3, 0.22), new THREE.MeshStandardMaterial({ color: 0x222426, metalness: 0.7, roughness: 0.5 })));
        const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.14, 12), new THREE.MeshBasicMaterial({ color: 0xff2a1a })); lens.rotation.x = Math.PI / 2; lens.position.z = 0.15; g.add(lens);
        const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex.dot, color: 0xff2a1a, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.7 }));
        sp.scale.set(2.4, 2.4, 1); sp.position.z = 0.35; g.add(sp);
        g.position.set(l[0], l[1], l[2]); g.rotation.y = l[3]; root.add(g); fx.lampSprites.push(sp);
    }
    // Żarówki na kablach
    const cordMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.6 }), socketMat = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, metalness: 0.7, roughness: 0.4 });
    for (const b of (LP.bulbs || [])) {
        const x = b[0], y = b[1], z = b[2], col = b[3], cordLen = 19.95 - y - 0.12;
        const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, cordLen, 6), cordMat); cord.position.set(x, y + 0.12 + cordLen / 2, z); root.add(cord);
        const socket = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.035, 0.08, 12), socketMat); socket.position.set(x, y + 0.09, z); root.add(socket);
        const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.06, 16, 12), new THREE.MeshBasicMaterial({ color: col })); bulb.scale.y = 1.3; bulb.position.set(x, y, z); root.add(bulb);
        const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex.dot, color: col, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.8 }));
        glow.scale.set(1.6, 1.6, 1); glow.position.set(x, y, z); root.add(glow);
        const l = new THREE.PointLight(col, b[4], b[5], 2); l.position.set(x, y - 0.05, z); root.add(l);
        fx.flickers.push({ l: l, base: b[4], ph: Math.random() * 100, subtle: true, glow: glow }); fx.bulbSpots.push([x, z]);
    }
    // Skrzynie i beczki
    const crate = (x, y, z, s) => { addCrispBlock(x, y, z, s, s, s, 0xffffff, 0x120a05, tex.wood, { uvMeters: s }); if (y - s / 2 < 0.05) addBlobAO(x, z, s * 2.2); };
    crate(12.4, 0.6, -12.4, 1.2); crate(13.7, 0.6, -12.2, 1.2); crate(12.9, 1.8, -12.3, 1.2); crate(12.2, 0.45, -10.9, 0.9);
    crate(-12.9, 0.6, 12.6, 1.2); crate(-11.6, 0.6, 13.3, 1.2); crate(-12.2, 1.7, 13.0, 1.0); crate(13.2, 0.5, -3.3, 1.0);
    L.reserved.push([13, -12, 2.8], [-12.3, 13, 2.6], [13.2, -3.3, 1.4]);
    const barrelMat = new THREE.MeshStandardMaterial({ map: tex.wall, bumpMap: tex.wall, bumpScale: 1.4, color: 0x8a5a3a, metalness: 0.65, roughness: 0.5, envMapIntensity: ENV });
    const bandMat = new THREE.MeshStandardMaterial({ color: 0x1c1d1f, metalness: 0.8, roughness: 0.4, envMapIntensity: ENV });
    for (const p of [[-13.5, -13.5], [-12.4, -13.9], [-13.9, -12.3], [13.6, 12.6], [12.6, 13.7]]) {
        const g = new THREE.Group();
        const body = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.44, 1.1, 18), barrelMat); body.position.y = 0.55; body.castShadow = true; body.receiveShadow = true; g.add(body);
        const bm = new THREE.Mesh(mergeGeometries([0.2, 0.55, 0.9].map(y => place(new THREE.TorusGeometry(0.435, 0.022, 6, 18), 0, y, 0, Math.PI / 2, 0, 0, 1, 1, 1))), bandMat); bm.castShadow = true; g.add(bm);
        g.position.set(p[0], 0, p[1]); root.add(g);
        addStaticBody(p[0], 0.55, p[1], new CANNON.Box(new CANNON.Vec3(0.3, 0.55, 0.3)), g, false); addBlobAO(p[0], p[1], 1.9);
    }
    L.reserved.push([-13.2, -13.2, 2.0], [13.2, 13.2, 2.0]);
    // Liście, kartki, gruz i szkło
    const R = T.mkRng(3141), dummy = new THREE.Object3D(), col = new THREE.Color();
    const leaves = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.11, 0.11), new THREE.MeshStandardMaterial({ map: T.createLeafTexture(), alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.85, envMapIntensity: ENV }), GFX.leaves);
    for (let i = 0; i < GFX.leaves; i++) {
        const p = floorPoint(R, R() < 0.65); if (Math.hypot(p[0], p[1] - 5) < 2.2) p[0] += 4;
        dummy.position.set(p[0], 0.012 + R() * 0.01, p[1]); dummy.rotation.set(-Math.PI / 2 + (R() - 0.5) * 0.5, (R() - 0.5) * 0.4, R() * 6.28);
        const s = 0.7 + R() * 0.8; dummy.scale.set(s, s, s); dummy.updateMatrix(); leaves.setMatrixAt(i, dummy.matrix);
        col.setHSL(0.06 + R() * 0.05, 0.45 + R() * 0.3, 0.35 + R() * 0.25); leaves.setColorAt(i, col);
    }
    leaves.receiveShadow = true; root.add(leaves);
    const papers = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.21, 0.297), new THREE.MeshStandardMaterial({ map: T.createPaperTexture(), side: THREE.DoubleSide, roughness: 0.9, envMapIntensity: ENV, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }), GFX.papers);
    for (let i = 0; i < GFX.papers; i++) { const p = floorPoint(R, R() < 0.5); dummy.position.set(p[0], 0.011, p[1]); dummy.rotation.set(-Math.PI / 2 + (R() - 0.5) * 0.15, (R() - 0.5) * 0.15, R() * 6.28); dummy.scale.set(1, 1, 1); dummy.updateMatrix(); papers.setMatrixAt(i, dummy.matrix); }
    papers.receiveShadow = true; root.add(papers);
    const rubble = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(0.06, 0), new THREE.MeshStandardMaterial({ map: tex.wall, color: 0x9a9a9a, roughness: 0.92, envMapIntensity: ENV }), GFX.rubble);
    for (let i = 0; i < GFX.rubble; i++) { const p = floorPoint(R, true), s = 0.4 + R() * 1.6; dummy.position.set(p[0], 0.03 * s, p[1]); dummy.rotation.set(R() * 6.28, R() * 6.28, R() * 6.28); dummy.scale.set(s * (0.7 + R() * 0.6), s * (0.5 + R() * 0.5), s * (0.7 + R() * 0.6)); dummy.updateMatrix(); rubble.setMatrixAt(i, dummy.matrix); }
    rubble.castShadow = true; rubble.receiveShadow = true; root.add(rubble);
    const tri = new THREE.Shape(); tri.moveTo(0, 0); tri.lineTo(0.05, 0.012); tri.lineTo(0.015, 0.06); tri.lineTo(0, 0);
    const shards = new THREE.InstancedMesh(new THREE.ShapeGeometry(tri), new THREE.MeshStandardMaterial({ color: 0xcfe6ee, metalness: 0.9, roughness: 0.04, transparent: true, opacity: 0.75, side: THREE.DoubleSide, envMapIntensity: 1.5 }), GFX.shards);
    for (let i = 0; i < GFX.shards; i++) { const p = floorPoint(R, R() < 0.7), s = 0.6 + R() * 1.4; dummy.position.set(p[0], 0.013, p[1]); dummy.rotation.set(-Math.PI / 2 + (R() - 0.5) * 0.3, (R() - 0.5) * 0.3, R() * 6.28); dummy.scale.set(s, s, s); dummy.updateMatrix(); shards.setMatrixAt(i, dummy.matrix); }
    root.add(shards);
    // Mgła przy podłodze
    if (LP.mist) {
        const baseTex = T.createMistTexture();
        [[0.12, 1.0], [0.32, 0.7], [0.58, 0.45]].forEach((ly, i) => {
            const tx = baseTex.clone(); tx.needsUpdate = true; tx.wrapS = tx.wrapT = THREE.RepeatWrapping; tx.repeat.set(2 + i * 0.5, 2 + i * 0.5);
            const m = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), new THREE.MeshBasicMaterial({ map: tx, color: LP.mist.color, transparent: true, opacity: LP.mist.opacity * ly[1], depthWrite: false }));
            m.rotation.x = -Math.PI / 2; m.position.y = ly[0]; m.renderOrder = 2; root.add(m);
            fx.mist.push({ tex: tx, sx: 0.006 + i * 0.004, sz: 0.004 - i * 0.003 });
        });
    }
    // Smugi światła
    if (LP.shafts) {
        const st = T.createShaftTexture(), sd = new THREE.Vector3(LP.sunPos[0], LP.sunPos[1], LP.sunPos[2]).normalize(), down = sd.clone().negate();
        const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), sd), len = Math.min(42, 19.9 / Math.max(0.2, sd.y)), R2 = T.mkRng(77);
        for (let i = 0; i < 8; i++) {
            const sx = Math.max(-14.5, Math.min(14.5, -10 + R2() * 20 - down.x * len * 0.45)), sz = Math.max(-14.5, Math.min(14.5, -10 + R2() * 20 - down.z * len * 0.45));
            const mat = new THREE.MeshBasicMaterial({ map: st, color: LP.shaftColor, transparent: true, opacity: LP.shaftOpacity, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false });
            mat.userData.base = LP.shaftOpacity;
            const m = new THREE.Mesh(new THREE.CylinderGeometry(0.9 + R2() * 0.6, 1.8 + R2() * 0.8, len, 20, 1, true), mat);
            m.quaternion.copy(q); m.position.set(sx, 19.9, sz).addScaledVector(down, len / 2); root.add(m); fx.shaftMats.push(mat);
        }
    }
}

// Komputer na biurku (terminal sieciowy)
function buildComputerDesk(x, z) {
    const g = new THREE.Group(); g.position.set(x, 0, z); L.root.add(g);
    const woodMat = new THREE.MeshStandardMaterial({ map: tex.wood, color: 0xa88a6a, roughness: 0.6, envMapIntensity: ENV });
    const metal = new THREE.MeshStandardMaterial({ color: 0x1e2024, metalness: 0.7, roughness: 0.35, envMapIntensity: ENV });
    const plastic = new THREE.MeshStandardMaterial({ color: 0x2a2620, roughness: 0.55, envMapIntensity: ENV });
    const add = (geo, mat, px, py, pz) => { const m = new THREE.Mesh(geo, mat); m.position.set(px, py, pz); m.castShadow = true; m.receiveShadow = true; g.add(m); return m; };
    add(new RoundedBoxGeometry(1.7, 0.06, 0.85, 2, 0.02), woodMat, 0, 0.55, 0);
    for (const sx of [-0.78, 0.78]) for (const sz of [-0.36, 0.36]) add(new THREE.BoxGeometry(0.06, 0.52, 0.06), metal, sx, 0.26, sz);
    add(new THREE.BoxGeometry(1.5, 0.14, 0.03), metal, 0, 0.42, -0.38);
    add(new RoundedBoxGeometry(1.0, 0.68, 0.36, 3, 0.05), plastic, 0, 0.99, -0.34);
    add(new RoundedBoxGeometry(0.98, 0.66, 0.06, 2, 0.02), plastic, 0, 0.99, -0.14);
    add(new THREE.BoxGeometry(0.3, 0.06, 0.26), plastic, 0, 0.61, -0.3);
    const screen = computer.createMesh(0.88, 0.55); screen.position.set(0, 0.99, -0.105); g.add(screen);
    add(new RoundedBoxGeometry(0.52, 0.03, 0.18, 2, 0.01), plastic, -0.05, 0.595, 0.18);
    const keys = []; for (let r = 0; r < 4; r++) for (let c = 0; c < 12; c++) keys.push(place(UNIT_BOX, -0.27 + c * 0.04, 0.615, 0.12 + r * 0.036, 0, 0, 0, 0.032, 0.012, 0.028));
    add(mergeGeometries(keys), new THREE.MeshStandardMaterial({ color: 0x8a8070, roughness: 0.6 }), -0.05, 0, 0);
    add(new THREE.SphereGeometry(0.03, 12, 8), plastic, 0.34, 0.59, 0.2).scale.set(1, 0.5, 1.5);
    add(new THREE.CylinderGeometry(0.04, 0.036, 0.1, 16), new THREE.MeshStandardMaterial({ color: 0x7a1010, roughness: 0.35 }), -0.62, 0.63, 0.12);
    add(new RoundedBoxGeometry(0.2, 0.46, 0.46, 2, 0.015), plastic, 0.55, 0.23, -0.05);
    add(new THREE.SphereGeometry(0.008, 8, 6), new THREE.MeshBasicMaterial({ color: 0x30ff60 }), 0.55, 0.4, 0.185);
    add(new THREE.PlaneGeometry(0.21, 0.297), new THREE.MeshStandardMaterial({ map: T.createPaperTexture(), roughness: 0.9 }), 0.55, 0.582, 0.22).rotation.set(-Math.PI / 2, 0, 0.4);
    const glow = new THREE.PointLight(0xffb060, 3, 3.5, 2); glow.position.set(0, 0.99, 0.3); g.add(glow);
    addStaticBody(x, 0.29, z, new CANNON.Box(new CANNON.Vec3(0.85, 0.29, 0.425)), g, false);
    addStaticBody(x, 0.99, z - 0.3, new CANNON.Box(new CANNON.Vec3(0.5, 0.34, 0.2)), g, false);
    addBlobAO(x, z, 2.6); L.reserved.push([x, z, 2.6]);
}

function buildScoreboard() {
    const g = new THREE.Group(); g.position.set(14.9, 3.1, -7.5); g.rotation.y = -Math.PI / 2; L.root.add(g);
    const frame = new THREE.Mesh(new RoundedBoxGeometry(5.4, 3.5, 0.14, 2, 0.05), new THREE.MeshStandardMaterial({ color: 0x2a221c, metalness: 0.5, roughness: 0.45, envMapIntensity: ENV }));
    frame.castShadow = true; frame.receiveShadow = true; g.add(frame);
    const b = new THREE.Mesh(new THREE.PlaneGeometry(5.12, 3.2), new THREE.MeshBasicMaterial({ map: board.tex, toneMapped: false, color: 0xdddddd }));
    b.position.z = 0.075; g.add(b);
    const bolts = []; for (const bx of [-2.55, 2.55]) for (const by of [-1.6, 1.6]) bolts.push(place(UNIT_SPHERE, bx, by, 0.075, 0, 0, 0, 0.04, 0.04, 0.02));
    g.add(new THREE.Mesh(mergeGeometries(bolts), new THREE.MeshStandardMaterial({ color: 0x8a8a8a, metalness: 1, roughness: 0.3 })));
    const l = new THREE.PointLight(0xff6a3a, 5, 6, 2); l.position.set(0, 0, 1.2); g.add(l);
    L.reserved.push([13.6, -7.5, 2.4]);
}

// Automat sklepowy przy zachodniej ścianie + stojak z podglądem przedmiotu na głowie
function buildShop() {
    const x = -14.2, z = -1.5;
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = Math.PI / 2; L.root.add(g);
    const body = new THREE.MeshStandardMaterial({ map: tex.wall, bumpMap: tex.wall, bumpScale: 1.2, color: 0x7a1e18, metalness: 0.6, roughness: 0.45, envMapIntensity: ENV });
    const dark = new THREE.MeshStandardMaterial({ color: 0x141416, metalness: 0.7, roughness: 0.4, envMapIntensity: ENV });
    const add = (geo, mat, px, py, pz) => { const m = new THREE.Mesh(geo, mat); m.position.set(px, py, pz); m.castShadow = true; m.receiveShadow = true; g.add(m); return m; };
    add(new RoundedBoxGeometry(1.5, 2.1, 0.9, 3, 0.06), body, 0, 1.05, 0);
    add(new RoundedBoxGeometry(1.06, 0.72, 0.06, 2, 0.02), dark, 0, 1.0, 0.45);
    const screen = shop.createMesh(0.96, 0.6); screen.position.set(0, 1.0, 0.485); g.add(screen);
    // Świecący szyld
    const sc = T.makeCanvas(512, 128), sx = sc.getContext('2d');
    sx.fillStyle = '#1a0606'; sx.fillRect(0, 0, 512, 128);
    sx.font = 'bold 76px serif'; sx.textAlign = 'center'; sx.textBaseline = 'middle'; sx.shadowColor = '#ff3a1a'; sx.shadowBlur = 24; sx.fillStyle = '#ffcf9a';
    sx.fillText('BAGABUCKS', 256, 68);
    const signTex = new THREE.CanvasTexture(sc); signTex.colorSpace = THREE.SRGBColorSpace;
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 0.32), new THREE.MeshBasicMaterial({ map: signTex, toneMapped: false })); sign.position.set(0, 1.86, 0.455); g.add(sign);
    add(new THREE.BoxGeometry(0.5, 0.22, 0.08), dark, 0, 0.42, 0.46);
    const slot = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.05, 0.02), new THREE.MeshBasicMaterial({ color: 0xffa040 })); slot.position.set(0, 0.42, 0.505); g.add(slot);
    for (const s of [-1, 1]) add(new THREE.BoxGeometry(0.06, 2.0, 0.06), dark, s * 0.72, 1.05, 0.44);
    const light = new THREE.PointLight(0xffa860, 6, 5, 2); light.position.set(0, 1.6, 1.2); g.add(light);
    addStaticBody(x, 1.05, z, new CANNON.Box(new CANNON.Vec3(0.45, 1.05, 0.75)), g, false);
    addBlobAO(x + 0.4, z, 2.6);
    // Stojak z głową, na której widać przedmiot ze sklepu
    const px = -13.5, pz = 0.45;
    const ped = new THREE.Group(); ped.position.set(px, 0, pz); L.root.add(ped);
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.24, 1.0, 20), body); col.position.y = 0.5; col.castShadow = true; col.receiveShadow = true; ped.add(col);
    const top = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.05, 20), dark); top.position.y = 1.02; ped.add(top);
    const spot = new THREE.PointLight(0xffe0b0, 3, 2.5, 2); spot.position.set(0.5, 1.7, 0); ped.add(spot);
    fx.preview = new THREE.Group(); fx.preview.position.set(0, 1.72, 0); fx.preview.scale.setScalar(1.3); ped.add(fx.preview);
    addStaticBody(px, 0.5, pz, new CANNON.Box(new CANNON.Vec3(0.22, 0.5, 0.22)), ped, false);
    addBlobAO(px, pz, 1.2);
    L.reserved.push([-13.4, -0.6, 3.0]);
    onPreview(setPreview);
    setPreview(previewLook());
}
function setPreview(look) {
    if (!fx || !fx.preview) return;
    if (fx.previewHead) fx.preview.remove(fx.previewHead);
    // Popiersie goryla: głowa i tułów (widać też odznakę na piersi)
    fx.previewHead = new THREE.Group();
    fx.previewHead.add(createHead(look, false));
    const torso = createGorillaTorso(look); torso.position.y = -0.35; fx.previewHead.add(torso);
    fx.preview.add(fx.previewHead);
}

function buildChains() {
    const metal = [], meat = [], taken = [[4, -4], [-4, 4], [0, 0], [6, 6], [-8, -2], [3.5, -9], [-13.6, -1]].concat(fx.bulbSpots);
    const link = new THREE.TorusGeometry(0.035, 0.009, 5, 8);
    let n = 0, tries = 0;
    while (n < GFX.chains && tries < 300) {
        tries++;
        const x = (Math.random() * 2 - 1) * 13, z = (Math.random() * 2 - 1) * 13;
        if (taken.some(t => Math.hypot(x - t[0], z - t[1]) < 1.6)) continue;
        n++; taken.push([x, z]);
        const len = 2 + Math.random() * 7;
        metal.push(place(UNIT_CYL, x, 20 - len / 2, z, 0, 0, 0, 0.012, len, 0.012));
        for (let y = 19.8; y > 20 - len; y -= 0.3) metal.push(place(link, x, y, z, Math.PI / 2 * ((y * 10 | 0) % 2), (y * 10 | 0) % 2 ? 0 : Math.PI / 2, 0, 1, 1, 1));
        metal.push(place(new THREE.TorusGeometry(0.12, 0.02, 6, 12, Math.PI * 1.5), x, 20 - len - 0.1, z, 0, 0, 0.6, 1, 1, 1));
        if (Math.random() < 0.45) { meat.push(place(UNIT_SPHERE, x, 20 - len - 0.35, z, 0, 0, 0, 0.17, 0.34, 0.15)); fx.meatSpots.push([x, 20 - len - 0.35, z]); }
    }
    const m1 = new THREE.Mesh(mergeGeometries(metal), new THREE.MeshStandardMaterial({ color: 0x1a1a1c, roughness: 0.45, metalness: 0.7, envMapIntensity: ENV })); m1.castShadow = true; L.root.add(m1);
    if (meat.length) { const m2 = new THREE.Mesh(mergeGeometries(meat), new THREE.MeshStandardMaterial({ color: 0x5a0d0d, roughness: 0.25, metalness: 0.1, envMapIntensity: ENV })); m2.castShadow = true; L.root.add(m2); }
}

function buildParticles() {
    const fN = fx.meatSpots.length * 9;
    fx.flyPos = new Float32Array(Math.max(1, fN) * 3); fx.flyPh = new Float32Array(Math.max(1, fN)); fx.flyN = fN;
    for (let i = 0; i < fN; i++) fx.flyPh[i] = Math.random() * 100;
    fx.flyGeo = new THREE.BufferGeometry(); fx.flyGeo.setAttribute('position', new THREE.BufferAttribute(fx.flyPos, 3));
    const flies = new THREE.Points(fx.flyGeo, new THREE.PointsMaterial({ size: 0.018, map: tex.dot, color: 0x050505, transparent: true, depthWrite: false }));
    flies.frustumCulled = false; if (fN > 0) L.root.add(flies);
    const dN = GFX.dust;
    fx.dustPos = new Float32Array(dN * 3); fx.dustVy = new Float32Array(dN); fx.dustPh = new Float32Array(dN); fx.dustN = dN;
    for (let i = 0; i < dN; i++) {
        fx.dustPos[i * 3] = (Math.random() * 2 - 1) * 14; fx.dustPos[i * 3 + 1] = 0.3 + Math.random() * 19; fx.dustPos[i * 3 + 2] = (Math.random() * 2 - 1) * 14;
        fx.dustVy[i] = 0.03 + Math.random() * 0.09; fx.dustPh[i] = Math.random() * 6.28;
    }
    fx.dustGeo = new THREE.BufferGeometry(); fx.dustGeo.setAttribute('position', new THREE.BufferAttribute(fx.dustPos, 3));
    const dust = new THREE.Points(fx.dustGeo, new THREE.PointsMaterial({ size: 0.05, map: tex.dot, color: LP.dustColor, transparent: true, opacity: LP.dustOpacity, depthWrite: false }));
    dust.frustumCulled = false; L.root.add(dust);
}

// ---------- MANEKINY ----------
const plasterMat = new THREE.MeshStandardMaterial({ map: tex.plaster, bumpMap: tex.plaster, bumpScale: 0.7, color: 0xd8d0c2, roughness: 0.55, envMapIntensity: ENV });
const darkJoint = new THREE.MeshStandardMaterial({ color: 0x101012, roughness: 0.4, metalness: 0.6, envMapIntensity: ENV });
const voidMat = new THREE.MeshBasicMaterial({ color: 0x000000 }), eyeGlowMat = new THREE.MeshBasicMaterial({ color: 0xff2200 });
const ARM_POSES = [
    (s) => [V3(s * 0.03, -0.30, 0.02), V3(0, -0.28, 0.05)], (s) => [V3(s * 0.06, -0.08, 0.26), V3(0, 0.02, 0.26)],
    (s) => [V3(s * 0.14, 0.25, 0.04), V3(s * 0.04, 0.27, 0.05)], (s) => [V3(s * 0.25, -0.10, -0.05), V3(-s * 0.15, -0.22, 0.12)],
    (s) => [V3(s * 0.10, -0.18, 0.18), V3(-s * 0.12, 0.20, 0.12)], (s) => [V3(s * 0.05, -0.25, -0.12), V3(0, -0.20, -0.20)],
    (s) => [V3(s * 0.30, 0.05, 0.0), V3(s * 0.28, 0.0, 0.0)], (s) => [V3(s * 0.02, -0.15, 0.25), V3(-s * 0.02, -0.26, 0.22)]
];
const jit = (R, k) => V3((R() - 0.5) * k, (R() - 0.5) * k, (R() - 0.5) * k);
function buildArm(S, s, body, joints, R) {
    const pose = ARM_POSES[(R() * ARM_POSES.length) | 0](s);
    const E = S.clone().add(pose[0]).add(jit(R, 0.05)), W = E.clone().add(pose[1]).add(jit(R, 0.05));
    body.push(seg(S, E, 0.038, 0.032, 7)); body.push(seg(E, W, 0.032, 0.026, 7));
    joints.push(place(UNIT_SPHERE, E.x, E.y, E.z, 0, 0, 0, 0.038, 0.038, 0.038)); joints.push(place(UNIT_SPHERE, W.x, W.y, W.z, 0, 0, 0, 0.03, 0.03, 0.03));
    const d = new THREE.Vector3().subVectors(W, E).normalize(), palmEnd = W.clone().addScaledVector(d, 0.085);
    body.push(seg(W, palmEnd, 0.026, 0.022, 5));
    const p = new THREE.Vector3().crossVectors(d, V3(0, 1, 0)); if (p.lengthSq() < 0.01) p.set(1, 0, 0); p.normalize();
    for (let i = 0; i < 5; i++) {
        const F0 = palmEnd.clone().addScaledVector(p, (i - 2) * 0.014), d1 = d.clone().addScaledVector(p, (i - 2) * 0.15).add(jit(R, 0.3)).normalize();
        const len1 = (i === 0 || i === 4) ? 0.055 : 0.07, Mid = F0.clone().addScaledVector(d1, len1), d2 = d1.clone().add(jit(R, 0.9)).normalize(), Tip = Mid.clone().addScaledVector(d2, len1 * 0.85);
        body.push(seg(F0, Mid, 0.009, 0.007, 4)); body.push(seg(Mid, Tip, 0.007, 0.004, 4));
    }
}
function buildLeg(s, body, joints, R) {
    const H = V3(s * 0.09, 0.93, 0), kneeZ = R() < 0.4 ? 0.1 + R() * 0.12 : (R() - 0.5) * 0.05;
    const K = V3(H.x + s * 0.01, 0.50, kneeZ), A = V3(H.x + (R() - 0.5) * 0.04, 0.06, (R() - 0.5) * 0.08);
    body.push(seg(H, K, 0.062, 0.045, 7)); body.push(seg(K, A, 0.045, 0.03, 7));
    joints.push(place(UNIT_SPHERE, K.x, K.y, K.z, 0, 0, 0, 0.047, 0.047, 0.047)); joints.push(place(UNIT_SPHERE, A.x, A.y, A.z, 0, 0, 0, 0.033, 0.033, 0.033));
    body.push(seg(A, V3(A.x + (R() - 0.5) * 0.05, 0.03, A.z + 0.2), 0.03, 0.022, 5));
}
function buildMannequin(R) {
    const body = [], joints = [], hp = [], hv = [], hg = [];
    body.push(place(new THREE.CylinderGeometry(0.17, 0.125, 0.56, 10, 1), 0, 1.29, 0, 0, 0, 0, 1, 1, 0.58));
    body.push(place(UNIT_SPHERE, 0, 1.55, 0, 0, 0, 0, 0.19, 0.06, 0.1)); body.push(place(UNIT_SPHERE, 0, 0.97, 0, 0, 0, 0, 0.14, 0.1, 0.09));
    joints.push(seg(V3(0, 1.54, 0), V3(0, 1.69, 0), 0.03, 0.027, 6));
    for (const s of [-1, 1]) joints.push(place(UNIT_SPHERE, s * 0.2, 1.54, 0, 0, 0, 0, 0.045, 0.045, 0.045));
    const noArm = R() < 0.28 ? (R() < 0.5 ? -1 : 1) : 0;
    for (const s of [-1, 1]) if (s !== noArm) buildArm(V3(s * 0.2, 1.54, 0), s, body, joints, R);
    if (R() < 0.18) { const s3 = R() < 0.5 ? -1 : 1; buildArm(V3(s3 * 0.12, 1.35, 0.07), s3, body, joints, R); }
    buildLeg(-1, body, joints, R); buildLeg(1, body, joints, R);
    hp.push(place(UNIT_SPHERE, 0, 0.14, 0, 0, 0, 0, 0.092, 0.128, 0.105)); hp.push(place(UNIT_SPHERE, 0, 0.04, 0.035, 0, 0, 0, 0.055, 0.06, 0.065));
    hp.push(place(UNIT_BOX, 0, 0.12, 0.098, 0.25, 0, 0, 0.018, 0.055, 0.03));
    for (const s of [-1, 1]) hv.push(place(UNIT_SPHERE, s * 0.04, 0.15, 0.07, 0, 0, 0, 0.027, 0.034, 0.03));
    const wide = R() < 0.25;
    hv.push(place(UNIT_BOX, 0, 0.055, 0.098, 0, 0, 0, wide ? 0.075 : 0.045, wide ? 0.02 : 0.005, 0.02));
    if (R() < 0.4) for (const s of [-1, 1]) hg.push(place(UNIT_SPHERE, s * 0.04, 0.152, 0.1, 0, 0, 0, 0.011, 0.011, 0.011));
    const g = new THREE.Group(), lean = new THREE.Group(); g.add(lean);
    const bm = new THREE.Mesh(mergeGeometries(body), plasterMat); bm.castShadow = true; bm.receiveShadow = true; lean.add(bm);
    const jm = new THREE.Mesh(mergeGeometries(joints), darkJoint); jm.castShadow = true; lean.add(jm);
    const head = new THREE.Group(); head.position.set(0, 1.69, 0); head.rotation.order = 'YXZ'; lean.add(head);
    const hm = new THREE.Mesh(mergeGeometries(hp), plasterMat); hm.castShadow = true; hm.receiveShadow = true; head.add(hm);
    head.add(new THREE.Mesh(mergeGeometries(hv), voidMat));
    if (hg.length) head.add(new THREE.Mesh(mergeGeometries(hg), eyeGlowMat));
    const extreme = R() < 0.25;
    head.rotation.z = extreme ? (R() < 0.5 ? -1 : 1) * (1.0 + R() * 0.6) : (R() - 0.5) * 0.9;
    head.rotation.x = (R() - 0.3) * 0.7;
    lean.rotation.z = (R() - 0.5) * 0.22; lean.rotation.x = (R() - 0.5) * 0.2;
    return { group: g, head: head };
}
function buildMannequins() {
    const zones = [[0, 0, 3], [0, 5, 3.2], [-7, -7, 7.5], [8, 3, 7], [2, -2, 1.8], [-2, -2, 1.8]].concat(L.reserved), placed = [];
    let tries = 0;
    while (placed.length < GFX.mannequins && tries < 800) {
        tries++;
        const x = (Math.random() * 2 - 1) * 13, z = (Math.random() * 2 - 1) * 13;
        if (zones.some(zn => Math.hypot(x - zn[0], z - zn[1]) < zn[2])) continue;
        if (placed.some(p => Math.hypot(x - p[0], z - p[1]) < 3.2)) continue;
        placed.push([x, z]);
        const m = buildMannequin(Math.random);
        m.group.position.set(x, 0, z); m.group.rotation.y = Math.random() * 6.283; L.root.add(m.group);
        addStaticBody(x, 0.95, z, new CANNON.Box(new CANNON.Vec3(0.26, 0.95, 0.26)), m.group, false);
        addBlobAO(x, z, 1.5);
        fx.mannequins.push(m);
    }
}
const _cp = new THREE.Vector3(), _cd = new THREE.Vector3(), _tm = new THREE.Vector3();
function updateMannequins(dt) {
    camera.getWorldPosition(_cp); camera.getWorldDirection(_cd);
    for (const m of fx.mannequins) {
        _tm.set(m.group.position.x - _cp.x, 1.0 - _cp.y, m.group.position.z - _cp.z);
        const dist = _tm.length();
        if (dist < 0.001 || dist > 16) continue;
        _tm.multiplyScalar(1 / dist);
        if (_cd.dot(_tm) > 0.42) continue;   // widzisz go: stoi nieruchomo
        const target = Math.atan2(_cp.x - m.group.position.x, _cp.z - m.group.position.z);
        let d = target - m.group.rotation.y; d = Math.atan2(Math.sin(d), Math.cos(d));
        const rate = (dist < 5 ? 1.6 : 0.7) * dt;
        m.group.rotation.y += Math.max(-rate, Math.min(rate, d));
        let hd = Math.atan2(Math.sin(target - m.group.rotation.y), Math.cos(target - m.group.rotation.y));
        hd = Math.max(-2.4, Math.min(2.4, hd));
        m.head.rotation.y += Math.max(-3 * dt, Math.min(3 * dt, hd - m.head.rotation.y));
    }
}

// ---------- LINY I OCZY ----------
function addGutsRope(x, y, z, height) {
    const group = new THREE.Group();
    const geo = new THREE.CylinderGeometry(0.12, 0.12, height, 12, Math.max(20, Math.round(height * 6)));
    const pa = geo.attributes.position;
    for (let i = 0; i < pa.count; i++) { const yy = pa.getY(i), k = 1 + 0.2 * Math.sin(yy * 9) + 0.1 * Math.sin(yy * 23 + 1.3); pa.setX(i, pa.getX(i) * k); pa.setZ(i, pa.getZ(i) * k); }
    geo.computeVertexNormals();
    const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0x6a1515, roughness: 0.25, metalness: 0.1, envMapIntensity: ENV }));
    mesh.castShadow = true; group.add(mesh); L.root.add(group);
    const body = addBody(new CANNON.Body({ mass: 10, shape: new CANNON.Box(new CANNON.Vec3(0.12, height / 2, 0.12)), material: physicsMat, position: new CANNON.Vec3(x, y - height / 2, z), linearDamping: 0.4, angularDamping: 0.4, collisionFilterGroup: GROUP.ROPE, collisionFilterMask: GROUP.ENV | GROUP.BALL }));
    const anchor = addBody(new CANNON.Body({ mass: 0, position: new CANNON.Vec3(x, y, z) }));
    addConstraint(new CANNON.PointToPointConstraint(body, new CANNON.Vec3(0, height / 2, 0), anchor, new CANNON.Vec3(0, 0, 0)));
    L.ropes.push({ mesh: group, body: body, halfHeight: height / 2 });
}
function createEyeball(id, x, y, z) {
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.2, 32, 32), new THREE.MeshPhysicalMaterial({ map: tex.eye, emissive: 0x330000, roughness: 0.1, metalness: 0.1, clearcoat: 1.0, envMapIntensity: ENV }));
    mesh.castShadow = true; L.root.add(mesh);
    const body = addBody(new CANNON.Body({ mass: 1, shape: new CANNON.Sphere(0.2), position: new CANNON.Vec3(x, y, z), material: physicsMat, linearDamping: 0.05, collisionFilterGroup: GROUP.BALL, collisionFilterMask: GROUP.ENV | GROUP.BALL | GROUP.ROPE }));
    mesh.userData = { id: id, body: body }; L.throwables.push(mesh);
}

// ---------- ANIMACJE CO KLATKĘ ----------
export function update(dt, t, ctx) {
    if (!fx) return;
    for (const f of fx.flickers) {
        let v;
        if (f.subtle) {
            v = f.base * (0.92 + 0.08 * Math.sin(t * 9 + f.ph) * Math.sin(t * 13.1 + f.ph * 1.7));
            if (Math.sin(t * 0.31 + f.ph * 2.3) > 0.993) v *= 0.3;
            if (f.glow) f.glow.material.opacity = 0.45 + 0.35 * (v / f.base);
        } else {
            v = f.base * (0.7 + 0.3 * Math.sin(t * 6.1 + f.ph) * Math.sin(t * 11.7 + f.ph * 1.9));
            if (Math.sin(t * 0.53 + f.ph * 2.7) > 0.985) v *= 0.04;
        }
        f.l.intensity = v;
    }
    if (flashlight) flashlight.intensity = LP.flashlight.intensity * (Math.sin(t * 0.37) > 0.992 ? 0.15 : 0.96 + 0.04 * Math.sin(t * 23));
    fx.muralMats.forEach((m, i) => { m.emissiveIntensity = LP.muralBase + LP.muralPulse * Math.sin(t * 1.1 + i * 1.7); });
    fx.trampMats.forEach((m) => { m.emissiveIntensity = LP.trampBase + LP.trampPulse * Math.sin(t * 3.0); });
    fx.lampSprites.forEach((s, i) => { s.material.opacity = 0.45 + 0.35 * Math.sin(t * 2.2 + i * 1.3); });
    fx.shaftMats.forEach((m, i) => { m.opacity = m.userData.base * (0.8 + 0.3 * Math.sin(t * 0.5 + i)); });
    if (fx.cloudTex) fx.cloudTex.offset.x = (t * 0.003) % 1;
    for (const ly of fx.mist) { ly.tex.offset.x = (t * ly.sx) % 1; ly.tex.offset.y = (t * ly.sz) % 1; }
    if (L.tramp) { L.tramp.k = Math.max(0, L.tramp.k - dt * 2.2); L.tramp.mat.position.y = 0.36 - Math.sin(L.tramp.k * Math.PI * 3) * 0.07 * L.tramp.k; }
    const dp = fx.dustPos;
    for (let i = 0; i < fx.dustN; i++) {
        dp[i * 3] += Math.sin(t * 0.4 + fx.dustPh[i]) * 0.12 * dt; dp[i * 3 + 2] += Math.cos(t * 0.35 + fx.dustPh[i]) * 0.12 * dt;
        dp[i * 3 + 1] -= fx.dustVy[i] * dt; if (dp[i * 3 + 1] < 0.2) dp[i * 3 + 1] = 19.5;
    }
    fx.dustGeo.attributes.position.needsUpdate = true;
    for (let m = 0; m < fx.meatSpots.length; m++) for (let k = 0; k < 9; k++) {
        const i = m * 9 + k, ph = fx.flyPh[i], c = fx.meatSpots[m];
        fx.flyPos[i * 3] = c[0] + Math.sin(t * (2.1 + k * 0.37) + ph) * 0.28;
        fx.flyPos[i * 3 + 1] = c[1] + Math.sin(t * (3.3 + k * 0.21) + ph * 1.7) * 0.22;
        fx.flyPos[i * 3 + 2] = c[2] + Math.cos(t * (2.6 + k * 0.29) + ph) * 0.28;
    }
    if (fx.flyN > 0) fx.flyGeo.attributes.position.needsUpdate = true;
    if (fx.preview) fx.preview.rotation.y = t * 0.6;
    updateMannequins(dt);
    // Zadanie dzienne: stanie na szczycie spiralnych schodów
    const p = ctx.pos;
    if (p.y > 15.4 && Math.hypot(p.x + 7, p.z + 7) < 2.2) track('top');
}
