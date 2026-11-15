// ==========================================
// SZATNIA (WARDROBE): wejście z lobby (drzwi w północnej ścianie)
// Studio zdjęciowe: na środku obrotowy podest z twoim goryla w aktualnym stroju, niebieski ekran do nagrywania wideo (chroma key) i
// przycisk Photo (zdjęcie ląduje na ścianie, a na komputerze zapisuje się też jako PNG). Przymierzanie, sprawdzanie i zakładanie
// kosmetyków jest w Maszynie goryla w lobby, obok sklepu (core/gorillamachine.js), a nie tutaj.
// ==========================================
import { THREE, L, tex, scene, camera, renderer, addCrispBlock } from '../core/engine.js';
import * as T from '../core/textures.js';
import * as E from '../core/economy.js';
import { Terminal, toast, markAllDirty, AMBER, AMBER_DIM, GOLD, OK_COL, BAD_COL } from '../core/terminal.js';
import { createAvatar } from '../core/avatar.js';
import { buildDoor } from '../core/levelkit.js';
import { emotePose, EMOTES } from '../core/emotes.js';
import * as SFX from '../core/audio.js';
import { ARRIVAL_WARDROBE } from './lobby-door.js';
import { LOBBY_MOVE_SCALE } from '../core/config.js';

const W = 9, D = 7, H = 5;
const PODIUM = [0, -1.5];
export const info = { id: 'wardrobe', name: 'Wardrobe', spawn: [0, 1.0, 4.5] };
let S = null;

// Stan studia: wybrana emotka do pozy na zdjęciu (indeks na liście posiadanych emotek, null = bez emotki)
const UI = { auto: true, spin: 0, emote: null, blue: false };
const BLUE = 0x0a3cff;   // niebieski do kluczowania (chroma key) przy nagrywaniu wideo
const ownedEmotes = () => E.CATALOG.filter(it => it.slot === 'emote' && E.isOwned(it) && EMOTES[it.id]);
const previewLook = () => E.getLook();
function cycleEmote(d) {
    const l = ownedEmotes(); if (!l.length) return;
    const cur = UI.emote === null ? -1 : UI.emote;
    const n = cur + d; UI.emote = n < 0 ? (d < 0 ? l.length - 1 : null) : (n >= l.length ? null : n);
}

// ---------- TERMINAL ----------
const panel = new Terminal((t) => {
    const c = t.ctx;
    t.background();
    t.header('Photo studio', E.SAVE.profile.name, GOLD);
    c.fillStyle = 'rgba(255,176,0,0.08)'; c.fillRect(20, 96, 984, 150);
    t.text('Your gorilla is on the turntable in the outfit you are wearing.', 36, 130, 24, AMBER, 'left', true);
    t.text('To try on, check and wear cosmetics use the GORILLA MACHINE', 36, 176, 22, GOLD, 'left');
    t.text('in the lobby, next to the Bagabucks shop.', 36, 208, 22, GOLD, 'left');
    // Pozowanie emotką do zdjęcia
    const l = ownedEmotes(), em = UI.emote !== null ? l[UI.emote] : null;
    t.text('Pose', 36, 296, 26, GOLD, 'left', true);
    t.btn('prevemote', 190, 270, 56, 52, '<', () => cycleEmote(-1), { size: 26 });
    t.text(em ? em.name : 'No emote', 410, 296, 26, em ? OK_COL : AMBER, 'center', true);
    t.btn('nextemote', 574, 270, 56, 52, '>', () => cycleEmote(1), { size: 26 });
    t.text('Pick an emote to freeze a pose for the photo.', 36, 350, 18, AMBER_DIM, 'left');
    t.text('Blue screen: a flat blue wall and floor for chroma-key video.', 36, 384, 18, AMBER_DIM, 'left');
    t.btn('spin', 20, 520, 235, 52, UI.auto ? 'Turntable: auto' : 'Turntable: stopped', () => { UI.auto = !UI.auto; }, { size: 21, tone: UI.auto ? 'ok' : undefined });
    t.btn('left', 265, 520, 70, 52, '<<', () => { UI.spin -= 0.6; UI.auto = false; }, { size: 24 });
    t.btn('right', 345, 520, 70, 52, '>>', () => { UI.spin += 0.6; UI.auto = false; }, { size: 24 });
    t.btn('blue', 575, 520, 175, 52, UI.blue ? 'Blue screen: on' : 'Blue screen: off', () => { UI.blue = !UI.blue; applyBlue(); }, { size: 19, tone: UI.blue ? 'ok' : undefined });
    t.btn('photo', 760, 520, 244, 52, 'Take photo', () => { S.photoReq = true; }, { tone: 'gold', size: 24 });
    t.text('Photos appear on the wall.', 36, 604, 18, AMBER_DIM, 'left');
    t.scanlines();
}, 1024, 640);

