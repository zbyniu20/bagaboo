// ==========================================
// POZIOM: BEZWZGLĘDNA CISZA (Absolute Silence)
// Ślepiec nic nie widzi, ale słyszy uderzenia dłoni i mikrofon. Przetrwaj 3 minuty.
// Bezpieczniki skracają czas, czarne kule odciągają potwora, liny ratują przed szarżą.
// W multiplayerze potworem steruje host; złapanych gracz trafia do gniazda, a inni mogą go uwolnić.
// Po wygranej otwierają się drzwi do Studni (poziom 3); drzwi LOBBY za plecami prowadzą do lobby.
// ==========================================
import { THREE, CANNON, L, tex, camera, lighting, addBody, addConstraint, addCrispBlock, addBlobAO, physicsMat, GROUP, place, seg, V3, UNIT_SPHERE } from '../core/engine.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { LIGHT_PRESETS } from '../core/config.js';
import * as T from '../core/textures.js';
import { levelReward, rewardActivity, recordTime, unlockAchievement } from '../core/economy.js';
import { toast } from '../core/terminal.js';
import { setPlayerPosition, releaseRope, isOnRope, hands } from '../core/player.js';
import * as N from '../core/network.js';
import * as SFX from '../core/audio.js';
import { ARRIVAL_SILENCE } from './lobby-door.js';
import { buildDoor, addDoorPortal, createJumpscare, cameraPanel, panelBg, drawInstructions } from '../core/levelkit.js';

// ---------- USTAWIENIA ----------
const NP = LIGHT_PRESETS.night;
const CEIL = 14;                             // pokój 30 x 30 m, 14 m wysokości
const GAME_TIME = 180;                       // 3 minuty ucieczki
const INTRO_TIME = 10, RESTART_INTRO = 6;    // instrukcja na start / krótka przerwa po restarcie
const FUSE_COUNT = 4, FUSE_CUT = 25;          // każdy bezpiecznik: -25 s na zegarze (+40 Bagabucks, dzienny limit w economy.js)
const REWARD_FIRST = 1800, REWARD_REPEAT = 180;
const CATCH_Y = 4.3, CATCH_R = 1.5;          // poniżej tej wysokości potwór cię dosięgnie
const SPEED = { patrol: 1.2, investigate: 2.4, decoy: 3.6, chase: 5.0, camp: 1.5 };
const CAMP_TIME = 12;                        // tyle czeka pod liną, zanim odejdzie
const GRIP_TIME = 14;                        // tyle możesz wisieć na linie
const HAND_QUIET = 0.7, HAND_LOUD = 3.0;     // prędkość dłoni (m/s): poniżej cicho, powyżej maksymalny hałas
const MIC_QUIET = 0.04, MIC_LOUD = 0.24;     // głośność mikrofonu: szept / krzyk
const MONSTER_SCALE = 1.15;
const NEST = [-11, -11];
const WAYPOINTS = [[-8, -6], [0, -10], [9, -8], [11, 0], [6, 9], [-2, 8], [-11, 2], [-4, 0], [3, 1]];
const OBSTACLES = [   // skrzynie i regały: [x, z, szer, wys, głęb]
    [-9, 4, 1.4, 1.4, 1.4], [-9, 4, 1.2, 1.2, 1.2, 1.4], [9, -3, 1.4, 1.4, 1.4], [4, 8, 3, 2.2, 0.8], [-4, -4, 1.2, 1.2, 1.2],
    [11, 9, 1.4, 1.4, 1.4], [11, 9, 1.2, 1.2, 1.2, 1.4], [-12.6, 8, 0.8, 2.2, 3], [12, -10, 1.4, 1.4, 1.4]
];
const PILLARS = [[-6, -9], [7, 5]];
const ROPES = [[-7.6, 4], [9, -1.4], [0, -3], [-3, -9.5], [5.6, 6.4], [10.2, 7.4]];
const FUSE_SPOTS = [[13.3, 0.25, -10], [-9, 2.85, 4], [-11.3, 0.25, 9.9], [-12.7, 0.3, -9.3], [0.35, 6.3, -3], [4, 2.45, 8], [-13.6, 0.25, -2], [7.75, 3.1, 5]];
const BALLS = [['black1', 2, 0.3, 10], ['black2', -5, 0.3, -1], ['black3', 9, 1.65, -3]];
export const info = { id: 'silence', name: 'Absolute Silence', spawn: [0, 1.0, 11.5] };

let S = null, restartFlag = false;
const _c = new THREE.Vector3();

// ---------- BUDOWA ----------
export function build() {
    const quickStart = restartFlag; restartFlag = false;
    L.spawn = info.spawn.slice();
    L.bounds = { minX: -14.6, maxX: 14.6, minZ: -14.6, maxZ: 14.6, maxY: CEIL - 0.4 };
    S = {
        clock: 0, phase: 'intro', introT: quickStart ? RESTART_INTRO : INTRO_TIME, introLen: quickStart ? RESTART_INTRO : INTRO_TIME,
        t: GAME_TIME, nest: new Set(), localNested: false, caughtT: -1, rescueT: 0, grip: 0, exhausted: false,
        noiseShown: 0, alert: 0, lastMicSend: 0, lastHostMsg: -10, netT: 0, hudT: 0, boardT: 0, prevMode: 'sleep',
        fuseSeed: (Math.random() * 1e9) | 0, fuseGot: 0, fusePending: 0, leaving: false, won: false, balls: {}
    };
    buildRoom();
    buildNest();
    buildRopes();
    buildBalls();
    buildFuses();
    buildClockBoard();
    buildExitDoor();
    buildWellDoor();
    S.mon = buildMonster();
    buildScare();
    buildHud();
    buildIntroPanel();
    pickFuses(S.fuseSeed);
    L.onNoise = (speed, pos) => {   // uderzenia dłoni z player.js
        const lv = Math.max(0, Math.min(1, (speed - HAND_QUIET) / (HAND_LOUD - HAND_QUIET)));
        if (lv > 0) emitNoise(pos.x, pos.z, lv);
    };
    N.onLevelMsg(onNet);
    if (N.voice.stream) SFX.attachMic(N.voice.stream);
    if (quickStart) toast('Back on your feet. Stay quiet...', '#9fc8ff');
}

