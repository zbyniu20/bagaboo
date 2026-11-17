// ==========================================
// GAME MODE: WORKSHOP (grupa PARTY GAMES w salonie Games): edytor własnych torów.
// Na ścianie jest ekran z siatką 20 x 20 pól (jak mapa z lotu ptaka), na stole makieta toru w skali 1:12. Wybierasz narzędzie (BLOCK, ERASE, START,
// FINISH), rozmiar i poziom bloku i klikasz pola. CHECK sprawdza, czy z START da się dojść do FINISH (skoki do 1,4 m, schody do 1 m), SAVE zapisuje
// mapę w jednym z trzech miejsc, TEST zapisuje i zabiera cię do trybu Custom Race (levels/custom.js), gdzie ją przejdziesz. Gdy host gra swoją mapą,
// goście dostają jej kod i też biegną (core/leveldata.js). Format i walidacja: core/workshoplogic.js (testy w Node), magazyn: core/workshopstore.js.
// ==========================================
import { THREE, L, tex, addCrispBlock } from '../core/engine.js';
import { Terminal, toast, wrapText, AMBER, AMBER_DIM, GOLD, OK_COL, BAD_COL } from '../core/terminal.js';
import { buildDoor } from '../core/levelkit.js';
import { WS, SLOTS, mapIn, saveMap, selectSlot } from '../core/workshopstore.js';
import { LIM, emptyMap, placeBlock, eraseAt, setMark, topAt, validateMap } from '../core/workshoplogic.js';
import { ARRIVAL_FROM_WORKSHOP } from './games.js';

const W = 8, D = 8, H = 6;                             // pokój 16 x 16 m
const CELL = 26, GX = 20, GY = 76;                     // siatka na ekranie: początek i rozmiar pola (px)
export const info = { id: 'workshop', name: 'Workshop', spawn: [0, 1.0, 5.5] };
const UI = { tool: 'block', w: 2, d: 2, h: 1, y: 0, slot: 0, msg: 'Pick a tool, then click the grid.', ok: true };
let S = null;
const SHADE = ['#3a2c18', '#4a3a1e', '#5a4826', '#6a5a30', '#7a6a3c', '#8a7a48', '#9a8a54', '#aa9a60', '#baaa6c', '#cabb78', '#dacb84', '#eadc90', '#fbee9c'];

