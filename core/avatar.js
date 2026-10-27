// ==========================================
// DŁONIE (kciuk + dwa palce), GŁOWY I KOSMETYKI ZE SKLEPU
// look = { name, skin, color, hat, glasses, sleeve, gloves }
// ==========================================
import { THREE, tex, seg, V3 } from './engine.js';
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
// Futro goryla (jasna baza, kolor nadaje gracz albo skórka)
function furTexture() {
    if (cosTex.fur) return cosTex.fur;
    const S = 256, c = makeCanvas(S, S), x = c.getContext('2d'), R = mkRng(828);
    x.fillStyle = '#b8b8b8'; x.fillRect(0, 0, S, S);
    x.lineCap = 'round';
    for (let i = 0; i < 4200; i++) {
        const px = R() * S, py = R() * S, len = 4 + R() * 9, a = Math.PI / 2 + (R() - 0.5) * 0.7, v = (R() * 120 + 90) | 0;
        x.strokeStyle = 'rgba(' + v + ',' + v + ',' + v + ',' + (0.35 + R() * 0.4) + ')'; x.lineWidth = 0.8 + R() * 1.2;
        x.beginPath(); x.moveTo(px, py); x.lineTo(px + Math.cos(a) * len, py + Math.sin(a) * len); x.stroke();
    }
    return (cosTex.fur = toTex(c, true));
}
// Skórki (dział Skins w sklepie): zmieniają futro całej postaci i dłonie
const SKINS = {
    silverback: { fur: 0x2a2a2c, back: 0xb8b8bc },
    albino: { fur: 0xeee8de, face: 0xc8a8a0 },
    shadow: { fur: 0x0b0b0d, glowEyes: true },
    king: { fur: 0xd4a640, metal: true, cape: true },
    bloodmoon: { fur: 0x5a0a0c, face: 0x2a0606, glowEyes: true }
};
export function furColor(look) { const k = SKINS[look.skin]; return new THREE.Color(k ? k.fur : (look.color || '#3d2314')); }
function furMat(look, shade) {
    const k = SKINS[look.skin], f = furTexture();
    return new THREE.MeshStandardMaterial({ map: f, bumpMap: f, bumpScale: 3, color: furColor(look).multiplyScalar(shade || 1), roughness: k && k.metal ? 0.35 : 0.95, metalness: k && k.metal ? 0.65 : 0, envMapIntensity: k && k.metal ? Math.max(0.8, ENV) : ENV });
}
function faceMat(look) { const k = SKINS[look.skin]; return new THREE.MeshStandardMaterial({ color: k && k.face ? k.face : 0x2a2422, roughness: 0.55, bumpMap: tex.skin, bumpScale: 0.5, envMapIntensity: ENV }); }
function skinMaterial(look) {
    if (look.gloves === 'neon') return new THREE.MeshStandardMaterial({ color: 0x20ff70, emissive: 0x10ff60, emissiveIntensity: 1.3, roughness: 0.3 });
    if (look.gloves === 'mannequin') return new THREE.MeshStandardMaterial({ map: tex.plaster, bumpMap: tex.plaster, bumpScale: 0.7, color: 0xd8d0c2, roughness: 0.55, envMapIntensity: ENV });
    if (look.gloves === 'burnt') { const b = burntTexture(); return new THREE.MeshStandardMaterial({ color: 0x1a1210, roughness: 0.9, emissive: 0xff5a10, emissiveMap: b, emissiveIntensity: 1.4, bumpMap: tex.plaster, bumpScale: 2, envMapIntensity: ENV }); }
    if (look.gloves === 'black') return new THREE.MeshStandardMaterial({ color: 0x151517, roughness: 0.5, metalness: 0.15, envMapIntensity: ENV });
    if (look.gloves === 'bone') return new THREE.MeshStandardMaterial({ map: tex.plaster, bumpMap: tex.plaster, bumpScale: 1, color: 0xeadfc8, roughness: 0.7, envMapIntensity: ENV });
    if (look.gloves === 'ghost') return new THREE.MeshStandardMaterial({ color: 0x9fe8ff, emissive: 0x2ab8ff, emissiveIntensity: 0.9, transparent: true, opacity: 0.55, roughness: 0.3, depthWrite: false });
    // Gołe dłonie mają ten sam kolor co postać gracza (albo skórka)
    const k = SKINS[look.skin];
    if (k && k.metal) return new THREE.MeshStandardMaterial({ map: tex.skin, color: furColor(look), metalness: 0.7, roughness: 0.3, envMapIntensity: Math.max(0.8, ENV) });
    return new THREE.MeshPhysicalMaterial({ map: tex.skin, bumpMap: tex.skin, bumpScale: 0.25, color: furColor(look), roughness: 0.5, sheen: 0.6, sheenColor: new THREE.Color(0xff8f70), sheenRoughness: 0.45, clearcoat: 0.06, clearcoatRoughness: 0.6, envMapIntensity: ENV });
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
    if (look.sleeve === 'ghostcloth') return new THREE.MeshStandardMaterial(Object.assign(base, { color: 0xe8f4ff, emissive: 0x8ac8ff, emissiveIntensity: 0.8, transparent: true, opacity: 0.55, depthWrite: false }));
    if (look.sleeve === 'straitjacket') return new THREE.MeshStandardMaterial(Object.assign(base, { map: jacketTexture(), roughness: 0.95 }));
    if (look.sleeve === 'gold') return new THREE.MeshStandardMaterial(Object.assign(base, { color: 0xd4a640, metalness: 1, roughness: 0.25, envMapIntensity: Math.max(0.8, ENV) }));
    return new THREE.MeshStandardMaterial(Object.assign(base, { map: furTexture(), color: furColor(look).multiplyScalar(0.7), roughness: 0.95, bumpMap: furTexture(), bumpScale: 2 }));
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
    } else if (id === 'miner') {
        const y = mat({ color: 0xd8a820, roughness: 0.4, metalness: 0.2 });
        const dome = meshAt(new THREE.SphereGeometry(0.142, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), y, 0, 0.03, 0); dome.scale.y = 0.9; g.add(dome);
        g.add(meshAt(new THREE.CylinderGeometry(0.17, 0.17, 0.012, 24), y, 0, 0.035, 0));
        const lamp = meshAt(new THREE.CylinderGeometry(0.03, 0.035, 0.05, 14), mat({ color: 0x2a2a2a, metalness: 0.8 }), 0, 0.1, -0.13); lamp.rotation.x = Math.PI / 2; g.add(lamp);
        const lens = meshAt(new THREE.CircleGeometry(0.028, 16), new THREE.MeshBasicMaterial({ color: 0xfff4c0 }), 0, 0.1, -0.156); lens.rotation.y = Math.PI; g.add(lens);
        const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex.dot, color: 0xfff0b0, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.8 }));
        glow.scale.set(0.18, 0.18, 1); glow.position.set(0, 0.1, -0.17); g.add(glow);
    } else if (id === 'halo') {
        const h = meshAt(new THREE.TorusGeometry(0.12, 0.012, 8, 40, Math.PI * 1.65), new THREE.MeshStandardMaterial({ color: 0xffe08a, emissive: 0xffc840, emissiveIntensity: 1.2, metalness: 0.6, roughness: 0.3 }), 0, 0.27, 0);
        h.rotation.set(Math.PI / 2 + 0.15, 0, 0.6); h.castShadow = false; g.add(h);
    }
    return g;
}
export function buildGlasses(id) {
    const g = new THREE.Group();
    if (id === 'goldshades') g.add(meshAt(new THREE.BoxGeometry(0.2, 0.045, 0.02), mat({ color: 0xd4a640, metalness: 1, roughness: 0.15, envMapIntensity: Math.max(0.8, ENV) }), 0, 0.02, -0.132));
    else if (id === 'sunglasses') g.add(meshAt(new THREE.BoxGeometry(0.2, 0.045, 0.02), mat({ color: 0x050505, metalness: 0.9, roughness: 0.1 }), 0, 0.02, -0.132));
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
// Głowa goryla z kosmetykami (dla innych graczy, lustra i podglądu w sklepie)
export function createHead(look, withName) {
    const head = new THREE.Group(), fur = furMat(look), face = faceMat(look), k = SKINS[look.skin] || {};
    const masked = look.mask && look.mask !== 'none', hatted = look.hat && look.hat !== 'none';
    const skull = meshAt(new THREE.SphereGeometry(0.13, 24, 18), fur, 0, 0.005, 0.01); skull.scale.set(1, 1.05, 1.05); head.add(skull);
    if (!hatted) { const crest = meshAt(new THREE.SphereGeometry(1, 12, 10), fur, 0, 0.105, 0.03); crest.scale.set(0.035, 0.06, 0.09); head.add(crest); }   // grzebień na czubku
    for (const s of [-1, 1]) { const cheek = meshAt(new THREE.SphereGeometry(1, 12, 10), fur, s * 0.085, -0.035, -0.05); cheek.scale.set(0.06, 0.07, 0.07); head.add(cheek); }
    const plate = meshAt(new THREE.SphereGeometry(1, 20, 14), face, 0, -0.01, -0.085); plate.scale.set(0.1, 0.11, 0.06); head.add(plate);
    const brow = meshAt(new THREE.SphereGeometry(1, 16, 10), face, 0, 0.045, -0.112); brow.scale.set(0.115, 0.028, 0.04); head.add(brow);   // wał nadoczodołowy
    for (const s of [-1, 1]) { const ear = meshAt(new THREE.SphereGeometry(1, 10, 8), face, s * 0.128, 0.0, -0.005); ear.scale.set(0.02, 0.032, 0.024); head.add(ear); }
    if (!masked) {
        const muzzle = meshAt(new THREE.SphereGeometry(1, 18, 12), face, 0, -0.06, -0.115); muzzle.scale.set(0.082, 0.058, 0.05); head.add(muzzle);
        const dark = new THREE.MeshBasicMaterial({ color: 0x0a0605 });
        for (const s of [-1, 1]) { const n = meshAt(new THREE.SphereGeometry(0.011, 8, 6), dark, s * 0.02, -0.042, -0.162); n.scale.set(1, 0.7, 0.5); head.add(n); }
        head.add(meshAt(new THREE.BoxGeometry(0.075, 0.006, 0.01), dark, 0, -0.088, -0.158));
        const eyeMat = k.glowEyes ? new THREE.MeshBasicMaterial({ color: 0xff2a10 }) : new THREE.MeshPhysicalMaterial({ color: 0x2a160c, roughness: 0.1, clearcoat: 1 });
        for (const s of [-1, 1]) head.add(meshAt(new THREE.SphereGeometry(0.015, 12, 8), eyeMat, s * 0.042, 0.018, -0.118));
    }
    head.add(buildMask(look.mask)); head.add(buildHat(look.hat)); head.add(buildGlasses(look.glasses));
    if (withName) { const tag = createNameSprite(String(look.name || 'Player').slice(0, 16)); tag.position.set(0, 0.45, 0); tag.scale.set(2, 0.5, 1); head.add(tag); }
    return head;
}
// Odznaki (jak w Gorilla Tag): okrągła przypinka ze złotą obwódką na piersi
const BADGES = {
    early: { bg: '#4a1a7a', draw: (x) => star(x, 64, 64, 40, 18, '#ffd23a') },
    skull: { bg: '#141414', draw: (x) => { x.fillStyle = '#f0ece0'; x.beginPath(); x.arc(64, 56, 30, 0, 7); x.fill(); x.fillRect(46, 70, 36, 22); x.fillStyle = '#141414'; x.beginPath(); x.arc(52, 56, 9, 0, 7); x.arc(76, 56, 9, 0, 7); x.fill(); x.fillRect(54, 84, 4, 8); x.fillRect(62, 84, 4, 8); x.fillRect(70, 84, 4, 8); } },
    bone: { bg: '#5a3a22', draw: (x) => { x.save(); x.translate(64, 64); x.rotate(-0.7); x.fillStyle = '#f0e8d4'; x.fillRect(-30, -7, 60, 14); for (const sx of [-1, 1]) for (const sy of [-1, 1]) { x.beginPath(); x.arc(sx * 32, sy * 8, 10, 0, 7); x.fill(); } x.restore(); } },
    eye: { bg: '#5a0a0a', draw: (x) => { x.fillStyle = '#f4ecdc'; x.beginPath(); x.ellipse(64, 64, 42, 24, 0, 0, 7); x.fill(); x.fillStyle = '#b01010'; x.beginPath(); x.arc(64, 64, 16, 0, 7); x.fill(); x.fillStyle = '#000'; x.beginPath(); x.arc(64, 64, 7, 0, 7); x.fill(); } },
    moon: { bg: '#0e1430', draw: (x) => { x.fillStyle = '#d01818'; x.beginPath(); x.arc(64, 64, 36, 0, 7); x.fill(); x.fillStyle = '#0e1430'; x.beginPath(); x.arc(80, 54, 32, 0, 7); x.fill(); } },
    flame: { bg: '#3a0a02', draw: (x) => { for (const [c, k] of [['#ff5a10', 1], ['#ffb020', 0.65], ['#fff0a0', 0.35]]) { x.fillStyle = c; x.beginPath(); x.moveTo(64, 64 - 44 * k - 6); x.bezierCurveTo(64 + 40 * k, 64 - 10 * k, 64 + 30 * k, 64 + 40 * k, 64, 64 + 40 * k); x.bezierCurveTo(64 - 30 * k, 64 + 40 * k, 64 - 40 * k, 64 - 10 * k, 64, 64 - 44 * k - 6); x.fill(); } } },
    crown: { bg: '#7a0a10', draw: (x) => { x.fillStyle = '#ffd23a'; x.beginPath(); x.moveTo(26, 88); x.lineTo(26, 46); x.lineTo(46, 66); x.lineTo(64, 36); x.lineTo(82, 66); x.lineTo(102, 46); x.lineTo(102, 88); x.closePath(); x.fill(); } }
};
function star(x, cx, cy, ro, ri, col) {
    x.fillStyle = col; x.beginPath();
    for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? ri : ro; if (i === 0) x.moveTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); else x.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); }
    x.closePath(); x.fill();
}
const badgeTex = {};
export function buildBadge(id) {
    const b = BADGES[id]; if (!b) return null;
    if (!badgeTex[id]) {
        const c = makeCanvas(128, 128), x = c.getContext('2d');
        x.fillStyle = b.bg; x.beginPath(); x.arc(64, 64, 62, 0, 7); x.fill();
        b.draw(x);
        x.strokeStyle = 'rgba(255,255,255,0.25)'; x.lineWidth = 4; x.beginPath(); x.arc(64, 64, 56, Math.PI * 1.1, Math.PI * 1.6); x.stroke();   // połysk
        badgeTex[id] = toTex(c, false);
    }
    const g = new THREE.Group();
    const face = new THREE.Mesh(new THREE.CircleGeometry(0.042, 28), new THREE.MeshStandardMaterial({ map: badgeTex[id], roughness: 0.3, metalness: 0.1 }));
    face.rotation.y = Math.PI; g.add(face);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.043, 0.005, 6, 28), new THREE.MeshStandardMaterial({ color: 0xd4a640, metalness: 1, roughness: 0.25 }));
    g.add(rim);
    return g;
}
// Tułów goryla: szeroka klatka, garb barków, ciemna pierś (środek = 0.35 m pod głową)
export function createGorillaTorso(look) {
    const g = new THREE.Group(), fur = furMat(look), face = faceMat(look), k = SKINS[look.skin] || {};
    const add = (m, x, y, z, sx, sy, sz) => { const o = meshAt(new THREE.SphereGeometry(1, 20, 14), m, x, y, z); o.scale.set(sx, sy, sz); g.add(o); return o; };
    g.userData.chest = add(fur, 0, -0.08, 0.02, 0.3, 0.34, 0.24);
    add(fur, 0, 0.17, 0.05, 0.36, 0.17, 0.26);                       // garb barków
    for (const s of [-1, 1]) add(fur, s * 0.27, 0.15, 0.02, 0.13, 0.13, 0.15);   // ramiona
    add(face, 0, 0.0, -0.17, 0.2, 0.17, 0.08);                       // ciemna pierś
    if (k.back) add(new THREE.MeshStandardMaterial({ map: furTexture(), color: k.back, roughness: 0.9 }), 0, 0.0, 0.17, 0.25, 0.22, 0.1);
    const badge = buildBadge(look.badge);
    if (badge) { badge.position.set(0.13, 0.06, -0.236); badge.rotation.x = -0.15; g.add(badge); }
    if (k.cape) {
        const cape = meshAt(new THREE.BoxGeometry(0.62, 0.7, 0.02), new THREE.MeshStandardMaterial({ color: 0x9a0a10, roughness: 0.7, side: THREE.DoubleSide }), 0, -0.2, 0.27);
        cape.rotation.x = 0.15; g.add(cape);
        for (const s of [-1, 1]) g.add(meshAt(new THREE.SphereGeometry(0.035, 10, 8), new THREE.MeshStandardMaterial({ color: 0xd4a640, metalness: 1, roughness: 0.25 }), s * 0.22, 0.2, -0.05));
    }
    return g;
}
// Ramię goryla: cylinder od barku do nadgarstka, ustawiany co klatkę
const ARM_GEO = new THREE.CylinderGeometry(0.055, 0.075, 1, 12).translate(0, 0.5, 0);
export function createGorillaArm(look) { const m = new THREE.Mesh(ARM_GEO, furMat(look)); m.castShadow = true; return m; }
const _Y = new THREE.Vector3(0, 1, 0), _sh = new THREE.Vector3(), _hp = new THREE.Vector3(), _dir = new THREE.Vector3();
export function placeArm(arm, torso, side, hand) {
    _sh.set(side * 0.27, 0.14, 0.02); torso.localToWorld(_sh);
    hand.getWorldPosition(_hp);
    if (arm.parent) arm.parent.worldToLocal(_sh), arm.parent.worldToLocal(_hp);
    _dir.subVectors(_hp, _sh); const len = Math.max(0.05, _dir.length());
    arm.position.copy(_sh); arm.quaternion.setFromUnitVectors(_Y, _dir.normalize()); arm.scale.set(1, len, 1);
    arm.updateMatrixWorld(true);
}
export function lookKey(look) { return [look.name, look.color, look.skin, look.badge, look.hat, look.glasses, look.mask, look.sleeve, look.gloves].join('|'); }
// Awatar innego gracza: głowa i tułów goryla, długie ramiona i dłonie
export function createAvatar(look) {
    const group = new THREE.Group();
    const torso = createGorillaTorso(look); group.add(torso);
    const head = createHead(look, true); group.add(head);
    const handL = createRealHand(true, look), handR = createRealHand(false, look);
    const armL = createGorillaArm(look), armR = createGorillaArm(look);
    group.add(handL, handR, armL, armR);
    // Ramiona dociągane do dłoni tuż przed rysowaniem
    torso.userData.chest.onBeforeRender = () => { placeArm(armL, torso, -1, handL); placeArm(armR, torso, 1, handR); };
    return { group, torso, head, handL, handR, key: lookKey(look) };
}
