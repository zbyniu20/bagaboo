// ==========================================
// SILNIK: scena, kamera, renderer, światło, fizyka i wspólne narzędzia do budowy poziomów
// ==========================================
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { GFX, LP } from './config.js';
import * as T from './textures.js';
import { aoFor } from './gfxlogic.js';
import { familyFor, gradeColor, familyName, tileStrength, TILE } from './artlogic.js';
import { SETTINGS } from './settings.js';

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
renderer.xr.setFramebufferScaleFactor(GFX.xrScale * Math.max(0.7, Math.min(1, SETTINGS.perfScale || 1)));   // perfScale: niższa rozdzielczość zapamiętana, gdy gogle nie wyrabiały (xrperf.js)
renderer.xr.setFoveation(GFX.foveation);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = LP.exposure;
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2.0));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);
window.addEventListener('resize', () => { camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix(); renderer.setSize(window.innerWidth, window.innerHeight); });

// Światło. Każdy poziom ma własny preset (applyLighting). Lobby używa LIGHT_MODE z config.js.
const envTex = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
const hemi = new THREE.HemisphereLight(0xffffff, 0x000000, 1); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffffff, 1);
sun.castShadow = true;
sun.shadow.mapSize.set(GFX.shadowMap, GFX.shadowMap);
sun.shadow.camera.near = 1; sun.shadow.camera.far = 160;
sun.shadow.camera.left = -26; sun.shadow.camera.right = 26; sun.shadow.camera.top = 26; sun.shadow.camera.bottom = -26;
sun.shadow.bias = -0.0003; sun.shadow.normalBias = 0.04;
scene.add(sun);
// Latarka na głowie (włączana tylko w ciemnych poziomach)
const headLamp = new THREE.SpotLight(0xffffff, 0, 34, 0.52, 0.65, 2);
headLamp.castShadow = true; headLamp.shadow.mapSize.set(1024, 1024);
headLamp.shadow.camera.near = 0.15; headLamp.shadow.camera.far = 36;
headLamp.shadow.bias = -0.0005; headLamp.shadow.normalBias = 0.03;
headLamp.target.position.set(0, 0, -6);
camera.add(headLamp); camera.add(headLamp.target);
export const lighting = { preset: null, headLamp: headLamp, sun: sun, hemi: hemi };
export let flashlight = null;   // zostawione dla zgodności z lobby.js

export function applyLighting(P) {
    lighting.preset = P;
    scene.background.set(P.background);
    scene.fog.color.set(P.fogColor); scene.fog.density = P.fogDensity;
    renderer.toneMappingExposure = P.exposure * SETTINGS.brightness;
    scene.environment = P.envIntensity > 0 ? envTex : null;
    hemi.color.set(P.hemiSky); hemi.groundColor.set(P.hemiGround); hemi.intensity = P.hemiIntensity;
    sun.visible = P.sunIntensity > 0; sun.intensity = P.sunIntensity; sun.color.set(P.sunColor);
    sun.position.set(P.sunPos[0], P.sunPos[1], P.sunPos[2]);
    headLamp.visible = !!P.flashlight;
    if (P.flashlight) { const F = P.flashlight; headLamp.color.set(F.color); headLamp.intensity = F.intensity; headLamp.distance = F.distance; headLamp.angle = F.angle; headLamp.penumbra = F.penumbra; headLamp.decay = F.decay; }
}
applyLighting(LP);
// Zmiana suwaka jasności w menu pauzy: przelicza ekspozycję bieżącego presetu
export function applyBrightness() { if (lighting.preset) renderer.toneMappingExposure = lighting.preset.exposure * SETTINGS.brightness; }

// Fizyka (gracz nie ma kontaktów w Cannonie, jego kolizje liczy player.js)
export const world = new CANNON.World({ gravity: new CANNON.Vec3(0, -9.81, 0) });
world.broadphase = new CANNON.SAPBroadphase(world);
export const physicsMat = new CANNON.Material('env');
world.addContactMaterial(new CANNON.ContactMaterial(physicsMat, physicsMat, { friction: 1.0, restitution: 0.0, contactEquationStiffness: 1e9, contactEquationRelaxation: 4 }));
export const GROUP = { ENV: 1, PLAYER: 2, BALL: 4, ROPE: 8 };

