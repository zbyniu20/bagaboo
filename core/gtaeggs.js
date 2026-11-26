// ==========================================
// SCARY GTA: EASTER EGGI (czysta logika, bez THREE): 8 ukrytych jajek w mieście, pozycje liczone z układu (citylayout, interiorlogic), detektory zachowań, zapis i kontrola rozmieszczenia.
// Stan: SAVE.gta.eggs { found, paid } (core/gtastore.js, zawsze przez normalizeGta -> normalizeGtaEggs). Każde jajko płaci raz (EGG_BONES), komplet daje bonus. Wszystko lokalne: nic nie idzie przez sieć,
// nie zmienia ciepła ani gwiazdek (jajko "szósta gwiazdka" jest tylko kosmetyczne). Detektory są krokowe (dt podaje wywołujący), więc testy są deterministyczne.
// 3D, dźwięk i napisy: core/gtaeggfx.js. Testy: tests/logic.mjs (blok "jajka GTA"), w przeglądarce tests/gtaeggs.mjs.
// ==========================================
import { CITY, CRANE, INTERIORS, cityWithInteriors, bagSpots, hideSpots, SAFEHOUSES } from './citylayout.js';
import { frame, furniture } from './interiorlogic.js';
import { knockStep, shoutStep, newDetector } from './egglogic.js';
export { knockStep, shoutStep, newDetector };
const dtOf = (dt) => Math.min(Math.max(+dt || 0, 0), 0.5);

export const EGG_BONES = 25, ALL_BONUS = 250;
// how: sposób odkrycia (do testów i podpowiedzi); hint: zagadka bez współrzędnych
export const EGGS = [
    { id: 'duck', name: 'Golden duck', how: 'touch', hint: 'Above the radio tower, something yellow is not a bag.' },
    { id: 'slots', name: 'Lucky seven', how: 'touch', hint: 'The casino has one gold machine. Pull its lever.' },
    { id: 'room13', name: 'Room 13', how: 'still', hint: 'In the motel, the bloody bed wants company. Stand quietly beside it.' },
    { id: 'kraken', name: 'The deep', how: 'gaze', hint: 'At the end of the pier, stare into the dark water for a while.' },
    { id: 'dumpster', name: 'Occupied', how: 'knock', hint: 'One dumpster is not empty. Knock politely, three times.' },
    { id: 'sixth', name: 'Sixth star', how: 'still', hint: 'Five stars, the top of the crane, and a calm mind.' },
    { id: 'rooftop', name: 'Echo', how: 'shout', hint: 'The casino roof hears everything. The cops hear it too.' },
    { id: 'ghost', name: 'Passenger', how: 'ride', hint: 'When the lights go out, a getaway truck is never empty.' }
];
export const EGG_IDS = EGGS.map(e => e.id);
export const eggById = (id) => EGGS.find(e => e.id === id) || null;
export const isGtaEgg = (id) => EGG_IDS.includes(id);

// ----- zapis -----
export function normalizeGtaEggs(raw) {
    const out = { found: [], paid: [] };
    if (raw && typeof raw === 'object') {
        for (const k of ['found', 'paid']) if (Array.isArray(raw[k])) for (const id of raw[k]) if (typeof id === 'string' && isGtaEgg(id) && !out[k].includes(id)) out[k].push(id);
        out.paid = out.paid.filter(id => out.found.includes(id));
    }
    return out;
}
export const eggFound = (st, id) => st.found.includes(id);
// Znalezienie jajka: nowy stan, nagroda (raz na jajko) i bonus za komplet (raz); nieznane id albo drugi raz = isNew false
export function findGtaEgg(st, id) {
    if (!isGtaEgg(id) || eggFound(st, id)) return { isNew: false, state: st, bones: 0, all: false };
    const next = { found: st.found.concat(id), paid: st.paid.concat(id) }, all = next.found.length >= EGGS.length;
    return { isNew: true, state: next, bones: EGG_BONES + (all ? ALL_BONUS : 0), all: all };
}
// Podpowiedź do pierwszego nieznalezionego jajka (telefon); po kompletnym zbiorze pusty napis
export const nextHint = (st) => { const e = EGGS.find(q => !st.found.includes(q.id)); return e ? e.hint : ''; };

