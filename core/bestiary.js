// ==========================================
// BESTIARIUSZ W LOBBY (oprawa 3D i zapis; reguły w czystym core/bestiarylogic.js, testy: tests/logic.mjs i tests/lobbyextras.mjs).
// Dwa rzędy szklanych witryn z figurkami potworów (animacja spoczynku z plików GLB) po obu stronach przejścia, a w jego środku panel z listą i notką.
// Potwór, którego jeszcze nie spotkałeś, stoi jako czarna sylwetka z napisem ???. Dotknięcie witryny dłonią wybiera ją na panelu.
// Odkrycie: bestiaryTick(poziom, dt) wołane z main.js co klatkę liczy czas na poziomie; po UNLOCK_SECONDS potwór trafia do SAVE.bestiary.
// Komplet daje jednorazowe REWARD Bagabucksów. Wszystko lokalne (nic nie idzie przez sieć).
// ==========================================
import { THREE, L, tex, addCollider, camera } from './engine.js';
import * as T from './textures.js';
import { Terminal, terminals, toast, wrapText, AMBER, AMBER_DIM, GOLD, OK_COL } from './terminal.js';
import { SAVE, saveGame, addBones, getLook } from './economy.js';
import { createHead } from './avatar.js';
import { findDeepSecret } from './deep.js';
import { hands } from './player.js';
import { swapRoot } from './glbmonster.js';
import * as SFX from './audio.js';
import * as B from './bestiarylogic.js';

let G = null, visit = { level: '', t: 0 };
const TOUCH = 0.5, _w = new THREE.Vector3();

export function getBestiary() { const st = B.normalizeBestiary(SAVE.bestiary); SAVE.bestiary = st; return st; }
// Odkrycie potwora: zapis, toast, nagroda za komplet; zwraca true przy nowym wpisie
export function discoverBeast(id) {
    const r = B.unlockBeast(getBestiary(), id); if (!r.isNew) return false;
    SAVE.bestiary = r.state; const b = B.beastById(id);
    toast('New Bestiary entry: ' + b.name + ' (' + B.seenCount(r.state) + '/' + B.BEASTS.length + ')', '#ffd27a'); SFX.bell && SFX.bell();
    if (r.complete) { ensureYou(); SAVE.bestiary = B.markRewarded(SAVE.bestiary); addBones(B.REWARD, 'Bestiary complete'); toast('Bestiary complete! +' + B.REWARD + ' Bagabucks', '#7fff90'); }
    saveGame(); if (G) G.term.dirty = true;
    return true;
}
// Co klatkę z main.js (na każdym poziomie): czas na poziomie, po progu odkrywa jego potwora
export function bestiaryTick(levelId, dt) {
    const r = B.visitStep(visit, levelId, dt); visit = r.v;
    if (r.unlock) discoverBeast(r.unlock);
}

function labelTexture(name, known) {
    const c = T.makeCanvas(256, 64), x = c.getContext('2d');
    x.fillStyle = '#1a1209'; x.fillRect(0, 0, 256, 64); x.strokeStyle = known ? '#c8a040' : '#4a3a28'; x.lineWidth = 4; x.strokeRect(2, 2, 252, 60);
    x.font = 'bold 26px "Courier New", monospace'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = known ? '#ffd27a' : '#6a5a40';
    x.fillText(known ? name.toUpperCase().replace('THE ', '') : '???', 128, 34);
    return T.toTex(c, false);
}