// Wspólne tekstury
export const tex = {
    wall: T.createWallTexture(), floor: T.createFloorTexture(), floorRough: T.createFloorRoughTexture(),
    plaster: T.createPlasterTexture(), skin: T.createSkinTexture(), wood: T.createWoodTexture(),
    eye: T.createEyeballTexture(), dot: T.createDotTexture(), camo: T.createCamoTexture(), bandage: T.createBandageTexture(),
    // rysowane dopiero przy pierwszym użyciu (poziomy z mokrą podłogą, zardzewiałymi ścianami i potworami)
    get floorWet() { return T.createFloorWetRoughTexture(); }, get wallRust() { return T.createWallRustTexture(); }, get eyeBloodshot() { return T.createBloodshotEyeTexture(); }, get decals() { return T.createDecalAtlas(); }
};

// Stan bieżącego poziomu. Wszystko, co poziom tworzy, trafia tutaj, żeby dało się go wyczyścić przy zmianie poziomu.
export const L = {
    root: new THREE.Group(),
    obstacles: [], trampolines: [], ropes: [], throwables: [], bodies: [], constraints: [], reserved: [],
    portals: [],      // przejścia do innych poziomów { box3, target, spawn, onEnter }
    bakeList: [],     // bloki z addCrispBlock do wypalenia oświetlenia po zbudowaniu poziomu (core/lightbake.js): { mesh, w, h, d, uvMeters }
    hammerTargets: [],   // cele młotków ekipy poza graczami, np. manekin treningowy w lobby { chest: Vector3, r, hit(tool, headPos) }
    tramp: null,      // animacja maty trampoliny { mat, k }
    heldId: null,     // id piłki trzymanej przez lokalnego gracza
    spawn: [0, 2, 0],
    levelId: 'lobby',
    bounds: { minX: -14.6, maxX: 14.6, minZ: -14.6, maxZ: 14.6, maxY: 19.6 }   // twarde granice ruchu gracza
};
scene.add(L.root);

