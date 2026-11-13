// ==========================================
// GRAFIKA: warstwa wyłącznie wizualna (nie zmienia rozgrywki, fizyki, kolizji ani dźwięku)
// - mapa otoczenia (odbicia) generowana z kolorów presetu poziomu, zamiast neutralnego "pokoju"
// - szczegół powierzchni w shaderze: brud, zmienna szorstkość, przyciemnienie przy podłodze (udawane AO)
// - obwódka Fresnela (rim light) na dłoniach i przedmiotach do chwytania, z lekkim pulsowaniem
// - poświaty wokół lamp (udawany bloom bez post-processingu) i delikatne stożki światła
// - cząsteczki wokół gracza (kurz, iskry, para) i mgła przy podłodze
// - drobny gruz na podłodze jako InstancedMesh (jedno wywołanie rysowania)
// Wszystko zależy od jakości grafiki: Low wyłącza najdroższe efekty, żeby gogle trzymały 72/90 kl./s.
// ==========================================
import { THREE, scene, camera, renderer, L, tex } from './engine.js';
import { SETTINGS } from './settings.js';

const Q = SETTINGS.quality === 'low' ? 0 : (SETTINGS.quality === 'high' ? 2 : 1);   // 0 low, 1 medium, 2 high
const shared = { uTime: { value: 0 } };
const pmrem = new THREE.PMREMGenerator(renderer);
let envRT = null, fx = null;

// Charakter każdego presetu: cząsteczki, mgła przy podłodze, kolor obwódki
const MOOD = {
    dusk: { motes: 'dust', moteCol: 0xffc49a, mist: 0.10, mistCol: 0xa898a8 },
    overcast: { motes: 'dust', moteCol: 0xe8e8e8, mist: 0.08, mistCol: 0xd0d6da },
    night: { motes: 'dust', moteCol: 0x9a948c, mist: 0.16, mistCol: 0x3a2a30 },
    lava: { motes: 'embers', moteCol: 0xff8a30, mist: 0.07, mistCol: 0x7a2a10 },
    laundry: { motes: 'steam', moteCol: 0xf0f4f8, mist: 0.22, mistCol: 0xc8ccd0 },
    station: { motes: 'dust', moteCol: 0xc8d0e0, mist: 0.08, mistCol: 0x404858 },
    levels: { motes: 'embers', moteCol: 0xff6a3a, mist: 0.14, mistCol: 0x401010 },
    arcade: { motes: 'sparkle', moteCol: 0xc08aff, mist: 0.0, mistCol: 0x000000 },
    staff: { motes: 'dust', moteCol: 0xffe0b8, mist: 0.0, mistCol: 0x000000 }
};

// ---------- 1. MAPA OTOCZENIA Z KOLORÓW PRESETU ----------
// Mała scena: kopuła z gradientem (niebo / horyzont / ziemia) i jasne plamy w miejscu słońca i lamp.
// PMREMGenerator robi z niej mapę odbić, więc metal i lakier odbijają nastrój danego poziomu.
function buildEnvironment(P) {
    const s = new THREE.Scene();
    const col = (hex, k) => new THREE.Color(hex).multiplyScalar(k);
    const top = col(P.hemiSky, 0.25 * P.hemiIntensity), hor = col(P.fogColor, 0.9), bot = col(P.hemiGround, 0.25 * P.hemiIntensity);
    const dome = new THREE.Mesh(new THREE.SphereGeometry(10, 32, 16), new THREE.ShaderMaterial({
        side: THREE.BackSide, depthWrite: false,
        uniforms: { top: { value: top }, hor: { value: hor }, bot: { value: bot } },
        vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
        fragmentShader: 'uniform vec3 top; uniform vec3 hor; uniform vec3 bot; varying vec3 vP; void main(){ float h = normalize(vP).y; vec3 c = h > 0.0 ? mix(hor, top, pow(h, 0.6)) : mix(hor, bot, pow(-h, 0.5)); gl_FragColor = vec4(c, 1.0); }'
    }));
    s.add(dome);
    const blob = (dir, color, k, r) => { const m = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 8), new THREE.MeshBasicMaterial({ color: col(color, k) })); m.position.copy(dir.normalize().multiplyScalar(8)); s.add(m); };
    if (P.sunIntensity > 0 && P.sunPos) blob(new THREE.Vector3().fromArray(P.sunPos), P.sunColor, P.sunIntensity * 1.5, 1.1);
    for (const b of (P.bulbs || [])) blob(new THREE.Vector3(b[0], Math.max(1, b[1]), b[2]), b[3], 0.25, 0.5);
    for (const f of (P.flickers || [])) blob(new THREE.Vector3(f[0], Math.max(1, f[1]), f[2]), f[3], 0.2, 0.45);
    const rt = pmrem.fromScene(s, 0.04);
    s.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });
    return rt;
}

