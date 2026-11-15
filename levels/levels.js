// ==========================================
// POKÓJ "LEVELS": jeden terminal zamiast drzwi
// Na północnej ścianie stoi duży, nawiedzony terminal: lista poziomów (The Maze ... The Hotel i ukryte ROOM 000), opis, zagrożenie,
// wybór trudności (Easy / Normal / Nightmare), Daily Run, prawdziwe rekordy i duch #1, przycisk OPEN THE DOOR.
// Wybór klikasz celownikiem / laserem. Drzwi LOBBY z tyłu wracają do lobby. Po wyjściu z poziomu lądujesz przed terminalem.
// Dodatki grozy: oko śledzi celownik, monitor tętna reaguje na zagrożenie, w szkle stoi postać, która z czasem podchodzi bliżej.
// Nowy poziom: dopisz go do LV poniżej (oraz do core/registry.js).
// ==========================================
import { THREE, L, tex, addCrispBlock } from '../core/engine.js';
import * as T from '../core/textures.js';
import { fmtDuration, DIFFS, DIFF_ORDER, getDiff, setDiff, topTimes, dailyOn, setDailyMode, dailyDate } from '../core/economy.js';
import { Terminal, toast, wrapText } from '../core/terminal.js';
import { buildDoor, createJumpscare } from '../core/levelkit.js';
import * as SFX from '../core/audio.js';
import { IS_QUEST } from '../core/device.js';
import { ARRIVAL_LEVELS } from './lobby-door.js';

const W = 10, D = 7, H = 6;   // sala 20 x 14 m, terminal na północnej ścianie
export const info = { id: 'levels', name: 'Levels', spawn: [0, 1.0, 5.2] };
// Po powrocie z poziomu stajesz przed terminalem (wszystkie poziomy wracają w to samo miejsce)
const AR = [0, 1.2, -3.4];
export const ARRIVAL_FROM_MAZE = AR, ARRIVAL_FROM_SILENCE = AR, ARRIVAL_FROM_WELL = AR, ARRIVAL_FROM_LAUNDRY = AR, ARRIVAL_FROM_MEMORY = AR, ARRIVAL_FROM_HOSPITAL = AR,
    ARRIVAL_FROM_CEMETERY = AR, ARRIVAL_FROM_CATACOMBS = AR, ARRIVAL_FROM_NURSERY = AR, ARRIVAL_FROM_HOTEL = AR;

// Poziomy na liście (kolejność = numery na terminalu). rec: klucz rekordu w zapisie, threat 1-5, daily: ma Daily Run
const LV = [
    { target: 'maze', rec: 'maze', label: 'THE MAZE', type: 'CHASE', threat: 3, daily: true, msg: 'You open the door...', desc: ['A huge random maze.', 'A mannequin hunts you.', 'Find the exit.'] },
    { target: 'silence', rec: 'silence', label: 'SILENCE', type: 'STEALTH', threat: 4, msg: 'Shhh...', desc: ['The Blind One hears', 'every move you make.', 'Survive 3 minutes.'] },
    { target: 'well', rec: 'well', label: 'THE WELL', type: 'ESCAPE', threat: 3, daily: true, msg: 'Do not look down...', desc: ['Climb a 64 m shaft', 'before the black', 'ooze takes you.'] },
    { target: 'laundry', rec: 'laundry', label: 'LAUNDROMAT', type: 'CHASE', threat: 4, msg: 'Something is walking between the washers...', desc: ['Close 4 steam valves.', 'The Threadman', 'hunts in the steam.'] },
    { target: 'memory', rec: 'memory', label: 'BURNING MEMORY', type: 'MEMORY', threat: 3, daily: true, msg: 'Remember or burn...', desc: ['Cross 20 rows of stones', 'over lava. Remember the', 'safe ones. Run!'] },
    { target: 'hospital', rec: 'hospital', label: 'THE HOSPITAL', type: 'STEALTH', threat: 4, msg: 'Do not blink...', desc: ['Find 3 keycards.', 'Patients move when your', 'flashlight is not on them.'] },
    { target: 'cemetery', rec: 'cemetery', label: 'THE CEMETERY', type: 'STEALTH', threat: 4, msg: 'Stay out of the lantern light...', desc: ['Steal 5 relics.', 'A gravedigger hunts with', 'a lantern. Hide in crypts.'] },
    { target: 'catacombs', rec: 'catacombs', label: 'CATACOMBS', type: 'STEALTH', threat: 5, msg: 'Do not run. It is listening...', desc: ['Find 4 screaming skulls.', 'The Warden has no light,', 'only red eyes. He hears all.'] },
    { target: 'nursery', rec: 'nursery', label: 'THE NURSERY', type: 'SURVIVAL', threat: 5, msg: 'Keep the music playing...', desc: ['Find 4 teddy bears.', 'A doll sleeps while your', 'music box plays. Wind it!'] },
    { target: 'hotel', rec: 'hotel', label: 'THE HOTEL', type: 'SURVIVAL', threat: 5, msg: 'Do not stop. Hide when it rumbles...', desc: ['Open numbered doors, find', 'keys, hide in wardrobes.', 'Something rushes through.'] },
    { secret: true, label: 'ROOM 000', type: 'UNKNOWN', threat: 5, msg: 'It was never on the list.', desc: ['No one has opened this door.', 'It opens from the other side.', 'Do not knock twice.'] }
];
const WORDS = ['', 'FAINT', 'LOW', 'HIGH', 'SEVERE', 'LETHAL'], PROX = ['9.0 m', '7.2 m', '5.1 m', '3.4 m', '1.9 m', '0.6 m'];
const WHISPERS = ['LISTEN.', 'STILL THERE?', 'NOT THAT ONE.', 'BEHIND YOU.', 'I CAN HEAR YOU BREATHE.', 'CHOOSE.', 'HE IS WATCHING THE DOOR.'];
const TICKER = 'THEY ARE WATCHING YOU  ■  NO ONE CAME BACK  ■  DO NOT LOOK BEHIND YOU  ■  IT HEARS EVERY STEP  ■  TURN BACK NOW  ■  ';
const BEAT = [[0, 32], [46, 32], [54, 26], [62, 32], [86, 32], [92, 38], [100, 4], [108, 58], [116, 32], [150, 32], [162, 24], [178, 32], [200, 32]];
const MONO = '"VT323","Courier New",monospace', SERIF = '"IM Fell English SC",Georgia,serif', ITAL = 'italic "IM Fell English",Georgia,serif';
const BONE = '#e8dcc6', BLOOD = '#ff3b2a', AMB = '#ffb454', AMBD = '#b88442';

