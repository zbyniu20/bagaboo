// ==========================================
// POZIOM 6: THE HOSPITAL (szpital z posągami)
// Długi, ciemny korytarz z ośmioma salami. W salach leżą 3 karty dostępu. Bramka na końcu otwiera się dopiero po zebraniu wszystkich.
// Po szpitalu chodzą bladzi pacjenci-posągi: poruszają się TYLKO wtedy, gdy nie świecisz na nich latarką (stożek ok. 35°).
// Gdy się odwrócisz, mrugniesz albo zaświeci inna lampa, podchodzą bliżej. Dotknięcie = złapany.
// Układ jest stały (działa duch). Po zebraniu karty zapisuje się punkt kontrolny (Easy i Normal).
// ==========================================
import { THREE, L, tex, camera, lighting, addCrispBlock } from '../core/engine.js';
import * as T from '../core/textures.js';
import { buildMannequin, addMonsterFace } from '../core/mannequin.js';
import { levelReward, recordTime, diffOf } from '../core/economy.js';
import { toast } from '../core/terminal.js';
import { setPlayerPosition, releaseAll } from '../core/player.js';
import * as SFX from '../core/audio.js';
import { buzz } from '../core/haptics.js';
import { createGhost } from '../core/runkit.js';
import { createEvents } from '../core/events.js';
import { ARRIVAL_FROM_HOSPITAL } from './levels.js';
import { buildDoor, cameraPanel, panelBg, drawInstructions, createJumpscare, introSeen, takeRespawn, addStoryProps } from '../core/levelkit.js';
import { setDread } from '../core/ambience.js';

const X0 = -11, X1 = 11, Z0 = 5, Z1 = -52, H = 3.4, CORR = 2.5;       // budynek 22 x 57 m, korytarz 5 m szerokości
const ROOM_Z = [0, -12, -24, -36, -48];                               // granice sal wzdłuż korytarza
const CARDS = [[-6.5, 1.0, -18], [6.5, 1.0, -30], [-6.5, 1.0, -42]];
const CP = [[0, 1.0, -18.5], [0, 1.0, -30.5], [0, 1.0, -42.5]];       // punkty kontrolne w korytarzu przy salach z kartami
const STATUES = [[0, -22], [-5, -16], [5, -33], [-5, -45]];           // 4. posąg tylko na Nightmare
const WALK = 3.6, WALK_PER_CARD = 0.3, LUNGE_DIST = 6, LUNGE_MUL = 1.35, CATCH_DIST = 1.0, SEE_DIST = 30;   // prędkość posągów (m/s): rośnie z każdą kartą, a w odległości do LUNGE_DIST nieoświetlony posąg rzuca się szybciej
const SEE_CONE = { easy: 0.82, normal: 0.9, nightmare: 0.93 };   // cos kąta stożka latarki (35° / 26° / 21°): węższy = trzeba trafić precyzyjniej
const WAKE_CARDS = [0, 1], WAKE_BEHIND = 14;                       // po zabraniu tych kart budzi się dodatkowy posąg za plecami gracza (nie na Easy)
const GATE_Z = -48.4, EXIT_Z = -51.9;
const REWARD_FIRST = 2200, REWARD_REPEAT = 220, INTRO_TIME = 10;
export const info = { id: 'hospital', name: 'The Hospital', spawn: [0, 1.0, 2.5] };
let S = null;
const _c = new THREE.Vector3(), _d = new THREE.Vector3(), _q = new THREE.Vector3();

