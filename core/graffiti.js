// ==========================================
// ŚCIANA GRAFFITI (lobby, wschodnia ściana): wspólny mural 48x24 komórek, który maluje cała ekipa. Reguły są w core/graffitilogic.js (testy w Node).
// Ściana to zwykły Terminal: celownik (komputer) albo laser kontrolera (VR) wskazuje komórkę, klik = pędzel, na komputerze także przytrzymanie.
// Paleta (11 farb + gumka), dwa pędzle (1x1 i 3x3) i, tylko u hosta lub solo, przycisk zmazania.
// SIEĆ: gość maluje od razu u siebie i wysyła pociągnięcie do hosta ('gp'). Host sprawdza je sam: oczyszcza komórki (cleanCells), pilnuje tempa
//   na gracza (takeTokens) i czy gracz stoi przy ścianie wg POZYCJI JEGO GŁOWY u hosta (near), po czym rozsyła delty ('gd') i co kilka sekund
//   pełny snapshot RLE ('gs', z kluczem doby). Gość przyjmuje wiadomości tylko od hosta, więc cudze 'gd' i 'gs' od klienta nic nie zmieniają.
// DOBA: o 3:00 UTC ściana blaknie do białej (host liczy dayKey, goście biorą klucz ze snapshotu). Host (i solo) zapisuje ścianę dnia w localStorage.
// ==========================================
import { THREE, L } from './engine.js';
import { Terminal, terminals, AMBER, AMBER_DIM, GOLD } from './terminal.js';
import * as N from './network.js';
import { isMouseDown } from './desktop.js';
import { headOf } from './roundkit.js';
import { WALL, emptyWall, dayKey, cleanCells, brushCells, paintCells, makeBucket, takeTokens, near, cellAt, encodeWall, decodeWall } from './graffitilogic.js';

const POS = { x: 14.9, y: 2.4, z: 3.5 };            // środek ściany
const AREA = { x: 32, y: 56, w: 960, h: 480 };      // obszar obrazu na płótnie terminala (1024 x 640)
const KEY = 'bagaboo_graffiti_v1';
const SNAP_EVERY = 8, DELTA_EVERY = 0.2, SAVE_EVERY = 5;
let G = null;

export function buildGraffiti() {
    G = { wall: emptyWall(), day: dayKey(Date.now()), color: 3, brush: 0, cell: null, lastPaint: '', out: [], buckets: {}, clock: 0, snapT: 1, deltaT: 0, saveT: SAVE_EVERY, dayT: 1, snapNow: false, saveDirty: false, term: null };
    load();
    const t = new Terminal(draw, 1024, 640); G.term = t;
    const g = new THREE.Group(); g.position.set(POS.x, POS.y, POS.z); g.rotation.y = -Math.PI / 2; L.root.add(g);
    const frame = new THREE.Mesh(new THREE.BoxGeometry(6.2, 3.95, 0.1), new THREE.MeshStandardMaterial({ color: 0x2a221c, roughness: 0.6, metalness: 0.4 }));
    g.add(frame);
    const screen = t.createMesh(6.0, 3.75); screen.position.z = 0.055; g.add(screen);
    L.reserved.push([POS.x - 1.3, POS.z, 3.4]);
    G.group = g;
}
export function disposeGraffiti() {
    if (!G) return;
    save(true);
    const i = terminals.indexOf(G.term); if (i >= 0) terminals.splice(i, 1);
    G = null;
}

// ---------- zapis dnia (host i solo) ----------
function load() {
    if (N.NET.mode === 'guest') return;
    try {
        const raw = JSON.parse(localStorage.getItem(KEY) || 'null');
        if (raw && raw.d === G.day) { const w = decodeWall(raw.w); if (w) G.wall = w; }
    } catch (e) { /* brak zapisu albo zepsuty: zaczynamy od gołej ściany */ }
}
function save(force) {
    if (!G || N.NET.mode === 'guest' || (!G.saveDirty && !force)) return;
    G.saveDirty = false;
    try { localStorage.setItem(KEY, JSON.stringify({ d: G.day, w: encodeWall(G.wall) })); } catch (e) { /* pełny dysk: ściana zostaje tylko w sesji */ }
}

// ---------- malowanie ----------
const canClear = () => N.NET.mode !== 'guest';
function apply(cells) { if (paintCells(G.wall, cells) > 0) { G.term.dirty = true; G.saveDirty = true; return true; } return false; }
function paintAt(cx, cy) {
    const cells = brushCells(cx, cy, WALL.BRUSHES[G.brush], G.color);
    if (!apply(cells)) return;
    if (N.NET.mode === 'guest') N.sendLevelMsg({ k: 'gp', c: cells });   // do hosta; u siebie już namalowane
    else G.out.push(...cells);
}
function clearWall() { G.wall.fill(0); G.term.dirty = true; G.saveDirty = true; G.snapNow = true; }
function onWallClick() {
    const p = G.term.pointer; if (!p) return;
    const c = cellAt(p.x - AREA.x, p.y - AREA.y, AREA.w, AREA.h);
    if (c) { G.lastPaint = c[0] + ',' + c[1]; paintAt(c[0], c[1]); }
}

