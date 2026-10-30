// ==========================================
// GAME MODE: FLOOR IS LAVA (wejście z salonu BagaBoo Games)
// Długa hala zalana lawą. Nie wolno dotknąć podłogi, nawet dłonią. Trasa: kamienne słupy,
// zapadające się płyty, ruchome platformy, trampolina i liny, a na końcu wspinaczka do drzwi EXIT.
// Zielone platformy to punkty kontrolne. Co jakiś czas lawa się podnosi.
// ==========================================
import { THREE, L, tex, camera, addCrispBlock, addBody, addConstraint, physicsMat, GROUP, CANNON } from '../core/engine.js';
import * as T from '../core/textures.js';
import { buildMannequin } from '../core/mannequin.js';
import { levelReward, recordTime, unlockAchievement } from '../core/economy.js';
import { toast } from '../core/terminal.js';
import { hands, setPlayerPosition, releaseAll } from '../core/player.js';
import * as SFX from '../core/audio.js';
import { buzz } from '../core/haptics.js';
import { ARRIVAL_FROM_LAVA } from './games.js';
import { buildDoor, cameraPanel, panelBg, drawInstructions } from '../core/levelkit.js';

// ---------- USTAWIENIA ----------
const LAVA_Y = 0.25, SURGE_UP = 0.55;        // poziom lawy i o ile podnosi się przy "wzbieraniu"
const SURGE_MIN = 40, SURGE_MAX = 60;        // co ile sekund lawa wzbiera
const SINK_DELAY = 0.8, SINK_SPEED = 0.7, SINK_RESET = 4;   // zapadające się płyty
const MOVE_AMP = 3, MOVE_SPEED = 0.6;        // ruchome platformy: zasięg (m) i tempo
const REWARD_FIRST = 1500, REWARD_REPEAT = 150;
const INTRO_TIME = 10;
// Cięższy ruch: nie da się przeskoczyć kilku bloków naraz
const MOVE_SCALE = 0.8, MAX_UP = 4.2, MAX_SPEED_XZ = 3.8, EXTRA_GRAVITY = 3.0;
export const info = { id: 'lava', name: 'Floor is Lava', spawn: [0, 1.9, 2.6] };

let S = null;
const _c = new THREE.Vector3();

// ---------- BUDOWA ----------
export function build() {
    L.spawn = info.spawn.slice();
    L.bounds = { minX: -9.6, maxX: 9.6, minZ: -61.6, maxZ: 4.6, maxY: 23.5 };
    L.moveScale = MOVE_SCALE; L.maxUp = MAX_UP; L.maxSpeedXZ = MAX_SPEED_XZ;
    S = { clock: 0, runT: 0, introT: INTRO_TIME, phase: 'intro', burns: 0, cp: 0, grace: 0, lavaY: LAVA_Y, surgeT: 0, nextSurge: 45, flash: 0,
          sinkers: [], movers: [], mannequins: [], hudT: 0, leaving: false };
    S.checkpoints = [info.spawn.slice()];
    buildHall();
    buildLava();
    buildCourse();
    buildMannequins();
    buildDoor({ x: 0, z: 4.97, rotY: Math.PI, label: 'GAMES', color: '#d080ff', wood: 0x5a4a44, portal: { target: 'games', spawn: ARRIVAL_FROM_LAVA, onEnter: () => toast('Back to BagaBoo Games') } });
    buildDoor({ x: 0, y: 7.0, z: -61.97, rotY: 0, label: 'EXIT', color: '#70ff90', glow: 0x60ff90, wood: 0x4a5a4a, light: true,
        portal: { target: 'games', spawn: ARRIVAL_FROM_LAVA, onEnter: finish } });
    S.hud = cameraPanel(1024, 200, 0.42, 0.082, 0.2, -0.75, 990);
    S.intro = cameraPanel(1280, 820, 1.0, 0.64, -0.04, -1.05, 995); S.intro.last = -1;
    S.flashPanel = makeFlash();
}

