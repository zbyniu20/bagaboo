// ==========================================
// GAME MODE: BECOME THE MONSTER (wejście z salonu BagaBoo Games)
// Host losuje jednego gracza na potwora. Potwór łapie dłonią resztę. Runda trwa 2 minuty.
// Kto nie zostanie złapany, dostaje 200 Bagabucks. Potwór dostaje 200, jeśli złapie wszystkich.
// Gdy grasz sam, goni cię manekin-bot.
// MAPY: stacja kolejowa i pięć generowanych map (core/monstermaps.js: Hedge Maze, Container Yard, Night Supermarket, City Rooftops, Ruined Temple).
// LOBBY: po wejściu (i po każdej rundzie) wszyscy trafiają do sali z trzema polami, po jednym na każdą z 3 LOSOWYCH map (z sześciu, bez ostatnio granej). Gracz głosuje, stając na polu; host (albo gracz solo) liczy głosy z pozycji głów (lobbylogic.js: padOf, countVotes, gateStep),
// a wygrana mapa (remis losuje) ładuje się dla wszystkich. Przycisk START NOW na tablicy (tylko host) kończy głosowanie od razu. Przez sieć idą liczniki głosów (cleanVotes), numer mapy i ziarno (cleanMapPick).
// ==========================================
import { THREE, L, tex, camera, addCrispBlock, world } from '../core/engine.js';
import * as T from '../core/textures.js';
import { buildMannequin } from '../core/mannequin.js';
import { levelReward } from '../core/economy.js';
import { toast, Terminal, AMBER, AMBER_DIM, GOLD, OK_COL } from '../core/terminal.js';
import { hands, setPlayerPosition } from '../core/player.js';
import * as N from '../core/network.js';
import * as SFX from '../core/audio.js';
import { buzz } from '../core/haptics.js';
import { buildDoor, cameraPanel, panelBg, drawInstructions, createJumpscare , introSeen } from '../core/levelkit.js';
import { buildMonsterSkin } from '../core/monsterskins.js';
import { ARRIVAL_FROM_MONSTER } from './games.js';
import { MAPS, generateMap, pickMap, cleanMapPick, lobbyMap, cleanVotes, cleanOptions, pickOptions, LOBBY } from '../core/monstermaps.js';
import { GATE, countVotes, winnerOf, gateStep } from '../core/lobbylogic.js';
import { GAMES_CALM, SETTINGS } from '../core/settings.js';
import { pickDismember, cleanDismember, lostLeft, lostRight, lostHead, dismemberText } from '../core/dismemberlogic.js';

const WAIT = 10, WAIT_AFTER_VOTE = 6, ROUND = 120, RESULTS = 8, REWARD = 200;
const CATCH_DIST = 0.5;                     // dłoń potwora tak blisko głowy lub tułowia = złapany
const BOT_SPEED = 4.2, BOT_SPEED_MAX = 5.4;   // trochę wolniej od szybkiego biegu gracza: da się uciec, ale z wysiłkiem   // bot jest trochę szybszy od gracza i przyspiesza w trakcie rundy
const BOT_GRAVITY = 18, BOT_JUMP_MAX = 4.2;   // BOT_JUMP_MAX: domyślnie, mapa może dać własny (md.botJump)
const _unusedJump = 0;    // bot skacze na perony, wagony i schody (do 4,2 m w górę)
const MONSTER_BOOST = 1.15;                 // potwór jest trochę szybszy
const SCARE_MIN = 25, SCARE_MAX = 55;       // co ile sekund (losowo) jumpscare
export const info = { id: 'monster', name: 'Become the Monster', spawn: [0, 1.0, 12] };
let S = null;
const _p = new THREE.Vector3(), _h = new THREE.Vector3();

export function build() {
    S = { clock: 0, phase: 'lobby', t: 0, gate: { ph: 'open', t: 0 }, opts: pickOptions(-1, Math.random), lastMap: -1, votes: [0, 0, 0], win: -1, mon: null, caught: new Set(), surv: [], lastHostMsg: -10, netT: 0, introT: 10, hudT: 0, rewarded: false, tinted: false, bot: null, map: -1, seed: 0, md: null, mapGroup: null, mapObs: [], mapBodies: [], mapPortals: [], dm: Object.create(null), dmApplied: new Set(), localDm: 0, tearT: 0, flashA: 0 };
    // Wszyscy zaczynają w lobby; mapa ładuje się po głosowaniu (gość: po wiadomości od hosta)
    applyLobby(false);
    S.board = mapBoard.createMesh(6, 3.75); L.root.add(S.board); placeBoard();
    toast('Stand on a pad to vote for a map', GOLD);
    // Znacznik potwora (czerwona poświata i napis nad głową)
    const mc = T.makeCanvas(256, 64), mx = mc.getContext('2d');
    mx.font = 'bold 48px sans-serif'; mx.textAlign = 'center'; mx.textBaseline = 'middle'; mx.fillStyle = '#ff3a2a'; mx.shadowColor = '#ff0000'; mx.shadowBlur = 16; mx.fillText('MONSTER', 128, 34);
    S.tag = new THREE.Sprite(new THREE.SpriteMaterial({ map: T.toTex(mc, false), transparent: true, depthWrite: false })); S.tag.scale.set(1.2, 0.3, 1); S.tag.visible = false; L.root.add(S.tag);
    S.flash = new THREE.Mesh(new THREE.PlaneGeometry(3, 3), new THREE.MeshBasicMaterial({ color: 0x8a0000, transparent: true, opacity: 0, depthTest: false })); S.flash.position.z = -0.3; S.flash.renderOrder = 1004; S.flash.visible = false; camera.add(S.flash);
    S.aura = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex.dot, color: 0xff1a00, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.7 })); S.aura.scale.set(2.2, 2.2, 1); S.aura.visible = false; L.root.add(S.aura);
    S.auraLight = new THREE.PointLight(0xff2010, 0, 8, 2); L.root.add(S.auraLight);
    // Bot (gdy grasz sam)
    const b = buildMannequin(T.mkRng(666)); b.group.scale.setScalar(1.25); b.group.visible = false; L.root.add(b.group);
    for (const sx of [-1, 1]) { const e = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex.dot, color: 0xff2000, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); e.scale.set(0.1, 0.1, 1); e.position.set(sx * 0.04, 0.152, 0.11); b.head.add(e); }
    S.botMesh = b;
    S.hud = cameraPanel(1024, 200, 0.42, 0.082, 0.2, -0.75, 990);
    // Jumpscare'y w losowych chwilach: twarz pod nosem albo postać, która wyskakuje zza rogu i rzuca się na gracza
    S.scare = createJumpscare({ seed: 9911 });
    S.nextScare = SCARE_MIN + Math.random() * (SCARE_MAX - SCARE_MIN);
    const ap = buildMannequin(T.mkRng(31337)); ap.group.visible = false; L.root.add(ap.group);
    ap.group.traverse(o => { if (o.isMesh && o.material && o.material.map) o.material = new THREE.MeshStandardMaterial({ color: 0x2a2420, roughness: 0.9 }); });
    for (const sx of [-1, 1]) { const e = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex.dot, color: 0xffffff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); e.scale.set(0.09, 0.09, 1); e.position.set(sx * 0.04, 0.152, 0.11); ap.head.add(e); }
    S.appar = { m: ap, t: -1 };
    S.skins = {};   // modele potworów (skórki z zakładki BagaBoo Games)
    S.intro = cameraPanel(1280, 760, 1.0, 0.594, -0.04, -1.05, 995); S.intro.last = -1;
    N.onLevelMsg(onNet);
}

