// ==========================================
// PANEL EMOTEK: otwiera się klawiszem G (komputer) albo przyciskiem A/X na kontrolerze (VR). Klik w emotkę (laserem albo celownikiem)
// odtwarza ją. Na komputerze klawisze 1-6 odtwarzają kolejne posiadane emotki od razu. Bez gry wieloosobowej widzisz tylko komunikat.
// ==========================================
import { THREE, scene, camera, renderer } from './engine.js';
import { Terminal, AMBER, AMBER_DIM, GOLD, OK_COL } from './terminal.js';
import { CATALOG, SAVE, isOwned, saveGame, bumpStat } from './economy.js';
import { EMOTES, playEmote } from './emotes.js';
import { toast } from './terminal.js';
import { PAUSE } from './pause.js';

let open = false;
const prev = new Map(), _p = new THREE.Vector3(), _d = new THREE.Vector3();
export const owned = () => CATALOG.filter(it => it.slot === 'emote' && isOwned(it));
function doEmote(id) { if (playEmote(id)) { toast(EMOTES[id].name + '!', '#ffd27a'); bumpStat('emotes'); } }
export function quickEmote() { const fav = SAVE.equipped.emote; return EMOTES[fav] ? fav : 'wave'; }

const panel = new Terminal((t) => {
    t.background();
    t.header('Emotes', 'G / A,X to close', AMBER_DIM);
    const list = owned();
    list.forEach((it, i) => {
        const col = i % 3, row = (i / 3) | 0;
        t.btn('em' + it.id, 24 + col * 202, 96 + row * 92, 190, 78, it.name, () => { doEmote(it.id); close(); }, { size: 24, tone: it.id === quickEmote() ? 'ok' : undefined, active: it.id === quickEmote() });
    });
    t.text('Green = favorite (set it in the shop). Keys 1-9.', 24, 440, 15, AMBER_DIM, 'left');
    t.text('High five: stand close, both pick it.', 24, 462, 15, AMBER_DIM, 'left');
    t.scanlines();
}, 640, 480);
panel.persistent = true;   // main.js nie zdejmuje siatki panelu przy zmianie poziomu
const mesh = panel.createMesh(0.8, 0.6);
mesh.renderOrder = 50;

function openPanel() {
    if (open || PAUSE.on) return;
    open = true;
    camera.getWorldPosition(_p); camera.getWorldDirection(_d); _d.y = 0;
    if (_d.lengthSq() < 0.01) _d.set(0, 0, -1);
    _d.normalize();
    mesh.position.copy(_p).addScaledVector(_d, 0.8); mesh.position.y -= 0.12;
    mesh.lookAt(_p.x, mesh.position.y, _p.z);
    scene.add(mesh); panel.dirty = true;
}
function close() { open = false; scene.remove(mesh); }
function toggle() { if (open) close(); else openPanel(); }

window.addEventListener('keydown', (e) => {
    if (renderer.xr.isPresenting || e.target.tagName === 'INPUT' || e.repeat) return;
    if (!document.body.classList.contains('connected')) return;   // dopiero po starcie gry
    if (e.code === 'KeyG') toggle();
    else if (/^Digit[1-9]$/.test(e.code)) { const l = owned(), it = l[+e.code.slice(5) - 1]; if (it) doEmote(it.id); }
});
// VR: przycisk A (prawy) lub X (lewy) = indeks 4 w gamepadzie; wołane co klatkę
export function pollEmoteButtons() {
    const session = renderer.xr.getSession && renderer.xr.getSession();
    if (!session) return;
    for (const src of session.inputSources) {
        const gp = src.gamepad; if (!gp) continue;
        const pressed = !!(gp.buttons[4] && gp.buttons[4].pressed), was = prev.get(src) || false;
        if (pressed && !was) toggle();
        prev.set(src, pressed);
    }
}
export function closeEmotePanel() { if (open) close(); }
void GOLD; void OK_COL; void AMBER; void saveGame;
