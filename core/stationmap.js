// ==========================================
// MAPA "TRAIN STATION" DLA BECOME THE MONSTER (czysty generator, bez THREE; testy: tests/modes/monster.mjs). 80 x 80 m, wysokość hali 12 m, układ z ziarna (deterministyczny: host i gość budują to samo).
// Stacja czołowa (tory kończą się przy hali kasowej na południu): pięć peronów (dwa boczne i trzy wyspowe, 1,2 m nad torami), cztery tory, trzy POCIĄGI z pustymi wagonami (drzwi z obu stron,
// ławki w środku, dachy 3,5 m), KŁADKA 6 m nad torami ze schodami na każdym peronie, poczekalnie i kioski jako kryjówki, SZYBY WENTYLACYJNE (dwa przy ścianach peronu i jeden wysoko nad torami,
// zdatne do przeczołgania), TRZY UKRYTE TUNELE za ścianami (jeden przy północnej ścianie, dwa przy południowej; wejścia to wąskie luki w ścianie od strony hali) oraz hala kasowa z budkami,
// automatami i szafkami. Potwór startuje na północnym podwórku, uciekinierzy w hali kasowej przy drzwiach GAMES (z = +40).
// Koszt rysowania: tylko pięć peronów to osobne siatki; WSZYSTKO inne to instancje (`inst`: jedna siatka na rodzaj powierzchni), więc cała stacja kosztuje kilka wywołań rysowania.
// Dane: { boxes (siatki: perony), inst (instancje), lights, entry, monster, survivors, hides ([x, y podłogi, z, rodzaj]), botJump, floor, wall, ceil }.
// Kontrola układu: stationProblems(md) (granice, starty poza przeszkodami, szerokość drzwi i luk, OSIĄGALNOŚĆ pieszo z wejścia do każdej kryjówki, peronu i startu potwora).
// ==========================================
export const ST = { A: 40, H: 12, P: 1.2, TX: [-24, -8, 8, 24], ZN: -33, ZS: 27, BZ: -4, BY: 6, CLEAR: 1.4, CELL: 0.5 };
export const PLAT = [[-40, -26], [-22, -10], [-6, 6], [10, 22], [26, 40]];
const mk = (x, y, z, w, h, d, c, k) => ({ x: x, y: y, z: z, w: w, h: h, d: d, c: c, k: k || 'wall' });
const gb = (x, z, w, h, d, c, k, y0) => mk(x, (y0 || 0) + h / 2, z, w, h, d, c, k);
// Odcinki między lukami: [a, b] bez przedziałów z gaps
function segs(a, b, gaps) {
    const out = []; let p = a;
    for (const g of gaps.slice().sort((u, v) => u[0] - v[0])) { if (g[0] > p) out.push([p, Math.min(g[0], b)]); p = Math.max(p, g[1]); }
    if (p < b) out.push([p, b]);
    return out.filter(s => s[1] - s[0] > 0.05);
}
export function stationLayout(R) {
    const { A, H, P, TX, ZN, ZS, BZ, BY } = ST, boxes = [], inst = [], hides = [], keep = [];   // keep: prostokąty zajęte na peronach i w hali (nie stawiamy tam rekwizytów)
    const add = (b) => { inst.push(b); return b; };
    const pick = (arr) => arr[Math.min(arr.length - 1, Math.floor(R() * arr.length))];
    const shuffle = (arr) => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); const t = a[i]; a[i] = a[j]; a[j] = t; } return a; };
    const reserve = (x, z, w, d, m) => keep.push({ x0: x - w / 2 - (m || 0), x1: x + w / 2 + (m || 0), z0: z - d / 2 - (m || 0), z1: z + d / 2 + (m || 0) });
    const taken = (x, z, w, d) => keep.some(k => x + w / 2 > k.x0 && x - w / 2 < k.x1 && z + d / 2 > k.z0 && z - d / 2 < k.z1);
    const zc = (ZN + ZS) / 2, len = ZS - ZN;
    // ---- perony (siatki), żółte linie przy krawędziach, schodki od hali kasowej ----
    PLAT.forEach(([x0, x1], i) => {
        const cx = (x0 + x1) / 2, w = x1 - x0;
        boxes.push(gb(cx, zc, w, P, len, 0x8a8a90, 'step'));
        for (const e of (i === 0 ? [x1] : i === 4 ? [x0] : [x0, x1])) add(gb(e + (e === x1 ? -0.3 : 0.3), zc, 0.2, 0.03, len, 0xf0c020, 'step', P));
        add(gb(cx, 28.35, w, 0.4, 0.9, 0x7a7a80, 'step')); add(gb(cx, 27.45, w, 0.8, 0.9, 0x7a7a80, 'step'));   // schodki od hali kasowej
        add(gb(cx, -34.35, w, 0.4, 0.9, 0x7a7a80, 'step')); add(gb(cx, -33.45, w, 0.8, 0.9, 0x7a7a80, 'step'));   // i od północnego podwórka
        reserve(cx, 28.2, w, 2.6, 0); reserve(cx, -34.2, w, 2.6, 0);
    });
    // ---- tory: podsypka, szyny, kozły oporowe ----
    const bedZ = (-A + ZS) / 2, bedL = ZS + A;
    for (const tx of TX) {
        add(gb(tx, bedZ, 4.0, 0.1, bedL, 0x3a3834, 'stone'));
        for (const rx of [-0.72, 0.72]) add(gb(tx + rx, bedZ, 0.08, 0.14, bedL, 0x8a8a8a, 'metal', 0.1));
        add(gb(tx, ZS - 0.7, 3.2, 1.0, 0.6, 0xc02020, 'metal'));
    }
    // ---- pociągi: trzy z czterech torów (zależnie od ziarna), 3-5 wagonów po 12 m, drzwi po obu stronach, otwarte łączenia, ławki w środku ----
    const order = shuffle([0, 1, 2, 3]).slice(0, 3), trains = [];
    for (const ti of order) {
        const tx = TX[ti], n = 3 + Math.floor(R() * 3), nose = 22 + R() * 2.5, col = pick([0x2a4a6a, 0x6a2a2a, 0x2a5a3a, 0x5a5a62]);
        trains.push({ track: ti, cars: n, nose: nose });
        for (let k = 0; k < n; k++) {
            const zcn = nose - 6 - 12 * k, fl = 1.0, wallH = 2.3;
            add(mk(tx, 0.9, zcn, 3.2, 0.2, 12, 0x3a3a40, 'metal'));                              // podłoga
            add(mk(tx, fl + wallH + 0.125, zcn, 3.3, 0.25, 12, 0x4a4a52, 'metal'));              // dach (3,55 m: da się wejść)
            for (const sx of [-1, 1]) for (const [a, b] of segs(-6, 6, [[-4.4, -2.6], [2.6, 4.4]])) add(mk(tx + sx * 1.5, fl + wallH / 2, zcn + (a + b) / 2, 0.2, wallH, b - a, col, 'metal'));   // ściany z drzwiami
            for (const sx of [-1, 1]) for (const dz of [-4.5, 4.5]) add(mk(tx + sx * 1.0, 0.45, zcn + dz, 1.0, 0.6, 1.6, 0x202024, 'metal'));   // wózki (podwozie)
            for (const sx of [-1, 1]) for (const dz of [-1.4, 1.4]) add(mk(tx + sx * 1.1, 1.0 + 0.225, zcn + dz, 0.5, 0.45, 1.8, 0x7a4a2a, 'wood'));   // ławki
            if (k === 0) add(mk(tx, fl + wallH / 2, nose, 3.1, wallH, 0.25, col, 'metal'));       // czoło składu (z boku hali kasowej)
            if (k === n - 1) add(mk(tx, fl + wallH / 2, zcn - 6, 3.1, wallH, 0.25, col, 'metal')); // tył składu
            if (k % 2 === 1 || n === 3) hides.push([tx, 1.0, zcn, 'car']);
        }
    }
    // ---- kładka 6 m nad torami ze schodami na każdym peronie (dziury w barierce przy schodach) ----
    const cxs = PLAT.map(([a, b]) => (a + b) / 2), bw = 3, dkx0 = -34, dkx1 = 34;
    add(mk(0, BY - 0.15, BZ, dkx1 - dkx0, 0.3, bw, 0x5a5a62, 'metal'));
    for (const sz of [-1, 1]) {
        const gaps = sz > 0 ? cxs.map(c => [c - 1.5, c + 1.5]) : [];
        for (const [a, b] of segs(dkx0, dkx1, gaps)) add(mk((a + b) / 2, BY + 0.5, BZ + sz * (bw / 2 - 0.05), b - a, 1.0, 0.1, 0x3a3a42, 'metal'));
    }
    for (const c of cxs) {
        for (let k = 1; k <= 12; k++) { const top = P + 0.4 * k; add(mk(c, (P + top) / 2, BZ + bw / 2 + 0.7 * (12 - k) + 0.35, 2.2, top - P, 0.7, 0x7a7a80, 'step')); }
        reserve(c, BZ + bw / 2 + 4.2, 2.6, 9, 0.5);
    }
    for (const [x0, x1] of PLAT) for (const e of [x0 + 0.9, x1 - 0.9]) for (const z of [BZ - 1.6, BZ + 1.6]) if ((x0 === -40 && e === x0 + 0.9) || (x1 === 40 && e === x1 - 0.9)) continue; else add(gb(e, z, 0.7, BY - P - 0.3, 0.7, 0x6a6a72, 'metal', P));   // słupy kładki
    // ---- filary hali: dwa rzędy na każdym peronie (osłony) ----
    PLAT.forEach(([x0, x1], i) => {
        for (const e of (i === 0 ? [x1 - 1.0] : i === 4 ? [x0 + 1.0] : [x0 + 1.0, x1 - 1.0])) for (const z of [-27, -17, 12, 22]) { add(gb(e, z, 0.8, H - P - 0.6, 0.8, 0x9a9488, 'wall', P)); reserve(e, z, 0.8, 0.8, 0.4); }
    });
    // ---- poczekalnie (pusto w środku, drzwi i okno) i kioski ----
    const room = (cx, cz, w, d, y0, h, doors, col, kind) => {
        const t = 0.25, sides = { N: [cx, cz - d / 2, w, true], S: [cx, cz + d / 2, w, true], W: [cx - w / 2, cz, d, false], E: [cx + w / 2, cz, d, false] };
        for (const s of Object.keys(sides)) {
            const [px, pz, L, alongX] = sides[s], gaps = doors.filter(q => q.side === s).map(q => [q.at - q.gap / 2, q.at + q.gap / 2]);
            for (const [a, b] of segs(-L / 2, L / 2, gaps)) add(alongX ? mk(px + (a + b) / 2, y0 + h / 2, pz, b - a, h, t, col, 'wall') : mk(px, y0 + h / 2, pz + (a + b) / 2, t, h, b - a, col, 'wall'));
        }
        add(mk(cx, y0 + h + 0.15, cz, w + 0.4, 0.3, d + 0.4, 0x4a4a52, 'metal'));
        if (kind === 'room') add(mk(cx, y0 + 0.225, cz + d / 2 - 0.9, w - 1.4, 0.45, 0.5, 0x7a4a2a, 'wood'));
        reserve(cx, cz, w, d, 0.9); hides.push([cx, y0, cz - (kind === 'room' ? 0.4 : 0), kind]);
    };
    const roomAt = shuffle([[1, 14], [2, -22], [3, 11], [3, -18], [1, -10]]).slice(0, 3);
    for (const [pi, z] of roomAt) { const [x0, x1] = PLAT[pi], c = (x0 + x1) / 2; room(c, z, 7, 5, P, 2.8, [{ side: 'N', at: 0, gap: 1.4 }, { side: 'E', at: 1.2, gap: 1.0 }, { side: 'S', at: -2, gap: 1.2 }], 0xb8b0a0, 'room'); }
    for (const [pi, z] of [[0, 6], [4, -14], [4, 14]]) { const [x0, x1] = PLAT[pi], c = pi === 0 ? x0 + 4.5 : x1 - 4.5; room(c, z, 2.4, 2.4, P, 2.5, [{ side: pi === 0 ? 'E' : 'W', at: 0, gap: 1.1 }], 0x7a5a3a, 'kiosk'); }
    // ---- szyby wentylacyjne (dwa przy ścianach peronu, jeden wysoko nad torami) ----
    const duct = (x, z, y0, L, axis, mkc) => {
        const W = 1.5, Hh = 1.45, t = 0.12, col = mkc || 0x8a9098, al = axis === 'x';
        add(mk(x, y0 + Hh + t / 2, z, al ? L : W + 2 * t, t, al ? W + 2 * t : L, col, 'metal'));
        for (const s of [-1, 1]) add(mk(al ? x : x + s * (W / 2 + t / 2), y0 + Hh / 2, al ? z + s * (W / 2 + t / 2) : z, al ? L : t, Hh, al ? t : L, col, 'metal'));
        if (y0 > 2) add(mk(x, y0 - t / 2, z, al ? L : W + 2 * t, t, al ? W + 2 * t : L, col, 'metal'));
        else reserve(x, z, al ? L : W + 2 * t, al ? W + 2 * t : L, 0.5);
    };
    duct(-38.7, -10, P, 38, 'z'); hides.push([-38.7, P, -10, 'duct']);
    duct(38.7, 4, P, 40, 'z'); hides.push([38.7, P, 4, 'duct']);
    duct(-24, -22, 4.6, 30, 'x', 0x7a8088);   // wysoko nad torami: z dachu wagonu na sąsiedni peron
    for (const z of [-23.2, -20.8]) for (let k = 0; k < 4; k++) add(mk(-38.9, 1.7 + k * 0.7, z, 0.5, 0.18, 0.5, 0x5a5a5a, 'metal'));   // półki do wspinania się do wysokiego szybu przy zachodniej ścianie
    // ---- ukryte tunele za ścianami: luki 0,9-1,0 m od strony hali, końce zamknięte; północny przy ścianie północnej, dwa południowe przy hali kasowej ----
    const tunnelX = (x0, x1, zi0, zi1, hatches, col) => {
        const front = zi1 > zi0 ? zi1 + 0.15 : zi1 - 0.15, ce = (zi0 + zi1) / 2;
        for (const [a, b] of segs(x0, x1, hatches.map(h => [h - 0.5, h + 0.5]))) add(mk((a + b) / 2, 1.3, front, b - a, 2.6, 0.3, col, 'wall'));
        add(mk((x0 + x1) / 2, 2.75, ce, x1 - x0 + 0.3, 0.3, Math.abs(zi1 - zi0) + 0.2, 0x4a4a52, 'metal'));
        for (const e of [x0, x1]) add(mk(e, 1.3, ce, 0.3, 2.6, Math.abs(zi1 - zi0), col, 'wall'));
        for (const h of hatches) hides.push([h, 0, ce, 'tunnel']);
        reserve((x0 + x1) / 2, ce, x1 - x0, Math.abs(zi1 - zi0) + 0.6, 0.6);
    };
    tunnelX(-38, 38, -39.9, -37.9, [-26 + Math.round((R() - 0.5) * 6), -4 + Math.round((R() - 0.5) * 4), 17 + Math.round((R() - 0.5) * 6)], 0x6a6258);
    tunnelX(-38, -6, 39.9, 38.0, [-30 + Math.round((R() - 0.5) * 4), -16 + Math.round((R() - 0.5) * 4)], 0x62606a);
    tunnelX(6, 38, 39.9, 38.0, [14 + Math.round((R() - 0.5) * 4), 29 + Math.round((R() - 0.5) * 4)], 0x62606a);
    // ---- hala kasowa (z = 28...40): budki, filary, automaty, ławki; wolny pas przy drzwiach GAMES ----
    for (const x of [-24, -12, 12, 24]) { add(gb(x, 30.2, 3.2, 2.6, 1.8, 0x3a5a7a, 'metal')); reserve(x, 30.2, 3.2, 1.8, 0.8); }
    for (const x of [-30, -15, 15, 30]) { add(gb(x, 34, 0.8, H - 0.6, 0.8, 0x9a9488, 'wall')); reserve(x, 34, 0.8, 0.8, 0.5); }
    reserve(0, 36, 9, 8, 0);   // przejście do drzwi GAMES
    for (let i = 0; i < 5; i++) {
        for (let t = 0; t < 30; t++) {
            const x = -34 + R() * 68, z = 31 + R() * 5, w = pick([1.0, 2.2]), d = w === 1.0 ? 0.8 : 0.5;
            if (taken(x, z, w + 0.6, d + 0.6)) continue;
            add(gb(x, z, w, w === 1.0 ? 2.0 : 0.5, d, w === 1.0 ? pick([0xc02020, 0x2060a0, 0x20a060]) : 0x7a4a2a, w === 1.0 ? 'metal' : 'wood')); reserve(x, z, w, d, 0.4); break;
        }
    }
    // ---- rekwizyty na peronach: ławki, automaty, skrzynie, wózki bagażowe (z ziarna) ----
    PLAT.forEach(([x0, x1], pi) => {
        const n = 7 + Math.floor(R() * 3);
        for (let i = 0; i < n; i++) for (let t = 0; t < 25; t++) {
            const kind = pick(['bench', 'bench', 'vend', 'crate', 'cart']), w = kind === 'bench' ? 2.2 : kind === 'vend' ? 1.0 : kind === 'crate' ? 1.2 : 1.6, d = kind === 'bench' ? 0.5 : kind === 'vend' ? 0.8 : kind === 'crate' ? 1.2 : 0.9;
            const x = x0 + 1.6 + R() * (x1 - x0 - 3.2), z = ZN + 2 + R() * (len - 4);
            if (taken(x, z, w + 0.8, d + 0.8)) continue;
            const h = kind === 'bench' ? 0.5 : kind === 'vend' ? 2.0 : kind === 'crate' ? (R() < 0.4 ? 2.3 : 1.2) : 1.1, c = kind === 'bench' ? 0x7a4a2a : kind === 'vend' ? pick([0xc02020, 0x2060a0, 0x20a060]) : kind === 'crate' ? 0x8a6a3a : 0x5a5a62;
            add(gb(x, z, w, h, d, c, kind === 'bench' || kind === 'crate' ? 'wood' : 'metal', P)); reserve(x, z, w, d, 0.3); break;
        }
    });
    // ---- północne podwórko (z od -40 do -33): skrzynie i budka sygnałowa, stąd rusza potwór ----
    add(gb(-30, -35.2, 5, 3.6, 3, 0x6a5a4a, 'wall')); reserve(-30, -35.2, 5, 3, 1.2);
    add(gb(28, -35.4, 3, 2.4, 2.4, 0x5a5a62, 'metal')); reserve(28, -35.4, 3, 2.4, 1.2);
    for (const [x, z] of [[-8, -35.5], [11, -34.8], [4, -35.8]]) if (R() < 0.9) { add(gb(x, z, 1.2, 1.2, 1.2, 0x8a6a3a, 'wood')); reserve(x, z, 1.2, 1.2, 0.8); }
    // ---- starty: uciekinierzy w hali kasowej, potwór na północnym podwórku ----
    const all = boxes.concat(inst), blocked = (x, z, m) => all.some(b => b.h > 0.4 && b.y - b.h / 2 < 1.6 && Math.abs(x - b.x) < b.w / 2 + m && Math.abs(z - b.z) < b.d / 2 + m);
    const cand = []; for (let z = 31.5; z <= 37; z += 1.5) for (let x = -34; x <= 34; x += 1.5) if (!blocked(x, z, 1.1)) cand.push([x, z]);
    const survivors = []; for (const [x, z] of shuffle(cand)) { if (survivors.length >= 6) break; if (survivors.every(s => Math.hypot(s[0] - x, s[2] - z) >= 2.4)) survivors.push([x, 1.0, z]); }
    for (let k = 0; survivors.length < 6 && k < 60; k++) { const x = -30 + 60 * R(), z = 31.5 + 5 * R(); if (!blocked(x, z, 1.1)) survivors.push([x, 1.0, z]); }
    const mc = []; for (let x = -34; x <= 34; x += 1.5) for (const z of [-35, -36.5]) if (!blocked(x, z, 1.1) && TX.every(tx => Math.abs(x - tx) > 2.6)) mc.push([x, z]);
    const m = mc.length ? pick(mc) : [0, -36];
    const lights = []; for (const x of [-30, -12, 12, 30]) for (const z of [-28, -8, 12]) lights.push([x, 8.6, z]);   // lampy wiszą 3,4 m pod sufitem: platformy są oświetlone lepiej niż z samego sufitu
    lights.push([0, 8.6, 33], [-25, 8.6, 33], [25, 8.6, 33], [0, 7, -37]);
    return { boxes, inst, lights, entry: [0, 1.0, A - 2], monster: [m[0], 1.0, m[1]], survivors, hides, trains, botJump: 4.8, lightPower: 30, floor: 0x6a6a6e, wall: 0xd8d0b8, ceil: 0x2a2a30 };
}

