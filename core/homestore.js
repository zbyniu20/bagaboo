// ==========================================
// MAGAZYN MOJEGO POKOJU: stan w SAVE.home (podpisany zapis gry), zakup mebli i ustawianie ich w miejscach, dane dla gości (core/leveldata.js).
// Każdy odczyt stanu przechodzi przez normalizeHome (core/homelogic.js), a zakup przez canBuy i spendBones (portfel nigdy nie spada poniżej zera).
// Moduł jest ładowany od startu gry (main.js), bo host dołącza układ pokoju do sendFollow, zanim poziom 'home' się załaduje.
// ==========================================
import { SAVE, saveGame, spendBones } from './economy.js';
import { register } from './leveldata.js';
import { normalizeHome, canBuy, buy, place, visitPayload, acceptVisit } from './homelogic.js';

export function getHome() { const h = normalizeHome(SAVE.home); SAVE.home = h; return h; }
export const achievementCount = () => Object.keys(SAVE.achievements || {}).length;
export function buyFurniture(id) {
    const h = getHome(), r = canBuy(h, SAVE.wallet, id); if (!r.ok) return r;
    SAVE.home = buy(h, id);
    if (!spendBones(r.price, 'furniture')) { SAVE.home = h; return { ok: false, reason: 'poor' }; }   // spendBones zapisuje portfel i pokój razem
    return { ok: true, price: r.price };
}
export function placeFurniture(slot, id) {
    const r = place(getHome(), slot, id); if (r.error) return { ok: false, reason: r.error };
    SAVE.home = r.home; saveGame(); return { ok: true };
}
// Host wysyła układ swojego pokoju, gość przyjmuje go tylko przez acceptVisit
register('home', () => visitPayload(getHome(), SAVE.profile.name, achievementCount()), (raw) => acceptVisit(raw));