// ---------- MAPY: wymiana areny w trakcie gry ----------
const TEX = { wall: () => tex.wall, hedge: () => tex.plaster, brick: () => tex.wall, stone: () => tex.wall, shelf: () => tex.plaster, metal: () => tex.floor, step: () => tex.floor, wood: () => tex.wood };
function buildGenerated(md) {
    const A = md.A, H = md.H;
    addCrispBlock(0, -0.5, 0, A * 2 + 2, 1, A * 2 + 2, md.floor, 0x101018, tex.floor, { rough: tex.floorRough });
    addCrispBlock(0, H + 0.5, 0, A * 2 + 2, 1, A * 2 + 2, md.ceil, 0x101018);
    for (const [x, z, w, d] of [[0, -A - 0.5, A * 2 + 2, 1], [0, A + 0.5, A * 2 + 2, 1], [-A - 0.5, 0, 1, A * 2], [A + 0.5, 0, 1, A * 2]]) addCrispBlock(x, H / 2, z, w, H, d, md.wall, 0x2a2a20, tex.wall);
    for (const b of md.boxes) addCrispBlock(b.x, b.y, b.z, b.w, b.h, b.d, b.c, 0x101018, (TEX[b.k] || TEX.wall)());
    for (const l of md.lights) { const pl = new THREE.PointLight(md.lightColor || 0xe8f0ff, md.lightPower || 20, 26, 1.6); pl.position.set(l[0], l[1], l[2]); L.root.add(pl); }
}
function removeFrom(arr, items) { const set = new Set(items); for (let i = arr.length - 1; i >= 0; i--) if (set.has(arr[i])) arr.splice(i, 1); }
function clearMap() {
    if (!S.mapGroup) return;
    for (const b of S.mapBodies) world.removeBody(b);
    removeFrom(L.bodies, S.mapBodies); removeFrom(L.obstacles, S.mapObs); removeFrom(L.portals, S.mapPortals);
    S.mapGroup.traverse((o) => {
        if (o.geometry) o.geometry.dispose();
        if (o.isInstancedMesh) o.dispose();
        const mats = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : [];
        for (const m of mats) { for (const k of ['map', 'emissiveMap', 'normalMap', 'roughnessMap']) if (m[k] && !Object.values(tex).includes(m[k])) m[k].dispose(); m.dispose(); }
    });
    L.root.remove(S.mapGroup); S.mapGroup = null; S.mapObs = []; S.mapBodies = []; S.mapPortals = [];
}
// Buduje mapę idx (numer z MAPS) z ziarnem seed; teleport = przenieś gracza do wejścia nowej mapy
function applyMap(idx, seed, teleport) { applyLayout(generateMap(MAPS[idx].id, seed), idx, seed, teleport); }
function applyLobby(teleport) { applyLayout(lobbyMap(), -1, 0, teleport); }
function applyLayout(md, idx, seed, teleport) {
    clearMap();
    const g = new THREE.Group(), root0 = L.root, n = { o: L.obstacles.length, b: L.bodies.length, p: L.portals.length };
    L.root = g;   // wszystko, co buduje mapa, trafia do jednej grupy: da się ją potem usunąć
    try {
        if (md.fixed) buildStation(); else buildGenerated(md);
        if (md.pads) buildPads(md);
        buildDoor({ x: 0, z: md.A - 0.03, rotY: Math.PI, label: 'GAMES', color: '#d080ff', wood: 0x3a3048, portal: { target: 'games', spawn: ARRIVAL_FROM_MONSTER, onEnter: () => toast('Back to BagaBoo Games') } });
    } finally { L.root = root0; }
    root0.add(g);
    S.mapGroup = g; S.mapObs = L.obstacles.slice(n.o); S.mapBodies = L.bodies.slice(n.b); S.mapPortals = L.portals.slice(n.p);
    S.md = md; S.map = idx; S.seed = seed; if (!md.pads) S.padLabels = null;
    L.spawn = md.entry.slice();
    L.bounds = { minX: -md.A + 0.4, maxX: md.A - 0.4, minZ: -md.A + 0.4, maxZ: md.A - 0.4, maxY: md.H - 0.4 };
    if (S.board) placeBoard();
    mapBoard.dirty = true;
    if (teleport) { setPlayerPosition(md.entry[0], md.entry[1], md.entry[2]); toast(md.pads ? 'Vote: stand on a pad' : 'Map: ' + md.name, GOLD); }
}
// Pola głosowania: nazwa mapy i liczba głosów nad każdym polem (napisy przerysowują się przy zmianie liczników)
const PAD_COL = ['#ff8a7a', '#8ac4ff', '#ffd860', '#9aff90', '#e0a0ff', '#e8d8b0'];
function buildPads(md) {
    S.padLabels = md.pads.map((pd, i) => {
        const c = T.makeCanvas(512, 160), x = c.getContext('2d'), tx = T.toTex(c, false);
        const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tx, transparent: true, depthWrite: false })); sp.scale.set(3.0, 0.94, 1); sp.position.set(pd[0], 2.5, pd[1]); L.root.add(sp);
        return { ctx: x, tex: tx, drawn: '' };
    });
}
function drawPadLabels() {
    if (!S.padLabels) return;
    S.padLabels.forEach((pl, i) => {
        const key = S.opts[i] + ':' + S.votes[i] + ':' + (S.win === i && S.gate.ph === 'launching' ? 1 : 0); if (pl.drawn === key) return; pl.drawn = key;
        const x = pl.ctx, win = S.win === i && S.gate.ph === 'launching'; x.clearRect(0, 0, 512, 160);
        x.fillStyle = 'rgba(8,4,4,0.72)'; x.beginPath(); x.roundRect(6, 6, 500, 148, 22); x.fill();
        x.textAlign = 'center'; x.textBaseline = 'middle'; x.shadowColor = win ? '#ffffff' : PAD_COL[i % 6]; x.shadowBlur = win ? 26 : 12;
        x.fillStyle = win ? '#ffffff' : PAD_COL[i % 6]; x.font = 'bold 50px sans-serif'; x.fillText(MAPS[S.opts[i]].name, 256, 54);
        x.fillStyle = '#ffd8d0'; x.font = 'bold 44px sans-serif'; x.fillText(S.votes[i] + (S.votes[i] === 1 ? ' vote' : ' votes'), 256, 112);
        pl.tex.needsUpdate = true;
    });
}
// Tablica z wynikami na północnej ścianie lobby (wisi w miejscu md.board, zwrócona do wejścia)
function placeBoard() { const b = S.md.board || LOBBY.BOARD; S.board.position.set(b[0], b[1], b[2]); S.board.rotation.y = 0; }
const isAuth = () => S && N.NET.mode !== 'guest';   // głosowanie kończy host albo gracz solo
const inLobby = () => S && S.phase === 'lobby';
// Host kończy głosowanie od razu: wygrywa mapa z największą liczbą głosów (brak głosów = losowa)
function startNow() {
    if (!isAuth() || !inLobby() || S.gate.ph === 'launching') return;
    S.win = winnerOf(S.votes, Math.random); S.gate = { ph: 'launching', t: GATE.LAUNCH_SEC }; S.t = S.gate.t; S.netT = 0; mapBoard.dirty = true;
}
const mapBoard = new Terminal((t) => {
    t.background();
    if (!S) return;
    const g = S.gate, lobby = S.phase === 'lobby';
    const sub = !lobby ? 'Round in progress' : g.ph === 'launching' ? 'Loading ' + (S.win >= 0 ? MAPS[S.opts[S.win]].name : 'a random map of the 3') + ' in ' + Math.max(0, Math.ceil(g.t)) + ' s' : g.ph === 'counting' ? 'Voting ends in ' + Math.max(0, Math.ceil(g.t)) + ' s' : 'Stand on a pad to vote';
    t.header('Vote for the map', sub, AMBER_DIM);
    const lead = Math.max(0, ...S.votes);
    S.opts.forEach((mi, i) => {
        const m = MAPS[mi], y = 150 + i * 90, top = lead > 0 && S.votes[i] === lead;
        t.text((i + 1) + '. ' + m.name, 40, y, 32, top ? OK_COL : AMBER, 'left');
        t.text(S.votes[i] + (S.votes[i] === 1 ? ' vote' : ' votes'), 640, y, 32, top ? OK_COL : AMBER_DIM, 'right');
    });
    t.btn('start', 690, 154, 294, 130, 'START NOW', startNow, { tone: 'ok', size: 34, disabled: !isAuth() || !lobby || g.ph === 'launching' });
    t.text(isAuth() ? 'Host: ends the vote' : 'The host can end the vote', 837, 316, 20, AMBER_DIM, 'center');
    t.text(S.win >= 0 && g.ph === 'launching' ? MAPS[S.opts[S.win]].blurb : 'Vote for one of 3 random maps. Most votes wins, a tie is drawn at random, no votes = a random one of the 3.', 40, 574, 22, GOLD, 'left');
    t.text('The votes are counted from where you stand. The GAMES door takes you back.', 40, 610, 20, AMBER_DIM, 'left');
    t.scanlines();
});

