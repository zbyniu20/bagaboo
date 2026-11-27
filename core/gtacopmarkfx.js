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
    function update() {
        const vis = Object.keys(remoteAvatars).filter(id => { const a = remoteAvatars[id]; return a && a.group.visible && a.head.visible; });
        shown = CM.markedIds(api.gm(), vis); let c = 0;
        for (const id of shown) { const a = remoteAvatars[id], k = Math.max(0.25, a.head.scale.x || 1); a.head.getWorldPosition(hw); a.head.getWorldQuaternion(q); p.set(hw.x, hw.y + CM.MARK.LIFT * k, hw.z); s.setScalar(k); mesh.setMatrixAt(c++, m4.compose(p, q, s)); }
        mesh.count = c; mesh.visible = c > 0; mesh.instanceMatrix.needsUpdate = true;
    }
    return {
        update,
        debug: () => ({ count: mesh.count, visible: mesh.visible, ids: shown.slice(), parent: mesh.parent === L.root }),
        dispose() { mesh.removeFromParent(); mesh.dispose(); geo.dispose(); mat.dispose(); }
    };
}
