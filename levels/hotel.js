// ==========================================
// POZIOM 10: THE HOTEL (100 drzwi, jak w Doors)
// Idziesz przez ciąg 100 numerowanych pokoi, każdy za drzwiami z numerem; otwierają się same, tylko drzwi 100 są zamknięte na klucz i potrzebują 3 kluczy.
// Klucze leżą w trzech pokojach z kluczem (hol + 2 pokoje poboczne po bokach): w jednym z pokoi pobocznych każdego holu, trzeba zajrzeć do obu.
// W holach patroluje Ślepy Lokaj (słyszy bieg). Pokój 50 (za drzwiami 50) jest wielki i mieszka w nim Ślepy: słyszy każdy hałas, więc idź powoli i po cichu.
// Zdarzenia: ŁOMOT (5 s migania świateł, potem pędzi przez wszystkie pokoje; kto nie siedzi w szafie, ginie), SZEPT (usłysz "psst", obróć się i spójrz,
// zanim ugryzie, inaczej tracisz serce), blackouty i szepty. Co 10. drzwi zapisują punkt kontrolny (i leczą o 1 serce).
// Otwarcie drzwi 100 kończy poziom i prowadzi do lobby. Pokoje są budowane na bieżąco (3-4 naraz) i usuwane za plecami gracza: mało obiektów, dowolna długość.
// Układ jest stały (działa duch).
// ==========================================
import { THREE, L, tex, camera, addCollider, renderer, lighting } from '../core/engine.js';
import { setFlashHolder } from '../core/visuals.js';
import * as T from '../core/textures.js';
import { buildMannequin, addMonsterFace } from '../core/mannequin.js';
import { swapModel } from '../core/glbmonster.js';
import { levelReward, recordTime, diffOf } from '../core/economy.js';
import { toast } from '../core/terminal.js';
import { setPlayerPosition, releaseAll, hands } from '../core/player.js';
import * as SFX from '../core/audio.js';
import { buzz } from '../core/haptics.js';
import { createGhost } from '../core/runkit.js';
import { createEvents } from '../core/events.js';
import { createBot, stepBot } from '../core/botkit.js';
import { ARRIVAL_FROM_HOTEL } from './levels.js';
import { buildDoor, cameraPanel, panelBg, drawInstructions, createJumpscare, introSeen, takeRespawn } from '../core/levelkit.js';
import { setDread, heardVoice, DREAD } from '../core/ambience.js';
import { VOICE, nextIn } from '../core/hauntlogic.js';
import { PACE } from '../core/config.js';   // mnożnik tempa ruchu gracza (core/config.js): prędkości potworów skalowane razem z ruchem

const RW = 12, H = 3.4, HALF = RW / 2, DOOR_W = 1.7, DOOR_H = 2.6, WALL_T = 0.4;   // szerokość zwykłego pokoju 12 m, wysokość 3,4 m
const N_ROOMS = 100, LEN_NORMAL = 12, LEN_HUB = 20, LEN_BIG = 40;                  // liczba pokoi (drzwi 100 = wyjście) i długości: zwykły, hol z kluczem, wielki pokój 50
const HUBS = [24, 66, 85];                                                            // indeksy holów z kluczem (drzwi 25, 67, 86): w każdym 2 pokoje poboczne, klucz w jednym z nich (razem 6 pokoi pobocznych, 3 klucze)
const BIG = 50, BIG_HALF = 12;                                                        // indeks wielkiego pokoju (drzwi 50 prowadzą do niego) i jego połowa szerokości (24 m)
const SIDE_W = 9, DOORWAY = 2.6, KEYS_NEEDED = 3;                                     // szerokość pokoju pobocznego, szerokość przejścia z holu, tyle kluczy otwiera drzwi 100
const CHECKPOINT_EVERY = 10;                                                          // co tyle drzwi punkt kontrolny
const FAKE = { chance: 0.2, breathEvery: [7, 12], near: 4.5 };   // fałszywa kryjówka: co piąta szafa ma już kogoś w środku (cichy oddech zdradza to z bliska)
const RUSH = { wait: [18, 35], warn: 5, speed: 26 * PACE }, SCREECH = { chance: 0.35, window: 1.8 }, WEEPER = { walk: 2.0 * PACE, chase: 4.8 * PACE, hear: 10 };   // warn: 5 s migania świateł przed Łomotem
const FIGURE = { quiet: 1.3 * PACE, walk: 1.6 * PACE, investigate: 3.2 * PACE, chase: 5.5 * PACE, loud: 3.2 * PACE };   // Ślepy w pokoju 50: cisza poniżej quiet (m/s ciała), każdy szybszy ruch go przyciąga, od loud goni
const REWARD_FIRST = 6000, REWARD_REPEAT = 600, INTRO_TIME = 10, MAX_HP = { easy: 3, normal: 2, nightmare: 2 };   // serca zależą od trudności; punkt kontrolny leczy o 1 serce (na Easy wszystkie)
export const info = { id: 'hotel', name: 'The Hotel', spawn: [0, 1.0, -1.6] };
let S = null;
const z0 = (i) => S.zs[i];                       // południowa krawędź pokoju i (pokój ma z od z0(i) do z0(i+1))
const roomLen = (i) => S.zs[i] - S.zs[i + 1];
const roomOf = (z) => { for (let i = 0; i < S.n; i++) if (z > S.zs[i + 1]) return i; return S.n - 1; };
const lenOf = (i) => HUBS.includes(i) ? LEN_HUB : (i === BIG ? LEN_BIG : LEN_NORMAL);
const _v = new THREE.Vector3(), _w = new THREE.Vector3();

// ---------- WSPÓLNE MATERIAŁY I TEKSTURY (jedna instancja na poziom) ----------
function makeMats() {
    const std = (o) => new THREE.MeshStandardMaterial(o);
    return {
        box: new THREE.BoxGeometry(1, 1, 1),
        wall: std({ map: tex.wall, color: 0x8a6a56, roughness: 0.9 }), floor: std({ map: tex.floor, color: 0x4a2222, roughness: 0.85 }), ceil: std({ map: tex.wall, color: 0x3a2a24, roughness: 0.95 }),
        wood: std({ map: tex.wood, color: 0x6a4a34, roughness: 0.7 }), cloth: std({ color: 0x6a2a30, roughness: 0.95 }), cloth2: std({ color: 0x2a4a4a, roughness: 0.95 }),
        door: std({ map: tex.wood, color: 0x7a5236, roughness: 0.6 }), gold: std({ color: 0xe0b840, metalness: 0.7, roughness: 0.4, emissive: 0x504010, emissiveIntensity: 0.6 }), dark: std({ color: 0x0a0806, roughness: 1 })
    };
}
function plateTexture(label, locked) {
    const c = T.makeCanvas(256, 128), x = c.getContext('2d');
    x.fillStyle = locked ? '#3a0a0a' : '#2a2018'; x.fillRect(0, 0, 256, 128);
    x.strokeStyle = locked ? '#c04030' : '#c8a050'; x.lineWidth = 6; x.strokeRect(6, 6, 244, 116);
    x.fillStyle = locked ? '#ffb0a0' : '#f0d890'; x.font = 'bold 74px serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(label, 128, 68);
    return T.toTex(c, false);
}
function faceTexture(kind) {   // 'rush' = czarna masa z oczami i szczeliną pyska, 'screech' = blada twarz z szerokim uśmiechem
    const c = T.makeCanvas(256, 256), x = c.getContext('2d'), R = T.mkRng(kind === 'rush' ? 77 : 88);
    x.clearRect(0, 0, 256, 256);
    if (kind === 'rush') {
        const g = x.createRadialGradient(128, 128, 10, 128, 128, 126); g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(0.7, 'rgba(8,0,0,0.95)'); g.addColorStop(1, 'rgba(0,0,0,0)');
        x.fillStyle = g; x.beginPath(); x.arc(128, 128, 126, 0, 7); x.fill();
        x.fillStyle = '#ffffff'; for (const ex of [88, 168]) { x.beginPath(); x.ellipse(ex, 108, 15, 22, 0, 0, 7); x.fill(); }
        x.fillStyle = '#000'; for (const ex of [88, 168]) { x.beginPath(); x.arc(ex, 112, 5, 0, 7); x.fill(); }
        x.strokeStyle = '#e8e0d0'; x.lineWidth = 4; x.beginPath(); x.moveTo(60, 170); for (let k = 0; k <= 14; k++) x.lineTo(60 + k * 9.3, 170 + (k % 2 ? 26 : 0) + (R() - 0.5) * 6); x.stroke();
    } else {
        x.fillStyle = '#d8d0c4'; x.beginPath(); x.ellipse(128, 128, 84, 100, 0, 0, 7); x.fill();
        x.fillStyle = '#0a0000'; for (const ex of [96, 160]) { x.beginPath(); x.ellipse(ex, 104, 16, 24, 0, 0, 7); x.fill(); }
        x.beginPath(); x.moveTo(80, 160); x.quadraticCurveTo(128, 232, 176, 160); x.quadraticCurveTo(128, 190, 80, 160); x.fill();
        x.fillStyle = '#e0d8c8'; for (let k = 0; k < 9; k++) x.fillRect(86 + k * 10.5, 168, 6, 12);
    }
    return T.toTex(c, false);
}

