// ==========================================
// STWOREK (własny potwór-towarzysz): CZYSTA LOGIKA, testowana w Node (tests/logic.mjs). Bez THREE, DOM, sieci i zegara: czas zawsze przychodzi jako 'now'.
// Jajo kupujesz w lobby (HATCH_COST Bagabucksów), z jaja wykluwa się stworek z losowym kolorem (jeden na dwadzieścia jest złoty) i imieniem z listy.
// Stan to mały obiekt w SAVE.pet; KAŻDY odczyt przechodzi przez normalizePet (jak normalizeHome), więc ręcznie zmieniony zapis nie da cech, kolorów ani imion spoza list.
// Sytość i humor spadają z upływem czasu liczonym z zapisanych znaczników czasu (z górnym limitem, żeby zmiana zegara nic nie psuła), ale nigdy poniżej
// dołka humoru i nic się nie dzieje złego: stworek jest najwyżej smutny albo głodny. Poziom to liczba zaliczonych poziomów od wyklucia (SAVE.stats.clears
// minus 'b' z chwili wyklucia). Imię i kolor z zamkniętych list (bez wolnego tekstu, więc bez moderacji). Do sieci idzie tylko krotka wyglądu [kolor, poziom, imię],
// a odbiorca przyjmuje ją przez cleanLook. Stworek tylko kosztuje Bagabucksy i nigdy ich nie daje, więc nie da się go farmić.
// ==========================================
export const PET = {
    COLORS: [
        { id: 'mint', name: 'Mint', body: '#6fdcae', belly: '#e9fff4', accent: '#2f9a72' },
        { id: 'peach', name: 'Peach', body: '#ffab8a', belly: '#fff1e6', accent: '#d9603a' },
        { id: 'sky', name: 'Sky', body: '#7fc4ff', belly: '#eef8ff', accent: '#3a7fd0' },
        { id: 'lilac', name: 'Lilac', body: '#c39bff', belly: '#f6eeff', accent: '#7a4fd0' },
        { id: 'sun', name: 'Sun', body: '#ffd95a', belly: '#fff8dd', accent: '#d99a10' },
        { id: 'gold', name: 'Golden', body: '#ffcf3d', belly: '#fff3b0', accent: '#b8860b', rare: true },
    ],
    WEIGHTS: [19, 19, 19, 19, 19, 5],   // szansa na kolor przy wykluciu (złoty 5%)
    NAMES: ['Pip', 'Mochi', 'Boo', 'Nibs', 'Waffle', 'Gus', 'Pixel', 'Bean', 'Toast', 'Fudge', 'Miso', 'Pudding', 'Biscuit', 'Noodle', 'Sprout', 'Button',
        'Ziggy', 'Cookie', 'Dumpling', 'Pebble', 'Tofu', 'Maple', 'Jelly', 'Bubbles'],
    HATCH_COST: 150, FEED_COST: 25, FEED_GAIN: 0.45, FEED_LIMIT: 6,      // karmienie: do 6 razy na dobę
    SAT_HOURS: 36, MOOD_HOURS: 60,          // po tylu godzinach sytość (humor) spada od pełnej do zera
    MOOD_FLOOR: 0.12, HUNGRY_BELOW: 0.25, FULL_ABOVE: 0.9,
    PAT_COOLDOWN: 20000, PAT_GAIN: 0.08, FEED_MOOD: 0.1,   // głaskanie raz na 20 s podnosi humor
    MAX_ELAPSED: 30 * 86400000,             // najdłuższy brany pod uwagę odstęp czasu (zmiana zegara nie zabije stworka)
    LEVELS: [0, 3, 10, 25, 50],             // ile zaliczonych poziomów od wyklucia do poziomu 1..5
    SCALE: [0.8, 0.9, 1.0, 1.1, 1.2],       // wielkość modelu na poziom
    IDLE_SIT: 8, IDLE_SLEEP: 30,            // sekundy bezruchu gracza: stworek siada, potem zasypia
    TELEPORT: 14,                           // dalej niż tyle metrów od gracza: pojawia się obok niego
    // Paczka kosmetyków (sklep, zakładki Pet hats i Pet wear): indeks 0 = brak. Identyfikatory są też w CATALOG (core/economy.js, sloty 'pethat' i 'petneck')
    HATS: ['none', 'party', 'flower', 'cowboy', 'wizard', 'crown'], NECKS: ['none', 'bow', 'bandana', 'scarf', 'bell', 'cape'],
    STAY: 3.4,                              // bliżej niż tyle metrów od gracza stworek zostaje (można go pogłaskać); dalej biegnie za nim
    REST: 2.0, SIDE: 0.5, REST_ARRIVE: 0.6, // miejsce odpoczynku: 2 m przed graczem, 0,5 rad w prawo od kierunku patrzenia (widać go na dole kadru)
};
const nCol = PET.COLORS.length, nNames = PET.NAMES.length, nLv = PET.LEVELS.length;
const num = (v) => typeof v === 'number' && Number.isFinite(v);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const dayOf = (ms) => Math.floor(ms / 86400000);
const rnd01 = (rnd) => (typeof rnd === 'function' ? rnd() : Math.random());
const intIn = (v, lo, hi, d) => (Number.isInteger(v) && v >= lo && v <= hi ? v : d);
const past = (v, now, d) => (num(v) ? clamp(v, 0, now) : d);   // znacznik czasu z przyszłości (cofnięty zegar) = teraz

