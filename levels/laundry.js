// ==========================================
// POZIOM: PRALNIA PRZEMYSŁOWA (The Industrial Laundromat)
// Zaparowana piwnica: rzędy kolorowych pralek, wielka suszarka, worki z praniem na szynach, mydliny, para.
// Potwór "Szmaciarz": 3,5 m, z prześcieradeł i kabli, porcelanowa maska bez oczu. Chodzi powoli,
// a gdy cię zobaczy, piszczy i sprintuje na czworakach. Nie mieści się pod niskimi rurami ani w bębnach.
// Cel: zakręć 4 czerwone zawory, wtedy para przy bramie opada i można uciec.
// ==========================================
import { THREE, L, tex, camera, addCrispBlock } from '../core/engine.js';
import * as T from '../core/textures.js';
import { levelReward, recordTime } from '../core/economy.js';
import { toast } from '../core/terminal.js';
import { hands, releaseAll } from '../core/player.js';
import * as SFX from '../core/audio.js';
import { buzz } from '../core/haptics.js';
import { DESKTOP } from '../core/desktop.js';
import { ARRIVAL_FROM_LAUNDRY as ARRIVAL_LAUNDRY } from './levels.js';
import { buildDoor, cameraPanel, panelBg, drawInstructions, createJumpscare } from '../core/levelkit.js';

// ---------- USTAWIENIA ----------
const X0 = -16, X1 = 16, Z0 = 6, Z1 = -54, H = 9;   // hala 32 x 60 m, 9 m wysokości
const WALK = 1.7, INVESTIGATE = 3.6, SPRINT = 7.6, RAGE = 6.6;   // prędkości Szmaciarza (m/s): w sprincie szybszy od gracza
const SEE_DIST = 14, CATCH_DIST = 1.3, SAFE_HEIGHT = 2.6;       // widzi na 14 m (para), nie sięga wyżej niż 2,6 m
const LOSE_TIME = 7;                                            // tyle sekund szuka cię po stracie z oczu
const BLACKOUT_MIN = 28, BLACKOUT_MAX = 50;                     // co ile sekund gasną światła
const STEAM_MIN = 20, STEAM_MAX = 40;                           // co ile sekund bucha para
const TURNS = [3, 2, 2, 2];                                      // ile obrotów trzeba zakręcić każdy zawór
const REWARD_FIRST = 2000, REWARD_REPEAT = 200, INTRO_TIME = 10;
export const info = { id: 'laundry', name: 'The Industrial Laundromat', spawn: [0, 1.0, 3.6] };
const COLORS = [0xffd21a, 0x1ad2c8, 0xff5aa8, 0xff8a1a, 0x8ad21a, 0x5a8aff];
let S = null;
const _v = new THREE.Vector3();

// ---------- BUDOWA ----------
export function build() {
    L.spawn = info.spawn.slice();
    L.bounds = { minX: X0 + 0.4, maxX: X1 - 0.4, minZ: Z1 + 0.4, maxZ: Z0 - 0.4, maxY: H - 0.4 };
    L.onNoise = onNoise;
    S = { clock: 0, runT: 0, introT: INTRO_TIME, phase: 'intro', valves: [], safe: [], soap: null, vents: [], drums: [], nextSteam: 25, steam: 0,
          machT: 2, hudT: 0, caughtT: -1, leaving: false, done: 0, rage: false, fx: [], lamps: [], blackout: 0, nextBlackout: 35, glimpseT: 18, rumbleT: 12 };
    buildHall();
    buildMachines();
    buildDryer();
    buildCeiling();
    buildSoap();
    buildPipes();
    buildValves();
    buildGate();
    buildDoor({ x: 0, z: Z0 - 0.03, rotY: Math.PI, label: 'LEVELS', color: '#ffd27a', wood: 0x5a6a7a, portal: { target: 'levels', spawn: ARRIVAL_LAUNDRY, onEnter: () => toast('Back to the levels') } });
    buildThreadman();
    buildGlimpse();
    buildGrid();
    S.hud = cameraPanel(1024, 200, 0.42, 0.082, 0.2, -0.75, 990);
    S.intro = cameraPanel(1280, 820, 1.0, 0.64, -0.04, -1.05, 995); S.intro.last = -1;
    S.white = new THREE.Mesh(new THREE.PlaneGeometry(3, 3), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthTest: false }));
    S.white.position.z = -0.26; S.white.renderOrder = 996; camera.add(S.white);
    S.scare = createJumpscare({ head: buildMask(), scale: 1.6, y: -0.25, restZ: -0.45, fromZ: -2.2, eyes: false });
}

