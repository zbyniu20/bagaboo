// ==========================================
// SCARY GTA: DODATKI (czysta logika, bez THREE). Telefon z mapą, lakiernia Pay 'n' Spray, przebranie w kryjówce, wspinaczki na czas (casino i wieża), paczki-graffiti do znalezienia,
// manekiny w witrynach, sejf w banku z kodem ze stacji benzynowej, wyłączenie prądu przy kasynie, napad dnia, blackout i horda o północy, dźwig z liną.
// Wszystko lokalne dla gracza (host liczy tylko to, co wpływa na policję: przebranie i ciemność dostają od hosta ciepło i widoczność przez istniejące kanały).
// Zapis: SAVE.gta (core/gtastore.js) zawsze przez normalizeGta. Testy: tests/logic.mjs (blok "dodatki GTA"), w przeglądarce tests/gtaextras.mjs.
// ==========================================
import { CITY, ROLES, CRANE, blockRect, scaffoldBox, buildCity, bagSpots } from './citylayout.js';
import { seenBy } from './statuelogic.js';
import { newLock, lockStep } from './puzzlelogic.js';
export { newLock, lockStep };
const fin = (n) => typeof n === 'number' && Number.isFinite(n);
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const dtOf = (dt) => Math.min(Math.max(+dt || 0, 0), 0.5);
const fnv = (str) => { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; };
export const BAG_IDS = ['jewelry', 'bank', 'casino', 'gas', 'radio', 'yacht'];
const DATE = /^\d{4}-\d{2}-\d{2}$/;

// ----- telefon: mapa miasta (widoczna po spojrzeniu w dół) -----
export const PHONE = { SIZE: 512, PITCH: 0.55 };
export const mapXY = (x, z, size) => { const S = size || PHONE.SIZE; return [clamp((x - CITY.X0) / (CITY.X1 - CITY.X0), 0, 1) * S, clamp((z - CITY.Z0) / (CITY.Z1 - CITY.Z0), 0, 1) * S]; };
export const phoneVisible = (pitchDown) => fin(pitchDown) && pitchDown > PHONE.PITCH;

// ----- lakiernia Pay 'n' Spray: stań w kabinie w bezruchu, zapłać, a poziom poszukiwania spadnie do zera -----
export const SPRAY = { COST: 100, COOLDOWN: 90, R: 2.6, HOLD: 2, SEEN_T: 4, SPOTS: [{ id: 'p1', x: -38, z: -20 }, { id: 'p2', x: 38, z: 18 }] };
export const newSpray = () => ({ cd: 0, hold: 0, done: 0 });
// o: { near, speed, seenT (s od ostatniego widzenia), stars, wallet }; zdarzenie: paid | clean | cooldown | seen | poor | ''
export function sprayStep(st, dt, o) {
    const s = { cd: st.cd, hold: st.hold, done: st.done }, d = dtOf(dt); s.cd = Math.max(0, s.cd - d);
    if (!o.near || o.speed > 0.8) { s.hold = Math.min(0, s.hold); return { st: s, event: '' }; }
    s.hold += d; if (s.hold < SPRAY.HOLD) return { st: s, event: '' };
    s.hold = -4;   // po każdej próbie przerwa, żeby nie zasypywać napisami
    if (o.stars <= 0) return { st: s, event: 'clean' };
    if (s.cd > 0) return { st: s, event: 'cooldown' };
    if (o.seenT < SPRAY.SEEN_T) return { st: s, event: 'seen' };
    if (o.wallet < SPRAY.COST) return { st: s, event: 'poor' };
    s.cd = SPRAY.COOLDOWN; s.done++; return { st: s, event: 'paid' };
}

