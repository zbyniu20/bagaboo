// ==========================================
// RZUT NA BRZUCH (czysta logika, bez THREE): gracz biegnie, wyskakuje i LĄDUJE na brzuchu (głowa nisko) = ślizg do przodu z prędkością sprzed lądowania.
// Dotychczasowy ślizg (core/player.js: updateSlide) ruszał tylko wtedy, gdy gracz już stał na podłodze, był nisko i szybki, więc rzut w locie go nie uruchamiał
// (prędkość trzeba było mieć dokładnie w chwili styku). Tu pamiętamy, jak szybko i w którą stronę gracz leciał oraz czy w ostatniej chwili lotu miał głowę nisko
// (`LOW_MEMORY`) oraz daje `LAND_WINDOW` po lądowaniu na podniesienie głowy, więc nie trzeba trafić w jedną klatkę (ale w chwili startu głowa MUSI być nisko). Nazwa `slidelogic.js` jest zajęta (zjeżdżalnia w aneksie lobby).
// Kierunek ślizgu = kierunek lotu (do przodu), prędkość najwyżej `CAP` (komfort VR, jak limit wyrzutu w player.js). Wszystko lokalne. Testy: tests/logic.mjs (blok "rzut na brzuch").
// ==========================================
export const DIVE = { MIN_SPEED: 1.8, MIN_AIR: 0.12, LOW_MEMORY: 0.3, LAND_WINDOW: 0.15, BOOST: 1.3, CAP: 8.25, MAX_DT: 0.05 };
const fin = (n) => typeof n === 'number' && Number.isFinite(n);
export const newDive = () => ({ air: 0, lowMem: 0, vx: 0, vz: 0, was: true, pend: 0, pvx: 0, pvz: 0 });
// Krok (co pod-krok fizyki): o = { grounded, low (głowa nisko), vx, vz (prędkość pozioma), dt }.
// Zwraca { st, start, vx, vz }: start = true, gdy gracz LĄDUJE na brzuchu (głowa nisko w chwili lądowania albo w ciągu LAND_WINDOW po nim, bo próg głowy potrafi drgnąć o klatkę);
// wtedy (vx, vz) to prędkość początkowa ślizgu. Samo "głowa była nisko przed lądowaniem" nie wystarcza: ślizg i tak kończy się, gdy głowa jest wysoko (player.js), więc start bez niskiej głowy dawałby tylko zbędny rozpęd.
export function diveStep(st, o) {
    const s = Object.assign({}, st), dt = fin(o.dt) ? Math.min(Math.max(o.dt, 0), DIVE.MAX_DT) : 0, vx = fin(o.vx) ? o.vx : 0, vz = fin(o.vz) ? o.vz : 0, sp = Math.hypot(vx, vz);
    if (!o.grounded) {
        s.air = st.air + dt; s.was = false; s.pend = 0;
        s.lowMem = o.low ? DIVE.LOW_MEMORY : Math.max(0, st.lowMem - dt);
        if (sp >= Math.hypot(st.vx, st.vz) * 0.5 || sp > DIVE.MIN_SPEED) { s.vx = vx; s.vz = vz; }   // zapamiętuje ostatni szybki lot (nie spadek do zera tuż przed ziemią)
        return { st: s, start: false, vx: 0, vz: 0 };
    }
    const launch = (dx, dz, best) => { const dl = Math.hypot(dx, dz) || 1, v = Math.min(DIVE.CAP, best * DIVE.BOOST); return { vx: dx / dl * v, vz: dz / dl * v }; };
    const landing = !st.was, air = Math.hypot(st.vx, st.vz), best = Math.max(sp, air), dirAir = air >= sp;
    s.was = true;
    if (landing) {
        s.air = 0; s.lowMem = 0;
        const dived = st.air >= DIVE.MIN_AIR && st.lowMem > 0 && best >= DIVE.MIN_SPEED, dx = dirAir ? st.vx : vx, dz = dirAir ? st.vz : vz;
        if (dived && o.low) { s.pend = 0; return Object.assign({ st: s, start: true }, launch(dx, dz, best)); }
        if (dived) { const l = launch(dx, dz, best); s.pend = DIVE.LAND_WINDOW; s.pvx = l.vx; s.pvz = l.vz; }   // głowa nie jest jeszcze nisko: czekamy chwilę
        return { st: s, start: false, vx: 0, vz: 0 };
    }
    if (st.pend > 0) { s.pend = Math.max(0, st.pend - dt); if (o.low) { s.pend = 0; return { st: s, start: true, vx: st.pvx, vz: st.pvz }; } }
    return { st: s, start: false, vx: 0, vz: 0 };
}
