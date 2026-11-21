// ==========================================
// KĄCIK GIER W LOBBY (oprawa 3D, wykrywanie punktów u hosta, tablica wyników); reguły są w czystym core/minigames.js (testy: tests/modes/lobby.mjs).
// Przy zachodniej ścianie, na południe od tablicy dnia: obręcz do rzutów (kosz), wielka tarcza i tablica wyników, a obok trzy dodatkowe piłki-gałki.
// Piłki są zwykłymi throwables (host liczy ich fizykę, goście widzą jego stan), więc punkty liczy host albo gracz solo z pozycji piłek (nikt nie zgłasza wyniku).
// Liczniki idą do gości w wiadomości lobby (lobbyplay.js: lobbyGamesNet / acceptLobbyGames), odbiorca przyjmuje je przez cleanMinigames. Bez nagród.
// ==========================================
import { THREE, CANNON, L, tex, addBody, addStaticBody, physicsMat, GROUP } from './engine.js';
import * as T from './textures.js';
import * as SFX from './audio.js';
import { toast } from './terminal.js';
import { HOOP, TARGET, BALL_COOLDOWN, hoopScored, targetPoints, addHoop, addTarget, newMinigames, netMinigames, cleanMinigames } from './minigames.js';

let G = null;
const BOARD = { x: -14.88, y: 5.6, z: 9.6 };   // tablica wyników nad kącikiem

export function buildLobbyGames() {
    G = { st: newMinigames(), clock: 0, sig: '', flash: 0, bigFlash: 0 };
    const root = L.root, mat = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.6 }, o || {}));
    // Kosz: przezroczysta tablica z czerwonym kwadratem, obręcz, siatka i wspornik (tablica jest bryłą: piłki się od niej odbijają)
    const bx = -14.85, board = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.1, 1.8), new THREE.MeshStandardMaterial({ color: 0xe8eef4, transparent: true, opacity: 0.55, roughness: 0.15, metalness: 0.1 }));
    board.position.set(bx, HOOP.Y + 0.35, HOOP.Z); board.castShadow = true; root.add(board);
    addStaticBody(bx, HOOP.Y + 0.35, HOOP.Z, new CANNON.Box(new CANNON.Vec3(0.03, 0.55, 0.9)), board, false);
    const sq = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.4, 0.6), new THREE.MeshBasicMaterial({ color: 0xff4a2a })); sq.position.set(bx + 0.035, HOOP.Y + 0.15, HOOP.Z); root.add(sq);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(HOOP.R, 0.02, 8, 28), mat(0xff6a1a, { metalness: 0.6, roughness: 0.35, emissive: 0x401000 })); rim.rotation.x = Math.PI / 2; rim.position.set(HOOP.X, HOOP.Y, HOOP.Z); root.add(rim);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(HOOP.X - bx, 0.04, 0.05), mat(0x3a3a40, { metalness: 0.7 })); arm.position.set((HOOP.X + bx) / 2, HOOP.Y, HOOP.Z); root.add(arm);
    for (let i = 0; i < 12; i++) {   // siatka: cienkie, zwężające się linie
        const a = i / 12 * Math.PI * 2, top = new THREE.Vector3(HOOP.X + Math.cos(a) * HOOP.R, HOOP.Y, HOOP.Z + Math.sin(a) * HOOP.R), bot = new THREE.Vector3(HOOP.X + Math.cos(a) * HOOP.R * 0.55, HOOP.Y - 0.4, HOOP.Z + Math.sin(a) * HOOP.R * 0.55);
        const len = top.distanceTo(bot), ln = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, len, 3), mat(0xf0f0f0, { roughness: 0.9 }));
        ln.position.copy(top).add(bot).multiplyScalar(0.5); ln.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), bot.clone().sub(top).normalize()); root.add(ln);
    }
    // Tarcza: koncentryczne pierścienie na ścianie (płaskie, patrzą na wschód)
    const tg = new THREE.Group(); tg.position.set(TARGET.X + 0.02, TARGET.Y, TARGET.Z); tg.rotation.y = Math.PI / 2; root.add(tg);
    const radii = [TARGET.R, 0.38, 0.22, 0.09];
    radii.forEach((r, i) => { const d = new THREE.Mesh(new THREE.CircleGeometry(r, 40), new THREE.MeshStandardMaterial({ color: [0x1a1a1a, 0xe8e0d0, 0x2a6ac8, 0xe03030][i], roughness: 0.7, polygonOffset: true, polygonOffsetFactor: -(i + 1), polygonOffsetUnits: -(i + 1) })); tg.add(d); });
    const ring = new THREE.Mesh(new THREE.RingGeometry(TARGET.R, TARGET.R + 0.05, 40), mat(0xc8a040, { metalness: 0.6 })); tg.add(ring);
    // Linia rzutu na podłodze i tablica wyników
    const line = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 3.2), new THREE.MeshBasicMaterial({ color: 0xffd060, transparent: true, opacity: 0.6 })); line.rotation.x = -Math.PI / 2; line.position.set(-10, 0.02, 9.6); root.add(line);
    const cv = T.makeCanvas(1024, 512); G.cv = cv; G.cx = cv.getContext('2d'); G.tx = T.toTex(cv, false);
    const pn = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 1.8), new THREE.MeshBasicMaterial({ map: G.tx, transparent: true, toneMapped: false })); pn.position.set(BOARD.x, BOARD.y, BOARD.z); pn.rotation.y = Math.PI / 2; root.add(pn);
    const l = new THREE.PointLight(0xffc880, 6, 9, 2); l.position.set(-12.5, 3.4, 9.6); root.add(l); G.light = l;
    L.reserved.push([-12.4, 9.6, 3.2]);
    // Dodatkowe piłki (te same, co w lobby: gałki oczne); id są stałe, więc u gości powstają te same obiekty
    [[-9, 1, 8.4], [-9, 1, 9.6], [-9, 1, 10.8]].forEach(([x, y, z], i) => {
        const m = new THREE.Mesh(new THREE.SphereGeometry(0.2, 24, 24), new THREE.MeshPhysicalMaterial({ map: tex.eye, emissive: 0x330000, roughness: 0.1, metalness: 0.1, clearcoat: 1.0 })); m.castShadow = true; root.add(m);
        const body = addBody(new CANNON.Body({ mass: 1, shape: new CANNON.Sphere(0.2), position: new CANNON.Vec3(x, y, z), material: physicsMat, linearDamping: 0.05, collisionFilterGroup: GROUP.BALL, collisionFilterMask: GROUP.ENV | GROUP.BALL | GROUP.ROPE }));
        m.userData = { id: 'mgball' + (i + 1), body: body }; L.throwables.push(m);
    });
    drawBoard();
}
export function disposeLobbyGames() { G = null; }

