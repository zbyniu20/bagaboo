// ==========================================
// ŚCIANA GRAFFITI (lobby, wschodnia ściana): wspólny mural 48x24 komórek, który maluje cała ekipa, konkurs z głosowaniem i Galeria zwycięzców.
// Reguły są w czystych core/graffitilogic.js (ściana) i core/graffitiround.js (konkurs i Galeria); testy w Node (tests/logic.mjs).
// Ściana to zwykły Terminal: celownik (komputer) albo laser kontrolera (VR) wskazuje komórkę, klik = pędzel, przytrzymanie (mysz lub spust) = rysowanie.
// Paleta (11 farb + gumka), dwa pędzle (1x1 i 3x3), przycisk zmazania tylko u hosta lub solo. Pędzel pryska cicho (spray), a w Nocnej Zmianie ściana ciemnieje.
// SIEĆ: gość maluje od razu u siebie i wysyła pociągnięcie do hosta ('gp'). Host sprawdza je sam: oczyszcza komórki (cleanCells), pilnuje tempa
//   na gracza (takeTokens), przycina do kolumny autora w konkursie (restrictToSlot) i sprawdza, czy gracz stoi przy ścianie wg POZYCJI JEGO GŁOWY
//   u hosta (near), po czym rozsyła delty ('gd'), co kilka sekund snapshot ('gs': ściana RLE z kluczem doby i Galeria) i stan konkursu ('gc').
//   Gość przyjmuje wiadomości tylko od hosta i tylko przez walidatory (decodeWall, cleanGallery, cleanContest).
// DOBA: o 3:00 UTC ściana blaknie do białej; Galeria wygasa co tydzień. Host (i solo) zapisuje ścianę dnia i Galerię w localStorage.
// KONKURS: co 25-40 min przy co najmniej 2 osobach: temat, 2 min rysowania (każdy w swojej kolumnie, reszta ściany czysta), 20 s głosowania
//   na polach przed ścianą (głosy z pozycji głów liczy host, własne pole się nie liczy), nagroda dla zwycięzcy, plakat do Galerii. Potem wraca ściana sprzed konkursu.
//   Wyłączany razem z wydarzeniami lobby (SETTINGS.lobbyEvents) i nie startuje podczas Nocnej Zmiany.
// ==========================================
import { THREE, L } from './engine.js';
import * as T from './textures.js';
import { Terminal, terminals, pointerHit, toast, wrapText, AMBER, AMBER_DIM, GOLD } from './terminal.js';
import * as N from './network.js';
import * as SFX from './audio.js';
import { isMouseDown } from './desktop.js';
import { triggerDown } from './player.js';
import { SAVE, levelReward } from './economy.js';
import { safeName } from './netguard.js';
import { headOf, participants, toNet, fromNet } from './roundkit.js';
import { WALL, emptyWall, dayKey, cleanCells, brushCells, paintCells, makeBucket, takeTokens, near, cellAt, encodeRle, encodeWall, decodeWall } from './graffitilogic.js';
import { ROUND, nextContestIn, pickTheme, contestStep, assignSlots, idOfSlot, restrictToSlot, countVotes, winnerOf, extractSlot, weekKey, cleanGallery, gallerySubmit, galleryVote, galleryRank, cleanContest } from './graffitiround.js';

const POS = { x: 14.9, y: 2.4, z: 3.5 };            // środek ściany
const GPOS = { x: 14.9, y: 2.4, z: 9.4 };           // środek Galerii
const AREA = { x: 32, y: 56, w: 960, h: 480 };      // obszar obrazu na płótnie terminala (1024 x 640)
const KEY = 'bagaboo_graffiti_v1', GKEY = 'bagaboo_gallery_v1', PKEY = 'bagaboo_graffiti_private_v1';
const SNAP_EVERY = 8, DELTA_EVERY = 0.2, SAVE_EVERY = 5, CONTEST_EVERY = 0.5;
const SLOT_COLS = ['#ff6a4a', '#6ad0ff', '#a0ff60', '#ffd24a'];
let G = null;

const newContest = (first) => ({ ph: 'idle', t: nextContestIn(first, Math.random), theme: '', slots: {}, names: {}, ready: {}, counts: ROUND.PADS.map(() => 0), winner: -1 });

