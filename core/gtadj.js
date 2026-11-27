// ==========================================
// SCARY GTA: RADIO MIEJSKIE Z DJ-em I ESKALACJA NOCY (czysta logika, bez THREE).
//  - DJ Hollow ("Radio Hollow", jak stacje radiowe z GTA) co 50-95 s rzuca upiorną uwagę zależną od tego, co się dzieje w mieście (blackout, horda, burza, gwiazdki, trwająca sprawa detektywa).
//    Idzie tą samą kolejką napisów i tym samym syntezatorem co radio policyjne (core/radiologic.js), ale z NIŻSZYM priorytetem: gdy policja ma coś do powiedzenia albo na ekranie jest już napis, DJ czeka.
//    Frazy to krótki zwykły tekst ASCII (formantowy syntezator mówi niewyraźnym szeptem, więc napis jest zawsze), {name} to nick z lokalnego zapisu (tylko litery, nigdy przez sieć).
//  - Eskalacja: przy 4 i 5 gwiazdkach mgła gęstnieje (mnożnik 1,2 i 1,4) bardzo wolno (najwyżej 0,06 na sekundę, bez migotania), a w blackoucie jest lekko gęstsza (1,15). Mnożnik składa się z pogodą
//    przez mnożenie w JEDNYM miejscu (levels/scarygta.js), a reset jest w dispose.
// Testy: tests/logic.mjs (blok "radio DJ"), w przeglądarce tests/gtalife.mjs.
// ==========================================
const fin = (n) => typeof n === 'number' && Number.isFinite(n);
const dtOf = (dt) => Math.min(Math.max(+dt || 0, 0), 0.5);

export const DJ = { FIRST: 25, GAP: [50, 95], RECENT: 3, SHOW: 6, MAX_LEN: 96 };
export const STATION = 'RADIO HOLLOW';
export const POOLS = {
    calm: [
        'This is Radio Hollow. The city never sleeps. The city just stops blinking.',
        'Traffic is light tonight. Nobody is driving. Nobody is ever driving.',
        'Hey {name}, this next one is for the listener who is not alone in the car.',
        'Weather: dark, with a chance of dark. Back after the static.',
        'If you can hear me, the signal is fine. If you can see me, call a doctor.'
    ],
    blackout: [
        'Lights out, folks. Whatever you do, keep your eyes on the street.',
        'Power cut downtown. Do not look at the crowd. They like being looked at.',
        'Stay where you are, {name}. The pavement is listening.',
        'Blackout special. The people outside are not out of power. They are out of patience.'
    ],
    horde: [
        'Midnight request line: the dead cops asked for a song. We will not play it.',
        'The sidewalks are empty tonight. Nobody explains why. Nobody asks.',
        'Dead air, live audience. Keep moving, {name}.'
    ],
    storm: [
        'Storm warning. Rain on the roof, sweetheart. Nobody is on the roof.',
        'Thunder is just the sky clearing its throat. Next up, something loud.',
        'The harbour lights are blinking again. Do not blink back.'
    ],
    stars: [
        'Heat on the streets. Smile {name}, you are on camera. Every camera.',
        'Sirens are the city singing. You are the chorus.',
        'Four stars, five stars, who is counting. The sky is counting.'
    ],
    caseOn: [
        'Unit nine, if you are listening: the dead air is not empty.',
        'A reminder from Radio Hollow: some phone booths still pick up.'
    ]
};
export const allLines = () => Object.values(POOLS).flat();

export const newDj = (R) => ({ t: DJ.FIRST * (0.8 + (R || Math.random)() * 0.4), recent: [] });
const poolFor = (o) => o.night === 'horde' ? 'horde' : o.night === 'blackout' ? 'blackout' : (o.stars >= 3 ? 'stars' : (o.storm ? 'storm' : (o.caseOn && (o.R ? o.R() : Math.random()) < 0.4 ? 'caseOn' : 'calm')));
// o: { night, storm, stars, caseOn, busy (radio policyjne albo napis na ekranie), nick }; zwraca { st, line } (line = gotowy tekst albo null)
export function djStep(st, dt, o, R) {
    const rnd = R || Math.random, s = { t: st.t, recent: st.recent.slice() }, d = dtOf(dt);
    if (o.busy) return { st: s, line: null };   // policja i napisy mają pierwszeństwo: DJ czeka (licznik stoi, więc odstęp między liniami się nie skraca)
    s.t -= d; if (s.t > 0) return { st: s, line: null };
    const pool = POOLS[poolFor(Object.assign({}, o, { R: rnd }))] || POOLS.calm, fresh = pool.filter(l => !s.recent.includes(l)), cand = fresh.length ? fresh : pool;
    const pick = cand[Math.floor(rnd() * cand.length) % cand.length];
    s.recent.push(pick); while (s.recent.length > DJ.RECENT) s.recent.shift();
    s.t = DJ.GAP[0] + rnd() * (DJ.GAP[1] - DJ.GAP[0]);
    return { st: s, line: pick.replace('{name}', o.nick || 'friend') };
}

// ----- eskalacja mgły -----
export const ESC = { FOG4: 1.2, FOG5: 1.4, FOG_BLACKOUT: 1.15, RATE: 0.06 };
export function escalationTarget(stars, night) {
    const s = fin(stars) ? stars : 0;
    let fog = s >= 5 ? ESC.FOG5 : (s >= 4 ? ESC.FOG4 : 1);
    if (night === 'blackout') fog = Math.max(fog, ESC.FOG_BLACKOUT);
    return fog;
}
// Płynne dojście do celu: najwyżej RATE na sekundę (bez migotania)
export function escalationStep(cur, target, dt) {
    const d = dtOf(dt), c = fin(cur) ? cur : 1, t = fin(target) ? target : 1, step = ESC.RATE * d;
    return c < t ? Math.min(t, c + step) : Math.max(t, c - step);
}
export function djProblems() {
    const bad = [], lines = allLines();
    if (new Set(lines).size !== lines.length) bad.push('DJ lines repeat');
    for (const l of lines) { if (l.length > DJ.MAX_LEN) bad.push('DJ line too long: ' + l.slice(0, 30)); if (!/^[A-Za-z0-9 ,.'!?:{}-]+$/.test(l)) bad.push('DJ line has odd characters: ' + l.slice(0, 30)); if (/\d{2,}/.test(l)) bad.push('DJ line has a number'); }
    for (const k of Object.keys(POOLS)) if (POOLS[k].length < 2) bad.push('pool ' + k + ' is too small to avoid repeats');
    return bad;
}
