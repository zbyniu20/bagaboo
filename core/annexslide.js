// ==========================================
// ZJEŻDŻALNIA W ANEKSIE LOBBY (oprawa 3D; reguły w core/slidelogic.js i railStep z core/ziplogic.js, układ w core/annexlayout.js; testy: tests/logic.mjs i tests/annex.mjs).
// Na szczycie toru Climb Rush (ściana wschodnia) jest platforma z dźwignią. Dotknięcie dźwigni dłonią wsadza gracza na rynnę i zjeżdża on na dół ze stałą prędkością
// 5 m/s (limit komfortu 7 m/s), na końcu lądowisko. Nad dzwonem są dwa ciemne uchwyty prowadzące do czaszki pod sufitem (sekret ceil). Lokalne, bez nagród.
// ==========================================
import { THREE, CANNON, L, addStaticBody } from './engine.js';
import { playerBody, hands } from './player.js';
import * as SFX from './audio.js';
import * as Z from './ziplogic.js';
import * as S from './slidelogic.js';

let G = null;
const _w = new THREE.Vector3();

export function buildAnnexSlide(flickers) {
    const root = L.root, P = S.PLAT_S;
    G = { geos: [], mats: [], st: Z.newZip(), force: false, rides: 0, cool: 0 };
    const geo = (g) => { G.geos.push(g); return g; }, mat = (m) => { G.mats.push(m); return m; };
    const plat = new THREE.Mesh(geo(new THREE.BoxGeometry(P.w, P.h, P.d)), mat(new THREE.MeshStandardMaterial({ color: 0x1a6a8a, emissive: 0x0a3040, metalness: 0.4, roughness: 0.4 }))); plat.position.set(P.x, P.y, P.z); plat.castShadow = true; root.add(plat);
    addStaticBody(P.x, P.y, P.z, new CANNON.Box(new CANNON.Vec3(P.w / 2, P.h / 2, P.d / 2)), plat, false);
    // Rynna: dno i dwa brzegi wzdłuż szyny
    const A = S.SLIDE.A, B = S.SLIDE.B, dir = new THREE.Vector3(B[0] - A[0], B[1] - A[1], B[2] - A[2]), L2 = dir.length(); dir.normalize();
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir), mid = [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2, (A[2] + B[2]) / 2];
    const chute = new THREE.Group(); chute.position.set(mid[0], mid[1] - 0.04, mid[2]); chute.quaternion.copy(q); root.add(chute);
    const floorM = mat(new THREE.MeshStandardMaterial({ color: 0x8a9aa8, metalness: 0.7, roughness: 0.25 })), railM = mat(new THREE.MeshStandardMaterial({ color: 0x1a6a8a, emissive: 0x0a3040, metalness: 0.4, roughness: 0.4 }));
    const dno = new THREE.Mesh(geo(new THREE.BoxGeometry(0.95, 0.06, L2)), floorM); chute.add(dno);
    for (const sx of [-0.5, 0.5]) { const r = new THREE.Mesh(geo(new THREE.BoxGeometry(0.06, 0.22, L2)), railM); r.position.set(sx, 0.1, 0); chute.add(r); }
    // Dźwignia: słupek i czerwona gałka
    const post = new THREE.Mesh(geo(new THREE.CylinderGeometry(0.025, 0.025, S.LEVER[1] - (P.y + P.h / 2), 8)), mat(new THREE.MeshStandardMaterial({ color: 0x8a8d92, metalness: 0.9, roughness: 0.3 }))); post.position.set(S.LEVER[0], (S.LEVER[1] + P.y + P.h / 2) / 2, S.LEVER[2]); root.add(post);
    const knob = new THREE.Mesh(geo(new THREE.SphereGeometry(0.075, 12, 10)), mat(new THREE.MeshStandardMaterial({ color: 0xff2a1a, emissive: 0xc01008, emissiveIntensity: 0.9 }))); knob.position.set(S.LEVER[0], S.LEVER[1], S.LEVER[2]); root.add(knob); G.knob = knob;
    // Ukryte uchwyty nad dzwonem: ciemne, ledwo widoczne
    const dark = mat(new THREE.MeshStandardMaterial({ color: 0x12121a, emissive: 0x0c0c26, emissiveIntensity: 0.6, roughness: 0.5 })), hG = geo(new THREE.BoxGeometry(0.8, 0.25, 0.9));
    for (const h of S.SECRET_HOLDS) { const m = new THREE.Mesh(hG, dark); m.position.set(h[0], h[1], h[2]); root.add(m); addStaticBody(h[0], h[1], h[2], new CANNON.Box(new CANNON.Vec3(0.4, 0.125, 0.45)), m, false); }
    const l = new THREE.PointLight(0x60a0ff, 9, 9, 2); l.position.set(12, 13, 36.5); root.add(l); flickers.push({ l: l, base: 9, ph: Math.random() * 100, subtle: true });
    L.reserved.push([12.5, 30, 3.5]);
}
function leverNear() { for (const h of [hands.L, hands.R]) { if (!h) continue; h.getWorldPosition(_w); if (Math.hypot(_w.x - S.LEVER[0], _w.y - S.LEVER[1], _w.z - S.LEVER[2]) < S.SLIDE.REACH) return true; } return false; }
export function updateAnnexSlide(dt, t) {
    if (!G) return;
    const near = G.force || (G.st.ph === 'idle' && G.st.cd <= 0 && leverNear()); G.force = false;
    const r = Z.railStep(S.SLIDE, G.st, near, dt); G.st = r.st;
    if (r.body) { playerBody.position.set(r.body[0], r.body[1], r.body[2]); if (r.vel) playerBody.velocity.set(r.vel[0], r.vel[1], r.vel[2]); }
    if (r.event === 'start') { G.rides++; SFX.beep && SFX.beep(520, 0.06, 0.5); }
    if (r.event === 'end') SFX.beep && SFX.beep(240, 0.06, 0.25);
    G.knob.material.emissiveIntensity = G.st.ph === 'idle' && G.st.cd <= 0 ? 0.6 + 0.4 * Math.sin(t * 4) : 0.1;
}
export function disposeAnnexSlide() { if (!G) return; for (const g of G.geos) g.dispose(); for (const m of G.mats) m.dispose(); G = null; }
export const debugAnnexSlide = () => G ? { ph: G.st.ph, s: G.st.s, rides: G.rides, body: [playerBody.position.x, playerBody.position.y, playerBody.position.z] } : null;   // dla testów
export function debugSlideGrab() { if (G) G.force = true; }
