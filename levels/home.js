// ==========================================
// MÓJ POKÓJ (HOME): wejście z lobby (drzwi MY ROOM we wschodniej ścianie). Prywatny pokój z 8 miejscami na meble: kupujesz je za Bagabucks
// i ustawiasz na ekranie przy północnej ścianie (wybierz mebel, kliknij miejsce). Na zachodniej ścianie tablica trofeów (osiągnięcia i rekordy)
// i półka z pucharami (jeden za każde 3 osiągnięcia). Gdy host przejdzie przez swoje drzwi MY ROOM, goście idą za nim i oglądają JEGO pokój
// (tylko do odczytu: układ dostają przez core/leveldata.js i przyjmują go po walidacji, kupować i przestawiać mogą tylko u siebie).
// Logika i zasady: core/homelogic.js (testy w Node), stan: core/homestore.js (SAVE.home, zakupy przez spendBones).
// ==========================================
import { THREE, L, tex, addCrispBlock } from '../core/engine.js';
import * as T from '../core/textures.js';
import { buildMannequin } from '../core/mannequin.js';
import { Terminal, toast, AMBER, AMBER_DIM, GOLD, OK_COL, BAD_COL } from '../core/terminal.js';
import { buildDoor } from '../core/levelkit.js';
import { SAVE, ACHIEVEMENTS } from '../core/economy.js';
import { RECORD_DEFS } from '../core/registry.js';
import { LEVEL_DATA } from '../core/leveldata.js';
import { getHome, buyFurniture, placeFurniture, achievementCount } from '../core/homestore.js';
import { FURNITURE, SLOTS, ROOM, isFurniture, plaques, cupsFor } from '../core/homelogic.js';
import { ARRIVAL_HOME } from './lobby-door.js';

const W = ROOM.W, D = ROOM.D, H = 4.2;
export const info = { id: 'home', name: 'My Room', spawn: [0, 1.0, 5.6] };
const UI = { sel: null, msg: 'Pick a piece, then click a spot.', ok: true };
let S = null;

// ---------- modele mebli (proste bryły, bez kolizji) ----------
const mat = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.7 }, o || {}));
const box = (g, w, h, d, c, x, y, z, o) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(c, o)); m.position.set(x, y, z); m.castShadow = true; g.add(m); return m; };
const MODELS = {
    rug: (g) => { box(g, 2.6, 0.04, 1.8, 0x8a2a3a, 0, 0.02, 0); box(g, 2.1, 0.05, 1.3, 0xc8a050, 0, 0.025, 0); },
    plant: (g) => { const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.2, 0.45, 12), mat(0x7a4a2a)); pot.position.y = 0.22; g.add(pot); const leaves = new THREE.Mesh(new THREE.SphereGeometry(0.5, 12, 10), mat(0x2f8a3a)); leaves.position.y = 0.95; leaves.scale.y = 1.2; g.add(leaves); },
    lamp: (g) => { box(g, 0.08, 1.6, 0.08, 0x2a2a2a, 0, 0.8, 0); const sh = new THREE.Mesh(new THREE.ConeGeometry(0.34, 0.45, 14, 1, true), new THREE.MeshBasicMaterial({ color: 0xffe0a0, side: THREE.DoubleSide, toneMapped: false })); sh.position.y = 1.7; g.add(sh); box(g, 0.4, 0.06, 0.4, 0x2a2a2a, 0, 0.03, 0); },
    shelf: (g) => { box(g, 1.7, 2.1, 0.4, 0x5a3a20, 0, 1.05, 0); const cols = [0xc04040, 0x4060c0, 0x40a060, 0xc0a040, 0x8a50c0]; for (let r = 0; r < 4; r++) for (let i = 0; i < 6; i++) box(g, 0.16, 0.34, 0.28, cols[(r + i) % cols.length], -0.65 + i * 0.26, 0.45 + r * 0.48, 0.05); },
    neon: (g) => {
        const c = T.makeCanvas(512, 128), x = c.getContext('2d'); x.fillStyle = '#080408'; x.fillRect(0, 0, 512, 128); x.fillStyle = '#ff40c0'; x.shadowColor = '#ff40c0'; x.shadowBlur = 24; x.font = 'bold 76px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('BAGABOO', 256, 66);
        const sign = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 0.55), new THREE.MeshBasicMaterial({ map: T.toTex(c, false), toneMapped: false, side: THREE.DoubleSide })); sign.position.y = 1.8; g.add(sign);
        box(g, 0.08, 1.5, 0.08, 0x202020, -0.9, 0.75, 0); box(g, 0.08, 1.5, 0.08, 0x202020, 0.9, 0.75, 0);
    },
    couch: (g) => { box(g, 2.1, 0.45, 0.9, 0x4a3a6a, 0, 0.3, 0); box(g, 2.1, 0.55, 0.25, 0x3a2a5a, 0, 0.75, -0.35); box(g, 0.25, 0.65, 0.9, 0x3a2a5a, -1.0, 0.5, 0); box(g, 0.25, 0.65, 0.9, 0x3a2a5a, 1.0, 0.5, 0); },
    jukebox: (g) => { box(g, 0.95, 1.5, 0.6, 0x7a3a1a, 0, 0.75, 0); const arch = new THREE.Mesh(new THREE.CylinderGeometry(0.475, 0.475, 0.6, 16, 1, false, 0, Math.PI), mat(0x7a3a1a)); arch.rotation.z = Math.PI / 2; arch.rotation.y = Math.PI / 2; arch.position.y = 1.5; g.add(arch); box(g, 0.7, 0.8, 0.05, 0xffb040, 0, 1.0, 0.31, { emissive: 0xff8020, emissiveIntensity: 0.9 }); },
    statue: (g) => { box(g, 0.9, 0.5, 0.9, 0x6a6a72, 0, 0.25, 0); const m = buildMannequin(T.mkRng(77)); m.group.scale.setScalar(1.15); m.group.position.y = 0.5; g.add(m.group); }
};

