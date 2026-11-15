// ==========================================
// POZIOM 10: THE HOTEL (nieskończony hotel, kolejne numerowane pokoje)
// Idziesz przez ciąg pokoi, każdy za zamkniętymi drzwiami z numerem. Co czwarte drzwi są zamknięte na klucz, który leży w tym pokoju
// (a w pokojach od 7. patroluje go Ślepy Lokaj: słyszy bieg, więc skradaj się). Chowaj się w szafach.
// Zdarzenia: ŁOMOT (po ostrzeżeniu pędzi przez wszystkie pokoje; kto nie siedzi w szafie, ginie), SZEPT (usłysz "psst", obróć się i spójrz,
// zanim ugryzie, inaczej tracisz serce), Ślepy Lokaj, blackouty i szepty. Trzy serca, doleczasz je przy odblokowaniu drzwi.
// Pokoje są budowane na bieżąco (3-4 naraz) i usuwane za plecami gracza: mało obiektów, dowolna długość. Układ stały (działa duch).
// ==========================================
import { THREE, L, tex, camera, addCollider } from '../core/engine.js';
import * as T from '../core/textures.js';
import { buildMannequin } from '../core/mannequin.js';
import { levelReward, recordTime, diffOf } from '../core/economy.js';
import { toast } from '../core/terminal.js';
import { setPlayerPosition, releaseAll } from '../core/player.js';
import * as SFX from '../core/audio.js';
import { buzz } from '../core/haptics.js';
import { createGhost } from '../core/runkit.js';
import { createEvents } from '../core/events.js';
import { createBot, stepBot } from '../core/botkit.js';
import { ARRIVAL_FROM_HOTEL } from './levels.js';
import { buildDoor, cameraPanel, panelBg, drawInstructions, createJumpscare, introSeen } from '../core/levelkit.js';

const RW = 9, RL = 12, H = 3.4, HALF = RW / 2, DOOR_W = 1.7, DOOR_H = 2.6, WALL_T = 0.4;   // pokój 9 x 12 m, wysokość 3,4 m
const ROOMS = { easy: 16, normal: 24, nightmare: 32 };                                      // liczba pokoi (ostatni zawsze z kluczem: indeks % 4 == 3)
const RUSH = { wait: [24, 45], warn: 5, speed: 26 }, SCREECH = { chance: 0.35, window: 1.8 }, WEEPER = { walk: 1.7, chase: 4.0, hear: 10, minRoom: 7 };
const REWARD_FIRST = 3600, REWARD_REPEAT = 360, INTRO_TIME = 10, MAX_HP = 3;
export const info = { id: 'hotel', name: 'The Hotel', spawn: [0, 1.0, -1.6] };
let S = null;
const z0 = (i) => -i * RL;                      // południowa krawędź pokoju i (pokój ma z od z0 do z0 - RL)
const roomOf = (z) => Math.max(0, Math.floor(-z / RL));
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

