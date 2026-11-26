// ==========================================
// GHOST GALLERY W ANEKSIE LOBBY (oprawa 3D i zapis; reguły w czystym core/gallerylogic.js, układ w core/annexlayout.js; testy: tests/logic.mjs i tests/annex.mjs).
// Pięć widm wyskakuje przy dalekiej ścianie, a trzy piłki-gałki (annexball1..3) leżą na stojaku obok. Trafienie piłką daje punkty (trzy z rzędu = podwójnie),
// runda trwa 60 s od pierwszego trafienia, najlepszy wynik w SAVE.annex.galleryBest. Punkty liczy KAŻDY klient lokalnie (bez nagród, nic nie idzie przez sieć).
// Piłki wracają na stojak, gdy leżą bezczynnie daleko od niego.
// ==========================================
import { markGate } from './gtastore.js';
import { THREE, CANNON, L, tex, addBody, physicsMat, GROUP } from './engine.js';
import * as T from './textures.js';
import { toast } from './terminal.js';
import { SAVE, saveGame } from './economy.js';
import * as SFX from './audio.js';
import * as Gl from './gallerylogic.js';
import { normalizeAnnex } from './climblogic.js';
import { findDeepSecret } from './deep.js';
import * as P from './puzzlelogic.js';

let G = null;
const RACK = [[-4.4, 0.2, 44.2], [-4.4, 0.2, 45], [-4.4, 0.2, 45.8]];
export const getGallery = () => { const st = normalizeAnnex(SAVE.annex); SAVE.annex = st; return st; };

function ghostTexture() {
    const c = T.makeCanvas(128, 160), x = c.getContext('2d'); x.clearRect(0, 0, 128, 160);
    x.fillStyle = '#e8eef4'; x.beginPath(); x.moveTo(14, 152); x.lineTo(14, 70); x.arc(64, 64, 50, Math.PI, 0); x.lineTo(114, 152); for (let i = 0; i < 4; i++) x.quadraticCurveTo(105 - i * 24, 128, 90 - i * 24, 152); x.closePath(); x.fill();
    x.strokeStyle = '#4a5260'; x.lineWidth = 6; x.stroke();
    x.fillStyle = '#ff2a1a'; x.beginPath(); x.ellipse(44, 64, 9, 13, 0, 0, 7); x.ellipse(84, 64, 9, 13, 0, 0, 7); x.fill();
    x.fillStyle = '#20141a'; x.beginPath(); x.ellipse(64, 100, 14, 20, 0, 0, 7); x.fill();
    return T.toTex(c, false);
}

