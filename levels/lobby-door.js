// ==========================================
// DODATEK DO LOBBY: drzwi do poziomów, lustro, czerwona trasa Parkour King i napis z nazwą gry
// ==========================================
import { THREE, L, tex, camera, addStaticBody, addBlobAO, CANNON } from '../core/engine.js';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { LP } from '../core/config.js';
import * as T from '../core/textures.js';
import { toast } from '../core/terminal.js';
import { createHead, createGorillaTorso, createGorillaArm, placeArm, buildHat } from '../core/avatar.js';
import { getLook, onLookChange, unlockItem } from '../core/economy.js';
import { hands } from '../core/player.js';
import * as SFX from '../core/audio.js';

const DOOR_X = 4, SILENCE_X = -5, WELL_X = 9.5, WALL_Z = 14.97;    // drzwi w południowej ścianie, na podłodze
export const ARRIVAL = [DOOR_X, 1.2, 13.2];          // tu pojawia się gracz po powrocie z labiryntu
export const ARRIVAL_SILENCE = [SILENCE_X, 1.2, 13.2];   // ...po powrocie z trybu Cisza
export const ARRIVAL_WELL = [WELL_X, 1.2, 13.2];         // ...i po powrocie ze Studni
const MIRROR = { x: -14.93, z: 3.2, w: 1.6, h: 2.3 };   // lustro na zachodniej ścianie, obok sklepu
const MIRROR_LAYER = 5;                          // warstwa widoczna tylko w lustrze (twoja głowa i tułów)
const ENV = LP.envIntensity;
let mirror = null, me = null, lookHooked = false;
const _p = new THREE.Vector3(), _q = new THREE.Quaternion(), _e = new THREE.Euler();

// Wołane przed budową lobby: manekiny nie staną przed drzwiami ani przed lustrem
export function prebuild() {
    L.reserved.push([DOOR_X, 13.4, 3.0], [SILENCE_X, 13.4, 3.0], [WELL_X, 13.4, 3.0], [-13.6, MIRROR.z, 2.6], [12, -13.4, 2.2]);
}

export function build() {
    buildDoor(DOOR_X, 'THE MAZE', '#ff6a40', 0xff3010, 'maze', 'You open the door...');
    buildDoor(SILENCE_X, 'SILENCE', '#9fc8ff', 0x3a7aff, 'silence', 'Shhh...');
    buildDoor(WELL_X, 'THE WELL', '#b8ffcf', 0x30ff90, 'well', 'Do not look down...');
    buildMirror();
    buildRoute();
    buildTitle();
}

function buildDoor(DX, label, textCol, glowCol, target, msg) {
    const g = new THREE.Group(); g.position.set(DX, 0, WALL_Z); g.rotation.y = Math.PI; L.root.add(g);
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x1c1416, metalness: 0.7, roughness: 0.45, envMapIntensity: ENV });
    const add = (geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; g.add(m); return m; };
    add(new THREE.BoxGeometry(0.14, 2.45, 0.16), frameMat, -0.72, 1.22, 0.12);
    add(new THREE.BoxGeometry(0.14, 2.45, 0.16), frameMat, 0.72, 1.22, 0.12);
    add(new THREE.BoxGeometry(1.58, 0.16, 0.16), frameMat, 0, 2.38, 0.12);
    // Skrzydło drzwi z rdzą i krwawym odciskiem dłoni
    const dc = T.makeCanvas(256, 512), dx = dc.getContext('2d'), R = T.mkRng(target.length * 1013);
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
// Twoja postać goryla: niewidoczna dla ciebie, widoczna tylko w lustrze
function buildMe(look) {
    if (me) for (const o of [me.head, me.torso, me.armL, me.armR]) L.root.remove(o);
    const head = createHead(look, false), torso = createGorillaTorso(look), armL = createGorillaArm(look), armR = createGorillaArm(look);
    for (const o of [head, torso, armL, armR]) { o.traverse(c => c.layers.set(MIRROR_LAYER)); L.root.add(o); }
    me = { head: head, torso: torso, armL: armL, armR: armR };
}

