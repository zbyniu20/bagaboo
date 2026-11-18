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
import { petStatus, cycleColorPet, cycleName } from './petstore.js';
import { PET, colorChoices } from './petlogic.js';

export const PAUSE = { on: false, onLobby: null, inLobby: true };
const prev = new Map();
let page = 'main';   // 'main' albo 'pet' (wybór stworka)
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
// Strona wyboru stworka: kolor (rzadki złoty tylko dla złotego stworka) i imię z zamkniętych list; zmiany nic nie kosztują i niczego nie dają w grze
function petPage(t) {
    t.header('Choose your pet', 'BagaBoo VR', AMBER_DIM);
    t.btn('back', 60, 92, 420, 72, 'Back', () => { page = 'main'; pauseMenu.dirty = true; }, { tone: 'ok' });
    const st = petStatus();
    if (!st) {
        t.text('You have no pet yet.', 60, 250, 34, GOLD, 'left', true);
        t.text('Buy an egg in the lobby (north wall, the nest) for ' + PET.HATCH_COST + ' Bagabucks.', 60, 310, 24, AMBER, 'left');
    } else {
        t.text(st.name + '  (level ' + st.level + ', ' + st.moodLabel + ')', 60, 215, 34, GOLD, 'left', true);
        const row = (id, y, label, value, fn) => {
            t.text(label, 60, y + 30, 28, AMBER, 'left', true);
            t.btn(id + 'm', 380, y, 80, 56, '<', () => { fn(-1); pauseMenu.dirty = true; }, { size: 34 });
            t.text(value, 640, y + 30, 30, GOLD, 'center', true);
            t.btn(id + 'p', 820, y, 80, 56, '>', () => { fn(1); pauseMenu.dirty = true; }, { size: 34 });
        };
        row('pc', 290, 'Color', st.color.name + (st.color.rare ? ' (rare)' : ''), cycleColorPet);
        row('pn', 370, 'Name', st.name, cycleName);
        t.text(colorChoices(st.pet).length + ' colors to pick from. Feed and hat settings are at the nest in the lobby.', 60, 470, 22, AMBER_DIM, 'left');
    }
    t.text('Your pet only follows you in the halls (lobby, Levels, Games, Staff, Wardrobe, My Room).', 60, 560, 20, AMBER_DIM, 'left');
    t.text('Hold the grip (E on keyboard) next to it to pick it up, V puts it on your back or on the floor.', 60, 590, 20, AMBER_DIM, 'left');
    t.scanlines();
}
export const pauseMenu = new Terminal((t) => {
    t.background();
    if (page === 'pet') { petPage(t); return; }
    t.header('Paused', 'BagaBoo VR', AMBER_DIM);
    t.btn('resume', 60, 92, 300, 72, 'Resume', () => closePause(), { tone: 'ok' });
    t.btn('lobby', 380, 92, 300, 72, 'Back to lobby', () => { closePause(); if (PAUSE.onLobby) PAUSE.onLobby(); }, { disabled: PAUSE.inLobby });
    t.btn('pet', 700, 92, 260, 72, 'Choose pet', () => { page = 'pet'; pauseMenu.dirty = true; }, { tone: 'gold' });
    slider(t, 'mus', 'Music', 'music', 180);
    slider(t, 'fx', 'Effects', 'effects', 240);
    slider(t, 'sc', 'Jumpscares', 'scare', 300);
    slider2(t, 'br', 'Brightness', 'brightness', 360, 0.6, 1.8, 0.1);
    t.text('Comfort vignette', 60, 456, 28, AMBER, 'left', true);
    t.btn('vig', 380, 430, 260, 52, SETTINGS.vignette ? 'On' : 'Off', () => { SETTINGS.vignette = !SETTINGS.vignette; saveSettings(); }, { tone: SETTINGS.vignette ? 'ok' : undefined });
    t.btn('hap', 680, 430, 280, 52, SETTINGS.haptics ? 'Vibration on' : 'Vibration off', () => { SETTINGS.haptics = !SETTINGS.haptics; saveSettings(); }, { tone: SETTINGS.haptics ? 'ok' : undefined, size: 24 });
    t.text('Turning, events', 60, 516, 26, AMBER, 'left', true);
    t.btn('snap', 380, 490, 170, 52, SETTINGS.snapTurn ? 'Snap 30°' : 'Smooth', () => { SETTINGS.snapTurn = !SETTINGS.snapTurn; saveSettings(); }, { tone: SETTINGS.snapTurn ? 'ok' : undefined, size: 24 });
    t.btn('brReset', 565, 490, 200, 52, 'Reset bright.', () => { SETTINGS.brightness = 1; changed(); }, { size: 20 });
    t.btn('lev', 780, 490, 180, 52, SETTINGS.lobbyEvents ? 'Night on' : 'Night off', () => { SETTINGS.lobbyEvents = !SETTINGS.lobbyEvents; saveSettings(); }, { tone: SETTINGS.lobbyEvents ? 'ok' : undefined, size: 22 });
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
    PAUSE.on = true; page = 'main';
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
import { MOD } from './modstate.js';
const bDownAt = new Map(), prevB = new Map(), prevStick = new Map();
export function pollPauseButtons() {
    const session = renderer.xr.getSession && renderer.xr.getSession();
    if (!session) return;
    for (const src of session.inputSources) {
        const gp = src.gamepad; if (!gp) continue;
        if (MOD.allowed && src.handedness === 'right') {
            // BagaBooModMenu: B przytrzymane 5 s otwiera menu admina, więc pauza z B tylko przy krótkim naciśnięciu (po puszczeniu); gałka działa jak dawniej
            const b = !!(gp.buttons[5] && gp.buttons[5].pressed), st = !!(gp.buttons[3] && gp.buttons[3].pressed);
            if (b && !prevB.get(src)) bDownAt.set(src, performance.now());
            if (!b && prevB.get(src) && performance.now() - (bDownAt.get(src) || 0) < 800) togglePause();
            if (st && !prevStick.get(src)) togglePause();
            prevB.set(src, b); prevStick.set(src, st);
            continue;
        }
        const pressed = !!((gp.buttons[5] && gp.buttons[5].pressed) || (gp.buttons[3] && gp.buttons[3].pressed));
        const was = prev.get(src) || false;
        if (pressed && !was) togglePause();
        prev.set(src, pressed);
    }
}
window.addEventListener('keydown', (e) => { if (e.key === 'Escape') togglePause(); });
