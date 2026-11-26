// ==========================================
// ZJEŻDŻALNIA (czysta logika, bez THREE): zjazd ze szczytu toru Climb Rush (ściana wschodnia aneksu) na podłogę (core/annexslide.js; strefa climb w core/annexlayout.js).
// Używa tej samej szyny co tyrolka (railStep z core/ziplogic.js), ale gracz siedzi NA rynnie (ciało nad nią). Dźwignia na platformie uruchamia zjazd 5 m/s.
// Zawiera też ukryte uchwyty nad dzwonem (głębokie sekrety: czaszka pod sufitem). Lokalne, bez nagród.
// ==========================================
import { railLength, railPoint } from './ziplogic.js';
export const SLIDE = { A: [12.6, 11.9, 38.4], B: [10.6, 1.1, 22.6], SPEED: 5, REACH: 0.45, COOLDOWN: 2.5, HANG: -0.35, MAX_DT: 0.1 };
export const PLAT_S = { x: 13.0, y: 11.475, z: 38.2, w: 1.6, h: 0.25, d: 1.6 };       // platforma startowa (górna ściana y = 11,6, jak ostatni uchwyt toru)
export const LEVER = [13.0, 12.5, 38.7];                                              // dźwignia na platformie (dotknięcie dłonią uruchamia zjazd)
export const LANDING = { x0: 9.6, x1: 12.0, z0: 21.1, z1: 25.4 };                      // tu rynna kończy się nisko (poniżej 2,5 m nad podłogą)
export const SECRET_HOLDS = [[14.6, 12.65, 38.4], [14.6, 13.75, 38.4]];               // ciemne uchwyty nad dzwonem prowadzące do czaszki (sekret ceil)
export const CEIL_SKULL = [14.4, 15.05, 38.45];
export const slideLength = () => railLength(SLIDE);
// Usterki: rynna nad 2,5 m tylko poza lądowiskiem, lądowisko omija matę startową i tablicę Climb Rush, platforma blisko dzwonu, ukryte uchwyty w zasięgu rąk
export function slideProblems(bell, matXZ) {
    const bad = [], L = slideLength();
    for (let s = 0; s <= L; s += 0.25) { const p = railPoint(SLIDE, s); if (p[1] < 2.5 && !(p[0] >= LANDING.x0 && p[0] <= LANDING.x1 && p[2] >= LANDING.z0 && p[2] <= LANDING.z1)) bad.push('the chute is low outside the landing at s=' + s.toFixed(2)); }
    const e = SLIDE.B; if (e[0] < LANDING.x0 || e[0] > LANDING.x1 || e[2] < LANDING.z0 || e[2] > LANDING.z1) bad.push('the chute ends outside the landing');
    if (matXZ && LANDING.x1 > matXZ[0] - 0.9 - 0.4) bad.push('the landing reaches the start mat');
    if (LANDING.x1 > 14.93 - 1) bad.push('the landing reaches the board');
    const top = PLAT_S.y + PLAT_S.h / 2;
    if (bell) { const dx = (bell[0] - 0.3) - (PLAT_S.x + PLAT_S.w / 2); if (dx < 0.45) bad.push('the platform is too close to the bell'); }
    if (SLIDE.A[1] < top || SLIDE.A[1] - top > 0.5) bad.push('the chute does not start at the platform');
    if (Math.abs(LEVER[0] - PLAT_S.x) > PLAT_S.w / 2 || Math.abs(LEVER[2] - PLAT_S.z) > PLAT_S.d / 2 + 0.2 || LEVER[1] - top < 0.6 || LEVER[1] - top > 1.2) bad.push('the lever is out of reach from the platform');
    if (SLIDE.SPEED > 7) bad.push('too fast for comfort');
    let prev = [PLAT_S.x + PLAT_S.w / 2 - 0.2, top + 0.15, PLAT_S.z];
    SECRET_HOLDS.forEach((h, i) => { const d = Math.hypot(h[0] - prev[0], h[1] - prev[1], h[2] - prev[2]); if (d > 1.5 + 0.5) bad.push('secret hold ' + i + ' too far'); prev = h; });
    const lastH = SECRET_HOLDS[SECRET_HOLDS.length - 1];
    if (Math.hypot(CEIL_SKULL[0] - lastH[0], CEIL_SKULL[1] - lastH[1], CEIL_SKULL[2] - lastH[2]) > 1.6) bad.push('the ceiling skull is out of reach');
    return bad;
}
