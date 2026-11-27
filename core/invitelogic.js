// ==========================================
// ZAPROSZENIA OD HOSTA (czysta logika, bez THREE, DOM i sieci). Host nie ściąga już nikogo za sobą: gdy wchodzi do poziomu, każdy gość dostaje ZAPROSZENIE
// z odliczaniem INVITE.TIMEOUT s. Przyjęcie = gość idzie do tego poziomu; odrzucenie albo brak odpowiedzi w czasie = gość zostaje tam, gdzie jest, i w tym poziomie nie gra
// (tryby liczą graczy po `lvl` ze stanu, więc nieobecny nie głosuje, nie bywa potworem i nie liczy się do końca rundy). Gracze biegają zawsze swobodnie.
// Wszystko z sieci przechodzi przez `cleanInvite`: id poziomu musi być znane, pokój szefa wchodzi tylko osobnym zaproszeniem od ekipy (`invite`), nie przez `follow`.
// 3D i klawisze: core/invite.js. Testy: tests/logic.mjs (blok "zaproszenia").
// ==========================================
export const INVITE = { TIMEOUT: 10, MAX_STEP: 0.5, MAX_SEED: 1e9 };
const fin = (n) => typeof n === 'number' && Number.isFinite(n);
// Zaproszenie od hosta: { level, seed, data } albo null (nieznany poziom, pokój szefa, śmieci). known: zbiór (lub obiekt) znanych id poziomów
export function cleanInvite(level, data, known) {
    if (typeof level !== 'string' || level.length > 40 || level === 'staff') return null;
    const ok = known instanceof Set ? known.has(level) : !!(known && Object.prototype.hasOwnProperty.call(known, level)); if (!ok) return null;
    const d = data && typeof data === 'object' ? data : {};
    const seed = fin(d.seed) && Number.isInteger(d.seed) && d.seed >= 0 && d.seed <= INVITE.MAX_SEED ? d.seed : undefined;
    return { level: level, seed: seed, data: d.data };
}
export const newInvite = (c, name) => ({ level: c.level, seed: c.seed, data: c.data, name: String(name || c.level).slice(0, 40), left: INVITE.TIMEOUT, state: 'open' });
// Krok czasu: po upływie odliczania zaproszenie wygasa (stan 'timeout' = nie gra)
export function inviteStep(inv, dt) {
    if (!inv || inv.state !== 'open') return inv;
    const d = fin(dt) ? Math.min(Math.max(dt, 0), INVITE.MAX_STEP) : 0, left = inv.left - d;
    return left <= 0 ? Object.assign({}, inv, { left: 0, state: 'timeout' }) : Object.assign({}, inv, { left: left });
}
export const answerInvite = (inv, yes) => inv && inv.state === 'open' ? Object.assign({}, inv, { state: yes ? 'accepted' : 'declined' }) : inv;
export const isOpen = (inv) => !!inv && inv.state === 'open';
export const fraction = (inv) => inv ? Math.max(0, Math.min(1, inv.left / INVITE.TIMEOUT)) : 0;
// Wynik: czy gość ma ruszyć za hostem (tylko przyjęcie)
export const shouldJoin = (inv) => !!inv && inv.state === 'accepted';
// Gość jest już w tym poziomie (z wyjątkiem poziomów z ziarnem, bo nowa runda to nowy układ)
export const alreadyThere = (levelId, target, seeded) => levelId === target && !seeded;