function buildHall() {
    const wc = 0x5a4440;
    addCrispBlock(0, -2.5, -28.5, 24, 5, 70, 0x2a1a14, 0x200800);                    // dno pod lawą
    addCrispBlock(0, 26.5, -28.5, 24, 5, 70, 0x2a2420, 0x200800);                    // sufit
    addCrispBlock(-12.5, 12, -28.5, 5, 24, 70, wc, 0x300800);
    addCrispBlock(12.5, 12, -28.5, 5, 24, 70, wc, 0x300800);
    addCrispBlock(0, 12, 7.5, 30, 24, 5, wc, 0x300800);
    addCrispBlock(0, 12, -64.5, 30, 24, 5, wc, 0x300800);
    addCrispBlock(0, 0.6, 3, 6, 1.2, 4, 0x6a5a50, 0x300800);                          // platforma startowa
    // Pomarańczowe światło od lawy
    for (let z = 0; z >= -56; z -= 14) { const l = new THREE.PointLight(0xff5a1a, 26, 20, 1.8); l.position.set(0, 1.4, z - 4); L.root.add(l); }
    // Iskry unoszące się nad lawą
    const n = 450, pos = new Float32Array(n * 3), R = T.mkRng(5);
    for (let i = 0; i < n; i++) { pos[i * 3] = (R() * 2 - 1) * 9.5; pos[i * 3 + 1] = R() * 14; pos[i * 3 + 2] = 3 - R() * 64; }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const pts = new THREE.Points(geo, new THREE.PointsMaterial({ size: 0.06, map: tex.dot, color: 0xffa040, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    pts.frustumCulled = false; L.root.add(pts);
    S.embers = { geo: geo, pos: pos, n: n };
}
// Lawa: tekstura skorupy z jasnymi pęknięciami, przesuwana i pulsująca
function lavaTexture() {
    const S2 = 512, c = T.makeCanvas(S2, S2), x = c.getContext('2d'), R = T.mkRng(909);
    x.fillStyle = '#ff6a10'; x.fillRect(0, 0, S2, S2);
    for (let i = 0; i < 26; i++) T.radial(x, R() * S2, R() * S2, 40 + R() * 90, 'rgba(255,220,80,0.6)', 'rgba(255,220,80,0)');
    for (let i = 0; i < 110; i++) {
        const px = R() * S2, py = R() * S2, r = 16 + R() * 34;
        x.fillStyle = 'rgba(30,6,2,' + (0.65 + R() * 0.3) + ')'; x.beginPath();
        for (let k = 0; k < 8; k++) { const a = k / 8 * 6.28, rr = r * (0.7 + R() * 0.4); if (k === 0) x.moveTo(px + Math.cos(a) * rr, py + Math.sin(a) * rr); else x.lineTo(px + Math.cos(a) * rr, py + Math.sin(a) * rr); }
        x.closePath(); x.fill();
    }
    return T.toTex(c, true);
}
function buildLava() {
    const t = lavaTexture(); t.repeat.set(3, 9);
    const mat = new THREE.MeshStandardMaterial({ map: t, emissiveMap: t, emissive: 0xff5a10, emissiveIntensity: 1.3, roughness: 0.6 });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(20, 67), mat); m.rotation.x = -Math.PI / 2; m.position.set(0, LAVA_Y, -28.5); L.root.add(m);
    S.lava = { mesh: m, tex: t, mat: mat };
}
function stone(x, z, s, top, col) { return addCrispBlock(x, top / 2, z, s, top, s, col || 0x4a3a34, 0x300800); }
function slab(x, y, z, w, d, col, edge) { return addCrispBlock(x, y, z, w, 0.3, d, col, edge || 0x300800); }

function buildCourse() {
    // A: kamienne słupy
    [[0.8, -1.4, 1.4, 1.4], [-1.0, -3.6, 1.3, 1.8], [0.6, -5.8, 1.2, 2.2], [2.4, -7.9, 1.2, 1.9], [0.6, -10.0, 1.3, 2.4], [-1.4, -12.1, 1.4, 2.0]].forEach(p => stone(p[0], p[1], p[2], p[3]));
    // B: płyty, które zapadają się pod graczem
    [[0.2, -14.6], [2.2, -17.0], [0.0, -19.4], [-2.0, -21.8]].forEach(p => {
        const m = slab(p[0], 2.0, p[1], 1.8, 1.8, 0x7a4a30, 0xff6a20);
        const ob = L.obstacles[L.obstacles.length - 1];
        S.sinkers.push({ mesh: m, ob: ob, y0: 2.0, y: 2.0, x0: p[0], t: 0, state: 'idle' });
    });
    checkpoint(0, 2.0, -25.0, 4, 3);
    // C: ruchome platformy (przesuwają się na boki i niosą gracza)
    [[-28.6, 0], [-31.8, 2.1], [-35.0, 4.2]].forEach((p, i) => {
        const m = slab(0, 2.3, p[0], 2.0, 2.0, 0x5a5a6a, 0x80a0ff);
        const ob = L.obstacles[L.obstacles.length - 1];
        S.movers.push({ mesh: m, ob: ob, z: p[0], ph: p[1], x: 0, dx: 0 });
    });
    slab(0, 2.4, -38.6, 2.5, 2.5, 0x4a3a34);
    // D: platforma, trampolina z obsydianu i liny nad lawą
    slab(0, 2.6, -41.4, 1.6, 1.6, 0x4a3a34);
    const tramp = addCrispBlock(-2.4, 1.0, -42.6, 1.6, 0.4, 1.6, 0x1a1020, 0xc040ff);
    L.trampolines.push({ box3: L.obstacles[L.obstacles.length - 1].box3 });
    tramp.material.emissive = new THREE.Color(0x400060);
    for (const z of [-44.4, -47.0, -49.6]) rope(0.3, z, 2.4);
    stone(1.8, -46.2, 0.9, 1.2, 0x3a2a24);   // ratunkowe kamyki pod linami (trudne, ale możliwe)
    stone(-1.4, -48.6, 0.9, 1.2, 0x3a2a24);
    checkpoint(0, 2.4, -53.6, 4, 3);
    // E: wspinaczka do drzwi EXIT na wysokości 7 m
    [[1.6, -56.4, 1.2, 3.4], [-1.0, -57.6, 1.0, 4.4], [1.2, -58.8, 1.0, 5.5]].forEach(p => addCrispBlock(p[0], p[3] - 0.15, p[1], p[2], 0.3, p[2], 0x4a3a34, 0x300800));
    addCrispBlock(0, 6.8, -61, 4, 0.4, 2, 0x5a4a44, 0x60ff90);
}
function checkpoint(x, y, z, w, d) {
    slab(x, y, z, w, d, 0x2a5a2a, 0x60ff60);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.7, 0.04, 8, 32), new THREE.MeshBasicMaterial({ color: 0x60ff60 }));
    ring.rotation.x = -Math.PI / 2; ring.position.set(x, y + 0.17, z); L.root.add(ring);
    S.checkpoints.push([x, y + 0.6, z]);
}
function rope(x, z, bottom) {
    const len = 24 - bottom, g = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color: 0x3a2a1a, roughness: 0.9 });
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, len, 8), mat); m.castShadow = true; g.add(m);
    const knot = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 8), mat); knot.position.y = -len / 2; g.add(knot);
    L.root.add(g);
    const body = addBody(new CANNON.Body({ mass: 10, shape: new CANNON.Box(new CANNON.Vec3(0.08, len / 2, 0.08)), material: physicsMat, position: new CANNON.Vec3(x, 24 - len / 2, z), linearDamping: 0.3, angularDamping: 0.3, collisionFilterGroup: GROUP.ROPE, collisionFilterMask: GROUP.ENV }));
    const anchor = addBody(new CANNON.Body({ mass: 0, position: new CANNON.Vec3(x, 24, z) }));
    addConstraint(new CANNON.PointToPointConstraint(body, new CANNON.Vec3(0, len / 2, 0), anchor, new CANNON.Vec3(0, 0, 0)));
    L.ropes.push({ mesh: g, body: body, halfHeight: len / 2 });
}
// Zwęglone manekiny po pas w lawie, sięgające w stronę gracza
function buildMannequins() {
    const charMat = new THREE.MeshStandardMaterial({ color: 0x1a1210, roughness: 0.95, emissive: 0x3a0800, emissiveIntensity: 0.6 });
    [[-6, -9], [6.5, -18], [-5.5, -30], [6, -40], [-6.5, -50], [5, -57]].forEach((p, i) => {
        const m = buildMannequin(T.mkRng(300 + i));
        m.group.traverse(o => { if (o.isMesh && o.material && o.material.map) o.material = charMat; });
        m.group.position.set(p[0], -0.7, p[1]); L.root.add(m.group);
        S.mannequins.push(m);
    });
}
function makeFlash() {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(3, 3), new THREE.MeshBasicMaterial({ color: 0xff3a00, transparent: true, opacity: 0, depthTest: false }));
    m.position.z = -0.26; m.renderOrder = 997; camera.add(m);
    return m;
}

