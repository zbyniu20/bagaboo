// Zapis dodatków Scary GTA (SAVE.gta): odczyt i zapis zawsze przez normalizeGta (core/gtaextras.js).
import { SAVE, saveGame, addBones } from './economy.js';
import { normalizeGta } from './gtaextras.js';
import { findGtaEgg } from './gtaeggs.js';
export function getGta() { const g = normalizeGta(SAVE.gta); SAVE.gta = g; return g; }
export function setGta(g) { SAVE.gta = normalizeGta(g); saveGame(); return SAVE.gta; }
// Brama do Scary GTA (core/gtagate.js): zaliczenie próby (zapis od razu) i odczyt stanu
import { applyStage, openGate } from './gtagate.js';
export const gateState = () => getGta().gate;
export const gateOpen = () => getGta().gate.open;
export function markGate(kind, value) { const g = getGta(), r = applyStage(g.gate, kind, value); if (!r.isNew) return { isNew: false, gate: g.gate }; setGta(Object.assign({}, g, { gate: r.gate })); return { isNew: true, gate: r.gate }; }
export function unlockGate() { const g = getGta(); if (g.gate.open) return false; setGta(Object.assign({}, g, { gate: openGate(g.gate) })); return true; }
// Easter eggi w mieście (core/gtaeggs.js): znalezienie zapisuje się od razu i płaci raz (addBones); zwraca wynik findGtaEgg
export const gtaEggs = () => getGta().eggs;
export function markGtaEgg(id) { const g = getGta(), r = findGtaEgg(g.eggs, id); if (!r.isNew) return r; setGta(Object.assign({}, g, { eggs: r.state })); addBones(r.bones, 'Scary GTA egg'); return r; }
