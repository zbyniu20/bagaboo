// ==========================================
// SALON "BAGABOO GAMES": wybór trybów gry drzwiami
// 1. Floor is Lava, 2. Become the Monster, 3. Shooting Range. Drzwi LOBBY wracają do lobby.
// ==========================================
import { THREE, L, tex, addCrispBlock } from '../core/engine.js';
import * as T from '../core/textures.js';
import { toast } from '../core/terminal.js';
import { buildDoor } from '../core/levelkit.js';
import { ARRIVAL_GAMES } from './lobby-door.js';

const W = 8, D = 6, H = 5;
export const info = { id: 'games', name: 'BagaBoo Games', spawn: [0, 1.0, 4.2] };
export const ARRIVAL_FROM_LAVA = [-5, 1.2, -4.4];
export const ARRIVAL_FROM_MONSTER = [0, 1.2, -4.4];
export const ARRIVAL_FROM_RANGE = [5, 1.2, -4.4];
const MODES = [
    { x: -5, label: 'FLOOR IS LAVA', color: '#ff8a3a', glow: 0xff5a10, target: 'lava', desc: ['Do not touch the floor.', 'Heavy jumps, sinking platforms,', 'ropes and rising lava.', 'Solo or with friends.'] },
    { x: 0, label: 'BECOME THE MONSTER', color: '#ff4a4a', glow: 0xff2020, target: 'monster', desc: ['One player becomes the monster.', 'Everyone else runs for 2 minutes.', 'Not caught = 200 Bagabucks.', 'Best with 2 or more players.'] },
    { x: 5, label: 'SHOOTING RANGE', color: '#60d0ff', glow: 0x30a0ff, target: 'range', desc: ['Shoot the monsters that pop up.', '2 minutes. Most kills wins', '200 Bagabucks.', 'Pull the trigger to shoot.'] }
];
let S = null;