// ----- pozycje (z układu miasta; nic nie jest wpisane na sztywno poza przesunięciami względem obiektów) -----
export function eggSpots(B) {
    B = B || cityWithInteriors(1337);
    const radio = B.find(b => b.name === 'radio'), casino = B.find(b => b.name === 'casino');
    const slotB = B.find(b => b.id === '3,0,0'), motelB = B.find(b => b.id === '2,1,0');
    const out = {};
    out.duck = { x: (radio.x0 + radio.x1) / 2 - 0.95, y: radio.h + 0.18, z: (radio.z0 + radio.z1) / 2 - 1.0, r: 0.5 };
    const sf = frame(slotB, INTERIORS[slotB.id].door), H = sf.W / 2, sm = sf.rect(1.6, 2.5, H - 1.0, H - 0.2), sk = sf.rect(2.05, 2.05, H - 1.1, H - 1.1);
    out.slots = { machine: sm, knob: { x: sk.x0, y: 1.15, z: sk.z0, r: 0.35 }, coins: { x: (sm.x0 + sm.x1) / 2, y: 1.7, z: (sm.z0 + sm.z1) / 2 } };
    const mf = frame(motelB, INTERIORS[motelB.id].door), ms = mf.rect(4.0, 4.0, 3.3, 3.3), mw = mf.rect(1.9, 1.9, 3.0, 3.0);
    out.room13 = { x: ms.x0, z: ms.z0, y: 1.1, r: 1.6, seconds: 8, ghost: { x: mw.x0, z: mw.z0 } };
    out.kraken = { eye: { x: CITY.PIER.x + CITY.PIER.w / 2 + 6, y: 1.5, z: (CITY.SEA_Z + CITY.PIER.z1) / 2 }, stand: { x0: CITY.PIER.x - CITY.PIER.w / 2, x1: CITY.PIER.x + CITY.PIER.w / 2, z0: CITY.SEA_Z + 2, z1: CITY.PIER.z1 + 0.5 } };   // oko pływa w morzu obok pirsu (drzwi EXIT na pirsie zasłaniałyby widok na jego koniec)
    const hs = hideSpots().find(h => h.id === 'h11') || hideSpots()[0];
    out.dumpster = { x: hs.x, y: 0.9, z: hs.z, r: 1.1 };
    out.sixth = { x: CRANE.x, z: CRANE.z, y: CRANE.h, near: 8 };
    out.rooftop = { x0: casino.x0, x1: casino.x1, z0: casino.z0, z1: casino.z1, y: casino.h };
    return out;
}

// ----- detektory -----
export const STILL2 = { SPEED: 0.15 };
// Stanie nieruchomo: ok = warunek miejsca (np. blisko punktu), speed w m/s; true w klatce, w której minęło `seconds`
export function stillAt(st, ok, speed, dt, seconds) {
    if (st.done) return false;
    st.t = ok && speed < STILL2.SPEED ? st.t + dtOf(dt) : 0;
    if (st.t >= seconds) { st.done = true; return true; }
    return false;
}
export const GAZE2 = { DOT: 0.85, PITCH: 0.5, SECONDS: 6 };
// Patrzenie w stronę celu: dot = iloczyn skalarny poziomego kierunku wzroku i kierunku do celu, dy = składowa pionowa wzroku
export function gazeAt(st, ok, dot, dy, dt) {
    if (st.done) return false;
    st.t = ok && dot > GAZE2.DOT && Math.abs(dy) < GAZE2.PITCH ? st.t + dtOf(dt) : 0;
    if (st.t >= GAZE2.SECONDS) { st.done = true; return true; }
    return false;
}
export const lookDot = (px, pz, tx, tz, dx, dz) => { const a = Math.hypot(tx - px, tz - pz), b = Math.hypot(dx, dz); return a > 1e-6 && b > 1e-6 ? ((tx - px) * dx + (tz - pz) * dz) / (a * b) : 0; };
// Pasażer-widmo: w czasie blackoutu na pace pickupa stoi milcząca postać; znika, gdy dojedziesz. Jajko liczy się, gdy przejechałeś co najmniej NEED sekund w ciemności
export const GHOST = { NEED: 5 };
export const newGhost = () => ({ t: 0 });
export function ghostStep(st, dt, o) {
    const s = { t: st.t }, d = dtOf(dt);
    if (o.riding) { if (o.blackout) s.t += d; return { st: s, show: !!o.blackout, event: '' }; }
    const hit = s.t >= GHOST.NEED; s.t = 0; return { st: s, show: false, event: hit ? 'found' : '' };
}
// Szczyt dźwigu z pięcioma gwiazdkami: miejsce jajka "szósta gwiazdka"
export const onCraneTop = (sp, x, y, z) => y > sp.y - 0.5 && Math.hypot(x - sp.x, z - sp.z) < sp.near;
export const onRoof = (r, x, y, z) => x > r.x0 && x < r.x1 && z > r.z0 && z < r.z1 && y > r.y - 0.5;
export const onPier = (k, x, z) => x > k.x0 && x < k.x1 && z > k.z0 && z < k.z1;