export function build() {
    L.spawn = info.spawn.slice();
    L.bounds = { minX: X0 + 0.4, maxX: X1 - 0.4, minZ: Z1 + 0.4, maxZ: Z0 - 0.4, maxY: H - 0.3 };
    const df = diffOf('hospital');
    S = { df: df, ghost: createGhost('hospital'), ev: createEvents('hospital'), clock: 0, runT: 0, introT: INTRO_TIME, phase: 'intro', cards: 0, got: [false, false, false], cp: -1, st: [], caughtT: -1, leaving: false, hudT: 0, path: null, pathT: 0, grid: null, dist: null, moved: 0, near: 99 };
    buildShell();
    buildRooms();
    buildCards();
    buildGate();
    buildStatues();
    setDread(() => S.st.map(st => st.m.group.position), { hide: (on) => S.st.forEach(st => { st.m.group.visible = !on; }) });
    buildGrid();
    buildDoor({ x: 0, z: Z0 - 0.03, rotY: Math.PI, label: 'LEVELS', color: '#bfe8ff', wood: 0x5a6a72, portal: { target: 'levels', spawn: ARRIVAL_FROM_HOSPITAL, onEnter: () => toast('Back to the levels') } });
    S.hud = cameraPanel(1024, 200, 0.42, 0.082, 0.2, -0.75, 990);
    S.intro = cameraPanel(1280, 820, 1.0, 0.64, -0.04, -1.05, 995); S.intro.last = -1;
    S.scare = createJumpscare({ seed: 6161, variant: 'statue' });
    if (df.id !== 'normal') toast('Difficulty: ' + df.name + (df.checkpoints ? '' : ' (no checkpoints, 4 patients at the start)'), df.color);
    addStoryProps({ seed: 104, count: 26, corpses: 3 });   // krew, ślady, napisy i ciała (core/levelkit.js)
}