function buildRoom() {
    const root = L.root;
    addCrispBlock(0, -2.5, 0, 40, 5, 40, NP.floorTint, 0x101820, tex.floor, { rough: tex.floorRough, physical: true });
    addCrispBlock(0, CEIL + 2.5, 0, 40, 5, 40, 0x2a2e33, 0x101820);
    addCrispBlock(0, CEIL / 2, -17.5, 40, CEIL, 5, 0x8a9096, 0x101820);
    addCrispBlock(0, CEIL / 2, 17.5, 40, CEIL, 5, 0x8a9096, 0x101820);
    addCrispBlock(-17.5, CEIL / 2, 0, 5, CEIL, 40, 0x8a9096, 0x101820);
    addCrispBlock(17.5, CEIL / 2, 0, 5, CEIL, 40, 0x8a9096, 0x101820);
    for (const o of OBSTACLES) {
        const y = (o[5] || 0) + o[3] / 2;
        addCrispBlock(o[0], y, o[1], o[2], o[3], o[4], 0xffffff, 0x0a0806, tex.wood, { uvMeters: 1.4 });
        if (!o[5]) addBlobAO(o[0], o[1], Math.max(o[2], o[4]) * 1.9);
    }
    for (const p of PILLARS) { addCrispBlock(p[0], CEIL / 2, p[1], 0.9, CEIL, 0.9, 0x7a7f84, 0x101820); addBlobAO(p[0], p[1], 2); }
    // Wsporniki na filarze (półka z bezpiecznikiem)
    addCrispBlock(7.75, 2.95, 5, 0.6, 0.12, 0.6, 0x3a3a3a, 0x101820);
    // Słabe, zimne światła awaryjne i czerwone przy gnieździe
    for (const l of [[-12, 6, 12, 0x4060ff, 9], [12, 6, 12, 0x4060ff, 9], [12, 6, -12, 0x4060ff, 7], [0, 7, 0, 0x5a70ff, 6]]) {
        const pl = new THREE.PointLight(l[3], l[4], 14, 2); pl.position.set(l[0], l[1], l[2]); root.add(pl);
        const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex.dot, color: l[3], transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.6 }));
        sp.scale.set(0.9, 0.9, 1); sp.position.copy(pl.position); root.add(sp);
    }
    // Pył
    const R = T.mkRng(55), n = 400, pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { pos[i * 3] = (R() * 2 - 1) * 14; pos[i * 3 + 1] = R() * 10; pos[i * 3 + 2] = (R() * 2 - 1) * 14; }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const dust = new THREE.Points(geo, new THREE.PointsMaterial({ size: 0.05, map: tex.dot, color: 0x8090a0, transparent: true, opacity: 0.45, depthWrite: false }));
    dust.frustumCulled = false; root.add(dust);
}

// Gniazdo: kości, krew i klatka, do której trafiają złapani gracze
function buildNest() {
    const root = L.root, R = T.mkRng(66), bones = [];
    for (let i = 0; i < 40; i++) {
        const a = R() * 6.28, d = 1.4 + R() * 1.6, x = NEST[0] + Math.cos(a) * d, z = NEST[1] + Math.sin(a) * d;
        bones.push(seg(V3(x, 0.08, z), V3(x + (R() - 0.5) * 0.7, 0.05 + R() * 0.2, z + (R() - 0.5) * 0.7), 0.04, 0.03, 6));
    }
    const bm = new THREE.Mesh(mergeGeometries(bones), new THREE.MeshStandardMaterial({ color: 0xcfc2a8, roughness: 0.8, bumpMap: tex.plaster, bumpScale: 1 }));
    bm.castShadow = true; root.add(bm);
    const poolMat = new THREE.MeshStandardMaterial({ map: T.createBloodPoolTexture(), transparent: true, roughness: 0.1, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 });
    const pool = new THREE.Mesh(new THREE.PlaneGeometry(6, 6), poolMat); pool.rotation.x = -Math.PI / 2; pool.position.set(NEST[0], 0.015, NEST[1]); root.add(pool);
    const bars = [], h = 2.4, r = 0.9;
    for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2; bars.push(new THREE.CylinderGeometry(0.03, 0.03, h, 6).translate(NEST[0] + Math.cos(a) * r, h / 2, NEST[1] + Math.sin(a) * r)); }
    bars.push(new THREE.TorusGeometry(r, 0.05, 6, 28).rotateX(Math.PI / 2).translate(NEST[0], h, NEST[1]));
    bars.push(new THREE.TorusGeometry(r, 0.05, 6, 28).rotateX(Math.PI / 2).translate(NEST[0], 0.05, NEST[1]));
    const cm = new THREE.Mesh(mergeGeometries(bars), new THREE.MeshStandardMaterial({ color: 0x2a2624, metalness: 0.85, roughness: 0.35 })); cm.castShadow = true; root.add(cm);
    const lock = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.22, 0.1), new THREE.MeshStandardMaterial({ color: 0x8a6a2a, metalness: 0.9, roughness: 0.3, emissive: 0x2a1a00 }));
    lock.position.set(NEST[0] + r * 0.72, 1.2, NEST[1] + r * 0.72); root.add(lock);
    const l = new THREE.PointLight(0xff2010, 10, 8, 2); l.position.set(NEST[0], 3.2, NEST[1]); root.add(l);
    S.lockPos = lock.position.clone();
}

// Liny od sufitu do 3 m nad podłogą. Ciągnięcie ręki w dół podciąga gracza.
function buildRopes() {
    const mat = new THREE.MeshStandardMaterial({ color: 0x4a3a2a, roughness: 0.9, bumpMap: tex.plaster, bumpScale: 2 });
    for (const r of ROPES) {
        const len = CEIL - 3, g = new THREE.Group();
        const m = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, len, 8, 1), mat); m.castShadow = true; g.add(m);
        const knot = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 8), mat); knot.position.y = -len / 2; g.add(knot);
        L.root.add(g);
        const body = addBody(new CANNON.Body({ mass: 10, shape: new CANNON.Box(new CANNON.Vec3(0.08, len / 2, 0.08)), material: physicsMat, position: new CANNON.Vec3(r[0], CEIL - len / 2, r[1]), linearDamping: 0.5, angularDamping: 0.5, collisionFilterGroup: GROUP.ROPE, collisionFilterMask: GROUP.ENV | GROUP.BALL }));
        const anchor = addBody(new CANNON.Body({ mass: 0, position: new CANNON.Vec3(r[0], CEIL, r[1]) }));
        addConstraint(new CANNON.PointToPointConstraint(body, new CANNON.Vec3(0, len / 2, 0), anchor, new CANNON.Vec3(0, 0, 0)));
        L.ropes.push({ mesh: g, body: body, halfHeight: len / 2 });
    }
}