// ---------- 2. SZCZEGÓŁ POWIERZCHNI (shader) ----------
// Szum w przestrzeni świata: przybrudzenia koloru i zmienna szorstkość (bez dodatkowych tekstur),
// do tego ciemniejszy pas tuż przy podłodze, jakby kurz i cień zbierały się w rogach (udawane AO).
const DETAIL_GLSL = `
varying vec3 vBBWorld;
float bbHash(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float bbNoise(vec3 x){ vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(bbHash(i), bbHash(i + vec3(1,0,0)), f.x), mix(bbHash(i + vec3(0,1,0)), bbHash(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(bbHash(i + vec3(0,0,1)), bbHash(i + vec3(1,0,1)), f.x), mix(bbHash(i + vec3(0,1,1)), bbHash(i + vec3(1,1,1)), f.x), f.y), f.z); }
`;
function addDetail(mat) {
    if (!mat || !mat.isMeshStandardMaterial || mat.userData.bbDetail || mat.transparent) return;
    mat.userData.bbDetail = true;
    const prev = mat.onBeforeCompile;
    mat.onBeforeCompile = (sh, r) => {
        if (prev) prev(sh, r);
        sh.vertexShader = 'varying vec3 vBBWorld;\n' + sh.vertexShader.replace('#include <project_vertex>', `#include <project_vertex>
            vec4 bbW = vec4(transformed, 1.0);
            #ifdef USE_INSTANCING
            bbW = instanceMatrix * bbW;
            #endif
            vBBWorld = (modelMatrix * bbW).xyz;`);
        sh.fragmentShader = (Q === 2 ? '#define BB_OCT2\n' : '') + DETAIL_GLSL + sh.fragmentShader
            .replace('#include <color_fragment>', `#include <color_fragment>
            #ifdef BB_OCT2
            float bbN = bbNoise(vBBWorld * 1.7) * 0.6 + bbNoise(vBBWorld * 6.3) * 0.4;   // High: dwie warstwy szumu
            #else
            float bbN = bbNoise(vBBWorld * 2.3);                                          // Medium: jedna warstwa (taniej)
            #endif
            diffuseColor.rgb *= mix(0.82, 1.06, bbN);                                          // plamy brudu
            diffuseColor.rgb *= mix(0.6, 1.0, smoothstep(0.0, 0.85, vBBWorld.y));               // ciemniej przy podłodze`)
            .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
            roughnessFactor = clamp(roughnessFactor + (bbN - 0.5) * 0.3, 0.04, 1.0);            // tłuste i matowe miejsca`);
    };
    const key = mat.customProgramCacheKey ? mat.customProgramCacheKey.bind(mat) : null;
    mat.customProgramCacheKey = () => 'bbDetail|' + (key ? key() : '');
    mat.needsUpdate = true;
}

