// ==========================================
// SALON "BAGABOO GAMES": hub z trzema skrzydłami, tryby pogrupowane tematycznie
//  - ZACHÓD  RACE & SKILL  (pomarańczowy): Floor is Lava, Parkour Race, Last Tile, Red Light Green Light, Shooting Range
//  - PÓŁNOC  PARTY GAMES   (różowy):       Hide and Seek, Infection, Hot Potato, Treasure Hunt, Become the Monster
//  - WSCHÓD  TEAM GAMES    (błękitny):     Capture the Banana, King of the Hill, Dodgeball
// Tryby wybiera się na terminalach albo wchodzi się do nich drzwiami na ścianach kategorii (nazwa trybu nad drzwiami). Drzwi LOBBY (południe) wracają do lobby, a każdy tryb ma własne drzwi powrotne do tego salonu.
// Wokół kuli stoi 6 komputerów jak w lobby (tak samo jak w sali Levels): zakładki RACE / PARTY / TEAM, lista trybów, karta, rekordy, PLAY.
// Każdy gracz wybiera u siebie niezależnie; terminal działa tak samo jak w sali Levels (core/hauntedui.js).
// Nowy tryb: dopisz wpis do MODES (kategoria, nazwa, opis), export ARRIVAL_FROM_* niżej, a w trybie zrób drzwi powrotne (portal do 'games' ze spawn: ARRIVAL_FROM_*).
// ==========================================
import { THREE, L, tex, addCrispBlock } from '../core/engine.js';
import * as T from '../core/textures.js';
import { Terminal, toast } from '../core/terminal.js';
import { buildDoor } from '../core/levelkit.js';
import { SAVE, getDiff, topTimes } from '../core/economy.js';
import { LEVEL_BY_ID } from '../core/registry.js';
import { CARDS } from '../core/levelcards.js';
import { IS_QUEST } from '../core/device.js';
import { PROX, TICKER, MONO, SERIF, ITAL, BONE, BLOOD, AMB, AMBD, mmss, visitorsHere, ensureAssets, sp, tx, drawEcg, drawEye, drawGlass, addComputers, makeDread, stepDread, drawCard } from '../core/hauntedui.js';
import { ARRIVAL_GAMES } from './lobby-door.js';
import { LOBBY_MOVE_SCALE } from '../core/config.js';

const W = 15, D = 15, H = 6;          // sala 30 x 30 m
export const info = { id: 'games', name: 'BagaBoo Games', spawn: [0, 1.0, 11] };

