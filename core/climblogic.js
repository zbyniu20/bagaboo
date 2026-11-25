// ==========================================
// CLIMB RUSH (czysta logika, bez THREE): stoper toru wspinaczkowego w aneksie lobby. Zapis: SAVE.annex { climbBest } (core/annex.js, zawsze przez normalizeAnnex).
// Bieg startuje, gdy dłoń dotknie pierwszego uchwytu, a kończy dotknięcie dzwonu na szczycie. Lokalny rekord czasu; bez Bagabucksów i bez rekordów gry.
// ==========================================
export const CLIMB_T = { MIN: 2, MAX: 180, RESTART_AFTER: 5, SHOW_DONE: 6 };
export const newClimb = () => ({ ph: 'idle', t: 0, last: 0, shown: 0 });
export function normalizeAnnex(raw) {
    const out = { climbBest: 0 };
    if (raw && typeof raw === 'object' && typeof raw.climbBest === 'number' && Number.isFinite(raw.climbBest) && raw.climbBest >= CLIMB_T.MIN && raw.climbBest <= 3600) out.climbBest = Math.round(raw.climbBest * 100) / 100;
    return out;
}
// Krok stoperatora: startTouch (dłoń przy pierwszym uchwycie), endTouch (dłoń przy dzwonie), dt w sekundach, best = dotychczasowy rekord (0 = brak).
// Zwraca { st, event } z event: '', 'start', 'restart', 'finish', 'record', 'timeout'
export function climbStep(st, startTouch, endTouch, dt, best) {
    const s = { ph: st.ph, t: st.t, last: st.last, shown: st.shown }, d = Math.min(Math.max(dt, 0), 0.5);
    if (s.ph === 'idle') { if (startTouch) { s.ph = 'run'; s.t = 0; return { st: s, event: 'start' }; } return { st: s, event: '' }; }
    if (s.ph === 'done') { s.shown += d; if (s.shown >= CLIMB_T.SHOW_DONE) { s.ph = 'idle'; s.shown = 0; } return { st: s, event: '' }; }
    s.t += d;
    if (s.t > CLIMB_T.MAX) { s.ph = 'idle'; s.t = 0; return { st: s, event: 'timeout' }; }
    if (endTouch && s.t >= CLIMB_T.MIN) { s.ph = 'done'; s.last = s.t; s.shown = 0; return { st: s, event: (!best || s.t < best) ? 'record' : 'finish' }; }
    if (startTouch && s.t > CLIMB_T.RESTART_AFTER) { s.t = 0; return { st: s, event: 'restart' }; }
    return { st: s, event: '' };
}
export const formatTime = (t) => { const v = Math.max(0, Math.min(5999.99, +t || 0)), m = Math.floor(v / 60), r = v - m * 60; return (m ? m + ':' : '') + (m && r < 10 ? '0' : '') + r.toFixed(2); };
