// ==========================================
// ZAPROSZENIE OD HOSTA (3D). Panel przed twarzą z odliczaniem (reguły: core/invitelogic.js): ACCEPT albo DECLINE laserem z kontrolera (na komputerze celownikiem), klawisze Y / N.
// Odrzucenie i brak odpowiedzi w 10 s = gość zostaje tam, gdzie jest, i nie gra w poziomie hosta. Panel jest w `scene` (przeżywa zmianę poziomu), stoi w świecie,
// a gdy gracz odejdzie dalej niż 1,6 m albo odwróci się od niego, ustawia się na nowo przed twarzą (bez przyklejania do głowy: komfort VR). Wszystko lokalne.
// ==========================================
import { THREE, scene, camera } from './engine.js';
import { Terminal, AMBER_DIM, OK_COL, BAD_COL, GOLD } from './terminal.js';
import { inviteStep, answerInvite, isOpen, fraction, INVITE } from './invitelogic.js';

export const INV = { on: false };
let cur = null, onDone = null, redrawT = 0;
const panel = new Terminal((t) => {
    t.background();
    if (!cur) { t.scanlines(); return; }
    t.header('Invitation from the host', Math.ceil(cur.left) + ' s', cur.left < 4 ? BAD_COL : AMBER_DIM);
    t.text('The host went to', 512, 128, 28, AMBER_DIM, 'center');
    t.text(cur.name, 512, 178, 46, GOLD, 'center', true);
    t.bar(112, 222, 800, 24, fraction(cur), cur.left < 4 ? BAD_COL : OK_COL);
    t.btn('yes', 112, 270, 380, 96, 'ACCEPT', () => answer(true), { tone: 'ok', size: 40 });
    t.btn('no', 532, 270, 380, 96, 'DECLINE', () => answer(false), { tone: 'bad', size: 40 });
    t.text('Declining or not answering in ' + INVITE.TIMEOUT + ' s = you stay here and do not play. Keys: Y / N', 512, 402, 20, AMBER_DIM, 'center');
    t.scanlines();
}, 1024, 440);
panel.persistent = true;   // main.js zeruje mesh ekranów starego poziomu: to okno ma przeżyć zmianę poziomu
const mesh = panel.createMesh(0.8, 0.344);
mesh.renderOrder = 60;
const _p = new THREE.Vector3(), _d = new THREE.Vector3();
function place() {
    camera.getWorldPosition(_p); camera.getWorldDirection(_d); _d.y = 0;
    if (_d.lengthSq() < 0.01) _d.set(0, 0, -1);
    _d.normalize(); mesh.position.copy(_p).addScaledVector(_d, 0.95); mesh.position.y = _p.y - 0.12;
    mesh.lookAt(_p.x, mesh.position.y, _p.z);
}
function finish() { const inv = cur, f = onDone; cur = null; onDone = null; INV.on = false; scene.remove(mesh); if (f) f(inv); }
function answer(yes) { if (!isOpen(cur)) return; cur = answerInvite(cur, yes); finish(); }
// Nowe zaproszenie zastępuje trwające; done(inv) dostaje stan końcowy ('accepted' | 'declined' | 'timeout')
export function showInvite(inv, done) {
    if (isOpen(cur)) { const f = onDone; const old = answerInvite(cur, false); cur = null; onDone = null; if (f) f(old); }
    cur = inv; onDone = done; INV.on = true; place(); scene.add(mesh); panel.dirty = true; redrawT = 0;
}
export function hideInvite() { if (!cur) return; cur = null; onDone = null; INV.on = false; scene.remove(mesh); }
export function updateInvite(dt) {
    if (!cur) return;
    cur = inviteStep(cur, dt);
    if (!isOpen(cur)) { finish(); return; }
    camera.getWorldPosition(_p); camera.getWorldDirection(_d);
    const far = _p.distanceTo(mesh.position) > 1.6, toPanel = mesh.position.clone().sub(_p).normalize(), away = _d.dot(toPanel) < 0.35;
    if (far || away) place();
    redrawT -= dt; if (redrawT <= 0) { redrawT = 0.1; panel.dirty = true; }
}
if (typeof window !== 'undefined') window.addEventListener('keydown', (e) => {
    if (!INV.on || e.repeat) return;
    if (e.key === 'y' || e.key === 'Y') answer(true); else if (e.key === 'n' || e.key === 'N') answer(false);
});
export const debugInvite = () => ({ on: INV.on, left: cur ? cur.left : 0, state: cur ? cur.state : '', name: cur ? cur.name : '', inScene: mesh.parent === scene });   // dla testów
export const debugAnswer = (yes) => answer(!!yes);
export const debugPanel = () => panel;
