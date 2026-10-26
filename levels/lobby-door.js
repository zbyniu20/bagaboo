// ==========================================
// DODATEK DO LOBBY: drzwi do labiryntu i do trybu Cisza (na poziomie podłogi) oraz lustro
// ==========================================
import { THREE, L, tex, camera, addStaticBody, addBlobAO, CANNON } from '../core/engine.js';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { LP } from '../core/config.js';
import * as T from '../core/textures.js';
import { toast } from '../core/terminal.js';
import { createHead } from '../core/avatar.js';
import { getLook, onLookChange } from '../core/economy.js';

const DOOR_X = 4, SILENCE_X = -5, WALL_Z = 14.97;    // drzwi w południowej ścianie, na podłodze
export const ARRIVAL = [DOOR_X, 1.2, 13.2];          // tu pojawia się gracz po powrocie z labiryntu
export const ARRIVAL_SILENCE = [SILENCE_X, 1.2, 13.2];   // ...i po powrocie z trybu Cisza
const MIRROR = { x: -14.93, z: 3.2, w: 1.6, h: 2.3 };   // lustro na zachodniej ścianie, obok sklepu
const MIRROR_LAYER = 5;                          // warstwa widoczna tylko w lustrze (twoja głowa i tułów)
const ENV = LP.envIntensity;
let mirror = null, me = null, lookHooked = false;
const _p = new THREE.Vector3(), _q = new THREE.Quaternion(), _e = new THREE.Euler();

// Wołane przed budową lobby: manekiny nie staną przed drzwiami ani przed lustrem
export function prebuild() {
    L.reserved.push([DOOR_X, 13.4, 3.0], [SILENCE_X, 13.4, 3.0], [-13.6, MIRROR.z, 2.6]);
}

export function build() {
    buildDoor(DOOR_X, 'THE MAZE', '#ff6a40', 0xff3010, 'maze', 'You open the door...');
    buildDoor(SILENCE_X, 'SILENCE', '#9fc8ff', 0x3a7aff, 'silence', 'Shhh...');
    buildMirror();
}

function buildDoor(DX, label, textCol, glowCol, target, msg) {
    const g = new THREE.Group(); g.position.set(DX, 0, WALL_Z); g.rotation.y = Math.PI; L.root.add(g);
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x1c1416, metalness: 0.7, roughness: 0.45, envMapIntensity: ENV });
    const add = (geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; g.add(m); return m; };
    add(new THREE.BoxGeometry(0.14, 2.45, 0.16), frameMat, -0.72, 1.22, 0.12);
    add(new THREE.BoxGeometry(0.14, 2.45, 0.16), frameMat, 0.72, 1.22, 0.12);
    add(new THREE.BoxGeometry(1.58, 0.16, 0.16), frameMat, 0, 2.38, 0.12);
    // Skrzydło drzwi z rdzą i krwawym odciskiem dłoni
    const dc = T.makeCanvas(256, 512), dx = dc.getContext('2d'), R = T.mkRng(target === 'maze' ? 4040 : 5050);
    dx.fillStyle = '#3a1612'; dx.fillRect(0, 0, 256, 512);
    for (let i = 0; i < 4000; i++) { dx.fillStyle = 'rgba(' + (R() > 0.5 ? '120,60,20' : '0,0,0') + ',' + (R() * 0.25) + ')'; dx.fillRect(R() * 256, R() * 512, 2, 2); }
    dx.strokeStyle = 'rgba(0,0,0,0.6)'; dx.lineWidth = 6; dx.strokeRect(24, 30, 208, 200); dx.strokeRect(24, 270, 208, 210);
    T.handPrint(dx, 140, 250, 1.1, 0.2, R);
    dx.fillStyle = '#c8a040'; dx.beginPath(); dx.arc(210, 270, 10, 0, 7); dx.fill();
    const doorTex = T.toTex(dc, false);
    add(new THREE.BoxGeometry(1.3, 2.3, 0.06), new THREE.MeshStandardMaterial({ map: doorTex, bumpMap: doorTex, bumpScale: 1, roughness: 0.6, metalness: 0.3, envMapIntensity: ENV }), 0, 1.15, 0.12);
    // Czerwona poświata spod drzwi
    const leak = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 0.05), new THREE.MeshBasicMaterial({ color: glowCol })); leak.position.set(0, 0.03, 0.16); g.add(leak);
    // Napis wisi przed rurami na ścianie
    const sc = T.makeCanvas(512, 128), sx = sc.getContext('2d');
    sx.fillStyle = '#0c0404'; sx.fillRect(0, 0, 512, 128);
    sx.font = 'bold 70px serif'; sx.textAlign = 'center'; sx.textBaseline = 'middle'; sx.shadowColor = textCol; sx.shadowBlur = 26; sx.fillStyle = textCol;
    sx.fillText(label, 256, 66);
    const signTex = new THREE.CanvasTexture(sc); signTex.colorSpace = THREE.SRGBColorSpace;
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.38), new THREE.MeshBasicMaterial({ map: signTex, toneMapped: false })); sign.position.set(0, 3.5, 0.32); g.add(sign);
    for (const s of [-1, 1]) { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.9, 4), frameMat); c.position.set(s * 0.6, 4.1, 0.32); g.add(c); }
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex.dot, color: glowCol, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.55 }));
    glow.scale.set(3.2, 1.6, 1); glow.position.set(0, 3.5, 0.45); g.add(glow);
    addStaticBody(DX, 1.2, WALL_Z - 0.1, new CANNON.Box(new CANNON.Vec3(0.8, 1.2, 0.08)), g, false);
    addBlobAO(DX, 14.4, 2.2);
    L.portals.push({
        box3: new THREE.Box3(new THREE.Vector3(DX - 0.7, -0.5, 14.2), new THREE.Vector3(DX + 0.7, 2.6, 15.2)),
        target: target, spawn: null,
        onEnter: () => toast(msg, textCol)
    });
}