// ---------- BUDOWA ----------
export function build() {
    L.spawn = info.spawn.slice();
    L.bounds = { minX: -W + 0.4, maxX: W - 0.4, minZ: -D + 0.4, maxZ: D - 0.4, maxY: H - 0.4 };
    L.moveScale = LOBBY_MOVE_SCALE;   // ruch dłońmi taki sam jak w lobby
    S = { clock: 0, dirtyLook: true, avatar: null, photos: [], photoReq: false, flash: 0, frames: [], lights: [] };
    addCrispBlock(0, -0.5, 0, W * 2 + 2, 1, D * 2 + 2, 0x6a5a4e, 0x181008, tex.floor, { rough: tex.floorRough });
    addCrispBlock(0, H + 0.5, 0, W * 2 + 2, 1, D * 2 + 2, 0x4a3c3e, 0x181008);
    for (const [x, z, w, d] of [[0, -D - 0.5, W * 2 + 2, 1], [0, D + 0.5, W * 2 + 2, 1], [-W - 0.5, 0, 1, D * 2], [W + 0.5, 0, 1, D * 2]]) addCrispBlock(x, H / 2, z, w, H, d, 0x8a7a72, 0x181008, tex.wall);
    // Podest z delikatnym blaskiem i reflektor z góry
    const podium = addCrispBlock(PODIUM[0], 0.15, PODIUM[1], 3.4, 0.3, 3.4, 0x2a2a34, 0xffd27a);
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 0.06, 40), new THREE.MeshStandardMaterial({ color: 0x9a8a68, metalness: 0.3, roughness: 0.5 }));
    disc.position.set(PODIUM[0], 0.33, PODIUM[1]); L.root.add(disc); S.disc = disc;
    // Niebieski ekran do nagrywania wideo: ściana za podestem i podłoga wokół niego (podest i tarcza też robią się niebieskie)
    const blueMat = new THREE.MeshBasicMaterial({ color: BLUE, toneMapped: false });
    const bw = new THREE.Mesh(new THREE.PlaneGeometry(W * 2 - 0.2, H - 0.1), blueMat); bw.position.set(0, H / 2, -D + 0.1); bw.visible = false;
    const bf = new THREE.Mesh(new THREE.PlaneGeometry(W * 2 - 0.2, D + 1.5), blueMat); bf.rotation.x = -Math.PI / 2; bf.position.set(0, 0.014, -D / 2 + 0.75 - 0.2); bf.visible = false;
    L.root.add(bw, bf);
    S.blue = { wall: bw, floor: bf, mat: blueMat, podium: podium, disc: disc, podiumMat: podium.material, discMat: disc.material };
    const spot = new THREE.SpotLight(0xfff0d8, 110, 12, 0.5, 0.6, 1.5); spot.position.set(PODIUM[0], 4.6, PODIUM[1] + 0.5); spot.target.position.set(PODIUM[0], 0.8, PODIUM[1]); L.root.add(spot, spot.target);
    for (const [x, z] of [[-6, -4], [6, -4], [-6, 4], [6, 4]]) { const l = new THREE.PointLight(0xffd8a0, 48, 16, 1.6); l.position.set(x, 4, z); L.root.add(l); }
    // Napis na ścianie
    const tc = T.makeCanvas(1024, 160), tx = tc.getContext('2d');
    tx.textAlign = 'center'; tx.textBaseline = 'middle'; tx.font = 'bold 110px serif'; tx.shadowColor = '#ffb040'; tx.shadowBlur = 24; tx.fillStyle = '#ffe8c0'; tx.fillText('WARDROBE', 512, 86);
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(6, 0.94), new THREE.MeshBasicMaterial({ map: T.toTex(tc, false), transparent: true, toneMapped: false }));
    sign.position.set(0, 3.8, -D + 0.06); L.root.add(sign); S.sign = sign;
    // Terminal przy zachodniej ścianie (zwrócony na wschód, do podestu)
    const scr = panel.createMesh(2.4, 1.5); scr.position.set(-W + 0.12, 1.7, 0); scr.rotation.y = Math.PI / 2; L.root.add(scr);
    addCrispBlock(-W + 0.05, 1.7, 0, 0.1, 1.64, 2.54, 0x2a221c, 0x181008);
    // Ściana zdjęć: trzy ramki przy wschodniej ścianie
    for (let i = 0; i < 3; i++) {
        const frame = addCrispBlock(W - 0.05, 2.0, -3.2 + i * 3.2, 0.1, 2.1, 2.1, 0x2a221c, 0x181008);
        void frame;
        const m = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 1.9), new THREE.MeshBasicMaterial({ color: 0x1a1410, toneMapped: false }));
        m.position.set(W - 0.12, 2.0, -3.2 + i * 3.2); m.rotation.y = -Math.PI / 2; L.root.add(m); S.frames.push(m);
    }
    S.flashPanel = new THREE.Mesh(new THREE.PlaneGeometry(3, 3), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthTest: false }));
    S.flashPanel.position.z = -0.25; S.flashPanel.renderOrder = 1005; camera.add(S.flashPanel);
    buildDoor({ x: 0, z: D - 0.03, rotY: Math.PI, label: 'LOBBY', color: '#ffd27a', wood: 0x4a3a30, portal: { target: 'lobby', spawn: ARRIVAL_WARDROBE, onEnter: () => toast('Back to the lobby') } });
    S.photoCam = new THREE.PerspectiveCamera(34, 1, 0.1, 40);
    S.photoCam.position.set(PODIUM[0], 1.3, PODIUM[1] + 4.2); S.photoCam.lookAt(PODIUM[0], 0.95, PODIUM[1]);
    applyBlue();
    markAllDirty();
}

