// ==========================================
// KĄCIK GIER W LOBBY: czysta logika (bez THREE, fizyki i sieci; testy: tests/modes/lobby.mjs). Dwie gry na piłki-gałki, rzucane ręką:
//   1) KOSZ: obręcz na zachodniej ścianie; punkt, gdy środek piłki przejdzie przez obręcz z góry na dół (hoopScored). Seria liczy kosze padające w oknie czasu (nextStreak).
//   2) TARCZA: wielka tarcza na ścianie; piłka, która uderzy w ścianę w obrębie tarczy, daje punkty za pierścień (targetPoints: 50, 20, 10, 5).
// Punkty liczy WYŁĄCZNIE host (albo gracz solo) z pozycji piłek w swojej fizyce; goście dostają tylko liczniki i przyjmują je przez cleanMinigames.
// Nic tu nie daje Bagabucksów ani rekordów (to zabawa, bez nagród), więc nie ma czego nadużywać.
// ==========================================
export const HOOP = { X: -14.35, Y: 3.05, Z: 10.9, R: 0.32 };                  // środek obręczy (x, y, z) i promień; tablica wisi na ścianie x = -14.85
export const TARGET = { X: -14.93, Y: 1.9, Z: 8.3, R: 0.6, WALL_HIT: -14.62, MIN_STEP: 0.012,   // X: ściana; trafienie, gdy środek piłki jest bliżej ściany niż WALL_HIT i leci w jej stronę
    RINGS: [[0.09, 50], [0.22, 20], [0.38, 10], [0.6, 5]] };                  // [promień, punkty]
export const STREAK_WINDOW = 15;                                                // kosz w ciągu tylu sekund od poprzedniego podtrzymuje serię
export const BALL_COOLDOWN = 1.2;                                               // jedna piłka trafia w tarczę najwyżej raz na tyle sekund
export const MAX_SCORE = 99999;
const num = (v) => typeof v === 'number' && Number.isFinite(v);
const pt = (p) => p && num(p.x) && num(p.y) && num(p.z);

// Kosz: czy środek piłki przeszedł w dół przez płaszczyznę obręczy w jej obrysie (od promienia odejmujemy trochę luzu, żeby trzeba było trafić)
export function hoopScored(prev, cur, hoop = HOOP) {
    if (!pt(prev) || !pt(cur)) return false;
    if (!(prev.y > hoop.Y && cur.y <= hoop.Y)) return false;
    const k = (prev.y - hoop.Y) / (prev.y - cur.y), x = prev.x + (cur.x - prev.x) * k, z = prev.z + (cur.z - prev.z) * k;   // punkt przecięcia płaszczyzny obręczy
    return Math.hypot(x - hoop.X, z - hoop.Z) <= hoop.R - 0.05;
}
// Tarcza: punkty za pierścień, w który trafiła piłka; 0 = pudło, piłka daleko od ściany albo leci od niej
export function targetPoints(prev, cur, tg = TARGET) {
    if (!pt(prev) || !pt(cur)) return 0;
    if (!(cur.x < tg.WALL_HIT && prev.x - cur.x > tg.MIN_STEP)) return 0;
    const r = Math.hypot(cur.y - tg.Y, cur.z - tg.Z);
    for (const [rad, pts] of tg.RINGS) if (r <= rad) return pts;
    return 0;
}
// Seria koszy: kolejny kosz w oknie czasu zwiększa serię, inaczej zaczyna od 1 (now i last to sekundy zegara gry)
export function nextStreak(streak, last, now, win = STREAK_WINDOW) { return num(last) && last >= 0 && now - last <= win ? streak + 1 : 1; }

export function newMinigames() { return { hoops: 0, streak: 0, bestStreak: 0, tHoop: -1, lastTarget: 0, bestTarget: 0, target: 0 }; }
// Kosz zaliczony o czasie now: zwraca nowy stan (bez mutacji)
export function addHoop(s, now) {
    const streak = nextStreak(s.streak, s.tHoop, now);
    return { ...s, hoops: Math.min(MAX_SCORE, s.hoops + 1), streak: streak, bestStreak: Math.max(s.bestStreak, streak), tHoop: now };
}
export function addTarget(s, pts) {
    if (!(pts > 0)) return s;
    return { ...s, lastTarget: pts, bestTarget: Math.max(s.bestTarget, pts), target: Math.min(MAX_SCORE, s.target + pts) };
}
// Co idzie do gości: tylko liczniki (kolejność stała); odbiorca przyjmuje je przez cleanMinigames
export const netMinigames = (s) => [s.hoops, s.streak, s.bestStreak, s.lastTarget, s.bestTarget, s.target];
export function cleanMinigames(a) {
    if (!Array.isArray(a) || a.length !== 6 || !a.every(v => Number.isInteger(v) && v >= 0 && v <= MAX_SCORE)) return null;
    return { hoops: a[0], streak: a[1], bestStreak: a[2], lastTarget: a[3], bestTarget: a[4], target: a[5] };
}
