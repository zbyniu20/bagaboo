// ==========================================
// DŁONIE (kciuk + dwa palce), GŁOWY I KOSMETYKI ZE SKLEPU
// look = { name, skin, color, hat, glasses, sleeve, gloves }
// ==========================================
import { THREE, g, V3 } from './engine.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { LP } from './config.js';
import { makeCanvas, toTex, mkRng } from './textures.js';

const ENV = LP.envIntensity;
const NAIL_GEO = new THREE.SphereGeometry(1, 12, 8);
const FINGER_DEFS = [
    { x: -0.017, len: [0.05, 0.033, 0.026], r: 0.0135, splay: 0.06 },
    { x: 0.018, len: [0.047, 0.031, 0.025], r: 0.013, splay: -0.1 }
];

// Tekstury nowych kosmetyków (tworzone raz, przy pierwszym użyciu)
const cosTex = {};
function burntTexture() {
    if (cosTex.burnt) return cosTex.burnt;
    const S = 256, c = makeCanvas(S, S), x = c.getContext('2d'), R = mkRng(616);
    x.fillStyle = '#000000'; x.fillRect(0, 0, S, S);
    x.strokeStyle = '#ff6a10'; x.lineCap = 'round';
    for (let i = 0; i < 40; i++) {
        let px = R() * S, py = R() * S; x.lineWidth = 1 + R() * 2.5; x.beginPath(); x.moveTo(px, py);
        for (let k = 0; k < 6; k++) { px += (R() - 0.5) * 40; py += (R() - 0.5) * 40; x.lineTo(px, py); }
        x.stroke();
    }
    return (cosTex.burnt = toTex(c, true));
}
function jacketTexture() {
    if (cosTex.jacket) return cosTex.jacket;
    const S = 256, c = makeCanvas(S, S), x = c.getContext('2d'), R = mkRng(717);
    x.fillStyle = '#d6d0c0'; x.fillRect(0, 0, S, S);
    for (let i = 0; i < 5000; i++) { x.fillStyle = 'rgba(90,80,60,' + (R() * 0.1) + ')'; x.fillRect(R() * S, R() * S, 2, 2); }
    for (const y of [60, 170]) {
        x.fillStyle = '#5a4030'; x.fillRect(0, y, S, 26);
        x.fillStyle = '#b8a060'; x.fillRect(110, y - 4, 34, 34); x.fillStyle = '#5a4030'; x.fillRect(118, y + 4, 18, 18);
    }
    x.fillStyle = 'rgba(120,0,0,0.5)'; x.beginPath(); x.arc(200, 120, 18, 0, 7); x.fill();
    return (cosTex.jacket = toTex(c, true));
}
function skinMaterial(look) {
    if (look.gloves === 'mannequin') return new THREE.MeshStandardMaterial({ map: tex.plaster, bumpMap: tex.plaster, bumpScale: 0.7, color: 0xd8d0c2, roughness: 0.55, envMapIntensity: ENV });
    if (look.gloves === 'burnt') { const b = burntTexture(); return new THREE.MeshStandardMaterial({ color: 0x1a1210, roughness: 0.9, emissive: 0xff5a10, emissiveMap: b, emissiveIntensity: 1.4, bumpMap: tex.plaster, bumpScale: 2, envMapIntensity: ENV }); }
    if (look.gloves === 'black') return new THREE.MeshStandardMaterial({ color: 0x151517, roughness: 0.5, metalness: 0.15, envMapIntensity: ENV });
    if (look.gloves === 'bone') return new THREE.MeshStandardMaterial({ map: tex.plaster, bumpMap: tex.plaster, bumpScale: 1, color: 0xeadfc8, roughness: 0.7, envMapIntensity: ENV });
    if (look.gloves === 'ghost') return new THREE.MeshStandardMaterial({ color: 0x9fe8ff, emissive: 0x2ab8ff, emissiveIntensity: 0.9, transparent: true, opacity: 0.55, roughness: 0.3, depthWrite: false });
    // Gołe dłonie mają ten sam kolor co postać gracza
    return new THREE.MeshPhysicalMaterial({ map: tex.skin, bumpMap: tex.skin, bumpScale: 0.25, color: new THREE.Color(look.color || '#3d2314'), roughness: 0.5, sheen: 0.6, sheenColor: new THREE.Color(0xff8f70), sheenRoughness: 0.45, clearcoat: 0.06, clearcoatRoughness: 0.6, envMapIntensity: ENV });
}
function nailMaterial(look) {
    if (look.gloves && look.gloves !== 'none') return null;
    return new THREE.MeshPhysicalMaterial({ color: 0xe8ccc0, roughness: 0.25, clearcoat: 0.8, clearcoatRoughness: 0.2, envMapIntensity: ENV });
}
function sleeveMaterial(look) {
    const base = { side: THREE.DoubleSide, envMapIntensity: ENV };
    if (look.sleeve === 'leather') return new THREE.MeshStandardMaterial(Object.assign(base, { color: 0x3a2214, roughness: 0.35, metalness: 0.1 }));
    if (look.sleeve === 'camo') return new THREE.MeshStandardMaterial(Object.assign(base, { map: tex.camo, roughness: 0.9 }));
    if (look.sleeve === 'bandage') return new THREE.MeshStandardMaterial(Object.assign(base, { map: tex.bandage, bumpMap: tex.bandage, bumpScale: 1, roughness: 0.95 }));
    if (look.sleeve === 'straitjacket') return new THREE.MeshStandardMaterial(Object.assign(base, { map: jacketTexture(), roughness: 0.95 }));
    if (look.sleeve === 'gold') return new THREE.MeshStandardMaterial(Object.assign(base, { color: 0xd4a640, metalness: 1, roughness: 0.25, envMapIntensity: Math.max(0.8, ENV) }));
    return new THREE.MeshStandardMaterial(Object.assign(base, { color: new THREE.Color(look.color || '#3d2314').multiplyScalar(0.6), roughness: 0.95, bumpMap: tex.plaster, bumpScale: 1.5 }));
}
function fingerSeg(r, len) {
    const g = new THREE.CapsuleGeometry(r, Math.max(0.002, len - r), 4, 12);
    g.rotateX(Math.PI / 2); g.translate(0, 0, -len / 2);
    return g;
}

