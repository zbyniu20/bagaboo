// ==========================================
// DANE POZIOMU PRZEKAZYWANE GOŚCIOM (bez importów, testowane w Node: tests/leveldata.mjs): niektóre poziomy zależą od danych hosta, np. Własna mapa
// (core/workshopstore.js) albo Mój Pokój w odwiedzinach (core/homestore.js). Host dołącza je do sendFollow, gość przyjmuje je TYLKO przez walidator
// poziomu (accept), nigdy w surowej postaci: dane z sieci mogą być dowolne. Poziom czyta LEVEL_DATA.current (null = użyj własnych lokalnych danych).
// ==========================================
export const LEVEL_DATA = { current: null };
export const MAX_BYTES = 8000;   // większe ładunki są odrzucane po obu stronach
const providers = {}, acceptors = {};
const size = (v) => { try { return JSON.stringify(v).length; } catch (e) { return Infinity; } };
// Poziom rejestruje: provide() -> dane do wysłania gościom (lub undefined), accept(raw) -> zwalidowane dane (lub null)
export function register(id, provide, accept) { providers[id] = provide; acceptors[id] = accept; }
export function payload(id) {
    try { const p = providers[id] ? providers[id]() : undefined; return (p === undefined || p === null || size(p) > MAX_BYTES) ? undefined : p; } catch (e) { return undefined; }
}
export function accept(id, raw) {
    try { if (raw === undefined || raw === null || !acceptors[id] || size(raw) > MAX_BYTES) return null; return acceptors[id](raw) || null; } catch (e) { return null; }
}
