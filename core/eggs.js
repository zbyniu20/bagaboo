// ==========================================
// EASTER EGGI W LOBBY (oprawa 3D i zapis; reguły i detektory w czystym core/egglogic.js, testy: tests/logic.mjs i tests/lobbyextras.mjs).
// Siedem ukrytych jajek: gumowa kaczka na skrzyniach, trzykrotne pukanie w kredowe drzwi, patrzenie w niebo, wpatrywanie się w lustro,
// martwa dłoń spod skrzyń, drzwiczki myszki i krzyk do mikrofonu. Każde płaci raz (EGG_BONES), komplet daje bonus. Stan w SAVE.eggs (zawsze przez normalizeEggs).
// Wszystko lokalne: nic nie idzie przez sieć. Moduł nie importuje nightchest.js (panel skrzyni czyta getEggs stąd).
// ==========================================
import { THREE, L, camera } from './engine.js';
import * as T from './textures.js';
import { toast } from './terminal.js';
import { SAVE, saveGame, addBones } from './economy.js';
import { hands } from './player.js';
import * as SFX from './audio.js';
import * as E from './egglogic.js';

let G = null;
const _w = new THREE.Vector3(), _d = new THREE.Vector3(), _c = new THREE.Vector3(), MIRROR = [-14.9, 1.5, 3.2];
export function getEggs() { const st = E.normalizeEggs(SAVE.eggs); SAVE.eggs = st; return st; }

// Znalezienie jajka (też dla testów): zapis, nagroda, komunikat. Zwraca wynik z egglogic albo null
export function findEgg(id) {
    const r = E.findEgg(getEggs(), id); if (!r.isNew) return null;
    SAVE.eggs = r.state; addBones(r.bones, 'Easter egg');
    toast('Easter egg ' + E.foundCount(r.state) + '/' + E.EGGS.length + ': ' + E.eggById(id).name, '#ffd27a'); SFX.bell && SFX.bell();
    if (r.all) setTimeout(() => toast('Lobby legend! Every egg found: +' + E.ALL_BONUS + ' Bagabucks', '#7fff90'), 2400);
    saveGame();
    return r;
}

function chalkTexture() {
    const c = T.makeCanvas(128, 256), x = c.getContext('2d'); x.clearRect(0, 0, 128, 256);
    x.strokeStyle = 'rgba(235,235,225,0.85)'; x.lineWidth = 6; x.lineCap = 'round'; x.lineJoin = 'round';
    x.beginPath(); x.moveTo(14, 250); x.lineTo(14, 70); x.quadraticCurveTo(64, 0, 114, 70); x.lineTo(114, 250); x.stroke();
    x.beginPath(); x.arc(92, 160, 6, 0, 7); x.stroke();
    x.font = 'bold 18px "Courier New", monospace'; x.fillStyle = 'rgba(235,235,225,0.8)'; x.textAlign = 'center'; x.fillText('knock', 64, 120);
    return T.toTex(c, false);
}

