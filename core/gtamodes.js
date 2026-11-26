// ==========================================
// SCARY GTA: TRYBY GRY (czysta logika, bez THREE). Wolna gra, POLICJA KONTRA ZŁODZIEJE (role z hosta; policjant-gracz łapie złodziei dotykiem i strzałami, nie zbiera toreb),
// WYŚCIG O TORBY (kto pierwszy wyjdzie z 3 torbami) i KOOPERACJA (wspólny cel 6 toreb, wspólne ciepło). Rundy nic nie płacą (bez farmienia): liczy się tylko wynik rundy.
// Wszystko rozstrzyga HOST (z własnego widoku graczy); goście dostają migawkę przez cleanModeSnap. Testy: tests/logic.mjs (blok "tryby GTA"), w przeglądarce tests/gtamodes.mjs.
// ==========================================
export const MODES = ['free', 'cops', 'race', 'coop'];
export const MODE_NAMES = { free: 'FREE ROAM', cops: 'COPS vs ROBBERS', race: 'BAG RACE', coop: 'CO-OP HEIST' };
export const RULES = {
    cops: { time: 240, min: 2, bagPts: 2, bustPts: 1 },
    race: { time: 180, min: 2, goal: 3 },
    coop: { time: 300, min: 1, goal: 6 }
};
const fin = (n) => typeof n === 'number' && Number.isFinite(n);
const tidy = (id) => { const s = typeof id === 'string' ? id.replace(/[^\w:.-]/g, '').slice(0, 48) : ''; return s || null; };
export const cleanModeId = (m) => MODES.includes(m) ? m : 'free';
export const newModeState = () => ({ mode: 'free', phase: 'idle', t: 0, roles: {}, score: {}, delivered: 0, winner: '' });
export const canStart = (mode, n) => mode !== 'free' && !!RULES[mode] && n >= RULES[mode].min;
// Role: co trzeci gracz to policjant (co najmniej jeden i co najmniej jeden złodziej); reszta tryb to złodzieje
export function assignRoles(ids, mode, rand) {
    const R = rand || Math.random, roles = {}, n = ids.length;
    if (mode !== 'cops' || n < 2) { for (const id of ids) roles[id] = 'robber'; return roles; }
    const copsN = Math.max(1, Math.min(n - 1, Math.round(n / 3))), pool = ids.slice(), picked = new Set();
    while (picked.size < copsN) picked.add(pool.splice(Math.floor(R() * pool.length), 1)[0]);
    for (const id of ids) roles[id] = picked.has(id) ? 'cop' : 'robber';
    return roles;
}
export function startRound(st, mode, ids, rand) {
    if (!canStart(mode, ids.length)) return st;
    const score = {}; for (const id of ids) score[id] = 0;
    return { mode: mode, phase: 'run', t: RULES[mode].time, roles: assignRoles(ids, mode, rand), score: score, delivered: 0, winner: '' };
}
export const stopRound = (st) => Object.assign({}, st, { phase: 'idle', t: 0, roles: {}, score: {}, delivered: 0, winner: '' });
const add = (score, id, n) => Object.assign({}, score, { [id]: (score[id] || 0) + n });
// Zdarzenia: { type: 'bust', by, id } (policjant złapał złodzieja), { type: 'deliver', id, n } (wyjście z n torbami)
export function modeEvent(st, ev) {
    if (st.phase !== 'run') return st;
    const s = Object.assign({}, st), role = (id) => st.roles[id];
    if (ev.type === 'bust' && st.mode === 'cops' && role(ev.by) === 'cop' && role(ev.id) === 'robber') s.score = add(st.score, ev.by, RULES.cops.bustPts);
    else if (ev.type === 'deliver' && ev.n > 0 && role(ev.id) !== 'cop') {
        s.delivered = st.delivered + ev.n;
        if (st.mode === 'cops') s.score = add(st.score, ev.id, ev.n * RULES.cops.bagPts);
        else if (st.mode === 'race') { s.score = add(st.score, ev.id, ev.n); if (st.score[ev.id] + ev.n >= RULES.race.goal) { s.phase = 'over'; s.winner = ev.id; } }
        else if (st.mode === 'coop') { s.score = add(st.score, ev.id, ev.n); if (s.delivered >= RULES.coop.goal) { s.phase = 'over'; s.winner = 'team'; } }
    }
    return s;
}
// Zwycięzca po czasie: policja kontra złodzieje: drużyna z większą sumą (remis: złodzieje); wyścig: najwięcej toreb (brak: nikt); kooperacja: porażka
export function finishByTime(st) {
    const sum = (r) => Object.keys(st.score).filter(id => st.roles[id] === r).reduce((a, id) => a + st.score[id], 0);
    if (st.mode === 'cops') return sum('cop') > sum('robber') ? 'cops' : 'robbers';
    if (st.mode === 'race') { let best = '', v = 0; for (const id of Object.keys(st.score)) if (st.score[id] > v) { v = st.score[id]; best = id; } return best; }
    return st.mode === 'coop' ? 'lost' : '';
}
export function modeStep(st, dt) {
    if (st.phase !== 'run') return st;
    const t = st.t - Math.min(Math.max(+dt || 0, 0), 0.5);
    if (t > 0) return Object.assign({}, st, { t: t });
    return Object.assign({}, st, { t: 0, phase: 'over', winner: finishByTime(st) });
}
export const teamOf = (st, id) => st.phase === 'run' && st.mode === 'cops' ? (st.roles[id] || 'robber') : 'all';
// Czy strzelec może zranić cel: w trybie cops tylko między drużynami, w coop nigdy, w pozostałych wg ognia przyjacielskiego trudności
export const canHurt = (st, a, b, friendly) => st.phase === 'run' && st.mode === 'cops' ? teamOf(st, a) !== teamOf(st, b) : (st.phase === 'run' && st.mode === 'coop' ? false : friendly);
export function timeText(t) { const v = Math.max(0, Math.ceil(+t || 0)); return Math.floor(v / 60) + ':' + String(v % 60).padStart(2, '0'); }
// Migawka do sieci: { m, ph, t, r: {id: 'cop'|'robber'}, s: {id: wynik}, d, w }; odbiorca zawsze przez cleanModeSnap (najwyżej 10 graczy, krótkie id, skończone liczby)
export const modeSnap = (st) => ({ m: st.mode, ph: st.phase, t: +st.t.toFixed(1), r: st.roles, s: st.score, d: st.delivered, w: st.winner });
export function cleanModeSnap(m) {
    const out = newModeState(); if (!m || typeof m !== 'object') return out;
    out.mode = cleanModeId(m.m); out.phase = ['idle', 'run', 'over'].includes(m.ph) ? m.ph : 'idle'; out.t = fin(m.t) ? Math.max(0, Math.min(600, m.t)) : 0;
    out.delivered = fin(m.d) ? Math.max(0, Math.min(99, Math.floor(m.d))) : 0; out.winner = typeof m.w === 'string' ? (tidy(m.w) || '') : '';
    let n = 0;
    if (m.r && typeof m.r === 'object' && !Array.isArray(m.r)) for (const k of Object.keys(m.r)) { if (n++ >= 10) break; const id = tidy(k); if (id && (m.r[k] === 'cop' || m.r[k] === 'robber')) out.roles[id] = m.r[k]; }
    n = 0;
    if (m.s && typeof m.s === 'object' && !Array.isArray(m.s)) for (const k of Object.keys(m.s)) { if (n++ >= 10) break; const id = tidy(k); if (id && fin(m.s[k])) out.score[id] = Math.max(0, Math.min(99, Math.floor(m.s[k]))); }
    return out;
}
