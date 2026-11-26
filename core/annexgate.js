// ==========================================
// BRAMA DO SCARY GTA W ANEKSIE (3D i klawiatura; reguły w czystym core/gtagate.js, zapis w core/gtastore.js, układ: GATE_AT w core/annexlayout.js; testy: tests/gtagate.mjs).
// Drzwi w północnej ścianie aneksu są ZAMKNIĘTE (portal z warunkiem), dopóki gracz nie zaliczy trzech prób z tablicy obok: Climb Rush w mniej niż 45 s, 100+ punktów w Ghost Gallery
// i kod z czterech cyfr (liczby rzeczy w aneksie). Trzy lampki nad drzwiami pokazują zaliczone próby. Po otwarciu brama jest otwarta NA STAŁE (SAVE.gta.gate.open).
// ==========================================
import { THREE, L } from './engine.js';
import { buildDoor } from './levelkit.js';
import { Terminal, terminals, toast, AMBER, AMBER_DIM, GOLD, OK_COL, BAD_COL } from './terminal.js';
import * as SFX from './audio.js';
import * as A from './annexlayout.js';
import * as Gt from './gtagate.js';
import { gateState, gateOpen, unlockGate } from './gtastore.js';

let G = null;
export function buildAnnexGate() {
    const AT = A.GATE_AT, root = L.root;
    G = { geos: [], mats: [], typed: '', msg: '', lock: Gt.newLock(), term: null, sig: '', lamps: [], t: 0 };
    const geo = (g) => { G.geos.push(g); return g; }, mat = (m) => { G.mats.push(m); return m; };
    buildDoor({ x: AT.door.x, z: AT.door.z, rotY: 0, label: 'SCARY GTA', color: '#ff7ac8', glow: 0xff2a9a, wood: 0x2a1e30, light: true, collider: true,
        portal: { target: 'scarygta', cond: () => gateOpen(), deny: 'LOCKED. Pass the 3 trials on the board next to the door.', onEnter: () => toast('The night shift begins...', '#ff7ac8') } });
    for (let i = 0; i < 3; i++) {
        const m = mat(new THREE.MeshBasicMaterial({ color: 0x401018, toneMapped: false })), b = new THREE.Mesh(geo(new THREE.BoxGeometry(0.22, 0.22, 0.06)), m);
        b.position.set(AT.door.x + (i - 1) * AT.lamps.dx, AT.lamps.y, AT.door.z + 0.1); root.add(b); G.lamps.push(m);
    }
    G.term = new Terminal(draw, 1024, 640);
    const scr = G.term.createMesh(AT.board.w, AT.board.h); scr.position.set(AT.board.x, AT.board.y, AT.board.z); root.add(scr);
    G.term.dirty = true; refreshLamps();
}
function refreshLamps() {
    const g = gateState(), done = [g.climb || g.open, g.gallery || g.open, g.open];
    G.lamps.forEach((m, i) => m.color.setHex(done[i] ? 0x30ff70 : 0x401018));
}
function draw(t) {
    const g = gateState(), now = performance.now() / 1000, locked = now < G.lock.until, ready = Gt.keypadReady(g);
    t.background(); t.header('SCARY GTA // GATE', g.open ? 'OPEN' : Gt.trialsDone(g) + ' / ' + Gt.GATE.TRIALS, g.open ? OK_COL : AMBER_DIM);
    let y = 84; for (const ln of Gt.boardLines(g)) { t.text(ln.t, 28, y, ln.c === 'h' ? 24 : 18, ln.c === 'h' ? GOLD : (ln.c === 'ok' ? OK_COL : (ln.c === 'todo' ? AMBER : (ln.c === 'dim' ? '#c4a672' : '#e0d2b8'))), 'left', ln.c === 'h'); y += ln.c === 'h' ? 34 : 28; }
    t.text('KEYPAD', 800, 84, 22, ready || g.open ? GOLD : AMBER_DIM, 'center', true);
    t.text((G.typed + '----').slice(0, 4).split('').join(' '), 800, 140, 58, locked ? BAD_COL : (ready || g.open ? GOLD : AMBER_DIM), 'center', true);
    t.text(g.open ? 'THE DOOR IS OPEN' : (locked ? 'LOCKED FOR A WHILE' : (G.msg || (ready ? 'Enter the code' : 'Pass trials 1 and 2 first'))), 800, 186, 19, g.open ? OK_COL : (locked || !ready ? BAD_COL : AMBER), 'center');
    ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'CLR', '0', 'ENT'].forEach((k, i) => t.btn('k' + k, 645 + (i % 3) * 120, 212 + Math.floor(i / 3) * 96, 108, 86, k, () => press(k), { size: 32, tone: k === 'ENT' ? 'ok' : (k === 'CLR' ? 'bad' : undefined) }));
    t.scanlines();
}
function press(k) {
    if (!G) return;
    const now = performance.now() / 1000; if (now < G.lock.until) return;
    SFX.beep && SFX.beep(700 + (k.length === 1 ? +k * 40 : 0), 0.04, 0.05);
    if (k === 'CLR') G.typed = ''; else if (k === 'ENT') enter(); else if (G.typed.length < 4) G.typed += k;
    G.term.dirty = true;
}
function enter() {
    const g = gateState(), res = Gt.checkCode(g, G.typed), lk = Gt.lockStep(G.lock, res, performance.now() / 1000);
    G.lock = lk.lock; G.term.dirty = true;
    if (res === 'ok') { unlockGate(); G.msg = 'OPEN!'; toast('The Scary GTA door unlocks. It stays open for good.', '#ff7ac8'); SFX.bell && SFX.bell(); refreshLamps(); }
    else if (res === 'open') G.msg = 'Already open.';
    else if (res === 'locked') { G.msg = 'Pass trials 1 and 2 first.'; SFX.beep && SFX.beep(150, 0.06, 0.3); }
    else { G.msg = lk.locked ? 'Too many tries.' : 'Wrong code.'; SFX.beep && SFX.beep(150, 0.06, 0.3); }
    G.typed = '';
}
export function updateAnnexGate(dt) {
    if (!G) return; G.t += dt; if (G.t < 0.4) return; G.t = 0;
    const g = gateState(), sig = [g.climb, g.gallery, g.open].join() + ':' + (performance.now() / 1000 < G.lock.until);
    if (sig !== G.sig) { G.sig = sig; refreshLamps(); G.term.dirty = true; }
    if (G.msg === 'Too many tries.' && performance.now() / 1000 >= G.lock.until) { G.msg = ''; G.term.dirty = true; }
}
export function disposeAnnexGate() {
    if (!G) return; const i = terminals.indexOf(G.term); if (i >= 0) terminals.splice(i, 1);
    for (const g of G.geos) g.dispose(); for (const m of G.mats) m.dispose(); G.term.tex.dispose(); G = null;
}
export const debugGate = () => G ? { gate: gateState(), typed: G.typed, msg: G.msg, lamps: G.lamps.map(m => m.color.getHex()), lockedUntil: G.lock.until } : null;   // dla testów
export const debugGateKey = (k) => press(k);
