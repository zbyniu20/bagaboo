// ==========================================
// SCARY GTA: LOSOWE SPOTKANIA (czysta logika, bez THREE), jak rzadkie "random events" z GTA: autostopowicz-widmo przy ulicy, bezszelestna czarna limuzyna w blackoucie i czerwone światła w morzu w burzy
// albo w blackoucie. Każde jest zapowiadane krótkim komunikatem radiowym (napis), pojawia się tylko od czasu do czasu i znika samo. Spotkanie zalicza się raz (ENC.REWARD), komplet daje bonus.
// Stan: SAVE.gta.encounters { seen: [id] } (core/gtastore.js, zawsze przez normalizeGta -> normalizeEnc). Wszystko lokalne i wizualne: nic nie idzie przez sieć, nic nie rusza ciepła ani gwiazdek,
// nic nie goni ani nie łapie gracza (to nie są potwory). Na poziomie Gentle nie ma szeptu autostopowicza. Czas liczy się z kroków dt, losowość podaje wywołujący (testy są deterministyczne).
// 3D i dźwięk: core/gtaencountersfx.js. Testy: tests/logic.mjs (blok "spotkania GTA"), w przeglądarce tests/gtaencounters.mjs.
// ==========================================
import { CITY, ROLES, blockRect, cityWithInteriors, SAFEHOUSES, hideSpots } from './citylayout.js';
const fin = (n) => typeof n === 'number' && Number.isFinite(n);
const dtOf = (dt) => Math.min(Math.max(+dt || 0, 0), 0.5);

export const ENC = {
    IDS: ['hitchhiker', 'limo', 'sealights'], REWARD: 25, ALL_BONUS: 100,
    HITCH: { GAP: [100, 170], STAY: 90, FOUND: 4, MIN: 30, MAX: 75 },
    LIMO: { SPEED: 6, Z: 40, X0: -75, X1: 75, FOUND: 11 },
    LIGHTS: { DOT: 0.85, SECONDS: 4, NEAR: 70, AT: [[14, 0.4, 66], [20, 0.4, 70], [26, 0.4, 64]] }
};
export const NAMES = { hitchhiker: 'Hitchhiker', limo: 'Silent limo', sealights: 'Lights on the water' };
export const RADIO_LINES = {
    hitchhiker: 'Callers report a hitchhiker standing by the road. Nobody remembers picking him up.',
    limo: 'All units, a black limousine with no plates is rolling down the boulevard. Do not engage.',
    sealights: 'Harbour patrol reports red lights on the water beyond the pier.'
};
export const isEnc = (id) => ENC.IDS.includes(id);

// ----- zapis -----
export function normalizeEnc(raw) {
    const out = { seen: [] };
    if (raw && typeof raw === 'object' && Array.isArray(raw.seen)) for (const id of raw.seen) if (typeof id === 'string' && isEnc(id) && !out.seen.includes(id)) out.seen.push(id);
    return out;
}
export function findEnc(st, id) {
    if (!isEnc(id) || st.seen.includes(id)) return { isNew: false, state: st, bones: 0, all: false };
    const next = { seen: st.seen.concat(id) }, all = next.seen.length >= ENC.IDS.length;
    return { isNew: true, state: next, bones: ENC.REWARD + (all ? ENC.ALL_BONUS : 0), all: all };
}

// ----- pozycje: autostopowicz stoi przy krawężniku zachodniej ulicy każdego zabudowanego kwartału -----
export function hitchSpots() {
    const out = [];
    for (let j = 0; j < CITY.ROWS; j++) for (let i = 0; i < CITY.COLS; i++) {
        const role = ROLES[j][i]; if (role === 'plaza' || role === 'marina') continue;
        const b = blockRect(i, j); out.push({ id: 'k' + i + j, x: b.x0 - 2.6, z: (b.z0 + b.z1) / 2 + 5 });
    }
    return out;
}
export const lightsCenter = () => { const a = ENC.LIGHTS.AT; return [a.reduce((s, p) => s + p[0], 0) / a.length, a.reduce((s, p) => s + p[1], 0) / a.length, a.reduce((s, p) => s + p[2], 0) / a.length]; };

