// ==========================================
// NAWIEDZONE LOBBY I MÓJ POKÓJ: czysta logika (bez THREE i sieci; testy: tests/modes/lobby.mjs). Czas zawsze jako argument, losowość jako rand().
// Pięć drobnych "zdarzeń grozy", wszystkie tylko wizualne i lokalne (nic nie idzie przez sieć, nic nie zmienia nagród ani zapisu) i wyłączane razem z Nocną Zmianą (SETTINGS.lobbyEvents):
//   1) manekiny w lobby, gdy na nie nie patrzysz, zmieniają pozę albo robią ciche kroki w twoją stronę (manStep, poseVariant);
//   2) na Ścianie Graffiti na kilka sekund pojawia się "nie nasz" rysunek (GRAF.KINDS);
//   3) stworek wyczuwa potwora Nocnej Zmiany: drży, chowa się za graczem i patrzy w jego stronę (petFear);
//   4) Mój Pokój: meble przesuwają się same, światła mrugają, na ścianie pojawia się napis, puchary i posąg patrzą na gracza (HOME.KINDS);
//   5) dźwięk lobby: komunikat z głośnika, śmiech dziecka i trzaski świateł przed Nocną Zmianą (core/audio.js, ambience.js).
// HAUNT_STATE to jedyny stan współdzielony: lobbyplay.js wpisuje fazę nocy i pozycję potwora, a pet.js i lobby.js je czytają.
// ==========================================
export const HAUNT = {
    MAN: { EVERY: [9, 18], STEP: 0.45, DRIFT: 3.2, MIN_DIST: 2.4, MAX_DIST: 11, SEP: 2.2, BOUND: 13, STEP_CHANCE: 0.45 },
    GRAF: { EVERY: [150, 300], LEN: [7, 11], MAX_PLAYER_DIST: 22, KINDS: ['eye', 'see', 'tally', 'hands', 'face', 'spiral'] },
    HOME: { EVERY: [18, 40], KINDS: ['shift', 'lights', 'writing', 'cups', 'statue'] },
    PET: { RANGE: 14, NEAR: 4 }
};
export const HAUNT_STATE = { night: 'calm', monster: null };   // monster: { x, z } tylko w fazie 'night'
const num = (v) => typeof v === 'number' && Number.isFinite(v);
const pt = (p) => !!p && num(p.x) && num(p.z);
export const nextIn = (range, rand) => range[0] + rand() * (range[1] - range[0]);
// Cichy krok manekina w stronę gracza (null = nie wolno: za blisko, za daleko, za daleko od miejsca startu, poza salą albo za blisko innego manekina)
export function manStep(pos, home, player, others, o) {
    o = o || HAUNT.MAN;
    if (!pt(pos) || !pt(home) || !pt(player)) return null;
    const dx = player.x - pos.x, dz = player.z - pos.z, d = Math.hypot(dx, dz);
    if (!(d >= o.MIN_DIST + o.STEP) || d > o.MAX_DIST) return null;
    const x = pos.x + dx / d * o.STEP, z = pos.z + dz / d * o.STEP;
    if (Math.hypot(x - home.x, z - home.z) > o.DRIFT || Math.abs(x) > o.BOUND || Math.abs(z) > o.BOUND) return null;
    for (const q of others || []) if (pt(q) && (q.x !== pos.x || q.z !== pos.z) && Math.hypot(x - q.x, z - q.z) < o.SEP) return null;
    return { x: x, z: z };
}
// Nowa poza manekina w tych samych zakresach co przy budowie (przechylenie tułowia i głowy); 20% to skrajnie przekrzywiona głowa
export function poseVariant(rand) {
    const extreme = rand() < 0.2;
    return { leanZ: (rand() - 0.5) * 0.22, leanX: (rand() - 0.5) * 0.2, headZ: extreme ? (rand() < 0.5 ? -1 : 1) * (1 + rand() * 0.6) : (rand() - 0.5) * 0.9, headX: (rand() - 0.3) * 0.7 };
}
// Wybór zdarzenia z listy bez powtórzenia poprzedniego (last = indeks albo -1); zwraca indeks
export function pickKind(n, rand, last) { if (!(n >= 1)) return -1; if (n === 1) return 0; let k = Math.min(n - 1, Math.floor(rand() * n)); if (k === last) k = (k + 1 + Math.min(n - 2, Math.floor(rand() * (n - 1)))) % n; return k; }
// Strach stworka 0..1: 0 bez potwora albo poza RANGE, 1 w odległości NEAR i bliżej
export function petFear(monster, pet, o) {
    o = o || HAUNT.PET;
    if (!pt(monster) || !pt(pet)) return 0;
    const d = Math.hypot(monster.x - pet.x, monster.z - pet.z);
    return Math.max(0, Math.min(1, (o.RANGE - d) / (o.RANGE - o.NEAR)));
}
// Miejsce za graczem, w którym stworek się chowa: na linii potwór -> gracz, dist m za graczem
export function hideSpot(monster, player, dist) {
    if (!pt(monster) || !pt(player)) return null;
    const dx = player.x - monster.x, dz = player.z - monster.z, d = Math.hypot(dx, dz) || 1;
    return { x: player.x + dx / d * dist, z: player.z + dz / d * dist };
}
// Przebieg widoczności rysunku na ścianie w czasie t od startu: narasta 1,2 s, trzyma, na końcu (ostatnie 1,5 s) mruga i znika. Zwraca 0..1
export function grafAlpha(t, len) {
    if (!num(t) || !num(len) || t < 0 || t > len) return 0;
    const up = Math.min(1, t / 1.2), left = len - t;
    if (left < 1.5) return up * (Math.sin(t * 40) > -0.3 ? Math.min(1, left / 1.5 + 0.2) : 0.1);
    return up;
}