export function createRealHand(isLeft, look) {
    const side = isLeft ? -1 : 1, outer = new THREE.Group(), model = new THREE.Group();
    model.position.set(0, -0.015, 0.075); model.rotation.set(-0.3, 0, -0.9 * side); outer.add(model);
    const skin = skinMaterial(look), nailMat = nailMaterial(look);
    const add = (geo, mat, parent) => { const m = new THREE.Mesh(geo, mat); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m; };
    add(new RoundedBoxGeometry(0.074, 0.028, 0.094, 3, 0.012), skin, model);
    const thenar = add(new THREE.SphereGeometry(1, 14, 10), skin, model); thenar.scale.set(0.022, 0.014, 0.032); thenar.position.set(-0.027 * side, -0.007, 0.014);
    const hypo = add(new THREE.SphereGeometry(1, 14, 10), skin, model); hypo.scale.set(0.016, 0.012, 0.03); hypo.position.set(0.028 * side, -0.006, 0.018);
    const wrist = add(new THREE.CylinderGeometry(0.026, 0.024, 0.05, 16), skin, model); wrist.rotation.x = Math.PI / 2; wrist.position.set(0, 0, 0.068); wrist.scale.set(1.2, 1, 0.75);
    const cuff = add(new THREE.CylinderGeometry(0.036, 0.04, 0.05, 20, 1, true), sleeveMaterial(look), model);
    cuff.rotation.x = Math.PI / 2; cuff.position.set(0, 0, 0.11); cuff.scale.set(1.15, 1, 0.85);
    const fingers = [];
    for (const f of FINGER_DEFS) {
        add(new THREE.SphereGeometry(f.r * 1.15, 10, 8), skin, model).position.set(f.x * side, 0.006, -0.044);
        const base = new THREE.Group(); base.rotation.order = 'YXZ'; base.position.set(f.x * side, 0.003, -0.046); base.rotation.y = f.splay * side; model.add(base);
        const joints = [base]; let parent = base, r = f.r;
        for (let k = 0; k < 3; k++) {
            const j = k === 0 ? base : new THREE.Group();
            if (k > 0) { j.position.z = -f.len[k - 1]; parent.add(j); joints.push(j); }
            add(fingerSeg(r, f.len[k]), skin, j);
            if (k === 2 && nailMat) { const n = add(NAIL_GEO, nailMat, j); n.position.set(0, r * 0.62, -f.len[2] * 0.6); n.scale.set(r * 0.8, r * 0.25, f.len[2] * 0.33); }
            parent = j; r *= 0.88;
        }
        fingers.push(joints);
    }
    const tb = new THREE.Group(); tb.rotation.order = 'YXZ'; tb.position.set(-0.033 * side, -0.008, 0.008); tb.rotation.set(-0.35, 0.85 * side, 0); model.add(tb);
    const thumb = [tb], tl = [0.04, 0.032, 0.027]; let tp = tb, tr = 0.0138;
    for (let k = 0; k < 3; k++) {
        const j = k === 0 ? tb : new THREE.Group();
        if (k > 0) { j.position.z = -tl[k - 1]; tp.add(j); thumb.push(j); }
        add(fingerSeg(tr, tl[k]), skin, j);
        if (k === 2 && nailMat) { const n = add(NAIL_GEO, nailMat, j); n.position.set(0, tr * 0.62, -tl[2] * 0.6); n.scale.set(tr * 0.8, tr * 0.25, tl[2] * 0.33); }
        tp = j; tr *= 0.88;
    }
    outer.userData.rig = { fingers: fingers, thumb: thumb, grip: 0.22, target: 0.22 };
    poseHand(outer.userData.rig, 1);
    return outer;
}
export function poseHand(rig, dt) {
    rig.grip += (rig.target - rig.grip) * Math.min(1, dt * 14);
    const g = rig.grip;
    for (let f = 0; f < rig.fingers.length; f++) {
        const J = rig.fingers[f];
        J[0].rotation.x = -(0.12 + g * (1.35 + f * 0.08)); J[1].rotation.x = -(0.18 + g * 1.55); J[2].rotation.x = -(0.1 + g * 0.95);
    }
    const T = rig.thumb;
    T[0].rotation.x = -(0.35 + g * 0.4); T[1].rotation.x = -(0.15 + g * 0.55); T[2].rotation.x = -(0.15 + g * 0.75);
}

