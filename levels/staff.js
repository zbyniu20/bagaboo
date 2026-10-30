// ==========================================
// POZIOM: STAFF ROOM (pokój szefa gry)
// Wejście tylko dla gracza z nickiem z listy STAFF_NAMES (core/config.js). Jeśli jest hostem, zaprasza gości
// przyciskiem "Invite" na komputerze w lobby albo na telewizorze tutaj. Kanapa, fotele, stolik, biurko szefa, regał i telewizor z listą graczy.
// ==========================================
import { THREE, L, tex, addCrispBlock, addStaticBody, CANNON } from '../core/engine.js';
import { LIGHT_PRESETS, isStaffName } from '../core/config.js';
import { SAVE } from '../core/economy.js';
import * as T from '../core/textures.js';
import { toast, Terminal, AMBER, AMBER_DIM, GOLD, OK_COL } from '../core/terminal.js';
import * as N from '../core/network.js';
import { PRESENCE } from '../core/presence.js';
import { buildDoor } from '../core/levelkit.js';
import { ARRIVAL_STAFF } from './lobby-door.js';

const W = 4.5, D = 3.5, H = 3.2;   // pokój 9 x 7 m, 3,2 m wysokości
const ENV = LIGHT_PRESETS.staff.envIntensity;
export const info = { id: 'staff', name: 'Staff room', spawn: [0, 1.0, 2.3] };
let S = null;

// Telewizor: ekran z laserem (jak komputer). Host zaprasza stąd graczy albo odsyła ich do lobby.
const tv = new Terminal((t) => {
    const c = t.ctx;
    t.background();
    t.header('BagaBoo Staff TV', new Date().toLocaleTimeString(), AMBER_DIM);
    t.text('Online now: ' + (PRESENCE.ok ? PRESENCE.online : '...'), 40, 110, 34, GOLD, 'left', true);
    t.text(N.NET.mode === 'solo' ? 'Playing solo. Host a room to invite people here.' : 'Room ' + N.NET.code + (N.NET.mode === 'host' ? ' (you are the host)' : ''), 40, 154, 24, AMBER, 'left');
    const list = N.otherPlayers();
    if (N.NET.mode === 'host' && !list.length) t.text('Nobody else is in your room yet.', 40, 210, 24, AMBER_DIM, 'left');
    list.slice(0, 6).forEach((p, i) => {
        const y = 190 + i * 62, here = N.playersState[p.id] && N.playersState[p.id].lvl === 'staff';
        c.fillStyle = i % 2 ? 'rgba(255,176,0,0.04)' : 'rgba(255,176,0,0.08)'; c.fillRect(24, y, 976, 56);
        t.text(p.name, 40, y + 29, 26, GOLD, 'left', true);
        t.text(here ? 'in the staff room' : 'elsewhere', 360, y + 29, 22, here ? OK_COL : AMBER_DIM, 'left');
        if (N.NET.mode === 'host' && isStaffName(SAVE.profile.name)) {
            t.btn('inv' + p.id, 620, y + 7, 170, 42, 'Invite', () => { N.sendInvite(p.id, 'staff'); toast('Invited ' + p.name); }, { size: 22, tone: 'gold', disabled: here });
            t.btn('out' + p.id, 810, y + 7, 180, 42, 'Send out', () => { N.sendInvite(p.id, 'lobby'); toast(p.name + ' was sent to the lobby'); }, { size: 22, tone: 'bad', disabled: !here });
        }
    });
    // Pasek z napisem jak w telewizji
    c.fillStyle = '#7a0a0a'; c.fillRect(0, 592, 1024, 48);
    const msg = '  BAGABOO VR  •  made by BoyIsGamer  •  staff only  •  do not look away  •', w = c.measureText(msg).width;
    c.font = 'bold 26px "Courier New", monospace'; c.fillStyle = '#ffe0c0'; c.textBaseline = 'middle'; c.textAlign = 'left';
    const off = -((performance.now() / 30) % 1200);
    c.fillText(msg + msg + msg, off, 616);
    t.scanlines();
});

