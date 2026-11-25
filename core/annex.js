// ==========================================
// ANEKS LOBBY (oprawa 3D i zapis; układ w czystym core/annexlayout.js, stoper w core/climblogic.js; testy: tests/logic.mjs i tests/annex.mjs).
// Druga hala 30 x 30 m za tunelem w południowej ścianie lobby: powłoka (podłoga, ściany, sufit), światła (wpięte w listę migotania lobby, więc Nocna Zmiana
// je przyciemnia) i aktywności. Tunel w ścianie wycina levels/lobby.js; tu stoi to, co jest za nim. Wszystko LOKALNE (nic nie idzie przez sieć), bez Bagabucksów.
// Climb Rush: tor wspinaczkowy po ścianie wschodniej, stoper od dotknięcia pierwszego uchwytu do dzwonu, rekord w SAVE.annex.climbBest.
// ==========================================
import { THREE, CANNON, L, tex, addCrispBlock, addStaticBody } from './engine.js';
import { LP } from './config.js';
import * as T from './textures.js';
import { toast } from './terminal.js';
import { SAVE, saveGame } from './economy.js';
import { hands } from './player.js';
import * as SFX from './audio.js';
import * as A from './annexlayout.js';
import * as C from './climblogic.js';

let G = null;
const _w = new THREE.Vector3();
export function getAnnex() { const st = C.normalizeAnnex(SAVE.annex); SAVE.annex = st; return st; }

// Powłoka: wołana z levels/lobby.js przy budowie (przed dekoracjami, żeby bloki trafiły do L.obstacles)
export function buildAnnexShell() {
    const w = LP.wallTint, cz = (A.ANNEX.z0 + 55) / 2, len = 55 - A.ANNEX.z0;
    addCrispBlock(0, -2.5, cz, 40, 5, len, LP.floorTint, 0x440000, tex.floor, { rough: tex.floorRough, physical: true });
    addCrispBlock(0, 22.5, cz, 40, 5, len, w, 0x440000);
    addCrispBlock(-17.5, 10, cz, 5, 20, len, w, 0x550000);
    addCrispBlock(17.5, 10, cz, 5, 20, len, w, 0x550000);
    // Daleka ściana z wnęką na pokój w ścianie (A.WALL_ROOM): bloki po bokach, nad wnęką i za nią; panel od strony aneksu stawia core/annexroom.js
    const R = A.WALL_ROOM, T0 = R.z0, T1 = 55;
    addCrispBlock((-20 + R.x0) / 2, 10, (T0 + T1) / 2, R.x0 + 20, 20, T1 - T0, w, 0x550000);
    addCrispBlock((R.x1 + 20) / 2, 10, (T0 + T1) / 2, 20 - R.x1, 20, T1 - T0, w, 0x550000);
    addCrispBlock((R.x0 + R.x1) / 2, (R.h + 20) / 2, (T0 + T1) / 2, R.x1 - R.x0, 20 - R.h, T1 - T0, w, 0x550000);
    addCrispBlock((R.x0 + R.x1) / 2, R.h / 2, (R.z1 + T1) / 2, R.x1 - R.x0, R.h, T1 - R.z1, w, 0x550000);
}