// ---------- BUDOWA ----------
function buildShell() {
    const wallC = 0xb8c4c0, edge = 0x202828;
    addCrispBlock(0, -0.5, (Z0 + Z1) / 2, X1 * 2 + 2, 1, Z0 - Z1 + 2, 0x7a8480, 0x101818, tex.floor, { rough: tex.floorRough });
    addCrispBlock(0, H + 0.5, (Z0 + Z1) / 2, X1 * 2 + 2, 1, Z0 - Z1 + 2, 0x6a7470, 0x101818);
    for (const s of [-1, 1]) addCrispBlock(s * (X1 + 0.3), H / 2, (Z0 + Z1) / 2, 0.6, H, Z0 - Z1 + 1, wallC, edge, tex.wall);   // ściany zewnętrzne
    addCrispBlock(0, H / 2, Z0 + 0.3, X1 * 2 + 1, H, 0.6, wallC, edge, tex.wall);
    addCrispBlock(0, H / 2, Z1 - 0.3, X1 * 2 + 1, H, 0.6, wallC, edge, tex.wall);
    // Ściany korytarza z przejściami do sal (3 m, na środku sali) i ściany między salami
    for (let i = 0; i < 4; i++) {
        const za = ROOM_Z[i], zb = ROOM_Z[i + 1], mid = (za + zb) / 2;
        for (const s of [-1, 1]) {
            addCrispBlock(s * CORR, H / 2, (za + mid + 1.5) / 2, 0.4, H, za - (mid + 1.5), wallC, edge, tex.wall);
            addCrispBlock(s * CORR, H / 2, (mid - 1.5 + zb) / 2, 0.4, H, (mid - 1.5) - zb, wallC, edge, tex.wall);
            addCrispBlock(s * (X1 + CORR) / 2, H / 2, zb, X1 - CORR, H, 0.4, wallC, edge, tex.wall);
            if (i === 0) addCrispBlock(s * (X1 + CORR) / 2, H / 2, za, X1 - CORR, H, 0.4, wallC, edge, tex.wall);   // zamyka sale od strony holu startowego
            addCrispBlock(s * CORR, H - 0.35, mid, 0.4, 0.7, 3, wallC, edge, tex.wall);   // nadproże nad przejściem
        }
    }
    // Zielone, migające świetlówki w korytarzu i w salach
    for (let z = 2; z > Z1; z -= 9) { const l = new THREE.PointLight(0xcff4e0, 16, 14, 1.6); l.position.set(0, H - 0.4, z); L.root.add(l); const f = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.06, 1.6), new THREE.MeshBasicMaterial({ color: 0xd8fff0 })); f.position.set(0, H - 0.1, z); L.root.add(f); }
}
function buildRooms() {
    const R = T.mkRng(4040), bed = 0xd8d8d0, steel = 0x7a8a90;
    for (let i = 0; i < 4; i++) for (const s of [-1, 1]) {
        const za = ROOM_Z[i], zb = ROOM_Z[i + 1], mid = (za + zb) / 2, cx = s * 7.2;
        // Łóżka, szafki i wózki: niskie przeszkody w salach (cień dla posągów i kryjówki dla ciebie)
        addCrispBlock(cx, 0.45, za - 3, 2.0, 0.9, 1.0, bed, 0x202828);
        addCrispBlock(cx + s * 1.6, 0.45, za - 3, 2.0, 0.9, 1.0, bed, 0x202828);
        addCrispBlock(s * 10.3, 1.0, mid, 0.8, 2.0, 2.4, steel, 0x202828);                                   // szafka
        addCrispBlock(cx - s * 0.8, 0.5, zb + 3, 1.2, 1.0, 1.2, steel, 0x202828);                           // wózek
        if (R() < 0.7) addCrispBlock(cx + s * 1.2, 0.35, mid + 1, 1.4, 0.7, 0.8, 0xb8b0a0, 0x202828);
    }
    // Plamy krwi na podłodze korytarza
    const blood = new THREE.MeshStandardMaterial({ map: T.createBloodPoolTexture(), transparent: true, roughness: 0.2, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
    for (let i = 0; i < 14; i++) { const m = new THREE.Mesh(new THREE.PlaneGeometry(1.2 + R() * 1.4, 1.2 + R() * 1.4), blood); m.rotation.set(-Math.PI / 2, 0, R() * 6.28); m.position.set((R() - 0.5) * 4, 0.015, 3 - R() * 54); L.root.add(m); }
}
function buildCards() {
    S.cardMesh = CARDS.map((p) => {
        const g = new THREE.Group(); g.position.set(p[0], p[1], p[2]);
        const card = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.2, 0.02), new THREE.MeshStandardMaterial({ color: 0x40d0ff, emissive: 0x2090c0, emissiveIntensity: 1.2 })); g.add(card);
        const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex.dot, color: 0x60e0ff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.8 })); glow.scale.set(1.1, 1.1, 1); g.add(glow);
        const l = new THREE.PointLight(0x60e0ff, 10, 7, 1.8); g.add(l); L.root.add(g);
        return g;
    });
}
function buildGate() {
    S.gate = addCrispBlock(0, H / 2, GATE_Z, CORR * 2, H, 0.3, 0xa02a2a, 0xff3030);
    S.gateOb = L.obstacles[L.obstacles.length - 1];
    S.gateLamp = new THREE.PointLight(0xff3030, 14, 9, 1.6); S.gateLamp.position.set(0, 2.4, GATE_Z + 1); L.root.add(S.gateLamp);
    buildDoor({ x: 0, z: EXIT_Z, rotY: 0, label: 'EXIT', color: '#70ff90', glow: 0x60ff90, wood: 0x2a3a2a, light: true, portal: { target: 'levels', spawn: ARRIVAL_FROM_HOSPITAL, onEnter: finish } });
}
function buildStatues() {
    const count = S.df.id === 'nightmare' ? 4 : 3;
    for (let i = 0; i < count; i++) addStatue(STATUES[i][0], STATUES[i][1], 900 + i);
}
function addStatue(x, z, seed) {
    const m = buildMannequin(T.mkRng(seed)); m.group.scale.setScalar(1.15); L.root.add(m.group);
    m.group.traverse(o => { if (o.isMesh && o.material && o.material.map) o.material = new THREE.MeshStandardMaterial({ color: 0xd8d4cc, roughness: 0.55 }); });
    addMonsterFace(m.head, { width: 0.052, open: 0.028, teeth: 9, long: 1.3, tears: 0x7a0a0a });
    for (const sx of [-1, 1]) { const e = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex.dot, color: 0xff2000, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); e.scale.set(0.08, 0.08, 1); e.position.set(sx * 0.04, 0.152, 0.1); e.renderOrder = 6; m.head.add(e); }
    const st = { m: m, x: x, z: z, home: [x, z], yaw: Math.random() * 6.28, moving: false, stepT: 0 };
    m.group.position.set(x, 0, z); S.st.push(st); return st;
}
// Karta budzi kolejnego pacjenta: pojawia się w korytarzu WAKE_BEHIND m za graczem (w stronę wejścia), a gdyby tam nie było miejsca, przed nim
function wakeStatue(p) {
    let z = Math.min(Z0 - 1.5, p.z + WAKE_BEHIND); if (Math.abs(z - p.z) < 8) z = Math.max(Z1 + 6, p.z - WAKE_BEHIND);
    addStatue(0, z, 920 + S.st.length); toast('Another patient wakes up behind you...', '#ff4a2a'); SFX.stinger({ x: 0, y: 1.5, z: z });
}
// Siatka 1 m do wyznaczania drogi posągów (komórka zablokowana, gdy stoi w niej przeszkoda wyższa niż 0,5 m)
function buildGrid() {
    const w = X1 - X0, d = Z0 - Z1, blocked = new Uint8Array(w * d);
    const obs = L.obstacles.map(o => o.box3).filter(b => b.max.y > 0.5 && b.min.y < 1.5);
    for (let j = 0; j < d; j++) for (let i = 0; i < w; i++) {
        const cx = X0 + i + 0.5, cz = Z1 + j + 0.5;
        if (obs.some(b => cx > b.min.x - 0.35 && cx < b.max.x + 0.35 && cz > b.min.z - 0.35 && cz < b.max.z + 0.35)) blocked[j * w + i] = 1;
    }
    S.grid = { w: w, d: d, blocked: blocked };
}
const cellOf = (x, z) => [Math.max(0, Math.min(S.grid.w - 1, Math.floor(x - X0))), Math.max(0, Math.min(S.grid.d - 1, Math.floor(z - Z1)))];
// BFS od gracza: dist[komórka] = liczba kroków do gracza
function bfsFrom(px, pz) {
    const G = S.grid, dist = new Int16Array(G.w * G.d).fill(-1), q = [], [ci, cj] = cellOf(px, pz);
    let s = cj * G.w + ci; if (G.blocked[s]) { for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const ni = ci + a, nj = cj + b; if (ni >= 0 && nj >= 0 && ni < G.w && nj < G.d && !G.blocked[nj * G.w + ni]) { s = nj * G.w + ni; break; } } }
    dist[s] = 0; q.push(s);
    for (let h = 0; h < q.length; h++) {
        const c = q[h], i = c % G.w, j = (c / G.w) | 0;
        for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const ni = i + a, nj = j + b; if (ni < 0 || nj < 0 || ni >= G.w || nj >= G.d) continue; const n = nj * G.w + ni; if (G.blocked[n] || dist[n] >= 0) continue; dist[n] = dist[c] + 1; q.push(n); }
    }
    S.dist = dist;
}

