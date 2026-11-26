// ==========================================
// BESTIARIUSZ (czysta logika, bez THREE): 13 potworów, odkrywanych przez grę na ich poziomach. Stan: SAVE.bestiary (core/bestiary.js).
// Potwór jest "spotkany", gdy spędzisz na jego poziomie UNLOCK_SECONDS sekund (samo wejście nie wystarcza). Komplet daje jednorazową nagrodę.
// Podpowiedzi to prawdziwe zasady z kart poziomów (core/levelcards.js), a nie ozdobniki.
// ==========================================
export const UNLOCK_SECONDS = 25;
export const REWARD = 1500;
// id, name, level (id poziomu w rejestrze), model (plik w assets/monsters), place (nazwa poziomu), hint (jak go przechytrzyć)
// Pierwsze 12 potworów to dawny komplet: zapisy graczy, którzy go mieli i odebrali nagrodę, zachowują flagę nagrody (bez drugiej wypłaty po dodaniu Policjanta)
export const LEGACY_COUNT = 12;
export const BEASTS = [
    { id: 'mannequin', name: 'The Mannequin', level: 'maze', model: 'mannequin', place: 'The Maze', hint: 'Breaks out after 15 s and speeds up from 3 to 5 m/s. A second one joins after 2 minutes.' },
    { id: 'blind', name: 'The Blind One', level: 'silence', model: 'blind', place: 'Absolute Silence', hint: 'It only hears. Stroke the floor, throw the black ball to draw it away, climb a rope above 4 m.' },
    { id: 'threadman', name: 'The Threadman', level: 'laundry', model: 'threadman', place: 'The Laundromat', hint: 'Screams and sprints when he sees you. Hide in open washer drums or climb above 3 m.' },
    { id: 'lavabeast', name: 'The Lava Beast', level: 'memory', model: 'lavabeast', place: 'Burning Memory', hint: 'Starts 8 s after your first jump and speeds up to 4 m/s. Keep moving.' },
    { id: 'patient', name: 'The Patient', level: 'hospital', model: 'patient', place: 'The Hospital', hint: 'Freezes in your flashlight. Look away and it creeps closer: keep the beam on it.' },
    { id: 'gravedigger', name: 'The Gravedigger', level: 'cemetery', model: 'gravedigger', place: 'The Cemetery', hint: 'Hears running from 9 m, sees 16 m ahead. Walk, and hide in crypts and hedges.' },
    { id: 'warden', name: 'The Warden', level: 'catacombs', model: 'warden', place: 'The Catacombs', hint: 'No light, only red eyes. Hears running from 10 m and cracking bones from 22 m.' },
    { id: 'doll', name: 'The Doll', level: 'nursery', model: 'doll', place: 'The Nursery', hint: 'Frozen while the music plays. Wind the box before it drops below 30%.' },
    { id: 'butler', name: 'The Butler', level: 'hotel', model: 'butler', place: 'The Hotel', hint: 'Hears noise and your voice. When the lights flicker, hide in a wardrobe.' },
    { id: 'furas', name: 'FURAS', level: 'furas', model: 'furas', place: 'The Fur Den', hint: 'Louder purring means closer. When he crouches and his tail quivers, sidestep the pounce.' },
    { id: 'ghost', name: 'The White Ghost', level: 'room000', model: 'ghost', place: 'Room 000', hint: 'Sees far and glows in the dark. Hears running and every item you take, and gets 6% faster for each.' },
    { id: 'digger', name: 'The Digger', level: 'mine', model: 'gravedigger', place: 'The Mine', hint: 'Sees lamp light and hears running, falling and your voice. In the dark it finds you only up close.' },
    { id: 'officer', name: 'The Officer', level: 'scarygta', model: 'officer', place: 'Scary GTA', hint: 'Cops cannot climb. Hide by dumpsters, use roofs, and beware the helicopter spotlight.' }
];
const BY_LEVEL = Object.fromEntries(BEASTS.map(b => [b.level, b.id]));
export const beastById = (id) => BEASTS.find(b => b.id === id) || null;
// Poziom z ziarnem (maze_3, maze-123) dziedziczy po bazowym
export const baseLevel = (id) => String(id || '').replace(/[_-]\d+$/, '');
export const beastForLevel = (levelId) => BY_LEVEL[baseLevel(levelId)] || null;

// Zapis: tylko znane id, każde raz; flaga nagrody. Zawsze nowy obiekt (odczyt przez tę funkcję nie ufa temu, co leży w zapisie)
export function normalizeBestiary(raw) {
    const out = { seen: {}, rewarded: false };
    if (raw && typeof raw === 'object') {
        const seen = raw.seen && typeof raw.seen === 'object' ? raw.seen : {};
        for (const b of BEASTS) if (seen[b.id] === 1 || seen[b.id] === true) out.seen[b.id] = 1;
        const legacy = BEASTS.slice(0, LEGACY_COUNT).every(b => out.seen[b.id] === 1);
        out.rewarded = raw.rewarded === true && (Object.keys(out.seen).length === BEASTS.length || legacy);
    }
    return out;
}
export const seenCount = (st) => Object.keys(st.seen).length;
export const isSeen = (st, id) => st.seen[id] === 1;
export const isComplete = (st) => seenCount(st) === BEASTS.length;
// Odkrycie potwora: zwraca nowy stan, czy to nowość i czy właśnie powstał komplet bez wypłaconej nagrody
export function unlockBeast(st, id) {
    if (!beastById(id) || isSeen(st, id)) return { state: st, isNew: false, complete: false };
    const next = { seen: Object.assign({}, st.seen, { [id]: 1 }), rewarded: st.rewarded };
    return { state: next, isNew: true, complete: isComplete(next) && !next.rewarded };
}
export const markRewarded = (st) => ({ seen: Object.assign({}, st.seen), rewarded: st.rewarded || isComplete(st) });
// Czas na poziomie: v = { level, t }. Zwraca nowy v i id potwora do odkrycia dokładnie w chwili przekroczenia progu (potem null, aż do zmiany poziomu)
export function visitStep(v, levelId, dt) {
    const lv = baseLevel(levelId), prev = v && v.level === lv ? v.t : 0, d = Number.isFinite(dt) && dt > 0 ? Math.min(dt, 1) : 0;
    const t = prev + d, id = beastForLevel(lv);
    return { v: { level: lv, t: t }, unlock: id && prev < UNLOCK_SECONDS && t >= UNLOCK_SECONDS ? id : null };
}
