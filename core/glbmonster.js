// ==========================================
// MODELE POTWORÓW Z PLIKÓW GLB (3D). Logika w core/glblogic.js.
// loadGlbMonster(name) -> Promise<{ group, update(dt, speed, chasing), dispose() } | null>. Brak pliku, zbyt duży plik albo błąd = null (poziom zostaje
// przy proceduralnym manekinie). Model jest ustawiany na podłodze (min y = 0), wyśrodkowany i przeskalowany do docelowej wysokości; patrzy w +Z.
// ==========================================
import { THREE, scene } from './engine.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';   // modele z meshopt (mniejsze pliki)
import { MONSTERS, candidateUrls, pickClip, stateRole, fitScale, withinBudget } from './glblogic.js';

const bufCache = Object.create(null);   // plik pobieramy raz na rodzaj, a kopii modelu może być wiele (żłobek, szpital)
export async function loadGlbMonster(name) {
    const cfg = MONSTERS[name]; if (!cfg || typeof fetch === 'undefined') return null;
    let buf = bufCache[name] || null;
    if (!buf) for (const url of candidateUrls(cfg.file)) {
        try { const r = await fetch(url); if (r.ok && /octet|gltf|binary|model/i.test((r.headers.get('content-type') || 'application/octet-stream'))) { buf = await r.arrayBuffer(); break; } } catch (e) {}
    }
    if (!buf) return null;
    bufCache[name] = buf;
    let gltf;
    try { const loader = new GLTFLoader(); loader.setMeshoptDecoder(MeshoptDecoder); gltf = await loader.parseAsync(buf, ''); } catch (e) { return null; }
    let tris = 0; gltf.scene.traverse(o => { if (o.isMesh && o.geometry) tris += (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3; });
    if (!withinBudget(buf.byteLength, tris)) return null;
    const inner = gltf.scene, box = new THREE.Box3().setFromObject(inner), size = box.getSize(new THREE.Vector3()), k = fitScale(size.y, cfg.height), c = box.getCenter(new THREE.Vector3());
    inner.scale.multiplyScalar(k); inner.position.set(-c.x * k, -box.min.y * k, -c.z * k); inner.rotation.y = cfg.yaw;
    const group = new THREE.Group(); group.add(inner);
    inner.traverse(o => { if (o.isMesh) { o.castShadow = true; o.frustumCulled = false; if (o.material) o.material.envMapIntensity = Math.max(o.material.envMapIntensity || 0, 0.6); } });
    const clips = gltf.animations || [], names = clips.map(a => a.name), mixer = clips.length ? new THREE.AnimationMixer(inner) : null, acts = {}; let cur = null;
    const play = (role) => {
        if (!mixer) return;
        const n = pickClip(names, role), a = n && (acts[n] || (acts[n] = mixer.clipAction(clips[names.indexOf(n)])));
        if (!a || a === cur) return;
        a.reset().fadeIn(0.25).play(); if (cur) cur.fadeOut(0.25); cur = a;
    };
    play('idle');
    return {
        group: group, clips: names, tris: tris,
        update(dt, speed, chasing) { if (!mixer) return; play(stateRole(speed, chasing)); mixer.update(dt); },
        // szkielet trzyma teksturę kości: bez skeleton.dispose() każde wejście do poziomu zostawiało ją w pamięci GPU
        dispose() { if (mixer) { mixer.stopAllAction(); mixer.uncacheRoot(inner); } inner.traverse(o => { if (o.isSkinnedMesh && o.skeleton) o.skeleton.dispose(); if (o.isMesh) { if (o.geometry) o.geometry.dispose(); const m = o.material; for (const mm of Array.isArray(m) ? m : [m]) if (mm) { for (const k2 in mm) if (mm[k2] && mm[k2].isTexture) mm[k2].dispose(); mm.dispose(); } } }); }
    };
}

// ---- Podmiana manekina modelem z pliku: swapModel(m, rodzaj) po buildMannequin; poziom nie zmienia reszty kodu ----
const live = [], _p = new THREE.Vector3();
const attached = (o) => { for (let p = o; p; p = p.parent) if (p === scene) return true; return false; };
const shown = (o) => { for (let p = o; p; p = p.parent) if (!p.visible) return false; return true; };
export function swapModel(m, kind) {
    if (!m || !m.group) return;
    loadGlbMonster(kind).then((g) => {
        if (!g) return;
        if (!attached(m.group)) { g.dispose(); return; }   // poziom zdążył się zmienić podczas ładowania
        for (const c of m.group.children) c.visible = false;   // manekin zostaje jako zapas (brak pliku = nic się nie zmienia)
        const sc = m.group.scale; g.group.scale.set(1 / (sc.x || 1), 1 / (sc.y || 1), 1 / (sc.z || 1));   // poziom skalował manekina po swojemu: model ma swój rozmiar
        m.group.add(g.group); m.glb = g;
        live.push({ g: g, host: m.group, last: new THREE.Vector3(), speed: 0, init: false });
    });
}
// Co klatkę z main.js: prędkość liczona z przesunięcia (klip idle, walk albo run), sprzątanie po zmianie poziomu
export function updateGlbMonsters(dt) {
    for (let i = live.length - 1; i >= 0; i--) {
        const e = live[i];
        if (!attached(e.host)) { e.g.dispose(); live.splice(i, 1); continue; }
        e.host.getWorldPosition(_p);
        if (e.init) { const sp = Math.min(12, Math.hypot(_p.x - e.last.x, _p.z - e.last.z) / Math.max(dt, 1e-3)); e.speed += (sp - e.speed) * Math.min(1, dt * 6); }
        e.last.copy(_p); e.init = true;
        if (shown(e.host)) e.g.update(dt, e.speed, e.speed > 3.2);
    }
}
export const glbMonstersLive = () => live.length;
