// ==========================================
// MANEKIN (gipsowa figura z połamanymi pozami). Wspólny dla lobby i labiryntu.
// ==========================================
import { THREE, tex, place, seg, V3, UNIT_SPHERE, UNIT_BOX } from './engine.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { LP } from './config.js';

const ENV = LP.envIntensity;
const plasterMat = new THREE.MeshStandardMaterial({ map: tex.plaster, bumpMap: tex.plaster, bumpScale: 0.7, color: 0xd8d0c2, roughness: 0.55, envMapIntensity: ENV });
const darkJoint = new THREE.MeshStandardMaterial({ color: 0x101012, roughness: 0.4, metalness: 0.6, envMapIntensity: ENV });
const voidMat = new THREE.MeshBasicMaterial({ color: 0x000000 }), eyeGlowMat = new THREE.MeshBasicMaterial({ color: 0xff2200 });
const ARM_POSES = [
    (s) => [V3(s * 0.03, -0.30, 0.02), V3(0, -0.28, 0.05)], (s) => [V3(s * 0.06, -0.08, 0.26), V3(0, 0.02, 0.26)],
    (s) => [V3(s * 0.14, 0.25, 0.04), V3(s * 0.04, 0.27, 0.05)], (s) => [V3(s * 0.25, -0.10, -0.05), V3(-s * 0.15, -0.22, 0.12)],
    (s) => [V3(s * 0.10, -0.18, 0.18), V3(-s * 0.12, 0.20, 0.12)], (s) => [V3(s * 0.05, -0.25, -0.12), V3(0, -0.20, -0.20)],
    (s) => [V3(s * 0.30, 0.05, 0.0), V3(s * 0.28, 0.0, 0.0)], (s) => [V3(s * 0.02, -0.15, 0.25), V3(-s * 0.02, -0.26, 0.22)]
];
const jit = (R, k) => V3((R() - 0.5) * k, (R() - 0.5) * k, (R() - 0.5) * k);
function buildArm(S, s, body, joints, R) {
    const pose = ARM_POSES[(R() * ARM_POSES.length) | 0](s);
    const E = S.clone().add(pose[0]).add(jit(R, 0.05)), W = E.clone().add(pose[1]).add(jit(R, 0.05));
    body.push(seg(S, E, 0.038, 0.032, 7)); body.push(seg(E, W, 0.032, 0.026, 7));
    joints.push(place(UNIT_SPHERE, E.x, E.y, E.z, 0, 0, 0, 0.038, 0.038, 0.038)); joints.push(place(UNIT_SPHERE, W.x, W.y, W.z, 0, 0, 0, 0.03, 0.03, 0.03));
    const d = new THREE.Vector3().subVectors(W, E).normalize(), palmEnd = W.clone().addScaledVector(d, 0.085);
    body.push(seg(W, palmEnd, 0.026, 0.022, 5));
    const p = new THREE.Vector3().crossVectors(d, V3(0, 1, 0)); if (p.lengthSq() < 0.01) p.set(1, 0, 0); p.normalize();
    for (let i = 0; i < 5; i++) {
        const F0 = palmEnd.clone().addScaledVector(p, (i - 2) * 0.014), d1 = d.clone().addScaledVector(p, (i - 2) * 0.15).add(jit(R, 0.3)).normalize();
        const len1 = (i === 0 || i === 4) ? 0.055 : 0.07, Mid = F0.clone().addScaledVector(d1, len1), d2 = d1.clone().add(jit(R, 0.9)).normalize(), Tip = Mid.clone().addScaledVector(d2, len1 * 0.85);
        body.push(seg(F0, Mid, 0.009, 0.007, 4)); body.push(seg(Mid, Tip, 0.007, 0.004, 4));
    }
}
function buildLeg(s, body, joints, R) {
    const H = V3(s * 0.09, 0.93, 0), kneeZ = R() < 0.4 ? 0.1 + R() * 0.12 : (R() - 0.5) * 0.05;
    const K = V3(H.x + s * 0.01, 0.50, kneeZ), A = V3(H.x + (R() - 0.5) * 0.04, 0.06, (R() - 0.5) * 0.08);
    body.push(seg(H, K, 0.062, 0.045, 7)); body.push(seg(K, A, 0.045, 0.03, 7));
    joints.push(place(UNIT_SPHERE, K.x, K.y, K.z, 0, 0, 0, 0.047, 0.047, 0.047)); joints.push(place(UNIT_SPHERE, A.x, A.y, A.z, 0, 0, 0, 0.033, 0.033, 0.033));
    body.push(seg(A, V3(A.x + (R() - 0.5) * 0.05, 0.03, A.z + 0.2), 0.03, 0.022, 5));
}
export function buildMannequin(R) {
    const body = [], joints = [], hp = [], hv = [], hg = [];
    body.push(place(new THREE.CylinderGeometry(0.17, 0.125, 0.56, 10, 1), 0, 1.29, 0, 0, 0, 0, 1, 1, 0.58));
    body.push(place(UNIT_SPHERE, 0, 1.55, 0, 0, 0, 0, 0.19, 0.06, 0.1)); body.push(place(UNIT_SPHERE, 0, 0.97, 0, 0, 0, 0, 0.14, 0.1, 0.09));
    joints.push(seg(V3(0, 1.54, 0), V3(0, 1.69, 0), 0.03, 0.027, 6));
    for (const s of [-1, 1]) joints.push(place(UNIT_SPHERE, s * 0.2, 1.54, 0, 0, 0, 0, 0.045, 0.045, 0.045));
    const noArm = R() < 0.28 ? (R() < 0.5 ? -1 : 1) : 0;
    for (const s of [-1, 1]) if (s !== noArm) buildArm(V3(s * 0.2, 1.54, 0), s, body, joints, R);
    if (R() < 0.18) { const s3 = R() < 0.5 ? -1 : 1; buildArm(V3(s3 * 0.12, 1.35, 0.07), s3, body, joints, R); }
    buildLeg(-1, body, joints, R); buildLeg(1, body, joints, R);
    hp.push(place(UNIT_SPHERE, 0, 0.14, 0, 0, 0, 0, 0.092, 0.128, 0.105)); hp.push(place(UNIT_SPHERE, 0, 0.04, 0.035, 0, 0, 0, 0.055, 0.06, 0.065));
    hp.push(place(UNIT_BOX, 0, 0.12, 0.098, 0.25, 0, 0, 0.018, 0.055, 0.03));
    for (const s of [-1, 1]) hv.push(place(UNIT_SPHERE, s * 0.04, 0.15, 0.07, 0, 0, 0, 0.027, 0.034, 0.03));
    const wide = R() < 0.25;
    hv.push(place(UNIT_BOX, 0, 0.055, 0.098, 0, 0, 0, wide ? 0.075 : 0.045, wide ? 0.02 : 0.005, 0.02));
    if (R() < 0.4) for (const s of [-1, 1]) hg.push(place(UNIT_SPHERE, s * 0.04, 0.152, 0.1, 0, 0, 0, 0.011, 0.011, 0.011));
    const g = new THREE.Group(), lean = new THREE.Group(); g.add(lean);
    const bm = new THREE.Mesh(mergeGeometries(body), plasterMat); bm.castShadow = true; bm.receiveShadow = true; lean.add(bm);
    const jm = new THREE.Mesh(mergeGeometries(joints), darkJoint); jm.castShadow = true; lean.add(jm);
    const head = new THREE.Group(); head.position.set(0, 1.69, 0); head.rotation.order = 'YXZ'; lean.add(head);
    const hm = new THREE.Mesh(mergeGeometries(hp), plasterMat); hm.castShadow = true; hm.receiveShadow = true; head.add(hm);
    head.add(new THREE.Mesh(mergeGeometries(hv), voidMat));
    if (hg.length) head.add(new THREE.Mesh(mergeGeometries(hg), eyeGlowMat));
    const extreme = R() < 0.25;
    head.rotation.z = extreme ? (R() < 0.5 ? -1 : 1) * (1.0 + R() * 0.6) : (R() - 0.5) * 0.9;
    head.rotation.x = (R() - 0.3) * 0.7;
    lean.rotation.z = (R() - 0.5) * 0.22; lean.rotation.x = (R() - 0.5) * 0.2;
    return { group: g, head: head };
}