export function buildGraffiti() {
    G = {
        wall: emptyWall(), day: dayKey(Date.now()), week: weekKey(Date.now()), gallery: [], color: 3, brush: 0, cell: null, lastPaint: '', vrLast: ['', ''], out: [], buckets: {},
        clock: 0, snapT: 1, deltaT: 0, saveT: SAVE_EVERY, dayT: 1, snapNow: false, saveDirty: false, galleryDirty: false, sprayT: -9, noticeT: -9, dim: 1,
        priv: emptyWall(), mode: 'shared', privDirty: false, posterAt: -99, posterBy: {}, voteBy: {}, voted: {}, contest: newContest(true), saved: null, ctT: 0, ctNow: false, lastGc: 0, sec: -1, padSig: '', term: null, gterm: null
    };
    load();
    const t = new Terminal(draw, 1024, 640), gt = new Terminal(drawGallery, 640, 560); G.term = t; G.gterm = gt;
    G.group = mount(t, 6.0, 3.75, POS, 6.2, 3.95);
    G.ggroup = mount(gt, 3.2, 2.8, GPOS, 3.4, 3.0);
    L.reserved.push([POS.x - 1.3, POS.z, 3.4], [GPOS.x - 1.3, GPOS.z, 2.2]);
    buildPads();
}
function mount(term, w, h, pos, fw, fh) {
    const g = new THREE.Group(); g.position.set(pos.x, pos.y, pos.z); g.rotation.y = -Math.PI / 2; L.root.add(g);
    g.add(new THREE.Mesh(new THREE.BoxGeometry(fw, fh, 0.1), new THREE.MeshStandardMaterial({ color: 0x2a221c, roughness: 0.6, metalness: 0.4 })));
    const screen = term.createMesh(w, h); screen.position.z = 0.055; g.add(screen);
    return g;
}
export function disposeGraffiti() {
    if (!G) return;
    if (G.saved) { G.wall = G.saved; G.saveDirty = true; }   // wyjście w trakcie konkursu: zapisujemy ścianę sprzed konkursu
    save(true); saveGallery(true); savePrivate(true);
    for (const t of [G.term, G.gterm]) { const i = terminals.indexOf(t); if (i >= 0) terminals.splice(i, 1); }
    G = null;
}

// ---------- zapis dnia i tygodnia (host i solo) ----------
// Prywatny ekran każdego gracza: rysunek tylko u niego (nic nie idzie do sieci), zapis na tym urządzeniu; nie blaknie co dobę (jest Twój)
function loadPrivate() { try { const raw = JSON.parse(localStorage.getItem(PKEY) || 'null'); const w = raw && decodeWall(raw.w); if (w) G.priv = w; } catch (e) { /* brak zapisu: pusty ekran */ } }
function savePrivate(force) {
    if (!G || (!G.privDirty && !force)) return; G.privDirty = false;
    if (!G.priv.some(v => v)) { try { localStorage.removeItem(PKEY); } catch (e) { /* jw. */ } return; }
    try { localStorage.setItem(PKEY, JSON.stringify({ w: encodeWall(G.priv) })); } catch (e) { /* pełny dysk: rysunek zostaje tylko w sesji */ }
}
const isPrivate = () => G.mode === 'private' && G.contest.ph === 'idle';
const viewWall = () => (isPrivate() ? G.priv : G.wall);
function setMode(m) { G.mode = m; G.cell = null; G.lastPaint = ''; G.term.dirty = true; toast(m === 'private' ? 'MY SCREEN: only you see what you draw here' : 'SHARED WALL: everyone sees it', m === 'private' ? '#9fd0ff' : GOLD); }
function load() {
    loadPrivate();
    if (N.NET.mode === 'guest') return;
    try { const raw = JSON.parse(localStorage.getItem(KEY) || 'null'); if (raw && raw.d === G.day) { const w = decodeWall(raw.w); if (w) G.wall = w; } } catch (e) { /* brak zapisu albo zepsuty: goła ściana */ }
    try { const raw = JSON.parse(localStorage.getItem(GKEY) || 'null'); if (raw && raw.w === G.week) G.gallery = cleanGallery(raw.l); } catch (e) { /* jw. */ }
}
function save(force) {
    if (!G || N.NET.mode === 'guest' || G.contest.ph !== 'idle' && !force || (!G.saveDirty && !force)) return;
    G.saveDirty = false;
    try { localStorage.setItem(KEY, JSON.stringify({ d: G.day, w: encodeWall(G.wall) })); } catch (e) { /* pełny dysk: ściana zostaje tylko w sesji */ }
}
function saveGallery(force) {
    if (!G || N.NET.mode === 'guest' || (!G.galleryDirty && !force)) return;
    G.galleryDirty = false;
    try { localStorage.setItem(GKEY, JSON.stringify({ w: G.week, l: G.gallery.map(e => ({ t: e.t, n: e.n, d: e.d, v: e.v, s: e.s })) })); } catch (e) { /* jw. */ }
}

