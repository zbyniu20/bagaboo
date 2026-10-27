// ==========================================
// WSPÓLNE KLOCKI POZIOMÓW: drzwi z przejściem, panele przed oczami (HUD, instrukcja), jumpscare z twarzą.
// Dzięki temu poprawka np. drzwi zmienia jeden plik zamiast czterech.
// ==========================================
import { THREE, L, tex, camera, addStaticBody, addBlobAO, CANNON } from './engine.js';
import { LP } from './config.js';
import * as T from './textures.js';
import { buildMannequin } from './mannequin.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import * as SFX from './audio.js';

// Świecący napis na ciemnym tle
export function signTexture(label, color, bg, font) {
    const c = T.makeCanvas(512, 128), x = c.getContext('2d');
    x.fillStyle = bg || '#060404'; x.fillRect(0, 0, 512, 128);
    x.font = font || 'bold 72px serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.shadowColor = color; x.shadowBlur = 24; x.fillStyle = color; x.fillText(label, 256, 66);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    return t;
}
// Zardzewiałe skrzydło drzwi z krwawym odciskiem dłoni
function rustDoorTexture(seed) {
    const dc = T.makeCanvas(256, 512), dx = dc.getContext('2d'), R = T.mkRng(seed);
    dx.fillStyle = '#3a1612'; dx.fillRect(0, 0, 256, 512);
    for (let i = 0; i < 4000; i++) { dx.fillStyle = 'rgba(' + (R() > 0.5 ? '120,60,20' : '0,0,0') + ',' + (R() * 0.25) + ')'; dx.fillRect(R() * 256, R() * 512, 2, 2); }
    dx.strokeStyle = 'rgba(0,0,0,0.6)'; dx.lineWidth = 6; dx.strokeRect(24, 30, 208, 200); dx.strokeRect(24, 270, 208, 210);
    T.handPrint(dx, 140, 250, 1.1, 0.2, R);
    dx.fillStyle = '#c8a040'; dx.beginPath(); dx.arc(210, 270, 10, 0, 7); dx.fill();
    return T.toTex(dc, false);
}

