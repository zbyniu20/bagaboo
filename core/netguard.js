// ==========================================
// STRAŻNIK HOSTA: walidacja zgłoszeń gości w trybach rund (czyste funkcje, bez importów, testowane w Node: tests/rounds.mjs).
// Zasada (jak przy rangach): host nie ufa temu, co zgłasza klient. Meta, zebrany skarb i wynik są przyjmowane tylko wtedy, gdy zgadzają się
// z pozycją gracza, którą host zna z własnego stanu (playersState), z jego własnym zegarem rundy i z możliwościami trybu.
// ==========================================
export const TOL = { FINISH: 4, GRAB: 4 };   // zapas na opóźnienie sieci (m): gracz biegnie ok. 8 m/s, a pozycje docierają co kilkadziesiąt ms
const num = (v) => typeof v === 'number' && Number.isFinite(v);

// Pozycja głowy {x, y, z} albo null, gdy brakuje jej lub jest nieskończona/NaN
export const validHead = (h) => (h && num(h.x) && num(h.y) && num(h.z)) ? h : null;
// Czy głowa jest za linią mety (z mniejsze niż linia) z zapasem na opóźnienie; opcjonalnie nie niżej niż minY - tolY
export function pastFinishLine(h, lineZ, minY, tol = TOL.FINISH) {
    const p = validHead(h); if (!p || !num(lineZ)) return false;
    return p.z < lineZ + tol && (minY === undefined || p.y > minY - tol);
}
// Czy głowa jest blisko celu {x, z} w poziomie (np. skarb)
export function nearTarget(h, target, radius = TOL.GRAB) { const p = validHead(h); return !!p && !!target && num(target.x) && num(target.z) && Math.hypot(p.x - target.x, p.z - target.z) < radius; }
// Czy indeks to liczba całkowita z zakresu 0..n-1 (indeksy z sieci bywają tekstem, ułamkiem albo NaN)
export const validIndex = (i, n) => Number.isInteger(i) && i >= 0 && i < n;
// Wynik zgłoszony przez klienta: liczba całkowita nieujemna, rosnąca najwyżej tak szybko, jak pozwala tryb (burst + perSec * sekundy od poprzedniego zgłoszenia).
// Wynik niższy od poprzedniego (nowa runda) jest przyjmowany, bo nikomu nie daje przewagi.
export function clampScore(prev, next, seconds, perSec, burst) {
    const p = num(prev) && prev >= 0 ? prev : 0;
    if (!num(next) || next < 0) return p;
    const cap = p + burst + perSec * Math.max(0, num(seconds) ? seconds : 0);
    return Math.min(Math.floor(next), Math.floor(cap));
}
// Nazwa do wyświetlenia na liście wyników: tylko znaki z NICK_RE, najwyżej 16; nigdy nie służy do uprawnień
export function safeName(n) { const s = String(n === undefined || n === null ? '' : n).replace(/[^A-Za-z0-9_-]/g, '').slice(0, 16); return s || 'Player'; }
// Czas od startu rundy liczony zegarem hosta (czasu zgłoszonego przez gościa host nie używa)
export const elapsedSince = (now, start) => (num(now) && num(start)) ? Math.max(0, now - start) : 0;
