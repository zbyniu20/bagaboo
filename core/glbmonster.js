// ==========================================
// MODELE POTWORÓW Z PLIKÓW GLB (3D). Logika w core/glblogic.js.
// loadGlbMonster(name) -> Promise<{ group, update(dt, speed, chasing), dispose() } | null>. Brak pliku, zbyt duży plik albo błąd = null (poziom zostaje
// przy proceduralnym manekinie). Model jest ustawiany na podłodze (min y = 0), wyśrodkowany i przeskalowany do docelowej wysokości; patrzy w +Z.
// ==========================================
import { THREE } from './engine.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MONSTERS, candidateUrls, pickClip, stateRole, fitScale, withinBudget } from './glblogic.js';

export async function loadGlbMonster(name) {
    const cfg = MONSTERS[name]; if (!cfg || typeof fetch === 'undefined') return null;
    let buf = null;
    for (const url of candidateUrls(cfg.file)) {
        try { const r = await fetch(url); if (r.ok && /octet|gltf|binary|model/i.test((r.headers.get('content-type') || 'application/octet-stream'))) { buf = await r.arrayBuffer(); break; } } catch (e) {}
    }
    if (!buf) return null;
    let gltf;
    try { gltf = await new GLTFLoader().parseAsync(buf, ''); } catch (e) { return null; }
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
        dispose() { if (mixer) mixer.stopAllAction(); inner.traverse(o => { if (o.isMesh) { if (o.geometry) o.geometry.dispose(); const m = o.material; for (const mm of Array.isArray(m) ? m : [m]) if (mm) { for (const k2 in mm) if (mm[k2] && mm[k2].isTexture) mm[k2].dispose(); mm.dispose(); } } }); }
    };
}
