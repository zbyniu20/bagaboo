// ==========================================
// POZIOM 5: BURNING MEMORY (poziom pamięciowy)
// Wielki, straszny basen lawy w jaskini. Trasa to 20 rzędów po 3 kwadraty nad lawą.
// W każdym rzędzie: jeden kwadrat stoi (dobry), jeden zapada się powoli (zdążysz przeskoczyć),
// jeden zapada się od razu. Układ jest losowy przy każdym wejściu, ale po śmierci zostaje ten sam
// (trzeba go zapamiętać). W multiplayerze cała drużyna ma ten sam tor.
// Lawowa Bestia wynurza się na starcie i po 10 sekundach przewagi rusza w pościg.
// Dotknięcie lawy = Bestia pojawia się obok w 1 sekundę i spala gracza na popiół.
// ==========================================
import { THREE, L, tex, camera, addCrispBlock, lighting } from '../core/engine.js';
import * as T from '../core/textures.js';
import { levelReward, recordTime } from '../core/economy.js';
import { toast } from '../core/terminal.js';
import { hands, releaseAll, setPlayerPosition } from '../core/player.js';
import * as SFX from '../core/audio.js';
import { buzz } from '../core/haptics.js';
import { lavaBeast } from '../core/monsterskins.js';
import { ARRIVAL_FROM_MEMORY } from './levels.js';
import { buildDoor, cameraPanel, panelBg, drawInstructions, createJumpscare, introSeen } from '../core/levelkit.js';

// ---------- USTAWIENIA ----------
// 6 ścieżek po 20 kamieni wypełnia prawie cały basen. Kamienie 1,5 x 1,5 m, między nimi 1,1 m lawy
// (w bok i do przodu), więc między kamieniami trzeba skakać, nie da się przejść ani przebiec.
// Z kamienia doskoczysz na kamień przed sobą, na skos (lewo/prawo) i w bok; linii dalej już nie.
const ROWS = 20, COLS = 6, SQ = 1.5, PITCH = 2.6, TOP = 1.0;
const COL_X = Array.from({ length: COLS }, (_, i) => (i - (COLS - 1) / 2) * PITCH);   // -6,5 ... 6,5
const ROW_DZ = PITCH, FIRST_Z = -2.0, LAVA_Y = 0.2;
const LAST_Z = FIRST_Z - (ROWS - 1) * ROW_DZ;            // ostatnia linia
const START_EDGE = FIRST_Z + SQ / 2 + 1.1;               // ląd startowy kończy się 1,1 m przed pierwszą linią
const END_EDGE = LAST_Z - SQ / 2 - 1.1;                  // ląd końcowy zaczyna się 1,1 m za ostatnią linią
const BACK_Z = END_EDGE - 5.8;                           // ściana z drzwiami EXIT
const POOL_C = (8.5 + BACK_Z) / 2, POOL_L = 8.5 - BACK_Z;   // środek i długość jaskini
const SLOW_DELAY = 0.35, SLOW_SPEED = 0.45;              // powolny kwadrat: zaczyna tonąć po chwili, ok. 2 s do lawy
const FAST_SPEED = 5;                                    // szybki: wpada od razu
const HEAD_START = 10, INTRO_TIME = 10;                  // 10 s instrukcji (tylko za pierwszym razem) + 10 s przewagi
const PREVIEW_TIME = 10;                                 // 10 s podglądu z góry: jasno, dobre kamienie świecą na zielono, gracz stoi w miejscu
const SCARE_MIN = 5, SCARE_MAX = 8;                      // jumpscare losowo co 5-8 linii (ok. 3 na całą trasę)
const BEAST_SPEED = 1.8, BEAST_MAX = 2.9, BEAST_RAMP = 40;   // Bestia: m/s, przyspiesza przez 40 s
const CATCH_DIST = 1.7, ARRIVE_TIME = 1.0;               // po wpadnięciu do lawy Bestia jest przy tobie w 1 s
// Ograniczony skok (ok. 2,3 m lotu): przerwa 1,1 m (także na skos) w zasięgu, linia albo kolumna dalej (3,7 m) już nie
const MOVE_SCALE = 0.95, MAX_UP = 4.0, MAX_SPEED_XZ = 4.0, EXTRA_GRAVITY = 4.0;
const REWARD_FIRST = 2200, REWARD_REPEAT = 220;
export const info = { id: 'memory', name: 'Burning Memory', spawn: [0, 1.4, 3.0] };
let S = null;
const _c = new THREE.Vector3();

