// ==========================================
// POZIOM: STAFF ROOM (pokój szefa gry)
// Wejście tylko dla admina i moderatorów (core/config.js). Telewizor: zaproszenia. Komputer na biurku:
// wybór moderatorów (admin), lista banów, zakup i zakładanie młotków Kick i Ban. Kanapa, fotele, stolik, biurko szefa, regał i telewizor z listą graczy.
// ==========================================
import { THREE, L, tex, addCrispBlock, addStaticBody, CANNON, camera, lighting } from '../core/engine.js';
import * as SFX from '../core/audio.js';
import { SETTINGS } from '../core/settings.js';
import { setDread, DREAD } from '../core/ambience.js';
import { addStoryProps } from '../core/levelkit.js';
import { buildMannequin, addMonsterFace } from '../core/mannequin.js';
import { HAUNT, STAFF, nextIn, pickKind, manStep, staffDread, staffGap, staffBlackoutDue, eyesDistance, pupilOffset } from '../core/hauntlogic.js';
import { LIGHT_PRESETS, isStaffName, isAdminName, isModName, isUltimateName, MOD_NAMES, localMods, setLocalMod } from '../core/config.js';
import { SAVE, CATALOG, isOwned, buyItem, equipItem, setHideTag, markCheater } from '../core/economy.js';
import * as T from '../core/textures.js';
import { toast, Terminal, AMBER, AMBER_DIM, GOLD, OK_COL } from '../core/terminal.js';
import * as N from '../core/network.js';
import { PRESENCE } from '../core/presence.js';
import { buildDoor } from '../core/levelkit.js';
import { buildHammer } from '../core/avatar.js';
import { ARRIVAL_STAFF } from './lobby-door.js';
import { buildTrainingDummy, updateTrainingDummy, disposeTrainingDummy } from '../core/trainingdummy.js';