// ---------- malowanie ----------
const canClear = () => G.contest.ph === 'idle' && (G.mode === 'private' || N.NET.mode !== 'guest');
const mySlot = () => { const s = G.contest.slots.me; return s === undefined ? -1 : s; };
function spray(v) { if (G.clock - G.sprayT > 0.9) { G.sprayT = G.clock; SFX.hiss({ x: POS.x - 1, y: POS.y, z: POS.z }, v); } }
function notice() {
    if (G.clock - G.noticeT < 2.5) return; G.noticeT = G.clock;
    toast(G.contest.ph === 'draw' ? (G.contest.ready.me ? 'Your work is saved for voting' : 'Contest: paint in your own column') : 'Contest: wait for the voting', '#ffb030');
}
function apply(cells) { if (paintCells(G.wall, cells) > 0) { G.term.dirty = true; G.saveDirty = true; return true; } return false; }
function paintAt(cx, cy) {
    if (G.mode === 'private' && G.contest.ph !== 'idle') setMode('shared');   // konkurs maluje się na wspólnej ścianie, w swojej kolumnie
    if (isPrivate()) {   // prywatny ekran: tylko lokalnie, bez sieci, hosta i limitów
        if (paintCells(G.priv, brushCells(cx, cy, WALL.BRUSHES[G.brush], G.color)) > 0) { G.term.dirty = true; G.privDirty = true; spray(0.1); }
        return;
    }
    let cells = brushCells(cx, cy, WALL.BRUSHES[G.brush], G.color);
    if (G.contest.ph !== 'idle') {
        cells = G.contest.ph === 'draw' && !G.contest.ready.me ? restrictToSlot(cells, mySlot()) : [];
        if (!cells.length) { notice(); return; }
    }
    if (!apply(cells)) return;
    spray(0.18);
    if (N.NET.mode === 'guest') N.sendLevelMsg({ k: 'gp', c: cells });   // do hosta; u siebie już namalowane
    else G.out.push(...cells);
}
function saveWork() {
    const k = G.contest; if (k.ph !== 'draw' || mySlot() < 0 || k.ready.me) return;
    k.ready.me = true; G.term.dirty = true; toast('Saved: your work goes to the voting board', '#7fff90');
    if (N.NET.mode === 'guest') N.sendLevelMsg({ k: 'gv' }); else G.ctNow = true;
}
// SAVE poza konkursem: CAŁY mural trafia jako plakat do Galerii (skalowany) (osobny przycisk w górnym pasku ściany)
const POSTER_CD = 20;
function addPoster(id, wall) {
    const cells = (wall || G.wall).slice(); if (!cells.some(v => v)) return false;   // cały mural 48x24; Galeria skaluje go do szerokości plakatu
    G.gallery = gallerySubmit(G.gallery, { t: 'My drawing', n: nameOf(id), o: id, d: encodeRle(cells), cells: cells, w: WALL.W });   // do publicznego głosowania; o = autor (host nie pozwala głosować na własną pracę) G.galleryDirty = true; G.gterm.dirty = true; G.snapNow = true;
    return true;
}
function savePoster() {
    if (G.contest.ph !== 'idle') { toast('During a contest use the SAVE button at the bottom', '#ffb030'); return; }
    if (G.clock - G.posterAt < POSTER_CD) { toast('Wait a moment before saving again', '#ffb030'); return; }
    G.posterAt = G.clock;
    const priv = G.mode === 'private';
    if (priv && !G.priv.some(v => v)) { toast('Your screen is empty, paint something first', '#ffb030'); return; }
    if (N.NET.mode === 'guest') { N.sendLevelMsg(priv ? { k: 'gq', w: encodeWall(G.priv) } : { k: 'gq' }); toast('Sent to the gallery board', '#7fff90'); return; }
    if (addPoster('me', priv ? G.priv : null)) toast('Saved to the gallery board', '#7fff90'); else toast('The wall is empty, paint something first', '#ffb030');
}
// Głosowanie na pracę w publicznej Galerii (host liczy, gość tylko prosi): jeden głos na pracę, nie na własną
function castVote(voterId, author) {
    const r = galleryVote(G.gallery, author, voterId, [nameOf(voterId)]);
    if (!r.ok) return r.reason;
    G.gallery = r.list; G.galleryDirty = true; G.gterm.dirty = true; G.snapNow = true;
    return '';
}
const VOTE_MSG = { own: 'You cannot vote for your own drawing', dup: 'You already voted for this one', none: 'That drawing is gone', full: 'Too many votes' };
function voteFor(e) {
    if (G.voted[e.n] === e.d) { toast(VOTE_MSG.dup, '#ffb030'); return; }
    if (N.NET.mode === 'guest') {
        if (e.n === nameOf('me')) { toast(VOTE_MSG.own, '#ffb030'); return; }
        G.voted[e.n] = e.d; N.sendLevelMsg({ k: 'gb', a: e.n }); toast('Vote sent for ' + e.n, '#7fff90'); G.gterm.dirty = true; return;
    }
    const why = castVote('me', e.n);
    if (why) { toast(VOTE_MSG[why] || 'Cannot vote', '#ffb030'); if (why === 'dup') G.voted[e.n] = e.d; return; }
    G.voted[e.n] = e.d; toast('Voted for ' + e.n, '#7fff90'); G.gterm.dirty = true;
}
function clearWall() { if (!canClear()) return; if (isPrivate()) { G.priv.fill(0); G.privDirty = true; G.term.dirty = true; return; } G.wall.fill(0); G.term.dirty = true; G.saveDirty = true; G.snapNow = true; }
function onWallClick() {
    const p = G.term.pointer; if (!p) return;
    const c = cellAt(p.x - AREA.x, p.y - AREA.y, AREA.w, AREA.h);
    if (c) { G.lastPaint = c[0] + ',' + c[1]; paintAt(c[0], c[1]); }
}

