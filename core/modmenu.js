// ==========================================
// BagaBooModMenu: sekretne menu admina. Otwiera się przytrzymaniem B (prawy kontroler) przez 2 s; na komputerze klawisz B.
// Tylko dla kont z MODMENU_NAMES (core/config.js), po zalogowaniu na serwerze kont (core/auth.js); dla innych graczy menu nie istnieje i nic nie reaguje.
// Opcje (stan w core/modstate.js):
//   BOOST      3 x prędkość ruchu                                          (efekt: player.js)
//   FLY        prawy chwyt = lecisz tam, gdzie patrzysz, lewy = do tyłu    (player.js)
//   NO CLIP    przechodzenie przez przeszkody                              (player.js)
//   SIZE       lewy spust zmniejsza goryla, prawy powiększa                (tutaj + player.js, inni widzą rozmiar przez network.js)
//   XRAY       inni gracze jako zielone poświaty z nametagami przez ściany (tutaj)
//   INVISIBLE  inni gracze cię nie widzą, tylko admini z menu              (network.js: egzekwuje host, nie klient)
// Menu to ekran w świecie jak terminale: klikasz je laserem albo celownikiem. Po wylogowaniu wszystkie opcje wyłączają się same.
// ==========================================
import { THREE, scene, camera, renderer } from './engine.js';
import { Terminal, terminals, toast } from './terminal.js';
import { MOD, resetMods, SIZE_MIN, SIZE_MAX } from './modstate.js';
import { account } from './auth.js';
import { isModMenuUser } from './config.js';
import { triggerDown } from './player.js';
import { remoteAvatars, playersState } from './network.js';
import { buzz } from './haptics.js';

const HOLD_S = 2, SIZE_RATE = 0.9;   // sekundy przytrzymania B; tempo zmiany rozmiaru (e-krotnie na sekundę)
const OPTIONS = [
    ['boost', 'BOOST x3', 'boost'], ['fly', 'FLY', 'fly'], ['noclip', 'NO CLIP', 'noclip'],
    ['size', 'SIZE', 'sizeOn'], ['xray', 'XRAY', 'xray'], ['invisible', 'INVISIBLE', 'invisible']
];
const TOASTS = {
    boost: 'Boost: 3x speed', fly: 'Fly: right grip forward, left grip back', noclip: 'No clip: walk through obstacles',
    size: 'Size: left trigger smaller, right trigger bigger', xray: 'Xray: players glow green', invisible: 'Invisible: only admins can see you'
};
let term = null, mesh = null, held = 0, fired = false, keyB = false;
const _p = new THREE.Vector3(), _d = new THREE.Vector3();

addEventListener('keydown', (e) => { if (e.code === 'KeyB' && !/INPUT|TEXTAREA/.test((e.target && e.target.tagName) || '')) keyB = true; });
addEventListener('keyup', (e) => { if (e.code === 'KeyB') keyB = false; });
function bPressed() {
    if (keyB) return true;
    const session = renderer.xr.isPresenting && renderer.xr.getSession && renderer.xr.getSession();
    if (!session) return false;
    for (const src of session.inputSources) if (src.handedness === 'right' && src.gamepad && src.gamepad.buttons[5] && src.gamepad.buttons[5].pressed) return true;   // B na prawym kontrolerze
    return false;
}