// ---------- ZDARZENIA ----------
function finish() {
    if (S.leaving) return; S.leaving = true;
    toast('You escaped the hospital!', '#7fc47f');
    levelReward('hospital', REWARD_FIRST, REWARD_REPEAT, 'escaping the hospital');
    S.ghost.finish(recordTime('hospital', S.runT) && !S.carried, S.runT);
}
function caught() {
    if (S.caughtT >= 0) return;
    S.caughtT = 0; S.scare.trigger(); releaseAll(); buzz('both', 1, 400);
    toast('A patient touched you...', '#e0533f');
}
function resetStatues() { for (const st of S.st) { st.x = st.home[0]; st.z = st.home[1]; } }
function takeCard(i, p) {
    S.got[i] = true; S.cards++; S.cardMesh[i].visible = false; SFX.fuse(); buzz('both', 0.7, 200);
    toast('Keycard ' + S.cards + '/3', '#7fe8ff');
    if (S.df.checkpoints) { S.cp = i; toast('Checkpoint saved', '#7fc47f'); }
    if (WAKE_CARDS.includes(i) && S.df.id !== 'easy' && p) wakeStatue(p);
    if (S.cards === 3) {
        const k = L.obstacles.indexOf(S.gateOb); if (k >= 0) L.obstacles.splice(k, 1);
        if (S.gateOb.body) S.gateOb.body.position.y = -50;
        S.gate.visible = false; S.gateLamp.color.setHex(0x30ff60); SFX.bell && SFX.bell();
        toast('The gate is open! Run to the EXIT!', '#ffd27a');
    }
}