function buildHall() {
    addCrispBlock(0, -0.5, (Z0 + Z1) / 2, X1 - X0 + 2, 1, Z0 - Z1 + 2, 0x7a7670, 0x101010, tex.floor, { rough: tex.floorRough });
    addCrispBlock(0, H + 0.5, (Z0 + Z1) / 2, X1 - X0 + 2, 1, Z0 - Z1 + 2, 0x4a4844, 0x101010);
    for (const [x, z, w, d] of [[0, Z1 - 0.5, X1 - X0 + 2, 1], [0, Z0 + 0.5, X1 - X0 + 2, 1], [X0 - 0.5, (Z0 + Z1) / 2, 1, Z0 - Z1], [X1 + 0.5, (Z0 + Z1) / 2, 1, Z0 - Z1]])
        addCrispBlock(x, H / 2, z, w, H, d, 0x8a8478, 0x1a1a1a, tex.wall);
    // Przemysłowe lampy w parze
    // Przemysłowe lampy w parze: słabe, migoczą i czasem gasną
    for (const z of [-2, -14, -26, -38, -50]) for (const x of [-8, 8]) {
        const l = new THREE.PointLight(0xffe8c8, 10, 15, 1.7); l.position.set(x, H - 1.2, z); L.root.add(l);
        const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffe8c8 })); bulb.position.copy(l.position); L.root.add(bulb);
        S.lamps.push({ l: l, bulb: bulb, ph: Math.random() * 10, bad: Math.random() < 0.35 });
    }
}
// Pralka: kolorowa plastikowa obudowa z okrągłymi drzwiczkami od strony alejki
function machine(x, z, face, col) {
    const m = addCrispBlock(x, 0.9, z, 1.4, 1.8, 1.6, col, 0x1a1a1a);
    m.material.roughness = 0.35;
    const door = new THREE.Group(); door.position.set(x + face * 0.71, 1.0, z); door.rotation.y = face * Math.PI / 2; L.root.add(door);
    door.add(new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.06, 10, 28), new THREE.MeshStandardMaterial({ color: 0xc8c8c8, metalness: 0.8, roughness: 0.3 })));
    const glass = new THREE.Mesh(new THREE.CircleGeometry(0.4, 28), new THREE.MeshStandardMaterial({ color: 0x1a2a3a, roughness: 0.1, metalness: 0.2 })); glass.position.z = 0.01; door.add(glass);
    const panel = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.18), new THREE.MeshBasicMaterial({ color: 0x101010 })); panel.position.set(0, 0.7, 0.01); door.add(panel);
    S.drums.push(glass);
}
// Otwarty bęben (kryjówka): pusty w środku, wejście 1,4 m od strony alejki. Szmaciarz tam nie wejdzie.
function openDrum(x, z, face, col) {
    const W = 2.6, t = 0.15, hgt = 2.4;
    const block = (dx, dy, dz, w, h, d) => addCrispBlock(x + dx, dy, z + dz, w, h, d, col, 0x1a1a1a);
    block(0, hgt - t / 2, 0, W, t, W);                                   // góra
    block(-face * (W / 2 - t / 2), hgt / 2, 0, t, hgt, W);               // tył
    block(0, hgt / 2, -(W / 2 - t / 2), W, hgt, t); block(0, hgt / 2, W / 2 - t / 2, W, hgt, t);   // boki
    block(face * (W / 2 - t / 2), 2.05, 0, t, 0.6, W);                   // nadproże nad wejściem
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.85, 0.09, 10, 32), new THREE.MeshStandardMaterial({ color: 0xd8d8d8, metalness: 0.8, roughness: 0.3 }));
    ring.position.set(x + face * (W / 2 + 0.02), 0.95, z); ring.rotation.y = Math.PI / 2; L.root.add(ring);
    S.safe.push(new THREE.Box3(new THREE.Vector3(x - W / 2 + t, 0, z - W / 2 + t), new THREE.Vector3(x + W / 2 - t, 2.2, z + W / 2 - t)));
}
function buildMachines() {
    // Cztery rzędy pralek wzdłuż hali, alejki przy x = -7, 0, 7 i przy ścianach
    let k = 0;
    for (const [rx, face] of [[-10.5, 1], [-3.5, 1], [3.5, -1], [10.5, -1]]) {
        for (let z = -6; z >= -30; z -= 2) {
            if (z === -18 && Math.abs(rx) < 5) continue;                 // przerwa w środku: otwarta strefa z zaworem 1
            if ((z === -6 || z === -30) && Math.abs(rx) > 9) { openDrum(rx + face * 0.6, z, face, COLORS[(k++) % COLORS.length]); z -= 1; continue; }
            machine(rx, z, face, COLORS[(k++) % COLORS.length]);
            if (Math.abs(rx) < 5) machine(rx - face * 1.42, z, -face, COLORS[(k + 2) % COLORS.length]);   // podwójne rzędy w środku
        }
    }
}
// Wielka suszarka w zachodniej ścianie: obracający się bęben, w środku zawór 2 i bezpieczne schronienie
function buildDryer() {
    const cx = X0 + 1.8, cy = 2.0, cz = -40, R = 1.8, len = 3.4;
    const drum = new THREE.Group(); drum.position.set(cx, cy, cz); L.root.add(drum);
    const dc = T.makeCanvas(256, 128), dx = dc.getContext('2d');
    dx.fillStyle = '#9aa0a8'; dx.fillRect(0, 0, 256, 128);
    for (let i = 0; i < 256; i += 10) for (let j = 0; j < 128; j += 10) { dx.fillStyle = '#5a6068'; dx.beginPath(); dx.arc(i + 5, j + 5, 2.2, 0, 7); dx.fill(); }
    for (let i = 0; i < 6; i++) { dx.fillStyle = '#d0d4d8'; dx.fillRect(i * 43, 0, 8, 128); }
    const dt = T.toTex(dc, true); dt.repeat.set(4, 1);
    const shell = new THREE.Mesh(new THREE.CylinderGeometry(R, R, len, 32, 1, true), new THREE.MeshStandardMaterial({ map: dt, side: THREE.BackSide, metalness: 0.7, roughness: 0.4 }));
    shell.rotation.z = Math.PI / 2; drum.add(shell);
    const back = new THREE.Mesh(new THREE.CircleGeometry(R, 32), new THREE.MeshStandardMaterial({ color: 0x6a7078, metalness: 0.7, roughness: 0.4 })); back.position.x = -len / 2; back.rotation.y = Math.PI / 2; drum.add(back);
    S.dryer = { drum: shell, pos: new THREE.Vector3(cx, cy, cz), noiseT: 0 };
    const frame = new THREE.Mesh(new THREE.TorusGeometry(R + 0.1, 0.18, 12, 40), new THREE.MeshStandardMaterial({ color: 0xffd21a, roughness: 0.4 }));
    frame.position.set(cx + len / 2, cy, cz); frame.rotation.y = Math.PI / 2; L.root.add(frame);
    // Kolizje wnętrza: podłoga bębna i ściany obudowy dookoła wejścia
    addCrispBlock(cx, 0.35, cz, len, 0.3, 2.4, 0x5a6068, 0x101010);
    addCrispBlock(cx, cy + R + 0.6, cz, len + 0.2, 1.2, 2 * R + 1.4, 0x8a8478, 0x1a1a1a);
    for (const s of [-1, 1]) addCrispBlock(cx, cy, cz + s * (R + 0.4), len + 0.2, 2 * R + 1.2, 0.8, 0x8a8478, 0x1a1a1a);
    S.safe.push(new THREE.Box3(new THREE.Vector3(cx - len / 2, 0.3, cz - 1.3), new THREE.Vector3(cx + len / 2 - 0.2, 3.6, cz + 1.3)));
}
// Szyny podsufitowe z workami z praniem, rury i kładki na 3 m (bezpieczne przed atakiem z ziemi)
function bag(x, y, z, col) {
    const m = addCrispBlock(x, y, z, 0.8, 1.0, 0.8, col, 0x202020);
    m.material.roughness = 0.95;
    const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, H - 0.3 - (y + 0.5), 5), new THREE.MeshStandardMaterial({ color: 0x3a3a3a }));
    rope.position.set(x, (H - 0.3 + y + 0.5) / 2, z); L.root.add(rope);
}
function buildCeiling() {
    const rail = new THREE.MeshStandardMaterial({ color: 0x4a4a4a, metalness: 0.8, roughness: 0.4 });
    for (const x of [-7, 0, 7]) { const r = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, Z0 - Z1 - 4), rail); r.position.set(x, H - 0.3, (Z0 + Z1) / 2); L.root.add(r); }
    // Kładki na 3 m przy ścianie wschodniej, wejście po skrzyniach
    addCrispBlock(X1 - 0.8, 3.0, -18, 1.4, 0.2, 22, 0x5a5a5a, 0x1a1a1a);
    for (const [y, z] of [[0.5, -6.2], [1.3, -6.2], [2.1, -6.8]]) addCrispBlock(X1 - 0.8, y, z, 1.2, 0.8, 1.2, 0x8a6a3a, 0x201810, tex.wood);
    // Zawór 3: pionowa rura (wspinaczka), platforma na górze i worki na szynach do zaworu
    addCrispBlock(14, 3.0, -36, 0.36, 6.0, 0.36, 0xb07a3a, 0x201008);
    addCrispBlock(14, 6.0, -36, 1.2, 0.2, 1.2, 0x5a5a5a, 0x1a1a1a);
    [[11.6, 5.3, -37.4], [9.3, 5.1, -39.0], [7.0, 5.4, -40.6], [5.0, 5.2, -42.2]].forEach((b, i) => bag(b[0], b[1], b[2], COLORS[i]));
    addCrispBlock(3.0, 5.6, -43.8, 1.4, 0.2, 1.4, 0x5a5a5a, 0x1a1a1a);
    // Ozdobne worki wysoko nad alejkami
    for (let z = -4; z > -34; z -= 5) bag(z % 2 ? -7 : 7, 6.6, z, COLORS[Math.abs(z) % COLORS.length]);
}
// Zalana sekcja tylna: śliska posadzka z mydlinami (słaba przyczepność, głośny pisk)
function buildSoap() {
    const minX = X0, maxX = 0, minZ = Z1, maxZ = -44;
    const floor = addCrispBlock((minX + maxX) / 2, 0.02, (minZ + maxZ) / 2, maxX - minX, 0.04, maxZ - minZ, 0xa8c8d8, 0x6a8a9a);
    L.obstacles[L.obstacles.length - 1].grip = 0.35;
    floor.material.roughness = 0.05; floor.material.metalness = 0.1;
    const c = T.makeCanvas(256, 256), x = c.getContext('2d'); x.clearRect(0, 0, 256, 256);
    for (let i = 0; i < 160; i++) { x.strokeStyle = 'rgba(255,255,255,' + (0.3 + Math.random() * 0.5) + ')'; x.lineWidth = 2; x.beginPath(); x.arc(Math.random() * 256, Math.random() * 256, 2 + Math.random() * 9, 0, 7); x.stroke(); }
    const bt = T.toTex(c, true); bt.repeat.set(6, 3);
    const foam = new THREE.Mesh(new THREE.PlaneGeometry(maxX - minX, maxZ - minZ), new THREE.MeshBasicMaterial({ map: bt, transparent: true, depthWrite: false }));
    foam.rotation.x = -Math.PI / 2; foam.position.set((minX + maxX) / 2, 0.05, (minZ + maxZ) / 2); L.root.add(foam);
    S.soap = new THREE.Box3(new THREE.Vector3(minX, -1, minZ), new THREE.Vector3(maxX, 1.2, maxZ));
}
// Niskie rury parowe (gracz przejdzie pod nimi, Szmaciarz nie) i otwory, z których bucha para
function buildPipes() {
    const pipe = (x1, z1, x2, z2, y) => {
        const len = Math.hypot(x2 - x1, z2 - z1), along = Math.abs(x2 - x1) > Math.abs(z2 - z1);
        addCrispBlock((x1 + x2) / 2, y, (z1 + z2) / 2, along ? len : 0.32, 0.32, along ? 0.32 : len, 0xb07a3a, 0x201008);
        S.vents.push(new THREE.Vector3((x1 + x2) / 2, y, (z1 + z2) / 2));
    };
    pipe(5.5, -24, 8.6, -24, 1.55); pipe(-8.6, -12, -5.5, -12, 1.55); pipe(1, -42.5, 16, -42.5, 1.55); pipe(-16, -33, -12.4, -33, 1.55);
    for (const v of [[0, 2.5, -8], [-13, 2.5, -22], [13, 2.5, -30], [-6, 2.5, -48], [8, 2.5, -50]]) S.vents.push(new THREE.Vector3(v[0], v[1], v[2]));
}
// Czerwone zawory: koło z szprychami na rurze. Trzeba złapać obręcz i kręcić dłonią dookoła.
function valve(x, y, z, rotY, turns, label) {
    const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = rotY; L.root.add(g);
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.4, 10), new THREE.MeshStandardMaterial({ color: 0x5a5a5a, metalness: 0.8 })); stem.rotation.x = Math.PI / 2; stem.position.z = -0.2; g.add(stem);
    const wheel = new THREE.Group(); g.add(wheel);
    const red = new THREE.MeshStandardMaterial({ color: 0xd01818, emissive: 0x500000, roughness: 0.4, metalness: 0.3 });
    wheel.add(new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.035, 10, 32), red));
    for (let i = 0; i < 4; i++) { const sp = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.035, 0.035), red); sp.rotation.z = i * Math.PI / 4; wheel.add(sp); }
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), new THREE.MeshBasicMaterial({ color: 0xff2010 })); lamp.position.set(0, 0.45, -0.1); g.add(lamp);
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex.dot, color: 0xff2010, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); glow.scale.set(0.9, 0.9, 1); glow.position.copy(lamp.position); g.add(glow);
    g.updateMatrixWorld(true);
    const center = new THREE.Vector3(); wheel.getWorldPosition(center);
    const normal = new THREE.Vector3(0, 0, 1).applyQuaternion(g.quaternion);
    S.valves.push({ g: g, wheel: wheel, lamp: lamp, glow: glow, center: center, normal: normal, need: turns * Math.PI * 2, acc: 0, last: [null, null], done: false, label: label });
}
function buildValves() {
    valve(0, 1.2, -18.3, 0, TURNS[0], 'between the washing machines');                       // 1: otwarta strefa na parterze
    valve(X0 + 0.25, 1.6, -40, Math.PI / 2, TURNS[1], 'inside the giant dryer');              // 2: w bębnie suszarki
    valve(3.0, 6.3, -44.35, 0, TURNS[2], 'up on the ceiling pipes');                          // 3: na rurach pod sufitem
    valve(-13, 1.2, Z1 + 0.25, 0, TURNS[3], 'in the flooded back section');                   // 4: zalana sekcja tylna
    addCrispBlock(0, 0.55, -18.6, 0.3, 1.1, 0.3, 0xb07a3a, 0x201008);                         // rura pod zaworem 1
    addCrispBlock(3.0, 6.3, -44.75, 2.4, 0.3, 0.3, 0xb07a3a, 0x201008);                       // rura pod zaworem 3
}
// Brama wyjściowa: zablokowana gorącą parą, dopóki nie zakręcisz 4 zaworów
function buildGate() {
    const gx = 8, gz = Z1 + 0.03;
    S.exitDoor = buildDoor({ x: gx, z: gz, rotY: 0, label: 'EXIT', color: '#ff6a4a', wood: 0x4a4a4a });
    addCrispBlock(gx, 1.3, gz + 0.6, 2.2, 2.6, 0.3, 0xffffff, 0xffffff);
    S.steamWall = L.obstacles[L.obstacles.length - 1];
    S.steamWallMesh = L.root.children[L.root.children.length - 1];
    S.steamWallMesh.material.transparent = true; S.steamWallMesh.material.opacity = 0.35;
    const n = 220, pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { pos[i * 3] = gx + (Math.random() - 0.5) * 2.2; pos[i * 3 + 1] = Math.random() * 2.6; pos[i * 3 + 2] = gz + 0.4 + Math.random() * 0.6; }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    S.gateSteam = new THREE.Points(geo, new THREE.PointsMaterial({ map: tex.dot, color: 0xffffff, size: 0.5, transparent: true, opacity: 0.6, depthWrite: false })); L.root.add(S.gateSteam);
    S.gateLight = new THREE.PointLight(0xff2010, 6, 6, 2); S.gateLight.position.set(gx, 3.2, gz + 1); L.root.add(S.gateLight);
    S.gatePos = new THREE.Vector3(gx, 1, gz + 1);
}