// ---------- LATARKA ----------
// Ręczna latarka w prawej dłoni: światło i wiązka idą za ręką (kierunek = oś -z dłoni, jak lufa pistoletu na strzelnicy).
// Włącznik: spust prawego kontrolera (VR) albo klawisz G (komputer). Bez dłoni (tryby bez rąk) zostaje latarka przy głowie.
const _fq = new THREE.Quaternion();
function buildFlashlight() {
    const g = new THREE.Group(), metal = new THREE.MeshStandardMaterial({ color: 0x1a1a1e, metalness: 0.8, roughness: 0.35 });
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.032, 0.17, 14), metal); body.rotation.x = Math.PI / 2; body.position.set(0, 0, -0.04); g.add(body);
    const head = new THREE.Mesh(new THREE.CylinderGeometry(0.046, 0.03, 0.06, 14), metal); head.rotation.x = Math.PI / 2; head.position.set(0, 0, -0.15); g.add(head);
    const lens = new THREE.Mesh(new THREE.CircleGeometry(0.04, 16), new THREE.MeshBasicMaterial({ color: 0xfff0d0 })); lens.position.set(0, 0, -0.181); lens.rotation.y = Math.PI; g.add(lens);
    const sw = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.012, 0.03), new THREE.MeshStandardMaterial({ color: 0xc03020, roughness: 0.5 })); sw.position.set(0, 0.034, -0.03); g.add(sw);
    g.frustumCulled = false; L.root.add(g);
    return { group: g, lens: lens, on: true, held: false, setup: false };
}
function toggleFlash() {
    if (!S || !S.flash) return;
    S.flash.on = !S.flash.on; SFX.beep(S.flash.on ? 1100 : 700, 0.12, 0.05); buzz(1, 0.3, 40);
}
function updateFlashlight() {
    const F = S.flash, lamp = lighting.headLamp;
    if (!F.setup) {   // przy pierwszej klatce (po zbudowaniu efektów poziomu) przenieś lampę i wiązkę z głowy do ręki
        F.setup = true;
        if (hands.R) { F.held = true; F.group.add(lamp); F.group.add(lamp.target); lamp.position.set(0, 0, -0.18); lamp.target.position.set(0, 0, -6); setFlashHolder(F.group); }
        else F.group.visible = false;
    }
    if (F.held && hands.R) { F.group.position.copy(hands.R.position); hands.R.getWorldQuaternion(_fq); F.group.quaternion.copy(_fq); }
    lamp.visible = F.on; F.lens.material.color.setHex(F.on ? 0xfff0d0 : 0x2a2420);
}
function restoreFlashlight() {   // lampa wraca do kamery (inne poziomy mają latarkę przy głowie)
    const lamp = lighting.headLamp;
    if (S && S.flash && S.flash.held) { camera.add(lamp); camera.add(lamp.target); lamp.position.set(0, 0, 0); lamp.target.position.set(0, 0, -6); setFlashHolder(null); }
    L.onTrigger = null; L.onKeyG = null;
}

export function build() {
    L.spawn = info.spawn.slice();
    L.noSlide = true;   // w Hotelu nie ma ślizgu po podłodze (przykucnięcie z rozpędem nie kładzie gracza na brzuchu)
    const df = diffOf('hotel'), n = N_ROOMS;
    const zs = [0]; for (let i = 0; i < n; i++) zs.push(zs[i] - lenOf(i));   // kolejne krawędzie pokoi (hole z kluczem i pokój 50 są dłuższe)
    L.bounds = { minX: -HALF + 0.35, maxX: HALF - 0.35, minZ: zs[n] + 0.35, maxZ: -0.45, maxY: H - 0.3 };   // szerokość zmienia setBounds (hol z pokojami pobocznymi, wielki pokój)
    S = { df: df, n: n, zs: zs, sq: [false, false], mats: makeMats(), ghost: createGhost('hotel'), ev: createEvents('hotel', { skip: ['fog'] }), clock: 0, runT: 0, introT: INTRO_TIME, phase: 'intro', hp: MAX_HP[df.id] || 2, maxHp: MAX_HP[df.id] || 2, keys: 0, keyTaken: new Set(), cp: 0, cur: 0, best: 0, rooms: new Map(), lights: [], caughtT: -1, leaving: false, hudT: 0, hidden: false, carried: false,
        rush: { state: 'wait', t: 0, z: 0, next: 18 }, screech: { state: 'none', t: 0, room: -1, tried: -1, dir: 0 }, hint: '', msgT: 0, exitT: -1, noise: 0 };
    S.flash = buildFlashlight();
    L.onTrigger = (i) => { if (renderer.xr.isPresenting && i === 1) toggleFlash(); };   // VR: spust prawej ręki (na komputerze: klawisz G)
    L.onKeyG = toggleFlash;
    for (let i = 0; i < 6; i++) { const l = new THREE.PointLight(0xffb070, 16, 22, 1.8); l.position.set(0, 2.6, -8 * (i + 0.5)); L.root.add(l); S.lights.push(l); }   // pula świateł przenoszona do pokoi: 4 pokoje + 2 dodatkowe (pokoje poboczne holu albo wielki pokój)
    ensureRooms(0);
    buildDoor({ x: 0, z: -WALL_T / 2 - 0.03, rotY: Math.PI, label: 'LEVELS', color: '#ffd8b8', wood: 0x4a3224, portal: { target: 'levels', spawn: ARRIVAL_FROM_HOTEL, onEnter: () => toast('Back to the levels') } });
    S.hud = cameraPanel(1024, 200, 0.42, 0.082, 0.2, -0.75, 990);
    S.intro = cameraPanel(1280, 820, 1.0, 0.64, -0.04, -1.05, 995); S.intro.last = -1;
    S.scare = createJumpscare({ seed: 1313, variant: 'butler' });
    setDread(() => { const r = []; for (const rm of S.rooms.values()) { if (rm.weeper) r.push(rm.weeper.m.group.position); if (rm.figure) r.push(rm.figure.m.group.position); } return r; }, { hide: (on) => { for (const rm of S.rooms.values()) { if (rm.weeper) rm.weeper.m.group.visible = !on; if (rm.figure) rm.figure.m.group.visible = !on; } } });
    S.rushMesh = new THREE.Sprite(new THREE.SpriteMaterial({ map: faceTexture('rush'), transparent: true, depthWrite: false, fog: false })); S.rushMesh.scale.set(5.5, 5.5, 1); S.rushMesh.visible = false; L.root.add(S.rushMesh);
    S.screechMesh = new THREE.Sprite(new THREE.SpriteMaterial({ map: faceTexture('screech'), transparent: true, depthWrite: false, fog: false })); S.screechMesh.scale.set(1.3, 1.3, 1); S.screechMesh.visible = false; L.root.add(S.screechMesh);
    if (df.id !== 'normal') toast('Difficulty: ' + df.name + (df.checkpoints ? '' : ' (no checkpoints)'), df.color);
}