const INTRO = [
    'Patients in this hospital freeze when your flashlight shines on them.',
    'Look away and they creep closer. Walk backwards if you must, but keep the beam on them!',
    'Find 3 keycards in the side rooms. The red gate at the end opens when you have all of them.',
    'A touch from a patient and you are caught. Each keycard saves a checkpoint (not on Nightmare).',
    'Careful: every keycard makes them faster, and the first two wake another patient behind you. In the dark they lunge when close.',
    'You can hear them scraping when they move. Silence means they are watched.'
];

// ---------- CO KLATKĘ ----------
export function update(dt, t, ctx) {
    if (!S || S.leaving) return;
    S.clock += dt; const p = ctx.body.position;
    S.ev.update(dt, S.phase === 'play' && S.caughtT < 0);
    S.scare.update(dt);
    if (S.introSkip === undefined) { S.introSkip = introSeen('hospital'); if (S.introSkip) S.introT = Math.min(S.introT, 3); }
    if (S.introT > 0) {
        S.introT -= dt;
        const sec = Math.max(0, Math.ceil(S.introT));
        if (sec !== S.intro.last) { S.intro.last = sec; drawInstructions(S.intro, 'The Hospital', INTRO, 'The ward wakes up in ' + sec + ' s', { bg: 'rgba(8,16,16,0.9)', border: '#7fe8ff', title: '#d8f8ff', text: '#dceef0', footer: '#ffb030', size: 28 }); }
        S.intro.mesh.visible = S.introT > 0 && !S.introSkip;
        if (S.introT <= 0) { S.phase = 'play'; toast('Find 3 keycards. Keep the light on them!', '#7fe8ff'); }
    }
    if (S.phase === 'play' && S.caughtT < 0) S.runT += dt;
    S.ghost.tick(dt, p, S.phase === 'play' && S.caughtT < 0);
    // Karty: dotknięcie ciałem
    S.cardMesh.forEach((g, i) => { if (!S.got[i]) { g.rotation.y = t * 1.5; g.position.y = CARDS[i][1] + Math.sin(t * 2 + i) * 0.08; if (Math.hypot(p.x - CARDS[i][0], p.z - CARDS[i][2]) < 0.9 && Math.abs(p.y - 1.0) < 1.2) takeCard(i, p); } });
    if (S.caughtT >= 0) {
        S.caughtT += dt;
        if (S.caughtT > 1.6) {
            if (S.cp >= 0 && takeRespawn(S)) { const c = CP[S.cp]; setPlayerPosition(c[0], c[1], c[2]); resetStatues(); S.caughtT = -1; S.carried = true; toast('Back to checkpoint ' + (S.cp + 1) + '. The patients return to their rooms.', '#7fc47f'); }
            else { S.leaving = true; ctx.goto('hospital'); return; }
        }
        animate(t); return;
    }
    if (S.phase === 'play') think(dt, p);
    animate(t);
    S.hudT -= dt; if (S.hudT <= 0) { S.hudT = 0.15; drawHud(); }
}
// Czy posąg jest teraz oświetlony latarką: w stożku patrzenia i bez ściany po drodze
function lit(st) {
    camera.getWorldPosition(_c); camera.getWorldDirection(_d);
    _q.set(st.x - _c.x, 1.3 - _c.y, st.z - _c.z); const dist = _q.length(); if (dist > SEE_DIST) return false;
    _q.divideScalar(dist);
    const cone = SEE_CONE[S.df.id] || SEE_CONE.normal;
    if (_d.dot(_q) < cone) return false;
    const steps = Math.ceil(dist / 0.6);
    for (let i = 1; i < steps; i++) {
        const k = i / steps; _q.set(_c.x + (st.x - _c.x) * k, _c.y + (1.3 - _c.y) * k, _c.z + (st.z - _c.z) * k);
        for (const o of L.obstacles) { const b = o.box3; if (o !== S.gateOb && b.max.y > 1.6 && b.containsPoint(_q)) return false; }
    }
    return true;
}
function think(dt, p) {
    S.pathT -= dt; if (S.pathT <= 0) { S.pathT = 0.35; bfsFrom(p.x, p.z); }
    const baseSpeed = (WALK + WALK_PER_CARD * S.cards) * S.df.speed; let near = 99, moving = 0;
    for (const st of S.st) {
        const dist = Math.hypot(p.x - st.x, p.z - st.z); near = Math.min(near, dist);
        st.moving = !lit(st);
        if (!st.moving) continue;
        moving++;
        // Krok po siatce w stronę gracza (w pobliżu idzie prosto)
        let tx = p.x, tz = p.z;
        if (dist > 3) {
            const G = S.grid, [ci, cj] = cellOf(st.x, st.z); let best = S.dist[cj * G.w + ci], bi = ci, bj = cj;
            if (best < 0) best = 9999;
            for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]]) {
                const ni = ci + a, nj = cj + b; if (ni < 0 || nj < 0 || ni >= G.w || nj >= G.d) continue;
                if (a && b && (G.blocked[cj * G.w + ni] || G.blocked[nj * G.w + ci])) continue;
                const dd = S.dist[nj * G.w + ni]; if (dd >= 0 && dd < best) { best = dd; bi = ni; bj = nj; }
            }
            tx = X0 + bi + 0.5; tz = Z1 + bj + 0.5;
        }
        const speed = dist < LUNGE_DIST ? baseSpeed * LUNGE_MUL : baseSpeed;   // blisko i w ciemności: rzuca się
        const dx = tx - st.x, dz = tz - st.z, d = Math.max(1e-4, Math.hypot(dx, dz)), m = Math.min(d, speed * dt);
        st.x += dx / d * m; st.z += dz / d * m; st.yaw = Math.atan2(p.x - st.x, p.z - st.z);
        st.stepT -= dt; if (st.stepT <= 0) { st.stepT = 0.7; SFX.step(0.55, { x: st.x, y: 0, z: st.z }); SFX.creak && Math.random() < 0.25 && SFX.creak(0.4, { x: st.x, y: 1, z: st.z }); }
        if (Math.hypot(p.x - st.x, p.z - st.z) < CATCH_DIST && p.y < 2.6) { caught(); return; }
    }
    S.near = near; S.moved = moving;
    if (near < 12) SFX.heartbeat(Math.max(0, 1 - near / 12));
}
function animate(t) {
    for (const st of S.st) {
        st.m.group.position.set(st.x, 0, st.z); st.m.group.rotation.y = st.yaw;
        // Posąg zastyga w pozie; w ruchu lekko drży
        st.m.group.rotation.z = st.moving ? Math.sin(t * 14) * 0.02 : 0;
    }
    S.gateLamp.intensity = S.cards === 3 ? 12 : 10 + Math.sin(t * 6) * 4;
}
function fmt(s) { s = Math.max(0, Math.floor(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); }
function drawHud() {
    const x = S.hud.ctx; panelBg(S.hud, 'rgba(8,16,16,0.72)');
    x.textBaseline = 'middle'; x.textAlign = 'left';
    x.font = 'bold 78px "Courier New", monospace'; x.fillStyle = '#d8f8ff'; x.fillText(fmt(S.runT), 30, 74);
    if (S.df.id !== 'normal') { x.font = 'bold 22px "Courier New", monospace'; x.fillStyle = S.df.color; x.fillText(S.df.name.toUpperCase(), 330, 18); }
    x.font = 'bold 36px "Courier New", monospace'; x.fillStyle = S.cards === 3 ? '#7fff90' : '#7fe8ff'; x.fillText('Keycards ' + S.cards + '/3', 330, 52);
    x.font = 'bold 26px "Courier New", monospace';
    let msg = 'Light them up!', col = '#c8e4e8';
    if (S.cards === 3) { msg = 'RUN to the EXIT gate!'; col = '#7fff90'; }
    else if (S.moved > 0 && S.near < 10) { msg = 'THEY ARE MOVING! Shine your light!'; col = '#ff6a4a'; }
    else if (S.near < 10) { msg = 'Frozen. Keep the beam on them.'; col = '#ffd27a'; }
    x.fillStyle = col; x.fillText(msg, 330, 108);
    S.hud.update();
}
export const testState = () => S;   // dla testów: dostęp do stanu poziomu
export function dispose() {
    if (S) { S.ev.dispose(); S.ghost.dispose(); S.hud.dispose(); S.intro.dispose(); S.scare.dispose(); }
    S = null;
}
