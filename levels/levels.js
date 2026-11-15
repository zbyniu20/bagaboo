// ==========================================
// POKÓJ "LEVELS": wybór poziomów drzwiami
// The Maze, Silence, The Well, Laundromat, Burning Memory, Hospital, Cemetery i Catacombs. Drzwi LOBBY wracają do lobby.
// Przy każdych drzwiach stoi pulpit z opisem i twoim rekordem.
// ==========================================
import { THREE, L, tex, addCrispBlock } from '../core/engine.js';
import * as T from '../core/textures.js';
import { SAVE, fmtDuration, DIFFS, DIFF_ORDER, getDiff, setDiff, topTimes, dailyOn, setDailyMode, dailyDate } from '../core/economy.js';
import { Terminal, wrapText } from '../core/terminal.js';
import { toast } from '../core/terminal.js';
import { buildDoor } from '../core/levelkit.js';
import { ARRIVAL_LEVELS } from './lobby-door.js';

const W = 16, D = 7, H = 6;   // sala 32 x 14 m (8 drzwi co 4 m)
export const info = { id: 'levels', name: 'Levels', spawn: [0, 1.0, 5.2] };
// Miejsca, w których stajesz po powrocie z danego poziomu (przed jego drzwiami)
export const ARRIVAL_FROM_MAZE = [-14, 1.2, -4.6];
export const ARRIVAL_FROM_SILENCE = [-10, 1.2, -4.6];
export const ARRIVAL_FROM_WELL = [-6, 1.2, -4.6];
export const ARRIVAL_FROM_LAUNDRY = [-2, 1.2, -4.6];
export const ARRIVAL_FROM_MEMORY = [2, 1.2, -4.6];
export const ARRIVAL_FROM_HOSPITAL = [6, 1.2, -4.6];
export const ARRIVAL_FROM_CEMETERY = [10, 1.2, -4.6];
export const ARRIVAL_FROM_CATACOMBS = [14, 1.2, -4.6];
const DOORS = [
    { x: -14, label: 'THE MAZE', color: '#ff6a40', glow: 0xff3010, target: 'maze', rec: 'maze', daily: true, msg: 'You open the door...', desc: ['A huge random maze.', 'A mannequin hunts you.', 'Find the exit.'] },
    { x: -10, label: 'SILENCE', color: '#9fc8ff', glow: 0x3a7aff, target: 'silence', rec: 'silence', msg: 'Shhh...', desc: ['The Blind One hears', 'every move you make.', 'Survive 3 minutes.'] },
    { x: -6, label: 'THE WELL', color: '#b8ffcf', glow: 0x30ff90, target: 'well', rec: 'well', daily: true, msg: 'Do not look down...', desc: ['Climb a 64 m shaft', 'before the black', 'ooze takes you.'] },
    { x: -2, label: 'LAUNDROMAT', color: '#ff7ac0', glow: 0xff3aa0, target: 'laundry', rec: 'laundry', msg: 'Something is walking between the washers...', desc: ['Close 4 steam valves.', 'The Threadman', 'hunts in the steam.'] },
    { x: 2, label: 'BURNING MEMORY', color: '#ff8a3a', glow: 0xff4a10, target: 'memory', rec: 'memory', daily: true, msg: 'Remember or burn...', desc: ['Cross 20 rows of stones', 'over lava. Remember the', 'safe ones. Run!'] },
    { x: 6, label: 'THE HOSPITAL', color: '#7fe8ff', glow: 0x30c0ff, target: 'hospital', rec: 'hospital', msg: 'Do not blink...', desc: ['Find 3 keycards.', 'Patients move when your', 'flashlight is not on them.'] },
    { x: 10, label: 'THE CEMETERY', color: '#7fffb0', glow: 0x30ff80, target: 'cemetery', rec: 'cemetery', msg: 'Stay out of the lantern light...', desc: ['Steal 5 relics.', 'A gravedigger hunts with', 'a lantern. Hide in crypts.'] },
    { x: 14, label: 'CATACOMBS', color: '#ff7a40', glow: 0xff4a10, target: 'catacombs', rec: 'catacombs', msg: 'Do not run. It is listening...', desc: ['Find 4 screaming skulls.', 'The Warden has no light,', 'only red eyes. He hears all.'] }
];