export function buildBestiary(cx, cz) {
    const st = getBestiary(), root = L.root;
    G = { sel: 0, cases: [], texs: [], geos: [], mats: [], cx: cx, cz: cz, touchT: 0, sig: '', clock: 0 };
    const mat = (c, o) => { const m = new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.7 }, o || {})); G.mats.push(m); return m; };
    const geo = (g) => { G.geos.push(g); return g; };
    const dark = mat(0x2a211a, { roughness: 0.55, metalness: 0.2 }), gold = mat(0xc8a040, { metalness: 0.8, roughness: 0.35, emissive: 0x302008 });
    const glassMat = mat(0xaad8ff, { transparent: true, opacity: 0.13, roughness: 0.08, metalness: 0, depthWrite: false });
    const sil = new THREE.MeshBasicMaterial({ color: 0x040404 }); G.mats.push(sil);
    const plinthG = geo(new THREE.BoxGeometry(0.8, 0.9, 0.7)), trimG = geo(new THREE.BoxGeometry(0.84, 0.04, 0.74)), glassG = geo(new THREE.BoxGeometry(0.78, 1.15, 0.68)), plateG = geo(new THREE.PlaneGeometry(0.62, 0.155));
    B.BEASTS.forEach((b, i) => {
        const row = i < 6 ? 0 : 1, k = i % 6, x = cx + (k - 2.5) * 1.0, z = cz + (row === 0 ? -1.9 : 1.9), known = B.isSeen(st, b.id);
        const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = row === 0 ? 0 : Math.PI; root.add(g);   // przód witryny zawsze do przejścia
        const plinth = new THREE.Mesh(plinthG, dark); plinth.position.y = 0.45; plinth.castShadow = plinth.receiveShadow = true; g.add(plinth);
        const trim = new THREE.Mesh(trimG, known ? gold : dark); trim.position.y = 0.92; g.add(trim);
        const lt = labelTexture(b.name, known); G.texs.push(lt);
        const plate = new THREE.Mesh(plateG, new THREE.MeshBasicMaterial({ map: lt, toneMapped: false })); G.mats.push(plate.material); plate.position.set(0, 0.55, 0.352); g.add(plate);
        const glass = new THREE.Mesh(glassG, glassMat.clone()); G.mats.push(glass.material); glass.position.y = 0.92 + 0.575; g.add(glass);   // osobny materiał: wybrana witryna lśni sama
        const fig = new THREE.Group(); fig.position.y = 0.94; g.add(fig);
        swapRoot(fig, b.model, { height: 0.85, onLoad: (m) => { if (known) return; m.group.traverse((o) => { if (o.isMesh) o.material = sil; else if (o.isSprite) o.visible = false; }); } });   // nieodkryty: czarna sylwetka
        addCollider(x - 0.42, 0, z - 0.37, x + 0.42, 2.1, z + 0.37);
        G.cases.push({ id: b.id, x: x, z: z, g: g, fig: fig, glass: glass });
    });
    // Panel w środku przejścia: lista, notka i postęp (zwykły Terminal: laser kontrolera albo celownik)
    G.term = new Terminal(draw, 1024, 640);
    const pg = new THREE.Group(); pg.position.set(cx, 0, cz); root.add(pg);
    const post = new THREE.Mesh(geo(new THREE.BoxGeometry(0.2, 1.2, 0.2)), dark); post.position.y = 0.6; pg.add(post);
    const frame = new THREE.Mesh(geo(new THREE.BoxGeometry(2.56, 1.66, 0.1)), dark); frame.position.y = 1.75; pg.add(frame);
    const screen = G.term.createMesh(2.4, 1.5); screen.position.set(0, 1.75, 0.056); pg.add(screen);
    const l = new THREE.PointLight(0xffc880, 9, 9, 2); l.position.set(0, 2.6, 0.2); pg.add(l);   // jedno światło na całą galerię
    addCollider(cx - 0.12, 0, cz - 0.12, cx + 0.12, 1.2, cz + 0.12);
    L.reserved.push([cx, cz, 4.8]);
    G.term.dirty = true;
    if (B.isComplete(st)) ensureYou();
}

// Trzynasta witryna (sekret you): pojawia się po odkryciu wszystkich 12 potworów, stoi obok pierwszego rzędu, a w środku jest popiersie gracza w jego własnej skórce
function ensureYou() {
    if (!G || G.you) return;
    const x = G.cx - 3.5, z = G.cz - 1.9, g = new THREE.Group(); g.position.set(x, 0, z); L.root.add(g);
    const gold = G.mats.find(m => m.metalness === 0.8 && m.roughness === 0.35), dark = G.mats[0];
    const plinth = new THREE.Mesh(G.geos[0], dark); plinth.position.y = 0.45; g.add(plinth);
    const trim = new THREE.Mesh(G.geos[1], gold || dark); trim.position.y = 0.92; g.add(trim);
    const lt = labelTexture('YOU', true); G.texs.push(lt); const pm = new THREE.MeshBasicMaterial({ map: lt, toneMapped: false }); G.mats.push(pm);
    const plate = new THREE.Mesh(G.geos[3], pm); plate.position.set(0, 0.55, 0.352); g.add(plate);
    const glass = new THREE.Mesh(G.geos[2], G.mats[2].clone()); G.mats.push(glass.material); glass.position.y = 0.92 + 0.575; g.add(glass);
    const head = createHead(getLook(), false); head.scale.setScalar(1.5); head.position.y = 1.35; head.rotation.y = Math.PI; g.add(head);
    addCollider(x - 0.42, 0, z - 0.37, x + 0.42, 2.1, z + 0.37);
    G.you = { g: g, x: x, z: z, head: head };
}