export function build() {
    L.spawn = info.spawn.slice();
    L.bounds = { minX: -W + 0.3, maxX: W - 0.3, minZ: -D + 0.3, maxZ: D - 0.3, maxY: H - 0.3 };
    S = { lights: [], screens: [] };
    // Podłoga w szachownicę, ciemne ściany, sufit
    const fc = T.makeCanvas(256, 256), fx = fc.getContext('2d');
    for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) { fx.fillStyle = (i + j) % 2 ? '#1a1420' : '#2e2438'; fx.fillRect(i * 32, j * 32, 32, 32); }
    const ft = T.toTex(fc, true); ft.repeat.set(4, 3);
    const floor = addCrispBlock(0, -0.5, 0, W * 2 + 2, 1, D * 2 + 2, 0xffffff, 0x302040);
    floor.material.map = ft; floor.material.bumpMap = null; floor.material.roughness = 0.35; floor.material.needsUpdate = true;
    addCrispBlock(0, H + 0.5, 0, W * 2 + 2, 1, D * 2 + 2, 0x1a1420, 0x302040);
    for (const [x, z, w, d] of [[0, -D - 0.5, W * 2 + 2, 1], [0, D + 0.5, W * 2 + 2, 1], [-W - 0.5, 0, 1, D * 2], [W + 0.5, 0, 1, D * 2]]) addCrispBlock(x, H / 2, z, w, H, d, 0x2a2232, 0x302040);
    // Neonowe paski pod sufitem
    const neon = [[0xff3aff, -D + 0.05, 'z'], [0x3affff, D - 0.05, 'z'], [0xff8a3a, -W + 0.05, 'x'], [0x7a5aff, W - 0.05, 'x']];
    for (const [col, p, axis] of neon) {
        const m = new THREE.Mesh(new THREE.BoxGeometry(axis === 'z' ? W * 2 - 0.4 : 0.06, 0.06, axis === 'z' ? 0.06 : D * 2 - 0.4), new THREE.MeshBasicMaterial({ color: col }));
        if (axis === 'z') m.position.set(0, H - 0.3, p); else m.position.set(p, H - 0.3, 0);
        L.root.add(m);
    }
    for (const [x, z, c] of [[-5, -3, 0xff5aa0], [5, -3, 0x5ac8ff], [0, 3, 0xa05aff], [-6, 3, 0xffa040], [6, 3, 0x40ffa0]]) {
        const l = new THREE.PointLight(c, 10, 9, 1.8); l.position.set(x, H - 0.6, z); L.root.add(l); S.lights.push({ l: l, base: 10, ph: Math.random() * 6 });
    }
    // Wielki neonowy napis nad drzwiami
    const tc = T.makeCanvas(1024, 160), tx = tc.getContext('2d');
    tx.textAlign = 'center'; tx.textBaseline = 'middle'; tx.font = 'bold 110px "Courier New", monospace';
    tx.shadowColor = '#ff3aff'; tx.shadowBlur = 30; tx.fillStyle = '#ffc8ff'; tx.fillText('BAGABOO GAMES', 512, 84);
    const title = new THREE.Mesh(new THREE.PlaneGeometry(8, 1.25), new THREE.MeshBasicMaterial({ map: T.toTex(tc, false), transparent: true, toneMapped: false }));
    title.position.set(0, 4.05, -D + 0.06); L.root.add(title);
    // Drzwi trybów gry z opisem obok
    for (const m of MODES) {
        buildDoor({ x: m.x, z: -D + 0.03, rotY: 0, label: m.label, font: 'bold 44px sans-serif', color: m.color, glow: m.glow, wood: 0x3a3048, light: true,
            portal: { target: m.target, onEnter: () => toast(m.label.charAt(0) + m.label.slice(1).toLowerCase(), m.color) } });
        const dc = T.makeCanvas(512, 256), dx = dc.getContext('2d');
        dx.fillStyle = 'rgba(10,6,16,0.9)'; dx.fillRect(0, 0, 512, 256); dx.strokeStyle = m.color; dx.lineWidth = 6; dx.strokeRect(4, 4, 504, 248);
        dx.font = '30px sans-serif'; dx.fillStyle = '#f0e8ff'; dx.textBaseline = 'middle';
        m.desc.forEach((line, i) => dx.fillText(line, 24, 50 + i * 52));
        const plaque = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.7), new THREE.MeshBasicMaterial({ map: T.toTex(dc, false), toneMapped: false }));
        plaque.position.set(m.x + (m.x <= 0 ? 1.6 : -1.6), 1.5, -D + 0.05); if (m.x === 0) plaque.position.x = 1.65;
        L.root.add(plaque);
    }
    buildDoor({ x: 0, z: D - 0.03, rotY: Math.PI, label: 'LOBBY', color: '#ffd27a', wood: 0x3a3048, portal: { target: 'lobby', spawn: ARRIVAL_GAMES, onEnter: () => toast('Back to the lobby') } });
    // Automaty do gier pod bocznymi ścianami (ozdoba z migającymi ekranami)
    for (let i = 0; i < 4; i++) for (const s of [-1, 1]) {
        const x = s * (W - 0.6), z = -2.5 + i * 2;
        addCrispBlock(x, 0.9, z, 0.9, 1.8, 0.8, 0x1a1a24, 0x5a3aff);
        const sc = T.makeCanvas(64, 64), sx = sc.getContext('2d'), tx2 = new THREE.CanvasTexture(sc);
        const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.45), new THREE.MeshBasicMaterial({ map: tx2, toneMapped: false }));
        scr.position.set(x - s * 0.46, 1.3, z); scr.rotation.y = -s * Math.PI / 2; L.root.add(scr);
        S.screens.push({ ctx: sx, tex: tx2, hue: Math.random() * 360 });
    }
}

export function update(dt, t) {
    if (!S) return;
    for (const l of S.lights) l.l.intensity = l.base * (0.8 + 0.2 * Math.sin(t * 2 + l.ph));
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