// ---------- STAFF ROOM: pokój, który z czasem "psuje się" (levels/staff.js) ----------
// Im dłużej gracz tam jest, tym większe napięcie (staffDread 0..1) i tym częstsze zdarzenia; przy szczycie raz zgasną wszystkie światła, a czerwone oczy zbliżą się z ciemności.
// Wszystko lokalne i wizualne (drzwi, telewizor, komputer i młotki działają bez zmian), wyłączane przyciskiem Haunt (SETTINGS.lobbyEvents).
export const STAFF = {
    RAMP: 240, EVERY: [14, 26], MIN_FACTOR: 0.4, BLACKOUT_AT: 0.85, BLACKOUT_LEN: 6, AFTER_BLACKOUT: 0.4,
    EVENTS: ['whisper', 'flicker', 'tv', 'writing', 'drip', 'slam', 'step'],
    CREEP: { EVERY: [3, 6], STEP: 0.35, DRIFT: 6, MIN_DIST: 1.8, MAX_DIST: 12, SEP: 1.4, BOUND: 5.2, STEP_CHANCE: 1 },
    EYES: { START: 7, END: 1.6, DEFAULT_HEIGHT: 1.5 }
};
export const staffDread = (elapsed) => num(elapsed) ? Math.max(0, Math.min(1, elapsed / STAFF.RAMP)) : 0;
export const staffGap = (dread, rand) => nextIn(STAFF.EVERY, rand) * (1 - (1 - STAFF.MIN_FACTOR) * Math.max(0, Math.min(1, num(dread) ? dread : 0)));
// Czy właśnie teraz ma nastąpić zaciemnienie: przy szczycie napięcia i tylko raz (done = już było)
export const staffBlackoutDue = (dread, done) => !done && num(dread) && dread >= STAFF.BLACKOUT_AT;
// Odległość czerwonych oczu od gracza w czasie zaciemnienia: od START do END m liniowo w ciągu BLACKOUT_LEN s
export function eyesDistance(t) { if (!num(t) || t <= 0) return STAFF.EYES.START; if (t >= STAFF.BLACKOUT_LEN) return STAFF.EYES.END; return STAFF.EYES.START + (STAFF.EYES.END - STAFF.EYES.START) * (t / STAFF.BLACKOUT_LEN); }
// Przesunięcie źrenicy portretu (-1..1 w obu osiach) w stronę gracza: dir = wektor do gracza w układzie obrazu (x w prawo, y w górę, z przed obraz); zero, gdy gracz jest za obrazem
export function pupilOffset(dir) { if (!dir || !num(dir.x) || !num(dir.y) || !num(dir.z) || dir.z <= 0.05) return { x: 0, y: 0 }; return { x: Math.max(-1, Math.min(1, dir.x / dir.z)), y: Math.max(-1, Math.min(1, dir.y / dir.z)) }; }
