// ==========================================
// SCARY GTA: RADIOWOZY (3D; reguły i ruch w czystym core/copcarlogic.js, testy: tests/logic.mjs (blok "radiowozy"), w przeglądarce tests/copcars.mjs).
// Dwie siatki instancjonowane na najwyżej CC.MAX + 1 radiowozów: karoseria (granatowo-biała, kolor z wierzchołków, materiał standardowy) i światła (kogut czerwono-niebieski i reflektory, materiał bez oświetlenia):
// razem +2 wywołania rysowania bez względu na liczbę. Światła są STAŁE (bez migotania i stroba, komfort VR), bez prawdziwych świateł punktowych (nowe światło w locie przekompilowałoby materiały).
// Host rysuje własny stan, goście dostają migawkę i ją interpolują (`blendPose` z core/drivelogic.js). Radiowozy nie mają ciała fizyki: dla auta gracza to okręgi `blockers` (core/copcarlogic.js: blockersOf).
// ==========================================
import { THREE, L } from './engine.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { blendPose } from './drivelogic.js';
import { CC } from './copcarlogic.js';

const paint = (g, r, gr, b) => { const n = g.attributes.position.count, a = new Float32Array(n * 3); for (let i = 0; i < n; i++) { a[i * 3] = r; a[i * 3 + 1] = gr; a[i * 3 + 2] = b; } g.setAttribute('color', new THREE.BufferAttribute(a, 3)); return g; };
const box = (w, h, d, x, y, z, c) => paint(new THREE.BoxGeometry(w, h, d).translate(x, y, z).toNonIndexed(), c[0], c[1], c[2]);
const MAX = CC.MAX + 1;

export function createCopCars() {
    const navy = [0.05, 0.07, 0.16], white = [0.82, 0.84, 0.88], dark = [0.04, 0.04, 0.06], glass = [0.07, 0.12, 0.18];
    const bodyParts = [box(2.0, 0.6, 4.6, 0, 0.62, 0, navy), box(1.9, 0.6, 2.3, 0, 1.2, -0.2, navy), box(1.75, 0.45, 0.06, 0, 1.25, 0.97, glass), box(1.75, 0.4, 0.06, 0, 1.25, -1.37, glass), box(2.02, 0.2, 1.6, 0, 0.62, 0.05, white), box(0.1, 0.06, 1.7, -1.0, 0.95, 0.05, white), box(0.1, 0.06, 1.7, 1.0, 0.95, 0.05, white)];
    for (const sx of [-1, 1]) for (const z of [-1.5, 1.5]) { const w = new THREE.CylinderGeometry(0.38, 0.38, 0.26, 12); w.rotateZ(Math.PI / 2); w.translate(sx * 1.0, 0.38, z); bodyParts.push(paint(w.toNonIndexed(), 0.03, 0.03, 0.04)); }
    bodyParts.push(box(1.0, 0.1, 0.5, 0, 1.55, -0.2, dark));
    const bodyGeo = mergeGeometries(bodyParts); for (const g of bodyParts) g.dispose();
    const lightParts = [box(0.5, 0.18, 0.42, -0.36, 1.69, -0.2, [3.0, 0.2, 0.2]), box(0.5, 0.18, 0.42, 0.36, 1.69, -0.2, [0.2, 0.45, 3.0]), box(0.3, 0.16, 0.06, -0.65, 0.72, 2.3, [3, 3, 2.4]), box(0.3, 0.16, 0.06, 0.65, 0.72, 2.3, [3, 3, 2.4]), box(0.3, 0.12, 0.06, -0.7, 0.72, -2.3, [2.4, 0.2, 0.2]), box(0.3, 0.12, 0.06, 0.7, 0.72, -2.3, [2.4, 0.2, 0.2])];
    const lightGeo = mergeGeometries(lightParts); for (const g of lightParts) g.dispose();
    const bodyMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.4, metalness: 0.5 }), lightMat = new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false });
    const bodies = new THREE.InstancedMesh(bodyGeo, bodyMat, MAX), lights = new THREE.InstancedMesh(lightGeo, lightMat, MAX);
    for (const m of [bodies, lights]) { m.frustumCulled = false; m.count = 0; m.visible = false; L.root.add(m); }
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3(1, 1, 1), ay = new THREE.Vector3(0, 1, 0);
    let cur = [];
    // list: [{ x, z, yaw, v }] (host: własny stan, gość: migawka); puppet: interpolacja do ostatniej migawki (po indeksie)
    function update(list, dt, puppet) {
        const n = Math.min(list.length, MAX);
        if (puppet) { if (cur.length !== n) cur = list.slice(0, n).map(e => ({ x: e.x, z: e.z, yaw: e.yaw, v: e.v })); else for (let i = 0; i < n; i++) cur[i] = blendPose(cur[i], list[i], dt); } else cur = list.slice(0, n);
        for (let i = 0; i < n; i++) { const c = cur[i]; q.setFromAxisAngle(ay, c.yaw); p.set(c.x, 0, c.z); m4.compose(p, q, s); bodies.setMatrixAt(i, m4); lights.setMatrixAt(i, m4); }
        for (const m of [bodies, lights]) { m.count = n; m.visible = n > 0; m.instanceMatrix.needsUpdate = true; }
    }
    return {
        update, count: () => bodies.count, poses: () => cur.map(c => ({ x: c.x, z: c.z, yaw: c.yaw, v: c.v })),
        debug: () => ({ n: bodies.count, lights: lights.count, parent: bodies.parent === L.root, draw: 2 }),
        dispose() { for (const m of [bodies, lights]) { m.removeFromParent(); m.dispose(); } bodyGeo.dispose(); lightGeo.dispose(); bodyMat.dispose(); lightMat.dispose(); cur = []; }
    };
}
