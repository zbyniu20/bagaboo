// ==========================================
// STRZELNICA NA PIŁKI (czysta logika, bez THREE): Ghost Gallery w aneksie lobby (core/annexgallery.js, strefa gallery w core/annexlayout.js).
// Pięć widm wyskakuje przy dalekiej ścianie; trafienie piłką (środek piłki w bryle widma) daje punkty. Runda trwa ROUND sekund od pierwszego trafienia.
// Wynik liczy KAŻDY klient lokalnie z pozycji piłek w swoim świecie: to zabawa bez nagród (nie daje Bagabucksów ani rekordów gry), więc nie ma czego nadużywać
// i nic nie idzie przez sieć. Najlepszy wynik: SAVE.annex.galleryBest (core/climblogic.js: normalizeAnnex).
// ==========================================
export const GAL = { XS: [-6, -3.5, -1, 1.5, 4], Z: 49.55, BASE: 0.55, W: 0.9, H: 1.3, DEPTH: 0.45, UP: [2.0, 3.2], DOWN: [0.8, 2.0], ROUND: 60, POINTS: 10, BONUS_STREAK: 3, OVER_SHOW: 6, MAX_UP: 3 };
export const newGallery = () => ({ t: [0, 1, 2, 3, 4].map(i => ({ up: false, left: 0.6 + i * 0.35 })), ph: 'idle', time: 0, score: 0, streak: 0, over: 0, last: 0 });
const span = (r, rand) => r[0] + (r[1] - r[0]) * rand();
// Czy piłka (środek) jest w bryle widma i (opcjonalnie) w drodze do ściany
export function hitsTarget(i, p) {
    const x = GAL.XS[i]; if (x === undefined) return false;
    return Math.abs(p[0] - x) <= GAL.W / 2 + 0.12 && p[1] >= GAL.BASE - 0.1 && p[1] <= GAL.BASE + GAL.H + 0.1 && p[2] >= GAL.Z - GAL.DEPTH && p[2] <= GAL.Z + 0.3;
}
// Krok czasu: widma same wyskakują i chowają się (najwyżej MAX_UP naraz), runda odlicza czas
export function galleryStep(st, dt, rand) {
    const s = { t: st.t.map(q => ({ up: q.up, left: q.left })), ph: st.ph, time: st.time, score: st.score, streak: st.streak, over: st.over, last: st.last }, d = Math.min(Math.max(dt, 0), 0.5);
    let upN = s.t.filter(q => q.up).length;
    for (const q of s.t) {
        q.left -= d;
        if (q.left > 0) continue;
        if (q.up) { q.up = false; q.left = span(GAL.DOWN, rand); upN--; if (s.ph === 'run') s.streak = 0; }
        else if (upN < GAL.MAX_UP) { q.up = true; q.left = span(GAL.UP, rand); upN++; }
        else q.left = 0.4;
    }
    if (s.ph === 'run') { s.time += d; if (s.time >= GAL.ROUND) { s.ph = 'over'; s.over = 0; s.last = s.score; s.time = GAL.ROUND; } }
    else if (s.ph === 'over') { s.over += d; if (s.over >= GAL.OVER_SHOW) { s.ph = 'idle'; s.score = 0; s.streak = 0; s.time = 0; s.over = 0; } }
    return s;
}
// Trafienie widma i (stojącego): punkty, seria; zwraca { st, points, hit }
export function registerHit(st, i) {
    const q = st.t[i];
    if (!q || !q.up || st.ph === 'over') return { st: st, points: 0, hit: false };
    const s = { t: st.t.map(x => ({ up: x.up, left: x.left })), ph: st.ph, time: st.time, score: st.score, streak: st.streak, over: st.over, last: st.last };
    if (s.ph === 'idle') { s.ph = 'run'; s.time = 0; s.score = 0; s.streak = 0; }
    s.t[i].up = false; s.t[i].left = span(GAL.DOWN, () => 0.5); s.streak++;
    const pts = GAL.POINTS + (s.streak >= GAL.BONUS_STREAK ? GAL.POINTS : 0); s.score += pts;
    return { st: s, points: pts, hit: true };
}
export const timeLeft = (st) => st.ph === 'run' ? Math.max(0, GAL.ROUND - st.time) : (st.ph === 'over' ? 0 : GAL.ROUND);
export function galleryProblems() {
    const bad = [];
    GAL.XS.forEach((x, i) => { if (i > 0 && x - GAL.XS[i - 1] < GAL.W + 0.4) bad.push('targets ' + (i - 1) + ' and ' + i + ' are too close'); });
    if (GAL.BASE + GAL.H > 2.4) bad.push('targets too high to hit'); if (GAL.UP[0] < 1.2) bad.push('a target is up for too short a time');
    return bad;
}
