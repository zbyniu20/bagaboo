// ==========================================
// POZIOM 11: THE FUR DEN (legowisko Furasa, pościg)
// Ponury dom z tekturowych ścian, wielkich kłębków włóczki i drapaków, wyściełany skołtunioną sierścią. Znajdź 4 złote ryby, a brama na końcu się otworzy.
// Po legowisku krąży FURAS: kudłaty stwór z kocią maską pełną zębów i ogromnym, puchatym ogonem. Widzi do 16 m (tylko przed sobą i nie przez ściany),
// biegnącego słyszy z 10 m, po utracie wzroku jeszcze kilka sekund "czuje" cię, a o jego bliskości zdradza pomruk. Gdy jest blisko i widzi cię, przykuca (ogon drży), a potem SKACZE: kierunek skoku
// zapada na końcu przykucnięcia, więc wystarczy w ostatniej chwili uskoczyć w bok. Po skoku jest chwilę wolny. Każda ryba przyspiesza Furasa, a po dwóch rybach budzi się drugi (na Nightmare są dwa od początku, trzeci po trzech rybach). Po zebraniu wszystkich ryb Furas wpada w szał.
// Układ jest stały (działa duch). Po każdej rybie zapisuje się punkt kontrolny (Easy i Normal).
// ==========================================
import { THREE, L, tex, addCrispBlock, addInstancedBlocks } from '../core/engine.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import * as T from '../core/textures.js';
import { levelReward, recordTime, diffOf } from '../core/economy.js';
import { toast } from '../core/terminal.js';
import { setPlayerPosition, releaseAll } from '../core/player.js';
import * as SFX from '../core/audio.js';
import { buzz } from '../core/haptics.js';
import { createGhost } from '../core/runkit.js';
import { createEvents } from '../core/events.js';
import { createBot, stepBot } from '../core/botkit.js';
import { ARRIVAL_FROM_FURAS } from './levels.js';
import { buildDoor, cameraPanel, panelBg, drawInstructions, createJumpscare, introSeen, takeRespawn, addStoryProps } from '../core/levelkit.js';
import { setDread, heardVoice } from '../core/ambience.js';
import { swapRoot } from '../core/glbmonster.js';

const X = 20, Z0 = 4, Z1 = -64, WALL_H = 4.6;                         // legowisko 40 x 68 m
const DIV_H = 4.0, DIV_T = 0.7;                                       // ścianki z kartonów: za wysokie, by Furas je przeskoczył (skacze do 3,6 m)
const DIVS = [{ z: -16, segs: [[-20, -5], [5, 20]] }, { z: -34, segs: [[-14, 14]] }, { z: -50, segs: [[-20, -6], [6, 20]] }];   // przejścia: środek, dwa boki, środek
const FISH = [[-15, -8], [15, -26], [16, -43], [-14, -58]];
const GATE_Z = -57.5, EXIT_Z = Z1 + 0.03;
// Węzły, po których Furas patroluje i szuka cię za ścianami (graf przejść między salami)
const NODES = [[0, -8], [0, -16], [-10, -25], [10, -25], [-17, -34], [17, -34], [-10, -42], [10, -42], [0, -50], [0, -54], [-12, -57], [12, -57]];
const LINKS = [[0, 1], [1, 2], [1, 3], [2, 4], [3, 5], [4, 6], [5, 7], [6, 8], [7, 8], [8, 9], [9, 10], [9, 11]];
const ADJ = NODES.map(() => []); LINKS.forEach(([a, b]) => { ADJ[a].push(b); ADJ[b].push(a); });
const SEE_DIST = 18, HEAR_DIST = 10, LOSE_TIME = 9, SMELL_TIME = 4, CATCH_DIST = 1.1, POUNCE_CATCH = 1.6;   // SMELL_TIME: tyle sekund po utracie wzroku wciąż czuje, gdzie jesteś
const WALK = 2.6, INVESTIGATE = 3.7, CHASE = 5.4, POUNCE_SPEED = 11.5, POUNCE_RANGE = 7.5, POUNCE_MIN = 2.2;
const TELEGRAPH = 0.7, POUNCE_T = 0.55, RECOVER_T = 1.0, POUNCE_CD = 3.5;
const FISH_BOOST = 0.07, RAGE_BOOST = 0.3;   // każda ryba przyspiesza Furasa o 7%, po wszystkich rybach dostaje szału (+30%)
const REWARD_FIRST = 3000, REWARD_REPEAT = 300, INTRO_TIME = 10;
const STARTS = [6, 11, 3];   // węzły startowe kolejnych Furasów (trzeci wchodzi dopiero po rybach)
const DORMANT = [0, 400];     // uśpiony Furas czeka daleko poza mapą; jego światło jest od początku w scenie, więc przebudzenie nie zmienia liczby świateł (bez przeładowania shaderów)
export const info = { id: 'furas', name: 'The Fur Den', spawn: [0, 1.0, 2.0] };
let S = null;
const _q = new THREE.Vector3(), _Yv = new THREE.Vector3(0, 1, 0), _tq = new THREE.Quaternion(), _tn = new THREE.Vector3();

// ---------- MODEL FURASA ----------
// Fasola: geometria z kolorami wierzchołków (jedna siatka sierści = jedno wywołanie rysowania). Furas patrzy w +Z, stoi na y = 0.
const FUR_DARK = [0.17, 0.14, 0.13], FUR_MID = [0.3, 0.26, 0.23], CREAM = [0.55, 0.48, 0.4], PINK = [0.6, 0.2, 0.3];
function paint(geo, tint, shade) {
    const n = geo.attributes.position.count, c = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { c[i * 3] = tint[0] * shade; c[i * 3 + 1] = tint[1] * shade; c[i * 3 + 2] = tint[2] * shade; }
    geo.setAttribute('color', new THREE.BufferAttribute(c, 3)); return geo;
}
function blob(rx, ry, rz, x, y, z, tint, shade) { const g = new THREE.SphereGeometry(1, 14, 10); g.scale(rx, ry, rz); g.translate(x, y, z); return paint(g, tint, shade || 1); }
function tuft(px, py, pz, nx, ny, nz, len, r, tint, shade) {
    const g = new THREE.ConeGeometry(r, len, 5, 1); g.translate(0, len / 2, 0);
    _tq.setFromUnitVectors(_Yv, _tn.set(nx, ny, nz).normalize()); g.applyQuaternion(_tq); g.translate(px, py, pz);
    return paint(g, tint, shade);
}
// Kępki sierści na elipsoidzie: kierunek na zewnątrz, lekko oklapnięty; rng z T.mkRng
function furOn(list, R, n, rx, ry, rz, cx, cy, cz, len, belly) {
    for (let i = 0; i < n; i++) {
        const u = R() * 2 - 1, a = R() * Math.PI * 2, s = Math.sqrt(1 - u * u), dx = s * Math.cos(a), dy = u, dz = s * Math.sin(a);
        const tint = (belly && (dy < -0.2 || dz > 0.7)) ? CREAM : (R() < 0.3 ? FUR_MID : FUR_DARK);
        list.push(tuft(cx + dx * rx, cy + dy * ry, cz + dz * rz, dx / rx * 0.55, dy / ry * 0.55 - 0.55, dz / rz * 0.55 - 0.75, len * (0.6 + R() * 0.8), 0.026 + R() * 0.014, tint, 0.65 + R() * 0.4));
    }
}
function furMaterial() { return new THREE.MeshStandardMaterial({ vertexColors: true, color: 0x8c8480, roughness: 1, metalness: 0, emissive: 0x080403, envMapIntensity: 0.2 }); }
const meshOf = (geos, mat) => { const m = new THREE.Mesh(mergeGeometries(geos), mat); m.castShadow = false; m.frustumCulled = false; return m; };

