// ==========================================
// MAGAZYN STWORKA: stan w SAVE.pet (podpisany zapis gry), wyklucie i karmienie przez spendBones (portfel nigdy nie spada poniżej zera), głaskanie i imię.
// Każdy odczyt idzie przez normalizePet (core/petlogic.js), więc ręcznie zmieniony zapis nie da cech spoza list. Stworek tylko kosztuje Bagabucksy,
// nic nie zarabia. Wygląd dla innych graczy to krotka z lookOf (network.js dokleja ją do stanu gracza, odbiorca przyjmuje ją przez cleanLook).
// ==========================================
import { SAVE, saveGame, spendBones, CATALOG, isOwned, equipItem } from './economy.js';
import { PET, normalizePet, hatch, canHatch, canFeed, feed, canPat, pat, renamePet, cycleColor, levelOf, progress, lookOf, satiety, moodOf, moodLabel, isHungry, feedsLeft } from './petlogic.js';

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
// ---------- kosmetyki (Pet Pack ze sklepu): zakładane tylko, jeśli kupione; w zapisie ręcznie podmieniony przedmiot wraca do 'none' ----------
export const WEAR_SLOT = { hat: 'pethat', neck: 'petneck' };
const LIST = { hat: PET.HATS, neck: PET.NECKS };
const ownedWear = (kind, id) => LIST[kind].includes(id) && (id === 'none' || SAVE.owned.includes(WEAR_SLOT[kind] + ':' + id));
export function petWear() {
    const eq = SAVE.equipped || {}, h = eq[WEAR_SLOT.hat], k = eq[WEAR_SLOT.neck];
    return { hat: ownedWear('hat', h) ? h : 'none', neck: ownedWear('neck', k) ? k : 'none' };
}
// Posiadane przedmioty danego rodzaju w kolejności katalogu (z 'none' na początku)
export const wearOptions = (kind) => CATALOG.filter(it => it.slot === WEAR_SLOT[kind] && LIST[kind].includes(it.id) && isOwned(it));
// Następny (dir > 0) albo poprzedni posiadany przedmiot; { ok, name } albo { ok: false }
export function cycleWear(kind, dir) {
    if (!LIST[kind] || !getPet()) return { ok: false };
    const opts = wearOptions(kind); if (opts.length < 2) return { ok: false, reason: 'none-owned' };
    const cur = petWear()[kind], i = Math.max(0, opts.findIndex(o => o.id === cur)), next = opts[(i + (dir < 0 ? -1 : 1) + opts.length) % opts.length];
    equipItem(next); return { ok: true, name: next.name, id: next.id };
}
export function cycleColorPet(dir) { const p = getPet(); if (!p) return false; SAVE.pet = cycleColor(p, dir); saveGame(); return true; }
export function cycleName(dir) { const p = getPet(); if (!p) return false; SAVE.pet = renamePet(p, dir); saveGame(); return true; }
// Zwięzły stan do wyświetlania (panel, plakietka): bez zapisu
export function petStatus() {
    const p = getPet(); if (!p) return null;
    const now = Date.now(), clears = clearsNow(), mood = moodOf(p, now);
    return { pet: p, name: PET.NAMES[p.n], color: PET.COLORS[p.c], level: levelOf(p, clears), progress: progress(p, clears), satiety: satiety(p, now), mood: mood, moodLabel: moodLabel(mood),
        hungry: isHungry(p, now), feeds: feedsLeft(p, now), feed: canFeed(p, SAVE.wallet, now), pat: canPat(p, now), wear: petWear(),
        wearNames: { hat: wearName('hat'), neck: wearName('neck') }, wearCount: { hat: wearOptions('hat').length - 1, neck: wearOptions('neck').length - 1 } };
}
const wearName = (kind) => { const id = petWear()[kind], it = CATALOG.find(x => x.slot === WEAR_SLOT[kind] && x.id === id); return it ? it.name : '-'; };
export function petLookNet() { const p = getPet(); if (!p) return null; const w = petWear(); return lookOf(p, clearsNow(), w.hat, w.neck); }
// Czy stworek jest noszony (0 idzie, 1 na rękach, 2 na plecach): tylko stan chwilowy, nie zapisuje się; idzie do sieci jako pc obok wyglądu
let carry = 0;
export const petCarryNet = () => carry;
export const setPetCarry = (v) => { carry = v === 1 || v === 2 ? v : 0; };
