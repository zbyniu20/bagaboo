// ==========================================
// RZUT NA BRZUCH (czysta logika, bez THREE): gracz biegnie, wyskakuje i LĄDUJE na brzuchu (głowa nisko) = ślizg do przodu z prędkością sprzed lądowania.
// Dotychczasowy ślizg (core/player.js: updateSlide) ruszał tylko wtedy, gdy gracz już stał na podłodze, był nisko i szybki, więc rzut w locie go nie uruchamiał
// (prędkość trzeba było mieć dokładnie w chwili styku). Tu pamiętamy, jak szybko i w którą stronę gracz leciał oraz czy w ostatniej chwili lotu miał głowę nisko
// (`LOW_MEMORY`), więc nie trzeba trafić w jedną klatkę. Nazwa `slidelogic.js` jest zajęta (zjeżdżalnia w aneksie lobby).
// Kierunek ślizgu = kierunek lotu (do przodu), prędkość najwyżej `CAP` (komfort VR, jak limit wyrzutu w player.js). Wszystko lokalne. Testy: tests/logic.mjs (blok "rzut na brzuch").
// ==========================================
export const DIVE = { MIN_SPEED: 1.8, MIN_AIR: 0.12, LOW_MEMORY: 0.3, BOOST: 1.3, CAP: 8.25, MAX_DT: 0.05 };
const fin = (n) => typeof n === 'number' && Number.isFinite(n);
export const newDive = () => ({ air: 0, lowMem: 0, vx: 0, vz: 0, was: true });
// Krok (co pod-krok fizyki): o = { grounded, low (głowa nisko), vx, vz (prędkość pozioma), dt }.
// Zwraca { st, start, vx, vz }: start = true w chwili lądowania na brzuchu, wtedy (vx, vz) to prędkość początkowa ślizgu
export function diveStep(st, o) {
    const s = Object.assign({}, st), dt = fin(o.dt) ? Math.min(Math.max(o.dt, 0), DIVE.MAX_DT) : 0, vx = fin(o.vx) ? o.vx : 0, vz = fin(o.vz) ? o.vz : 0, sp = Math.hypot(vx, vz);
    if (!o.grounded) {
        s.air = st.air + dt; s.was = false;
        s.lowMem = o.low ? DIVE.LOW_MEMORY : Math.max(0, st.lowMem - dt);
        if (sp >= Math.hypot(st.vx, st.vz) * 0.5 || sp > DIVE.MIN_SPEED) { s.vx = vx; s.vz = vz; }   // zapamiętuje ostatni szybki lot (nie spadek do zera tuż przed ziemią)
        return { st: s, start: false, vx: 0, vz: 0 };
    }
    const landing = !st.was, ok = landing && st.air >= DIVE.MIN_AIR && (o.low || st.lowMem > 0), air = Math.hypot(st.vx, st.vz), best = Math.max(sp, air);
    s.was = true; s.air = 0; s.lowMem = 0;
    if (!ok || best < DIVE.MIN_SPEED) return { st: s, start: false, vx: 0, vz: 0 };
    const dx = air >= sp ? st.vx : vx, dz = air >= sp ? st.vz : vz, dl = Math.hypot(dx, dz) || 1, v = Math.min(DIVE.CAP, best * DIVE.BOOST);
    return { st: s, start: true, vx: dx / dl * v, vz: dz / dl * v };
}
