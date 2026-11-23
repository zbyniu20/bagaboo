// ==========================================
// BECOME THE MONSTER: urwane kończyny (czysta logika, bez THREE i sieci; testy: tests/modes/monster.mjs)
// Gdy potwór złapie gracza, host (albo gracz solo) losuje, co ofiara traci: lewą rękę, prawą rękę, obie ręce albo głowę.
// Kod to maska bitów: 1 = lewa ręka, 2 = prawa ręka (3 = obie), 4 = głowa. Przez sieć idzie tylko mapa id -> kod, a odbiorca przyjmuje ją przez cleanDismember.
// Pokazywanie jest opcją każdego gracza (SETTINGS.gore, domyślnie włączona). Kod rozstrzyga o życiu (catchOutcome): jedna ręka = gracz żyje, dwie ręce albo głowa = odpada.
// ==========================================
export const DM = { LEFT: 1, RIGHT: 2, HEAD: 4 };
export const DM_CODES = [1, 2, 3, 4];
export const MAX_ENTRIES = 16;
export function pickDismember(rand) { return DM_CODES[Math.min(DM_CODES.length - 1, Math.floor(rand() * DM_CODES.length))]; }
// Skutek złapania: pierwsza urwana RĘKA nie zabija (gracz gra dalej z jedną ręką), dwie ręce albo głowa zabijają.
// prev = kod, który gracz już ma; pick = wylosowany; wylosowanie ręki, której już nie ma, urywa drugą (więc drugie złapanie zawsze zabija).
// Zwraca { code: nowy kod, dead: czy gracz odpada z rundy }.
export const GRACE = 3.0;   // s ochrony po przeżytym złapaniu: potwór stojący przy ofierze nie urwie jej od razu drugiej ręki
export function catchOutcome(prev, pick) {
    prev = DM_CODES.includes(prev) ? prev : 0; if (!DM_CODES.includes(pick)) pick = DM.LEFT;
    if ((pick === DM.LEFT || pick === DM.RIGHT) && (prev & pick)) pick = pick === DM.LEFT ? DM.RIGHT : DM.LEFT;
    const code = prev | pick;
    return { code: code, dead: (code & DM.HEAD) !== 0 || (code & 3) === 3 };
}
export const lostLeft = (c) => (c & DM.LEFT) !== 0;
export const lostRight = (c) => (c & DM.RIGHT) !== 0;
export const lostHead = (c) => (c & DM.HEAD) !== 0;
export function dismemberText(c) { return c === 4 ? 'your head' : (c === 3 ? 'both hands' : (c === 1 ? 'your left hand' : (c === 2 ? 'your right hand' : ''))); }
// Mapa od hosta: tylko poprawne kody i rozsądne klucze; reszta jest odrzucana (zwraca zawsze nowy obiekt bez prototypu)
export function cleanDismember(raw) {
    const out = Object.create(null);
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return out;
    let n = 0;
    for (const k of Object.keys(raw)) {
        if (n >= MAX_ENTRIES) break;
        if (typeof k !== 'string' || !k || k.length > 64 || k === '__proto__') continue;
        if (!DM_CODES.includes(raw[k])) continue;
        out[k] = raw[k]; n++;
    }
    return out;
}