// ---------- CZERWONA TRASA "PARKOUR KING" ----------
// Bardzo trudna: małe uchwyty, duże odstępy, śliskie ściany obok. Trzeba dotknąć 3 punktów kontrolnych
// w jednym podejściu (dotknięcie podłogi = od nowa), a na końcu korony. Nagroda: skórka Parkour King.
const ROUTE = [
    [12.0, 1.4, -14.6, 1], [10.8, 2.3, -14.6], [9.4, 3.1, -14.6], [8.0, 4.0, -14.6], [6.4, 4.6, -14.6], [5.0, 5.6, -14.6],
    [3.4, 6.3, -14.6], [1.8, 7.3, -14.6], [0.4, 8.0, -14.6, 1], [-1.2, 8.9, -14.6], [-2.9, 9.6, -14.6], [-4.4, 10.6, -13.4],
    [-6.2, 11.4, -14.6], [-7.6, 12.5, -13.0], [-9.4, 13.2, -14.6], [-10.6, 14.4, -13.4, 1], [-14.6, 15.3, -12.0], [-13.0, 16.2, -10.8], [-14.6, 17.0, -12.4]
];
const FINAL = [-12.9, 17.9, -13.7];
const SLIPPERY_WALL = 0.25;   // ściany przy trasie (północna i zachodnia) są śliskie
let route = null;
function buildRoute() {
    // Śliskie ściany: bez uchwytów trudno się po nich wspinać
    for (const o of L.obstacles) { const b = o.box3; if ((b.max.z <= -14.9 && b.min.z < -19) || (b.max.x <= -14.9 && b.min.x < -19)) o.grip = SLIPPERY_WALL; }
    const red = new THREE.MeshStandardMaterial({ color: 0xc01010, emissive: 0xff1a0a, emissiveIntensity: 0.55, roughness: 0.4 });
    const holds = [], dots = [], ropes = [];
    ROUTE.forEach((r, i) => {
        const [x, y, z, cp] = r, onX = x <= -14.5, floating = !onX && z > -14;
        const sx = cp ? 0.6 : (onX ? 0.5 : 0.42), sz = cp ? 0.6 : (onX ? 0.42 : 0.5);
        const mat = cp ? new THREE.MeshStandardMaterial({ color: 0xff2a10, emissive: 0xff2a10, emissiveIntensity: 1.0, roughness: 0.3 }) : red;
        const m = new THREE.Mesh(new THREE.BoxGeometry(sx, 0.22, sz), mat); m.position.set(x, y, z); m.castShadow = true; L.root.add(m);
        addStaticBody(x, y, z, new CANNON.Box(new CANNON.Vec3(sx / 2, 0.11, sz / 2)), m, false);
        holds.push({ mesh: m, ob: L.obstacles[L.obstacles.length - 1], cp: !!cp, mat: mat });
        if (floating) ropes.push(new THREE.CylinderGeometry(0.008, 0.008, 19.9 - y, 4).translate(x, (19.9 + y) / 2, z));
        if (i > 0) { const p = ROUTE[i - 1]; for (let k = 1; k < 5; k++) { const t = k / 5; dots.push(new THREE.SphereGeometry(0.035, 6, 4).translate(p[0] + (x - p[0]) * t, p[1] + (y - p[1]) * t, p[2] + (z - p[2]) * t)); } }
    });
    const last = ROUTE[ROUTE.length - 1];
    for (let k = 1; k < 5; k++) { const t = k / 5; dots.push(new THREE.SphereGeometry(0.035, 6, 4).translate(last[0] + (FINAL[0] - last[0]) * t, last[1] + (FINAL[1] - last[1]) * t, last[2] + (FINAL[2] - last[2]) * t)); }
    L.root.add(new THREE.Mesh(mergeGeometries(dots), new THREE.MeshBasicMaterial({ color: 0xff3020 })));
    if (ropes.length) L.root.add(new THREE.Mesh(mergeGeometries(ropes), new THREE.MeshStandardMaterial({ color: 0x1a1a1a, metalness: 0.8 })));
    // Platforma z koroną
    const plat = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.25, 1.4), new THREE.MeshStandardMaterial({ color: 0x8a1010, emissive: 0x400000, metalness: 0.4, roughness: 0.4 }));
    plat.position.set(FINAL[0], FINAL[1], FINAL[2]); plat.castShadow = true; L.root.add(plat);
    addStaticBody(FINAL[0], FINAL[1], FINAL[2], new CANNON.Box(new CANNON.Vec3(0.7, 0.125, 0.7)), plat, false);
    const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 0.4, 16), new THREE.MeshStandardMaterial({ color: 0x1a1a1a, metalness: 0.8, roughness: 0.3 }));
    ped.position.set(FINAL[0], FINAL[1] + 0.32, FINAL[2]); L.root.add(ped);
    const crown = buildHat('crown'); crown.scale.setScalar(2.6); crown.position.set(FINAL[0], FINAL[1] + 0.12, FINAL[2]); L.root.add(crown);
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex.dot, color: 0xffc840, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.7 }));
    glow.scale.set(2, 2, 1); glow.position.set(FINAL[0], FINAL[1] + 0.9, FINAL[2]); L.root.add(glow);
    const light = new THREE.PointLight(0xffc840, 5, 5, 2); light.position.set(FINAL[0], FINAL[1] + 1.2, FINAL[2]); L.root.add(light);
    // Tabliczka przy starcie
    const sc = T.makeCanvas(1024, 384), x = sc.getContext('2d');
    x.fillStyle = '#120404'; x.fillRect(0, 0, 1024, 384);
    x.strokeStyle = '#ff2a10'; x.lineWidth = 8; x.strokeRect(10, 10, 1004, 364);
    x.textAlign = 'center'; x.textBaseline = 'middle';
    x.font = 'bold 92px serif'; x.fillStyle = '#ff3a20'; x.shadowColor = '#ff2a10'; x.shadowBlur = 20; x.fillText('PARKOUR KING ROUTE', 512, 110); x.shadowBlur = 0;
    x.font = '38px sans-serif'; x.fillStyle = '#f0d8d0';
    x.fillText('Follow the red holds to the crown.', 512, 210);
    x.fillText('Touch all 3 bright checkpoints in one climb.', 512, 262);
    x.fillText('Touch the floor and you start over.', 512, 314);
    const st = new THREE.CanvasTexture(sc); st.colorSpace = THREE.SRGBColorSpace;
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 0.75), new THREE.MeshBasicMaterial({ map: st, toneMapped: false })); sign.position.set(12.2, 0.75, -14.88); L.root.add(sign);
    route = { holds: holds, cps: holds.filter(h => h.cp), next: 0, crown: crown, glow: glow, msgT: 0 };
}
function resetRoute() {
    route.next = 0;
    for (const h of route.cps) { h.mat.color.set(0xff2a10); h.mat.emissive.set(0xff2a10); }
}
function updateRoute(dt, t, p) {
    if (!route || !hands.L) return;
    route.msgT = Math.max(0, route.msgT - dt);
    route.crown.rotation.y = t * 0.8;
    route.glow.material.opacity = 0.5 + 0.25 * Math.sin(t * 3);
    for (let i = 0; i < route.cps.length; i++) if (i >= route.next) route.cps[i].mat.emissiveIntensity = 0.7 + 0.4 * Math.sin(t * 5 + i);
    if (route.next > 0 && p.y < 0.6) { resetRoute(); toast('You touched the floor. Back to the start!', '#ff6a4a'); }
    const near = (b) => b.distanceToPoint(hands.L.position) < 0.3 || b.distanceToPoint(hands.R.position) < 0.3;
    const cp = route.cps[route.next];
    if (cp && near(cp.ob.box3)) {
        route.next++; cp.mat.color.set(0x30ff60); cp.mat.emissive.set(0x20c040);
        SFX.fuse(); toast('Checkpoint ' + route.next + '/' + route.cps.length, '#7fc47f');
    }
    _p.set(FINAL[0], FINAL[1] + 0.5, FINAL[2]);
    if (hands.L.position.distanceTo(_p) < 0.55 || hands.R.position.distanceTo(_p) < 0.55) {
        if (route.next >= route.cps.length) {
            if (unlockItem('skin', 'king')) { SFX.fuse(); toast('PARKOUR KING unlocked! It is on you now.', '#ffd27a'); }
            else if (route.msgT <= 0) toast('You are already the Parkour King', '#ffd27a');
            route.msgT = 4; resetRoute();
        } else if (route.msgT <= 0) { toast('Touch all 3 red checkpoints in one climb first', '#ff6a4a'); route.msgT = 4; }
    }
}

