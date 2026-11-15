// ==========================================
// GAME MODE: SWING RUN (wejście z salonu BagaBoo Games, grupa RACE & SKILL)
// Wyścig nad przepaścią wyłącznie na linach: sześć stacji, a w każdej trzy liny wiszące ze stropu między platformami.
// Chwytasz linę, huśtasz się, przechwytujesz następną drugą ręką i lądujesz na kolejnej platformie. Spadek = powrót na ostatnią platformę.
// Kto pierwszy dotrze do mety, wygrywa 200 Bagabucks (2+ osoby). Solo: próba czasowa z czasem wzorcowym, rekordem i duchem.
// Układ jest stały (ten sam u wszystkich). Logika rund: core/racemode.js.
// ==========================================
import { THREE, L, camera, addCrispBlock, addBody, addConstraint, physicsMat, GROUP, CANNON } from '../core/engine.js';
import * as T from '../core/textures.js';
import { createRaceMode } from '../core/racemode.js';
import { ARRIVAL_FROM_SWINGRUN } from './games.js';

void camera;
const PY = 2.0, CEIL = 16, ROPE_TOP = 15.2;          // wysokość platform, strop i punkt zawieszenia lin
const STATIONS = 6, GAP_FIRST = 2.3, GAP_NEXT = 2.6, GAP_END = 2.5, PLAT_D = 4;
const START_Z = [-3.5, 6.5];                          // przód i tył platformy startowej
const slab = (x, top, z, w, d, col, edge) => addCrispBlock(x, top - 0.25, z, w, 0.5, d, col, edge || 0x302040);

function rope(x, z, bottom) {
    const len = ROPE_TOP - bottom, g = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color: 0x3a2a1a, roughness: 0.9 });
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, len, 8), mat); m.castShadow = true; g.add(m);
    const knot = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 8), new THREE.MeshStandardMaterial({ color: 0xff9a3a, roughness: 0.7, emissive: 0x401800 })); knot.position.y = -len / 2; g.add(knot);   // pomarańczowy węzeł: widać, gdzie chwycić
    L.root.add(g);
    const body = addBody(new CANNON.Body({ mass: 10, shape: new CANNON.Box(new CANNON.Vec3(0.08, len / 2, 0.08)), material: physicsMat, position: new CANNON.Vec3(x, ROPE_TOP - len / 2, z), linearDamping: 0.3, angularDamping: 0.3, collisionFilterGroup: GROUP.ROPE, collisionFilterMask: GROUP.ENV }));
    const anchor = addBody(new CANNON.Body({ mass: 0, position: new CANNON.Vec3(x, ROPE_TOP, z) }));
    addConstraint(new CANNON.PointToPointConstraint(body, new CANNON.Vec3(0, len / 2, 0), anchor, new CANNON.Vec3(0, 0, 0)));
    L.ropes.push({ mesh: g, body: body, halfHeight: len / 2 });
    const hook = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.2, 10), new THREE.MeshStandardMaterial({ color: 0x2a2a30, metalness: 0.8, roughness: 0.4 })); hook.position.set(x, ROPE_TOP + 0.1, z); L.root.add(hook);
}

