// ==========================================
// THE MINE (kopalnia): czysta logika poziomu (bez THREE).
// Układ: jaskinia 18 x 18 m i 25 m wysokości, cztery galerie (piętra 5, 10, 15 i 20 m) po kolei wzdłuż ścian, a między nimi drabiny (szczeble na ścianie).
// Z trzech galerii prowadzą boczne komory z zasilaczami, wyjście jest na najwyższym piętrze. Potwór (Kopacz) chodzi po GRAFIE węzłów: podłoga,
// galerie, komory i drabiny; po drabinach wolniej. Lampa gracza ma baterię i widzi ją potwór, a hałas (bieg, upadek, głos, zasilacz) go przyciąga.
// ==========================================
export const GEOM = { HW: 9, WALL: 1.5, HEIGHT: 25, TIERS: [5, 10, 15, 20], LEDGE: 0.6, GALLERY: 3.5, OPEN_W: 3.2, OPEN_H: 3.4, CHAMBER: 16.75 };

// Węzły grafu (x, y = poziom podłogi, z). Kolejność jest stała: testy i poziom odwołują się do indeksów przez nazwy w IDX.
export const NODES = [
    { n: 'F0', x: 0, y: 0, z: 0 }, { n: 'F1', x: -6, y: 0, z: 6.5 }, { n: 'F2', x: 0, y: 0, z: -7 }, { n: 'F3', x: 7, y: 0, z: 0 },
    { n: 'LB0', x: -8.2, y: 0, z: 6.2 }, { n: 'LT0', x: -8.2, y: 5, z: 6.2 },
    { n: 'A1', x: -7.25, y: 5, z: 4 }, { n: 'A2', x: -7.25, y: 5, z: 0 }, { n: 'CHA', x: -15.2, y: 5, z: 0 }, { n: 'A3', x: -7.25, y: 5, z: -7.4 },
    { n: 'LB1', x: -6.2, y: 5, z: -8.2 }, { n: 'LT1', x: -6.2, y: 10, z: -8.2 },
    { n: 'B1', x: -4.2, y: 10, z: -7.2 }, { n: 'B2', x: 0, y: 10, z: -7.2 }, { n: 'CHB', x: 0, y: 10, z: -15.2 }, { n: 'B3', x: 7.4, y: 10, z: -7.2 },
    { n: 'LB2', x: 8.2, y: 10, z: -6.2 }, { n: 'LT2', x: 8.2, y: 15, z: -6.2 },
    { n: 'C1', x: 7.25, y: 15, z: -4 }, { n: 'C2', x: 7.25, y: 15, z: 0 }, { n: 'CHC', x: 15.2, y: 15, z: 0 }, { n: 'C3', x: 7.25, y: 15, z: 7.4 },
    { n: 'LB3', x: 6.2, y: 15, z: 8.2 }, { n: 'LT3', x: 6.2, y: 20, z: 8.2 },
    { n: 'D1', x: 4.2, y: 20, z: 7.2 }, { n: 'D2', x: 0, y: 20, z: 7.2 }, { n: 'D3', x: -7, y: 20, z: 7.2 }
];
export const IDX = Object.fromEntries(NODES.map((q, i) => [q.n, i]));
const E = (a, b, kind) => ({ a: IDX[a], b: IDX[b], kind: kind || 'walk' });
export const EDGES = [
    E('F0', 'F1'), E('F0', 'F2'), E('F0', 'F3'), E('F1', 'LB0'), E('LB0', 'LT0', 'ladder'), E('LT0', 'A1'), E('A1', 'A2'), E('A2', 'CHA'), E('A2', 'A3'), E('A3', 'LB1'),
    E('LB1', 'LT1', 'ladder'), E('LT1', 'B1'), E('B1', 'B2'), E('B2', 'CHB'), E('B2', 'B3'), E('B3', 'LB2'), E('LB2', 'LT2', 'ladder'), E('LT2', 'C1'), E('C1', 'C2'),
    E('C2', 'CHC'), E('C2', 'C3'), E('C3', 'LB3'), E('LB3', 'LT3', 'ladder'), E('LT3', 'D1'), E('D1', 'D2'), E('D2', 'D3')
];
const ADJ = NODES.map(() => []);
for (const e of EDGES) { ADJ[e.a].push(e.b); ADJ[e.b].push(e.a); }
export const neighbours = (i) => (ADJ[i] || []).slice();
export const edgeKind = (a, b) => { const e = EDGES.find(q => (q.a === a && q.b === b) || (q.a === b && q.b === a)); return e ? e.kind : null; };

