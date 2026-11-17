// ==========================================
// LOGIKA TRYBU GENERATOR (czyste funkcje, bez Three.js, DOM i sieci): stałe, naprawa, uwalnianie z klatek, słyszenie potwora,
// łapanie, prędkość potwora i warunki końca rundy. levels/generator.js tylko zbiera dane z gry (pozycje głów, czas) i woła te funkcje,
// dzięki czemu cała logika rundy jest testowana w czystym Node (tests/modes/generator.mjs).
// Plik nie ma importów, więc działa i w przeglądarce, i w Node.
// ==========================================
export const A = 20;                                   // hala 40 x 40 m, drzwi GAMES na południu, brama ucieczki na północy
export const GENS = [[-12, 7], [12, 3], [-11, -8], [12, -11]];   // generatory (x, z); te same współrzędne ma pętla 'hum' w registry.js
export const GATE_Z = -A + 3.5;                        // za tą linią jest strefa ucieczki
export const TIMES = { WAIT: 12, SOLO_WAIT: 4, ROUND: 240, RESULTS: 8, GRACE: 6 };
export const REWARD = 200;
export const REPAIR = { SEC: 14, R: 2.3, MAX_HELPERS: 3 };       // naprawa: sekundy dla jednej osoby, zasięg (m), ile osób przyspiesza
export const RESCUE = { SEC: 2.5, R: 1.7, DECAY: 0.5 };         // uwalnianie z klatki: sekundy, zasięg, tempo opadania paska bez pomocy
export const MON = { patrol: 2.2, hunt: 4.0, boost: 0.35, see: 5, hearBase: 3, hearMax: 28, lose: 5, catchR: 1.0, stun: 3.5, immune: 3 };
export const MIC = { QUIET: 0.04, LOUD: 0.24 };      // głośność mikrofonu: szept / krzyk (jak w Absolute Silence)
export const NOISE = { REPAIR: 0.35, DECAY_SEC: 0.8, MOVE_MIN: 2, MOVE_RANGE: 8, MOVE_MAX: 0.7 };

const clamp01 = (v) => Math.max(0, Math.min(1, v));

// ---------- hałas gracza (0..1) ----------
// Mikrofon: poniżej progu ciszy 0, powyżej rośnie liniowo do 1 przy krzyku
export function micNoise(mic) { return mic > MIC.QUIET ? clamp01((mic - MIC.QUIET) / (MIC.LOUD - MIC.QUIET)) : 0; }
// Ruch: wolniej niż 2 m/s to cisza, szybciej rośnie do 0,7
export function moveNoise(speedXZ) { return speedXZ > NOISE.MOVE_MIN ? Math.min(NOISE.MOVE_MAX, (speedXZ - NOISE.MOVE_MIN) / NOISE.MOVE_RANGE) : 0; }
// Hałas zgłoszony w chwili t, słyszalny jeszcze krótko (gaśnie liniowo do zera w DECAY_SEC)
export function noiseAt(entry, now) { return entry ? entry.v * Math.max(0, 1 - (now - entry.t) / NOISE.DECAY_SEC) : 0; }

// ---------- generatory i brama ----------
export const gateOpen = (gen) => gen.length > 0 && gen.every(v => v >= 1);
export const doneCount = (gen) => gen.filter(v => v >= 1).length;
// Postęp naprawy po dt sekundach: im więcej osób obok (do MAX_HELPERS), tym szybciej; nigdy powyżej 1
export function repairStep(progress, helpers, dt) {
    if (progress >= 1 || helpers <= 0) return progress;
    return Math.min(1, progress + dt / REPAIR.SEC * Math.min(helpers, REPAIR.MAX_HELPERS));
}
// Ilu graczy (pozycje głów {x, y, z}) jest w zasięgu generatora; głowa powyżej 4 m (np. na regale) nie naprawia
export function helpersAt(gen, heads) { return heads.filter(h => h && Math.hypot(h.x - gen[0], h.z - gen[1]) < REPAIR.R && h.y < 4).length; }

// ---------- klatki ----------
// Pasek uwalniania: z pomocą rośnie, bez niej opada. Zwraca nowy postęp i czy gracz jest wolny
export function rescueStep(p, helpers, dt) {
    const next = helpers > 0 ? p + dt / RESCUE.SEC : Math.max(0, p - dt * RESCUE.DECAY);
    return { p: next, freed: next >= 1 };
}
export function helpersAtCage(cage, heads) { return heads.filter(h => h && Math.hypot(h.x - cage.x, h.z - cage.z) < RESCUE.R).length; }

// ---------- potwór ----------
export const hearRadius = (noise) => MON.hearBase + MON.hearMax * noise;
// Wybiera najbliższego gracza, którego potwór słyszy (promień zależny od hałasu) albo widzi z bliska. players: {id, x, y, z, noise, immune}
export function pickTarget(bot, players) {
    let best = null, bd = Infinity;
    for (const p of players) {
        if (p.immune) continue;
        const d = Math.hypot(p.x - bot.x, p.z - bot.z);
        if ((d < hearRadius(p.noise) || d < MON.see) && d < bd) { bd = d; best = p; }
    }
    return best;
}
// Czy potwór łapie gracza: blisko w poziomie i głowa na wysokości jego zasięgu
export const canCatch = (bot, head) => Math.hypot(head.x - bot.x, head.z - bot.z) < MON.catchR && Math.abs(head.y - (bot.y + 1.4)) < 1.6;
// Prędkość: w pościgu rośnie z liczbą naprawionych generatorów, w patrolu o połowę mniej
export const monsterSpeed = (mode, done) => mode === 'hunt' ? MON.hunt + MON.boost * done : MON.patrol + MON.boost * done * 0.5;

// ---------- koniec rundy i wynik ----------
export const roundOver = (ids, caged, escaped, timeLeft) => timeLeft <= 0 || (ids.length > 0 && ids.every(id => caged.has(id) || escaped.has(id)));
export function outcomeOf(id, caged, escaped) { return escaped.has(id) ? 'escaped' : (caged.has(id) ? 'caged' : 'timeout'); }
export const rewardFor = (outcome) => outcome === 'escaped' ? REWARD : 0;