const panel = new Terminal((t) => {
    if (!S) return;
    const c = t.ctx, map = S.map;
    t.background(); t.header('Workshop', 'Slot ' + (UI.slot + 1) + '  ' + map.b.length + '/' + LIM.BLOCKS + ' blocks', AMBER_DIM);
    // Siatka: kolor zależy od wysokości najwyższego bloku nad polem
    let hover = null; for (const id of t.hover) if (/^c\d+_\d+$/.test(id)) hover = id.slice(1).split('_').map(Number);
    for (let z = 0; z < LIM.GRID; z++) for (let x = 0; x < LIM.GRID; x++) {
        const top = topAt(map, x, z), px = GX + x * CELL, py = GY + z * CELL;
        c.fillStyle = top < 0 ? '#1a1209' : SHADE[Math.min(SHADE.length - 1, top)]; c.fillRect(px, py, CELL - 1, CELL - 1);
        t.buttons.push({ id: 'c' + x + '_' + z, x: px, y: py, w: CELL, h: CELL, action: () => clickCell(x, z) });
    }
    const mark = (m, col, ch) => { if (!m) return; const px = GX + m[0] * CELL, py = GY + m[1] * CELL; c.fillStyle = col; c.fillRect(px + 2, py + 2, CELL - 5, CELL - 5); t.text(ch, px + CELL / 2, py + CELL / 2 + 1, 18, '#140c05', 'center', true); };
    mark(map.s, '#7fff90', 'S'); mark(map.f, '#ffd23a', 'F');
    if (hover && UI.tool === 'block') {   // podgląd obrysu bloku (zakotwiczony w klikniętym polu, przycięty do siatki)
        const x = Math.min(hover[0], LIM.GRID - UI.w), z = Math.min(hover[1], LIM.GRID - UI.d);
        c.strokeStyle = '#ffffff'; c.lineWidth = 3; c.strokeRect(GX + x * CELL, GY + z * CELL, UI.w * CELL - 1, UI.d * CELL - 1);
    }
    // Panel narzędzi
    const X = 560;
    ['block', 'erase', 'start', 'finish'].forEach((k, i) => t.btn('tool-' + k, X + i * 112, 76, 104, 44, k.toUpperCase(), () => { UI.tool = k; msg('Tool: ' + k, true); }, { size: 20, active: UI.tool === k }));
    const row = (label, key, y, min, max) => {
        t.text(label, X, y + 22, 22, AMBER, 'left', true);
        t.btn(key + '-', X + 190, y, 60, 44, '-', () => { UI[key] = Math.max(min, UI[key] - 1); S.dirty = true; }, { size: 30 });
        t.text(String(UI[key]), X + 290, y + 22, 28, GOLD, 'center', true);
        t.btn(key + '+', X + 330, y, 60, 44, '+', () => { UI[key] = Math.min(max, UI[key] + 1); S.dirty = true; }, { size: 30 });
    };
    row('Width', 'w', 140, 1, LIM.W); row('Depth', 'd', 192, 1, LIM.D); row('Thickness', 'h', 244, 1, LIM.H); row('Level (m)', 'y', 296, 0, LIM.Y);
    for (let i = 0; i < SLOTS; i++) t.btn('slot' + i, X + i * 150, 352, 140, 44, 'Slot ' + (i + 1) + (WS.slots[i] ? ' *' : ''), () => loadSlot(i), { size: 22, active: UI.slot === i });
    t.btn('check', X, 408, 140, 48, 'CHECK', () => check(), { size: 22 });
    t.btn('save', X + 150, 408, 140, 48, 'SAVE', () => save(), { size: 22, tone: 'ok' });
    t.btn('test', X + 300, 408, 140, 48, 'TEST', () => test(), { size: 22, tone: 'gold' });
    t.btn('new', X + 300, 352, 140, 44, 'NEW', () => { S.map = emptyMap(); msg('New map. Build a way from S to F.', true); rebuildModel(); }, { size: 20, tone: 'bad' });
    const lines = wrapText(UI.msg, 36).slice(0, 4);
    lines.forEach((l, i) => t.text(l, X, 484 + i * 26, 20, UI.ok ? OK_COL : BAD_COL, 'left'));
    t.text('Level = height of the block bottom. START: green S, FINISH: gold F.', X, 612, 16, AMBER_DIM, 'left');
    t.scanlines();
});

function msg(text, ok) { UI.msg = text; UI.ok = ok !== false; S.dirty = true; }
function clickCell(cx, cz) {
    let r;
    if (UI.tool === 'block') r = placeBlock(S.map, [Math.min(cx, LIM.GRID - UI.w), Math.min(cz, LIM.GRID - UI.d), UI.y, UI.w, UI.d, UI.h]);
    else if (UI.tool === 'erase') r = eraseAt(S.map, cx, cz);
    else r = setMark(S.map, UI.tool === 'start' ? 's' : 'f', cx, cz);
    if (r.error) { msg(r.error, false); return; }
    S.map = r.map; msg(UI.tool === 'block' ? 'Block placed.' : (UI.tool === 'erase' ? 'Removed.' : UI.tool.toUpperCase() + ' set.'), true); rebuildModel();
}
function check() { const v = validateMap(S.map); if (v.ok) msg('OK: ' + v.stats.hops + ' jumps, ' + v.stats.length + ' m, par ' + v.stats.par + ' s. Save it or press TEST.', true); else msg(v.errors[0], false); return v.ok; }
function save() { const v = validateMap(S.map); if (!v.ok) { msg('Cannot save: ' + v.errors[0], false); return false; } if (!saveMap(UI.slot, S.map)) { msg('Could not save.', false); return false; } msg('Saved in slot ' + (UI.slot + 1) + '.', true); return true; }
function test() { if (!save()) return; if (S.ctx && S.ctx.goto) { toast('Custom Race: your map', '#7ad0ff'); S.ctx.goto('custom'); } }
function loadSlot(i) { UI.slot = i; selectSlot(i); S.map = mapIn(i) || emptyMap(); msg(WS.slots[i] ? 'Loaded slot ' + (i + 1) + '.' : 'Empty slot ' + (i + 1) + ': a fresh map.', true); rebuildModel(); }