export function build() {
    L.spawn = info.spawn.slice();
    const df = diffOf('hotel'), n = ROOMS[df.id] || ROOMS.normal;
    L.bounds = { minX: -HALF + 0.35, maxX: HALF - 0.35, minZ: z0(n) - 3 + 0.4, maxZ: -0.45, maxY: H - 0.3 };
    S = { df: df, n: n, mats: makeMats(), ghost: createGhost('hotel'), ev: createEvents('hotel', { skip: ['fog'] }), clock: 0, runT: 0, introT: INTRO_TIME, phase: 'intro', hp: MAX_HP, hasKey: false, cp: 0, cur: 0, best: 0, rooms: new Map(), lights: [], caughtT: -1, leaving: false, hudT: 0, hidden: false, carried: false,
        rush: { state: 'wait', t: 0, z: 0, next: 18 }, screech: { state: 'none', t: 0, room: -1, tried: -1, dir: 0 }, hint: '', msgT: 0 };
    for (let i = 0; i < 4; i++) { const l = new THREE.PointLight(0xffb070, 12, 14, 1.8); l.position.set(0, 2.6, -RL * (i + 0.5)); L.root.add(l); S.lights.push(l); }   // stałe światła, przenoszone do pokoi (pula świateł)
    ensureRooms(0);
    // Wejście (LEVELS) w południowej ścianie pokoju 0 i wyjście na końcu: wnęka z drzwiami EXIT za ostatnimi (zamkniętymi na klucz) drzwiami
    buildDoor({ x: 0, z: -WALL_T / 2 - 0.03, rotY: Math.PI, label: 'LEVELS', color: '#ffd8b8', wood: 0x4a3224, portal: { target: 'levels', spawn: ARRIVAL_FROM_HOTEL, onEnter: () => toast('Back to the levels') } });
    buildAlcove();
    S.hud = cameraPanel(1024, 200, 0.42, 0.082, 0.2, -0.75, 990);
    S.intro = cameraPanel(1280, 820, 1.0, 0.64, -0.04, -1.05, 995); S.intro.last = -1;
    S.scare = createJumpscare({ seed: 1313 });
    S.rushMesh = new THREE.Sprite(new THREE.SpriteMaterial({ map: faceTexture('rush'), transparent: true, depthWrite: false, fog: false })); S.rushMesh.scale.set(5.5, 5.5, 1); S.rushMesh.visible = false; L.root.add(S.rushMesh);
    S.screechMesh = new THREE.Sprite(new THREE.SpriteMaterial({ map: faceTexture('screech'), transparent: true, depthWrite: false, fog: false })); S.screechMesh.scale.set(1.3, 1.3, 1); S.screechMesh.visible = false; L.root.add(S.screechMesh);
    if (df.id !== 'normal') toast('Difficulty: ' + df.name + ' (' + n + ' rooms' + (df.checkpoints ? '' : ', no checkpoints') + ')', df.color);
}

