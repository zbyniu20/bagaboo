// ==========================================
// BRAMA DO SCARY GTA (czysta logika, bez THREE). Drzwi w aneksie lobby są zamknięte, dopóki gracz nie zaliczy TRZECH prób wypisanych na tablicy obok drzwi:
//  1. RĘCE: Climb Rush (ściana wschodnia) w mniej niż 45 s (dotknięcie dzwonu),
//  2. CELNOŚĆ: Ghost Gallery (daleka ściana): 100 punktów lub więcej w JEDNEJ rundzie,
//  3. GŁOWA: czterocyfrowy kod z klawiatury przy drzwiach. Cyfry to LICZBY rzeczy w aneksie (widma w galerii, manekiny w ogrodzie, klawisze organów, stacje radia), które trzeba policzyć;
//     klawiatura budzi się dopiero po próbach 1 i 2, a trzy złe kody blokują ją na 20 s.
// Po otwarciu brama zostaje otwarta NA STAŁE (SAVE.gta.gate.open, core/gtastore.js). Kod liczy się z prawdziwych stałych gry (test pilnuje zgodności z tablicą).
// Testy: tests/logic.mjs (blok "brama GTA"), w przeglądarce tests/gtagate.mjs.
// ==========================================
import { GAL } from './gallerylogic.js';
import { GARDEN } from './statuelogic.js';
import { ORGAN } from './organlogic.js';
import { STATIONS, newLock, lockStep } from './puzzlelogic.js';
export { newLock, lockStep };
export const GATE = { CLIMB_MAX: 45, GALLERY_MIN: 100, TRIALS: 3 };
// Kod = [widma w galerii][manekiny w ogrodzie][klawisze organów][stacje na skali radia]
export const GATE_COUNTS = { ghosts: GAL.XS.length, statues: GARDEN.START.length, keys: ORGAN.COUNT, stations: STATIONS.length };
export const gateCode = () => String(GATE_COUNTS.ghosts) + GATE_COUNTS.statues + GATE_COUNTS.keys + GATE_COUNTS.stations;
export const newGate = () => ({ climb: false, gallery: false, open: false });
export function normalizeGate(raw) {
    const g = newGate(); if (!raw || typeof raw !== 'object') return g;
    g.climb = raw.climb === true; g.gallery = raw.gallery === true; g.open = raw.open === true;
    if (g.open) { g.climb = true; g.gallery = true; }   // otwarta brama pamięta, że próby są zaliczone
    return g;
}
// Czy wynik zalicza próbę: kind 'climb' (czas w sekundach, mniejszy lub równy limitowi) albo 'gallery' (punkty, co najmniej próg)
export const stagePasses = (kind, value) => Number.isFinite(value) && (kind === 'climb' ? value >= 0.5 && value <= GATE.CLIMB_MAX : (kind === 'gallery' ? value >= GATE.GALLERY_MIN : false));
// Zaliczenie próby: zwraca nowy stan i czy to nowość (immutable)
export function applyStage(g, kind, value) {
    if ((kind !== 'climb' && kind !== 'gallery') || g[kind] || !stagePasses(kind, value)) return { gate: g, isNew: false };
    return { gate: Object.assign({}, g, { [kind]: true }), isNew: true };
}
export const trialsDone = (g) => (g.climb ? 1 : 0) + (g.gallery ? 1 : 0) + (g.open ? 1 : 0);
export const keypadReady = (g) => g.climb && g.gallery;
// Sprawdzenie kodu: 'open' (brama już otwarta), 'locked' (próby 1 i 2 niezaliczone), 'ok' albo 'bad'
export function checkCode(g, typed) { if (g.open) return 'open'; if (!keypadReady(g)) return 'locked'; return String(typed) === gateCode() ? 'ok' : 'bad'; }
export const openGate = (g) => Object.assign({}, g, { open: true, climb: true, gallery: true });
// Treść tablicy obok drzwi: tablica linii { t: tekst, c: 'h' nagłówek | 'ok' zaliczone | 'todo' do zrobienia | 'n' zwykły | 'dim' }
export function boardLines(g) {
    const mark = (done) => done ? 'ok' : 'todo';
    return [
        { t: g.open ? 'SCARY GTA: THE DOOR IS OPEN' : 'SCARY GTA: THE DOOR IS LOCKED', c: 'h' },
        { t: 'Pass 3 trials. Then it stays open forever.', c: 'n' },
        { t: (g.climb || g.open ? '[X]' : '[ ]') + ' 1. HANDS: Climb Rush (east wall)', c: mark(g.climb || g.open) },
        { t: '   Step on the green mat, climb all holds,', c: 'dim' }, { t: '   touch the bell in under ' + GATE.CLIMB_MAX + ' s.', c: 'dim' },
        { t: (g.gallery || g.open ? '[X]' : '[ ]') + ' 2. AIM: Ghost Gallery (far wall)', c: mark(g.gallery || g.open) },
        { t: '   Take a ball from the rack, hit the ghosts', c: 'dim' }, { t: '   and score ' + GATE.GALLERY_MIN + '+ in ONE 60 s round.', c: 'dim' },
        { t: (g.open ? '[X]' : '[ ]') + ' 3. MIND: type the 4-digit code', c: mark(g.open) },
        { t: '   Count, then write the numbers in order:', c: 'dim' },
        { t: '   A  ghosts that pop up in the Gallery', c: 'dim' }, { t: '   B  statues that creep in the Garden', c: 'dim' },
        { t: '   C  keys on the haunted organ', c: 'dim' }, { t: '   D  stations on the radio dial (static too)', c: 'dim' },
        { t: 'Example: A=1 B=2 C=3 D=4 -> type 1234.', c: 'dim' },
        { t: 'The keypad wakes up after trials 1 and 2.', c: 'n' }, { t: '3 wrong codes lock it for 20 s.', c: 'n' }
    ];
}
