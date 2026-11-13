// ==========================================
// MENU STARTOWE W VR
// Ta sama strona startowa (nick, hasło, kolor, kod pokoju, grafika, Host / Join / Solo), ale jako panel
// w wirtualnej rzeczywistości, w kolorach strony. Panel czyta i zapisuje te same pola co strona,
// więc cała logika startu (hasła, bany, zapis) działa tak samo. Klawiatura jest na panelu, wybór laserem.
// ==========================================
import { THREE, scene, camera, renderer } from './engine.js';
import { Terminal } from './terminal.js';
import { isReservedNick } from './config.js';

const $ = (id) => document.getElementById(id);
const W = 1024, H = 1200;
const COLORS = ['#3d2314', '#1a1a1a', '#5a3a28', '#8a5a3a', '#2a3a5a', '#3a5a2a', '#6a1a1a', '#4a2a5a', '#7a6a5a', '#c8b8a0'];
const KEYS = [['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'], ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'], ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', '_'], ['Z', 'X', 'C', 'V', 'B', 'N', 'M', '-', '.', '!']];
const ui = { edit: null, shift: false, confirmNew: 0 };
let placed = false, group = null;

// Przycisk w stylu strony startowej (kolory jak w CSS menu)
function pageBtn(t, id, x, y, w, h, label, action, style) {
    const c = t.ctx, hov = t.hover.has(id), dis = !!style.disabled;
    t.rrect(x, y, w, h, 14);
    c.fillStyle = dis ? '#5a4848' : style.bg; c.fill();
    if (hov && !dis) { c.fillStyle = 'rgba(255,140,60,0.25)'; c.fill(); }
    c.lineWidth = hov ? 5 : 2; c.strokeStyle = dis ? '#4a3838' : (hov ? '#ffd27a' : style.border); c.stroke();
    c.font = 'bold ' + (style.size || 34) + 'px sans-serif'; c.fillStyle = dis ? '#b8a0a0' : (style.color || '#ffffff');
    c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(label, x + w / 2, y + h / 2 + 1);
    if (!dis) t.buttons.push({ id: id, x: x, y: y, w: w, h: h, action: action });
}
// Pole tekstowe jak na stronie (ciemne, z obramowaniem); kliknięcie otwiera klawiaturę
function field(t, id, x, y, w, value, editing, action) {
    const c = t.ctx, hov = t.hover.has(id);
    t.rrect(x, y, w, 64, 10); c.fillStyle = 'rgba(25,20,30,0.85)'; c.fill();
    c.lineWidth = editing ? 5 : (hov ? 4 : 2); c.strokeStyle = editing ? '#ffd27a' : (hov ? '#c98563' : '#8a5a4a'); c.stroke();
    c.font = '34px sans-serif'; c.fillStyle = '#f5ece6'; c.textAlign = 'left'; c.textBaseline = 'middle';
    c.fillText(value + (editing && Math.floor(performance.now() / 500) % 2 ? '|' : ''), x + 18, y + 34);
    t.buttons.push({ id: id, x: x, y: y, w: w, h: 64, action: action });
}
function label(c, txt, x, y) { c.font = 'bold 34px sans-serif'; c.fillStyle = '#f0e0d6'; c.textAlign = 'left'; c.textBaseline = 'middle'; c.shadowColor = '#000'; c.shadowBlur = 4; c.fillText(txt, x, y); c.shadowBlur = 0; }
function wrap(c, txt, x, y, maxW, lh) {
    const words = String(txt || '').split(' '); let line = '', yy = y;
    for (const w of words) { const test = line ? line + ' ' + w : w; if (c.measureText(test).width > maxW && line) { c.fillText(line, x, yy); yy += lh; line = w; } else line = test; }
    if (line) c.fillText(line, x, yy);
}

// Zmiana pola strony (i powiadomienie strony, np. o pokazaniu pola hasła)
function setField(id, v) { const el = $(id); el.value = v; el.dispatchEvent(new Event('input')); }
function typeKey(k) {
    const id = ui.edit, el = $(id), max = id === 'playerName' ? 16 : (id === 'roomCode' ? 12 : 40);
    if (k === 'BACK') setField(id, el.value.slice(0, -1));
    else if (k === 'SPACE') { if (id !== 'roomCode' && el.value.length < max) setField(id, el.value + ' '); }
    else if (el.value.length < max) { const ch = id === 'roomCode' ? k.toUpperCase() : (ui.shift ? k.toUpperCase() : k.toLowerCase()); setField(id, el.value + ch); if (ui.shift && id !== 'roomCode') ui.shift = false; }
}

