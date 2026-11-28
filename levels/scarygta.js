// ==========================================
// POZIOM: SCARY GTA (nocne, neonowe miasto w stylu Florydy, 160 x 150 m, ok. 24 000 m^2 = 2x Maze). Układ w czystym core/citylayout.js (testy: tests/logic.mjs, tests/city.mjs).
// Etap 1: miasto z chunków (kwartał = jedna scalona siatka, wyłączana poza CITY.VIS_R), neony, latarnie, samochody i palmy (instancje), marina z jachtem, plaża z pirsem,
// sześć toreb łupu (jubiler, bank, kasyno na dachu, stacja benzynowa, wieża radiowa na szczycie, jacht) i wyjście łodzią z pirsu (drzwi EXIT, wymaga co najmniej jednej torby).
// Ruch jak w lobby (L.moveScale = PACE), także z torbą. Kolejne etapy: policja i gwiazdki, online i strzelanie graczy, helikopter, nowy potwór.
// ==========================================
import { THREE, CANNON, L, scene, camera, renderer, addStaticBody } from '../core/engine.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { levelReward, diffOf, unlockAchievement, recordTime, addBones, dailyDate } from '../core/economy.js';
import { getGta, setGta } from '../core/gtastore.js';
import { toast, Terminal, terminals, AMBER, AMBER_DIM, GOLD, OK_COL, BAD_COL } from '../core/terminal.js';
import * as GM from '../core/gtamodes.js';
import { createVehicles } from '../core/vehicles.js';
import * as VL from '../core/vehiclelogic.js';
import * as SFX from '../core/audio.js';
import { PACE } from '../core/config.js';
import { ARRIVAL_FROM_SCARYGTA } from './levels.js';
import { buildDoor, cameraPanel, panelBg, createJumpscare } from '../core/levelkit.js';
import { setDread, DREAD } from '../core/ambience.js';
import { setPlayerPosition, releaseAll, hands, gripDown, triggerDown, stickX } from '../core/player.js';
import { driveKeys } from '../core/desktop.js';
import * as DRV from '../core/drivelogic.js';
import { buzz } from '../core/haptics.js';
import { MOD, PERSONAL } from '../core/modstate.js';
import { SAVE } from '../core/economy.js';
import { safeName } from '../core/netguard.js';
import * as GU from '../core/gunlogic.js';
import * as HL from '../core/helilogic.js';
import { createHeli } from '../core/heli.js';
import { createWeather } from '../core/weather.js';
import { createGtaProps } from '../core/gtaprops.js';
import { createGtaEggs } from '../core/gtaeggfx.js';
import { createGtaStunts } from '../core/gtastuntfx.js';
import { createGtaMystery } from '../core/gtamysteryfx.js';
import { createGtaEncounters } from '../core/gtaencountersfx.js';
import { createGtaLife } from '../core/gtacrowdfx.js';
import * as DJM from '../core/gtadj.js';
import { createGtaBillboards } from '../core/gtabillboardfx.js';
import * as X from '../core/gtaextras.js';
import { mutatorActive, mutFactor } from '../core/mutators.js';
import * as WX from '../core/cityweatherlogic.js';
import * as RD from '../core/radiologic.js';
import { textToEvents, sanitizeName } from '../core/voicelogic.js';
import { createCitySim, updateRails, ridingAny, cancelRails } from '../core/citysim.js';
import * as WL from '../core/wantedlogic.js';
import * as AI2 from '../core/cityai.js';
import * as C from '../core/citylayout.js';
import * as IL from '../core/interiorlogic.js';
import * as N from '../core/network.js';
import * as GN from '../core/gtanet.js';
import * as BL from '../core/gtaroadblock.js';
import { createGtaRoadblocks } from '../core/gtaroadblockfx.js';
import { createGtaCopMarks } from '../core/gtacopmarkfx.js';
import { createGtaCorpses } from '../core/gtacorpsefx.js';
import { SETTINGS } from '../core/settings.js';
import * as DL from '../core/damagelogic.js';
import * as CTm from '../core/gtacontracts.js';

export const info = { id: 'scarygta', name: 'Scary GTA', spawn: [0, 1, 56] };   // = CITY.SPAWN (test w tests/logic.mjs pilnuje zgodności)
const TILE = 8, NEON = [0xff2a9a, 0x20e0ff, 0xff8a20, 0xa050ff, 0x40ff80, 0xff3050];
const ROLE_TINT = { downtown: [0.5, 0.58, 0.72], casino: [0.62, 0.42, 0.74], old: [0.74, 0.58, 0.46], motel: [0.78, 0.5, 0.56], industrial: [0.5, 0.52, 0.5], warehouse: [0.46, 0.5, 0.56], plaza: [0.6, 0.6, 0.55], marina: [0.5, 0.45, 0.38] };
let S = null;
const _p = new THREE.Vector3(), _d = new THREE.Vector3();

