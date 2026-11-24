// ==========================================
// Mapy wysokości powierzchni (czysta logika, bez THREE i DOM): prawdziwy relief ścian, podłóg, drewna i tynku.
// Wcześniej normalne liczono z JASNOŚCI koloru, więc plamy krwi, zacieki i winieta wyglądały jak wgłębienia. Tu relief (fugi wcięte, nity i gwoździe
// wypukłe, szorstkość porów) jest liczony osobno od koloru i pasuje do układu wzorów z core/textures.js (te same stałe: 256 px fug, 128 px desek).
// Wynik heightField to Float32Array 0..1 (1 = wysoko), normalsFromHeight daje bajty RGBA mapy normalnych. Wszystko z zawijaniem (kafelkowanie).
// ==========================================
export const SURFACES = ['wall', 'floor', 'wood', 'plaster'];
export const HEIGHT = { wall: { ref: 1024, seed: 11 }, floor: { ref: 1024, seed: 23 }, wood: { ref: 512, seed: 37 }, plaster: { ref: 512, seed: 41 } };

const smooth = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
function hash(i, j, seed) { let h = Math.imul(i | 0, 374761393) ^ Math.imul(j | 0, 668265263) ^ Math.imul(seed | 0, 2147483647); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
// Okresowy szum wartości: siatka n x n zawija się, więc tekstura układa się bez szwów. u, v w [0, 1)
export function noise(u, v, n, seed) {
    const x = u * n, y = v * n, i = Math.floor(x), j = Math.floor(y), fx = x - i, fy = y - j, sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
    const a = hash(i % n, j % n, seed), b = hash((i + 1) % n, j % n, seed), c = hash(i % n, (j + 1) % n, seed), d = hash((i + 1) % n, (j + 1) % n, seed);
    return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
}
const fbm = (u, v, seed, oct) => { let s = 0, a = 0.5, n = 8; for (let o = 0; o < oct; o++) { s += a * noise(u, v, n, seed + o * 7); a *= 0.5; n *= 2; } return s; };
const wrapD = (x, step) => { const m = ((x % step) + step) % step; return Math.min(m, step - m); };   // odległość do najbliższej wielokrotności step

// Wysokość jednego punktu (px, py w jednostkach odniesienia, pu, pv w [0, 1)) dla danego rodzaju powierzchni
function sample(kind, px, py, pu, pv, seed) {
    let hgt = 0.5;
    if (kind === 'wall') {
        hgt += (fbm(pu, pv, seed, 3) - 0.5) * 0.16;                                                   // szorstki beton
        hgt -= 0.34 * (1 - smooth(0, 5, Math.min(wrapD(px, 256), wrapD(py, 256))));                  // fugi między płytami (4 px szerokości)
        for (const ox of [14, -14]) for (const oy of [14, -14]) {                                      // nity w rogach płyt (promień 4 px)
            const r = Math.hypot(wrapD(px - ox, 256), wrapD(py - oy, 256)); hgt += 0.3 * (1 - smooth(1.5, 4.5, r));
        }
    } else if (kind === 'floor') {
        const tx = Math.floor(px / 256) & 3, ty = Math.floor(py / 256) & 3;
        hgt += (hash(tx, ty, seed) - 0.5) * 0.06 + (fbm(pu, pv, seed, 3) - 0.5) * 0.14;               // każda płyta lekko inna, porowata
        hgt -= 0.4 * (1 - smooth(0, 6, Math.min(wrapD(px, 256), wrapD(py, 256))));                   // fugi (6 px)
    } else if (kind === 'wood') {
        const row = Math.floor(py / 128), local = py - row * 128;
        hgt += (hash(row, 3, seed) - 0.5) * 0.05;
        hgt += (noise(pu * 0.5 + 0.13 * row, pv * 7, 32, seed) - 0.5) * 0.12;                         // słoje: wydłużone w poziomie
        hgt -= 0.4 * (1 - smooth(0, 3, Math.abs(local - 127)));                                         // szczeliny między deskami
        for (const nx of [18, 512 - 18]) for (const ny of [18, 108]) { const r = Math.hypot(wrapD(px - nx, 512), py - (row * 128 + ny)); hgt += 0.3 * (1 - smooth(1.5, 3.5, r)); }   // łby gwoździ
    } else {
        hgt += (fbm(pu, pv, seed, 4) - 0.5) * 0.3;                                                     // tynk: miękkie nierówności i pory
    }
    hgt += (noise(pu, pv, 128, seed + 101) - 0.5) * 0.04;                                              // drobna ziarnistość wszędzie
    return Math.max(0, Math.min(1, hgt));
}
export function heightField(kind, w, h) {
    const cfg = HEIGHT[kind] || HEIGHT.plaster, out = new Float32Array(w * h), k = cfg.ref;
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
        const u = i / w, v = j / h;
        out[j * w + i] = sample(kind, u * k, v * k, u, v, cfg.seed);
    }
    return out;
}
// Bajty RGBA mapy normalnych z pola wysokości (różnice centralne z zawijaniem; strength 1..6)
export function normalsFromHeight(hf, w, h, strength) {
    const k = strength || 3, out = new Uint8ClampedArray(w * h * 4);
    for (let j = 0; j < h; j++) {
        const jm = ((j - 1 + h) % h) * w, jp = ((j + 1) % h) * w, jc = j * w;
        for (let i = 0; i < w; i++) {
            const im = (i - 1 + w) % w, ip = (i + 1) % w;
            const nx = -(hf[jc + ip] - hf[jc + im]) * k, ny = (hf[jp + i] - hf[jm + i]) * k, inv = 1 / Math.sqrt(nx * nx + ny * ny + 1), o = (jc + i) * 4;
            out[o] = (nx * inv * 0.5 + 0.5) * 255; out[o + 1] = (ny * inv * 0.5 + 0.5) * 255; out[o + 2] = (inv * 0.5 + 0.5) * 255; out[o + 3] = 255;
        }
    }
    return out;
}