// ----- autostopowicz: co 100-170 s pojawia się w jednym z miejsc 30-75 m od gracza, stoi do 90 s, znika, gdy podejdziesz na 4 m ('found') albo po czasie ('gone') -----
export const newHitch = (R) => ({ ph: 'wait', t: ENC.HITCH.GAP[0] * 0.5 + (R || Math.random)() * (ENC.HITCH.GAP[1] - ENC.HITCH.GAP[0]) * 0.5, spot: null });
// o: { px, pz, spots }; zdarzenia: 'appear' (spot), 'found', 'gone', '' ; stan zwykły obiekt
export function hitchStep(st, dt, o, R) {
    const rnd = R || Math.random, d = dtOf(dt), s = { ph: st.ph, t: st.t, spot: st.spot };
    if (![o.px, o.pz].every(fin)) return { st: s, event: '', spot: s.spot };
    if (s.ph === 'wait') {
        s.t -= d; if (s.t > 0) return { st: s, event: '', spot: null };
        const near = o.spots.filter(p => { const dist = Math.hypot(p.x - o.px, p.z - o.pz); return dist >= ENC.HITCH.MIN && dist <= ENC.HITCH.MAX; });
        if (!near.length) { s.t = 15; return { st: s, event: '', spot: null }; }
        s.spot = near[Math.floor(rnd() * near.length) % near.length]; s.ph = 'live'; s.t = ENC.HITCH.STAY;
        return { st: s, event: 'appear', spot: s.spot };
    }
    s.t -= d;
    if (Math.hypot(s.spot.x - o.px, s.spot.z - o.pz) < ENC.HITCH.FOUND) { const sp = s.spot; s.ph = 'wait'; s.t = ENC.HITCH.GAP[0] + rnd() * (ENC.HITCH.GAP[1] - ENC.HITCH.GAP[0]); s.spot = null; return { st: s, event: 'found', spot: sp }; }
    if (s.t <= 0) { const sp = s.spot; s.ph = 'wait'; s.t = ENC.HITCH.GAP[0] + rnd() * (ENC.HITCH.GAP[1] - ENC.HITCH.GAP[0]); s.spot = null; return { st: s, event: 'gone', spot: sp }; }
    return { st: s, event: '', spot: s.spot };
}

// ----- limuzyna: tylko w blackoucie; raz na blackout jedzie bulwarem od zachodu na wschód (albo odwrotnie); 'found', gdy przejedzie bliżej niż FOUND m od gracza -----
export const newLimo = () => ({ ph: 'wait', x: 0, dir: 1, found: false, used: false });
// o: { blackout, px, pz }; zdarzenia: 'appear', 'found', 'gone'; pos = { x, z } w trakcie jazdy
export function limoStep(st, dt, o, R) {
    const rnd = R || Math.random, d = dtOf(dt), s = { ph: st.ph, x: st.x, dir: st.dir, found: st.found, used: st.used };
    if (s.ph === 'wait') {
        if (!o.blackout) { s.found = false; s.used = false; return { st: s, event: '', pos: null }; }
        if (s.found || s.used) return { st: s, event: '', pos: null };   // jedna limuzyna na blackout: po przejeździe (znalezionym albo nie) już nie wraca w tym blackoucie
        s.ph = 'drive'; s.dir = rnd() < 0.5 ? 1 : -1; s.x = s.dir > 0 ? ENC.LIMO.X0 : ENC.LIMO.X1; return { st: s, event: 'appear', pos: { x: s.x, z: ENC.LIMO.Z } };
    }
    s.x += s.dir * ENC.LIMO.SPEED * d;
    const pos = { x: s.x, z: ENC.LIMO.Z }, end = s.dir > 0 ? s.x >= ENC.LIMO.X1 : s.x <= ENC.LIMO.X0;
    let event = '';
    if (!s.found && Math.hypot(pos.x - o.px, pos.z - o.pz) < ENC.LIMO.FOUND) { s.found = true; event = 'found'; }
    if (end || !o.blackout) { s.ph = 'wait'; s.used = true; return { st: s, event: event || 'gone', pos: null }; }
    return { st: s, event: event, pos: pos };
}