function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function paint(g, r, gr, b) { const n = g.attributes.position.count, a = new Float32Array(n * 3); for (let i = 0; i < n; i++) { a[i * 3] = r; a[i * 3 + 1] = gr; a[i * 3 + 2] = b; } g.setAttribute('color', new THREE.BufferAttribute(a, 3)); return g; }
// Prostopadłościan z UV w metrach (okna kafelkują się co TILE m), dachy i spody na jednolitym polu tekstury (róg 0,01 / 0,99)
// Mebel wnętrza: wszystkie ściany na jednolitym rogu tekstury (bez okien), kolor z wierzchołków; trafia do scalonej siatki kwartału (bez dodatkowych wywołań rysowania)
function solidGeo(q, c) {
    const g = new THREE.BoxGeometry(q.x1 - q.x0, q.y1 - q.y0, q.z1 - q.z0); g.translate((q.x0 + q.x1) / 2, (q.y0 + q.y1) / 2, (q.z0 + q.z1) / 2);
    const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, 0.01, 0.99);
    return paint(g, c[0] * 1.8, c[1] * 1.8, c[2] * 1.8);
}
function boxGeo(b, col) {
    const w = b.x1 - b.x0, h = b.y1 - b.y0, d = b.z1 - b.z0, g = new THREE.BoxGeometry(w, h, d);
    g.translate((b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2, (b.z0 + b.z1) / 2);
    const uv = g.attributes.uv;
    for (let f = 0; f < 6; f++) for (let v = 0; v < 4; v++) {
        const i = f * 4 + v, u0 = uv.getX(i), v0 = uv.getY(i);
        if (f < 2) uv.setXY(i, (u0 * d + b.z0) / TILE, (v0 * h + b.y0) / TILE);
        else if (f < 4) uv.setXY(i, 0.01, 0.99);
        else uv.setXY(i, (u0 * w + b.x0) / TILE, (v0 * h + b.y0) / TILE);
    }
    return paint(g, col[0], col[1], col[2]);
}
// Tekstury okien: 512 px = 8 x 8 m, 4 x 4 okna; część świeci (mapa emisji). Róg (0..10 px) zostaje jednolity dla dachów
function windowTextures() {
    const R = rng(77), c = document.createElement('canvas'), e = document.createElement('canvas'); c.width = c.height = e.width = e.height = 512;
    const x = c.getContext('2d'), y = e.getContext('2d'), LIT = ['#ffd27a', '#7fe8ff', '#ff7ac8', '#fff0c0'];
    x.fillStyle = '#7a7f88'; x.fillRect(0, 0, 512, 512); y.fillStyle = '#000'; y.fillRect(0, 0, 512, 512);
    for (let r = 0; r < 4; r++) for (let q = 0; q < 4; q++) {
        const wx = q * 128 + 22, wy = r * 128 + 28, lit = R() < 0.38;
        x.fillStyle = '#58606a'; x.fillRect(wx - 6, wy - 6, 96, 86);
        x.fillStyle = lit ? LIT[(R() * LIT.length) | 0] : '#10151c'; x.fillRect(wx, wy, 84, 74);
        if (lit) { y.fillStyle = x.fillStyle; y.fillRect(wx, wy, 84, 74); }
        x.fillStyle = 'rgba(0,0,0,0.25)'; x.fillRect(wx, wy + 36, 84, 4);
    }
    for (let i = 0; i < 400; i++) { x.fillStyle = 'rgba(0,0,0,' + (R() * 0.08).toFixed(3) + ')'; x.fillRect(R() * 512, R() * 512, 3, 3); }
    x.fillStyle = '#7a7f88'; x.fillRect(0, 0, 12, 12); y.fillStyle = '#000'; y.fillRect(0, 0, 12, 12);
    const mk = (cv) => { const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4; return t; };
    return [mk(c), mk(e)];
}
const add = (arr, g) => { arr.push(g); return g; };

export function build() {
    const CI = C.CITY, R = rng(4242);
    L.spawn = CI.SPAWN.slice();
    L.bounds = { minX: CI.X0 + 0.6, maxX: CI.X1 - 0.6, minZ: CI.Z0 + 0.6, maxZ: CI.Z1 - 0.6, maxY: CI.MAX_H + 6 };
    L.ballBounds = { minX: CI.X0 + 0.3, maxX: CI.X1 - 0.3, minZ: CI.Z0 + 0.3, maxZ: CI.Z1 - 0.3, maxY: CI.MAX_H + 6 };   // piłki i torby nie są teleportowane do pokoju 30 x 30 (core/engine.js: containBall)
    scene.fog.density = 0.024;
    S = { neonMeshes: [], nlights: [], lampMesh: null, geos: [], mats: [], texs: [], chunks: [], bags: [], got: 0, clock: 0, visT: 0, hudT: 0, leaving: false, buildings: C.cityWithInteriors(1337) };
    const geo = (g) => { S.geos.push(g); return g; }, mat = (m) => { S.mats.push(m); return m; };
    const [wt, et] = windowTextures(); S.texs.push(wt, et);
    const facade = mat(new THREE.MeshStandardMaterial({ map: wt, emissiveMap: et, emissive: 0xffffff, emissiveIntensity: 1.1, vertexColors: true, roughness: 0.78, metalness: 0.08 }));
    const neonMat = mat(new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false }));
    // ----- podłoże: asfalt, plaża, morze, kolizja podłogi i barierka od morza -----
    const ground = new THREE.Mesh(geo(new THREE.PlaneGeometry(CI.X1 - CI.X0, CI.SEA_Z - CI.Z0)), mat(new THREE.MeshStandardMaterial({ color: 0x1a1c22, roughness: 0.55, metalness: 0.2 })));
    ground.rotation.x = -Math.PI / 2; ground.position.set(0, 0, (CI.Z0 + CI.SEA_Z) / 2); ground.receiveShadow = false; L.root.add(ground);
    const sand = new THREE.Mesh(geo(new THREE.PlaneGeometry(CI.X1 - CI.X0, CI.SEA_Z - CI.BEACH_Z)), mat(new THREE.MeshStandardMaterial({ color: 0x6a5a40, roughness: 1 })));
    sand.rotation.x = -Math.PI / 2; sand.position.set(0, 0.02, (CI.BEACH_Z + CI.SEA_Z) / 2); L.root.add(sand);
    const sea = new THREE.Mesh(geo(new THREE.PlaneGeometry(CI.X1 - CI.X0 + 60, CI.Z1 - CI.SEA_Z + 40)), mat(new THREE.MeshStandardMaterial({ color: 0x06121e, roughness: 0.12, metalness: 0.5 })));
    sea.rotation.x = -Math.PI / 2; sea.position.set(0, -0.5, (CI.SEA_Z + CI.Z1 + 40) / 2); L.root.add(sea);
    addStaticBody(0, -0.5, (CI.Z0 + CI.Z1) / 2, new CANNON.Box(new CANNON.Vec3((CI.X1 - CI.X0) / 2 + 2, 0.5, (CI.Z1 - CI.Z0) / 2 + 2)), ground, false);
    for (const sx of [-1, 1]) { const w = (CI.X1 - CI.PIER.w / 2 - 0.5) / 2 + 0.2, cx = sx * (CI.PIER.w / 2 + w); addStaticBody(cx, 1.5, CI.SEA_Z + 0.5, new CANNON.Box(new CANNON.Vec3(w, 1.5, 0.3)), ground, false); }   // barierka od morza po obu stronach pirsu
    // ----- chunki: kwartały z budynkami, rusztowaniami, neonami i podstawą chodnika -----
    for (const ch of C.cityChunks()) {
        const geos = [], neon = [], blk = C.blockRect(ch.i, ch.j), rt = ROLE_TINT[ch.role];
        add(geos, boxGeo({ x0: blk.x0, x1: blk.x1, y0: 0, y1: 0.16, z0: blk.z0, z1: blk.z1 }, [rt[0] * 0.8, rt[1] * 0.8, rt[2] * 0.8]));   // chodnik (bez kolizji, tylko wygląd)
        for (const b of S.buildings.filter(q => q.i === ch.i && q.j === ch.j)) {
            const tn = 0.78 + b.tint * 0.35, col = [rt[0] * tn, rt[1] * tn, rt[2] * tn];
            const boxes = b.hollow ? C.hollowBoxes(b) : [{ x0: b.x0, x1: b.x1, y0: 0, y1: b.h, z0: b.z0, z1: b.z1 }];
            for (const q of boxes) {
                add(geos, boxGeo(q, col));
                addStaticBody((q.x0 + q.x1) / 2, (q.y0 + q.y1) / 2, (q.z0 + q.z1) / 2, new CANNON.Box(new CANNON.Vec3((q.x1 - q.x0) / 2, (q.y1 - q.y0) / 2, (q.z1 - q.z0) / 2)), ground, false);
                L.obstacles[L.obstacles.length - 1].grip = CI.GRIP;   // ściany budynków są śliskie: na dach wchodzi się rusztowaniem
            }
            if (b.scaffold) { const s = C.scaffoldBox(b); add(geos, boxGeo(s, [0.28, 0.3, 0.34])); addStaticBody((s.x0 + s.x1) / 2, (s.y0 + s.y1) / 2, (s.z0 + s.z1) / 2, new CANNON.Box(new CANNON.Vec3((s.x1 - s.x0) / 2, (s.y1 - s.y0) / 2, (s.z1 - s.z0) / 2)), ground, false); }
            if (b.interior) for (const m of IL.furniture(b)) { add(geos, solidGeo(m, m.c)); if (m.solid) addStaticBody((m.x0 + m.x1) / 2, (m.y0 + m.y1) / 2, (m.z0 + m.z1) / 2, new CANNON.Box(new CANNON.Vec3((m.x1 - m.x0) / 2, (m.y1 - m.y0) / 2, (m.z1 - m.z0) / 2)), ground, false); }   // meble wnętrza: w siatce kwartału, duże z kolizją
            if (b.hollow) { const lc = b.interior ? IL.LIGHT[b.interior] : null, l = new THREE.PointLight(lc ? lc[0] : 0xffc880, lc ? lc[1] : 11, lc ? lc[2] : 16, 2); l.position.set((b.x0 + b.x1) / 2, Math.min(b.hollow.baseH, 6) - 1.4, (b.z0 + b.z1) / 2); L.root.add(l); }
            // neon na ścianie od strony ulicy (południe albo północ), 5 m nad chodnikiem
            if (b.h >= 8 && !b.tower) { const nc = NEON[(R() * NEON.length) | 0], sz = R() < 0.5, zc = sz ? b.z1 + 0.12 : b.z0 - 0.12, sw = 3 + R() * 3, xc = (b.x0 + b.x1) / 2 + (R() - 0.5) * 2; add(neon, paint(new THREE.BoxGeometry(sw, 0.9, 0.2).translate(xc, 4.6 + R() * 2, zc), ((nc >> 16) & 255) / 255 * 1.6, ((nc >> 8) & 255) / 255 * 1.6, (nc & 255) / 255 * 1.6)); }
        }
        const grp = new THREE.Group(); L.root.add(grp);
        const fm = new THREE.Mesh(mergeGeometries(geos), facade); geo(fm.geometry); fm.castShadow = false; fm.receiveShadow = false; grp.add(fm);
        if (neon.length) { const nm = new THREE.Mesh(mergeGeometries(neon), neonMat); geo(nm.geometry); grp.add(nm); S.neonMeshes.push({ m: nm, chunk: ch.id }); }
        const nl = new THREE.PointLight(NEON[(ch.i + ch.j * 3) % NEON.length], 16, 34, 2); nl.position.set(ch.center[0], 7, ch.center[1]); L.root.add(nl); S.nlights.push({ l: nl, base: 16, chunk: ch.id });
        S.chunks.push({ id: ch.id, c: ch.center, g: grp });
    }
    buildStreets(geo, mat, R); buildPier(geo, mat); buildMarina(geo, mat);
    buildProps(geo, mat, R);
    buildBags(geo, mat);
    const df = diffOf('scarygta');
    // bryły zasłaniające (strzały, wzrok policji i helikoptera): puste budynki to ich prawdziwe ściany z otworem drzwi, nie pełne pudło (inaczej nic nie przeleci przez drzwi ani z wnętrza)
    S.boxes = S.buildings.flatMap(b => b.hollow ? C.hollowBoxes(b) : [{ x0: b.x0, x1: b.x1, y0: 0, y1: b.h, z0: b.z0, z1: b.z1 }]);
    S.sim = createCitySim({ boxes: S.boxes, diff: df.id }); S.scare = createJumpscare({ seed: 4040, variant: 'warden' });
    S.busted = -1; S.micCd = 0; S.busts = 0; S.runHeatT = 0;
    // dodatki (core/gtaprops.js): kabiny, przebranie, wspinaczki, paczki, manekiny, sejf, prąd, dźwig, telefon; noc (blackout i horda)
    S.gm = GM.newModeState(); S.gmPhase = 'idle'; buildModePanel();
    S.fleet = VL.newFleet(); S.vehs = createVehicles({ clock: () => S.clock, myKey: 'me', requestStart: requestDrive, onBoard: (car, route) => toast(VL.routeOf(car, route).name + '. Stand still and hold on (both grips to jump off).', '#7ad0ff'), onArrive: () => { toast('You arrived.', '#7ad0ff'); const f = S.fleet && S.fleet.find(q => q.occ === 'me'); if (S.ctr && !(f && f.stop)) S.ctr.arrived = true; }, dismount: dismountMe, drive: { requestFree: requestFree, world: driveWorld, input: driveInput, wantExit: () => !!S.dbgExit || (!renderer.xr.isPresenting && driveKeys().exit), onStart: (car) => toast('Driving the ' + VL.VEHICLES.find(v => v.id === car).name + '. Right trigger gas, left trigger brake and reverse, left stick steer, both grips get out.', '#7ad0ff'), auth: () => isAuth(), onPose: sendPose, onStop: () => { toast('You got out.', '#7ad0ff'); if (!isAuth()) { S.fdIgnoreUntil = S.clock + 1.5; send({ k: 'ev', kind: 'dismount' }); } }, onBump: (imp) => buzz('both', Math.min(0.8, 0.25 + imp * 0.12), 120), onRunOver: runOverPeds } });
    S.sim.hearMul = mutatorActive() ? mutFactor('hear') : 1; S.night = X.newNight(); S.nightPh = 'calm'; S.powerOn = false; S.sprayAt = {}; S.alarmAt = {}; S.disUntil = {}; S.powerLeft = 0; S.powerCd = 0; S.disSent = false; S.powerSent = false;
    S.gx = createGtaProps({ buildings: S.buildings, api: {
        stars: () => S.sim.starsOf('me'), seenT: () => S.sim.heatOf('me').seenT,
        clearHeat: () => { if (isAuth()) S.sim.heats.me = { v: 0, seenT: 99 }; else send({ k: 'ev', kind: 'spray' }); },
        addHeat: (v) => { if (isAuth()) S.sim.addHeat('me', v); else send({ k: 'ev', kind: 'alarm' }); },
        setSight: (m) => { if (isAuth()) S.sim.sightMul.me = m; else { if (m < 1 && !S.disSent) send({ k: 'ev', kind: 'dis' }); S.disSent = m < 1; } },
        setPower: (on) => { if (on !== S.powerOn) { S.powerOn = on; applyLights(); if (isAuth()) powerZone(on ? 45 : 0); else if (on) send({ k: 'ev', kind: 'power' }); } },
        vehicles: () => S.vehs ? S.vehs.cars.map(c => ({ x: c.m.position.x, z: c.m.position.z })) : [], bags: () => S.bags, cops: () => S.sim.activeCops().map(c => ({ x: c.bot.x, z: c.bot.z })), heli: () => S.heli.mode !== 'away' ? { x: S.heli.x, z: S.heli.z } : null,
        eggs: () => secretsInfo()
    } });
    S.eggs = createGtaEggs({ buildings: S.buildings, api: { stars: () => S.sim.starsOf('me'), night: () => S.nightPh, ride: eggRide } });
    const secApi = { night: () => S.nightPh, storm: () => !!S.wx && S.wx.state === 'storm' };
    S.stunts = createGtaStunts({ buildings: S.buildings }); S.mystery = createGtaMystery({ buildings: S.buildings, api: secApi }); S.enc = createGtaEncounters({ api: secApi });
    S.life = createGtaLife({ api: { night: () => S.nightPh, obstacles: lifeObstacles } }); S.dj = DJM.newDj(); S.esc = 1; S.blocks = BL.newBlocks(); S.rbfx = createGtaRoadblocks(); S.ctr = { run: CTm.newRun(), spr: getGta().sprayed, arrived: false, seen: false }; S.cmark = createGtaCopMarks({ api: { gm: () => S.gm } }); S.corp = createGtaCorpses({ api: { gore: () => SETTINGS.gore !== false, dead: N.setAvatarDead } }); S.hitMark = { t: 0, text: '' };
    S.bb = createGtaBillboards({ buildings: S.buildings, api: { night: () => S.nightPh } });
    S.fdLast = {}; S.fdBad = {}; S.fdSeen = 0; S.fdIgnoreUntil = 0; S.peakStars = 0; S.track = {}; S.bustUntil = {}; S.rideUntil = {}; S.shoutAt = {}; S.netT = 0; S.lastHostMsg = 0; S.snap = null; S.sent = []; S.takeCd = {}; S.rideT = 0; S.gotPrev = 0;
    N.onLevelMsg(onNet);
    S.wx = WX.newWeather(Math.random, Math.random() < 0.5 ? 'clear' : 'drizzle'); S.weather = createWeather();   // pogoda lokalna: każdy klient ma własną
    S.radio = RD.newRadio(); S.radioText = null; S.radioEnd = 0; S.flags = { swat: false, shot: false, busted: false, block: false };
    S.heli = HL.newHeli(); S.heliV = createHeli(); S.eyeOnMe = false;
    S.gunS = { me: GU.newShooter() }; S.mode = GU.modeFor(df.id); S.fx = []; S.feed = []; S.hurtT = 0; S.killer = null; S.gunMesh = null;
    buildFx(); L.onTrigger = (i) => fire(i);
    setDread(() => S.sim.copPositions());   // reżyser grozy: kroki, oddech i napięcie od policjantów
    // drzwi: wyjście na pirsie (wymaga torby) i powrót do Levels na plaży
    buildDoor({ x: 0, z: CI.EXIT[2] - 2, rotY: Math.PI, label: 'EXIT', color: '#ff9a60', glow: 0xff7030, wood: 0x2a1e18, light: true, collider: true,
        portal: { target: 'levels', spawn: ARRIVAL_FROM_SCARYGTA, cond: () => S && S.got > 0, deny: 'Take at least one bag before you leave.', onEnter: finish } });
    buildDoor({ x: -7, z: CI.BEACH_Z + 1, rotY: 0, label: 'LEVELS', color: '#bfe8ff', wood: 0x3a3228, collider: true, portal: { target: 'levels', spawn: ARRIVAL_FROM_SCARYGTA, onEnter: () => toast('Back to the levels') } });
    S.hud = cameraPanel(1024, 300, 0.42, 0.123, 0.2, -0.75, 990);
    toast('Steal the bags. Reach the pier. Walls are slippery: climb the scaffolds.', '#ff7ac8');
}