// Stan do wiadomości lobby i przyjęcie go u gościa (z odgłosem, gdy licznik koszy wzrósł)
export const lobbyGamesNet = () => G ? netMinigames(G.st) : null;
export function acceptLobbyGames(a) {
    const s = G && cleanMinigames(a); if (!s) return;
    if (s.hoops > G.st.hoops) { G.flash = 1.2; SFX.bell && SFX.bell(); toast('Basket! Streak ' + s.streak, '#ffd27a'); }
    if (s.target > G.st.target && s.lastTarget > 0) { G.bigFlash = 1.0; toast('Target hit: +' + s.lastTarget, s.lastTarget >= 50 ? '#ff6a4a' : '#ffd27a'); }
    G.st = s;
}
export const lobbyGamesState = () => G ? { ...G.st } : null;   // dla testów w przeglądarce

// Co klatkę: host (albo solo) liczy punkty z pozycji piłek; wszyscy odświeżają tablicę
export function updateLobbyGames(dt, auth) {
    if (!G) return;
    G.clock += dt; G.flash = Math.max(0, G.flash - dt); G.bigFlash = Math.max(0, G.bigFlash - dt);
    if (auth) for (const ball of L.throwables) {
        const b = ball.userData.body; if (!b) continue;
        const cur = { x: b.position.x, y: b.position.y, z: b.position.z }, u = ball.userData, prev = u.mgPrev; u.mgPrev = cur;
        if (!prev) continue;
        if (hoopScored(prev, cur)) { G.st = addHoop(G.st, G.clock); G.flash = 1.2; SFX.bell && SFX.bell(); toast('Basket! Streak ' + G.st.streak, '#ffd27a'); }
        if ((u.mgCool || 0) > G.clock) continue;
        const pts = targetPoints(prev, cur);
        if (pts > 0) { u.mgCool = G.clock + BALL_COOLDOWN; G.st = addTarget(G.st, pts); G.bigFlash = 1.0; toast('Target hit: +' + pts, pts >= 50 ? '#ff6a4a' : '#ffd27a'); }
    }
    if (G.light) G.light.intensity = 5 + (G.flash > 0 || G.bigFlash > 0 ? 6 : 0) + Math.sin(G.clock * 3) * 0.4;
    drawBoard();
}
function drawBoard() {
    const s = G.st, sig = netMinigames(s).join(',') + ':' + (G.flash > 0 ? 1 : 0) + (G.bigFlash > 0 ? 1 : 0); if (sig === G.sig) return; G.sig = sig;
    const x = G.cx; x.clearRect(0, 0, 1024, 512); x.fillStyle = 'rgba(10,6,14,0.86)'; x.fillRect(0, 0, 1024, 512); x.strokeStyle = G.flash > 0 || G.bigFlash > 0 ? '#ffffff' : '#ffb347'; x.lineWidth = 8; x.strokeRect(6, 6, 1012, 500);
    x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = '#ffd27a'; x.font = 'bold 70px serif'; x.fillText('LOBBY ARCADE', 512, 58);
    x.font = 'bold 44px sans-serif'; x.fillStyle = '#e8e0d0'; x.fillText('HOOPS', 270, 150); x.fillText('TARGET', 760, 150);
    x.font = 'bold 150px sans-serif'; x.fillStyle = G.flash > 0 ? '#ffffff' : '#ff8a4a'; x.fillText(String(s.hoops), 270, 270); x.fillStyle = G.bigFlash > 0 ? '#ffffff' : '#6ad0ff'; x.fillText(String(s.target), 760, 270);
    x.font = '34px sans-serif'; x.fillStyle = '#c8c0b0'; x.fillText('streak ' + s.streak + '   best ' + s.bestStreak, 270, 370); x.fillText('last ' + s.lastTarget + '   best ' + s.bestTarget, 760, 370);
    x.font = '28px sans-serif'; x.fillStyle = '#9a9080'; x.fillText('Throw the eyeballs: through the hoop = 1, bullseye = 50', 512, 450);
    G.tx.needsUpdate = true;
}