// ---------- rysowanie ekranów ----------
const mmss = (s) => { s = Math.max(0, Math.ceil(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
function slotName(slot) { const id = idOfSlot(G.contest.slots, slot); return id === null ? '' : (G.contest.names[id] || 'Player'); }
function draw(t) {
    const c = t.ctx, k = G.contest, pv = isPrivate(), wallV = viewWall(); t.background();
    if (k.ph === 'idle') {
        t.text(pv ? 'MY SCREEN' : 'GRAFFITI WALL', 32, 28, 28, pv ? '#9fd0ff' : AMBER, 'left', true);
        t.btn('post', 280, 8, 110, 42, 'SAVE', savePoster, { tone: 'ok', size: 22 });
        t.btn('mode', 400, 8, 230, 42, pv ? 'SHARED WALL' : 'MY SCREEN', () => setMode(pv ? 'shared' : 'private'), { tone: pv ? 'gold' : undefined, size: 20 });
        t.text(pv ? 'private: only you see it' : 'shared  |  fades daily', 992, 28, 20, pv ? '#9fd0ff' : AMBER_DIM, 'right', true);
    } else {
        t.text('THEME: ' + k.theme, 32, 28, 26, GOLD, 'left', true);
        const info = k.ph === 'draw' ? 'DRAW! ' + mmss(k.t) : (k.ph === 'vote' ? 'VOTE: stand on a pad ' + mmss(k.t) : (k.winner >= 0 ? 'WINNER: ' + slotName(k.winner) : 'NO VOTES'));
        t.text(info, 992, 28, 24, SLOT_COLS[k.ph === 'result' && k.winner >= 0 ? k.winner : 3], 'right', true);
    }
    c.fillStyle = WALL.BG; c.fillRect(AREA.x, AREA.y, AREA.w, AREA.h);
    const cw = AREA.w / WALL.W, ch = AREA.h / WALL.H;
    for (let y = 0; y < WALL.H; y++) for (let x = 0; x < WALL.W; x++) {
        const v = wallV[y * WALL.W + x]; if (!v) continue;
        c.fillStyle = WALL.COLORS[v]; c.fillRect(AREA.x + x * cw, AREA.y + y * ch, cw + 0.5, ch + 0.5);
    }
    if (k.ph !== 'idle') drawColumns(c, k);
    if (G.cell) {   // podgląd pędzla pod celownikiem
        const r = WALL.BRUSHES[G.brush] >= 3 ? 1 : 0;
        c.lineWidth = 3; c.strokeStyle = G.color ? WALL.COLORS[G.color] : '#000'; c.strokeRect(AREA.x + (G.cell[0] - r) * cw, AREA.y + (G.cell[1] - r) * ch, (2 * r + 1) * cw, (2 * r + 1) * ch);
        c.lineWidth = 1; c.strokeStyle = '#fff'; c.strokeRect(AREA.x + (G.cell[0] - r) * cw + 2, AREA.y + (G.cell[1] - r) * ch + 2, (2 * r + 1) * cw - 4, (2 * r + 1) * ch - 4);
    }
    t.buttons.push({ id: 'wall', x: AREA.x, y: AREA.y, w: AREA.w, h: AREA.h, action: onWallClick });
    // Paleta: 11 farb i gumka (0)
    for (let i = 1; i <= WALL.COLORS.length; i++) {
        const col = i % WALL.COLORS.length, x = 32 + (i - 1) * 64, y = 556, sel = G.color === col, hov = t.hover.has('col' + col);
        t.rrect(x, y, 56, 56, 8); c.fillStyle = col ? WALL.COLORS[col] : WALL.BG; c.fill();
        c.lineWidth = sel ? 6 : (hov ? 4 : 2); c.strokeStyle = sel ? GOLD : (hov ? '#fff' : AMBER_DIM); c.stroke();
        if (!col) t.text('X', x + 28, y + 29, 30, '#5a4628', 'center', true);
        t.buttons.push({ id: 'col' + col, x: x, y: y, w: 56, h: 56, action: () => { G.color = col; } });
    }
    for (let b = 0; b < WALL.BRUSHES.length; b++) t.btn('brush' + b, 808 + b * 64, 556, 56, 56, WALL.BRUSHES[b] + 'x', () => { G.brush = b; }, { active: G.brush === b, size: 24 });
    if (k.ph === 'draw' && mySlot() >= 0) t.btn('save', 936, 556, 56, 56, k.ready.me ? 'DONE' : 'SAVE', saveWork, { tone: 'ok', size: 15, disabled: !!k.ready.me });
    if (pv) { c.lineWidth = 6; c.strokeStyle = '#9fd0ff'; c.strokeRect(AREA.x - 3, AREA.y - 3, AREA.w + 6, AREA.h + 6); }
    if (canClear()) t.btn('clear', 936, 556, 56, 56, 'CLR', clearWall, { tone: 'bad', size: 20 });
}
// Kolumny konkursu: ramki w kolorach pól, nazwy autorów, głosy; kolumny bez autora przyciemnione
function drawColumns(c, k) {
    const colW = AREA.w / ROUND.SLOTS;
    for (let i = 0; i < ROUND.SLOTS; i++) {
        const x = AREA.x + i * colW, mine = mySlot() === i, has = idOfSlot(k.slots, i) !== null;
        if (!has) { c.fillStyle = 'rgba(0,0,0,0.5)'; c.fillRect(x, AREA.y, colW, AREA.h); continue; }
        c.lineWidth = mine ? 6 : 3; c.strokeStyle = k.ph === 'result' && k.winner === i ? '#ffd24a' : SLOT_COLS[i]; c.strokeRect(x + 2, AREA.y + 2, colW - 4, AREA.h - 4);
        c.fillStyle = 'rgba(10,6,2,0.78)'; c.fillRect(x + 4, AREA.y + AREA.h - 34, colW - 8, 30);
        const txt = slotName(i) + (k.ph === 'vote' || k.ph === 'result' ? '  ' + k.counts[i] : '');
        c.font = 'bold 20px "Courier New", monospace'; c.fillStyle = SLOT_COLS[i]; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(txt.slice(0, 22), x + colW / 2, AREA.y + AREA.h - 19);
    }
}
function drawGallery(t) {
    const c = t.ctx; t.background();
    t.text('PUBLIC GALLERY: VOTE FOR THE BEST', 320, 26, 24, AMBER, 'center', true);
    t.text('draw on MY SCREEN, press SAVE to enter it here', 320, 50, 17, AMBER_DIM, 'center', true);
    const list = galleryRank(G.gallery), me = G.term ? nameOf('me') : '';
    for (let i = 0; i < ROUND.GALLERY_MAX; i++) {
        const col = i % 3, row = Math.floor(i / 3), x0 = 16 + col * 208, y0 = 66 + row * 164, e = list[i], bw = 192, bh = 96;
        c.fillStyle = '#1c120a'; c.fillRect(x0, y0, bw, bh);
        if (!e) { c.lineWidth = 2; c.strokeStyle = '#3a2a14'; c.strokeRect(x0 + 1, y0 + 1, bw - 2, bh - 2); t.text('empty', x0 + 96, y0 + 48, 20, '#5a4628', 'center', true); continue; }
        const w = e.w || ROUND.COLS, cs = Math.min(bw / w, bh / WALL.H), pw = w * cs, ph = WALL.H * cs, px = x0 + (bw - pw) / 2, py = y0 + (bh - ph) / 2;   // cała praca skalowana do ramki 192 x 96
        c.fillStyle = WALL.BG; c.fillRect(px, py, pw, ph);
        for (let y = 0; y < WALL.H; y++) for (let x = 0; x < w; x++) { const v = e.cells[y * w + x]; if (v) { c.fillStyle = WALL.COLORS[v]; c.fillRect(px + x * cs, py + y * cs, cs + 0.5, cs + 0.5); } }
        c.lineWidth = 3; c.strokeStyle = i === 0 && e.v > 0 ? '#ffd24a' : AMBER_DIM; c.strokeRect(x0 + 1.5, y0 + 1.5, bw - 3, bh - 3);
        t.text((i === 0 && e.v > 0 ? '1. ' : '') + e.n, x0 + 4, y0 + 110, 17, i === 0 && e.v > 0 ? '#ffd24a' : '#e8d8b8', 'left', true);
        t.text('\u2665 ' + e.v, x0 + bw - 4, y0 + 110, 19, '#ff7a9a', 'right', true);
        const own = e.n === me || (e.o !== undefined && e.o === 'me'), done = G.voted[e.n] === e.d;
        t.btn('vote' + i, x0, y0 + 122, bw, 30, own ? 'YOUR DRAWING' : (done ? 'VOTED' : 'VOTE'), () => voteFor(e), { size: 18, tone: done ? 'ok' : 'gold', disabled: own || done });
    }
}

// ---------- pola głosowania (3D) ----------
function buildPads() {
    G.pads = ROUND.PADS.map((p, i) => {
        const col = new THREE.Color(SLOT_COLS[i]), grp = new THREE.Group(); grp.position.set(p[0], 0.03, p[1]); grp.visible = false; L.root.add(grp);
        const disc = new THREE.Mesh(new THREE.CircleGeometry(ROUND.PAD_R, 32), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.3, depthWrite: false, toneMapped: false }));
        const ring = new THREE.Mesh(new THREE.RingGeometry(ROUND.PAD_R - 0.08, ROUND.PAD_R, 40), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.95, depthWrite: false, toneMapped: false }));
        for (const m of [disc, ring]) { m.rotation.x = -Math.PI / 2; grp.add(m); }
        const cv = T.makeCanvas(256, 128), sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: T.toTex(cv, false), transparent: true, depthWrite: false, toneMapped: false }));
        sp.scale.set(1.2, 0.6, 1); sp.position.y = 1.6; grp.add(sp);
        return { grp: grp, cv: cv, sp: sp };
    });
}
function updatePads() {
    const k = G.contest, show = k.ph === 'vote' || k.ph === 'result', sig = k.ph + '|' + k.counts.join() + '|' + Object.keys(k.names).length + '|' + k.winner;
    G.pads.forEach((p, i) => { p.grp.visible = show && idOfSlot(k.slots, i) !== null; });
    if (!show || sig === G.padSig) return; G.padSig = sig;
    G.pads.forEach((p, i) => {
        if (!p.grp.visible) return;
        const x = p.cv.getContext('2d'); x.clearRect(0, 0, 256, 128); x.fillStyle = 'rgba(10,6,2,0.75)'; x.fillRect(0, 0, 256, 128);
        x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = SLOT_COLS[i]; x.font = 'bold 30px "Courier New", monospace'; x.fillText(slotName(i).slice(0, 12), 128, 36);
        x.font = 'bold 56px "Courier New", monospace'; x.fillText(k.winner === i ? '★ ' + k.counts[i] : String(k.counts[i]), 128, 88);
        p.sp.material.map.needsUpdate = true;
    });
}