// Drzwi. o = { x, z, rotY (kierunek, w który patrzą), label, color (napis, css), glow (hex),
//   rust (zardzewiałe skrzydło), wood (kolor drewnianego skrzydła), signY, signZ, hanging (napis na linkach),
//   collider, light, ao, grate (krata przed drzwiami), portal: { target, spawn, onEnter } }
export function buildDoor(o) {
    const g = new THREE.Group(); g.position.set(o.x, o.y || 0, o.z); g.rotation.y = o.rotY || 0; L.root.add(g);
    const ENV = LP.envIntensity;
    const frame = new THREE.MeshStandardMaterial({ color: 0x1c1416, metalness: 0.7, roughness: 0.45, envMapIntensity: ENV });
    const add = (geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; g.add(m); return m; };
    for (const s of [-1, 1]) add(new THREE.BoxGeometry(0.14, 2.45, 0.16), frame, s * 0.72, 1.22, 0.12);
    add(new THREE.BoxGeometry(1.58, 0.16, 0.16), frame, 0, 2.38, 0.12);
    const panelMat = o.rust
        ? new THREE.MeshStandardMaterial({ map: rustDoorTexture(o.label.length * 1013), roughness: 0.6, metalness: 0.3, envMapIntensity: ENV })
        : new THREE.MeshStandardMaterial({ map: tex.wood, color: o.wood || 0x6a7a8a, roughness: 0.6 });
    add(new THREE.BoxGeometry(1.3, 2.3, 0.06), panelMat, 0, 1.15, 0.1);
    if (o.glow !== undefined) { const leak = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 0.05), new THREE.MeshBasicMaterial({ color: o.glow })); leak.position.set(0, 0.03, 0.15); g.add(leak); }
    const signY = o.signY || 2.75, signZ = o.signZ || 0.14;
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.45, 0.36), new THREE.MeshBasicMaterial({ map: signTexture(o.label, o.color), toneMapped: false, transparent: true }));
    sign.position.set(0, signY, signZ); g.add(sign);
    if (o.hanging) for (const s of [-1, 1]) { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.9, 4), frame); c.position.set(s * 0.6, signY + 0.6, signZ); g.add(c); }
    if (o.glow !== undefined) {
        const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex.dot, color: o.glow, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.5 }));
        glow.scale.set(3.0, 1.5, 1); glow.position.set(0, signY, signZ + 0.12); g.add(glow);
    }
    let grate = null;
    if (o.grate) {
        const bars = [];
        for (let i = 0; i < 7; i++) bars.push(new THREE.CylinderGeometry(0.025, 0.025, 2.3, 6).translate(-0.6 + i * 0.2, 1.15, 0.2));
        grate = new THREE.Mesh(mergeGeometries(bars), new THREE.MeshStandardMaterial({ color: 0x2a2624, metalness: 0.85, roughness: 0.35 })); g.add(grate);
    }
    const f = new THREE.Vector3(Math.sin(o.rotY || 0), 0, Math.cos(o.rotY || 0));   // kierunek do wnętrza pokoju
    if (o.collider) addStaticBody(o.x + f.x * 0.1, (o.y || 0) + 1.2, o.z + f.z * 0.1, new CANNON.Box(new CANNON.Vec3(Math.abs(f.z) > 0.5 ? 0.8 : 0.08, 1.2, Math.abs(f.z) > 0.5 ? 0.08 : 0.8)), g, false);
    if (o.ao) addBlobAO(o.x + f.x * 0.6, o.z + f.z * 0.6, 2.2);
    if (o.light) { const l = new THREE.PointLight(o.glow !== undefined ? o.glow : 0xffffff, 4, 5, 2); l.position.set(o.x + f.x * 1.2, 2.6, o.z + f.z * 1.2); L.root.add(l); }
    const door = { group: g, sign: sign, grate: grate, f: f, x: o.x, y: o.y || 0, z: o.z };
    if (o.portal) addDoorPortal(door, o.portal);
    return door;
}
// Przejście przez drzwi: pudełko przed skrzydłem (wejście w nie zmienia poziom)
export function addDoorPortal(door, p) {
    const f = door.f, cx = door.x + f.x * 0.4, cz = door.z + f.z * 0.4, hx = Math.abs(f.x) > 0.5 ? 0.6 : 0.7, hz = Math.abs(f.z) > 0.5 ? 0.6 : 0.7;
    const y = door.y || 0;
    L.portals.push({ box3: new THREE.Box3(new THREE.Vector3(cx - hx, y - 0.5, cz - hz), new THREE.Vector3(cx + hx, y + 2.6, cz + hz)), target: p.target, spawn: p.spawn || null, opts: p.opts, onEnter: p.onEnter, cond: p.cond, deny: p.deny });
}