// ---------- 3. OBWÓDKA FRESNELA (rim light) ----------
// Krawędzie obiektu świecą delikatnie pod kątem do kamery. Dłonie i rzeczy do chwytania dzięki temu
// odcinają się od tła nawet w ciemnych poziomach. Lekkie pulsowanie podpowiada "to można złapać".
export function rimify(obj, color, strength, pulse) {
    obj.traverse(o => {
        const mats = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : [];
        for (const m of mats) {
            if (!m.isMeshStandardMaterial || m.userData.bbRim) continue;
            m.userData.bbRim = true;
            const prev = m.onBeforeCompile, c = new THREE.Color(color), s = strength || 0.6, pu = pulse || 0;
            m.onBeforeCompile = (sh, r) => {
                if (prev) prev(sh, r);
                sh.uniforms.uBBTime = shared.uTime; sh.uniforms.uRimCol = { value: c };
                sh.fragmentShader = 'uniform float uBBTime; uniform vec3 uRimCol;\n' + sh.fragmentShader.replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
                float bbF = pow(1.0 - clamp(abs(dot(normalize(normal), normalize(vViewPosition))), 0.0, 1.0), 3.0);
                totalEmissiveRadiance += uRimCol * bbF * ${s.toFixed(3)} * (1.0 + ${pu.toFixed(3)} * sin(uBBTime * 3.0));`);
            };
            const key = m.customProgramCacheKey ? m.customProgramCacheKey.bind(m) : null;
            m.customProgramCacheKey = () => 'bbRim' + s + pu + '|' + (key ? key() : '');
            m.needsUpdate = true;
        }
    });
}

// ---------- 4. POŚWIATY LAMP I STOŻKI ŚWIATŁA ----------
let haloTex = null, beamTex = null;
function makeHaloTex() {
    const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d');
    const g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.18, 'rgba(255,255,255,0.55)'); g.addColorStop(0.5, 'rgba(255,255,255,0.12)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.fillRect(0, 0, 128, 128);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function makeBeamTex() {
    const c = document.createElement('canvas'); c.width = 8; c.height = 128; const x = c.getContext('2d');
    const g = x.createLinearGradient(0, 0, 0, 128); g.addColorStop(0, 'rgba(255,255,255,0.0)'); g.addColorStop(0.1, 'rgba(255,255,255,0.5)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.fillRect(0, 0, 8, 128);
    return new THREE.CanvasTexture(c);
}
function addHalos() {
    haloTex = haloTex || makeHaloTex(); beamTex = beamTex || makeBeamTex();
    const lights = []; L.root.traverse(o => { if (o.isPointLight && o.visible) lights.push(o); });
    const halos = [];
    lights.slice(0, Q === 2 ? 28 : 16).forEach((l, i) => {
        const wp = new THREE.Vector3(); l.getWorldPosition(wp);
        const size = Math.min(3.2, 0.5 + Math.sqrt(Math.max(0.5, l.intensity)) * 0.28);
        const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: haloTex, color: l.color, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false, fog: true }));
        sp.scale.set(size, size, 1); sp.position.copy(wp); L.root.add(sp);
        let beam = null;
        // Delikatny stożek światła pod wysoko wiszącymi lampami (udawane promienie w kurzu/parze)
        if (Q === 2 && wp.y > 3 && i < 10) {
            const h = Math.min(wp.y, 7);
            beam = new THREE.Mesh(new THREE.ConeGeometry(h * 0.45, h, 20, 1, true), new THREE.MeshBasicMaterial({ map: beamTex, color: l.color, transparent: true, opacity: 0.07, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: true }));
            beam.position.set(wp.x, wp.y - h / 2, wp.z); L.root.add(beam);
        }
        halos.push({ l: l, sp: sp, beam: beam, base: Math.max(0.001, l.intensity) });
    });
    return halos;
}

// ---------- 5. CZĄSTECZKI WOKÓŁ GRACZA I MGŁA PRZY PODŁODZE ----------
function buildMotes(mood) {
    const n = [180, 420, 700][Q], pos = new Float32Array(n * 3), vel = new Float32Array(n * 3), R = 7;
    for (let i = 0; i < n; i++) {
        pos[i * 3] = (Math.random() * 2 - 1) * R; pos[i * 3 + 1] = Math.random() * 6; pos[i * 3 + 2] = (Math.random() * 2 - 1) * R;
        const up = mood.motes === 'embers' ? 0.5 + Math.random() * 0.6 : (mood.motes === 'steam' ? 0.25 + Math.random() * 0.2 : (Math.random() - 0.5) * 0.06);
        vel[i * 3] = (Math.random() - 0.5) * 0.12; vel[i * 3 + 1] = up; vel[i * 3 + 2] = (Math.random() - 0.5) * 0.12;
    }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const size = mood.motes === 'steam' ? 0.22 : (mood.motes === 'embers' ? 0.05 : 0.03);
    const pts = new THREE.Points(geo, new THREE.PointsMaterial({ map: tex.dot, color: mood.moteCol, size: size, transparent: true, opacity: mood.motes === 'steam' ? 0.18 : 0.7, depthWrite: false, blending: mood.motes === 'steam' ? THREE.NormalBlending : THREE.AdditiveBlending, fog: true }));
    pts.frustumCulled = false; scene.add(pts);
    return { pts: pts, pos: pos, vel: vel, n: n, R: R, center: new THREE.Vector3() };
}
function mistTexture() {
    const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d');
    x.clearRect(0, 0, 256, 256);
    for (let i = 0; i < 60; i++) { const px = Math.random() * 256, py = Math.random() * 256, r = 20 + Math.random() * 60; const g = x.createRadialGradient(px, py, 0, px, py, r); g.addColorStop(0, 'rgba(255,255,255,0.35)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; for (const ox of [-256, 0, 256]) for (const oy of [-256, 0, 256]) { x.save(); x.translate(ox, oy); x.fillRect(px - r, py - r, r * 2, r * 2); x.restore(); } }
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}
let MIST_TEX = null;
function buildMist(mood) {
    if (Q === 0 || mood.mist <= 0) return null;
    MIST_TEX = MIST_TEX || mistTexture();
    const layers = [];
    for (const [y, rep, op] of [[0.12, 3, 1.0], [0.55, 2, 0.6]]) {
        const t = MIST_TEX.clone(); t.needsUpdate = true; t.repeat.set(rep, rep);
        const m = new THREE.Mesh(new THREE.PlaneGeometry(36, 36), new THREE.MeshBasicMaterial({ map: t, color: mood.mistCol, transparent: true, opacity: mood.mist * op, depthWrite: false, fog: true }));
        m.rotation.x = -Math.PI / 2; m.position.y = y; m.renderOrder = 5; scene.add(m);
        layers.push({ m: m, t: t, y: y, sp: 0.004 + y * 0.006 });
    }
    return layers;
}

// ---------- 6. DROBNY GRUZ NA PODŁODZE (InstancedMesh) ----------
function scatterDebris() {
    if (Q === 0) return null;
    const B = L.bounds, n = Q === 2 ? 260 : 140;
    const mesh = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ color: 0x5a524a, roughness: 0.95 }), n);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), p = new THREE.Vector3(), s = new THREE.Vector3(), probe = new THREE.Vector3();
    let k = 0;
    for (let tries = 0; tries < n * 4 && k < n; tries++) {
        const x = B.minX + Math.random() * (B.maxX - B.minX), z = B.minZ + Math.random() * (B.maxZ - B.minZ);
        probe.set(x, 0.05, z);
        if (L.obstacles.some(o => o.box3.containsPoint(probe))) continue;   // nie wewnątrz ścian i mebli
        const r = 0.02 + Math.random() * 0.05;
        e.set(Math.random() * 6, Math.random() * 6, Math.random() * 6); q.setFromEuler(e);
        m4.compose(p.set(x, r * 0.4, z), q, s.set(r, r * 0.6, r)); mesh.setMatrixAt(k++, m4);
    }
    mesh.count = k; mesh.receiveShadow = true; mesh.instanceMatrix.needsUpdate = true;
    L.root.add(mesh);   // należy do poziomu, czyści się razem z nim
    addDetail(mesh.material);
    return mesh;
}

// ---------- WYWOŁANIA Z main.js ----------
// Po zbudowaniu poziomu: odbicia, szczegół materiałów, obwódki, poświaty, cząsteczki, mgła, gruz
export function onLevelBuilt(presetName, P) {
    disposeFx();
    if (envRT) envRT.dispose();
    envRT = buildEnvironment(P); scene.environment = envRT.texture;
    const mood = MOOD[presetName] || MOOD.night;
    if (Q > 0) L.root.traverse(o => { if (o.isMesh && o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(addDetail); });
    for (const b of L.throwables) rimify(b, 0x9fe0ff, 0.9, 0.35);                                 // kule do rzucania
    for (const r of L.ropes) rimify(r.mesh, 0xffd090, 0.6, 0.35);                                  // liny
    fx = { mood: mood, halos: addHalos(), motes: buildMotes(mood), mist: buildMist(mood) };
    scatterDebris();
}
function disposeFx() {
    if (!fx) return;
    if (fx.motes) { scene.remove(fx.motes.pts); fx.motes.pts.geometry.dispose(); fx.motes.pts.material.dispose(); }
    if (fx.mist) for (const l of fx.mist) { scene.remove(l.m); l.m.geometry.dispose(); l.m.material.dispose(); l.t.dispose(); }
    fx = null;
}
const _cam = new THREE.Vector3();
export function updateVisuals(dt, t) {
    shared.uTime.value = t;
    if (!fx) return;
    camera.getWorldPosition(_cam);
    // Poświaty idą za jasnością lampy (migotanie, gaśnięcie)
    for (const h of fx.halos) {
        const k = Math.max(0, Math.min(1.5, h.l.intensity / h.base)) * (h.l.visible ? 1 : 0);
        h.sp.material.opacity = 0.35 * k; if (h.beam) h.beam.material.opacity = 0.07 * k;
    }
    // Cząsteczki krążą w sześcianie wokół gracza (zawijają się, więc zawsze są blisko)
    const M = fx.motes;
    if (M) {
        const c = M.center.copy(_cam), R = M.R;
        for (let i = 0; i < M.n; i++) {
            const j = i * 3;
            M.pos[j] += (M.vel[j] + Math.sin(t * 0.7 + i) * 0.03) * dt; M.pos[j + 1] += M.vel[j + 1] * dt; M.pos[j + 2] += (M.vel[j + 2] + Math.cos(t * 0.6 + i) * 0.03) * dt;
            let dx = M.pos[j] - c.x, dz = M.pos[j + 2] - c.z, dy = M.pos[j + 1] - c.y;
            if (dx > R) M.pos[j] -= 2 * R; else if (dx < -R) M.pos[j] += 2 * R;
            if (dz > R) M.pos[j + 2] -= 2 * R; else if (dz < -R) M.pos[j + 2] += 2 * R;
            if (dy > 4) M.pos[j + 1] -= 7; else if (dy < -3) M.pos[j + 1] += 7;
        }
        M.pts.geometry.attributes.position.needsUpdate = true;
    }
    // Mgła przy podłodze płynie powoli i podąża za graczem
    if (fx.mist) for (const l of fx.mist) { l.m.position.x = _cam.x; l.m.position.z = _cam.z; l.t.offset.set(t * l.sp + _cam.x / 12, t * l.sp * 0.7 - _cam.z / 12); }
}