// ---------- SZMACIARZ ----------
function sheetTexture() {
    const c = T.makeCanvas(128, 256), x = c.getContext('2d'), R = T.mkRng(77);
    x.fillStyle = '#c8c0b0'; x.fillRect(0, 0, 128, 256);
    for (let i = 0; i < 40; i++) { x.fillStyle = 'rgba(' + (60 + R() * 60) + ',' + (50 + R() * 40) + ',30,' + (0.15 + R() * 0.3) + ')'; x.beginPath(); x.ellipse(R() * 128, R() * 256, 4 + R() * 18, 8 + R() * 30, R() * 3, 0, 7); x.fill(); }
    for (let i = 0; i < 128; i += 6) { x.strokeStyle = 'rgba(80,70,60,0.25)'; x.beginPath(); x.moveTo(i, 0); x.lineTo(i + 20, 256); x.stroke(); }
    return T.toTex(c, true);
}
// Porcelanowa maska bez oczu: wykrzywiona, popękana, z cienką szczeliną ust
function buildMask() {
    const c = T.makeCanvas(256, 256), x = c.getContext('2d');
    x.fillStyle = '#f2eee6'; x.fillRect(0, 0, 256, 256);
    x.strokeStyle = 'rgba(40,30,30,0.7)'; x.lineWidth = 2;
    for (let i = 0; i < 7; i++) { x.beginPath(); let px = 60 + Math.random() * 140, py = 30 + Math.random() * 60; x.moveTo(px, py); for (let k = 0; k < 6; k++) { px += (Math.random() - 0.5) * 40; py += 15 + Math.random() * 15; x.lineTo(px, py); } x.stroke(); }
    x.fillStyle = '#100808'; x.beginPath(); x.moveTo(80, 190); x.quadraticCurveTo(128, 175, 180, 200); x.quadraticCurveTo(128, 186, 80, 190); x.fill();
    x.fillStyle = 'rgba(120,110,100,0.35)'; for (const ex of [92, 164]) { x.beginPath(); x.ellipse(ex, 120, 22, 12, 0, 0, 7); x.fill(); }   // płytkie wgłębienia zamiast oczu
    const g = new THREE.Group();
    const face = new THREE.Mesh(new THREE.SphereGeometry(0.2, 28, 20, 0, Math.PI * 2, 0, Math.PI * 0.62), new THREE.MeshPhysicalMaterial({ map: T.toTex(c, false), roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.05 }));
    face.rotation.x = Math.PI / 2; face.scale.set(1.0, 1.5, 0.9); face.position.z = 0.04; g.add(face);
    g.rotation.z = 0.32;   // przekrzywiona
    return g;
}
function buildThreadman() {
    const cloth = new THREE.MeshStandardMaterial({ map: sheetTexture(), roughness: 0.95, side: THREE.DoubleSide });
    const cable = new THREE.MeshStandardMaterial({ color: 0x141414, roughness: 0.6 });
    const root = new THREE.Group(); L.root.add(root);
    const hips = new THREE.Group(); hips.position.y = 1.65; root.add(hips);
    const torso = new THREE.Group(); hips.add(torso);
    // Tułów: kilka skręconych pasm prześcieradła i kable
    for (let i = 0; i < 4; i++) { const st = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.09, 1.3, 6, 6), cloth); st.position.set(Math.cos(i * 1.6) * 0.07, 0.65, Math.sin(i * 1.6) * 0.05); st.rotation.set(Math.sin(i) * 0.12, i * 0.8, Math.cos(i) * 0.12); torso.add(st); }
    for (let i = 0; i < 5; i++) { const cb = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.9 + i * 0.12, 5), cable); cb.position.set((i - 2) * 0.05, 0.5, 0.08); cb.rotation.z = (i - 2) * 0.15; torso.add(cb); }
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.05, 0.35, 6), cloth); neck.position.y = 1.42; torso.add(neck);
    const head = buildMask(); head.position.set(0, 1.72, 0); head.rotation.y = Math.PI; torso.add(head);
    const rag = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.5, 8, 1, true), cloth); rag.position.set(0, 1.62, 0.02); torso.add(rag);
    // Ręce i nogi: bardzo długie, chude pasma
    const limb = (len, r) => { const p = new THREE.Group(), m = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.6, r, len, 6, 4), cloth); m.position.y = -len / 2; p.add(m); const tip = new THREE.Mesh(new THREE.ConeGeometry(r * 1.4, 0.25, 6), cloth); tip.position.y = -len; tip.rotation.x = Math.PI; p.add(tip); return p; };
    const armL = limb(1.7, 0.05), armR = limb(1.7, 0.05); armL.position.set(-0.2, 1.25, 0); armR.position.set(0.2, 1.25, 0); torso.add(armL, armR);
    const legL = limb(1.65, 0.07), legR = limb(1.65, 0.07); legL.position.set(-0.12, 0, 0); legR.position.set(0.12, 0, 0); hips.add(legL, legR);
    S.tm = { root: root, hips: hips, torso: torso, armL: armL, armR: armR, legL: legL, legR: legR, x: 0, z: -48, dir: Math.PI, mode: 'patrol', target: null, path: [], pathT: 0, wp: 0, lostT: 0, screechT: -99, investigate: null, stepT: 0, crawl: 0, waitT: 0 };
    root.position.set(0, 0, -48);
}

