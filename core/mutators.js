// ==========================================
// Zmienność wizyt w poziomach: NASTRÓJ (losowy przy każdym wejściu, tylko atmosfera) i MUTATOR (wybierany świadomie w terminalu, zmienia zasady).
// Nastrój zmienia wyłącznie częstość zdarzeń atmosferycznych (migotanie, ciemność, szepty) i szeptów reżysera grozy; nic poza tym, więc rekordy i nagrody zostają.
// Mutator (ciemniej i gęstsza mgła; "niespokojny" świat: częstsze zdarzenia, lepszy słuch potworów, częstsze szepty i warczenie) zmienia zasady, więc bieg z mutatorem
// NIE daje nagród, rekordów ani postępu (levelReward i recordTime w economy.js wychodzą od razu) i jest wyłączony w trybie dziennym (wspólny układ dla wszystkich).
// Stan jest lokalny i tylko na sesję (wybór nie zapisuje się); poziomy liczą potwory lokalnie u każdego klienta, więc nic nie idzie przez sieć.
// Czysta logika + mały stan modułu (bez THREE i DOM).
// ==========================================
export const MUTATORS = {
    off: null,
    dark: { id: 'dark', name: 'Pitch black', color: '#7a7aff', hemi: 0.6, fog: 1.25, info: 'Darker rooms, thicker fog.' },
    loud: { id: 'loud', name: 'Restless', color: '#ff8a4a', events: 2.2, hear: 1.5, whisper: 1.7, info: 'More events and whispers, sharper ears.' },
};
export const MUT_ORDER = ['off', 'dark', 'loud'];
export const MUT_LEVELS = ['hospital', 'cemetery', 'catacombs', 'nursery', 'laundry', 'hotel', 'furas', 'room000'];   // poziomy z potworami, bez dziennych (maze, well, memory) i bez Ciszy (mikrofon)
export const MOODS = {
    calm: { id: 'calm', name: 'quiet', events: 0.55, whisper: 0.7 },
    even: { id: 'even', name: null },
    uneasy: { id: 'uneasy', name: 'uneasy', events: 1.4, whisper: 1.8 },
    restless: { id: 'restless', name: 'restless', events: 1.8, whisper: 1.3 },
};
/** @type {[string, number][]} */
const MOOD_W = [['calm', 0.2], ['even', 0.4], ['uneasy', 0.2], ['restless', 0.2]];
export function rollMood(rnd) {
    let r = (rnd || Math.random)(); for (const [id, w] of MOOD_W) { r -= w; if (r <= 0) return MOODS[id]; }
    return MOODS.even;
}
export const mutatorAllowed = (level, dailyOn) => MUT_LEVELS.includes(String(level)) && !dailyOn;
export function nextMutator(id) { const i = Math.max(0, MUT_ORDER.indexOf(id)); return MUT_ORDER[(i + 1) % MUT_ORDER.length]; }   // nieznane id traktowane jak off

const choice = {}, ACTIVE = { level: null, mut: null, mood: MOODS.even };
export function mutatorChoice(level) { return MUTATORS[choice[level]] ? choice[level] : 'off'; }
export function setMutatorChoice(level, id) { if (MUTATORS[id] !== undefined && MUT_LEVELS.includes(String(level))) choice[level] = id; }
// Początek wizyty (main.js, PRZED budową poziomu): wybiera mutator (jeśli wolno) i nastrój. daily = czy włączony tryb dzienny dla tego poziomu
export function beginRun(level, daily, rnd) {
    const id = mutatorAllowed(level, daily) ? mutatorChoice(level) : 'off';
    ACTIVE.level = level; ACTIVE.mut = MUTATORS[id] || null;
    ACTIVE.mood = ACTIVE.mut || daily || !MUT_LEVELS.includes(String(level)) ? MOODS.even : rollMood(rnd);   // mutator i tryb dzienny nie dostają nastroju
    return { mutator: ACTIVE.mut, mood: ACTIVE.mood };
}
export const mutatorActive = () => !!ACTIVE.mut;
export const activeMutator = () => ACTIVE.mut;
export const activeMood = () => ACTIVE.mood;
// Mnożnik (1 = bez zmian) z mutatora i nastroju: 'events' | 'whisper' | 'hear' | 'hemi' | 'fog'
export function mutFactor(name) {
    const m = ACTIVE.mut && ACTIVE.mut[name], d = ACTIVE.mood && ACTIVE.mood[name];
    return (Number.isFinite(m) ? m : 1) * (Number.isFinite(d) ? d : 1);
}
export function endRun() { ACTIVE.level = null; ACTIVE.mut = null; ACTIVE.mood = MOODS.even; }
