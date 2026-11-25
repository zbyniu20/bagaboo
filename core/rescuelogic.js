// ==========================================
// RATOWANIE ZŁAPANYCH w Become the Monster (czysta logika, bez THREE).
// Gdy gracz odpada (dwie ręce albo głowa), w miejscu upadku powstaje znacznik. Żywy kolega, który stoi przy nim RESCUE.HOLD sekund, go
// podnosi (odzyskuje ręce, krótka ochrona przed złapaniem). Potwór w pobliżu wstrzymuje ratowanie, a po RESCUE.WINDOW sekundach już się nie da.
// Liczy to TYLKO host albo gracz solo z własnego widoku pozycji głów; goście dostają tylko listę znaczników (cleanFallen).
// ==========================================
export const RESCUE = { RADIUS: 1.4, HOLD: 3.0, WINDOW: 30, DANGER: 3.2, MAX: 8, VERT: 1.9 };

export function newFallen(x, y, z, now) { return { x: x, y: y, z: z, t0: now, prog: 0 }; }

// Najbliższy ratownik w poziomie (promień RADIUS) i w pionie (głowa mniej więcej 1,4 m nad znacznikiem, VERT luzu); heads: [{ id, x, y, z }]
export function nearestRescuer(f, heads, radius) {
    let best = null, bd = radius || RESCUE.RADIUS;
    for (const h of heads) {
        const d = Math.hypot(h.x - f.x, h.z - f.z);
        if (d <= bd && Math.abs(h.y - (f.y + 1.4)) <= RESCUE.VERT) { bd = d; best = h.id; }
    }
    return best;
}
// Jeden krok: stan 'saving' (ktoś ratuje), 'paused' (potwór blisko), 'wait' (nikogo nie ma, postęp powoli opada), 'done', 'lost' (okno minęło)
export function rescueStep(f, rescuerNear, monsterNear, dt, now) {
    if (now - f.t0 > RESCUE.WINDOW) return { prog: f.prog, state: 'lost' };
    let p = f.prog, state = 'wait';
    if (monsterNear) { p = Math.max(0, p - dt / RESCUE.HOLD * 0.6); state = 'paused'; }
    else if (rescuerNear) { p = Math.min(1, p + dt / RESCUE.HOLD); state = 'saving'; }
    else p = Math.max(0, p - dt / RESCUE.HOLD * 0.5);
    if (p >= 1) return { prog: 1, state: 'done' };
    return { prog: p, state: state };
}
export const secondsLeft = (f, now) => Math.max(0, RESCUE.WINDOW - (now - f.t0));

// Lista od hosta (id, x, y, z, postęp 0-1, sekundy do końca okna): tylko poprawne liczby, najwyżej MAX wpisów, nowy obiekt
export function cleanFallen(raw) {
    const out = [];
    if (!Array.isArray(raw)) return out;
    for (const e of raw) {
        if (out.length >= RESCUE.MAX) break;
        if (!Array.isArray(e) || e.length < 6 || typeof e[0] !== 'string' || !e[0] || e[0].length > 64 || e[0] === '__proto__') continue;
        const n = e.slice(1, 6); if (!n.every(Number.isFinite)) continue;
        out.push({ id: e[0], x: Math.max(-500, Math.min(500, n[0])), y: Math.max(-100, Math.min(300, n[1])), z: Math.max(-500, Math.min(500, n[2])), p: Math.max(0, Math.min(1, n[3])), r: Math.max(0, Math.min(RESCUE.WINDOW, n[4])) });
    }
    return out;
}
// Czy w ogóle zaznaczać upadek: są co najmniej dwaj uciekinierzy (ktoś może uratować) i ten gracz jeszcze nie był ratowany w tej rundzie
export const canMark = (runners, rescuedBefore) => runners >= 2 && !rescuedBefore;
