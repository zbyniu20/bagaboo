// ==========================================
// POKÓJ "LEVELS": jeden terminal zamiast drzwi
// Na północnej ścianie stoi duży, nawiedzony terminal: lista poziomów (The Maze ... The Hotel i ukryte LAB), opis, zagrożenie,
// wybór trudności (Easy / Normal / Nightmare), Daily Run, prawdziwe rekordy i duch #1, przycisk OPEN THE DOOR.
// Wybór klikasz celownikiem / laserem. Drzwi LOBBY z tyłu wracają do lobby. Po wyjściu z poziomu lądujesz przed terminalem.
// Dodatki grozy: oko śledzi celownik, monitor tętna reaguje na zagrożenie, w szkle stoi postać, która z czasem podchodzi bliżej.
// Nowy poziom: dopisz go do LV poniżej (oraz do core/registry.js).
// ==========================================
import { THREE, L, tex, addCrispBlock } from '../core/engine.js';
import * as T from '../core/textures.js';
import { DIFFS, DIFF_ORDER, getDiff, setDiff, topTimes, dailyOn, setDailyMode, dailyDate } from '../core/economy.js';
import { Terminal, toast, wrapText } from '../core/terminal.js';
import { buildDoor, createJumpscare } from '../core/levelkit.js';
import * as SFX from '../core/audio.js';
import { PROX, TICKER, MONO, SERIF, ITAL, BONE, BLOOD, AMB, AMBD, mmss, visitorsHere, ensureAssets, sp, tx, drawGlass, addComputers, stepDread, drawCard } from '../core/hauntedui.js';
import { IS_QUEST } from '../core/device.js';
import { CARDS } from '../core/levelcards.js';
import { ARRIVAL_LEVELS } from './lobby-door.js';

const W = 10, D = 7, H = 6;   // sala 20 x 14 m, terminal na północnej ścianie
export const info = { id: 'levels', name: 'Levels', spawn: [0, 1.0, 5.2] };
// Po powrocie z poziomu stajesz przed terminalem (wszystkie poziomy wracają w to samo miejsce)
const AR = [0, 1.2, -3.3];
export const ARRIVAL_FROM_MAZE = AR, ARRIVAL_FROM_SILENCE = AR, ARRIVAL_FROM_WELL = AR, ARRIVAL_FROM_LAUNDRY = AR, ARRIVAL_FROM_MEMORY = AR, ARRIVAL_FROM_HOSPITAL = AR,
    ARRIVAL_FROM_CEMETERY = AR, ARRIVAL_FROM_CATACOMBS = AR, ARRIVAL_FROM_NURSERY = AR, ARRIVAL_FROM_HOTEL = AR, ARRIVAL_FROM_FURAS = AR, ARRIVAL_FROM_ROOM000 = AR;

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
    { target: 'hotel', rec: 'hotel', label: 'THE HOTEL', type: 'SURVIVAL', threat: 5, msg: 'Do not stop. Hide when the lights flicker...', desc: ['Open 100 doors. Find 3 keys in', 'the key halls, hide in wardrobes.', 'Door 50: a blind monster hears you.'] },
    { target: 'furas', rec: 'furas', label: 'THE FUR DEN', type: 'CHASE', threat: 5, msg: 'Something soft is purring in the dark...', desc: ['Find 4 golden fish.', 'FURAS hunts you: fluffy tail,', 'a mouth full of teeth. Dodge the pounce!'] },
    { target: 'room000', rec: 'room000', label: 'ROOM 000', type: 'HORROR', threat: 5, msg: 'Do not open the cell doors...', desc: ['Find 3 books, a pistol and a knife.', 'An abandoned prison, almost no light.', 'A white ghost hunts you.'] },
    { secret: true, label: 'LAB', type: 'UNKNOWN', threat: 5, msg: 'It was never on the list.', desc: ['No one has opened this door.', 'It opens from the other side.', 'Do not knock twice.'] }
];
// Stanowiska terminala: x, z, obrót ekranu (rotY=0: patrzy na +z, czyli z północnej ściany do wnętrza; pi/2: z zachodniej ściany; -pi/2: ze wschodniej)
const STATIONS = [-8, -4, 0, 4, 8].map(x => ({ x: x, z: -5.0, rotY: 0 }));   // pięć komputerów w rzędzie (jak w lobby), gracze stoją od strony południowej
const WORDS = ['', 'FAINT', 'LOW', 'HIGH', 'SEVERE', 'LETHAL'];

// Stan wyboru przeżywa przejścia między poziomami (zapamiętujemy ostatnio wybrany poziom)
const TS = { sel: 9, knock: 0 };
let term = null;
let S = null;