const W = 7, D = 5.5, H = 3.6;     // pokój 14 x 11 m, 3,6 m wysokości
const ENV = LIGHT_PRESETS.staff.envIntensity;
export const info = { id: 'staff', name: 'Staff room', spawn: [0, 1.0, 4.2] };
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
        if (isStaffName(SAVE.profile.name)) {
            t.btn('inv' + p.id, 620, y + 7, 170, 42, 'Invite', () => { N.requestMod('invite', p.id, 'staff'); toast('Invited ' + p.name); }, { size: 22, tone: 'gold', disabled: here });
            t.btn('out' + p.id, 810, y + 7, 180, 42, 'Send out', () => { N.requestMod('invite', p.id, 'lobby'); toast(p.name + ' was sent to the lobby'); }, { size: 22, tone: 'bad', disabled: !here });
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

// Komputer ekipy na biurku: moderatorzy, bany, młotki
const pc = { page: 'home' };
const staffPC = new Terminal((t) => {
    const c = t.ctx, me = SAVE.profile.name, admin = isAdminName(me);
    t.background();
    const role = isUltimateName(me) ? 'Ultimate admin' : (admin ? 'Admin' : (isModName(me) ? 'Moderator' : 'Guest'));
    if (pc.page === 'home') {
        t.header('Staff computer', role + ': ' + me, admin ? '#ff6a4a' : OK_COL);
        t.text(isUltimateName(me) ? 'You are the ultimate admin. You can do everything, even ban admins.' : (admin ? 'You are the admin. You can do everything.' : 'You are a moderator.'), 40, 110, 24, GOLD, 'left', true);
        t.btn('mods', 40, 160, 450, 90, 'Moderators', () => { pc.page = 'mods'; }, { tone: 'gold', disabled: !admin });
        t.btn('bans', 534, 160, 450, 90, 'Bans', () => { pc.page = 'bans'; });
        t.btn('ham', 40, 274, 450, 80, 'Hammers', () => { pc.page = 'hammers'; }, { tone: 'bad' });
        // Napis z rolą nad własną głową (OWNER, CO-ADMIN, MODERATOR...) można ukryć albo pokazać
        const hidden = !!SAVE.profile.hideTag;
        t.btn('tag', 534, 274, 450, 80, hidden ? 'Role tag: hidden' : 'Role tag: shown', () => setHideTag(!hidden), { tone: hidden ? undefined : 'ok', size: 26 });
        t.text('Moderators can enter this room, kick and ban players with a lower rank.', 40, 410, 20, AMBER, 'left');
        t.text('Kick hammer: throws a player out of the room, they can come back.', 40, 446, 20, AMBER, 'left');
        t.text('Ban hammer: the player cannot join any game for one day.', 40, 482, 20, AMBER, 'left');
        t.text('Swing the hammer and hit a player on the head or body. Grab it any time in the pause menu.', 40, 518, 20, AMBER_DIM, 'left');
        t.text('Role tag: the sign with your role above your name, seen by everyone.', 40, 554, 20, AMBER_DIM, 'left');
    } else if (pc.page === 'mods') {
        t.header('Moderators', null, null, () => { pc.page = 'home'; });
        t.text('Fixed: ' + MOD_NAMES.join(', '), 40, 100, 22, AMBER_DIM, 'left');
        const extra = localMods().filter(n => !MOD_NAMES.some(m => m.toLowerCase() === n));
        t.text('Chosen by you: ' + (extra.length ? extra.join(', ') : 'none'), 40, 132, 22, AMBER, 'left');
        const list = N.otherPlayers();
        if (!list.length) t.text('Nobody else is in your room. Players must be in the room to become moderators.', 40, 190, 20, AMBER_DIM, 'left');
        list.slice(0, 6).forEach((p, i) => {
            const y = 170 + i * 62, mod = isModName(p.name), adm = isAdminName(p.name);
            c.fillStyle = i % 2 ? 'rgba(255,176,0,0.04)' : 'rgba(255,176,0,0.08)'; c.fillRect(24, y, 976, 56);
            t.text(p.name, 40, y + 29, 26, GOLD, 'left', true);
            t.text(isUltimateName(p.name) ? 'ultimate admin' : (adm ? 'admin' : (mod ? 'moderator' : 'player')), 400, y + 29, 22, mod || adm ? OK_COL : AMBER_DIM, 'left');
            if (!adm) t.btn('md' + p.id, 700, y + 7, 290, 42, mod ? 'Remove moderator' : 'Make moderator', () => { setLocalMod(p.name, !mod); N.requestMod('mod', p.id, !mod); }, { size: 21, tone: mod ? 'bad' : 'ok', disabled: MOD_NAMES.some(m => m.toLowerCase() === p.name.toLowerCase()) });
        });
    } else if (pc.page === 'bans') {
        t.header('Bans (one day)', null, null, () => { pc.page = 'home'; });
        const bans = N.bannedNamesList();
        const canUn = N.canUnban();
        t.text(canUn ? 'Host a room. Banned players who try to join appear here. Press Unban and they can join right away.' : 'Only the owner can unban players. Bans are stored by the host of each room.', 40, 100, 19, AMBER, 'left');
        if (!bans.length) t.text('No active bans.', 40, 150, 24, AMBER_DIM, 'left');
        bans.slice(0, 7).forEach((b, i) => {
            const y = 130 + i * 62;
            c.fillStyle = i % 2 ? 'rgba(255,176,0,0.04)' : 'rgba(255,176,0,0.08)'; c.fillRect(24, y, 976, 56);
            t.text(b.name, 40, y + 29, 26, GOLD, 'left', true);
            t.text('until ' + new Date(b.until).toLocaleString(), 360, y + 29, 20, AMBER, 'left');
            t.btn('ub' + i, 810, y + 7, 180, 42, 'Unban', () => { N.unbanName(b.name); toast('Unbanned ' + b.name, '#9aff60'); }, { size: 22, tone: 'ok', disabled: !canUn });
        });
    } else {
        t.header('Hammers', null, null, () => { pc.page = 'home'; });
        t.text('Your Bagabucks: ' + SAVE.wallet, 40, 98, 22, GOLD, 'left', true);
        const tools = CATALOG.filter(it => it.slot === 'tool');
        tools.forEach((it, i) => {
            const y = 130 + i * 115, owned = isOwned(it), worn = SAVE.equipped.tool === it.id;
            c.fillStyle = 'rgba(255,176,0,0.06)'; c.fillRect(24, y, 976, 104);
            t.text(it.name, 40, y + 34, 30, worn ? OK_COL : GOLD, 'left', true);
            t.text(it.id === 'ban' ? '1000 Bagabucks' : (it.id === 'kick' ? 'Free for staff' : (it.id === 'gooby' ? 'Free for staff: hit a player to give them a Gooby jumpscare' : '')), 40, y + 74, 22, AMBER, 'left');
            if (worn) t.btn('w' + it.id, 700, y + 26, 290, 52, 'In your hand', null, { disabled: true });
            else if (owned) t.btn('e' + it.id, 700, y + 26, 290, 52, it.id === 'none' ? 'Put away' : 'Hold it', () => equipItem(it), { tone: 'ok' });
            else t.btn('bu' + it.id, 700, y + 26, 290, 52, 'Buy ' + it.price, () => buyItem(it), { tone: 'gold', disabled: SAVE.wallet < it.price });
        });
    }
    t.scanlines();
});

export function build() {
    // Kto tu wszedł bez roli i bez zaproszenia, musiał się włamać: skórka CHEATER na zawsze i ban na tydzień
    if (!isStaffName(SAVE.profile.name) && !N.isInvitedToStaff()) {
        markCheater(); N.selfBan(7 * 24 * 3600 * 1000);
        toast('CHEATER! Breaking into the staff room = one-week ban.', '#ff2a2a');
        N.leaveNetwork('You were caught cheating. Banned for one week.');
        setTimeout(() => location.reload(), 3000);
    }
    L.spawn = info.spawn.slice();
    L.bounds = { minX: -W + 0.3, maxX: W - 0.3, minZ: -D + 0.3, maxZ: D - 0.3, maxY: H - 0.3 };
    S = { tvT: 0, ceil: [] };
    buildRoom();
    buildFurniture();
    buildTrainingDummy(-4.6, 2.4, Math.PI / 2 - 0.2);   // manekin do testów młotków ekipy (Nothing Hammer)
    buildHaunt();   // pokój, który z czasem się psuje (niżej)
    const screen = tv.createMesh(2.4, 1.5); screen.position.set(0, 1.85, -D + 0.075); L.root.add(screen);
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
    const wp = wallpaper(); wp.repeat.set(6, 1.6);
    addCrispBlock(0, -0.5, 0, W * 2 + 2, 1, D * 2 + 2, 0x4a3424, 0x2a1a10, tex.wood, { uvMeters: 1.5 });
    addCrispBlock(0, H + 0.5, 0, W * 2 + 2, 1, D * 2 + 2, 0x1e1612, 0x2a1a10);
    const wallMat = new THREE.MeshStandardMaterial({ map: wp, color: 0x707070, roughness: 0.85 });
    const wall = (x, z, w, d) => {
        addCrispBlock(x, H / 2, z, w, H, d, 0x223322, 0x101810);
        const m = L.root.children[L.root.children.length - 1]; m.material = wallMat;
    };
    wall(0, -D - 0.5, W * 2 + 2, 1); wall(0, D + 0.5, W * 2 + 2, 1); wall(-W - 0.5, 0, 1, D * 2); wall(W + 0.5, 0, 1, D * 2);
    // Boazeria (bez kolizji, tuż przy ścianach)
    const panel = new THREE.MeshStandardMaterial({ map: tex.wood, color: 0x2e1c12, roughness: 0.6 });
    for (const [x, z, w, d] of [[0, -D + 0.03, W * 2, 0.06], [0, D - 0.03, W * 2, 0.06], [-W + 0.03, 0, 0.06, D * 2], [W - 0.03, 0, 0.06, D * 2]]) {
        const m = new THREE.Mesh(new THREE.BoxGeometry(w, 1.0, d), panel); m.position.set(x, 0.5, z); m.receiveShadow = true; L.root.add(m);
    }
    const rug = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 3.4), new THREE.MeshStandardMaterial({ map: carpet(), roughness: 0.95 }));
    rug.rotation.x = -Math.PI / 2; rug.position.set(0, 0.01, -1.4); rug.scale.set(1.4, 1.4, 1); rug.receiveShadow = true; L.root.add(rug);
    // Ciepłe światła sufitowe
    for (const [x, z] of [[-3.5, -2.5], [3.5, -2.5], [-3.5, 2.5], [3.5, 2.5]]) {
        const l = new THREE.PointLight(0xffc890, 10, 10, 1.6); l.position.set(x, H - 0.4, z); L.root.add(l); S.ceil.push({ l: l, base: 10 });
        const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.35, 0.22, 20, 1, true), new THREE.MeshStandardMaterial({ color: 0xe8d8b0, emissive: 0x6a5030, side: THREE.DoubleSide }));
        shade.position.set(x, H - 0.25, z); L.root.add(shade);
    }
}
// Mebel z kolizją: pudełko z materiałem
function box(x, y, z, w, h, d, mat, solid) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; L.root.add(m);
    if (solid !== false) addStaticBody(x, y, z, new CANNON.Box(new CANNON.Vec3(w / 2, h / 2, d / 2)), m, false);
    return m;
}
function buildFurniture() {
    const leather = new THREE.MeshStandardMaterial({ color: 0x2a0608, roughness: 0.45, envMapIntensity: ENV });
    const cushion = new THREE.MeshStandardMaterial({ color: 0x34080a, roughness: 0.6 });
    const wood = new THREE.MeshStandardMaterial({ map: tex.wood, color: 0x3e281a, roughness: 0.5, envMapIntensity: ENV });
    const dark = new THREE.MeshStandardMaterial({ color: 0x1a1a1c, metalness: 0.6, roughness: 0.4, envMapIntensity: ENV });
    const gold = new THREE.MeshStandardMaterial({ color: 0xd4a640, metalness: 1, roughness: 0.3, envMapIntensity: Math.max(0.6, ENV) });
    const TZ = -D;   // ściana z telewizorem
    // Kanapa przodem do telewizora
    box(0, 0.22, -0.6, 2.8, 0.44, 0.9, leather);
    for (const x of [-0.92, 0, 0.92]) box(x, 0.5, -0.65, 0.88, 0.14, 0.8, cushion, false);
    box(0, 0.8, -0.22, 2.8, 0.75, 0.24, leather);
    for (const s of [-1, 1]) box(s * 1.52, 0.55, -0.6, 0.24, 0.62, 0.9, leather);
    // Dwa fotele
    for (const s of [-1, 1]) {
        const x = s * 3.4;
        box(x, 0.22, -1.4, 1.0, 0.44, 0.9, leather);
        box(x, 0.5, -1.44, 0.7, 0.13, 0.75, cushion, false);
        box(x, 0.8, -1.02, 1.0, 0.75, 0.22, leather);
        for (const a of [-1, 1]) box(x + a * 0.44, 0.55, -1.4, 0.14, 0.6, 0.9, leather);
    }
    // Stolik kawowy z czaszką-świecznikiem
    box(0, 0.42, -2.2, 1.6, 0.06, 0.8, wood);
    for (const a of [-0.7, 0.7]) for (const b of [-0.32, 0.32]) box(a, 0.2, -2.2 + b, 0.06, 0.4, 0.06, dark, false);
    const skull = new THREE.Mesh(new THREE.SphereGeometry(0.08, 14, 10), new THREE.MeshStandardMaterial({ color: 0xe8e0c8, roughness: 0.6 })); skull.position.set(0.3, 0.52, -2.2); L.root.add(skull);
    const candle = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.1, 8), new THREE.MeshStandardMaterial({ color: 0xf0e8d0 })); candle.position.set(0.3, 0.64, -2.2); L.root.add(candle);
    const flame = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex.dot, color: 0xffb040, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); flame.scale.set(0.12, 0.18, 1); flame.position.set(0.3, 0.72, -2.2); L.root.add(flame);
    const cl = new THREE.PointLight(0xffa040, 1.5, 3, 2); cl.position.set(0.3, 0.8, -2.2); L.root.add(cl);
    S.flame = { sprite: flame, light: cl };
    // Szafka pod telewizorem i rama telewizora
    box(0, 0.3, TZ + 0.3, 3.2, 0.6, 0.5, wood);
    box(0, 1.85, TZ + 0.04, 2.56, 1.64, 0.06, dark, false);
    // Biurko szefa przy wschodniej ścianie z komputerem ekipy, tabliczką BOSS i krzesłem
    box(W - 0.6, 0.74, -3.0, 0.9, 0.08, 1.8, wood);
    for (const a of [-0.8, 0.8]) box(W - 0.6, 0.36, -3.0 + a, 0.8, 0.72, 0.1, wood, false);
    box(W - 0.35, 1.12, -3.0, 0.3, 0.66, 1.1, dark, false);
    const scr = staffPC.createMesh(0.94, 0.59); scr.position.set(W - 0.51, 1.12, -3.0); scr.rotation.y = -Math.PI / 2; L.root.add(scr);
    const plate = T.makeCanvas(256, 64), px = plate.getContext('2d');
    px.fillStyle = '#1a1208'; px.fillRect(0, 0, 256, 64); px.font = 'bold 44px serif'; px.textAlign = 'center'; px.textBaseline = 'middle'; px.fillStyle = '#ffd27a'; px.fillText('BOSS', 128, 34);
    const nameplate = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.075), new THREE.MeshBasicMaterial({ map: T.toTex(plate, false) }));
    nameplate.position.set(W - 1.06, 0.82, -2.3); nameplate.rotation.y = -Math.PI / 2; L.root.add(nameplate);
    box(W - 1.6, 0.45, -3.0, 0.55, 0.08, 0.55, leather); box(W - 1.85, 0.8, -3.0, 0.08, 0.65, 0.55, leather); box(W - 1.6, 0.22, -3.0, 0.08, 0.44, 0.08, dark, false);
    const lamp = new THREE.PointLight(0xffd8a0, 2.5, 3, 2); lamp.position.set(W - 0.7, 1.4, -2.0); L.root.add(lamp);
    // Stojak z młotkami na ścianie (ozdoba, młotki zakłada się na komputerze)
    const rack = new THREE.Group(); rack.position.set(W - 0.05, 1.7, 1.6); rack.rotation.y = -Math.PI / 2; L.root.add(rack);
    const board = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.0, 0.05), wood); rack.add(board);
    for (const [x, col, txt] of [[-0.4, 0xe8c020, 'KICK'], [0.4, 0xc01010, 'BAN']]) {
        // Prawdziwe modele młotków (świecą i iskrzą tak samo jak w dłoni), zawieszone główką do góry
        const hm = buildHammer(txt === 'BAN' ? 'ban' : 'kick'); hm.scale.setScalar(1.3); hm.rotation.x = Math.PI / 2; hm.position.set(x, -0.35, 0.14); rack.add(hm);
        const lc = T.makeCanvas(256, 64), lx = lc.getContext('2d'); lx.fillStyle = '#100808'; lx.fillRect(0, 0, 256, 64); lx.font = 'bold 40px sans-serif'; lx.textAlign = 'center'; lx.textBaseline = 'middle'; lx.fillStyle = '#ffd27a'; lx.fillText(txt + ' HAMMER', 128, 34);
        const lb = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.15), new THREE.MeshBasicMaterial({ map: T.toTex(lc, false) })); lb.position.set(x, -0.42, 0.03); rack.add(lb);
    }
    // Regał z książkami
    box(-W + 0.25, 1.1, -2.5, 0.4, 2.2, 2.4, wood);
    const R = T.mkRng(12);
    for (let shelf = 0; shelf < 4; shelf++) for (let i = 0; i < 12; i++) {
        const h = 0.22 + R() * 0.12;
        const bk = new THREE.Mesh(new THREE.BoxGeometry(0.22, h, 0.13), new THREE.MeshStandardMaterial({ color: new THREE.Color().setHSL(R(), 0.5, 0.25 + R() * 0.2), roughness: 0.8 }));
        bk.position.set(-W + 0.5, 0.3 + shelf * 0.5 + h / 2, -3.55 + i * 0.18); L.root.add(bk);
    }
    // Lampa stojąca, rośliny, obraz z nazwą gry
    box(-W + 0.8, 0.8, D - 0.9, 0.06, 1.6, 0.06, gold, false);
    const fl = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.32, 20, 1, true), new THREE.MeshStandardMaterial({ color: 0xe8d0a0, emissive: 0x6a4a20, side: THREE.DoubleSide })); fl.position.set(-W + 0.8, 1.7, D - 0.9); L.root.add(fl);
    const fll = new THREE.PointLight(0xffc080, 4, 5, 2); fll.position.set(-W + 0.8, 1.6, D - 0.9); L.root.add(fll);
    for (const [x, z] of [[W - 0.6, D - 0.6], [-W + 0.6, -D + 0.6]]) {
        box(x, 0.25, z, 0.45, 0.5, 0.45, new THREE.MeshStandardMaterial({ color: 0x2e1c14, roughness: 0.8 }));
        for (let i = 0; i < 7; i++) { const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), new THREE.MeshStandardMaterial({ color: 0x1e4a1e, roughness: 0.8 })); leaf.scale.set(0.5, 1.4, 0.5); leaf.position.set(x + Math.cos(i) * 0.12, 0.85, z + Math.sin(i) * 0.12); leaf.rotation.z = Math.cos(i * 2) * 0.5; L.root.add(leaf); }
    }
    const pc2 = T.makeCanvas(512, 320), x = pc2.getContext('2d');
    x.fillStyle = '#0c0606'; x.fillRect(0, 0, 512, 320);
    x.font = '84px Creepster, serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = '#b00000'; x.shadowColor = '#ff3a00'; x.shadowBlur = 18; x.fillText('BagaBoo VR', 256, 140);
    x.shadowBlur = 0; x.font = 'italic 32px Georgia, serif'; x.fillStyle = '#e8dcc8'; x.fillText('made by BoyIsGamer', 256, 230);
    const poster = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.0), new THREE.MeshStandardMaterial({ map: T.toTex(pc2, false), roughness: 0.6 }));
    poster.rotation.y = Math.PI / 2; poster.position.set(-W + 0.05, 1.9, 1.5); L.root.add(poster);
    box(-W + 0.04, 1.9, 1.5, 0.04, 1.12, 1.72, gold, false);
}