// ----- ulice: oznaczenia pasów (jedna siatka), latarnie (jedna siatka) -----
function buildStreets(geo, mat, R) {
    const CI = C.CITY, lines = [], lamps = [], lineMat = mat(new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false })), lampMat = mat(new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false }));
    const vx = [0, 1, 2].map(i => C.blockRect(i, 0).x1 + CI.STREET / 2), hz = [0, 1].map(j => C.blockRect(0, j).z1 + CI.STREET / 2), bz = (CI.BLV[0] + CI.BLV[1]) / 2;
    const dash = (x, z, w, d) => add(lines, paint(new THREE.BoxGeometry(w, 0.02, d).translate(x, 0.04, z), 1.4, 1.2, 0.5));
    for (const x of vx) for (let z = CI.Z0 + 4; z < CI.BLV[0]; z += 6) dash(x, z, 0.2, 3);
    for (const z of hz.concat([bz])) for (let x = CI.X0 + 4; x < CI.X1 - 2; x += 6) dash(x, z, 3, 0.2);
    for (let x = CI.X0 + 3; x < CI.X1; x += 6) { add(lines, paint(new THREE.BoxGeometry(2.4, 0.02, 4).translate(x, 0.04, CI.BLV[0] + 3), 0.9, 0.9, 0.9)); }   // zebra przy bulwarze
    const post = (x, z) => { add(lamps, paint(new THREE.CylinderGeometry(0.09, 0.11, 6.2, 6).translate(x, 3.1, z), 0.08, 0.08, 0.1)); add(lamps, paint(new THREE.BoxGeometry(0.7, 0.18, 0.4).translate(x, 6.25, z), 2, 1.6, 1)); };
    for (const x of vx) for (let z = CI.Z0 + 8; z < CI.BLV[0] - 4; z += 19) { post(x - 6.5, z); post(x + 6.5, z + 9); }
    for (const z of hz.concat([bz])) for (let x = CI.X0 + 10; x < CI.X1 - 6; x += 19) { post(x, z - 6.5); post(x + 9, z + 6.5); }
    const lm = new THREE.Mesh(geo(mergeGeometries(lines)), lineMat); L.root.add(lm);
    const pm = new THREE.Mesh(geo(mergeGeometries(lamps)), lampMat); L.root.add(pm); S.lampMesh = pm;
}
// ----- pirs: deski, słupki, łódź na końcu -----
function buildPier(geo, mat) {
    const P = C.CITY.PIER, parts = [];
    add(parts, paint(new THREE.BoxGeometry(P.w, 0.12, P.z1 - P.z0).translate(P.x, 0.02, (P.z0 + P.z1) / 2), 0.35, 0.24, 0.14));
    for (let z = P.z0 + 1; z <= P.z1; z += 3) for (const sx of [-1, 1]) add(parts, paint(new THREE.CylinderGeometry(0.14, 0.14, 2.4, 6).translate(sx * (P.w / 2 - 0.2), -0.9, z), 0.2, 0.14, 0.1));
    for (const sx of [-1, 1]) add(parts, paint(new THREE.BoxGeometry(0.1, 0.9, P.z1 - P.z0).translate(sx * P.w / 2, 0.55, (P.z0 + P.z1) / 2), 0.4, 0.3, 0.2));   // balustrada
    add(parts, paint(new THREE.BoxGeometry(7, 1.2, 9).translate(0, -0.2, P.z1 + 3), 0.8, 0.78, 0.7));   // kadłub łodzi za końcem pirsu
    add(parts, paint(new THREE.BoxGeometry(3.4, 2.2, 3.4).translate(0, 1.5, P.z1 + 2.2), 0.7, 0.68, 0.62));
    const m = new THREE.Mesh(geo(mergeGeometries(parts)), mat(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8 }))); L.root.add(m);
    const l = new THREE.PointLight(0xff9a60, 14, 20, 2); l.position.set(0, 3.5, P.z1 - 4); L.root.add(l);
}
// ----- marina: pomosty, woda (płytka, do brodzenia: tu będą aligatory), jacht z torbą -----
function buildMarina(geo, mat) {
    const b = C.blockRect(0, 2), Y = C.YACHT, parts = [];
    const water = new THREE.Mesh(geo(new THREE.PlaneGeometry(b.x1 - b.x0 - 4, b.z1 - b.z0 - 4)), mat(new THREE.MeshStandardMaterial({ color: 0x0c2a22, roughness: 0.1, metalness: 0.4, transparent: true, opacity: 0.92 })));
    water.rotation.x = -Math.PI / 2; water.position.set((b.x0 + b.x1) / 2, 0.05, (b.z0 + b.z1) / 2); L.root.add(water);
    for (let z = b.z0 + 2; z < b.z1; z += 6) add(parts, paint(new THREE.BoxGeometry(b.x1 - b.x0, 0.22, 1.4).translate((b.x0 + b.x1) / 2, 0.1, z), 0.32, 0.22, 0.13));   // pomosty
    add(parts, paint(new THREE.BoxGeometry(Y.w, 1.4, Y.d).translate(Y.x, 0.4, Y.z), 0.9, 0.9, 0.92));                                              // kadłub
    add(parts, paint(new THREE.BoxGeometry(Y.w - 0.8, 1.6, Y.d * 0.45).translate(Y.x, Y.h - 0.3, Y.z + 1.8), 0.78, 0.8, 0.85));                        // kabina
    add(parts, paint(new THREE.BoxGeometry(Y.w, 0.2, Y.d * 0.5).translate(Y.x, Y.h - 1.4 + 1.2, Y.z - 3), 0.5, 0.35, 0.2));                           // pokład dziobowy
    const m = new THREE.Mesh(geo(mergeGeometries(parts)), mat(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5, metalness: 0.2 }))); L.root.add(m);
    addStaticBody(Y.x, 1.1, Y.z, new CANNON.Box(new CANNON.Vec3(Y.w / 2, 1.1, Y.d / 2)), m, false);   // jacht jako bryła: wchodzi się na pokład po dachu kabiny z pomostu
    for (const z of [b.z0 + 2, b.z0 + 8, b.z0 + 14, b.z0 + 20]) addStaticBody((b.x0 + b.x1) / 2, 0.1, z, new CANNON.Box(new CANNON.Vec3((b.x1 - b.x0) / 2, 0.11, 0.7)), m, false);
    const l = new THREE.PointLight(0x40ffb0, 12, 26, 2); l.position.set(Y.x, 6, Y.z); L.root.add(l);
}
// ----- rekwizyty: samochody (instancje + kolizje), palmy (instancje) -----
function buildProps(geo, mat, R) {
    const CI = C.CITY, cars = [], palms = [], vSpots = VL.VEHICLES.map(v => VL.startPoint(v.id));   // zaparkowane auta nie stoją przy stanowiskach pojazdów ucieczki (ten sam ciąg losowy: 3 losowania)
    const body = paint(new THREE.BoxGeometry(2, 0.7, 4.3).translate(0, 0.55, 0), 1, 1, 1), cab = paint(new THREE.BoxGeometry(1.7, 0.6, 2.2).translate(0, 1.15, -0.2), 0.45, 0.5, 0.55);
    const carG = geo(mergeGeometries([body, cab])), carI = new THREE.InstancedMesh(carG, mat(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.35, metalness: 0.6 })), 60);
    let n = 0; const col = new THREE.Color(), dummy = new THREE.Object3D(), put = (x, z, alongZ) => { if (n >= 60) return; if (vSpots.some(s => Math.hypot(s.x - x, s.z - z) < 6)) { R(); R(); R(); return; } dummy.position.set(x, 0, z); dummy.rotation.set(0, alongZ ? 0 : Math.PI / 2, (R() - 0.5) * 0.04); dummy.updateMatrix(); carI.setMatrixAt(n, dummy.matrix); col.setHSL(R(), 0.55, 0.28 + R() * 0.2); carI.setColorAt(n, col); n++; addStaticBody(x, 0.7, z, new CANNON.Box(new CANNON.Vec3(alongZ ? 1.0 : 2.15, 0.7, alongZ ? 2.15 : 1.0)), carI, false); };
    const vx = [0, 1, 2].map(i => C.blockRect(i, 0).x1 + CI.STREET / 2), hz = [0, 1].map(j => C.blockRect(0, j).z1 + CI.STREET / 2);
    for (const x of vx) for (let z = CI.Z0 + 10; z < CI.BLV[0] - 6; z += 23) if (R() < 0.55) put(x + (R() < 0.5 ? -4.2 : 4.2), z + R() * 6, true);
    for (const z of hz) for (let x = CI.X0 + 12; x < CI.X1 - 10; x += 27) if (R() < 0.45) put(x + R() * 6, z + (R() < 0.5 ? -4.2 : 4.2), false);
    for (let x = CI.X0 + 14; x < CI.X1 - 10; x += 21) if (R() < 0.6) put(x, CI.BLV[0] + 3 + (R() < 0.5 ? 0 : 12), false);
    carI.count = n; carI.instanceMatrix.needsUpdate = true; if (carI.instanceColor) carI.instanceColor.needsUpdate = true; L.root.add(carI);
    S.carCount = n;
    const trunk = paint(new THREE.CylinderGeometry(0.12, 0.2, 5, 6).translate(0, 2.5, 0), 0.32, 0.22, 0.12), fr = [trunk];
    for (let k = 0; k < 6; k++) { const f = paint(new THREE.BoxGeometry(2.6, 0.05, 0.55).translate(1.3, 0, 0), 0.08, 0.35, 0.12); f.rotateZ(-0.35); f.rotateY(k * Math.PI / 3); f.translate(0, 5, 0); fr.push(f); }
    const palmG = geo(mergeGeometries(fr)), palmI = new THREE.InstancedMesh(palmG, mat(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, side: THREE.DoubleSide })), 120);
    let m = 0; const putP = (x, z) => { if (m >= 120) return; dummy.position.set(x, 0, z); dummy.rotation.set(0, R() * 6.28, 0); const s = 0.8 + R() * 0.5; dummy.scale.set(s, s, s); dummy.updateMatrix(); palmI.setMatrixAt(m++, dummy.matrix); dummy.scale.set(1, 1, 1); };
    for (let x = CI.X0 + 6; x < CI.X1 - 4; x += 9) { putP(x, CI.BLV[0] + 1.2); putP(x + 4, CI.BLV[1] - 1.2); }
    for (let x = CI.X0 + 8; x < CI.X1 - 4; x += 12) putP(x + R() * 3, CI.BEACH_Z + 2 + R() * 4);
    const pz = C.blockRect(1, 2); for (const [x, z] of [[pz.x0 + 3, pz.z0 + 3], [pz.x1 - 3, pz.z0 + 3], [pz.x0 + 3, pz.z1 - 3], [pz.x1 - 3, pz.z1 - 3]]) putP(x, z);
    palmI.count = m; palmI.instanceMatrix.needsUpdate = true; L.root.add(palmI);
}
// ----- torby łupu: worek, pierścień i słup światła widoczny z daleka -----
function buildBags(geo, mat) {
    const spots = C.bagSpots(S.buildings), sack = geo(new THREE.SphereGeometry(0.3, 14, 10)), knot = geo(new THREE.ConeGeometry(0.1, 0.22, 8)), ring = geo(new THREE.TorusGeometry(0.42, 0.025, 6, 20)), beam = geo(new THREE.CylinderGeometry(0.12, 0.12, 36, 8, 1, true));
    const sm = mat(new THREE.MeshStandardMaterial({ color: 0x8a6a2a, roughness: 0.8 })), gm = mat(new THREE.MeshBasicMaterial({ color: 0xffd060, toneMapped: false })), bm = mat(new THREE.MeshBasicMaterial({ color: 0xffc040, transparent: true, opacity: 0.28, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }));
    for (const s of spots) {
        const g = new THREE.Group(); g.position.set(s.x, s.y, s.z); L.root.add(g);
        const a = new THREE.Mesh(sack, sm); a.scale.set(1, 0.9, 1); g.add(a); const k = new THREE.Mesh(knot, sm); k.position.y = 0.34; g.add(k);
        const r = new THREE.Mesh(ring, gm); r.rotation.x = Math.PI / 2; r.position.y = -0.1; g.add(r);
        const b = new THREE.Mesh(beam, bm); b.position.y = 18; g.add(b);
        const l = new THREE.PointLight(0xffc040, 9, 12, 2); l.position.y = 0.6; g.add(l);
        S.bags.push({ id: s.id, x: s.x, y: s.y, z: s.z, ox: s.x, oy: s.y, oz: s.z, g: g, got: false, holder: null });
    }
}

