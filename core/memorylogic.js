// ==========================================
// Potwór, który uczy się kryjówek (czysta logika, bez THREE): zapamiętuje, w których kryjówkach gracz chowa się dłużej niż parę sekund, a gdy któraś z nich zdarzyła się
// co najmniej dwa razy, w trakcie patrolu co jakiś czas idzie ją sprawdzić ("zna twoją ulubioną kryjówkę"). To TYLKO napięcie: sprawdzenie nie zmienia zasad kryjówki
// (bęben nadal chroni, fałszywe bębny działają jak dotąd). Po wizycie licznik tej kryjówki maleje, więc potwór nie obozuje przy niej w nieskończoność.
// Wyłączone na Easy, częstsze na Nightmare. Stan jest lokalny i tylko na czas jednego biegu (nie zapisuje się). Pralnia: potwór liczy się lokalnie u każdego klienta (brak
// wiadomości sieciowych w levels/laundry.js), więc nic nie idzie przez sieć. Hotel: nie zrobione (szafy działają inaczej).
// ==========================================
export const MEMORY = { minHideSec: 4, minHides: 2, check: [32, 58], nightmareMul: 0.6, maxSpots: 24 };
const wait = (rnd, diff) => (MEMORY.check[0] + ((rnd || Math.random)()) * (MEMORY.check[1] - MEMORY.check[0])) * (diff === 'nightmare' ? MEMORY.nightmareMul : 1);
export function newMemory(rnd, diff) { return { hides: {}, spot: null, spotT: 0, counted: false, wait: wait(rnd, diff), visits: 0, last: null }; }

// spotId: klucz kryjówki, w której gracz jest teraz (null = nie w kryjówce). Liczy ukrycie, gdy trwa co najmniej minHideSec (raz na pobyt)
export function hideStep(mem, dt, spotId) {
    if (!(dt > 0)) return;
    if (spotId === null || spotId === undefined) { mem.spot = null; mem.spotT = 0; mem.counted = false; return; }
    if (mem.spot !== spotId) { mem.spot = spotId; mem.spotT = 0; mem.counted = false; }
    mem.spotT += dt;
    if (!mem.counted && mem.spotT >= MEMORY.minHideSec) {
        mem.counted = true; mem.last = spotId;
        if (Object.keys(mem.hides).length < MEMORY.maxSpots || mem.hides[spotId] !== undefined) mem.hides[spotId] = (mem.hides[spotId] || 0) + 1;
    }
}
// Ulubiona kryjówka: najwięcej ukryć (min. minHides), przy remisie ostatnio użyta; null, gdy żadna
export function favorite(mem) {
    let best = null, n = 0;
    for (const k of Object.keys(mem.hides)) { const c = mem.hides[k]; if (c >= MEMORY.minHides && (c > n || (c === n && String(mem.last) === k))) { best = k; n = c; } }
    return best === null ? null : (Number.isNaN(Number(best)) ? best : Number(best));
}
// Co klatkę z pętli potwora: zwraca klucz kryjówki do sprawdzenia albo null. Tylko w patrolu, nie na Easy; po wizycie licznik maleje o 1
export function checkTick(mem, dt, patrolling, diff, rnd) {
    if (!(dt > 0) || diff === 'easy' || !patrolling) return null;
    mem.wait -= dt;
    if (mem.wait > 0) return null;
    mem.wait = wait(rnd, diff);
    const f = favorite(mem); if (f === null) return null;
    mem.hides[f] = Math.max(0, mem.hides[f] - 1); mem.visits++;
    return f;
}