export function setBlueScreen(on) { UI.blue = !!on; applyBlue(); }   // też dla testów
// Niebieski ekran: włącza/wyłącza tło do kluczowania i podmienia materiały podestu
function applyBlue() {
    if (!S || !S.blue) return;
    const b = S.blue, on = UI.blue;
    b.wall.visible = b.floor.visible = on; if (S.sign) S.sign.visible = !on;
    b.podium.material = on ? b.mat : b.podiumMat; b.disc.material = on ? b.mat : b.discMat;
    markAllDirty();
}

// Avatar w pozie stojącej (tak samo układają go zdalni gracze w network.js)
function rebuildAvatar() {
    if (S.avatar) { L.root.remove(S.avatar.pivot); }
    const a = createAvatar(previewLook()), pivot = new THREE.Group();
    pivot.position.set(PODIUM[0], 0.36, PODIUM[1]); pivot.add(a.group); L.root.add(pivot);
    a.pivot = pivot; S.avatar = a; S.dirtyLook = false; baseAvatarPose(a);
    markAllDirty();
}

// Poza bazowa avatara (stoi z rękami po bokach); emotka nakłada się na nią w każdej klatce
function baseAvatarPose(a) {
    a.head.position.set(0, 1.28, 0); a.head.quaternion.identity();
    a.handL.position.set(-0.46, 0.72, -0.06); a.handR.position.set(0.46, 0.72, -0.06); a.handL.quaternion.identity(); a.handR.quaternion.identity();
    a.torso.position.set(0, 1.28 - (a.torsoDrop || 0.35), 0);
}

