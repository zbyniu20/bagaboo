// ==========================================
// Decale (3D): wszystkie plamy poziomu w JEDNEJ siatce z atlasu tekstur (jedno wywołanie rysowania), krycie w kolorze wierzchołków (RGBA).
// Logika i zestawy: core/decallogic.js (wg rodziny kolorystycznej), rozmieszczanie: core/spotlogic.js. Bez kolizji, tylko wizualne i lokalne.
// Przezroczyste z polygonOffset, przesunięte o 2 cm od ściany; nie zapisują głębi. Wołane z main.js po zbudowaniu poziomu; tryb spokojny podaje main.js jawnie.
// ==========================================
import { THREE, L, tex } from './engine.js';
import { SETTINGS } from './settings.js';
import { familyName } from './artlogic.js';
import { decalSet, decalEnabled, decalCount, placeDecals, cellUV } from './decallogic.js';

export const decalInfo = { count: 0 };
export function addLevelDecals(levelId, kind, calm) {
    decalInfo.count = 0;
    const set = decalSet(levelId, familyName(levelId), kind);
    if (!set || !decalEnabled(SETTINGS.quality, !!calm)) return null;
    const bx = L.obstacles.filter(b => b.box3).map(b => ({ minX: b.box3.min.x, maxX: b.box3.max.x, minY: b.box3.min.y, maxY: b.box3.max.y, minZ: b.box3.min.z, maxZ: b.box3.max.z }));
    const spots = placeDecals({ seed: set.seed, count: decalCount(set, SETTINGS.quality), area: L.bounds, floorY: L.floorY || 0, boxes: bx, spawn: L.spawn, reserved: L.reserved, portals: L.portals.filter(p => p.box3).map(p => ({ minX: p.box3.min.x, maxX: p.box3.max.x, minZ: p.box3.min.z, maxZ: p.box3.max.z })), kinds: set.kinds });
    if (!spots.length) return null;
    const pos = [], uv = [], col = [], idx = [];
    for (const d of spots) {
        const q = cellUV(d.cell), b = pos.length / 3, hw = d.w / 2, hh = d.h / 2;
        let c;
        if (d.on === 'wall') c = [[-hw, -hh], [hw, -hh], [hw, hh], [-hw, hh]].map(([a, v]) => [d.x + d.tx * a, d.y + v, d.z + d.tz * a]);
        else { const cs = Math.cos(d.rot), sn = Math.sin(d.rot); c = [[-hw, -hh], [hw, -hh], [hw, hh], [-hw, hh]].map(([a, v]) => [d.x + a * cs - v * sn, d.y, d.z + a * sn + v * cs]); }
        for (const p of c) { pos.push(p[0], p[1], p[2]); col.push(1, 1, 1, d.alpha); }
        uv.push(q.u0, q.v0, q.u1, q.v0, q.u1, q.v1, q.u0, q.v1);
        idx.push(b, b + 1, b + 2, b, b + 2, b + 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 4)); g.setIndex(idx);
    g.computeVertexNormals();
    const mat = new THREE.MeshStandardMaterial({ map: tex.decals, vertexColors: true, transparent: true, depthWrite: false, side: THREE.DoubleSide, forceSinglePass: true, roughness: 0.9, metalness: 0, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, envMapIntensity: 0.3 });
    const m = new THREE.Mesh(g, mat); m.frustumCulled = false; m.renderOrder = 2; m.name = 'levelDecals'; m.userData.noBake = true;
    L.root.add(m); decalInfo.count = spots.length;
    return m;
}
