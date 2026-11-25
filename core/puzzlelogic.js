// ==========================================
// GŁĘBOKIE SEKRETY (czysta logika, bez THREE): zagadki aneksu i lobby dla naprawdę szukających. Stan: SAVE.deep { found, vault } (core/deep.js, zawsze przez normalizeDeep).
// 12 sekretów (DEEP): słowa na stole ouija, melodia na organach, pokój w ścianie, czaszka nad tyrolką, złoty duch, czaszka nad dzwonem, trzynasta witryna,
// sejf z kodem dnia, pętla tunelu, piątek trzynastego, strach stworka i wnętrze mysiej norki. Każdy płaci raz (DEEP_BONES), komplet dodatkowo DEEP_ALL.
// Każdy ma podpowiedź i jej źródło (source), a test pilnuje, że źródło istnieje. Wszystko lokalne, nic nie idzie przez sieć.
// ==========================================
export const DEEP_BONES = 50, DEEP_ALL = 500;
export const DEEP = [
    { id: 'words', name: 'Spoken word', hint: 'The board answers to a name. Spell it yourself, or ask for it.', source: 'radio' },
    { id: 'melody', name: 'Six keys', hint: 'The radio hums the numbers of the keys. Play them in order.', source: 'radio' },
    { id: 'room', name: 'Room in the wall', hint: 'Something moves in the far wall once the melody is right.', source: 'organ' },
    { id: 'zipskull', name: 'Silver skull on the rope', hint: 'Raise a hand in the middle of the ride.', source: 'zipline' },
    { id: 'gold', name: 'Golden ghost', hint: 'Be quick: three hits within three seconds wake a rarer ghost.', source: 'gallery' },
    { id: 'ceil', name: 'Above the bell', hint: 'The bell is not the top. Look at the dark holds above it.', source: 'climb' },
    { id: 'you', name: 'The thirteenth case', hint: 'When every monster is known, a last case opens.', source: 'bestiary' },
    { id: 'vault', name: 'Daily vault', hint: 'The code changes every day. Someone reads it out on the radio.', source: 'radio' },
    { id: 'tunnel', name: 'The longer tunnel', hint: 'Walk the tunnel there and back, again and again.', source: 'tunnel' },
    { id: 'friday', name: 'Unlucky chest', hint: 'On Friday the 13th the night chest is different.', source: 'chest' },
    { id: 'pet', name: 'Frightened pet', hint: 'Your pet does not like the spirit board when it answers.', source: 'ouija' },
    { id: 'mouse', name: 'Tiny room', hint: 'Open the mouse door and look inside, very close.', source: 'mouse' }
];
export const SOURCES = ['radio', 'organ', 'zipline', 'gallery', 'climb', 'bestiary', 'tunnel', 'chest', 'ouija', 'mouse'];
export const deepById = (id) => DEEP.find(d => d.id === id) || null;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
export function normalizeDeep(raw) {
    const out = { found: [], vault: '', open: false };
    if (raw && typeof raw === 'object') {
        if (Array.isArray(raw.found)) for (const id of raw.found) if (deepById(id) && !out.found.includes(id)) out.found.push(id);
        if (DATE.test(String(raw.vault))) out.vault = raw.vault;
        out.open = raw.open === true;   // panel pokoju w ścianie już otwarty (melodia rozwiązana)
    }
    return out;
}
export const deepFound = (st, id) => st.found.includes(id);
export const deepCount = (st) => st.found.length;
export function findDeep(st, id) {
    if (!deepById(id) || deepFound(st, id)) return { isNew: false, state: st, bones: 0, all: false };
    const next = Object.assign({}, st, { found: st.found.concat(id) }), all = next.found.length >= DEEP.length;
    return { isNew: true, state: next, bones: DEEP_BONES + (all ? DEEP_ALL : 0), all: all };
}
// --- Słowa na stole ouija: tekst kończący się tajnym słowem (spacje pomijane; dopisane przez ducha też się liczą) ---
export const WORDS = ['LEGION', 'BAGABOO'];
export function wordHit(text) { const t = String(text).replace(/ /g, ''); for (const w of WORDS) if (t.endsWith(w)) return w; return ''; }
// --- Melodia na organach: numery klawiszy 1..8 (klawisze mają numery) ---
export const MELODY = [3, 5, 4, 7, 2, 6], MELODY_GAP = 12;
export const newMelody = () => ({ seq: [], last: -1e9 });
export function melodyStep(st, key, now) {
    const seq = (now - st.last > MELODY_GAP ? [] : st.seq.slice()); seq.push(key + 1); while (seq.length > MELODY.length) seq.shift();
    return { st: { seq: seq, last: now }, solved: seq.length === MELODY.length && seq.every((v, i) => v === MELODY[i]) };
}
// --- Kod dnia (4 cyfry, z daty UTC) i piątek trzynastego ---
export function dailyCode(iso) {
    if (!DATE.test(String(iso))) return '0000';
    let h = 2166136261; for (let i = 0; i < iso.length; i++) { h ^= iso.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
    return String(h % 10000).padStart(4, '0');
}
export function isFriday13(iso) { if (!DATE.test(String(iso))) return false; const d = new Date(iso + 'T00:00:00Z'); return !Number.isNaN(d.getTime()) && d.getUTCDay() === 5 && d.getUTCDate() === 13; }
// Sejf: zwraca 'done' (dziś już otwarty), 'ok' (dobry kod) albo 'bad'
export function vaultCheck(deep, typed, today) { if (deep.vault === today) return 'done'; return String(typed) === dailyCode(today) ? 'ok' : 'bad'; }
export const VAULT = { BONES: 200, TRIES: 3, LOCK: 20 };
export const newLock = () => ({ bad: 0, until: 0 });
export function lockStep(lock, result, now) {
    const s = { bad: lock.bad, until: lock.until };
    if (now < s.until) return { lock: s, locked: true };
    if (result === 'bad') { s.bad++; if (s.bad >= VAULT.TRIES) { s.bad = 0; s.until = now + VAULT.LOCK; return { lock: s, locked: true }; } } else if (result === 'ok') s.bad = 0;
    return { lock: s, locked: false };
}
// --- Pętla tunelu: przejścia tam i z powrotem ---
export const TUNNEL_LOOP = { HALL_Z: 15.5, ANNEX_Z: 19.5, RESET: 90, STAGE3: 3, STAGE4: 4 };
export const newTunnel = () => ({ side: '', crosses: 0, last: -1e9 });
export function tunnelStep(st, z, now) {
    const side = z < TUNNEL_LOOP.HALL_Z ? 'hall' : (z > TUNNEL_LOOP.ANNEX_Z ? 'annex' : st.side), s = { side: st.side, crosses: st.crosses, last: st.last };
    if (!st.side) { s.side = side; return { st: s, event: '' }; }
    if (now - s.last > TUNNEL_LOOP.RESET && s.crosses > 0) s.crosses = 0;
    if (side !== st.side) { s.side = side; s.crosses++; s.last = now; if (s.crosses === TUNNEL_LOOP.STAGE3) return { st: s, event: 'stage3' }; if (s.crosses === TUNNEL_LOOP.STAGE4) return { st: s, event: 'stage4' }; }
    return { st: s, event: '' };
}
// --- Złoty duch: 3 trafienia w 3 s ---
export const COMBO = { HITS: 3, WINDOW: 3 };
export function comboStep(times, now) {
    const t = times.filter(x => now - x <= COMBO.WINDOW).concat(now);
    if (t.length >= COMBO.HITS) return { times: [], fired: true };
    return { times: t, fired: false };
}
// --- Radio: częstotliwości, stacje i treść transmisji ---
export const RADIO = { MIN: 87.5, MAX: 108, TOL: 0.45 };
export const STATIONS = [{ f: 87.7, id: 'static' }, { f: 91.5, id: 'numbers' }, { f: 99.9, id: 'board' }, { f: 104.3, id: 'melody' }];
export const freqFromAngle = (deg) => RADIO.MIN + (Math.max(0, Math.min(270, deg)) / 270) * (RADIO.MAX - RADIO.MIN);
export function stationAt(f) { let best = null, bd = RADIO.TOL; for (const s of STATIONS) { const d = Math.abs(s.f - f); if (d < bd) { bd = d; best = s; } } return best; }
const WORD = ['ZERO', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE'];
export function transmission(id, today) {
    if (id === 'numbers') return ['...attention...'].concat(dailyCode(today).split('').map(d => WORD[+d]), ['...repeating...']);
    if (id === 'melody') return MELODY.map(k => WORD[k]);
    if (id === 'board') return ['ASK', 'THE', 'BOARD', 'ITS', 'NAME'];
    if (id === 'static') return ['...do not', 'turn around...'];
    return [];
}