// ---------- ekran: sklep i miejsca (własny pokój) albo informacja (odwiedziny) ----------
const panel = new Terminal((t) => {
    if (!S) return;
    t.background();
    if (S.visit) {
        t.header('Room of ' + S.visit.owner, 'Visiting', AMBER_DIM);
        t.text('You are a guest here. Look around!', 40, 120, 28, AMBER, 'left', true);
        const names = S.home.slots.map(id => id && FURNITURE.find(f => f.id === id)).filter(Boolean).map(f => f.name);
        t.text(names.length ? 'Furniture: ' + names.join(', ') : 'The room is still empty.', 40, 190, 24, GOLD, 'left');
        t.text(S.visit.owner + ' has ' + S.visit.ach + ' achievements.', 40, 250, 24, AMBER_DIM, 'left');
        t.text('Buying and moving furniture works in your own room.', 40, 600, 20, AMBER_DIM, 'left'); t.scanlines(); return;
    }
    t.header('My Room', SAVE.wallet + ' Bagabucks', GOLD);
    t.text('FURNITURE', 30, 84, 22, AMBER_DIM, 'left', true); t.text('SPOTS', 690, 84, 22, AMBER_DIM, 'left', true);
    FURNITURE.forEach((f, i) => {
        const y = 102 + i * 56, owned = S.home.owned.includes(f.id), placed = S.home.slots.includes(f.id);
        t.text(f.name, 30, y + 26, 26, owned ? OK_COL : AMBER, 'left', true);
        t.text(owned ? (placed ? 'in the room' : 'in storage') : f.price + ' B', 290, y + 26, 20, owned ? AMBER_DIM : GOLD, 'left');
        if (owned) t.btn('pick-' + f.id, 460, y, 160, 46, UI.sel === f.id ? 'SELECTED' : 'PICK', () => { UI.sel = f.id; msg('Now click a spot for the ' + f.name + '.', true); }, { size: 20, active: UI.sel === f.id });
        else t.btn('buy-' + f.id, 460, y, 160, 46, 'BUY', () => buy(f.id), { size: 22, tone: 'gold', disabled: SAVE.wallet < f.price });
    });
    SLOTS.forEach((_, i) => {
        const y = 102 + i * 56, id = S.home.slots[i], f = id && FURNITURE.find(x => x.id === id);
        t.btn('slot' + i, 690, y, 240, 46, (i + 1) + ': ' + (f ? f.name : 'empty'), () => setSlot(i), { size: 20, active: !!f });
        if (f) t.btn('clear' + i, 940, y, 50, 46, 'x', () => { const r = placeFurniture(i, null); if (r.ok) { S.home = getHome(); msg('Removed.', true); rebuildFurniture(); } }, { size: 22, tone: 'bad' });
    });
    t.text(UI.msg, 30, 590, 22, UI.ok ? OK_COL : BAD_COL, 'left');
    t.text('Trophies on the west wall, one cup per 3 achievements.', 30, 620, 16, AMBER_DIM, 'left');
    t.scanlines();
});
const trophies = new Terminal((t) => {
    if (!S) return;
    t.background(); t.header('Trophies', S.visit ? S.visit.owner : 'You', AMBER_DIM);
    S.plaques.forEach((l, i) => t.text(l, 30, 100 + i * 50, i === 0 ? 30 : 24, i === 0 ? GOLD : AMBER, 'left', i === 0));
    if (S.plaques.length < 2) t.text('Play to fill the wall.', 30, 170, 22, AMBER_DIM, 'left');
    t.scanlines();
}, 768, 640);