// ----- przebieg -----
function finish() {
    if (S.leaving) return; S.leaving = true;
    // napad dnia: wyjście z torbą celu dnia (jedna z sześciu, z daty) daje 150 Bagabucksów raz na dobę i zapisuje najlepszy czas
    if (!mutatorActive()) { const hr = X.heistResult(getGta(), dailyDate(), S.bags.filter(b => b.holder === 'me').map(b => b.id), S.clock); if (hr.won) { setGta(hr.gta); if (hr.reward) addBones(hr.reward, 'Daily heist'); toast('Daily target secured' + (hr.underPar ? ' under par!' : '.') + (hr.record ? ' New best time.' : ''), '#ffd27a'); } }
    const n = S.got;
    if (isAuth()) modeDeliver('me', n); else send({ k: 'ev', kind: 'deliver' });   // tryby: dostawa liczy się PO napadzie dnia (zabiera torby z gracza)
    toast('Heist complete: ' + n + ' bag' + (n === 1 ? '' : 's') + '!', '#7fff90');
    levelReward('scarygta', 120 * n, 60 * n, 'a heist with ' + n + ' bags');
    if (n >= S.bags.length) { unlockAchievement('gta_heist'); recordTime('scarygta', S.clock); }   // komplet toreb: osiągnięcie i rekord czasu
    if (S.peakStars >= 5) unlockAchievement('gta_ghost');
}
const ARROWS = ['↑', '↗', '→', '↘', '↓', '↙', '←', '↖'];
function arrowTo(px, pz, tx, tz) {
    camera.getWorldDirection(_d); const head = Math.atan2(_d.x, _d.z), brg = Math.atan2(tx - px, tz - pz);
    let rel = brg - head; rel = Math.atan2(Math.sin(rel), Math.cos(rel)); return ARROWS[((Math.round(rel / (Math.PI / 4)) % 8) + 8) % 8];   // kierunek w lewo to dodatni kąt w tym układzie, więc strzałki są lustrzane do bearingu
}
function drawHud(p) {
    const x = S.hud.ctx; panelBg(S.hud, S.hurtT > 0 ? 'rgba(90,10,14,0.82)' : 'rgba(12,8,20,0.74)', S.hurtT > 0 ? '#ff2a2a' : '#ff2a9a');
    x.textBaseline = 'middle'; x.textAlign = 'left';
    const stars = S.sim.starsOf('me'), heat = S.sim.heatOf('me');
    x.font = 'bold 60px "Courier New", monospace'; x.fillStyle = S.got === S.bags.length ? '#7fff90' : '#ff7ac8'; x.fillText('BAGS ' + S.got + '/' + S.bags.length, 30, 56);
    x.font = 'bold 56px "Courier New", monospace'; x.fillStyle = stars > 0 ? '#ff3a3a' : '#5a4a6a'; x.fillText('\u2605'.repeat(stars) + '\u2606'.repeat(5 - stars), 520, 56);
    x.fillStyle = '#2a2030'; x.fillRect(520, 90, 460, 14); x.fillStyle = stars >= 4 ? '#ff2a2a' : '#ff9a3a'; x.fillRect(520, 90, 460 * WL.heatBar(heat), 14);
    let best = null, bd = 1e9; for (const b of S.bags) if (!b.got) { const d = Math.hypot(b.x - p.x, b.z - p.z); if (d < bd) { bd = d; best = b; } }
    x.font = 'bold 28px "Courier New", monospace'; x.fillStyle = '#ffd27a';
    if (best) x.fillText('NEAREST ' + arrowTo(p.x, p.z, best.x, best.z) + ' ' + Math.round(bd) + ' m   (' + best.id.toUpperCase() + ')', 30, 112);
    const ex = C.CITY.EXIT; x.fillStyle = S.got > 0 ? '#7fff90' : '#8a8090'; x.fillText('PIER ' + arrowTo(p.x, p.z, ex[0], ex[2]) + ' ' + Math.round(Math.hypot(ex[0] - p.x, ex[2] - p.z)) + ' m' + (S.got > 0 ? '  (carrying: slower)' : ''), 30, 152);
    const cops = S.sim.activeCops(), near = cops.filter(c => Math.hypot(c.bot.x - p.x, c.bot.z - p.z) < 30), chasing = cops.some(c => c.st.mode === 'chase');
    x.font = 'bold 26px "Courier New", monospace'; x.fillStyle = S.eyeOnMe ? '#ff2a2a' : S.hidden ? '#9ad0ff' : (chasing ? '#ff4a2a' : (near.length ? '#ffb030' : '#8a8090'));
    x.fillText(S.busted >= 0 ? 'BUSTED... back at a safe house soon' : (S.eyeOnMe ? 'THE EYE SEES YOU! Get under a roof or hide!' : S.hidden ? 'HIDDEN: stay still, they cannot see you' : (chasing ? 'THEY SEE YOU! Run, climb or hide!' : (near.length ? 'Cops nearby (' + near.length + '). Stay out of the light.' : 'Quiet. Keep it that way.'))), 30, 196);
    x.font = '22px "Courier New", monospace'; x.fillStyle = '#8a7a9a'; if (S.radioText && S.clock < S.radioText.until) { x.fillStyle = '#9ad0ff'; x.fillText('RADIO: ' + S.radioText.t, 30, 232); } else if (S.vehs && S.vehs.driving()) { x.fillStyle = '#9ad0ff'; x.fillText('DRIVING ' + Math.abs(S.vehs.driveCar().v).toFixed(1) + ' m/s  R trigger gas, L trigger brake, L stick steer, both grips out', 30, 232); } else x.fillText('Hide next to dumpsters. Cops cannot climb: use roofs and the cable rides.', 30, 232);
    const gs = S.gunS.me, ready = gs.reloadAt < 0 || S.clock >= gs.reloadAt;
    x.font = 'bold 28px "Courier New", monospace'; const dmgP = DL.damagePct(gs.hp); x.fillStyle = DL.damageColor(dmgP); x.fillText('DAMAGE ' + dmgP + '%' + (dmgP >= 100 ? ' DEAD' : ''), 30, 270);
    x.fillStyle = ready ? '#ffd27a' : '#ff9a3a'; x.fillText(ready ? 'AMMO ' + (gs.reloadAt >= 0 ? GU.GUN.MAG : gs.ammo) + '/' + GU.GUN.MAG : 'RELOADING', 330, 270);
    if (S.hitMark.t > 0) { x.font = 'bold 30px "Courier New", monospace'; x.fillStyle = S.hitMark.text === 'KILL' ? '#ff3a3a' : '#ffe040'; x.fillText(S.hitMark.text, 560, 190); }
    x.fillStyle = S.mode === 'ffa' ? '#ff6a6a' : '#8ad0ff'; x.fillText(S.gm.phase === 'run' ? GM.MODE_NAMES[S.gm.mode].split(' ')[0] + ' ' + GM.timeText(S.gm.t) + (S.gm.mode === 'cops' ? ' [' + roleOf('me').toUpperCase() + ']' : ' ' + (S.gm.score.me || 0)) : (S.mode === 'ffa' ? 'PVP' : 'CO-OP'), 430, 270);
    x.font = '22px "Courier New", monospace'; x.fillStyle = '#ffb0a0'; S.feed.filter(f => S.clock - f.t < 8).forEach((f, k) => x.fillText(f.s, 560, 232 + k * 26));
    S.hud.update();
}
export function update(dt, t, ctx) {
    if (!S || S.leaving) return;
    S.clock += dt; const p = ctx.body.position, v = ctx.body.velocity, speed = Math.hypot(v.x, v.z); _bp = { x: p.x, z: p.z };
    S.scare.update(dt);
    S.weather.update(S.wx, WX.weatherStep(S.wx, dt), dt);
    camera.getWorldDirection(_d); S.gx.update(dt, { x: ctx.body.position.x, y: ctx.body.position.y, z: ctx.body.position.z, speed: Math.hypot(ctx.body.velocity.x, ctx.body.velocity.z), yaw: Math.atan2(_d.x, _d.z), pitchDown: Math.asin(Math.max(-1, Math.min(1, -_d.y))) });
    S.eggs.update(dt, { x: ctx.body.position.x, y: ctx.body.position.y, z: ctx.body.position.z, speed: Math.hypot(ctx.body.velocity.x, ctx.body.velocity.z), dx: _d.x, dy: _d.y, dz: _d.z, mic: SFX.voiceSpeaking && SFX.voiceSpeaking() ? 0 : (SFX.micLevel ? SFX.micLevel() : 0) });
    S.bb.update(dt);
    S.life.update(dt, { x: ctx.body.position.x, y: ctx.body.position.y, z: ctx.body.position.z, dx: _d.x, dz: _d.z });
    S.esc = DJM.escalationStep(S.esc, DJM.escalationTarget(S.sim.starsOf('me'), S.nightPh), dt); DREAD.fogMul *= S.esc;   // eskalacja mgły przy 4-5 gwiazdkach składa się z pogodą przez mnożenie (pogoda ustawia DREAD.fogMul tuż wyżej)
    S.stunts.update(dt, { x: ctx.body.position.x, y: ctx.body.position.y, z: ctx.body.position.z });
    S.mystery.update(dt, { x: ctx.body.position.x, y: ctx.body.position.y, z: ctx.body.position.z, dx: _d.x, dz: _d.z });
    S.enc.update(dt, { x: ctx.body.position.x, y: ctx.body.position.y, z: ctx.body.position.z, dx: _d.x, dy: _d.y, dz: _d.z });
    nightTick(dt);
    radioTick(dt); contractTick(dt, ctx.body.position.y);
    for (const f of S.fx) if (f.l.visible) { f.t -= dt; if (f.t <= 0) f.l.visible = false; }
    S.hurtT = Math.max(0, S.hurtT - dt); S.hitMark.t = Math.max(0, S.hitMark.t - dt); S.corp.update(dt);
    if (S.busted >= 0) { S.busted += dt; netStep(dt, p, 0); S.heliV.update(S.heli, dt); if (S.busted > 4.5) respawn(); S.hudT -= dt; if (S.hudT <= 0) { S.hudT = 0.3; drawHud(p); } return; }
    L.moveScale = PACE;   // ruch jak w lobby także z torbą (wcześniej ciężar łupu zabierał 8%)
    S.visT -= dt;
    if (S.visT <= 0) { S.visT = 0.3; camera.getWorldPosition(_p); for (const c of S.chunks) c.g.visible = Math.hypot(_p.x - c.c[0], _p.z - c.c[1]) < C.CITY.VIS_R + 20; }   // chunki poza zasięgiem znikają z renderu
    for (const b of S.bags) {
        if (b.got) continue;
        b.g.rotation.y = t * 1.4; b.g.position.y = b.y + Math.sin(t * 2 + b.x) * 0.07;
        if (Math.hypot(p.x - b.x, p.z - b.z) < 1.5 && Math.abs((p.y - 1.0) - b.y) < 2.4) { if (roleOf('me') !== 'cop') { if (isAuth()) giveBag(b, 'me'); else requestTake(b); } }
    }
    updateRails(S.sim, dt, S.forceRail); S.forceRail = undefined;
    // hałas gracza: krzyk do mikrofonu (co najwyżej co 3 s), bieg przy policji
    S.micCd -= dt; const ml = SFX.micLevel ? SFX.micLevel() : 0;
    if (ml > 0.25 && S.micCd <= 0 && !S.hidden) { S.micCd = 3; if (isAuth()) { S.sim.addEvent('shout', p.x, p.z); S.sim.addHeat('me', WL.eventHeat('shout')); } else send({ k: 'ev', kind: 'shout' }); }
    netStep(dt, p, speed);
    S.vehs.update(dt, S.fleet); S.rbfx.sync(S.blocks.nodes); S.cmark.update();
    S.heliV.update(S.heli, dt);
    S.eyeOnMe = HL.heliSees(S.heli, { x: p.x, y: p.y, z: p.z }, { hidden: !!S.sim.hiddenNow.me, blocked: AI2.lineBlocked([S.heli.x, S.heli.y, S.heli.z], [p.x, p.y + 0.5, p.z], S.boxes) });
    // syreny: gdy policjant ściga gracza z bliska, naprzemienne tony (cichy sygnał ostrzegawczy; nie w trybie spokojnym gier, tu go nie ma)
    S.sirenT = (S.sirenT || 0) - dt; if (S.sirenT <= 0 && S.sim.activeCops().some(c => c.st.mode === 'chase' && Math.hypot(c.bot.x - p.x, c.bot.z - p.z) < 45)) { S.sirenT = 0.5; S.sirenF = !S.sirenF; SFX.beep(S.sirenF ? 880 : 640, 0.04, 0.42); }
    ensureGun(); if (S.gunMesh) S.gunMesh.g.visible = S.busted < 0;
    if (N.NET.mode !== 'solo') { MOD.boost = MOD.fly = MOD.noclip = MOD.sizeOn = false; MOD.size = 1; PERSONAL.speed = 1; }   // PvP: bez prędkości, latania, przenikania i rozmiaru z menu admina
    S.hidden = !!S.sim.hiddenNow.me; S.peakStars = Math.max(S.peakStars, S.sim.starsOf('me'));
    S.hudT -= dt; if (S.hudT <= 0) { S.hudT = 0.2; drawHud(p); }
}
// Złapanie (BUSTED): jumpscare (z uwzględnieniem ustawień), upuszczenie toreb, o jedną gwiazdkę mniej, odrodzenie w bezpiecznym punkcie po chwili
function bust(b, remote) {
    if (S.busted >= 0) return;
    S.busted = 0; S.busts++; S.flags.busted = true; S.fleet = VL.endDriveBy(S.fleet, 'me'); S.vehs.endFree(); S.scare.trigger(); releaseAll(); cancelRails(S.sim);
    const lost = S.got;
    if (!remote) { dropBags('me', b.x, b.y || 0, b.z); if (b.reason !== 'shot') S.sim.heats.me = WL.afterBust(S.sim.heatOf('me')); }
    S.gunS.me.deadUntil = S.clock + GU.GUN.RESPAWN;   // gość: torby i ciepło po stronie hosta (migawka)
    if (b.reason === 'shot') S.corp.spawn('me', b.x, b.z, { kind: 'player', yaw: b.yaw !== undefined ? b.yaw : DL.fallYaw(b.x, b.z, b.from || S.killer) });   // padasz i leżysz w kałuży krwi
    S.got = remote ? 0 : S.got;
    toast(b.reason === 'gator' ? 'A gator got you!' : (b.reason === 'shot' ? 'You were SHOT! Respawning...' : 'BUSTED!') + (lost ? ' You dropped ' + lost + ' bag' + (lost === 1 ? '' : 's') + ' here.' : ''), '#ff3a3a');
}
// Torby nosiciela wypadają w miejscu złapania (albo wracają na swoje miejsce, gdy gracz był na dachu)
function dropBags(who, x, y, z) {
    for (const g of S.bags) if (g.holder === who) {
        g.holder = null; g.got = false; g.g.visible = true;
        if (y > 3) { g.x = g.ox; g.y = g.oy; g.z = g.oz; } else { g.x = Math.max(C.CITY.X0 + 3, Math.min(C.CITY.X1 - 3, x + (Math.random() - 0.5) * 3)); g.z = Math.max(C.CITY.Z0 + 3, Math.min(C.CITY.Z1 - 3, z + (Math.random() - 0.5) * 3)); g.y = 0.7; }
        g.g.position.set(g.x, g.y, g.z);
    }
    S.got = S.bags.filter(q => q.holder === 'me').length;
}
function respawn() {
    const p = playerBodyPos(); let best = null, bd = 1e9;
    for (const sf of C.SAFEHOUSES) { const d = Math.hypot(sf.x - p.x, sf.z - p.z); const copNear = S.sim.activeCops().some(c => Math.hypot(c.bot.x - sf.x, c.bot.z - sf.z) < 25), killerNear = S.killer && Math.hypot(S.killer.x - sf.x, S.killer.z - sf.z) < 40; if (!copNear && !killerNear && d < bd) { bd = d; best = sf; } }
    GU.revive(S.gunS.me, S.clock); S.killer = null;
    if (!best) best = C.SAFEHOUSES[0];
    setPlayerPosition(best.x, 1.1, best.z); S.busted = -1; S.sim.resetCopsNear(p.x, p.z, 40); toast('You got away to safe house ' + best.id + '. Lie low.', '#9ad0ff');
}
let _bp = { x: 0, z: 0 }; const playerBodyPos = () => _bp;
// ---------- BROŃ (etap 3b): pistolet w prawej dłoni, strzał spustem (na komputerze lewy przycisk), chwyt wstrzymuje strzał; trafienia liczy host ----------
function buildFx() {
    const mk = () => { const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(0, 0, -1)]), new THREE.LineBasicMaterial({ color: 0xffe0a0, transparent: true, opacity: 0.85 })); l.visible = false; l.frustumCulled = false; L.root.add(l); return { l, t: 0 }; };
    for (let i = 0; i < 8; i++) S.fx.push(mk());
}
function ensureGun() {
    if (S.gunMesh || !hands.R) return;
    const g = new THREE.Group(), metal = new THREE.MeshStandardMaterial({ color: 0x1a1a1e, metalness: 0.8, roughness: 0.35 }), wood = new THREE.MeshStandardMaterial({ color: 0x5a3a20, roughness: 0.7 });
    const parts = [[new THREE.BoxGeometry(0.04, 0.05, 0.18), metal, 0, 0.02, -0.08, 0], [new THREE.BoxGeometry(0.035, 0.09, 0.045), wood, 0, -0.03, 0, 0.25]];
    for (const [ge, ma, x, y, z, rx] of parts) { const m = new THREE.Mesh(ge, ma); m.position.set(x, y, z); m.rotation.x = rx; g.add(m); }
    const br = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.08, 10), metal); br.rotation.x = Math.PI / 2; br.position.set(0, 0.03, -0.2); g.add(br);
    hands.R.add(g); S.gunMesh = { g, geos: parts.map(q => q[0]).concat([br.geometry]), mats: [metal, wood] };
}
const nameOf = (id) => id === 'me' ? safeName(SAVE.profile.name || 'You') : safeName(((N.playersState[id] || {}).profile || {}).name);
function drawTracer(o, e) {
    const f = S.fx.find(q => !q.l.visible) || S.fx[0], a = f.l.geometry.attributes.position; a.setXYZ(0, o[0], o[1], o[2]); a.setXYZ(1, e[0], e[1], e[2]); a.needsUpdate = true; f.l.visible = true; f.t = 0.07;
}
function fire(i) {
    if (!S || S.busted >= 0 || S.leaving || i !== 1 || !hands.R || gripDown(1) || (S.vehs && S.vehs.driving())) return;   // za kierownicą broń jest schowana (spust to gaz)
    const q = new THREE.Quaternion(); hands.R.getWorldQuaternion(q);
    const o = new THREE.Vector3(0, 0.03, -0.24).applyQuaternion(q).add(hands.R.position), d = new THREE.Vector3(0, 0, -1).applyQuaternion(q).normalize();
    camera.getWorldPosition(_p);
    const sh = GU.cleanShot({ o: [o.x, o.y, o.z], d: [d.x, d.y, d.z] }); if (!sh) return;
    const me = S.gunS.me, c = GU.shotCheck(me, sh, S.clock, { x: _p.x, y: _p.y, z: _p.z });
    if (!c.ok) { if (c.reason === 'empty') toast('Reloading...', '#ffd27a'); return; }
    SFX.shot(); buzz(1, 0.5, 40); S.flags.shot = true; drawTracer(sh.o, [sh.o[0] + sh.d[0] * 40, sh.o[1] + sh.d[1] * 40, sh.o[2] + sh.d[2] * 40]);
    if (isAuth()) hostShot('me', sh, true); else send({ k: 'shot', o: sh.o.map(v => +v.toFixed(3)), d: sh.d.map(v => +v.toFixed(4)) });
}
const headOf = (id) => { if (id === 'me') { camera.getWorldPosition(_p); return { x: _p.x, y: _p.y, z: _p.z }; } const g = guestOf(id); return g ? g.head : null; };
function hostShot(id, sh, checked) {
    const head = headOf(id); if (!head) return;
    const st = S.gunS[id] || (S.gunS[id] = GU.newShooter());
    if (!checked && !GU.shotCheck(st, sh, S.clock, head).ok) return;
    if ((S.bustUntil[id] || 0) > S.clock || (id === 'me' && S.busted >= 0)) return;
    S.sim.addEvent('shot', head.x, head.z); S.sim.addHeat(id, WL.eventHeat('shot'));
    const targets = [];
    {
        const fr = GU.friendlyFire(S.mode);
        const mine = { id: 'me', kind: 'player', head: headOf('me'), ignore: S.busted >= 0 || S.clock < S.gunS.me.protectUntil || S.clock < S.gunS.me.deadUntil }; if (GM.canHurt(S.gm, id, 'me', fr)) targets.push(mine);
        for (const g of remotes()) { const gs = S.gunS[g.id] || (S.gunS[g.id] = GU.newShooter()); if (GM.canHurt(S.gm, id, g.id, fr)) targets.push({ id: g.id, kind: 'player', head: g.head, ignore: (S.bustUntil[g.id] || 0) > S.clock || S.clock < gs.protectUntil || S.clock < gs.deadUntil }); }
    }
    S.sim.cops.forEach((c, k) => { if (c.active) targets.push({ id: 'c' + k, kind: 'cop', pos: { x: c.bot.x, z: c.bot.z } }); });
    const res = GU.resolveShot(sh.o, sh.d, targets, S.boxes, id);
    const end = res ? res.e : [sh.o[0] + sh.d[0] * 40, sh.o[1] + sh.d[1] * 40, sh.o[2] + sh.d[2] * 40];
    let kill = false, body = null, landed = false;
    const yawShot = Math.atan2(sh.d[0], sh.d[2]);   // ciało pada w kierunku strzału (od strzelca)
    if (res && res.kind === 'cop') {
        const c = S.sim.cops[+res.id.slice(1)]; c.hp = (c.hp === undefined ? GU.GUN.COP_HP : c.hp) - GU.damageOf(res.zone); landed = true;
        if (c.hp <= 0) { kill = true; body = [+c.bot.x.toFixed(2), +c.bot.z.toFixed(2), +yawShot.toFixed(2)]; S.corp.spawn(res.id, c.bot.x, c.bot.z, { kind: 'cop', yaw: yawShot }); S.sim.despawn(c); S.sim.addHeat(id, WL.eventHeat('kill')); }
    } else if (res) {
        const vs = S.gunS[res.id] || (S.gunS[res.id] = GU.newShooter()), r = GU.hurt(vs, GU.damageOf(res.zone), S.clock);
        if (!r.ignored) {
            landed = true;
            if (res.id === 'me') { S.hurtT = 0.45; buzz('both', 0.7, 120); S.killer = { x: head.x, z: head.z }; }
            if (r.dead) {
                kill = true; S.sim.addHeat(id, WL.eventHeat('kill'));
                const line = GU.feedLine(nameOf(id), nameOf(res.id), res.zone === 'head'); pushFeed(line); send({ k: 'feed', t: line });
                const hv = headOf(res.id), px = hv ? hv.x : 0, pz = hv ? hv.z : 0, py = hv ? GN.bodyY(hv.y) : 0;
                if (res.id === 'me') bust({ reason: 'shot', x: px, z: pz, y: py, yaw: yawShot }); else hostBust({ id: res.id, reason: 'shot', x: px, z: pz, yaw: yawShot });
            }
        }
    }
    pedShot(sh.o, end);   // host i solo widzą każdy strzał tu (własnego `fx` nie dostają)
    if (id === 'me' && landed) S.hitMark = { t: DL.DMG.HIT_SHOW, text: DL.hitText(res.zone, GU.damageOf(res.zone), kill) };   // znacznik trafienia u strzelca: HIT 25% / HEADSHOT 50% / KILL
    send({ k: 'fx', s: toNet(id), o: sh.o.map(v => +v.toFixed(2)), e: end.map(v => +v.toFixed(2)), h: res && res.kind === 'player' && landed ? toNet(res.id) : null, z: res && res.zone === 'head' ? 'h' : 'b', kill, c: res && res.kind === 'cop' ? 1 : 0, cb: body });
    if (id !== 'me') { drawTracer(sh.o, end); camera.getWorldPosition(_p); if (Math.hypot(_p.x - sh.o[0], _p.z - sh.o[2]) < 45) SFX.shot(); }
}
// Strzał w przechodniów (lokalnych): pierwszy na torze o -> e (przyciętym do budynków) pada i leży w kałuży; bez ciepła, nagrody i sieci, pocisk nie zatrzymuje się na nim
function pedShot(o, e) {
    if (!S || !S.life || !S.corp) return;
    const k = S.life.shoot(o, e, S.boxes); if (!k) return;
    S.corp.spawn('ped' + (S.pedN = (S.pedN || 0) + 1), k.x, k.z, { kind: 'ped', yaw: k.yaw });
}
function pushFeed(line) { S.feed.push({ t: S.clock, s: String(line).replace(/[^\w \-!]/g, '').slice(0, 40) }); if (S.feed.length > 3) S.feed.shift(); }
function giveBag(b, who) {
    if (b.got) return;
    b.got = true; b.holder = who; b.g.visible = false; S.sim.addHeat(who, WL.eventHeat('alarm')); S.sim.addEvent('alarm', b.x, b.z);   // alarm przy zabraniu torby
    S.got = S.bags.filter(q => q.holder === 'me').length;
    if (who === 'me') bagToast(b);
}
// Radio policyjne: komunikaty z radiologic.js jako napis w HUD i głos z formantów (ten sam syntezator co potwory), z trzaskiem na początku i końcu
const RADIO_VOICE = { f0: 150, formant: 1.0, rate: 9, breath: 0.45 }, DJ_VOICE = { f0: 105, formant: 0.82, rate: 6, breath: 0.6 };   // DJ: niższy, wolniejszy, bardziej szeptany
function radioTick(dt) {
    const c = { stars: S.sim.starsOf('me'), heli: S.heli.mode !== 'away' && S.heli.mode !== 'leave', swat: S.flags.swat, shot: S.flags.shot, busted: S.flags.busted, block: S.flags.block };
    S.flags.swat = S.flags.shot = S.flags.busted = S.flags.block = false;
    if (S.radioEnd > 0 && S.clock >= S.radioEnd) { S.radioEnd = 0; SFX.beep(1300, 0.04, 0.05); }
    const line = RD.radioStep(S.radio, dt, c);
    if (!line) {   // radio miejskie: DJ Hollow mówi tylko wtedy, gdy policja milczy i nic nie jest na ekranie (niższy priorytet)
        const busy = S.radioEnd > 0 || (S.radioText && S.clock < S.radioText.until) || S.radio.queue.length > 0, m = S.mystery ? S.mystery.info() : { n: 0, total: 6 };
        const dj = DJM.djStep(S.dj, dt, { night: S.nightPh, storm: !!S.wx && S.wx.state === 'storm', stars: c.stars, caseOn: m.n > 0 && m.n < m.total, busy: busy, nick: sanitizeName(SAVE.profile.name || '') || 'friend' });
        S.dj = dj.st;
        if (dj.line) { S.radioText = { t: dj.line, until: S.clock + DJM.DJ.SHOW }; SFX.beep(900, 0.04, 0.05); const dur = SFX.speak(textToEvents(dj.line, DJ_VOICE), DJ_VOICE, undefined, 0.4); S.radioEnd = S.clock + (dur || 2) + 0.1; }
        return;
    }
    const nm = sanitizeName(SAVE.profile.name || ''), text = line.text.replace('{name}', nm || 'you'); S.radioText = { t: text, until: S.clock + RD.RADIO.SHOW }; SFX.beep(1700, 0.05, 0.06);
    const dur = SFX.speak(textToEvents(text, RADIO_VOICE), RADIO_VOICE, undefined, 0.45); S.radioEnd = S.clock + (dur || 1.5) + 0.1;
}
// Oświetlenie miasta: blackout (noc) i wyłączony prąd przy kasynie przyciemniają neony, latarnie i światła kwartałów
function applyLights() {
    const blackout = S.nightPh === 'blackout';
    if (S.lampMesh) S.lampMesh.visible = !blackout;
    for (const n of S.neonMeshes) n.m.visible = !(blackout || (S.powerOn && n.chunk === '2,0'));
    for (const n of S.nlights) n.l.intensity = n.base * (blackout ? 0.15 : (S.powerOn && n.chunk === '2,0' ? 0.1 : 1));
}
function powerZone(sec) {
    const p = X.powerSpot(); S.powerLeft = sec;
    S.sim.darkZones = sec > 0 ? [{ x: p.x, z: p.z, r: X.POWER.ZONE_R, mul: X.POWER.DARK_MUL }] : [];
}
// Noc (host albo solo): po 150 s blackout (40 s), potem horda dodatkowych policjantów-zombie (60 s); goście dostają fazę w migawce
function nightTick(dt) {
    if (isAuth()) {
        const r = X.nightStep(S.night, dt); S.night = r.st;
        if (r.event) setNight(S.night.ph, true);
        if (S.powerLeft > 0) { S.powerLeft -= dt; if (S.powerLeft <= 0) powerZone(0); }
    }
}
function setNight(ph, announce) {
    ph = X.cleanNight(ph); if (ph === S.nightPh) return; S.nightPh = ph;
    S.sim.globalSight = ph === 'blackout' ? X.NIGHT.SIGHT_MUL : 1; S.sim.extraCops = ph === 'horde' && isAuth() ? X.NIGHT.HORDE_COPS : 0;
    applyLights();
    if (announce !== false) { if (ph === 'blackout') toast('BLACKOUT! The whole city went dark.', '#ffe040'); else if (ph === 'horde') { toast('Midnight: the dead cops are coming!', '#ff3a3a'); SFX.roar && SFX.roar(0.5); } else toast('The night calms down.', '#9ad0ff'); }
}
// ----- tryby gry (core/gtamodes.js): host liczy role, punkty i zwycięzcę; panel przy spawnie wybiera tryb (tylko host albo solo) -----
const roleOf = (id) => S && S.gm && S.gm.phase === 'run' && S.gm.mode === 'cops' ? (S.gm.roles[id] || 'robber') : 'robber';
function modeIds() { return ['me'].concat(remotes().map(r => r.id)); }
function modeDeliver(id, n) { if (n > 0) S.gm = GM.modeEvent(S.gm, { type: 'deliver', id: id, n: n }); for (const b of S.bags) if (b.holder === id) { b.holder = null; b.got = false; b.g.visible = true; b.x = b.ox; b.y = b.oy; b.z = b.oz; b.g.position.set(b.x, b.y, b.z); } S.got = S.bags.filter(q => q.holder === 'me').length; }
function modeSnapNet() { const sn = GM.modeSnap(S.gm), map = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [toNet(k), v])); return Object.assign(sn, { r: map(sn.r), s: map(sn.s), w: sn.w === 'me' ? N.myId() : sn.w }); }
const winnerText = (w) => w === 'cops' ? 'THE COPS WIN' : w === 'robbers' ? 'THE ROBBERS WIN' : w === 'team' ? 'THE TEAM PULLED IT OFF' : w === 'lost' ? 'THE HEIST FAILED' : (w ? nameOf(w) + ' WINS' : 'NO WINNER');
function modePhaseToast() {
    if (S.gm.phase === S.gmPhase) return;
    const prev = S.gmPhase; S.gmPhase = S.gm.phase;
    if (S.gm.phase === 'run') toast(GM.MODE_NAMES[S.gm.mode] + ' starts!' + (S.gm.mode === 'cops' ? (roleOf('me') === 'cop' ? ' You are a COP: catch the robbers.' : ' You are a ROBBER: steal and escape.') : ''), '#ffd27a');
    else if (S.gm.phase === 'over' && prev === 'run') toast(winnerText(S.gm.winner), '#7fff90');
    if (S.mterm) S.mterm.dirty = true;
}
function setMode(m) { if (N.NET.mode === 'guest' || S.gm.phase === 'run') return; S.gm = Object.assign(GM.stopRound(S.gm), { mode: GM.cleanModeId(m) }); if (S.mterm) S.mterm.dirty = true; }
function toggleRound() {
    if (N.NET.mode === 'guest') return;
    if (S.gm.phase === 'run') S.gm = Object.assign(GM.stopRound(S.gm), { mode: S.gm.mode });
    else { const n = modeIds().length; if (!GM.canStart(S.gm.mode, n)) { toast(S.gm.mode === 'free' ? 'Pick a mode first.' : 'Needs ' + GM.RULES[S.gm.mode].min + '+ players.', '#ff9a6a'); return; } S.gm = GM.startRound(S.gm, S.gm.mode, modeIds()); }
    modePhaseToast(); if (S.mterm) S.mterm.dirty = true;
}
function buildModePanel() {
    S.mterm = new Terminal((t) => {
        const host = N.NET.mode !== 'guest', run = S.gm.phase === 'run';
        t.background(); t.header('GAME MODE', run ? GM.timeText(S.gm.t) : (S.gm.phase === 'over' ? 'ROUND OVER' : ''), run ? OK_COL : AMBER_DIM);
        GM.MODES.forEach((m, i) => t.btn('m' + m, 24, 80 + i * 56, 300, 50, GM.MODE_NAMES[m], () => setMode(m), { active: S.gm.mode === m, size: 24 }));
        t.btn('go', 24, 80 + 4 * 56, 300, 56, run ? 'STOP ROUND' : 'START ROUND', () => toggleRound(), { size: 26, tone: run ? 'bad' : 'ok' });
        t.text(host ? 'Pick a mode, then start.' : 'The host picks the mode.', 24, 372, 20, AMBER_DIM, 'left');
        const X0 = 350; t.text(S.gm.phase === 'over' ? winnerText(S.gm.winner) : GM.MODE_NAMES[S.gm.mode], X0, 112, 26, S.gm.phase === 'over' ? OK_COL : GOLD, 'left', true);
        const R = { free: 'Roam, steal, shoot. No rules.', cops: 'Cops catch robbers (touch or shoot). Robbers deliver bags.', race: 'First to leave with 3 bags wins.', coop: 'Deliver 6 bags together. Heat is shared.' }[S.gm.mode];
        R.match(/.{1,34}(\s|$)/g).forEach((ln, i) => t.text(ln.trim(), X0, 150 + i * 28, 20, AMBER, 'left'));
        let y = 250; for (const id of Object.keys(S.gm.score)) { t.text((id === 'me' ? 'You' : nameOf(id)) + (S.gm.roles[id] ? ' (' + S.gm.roles[id] + ')' : '') + ': ' + S.gm.score[id], X0, y, 22, '#ffd27a', 'left'); y += 28; if (y > 380) break; }
        t.scanlines();
    }, 640, 420);
    const scr = S.mterm.createMesh(1.7, 1.115); scr.position.set(3.4, 1.55, 53.2); L.root.add(scr); S.mterm.dirty = true;
}
// ----- pojazdy ucieczki (core/vehicles.js, core/vehiclelogic.js): host trzyma flotę, goście proszą o start i odtwarzają migawkę -----
const riderOf = (id) => (!!S.fleet && S.fleet.some(c => c.occ === id)) || (id === 'me' && !!S.vehs && S.vehs.driving() && Math.abs(S.vehs.driveCar().v) > 2) || (id !== 'me' && !!S.vehs && S.vehs.freeSpeedOf(id) > 2);   // jadący (po szynach albo swobodnie szybciej niż 2 m/s) nie jest łapany dotykiem
// Telefon: jedna linia ze wszystkimi licznikami sekretów i podpowiedź (notatka sprawy, gdy trwa; inaczej podpowiedź do następnego jajka)
// Dzienne kontrakty: detektory z lokalnych danych (u gościa działają bez sieci); nagrody tylko poza mutatorem i poza rundą trybu
function contractTick(dt, y, evIn) {
    if (!S.ctr) return;
    const g = getGta(), night = S.nightPh, ev = evIn || { stars: S.sim.starsOf('me'), sprayed: g.sprayed > S.ctr.spr, y: y, arrived: S.ctr.arrived, night: night, busted: S.busted >= 0, got: S.got, heli: S.heli.mode !== 'away' && S.heli.mode !== 'leave' };
    if (!S.ctr.seen) { S.ctr.run.prevNight = night === 'blackout' || night === 'horde' ? night : 'calm'; S.ctr.run.prevGot = S.got; S.ctr.seen = true; }   // wejście w trakcie blackoutu ani z torbą nic nie zalicza
    S.ctr.spr = g.sprayed; S.ctr.arrived = false;
    const r = CTm.contractStep(S.ctr.run, ev); S.ctr.run = r.run;
    if (mutatorActive() || (S.gm && S.gm.phase === 'run')) return;
    for (const id of r.hits) {
        const res = CTm.completeContract(getGta(), dailyDate(), id); if (!res.reward) continue;
        setGta(res.gta); addBones(res.reward + res.bonus, 'GTA contract');
        toast('Contract done: ' + CTm.textOf(id) + '. +' + res.reward + (res.all ? ' and +' + res.bonus + ' for all three!' : ''), '#ffd27a');
    }
}
function secretsInfo() {
    if (!S || !S.eggs) return null;
    const e = S.eggs.info(), st = S.stunts.info(), m = S.mystery.info(), en = S.enc.info();
    const ci = CTm.contractInfo(getGta(), dailyDate());
    return { line: 'EGGS ' + e.n + '/' + e.total + ' JUMPS ' + st.n + '/' + st.total + ' CASE ' + m.n + '/' + m.total + ' SEEN ' + en.n + '/' + en.total + ' DEALS ' + ci.n + '/' + ci.total, hint: m.note || e.hint || st.hint || (ci.next ? 'DEAL: ' + ci.next : '') };
}
// Przeszkody dla ruchu ulicznego (tylko wizualnego): pickupy i policjanci; gracz jest dodawany w module
function lifeObstacles() { return (S.vehs ? S.vehs.cars.map(c => ({ x: c.m.position.x, z: c.m.position.z })) : []).concat(S.sim.activeCops().map(c => ({ x: c.bot.x, z: c.bot.z })), S.blocks ? S.blocks.nodes.map(i => BL.nodePos(i)).filter(Boolean) : []); }
function eggRide() { const f = S.fleet && S.fleet.find(q => q.occ === 'me'); if (!f || !S.vehs) return null; const c = S.vehs.cars.find(q => q.id === f.id); return c ? { x: c.m.position.x, z: c.m.position.z, yaw: c.m.rotation.y } : null; }
// ---------- SWOBODNA JAZDA (core/drivelogic.js): kradzież auta dotknięciem drzwi kierowcy; kierowca liczy auto lokalnie ----------
function driveWorld() {   // przeszkody dla auta: bryły z L.obstacles na wysokości auta (bez krawężników i rusztowań nad głową) i barykady
    const boxes = []; for (const o of L.obstacles) { const b = o.box3; if (b.max.y < 0.45 || b.min.y > 1.4) continue; boxes.push({ x0: b.min.x, x1: b.max.x, z0: b.min.z, z1: b.max.z }); }
    for (const i of (S.blocks ? S.blocks.nodes : [])) { const p = BL.nodePos(i); if (!p) continue; const ax = BL.streetAlongX(i); boxes.push(ax ? { x0: p.x - 0.5, x1: p.x + 0.5, z0: p.z - 4.4, z1: p.z + 4.4 } : { x0: p.x - 4.4, x1: p.x + 4.4, z0: p.z - 0.5, z1: p.z + 0.5 }); }   // barykada stoi w poprzek ulicy (8,8 m): pojazdy ją omijają, piesi nie
    return { boxes: boxes, bounds: { x0: C.CITY.X0, x1: C.CITY.X1, z0: C.CITY.Z0, z1: 52 } };
}
function driveInput() {
    if (S.dbgIn) return S.dbgIn;   // tylko testy
    if (renderer.xr.isPresenting) return { gas: triggerDown(1) ? 1 : 0, brake: triggerDown(0) ? 1 : 0, steer: stickX('left') };
    return driveKeys();
}
function runOverPeds(x, z, r, yaw, quiet) {   // przechodnie przed jadącym autem padają (lokalnie, jak po strzale: bez ciepła i nagrody)
    if (!S.life) return 0; const list = S.life.runOver(x, z, r, yaw); for (const k of list) S.corp.spawn('ped' + (S.pedN = (S.pedN || 0) + 1), k.x, k.z, { kind: 'ped', yaw: yaw }); if (list.length && !quiet) buzz('both', 0.6, 160); return list.length;
}
function requestFree(carId) {
    if (!S || S.busted >= 0) return;
    if (isAuth()) { camera.getWorldPosition(_p); hostFree('me', carId, { x: _p.x, z: _p.z }); } else send({ k: 'ev', kind: 'drive', car: carId, route: 'drive' });
}
// Host (albo solo) zatwierdza kradzież: auto wolne (nie jedzie po szynach, nikt nim nie jeździ), gracz nie jedzie niczym innym, głowa blisko drzwi; start z miejsca parkowania to alarm (+30 ciepła)
function hostFree(who, carId, head) {
    const car = S.vehs.cars.find(c => c.id === carId); if (!car || !head) return false;
    if (who !== 'me' && (S.bustUntil[who] || 0) > S.clock) return false;
    if (S.fleet.some(f => f.id === carId && f.occ) || S.fleet.some(f => f.occ === who) || S.vehs.freeDriver(carId)) return false;
    const pose = car.free ? car.free.pose : VL.parkedPose(carId), door = DRV.doorPoint(pose); if (Math.hypot(head.x - door.x, head.z - door.z) > VL.RIDE.START_R) return false;
    const fresh = !car.free || car.free.remote;   // start z miejsca parkowania (albo cudze porzucone auto) to kradzież: alarm
    if (who === 'me') { if (!S.vehs.beginFree(carId)) return false; }
    else { S.vehs.setRemote(carId, who, { x: pose.x, z: pose.z, yaw: pose.yaw, v: 0 }); S.fdLast[carId] = { t: S.clock, pose: { x: pose.x, z: pose.z, yaw: pose.yaw, v: 0 } }; S.fdBad[who] = 0; }   // gość jedzie: host zna go jako kierowcę, a pozę dostaje od niego (hostPose)
    if (fresh) { S.sim.addHeat(who, WL.eventHeat('alarm')); S.sim.addEvent('alarm', door.x, door.z); }
    return true;
}
// Gość kierowca wysyła pozę auta (8 Hz); host przyjmuje ją tylko od kierowcy tego auta i tylko, gdy jest wiarygodna (ruch i obrót w granicach, nie w bryle, w mieście, głowa blisko auta)
function sendPose(p) { if (!isAuth()) send({ k: 'drv', car: p.car, x: +p.x.toFixed(2), z: +p.z.toFixed(2), yaw: +p.yaw.toFixed(3), v: +p.v.toFixed(2) }); }
function hostPose(g, msg) {
    const p = DRV.cleanPose(msg); if (!p) return;
    const car = S.vehs.cars.find(c => c.id === p.car); if (!car || !car.free || car.free.driver !== g.id) return;
    const last = S.fdLast[p.car] || { t: S.clock - 0.125, pose: car.free.target || car.free.pose }, b = DRV.bodyPos(p);
    if (Math.hypot(g.head.x - b.x, g.head.z - b.z) > 6) { S.vehs.releaseDriver(g.id); return; }   // głowa gościa nie jest w aucie
    if (!DRV.poseOk(last.pose, p, S.clock - last.t, driveWorld())) { if ((S.fdBad[g.id] = (S.fdBad[g.id] || 0) + 1) > 12) { S.vehs.releaseDriver(g.id); S.fdBad[g.id] = 0; } return; }   // długo niewiarygodna poza: gość przestaje być kierowcą
    S.fdBad[g.id] = 0; S.fdLast[p.car] = { t: S.clock, pose: p }; S.vehs.setRemote(p.car, g.id, p);
}
function dismountMe() { S.fleet = VL.endDriveBy(S.fleet, 'me'); if (!isAuth()) send({ k: 'ev', kind: 'dismount' }); }
function requestDrive(carId, idx) {
    const v = VL.VEHICLES.find(q => q.id === carId), route = v && v.routes[idx]; if (!route || S.busted >= 0) return;
    if (BL.rideBlock(carId, route.id, S.blocks.nodes).kind === 'blocked') { if (S.clock - (S.rbToast || -9) > 2) { S.rbToast = S.clock; toast('Road blocked. Take the other route or run.', '#ff6a6a'); } return; }
    if (isAuth()) { camera.getWorldPosition(_p); hostDrive('me', carId, route.id, { x: _p.x, z: _p.z }); } else send({ k: 'ev', kind: 'drive', car: carId, route: route.id });
}
function hostDrive(who, carId, routeId, head) {
    const sp = VL.startPoint(carId); if (!sp || !head || S.vehs.isFree(carId)) return;   // auto, którym ktoś jechał swobodnie, nie jest na miejscu parkowania: po szynach nie pojedzie
    if (who !== 'me' && (S.bustUntil[who] || 0) > S.clock) return;
    const rb = BL.rideBlock(carId, routeId, S.blocks.nodes); if (rb.kind === 'blocked') return;   // barykada tuż przy starcie: auto nie rusza (gość dostaje napis od siebie)
    const r = VL.startDrive(S.fleet, carId, routeId, who, S.clock, Math.hypot(head.x - sp.x, head.z - sp.z), rb.stop); if (!r.ok) return;
    S.fleet = r.fleet; S.sim.addHeat(who, WL.eventHeat('alarm')); S.sim.addEvent('alarm', sp.x, sp.z);   // kradzież auta to alarm; jazda nic nie płaci
}
function bagToast(b) { toast('Bag ' + S.got + '/' + S.bags.length + ': ' + b.id + (S.got === 1 ? '. You are slower while carrying loot. Head for the pier!' : ''), '#ffd27a'); SFX.bell && SFX.bell(); }
// ---------- SIEĆ (etap 3a): host liczy policję, ciepło i torby dla wszystkich; goście dostają migawki (8 Hz) i odtwarzają je bez własnej AI ----------
const BAG_IDS = () => S.bags.map(q => q.id);
const toNet = (id) => id === 'me' ? N.myId() : id;
const fromNet = (id) => id === N.myId() ? 'me' : id;
function isAuth() {
    if (N.NET.mode !== 'guest') return true;
    const hs = N.hostState();
    return !(hs && hs.lvl === 'scarygta' && S.clock - S.lastHostMsg < GN.GN.HOST_LOST);
}
function remotes() {
    const out = [];
    if (N.NET.mode === 'host') for (const id in N.playersState) { if (id === N.myId()) continue; const st = N.playersState[id]; if (st && st.lvl === 'scarygta' && st.head && Array.isArray(st.head.p) && st.head.p.every(Number.isFinite)) out.push({ id, head: { x: st.head.p[0], y: st.head.p[1], z: st.head.p[2] } }); }
    return out;
}
const guestOf = (id) => remotes().find(r => r.id === id) || null;
const send = (m) => { S.sent.push(m); if (S.sent.length > 60) S.sent.shift(); N.sendLevelMsg(m); };   // skrzynka nadawcza dla testów (ostatnie 60)
function requestTake(b) { if (S.takeCd[b.id] > S.clock) return; S.takeCd[b.id] = S.clock + 0.6; send({ k: 'take', b: b.id }); }
function netStep(dt, p, speed) {
    const auth = isAuth(), guests = auth ? remotes() : [];
    S.sim.puppet = !auth;
    if (auth) {
        const players = [{ id: 'me', riding: riderOf('me'), x: p.x, y: p.y, z: p.z, speed: riderOf('me') ? 0 : speed, busted: S.busted >= 0 || roleOf('me') === 'cop', carrying: S.got }];
        const ids = new Set(['me']);
        for (const g of guests) {
            S.sim.sightMul[g.id] = (S.disUntil[g.id] || 0) > S.clock ? X.DISGUISE.SIGHT : 1;
            ids.add(g.id); const tr = S.track[g.id] || (S.track[g.id] = GN.newTrack()), sp = GN.trackStep(tr, g.head.x, g.head.z, S.clock);
            players.push({ id: g.id, riding: riderOf(g.id), x: g.head.x, y: GN.bodyY(g.head.y), z: g.head.z, speed: (S.rideUntil[g.id] || 0) > S.clock || riderOf(g.id) ? 0 : sp, busted: (S.bustUntil[g.id] || 0) > S.clock || roleOf(g.id) === 'cop', carrying: S.bags.filter(q => q.holder === g.id).length });
        }
        for (const id of Object.keys(S.track)) if (!ids.has(id)) delete S.track[id];
        S.fleet = VL.fleetStep(S.fleet, S.clock, ids);   // auta wolne po dojeździe i gdy pasażera już nie ma
        for (const c of S.vehs.cars) if (c.free && c.free.driver && !ids.has(c.free.driver)) S.vehs.releaseDriver(c.free.driver);   // kierowca wyszedł z poziomu albo się rozłączył: auto zostaje porzucone
        for (const id of Object.keys(S.gunS)) { if (id !== 'me' && !ids.has(id)) { delete S.gunS[id]; continue; } const st = S.gunS[id]; if (id !== 'me' && st.deadUntil > 0 && S.clock >= st.deadUntil) GU.revive(st, S.clock); }
        // gracz, który wyszedł z poziomu albo się rozłączył, traci torby (wracają na swoje miejsca)
        for (const b of S.bags) if (b.holder && !ids.has(b.holder)) { b.holder = null; b.got = false; b.g.visible = true; b.x = b.ox; b.y = b.oy; b.z = b.oz; b.g.position.set(b.x, b.y, b.z); }
        if (speed > 4.3 && !ridingAny(S.sim) && S.sim.activeCops().some(c => Math.hypot(c.bot.x - p.x, c.bot.z - p.z) < 12) && !S.sim.hiddenNow.me) S.sim.addHeat('me', WL.eventHeat('run', dt));
        for (const g of players.slice(1)) if (g.speed > 4.3 && !S.sim.hiddenNow[g.id] && S.sim.activeCops().some(c => Math.hypot(c.bot.x - g.x, c.bot.z - g.z) < 12)) S.sim.addHeat(g.id, WL.eventHeat('run', dt));
        let seenAny = false, lead = null, maxStars = 0;
        for (const pl of players) { if (pl.busted) continue; const hid = !!S.sim.hiddenNow[pl.id], blocked = AI2.lineBlocked([S.heli.x, S.heli.y, S.heli.z], [pl.x, pl.y + 0.5, pl.z], S.boxes); if (HL.heliSees(S.heli, pl, { hidden: hid, blocked })) { S.sim.extSeen[pl.id] = true; S.sim.addHeat(pl.id, WL.eventHeat('heli', dt)); seenAny = true; } }
        const out = S.sim.update(dt, players);
        // tryby: czas rundy, łapanie złodziei przez policjantów-graczy, wspólne ciepło w co-opie
        if (S.gm.phase === 'run') {
            S.gm = GM.modeStep(S.gm, dt);
            if (S.gm.mode === 'cops') {
                for (const cp of players.filter(q => roleOf(q.id) === 'cop')) for (const rb of players.filter(q => roleOf(q.id) === 'robber' && !q.busted)) {
                    if (AI2.caughtBy({ x: cp.x, z: cp.z, y: cp.y }, { x: rb.x, y: rb.y, z: rb.z })) { S.gm = GM.modeEvent(S.gm, { type: 'bust', by: cp.id, id: rb.id }); if (rb.id === 'me') bust({ reason: 'cop', x: rb.x, z: rb.z }); else hostBust({ id: rb.id, reason: 'cop', x: rb.x, z: rb.z }); break; }
                }
            } else if (S.gm.mode === 'coop') { const mx = Math.max(...players.map(q => S.sim.heatOf(q.id).v)); for (const q of players) S.sim.heats[q.id] = { v: mx, seenT: S.sim.heatOf(q.id).seenT }; }
        }
        modePhaseToast();
        for (const pl of players) { if (pl.busted) continue; const st = S.sim.starsOf(pl.id); if (st > maxStars || (st === maxStars && !lead)) { maxStars = st; lead = { x: pl.x, z: pl.z }; } }
        { const br = BL.blockStep(S.blocks, dt, { stars: maxStars, lead: lead }); S.blocks = br.st; if (br.placed.length) { S.flags.block = true; } }
        const ev = HL.heliStep(S.heli, dt, { stars: maxStars, lead: maxStars > 0 ? lead : null, seen: seenAny });
        if (ev.spawn) toast('A police helicopter is coming. Get under cover!', '#ff6a6a');
        if (ev.swat) S.flags.swat = true;
        if (ev.swat && lead) { const n = S.sim.dropSwat(lead.x, lead.z, HL.HELI.SWAT_N); if (n) toast('SWAT is rappelling in!', '#ff3a3a'); }
        for (const b of out.busts) { if (b.id === 'me') { bust(b); break; } else hostBust(b); }
        S.netT -= dt; if (S.netT <= 0 && N.NET.mode === 'host') { S.netT = 1 / GN.GN.HZ; broadcastState(players); }
    } else {
        // gość: policja i ciepło z migawki; tylko aligatory liczy lokalnie (zgłasza własne złapanie)
        const sn = S.snap; if (sn) S.sim.applyCops(sn.cops, dt);
        const out = S.sim.update(dt, [{ id: 'me', x: p.x, y: p.y, z: p.z, speed: ridingAny(S.sim) ? 0 : speed, busted: S.busted >= 0, carrying: S.got }]);
        for (const b of out.busts) if (b.reason === 'gator') { bust(b, true); send({ k: 'gbust' }); break; }
        S.micCd = Math.max(0, S.micCd);
        S.rideT -= dt; if (ridingAny(S.sim) && S.rideT <= 0) { S.rideT = 0.4; send({ k: 'ev', kind: 'ride' }); }
    }
}
function broadcastState(players) {
    const heats = {}; for (const pl of players) heats[toNet(pl.id)] = [+S.sim.heatOf(pl.id).v.toFixed(1), S.sim.hiddenNow[pl.id] ? 1 : 0];
    const hp = {}; for (const pl of players) hp[toNet(pl.id)] = (S.gunS[pl.id] || (S.gunS[pl.id] = GU.newShooter())).hp;
    send({ k: 'st', cops: S.sim.copSnap(), bags: S.bags.map(b => [b.id, +b.x.toFixed(2), +b.y.toFixed(2), +b.z.toFixed(2), b.holder ? toNet(b.holder) : null]), heats, hp, m: S.mode, hl: HL.heliSnap(S.heli), fd: S.vehs.freePoses().map(f => [f.car, f.driver ? toNet(f.driver) : null, f.x, f.z, f.yaw, f.v]), nt: S.nightPh, rb: S.blocks.nodes, pw: S.powerLeft > 0 ? 1 : 0, gm: modeSnapNet(), veh: VL.fleetSnap(S.fleet.map(c => c.occ ? Object.assign({}, c, { occ: toNet(c.occ) }) : c), S.clock) });
}
function hostBust(b) {
    const g = guestOf(b.id); if (!g || (S.bustUntil[b.id] || 0) > S.clock) return;
    S.fleet = VL.endDriveBy(S.fleet, b.id); S.vehs.releaseDriver(b.id); S.bustUntil[b.id] = S.clock + GN.GN.BUST_PROTECT; dropBags(b.id, b.x, bodyYOf(g), b.z);
    (S.gunS[b.id] || (S.gunS[b.id] = GU.newShooter())).deadUntil = S.clock + GU.GUN.RESPAWN;
    const yaw = b.reason === 'shot' ? (b.yaw !== undefined ? b.yaw : DL.fallYaw(b.x, b.z, null)) : undefined;
    if (yaw !== undefined) S.corp.spawn(b.id, b.x, b.z, { kind: 'player', yaw: yaw });   // gość zabity: ciało w miejscu śmierci także u hosta
    if (b.reason !== 'shot') S.sim.heats[b.id] = WL.afterBust(S.sim.heatOf(b.id)); { const bm = { k: 'bust', id: b.id, r: b.reason === 'gator' || b.reason === 'shot' ? b.reason : 'cop', x: +b.x.toFixed(2), z: +b.z.toFixed(2) }; if (yaw !== undefined) bm.a = +yaw.toFixed(2); send(bm); }
}
const bodyYOf = (g) => GN.bodyY(g.head.y);
// Wiadomości: host przyjmuje żądania gości (z weryfikacją przez własny widok gracza), gość przyjmuje migawki hosta
function onNet(msg, from) {
    if (!S || !msg || typeof msg !== 'object') return;
    if (N.NET.mode === 'host') {
        const g = guestOf(from); if (g && msg.k === 'shot') { const sh = GU.cleanShot(msg); if (sh) hostShot(g.id, sh, false); return; }
        if (g && msg.k === 'drv') { hostPose(g, msg); return; }
        const rq = GN.cleanRequest(msg, BAG_IDS()); if (!g || !rq) return;
        if (rq.k === 'take') { const b = S.bags.find(q => q.id === rq.b); if (b && !b.got && roleOf(g.id) !== 'cop' && (S.bustUntil[g.id] || 0) <= S.clock && GN.validTake(b, g.head, b.holder)) { giveBag(b, g.id); send({ k: 'st', cops: S.sim.copSnap(), bags: S.bags.map(q => [q.id, q.x, q.y, q.z, q.holder ? toNet(q.holder) : null]), heats: {} }); } }
        else if (rq.k === 'ev' && rq.kind === 'shout') { if ((S.shoutAt[g.id] || 0) <= S.clock) { S.shoutAt[g.id] = S.clock + GN.GN.SHOUT_GAP; S.sim.addEvent('shout', g.head.x, g.head.z); S.sim.addHeat(g.id, WL.eventHeat('shout')); } }
        else if (rq.k === 'ev' && rq.kind === 'ride') S.rideUntil[g.id] = S.clock + 1;
        else if (rq.k === 'ev') hostExtra(g, rq.kind, rq);
        else if (rq.k === 'gbust') hostBust({ id: g.id, reason: 'gator', x: g.head.x, z: g.head.z });
        return;
    }
    if (N.NET.mode !== 'guest' || from !== 'host') return;
    if (msg.k === 'st') {
        S.lastHostMsg = S.clock;
        const cops = GN.cleanCops(msg.cops), bags = GN.cleanBags(msg.bags, BAG_IDS()), heats = GN.cleanHeats(msg.heats);
        S.snap = { cops };
        for (const e of bags) { const b = S.bags.find(q => q.id === e.id); if (!b) continue; const mine = e.holder === N.myId(); b.holder = e.holder ? (mine ? 'me' : e.holder) : null; b.got = !!e.holder; b.x = e.x; b.y = e.y; b.z = e.z; b.g.visible = !e.holder; b.g.position.set(e.x, e.y, e.z); }
        if (bags.length) { const was = S.got; S.got = S.bags.filter(q => q.holder === 'me').length; if (S.got > was) { const nb = S.bags.find(q => q.holder === 'me'); if (nb) bagToast(nb); } }
        const hl = GN.cleanHeli(msg.hl); if (hl) { const h = S.heli; h.x = hl.x; h.y = hl.y; h.z = hl.z; h.yaw = hl.yaw; h.lx = hl.lx; h.lz = hl.lz; h.mode = hl.mode; } else if (msg.hl === null) S.heli.mode = 'away';
        { const ms = GM.cleanModeSnap(msg.gm), map = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [fromNet(k), v])); S.gm = Object.assign(ms, { roles: map(ms.roles), score: map(ms.score), winner: ms.winner === N.myId() ? 'me' : ms.winner }); modePhaseToast(); }
        {   // swobodne auta od hosta: cudze interpolujemy, a gdy host uznał MNIE za kierowcę, zaczynam jechać (wejście potwierdza host); gdy host przestał mnie wymieniać, wysiadam
            const fd = DRV.cleanFree(msg.fd, (id) => VL.VEHICLES.some(v => v.id === id)), seen = new Set();
            for (const e of fd) { seen.add(e.car); const drv = e.driver ? fromNet(e.driver) : null; if (drv === 'me') { if (S.vehs.driving()) S.fdSeen = S.clock; else if (S.clock >= S.fdIgnoreUntil && S.vehs.beginFree(e.car)) S.fdSeen = S.clock; } else S.vehs.setRemote(e.car, drv, e.pose); }
            S.vehs.clearRemoteExcept(seen); if (S.vehs.driving() && S.clock - S.fdSeen > 1.2) S.vehs.endFree();
        }
        { const veh = VL.cleanVehicles(msg.veh); S.fleet = VL.newFleet().map(c => { const e = veh.find(q => q.car === c.id); return e ? { id: c.id, occ: fromNet(e.occ), route: e.route, t0: S.clock - e.age, stop: e.stop } : c; }); { const nb = BL.cleanBlocks(msg.rb); if (BL.newNodes(S.rbSeen ? S.blocks.nodes : null, nb).length) S.flags.block = true; S.rbSeen = true; S.blocks = { nodes: nb, quiet: 0 }; } }
        setNight(msg.nt); if (msg.pw === 1 || msg.pw === 0) { const on = msg.pw === 1; if (on !== S.powerOn && !S.gx.debug().power) { S.powerOn = on; applyLights(); } }
        const hpm = GU.cleanHp(msg.hp); if (Number.isFinite(hpm[N.myId()])) S.gunS.me.hp = hpm[N.myId()]; if (msg.m === 'coop' || msg.m === 'ffa') S.mode = msg.m;
        const mh = heats[N.myId()]; if (mh) { S.sim.heats.me = { v: mh.v, seenT: 0 }; S.sim.hiddenNow.me = mh.hidden; }
    } else if (msg.k === 'fx') {
        const fx = GU.cleanFx(msg); if (!fx) return;
        pedShot(fx.o, fx.e);   // także własne strzały gościa wracają tu jako `fx`
        if (fromNet(fx.s) !== 'me') { drawTracer(fx.o, fx.e); camera.getWorldPosition(_p); if (Math.hypot(_p.x - fx.o[0], _p.z - fx.o[2]) < 45) SFX.shot(); }
        if (fx.hit === N.myId()) { S.hurtT = 0.45; buzz('both', 0.7, 120); }
        if (fromNet(fx.s) === 'me' && (fx.hit || fx.cop || fx.kill)) S.hitMark = { t: DL.DMG.HIT_SHOW, text: DL.hitText(fx.zone, GU.damageOf(fx.zone), fx.kill) };
        if (fx.body) S.corp.spawn('c' + fx.body[0].toFixed(1) + ',' + fx.body[1].toFixed(1), fx.body[0], fx.body[1], { kind: 'cop', yaw: fx.body[2] });
    } else if (msg.k === 'feed') {
        if (typeof msg.t === 'string') pushFeed(msg.t);
    } else if (msg.k === 'bust') {
        const bu = GN.cleanBust(msg); if (bu && bu.id === N.myId()) bust({ reason: bu.reason, x: bu.x, z: bu.z, yaw: bu.yaw }, true);
        else if (bu && bu.reason === 'shot') S.corp.spawn(bu.id, bu.x, bu.z, { kind: 'player', yaw: bu.yaw !== undefined ? bu.yaw : DL.fallYaw(bu.x, bu.z, null) });   // cudza śmierć: ciało leży w kałuży krwi
    }
}
export const debugFinish = (stars) => { if (!S) return false; if (stars !== undefined) S.peakStars = stars; finish(); return true; };
export const testState = () => S;   // dla testów
export const debugCity = () => S ? { chunks: S.chunks.length, visible: S.chunks.filter(c => c.g.visible).length, bags: S.bags.length, got: S.got, moveScale: L.moveScale, cars: S.carCount, buildings: S.buildings.length } : null;
export const debugSim = () => S ? { stars: S.sim.starsOf('me'), heat: S.sim.heatOf('me').v, cops: S.sim.activeCops().length, modes: S.sim.activeCops().map(c => c.st.mode), busted: S.busted, busts: S.busts, hidden: S.hidden, got: S.got, gators: S.sim.gators.length, rails: S.sim.rails.map(r => r.st.ph), events: S.sim.events.length } : null;
export function debugHeat(v) { if (S) S.sim.addHeat('me', v); }
export function debugBust() { if (S) bust({ id: 'me', reason: 'cop', x: 0, z: 0 }); }
export const debugNet = (msg, from) => { if (S) onNet(msg, from); };   // test: wiadomość jakby przyszła od `from`
export const debugOutbox = () => S ? S.sent : [];
export const debugWeather = () => S ? { state: S.wx.state, rain: +S.wx.rain.toFixed(2), fog: +S.wx.fog.toFixed(2), bolts: S.weather.bolts, thunders: S.weather.thunders, mesh: S.weather.mesh.visible, n: S.weather.n, radio: S.radioText ? S.radioText.t : null } : null;
export const debugWx = (state, flash) => { if (!S) return; if (state) { S.wx.state = state; S.wx.hold = 1e6; } if (flash) { S.wx.flash = WX.WX.FLASH; S.weather.pending.push(0.1); S.weather.bolts++; } };
function hostExtra(g, kind, rq) {
    if (kind === 'drive') { if (rq.route === 'drive') hostFree(g.id, rq.car, g.head); else hostDrive(g.id, rq.car, rq.route, g.head); return; }
    if (kind === 'dismount') { S.fleet = VL.endDriveBy(S.fleet, g.id); S.vehs.releaseDriver(g.id); return; }
    if (kind === 'deliver') { modeDeliver(g.id, S.bags.filter(b => b.holder === g.id).length); return; }
    const near = (pts, r) => pts.some(q => Math.hypot(g.head.x - q.x, g.head.z - q.z) < r), id = g.id, bank = S.buildings.find(b => b.name === 'bank'), ps = X.powerSpot();
    if (kind === 'spray' && near(X.SPRAY.SPOTS, X.SPRAY.R + 3) && (S.sprayAt[id] || 0) <= S.clock) { S.sprayAt[id] = S.clock + 60; S.sim.heats[id] = { v: 0, seenT: 99 }; }
    else if (kind === 'alarm' && bank && near([{ x: (bank.x0 + bank.x1) / 2, z: (bank.z0 + bank.z1) / 2 }], 20) && (S.alarmAt[id] || 0) <= S.clock) { S.alarmAt[id] = S.clock + 5; S.sim.addHeat(id, X.GVAULT.HEAT); }
    else if (kind === 'dis' && near(C.SAFEHOUSES, X.DISGUISE.R + 3)) { S.disUntil[id] = S.clock + X.DISGUISE.FOR; }
    else if (kind === 'power' && near([ps], 4) && S.powerLeft <= 0 && S.powerCd <= S.clock) { S.powerCd = S.clock + X.POWER.COOLDOWN + X.POWER.DARK_FOR; powerZone(X.POWER.DARK_FOR); S.powerOn = true; applyLights(); }
}
export const debugMode = () => S ? { gm: S.gm, ids: modeIds(), myRole: roleOf('me') } : null;
export const debugModeSet = (m, start) => { if (!S) return; setMode(m); if (start) toggleRound(); };
export const debugDismount = () => { if (S) dismountMe(); };
export const debugVeh = () => S ? { fleet: S.fleet, v: S.vehs.debug(), carCount: S.carCount } : null;
export const debugDriveInput = (gas, brake, steer) => { if (S) S.dbgIn = gas === null ? null : { gas, brake, steer }; };   // tylko testy: wejście jazdy zamiast VR i klawiszy
export const debugStartFree = (carId, who) => S ? hostFree(who || 'me', carId, who && who !== 'me' ? null : (camera.getWorldPosition(_p), { x: _p.x, z: _p.z })) : false;
export const debugCarTo = (x, z, yaw) => !!S && S.vehs.teleport(x, z, yaw);
export const debugCarIdle = (id, t) => { if (S) S.vehs.testIdle(id, t); };
export const debugDriveExit = (on) => { if (S) S.dbgExit = !!on; };
export const debugDrive = () => S && S.vehs ? S.vehs.debug() : null;
export const debugDriveWorld = () => S ? driveWorld() : null;
export const debugAddPed = (x, z) => !!S && S.life.add(x, z);   // tylko dla testów: stojący przechodzień w znanym miejscu
export const debugCopMarks = () => S ? S.cmark.debug() : null;
export const debugCorpses = () => S ? Object.assign(S.corp.debug(), { hit: S.hitMark.text, hitT: S.hitMark.t }) : null;   // dla testów
export const debugCorpseAt = (id, x, z, kind, yaw) => { if (S) S.corp.spawn(id, x, z, { kind: kind || 'player', yaw: yaw || 0 }); };
export const debugContract = (ev) => { if (!S) return null; contractTick(0.1, 0, ev || undefined); const g = getGta(); return { picks: CTm.todayContracts(dailyDate()), done: g.contracts.done.slice(), date: g.contracts.date, run: S.ctr.run, info: CTm.contractInfo(g, dailyDate()) }; };
export const debugRequestDrive = (car, idx) => { if (S) requestDrive(car, idx); };
export const debugBlocks = (nodes) => { if (!S) return null; if (Array.isArray(nodes)) S.blocks = { nodes: BL.cleanBlocks(nodes), quiet: 0 }; return { nodes: S.blocks.nodes, quiet: S.blocks.quiet, fx: S.rbfx.debug() }; };
export const debugDriveAs = (who, car, route, head) => { if (S) hostDrive(who, car, route, head); };
export const debugBoxes = () => S ? S.boxes.length : 0;
export const debugBuildings = () => S ? S.buildings.map(b => ({ id: b.id, interior: b.interior || '', hollow: !!b.hollow, x0: b.x0, x1: b.x1, z0: b.z0, z1: b.z1, door: b.hollow ? b.hollow.door : '' })) : [];
export const debugGta = () => S ? Object.assign(S.gx.debug(), { night: S.nightPh, powerLeft: S.powerLeft, sight: S.sim.sightMul, extra: S.sim.extraCops, lamps: S.lampMesh ? S.lampMesh.visible : null, neonOn: S.neonMeshes.filter(n => n.m.visible).length, neonAll: S.neonMeshes.length, lightI: S.nlights.map(n => +n.l.intensity.toFixed(1)), dark: S.sim.darkZones.length, hear: S.sim.hearMul }) : null;
export const debugGtaTouch = (fn) => import('../core/gtaprops.js').then(m => m.debugTouchProbe(fn));
export const debugGtaNight = (ph, left) => { if (S) { S.night = { ph: ph, left: left || 99 }; setNight(ph, false); } };   // left: czas fazy (testy dają 1e9, żeby noc nie wchodziła w drogę)
export const debugBillboards = () => S && S.bb ? S.bb.debug() : null;
export const debugLife = () => S && S.life ? Object.assign(S.life.debug(), { esc: +S.esc.toFixed(3), fog: +DREAD.fogMul.toFixed(3), dj: S.dj ? S.dj.t : null }) : null;
export const debugLifeStep = (n, dt, c) => { if (!S || !S.life) return null; for (let i = 0; i < n; i++) S.life.update(dt, c); return S.life.debug(); };   // test: krokuje żywe miasto z podanym wejściem (x, y, z, dx, dz)
export const debugLifeSeed = (n) => { if (S && S.life) S.life.seed(n); };
export const debugDj = (night, stars, busy) => { if (!S) return null; const r = DJM.djStep(Object.assign({}, S.dj, { t: 0 }), 0.1, { night: night || 'calm', storm: false, stars: stars || 0, caseOn: false, busy: !!busy, nick: 'test' }); return r.line; };
export const debugCops = () => S && S.sim ? Object.assign(S.sim.lodInfo(), { active: S.sim.activeCops().length, modes: S.sim.cops.map(c => c.show) }) : null;   // test i diagnostyka: ilu policjantów ma pełny model, sylwetkę i ile wywołań rysowania to kosztuje
export const debugStunts = () => S && S.stunts ? S.stunts.debug() : null;
export const debugStuntSpots = () => S && S.stunts ? S.stunts.spots : null;
export const debugStuntStep = (n, dt, c) => { if (!S || !S.stunts) return null; for (let i = 0; i < n; i++) S.stunts.update(dt, c); return S.stunts.debug(); };   // test: krokuje detektor lotu z podanym wejściem (x, y, z, grounded)
export const debugMystery = () => S && S.mystery ? S.mystery.debug() : null;
export const debugMysterySpots = () => S && S.mystery ? S.mystery.spots : null;
export const debugMysteryStep = (n, dt, c) => { if (!S || !S.mystery) return null; for (let i = 0; i < n; i++) S.mystery.update(dt, c); return S.mystery.debug(); };   // test: krokuje tajemnicę (x, y, z, dx, dz)
export const debugMysteryPress = (booth, k) => { if (S && S.mystery) S.mystery.press(booth, k); };
export const debugEnc = () => S && S.enc ? S.enc.debug() : null;
export const debugEncSpots = () => S && S.enc ? S.enc.spots : null;
export const debugEncStep = (n, dt, c) => { if (!S || !S.enc) return null; for (let i = 0; i < n; i++) S.enc.update(dt, c); return S.enc.debug(); };   // test: krokuje spotkania (x, y, z, dx, dy, dz)
export const debugEncForce = (kind, spot) => { if (S && S.enc) S.enc.force(kind, spot); };
export const debugEggs = () => S && S.eggs ? S.eggs.debug() : null;
export const debugEggSpots = () => S && S.eggs ? S.eggs.spots : null;
export const debugEggStep = (n, dt, c) => { if (!S || !S.eggs) return null; for (let i = 0; i < n; i++) S.eggs.update(dt, c); return S.eggs.debug(); };   // test: krokuje jajka deterministycznie z podanym wejściem (x, y, z, speed, dx, dy, dz, mic, stars, ride, night)
export const debugGtaKey = (k) => { if (S && S.gx && S.gx.press) S.gx.press(k); };
export const debugHeli = () => S ? { mode: S.heli.mode, y: +S.heli.y.toFixed(1), x: +S.heli.x.toFixed(1), z: +S.heli.z.toFixed(1), eye: S.eyeOnMe, vis: S.heliV.root.visible, lx: +S.heli.lx.toFixed(1), lz: +S.heli.lz.toFixed(1) } : null;
export const debugGun = () => S ? { hp: S.gunS.me.hp, ammo: S.gunS.me.ammo, mode: S.mode, shooters: Object.keys(S.gunS), feed: S.feed.map(f => f.s), hurt: S.hurtT } : null;
export const debugShoot = (id, o, d) => { if (S) hostShot(id, { o, d }, false); };   // test: strzał jakby oddał go gracz `id` (host sprawdza jak dla prawdziwego)
export function debugRide(i) { if (S) S.forceRail = i; }
export function debugSpawnCop(x, z) { if (!S) return false; const c = S.sim.cops.find(q => !q.active); if (!c) return false; S.sim.spawnCop(c, AI2.nearestNode(S.sim.graph, x, z)); c.bot.x = x; c.bot.z = z; return true; }
export function debugTakeBag(id) { const b = S && S.bags.find(q => q.id === id && !q.got); if (!b) return false; giveBag(b, 'me'); return true; }
export function dispose() {
    N.onLevelMsg(null); L.onTrigger = null;
    if (S && S.heliV) S.heliV.dispose();
    if (S && S.weather) S.weather.dispose();
    if (S && S.bb) S.bb.dispose();
    if (S && S.life) S.life.dispose();
    if (S && S.rbfx) S.rbfx.dispose();
    if (S && S.cmark) S.cmark.dispose();
    if (S && S.corp) S.corp.dispose();
    N.clearDeadAvatars();
    if (S && S.stunts) S.stunts.dispose();
    if (S && S.mystery) S.mystery.dispose();
    if (S && S.enc) S.enc.dispose();
    if (S && S.eggs) S.eggs.dispose();
    if (S && S.gx) S.gx.dispose();
    if (S && S.vehs) S.vehs.dispose();
    if (S && S.mterm) { const i = terminals.indexOf(S.mterm); if (i >= 0) terminals.splice(i, 1); S.mterm.tex.dispose(); }
    if (S && S.gunMesh) { S.gunMesh.g.removeFromParent(); for (const g of S.gunMesh.geos) g.dispose(); for (const m of S.gunMesh.mats) m.dispose(); }
    if (S) for (const f of S.fx) { f.l.geometry.dispose(); f.l.material.dispose(); }
    if (S) { S.sim.dispose(); S.scare.dispose(); S.hud.dispose(); for (const g of S.geos) g.dispose(); for (const m of S.mats) m.dispose(); for (const x of S.texs) x.dispose(); }
    S = null;
}
export const debugCorpseStep = (dt, n) => { if (S) for (let i = 0; i < (n || 1); i++) S.corp.update(dt); };
