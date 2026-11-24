// ==========================================
// Rekwizyty w poziomach (3D): jedna InstancedMesh na rodzaj, geometria z assets/props/props.glb (Blender: tools/blender/props.py), kolory z wierzchołków.
// Logika i rozmieszczenie: core/proplogic.js. Bez kolizji (dekoracja). Brak pliku albo błąd = poziom wygląda jak dotychczas. Plik pobieramy raz, a przy każdym
// poziomie parsujemy go od nowa (clearLevel zwalnia geometrię, więc współdzielony model by się zepsuł). Instancje nie mają wypalonego światła (aBake): w miejscach
// oświetlonych tylko wypalaniem są odrobinę ciemniejsze od bloków.
// ==========================================
import { THREE, L, scene } from './engine.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { SETTINGS, GAMES_CALM } from './settings.js';
import { PROPS, propSetFor, propsEnabled, propCount, placeProps } from './proplogic.js';

let buf = null;
export const propInfo = { placed: 0, kinds: 0, file: false };
async function fetchBuf() {
    if (buf) return buf;
    const bundled = typeof __BAGABOO_BUNDLED__ !== 'undefined' && __BAGABOO_BUNDLED__;
    for (const url of (bundled ? ['props/props.glb', 'assets/props/props.glb'] : ['assets/props/props.glb', 'props/props.glb'])) {
        try { const r = await fetch(url); if (r.ok) { buf = await r.arrayBuffer(); return buf; } } catch (e) { /* następny adres */ }
    }
    return null;
}
export async function addLevelProps(levelId) {
    propInfo.placed = 0; propInfo.kinds = 0;
    const set = propSetFor(levelId);
    if (!set || !propsEnabled(SETTINGS.quality, GAMES_CALM.on) || typeof fetch === 'undefined') return;
    const token = L.root, id = L.levelId, bx = L.obstacles.filter(b => b.box3).map(b => ({ minX: b.box3.min.x, maxX: b.box3.max.x, minY: b.box3.min.y, maxY: b.box3.max.y, minZ: b.box3.min.z, maxZ: b.box3.max.z }));
    const spots = placeProps({ seed: set.seed, count: propCount(set, SETTINGS.quality), area: L.bounds, floorY: L.floorY || 0, boxes: bx, spawn: L.spawn, reserved: L.reserved, portals: L.portals.filter(p => p.box3).map(p => ({ minX: p.box3.min.x, maxX: p.box3.max.x, minZ: p.box3.min.z, maxZ: p.box3.max.z })), kinds: set.kinds });
    if (!spots.length) return;
    const data = await fetchBuf(); propInfo.file = !!data; if (!data) return;
    let gltf; try { gltf = await new GLTFLoader().parseAsync(data.slice(0), ''); } catch (e) { return; }
    if (L.levelId !== id || L.root !== token) return;   // gracz zdążył przejść do innego poziomu
    const geos = {}; gltf.scene.traverse(o => { if (o.isMesh && o.geometry) geos[o.name] = o.geometry; });
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), p = new THREE.Vector3(), s = new THREE.Vector3(), c = new THREE.Color(), fy = L.floorY || 0;
    const by = {}; for (const sp of spots) (by[sp.name] = by[sp.name] || []).push(sp);
    for (const name of Object.keys(by)) {
        const geo = geos[PROPS[name].mesh]; if (!geo) continue;
        const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.86, metalness: 0.05, envMapIntensity: 0.5 });
        const im = new THREE.InstancedMesh(geo, mat, by[name].length);
        by[name].forEach((sp, i) => { e.set(0, sp.rotY, 0); q.setFromEuler(e); m4.compose(p.set(sp.x, fy, sp.z), q, s.setScalar(sp.scale)); im.setMatrixAt(i, m4); im.setColorAt(i, c.setScalar(sp.tint)); });
        im.castShadow = false; im.receiveShadow = true; im.frustumCulled = false; im.name = 'props_' + name; im.userData.noBake = true;
        L.root.add(im); propInfo.placed += by[name].length; propInfo.kinds++;
    }
}