export function buildEggs() {
    const root = L.root;
    G = { geos: [], mats: [], texs: [], d: { knock: E.newDetector(), stars: E.newDetector(), mirror: E.newDetector(), shout: E.newDetector() }, clock: 0, prev: null, sq: 0, shoot: null, jerk: 0, mouseOpen: 0, touchT: 0, mknock: E.newDetector() };
    const geo = (g) => { G.geos.push(g); return g; }, mat = (o) => { const m = new THREE.MeshStandardMaterial(o); G.mats.push(m); return m; };
    // 1) Kaczka: złoty korpus, głowa, dziób
    const yellow = mat({ color: 0xffd020, roughness: 0.5 }), orange = mat({ color: 0xff8010, roughness: 0.6 }), blk = new THREE.MeshBasicMaterial({ color: 0x080808 }); G.mats.push(blk);
    const duck = new THREE.Group(), p = E.eggById('duck').pos; duck.position.set(p[0], p[1] + 0.01, p[2]); duck.rotation.y = 0.6; root.add(duck);
    const body = new THREE.Mesh(geo(new THREE.SphereGeometry(0.11, 12, 9)), yellow); body.scale.set(1, 0.8, 1.2); duck.add(body);
    const head = new THREE.Mesh(geo(new THREE.SphereGeometry(0.07, 12, 9)), yellow); head.position.set(0, 0.11, 0.07); duck.add(head);
    const beak = new THREE.Mesh(geo(new THREE.BoxGeometry(0.06, 0.02, 0.05)), orange); beak.position.set(0, 0.105, 0.14); duck.add(beak);
    for (const sx of [-1, 1]) { const e = new THREE.Mesh(geo(new THREE.SphereGeometry(0.012, 6, 5)), blk); e.position.set(sx * 0.03, 0.135, 0.12); duck.add(e); }
    G.duck = duck;
    // 2) Kredowe drzwi na północnej ścianie (tylko rysunek, bez kolizji)
    const ct = chalkTexture(); G.texs.push(ct); const k = E.eggById('knock').pos;
    const chalk = new THREE.Mesh(geo(new THREE.PlaneGeometry(0.9, 1.8)), new THREE.MeshBasicMaterial({ map: ct, transparent: true, depthWrite: false })); G.mats.push(chalk.material);
    chalk.position.set(k[0], 0.9, k[2] + 0.04); root.add(chalk);
    // 5) Martwa dłoń wystająca spod skrzyń (kikut przedramienia, dłoń i cztery palce)
    const skin = mat({ color: 0x8a8f78, roughness: 0.9 }), hand = new THREE.Group(), hp = E.eggById('hand').pos; hand.position.set(hp[0], hp[1], hp[2]); hand.rotation.y = Math.PI / 2; root.add(hand);
    const arm = new THREE.Mesh(geo(new THREE.CylinderGeometry(0.035, 0.045, 0.4, 8)), skin); arm.rotation.x = Math.PI / 2; arm.position.z = -0.2; hand.add(arm);
    const palm = new THREE.Mesh(geo(new THREE.BoxGeometry(0.09, 0.03, 0.09)), skin); palm.position.z = 0.14; hand.add(palm);
    const fg = geo(new THREE.CylinderGeometry(0.01, 0.008, 0.07, 5));
    for (let i = 0; i < 4; i++) { const f = new THREE.Mesh(fg, skin); f.rotation.x = Math.PI / 2 - 0.3 + i * 0.05; f.position.set(-0.033 + i * 0.022, 0.0, 0.215); hand.add(f); }
    G.hand = hand;
    // 6) Drzwiczki myszki przy podłodze zachodniej ściany
    const m = E.eggById('mouse').pos, door = new THREE.Group(); door.position.set(m[0] + 0.03, m[1], m[2]); door.rotation.y = Math.PI / 2; root.add(door);
    const frame = new THREE.Mesh(geo(new THREE.BoxGeometry(0.16, 0.22, 0.03)), mat({ color: 0x3a2412, roughness: 0.8 })); door.add(frame);
    const leaf = new THREE.Group(); leaf.position.set(-0.06, 0, 0.02); door.add(leaf);
    const leafM = new THREE.Mesh(geo(new THREE.BoxGeometry(0.12, 0.18, 0.01)), mat({ color: 0x1a0c04, roughness: 0.7 })); leafM.position.x = 0.06; leaf.add(leafM);
    const light = new THREE.Mesh(geo(new THREE.PlaneGeometry(0.1, 0.16)), new THREE.MeshBasicMaterial({ color: 0xffc060 })); G.mats.push(light.material); light.position.set(0, 0, 0.0165); door.add(light);
    G.leaf = leaf;
    // Spadająca gwiazda (jeden sprite, ukryty do czasu)
    const star = new THREE.Mesh(geo(new THREE.PlaneGeometry(1.4, 0.05)), new THREE.MeshBasicMaterial({ color: 0xfff0c0, transparent: true, opacity: 0, depthWrite: false, fog: false })); G.mats.push(star.material); star.visible = false; root.add(star); G.star = star;
}

function nearHand(p, r) {
    for (const h of [hands.L, hands.R]) { if (!h) continue; h.getWorldPosition(_w); if (E.nearPoint([_w.x, _w.y, _w.z], p, r)) return true; }
    return false;
}

