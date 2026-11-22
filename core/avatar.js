// ==========================================
// DŁONIE (kciuk + dwa palce), GŁOWY I KOSMETYKI ZE SKLEPU
// look = { name, skin, color, hat, glasses, sleeve, gloves }
// ==========================================
import { THREE, tex, seg, V3 } from './engine.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { LP } from './config.js';
import { makeCanvas, toTex, mkRng, normalFor } from './textures.js';
import { roleTagsFor } from './config.js';
import { goobyTexture } from './gooby.js';
import { rimify } from './visuals.js';
import { extraHat, extraGlasses, extraMask, extraSleeveMat, extraGloveMat, EXTRA_SKINS, EXTRA_BADGES } from './cosmetics.js';

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
    for (let i = 0; i < 9000; i++) {   // gęste, cienkie włosy w różnych odcieniach (więcej szczegółu pod normalną)
        const px = R() * S, py = R() * S, len = 3 + R() * 9, a = Math.PI / 2 + (R() - 0.5) * 0.7, v = (R() * 150 + 70) | 0;
        x.strokeStyle = 'rgba(' + v + ',' + v + ',' + v + ',' + (0.3 + R() * 0.45) + ')'; x.lineWidth = 0.6 + R() * 1.1;
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
    bloodmoon: { fur: 0x5a0a0c, face: 0x2a0606, glowEyes: true },
    ultimate: { fur: 0xe0b040, face: 0xb8902a, metal: true },   // ultimate admin: cały złoty
    cheater: { fur: 0x39ff14, face: 0xff00aa, glowEyes: true }   // przyłapany haker: jaskrawozielony z różową twarzą, na zawsze
};
Object.assign(SKINS, EXTRA_SKINS);   // nowe skórki (sezonowe i za wyzwania)
export function furColor(look) { const k = SKINS[look.skin]; return new THREE.Color(k ? k.fur : (look.color || '#3d2314')); }
function furMat(look, shade) {
    const k = SKINS[look.skin], f = furTexture();
    // Futro: normalna z tekstury włosów + aksamitny połysk (sheen) na krawędziach; metalowe skórki bez sheen
    const fur = new THREE.MeshPhysicalMaterial({ map: f, normalMap: normalFor(f, 4), normalScale: new THREE.Vector2(1.2, 1.2), color: furColor(look).multiplyScalar(shade || 1), roughness: k && k.metal ? 0.35 : 0.9, metalness: k && k.metal ? 0.65 : 0, envMapIntensity: k && k.metal ? Math.max(0.8, ENV) : ENV });
    if (!(k && k.metal)) { fur.sheen = 1; fur.sheenRoughness = 0.55; fur.sheenColor = new THREE.Color(0x887766); }
    return fur;
}
function faceMat(look) {
    const k = SKINS[look.skin];
    if (k && k.metal && k.face) return new THREE.MeshStandardMaterial({ color: k.face, metalness: 0.9, roughness: 0.3, envMapIntensity: Math.max(0.8, ENV) });
    return new THREE.MeshPhysicalMaterial({ color: k && k.face ? k.face : 0x2a2422, roughness: 0.62, normalMap: normalFor(tex.skin, 2), normalScale: new THREE.Vector2(0.8, 0.8), clearcoat: 0.12, clearcoatRoughness: 0.5, envMapIntensity: Math.max(0.6, ENV) });
}
function skinMaterial(look) {
    const eg = extraGloveMat(look.gloves); if (eg) return eg;
    if (look.gloves === 'neon') return new THREE.MeshStandardMaterial({ color: 0x20ff70, emissive: 0x10ff60, emissiveIntensity: 1.3, roughness: 0.3 });
    if (look.gloves === 'mannequin') return new THREE.MeshStandardMaterial({ map: tex.plaster, bumpMap: tex.plaster, bumpScale: 0.7, color: 0xd8d0c2, roughness: 0.55, envMapIntensity: ENV });
    if (look.gloves === 'burnt') { const b = burntTexture(); return new THREE.MeshStandardMaterial({ color: 0x1a1210, roughness: 0.9, emissive: 0xff5a10, emissiveMap: b, emissiveIntensity: 1.4, bumpMap: tex.plaster, bumpScale: 2, envMapIntensity: ENV }); }
    if (look.gloves === 'black') return new THREE.MeshStandardMaterial({ color: 0x151517, roughness: 0.5, metalness: 0.15, envMapIntensity: ENV });
    if (look.gloves === 'bone') return new THREE.MeshStandardMaterial({ map: tex.plaster, bumpMap: tex.plaster, bumpScale: 1, color: 0xeadfc8, roughness: 0.7, envMapIntensity: ENV });
    if (look.gloves === 'ghost') return new THREE.MeshStandardMaterial({ color: 0x9fe8ff, emissive: 0x2ab8ff, emissiveIntensity: 0.9, transparent: true, opacity: 0.55, roughness: 0.3, depthWrite: false });
    // Gołe dłonie mają ten sam kolor co postać gracza (albo skórka)
    const k = SKINS[look.skin];
    if (k && k.metal) return new THREE.MeshStandardMaterial({ map: tex.skin, color: furColor(look), metalness: 0.7, roughness: 0.3, envMapIntensity: Math.max(0.8, ENV) });
    return new THREE.MeshPhysicalMaterial({ map: tex.skin, bumpMap: tex.skin, bumpScale: 0.25, color: furColor(look).multiplyScalar(SCARY ? 0.55 : 1), roughness: 0.5, sheen: 0.6, sheenColor: new THREE.Color(SCARY ? 0x5a3a34 : 0xff8f70), sheenRoughness: 0.45, clearcoat: 0.06, clearcoatRoughness: 0.6, envMapIntensity: ENV });
}
function nailMaterial(look) {
    if (look.gloves && look.gloves !== 'none') return null;
    return new THREE.MeshPhysicalMaterial({ color: 0xe8ccc0, roughness: 0.25, clearcoat: 0.8, clearcoatRoughness: 0.2, envMapIntensity: ENV });
}
function sleeveMaterial(look) {
    const base = { side: THREE.DoubleSide, envMapIntensity: ENV };
    const ex = extraSleeveMat(look.sleeve, base); if (ex) return ex;
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

const CLAW_MAT = new THREE.MeshStandardMaterial({ color: 0x1c1612, roughness: 0.35, metalness: 0.2 });
function claw(joint, r, len, l) {   // zakrzywiony czarny pazur na czubku palca (stożek odchylony w dół)
    const g = new THREE.ConeGeometry(r * 0.7, l, 6, 1); g.translate(0, l / 2, 0); g.rotateX(-Math.PI / 2 - 0.35);
    const m = new THREE.Mesh(g, CLAW_MAT); m.position.set(0, -r * 0.1, -len + r * 0.4); joint.add(m);
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
            if (k === 2 && SCARY) claw(j, r, f.len[2], 0.03);
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
        if (k === 2 && SCARY) claw(j, tr, tl[2], 0.022);
        tp = j; tr *= 0.88;
    }
    outer.userData.rig = { fingers: fingers, thumb: thumb, grip: 0.22, target: 0.22 };
    poseHand(outer.userData.rig, 1);
    rimify(outer, 0xffc890, 0.45, 0);   // ciepła obwódka Fresnela: dłonie widać wyraźnie także w ciemnych poziomach
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
    { const e = extraHat(id); if (e.children.length) return e; }
    const g = new THREE.Group();
    if (id === 'cap') {
        const c = mat({ color: 0x6a1a14 });
        const dome = meshAt(new THREE.SphereGeometry(0.137, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), c, 0, 0.03, 0); dome.scale.y = 0.8; g.add(dome);
        g.add(meshAt(new THREE.BoxGeometry(0.19, 0.012, 0.12), c, 0, 0.035, -0.16));
    } else if (id === 'ushanka') {
        // Uszatka: futrzana czapa z podwiniętym daszkiem z przodu i nausznikami opadającymi po bokach
        const fur = new THREE.MeshStandardMaterial({ map: furTexture(), color: 0x6a5040, roughness: 0.95 });
        const crown = new THREE.MeshStandardMaterial({ color: 0x3a2a20, roughness: 0.8 });
        const top = meshAt(new RoundedBoxGeometry(0.29, 0.1, 0.28, 3, 0.04), crown, 0, 0.17, 0.0); g.add(top);
        const band = meshAt(new RoundedBoxGeometry(0.3, 0.07, 0.29, 3, 0.03), fur, 0, 0.12, 0.0); g.add(band);
        const flap = meshAt(new RoundedBoxGeometry(0.26, 0.09, 0.04, 3, 0.02), fur, 0, 0.15, -0.155); flap.rotation.x = -0.25; g.add(flap);
        for (const sx of [-1, 1]) {
            const ear = meshAt(new RoundedBoxGeometry(0.05, 0.17, 0.15, 3, 0.022), fur, sx * 0.155, 0.02, 0.0); ear.rotation.z = sx * 0.08; g.add(ear);
            const tie = meshAt(new THREE.CylinderGeometry(0.004, 0.004, 0.07, 5), crown, sx * 0.158, -0.09, 0.0); g.add(tie);
        }
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
    } else if (id === 'eyeball') {
        // Piłka-oko z lobby jako czapka: źrenica patrzy do przodu, lekki czerwony blask
        const eye = new THREE.Mesh(new THREE.SphereGeometry(0.115, 28, 20), new THREE.MeshPhysicalMaterial({ map: tex.eye, emissive: 0x330000, roughness: 0.1, metalness: 0.1, clearcoat: 1.0, envMapIntensity: ENV }));
        eye.position.set(0, 0.2, 0); eye.rotation.y = Math.PI / 2; g.add(eye);
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
    { const e = extraGlasses(id); if (e.children.length) return e; }
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
    { const e = extraMask(id); if (e.children.length) return e; }
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
// Napis z nickiem: ciemna plakietka, biały pogrubiony tekst z obrysem, zawsze cały widoczny
// (rysowany na wierzchu, nie chowa się w czapce ani za ścianą; długie nicki dostają mniejszą czcionkę)
function createNameSprite(message) {
    const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 128;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'rgba(10,8,8,0.82)'; ctx.beginPath(); ctx.roundRect(4, 4, 504, 120, 28); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 5; ctx.stroke();
    let size = 66; ctx.font = 'bold ' + size + 'px sans-serif';
    while (ctx.measureText(message).width > 460 && size > 26) { size -= 2; ctx.font = 'bold ' + size + 'px sans-serif'; }
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.lineWidth = 8; ctx.strokeStyle = '#000000'; ctx.strokeText(message, 256, 68);
    ctx.fillStyle = '#ffffff'; ctx.fillText(message, 256, 68);
    const tx = new THREE.CanvasTexture(canvas); tx.colorSpace = THREE.SRGBColorSpace; tx.anisotropy = 4;
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tx, depthTest: false, depthWrite: false, transparent: true }));
    sp.renderOrder = 950;
    return sp;
}
// Głowa goryla: kwadratowa, cała w futrze, tylko twarz bez owłosienia (dla innych graczy, lustra i sklepu)

