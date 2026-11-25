// ==========================================
// TYROLKA (czysta logika, bez THREE): zjazd ze szczytu ściany zachodniej aneksu lobby (core/annexzip.js, strefa zipline w core/annexlayout.js).
// Dłoń dotykająca uchwytu na górnej platformie zabiera gracza na linie ze stałą, spokojną prędkością (ZIP.SPEED, poniżej limitu komfortu 7 m/s), a na końcu go puszcza.
// Wszystko lokalne (nic nie idzie przez sieć), bez nagród. Wspinaczka na platformę: ZIP_HOLDS (łatwiejsza niż czerwona trasa).
// ==========================================
export const ZIP = { A: [-12.8, 9.7, 35.4], B: [-12.8, 2.9, 25.6], SPEED: 4, REACH: 0.45, COOLDOWN: 2.5, HANG: 0.8, MAX_DT: 0.1 };
export const ZIP_HOLDS = { X: -14.6, Z0: 25, DZ: 1.0, Y0: 1.3, DY: 0.85, COUNT: 10, MAX_STEP: 1.5 };
export const PLATFORM = { x: -13.7, y: 8.85, z: 35.4, w: 1.8, h: 0.25, d: 1.8 };
export const zipHolds = () => { const o = []; for (let i = 0; i < ZIP_HOLDS.COUNT; i++) o.push([ZIP_HOLDS.X, ZIP_HOLDS.Y0 + i * ZIP_HOLDS.DY, ZIP_HOLDS.Z0 + i * ZIP_HOLDS.DZ]); return o; };
export const zipLength = () => Math.hypot(ZIP.B[0] - ZIP.A[0], ZIP.B[1] - ZIP.A[1], ZIP.B[2] - ZIP.A[2]);
export const newZip = () => ({ ph: 'idle', s: 0, cd: 0 });
// Punkt liny w odległości s od początku (przycięty do liny)
export function zipPoint(s) { const L = zipLength(), t = Math.max(0, Math.min(1, s / L)); return [ZIP.A[0] + (ZIP.B[0] - ZIP.A[0]) * t, ZIP.A[1] + (ZIP.B[1] - ZIP.A[1]) * t, ZIP.A[2] + (ZIP.B[2] - ZIP.A[2]) * t]; }
// Kierunek jazdy (jednostkowy) i prędkość wektorowa
export function zipVelocity() { const L = zipLength(); return [(ZIP.B[0] - ZIP.A[0]) / L * ZIP.SPEED, (ZIP.B[1] - ZIP.A[1]) / L * ZIP.SPEED, (ZIP.B[2] - ZIP.A[2]) / L * ZIP.SPEED]; }
// Krok: handNear = dłoń przy uchwycie. Zwraca { st, pos (punkt uchwytu), body (gdzie ma być ciało), vel, event: ''|'start'|'end' }
export function zipStep(st, handNear, dt) {
    const s = { ph: st.ph, s: st.s, cd: st.cd }, d = Math.min(Math.max(dt, 0), ZIP.MAX_DT);
    if (s.ph === 'idle') {
        s.cd = Math.max(0, s.cd - Math.min(Math.max(dt, 0), 0.5));
        if (handNear && s.cd <= 0) { s.ph = 'ride'; s.s = 0; return { st: s, pos: zipPoint(0), body: bodyAt(0), vel: zipVelocity(), event: 'start' }; }
        return { st: s, pos: zipPoint(0), body: null, vel: null, event: '' };
    }
    s.s += ZIP.SPEED * d;
    if (s.s >= zipLength()) { s.ph = 'idle'; s.s = 0; s.cd = ZIP.COOLDOWN; return { st: s, pos: zipPoint(zipLength()), body: bodyAt(zipLength()), vel: [0, 0, 0], event: 'end' }; }
    return { st: s, pos: zipPoint(s.s), body: bodyAt(s.s), vel: zipVelocity(), event: '' };
}
function bodyAt(s) { const p = zipPoint(s); return [p[0], p[1] - ZIP.HANG, p[2]]; }
// Usterki toru: uchwyty w zasięgu rąk (krok <= MAX_STEP), platforma tuż nad ostatnim uchwytem, uchwyt liny nad platformą, lina opada
export function zipProblems() {
    const bad = [], h = zipHolds();
    h.forEach((p, i) => { if (i > 0) { const q = h[i - 1], d = Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]); if (d > ZIP_HOLDS.MAX_STEP || p[1] - q[1] > 1.0) bad.push('hold ' + i + ' too far'); } });
    const last = h[h.length - 1], top = PLATFORM.y + PLATFORM.h / 2;
    if (Math.abs(last[1] - top) > 0.3) bad.push('the platform is not level with the last hold');
    if (Math.hypot(PLATFORM.x - last[0], PLATFORM.z - last[2]) > 2.2) bad.push('the platform is too far from the last hold');
    if (ZIP.A[1] - top < 0.5 || ZIP.A[1] - top > 1.4) bad.push('the handle is out of reach from the platform');
    if (Math.abs(ZIP.A[0] - PLATFORM.x) > PLATFORM.w / 2 + 0.3 || Math.abs(ZIP.A[2] - PLATFORM.z) > PLATFORM.d / 2 + 0.3) bad.push('the handle is not above the platform');
    if (ZIP.B[1] >= ZIP.A[1] - 3 || ZIP.B[1] - ZIP.HANG < 0.4) bad.push('the rope does not descend enough or ends below the floor');
    if (ZIP.SPEED > 7) bad.push('too fast for comfort');
    return bad;
}
