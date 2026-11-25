// ==========================================
// TYROLKA W ANEKSIE LOBBY (oprawa 3D; reguły w czystym core/ziplogic.js, układ w core/annexlayout.js; testy: tests/logic.mjs i tests/annex.mjs).
// Ściana zachodnia aneksu: 10 uchwytów do wspinaczki, platforma na szczycie, lina do dołu i uchwyt na linie. Dotknięcie uchwytu dłonią zabiera gracza w dół
// ze stałą prędkością 4 m/s (komfortowo poniżej limitu 7 m/s), na końcu puszcza. Lokalne, bez nagród.
// ==========================================
import { THREE, CANNON, L, addStaticBody } from './engine.js';
import * as T from './textures.js';
import { hands, playerBody } from './player.js';
import * as SFX from './audio.js';
import * as Z from './ziplogic.js';

let G = null;
const _w = new THREE.Vector3();

export function buildAnnexZip(flickers) {
    const root = L.root, A = Z.ZIP.A, B = Z.ZIP.B, P = Z.PLATFORM;
    G = { geos: [], mats: [], texs: [], st: Z.newZip(), force: false, ret: 0, pos: A.slice(), rides: 0, clock: 0 };
    const geo = (g) => { G.geos.push(g); return g; }, mat = (m) => { G.mats.push(m); return m; };
    const red = mat(new THREE.MeshStandardMaterial({ color: 0xc01010, emissive: 0xff1a0a, emissiveIntensity: 0.5, roughness: 0.4 })), steel = mat(new THREE.MeshStandardMaterial({ color: 0x8a8d92, metalness: 0.9, roughness: 0.3 }));
    const hG = geo(new THREE.BoxGeometry(0.8, 0.25, 0.9));
    for (const p of Z.zipHolds()) { const m = new THREE.Mesh(hG, red); m.position.set(p[0], p[1], p[2]); m.castShadow = true; root.add(m); addStaticBody(p[0], p[1], p[2], new CANNON.Box(new CANNON.Vec3(0.4, 0.125, 0.45)), m, false); }
    const plat = new THREE.Mesh(geo(new THREE.BoxGeometry(P.w, P.h, P.d)), mat(new THREE.MeshStandardMaterial({ color: 0x8a1010, emissive: 0x400000, metalness: 0.4, roughness: 0.4 }))); plat.position.set(P.x, P.y, P.z); plat.castShadow = true; root.add(plat);
    addStaticBody(P.x, P.y, P.z, new CANNON.Box(new CANNON.Vec3(P.w / 2, P.h / 2, P.d / 2)), plat, false);
    // Lina (cienki walec od A do B) i słupki kotwiczące
    const dir = new THREE.Vector3(B[0] - A[0], B[1] - A[1], B[2] - A[2]), len = dir.length(), cable = new THREE.Mesh(geo(new THREE.CylinderGeometry(0.012, 0.012, len, 6)), steel);
    cable.position.set((A[0] + B[0]) / 2, (A[1] + B[1]) / 2, (A[2] + B[2]) / 2); cable.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize()); root.add(cable);
    const postG = geo(new THREE.BoxGeometry(0.12, 1.2, 0.12)); const a1 = new THREE.Mesh(postG, steel); a1.position.set(A[0], A[1] + 0.1, A[2] + 0.5); root.add(a1);
    const endPost = new THREE.Mesh(geo(new THREE.BoxGeometry(0.12, B[1] + 0.9, 0.12)), steel); endPost.position.set(B[0], (B[1] + 0.9) / 2 - 0.3, B[2] - 0.5); root.add(endPost);
    addStaticBody(B[0], (B[1] + 0.9) / 2 - 0.3, B[2] - 0.5, new CANNON.Box(new CANNON.Vec3(0.06, (B[1] + 0.9) / 2, 0.06)), endPost, false);
    // Uchwyt: poprzeczka na krótkich linkach
    const h = new THREE.Group(); root.add(h); G.handle = h;
    const bar = new THREE.Mesh(geo(new THREE.CylinderGeometry(0.025, 0.025, 0.5, 8)), mat(new THREE.MeshStandardMaterial({ color: 0xffd060, emissive: 0x805010, emissiveIntensity: 0.8, metalness: 0.5, roughness: 0.4 }))); bar.rotation.z = Math.PI / 2; bar.position.y = -0.2; h.add(bar);
    for (const sx of [-0.2, 0.2]) { const r = new THREE.Mesh(geo(new THREE.CylinderGeometry(0.008, 0.008, 0.2, 5)), steel); r.position.set(sx, -0.1, 0); h.add(r); }
    const glow = new THREE.Sprite(mat(new THREE.SpriteMaterial({ color: 0xffc050, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.45 }))); glow.scale.set(0.7, 0.7, 1); glow.position.y = -0.2; h.add(glow); G.glow = glow;
    // Tabliczka przy początku wspinaczki
    const c = T.makeCanvas(512, 256), x = c.getContext('2d'); x.fillStyle = '#120a06'; x.fillRect(0, 0, 512, 256); x.strokeStyle = '#c8a040'; x.lineWidth = 6; x.strokeRect(5, 5, 502, 246); x.textAlign = 'center'; x.fillStyle = '#ffd27a'; x.font = 'bold 54px "Courier New", monospace'; x.fillText('ZIPLINE', 256, 82);
    x.font = '28px "Courier New", monospace'; x.fillStyle = '#d8c8b0'; x.fillText('Climb the red holds,', 256, 140); x.fillText('touch the golden handle.', 256, 180); x.fillText('Hold on, it lets go itself!', 256, 222);
    const tx = T.toTex(c, false); G.texs.push(tx); const sign = new THREE.Mesh(geo(new THREE.PlaneGeometry(1.9, 0.95)), mat(new THREE.MeshBasicMaterial({ map: tx, toneMapped: false }))); sign.position.set(-14.93, 2.9, 23.8); sign.rotation.y = Math.PI / 2; root.add(sign);
    const l = new THREE.PointLight(0xffb070, 14, 14, 2); l.position.set(-12, 6, 30); root.add(l); flickers.push({ l: l, base: 14, ph: Math.random() * 100, subtle: true });
    L.reserved.push([-13, 30, 4.5]);
    place();
}
function place() { G.handle.position.set(G.pos[0], G.pos[1], G.pos[2]); }

