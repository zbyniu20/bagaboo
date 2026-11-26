// ==========================================
// SCARY GTA, ETAP 4 (czysta logika, bez THREE): helikopter policji "Oko". Pojawia się od 3 gwiazdek: 3 = szuka (krąży nad ostatnim znanym miejscem),
// 4 = pościg (okrąża gracza), 5 = nisko nad ulicą i zrzuca dwóch policjantów SWAT. Reflektor rzuca światło na ziemię: gracz w kole światła, niezasłonięty dachem
// i nie ukryty przy śmietniku, jest widziany (ciepło rośnie, policja dostaje pozycję). Reflektor wolno omiata teren (poniżej 0,1 Hz), bez migotania.
// Liczy go host (albo solo); goście dostają tylko pozycję (cleanHeli w core/gtanet.js). Testy: tests/logic.mjs (blok "etap 4").
// ==========================================
import { CITY } from './citylayout.js';
export const HELI = { ALT: 58, ALT_LOW: 36, SPEED: { arrive: 15, investigate: 12, chase: 17, leave: 20 }, ACCEL: 7, LIGHT_R: 6.5, SWEEP_R: 12, SWEEP_W: 0.42, ORBIT_R: 16, ORBIT_W: 0.32, LEAVE_T: 14, LIGHT_RATE: 7, YAW_RATE: 2.2, VSPEED: 6, WANT_STARS: 3, SWAT_DIST: 34, SWAT_N: 2, EDGE: 20 };
export const sweepHz = () => HELI.SWEEP_W / (2 * Math.PI);
export const newHeli = () => ({ mode: 'away', x: 0, y: HELI.ALT, z: 0, vx: 0, vz: 0, yaw: 0, ph: 0, sw: 0, lx: 0, lz: 0, leaveT: 0, swatDone: false, known: null });
export const heliWants = (stars) => stars >= HELI.WANT_STARS;
const clampMag = (x, z, m) => { const l = Math.hypot(x, z); return l > m ? [x / l * m, z / l * m] : [x, z]; };
const toward = (cur, goal, rate, dt) => cur + Math.max(-rate * dt, Math.min(rate * dt, goal - cur));
// Krok: c = { stars (najwyższa wśród graczy), lead: { x, z } | null (gracz z najwyższym poziomem), seen: ktoś jest w świetle }; zwraca zdarzenia { spawn, swat }
export function heliStep(h, dt, c) {
    const d = Math.min(Math.max(dt, 0), 0.25), ev = { spawn: false, swat: false };
    const wants = heliWants(c.stars) && !!c.lead;
    if (h.mode === 'away') {
        if (!wants) return ev;
        const east = c.lead.x < 0, ang = (Math.random() - 0.5) * 1.2;   // wlatuje od przeciwnej krawędzi mapy
        h.x = east ? CITY.X1 + HELI.EDGE : CITY.X0 - HELI.EDGE; h.z = c.lead.z + Math.sin(ang) * 40; h.y = HELI.ALT; h.vx = h.vz = 0; h.mode = 'arrive'; h.leaveT = 0; h.swatDone = false; h.known = null; h.lx = c.lead.x; h.lz = c.lead.z; ev.spawn = true;
    }
    if (c.seen && c.lead) h.known = { x: c.lead.x, z: c.lead.z };
    if (wants) h.leaveT = 0; else if (h.mode !== 'leave') { h.leaveT += d; if (h.leaveT > HELI.LEAVE_T) h.mode = 'leave'; }
    if (c.stars < HELI.WANT_STARS) h.swatDone = false;
    let gx = h.x, gz = h.z, sp = HELI.SPEED.arrive, alt = HELI.ALT;
    if (h.mode === 'leave') { const east = h.x >= 0; gx = east ? CITY.X1 + HELI.EDGE * 3 : CITY.X0 - HELI.EDGE * 3; gz = h.z; sp = HELI.SPEED.leave; alt = HELI.ALT + 12; if (Math.abs(h.x) > CITY.X1 + HELI.EDGE * 2) { h.mode = 'away'; return ev; } }
    else if (wants) {
        const lead = c.lead;
        if (c.stars >= 4) { h.mode = 'chase'; h.ph += HELI.ORBIT_W * d; gx = lead.x + Math.cos(h.ph) * HELI.ORBIT_R; gz = lead.z + Math.sin(h.ph) * HELI.ORBIT_R; sp = HELI.SPEED.chase; alt = c.stars >= 5 ? HELI.ALT_LOW : HELI.ALT; }
        else { h.mode = h.mode === 'arrive' && Math.hypot(h.x - lead.x, h.z - lead.z) > 60 ? 'arrive' : 'investigate'; const k = h.known || lead; gx = k.x; gz = k.z; sp = h.mode === 'arrive' ? HELI.SPEED.arrive : HELI.SPEED.investigate; if (h.mode === 'investigate') { h.ph += HELI.ORBIT_W * 0.6 * d; gx += Math.cos(h.ph) * 14; gz += Math.sin(h.ph) * 14; } }
    }
    // ruch: przyspieszenie ograniczone, prędkość do `sp`
    const [dvx, dvz] = clampMag(gx - h.x, gz - h.z, sp), ax = dvx - h.vx, az = dvz - h.vz, [cx, cz] = clampMag(ax, az, HELI.ACCEL * d);
    h.vx += cx; h.vz += cz; h.x += h.vx * d; h.z += h.vz * d; h.y = toward(h.y, alt, HELI.VSPEED, d);
    // kierunek dziobu: w stronę reflektora (albo lotu)
    const fx = h.mode === 'chase' || h.seenNow ? h.lx - h.x : h.vx, fz = h.mode === 'chase' || h.seenNow ? h.lz - h.z : h.vz;
    if (Math.hypot(fx, fz) > 0.5) { const want = Math.atan2(fx, fz); let da = want - h.yaw; da = Math.atan2(Math.sin(da), Math.cos(da)); h.yaw += Math.max(-HELI.YAW_RATE * d, Math.min(HELI.YAW_RATE * d, da)); }
    // reflektor: wiąże się z graczem, gdy ktoś jest w świetle (c.seen), inaczej wolno omiata okolicę celu
    h.seenNow = !!c.seen;
    if (h.mode !== 'leave' && h.mode !== 'away') {
        let tx, tz;
        if (c.seen && c.lead) { tx = c.lead.x; tz = c.lead.z; }
        else { h.sw += HELI.SWEEP_W * d; const k = h.known || c.lead || { x: h.x, z: h.z }; tx = k.x + Math.cos(h.sw) * HELI.SWEEP_R; tz = k.z + Math.sin(h.sw) * HELI.SWEEP_R; }
        const [lx, lz] = clampMag(tx - h.lx, tz - h.lz, HELI.LIGHT_RATE * d + 1e-9 + (c.seen ? 40 * d : 0)); h.lx += lx; h.lz += lz;
    }
    // SWAT: raz na epizod 5 gwiazdek, gdy helikopter jest blisko gracza
    if (c.stars >= 5 && !h.swatDone && c.lead && h.mode === 'chase' && Math.hypot(h.x - c.lead.x, h.z - c.lead.z) < HELI.SWAT_DIST) { h.swatDone = true; ev.swat = true; }
    return ev;
}
// Czy reflektor widzi gracza: w kole światła, nie ukryty, bez dachu nad głową (blocked liczy host z LOS od helikoptera)
export const heliSees = (h, p, o) => (h.mode === 'arrive' || h.mode === 'investigate' || h.mode === 'chase') && !o.hidden && !o.blocked && Math.hypot(h.lx - p.x, h.lz - p.z) <= HELI.LIGHT_R && Math.abs(p.y) < 70;
// Migawka do sieci
export const heliSnap = (h) => h.mode === 'away' ? null : [+h.x.toFixed(1), +h.y.toFixed(1), +h.z.toFixed(1), +h.yaw.toFixed(2), +h.lx.toFixed(1), +h.lz.toFixed(1), h.mode];