// Czarne kule do odciągania potwora (synchronizowane w multiplayerze jak piłki w lobby)
function buildBalls() {
    for (const b of BALLS) {
        const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.18, 24, 18), new THREE.MeshPhysicalMaterial({ color: 0x050507, emissive: 0x2a0a40, emissiveIntensity: 0.6, roughness: 0.15, clearcoat: 1 }));
        mesh.castShadow = true; L.root.add(mesh);
        const body = addBody(new CANNON.Body({ mass: 1, shape: new CANNON.Sphere(0.18), position: new CANNON.Vec3(b[1], b[2], b[3]), material: physicsMat, linearDamping: 0.05, collisionFilterGroup: GROUP.BALL, collisionFilterMask: GROUP.ENV | GROUP.BALL | GROUP.ROPE }));
        mesh.userData = { id: b[0], body: body }; L.throwables.push(mesh);
        S.balls[b[0]] = { prev: 0 };
    }
}

function buildFuses() {
    S.fuses = FUSE_SPOTS.map((p) => {
        const g = new THREE.Group(); g.position.set(p[0], p[1], p[2]);
        const body = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.22, 12), new THREE.MeshStandardMaterial({ color: 0xc8ff60, emissive: 0x6aff20, emissiveIntensity: 1.2, roughness: 0.3 }));
        const caps = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.04, 12), new THREE.MeshStandardMaterial({ color: 0x8a8a8a, metalness: 1, roughness: 0.3 }));
        const caps2 = caps.clone(); caps.position.y = 0.11; caps2.position.y = -0.11;
        const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex.dot, color: 0x9aff40, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.8 }));
        glow.scale.set(0.8, 0.8, 1);
        g.add(body, caps, caps2, glow); g.visible = false; L.root.add(g);
        return { g: g, glow: glow, active: false };
    });
}
function pickFuses(seed) {
    S.fuseSeed = seed;
    const R = T.mkRng(seed), idx = FUSE_SPOTS.map((_, i) => i);
    for (let i = idx.length - 1; i > 0; i--) { const j = (R() * (i + 1)) | 0; const t = idx[i]; idx[i] = idx[j]; idx[j] = t; }
    const act = idx.slice(0, FUSE_COUNT);
    S.fuses.forEach((f, i) => { f.active = act.includes(i); });
    refreshFuses();
}
function refreshFuses() { S.fuses.forEach((f, i) => { f.g.visible = f.active && !(S.fuseGot & (1 << i)) && !(S.fusePending & (1 << i)); }); }
function fusesGot() { let n = 0; S.fuses.forEach((f, i) => { if (f.active && (S.fuseGot & (1 << i))) n++; }); return n; }

// Duży zegar na północnej ścianie
function buildClockBoard() {
    const c = T.makeCanvas(1024, 512); S.board = { canvas: c, tex: new THREE.CanvasTexture(c) }; S.board.tex.colorSpace = THREE.SRGBColorSpace;
    const frame = new THREE.Mesh(new THREE.BoxGeometry(6.4, 3.4, 0.2), new THREE.MeshStandardMaterial({ color: 0x1a1c1e, metalness: 0.7, roughness: 0.4 }));
    frame.position.set(0, 7, -14.85); L.root.add(frame);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(6, 3), new THREE.MeshBasicMaterial({ map: S.board.tex, toneMapped: false })); m.position.set(0, 7, -14.73); L.root.add(m);
    drawBoard();
}
function fmt(t) { t = Math.max(0, Math.ceil(t)); const m = Math.floor(t / 60), s = t % 60; return m + ':' + (s < 10 ? '0' : '') + s; }
function drawBoard() {
    const x = S.board.canvas.getContext('2d');
    x.fillStyle = '#060809'; x.fillRect(0, 0, 1024, 512);
    x.textAlign = 'center'; x.textBaseline = 'middle';
    x.font = 'bold 54px "Courier New", monospace'; x.fillStyle = '#6f8fbf';
    x.fillText(S.phase === 'intro' ? 'Waiting...' : 'Exit opens in', 512, 80);
    x.font = 'bold 230px "Courier New", monospace'; x.fillStyle = S.t < 30 ? '#ff5a3a' : '#cfe3ff'; x.shadowColor = x.fillStyle; x.shadowBlur = 30;
    x.fillText(fmt(S.t), 512, 270); x.shadowBlur = 0;
    const got = fusesGot();
    for (let i = 0; i < FUSE_COUNT; i++) {
        const cx = 512 + (i - (FUSE_COUNT - 1) / 2) * 110;
        x.beginPath(); x.arc(cx, 440, 32, 0, 7); x.fillStyle = i < got ? '#9aff40' : '#1c2620'; x.fill();
        x.lineWidth = 4; x.strokeStyle = '#3a4a3a'; x.stroke();
    }
    S.board.tex.needsUpdate = true;
}

// Drzwi do lobby za plecami gracza na starcie (wyjście w każdej chwili)
function buildExitDoor() {
    buildDoor({ x: 0, z: 14.97, rotY: Math.PI, label: 'LOBBY', color: '#70ff90', glow: 0x60ff90, wood: 0x6a7a8a, light: true,
        portal: { target: 'lobby', spawn: ARRIVAL_SILENCE, onEnter: () => toast('Back to the lobby') } });
}
// Drzwi do Studni pod zegarem: zamknięte kratą, otwierają się po wygranej
function buildWellDoor() {
    const d = buildDoor({ x: 0, z: -14.97, rotY: 0, label: 'THE WELL', color: '#b8ffcf', wood: 0x4a6a5a, grate: true });
    d.sign.material.opacity = 0.25;
    S.wellDoor = { door: d, grate: d.grate, sign: d.sign, open: 0 };
}
function openWellDoor() {
    S.wellDoor.opening = true; S.wellDoor.sign.material.opacity = 1;
    const l = new THREE.PointLight(0x40ff90, 6, 6, 2); l.position.set(0, 2.6, -13.8); L.root.add(l);
    addDoorPortal(S.wellDoor.door, { target: 'well', onEnter: () => toast('Do not look down...', '#b8ffcf') });
}

