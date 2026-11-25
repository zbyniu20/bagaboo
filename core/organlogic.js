// ==========================================
// NAWIEDZONE ORGANY (czysta logika, bez THREE): osiem unoszących się klawiszy w półkolu w aneksie lobby (core/annexplay.js); dotknięcie dłonią gra dźwięk.
// Skala to molowa pentatonika (każda kombinacja brzmi nastrojowo). Wszystko lokalne i bez nagród; dźwięk idzie przez SFX.beep.
// ==========================================
export const ORGAN = { COUNT: 8, R: 2.2, Y: 1.3, TOUCH: 0.17, COOLDOWN: 0.18, SPAN_DEG: 70, BASE_HZ: 110, SCALE: [0, 3, 5, 7, 10, 12, 15, 17] };
export const noteHz = (i) => ORGAN.BASE_HZ * Math.pow(2, ORGAN.SCALE[Math.max(0, Math.min(ORGAN.COUNT - 1, i | 0))] / 12);
// Pozycje klawiszy w półkolu wokół środka (cx, cz), twarzą na północ (-z): [x, y, z] dla i = 0..COUNT-1 od zachodu do wschodu
export function keyPositions(cx, cz) {
    const out = [];
    for (let i = 0; i < ORGAN.COUNT; i++) {
        const a = (-ORGAN.SPAN_DEG + 2 * ORGAN.SPAN_DEG * i / (ORGAN.COUNT - 1)) * Math.PI / 180;
        out.push([cx + ORGAN.R * Math.sin(a), ORGAN.Y, cz - ORGAN.R * Math.cos(a)]);
    }
    return out;
}
// Który klawisz dotyka dłoń (najbliższy w promieniu TOUCH) albo -1
export function touchedKey(keys, p) {
    let best = -1, bd = ORGAN.TOUCH;
    keys.forEach((k, i) => { const d = Math.hypot(p[0] - k[0], p[1] - k[1], p[2] - k[2]); if (d < bd) { bd = d; best = i; } });
    return best;
}
// Czy klawisz może zagrać (odstęp od ostatniego dźwięku tego klawisza)
export const canPlay = (last, now) => now - last >= ORGAN.COOLDOWN;
