// ==========================================
// LOGIKA WYŚCIGÓW (czyste funkcje, bez importów, testowane w Node: tests/rounds.mjs): maszyna faz rundy, rejestracja mety,
// wynik gracza i nagroda. Używają jej Parkour Race (levels/race.js), Red Light (levels/redlight.js) oraz fabryka core/racemode.js
// (Swing Run, Tower Climb), które dotąd miały trzy prawie identyczne kopie.
// ==========================================

// Jeden krok maszyny faz: wait -> countdown -> (play) -> results -> wait. Zwraca nową fazę, pozostały czas i zdarzenie przejścia
// ('countdown' | 'play' | 'results' | 'wait' | null), na które poziom reaguje (komunikaty, teleport, nagroda).
// o: { play: nazwa fazy biegu ('race'/'play'), countdown, roundMax, results, wait (sekundy), allFinished: czy wszyscy są na mecie }
export function stepPhase(phase, t, dt, o) {
    const left = t - dt;
    if (phase === 'wait') return left <= 0 ? { phase: 'countdown', t: o.countdown, event: 'countdown' } : { phase, t: left, event: null };
    if (phase === 'countdown') return left <= 0 ? { phase: o.play, t: o.roundMax, event: 'play' } : { phase, t: left, event: null };
    if (phase === o.play) return (left <= 0 || o.allFinished) ? { phase: 'results', t: o.results, event: 'results' } : { phase, t: left, event: null };
    if (phase === 'results') return left <= 0 ? { phase: 'wait', t: o.wait, event: 'wait' } : { phase, t: left, event: null };
    return { phase, t: left, event: null };
}

// Rejestruje metę gracza: kolejność, czas (do 0,1 s) i skrócenie rundy po pierwszym zawodniku. Zmienia S ({order, times, t}).
// Zwraca false, gdy gracz był już na mecie.
export function registerFinish(S, id, t, grace) {
    if (S.order.includes(id)) return false;
    S.order.push(id); S.times[id] = Math.round(t * 10) / 10;
    if (S.order.length === 1) S.t = Math.min(S.t, grace);   // po pierwszym na mecie reszta ma jeszcze chwilę
    return true;
}

// Wynik gracza po rundzie. total >= 2: wygrana, miejsce albo brak mety; solo: czas poniżej czasu wzorcowego, wolniej albo brak czasu
export function raceOutcome(order, total, times, par, me = 'me') {
    const mine = order.indexOf(me);
    if (total >= 2) return mine === 0 ? { kind: 'won', place: 1 } : (mine > 0 ? { kind: 'place', place: mine + 1 } : { kind: 'dnf' });
    if (mine === 0) { const t = times[me]; return t <= par ? { kind: 'par', time: t } : { kind: 'slow', time: t }; }
    return { kind: 'timeout' };
}
// Nagroda za wynik: wygrana z innymi graczami albo czas poniżej wzorcowego w trybie solo
export const outcomeReward = (o, win = 200, parReward = 150) => o.kind === 'won' ? win : (o.kind === 'par' ? parReward : 0);