// ---------- BUDOWA ----------
export function build() {
    const seed = L.levelSeed !== undefined ? L.levelSeed : (Math.random() * 1e9) | 0, R = T.mkRng(seed);
    L.levelId = 'memory-' + seed;
    L.spawn = info.spawn.slice();
    L.bounds = { minX: -9.4, maxX: 9.4, minZ: BACK_Z + 0.4, maxZ: 7.6, maxY: 13.5 };
    L.moveScale = MOVE_SCALE; L.maxUp = MAX_UP; L.maxSpeedXZ = MAX_SPEED_XZ;
    S = { seed: seed, clock: 0, runT: 0, introT: INTRO_TIME, phase: 'intro', previewT: PREVIEW_TIME, nextScareRow: SCARE_MIN + Math.floor(Math.random() * (SCARE_MAX - SCARE_MIN + 1)), chaseT: -HEAD_START, rows: [], row: -1, dead: null, hudT: 0, leaving: false, fx: [], flick: [] };
    buildCave(R);
    buildLava();
    buildTrack(R);
    buildDecor(R);
    buildDoor({ x: 0, z: 8.47, rotY: Math.PI, label: 'LEVELS', color: '#ffb070', wood: 0x3a2420, portal: { target: 'levels', spawn: ARRIVAL_FROM_MEMORY, onEnter: () => toast('Back to the levels') } });
    buildDoor({ x: 0, y: TOP, z: BACK_Z + 0.03, rotY: 0, label: 'EXIT', color: '#70ff90', glow: 0x60ff90, wood: 0x2a3a2a, light: true,
        portal: { target: 'levels', spawn: ARRIVAL_FROM_MEMORY, onEnter: finish } });
    buildBeast();
    buildBurnFx();
    S.hud = cameraPanel(1024, 200, 0.42, 0.082, 0.2, -0.75, 990);
    S.intro = cameraPanel(1280, 820, 1.0, 0.64, -0.04, -1.05, 995); S.intro.last = -1;
    // Jumpscare z paszczą Bestii (co 5-8 linii)
    // Paszcza Bestii na wysokości oczu, tuż przed twarzą, z ognistym błyskiem i świecącymi oczami
    S.scare = createJumpscare({ head: lavaBeast().group, scale: 1.0, y: -0.06, restZ: -0.48, fromZ: -2.4, tilt: -0.1, eyes: false, flash: 0xff4a08 });
    // Mocne światło na czas podglądu z góry
    S.previewLight = new THREE.PointLight(0xffe0c0, 0, 70, 1.2); S.previewLight.position.set(0, 13, (START_EDGE + LAST_Z) / 2); L.root.add(S.previewLight);
    S.introSkip = introSeen('memory'); if (S.introSkip) S.introT = 0;   // samouczek tylko za pierwszym razem
}
function buildCave(R) {
    const rock = 0x3a2420, edge = 0x601808;
    addCrispBlock(0, -2.5, POOL_C, 22, 5, POOL_L + 2, 0x1a0c08, 0x400800);                             // dno basenu pod lawą
    addCrispBlock(0, 14.5, POOL_C, 22, 1, POOL_L + 2, 0x1a1010, 0x200404);                             // sklepienie
    for (const s of [-1, 1]) addCrispBlock(s * 10.5, 7, POOL_C, 1, 14, POOL_L + 2, rock, edge, tex.wall);
    addCrispBlock(0, 7, 9, 22, 14, 1, rock, edge, tex.wall);
    addCrispBlock(0, 7, BACK_Z - 0.5, 22, 14, 1, rock, edge, tex.wall);
    addCrispBlock(0, TOP / 2, (8.5 + START_EDGE) / 2, 20, TOP, 8.5 - START_EDGE, 0x4a3430, edge, tex.floor);   // ląd startowy
    addCrispBlock(0, TOP / 2, (END_EDGE + BACK_Z) / 2, 20, TOP, END_EDGE - BACK_Z, 0x4a3430, edge, tex.floor);  // ląd końcowy
    // Stalaktyty zwisające ze sklepienia
    const st = new THREE.MeshStandardMaterial({ color: 0x241612, roughness: 0.9 });
    for (let i = 0; i < 70; i++) { const h = 1 + R() * 3.5, c = new THREE.Mesh(new THREE.ConeGeometry(0.15 + R() * 0.4, h, 6), st); c.rotation.x = Math.PI; c.position.set((R() * 2 - 1) * 9.5, 14 - h / 2, 8 - R() * POOL_L); L.root.add(c); }
}
function lavaTexture() {
    const S2 = 512, c = T.makeCanvas(S2, S2), x = c.getContext('2d'), R = T.mkRng(4040);
    x.fillStyle = '#ff5a08'; x.fillRect(0, 0, S2, S2);
    for (let i = 0; i < 30; i++) T.radial(x, R() * S2, R() * S2, 40 + R() * 90, 'rgba(255,230,90,0.6)', 'rgba(255,230,90,0)');
    for (let i = 0; i < 130; i++) { const px = R() * S2, py = R() * S2, r = 14 + R() * 30; x.fillStyle = 'rgba(24,4,2,' + (0.6 + R() * 0.35) + ')'; x.beginPath(); for (let k = 0; k < 7; k++) { const a = k / 7 * 6.28, rr = r * (0.7 + R() * 0.4); if (k) x.lineTo(px + Math.cos(a) * rr, py + Math.sin(a) * rr); else x.moveTo(px + Math.cos(a) * rr, py + Math.sin(a) * rr); } x.closePath(); x.fill(); }
    return T.toTex(c, true);
}
function buildLava() {
    const t = lavaTexture(); t.repeat.set(3, 9);
    const mat = new THREE.MeshStandardMaterial({ map: t, emissiveMap: t, emissive: 0xff4a08, emissiveIntensity: 1.4, roughness: 0.6 });
    const len = POOL_L, m = new THREE.Mesh(new THREE.PlaneGeometry(20, len), mat);
    m.rotation.x = -Math.PI / 2; m.position.set(0, LAVA_Y, POOL_C); L.root.add(m);
    S.lava = { tex: t, mat: mat };
    for (let z = 2; z > BACK_Z; z -= 11) { const l = new THREE.PointLight(0xff5a1a, 40, 22, 1.6); l.position.set(0, 1.5, z); L.root.add(l); }
    // Iskry nad lawą
    const n = 400, pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { pos[i * 3] = (Math.random() * 2 - 1) * 9.5; pos[i * 3 + 1] = Math.random() * 10; pos[i * 3 + 2] = 8 - Math.random() * len; }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const pts = new THREE.Points(geo, new THREE.PointsMaterial({ size: 0.06, map: tex.dot, color: 0xffa040, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    pts.frustumCulled = false; L.root.add(pts); S.embers = { geo: geo, pos: pos, n: n };
}
// Tor: 20 rzędów, w każdym losowo: dobry, powoli tonący i od razu tonący kwadrat
// W każdej linii: 2 dobre, 2 tonące powoli i 2 wpadające od razu (losowo, ale zawsze z przejściem):
// dwie "bezpieczne ścieżki" idą przez basen i w każdej linii przesuwają się najwyżej o jedną kolumnę,
// więc z każdego dobrego kamienia jest skok na dobry kamień w następnej linii.
function buildTrack(R) {
    const step = (c) => Math.max(0, Math.min(COLS - 1, c + Math.floor(R() * 3) - 1));
    let a = Math.floor(R() * COLS), b = Math.floor(R() * COLS);
    for (let r = 0; r < ROWS; r++) {
        const pb = b;
        if (r > 0) { a = step(a); b = step(b); }
        if (a === b) {   // dwa różne dobre kamienie w linii; druga ścieżka zostaje w zasięgu skoku ze swojego poprzedniego kamienia
            const opts = [a - 1, a + 1].filter(c => c >= 0 && c < COLS && (r === 0 || Math.abs(c - pb) <= 1));
            b = opts[Math.floor(R() * opts.length)];
        }
        const rest = ['slow', 'slow', 'fast', 'fast'];
        for (let i = 3; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [rest[i], rest[j]] = [rest[j], rest[i]]; }
        const z = FIRST_Z - r * ROW_DZ, row = [];
        COL_X.forEach((x, c) => {
            const kind = c === a || c === b ? 'solid' : rest.pop();
            const m = addCrispBlock(x, TOP / 2 - 0.5, z, SQ, TOP + 1, SQ, 0x5a4038, 0xff4a10, tex.floor);   // jednakowe z wyglądu: trzeba zapamiętać, które są dobre
            const ob = L.obstacles[L.obstacles.length - 1];
            row.push({ m: m, ob: ob, kind: kind, x: x, z: z, y: 0, t: 0, state: 'up' });
        });
        S.rows.push(row);
    }
}
// Wystrój: czaszki na kolcach, klatki ze szkieletami, łańcuchy, kosze z ogniem, popękane ściany
function buildDecor(R) {
    const bone = new THREE.MeshStandardMaterial({ color: 0xd8ccb0, roughness: 0.7 }), iron = new THREE.MeshStandardMaterial({ color: 0x2a2626, metalness: 0.8, roughness: 0.5 });
    const skull = () => { const g = new THREE.Group(); const h = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 10), bone); h.scale.set(1, 1.1, 1.05); g.add(h); const jaw = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.06, 0.14), bone); jaw.position.set(0, -0.14, 0.04); g.add(jaw); for (const sx of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 6), new THREE.MeshBasicMaterial({ color: 0x080202 })); e.position.set(sx * 0.06, 0.02, 0.13); g.add(e); } return g; };
    // Kolce z czaszkami wzdłuż brzegów basenu
    for (let z = 3; z > BACK_Z + 1; z -= 3.5) for (const s of [-1, 1]) {
        const x = s * (8.5 + R() * 0.8), spike = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.06, 3, 6), iron); spike.position.set(x, 1.5, z); L.root.add(spike);
        const sk = skull(); sk.position.set(x, 3.1, z); sk.rotation.y = -s * Math.PI / 2 + (R() - 0.5); L.root.add(sk);
    }
    // Wiszące klatki ze szkieletami nad lawą
    for (let i = 0; i < 6; i++) {
        const g = new THREE.Group(), x = (R() < 0.5 ? -1 : 1) * (4 + R() * 4), z = -4 - i * 7.5, y = 6 + R() * 3;
        for (let k = 0; k < 8; k++) { const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 1.6, 4), iron); const a = k / 8 * Math.PI * 2; bar.position.set(Math.cos(a) * 0.45, 0, Math.sin(a) * 0.45); g.add(bar); }
        for (const yy of [-0.8, 0.8]) { const ring = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.02, 6, 20), iron); ring.rotation.x = Math.PI / 2; ring.position.y = yy; g.add(ring); }
        const sk = skull(); sk.position.set(0, -0.55, 0); g.add(sk);
        const rib = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.08, 0.5, 6, 1, true), bone); rib.position.y = -0.3; g.add(rib);
        const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 14 - y - 0.8, 4), iron); chain.position.y = (14 - y - 0.8) / 2 + 0.8; g.add(chain);
        g.position.set(x, y, z); L.root.add(g); S.flick.push({ cage: g, ph: R() * 6 });
    }
    // Kosze z ogniem na lądzie (migoczące światła)
    for (const [x, z] of [[-8, 5], [8, 5], [-8, BACK_Z + 2], [8, BACK_Z + 2]]) {
        const b = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.2, 0.6, 10), iron); b.position.set(x, TOP + 0.3, z); L.root.add(b);
        const f = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex.dot, color: 0xff8020, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); f.scale.set(1.4, 2, 1); f.position.set(x, TOP + 1.1, z); L.root.add(f);
        const l = new THREE.PointLight(0xff7020, 18, 12, 1.8); l.position.set(x, TOP + 1.4, z); L.root.add(l);
        S.flick.push({ light: l, sprite: f, ph: R() * 6 });
    }
    // Ostrzeżenie namalowane na ścianie nad startem
    const c = T.makeCanvas(1024, 160), x = c.getContext('2d');
    x.font = '96px Creepster, serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.shadowColor = '#ff2000'; x.shadowBlur = 20; x.fillStyle = '#c01008'; x.fillText('REMEMBER OR BURN', 512, 84);
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(8, 1.25), new THREE.MeshBasicMaterial({ map: T.toTex(c, false), transparent: true, toneMapped: false }));
    sign.position.set(0, 9, BACK_Z + 0.03); L.root.add(sign);
}

