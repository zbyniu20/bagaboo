// ==========================================
// OGRÓD POSĄGÓW (czysta logika, bez THREE): Statue Garden w aneksie lobby (core/annexstatues.js, strefa statues w core/annexlayout.js).
// Posągi stoją nieruchomo, gdy na nie patrzysz, a gdy odwrócisz wzrok, skradają się do ciebie (GARDEN.SPEED m/s). Cel: przejść od maty startowej do dzwonka na końcu.
// Dotknięcie przez posąg (CATCH m) tylko wraca posągi na miejsca i kasuje czas: nikt nikogo nie teleportuje i nie ma strachu z jumpscare'em. Lokalne, bez nagród.
// Najlepszy czas: SAVE.annex.statueBest (core/climblogic.js: normalizeAnnex).
// ==========================================
export const GARDEN = {
    SPEED: 0.9, CATCH: 1.0, SEE_COS: 0.62, OUT: 3, WON_SHOW: 5,
    PAD: [-6, 25.2], PADR: 1.0, BELL: [-6, 36.8], BELLR: 0.9,
    BOUNDS: { x0: -8.6, x1: -3.6, z0: 25.8, z1: 37.4 },                 // posągi nie wychodzą poza ten prostokąt (strefa statues w annexlayout)
    START: [[-8, 29], [-4.6, 29.5], [-6.4, 31.5], [-8, 33.5], [-4.6, 34], [-8.2, 36.2]]
};
export const newGarden = () => ({ ph: 'idle', t: 0, out: 0, last: 0, shown: 0, pos: GARDEN.START.map(p => [p[0], p[1]]) });
const clampB = (x, z) => [Math.max(GARDEN.BOUNDS.x0, Math.min(GARDEN.BOUNDS.x1, x)), Math.max(GARDEN.BOUNDS.z0, Math.min(GARDEN.BOUNDS.z1, z))];
// Czy kamera (pozycja cx, cz i kierunek patrzenia fx, fz w poziomie) widzi punkt (x, z): kąt do kierunku poniżej ok. 52 stopni
export function seenBy(cx, cz, fx, fz, x, z) {
    const fl = Math.hypot(fx, fz), dx = x - cx, dz = z - cz, dl = Math.hypot(dx, dz);
    if (fl < 1e-6 || dl < 1e-6) return true;
    return (fx * dx + fz * dz) / (fl * dl) > GARDEN.SEE_COS;
}
const inZone = (p) => p.x >= GARDEN.BOUNDS.x0 - 1 && p.x <= GARDEN.BOUNDS.x1 + 1 && p.z >= GARDEN.PAD[1] - 1.2 && p.z <= GARDEN.BOUNDS.z1 + 1.2;
// Krok: pl = { x, z } gracz, seen = tablica flag (czy dany posąg jest widziany). Zwraca { g, event: ''|'start'|'caught'|'won'|'abandon' }
export function gardenStep(g, pl, seen, dt) {
    const s = { ph: g.ph, t: g.t, out: g.out, last: g.last, shown: g.shown, pos: g.pos.map(p => [p[0], p[1]]) }, d = Math.min(Math.max(dt, 0), 0.5);
    const reset = () => { s.pos = GARDEN.START.map(p => [p[0], p[1]]); s.out = 0; };
    if (s.ph === 'idle') { if (Math.hypot(pl.x - GARDEN.PAD[0], pl.z - GARDEN.PAD[1]) < GARDEN.PADR) { s.ph = 'run'; s.t = 0; s.out = 0; return { g: s, event: 'start' }; } return { g: s, event: '' }; }
    if (s.ph === 'won') { s.shown += d; if (s.shown >= GARDEN.WON_SHOW) { s.ph = 'idle'; s.shown = 0; reset(); } return { g: s, event: '' }; }
    s.t += d;
    s.out = inZone(pl) ? 0 : s.out + d;
    if (s.out > GARDEN.OUT) { s.ph = 'idle'; reset(); return { g: s, event: 'abandon' }; }
    for (let i = 0; i < s.pos.length; i++) {
        if (seen[i]) continue;
        const dx = pl.x - s.pos[i][0], dz = pl.z - s.pos[i][1], dl = Math.hypot(dx, dz), step = Math.min(dl, GARDEN.SPEED * d);
        if (dl > 1e-6) s.pos[i] = clampB(s.pos[i][0] + dx / dl * step, s.pos[i][1] + dz / dl * step);
    }
    if (s.pos.some(p => Math.hypot(pl.x - p[0], pl.z - p[1]) < GARDEN.CATCH)) { s.ph = 'idle'; reset(); return { g: s, event: 'caught' }; }
    if (Math.hypot(pl.x - GARDEN.BELL[0], pl.z - GARDEN.BELL[1]) < GARDEN.BELLR) { s.ph = 'won'; s.last = s.t; s.shown = 0; return { g: s, event: 'won' }; }
    return { g: s, event: '' };
}
// Usterki układu: pozycje startowe w granicach, daleko od maty i od siebie, mata i dzwonek w strefie
export function gardenProblems(zone) {
    const bad = [], B = GARDEN.BOUNDS;
    GARDEN.START.forEach((p, i) => {
        if (p[0] < B.x0 || p[0] > B.x1 || p[1] < B.z0 || p[1] > B.z1) bad.push('statue ' + i + ' outside its bounds');
        if (Math.hypot(p[0] - GARDEN.PAD[0], p[1] - GARDEN.PAD[1]) < GARDEN.CATCH + 2) bad.push('statue ' + i + ' too close to the start pad');
        if (Math.hypot(p[0] - GARDEN.BELL[0], p[1] - GARDEN.BELL[1]) < GARDEN.BELLR + 0.3) bad.push('statue ' + i + ' on the bell');
        GARDEN.START.forEach((q, j) => { if (j > i && Math.hypot(p[0] - q[0], p[1] - q[1]) < 1.8) bad.push('statues ' + i + ' and ' + j + ' too close'); });
    });
    if (zone) { for (const q of [[B.x0, B.z0], [B.x1, B.z1], GARDEN.PAD, GARDEN.BELL]) if (q[0] < zone.x0 || q[0] > zone.x1 || q[1] < zone.z0 || q[1] > zone.z1) bad.push('a point is outside the statues zone'); }
    if (GARDEN.SPEED > 1.6) bad.push('statues are too fast');
    return bad;
}