// Pulpit przy drzwiach: opis poziomu, wybór trudności (Easy / Normal / Nightmare) i najlepsze czasy.
// Terminale tworzymy raz na moduł (lista terminali w terminal.js nie jest sprzątana), rysują się z aktualnego zapisu.
const boards = {};
function boardFor(d) {
    if (boards[d.target]) return boards[d.target];
    const t = new Terminal((t) => {
        const c = t.ctx, diff = getDiff(d.rec), df = DIFFS[diff];
        t.background();
        c.strokeStyle = d.color; c.lineWidth = 8; c.strokeRect(6, 6, t.W - 12, t.H - 12);
        t.text(d.label, t.W / 2, 50, 40, d.color, 'center', true);
        d.desc.forEach((l, i) => t.text(l, t.W / 2, 100 + i * 30, 22, '#f0e6dc', 'center'));
        const bw = 230;
        DIFF_ORDER.forEach((id, i) => {
            const x = 20 + i * (bw + 14), q = DIFFS[id];
            t.btn('diff-' + id, x, 200, bw, 62, q.name, () => setDiff(d.rec, id), { tone: id === 'easy' ? 'ok' : (id === 'normal' ? 'gold' : 'bad'), active: id === diff, size: 26 });
        });
        wrapText(df.info, 52).slice(0, 2).forEach((l, i) => t.text(l, t.W / 2, 290 + i * 26, 19, df.color, 'center', true));
        // Daily Run (Maze, Well, Memory): układ z daty, taki sam dla wszystkich, z własną listą czasów dnia i duchem
        let off = 0; const dl = d.daily && diff !== 'easy', dm = dl && dailyOn(d.rec);
        if (d.daily) {
            off = 58;
            t.btn('daily', 20, 346, 340, 50, dm ? 'Daily Run: ON' : 'Daily Run: off', () => setDailyMode(d.rec, !dailyOn(d.rec)), { tone: dm ? 'ok' : undefined, active: dm, size: 24, disabled: diff === 'easy' });
            t.text(diff === 'easy' ? 'Not ranked on Easy' : (dm ? 'Layout of ' + dailyDate() + ' (UTC)' : 'Random layout each time'), 380, 371, 19, dm ? '#7fe8ff' : '#9a8a7a', 'left', true);
        }
        c.fillStyle = 'rgba(255,176,0,0.25)'; c.fillRect(24, 345 + off, t.W - 48, 2);
        if (diff === 'easy') {
            t.text('Easy runs are not ranked.', t.W / 2, 410 + off, 24, '#9aa0a0', 'center', true);
            t.text('Switch to Normal or Nightmare', t.W / 2, 446 + off, 20, '#9aa0a0', 'center');
            t.text('to set records and see your ghost.', t.W / 2, 474 + off, 20, '#9aa0a0', 'center');
        } else {
            t.text(dm ? "Today's best times (" + df.name + ')' : 'Best times (' + df.name + ')', 40, 378 + off, 24, dm ? '#7fe8ff' : '#ffd27a', 'left', true);
            const top = topTimes(d.rec, diff, dm), step = d.daily ? 28 : 34;
            if (!top.length) t.text(dm ? 'Nobody has finished today. Be first!' : 'Not finished yet', 40, 424 + off, 22, '#9a8a7a', 'left');
            top.slice(0, 5).forEach((s2, i) => { t.text((i + 1) + '.  ' + fmtDuration(s2 * 1000), 60, 414 + off + i * step, d.daily ? 24 : 26, i === 0 ? '#ffd27a' : '#f0e6dc', 'left', i === 0); });
            if (top.length && (!d.daily || dm)) t.text(dm ? 'Ghost of today #1' : 'Ghost of #1 runs with you', t.W - 36, 414 + off, 17, '#7fe8ff', 'right');
        }
        t.scanlines();
    }, 768, 624);
    boards[d.target] = t;
    return t;
}
let S = null;