const mode = createRaceMode({
    id: 'swingrun', name: 'Swing Run', color: '#ffb060',
    spawn: [0, PY + 0.9, 3], startSpread: 6, arrival: ARRIVAL_FROM_SWINGRUN,
    bounds: { minX: -10.2, maxX: 10.2, minZ: -102, maxZ: 7.1, maxY: CEIL - 0.6 },
    moveScale: 0.8, maxUp: 4.2, maxSpeedXZ: 3.8, extraGravity: 3.0, floorY: -40,   // te same stałe co liny w Floor is Lava (tam sprawdzone)
    par: 140, roundMax: 240, reward: 200, respawn: 'platform', fallY: -5,
    door: { x: 0, y: PY, z: 6.97, rotY: Math.PI },
    introStyle: { bg: 'rgba(24,12,4,0.9)', border: '#ffb060', title: '#ffe0c0', text: '#f4e4d0', footer: '#ffb030', size: 29 },
    introLines: ['Cross the chasm using only the ropes hanging from the ceiling. Orange knots show where to grab.', 'Grab a rope, swing, grab the next one with your other hand and let go over the next platform.', 'If you fall, you return to the last platform you stood on.', 'First to the FINISH gate wins 200 Bagabucks.'],
    hud: { bg: 'rgba(24,12,4,0.72)', ink: '#ffe4c8' },
    build(S) {
        const R = T.mkRng(9191);
        const wall = 0x3a3248, midZ = -48, len = 112;
        // Hala: strop i ściany boczne i końcowe (tor jest długi na ok. 100 m)
        addCrispBlock(0, CEIL + 0.5, midZ, 24, 1, len + 4, 0x201830, 0x302040);
        for (const s of [-1, 1]) addCrispBlock(s * 11.5, 8, midZ, 1, 18, len + 4, wall, 0x302040);
        addCrispBlock(0, 8, 8.0, 24, 18, 1, wall, 0x302040);
        addCrispBlock(0, 8, -106, 24, 18, 1, wall, 0x302040);
        // Przepaść: ciemna płaszczyzna z siatką pod torem
        const c = T.makeCanvas(256, 256), x = c.getContext('2d');
        x.fillStyle = '#0a0612'; x.fillRect(0, 0, 256, 256); x.strokeStyle = 'rgba(255,150,60,0.5)'; x.lineWidth = 3;
        for (let i = 0; i <= 256; i += 64) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, 256); x.stroke(); x.beginPath(); x.moveTo(0, i); x.lineTo(256, i); x.stroke(); }
        const gt = T.toTex(c, true); gt.repeat.set(5, 28);
        const grid = new THREE.Mesh(new THREE.PlaneGeometry(22, 112), new THREE.MeshBasicMaterial({ map: gt, toneMapped: false })); grid.rotation.x = -Math.PI / 2; grid.position.set(0, -14, midZ); L.root.add(grid);
        // Światła wzdłuż toru
        for (let z = 2; z >= -100; z -= 17) {
            const l = new THREE.PointLight(Math.round(z / 17) % 2 ? 0xffa060 : 0x60c8ff, 60, 30, 1.5); l.position.set(0, 12, z); L.root.add(l);
            const b = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffffff })); b.position.copy(l.position); L.root.add(b);
        }
        // Start (sięga aż do drzwi wyjścia) i ścianka za drzwiami
        slab(0, PY, (START_Z[0] + START_Z[1]) / 2, 9, START_Z[1] - START_Z[0], 0x4a4a6a, 0xffb060);
        addCrispBlock(0, PY + 2, 7.6, 3.4, 4, 0.4, 0x3a3248, 0x302040);
        // Stacje: trzy liny, potem platforma (położona w osi ostatniej liny, więc trzeba trzymać kierunek)
        let edge = START_Z[0], px = 0, finishZ = 0;
        for (let i = 0; i < STATIONS; i++) {
            const gap = i < 2 ? GAP_NEXT : GAP_NEXT + 0.2 + (i - 2) * 0.1;
            let z = edge - GAP_FIRST, rx = px;
            for (let k = 0; k < 3; k++) {
                rx = Math.max(-2.6, Math.min(2.6, rx + (R() * 2 - 1) * (i === 0 ? 0.6 : 1.8)));
                rope(rx, z, PY + 0.4); z -= gap;
            }
            const frontEdge = z + gap - GAP_END - (gap - GAP_NEXT) * 0;   // przód kolejnej platformy: 2,5 m za ostatnią liną
            const front = (z + gap) - GAP_END, cz = front - PLAT_D / 2, last = i === STATIONS - 1;
            const col = last ? 0x6a5a2a : (i % 2 ? 0x4a5a78 : 0x5a4a78);
            slab(rx, PY, cz, last ? 8 : 5, last ? 8 : PLAT_D, col, last ? 0xffd23a : 0xffb060);
            edge = front - PLAT_D; px = rx; finishZ = cz; void frontEdge;
        }
        // Brama mety: dwa słupy i belka z napisem
        const fz = finishZ - 1.0;
        for (const s of [-1, 1]) addCrispBlock(px + s * 3.6, PY + 2.2, fz, 0.5, 4.4, 0.5, 0xffd23a, 0x302040);
        const fc = T.makeCanvas(512, 128), g = fc.getContext('2d');
        g.fillStyle = '#ffd23a'; g.fillRect(0, 0, 512, 128);
        for (let i = 0; i < 16; i++) for (let j = 0; j < 4; j++) if ((i + j) % 2) { g.fillStyle = '#101010'; g.fillRect(i * 32, j * 32, 32, 32); }
        g.fillStyle = 'rgba(0,0,0,0.6)'; g.fillRect(96, 32, 320, 64); g.fillStyle = '#ffffff'; g.font = 'bold 52px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('FINISH', 256, 66);
        const banner = new THREE.Mesh(new THREE.PlaneGeometry(7.4, 1.8), new THREE.MeshBasicMaterial({ map: T.toTex(fc, false), toneMapped: false, side: THREE.DoubleSide })); banner.position.set(px, PY + 4.6, fz); L.root.add(banner);
        S.finishZ = finishZ + 1.6;
        // Wyjście za metą: ścianka na tylnej krawędzi ostatniej platformy i drzwi EXIT do salonu Games
        const backZ = finishZ - 4;
        addCrispBlock(px, PY + 2, backZ - 0.2, 3.4, 4, 0.4, 0x3a3248, 0x302040);
        return { finish: (p) => p.z < S.finishZ && p.y > PY - 1, exit: { x: px, y: PY, z: backZ + 0.03, rotY: 0 } };
    },
    frame(S, dt, p) { S.extra = 'Station ' + Math.min(STATIONS, Math.max(1, Math.floor((START_Z[0] - p.z) / 14.5) + 1)) + ' of ' + STATIONS; return null; }
});
export const info = mode.info, build = mode.build, update = mode.update, dispose = mode.dispose, debug = mode.debug;