const CATS = {
    race: { title: 'RACE & SKILL', sub: 'Beat the clock and the course', color: '#ff9a4a', hex: 0xff7a20 },
    party: { title: 'PARTY GAMES', sub: 'Chaos for everyone', color: '#ff7aff', hex: 0xff3aff },
    team: { title: 'TEAM GAMES', sub: 'Win together', color: '#6ad0ff', hex: 0x30a0ff }
};
// Kolejność w kategorii = kolejność na liście terminala
const MODES = [
    { cat: 'race', label: 'FLOOR IS LAVA', color: '#ff8a3a', glow: 0xff5a10, target: 'lava', desc: ['Do not touch the floor.', 'Heavy jumps, sinking platforms,', 'ropes and rising lava.', 'Solo or with friends.'] },
    { cat: 'race', label: 'PARKOUR RACE', color: '#ff7ac0', glow: 0xff3aa0, target: 'race', desc: ['Race over the void.', 'First to the finish wins', '200 Bagabucks.', 'Solo: beat the par time.'] },
    { cat: 'race', label: 'SWING RUN', color: '#ffb060', glow: 0xff8a30, target: 'swingrun', desc: ['Cross the chasm on ropes only.', 'Grab, swing, grab the next one.', 'First to the finish wins', '200 Bagabucks. Solo: par time.'] },
    { cat: 'race', label: 'TOWER CLIMB', color: '#7fe8a0', glow: 0x30ff80, target: 'towerclimb', desc: ['Climb the shaft before the', 'ooze rises past you.', 'First to the top wins', '200 Bagabucks. Solo: par time.'] },
    { cat: 'race', label: 'LAST TILE', color: '#ffd060', glow: 0xffb020, target: 'lasttile', desc: ['The floor tiles fall away.', 'Be the last one standing', 'for 200 Bagabucks.', 'Solo: survive as long as you can.'] },
    { cat: 'race', label: 'RED LIGHT', color: '#ff5a5a', glow: 0xff2020, target: 'redlight', desc: ['Run on green, freeze on red.', 'Move on red and you go back.', 'First to the line wins.', 'Solo: beat the par time.'] },
    { cat: 'race', label: 'SHOOTING RANGE', color: '#60d0ff', glow: 0x30a0ff, target: 'range', desc: ['Shoot the monsters that pop up.', '2 minutes. Most kills wins', '200 Bagabucks.', 'Pull the trigger to shoot.'] },
    { cat: 'party', label: 'HIDE AND SEEK', color: '#7fe8ff', glow: 0x30c0ff, target: 'hideseek', desc: ['One seeker, everyone else hides', 'in a dark warehouse. 25 s to hide,', 'then 2 minutes of hunt. 200 Bagabucks.', 'Alone? A mannequin seeks you.'] },
    { cat: 'party', label: 'STATUES', color: '#ff7ae0', glow: 0xff40c0, target: 'statues', desc: ['Dance while the music plays.', 'Freeze when it stops!', 'Move and you are out.', 'Last statue wins 200 Bagabucks.'] },
    { cat: 'party', label: 'BLIND TAG', color: '#ff8a5a', glow: 0xff5a20, target: 'blindtag', desc: ['A blind seeker hunts by sound.', 'Running is loud, walking is quiet.', 'Caught everyone or survived:', '200 Bagabucks.'] },
    { cat: 'party', label: 'INFECTION', color: '#a0ff40', glow: 0x70ff20, target: 'infection', desc: ['Infected players touch you', 'to spread it. Stay clean for', '90 s to win 200 Bagabucks.', 'Solo: 2 infected mannequins.'] },
    { cat: 'party', label: 'HOT POTATO', color: '#ff9a40', glow: 0xff6a10, target: 'potato', desc: ['Pass the bomb by touching', 'someone with your hand.', 'It explodes in the holder hands.', 'Last one alive wins.'] },
    { cat: 'party', label: 'TREASURE HUNT', color: '#ffe080', glow: 0xffc830, target: 'treasure', desc: ['Find 8 hidden treasures in', 'the dark. The detector beeps', 'faster when you are close.', 'Most treasures wins.'] },
    { cat: 'party', label: 'BECOME THE MONSTER', color: '#ff4a4a', glow: 0xff2020, target: 'monster', desc: ['One player becomes the monster.', 'Everyone else runs for 2 minutes.', 'Not caught = 200 Bagabucks.', 'Best with 2 or more players.'] },
    { cat: 'team', label: 'CAPTURE THE BANANA', color: '#ffe040', glow: 0xffc020, target: 'banana', desc: ['Two teams, two bananas.', 'Steal theirs, bring it home.', 'First to 3 captures wins', '200 Bagabucks. Solo: vs a guard.'] },
    { cat: 'team', label: 'KING OF THE HILL', color: '#60ff80', glow: 0x30ff60, target: 'koth', desc: ['Hold the glowing ring alone', 'to collect seconds. Knock', 'rivals off with your hand.', 'First to 40 s. Solo: a rival.'] },
    { cat: 'team', label: 'GENERATOR', color: '#80ffd8', glow: 0x30ffb0, target: 'generator', desc: ['Repair 4 generators in the dark', 'while a monster hunts by sound.', 'Escape through the gate for', '200 Bagabucks. Talking is loud!'] },
    { cat: 'team', label: 'DODGEBALL', color: '#ff9a4a', glow: 0xff7a20, target: 'dodgeball', desc: ['Two teams, one center line.', 'Hit enemies with fast balls.', 'Last team standing wins.', 'Solo: hit 4 mannequins.'] }
];
// Ściany kategorii (baner, strefa na podłodze i światło skrzydła): zachód (race), północ (party), wschód (team)
// f: kierunek do wnętrza sali, który buildDoor zapisuje jako rotY
const WALLS = {
    race: { rotY: Math.PI / 2, pos: (c) => [-W + 0.03, c], inner: (c) => [-W + 2.6, c], tan: [0, 1] },
    party: { rotY: 0, pos: (c) => [c, -D + 0.03], inner: (c) => [c, -D + 2.6], tan: [1, 0] },
    team: { rotY: -Math.PI / 2, pos: (c) => [W - 0.03, c], inner: (c) => [W - 2.6, c], tan: [0, 1] }
};
// Sześć komputerów w kręgu wokół kuli (promień 5 m), każdy zwrócony na zewnątrz: gracz staje za kręgiem i patrzy do środka
const RING_R = 5, RING_ANGLES = [0, 60, 120, 180, 240, 300];
const ringPos = (deg, r) => [r * Math.sin(deg * Math.PI / 180), r * Math.cos(deg * Math.PI / 180)];
// Po powrocie z trybu stajesz przed komputerem swojej kategorii (race = zachodni, party = północny, team = wschodni)
const CAT_ARRIVAL = { race: [...ringPos(240, 6.6)], party: [...ringPos(180, 6.6)], team: [...ringPos(120, 6.6)] };
for (const k of Object.keys(CAT_ARRIVAL)) CAT_ARRIVAL[k] = [CAT_ARRIVAL[k][0], 1.2, CAT_ARRIVAL[k][1]];
const AR = {};
for (const m of MODES) AR[m.target] = CAT_ARRIVAL[m.cat];
// Drzwi do trybów na ścianach kategorii: co 5 m, wyśrodkowane (przy więcej niż 5 trybach na ścianie co 4 m, żeby nie wyszły poza ścianę 30 m)
for (const cat of Object.keys(CATS)) {
    const list = MODES.filter(m => m.cat === cat), gap = list.length > 5 ? 4 : 5;
    list.forEach((m, i) => { m.c = (i - (list.length - 1) / 2) * gap; m.wall = WALLS[cat]; });
}
export const ARRIVAL_FROM_LAVA = AR.lava;
export const ARRIVAL_FROM_RACE = AR.race;
export const ARRIVAL_FROM_LASTTILE = AR.lasttile;
export const ARRIVAL_FROM_REDLIGHT = AR.redlight;
export const ARRIVAL_FROM_RANGE = AR.range;
export const ARRIVAL_FROM_SWINGRUN = AR.swingrun;
export const ARRIVAL_FROM_TOWERCLIMB = AR.towerclimb;
export const ARRIVAL_FROM_STATUES = AR.statues;
export const ARRIVAL_FROM_BLINDTAG = AR.blindtag;
export const ARRIVAL_FROM_HIDESEEK = AR.hideseek;
export const ARRIVAL_FROM_INFECTION = AR.infection;
export const ARRIVAL_FROM_POTATO = AR.potato;
export const ARRIVAL_FROM_TREASURE = AR.treasure;
export const ARRIVAL_FROM_MONSTER = AR.monster;
export const ARRIVAL_FROM_BANANA = AR.banana;
export const ARRIVAL_FROM_KOTH = AR.koth;
export const ARRIVAL_FROM_DODGEBALL = AR.dodgeball;
export const ARRIVAL_FROM_GENERATOR = AR.generator;
let S = null;

