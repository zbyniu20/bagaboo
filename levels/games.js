// ==========================================
// SALON "BAGABOO GAMES": hub z trzema skrzydłami, tryby pogrupowane tematycznie
//  - ZACHÓD  RACE & SKILL  (pomarańczowy): Floor is Lava, Parkour Race, Last Tile, Red Light Green Light, Shooting Range
//  - PÓŁNOC  PARTY GAMES   (różowy):       Hide and Seek, Infection, Hot Potato, Treasure Hunt, Become the Monster
//  - WSCHÓD  TEAM GAMES    (błękitny):     Capture the Banana, King of the Hill, Dodgeball
// Przy każdych drzwiach tabliczka z opisem. Drzwi LOBBY (południe) wracają do lobby.
// Nowy tryb: dopisz wpis do MODES (kategoria, nazwa, opis) i export ARRIVAL_FROM_* niżej.
// ==========================================
import { THREE, L, tex, addCrispBlock } from '../core/engine.js';
import * as T from '../core/textures.js';
import { toast } from '../core/terminal.js';
import { buildDoor } from '../core/levelkit.js';
import { ARRIVAL_GAMES } from './lobby-door.js';

const W = 15, D = 15, H = 6;          // sala 30 x 30 m
const SPACING = 5;
export const info = { id: 'games', name: 'BagaBoo Games', spawn: [0, 1.0, 11] };

const CATS = {
    race: { title: 'RACE & SKILL', sub: 'Beat the clock and the course', color: '#ff9a4a', hex: 0xff7a20 },
    party: { title: 'PARTY GAMES', sub: 'Chaos for everyone', color: '#ff7aff', hex: 0xff3aff },
    team: { title: 'TEAM GAMES', sub: 'Win together', color: '#6ad0ff', hex: 0x30a0ff }
};
// Kolejność w kategorii = kolejność drzwi na ścianie (od lewej do prawej patrząc na ścianę)
const MODES = [
    { cat: 'race', label: 'FLOOR IS LAVA', color: '#ff8a3a', glow: 0xff5a10, target: 'lava', desc: ['Do not touch the floor.', 'Heavy jumps, sinking platforms,', 'ropes and rising lava.', 'Solo or with friends.'] },
    { cat: 'race', label: 'PARKOUR RACE', color: '#ff7ac0', glow: 0xff3aa0, target: 'race', desc: ['Race over the void.', 'First to the finish wins', '200 Bagabucks.', 'Solo: beat the par time.'] },
    { cat: 'race', label: 'LAST TILE', color: '#ffd060', glow: 0xffb020, target: 'lasttile', desc: ['The floor tiles fall away.', 'Be the last one standing', 'for 200 Bagabucks.', 'Solo: survive as long as you can.'] },
    { cat: 'race', label: 'RED LIGHT', color: '#ff5a5a', glow: 0xff2020, target: 'redlight', desc: ['Run on green, freeze on red.', 'Move on red and you go back.', 'First to the line wins.', 'Solo: beat the par time.'] },
    { cat: 'race', label: 'SHOOTING RANGE', color: '#60d0ff', glow: 0x30a0ff, target: 'range', desc: ['Shoot the monsters that pop up.', '2 minutes. Most kills wins', '200 Bagabucks.', 'Pull the trigger to shoot.'] },
    { cat: 'party', label: 'HIDE AND SEEK', color: '#7fe8ff', glow: 0x30c0ff, target: 'hideseek', desc: ['One seeker, everyone else hides', 'in a dark warehouse. 25 s to hide,', 'then 2 minutes of hunt. 200 Bagabucks.', 'Alone? A mannequin seeks you.'] },
    { cat: 'party', label: 'INFECTION', color: '#a0ff40', glow: 0x70ff20, target: 'infection', desc: ['Infected players touch you', 'to spread it. Stay clean for', '90 s to win 200 Bagabucks.', 'Solo: 2 infected mannequins.'] },
    { cat: 'party', label: 'HOT POTATO', color: '#ff9a40', glow: 0xff6a10, target: 'potato', desc: ['Pass the bomb by touching', 'someone with your hand.', 'It explodes in the holder hands.', 'Last one alive wins.'] },
    { cat: 'party', label: 'TREASURE HUNT', color: '#ffe080', glow: 0xffc830, target: 'treasure', desc: ['Find 8 hidden treasures in', 'the dark. The detector beeps', 'faster when you are close.', 'Most treasures wins.'] },
    { cat: 'party', label: 'BECOME THE MONSTER', color: '#ff4a4a', glow: 0xff2020, target: 'monster', desc: ['One player becomes the monster.', 'Everyone else runs for 2 minutes.', 'Not caught = 200 Bagabucks.', 'Best with 2 or more players.'] },
    { cat: 'team', label: 'CAPTURE THE BANANA', color: '#ffe040', glow: 0xffc020, target: 'banana', desc: ['Two teams, two bananas.', 'Steal theirs, bring it home.', 'First to 3 captures wins', '200 Bagabucks. Solo: vs a guard.'] },
    { cat: 'team', label: 'KING OF THE HILL', color: '#60ff80', glow: 0x30ff60, target: 'koth', desc: ['Hold the glowing ring alone', 'to collect seconds. Knock', 'rivals off with your hand.', 'First to 40 s. Solo: a rival.'] },
    { cat: 'team', label: 'DODGEBALL', color: '#ff9a4a', glow: 0xff7a20, target: 'dodgeball', desc: ['Two teams, one center line.', 'Hit enemies with fast balls.', 'Last team standing wins.', 'Solo: hit 4 mannequins.'] }
];
// Ściany: zachód (race), północ (party), wschód (team). Drzwi co 5 m, wyśrodkowane na ścianie.
// f: kierunek do wnętrza sali, który buildDoor zapisuje jako rotY
const WALLS = {
    race: { rotY: Math.PI / 2, pos: (c) => [-W + 0.03, c], inner: (c) => [-W + 2.6, c], tan: [0, 1] },
    party: { rotY: 0, pos: (c) => [c, -D + 0.03], inner: (c) => [c, -D + 2.6], tan: [1, 0] },
    team: { rotY: -Math.PI / 2, pos: (c) => [W - 0.03, c], inner: (c) => [W - 2.6, c], tan: [0, 1] }
};
// Wyznacza pozycje drzwi i miejsce, w którym gracz staje po powrocie z trybu
const AR = {};
for (const cat of Object.keys(CATS)) {
    const list = MODES.filter(m => m.cat === cat);
    list.forEach((m, i) => { m.c = (i - (list.length - 1) / 2) * SPACING; m.wall = WALLS[cat]; const [ax, az] = m.wall.inner(m.c); m.arrival = [ax, 1.2, az]; AR[m.target] = m.arrival; });
}
export const ARRIVAL_FROM_LAVA = AR.lava;
export const ARRIVAL_FROM_RACE = AR.race;
export const ARRIVAL_FROM_LASTTILE = AR.lasttile;
export const ARRIVAL_FROM_REDLIGHT = AR.redlight;
export const ARRIVAL_FROM_RANGE = AR.range;
export const ARRIVAL_FROM_HIDESEEK = AR.hideseek;
export const ARRIVAL_FROM_INFECTION = AR.infection;
export const ARRIVAL_FROM_POTATO = AR.potato;
export const ARRIVAL_FROM_TREASURE = AR.treasure;
export const ARRIVAL_FROM_MONSTER = AR.monster;
export const ARRIVAL_FROM_BANANA = AR.banana;
export const ARRIVAL_FROM_KOTH = AR.koth;
export const ARRIVAL_FROM_DODGEBALL = AR.dodgeball;
let S = null;

