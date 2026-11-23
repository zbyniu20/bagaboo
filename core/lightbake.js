// ==========================================
// WYPALANIE OŚWIETLENIA (3D) i PALETA POZIOMU. Logika w core/bakelogic.js i core/artlogic.js.
// bakeLevel() woła main.js po zbudowaniu poziomu (przed pulą świateł): bloki z addCrispBlock dostają siatkę ok. 1 m i atrybut aBake z kolorem
// światła ze WSZYSTKICH świateł punktowych poziomu (z okluzją na bryłach). Dzięki temu miejsca, do których pula świateł już nie dosięga,
// nadal mają miękkie, kolorowe światło pośrednie. Koszt w czasie gry: jeden atrybut na wierzchołek i jedno dodawanie w shaderze (bez wywołań rysowania).
// applyArt(id) stosuje paletę rodziny poziomu do światła otoczenia i mgły. `?bake=0` w adresie wyłącza wypalanie (porównania i zrzuty).
// ==========================================
import { THREE, L, scene, lighting } from './engine.js';
import { segCount, cellFor, prepareLights, bakeVertex } from './bakelogic.js';
import { familyFor, mixHex } from './artlogic.js';

const OFF = typeof location !== 'undefined' && /[?&]bake=0\b/.test(location.search);
export const bakeInfo = { ms: 0, meshes: 0, verts: 0, lights: 0, cell: 0 };
function scaleUVs(geo, w, h, d, m, sx, sy, sz) {   // jak scaleBoxUVs z engine.js, ale dla ścian z wieloma segmentami (kolejność BoxGeometry: +x -x +y -y +z -z)
    const uv = geo.attributes.uv, dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
    const cnt = [(sz + 1) * (sy + 1), (sz + 1) * (sy + 1), (sx + 1) * (sz + 1), (sx + 1) * (sz + 1), (sx + 1) * (sy + 1), (sx + 1) * (sy + 1)];
    let i = 0; for (let f = 0; f < 6; f++) for (let v = 0; v < cnt[f]; v++, i++) uv.setXY(i, uv.getX(i) * dims[f][0] / m, uv.getY(i) * dims[f][1] / m);
    uv.needsUpdate = true;
}
function collectLights() {
    const out = [], p = new THREE.Vector3();
    L.root.traverse((o) => {
        if (!o.isPointLight || o.userData.pooled || o.userData.noBake || !o.visible || !(o.intensity > 0)) return;
        o.getWorldPosition(p);
        out.push({ x: p.x, y: p.y, z: p.z, r: o.color.r * o.intensity, g: o.color.g * o.intensity, b: o.color.b * o.intensity, dist: o.distance, decay: o.decay });
    });
    return out;
}
export function bakeLevel() {
    bakeInfo.ms = bakeInfo.meshes = bakeInfo.verts = bakeInfo.lights = 0;
    if (OFF || !L.bakeList.length) return bakeInfo;
    const t0 = performance.now(), lights0 = collectLights(); bakeInfo.lights = lights0.length;
    if (!lights0.length) return bakeInfo;
    const own = new Map(), plain = [];
    for (const o of L.obstacles) { if (!o.box3) continue; const b = { min: o.box3.min, max: o.box3.max }; plain.push(b); if (o.obj) own.set(o.obj, b); }
    const lights = prepareLights(lights0, plain), cell = cellFor(L.bakeList.map(e => [e.w, e.h, e.d]));
    bakeInfo.cell = cell;
    const pos = new THREE.Vector3(), nrm = new THREE.Vector3();
    for (const e of L.bakeList) {
        const m = e.mesh; if (!m.parent) continue;
        const sx = segCount(e.w, cell), sy = segCount(e.h, cell), sz = segCount(e.d, cell);
        const geo = new THREE.BoxGeometry(e.w, e.h, e.d, sx, sy, sz); scaleUVs(geo, e.w, e.h, e.d, e.uvMeters, sx, sy, sz);
        const P = geo.attributes.position, N = geo.attributes.normal, n = P.count, col = new Float32Array(n * 3), self = own.get(m);
        // tylko światła, które w ogóle sięgają tej bryły
        const near = lights.filter(l => !(l.dist > 0) || Math.hypot(Math.max(m.position.x - e.w / 2 - l.x, 0, l.x - m.position.x - e.w / 2), Math.max(m.position.y - e.h / 2 - l.y, 0, l.y - m.position.y - e.h / 2), Math.max(m.position.z - e.d / 2 - l.z, 0, l.z - m.position.z - e.d / 2)) < l.dist);
        if (near.length) for (let i = 0; i < n; i++) {
            pos.set(P.getX(i) + m.position.x, P.getY(i) + m.position.y, P.getZ(i) + m.position.z); nrm.set(N.getX(i), N.getY(i), N.getZ(i));
            const c = bakeVertex(pos, nrm, near, self); col[i * 3] = c[0]; col[i * 3 + 1] = c[1]; col[i * 3 + 2] = c[2];
        }
        geo.setAttribute('aBake', new THREE.BufferAttribute(col, 3));
        m.geometry.dispose(); m.geometry = geo; m.material.userData.baked = true;
        bakeInfo.meshes++; bakeInfo.verts += n;
    }
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
