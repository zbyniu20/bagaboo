// ==========================================
// KOMPUTER NA BIURKU (taki sam jak w lobby, levels/lobby.js buildComputerDesk): drewniane biurko, monitor z ekranem 0,88 x 0,55 m
// (stosunek 1,6 jak płótno terminali), klawiatura, mysz, kubek, wieża i kartka. Używany w salach Levels i Games do wyboru pokoi.
// Biurko jest obrócone o rotY (lokalne +z = strona, z której stoi gracz) i powiększone o scale; kolizja to prostokąt osiowy (AABB).
// ==========================================
import { THREE, L, tex, addCollider, addBlobAO } from './engine.js';
import { LP } from './config.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import * as T from './textures.js';

const boxAt = (px, py, pz, w, h, d) => new THREE.BoxGeometry(w, h, d).translate(px, py, pz);

// makeScreen(w, h) -> Mesh z grafiką (np. term.createMesh). Zwraca { group, screen }.
export function buildComputerDesk(x, z, rotY, scale, makeScreen) {
    const ENV = LP.envIntensity;
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rotY; g.scale.setScalar(scale); L.root.add(g);
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
    const screen = makeScreen(0.88, 0.55); screen.position.set(0, 0.99, -0.105); g.add(screen);
    add(new RoundedBoxGeometry(0.52, 0.03, 0.18, 2, 0.01), plastic, -0.05, 0.595, 0.18);
    const keys = []; for (let r = 0; r < 4; r++) for (let c = 0; c < 12; c++) keys.push(boxAt(-0.27 + c * 0.04, 0.615, 0.12 + r * 0.036, 0.032, 0.012, 0.028));
    add(mergeGeometries(keys), new THREE.MeshStandardMaterial({ color: 0x8a8070, roughness: 0.6 }), -0.05, 0, 0);
    add(new THREE.SphereGeometry(0.03, 12, 8), plastic, 0.34, 0.59, 0.2).scale.set(1, 0.5, 1.5);
    add(new THREE.CylinderGeometry(0.04, 0.036, 0.1, 16), new THREE.MeshStandardMaterial({ color: 0x7a1010, roughness: 0.35 }), -0.62, 0.63, 0.12);
    add(new RoundedBoxGeometry(0.2, 0.46, 0.46, 2, 0.015), plastic, 0.55, 0.23, -0.05);
    add(new THREE.SphereGeometry(0.008, 8, 6), new THREE.MeshBasicMaterial({ color: 0x30ff60 }), 0.55, 0.4, 0.185);
    add(new THREE.PlaneGeometry(0.21, 0.297), new THREE.MeshStandardMaterial({ map: T.createPaperTexture(), roughness: 0.9 }), 0.55, 0.582, 0.22).rotation.set(-Math.PI / 2, 0, 0.4);
    // Kolizja: blat (z nogami) i monitor, jako prostokąty osiowe po obrocie
    const c = Math.abs(Math.cos(rotY)), s = Math.abs(Math.sin(rotY)), sn = Math.sin(rotY), cs = Math.cos(rotY);
    const box = (cx, cz, hx, hz, y0, y1) => { const ax = c * hx + s * hz, az = s * hx + c * hz, wx = x + cx * scale * cs + cz * scale * sn, wz = z - cx * scale * sn + cz * scale * cs; addCollider(wx - ax * scale, y0 * scale, wz - az * scale, wx + ax * scale, y1 * scale, wz + az * scale); };
    box(0, 0, 0.85, 0.425, 0, 0.58);        // biurko
    box(0, -0.3, 0.5, 0.2, 0.58, 1.33);     // monitor
    addBlobAO(x, z, 2.6 * scale); L.reserved.push([x, z, 2.6 * scale]);
    return { group: g, screen: screen };
}

// TERMINAL jak pulpit Maszyny goryla w lobby (levels/lobby.js buildGorillaMachine): czerwona szafka, ciemny blat i pochylony ekran 0,96 x 0,6 m
// (stosunek 1,6 jak płótno terminali) w ciemnej ramce. Bez biurka, krzesła i drobiazgów. Bez własnego światła (koszt na Quest).
// Terminal jest obrócony o rotY (lokalne +z = strona, z której stoi gracz) i powiększony o scale. Zwraca { group, screen } jak buildComputerDesk.
export function buildMachineTerminal(x, z, rotY, scale, makeScreen) {
    const ENV = LP.envIntensity;
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rotY; g.scale.setScalar(scale); L.root.add(g);
    const body = new THREE.MeshStandardMaterial({ map: tex.wall, bumpMap: tex.wall, bumpScale: 1.2, color: 0x7a1e18, metalness: 0.6, roughness: 0.45, envMapIntensity: ENV });
    const dark = new THREE.MeshStandardMaterial({ color: 0x141416, metalness: 0.7, roughness: 0.4, envMapIntensity: ENV });
    const add = (geo, mat, px, py, pz) => { const m = new THREE.Mesh(geo, mat); m.position.set(px, py, pz); m.castShadow = true; m.receiveShadow = true; g.add(m); return m; };
    add(new RoundedBoxGeometry(0.98, 0.92, 0.6, 3, 0.05), body, 0, 0.46, 0);   // szafka
    add(new THREE.BoxGeometry(1.04, 0.06, 0.66), dark, 0, 0.95, 0.02);          // blat
    const screen = makeScreen(0.96, 0.6); screen.position.set(0, 1.3, 0.12); screen.rotation.x = -0.5; g.add(screen);   // pochylony ekran
    add(new THREE.BoxGeometry(1.06, 0.7, 0.05), dark, 0, 1.3, 0.09).rotation.x = -0.5;                                  // ramka
    // Kolizja: szafka z ekranem jako prostokąt osiowy po obrocie
    const c = Math.abs(Math.cos(rotY)), s = Math.abs(Math.sin(rotY)), hx = 0.53, hz = 0.34, ax = c * hx + s * hz, az = s * hx + c * hz;
    addCollider(x - ax * scale, 0, z - az * scale, x + ax * scale, 1.65 * scale, z + az * scale);
    addBlobAO(x, z, 1.7 * scale); L.reserved.push([x, z, 1.9 * scale]);
    return { group: g, screen: screen };
}