// ---------- SIATKA DO CHODZENIA (BFS po kratkach 1 m) ----------
function buildGrid() {
    const W = X1 - X0, D = Z0 - Z1, blocked = new Uint8Array(W * D);
    for (let i = 0; i < W; i++) for (let j = 0; j < D; j++) {
        const cx = X0 + i + 0.5, cz = Z0 - j - 0.5;
        const cell = new THREE.Box3(new THREE.Vector3(cx - 0.75, 0.2, cz - 0.75), new THREE.Vector3(cx + 0.75, 3.4, cz + 0.75));
        let b = false;
        for (const o of L.obstacles) { const bb = o.box3; if (bb.max.y < 0.25 || bb.min.y > 3.4) continue; if (bb.intersectsBox(cell)) { b = true; break; } }
        if (!b) for (const sz of S.safe) if (sz.intersectsBox(cell)) { b = true; break; }
        blocked[j * W + i] = b ? 1 : 0;
    }
    S.grid = { W: W, D: D, blocked: blocked };
    // Punkty patrolu: główne alejki
    S.patrol = [[0, -4], [-7, -10], [-7, -28], [0, -36], [8, -38], [7, -26], [7, -8], [13, -16], [-13, -16], [-8, -48], [6, -48], [0, -18]];
}
const cellOf = (x, z) => [Math.max(0, Math.min(S.grid.W - 1, Math.floor(x - X0))), Math.max(0, Math.min(S.grid.D - 1, Math.floor(Z0 - z)))];
function findPath(fx, fz, tx, tz) {
    const { W, D, blocked } = S.grid, [si, sj] = cellOf(fx, fz);
    let [ti, tj] = cellOf(tx, tz);
    if (blocked[tj * W + ti]) {   // cel w zablokowanej kratce: najbliższa wolna
        let best = null, bd = 1e9;
        for (let r = 1; r < 4 && !best; r++) for (let a = -r; a <= r; a++) for (let b = -r; b <= r; b++) { const i = ti + a, j = tj + b; if (i < 0 || j < 0 || i >= W || j >= D || blocked[j * W + i]) continue; const d = a * a + b * b; if (d < bd) { bd = d; best = [i, j]; } }
        if (!best) return [];
        [ti, tj] = best;
    }
    const prev = new Int32Array(W * D).fill(-1), q = [sj * W + si]; prev[sj * W + si] = sj * W + si;
    const goal = tj * W + ti;
    while (q.length) {
        const c = q.shift(); if (c === goal) break;
        const ci = c % W, cj = (c / W) | 0;
        for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]]) {
            const ni = ci + di, nj = cj + dj; if (ni < 0 || nj < 0 || ni >= W || nj >= D) continue;
            const n = nj * W + ni; if (prev[n] !== -1 || blocked[n]) continue;
            if (di && dj && (blocked[cj * W + ni] || blocked[nj * W + ci])) continue;   // bez ścinania rogów
            prev[n] = c; q.push(n);
        }
    }
    if (prev[goal] === -1) return [];
    const path = []; let c = goal;
    while (c !== prev[c]) { path.push([X0 + (c % W) + 0.5, Z0 - ((c / W) | 0) - 0.5]); c = prev[c]; }
    return path.reverse();
}