// ---------- POKOJE (strumieniowo) ----------
function box(room, x, y, z, w, h, d, mat, collide) {
    const m = new THREE.Mesh(S.mats.box, mat); m.position.set(x, y, z); m.scale.set(w, h, d); room.group.add(m);
    if (collide) { addCollider(x - w / 2, y - h / 2, z - d / 2, x + w / 2, y + h / 2, z + d / 2); room.cols.push(L.obstacles[L.obstacles.length - 1]); }
    return m;
}
// Boczna ściana holu z przejściem (bez drzwi) do pokoju pobocznego na środku
function hubSideWall(room, s, a, b, mid) {
    const g = DOORWAY / 2, x = s * (HALF + WALL_T / 2), zA = a + WALL_T / 2, zB = b - WALL_T / 2, M = S.mats;
    box(room, x, H / 2, (zA + mid + g) / 2, WALL_T, H, zA - (mid + g), M.wall, true);
    box(room, x, H / 2, (mid - g + zB) / 2, WALL_T, H, (mid - g) - zB, M.wall, true);
    box(room, x, DOOR_H + (H - DOOR_H) / 2, mid, WALL_T, H - DOOR_H, DOORWAY, M.wall, true);   // nadproże
}
function makeKey(room, x, z) {
    const M = S.mats, key = new THREE.Group(); key.position.set(x, 1.15, z);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.03, 8, 14), M.gold); ring.position.y = 0.14; key.add(ring);
    const stem = new THREE.Mesh(M.box, M.gold); stem.scale.set(0.05, 0.34, 0.05); key.add(stem);
    const teeth = new THREE.Mesh(M.box, M.gold); teeth.scale.set(0.15, 0.05, 0.04); teeth.position.set(0.07, -0.13, 0); key.add(teeth);
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex.dot, color: 0xffd060, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.8 })); glow.scale.set(1.2, 1.2, 1); key.add(glow);
    room.group.add(key); room.keyObj = key; room.keyPos = [x, z];
}
function makeBlind(room, seed, scale, path, x, z, big) {   // Ślepy Lokaj (hol) albo Ślepy z pokoju 50: ciemne ciało, blada twarz bez oczu
    const m = buildMannequin(T.mkRng(seed)); m.group.scale.set(scale[0], scale[1], scale[2]); L.root.add(m.group);
    m.group.traverse(o => { if (o.isMesh && o.material) o.material = new THREE.MeshStandardMaterial({ color: big ? 0x0c0a0a : 0x14100e, roughness: 1 }); });
    m.head.traverse(o => { if (o.isMesh && o.material) o.material = new THREE.MeshStandardMaterial({ color: big ? 0xeee8dc : 0xd8d0c0, roughness: 0.6 }); });
    addMonsterFace(m.head, big ? { width: 0.06, open: 0.05, teeth: 11, long: 1.8, horns: 0xcfc6a8, tears: 0x7a0a0a } : { width: 0.052, open: 0.03, long: 1.3, tears: 0x7a0a0a }); swapModel(m, big ? 'blind' : 'butler');
    const st = createBot(x, z); st.mode = 'patrol'; st.wp = 0; st.listen = true;   // czasem staje i nasłuchuje m.group.position.set(st.x, 0, st.z);
    return { m: m, st: st, path: path, wT: 0, wx: st.x, wz: st.z, stuckN: 0, lost: 0 };
}
function buildRoom(i) {
    const len = roomLen(i), R = T.mkRng(4000 + i * 131), a = z0(i), b = a - len, mid = (a + b) / 2, last = i === S.n - 1;
    const hub = HUBS.includes(i), big = i === BIG, hw = big ? BIG_HALF : HALF, sideEdge = HALF + WALL_T + SIDE_W;   // sideEdge: wewnętrzna twarz zewnętrznej ściany pokoju pobocznego
    const room = { i: i, group: new THREE.Group(), cols: [], items: [], keyObj: null, keyPos: null, wardrobe: null, wardrobes: [], door: null, weeper: null, figure: null, hub: hub, big: big, hw: hw, sideEdge: sideEdge, mid: mid, locked: last };
    L.root.add(room.group);
    const M = S.mats;
    box(room, 0, -0.05, mid, 2 * hw + 0.2, 0.1, len + 0.2, M.floor, false);                  // podłoga (bez kolizji: poziom podłogi załatwia silnik)
    box(room, 0, H + 0.05, mid, 2 * hw + 0.2, 0.1, len + 0.2, M.ceil, false);
    for (const s of [-1, 1]) { if (hub) hubSideWall(room, s, a, b, mid); else box(room, s * (hw + WALL_T / 2), H / 2, mid, WALL_T, H, len + WALL_T, M.wall, true); }
    if (i === 0) box(room, 0, H / 2, a, 2 * hw + WALL_T * 2, H, WALL_T, M.wall, true);       // południowa ściana tylko w pokoju 0 (reszta to północna ściana poprzedniego)
    if (big) for (const s of [-1, 1]) box(room, s * ((HALF + hw + WALL_T) / 2), H / 2, a, hw + WALL_T - HALF, H, WALL_T, M.wall, true);   // wielki pokój jest szerszy od poprzedniego: dobudowana południowa ściana po bokach
    // Północna ściana z otworem na drzwi + nadproże + drzwi (z kolizją, dopóki zamknięte); ostatnie drzwi (100) mają tabliczkę EXIT i klucze
    const sideW = (2 * hw - DOOR_W) / 2;
    for (const s of [-1, 1]) box(room, s * (DOOR_W / 2 + sideW / 2), H / 2, b, sideW, H, WALL_T, M.wall, true);
    box(room, 0, DOOR_H + (H - DOOR_H) / 2, b, DOOR_W, H - DOOR_H, WALL_T, M.wall, true);
    const door = { group: new THREE.Group(), open: false, t: 0, col: null, locked: last, num: i + 1 };
    door.group.position.set(0, 0, b);
    const panel = new THREE.Mesh(M.box, M.door); panel.scale.set(DOOR_W - 0.05, DOOR_H, 0.14); panel.position.set(0, DOOR_H / 2, 0); door.group.add(panel);
    const plateMat = new THREE.MeshBasicMaterial({ map: plateTexture(last ? 'EXIT' : String(i + 1), last), toneMapped: false });
    const plate = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.35), plateMat); plate.position.set(0, 2.15, 0.09); door.group.add(plate); door.plateMat = plateMat;
    const knob = new THREE.Mesh(M.box, M.gold); knob.scale.set(0.1, 0.1, 0.1); knob.position.set(0.6, 1.0, 0.12); door.group.add(knob);
    room.group.add(door.group);
    addCollider(-DOOR_W / 2, 0, b - 0.1, DOOR_W / 2, DOOR_H, b + 0.1); door.col = L.obstacles[L.obstacles.length - 1];
    room.door = door;
    if (last) { const out = new THREE.Mesh(new THREE.PlaneGeometry(DOOR_W, DOOR_H), new THREE.MeshBasicMaterial({ color: 0xfff4d8, toneMapped: false })); out.position.set(0, DOOR_H / 2, b - 0.25); room.group.add(out); }   // światło za drzwiami 100
    // Meble: rects = zajęte prostokąty [x, z, szer, głęb]; szafy dostają przed sobą wolny pas dojścia (2 x 2,4 m), żeby nic nie blokowało gałki
    const rects = [];
    const free = (x, z, w, d) => rects.every(r => Math.abs(r[0] - x) > (r[2] + w) / 2 + 0.3 || Math.abs(r[1] - z) > (r[3] + d) / 2 + 0.3);
    const place = (w, h, d, mat, tries, reg) => {
        reg = reg || { s: 0, lo: 1.9, hi: hw - 1.1 };
        for (let k = 0; k < (tries || 12); k++) {
            const s = reg.s || (R() < 0.5 ? -1 : 1), x = s * (reg.lo + R() * (reg.hi - reg.lo)), z = a - 1.8 - R() * (len - 3.6);
            if (free(x, z, w, d)) { rects.push([x, z, w, d]); box(room, x, h / 2, z, w, h, d, mat, true); return [x, z, h]; }
        }
        return null;
    };
    const wardrobeIn = (s, edge, zlo, zhi) => {
        for (let tr = 0; tr < 12; tr++) {
            const wz = zlo - R() * (zlo - zhi), cxw = s * (edge - 0.65), ax = s * (edge - 2.3);
            if (free(cxw, wz, 1.3, 1.6) && free(ax, wz, 2.0, 2.4)) { rects.push([cxw, wz, 1.3, 1.6], [ax, wz, 2.0, 2.4]); room.wardrobes.push(buildWardrobe(room, cxw, wz, s, edge)); { const nw = room.wardrobes[room.wardrobes.length - 1]; nw.fake = T.mkRng(9100 + i * 31 + room.wardrobes.length)() < FAKE.chance; } return true; }
        }
        return false;
    };
    const pieces = (n, reg, big) => { for (let k = 0; k < n; k++) { const type = (R() * 3) | 0; if (type === 0) place(1.9, 0.9, 0.9, R() < 0.5 ? M.cloth : M.cloth2, 12, reg); else if (type === 1) place(1.1, 0.8, 1.1, M.wood, 12, reg); else if (big && R() < 0.5) place(0.7, 2.3, 3.6, M.wood, 30, reg); else place(2.0, 2.2, 0.5, M.wood, 12, reg); } };
    const side0 = R() < 0.5 ? -1 : 1;
    if (!hub && !big) {
        const nWard = i === 0 ? 0 : (R() < 0.3 ? 2 : 1);
        for (let k = 0; k < nWard; k++) wardrobeIn(k === 0 ? side0 : -side0, HALF, a - 2.5, b + 2.5);
        pieces(3 + ((R() * 3) | 0) + 2);
    } else if (hub) {
        rects.push([0, mid, 2.6, len - 1.0]);                                                       // aleja środkowa (tędy patroluje Lokaj)
        for (const s of [-1, 1]) rects.push([s * (1.3 + sideEdge - 1.2) / 2, mid, sideEdge - 2.5, 3.0]);   // przejścia do pokoi pobocznych
        wardrobeIn(side0, HALF, a - 2.5, b + 2.5); wardrobeIn(-side0, HALF, a - 2.5, b + 2.5);
        pieces(4 + ((R() * 3) | 0) + 3);
        // Dwa pokoje poboczne (po jednym z każdej strony): klucz leży w jednym z nich, w drugim jest tylko pusty stolik
        const keyS = R() < 0.5 ? -1 : 1, xs = HALF + WALL_T + SIDE_W / 2;
        for (const s of [-1, 1]) {
            const x0 = s * (HALF + WALL_T / 2), x1 = s * (sideEdge + WALL_T), cxm = (x0 + x1) / 2, wsp = Math.abs(x1 - x0);
            box(room, s * (HALF + WALL_T + SIDE_W / 2), -0.05, mid, SIDE_W + 0.2, 0.1, len + 0.2, M.floor, false);
            box(room, s * (HALF + WALL_T + SIDE_W / 2), H + 0.05, mid, SIDE_W + 0.2, 0.1, len + 0.2, M.ceil, false);
            box(room, s * (sideEdge + WALL_T / 2), H / 2, mid, WALL_T, H, len + WALL_T, M.wall, true);   // zewnętrzna ściana
            box(room, cxm, H / 2, a, wsp, H, WALL_T, M.wall, true);                                     // ściana południowa pokoju pobocznego
            box(room, cxm, H / 2, b, wsp, H, WALL_T, M.wall, true);                                     // ściana północna
            wardrobeIn(s, sideEdge, a - 2.5, b + 2.5);
            const reg = { s: s, lo: HALF + WALL_T + 1.6, hi: sideEdge - 3.8 };
            const table = place(1.2, 0.8, 1.2, M.wood, 60, reg) || [s * (sideEdge - 4), a - 3, 0.8];
            if (s === keyS && !S.keyTaken.has(i)) makeKey(room, table[0], table[1]);
            pieces(4 + ((R() * 3) | 0), reg);
        }
        // Ślepy Lokaj patroluje hol i oba pokoje poboczne (punkty leżą na pasach wolnych od mebli)
        room.weeper = makeBlind(room, 900 + i, [1.2, 1.7, 1.2], [[0, a - 2.5], [0, mid], [-xs, mid], [0, mid], [xs, mid], [0, mid], [0, b + 2.5], [0, mid]], 0, a - 2.5, false);
    } else {   // wielki pokój 50: szeroka aleja środkowa (wejście i wyjście), szafy po bokach, regały i meble tworzące alejki; mieszka w nim Ślepy
        rects.push([0, mid, 4.2, len - 2.0]);
        for (const s of [-1, 1]) { wardrobeIn(s, BIG_HALF, a - 3, mid + 1); wardrobeIn(s, BIG_HALF, mid - 1, b + 3); }
        const reg = { s: 0, lo: 2.9, hi: BIG_HALF - 2.8 };
        for (let k = 0; k < 18; k++) { if (R() < 0.5) place(4.0, 2.4, 0.7, M.wood, 40, reg); else place(0.7, 2.4, 4.0, M.wood, 40, reg); }
        pieces(10, reg, true);
        const okPt = (x, z) => Math.abs(x) < 1.8 || free(x, z, 1.2, 1.2);
        const cand = [[-6, a - 6], [6, a - 12], [-6, a - 18], [6, a - 24], [-6, a - 30], [6, a - 35], [0, mid], [0, a - 4], [0, b + 4]].filter(c => okPt(c[0], c[1]));
        const path = cand.length >= 3 ? cand : [[0, a - 6], [0, mid], [0, b + 6]];
        room.figure = makeBlind(room, 1900 + i, [1.35, 2.0, 1.35], path, 0, a - 8, true);
    }
    room.wardrobe = room.wardrobes[0] || null;
    S.rooms.set(i, room);
    return room;
}
// ---------- SZAFY ----------
// Szafa stoi przy bocznej ścianie, otwarta do środka sali, z dwuskrzydłowymi drzwiami. Żeby się schować: chwyć gałkę (dłoń blisko + zaciśnięty chwyt),
// drzwi się otwierają; wejdź do środka i naciśnij zapadkę przy bocznej ściance, żeby zamknąć drzwi. Ukrycie działa tylko przy zamkniętych drzwiach.
function buildWardrobe(room, cxw, wz, s, edge) {
    edge = edge || HALF;   // wewnętrzna twarz ściany, przy której stoi szafa (zwykły pokój: HALF, pokój poboczny i wielki pokój: dalej)
    const M = S.mats, front = s * (edge - 1.3), hz = 0.78;
    box(room, cxw, 2.3, wz, 1.3, 0.1, 1.6, M.wood, true);                                   // dach
    for (const dz of [-hz, hz]) box(room, cxw, 1.15, wz + dz, 1.3, 2.3, 0.08, M.wood, true); // boki
    box(room, cxw - s * 0.05, 2.43, wz, 1.4, 0.14, 1.72, M.wood, false);                    // gzyms
    box(room, cxw - s * 0.04, 0.06, wz, 1.38, 0.12, 1.7, M.wood, false);                    // cokół
    const back = new THREE.Mesh(M.box, M.dark); back.scale.set(0.05, 2.2, 1.4); back.position.set(s * (edge - 0.06), 1.15, wz); room.group.add(back);
    for (let k = -1; k <= 1; k++) box(room, cxw + s * 0.32, 1.35, wz + k * 0.4, 0.12, 1.5, 0.3, M.cloth2, false);   // płaszcze na wieszaku, żeby w środku nie było pusto
    const w = { x: cxw, z: wz, s: s, t: 0, open: false, doors: [], cols: [], knob: new THREE.Vector3(front - s * 0.12, 1.05, wz), latch: new THREE.Vector3(cxw, 1.25, wz + hz - 0.1), room: room.i };
    for (const side of [-1, 1]) {   // side = -1: zawias po stronie -z, skrzydło idzie w +z (i odwrotnie)
        const dir = -side, pivot = new THREE.Group(); pivot.position.set(front, 0, wz + side * hz); room.group.add(pivot);
        const leaf = new THREE.Mesh(M.box, M.door); leaf.scale.set(0.05, 2.2, 0.78); leaf.position.set(0, 1.15, dir * 0.4); pivot.add(leaf);
        const inset = new THREE.Mesh(M.box, M.wood); inset.scale.set(0.02, 1.8, 0.5); inset.position.set(-s * 0.03, 1.15, dir * 0.4); pivot.add(inset);
        const knob = new THREE.Mesh(M.box, M.gold); knob.scale.set(0.07, 0.07, 0.07); knob.position.set(-s * 0.07, 1.05, dir * 0.7); pivot.add(knob);
        w.doors.push({ pivot: pivot, openAngle: (dir === 1 ? -s : s) * Math.PI / 2 });
        const zmin = Math.min(wz + side * hz, wz), zmax = Math.max(wz + side * hz, wz);
        addCollider(front - 0.05, 0, zmin, front + 0.05, 2.3, zmax); const col = L.obstacles[L.obstacles.length - 1]; w.cols.push(col); room.cols.push(col);   // zamknięte drzwi blokują wejście
    }
    // zapadka w środku (na wewnętrznej ściance) i poświata gałki (pulsuje podczas ostrzeżenia przed Łomotem)
    const latch = new THREE.Mesh(M.box, M.gold); latch.scale.set(0.14, 0.14, 0.06); latch.position.copy(w.latch); latch.position.z += 0.07; room.group.add(latch);
    w.latchGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex.dot, color: 0xffd060, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.0 })); w.latchGlow.scale.set(0.8, 0.8, 1); w.latchGlow.position.copy(w.latch); w.latchGlow.position.z += 0.1; room.group.add(w.latchGlow);
    w.knobGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex.dot, color: 0xffd060, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.0 })); w.knobGlow.scale.set(0.9, 0.9, 1); w.knobGlow.position.copy(w.knob); room.group.add(w.knobGlow);
    return w;
}
const inZone = (p, w) => Math.abs(p.z - w.z) < 0.6 && Math.abs(p.x - w.x) < 0.5 && p.y < 2.4;   // w środku szafy (za płaszczyzną drzwi)
function setWardrobe(w, open, p) {
    if (w.open === open) return; w.open = open;
    const pos = { x: w.x, y: 1.2, z: w.z };
    if (open) { for (const c of w.cols) { const k = L.obstacles.indexOf(c); if (k >= 0) L.obstacles.splice(k, 1); } SFX.creak(0.8, pos); }
    else {
        for (const c of w.cols) if (!L.obstacles.includes(c)) L.obstacles.push(c);
        if (p && Math.abs(p.x - w.x) > 0.25) setPlayerPosition(w.x, p.y, Math.max(w.z - 0.4, Math.min(w.z + 0.4, p.z)));   // wsuń gracza na środek, żeby drzwi go nie wypchnęły
        SFX.bang(pos);
    }
}
const isSqueezing = (h) => !!(h && h.userData && h.userData.rig && h.userData.rig.target === 1.0);
// Naciśnięcie = dłoń blisko punktu + świeże zaciśnięcie chwytu (jak dźwignie w Studni). Animacja drzwi i poświata gałek.
function revealFake(w, p) {
    w.fakeDone = true; S.fakeSeen = (S.fakeSeen || 0) + 1; setWardrobe(w, true, p);   // drzwi otwierają się same
    S.scare.trigger(); SFX.stinger({ x: w.x, y: 1.5, z: w.z }); buzz('both', 1, 400); toast('Something was already in there!', '#ff3a2a');
}
// Hak dla testu w przeglądarce (tests/hide.mjs): force = wszystkie szafy w zbudowanych pokojach są fałszywe, faza gry włączona; zwraca listę szaf
export function debugFake(force) {
    if (!S) return null; if (force) { S.phase = 'play'; S.introT = 0; for (const r of S.rooms.values()) for (const w of r.wardrobes) w.fake = true; }
    const out = []; for (const r of S.rooms.values()) for (const w of r.wardrobes) out.push({ room: r.i, x: w.x, z: w.z, fake: !!w.fake, done: !!w.fakeDone, open: w.open });
    return { wardrobes: out, seen: S.fakeSeen || 0, scare: S.scare.active(), rush: S.rush.state };
}
function updateWardrobes(dt, t, p) {
    const edge = [false, false];
    [hands.L, hands.R].forEach((h, i) => { const now = isSqueezing(h); edge[i] = now && !S.sq[i]; S.sq[i] = now; });
    const pressAt = (pt) => [hands.L, hands.R].some((h, i) => edge[i] && h && h.position.distanceTo(pt) < 0.5);
    const warn = S.rush.state === 'warn' || S.rush.state === 'run';
    S.inWardrobe = false; S.hint = '';
    for (const r of S.rooms.values()) for (const w of r.wardrobes) {
        const inside = inZone(p, w);
        if (w.fake && !w.fakeDone) {   // fałszywa kryjówka: ktoś już tam jest (nie w czasie Łomotu, żeby było uczciwie)
            if (inside && S.rush.state === 'wait' && S.phase === 'play' && S.caughtT < 0) revealFake(w, p);
            else if (!inside && r.i === S.cur && Math.hypot(p.x - w.x, p.z - w.z) < FAKE.near) { w.breathT = (w.breathT === undefined ? 3 : w.breathT) - dt; if (w.breathT <= 0) { w.breathT = nextIn(FAKE.breathEvery, Math.random); SFX.breath({ x: w.x, y: 1.3, z: w.z }, 0.22); } }
        }
        if (!w.open && !inside && pressAt(w.knob)) setWardrobe(w, true, p);
        else if (inside && pressAt(w.latch)) setWardrobe(w, !w.open, p);
        const target = w.open ? 1 : 0; w.t += Math.sign(target - w.t) * Math.min(Math.abs(target - w.t), dt * 1.8);
        const e = w.t * w.t * (3 - 2 * w.t);
        for (const d of w.doors) d.pivot.rotation.y = d.openAngle * e;
        const pulse = 0.45 + 0.35 * Math.sin(t * 9);
        w.knobGlow.material.opacity = warn && !w.open && !inside ? pulse : 0;
        w.latchGlow.material.opacity = inside ? (warn || w.open ? pulse : 0.25) : 0;
        if (inside) { S.inWardrobe = true; S.hint = w.open ? 'Press the latch (grip) to close the doors' : 'Hidden. Press the latch to get out'; }
        else if (r.i === S.cur && !w.open && Math.hypot(p.x - w.knob.x, p.z - w.knob.z) < 2.4) S.hint = 'Grab the handle (grip) to open the wardrobe';
    }
}
function dropRoom(i) {
    const room = S.rooms.get(i); if (!room) return;
    L.root.remove(room.group);
    for (const c of room.cols) { const k = L.obstacles.indexOf(c); if (k >= 0) L.obstacles.splice(k, 1); }
    if (room.door.col) { const k = L.obstacles.indexOf(room.door.col); if (k >= 0) L.obstacles.splice(k, 1); }
    room.door.plateMat.map.dispose(); room.door.plateMat.dispose();
    if (room.weeper) L.root.remove(room.weeper.m.group);
    if (room.figure) L.root.remove(room.figure.m.group);
    S.rooms.delete(i);
}
// Szerokość pola ruchu: hol z pokojami pobocznymi i wielki pokój są szersze od zwykłego pokoju
function setBounds(cur) { const r = S.rooms.get(cur), w = r ? (r.hub ? r.sideEdge : r.hw) : HALF; L.bounds.minX = -w + 0.35; L.bounds.maxX = w - 0.35; }
function ensureRooms(cur) {
    for (let i = Math.max(0, cur - 1); i <= Math.min(S.n - 1, cur + 2); i++) if (!S.rooms.has(i)) buildRoom(i);
    for (const i of [...S.rooms.keys()]) if (i < cur - 1 || i > cur + 2) dropRoom(i);
    // stałe światła: po jednym nad pokojem poprzednim, bieżącym i dwoma następnymi
    let k = 0; for (let i = Math.max(0, cur - 1); i <= cur + 2 && k < 4; i++, k++) { S.lights[k].position.set(0, 2.7, z0(i) - roomLen(i) / 2); S.lights[k].userData.off = false; }
    for (; k < 4; k++) S.lights[k].userData.off = true;
    // dwa dodatkowe światła: w pokojach pobocznych holu albo w wielkim pokoju (jeśli są w zasięgu)
    const ex = [S.lights[4], S.lights[5]]; ex.forEach(l => { l.userData.off = true; });
    for (const r of S.rooms.values()) {
        if (r.hub) { const xs = HALF + WALL_T + SIDE_W / 2; ex[0].position.set(-xs, 2.7, r.mid); ex[1].position.set(xs, 2.7, r.mid); ex.forEach(l => { l.userData.off = false; }); }
        else if (r.big) { ex[0].position.set(0, 2.7, z0(r.i) - LEN_BIG * 0.2); ex[1].position.set(0, 2.7, z0(r.i) - LEN_BIG * 0.8); ex.forEach(l => { l.userData.off = false; }); }
    }
    setBounds(cur);
}

