// ==========================================
// POZIOM: STAFF ROOM (pokój szefa gry)
// Wejście tylko dla admina i moderatorów (core/config.js). Telewizor: zaproszenia. Komputer na biurku:
// wybór moderatorów (admin), lista banów, zakup i zakładanie młotków Kick i Ban. Kanapa, fotele, stolik, biurko szefa, regał i telewizor z listą graczy.
// ==========================================
import { THREE, L, tex, addCrispBlock, addStaticBody, CANNON } from '../core/engine.js';
import { LIGHT_PRESETS, isStaffName, isAdminName, isModName, isUltimateName, MOD_NAMES, localMods, setLocalMod } from '../core/config.js';
import { SAVE, CATALOG, isOwned, buyItem, equipItem, setHideTag, markCheater } from '../core/economy.js';
import * as T from '../core/textures.js';
import { toast, Terminal, AMBER, AMBER_DIM, GOLD, OK_COL } from '../core/terminal.js';
import * as N from '../core/network.js';
import { PRESENCE } from '../core/presence.js';
import { buildDoor } from '../core/levelkit.js';
import { buildHammer } from '../core/avatar.js';
import { ARRIVAL_STAFF } from './lobby-door.js';

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
        t.text(N.NET.mode === 'host' ? 'Players banned in rooms you host:' : 'Bans are stored by the host of each room. This list shows bans from rooms you hosted.', 40, 100, 20, AMBER, 'left');
        if (!bans.length) t.text('No active bans.', 40, 150, 24, AMBER_DIM, 'left');
        bans.slice(0, 7).forEach((b, i) => {
            const y = 130 + i * 62;
            c.fillStyle = i % 2 ? 'rgba(255,176,0,0.04)' : 'rgba(255,176,0,0.08)'; c.fillRect(24, y, 976, 56);
            t.text(b.name, 40, y + 29, 26, GOLD, 'left', true);
            t.text('until ' + new Date(b.until).toLocaleString(), 360, y + 29, 20, AMBER, 'left');
            t.btn('ub' + i, 810, y + 7, 180, 42, 'Unban', () => N.unbanName(b.name), { size: 22, tone: 'ok' });
        });
    } else {
        t.header('Hammers', null, null, () => { pc.page = 'home'; });
        t.text('Your Bagabucks: ' + SAVE.wallet, 40, 98, 22, GOLD, 'left', true);
        const tools = CATALOG.filter(it => it.slot === 'tool');
        tools.forEach((it, i) => {
            const y = 130 + i * 115, owned = isOwned(it), worn = SAVE.equipped.tool === it.id;
            c.fillStyle = 'rgba(255,176,0,0.06)'; c.fillRect(24, y, 976, 104);
            t.text(it.name, 40, y + 34, 30, worn ? OK_COL : GOLD, 'left', true);
            t.text(it.id === 'ban' ? '1000 Bagabucks' : (it.id === 'kick' ? 'Free for staff' : ''), 40, y + 74, 22, AMBER, 'left');
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
    S = { tvT: 0 };
    buildRoom();
    buildFurniture();
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
    rug.rotation.x = -Math.PI / 2; rug.position.set(0, 0.01, -1.4); rug.scale.set(1.4, 1.4, 1); rug.receiveShadow = true; L.root.add(rug);
    // Ciepłe światła sufitowe
    for (const [x, z] of [[-3.5, -2.5], [3.5, -2.5], [-3.5, 2.5], [3.5, 2.5]]) {
        const l = new THREE.PointLight(0xffc890, 9, 10, 1.6); l.position.set(x, H - 0.4, z); L.root.add(l);
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
    const leather = new THREE.MeshStandardMaterial({ color: 0x5a0e10, roughness: 0.45, envMapIntensity: ENV });
    const cushion = new THREE.MeshStandardMaterial({ color: 0x6a1418, roughness: 0.6 });
    const wood = new THREE.MeshStandardMaterial({ map: tex.wood, color: 0x8a5a38, roughness: 0.5, envMapIntensity: ENV });
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
        box(x, 0.25, z, 0.45, 0.5, 0.45, new THREE.MeshStandardMaterial({ color: 0x5a3a2a, roughness: 0.8 }));
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

export function update(dt, t) {
    if (!S) return;
    S.flame.sprite.material.opacity = 0.75 + 0.25 * Math.sin(t * 13) * Math.sin(t * 7.3);
    S.flame.light.intensity = 1.3 + 0.4 * Math.sin(t * 11);
    S.tvT -= dt; if (S.tvT <= 0) { S.tvT = 0.1; tv.dirty = true; }   // pasek na dole się przesuwa
    S.pcT = (S.pcT || 0) - dt; if (S.pcT <= 0) { S.pcT = 1; staffPC.dirty = true; }
}
export function dispose() { S = null; }
