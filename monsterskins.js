// ==========================================
// SKÓRKI POTWORÓW (sklep, zakładka "BagaBoo Games") i model Lawowej Bestii z poziomu Burning Memory.
// Używane tylko w trybie Become the Monster: kto jest potworem, ten wygląda jak wybrany potwór.
// Każdy model ma środek w miejscu oczu (głowy), a ciało zwisa w dół, więc można go ustawić na pozycji głowy gracza.
// ==========================================
import { THREE, tex } from './engine.js';
import * as T from './textures.js';
import { buildMannequin } from './mannequin.js';

const box = (w, h, d, m, x, y, z) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); return o; };
const cyl = (r1, r2, h, m, x, y, z, seg) => { const o = new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, h, seg || 8), m); o.position.set(x, y, z); return o; };
const ball = (r, m, x, y, z) => { const o = new THREE.Mesh(new THREE.SphereGeometry(r, 16, 12), m); o.position.set(x, y, z); return o; };
function glowEye(col, s) { const e = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex.dot, color: col, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); e.scale.set(s, s, 1); return e; }

// Manekin z labiryntu
function mannequin() {
    const m = buildMannequin(T.mkRng(4242)), g = new THREE.Group();
    m.group.position.y = -1.62; g.add(m.group);
    for (const sx of [-1, 1]) { const e = glowEye(0xff2000, 0.1); e.position.set(sx * 0.04, 0.152, 0.11); m.head.add(e); }
    return { group: g, animate: (t) => { m.head.rotation.z = Math.sin(t * 7) * 0.08; } };
}
// Ślepiec z Ciszy: blady, wychudzony, bez oczu, z ogromną pionową paszczą
function blind() {
    const g = new THREE.Group(), skin = new THREE.MeshStandardMaterial({ color: 0xc8beb0, roughness: 0.6 }), dark = new THREE.MeshBasicMaterial({ color: 0x120404 });
    const head = ball(0.2, skin, 0, 0.05, 0); head.scale.set(0.9, 1.35, 1); g.add(head);
    const mouth = box(0.07, 0.32, 0.05, dark, 0, -0.02, 0.17); g.add(mouth);
    for (let i = 0; i < 6; i++) for (const sx of [-1, 1]) { const t = new THREE.Mesh(new THREE.ConeGeometry(0.012, 0.05, 5), new THREE.MeshStandardMaterial({ color: 0xeae2c8 })); t.position.set(sx * 0.03, -0.14 + i * 0.05, 0.19); t.rotation.z = sx * Math.PI / 2; g.add(t); }
    g.add(cyl(0.08, 0.13, 0.9, skin, 0, -0.75, 0));
    for (let i = 0; i < 5; i++) g.add(box(0.2, 0.012, 0.02, skin, 0, -0.45 - i * 0.09, 0.1));   // żebra
    for (const sx of [-1, 1]) { const a = cyl(0.025, 0.035, 1.3, skin, sx * 0.2, -0.95, 0.05); a.rotation.z = sx * 0.12; g.add(a); const l = cyl(0.03, 0.045, 1.0, skin, sx * 0.08, -1.7, 0); g.add(l); }
    return { group: g, animate: (t) => { mouth.scale.y = 0.8 + 0.3 * Math.sin(t * 9); head.rotation.z = Math.sin(t * 2) * 0.15; } };
}
// Smolisty Pełzacz ze Studni: czarna, lśniąca maź w kształcie postaci, ociekająca, z zielonymi oczami
function ooze() {
    const g = new THREE.Group(), tar = new THREE.MeshPhysicalMaterial({ color: 0x050505, roughness: 0.1, clearcoat: 1, clearcoatRoughness: 0.05 });
    const head = ball(0.17, tar, 0, 0, 0); head.scale.set(1, 1.2, 1); g.add(head);
    for (const sx of [-1, 1]) { const e = glowEye(0x40ff60, 0.12); e.position.set(sx * 0.06, 0.02, 0.15); g.add(e); }
    const blobs = [];
    for (let i = 0; i < 9; i++) { const b = ball(0.12 + Math.random() * 0.1, tar, (Math.random() - 0.5) * 0.25, -0.35 - i * 0.15, (Math.random() - 0.5) * 0.15); g.add(b); blobs.push(b); }
    for (let i = 0; i < 10; i++) { const d = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.2 + Math.random() * 0.3, 6), tar); d.position.set((Math.random() - 0.5) * 0.35, -0.3 - Math.random() * 1.0, (Math.random() - 0.5) * 0.2); d.rotation.x = Math.PI; g.add(d); }
    for (const sx of [-1, 1]) { const a = cyl(0.04, 0.06, 1.1, tar, sx * 0.24, -0.8, 0.05); a.rotation.z = sx * 0.2; g.add(a); }
    return { group: g, animate: (t) => { blobs.forEach((b, i) => { b.scale.setScalar(1 + Math.sin(t * 3 + i) * 0.08); }); } };
}
// Szmaciarz z Pralni: pasma prześcieradeł, kable i porcelanowa maska bez oczu
function threadman() {
    const g = new THREE.Group(), cloth = new THREE.MeshStandardMaterial({ color: 0xbab2a2, roughness: 0.95, side: THREE.DoubleSide }), cable = new THREE.MeshStandardMaterial({ color: 0x141414 });
    const c = T.makeCanvas(128, 128), x = c.getContext('2d');
    x.fillStyle = '#f2eee6'; x.fillRect(0, 0, 128, 128); x.strokeStyle = 'rgba(40,30,30,0.7)'; x.lineWidth = 2;
    for (let i = 0; i < 4; i++) { x.beginPath(); x.moveTo(30 + i * 20, 10); x.lineTo(40 + i * 16, 60); x.lineTo(30 + i * 22, 110); x.stroke(); }
    x.fillStyle = '#100808'; x.fillRect(40, 92, 48, 5);
    const mask = new THREE.Mesh(new THREE.SphereGeometry(0.16, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.62), new THREE.MeshPhysicalMaterial({ map: T.toTex(c, false), roughness: 0.12, clearcoat: 1 }));
    mask.rotation.x = Math.PI / 2; mask.scale.set(1, 1.5, 0.9); mask.position.z = 0.04; const mg = new THREE.Group(); mg.add(mask); mg.rotation.z = 0.32; g.add(mg);
    for (let i = 0; i < 4; i++) { const st = cyl(0.04, 0.08, 1.4, cloth, Math.cos(i * 1.6) * 0.06, -0.85, Math.sin(i * 1.6) * 0.04, 6); st.rotation.set(Math.sin(i) * 0.1, i * 0.8, Math.cos(i) * 0.1); g.add(st); }
    for (let i = 0; i < 4; i++) { const cb = cyl(0.01, 0.01, 0.9 + i * 0.15, cable, (i - 1.5) * 0.05, -0.7, 0.07, 5); g.add(cb); }
    for (const sx of [-1, 1]) { const a = cyl(0.03, 0.05, 1.7, cloth, sx * 0.2, -1.0, 0.05, 6); a.rotation.z = sx * 0.1; g.add(a); }
    return { group: g, animate: (t) => { mg.rotation.z = 0.32 + Math.sin(t * 1.5) * 0.1; } };
}
// Lawowa Bestia: bazaltowe cielsko z żarzącymi się pęknięciami, rogi, świecące oczy i paszcza
function lavaTex() {
    const c = T.makeCanvas(256, 256), x = c.getContext('2d'), R = T.mkRng(55);
    x.fillStyle = '#1a0c08'; x.fillRect(0, 0, 256, 256);
    x.strokeStyle = '#ff6a10'; x.shadowColor = '#ffb020'; x.shadowBlur = 8;
    for (let i = 0; i < 26; i++) { x.lineWidth = 1 + R() * 3; x.beginPath(); let px = R() * 256, py = R() * 256; x.moveTo(px, py); for (let k = 0; k < 5; k++) { px += (R() - 0.5) * 50; py += (R() - 0.5) * 50; x.lineTo(px, py); } x.stroke(); }
    return T.toTex(c, true);
}
let LAVA_TEX = null;
export function lavaBeast() {
    LAVA_TEX = LAVA_TEX || lavaTex();
    const g = new THREE.Group();
    const rock = new THREE.MeshStandardMaterial({ map: LAVA_TEX, emissiveMap: LAVA_TEX, emissive: 0xff5010, emissiveIntensity: 1.4, roughness: 0.85 });
    const horn = new THREE.MeshStandardMaterial({ color: 0x0a0604, roughness: 0.5 });
    const head = ball(0.24, rock, 0, 0, 0); head.scale.set(1.1, 0.95, 1.05); g.add(head);
    for (const sx of [-1, 1]) {
        const h = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.4, 8), horn); h.position.set(sx * 0.17, 0.2, -0.03); h.rotation.z = -sx * 0.6; g.add(h);
        const e = glowEye(0xffe060, 0.16); e.position.set(sx * 0.09, 0.03, 0.2); g.add(e);
    }
    const jaw = box(0.26, 0.08, 0.16, rock, 0, -0.18, 0.08); g.add(jaw);
    const maw = glowEye(0xff8020, 0.32); maw.position.set(0, -0.12, 0.22); g.add(maw);
    g.add(cyl(0.2, 0.3, 1.0, rock, 0, -0.8, 0, 10));
    const sh = box(0.8, 0.22, 0.32, rock, 0, -0.38, 0); g.add(sh);
    const armL = new THREE.Group(), armR = new THREE.Group(); armL.position.set(-0.42, -0.38, 0); armR.position.set(0.42, -0.38, 0);
    for (const [a, sx] of [[armL, -1], [armR, 1]]) { a.add(cyl(0.07, 0.11, 1.0, rock, 0, -0.5, 0)); const claw = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.25, 6), horn); claw.position.y = -1.05; claw.rotation.x = Math.PI; a.add(claw); a.rotation.z = sx * 0.25; g.add(a); }
    return { group: g, rock: rock, animate: (t) => { rock.emissiveIntensity = 1.2 + 0.5 * Math.sin(t * 4); armL.rotation.x = Math.sin(t * 5) * 0.6; armR.rotation.x = -Math.sin(t * 5) * 0.6; jaw.position.y = -0.18 - Math.abs(Math.sin(t * 3)) * 0.05; } };
}
export const MONSTER_SKINS = { mannequin: mannequin, blind: blind, ooze: ooze, thread: threadman, lava: lavaBeast };
export function buildMonsterSkin(id) { const f = MONSTER_SKINS[id]; return f ? f() : null; }
