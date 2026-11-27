// ==========================================
// SCARY GTA: BARYKADY (3D; reguły w czystym core/gtaroadblock.js, testy: tests/roadblock.mjs). Jedna siatka instancjonowana (+1 wywołanie rysowania, najwyżej RB.MAX sztuk): poprzeczka w czerwono-białe pasy
// w poprzek ulicy, dwa kozły i dwa światła (stałe, bez migotania). Tylko wizualne: bez ciała fizyki i bez wpisu w przeszkodach (pieszy przechodzi, pojazdy staja przed barykadą dzięki stopowi jazdy).
// ==========================================
import { THREE, L } from './engine.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import * as BL from './gtaroadblock.js';

const paint = (g, r, gr, b) => { const n = g.attributes.position.count, a = new Float32Array(n * 3); for (let i = 0; i < n; i++) { a[i * 3] = r; a[i * 3 + 1] = gr; a[i * 3 + 2] = b; } g.setAttribute('color', new THREE.BufferAttribute(a, 3)); return g; };
const box = (w, h, d, x, y, z, c) => paint(new THREE.BoxGeometry(w, h, d).translate(x, y, z), c[0], c[1], c[2]);
const RED = [0.8, 0.08, 0.06], WHITE = [0.85, 0.85, 0.85], DARK = [0.08, 0.08, 0.1];

export function createGtaRoadblocks() {
    const parts = [];
    for (let i = 0; i < 8; i++) parts.push(box(1.1, 0.5, 0.18, -3.85 + i * 1.1, 1.0, 0, i % 2 ? WHITE : RED));   // poprzeczka 8,8 m w pasy
    for (const x of [-4.5, 4.5]) { parts.push(box(0.25, 1.5, 0.5, x, 0.75, 0, DARK)); parts.push(box(0.3, 0.2, 0.3, x, 1.6, 0, x < 0 ? [2.2, 0.15, 0.1] : [0.15, 0.3, 2.2])); }   // kozły i światła (wartości powyżej 1 świecą)
    const geo = mergeGeometries(parts); for (const g of parts) g.dispose();
    const mat = new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false }), mesh = new THREE.InstancedMesh(geo, mat, BL.RB.MAX);
    mesh.frustumCulled = false; mesh.count = 0; mesh.visible = false; L.root.add(mesh);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), p = new THREE.Vector3(), s = new THREE.Vector3(1, 1, 1);
    let key = '';
    // nodes: indeksy węzłów grafu ulic (z własnej decyzji hosta albo z migawki po cleanBlocks)
    function sync(nodes) {
        const k = nodes.join(','); if (k === key) return; key = k;
        let c = 0;
        for (const i of nodes) { const pos = BL.nodePos(i); if (!pos) continue; e.set(0, BL.streetAlongX(i) ? Math.PI / 2 : 0, 0); q.setFromEuler(e); mesh.setMatrixAt(c++, m4.compose(p.set(pos.x, 0, pos.z), q, s)); }
        mesh.count = c; mesh.visible = c > 0; mesh.instanceMatrix.needsUpdate = true;
    }
    return {
        sync,
        debug: () => ({ count: mesh.count, visible: mesh.visible, parent: mesh.parent === L.root }),
        dispose() { mesh.removeFromParent(); mesh.dispose(); geo.dispose(); mat.dispose(); }
    };
}
