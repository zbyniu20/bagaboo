// ==========================================
// TYROLKA (czysta logika, bez THREE): zjazd ze szczytu ściany zachodniej aneksu lobby (core/annexzip.js, strefa zipline w core/annexlayout.js).
// Dłoń dotykająca uchwytu na górnej platformie zabiera gracza na linie ze stałą, spokojną prędkością (ZIP.SPEED, poniżej limitu komfortu 7 m/s), a na końcu go puszcza.
// Wszystko lokalne (nic nie idzie przez sieć), bez nagród. Wspinaczka na platformę: ZIP_HOLDS (łatwiejsza niż czerwona trasa).
// ==========================================
export const ZIP = { A: [-12.8, 9.7, 35.4], B: [-12.8, 2.9, 25.6], SPEED: 4, REACH: 0.45, COOLDOWN: 2.5, HANG: 0.8, MAX_DT: 0.1 };
export const ZIP_HOLDS = { X: -14.6, Z0: 25, DZ: 1.0, Y0: 1.3, DY: 0.85, COUNT: 10, MAX_STEP: 1.5 };
export const PLATFORM = { x: -13.7, y: 8.85, z: 35.4, w: 1.8, h: 0.25, d: 1.8 };
export const zipHolds = () => { const o = []; for (let i = 0; i < ZIP_HOLDS.COUNT; i++) o.push([ZIP_HOLDS.X, ZIP_HOLDS.Y0 + i * ZIP_HOLDS.DY, ZIP_HOLDS.Z0 + i * ZIP_HOLDS.DZ]); return o; };
// Szyna: ogólny przejazd po prostej od A do B (tyrolka i zjeżdżalnia). rail = { A, B, SPEED, HANG, COOLDOWN, MAX_DT }; HANG to odległość ciała pod punktem szyny (ujemna = ciało nad nią).
export const railLength = (r) => Math.hypot(r.B[0] - r.A[0], r.B[1] - r.A[1], r.B[2] - r.A[2]);
export function railPoint(r, s) { const L = railLength(r), t = Math.max(0, Math.min(1, s / L)); return [r.A[0] + (r.B[0] - r.A[0]) * t, r.A[1] + (r.B[1] - r.A[1]) * t, r.A[2] + (r.B[2] - r.A[2]) * t]; }
export function railVelocity(r) { const L = railLength(r); return [(r.B[0] - r.A[0]) / L * r.SPEED, (r.B[1] - r.A[1]) / L * r.SPEED, (r.B[2] - r.A[2]) / L * r.SPEED]; }
const bodyOn = (r, s) => { const p = railPoint(r, s); return [p[0], p[1] - r.HANG, p[2]]; };
export const newZip = () => ({ ph: 'idle', s: 0, cd: 0 });
// Krok: near = dłoń przy uchwycie. Zwraca { st, pos (punkt uchwytu), body (gdzie ma być ciało), vel, event: ''|'start'|'end' }
export function railStep(r, st, near, dt) {
    const s = { ph: st.ph, s: st.s, cd: st.cd }, d = Math.min(Math.max(dt, 0), r.MAX_DT);
    if (s.ph === 'idle') {
        s.cd = Math.max(0, s.cd - Math.min(Math.max(dt, 0), 0.5));
        if (near && s.cd <= 0) { s.ph = 'ride'; s.s = 0; return { st: s, pos: railPoint(r, 0), body: bodyOn(r, 0), vel: railVelocity(r), event: 'start' }; }
        return { st: s, pos: railPoint(r, 0), body: null, vel: null, event: '' };
    }
    s.s += r.SPEED * d;
    if (s.s >= railLength(r)) { s.ph = 'idle'; s.s = 0; s.cd = r.COOLDOWN; return { st: s, pos: railPoint(r, railLength(r)), body: bodyOn(r, railLength(r)), vel: [0, 0, 0], event: 'end' }; }
    return { st: s, pos: railPoint(r, s.s), body: bodyOn(r, s.s), vel: railVelocity(r), event: '' };
}
// Tyrolka: ta sama szyna z jej stałymi (zachowane nazwy dla istniejących modułów i testów)
export const zipLength = () => railLength(ZIP);
export const zipPoint = (s) => railPoint(ZIP, s);
export const zipVelocity = () => railVelocity(ZIP);
export const zipStep = (st, handNear, dt) => railStep(ZIP, st, handNear, dt);
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