// ---------- ZDARZENIA ----------
function burn() {
    S.burns++; S.grace = 1.2; S.flash = 1;
    SFX.ballHit(1, { x: S.body.position.x, y: LAVA_Y, z: S.body.position.z }); SFX.creak(0.5);
    buzz('both', 0.9, 300);
    releaseAll();
    const cp = S.checkpoints[S.cp];
    setPlayerPosition(cp[0], cp[1] + 0.3, cp[2]);
    toast(S.cp ? 'Burned! Back to checkpoint ' + S.cp : 'Burned! Back to the start', '#ff6a2a');
}
function finish() {
    if (S.leaving) return;
    S.leaving = true;
    toast('You crossed the lava!', '#7fc47f');
    levelReward('lava', REWARD_FIRST, REWARD_REPEAT, 'lava crossing');
    recordTime('lava', S.runT);
    if (S.burns === 0) unlockAchievement('lava_walker');
}
const INTRO = [
    'The floor is lava. Do not touch it, not even with your hands.',
    'Jump across the stone pillars, ride the moving platforms and swing on the ropes.',
    'Cracked orange platforms sink a moment after you land. Keep moving.',
    'Green platforms are checkpoints. If you burn, you come back to the last one.',
    'Every now and then the lava rises. Stay high.',
    'You are heavier here: one jump at a time. Reach the EXIT door at the far end. The GAMES door behind you takes you back.'
];
function fmt(t) { t = Math.max(0, Math.floor(t)); return Math.floor(t / 60) + ':' + String(t % 60).padStart(2, '0'); }
function drawHud() {
    const x = S.hud.ctx; panelBg(S.hud, 'rgba(20,6,2,0.72)');
    x.textBaseline = 'middle'; x.textAlign = 'left';
    x.font = 'bold 80px "Courier New", monospace'; x.fillStyle = '#ffd8b0'; x.fillText(fmt(S.runT), 30, 74);
    x.font = 'bold 34px "Courier New", monospace'; x.fillStyle = S.burns ? '#ff8a4a' : '#9aff60';
    x.fillText('Burns ' + S.burns, 330, 52);
    x.fillStyle = '#9aff60'; x.fillText('Checkpoint ' + S.cp + '/2', 600, 52);
    x.font = 'bold 28px "Courier New", monospace';
    if (S.surgeT > 0) { x.fillStyle = '#ff4a2a'; x.fillText('The lava rises! Stay high!', 30, 162); }
    else { x.fillStyle = '#ffb070'; x.fillText('Do not touch the floor.', 30, 162); }
    S.hud.update();
}