// Stacja kolejowa: dwa perony, tory z pociągiem, kładka nad torami, filary, ławki, kasa,
// automaty i szyby wentylacyjne (puste w środku), którymi można się przeczołgać i uciec
function buildStation() {
    const A = 30, H = 12;   // stacja kolejowa 60 x 60 m
    const P = 1.2;   // wysokość peronu
    addCrispBlock(0, -0.5, 0, A * 2 + 2, 1, A * 2 + 2, 0x6a6a6e, 0x101018, tex.floor, { rough: tex.floorRough });
    addCrispBlock(0, H + 0.5, 0, A * 2 + 2, 1, A * 2 + 2, 0x2a2a30, 0x101018);
    for (const [x, z, w, d] of [[0, -A - 0.5, A * 2 + 2, 1], [0, A + 0.5, A * 2 + 2, 1], [-A - 0.5, 0, 1, A * 2], [A + 0.5, 0, 1, A * 2]]) addCrispBlock(x, H / 2, z, w, H, d, 0xd8d0b8, 0x2a2a20, tex.wall);
    // Perony (żółta linia przy krawędzi) i tory w wykopie
    for (const s of [-1, 1]) {
        addCrispBlock(s * 19, P / 2, 0, 22, P, A * 2, 0x8a8a90, 0x101018, tex.floor, { rough: tex.floorRough });
        const line = new THREE.Mesh(new THREE.PlaneGeometry(0.25, A * 2), new THREE.MeshBasicMaterial({ color: 0xf0c020 })); line.rotation.x = -Math.PI / 2; line.position.set(s * 8.4, P + 0.01, 0); L.root.add(line);
    }
    const rail = new THREE.MeshStandardMaterial({ color: 0x8a8a8a, metalness: 0.9, roughness: 0.3 }), tie = new THREE.MeshStandardMaterial({ map: tex.wood, color: 0x4a3a2a, roughness: 0.9 });
    for (const tx of [-4, 4]) {
        for (const rx of [-0.72, 0.72]) { const r = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.14, A * 2), rail); r.position.set(tx + rx, 0.07, 0); L.root.add(r); }
        const ties = new THREE.InstancedMesh(new THREE.BoxGeometry(2.2, 0.08, 0.25), tie, 60);
        const m4 = new THREE.Matrix4(); for (let i = 0; i < 60; i++) { m4.makeTranslation(tx, 0.04, -A + 0.5 + i); ties.setMatrixAt(i, m4); } L.root.add(ties);
    }
    // Pociąg na lewym torze: 3 wagony z oknami (dachy na 3,6 m, można na nie wejść)
    const wc = T.makeCanvas(512, 256), wx = wc.getContext('2d');
    wx.fillStyle = '#2a4a6a'; wx.fillRect(0, 0, 512, 256); wx.fillStyle = '#d8d0b0'; wx.fillRect(0, 170, 512, 20);
    for (let i = 0; i < 4; i++) { wx.fillStyle = '#0a0e14'; wx.fillRect(30 + i * 122, 50, 92, 90); wx.fillStyle = 'rgba(120,160,200,0.25)'; wx.fillRect(34 + i * 122, 54, 40, 82); }
    const wt = T.toTex(wc, false);
    for (const z of [-20, -7, 6]) {
        const car = addCrispBlock(-4, 1.9, z, 3.2, 3.4, 12, 0xffffff, 0x0a1018);
        car.material.map = wt; car.material.normalMap = null; car.material.needsUpdate = true;
        addCrispBlock(-4, 3.65, z, 3.0, 0.15, 11.6, 0x3a3a40, 0x0a1018);
    }
    // Kładka nad torami ze schodami na obu peronach
    addCrispBlock(0, 6.0, 16, 2 * A - 4, 0.3, 2.6, 0x5a5a62, 0x101018);
    for (const s of [-1, 1]) for (let i = 0; i < 12; i++) addCrispBlock(s * 26, P + 0.2 + i * 0.4, 26.2 - i * 0.75, 2.6, 0.4, 0.75, 0x7a7a80, 0x101018);   // schody od strony wejścia
    // Filary, ławki, kasa biletowa, automaty
    for (const s of [-1, 1]) for (const z of [-22, -11, 0, 11, 22]) addCrispBlock(s * 12, P + (H - P) / 2, z, 0.8, H - P, 0.8, 0x9a9488, 0x202020);
    for (const s of [-1, 1]) for (const z of [-16, -5, 5]) addCrispBlock(s * 17, P + 0.25, z, 2.2, 0.5, 0.6, 0x7a4a2a, 0x201010, tex.wood);
    addCrispBlock(22, P + 1.3, -2, 4, 2.6, 3, 0x3a5a7a, 0x101820);
    for (const z of [-20, -18]) addCrispBlock(-28.6, P + 1.0, z, 1.2, 2.0, 1.4, 0xc02020, 0x200808);
    // Szyby wentylacyjne: puste w środku (1,3 m), wejścia z obu końców
    duct(-20, P, -26, 16, 'x');           // w głębi lewego peronu
    duct(21, P, 20, 12, 'z');             // wzdłuż prawego peronu
    duct(0, 4.4, -10, 26, 'x');           // wysoko nad torami: z dachu wagonu na drugi peron
    for (const s of [-1, 1]) for (let i = 0; i < 6; i++) addCrispBlock(s * 14.4, 1.8 + i * 0.5, -10 + (i % 2 ? 0.5 : -0.5), 0.7, 0.18, 0.5, 0x5a5a5a, 0x101010);   // półki do wysokiego szybu
    // Świetlówki i światła
    for (const s of [-1, 1]) for (const z of [-20, 0, 20]) { const l = new THREE.PointLight(0xe8f0ff, 22, 26, 1.6); l.position.set(s * 16, H - 1.5, z); L.root.add(l); }
    for (const s of [-1, 0, 1]) for (let z = -A + 4; z < A; z += 8) { const f = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.08, 2.4), new THREE.MeshBasicMaterial({ color: 0xe8f0ff })); f.position.set(s * 16, H - 0.1, z); L.root.add(f); }
}
// Pusty w środku szyb wentylacyjny o długości len wzdłuż osi 'x' albo 'z'; (x, y, z) = środek podłogi
function duct(x, y, z, len, axis) {
    const W = 1.5, Hh = 1.4, t = 0.12, col = 0x8a9098, edge = 0x202428, along = axis === 'x';
    const box = (dx, dy, dz, w, h, d) => addCrispBlock(x + dx, y + dy, z + dz, along ? len : w, h, along ? d : len, col, edge);
    box(0, Hh + t / 2, 0, W + 2 * t, t, W + 2 * t);                          // sufit
    if (y > 0.5) box(0, -t / 2, 0, W + 2 * t, t, W + 2 * t);                 // podłoga (gdy szyb wisi wyżej)
    if (along) { box(0, Hh / 2, -(W / 2 + t / 2), 0, Hh, t); box(0, Hh / 2, W / 2 + t / 2, 0, Hh, t); }
    else { box(-(W / 2 + t / 2), Hh / 2, 0, t, Hh, 0); box(W / 2 + t / 2, Hh / 2, 0, t, Hh, 0); }
}

