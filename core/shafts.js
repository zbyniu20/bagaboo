// ==========================================
// Snopy światła pod stałymi lampami: jedna scalona siatka stożków (addytywne, bez zapisu głębi), jedno wywołanie rysowania.
// Brzegi są miękkie (przezroczystość zależy od kąta patrzenia, Fresnel), przy podstawie lampy jasno, przy podłodze gaśnie. Gasną razem ze światłami (BAKE_U).
// Wyłączone na jakości Low i w BagaBoo Games (tryb spokojny podaje main.js jawnie, bo GAMES_CALM.on jest ustawiane dopiero po budowie). Wołane z main.js po zbudowaniu poziomu (przed pulą świateł). Logika: core/shaftlogic.js.
// ==========================================
import * as THREE from 'three';
import { L, BAKE_U } from './engine.js';
import { SETTINGS } from './settings.js';
import { pickShafts, shaftsEnabled } from './shaftlogic.js';

export const shaftInfo = { count: 0 };
export function buildShafts(calm) {
    shaftInfo.count = 0;
    if (!shaftsEnabled(SETTINGS.quality, !!calm)) return null;
    const lights = [];
    L.root.traverse(o => { if (o.isPointLight && o.visible && o.intensity > 0 && !o.userData.pooled && !o.userData.noShaft) { const p = o.getWorldPosition(new THREE.Vector3()); lights.push({ x: p.x, y: p.y, z: p.z, intensity: o.intensity, color: o.color.getHex() }); } });
    const picks = pickShafts(lights, L.floorY || 0, 6);
    if (!picks.length) return null;
    const pos = [], col = [], uvs = [], idx = [], seg = 16;
    for (const s of picks) {
        const c = new THREE.Color(s.color).lerp(new THREE.Color(0xffffff), 0.5), base = pos.length / 3;
        for (let i = 0; i <= seg; i++) {
            const a = i / seg * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a);
            pos.push(s.x + ca * s.topR, s.y, s.z + sa * s.topR, s.x + ca * s.botR, s.y - s.length, s.z + sa * s.botR);
            col.push(c.r * s.opacity, c.g * s.opacity, c.b * s.opacity, c.r * s.opacity, c.g * s.opacity, c.b * s.opacity);
            uvs.push(i / seg, 0, i / seg, 1);
        }
        for (let i = 0; i < seg; i++) { const a = base + i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2)); g.setIndex(idx);
    const mat = new THREE.ShaderMaterial({
        transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, fog: false, uniforms: { uK: BAKE_U },
        vertexShader: 'attribute vec3 color; varying vec3 vC; varying vec3 vN; varying vec3 vV; varying float vT;\nvoid main(){ vC = color; vT = uv.y; vec4 wp = modelMatrix * vec4(position, 1.0); vN = normalize(mat3(modelMatrix) * normalize(vec3(position.x, 0.0, position.z)) ); vV = normalize(cameraPosition - wp.xyz); gl_Position = projectionMatrix * viewMatrix * wp; }',
        fragmentShader: 'uniform float uK; varying vec3 vC; varying vec3 vN; varying vec3 vV; varying float vT;\nvoid main(){ float f = abs(dot(normalize(vN), normalize(vV))); float edge = pow(f, 1.6); float fade = pow(1.0 - vT, 1.4); gl_FragColor = vec4(vC * edge * fade * uK, 1.0); }',
    });
    mat.name = 'lampShafts';
    const mesh = new THREE.Mesh(g, mat); mesh.frustumCulled = false; mesh.renderOrder = 4; mesh.name = 'lampShafts'; mesh.userData.noBake = true;
    L.root.add(mesh); shaftInfo.count = picks.length;
    return mesh;
}