// ----- przebranie w kryjówce: 60 s mniejszy zasięg wzroku policji -----
export const DISGUISE = { HOLD: 2.5, FOR: 60, SIGHT: 0.65, R: 2.2 };
export const newDisguise = () => ({ hold: 0, left: 0 });
export function disguiseStep(st, dt, o) {
    const s = { hold: st.hold, left: st.left }, d = dtOf(dt); s.left = Math.max(0, s.left - d);
    if (s.left > 0 || !o.near || o.speed > 0.8) { s.hold = 0; return { st: s, event: '' }; }
    s.hold += d; if (s.hold >= DISGUISE.HOLD) { s.hold = 0; s.left = DISGUISE.FOR; return { st: s, event: 'on' }; }
    return { st: s, event: '' };
}
export const sightMul = (st) => st.left > 0 ? DISGUISE.SIGHT : 1;

// ----- wspinaczki na czas: pole startowe u podstawy rusztowania, dzwon na dachu przy torbie -----
export function climbSpots(buildings) {
    const out = [];
    for (const b of buildings) if (b.scaffold && b.roofBag) {
        const box = scaffoldBox(b), f = b.scaffold.face, cx = (box.x0 + box.x1) / 2, cz = (box.z0 + box.z1) / 2; let px = cx, pz = cz;
        if (f === 'S') pz = box.z1 + 1.6; else if (f === 'N') pz = box.z0 - 1.6; else if (f === 'E') px = box.x1 + 1.6; else px = box.x0 - 1.6;
        out.push({ id: b.name, pad: [px, 0.05, pz], bell: [(b.x0 + b.x1) / 2 + 1.1, b.h + 1.4, (b.z0 + b.z1) / 2] });
    }
    return out;
}
// ----- paczki-graffiti: 10 w zaułkach (północne ramię), po jednej na rusztowaniach kasyna i wieży oraz na dźwigu -----
export function tagSpots(buildings) {
    const out = [];
    for (let j = 0; j < CITY.ROWS; j++) for (let i = 0; i < CITY.COLS; i++) { const role = ROLES[j][i]; if (role === 'plaza' || role === 'marina') continue; const b = blockRect(i, j); out.push({ id: 't' + i + j, x: (b.x0 + b.x1) / 2, y: 0.8, z: (b.z0 + b.z1) / 2 - 3.4 }); }
    for (const b of buildings) if (b.scaffold && b.roofBag) {
        const box = scaffoldBox(b), f = b.scaffold.face, y = Math.round(b.h * 0.55); let x = (box.x0 + box.x1) / 2, z = (box.z0 + box.z1) / 2;
        if (f === 'S') z = box.z1 + 0.45; else if (f === 'N') z = box.z0 - 0.45; else if (f === 'E') x = box.x1 + 0.45; else x = box.x0 - 0.45;
        out.push({ id: 's' + b.name, x: x, y: y, z: z });
    }
    out.push({ id: 'tcrane', x: CRANE.x + 1.0, y: CRANE.h + 0.9, z: CRANE.z + 1.0 });
    return out;
}
export const TAG = { REWARD: 25, TOUCH: 0.45, MILESTONES: { 6: 100, 13: 300 } };
// ----- zapis -----
export const TAG_IDS = (() => { const ids = []; for (let j = 0; j < CITY.ROWS; j++) for (let i = 0; i < CITY.COLS; i++) { const r = ROLES[j][i]; if (r !== 'plaza' && r !== 'marina') ids.push('t' + i + j); } return ids.concat(['scasino', 'sradio', 'tcrane']); })();
export function normalizeGta(raw) {
    const out = { found: [], climbBest: {}, vault: '', daily: { date: '', best: 0 }, sprayed: 0 };
    if (!raw || typeof raw !== 'object') return out;
    if (Array.isArray(raw.found)) for (const id of raw.found) if (typeof id === 'string' && TAG_IDS.includes(id) && !out.found.includes(id)) out.found.push(id);
    if (raw.climbBest && typeof raw.climbBest === 'object') for (const k of ['casino', 'radio']) { const v = raw.climbBest[k]; if (fin(v) && v >= 0.5 && v <= 5999) out.climbBest[k] = Math.round(v * 100) / 100; }
    if (typeof raw.vault === 'string' && DATE.test(raw.vault)) out.vault = raw.vault;
    if (raw.daily && typeof raw.daily === 'object' && typeof raw.daily.date === 'string' && DATE.test(raw.daily.date)) out.daily = { date: raw.daily.date, best: fin(raw.daily.best) && raw.daily.best >= 1 && raw.daily.best <= 5999 ? Math.round(raw.daily.best * 10) / 10 : 0 };
    if (fin(raw.sprayed) && raw.sprayed >= 0) out.sprayed = Math.min(9999, Math.floor(raw.sprayed));
    return out;
}
// Znalezienie paczki: nagroda raz; progi dają premię. Zwraca nowy stan, nagrodę i czy to nowość (immutable)
export function findTag(g, id) {
    if (!TAG_IDS.includes(id) || g.found.includes(id)) return { gta: g, isNew: false, bones: 0 };
    const found = g.found.concat([id]), bonus = TAG.MILESTONES[found.length] || 0;
    return { gta: Object.assign({}, g, { found: found }), isNew: true, bones: TAG.REWARD + bonus };
}