// Głowa: kocia maska (blada twarz, sterczące poszarpane uszy, zielone szparkowe oczy, szeroki uśmiech pełen zębów, długie wąsy), ruchoma żuchwa
export function buildFurasHead(withLight) {
    const R = T.mkRng(909), head = new THREE.Group(), fur = furMaterial();
    const skull = [blob(0.42, 0.38, 0.44, 0, 0, 0, FUR_DARK, 0.9)];
    furOn(skull, R, 170, 0.42, 0.38, 0.44, 0, 0, 0, 0.16, false);
    for (const s of [-1, 1]) {   // uszy: wysokie stożki z różowym środkiem; prawe z wyszczerbionym końcem
        const e = tuft(s * 0.26, 0.3, -0.04, s * 0.4, 1, -0.1, 0.62, 0.14, FUR_DARK, 0.9);
        skull.push(e, tuft(s * 0.26, 0.31, 0.0, s * 0.4, 1, -0.05, 0.44, 0.08, PINK, 1));
        for (let k = 0; k < 4; k++) skull.push(tuft(s * (0.28 + k * 0.012), 0.32 + k * 0.1, -0.02, s * 0.6, 0.5, 0.2, 0.2, 0.022, FUR_MID, 0.9 + k * 0.05));   // kłaki na uchu
    }
    head.add(meshOf(skull, fur));
    const face = [blob(0.33, 0.3, 0.1, 0, -0.04, 0.36, CREAM, 0.8), blob(0.16, 0.12, 0.09, 0, -0.1, 0.45, CREAM, 0.75)];   // pyszczek
    for (let i = 0; i < 40; i++) { const a = (i / 39 - 0.5) * 2.6; face.push(tuft(Math.sin(a) * 0.36, -0.06 + Math.cos(a) * 0.12, 0.3, Math.sin(a), -0.2, 0.3, 0.14 + R() * 0.1, 0.02, CREAM, 0.8 + R() * 0.25)); }   // kryza z sierści wokół maski
    head.add(meshOf(face, furMaterial()));
    // Oczy: świecące, zielone, wąska pionowa źrenica; wściekłe brwi
    const eyeM = new THREE.MeshBasicMaterial({ color: 0x38ff6a }), slitM = new THREE.MeshBasicMaterial({ color: 0x020a04 }), browM = furMaterial();
    const brows = [];
    for (const s of [-1, 1]) {
        const sock = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 8), slitM); sock.scale.set(1.1, 1.3, 0.45); sock.position.set(s * 0.15, 0.08, 0.455); head.add(sock);   // ciemny oczodół
        const e = new THREE.Mesh(new THREE.SphereGeometry(0.075, 14, 10), eyeM); e.scale.set(1.1, 1.3, 0.5); e.position.set(s * 0.15, 0.08, 0.49); head.add(e);
        const sl = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.15, 0.02), slitM); sl.position.set(s * 0.15, 0.08, 0.53); head.add(sl);
        const g = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex.dot, color: 0x60ff90, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.45 })); g.scale.set(0.36, 0.36, 1); g.position.set(s * 0.15, 0.08, 0.5); head.add(g);
        brows.push(tuft(s * 0.05, 0.2, 0.46, s * 1.2, 0.5, 0.2, 0.22, 0.03, FUR_DARK, 0.7), tuft(s * 0.14, 0.2, 0.47, s * 1.1, 0.1, 0.2, 0.2, 0.03, FUR_DARK, 0.7));
    }
    head.add(meshOf(brows, browM));
    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.05, 3), new THREE.MeshStandardMaterial({ color: 0xe0607a, roughness: 0.4 })); nose.rotation.x = Math.PI; nose.position.set(0, -0.04, 0.56); head.add(nose);
    // Pysk: ciemna jama z górnymi zębami (głowa), dolna szczęka osobno (otwiera się przy skoku)
    const mouthM = new THREE.MeshBasicMaterial({ color: 0x1a0306 }), toothM = new THREE.MeshStandardMaterial({ color: 0xf2ead2, roughness: 0.4, emissive: 0x2a2418 });
    const m1 = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 8), mouthM); m1.scale.set(0.26, 0.09, 0.1); m1.position.set(0, -0.17, 0.46); head.add(m1);
    const up = []; for (let i = 0; i < 9; i++) { const x = (i / 8 - 0.5) * 0.4; up.push(new THREE.ConeGeometry(0.018, 0.1 + (i % 2) * 0.05, 4).rotateX(Math.PI).translate(x, -0.15 - (i % 2) * 0.02, 0.51 - Math.abs(x) * 0.25)); }
    head.add(new THREE.Mesh(mergeGeometries(up), toothM));
    const jaw = new THREE.Group(); jaw.position.set(0, -0.18, 0.3); head.add(jaw);
    const jm = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 8), mouthM); jm.scale.set(0.24, 0.07, 0.12); jm.position.set(0, -0.02, 0.12); jaw.add(jm);
    const lo = []; for (let i = 0; i < 7; i++) { const x = (i / 6 - 0.5) * 0.34; lo.push(new THREE.ConeGeometry(0.017, 0.09 + (i % 2) * 0.04, 4).translate(x, 0.02, 0.22 - Math.abs(x) * 0.25)); }
    jaw.add(new THREE.Mesh(mergeGeometries(lo), toothM));
    // Wąsy: po trzy długie, cienkie pręty z każdej strony
    const wm = new THREE.MeshBasicMaterial({ color: 0xece4d0 });
    for (const s of [-1, 1]) for (let i = 0; i < 3; i++) { const w = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.008, 0.008), wm); w.position.set(s * 0.48, -0.08 - i * 0.04, 0.5); w.rotation.z = s * (0.15 - i * 0.14); w.rotation.y = s * -0.35; head.add(w); }
    if (withLight) { const l = new THREE.PointLight(0x60ff90, 3, 6, 1.8); l.position.set(0, 0.1, 0.7); head.add(l); head.userData.light = l; }
    head.userData.jaw = jaw;
    return head;
}