// ---------- sieć ----------
const MSG = new Set(['gp', 'gd', 'gs', 'gc', 'gv', 'gq', 'gb']);
// Zwraca true, gdy wiadomość należy do ściany (lobbyplay nie przetwarza jej dalej)
export function onGraffitiMsg(msg, from) {
    if (!msg || typeof msg.k !== 'string' || !MSG.has(msg.k)) return false;
    if (!G) return true;
    if (N.NET.mode === 'host' && msg.k === 'gb') {   // głos gościa na pracę w Galerii: autor po nicku wpisu, głosujący po identyfikatorze sieciowym, przy tablicy, z limitem tempa
        const st = N.playersState[from];
        if (typeof msg.a !== 'string' || msg.a.length > 20 || !st || st.lvl !== 'lobby' || !st.head || !near(headOf(from), GPOS)) return true;
        if (G.clock - (G.voteBy[from] === undefined ? -99 : G.voteBy[from]) < 0.4) return true;
        G.voteBy[from] = G.clock; castVote(from, msg.a);
        return true;
    }
    if (N.NET.mode === 'host' && msg.k === 'gq') {   // gość zapisuje plakat: tylko w spokoju, przy ścianie, z limitem częstotliwości; nick z weryfikowanego stanu
        const st = N.playersState[from];
        if (G.contest.ph !== 'idle' || !st || st.lvl !== 'lobby' || !st.head || !near(headOf(from), POS)) return true;
        if (G.clock - (G.posterBy[from] === undefined ? -99 : G.posterBy[from]) < POSTER_CD) return true;
        const pw = msg.w === undefined ? null : decodeWall(msg.w);   // rysunek z prywatnego ekranu gościa: tylko przez walidator ściany
        if (msg.w !== undefined && !pw) return true;
        G.posterBy[from] = G.clock; addPoster(from, pw);
        return true;
    }
    if (N.NET.mode === 'host' && msg.k === 'gv') {   // gość zapisał pracę: liczy się tylko jego kolumna w fazie rysowania
        const k = G.contest; if (k.ph === 'draw' && k.slots[from] !== undefined && !k.ready[from]) { k.ready[from] = true; G.ctNow = true; G.term.dirty = true; }
        return true;
    }
    if (N.NET.mode === 'host' && msg.k === 'gp') {
        const st = N.playersState[from];
        if (!st || st.lvl !== 'lobby' || !st.head) return true;
        let cells = cleanCells(msg.c);
        if (G.contest.ph !== 'idle') cells = G.contest.ph === 'draw' && !G.contest.ready[from] ? restrictToSlot(cells, G.contest.slots[from]) : [];
        if (!cells.length) return true;
        const b = G.buckets[from] || (G.buckets[from] = makeBucket(G.clock));
        if (!takeTokens(b, cells.length / 3, G.clock)) return true;
        if (!near(headOf(from), POS)) return true;
        if (apply(cells)) { G.out.push(...cells); spray(0.12); }
    } else if (N.NET.mode === 'guest') {   // gość słucha tylko hosta (levelHandler dostaje 'host' jako nadawcę)
        if (msg.k === 'gd') { if (apply(cleanCells(msg.c))) spray(0.12); }
        else if (msg.k === 'gs') {
            const w = decodeWall(msg.w);
            if (w && Number.isInteger(msg.d)) { G.wall = w; G.day = msg.d; G.term.dirty = true; }
            if (Array.isArray(msg.g)) { G.gallery = cleanGallery(msg.g); G.gterm.dirty = true; }
        } else if (msg.k === 'gc') guestContest(cleanContest(msg));
    }
    return true;
}
function flush() {
    if (N.NET.mode !== 'host') { G.out.length = 0; return; }
    const step = WALL.MAX_CELLS * 3;
    for (let i = 0; i < G.out.length; i += step) N.sendLevelMsg({ k: 'gd', c: G.out.slice(i, i + step) });
    G.out.length = 0;
}
function sendSnapshot() { N.sendLevelMsg({ k: 'gs', d: G.day, w: encodeWall(G.wall), g: G.gallery.map(e => ({ t: e.t, n: e.n, d: e.d, v: e.v })) }); }
function sendContest() {
    const k = G.contest;
    N.sendLevelMsg({ k: 'gc', p: k.ph, t: Math.round(k.t * 10) / 10, th: k.theme, s: Object.keys(k.slots).map(id => [toNet(id), k.slots[id], k.names[id] || 'Player', k.ready[id] ? 1 : 0]), c: k.counts, w: k.winner });
}

