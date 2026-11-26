// ==========================================
// POKÓJ W DALEKIEJ ŚCIANIE ANEKSU (oprawa 3D i zapis; układ w core/annexlayout.js: WALL_ROOM, KEYPAD_AT; reguły sejfu w core/puzzlelogic.js; testy: tests/logic.mjs i tests/annexsecrets.mjs).
// Wnęka w grubości ściany zamknięta panelem. Panel opuszcza się, gdy zagrasz melodię na organach (openRoom, sekret melody); stan jest w SAVE.deep.open, więc przy kolejnych wizytach
// pokój jest od razu otwarty. W środku: srebrna czaszka (sekret room, core/deepskulls.js), lampa i sejf z klawiaturą na panelu (Terminal). Sejf otwiera się kodem dnia
// (dailyCode, czytany przez radio) i wypłaca VAULT.BONES raz na dobę UTC (sekret vault); trzy złe kody blokują klawiaturę na VAULT.LOCK sekund. Lokalne.
// ==========================================
import { THREE, CANNON, L, addStaticBody, world } from './engine.js';
import { Terminal, terminals, toast, AMBER, AMBER_DIM, GOLD, OK_COL, BAD_COL } from './terminal.js';
import { addBones, dailyDate } from './economy.js';
import * as SFX from './audio.js';
import * as A from './annexlayout.js';
import * as P from './puzzlelogic.js';
import { getDeep, patchDeep, findDeepSecret } from './deep.js';

let G = null;