// ---------- POKOJE (strumieniowo) ----------
function box(room, x, y, z, w, h, d, mat, collide) {
    const m = new THREE.Mesh(S.mats.box, mat); m.position.set(x, y, z); m.scale.set(w, h, d); room.group.add(m);
    if (collide) { addCollider(x - w / 2, y - h / 2, z - d / 2, x + w / 2, y + h / 2, z + d / 2); room.cols.push(L.obstacles[L.obstacles.length - 1]); }
    return m;
}
function buildRoom(i) {
    const R = T.mkRng(4000 + i * 131), a = z0(i), b = a - RL, mid = (a + b) / 2, last = i === S.n - 1;
    const room = { i: i, group: new THREE.Group(), cols: [], items: [], keyObj: null, wardrobe: null, door: null, weeper: null, locked: i % 4 === 3 };
    L.root.add(room.group);
    const M = S.mats;
    box(room, 0, -0.05, mid, RW + 0.2, 0.1, RL + 0.2, M.floor, false);                     // podłoga (bez kolizji: poziom podłogi załatwia silnik)
    box(room, 0, H + 0.05, mid, RW + 0.2, 0.1, RL + 0.2, M.ceil, false);
    for (const s of [-1, 1]) box(room, s * (HALF + WALL_T / 2), H / 2, mid, WALL_T, H, RL + WALL_T, M.wall, true);
    if (i === 0) box(room, 0, H / 2, a, RW + WALL_T * 2, H, WALL_T, M.wall, true);          // południowa ściana tylko w pokoju 0 (reszta to północna ściana poprzedniego)
    // Północna ściana z otworem na drzwi + nadproże + drzwi (z kolizją, dopóki zamknięte)
    const sideW = (RW - DOOR_W) / 2;
    for (const s of [-1, 1]) box(room, s * (DOOR_W / 2 + sideW / 2), H / 2, b, sideW, H, WALL_T, M.wall, true);
    box(room, 0, DOOR_H + (H - DOOR_H) / 2, b, DOOR_W, H - DOOR_H, WALL_T, M.wall, true);
    const door = { group: new THREE.Group(), open: false, t: 0, col: null, locked: room.locked, num: i + 1 };
    door.group.position.set(0, 0, b);
    const panel = new THREE.Mesh(M.box, M.door); panel.scale.set(DOOR_W - 0.05, DOOR_H, 0.14); panel.position.set(0, DOOR_H / 2, 0); door.group.add(panel);
    const plateMat = new THREE.MeshBasicMaterial({ map: plateTexture(last ? 'EXIT' : String(i + 1), room.locked), toneMapped: false });
    const plate = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.35), plateMat); plate.position.set(0, 2.15, 0.09); door.group.add(plate); door.plateMat = plateMat;
    const knob = new THREE.Mesh(M.box, M.gold); knob.scale.set(0.1, 0.1, 0.1); knob.position.set(0.6, 1.0, 0.12); door.group.add(knob);
    room.group.add(door.group);
    addCollider(-DOOR_W / 2, 0, b - 0.1, DOOR_W / 2, DOOR_H, b + 0.1); door.col = L.obstacles[L.obstacles.length - 1];
    room.door = door;
    // Meble (rzędy po bokach, środek wolny na przejście x w [-1,1,3]); szafa do chowania w większości pokoi
    const rects = [];
    const free = (x, z, w, d) => rects.every(r => Math.abs(r[0] - x) > (r[2] + w) / 2 + 0.3 || Math.abs(r[1] - z) > (r[3] + d) / 2 + 0.3);
    const place = (w, h, d, mat, tries) => { for (let k = 0; k < (tries || 12); k++) { const s = R() < 0.5 ? -1 : 1, x = s * (1.9 + R() * (HALF - 2.6 - 0.4)), z = a - 1.8 - R() * (RL - 3.6); if (free(x, z, w, d)) { rects.push([x, z, w, d]); box(room, x, h / 2, z, w, h, d, mat, true); return [x, z, h]; } } return null; };
    if (i > 0 && (R() < 0.7 || room.locked || i % 3 === 1)) {   // szafa na bocznej ścianie: wnętrze otwarte w stronę środka
        const s = R() < 0.5 ? -1 : 1, wz = a - 2.5 - R() * (RL - 5), cxw = s * (HALF - 0.65);
        if (free(cxw, wz, 1.3, 1.6)) {
            rects.push([cxw, wz, 1.3, 1.6]);
            box(room, cxw, 2.3, wz, 1.3, 0.1, 1.6, M.wood, true);
            for (const dz of [-0.78, 0.78]) box(room, cxw, 1.15, wz + dz, 1.3, 2.3, 0.08, M.wood, true);
            const glow = new THREE.Mesh(M.box, M.dark); glow.scale.set(0.05, 2.2, 1.4); glow.position.set(s * (HALF - 0.06), 1.15, wz); room.group.add(glow);
            room.wardrobe = { x: cxw, z: wz, s: s };
        }
    }
    const nPieces = 2 + ((R() * 3) | 0);
    for (let k = 0; k < nPieces; k++) { const type = (R() * 3) | 0; if (type === 0) place(1.9, 0.9, 0.9, R() < 0.5 ? M.cloth : M.cloth2); else if (type === 1) place(1.1, 0.8, 1.1, M.wood); else place(2.0, 2.2, 0.5, M.wood); }
    if (room.locked) {   // klucz leży na stoliku
        const t = place(1.2, 0.8, 1.2, M.wood, 40) || [2.5, a - 3, 0.8];
        const key = new THREE.Group(); key.position.set(t[0], 1.15, t[1]);
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.03, 8, 14), M.gold); ring.position.y = 0.14; key.add(ring);
        const stem = new THREE.Mesh(M.box, M.gold); stem.scale.set(0.05, 0.34, 0.05); key.add(stem);
        const teeth = new THREE.Mesh(M.box, M.gold); teeth.scale.set(0.15, 0.05, 0.04); teeth.position.set(0.07, -0.13, 0); key.add(teeth);
        const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex.dot, color: 0xffd060, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.8 })); glow.scale.set(1.2, 1.2, 1); key.add(glow);
        room.group.add(key); room.keyObj = key; room.keyPos = [t[0], t[1]];
    }
    // Ślepy Lokaj w pokojach z kluczem od 7. (patroluje po pokoju, słyszy bieg)
    if (room.locked && i >= WEEPER.minRoom) {
        const m = buildMannequin(T.mkRng(900 + i)); m.group.scale.set(1.2, 1.7, 1.2); L.root.add(m.group);
        m.group.traverse(o => { if (o.isMesh && o.material) o.material = new THREE.MeshStandardMaterial({ color: 0x14100e, roughness: 1 }); });
        m.head.traverse(o => { if (o.isMesh && o.material) o.material = new THREE.MeshStandardMaterial({ color: 0xd8d0c0, roughness: 0.6 }); });
        const st = createBot(0, a - 2); st.mode = 'patrol'; st.wp = 0; m.group.position.set(st.x, 0, st.z);
        room.weeper = { m: m, st: st, path: [[-2.2, a - 2.5], [2.2, a - 6], [-2.2, a - 9.5], [2.2, a - 6]] };
    }
    S.rooms.set(i, room);
    return room;
}
function dropRoom(i) {
    const room = S.rooms.get(i); if (!room) return;
    L.root.remove(room.group);
    for (const c of room.cols) { const k = L.obstacles.indexOf(c); if (k >= 0) L.obstacles.splice(k, 1); }
    if (room.door.col) { const k = L.obstacles.indexOf(room.door.col); if (k >= 0) L.obstacles.splice(k, 1); }
    room.door.plateMat.map.dispose(); room.door.plateMat.dispose();
    if (room.weeper) L.root.remove(room.weeper.m.group);
    S.rooms.delete(i);
}
function ensureRooms(cur) {
    for (let i = Math.max(0, cur - 1); i <= Math.min(S.n - 1, cur + 2); i++) if (!S.rooms.has(i)) buildRoom(i);
    for (const i of [...S.rooms.keys()]) if (i < cur - 1 || i > cur + 2) dropRoom(i);
    // stałe światła: po jednym nad pokojem poprzednim, bieżącym i dwoma następnymi
    let k = 0; for (let i = Math.max(0, cur - 1); i <= cur + 2 && k < S.lights.length; i++, k++) { S.lights[k].position.set(0, 2.7, z0(i) - RL / 2); S.lights[k].userData.room = i; }
}
function buildAlcove() {   // wnęka za ostatnimi drzwiami: do niej wchodzi się po otwarciu drzwi nr n, a na końcu stoją drzwi EXIT
    const M = S.mats, a = z0(S.n), g = new THREE.Group(); L.root.add(g);
    const add = (x, y, z, w, h, d, mat, col) => { const m = new THREE.Mesh(M.box, mat); m.position.set(x, y, z); m.scale.set(w, h, d); g.add(m); if (col) addCollider(x - w / 2, y - h / 2, z - d / 2, x + w / 2, y + h / 2, z + d / 2); };
    add(0, -0.05, a - 1.6, DOOR_W + 1.4, 0.1, 3.2, M.floor); add(0, H + 0.05, a - 1.6, DOOR_W + 1.4, 0.1, 3.2, M.ceil);
    for (const s of [-1, 1]) add(s * (DOOR_W / 2 + 0.7 + 0.2), H / 2, a - 1.6, 0.4, H, 3.2, M.wall, true);
    add(0, H / 2, a - 3.2, DOOR_W + 1.8, H, 0.4, M.wall, true);
    buildDoor({ x: 0, z: a - 3 + 0.03, rotY: 0, label: 'EXIT', color: '#ffd890', glow: 0xffa850, wood: 0x2a1c12, light: true, portal: { target: 'levels', spawn: ARRIVAL_FROM_HOTEL, onEnter: finish } });
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
    'Walk through the rooms and open the numbered doors. Every 4th door is locked: its key lies in the same room.',
    'RUSH: lights flicker and a rumble grows. HIDE in a wardrobe (step inside) before it passes, or you die.',
    'PSST: if you hear it, turn around and LOOK at the face within 2 seconds, or it bites (you have 3 hearts).',
    'From room 7 a blind butler patrols the key rooms. He hears running: sneak. Wardrobes hide you from him too.',
    'Unlocking a door saves a checkpoint and heals you (not on Nightmare). Reach the last door and escape.'
];
function isHidden(p, room) {
    const w = room && room.wardrobe; if (!w) return false;
    return Math.abs(p.z - w.z) < 0.6 && Math.abs(p.x - w.x) < 0.55 && p.y < 2.4;
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
        if (sec !== S.intro.last) { S.intro.last = sec; drawInstructions(S.intro, 'The Hotel', INTRO, 'The doors open in ' + sec + ' s', { bg: 'rgba(16,8,6,0.93)', border: '#e0a050', title: '#ffe8c8', text: '#f0dcc8', footer: '#ff4030', size: 27 }); }
        S.intro.mesh.visible = S.introT > 0 && !S.introSkip;
        if (S.introT <= 0) { S.phase = 'play'; toast('Open the doors. Find the keys. Hide when it rumbles.', '#e0a050'); }
    }
    if (S.phase === 'play' && S.caughtT < 0) S.runT += dt;
    S.ghost.tick(dt, p, S.phase === 'play' && S.caughtT < 0);
    const cur = Math.min(S.n - 1, roomOf(p.z));
    if (cur !== S.cur && p.z <= 0) { S.cur = cur; S.best = Math.max(S.best, cur); ensureRooms(cur); }
    const room = S.rooms.get(S.cur);
    S.hidden = isHidden(p, room);
    // Migotanie świateł (ostrzeżenie przed Łomotem) i ruch kluczy
    const flick = S.rush.state === 'warn' ? (0.25 + 0.75 * (Math.sin(t * 40) > 0 ? 1 : 0.1)) : 1;
    S.lights.forEach((l, k) => { l.intensity = 12 * flick * (0.8 + 0.2 * Math.sin(t * 7 + k)); });
    for (const r of S.rooms.values()) if (r.keyObj && r.keyObj.visible) { r.keyObj.rotation.y = t * 1.4; r.keyObj.position.y = 1.15 + Math.sin(t * 2) * 0.06; }
    if (S.caughtT >= 0) {
        S.caughtT += dt;
        if (S.caughtT > 1.6) {
            if (S.df.checkpoints) respawn(ctx);
            else { S.leaving = true; ctx.goto('hotel'); return; }
        }
        S.rushMesh.visible = false; S.screechMesh.visible = false; return;
    }
    if (S.phase === 'play') {
        doors(p, dt, room);
        pickKey(p, room);
        rush(dt, t, p, room);
        screech(dt, p, room);
        for (const r of S.rooms.values()) if (r.weeper) weeper(r, dt, ctx, p);
    }
    S.hudT -= dt; if (S.hudT <= 0) { S.hudT = 0.15; drawHud(); }
}
function respawn(ctx) {
    const cp = S.cp; S.cur = -1; S.rush.state = 'wait'; S.rush.next = 14; S.screech.state = 'none'; S.hp = MAX_HP; S.hasKey = false; S.carried = true;
    for (const i of [...S.rooms.keys()]) dropRoom(i);
    ensureRooms(cp); S.cur = cp; setPlayerPosition(0, 1.0, z0(cp) - 1.6);
    S.caughtT = -1; toast('Back at the last unlocked door.', '#7fc47f');
}
// Drzwi: podejdź, a otworzą się (zamknięte na klucz wymagają klucza z tego pokoju)
function doors(p, dt, room) {
    for (const r of S.rooms.values()) {
        const d = r.door, dz = z0(r.i) - RL;
        if (!d.open && Math.abs(p.z - dz) < 1.7 && Math.abs(p.x) < 1.6 && p.z > dz) {
            if (d.locked && !S.hasKey) { if (S.msgT <= 0) { toast('Locked. The key is in this room.', '#ff6a4a'); SFX.creak(0.5, { x: 0, y: 1.5, z: dz }); S.msgT = 3; } }
            else {
                d.open = true; const k = L.obstacles.indexOf(d.col); if (k >= 0) L.obstacles.splice(k, 1); d.col = null; SFX.creak(0.9, { x: 0, y: 1.5, z: dz });
                if (d.locked) { S.hasKey = false; S.cp = r.i + 1; S.hp = MAX_HP; SFX.fuse(); toast('Door unlocked. Checkpoint saved, hearts restored.', '#7fc47f'); }
                if (r.i === S.n - 1) toast('The last door. The EXIT is just behind it!', '#ffd27a');
            }
        }
        if (d.open && d.t < 1) { d.t = Math.min(1, d.t + dt * 1.4); d.group.position.y = d.t * (DOOR_H + 0.1); }
    }
    if (S.msgT > 0) S.msgT -= dt;
}
function pickKey(p, room) {
    if (!room || !room.keyObj || !room.keyObj.visible) return;
    if (Math.hypot(p.x - room.keyPos[0], p.z - room.keyPos[1]) < 1.5 && p.y > 0.4) { room.keyObj.visible = false; S.hasKey = true; SFX.fuse(); buzz('both', 0.7, 150); toast('You took the key.', '#ffd27a'); }
}
// ŁOMOT: po ostrzeżeniu pędzi z tyłu na przód przez wszystkie zbudowane pokoje (zabija tylko poza szafą)
function rush(dt, t, p, room) {
    const R = S.rush;
    if (R.state === 'wait') {
        R.next -= dt;
        if (R.next <= 0 && S.cur >= 1 && room && room.wardrobe && p.z < z0(S.cur) - 1.5) { R.state = 'warn'; R.t = RUSH.warn; toast('Something is coming. HIDE!', '#ff4a2a'); SFX.stinger({ x: 0, y: 1.5, z: z0(S.cur) + 6 }); }
        else if (R.next <= 0) R.next = 2;
    } else if (R.state === 'warn') {
        R.t -= dt; if (Math.floor(R.t * 3) !== Math.floor((R.t + dt) * 3)) { SFX.heartbeat(1); SFX.bang({ x: 0, y: 1, z: z0(S.cur) + 8 }); }
        if (R.t <= 0) { R.state = 'run'; R.z = z0(Math.max(0, S.cur - 1)) + 4; R.endZ = z0(S.cur) - RL - 1; SFX.roar(1, { x: 0, y: 1.7, z: R.z }); buzz('both', 0.9, 600); S.rushMesh.visible = true; }
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
        if (S.cur >= 2 && S.cur !== Sc.tried && S.rush.state === 'wait' && p.z < z0(S.cur) - 4) { Sc.tried = S.cur; if (Math.random() < SCREECH.chance * (S.df.id === 'nightmare' ? 1.4 : 1)) { Sc.state = 'wait'; Sc.t = 1 + Math.random() * 2.5; } }
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
// ŚLEPY LOKAJ: patroluje po pokoju, słyszy bieg i bliskość; szafa go zwodzi
function weeper(r, dt, ctx, p) {
    const w = r.weeper, st = w.st, d = Math.hypot(p.x - st.x, p.z - st.z), run = Math.hypot(ctx.body.velocity.x, ctx.body.velocity.z), inRoom = roomOf(p.z) === r.i;
    const hear = (inRoom && run > 3.4 && d < WEEPER.hear) || (inRoom && d < 2.6 && !S.hidden);
    if (hear) { if (st.mode !== 'chase') SFX.stinger({ x: st.x, y: 1.5, z: st.z }); st.mode = 'chase'; st.lost = 0; }
    else if (st.mode === 'chase') { st.lost = (st.lost || 0) + dt; if (S.hidden || !inRoom || st.lost > 7) st.mode = 'patrol'; }
    let tx, tz, speed;
    if (st.mode === 'chase') { tx = p.x; tz = p.z; speed = WEEPER.chase * S.df.speed; }
    else { const wp = w.path[st.wp % w.path.length]; tx = wp[0]; tz = wp[1]; speed = WEEPER.walk * S.df.speed; if (Math.hypot(tx - st.x, tz - st.z) < 0.7) st.wp++; }
    stepBot(st, dt, tx, tz, p.y - 0.35, speed, false);
    w.m.group.position.set(st.x, st.y, st.z); w.m.group.rotation.y = st.dir;
    if (d < 20) SFX.heartbeat(Math.max(0, 1 - d / 20) * (st.mode === 'chase' ? 0.9 : 0.4));
    if (d < 1.0 && !S.hidden && Math.abs(p.y - (st.y + 1.0)) < 1.5) caught('The butler found you.');
}
function fmt(s) { s = Math.max(0, Math.floor(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); }
function drawHud() {
    const x = S.hud.ctx; panelBg(S.hud, 'rgba(16,8,6,0.72)');
    x.textBaseline = 'middle'; x.textAlign = 'left';
    x.font = 'bold 78px "Courier New", monospace'; x.fillStyle = '#ffe8c8'; x.fillText(fmt(S.runT), 30, 74);
    if (S.df.id !== 'normal') { x.font = 'bold 22px "Courier New", monospace'; x.fillStyle = S.df.color; x.fillText(S.df.name.toUpperCase(), 330, 18); }
    x.font = 'bold 30px "Courier New", monospace'; x.fillStyle = '#ffd890'; x.fillText('Room ' + Math.min(S.n, S.cur + 1) + '/' + S.n + (S.hasKey ? '   KEY' : ''), 330, 46);
    x.fillStyle = '#ff4a4a'; x.fillText('♥'.repeat(S.hp) + '♡'.repeat(MAX_HP - S.hp), 330, 80);
    x.font = 'bold 24px "Courier New", monospace';
    let msg = 'Open the doors. Listen.', c = '#e8d4c4';
    if (S.rush.state === 'warn' || S.rush.state === 'run') { msg = S.hidden ? 'Stay hidden...' : 'HIDE IN A WARDROBE!'; c = S.hidden ? '#7fe8a0' : '#ff3a2a'; }
    else if (S.screech.state === 'show') { msg = 'LOOK AT IT!'; c = '#ff3a2a'; }
    else if (S.cur === S.n - 1 && !S.hasKey) { msg = 'Find the key for the last door.'; c = '#ffd27a'; }
    x.fillStyle = c; x.fillText(msg, 330, 122);
    S.hud.update();
}
export function dispose() {
    if (S) { for (const i of [...S.rooms.keys()]) dropRoom(i); S.ev.dispose(); S.ghost.dispose(); S.hud.dispose(); S.intro.dispose(); S.scare.dispose(); }
    S = null;
}
export const debug = () => S ? { phase: S.phase, cur: S.cur, rooms: [...S.rooms.keys()], hp: S.hp, hasKey: S.hasKey, hidden: S.hidden, caught: S.caughtT >= 0, rush: S.rush.state, screech: S.screech.state, n: S.n, obstacles: L.obstacles.length, cp: S.cp, wardrobes: [...S.rooms.values()].map(r => r.wardrobe ? [r.i, r.wardrobe.x, r.wardrobe.z] : null), keys: [...S.rooms.values()].map(r => r.keyPos ? [r.i, r.keyPos[0], r.keyPos[1]] : null), doorsOpen: [...S.rooms.values()].map(r => [r.i, r.door.open]) } : null;   // dla testów
export const _forceRush = () => { if (S) { S.rush.state = 'warn'; S.rush.t = 0.3; } };   // dla testów
