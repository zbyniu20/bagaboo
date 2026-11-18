// ==========================================
// KONKURS NA ŚCIANIE GRAFFITI (lobby): czysta logika, testowana w Node (tests/logic.mjs). Bez THREE, DOM i sieci.
// Co 25-40 minut (pierwszy po 10-15), gdy w lobby są co najmniej 2 osoby: temat, 2 minuty rysowania (każdy w swojej kolumnie ściany),
// 20 s głosowania (gracze stają na polach przed ściana; własne pole się nie liczy) i wynik. Zwycięski plakat trafia do Galerii tygodnia.
// Host liczy wszystko z własnego widoku graczy (pozycje głów); goście dostają tylko stan i walidują go przez cleanContest / cleanGallery.
// ==========================================
import { WALL, dayKey, decodeRle } from './graffitilogic.js';

export const ROUND = {
    SLOTS: 4,                       // kolumny ściany = uczestnicy
    COLS: WALL.W / 4,               // szerokość kolumny w komórkach (12)
    MIN_PLAYERS: 2,
    DRAW: 120, VOTE: 20, RESULT: 12,
    FIRST: [600, 900], EVERY: [1500, 2400],   // sekundy do pierwszego i kolejnych konkursów
    REWARD: 80, REWARD_REPEAT: 25,
    // Pola głosowania: środki kolumn ściany (ściana jest na x=14.9, wyśrodkowana na z=3.5), 2,5 m przed nią
    PADS: [[12.4, 1.39], [12.4, 2.8], [12.4, 4.2], [12.4, 5.61]], PAD_R: 0.62,
    GALLERY_MAX: 9, VOTE_MAX: 9999, VOTERS_MAX: 200,   // publiczna Galeria: do 9 prac, każda z licznikiem głosów
    THEMES: ['A monster in the wardrobe', 'Gooby in a hat', 'The haunted hotel', 'A cursed banana', 'The Well at midnight', 'My dream room', 'Night shift hero', 'A cat that knows too much',
        'Lost in the maze', 'The friendliest ghost', 'A very scary sandwich', 'The last tile', 'Red light, green light', 'A spooky selfie', 'The cemetery party', 'A sleepy zombie'],
};
export const POSTER_LEN = ROUND.COLS * WALL.H;
export const WIDE_LEN = WALL.W * WALL.H;   // plakat z całej ściany (przycisk SAVE poza konkursem); kolumna zwycięzcy ma POSTER_LEN
const rnd01 = (rnd) => (typeof rnd === 'function' ? rnd() : Math.random());

export const nextContestIn = (first, rnd) => { const r = first ? ROUND.FIRST : ROUND.EVERY; return r[0] + rnd01(rnd) * (r[1] - r[0]); };
export const pickTheme = (rnd) => ROUND.THEMES[Math.min(ROUND.THEMES.length - 1, Math.floor(rnd01(rnd) * ROUND.THEMES.length))];

// Maszyna faz: st = { ph: 'idle' | 'draw' | 'vote' | 'result', t }; ctx = { enabled, present, blocked, ready }.
// Zwraca { ph, t, event } z event: 'start' | 'vote' | 'result' | 'end' | 'abort' | null
export function contestStep(st, dt, ctx, rnd) {
    let ph = st.ph, t = st.t, event = null;
    if (ph === 'idle') {
        if (ctx.enabled && !ctx.blocked) t = Math.max(0, t - dt);
        if (t <= 0 && ctx.enabled && !ctx.blocked && ctx.present >= ROUND.MIN_PLAYERS) { ph = 'draw'; t = ROUND.DRAW; event = 'start'; }
        return { ph, t, event };
    }
    t -= dt;
    if (ph === 'draw') {
        if (ctx.present < ROUND.MIN_PLAYERS || !ctx.enabled) return { ph: 'idle', t: nextContestIn(false, rnd), event: 'abort' };
        if (t <= 0 || ctx.ready) { ph = 'vote'; t = ROUND.VOTE; event = 'vote'; }   // ctx.ready: wszyscy autorzy zapisali prace (przycisk SAVE)
    } else if (ph === 'vote') {
        if (ctx.present < 1 || !ctx.enabled) return { ph: 'idle', t: nextContestIn(false, rnd), event: 'abort' };
        if (t <= 0) { ph = 'result'; t = ROUND.RESULT; event = 'result'; }
    } else if (ph === 'result' && t <= 0) return { ph: 'idle', t: nextContestIn(false, rnd), event: 'end' };
    return { ph, t, event };
}