// ---------- ŚLEPIEC (model) ----------
function chain(pts, rads, sides, out) {
    for (let i = 0; i < pts.length - 1; i++) out.push(seg(pts[i], pts[i + 1], rads[i], rads[i + 1], sides || 10));
    for (let i = 0; i < pts.length; i++) out.push(place(UNIT_SPHERE, pts[i].x, pts[i].y, pts[i].z, 0, 0, 0, rads[i], rads[i], rads[i]));
}
function meshOf(parts, mat) { const m = new THREE.Mesh(mergeGeometries(parts), mat); m.castShadow = true; m.receiveShadow = true; return m; }
function monsterMats() {
    return {
        flesh: new THREE.MeshStandardMaterial({ map: tex.skin, bumpMap: tex.plaster, bumpScale: 2.2, color: 0x8e7f7a, roughness: 0.4, metalness: 0.05 }),
        membrane: new THREE.MeshStandardMaterial({ color: 0x9a5a5a, roughness: 0.5, side: THREE.DoubleSide, transparent: true, opacity: 0.92 }),
        tooth: new THREE.MeshStandardMaterial({ color: 0xd8ccb0, roughness: 0.35 }),
        claw: new THREE.MeshStandardMaterial({ color: 0x1a1412, roughness: 0.3, metalness: 0.2 }),
        mouth: new THREE.MeshBasicMaterial({ color: 0x120202 })
    };
}
// Głowa bez oczu: wydłużona czaszka, ogromne uszy i paszcza pełna zębów
function buildHead(M) {
    const head = new THREE.Group(), skull = [], ears = [], teeth = [], lower = [], lteeth = [];
    skull.push(place(UNIT_SPHERE, 0, 0.12, 0.32, -0.25, 0, 0, 0.3, 0.27, 0.5));
    skull.push(place(UNIT_SPHERE, 0, 0.2, 0.05, 0, 0, 0, 0.26, 0.26, 0.28));
    skull.push(place(UNIT_SPHERE, 0, 0.0, 0.55, 0, 0, 0, 0.24, 0.1, 0.3));
    for (const s of [-1, 1]) skull.push(place(UNIT_SPHERE, s * 0.13, 0.17, 0.62, 0, 0, 0, 0.07, 0.025, 0.05));   // zrośnięte powieki
    head.add(meshOf(skull, M.flesh));
    for (const s of [-1, 1]) ears.push(place(UNIT_SPHERE, s * 0.36, 0.26, 0.08, 0.2, s * 0.7, s * 0.6, 0.05, 0.36, 0.24));
    head.add(meshOf(ears, M.membrane));
    for (let k = 0; k < 11; k++) { const a = (k / 10 - 0.5) * 2.3; teeth.push(place(new THREE.ConeGeometry(0.024, 0.14, 6), Math.sin(a) * 0.21, -0.1, 0.5 + Math.cos(a) * 0.28, Math.PI, 0, 0, 1, 1, 1)); }
    head.add(meshOf(teeth, M.tooth));
    const mouth = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), M.mouth); mouth.scale.set(0.19, 0.08, 0.3); mouth.position.set(0, -0.12, 0.5); head.add(mouth);
    const jaw = new THREE.Group(); jaw.position.set(0, -0.06, 0.15); head.add(jaw);
    lower.push(place(UNIT_SPHERE, 0, -0.07, 0.36, 0, 0, 0, 0.22, 0.07, 0.42));
    jaw.add(meshOf(lower, M.flesh));
    for (let k = 0; k < 9; k++) { const a = (k / 8 - 0.5) * 2.2; lteeth.push(place(new THREE.ConeGeometry(0.022, 0.12, 6), Math.sin(a) * 0.17, 0.0, 0.36 + Math.cos(a) * 0.26, 0, 0, 0, 1, 1, 1)); }
    jaw.add(meshOf(lteeth, M.tooth));
    head.userData.jaw = jaw;
    return head;
}
function buildMonster() {
    const M = monsterMats(), root = new THREE.Group(), body = new THREE.Group(); body.scale.setScalar(MONSTER_SCALE); root.add(body);
    const hips = new THREE.Group(); hips.position.y = 2.0; body.add(hips);
    const torso = [];
    chain([V3(0, 0, 0), V3(0, 0.5, 0.2), V3(0, 0.95, 0.5), V3(0, 1.3, 0.85), V3(0, 1.5, 1.25)], [0.3, 0.32, 0.35, 0.2, 0.13], 12, torso);
    torso.push(place(UNIT_SPHERE, 0, 0.95, 0.5, -0.6, 0, 0, 0.55, 0.7, 0.42));
    torso.push(place(UNIT_SPHERE, 0, 0.3, 0.15, 0, 0, 0, 0.38, 0.42, 0.33));
    torso.push(place(UNIT_SPHERE, 0, 1.25, 0.75, 0, 0, 0, 0.7, 0.18, 0.25));
    for (let k = 0; k < 5; k++) torso.push(place(new THREE.TorusGeometry(0.47 - k * 0.03, 0.03, 6, 18, Math.PI * 1.1), 0, 0.6 + k * 0.14, 0.5 + k * 0.06, Math.PI / 2, 0, -0.05 * Math.PI, 1, 1, 1));
    for (let k = 0; k < 8; k++) { const t = k / 7; torso.push(place(UNIT_SPHERE, 0, 0.2 + t * 1.2, 0.0 + t * 0.7 - 0.28, 0, 0, 0, 0.07, 0.06, 0.07)); }
    hips.add(meshOf(torso, M.flesh));
    const head = buildHead(M); head.position.set(0, 1.5, 1.25); head.rotation.order = 'YXZ'; hips.add(head);
    const arms = [], legs = [];
    for (const s of [-1, 1]) {
        const arm = new THREE.Group(); arm.position.set(s * 0.62, 1.25, 0.78); hips.add(arm);
        const ap = [], cl = [];
        const palm = V3(s * 0.12, -2.2, 0.6);
        chain([V3(0, 0, 0), V3(s * 0.25, -0.95, 0.3), V3(s * 0.12, -1.95, 0.5), palm], [0.15, 0.11, 0.075, 0.08], 10, ap);
        for (let f = 0; f < 4; f++) {
            const off = (f - 1.5) * 0.07, p1 = palm.clone().add(V3(off * 1.5, -0.25, 0.18)), p2 = p1.clone().add(V3(off, -0.3, 0.08));
            chain([palm, p1], [0.035, 0.028], 6, ap);
            cl.push(seg(p1, p2, 0.026, 0.004, 6));
        }
        arm.add(meshOf(ap, M.flesh)); arm.add(meshOf(cl, M.claw)); arms.push(arm);
        const leg = new THREE.Group(); leg.position.set(s * 0.36, 0, -0.05); hips.add(leg);
        const lp = [], tc = [], toe = V3(0, -1.97, 0.25);
        chain([V3(0, 0, 0), V3(0, -0.85, 0.42), V3(0, -1.55, -0.22), toe], [0.24, 0.16, 0.1, 0.07], 10, lp);
        for (let f = -1; f <= 1; f++) tc.push(seg(toe, toe.clone().add(V3(f * 0.1, -0.02, 0.22)), 0.03, 0.004, 6));
        leg.add(meshOf(lp, M.flesh)); leg.add(meshOf(tc, M.claw)); legs.push(leg);
    }
    L.root.add(root);
    // Śpi w gnieździe, zwinięty
    const m = { root: root, hips: hips, head: head, arms: arms, legs: legs, x: NEST[0] + 2.4, z: NEST[1] + 2.4, yaw: Math.PI * 0.25, mode: 'sleep', timer: 0, listenT: 0,
        target: null, goal: null, lastHeard: -99, lastPos: null, wp: 0, ph: 0, lastStepSign: 1, netX: 0, netZ: 0, netYaw: 0, speedNow: 0 };
    return m;
}