// Wybrany poziom, wejście i pukanie do ukrytych drzwi
function pick(i) { TS.sel = i; S.entered = false; term.dirty = true; S.wallDirty = true; }
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
    // lista poziomów na CAŁY ekran terminala: duże nazwy; opis poziomu jest tylko na ekranie nad terminalami (drawWall)
    const RH = 38, LY = 68;   // 13 wierszy (z ukrytym LAB) mieści się nad paskiem trudności
    tx(c, '> SELECT A DOOR' + (Math.floor(now * 2) % 2 ? '_' : ' '), 30, 58, 20, AMBD);
    const gl = Math.floor(now * 10) % 61 === 0 || nm;   // kopie chromatyczne wybranej nazwy w Nightmare i krótkie zakłócenia co kilka sekund
    LV.forEach((l, i) => {
        const y = LY + i * RH, cy = y + RH / 2, on = TS.sel === i, hov = t.hover.has('row' + i);
        if (on || hov) { c.fillStyle = on ? 'rgba(255,59,42,0.17)' : 'rgba(255,59,42,0.08)'; c.fillRect(10, y, W2 - 20, RH - 4); if (on) { c.strokeStyle = 'rgba(255,59,42,0.4)'; c.lineWidth = 1; c.strokeRect(10.5, y + 0.5, W2 - 21, RH - 5); } }
        const col = on || hov ? '#f4e8d2' : (l.secret ? '#8a6a5a' : '#b8a78a');
        tx(c, on ? '>' : ' ', 28, cy, 34, BLOOD); tx(c, String(i + 1).padStart(2, '0'), 66, cy, 30, col);
        if (on && gl) { tx(c, l.label, 154, cy, 36, 'rgba(0,240,224,0.45)', 'left', MONO); tx(c, l.label, 146, cy, 36, 'rgba(255,0,80,0.55)', 'left', MONO); }
        tx(c, l.label, 150, cy, 36, col, 'left', MONO, on ? 6 : 0);
        tx(c, l.type, 640, cy, 24, on ? AMB : AMBD, 'left');
        let pips = ''; if (l.secret) pips = '?????'; else for (let k = 0; k < 5; k++) pips += k < l.threat ? '|' : '.';
        tx(c, pips, W2 - 34, cy, 32, BLOOD, 'right');
        t.buttons.push({ id: 'row' + i, x: 10, y: y, w: W2 - 20, h: RH - 4, action: () => pick(i) });
    });
    // dolny pasek: trudność, Daily Run, rekordy i wejście (opis poziomu jest na ekranie nad terminalami)
    c.save(); if (nm) c.translate(Math.sin(now * 38) > 0 ? 1.5 : 0, Math.sin(now * 29) > 0.4 ? -1 : 0);
    c.fillStyle = '#3a1812'; c.fillRect(0, 572, W2, 2);
    const df = DIFFS[diff], X0 = 14, XR = W2 - 14;
    if (!secret) {
        DIFF_ORDER.forEach((id, k) => {
            const bx = X0 + k * 208, on = id === diff, q = DIFFS[id], hov = t.hover.has('diff-' + id);
            c.fillStyle = on ? q.color : (hov ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.04)'); c.fillRect(bx, 580, 200, 34);
            c.strokeStyle = on ? q.color : '#3a1812'; c.lineWidth = 2; c.strokeRect(bx + 1, 581, 198, 32);
            tx(c, q.name.toUpperCase(), bx + 100, 597, 22, on ? '#120403' : '#b8a78a', 'center');
            t.buttons.push({ id: 'diff-' + id, x: bx, y: 580, w: 200, h: 34, action: () => { setDiff(d.rec, id); t.dirty = true; } });
        });
        const dl = d.daily && diff !== 'easy', dm = dl && dailyOn(d.rec);
        if (d.daily) {   // Daily Run: ten sam układ dla wszystkich graczy w danym dniu
            const on = dl && dm, hov = t.hover.has('daily');
            c.fillStyle = on ? '#7fe8ff' : (hov ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.04)'); c.fillRect(660, 580, XR - 660, 34);
            c.strokeStyle = on ? '#7fe8ff' : '#3a1812'; c.lineWidth = 2; c.strokeRect(661, 581, XR - 662, 32);
            tx(c, diff === 'easy' ? 'DAILY RUN: not ranked' : (on ? 'DAILY RUN: ON ' + dailyDate() : 'DAILY RUN: off'), (660 + XR) / 2, 597, 21, on ? '#041418' : (diff === 'easy' ? '#6a5c4c' : '#b8a78a'), 'center');
            if (diff !== 'easy') t.buttons.push({ id: 'daily', x: 660, y: 580, w: XR - 660, h: 34, action: () => { setDailyMode(d.rec, !dailyOn(d.rec)); t.dirty = true; } });
        }
        tx(c, diff === 'easy' ? 'BEST TIMES' : ((dm ? "TODAY'S BEST" : 'BEST TIMES') + ' (' + df.name.toUpperCase() + ')'), X0, 634, 17, AMBD);
        if (diff === 'easy') tx(c, 'Easy runs are not ranked.', X0, 660, 20, '#9a8c78');
        else {
            const top = topTimes(d.rec, diff, dm);
            if (!top.length) tx(c, dm ? 'Nobody has finished today.' : 'Not finished yet.', X0, 660, 20, '#9a8c78');
            top.slice(0, 3).forEach((s2, k) => tx(c, (k + 1) + '. ' + mmss(s2), X0 + k * 126, 660, 20, k === 0 ? '#ffd27a' : '#d8c8ac'));
            if (top.length && (!d.daily || dm)) tx(c, 'Ghost of #1 runs with you', X0 + 390, 660, 15, '#7fe8ff');
        }
    } else {
        tx(c, S.entered ? (TS.knock >= 3 ? 'IT IS ALREADY OPEN.' : (TS.knock === 2 ? 'I TOLD YOU.' : 'SOMETHING KNOCKED BACK.')) : 'THIS DOOR HAS NO DIFFICULTY.', X0, 597, 22, '#ff6a52');
        tx(c, 'BEST TIMES', X0, 634, 17, AMBD); for (let k = 0; k < 3; k++) tx(c, (k + 1) + '. --:--', X0 + k * 126, 660, 20, '#8a7456');
    }
    // przycisk wejścia
    const hov = t.hover.has('enter'), bx = 600, by = 622, bw = XR - 600, bh = 54;
    c.fillStyle = hov ? '#ff6a52' : BLOOD; c.shadowColor = BLOOD; c.shadowBlur = hov ? 30 : 18; c.fillRect(bx, by, bw, bh); c.shadowBlur = 0;
    tx(c, (secret ? 'KNOCK' : 'OPEN THE DOOR') + ' >', bx + bw / 2, by + bh / 2 + 1, 30, '#140503', 'center');
    t.buttons.push({ id: 'enter', x: bx, y: by, w: bw, h: bh, action: enter });
    c.restore();
    // pasek na dole: przewijany napis
    c.fillStyle = '#3a1812'; c.fillRect(0, 686, W2, 2);
    const tw = Math.max(1, c.measureText ? (c.font = '21px ' + MONO, c.measureText(TICKER).width) : 1500), tox = -((now * 55) % tw);
    for (let k = 0; k < 3; k++) tx(c, TICKER, tox + k * tw, 703, 21, '#b0261a', 'left');
    sp(c, 0);
    drawGlass(c, W2, H2, t, S);
}
// ---------- EKRANY NA ŚCIANIE: opis wybranego poziomu nad każdym terminalem (ten na terminalu jest za mały, żeby go przeczytać) ----------
const WALL_W = 1280, WALL_H = 720;
function drawWall() {
    const w = S && S.wall; if (!w) return;
    const c = w.ctx, d = LV[TS.sel], secret = !!d.secret, card = CARDS[secret ? 'lab' : d.target];
    const bg = c.createRadialGradient(WALL_W / 2, WALL_H * 0.35, 40, WALL_W / 2, WALL_H * 0.45, WALL_W * 0.75); bg.addColorStop(0, '#1d0d09'); bg.addColorStop(0.62, '#0b0604'); bg.addColorStop(1, '#040302');
    c.fillStyle = bg; c.fillRect(0, 0, WALL_W, WALL_H);
    c.strokeStyle = '#6a1a12'; c.lineWidth = 6; c.strokeRect(10, 10, WALL_W - 20, WALL_H - 20);
    sp(c, 3);
    tx(c, d.label, 50, 66, 74, '#efe3cc', 'left', SERIF, 18);
    tx(c, d.type, WALL_W - 50, 40, 28, AMBD, 'right');
    for (let k = 0; k < 5; k++) { c.fillStyle = k < d.threat ? (secret ? BONE : BLOOD) : '#3a1a16'; c.fillRect(WALL_W - 50 - 5 * 34 + k * 34, 62, 28, 18); }
    tx(c, secret ? 'UNKNOWN' : WORDS[d.threat], WALL_W - 50, 102, 24, BLOOD, 'right', MONO, 8);
    tx(c, '“' + d.msg + '”', 50, 130, 34, AMB, 'left', ITAL);
    c.fillStyle = '#3a1812'; c.fillRect(50, 158, WALL_W - 100, 2);
    drawCard(c, card, 50, 190, WALL_H - 14, AMB, 1.5);
    sp(c, 0);
    w.tex.needsUpdate = true;
}
function buildWallScreens() {
    const cv = T.makeCanvas(WALL_W, WALL_H);
    S.wall = { ctx: cv.getContext('2d'), tex: T.toTex(cv, false) };
    const sw = 3.6, sh = sw * WALL_H / WALL_W, y = 3.0;   // 3,6 x 2,0 m: pięć ekranów co 4 m, nad niskimi terminalami (do ok. 1,3 m), pod napisem LEVELS
    for (const st of STATIONS) {
        const frame = new THREE.Mesh(new THREE.BoxGeometry(sw + 0.18, sh + 0.18, 0.06), new THREE.MeshStandardMaterial({ color: 0x120808, metalness: 0.6, roughness: 0.5 }));
        frame.position.set(st.x, y, -D + 0.03); L.root.add(frame);
        const scr = new THREE.Mesh(new THREE.PlaneGeometry(sw, sh), new THREE.MeshBasicMaterial({ map: S.wall.tex, toneMapped: false }));
        scr.position.set(st.x, y, -D + 0.07); L.root.add(scr);
    }
    drawWall();
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
    // Stanowiska: ten sam terminal na kilku ekranach (jedno płótno), żeby wszyscy gracze z sesji mogli wybierać naraz bez tłoku.
    // Każdy gracz ma własny wybór (stan jest u niego lokalnie), a ekrany pokazują ten sam widok. Obudowa i pulpit są kolizyjne:
    // do ekranu nie podejdziesz bliżej niż ok. 1,5 m.
    ensureAssets(1152, 720);
    if (!term) term = new Terminal(drawScreen, 1152, 720);
    term.state = {}; term.dirty = true;
    addComputers(term, STATIONS, { label: 'TERMINAL' });
    const glow = new THREE.PointLight(0xff3020, 18, 11, 1.8); glow.position.set(0, 2.4, -D + 2.2); L.root.add(glow); S.glow = glow;
    buildWallScreens();
    for (const f of ['24px VT323', '24px "IM Fell English SC"', 'italic 24px "IM Fell English"']) { try { document.fonts.load(f).then(() => { if (term) term.dirty = true; if (S) S.wallDirty = true; }); } catch (e) { /* bez czcionek: Courier */ } }
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
    for (const z of [3.2, 5.6]) { decal(skullTexture(z * 7 + 3), 1.1, 1.1, -W + 0.05, 3.6, z, Math.PI / 2); decal(skullTexture(z * 9 + 5), 1.1, 1.1, W - 0.05, 3.6, z, -Math.PI / 2); }   // na bocznych ścianach tylko z tyłu: z przodu stoją ekrany
    decal(warningTexture('ENTER AT YOUR OWN RISK', 1024, 160, 88), 6, 0.94, -6.5, 3.6, D - 0.06, Math.PI);
    decal(warningTexture('NO ONE CAME BACK', 1024, 160, 96), 5, 0.78, 6.5, 3.6, D - 0.06, Math.PI);
    decal(warningTexture('TURN BACK NOW', 1024, 160, 96), 5, 0.78, 0, 4.4, D - 0.06, Math.PI);
    decal(warningTexture('THEY ARE WATCHING YOU', 1024, 160, 80), 4.2, 0.66, -6, 1.6, D - 0.06, Math.PI);
    decal(warningTexture('YOU HAVE BEEN WARNED', 1024, 160, 80), 4.2, 0.66, 6, 1.6, D - 0.06, Math.PI);
}
export function update(dt, t, ctx) {
    if (!S) return;
    S.ctx = ctx; S.scare.update(dt);
    for (const l of S.lights) l.l.intensity = l.base * (0.75 + 0.25 * Math.sin(t * 9 + l.ph) * Math.sin(t * 4.3 + l.ph));
    S.glow.intensity = 18 * (0.7 + 0.3 * Math.sin(t * 6.1) * Math.sin(t * 2.3));
    // Postać w szkle podchodzi co 12 s; na końcu jednorazowe zaciemnienie, potem się cofa
    stepDread(S, dt, () => SFX.stinger({ x: 0, y: 1.6, z: -D + 0.5 }));
    S.redraw -= dt;
    if (S.redraw <= 0) { S.redraw = IS_QUEST ? 0.4 : 0.2; if (term) term.dirty = true; }
    if (S.wallDirty) { S.wallDirty = false; drawWall(); }   // ekrany na ścianie rysujemy tylko po zmianie wyboru
}
export function dispose() { if (S) S.scare.dispose(); S = null; }
export const debug = () => S ? { screens: term && term.meshes ? term.meshes.length : 0, visitors: visitorsHere('levels'), sel: TS.sel, dread: S.dread, knocks: TS.knock, leaving: S.leaving, buttons: term ? term.buttons.map(b => b.id) : [], levels: LV.map(l => l.target || null) } : null;   // dla testów
export const _press = (id) => { const b = term && term.buttons.find(x => x.id === id); if (b) b.action(); return !!b; };   // dla testów
