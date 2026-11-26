// ==========================================
// SCARY GTA: SKOKI KASKADERSKIE (czysta logika, bez THREE), jak "unique stunt jumps" z GTA: 5 skoków z dachów, na które da się wejść bez skoku (wieża kasyna po rusztowaniu, wieża radiowa), oraz jeden
// "przeskok" między niskimi dachami, na które lądujesz po poprzednim skoku. Strefy wybicia i lądowania są WYLICZANE z układu miasta (citylayout): szczelina, spadek i zasięg balistyczny sprawdza
// `stuntProblems()`. Dźwig odpada: stoi na pustym placu i nie ma w zasięgu żadnego dachu (wysięgnik nie ma kolizji). Brak obrażeń od upadku w tej grze, więc skok z 35 m jest bezpieczny.
// Stan: SAVE.gta.stunts { done: [id] } (core/gtastore.js, zawsze przez normalizeGta -> normalizeStunts). Zaliczenie płaci raz (STUNT.REWARD), komplet daje bonus i osiągnięcie `gta_stunts`.
// Wszystko lokalne: nic nie idzie przez sieć, nic nie rusza ciepła ani gwiazdek. Testy: tests/logic.mjs (blok "skoki GTA"), w przeglądarce tests/gtastunts.mjs.
// ==========================================
import { cityWithInteriors, CITY } from './citylayout.js';
const fin = (n) => typeof n === 'number' && Number.isFinite(n);
const dtOf = (dt) => Math.min(Math.max(+dt || 0, 0), 0.5);

// STRIP: szerokość pasa wybicia przy krawędzi dachu; INSET: odstęp strefy lądowania od krawędzi; V i MARGIN: ostrożny wyrzut (m/s, ok. 80% limitu gry 8,6 m/s) i zapas przy sprawdzaniu zasięgu
export const STUNT = { STRIP: 3, INSET: 0.8, MIN_GAP: 3, V: 7, MARGIN: 1.15, ABOVE: 2.4, BELOW: 0.4, MAX_AIR: 12, REWARD: 25, ALL_BONUS: 200, MAX_UP: 2.5, MIN_AREA: 6 };
// from/to: klucz budynku (nazwa albo id z przecinkami); after: skok wymaga wcześniejszego lądowania na tym dachu (łańcuch)
export const DEFS = [
    { id: 'neonleap', name: 'Neon Leap', from: 'casino', to: '2,0,2', hint: 'Leap off the casino tower toward the near rooftop.' },
    { id: 'casinodive', name: 'Casino Dive', from: 'casino', to: '2,0,3', hint: 'The casino tower has a second neighbour, a bit further.' },
    { id: 'antennadive', name: 'Antenna Dive', from: 'radio', to: '3,0,1', hint: 'From the radio tower, jump across the street.' },
    { id: 'longfall', name: 'Long Fall', from: 'radio', to: '3,0,0', hint: 'The longest fall in town starts on the radio tower.' },
    { id: 'rooftophop', name: 'Rooftop Hop', from: '3,0,1', to: '3,0,0', hint: 'Land first, then hop across the alley.' }
];
export const STUNT_IDS = DEFS.map(d => d.id);
export const isStunt = (id) => STUNT_IDS.includes(id);
export const stuntByDef = (id) => DEFS.find(d => d.id === id) || null;

// ----- zapis -----
export function normalizeStunts(raw) {
    const out = { done: [] };
    if (raw && typeof raw === 'object' && Array.isArray(raw.done)) for (const id of raw.done) if (typeof id === 'string' && isStunt(id) && !out.done.includes(id)) out.done.push(id);
    return out;
}
export function findStunt(st, id) {
    if (!isStunt(id) || st.done.includes(id)) return { isNew: false, state: st, bones: 0, all: false };
    const next = { done: st.done.concat(id) }, all = next.done.length >= DEFS.length;
    return { isNew: true, state: next, bones: STUNT.REWARD + (all ? STUNT.ALL_BONUS : 0), all: all };
}
export const nextStuntHint = (st) => { const d = DEFS.find(q => !st.done.includes(q.id)); return d ? d.hint : ''; };

