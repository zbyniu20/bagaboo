// ==========================================
// SCARY GTA: WNĘTRZA BUDYNKÓW (czysta logika, bez THREE). Cztery wnętrza (INTERIORS w core/citylayout.js: kasyno, motel, sklep, magazyn) to puste budynki z drzwiami od ulicy i meblami.
// Układ każdego wnętrza jest opisany w lokalnym układzie drzwi (u = w głąb od drzwi, v = na boki) i przeliczany na świat dla ściany N, S, W albo E. Meble są częścią scalonej siatki kwartału
// (zero dodatkowych wywołań rysowania), duże z kolizją. Policja nie wchodzi do środka (zostaje na grafie ulic), ale widzi przez drzwi (linia wzroku liczy się z pustych brył).
// Testy: tests/logic.mjs (blok "wnętrza"), w przeglądarce tests/interiors.mjs.
// ==========================================
import { CITY, INTERIORS, hollowBoxes, cityWithInteriors, buildCity, bagSpots, hideSpots, SAFEHOUSES, RAILS } from './citylayout.js';
export const LIGHT = { casino: [0xff4adf, 14, 13], motel: [0xff8a50, 9, 10], shop: [0xffd890, 11, 12], warehouse: [0xc8e0ff, 11, 15] };   // kolor, moc, zasięg światła w środku (jedno na wnętrze, tworzone przy budowie)
// Ramka lokalna: rect(u0, u1, v0, v1) -> prostokąt świata; D = głębokość wnętrza, W = szerokość
export function frame(b, door) {
    const t = CITY.WALL_T, x0 = b.x0 + t, x1 = b.x1 - t, z0 = b.z0 + t, z1 = b.z1 - t, cx = (b.x0 + b.x1) / 2, cz = (b.z0 + b.z1) / 2, ns = door === 'N' || door === 'S';
    const rect = (u0, u1, v0, v1) => door === 'N' ? { x0: cx + v0, x1: cx + v1, z0: z0 + u0, z1: z0 + u1 } : door === 'S' ? { x0: cx - v1, x1: cx - v0, z0: z1 - u1, z1: z1 - u0 } : door === 'W' ? { x0: x0 + u0, x1: x0 + u1, z0: cz + v0, z1: cz + v1 } : { x0: x1 - u1, x1: x1 - u0, z0: cz - v1, z1: cz - v0 };
    return { D: ns ? z1 - z0 : x1 - x0, W: ns ? x1 - x0 : z1 - z0, rect };
}
// Meble: { x0, x1, y0, y1, z0, z1, c: [r, g, b], solid }
export function furniture(b) {
    const it = INTERIORS[b.id]; if (!it) return [];
    const f = frame(b, it.door), out = [], put = (u0, u1, v0, v1, y0, y1, c, solid) => out.push(Object.assign(f.rect(u0, u1, v0, v1), { y0: y0, y1: y1, c: c, solid: !!solid }));
    const D = f.D, H = f.W / 2;
    if (it.kind === 'casino') {
        put(0, D, -H, H, 0, 0.03, [0.45, 0.1, 0.35], false);                                                    // dywan
        for (let i = 0; i < 6; i++) put(1.4 + i * 1.05, 2.3 + i * 1.05, -H + 0.05, -H + 0.85, 0, 1.7, i % 2 ? [0.4, 1.2, 2] : [2, 0.5, 1.6], true);   // automaty
        put(4, 6.4, 1.4, 3.0, 0, 0.95, [0.1, 0.5, 0.25], true);                                                // ruletka
        put(D - 0.9, D - 0.2, -2.5, 2.5, 0, 1.15, [0.6, 0.3, 0.1], true);                                      // bar
        for (let i = 0; i < 4; i++) put(D - 1.5, D - 1.1, -1.8 + i * 1.2, -1.4 + i * 1.2, 0, 0.7, [0.9, 0.1, 0.2], true);   // stołki
    } else if (it.kind === 'motel') {
        put(0, D, -H, H, 0, 0.03, [0.25, 0.2, 0.3], false);
        for (const s of [-1, 1]) { const gap = s < 0 ? [3.4, 4.6] : [6.2, 7.4], v0 = s < 0 ? -1.3 : 1.1, v1 = s < 0 ? -1.1 : 1.3; put(1.2, gap[0], v0, v1, 0, 3.0, [0.6, 0.55, 0.5], true); put(gap[1], D - 0.2, v0, v1, 0, 3.0, [0.6, 0.55, 0.5], true); }   // przepierzenia z drzwiami
        put(5.0, 7.2, -4.2, -2.6, 0, 0.55, [0.3, 0.4, 0.9], true);                                              // łóżko w pokoju po lewej
        put(5.0, 7.2, 2.6, 4.2, 0, 0.55, [0.55, 0.04, 0.04], true); put(1.4, 2.4, 3.6, 4.3, 0, 2.0, [0.35, 0.22, 0.12], true);   // nawiedzony pokój: skrwawione łóżko i szafa
        put(D - 0.6, D - 0.1, -0.5, 0.5, 0, 1.8, [0.2, 1.4, 0.9], true);                                        // automat z napojami w głębi korytarza
    } else if (it.kind === 'shop') {
        put(0, D, -H, H, 0, 0.03, [0.35, 0.3, 0.22], false);
        put(1.5, 6.5, -3.6, -2.6, 0, 2.0, [0.5, 0.35, 0.2], true); put(1.5, 6.5, 2.6, 3.6, 0, 2.0, [0.5, 0.35, 0.2], true);   // regały
        put(7.0, 7.9, -3.0, 1.5, 0, 1.1, [0.55, 0.45, 0.3], true);                                              // lada
        put(8.0, 8.6, 3.2, 4.2, 0, 1.2, [0.3, 0.32, 0.36], true);                                              // sejf na zapleczu
    } else if (it.kind === 'warehouse') {
        put(0, D, -H, H, 0, 0.03, [0.3, 0.3, 0.3], false);
        put(2.0, 3.5, -4.3, -2.8, 0, 1.5, [0.55, 0.38, 0.18], true); put(2.0, 3.5, -4.3, -2.8, 1.5, 3.0, [0.5, 0.35, 0.16], true);   // stos skrzyń (do wspinania)
        put(3.5, 5.0, -4.3, -2.8, 0, 1.5, [0.5, 0.35, 0.16], true); put(5.0, 6.5, 2.8, 4.3, 0, 1.5, [0.55, 0.38, 0.18], true); put(5.0, 6.5, 2.8, 4.3, 1.5, 3.0, [0.5, 0.35, 0.16], true);
        put(D - 0.7, D - 0.1, -4.0, -1.0, 0, 4.0, [0.3, 0.35, 0.45], true);                                    // regał paletowy przy tylnej ścianie
        put(6.5, 8.0, 0.8, 2.4, 0, 1.8, [1.6, 1.3, 0.2], true);                                                // wózek widłowy
    }
    return out;
}
export const interiorBuildings = (B) => B.filter(b => b.interior);
const overlap = (a, r) => a.x0 < r.x1 && r.x0 < a.x1 && a.z0 < r.z1 && r.z0 < a.z1;
const pointIn = (p, r, m) => p.x > r.x0 - m && p.x < r.x1 + m && p.z > r.z0 - m && p.z < r.z1 + m;
// Lista usterek wnętrz (pusta = dobrze)
export function interiorProblems() {
    const bad = [], B = cityWithInteriors(1337), plain = buildCity(1337), ins = interiorBuildings(B);
    if (ins.length !== Object.keys(INTERIORS).length) bad.push('some interior building is missing from the city');
    if (B.length !== plain.length || B.some((b, i) => b.x0 !== plain[i].x0 || b.x1 !== plain[i].x1 || b.z0 !== plain[i].z0 || b.z1 !== plain[i].z1 || b.h !== plain[i].h)) bad.push('the interiors changed the building footprints or heights');
    const bags = bagSpots(B), hides = hideSpots(), railPts = RAILS.flatMap(r => [r.A, r.B]);
    for (const b of ins) {
        const it = INTERIORS[b.id], k = +b.id.split(',')[2], outer = k === 0 ? ['N', 'W'] : k === 1 ? ['N', 'E'] : k === 2 ? ['S', 'W'] : ['S', 'E'];
        if (b.name || b.hollow.door !== it.door) bad.push(b.id + ': bad interior record');
        if (!outer.includes(it.door)) bad.push(b.id + ': the door faces an alley, not a street');
        const cx = (b.x0 + b.x1) / 2, cz = (b.z0 + b.z1) / 2, out = it.door === 'N' ? { x: cx, z: b.z0 - 2 } : it.door === 'S' ? { x: cx, z: b.z1 + 2 } : it.door === 'W' ? { x: b.x0 - 2, z: cz } : { x: b.x1 + 2, z: cz };
        if (out.x < CITY.X0 + 6 || out.x > CITY.X1 - 6 || out.z < CITY.Z0 + 6 || out.z > CITY.Z1 - 6) bad.push(b.id + ': the door opens at the map edge');
        if (B.some(o => o !== b && pointIn(out, o, 0.2))) bad.push(b.id + ': the door is blocked by another building');
        if (it.baseH < 3.2 || it.baseH > b.h) bad.push(b.id + ': bad ceiling height');
        const fr = frame(b, it.door), inner = { x0: b.x0 + CITY.WALL_T, x1: b.x1 - CITY.WALL_T, z0: b.z0 + CITY.WALL_T, z1: b.z1 - CITY.WALL_T }, F = furniture(b);
        const strip = fr.rect(0, fr.D - 1.8, -0.6, 0.6);   // przejście od drzwi w głąb: 1,2 m szerokości
        for (const m of F) {
            if (m.x0 < inner.x0 - 1e-6 || m.x1 > inner.x1 + 1e-6 || m.z0 < inner.z0 - 1e-6 || m.z1 > inner.z1 + 1e-6) bad.push(b.id + ': furniture outside the walls');
            if (m.y1 > it.baseH - 0.2) bad.push(b.id + ': furniture touches the ceiling');
            if (m.solid && overlap(m, strip)) bad.push(b.id + ': furniture blocks the 1.2 m path from the door');
            for (const p of bags) if (pointIn(p, m, 0.5)) bad.push(b.id + ': furniture on a bag spot');
            for (const h of hides) if (pointIn(h, m, 1.3)) bad.push(b.id + ': furniture on a hide spot');
            for (const p of railPts) if (pointIn({ x: p[0], z: p[2] }, m, 0.5)) bad.push(b.id + ': furniture on a rail point');
            for (const s of SAFEHOUSES) if (pointIn(s, m, 1)) bad.push(b.id + ': furniture on a safe house');
        }
        if (!F.length || !F.some(m => m.solid)) bad.push(b.id + ': no furniture');
        if (hollowBoxes(b).length < 5) bad.push(b.id + ': the shell has no door opening');
    }
    return bad;
}
export { INTERIORS, cityWithInteriors };
