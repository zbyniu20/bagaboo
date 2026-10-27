// ==========================================
// PAUZA: przycisk Y (lewy kontroler), B (prawy) albo wciśnięcie gałki; na komputerze klawisz Escape.
// Menu w powietrzu przed graczem: wznów, wróć do lobby, głośności, winieta.
// W grze solo świat się zatrzymuje, w multiplayerze gra toczy się dalej.
// ==========================================
import { THREE, scene, camera, renderer } from './engine.js';
import { Terminal, AMBER, AMBER_DIM, GOLD, OK_COL } from './terminal.js';
import { SETTINGS, saveSettings } from './settings.js';
import * as SFX from './audio.js';

export const PAUSE = { on: false, onLobby: null, inLobby: true };
const prev = new Map();
const _p = new THREE.Vector3(), _d = new THREE.Vector3();

function slider(t, id, label, key, y) {
    t.text(label, 60, y + 26, 28, AMBER, 'left', true);
    t.btn(id + 'm', 380, y, 80, 56, '−', () => { SETTINGS[key] = Math.max(0, Math.round((SETTINGS[key] - 0.1) * 10) / 10); changed(); }, { size: 34 });
    t.bar(480, y + 18, 320, 22, SETTINGS[key], GOLD);
    t.btn(id + 'p', 820, y, 80, 56, '+', () => { SETTINGS[key] = Math.min(1, Math.round((SETTINGS[key] + 0.1) * 10) / 10); changed(); }, { size: 34 });
    t.text(Math.round(SETTINGS[key] * 100) + '%', 990, y + 26, 22, AMBER_DIM, 'right');
}
function changed() { saveSettings(); SFX.applyVolumes(); }

export const pauseMenu = new Terminal((t) => {
    t.background();
    t.header('Paused', 'BagaBoo VR', AMBER_DIM);
    t.btn('resume', 60, 96, 420, 80, 'Resume', () => closePause(), { tone: 'ok' });
    t.btn('lobby', 540, 96, 420, 80, 'Back to lobby', () => { closePause(); if (PAUSE.onLobby) PAUSE.onLobby(); }, { disabled: PAUSE.inLobby });
    slider(t, 'mus', 'Music', 'music', 210);
    slider(t, 'fx', 'Effects', 'effects', 290);
    slider(t, 'sc', 'Jumpscares', 'scare', 370);
    t.text('Comfort vignette', 60, 486, 28, AMBER, 'left', true);
    t.btn('vig', 380, 460, 260, 56, SETTINGS.vignette ? 'On' : 'Off', () => { SETTINGS.vignette = !SETTINGS.vignette; saveSettings(); }, { tone: SETTINGS.vignette ? 'ok' : undefined });
    t.text('Darkens the edges of your view when you move fast.', 60, 540, 20, AMBER_DIM, 'left');
    t.text('Graphics quality: ' + SETTINGS.quality + ' (change it in the main menu).', 60, 580, 20, AMBER_DIM, 'left');
    t.text('Press Y, B or the stick again to resume.', 60, 614, 20, OK_COL, 'left');
    t.scanlines();
});
const mesh = pauseMenu.createMesh(0.96, 0.6);
mesh.renderOrder = 50;

export function openPause() {
    if (PAUSE.on) return;
    PAUSE.on = true;
    camera.getWorldPosition(_p); camera.getWorldDirection(_d); _d.y = 0;
    if (_d.lengthSq() < 0.01) _d.set(0, 0, -1);
    _d.normalize();
    mesh.position.copy(_p).addScaledVector(_d, 0.9); mesh.position.y -= 0.1;
    mesh.lookAt(_p.x, mesh.position.y, _p.z);
    scene.add(mesh); pauseMenu.dirty = true;
}
export function closePause() { PAUSE.on = false; scene.remove(mesh); }
export function togglePause() { if (PAUSE.on) closePause(); else openPause(); }

// Odczyt przycisków kontrolerów (co klatkę): wykrywa wciśnięcie Y/B albo gałki
export function pollPauseButtons() {
    const session = renderer.xr.getSession && renderer.xr.getSession();
    if (!session) return;
    for (const src of session.inputSources) {
        const gp = src.gamepad; if (!gp) continue;
        const pressed = !!((gp.buttons[5] && gp.buttons[5].pressed) || (gp.buttons[3] && gp.buttons[3].pressed));
        const was = prev.get(src) || false;
        if (pressed && !was) togglePause();
        prev.set(src, pressed);
    }
}
window.addEventListener('keydown', (e) => { if (e.key === 'Escape') togglePause(); });