export function build() {
    L.spawn = info.spawn.slice();
    L.bounds = { minX: -W + 0.3, maxX: W - 0.3, minZ: -D + 0.3, maxZ: D - 0.3, maxY: H - 0.3 };
    S = { lights: [], t: 0 };
    addCrispBlock(0, -0.5, 0, W * 2 + 2, 1, D * 2 + 2, 0x8a7a70, 0x1a1010, tex.floor, { rough: tex.floorRough });
    addCrispBlock(0, H + 0.5, 0, W * 2 + 2, 1, D * 2 + 2, 0x4a3c3e, 0x1a1010);
    for (const [x, z, w, d] of [[0, -D - 0.5, W * 2 + 2, 1], [0, D + 0.5, W * 2 + 2, 1], [-W - 0.5, 0, 1, D * 2], [W + 0.5, 0, 1, D * 2]]) addCrispBlock(x, H / 2, z, w, H, d, 0x7a6a68, 0x1a1010, tex.wall);
    // Czerwony chodnik od wejścia do drzwi
    const rug = new THREE.Mesh(new THREE.PlaneGeometry(2.2, D * 2 - 1), new THREE.MeshStandardMaterial({ color: 0x5a0a10, roughness: 0.95 }));
    rug.rotation.x = -Math.PI / 2; rug.position.set(0, 0.01, 0); L.root.add(rug);
    // Napis nad drzwiami
    const tc = T.makeCanvas(1024, 160), tx = tc.getContext('2d');
    tx.textAlign = 'center'; tx.textBaseline = 'middle'; tx.font = '120px Creepster, serif';
    tx.shadowColor = '#ff2a10'; tx.shadowBlur = 30; tx.fillStyle = '#e8d0c0'; tx.fillText('LEVELS', 512, 86);
    const title = new THREE.Mesh(new THREE.PlaneGeometry(6, 0.94), new THREE.MeshBasicMaterial({ map: T.toTex(tc, false), transparent: true, toneMapped: false }));
    title.position.set(0, 4.7, -D + 0.06); L.root.add(title);
    // Drzwi poziomów, każde z własnym światłem, i pulpity z opisem i rekordem
    for (const d of DOORS) {
        buildDoor({ x: d.x, z: -D + 0.03, rotY: 0, label: d.label, color: d.color, glow: d.glow, rust: true, light: true, signY: 2.85,
            portal: { target: d.target, onEnter: () => toast(d.msg, d.color) } });
        // Tablica na słupku, podniesiona na wysokość oczu i lekko pochylona: opis, wybór trudności i najlepsze czasy
        addCrispBlock(d.x, 0.72, -3.74, 0.16, 1.44, 0.16, 0x3a2a24, 0x100808);   // słupek za tablicą, nie zasłania ekranu
        addCrispBlock(d.x, 0.04, -3.74, 0.6, 0.08, 0.6, 0x3a2a24, 0x100808);
        const frame = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.22, 0.05), new THREE.MeshStandardMaterial({ color: 0x2a1a14, roughness: 0.6 }));
        frame.position.set(d.x, 2.05, -3.64); frame.rotation.x = -0.18; L.root.add(frame);
        const screen = boardFor(d).createMesh(1.4, 1.14);
        screen.position.set(d.x, 2.05, -3.61); screen.rotation.x = -0.18; L.root.add(screen);
    }
    buildWarnings();
    buildDoor({ x: 0, z: D - 0.03, rotY: Math.PI, label: 'LOBBY', color: '#ffd27a', wood: 0x4a3a30, portal: { target: 'lobby', spawn: ARRIVAL_LEVELS, onEnter: () => toast('Back to the lobby') } });
    // Migoczące świece i lampy
    for (const [x, z] of [[-13, 4], [13, 4], [-13, -1], [13, -1], [-6, 2], [6, 2], [0, 4]]) {
        const l = new THREE.PointLight(0xffa060, 14, 12, 1.6); l.position.set(x, 3.6, z); L.root.add(l); S.lights.push({ l: l, base: 14, ph: Math.random() * 9 });
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
    // Czaszki: między drzwiami nad wejściami i na ścianach bocznych
    for (const x of [-12, -8, -4, 0, 4, 8, 12]) decal(skullTexture(x + 40), 0.75, 0.75, x, 3.7, -D + 0.05, 0);
    for (const z of [-3.5, 0.5, 4.5]) { decal(skullTexture(z * 7 + 3), 1.1, 1.1, -W + 0.05, 3.6, z, Math.PI / 2); decal(skullTexture(z * 9 + 5), 1.1, 1.1, W - 0.05, 3.6, z, -Math.PI / 2); }
    // Napisy ostrzegawcze
    decal(warningTexture('ENTER AT YOUR OWN RISK', 1024, 160, 88), 6, 0.94, -W + 0.06, 2.0, 0.5, Math.PI / 2);
    decal(warningTexture('NO ONE CAME BACK', 1024, 160, 96), 5, 0.78, W - 0.06, 2.0, 0.5, -Math.PI / 2);
    decal(warningTexture('TURN BACK NOW', 1024, 160, 96), 5, 0.78, 0, 4.4, D - 0.06, Math.PI);
    decal(warningTexture('THEY ARE WATCHING YOU', 1024, 160, 80), 4.2, 0.66, -6, 1.6, D - 0.06, Math.PI);
    decal(warningTexture('YOU HAVE BEEN WARNED', 1024, 160, 80), 4.2, 0.66, 6, 1.6, D - 0.06, Math.PI);
}
export function update(dt, t) {
    if (!S) return;
    for (const l of S.lights) l.l.intensity = l.base * (0.75 + 0.25 * Math.sin(t * 9 + l.ph) * Math.sin(t * 4.3 + l.ph));
}
export function dispose() { S = null; }