// ---------- kontrola układu (używa jej test): osiągalność pieszo (siatka 0,5 m, stopień do 0,55 m, przeskok luki do 1 m, wysokość głowy 1,4 m) ----------
export function walkField(md) {
    const { A, CELL, CLEAR } = ST, N = Math.round(2 * A / CELL), all = md.boxes.concat(md.inst || []), cells = new Array(N * N);
    const ci = (v) => Math.min(N - 1, Math.max(0, Math.floor((v + A) / CELL)));
    for (const b of all) {
        const i0 = ci(b.x - b.w / 2 + 0.02), i1 = ci(b.x + b.w / 2 - 0.02), j0 = ci(b.z - b.d / 2 + 0.02), j1 = ci(b.z + b.d / 2 - 0.02);   // komórka jest zajęta, gdy bryła zachodzi na nią o więcej niż 2 cm (cienkie ściany też blokują)
        for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) (cells[j * N + i] || (cells[j * N + i] = [])).push([b.y - b.h / 2, b.y + b.h / 2]);
    }
    const stand = (i, j) => {   // wysokości, na których da się stać w komórce
        const list = cells[j * N + i] || [], hs = [0]; for (const [, t] of list) if (t > 0 && t < 9) hs.push(+t.toFixed(3));
        return Array.from(new Set(hs)).filter(h => !list.some(([lo, hi]) => hi > h + 0.05 && lo < h + CLEAR - 0.001 && !(Math.abs(hi - h) < 0.01)));
    };
    return { N, cells, stand, ci, cellCenter: (i, j) => [-A + (i + 0.5) * CELL, -A + (j + 0.5) * CELL] };
}
export function reachFrom(md, x, z, y0) {
    const F = walkField(md), { N } = F, seen = new Map(), key = (i, j, h) => (j * N + i) * 64 + Math.round(h * 10), q = [];
    const si = F.ci(x), sj = F.ci(z), s0 = F.stand(si, sj).reduce((b, h) => Math.abs(h - (y0 || 0)) < Math.abs(b - (y0 || 0)) ? h : b, 99);
    if (s0 === 99) return { F, seen, has: () => false };
    seen.set(key(si, sj, s0), 1); q.push([si, sj, s0]);
    const free = (i, j, h) => { const l = F.cells[j * N + i]; return !l || !l.some(([lo, hi]) => hi > h + 0.05 && lo < h + ST.CLEAR - 0.001); };
    const colFree = (i, j, from, to) => { const l = F.cells[j * N + i]; return !l || !l.some(([lo, hi]) => hi > from + 0.06 && lo < to); };   // zeskok tylko w wolną przestrzeń (nie przez płytę sufitu)
    const moves = (ni, nj, h) => F.stand(ni, nj).filter(nh => nh <= h + 0.55 && h - nh <= 7 && (h - nh <= 0.55 || colFree(ni, nj, nh, h)));
    while (q.length) {
        const [i, j, h] = q.pop();
        for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) for (const hop of [1, 2]) {
            const ni = i + di * hop, nj = j + dj * hop; if (ni < 0 || nj < 0 || ni >= N || nj >= N) break;
            if (hop === 2 && !free(i + di, j + dj, h)) break;   // przeskok tylko nad luką, nie nad ścianą
            const ms = moves(ni, nj, h);
            for (const nh of ms) { const k = key(ni, nj, nh); if (!seen.has(k)) { seen.set(k, 1); q.push([ni, nj, nh]); } }
            if (hop === 1 && ms.length) break;   // zwykły krok wystarczył: bez przeskoku
        }
    }
    return { F, seen, has: (px, pz, py) => { const i = F.ci(px), j = F.ci(pz); return F.stand(i, j).some(h => Math.abs(h - py) < 0.3 && seen.has(key(i, j, h))); } };
}
export function stationProblems(md) {
    const bad = [], A = ST.A, all = md.boxes.concat(md.inst || []);
    if (md.inst.length > 760) bad.push('too many instances (' + md.inst.length + ')');
    if (md.boxes.length > 8) bad.push('too many separate meshes (' + md.boxes.length + ')');
    for (const b of all) if (![b.x, b.y, b.z, b.w, b.h, b.d].every(Number.isFinite) || b.w <= 0 || b.h <= 0 || b.d <= 0 || Math.abs(b.x) + b.w / 2 > A + 0.01 || Math.abs(b.z) + b.d / 2 > A + 0.01 || b.y - b.h / 2 < -0.01 || b.y + b.h / 2 > ST.H) { bad.push('a box is outside the hall or malformed: ' + JSON.stringify(b)); break; }
    const r = reachFrom(md, md.entry[0], md.entry[2], 0);
    const need = [['monster start', md.monster[0], md.monster[2], 0], ...md.survivors.map((s, i) => ['survivor ' + i, s[0], s[2], 0]), ...PLAT.map(([a, b], i) => ['platform ' + i, (a + b) / 2, 20, ST.P]), ...md.hides.map(h => ['hide ' + h[3], h[0], h[2], h[1]])];
    for (const [name, x, z, y] of need) if (!r.has(x, z, y)) bad.push(name + ' at (' + x.toFixed(1) + ', ' + z.toFixed(1) + ') cannot be reached on foot from the entrance');
    const kinds = new Set(md.hides.map(h => h[3])); for (const k of ['car', 'room', 'kiosk', 'duct', 'tunnel']) if (!kinds.has(k)) bad.push('no hiding spot of kind ' + k);
    if (md.hides.filter(h => h[3] === 'tunnel').length < 6) bad.push('too few tunnel hatches');
    return bad;
}