// Kolumny dostaje do 4 pierwszych uczestników z listy (reszta tylko głosuje): { id: slot }
export function assignSlots(ids) { const m = {}; ids.slice(0, ROUND.SLOTS).forEach((id, i) => { m[id] = i; }); return m; }
export const idOfSlot = (slots, slot) => { for (const id in slots) if (slots[id] === slot) return id; return null; };

// Przycina pociągnięcie do kolumny gracza (slot < 0 albo brak = nic nie maluje)
export function restrictToSlot(cells, slot) {
    if (!Number.isInteger(slot) || slot < 0 || slot >= ROUND.SLOTS) return [];
    const out = [];
    for (let i = 0; i + 2 < cells.length; i += 3) if (Math.floor(cells[i] / ROUND.COLS) === slot) out.push(cells[i], cells[i + 1], cells[i + 2]);
    return out;
}

// Głosy z pozycji głów: heads = { id: { x, z } }, slots = { id: slot }. Głos idzie na najbliższe pole w promieniu PAD_R;
// własne pole się nie liczy, pola kolumn bez autora też nie. Zwraca tablicę liczników na pole.
export function countVotes(heads, slots) {
    const counts = ROUND.PADS.map(() => 0), used = new Set(Object.values(slots));
    for (const id in heads) {
        const h = heads[id]; if (!h) continue;
        let best = -1, bd = ROUND.PAD_R;
        ROUND.PADS.forEach((p, i) => { const d = Math.hypot(h.x - p[0], h.z - p[1]); if (d <= bd) { bd = d; best = i; } });
        if (best < 0 || !used.has(best) || slots[id] === best) continue;
        counts[best]++;
    }
    return counts;
}
// Zwycięzca: pole z największą liczbą głosów (>0); remis losuje się między remisującymi; brak głosów = -1
export function winnerOf(counts, rnd) {
    const max = Math.max(0, ...counts); if (max <= 0) return -1;
    const tied = counts.map((c, i) => c === max ? i : -1).filter(i => i >= 0);
    return tied[Math.min(tied.length - 1, Math.floor(rnd01(rnd) * tied.length))];
}

// Plakat zwycięzcy: kopia kolumny (COLS x H, wiersz po wierszu)
export function extractSlot(wall, slot) {
    const out = new Uint8Array(POSTER_LEN);
    for (let y = 0; y < WALL.H; y++) for (let x = 0; x < ROUND.COLS; x++) out[y * ROUND.COLS + x] = wall[y * WALL.W + slot * ROUND.COLS + x];
    return out;
}