// Czyści dowolny obiekt do poprawnego stworka albo null (brak stworka)
export function normalizePet(raw, now) {
    if (!raw || typeof raw !== 'object' || !num(now)) return null;
    if (!Number.isInteger(raw.c) || raw.c < 0 || raw.c >= nCol) return null;
    const fd = raw.fd && typeof raw.fd === 'object' ? raw.fd : {};
    return {
        c: raw.c, n: intIn(raw.n, 0, nNames - 1, 0),
        h: past(raw.h, now, now), b: intIn(raw.b, 0, 1e7, 0),
        s: clamp(num(raw.s) ? raw.s : 0.8, 0, 1), st: past(raw.st, now, now),
        m: clamp(num(raw.m) ? raw.m : 0.8, 0, 1), mt: past(raw.mt, now, now),
        fd: { d: intIn(fd.d, 0, 1e6, 0), n: intIn(fd.n, 0, PET.FEED_LIMIT, 0) },
        pa: past(raw.pa, now, 0),
    };
}
// Kolor przy wykluciu wg wag (złoty rzadko)
export function pickColor(rnd) {
    const sum = PET.WEIGHTS.reduce((a, b) => a + b, 0); let r = rnd01(rnd) * sum;
    for (let i = 0; i < nCol; i++) { r -= PET.WEIGHTS[i]; if (r < 0) return i; }
    return nCol - 1;
}
// Nowy stworek z jaja: 'clears' = bieżąca liczba zaliczonych poziomów (od niej liczymy wzrost)
export function hatch(now, clears, rnd) {
    return { c: pickColor(rnd), n: Math.min(nNames - 1, Math.floor(rnd01(rnd) * nNames)), h: now, b: num(clears) ? Math.max(0, Math.floor(clears)) : 0,
        s: 0.8, st: now, m: 0.8, mt: now, fd: { d: dayOf(now), n: 0 }, pa: 0 };
}
export function canHatch(pet, wallet) {
    if (pet) return { ok: false, reason: 'have', price: PET.HATCH_COST };
    if (!num(wallet) || wallet < PET.HATCH_COST) return { ok: false, reason: 'poor', price: PET.HATCH_COST };
    return { ok: true, price: PET.HATCH_COST };
}

// ---------- sytość i humor ----------
const hours = (from, now) => clamp(now - from, 0, PET.MAX_ELAPSED) / 3600000;
export const satiety = (p, now) => clamp(p.s - hours(p.st, now) / PET.SAT_HOURS, 0, 1);
const moodBase = (p, now) => Math.max(PET.MOOD_FLOOR, p.m - hours(p.mt, now) / PET.MOOD_HOURS);
// Humor 0..1 łączy zapisany humor i sytość; nigdy poniżej dołka
export const moodOf = (p, now) => Math.max(PET.MOOD_FLOOR, 0.6 * moodBase(p, now) + 0.4 * satiety(p, now));
export const moodLabel = (v) => (v >= 0.66 ? 'happy' : (v >= 0.35 ? 'content' : 'gloomy'));
export const isHungry = (p, now) => satiety(p, now) < PET.HUNGRY_BELOW;

// ---------- karmienie i głaskanie ----------
export function canFeed(p, wallet, now) {
    if (!p) return { ok: false, reason: 'nopet', price: PET.FEED_COST };
    if (satiety(p, now) > PET.FULL_ABOVE) return { ok: false, reason: 'full', price: PET.FEED_COST };
    const used = p.fd.d === dayOf(now) ? p.fd.n : 0;
    if (used >= PET.FEED_LIMIT) return { ok: false, reason: 'limit', price: PET.FEED_COST };
    if (!num(wallet) || wallet < PET.FEED_COST) return { ok: false, reason: 'poor', price: PET.FEED_COST };
    return { ok: true, price: PET.FEED_COST };
}
export function feed(p, now) {
    const used = p.fd.d === dayOf(now) ? p.fd.n : 0;
    return Object.assign({}, p, { s: Math.min(1, satiety(p, now) + PET.FEED_GAIN), st: now, m: Math.min(1, moodBase(p, now) + PET.FEED_MOOD), mt: now, fd: { d: dayOf(now), n: Math.min(PET.FEED_LIMIT, used + 1) } });
}
export const canPat = (p, now) => !!p && (now - p.pa >= PET.PAT_COOLDOWN || p.pa > now);
export const pat = (p, now) => Object.assign({}, p, { m: Math.min(1, moodBase(p, now) + PET.PAT_GAIN), mt: now, pa: now, s: satiety(p, now), st: now });
export const feedsLeft = (p, now) => (p ? PET.FEED_LIMIT - (p.fd.d === dayOf(now) ? p.fd.n : 0) : 0);
// Imię: o krok w przód albo w tył po liście (zawija się)
export const renamePet = (p, dir) => Object.assign({}, p, { n: (((p.n + (dir < 0 ? -1 : 1)) % nNames) + nNames) % nNames });