// Pełna postać: kudłaty, przygarbiony stwór chodzący na kłykciach, z puchatym zadartym ogonem
export function buildFuras(withLight) {
    const R = T.mkRng(4040), root = new THREE.Group(), bodyG = new THREE.Group(); root.add(bodyG);
    const torso = [blob(0.56, 0.6, 0.88, 0, 1.15, -0.05, FUR_DARK, 0.95), blob(0.66, 0.56, 0.52, 0, 1.42, 0.36, FUR_DARK, 1), blob(0.5, 0.52, 0.56, 0, 1.0, -0.72, FUR_DARK, 0.85), blob(0.38, 0.4, 0.34, 0, 1.0, 0.5, CREAM, 0.95)];
    furOn(torso, R, 300, 0.56, 0.6, 0.88, 0, 1.15, -0.05, 0.34, true); furOn(torso, R, 200, 0.66, 0.56, 0.52, 0, 1.42, 0.36, 0.36, false); furOn(torso, R, 160, 0.5, 0.52, 0.56, 0, 1.0, -0.72, 0.32, true);
    for (let i = 0; i < 12; i++) torso.push(tuft(0, 1.62 - i * 0.015, 0.7 - i * 0.14, 0, 1, -0.55, 0.38 + R() * 0.2, 0.035, FUR_DARK, 0.7 + R() * 0.3));   // grzywa wzdłuż grzbietu
    for (let i = 0; i < 8; i++) torso.push(tuft((R() - 0.5) * 0.7, 0.75, (R() - 0.5) * 1.2, (R() - 0.5) * 0.3, -1, 0, 0.45 + R() * 0.2, 0.03, CREAM, 0.8));   // skołtunione kosmyki pod brzuchem
    bodyG.add(meshOf(torso, furMaterial()));
    const head = buildFurasHead(withLight); head.position.set(0, 1.38, 1.05); head.rotation.x = 0.18; bodyG.add(head);
    // Ogon: długi łańcuch kul z kępkami, zakręcony w górę i do przodu, z jasną kitką
    const tailG = new THREE.Group(); tailG.position.set(0, 1.0, -1.15); bodyG.add(tailG);
    const tg = [];
    for (let i = 0; i < 10; i++) {
        const y = 0.009 * i * i + 0.03 * i, z = -0.12 * i - 0.0008 * i * i, r = 0.2 + Math.min(i, 8) * 0.022, tint = i > 7 ? CREAM : (i > 4 ? FUR_MID : FUR_DARK);
        tg.push(blob(r, r, r * 1.15, 0, y, z, tint, 0.9));
        for (let j = 0; j < 16; j++) { const a = j * 0.39 + i * 0.5; tg.push(tuft(Math.cos(a) * r * 0.85, y + Math.sin(a) * r * 0.85, z, Math.cos(a), Math.sin(a), -0.45, 0.3 + R() * 0.14, 0.05, i > 7 ? CREAM : tint, 0.7 + R() * 0.4)); }   // odstające kępki: ogon jak szczotka
    }
    tg.push(blob(0.34, 0.36, 0.36, 0, 1.3, -1.3, CREAM, 1.0));
    for (let j = 0; j < 30; j++) { const u = R() * 2 - 1, a = R() * 6.28, q = Math.sqrt(1 - u * u); tg.push(tuft(Math.cos(a) * q * 0.34, 1.3 + u * 0.36, -1.3 + Math.sin(a) * q * 0.36, Math.cos(a) * q, u, Math.sin(a) * q - 0.3, 0.3 + R() * 0.15, 0.045, CREAM, 0.8 + R() * 0.3)); }   // kitka
    tailG.add(meshOf(tg, furMaterial()));
    // Kończyny: ramiona do ziemi (kłykcie), krótsze tylne łapy; każda w grupie, którą obraca animacja
    const clawM = new THREE.MeshStandardMaterial({ color: 0xe8dcc0, roughness: 0.4, emissive: 0x1a1608 }), limbs = [];
    const limb = (x, y, z, len, thick, front) => {
        const g = new THREE.Group(); g.position.set(x, y, z);
        const parts = [blob(thick, len / 2, thick, 0, -len / 2, 0, FUR_DARK, 0.9), blob(thick * 1.25, thick * 0.9, thick * 1.5, 0, -len, front ? 0.1 : 0.15, FUR_DARK, 0.8)];
        furOn(parts, R, 50, thick, len / 2, thick, 0, -len / 2, 0, 0.22, false);
        g.add(meshOf(parts, furMaterial()));
        const cl = []; for (let k = 0; k < 4; k++) cl.push(new THREE.ConeGeometry(0.022, 0.2, 4).rotateX(Math.PI / 2 + 0.4).translate((k - 1.5) * 0.07, -len - 0.02, (front ? 0.3 : 0.34)));
        g.add(new THREE.Mesh(mergeGeometries(cl), clawM));
        bodyG.add(g); limbs.push(g); return g;
    };
    const armL = limb(-0.66, 1.38, 0.42, 1.2, 0.19, true), armR = limb(0.66, 1.38, 0.42, 1.2, 0.19, true), legL = limb(-0.4, 0.92, -0.82, 0.78, 0.2, false), legR = limb(0.4, 0.92, -0.82, 0.78, 0.2, false);
    root.scale.setScalar(1.2);
    return { root: root, bodyG: bodyG, head: head, tail: tailG, armL: armL, armR: armR, legL: legL, legR: legR };
}