export function buildAnnexRoom(flickers) {
    const root = L.root, R = A.WALL_ROOM, cx = (R.x0 + R.x1) / 2;
    G = { geos: [], mats: [], open: getDeep().open, slide: 0, typed: '', msg: '', lock: P.newLock(), term: null, panel: null, ob: null };
    const geo = (g) => { G.geos.push(g); return g; }, mat = (m) => { G.mats.push(m); return m; };
    if (!G.open) {
        const panel = new THREE.Mesh(geo(new THREE.BoxGeometry(R.x1 - R.x0, R.h, R.panel)), mat(new THREE.MeshStandardMaterial({ color: 0x3a2e2e, roughness: 0.85, metalness: 0.1 })));
        panel.position.set(cx, R.h / 2, R.z0 + R.panel / 2); panel.castShadow = true; panel.receiveShadow = true; root.add(panel); G.panel = panel;
        addStaticBody(cx, R.h / 2, R.z0 + R.panel / 2, new CANNON.Box(new CANNON.Vec3((R.x1 - R.x0) / 2, R.h / 2, R.panel / 2)), panel, false);
        G.ob = L.obstacles[L.obstacles.length - 1];
    }
    // Sejf (ozdoba z kolizją) i klawiatura na tylnej ścianie
    const safe = new THREE.Mesh(geo(new THREE.BoxGeometry(0.8, 1.1, 0.7)), mat(new THREE.MeshStandardMaterial({ color: 0x2a3036, metalness: 0.8, roughness: 0.4 }))); safe.position.set(R.x0 + 0.8, 0.55, R.z1 - 0.5); root.add(safe);
    addStaticBody(R.x0 + 0.8, 0.55, R.z1 - 0.5, new CANNON.Box(new CANNON.Vec3(0.4, 0.55, 0.35)), safe, false);
    G.term = new Terminal(draw, 480, 600);
    const scr = G.term.createMesh(1.0, 1.25); scr.position.set(A.KEYPAD_AT.x, A.KEYPAD_AT.y, A.KEYPAD_AT.z); scr.rotation.y = Math.PI; root.add(scr);
    const l = new THREE.PointLight(0xffa860, 9, 7, 2); l.position.set(cx, 2.9, (R.z0 + R.z1) / 2); root.add(l); flickers.push({ l: l, base: 9, ph: Math.random() * 100, subtle: true });
    L.reserved.push([cx, R.z0 - 1.2, 2.6]);   // dojście do panelu: bez dekoracji ściennych
    G.term.dirty = true;
}
function draw(t) {
    const today = dailyDate(), done = getDeep().vault === today, locked = performance.now() / 1000 < G.lock.until;
    t.background(); t.header('VAULT', done ? 'OPEN TODAY' : '', done ? OK_COL : AMBER_DIM);
    t.text((G.typed + '----').slice(0, 4).split('').join(' '), 240, 118, 64, locked ? BAD_COL : GOLD, 'center', true);
    t.text(locked ? 'LOCKED' : (G.msg || (done ? 'Come back tomorrow.' : 'Enter the code of the day')), 240, 168, 22, locked ? BAD_COL : AMBER, 'center');
    const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'CLR', '0', 'ENT'];
    keys.forEach((k, i) => t.btn('k' + k, 40 + (i % 3) * 140, 200 + Math.floor(i / 3) * 90, 120, 78, k, () => press(k), { size: 34, tone: k === 'ENT' ? 'ok' : (k === 'CLR' ? 'bad' : undefined) }));
    t.scanlines();
}
function press(k) {
    if (!G) return;
    const now = performance.now() / 1000;
    if (now < G.lock.until) return;
    SFX.beep && SFX.beep(700 + (k.length === 1 ? +k * 40 : 0), 0.04, 0.05);
    if (k === 'CLR') G.typed = '';
    else if (k === 'ENT') enter();
    else if (G.typed.length < 4) G.typed += k;
    G.term.dirty = true;
}
function enter() {
    const today = dailyDate(), res = P.vaultCheck(getDeep(), G.typed, today), lk = P.lockStep(G.lock, res, performance.now() / 1000);
    G.lock = lk.lock; G.term.dirty = true;
    if (res === 'ok') {
        patchDeep({ vault: today }); addBones(P.VAULT.BONES, 'Daily vault'); findDeepSecret('vault'); G.msg = 'OPEN! +' + P.VAULT.BONES; toast('The vault opens: +' + P.VAULT.BONES + ' Bagabucks', '#ffd27a'); SFX.bell && SFX.bell();
    } else if (res === 'done') G.msg = 'Already opened today.';
    else { G.msg = lk.locked ? 'Too many tries.' : 'Wrong code.'; SFX.beep && SFX.beep(150, 0.06, 0.3); }
    G.typed = '';
}
// Otwarcie panelu (melodia na organach): usuwa kolizję od razu, a panel opada w podłogę; stan zapisany
export function openRoom() {
    if (!G || G.open) return false;
    G.open = true; patchDeep({ open: true });
    if (G.ob) { world.removeBody(G.ob.body); const i = L.obstacles.indexOf(G.ob); if (i >= 0) L.obstacles.splice(i, 1); G.ob = null; }
    toast('Something moved in the far wall...', '#c8d8ff'); SFX.creak && SFX.creak(0.5, { x: -10.9, y: 1.5, z: 50 });
    return true;
}
export function updateAnnexRoom(dt, t) {
    if (!G) return;
    if (G.open && G.panel) { G.slide = Math.min(1, G.slide + dt / 1.8); G.panel.position.y = A.WALL_ROOM.h / 2 - G.slide * (A.WALL_ROOM.h + 0.2); if (G.slide >= 1) { L.root.remove(G.panel); G.panel = null; } }
    if (G.lock.until > 0 && performance.now() / 1000 >= G.lock.until && G.msg === 'Too many tries.') { G.msg = ''; G.term.dirty = true; }
}
export function disposeAnnexRoom() {
    if (!G) return;
    const i = terminals.indexOf(G.term); if (i >= 0) terminals.splice(i, 1);
    for (const g of G.geos) g.dispose(); for (const m of G.mats) m.dispose(); G.term.tex.dispose(); G = null;
}
export const debugRoom = () => G ? { open: G.open, panel: !!G.panel, blocked: !!G.ob && L.obstacles.includes(G.ob), saved: getDeep().open, slide: G.slide } : null;   // dla testów
export function debugVault(code) { if (!G) return ''; G.typed = code; const before = getDeep().vault; enter(); return getDeep().vault === dailyDate() && before !== dailyDate() ? 'ok' : G.msg; }
export const debugVaultCode = () => P.dailyCode(dailyDate());
