// ==========================================
// POKÓJ "LEVELS": wybór poziomów drzwiami
// The Maze, Absolute Silence, The Well, The Industrial Laundromat i Burning Memory. Drzwi LOBBY wracają do lobby.
// Przy każdych drzwiach stoi pulpit z opisem i twoim rekordem.
// ==========================================
import { THREE, L, tex, addCrispBlock } from '../core/engine.js';
import * as T from '../core/textures.js';
import { SAVE, fmtDuration } from '../core/economy.js';
import { toast } from '../core/terminal.js';
import { buildDoor } from '../core/levelkit.js';
import { ARRIVAL_LEVELS } from './lobby-door.js';

const W = 11, D = 7, H = 6;   // sala 22 x 14 m
export const info = { id: 'levels', name: 'Levels', spawn: [0, 1.0, 5.2] };
// Miejsca, w których stajesz po powrocie z danego poziomu (przed jego drzwiami)
export const ARRIVAL_FROM_MAZE = [-8, 1.2, -4.6];
export const ARRIVAL_FROM_SILENCE = [-4, 1.2, -4.6];
export const ARRIVAL_FROM_WELL = [0, 1.2, -4.6];
export const ARRIVAL_FROM_LAUNDRY = [4, 1.2, -4.6];
export const ARRIVAL_FROM_MEMORY = [8, 1.2, -4.6];
const DOORS = [
    { x: -8, label: 'THE MAZE', color: '#ff6a40', glow: 0xff3010, target: 'maze', rec: 'maze', msg: 'You open the door...', desc: ['A huge random maze.', 'A mannequin hunts you.', 'Find the exit.'] },
    { x: -4, label: 'SILENCE', color: '#9fc8ff', glow: 0x3a7aff, target: 'silence', rec: 'silence', msg: 'Shhh...', desc: ['The Blind One hears', 'every move you make.', 'Survive 3 minutes.'] },
    { x: 0, label: 'THE WELL', color: '#b8ffcf', glow: 0x30ff90, target: 'well', rec: 'well', msg: 'Do not look down...', desc: ['Climb a 64 m shaft', 'before the black', 'ooze takes you.'] },
    { x: 4, label: 'LAUNDROMAT', color: '#ff7ac0', glow: 0xff3aa0, target: 'laundry', rec: 'laundry', msg: 'Something is walking between the washers...', desc: ['Close 4 steam valves.', 'The Threadman', 'hunts in the steam.'] },
    { x: 8, label: 'BURNING MEMORY', color: '#ff8a3a', glow: 0xff4a10, target: 'memory', rec: 'memory', msg: 'Remember or burn...', desc: ['Cross 20 rows of stones', 'over lava. Remember the', 'safe ones. Run!'] }
];
let S = null;

export function build() {
    L.spawn = info.spawn.slice();
    L.bounds = { minX: -W + 0.3, maxX: W - 0.3, minZ: -D + 0.3, maxZ: D - 0.3, maxY: H - 0.3 };
    S = { lights: [], t: 0 };
    addCrispBlock(0, -0.5, 0, W * 2 + 2, 1, D * 2 + 2, 0x6a5a50, 0x1a1010, tex.floor, { rough: tex.floorRough });
    addCrispBlock(0, H + 0.5, 0, W * 2 + 2, 1, D * 2 + 2, 0x2a2224, 0x1a1010);
    for (const [x, z, w, d] of [[0, -D - 0.5, W * 2 + 2, 1], [0, D + 0.5, W * 2 + 2, 1], [-W - 0.5, 0, 1, D * 2], [W + 0.5, 0, 1, D * 2]]) addCrispBlock(x, H / 2, z, w, H, d, 0x5a4a48, 0x1a1010, tex.wall);
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
        const c = T.makeCanvas(512, 320), x = c.getContext('2d');
        x.fillStyle = '#0c0808'; x.fillRect(0, 0, 512, 320); x.strokeStyle = d.color; x.lineWidth = 8; x.strokeRect(6, 6, 500, 308);
        x.fillStyle = d.color; x.font = 'bold 46px sans-serif'; x.textAlign = 'center'; x.fillText(d.label, 256, 64);
        x.fillStyle = '#f0e6dc'; x.font = '32px sans-serif'; d.desc.forEach((l, i) => x.fillText(l, 256, 120 + i * 42));
        const rec = SAVE.records[d.rec];
        x.fillStyle = '#ffd27a'; x.font = 'bold 32px sans-serif'; x.fillText(rec !== undefined ? 'Your record: ' + fmtDuration(rec * 1000) : 'Not finished yet', 256, 286);
        // Tablica na słupku, podniesiona na wysokość oczu i lekko pochylona (cała widoczna)
        addCrispBlock(d.x, 0.75, -3.6, 0.16, 1.5, 0.16, 0x3a2a24, 0x100808);
        addCrispBlock(d.x, 0.04, -3.6, 0.6, 0.08, 0.6, 0x3a2a24, 0x100808);
        const frame = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.84, 0.05), new THREE.MeshStandardMaterial({ color: 0x2a1a14, roughness: 0.6 }));
        frame.position.set(d.x, 1.95, -3.64); frame.rotation.x = -0.18; L.root.add(frame);
        const screen = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.75), new THREE.MeshBasicMaterial({ map: T.toTex(c, false), toneMapped: false }));
        screen.position.set(d.x, 1.95, -3.61); screen.rotation.x = -0.18; L.root.add(screen);
    }
    buildWarnings();
    buildDoor({ x: 0, z: D - 0.03, rotY: Math.PI, label: 'LOBBY', color: '#ffd27a', wood: 0x4a3a30, portal: { target: 'lobby', spawn: ARRIVAL_LEVELS, onEnter: () => toast('Back to the lobby') } });
    // Migoczące świece i lampy
    for (const [x, z] of [[-9, 4], [9, 4], [-9, -1], [9, -1], [0, 2]]) {
        const l = new THREE.PointLight(0xffa060, 6, 9, 1.8); l.position.set(x, 3.6, z); L.root.add(l); S.lights.push({ l: l, base: 6, ph: Math.random() * 9 });
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
    for (const x of [-10, -6, -2, 2, 6, 10]) decal(skullTexture(x + 40), 0.75, 0.75, x, 3.7, -D + 0.05, 0);
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