// ---------- BUDOWA POZIOMU ----------
export function build() {
    L.spawn = info.spawn.slice();
    L.bounds = { minX: -X + 0.4, maxX: X - 0.4, minZ: Z1 + 0.4, maxZ: Z0 - 0.4, maxY: WALL_H - 0.2 };
    const df = diffOf('furas');
    S = { df: df, ghost: createGhost('furas'), ev: createEvents('furas'), clock: 0, runT: 0, introT: INTRO_TIME, phase: 'intro', fish: 0, got: [false, false, false, false], cp: -1, bots: [], caughtT: -1, leaving: false, hudT: 0, seen: 0, carried: false, purrT: 0, lastP: { x: 0, z: 2 } };
    buildRoom();
    buildDividers();
    buildDecor();
    buildFish();
    buildGate();
    buildFurasBots();
    setDread(() => S.bots.filter(b => b.active).map(b => b.f.root.position), { hide: (on) => S.bots.forEach(b => { if (b.active) b.f.root.visible = !on; }) });
    buildDoor({ x: 0, z: Z0 - 0.03, rotY: Math.PI, label: 'LEVELS', color: '#ffd0e8', wood: 0x5a3a46, portal: { target: 'levels', spawn: ARRIVAL_FROM_FURAS, onEnter: () => toast('Back to the levels') } });
    S.hud = cameraPanel(1024, 200, 0.42, 0.082, 0.2, -0.75, 990);
    S.intro = cameraPanel(1280, 820, 1.0, 0.64, -0.04, -1.05, 995); S.intro.last = -1;
    S.scare = createJumpscare({ head: buildFurasHead(false), scale: 1.0, y: 0.02, restZ: -1.15, fromZ: -4.0, eyes: false, flash: 0x30ff60 });   // pochylone, zielone błyski: jumpscare Furasa
    if (df.id !== 'normal') toast('Difficulty: ' + df.name + (df.checkpoints ? '' : ' (no checkpoints, 2 Furases)'), df.color);
    addStoryProps({ seed: 107, count: 30, corpses: 3 });   // krew, ślady, napisy i ciała (core/levelkit.js)
}
function buildRoom() {
    const mid = (Z0 + Z1) / 2, len = Z0 - Z1;
    addCrispBlock(0, -0.5, mid, X * 2 + 2, 1, len + 2, 0x5c4640, 0x120a08, tex.floor, { rough: tex.floorRough });
    const wall = 0x6e4c5a, edge = 0x1a0e12;
    for (const s of [-1, 1]) addCrispBlock(s * (X + 0.3), WALL_H / 2, mid, 0.6, WALL_H, len + 1, wall, edge, tex.wall);
    addCrispBlock(0, WALL_H / 2, Z0 + 0.3, X * 2 + 1, WALL_H, 0.6, wall, edge, tex.wall);
    addCrispBlock(0, WALL_H / 2, Z1 - 0.3, X * 2 + 1, WALL_H, 0.6, wall, edge, tex.wall);
    addCrispBlock(0, WALL_H + 0.2, mid, X * 2 + 2, 0.4, len + 2, 0x2a1a22, edge, tex.wall);   // sufit: legowisko jest zamknięte
    // Zagroda przy wyjściu: ściany boczne, brama zamyka ją od strony legowiska
    for (const s of [-1, 1]) addCrispBlock(s * 4.2, WALL_H / 2, (GATE_Z + Z1) / 2, 0.4, WALL_H, GATE_Z - Z1, wall, edge, tex.wall);
    // Światła: ciepłe lampy przy przejściach (mało, żeby oczy Furasa było widać z daleka) i słaby blask z góry
    const amb = new THREE.PointLight(0xffb878, 40, 40, 1.4); amb.position.set(0, 4.2, -30); L.root.add(amb);
    for (const [x, z] of [[-18, -2], [18, -22], [-18, -44]]) {
        const l = new THREE.PointLight(0xffa860, 14, 14, 1.7); l.position.set(x, 3.4, z); L.root.add(l);
        const b = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffd8a0 })); b.position.set(x, 3.4, z); L.root.add(b);
    }
}
// Ścianki z kartonów: długie bloki, zostawiają przejścia; na nich zadrapania (drapieżne pazury)
function buildDividers() {
    const cardboard = 0xa8845a, edge = 0x2a1a0a;
    for (const d of DIVS) for (const [a, b] of d.segs) addCrispBlock((a + b) / 2, DIV_H / 2, d.z, b - a, DIV_H, DIV_T, cardboard, edge, tex.wood);
}
// Drapaki-schody (da się wejść, ale Furas też), wielkie kłębki, kartony, kupy sierści i muchy... znaczy kłaki w powietrzu
function buildDecor() {
    const R = T.mkRng(5151), boxes = [];
    const crate = (x, z, w, h, d, col) => boxes.push({ x: x, y: h / 2, z: z, w: w, h: h, d: d, color: col || (R() < 0.5 ? 0xb08a5a : 0x9a7648), rotY: (R() - 0.5) * 0.25 });
    for (const [x, z, w, h, d] of [[-14, -4, 3, 2, 3], [-11, -5.5, 1.5, 1.2, 1.5], [14, -3, 5, 1, 2], [15, -9, 2, 2, 2], [-6, -11, 2, 2, 2], [8, -12, 1.5, 1.5, 1.5],
        [-17, -21, 2, 2, 3], [-6, -28, 2, 2, 2], [7, -30, 3, 1.4, 2], [17, -22, 2.5, 2.4, 2.5], [-8, -32, 2, 1.2, 2],
        [-17, -39, 2.5, 2, 2.5], [4, -38, 2, 2, 2], [-2, -45, 2, 1.4, 2], [14, -47, 3, 2, 2], [-9, -47, 2, 2.4, 2],
        [-14, -53, 3, 2, 3], [14, -54, 2.5, 2, 2.5], [-10, -61, 2, 1.4, 2], [11, -61, 3, 2, 2]]) crate(x, z, w, h, d);
    addInstancedBlocks(boxes, tex.wood);
    // Drapaki: schody z trzech stopni (0,8 / 1,6 / 2,4 m)
    for (const [cx, cz] of [[0, -25], [0, -42]]) for (let i = 0; i < 3; i++) { const h = 0.8 * (i + 1); addCrispBlock(cx - 2.0 + i * 2.0, h / 2, cz, 1.7, h, 1.7, [0x7a4a5a, 0x6a3a4a, 0x8a5a6a][i], 0x1a0a10, tex.wall); }
    // Kłębki włóczki, słupki do drapania i kupy sierści (po jednej siatce na typ)
    const yarn = [[-3, -3, 0.9, 0xd0405a], [4, -19, 0.7, 0x40a0c0], [-14, -26, 1.0, 0xe0b040], [12, -36, 0.8, 0xd0405a], [-6, -36, 0.6, 0x40a0c0], [3, -55, 0.9, 0xe0b040], [-16, -45, 0.7, 0xd0405a], [16, -13, 0.6, 0x60c060]];
    for (const [x, z, r, col] of yarn) {
        const m = new THREE.Mesh(new THREE.SphereGeometry(r, 16, 12), new THREE.MeshStandardMaterial({ color: col, roughness: 1, bumpMap: tex.plaster, bumpScale: 3 })); m.position.set(x, r, z); L.root.add(m);
        for (let k = 0; k < 3; k++) { const t = new THREE.Mesh(new THREE.TorusGeometry(r * (0.55 + k * 0.15), 0.025, 6, 24), new THREE.MeshStandardMaterial({ color: col, roughness: 1 })); t.position.set(x, r, z); t.rotation.set(k * 1.1, k * 0.7, k * 0.5); L.root.add(t); }
    }
    const posts = [];
    for (const [x, z] of [[-18, -12], [18, -16], [-3, -20], [18, -40], [-18, -50], [8, -52]]) { posts.push(paint(new THREE.CylinderGeometry(0.22, 0.28, 2.2, 10).translate(x, 1.1, z), [0.8, 0.65, 0.4], 1), paint(new THREE.CylinderGeometry(0.6, 0.6, 0.12, 12).translate(x, 2.26, z), [0.5, 0.3, 0.38], 1)); }
    const pm = new THREE.Mesh(mergeGeometries(posts), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, bumpMap: tex.plaster, bumpScale: 3 })); L.root.add(pm);
    const piles = [];
    for (let i = 0; i < 26; i++) {
        const x = (R() * 2 - 1) * (X - 2), z = Z0 - 2 - R() * (Z0 - Z1 - 4), r = 0.35 + R() * 0.5;
        if (DIVS.some(d => Math.abs(z - d.z) < 1.4)) continue;
        piles.push(blob(r * 1.4, r * 0.55, r * 1.2, x, r * 0.4, z, R() < 0.5 ? FUR_MID : CREAM, 0.8 + R() * 0.3));
        furOn(piles, R, 6, r * 1.4, r * 0.55, r * 1.2, x, r * 0.4, z, 0.25, true);
    }
    L.root.add(meshOf(piles, furMaterial()));
    // Kłaki w powietrzu: unoszący się puch
    const n = 260, pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { pos[i * 3] = (R() * 2 - 1) * X; pos[i * 3 + 1] = 0.3 + R() * 3.6; pos[i * 3 + 2] = Z0 - R() * (Z0 - Z1); }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const dust = new THREE.Points(geo, new THREE.PointsMaterial({ size: 0.35, map: tex.dot, color: 0xe8d8c0, transparent: true, opacity: 0.35, depthWrite: false })); dust.frustumCulled = false; S.dust = dust; L.root.add(dust);
    // Pary zielonych oczu w kartonach: tylko złudzenie (jak w katakumbach), żeby nie było wiadomo, gdzie naprawdę jest on
    S.fakeEyes = [];
    for (const [x, z] of [[-6, -10.4], [9, -12.8], [-13, -30.6], [4, -38.8], [14, -45.6], [-9, -48.2]]) {
        const g = new THREE.Group(); g.position.set(x, 0.9 + R() * 0.6, z);
        for (const s of [-1, 1]) { const e = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex.dot, color: 0x60ff90, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.0 })); e.scale.set(0.14, 0.2, 1); e.position.x = s * 0.18; g.add(e); }
        L.root.add(g); S.fakeEyes.push({ g: g, ph: R() * 10 });
    }
}
function buildFish() {
    S.fishMesh = FISH.map((p) => {
        const g = new THREE.Group(); g.position.set(p[0], 1.1, p[1]);
        const gold = new THREE.MeshStandardMaterial({ color: 0xffd23a, emissive: 0xffa010, emissiveIntensity: 1.3, metalness: 0.6, roughness: 0.3 });
        const body = new THREE.Mesh(new THREE.SphereGeometry(0.22, 14, 10), gold); body.scale.set(1.7, 0.8, 0.5); g.add(body);
        const tail = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.34, 3), gold); tail.rotation.z = Math.PI / 2; tail.position.x = -0.5; tail.scale.z = 0.3; g.add(tail);
        const eye = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), new THREE.MeshBasicMaterial({ color: 0x100800 })); eye.position.set(0.28, 0.06, 0.1); g.add(eye);
        const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex.dot, color: 0xffc040, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.8 })); glow.scale.set(1.6, 1.6, 1); g.add(glow);
        const l = new THREE.PointLight(0xffc040, 10, 8, 1.8); g.add(l); L.root.add(g);
        return g;
    });
}
function buildGate() {
    S.gate = addCrispBlock(0, WALL_H / 2, GATE_Z, 8.4, WALL_H, 0.3, 0x2a2a30, 0xff3030);
    S.gateOb = L.obstacles[L.obstacles.length - 1];
    S.gateLamp = new THREE.PointLight(0xff3030, 14, 10, 1.6); S.gateLamp.position.set(0, 2.6, GATE_Z + 1.5); L.root.add(S.gateLamp);
    buildDoor({ x: 0, z: EXIT_Z, rotY: 0, label: 'EXIT', color: '#ffd0e8', glow: 0xff80c0, wood: 0x5a3a46, light: true, portal: { target: 'levels', spawn: ARRIVAL_FROM_FURAS, onEnter: finish } });
}
function buildFurasBots() {
    const id = S.df.id, active = id === 'nightmare' ? 2 : 1, total = id === 'nightmare' ? 3 : (id === 'easy' ? 1 : 2);   // reszta śpi do kolejnych ryb (patrz reinforce)
    for (let i = 0; i < total; i++) addBot(i, i < active);
}
// Furas na węźle. Uśpiony stoi poza mapą z ukrytą siatką; jego światło zostaje w scenie
function addBot(idx, on) {
    const n = STARTS[idx], f = buildFuras(true); if (idx) f.root.scale.setScalar(1.1);
    L.root.add(f.root); swapRoot(f.root, 'furas', { height: 1.9 });   // model z Blendera (assets/monsters/furas.glb)
    const x = on ? NODES[n][0] : DORMANT[0], z = on ? NODES[n][1] : DORMANT[1];
    const st = createBot(x, z); st.mode = 'patrol'; st.listen = true;   // czasem staje i nasłuchuje
    f.root.position.set(st.x, 0, st.z);
    const b = { f: f, st: st, active: on, home: n, node: n, prevNode: -1, goal: null, lostT: 0, last: null, t: 0, cd: 2.5, dirx: 0, dirz: 1, ph: 0, px: st.x, pz: st.z, crouch: 0, purr: Math.random(), wT: 0, wx: st.x, wz: st.z, smellT: 0 };
    shown(b, on); S.bots.push(b); return b;
}
function shown(b, on) { b.f.root.traverse(o => { if (o.isMesh || o.isSprite) o.visible = on; }); }   // światła zostają widoczne (liczba świateł się nie zmienia)
// Kolejny Furas budzi się w legowisku coraz niebezpieczniej (Normal: po 2 rybach, Nightmare: trzeci po 3) na węźle najdalszym od gracza
function reinforce() {
    const need = S.df.id === 'nightmare' ? (S.fish >= 3 ? 3 : 2) : (S.df.id === 'easy' ? 1 : (S.fish >= 2 ? 2 : 1));
    while (S.bots.filter(x => x.active).length < need) {
        const b = S.bots.find(x => !x.active); if (!b) return;
        let best = 0, bd = -1; const me = S.lastP || { x: 0, z: 0 };
        NODES.forEach((n, i) => { const d = Math.hypot(n[0] - me.x, n[1] - me.z); if (d > bd) { bd = d; best = i; } });
        b.active = true; b.home = best; b.node = best; b.prevNode = -1; b.goal = null; b.cd = 4; b.t = 0; b.crouch = 0; b.lostT = 0; b.stuckN = 0;
        b.st.x = NODES[best][0]; b.st.z = NODES[best][1]; b.st.y = 0; b.st.vy = 0; b.st.mode = 'patrol'; b.px = b.st.x; b.pz = b.st.z; b.wx = b.st.x; b.wz = b.st.z; b.wT = 0;
        shown(b, true);
        toast('Another FURAS wakes up...', '#ff4a2a'); SFX.screech({ x: NODES[best][0], y: 1.5, z: NODES[best][1] });
    }
}