// ---------- ZDARZENIA ----------
function inSafe(p) { return S.safe.some(b => b.containsPoint(p)); }
function onNoise(speed, pos) {
    if (!S || S.phase !== 'play') return;
    if (S.soap.containsPoint(pos) && speed > 1.0) { SFX.squeak(pos); if (S.tm.mode !== 'chase') heardAt(pos, 30); }   // mydliny: głośny pisk, słychać w całej hali
    else if (speed > 3.2) heardAt(pos, 14);
}
function heardAt(pos, range) {
    const tm = S.tm; if (Math.hypot(pos.x - tm.x, pos.z - tm.z) > range || tm.mode === 'chase') return;
    tm.mode = S.rage ? 'rage' : 'investigate'; tm.investigate = pos.clone(); tm.pathT = 0;
}
function canSee(p) {
    const tm = S.tm, dx = p.x - tm.x, dz = p.z - tm.z, d = Math.hypot(dx, dz);
    if (d > SEE_DIST) return false;
    if (tm.mode !== 'chase' && d > 2 && (dx * Math.sin(tm.dir) + dz * Math.cos(tm.dir)) / d < 0.35) return false;   // widzi tylko przed sobą
    // Linia wzroku: czy po drodze nie stoi przeszkoda (na wysokości 1,5 m)
    const steps = Math.ceil(d / 0.5);
    for (let i = 1; i < steps; i++) {
        _v.set(tm.x + dx * i / steps, 1.5, tm.z + dz * i / steps);
        for (const o of L.obstacles) if (o.box3.containsPoint(_v)) return false;
    }
    return true;
}
function caught() {
    if (S.caughtT >= 0) return;
    S.caughtT = 0; S.scare.trigger(); releaseAll();
    toast('The Threadman got you...', '#e0533f');
}
function finishValve(v) {
    v.done = true; S.done++;
    v.lamp.material.color.setHex(0x30ff60); v.glow.material.color.setHex(0x30ff60);
    SFX.fuse(); buzz('both', 0.6, 200);
    toast('Valve closed: ' + S.done + '/4', '#7fc47f');
    if (S.done === 4) openGate();
}
function openGate() {
    S.rage = true; S.tm.mode = 'rage'; S.tm.pathT = 0;
    S.steamWallMesh.visible = false; S.gateSteam.visible = false;
    const i = L.obstacles.indexOf(S.steamWall); if (i >= 0) L.obstacles.splice(i, 1);
    if (S.steamWall.body) S.steamWall.body.position.y = -50;
    S.gateLight.color.setHex(0x30ff60); S.gateLight.intensity = 14;
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 10), new THREE.MeshBasicMaterial({ color: 0x40ff60 })); lamp.position.set(S.gatePos.x, 3.0, S.gatePos.z - 0.9); L.root.add(lamp);
    SFX.bell(); SFX.screech({ x: S.tm.x, y: 2, z: S.tm.z });
    toast('The steam drops! Run to the EXIT. The Threadman is furious!', '#ffd27a');
    const d = S.exitDoor; addPortal(d);
}
function addPortal(d) {
    L.portals.push({ box3: new THREE.Box3(new THREE.Vector3(d.x - 0.7, -0.5, d.z), new THREE.Vector3(d.x + 0.7, 2.6, d.z + 0.9)), target: 'levels', spawn: ARRIVAL_LAUNDRY, onEnter: finish });
}
function finish() {
    if (S.leaving) return; S.leaving = true;
    toast('You escaped the laundromat!', '#7fc47f');
    levelReward('laundry', REWARD_FIRST, REWARD_REPEAT, 'escaping the laundromat');
    recordTime('laundry', S.runT);
}
// Gorąca para: bucha z losowej rury, odpycha i oślepia
function steamBurst(p) {
    const v = S.vents[(Math.random() * S.vents.length) | 0];
    SFX.hiss(v, 1);
    const n = 70, pos = new Float32Array(n * 3), vel = [];
    for (let i = 0; i < n; i++) { pos[i * 3] = v.x; pos[i * 3 + 1] = v.y; pos[i * 3 + 2] = v.z; vel.push(new THREE.Vector3((Math.random() - 0.5) * 3, Math.random() * 2, (Math.random() - 0.5) * 3)); }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const pts = new THREE.Points(geo, new THREE.PointsMaterial({ map: tex.dot, color: 0xffffff, size: 0.9, transparent: true, opacity: 0.7, depthWrite: false })); L.root.add(pts);
    S.fx.push({ pts: pts, pos: pos, vel: vel, t: 2.2 });
    const d = Math.hypot(p.x - v.x, p.z - v.z);
    if (d < 3.2 && Math.abs(p.y - v.y) < 3) {
        const k = (1 - d / 3.2) * 7 + 2;
        S.body.velocity.x += (p.x - v.x) / Math.max(0.3, d) * k; S.body.velocity.z += (p.z - v.z) / Math.max(0.3, d) * k; S.body.velocity.y += 2;
        S.steam = 1.8; buzz('both', 0.7, 250); toast('Hot steam!', '#ffffff');
    }
}