// ---------- JUMPSCARE, HUD, INSTRUKCJA (wspólne klocki z core/levelkit.js) ----------
function buildScare() {
    const head = buildHead(monsterMats()); head.userData.jaw.rotation.x = 0.9;
    // Paszcza (przód głowy ok. 1.8 m od jej środka po skalowaniu) pędzi z ciemności pod sam nos
    S.scare = createJumpscare({ head: head, scale: 2.2, y: -0.28, restZ: -2.15, fromZ: -4.8, tilt: -0.15, eyes: false });
}
function jumpscare() { S.scare.trigger(); }
function buildHud() { S.hud = cameraPanel(1024, 200, 0.42, 0.082, 0.2, -0.75, 990); }
function drawHud() {
    const x = S.hud.ctx;
    panelBg(S.hud, 'rgba(4,8,12,0.72)');
    x.textBaseline = 'middle'; x.textAlign = 'left';
    x.font = 'bold 92px "Courier New", monospace'; x.fillStyle = S.t < 30 && S.phase === 'play' ? '#ff6a4a' : '#cfe3ff';
    x.fillText(S.phase === 'intro' ? '-:--' : fmt(S.t), 34, 78);
    x.font = 'bold 34px "Courier New", monospace'; x.fillStyle = '#9aff40';
    x.fillText('Fuses ' + fusesGot() + '/' + FUSE_COUNT, 330, 52);
    // Hałas
    x.fillStyle = '#9fb3c8'; x.fillText('Noise', 330, 110);
    x.fillStyle = '#1a2430'; x.fillRect(470, 92, 300, 36);
    const n = Math.min(1, S.noiseShown);
    x.fillStyle = n > 0.55 ? '#ff4a2a' : (n > 0.2 ? '#ffb030' : '#5ac85a'); x.fillRect(470, 92, 300 * n, 36);
    // Siła chwytu na linie
    if (isOnRope() || S.grip > 0.1) {
        x.fillStyle = '#9fb3c8'; x.fillText('Grip', 800, 52);
        x.fillStyle = '#1a2430'; x.fillRect(800, 72, 190, 26);
        const g = 1 - S.grip / GRIP_TIME; x.fillStyle = S.exhausted ? '#ff4a2a' : (g < 0.3 ? '#ffb030' : '#cfe3ff'); x.fillRect(800, 72, 190 * Math.max(0, g), 26);
    }
    let msg = '', col = '#cfe3ff';
    if (S.localNested) { msg = 'Caught! Wait for a friend to free you.'; col = '#ff6a4a'; }
    else if (S.rescueT > 0) { msg = 'Freeing... keep squeezing the cage lock'; col = '#9aff40'; }
    else if (S.won) { msg = 'You survived! THE WELL (under the clock) or LOBBY (behind you)'; col = '#9aff40'; }
    else if (S.mon.mode === 'chase' || S.mon.mode === 'roar') { msg = 'It is coming! Climb a rope!'; col = '#ff4a2a'; }
    else if (S.mon.mode === 'camp') { msg = 'It waits below. Throw a black ball away.'; col = '#ffb030'; }
    else if (S.alert > 0) { msg = 'It heard something...'; col = '#ffb030'; }
    else if (S.nest.size > 0) { msg = 'A friend is in the nest! Squeeze the cage lock.'; col = '#ffb030'; }
    x.font = 'bold 30px "Courier New", monospace'; x.fillStyle = col; x.fillText(msg, 34, 168);
    S.hud.update();
}
const INTRO_LINES = [
    'The Blind One cannot see you. It hears every slap of your hands and every sound from your microphone.',
    'Move slowly. Stroke the floor and the walls instead of hitting them. Watch the noise bar.',
    'If it roars, it is charging at you. Climb a hanging rope: pull your hand down to climb, grab higher with the other hand. It cannot reach above 4 m. Your grip lasts 14 seconds.',
    'Throw a black ball far away. The noise draws it off your trail.',
    'Find the 4 glowing fuses. Each one cuts 25 seconds off the clock.',
    'Survive until the clock hits zero to escape.',
    'Multiplayer: stay silent and use hand gestures. If it catches someone, it drags them into its nest. Squeeze the cage lock for 2 seconds to free them.',
    'The LOBBY door behind you takes you back at any time.'
];
function buildIntroPanel() { S.intro = cameraPanel(1280, 900, 1.0, 0.703, -0.04, -1.05, 995); S.intro.last = -1; }
function drawIntro(secLeft, following) {
    drawInstructions(S.intro, 'Absolute Silence', INTRO_LINES,
        following ? 'The hunt is already on. This closes in ' + secLeft + ' s' : 'It wakes up in ' + secLeft + ' s',
        { bg: 'rgba(4,8,12,0.9)', border: '#3a5a8a', title: '#cfe3ff', text: '#d8e2ec', footer: '#ffb030', size: 29 });
}

