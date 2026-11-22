// ==========================================
// WSPÓLNE KLOCKI POZIOMÓW: drzwi z przejściem, panele przed oczami (HUD, instrukcja), jumpscare z twarzą.
// Dzięki temu poprawka np. drzwi zmienia jeden plik zamiast czterech.
// ==========================================
import { THREE, L, tex, camera, addStaticBody, addBlobAO, CANNON } from './engine.js';
import { LP } from './config.js';
import * as T from './textures.js';
import { buildMannequin } from './mannequin.js';
import { goobyTexture } from './gooby.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import * as SFX from './audio.js';
import { GAMES_CALM } from './settings.js';
import { toast } from './terminal.js';

// Świecący napis na ciemnym tle
export function signTexture(label, color, bg, font) {
    const c = T.makeCanvas(512, 128), x = c.getContext('2d');
    x.fillStyle = bg || '#060404'; x.fillRect(0, 0, 512, 128);
    // Napis zawsze mieści się w całości: czcionka zmniejsza się, aż tekst ma najwyżej 470 px szerokości
    let f = font || 'bold 72px serif', size = parseInt((f.match(/(\d+)px/) || [0, 72])[1], 10);
    x.font = f;
    while (x.measureText(label).width > 470 && size > 18) { size -= 2; f = f.replace(/\d+px/, size + 'px'); x.font = f; }
    x.textAlign = 'center'; x.textBaseline = 'middle';
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
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.45, 0.36), new THREE.MeshBasicMaterial({ map: signTexture(o.label, o.color, null, o.font), toneMapped: false, transparent: true }));
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
// o = { head (własna głowa, domyślnie manekin), scale, y, restZ, fromZ, eyes, gooby }
// o.gooby = true: zamiast głowy płaski obraz Gooby z głosem "gooby" (tylko Nothing Hammer, main.js); bez niego zawsze stary, straszny jumpscare.
// Napis NOOB na pół ekranu: czerwone litery z białym obrysem na czarnej tablicy (jumpscare od ultimate admina, main.js)
function noobTexture() {
    const c = T.makeCanvas(512, 256), x = c.getContext('2d');
    x.fillStyle = 'rgba(0,0,0,0.92)'; x.fillRect(0, 0, 512, 256); x.strokeStyle = '#ff2a2a'; x.lineWidth = 10; x.strokeRect(8, 8, 496, 240);
    x.font = 'bold 190px Impact, "Arial Black", sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.lineWidth = 14; x.strokeStyle = '#ffffff'; x.strokeText('NOOB', 256, 134);
    x.fillStyle = '#e01010'; x.shadowColor = '#ff0000'; x.shadowBlur = 30; x.fillText('NOOB', 256, 134);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
// Szczęka z kłami dla domyślnej głowy jumpscare'a (manekin): rozdziawiona, ciemnoczerwona paszcza, dwa rzędy zębów, krew z oczu; porusza się w update()
function buildMaw() {
    const g = new THREE.Group(), tooth = new THREE.MeshBasicMaterial({ color: 0xe6dcc0 }), blood = new THREE.MeshBasicMaterial({ color: 0x8a0a0a }), cavity = new THREE.MeshBasicMaterial({ color: 0x200000 });
    const mouth = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 10), cavity); mouth.scale.set(0.062, 0.05, 0.02); mouth.position.set(0, 0.045, 0.103); g.add(mouth);
    const up = [], lo = [];
    for (let i = -5; i <= 5; i++) {
        const big = Math.abs(i) === 3, len = big ? 0.034 : 0.019, x = i * 0.0108;
        const a = new THREE.ConeGeometry(0.0055, len, 5); a.rotateX(Math.PI); a.translate(x, 0.075 - len / 2, 0.108); up.push(a);
        if (i % 2 === 0 || big) { const b = new THREE.ConeGeometry(0.005, big ? 0.028 : 0.016, 5); b.translate(x * 0.9, 0.018 + (big ? 0.014 : 0.008), 0.108); lo.push(b); }
    }
    const upM = new THREE.Mesh(mergeGeometries(up), tooth), loM = new THREE.Mesh(mergeGeometries(lo), tooth); g.add(upM); g.userData.jaw = new THREE.Group(); g.userData.jaw.add(loM, mouth); g.add(g.userData.jaw);
    for (const sx of [-1, 1]) { const d = new THREE.Mesh(new THREE.CylinderGeometry(0.0035, 0.002, 0.06, 5), blood); d.position.set(sx * 0.04, 0.115, 0.105); g.add(d); }
    return g;
}
let VIGNETTE = null;
function vignetteTexture() {   // krwawa winieta: przezroczysty środek, czerwono-czarne brzegi, żyłki
    if (VIGNETTE) return VIGNETTE;
    const c = T.makeCanvas(256, 256), x = c.getContext('2d'), gr = x.createRadialGradient(128, 128, 40, 128, 128, 150);
    gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(0.6, 'rgba(60,0,0,0.55)'); gr.addColorStop(1, 'rgba(0,0,0,0.98)'); x.fillStyle = gr; x.fillRect(0, 0, 256, 256);
    x.strokeStyle = 'rgba(150,0,0,0.5)'; x.lineWidth = 2; const R = T.mkRng(77);
    for (let i = 0; i < 26; i++) { let a = R() * 6.283, r = 150, px = 128 + Math.cos(a) * r, py = 128 + Math.sin(a) * r; x.beginPath(); x.moveTo(px, py); for (let k = 0; k < 5; k++) { a += (R() - 0.5) * 0.5; r -= 12 + R() * 14; x.lineTo(128 + Math.cos(a) * r, 128 + Math.sin(a) * r); } x.stroke(); }
    return (VIGNETTE = new THREE.CanvasTexture(c));
}
export function createJumpscare(o) {
    o = o || {};
    const noob = !!o.noob, gooby = !!o.gooby || noob;   // noob: płaski napis NOOB (jak Gooby, tylko z innym obrazem i głosem)
    let head;
    if (gooby) {   // płaski obraz (core/gooby.js albo napis NOOB) centrowany przed oczami
        head = new THREE.Group();
        const face = new THREE.Mesh(new THREE.PlaneGeometry(noob ? 0.6 : 0.4, noob ? 0.3 : 0.4), new THREE.MeshBasicMaterial({ map: noob ? noobTexture() : goobyTexture(), transparent: true, depthTest: false, toneMapped: false }));
        face.renderOrder = 1000; head.add(face);
        head.scale.setScalar(2.3);
    } else {
        head = o.head;
        let maw = null;
        if (!head) { const m = buildMannequin(T.mkRng(o.seed || 4242)); head = m.head; head.parent.remove(head); maw = buildMaw(); head.add(maw); head.userData.maw = maw; }
        head.traverse((c) => { if (c.material) { c.material = c.material.clone(); c.material.depthTest = false; c.material.transparent = true; c.renderOrder = 1000; } });
        if (o.eyes !== false) for (const sx of [-1, 1]) { const e = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex.dot, color: 0xff1000, transparent: true, blending: THREE.AdditiveBlending, depthTest: false })); e.scale.set(0.17, 0.17, 1); e.position.set(sx * 0.04, 0.152, 0.1); e.renderOrder = 1001; head.add(e); (head.userData.eyes = head.userData.eyes || []).push(e); }
        head.scale.setScalar(o.scale || 2.4);
    }
    const plane = (col) => { const p = new THREE.Mesh(new THREE.PlaneGeometry(3, 3), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0, depthTest: false })); p.position.z = -0.25; return p; };
    const black = plane(0x000000), red = plane(o.flash !== undefined ? o.flash : 0xff0000), white = plane(0xffffff); black.renderOrder = 998; red.renderOrder = 999; white.renderOrder = 1002;
    const vig = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.6), new THREE.MeshBasicMaterial({ map: vignetteTexture(), transparent: true, opacity: 0, depthTest: false })); vig.position.z = -0.3; vig.renderOrder = 1003;
    const g = new THREE.Group(); g.add(black, red, head, white, vig); g.visible = false; camera.add(g);
    // Wszystko przy samych oczach: wyłączamy odrzucanie obiektów poza kadrem (w goglach potrafiło ukryć duże modele tuż przy kamerze)
    g.traverse((c) => { c.frustumCulled = false; });
    const y = gooby ? 0 : (o.y !== undefined ? o.y : -0.36), rest = gooby ? -0.4 : (o.restZ !== undefined ? o.restZ : -0.32), from = gooby ? -2.0 : (o.fromZ !== undefined ? o.fromZ : -1.9);
    let t = -1;
    return {
        active() { return t >= 0; },
        trigger() { if (t >= 0 || GAMES_CALM.on) return false;   // BagaBoo Games: bez jumpscare'ów
            t = 0; g.visible = true; SFX.scare(noob ? 'noob' : gooby); return true; },
        update(dt) {
            if (t < 0) return;
            t += dt;
            const j = (a) => (Math.random() - 0.5) * a, base = gooby ? 2.3 : (o.scale || 2.4), shake = t < 0.5 ? 1 : Math.max(0.35, 1.5 - t);
            let z = t < 0.08 ? from + (rest - from) * (t / 0.08) : rest;   // wyskok z ciemności w 0,08 s
            if (gooby) { z += Math.min(0.12, t * 0.1); head.scale.setScalar(base + Math.min(0.5, t * 0.45)); }   // Gooby po wyskoczeniu powoli najeżdża na twarz
            else { z += Math.min(0.06, Math.max(0, t - 0.08) * 0.05); head.scale.setScalar(base * (1 + 0.05 * Math.sin(t * 38) + Math.min(0.1, t * 0.08))); }   // reszta: nacieranie na twarz i drżenie rozmiaru
            head.position.set(j(0.05 * shake), y + j(0.035 * shake), z + j(0.025 * shake));
            head.rotation.set((o.tilt || 0) + j(0.22 * shake), j(0.3 * shake), j(0.5 * shake));
            const maw = head.userData.maw; if (maw) maw.userData.jaw.position.y = -0.028 * Math.abs(Math.sin(t * 17));   // szczęka kłapie
            if (head.userData.eyes) for (const e of head.userData.eyes) e.scale.setScalar(0.17 + 0.06 * Math.abs(Math.sin(t * 25)));
            const ph = Math.floor(t / 0.04) % 4;
            white.material.opacity = t < 0.07 ? 0.85 : (t < 0.4 && ph === 3 ? 0.35 : 0);   // biały błysk na starcie i krótkie rozbłyski
            if (t < 1.1) { red.material.opacity = ph === 0 || ph === 2 ? 0.65 : 0; black.material.opacity = ph === 1 ? 0.95 : 0.5; }
            else { const f = Math.max(0, 1 - (t - 1.1) / 0.8); red.material.opacity = 0.4 * f; black.material.opacity = 0.65 * f; }
            vig.material.opacity = Math.min(1, t * 6) * (t < 1.3 ? 1 : Math.max(0, 1 - (t - 1.3) / 0.6)); vig.scale.setScalar(1 - Math.min(0.25, t * 0.2));   // krwawa winieta zaciska się
            if (t > 1.9) { g.visible = false; t = -1; }
        },
        dispose() { camera.remove(g); }
    };
}