// ----- kontrola rozmieszczenia (używa jej test) -----
export function eggProblems() {
    const bad = [], B = cityWithInteriors(1337), sp = eggSpots(B), bags = bagSpots(B);
    const overlap = (r, x, z, m) => x > r.x0 - m && x < r.x1 + m && z > r.z0 - m && z < r.z1 + m;
    const radio = B.find(b => b.name === 'radio'), casino = B.find(b => b.name === 'casino'), slotB = B.find(b => b.id === '3,0,0'), motelB = B.find(b => b.id === '2,1,0');
    if (!(sp.duck.x > radio.x0 + 0.3 && sp.duck.x < radio.x1 - 0.3 && sp.duck.z > radio.z0 + 0.3 && sp.duck.z < radio.z1 - 0.3)) bad.push('the duck is not on the radio tower roof');
    for (const bg of bags) if (Math.hypot(bg.x - sp.duck.x, bg.z - sp.duck.z) < 0.9 && Math.abs(bg.y - sp.duck.y) < 1.5) bad.push('the duck sits on the ' + bg.id + ' bag');
    const hollow = (b, x, z, m) => x > b.x0 + m && x < b.x1 - m && z > b.z0 + m && z < b.z1 - m;
    const hits = (b, x, z) => furniture(b).some(f => f.solid && x > f.x0 - 0.1 && x < f.x1 + 0.1 && z > f.z0 - 0.1 && z < f.z1 + 0.1 && f.y0 < 1.4);
    const m = sp.slots.machine, rectHit = (f) => f.solid && m.x0 < f.x1 && m.x1 > f.x0 && m.z0 < f.z1 && m.z1 > f.z0;
    if (furniture(slotB).some(rectHit)) bad.push('the lucky machine overlaps furniture');
    if (!hollow(slotB, m.x0, m.z0, CITY.WALL_T) || !hollow(slotB, m.x1, m.z1, CITY.WALL_T)) bad.push('the lucky machine is outside the casino');
    for (const [name, b, pts] of /** @type {any[]} */ ([['slots', slotB, [[sp.slots.knob.x, sp.slots.knob.z]]], ['room13', motelB, [[sp.room13.x, sp.room13.z], [sp.room13.ghost.x, sp.room13.ghost.z]]]]))
        for (const [x, z] of pts) { if (!hollow(b, x, z, CITY.WALL_T + 0.2)) bad.push('the ' + name + ' egg is outside the interior'); if (hits(b, x, z)) bad.push('the ' + name + ' egg stands inside furniture'); }
    if (!INTERIORS[slotB.id] || INTERIORS[slotB.id].kind !== 'casino' || INTERIORS[motelB.id].kind !== 'motel') bad.push('interior kinds changed');
    const k = sp.kraken; if (k.eye.z > CITY.Z1 || k.eye.x > CITY.X1 || k.eye.z < CITY.SEA_Z || k.eye.z > CITY.PIER.z1 || k.stand.z1 > CITY.Z1) bad.push('the deep egg is outside the sea'); if (Math.abs(k.eye.x - CITY.PIER.x) < CITY.PIER.w / 2 + 3) bad.push('the eye is too close to the pier'); if (k.stand.z0 < CITY.SEA_Z) bad.push('the pier zone starts on the beach'); if (k.stand.x1 - k.stand.x0 > CITY.PIER.w + 0.01) bad.push('the pier zone is wider than the pier');
    for (const s of SAFEHOUSES) if (Math.hypot(s.x - sp.dumpster.x, s.z - sp.dumpster.z) < 1.5) bad.push('the dumpster egg sits on safe house ' + s.id);
    for (const b of B) if (sp.dumpster.x > b.x0 - 0.5 && sp.dumpster.x < b.x1 + 0.5 && sp.dumpster.z > b.z0 - 0.5 && sp.dumpster.z < b.z1 + 0.5) bad.push('the dumpster egg is inside a building');
    if (!(CRANE.h > 20)) bad.push('the crane is too low'); if (!(casino.h > 20)) bad.push('the casino roof is too low');
    if (EGGS.length !== 8 || new Set(EGG_IDS).size !== 8 || EGGS.some(e => !e.hint || e.hint.length > 90 || !/^[A-Za-z0-9 ,.'!?-]+$/.test(e.hint) || /\d{2,}/.test(e.hint))) bad.push('egg list is malformed (8 unique ids, short plain hints without coordinates)');
    return bad;
}