export function buildAnnexGallery(flickers) {
    const root = L.root;
    G = { geos: [], mats: [], texs: [], st: Gl.newGallery(), vis: [0, 0, 0, 0, 0], balls: [], idle: [0, 0, 0], clock: 0, sig: '', hits: 0, lastPh: 'idle', times: [], gold: null, goldHits: 0 };
    const geo = (g) => { G.geos.push(g); return g; }, mat = (m) => { G.mats.push(m); return m; };
    const back = new THREE.Mesh(geo(new THREE.PlaneGeometry(13, 2.6)), mat(new THREE.MeshStandardMaterial({ color: 0x1a1014, roughness: 0.8 }))); back.position.set(-1.2, 1.5, 49.9); back.rotation.y = Math.PI; root.add(back);
    const gt = ghostTexture(); G.texs.push(gt); const gm = mat(new THREE.MeshBasicMaterial({ map: gt, transparent: true, alphaTest: 0.3, side: THREE.DoubleSide, toneMapped: false })), gmGold = mat(new THREE.MeshBasicMaterial({ map: gt, color: 0xffd040, transparent: true, alphaTest: 0.3, side: THREE.DoubleSide, toneMapped: false })); G.gm = gm; G.gmGold = gmGold; const gg = geo(new THREE.PlaneGeometry(Gl.GAL.W, Gl.GAL.H));
    G.ghosts = Gl.GAL.XS.map((x) => { const piv = new THREE.Group(); piv.position.set(x, Gl.GAL.BASE, Gl.GAL.Z); root.add(piv); const m = new THREE.Mesh(gg, gm); m.position.y = Gl.GAL.H / 2; m.rotation.y = Math.PI; piv.add(m); piv.userData.mesh = m; piv.rotation.x = Math.PI / 2; return piv; });   // leżące = schowane
    // Tablica wyniku nad widmami
    G.cv = T.makeCanvas(1024, 256); G.cx = G.cv.getContext('2d'); G.tx = T.toTex(G.cv, false); G.texs.push(G.tx);
    const board = new THREE.Mesh(geo(new THREE.PlaneGeometry(5, 1.25)), mat(new THREE.MeshBasicMaterial({ map: G.tx, toneMapped: false }))); board.position.set(-1.2, 3.7, 49.85); board.rotation.y = Math.PI; root.add(board);
    const l = new THREE.PointLight(0xffc880, 9, 10, 2); l.position.set(-1.2, 3.8, 47.5); root.add(l); flickers.push({ l: l, base: 9, ph: Math.random() * 100, subtle: true });
    // Piłki i znacznik stojaka
    const ballG = geo(new THREE.SphereGeometry(0.2, 20, 20)), ballM = mat(new THREE.MeshPhysicalMaterial({ map: tex.eye, emissive: 0x330000, roughness: 0.1, metalness: 0.1, clearcoat: 1.0 }));
    RACK.forEach(([x, y, z], i) => {
        const m = new THREE.Mesh(ballG, ballM); m.castShadow = true; root.add(m);
        const body = addBody(new CANNON.Body({ mass: 1, shape: new CANNON.Sphere(0.2), position: new CANNON.Vec3(x, y, z), material: physicsMat, linearDamping: 0.05, collisionFilterGroup: GROUP.BALL, collisionFilterMask: GROUP.ENV | GROUP.BALL | GROUP.ROPE }));
        m.userData = { id: 'annexball' + (i + 1), body: body }; L.throwables.push(m); G.balls.push(m);
    });
    const pad = new THREE.Mesh(geo(new THREE.PlaneGeometry(1.6, 3)), mat(new THREE.MeshBasicMaterial({ color: 0xffa040, transparent: true, opacity: 0.22, depthWrite: false }))); pad.rotation.x = -Math.PI / 2; pad.position.set(-4.4, 0.02, 45); root.add(pad);
    L.reserved.push([-4.4, 45, 2.6], [-1.2, 48, 3]);
    draw();
}

function draw() {
    const x = G.cx, s = G.st, best = getGallery().galleryBest;
    x.fillStyle = '#120a06'; x.fillRect(0, 0, 1024, 256); x.strokeStyle = '#c8a040'; x.lineWidth = 6; x.strokeRect(5, 5, 1014, 246);
    x.textAlign = 'center'; x.fillStyle = '#ffd27a'; x.font = 'bold 56px "Courier New", monospace'; x.fillText('GHOST GALLERY', 512, 70);
    x.font = 'bold 84px "Courier New", monospace'; x.fillStyle = s.ph === 'run' ? '#ff6a40' : (s.ph === 'over' ? '#7fff90' : '#6a5a40'); x.fillText('SCORE ' + (s.ph === 'over' ? s.last : s.score), 512, 160);
    x.font = '30px "Courier New", monospace'; x.fillStyle = '#d8c8b0';
    x.fillText(s.ph === 'idle' ? 'Throw an eyeball at a ghost to start the 60 s round' : (s.ph === 'run' ? 'Time left ' + Math.ceil(Gl.timeLeft(s)) + ' s   Streak ' + s.streak : (s.last > 0 && s.last >= best ? 'NEW BEST!' : 'Round over')), 512, 205);
    x.fillStyle = '#ffd27a'; x.font = 'bold 30px "Courier New", monospace'; x.fillText('Best: ' + (best || '--'), 512, 242);
    G.tx.needsUpdate = true;
}