const menu = new Terminal((t) => {
    const c = t.ctx;
    // Tło jak na stronie: ciepły, ciemniejący gradient
    const g = c.createRadialGradient(W * 0.28, H * 0.3, 10, W * 0.28, H * 0.3, W * 1.1);
    g.addColorStop(0, '#c98563'); g.addColorStop(0.38, '#6e5468'); g.addColorStop(0.72, '#2b2b3d'); g.addColorStop(1, '#15151f');
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    // Logo i podtytuł
    c.textAlign = 'center'; c.textBaseline = 'middle';
    c.font = '130px Creepster, cursive'; c.shadowColor = 'rgba(255,80,0,0.55)'; c.shadowBlur = 30; c.fillStyle = '#b00000'; c.fillText('BagaBoo VR', W / 2, 105); c.shadowBlur = 0;
    c.font = 'bold 30px sans-serif'; c.fillStyle = '#f2c8a8'; c.fillText("Dusk Nightmare Parkour | Don't Look Away", W / 2, 190);

    const name = $('playerName').value, reserved = isReservedNick(name);
    let y = 240;
    label(c, 'Nickname:', 120, y + 32);
    field(t, 'fName', 420, y, 480, name, ui.edit === 'playerName', () => { ui.edit = ui.edit === 'playerName' ? null : 'playerName'; });
    y += 84;
    if (reserved) {
        label(c, 'Password:', 120, y + 32);
        field(t, 'fPass', 420, y, 480, '\u2022'.repeat($('playerPass').value.length), ui.edit === 'playerPass', () => { ui.edit = ui.edit === 'playerPass' ? null : 'playerPass'; });
        y += 78;
        const on = $('rememberPass').checked;
        pageBtn(t, 'remember', 420, y, 480, 52, (on ? '\u2611 ' : '\u2610 ') + 'Remember password', () => { $('rememberPass').checked = !on; }, { bg: 'rgba(25,20,30,0.6)', border: '#8a5a4a', color: '#f0e0d6', size: 28 });
        y += 72;
    }
    if (ui.edit) { drawKeyboard(t, y + 10); return; }
    // Kolor ciała: próbki zamiast okienka wyboru koloru
    label(c, 'Body color:', 120, y + 32);
    const cur = $('playerColor').value.toLowerCase();
    COLORS.forEach((col, i) => {
        const x = 420 + i * 48, id = 'col' + i, hov = t.hover.has(id);
        t.rrect(x, y + 10, 40, 44, 8); c.fillStyle = col; c.fill();
        c.lineWidth = cur === col ? 5 : (hov ? 4 : 2); c.strokeStyle = cur === col ? '#ffd27a' : '#8a5a4a'; c.stroke();
        t.buttons.push({ id: id, x: x, y: y + 10, w: 40, h: 44, action: () => { $('playerColor').value = col; } });
    });
    y += 84;
    label(c, 'Room code:', 120, y + 32);
    field(t, 'fRoom', 420, y, 480, $('roomCode').value, false, () => { ui.edit = 'roomCode'; });
    y += 84;
    label(c, 'Graphics:', 120, y + 32);
    const q = $('quality').value;
    [['low', 'Low'], ['medium', 'Medium'], ['high', 'High']].forEach(([v, lab], i) => pageBtn(t, 'q' + v, 420 + i * 164, y + 4, 152, 56, lab, () => { if (q !== v) { $('quality').value = v; $('quality').onchange(); } }, { bg: q === v ? '#6e5468' : 'rgba(25,20,30,0.75)', border: q === v ? '#ffd27a' : '#8a5a4a', color: '#f5ece6', size: 28 }));
    y += 74;
    c.font = '22px sans-serif'; c.fillStyle = '#d8c0b0'; c.textAlign = 'center'; c.fillText('Changing graphics restarts the game.', W / 2, y + 6);
    y += 40;
    // Przyciski startu w kolorach strony
    const dis = (id) => $(id).disabled;
    pageBtn(t, 'host', 70, y, 280, 96, 'Host room', () => $('btnHost').click(), { bg: '#8a1a0a', border: '#aa3300', disabled: dis('btnHost') });
    pageBtn(t, 'join', 372, y, 280, 96, 'Join as guest', () => $('btnJoin').click(), { bg: '#a8360f', border: '#aa3300', disabled: dis('btnJoin') });
    pageBtn(t, 'solo', 674, y, 280, 96, $('btnSolo').innerText, () => $('btnSolo').click(), { bg: '#3a4058', border: '#4b5270', disabled: dis('btnSolo') });
    y += 118;
    if ($('btnNew').style.display !== 'none') {
        const armed = performance.now() - ui.confirmNew < 4000;
        pageBtn(t, 'new', 312, y, 400, 52, armed ? 'Tap again to delete!' : 'New game (delete save)', () => {
            if (armed) { const orig = window.confirm; window.confirm = () => true; $('btnNew').click(); window.confirm = orig; } else ui.confirmNew = performance.now();
        }, { bg: armed ? '#8a1a0a' : 'transparent', border: '#8a5a4a', color: '#f2c8a8', size: 24, disabled: dis('btnNew') });
        y += 70;
    }
    c.textAlign = 'center';
    c.font = '24px sans-serif'; c.fillStyle = '#ffd27a'; wrap(c, $('saveInfo').innerText, W / 2, y + 10, 860, 30); y += 70;
    c.font = 'bold 28px sans-serif'; c.fillStyle = '#f2c8a8'; wrap(c, $('status').innerText, W / 2, y + 10, 860, 34); y += 80;
    c.font = '21px sans-serif'; c.fillStyle = '#d8c0b0'; wrap(c, $('rules').innerText, W / 2, y + 6, 880, 27);
});
export const vrMenuTerminal = menu;   // main.js nie czyści tego ekranu przy zmianie poziomu
// Klawiatura na panelu (litery, cyfry, spacja, Shift, kasowanie, Gotowe)
function drawKeyboard(t, y) {
    const c = t.ctx, id = ui.edit;
    c.font = 'bold 28px sans-serif'; c.fillStyle = '#f2c8a8'; c.textAlign = 'center';
    c.fillText(id === 'playerName' ? 'Type your nickname' : (id === 'roomCode' ? 'Type the room code' : 'Type your password'), W / 2, y + 10);
    y += 40;
    const kw = 86, gap = 8, x0 = (W - (10 * kw + 9 * gap)) / 2;
    KEYS.forEach((row, r) => row.forEach((k, i) => {
        const shown = id === 'roomCode' || ui.shift ? k : k.toLowerCase();
        pageBtn(t, 'k' + r + '_' + i, x0 + i * (kw + gap), y + r * (kw + gap), kw, kw, shown, () => typeKey(k), { bg: 'rgba(25,20,30,0.8)', border: '#8a5a4a', color: '#f5ece6', size: 36 });
    }));
    y += 4 * (kw + gap) + 6;
    pageBtn(t, 'kShift', x0, y, 170, 80, ui.shift ? 'SHIFT \u2191' : 'Shift', () => { ui.shift = !ui.shift; }, { bg: ui.shift ? '#6e5468' : 'rgba(25,20,30,0.8)', border: '#8a5a4a', size: 28, disabled: id === 'roomCode' });
    pageBtn(t, 'kSpace', x0 + 180, y, 380, 80, 'Space', () => typeKey('SPACE'), { bg: 'rgba(25,20,30,0.8)', border: '#8a5a4a', size: 28, disabled: id === 'roomCode' });
    pageBtn(t, 'kBack', x0 + 570, y, 170, 80, '\u232b Delete', () => typeKey('BACK'), { bg: '#5a2a2a', border: '#aa3300', size: 26 });
    pageBtn(t, 'kDone', x0 + 750, y, 194, 80, 'Done', () => { ui.edit = null; }, { bg: '#2a5a2a', border: '#7fc47f', size: 32 });
}

// Co klatkę: panel stoi przed graczem w goglach, dopóki gra się nie zacznie
export function updateVrMenu(started) {
    const show = renderer.xr.isPresenting && !started;
    if (!group) { group = new THREE.Group(); group.add(menu.createMesh(1.4, 1.64)); scene.add(group); group.visible = false; }
    group.visible = show;
    if (!show) { if (!renderer.xr.isPresenting) placed = false; ui.edit = null; return; }
    if (!placed) {
        const p = new THREE.Vector3(), d = new THREE.Vector3();
        camera.getWorldPosition(p); camera.getWorldDirection(d); d.y = 0;
        if (d.lengthSq() < 0.01) return;
        d.normalize();
        group.position.set(p.x + d.x * 1.5, Math.max(1.2, p.y - 0.15), p.z + d.z * 1.5);
        group.lookAt(p.x, group.position.y, p.z);
        placed = true;
    }
    if (ui.edit) menu.dirty = true;   // migający kursor
}