// ---------- NAPIS NA ŚCIANIE ----------
function buildTitle() {
    const c = T.makeCanvas(2048, 360), tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace;
    const draw = () => {
        const x = c.getContext('2d');
        x.clearRect(0, 0, 2048, 360);
        x.textAlign = 'center'; x.textBaseline = 'middle';
        x.font = '210px Creepster, "Chiller", serif'; x.fillStyle = '#b00000'; x.shadowColor = 'rgba(255,60,0,0.9)'; x.shadowBlur = 40;
        x.fillText('BagaBoo VR', 1024, 140); x.shadowBlur = 0;
        const w = x.measureText('BagaBoo VR').width, R = T.mkRng(7);
        for (let i = 0; i < 26; i++) { const dx = 1024 - w / 2 + R() * w, len = 20 + R() * 70; x.fillStyle = 'rgba(150,0,0,0.9)'; x.fillRect(dx, 200, 5 + R() * 6, len); x.beginPath(); x.arc(dx + 4, 200 + len, 6, 0, 7); x.fill(); }
        x.font = 'italic 64px Georgia, serif'; x.fillStyle = '#e8dcc8'; x.shadowColor = 'rgba(0,0,0,0.8)'; x.shadowBlur = 10;
        x.fillText('made by BoyIsGamer', 1024, 318); x.shadowBlur = 0;
        tx.needsUpdate = true;
    };
    draw();
    if (document.fonts && document.fonts.load) document.fonts.load('210px Creepster').then(draw).catch(() => {});
    const m = new THREE.Mesh(new THREE.PlaneGeometry(14.5, 2.55), new THREE.MeshBasicMaterial({ map: tx, transparent: true, toneMapped: false, depthWrite: false }));
    m.position.set(0, 17.9, -14.9); L.root.add(m);
    for (const gx of [-4.5, 0, 4.5]) {
        const g = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex.dot, color: 0xff2a10, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.25 }));
        g.scale.set(7, 3, 1); g.position.set(gx, 17.9, -14.7); L.root.add(g);
    }
}

export function update(dt, t, ctx) {
    if (ctx && ctx.pos) updateRoute(dt, t, ctx.pos);
    if (!mirror) return;
    camera.getWorldPosition(_p); camera.getWorldQuaternion(_q);
    // Lustro liczy odbicie tylko, gdy stoisz blisko i przed nim (oszczędza wydajność)
    mirror.visible = _p.x > MIRROR.x + 0.2 && Math.hypot(_p.x - MIRROR.x, _p.z - MIRROR.z) < 8;
    if (me && mirror.visible) {
        me.head.position.copy(_p); me.head.quaternion.copy(_q);
        _e.setFromQuaternion(_q, 'YXZ');
        me.torso.position.set(_p.x, _p.y - 0.35, _p.z); me.torso.rotation.set(0, _e.y, 0);
        me.torso.updateMatrixWorld(true);
        if (hands.L) { placeArm(me.armL, me.torso, -1, hands.L); placeArm(me.armR, me.torso, 1, hands.R); }
    }
}
export function dispose() {
    if (mirror) { mirror.dispose(); mirror = null; }
    me = null; route = null;
}