// ----- sejf w banku: kod dnia podaje paragon na stacji benzynowej -----
export const gtaCode = (iso) => DATE.test(String(iso)) ? String(fnv('gta:' + iso) % 10000).padStart(4, '0') : '0000';
export const GVAULT = { BONES: 300, HEAT: 30 };
export const gtaVaultCheck = (gta, typed, today) => gta.vault === today ? 'done' : (String(typed) === gtaCode(today) ? 'ok' : 'bad');

// ----- napad dnia: cel to jedna z toreb (z daty), a czas docelowy zależy od dnia -----
export const DAILY = { REWARD: 150 };
export function dailyHeist(iso) { const h = fnv('heist:' + (DATE.test(String(iso)) ? iso : '0000-00-00')); return { target: BAG_IDS[h % BAG_IDS.length], par: 210 + ((h >>> 8) % 150) }; }
// Wyjście z torbami: wygrana, gdy wśród niesionych jest cel dnia; nagroda raz na dzień, rekord = najkrótszy czas dnia
export function heistResult(gta, today, carried, t) {
    const d = dailyHeist(today), won = Array.isArray(carried) && carried.includes(d.target);
    if (!won) return { won: false, reward: 0, gta: gta, record: false };
    const first = gta.daily.date !== today, best = first || !gta.daily.best || t < gta.daily.best ? Math.round(t * 10) / 10 : gta.daily.best;
    return { won: true, reward: first ? DAILY.REWARD : 0, record: first || t < gta.daily.best, gta: Object.assign({}, gta, { daily: { date: today, best: best } }), par: d.par, underPar: t <= d.par };
}

// ----- wyłączenie prądu przy kasynie: dźwignia w zaułku, 45 s ciemności, które zmniejsza wzrok policji w pobliżu -----
export const POWER = { R: 0.6, DARK_FOR: 45, COOLDOWN: 150, DARK_MUL: 0.5, ZONE_R: 38 };
export const powerSpot = () => { const b = blockRect(2, 0); return { x: (b.x0 + b.x1) / 2 + 3.4, z: (b.z0 + b.z1) / 2, y: 1.2 }; };
export const newPower = () => ({ left: 0, cd: 0 });
export function powerStep(st, dt, touch) {
    const s = { left: st.left, cd: st.cd }, d = dtOf(dt), was = s.left > 0; s.left = Math.max(0, s.left - d); s.cd = Math.max(0, s.cd - d);
    if (was && s.left === 0) { s.cd = POWER.COOLDOWN; return { st: s, event: 'back' }; }
    if (touch && s.left === 0 && s.cd === 0) { s.left = POWER.DARK_FOR; return { st: s, event: 'cut' }; }
    return { st: s, event: '' };
}
export const darkMul = (st, d) => st.left > 0 && d < POWER.ZONE_R ? POWER.DARK_MUL : 1;