// ---------- CO KLATKĘ ----------
const INTRO = [
    'A huge flooded laundry basement. The Threadman walks the aisles. If he sees you, he screams and sprints on all fours.',
    'Close the 4 red steam valves: grab the wheel rim and turn your hand around it. Then run to the EXIT gate.',
    'Valves: between the washing machines, inside the giant dryer, up on the ceiling pipes and in the flooded back.',
    'Hide inside open washer drums, or climb above 3 m. He cannot fit under low pipes or inside drums.',
    'Soapy floor squeaks loudly and calls him. Hot steam bursts from the pipes: it pushes you and blinds you.'
];
export function update(dt, t, ctx) {
    if (!S || S.leaving) return;
    S.clock += dt; S.ctx = ctx; S.body = ctx.body;
    const p = ctx.body.position;
    if (S.introT > 0) {
        S.introT -= dt;
        const sec = Math.max(0, Math.ceil(S.introT));
        if (sec !== S.intro.last) { S.intro.last = sec; drawInstructions(S.intro, 'The Industrial Laundromat', INTRO, 'He wakes up in ' + sec + ' s', { bg: 'rgba(12,14,16,0.9)', border: '#ff5aa8', title: '#fff0f6', text: '#e8eef2', footer: '#ffb030', size: 27 }); }
        S.intro.mesh.visible = S.introT > 0;
        if (S.introT <= 0) { S.phase = 'play'; toast('Find the 4 red valves. Stay quiet.', '#ff5aa8'); }
    }
    if (S.phase === 'play') S.runT += dt;
    // Złapany: chwila na jumpscare, potem od nowa
    S.scare.update(dt);
    if (S.caughtT >= 0) { S.caughtT += dt; if (S.caughtT > 1.6) { S.leaving = true; ctx.goto('laundry'); } return; }
    // Bębny pralek i suszarka się obracają, maszyny hałasują
    for (const d of S.drums) d.rotation.z += dt * 2;
    S.dryer.drum.rotation.x += dt * 0.4;
    S.machT -= dt; if (S.machT <= 0) { S.machT = 1.5 + Math.random() * 2.5; const a = S.patrol[(Math.random() * S.patrol.length) | 0]; (Math.random() < 0.5 ? SFX.bang : SFX.creak)(0.5, { x: a[0], y: 1, z: a[1] }); }
    const nearDryer = p.distanceTo(S.dryer.pos) < 4;
    S.dryer.noiseT -= dt; if (nearDryer && S.dryer.noiseT <= 0) { S.dryer.noiseT = 0.8; SFX.creak(0.9, S.dryer.pos); }   // hałas metalu w suszarce
    // Zawory: kręcenie dłonią dookoła środka koła (albo E na komputerze)
    for (const v of S.valves) {
        if (v.done) continue;
        [hands.L, hands.R].forEach((h, i) => {
            if (!h) return;
            const grip = h.userData.rig && h.userData.rig.target >= 0.9, rel = _v.copy(h.position).sub(v.center), dn = rel.dot(v.normal);
            rel.addScaledVector(v.normal, -dn);
            const r = rel.length();
            if (!grip || Math.abs(dn) > 0.3 || r < 0.12 || r > 0.5) { v.last[i] = null; return; }
            const ref = Math.abs(v.normal.y) > 0.9 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
            const ax = new THREE.Vector3().crossVectors(ref, v.normal).normalize(), ay = new THREE.Vector3().crossVectors(v.normal, ax);
            const ang = Math.atan2(rel.dot(ay), rel.dot(ax));
            if (v.last[i] !== null) { let d = ang - v.last[i]; if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2; v.acc += Math.abs(d); v.wheel.rotation.z += d; }
            v.last[i] = ang;
        });
        // Komputer: trzymaj E przy kole, żeby kręcić
        if (DESKTOP.enabled && hands.R && hands.R.userData.rig && hands.R.userData.rig.target >= 0.9 && hands.R.position.distanceTo(v.center) < 0.6) { v.acc += dt * Math.PI * 2; v.wheel.rotation.z += dt * 6; }
        if (v.acc >= v.need) finishValve(v);
    }
    // Para: losowe wyrzuty i biała mgła na ekranie
    if (S.phase === 'play') { S.nextSteam -= dt; if (S.nextSteam <= 0) { S.nextSteam = STEAM_MIN + Math.random() * (STEAM_MAX - STEAM_MIN); steamBurst(p); } }
    if (S.steam > 0) S.steam -= dt;
    S.white.material.opacity = Math.max(0, Math.min(0.92, S.steam * 0.6));
    for (const f of S.fx) { f.t -= dt; for (let i = 0; i < f.vel.length; i++) { f.pos[i * 3] += f.vel[i].x * dt; f.pos[i * 3 + 1] += f.vel[i].y * dt; f.pos[i * 3 + 2] += f.vel[i].z * dt; } f.pts.geometry.attributes.position.needsUpdate = true; f.pts.material.opacity = Math.max(0, f.t / 2.2) * 0.7; if (f.t <= 0) L.root.remove(f.pts); }
    S.fx = S.fx.filter(f => f.t > 0);
    if (!S.rage) { const pos = S.gateSteam.geometry.attributes.position; for (let i = 0; i < pos.count; i++) { let y = pos.getY(i) + dt * 1.5; if (y > 2.8) y = 0; pos.setY(i, y); } pos.needsUpdate = true; }
    if (S.phase === 'play') { thinkMonster(dt, t, p); scares(dt, t, p); }
    lampsUpdate(dt, t);
    animateMonster(dt, t);
    S.hudT -= dt; if (S.hudT <= 0) { S.hudT = 0.15; drawHud(p); }
}