// ---------- ZDARZENIA ----------
function finish() {
    if (S.leaving) return; S.leaving = true;
    toast('You escaped the Fur Den!', '#ffb0d8');
    levelReward('furas', REWARD_FIRST, REWARD_REPEAT, 'escaping the Fur Den');
    S.ghost.finish(recordTime('furas', S.runT) && !S.carried, S.runT);
}
function caught() {
    if (S.caughtT >= 0) return;
    S.caughtT = 0; S.scare.trigger(); releaseAll(); buzz('both', 1, 400);
    toast('FURAS caught you...', '#e0533f');
}
function takeFish(i) {
    S.got[i] = true; S.fish++; S.fishMesh[i].visible = false; SFX.fuse(); buzz('both', 0.7, 200);
    toast('Golden fish ' + S.fish + '/4', '#ffd870');
    for (const b of S.bots) { if (!b.active) continue; if (b.st.mode === 'patrol' || b.st.mode === 'investigate') { b.st.mode = 'investigate'; b.goal = [FISH[i][0], FISH[i][1]]; b.invT = 0; } }   // zabranie ryby przyciąga Furasa
    reinforce();
    SFX.stinger({ x: FISH[i][0], y: 1.5, z: FISH[i][1] });
    if (S.df.checkpoints) { S.cp = i; toast('Checkpoint saved', '#ffb0d8'); }
    if (S.fish === 4) {
        const k = L.obstacles.indexOf(S.gateOb); if (k >= 0) L.obstacles.splice(k, 1);
        if (S.gateOb.body) S.gateOb.body.position.y = -50;
        S.gate.visible = false; S.gateLamp.color.setHex(0x30ff60); SFX.bell && SFX.bell();
        toast('The gate is open! Run to the EXIT! FURAS is ENRAGED!', '#ffd27a');
        for (const b of S.bots) { if (!b.active) continue; if (b.st.mode !== 'telegraph' && b.st.mode !== 'pounce') { b.st.mode = 'chase'; b.lostT = 0; b.last = [S.lastP.x, S.lastP.z]; } }   // szał: wszystkie Furasy ruszają na gracza
    }
}
const INTRO = [
    'FURAS lives here: a huge, matted creature with a fluffy tail and a mouth full of teeth.',
    'You hear him purr before you see him: the louder, the closer. Green eyes glow in the dark (some are only illusions).',
    'He sees up to 18 m ahead, not through cardboard walls, hears running from 10 m and smells you for a few seconds after losing sight.',
    'When he crouches and his tail quivers, he POUNCES. The direction is locked at the end: sidestep at the last moment.',
    'Collect 4 golden fish. The gate at the back opens when you have them all. But every fish makes him faster, more FURASES wake up, and with the last fish he goes into a RAGE.'
];