export function updateEggs(dt, t, mic) {
    if (!G) return; G.clock += dt;
    const st = getEggs(), now = G.clock; camera.getWorldPosition(_c); camera.getWorldDirection(_d);
    const speed = G.prev ? Math.hypot(_c.x - G.prev.x, _c.z - G.prev.z) / Math.max(dt, 1e-3) : 0; G.prev = { x: _c.x, z: _c.z };
    // Efekty
    G.sq = Math.max(0, G.sq - dt * 3); G.duck.scale.set(1 + G.sq * 0.35, 1 - G.sq * 0.3, 1 + G.sq * 0.35);
    G.jerk = Math.max(0, G.jerk - dt); G.hand.rotation.z = G.jerk > 0 ? Math.sin(G.jerk * 40) * 0.12 : 0;
    G.leaf.rotation.y = -G.mouseOpen * 1.3; G.mouseOpen = Math.max(0, G.mouseOpen - dt * 0.2);
    if (G.shoot) { const s = G.shoot; s.t += dt; G.star.position.set(s.x0 + s.t * 14, 12.5 - s.t * 2.2, s.z0 + s.t * 3); G.star.rotation.set(0, 0, -0.15); G.star.lookAt(_c.x, G.star.position.y, _c.z); G.star.material.opacity = Math.max(0, 1 - s.t / 1.6); if (s.t > 1.6) { G.shoot = null; G.star.visible = false; } }
    // 1) Kaczka
    if (!E.isFound(st, 'duck') && nearHand(E.eggById('duck').pos, 0.2)) { G.sq = 1; SFX.beep && SFX.beep(1700, 0.08, 0.05); setTimeout(() => SFX.beep && SFX.beep(1300, 0.07, 0.05), 90); findEgg('duck'); }
    // 5) Martwa dłoń
    if (!E.isFound(st, 'hand') && nearHand(E.eggById('hand').pos, 0.22)) { G.jerk = 0.6; SFX.bang && SFX.bang({ x: 13, y: 0.2, z: -10.6 }); findEgg('hand'); }
    // 2) Pukanie w kredowe drzwi (3 stuknięcia)
    const k = E.eggById('knock').pos;
    if (!E.isFound(st, 'knock') && E.knockStep(G.d.knock, nearHand([k[0], 1.2, k[2] + 0.1], 0.3), now)) { SFX.whisper && SFX.whisper({ x: k[0], y: 1.2, z: k[2] }); findEgg('knock'); }
    // 6) Drzwiczki myszki: dotknięcie otwiera je i świeci
    if (!E.isFound(st, 'mouse') && nearHand(E.eggById('mouse').pos, 0.18)) { G.mouseOpen = 1; SFX.beep && SFX.beep(2400, 0.05, 0.04); findEgg('mouse'); }
    // 3) Patrzenie w niebo
    if (!E.isFound(st, 'stars') && E.gazeStep(G.d.stars, _d.y, dt)) { G.shoot = { t: 0, x0: _c.x - 7, z0: _c.z - 4 }; G.star.visible = true; SFX.beep && SFX.beep(2600, 0.05, 0.3); findEgg('stars'); }
    // 4) Wpatrywanie się w lustro (nieruchomo, blisko, twarzą do niego)
    if (!E.isFound(st, 'mirror')) {
        const dx = MIRROR[0] - _c.x, dz = MIRROR[2] - _c.z, dist = Math.hypot(dx, dz), facing = dist > 1e-3 ? (_d.x * dx + _d.z * dz) / (dist * Math.max(1e-3, Math.hypot(_d.x, _d.z))) : 0;
        if (E.stillStep(G.d.mirror, speed, facing, dist, dt)) { SFX.whisper && SFX.whisper({ x: _c.x - _d.x * 1.2, y: _c.y, z: _c.z - _d.z * 1.2 }); toast('"Don\'t turn around."', '#ff6a52'); findEgg('mirror'); }
    }
    // 7) Krzyk do mikrofonu
    if (!E.isFound(st, 'shout') && E.shoutStep(G.d.shout, mic || 0, dt)) { SFX.creak && SFX.creak(0.5); toast('The walls heard you.', '#ff6a52'); findEgg('shout'); }
}
export function disposeEggs() { if (!G) return; for (const g of G.geos) g.dispose(); for (const m of G.mats) m.dispose(); for (const x of G.texs) x.dispose(); G = null; }
export const debugEggs = () => G ? { found: getEggs().found.slice(), count: E.foundCount(getEggs()) } : null;   // dla testów
export const debugFindEgg = (id) => !!findEgg(id);
