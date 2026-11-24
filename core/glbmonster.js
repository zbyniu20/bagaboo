// ==========================================
// MODELE POTWORÓW Z PLIKÓW GLB (3D). Logika w core/glblogic.js.
// loadGlbMonster(name) -> Promise<{ group, update(dt, speed, chasing), dispose() } | null>. Brak pliku, zbyt duży plik albo błąd = null (poziom zostaje
// przy proceduralnym manekinie). Model jest ustawiany na podłodze (min y = 0), wyśrodkowany i przeskalowany do docelowej wysokości; patrzy w +Z.
// ==========================================
import { THREE, scene, tex, camera } from './engine.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';   // modele z meshopt (mniejsze pliki)
import { MONSTERS, candidateUrls, pickClip, stateRole, fitScale, withinBudget, SHOTS, SHOT_RULES, newShotState, shotStep, hasClip, clipFor } from './glblogic.js';


// Relief skóry: modele z Blendera nie mają UV (modyfikator Skin), więc zamiast mapy normalnych materiał dostaje w shaderze szum 3D z POZYCJI W POZIE BAZOWEJ (atrybut `position`,
// przed skinningiem), dzięki czemu pory i zmarszczki przylegają do skóry podczas animacji. Normalna jest zaburzana z pochodnych ekranowych (jak bump map w three.js).
// Oczy (materiał z 'eye' w nazwie) zostają gładkie. Jeden stały klucz programu: wszystkie potwory dzielą shader.
const SKIN = { strength: 0.02 };
const SKIN_GLSL = 'float skHash(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }\nfloat skNoise(vec3 x){ vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f); return mix(mix(mix(skHash(i), skHash(i + vec3(1,0,0)), f.x), mix(skHash(i + vec3(0,1,0)), skHash(i + vec3(1,1,0)), f.x), f.y), mix(mix(skHash(i + vec3(0,0,1)), skHash(i + vec3(1,0,1)), f.x), mix(skHash(i + vec3(0,1,1)), skHash(i + vec3(1,1,1)), f.x), f.y), f.z); }\nfloat skinH(vec3 p){ return 0.55 * skNoise(p * 34.0) + 0.45 * skNoise(p * 10.0 + 7.3); }\n';
export function skinBump(mat) {
    if (!mat || mat.userData.skinBump || /eye/i.test(mat.name || '')) return;
    mat.userData.skinBump = true;
    mat.onBeforeCompile = (sh) => {
        sh.uniforms.uSkin = { value: SKIN.strength };
        sh.vertexShader = 'varying vec3 vSkinP;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvSkinP = position;');
        sh.fragmentShader = 'uniform float uSkin; varying vec3 vSkinP;\n' + SKIN_GLSL + sh.fragmentShader.replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
            { float sh0 = skinH(vSkinP); vec3 sx = dFdx(-vViewPosition), sy = dFdy(-vViewPosition); float bx = dFdx(sh0), by = dFdy(sh0); vec3 r1 = cross(sy, normal), r2 = cross(normal, sx); float det = dot(sx, r1) * faceDirection; vec3 gr = sign(det) * (bx * r1 + by * r2); normal = normalize(abs(det) * normal - uSkin * gr); }`);
    };
    mat.customProgramCacheKey = () => 'monsterSkin';
    mat.needsUpdate = true;
}

const _cp = new THREE.Vector3(), _pq = new THREE.Quaternion(), _wq = new THREE.Quaternion(), _yq = new THREE.Quaternion(), _up = new THREE.Vector3(0, 1, 0);
const bufCache = Object.create(null);   // plik pobieramy raz na rodzaj, a kopii modelu może być wiele (żłobek, szpital)
export async function loadGlbMonster(name, opts) {
    const cfg = MONSTERS[name]; if (!cfg || typeof fetch === 'undefined') return null; opts = opts || {};
    let buf = bufCache[name] || null;
    if (!buf) for (const url of candidateUrls(cfg.file, typeof __BAGABOO_BUNDLED__ !== 'undefined' && __BAGABOO_BUNDLED__)) {
        try { const r = await fetch(url); if (r.ok && /octet|gltf|binary|model/i.test((r.headers.get('content-type') || 'application/octet-stream'))) { buf = await r.arrayBuffer(); break; } } catch (e) {}
    }
    if (!buf) return null;
    bufCache[name] = buf;
    let gltf;
    try { const loader = new GLTFLoader(); loader.setMeshoptDecoder(MeshoptDecoder); gltf = await loader.parseAsync(buf, ''); } catch (e) { return null; }
    let tris = 0; gltf.scene.traverse(o => { if (o.isMesh && o.geometry) tris += (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3; });
    if (!withinBudget(buf.byteLength, tris)) return null;
    const inner = gltf.scene, box = new THREE.Box3().setFromObject(inner), size = box.getSize(new THREE.Vector3()), k = fitScale(size.y, opts.height || cfg.height), c = box.getCenter(new THREE.Vector3());
    inner.scale.multiplyScalar(k); inner.position.set(-c.x * k, -box.min.y * k, -c.z * k); inner.rotation.y = cfg.yaw;
    const group = new THREE.Group(); group.add(inner);
    inner.traverse(o => { if (o.isMesh) { o.castShadow = true; o.frustumCulled = false; if (o.material) { o.material.envMapIntensity = Math.max(o.material.envMapIntensity || 0, 0.6); if (!Array.isArray(o.material)) skinBump(o.material); } } });
    const clips = gltf.animations || [], names = clips.map(a => a.name), mixer = clips.length ? new THREE.AnimationMixer(inner) : null, acts = {}; let cur = null;
    const play = (role) => {
        if (!mixer) return;
        const shot = !!SHOTS[role], n = shot ? clipFor(names, role) : pickClip(names, role), a = n && (acts[n] || (acts[n] = mixer.clipAction(clips[names.indexOf(n)])));
        if (!a || (a === cur && !(shot && !a.isRunning()))) return;
        if (shot) { a.setLoop(THREE.LoopOnce, 1); a.clampWhenFinished = true; } else a.setLoop(THREE.LoopRepeat, Infinity);
        a.reset().fadeIn(0.25).play(); if (cur && cur !== a) cur.fadeOut(0.25); cur = a;
    };
    play('idle');
    // Głowa (kość 'head') i poświata oczu: oczy modelu to osobny materiał z 'eye' w nazwie; środki jego wierzchołków (osobno lewy i prawy) dają miejsce świecących sprite'ów,
    // przyczepionych do kości głowy, więc w ciemności potwór ma ten sam żarzący się wzrok co dawny manekin.
    const headBone = inner.getObjectByName('head') || null, baseQ = headBone ? headBone.quaternion.clone() : null, glows = [];
    group.updateMatrixWorld(true);
    if (headBone && tex && tex.dot) {
        const hs = headBone.getWorldScale(new THREE.Vector3()).x || 1;
        inner.traverse((o) => {
            if (!o.isMesh || !o.material || !/eye/i.test(o.material.name || '') || !o.geometry.attributes.position) return;
            const P = o.geometry.attributes.position, sum = [new THREE.Vector3(), new THREE.Vector3()], cnt = [0, 0], v = new THREE.Vector3();
            for (let i = 0; i < P.count; i++) { v.fromBufferAttribute(P, i).applyMatrix4(o.matrixWorld); const side = v.x < 0 ? 0 : 1; sum[side].add(v); cnt[side]++; }
            const col = o.material.emissive && o.material.emissive.getHex() ? o.material.emissive.getHex() : 0xff2000;
            for (let side = 0; side < 2; side++) {
                if (!cnt[side]) continue; const w = sum[side].multiplyScalar(1 / cnt[side]), sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex.dot, color: col, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
                sp.position.copy(headBone.worldToLocal(w)); sp.scale.setScalar(0.1 / hs); headBone.add(sp); glows.push(sp);
            }
        });
    }
    return {
        group: group, clips: names, tris: tris, headBone: headBone, shots: { attack: hasClip(names, 'attack'), scream: hasClip(names, 'scream'), listen: hasClip(names, 'listen') },
        // yaw: obrót głowy (rad) z kodu poziomu, który kiedyś kręcił głową manekina (np. labirynt); nakładany po animacji
        update(dt, speed, chasing, yaw, shot) {
            if (mixer) { play(shot || stateRole(speed, chasing)); mixer.update(dt); }
            if (headBone && yaw) {   // obrót wokół osi PIONOWEJ świata (oś kości bywa przechylona), po animacji
                if (!mixer) headBone.quaternion.copy(baseQ);
                headBone.parent.updateWorldMatrix(true, false); headBone.parent.getWorldQuaternion(_pq);
                _wq.copy(_pq).multiply(headBone.quaternion); _yq.setFromAxisAngle(_up, yaw); _wq.premultiply(_yq); headBone.quaternion.copy(_pq.invert().multiply(_wq));
            }
        },
        // szkielet trzyma teksturę kości: bez skeleton.dispose() każde wejście do poziomu zostawiało ją w pamięci GPU
        dispose() { for (const sp of glows) { if (sp.parent) sp.parent.remove(sp); sp.material.dispose(); } if (mixer) { mixer.stopAllAction(); mixer.uncacheRoot(inner); } inner.traverse(o => { if (o.isSkinnedMesh && o.skeleton) o.skeleton.dispose(); if (o.isMesh) { if (o.geometry) o.geometry.dispose(); const m = o.material; for (const mm of Array.isArray(m) ? m : [m]) if (mm) { for (const k2 in mm) if (mm[k2] && mm[k2].isTexture) mm[k2].dispose(); mm.dispose(); } } }); }
    };
}

// ---- Podmiana manekina modelem z pliku: swapModel(m, rodzaj) po buildMannequin; poziom nie zmienia reszty kodu ----
const live = [], _p = new THREE.Vector3();
const attached = (o) => { for (let p = o; p; p = p.parent) if (p === scene) return true; return false; };
const shown = (o) => { for (let p = o; p; p = p.parent) if (!p.visible) return false; return true; };
// swapRoot(root, rodzaj, opts): podmienia wygląd istniejącego korzenia potwora (grupy, którą poziom przesuwa i obraca). Chowa tylko siatki i sprite'y (światła i ich rodzice zostają),
// więc stary model zostaje jako zapas (brak pliku = nic się nie zmienia). opts: height (m), head (obiekt, którego rotation.y kręci głową modelu), keep (obiekty do pozostawienia, np. aura),
// onLoad(g). Model dostaje skalę odwrotną do skali korzenia, więc ma swój rozmiar.
export function swapRoot(root, kind, opts) {
    opts = opts || {};
    if (!root) return;
    loadGlbMonster(kind, opts).then((g) => {
        if (!g) return;
        if (!attached(root)) { g.dispose(); return; }   // poziom zdążył się zmienić podczas ładowania
        const keep = new Set(opts.keep || []);
        root.traverse((o) => { if ((o.isMesh || o.isSprite || o.isLine || o.isPoints) && !keep.has(o) && !(o.parent && keep.has(o.parent))) o.visible = false; });
        const sc = root.scale; g.group.scale.set(1 / (sc.x || 1), 1 / (sc.y || 1), 1 / (sc.z || 1));
        root.add(g.group);
        live.push({ g: g, host: root, proxy: opts.head || null, last: new THREE.Vector3(), speed: 0, init: false, shot: newShotState() });
        if (opts.onLoad) opts.onLoad(g);
    });
}
// Manekin z buildMannequin: korzeń to m.group, a obrotem głowy steruje m.head
export function swapModel(m, kind, opts) {
    if (!m || !m.group) return;
    swapRoot(m.group, kind, Object.assign({ head: m.head, onLoad: (g) => { m.glb = g; } }, opts));
}
// Co klatkę z main.js: prędkość liczona z przesunięcia (klip idle, walk albo run), sprzątanie po zmianie poziomu
export function updateGlbMonsters(dt) {
    for (let i = live.length - 1; i >= 0; i--) {
        const e = live[i];
        if (!attached(e.host)) { e.g.dispose(); live.splice(i, 1); continue; }
        e.host.getWorldPosition(_p);
        let jumped = false;
        if (e.init) { const d = Math.hypot(_p.x - e.last.x, _p.z - e.last.z); jumped = d > SHOT_RULES.jump; const sp = jumped ? 0 : Math.min(12, d / Math.max(dt, 1e-3)); e.speed += (sp - e.speed) * Math.min(1, dt * 6); if (jumped) e.speed = 0; }   // przeskok pozycji (odrodzenie, reset po złapaniu) to nie sprint
        e.last.copy(_p); e.init = true;
        if (shown(e.host)) { camera.getWorldPosition(_cp); const shot = shotStep(e.shot, dt, e.speed, Math.hypot(_p.x - _cp.x, _p.z - _cp.z), jumped, e.g.shots); e.g.update(dt, e.speed, e.speed > 3.2, e.proxy ? e.proxy.rotation.y : 0, shot); }
    }
}
export const glbMonstersLive = () => live.length;
