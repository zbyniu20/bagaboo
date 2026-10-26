// ==========================================
// SILNIK: scena, kamera, renderer, światło, fizyka i wspólne narzędzia do budowy poziomów
// ==========================================
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { GFX, LP } from './config.js';
import * as T from './textures.js';

export { THREE, CANNON };

export const scene = new THREE.Scene();
scene.background = new THREE.Color(LP.background);
scene.fog = new THREE.FogExp2(LP.fogColor, LP.fogDensity);

export const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.05, 400);
export const playerRig = new THREE.Group();
playerRig.add(camera); scene.add(playerRig);

export const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.xr.enabled = true;
renderer.xr.setFramebufferScaleFactor(GFX.xrScale);
renderer.xr.setFoveation(GFX.foveation);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = LP.exposure;
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2.0));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);
window.addEventListener('resize', () => { camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix(); renderer.setSize(window.innerWidth, window.innerHeight); });

if (LP.envIntensity > 0) scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
scene.add(new THREE.HemisphereLight(LP.hemiSky, LP.hemiGround, LP.hemiIntensity));
if (LP.sunIntensity > 0) {
    const sun = new THREE.DirectionalLight(LP.sunColor, LP.sunIntensity);
    sun.position.set(LP.sunPos[0], LP.sunPos[1], LP.sunPos[2]);
    sun.castShadow = true;
    sun.shadow.mapSize.set(GFX.shadowMap, GFX.shadowMap);
    sun.shadow.camera.near = 1; sun.shadow.camera.far = 160;
    sun.shadow.camera.left = -26; sun.shadow.camera.right = 26; sun.shadow.camera.top = 26; sun.shadow.camera.bottom = -26;
    sun.shadow.bias = -0.0003; sun.shadow.normalBias = 0.04;
    scene.add(sun);
}
export let flashlight = null;
if (LP.flashlight) {
    const F = LP.flashlight;
    flashlight = new THREE.SpotLight(F.color, F.intensity, F.distance, F.angle, F.penumbra, F.decay);
    flashlight.castShadow = true; flashlight.shadow.mapSize.set(1024, 1024);
    flashlight.shadow.camera.near = 0.15; flashlight.shadow.camera.far = 36;
    flashlight.shadow.bias = -0.0005; flashlight.shadow.normalBias = 0.03;
    flashlight.target.position.set(0, 0, -6);
    camera.add(flashlight); camera.add(flashlight.target);
}

// Fizyka (gracz nie ma kontaktów w Cannonie, jego kolizje liczy player.js)
export const world = new CANNON.World({ gravity: new CANNON.Vec3(0, -12.0, 0) });
world.broadphase = new CANNON.SAPBroadphase(world);
export const physicsMat = new CANNON.Material('env');
world.addContactMaterial(new CANNON.ContactMaterial(physicsMat, physicsMat, { friction: 1.0, restitution: 0.0, contactEquationStiffness: 1e9, contactEquationRelaxation: 4 }));
export const GROUP = { ENV: 1, PLAYER: 2, BALL: 4, ROPE: 8 };

// Wspólne tekstury
export const tex = {
    wall: T.createWallTexture(), floor: T.createFloorTexture(), floorRough: T.createFloorRoughTexture(),
    plaster: T.createPlasterTexture(), skin: T.createSkinTexture(), wood: T.createWoodTexture(),
    eye: T.createEyeballTexture(), dot: T.createDotTexture(), camo: T.createCamoTexture(), bandage: T.createBandageTexture()
};

// Stan bieżącego poziomu. Wszystko, co poziom tworzy, trafia tutaj, żeby dało się go wyczyścić przy zmianie poziomu.
export const L = {
    root: new THREE.Group(),
    obstacles: [], trampolines: [], ropes: [], throwables: [], bodies: [], constraints: [], reserved: [],
    tramp: null,      // animacja maty trampoliny { mat, k }
    heldId: null,     // id piłki trzymanej przez lokalnego gracza
    spawn: [0, 2, 0]
};
scene.add(L.root);

export function clearLevel() {
    for (const c of L.constraints) world.removeConstraint(c);
    for (const b of L.bodies) world.removeBody(b);
    for (const k of ['obstacles', 'trampolines', 'ropes', 'throwables', 'bodies', 'constraints', 'reserved']) L[k].length = 0;
    L.tramp = null; L.heldId = null;
    L.root.clear();
}
export function addBody(body) { world.addBody(body); L.bodies.push(body); return body; }
export function addConstraint(c) { world.addConstraint(c); L.constraints.push(c); return c; }