// ---------- PREMIUM: tekstury twarzy i oczu, cieniowanie wierzchołków, kępki sierści ----------
// Twarz: skóra z drobnymi zmarszczkami (nad brwiami, wokół nosa i ust). Tekstura jest jasnoszara i mnoży się przez kolor skóry (skórki mają własny).
function faceTexture(kind) {
    if (cosTex['face' + kind]) return cosTex['face' + kind];
    const S = 256, c = makeCanvas(S, S), x = c.getContext('2d'), R = mkRng(kind === 'muzzle' ? 91 : 53);
    const g = x.createRadialGradient(S * 0.75 * 0 + S / 2, S / 2, 10, S / 2, S / 2, S * 0.7);
    g.addColorStop(0, '#f0f0f0'); g.addColorStop(0.7, '#cfcfcf'); g.addColorStop(1, '#a8a8a8'); x.fillStyle = g; x.fillRect(0, 0, S, S);
    for (let i = 0; i < 1400; i++) { const px = R() * S, py = R() * S, v = (150 + R() * 100) | 0; x.fillStyle = 'rgba(' + v + ',' + v + ',' + v + ',0.35)'; x.fillRect(px, py, 1 + R() * 2, 1 + R() * 2); }   // pory
    x.lineCap = 'round'; x.strokeStyle = 'rgba(60,60,60,0.45)';
    const wr = (pts, w) => { x.lineWidth = w; x.beginPath(); x.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) x.quadraticCurveTo(pts[i][0], pts[i][1], pts[i][0] + 4, pts[i][1] + 1); x.stroke(); };
    if (kind === 'face') {
        for (let i = 0; i < 4; i++) wr([[40, 52 + i * 7], [128, 44 + i * 7], [216, 52 + i * 7]], 1.4);        // zmarszczki czoła nad brwiami
        wr([[78, 150], [96, 176], [100, 205]], 2.2); wr([[178, 150], [160, 176], [156, 205]], 2.2);            // bruzdy od nosa
        for (const sx of [86, 170]) for (let i = 0; i < 3; i++) wr([[sx - 16, 112 + i * 6], [sx, 118 + i * 6], [sx + 16, 112 + i * 6]], 1.1);   // powieki
    } else {
        x.fillStyle = 'rgba(40,20,20,0.55)'; for (const sx of [100, 156]) { x.beginPath(); x.ellipse(sx, 120, 9, 6, 0, 0, 7); x.fill(); }   // nozdrza
        wr([[70, 168], [128, 182], [186, 168]], 2.6);                                                          // linia ust
        wr([[100, 200], [128, 208], [156, 200]], 1.6);
    }
    return (cosTex['face' + kind] = toTex(c, true));
}
// Oko goryla: ciemna twardówka, bursztynowa tęczówka z obwódką i źrenica (na kuli: przód oka w -Z to u = 0.75)
function eyeTexture() {
    if (cosTex.eye) return cosTex.eye;
    const W = 256, H = 128, c = makeCanvas(W, H), x = c.getContext('2d');
    x.fillStyle = '#1c0e08'; x.fillRect(0, 0, W, H);
    const cx = W * 0.75, cy = H / 2, ig = x.createRadialGradient(cx, cy, 2, cx, cy, 30);
    ig.addColorStop(0, '#d89030'); ig.addColorStop(0.5, '#a05a14'); ig.addColorStop(0.85, '#5a2c0a'); ig.addColorStop(1, '#1a0a04');
    x.fillStyle = ig; x.beginPath(); x.ellipse(cx, cy, 30, 30, 0, 0, 7); x.fill();
    x.strokeStyle = 'rgba(20,8,2,0.9)'; x.lineWidth = 3; x.beginPath(); x.ellipse(cx, cy, 29, 29, 0, 0, 7); x.stroke();     // obwódka tęczówki
    x.fillStyle = '#050202'; x.beginPath(); x.ellipse(cx, cy, 11, 11, 0, 0, 7); x.fill();                                     // źrenica
    return (cosTex.eye = toTex(c, true));
}
// Ciemniejsze wgłębienia i jaśniejsze wypukłości futra (zamiast płaskiego koloru): shade(x, y, z) -> 0..1 mnoży kolor wierzchołka
function bakeShade(geo, shade) {
    const pos = geo.attributes.position, col = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) { const v = Math.max(0.35, Math.min(1.1, shade(pos.getX(i), pos.getY(i), pos.getZ(i)))); col[i * 3] = col[i * 3 + 1] = col[i * 3 + 2] = v; }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    return geo;
}
const smooth = (a, b, v) => { const t = Math.max(0, Math.min(1, (v - a) / (b - a))); return t * t * (3 - 2 * t); };
// Kępka sierści: wąski stożek od punktu (px,py,pz) w stronę kierunku (nx,ny,nz)
const _tu = new THREE.Vector3(), _tq = new THREE.Quaternion(), _Yup = new THREE.Vector3(0, 1, 0);
function tuftGeo(px, py, pz, nx, ny, nz, len, r) {
    const g = new THREE.ConeGeometry(r, len, 5, 1); g.translate(0, len / 2, 0);
    _tq.setFromUnitVectors(_Yup, _tu.set(nx, ny, nz).normalize()); g.applyQuaternion(_tq); g.translate(px, py, pz);
    return g;
}
// Elipsoida jako geometria (do scalania w jedną siatkę): promienie rx,ry,rz, środek x,y,z
const ellGeo = (rx, ry, rz, x, y, z, rotX) => { const g = new THREE.SphereGeometry(1, 20, 14); g.scale(rx, ry, rz); if (rotX) g.rotateX(rotX); g.translate(x, y, z); g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 3).fill(1), 3)); return g; };
const ellMesh = (geos, mat) => { const m = new THREE.Mesh(mergeGeometries(geos), mat); m.castShadow = true; m.receiveShadow = true; return m; };
// Therian: uszy królika (futro w kolorze skórki, różowe wnętrze), kołyszą się i drgają
function buildBunnyEars(look) {
    const g = new THREE.Group(), fur = new THREE.MeshStandardMaterial({ color: furColor(look), roughness: 0.95 }), pink = new THREE.MeshStandardMaterial({ color: 0xf0a0b8, roughness: 0.9 });
    g.userData.ears = [];
    for (const s of [-1, 1]) {
        const pivot = new THREE.Group(); pivot.position.set(s * 0.06, 0.15, 0.02); pivot.rotation.z = -s * 0.2;
        const ear = meshAt(new THREE.CapsuleGeometry(0.03, 0.2, 4, 8), fur, 0, 0.13, 0); ear.scale.z = 0.6; pivot.add(ear);
        const inner = meshAt(new THREE.CapsuleGeometry(0.016, 0.16, 4, 8), pink, 0, 0.13, -0.012); inner.scale.z = 0.5; pivot.add(inner);
        g.add(pivot); g.userData.ears.push({ p: pivot, s: s });
    }
    return g;
}
// Marchewka w pysku: czubek w ustach, natka na zewnątrz. Co ~8 s ukąszenia skracają ją o połowę, potem pojawia się nowa; przy gryzieniu drga, uszy też
function buildCarrot(earsGroup) {
    const g = new THREE.Group(); g.position.set(0.03, -0.06, -0.12);
    const orange = new THREE.MeshStandardMaterial({ color: 0xe8761a, roughness: 0.55 }), green = new THREE.MeshStandardMaterial({ color: 0x3a9a2a, roughness: 0.8 });
    const geo = new THREE.CylinderGeometry(0.003, 0.018, 1, 8); geo.rotateX(Math.PI / 2); geo.translate(0, 0, -0.5);   // oś wzdłuż -z, czubek w początku układu
    const body = new THREE.Mesh(geo, orange); body.scale.z = 0.13; body.castShadow = true; g.add(body);
    const leaves = new THREE.Group(); leaves.position.z = -0.13; g.add(leaves);
    for (let i = 0; i < 3; i++) { const lg = new THREE.ConeGeometry(0.008, 0.07, 5); lg.rotateX(-Math.PI / 2); const lf = new THREE.Mesh(lg, green); lf.position.set((i - 1) * 0.006, (i % 2) * 0.006, -0.03); lf.rotation.set((i - 1) * 0.18, (i - 1) * 0.22, 0); leaves.add(lf); }
    const ph = Math.random() * 8;
    body.onBeforeRender = () => {
        const t = performance.now() / 1000 + ph, u = (t % 8) / 8, bites = Math.floor(u * 7), len = u > 0.94 ? 1 : 1 - bites * 0.075, chewing = bites > 0 && (u * 7 - bites) < 0.6 && u <= 0.94 ? 1 : 0.15;
        body.scale.z = 0.13 * len; leaves.position.z = -0.13 * len;
        const chew = (Math.sin(t * 16) * 0.5 + 0.5) * chewing; g.rotation.x = chew * 0.08; g.position.y = -0.06 - chew * 0.004;
        if (earsGroup) for (const e of earsGroup.userData.ears) e.p.rotation.z = -e.s * 0.2 + Math.sin(t * 1.7 + e.s) * 0.04 + (Math.sin(t * 0.5) > 0.9 ? Math.sin(t * 30) * 0.08 : 0);
    };
    return g;
}
// Straszniejszy goryl (styl Gorilla Tag, niski poligon): szeroki grymas z kłami, gniewne powieki, blizny, krew; w createHead i na tułowiu kolce i rysy pazurów
const SCARY = true;
const BONE = () => new THREE.MeshStandardMaterial({ color: 0xd9d0b4, roughness: 0.5 });
function toothGeo(x, y, z, len, r, up) { const g = new THREE.ConeGeometry(r, len, 5, 1); g.translate(0, len / 2, 0); if (!up) g.rotateX(Math.PI); g.translate(x, y, z); return g; }
function addScaryFace(head, mouth, k) {
    const f = head.userData.face, bone = BONE(), dark = new THREE.MeshStandardMaterial({ color: 0x120a08, roughness: 0.9 });
    f.wide = 1.55; mouth.material = new THREE.MeshBasicMaterial({ color: 0x2c0404 });
    const zAt = (x) => -0.153 + 0.03 * Math.min(1, (x / 0.062) ** 2) - 0.003;   // wzdłuż krzywizny pyska
    const upG = [], loG = [];
    for (let i = 0; i < 11; i++) {
        const x = (i - 5) * 0.0105, big = Math.abs(i - 5) === 3, len = big ? 0.026 : (Math.abs(i - 5) === 5 ? 0.008 : 0.013), r = big ? 0.0056 : 0.0044;
        upG.push(toothGeo(x, -0.081, zAt(x), len, r, false));
        if (i % 2 === 0 || big) loG.push(toothGeo(x * 0.9, 0, zAt(x * 0.9) + 0.004, big ? 0.02 : 0.011, big ? 0.005 : 0.004, true));
    }
    head.add(ellMesh(upG, bone));
    const jaw = new THREE.Group(); jaw.position.y = -0.0894; jaw.add(ellMesh(loG, bone)); head.add(jaw); f.jaw = jaw;
    for (const s of [-1, 1]) {   // gniewne powieki nad oczami (wewnętrzny koniec niżej), ciemne wory
        const lid = meshAt(new THREE.SphereGeometry(1, 12, 8), dark, s * 0.045, 0.044, -0.138); lid.scale.set(0.034, 0.012, 0.018); lid.rotation.z = s * 0.5; head.add(lid);
        const bag = meshAt(new THREE.SphereGeometry(1, 12, 8), new THREE.MeshStandardMaterial({ color: 0x1a0c0c, roughness: 1 }), s * 0.045, -0.006, -0.138); bag.scale.set(0.03, 0.007, 0.014); head.add(bag);
    }
    const red = new THREE.MeshStandardMaterial({ color: 0x8a0f0f, roughness: 0.5, emissive: 0x300000 }), pale = new THREE.MeshStandardMaterial({ color: 0x6a4a44, roughness: 0.7 });
    const slash = (x, y, rot, len, mat) => { const m = meshAt(new THREE.BoxGeometry(len, 0.004, 0.006), mat, x, y, -0.132); m.rotation.z = rot; head.add(m); };
    for (let i = 0; i < 3; i++) slash(-0.048 + i * 0.008, -0.022 - i * 0.012, 0.95, 0.045, red);   // trzy ślady pazurów na policzku
    for (let i = 0; i < 5; i++) slash(0.05 + (i % 2) * 0.004, 0.058 - i * 0.012, 1.57, 0.012, pale);   // szwy na czole: poprzeczne ściegi
    slash(0.052, 0.03, 1.57, 0.07, pale);
    for (const x of [-0.03, 0.004, 0.034]) { const d = meshAt(new THREE.CylinderGeometry(0.0022, 0.0009, 0.014 + Math.abs(x) * 0.3, 5), red, x, -0.1, zAt(x) - 0.003); head.add(d); }   // krew spływająca z pyska
}
export function createHead(look, withName) {
    const head = new THREE.Group(), fur = furMat(look), face = faceMat(look), k = SKINS[look.skin] || {};
    const maskId = (k.catMask && (!look.mask || look.mask === 'none')) ? 'furascat' : look.mask;   // skórki z catMask (Furas, Furasek) mają własną maskę kota (inna założona maska ma pierwszeństwo)
    const masked = maskId && maskId !== 'none';
    // Czaszka goryla: owalna z kopułą (grzebieniem) na czubku, wydatnymi policzkami i uszami: jedna siatka futra
    const skullGeos = [ellGeo(0.135, 0.138, 0.13, 0, 0.005, 0), ellGeo(0.05, 0.04, 0.095, 0, 0.097, 0.03), ellGeo(0.045, 0.055, 0.055, -0.095, -0.045, -0.055), ellGeo(0.045, 0.055, 0.055, 0.095, -0.045, -0.055),
        ellGeo(0.02, 0.036, 0.03, -0.138, 0.0, -0.01), ellGeo(0.02, 0.036, 0.03, 0.138, 0.0, -0.01)];
    if (!look.hat || look.hat === 'none') for (let i = 0; i < 6; i++) { const z = -0.03 + i * 0.03, y = 0.097 + 0.04 * Math.sqrt(Math.max(0, 1 - ((z - 0.03) / 0.095) ** 2)); skullGeos.push(tuftGeo(0, y - 0.004, z, 0, 1, 0.45 + i * 0.12, 0.02, 0.013)); }   // grzebień z kępek
    for (const sx of [-1, 1]) for (let i = 0; i < 3; i++) skullGeos.push(tuftGeo(sx * 0.13, -0.02 - i * 0.035, -0.03, sx, -0.25 * i, 0.25, 0.02, 0.012));   // baczki
    skullGeos.forEach(g => bakeShade(g, (x, y, z) => 0.8 + 0.3 * smooth(-0.13, 0.1, y) - 0.12 * smooth(0.06, 0.12, Math.abs(x)) * (y < 0 ? 1 : 0.3)));   // pod brodą i po bokach ciemniej, czubek jaśniejszy
    fur.vertexColors = true;
    head.add(ellMesh(skullGeos, fur));
    // Twarz bez futra: lekko wypukła płyta z pyskiem; nad nią ciężka kość brwiowa
    const faceM = face.clone(), muzzleM = face.clone(); faceM.map = faceTexture('face'); muzzleM.map = faceTexture('muzzle');
    head.add(ellMesh([ellGeo(0.098, 0.088, 0.04, 0, -0.02, -0.1)], faceM));
    if (!masked) head.add(ellMesh([ellGeo(0.058, 0.038, 0.035, 0, -0.07, -0.118)], muzzleM));
    const brow = ellMesh([ellGeo(0.108, SCARY ? 0.034 : 0.03, 0.045, 0, 0, -0.103)], fur); brow.position.y = SCARY ? 0.05 : 0.058;   // geometria w zerze: animateFace ustawia position.y (wcześniej wysokość liczyła się podwójnie i brew unosiła się nad głową)
    head.add(brow);
    head.userData.face = { brow: brow, browY: SCARY ? 0.05 : 0.058, mouth: null, eyes: [], level: 0, blinkT: 2 + Math.random() * 3, blink: 0 };
    if (!masked) {
        const dark = new THREE.MeshBasicMaterial({ color: 0x0a0605 });
        head.add(ellMesh([ellGeo(0.011, 0.007, 0.006, -0.019, -0.062, -0.151), ellGeo(0.011, 0.007, 0.006, 0.019, -0.062, -0.151)], dark));   // nozdrza
        // Oczodoły: ciemne zagłębienia, w których siedzą oczy (głębia twarzy)
        head.add(ellMesh([ellGeo(0.03, 0.026, 0.02, -0.045, 0.02, -0.126), ellGeo(0.03, 0.026, 0.02, 0.045, 0.02, -0.126)], new THREE.MeshStandardMaterial({ color: 0x120a08, roughness: 1 })));
        // Usta: ciemny owal, który otwiera się w rytm głosu (rozmowa przez mikrofon)
        const mouth = meshAt(new THREE.SphereGeometry(0.035, 14, 8), new THREE.MeshBasicMaterial({ color: 0x1a0606 }), 0, -0.085, -0.145);
        mouth.scale.set(1, 0.12, 0.35); head.add(mouth); head.userData.face.mouth = mouth;
        if (SCARY) addScaryFace(head, mouth, k);
        const eyeMat = (k.glowEyes || SCARY) ? new THREE.MeshBasicMaterial({ color: 0xff1a0a }) : new THREE.MeshPhysicalMaterial({ map: eyeTexture(), color: 0xffffff, roughness: 0.04, clearcoat: 1, clearcoatRoughness: 0.03, envMapIntensity: 2.2, reflectivity: 0.9 });
        const spark = new THREE.MeshBasicMaterial({ color: 0xfff4e8 });
        for (const s of [-1, 1]) {
            const e = meshAt(new THREE.SphereGeometry(0.0165, 16, 12), eyeMat, s * 0.045, 0.02, -0.136); head.add(e); head.userData.face.eyes.push(e);
            if (SCARY && !k.glowEyes) { const pu = meshAt(new THREE.SphereGeometry(0.01, 8, 8), new THREE.MeshBasicMaterial({ color: 0x120000 }), 0, 0, -0.015); pu.scale.set(0.3, 1.2, 0.5); e.add(pu); }   // szczelinowa źrenica
            else if (!k.glowEyes) { const c = new THREE.Mesh(new THREE.SphereGeometry(0.0042, 8, 6), spark); c.position.set(-0.0055, 0.0062, -0.0135); e.add(c); }   // odblask: oko wygląda na żywe
        }
    }
    head.add(buildMask(maskId)); head.add(buildHat(look.hat)); head.add(buildGlasses(look.glasses));
    if (k.bunnyEars || k.carrot) {   // Therian: uszy królika (znikają pod czapką) i marchewka w pysku, którą postać gryzie
        const ears = k.bunnyEars && (!look.hat || look.hat === 'none') ? buildBunnyEars(look) : null; if (ears) head.add(ears);
        if (k.carrot) head.add(buildCarrot(ears));
    }
    if (withName) {
        const tag = createNameSprite(String(look.name || 'Player').slice(0, 16)); tag.position.set(0, 0.5, 0); tag.scale.set(0.72, 0.18, 1); head.add(tag);
        head.userData.tags = [tag];   // napisy nad głową: tryby ukrywania (Hide and Seek) wyłączają je przez TAGS.hidden
        addRoleTag(head, look);
    }
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
    owner: { bg: '#3a0612', draw: (x) => { x.fillStyle = '#ffd23a'; x.beginPath(); x.moveTo(30, 82); x.lineTo(30, 44); x.lineTo(47, 60); x.lineTo(64, 32); x.lineTo(81, 60); x.lineTo(98, 44); x.lineTo(98, 82); x.closePath(); x.fill(); x.fillRect(30, 86, 68, 10); x.fillStyle = '#c01030'; for (const cx of [47, 64, 81]) { x.beginPath(); x.arc(cx, 72, 5, 0, 7); x.fill(); } } },
    coadmin: { bg: '#04303a', draw: (x) => { shield(x, '#5af0ff', ''); x.fillStyle = '#04303a'; x.font = 'bold 40px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('CA', 64, 66); } },
    ultimate: { bg: '#1a0a2a', draw: (x) => {   // Ultimate Admin: złota gwiazda z fioletowym pierścieniem, koroną i napisem
        x.strokeStyle = '#c060ff'; x.lineWidth = 7; x.beginPath(); x.arc(64, 64, 56, 0, 7); x.stroke();
        star(x, 64, 66, 44, 19, '#ffd23a');
        x.fillStyle = '#ff4a2a'; x.beginPath(); x.moveTo(40, 34); x.lineTo(40, 18); x.lineTo(52, 27); x.lineTo(64, 12); x.lineTo(76, 27); x.lineTo(88, 18); x.lineTo(88, 34); x.closePath(); x.fill();
        x.fillStyle = '#2a1a00'; x.font = 'bold 30px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('UA', 64, 70); } },
    admin: { bg: '#8a0a0a', draw: (x) => shield(x, '#ffd23a', 'A') },
    mod: { bg: '#0a2a7a', draw: (x) => shield(x, '#d8e8ff', 'M') },
    crown: { bg: '#7a0a10', draw: (x) => { x.fillStyle = '#ffd23a'; x.beginPath(); x.moveTo(26, 88); x.lineTo(26, 46); x.lineTo(46, 66); x.lineTo(64, 36); x.lineTo(82, 66); x.lineTo(102, 46); x.lineTo(102, 88); x.closePath(); x.fill(); } }
};
Object.assign(BADGES, EXTRA_BADGES);   // nowe odznaki
function shield(x, col, letter) {
    x.fillStyle = col; x.beginPath(); x.moveTo(64, 20); x.lineTo(100, 32); x.lineTo(96, 76); x.quadraticCurveTo(64, 110, 64, 110); x.quadraticCurveTo(64, 110, 32, 76); x.lineTo(28, 32); x.closePath(); x.fill();
    x.fillStyle = '#1a0a0a'; x.font = 'bold 50px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(letter, 64, 66);
}
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
// Tułów: zwykła sylwetka (nie gruba, nie chuda), cały w futrze, z łysym plackiem na brzuchu (środek = 0.35 m pod głową)
export function createGorillaTorso(look) {
    const g = new THREE.Group(), fur = furMat(look), face = faceMat(look), k = SKINS[look.skin] || {};
    // Beczkowata klatka piersiowa, brzuch, kaptur mięśni karku i potężne barki: jedna siatka futra (oddycha, patrz onBeforeRender w createAvatar)
    const bodyGeos = [ellGeo(0.225, 0.25, 0.145, 0, -0.03, 0), ellGeo(0.19, 0.15, 0.14, 0, -0.2, 0), ellGeo(0.17, 0.075, 0.11, 0, 0.19, 0.02),
        ellGeo(0.095, 0.095, 0.095, -0.215, 0.14, 0), ellGeo(0.095, 0.095, 0.095, 0.215, 0.14, 0)];
    // Grzywa: kępki sierści na karku, barkach i plecach (sylwetka nie jest gładką bryłą)
    for (let i = 0; i < 7; i++) { const a = (i / 6 - 0.5) * 2.2; bodyGeos.push(tuftGeo(Math.sin(a) * 0.17, 0.235 + Math.cos(a) * 0.02, 0.03, Math.sin(a) * 0.6, 1, 0.5, 0.024, 0.016)); }
    for (const sx of [-1, 1]) for (let i = 0; i < 5; i++) { const a = 0.4 + i * 0.5; bodyGeos.push(tuftGeo(sx * (0.215 + Math.sin(a) * 0.08), 0.14 + Math.cos(a) * 0.08, 0, sx * Math.sin(a), Math.cos(a), 0.2, 0.022, 0.016)); }
    for (let i = 0; i < 8; i++) { const a = (i / 7 - 0.5) * 2.0; bodyGeos.push(tuftGeo(Math.sin(a) * 0.19, -0.08 - (i % 3) * 0.06, 0.12, Math.sin(a) * 0.5, -0.2, 1, 0.022, 0.016)); }   // plecy
    // Cieniowanie: pachy i dół brzucha ciemniejsze, barki i kark jaśniejsze (głębia futra)
    bodyGeos.forEach(gm => bakeShade(gm, (x, y, z) => 0.78 + 0.32 * smooth(-0.3, 0.22, y) - 0.18 * smooth(0.12, 0.2, Math.abs(x)) * (1 - smooth(0.05, 0.18, y)) + 0.05 * (z < 0 ? 1 : 0)));
    fur.vertexColors = true;
    g.userData.chest = ellMesh(bodyGeos, fur);
    g.add(g.userData.chest);
    // Łysy placek na piersi (dwa mięśnie piersiowe) i brzuchu
    g.add(ellMesh([ellGeo(0.075, 0.085, 0.022, -0.062, -0.035, -0.125), ellGeo(0.075, 0.085, 0.022, 0.062, -0.035, -0.125), ellGeo(0.1, 0.1, 0.02, 0, -0.19, -0.125)], face));
    if (k.back) g.add(meshAt(ellGeo(0.17, 0.17, 0.02, 0, -0.02, 0.138), new THREE.MeshStandardMaterial({ map: furTexture(), color: k.back, roughness: 0.9 }), 0, 0, 0));
    const badge = buildBadge(look.badge);
    if (badge) { badge.position.set(0.11, 0.09, -0.112); g.add(badge); }
    if (k.cape) {
        const cape = meshAt(new THREE.BoxGeometry(0.5, 0.62, 0.02), new THREE.MeshStandardMaterial({ color: 0x9a0a10, roughness: 0.7, side: THREE.DoubleSide }), 0, -0.14, 0.17);
        cape.rotation.x = 0.12; g.add(cape);
        for (const s of [-1, 1]) g.add(meshAt(new THREE.SphereGeometry(0.03, 10, 8), new THREE.MeshStandardMaterial({ color: 0xd4a640, metalness: 1, roughness: 0.25 }), s * 0.18, 0.15, -0.1));
    }
    if (k.tail) {   // skórka Furas: puchaty, zadarty ogon (merda w createAvatar); łańcuch elips z kępkami sierści i jasną kitką
        const tg = new THREE.Group(), geos = [];
        tg.position.set(0, -0.23, 0.12);
        for (let i = 0; i < 7; i++) {
            const y = 0.0075 * i * i, z = 0.04 + i * 0.046, r = 0.04 + Math.min(i, 5) * 0.0075;
            geos.push(ellGeo(r, r, r * 1.05, 0, y, z));
            for (let j = 0; j < 5; j++) { const a = j * 1.2566 + i * 0.7; geos.push(tuftGeo(Math.cos(a) * r * 0.7, y + Math.sin(a) * r * 0.7, z, Math.cos(a), Math.sin(a), 0.35, 0.034, 0.016)); }
        }
        geos.forEach((gm, i) => bakeShade(gm, (x, y, z) => 0.85 + 0.25 * smooth(0, 0.3, y)));
        tg.add(ellMesh(geos, fur));
        const tip = meshAt(new THREE.SphereGeometry(0.058, 14, 10), new THREE.MeshStandardMaterial({ map: furTexture(), color: 0xfff6ec, roughness: 0.95 }), 0, 0.0075 * 49 + 0.012, 0.04 + 7 * 0.046); tip.scale.set(1, 1.15, 1.05); tg.add(tip);
        g.add(tg); g.userData.tail = tg;
    }
    if (k.bunnyTail) {   // Therian: mały, okrągły, puszysty ogonek królika (merda jak ogon Furasa)
        const tg = new THREE.Group(), white = new THREE.MeshStandardMaterial({ map: furTexture(), color: 0xfff6f0, roughness: 0.98 });
        tg.position.set(0, -0.2, 0.16); tg.add(meshAt(new THREE.SphereGeometry(0.06, 14, 10), white, 0, 0, 0.02));
        for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; tg.add(meshAt(new THREE.SphereGeometry(0.025, 8, 6), white, Math.cos(a) * 0.05, Math.sin(a) * 0.05, 0.03)); }
        g.add(tg); g.userData.tail = tg;
    }
    if (SCARY) {   // kościane kolce na barkach i grzbiecie oraz ślady pazurów na piersi
        const sp = [];
        for (const sx of [-1, 1]) for (let i = 0; i < 3; i++) { const a = 0.5 + i * 0.5; sp.push(toothGeo(0, 0, 0, 0.05 - i * 0.01, 0.014, true).rotateZ(-sx * (0.9 - i * 0.5)).translate(sx * (0.215 + Math.sin(a) * 0.085), 0.145 + Math.cos(a) * 0.085, 0.01)); }
        for (let i = 0; i < 4; i++) sp.push(toothGeo(0, 0, 0, 0.045, 0.013, true).rotateX(Math.PI / 2 + 0.2).translate(0, 0.14 - i * 0.075, 0.15 + (i % 2) * 0.01));
        g.add(ellMesh(sp, BONE()));
        const red = new THREE.MeshStandardMaterial({ color: 0x701010, roughness: 0.6 });
        for (let i = 0; i < 3; i++) { const m = meshAt(new THREE.BoxGeometry(0.1, 0.006, 0.004), red, -0.05 + i * 0.014, 0.02 - i * 0.026, -0.149); m.rotation.z = 0.7; g.add(m); }
    }
    return g;
}
// Ramię goryla: cylinder od barku do nadgarstka, ustawiany co klatkę
// Profil ramienia (promień wg wysokości 0 = bark .. 1 = nadgarstek): masywna ręka, zwężenie w łokciu, mocne przedramię
const ARM_GEO = new THREE.LatheGeometry([[0.07, 0], [0.088, 0.1], [0.09, 0.28], [0.066, 0.5], [0.074, 0.68], [0.062, 0.88], [0.05, 1]].map(p => new THREE.Vector2(p[0], p[1])), 14);
export function createGorillaArm(look) { const m = new THREE.Mesh(ARM_GEO, furMat(look)); m.castShadow = true; return m; }
const _Y = new THREE.Vector3(0, 1, 0), _sh = new THREE.Vector3(), _hp = new THREE.Vector3(), _dir = new THREE.Vector3();
export function placeArm(arm, torso, side, hand) {
    _sh.set(side * 0.23, 0.15, 0.0); torso.localToWorld(_sh);
    hand.getWorldPosition(_hp);
    if (arm.parent) arm.parent.worldToLocal(_sh), arm.parent.worldToLocal(_hp);
    _dir.subVectors(_hp, _sh); const len = Math.max(0.05, _dir.length());
    const th = arm.userData.thick || 1;   // grubość ramienia rośnie razem z rozmiarem goryla (BagaBooModMenu SIZE), długość wynika z odległości do dłoni
    arm.position.copy(_sh); arm.quaternion.setFromUnitVectors(_Y, _dir.normalize()); arm.scale.set(th, len, th);
    arm.updateMatrixWorld(true);
}
// Młotki ekipy: Ban (obsydian z czerwoną energią) i Kick (złoto z elektrycznie żółtą energią).
// Metalowa główka z zaokrąglonymi krawędziami, świecące ścianki uderzeniowe, pierścienie energii,
// pulsujący pas rdzenia, płytki z napisem na czterech bokach, owinięta rękojeść, klejnot na końcu,
// poświata i iskry krążące wokół główki. Animuje się sam przy każdym rysowaniu (u ciebie i u innych).
const hammerCache = {};
function hammerTextures(key) {   // key: 'ban' | 'kick' | 'gooby' (Nothing Hammer)
    if (hammerCache[key]) return hammerCache[key];
    const ban = key === 'ban', gooby = key === 'gooby';
    const glow = gooby ? '#ff7ad9' : (ban ? '#ff2a1a' : '#ffd21a'), deep = gooby ? '#2a0a24' : (ban ? '#1a0606' : '#2a1e04'), text = gooby ? 'NOTHING' : (ban ? 'BAN' : 'KICK');
    // Płytka z napisem: ciemne tło, świecąca ramka z runami, jasny napis z poświatą
    const c = makeCanvas(512, 224), x = c.getContext('2d');
    x.fillStyle = deep; x.fillRect(0, 0, 512, 224);
    const gr = x.createLinearGradient(0, 0, 0, 224); gr.addColorStop(0, 'rgba(255,255,255,0.10)'); gr.addColorStop(1, 'rgba(0,0,0,0.25)'); x.fillStyle = gr; x.fillRect(0, 0, 512, 224);
    x.strokeStyle = glow; x.lineWidth = 10; x.shadowColor = glow; x.shadowBlur = 24; x.strokeRect(14, 14, 484, 196);
    x.lineWidth = 3; x.strokeRect(30, 30, 452, 164);
    x.font = 'bold 22px monospace'; x.fillStyle = glow; x.textAlign = 'center';
    for (let i = 0; i < 9; i++) { x.fillText('ᚱᛟᚾᛞᛖᚷ'[i % 6], 56 + i * 50, 48); x.fillText('ᛋᛏᚨᚠᚠ'[i % 5], 56 + i * 50, 196); }
    const lines = gooby ? [['NOTHING', 90], ['HAMMER', 158]] : [[text, 116]];   // Nothing Hammer: napis w dwóch linijkach
    x.font = 'bold ' + (gooby ? 68 : 104) + 'px sans-serif'; x.textBaseline = 'middle'; x.shadowBlur = 40; x.fillStyle = '#ffffff'; for (const [s, yy] of lines) x.fillText(s, 256, yy);
    x.shadowBlur = 0; x.fillStyle = glow; x.globalAlpha = 0.35; for (const [s, yy] of lines) x.fillText(s, 256, yy); x.globalAlpha = 1;
    // Owijka rękojeści: skośne paski skóry
    const w = makeCanvas(128, 256), wx = w.getContext('2d');
    wx.fillStyle = ban ? '#1a0e0a' : '#2a1a0a'; wx.fillRect(0, 0, 128, 256);
    for (let y = -128; y < 384; y += 28) { wx.fillStyle = ban ? '#3a1410' : '#5a3a14'; wx.beginPath(); wx.moveTo(0, y); wx.lineTo(128, y + 40); wx.lineTo(128, y + 56); wx.lineTo(0, y + 16); wx.fill(); }
    // Świecąca tarcza uderzeniowa: koncentryczne pierścienie energii
    const d = makeCanvas(256, 256), dx = d.getContext('2d');
    const rg = dx.createRadialGradient(128, 128, 4, 128, 128, 128);
    rg.addColorStop(0, '#ffffff'); rg.addColorStop(0.25, glow); rg.addColorStop(0.7, deep); rg.addColorStop(1, '#000000');
    dx.fillStyle = rg; dx.fillRect(0, 0, 256, 256);
    dx.strokeStyle = glow; dx.lineWidth = 6; for (const r of [60, 92, 118]) { dx.beginPath(); dx.arc(128, 128, r, 0, 7); dx.stroke(); }
    const label = toTex(c, false), wrap = toTex(w, true), disc = toTex(d, false);
    wrap.repeat.set(1, 3);
    return (hammerCache[key] = { label: label, wrap: wrap, disc: disc, glow: new THREE.Color(glow) });
}
export function buildHammer(tool) {
    if (tool !== 'kick' && tool !== 'ban' && tool !== 'gooby') return null;
    const ban = tool === 'ban', gooby = tool === 'gooby', tx = hammerTextures(tool), g = new THREE.Group();
    const glowCol = tx.glow.getHex();
    const metal = new THREE.MeshPhysicalMaterial({ color: gooby ? 0xd890c8 : (ban ? 0x1c1c22 : 0xc8a030), metalness: 1, roughness: ban ? 0.22 : 0.18, clearcoat: 1, clearcoatRoughness: 0.15, envMapIntensity: Math.max(1.0, ENV * 2) });
    const trim = new THREE.MeshPhysicalMaterial({ color: gooby ? 0xffd0f0 : (ban ? 0x8a1010 : 0xffe080), metalness: 1, roughness: 0.15, clearcoat: 1, envMapIntensity: Math.max(1.0, ENV * 2) });
    const energy = new THREE.MeshStandardMaterial({ color: glowCol, emissive: glowCol, emissiveIntensity: 2.2, roughness: 0.3, toneMapped: false });
    // Rękojeść z owijką, metalowe okucia i klejnot na końcu
    const handle = meshAt(new THREE.CylinderGeometry(0.019, 0.023, 0.4, 16), new THREE.MeshStandardMaterial({ map: tx.wrap, roughness: 0.75, bumpMap: tx.wrap, bumpScale: 1.5 }), 0, 0, -0.2); handle.rotation.x = Math.PI / 2; g.add(handle);
    for (const z of [-0.02, -0.38]) { const ring = meshAt(new THREE.TorusGeometry(0.026, 0.006, 10, 24), trim, 0, 0, z); g.add(ring); }
    const pommel = meshAt(new THREE.SphereGeometry(0.03, 20, 14), metal, 0, 0, 0.02); g.add(pommel);
    const gem = meshAt(new THREE.OctahedronGeometry(0.018, 0), energy, 0, 0, 0.05); g.add(gem);
    // Główka: zaokrąglona metalowa bryła z kołnierzem
    const head = meshAt(new RoundedBoxGeometry(0.28, 0.14, 0.14, 5, 0.025), metal, 0, 0, -0.44); g.add(head);
    const collar = meshAt(new THREE.CylinderGeometry(0.04, 0.03, 0.05, 16), trim, 0, 0, -0.38); collar.rotation.x = Math.PI / 2; g.add(collar);
    // Dwa pulsujące pasy energii przy końcach główki (środek zostaje wolny na napis) i obręcze przy ściankach uderzeniowych
    for (const bx of [-0.112, 0.112]) g.add(meshAt(new THREE.BoxGeometry(0.014, 0.146, 0.146), energy, bx, 0, -0.44));
    for (const sx of [-1, 1]) {
        const rim = meshAt(new THREE.TorusGeometry(0.058, 0.007, 10, 32), energy, sx * 0.142, 0, -0.44); rim.rotation.y = Math.PI / 2; g.add(rim);
        const face = meshAt(new THREE.CircleGeometry(0.055, 32), new THREE.MeshBasicMaterial(gooby ? { map: goobyTexture(), transparent: true, toneMapped: false } : { map: tx.disc, toneMapped: false }), sx * 0.1415, 0, -0.44); face.rotation.y = sx * Math.PI / 2; g.add(face);
        const trimRing = meshAt(new THREE.TorusGeometry(0.066, 0.006, 8, 32), trim, sx * 0.13, 0, -0.44); trimRing.rotation.y = Math.PI / 2; g.add(trimRing);
    }
    // Płytki z napisem na trzech bokach (góra, dół i czoło od strony przeciwnej do rękojeści), lekko nad powierzchnią
    const plateMat = new THREE.MeshBasicMaterial({ map: tx.label, toneMapped: false });
    const plates = [];
    for (const [px, py, pz, rx, ry] of [[0, 0.0735, -0.44, -Math.PI / 2, 0], [0, -0.0735, -0.44, Math.PI / 2, 0], [0, 0, -0.5135, 0, Math.PI]]) {
        const pl = meshAt(new THREE.PlaneGeometry(0.19, 0.083), plateMat, px, py, pz); pl.rotation.set(rx, ry, 0); pl.castShadow = false; g.add(pl); plates.push(pl);
    }
    // Poświata i iskry krążące wokół główki
    const aura = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex.dot, color: glowCol, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.55 }));
    aura.scale.set(0.55, 0.38, 1); aura.position.set(0, 0, -0.44); g.add(aura);
    const sparkN = 24, sp = new Float32Array(sparkN * 3), sgeo = new THREE.BufferGeometry(); sgeo.setAttribute('position', new THREE.BufferAttribute(sp, 3));
    const sparks = new THREE.Points(sgeo, new THREE.PointsMaterial({ map: tex.dot, color: glowCol, size: 0.018, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    sparks.frustumCulled = false; g.add(sparks);
    const seeds = Array.from({ length: sparkN }, () => [Math.random() * 6.28, 0.09 + Math.random() * 0.06, (Math.random() - 0.5) * 0.25, 1.5 + Math.random() * 2.5]);
    // Animacja: pulsowanie energii, migotanie poświaty, obrót klejnotu, krążące iskry
    head.onBeforeRender = () => {
        const t = performance.now() / 1000, pulse = 0.5 + 0.5 * Math.sin(t * (ban ? 5 : 7));
        energy.emissiveIntensity = 1.6 + pulse * 1.8;
        aura.material.opacity = 0.35 + pulse * 0.35; aura.scale.set(0.5 + pulse * 0.12, 0.34 + pulse * 0.08, 1);
        gem.rotation.y = t * 2; gem.rotation.x = t * 1.3;
        for (let i = 0; i < sparkN; i++) {
            const [a0, r, x0, sp2] = seeds[i], a = a0 + t * sp2;
            sp[i * 3] = x0; sp[i * 3 + 1] = Math.cos(a) * r; sp[i * 3 + 2] = -0.44 + Math.sin(a) * r;
        }
        sgeo.attributes.position.needsUpdate = true;
    };
    g.userData.headOffset = new THREE.Vector3(0, 0, -0.44);
    return g;
}
export function lookKey(look) { return [look.name, look.hideTag ? 1 : 0, look.color, look.skin, look.badge, look.tool, look.hat, look.glasses, look.mask, look.sleeve, look.gloves, Array.isArray(look.roleTags) ? look.roleTags.join(',') : ''].join('|'); }
// Stały napis nad głową (ULTIMATE ADMIN, OWNER)
export function roleLabel(text, color, glow) {
    const c = makeCanvas(512, 96), x = c.getContext('2d');
    x.font = 'bold 60px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillStyle = 'rgba(8,6,6,0.7)'; x.beginPath(); x.roundRect(10, 8, 492, 80, 24); x.fill();
    x.shadowColor = glow; x.shadowBlur = 20; x.fillStyle = color; x.fillText(text, 256, 50);
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: toTex(c, false), transparent: true, depthWrite: false, depthTest: false }));
    sp.scale.set(0.8, 0.15, 1); sp.renderOrder = 951;
    return sp;
}
// Napis z rolą (OWNER, ULTIMATE ADMIN, CO-ADMIN, ADMIN, MODERATOR) nad nickiem, chyba że gracz go ukrył
// Poziomy z ukrywaniem (Hide and Seek) ustawiają hidden = true: nazwy graczy nie świecą wtedy przez ściany
export const TAGS = { hidden: false };
export function addRoleTag(head, look) {
    let list = look.cheater ? [{ text: 'CHEATER', color: '#ff2a2a', glow: '#ff0000' }] : roleTagsFor(look.name);   // napisu CHEATER nie da się ukryć
    if (!look.cheater && Array.isArray(look.roleTags) && list.length > 1) { const pick = list.filter(r => look.roleTags.includes(r.id)); if (pick.length) list = pick; }   // gracz z kilkoma rolami (BoyIsGamer) wybiera, które napisy (1 do 3) pokazać
    if (!list.length || (look.hideTag && !look.cheater)) return null;
    let first = null;
    list.forEach((r, i) => {   // najwyższa rola na samej górze, kolejne pod nią (OWNER, ADMIN, MODERATOR)
        const lab = roleLabel(r.text, r.color, r.glow); lab.position.set(0, 0.67 + (list.length - 1 - i) * 0.17, 0); head.add(lab);
        (head.userData.tags = head.userData.tags || []).push(lab);
        if (!first) first = lab;
    });
    return first;
}
export const ULTIMATE_SCALE = 4;   // ultimate admin: skala awatara 4 (zmniejszona o połowę z 8)
export function createAvatar(look) {
    const group = new THREE.Group(), ult = look.skin === 'ultimate', sc = ult ? ULTIMATE_SCALE : 1;
    const torso = createGorillaTorso(look); torso.scale.setScalar(sc); group.add(torso);
    const head = createHead(look, true); head.scale.setScalar(sc); group.add(head);
    const handL = createRealHand(true, look), handR = createRealHand(false, look);
    handL.scale.setScalar(sc); handR.scale.setScalar(sc);
    const armL = createGorillaArm(look), armR = createGorillaArm(look);
    if (ult) for (const a of [armL, armR]) a.geometry = a.geometry.clone().scale(sc, 1, sc);
    group.add(handL, handR, armL, armR);
    const hammer = buildHammer(look.tool); if (hammer) handR.add(hammer);   // inni gracze widzą młotek w dłoni
    // Ramiona dociągane do dłoni tuż przed rysowaniem
    // Oddychanie: klatka piersiowa lekko pulsuje (każdy avatar ma własną fazę). Zmiana skali działa od następnej klatki, więc jest płynna.
    const breathPh = Math.random() * 6.28, chest = torso.userData.chest;
    torso.userData.chest.onBeforeRender = () => {
        placeArm(armL, torso, -1, handL); placeArm(armR, torso, 1, handR);
        const b = Math.sin(performance.now() * 0.0016 + breathPh) * 0.5 + 0.5;
        chest.scale.set(1 + b * 0.012, 1 + b * 0.022, 1 + b * 0.03);
        if (torso.userData.tail) { const tm = performance.now() * 0.004 + breathPh; torso.userData.tail.rotation.y = Math.sin(tm) * 0.32; torso.userData.tail.rotation.x = Math.sin(tm * 0.5) * 0.06; }   // ogon Furas merda
    };
    return { group, torso, head, handL, handR, armL, armR, base: sc, key: lookKey(look), torsoDrop: 0.35 * sc };
}