// ---------- AI ----------
function nearestNode(x, z, clearFrom) {   // najbliższy węzeł; clearFrom = [x, z]: tylko taki, do którego prosta jest wolna (w razie braku: po prostu najbliższy)
    let best = -1, bd = 1e9, any = 0, ad = 1e9;
    NODES.forEach((n, i) => { const d = Math.hypot(n[0] - x, n[1] - z); if (d < ad) { ad = d; any = i; } if (clearFrom && d < bd && lineClear(clearFrom[0], clearFrom[1], n[0], n[1])) { bd = d; best = i; } });
    return clearFrom && best >= 0 ? best : any;
}
// Czy prosta od (x0,z0) do (x1,z1) jest wolna od ścian i skrzyń (na wysokości ok. 0,9 m)?
function lineClear(x0, z0, x1, z1) {
    const d = Math.hypot(x1 - x0, z1 - z0), steps = Math.max(1, Math.ceil(d / 0.5));
    for (let i = 1; i <= steps; i++) {
        const k = i / steps; _q.set(x0 + (x1 - x0) * k, 0.9, z0 + (z1 - z0) * k);
        for (const o of L.obstacles) if (o.box3.containsPoint(_q)) return false;
    }
    return true;
}
// Następny punkt na drodze do celu: prosto, gdy nic nie zasłania, inaczej po grafie przejść. Wybiera najdalszy węzeł trasy, do którego prosta jest wolna
// (bez progów odległości, które powodowały drgania w miejscu).
function routeStep(st, tx, tz) {
    if (lineClear(st.x, st.z, tx, tz)) return [tx, tz];
    const a = nearestNode(st.x, st.z, [st.x, st.z]), b = nearestNode(tx, tz, [tx, tz]);
    const prev = new Array(NODES.length).fill(-2); prev[a] = -1; const q = [a];
    while (q.length) { const u = q.shift(); if (u === b) break; for (const v of ADJ[u]) if (prev[v] === -2) { prev[v] = u; q.push(v); } }
    const path = []; for (let u = b; u >= 0; u = prev[u]) path.unshift(u);   // a ... b
    if (path[0] !== a) return NODES[a];   // brak drogi w grafie: przynajmniej do najbliższego węzła
    let pick = a;
    for (let i = 1; i < path.length; i++) { if (lineClear(st.x, st.z, NODES[path[i]][0], NODES[path[i]][1])) pick = path[i]; else break; }
    return NODES[pick];
}
function sees(b, p) {
    const st = b.st, dx = p.x - st.x, dz = p.z - st.z, d = Math.hypot(dx, dz), range = SEE_DIST * (S.df.id === 'nightmare' ? 1.2 : (S.df.id === 'easy' ? 0.8 : 1));
    if (d > range) return false;
    if (st.mode !== 'chase' && d > 2 && (dx * Math.sin(st.dir) + dz * Math.cos(st.dir)) / d < 0.3) return false;   // widzi tylko przed sobą
    const steps = Math.ceil(d / 0.4);
    for (let i = 1; i < steps; i++) {
        const k = i / steps; _q.set(st.x + dx * k, st.y + 1.6 + (p.y - st.y - 1.6) * k, st.z + dz * k);
        for (const o of L.obstacles) { if (o === S.gateOb) continue; if (o.box3.containsPoint(_q)) return false; }
    }
    return true;
}
// Patrol po grafie: losowy sąsiad (bez cofania się, jeśli jest inne wyjście); z pewnym prawdopodobieństwem idzie w stronę gracza (poluje)
function pickPatrol(b, p) {
    const opts = ADJ[b.node].filter(n => n !== b.prevNode), pool = opts.length ? opts : ADJ[b.node], hunt = S.df.id === 'nightmare' ? 0.55 : (S.df.id === 'easy' ? 0.1 : 0.4);
    let nxt = pool[(Math.random() * pool.length) | 0];
    if (Math.random() < hunt) { let bd = 1e9; for (const n of ADJ[b.node]) { const d = Math.hypot(NODES[n][0] - p.x, NODES[n][1] - p.z); if (d < bd) { bd = d; nxt = n; } } }
    b.prevNode = b.node; b.node = nxt; b.goal = NODES[nxt].slice();
}
// Zaklinowany Furas nigdy nie stoi w miejscu: najpierw nowy cel, a jeśli to nie pomaga, przeskakuje na najbliższy węzeł
function unstick(b, p) {
    const st = b.st; b.stuckN = (b.stuckN || 0) + 1;
    if (b.stuckN >= 2) { const n = nearestNode(st.x, st.z); st.x = NODES[n][0]; st.z = NODES[n][1]; st.y = 0; st.vy = 0; b.node = n; b.prevNode = -1; b.stuckN = 0; }
    st.mode = 'patrol'; b.goal = null; st.side = 0; b.invT = 0;
    if (!b.goal) pickPatrol(b, p);
}
function think(dt, ctx) {
    const p = ctx.body.position, speedXZ = Math.hypot(ctx.body.velocity.x, ctx.body.velocity.z), df = S.df;
    const mul = df.speed * (S.fish >= 4 ? 1 + RAGE_BOOST : 1 + FISH_BOOST * S.fish);   // trudność razy przyspieszenie z rybami
    let seenBy = 0;
    for (const b of S.bots) {
        if (!b.active) continue;
        const st = b.st, seesMe = sees(b, p), dx = p.x - st.x, dz = p.z - st.z, d = Math.hypot(dx, dz), pos = { x: st.x, y: 1.4, z: st.z };
        b.cd = Math.max(0, b.cd - dt); b.purr -= dt;
        if (b.purr <= 0 && d < 24) { b.purr = 1.15; SFX.purr(pos, Math.max(0.12, 1 - d / 24)); }   // pomruk zdradza, jak blisko jest
        if (d < 14) SFX.heartbeat(Math.max(0, 1 - d / 14) * 0.8);
        const tall = Math.abs(p.y - (st.y + 1.0)) < 1.6;
        // Strażnik: co 2,5 s sprawdza, czy Furas w ogóle się przesunął (poza skokiem i przykucnięciem)
        if (st.mode === 'patrol' || st.mode === 'investigate' || st.mode === 'chase') {
            b.wT += dt;
            if (b.wT >= 2.5) {
                const moved = Math.hypot(st.x - b.wx, st.z - b.wz); b.wT = 0; b.wx = st.x; b.wz = st.z;
                if (moved >= 0.5) b.stuckN = 0;
                else if (st.mode === 'chase') { st.side = Math.random() < 0.5 ? -1 : 1; st.sideT = 1.2; }
                else unstick(b, p);
            }
        } else { b.wT = 0; b.wx = st.x; b.wz = st.z; }
        if (st.mode === 'telegraph') {   // przykuca i drży ogonem, patrzy na gracza; kierunek skoku zapada na końcu
            b.t += dt; b.crouch = Math.min(1, b.t / 0.25);
            const want = Math.atan2(dx, dz); let dd = want - st.dir; while (dd > Math.PI) dd -= Math.PI * 2; while (dd < -Math.PI) dd += Math.PI * 2; st.dir += dd * Math.min(1, dt * 9);
            if (b.t >= TELEGRAPH * df.grace) { st.mode = 'pounce'; b.t = 0; b.dirx = Math.sin(st.dir); b.dirz = Math.cos(st.dir); SFX.screech(pos); }
            if (d < CATCH_DIST && tall) { caught(); return; }
            seenBy++; continue;
        }
        if (st.mode === 'pounce') {
            b.t += dt; b.crouch = 0;
            stepBot(st, dt, st.x + b.dirx * 10, st.z + b.dirz * 10, p.y - 0.35, POUNCE_SPEED * mul, true);
            if (d < POUNCE_CATCH && tall) { caught(); return; }
            if (b.t >= POUNCE_T) { st.mode = 'recover'; b.t = 0; b.cd = POUNCE_CD; }
            seenBy++; continue;
        }
        if (st.mode === 'recover') {   // po skoku jest chwilę wolny: czas na ucieczkę
            b.t += dt;
            stepBot(st, dt, p.x, p.z, p.y - 0.35, CHASE * 0.4 * mul, true);
            if (d < CATCH_DIST && tall) { caught(); return; }
            if (b.t >= RECOVER_T) { st.mode = 'chase'; b.lostT = 0; b.smellT = 0; b.last = [p.x, p.z]; }
            seenBy++; continue;
        }
        const prev = st.mode;
        if (seesMe) { if (prev !== 'chase') SFX.screech(pos); st.mode = 'chase'; b.lostT = 0; b.smellT = 0; b.last = [p.x, p.z]; seenBy++; }
        else if (st.mode === 'chase') {
            b.lostT += dt; b.smellT += dt;
            if (b.smellT < SMELL_TIME) { b.smellR = (b.smellR || 0) - dt; if (b.smellR <= 0) { b.smellR = 1.2; b.last = [p.x + (Math.random() - 0.5) * 6, p.z + (Math.random() - 0.5) * 6]; } }   // węch: przez kilka sekund wie mniej więcej, gdzie jesteś
            if (b.lostT > LOSE_TIME) { st.mode = 'patrol'; b.goal = null; b.prevNode = -1; b.node = nearestNode(st.x, st.z, [st.x, st.z]); }
        }
        else if ((speedXZ > 3.4 && d < HEAR_DIST * (df.id === 'nightmare' ? 1.3 : 1)) || heardVoice(d, df.id === 'nightmare' ? 1.3 : 1)) { st.mode = 'investigate'; b.goal = [p.x, p.z]; b.invT = 0; }
        let tx, tz, speed = WALK * mul;
        if (st.mode === 'chase') {
            const tgt = seesMe || !b.last ? [p.x, p.z] : b.last; speed = CHASE * mul;
            // Skok: blisko, widzi, jest gotowy
            if (seesMe && b.cd <= 0 && d < POUNCE_RANGE && d > POUNCE_MIN) { st.mode = 'telegraph'; b.t = 0; SFX.growl(pos); continue; }
            const r = seesMe ? tgt : routeStep(st, tgt[0], tgt[1]); tx = r[0]; tz = r[1];
        } else if (st.mode === 'investigate') {
            speed = INVESTIGATE * mul; b.invT = (b.invT || 0) + dt;
            if (!b.goal) b.goal = [p.x, p.z];
            const r = routeStep(st, b.goal[0], b.goal[1]); tx = r[0]; tz = r[1];
            if (Math.hypot(b.goal[0] - st.x, b.goal[1] - st.z) < 1.6 || b.invT > 10) { st.mode = 'patrol'; b.goal = null; b.prevNode = -1; b.node = nearestNode(st.x, st.z, [st.x, st.z]); }
        } else {
            if (!b.goal || Math.hypot(b.goal[0] - st.x, b.goal[1] - st.z) < 1.4) pickPatrol(b, p);
            tx = b.goal[0]; tz = b.goal[1];
        }
        stepBot(st, dt, tx, tz, p.y - 0.35, speed, st.mode === 'chase');
        if (d < CATCH_DIST && tall) { caught(); return; }
    }
    S.seen = seenBy;
}
export const testEdges = () => LINKS.filter(([a, c]) => [-0.5, 0, 0.5].some(o => !lineClear(NODES[a][0] + o, NODES[a][1] + o, NODES[c][0] + o, NODES[c][1] + o)));   // dla testów: krawędzie patrolu zasłonięte przez skrzynie lub ściany

