// ==========================================
// POKÓJ "LEVELS": wybór poziomów drzwiami
// The Maze, Absolute Silence, The Well i The Industrial Laundromat. Drzwi LOBBY wracają do lobby.
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
export const ARRIVAL_FROM_MAZE = [-7.5, 1.2, -4.6];
export const ARRIVAL_FROM_SILENCE = [-2.5, 1.2, -4.6];
export const ARRIVAL_FROM_WELL = [2.5, 1.2, -4.6];
export const ARRIVAL_FROM_LAUNDRY = [7.5, 1.2, -4.6];
const DOORS = [
    { x: -7.5, label: 'THE MAZE', color: '#ff6a40', glow: 0xff3010, target: 'maze', rec: 'maze', msg: 'You open the door...', desc: ['A huge random maze.', 'A mannequin hunts you.', 'Find the exit.'] },
    { x: -2.5, label: 'SILENCE', color: '#9fc8ff', glow: 0x3a7aff, target: 'silence', rec: 'silence', msg: 'Shhh...', desc: ['The Blind One hears', 'every move you make.', 'Survive 3 minutes.'] },
    { x: 2.5, label: 'THE WELL', color: '#b8ffcf', glow: 0x30ff90, target: 'well', rec: 'well', msg: 'Do not look down...', desc: ['Climb a 64 m shaft', 'before the black', 'ooze takes you.'] },
    { x: 7.5, label: 'LAUNDROMAT', color: '#ff7ac0', glow: 0xff3aa0, target: 'laundry', rec: 'laundry', msg: 'Something is walking between the washers...', desc: ['Close 4 steam valves.', 'The Threadman', 'hunts in the steam.'] }
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
        addCrispBlock(d.x, 0.5, -3.6, 0.5, 1.0, 0.4, 0x3a2a24, 0x100808);
        const screen = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.69), new THREE.MeshBasicMaterial({ map: T.toTex(c, false), toneMapped: false }));
        screen.position.set(d.x, 1.2, -3.55); screen.rotation.x = -0.5; L.root.add(screen);
    }
    buildDoor({ x: 0, z: D - 0.03, rotY: Math.PI, label: 'LOBBY', color: '#ffd27a', wood: 0x4a3a30, portal: { target: 'lobby', spawn: ARRIVAL_LEVELS, onEnter: () => toast('Back to the lobby') } });
    // Migoczące świece i lampy
    for (const [x, z] of [[-9, 4], [9, 4], [-9, -1], [9, -1], [0, 2]]) {
        const l = new THREE.PointLight(0xffa060, 6, 9, 1.8); l.position.set(x, 3.6, z); L.root.add(l); S.lights.push({ l: l, base: 6, ph: Math.random() * 9 });
        const f = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex.dot, color: 0xffb060, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); f.scale.set(0.5, 0.5, 1); f.position.set(x, 3.6, z); L.root.add(f);
    }
}
export function update(dt, t) {
    if (!S) return;
    for (const l of S.lights) l.l.intensity = l.base * (0.75 + 0.25 * Math.sin(t * 9 + l.ph) * Math.sin(t * 4.3 + l.ph));
}
export function dispose() { S = null; }
