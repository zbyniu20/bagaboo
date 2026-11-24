// ==========================================
// Elementy architektury (3D): jedna InstancedMesh na rodzaj (listwa przypodłogowa, sufitowa, rura, korytko, kratka), geometria z assets/props/props.glb
// (meshe kit_*, Blender: tools/blender/props.py), kolory z wierzchołków. Logika i zestawy wg rodziny kolorystycznej: core/kitlogic.js. Bez kolizji. Brak pliku
// albo błąd = poziom wygląda jak dotąd. Instancje nie mają wypalonego światła (aBake), więc w miejscach oświetlonych tylko wypalaniem są odrobinę ciemniejsze od ścian.
// ==========================================
import { THREE, L } from './engine.js';
import { SETTINGS } from './settings.js';
import { familyName } from './artlogic.js';
import { levelGeometries } from './props.js';
import { KIT, kitSet, kitEnabled, kitMax, placeKit } from './kitlogic.js';

export const kitInfo = { placed: 0, kinds: 0 };
export async function addLevelKit(levelId, kind, calm) {
    kitInfo.placed = 0; kitInfo.kinds = 0;
    const set = kitSet(levelId, familyName(levelId), kind);
    if (!set || !kitEnabled(SETTINGS.quality, !!calm) || typeof fetch === 'undefined') return;
    const gen = L.gen || 0, bx = L.obstacles.filter(b => b.box3).map(b => ({ minX: b.box3.min.x, maxX: b.box3.max.x, minY: b.box3.min.y, maxY: b.box3.max.y, minZ: b.box3.min.z, maxZ: b.box3.max.z }));
    const spots = placeKit({ seed: set.seed, p: set.p, factor: set.factor, max: kitMax(SETTINGS.quality), area: L.bounds, floorY: L.floorY || 0, boxes: bx, spawn: L.spawn, reserved: L.reserved, portals: L.portals.filter(p => p.box3).map(p => ({ minX: p.box3.min.x, maxX: p.box3.max.x, minZ: p.box3.min.z, maxZ: p.box3.max.z })) });
    if (!spots.length) return;
    const geos = await levelGeometries(gen); if (!geos) return;
    if ((L.gen || 0) !== gen) return;   // gracz zdążył przejść do innego poziomu
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), p = new THREE.Vector3(), s = new THREE.Vector3(), c = new THREE.Color();
    const by = {}; for (const sp of spots) (by[sp.name] = by[sp.name] || []).push(sp);
    for (const name of Object.keys(by)) {
        const geo = geos[KIT[name].mesh]; if (!geo) continue;
        const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.82, metalness: 0.1, envMapIntensity: 0.4 });
        const im = new THREE.InstancedMesh(geo, mat, by[name].length);
        by[name].forEach((sp, i) => { e.set(0, sp.rotY, 0); q.setFromEuler(e); m4.compose(p.set(sp.x, sp.y, sp.z), q, s.set(sp.sx, 1, 1)); im.setMatrixAt(i, m4); im.setColorAt(i, c.setScalar(0.85 + ((i * 7) % 5) * 0.05)); });
        im.castShadow = false; im.receiveShadow = true; im.frustumCulled = false; im.name = 'kit_' + name; im.userData.noBake = true;
        L.root.add(im); kitInfo.placed += by[name].length; kitInfo.kinds++;
    }
}