// Odrodzenia z checkpointu: Easy bez limitu, Normal ograniczone (DIFFS.respawns), Nightmare bez checkpointów. Po wyczerpaniu poziom zaczyna się od nowa.
// S to stan poziomu (S.df: trudność; licznik S.respawnsUsed żyje, dopóki trwa ten bieg). Zwraca true, gdy wolno odrodzić się z checkpointu.
export function takeRespawn(S) {
    if (!S.df.checkpoints) return false;
    const max = S.df.respawns === undefined ? Infinity : S.df.respawns, used = S.respawnsUsed || 0;
    if (used >= max) { toast('No respawns left. Starting over.', '#e0533f'); return false; }
    S.respawnsUsed = used + 1;
    if (max !== Infinity) toast('Respawn ' + S.respawnsUsed + ' of ' + max + (S.respawnsUsed === max ? ' (the last one!)' : ''), '#ffd27a');
    return true;
}

// Samouczek tylko za pierwszym razem: po przegranej (restart) albo ponownym wejściu instrukcji już nie ma
const seenIntros = new Set();
export function introSeen(id) { const seen = seenIntros.has(id); seenIntros.add(id); return seen; }

// ---------- ŚLADY HORRORU W POZIOMACH (krew, ślady wleczenia, odciski dłoni, ślady pazurów, napisy na ścianach, ciała) ----------
// addStoryProps({ seed, count, corpses, y, area }) na końcu build() poziomu: losuje wolne miejsca na podłodze i ściany z L.obstacles (omija start, L.reserved i portale)
// i scala wszystko w 6 siatek (budżet rysowania). Poziomy w trybie spokojnym (BagaBoo Games) go nie wołają.
const STORY_PHRASES = ['RUN', 'HE IS HERE', "DON'T LOOK BACK", 'NO EXIT', 'HELP ME', 'IT WATCHES', 'BEHIND YOU', 'I SEE YOU'];
let STORY_TEX = null;
function storyTextures() {
    if (STORY_TEX) return STORY_TEX;
    const R = T.mkRng(606), mk = (w, h, draw) => { const c = T.makeCanvas(w, h), x = c.getContext('2d'); draw(x, w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; };
    const red = (a) => 'rgba(' + (70 + ((R() * 40) | 0)) + ',6,8,' + a + ')';
    const pool = mk(256, 256, (x) => {   // kałuża: nachodzące się plamy, kropelki, połysk
        for (let i = 0; i < 9; i++) { x.fillStyle = red(0.55 + R() * 0.3); x.beginPath(); x.ellipse(128 + (R() - 0.5) * 70, 128 + (R() - 0.5) * 70, 30 + R() * 50, 24 + R() * 40, R() * 3, 0, 7); x.fill(); }
        for (let i = 0; i < 22; i++) { x.fillStyle = red(0.8); x.beginPath(); x.arc(R() * 256, R() * 256, 1 + R() * 5, 0, 7); x.fill(); }
        x.fillStyle = 'rgba(255,170,170,0.14)'; x.beginPath(); x.ellipse(108, 100, 22, 9, -0.6, 0, 7); x.fill();
    });
    const drag = mk(512, 128, (x) => {   // smuga wleczenia: zwęża się ku końcowi, z palcami
        x.fillStyle = red(0.8); x.beginPath(); x.moveTo(20, 64);
        for (let i = 0; i <= 20; i++) x.lineTo(20 + i * 24, 64 - (36 - i * 1.4) - R() * 10); for (let i = 20; i >= 0; i--) x.lineTo(20 + i * 24, 64 + (36 - i * 1.4) + R() * 10); x.fill();
        x.strokeStyle = red(0.7); x.lineWidth = 6; for (let i = 0; i < 4; i++) { x.beginPath(); x.moveTo(500, 40 + i * 16); x.lineTo(430 + R() * 20, 44 + i * 14); x.stroke(); }
    });
    const hands = mk(256, 256, (x) => {   // odciski zakrwawionych dłoni
        for (const [cx, cy, s] of [[70, 150, 1], [175, 110, 0.9], [150, 205, 0.7]]) {
            x.save(); x.translate(cx, cy); x.rotate((R() - 0.5) * 0.7); x.scale(s, s); x.fillStyle = red(0.85);
            x.beginPath(); x.ellipse(0, 20, 26, 30, 0, 0, 7); x.fill();
            for (let f = 0; f < 5; f++) { const a = -0.9 + f * 0.45; x.beginPath(); x.ellipse(Math.sin(a) * 30 + (f === 0 ? -8 : 0), -22 - Math.cos(a) * 20 + (f === 0 ? 20 : 0), 6, 19, a, 0, 7); x.fill(); }
            x.restore();
        }
        for (let i = 0; i < 3; i++) { x.fillStyle = red(0.8); x.fillRect(40 + i * 70, 180, 4, 40 + R() * 36); }   // zacieki
    });
    const claws = mk(256, 256, (x) => {   // ślady pazurów: cztery równoległe rysy
        for (let k = 0; k < 2; k++) for (let i = 0; i < 4; i++) {
            const ox = 40 + k * 90 + i * 15, len = 150 + R() * 70;
            x.strokeStyle = 'rgba(15,10,8,0.9)'; x.lineWidth = 6; x.beginPath(); x.moveTo(ox, 20 + R() * 20); x.lineTo(ox + 36, 20 + len); x.stroke();
            x.strokeStyle = 'rgba(210,200,185,0.6)'; x.lineWidth = 2; x.beginPath(); x.moveTo(ox + 2, 22); x.lineTo(ox + 38, 22 + len); x.stroke();
        }
    });
    const text = mk(1024, 1024, (x, w) => {   // atlas napisów: osiem wierszy po 128 px, czerwone litery z zaciekami
        x.textAlign = 'center'; x.textBaseline = 'middle';
        STORY_PHRASES.forEach((p, i) => {
            const y = i * 128 + 54; x.font = 'bold 86px "Courier New", monospace'; x.fillStyle = red(0.95); x.fillText(p, w / 2, y);
            for (let k = 0; k < 7; k++) { x.fillStyle = red(0.85); const dx = w / 2 + (R() - 0.5) * x.measureText(p).width * 0.9; x.fillRect(dx, y + 20, 3 + R() * 3, 12 + R() * 40); }
        });
    });
    return (STORY_TEX = { pool: pool, drag: drag, hands: hands, claws: claws, text: text });
}
export function addStoryProps(o) {
    o = o || {};
    const R = T.mkRng(o.seed || 1), A = o.area || L.bounds, fy = o.y !== undefined ? o.y : (L.floorY || 0), n = o.count || 24, X = storyTextures(), g = new THREE.Group();
    const obs = L.obstacles.filter(b => b.box3), sp = L.spawn || [0, 1, 0];
    const free = (x, z, r) => { for (const b of obs) { const q = b.box3; if (q.max.y > fy + 0.25 && q.min.y < fy + 1.6 && x > q.min.x - r && x < q.max.x + r && z > q.min.z - r && z < q.max.z + r) return false; } return true; };
    const clear = (x, z) => Math.hypot(x - sp[0], z - sp[2]) > 5 && !L.reserved.some(r => Math.hypot(x - r[0], z - r[1]) < (r[2] || 2) + 1) && !L.portals.some(p => p.box3 && x > p.box3.min.x - 2 && x < p.box3.max.x + 2 && z > p.box3.min.z - 2 && z < p.box3.max.z + 2);
    const floorSpot = (r) => { for (let i = 0; i < 80; i++) { const x = A.minX + 1 + R() * (A.maxX - A.minX - 2), z = A.minZ + 1 + R() * (A.maxZ - A.minZ - 2); if (clear(x, z) && free(x, z, r)) return [x, z]; } return null; };
    const tall = obs.filter(b => b.box3.max.y - b.box3.min.y >= 1.8 && b.box3.min.y <= fy + 0.6);
    const wallSpot = () => {
        for (let i = 0; i < 60 && tall.length; i++) {
            const q = tall[(R() * tall.length) | 0].box3, f = (R() * 4) | 0, t = 0.12 + R() * 0.76, y = fy + 1.0 + R() * 0.9;
            const x = f < 2 ? q.min.x + (q.max.x - q.min.x) * t : (f === 2 ? q.min.x - 0.02 : q.max.x + 0.02), z = f < 2 ? (f === 0 ? q.min.z - 0.02 : q.max.z + 0.02) : q.min.z + (q.max.z - q.min.z) * t;
            const nx = f === 2 ? -1 : (f === 3 ? 1 : 0), nz = f === 0 ? -1 : (f === 1 ? 1 : 0);
            if (x > A.minX && x < A.maxX && z > A.minZ && z < A.maxZ && clear(x, z) && free(x + nx * 0.7, z + nz * 0.7, 0.25)) return { x: x, y: y, z: z, ry: Math.atan2(nx, nz) };
        }
        return null;
    };
    const buckets = { pool: [], drag: [], hands: [], claws: [], text: [] }, m4 = new THREE.Matrix4(), e4 = new THREE.Euler(), q4 = new THREE.Quaternion(), s4 = new THREE.Vector3(1, 1, 1), p4 = new THREE.Vector3();
    const put = (key, geo, x, y, z, rx, ry, rz) => { e4.set(rx, ry, rz, 'YXZ'); q4.setFromEuler(e4); m4.compose(p4.set(x, y, z), q4, s4); geo.applyMatrix4(m4); buckets[key].push(geo); };
    const floorDecal = (key, w, h) => { const s = floorSpot(0.6); if (s) put(key, new THREE.PlaneGeometry(w, h), s[0], fy + 0.012 + R() * 0.006, s[1], -Math.PI / 2, R() * 6.28, 0); return s; };
    const wallDecal = (key, w, h, uv) => { const s = wallSpot(); if (!s) return; const gm = new THREE.PlaneGeometry(w, h); if (uv) { const a = gm.attributes.uv; for (let i = 0; i < a.count; i++) a.setXY(i, a.getX(i), uv[0] + a.getY(i) * (uv[1] - uv[0])); } put(key, gm, s.x, s.y, s.z, 0, s.ry, 0); };
    for (let i = 0; i < n; i++) {
        const r = R();
        if (r < 0.28) floorDecal('pool', 1 + R() * 1.4, 1 + R() * 1.4);
        else if (r < 0.42) floorDecal('drag', 2.2 + R() * 2, 0.7);
        else if (r < 0.58) wallDecal('hands', 1 + R() * 0.6, 1 + R() * 0.6);
        else if (r < 0.72) wallDecal('claws', 1.1, 1.1);
        else { const k = (R() * STORY_PHRASES.length) | 0; wallDecal('text', 2.4, 0.3, [1 - (k + 1) / 8, 1 - k / 8]); }
    }
    const mat = (map) => new THREE.MeshStandardMaterial({ map: map, transparent: true, depthWrite: false, roughness: 0.42, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, envMapIntensity: 0.4 });
    for (const k of Object.keys(buckets)) if (buckets[k].length) { const m = new THREE.Mesh(mergeGeometries(buckets[k]), mat(X[k])); m.frustumCulled = false; m.renderOrder = 2; g.add(m); }
    // ciała: leżące postacie w brudnych ubraniach z kałużą pod spodem (jedna siatka z kolorami w wierzchołkach)
    const bodies = [];
    const tint = (geo, col) => { const c = new THREE.Color(col), arr = new Float32Array(geo.attributes.position.count * 3); for (let i = 0; i < arr.length; i += 3) { arr[i] = c.r; arr[i + 1] = c.g; arr[i + 2] = c.b; } geo.setAttribute('color', new THREE.BufferAttribute(arr, 3)); return geo; };
    const part = (geo, col, x, y, z, rx, ry, rz, by, bx, bz, yaw) => { const m = new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new THREE.Vector3(1, 1, 1)), w = new THREE.Matrix4().compose(new THREE.Vector3(bx, by, bz), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, yaw, 0)), new THREE.Vector3(1, 1, 1)); geo.applyMatrix4(m).applyMatrix4(w); return tint(geo, col); };
    const poolG = [];
    for (let i = 0; i < (o.corpses === undefined ? 3 : o.corpses); i++) {
        const s = floorSpot(1.0); if (!s) continue; const yaw = R() * 6.28, cloth = [0x2a2a30, 0x3a2a22, 0x22302a, 0x40343a][(R() * 4) | 0], y0 = fy;
        const P = (geo, col, x, y, z, rx, ry, rz) => bodies.push(part(geo, col, x, y, z, rx, ry, rz, y0, s[0], s[1], yaw));
        P(new THREE.BoxGeometry(0.42, 0.2, 0.6), cloth, 0, 0.12, 0, 0, 0, 0); P(new THREE.SphereGeometry(0.11, 10, 8), 0xc8b8a8, 0, 0.13, -0.42, 0, 0, 0);
        P(new THREE.CylinderGeometry(0.05, 0.045, 0.6, 7), cloth, 0.33, 0.07, -0.1, Math.PI / 2, 0, 0.3 + R() * 0.6); P(new THREE.CylinderGeometry(0.05, 0.045, 0.55, 7), cloth, -0.3, 0.07, -0.12, Math.PI / 2, 0, -0.4 - R() * 0.8);
        P(new THREE.CylinderGeometry(0.075, 0.06, 0.7, 7), cloth, 0.12, 0.08, 0.62, Math.PI / 2, 0, 0.1); P(new THREE.CylinderGeometry(0.075, 0.06, 0.7, 7), cloth, -0.14, 0.08, 0.6, Math.PI / 2, 0, -0.25);
        const pg = new THREE.PlaneGeometry(1.6, 1.6); pg.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(s[0], fy + 0.014, s[1]), new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, R() * 6.28, 0)), new THREE.Vector3(1, 1, 1))); poolG.push(pg);
    }
    if (bodies.length) { const m = new THREE.Mesh(mergeGeometries(bodies), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85 })); m.castShadow = false; g.add(m); }
    if (poolG.length) { const m = new THREE.Mesh(mergeGeometries(poolG), mat(X.pool)); m.frustumCulled = false; m.renderOrder = 2; g.add(m); }
    g.name = 'storyProps'; L.root.add(g); return g;
}