// ---------- LAWOWA BESTIA ----------
function buildBeast() {
    const b = lavaBeast(); b.group.scale.setScalar(2.6); L.root.add(b.group);
    const glow = new THREE.PointLight(0xff5010, 20, 10, 1.6); b.group.add(glow); glow.position.set(0, -0.6, 0.6);
    // Wynurza się z lawy z boku, między lądem startowym a pierwszym rzędem
    S.beast = { m: b, x: 5.5, z: START_EDGE - 2.5, y: -6, speed: BEAST_SPEED, roarT: 3, rising: true };
    b.group.position.set(5.5, -6, START_EDGE - 2.5);
}
// Efekty spalenia: pomarańczowy ekran, płomienie przed oczami, potem szary popiół
function buildBurnFx() {
    const plane = (col, order) => { const p = new THREE.Mesh(new THREE.PlaneGeometry(3, 3), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0, depthTest: false })); p.position.z = -0.27; p.renderOrder = order; camera.add(p); return p; };
    const flames = [];
    for (let i = 0; i < 16; i++) { const f = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex.dot, color: i % 3 ? 0xff6a10 : 0xffd040, transparent: true, blending: THREE.AdditiveBlending, depthTest: false, opacity: 0 })); f.renderOrder = 1002; f.scale.set(0.4, 0.6, 1); camera.add(f); flames.push({ s: f, x: (Math.random() - 0.5) * 1.2, ph: Math.random() }); }
    const n = 200, pos = new Float32Array(n * 3);
    const ash = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(pos, 3)), new THREE.PointsMaterial({ map: tex.dot, color: 0x9a9490, size: 0.03, transparent: true, depthTest: false, opacity: 0 }));
    ash.renderOrder = 1003; ash.frustumCulled = false; camera.add(ash);
    S.burn = { orange: plane(0xff4a00, 1000), grey: plane(0x2a2826, 1001), flames: flames, ash: ash, ashPos: pos };
}