export function build() {
    L.spawn = info.spawn.slice();
    L.bounds = { minX: -W + 0.3, maxX: W - 0.3, minZ: -D + 0.3, maxZ: D - 0.3, maxY: H - 0.3 };
    S = { lights: [], screens: [] };
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
    // Automaty przy rogach południowych
    for (const sx of [-1, 1]) for (let i = 0; i < 3; i++) {
        const x = sx * (W - 0.8), z = D - 2.2 - i * 1.4;
        addCrispBlock(x, 0.9, z, 0.8, 1.8, 0.9, 0x1a1a24, 0x5a3aff);
        const sc = T.makeCanvas(64, 64), sxx = sc.getContext('2d'), tx2 = new THREE.CanvasTexture(sc);
        const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.45), new THREE.MeshBasicMaterial({ map: tx2, toneMapped: false }));
        scr.position.set(x - sx * 0.46, 1.3, z); scr.rotation.y = -sx * Math.PI / 2; L.root.add(scr);
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
function buildDoors() {
    for (const m of MODES) {
        const w = m.wall, [x, z] = w.pos(m.c);
        buildDoor({ x: x, z: z, rotY: w.rotY, label: m.label, font: 'bold 44px sans-serif', color: m.color, glow: m.glow, wood: 0x3a3048,
            portal: { target: m.target, onEnter: () => toast(m.label.charAt(0) + m.label.slice(1).toLowerCase(), m.color) } });
        // Tabliczka z opisem obok drzwi (przesunięta wzdłuż ściany)
        const dc = T.makeCanvas(512, 256), dx = dc.getContext('2d');
        dx.fillStyle = 'rgba(10,6,16,0.9)'; dx.fillRect(0, 0, 512, 256); dx.strokeStyle = m.color; dx.lineWidth = 6; dx.strokeRect(4, 4, 504, 248);
        dx.font = '29px sans-serif'; dx.fillStyle = '#f0e8ff'; dx.textBaseline = 'middle';
        m.desc.forEach((line, i) => dx.fillText(line, 22, 48 + i * 52));
        const plaque = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.7), new THREE.MeshBasicMaterial({ map: T.toTex(dc, false), toneMapped: false }));
        const off = 1.9, px = x + w.tan[0] * off, pz = z + w.tan[1] * off, f = [Math.sin(w.rotY), Math.cos(w.rotY)];
        plaque.position.set(px + f[0] * 0.02, 1.5, pz + f[1] * 0.02); plaque.rotation.y = w.rotY; L.root.add(plaque);
    }
}

export function update(dt, t) {
    if (!S) return;
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
export function dispose() { S = null; }