function msg(text, ok) { UI.msg = text; UI.ok = ok !== false; S.dirty = true; }
function buy(id) { const r = buyFurniture(id); if (r.ok) { S.home = getHome(); msg('Bought ' + FURNITURE.find(f => f.id === id).name + '.', true); } else msg(r.reason === 'poor' ? 'Not enough Bagabucks.' : 'Cannot buy that.', false); S.dirty = true; }
function setSlot(i) {
    if (!isFurniture(UI.sel)) { msg('Pick a piece first.', false); return; }
    const r = placeFurniture(i, UI.sel); if (!r.ok) { msg('Cannot place that: ' + r.reason, false); return; }
    S.home = getHome(); msg('Placed in spot ' + (i + 1) + '.', true); rebuildFurniture();
}
function rebuildFurniture() {
    S.dirty = true; if (!S.furn) return;
    while (S.furn.children.length) S.furn.remove(S.furn.children[0]);
    S.home.slots.forEach((id, i) => { if (!id || !MODELS[id]) return; const g = new THREE.Group(); g.position.set(SLOTS[i][0], 0, SLOTS[i][1]); g.rotation.y = SLOTS[i][2]; MODELS[id](g); S.furn.add(g); });
}

export function build() {
    L.spawn = info.spawn.slice();
    L.bounds = { minX: -W + 0.4, maxX: W - 0.4, minZ: -D + 0.4, maxZ: D - 0.4, maxY: H - 0.4 };
    const data = LEVEL_DATA.current;   // układ od hosta (odwiedziny), już zwalidowany; null = własny pokój
    const ach = data ? data.ach : achievementCount();
    S = { visit: data || null, home: data ? { owned: [], slots: data.slots } : getHome(), dirty: true, furn: null, plaques: [], cups: null };
    S.plaques = plaques(ach, data ? Math.max(ach, ACHIEVEMENTS.length) : ACHIEVEMENTS.length, RECORD_DEFS, data ? {} : SAVE.records);
    UI.sel = null;
    addCrispBlock(0, -0.5, 0, W * 2 + 2, 1, D * 2 + 2, 0x6a5848, 0x101010, tex.floor, { rough: tex.floorRough });
    addCrispBlock(0, H + 0.5, 0, W * 2 + 2, 1, D * 2 + 2, 0x3a342e, 0x101010);
    for (const [x, z, w, d] of [[0, -D - 0.5, W * 2 + 2, 1], [0, D + 0.5, W * 2 + 2, 1], [-W - 0.5, 0, 1, D * 2], [W + 0.5, 0, 1, D * 2]]) addCrispBlock(x, H / 2, z, w, H, d, 0x9a8a78, 0x201a14, tex.wall);
    for (const [x, z] of [[-3.5, -2], [3.5, 2]]) { const l = new THREE.PointLight(0xffe0b0, 36, 20, 1.6); l.position.set(x, H - 0.8, z); L.root.add(l); }
    const scr = panel.createMesh(3.6, 2.25); scr.position.set(0, 2.2, -D + 0.12); L.root.add(scr);
    const tr = trophies.createMesh(2.4, 2.0); tr.position.set(-W + 0.12, 2.3, 0); tr.rotation.y = Math.PI / 2; L.root.add(tr);
    // Półka z pucharami pod tablicą
    addCrispBlock(-W + 0.3, 0.55, 0, 0.5, 0.2, 5, 0x5a3a20, 0x101010);
    const cups = cupsFor(ach); S.cups = new THREE.Group(); L.root.add(S.cups);
    for (let i = 0; i < cups; i++) { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.08, 0.3, 12), mat(0xffd23a, { metalness: 0.8, roughness: 0.3 })); c.position.set(-W + 0.3, 0.8, -2.2 + i * 0.48); S.cups.add(c); }
    S.furn = new THREE.Group(); L.root.add(S.furn); rebuildFurniture();
    buildDoor({ x: 0, z: D - 0.03, rotY: Math.PI, label: 'LOBBY', color: '#ffd27a', wood: 0x4a3a30, portal: { target: 'lobby', spawn: ARRIVAL_HOME, onEnter: () => toast('Back to the lobby') } });
    if (S.visit) toast('Visiting the room of ' + S.visit.owner, '#9fc8ff');
    panel.dirty = true; trophies.dirty = true;
}
export function update(dt, t, ctx) {
    if (!S) return;
    if (S.dirty) { S.dirty = false; panel.dirty = true; trophies.dirty = true; }
    void ctx; void t;
}
export function dispose() { S = null; }
// Dla testów w przeglądarce: kliknięcie przycisku po identyfikatorze i odczyt stanu
export function _press(id) { if (!S) return false; panel.redraw(); const b = panel.buttons.find(x => x.id === id); if (!b) return false; b.action(); panel.redraw(); return true; }
export function debug() { return S ? { visiting: !!S.visit, owner: S.visit ? S.visit.owner : null, owned: S.home.owned.slice(), slots: S.home.slots.slice(), wallet: SAVE.wallet, furniture: S.furn ? S.furn.children.length : -1, cups: S.cups ? S.cups.children.length : -1, plaques: S.plaques.slice(), msg: UI.msg, ok: UI.ok, sel: UI.sel } : null; }