// --- Czapki i okulary (układ: głowa patrzy w -Z, środek głowy w 0,0,0) ---
const mat = (o) => new THREE.MeshStandardMaterial(Object.assign({ envMapIntensity: ENV, roughness: 0.6 }, o));
const meshAt = (geo, m, x, y, z) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = true; return o; };
export function buildHat(id) {
    const g = new THREE.Group();
    if (id === 'cap') {
        const c = mat({ color: 0x6a1a14 });
        const dome = meshAt(new THREE.SphereGeometry(0.137, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), c, 0, 0.03, 0); dome.scale.y = 0.8; g.add(dome);
        g.add(meshAt(new THREE.BoxGeometry(0.19, 0.012, 0.12), c, 0, 0.035, -0.16));
    } else if (id === 'beanie') {
        const k = mat({ color: 0x2d4a3a, roughness: 0.95, bumpMap: tex.plaster, bumpScale: 2 });
        const dome = meshAt(new THREE.SphereGeometry(0.142, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), k, 0, 0.03, 0); dome.scale.y = 1.05; g.add(dome);
        g.add(meshAt(new THREE.CylinderGeometry(0.146, 0.146, 0.045, 20), k, 0, 0.04, 0));
        g.add(meshAt(new THREE.SphereGeometry(0.035, 12, 8), mat({ color: 0xc8b89a, roughness: 1 }), 0, 0.19, 0));
    } else if (id === 'tophat') {
        const b = mat({ color: 0x0d0d0f, roughness: 0.8 });
        g.add(meshAt(new THREE.CylinderGeometry(0.175, 0.175, 0.012, 28), b, 0, 0.11, 0));
        g.add(meshAt(new THREE.CylinderGeometry(0.1, 0.105, 0.2, 24), b, 0, 0.21, 0));
        g.add(meshAt(new THREE.CylinderGeometry(0.107, 0.107, 0.032, 24), mat({ color: 0x7a0a0a }), 0, 0.13, 0));
    } else if (id === 'cowboy') {
        const l = mat({ color: 0x6a4a2a, roughness: 0.85 });
        const brim = meshAt(new THREE.CylinderGeometry(0.25, 0.25, 0.012, 32), l, 0, 0.1, 0); brim.scale.z = 0.85; g.add(brim);
        g.add(meshAt(new THREE.CylinderGeometry(0.1, 0.125, 0.12, 24), l, 0, 0.165, 0));
        g.add(meshAt(new THREE.CylinderGeometry(0.127, 0.127, 0.025, 24), mat({ color: 0x2a1a0e }), 0, 0.12, 0));
    } else if (id === 'horns') {
        const parts = [];
        for (const s of [-1, 1]) {
            const pts = [V3(s * 0.07, 0.09, -0.01), V3(s * 0.12, 0.16, 0.0), V3(s * 0.145, 0.24, 0.04), V3(s * 0.12, 0.31, 0.09)], rad = [0.03, 0.022, 0.013, 0.004];
            for (let i = 0; i < 3; i++) parts.push(seg(pts[i], pts[i + 1], rad[i], rad[i + 1], 10));
        }
        g.add(meshAt(mergeGeometries(parts), mat({ color: 0x2a0606, roughness: 0.35, metalness: 0.2 }), 0, 0, 0));
    } else if (id === 'crown') {
        const gold = mat({ color: 0xc8a040, metalness: 1, roughness: 0.3, envMapIntensity: Math.max(0.8, ENV) });
        g.add(meshAt(new THREE.CylinderGeometry(0.115, 0.11, 0.07, 16, 1, true), gold, 0, 0.15, 0));
        for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; g.add(meshAt(new THREE.ConeGeometry(0.022, 0.07, 8), gold, Math.cos(a) * 0.11, 0.215, Math.sin(a) * 0.11)); }
        const gem = new THREE.MeshStandardMaterial({ color: 0xff2020, emissive: 0xaa0000, emissiveIntensity: 0.8 });
        for (let i = 0; i < 3; i++) { const a = -Math.PI / 2 + (i - 1) * 0.6; g.add(meshAt(new THREE.SphereGeometry(0.014, 10, 8), gem, Math.cos(a) * 0.117, 0.15, Math.sin(a) * 0.117)); }
    } else if (id === 'halo') {
        const h = meshAt(new THREE.TorusGeometry(0.12, 0.012, 8, 40, Math.PI * 1.65), new THREE.MeshStandardMaterial({ color: 0xffe08a, emissive: 0xffc840, emissiveIntensity: 1.2, metalness: 0.6, roughness: 0.3 }), 0, 0.27, 0);
        h.rotation.set(Math.PI / 2 + 0.15, 0, 0.6); h.castShadow = false; g.add(h);
    }
    return g;
}
export function buildGlasses(id) {
    const g = new THREE.Group();
    if (id === 'sunglasses') g.add(meshAt(new THREE.BoxGeometry(0.2, 0.045, 0.02), mat({ color: 0x050505, metalness: 0.9, roughness: 0.1 }), 0, 0.02, -0.132));
    else if (id === 'round') {
        const m = mat({ color: 0xc8a040, metalness: 1, roughness: 0.3 });
        for (const s of [-1, 1]) g.add(meshAt(new THREE.TorusGeometry(0.03, 0.005, 6, 20), m, s * 0.045, 0.02, -0.13));
        g.add(meshAt(new THREE.BoxGeometry(0.03, 0.005, 0.005), m, 0, 0.025, -0.13));
    } else if (id === 'eyepatch') {
        const b = mat({ color: 0x080808, roughness: 0.8 });
        const p = meshAt(new THREE.CylinderGeometry(0.034, 0.034, 0.01, 18), b, 0.045, 0.02, -0.128); p.rotation.x = Math.PI / 2; g.add(p);
        const strap = meshAt(new THREE.TorusGeometry(0.136, 0.005, 6, 36), b, 0, 0.03, 0); strap.rotation.set(Math.PI / 2, 0.35, 0); g.add(strap);
    } else if (id === 'weld') {
        const strap = mat({ color: 0x1a1a1a, roughness: 0.8 }), lens = mat({ color: 0x1a4a2a, metalness: 0.6, roughness: 0.1, emissive: 0x0a2a10 });
        for (const s of [-1, 1]) { const l = meshAt(new THREE.CylinderGeometry(0.034, 0.034, 0.04, 16), lens, s * 0.046, 0.025, -0.13); l.rotation.x = Math.PI / 2; g.add(l); }
        const st = meshAt(new THREE.TorusGeometry(0.135, 0.008, 6, 36), strap, 0, 0.03, 0); st.rotation.x = Math.PI / 2; g.add(st);
    } else if (id === 'thirdeye') {
        const eye = meshAt(new THREE.SphereGeometry(0.03, 16, 12), new THREE.MeshStandardMaterial({ color: 0xfff0d0, emissive: 0xffa020, emissiveIntensity: 0.6, roughness: 0.2 }), 0, 0.075, -0.12);
        eye.scale.set(1, 0.7, 0.6); g.add(eye);
        g.add(meshAt(new THREE.SphereGeometry(0.012, 10, 8), new THREE.MeshBasicMaterial({ color: 0x200000 }), 0, 0.075, -0.139));
    } else if (id === 'visor') {
        const v = meshAt(new THREE.BoxGeometry(0.22, 0.035, 0.03), new THREE.MeshStandardMaterial({ color: 0xff2a1a, emissive: 0xff1a00, emissiveIntensity: 2.2, roughness: 0.2 }), 0, 0.02, -0.13);
        v.castShadow = false; g.add(v);
    }
    return g;
}
// Maski zakładane na twarz (nowy dział sklepu)
export function buildMask(id) {
    const g = new THREE.Group();
    const shell = (m, sx, sy, sz) => { const o = meshAt(new THREE.SphereGeometry(1, 24, 16, 0, Math.PI * 2, 0, Math.PI), m, 0, 0, -0.1); o.scale.set(sx, sy, sz); g.add(o); return o; };
    const dark = new THREE.MeshBasicMaterial({ color: 0x050505 });
    if (id === 'hockey') {
        shell(mat({ color: 0xe8e4d8, roughness: 0.35 }), 0.125, 0.155, 0.06).position.z = -0.1;
        for (const s of [-1, 1]) g.add(meshAt(new THREE.SphereGeometry(0.02, 10, 8), dark, s * 0.045, 0.025, -0.155));
        for (let i = 0; i < 6; i++) g.add(meshAt(new THREE.SphereGeometry(0.006, 6, 4), dark, (i % 3 - 1) * 0.03, -0.06 - Math.floor(i / 3) * 0.025, -0.158));
        for (const s of [-1, 1]) { const v = meshAt(new THREE.BoxGeometry(0.035, 0.008, 0.01), mat({ color: 0xaa1010 }), s * 0.06, 0.07, -0.152); v.rotation.z = s * 0.5; g.add(v); }
    } else if (id === 'gas') {
        const rubber = mat({ color: 0x1c1e1c, roughness: 0.7 });
        shell(rubber, 0.13, 0.15, 0.065).position.z = -0.1;
        for (const s of [-1, 1]) { const l = meshAt(new THREE.CylinderGeometry(0.03, 0.03, 0.02, 16), mat({ color: 0x8aa0a0, metalness: 0.7, roughness: 0.05 }), s * 0.048, 0.025, -0.158); l.rotation.x = Math.PI / 2; g.add(l); }
        const f = meshAt(new THREE.CylinderGeometry(0.035, 0.04, 0.07, 16), mat({ color: 0x4a5a3a, roughness: 0.6 }), 0, -0.07, -0.19); f.rotation.x = Math.PI / 2 - 0.4; g.add(f);
    } else if (id === 'doll') {
        shell(new THREE.MeshPhysicalMaterial({ color: 0xf4eee6, roughness: 0.15, clearcoat: 1 }), 0.125, 0.15, 0.062).position.z = -0.1;
        for (const s of [-1, 1]) {
            g.add(meshAt(new THREE.SphereGeometry(0.018, 10, 8), dark, s * 0.045, 0.03, -0.158));
            const ch = meshAt(new THREE.SphereGeometry(0.022, 10, 8), new THREE.MeshStandardMaterial({ color: 0xe88a9a, roughness: 0.5 }), s * 0.065, -0.02, -0.15); ch.scale.z = 0.3; g.add(ch);
        }
        const lip = meshAt(new THREE.SphereGeometry(0.016, 10, 8), mat({ color: 0xaa0a1a, roughness: 0.3 }), 0, -0.065, -0.157); lip.scale.set(1.2, 0.5, 0.4); g.add(lip);
        const crack = meshAt(new THREE.BoxGeometry(0.004, 0.09, 0.004), dark, 0.03, 0.07, -0.158); crack.rotation.z = 0.4; g.add(crack);
    } else if (id === 'plague') {
        const leather = mat({ color: 0x2a1c14, roughness: 0.6 });
        shell(leather, 0.13, 0.15, 0.06).position.z = -0.1;
        const beak = meshAt(new THREE.ConeGeometry(0.045, 0.24, 14), leather, 0, -0.03, -0.27); beak.rotation.x = -Math.PI / 2 - 0.35; g.add(beak);
        for (const s of [-1, 1]) { const l = meshAt(new THREE.CylinderGeometry(0.024, 0.024, 0.015, 16), mat({ color: 0xa02010, metalness: 0.5, roughness: 0.1, emissive: 0x300000 }), s * 0.045, 0.035, -0.158); l.rotation.x = Math.PI / 2; g.add(l); }
    } else if (id === 'skull') {
        shell(mat({ color: 0xe0d6bc, roughness: 0.7, bumpMap: tex.plaster, bumpScale: 1 }), 0.13, 0.16, 0.065).position.z = -0.1;
        for (const s of [-1, 1]) { const e = meshAt(new THREE.SphereGeometry(0.026, 10, 8), dark, s * 0.045, 0.025, -0.155); e.scale.z = 0.4; g.add(e); }
        g.add(meshAt(new THREE.ConeGeometry(0.014, 0.025, 3), dark, 0, -0.015, -0.162));
        for (let i = 0; i < 6; i++) g.add(meshAt(new THREE.BoxGeometry(0.012, 0.022, 0.006), mat({ color: 0xf0e8d0 }), (i - 2.5) * 0.015, -0.07, -0.16));
    } else if (id === 'blind') {
        const flesh = mat({ map: tex.skin, color: 0x8e7f7a, roughness: 0.4, bumpMap: tex.plaster, bumpScale: 2 });
        shell(flesh, 0.135, 0.16, 0.07).position.z = -0.1;
        for (const s of [-1, 1]) { const lid = meshAt(new THREE.SphereGeometry(0.03, 10, 8), flesh, s * 0.045, 0.03, -0.165); lid.scale.set(1.3, 0.35, 0.5); g.add(lid); }
        const memb = new THREE.MeshStandardMaterial({ color: 0x9a5a5a, roughness: 0.5, side: THREE.DoubleSide });
        for (const s of [-1, 1]) { const e = meshAt(new THREE.SphereGeometry(1, 12, 10), memb, s * 0.17, 0.08, 0.0); e.scale.set(0.02, 0.15, 0.1); e.rotation.set(0.2, s * 0.6, s * 0.5); g.add(e); }
        for (let i = 0; i < 7; i++) { const t2 = meshAt(new THREE.ConeGeometry(0.008, 0.03, 5), mat({ color: 0xd8ccb0 }), (i - 3) * 0.014, -0.07, -0.165); t2.rotation.x = Math.PI; g.add(t2); }
    }
    return g;
}
function createNameSprite(message) {
    const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 128;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.roundRect(0, 0, 512, 128, 20); ctx.fill();
    ctx.strokeStyle = '#880000'; ctx.lineWidth = 6; ctx.roundRect(0, 0, 512, 128, 20); ctx.stroke();
    ctx.font = 'bold 60px sans-serif'; ctx.fillStyle = '#111111'; ctx.textAlign = 'center'; ctx.fillText(message, 256, 85);
    return new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(canvas) }));
}
// Głowa postaci z kosmetykami (dla innych graczy i dla podglądu w sklepie)
export function createHead(look, withName) {
    const head = new THREE.Group();
    const fur = mat({ color: new THREE.Color(look.color || '#3d2314'), roughness: 0.9, bumpMap: tex.plaster, bumpScale: 1.5 });
    const skull = meshAt(new THREE.SphereGeometry(0.13, 24, 18), fur, 0, 0, 0); skull.scale.set(1, 1.05, 1); head.add(skull);
    head.add(meshAt(new THREE.BoxGeometry(0.15, 0.09, 0.08), mat({ color: 0x1e1a18, roughness: 0.7 }), 0, -0.06, -0.11));
    head.add(meshAt(new THREE.BoxGeometry(0.2, 0.035, 0.06), fur, 0, 0.055, -0.11));
    const white = new THREE.MeshStandardMaterial({ color: 0xe8e0d0, roughness: 0.3 }), black = new THREE.MeshBasicMaterial({ color: 0x000000 });
    for (const s of [-1, 1]) { head.add(meshAt(new THREE.SphereGeometry(0.02, 12, 8), white, s * 0.045, 0.02, -0.112)); head.add(meshAt(new THREE.SphereGeometry(0.009, 8, 6), black, s * 0.045, 0.02, -0.13)); }
    head.add(buildMask(look.mask)); head.add(buildHat(look.hat)); head.add(buildGlasses(look.glasses));
    if (withName) { const tag = createNameSprite(String(look.name || 'Player').slice(0, 16)); tag.position.set(0, 0.45, 0); tag.scale.set(2, 0.5, 1); head.add(tag); }
    return head;
}
export function lookKey(look) { return [look.name, look.color, look.hat, look.glasses, look.mask, look.sleeve, look.gloves].join('|'); }
// Awatar innego gracza: głowa, tułów i dwie dłonie
export function createAvatar(look) {
    const group = new THREE.Group();
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.6, 0.35), mat({ color: new THREE.Color(look.color || '#3d2314'), roughness: 0.85 }));
    torso.castShadow = true; group.add(torso);
    const head = createHead(look, true); group.add(head);
    const handL = createRealHand(true, look), handR = createRealHand(false, look);
    group.add(handL, handR);
    return { group, torso, head, handL, handR, key: lookKey(look) };
}