export function clearLevel() {
    for (const c of L.constraints) world.removeConstraint(c);
    for (const b of L.bodies) world.removeBody(b);
    for (const k of ['obstacles', 'trampolines', 'ropes', 'throwables', 'bodies', 'constraints', 'reserved', 'portals', 'hammerTargets', 'bakeList']) L[k].length = 0;
    L.tramp = null; L.heldId = null; L.floorY = undefined;
    L.gen = (L.gen || 0) + 1;   // numer pokolenia poziomu: asynchroniczne dekoracje (rekwizyty, elementy architektury) sprawdzają go po wczytaniu pliku
    L.bounds = { minX: -14.6, maxX: 14.6, minZ: -14.6, maxZ: 14.6, maxY: 19.6 };
    L.ballMaxZ = undefined;
    // Zwolnienie pamięci karty graficznej po starym poziomie
    L.root.traverse((o) => {
        if (o.geometry) o.geometry.dispose();
        if (o.isInstancedMesh) o.dispose();   // bufor macierzy instancji
        const mats = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : [];
        for (const m of mats) { for (const k of ['map', 'emissiveMap', 'bumpMap', 'roughnessMap', 'normalMap', 'metalnessMap', 'alphaMap', 'aoMap', 'lightMap']) if (m[k]) m[k].dispose(); m.dispose(); }
    });
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
export function scaleBoxUVs(geo, w, h, d, m) {
    const uv = geo.attributes.uv, dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
    for (let f = 0; f < 6; f++) for (let v = 0; v < 4; v++) { const i = f * 4 + v; uv.setXY(i, uv.getX(i) * dims[f][0] / m, uv.getY(i) * dims[f][1] / m); }
    uv.needsUpdate = true;
}
// Sama kolizja gracza (bez fizyki Cannona): szybsza przy setkach ścian, np. w labiryncie
export function addCollider(minX, minY, minZ, maxX, maxY, maxZ) {
    L.obstacles.push({ obj: null, body: null, box3: new THREE.Box3(new THREE.Vector3(minX, minY, minZ), new THREE.Vector3(maxX, maxY, maxZ)) });
}
// Teksturowany blok z kolizją. opts: { rough, physical, uvMeters }
// Krawędzie bloku rysowane w fragment shaderze (wcześniej osobny LineSegments na każdy blok = podwójna liczba wywołań rysowania).
// Punkt leży na krawędzi, gdy jest blisko dwóch ścian jednocześnie; obwódka porusza się i chowa razem z blokiem.
// Wypalone w shaderze ambient occlusion (bez dodatkowych siatek): decyzje w czystym core/gfxlogic.js (aoFor), tu tylko uniformy i kod shadera.
export const BAKE_U = { value: 1 };   // wspólny mnożnik wypalonego światła (core/lightbake.js, updateBake): gaśnie razem ze światłami w zaciemnieniach
function addShaderEdges(mat, w, h, d, edgeColor, ao, tile) {
    const half = new THREE.Vector3(w / 2, h / 2, d / 2), col = new THREE.Color(edgeColor), op = LP.edgeOpacity, aov = new THREE.Vector4(ao ? ao.b : 0, ao ? ao.t : 0, ao ? ao.f : 0, ao ? ao.c : 0);
    mat.userData.ao = aov;   // do odczytu w testach (tests/gfx.mjs)
    mat.onBeforeCompile = (sh) => {
        sh.uniforms.uEdgeHalf = { value: half }; sh.uniforms.uEdgeCol = { value: col }; sh.uniforms.uEdgeOp = { value: op }; sh.uniforms.uAO = { value: aov }; sh.uniforms.uBakeK = BAKE_U; sh.uniforms.uTile = { value: tile || 0 }; sh.uniforms.uTileScale = { value: TILE.scale };
        sh.vertexShader = 'varying vec3 vEdgeP; attribute vec3 aBake; varying vec3 vBake; varying vec3 vTileP;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvEdgeP = position; vBake = aBake; vTileP = (modelMatrix * vec4(position, 1.0)).xyz;');
        sh.fragmentShader = 'uniform vec3 uEdgeHalf; uniform vec3 uEdgeCol; uniform float uEdgeOp; uniform vec4 uAO; uniform float uBakeK; uniform float uTile; uniform float uTileScale; varying vec3 vEdgeP; varying vec3 vBake; varying vec3 vTileP;\n' + TILE_GLSL + sh.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n    totalEmissiveRadiance += vBake * diffuseColor.rgb * uBakeK;   // wypalone oświetlenie (core/lightbake.js)').replace('#include <color_fragment>', `#include <color_fragment>
            vec3 eD = uEdgeHalf - abs(vEdgeP);
            float e1 = 1.0 - smoothstep(0.0, 0.016, eD.x), e2 = 1.0 - smoothstep(0.0, 0.016, eD.y), e3 = 1.0 - smoothstep(0.0, 0.016, eD.z);
            float edge = max(max(e1 * e2, e2 * e3), e1 * e3);
            diffuseColor.rgb = mix(diffuseColor.rgb, uEdgeCol, clamp(edge * uEdgeOp * 2.0, 0.0, 0.85));
            float aoF = mix(1.0 - uAO.x, 1.0, smoothstep(0.0, 0.9, vEdgeP.y + uEdgeHalf.y));
            aoF *= mix(1.0 - uAO.y, 1.0, smoothstep(0.0, 0.5, uEdgeHalf.y - vEdgeP.y));
            float aoE = min(uEdgeHalf.x - abs(vEdgeP.x), uEdgeHalf.z - abs(vEdgeP.z));
            aoF *= mix(1.0, mix(1.0 - uAO.z, 1.0, smoothstep(0.0, 0.9, aoE)), step(uEdgeHalf.y - 0.002, vEdgeP.y) * step(0.001, uAO.z));
            aoF *= mix(1.0, mix(1.0 - uAO.w, 1.0, smoothstep(0.0, 0.9, aoE)), step(vEdgeP.y, 0.002 - uEdgeHalf.y) * step(0.001, uAO.w));
            diffuseColor.rgb *= aoF;
            float tn = tileNoise(vTileP * uTileScale), tm = tileNoise(vTileP * uTileScale * 2.7 + 11.3);
            diffuseColor.rgb *= 1.0 + (tn - 0.5) * 2.0 * uTile + (tm - 0.5) * 0.7 * uTile;
            diffuseColor.rgb *= vec3(1.0 + (tm - 0.5) * 0.5 * uTile, 1.0, 1.0 - (tm - 0.5) * 0.5 * uTile);`);
    };
    mat.customProgramCacheKey = () => 'crispEdge';
}
// Szum wartości 3D w shaderze (łamanie powtarzalności tekstur): tylko mnoży kolor, relief (normalne) zostaje zgodny z fugami
const TILE_GLSL = 'float tileHash(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }\nfloat tileNoise(vec3 x){ vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f); return mix(mix(mix(tileHash(i), tileHash(i + vec3(1,0,0)), f.x), mix(tileHash(i + vec3(0,1,0)), tileHash(i + vec3(1,1,0)), f.x), f.y), mix(mix(tileHash(i + vec3(0,0,1)), tileHash(i + vec3(1,0,1)), f.x), mix(tileHash(i + vec3(0,1,1)), tileHash(i + vec3(1,1,1)), f.x), f.y), f.z); }\n';
export function addCrispBlock(x, y, z, w, h, d, color, edgeColor, texture, opts) {
    texture = texture || tex.wall; opts = opts || {};
    const nm = T.normalFor(texture, 3);   // prawdziwa mapa normalnych (z jasności tekstury) zamiast bump mapy
    if (!opts.noGrade) color = gradeColor(color, familyFor(L.levelId));   // spójna paleta rodziny poziomu (core/artlogic.js)
    const params = { map: texture, normalMap: nm, normalScale: new THREE.Vector2(1.1, 1.1), color: color, roughness: 0.78, metalness: 0.15, envMapIntensity: LP.envIntensity };
    let mat;
    if (opts.physical) { params.clearcoat = 0.5; params.clearcoatRoughness = 0.3; mat = new THREE.MeshPhysicalMaterial(params); }
    else mat = new THREE.MeshStandardMaterial(params);
    if (opts.rough) { mat.roughnessMap = opts.rough; mat.roughness = 1.0; opts.rough.repeat.set(0.25, 0.25); }
    const geo = new THREE.BoxGeometry(w, h, d);
    scaleBoxUVs(geo, w, h, d, opts.uvMeters || 4);
    geo.setAttribute('aBake', new THREE.BufferAttribute(new Float32Array(geo.attributes.position.count * 3), 3));   // zera: bez wypalenia nic nie dodaje (wypala core/lightbake.js)
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, z); mesh.receiveShadow = true; mesh.castShadow = true;
    addShaderEdges(mat, w, h, d, edgeColor, aoFor(x, y, z, w, h, d, opts), tileStrength(familyName(L.levelId)));
    L.bakeList.push({ mesh: mesh, w: w, h: h, d: d, uvMeters: opts.uvMeters || 4 });   // obwódka krawędzi i AO w shaderze: bez osobnego obiektu (połowa wywołań rysowania)
    L.root.add(mesh);
    addStaticBody(x, y, z, new CANNON.Box(new CANNON.Vec3(w / 2, h / 2, d / 2)), mesh, false);
    return mesh;
}
// Wiele małych bloków (nagrobki, skrzynie, słupki) w jednym wywołaniu rysowania: InstancedMesh + sama kolizja gracza.
// list: [{ x, y, z, w, h, d, rotY, color }]. Bez obwódki krawędzi i bez bryły fizycznej Cannona (to dekoracje: gracz i boty zderzają się przez L.obstacles).
export function addInstancedBlocks(list, texture, opts) {
    if (!list.length) return null;
    opts = opts || {}; texture = texture || tex.wall;
    const mat = new THREE.MeshStandardMaterial({ map: texture, normalMap: T.normalFor(texture, 3), normalScale: new THREE.Vector2(1.1, 1.1), roughness: 0.8, metalness: 0.1, envMapIntensity: LP.envIntensity });
    const geo = new THREE.BoxGeometry(1, 1, 1); scaleBoxUVs(geo, 1, 1, 1, opts.uvMeters || 2);
    const im = new THREE.InstancedMesh(geo, mat, list.length), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), p = new THREE.Vector3(), s = new THREE.Vector3(), c = new THREE.Color();
    list.forEach((b, i) => {
        e.set(0, b.rotY || 0, 0); q.setFromEuler(e); p.set(b.x, b.y, b.z); s.set(b.w, b.h, b.d); m4.compose(p, q, s); im.setMatrixAt(i, m4);
        im.setColorAt(i, c.set(b.color !== undefined ? b.color : 0xffffff));
        const ca = Math.abs(Math.cos(b.rotY || 0)), sa = Math.abs(Math.sin(b.rotY || 0)), hx = (b.w * ca + b.d * sa) / 2, hz = (b.w * sa + b.d * ca) / 2;   // obrys obrócony: kolizja jako pudełko osiowe
        addCollider(b.x - hx, b.y - b.h / 2, b.z - hz, b.x + hx, b.y + b.h / 2, b.z + hz);
    });
    im.castShadow = true; im.receiveShadow = true; im.frustumCulled = false; L.root.add(im);
    return im;
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
    const ZM = L.ballMaxZ !== undefined ? L.ballMaxZ : L0;   // poziom z dłuższą halą (lobby z aneksem) podnosi południową granicę
    if (p.z > ZM) { p.z = ZM; if (v.z > 0) v.z = -v.z * 0.5; }
    if (p.y < 0.2) { p.y = 0.2; if (v.y < 0) v.y = -v.y * 0.4; }
    if (p.y > TOP) { p.y = TOP; if (v.y > 0) v.y = -v.y * 0.5; }
}
