// ==========================================
// Głosy potworów (czysta logika, bez Web Audio): tekst zamieniany na przybliżone "mówienie szeptem" (syntezator formantów w core/voice.js). To NIE jest zrozumiała mowa,
// tylko szept z samogłosek i szumu (po angielsku brzmi jak niewyraźne słowa), dlatego fraza idzie też jako krótki napis. Fraza może zawierać nick gracza (tylko lokalnie,
// nigdy przez sieć ani do zewnętrznych usług). Frazy i głos zależą od rodziny kolorystycznej poziomu (core/artlogic.js). Nigdy w BagaBoo Games.
// ==========================================
export const VOICE = { maxEvents: 44, maxSec: 3.6, gap: [28, 55], nameChance: 0.45, maxVoices: 2, micTail: 0.35, nameMin: 2, nameMax: 12 };
export const VOWELS = { a: [730, 1090, 2440], e: [530, 1840, 2480], i: [270, 2290, 3010], o: [570, 840, 2410], u: [300, 870, 2240], y: [300, 2100, 2800] };
const FRIC = 'sfvzhxcj', NASAL = 'mn', STOP = 'bdgkpqt', LIQ = 'lrw';
const FOLD = { ą: 'a', ć: 'c', ę: 'e', ł: 'l', ń: 'n', ó: 'o', ś: 's', ź: 'z', ż: 'z' };

// Nick do wypowiedzenia: tylko litery (polskie znaki spłaszczone), 2-12 znaków, inaczej null (np. same cyfry albo emoji)
export function sanitizeName(name) {
    if (typeof name !== 'string') return null;
    const s = Array.from(name.toLowerCase()).map(ch => FOLD[ch] || ch).filter(ch => ch >= 'a' && ch <= 'z').join('').slice(0, VOICE.nameMax);
    return s.length >= VOICE.nameMin ? s : null;
}
export const PROFILES = {   // f0 (Hz, szept lekko udźwięczniony), formant (mnożnik formantów: niższy = grubszy głos), rate (głosek na sekundę), breath (0..1 udział szumu)
    clinical: { f0: 190, formant: 1.12, rate: 8, breath: 0.85 },
    crypt: { f0: 78, formant: 0.82, rate: 5.5, breath: 0.6 },
    industrial: { f0: 105, formant: 0.92, rate: 7, breath: 0.7 },
    hotel: { f0: 120, formant: 1.0, rate: 6.5, breath: 0.8 },
    dread: { f0: 96, formant: 0.88, rate: 6, breath: 0.9 },
    neutral: { f0: 130, formant: 1.0, rate: 7, breath: 0.8 },
};
export const PHRASES = {
    clinical: ['{name}... come back', 'i see you', 'dont look', 'stay with me', 'help me {name}'],
    crypt: ['{name}', 'you cannot hide', 'join us', 'we are waiting'],
    industrial: ['{name}... where are you', 'found you', 'come out', 'listen'],
    hotel: ['{name}... welcome', 'stay with us', 'dont go', 'room for you'],
    dread: ['{name}', 'behind you', 'run {name}', 'he is here'],
    neutral: ['{name}', 'hello', 'are you there'],
};
// Fraza dla rodziny: z nickiem (z szansą nameChance, gdy nick jest poprawny) albo bez; szablony z {name}, gdy nicku nie ma, są pomijane
export function pickPhrase(family, name, rnd) {
    const R = rnd || Math.random, list = PHRASES[family] || PHRASES.neutral, nm = sanitizeName(name);
    const usable = list.filter(t => nm && R() < VOICE.nameChance ? true : !t.includes('{name}'));
    const pool = usable.length ? usable : list.filter(t => !t.includes('{name}')), t = pool[Math.min(pool.length - 1, Math.floor(R() * pool.length))];
    return t.replace('{name}', nm || '').replace(/\s+/g, ' ').replace(/^\.+\s*/, '').trim();
}
export const profileFor = (family) => PROFILES[family] || PROFILES.neutral;

// Tekst -> zdarzenia: { k: 'v' samogłoska (f: 3 formanty), 'f' szum (frykatywa: freq), 'n' nosowa, 'p' zwarcie, 'g' płynna, 'z' pauza; dur w s, amp 0..1 }
// Czas głoski wynika z profile.rate, łączna długość jest ograniczona do VOICE.maxSec i VOICE.maxEvents
export function textToEvents(text, profile) {
    const pr = profile || PROFILES.neutral, base = 1 / Math.max(2, pr.rate), out = []; let total = 0;
    const push = (e) => { if (out.length >= VOICE.maxEvents || total + e.dur > VOICE.maxSec) return false; out.push(e); total += e.dur; return true; };
    const s = String(text || '').toLowerCase();
    for (let i = 0; i < s.length; i++) {
        const ch = FOLD[s[i]] || s[i];
        let ok = true;
        if (VOWELS[ch]) ok = push({ k: 'v', f: VOWELS[ch].map(x => x * pr.formant), dur: base * 1.5, amp: 0.9 });
        else if (FRIC.includes(ch)) ok = push({ k: 'f', freq: ch === 's' || ch === 'z' ? 6500 : (ch === 'h' ? 2800 : 4200), dur: base * 1.1, amp: 0.5 });
        else if (NASAL.includes(ch)) ok = push({ k: 'n', f: [260 * pr.formant, 1100 * pr.formant, 2200 * pr.formant], dur: base * 1.2, amp: 0.55 });
        else if (STOP.includes(ch)) ok = push({ k: 'p', freq: ch === 'k' || ch === 'g' || ch === 'q' ? 1800 : (ch === 't' || ch === 'd' ? 3500 : 900), dur: base * 0.5, amp: 0.6 });
        else if (LIQ.includes(ch)) ok = push({ k: 'g', f: [420 * pr.formant, 1300 * pr.formant, 2400 * pr.formant], dur: base * 1.1, amp: 0.7 });
        else if (ch === ' ') ok = push({ k: 'z', dur: base * 0.9, amp: 0 });
        else if (ch === '.') ok = push({ k: 'z', dur: base * 1.8, amp: 0 });
        if (!ok) break;
    }
    return { events: out, duration: total };
}
// Czy potwór może się teraz odezwać: nowa wypowiedź nie wcześniej niż po odstępie, nie w trakcie jumpscare'a, nie w trybie spokojnym, nie przy kilku głosach naraz
export function newVoiceState(rnd) { return { t: (rnd || Math.random)() * (VOICE.gap[1] - VOICE.gap[0]) * 0.5 + VOICE.gap[0] * 0.5, active: 0, until: 0 }; }
export function voiceTick(st, dt, near, scared, calm, rnd) {
    if (!(dt > 0)) return false;
    st.t -= dt;
    if (st.t > 0) return false;
    if (calm || scared > 0 || !(near < 14) || st.active >= VOICE.maxVoices) { st.t = 2; return false; }   // za wcześnie: spróbuj ponownie za chwilę
    st.t = VOICE.gap[0] + ((rnd || Math.random)()) * (VOICE.gap[1] - VOICE.gap[0]);
    return true;
}
// Mikrofon: w czasie mówienia (i chwilę po) poziom z mikrofonu liczy się jak cisza, żeby głos potwora z głośników nie wyglądał na głos gracza
export const micGated = (now, until) => now < until + VOICE.micTail;