// ---------- ZDJĘCIE ----------
function takePhoto() {
    S.photoReq = false;
    const size = 768, rt = new THREE.WebGLRenderTarget(size, size, { samples: 4 });
    rt.texture.colorSpace = THREE.SRGBColorSpace;
    const xr = renderer.xr.enabled, prevTarget = renderer.getRenderTarget();
    renderer.xr.enabled = false;
    renderer.setRenderTarget(rt); renderer.render(scene, S.photoCam); renderer.setRenderTarget(prevTarget);
    renderer.xr.enabled = xr;
    const buf = new Uint8Array(size * size * 4); renderer.readRenderTargetPixels(rt, 0, 0, size, size, buf); rt.dispose();
    const cv = document.createElement('canvas'); cv.width = cv.height = size;
    const cx = cv.getContext('2d'), img = cx.createImageData(size, size);
    for (let y = 0; y < size; y++) img.data.set(buf.subarray((size - 1 - y) * size * 4, (size - y) * size * 4), y * size * 4);   // odwrócenie w pionie
    cx.putImageData(img, 0, 0);
    cx.fillStyle = 'rgba(0,0,0,0.45)'; cx.fillRect(0, size - 44, size, 44); cx.fillStyle = '#ffe8c0'; cx.font = 'bold 26px sans-serif'; cx.textAlign = 'left'; cx.textBaseline = 'middle';
    cx.fillText('BagaBoo VR  -  ' + E.SAVE.profile.name, 16, size - 22);
    S.photos.unshift(cv); S.photos = S.photos.slice(0, 3);
    S.photos.forEach((p, i) => { const f = S.frames[i]; if (f.material.map) f.material.map.dispose(); const t2 = new THREE.CanvasTexture(p); t2.colorSpace = THREE.SRGBColorSpace; f.material.map = t2; f.material.color.setHex(0xffffff); f.material.needsUpdate = true; });
    S.flash = 1; SFX.bell && SFX.bell();
    if (!renderer.xr.isPresenting) {   // komputer: zapis pliku PNG
        const a = document.createElement('a'); a.href = cv.toDataURL('image/png'); a.download = 'bagaboo-photo-' + Date.now() + '.png'; document.body.appendChild(a); a.click(); a.remove();
        toast('Photo saved to the wall and downloaded', '#7fc47f');
    } else toast('Photo saved to the wall', '#7fc47f');
}

// ---------- CO KLATKĘ ----------
export function update(dt, t) {
    if (!S) return;
    S.clock += dt;
    if (S.dirtyLook) rebuildAvatar();
    if (UI.auto) UI.spin += dt * 0.5;
    if (S.avatar) {
        S.avatar.pivot.rotation.y = Math.PI + UI.spin;
        // Wybrana emotka gra w pętli na podeście (z krótką przerwą), żeby było ją widać także na zdjęciu
        const el = ownedEmotes(), em = UI.emote !== null ? el[UI.emote] : null;
        if (em && EMOTES[em.id]) { baseAvatarPose(S.avatar); const d = EMOTES[em.id].dur + 0.8; emotePose(S.avatar, em.id, S.clock % d); S.avatar.torso.position.set(S.avatar.head.position.x, S.avatar.head.position.y - (S.avatar.torsoDrop || 0.35), S.avatar.head.position.z); }
    }
    S.disc.rotation.y = UI.spin;
    if (S.photoReq) takePhoto();
    if (S.flash > 0) { S.flash = Math.max(0, S.flash - dt * 3); S.flashPanel.material.opacity = S.flash * 0.8; }
}
export function dispose() {
    if (S) { if (S.flashPanel && S.flashPanel.parent) S.flashPanel.parent.remove(S.flashPanel); for (const f of S.frames) if (f.material.map) f.material.map.dispose(); }
    S = null; L.moveScale = 1;
}