export function updateAnnexGallery(dt, t) {
    if (!G) return; G.clock += dt;
    const prev = G.st.ph; G.st = Gl.galleryStep(G.st, dt, Math.random);
    // Trafienia: środek piłki w bryle stojącego widma
    for (const b of G.balls) { const p = b.userData.body.position; for (let i = 0; i < Gl.GAL.XS.length; i++) { if (Gl.hitsTarget(i, [p.x, p.y, p.z])) { const r = Gl.registerHit(G.st, i); if (r.hit) { G.st = r.st; G.hits++; SFX.beep && SFX.beep(900 + 120 * G.st.streak, 0.07, 0.12); onHit(i); } } } }
    if (prev === 'run' && G.st.ph === 'over') {
        { const tr = markGate('gallery', G.st.last); if (tr.isNew) toast('Gate trial 2 of 3 passed: AIM', '#30ff70'); }   // brama do Scary GTA: 100+ punktów w jednej rundzie
        const best = getGallery().galleryBest; if (G.st.last > best) { SAVE.annex = Object.assign({}, getGallery(), { galleryBest: G.st.last }); saveGame(); toast('New Ghost Gallery best: ' + G.st.last, '#ffd27a'); SFX.bell && SFX.bell(); }
        else toast('Ghost Gallery: ' + G.st.last + ' (best ' + best + ')', '#7fff90');
    }
    // Złote widmo: rzadszy cel na 5 s po trzech trafieniach w 3 s; trafienie daje 100 punktów (sekret gold)
    if (G.gold) { G.gold.t -= dt; if (G.gold.t <= 0) endGold(); else { G.st.t[G.gold.i].up = true; G.st.t[G.gold.i].left = Math.max(G.st.t[G.gold.i].left, 0.6); } }
    // Widma wstają i chowają się płynnie
    G.ghosts.forEach((g, i) => { const want = G.st.t[i].up ? 0 : Math.PI / 2; G.vis[i] += (want - G.vis[i]) * Math.min(1, dt * 12); g.rotation.x = G.vis[i]; });
    // Piłki wracają na stojak, gdy długo leżą daleko od niego
    G.balls.forEach((b, i) => {
        const p = b.userData.body.position, v = b.userData.body.velocity, far = Math.hypot(p.x - RACK[i][0], p.z - RACK[i][2]) > 3, still = Math.hypot(v.x, v.y, v.z) < 0.3;
        G.idle[i] = far && still ? G.idle[i] + dt : 0;
        if (G.idle[i] > 10) { G.idle[i] = 0; b.userData.body.position.set(RACK[i][0], RACK[i][1], RACK[i][2]); b.userData.body.velocity.set(0, 0, 0); }
    });
    const sig = G.st.ph + ':' + G.st.score + ':' + Math.ceil(Gl.timeLeft(G.st)) + ':' + G.st.streak + ':' + getGallery().galleryBest; if (sig !== G.sig) { G.sig = sig; draw(); }
}
function startGold(i) { if (G.gold) return; G.gold = { i: i, t: 5 }; G.ghosts[i].userData.mesh.material = G.gmGold; G.st.t[i].up = true; G.st.t[i].left = 5; toast('A golden ghost appears!', '#ffd27a'); SFX.bell && SFX.bell(); }
function endGold() { if (!G.gold) return; G.ghosts[G.gold.i].userData.mesh.material = G.gm; G.gold = null; }
// Trafienie widma i: seria trzech w 3 s budzi złote; trafienie złotego daje bonus i sekret
function onHit(i) {
    if (G.gold && G.gold.i === i) { G.st.score += 90; G.goldHits++; endGold(); findDeepSecret('gold'); G.times = []; return; }
    const r = P.comboStep(G.times, G.clock); G.times = r.times; if (r.fired) startGold((i + 2) % Gl.GAL.XS.length);
}
export function disposeAnnexGallery() { if (!G) return; for (const g of G.geos) g.dispose(); for (const m of G.mats) m.dispose(); for (const x of G.texs) x.dispose(); G = null; }
export const debugAnnexGallery = () => G ? { ph: G.st.ph, score: G.st.score, last: G.st.last, hits: G.hits, balls: G.balls.length, up: G.st.t.map(q => q.up), best: getGallery().galleryBest, gold: G.gold ? G.gold.i : -1, goldHits: G.goldHits } : null;   // dla testów
export function debugGalleryForceUp(i) { if (G) { G.st.t[i].up = true; G.st.t[i].left = 3; } }
export function debugGalleryBall(i, x, y, z) { if (G) { const b = G.balls[i].userData.body; b.position.set(x, y, z); b.velocity.set(0, 0, 0); } }
export const debugGalleryGold = (i) => { if (G) startGold(i); return G && G.gold ? G.gold.i : -1; };
export function debugGalleryEnd() { if (G) { G.st.ph = 'run'; G.st.time = Gl.GAL.ROUND - 0.2; } }