// ----- geometria -----
const keyOf = (B, k) => B.find(b => (/,/.test(k) ? b.id === k : b.name === k));
const gapOf = (a, b) => Math.hypot(Math.max(a.x0 - b.x1, b.x0 - a.x1, 0), Math.max(a.z0 - b.z1, b.z0 - a.z1, 0));
// Zasięg poziomy lotu pod kątem 45 stopni z prędkością V, gdy start jest o D m wyżej niż lądowanie (D może być ujemne = skok w górę)
export function reach(D, V) {
    const g = 9.8, vs = V * Math.SQRT1_2, disc = vs * vs + 2 * g * D; if (disc < 0) return 0;
    return vs * ((vs + Math.sqrt(disc)) / g);
}
export function stuntSpots(B) {
    B = B || cityWithInteriors(1337);
    const out = [];
    for (const d of DEFS) {
        const fb = keyOf(B, d.from), tb = keyOf(B, d.to); if (!fb || !tb) continue;
        const dx = Math.max(fb.x0 - tb.x1, tb.x0 - fb.x1, 0), dz = Math.max(fb.z0 - tb.z1, tb.z0 - fb.z1, 0), s = STUNT.STRIP;
        let strip, dir;   // pas wybicia po stronie celu (większa z dwóch osi separacji); dir: w którą stronę leży cel
        if (dz >= dx) { dir = tb.z0 >= fb.z1 ? '+z' : '-z'; strip = dir === '+z' ? { x0: fb.x0, x1: fb.x1, z0: fb.z1 - s, z1: fb.z1 } : { x0: fb.x0, x1: fb.x1, z0: fb.z0, z1: fb.z0 + s }; }
        else { dir = tb.x0 >= fb.x1 ? '+x' : '-x'; strip = dir === '+x' ? { x0: fb.x1 - s, x1: fb.x1, z0: fb.z0, z1: fb.z1 } : { x0: fb.x0, x1: fb.x0 + s, z0: fb.z0, z1: fb.z1 }; }
        const i = STUNT.INSET;
        out.push({ id: d.id, name: d.name, hint: d.hint, from: Object.assign(strip, { y: fb.h }), roof: { x0: fb.x0, x1: fb.x1, z0: fb.z0, z1: fb.z1, y: fb.h },
            to: { x0: tb.x0 + i, x1: tb.x1 - i, z0: tb.z0 + i, z1: tb.z1 - i, y: tb.h }, gap: gapOf(fb, tb), drop: fb.h - tb.h, dir: dir, fromKey: d.from, toKey: d.to });
    }
    return out;
}
const inRect = (r, x, z) => x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1;
const onSurface = (r, y) => y >= r.y - STUNT.BELOW && y <= r.y + STUNT.ABOVE;
export const inFrom = (sp, x, y, z) => inRect(sp.from, x, z) && onSurface(sp.from, y);
export const inTo = (sp, x, y, z) => inRect(sp.to, x, z) && onSurface(sp.to, y);

// ----- detektor lotu (stan to zwykły obiekt; krokowy, dt podaje wywołujący) -----
// o: { x, y, z, grounded }; zdarzenia: 'launch' (oderwanie od pasa wybicia), 'done' (lądowanie w strefie celu, id), 'miss' (lądowanie gdzie indziej albo przekroczony czas lotu)
export const newStuntState = () => ({ ph: 'idle', cands: [], t: 0 });
export function stuntStep(st, dt, o, spots) {
    const s = { ph: st.ph, cands: st.cands, t: st.t }, d = dtOf(dt);
    if (![o.x, o.y, o.z].every(fin)) return { st: s, event: '', id: '' };
    if (s.ph === 'idle' || s.ph === 'armed') {
        if (o.grounded) { const c = spots.filter(sp => inFrom(sp, o.x, o.y, o.z)); s.cands = c; s.ph = c.length ? 'armed' : 'idle'; s.t = 0; return { st: s, event: '', id: '' }; }
        if (s.ph === 'armed') { s.ph = 'air'; s.t = 0; return { st: s, event: 'launch', id: '' }; }
        return { st: s, event: '', id: '' };
    }
    s.t += d;   // faza 'air'
    if (o.grounded) {
        const hit = s.cands.find(sp => inTo(sp, o.x, o.y, o.z));
        const c = spots.filter(sp => inFrom(sp, o.x, o.y, o.z));
        s.cands = c; s.ph = c.length ? 'armed' : 'idle'; s.t = 0;
        return hit ? { st: s, event: 'done', id: hit.id } : { st: s, event: 'miss', id: '' };
    }
    if (s.t > STUNT.MAX_AIR) { s.ph = 'idle'; s.cands = []; s.t = 0; return { st: s, event: 'miss', id: '' }; }
    return { st: s, event: '', id: '' };
}

// ----- kontrola wykonalności i rozmieszczenia (używa jej test) -----
export function stuntProblems() {
    const bad = [], B = cityWithInteriors(1337), sp = stuntSpots(B), ids = DEFS.map(d => d.id);
    if (sp.length !== DEFS.length || new Set(ids).size !== ids.length) bad.push('stunt list is malformed');
    const reachable = new Set();   // klucze dachów, na które da się wejść bez skoku (rusztowanie, wieża) albo wylądować po wcześniejszym skoku
    for (const b of B) if ((b.scaffold || b.roofBag) && b.h >= 30) reachable.add(b.name || b.id);
    for (const s of sp) {
        if (!reachable.has(s.fromKey)) { const prev = sp.find(q => q.toKey === s.fromKey && reachable.has(q.fromKey)); if (!prev) bad.push('stunt ' + s.id + ' starts on a roof nobody can reach'); else reachable.add(s.fromKey); }
        if (s.gap < STUNT.MIN_GAP) bad.push('stunt ' + s.id + ' gap is walkable (' + s.gap.toFixed(1) + ' m)');
        const need = (s.gap + STUNT.INSET + 0.5) * STUNT.MARGIN, have = reach(s.drop, STUNT.V);
        if (have < need) bad.push('stunt ' + s.id + ' is out of reach (' + have.toFixed(1) + ' m < ' + need.toFixed(1) + ' m)');
        if (-s.drop > STUNT.MAX_UP) bad.push('stunt ' + s.id + ' lands too high above the takeoff');
        if ((s.to.x1 - s.to.x0) * (s.to.z1 - s.to.z0) < STUNT.MIN_AREA) bad.push('stunt ' + s.id + ' landing zone is too small');
        if ((s.from.x1 - s.from.x0) < 2 || (s.from.z1 - s.from.z0) < 2) bad.push('stunt ' + s.id + ' takeoff strip is too small');
        if (s.fromKey === s.toKey) bad.push('stunt ' + s.id + ' lands where it started');
        if (s.to.x0 < CITY.X0 || s.to.x1 > CITY.X1 || s.to.z0 < CITY.Z0 || s.to.z1 > CITY.Z1) bad.push('stunt ' + s.id + ' lands outside the map');
    }
    return bad;
}