// ---------- SIEĆ I ROLA ----------
function isAuthority() {
    if (N.NET.mode !== 'guest') return true;
    const hs = N.hostState();
    return !(hs && hs.lvl === 'monster' && S.clock - S.lastHostMsg < 1.5);
}
function participants() {
    const list = ['me'];
    if (N.NET.mode === 'host') for (const id in N.playersState) { if (id === N.myId()) continue; const st = N.playersState[id]; if (st && st.lvl === 'monster' && st.head) list.push(id); }
    return list;
}
const toNet = (id) => id === 'me' ? N.myId() : id;
const fromNet = (id) => id === N.myId() ? 'me' : id;
function onNet(msg) {
    if (!S || !msg || N.NET.mode === 'host' || msg.k !== 'st') return;
    S.lastHostMsg = S.clock;
    const pk = cleanMapPick(msg.mp, msg.sd);   // mapa od hosta: tylko liczby z zakresów
    if (msg.ph === 'lobby') {
        if (S.map !== -1) applyLobby(true);
        const op = cleanOptions(msg.op); if (op) S.opts = op;   // 3 losowe mapy od hosta (tylko liczby z zakresu)
        const vt = cleanVotes(msg.vt); if (vt) S.votes = vt;
        S.gate = { ph: msg.gp === 'counting' || msg.gp === 'launching' ? msg.gp : 'open', t: Number.isFinite(msg.t) ? Math.max(0, Math.min(60, msg.t)) : 0 };
        S.win = Number.isInteger(msg.wn) && msg.wn >= 0 && msg.wn < LOBBY.OPTIONS ? msg.wn : -1;
        S.phase = 'lobby'; S.t = S.gate.t; S.mon = null; S.caught = new Set(); S.surv = []; S.dm = cleanDismember(null);
        return;
    }
    if (pk && (pk.i !== S.map || pk.seed !== S.seed)) applyMap(pk.i, pk.seed, true);
    const prev = S.phase;
    S.phase = msg.ph; S.t = msg.t; S.mon = msg.mon ? fromNet(msg.mon) : null;
    const wasCaught = S.caught.has('me');
    S.caught = new Set((msg.caught || []).map(fromNet)); S.surv = (msg.surv || []).map(fromNet); S.dm = cleanDismember(msg.dm);   // urwane kończyny od hosta (tylko poprawne kody)
    if (!wasCaught && S.caught.has('me')) localCaught();
    if (msg.ph === 'play' && prev !== 'play') startedRound();
    if (msg.ph === 'results' && prev !== 'results') roundOver();
}
function broadcast() {
    N.sendLevelMsg({ k: 'st', mp: S.map, sd: S.seed, op: S.opts, vt: S.votes, gp: S.gate.ph, wn: S.win, ph: S.phase, t: S.t, mon: S.mon && S.mon !== 'bot' ? toNet(S.mon) : null, caught: [...S.caught].map(toNet), surv: S.surv.map(toNet), dm: Object.assign({}, S.dm) });
}
function startedRound() {
    S.rewarded = false;
    // Potwór i uciekający startują w różnych końcach stacji
    const md = S.md, jit = md.fixed ? 2 : 0;   // na wygenerowanych mapach starty są z wolnych miejsc, bez losowego przesunięcia
    if (S.mon === 'me') setPlayerPosition(md.monster[0], md.monster[1], md.monster[2]);
    else { const sp = md.survivors[(Math.random() * md.survivors.length) | 0]; setPlayerPosition(sp[0] + (Math.random() - 0.5) * jit, sp[1], sp[2] + (Math.random() - 0.5) * jit); }
    // Start potwora: jumpscare u wszystkich uciekających (potwór dostaje ryk i wibrację)
    if (S.mon !== 'me' && S.scare) S.scare.trigger();
    if (S.mon === 'me') { toast('You are the MONSTER! Catch everyone!', '#ff4a2a'); SFX.roar(0.8); buzz('both', 0.8, 400); }
    else if (S.mon === 'bot') toast('The mannequin is hunting you. Survive 2 minutes!', '#ff6a4a');
    else toast('Run! Do not let the monster touch you!', '#ff6a4a');
}
function roundOver() {
    if (S.rewarded) return; S.rewarded = true;
    if (S.surv.includes('me')) { toast('You survived!', '#7fc47f'); levelReward('monster', REWARD, REWARD, 'survived the monster'); }
    else if (S.mon === 'me' && S.surv.length === 0) { toast('You caught everyone!', '#7fc47f'); levelReward('monster', REWARD, REWARD, 'caught everyone'); }
    else if (S.mon === 'me') toast('Time is up. Some escaped you.', '#ffb030');
    else toast('You were caught. No reward this round.', '#e0533f');
}