function handNear() {
    for (const h of [hands.L, hands.R]) { if (!h) continue; h.getWorldPosition(_w); if (Math.hypot(_w.x - G.pos[0], _w.y - (G.pos[1] - 0.2), _w.z - G.pos[2]) < Z.ZIP.REACH) return true; }
    return false;
}
export function updateAnnexZip(dt, t) {
    if (!G) return; G.clock += dt;
    const near = G.force || (G.st.ph === 'idle' && G.st.cd <= 0 && handNear()); G.force = false;
    const r = Z.zipStep(G.st, near, dt); G.st = r.st;
    if (r.body) { playerBody.position.set(r.body[0], r.body[1], r.body[2]); if (r.vel) playerBody.velocity.set(r.vel[0], r.vel[1], r.vel[2]); }
    if (r.event === 'start') { G.rides++; SFX.beep && SFX.beep(400, 0.06, 0.4); }
    if (r.event === 'end') { G.ret = 0; SFX.beep && SFX.beep(260, 0.06, 0.25); }
    if (G.st.ph === 'ride') G.pos = r.pos;
    else { G.ret = Math.min(1, G.ret + dt / Z.ZIP.COOLDOWN); const e = Z.zipPoint(Z.zipLength()), a = Z.ZIP.A; G.pos = G.ret >= 1 && !r.body ? a.slice() : [e[0] + (a[0] - e[0]) * G.ret, e[1] + (a[1] - e[1]) * G.ret, e[2] + (a[2] - e[2]) * G.ret]; if (G.st.cd <= 0) G.pos = a.slice(); }
    place(); G.glow.material.opacity = G.st.ph === 'idle' && G.st.cd <= 0 ? 0.35 + 0.2 * Math.sin(t * 3) : 0.1;
}
export function disposeAnnexZip() { if (!G) return; for (const g of G.geos) g.dispose(); for (const m of G.mats) m.dispose(); for (const x of G.texs) x.dispose(); G = null; }
export const debugAnnexZip = () => G ? { ph: G.st.ph, s: G.st.s, cd: G.st.cd, rides: G.rides, pos: G.pos.slice(), body: [playerBody.position.x, playerBody.position.y, playerBody.position.z] } : null;   // dla testów
export function debugZipGrab() { if (G) G.force = true; }
