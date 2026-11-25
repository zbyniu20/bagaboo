// ==========================================
// AKTYWNOŚCI W ANEKSIE LOBBY (oprawa 3D; reguły w czystych core/ouijalogic.js i core/organlogic.js, układ w core/annexlayout.js; testy: tests/logic.mjs i tests/annex.mjs).
// (1) Stół spirytystyczny (strefa ouija): planszetkę prowadzi dłoń nad planszą, litera po sekundzie trafia do napisu, a na pytania duch odpowiada sam.
// (2) Nawiedzone organy (strefa music): dotknięcie klawisza dłonią gra nutę z molowej pentatoniki.
// Wszystko LOKALNE (nic nie idzie przez sieć), bez Bagabucksów i bez zapisu. Światła idą przez listę migotania lobby, więc Nocna Zmiana je przyciemnia.
// ==========================================
import { THREE, CANNON, L, camera, addStaticBody } from './engine.js';
import * as T from './textures.js';
import { hands } from './player.js';
import * as SFX from './audio.js';
import * as A from './annexlayout.js';
import * as O from './ouijalogic.js';
import * as G2 from './organlogic.js';
import { toast } from './terminal.js';
import { findDeepSecret } from './deep.js';
import * as P from './puzzlelogic.js';
import { getSecrets } from './secrets.js';
import { SECRETS, isFound } from './secretlogic.js';
import { statueStare } from './annexstatues.js';
import { HAUNT_STATE } from './hauntlogic.js';

let G = null;
const _w = new THREE.Vector3(), _c = new THREE.Vector3();

function boardTexture() {
    const c = T.makeCanvas(512, 512), x = c.getContext('2d'), S = 256;
    x.fillStyle = '#2a1608'; x.fillRect(0, 0, 512, 512);
    const g = x.createRadialGradient(256, 256, 20, 256, 256, 256); g.addColorStop(0, '#6a4220'); g.addColorStop(1, '#3a1e0c'); x.fillStyle = g; x.beginPath(); x.arc(256, 256, 250, 0, 7); x.fill();
    x.strokeStyle = '#d8b878'; x.lineWidth = 4; x.beginPath(); x.arc(256, 256, 244, 0, 7); x.stroke(); x.lineWidth = 2; x.beginPath(); x.arc(256, 256, 232, 0, 7); x.stroke();
    x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = '#f0dca8';
    for (const k of O.KEYS) { const px = 256 + k.u * S, py = 256 + k.v * S; x.font = (k.id.length > 1 ? 'bold 24px' : 'bold 30px') + ' serif'; x.fillText(k.id === 'BYE' ? 'GOOD BYE' : k.id, px, py); }
    x.font = '22px serif'; x.fillStyle = '#b89858'; x.fillText('☽  ★  ☾', 256, 256 + 0.36 * S);
    return T.toTex(c, false);
}
function textTexture() { const c = T.makeCanvas(512, 128); return { c: c, x: c.getContext('2d'), t: T.toTex(c, false) }; }