// Pomocnicze funkcje geometrii
export const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
export const UNIT_SPHERE = new THREE.SphereGeometry(1, 10, 8);
export const UNIT_BOX = new THREE.BoxGeometry(1, 1, 1);
export const UNIT_CYL = new THREE.CylinderGeometry(1, 1, 1, 5, 1);
export const PIPE_CYL = new THREE.CylinderGeometry(1, 1, 1, 10, 1);
const _tM = new THREE.Matrix4(), _tQ = new THREE.Quaternion(), _tE = new THREE.Euler(), _tP = new THREE.Vector3(), _tS = new THREE.Vector3();
export function place(geo, px, py, pz, rx, ry, rz, sx, sy, sz) {
    const g = geo.clone();
    _tE.set(rx, ry, rz); _tQ.setFromEuler(_tE);
    _tM.compose(_tP.set(px, py, pz), _tQ, _tS.set(sx, sy, sz));
    g.applyMatrix4(_tM); return g;
}
export function seg(a, b, r0, r1, sides) {
    const d = new THREE.Vector3().subVectors(b, a), len = d.length();
    const g = new THREE.CylinderGeometry(r1, r0, len, sides || 6, 1);
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
    g.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5), q, new THREE.Vector3(1, 1, 1)));
    return g;
}

// Statyczna przeszkoda: ciało w Cannonie + pudełko kolizji gracza (z kształtu fizycznego)
export function addStaticBody(x, y, z, shape, obj, isTrampoline) {
    const body = addBody(new CANNON.Body({ mass: 0, shape: shape, material: physicsMat, collisionFilterGroup: GROUP.ENV, collisionFilterMask: -1 }));
    body.position.set(x, y, z);
    const h = shape.halfExtents;
    const box3 = new THREE.Box3(new THREE.Vector3(x - h.x, y - h.y, z - h.z), new THREE.Vector3(x + h.x, y + h.y, z + h.z));
    if (isTrampoline) L.trampolines.push({ box3 });
    L.obstacles.push({ obj, body, box3 });
}
function scaleBoxUVs(geo, w, h, d, m) {
    const uv = geo.attributes.uv, dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
    for (let f = 0; f < 6; f++) for (let v = 0; v < 4; v++) { const i = f * 4 + v; uv.setXY(i, uv.getX(i) * dims[f][0] / m, uv.getY(i) * dims[f][1] / m); }
    uv.needsUpdate = true;
}
// Teksturowany blok z kolizją. opts: { rough, physical, uvMeters }
export function addCrispBlock(x, y, z, w, h, d, color, edgeColor, texture, opts) {
    texture = texture || tex.wall; opts = opts || {};
    const params = { map: texture, bumpMap: texture, bumpScale: 1.4, color: color, roughness: 0.78, metalness: 0.15, envMapIntensity: LP.envIntensity };
    let mat;
    if (opts.physical) { params.clearcoat = 0.5; params.clearcoatRoughness = 0.3; mat = new THREE.MeshPhysicalMaterial(params); }
    else mat = new THREE.MeshStandardMaterial(params);
    if (opts.rough) { mat.roughnessMap = opts.rough; mat.roughness = 1.0; opts.rough.repeat.set(0.25, 0.25); }
    const geo = new THREE.BoxGeometry(w, h, d);
    scaleBoxUVs(geo, w, h, d, opts.uvMeters || 4);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, z); mesh.receiveShadow = true; mesh.castShadow = true;
    mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo), new THREE.LineBasicMaterial({ color: edgeColor, transparent: true, opacity: LP.edgeOpacity })));
    L.root.add(mesh);
    addStaticBody(x, y, z, new CANNON.Box(new CANNON.Vec3(w / 2, h / 2, d / 2)), mesh, false);
    return mesh;
}
// Miękki cień kontaktowy pod przedmiotem
const blobAOMat = new THREE.MeshBasicMaterial({ map: tex.dot, color: 0x000000, transparent: true, opacity: 0.55, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
export function addBlobAO(x, z, size) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size), blobAOMat);
    m.rotation.x = -Math.PI / 2; m.position.set(x, 0.016, z); L.root.add(m);
}

// Piłki nie mogą opuścić pomieszczenia (odbijają się od niewidzialnych granic)
export function containBall(b) {
    const p = b.position, v = b.velocity, L0 = 14.78, TOP = 19.78;
    if (p.x < -L0) { p.x = -L0; if (v.x < 0) v.x = -v.x * 0.5; }
    if (p.x > L0) { p.x = L0; if (v.x > 0) v.x = -v.x * 0.5; }
    if (p.z < -L0) { p.z = -L0; if (v.z < 0) v.z = -v.z * 0.5; }
    if (p.z > L0) { p.z = L0; if (v.z > 0) v.z = -v.z * 0.5; }
    if (p.y < 0.2) { p.y = 0.2; if (v.y < 0) v.y = -v.y * 0.4; }
    if (p.y > TOP) { p.y = TOP; if (v.y > 0) v.y = -v.y * 0.5; }
}
