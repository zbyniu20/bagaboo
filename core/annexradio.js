// ==========================================
// RADIO W ANEKSIE LOBBY (oprawa 3D; reguły w czystym core/puzzlelogic.js: RADIO, STATIONS, stationAt, transmission; układ: RADIO_AT w core/annexlayout.js).
// Stary odbiornik na stoliku przy wschodnim pasie. Częstotliwość zmieniasz przyciskami na ekranie (laserem) albo dłonią na gałce (ruch w górę i w dół). Cztery stacje:
// szum (ostrzeżenie), liczby (kod sejfu na dziś), plansza ("ASK THE BOARD ITS NAME", czyli słowo LEGION) i melodia (numery klawiszy organów). Każde słowo transmisji
// wyświetla się osobno co 1,5 s z tonem. Lokalne, bez zapisu.
// ==========================================
import { THREE, CANNON, L, addStaticBody } from './engine.js';
import { Terminal, terminals, AMBER, AMBER_DIM, GOLD, OK_COL } from './terminal.js';
import { dailyDate } from './economy.js';
import { hands } from './player.js';
import * as SFX from './audio.js';
import * as A from './annexlayout.js';
import * as P from './puzzlelogic.js';

let G = null;
const _w = new THREE.Vector3(), WORD_SEC = 1.5;