// ==========================================
// STAFF ROOM: POKÓJ, KTÓRY SIĘ PSUJE (zasady i liczby: core/hauntlogic.js, STAFF). Wszystko lokalne i wizualne, drzwi i ekrany działają normalnie.
// Statyczne: przyćmione światło i gęstsza mgła, krew i napisy na ścianach, ciała na dywanie, portrety z oczami, które śledzą gracza, słoiki z oczami, wisząca postać, trzy manekiny.
// Z czasem w pokoju (staffDread 0..1): szepty za plecami, mruganie świateł, widmo w telewizorze, napisy, kapanie krwi, kroki, manekiny skradają się, gdy nie patrzysz,
// a przy szczycie napięcia gasną wszystkie światła i czerwone oczy zbliżają się z ciemności (potem światło wraca, a manekiny stoją bliżej).
// ==========================================
const _sc = new THREE.Vector3(), _sd = new THREE.Vector3(), _sl = new THREE.Vector3();
const WRITES = ['LEAVE', 'HE IS BEHIND YOU', 'YOU SHOULD NOT BE HERE', 'I WAS THE BOSS', 'COUNT THE EXITS', "DON'T TURN AROUND"];
function paintCanvas(w, h, draw) { const c = T.makeCanvas(w, h), x = c.getContext('2d'); draw(x, w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return { c: c, x: x, t: t }; }
function portrait(px, py, pz, rotY, seed) {
    const R = T.mkRng(seed), g = new THREE.Group(); g.position.set(px, py, pz); g.rotation.y = rotY; L.root.add(g);
    g.add(new THREE.Mesh(new THREE.BoxGeometry(0.92, 1.17, 0.05), new THREE.MeshStandardMaterial({ color: 0x2a1c0c, metalness: 0.6, roughness: 0.4 })));
    const pic = paintCanvas(256, 320, (x) => {   // ciemny obraz: blada, wychudzona twarz z pustymi oczodołami
        const gr = x.createLinearGradient(0, 0, 0, 320); gr.addColorStop(0, '#120a06'); gr.addColorStop(1, '#2a1a10'); x.fillStyle = gr; x.fillRect(0, 0, 256, 320);
        x.fillStyle = '#1a1210'; x.beginPath(); x.ellipse(128, 120, 92, 108, 0, 0, 7); x.fill();   // włosy
        x.fillStyle = '#c8b8a0'; x.beginPath(); x.ellipse(128, 150, 70, 96, 0, 0, 7); x.fill();
        x.fillStyle = 'rgba(40,20,10,0.5)'; x.beginPath(); x.ellipse(90, 130, 26, 22, 0, 0, 7); x.ellipse(166, 130, 26, 22, 0, 0, 7); x.fill();
        x.strokeStyle = '#3a1410'; x.lineWidth = 3; x.beginPath(); x.moveTo(98, 226); x.quadraticCurveTo(128, 216 + R() * 12, 158, 226); x.stroke();
        x.fillStyle = '#7a0c10'; for (let i = 0; i < 4; i++) x.fillRect(100 + i * 18, 224, 3, 10 + R() * 30);
    });
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 1.02), new THREE.MeshStandardMaterial({ map: pic.t, roughness: 0.7 })); plane.position.z = 0.03; g.add(plane);
    const eyes = [];
    for (const sx of [-1, 1]) {
        const ex = sx * 0.122, ey = 0.096, w = new THREE.Mesh(new THREE.PlaneGeometry(0.115, 0.06), new THREE.MeshBasicMaterial({ color: 0xe8e0c0 })); w.position.set(ex, ey, 0.034); g.add(w);
        const pu = new THREE.Mesh(new THREE.CircleGeometry(0.024, 14), new THREE.MeshBasicMaterial({ color: 0x120000 })); pu.position.set(ex, ey, 0.036); g.add(pu); eyes.push({ w: w, p: pu, bx: ex, by: ey });
    }
    S.h.portraits.push({ g: g, eyes: eyes, blink: 0 }); return g;
}
function buildHaunt() {
    const h = S.h = { elapsed: 0, evT: 12, last: -1, done: false, bo: { t: -1, base: [], eyes: null, hemi: 0 }, portraits: [], jars: [], hang: null, mans: [], tvG: null, writes: [], flick: 0, steps: [], drops: [], creakT: 6, hangT: 0 };
    // atmosfera: przyćmione, chorobliwe światło i gęstsza mgła
    for (const c of S.ceil) { c.base = STAFF.CEIL; c.l.intensity = STAFF.CEIL; c.l.color.setHex(0xc8a070); }
    lighting.hemi.intensity *= STAFF.HEMI; DREAD.fogMul = STAFF.FOG; setDread(() => [], {});   // pusta lista: reżyser grozy daje tylko zjawy
    addStoryProps({ seed: 777, count: 46, corpses: 2 });
    // portrety (oczy śledzą gracza)
    portrait(-4.2, 2.0, -D + 0.05, 0, 31); portrait(4.2, 2.0, -D + 0.05, 0, 32); portrait(-W + 0.05, 2.0, 3.4, Math.PI / 2, 33); portrait(W - 0.05, 2.2, 3.8, -Math.PI / 2, 34);
    // konsola ze słoikami z oczami
    const wood = new THREE.MeshStandardMaterial({ map: tex.wood, color: 0x2e1c12, roughness: 0.5 });
    box(-3.6, 0.45, D - 0.3, 2.2, 0.9, 0.5, wood);
    const glass = new THREE.MeshPhysicalMaterial({ color: 0x90b090, transparent: true, opacity: 0.32, roughness: 0.1, clearcoat: 1 }), eyeM = new THREE.MeshStandardMaterial({ map: tex.eye, roughness: 0.2, emissive: 0x220000 });
    for (let i = 0; i < 5; i++) {
        const x = -4.5 + i * 0.45, jar = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.3, 14), glass); jar.position.set(x, 1.05, D - 0.3); L.root.add(jar);
        const eye = new THREE.Mesh(new THREE.SphereGeometry(0.052, 14, 12), eyeM); eye.position.set(x, 1.04, D - 0.3); L.root.add(eye); h.jars.push(eye);
    }
    // wisząca postać (kołysze się, skrzypi)
    { const g = new THREE.Group(); g.position.set(4.6, H, 3.4); L.root.add(g); const cloth = new THREE.MeshStandardMaterial({ color: 0x1c1c22, roughness: 0.9 }), skin = new THREE.MeshStandardMaterial({ color: 0xc8b8a8, roughness: 0.7 });
      const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.9, 6), new THREE.MeshStandardMaterial({ color: 0x4a3a28 })); rope.position.y = -0.45; g.add(rope);
      const body = new THREE.Group(); body.position.y = -0.9; g.add(body);
      const hd = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 10), skin); hd.position.set(0, -0.12, 0); hd.rotation.z = 0.5; body.add(hd);
      const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.15, 0.45, 4, 10), cloth); torso.position.y = -0.55; body.add(torso);
      for (const s of [-1, 1]) { const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.045, 0.5, 4, 8), cloth); arm.position.set(s * 0.22, -0.55, 0.03); arm.rotation.z = s * 0.08; body.add(arm); const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.06, 0.6, 4, 8), cloth); leg.position.set(s * 0.08, -1.2, 0); body.add(leg); }
      h.hang = g; }
    // manekiny w rogach (skradają się, gdy nie patrzysz)
    [[-5.2, -4.0], [4.4, -4.3], [-5.4, 2.4]].forEach(([x, z], i) => {
        const m = buildMannequin(T.mkRng(9100 + i)); addMonsterFace(m.head, { width: 0.058, open: 0.045, teeth: 11, long: 1.6, tears: 0x7a0a0a });
        m.group.position.set(x, 0, z); m.group.rotation.y = Math.atan2(-x, -z); L.root.add(m.group); h.mans.push({ g: m.group, head: m.head, home: { x: x, z: z }, t: nextIn(STAFF.CREEP.EVERY, Math.random) });
    });
    // widmo w telewizorze (nakładka z szumem i twarzą; sam ekran telewizora zostaje działający)
    { const tvg = paintCanvas(128, 80, () => {}); const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.5), new THREE.MeshBasicMaterial({ map: tvg.t, transparent: true, opacity: 0, depthWrite: false, toneMapped: false })); mesh.position.set(0, 1.85, -D + 0.085); mesh.renderOrder = 4; mesh.visible = false; L.root.add(mesh); h.tvG = { mesh: mesh, x: tvg.x, t: tvg.t, left: 0 }; }
    // napisy na ścianach (cztery miejsca)
    for (const [x, y, z, ry, w] of [[-W + 0.03, 1.6, -0.3, Math.PI / 2, 1.8], [W - 0.03, 1.8, -0.5, -Math.PI / 2, 2.4], [-3.8, 1.2, -D + 0.03, 0, 2.4], [3.6, 2.0, D - 0.03, Math.PI, 2.4]]) {
        const cv = paintCanvas(512, 160, () => {}), mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, w * 160 / 512), new THREE.MeshBasicMaterial({ map: cv.t, transparent: true, opacity: 0, depthWrite: false, toneMapped: false })); mesh.position.set(x, y, z); mesh.rotation.y = ry; mesh.visible = false; L.root.add(mesh); h.writes.push({ mesh: mesh, x: cv.x, t: cv.t, age: -1, len: 8 });
    }
}
function drawStatic(face) {
    const g = S.h.tvG, x = g.x, W2 = 128, H2 = 80, id = x.createImageData(W2, H2);
    for (let i = 0; i < id.data.length; i += 4) { const v = Math.random() * 230; id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = 255; }
    x.putImageData(id, 0, 0);
    if (face) { x.fillStyle = 'rgba(225,215,195,0.92)'; x.beginPath(); x.ellipse(64, 40, 24, 34, 0, 0, 7); x.fill(); x.fillStyle = '#080000'; x.beginPath(); x.ellipse(54, 32, 6, 8, 0, 0, 7); x.ellipse(74, 32, 6, 8, 0, 0, 7); x.ellipse(64, 54, 9, 13, 0, 0, 7); x.fill(); }
    g.t.needsUpdate = true;
}
function writeOn(i, text) {
    const w = S.h.writes[i]; w.x.clearRect(0, 0, 512, 160); w.x.textAlign = 'center'; w.x.textBaseline = 'middle'; w.x.font = 'bold ' + (text.length > 14 ? 52 : 82) + 'px "Courier New", monospace'; w.x.fillStyle = 'rgba(150,10,14,0.96)'; w.x.fillText(text, 256, 66);
    for (let k = 0; k < 8; k++) { w.x.fillStyle = 'rgba(140,8,12,0.9)'; w.x.fillRect(30 + Math.random() * 450, 96, 3 + Math.random() * 3, 12 + Math.random() * 46); }
    w.t.needsUpdate = true; w.age = 0; w.len = 8;
}
function startEvent(kind) {
    const h = S.h; camera.getWorldPosition(_sc); camera.getWorldDirection(_sd); _sd.y = 0; if (_sd.lengthSq() < 1e-4) _sd.set(0, 0, -1); _sd.normalize();
    if (kind === 'whisper') SFX.whisper({ x: _sc.x - _sd.x * 1.2, y: _sc.y - 0.1, z: _sc.z - _sd.z * 1.2 });
    else if (kind === 'flicker') { h.flick = 1.3; SFX.crackle({ x: 0, y: H - 0.4, z: 0 }); }
    else if (kind === 'tv') { h.tvG.left = 0.15 + Math.random() * 0.3; drawStatic(Math.random() < 0.5); h.tvG.mesh.visible = true; h.tvG.mesh.material.opacity = 0.95; SFX.crackle({ x: 0, y: 1.8, z: -D + 0.3 }); }
    else if (kind === 'writing') { const free = h.writes.map((w, i) => i).filter(i => h.writes[i].age < 0); if (free.length) { writeOn(free[(Math.random() * free.length) | 0], WRITES[(Math.random() * WRITES.length) | 0]); SFX.whisper({ x: _sc.x + _sd.x * 0.5, y: _sc.y, z: _sc.z + _sd.z * 0.5 }); } }
    else if (kind === 'drip') { const a = Math.random() * 6.283, d = 1.5 + Math.random() * 2.5, sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex.dot, color: 0xa80000, transparent: true, depthWrite: false })); sp.scale.setScalar(0.07); sp.position.set(_sc.x + Math.cos(a) * d, H - 0.1, _sc.z + Math.sin(a) * d); L.root.add(sp); h.drops.push({ sp: sp, v: 0 }); }
    else if (kind === 'slam') SFX.bang({ x: _sc.x - _sd.x * 5, y: 1.2, z: _sc.z - _sd.z * 5 });
    else if (kind === 'step') h.steps = [0.4, 0.95, 1.5, 2.05].map((t, i) => ({ t: t, d: 4 - i * 0.7 }));   // cztery kroki z tyłu, coraz bliżej, potem cisza
}
function startBlackout() {
    const b = S.h.bo; b.t = 0; b.base = []; L.root.traverse(o => { if (o.isPointLight) { b.base.push({ l: o, i: o.intensity }); o.intensity = 0; } }); b.hemi = lighting.hemi.intensity; lighting.hemi.intensity = b.hemi * 0.04;
    camera.getWorldDirection(_sd); _sd.y = 0; _sd.normalize(); b.dir = { x: _sd.x, z: _sd.z };
    if (!b.eyes) { b.eyes = []; for (const sx of [-1, 1]) { const e = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex.dot, color: 0xff1808, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false })); e.scale.set(0.22, 0.22, 1); e.renderOrder = 999; L.root.add(e); b.eyes.push(e); } }
    SFX.crackle({ x: 0, y: H - 0.4, z: 0 }); toast('The lights went out...', '#ff3a2a');
}
function endBlackout() {
    const b = S.h.bo; for (const o of b.base) o.l.intensity = o.i; lighting.hemi.intensity = b.hemi; b.t = -1; for (const e of b.eyes || []) e.visible = false;
    camera.getWorldPosition(_sc); SFX.crackle({ x: 0, y: H - 0.4, z: 0 }); SFX.stinger({ x: _sc.x, y: 1.5, z: _sc.z });
    for (const m of S.h.mans) { const n = manStep(m.g.position, m.home, { x: _sc.x, z: _sc.z }, [], Object.assign({}, STAFF.CREEP, { STEP: 1.4, MIN_DIST: 1.2, DRIFT: 9 })); if (n) { m.g.position.x = n.x; m.g.position.z = n.z; } }   // światło wraca: manekiny stoją bliżej
    writeOn(0, 'LEAVE'); S.h.elapsed = STAFF.AFTER_BLACKOUT * STAFF.RAMP;
}
function updateHaunt(dt, t) {
    const h = S.h; if (!h) return;
    camera.getWorldPosition(_sc); camera.getWorldDirection(_sd);
    const on = SETTINGS.lobbyEvents !== false;
    // portrety: źrenice wodzą za graczem, czasem mrugnięcie; słoiki: oczy patrzą na gracza
    for (const p of h.portraits) {
        _sl.copy(_sc); p.g.worldToLocal(_sl); const off = pupilOffset({ x: _sl.x - p.eyes[0].bx, y: _sl.y - p.eyes[0].by, z: _sl.z });
        for (const e of p.eyes) { e.p.position.x = e.bx + off.x * 0.026; e.p.position.y = e.by + off.y * 0.014; }
        p.blink -= dt; const closed = p.blink > -0.12 && p.blink < 0; if (p.blink <= -0.12) p.blink = 2.5 + Math.random() * 5; for (const e of p.eyes) { e.w.scale.y = closed ? 0.1 : 1; e.p.visible = !closed; }
    }
    for (const e of h.jars) e.lookAt(_sc);
    if (h.hang) { h.hang.rotation.z = Math.sin(t * 0.8) * 0.06; h.hang.rotation.x = Math.sin(t * 0.55 + 1) * 0.04; h.creakT -= dt; if (h.creakT <= 0) { h.creakT = 9 + Math.random() * 9; if (on) SFX.creak(0.22, { x: h.hang.position.x, y: 2.6, z: h.hang.position.z }); } }
    // widmo w telewizorze, napisy, kapanie, kroki, mruganie
    if (h.tvG.left > 0) { h.tvG.left -= dt; if (Math.random() < 0.5) drawStatic(Math.random() < 0.3); if (h.tvG.left <= 0) { h.tvG.mesh.visible = false; h.tvG.mesh.material.opacity = 0; } }
    for (const w of h.writes) if (w.age >= 0) { w.age += dt; const a = w.age < 1 ? w.age : (w.age > w.len - 1.5 ? Math.max(0, (w.len - w.age) / 1.5) : 1); w.mesh.material.opacity = a; w.mesh.visible = a > 0.01; if (w.age > w.len) { w.age = -1; w.mesh.visible = false; } }
    for (let i = h.drops.length - 1; i >= 0; i--) { const d = h.drops[i]; d.v += dt * 9; d.sp.position.y -= d.v * dt; if (d.sp.position.y <= 0.05) { SFX.splat && SFX.splat({ x: d.sp.position.x, y: 0.1, z: d.sp.position.z }); L.root.remove(d.sp); d.sp.material.dispose(); h.drops.splice(i, 1); } }
    for (let i = h.steps.length - 1; i >= 0; i--) { const s = h.steps[i]; s.t -= dt; if (s.t <= 0) { SFX.step(0.9, { x: _sc.x - _sd.x * s.d, y: 0, z: _sc.z - _sd.z * s.d }); h.steps.splice(i, 1); } }
    if (h.flick > 0) { h.flick -= dt; for (const c of S.ceil) c.l.intensity = c.base * (h.flick > 0 && Math.random() < 0.55 ? 0.05 : 1); if (h.flick <= 0) for (const c of S.ceil) c.l.intensity = c.base; }
    // zaciemnienie: wszystkie światła gasną, czerwone oczy zbliżają się z kierunku, w którym patrzysz, serce wali
    const b = h.bo;
    if (b.t >= 0) {
        b.t += dt; const d = eyesDistance(b.t), blink = Math.sin(b.t * 2.3) > 0.93 ? 0.1 : 1;
        for (let i = 0; i < 2; i++) { const e = b.eyes[i], side = i ? 1 : -1; e.visible = true; e.position.set(_sc.x + b.dir.x * d - b.dir.z * side * 0.07, STAFF.EYES.DEFAULT_HEIGHT + Math.sin(b.t * 1.7) * 0.05, _sc.z + b.dir.z * d + b.dir.x * side * 0.07); e.scale.set(0.22, 0.22 * blink, 1); }
        SFX.heartbeat(Math.min(1, 0.3 + b.t / STAFF.BLACKOUT_LEN * 0.7));
        if (b.t >= STAFF.BLACKOUT_LEN) endBlackout();
        return;
    }
    // manekiny skradają się, gdy nie patrzysz
    if (on) for (const m of h.mans) {
        _sl.set(m.g.position.x - _sc.x, 1.0 - _sc.y, m.g.position.z - _sc.z); const dist = _sl.length(); if (dist < 0.01) continue; _sl.multiplyScalar(1 / dist);
        if (_sd.dot(_sl) > 0.42) continue;   // widzisz go: stoi nieruchomo
        const target = Math.atan2(_sc.x - m.g.position.x, _sc.z - m.g.position.z); let dd = target - m.g.rotation.y; dd = Math.atan2(Math.sin(dd), Math.cos(dd)); m.g.rotation.y += Math.max(-1.4 * dt, Math.min(1.4 * dt, dd));
        m.t -= dt * (1 + 1.5 * staffDread(h.elapsed));
        if (m.t <= 0) { m.t = nextIn(STAFF.CREEP.EVERY, Math.random); const n = manStep(m.g.position, m.home, { x: _sc.x, z: _sc.z }, h.mans.filter(o => o !== m).map(o => o.g.position), STAFF.CREEP); if (n) { m.g.position.x = n.x; m.g.position.z = n.z; SFX.creak(0.07, { x: n.x, y: 1, z: n.z }); } }
    }
    // narastanie napięcia i zdarzenia
    if (!on) return;
    h.elapsed += dt; const dread = staffDread(h.elapsed);
    if (staffBlackoutDue(dread, h.done)) { h.done = true; startBlackout(); return; }
    h.evT -= dt;
    if (h.evT <= 0) { h.evT = staffGap(dread, Math.random); const k = pickKind(STAFF.EVENTS.length, Math.random, h.last); h.last = k; startEvent(STAFF.EVENTS[k]); }
}
// Hak dla testu w przeglądarce (tests/staffhaunt.mjs): wymusza zdarzenie, ustawia czas w pokoju i podaje stan
export function debugStaff(cmd, arg) {
    if (!S || !S.h) return null; const h = S.h;
    if (cmd === 'event') startEvent(arg); else if (cmd === 'elapsed') h.elapsed = arg; else if (cmd === 'blackout') startBlackout();
    return { elapsed: h.elapsed, dread: staffDread(h.elapsed), done: h.done, blackout: h.bo.t, eyes: h.bo.eyes ? h.bo.eyes.map(e => e.visible) : null, lights: S.ceil.map(c => c.l.intensity), flick: h.flick, tv: h.tvG.mesh.visible, writes: h.writes.map(w => w.age), steps: h.steps.length, drops: h.drops.length, mans: h.mans.map(m => ({ x: m.g.position.x, z: m.g.position.z, home: m.home })), portraits: h.portraits.length, jars: h.jars.length, hang: !!h.hang, fogMul: DREAD.fogMul };
}
export function update(dt, t) {
    if (!S) return;
    updateHaunt(dt, t);
    S.flame.sprite.material.opacity = 0.75 + 0.25 * Math.sin(t * 13) * Math.sin(t * 7.3);
    S.flame.light.intensity = 1.3 + 0.4 * Math.sin(t * 11);
    S.tvT -= dt; if (S.tvT <= 0) { S.tvT = 0.1; tv.dirty = true; }   // pasek na dole się przesuwa
    updateTrainingDummy(dt);
    S.pcT = (S.pcT || 0) - dt; if (S.pcT <= 0) { S.pcT = 1; staffPC.dirty = true; }
}
export function dispose() { if (S && S.h && S.h.bo.t >= 0) { for (const o of S.h.bo.base) o.l.intensity = o.i; lighting.hemi.intensity = S.h.bo.hemi; } DREAD.fogMul = 1; setDread(null); S = null; disposeTrainingDummy(); }