// ----- noc w mieście: blackout 40 s, po nim horda dodatkowych policjantów-zombie przez 60 s -----
export const NIGHT = { FIRST: 150, GAP: [200, 300], BLACKOUT: 40, HORDE: 60, HORDE_COPS: 4, SIGHT_MUL: 0.8 };
export const newNight = (first) => ({ ph: 'calm', left: fin(first) ? first : NIGHT.FIRST });
export function nightStep(st, dt, rand) {
    const R = rand || Math.random, s = { ph: st.ph, left: st.left - dtOf(dt) }; if (s.left > 0) return { st: s, event: '' };
    if (s.ph === 'calm') return { st: { ph: 'blackout', left: NIGHT.BLACKOUT }, event: 'blackout' };
    if (s.ph === 'blackout') return { st: { ph: 'horde', left: NIGHT.HORDE }, event: 'horde' };
    return { st: { ph: 'calm', left: NIGHT.GAP[0] + R() * (NIGHT.GAP[1] - NIGHT.GAP[0]) }, event: 'calm' };
}
export const NIGHT_PHASES = ['calm', 'blackout', 'horde'];
export const cleanNight = (v) => NIGHT_PHASES.includes(v) ? v : 'calm';

// ----- manekiny w witrynach: ruszają się TYLKO gdy na nie nie patrzysz, nigdy nie dotykają (zatrzymują się 2,6 m od gracza) -----
export const WMAN = { SPEED: 0.55, NEAR: 14, STOP: 2.6, BLOCKS: [[0, 0], [1, 1], [2, 1], [3, 2]] };
export const windowSpots = () => WMAN.BLOCKS.map(([i, j], k) => { const b = blockRect(i, j); return { id: 'w' + k, x: (b.x0 + b.x1) / 2 + 3.4, z: (b.z0 + b.z1) / 2 }; });
export function wmanStep(m, dt, pl, look) {
    const d = dtOf(dt), dx = pl.x - m.x, dz = pl.z - m.z, dist = Math.hypot(dx, dz), seen = seenBy(pl.x, pl.z, look.fx, look.fz, m.x, m.z);
    if (seen || dist > WMAN.NEAR || dist <= WMAN.STOP) return { x: m.x, z: m.z, moved: false, seen: seen };
    const step = Math.min(WMAN.SPEED * d, dist - WMAN.STOP);
    return { x: m.x + dx / dist * step, z: m.z + dz / dist * step, moved: true, seen: false };
}
// Reguły rozmieszczenia (używa ich test): nic nie stoi w budynku, kabiny i dźwig są na wolnym terenie
export function extrasProblems() {
    const bad = [], B = buildCity(1337), inside = (x, z, r, y) => B.some(b => x > b.x0 - r && x < b.x1 + r && z > b.z0 - r && z < b.z1 + r && (y === undefined || y < b.h));
    for (const s of SPRAY.SPOTS) if (inside(s.x, s.z, SPRAY.R)) bad.push('the spray booth ' + s.id + ' is inside a building');
    for (const w of windowSpots()) if (inside(w.x, w.z, 0.6)) bad.push('the window mannequin ' + w.id + ' is inside a building');
    const p = powerSpot(); if (inside(p.x, p.z, 0.6)) bad.push('the substation is inside a building');
    for (const t of tagSpots(B)) if (t.y < 2 && inside(t.x, t.z, 0.3, t.y)) bad.push('the tag ' + t.id + ' is inside a building');
    if (tagSpots(B).length !== TAG_IDS.length || new Set(tagSpots(B).map(t => t.id)).size !== TAG_IDS.length || tagSpots(B).some(t => !TAG_IDS.includes(t.id))) bad.push('tag ids do not match the list');
    if (climbSpots(B).length !== 2) bad.push('there must be two climbs');
    if (inside(CRANE.x, CRANE.z, CRANE.w, 0)) bad.push('the crane is inside a building');
    return bad;
}
export { bagSpots, CRANE };
