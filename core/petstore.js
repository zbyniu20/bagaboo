// ==========================================
// MAGAZYN STWORKA: stan w SAVE.pet (podpisany zapis gry), wyklucie i karmienie przez spendBones (portfel nigdy nie spada poniżej zera), głaskanie i imię.
// Każdy odczyt idzie przez normalizePet (core/petlogic.js), więc ręcznie zmieniony zapis nie da cech spoza list. Stworek tylko kosztuje Bagabucksy,
// nic nie zarabia. Wygląd dla innych graczy to krotka z lookOf (network.js dokleja ją do stanu gracza, odbiorca przyjmuje ją przez cleanLook).
// ==========================================
import { SAVE, saveGame, spendBones } from './economy.js';
import { PET, normalizePet, hatch, canHatch, canFeed, feed, canPat, pat, renamePet, levelOf, progress, lookOf, satiety, moodOf, moodLabel, isHungry, feedsLeft } from './petlogic.js';

export const clearsNow = () => (SAVE.stats && SAVE.stats.clears) || 0;
export function getPet() { const p = normalizePet(SAVE.pet, Date.now()); SAVE.pet = p; return p; }
export function hatchPet() {
    const old = SAVE.pet, r = canHatch(getPet(), SAVE.wallet); if (!r.ok) return r;
    SAVE.pet = hatch(Date.now(), clearsNow(), Math.random);
    if (!spendBones(r.price, 'pet egg')) { SAVE.pet = old; return { ok: false, reason: 'poor', price: r.price }; }   // spendBones zapisuje portfel i stworka razem
    return { ok: true, price: r.price, pet: SAVE.pet };
}
export function feedPet() {
    const p = getPet(), now = Date.now(), r = canFeed(p, SAVE.wallet, now); if (!r.ok) return r;
    SAVE.pet = feed(p, now);
    if (!spendBones(r.price, 'pet food')) { SAVE.pet = p; return { ok: false, reason: 'poor', price: r.price }; }
    return { ok: true, price: r.price };
}
// Głaskanie jest darmowe; wynik { ok } albo { ok: false, reason: 'cooldown' | 'nopet' }
export function patPet() {
    const p = getPet(); if (!p) return { ok: false, reason: 'nopet' };
    const now = Date.now(); if (!canPat(p, now)) return { ok: false, reason: 'cooldown' };
    SAVE.pet = pat(p, now); saveGame(); return { ok: true };
}
export function cycleName(dir) { const p = getPet(); if (!p) return false; SAVE.pet = renamePet(p, dir); saveGame(); return true; }
// Zwięzły stan do wyświetlania (panel, plakietka): bez zapisu
export function petStatus() {
    const p = getPet(); if (!p) return null;
    const now = Date.now(), clears = clearsNow(), mood = moodOf(p, now);
    return { pet: p, name: PET.NAMES[p.n], color: PET.COLORS[p.c], level: levelOf(p, clears), progress: progress(p, clears), satiety: satiety(p, now), mood: mood, moodLabel: moodLabel(mood),
        hungry: isHungry(p, now), feeds: feedsLeft(p, now), feed: canFeed(p, SAVE.wallet, now), pat: canPat(p, now) };
}
export function petLookNet() { const p = getPet(); return p ? lookOf(p, clearsNow()) : null; }