// ---------- HAŁAS I SŁUCH ----------
function isAuthority() {
    if (N.NET.mode !== 'guest') return true;
    const hs = N.hostState();
    return !(hs && hs.lvl === 'silence' && S.clock - S.lastHostMsg < 1.5);
}
function emitNoise(x, z, lv) {
    S.noiseShown = Math.max(S.noiseShown, lv);
    if (S.localNested) return;
    if (isAuthority()) hear({ x: x, z: z, L: lv, id: 'me' });
    else N.sendLevelMsg({ k: 'noise', x: x, z: z, L: lv });
}
function setMode(mode) { const m = S.mon; m.mode = mode; m.timer = 0; }
function hear(n) {
    const m = S.mon;
    if (S.phase !== 'play' || m.mode === 'sleep') return;
    const d = Math.hypot(n.x - m.x, n.z - m.z), R = 3 + 27 * n.L;
    if (d > R) return;
    S.alert = 1.5;
    if (n.id === 'ball') { setMode('investigate'); m.goal = [n.x, n.z]; m.target = null; m.fast = true; return; }   // przynęta zawsze wygrywa
    if (m.mode === 'chase' || m.mode === 'camp' || m.mode === 'roar') {
        if (n.id === m.target) { m.lastHeard = S.clock; m.lastPos = [n.x, n.z]; }
        else if (n.L > 0.6) { m.target = n.id; m.lastHeard = S.clock; m.lastPos = [n.x, n.z]; if (m.mode === 'camp') setMode('chase'); }   // krzyk zmienia cel
        return;
    }
    if (n.L > 0.55 || d < R * 0.4) { setMode('roar'); m.target = n.id; m.lastHeard = S.clock; m.lastPos = [n.x, n.z]; }
    else { setMode('investigate'); m.goal = [n.x, n.z]; m.fast = false; }
}
// Gracze w pokoju widziani przez hosta (lub tylko ty w grze solo)
function participants(p) {
    const list = [{ id: 'me', x: p.x, y: p.y, z: p.z }];
    if (N.NET.mode === 'host') for (const id in N.playersState) {
        if (id === N.myId()) continue;
        const st = N.playersState[id];
        if (!st || st.lvl !== 'silence' || !st.head) continue;
        list.push({ id: id, x: st.head.p[0], y: st.head.p[1] - 0.4, z: st.head.p[2] });
    }
    return list;
}

// ---------- MÓZG POTWORA (tylko u hosta albo w grze solo) ----------
function think(dt, parts) {
    const m = S.mon; m.timer += dt;
    let tx = null, tz = null, speed = 0;
    const dist = (x, z) => Math.hypot(x - m.x, z - m.z);
    if (m.mode === 'patrol') {
        const w = WAYPOINTS[m.wp]; tx = w[0]; tz = w[1]; speed = SPEED.patrol;
        if (dist(tx, tz) < 1) { setMode('listen'); m.listenT = 2 + Math.random() * 2; }
    } else if (m.mode === 'listen') {
        if (m.timer > m.listenT) { m.wp = (m.wp + 1 + ((Math.random() * 3) | 0)) % WAYPOINTS.length; setMode('patrol'); }
    } else if (m.mode === 'investigate') {
        tx = m.goal[0]; tz = m.goal[1]; speed = m.fast ? SPEED.decoy : SPEED.investigate;
        if (dist(tx, tz) < 1.3) { setMode('listen'); m.listenT = 4; }
    } else if (m.mode === 'roar') {
        if (m.lastPos) m.yaw = lerpAngle(m.yaw, Math.atan2(m.lastPos[0] - m.x, m.lastPos[1] - m.z), dt * 6);
        if (m.timer > 1.4) setMode('chase');
    } else if (m.mode === 'chase') {
        const tp = parts.find(p => p.id === m.target);
        const fresh = S.clock - m.lastHeard < 6;
        if (!tp || S.nest.has(m.target)) { setMode('listen'); m.listenT = 3; }
        else if (fresh && tp.y >= CATCH_Y && Math.hypot(tp.x - m.x, tp.z - m.z) < 4) setMode('camp');
        else {
            const g = fresh ? [tp.x, tp.z] : m.lastPos; tx = g[0]; tz = g[1]; speed = SPEED.chase;
            if ((!fresh && dist(tx, tz) < 1.3) || m.timer > 25) { setMode('listen'); m.listenT = 4; }
        }
    } else if (m.mode === 'camp') {
        const tp = parts.find(p => p.id === m.target);
        if (!tp) setMode('patrol');
        else {
            tx = tp.x; tz = tp.z; speed = SPEED.camp;
            if (tp.y < CATCH_Y - 0.3) setMode('chase');
            else if (m.timer > CAMP_TIME) setMode('patrol');
        }
    }
    if (tx !== null) {
        const dx = tx - m.x, dz = tz - m.z, d = Math.hypot(dx, dz);
        if (d > 0.05) { const s = Math.min(d, speed * dt); m.x += dx / d * s; m.z += dz / d * s; m.yaw = lerpAngle(m.yaw, Math.atan2(dx, dz), dt * 5); }
        m.speedNow = d > 0.05 ? speed : 0;
    } else m.speedNow = 0;
    avoidObstacles(m);
    // Złapanie każdego, kto jest za blisko i za nisko
    if (m.mode !== 'sleep') for (const p of parts) {
        if (S.nest.has(p.id)) continue;
        if (Math.hypot(p.x - m.x, p.z - m.z) < CATCH_R && p.y < CATCH_Y) { catchPlayer(p.id, parts); break; }
    }
}
function lerpAngle(a, b, k) { let d = b - a; d = Math.atan2(Math.sin(d), Math.cos(d)); return a + d * Math.min(1, k); }
function avoidObstacles(m) {
    const r = 0.9;
    for (const o of OBSTACLES) {
        const hx = o[2] / 2 + r, hz = o[4] / 2 + r, dx = m.x - o[0], dz = m.z - o[1];
        if (Math.abs(dx) < hx && Math.abs(dz) < hz) { if (hx - Math.abs(dx) < hz - Math.abs(dz)) m.x = o[0] + Math.sign(dx || 1) * hx; else m.z = o[1] + Math.sign(dz || 1) * hz; }
    }
    for (const p of PILLARS) { const dx = m.x - p[0], dz = m.z - p[1], d = Math.hypot(dx, dz); if (d < 0.5 + r && d > 0.001) { m.x = p[0] + dx / d * (0.5 + r); m.z = p[1] + dz / d * (0.5 + r); } }
    m.x = Math.max(-14, Math.min(14, m.x)); m.z = Math.max(-14, Math.min(14, m.z));
}
function catchPlayer(id, parts) {
    const multi = parts.length > 1;
    setMode('listen'); S.mon.listenT = 3;
    if (!multi) { localCaught(false); return; }
    S.nest.add(id);
    if (id === 'me') localCaught(true);
    if (parts.every(p => S.nest.has(p.id))) {   // wszyscy w gnieździe = koniec rundy
        N.sendLevelMsg({ k: 'restart' });
        setTimeout(() => restartRound(), 1800);
    }
}
function localCaught(toNest) {
    jumpscare(); S.wasCaught = true;
    S.caughtT = 0; S.caughtToNest = toNest;
    releaseRope();
}
function restartRound() {
    if (!S || S.leaving) return;
    S.leaving = true; restartFlag = true;
    S.ctx.goto('silence');
}

