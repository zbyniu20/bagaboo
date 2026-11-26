// ==========================================
// SCARY GTA, ETAP 3a (czysta logika, bez THREE): walidatory wiadomości sieciowych, śledzenie prędkości gościa i sprawdzanie zabrania torby.
// Host liczy policję, ciepło i torby dla wszystkich i wysyła migawki; goście przyjmują je WYŁĄCZNIE przez te funkcje (tylko skończone liczby z zakresów, krótkie tablice).
// Testy: tests/logic.mjs (blok "Scary GTA, etap 3a").
// ==========================================
import { CITY } from './citylayout.js';
import { cleanDrive } from './vehiclelogic.js';
export const GN = { HZ: 8, MAX_COPS: 10, MAX_BAGS: 6, MAX_PLAYERS: 10, HEAD_TO_BODY: 0.6, SPEED_TAU: 0.3, TAKE_R: 3.6, TAKE_DY: 2.8, BUST_PROTECT: 5, SHOUT_GAP: 3, HOST_LOST: 1.5, MODES: ['patrol', 'investigate', 'chase', 'search'] };
const fin = (n) => typeof n === 'number' && Number.isFinite(n);
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const cx = (x) => clamp(x, CITY.X0 - 4, CITY.X1 + 4), cz = (z) => clamp(z, CITY.Z0 - 4, CITY.Z1 + 22);
const tidy = (id) => { const s = typeof id === 'string' ? id.replace(/[^\w:.-]/g, '').slice(0, 48) : ''; return s || null; };
export const bodyY = (headY) => headY - GN.HEAD_TO_BODY;   // gość podaje tylko głowę; poziom odniesienia jak ciało gracza lokalnie (podłoga + ok. 1 m)
// Policjanci: [indeks, x, z, kierunek, tryb] (najwyżej MAX_COPS, bez powtórzeń indeksu)
export function cleanCops(a) {
    if (!Array.isArray(a)) return [];
    const out = [], seen = new Set();
    for (const e of a.slice(0, GN.MAX_COPS)) {
        if (!Array.isArray(e) || !Number.isInteger(e[0]) || e[0] < 0 || e[0] >= GN.MAX_COPS || seen.has(e[0]) || !fin(e[1]) || !fin(e[2]) || !fin(e[3])) continue;
        seen.add(e[0]); out.push({ i: e[0], x: cx(e[1]), z: cz(e[2]), dir: clamp(e[3], -7, 7), mode: GN.MODES.includes(e[4]) ? e[4] : 'patrol' });
    }
    return out;
}
// Torby: [id, x, y, z, nosiciel|null]; id tylko z listy znanych
export function cleanBags(a, ids) {
    if (!Array.isArray(a)) return [];
    const out = [], seen = new Set();
    for (const e of a.slice(0, GN.MAX_BAGS)) {
        if (!Array.isArray(e) || typeof e[0] !== 'string' || !ids.includes(e[0]) || seen.has(e[0]) || !fin(e[1]) || !fin(e[2]) || !fin(e[3])) continue;
        seen.add(e[0]); out.push({ id: e[0], x: cx(e[1]), y: clamp(e[2], -2, 60), z: cz(e[3]), holder: e[4] === null || e[4] === undefined ? null : tidy(e[4]) });
    }
    return out;
}
// Ciepło graczy: { idSieciowe: [ciepło, hidden] } (gwiazdki liczy odbiorca z ciepła)
export function cleanHeats(o) {
    const out = {}; if (!o || typeof o !== 'object' || Array.isArray(o)) return out;
    let n = 0;
    for (const k of Object.keys(o)) { if (n >= GN.MAX_PLAYERS) break; const id = tidy(k), v = o[k]; if (!id || !Array.isArray(v) || !fin(v[0])) continue; out[id] = { v: clamp(v[0], 0, 100), hidden: v[1] === 1 || v[1] === true }; n++; }
    return out;
}
// Lista złapanych (identyfikatory sieciowe) i pojedyncza wiadomość BUST
export const cleanIds = (a) => Array.isArray(a) ? a.slice(0, GN.MAX_PLAYERS).map(tidy).filter(Boolean) : [];
export function cleanBust(m) {
    if (!m || typeof m !== 'object') return null; const id = tidy(m.id);
    if (!id || !fin(m.x) || !fin(m.z)) return null;
    return { id, reason: m.r === 'gator' ? 'gator' : (m.r === 'shot' ? 'shot' : 'cop'), x: cx(m.x), z: cz(m.z) };
}
// Prędkość gościa z różnic pozycji głowy, wygładzona (host nie ufa prędkości od klienta)
export const newTrack = () => ({ x: 0, z: 0, t: -1, v: 0 });
export function trackStep(tr, x, z, now) {
    if (!fin(x) || !fin(z) || !fin(now)) return tr.v;
    if (tr.t < 0 || now - tr.t > 1.5) { tr.x = x; tr.z = z; tr.t = now; tr.v = 0; return 0; }
    const dt = now - tr.t; if (dt < 0.02) return tr.v;
    const raw = Math.min(40, Math.hypot(x - tr.x, z - tr.z) / dt), k = 1 - Math.exp(-dt / GN.SPEED_TAU);
    tr.v += (raw - tr.v) * k; tr.x = x; tr.z = z; tr.t = now; return tr.v;
}
// Czy gracz (głowa z widoku hosta) może zabrać torbę: blisko poziomo i na tej samej wysokości (dach, wieża)
export function validTake(bag, head, held) {
    if (!bag || !head || !fin(head.x) || !fin(head.y) || !fin(head.z) || held) return false;
    return Math.hypot(head.x - bag.x, head.z - bag.z) < GN.TAKE_R && Math.abs((bodyY(head.y) - 1.0) - bag.y) < GN.TAKE_DY;
}
// Żądanie gościa do hosta: zabranie torby albo zdarzenie hałasu (tylko znane rodzaje)
export function cleanRequest(m, bagIds) {
    if (!m || typeof m !== 'object') return null;
    if (m.k === 'take') return typeof m.b === 'string' && bagIds.includes(m.b) ? { k: 'take', b: m.b } : null;
    if (m.k === 'ev' && m.kind === 'drive') { const d = cleanDrive(m); return d ? { k: 'ev', kind: 'drive', car: d.car, route: d.route } : null; }
    if (m.k === 'ev') return ['shout', 'ride', 'spray', 'alarm', 'dis', 'power', 'deliver', 'dismount'].includes(m.kind) ? { k: 'ev', kind: m.kind } : null;
    if (m.k === 'gbust') return { k: 'gbust' };
    return null;
}
// Helikopter z migawki hosta: [x, y, z, kierunek, światło x, światło z, tryb]
export function cleanHeli(a) {
    if (!Array.isArray(a) || a.length !== 7 || !a.slice(0, 6).every(fin) || !['arrive', 'investigate', 'chase', 'leave'].includes(a[6])) return null;
    return { x: clamp(a[0], -220, 220), y: clamp(a[1], 0, 100), z: clamp(a[2], -220, 240), yaw: clamp(a[3], -7, 7), lx: clamp(a[4], -220, 220), lz: clamp(a[5], -220, 240), mode: a[6] };
}