// Najbliższy węzeł (odległość w 3D od podanego punktu, np. stóp gracza)
export function nearestNode(x, y, z) {
    let best = 0, bd = Infinity;
    for (let i = 0; i < NODES.length; i++) { const q = NODES[i], d = (q.x - x) ** 2 + (q.y - y) ** 2 + (q.z - z) ** 2; if (d < bd) { bd = d; best = i; } }
    return best;
}
// Najkrótsza ścieżka po grafie (BFS): lista indeksów od `from` do `to` włącznie; pusta, gdy brak (albo indeksy poza zakresem)
export function findPath(from, to) {
    if (!(from >= 0 && from < NODES.length && to >= 0 && to < NODES.length)) return [];
    if (from === to) return [from];
    const prev = new Array(NODES.length).fill(-1); prev[from] = from; const q = [from];
    while (q.length) {
        const cur = q.shift();
        for (const nx of ADJ[cur]) if (prev[nx] < 0) { prev[nx] = cur; if (nx === to) { const out = [to]; let c = to; while (c !== from) { c = prev[c]; out.push(c); } return out.reverse(); } q.push(nx); }
    }
    return [];
}
// Piętro, na którym stoi punkt (0 = podłoga, 1..4 = galerie); y to wysokość stóp
export function tierOf(y) { const T = GEOM.TIERS; let best = 0; for (let i = 0; i < T.length; i++) if (y >= T[i] - 1.2) best = i + 1; return best; }
// Najdalszy od punktu węzeł (miejsce, z którego startuje albo budzi się potwór)
export function farthestNode(x, y, z, skip) {
    let best = 0, bd = -1;
    for (let i = 0; i < NODES.length; i++) { if (skip && skip.includes(i)) continue; const q = NODES[i], d = (q.x - x) ** 2 + (q.y - y) ** 2 + (q.z - z) ** 2; if (d > bd) { bd = d; best = i; } }
    return best;
}

// ---------- BATERIA LAMPY ----------
export const BATTERY = { SECONDS: { easy: 180, normal: 120, nightmare: 90 }, PACK: 0.45, LOW: 0.4, FLICKER: 0.12 };
export const lampSeconds = (id) => BATTERY.SECONDS[id] || BATTERY.SECONDS.normal;
// Zużycie baterii: tylko gdy lampa świeci (sekundy pracy z pełnej baterii zależą od trudności)
export function batteryStep(bat, dt, lampOn, secs) { return lampOn ? Math.max(0, bat - dt / Math.max(1, secs)) : bat; }
export const batteryAdd = (bat, amount) => Math.min(1, Math.max(0, bat + amount));
// Zasięg wiązki jako ułamek pełnego (słaba bateria skraca światło, pusta gasi je)
export const lampReach = (bat) => bat <= 0 ? 0 : 0.45 + 0.55 * Math.min(1, bat / BATTERY.LOW);
// Migotanie przy prawie pustej baterii: r to liczba losowa 0..1
export const lampFlickers = (bat, r) => bat > 0 && bat < BATTERY.FLICKER && r < 0.35;

// ---------- PERCEPCJA POTWORA ----------
export const SENSE = { BREATH: 3.2, LIGHT_NEAR: 8, LIGHT_FAR: 17, HEAR_RUN: 11, RUN_SPEED: 3.8, FALL_SPEED: 6, LANDING: 26, CELL: 32 };
// o: { d (odległość 3D), lamp (świeci), runSpeed (m/s poziomo), vy (m/s w pionie), voice (głos z mikrofonu usłyszany), mul (trudność: zasięg) }
// Zwraca 'breath' (oddech: potwór czuje cię z bliska), 'light-near' (światło tuż obok: pościg), 'light' (światło z daleka: idzie sprawdzić), 'voice', 'run' albo null
export function perceive(o) {
    const m = o.mul || 1;
    if (o.d < SENSE.BREATH * m) return 'breath';
    if (o.lamp && o.d < SENSE.LIGHT_NEAR * m) return 'light-near';
    if (o.lamp && o.d < SENSE.LIGHT_FAR * m) return 'light';
    if (o.voice) return 'voice';
    if ((o.runSpeed > SENSE.RUN_SPEED || Math.abs(o.vy) > SENSE.FALL_SPEED) && o.d < SENSE.HEAR_RUN * m) return 'run';
    return null;
}
// Zasięg widzenia i słuchu zależny od trudności; prędkości potwora (m/s) w patrolu, sprawdzaniu i pościgu
export const DIFF_MUL = { easy: 0.8, normal: 1, nightmare: 1.25 };
export const SPEEDS = { patrol: 1.7, investigate: 2.6, chase: 3.5, ladder: 0.55 };
export const speedFor = (mode, kind, id) => (SPEEDS[mode] || SPEEDS.patrol) * (kind === 'ladder' ? SPEEDS.ladder : 1) * (id === 'easy' ? 0.8 : (id === 'nightmare' ? 1.2 : 1));