// ---------- Galeria tygodnia ----------
export const weekKey = (ms) => Math.floor(dayKey(ms) / 7);
const cleanText = (s, max) => String(s === undefined || s === null ? '' : s).replace(/[^A-Za-z0-9 ,.'!?-]/g, '').slice(0, max);
const cleanName = (s) => String(s === undefined || s === null ? '' : s).replace(/[^A-Za-z0-9_-]/g, '').slice(0, 16) || 'Player';
// Wpis Galerii: { t: temat, n: nick autora (klucz wpisu: jedna praca na autora), d: plakat jako RLE (kolumna 12x24 albo cała ściana 48x24), w: szerokość w komórkach,
//   v: liczba głosów, s: klucze głosujących (tylko u hosta i w jego zapisie, przez sieć nie idą) }
export function cleanGallery(raw) {
    if (!Array.isArray(raw)) return [];
    const out = [];
    for (const e of raw.slice(0, ROUND.GALLERY_MAX)) {
        if (!e || typeof e !== 'object') continue;
        let w = ROUND.COLS, cells = decodeRle(e.d, POSTER_LEN);   // wąski (kolumna) albo szeroki (cała ściana): szerokość wynika z długości danych
        if (!cells) { cells = decodeRle(e.d, WIDE_LEN); w = WALL.W; }
        if (!cells) continue;
        const s = Array.isArray(e.s) ? e.s.filter(x => typeof x === 'string' && x.length <= 80).slice(0, ROUND.VOTERS_MAX) : [];
        out.push({ t: cleanText(e.t, 40), n: cleanName(e.n), d: e.d, cells: cells, w: w, v: Number.isInteger(e.v) && e.v >= 0 && e.v <= ROUND.VOTE_MAX ? e.v : 0, s: s });
    }
    return out;
}
// Zgłoszenie pracy do głosowania: jeden wpis na autora (nowa praca zastępuje starą i zeruje głosy, żeby nie dało się podmienić rysunku po zebraniu głosów).
// Gdy tablica jest pełna, odpada wpis z najmniejszą liczbą głosów (przy remisie najstarszy). Wpis dostaje v = 0 i pustą listę głosujących.
export function gallerySubmit(list, entry) {
    const e = Object.assign({}, entry, { v: 0, s: [] }), rest = list.filter(x => x.n !== e.n), all = [e].concat(rest);
    if (all.length <= ROUND.GALLERY_MAX) return all;
    let drop = -1;
    for (let i = 1; i < all.length; i++) if (drop < 0 || all[i].v <= all[drop].v) drop = i;   // ostatni z najmniejszą liczbą głosów = najstarszy
    all.splice(drop, 1); return all;
}
// Głos: voter = klucz głosującego, ownKeys = jego klucze autora (nick i identyfikator). Zwraca { ok, list, reason } (reason: 'none' | 'own' | 'dup' | 'full')
export function galleryVote(list, author, voter, ownKeys) {
    const i = list.findIndex(x => x.n === author); if (i < 0) return { ok: false, list: list, reason: 'none' };
    const e = list[i];
    if (typeof voter !== 'string' || !voter) return { ok: false, list: list, reason: 'none' };
    if (e.n === voter || (Array.isArray(ownKeys) && ownKeys.includes(e.n)) || (e.o !== undefined && e.o === voter)) return { ok: false, list: list, reason: 'own' };
    if (e.s.includes(voter)) return { ok: false, list: list, reason: 'dup' };
    if (e.v >= ROUND.VOTE_MAX) return { ok: false, list: list, reason: 'full' };
    const next = list.slice(); next[i] = Object.assign({}, e, { v: e.v + 1, s: e.s.concat(voter).slice(-ROUND.VOTERS_MAX) });
    return { ok: true, list: next, reason: '' };
}
// Kolejność wyświetlania: najwięcej głosów pierwsze, przy remisie nowsze (wcześniejsze na liście)
export const galleryRank = (list) => list.map((e, i) => [e, i]).sort((a, b) => b[0].v - a[0].v || a[1] - b[1]).map(x => x[0]);

// ---------- stan konkursu od hosta (goście) ----------
const PHASES = new Set(['idle', 'draw', 'vote', 'result']);
// raw = { p, t, th, s: [[idSieciowy, slot, nick, 1 gdy zapisał pracę]], c: [liczniki], w: slotZwycięzcy }; zwraca czysty stan albo null
export function cleanContest(raw) {
    if (!raw || typeof raw !== 'object' || !PHASES.has(raw.p)) return null;
    const slots = [], seen = new Set();
    for (const e of (Array.isArray(raw.s) ? raw.s.slice(0, ROUND.SLOTS) : [])) {
        if (!Array.isArray(e) || typeof e[0] !== 'string' || e[0].length > 80 || !Number.isInteger(e[1]) || e[1] < 0 || e[1] >= ROUND.SLOTS || seen.has(e[1])) continue;
        seen.add(e[1]); slots.push({ id: e[0], slot: e[1], name: cleanName(e[2]), ready: e[3] === 1 });
    }
    const counts = ROUND.PADS.map((_, i) => { const v = Array.isArray(raw.c) ? raw.c[i] : 0; return Number.isInteger(v) && v >= 0 && v < 100 ? v : 0; });
    const t = Number.isFinite(raw.t) ? Math.max(0, Math.min(600, raw.t)) : 0;
    return { ph: raw.p, t: t, theme: cleanText(raw.th, 40), slots: slots, counts: counts, winner: Number.isInteger(raw.w) && raw.w >= 0 && raw.w < ROUND.SLOTS ? raw.w : -1 };
}
