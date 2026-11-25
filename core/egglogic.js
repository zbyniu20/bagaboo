// ==========================================
// EASTER EGGI W LOBBY (czysta logika, bez THREE): lista ukrytych jajek, zapis i detektory zachowań gracza.
// Stan: SAVE.eggs { found: [id], paid: [id] } (core/eggs.js, zawsze przez normalizeEggs). Wszystko lokalne, nic nie idzie przez sieć.
// Detektory są funkcjami krokowymi bez własnego czasu: dt albo now podaje wywołujący, więc testy są deterministyczne.
// ==========================================
export const EGG_BONES = 25, ALL_BONUS = 300;
// pos to miejsce obiektu w lobby (x, y, z); jajka bez obiektu (gwiazdy, krzyk, lustro) mają pos null
export const EGGS = [
    { id: 'duck', name: 'Rubber duck', hint: 'Something yellow is watching from the crates.', pos: [-12.2, 2.3, 13.0] },
    { id: 'knock', name: 'Chalk door', hint: 'A door drawn in chalk. Politeness costs nothing.', pos: [-10.5, 1.3, -14.9] },
    { id: 'stars', name: 'Stargazer', hint: 'Look up for a while. The sky is not empty.', pos: null },
    { id: 'mirror', name: 'Mirror stare', hint: 'Do not look away from yourself.', pos: null },
    { id: 'hand', name: 'Dead hand', hint: 'Someone is still reaching out from under the crates.', pos: [13.0, 0.12, -10.6] },
    { id: 'mouse', name: 'Mouse door', hint: 'Tiny door, tiny knocker. Mind your fingers.', pos: [-14.96, 0.16, -8.5] },
    { id: 'shout', name: 'Shout', hint: 'The walls want to hear you scream.', pos: null }
];
export const eggById = (id) => EGGS.find(e => e.id === id) || null;
export const isEgg = (id) => EGGS.some(e => e.id === id);

export function normalizeEggs(raw) {
    const out = { found: [], paid: [] };
    if (raw && typeof raw === 'object') {
        for (const k of ['found', 'paid']) if (Array.isArray(raw[k])) for (const id of raw[k]) if (isEgg(id) && !out[k].includes(id)) out[k].push(id);
        out.paid = out.paid.filter(id => out.found.includes(id));
    }
    return out;
}
export const isFound = (st, id) => st.found.includes(id);
export const foundCount = (st) => st.found.length;
export const allFound = (st) => st.found.length >= EGGS.length;
// Znalezienie jajka: nowy stan, nagroda (raz na jajko) i bonus za komplet (raz); nieznane id albo drugi raz = isNew false
export function findEgg(st, id) {
    if (!isEgg(id) || isFound(st, id)) return { isNew: false, state: st, bones: 0, all: false };
    const next = { found: st.found.concat(id), paid: st.paid.concat(id) };
    const all = allFound(next);
    return { isNew: true, state: next, bones: EGG_BONES + (all ? ALL_BONUS : 0), all: all };
}

// --- Detektory (stan jest zwykłym obiektem; zwracają true w klatce, w której jajko się odpala) ---
export const newDetector = () => ({ t: 0, n: 0, last: -1e9, was: false, done: false });
export const GAZE = { UP: 0.92, SECONDS: 6 }, STILL = { SECONDS: 8, SPEED: 0.15, NEAR: 2.4, FACING: 0.8 }, KNOCK = { COUNT: 3, WINDOW: 1.4 }, SHOUT = { LEVEL: 0.25, SECONDS: 0.3 };

// Patrzenie prosto w górę: dirY to składowa pionowa kierunku wzroku (1 = do góry)
export function gazeStep(st, dirY, dt) {
    if (st.done) return false;
    st.t = dirY > GAZE.UP ? st.t + Math.min(dt, 0.5) : 0;
    if (st.t >= GAZE.SECONDS) { st.done = true; return true; }
    return false;
}
// Stanie nieruchomo blisko lustra, twarzą do niego: speed w m/s, facing = iloczyn skalarny kierunku wzroku i kierunku do lustra, near = odległość w m
export function stillStep(st, speed, facing, near, dt) {
    if (st.done) return false;
    st.t = (speed < STILL.SPEED && facing > STILL.FACING && near < STILL.NEAR) ? st.t + Math.min(dt, 0.5) : 0;
    if (st.t >= STILL.SECONDS) { st.done = true; return true; }
    return false;
}
// Pukanie: touching to czy dłoń dotyka teraz; liczy się zbocze narastające, a seria musi zmieścić się w oknie od pierwszego stuknięcia
export function knockStep(st, touching, now) {
    if (st.done) return false;
    const rise = touching && !st.was; st.was = touching;
    if (!rise) return false;
    if (now - st.last > KNOCK.WINDOW) st.n = 0;
    if (st.n === 0) st.first = now;
    else if (now - st.first > KNOCK.WINDOW * (KNOCK.COUNT - 1)) { st.n = 0; st.first = now; }
    st.n++; st.last = now;
    if (st.n >= KNOCK.COUNT) { st.done = true; return true; }
    return false;
}
// Krzyk do mikrofonu: level 0..1 (już po bramce głosu potworów), musi trwać SHOUT.SECONDS
export function shoutStep(st, level, dt) {
    if (st.done) return false;
    st.t = level > SHOUT.LEVEL ? st.t + Math.min(dt, 0.5) : Math.max(0, st.t - dt);
    if (st.t >= SHOUT.SECONDS) { st.done = true; return true; }
    return false;
}
// Dłoń blisko punktu (m)
export const nearPoint = (hand, p, r) => !!hand && Math.hypot(hand[0] - p[0], hand[1] - p[1], hand[2] - p[2]) < r;
