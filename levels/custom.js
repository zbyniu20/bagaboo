// ==========================================
// GAME MODE: CUSTOM RACE (grupa RACE & SKILL w salonie Games): wyścig na mapie zbudowanej w Warsztacie (levels/workshop.js).
// Tor, start, meta i drzwi powstają z mapy (core/workshoplogic.js: levelOf). Host gra swoją wybraną mapą, goście dostają jej kod od hosta
// (core/leveldata.js) i przyjmują go tylko po pełnej walidacji; bez poprawnej mapy wyścig idzie na mapie zapasowej.
// Mapy graczy nie dają Bagabucksów i nie zapisują rekordów (autor mógłby zbudować banalny tor i go farmić), liczy się zabawa i czas na HUD.
// Logika rund i sieci: core/racemode.js (jak Swing Run i Tower Climb).
// ==========================================
import { THREE, L, addCrispBlock } from '../core/engine.js';
import * as T from '../core/textures.js';
import { createRaceMode } from '../core/racemode.js';
import { LEVEL_DATA } from '../core/leveldata.js';
import { currentMap } from '../core/workshopstore.js';
import { demoMap, levelOf, atFinish, parOf } from '../core/workshoplogic.js';
import { ARRIVAL_FROM_CUSTOM } from './games.js';

const SPAWN = [0, 1.9, 3], BOUNDS = { minX: -30, maxX: 30, minZ: -40, maxZ: 30, maxY: 40 }, DOOR = { x: 0, y: 1, z: 6, rotY: Math.PI };   // pola mutowane w build() według mapy

const mode = createRaceMode({
    id: 'custom', name: 'Custom Race', color: '#7ad0ff',
    spawn: SPAWN, startSpread: 1, arrival: ARRIVAL_FROM_CUSTOM, bounds: BOUNDS,
    moveScale: 0.8, maxUp: 4.2, maxSpeedXZ: 3.8, extraGravity: 1.5, floorY: -40,   // te same stałe co w Parkour Race
    par: 90, roundMax: 240, reward: 0, noRecord: true, respawn: 'platform', fallY: -5,
    door: DOOR,
    introStyle: { bg: 'rgba(4,14,24,0.9)', border: '#7ad0ff', title: '#d8f0ff', text: '#dcecf4', footer: '#ffb030', size: 29 },
    introLines: ['A race on a course built by a player in the Workshop.', 'Run and jump from block to block. If you fall, you go back to the last block you stood on.', 'Reach the FINISH gate first. No Bagabucks on custom maps, the fun is the race.', 'The GAMES door behind you takes you back.'],
    hud: { bg: 'rgba(4,14,24,0.72)', ink: '#d8f0ff' },
    build(S) {
        const data = LEVEL_DATA.current, map = (data && data.map) || currentMap() || demoMap(), lv = levelOf(map);
        S.mapName = map.n;
        for (const b of lv.blocks) addCrispBlock(b.cx, b.cy, b.cz, b.w, b.h, b.d, b.col, 0x302040);
        for (let i = 0; i < 3; i++) SPAWN[i] = lv.spawn[i];
        Object.assign(BOUNDS, lv.bounds); L.spawn = SPAWN.slice();
        Object.assign(DOOR, { x: 0, y: lv.startTop, z: lv.startEdgeZ + 0.47, rotY: Math.PI });
        addCrispBlock(0, lv.startTop + 2, lv.startEdgeZ + 1.1, 3.4, 4, 0.4, 0x3a3248, 0x302040);   // ścianka za drzwiami GAMES
        // Przepaść pod torem i światła przy starcie i mecie (do 3 świateł punktowych)
        const pit = new THREE.Mesh(new THREE.PlaneGeometry(240, 240), new THREE.MeshBasicMaterial({ color: 0x0a0612 })); pit.rotation.x = -Math.PI / 2; pit.position.set(0, -14, 0); L.root.add(pit);
        for (const [x, y, z, col] of [[0, lv.startTop + 7, 3, 0xffa060], [lv.finish.x, lv.finish.y + 7, lv.finish.z, 0x60c8ff], [(lv.finish.x) / 2, Math.max(lv.startTop, lv.finish.y) + 9, (3 + lv.finish.z) / 2, 0xffffff]]) {
            const l = new THREE.PointLight(col, 70, 40, 1.5); l.position.set(x, y, z); L.root.add(l);
        }
        // Brama mety: dwa słupy i szachownica FINISH
        const f = lv.finish, fc = T.makeCanvas(512, 128), g = fc.getContext('2d');
        g.fillStyle = '#ffd23a'; g.fillRect(0, 0, 512, 128);
        for (let i = 0; i < 16; i++) for (let j = 0; j < 4; j++) if ((i + j) % 2) { g.fillStyle = '#101010'; g.fillRect(i * 32, j * 32, 32, 32); }
        g.fillStyle = 'rgba(0,0,0,0.6)'; g.fillRect(96, 32, 320, 64); g.fillStyle = '#ffffff'; g.font = 'bold 52px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('FINISH', 256, 66);
        for (const s of [-1, 1]) addCrispBlock(f.x + s * 1.9, f.y + 2.2, f.z, 0.4, 4.4, 0.4, 0xffd23a, 0x302040);
        const banner = new THREE.Mesh(new THREE.PlaneGeometry(3.8, 1.2), new THREE.MeshBasicMaterial({ map: T.toTex(fc, false), toneMapped: false, side: THREE.DoubleSide })); banner.position.set(f.x, f.y + 4.4, f.z); L.root.add(banner);
        addCrispBlock(lv.exitX, lv.exitTop + 2, lv.exitZ - 0.2, 3.4, 4, 0.4, 0x3a3248, 0x302040);   // ścianka za drzwiami EXIT
        mode.info.spawn = SPAWN.slice();
        return { finish: (p) => atFinish(p, f), hostFinish: (h) => atFinish(h, f, 5.6) && h.y < f.y + 6, par: parOf(map), exit: { x: lv.exitX, y: lv.exitTop, z: lv.exitZ + 0.03, rotY: 0 } };
    },
    frame(S) { S.extra = S.mapName; return null; }
});
export const info = mode.info, build = mode.build, update = mode.update, dispose = mode.dispose, debug = mode.debug;