// ---------- rysowanie ekranu ----------
function draw(t) {
    const c = t.ctx; t.background();
    t.text('GRAFFITI WALL', 32, 28, 28, AMBER, 'left', true);
    t.text('click to paint, hold to draw  |  fades daily', 992, 28, 20, AMBER_DIM, 'right', true);
    c.fillStyle = WALL.BG; c.fillRect(AREA.x, AREA.y, AREA.w, AREA.h);
    const cw = AREA.w / WALL.W, ch = AREA.h / WALL.H;
    for (let y = 0; y < WALL.H; y++) for (let x = 0; x < WALL.W; x++) {
        const v = G.wall[y * WALL.W + x]; if (!v) continue;
        c.fillStyle = WALL.COLORS[v]; c.fillRect(AREA.x + x * cw, AREA.y + y * ch, cw + 0.5, ch + 0.5);
    }
    if (G.cell) {   // podgląd pędzla pod celownikiem
        const r = WALL.BRUSHES[G.brush] >= 3 ? 1 : 0;
        c.lineWidth = 3; c.strokeStyle = G.color ? WALL.COLORS[G.color] : '#000'; c.strokeRect(AREA.x + (G.cell[0] - r) * cw, AREA.y + (G.cell[1] - r) * ch, (2 * r + 1) * cw, (2 * r + 1) * ch);
        c.lineWidth = 1; c.strokeStyle = '#fff'; c.strokeRect(AREA.x + (G.cell[0] - r) * cw + 2, AREA.y + (G.cell[1] - r) * ch + 2, (2 * r + 1) * cw - 4, (2 * r + 1) * ch - 4);
    }
    t.buttons.push({ id: 'wall', x: AREA.x, y: AREA.y, w: AREA.w, h: AREA.h, action: onWallClick });
    // Paleta: 11 farb i gumka (0)
    for (let i = 1; i <= WALL.COLORS.length; i++) {
        const col = i % WALL.COLORS.length, x = 32 + (i - 1) * 64, y = 556, sel = G.color === col, hov = t.hover.has('col' + col);
        t.rrect(x, y, 56, 56, 8); c.fillStyle = col ? WALL.COLORS[col] : WALL.BG; c.fill();
        c.lineWidth = sel ? 6 : (hov ? 4 : 2); c.strokeStyle = sel ? GOLD : (hov ? '#fff' : AMBER_DIM); c.stroke();
        if (!col) t.text('X', x + 28, y + 29, 30, '#5a4628', 'center', true);
        t.buttons.push({ id: 'col' + col, x: x, y: y, w: 56, h: 56, action: () => { G.color = col; } });
    }
    for (let b = 0; b < WALL.BRUSHES.length; b++) t.btn('brush' + b, 808 + b * 64, 556, 56, 56, WALL.BRUSHES[b] + 'x', () => { G.brush = b; }, { active: G.brush === b, size: 24 });
    if (canClear()) t.btn('clear', 936, 556, 56, 56, 'CLR', clearWall, { tone: 'bad', size: 20 });
}

// ---------- sieć ----------
const MSG = { gp: 1, gd: 1, gs: 1 };
// Zwraca true, gdy wiadomość należy do ściany (lobbyplay nie przetwarza jej dalej)
export function onGraffitiMsg(msg, from) {
    if (!msg || typeof msg.k !== 'string' || !MSG[msg.k]) return false;
    if (!G) return true;
    if (N.NET.mode === 'host' && msg.k === 'gp') {
        const st = N.playersState[from];
        if (!st || st.lvl !== 'lobby' || !st.head) return true;
        const cells = cleanCells(msg.c); if (!cells.length) return true;
        const b = G.buckets[from] || (G.buckets[from] = makeBucket(G.clock));
        if (!takeTokens(b, cells.length / 3, G.clock)) return true;
        if (!near(headOf(from), POS)) return true;
        if (apply(cells)) G.out.push(...cells);
    } else if (N.NET.mode === 'guest') {   // gość słucha tylko hosta (levelHandler dostaje 'host' jako nadawcę)
        if (msg.k === 'gd') apply(cleanCells(msg.c));
        else if (msg.k === 'gs') {
            const w = decodeWall(msg.w);
            if (w && Number.isInteger(msg.d)) { G.wall = w; G.day = msg.d; G.term.dirty = true; }
        }
    }
    return true;
}
function flush() {
    if (N.NET.mode !== 'host') { G.out.length = 0; return; }
    const step = WALL.MAX_CELLS * 3;
    for (let i = 0; i < G.out.length; i += step) N.sendLevelMsg({ k: 'gd', c: G.out.slice(i, i + step) });
    G.out.length = 0;
}

// ---------- co klatkę ----------
export function updateGraffiti(dt, auth) {
    if (!G) return;
    G.clock += dt;
    const t = G.term, p = t.pointer, c = p && cellAt(p.x - AREA.x, p.y - AREA.y, AREA.w, AREA.h), key = c ? c[0] + ',' + c[1] : '';
    if ((G.cell ? G.cell[0] + ',' + G.cell[1] : '') !== key) { G.cell = c || null; t.dirty = true; }
    if (c && isMouseDown() && key !== G.lastPaint) { G.lastPaint = key; paintAt(c[0], c[1]); }
    if (!c) G.lastPaint = '';
    if (!auth || N.NET.mode === 'guest') return;
    G.dayT -= dt;
    if (G.dayT <= 0) { G.dayT = 1; const k = dayKey(Date.now()); if (k !== G.day) { G.day = k; clearWall(); } }
    G.deltaT -= dt; if (G.deltaT <= 0) { G.deltaT = DELTA_EVERY; flush(); }
    G.snapT -= dt;
    if ((G.snapT <= 0 || G.snapNow) && N.NET.mode === 'host') { G.snapT = SNAP_EVERY; G.snapNow = false; N.sendLevelMsg({ k: 'gs', d: G.day, w: encodeWall(G.wall) }); }
    G.saveT -= dt; if (G.saveT <= 0) { G.saveT = SAVE_EVERY; save(false); }
}
export function debugGraffiti() { return G ? { wall: G.wall, day: G.day, color: G.color, brush: G.brush } : null; }