export function buildAnnex(flickers) {
    const root = L.root;
    G = { geos: [], mats: [], texs: [], clock: 0, st: C.newClimb(), force: null, redraw: 0, sig: '' };
    const geo = (g) => { G.geos.push(g); return g; }, mat = (m) => { G.mats.push(m); return m; };
    // Światła aneksu i tunelu (te same dwa tryby co w lobby: subtle = żarówki)
    for (const f of A.LIGHTS.concat([[-1, 3.9, 17.5, 0xffa860, 7, 7]])) {
        const l = new THREE.PointLight(f[3], f[4], f[5], 2); l.position.set(f[0], f[1], f[2]); root.add(l);
        flickers.push({ l: l, base: f[4], ph: Math.random() * 100, subtle: true });
    }
    // Żarówki na kablach (wygląd; światła są powyżej)
    const bulbG = geo(new THREE.SphereGeometry(0.07, 12, 8)), bulbM = mat(new THREE.MeshBasicMaterial({ color: 0xffb060 })), cordG = geo(new THREE.CylinderGeometry(0.006, 0.006, 1, 5)), cordM = mat(new THREE.MeshStandardMaterial({ color: 0x111111 }));
    for (const f of A.LIGHTS) {
        const b = new THREE.Mesh(bulbG, bulbM); b.position.set(f[0], f[1] - 0.05, f[2]); root.add(b);
        const len = 19.95 - f[1], c = new THREE.Mesh(cordG, cordM); c.scale.y = len; c.position.set(f[0], f[1] + len / 2, f[2]); root.add(c);
    }
    // --- Climb Rush ---
    const holds = A.climbHolds(), red = mat(new THREE.MeshStandardMaterial({ color: 0xc01010, emissive: 0xff1a0a, emissiveIntensity: 0.5, roughness: 0.4 }));
    const hG = geo(new THREE.BoxGeometry(0.8, 0.25, 0.9));
    G.holds = holds.map((p, i) => {
        const m = new THREE.Mesh(hG, i === 0 ? mat(new THREE.MeshStandardMaterial({ color: 0x20c040, emissive: 0x20c040, emissiveIntensity: 0.8, roughness: 0.4 })) : red); m.position.set(p[0], p[1], p[2]); m.castShadow = true; root.add(m);
        addStaticBody(p[0], p[1], p[2], new CANNON.Box(new CANNON.Vec3(0.4, 0.125, 0.45)), m, false);
        return p;
    });
    const bp = A.climbBell(), gold = mat(new THREE.MeshStandardMaterial({ color: 0xe0b030, emissive: 0x805010, emissiveIntensity: 0.9, metalness: 0.8, roughness: 0.3 }));
    const bell = new THREE.Mesh(geo(new THREE.ConeGeometry(0.28, 0.4, 14, 1, true)), gold); bell.material.side = THREE.DoubleSide; bell.position.set(bp[0], bp[1], bp[2]); root.add(bell); G.bell = bell;
    const clap = new THREE.Mesh(geo(new THREE.SphereGeometry(0.07, 10, 8)), gold); clap.position.set(bp[0], bp[1] - 0.2, bp[2]); root.add(clap);
    const post = new THREE.Mesh(geo(new THREE.BoxGeometry(0.06, 0.5, 0.06)), gold); post.position.set(bp[0] + 0.3, bp[1] + 0.05, bp[2]); root.add(post);
    const mp = A.climbMat(), pad = new THREE.Mesh(geo(new THREE.PlaneGeometry(1.8, 1.4)), mat(new THREE.MeshBasicMaterial({ color: 0x20c040, transparent: true, opacity: 0.35, depthWrite: false })));
    pad.rotation.x = -Math.PI / 2; pad.position.set(mp[0], mp[1], mp[2]); root.add(pad);
    // Tablica z czasem na ścianie wschodniej przy starcie
    G.cv = T.makeCanvas(768, 384); G.cx = G.cv.getContext('2d'); G.tx = T.toTex(G.cv, false); G.texs.push(G.tx);
    const board = new THREE.Mesh(geo(new THREE.PlaneGeometry(2.8, 1.4)), mat(new THREE.MeshBasicMaterial({ map: G.tx, toneMapped: false })));
    board.position.set(14.93, 3.0, 22.5); board.rotation.y = -Math.PI / 2; root.add(board);
    const bl = new THREE.PointLight(0xffc880, 5, 7, 2); bl.position.set(13.4, 3.2, 22.5); root.add(bl); G.bl = bl;
    L.reserved.push([14, 22.5, 2.5], [13.4, 25, 2.2]);
    draw();
}