// Stan wyboru przeżywa przejścia między poziomami (zapamiętujemy ostatnio wybrany poziom)
const TS = { sel: 9, knock: 0 };
let term = null, overlay = null, noise = null;
let S = null;

function ensureAssets(W2, H2) {
    if (!overlay) {   // linie skanowania i winieta rysowane raz
        overlay = document.createElement('canvas'); overlay.width = W2; overlay.height = H2;
        const c = overlay.getContext('2d');
        c.fillStyle = 'rgba(0,0,0,0.3)'; for (let y = 0; y < H2; y += 3) c.fillRect(0, y + 1, W2, 1);
        const v = c.createRadialGradient(W2 / 2, H2 / 2, H2 * 0.35, W2 / 2, H2 / 2, W2 * 0.62); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.78)');
        c.fillStyle = v; c.fillRect(0, 0, W2, H2);
        noise = document.createElement('canvas'); noise.width = 128; noise.height = 128;
        const n = noise.getContext('2d'), img = n.createImageData(128, 128);
        for (let i = 0; i < img.data.length; i += 4) { const g = Math.random() * 255; img.data[i] = img.data[i + 1] = img.data[i + 2] = g; img.data[i + 3] = 22; }
        n.putImageData(img, 0, 0);
    }
}
function sp(c, px) { try { c.letterSpacing = px + 'px'; } catch (e) { /* starsze przeglądarki: bez rozstrzelenia */ } }
function tx(c, s, x, y, size, col, align, font, glow) {
    // kursywa musi stać przed rozmiarem w zapisie czcionki
    c.font = font && font.startsWith('italic ') ? 'italic ' + size + 'px ' + font.slice(7) : size + 'px ' + (font || MONO); c.fillStyle = col;
    c.textAlign = align || 'left'; c.textBaseline = 'middle';
    if (glow) { c.shadowColor = col; c.shadowBlur = glow; }
    c.fillText(s, x, y); c.shadowBlur = 0;
}
function mmss(sec) { return fmtDuration(sec * 1000); }

// Wybrany poziom, wejście i pukanie do ukrytych drzwi
function pick(i) { TS.sel = i; S.entered = false; term.dirty = true; }
function enter() {
    const d = LV[TS.sel];
    if (d.secret) return knock();
    if (!S || S.leaving || !S.ctx) return;
    S.leaving = true; TS.last = TS.sel;
    toast(d.msg, '#ffb454'); SFX.creak(0.8, { x: 0, y: 2, z: -D + 1 });
    S.ctx.goto(d.target);
}
function knock() {
    TS.knock++; S.entered = true;
    SFX.bang({ x: 0, y: 1.6, z: -D + 0.5 });
    if (TS.knock === 1) { toast('Something knocked back.', '#ff4a2a'); SFX.whisper({ x: 0, y: 1.6, z: -D + 0.5 }); }
    else if (TS.knock === 2) { toast('I told you.', '#ff4a2a'); S.scare.trigger(); }
    else toast('It is already open.', '#ff4a2a');
    term.dirty = true;
}