function thinkMonster(dt, t, p) {
    const tm = S.tm, safe = inSafe(p) || p.y - 0.35 > SAFE_HEIGHT;
    const sees = !safe && canSee(p);
    if (sees && tm.mode !== 'chase') {
        if (S.clock - tm.screechT > 6) { SFX.screech({ x: tm.x, y: 2.5, z: tm.z }); tm.screechT = S.clock; }   // audio-jumpscare
        tm.mode = 'chase'; tm.pathT = 0;
    }
    if (tm.mode === 'chase') { if (sees) { tm.lostT = 0; tm.investigate = p.clone(); } else { tm.lostT += dt; if (!safe) tm.investigate = p.clone(); if (tm.lostT > LOSE_TIME || safe) { tm.mode = S.rage ? 'rage' : 'investigate'; tm.pathT = 0; } } }
    // Cel ruchu zależnie od trybu
    let target = null, speed = WALK;
    if (tm.mode === 'chase') { target = [p.x, p.z]; speed = SPRINT; }
    else if (tm.mode === 'investigate' && tm.investigate) { target = [tm.investigate.x, tm.investigate.z]; speed = INVESTIGATE; if (Math.hypot(tm.x - target[0], tm.z - target[1]) < 1.2) { tm.waitT += dt; if (tm.waitT > 3) { tm.waitT = 0; tm.mode = 'patrol'; tm.investigate = null; } } }
    else {
        if (tm.mode === 'rage') speed = RAGE;
        const wp = S.patrol[tm.wp]; target = wp;
        if (Math.hypot(tm.x - wp[0], tm.z - wp[1]) < 1.2) tm.wp = S.rage ? (Math.random() * S.patrol.length) | 0 : (tm.wp + 1) % S.patrol.length;
    }
    tm.crawl += ((tm.mode === 'chase' || tm.mode === 'rage' ? 1 : 0) - tm.crawl) * Math.min(1, dt * 4);
    tm.pathT -= dt;
    if (tm.pathT <= 0) { tm.pathT = tm.mode === 'chase' ? 0.3 : 1.0; tm.path = findPath(tm.x, tm.z, target[0], target[1]); }
    while (tm.path.length && Math.hypot(tm.path[0][0] - tm.x, tm.path[0][1] - tm.z) < 0.4) tm.path.shift();
    const next = tm.path.length ? tm.path[0] : null;
    if (next) {
        const dx = next[0] - tm.x, dz = next[1] - tm.z, d = Math.hypot(dx, dz);
        tm.x += dx / d * Math.min(d, speed * dt); tm.z += dz / d * Math.min(d, speed * dt);
        const want = Math.atan2(dx, dz); let dd = want - tm.dir; while (dd > Math.PI) dd -= Math.PI * 2; while (dd < -Math.PI) dd += Math.PI * 2;
        tm.dir += dd * Math.min(1, dt * 6);
    }
    // Kroki: przy hałasie maszyn ledwo je słychać
    tm.stepT -= dt * (tm.crawl > 0.5 ? 3 : 1);
    if (tm.stepT <= 0) { tm.stepT = 0.7; SFX.step(tm.crawl > 0.5 ? 0.7 : 0.35, { x: tm.x, y: 0, z: tm.z }); }
    // Złapanie
    if (!safe && Math.hypot(p.x - tm.x, p.z - tm.z) < CATCH_DIST) caught();
    // Bicie serca, gdy jest blisko
    const dist = Math.hypot(p.x - tm.x, p.z - tm.z);
    if (dist < 14) SFX.heartbeat(Math.max(0, 1 - dist / 14));
}
function animateMonster(dt, t) {
    const tm = S.tm, k = tm.crawl, sp = k > 0.5 ? 12 : 3.2, ph = t * sp;
    tm.root.position.set(tm.x, 0, tm.z); tm.root.rotation.y = tm.dir;
    // Chód: kołysanie; sprint: tułów pochylony do przodu, ręce jak przednie łapy
    tm.hips.position.y = 1.65 - k * 0.75;
    tm.torso.rotation.x = k * 1.25; tm.torso.rotation.z = Math.sin(ph * 0.5) * 0.12 * (1 - k);
    tm.legL.rotation.x = Math.sin(ph) * (0.35 + k * 0.5) - k * 0.6; tm.legR.rotation.x = -Math.sin(ph) * (0.35 + k * 0.5) - k * 0.6;
    tm.armL.rotation.x = -Math.sin(ph) * (0.3 + k * 0.7) - k * 1.0; tm.armR.rotation.x = Math.sin(ph) * (0.3 + k * 0.7) - k * 1.0;
    tm.armL.rotation.z = 0.15 * (1 - k); tm.armR.rotation.z = -0.15 * (1 - k);
}
// Światła: część lamp migocze, co jakiś czas wszystkie gasną na chwilę (z zgrzytem w ciemności)
function lampsUpdate(dt, t) {
    if (S.phase === 'play') { S.nextBlackout -= dt; if (S.nextBlackout <= 0) { S.nextBlackout = BLACKOUT_MIN + Math.random() * (BLACKOUT_MAX - BLACKOUT_MIN); S.blackout = 1.6 + Math.random(); SFX.creak(1, { x: S.tm.x, y: 1, z: S.tm.z }); } }
    if (S.blackout > 0) S.blackout -= dt;
    for (const lp of S.lamps) {
        let k = lp.bad ? (Math.sin(t * 23 + lp.ph) > 0.6 || Math.random() < 0.04 ? 0.1 : 1) : 0.9 + 0.1 * Math.sin(t * 3 + lp.ph);
        if (S.blackout > 0) k = 0.03;
        lp.l.intensity = 10 * k; lp.bulb.visible = k > 0.3;
    }
}
// Zjawa: nieruchoma sylwetka Szmaciarza na granicy mgły. Znika, gdy na nią spojrzysz.
function buildGlimpse() {
    const g = new THREE.Group(), cloth = new THREE.MeshBasicMaterial({ color: 0x3a3632, transparent: true, opacity: 0.85, fog: true });
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.14, 2.0, 6), cloth); body.position.y = 2.2; g.add(body);
    for (const s of [-1, 1]) { const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.07, 1.4, 5), cloth); leg.position.set(s * 0.12, 0.7, 0); g.add(leg); const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.05, 1.8, 5), cloth); arm.position.set(s * 0.25, 2.0, 0); arm.rotation.z = s * 0.08; g.add(arm); }
    const mask = buildMask(); mask.position.set(0, 3.4, 0); g.add(mask);
    g.visible = false; L.root.add(g);
    S.glimpse = { g: g, t: 0, lookT: 0 };
}
function scares(dt, t, p) {
    // Zjawy w mgle (tylko gdy prawdziwy Szmaciarz jest daleko)
    const gl = S.glimpse, tm = S.tm, farFromMonster = Math.hypot(p.x - tm.x, p.z - tm.z) > 18;
    camera.getWorldDirection(_v); _v.y = 0; _v.normalize();
    if (!gl.g.visible) {
        S.glimpseT -= dt;
        if (S.glimpseT <= 0 && farFromMonster && !S.rage) {
            S.glimpseT = 22 + Math.random() * 20;
            const ang = Math.atan2(_v.x, _v.z) + (Math.random() - 0.5) * 1.2, r = 11 + Math.random() * 2;
            const gx = Math.max(X0 + 1, Math.min(X1 - 1, p.x + Math.sin(ang) * r)), gz = Math.max(Z1 + 1, Math.min(Z0 - 1, p.z + Math.cos(ang) * r));
            gl.g.position.set(gx, 0, gz); gl.g.rotation.y = Math.atan2(p.x - gx, p.z - gz); gl.g.visible = true; gl.t = 6; gl.lookT = 0;
        }
    } else {
        gl.t -= dt;
        const dx = gl.g.position.x - p.x, dz = gl.g.position.z - p.z, d = Math.hypot(dx, dz), look = (dx * _v.x + dz * _v.z) / d;
        if (look > 0.93) gl.lookT += dt;
        if (gl.lookT > 0.35 || d < 7 || gl.t <= 0) { if (gl.lookT > 0.35 || d < 7) { SFX.stinger({ x: gl.g.position.x, y: 2, z: gl.g.position.z }); buzz('both', 0.5, 120); } gl.g.visible = false; }
    }
    // Daleki, niski pomruk i zgrzyt gdzieś w hali
    S.rumbleT -= dt;
    if (S.rumbleT <= 0) { S.rumbleT = 14 + Math.random() * 14; SFX.roar(0.25, { x: p.x + (Math.random() - 0.5) * 30, y: 1, z: p.z + (Math.random() - 0.5) * 30 }); }
}
function fmt(s) { s = Math.max(0, Math.floor(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); }
function drawHud(p) {
    const x = S.hud.ctx; panelBg(S.hud, 'rgba(12,14,16,0.72)');
    x.textBaseline = 'middle'; x.textAlign = 'left';
    x.font = 'bold 76px "Courier New", monospace'; x.fillStyle = '#e8eef2'; x.fillText(fmt(S.runT), 30, 74);
    x.font = 'bold 36px "Courier New", monospace'; x.fillStyle = S.done === 4 ? '#7fff90' : '#ff6a6a'; x.fillText('Valves ' + S.done + '/4', 330, 52);
    x.font = 'bold 26px "Courier New", monospace';
    let msg = 'Find the red valves. Stay quiet.', col = '#c8d0d8';
    const tm = S.tm;
    if (S.rage) { msg = 'RUN to the EXIT gate!'; col = '#7fff90'; }
    else if (inSafe(p)) { msg = 'Hidden. He cannot reach you here.'; col = '#7fc4ff'; }
    else if (tm.mode === 'chase') { msg = 'HE SEES YOU! Hide or climb!'; col = '#ff4a2a'; }
    else if (S.soap.containsPoint(p)) { msg = 'Soapy floor: every slap squeaks!'; col = '#ffd27a'; }
    else { const v = S.valves.find(vv => !vv.done && vv.center.distanceTo(p) < 3); if (v) { msg = 'Grab the wheel rim and turn it: ' + (v.acc / (Math.PI * 2)).toFixed(1) + '/' + (v.need / (Math.PI * 2)) + ' turns'; col = '#ffb030'; } }
    x.fillStyle = col; x.fillText(msg, 30, 162);
    S.hud.update();
}
export function dispose() {
    if (S) { S.hud.dispose(); S.intro.dispose(); S.scare.dispose(); camera.remove(S.white); }
    L.onNoise = null;
    S = null;
}