// ---------- ZDARZENIA ----------
function die(cause) {
    if (S.dead) return;
    S.dead = { t: 0, cause: cause };
    releaseAll(); S.phase = 'dead';
    // Bestia w ciągu sekundy pojawia się tuż przy graczu
    const p = S.body.position;
    S.beast.fromX = S.beast.x; S.beast.fromZ = S.beast.z; S.beast.toX = p.x + 0.4; S.beast.toZ = p.z - 1.3;
    SFX.roar(1.0, { x: p.x, y: 1, z: p.z - 1 }); buzz('both', 1, 600);
    toast(cause === 'lava' ? 'You touched the lava...' : 'The beast caught you...', '#ff4a10');
}
function finish() {
    if (S.leaving) return; S.leaving = true;
    toast('You crossed the burning path!', '#7fc47f');
    levelReward('memory', REWARD_FIRST, REWARD_REPEAT, 'crossing Burning Memory');
    recordTime('memory', S.runT);
}
const INTRO = [
    'A lava beast lives in this pool. Cross 20 lines of stones to reach the EXIT.',
    'Every line has 6 stones: 2 stay, 2 sink slowly and 2 drop at once. They all look the same.',
    'First you see the path from above for 10 seconds: the green stones are safe. Remember them!',
    'There is lava between all stones: jump forward, diagonally or sideways, one stone at a time.',
    'The beast starts 10 seconds after your first jump. Touch the lava and it is on you in a second.'
];

