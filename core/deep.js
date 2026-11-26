// ==========================================
// GŁĘBOKIE SEKRETY (zapis i nagrody; reguły w czystym core/puzzlelogic.js, testy: tests/logic.mjs i tests/annexsecrets.mjs).
// Stan w SAVE.deep (zawsze przez normalizeDeep). Nie importuje żadnego modułu 3D (importują go nightchest.js i moduły aneksu).
// ==========================================
import { toast } from './terminal.js';
import { SAVE, saveGame, addBones } from './economy.js';
import * as SFX from './audio.js';
import * as P from './puzzlelogic.js';

export function getDeep() { const st = P.normalizeDeep(SAVE.deep); SAVE.deep = st; return st; }
// Znalezienie sekretu: zapis, nagroda, komunikat. Zwraca wynik z puzzlelogic albo null (już znaleziony lub nieznany)
export function findDeepSecret(id) {
    const r = P.findDeep(getDeep(), id); if (!r.isNew) return null;
    SAVE.deep = r.state; addBones(r.bones, 'Deep secret');
    toast('Deep secret ' + P.deepCount(r.state) + '/' + P.DEEP.length + ': ' + P.deepById(id).name, '#c8d8ff'); SFX.bell && SFX.bell();
    if (r.all) setTimeout(() => toast('Every deep secret found: +' + P.DEEP_ALL + ' Bagabucks', '#7fff90'), 2400);
    saveGame();
    return r;
}
// Zapisanie zmiany stanu bez nagrody (np. panel otwarty, sejf wypłacony dziś)
export function patchDeep(patch) { SAVE.deep = Object.assign({}, getDeep(), patch); saveGame(); return SAVE.deep; }
export const deepCountNow = () => P.deepCount(getDeep());
