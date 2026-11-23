// ==========================================
// WYPALANIE OŚWIETLENIA (3D) i PALETA POZIOMU. Logika w core/bakelogic.js i core/artlogic.js.
// bakeLevel() woła main.js po zbudowaniu poziomu (przed pulą świateł): bloki z addCrispBlock dostają siatkę ok. 1 m i atrybut aBake z kolorem
// światła ze WSZYSTKICH świateł punktowych poziomu (z okluzją na bryłach). Dzięki temu miejsca, do których pula świateł już nie dosięga,
// nadal mają miękkie, kolorowe światło pośrednie. Koszt w czasie gry: jeden atrybut na wierzchołek i jedno dodawanie w shaderze (bez wywołań rysowania).
// applyArt(id) stosuje paletę rodziny poziomu do światła otoczenia i mgły. `?bake=0` w adresie wyłącza wypalanie (porównania i zrzuty).
// ==========================================
import { THREE, L, scene, lighting, BAKE_U } from './engine.js';
import { segCount, cellFor, prepareLights, bakeVertex, bakeScale } from './bakelogic.js';
import { familyFor, mixHex } from './artlogic.js';

const OFF = typeof location !== 'undefined' && /[?&]bake=0\b/.test(location.search);
export const bakeInfo = { ms: 0, meshes: 0, verts: 0, lights: 0, cell: 0, raw: 0 };
function scaleUVs(geo, w, h, d, m, sx, sy, sz) {   // jak scaleBoxUVs z engine.js, ale dla ścian z wieloma segmentami (kolejność BoxGeometry: +x -x +y -y +z -z)
    const uv = geo.attributes.uv, dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
    const cnt = [(sz + 1) * (sy + 1), (sz + 1) * (sy + 1), (sx + 1) * (sz + 1), (sx + 1) * (sz + 1), (sx + 1) * (sy + 1), (sx + 1) * (sy + 1)];
    let i = 0; for (let f = 0; f < 6; f++) for (let v = 0; v < cnt[f]; v++, i++) uv.setXY(i, uv.getX(i) * dims[f][0] / m, uv.getY(i) * dims[f][1] / m);
    uv.needsUpdate = true;
}
let sources = [];   // światła wypalone: { l, i0 } (moc z chwili wypalania)
function collectLights() {
    const out = [], p = new THREE.Vector3(); sources = [];
    L.root.traverse((o) => {
        if (!o.isPointLight || o.userData.pooled || o.userData.noBake || !o.visible || !(o.intensity > 0)) return;
        sources.push({ l: o, i0: o.intensity });
        o.getWorldPosition(p);
        out.push({ x: p.x, y: p.y, z: p.z, r: o.color.r * o.intensity, g: o.color.g * o.intensity, b: o.color.b * o.intensity, dist: o.distance, decay: o.decay });
    });
    return out;
}
// Zwykłe materiały (spoza addCrispBlock) też dostają wypalone światło: ten sam atrybut aBake i mnożnik BAKE_U, dodane do emisji
function patchMaterial(mat) {
    if (mat.userData.bakePatch) return; mat.userData.bakePatch = true;
    const prev = mat.onBeforeCompile, pk = mat.customProgramCacheKey;
    mat.onBeforeCompile = (sh, r) => {
        if (prev) prev(sh, r); sh.uniforms.uBakeK = BAKE_U;
        sh.vertexShader = 'attribute vec3 aBake; varying vec3 vBakeX;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvBakeX = aBake;');
        sh.fragmentShader = 'uniform float uBakeK; varying vec3 vBakeX;\n' + sh.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += vBakeX * diffuseColor.rgb * uBakeK;');
    };
    mat.customProgramCacheKey = () => (pk ? pk.call(mat) : '') + 'bakeX'; mat.needsUpdate = true;
}
function faceUVs(geo, fuv, sx, sy, sz) {   // mnożniki UV na ścianach (+x -x +y -y +z -z) dla podzielonego pudełka
    const uv = geo.attributes.uv, cnt = [(sz + 1) * (sy + 1), (sz + 1) * (sy + 1), (sx + 1) * (sz + 1), (sx + 1) * (sz + 1), (sx + 1) * (sy + 1), (sx + 1) * (sy + 1)];
    let i = 0; for (let f = 0; f < 6; f++) for (let v = 0; v < cnt[f]; v++, i++) uv.setXY(i, uv.getX(i) * fuv[f][0], uv.getY(i) * fuv[f][1]);
    uv.needsUpdate = true;
}
// Zwykłe bryły BoxGeometry (poza addCrispBlock) o wymiarze >= 1,5 m, nieprzezroczyste i nieświecące: wypalamy je jak bloki (z obrotem i skalą z macierzy świata)
function collectRawBoxes(skip) {
    const out = [], usage = new Map();
    L.root.traverse((o) => { if (o.isMesh && o.geometry) usage.set(o.geometry, (usage.get(o.geometry) || 0) + 1); });
    L.root.traverse((o) => {
        if (!o.isMesh || o.isInstancedMesh || o.isSkinnedMesh || skip.has(o) || !o.visible || o.userData.noBake || !o.geometry || o.geometry.type !== 'BoxGeometry') return;
        const m = o.material; if (Array.isArray(m) || !m.isMeshStandardMaterial || m.transparent || m.userData.bakePatch === false || (m.emissive && m.emissive.getHex() !== 0 && m.emissiveIntensity > 0.4)) return;
        if (m.onBeforeCompile && m.customProgramCacheKey && /crispEdge/.test(String(m.customProgramCacheKey()))) return;   // blok z addCrispBlock ma własny tor
        const par = o.geometry.parameters, ws = o.getWorldScale(new THREE.Vector3()); if (Math.max(par.width * Math.abs(ws.x), par.height * Math.abs(ws.y), par.depth * Math.abs(ws.z)) < 1.5) return;
        const uv = o.geometry.attributes.uv, fuv = []; for (let f = 0; f < 6; f++) { let mu = 0, mv = 0; for (let k = 0; k < 4; k++) { mu = Math.max(mu, uv.getX(f * 4 + k)); mv = Math.max(mv, uv.getY(f * 4 + k)); } fuv.push([mu || 1, mv || 1]); }
        out.push({ mesh: o, w: par.width, h: par.height, d: par.depth, ws: ws, fuv: fuv });
    });
    return { out, usage };
}
export function bakeLevel() {
    bakeInfo.ms = bakeInfo.meshes = bakeInfo.verts = bakeInfo.lights = bakeInfo.raw = 0; BAKE_U.value = 1; sources = [];
    if (OFF) return bakeInfo;
    const t0 = performance.now(), lights0 = collectLights(); bakeInfo.lights = lights0.length;
    if (!lights0.length) return bakeInfo;
    L.root.updateMatrixWorld(true);
    const own = new Map(), plain = [];
    for (const o of L.obstacles) { if (!o.box3) continue; const b = { min: o.box3.min, max: o.box3.max }; plain.push(b); if (o.obj) own.set(o.obj, b); }
    const crisp = new Set(L.bakeList.map(e => e.mesh)), raw = collectRawBoxes(crisp);
    const entries = L.bakeList.filter(e => e.mesh.parent).map(e => ({ mesh: e.mesh, w: e.w, h: e.h, d: e.d, ws: e.mesh.getWorldScale(new THREE.Vector3()), uvMeters: e.uvMeters, raw: false })).concat(raw.out.map(e => Object.assign(e, { raw: true })));
    if (!entries.length) return bakeInfo;
    const lights = prepareLights(lights0, plain), cell = cellFor(entries.map(e => [e.w * Math.abs(e.ws.x), e.h * Math.abs(e.ws.y), e.d * Math.abs(e.ws.z)]));
    bakeInfo.cell = cell;
    const pos = new THREE.Vector3(), nrm = new THREE.Vector3(), box = new THREE.Box3(), patched = new Set();
    for (const e of entries) {
        const m = e.mesh;
        const sx = segCount(e.w * Math.abs(e.ws.x), cell), sy = segCount(e.h * Math.abs(e.ws.y), cell), sz = segCount(e.d * Math.abs(e.ws.z), cell);
        const geo = new THREE.BoxGeometry(e.w, e.h, e.d, sx, sy, sz);
        if (e.raw) faceUVs(geo, e.fuv, sx, sy, sz); else scaleUVs(geo, e.w, e.h, e.d, e.uvMeters, sx, sy, sz);
        const P = geo.attributes.position, N = geo.attributes.normal, n = P.count, col = new Float32Array(n * 3), self = own.get(m);
        box.setFromObject(m);   // tylko światła, które w ogóle sięgają tej bryły
        const near = lights.filter(l => !(l.dist > 0) || Math.hypot(Math.max(box.min.x - l.x, 0, l.x - box.max.x), Math.max(box.min.y - l.y, 0, l.y - box.max.y), Math.max(box.min.z - l.z, 0, l.z - box.max.z)) < l.dist);
        if (near.length) for (let i = 0; i < n; i++) {
            pos.fromBufferAttribute(P, i).applyMatrix4(m.matrixWorld); nrm.fromBufferAttribute(N, i).transformDirection(m.matrixWorld);
            const c = bakeVertex(pos, nrm, near, self); col[i * 3] = c[0]; col[i * 3 + 1] = c[1]; col[i * 3 + 2] = c[2];
        }
        geo.setAttribute('aBake', new THREE.BufferAttribute(col, 3));
        const old = m.geometry; m.geometry = geo; m.material.userData.baked = true;
        if (e.raw) { bakeInfo.raw++; patchMaterial(m.material); patched.add(m.material); const left = (raw.usage.get(old) || 1) - 1; raw.usage.set(old, left); if (left <= 0) old.dispose(); } else old.dispose();
        bakeInfo.meshes++; bakeInfo.verts += n;
    }
    // każda siatka z załatanym materiałem musi mieć atrybut aBake (zera), inaczej odczytałaby cudzą wartość domyślną
    if (patched.size) L.root.traverse((o) => { if (o.isMesh && o.geometry && !Array.isArray(o.material) && patched.has(o.material) && !o.geometry.attributes.aBake) o.geometry.setAttribute('aBake', new THREE.BufferAttribute(new Float32Array(o.geometry.attributes.position.count * 3), 3)); });
    bakeInfo.ms = performance.now() - t0;
    return bakeInfo;
}
// Paleta rodziny poziomu: światło otoczenia i mgła ciągną ku tonowi rodziny (kolory bloków koryguje addCrispBlock)
export function applyArt(levelId) {
    const f = familyFor(levelId); if (!f) return;
    lighting.hemi.color.setHex(mixHex(lighting.hemi.color.getHex(), f.tint, f.hemi));
    lighting.hemi.groundColor.setHex(mixHex(lighting.hemi.groundColor.getHex(), f.tint, f.hemi * 0.6));
    if (scene.fog) scene.fog.color.setHex(mixHex(scene.fog.color.getHex(), f.tint, f.fog * 0.5));
    if (scene.background && scene.background.isColor) scene.background.setHex(mixHex(scene.background.getHex(), f.tint, f.fog * 0.5));
}
// Co klatkę (main.js): wypalone światło gaśnie i błyska razem ze światłami punktowymi poziomu (zaciemnienia, awarie, migotanie). Moc ważona mocą z chwili wypalania.
export function updateBake(dt) {
    if (!sources.length) { BAKE_U.value = 1; return; }
    const target = bakeScale(sources.map(e => [e.l.parent ? e.l.intensity : 0, e.i0]));
    BAKE_U.value += (target - BAKE_U.value) * Math.min(1, Math.max(0, dt) * 10);
}