// ---------- LOBBY: liczenie głosów (host albo gracz solo, z własnego widoku pozycji głów) ----------
function lobbyThink(dt) {
    const heads = {};
    for (const id of participants()) { const h = headOf(id); if (h) heads[id] = { x: h.x, y: h.y, z: h.z }; }
    const v = countVotes(heads, S.md.pads);
    S.votes = v.counts;
    if (S.gate.ph === 'launching') { const r = gateStep(S.gate, dt, v.total, Object.keys(heads).length); S.gate = { ph: r.ph, t: r.t }; S.t = S.gate.t; if (r.event === 'go') launchVoted(); return; }
    const r = gateStep(S.gate, dt, v.total, Object.keys(heads).length);
    S.gate = { ph: r.ph, t: r.t }; S.t = S.gate.t;
    if (r.event === 'lock') S.win = winnerOf(v.counts, Math.random);   // remis rozstrzyga losowanie, brak głosów = -1 (losowa mapa)
    mapBoard.dirty = true;
}
function launchVoted() {
    const idx = S.win >= 0 ? S.opts[S.win] : S.opts[(Math.random() * S.opts.length) | 0], pk = pickMap(idx, -1);   // wygrana propozycja albo losowa z trzech
    S.lastMap = idx;
    S.phase = 'wait'; S.t = WAIT_AFTER_VOTE; S.gate = { ph: 'open', t: 0 }; S.win = -1; S.mon = null;
    applyMap(pk.i, pk.seed, true); S.netT = 0; mapBoard.dirty = true;
}