// Panel przed oczami gracza (HUD, instrukcja). Rysujesz na canvasie i wołasz update().
export function cameraPanel(cw, ch, w, h, y, z, order) {
    const canvas = T.makeCanvas(cw, ch), tx = new THREE.CanvasTexture(canvas); tx.colorSpace = THREE.SRGBColorSpace;
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tx, transparent: true, depthTest: false, toneMapped: false }));
    mesh.position.set(0, y, z); mesh.renderOrder = order || 990; camera.add(mesh);
    return { canvas: canvas, ctx: canvas.getContext('2d'), tex: tx, mesh: mesh, update() { tx.needsUpdate = true; }, dispose() { camera.remove(mesh); } };
}
// Tło panelu: zaokrąglony prostokąt
export function panelBg(p, fill, stroke) {
    const x = p.ctx, W = p.canvas.width, H = p.canvas.height;
    x.clearRect(0, 0, W, H);
    x.fillStyle = fill; x.beginPath(); x.roundRect(6, 6, W - 12, H - 12, 30); x.fill();
    if (stroke) { x.strokeStyle = stroke; x.lineWidth = 4; x.stroke(); }
}
// Instrukcja: tytuł, punkty z zawijaniem tekstu, stopka (np. odliczanie)
export function drawInstructions(p, title, lines, footer, theme) {
    const x = p.ctx, W = p.canvas.width, H = p.canvas.height;
    panelBg(p, theme.bg, theme.border);
    x.textAlign = 'center'; x.textBaseline = 'middle';
    x.font = 'bold 68px serif'; x.fillStyle = theme.title; x.fillText(title, W / 2, 80);
    x.textAlign = 'left'; x.font = (theme.size || 30) + 'px sans-serif'; x.fillStyle = theme.text;
    let y = 160; const lh = (theme.size || 30) + 9, maxW = W - 170;
    for (const line of lines) {
        const words = line.split(' '); let cur = '', first = true;
        for (const w of words) {
            const test = cur ? cur + ' ' + w : w;
            if (x.measureText(test).width > maxW) { x.fillText((first ? '•  ' : '    ') + cur, 64, y); y += lh; cur = w; first = false; } else cur = test;
        }
        x.fillText((first ? '•  ' : '    ') + cur, 64, y); y += lh + 14;
    }
    x.textAlign = 'center'; x.font = 'bold 40px "Courier New", monospace'; x.fillStyle = theme.footer;
    x.fillText(footer, W / 2, H - 56);
    p.update();
}

// Jumpscare: twarz wyskakuje z ciemności pod sam nos, czerwono-czarny stroboskop, głośny dźwięk.
// o = { head (własna głowa, domyślnie manekin), scale, y, restZ, fromZ, eyes }
export function createJumpscare(o) {
    o = o || {};
    let head = o.head;
    if (!head) { const m = buildMannequin(T.mkRng(o.seed || 4242)); head = m.head; head.parent.remove(head); }
    head.traverse((c) => { if (c.material) { c.material = c.material.clone(); c.material.depthTest = false; c.material.transparent = true; c.renderOrder = 1000; } });
    if (o.eyes !== false) for (const sx of [-1, 1]) { const e = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex.dot, color: 0xff1000, transparent: true, blending: THREE.AdditiveBlending, depthTest: false })); e.scale.set(0.16, 0.16, 1); e.position.set(sx * 0.04, 0.152, 0.1); e.renderOrder = 1001; head.add(e); }
    head.scale.setScalar(o.scale || 2.4);
    const plane = (col) => { const p = new THREE.Mesh(new THREE.PlaneGeometry(3, 3), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0, depthTest: false })); p.position.z = -0.25; return p; };
    const black = plane(0x000000), red = plane(0xff0000); black.renderOrder = 998; red.renderOrder = 999;
    const g = new THREE.Group(); g.add(black, red, head); g.visible = false; camera.add(g);
    const y = o.y !== undefined ? o.y : -0.36, rest = o.restZ !== undefined ? o.restZ : -0.32, from = o.fromZ !== undefined ? o.fromZ : -1.9;
    let t = -1;
    return {
        active() { return t >= 0; },
        trigger() { if (t >= 0) return false; t = 0; g.visible = true; SFX.scare(); return true; },
        update(dt) {
            if (t < 0) return;
            t += dt;
            const j = (a) => (Math.random() - 0.5) * a;
            const z = t < 0.1 ? from + (rest - from) * (t / 0.1) : rest;
            head.position.set(j(0.03), y + j(0.02), z + j(0.015));
            head.rotation.set((o.tilt || 0) + j(0.15), j(0.2), j(0.35));
            const ph = Math.floor(t / 0.05) % 3;
            if (t < 0.8) { red.material.opacity = ph === 0 ? 0.6 : 0; black.material.opacity = ph === 1 ? 0.92 : 0.5; }
            else { const f = Math.max(0, 1 - (t - 0.8) / 0.6); red.material.opacity = 0.35 * f; black.material.opacity = 0.6 * f; }
            if (t > 1.4) { g.visible = false; t = -1; }
        },
        dispose() { camera.remove(g); }
    };
}
