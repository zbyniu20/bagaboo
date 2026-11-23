// ==========================================
// Pyłki w powietrzu: jedna siatka punktów wokół gracza, widoczna w promieniu latarki i lamp dzięki mgle i przezroczystości.
// Liczba zależy od jakości grafiki (low: wyłączone) i trybu spokojnego BagaBoo Games (wyłączone). Logika w core/dustlogic.js.
// ==========================================
import * as THREE from 'three';
import { scene, camera } from './engine.js';
import { SETTINGS, GAMES_CALM } from './settings.js';
import { DUST, dustCount, advance } from './dustlogic.js';

let pts = null, pos = null, count = 0, clock = 0;
const _c = new THREE.Vector3();
function softSprite() {
    const c = document.createElement('canvas'); c.width = c.height = 32;
    const x = c.getContext('2d'), g = x.createRadialGradient(16, 16, 0, 16, 16, 16);
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.fillRect(0, 0, 32, 32);
    return new THREE.CanvasTexture(c);
}
function build(n) {
    pos = new Float32Array(n * 3);
    camera.getWorldPosition(_c);
    for (let i = 0; i < n; i++) { pos[i * 3] = _c.x + (Math.random() * 2 - 1) * DUST.R; pos[i * 3 + 1] = _c.y - 1.2 + Math.random() * (DUST.H + 1.2); pos[i * 3 + 2] = _c.z + (Math.random() * 2 - 1) * DUST.R; }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const m = new THREE.PointsMaterial({ size: DUST.size, map: softSprite(), color: 0xd8cfc0, transparent: true, opacity: DUST.opacity, depthWrite: false, sizeAttenuation: true });
    pts = new THREE.Points(g, m); pts.frustumCulled = false; pts.renderOrder = 5; pts.name = 'dust';
    scene.add(pts); count = n;
}
export function disposeDust() {
    if (!pts) return;
    scene.remove(pts); pts.geometry.dispose(); if (pts.material.map) pts.material.map.dispose(); pts.material.dispose();
    pts = null; pos = null; count = 0;
}
export function updateDust(dt) {
    const n = dustCount(SETTINGS.quality, GAMES_CALM.on);
    if (n === 0) { if (pts) pts.visible = false; return; }
    if (!pts || count !== n) { disposeDust(); build(n); }
    pts.visible = true; clock += dt;
    camera.getWorldPosition(_c);
    for (let i = 0; i < count; i++) {
        const q = advance({ x: pos[i * 3], y: pos[i * 3 + 1], z: pos[i * 3 + 2] }, i, clock, dt, _c);
        pos[i * 3] = q.x; pos[i * 3 + 1] = q.y; pos[i * 3 + 2] = q.z;
    }
    pts.geometry.attributes.position.needsUpdate = true;
}