// ---------- MÓZG RUNDY (host albo gracz solo) ----------
function think(dt, p) {
    if (S.phase === 'lobby') { lobbyThink(dt); return; }   // głosowanie na mapę
    S.t -= dt;
    if (S.phase === 'wait') {
        if (S.t <= 0) {
            const parts = participants();
            S.mon = parts.length >= 2 ? parts[(Math.random() * parts.length) | 0] : 'bot';
            S.caught = new Set(); S.surv = []; S.dm = Object.create(null); S.phase = 'play'; S.t = ROUND;
            if (S.mon === 'bot') { S.bot = { x: S.md.monster[0], y: 0, z: S.md.monster[2], vy: 0, speed: BOT_SPEED, ground: true, stuck: 0, lastD: 99, side: 0 }; }
            startedRound();
        }
    } else if (S.phase === 'play') {
        const parts = participants().filter(id => id !== S.mon);
        if (S.mon === 'bot') moveBot(dt, p);
        else for (const id of parts) if (!S.caught.has(id) && touched(id)) catchPlayer(id);
        if (S.t <= 0 || parts.every(id => S.caught.has(id))) {
            S.surv = parts.filter(id => !S.caught.has(id)); S.phase = 'results'; S.t = RESULTS; roundOver();
        }
    } else if (S.phase === 'results' && S.t <= 0) {
        S.phase = 'lobby'; S.gate = { ph: 'open', t: 0 }; S.opts = pickOptions(S.lastMap, Math.random); S.votes = [0, 0, 0]; S.win = -1; S.t = 0; S.mon = null; S.bot = null; S.dm = Object.create(null);   // po rundzie wszyscy wracają do lobby na nowe głosowanie
        applyLobby(true);
        S.netT = 0; mapBoard.dirty = true;
    }
}
// Pozycja dłoni potwora i głowy gracza (lokalnie albo z sieci)
function handsOf(id) {
    if (id === 'me') return hands.L ? [hands.L.position, hands.R.position] : [];
    const st = N.playersState[id]; if (!st || !st.h1) return [];
    return [new THREE.Vector3().fromArray(st.h1.p), new THREE.Vector3().fromArray(st.h2.p)];
}
function headOf(id) {
    if (id === 'me') { camera.getWorldPosition(_p); return _p.clone(); }
    const st = N.playersState[id]; return st && st.head ? new THREE.Vector3().fromArray(st.head.p) : null;
}
function touched(id) {
    const hd = headOf(id); if (!hd) return false;
    const body = hd.clone(); body.y -= 0.45;
    return handsOf(S.mon).some(h => h.distanceTo(hd) < CATCH_DIST || h.distanceTo(body) < CATCH_DIST + 0.05);
}
function catchPlayer(id) {
    S.caught.add(id); S.dm[toNet(id)] = pickDismember(Math.random);   // los: lewa ręka, prawa ręka, obie albo głowa (widoczne dla graczy z włączoną opcją Gore)
    if (id === 'me') localCaught();
    if (S.mon === 'me') { SFX.stinger(); buzz('both', 0.7, 150); toast('Caught one!', '#ff6a4a'); }
}
// Urwane kończyny: pokazujemy je tylko, gdy gracz ma włączone Gore (menu pauzy; domyślnie włączone). Własne ręce chowamy lokalnie, cudze robi network.js (setDismember).
// Animacja u ofiary: przez TEAR_TIME s drżą kontrolery i narasta czerwony błysk, potem ręce znikają (głowa: tylko błysk i krew), a to trwa do nowej rundy albo lobby.
const TEAR_TIME = 0.6;
function localDismember(code) {
    if (code === S.localDm) return;
    const prev = S.localDm; S.localDm = code;
    if (!code) { S.tearT = 0; S.flashA = 0; if (hands.L) hands.L.visible = true; if (hands.R) hands.R.visible = true; return; }
    if (!prev) { S.tearT = TEAR_TIME; toast('The monster grabs you...', '#ff3a2a'); }
}
function tickLocalTear(dt) {
    const code = S.localDm;
    if (S.tearT > 0) {
        S.tearT -= dt; const k = 1 - Math.max(0, S.tearT) / TEAR_TIME;
        buzz('both', 0.4 + 0.6 * k, 60); S.flashA = Math.max(S.flashA, 0.12 + 0.25 * k);
        if (S.tearT <= 0) {   // urwane: ręce znikają, krew tryska z miejsca odcięcia
            for (const [h, lost] of [[hands.L, lostLeft(code)], [hands.R, lostRight(code)]]) if (h && lost) { h.visible = false; N.bloodBurst(h.position, 26); }
            if (lostHead(code)) { camera.getWorldPosition(_p); _p.y -= 0.25; N.bloodBurst(_p, 30); }
            SFX.stinger(); buzz('both', 1, 400); S.flashA = 0.8; toast('The monster tore off ' + dismemberText(code) + '!', '#ff3a2a');
        }
    } else S.flashA = Math.max(0, S.flashA - dt * 0.9);
    S.flash.material.opacity = S.flashA; S.flash.visible = S.flashA > 0.01;
}
function syncDismember() {
    const on = !!SETTINGS.gore, seen = new Set();
    for (const k of Object.keys(S.dm)) { const id = fromNet(k); seen.add(id); const c = on ? S.dm[k] : 0; if (id === 'me') localDismember(c); else N.setDismember(id, c); }
    for (const id of S.dmApplied) if (!seen.has(id)) { if (id === 'me') localDismember(0); else N.setDismember(id, 0); }
    S.dmApplied = seen;
}
function localCaught() { SFX.scare(); toast('You were caught! Watch the others.', '#e0533f'); }
// Bot: biegnie prosto do gracza, wpada na przeszkody, wskakuje na nie (perony, wagony, schody, szyby)
// i zeskakuje w dół. Stoi na górnych ściankach pudełek kolizji.
function moveBot(dt, p) {
    const b = S.bot, R = 0.4, TALL = 1.2, jumpMax = S.md.botJump || BOT_JUMP_MAX;
    b.speed = Math.min(BOT_SPEED_MAX, b.speed + dt * 0.015);
    const goal = S.md.nav ? S.md.nav.next(b.x, b.z, p.x, p.z) : p;   // w labiryncie bot idzie trasą po komórkach
    let dx = goal.x - b.x, dz = goal.z - b.z; const d = Math.hypot(p.x - b.x, p.z - b.z), dg = Math.hypot(dx, dz);
    if (dg > 0.05) { dx /= dg; dz /= dg; } else { dx = 0; dz = 0; }
    if (b.side) { const sx = -dz * b.side, sz = dx * b.side; dx = dx * 0.4 + sx; dz = dz * 0.4 + sz; b.sideT -= dt; if (b.sideT <= 0) b.side = 0; }   // obejście, gdy utknie
    const ox = b.x, oz = b.z;
    b.x += dx * b.speed * dt; b.z += dz * b.speed * dt;
    b.vy -= BOT_GRAVITY * dt; b.y += b.vy * dt;
    let blockedTop = null; b.ground = false;
    for (const o of L.obstacles) {
        const bb = o.box3;
        if (b.x < bb.min.x - R || b.x > bb.max.x + R || b.z < bb.min.z - R || b.z > bb.max.z + R) continue;
        if (b.y + TALL <= bb.min.y || b.y >= bb.max.y) {
            // Lądowanie na górze pudełka
            if (b.vy <= 0 && b.y < bb.max.y + 0.05 && b.y > bb.max.y - 0.5 && b.x > bb.min.x - R * 0.5 && b.x < bb.max.x + R * 0.5 && b.z > bb.min.z - R * 0.5 && b.z < bb.max.z + R * 0.5) { b.y = bb.max.y; b.vy = 0; b.ground = true; }
            continue;
        }
        // Wejście w bok przeszkody: niska krawędź (do 0,45 m) pokonuje krokiem, wyższą zapamiętuje do skoku
        const step = bb.max.y - b.y;
        if (step <= 0.45 && b.vy <= 0) { b.y = bb.max.y; b.vy = 0; b.ground = true; continue; }
        if (b.ground || b.vy <= 0) blockedTop = Math.max(blockedTop || 0, bb.max.y);
        const ex = Math.min(b.x - (bb.min.x - R), bb.max.x + R - b.x), ez = Math.min(b.z - (bb.min.z - R), bb.max.z + R - b.z);
        if (ex < ez) b.x = b.x < (bb.min.x + bb.max.x) / 2 ? bb.min.x - R : bb.max.x + R; else b.z = b.z < (bb.min.z + bb.max.z) / 2 ? bb.min.z - R : bb.max.z + R;
    }
    if (b.y <= 0) { b.y = 0; b.vy = 0; b.ground = true; }
    // Skok: na przeszkodę przed nim albo do gracza, który jest wyżej
    const wantUp = p.y - 0.35 > b.y + 0.8 && d < 3.5;
    if (b.ground && (blockedTop !== null || wantUp)) {
        const h = Math.min(jumpMax, Math.max(0.6, (blockedTop !== null ? blockedTop : p.y - 0.35) - b.y + 0.35));
        b.vy = Math.sqrt(2 * BOT_GRAVITY * h); b.ground = false;
    }
    // Utknął (nie zbliża się): obejście w bok
    const moved = Math.hypot(b.x - ox, b.z - oz);
    if (moved < b.speed * dt * 0.3 && b.ground) { b.stuck += dt; if (b.stuck > 0.8) { b.stuck = 0; b.side = Math.random() < 0.5 ? -1 : 1; b.sideT = 1.0; b.vy = Math.sqrt(2 * BOT_GRAVITY * 1.2); b.ground = false; } } else b.stuck = 0;
    if (!S.caught.has('me') && Math.hypot(p.x - b.x, p.z - b.z) < 1.0 && Math.abs(p.y - (b.y + 1.0)) < 1.5) catchPlayer('me');
}