// ---------- konkurs: host liczy, goście wyświetlają ----------
const nameOf = (id) => id === 'me' ? safeName(SAVE.profile.name || 'You') : safeName(((N.playersState[id] || {}).profile || {}).name);
function restoreWall() { if (G.saved) { G.wall = G.saved; G.saved = null; } G.term.dirty = true; G.saveDirty = true; G.snapNow = true; }
function contestHost(dt, o) {
    const ids = participants('lobby'), heads = {}, k = G.contest;
    for (const id of ids) { const h = headOf(id); if (h) heads[id] = { x: h.x, z: h.z }; }
    const r = contestStep({ ph: k.ph, t: k.t }, dt, { enabled: o.enabled, present: ids.length, blocked: o.night !== 'calm', ready: k.ph === 'draw' && Object.keys(k.slots).length > 0 && Object.keys(k.slots).every(id => k.ready[id]) }, Math.random);
    k.ph = r.ph; k.t = r.t;
    if (k.ph === 'vote') k.counts = countVotes(heads, k.slots);
    if (!r.event) return;
    G.ctNow = true;
    if (r.event === 'start') {
        k.theme = pickTheme(Math.random); k.slots = assignSlots(ids); k.ready = {}; k.names = {}; for (const id in k.slots) k.names[id] = nameOf(id);
        k.counts = ROUND.PADS.map(() => 0); k.winner = -1; G.saved = G.wall.slice(); G.wall.fill(0); G.term.dirty = true; G.snapNow = true;
        toast('Graffiti contest: ' + k.theme, GOLD);
    } else if (r.event === 'vote') toast('Vote: stand on a pad (not yours)', GOLD);
    else if (r.event === 'result') {
        k.winner = winnerOf(k.counts, Math.random);
        if (k.winner < 0) toast('Nobody got a vote', '#e0533f');
        else {
            const wid = idOfSlot(k.slots, k.winner), name = k.names[wid] || 'Player', cells = extractSlot(G.wall, k.winner);
            G.gallery = gallerySubmit(G.gallery, { t: k.theme, n: name, d: encodeRle(cells), cells: cells, w: ROUND.COLS }); G.galleryDirty = true; G.gterm.dirty = true; G.snapNow = true;
            toast(name + ' wins the contest!', '#7fff90'); SFX.bell && SFX.bell();
            if (wid === 'me') levelReward('graffiti', ROUND.REWARD, ROUND.REWARD_REPEAT, 'won the graffiti contest');
        }
    } else { // end albo abort: wraca ściana sprzed konkursu
        if (r.event === 'abort') toast('Graffiti contest cancelled', '#e0533f');
        restoreWall(); k.slots = {}; k.names = {}; k.ready = {}; k.winner = -1;
    }
}
function guestContest(st) {
    if (!st) return;
    const k = G.contest, prev = k.ph; G.lastGc = G.clock;
    k.ph = st.ph; k.t = st.t; k.theme = st.theme; k.counts = st.counts; k.winner = st.winner; k.slots = {}; k.names = {}; k.ready = {};
    for (const e of st.slots) { const id = fromNet(e.id); k.slots[id] = e.slot; k.names[id] = e.name; if (e.ready) k.ready[id] = true; }
    G.term.dirty = true;
    if (prev === k.ph) return;
    if (k.ph === 'draw') toast('Graffiti contest: ' + k.theme, GOLD);
    else if (k.ph === 'vote') toast('Vote: stand on a pad (not yours)', GOLD);
    else if (k.ph === 'result') {
        if (k.winner < 0) toast('Nobody got a vote', '#e0533f');
        else { toast(slotName(k.winner) + ' wins the contest!', '#7fff90'); if (idOfSlot(k.slots, k.winner) === 'me') levelReward('graffiti', ROUND.REWARD, ROUND.REWARD_REPEAT, 'won the graffiti contest'); }
    }
}