// ---------- CO KLATKĘ ----------
function animateFuras(b, t, dt) {
    const st = b.st, f = b.f, moved = Math.hypot(st.x - b.px, st.z - b.pz); b.px = st.x; b.pz = st.z;
    const speed = dt > 0 ? moved / dt : 0; b.ph += moved * 2.4;
    const run = Math.min(1, speed / 4), sw = Math.sin(b.ph) * 0.75 * run;
    f.root.position.set(st.x, st.y + Math.abs(Math.sin(b.ph)) * 0.07 * run, st.z); f.root.rotation.y = st.dir;
    const crouch = st.mode === 'telegraph' ? b.crouch : 0, pounce = st.mode === 'pounce', chase = st.mode === 'chase' || pounce;
    f.armL.rotation.x = sw + (pounce ? -1.3 : 0) + crouch * 0.4; f.armR.rotation.x = -sw + (pounce ? -1.3 : 0) + crouch * 0.4;
    f.legL.rotation.x = -sw * 0.8 + (pounce ? 0.9 : 0); f.legR.rotation.x = sw * 0.8 + (pounce ? 0.9 : 0);
    f.bodyG.position.y = -crouch * 0.38 + (pounce ? 0.18 : 0); f.bodyG.rotation.x = crouch * 0.2 - (pounce ? 0.25 : 0);
    f.head.position.y = 1.38 - crouch * 0.18; f.head.rotation.x = 0.18 + crouch * 0.25 + Math.sin(t * 3 + b.ph) * 0.03;
    f.head.userData.jaw.rotation.x = pounce ? 0.75 : (crouch > 0 ? 0.25 + Math.sin(t * 30) * 0.08 : 0.04 + Math.sin(t * 2) * 0.03);   // otwiera paszczę do skoku
    const wag = st.mode === 'telegraph' ? Math.sin(t * 38) * 0.22 : Math.sin(t * (chase ? 5 : 2) + b.ph * 0.3) * (chase ? 0.4 : 0.28);
    f.tail.rotation.y = wag; f.tail.rotation.x = chase ? -0.25 : 0; f.tail.scale.setScalar(chase ? 1.25 : 1);   // w pościgu ogon jeży się i puchnie
}
export function update(dt, t, ctx) {
    if (!S || S.leaving) return;
    S.clock += dt; const p = ctx.body.position;
    S.ev.update(dt, S.phase === 'play' && S.caughtT < 0);
    S.scare.update(dt);
    if (S.introSkip === undefined) { S.introSkip = introSeen('furas'); if (S.introSkip) S.introT = Math.min(S.introT, 3); }
    if (S.introT > 0) {
        S.introT -= dt;
        const sec = Math.max(0, Math.ceil(S.introT));
        if (sec !== S.intro.last) { S.intro.last = sec; drawInstructions(S.intro, 'The Fur Den', INTRO, 'FURAS wakes in ' + sec + ' s', { bg: 'rgba(20,8,14,0.92)', border: '#60ff90', title: '#ffd0e8', text: '#f0dce6', footer: '#ffb030', size: 27 }); }
        S.intro.mesh.visible = S.introT > 0 && !S.introSkip;
        if (S.introT <= 0) { S.phase = 'play'; toast('Collect 4 golden fish. Listen for the purring!', '#ffd870'); }
    }
    if (S.phase === 'play' && S.caughtT < 0) S.runT += dt;
    S.ghost.tick(dt, p, S.phase === 'play' && S.caughtT < 0);
    S.fishMesh.forEach((g, i) => { if (!S.got[i]) { g.rotation.y = t * 1.6; g.position.y = 1.1 + Math.sin(t * 2 + i) * 0.1; if (Math.hypot(p.x - FISH[i][0], p.z - FISH[i][1]) < 1.0 && Math.abs(p.y - 1.0) < 1.6) takeFish(i); } });
    S.fakeEyes.forEach((e) => { const k = Math.max(0, Math.sin(t * 0.7 + e.ph)); e.g.children.forEach((c) => { c.material.opacity = k > 0.8 ? 0.9 : 0; }); });
    S.lastP = { x: p.x, z: p.z };
    S.dust.rotation.y = Math.sin(t * 0.05) * 0.03; S.dust.position.y = Math.sin(t * 0.3) * 0.15;
    if (S.caughtT >= 0) {
        S.caughtT += dt;
        if (S.caughtT > 1.6) {
            if (S.cp >= 0 && takeRespawn(S)) {
                const r = FISH[S.cp]; setPlayerPosition(r[0], 1.0, r[1] + 1.2);
                S.bots.forEach((b) => { if (!b.active) return; b.st.x = NODES[b.home][0]; b.st.z = NODES[b.home][1]; b.st.y = 0; b.st.mode = 'patrol'; b.goal = null; b.lostT = 0; b.cd = 3; b.node = b.home; b.prevNode = -1; b.px = b.st.x; b.pz = b.st.z; b.wx = b.st.x; b.wz = b.st.z; b.wT = 0; b.stuckN = 0; });
                S.caughtT = -1;
            } else { S.leaving = true; ctx.goto('furas'); return; }
        }
        S.bots.forEach((b) => { if (b.active) animateFuras(b, t, dt); });
        return;
    }
    if (S.phase === 'play') think(dt, ctx);
    S.bots.forEach((b) => { if (b.active) animateFuras(b, t, dt); });
    S.gateLamp.intensity = S.fish === 4 ? 14 : 12 + Math.sin(t * 6) * 4;
    S.hudT -= dt; if (S.hudT <= 0) { S.hudT = 0.15; drawHud(); }
}
function fmt(s) { s = Math.max(0, Math.floor(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); }
function drawHud() {
    const x = S.hud.ctx; panelBg(S.hud, 'rgba(20,8,14,0.72)');
    x.textBaseline = 'middle'; x.textAlign = 'left';
    x.font = 'bold 78px "Courier New", monospace'; x.fillStyle = '#ffd0e8'; x.fillText(fmt(S.runT), 30, 74);
    if (S.df.id !== 'normal') { x.font = 'bold 22px "Courier New", monospace'; x.fillStyle = S.df.color; x.fillText(S.df.name.toUpperCase(), 330, 18); }
    x.font = 'bold 36px "Courier New", monospace'; x.fillStyle = S.fish === 4 ? '#7fff90' : '#ffd870'; x.fillText('Fish ' + S.fish + '/4', 330, 52);
    x.font = 'bold 26px "Courier New", monospace';
    let msg = 'Listen for the purring. Break his line of sight.', col = '#e8d4de';
    if (S.fish === 4) { msg = 'RUN to the EXIT gate!'; col = '#7fff90'; }
    else if (S.bots.some(b => b.st.mode === 'telegraph')) { msg = 'HE IS ABOUT TO POUNCE! Sidestep!'; col = '#ff2a2a'; }
    else if (S.seen > 0) { msg = 'FURAS SEES YOU! Break the line of sight!'; col = '#ff4a2a'; }
    x.fillStyle = col; x.fillText(msg, 330, 108);
    S.hud.update();
}
export const debug = () => S ? { phase: S.phase, fish: S.fish, caught: S.caughtT >= 0, modes: S.bots.filter(b => b.active).map(b => b.st.mode), botPos: S.bots.filter(b => b.active).map(b => [b.st.x, b.st.z]), fishPos: FISH, gateOpen: !S.gate.visible, bots: S.bots.filter(b => b.active).length } : null;   // dla testów
export const testBots = () => S ? S.bots.filter(b => b.active) : [];   // dla testów: sterowanie Furasem
export function dispose() {
    if (S) { S.ev.dispose(); S.ghost.dispose(); S.hud.dispose(); S.intro.dispose(); S.scare.dispose(); }
    S = null;
}