function draw(t) {
    const c = t.ctx, a = account();
    t.background(); t.header('BagaBooModMenu', a ? a.nick : '', '#ffd27a');
    OPTIONS.forEach(([id, label, key], i) => {
        const on = !!MOD[key], x = 40 + (i % 2) * 480, y = 100 + Math.floor(i / 2) * 118;
        const text = id === 'size' ? 'SIZE ' + MOD.size.toFixed(2) + 'x: ' + (on ? 'ON' : 'OFF') : label + ': ' + (on ? 'ON' : 'OFF');
        t.btn(id, x, y, 450, 98, text, () => toggle(id, key), { active: on, tone: 'ok', size: 32 });
    });
    // SIZE: przyciski działają od razu przy otwartym menu; spusty (gdy SIZE jest ON) zmieniają rozmiar dopiero po zamknięciu menu, bo w menu spust klika
    t.btn('smaller', 40, 452, 220, 70, 'SMALLER', () => stepSize(-1), { size: 28 });
    t.btn('bigger', 280, 452, 220, 70, 'BIGGER', () => stepSize(1), { size: 28 });
    t.text('Or set SIZE ON, close the menu:', 520, 472, 20, '#c8a060');
    t.text('left trigger smaller, right bigger', 520, 500, 20, '#c8a060');
    t.text('FLY: right grip = forward (where you look), left grip = back', 40, 546, 20, '#c8a060');
    t.text('INVISIBLE: only other admins can see you', 40, 566, 18, '#c8a060');
    t.btn('resetsize', 40, 580, 450, 80, 'RESET SIZE', () => { MOD.size = 1; }, { size: 28 });
    t.btn('close', 520, 580, 450, 80, 'CLOSE MENU', closeMenu, { size: 28, tone: 'bad' });
    t.scanlines();
}
// Jeden krok rozmiaru (x1.25 albo /1.25), w granicach SIZE_MIN..SIZE_MAX
function stepSize(dir) {
    MOD.size = Math.max(SIZE_MIN, Math.min(SIZE_MAX, MOD.size * (dir > 0 ? 1.25 : 0.8)));
    if (Math.abs(MOD.size - 1) < 0.03) MOD.size = 1;   // wraca dokładnie do 1, bez resztek zaokrągleń
    if (term) term.dirty = true;
}
// Spust po ręce (lewy / prawy kontroler); gdy przeglądarka nie podaje ręki, stary odczyt po indeksie kontrolera
function trigPressed(hand, idx) {
    const session = renderer.xr.isPresenting && renderer.xr.getSession && renderer.xr.getSession();
    if (session) for (const src of session.inputSources) if (src.handedness === hand && src.gamepad && src.gamepad.buttons[0] && src.gamepad.buttons[0].pressed) return true;
    return triggerDown(idx);
}
function toggle(id, key) {
    MOD[key] = !MOD[key];
    toast(MOD[key] ? TOASTS[id] : id.toUpperCase() + ' off', MOD[key] ? '#9aff60' : '#ffb454');
    if (term) term.dirty = true;
}
function ensureMenu() {
    if (term) return;
    term = new Terminal(draw, 1024, 700);
    term.persistent = true;   // main.js (loadLevel) zeruje siatkę każdego terminala bez tej flagi: bez niej menu otwarte przy zmianie poziomu przestawało reagować na laser i się nie przerysowywało
    mesh = term.createMesh(1.4, 0.957);
    const i = terminals.indexOf(term); if (i >= 0) terminals.splice(i, 1);   // zamknięte menu nie bierze udziału w celowaniu (wraca do listy przy otwarciu)
}
let placedSize = 1;
function placeMenu() {   // menu przed twarzą, w skali gracza (po zmianie rozmiaru ustawiane od nowa, żeby nie zostało małe albo daleko)
    camera.getWorldPosition(_p); camera.getWorldDirection(_d); _d.y = 0;
    if (_d.lengthSq() < 0.01) _d.set(0, 0, -1);
    _d.normalize();
    mesh.scale.setScalar(MOD.size);
    mesh.position.copy(_p).addScaledVector(_d, 1.0 * MOD.size); mesh.position.y -= 0.1 * MOD.size;
    mesh.lookAt(_p.x, mesh.position.y, _p.z);
    placedSize = MOD.size;
}
function openMenu() {
    ensureMenu();
    placeMenu();
    scene.add(mesh); if (!terminals.includes(term)) terminals.push(term);
    if (term.mesh !== mesh) { term.mesh = mesh; term.meshes = [mesh]; }   // siatka mogła zostać wyzerowana przy zmianie poziomu: bez tego menu było martwe aż do przeładowania
    MOD.open = true; term.dirty = true;
}
function closeMenu() {
    if (!term) return;
    scene.remove(mesh); const i = terminals.indexOf(term); if (i >= 0) terminals.splice(i, 1);
    MOD.open = false;
}

