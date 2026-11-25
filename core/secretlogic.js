// ==========================================
// SEKRETY W LOBBY (czysta logika, bez THREE): siedem złotych czaszek ukrytych w lobby. Dotknij dłonią, żeby ją znaleźć. Stan: SAVE.secrets (core/secrets.js).
// Każda daje trochę Bagabucksów, a progi 3, 5 i 7 czaszek dodatkowe nagrody (każda wypłacana raz). Znalezienie wszystkich odsłania wskazówkę do drzwi LAB.
// ==========================================
export const SECRET_BONES = 40;
export const MILESTONES = { 3: 100, 5: 150, 7: 400 };
// id, name, where (wskazówka dla gracza, bez współrzędnych), pos (x, y, z w lobby)
export const SECRETS = [
    { id: 'plush', name: 'Behind the shop', hint: 'Something small glints in the gap between a machine and the wall.', pos: [-14.8, 0.25, -2.55] },
    { id: 'stairs', name: 'Top of the stairs', hint: 'Climb the spiral to the very top.', pos: [-7.8, 15.85, -6.4] },
    { id: 'beam', name: 'On the bar', hint: 'The high crossbar between the two steel posts.', pos: [8, 12.45, 6.5] },
    { id: 'crates', name: 'Behind the crates', hint: 'Crates stand in the north-east corner. Look behind them.', pos: [14.65, 0.2, -12.3] },
    { id: 'barrels', name: 'Behind the barrels', hint: 'The south-east corner hides what the barrels guard.', pos: [14.55, 0.15, 14.5] },
    { id: 'rope', name: 'High on the rope', hint: 'A hanging rope of guts goes all the way up. Climb it.', pos: [4.3, 17.5, -4] },
    { id: 'nest', name: 'Behind the nest', hint: 'Behind the creature nest, close to the north wall.', pos: [1.9, 0.2, -14.7] }
];
export const secretById = (id) => SECRETS.find(s => s.id === id) || null;
export function normalizeSecrets(raw) {
    const out = { found: [], paid: [] };
    if (raw && typeof raw === 'object') {
        for (const id of Array.isArray(raw.found) ? raw.found : []) if (secretById(id) && !out.found.includes(id)) out.found.push(id);
        for (const m of Array.isArray(raw.paid) ? raw.paid : []) if (MILESTONES[m] && out.found.length >= m && !out.paid.includes(m)) out.paid.push(m);
    }
    return out;
}
export const foundCount = (st) => st.found.length;
export const isFound = (st, id) => st.found.includes(id);
export const allFound = (st) => st.found.length === SECRETS.length;
// Znalezienie: nowy stan, Bagabucksy do wypłaty (czaszka + ewentualny próg) i czy to była ostatnia czaszka
export function findSecret(st, id) {
    if (!secretById(id) || isFound(st, id)) return { state: st, isNew: false, bones: 0, milestone: 0, all: false };
    const found = st.found.concat([id]), next = { found: found, paid: st.paid.slice() };
    let bones = SECRET_BONES, milestone = 0;
    if (MILESTONES[found.length] && !next.paid.includes(found.length)) { milestone = found.length; bones += MILESTONES[found.length]; next.paid.push(found.length); }
    return { state: next, isNew: true, bones: bones, milestone: milestone, all: allFound(next) };
}
export const FINAL_HINT = 'A door on the level list is not on the list. Knock on it. Do not knock twice.';
