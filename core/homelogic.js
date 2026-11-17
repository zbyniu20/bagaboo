// ==========================================
// MÓJ POKÓJ: LOGIKA (czyste funkcje, bez importów, testowane w Node: tests/modes/home.mjs).
// Pokój ma 8 miejsc na meble. Gracz kupuje meble za Bagabucks (katalog poniżej, cena stała) i ustawia je w miejscach (jeden mebel w jednym miejscu).
// Stan pokoju to { owned: [id], slots: [id|null x 8] } w SAVE.home; każde wczytanie przechodzi przez normalizeHome, więc ręcznie zmieniony zapis
// nie da mebli, których nie kupiono. Goście, którzy idą za hostem do jego pokoju, dostają tylko układ (visitPayload) i przyjmują go przez acceptVisit.
// ==========================================
export const FURNITURE = [
    { id: 'plant', name: 'Plant', price: 200 }, { id: 'lamp', name: 'Lamp', price: 250 }, { id: 'rug', name: 'Rug', price: 300 }, { id: 'shelf', name: 'Bookshelf', price: 450 },
    { id: 'neon', name: 'Neon sign', price: 500 }, { id: 'couch', name: 'Couch', price: 600 }, { id: 'jukebox', name: 'Jukebox', price: 900 }, { id: 'statue', name: 'Statue', price: 1200 }
];
export const SLOTS = [[-4.5, -3.5, 0.4], [0, -4.8, 0], [4.5, -3.5, -0.4], [-5.2, 1.2, Math.PI / 2], [5.2, 1.2, -Math.PI / 2], [-3.2, 4.6, Math.PI], [3.2, 4.6, Math.PI], [0, 0.5, 0]];   // x, z, obrót
export const ROOM = { W: 7, D: 7 };
const IDS = new Set(FURNITURE.map(f => f.id));
const num = (v) => typeof v === 'number' && Number.isFinite(v);
export const isFurniture = (id) => typeof id === 'string' && IDS.has(id);
export const priceOf = (id) => { const f = FURNITURE.find(x => x.id === id); return f ? f.price : undefined; };
export const emptyHome = () => ({ owned: [], slots: SLOTS.map(() => null) });
const cleanSlots = (raw, allowed) => { const seen = new Set(); return SLOTS.map((_, i) => { const id = Array.isArray(raw) ? raw[i] : null; if (!isFurniture(id) || seen.has(id) || (allowed && !allowed.includes(id))) return null; seen.add(id); return id; }); };

// Czyści dowolny obiekt do poprawnego pokoju: tylko znane meble, bez duplikatów, w miejscach tylko to, co jest kupione
export function normalizeHome(raw) {
    if (!raw || typeof raw !== 'object') return emptyHome();
    const owned = []; if (Array.isArray(raw.owned)) for (const id of raw.owned) if (isFurniture(id) && !owned.includes(id)) owned.push(id);
    return { owned: owned, slots: cleanSlots(raw.slots, owned) };
}
// Czy stać gracza i czy mebel jest do kupienia: { ok, reason: 'unknown'|'owned'|'poor', price }
export function canBuy(home, wallet, id) {
    if (!isFurniture(id)) return { ok: false, reason: 'unknown' };
    if (home.owned.includes(id)) return { ok: false, reason: 'owned', price: priceOf(id) };
    if (!num(wallet) || wallet < priceOf(id)) return { ok: false, reason: 'poor', price: priceOf(id) };
    return { ok: true, price: priceOf(id) };
}
export const buy = (home, id) => ({ owned: home.owned.concat(isFurniture(id) && !home.owned.includes(id) ? [id] : []), slots: home.slots.slice() });
// Ustawia mebel w miejscu (przenosi go, jeśli stał gdzie indziej); id = null opróżnia miejsce
export function place(home, slot, id) {
    if (!Number.isInteger(slot) || slot < 0 || slot >= SLOTS.length) return { home: home, error: 'bad slot' };
    if (id !== null && !home.owned.includes(id)) return { home: home, error: 'not owned' };
    const slots = home.slots.map(s => (id !== null && s === id) ? null : s); slots[slot] = id;
    return { home: { owned: home.owned.slice(), slots: slots }, error: null };
}

// ---------- odwiedziny: host zabiera gości do swojego pokoju ----------
const cleanOwner = (n) => { const s = String(n === undefined || n === null ? '' : n).replace(/[^A-Za-z0-9_-]/g, '').slice(0, 16); return s || 'Someone'; };
export const visitPayload = (home, owner, ach) => ({ o: cleanOwner(owner), s: home.slots.slice(), a: num(ach) ? Math.max(0, Math.min(999, Math.floor(ach))) : 0 });
// Gość przyjmuje układ tylko w tej postaci: znane meble bez duplikatów, nazwa z bezpiecznych znaków, liczba osiągnięć 0..999
export function acceptVisit(raw) {
    if (!raw || typeof raw !== 'object' || !Array.isArray(raw.s)) return null;
    return { owner: cleanOwner(raw.o), slots: cleanSlots(raw.s, null), ach: num(raw.a) ? Math.max(0, Math.min(999, Math.floor(raw.a))) : 0 };
}

// ---------- tablica trofeów ----------
// Rekord do tekstu: czas jako m:ss.d, wynik punktowy jako liczba; null gdy go nie ma
export function fmtRecord(def, v) {
    if (!num(v) || v <= 0) return null;
    if (def && def.score) return String(Math.floor(v));
    const m = Math.floor(v / 60), s = v - m * 60; return m + ':' + (s < 10 ? '0' : '') + s.toFixed(1);
}
// Linie tablicy: liczba osiągnięć i do 'max' rekordów (tylko te, które gracz ma)
export function plaques(unlocked, total, defs, records, max = 6) {
    const lines = ['Achievements ' + unlocked + ' / ' + total];
    for (const d of defs) { const v = fmtRecord(d, records && records[d.id]); if (v !== null && lines.length < max + 1) lines.push(d.name + ': ' + v); }
    return lines;
}
// Ile pucharów stoi na półce: jeden za każde 3 osiągnięcia, najwyżej 10
export const cupsFor = (unlocked) => num(unlocked) ? Math.max(0, Math.min(10, Math.floor(unlocked / 3))) : 0;