// ---------- SIEĆ ----------
function onNet(msg, from) {
    if (!S || !msg) return;
    if (N.NET.mode === 'host') {
        if (msg.k === 'noise') hear({ x: msg.x, z: msg.z, L: msg.L, id: from });
        else if (msg.k === 'fuse') collectFuse(msg.i);
        else if (msg.k === 'free') S.nest.clear();
        return;
    }
    // Gość: stan od hosta
    if (msg.k === 'restart') { restartRound(); return; }
    if (msg.k !== 'st') return;
    S.lastHostMsg = S.clock;
    const m = S.mon;
    m.netX = msg.mx; m.netZ = msg.mz; m.netYaw = msg.my; m.speedNow = msg.sp;
    if (m.mode === 'sleep' && msg.mm !== 'sleep') { m.x = msg.mx; m.z = msg.mz; }
    m.mode = msg.mm;
    S.t = msg.t;
    if (msg.ph === 'play' && S.phase === 'intro') S.phase = 'play';
    if (msg.fs !== S.fuseSeed) pickFuses(msg.fs);
    if (msg.fg !== S.fuseGot) { S.fuseGot = msg.fg; S.fusePending &= ~msg.fg; refreshFuses(); }
    const me = N.myId();
    S.nest = new Set((msg.nest || []).map(id => id === me ? 'me' : id));
    if (S.nest.has('me') && !S.localNested && S.caughtT < 0) localCaught(true);
    if (!S.nest.has('me') && S.localNested) freeMe();
    if (msg.ph === 'won') win();
}
function broadcast() {
    const m = S.mon, me = N.myId();
    N.sendLevelMsg({
        k: 'st', mx: m.x, mz: m.z, my: m.yaw, mm: m.mode, sp: m.speedNow, t: S.t, ph: S.phase,
        fs: S.fuseSeed, fg: S.fuseGot, nest: [...S.nest].map(id => id === 'me' ? me : id)
    });
}
function collectFuse(i) {
    if (S.fuseGot & (1 << i)) return;
    S.fuseGot |= (1 << i);
    if (S.phase === 'play') S.t = Math.max(1, S.t - FUSE_CUT);
    const p = FUSE_SPOTS[i]; hear({ x: p[0], z: p[2], L: 0.3, id: 'fuse' });
    refreshFuses();
}
function freeMe() {
    S.localNested = false;
    setPlayerPosition(NEST[0] + 2.2, 1.0, NEST[1] + 2.2);
    toast('You are free! Stay quiet.', '#9aff40');
}
// Wygrana: nagroda, potwór zastyga, otwierają się drzwi do Studni (gracz sam wybiera drzwi)
function win() {
    if (S.won) return;
    S.won = true; S.phase = 'won';
    toast('You survived!', '#7fc47f');
    levelReward('silence', REWARD_FIRST, REWARD_REPEAT, 'silent escape');
    recordTime('silence', S.playT || GAME_TIME);
    if (!S.usedBall && !S.wasCaught) unlockAchievement('silent_ghost');
    setTimeout(() => toast('Choose a door: THE WELL or LOBBY', '#b8ffcf'), 2600);
    S.mon.mode = 'sleep'; S.mon.speedNow = 0;
    if (S.localNested) freeMe();
    openWellDoor();
}

// ---------- CO KLATKĘ ----------
export function update(dt, t, ctx) {
    if (!S || S.leaving) return;
    S.ctx = ctx; S.clock += dt;
    const p = ctx.body.position, m = S.mon, auth = isAuthority();
    S.noiseShown = Math.max(0, S.noiseShown - dt * 0.8);
    if (S.phase === 'play') S.playT = (S.playT || 0) + dt;
    if (L.heldId && String(L.heldId).startsWith('black')) S.usedBall = true;   // do osiągnięcia "Silent ghost"
    if (S.alert > 0) S.alert -= dt;

    // Instrukcja przez pierwsze 30 s (w multiplayerze u gościa gra może już trwać)
    if (S.introT > 0) {
        S.introT -= dt;
        const sec = Math.max(0, Math.ceil(S.introT));
        if (sec !== S.intro.last) { S.intro.last = sec; drawIntro(sec, !auth && S.phase === 'play'); }
        S.intro.mesh.visible = S.introT > 0;
    }
    if (auth && S.phase === 'intro' && S.introT <= 0) {
        S.phase = 'play'; setMode('patrol');
        SFX.roar(0.8, { x: S.mon.x, y: 3, z: S.mon.z }); toast('It is awake. Stay quiet...', '#9fc8ff');
    }

    // Mikrofon
    const mic = SFX.micLevel();
    if (mic > MIC_QUIET && S.clock - S.lastMicSend > 0.2 && S.phase === 'play') {
        S.lastMicSend = S.clock;
        emitNoise(p.x, p.z, Math.min(1, (mic - MIC_QUIET) / (MIC_LOUD - MIC_QUIET)));
    }
    // Uderzenia kul (u każdego dźwięk, słyszy tylko host)
    for (const ball of L.throwables) {
        const b = ball.userData.body, st = S.balls[ball.userData.id], sp = b.velocity.length();
        if (st && b.type === CANNON.Body.DYNAMIC && ball.userData.id !== L.heldId && st.prev > 3 && st.prev - sp > 2.5) {
            SFX.ballHit(Math.min(1, st.prev / 10), b.position);
            if (auth) hear({ x: b.position.x, z: b.position.z, L: 0.95, id: 'ball' });
        }
        if (st) st.prev = sp;
    }

    // Potwór: host/solo liczy, gość tylko wygładza ruch z wiadomości
    if (auth) {
        const parts = participants(p);
        if (S.phase === 'play') {
            think(dt, parts);
            S.t -= dt;
            if (S.t <= 0) { S.t = 0; S.phase = 'won'; broadcast(); win(); }
        }
        S.netT -= dt;
        if (S.netT <= 0 && N.NET.mode === 'host') { S.netT = 0.1; broadcast(); }
    } else {
        m.x += (m.netX - m.x) * Math.min(1, dt * 8); m.z += (m.netZ - m.z) * Math.min(1, dt * 8);
        m.yaw = lerpAngle(m.yaw, m.netYaw, dt * 8);
    }
    animateMonster(dt, t, p);

    // Bezpieczniki: dotknij dłonią
    if (!S.localNested && hands.L) for (let i = 0; i < S.fuses.length; i++) {
        const f = S.fuses[i]; if (!f.g.visible) continue;
        f.glow.material.opacity = 0.55 + 0.3 * Math.sin(t * 4 + i);
        if (hands.L.position.distanceTo(f.g.position) < 0.4 || hands.R.position.distanceTo(f.g.position) < 0.4) {
            SFX.fuse(); rewardActivity('fuse'); toast('Fuse found! -' + FUSE_CUT + ' s', '#9aff40');
            if (auth) collectFuse(i); else { S.fusePending |= (1 << i); refreshFuses(); N.sendLevelMsg({ k: 'fuse', i: i }); }
        }
    }

    // Lina: ograniczona siła chwytu
    if (isOnRope()) {
        S.grip += dt;
        if (S.grip >= GRIP_TIME) { releaseRope(); S.exhausted = true; toast('Your grip slips!', '#ff6a4a'); }
    } else S.grip = Math.max(0, S.grip - dt * 1.5);
    if (S.exhausted) { if (isOnRope()) releaseRope(); if (S.grip < GRIP_TIME * 0.4) S.exhausted = false; }

    // Złapany: jumpscare, potem gniazdo (multiplayer) albo nowa runda (solo)
    if (S.caughtT >= 0) {
        S.caughtT += dt;
        if (S.caughtT > 1.3) {
            S.caughtT = -1;
            if (S.caughtToNest) { S.localNested = true; toast('It dragged you into its nest!', '#ff6a4a'); }
            else { toast('The Blind One caught you. Try again...', '#ff6a4a'); restartRound(); return; }
        }
    }
    if (S.localNested) { setPlayerPosition(NEST[0], 1.0, NEST[1]); releaseRope(); }

    // Uwalnianie innych: ściśnij grip przy kłódce klatki przez 2 s
    if (!S.localNested && S.nest.size > 0 && hands.L) {
        const near = (h) => h.position.distanceTo(S.lockPos) < 0.6 && h.userData.rig.target === 1.0;
        if (near(hands.L) || near(hands.R)) {
            S.rescueT += dt;
            if (S.rescueT > 2) { S.rescueT = 0; SFX.creak(0.5, S.lockPos); if (auth) S.nest.clear(); else N.sendLevelMsg({ k: 'free' }); toast('You opened the cage!', '#9aff40'); }
        } else S.rescueT = 0;
    }

    S.scare.update(dt);
    if (S.wellDoor.opening && S.wellDoor.open < 1) { S.wellDoor.open = Math.min(1, S.wellDoor.open + dt * 0.6); S.wellDoor.grate.position.y = S.wellDoor.open * 2.4; }
    S.boardT -= dt; if (S.boardT <= 0) { S.boardT = 0.25; drawBoard(); }
    S.hudT -= dt; if (S.hudT <= 0) { S.hudT = 0.12; drawHud(); }
}

