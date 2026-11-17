// ==========================================
// MAGAZYN MAP WARSZTATU: trzy miejsca zapisu w localStorage (kody tekstowe), wybrana mapa i rejestracja danych dla gości (core/leveldata.js).
// Każdy kod wchodzi do gry wyłącznie przez decodeMap (core/workshoplogic.js), także ten z pamięci urządzenia, bo localStorage można edytować ręcznie.
// Moduł jest ładowany od startu gry (main.js), bo host dołącza mapę do sendFollow, zanim poziom 'custom' się załaduje.
// ==========================================
import { register } from './leveldata.js';
import { decodeMap, encodeMap } from './workshoplogic.js';

const KEY = 'bagaboo_workshop_v1';
export const SLOTS = 3;
function load() {
    try { const s = JSON.parse(localStorage.getItem(KEY)); const slots = Array.isArray(s && s.slots) ? s.slots.slice(0, SLOTS) : []; while (slots.length < SLOTS) slots.push(null);
        return { slots: slots.map(c => typeof c === 'string' && decodeMap(c).map ? c : null), sel: Number.isInteger(s && s.sel) && s.sel >= 0 && s.sel < SLOTS ? s.sel : 0 }; }
    catch (e) { return { slots: [null, null, null], sel: 0 }; }
}
export const WS = load();
function persist() { try { localStorage.setItem(KEY, JSON.stringify({ slots: WS.slots, sel: WS.sel })); } catch (e) {} }
export const currentCode = () => WS.slots[WS.sel];
export const mapIn = (i) => WS.slots[i] ? decodeMap(WS.slots[i]).map : null;
export const currentMap = () => mapIn(WS.sel);
export function selectSlot(i) { if (Number.isInteger(i) && i >= 0 && i < SLOTS) { WS.sel = i; persist(); } }
export function saveMap(i, map) { if (!Number.isInteger(i) || i < 0 || i >= SLOTS) return false; const code = encodeMap(map); if (!decodeMap(code).map) return false; WS.slots[i] = code; WS.sel = i; persist(); return true; }

// Host wysyła kod wybranej mapy, gość przyjmuje go tylko po pełnej walidacji i dostaje { map }
register('custom', () => currentCode() || undefined, (raw) => { const r = decodeMap(raw); return r.map ? { map: r.map } : null; });