// ---------- ZDARZENIA ----------
function finish() {
    if (S.leaving) return; S.leaving = true;
    toast('You made it out of the hotel!', '#ffb070');
    levelReward('hotel', REWARD_FIRST, REWARD_REPEAT, 'escaping the hotel');
    S.ghost.finish(recordTime('hotel', S.runT) && !S.carried, S.runT);
}
function caught(why) {
    if (S.caughtT >= 0) return;
    S.caughtT = 0; S.scare.trigger(); releaseAll(); buzz('both', 1, 400);
    toast(why || 'You did not make it...', '#e0533f');
}
function hurt(why) {
    S.hp--; SFX.scare(); buzz('both', 1, 300);
    if (S.hp <= 0) { caught(why); return; }
    toast(why + ' (' + S.hp + ' hearts left)', '#ff6a4a');
}
const INTRO = [
    'Walk through 100 numbered rooms. The doors open by themselves, only door 100 is locked: it needs 3 keys.',
    'Each key lies in a key room (doors 25, 67 and 86): a hall with 2 side rooms. The key is in one of them, so check both.',
    'RUSH: the lights flicker for 5 seconds, then it rushes through. Open a wardrobe (grab the handle), step in and press the latch inside to shut the doors, or you die.',
    'PSST: if you hear it, turn around and LOOK at the face within 2 seconds, or it bites (you have 2 hearts, 3 on Easy).',
    'A blind butler patrols the key halls and runs at you when he hears running. Door 50 opens into a huge room with something blind that hears EVERY noise: move slowly and quietly.',
    'Your flashlight is in your right hand: trigger (VR) or G (desktop) switches it on and off. Every 10th door saves a checkpoint.'
];
function isHidden(p, room) {   // ukryty = w środku szafy przy w pełni zamkniętych drzwiach
    return !!room && room.wardrobes.some(w => inZone(p, w) && w.t === 0 && !w.open);
}