// ---------- co klatkę ----------
// o: { dim (jasność lobby 0..1), night (faza Nocnej Zmiany), enabled (wydarzenia lobby włączone) }
export function updateGraffiti(dt, auth, o) {
    if (!G) return;
    o = o || { dim: 1, night: 'calm', enabled: true };
    G.clock += dt;
    const dim = Math.max(0.12, o.dim);
    if (dim !== G.dim) { G.dim = dim; for (const t of [G.term, G.gterm]) if (t.mesh) t.mesh.material.color.setScalar(dim); }
    const t = G.term, p = t.pointer, c = p && cellAt(p.x - AREA.x, p.y - AREA.y, AREA.w, AREA.h), key = c ? c[0] + ',' + c[1] : '';
    if ((G.cell ? G.cell[0] + ',' + G.cell[1] : '') !== key) { G.cell = c || null; t.dirty = true; }
    if (c && isMouseDown() && key !== G.lastPaint) { G.lastPaint = key; paintAt(c[0], c[1]); }
    if (!c) G.lastPaint = '';
    for (let i = 0; i < 2; i++) {   // VR: przytrzymany spust na ścianie = rysowanie
        const h = pointerHit(i), vc = triggerDown(i) && h && h.term === t ? cellAt(h.px - AREA.x, h.py - AREA.y, AREA.w, AREA.h) : null, vk = vc ? vc[0] + ',' + vc[1] : '';
        if (vc && vk !== G.vrLast[i]) paintAt(vc[0], vc[1]);
        G.vrLast[i] = vk;
    }
    const k = G.contest, sec = k.ph === 'idle' ? -1 : Math.ceil(k.t);
    if (sec !== G.sec) { G.sec = sec; t.dirty = true; }
    if (N.NET.mode === 'guest' && k.ph !== 'idle' && G.clock - G.lastGc > 3) { G.contest = newContest(false); G.term.dirty = true; }   // host zniknął w trakcie konkursu
    updatePads();
    if (!auth || N.NET.mode === 'guest') return;
    contestHost(dt, o);
    G.dayT -= dt;
    if (G.dayT <= 0) {
        G.dayT = 1;
        if (k.ph === 'idle') {
            const now = Date.now(), dk = dayKey(now), wk = weekKey(now);
            if (dk !== G.day) { G.day = dk; clearWall(); }
            if (wk !== G.week) { G.week = wk; G.gallery = []; G.galleryDirty = true; G.gterm.dirty = true; G.snapNow = true; }
        }
    }
    G.deltaT -= dt; if (G.deltaT <= 0) { G.deltaT = DELTA_EVERY; flush(); }
    if (N.NET.mode === 'host') {
        G.ctT -= dt; if (G.ctNow || (k.ph !== 'idle' && G.ctT <= 0)) { G.ctT = CONTEST_EVERY; G.ctNow = false; sendContest(); }
        G.snapT -= dt; if (G.snapT <= 0 || G.snapNow) { G.snapT = SNAP_EVERY; G.snapNow = false; sendSnapshot(); }
    } else { G.ctNow = false; G.snapNow = false; }
    G.saveT -= dt; if (G.saveT <= 0) { G.saveT = SAVE_EVERY; save(false); saveGallery(false); savePrivate(false); }
}
export function debugGraffiti() { return G ? { wall: G.wall, day: G.day, color: G.color, brush: G.brush, contest: G.contest, gallery: G.gallery } : null; }
