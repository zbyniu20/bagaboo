// Zapis dodatków Scary GTA (SAVE.gta): odczyt i zapis zawsze przez normalizeGta (core/gtaextras.js).
import { SAVE, saveGame } from './economy.js';
import { normalizeGta } from './gtaextras.js';
export function getGta() { const g = normalizeGta(SAVE.gta); SAVE.gta = g; return g; }
export function setGta(g) { SAVE.gta = normalizeGta(g); saveGame(); return SAVE.gta; }