// Animacja Ślepca, kroki i ryk słyszane z kierunku potwora
function animateMonster(dt, t, p) {
    const m = S.mon;
    m.root.position.set(m.x, 0, m.z); m.root.rotation.y = m.yaw;
    camera.getWorldPosition(_c);
    const dx = m.x - _c.x, dz = m.z - _c.z, dist = Math.hypot(dx, dz);
    const head = { x: m.x, y: 3.6, z: m.z }, foot = { x: m.x, y: 0.1, z: m.z };   // dźwięk 3D z miejsca potwora
    if (m.mode === 'roar' && S.prevMode !== 'roar') SFX.roar(1.0, head);
    S.prevMode = m.mode;
    const moving = m.speedNow > 0.1, amp = moving ? Math.min(1.3, 0.5 + m.speedNow / 4) : 0;
    m.ph += dt * (moving ? 1.4 + m.speedNow * 0.9 : 0);
    const s = Math.sin(m.ph);
    m.legs[0].rotation.x = s * 0.45 * amp; m.legs[1].rotation.x = -s * 0.45 * amp;
    const sign = s >= 0 ? 1 : -1;
    if (moving && sign !== m.lastStepSign) SFX.step(Math.min(1, 0.5 + m.speedNow / 8), foot);
    m.lastStepSign = sign;
    m.hips.position.y = 2.0 + Math.abs(s) * 0.08 * amp - (m.mode === 'sleep' ? 0.9 : 0);
    m.hips.rotation.x = m.mode === 'sleep' ? 0.9 : (m.mode === 'chase' ? 0.25 : 0.08);
    const jaw = m.head.userData.jaw;
    let armX = 0, jawX = 0.08 + Math.sin(t * 1.3) * 0.04, headZ = 0, headX = 0;
    if (m.mode === 'roar') { jawX = 0.95; armX = -1.2; headX = -0.5; }
    else if (m.mode === 'chase') { jawX = 0.5 + Math.sin(t * 9) * 0.15; armX = -0.7; headX = 0.2; }
    else if (m.mode === 'camp') { jawX = 0.6; armX = -2.4 + Math.sin(t * 4) * 0.5; headX = -0.9; }
    else if (m.mode === 'listen' || m.mode === 'investigate') { headZ = Math.sin(t * 0.9) * 0.45; }
    else if (m.mode === 'sleep') { headX = 0.6; armX = 0.3; }
    m.arms[0].rotation.x = armX - s * 0.35 * amp; m.arms[1].rotation.x = (m.mode === 'camp' ? -2.4 - Math.sin(t * 4) * 0.5 : armX) + s * 0.35 * amp;
    jaw.rotation.x += (jawX - jaw.rotation.x) * Math.min(1, dt * 10);
    m.head.rotation.z += (headZ - m.head.rotation.z) * Math.min(1, dt * 3);
    m.head.rotation.x += (headX - m.head.rotation.x) * Math.min(1, dt * 4);
    // Bliskość potwora: bicie serca i migająca latarka
    if (m.mode !== 'sleep') SFX.heartbeat(Math.max(0, 1 - dist / 14));
    let lamp = 1;
    if ((m.mode === 'chase' || m.mode === 'camp') && dist < 10 && Math.random() < 0.12) lamp = 0.15;
    lighting.headLamp.intensity = NP.flashlight.intensity * lamp;
}

// Sprzątanie przy wyjściu z poziomu
export function dispose() {
    if (S) {
        if (S.scare) S.scare.dispose();
        if (S.hud) S.hud.dispose();
        if (S.intro) S.intro.dispose();
    }
    L.onNoise = null;
    N.onLevelMsg(null);
    S = null;
}
