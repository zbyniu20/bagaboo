// ==========================================
// SPÓJNA RĘKA ARTYSTYCZNA: CZYSTA LOGIKA (rodziny palet poziomów i korekta kolorów).
// Bez THREE: testy w tests/logic.mjs i tests/static.mjs (każdy poziom z rejestru ma rodzinę). Stosują ją addCrispBlock (kolory bloków)
// i core/lightbake.js (applyArt: mgła i światło otoczenia). Rodzina = jedna paleta dla kilku poziomów: ten sam ton cieni, ta sama temperatura,
// ta sama nasycona akcja. Dzięki temu poziomy narysowane w różnych czasach wyglądają jak jedna gra.
// ==========================================
// tint: ton całej rodziny, mix: jak mocno kolory bloków ciągną ku tonowi (0..1), sat: mnożnik nasycenia, hemi/fog: jak mocno tonują światło otoczenia i mgłę
export const FAMILIES = {
    neutral: { tint: 0xd8c8b0, mix: 0.08, sat: 0.95, hemi: 0.15, fog: 0.1 },
    clinical: { tint: 0x8ec4b8, mix: 0.2, sat: 0.7, hemi: 0.3, fog: 0.3 },      // szpital, żłobek: zimna zieleń, wyprane kolory
    crypt: { tint: 0x7a8aa8, mix: 0.2, sat: 0.65, hemi: 0.3, fog: 0.35 },       // cmentarz, katakumby, studnia: zimny niebiesko-szary
    industrial: { tint: 0xa8a070, mix: 0.18, sat: 0.7, hemi: 0.25, fog: 0.3 },  // pralnia, labirynt, cisza: chorobliwa żółć i szarość
    hotel: { tint: 0xc08a60, mix: 0.18, sat: 0.85, hemi: 0.3, fog: 0.3 },       // hotel, staff, mój pokój: ciepły bursztyn
    dread: { tint: 0xa05a5a, mix: 0.16, sat: 0.75, hemi: 0.3, fog: 0.35 },      // Room 000, Furas, Memory: zgaszona czerwień
    arcade: { tint: 0xe0d8c8, mix: 0.04, sat: 1.0, hemi: 0.05, fog: 0.05 }      // BagaBoo Games: jasne, czytelne kolory prawie bez zmian
};
const FAMILY_OF = {
    lobby: 'neutral', levels: 'neutral', wardrobe: 'neutral', home: 'hotel', staff: 'hotel',
    hospital: 'clinical', nursery: 'clinical',
    cemetery: 'crypt', catacombs: 'crypt', well: 'crypt',
    laundry: 'industrial', maze: 'industrial', silence: 'industrial',
    hotel: 'hotel',
    room000: 'dread', furas: 'dread', memory: 'dread',
    games: 'arcade', lava: 'arcade', route: 'arcade', redlight: 'arcade', lasttile: 'arcade', range: 'arcade', monster: 'dread', hideseek: 'arcade', banana: 'arcade', dodgeball: 'arcade', custom: 'arcade', workshop: 'arcade'
};
export function familyName(levelId) {
    if (FAMILY_OF[levelId]) return FAMILY_OF[levelId];
    const base = String(levelId || '').split(/[_:\-.]/)[0];   // warianty (np. układy labiryntu) dziedziczą po poziomie bazowym
    return FAMILY_OF[base] || 'neutral';
}
export function familyFor(levelId) { return FAMILIES[familyName(levelId)]; }
// Łamanie powtarzalności tekstur (cieniowanie bloków w engine.js): siła zmiany jasności i odcienia wg pozycji w świecie. Gry (arcade) prawie bez zmian: czytelność.
export const TILE = { base: 0.11, arcade: 0.03, scale: 0.21 };
export const tileStrength = (family) => family === 'arcade' ? TILE.arcade : TILE.base;
export const knownLevels = () => Object.keys(FAMILY_OF);
const lerp = (a, b, t) => a + (b - a) * t;
// Korekta koloru bloku (hex 0xRRGGBB): nasycenie, potem ciągnięcie ku tonowi rodziny; jasność zostaje (luminancja bez zmian)
export function gradeColor(hex, fam) {
    if (typeof hex !== 'number' || !isFinite(hex) || !fam) return hex;
    const r = (hex >> 16 & 255) / 255, g = (hex >> 8 & 255) / 255, b = (hex & 255) / 255, lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    let c = [lerp(lum, r, fam.sat), lerp(lum, g, fam.sat), lerp(lum, b, fam.sat)];
    const tr = (fam.tint >> 16 & 255) / 255, tg = (fam.tint >> 8 & 255) / 255, tb = (fam.tint & 255) / 255, tl = 0.2126 * tr + 0.7152 * tg + 0.0722 * tb || 1;
    const t = [tr / tl * lum, tg / tl * lum, tb / tl * lum];   // ton rodziny o tej samej jasności co blok
    c = c.map((v, i) => Math.max(0, Math.min(1, lerp(v, t[i], fam.mix))));
    return (Math.round(c[0] * 255) << 16) | (Math.round(c[1] * 255) << 8) | Math.round(c[2] * 255);
}
// Mieszanie dwóch kolorów hex (do światła otoczenia i mgły)
export function mixHex(a, b, t) {
    const k = Math.max(0, Math.min(1, t));
    const f = (s) => Math.round(lerp(a >> s & 255, b >> s & 255, k));
    return (f(16) << 16) | (f(8) << 8) | f(0);
}
