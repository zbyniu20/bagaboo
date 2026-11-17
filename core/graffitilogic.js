// ==========================================
// ŚCIANA GRAFFITI (lobby): czysta logika, testowana w Node (tests/logic.mjs). Bez THREE, DOM i sieci.
// Ściana to siatka WALL.W x WALL.H komórek; komórka ma numer koloru 0..COLORS.length-1 (0 = goła ściana / gumka).
// Host przyjmuje pociągnięcia tylko przez cleanCells (zakresy i limit liczby komórek), takeTokens (limit tempa na gracza)
// i near (gracz stoi przy ścianie według pozycji jego głowy u hosta). Dane od klienta nigdy nie trafiają do ściany inaczej.
// Ściana blaknie o 3:00 UTC (dayKey zmienia się raz na dobę), a snapshot dla gości to RLE (encodeWall / decodeWall).
// Konkurs i Galeria: reguły w core/graffitiround.js.
// ==========================================
export const WALL = {
    W: 48, H: 24,
    // Indeks 0 = goła ściana; reszta to paleta farb (11 kolorów)
    COLORS: ['', '#1b1b1f', '#ffffff', '#e0332e', '#f58a1f', '#f6d928', '#4cc34a', '#19b5a5', '#2f6fe0', '#8a4fd6', '#ee6bb4', '#8a5a34'],
    BG: '#d9d2c3',
    MAX_CELLS: 16,          // tyle komórek najwyżej w jednej wiadomości
    BRUSHES: [1, 3],        // rozmiary pędzla (1x1, 3x3 = 9 komórek, mieści się w MAX_CELLS)
    BURST: 300,             // pojemność limitu tempa (komórki)
    PER_SEC: 300,           // ile komórek na sekundę może malować jeden gracz (szybkie przeciąganie pędzlem 3x3 to ok. 150)
    REACH: 7,               // najdalej tyle metrów (w poziomie) od środka ściany
    DAY_SHIFT_H: 3,         // doba ściany zaczyna się o 3:00 UTC
};

export const emptyWall = () => new Uint8Array(WALL.W * WALL.H);

// Klucz doby (zmiana = ściana blaknie do białej)
export const dayKey = (ms) => Math.floor((ms - WALL.DAY_SHIFT_H * 3600000) / 86400000);

// Czyści płaską listę [x, y, c, x, y, c, ...] z sieci: tylko liczby całkowite w zakresie, najwyżej MAX_CELLS komórek
export function cleanCells(raw) {
    if (!Array.isArray(raw)) return [];
    const out = [], n = Math.min(Math.floor(raw.length / 3), WALL.MAX_CELLS);
    for (let i = 0; i < n; i++) {
        const x = raw[i * 3], y = raw[i * 3 + 1], c = raw[i * 3 + 2];
        if (!Number.isInteger(x) || !Number.isInteger(y) || !Number.isInteger(c)) continue;
        if (x < 0 || x >= WALL.W || y < 0 || y >= WALL.H || c < 0 || c >= WALL.COLORS.length) continue;
        out.push(x, y, c);
    }
    return out;
}

// Komórki pędzla o środku (cx, cy); rozmiar 1 = jedna komórka, 3 = kwadrat 3x3 (przycięty do ściany)
export function brushCells(cx, cy, size, c) {
    const r = size >= 3 ? 1 : 0, out = [];
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
        const x = cx + dx, y = cy + dy;
        if (x >= 0 && x < WALL.W && y >= 0 && y < WALL.H) out.push(x, y, c);
    }
    return out;
}

// Nakłada (już oczyszczone) komórki na ścianę; zwraca liczbę komórek, które się zmieniły
export function paintCells(wall, cells) {
    let changed = 0;
    for (let i = 0; i + 2 < cells.length; i += 3) {
        const k = cells[i + 1] * WALL.W + cells[i];
        if (wall[k] !== cells[i + 2]) { wall[k] = cells[i + 2]; changed++; }
    }
    return changed;
}

// Limit tempa (wiadro z żetonami): bucket = { tokens, t }; zwraca true i zabiera n żetonów, gdy starcza
export function makeBucket(now) { return { tokens: WALL.BURST, t: now }; }
export function takeTokens(b, n, now) {
    b.tokens = Math.min(WALL.BURST, b.tokens + Math.max(0, now - b.t) * WALL.PER_SEC); b.t = now;
    if (n > b.tokens) return false;
    b.tokens -= n; return true;
}

// Czy głowa (x, z) jest dość blisko środka ściany (pos = { x, z })
export function near(head, pos) {
    if (!head || !Number.isFinite(head.x) || !Number.isFinite(head.z)) return false;
    return Math.hypot(head.x - pos.x, head.z - pos.z) <= WALL.REACH;
}

// Komórka pod celownikiem: px, py w pikselach obszaru ściany (0..areaW, 0..areaH); poza obszarem = null
export function cellAt(px, py, areaW, areaH) {
    if (!(px >= 0 && py >= 0 && px < areaW && py < areaH)) return null;
    return [Math.floor(px / areaW * WALL.W), Math.floor(py / areaH * WALL.H)];
}

// Snapshot: biegi "kolor(hex)+liczba", rozdzielone przecinkami, np. "0300,a12,0836" (dowolna długość tablicy; ściana i plakaty Galerii)
export function encodeRle(arr) {
    const runs = []; let cur = arr[0], n = 1;
    for (let i = 1; i < arr.length; i++) { if (arr[i] === cur) n++; else { runs.push(cur.toString(16) + n); cur = arr[i]; n = 1; } }
    runs.push(cur.toString(16) + n);
    return runs.join(',');
}
export function decodeRle(str, len) {
    if (typeof str !== 'string' || str.length > 20000) return null;
    const out = new Uint8Array(len); let pos = 0;
    for (const run of str.split(',')) {
        const m = /^([0-9a-f])(\d{1,4})$/.exec(run);
        if (!m) return null;
        const c = parseInt(m[1], 16), n = +m[2];
        if (c >= WALL.COLORS.length || n < 1 || pos + n > len) return null;
        out.fill(c, pos, pos + n); pos += n;
    }
    return pos === len ? out : null;
}
export const encodeWall = (wall) => encodeRle(wall);
export const decodeWall = (str) => decodeRle(str, WALL.W * WALL.H);