// ---------- CO KLATKĘ ----------
export function update(dt, t, ctx) {
    if (!S || S.leaving) return;
    S.clock += dt; const p = ctx.body.position;
    S.ev.update(dt, S.phase === 'play' && S.caughtT < 0);
    S.scare.update(dt);
    if (S.introSkip === undefined) { S.introSkip = introSeen('hotel'); if (S.introSkip) S.introT = Math.min(S.introT, 3); }
    if (S.introT > 0) {
        S.introT -= dt;
        const sec = Math.max(0, Math.ceil(S.introT));
        if (sec !== S.intro.last) { S.intro.last = sec; drawInstructions(S.intro, 'The Hotel', INTRO, 'The doors open in ' + sec + ' s', { bg: 'rgba(16,8,6,0.93)', border: '#e0a050', title: '#ffe8c8', text: '#f0dcc8', footer: '#ff4030', size: 25 }); }
        S.intro.mesh.visible = S.introT > 0 && !S.introSkip;
        if (S.introT <= 0) { S.phase = 'play'; toast('Open the doors. Find 3 keys. Hide when the lights flicker.', '#e0a050'); }
    }
    if (S.exitT >= 0) { S.exitT -= dt; if (S.exitT < 0) { finish(); ctx.goto('lobby'); return; } }   // drzwi 100 otwarte: wyjście do lobby
    if (S.phase === 'play' && S.caughtT < 0 && S.exitT < 0) S.runT += dt;
    S.ghost.tick(dt, p, S.phase === 'play' && S.caughtT < 0);
    const cur = Math.min(S.n - 1, roomOf(p.z));
    if (cur !== S.cur && p.z <= 0) { S.cur = cur; S.best = Math.max(S.best, cur); ensureRooms(cur); }
    const room = S.rooms.get(S.cur);
    updateFlashlight();
    updateWardrobes(dt, t, p);
    S.hidden = isHidden(p, room);
    // Migotanie świateł przez całe 5 s ostrzeżenia przed Łomotem i ruch kluczy
    const flick = S.rush.state === 'warn' ? (0.25 + 0.75 * (Math.sin(t * 40) > 0 ? 1 : 0.1)) : 1;
    S.lights.forEach((l, k) => { l.intensity = l.userData.off ? 0 : 16 * flick * (0.8 + 0.2 * Math.sin(t * 7 + k)); });
    for (const r of S.rooms.values()) if (r.keyObj && r.keyObj.visible) { r.keyObj.rotation.y = t * 1.4; r.keyObj.position.y = 1.15 + Math.sin(t * 2) * 0.06; }
    if (S.caughtT >= 0) {
        S.caughtT += dt;
        if (S.caughtT > 1.6) {
            if (S.cp > 0 && takeRespawn(S)) respawn(ctx);
            else { S.leaving = true; ctx.goto('hotel'); return; }
        }
        S.rushMesh.visible = false; S.screechMesh.visible = false; return;
    }
    if (S.phase === 'play' && S.exitT < 0) {
        doors(p, dt);
        pickKey(p);
        rush(dt, t, p, room);
        screech(dt, p, room);
        for (const r of S.rooms.values()) { if (r.weeper) weeper(r, dt, ctx, p); if (r.figure) figure(r, dt, ctx, p); }
    } else if (S.exitT >= 0) doors(p, dt);   // animacja otwieranych drzwi trwa do końca
    S.hudT -= dt; if (S.hudT <= 0) { S.hudT = 0.15; drawHud(); }
}
function respawn(ctx) {
    const cp = S.cp; S.cur = -1; S.rush.state = 'wait'; S.rush.next = 14; S.screech.state = 'none'; S.hp = S.maxHp; S.carried = true;   // zabrane klucze zostają (S.keys, S.keyTaken)
    for (const i of [...S.rooms.keys()]) dropRoom(i);
    ensureRooms(cp); S.cur = cp; setPlayerPosition(0, 1.0, z0(cp) - 1.6);
    S.caughtT = -1; toast('Back at the last checkpoint (door ' + cp + ').', '#7fc47f');
}
// Drzwi: podejdź, a otworzą się; tylko drzwi 100 wymagają 3 kluczy. Co 10. drzwi to punkt kontrolny (leczy o 1 serce)
function doors(p, dt) {
    for (const r of S.rooms.values()) {
        const d = r.door, dz = z0(r.i + 1);
        if (!d.open && Math.abs(p.z - dz) < 1.7 && Math.abs(p.x) < 1.6 && p.z > dz) {
            if (d.locked && S.keys < KEYS_NEEDED) { if (S.msgT <= 0) { toast('Locked. You need ' + KEYS_NEEDED + ' keys (you have ' + S.keys + '). Search the key halls.', '#ff6a4a'); SFX.creak(0.5, { x: 0, y: 1.5, z: dz }); S.msgT = 3; } }
            else {
                d.open = true; const k = L.obstacles.indexOf(d.col); if (k >= 0) L.obstacles.splice(k, 1); d.col = null; SFX.creak(0.9, { x: 0, y: 1.5, z: dz });
                const num = r.i + 1;
                if (d.locked) { S.exitT = 1.6; SFX.bell && SFX.bell(); toast('The last door opens. You are out!', '#ffd27a'); }
                else if (num % CHECKPOINT_EVERY === 0) { S.cp = num; S.hp = S.df.id === 'easy' ? S.maxHp : Math.min(S.maxHp, S.hp + 1); SFX.fuse(); toast('Door ' + num + '. Checkpoint saved, ' + (S.df.id === 'easy' ? 'hearts restored.' : '+1 heart.'), '#7fc47f'); }
                if (num === BIG) toast('Door 50. Something blind is in the big room. Move slowly and quietly!', '#ff6a4a');
            }
        }
        if (d.open && d.t < 1) { d.t = Math.min(1, d.t + dt * 1.4); d.group.position.y = d.t * (DOOR_H + 0.1); }
    }
    if (S.msgT > 0) S.msgT -= dt;
}
function pickKey(p) {
    for (const r of S.rooms.values()) {
        if (!r.keyObj || !r.keyObj.visible) continue;
        if (Math.hypot(p.x - r.keyPos[0], p.z - r.keyPos[1]) < 1.5 && p.y > 0.4) {
            r.keyObj.visible = false; S.keyTaken.add(r.i); S.keys++; SFX.fuse(); buzz('both', 0.7, 150);
            toast('You took a key (' + S.keys + '/' + KEYS_NEEDED + ').' + (S.keys === KEYS_NEEDED ? ' Now run to door 100!' : ''), '#ffd27a');
        }
    }
}
// ŁOMOT: 5 s migania świateł, potem pędzi z tyłu na przód przez wszystkie zbudowane pokoje (zabija tylko poza szafą). Nie zaczyna się przy pokoju 50 ani tuż przed nim
function rush(dt, t, p, room) {
    const R = S.rush;
    if (R.state === 'wait') {
        R.next -= dt;
        if (R.next <= 0 && S.cur >= 1 && S.cur !== BIG && S.cur !== BIG - 1 && room && room.wardrobes.length && p.z < z0(S.cur) - 1.5) { R.state = 'warn'; R.t = RUSH.warn; toast('The lights flicker... Something is coming. HIDE!', '#ff4a2a'); SFX.stinger({ x: 0, y: 1.5, z: z0(S.cur) + 6 }); }
        else if (R.next <= 0) R.next = 2;
    } else if (R.state === 'warn') {
        R.t -= dt; if (Math.floor(R.t * 3) !== Math.floor((R.t + dt) * 3)) { SFX.heartbeat(1); SFX.bang({ x: 0, y: 1, z: z0(S.cur) + 8 }); }
        if (R.t <= 0) { R.state = 'run'; R.z = z0(Math.max(0, S.cur - 1)) + 4; R.endZ = z0(S.cur + 1) - 1; SFX.roar(1, { x: 0, y: 1.7, z: R.z }); buzz('both', 0.9, 600); S.rushMesh.visible = true; }
    } else if (R.state === 'run') {
        R.z -= RUSH.speed * dt; S.rushMesh.position.set(0, 1.7, R.z); S.rushMesh.scale.setScalar(5.2 + Math.sin(t * 30) * 0.3);
        if (Math.abs(R.z - p.z) < 1.8 && !S.hidden) { caught('It rushed through the hotel.'); S.rushMesh.visible = false; R.state = 'wait'; R.next = 20; return; }
        if (R.z < R.endZ) { S.rushMesh.visible = false; R.state = 'wait'; R.next = RUSH.wait[0] + Math.random() * (RUSH.wait[1] - RUSH.wait[0]) * (S.df.id === 'nightmare' ? 0.6 : 1); toast(S.hidden ? 'It passed. You are safe.' : 'It is gone.', '#7fc47f'); }
    }
}
// SZEPT: "psst" za plecami; obróć się i spójrz w ciągu 2 s, inaczej ugryzie
function screech(dt, p, room) {
    const Sc = S.screech;
    if (Sc.state === 'none') {
        if (S.cur >= 2 && !room.hub && !room.big && S.cur !== Sc.tried && S.rush.state === 'wait' && p.z < z0(S.cur) - 4) { Sc.tried = S.cur; if (Math.random() < SCREECH.chance * (S.df.id === 'nightmare' ? 1.4 : 1)) { Sc.state = 'wait'; Sc.t = 1 + Math.random() * 2.5; } }
    } else if (Sc.state === 'wait') {
        Sc.t -= dt; if (Sc.t <= 0) {
            camera.getWorldDirection(_v); _v.y = 0; _v.normalize();
            const ang = Math.atan2(_v.x, _v.z) + Math.PI + (Math.random() - 0.5) * 1.2;   // zza pleców
            Sc.dir = ang; Sc.pos = [p.x + Math.sin(ang) * 2.2, p.z + Math.cos(ang) * 2.2];
            Sc.pos[0] = Math.max(-HALF + 0.6, Math.min(HALF - 0.6, Sc.pos[0]));
            S.screechMesh.position.set(Sc.pos[0], 1.5, Sc.pos[1]); S.screechMesh.visible = true; Sc.state = 'show'; Sc.t = SCREECH.window;
            SFX.whisper({ x: Sc.pos[0], y: 1.5, z: Sc.pos[1] }); SFX.stinger({ x: Sc.pos[0], y: 1.5, z: Sc.pos[1] });
            toast('Psst... LOOK AT IT!', '#ff4a2a');
        }
    } else if (Sc.state === 'show') {
        Sc.t -= dt;
        camera.getWorldDirection(_v); _w.set(Sc.pos[0] - p.x, 0, Sc.pos[1] - p.z).normalize(); _v.y = 0; _v.normalize();
        if (_v.dot(_w) > 0.87) { S.screechMesh.visible = false; Sc.state = 'none'; SFX.hiss && SFX.hiss({ x: Sc.pos[0], y: 1.5, z: Sc.pos[1] }, 0.8); toast('It left.', '#7fc47f'); }
        else if (Sc.t <= 0) { S.screechMesh.visible = false; Sc.state = 'none'; hurt('It bit you!'); }
    }
}
// Zaklinowanie: co 2,5 s sprawdzamy, czy potwór się w ogóle przesunął; w patrolu przechodzi do następnego punktu, a po dwóch próbach przeskakuje na ten punkt
function unstickBlind(w, st) {
    w.wT += 0; const moved = Math.hypot(st.x - w.wx, st.z - w.wz); w.wT = 0; w.wx = st.x; w.wz = st.z;
    if (moved >= 0.4) { w.stuckN = 0; return; }
    if (st.mode === 'chase') { st.side = Math.random() < 0.5 ? -1 : 1; st.sideT = 1.2; return; }
    st.wp++; st.mode = 'patrol'; w.stuckN++;
    if (w.stuckN >= 2) { const pt = w.path[st.wp % w.path.length]; st.x = pt[0]; st.z = pt[1]; st.y = 0; st.vy = 0; w.stuckN = 0; }
}
// ŚLEPY LOKAJ (holy z kluczem): patroluje hol i pokoje poboczne, słyszy bieg i bliskość; szafa go zwodzi. Do pokoju pobocznego idzie przez przejście
function weeper(r, dt, ctx, p) {
    const w = r.weeper, st = w.st, d = Math.hypot(p.x - st.x, p.z - st.z), run = Math.hypot(ctx.body.velocity.x, ctx.body.velocity.z), inRoom = roomOf(p.z) === r.i;
    const pSide = Math.abs(p.x) > HALF + WALL_T ? Math.sign(p.x) : 0, wSide = Math.abs(st.x) > HALF + WALL_T ? Math.sign(st.x) : 0;   // -1 / +1: pokój poboczny, 0: hol
    const hear = (inRoom && run > 3.4 && d < WEEPER.hear) || (inRoom && d < 2.6 && !S.hidden) || (inRoom && heardVoice(d, S.hidden ? VOICE.HIDDEN_MUL : 1));   // także głos z mikrofonu (ukryty słabiej)
    if (hear) { if (st.mode !== 'chase') SFX.stinger({ x: st.x, y: 1.5, z: st.z }); st.mode = 'chase'; st.lost = 0; }
    else if (st.mode === 'chase') { st.lost = (st.lost || 0) + dt; if (S.hidden || !inRoom || st.lost > 7) st.mode = 'patrol'; }
    let tx, tz, speed;
    if (st.mode === 'chase') {
        speed = WEEPER.chase * S.df.speed;
        if (wSide === pSide) { tx = p.x; tz = p.z; }
        else if (wSide !== 0) { tx = wSide * (HALF - 0.3); tz = r.mid; }                       // on w pokoju pobocznym, ty gdzie indziej: do holu przez przejście
        else { tx = pSide * (HALF + WALL_T + 0.9); tz = r.mid; }                              // on w holu, ty w pokoju pobocznym: do przejścia
    } else { const wp = w.path[st.wp % w.path.length]; tx = wp[0]; tz = wp[1]; speed = WEEPER.walk * S.df.speed; if (Math.hypot(tx - st.x, tz - st.z) < 0.7) st.wp++; }
    w.wT += dt; if (w.wT >= 2.5) unstickBlind(w, st);
    stepBot(st, dt, tx, tz, p.y - 0.35, speed, st.mode === 'chase');
    w.m.group.position.set(st.x, st.y, st.z); w.m.group.rotation.y = st.dir;
    if (d < 20) SFX.heartbeat(Math.max(0, 1 - d / 20) * (st.mode === 'chase' ? 0.9 : 0.4));
    if (d < 1.0 && !S.hidden && Math.abs(p.y - (st.y + 1.0)) < 1.5) caught('The butler found you.');
}
// ŚLEPY z pokoju 50: nic nie widzi, ale słyszy ruch ciała. Poniżej FIGURE.quiet m/s jest cicho; im szybciej się ruszasz, tym dalej cię słyszy
// (od FIGURE.loud m/s goni). Szafa go zwodzi. Zasięg słuchu: od 4 m w ciszy do 24 m przy sprincie.
function figure(r, dt, ctx, p) {
    const f = r.figure, st = f.st, d = Math.hypot(p.x - st.x, p.z - st.z), sp = Math.hypot(ctx.body.velocity.x, ctx.body.velocity.z), inRoom = roomOf(p.z) === r.i;
    const noise = inRoom && !S.hidden ? Math.max(DREAD.voice, Math.max(0, Math.min(1, (sp - FIGURE.quiet) / 3))) : 0;   // do ruchu dochodzi głos z mikrofonu
    S.noise = inRoom ? noise : 0;
    const heard = noise > 0 && d < 4 + 20 * noise;
    if (heard) {
        f.lost = 0;
        if (sp >= FIGURE.loud) { if (st.mode !== 'chase') SFX.stinger({ x: st.x, y: 1.5, z: st.z }); st.mode = 'chase'; }
        else if (st.mode === 'patrol') { st.mode = 'investigate'; SFX.whisper({ x: st.x, y: 1.5, z: st.z }); }
        if (st.mode === 'investigate') f.goal = [p.x, p.z];
    } else if (st.mode === 'chase') { f.lost += dt; if (S.hidden || !inRoom || f.lost > 6) st.mode = 'patrol'; }
    else if (st.mode === 'investigate' && (!f.goal || Math.hypot(f.goal[0] - st.x, f.goal[1] - st.z) < 1.4 || !inRoom)) st.mode = 'patrol';
    let tx, tz, speed;
    if (st.mode === 'chase') { tx = p.x; tz = p.z; speed = FIGURE.chase * S.df.speed; }
    else if (st.mode === 'investigate') { tx = f.goal[0]; tz = f.goal[1]; speed = FIGURE.investigate * S.df.speed; }
    else { const wp = f.path[st.wp % f.path.length]; tx = wp[0]; tz = wp[1]; speed = FIGURE.walk * S.df.speed; if (Math.hypot(tx - st.x, tz - st.z) < 1.0) st.wp++; }
    f.wT += dt; if (f.wT >= 2.5) unstickBlind(f, st);
    stepBot(st, dt, tx, tz, p.y - 0.35, speed, st.mode === 'chase');
    f.m.group.position.set(st.x, st.y, st.z); f.m.group.rotation.y = st.dir;
    if (inRoom && d < 22) SFX.heartbeat(Math.max(0, 1 - d / 22) * (st.mode === 'chase' ? 1 : 0.5));
    if (d < 1.2 && !S.hidden && Math.abs(p.y - (st.y + 1.0)) < 1.6) caught('The blind one heard you.');
}
function fmt(s) { s = Math.max(0, Math.floor(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); }
function drawHud() {
    const x = S.hud.ctx; panelBg(S.hud, 'rgba(16,8,6,0.72)');
    x.textBaseline = 'middle'; x.textAlign = 'left';
    x.font = 'bold 78px "Courier New", monospace'; x.fillStyle = '#ffe8c8'; x.fillText(fmt(S.runT), 30, 74);
    if (S.df.id !== 'normal') { x.font = 'bold 22px "Courier New", monospace'; x.fillStyle = S.df.color; x.fillText(S.df.name.toUpperCase(), 330, 18); }
    x.font = 'bold 30px "Courier New", monospace'; x.fillStyle = '#ffd890'; x.fillText('Door ' + Math.min(S.n, S.cur + 1) + '/' + S.n + '   Keys ' + S.keys + '/' + KEYS_NEEDED, 330, 46);
    const hp = Math.max(0, Math.min(S.maxHp, S.hp)); x.fillStyle = '#ff4a4a'; x.fillText('♥'.repeat(hp) + '♡'.repeat(S.maxHp - hp), 330, 80);
    x.font = 'bold 24px "Courier New", monospace';
    const room = S.rooms.get(S.cur);
    let msg = 'Open the doors. Listen.', c = '#e8d4c4';
    if (S.rush.state === 'warn' || S.rush.state === 'run') { msg = S.hidden ? 'Stay hidden...' : (S.inWardrobe ? 'PRESS THE LATCH: CLOSE THE DOORS!' : 'OPEN A WARDROBE AND HIDE!'); c = S.hidden ? '#7fe8a0' : '#ff3a2a'; }
    else if (S.screech.state === 'show') { msg = 'LOOK AT IT!'; c = '#ff3a2a'; }
    else if (room && room.big) { msg = S.noise > 0.5 ? 'TOO LOUD! Slow down!' : (S.noise > 0 ? 'It hears you. Slower...' : 'Quiet. Keep moving slowly.'); c = S.noise > 0.5 ? '#ff3a2a' : (S.noise > 0 ? '#ffb030' : '#7fe8a0'); }
    else if (S.hint) { msg = S.hint; c = '#ffd890'; }
    else if (room && room.hub && S.keys < KEYS_NEEDED) { msg = room.keyObj && room.keyObj.visible ? 'The key is in one of the side rooms.' : 'Key hall. Check the side rooms.'; c = '#ffd27a'; }
    else if (S.keys === KEYS_NEEDED) { msg = 'You have all keys. Door 100 is waiting.'; c = '#7fe8a0'; }
    x.fillStyle = c; x.fillText(msg, 330, 122);
    S.hud.update();
}
export const testState = () => S;   // dla testów: dostęp do stanu poziomu
export function dispose() {
    L.noSlide = false;
    restoreFlashlight();
    if (S) { for (const i of [...S.rooms.keys()]) dropRoom(i); S.ev.dispose(); S.ghost.dispose(); S.hud.dispose(); S.intro.dispose(); S.scare.dispose(); }
    S = null;
}
export const debug = () => S ? { phase: S.phase, cur: S.cur, rooms: [...S.rooms.keys()], hp: S.hp, hasKey: S.keys > 0, keysTaken: S.keys, hidden: S.hidden, caught: S.caughtT >= 0, rush: S.rush.state, screech: S.screech.state, n: S.n, zs: S.zs.slice(), obstacles: L.obstacles.length, cp: S.cp, exitT: S.exitT, noise: S.noise, bounds: [L.bounds.minX, L.bounds.maxX, L.bounds.minZ], wardrobes: [...S.rooms.values()].flatMap(r => r.wardrobes.map(w => [r.i, w.x, w.z, w.open, w.t, w.knob.x, w.knob.y, w.knob.z, w.latch.x, w.latch.y, w.latch.z])), keys: [...S.rooms.values()].map(r => r.keyPos && r.keyObj && r.keyObj.visible ? [r.i, r.keyPos[0], r.keyPos[1]] : null), doorsOpen: [...S.rooms.values()].map(r => [r.i, r.door.open]), blinds: [...S.rooms.values()].filter(r => r.weeper || r.figure).map(r => { const b = r.weeper || r.figure; return [r.i, b.st.x, b.st.z, b.st.mode]; }) } : null;   // dla testów
export const _toggleFlash = () => toggleFlash();   // dla testów
export const _flash = () => S ? { on: S.flash.on, held: S.flash.held, lampOnCamera: lighting.headLamp.parent === camera, lampVisible: lighting.headLamp.visible } : null;   // dla testów
export const _forceRush = () => { if (S) { S.rush.state = 'warn'; S.rush.t = 0.3; } };   // dla testów