// ---------- RYSOWANIE EKRANU ----------
function drawScreen(t) {
    if (!S) return;
    const c = t.ctx, W2 = t.W, H2 = t.H, now = S.t, d = LV[TS.sel], secret = !!d.secret;
    const diff = secret ? 'normal' : getDiff(d.rec), nm = diff === 'nightmare';
    const dread = S.dread;
    // tło ekranu
    const bg = c.createRadialGradient(W2 / 2, H2 * 0.3, 40, W2 / 2, H2 * 0.4, W2 * 0.75); bg.addColorStop(0, '#1d0d09'); bg.addColorStop(0.62, '#0b0604'); bg.addColorStop(1, '#040302');
    c.fillStyle = bg; c.fillRect(0, 0, W2, H2);
    sp(c, 3);
    // nagłówek
    c.fillStyle = '#3a1812'; c.fillRect(0, 46, W2, 2);
    tx(c, 'BAGABOO', 30, 24, 28, BLOOD, 'left', MONO, 8); tx(c, 'VISITOR TERMINAL // LEVEL ACCESS // 03:07', 168, 24, 22, AMBD);
    tx(c, 'PRESENCE BEHIND TERMINAL', W2 - 150, 24, 20, AMBD, 'right'); tx(c, PROX[dread], W2 - 30, 24, 24, BLOOD, 'right', MONO, 8);
    // lista poziomów
    tx(c, '> SELECT A DOOR' + (Math.floor(now * 2) % 2 ? '_' : ' '), 30, 74, 20, AMBD);
    LV.forEach((l, i) => {
        const y = 92 + i * 41, on = TS.sel === i, hov = t.hover.has('row' + i);
        if (on || hov) { c.fillStyle = on ? 'rgba(255,59,42,0.17)' : 'rgba(255,59,42,0.08)'; c.fillRect(8, y, 372, 38); if (on) { c.strokeStyle = 'rgba(255,59,42,0.4)'; c.lineWidth = 1; c.strokeRect(8.5, y + 0.5, 371, 37); } }
        const col = on || hov ? '#f4e8d2' : (l.secret ? '#8a6a5a' : '#b8a78a');
        tx(c, on ? '>' : ' ', 22, y + 20, 24, BLOOD); tx(c, String(i + 1).padStart(2, '0'), 54, y + 20, 22, col); tx(c, l.label, 98, y + 20, 24, col, 'left', MONO, on ? 6 : 0);
        let pips = ''; if (l.secret) pips = '?????'; else for (let k = 0; k < 5; k++) pips += k < l.threat ? '|' : '.';
        tx(c, pips, 368, y + 20, 20, BLOOD, 'right');
        t.buttons.push({ id: 'row' + i, x: 8, y: y, w: 372, h: 38, action: () => pick(i) });
    });
    tx(c, '> MEMORY CHECK ........ OK', 30, 560 + 70, 19, AMBD); tx(c, '> VISITORS PRESENT .... 1', 30, 580 + 70, 19, AMBD); tx(c, '> VISITORS EXPECTED ... 0', 30, 600 + 70, 19, AMBD);
    c.fillStyle = '#3a1812'; c.fillRect(392, 48, 2, 640);
    // panel poziomu (w Nightmare lekko drży)
    c.save(); if (nm) c.translate(Math.sin(now * 38) > 0 ? 1.5 : 0, Math.sin(now * 29) > 0.4 ? -1 : 0);
    const X0 = 418, XR = W2 - 30;
    tx(c, 'ENTRY ' + String(TS.sel + 1).padStart(2, '0') + ' OF ' + LV.length + '  /  ' + d.type, X0, 74, 20, AMBD);
    drawEye(c, XR - 62, 82, t);
    // tytuł (kopie chromatyczne w Nightmare i krótkie zakłócenia co kilka sekund)
    const gl = Math.floor(now * 10) % 61 === 0 || nm;
    if (gl) { tx(c, d.label, X0 + 4, 150, 66, 'rgba(0,240,224,0.45)', 'left', SERIF); tx(c, d.label, X0 - 4, 150, 66, 'rgba(255,0,80,0.55)', 'left', SERIF); }
    tx(c, d.label, X0, 150, 66, '#efe3cc', 'left', SERIF, nm ? 26 : 18);
    tx(c, '“' + d.msg + '”', X0, 202, 27, AMB, 'left', ITAL);
    d.desc.forEach((line, k) => tx(c, line, X0, 244 + k * 30, 27, '#e0d2b8'));
    // zagrożenie i monitor tętna
    tx(c, 'THREAT', X0, 356, 22, AMBD);
    for (let k = 0; k < 5; k++) { c.fillStyle = k < d.threat ? (secret ? BONE : BLOOD) : '#3a1a16'; c.fillRect(X0 + 100 + k * 30, 348, 24, 15); }
    tx(c, secret ? 'UNKNOWN' : WORDS[d.threat], X0 + 270, 356, 22, BLOOD, 'left', MONO, 8);
    const bpm = Math.round(62 + d.threat * 13 + dread * 4 + (nm ? 16 : 0)), ecgCol = bpm > 140 ? BLOOD : AMB;
    const ex = 774, ey = 332, ew = 218, eh = 52;
    tx(c, 'VISITOR VITALS', ex + ew / 2, 322, 15, AMBD, 'center');
    c.fillStyle = 'rgba(255,180,84,0.05)'; c.fillRect(ex, ey, ew, eh); c.strokeStyle = '#4a2418'; c.lineWidth = 1; c.strokeRect(ex + 0.5, ey + 0.5, ew - 1, eh - 1);
    c.save(); c.beginPath(); c.rect(ex, ey, ew, eh); c.clip(); c.strokeStyle = ecgCol; c.lineWidth = 2.2; c.lineJoin = 'round'; c.beginPath();
    const off = (now * 200 * bpm / 60) % 200;
    for (let x = 0; x <= ew; x += 3) { const xp = (x + off) % 200; let y = 32; for (let k = 1; k < BEAT.length; k++) if (xp <= BEAT[k][0]) { const a = BEAT[k - 1], b = BEAT[k]; y = a[1] + (b[1] - a[1]) * (xp - a[0]) / (b[0] - a[0] || 1); break; } x ? c.lineTo(ex + x, ey + y * 0.85 + 4) : c.moveTo(ex + x, ey + y * 0.85 + 4); }
    c.stroke(); c.restore();
    tx(c, String(bpm), XR - 40, 356, 36, ecgCol, 'right', MONO, 8); tx(c, 'BPM', XR, 362, 17, ecgCol, 'right');
    // trudność, opis trudności i rekordy
    const df = DIFFS[diff];
    if (!secret) {
        DIFF_ORDER.forEach((id, k) => {
            const bx = X0 + k * 232, on = id === diff, q = DIFFS[id], hov = t.hover.has('diff-' + id);
            c.fillStyle = on ? q.color : (hov ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.04)'); c.fillRect(bx, 402, 222, 38);
            c.strokeStyle = on ? q.color : '#3a1812'; c.lineWidth = 2; c.strokeRect(bx + 1, 403, 220, 36);
            tx(c, q.name.toUpperCase(), bx + 111, 422, 24, on ? '#120403' : '#b8a78a', 'center');
            t.buttons.push({ id: 'diff-' + id, x: bx, y: 402, w: 222, h: 38, action: () => { setDiff(d.rec, id); t.dirty = true; } });
        });
        wrapText(df.info, 58).slice(0, 2).forEach((ln, k) => tx(c, ln, X0, 462 + k * 22, 20, df.color));
        const dl = d.daily && diff !== 'easy', dm = dl && dailyOn(d.rec);
        tx(c, diff === 'easy' ? 'BEST TIMES' : ((dm ? "TODAY'S BEST" : 'BEST TIMES') + ' (' + df.name.toUpperCase() + ')'), X0, 512, 20, AMBD);
        if (diff === 'easy') { tx(c, 'Easy runs are not ranked.', X0, 542, 22, '#9a8c78'); tx(c, 'Switch to Normal or Nightmare', X0, 568, 22, '#9a8c78'); tx(c, 'to set records and see your ghost.', X0, 594, 22, '#9a8c78'); }
        else {
            const top = topTimes(d.rec, diff, dm);
            if (!top.length) tx(c, dm ? 'Nobody has finished today.' : 'Not finished yet.', X0, 542, 22, '#9a8c78');
            top.slice(0, 3).forEach((s2, k) => tx(c, (k + 1) + '.  ' + mmss(s2), X0, 542 + k * 28, 25, k === 0 ? '#ffd27a' : '#d8c8ac'));
            if (top.length && (!d.daily || dm)) tx(c, 'Ghost of #1 runs with you', X0, 618, 17, '#7fe8ff');
        }
        if (d.daily) {   // Daily Run: ten sam układ dla wszystkich graczy w danym dniu
            const on = dl && dm, hov = t.hover.has('daily');
            c.fillStyle = on ? '#7fe8ff' : (hov ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.04)'); c.fillRect(808, 488, 300, 36);
            c.strokeStyle = on ? '#7fe8ff' : '#3a1812'; c.lineWidth = 2; c.strokeRect(809, 489, 298, 34);
            tx(c, diff === 'easy' ? 'DAILY RUN: not ranked' : (on ? 'DAILY RUN: ON' : 'DAILY RUN: off'), 958, 507, 21, on ? '#041418' : (diff === 'easy' ? '#6a5c4c' : '#b8a78a'), 'center');
            if (diff !== 'easy') t.buttons.push({ id: 'daily', x: 808, y: 488, w: 300, h: 36, action: () => { setDailyMode(d.rec, !dailyOn(d.rec)); t.dirty = true; } });
            if (dm) tx(c, 'Layout of ' + dailyDate() + ' (UTC)', 958, 540, 16, '#7fe8ff', 'center');
        }
    } else {
        tx(c, 'THIS DOOR HAS NO DIFFICULTY.', X0, 440, 25, '#ff6a52'); tx(c, 'NOBODY HAS FINISHED IT. NOBODY HAS RETURNED.', X0, 472, 21, AMBD);
        tx(c, 'BEST TIMES', X0, 520, 20, AMBD); for (let k = 0; k < 3; k++) tx(c, (k + 1) + '.  --:--', X0, 550 + k * 28, 25, '#8a7456');
    }
    // przycisk wejścia
    const hov = t.hover.has('enter'), bx = 808, by = 566, bw = 300, bh = 60;
    c.fillStyle = hov ? '#ff6a52' : BLOOD; c.shadowColor = BLOOD; c.shadowBlur = hov ? 30 : 18; c.fillRect(bx, by, bw, bh); c.shadowBlur = 0;
    tx(c, (secret ? 'KNOCK' : 'OPEN THE DOOR') + ' >', bx + bw / 2, by + bh / 2 + 1, 30, '#140503', 'center');
    t.buttons.push({ id: 'enter', x: bx, y: by, w: bw, h: bh, action: enter });
    if (S.entered && secret) tx(c, TS.knock >= 3 ? 'IT IS ALREADY OPEN.' : (TS.knock === 2 ? 'I TOLD YOU.' : 'SOMETHING KNOCKED BACK.'), bx + bw / 2, by + bh + 22, 19, '#ff6a52', 'center');
    c.restore();
    // pasek na dole: przewijany napis
    c.fillStyle = '#3a1812'; c.fillRect(0, 686, W2, 2);
    const tw = Math.max(1, c.measureText ? (c.font = '21px ' + MONO, c.measureText(TICKER).width) : 1500), tox = -((now * 55) % tw);
    for (let k = 0; k < 3; k++) tx(c, TICKER, tox + k * tw, 703, 21, '#b0261a', 'left');
    sp(c, 0);
    drawGlass(c, W2, H2, t);
}
// Oko patrzy za celownikiem gracza
function drawEye(c, cx, cy, t) {
    const p = t.pointer, tx0 = p ? p.x : cx - 60, ty0 = p ? p.y : cy + 30;
    const dx = Math.max(-18, Math.min(18, (tx0 - cx) * 0.08)), dy = Math.max(-8, Math.min(8, (ty0 - cy) * 0.08));
    const blink = Math.floor(S.t * 10) % 80 === 0 ? 0.12 : 1;
    c.save(); c.translate(cx, cy); c.scale(1, blink);
    c.beginPath(); c.moveTo(-62, 0); c.quadraticCurveTo(0, -48, 62, 0); c.quadraticCurveTo(0, 48, -62, 0); c.closePath(); c.fillStyle = BONE; c.fill();
    c.save(); c.clip(); c.fillStyle = '#9a0f06'; c.beginPath(); c.arc(dx, dy, 22, 0, 7); c.fill(); c.fillStyle = '#050202'; c.beginPath(); c.arc(dx, dy, 10, 0, 7); c.fill();
    c.fillStyle = '#fff4e4'; c.beginPath(); c.arc(dx - 6, dy - 7, 3.4, 0, 7); c.fill(); c.restore();
    c.strokeStyle = BLOOD; c.lineWidth = 2.5; c.beginPath(); c.moveTo(-62, 0); c.quadraticCurveTo(0, -48, 62, 0); c.quadraticCurveTo(0, 48, -62, 0); c.closePath(); c.stroke();
    c.restore();
}
// Warstwa "szkła": postać w odbiciu, szepty, ziarno, linie skanowania, błysk, zaciemnienie
function drawGlass(c, W2, H2, t) {
    const dread = S.dread, s = 0.5 + dread * 0.13, a = 0.1 + dread * 0.075, bl = Math.max(0, 5 - dread) * 1.2 + 0.4;
    c.save(); c.translate(W2 * 0.58, H2 + 24); c.scale(s * 0.9, s * 0.9); c.globalAlpha = a;
    if (!IS_QUEST) c.filter = 'blur(' + bl.toFixed(1) + 'px)';
    c.fillStyle = '#000';
    c.beginPath(); c.moveTo(-144, 0); c.bezierCurveTo(-136, -112, -70, -148, -30, -158); c.lineTo(30, -158); c.bezierCurveTo(70, -148, 136, -112, 144, 0); c.closePath(); c.fill();
    c.fillRect(-22, -194, 44, 50); c.beginPath(); c.ellipse(0, -254, 56, 70, 0, 0, 7); c.fill();
    c.beginPath(); c.moveTo(-58, -270); c.bezierCurveTo(-70, -210, -66, -140, -44, -98); c.bezierCurveTo(-52, -160, -48, -210, -38, -254); c.fill();
    c.beginPath(); c.moveTo(58, -270); c.bezierCurveTo(70, -210, 66, -140, 44, -98); c.bezierCurveTo(52, -160, 48, -210, 38, -254); c.fill();
    c.strokeStyle = 'rgba(255,196,150,0.2)'; c.lineWidth = 3; c.beginPath(); c.moveTo(-52, -284); c.bezierCurveTo(-38, -332, 38, -332, 52, -284); c.stroke();
    const eo = dread >= 4 ? 0.9 : (dread === 3 ? 0.3 : 0);
    if (eo) { c.filter = 'none'; c.globalAlpha = Math.min(1, a * 2) * eo; c.fillStyle = '#fff4e4'; c.beginPath(); c.ellipse(-22, -248, 7, 5, 0, 0, 7); c.ellipse(22, -248, 7, 5, 0, 0, 7); c.fill(); }
    c.restore(); c.filter = 'none'; c.globalAlpha = 1;
    if (dread >= 3 && S.blackT <= 0) { c.save(); c.translate(W2 - 70, H2 - 96); c.rotate(-0.052); tx(c, WHISPERS[Math.floor(S.t / 6) % WHISPERS.length], 0, 0, 30, 'rgba(255,70,50,0.6)', 'right', ITAL); c.restore(); }
    // ziarno, skanowanie, winieta, błysk lampy
    if (noise) { c.save(); c.globalCompositeOperation = 'overlay'; c.fillStyle = c.createPattern(noise, 'repeat'); c.translate(-Math.floor(Math.random() * 128), -Math.floor(Math.random() * 128)); c.fillRect(0, 0, W2 + 128, H2 + 128); c.restore(); }
    if (overlay) c.drawImage(overlay, 0, 0);
    if (S.flick > 0) { c.fillStyle = 'rgba(255,40,16,' + (0.1 * S.flick).toFixed(2) + ')'; c.fillRect(0, 0, W2, H2); }
    const g = c.createLinearGradient(0, 0, W2 * 0.5, H2 * 0.7); g.addColorStop(0, 'rgba(255,245,230,0.12)'); g.addColorStop(0.45, 'rgba(255,245,230,0)'); c.fillStyle = g; c.fillRect(0, 0, W2, H2);
    // jednorazowe zaciemnienie: dwoje oczu i napis
    if (S.blackT > 0) {
        const al = Math.min(1, S.blackT / 0.5, (2.6 - S.blackT + 0.6) / 0.6); c.globalAlpha = Math.max(0, Math.min(1, al)); c.fillStyle = '#030201'; c.fillRect(0, 0, W2, H2);
        c.fillStyle = '#fff4e4'; c.beginPath(); c.ellipse(W2 / 2 - 70, H2 / 2 - 40, 34, 20, 0, 0, 7); c.ellipse(W2 / 2 + 70, H2 / 2 - 40, 34, 20, 0, 0, 7); c.fill();
        c.fillStyle = '#000'; c.beginPath(); c.arc(W2 / 2 - 70, H2 / 2 - 40, 7, 0, 7); c.arc(W2 / 2 + 70, H2 / 2 - 40, 7, 0, 7); c.fill();
        sp(c, 6); tx(c, 'I SEE YOU.', W2 / 2, H2 / 2 + 50, 58, BONE, 'center', SERIF); sp(c, 0); c.globalAlpha = 1;
    }
}

