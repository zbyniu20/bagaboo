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
import { ROUND, nextContestIn, pickTheme, contestStep, assignSlots, idOfSlot, restrictToSlot, countVotes, winnerOf, extractSlot, weekKey, cleanGallery, galleryAdd, cleanContest } from './graffitiround.js';

const POS = { x: 14.9, y: 2.4, z: 3.5 };            // środek ściany
const GPOS = { x: 14.9, y: 2.4, z: 9.4 };           // środek Galerii
const AREA = { x: 32, y: 56, w: 960, h: 480 };      // obszar obrazu na płótnie terminala (1024 x 640)
const KEY = 'bagaboo_graffiti_v1', GKEY = 'bagaboo_gallery_v1';
const SNAP_EVERY = 8, DELTA_EVERY = 0.2, SAVE_EVERY = 5, CONTEST_EVERY = 0.5;
const SLOT_COLS = ['#ff6a4a', '#6ad0ff', '#a0ff60', '#ffd24a'];
let G = null;

const newContest = (first) => ({ ph: 'idle', t: nextContestIn(first, Math.random), theme: '', slots: {}, names: {}, counts: ROUND.PADS.map(() => 0), winner: -1 });

export function buildGraffiti() {
    G = {
        wall: emptyWall(), day: dayKey(Date.now()), week: weekKey(Date.now()), gallery: [], color: 3, brush: 0, cell: null, lastPaint: '', vrLast: ['', ''], out: [], buckets: {},
        clock: 0, snapT: 1, deltaT: 0, saveT: SAVE_EVERY, dayT: 1, snapNow: false, saveDirty: false, galleryDirty: false, sprayT: -9, noticeT: -9, dim: 1,
        contest: newContest(true), saved: null, ctT: 0, ctNow: false, lastGc: 0, sec: -1, padSig: '', term: null, gterm: null
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
    save(true); saveGallery(true);
    for (const t of [G.term, G.gterm]) { const i = terminals.indexOf(t); if (i >= 0) terminals.splice(i, 1); }
    G = null;
}

// ---------- zapis dnia i tygodnia (host i solo) ----------
function load() {
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
    try { localStorage.setItem(GKEY, JSON.stringify({ w: G.week, l: G.gallery.map(e => ({ t: e.t, n: e.n, d: e.d })) })); } catch (e) { /* jw. */ }
}

// ---------- malowanie ----------
const canClear = () => N.NET.mode !== 'guest' && G.contest.ph === 'idle';
const mySlot = () => { const s = G.contest.slots.me; return s === undefined ? -1 : s; };
function spray(v) { if (G.clock - G.sprayT > 0.9) { G.sprayT = G.clock; SFX.hiss({ x: POS.x - 1, y: POS.y, z: POS.z }, v); } }
function notice() {
    if (G.clock - G.noticeT < 2.5) return; G.noticeT = G.clock;
    toast(G.contest.ph === 'draw' ? 'Contest: paint in your own column' : 'Contest: wait for the voting', '#ffb030');
}
function apply(cells) { if (paintCells(G.wall, cells) > 0) { G.term.dirty = true; G.saveDirty = true; return true; } return false; }
function paintAt(cx, cy) {
    let cells = brushCells(cx, cy, WALL.BRUSHES[G.brush], G.color);
    if (G.contest.ph !== 'idle') {
        cells = G.contest.ph === 'draw' ? restrictToSlot(cells, mySlot()) : [];
        if (!cells.length) { notice(); return; }
    }
    if (!apply(cells)) return;
    spray(0.18);
    if (N.NET.mode === 'guest') N.sendLevelMsg({ k: 'gp', c: cells });   // do hosta; u siebie już namalowane
    else G.out.push(...cells);
}
function clearWall() { if (!canClear()) return; G.wall.fill(0); G.term.dirty = true; G.saveDirty = true; G.snapNow = true; }
function onWallClick() {
    const p = G.term.pointer; if (!p) return;
    const c = cellAt(p.x - AREA.x, p.y - AREA.y, AREA.w, AREA.h);
    if (c) { G.lastPaint = c[0] + ',' + c[1]; paintAt(c[0], c[1]); }
}

// ---------- rysowanie ekranów ----------
const mmss = (s) => { s = Math.max(0, Math.ceil(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
function slotName(slot) { const id = idOfSlot(G.contest.slots, slot); return id === null ? '' : (G.contest.names[id] || 'Player'); }
function draw(t) {
    const c = t.ctx, k = G.contest; t.background();
    if (k.ph === 'idle') {
        t.text('GRAFFITI WALL', 32, 28, 28, AMBER, 'left', true);
        t.text('click to paint, hold to draw  |  fades daily', 992, 28, 20, AMBER_DIM, 'right', true);
    } else {
        t.text('THEME: ' + k.theme, 32, 28, 26, GOLD, 'left', true);
        const info = k.ph === 'draw' ? 'DRAW! ' + mmss(k.t) : (k.ph === 'vote' ? 'VOTE: stand on a pad ' + mmss(k.t) : (k.winner >= 0 ? 'WINNER: ' + slotName(k.winner) : 'NO VOTES'));
        t.text(info, 992, 28, 24, SLOT_COLS[k.ph === 'result' && k.winner >= 0 ? k.winner : 3], 'right', true);
    }
    c.fillStyle = WALL.BG; c.fillRect(AREA.x, AREA.y, AREA.w, AREA.h);
    const cw = AREA.w / WALL.W, ch = AREA.h / WALL.H;
    for (let y = 0; y < WALL.H; y++) for (let x = 0; x < WALL.W; x++) {
        const v = G.wall[y * WALL.W + x]; if (!v) continue;
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
    t.text('GALLERY: WINNERS OF THE WEEK', 320, 30, 24, AMBER, 'center', true);
    for (let i = 0; i < ROUND.GALLERY_MAX; i++) {
        const x0 = 16 + i * 208, y0 = 66, e = G.gallery[i], cs = 16;
        c.fillStyle = e ? WALL.BG : '#1c120a'; c.fillRect(x0, y0, ROUND.COLS * cs, WALL.H * cs);
        if (e) {
            for (let y = 0; y < WALL.H; y++) for (let x = 0; x < ROUND.COLS; x++) { const v = e.cells[y * ROUND.COLS + x]; if (v) { c.fillStyle = WALL.COLORS[v]; c.fillRect(x0 + x * cs, y0 + y * cs, cs + 0.5, cs + 0.5); } }
            c.lineWidth = 4; c.strokeStyle = i === 0 ? '#ffd24a' : AMBER_DIM; c.strokeRect(x0 + 2, y0 + 2, ROUND.COLS * cs - 4, WALL.H * cs - 4);
            wrapText(e.t, 17).slice(0, 2).forEach((ln, j) => t.text(ln, x0 + 96, 468 + j * 22, 18, '#e8d8b8', 'center', true));
            t.text('by ' + e.n, x0 + 96, 524, 20, AMBER, 'center', true);
        } else { c.lineWidth = 2; c.strokeStyle = '#3a2a14'; c.strokeRect(x0 + 1, y0 + 1, ROUND.COLS * cs - 2, WALL.H * cs - 2); t.text('empty', x0 + 96, y0 + 192, 22, '#5a4628', 'center', true); }
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
const MSG = new Set(['gp', 'gd', 'gs', 'gc']);
// Zwraca true, gdy wiadomość należy do ściany (lobbyplay nie przetwarza jej dalej)
export function onGraffitiMsg(msg, from) {
    if (!msg || typeof msg.k !== 'string' || !MSG.has(msg.k)) return false;
    if (!G) return true;
    if (N.NET.mode === 'host' && msg.k === 'gp') {
        const st = N.playersState[from];
        if (!st || st.lvl !== 'lobby' || !st.head) return true;
        let cells = cleanCells(msg.c);
        if (G.contest.ph !== 'idle') cells = G.contest.ph === 'draw' ? restrictToSlot(cells, G.contest.slots[from]) : [];
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
function sendSnapshot() { N.sendLevelMsg({ k: 'gs', d: G.day, w: encodeWall(G.wall), g: G.gallery.map(e => ({ t: e.t, n: e.n, d: e.d })) }); }
function sendContest() {
    const k = G.contest;
    N.sendLevelMsg({ k: 'gc', p: k.ph, t: Math.round(k.t * 10) / 10, th: k.theme, s: Object.keys(k.slots).map(id => [toNet(id), k.slots[id], k.names[id] || 'Player']), c: k.counts, w: k.winner });
}

// ---------- konkurs: host liczy, goście wyświetlają ----------
const nameOf = (id) => id === 'me' ? safeName(SAVE.profile.name || 'You') : safeName(((N.playersState[id] || {}).profile || {}).name);
function restoreWall() { if (G.saved) { G.wall = G.saved; G.saved = null; } G.term.dirty = true; G.saveDirty = true; G.snapNow = true; }
function contestHost(dt, o) {
    const ids = participants('lobby'), heads = {}, k = G.contest;
    for (const id of ids) { const h = headOf(id); if (h) heads[id] = { x: h.x, z: h.z }; }
    const r = contestStep({ ph: k.ph, t: k.t }, dt, { enabled: o.enabled, present: ids.length, blocked: o.night !== 'calm' }, Math.random);
    k.ph = r.ph; k.t = r.t;
    if (k.ph === 'vote') k.counts = countVotes(heads, k.slots);
    if (!r.event) return;
    G.ctNow = true;
    if (r.event === 'start') {
        k.theme = pickTheme(Math.random); k.slots = assignSlots(ids); k.names = {}; for (const id in k.slots) k.names[id] = nameOf(id);
        k.counts = ROUND.PADS.map(() => 0); k.winner = -1; G.saved = G.wall.slice(); G.wall.fill(0); G.term.dirty = true; G.snapNow = true;
        toast('Graffiti contest: ' + k.theme, GOLD);
    } else if (r.event === 'vote') toast('Vote: stand on a pad (not yours)', GOLD);
    else if (r.event === 'result') {
        k.winner = winnerOf(k.counts, Math.random);
        if (k.winner < 0) toast('Nobody got a vote', '#e0533f');
        else {
            const wid = idOfSlot(k.slots, k.winner), name = k.names[wid] || 'Player', cells = extractSlot(G.wall, k.winner);
            G.gallery = galleryAdd(G.gallery, { t: k.theme, n: name, d: encodeRle(cells), cells: cells }); G.galleryDirty = true; G.gterm.dirty = true; G.snapNow = true;
            toast(name + ' wins the contest!', '#7fff90'); SFX.bell && SFX.bell();
            if (wid === 'me') levelReward('graffiti', ROUND.REWARD, ROUND.REWARD_REPEAT, 'won the graffiti contest');
        }
    } else { // end albo abort: wraca ściana sprzed konkursu
        if (r.event === 'abort') toast('Graffiti contest cancelled', '#e0533f');
        restoreWall(); k.slots = {}; k.names = {}; k.winner = -1;
    }
}
function guestContest(st) {
    if (!st) return;
    const k = G.contest, prev = k.ph; G.lastGc = G.clock;
    k.ph = st.ph; k.t = st.t; k.theme = st.theme; k.counts = st.counts; k.winner = st.winner; k.slots = {}; k.names = {};
    for (const e of st.slots) { const id = fromNet(e.id); k.slots[id] = e.slot; k.names[id] = e.name; }
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
    G.saveT -= dt; if (G.saveT <= 0) { G.saveT = SAVE_EVERY; save(false); saveGallery(false); }
}
export function debugGraffiti() { return G ? { wall: G.wall, day: G.day, color: G.color, brush: G.brush, contest: G.contest, gallery: G.gallery } : null; }