// Lustro: odbija lobby, twoje dłonie oraz twoją głowę z czapką i okularami
function buildMirror() {
    const g = new THREE.Group(); g.position.set(MIRROR.x, 0, MIRROR.z); g.rotation.y = Math.PI / 2; L.root.add(g);
    const gold = new THREE.MeshStandardMaterial({ color: 0x8a6a2a, metalness: 0.9, roughness: 0.35, envMapIntensity: Math.max(0.6, ENV) });
    const y0 = 0.25, W = MIRROR.w, H = MIRROR.h, b = 0.1;
    const add = (geo, x, y) => { const m = new THREE.Mesh(geo, gold); m.position.set(x, y, 0.05); m.castShadow = true; g.add(m); };
    add(new THREE.BoxGeometry(W + 2 * b, b, 0.08), 0, y0 - b / 2);
    add(new THREE.BoxGeometry(W + 2 * b, b, 0.08), 0, y0 + H + b / 2);
    add(new THREE.BoxGeometry(b, H, 0.08), -W / 2 - b / 2, y0 + H / 2);
    add(new THREE.BoxGeometry(b, H, 0.08), W / 2 + b / 2, y0 + H / 2);
    const back = new THREE.Mesh(new THREE.PlaneGeometry(W, H), new THREE.MeshStandardMaterial({ color: 0x1a1c1e, metalness: 0.9, roughness: 0.15 }));
    back.position.set(0, y0 + H / 2, 0.02); g.add(back);
    mirror = new Reflector(new THREE.PlaneGeometry(W, H), { textureWidth: 640, textureHeight: 920, color: 0xb0b0b0, clipBias: 0.003 });
    mirror.position.set(0, y0 + H / 2, 0.03); g.add(mirror);
    if (mirror.camera) mirror.camera.layers.enable(MIRROR_LAYER);
    addStaticBody(MIRROR.x + 0.05, 1.4, MIRROR.z, new CANNON.Box(new CANNON.Vec3(0.06, 1.4, W / 2 + b)), g, false);
    buildMe(getLook());
    if (!lookHooked) { lookHooked = true; onLookChange((look) => { if (me) buildMe(look); }); }
}
// Twoja głowa i tułów: niewidoczne dla ciebie, widoczne tylko w lustrze
function buildMe(look) {
    if (me) { L.root.remove(me.head); L.root.remove(me.torso); }
    const head = createHead(look, false);
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.6, 0.35), new THREE.MeshStandardMaterial({ color: new THREE.Color(look.color || '#3d2314'), roughness: 0.85 }));
    head.traverse(o => o.layers.set(MIRROR_LAYER)); torso.layers.set(MIRROR_LAYER);
    L.root.add(head); L.root.add(torso);
    me = { head: head, torso: torso };
}

export function update() {
    if (!mirror) return;
    camera.getWorldPosition(_p); camera.getWorldQuaternion(_q);
    // Lustro liczy odbicie tylko, gdy stoisz blisko i przed nim (oszczędza wydajność)
    mirror.visible = _p.x > MIRROR.x + 0.2 && Math.hypot(_p.x - MIRROR.x, _p.z - MIRROR.z) < 8;
    if (me) {
        me.head.position.copy(_p); me.head.quaternion.copy(_q);
        _e.setFromQuaternion(_q, 'YXZ');
        me.torso.position.set(_p.x, _p.y - 0.42, _p.z); me.torso.rotation.set(0, _e.y, 0);
    }
}
export function dispose() {
    if (mirror) { mirror.dispose(); mirror = null; }
    me = null;
}
