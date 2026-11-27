// ==========================================
// SCARY GTA: ZNACZNIK POLICJANTA-GRACZA (3D; reguły w czystym core/gtacopmark.js). Jedna siatka instancjonowana (+1 wywołanie rysowania, najwyżej MARK.MAX sztuk): granatowa czapka z kogutem (stałe światła, bez migotania).
// Pozycja i obrót idą z renderowanej głowy zdalnego awatara (`remoteAvatars`), więc znacznik nie drży ani nie spóźnia się względem głowy; ukryci gracze (inny poziom, obserwator, niewidzialni) i bez głowy nie dostają znacznika.
// ==========================================
import { THREE, L } from './engine.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { remoteAvatars } from './network.js';
import * as CM from './gtacopmark.js';

const paint = (g, r, gr, b) => { const n = g.attributes.position.count, a = new Float32Array(n * 3); for (let i = 0; i < n; i++) { a[i * 3] = r; a[i * 3 + 1] = gr; a[i * 3 + 2] = b; } g.setAttribute('color', new THREE.BufferAttribute(a, 3)); return g; };
const box = (w, h, d, x, y, z, c) => paint(new THREE.BoxGeometry(w, h, d).translate(x, y, z), c[0], c[1], c[2]);

// api: { gm() -> stan trybu }
export function createGtaCopMarks(o) {
    const api = o.api, parts = [box(0.5, 0.12, 0.5, 0, 0, 0, [0.06, 0.09, 0.2]), box(0.5, 0.03, 0.2, 0, -0.03, -0.3, [0.03, 0.04, 0.1]), box(0.22, 0.1, 0.1, -0.12, 0.11, 0, [2.2, 0.12, 0.1]), box(0.22, 0.1, 0.1, 0.12, 0.11, 0, [0.15, 0.3, 2.2])];
    const geo = mergeGeometries(parts); for (const g of parts) g.dispose();
    const mat = new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false }), mesh = new THREE.InstancedMesh(geo, mat, CM.MARK.MAX);
    mesh.frustumCulled = false; mesh.count = 0; mesh.visible = false; L.root.add(mesh);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3(), hw = new THREE.Vector3(); let shown = [];
    let update = function () {
        const vis = Object.keys(remoteAvatars).filter(id => { const a = remoteAvatars[id]; return a && a.group.visible && a.head.visible; });
        shown = CM.markedIds(api.gm(), vis); let c = 0;
        for (const id of shown) { const a = remoteAvatars[id], k = Math.max(0.25, a.head.scale.x || 1); a.head.getWorldPosition(hw); a.head.getWorldQuaternion(q); p.set(hw.x, hw.y + CM.MARK.LIFT * k, hw.z); s.setScalar(k); mesh.setMatrixAt(c++, m4.compose(p, q, s)); }
        mesh.count = c; mesh.visible = c > 0; mesh.instanceMatrix.needsUpdate = true;
    };
    // ----- latarka: stożek z prawej dłoni zdalnego policjanta (oś -Z dłoni), jedna siatka addytywna -----
    const bg = new THREE.ConeGeometry(CM.BEAM.R, CM.BEAM.LEN, 20, 1, true); bg.translate(0, -CM.BEAM.LEN / 2, 0); bg.rotateX(Math.PI / 2);   // czubek w początku, otwarcie ku -Z
    { const pos = bg.attributes.position, col = new Float32Array(pos.count * 3); for (let i = 0; i < pos.count; i++) { const t = Math.min(1, Math.max(0, -pos.getZ(i) / CM.BEAM.LEN)), v = CM.BEAM.ALPHA * (1 - 0.85 * t); col[i * 3] = v; col[i * 3 + 1] = v * 0.95; col[i * 3 + 2] = v * 0.7; } bg.setAttribute('color', new THREE.BufferAttribute(col, 3)); }
    const bm = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false, fog: false }), beam = new THREE.InstancedMesh(bg, bm, CM.MARK.MAX);
    beam.frustumCulled = false; beam.count = 0; beam.visible = false; L.root.add(beam);
    const off = new THREE.Vector3(CM.BEAM.OFFSET[0], CM.BEAM.OFFSET[1], CM.BEAM.OFFSET[2]), bq = new THREE.Quaternion(), bp = new THREE.Vector3(), bo = new THREE.Vector3();
    function updateBeams() {
        let c = 0;
        for (const id of shown) { const a = remoteAvatars[id]; if (!a || !a.handR) continue; const k = Math.max(0.25, a.head.scale.x || 1); a.handR.getWorldQuaternion(bq); a.handR.getWorldPosition(bp); bo.copy(off).multiplyScalar(k).applyQuaternion(bq).add(bp); s.setScalar(k); beam.setMatrixAt(c++, m4.compose(bo, bq, s)); }
        beam.count = c; beam.visible = c > 0; beam.instanceMatrix.needsUpdate = true;
    }
    // ----- mundur: kamizelka na tułowiu (macierz świata tułowia, więc pochylenie i skala idą razem z awatarem) -----
    const V = CM.VEST, vparts = [];
    { const sp = new THREE.SphereGeometry(1, 18, 12); sp.scale(V.R[0], V.R[1], V.R[2]); sp.translate(V.CENTER[0], V.CENTER[1], V.CENTER[2]); vparts.push(paint(sp, 0.06, 0.09, 0.2)); }
    vparts.push(box(0.05, 0.06, 0.02, V.BADGE[0], V.BADGE[1], V.BADGE[2], [1.8, 1.4, 0.3]));   // złota odznaka z przodu (-Z)
    for (const sx of [-1, 1]) vparts.push(box(0.08, 0.02, 0.11, sx * V.EPAULET_X, 0.2, 0, [0.9, 0.9, 0.95]));   // naramienniki
    const vg = mergeGeometries(vparts); for (const g of vparts) g.dispose();
    const vm = new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false }), vest = new THREE.InstancedMesh(vg, vm, CM.MARK.MAX);
    vest.frustumCulled = false; vest.count = 0; vest.visible = false; L.root.add(vest);
    function updateVests() {
        let c = 0;
        for (const id of shown) { const a = remoteAvatars[id]; if (!a || !a.torso) continue; a.torso.updateWorldMatrix(true, false); vest.setMatrixAt(c++, a.torso.matrixWorld); }
        vest.count = c; vest.visible = c > 0; vest.instanceMatrix.needsUpdate = true;
    }
    const baseUpdate = update; update = function () { baseUpdate(); updateBeams(); updateVests(); };
    return {
        update: () => update(),
        debug: () => ({ count: mesh.count, visible: mesh.visible, ids: shown.slice(), parent: mesh.parent === L.root, beams: beam.count, beamVisible: beam.visible, vests: vest.count, vestVisible: vest.visible }),
        dispose() { mesh.removeFromParent(); mesh.dispose(); geo.dispose(); mat.dispose(); beam.removeFromParent(); beam.dispose(); bg.dispose(); bm.dispose(); vest.removeFromParent(); vest.dispose(); vg.dispose(); vm.dispose(); }
    };
}