export function buildAnnexPlay(flickers) {
    const root = L.root, OA = A.OUIJA_AT, AO = A.ORGAN_AT;
    G = { geos: [], mats: [], texs: [], clock: 0, o: O.newOuija(), pl: { u: 0, v: 0 }, target: { u: 0, v: 0 }, lastText: null, hold: 0, keys: [], last: [], organPlays: 0, ghostPlays: 0, ghostLock: '', checked: '', dimT: 0 };
    const geo = (g) => { G.geos.push(g); return g; }, mat = (m) => { G.mats.push(m); return m; };
    const wood = mat(new THREE.MeshStandardMaterial({ color: 0x3a2412, roughness: 0.7 })), dark = mat(new THREE.MeshStandardMaterial({ color: 0x1a1008, roughness: 0.6 }));
    // --- Stół spirytystyczny ---
    const tg = new THREE.Group(); tg.position.set(OA.x, 0, OA.z); root.add(tg); G.table = tg;
    const leg = new THREE.Mesh(geo(new THREE.CylinderGeometry(0.22, 0.4, OA.topY - 0.06, 14)), wood); leg.position.y = (OA.topY - 0.06) / 2; leg.castShadow = true; tg.add(leg);
    const top = new THREE.Mesh(geo(new THREE.CylinderGeometry(OA.tableR, OA.tableR, 0.06, 36)), wood); top.position.y = OA.topY - 0.03; top.castShadow = top.receiveShadow = true; tg.add(top);
    G.bt = boardTexture(); G.texs.push(G.bt);
    const bg = new THREE.Group(); bg.position.y = OA.topY + 0.004; bg.rotation.y = Math.PI; tg.add(bg); G.board = bg;   // plansza czytelna od strony tunelu (patrzysz na południe)
    const face = new THREE.Mesh(geo(new THREE.PlaneGeometry(2 * O.OUIJA.R, 2 * O.OUIJA.R)), mat(new THREE.MeshStandardMaterial({ map: G.bt, roughness: 0.6, transparent: true }))); face.rotation.x = -Math.PI / 2; face.material.alphaTest = 0.3; bg.add(face);
    const pl = new THREE.Group(); bg.add(pl); G.plan = pl;
    const pb = new THREE.Mesh(geo(new THREE.CylinderGeometry(0.09, 0.09, 0.02, 3)), mat(new THREE.MeshStandardMaterial({ color: 0xc8a060, roughness: 0.4, emissive: 0x201004 }))); pb.rotation.y = Math.PI / 6; pb.position.y = 0.012; pl.add(pb);
    const lens = new THREE.Mesh(geo(new THREE.CircleGeometry(0.025, 16)), mat(new THREE.MeshBasicMaterial({ color: 0x9fe0ff, transparent: true, opacity: 0.6 }))); lens.rotation.x = -Math.PI / 2; lens.position.y = 0.024; pl.add(lens);
    addStaticBody(OA.x, OA.topY / 2, OA.z, new CANNON.Box(new CANNON.Vec3(0.95, OA.topY / 2, 0.95)), tg, false);
    const tx = textTexture(); G.tt = tx; G.texs.push(tx.t);
    const panel = new THREE.Mesh(geo(new THREE.PlaneGeometry(1.8, 0.45)), mat(new THREE.MeshBasicMaterial({ map: tx.t, transparent: true, toneMapped: false, depthWrite: false }))); panel.position.set(OA.x, 2.0, OA.z); root.add(panel); G.panel = panel;
    const ol = new THREE.PointLight(0x6a50ff, 7, 7, 2); ol.position.set(OA.x, 2.4, OA.z); root.add(ol); flickers.push({ l: ol, base: 7, ph: Math.random() * 100, subtle: true });
    // --- Nawiedzone organy ---
    const pos = G2.keyPositions(AO.x, AO.z), keyG = geo(new THREE.BoxGeometry(0.2, 0.07, 0.34)), poleG = geo(new THREE.CylinderGeometry(0.03, 0.03, 1, 6));
    pos.forEach((p, i) => {
        const km = mat(new THREE.MeshStandardMaterial({ color: 0xd8c8a0, emissive: 0xff8030, emissiveIntensity: 0.1, roughness: 0.4 }));
        const k = new THREE.Mesh(keyG, km); k.position.set(p[0], p[1], p[2]); k.rotation.y = Math.atan2(p[0] - AO.x, p[2] - AO.z) + Math.PI; k.castShadow = true; root.add(k);
        const pole = new THREE.Mesh(poleG, dark); pole.scale.y = p[1] - 0.04; pole.position.set(p[0], (p[1] - 0.04) / 2, p[2]); root.add(pole);
        addStaticBody(p[0], (p[1] - 0.04) / 2, p[2], new CANNON.Box(new CANNON.Vec3(0.03, (p[1] - 0.04) / 2, 0.03)), pole, false);
        G.keys.push({ p: p, m: km, glow: 0 }); G.last.push(-9);
    });
    G.keyPos = pos;
    const gl = new THREE.PointLight(0xff8040, 6, 8, 2); gl.position.set(AO.x, 2.8, AO.z - 1.2); root.add(gl); flickers.push({ l: gl, base: 6, ph: Math.random() * 100, subtle: true });
    L.reserved.push([OA.x, OA.z, 3.0], [AO.x, AO.z - 1, 3.2]);
    drawText();
}

function drawText() {
    const s = G.o.text.trim() || '...', x = G.tt.x;
    x.clearRect(0, 0, 512, 128); x.fillStyle = 'rgba(10,6,16,0.55)'; x.fillRect(0, 20, 512, 88);
    x.textAlign = 'center'; x.textBaseline = 'middle'; x.font = 'bold 44px "Courier New", monospace'; x.fillStyle = G.o.ghost ? '#ff5040' : '#cfe0ff'; x.fillText(s.slice(-18), 256, 64);
    G.tt.t.needsUpdate = true; G.lastText = G.o.text + (G.o.ghost ? '!' : '');
}

function pickKey(id) {
    const o = G.o; o.text = O.applyPick(o.text, id);
    SFX.beep && SFX.beep(id === 'BYE' ? 300 : 520 + (id.charCodeAt(0) % 20) * 12, 0.05, 0.12);
    if (id === 'BYE') return;
    const say = o.ghost ? '' : O.replyFor(o.text);
    if (say) { o.ghost = O.startGhost(say); G.ghostPlays++; HAUNT_STATE.scare = { x: A.OUIJA_AT.x, z: A.OUIJA_AT.z, until: performance.now() / 1000 + 8, pet: false }; SFX.whisper && SFX.whisper({ x: A.OUIJA_AT.x, y: 1.2, z: A.OUIJA_AT.z }); }
}