// ---------- poziom ----------
export function levelOf(p, clears) {
    const done = Math.max(0, (num(clears) ? Math.floor(clears) : 0) - p.b); let lv = 1;
    for (let i = 1; i < nLv; i++) if (done >= PET.LEVELS[i]) lv = i + 1;
    return lv;
}
// { level, frac (0..1 do następnego poziomu), left (ile poziomów do następnego), max }
export function progress(p, clears) {
    const lv = levelOf(p, clears), done = Math.max(0, (num(clears) ? Math.floor(clears) : 0) - p.b);
    if (lv >= nLv) return { level: lv, frac: 1, left: 0, max: true };
    const a = PET.LEVELS[lv - 1], b = PET.LEVELS[lv];
    return { level: lv, frac: clamp((done - a) / (b - a), 0, 1), left: b - done, max: false };
}

// ---------- wygląd w sieci ----------
// Indeks kosmetyku z listy (nieznany identyfikator = 0, brak)
export const hatIndex = (id) => Math.max(0, PET.HATS.indexOf(id));
export const neckIndex = (id) => Math.max(0, PET.NECKS.indexOf(id));
export const lookOf = (p, clears, hat, neck) => [p.c, levelOf(p, clears), p.n, hatIndex(hat), neckIndex(neck)];
// Wygląd od innego gracza [kolor, poziom, imię, czapka, szyja]: tylko liczby całkowite w zakresach, inaczej null (starsza krotka z 3 liczb = bez kosmetyków)
export function cleanLook(raw) {
    if (!Array.isArray(raw) || (raw.length !== 3 && raw.length !== 5)) return null;
    const [c, l, n] = raw, h = raw.length === 5 ? raw[3] : 0, k = raw.length === 5 ? raw[4] : 0;
    if (!Number.isInteger(c) || c < 0 || c >= nCol || !Number.isInteger(l) || l < 1 || l > nLv || !Number.isInteger(n) || n < 0 || n >= nNames) return null;
    if (!Number.isInteger(h) || h < 0 || h >= PET.HATS.length || !Number.isInteger(k) || k < 0 || k >= PET.NECKS.length) return null;
    return { c: c, l: l, n: n, h: h, k: k };
}

// ---------- zachowanie towarzysza (czyste decyzje; ruch robi core/pet.js) ----------
// Prędkość biegu do miejsca odpoczynku wg odległości do niego: tuż przy nim stoi, potem idzie, trusia, biegnie
export const followSpeed = (d) => (!(d >= 0.5) ? 0 : (d < 1.5 ? 2.0 : (d < 4 ? 3.8 : 6.5)));
// Miejsce odpoczynku przed graczem (dir = poziomy kierunek patrzenia), przycięte do sali (bounds: minX, maxX, minZ, maxZ). Bez kierunku: obok gracza
export function restSpot(px, pz, dirx, dirz, bounds) {
    let dx = num(dirx) ? dirx : 0, dz = num(dirz) ? dirz : 0; const len = Math.hypot(dx, dz);
    if (len < 1e-6) { dx = 0; dz = 1; } else { dx /= len; dz /= len; }
    const c = Math.cos(PET.SIDE), s = Math.sin(PET.SIDE), rx = dx * c - dz * s, rz = dx * s + dz * c;   // obrót o SIDE w stronę prawej ręki
    let x = px + rx * PET.REST, z = pz + rz * PET.REST;
    if (bounds) { x = clamp(x, bounds.minX + 0.6, bounds.maxX - 0.6); z = clamp(z, bounds.minZ + 0.6, bounds.maxZ - 0.6); }
    return { x: x, z: z };
}
// Czy stworek ma biec za graczem: zaczyna, gdy gracz odejdzie dalej niż STAY, kończy po dotarciu do miejsca odpoczynku (histereza: nie ucieka przed głaskaniem)
export const shouldFollow = (following, dPlayer, dRest) => (following ? !(dRest < PET.REST_ARRIVE) : dPlayer > PET.STAY);
export const shouldTeleport = (d) => !(d <= PET.TELEPORT);
// Etap spoczynku wg bezruchu gracza (s): 'idle' -> 'sit' -> 'sleep'
export const idleStage = (sec) => (sec >= PET.IDLE_SLEEP ? 'sleep' : (sec >= PET.IDLE_SIT ? 'sit' : 'idle'));
// Skala modelu na poziom
export const scaleOf = (level) => PET.SCALE[clamp((Number.isInteger(level) ? level : 1) - 1, 0, nLv - 1)];