// ---------- XRAY: zielona poświata i nametag każdego gracza, rysowane bez testu głębi (przez ściany) ----------
function nameTexture(name) {
    const cv = document.createElement('canvas'); cv.width = 512; cv.height = 128;
    const x = cv.getContext('2d'); x.font = 'bold 64px "Courier New", monospace'; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.lineWidth = 10; x.strokeStyle = '#04120a'; x.strokeText(name, 256, 66); x.fillStyle = '#7dff5a'; x.fillText(name, 256, 66);
    const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; return tex;
}
function buildXray(a) {
    const glow = new THREE.Mesh(new THREE.SphereGeometry(0.5, 16, 12), new THREE.MeshBasicMaterial({ color: 0x39ff14, transparent: true, opacity: 0.4, depthTest: false, depthWrite: false, toneMapped: false }));
    glow.renderOrder = 998;
    const tag = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, depthTest: false, depthWrite: false, toneMapped: false }));
    tag.renderOrder = 999; tag.scale.set(1.0, 0.25, 1);
    a.group.add(glow); a.group.add(tag);
    return (a.xr = { glow: glow, tag: tag, name: null });
}
function updateXray() {
    for (const id in remoteAvatars) {
        const a = remoteAvatars[id], on = MOD.xray && !!a.head;
        if (!on) { if (a.xr) a.xr.glow.visible = a.xr.tag.visible = false; continue; }
        const x = a.xr || buildXray(a), sz = a.sz || 1, st = playersState[id], name = st && st.profile && st.profile.name ? String(st.profile.name).slice(0, 16) : 'Player';
        x.glow.visible = x.tag.visible = true;
        x.glow.position.copy(a.head.position); x.glow.position.y -= 0.3 * sz; x.glow.scale.set(0.9 * sz, 1.7 * sz, 0.9 * sz);
        x.tag.position.copy(a.head.position); x.tag.position.y += 0.55 * sz; x.tag.scale.set(1.0 * sz, 0.25 * sz, 1);
        if (x.name !== name) { x.name = name; if (x.tag.material.map) x.tag.material.map.dispose(); x.tag.material.map = nameTexture(name); x.tag.material.needsUpdate = true; }
    }
}

// Wywoływane co klatkę z main.js
export function updateModMenu(dt) {
    const acc = account(); MOD.allowed = !!acc && isModMenuUser(acc.nick);
    if (!MOD.allowed) {   // nie ma konta z listy (albo się wylogował): menu nie istnieje, a opcje wracają do normy
        if (MOD.open) closeMenu();
        if (MOD.boost || MOD.fly || MOD.noclip || MOD.sizeOn || MOD.xray || MOD.invisible || MOD.size !== 1) { resetMods(); updateXray(); }
        held = 0; fired = false; return;
    }
    if (bPressed()) {
        held += dt;
        if (held >= HOLD_S && !fired) { fired = true; if (MOD.open) closeMenu(); else openMenu(); buzz('both', 0.6, 120); }
    } else { held = 0; fired = false; }
    if (MOD.sizeOn && !MOD.open) {   // lewy spust zmniejsza, prawy powiększa
        const d = (trigPressed('right', 1) ? 1 : 0) - (trigPressed('left', 0) ? 1 : 0);
        if (d) MOD.size = Math.max(SIZE_MIN, Math.min(SIZE_MAX, MOD.size * Math.exp(d * SIZE_RATE * dt)));
    }
    if (MOD.open && term) { term.dirty = true; if (mesh && placedSize !== MOD.size) placeMenu(); }
    updateXray();
}