// Mimika przy rozmowie: level 0..1 (głośność), pitch 0..1 (wysokość głosu).
// Głośniej = szerzej otwarte usta, uniesione brwi i większe oczy; wyższy głos = węższe, bardziej okrągłe usta.
export function animateFace(head, level, pitch, dt) {
    const f = head && head.userData.face; if (!f) return;
    f.level += (level - f.level) * Math.min(1, dt * (level > f.level ? 22 : 10));
    const L = f.level, p = pitch || 0.5;
    if (f.mouth) {
        f.mouth.scale.y = 0.12 + L * 0.95; f.mouth.scale.x = (1.15 - p * 0.45 + L * 0.15) * (f.wide || 1);
        if (f.jaw) { f.mouth.position.y = -0.081 - 0.035 * f.mouth.scale.y; f.jaw.position.y = -0.081 - 0.07 * f.mouth.scale.y; }   // górne zęby stoją, dolna szczęka schodzi w dół
    }
    if (f.brow) f.brow.position.y = (f.browY || 0.058) + L * 0.018 + (p - 0.5) * 0.008;
    // Mruganie co 2-5 s (powieka: oko spłaszcza się na ułamek sekundy)
    f.blinkT -= dt; if (f.blinkT <= 0) { f.blink = 0.13; f.blinkT = 2 + Math.random() * 3.5; }
    let lid = 1; if (f.blink > 0) { f.blink -= dt; lid = Math.max(0.08, Math.abs(f.blink / 0.13 - 0.5) * 2); }
    for (const e of f.eyes) { const sc = 1 + L * 0.35; e.scale.set(sc, sc * lid, sc); }
}