function draw(t) {
    const st = getBestiary(), c = t.ctx; t.background();
    t.header('BESTIARY', B.seenCount(st) + ' / ' + B.BEASTS.length, B.isComplete(st) ? OK_COL : AMBER_DIM);
    B.BEASTS.forEach((b, i) => { const known = B.isSeen(st, b.id); t.btn('b' + i, 24, 84 + i * 45, 330, 41, (i + 1 < 10 ? '0' : '') + (i + 1) + ' ' + (known ? b.name.replace('The ', '') : '???'), () => select(i), { active: G.sel === i, size: 22, tone: known ? undefined : 'bad' }); });
    const b = B.BEASTS[G.sel], known = B.isSeen(st, b.id), X = 390;
    c.fillStyle = '#1c1208'; c.fillRect(X - 14, 86, 624, 478);
    t.text(known ? b.name : '???', X, 126, 40, known ? GOLD : '#6a5a40', 'left', true);
    t.text(known ? 'Found in: ' + b.place : 'Spend ' + B.UNLOCK_SECONDS + ' s in its level to meet it.', X, 170, 24, AMBER, 'left');
    if (known) { let y = 224; for (const ln of wrapText(b.hint, 40)) { t.text(ln, X, y, 28, '#e0d2b8', 'left'); y += 36; } }
    else t.text('Level: ' + b.place, X, 224, 28, '#8a7660', 'left');
    t.bar(X, 520, 590, 22, B.seenCount(st) / B.BEASTS.length, B.isComplete(st) ? OK_COL : AMBER);
    t.text(B.isComplete(st) ? (st.rewarded ? 'Complete! Reward collected.' : 'Complete!') : 'Meet all 12 for ' + B.REWARD + ' Bagabucks.', X, 590, 22, B.isComplete(st) ? OK_COL : AMBER_DIM, 'left', true);
    t.scanlines();
}
function select(i) { if (!G) return; G.sel = i; G.term.dirty = true; SFX.beep && SFX.beep(900, 0.05, 0.03); }

export function updateBestiary(dt, t) {
    if (!G) return; G.clock += dt;
    // Dotknięcie dłonią wybiera witrynę (co najwyżej co 0,4 s)
    G.touchT -= dt;
    if (G.touchT <= 0) for (const h of [hands.L, hands.R]) {
        if (!h) continue; h.getWorldPosition(_w);
        if (_w.y > 2.2) continue;
        const i = G.cases.findIndex(q => Math.hypot(_w.x - q.x, _w.z - q.z) < TOUCH && _w.y < 2.05);
        if (i >= 0 && i !== G.sel) { select(i); G.touchT = 0.4; break; }
    }
    if (G.you) { G.you.head.rotation.y = Math.PI + Math.sin(G.clock * 0.6) * 0.5; camera.getWorldPosition(_w); if (Math.hypot(_w.x - G.you.x, _w.z - G.you.z) < 1.4 && _w.y < 3) findDeepSecret('you'); }
    // Wybrana witryna lekko lśni; figurki odkryte obracają się wolno
    const st = getBestiary();
    G.cases.forEach((q, i) => { q.glass.material.opacity = 0.13; q.fig.rotation.y = B.isSeen(st, q.id) ? Math.sin(G.clock * 0.5 + i) * 0.35 : 0; });
    if (G.cases[G.sel]) G.cases[G.sel].glass.material.opacity = 0.13 + 0.07 * Math.sin(G.clock * 4);
}
export function disposeBestiary() {
    if (!G) return;
    if (G.you) G.you.head.traverse(o => { if (o.geometry) o.geometry.dispose(); const ms = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : []; for (const m of ms) { if (m.map) m.map.dispose(); m.dispose(); } });
    const i = terminals.indexOf(G.term); if (i >= 0) terminals.splice(i, 1);
    for (const x of G.texs) x.dispose(); for (const g of G.geos) g.dispose(); for (const m of G.mats) m.dispose();
    G.term.tex.dispose();
    G = null;
}
export const debugBestiary = () => G ? { cases: G.cases.length, sel: G.sel, seen: B.seenCount(getBestiary()) } : null;   // dla testów
export function debugFigureHeights() { return G ? G.cases.map(q => { const bb = new THREE.Box3().setFromObject(q.fig), s = bb.getSize(new THREE.Vector3()); return +s.y.toFixed(2); }) : []; }   // wysokości figurek (m), dla testów
export const debugYou = () => G && G.you ? { x: G.you.x, z: G.you.z } : null;   // dla testów
export function debugSelectBeast(i) { select(i); return G ? G.sel : -1; }