// ---------- TERMINALE (komputery w kręgu) ----------
const STATIONS = RING_ANGLES.map(a => { const [x, z] = ringPos(a, RING_R); return { x: x, z: z, rotY: a * Math.PI / 180 }; });
const CAT_ORDER = ['race', 'party', 'team'];
const GT = { cat: 'race', idx: { race: 0, party: 0, team: 0 } };   // wybór przeżywa przejścia między trybami
let term = null;
const modesOf = (cat) => MODES.filter(m => m.cat === cat);
const curMode = () => modesOf(GT.cat)[GT.idx[GT.cat]];
function pickCat(cat) { GT.cat = cat; S.entered = false; term.dirty = true; }
function pickMode(i) { GT.idx[GT.cat] = i; S.entered = false; term.dirty = true; }
function play() {
    const m = curMode();
    if (!S || S.leaving || !S.ctx) return;
    S.leaving = true; GT.last = m.target;
    toast(m.label.charAt(0) + m.label.slice(1).toLowerCase(), m.color);
    S.ctx.goto(m.target);
}
// Rekordy trybu z rejestru: czasy (top) albo wynik punktowy (im więcej, tym lepiej)
function recordsFor(m) {
    const def = LEVEL_BY_ID[m.target];
    if (!def || !def.rec) return null;
    if (def.score) return { kind: 'score', value: SAVE.records[m.target], unit: (def.rec.match(/\(([^)]+)\)/) || [])[1] || '' };
    return { kind: 'time', list: topTimes(m.target, getDiff(m.target), false) };
}
function drawGames(t) {
    if (!S) return;
    const c = t.ctx, W2 = t.W, H2 = t.H, now = S.t, cat = CATS[GT.cat], m = curMode(), list = modesOf(GT.cat), dread = S.dread;
    const bg = c.createRadialGradient(W2 / 2, H2 * 0.3, 40, W2 / 2, H2 * 0.4, W2 * 0.75); bg.addColorStop(0, '#1d0d09'); bg.addColorStop(0.62, '#0b0604'); bg.addColorStop(1, '#040302');
    c.fillStyle = bg; c.fillRect(0, 0, W2, H2);
    sp(c, 3);
    c.fillStyle = '#3a1812'; c.fillRect(0, 46, W2, 2);
    tx(c, 'BAGABOO', 30, 24, 28, BLOOD, 'left', MONO, 8); tx(c, 'VISITOR TERMINAL // GAMES ACCESS // 03:07', 168, 24, 22, AMBD);
    tx(c, 'PRESENCE BEHIND TERMINAL', W2 - 150, 24, 20, AMBD, 'right'); tx(c, PROX[dread], W2 - 30, 24, 24, BLOOD, 'right', MONO, 8);
    // zakładki kategorii
    CAT_ORDER.forEach((k, i) => {
        const x = 8 + i * 124, on = GT.cat === k, hov = t.hover.has('tab-' + k), col = CATS[k].color;
        c.fillStyle = on ? col : (hov ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.04)'); c.fillRect(x, 58, 118, 38);
        c.strokeStyle = on ? col : '#3a1812'; c.lineWidth = 2; c.strokeRect(x + 1, 59, 116, 36);
        tx(c, k.toUpperCase() + ' ' + modesOf(k).length, x + 59, 78, 22, on ? '#120403' : '#b8a78a', 'center');
        t.buttons.push({ id: 'tab-' + k, x: x, y: 58, w: 118, h: 38, action: () => pickCat(k) });
    });
    // lista trybów wybranej kategorii
    list.forEach((l, i) => {
        const y = 108 + i * 41, on = GT.idx[GT.cat] === i, hov = t.hover.has('row' + i);
        if (on || hov) { c.fillStyle = on ? 'rgba(255,59,42,0.17)' : 'rgba(255,59,42,0.08)'; c.fillRect(8, y, 372, 38); if (on) { c.strokeStyle = cat.color; c.globalAlpha = 0.6; c.lineWidth = 1; c.strokeRect(8.5, y + 0.5, 371, 37); c.globalAlpha = 1; } }
        const col = on || hov ? '#f4e8d2' : '#b8a78a';
        tx(c, on ? '>' : ' ', 22, y + 20, 24, cat.color); tx(c, String(i + 1).padStart(2, '0'), 54, y + 20, 22, col); tx(c, l.label, 98, y + 20, 24, col, 'left', MONO, on ? 6 : 0);
        t.buttons.push({ id: 'row' + i, x: 8, y: y, w: 372, h: 38, action: () => pickMode(i) });
    });
    tx(c, cat.title, 30, 438, 24, cat.color, 'left', MONO, 8); tx(c, cat.sub, 30, 466, 20, AMBD);
    tx(c, '> MEMORY CHECK ........ OK', 30, 630, 19, AMBD); tx(c, '> VISITORS PRESENT .... ' + visitorsHere('games'), 30, 650, 19, AMBD); tx(c, '> VISITORS EXPECTED ... 0', 30, 670, 19, AMBD);
    c.fillStyle = '#3a1812'; c.fillRect(392, 48, 2, 640);
    // panel trybu = KARTA (miejsce, cel, jak grać, na co uważać), niżej rekordy i PLAY
    const X0 = 418, XR = W2 - 30, idx = MODES.indexOf(m), card = CARDS[m.target];
    tx(c, 'ENTRY ' + String(idx + 1).padStart(2, '0') + ' OF ' + MODES.length + '  /  ' + cat.title, X0, 74, 20, AMBD);
    drawEye(c, XR - 62, 76, t, S);
    const size = m.label.length > 17 ? 38 : (m.label.length > 13 ? 46 : 52);
    tx(c, m.label, X0, 118, size, '#efe3cc', 'left', SERIF, 18);
    tx(c, '“' + cat.sub + '”', X0, 154, 25, AMB, 'left', ITAL);
    const text = m.desc.join(' '), solo = /solo|alone/i.test(text), reward = /200/.test(text);
    tx(c, solo ? 'SOLO OK' : 'BEST WITH FRIENDS', X0, 190, 20, cat.color, 'left', MONO, 6); if (reward) tx(c, 'WIN = 200 BAGABUCKS', X0 + 240, 190, 20, '#ffd27a');
    const bpm = Math.round(66 + idx * 3 + dread * 4), ecgCol = bpm > 140 ? BLOOD : AMB;
    drawEcg(c, XR - 250, 172, 190, 36, now, bpm, ecgCol); tx(c, String(bpm), XR, 190, 26, ecgCol, 'right', MONO, 8);
    drawCard(c, card, X0, 226, 540, cat.color);
    // dolny pasek: rekordy i przycisk gry
    c.fillStyle = '#3a1812'; c.fillRect(X0, 546, XR - X0, 1);
    const rec = recordsFor(m);
    tx(c, 'RECORDS', X0, 580, 17, AMBD);
    if (!rec) tx(c, 'No records for this mode.', X0, 612, 20, '#9a8c78');
    else if (rec.kind === 'score') tx(c, rec.value === undefined ? 'Not played yet.' : 'Best: ' + rec.value + (rec.unit ? ' (' + rec.unit + ')' : ''), X0, 612, 22, rec.value === undefined ? '#9a8c78' : '#ffd27a');
    else if (!rec.list.length) tx(c, 'Not finished yet.', X0, 612, 20, '#9a8c78');
    else { rec.list.slice(0, 3).forEach((s2, k) => tx(c, (k + 1) + '. ' + mmss(s2), X0 + k * 126, 612, 20, k === 0 ? '#ffd27a' : '#d8c8ac')); tx(c, 'Ghost of #1 runs with you', X0, 640, 15, '#7fe8ff'); }
    // przycisk gry
    const hov = t.hover.has('play'), bx = 808, by = 600, bw = 300, bh = 60;
    c.fillStyle = hov ? '#ff6a52' : BLOOD; c.shadowColor = BLOOD; c.shadowBlur = hov ? 30 : 18; c.fillRect(bx, by, bw, bh); c.shadowBlur = 0;
    tx(c, 'PLAY >', bx + bw / 2, by + bh / 2 + 1, 32, '#140503', 'center');
    t.buttons.push({ id: 'play', x: bx, y: by, w: bw, h: bh, action: play });
    // pasek na dole
    c.fillStyle = '#3a1812'; c.fillRect(0, 686, W2, 2);
    c.font = '21px ' + MONO; const tw = Math.max(1, c.measureText(TICKER).width), tox = -((now * 55) % tw);
    for (let k = 0; k < 3; k++) tx(c, TICKER, tox + k * tw, 703, 21, '#b0261a', 'left');
    sp(c, 0);
    drawGlass(c, W2, H2, t, S);
}