export function build() {
    L.spawn = info.spawn.slice();
    L.bounds = { minX: -W + 0.3, maxX: W - 0.3, minZ: -D + 0.3, maxZ: D - 0.3, maxY: H - 0.3 };
    S = { tvT: 0 };
    buildRoom();
    buildFurniture();
    const screen = tv.createMesh(2.4, 1.5); screen.position.set(0, 1.75, -D + 0.07); L.root.add(screen);
    buildDoor({ x: 0, z: D - 0.03, rotY: Math.PI, label: 'LOBBY', color: '#ffd27a', wood: 0x6a4a30, signY: 2.6,
        portal: { target: 'lobby', spawn: ARRIVAL_STAFF, onEnter: () => toast('Back to the lobby') } });
}

// Tapeta w ciemnozielony wzór, drewniana boazeria, dywan z obwódką
function wallpaper() {
    const c = T.makeCanvas(256, 256), x = c.getContext('2d');
    x.fillStyle = '#1e2e22'; x.fillRect(0, 0, 256, 256);
    x.strokeStyle = 'rgba(200,170,90,0.22)'; x.lineWidth = 3;
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { const cx = i * 64 + (j % 2) * 32 + 16, cy = j * 64 + 32; x.beginPath(); x.ellipse(cx, cy, 14, 22, 0, 0, 7); x.stroke(); x.beginPath(); x.moveTo(cx, cy - 22); x.lineTo(cx, cy + 22); x.stroke(); }
    return T.toTex(c, true);
}
function carpet() {
    const c = T.makeCanvas(512, 384), x = c.getContext('2d');
    x.fillStyle = '#5a0e12'; x.fillRect(0, 0, 512, 384);
    x.strokeStyle = '#c8a040'; x.lineWidth = 10; x.strokeRect(20, 20, 472, 344); x.lineWidth = 3; x.strokeRect(42, 42, 428, 300);
    x.fillStyle = 'rgba(200,160,64,0.35)';
    for (let i = 0; i < 6; i++) for (let j = 0; j < 4; j++) { x.save(); x.translate(90 + i * 66, 92 + j * 66); x.rotate(Math.PI / 4); x.fillRect(-10, -10, 20, 20); x.restore(); }
    return T.toTex(c, false);
}
function buildRoom() {
    const wp = wallpaper(); wp.repeat.set(4, 1.5);
    addCrispBlock(0, -0.5, 0, W * 2 + 2, 1, D * 2 + 2, 0xb08060, 0x2a1a10, tex.wood, { uvMeters: 1.5 });
    addCrispBlock(0, H + 0.5, 0, W * 2 + 2, 1, D * 2 + 2, 0x3a2a22, 0x2a1a10);
    const wallMat = new THREE.MeshStandardMaterial({ map: wp, roughness: 0.85 });
    const wall = (x, z, w, d) => {
        addCrispBlock(x, H / 2, z, w, H, d, 0x223322, 0x101810);
        const m = L.root.children[L.root.children.length - 1]; m.material = wallMat;
    };
    wall(0, -D - 0.5, W * 2 + 2, 1); wall(0, D + 0.5, W * 2 + 2, 1); wall(-W - 0.5, 0, 1, D * 2); wall(W + 0.5, 0, 1, D * 2);
    // Boazeria (bez kolizji, tuż przy ścianach)
    const panel = new THREE.MeshStandardMaterial({ map: tex.wood, color: 0x6a4028, roughness: 0.6 });
    for (const [x, z, w, d] of [[0, -D + 0.03, W * 2, 0.06], [0, D - 0.03, W * 2, 0.06], [-W + 0.03, 0, 0.06, D * 2], [W - 0.03, 0, 0.06, D * 2]]) {
        const m = new THREE.Mesh(new THREE.BoxGeometry(w, 1.0, d), panel); m.position.set(x, 0.5, z); m.receiveShadow = true; L.root.add(m);
    }
    const rug = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 3.4), new THREE.MeshStandardMaterial({ map: carpet(), roughness: 0.95 }));
    rug.rotation.x = -Math.PI / 2; rug.position.set(0, 0.01, 0.2); rug.receiveShadow = true; L.root.add(rug);
    // Ciepłe światła sufitowe
    for (const x of [-2, 2]) {
        const l = new THREE.PointLight(0xffc890, 9, 9, 1.6); l.position.set(x, H - 0.4, 0); L.root.add(l);
        const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.35, 0.22, 20, 1, true), new THREE.MeshStandardMaterial({ color: 0xe8d8b0, emissive: 0x6a5030, side: THREE.DoubleSide }));
        shade.position.set(x, H - 0.25, 0); L.root.add(shade);
    }
}
// Mebel z kolizją: pudełko z materiałem
function box(x, y, z, w, h, d, mat, solid) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; L.root.add(m);
    if (solid !== false) addStaticBody(x, y, z, new CANNON.Box(new CANNON.Vec3(w / 2, h / 2, d / 2)), m, false);
    return m;
}
function buildFurniture() {
    const leather = new THREE.MeshStandardMaterial({ color: 0x5a0e10, roughness: 0.45, envMapIntensity: ENV });
    const cushion = new THREE.MeshStandardMaterial({ color: 0x6a1418, roughness: 0.6 });
    const wood = new THREE.MeshStandardMaterial({ map: tex.wood, color: 0x8a5a38, roughness: 0.5, envMapIntensity: ENV });
    const dark = new THREE.MeshStandardMaterial({ color: 0x1a1a1c, metalness: 0.6, roughness: 0.4, envMapIntensity: ENV });
    const gold = new THREE.MeshStandardMaterial({ color: 0xd4a640, metalness: 1, roughness: 0.3, envMapIntensity: Math.max(0.6, ENV) });
    // Kanapa przodem do telewizora
    box(0, 0.22, 1.1, 2.4, 0.44, 0.9, leather);
    for (const x of [-0.78, 0, 0.78]) box(x, 0.5, 1.05, 0.74, 0.14, 0.8, cushion, false);
    box(0, 0.8, 1.48, 2.4, 0.75, 0.24, leather);
    for (const s of [-1, 1]) box(s * 1.32, 0.55, 1.1, 0.24, 0.62, 0.9, leather);
    // Dwa fotele
    for (const s of [-1, 1]) {
        const x = s * 3.0;
        box(x, 0.22, 0.4, 1.0, 0.44, 0.9, leather);
        box(x, 0.5, 0.36, 0.7, 0.13, 0.75, cushion, false);
        box(x, 0.8, 0.78, 1.0, 0.75, 0.22, leather);
        for (const a of [-1, 1]) box(x + a * 0.44, 0.55, 0.4, 0.14, 0.6, 0.9, leather);
    }
    // Stolik kawowy z czaszką-świecznikiem
    box(0, 0.42, -0.4, 1.4, 0.06, 0.7, wood);
    for (const a of [-0.6, 0.6]) for (const b of [-0.28, 0.28]) box(a, 0.2, -0.4 + b, 0.06, 0.4, 0.06, dark, false);
    const skull = new THREE.Mesh(new THREE.SphereGeometry(0.08, 14, 10), new THREE.MeshStandardMaterial({ color: 0xe8e0c8, roughness: 0.6 })); skull.position.set(0.3, 0.52, -0.4); L.root.add(skull);
    const candle = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.1, 8), new THREE.MeshStandardMaterial({ color: 0xf0e8d0 })); candle.position.set(0.3, 0.64, -0.4); L.root.add(candle);
    const flame = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex.dot, color: 0xffb040, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); flame.scale.set(0.12, 0.18, 1); flame.position.set(0.3, 0.72, -0.4); L.root.add(flame);
    const cl = new THREE.PointLight(0xffa040, 1.5, 3, 2); cl.position.set(0.3, 0.8, -0.4); L.root.add(cl);
    S.flame = { sprite: flame, light: cl };
    // Szafka pod telewizorem i rama telewizora
    box(0, 0.3, -D + 0.3, 2.8, 0.6, 0.5, wood);
    box(0, 1.75, -D + 0.04, 2.56, 1.64, 0.06, dark, false);
    // Biurko szefa z tabliczką BOSS i krzesłem
    box(3.3, 0.74, -2.6, 1.6, 0.08, 0.8, wood);
    for (const a of [-0.7, 0.7]) box(3.3 + a, 0.36, -2.6, 0.1, 0.72, 0.7, wood, false);
    const plate = T.makeCanvas(256, 64), px = plate.getContext('2d');
    px.fillStyle = '#1a1208'; px.fillRect(0, 0, 256, 64); px.font = 'bold 44px serif'; px.textAlign = 'center'; px.textBaseline = 'middle'; px.fillStyle = '#ffd27a'; px.fillText('BOSS', 128, 34);
    const nameplate = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.08, 0.04), [dark, dark, dark, dark, new THREE.MeshBasicMaterial({ map: T.toTex(plate, false) }), dark]);
    nameplate.position.set(3.3, 0.82, -2.25); L.root.add(nameplate);
    box(3.3, 0.45, -1.8, 0.55, 0.08, 0.55, leather); box(3.3, 0.8, -1.55, 0.55, 0.65, 0.08, leather); box(3.3, 0.22, -1.8, 0.08, 0.44, 0.08, dark, false);
    const lamp = new THREE.PointLight(0xffd8a0, 2.5, 3, 2); lamp.position.set(2.8, 1.1, -2.7); L.root.add(lamp);
    box(2.8, 0.95, -2.75, 0.1, 0.35, 0.1, gold, false);
    // Regał z książkami
    box(-W + 0.25, 1.1, -1.4, 0.4, 2.2, 1.8, wood);
    const R = T.mkRng(12), books = [];
    for (let shelf = 0; shelf < 4; shelf++) for (let i = 0; i < 9; i++) {
        const h = 0.22 + R() * 0.12;
        const b = new THREE.Mesh(new THREE.BoxGeometry(0.22, h, 0.13), new THREE.MeshStandardMaterial({ color: new THREE.Color().setHSL(R(), 0.5, 0.25 + R() * 0.2), roughness: 0.8 }));
        b.position.set(-W + 0.5, 0.3 + shelf * 0.5 + h / 2, -2.2 + i * 0.18); L.root.add(b); books.push(b);
    }
    // Lampa stojąca, roślina, obraz z nazwą gry
    box(-3.6, 0.8, 2.6, 0.06, 1.6, 0.06, gold, false);
    const fl = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.32, 20, 1, true), new THREE.MeshStandardMaterial({ color: 0xe8d0a0, emissive: 0x6a4a20, side: THREE.DoubleSide })); fl.position.set(-3.6, 1.7, 2.6); L.root.add(fl);
    const fll = new THREE.PointLight(0xffc080, 4, 5, 2); fll.position.set(-3.6, 1.6, 2.6); L.root.add(fll);
    box(3.7, 0.25, 2.7, 0.45, 0.5, 0.45, new THREE.MeshStandardMaterial({ color: 0x5a3a2a, roughness: 0.8 }));
    for (let i = 0; i < 7; i++) { const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), new THREE.MeshStandardMaterial({ color: 0x1e4a1e, roughness: 0.8 })); leaf.scale.set(0.5, 1.4, 0.5); leaf.position.set(3.7 + Math.cos(i) * 0.12, 0.85, 2.7 + Math.sin(i) * 0.12); leaf.rotation.z = Math.cos(i * 2) * 0.5; L.root.add(leaf); }
    const pc = T.makeCanvas(512, 320), x = pc.getContext('2d');
    x.fillStyle = '#0c0606'; x.fillRect(0, 0, 512, 320);
    x.font = '84px Creepster, serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = '#b00000'; x.shadowColor = '#ff3a00'; x.shadowBlur = 18; x.fillText('BagaBoo VR', 256, 140);
    x.shadowBlur = 0; x.font = 'italic 32px Georgia, serif'; x.fillStyle = '#e8dcc8'; x.fillText('made by BoyIsGamer', 256, 230);
    const poster = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.0), new THREE.MeshStandardMaterial({ map: T.toTex(pc, false), roughness: 0.6 }));
    poster.rotation.y = -Math.PI / 2; poster.position.set(W - 0.05, 1.8, 0.2); L.root.add(poster);
    box(W - 0.04, 1.8, 0.2, 0.04, 1.12, 1.72, gold, false);
}

export function update(dt, t) {
    if (!S) return;
    S.flame.sprite.material.opacity = 0.75 + 0.25 * Math.sin(t * 13) * Math.sin(t * 7.3);
    S.flame.light.intensity = 1.3 + 0.4 * Math.sin(t * 11);
    S.tvT -= dt; if (S.tvT <= 0) { S.tvT = 0.1; tv.dirty = true; }   // pasek na dole się przesuwa
}
export function dispose() { S = null; }