export function buildAnnexRadio(flickers) {
    const root = L.root, R = A.RADIO_AT;
    G = { geos: [], mats: [], f: 95.1, term: null, idx: 0, t: 0, st: null, sig: '', prevY: [null, null], clock: 0, knob: null, tones: 0 };
    const geo = (g) => { G.geos.push(g); return g; }, mat = (m) => { G.mats.push(m); return m; };
    const wood = mat(new THREE.MeshStandardMaterial({ color: 0x4a3020, roughness: 0.7 })), body = mat(new THREE.MeshStandardMaterial({ color: 0x6a4a2a, roughness: 0.5 })), dark = mat(new THREE.MeshStandardMaterial({ color: 0x1a1410, roughness: 0.6 }));
    const g = new THREE.Group(); g.position.set(R.x, 0, R.z); root.add(g);
    const table = new THREE.Mesh(geo(new THREE.BoxGeometry(0.9, 0.8, 1.6)), wood); table.position.y = 0.4; table.castShadow = true; g.add(table);
    const set = new THREE.Mesh(geo(new THREE.BoxGeometry(0.4, 0.34, 0.8)), body); set.position.y = 0.97; set.castShadow = true; g.add(set);
    const grille = new THREE.Mesh(geo(new THREE.CylinderGeometry(0.13, 0.13, 0.02, 20)), dark); grille.rotation.z = Math.PI / 2; grille.position.set(-0.205, 0.97, 0.22); g.add(grille);
    const knob = new THREE.Mesh(geo(new THREE.CylinderGeometry(0.055, 0.055, 0.05, 16)), mat(new THREE.MeshStandardMaterial({ color: 0xd8b878, metalness: 0.6, roughness: 0.4 }))); knob.rotation.z = Math.PI / 2; knob.position.set(-0.22, 0.97, -0.18); g.add(knob); G.knob = knob;
    const ant = new THREE.Mesh(geo(new THREE.CylinderGeometry(0.006, 0.006, 0.9, 5)), dark); ant.position.set(0.1, 1.55, 0.3); ant.rotation.z = 0.25; g.add(ant);
    addStaticBody(R.x, 0.4, R.z, new CANNON.Box(new CANNON.Vec3(0.45, 0.4, 0.8)), table, false);
    G.term = new Terminal(draw, 640, 400);
    const scr = G.term.createMesh(1.2, 0.75); scr.position.set(R.x - 0.12, 1.65, R.z - 0.45); scr.rotation.y = -Math.PI / 2; root.add(scr);   // ekran nad odbiornikiem, zwrócony do kręgosłupa
    const stand = new THREE.Mesh(geo(new THREE.BoxGeometry(0.06, 0.6, 0.06)), dark); stand.position.set(R.x - 0.05, 1.3, R.z - 0.45); root.add(stand);
    const l = new THREE.PointLight(0xffb870, 7, 6, 2); l.position.set(R.x - 1.2, 2.2, R.z); root.add(l); flickers.push({ l: l, base: 7, ph: Math.random() * 100, subtle: true });
    L.reserved.push([R.x, R.z, 2.4]);
    G.term.dirty = true;
}
const tune = (d) => { G.f = Math.max(P.RADIO.MIN, Math.min(P.RADIO.MAX, Math.round((G.f + d) * 10) / 10)); G.idx = 0; G.t = 0; G.term.dirty = true; SFX.beep && SFX.beep(500 + (G.f - 88) * 18, 0.04, 0.06); };
function draw(t) {
    const st = P.stationAt(G.f), words = st ? P.transmission(st.id, dailyDate()) : [], c = t.ctx;
    t.background(); t.header('RADIO', st ? 'SIGNAL' : 'static', st ? OK_COL : AMBER_DIM);
    t.text(G.f.toFixed(1) + ' MHz', 320, 120, 62, GOLD, 'center', true);
    t.bar(120, 150, 400, 16, (G.f - P.RADIO.MIN) / (P.RADIO.MAX - P.RADIO.MIN), AMBER);
    if (st && words.length) { t.text(words[G.idx % words.length], 320, 240, 52, '#d8f0ff', 'center', true); t.text((G.idx % words.length + 1) + ' / ' + words.length, 320, 280, 20, AMBER_DIM, 'center'); }
    else { for (let i = 0; i < 90; i++) { c.fillStyle = 'rgba(200,200,200,' + (0.1 + Math.random() * 0.35).toFixed(2) + ')'; c.fillRect(100 + Math.random() * 440, 190 + Math.random() * 90, 3, 3); } t.text('...', 320, 250, 36, AMBER_DIM, 'center'); }
    t.btn('m1', 40, 310, 130, 64, '<<  -1.0', () => tune(-1), { size: 24 }); t.btn('m2', 180, 310, 130, 64, '<  -0.2', () => tune(-0.2), { size: 24 });
    t.btn('p2', 330, 310, 130, 64, '+0.2  >', () => tune(0.2), { size: 24 }); t.btn('p1', 470, 310, 130, 64, '+1.0  >>', () => tune(1), { size: 24 });
    t.scanlines();
}
export function updateAnnexRadio(dt, t) {
    if (!G) return; G.clock += dt;
    // Gałka: dłoń blisko gałki zmienia częstotliwość ruchem w górę i w dół
    const R = A.RADIO_AT;
    [hands.L, hands.R].forEach((h, i) => {
        if (!h) { G.prevY[i] = null; return; } h.getWorldPosition(_w);
        if (Math.hypot(_w.x - (R.x - 0.22), _w.y - 0.97, _w.z - (R.z - 0.18)) < 0.28) { if (G.prevY[i] !== null) { const dy = _w.y - G.prevY[i]; if (Math.abs(dy) > 0.002) { G.f = Math.max(P.RADIO.MIN, Math.min(P.RADIO.MAX, G.f + dy * 40)); G.term.dirty = true; } } G.prevY[i] = _w.y; } else G.prevY[i] = null;
    });
    G.knob.rotation.x = (G.f - P.RADIO.MIN) / (P.RADIO.MAX - P.RADIO.MIN) * 4.7;
    const st = P.stationAt(G.f), id = st ? st.id : '', words = st ? P.transmission(id, dailyDate()) : [];
    if (id !== G.st) { G.st = id; G.idx = 0; G.t = 0; G.term.dirty = true; }
    if (words.length) { G.t += dt; if (G.t >= WORD_SEC) { G.t = 0; G.idx = (G.idx + 1) % words.length; G.tones++; SFX.beep && SFX.beep(380 + (G.idx % 8) * 45, 0.05, 0.25); G.term.dirty = true; } }
    else if (Math.floor(G.clock * 6) % 2 === 0) { const sig = Math.floor(G.clock * 6); if (sig !== G.sig) { G.sig = sig; G.term.dirty = true; } }
}
export function disposeAnnexRadio() {
    if (!G) return;
    const i = terminals.indexOf(G.term); if (i >= 0) terminals.splice(i, 1);
    for (const g of G.geos) g.dispose(); for (const m of G.mats) m.dispose(); G.term.tex.dispose(); G = null;
}
export const debugRadio = () => G ? { f: G.f, station: P.stationAt(G.f) ? P.stationAt(G.f).id : '', idx: G.idx, words: P.stationAt(G.f) ? P.transmission(P.stationAt(G.f).id, dailyDate()) : [], tones: G.tones } : null;   // dla testów
export function debugTune(f) { if (G) { G.f = f; G.idx = 0; G.t = 0; G.term.dirty = true; } }