// ---------- CO KLATKĘ ----------
export function update(dt, t, ctx) {
    if (!S) return;
    S.clock += dt;
    const p = ctx.body.position, auth = isAuthority();
    if (S.introSkip === undefined) { S.introSkip = introSeen('monster'); if (S.introSkip) S.introT = Math.min(S.introT, 3); }   // samouczek tylko za pierwszym razem
    if (S.phase === 'lobby') S.intro.mesh.visible = false;
    if (S.introT > 0 && S.phase !== 'lobby') {
        S.introT -= dt;
        const sec = Math.max(0, Math.ceil(S.introT));
        if (sec !== S.intro.last) { S.intro.last = sec; drawInstructions(S.intro, 'Become the Monster', [
            'One player becomes the monster. Everyone else runs and climbs to stay out of reach.',
            'The monster catches you by touching your head or body with a hand.',
            'Not caught after 2 minutes = 200 Bagabucks. The monster wins 200 if it catches everyone.',
            'Playing alone? A fast mannequin hunts you instead. It can jump, so keep moving!',
            'Before every round you vote for 1 of 3 random maps by standing on a pad in the lobby. The GAMES door takes you back.'], 'This closes in ' + sec + ' s', { bg: 'rgba(16,4,4,0.9)', border: '#ff4a4a', title: '#ffd0c8', text: '#f4e0dc', footer: '#ffb030', size: 30 }); }
        S.intro.mesh.visible = S.introT > 0 && !S.introSkip;
    }
    if (auth) {
        think(dt, p);
        if (N.NET.mode === 'host') { S.netT -= dt; if (S.netT <= 0) { S.netT = 0.2; broadcast(); } }
    }
    syncDismember(); tickLocalTear(dt);
    // Potwór: czerwona poświata nad głową, u siebie czerwone dłonie i szybszy ruch
    const mon = S.phase === 'play' ? S.mon : null;
    let mpos = null;
    if (mon === 'bot') {
        const b = S.bot, m = S.botMesh; m.group.visible = true;
        m.group.position.set(b.x, b.y + (b.ground ? Math.abs(Math.sin(t * 9)) * 0.06 : 0), b.z); m.group.rotation.y = Math.atan2(p.x - b.x, p.z - b.z);
        mpos = new THREE.Vector3(b.x, b.y + 2.3, b.z);
        if (Math.floor(t * 2.2) !== S.step) { S.step = Math.floor(t * 2.2); SFX.step(0.8, { x: b.x, y: 0, z: b.z }); }
    } else S.botMesh.group.visible = false;
    if (mon && mon !== 'bot') mpos = headOf(mon);
    updateSkins(mon, mpos, t);
    randomScares(dt, t, p);
    S.tag.visible = S.aura.visible = !!mpos && mon !== 'me';
    S.auraLight.intensity = mpos && mon !== 'me' ? 5 : 0;
    if (mpos) { S.tag.position.copy(mpos).y += 0.55; S.aura.position.copy(mpos); S.auraLight.position.copy(mpos); }
    setTint(mon === 'me');
    L.moveScale = mon === 'me' ? MONSTER_BOOST : 1;
    if (mpos && mon !== 'me' && !S.caught.has('me')) { _h.copy(mpos); SFX.heartbeat(Math.max(0, 1 - _h.distanceTo(p) / 12)); }
    S.hudT -= dt; if (S.hudT <= 0) { S.hudT = 0.15; drawHud(); }
    if (S.board) S.board.visible = S.phase === 'lobby';
    drawPadLabels();
    const bs = S.phase + ':' + Math.ceil(S.t) + ':' + S.map + ':' + S.gate.ph + ':' + S.opts.join(',') + ':' + S.votes.join(',') + ':' + S.win; if (bs !== S.boardSig) { S.boardSig = bs; mapBoard.dirty = true; }
}
// Czerwone, świecące dłonie gdy jesteś potworem
function setTint(on) {
    if (on === S.tinted || !hands.L) return;
    S.tinted = on;
    for (const h of [hands.L, hands.R]) h.traverse(o => { if (o.isMesh && o.material && o.material.emissive) { if (on) { o.userData.em = o.material.emissive.getHex(); o.material.emissive.setHex(0xaa1000); } else if (o.userData.em !== undefined) o.material.emissive.setHex(o.userData.em); } });
}
function fmt(t) { t = Math.max(0, Math.ceil(t)); return Math.floor(t / 60) + ':' + String(t % 60).padStart(2, '0'); }
function drawHud() {
    const x = S.hud.ctx; panelBg(S.hud, 'rgba(16,4,4,0.72)');
    x.textBaseline = 'middle'; x.textAlign = 'left';
    x.font = 'bold 80px "Courier New", monospace'; x.fillStyle = '#ffd8d0'; x.fillText(fmt(S.t), 30, 74);
    x.font = 'bold 32px "Courier New", monospace';
    let role = '', col = '#ffd8d0';
    if (S.phase === 'lobby') { role = S.gate.ph === 'open' ? 'Vote: stand on a pad' : 'Voting...'; col = '#ffb030'; }
    else if (S.phase === 'wait') { role = 'Next round starts soon'; col = '#ffb030'; }
    else if (S.phase === 'results') { role = S.surv.includes('me') ? 'You survived! +200' : 'Round over'; col = '#9aff60'; }
    else if (S.mon === 'me') { role = 'You are the MONSTER'; col = '#ff4a2a'; }
    else if (S.caught.has('me')) { role = 'Caught. Watch the others.'; col = '#ff8a6a'; }
    else { role = 'Run! Stay out of reach.'; col = '#9aff60'; }
    x.fillStyle = col; x.fillText(role, 330, 52);
    const total = participants().length;
    x.textAlign = 'right'; x.font = 'bold 26px "Courier New", monospace'; x.fillStyle = '#ffb030'; x.fillText(S.md.name, 1000, 30); x.textAlign = 'left'; x.font = 'bold 32px "Courier New", monospace';
    x.fillStyle = '#ffd8d0'; x.fillText(S.phase === 'play' && S.mon !== 'bot' ? 'Caught ' + S.caught.size : (N.NET.mode === 'solo' ? 'Solo vs the mannequin' : 'Players here: ' + total), 330, 110);
    S.hud.update();
}
// Skórka potwora: gracz-potwór (u innych) wygląda jak wybrany potwór z jego zakładki BagaBoo Games
function updateSkins(mon, mpos, t) {
    for (const key in S.skins) S.skins[key].group.visible = false;
    for (const id in N.playersState) N.setAvatarHidden(id, false);
    if (!mon || mon === 'me' || mon === 'bot' || !mpos) return;
    const st = N.playersState[mon], skin = st && st.profile ? st.profile.mskin : 'none';
    if (!skin || skin === 'none') return;
    const key = mon + ':' + skin;
    if (!S.skins[key]) { const m = buildMonsterSkin(skin); if (!m) return; m.group.scale.setScalar(1.15); L.root.add(m.group); S.skins[key] = m; }
    const m = S.skins[key]; m.group.visible = true; m.group.position.copy(mpos);
    if (st.head && st.head.q) { const q = new THREE.Quaternion().fromArray(st.head.q), e = new THREE.Euler().setFromQuaternion(q, 'YXZ'); m.group.rotation.set(0, e.y + Math.PI, 0); }   // modele patrzą w stronę +Z, a kamera gracza w -Z, więc obrót o 180°
    m.animate(t);
    N.setAvatarHidden(mon, true);
    S.tag.visible = false;
}
// Losowe jumpscare'y w losowym czasie i miejscu (u każdego gracza osobno)
function randomScares(dt, t, p) {
    S.scare.update(dt);
    if (GAMES_CALM.on || S.phase === 'lobby') return;   // BagaBoo Games: bez jumpscare'ów i zjaw
    const a = S.appar;
    if (a.t >= 0) {
        a.t += dt;
        camera.getWorldPosition(_p);
        const g = a.m.group;
        if (a.t > 1.1) {   // rzuca się na gracza
            const dx = _p.x - g.position.x, dz = _p.z - g.position.z, d = Math.hypot(dx, dz);
            g.position.x += dx / d * Math.min(d, 14 * dt); g.position.z += dz / d * Math.min(d, 14 * dt);
            if (d < 0.9) { g.visible = false; a.t = -1; S.scare.trigger(); buzz('both', 1, 400); }
        } else a.m.head.rotation.z = Math.sin(t * 30) * 0.15;   // drga, zanim skoczy
        g.rotation.y = Math.atan2(_p.x - g.position.x, _p.z - g.position.z);
        return;
    }
    S.nextScare -= dt;
    if (S.nextScare > 0 || S.scare.active()) return;
    S.nextScare = SCARE_MIN + Math.random() * (SCARE_MAX - SCARE_MIN);
    if (Math.random() < 0.4) { S.scare.trigger(); return; }   // twarz znikąd
    // Postać pojawia się 4-7 m od gracza w losowym kierunku przed nim
    camera.getWorldDirection(_h); _h.y = 0; _h.normalize();
    const ang = Math.atan2(_h.x, _h.z) + (Math.random() - 0.5) * 1.6, r = 4 + Math.random() * 3;
    const A = S.md.A, x = Math.max(-A + 1, Math.min(A - 1, p.x + Math.sin(ang) * r)), z = Math.max(-A + 1, Math.min(A - 1, p.z + Math.cos(ang) * r));
    a.m.group.position.set(x, Math.max(0, p.y - 1.0), z); a.m.group.visible = true; a.t = 0;
    SFX.stinger({ x: x, y: 1.5, z: z });
}
export function dispose() {
    if (S) { S.scare.dispose(); for (const id in N.playersState) N.setAvatarHidden(id, false); N.clearDismember(); camera.remove(S.flash); if (hands.L) hands.L.visible = true; if (hands.R) hands.R.visible = true; }
    if (S) { setTint(false); S.hud.dispose(); S.intro.dispose(); S.board = null; }
    L.moveScale = 1;
    N.onLevelMsg(null);
    S = null;
}