export function updateAnnexPlay(dt, t) {
    if (!G) return; G.clock += dt;
    const o = G.o, OA = A.OUIJA_AT;
    // Dłoń nad planszą prowadzi planszetkę (w układzie planszy), chyba że duch odpowiada
    if (!o.ghost) for (const h of [hands.L, hands.R]) {
        if (!h) continue; h.getWorldPosition(_w); G.board.worldToLocal(_w);
        const hy = _w.y; if (hy > -0.02 && hy < O.OUIJA.REACH && O.onBoard(_w.x, _w.z)) { G.target = O.clampToBoard(_w.x, _w.z); break; }
    }
    else {
        const r = O.ghostStep(o.ghost, dt); o.ghost = r.g;
        const k = r.key ? O.keyById(r.key) : null; if (k) G.target = { u: k.u, v: k.v };
        if (r.add) { o.text = (o.text + r.add).slice(-O.OUIJA.MAX_TEXT); SFX.beep && SFX.beep(180, 0.05, 0.2); }
        if (r.done) { o.ghost = null; G.ghostLock = r.key || ''; }   // planszetka stoi na ostatniej literze: bez ponownego wyboru, dopóki z niej nie zjedzie
    }
    G.pl = O.glide(G.pl, G.target, dt, o.ghost ? 3.2 : 9); G.plan.position.set(G.pl.u, 0, G.pl.v);
    const k = O.keyAt(G.pl.u, G.pl.v); let kid = !o.ghost && k ? k.id : '';
    if (G.ghostLock) { if (kid === G.ghostLock) kid = ''; else G.ghostLock = ''; }
    const hv = O.hoverStep(o.hover, kid, dt); o.hover = hv.hv;
    if (hv.picked) pickKey(hv.picked);
    if ((G.o.text + (G.o.ghost ? '!' : '')) !== G.lastText) drawText();
    if (o.text !== G.checked) { G.checked = o.text; const w = P.wordHit(o.text); if (w) { wordEffect(w); o.text = ''; G.checked = ''; drawText(); } }
    G.dimT = Math.max(0, G.dimT - dt);
    if (HAUNT_STATE.scare && HAUNT_STATE.scare.pet) { HAUNT_STATE.scare.pet = false; findDeepSecret('pet'); }
    camera.getWorldPosition(_c); G.panel.rotation.y = Math.atan2(_c.x - OA.x, _c.z - OA.z);
    // Organy: dotknięcie klawisza dłonią
    for (const h of [hands.L, hands.R]) {
        if (!h) continue; h.getWorldPosition(_w); const i = G2.touchedKey(G.keyPos, [_w.x, _w.y, _w.z]);
        if (i >= 0 && G2.canPlay(G.last[i], G.clock)) playKey(i);
    }
    for (const k2 of G.keys) { k2.glow = Math.max(0, k2.glow - dt * 2.5); k2.m.emissiveIntensity = 0.1 + k2.glow * 1.6; }
}
// Tajne słowa: LEGION zdradza podpowiedź do kolejnej złotej czaszki, BAGABOO gasi światła i obraca posągi twarzą do gracza (sekret words)
function wordEffect(w) {
    findDeepSecret('words');
    if (w === 'LEGION') { const st = getSecrets(), next = SECRETS.find(x => !isFound(st, x.id)); toast(next ? 'The board whispers: ' + next.hint : 'The board has nothing more to tell you.', '#c8d8ff'); SFX.whisper && SFX.whisper({ x: A.OUIJA_AT.x, y: 1.2, z: A.OUIJA_AT.z }); }
    else { G.dimT = 3; statueStare(4); toast('The lights remember their name...', '#ff6a52'); SFX.bell && SFX.bell(); }
}
function playKey(i) { G.last[i] = G.clock; G.keys[i].glow = 1; G.organPlays++; SFX.beep && SFX.beep(G2.noteHz(i), 0.07, 0.55); }

export const annexDim = () => !G || G.dimT <= 0 ? 1 : (G.dimT > 0.6 ? 0.25 : 0.25 + 0.75 * (1 - G.dimT / 0.6));   // mnożnik świateł lobby po słowie BAGABOO
export function disposeAnnexPlay() { HAUNT_STATE.scare = null; if (!G) return; for (const g of G.geos) g.dispose(); for (const m of G.mats) m.dispose(); for (const x of G.texs) if (x) x.dispose(); G = null; }
export const debugAnnexPlay = () => G ? { text: G.o.text, ghost: !!G.o.ghost, ghostPlays: G.ghostPlays, organPlays: G.organPlays, keys: G.keys.length, plan: G.pl } : null;   // dla testów
export const debugAnnexDim = () => annexDim();
export function debugOuijaPick(id) { if (G) pickKey(id); return G ? G.o.text : ''; }
export function debugOrganKey(i) { if (!G || !G2.canPlay(G.last[i], G.clock)) return false; playKey(i); return true; }