// ---------- CO KLATKĘ ----------
export function update(dt, t, ctx) {
    if (!S || S.leaving) return;
    S.clock += dt; S.ctx = ctx; S.body = ctx.body;
    const p = ctx.body.position;
    if (S.introT > 0) {
        S.introT -= dt;
        const sec = Math.max(0, Math.ceil(S.introT));
        if (sec !== S.intro.last) { S.intro.last = sec; drawInstructions(S.intro, 'Floor is Lava', INTRO, 'Go in ' + sec + ' s', { bg: 'rgba(20,6,2,0.9)', border: '#ff6a2a', title: '#ffd8b0', text: '#f4e0d0', footer: '#ffb030', size: 30 }); }
        S.intro.mesh.visible = S.introT > 0;
        if (S.introT <= 0) { S.phase = 'play'; toast('Go! Do not touch the floor.', '#ffb070'); }
    }
    if (S.phase === 'play') S.runT += dt;
    ctx.body.velocity.y -= EXTRA_GRAVITY * dt;   // mocniejsza grawitacja

    // Lawa: falowanie, pulsowanie i wzbieranie
    S.nextSurge -= dt;
    if (S.nextSurge <= 0) { S.nextSurge = SURGE_MIN + Math.random() * (SURGE_MAX - SURGE_MIN); S.surgeT = 7; SFX.roar(0.7, { x: p.x, y: 0, z: p.z - 4 }); toast('The lava rises!', '#ff4a2a'); }
    let target = LAVA_Y;
    if (S.surgeT > 0) { S.surgeT -= dt; target = LAVA_Y + SURGE_UP * Math.min(1, Math.min(7 - S.surgeT, S.surgeT) / 1.5); }
    S.lavaY = target;
    S.lava.mesh.position.y = S.lavaY;
    S.lava.tex.offset.set(Math.sin(t * 0.05) * 0.1, (t * 0.01) % 1);
    S.lava.mat.emissiveIntensity = 1.2 + 0.25 * Math.sin(t * 1.7);
    const e = S.embers; for (let i = 0; i < e.n; i++) { e.pos[i * 3 + 1] += dt * (0.4 + (i % 7) * 0.08); if (e.pos[i * 3 + 1] > 14) e.pos[i * 3 + 1] = 0.3; }
    e.geo.attributes.position.needsUpdate = true;

    // Zapadające się płyty: chwilę po wejściu drżą, toną w lawie, po kilku sekundach wracają
    for (const sk of S.sinkers) {
        const b = sk.ob.box3, on = p.x > b.min.x - 0.2 && p.x < b.max.x + 0.2 && p.z > b.min.z - 0.2 && p.z < b.max.z + 0.2 && Math.abs(p.y - 0.35 - b.max.y) < 0.25;
        let ny = sk.y;
        if (sk.state === 'sinking') { ny = sk.y - SINK_SPEED * dt; if (ny <= -1) { ny = -1; sk.state = 'gone'; sk.t = SINK_RESET; } }
        else if (sk.state === 'gone') { sk.t -= dt; if (sk.t <= 0) sk.state = 'rising'; }
        else if (sk.state === 'rising') { ny = Math.min(sk.y0, sk.y + 2 * dt); if (ny >= sk.y0) { sk.state = 'idle'; sk.t = 0; } }
        else { sk.t = on ? sk.t + dt : 0; if (sk.t > SINK_DELAY) sk.state = 'sinking'; }
        const d = ny - sk.y; sk.y = ny;
        sk.mesh.position.y = ny; b.min.y += d; b.max.y += d;
        sk.mesh.position.x = sk.x0 + (sk.state === 'idle' && sk.t > 0 ? (Math.random() - 0.5) * 0.04 : 0);   // drży przed zapadnięciem
    }
    // Ruchome platformy niosą gracza
    for (const m of S.movers) {
        const nx = Math.sin(t * MOVE_SPEED + m.ph) * MOVE_AMP, d = nx - m.x, b = m.ob.box3;
        const on = p.x > b.min.x - 0.1 && p.x < b.max.x + 0.1 && p.z > b.min.z - 0.1 && p.z < b.max.z + 0.1 && Math.abs(p.y - 0.35 - b.max.y) < 0.2;
        m.x = nx; m.mesh.position.x = nx; b.min.x += d; b.max.x += d;
        if (m.ob.body) m.ob.body.position.x = nx;
        if (on) p.x += d;
    }
    // Manekiny w lawie obracają głowy za graczem
    camera.getWorldPosition(_c);
    for (const m of S.mannequins) m.head.rotation.y += (Math.atan2(_c.x - m.group.position.x, _c.z - m.group.position.z) - m.group.rotation.y - m.head.rotation.y) * Math.min(1, dt * 0.8);

    // Punkty kontrolne: wystarczy na nich stanąć
    for (let i = S.cp + 1; i < S.checkpoints.length; i++) {
        const c = S.checkpoints[i];
        if (Math.abs(p.x - c[0]) < 2 && Math.abs(p.z - c[2]) < 1.5 && Math.abs(p.y - c[1]) < 0.6) { S.cp = i; SFX.fuse(); toast('Checkpoint ' + i + '/2', '#7fc47f'); }
    }
    // Dotknięcie lawy (ciałem albo dłonią) = poparzenie
    if (S.grace > 0) S.grace -= dt;
    else {
        const handLow = hands.L && (hands.L.position.y < S.lavaY + 0.1 || hands.R.position.y < S.lavaY + 0.1);
        if (p.y - 0.35 < S.lavaY + 0.12 || handLow) burn();
    }
    if (S.flash > 0) { S.flash -= dt * 1.5; S.flashPanel.material.opacity = Math.max(0, S.flash) * 0.6; }
    S.hudT -= dt; if (S.hudT <= 0) { S.hudT = 0.15; drawHud(); }
}

export function dispose() {
    if (S) { S.hud.dispose(); S.intro.dispose(); camera.remove(S.flashPanel); }
    L.moveScale = 1; L.maxUp = 99; L.maxSpeedXZ = 0;
    S = null;
}