// ---------- CO KLATKĘ ----------
export function update(dt, t, ctx) {
    if (!S || S.leaving) return;
    S.clock += dt; S.ctx = ctx; S.body = ctx.body;
    const p = ctx.body.position;
    ctx.body.velocity.y -= EXTRA_GRAVITY * dt;
    // Lawa i iskry
    S.lava.tex.offset.set(Math.sin(t * 0.05) * 0.1, (t * 0.012) % 1);
    S.lava.mat.emissiveIntensity = 1.3 + 0.3 * Math.sin(t * 1.6);
    const e = S.embers; for (let i = 0; i < e.n; i++) { e.pos[i * 3 + 1] += dt * (0.4 + (i % 5) * 0.1); if (e.pos[i * 3 + 1] > 10) e.pos[i * 3 + 1] = 0.3; }
    e.geo.attributes.position.needsUpdate = true;
    for (const f of S.flick) { if (f.light) { const k = 0.7 + 0.3 * Math.sin(t * 13 + f.ph) * Math.sin(t * 7 + f.ph); f.light.intensity = 18 * k; f.sprite.scale.y = 1.6 + 0.6 * k; } if (f.cage) f.cage.rotation.y = Math.sin(t * 0.4 + f.ph) * 0.3; }
    S.beast.m.animate(t);
    if (S.dead) { updateDeath(dt, t); return; }

    // Instrukcja i wynurzanie się Bestii
    S.scare.update(dt);
    if (S.phase === 'intro') {
        S.introT -= dt;
        const sec = Math.max(0, Math.ceil(S.introT));
        if (sec !== S.intro.last && !S.introSkip) { S.intro.last = sec; drawInstructions(S.intro, 'Burning Memory', INTRO, 'Starting in ' + sec + ' s', { bg: 'rgba(20,4,2,0.9)', border: '#ff4a10', title: '#ffd0b0', text: '#f4e0d0', footer: '#ffb030', size: 29 }); }
        S.intro.mesh.visible = S.introT > 0 && !S.introSkip;
        if (S.introT <= 0) startPreview();
    }
    if (S.phase === 'preview') {
        // Podgląd z góry: gracz wisi nad środkiem basenu i nie może się ruszać, dobre kamienie świecą na zielono
        S.previewT -= dt;
        ctx.body.position.set(0, 12, (START_EDGE + LAST_Z) / 2 + 10); ctx.body.velocity.set(0, 0, 0);
        const k = Math.min(1, S.previewT / 1.5);   // ostatnie 1,5 s: przyciemnianie
        S.previewLight.intensity = 140 * k; lighting.hemi.intensity = S.hemiBase * (1 + 2 * k);
        for (const row of S.rows) for (const st of row) if (st.kind === 'solid') st.m.material.emissiveIntensity = 1.2 * k;
        if (S.previewT <= 0) endPreview();
    }
    const B = S.beast;
    if (B.rising) { B.y = Math.min(-0.9, B.y + dt * 1.2); B.roarT -= dt; if (B.roarT <= 0) { B.roarT = 99; SFX.roar(1.0, { x: B.x, y: 1, z: B.z }); buzz('both', 0.6, 500); } if (B.y >= -0.9) B.rising = false; }
    if (S.phase === 'run') {
        // Na lądzie startowym gracz jest bezpieczny: przewaga, pościg i jumpscare'y ruszają dopiero po wejściu na pierwszy kamień
        const onStartLand = p.z > START_EDGE - 0.15;
        if (S.row >= 0) { S.runT += dt; S.chaseT += dt; }
        // Po 10 s przewagi Bestia brodzi przez lawę za graczem i przyspiesza
        if (S.chaseT > 0 && !onStartLand) {
            B.speed = BEAST_SPEED + (BEAST_MAX - BEAST_SPEED) * Math.min(1, S.chaseT / BEAST_RAMP);
            const dx = p.x - B.x, dz = p.z - B.z, d = Math.hypot(dx, dz);
            if (d > 0.1) { B.x += dx / d * Math.min(d, B.speed * dt); B.z += dz / d * Math.min(d, B.speed * dt); }
            if (d < CATCH_DIST && p.y < 4) die('beast');
            if (Math.floor(S.chaseT * 1.5) !== B.step) { B.step = Math.floor(S.chaseT * 1.5); SFX.step(1.0, { x: B.x, y: 0, z: B.z }); }
            const dist = Math.hypot(p.x - B.x, p.z - B.z); if (dist < 12) SFX.heartbeat(Math.max(0, 1 - dist / 12));
        }
    }
    B.m.group.position.set(B.x, B.y + Math.sin(t * 2) * 0.1, B.z);
    B.m.group.rotation.y = Math.atan2(p.x - B.x, p.z - B.z);

    // Kwadraty: stanięcie na nich (albo dotknięcie dłonią) uruchamia ich zachowanie
    const feet = p.y - 0.35;
    for (let r = 0; r < ROWS; r++) for (const s of S.rows[r]) {
        const b = s.ob.box3, over = Math.abs(p.x - s.x) < SQ / 2 + 0.2 && Math.abs(p.z - s.z) < SQ / 2 + 0.2;
        const standing = over && Math.abs(feet - b.max.y) < 0.25;
        const touched = standing || [hands.L, hands.R].some(h => h && b.distanceToPoint(h.position) < 0.12);
        if (s.state === 'up' && touched && S.phase === 'run') {
            if (s.kind === 'fast') { s.state = 'sinking'; s.speed = FAST_SPEED; SFX.creak(0.8, { x: s.x, y: 1, z: s.z }); }
            else if (s.kind === 'slow') { s.state = 'wait'; s.t = 0; }
            if (standing && r > S.row) {
                S.row = r;
                if (r + 1 >= S.nextScareRow) { S.nextScareRow += SCARE_MIN + Math.floor(Math.random() * (SCARE_MAX - SCARE_MIN + 1)); S.scare.trigger(); buzz('both', 1, 400); }   // jumpscare co 5-8 linii
            }
        }
        if (s.state === 'wait') { s.t += dt; s.m.position.x = s.x + (Math.random() - 0.5) * 0.03; if (s.t > SLOW_DELAY) { s.state = 'sinking'; s.speed = SLOW_SPEED; SFX.creak(0.5, { x: s.x, y: 1, z: s.z }); } }
        if (s.state === 'sinking') {
            const d = -s.speed * dt; s.y += d; s.m.position.y += d; b.min.y += d; b.max.y += d;
            if (s.ob.body) s.ob.body.position.y += d;
            if (s.y < -2.5) { s.state = 'gone'; s.m.visible = false; }
        }
    }
    // Dotknięcie lawy ciałem albo dłonią
    if (feet < LAVA_Y + 0.12 || (hands.L && (hands.L.position.y < LAVA_Y + 0.08 || hands.R.position.y < LAVA_Y + 0.08) && p.z < START_EDGE && p.z > END_EDGE)) die('lava');
    S.hudT -= dt; if (S.hudT <= 0) { S.hudT = 0.15; drawHud(); }
}
// Śmierć: Bestia przy graczu w 1 s, płomienie, popiół, potem ten sam tor od nowa
// Podgląd trasy z góry (po samouczku albo od razu po przegranej)
function startPreview() {
    S.phase = 'preview'; S.previewT = PREVIEW_TIME; S.hemiBase = lighting.hemi.intensity;
    releaseAll();
    for (const row of S.rows) for (const st of row) if (st.kind === 'solid') { st.m.material.emissive = new THREE.Color(0x30ff60); st.m.material.emissiveIntensity = 1.2; }
    toast('Memorize the green stones! 10 seconds.', '#7fff90');
}
function endPreview() {
    S.previewLight.intensity = 0; lighting.hemi.intensity = S.hemiBase;
    for (const row of S.rows) for (const st of row) if (st.kind === 'solid') st.m.material.emissiveIntensity = 0;
    setPlayerPosition(info.spawn[0], info.spawn[1], info.spawn[2]);
    S.phase = 'run'; S.chaseT = -HEAD_START;
    toast('Jump on the stones. The beast starts 10 s after your first jump!', '#ff6a2a');
}
function updateDeath(dt, t) {
    const d = S.dead, B = S.beast, bf = S.burn; d.t += dt;
    const k = Math.min(1, d.t / ARRIVE_TIME);
    B.x = B.fromX + (B.toX - B.fromX) * k; B.z = B.fromZ + (B.toZ - B.fromZ) * k; B.y = -0.9 + Math.sin(k * Math.PI) * 0.8;
    // Gracz zastyga i powoli zapada się w lawę
    S.body.velocity.set(0, 0, 0); if (d.cause === 'lava') S.body.position.y = Math.max(LAVA_Y - 0.1, S.body.position.y - dt * 0.4);
    camera.getWorldPosition(_c);
    B.m.group.position.set(B.x, B.y, B.z); B.m.group.rotation.y = Math.atan2(_c.x - B.x, _c.z - B.z);
    if (d.t > ARRIVE_TIME) {
        const f = Math.min(1, (d.t - ARRIVE_TIME) / 0.8);
        bf.orange.material.opacity = 0.55 * f;
        bf.flames.forEach((fl, i) => { const ph = (t * 1.4 + fl.ph) % 1; fl.s.position.set(fl.x + Math.sin(t * 5 + i) * 0.05, -0.5 + ph * 0.9, -0.5 - (i % 4) * 0.05); fl.s.material.opacity = f * (1 - ph); fl.s.scale.set(0.35 + f * 0.3, 0.5 + f * 0.6, 1); });
        if (Math.floor(d.t * 8) !== d.shake) { d.shake = Math.floor(d.t * 8); buzz('both', 0.7, 100); }
        if (!d.screamed) { d.screamed = true; SFX.scare(); }
    }
    if (d.t > ARRIVE_TIME + 1.6) {   // popiół
        const a = Math.min(1, (d.t - ARRIVE_TIME - 1.6) / 0.6);
        bf.grey.material.opacity = 0.9 * a; bf.orange.material.opacity *= (1 - a);
        bf.flames.forEach(fl => fl.s.material.opacity *= (1 - a));
        bf.ash.material.opacity = a;
        for (let i = 0; i < bf.ashPos.length / 3; i++) { if (!d.ashInit) { bf.ashPos[i * 3] = (Math.random() - 0.5) * 1.6; bf.ashPos[i * 3 + 1] = Math.random() * 1.2 - 0.3; bf.ashPos[i * 3 + 2] = -0.4 - Math.random() * 0.4; } bf.ashPos[i * 3 + 1] -= dt * (0.1 + (i % 5) * 0.04); bf.ashPos[i * 3] += Math.sin(t * 2 + i) * dt * 0.05; }
        d.ashInit = true; bf.ash.geometry.attributes.position.needsUpdate = true;
    }
    if (d.t > ARRIVE_TIME + 3.0 && !S.leaving) {
        S.leaving = true; toast('Burned to ash. Same path, try again - remember it!', '#ff6a2a');
        S.ctx.goto('memory', null, { seed: S.seed, noFollow: true });
    }
}
function fmt(s) { s = Math.max(0, Math.floor(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); }
function drawHud() {
    const x = S.hud.ctx; panelBg(S.hud, 'rgba(20,4,2,0.72)');
    x.textBaseline = 'middle'; x.textAlign = 'left';
    x.font = 'bold 78px "Courier New", monospace'; x.fillStyle = '#ffd8b0'; x.fillText(fmt(S.runT), 30, 74);
    x.font = 'bold 36px "Courier New", monospace'; x.fillStyle = '#ffb030'; x.fillText('Row ' + Math.max(0, S.row + 1) + '/' + ROWS, 330, 52);
    x.font = 'bold 28px "Courier New", monospace';
    if (S.phase === 'intro') { x.fillStyle = '#ffb070'; x.fillText('Watch the beast wake up...', 30, 162); }
    else if (S.phase === 'preview') { x.fillStyle = '#7fff90'; x.fillText('Memorize the green path: ' + Math.ceil(S.previewT) + ' s', 30, 162); }
    else if (S.row < 0) { x.fillStyle = '#ffd27a'; x.fillText('Jump on the first stones to start', 30, 162); }
    else if (S.chaseT < 0) { x.fillStyle = '#ffd27a'; x.fillText('The beast hunts you in ' + Math.ceil(-S.chaseT) + ' s', 30, 162); }
    else { x.fillStyle = '#ff4a2a'; x.fillText('THE BEAST IS COMING! Do not stop!', 30, 162); }
    S.hud.update();
}
export function dispose() {
    if (S) { if (S.phase === 'preview') lighting.hemi.intensity = S.hemiBase; S.scare.dispose(); S.hud.dispose(); S.intro.dispose(); for (const o of [S.burn.orange, S.burn.grey, S.burn.ash]) camera.remove(o); S.burn.flames.forEach(f => camera.remove(f.s)); }
    L.moveScale = 1; L.maxUp = 99; L.maxSpeedXZ = 0;
    S = null;
}