export function build() {
    L.spawn = info.spawn.slice();
    L.bounds = { minX: -W + 0.3, maxX: W - 0.3, minZ: -D + 1.5, maxZ: D - 0.3, maxY: H - 0.3 };
    S = { lights: [], t: 0, dread: 1, blackT: 0, scared: false, flick: 0, redraw: 0, entered: false, leaving: false, ctx: null, scare: createJumpscare({ seed: 666 }) };
    if (TS.last !== undefined) { TS.sel = TS.last; TS.last = undefined; }
    addCrispBlock(0, -0.5, 0, W * 2 + 2, 1, D * 2 + 2, 0x8a7a70, 0x1a1010, tex.floor, { rough: tex.floorRough });
    addCrispBlock(0, H + 0.5, 0, W * 2 + 2, 1, D * 2 + 2, 0x4a3c3e, 0x1a1010);
    for (const [x, z, w, d] of [[0, -D - 0.5, W * 2 + 2, 1], [0, D + 0.5, W * 2 + 2, 1], [-W - 0.5, 0, 1, D * 2], [W + 0.5, 0, 1, D * 2]]) addCrispBlock(x, H / 2, z, w, H, d, 0x7a6a68, 0x1a1010, tex.wall);
    // Czerwony chodnik od wejścia do terminala
    const rug = new THREE.Mesh(new THREE.PlaneGeometry(2.4, D * 2 - 3), new THREE.MeshStandardMaterial({ color: 0x5a0a10, roughness: 0.95 }));
    rug.rotation.x = -Math.PI / 2; rug.position.set(0, 0.01, 1.2); L.root.add(rug);
    // Napis nad terminalem
    const tc = T.makeCanvas(1024, 160), tcx = tc.getContext('2d');
    tcx.textAlign = 'center'; tcx.textBaseline = 'middle'; tcx.font = '120px Creepster, serif';
    tcx.shadowColor = '#ff2a10'; tcx.shadowBlur = 30; tcx.fillStyle = '#e8d0c0'; tcx.fillText('LEVELS', 512, 86);
    const title = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 0.69), new THREE.MeshBasicMaterial({ map: T.toTex(tc, false), transparent: true, toneMapped: false }));
    title.position.set(0, 5.35, -D + 0.06); L.root.add(title);
    // Terminal: obudowa, ekran, pulpit z przodu (nie da się podejść do ekranu bliżej niż ok. 1,5 m)
    addCrispBlock(0, 2.65, -D + 0.18, 5.5, 3.55, 0.36, 0x14100e, 0x2a1a14);
    ensureAssets(1152, 720);
    if (!term) term = new Terminal(drawScreen, 1152, 720);
    term.state = {}; term.dirty = true;
    const screen = term.createMesh(4.8, 3.0); screen.position.set(0, 2.65, -D + 0.37); L.root.add(screen);
    addCrispBlock(0, 0.45, -D + 1.0, 6.2, 0.9, 1.2, 0x2a1a14, 0x100808);
    const glow = new THREE.PointLight(0xff3020, 18, 11, 1.8); glow.position.set(0, 2.4, -D + 2.2); L.root.add(glow); S.glow = glow;
    for (const f of ['24px VT323', '24px "IM Fell English SC"', 'italic 24px "IM Fell English"']) { try { document.fonts.load(f).then(() => { if (term) term.dirty = true; }); } catch (e) { /* bez czcionek: Courier */ } }
    buildWarnings();
    buildDoor({ x: 0, z: D - 0.03, rotY: Math.PI, label: 'LOBBY', color: '#ffd27a', wood: 0x4a3a30, portal: { target: 'lobby', spawn: ARRIVAL_LEVELS, onEnter: () => toast('Back to the lobby') } });
    // Migoczące świece i lampy
    for (const [x, z] of [[-8, 4], [8, 4], [-8, -1], [8, -1], [-5, 2], [5, 2]]) {
        const l = new THREE.PointLight(0xffa060, 12, 11, 1.6); l.position.set(x, 3.6, z); L.root.add(l); S.lights.push({ l: l, base: 12, ph: Math.random() * 9 });
        const f = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex.dot, color: 0xffb060, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); f.scale.set(0.5, 0.5, 1); f.position.set(x, 3.6, z); L.root.add(f);
    }
}
// Czaszki na ścianach i ostrzeżenia namalowane czerwoną farbą
function skullTexture(seed) {
    const c = T.makeCanvas(256, 256), x = c.getContext('2d'), R = T.mkRng(seed);
    x.clearRect(0, 0, 256, 256);
    x.fillStyle = '#e8dcc4'; x.beginPath(); x.ellipse(128, 104, 78, 82, 0, 0, 7); x.fill();
    x.beginPath(); x.roundRect(78, 150, 100, 62, 14); x.fill();
    x.fillStyle = '#120808'; for (const ex of [96, 160]) { x.beginPath(); x.ellipse(ex, 110, 22, 26, ex < 128 ? 0.2 : -0.2, 0, 7); x.fill(); }
    x.beginPath(); x.moveTo(128, 136); x.lineTo(116, 160); x.lineTo(140, 160); x.closePath(); x.fill();
    for (let i = 0; i < 6; i++) x.fillRect(88 + i * 14, 176, 8, 26);
    x.strokeStyle = 'rgba(60,40,30,0.8)'; x.lineWidth = 2; x.beginPath(); x.moveTo(128, 24); for (let k = 0; k < 5; k++) x.lineTo(118 + R() * 30, 36 + k * 14); x.stroke();
    x.fillStyle = 'rgba(120,0,0,0.75)'; for (let i = 0; i < 4; i++) { const sx = 80 + R() * 100; x.fillRect(sx, 200, 4 + R() * 4, 20 + R() * 40); }
    return T.toTex(c, false);
}
function warningTexture(text, w, h, size) {
    const c = T.makeCanvas(w, h), x = c.getContext('2d'), R = T.mkRng(text.length * 31);
    x.clearRect(0, 0, w, h);
    x.font = 'bold ' + size + 'px Creepster, serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.shadowColor = '#ff0000'; x.shadowBlur = 14; x.fillStyle = '#9a0808'; x.fillText(text, w / 2, h / 2);
    x.shadowBlur = 0; x.fillStyle = 'rgba(140,8,8,0.85)';
    const tw = x.measureText(text).width;
    for (let i = 0; i < text.length * 2; i++) x.fillRect(w / 2 - tw / 2 + R() * tw, h / 2 + size * 0.3, 3 + R() * 3, 10 + R() * size * 0.5);   // ściekająca farba
    return T.toTex(c, false);
}
function buildWarnings() {
    const decal = (map, w, h, x, y, z, ry) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: map, transparent: true, roughness: 0.8, polygonOffset: true, polygonOffsetFactor: -2 })); m.position.set(x, y, z); m.rotation.y = ry; L.root.add(m); return m; };
    // Czaszki na ścianach bocznych i napisy ostrzegawcze
    for (const z of [-3.5, 0.5, 4.5]) { decal(skullTexture(z * 7 + 3), 1.1, 1.1, -W + 0.05, 3.6, z, Math.PI / 2); decal(skullTexture(z * 9 + 5), 1.1, 1.1, W - 0.05, 3.6, z, -Math.PI / 2); }
    decal(warningTexture('ENTER AT YOUR OWN RISK', 1024, 160, 88), 6, 0.94, -W + 0.06, 2.0, 0.5, Math.PI / 2);
    decal(warningTexture('NO ONE CAME BACK', 1024, 160, 96), 5, 0.78, W - 0.06, 2.0, 0.5, -Math.PI / 2);
    decal(warningTexture('TURN BACK NOW', 1024, 160, 96), 5, 0.78, 0, 4.4, D - 0.06, Math.PI);
    decal(warningTexture('THEY ARE WATCHING YOU', 1024, 160, 80), 4.2, 0.66, -6, 1.6, D - 0.06, Math.PI);
    decal(warningTexture('YOU HAVE BEEN WARNED', 1024, 160, 80), 4.2, 0.66, 6, 1.6, D - 0.06, Math.PI);
}
export function update(dt, t, ctx) {
    if (!S) return;
    S.ctx = ctx; S.t += dt; S.scare.update(dt);
    for (const l of S.lights) l.l.intensity = l.base * (0.75 + 0.25 * Math.sin(t * 9 + l.ph) * Math.sin(t * 4.3 + l.ph));
    S.glow.intensity = 18 * (0.7 + 0.3 * Math.sin(t * 6.1) * Math.sin(t * 2.3));
    // Postać w szkle podchodzi co 12 s; na końcu jednorazowe zaciemnienie, potem się cofa
    const dread = Math.min(5, 1 + Math.floor(S.t / 12));
    if (dread !== S.dread && S.blackT <= 0) {
        S.dread = dread;
        if (dread >= 5 && !S.scared) { S.scared = true; S.blackT = 2.6; SFX.stinger({ x: 0, y: 1.6, z: -D + 0.5 }); }
    }
    if (S.blackT > 0) { S.blackT -= dt; if (S.blackT <= 0) { S.blackT = 0; S.t = 24; S.dread = 3; } }
    S.flick = Math.random() < dt * 0.25 ? 1 : Math.max(0, S.flick - dt * 4);
    S.redraw -= dt;
    if (S.redraw <= 0) { S.redraw = IS_QUEST ? 0.4 : 0.2; if (term) term.dirty = true; }
}
export function dispose() { if (S) S.scare.dispose(); S = null; }
export const debug = () => S ? { sel: TS.sel, dread: S.dread, knocks: TS.knock, leaving: S.leaving, buttons: term ? term.buttons.map(b => b.id) : [], levels: LV.map(l => l.target || null) } : null;   // dla testów
export const _press = (id) => { const b = term && term.buttons.find(x => x.id === id); if (b) b.action(); return !!b; };   // dla testów