// ----- światła w morzu: widoczne w burzy albo w blackoucie; liczy się 4 s patrzenia w ich stronę z odległości do 70 m -----
export const newLights = () => ({ t: 0, done: false });
// o: { active, px, py, pz, dx, dy, dz }; zwraca: visible, found
export function lightsStep(st, dt, o) {
    const c = lightsCenter(), s = { t: st.t, done: st.done };
    const visible = !!o.active;
    if (!visible || s.done || ![o.px, o.pz, o.dx, o.dz].every(fin)) { if (!visible) s.t = 0; return { st: s, visible: visible, found: false }; }
    const dist = Math.hypot(c[0] - o.px, c[2] - o.pz), h = Math.hypot(o.dx, o.dz), dot = dist > 1e-6 && h > 1e-6 ? ((c[0] - o.px) * o.dx + (c[2] - o.pz) * o.dz) / (dist * h) : 0;
    s.t = dist < ENC.LIGHTS.NEAR && dot > ENC.LIGHTS.DOT && Math.abs(o.dy || 0) < 0.6 ? s.t + dtOf(dt) : 0;
    if (s.t >= ENC.LIGHTS.SECONDS) { s.done = true; return { st: s, visible: visible, found: true }; }
    return { st: s, visible: visible, found: false };
}
// Widoczność świateł w morzu: pulsują wolno (0,4 Hz, bez stroba), jasność 0..1
export const lightPulse = (t) => 0.55 + 0.45 * Math.sin(t * 2 * Math.PI * 0.4);

// ----- kontrola rozmieszczenia (używa jej test) -----
export function encProblems() {
    const bad = [], B = cityWithInteriors(1337), hs = hitchSpots(), inside = (x, z, m) => B.some(b => x > b.x0 - m && x < b.x1 + m && z > b.z0 - m && z < b.z1 + m);
    if (hs.length < 6) bad.push('too few hitchhiker spots');
    for (const p of hs) {
        if (p.x < CITY.X0 + 1 || p.x > CITY.X1 - 1 || p.z < CITY.Z0 + 1 || p.z > CITY.Z1 - 1) bad.push('hitchhiker spot ' + p.id + ' is outside the map');
        if (inside(p.x, p.z, 0.8)) bad.push('hitchhiker spot ' + p.id + ' is inside a building');
        for (const s of SAFEHOUSES) if (Math.hypot(s.x - p.x, s.z - p.z) < 2) bad.push('hitchhiker spot ' + p.id + ' sits on safe house ' + s.id);
        for (const h of hideSpots()) if (Math.hypot(h.x - p.x, h.z - p.z) < 2) bad.push('hitchhiker spot ' + p.id + ' sits on a dumpster');
    }
    if (new Set(hs.map(p => p.id)).size !== hs.length) bad.push('hitchhiker spot ids repeat');
    if (!(ENC.LIMO.Z >= CITY.BLV[0] && ENC.LIMO.Z <= CITY.BLV[1])) bad.push('the limo does not drive on the boulevard');
    if (ENC.LIMO.X0 < CITY.X0 - 10 || ENC.LIMO.X1 > CITY.X1 + 10) bad.push('the limo path leaves the world');
    for (const p of ENC.LIGHTS.AT) {
        if (p[2] < CITY.SEA_Z + 4 || p[2] > CITY.Z1 - 1 || p[0] > CITY.X1 - 1) bad.push('a sea light is not in the sea');
        if (Math.abs(p[0] - CITY.PIER.x) < CITY.PIER.w / 2 + 4) bad.push('a sea light is too close to the pier');
    }
    if (ENC.IDS.length !== 3 || ENC.IDS.some(id => !NAMES[id] || !RADIO_LINES[id] || RADIO_LINES[id].length > 100 || !/^[A-Za-z0-9 ,.'!?-]+$/.test(RADIO_LINES[id]))) bad.push('encounter texts are malformed');
    return bad;
}