// ---------- makieta na stole ----------
const PAL = [0x6a5a8a, 0x5a7a9a, 0x5a9a7a, 0x9a8a5a, 0x9a5a6a, 0x7a6a5a];
function rebuildModel() {
    S.dirty = true; if (!S.model) return;
    while (S.model.children.length) S.model.remove(S.model.children[0]);
    const k = 0.08, box = S.box;
    for (const b of S.map.b) {
        const m = new THREE.Mesh(box, S.mats[(b[2] + b[5]) % PAL.length]);
        m.scale.set(b[3] * k, b[5] * k, b[4] * k); m.position.set((b[0] + b[3] / 2 - LIM.GRID / 2) * k, (b[2] + b[5] / 2) * k, (b[1] + b[4] / 2 - LIM.GRID / 2) * k); S.model.add(m);
    }
    for (const [mk, col] of [[S.map.s, 0x40ff60], [S.map.f, 0xffd23a]]) if (mk && topAt(S.map, mk[0], mk[1]) >= 0) {
        const m = new THREE.Mesh(box, new THREE.MeshBasicMaterial({ color: col, toneMapped: false })); m.scale.set(0.07, 0.2, 0.07);
        m.position.set((mk[0] + 0.5 - LIM.GRID / 2) * k, (topAt(S.map, mk[0], mk[1]) + 1.2) * k, (mk[1] + 0.5 - LIM.GRID / 2) * k); S.model.add(m);
    }
}

export function build() {
    L.spawn = info.spawn.slice();
    L.bounds = { minX: -W + 0.4, maxX: W - 0.4, minZ: -D + 0.4, maxZ: D - 0.4, maxY: H - 0.4 };
    UI.slot = WS.sel;
    S = { clock: 0, ctx: null, map: mapIn(UI.slot) || emptyMap(), dirty: true, model: null, box: new THREE.BoxGeometry(1, 1, 1), mats: PAL.map(c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.6 })) };
    addCrispBlock(0, -0.5, 0, W * 2 + 2, 1, D * 2 + 2, 0x5a5048, 0x101010, tex.floor, { rough: tex.floorRough });
    addCrispBlock(0, H + 0.5, 0, W * 2 + 2, 1, D * 2 + 2, 0x38322c, 0x101010);
    for (const [x, z, w, d] of [[0, -D - 0.5, W * 2 + 2, 1], [0, D + 0.5, W * 2 + 2, 1], [-W - 0.5, 0, 1, D * 2], [W + 0.5, 0, 1, D * 2]]) addCrispBlock(x, H / 2, z, w, H, d, 0x8a8278, 0x201a14, tex.wall);
    for (const [x, z] of [[-4, -3], [4, -3]]) { const l = new THREE.PointLight(0xffe0b0, 40, 22, 1.6); l.position.set(x, H - 1, z); L.root.add(l); }
    // Ekran edytora na północnej ścianie, stół z makietą przed nim
    const scr = panel.createMesh(4.8, 3.0); scr.position.set(0, 2.7, -D + 0.12); L.root.add(scr);
    addCrispBlock(0, 0.45, 1.0, 2.6, 0.9, 2.6, 0x4a3a2a, 0x101010, tex.wood);
    S.model = new THREE.Group(); S.model.position.set(0, 0.9, 1.0); L.root.add(S.model); rebuildModel();
    buildDoor({ x: 0, z: D - 0.03, rotY: Math.PI, label: 'GAMES', color: '#d080ff', wood: 0x3a3048, portal: { target: 'games', spawn: ARRIVAL_FROM_WORKSHOP, onEnter: () => toast('Back to BagaBoo Games') } });
    panel.dirty = true;
}
export function update(dt, t, ctx) {
    if (!S) return;
    S.clock += dt; S.ctx = ctx;
    if (S.dirty) { S.dirty = false; panel.dirty = true; }
}
export function dispose() { if (S) { S.box.dispose(); S.mats.forEach(m => m.dispose()); } S = null; }
// Dla testów w przeglądarce: kliknięcie przycisku po identyfikatorze i odczyt stanu
export function _press(id) { if (!S) return false; panel.redraw(); const b = panel.buttons.find(x => x.id === id); if (!b) return false; b.action(); panel.redraw(); return true; }
export function debug() { return S ? { blocks: S.map.b.length, start: S.map.s, finish: S.map.f, valid: validateMap(S.map).ok, msg: UI.msg, ok: UI.ok, tool: UI.tool, slot: UI.slot, saved: WS.slots.map(c => !!c), model: S.model ? S.model.children.length : -1 } : null; }
