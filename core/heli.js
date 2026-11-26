// ==========================================
// SCARY GTA, ETAP 4 (3D): helikopter policji "Oko": model proceduralny (kadłub z kolorami w wierzchołkach, wirniki, płozy, światła pozycyjne), stożek reflektora i plama światła
// na ziemi (addytywne, bez prawdziwego światła: nowe światło w locie przekompilowałoby materiały), łopot wirnika z pozycją 3D (okluzja przez audio.js).
// Logika (stany, lot, widzenie) jest w czystym core/helilogic.js. Łopot jest wolniejszy niż 0,1 Hz w ruchu reflektora i nie migocze: bez stroba (komfort VR).
// ==========================================
import { THREE, L, tex } from './engine.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import * as SFX from './audio.js';
import { HELI } from './helilogic.js';

const paint = (g, r, gr, b) => { const n = g.attributes.position.count, a = new Float32Array(n * 3); for (let i = 0; i < n; i++) { a[i * 3] = r; a[i * 3 + 1] = gr; a[i * 3 + 2] = b; } g.setAttribute('color', new THREE.BufferAttribute(a, 3)); return g; };
export function createHeli() {
    const H = { geos: [], mats: [], disp: { x: 0, y: HELI.ALT, z: 0, yaw: 0, lx: 0, lz: 0 }, snd: null, t: 0, vis: false };
    const geo = (g) => { H.geos.push(g); return g; }, mat = (m) => { H.mats.push(m); return m; };
    const root = new THREE.Group(); root.visible = false; L.root.add(root); H.root = root;
    // kadłub (nos w stronę +Z)
    const body = new THREE.SphereGeometry(1, 14, 10); body.scale(1.15, 1.0, 2.1); paint(body, 0.1, 0.12, 0.18);
    const glass = new THREE.SphereGeometry(1, 12, 8); glass.scale(0.95, 0.7, 1.1); glass.translate(0, 0.28, 1.15); paint(glass, 0.05, 0.14, 0.3);
    const boom = new THREE.CylinderGeometry(0.2, 0.34, 4.6, 8); boom.rotateX(Math.PI / 2); boom.translate(0, 0.25, -3.6); paint(boom, 0.09, 0.1, 0.14);
    const fin = new THREE.BoxGeometry(0.1, 1.2, 0.9); fin.translate(0, 0.9, -5.7); paint(fin, 0.12, 0.13, 0.18);
    const parts = [body, glass, boom, fin];
    for (const sx of [-1, 1]) { const sk = new THREE.BoxGeometry(0.08, 0.08, 3.0); sk.translate(sx * 1.0, -1.25, 0.2); paint(sk, 0.1, 0.1, 0.1); parts.push(sk); for (const z of [-0.7, 1.0]) { const st = new THREE.BoxGeometry(0.07, 0.8, 0.07); st.translate(sx * 0.95, -0.85, z); paint(st, 0.1, 0.1, 0.1); parts.push(st); } }
    const mast = new THREE.CylinderGeometry(0.1, 0.12, 0.5, 8); mast.translate(0, 1.15, 0.1); paint(mast, 0.15, 0.15, 0.16); parts.push(mast);
    const hull = new THREE.Mesh(geo(mergeGeometries(parts)), mat(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.4, metalness: 0.7 }))); root.add(hull);
    // wirnik główny (łopaty + rozmyty dysk) i ogonowy
    H.rotor = new THREE.Group(); H.rotor.position.set(0, 1.45, 0.1); root.add(H.rotor);
    const bladeM = mat(new THREE.MeshStandardMaterial({ color: 0x151518, roughness: 0.6, metalness: 0.4 })), bladeG = geo(new THREE.BoxGeometry(11, 0.04, 0.36));
    for (const a of [0, Math.PI / 2]) { const b = new THREE.Mesh(bladeG, bladeM); b.rotation.y = a; H.rotor.add(b); }
    const disc = new THREE.Mesh(geo(new THREE.CircleGeometry(5.5, 24)), mat(new THREE.MeshBasicMaterial({ color: 0xaab4c0, transparent: true, opacity: 0.07, depthWrite: false, side: THREE.DoubleSide, fog: false }))); disc.rotation.x = -Math.PI / 2; H.rotor.add(disc);
    H.tail = new THREE.Group(); H.tail.position.set(0.28, 0.95, -5.7); root.add(H.tail);
    const tb = new THREE.Mesh(geo(new THREE.BoxGeometry(0.04, 1.7, 0.2)), bladeM); H.tail.add(tb);
    // światła pozycyjne (powolne mruganie 1 Hz, bez stroba) i reflektor pod brzuchem
    const dot = (c, x, y, z, s) => { const sp = new THREE.Sprite(mat(new THREE.SpriteMaterial({ map: tex.dot, color: c, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }))); sp.scale.set(s, s, 1); sp.position.set(x, y, z); root.add(sp); return sp; };
    H.lights = [dot(0xff2020, -1.2, 0.1, 0.3, 0.5), dot(0x20ff40, 1.2, 0.1, 0.3, 0.5), dot(0xffffff, 0, 1.5, -5.8, 0.45)];
    const belly = dot(0xfff4d0, 0, -0.95, 1.2, 0.9); belly.material.opacity = 0.9; H.belly = belly;
    // stożek reflektora (apeks pod brzuchem, podstawa na ziemi) i plama światła
    const cg = geo(new THREE.ConeGeometry(1, 1, 18, 1, true)); cg.translate(0, -0.5, 0); cg.rotateX(-Math.PI / 2);
    H.beam = new THREE.Mesh(cg, mat(new THREE.MeshBasicMaterial({ color: 0xfff0c0, transparent: true, opacity: 0.1, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }))); H.beam.visible = false; H.beam.frustumCulled = false; L.root.add(H.beam);
    H.pool = new THREE.Mesh(geo(new THREE.CircleGeometry(HELI.LIGHT_R, 28)), mat(new THREE.MeshBasicMaterial({ map: tex.dot, color: 0xfff4d0, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }))); H.pool.rotation.x = -Math.PI / 2; H.pool.position.y = 0.12; H.pool.visible = false; L.root.add(H.pool);
    // łopot wirnika: szum w paśmie ~110 Hz z modulacją 11 Hz, pozycja 3D (panner z audio.js, okluzja)
    function startSound() {
        const bus = SFX.audioBus(); if (!bus || H.snd) return; const ctx = bus.ctx, nb = SFX.noiseBuf(1.2); if (!nb) return;
        const src = ctx.createBufferSource(); src.buffer = nb; src.loop = true;
        const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 120; bp.Q.value = 1.1;
        const g = ctx.createGain(); g.gain.value = 0.55;
        const lfo = ctx.createOscillator(); lfo.frequency.value = 11; const lg = ctx.createGain(); lg.gain.value = 0.45; lfo.connect(lg); lg.connect(g.gain);
        const out = ctx.createGain(); out.gain.value = 12;
        const pan = SFX.spatial({ x: H.disp.x, y: H.disp.y, z: H.disp.z }, bus.master, true); if (!pan) return;
        src.connect(bp); bp.connect(g); g.connect(out); out.connect(pan); src.start(); lfo.start(); H.snd = { src, lfo, pan, out, nodes: [bp, g, lg] };
    }
    function stopSound() { const s = H.snd; if (!s) return; try { s.src.stop(); s.lfo.stop(); } catch (e) { /* już zatrzymane */ } for (const n of [s.src, s.lfo, s.out, s.pan, ...s.nodes]) try { n.disconnect(); } catch (e) { /* ok */ } H.snd = null; }
    // h: stan z helilogic.js (host liczy, gość dostaje z sieci)
    H.update = (h, dt) => {
        const on = h.mode !== 'away'; H.t += dt;
        if (on !== H.vis) { H.vis = on; root.visible = on; H.beam.visible = on; H.pool.visible = on; if (!on) stopSound(); else { H.disp.x = h.x; H.disp.y = h.y; H.disp.z = h.z; H.disp.lx = h.lx; H.disp.lz = h.lz; H.disp.yaw = h.yaw; } }
        if (!on) return;
        const k = 1 - Math.exp(-dt * 9), d = H.disp; d.x += (h.x - d.x) * k; d.y += (h.y - d.y) * k; d.z += (h.z - d.z) * k; d.lx += (h.lx - d.lx) * k; d.lz += (h.lz - d.lz) * k;
        let da = h.yaw - d.yaw; da = Math.atan2(Math.sin(da), Math.cos(da)); d.yaw += da * Math.min(1, dt * 6);
        const sp = Math.hypot(h.vx || 0, h.vz || 0);
        root.position.set(d.x, d.y, d.z); root.rotation.set(Math.min(0.3, sp * 0.014), d.yaw, 0, 'YXZ');
        H.rotor.rotation.y += dt * 26; H.tail.rotation.x += dt * 30;
        const blink = Math.sin(H.t * Math.PI * 2) > 0.6 ? 1 : 0.25; H.lights[0].material.opacity = blink; H.lights[1].material.opacity = blink; H.lights[2].material.opacity = Math.sin(H.t * Math.PI * 2 + 1.5) > 0.5 ? 1 : 0.2;
        // reflektor
        root.updateMatrixWorld(true); const bp = new THREE.Vector3(); H.belly.getWorldPosition(bp);
        const tgt = new THREE.Vector3(d.lx, 0.1, d.lz), len = bp.distanceTo(tgt);
        H.beam.position.copy(bp); H.beam.lookAt(tgt); H.beam.scale.set(HELI.LIGHT_R, HELI.LIGHT_R, Math.max(0.1, len));
        H.pool.position.x = d.lx; H.pool.position.z = d.lz;
        startSound(); if (H.snd) { const p = H.snd.pan; if (p.positionX) { p.positionX.value = d.x; p.positionY.value = d.y; p.positionZ.value = d.z; } else p.setPosition(d.x, d.y, d.z); }
    };
    H.dispose = () => { stopSound(); root.removeFromParent(); H.beam.removeFromParent(); H.pool.removeFromParent(); for (const g of H.geos) g.dispose(); for (const m of H.mats) m.dispose(); };
    return H;
}
