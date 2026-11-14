// ==========================================
// PAUZA: przycisk Y (lewy kontroler), B (prawy) albo wciśnięcie gałki; na komputerze klawisz Escape.
// Menu w powietrzu przed graczem: wznów, wróć do lobby, głośności, winieta.
// W grze solo świat się zatrzymuje, w multiplayerze gra toczy się dalej.
// ==========================================
import { THREE, scene, camera, renderer, applyBrightness } from './engine.js';
import { Terminal, AMBER, AMBER_DIM, GOLD, OK_COL } from './terminal.js';
import { SETTINGS, saveSettings } from './settings.js';
import * as SFX from './audio.js';
import { SAVE, CATALOG, isOwned, equipItem } from './economy.js';
import { isStaffName } from './config.js';

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
function changed() { saveSettings(); SFX.applyVolumes(); applyBrightness(); }

// Suwak z dowolnym zakresem (jasność ma 0.6..1.8)
function slider2(t, id, label, key, y, min, max, step) {
    const clamp = (v) => Math.min(max, Math.max(min, Math.round(v * 100) / 100));
    t.text(label, 60, y + 26, 28, AMBER, 'left', true);
    t.btn(id + 'm', 380, y, 80, 52, '−', () => { SETTINGS[key] = clamp(SETTINGS[key] - step); changed(); }, { size: 34 });
    t.bar(480, y + 16, 320, 22, (SETTINGS[key] - min) / (max - min), GOLD);
    t.btn(id + 'p', 820, y, 80, 52, '+', () => { SETTINGS[key] = clamp(SETTINGS[key] + step); changed(); }, { size: 34 });
    t.text(Math.round(SETTINGS[key] * 100) + '%', 990, y + 26, 22, AMBER_DIM, 'right');
}
export const pauseMenu = new Terminal((t) => {
    t.background();
    t.header('Paused', 'BagaBoo VR', AMBER_DIM);
    t.btn('resume', 60, 92, 420, 72, 'Resume', () => closePause(), { tone: 'ok' });
    t.btn('lobby', 540, 92, 420, 72, 'Back to lobby', () => { closePause(); if (PAUSE.onLobby) PAUSE.onLobby(); }, { disabled: PAUSE.inLobby });
    slider(t, 'mus', 'Music', 'music', 180);
    slider(t, 'fx', 'Effects', 'effects', 240);
    slider(t, 'sc', 'Jumpscares', 'scare', 300);
    slider2(t, 'br', 'Brightness', 'brightness', 360, 0.6, 1.8, 0.1);
    t.text('Comfort vignette', 60, 456, 28, AMBER, 'left', true);
    t.btn('vig', 380, 430, 260, 52, SETTINGS.vignette ? 'On' : 'Off', () => { SETTINGS.vignette = !SETTINGS.vignette; saveSettings(); }, { tone: SETTINGS.vignette ? 'ok' : undefined });
    t.btn('hap', 680, 430, 280, 52, SETTINGS.haptics ? 'Vibration on' : 'Vibration off', () => { SETTINGS.haptics = !SETTINGS.haptics; saveSettings(); }, { tone: SETTINGS.haptics ? 'ok' : undefined, size: 24 });
    t.text('Turning', 60, 516, 28, AMBER, 'left', true);
    t.btn('snap', 380, 490, 260, 52, SETTINGS.snapTurn ? 'Snap 30°' : 'Smooth', () => { SETTINGS.snapTurn = !SETTINGS.snapTurn; saveSettings(); }, { tone: SETTINGS.snapTurn ? 'ok' : undefined });
    t.btn('brReset', 680, 490, 280, 52, 'Reset brightness', () => { SETTINGS.brightness = 1; changed(); }, { size: 22 });
    // Młotek do ręki w każdej chwili (tylko ekipa: moderatorzy i admini)
    if (isStaffName(SAVE.profile.name)) {
        const tool = SAVE.equipped.tool, item = (id) => CATALOG.find(it => it.slot === 'tool' && it.id === id);
        t.text('Hammer', 60, 580, 28, AMBER, 'left', true);
        t.btn('hNone', 300, 556, 200, 48, 'None', () => equipItem(item('none')), { size: 24, active: tool === 'none' });
        t.btn('hKick', 520, 556, 200, 48, 'Kick', () => equipItem(item('kick')), { size: 24, tone: 'gold', active: tool === 'kick', disabled: !isOwned(item('kick')) });
        t.btn('hBan', 740, 556, 220, 48, isOwned(item('ban')) ? 'Ban' : 'Ban (staff room)', () => equipItem(item('ban')), { size: isOwned(item('ban')) ? 24 : 18, tone: 'bad', active: tool === 'ban', disabled: !isOwned(item('ban')) });
    } else t.text('Vignette darkens the edges when you move fast. Snap turn rotates in 30° steps.', 60, 580, 19, AMBER_DIM, 'left');
    t.text('Graphics: ' + SETTINGS.quality + ' (main menu).  Press Y, B or the stick again to resume.', 60, 622, 19, OK_COL, 'left');
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