export function build() {
    L.spawn = info.spawn.slice();
    L.bounds = { minX: -W + 0.3, maxX: W - 0.3, minZ: -D + 0.3, maxZ: D - 0.3, maxY: H - 0.3 };
    S = Object.assign(makeDread(), { lights: [], screens: [], ctx: null, leaving: false, entered: false, redraw: 0 });
    if (GT.last) { const lm = MODES.find(x => x.target === GT.last); if (lm) { GT.cat = lm.cat; GT.idx[lm.cat] = modesOf(lm.cat).indexOf(lm); } GT.last = undefined; }
    L.moveScale = LOBBY_MOVE_SCALE;   // ruch dłońmi taki sam jak w lobby
    // Podłoga w szachownicę, ciemne ściany, sufit
    const fc = T.makeCanvas(256, 256), fx = fc.getContext('2d');
    for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) { fx.fillStyle = (i + j) % 2 ? '#2a2036' : '#4a3c60'; fx.fillRect(i * 32, j * 32, 32, 32); }
    const ft = T.toTex(fc, true); ft.repeat.set(10, 10);
    const floor = addCrispBlock(0, -0.5, 0, W * 2 + 2, 1, D * 2 + 2, 0xffffff, 0x302040);
    floor.material.map = ft; floor.material.normalMap = null; floor.material.roughness = 0.35; floor.material.needsUpdate = true;
    addCrispBlock(0, H + 0.5, 0, W * 2 + 2, 1, D * 2 + 2, 0x3a2e4a, 0x302040);
    for (const [x, z, w, d] of [[0, -D - 0.5, W * 2 + 2, 1], [0, D + 0.5, W * 2 + 2, 1], [-W - 0.5, 0, 1, D * 2], [W + 0.5, 0, 1, D * 2]]) addCrispBlock(x, H / 2, z, w, H, d, 0x5a4a72, 0x302040);
    buildDecor();
    buildCategories();
    buildDoors();
    ensureAssets(1152, 720);
    if (!term) term = new Terminal(drawGames, 1152, 720);
    term.dirty = true;
    addComputers(term, STATIONS, { label: 'TERMINAL' });
    for (const f of ['24px VT323', '24px "IM Fell English SC"', 'italic 24px "IM Fell English"']) { try { document.fonts.load(f).then(() => { if (term) term.dirty = true; }); } catch (e) { /* bez czcionek: Courier */ } }
    buildDoor({ x: 0, z: D - 0.03, rotY: Math.PI, label: 'LOBBY', color: '#ffd27a', wood: 0x3a3048, portal: { target: 'lobby', spawn: ARRIVAL_GAMES, onEnter: () => toast('Back to the lobby') } });
}
// Neonowe paski, tytuł, kolumna pośrodku i automaty w rogach
function buildDecor() {
    const neon = [[0xff3aff, -D + 0.05, 'z'], [0x3affff, D - 0.05, 'z'], [0xff8a3a, -W + 0.05, 'x'], [0x5ac8ff, W - 0.05, 'x']];
    for (const [col, p, axis] of neon) {
        const m = new THREE.Mesh(new THREE.BoxGeometry(axis === 'z' ? W * 2 - 0.4 : 0.06, 0.06, axis === 'z' ? 0.06 : D * 2 - 0.4), new THREE.MeshBasicMaterial({ color: col }));
        if (axis === 'z') m.position.set(0, H - 0.3, p); else m.position.set(p, H - 0.3, 0);
        L.root.add(m);
    }
    // Wielki napis nad drzwiami LOBBY (od środka sali)
    const tc = T.makeCanvas(1024, 160), tx = tc.getContext('2d');
    tx.textAlign = 'center'; tx.textBaseline = 'middle'; tx.font = 'bold 110px "Courier New", monospace';
    tx.shadowColor = '#ff3aff'; tx.shadowBlur = 30; tx.fillStyle = '#ffc8ff'; tx.fillText('BAGABOO GAMES', 512, 84);
    const title = new THREE.Mesh(new THREE.PlaneGeometry(9, 1.4), new THREE.MeshBasicMaterial({ map: T.toTex(tc, false), transparent: true, toneMapped: false }));
    title.position.set(0, 4.3, D - 0.06); title.rotation.y = Math.PI; L.root.add(title);
    // Kolumna pośrodku z kulą (punkt orientacyjny)
    addCrispBlock(0, 0.5, 0, 1.6, 1.0, 1.6, 0x2a2238, 0xa05aff);
    const orb = new THREE.Mesh(new THREE.SphereGeometry(0.45, 20, 16), new THREE.MeshBasicMaterial({ color: 0xc89aff })); orb.position.set(0, 1.9, 0); L.root.add(orb);
    S.orb = orb;
    const lc = new THREE.PointLight(0xb080ff, 36, 24, 1.5); lc.position.set(0, 3.2, 0); L.root.add(lc); S.lights.push({ l: lc, base: 36, ph: 0 });
    // Automaty pod południową ścianą, z dala od drzwi trybów (wcześniej stały w rogach i zasłaniały drzwi strzelnicy)
    for (const sx of [-1, 1]) for (let i = 0; i < 3; i++) {
        const x = sx * (6 + i * 1.4), z = D - 0.75;
        addCrispBlock(x, 0.9, z, 0.9, 1.8, 0.8, 0x1a1a24, 0x5a3aff);
        const sc = T.makeCanvas(64, 64), sxx = sc.getContext('2d'), tx2 = new THREE.CanvasTexture(sc);
        const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.45), new THREE.MeshBasicMaterial({ map: tx2, toneMapped: false }));
        scr.position.set(x, 1.3, z - 0.41); scr.rotation.y = Math.PI; L.root.add(scr);
        S.screens.push({ ctx: sxx, tex: tx2, hue: Math.random() * 360 });
    }
}
// Baner kategorii nad ścianą, kolorowa strefa na podłodze i światło skrzydła
function buildCategories() {
    for (const [cat, c] of Object.entries(CATS)) {
        const w = WALLS[cat], n = MODES.filter(m => m.cat === cat).length;
        const bc = T.makeCanvas(1024, 192), bx = bc.getContext('2d');
        bx.textAlign = 'center'; bx.textBaseline = 'middle'; bx.shadowColor = c.color; bx.shadowBlur = 28;
        bx.fillStyle = c.color; bx.font = 'bold 104px "Courier New", monospace'; bx.fillText(c.title, 512, 80);
        bx.shadowBlur = 0; bx.fillStyle = '#e8dcf0'; bx.font = '40px sans-serif'; bx.fillText(c.sub + '  -  ' + n + ' games', 512, 154);
        const banner = new THREE.Mesh(new THREE.PlaneGeometry(11, 2.06), new THREE.MeshBasicMaterial({ map: T.toTex(bc, false), transparent: true, toneMapped: false }));
        const [bx0, bz0] = w.pos(0), f = [Math.sin(w.rotY), Math.cos(w.rotY)];
        banner.position.set(bx0 + f[0] * 0.05, 4.7, bz0 + f[1] * 0.05); banner.rotation.y = w.rotY; L.root.add(banner);
        // Strefa na podłodze (pas 5 m wzdłuż ściany)
        const zone = new THREE.Mesh(new THREE.PlaneGeometry(cat === 'party' ? W * 2 : 5, cat === 'party' ? 5 : D * 2), new THREE.MeshBasicMaterial({ color: c.hex, transparent: true, opacity: 0.16, depthWrite: false }));
        zone.rotation.x = -Math.PI / 2;
        zone.position.set(cat === 'race' ? -W + 2.5 : (cat === 'team' ? W - 2.5 : 0), 0.012, cat === 'party' ? -D + 2.5 : 0); L.root.add(zone);
        const l = new THREE.PointLight(c.hex, 46, 24, 1.5), [lx, lz] = w.inner(0); l.position.set(lx, 4.2, lz); L.root.add(l); S.lights.push({ l: l, base: 46, ph: Math.random() * 6 });
    }
}
// Drzwi do trybów (obok terminali): każde na ścianie swojej kategorii, z nazwą trybu
function buildDoors() {
    for (const m of MODES) {
        const w = m.wall, [x, z] = w.pos(m.c);
        buildDoor({ x: x, z: z, rotY: w.rotY, label: m.label, font: 'bold 44px sans-serif', color: m.color, glow: m.glow, wood: 0x3a3048,
            portal: { target: m.target, onEnter: () => toast(m.label.charAt(0) + m.label.slice(1).toLowerCase(), m.color) } });
    }
}
export function update(dt, t, ctx) {
    if (!S) return;
    S.ctx = ctx; stepDread(S, dt, null);
    S.redraw -= dt; if (S.redraw <= 0) { S.redraw = IS_QUEST ? 0.4 : 0.2; if (term) term.dirty = true; }
    for (const l of S.lights) l.l.intensity = l.base * (0.85 + 0.15 * Math.sin(t * 2 + l.ph));
    if (S.orb) { S.orb.position.y = 1.9 + Math.sin(t * 1.5) * 0.12; S.orb.rotation.y = t; }
    // Ekrany automatów: proste kolorowe animacje
    if (Math.floor(t * 8) !== S.frame) {
        S.frame = Math.floor(t * 8);
        for (const s of S.screens) {
            const x = s.ctx; x.fillStyle = '#05030a'; x.fillRect(0, 0, 64, 64);
            for (let i = 0; i < 6; i++) { x.fillStyle = 'hsl(' + ((s.hue + i * 40 + t * 60) % 360) + ',90%,60%)'; x.fillRect((i * 13 + t * 20) % 64, 10 + Math.sin(t * 3 + i) * 18 + 22, 8, 8); }
            s.tex.needsUpdate = true;
        }
    }
}
export function dispose() { S = null; L.moveScale = 1; }
export const debug = () => S ? { screens: term && term.meshes ? term.meshes.length : 0, cat: GT.cat, sel: GT.idx[GT.cat], buttons: term ? term.buttons.map(b => b.id) : [], modes: MODES.length } : null;   // dla testów
export const _press = (id) => { const b = term && term.buttons.find(x => x.id === id); if (b) b.action(); return !!b; };   // dla testów