function draw() {
    const x = G.cx, st = G.st, best = getAnnex().climbBest;
    x.fillStyle = '#120a06'; x.fillRect(0, 0, 768, 384); x.strokeStyle = '#c8a040'; x.lineWidth = 6; x.strokeRect(5, 5, 758, 374);
    x.textAlign = 'center'; x.fillStyle = '#ffd27a'; x.font = 'bold 56px "Courier New", monospace'; x.fillText('CLIMB RUSH', 384, 78);
    x.font = 'bold 120px "Courier New", monospace'; x.fillStyle = st.ph === 'run' ? '#ff6a40' : (st.ph === 'done' ? '#7fff90' : '#6a5a40');
    x.fillText(st.ph === 'idle' ? '0.00' : C.formatTime(st.ph === 'run' ? st.t : st.last), 384, 200);
    x.font = '30px "Courier New", monospace'; x.fillStyle = '#d8c8b0';
    x.fillText(st.ph === 'idle' ? 'Touch the green hold to start. Ring the bell!' : (st.ph === 'run' ? 'Climb to the bell...' : (st.last <= best ? 'NEW RECORD!' : 'Bell rung!')), 384, 262);
    x.fillStyle = '#ffd27a'; x.font = 'bold 36px "Courier New", monospace'; x.fillText('Best: ' + (best ? C.formatTime(best) + ' s' : '--'), 384, 330);
    G.tx.needsUpdate = true;
}

function near(p, r) {
    for (const h of [hands.L, hands.R]) { if (!h) continue; h.getWorldPosition(_w); if (Math.hypot(_w.x - p[0], _w.y - p[1], _w.z - p[2]) < r) return true; }
    return false;
}

export function updateAnnex(dt, t) {
    if (!G) return; G.clock += dt;
    const f = G.force, start = f ? !!f.start : near(G.holds[0], A.CLIMB.TOUCH), end = f ? !!f.end : near(A.climbBell(), A.CLIMB.TOUCH + 0.1);
    G.force = null;
    const best = getAnnex().climbBest, r = C.climbStep(G.st, start, end, dt, best); G.st = r.st;
    if (r.event === 'start' || r.event === 'restart') { SFX.beep && SFX.beep(1200, 0.08, 0.08); if (r.event === 'restart') toast('Climb Rush: restart', '#ffb030'); }
    if (r.event === 'finish' || r.event === 'record') {
        SFX.bell && SFX.bell(); G.bell.rotation.z = 0.6;
        if (r.event === 'record') { SAVE.annex = Object.assign({}, getAnnex(), { climbBest: Math.round(G.st.last * 100) / 100 }); saveGame(); toast('New Climb Rush record: ' + C.formatTime(G.st.last) + ' s', '#ffd27a'); }
        else toast('Climb Rush: ' + C.formatTime(G.st.last) + ' s (best ' + C.formatTime(best) + ')', '#7fff90');
    }
    if (r.event === 'timeout') toast('Climb Rush: time is up', '#ffb030');
    G.bell.rotation.z *= Math.max(0, 1 - dt * 2.5); if (Math.abs(G.bell.rotation.z) > 0.01) G.bell.rotation.z += Math.sin(G.clock * 18) * 0.02;
    G.redraw -= dt; const sig = G.st.ph + ':' + Math.floor(G.st.t * 10) + ':' + best + ':' + Math.floor(G.st.shown);
    if (sig !== G.sig && (G.redraw <= 0 || G.st.ph !== 'run')) { G.sig = sig; G.redraw = 0.1; draw(); }
}
export function disposeAnnex() { if (!G) return; for (const g of G.geos) g.dispose(); for (const m of G.mats) m.dispose(); for (const x of G.texs) x.dispose(); G = null; }
export const debugAnnex = () => G ? { holds: G.holds.length, ph: G.st.ph, t: G.st.t, last: G.st.last, best: getAnnex().climbBest } : null;   // dla testów
export function debugClimbTouch(kind) { if (G) G.force = kind === 'start' ? { start: true } : { end: true }; }
