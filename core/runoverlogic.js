// ==========================================
// SCARY GTA: POTRĄCANIE GRACZY I POLICJANTÓW AUTEM (czysta logika, bez THREE i sieci; testy: tests/logic.mjs (blok "potrącanie"), w przeglądarce tests/runover.mjs).
// Rozstrzyga WYŁĄCZNIE host (albo solo) z własnego widoku: pozy swobodnych aut (core/drivelogic.js) i głów graczy. Auto jadące do przodu szybciej niż `MIN_V` zadaje obrażenia procentowe zależne od prędkości
// (wolny dotyk to 12%, pełne 7 m/s to 60%, więc dwa trafienia przy dużej prędkości zabijają). Tor auta jest PRZEMIATANY od poprzedniej pozy do obecnej (przy niskim FPS auto nie przeskakuje nad graczem),
// każda para kierowca-ofiara ma odnowienie `COOLDOWN` (powolne toczenie nie bije w każdej klatce), a ofiary w pojeździe (kierowca, pasażer, jazda po szynach), niżej niż dach (głowa powyżej `HEAD_MAX`),
// martwe, chronione po odrodzeniu i sam kierowca są pomijani. Czy kierowca WOLNO skrzywdzić ofiarę (CO-OP nie, tryb policja-złodzieje tylko między drużynami, FFA tak), mówi `canHurt` od wołającego
// (GM.canHurt). Ofiary nie są popychane (komfort VR): tylko czerwony błysk, wibracja i obrażenia. Policjanci (AI) też są ofiarami (kind 'cop'), bez sprawdzania reguł trybu.
// ==========================================
import { runOverSpot, DRIVE } from './drivelogic.js';
export const RUN = { MIN_V: 2.2, DMG_MIN: 12, DMG_MAX: 60, COOLDOWN: 1.5, BODY_R: 0.35, HEAD_MAX: 2.4, STEP: 0.4, MAX_COORD: 400 };
const fin = (n) => typeof n === 'number' && Number.isFinite(n);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
// Obrażenia (procent zdrowia 100) przy prędkości v: rośnie liniowo od MIN_V do prędkości maksymalnej; wolniej niż MIN_V nie ma obrażeń
export function runDamage(v) {
    if (!fin(v) || v < RUN.MIN_V) return 0;
    return Math.round(RUN.DMG_MIN + clamp((v - RUN.MIN_V) / (DRIVE.VMAX - RUN.MIN_V), 0, 1) * (RUN.DMG_MAX - RUN.DMG_MIN));
}
// Pozy po drodze od prev do cur (liniowo, obrót po najkrótszej drodze), co najwyżej STEP metra przy okręgu potrącenia; zawsze pierwsza i ostatnia
export function sweepPoses(prev, cur) {
    const d = Math.hypot(cur.x - prev.x, cur.z - prev.z), n = Math.max(1, Math.min(40, Math.ceil(d / RUN.STEP))); let dy = cur.yaw - prev.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy));
    const out = []; for (let k = 0; k <= n; k++) { const t = k / n; out.push({ x: prev.x + (cur.x - prev.x) * t, z: prev.z + (cur.z - prev.z) * t, yaw: prev.yaw + dy * t, v: cur.v }); }
    return out;
}
// Czy ofiara (x, z) wpadła pod okrąg potrącenia auta gdziekolwiek na przemiecionym torze
export function sweepHit(prev, cur, spec, vx, vz) {
    if (!prev || !cur || !fin(vx) || !fin(vz)) return false;
    for (const p of sweepPoses(prev, cur)) { const sp = runOverSpot(p, spec); if (sp && Math.hypot(sp.x - vx, sp.z - vz) < sp.r + RUN.BODY_R) return true; }
    return false;
}
// Krok: o = { now, cars: [{ id, driver, prev, cur, spec }], victims: [{ id, kind: 'player'|'cop', x, z, y (głowa), busy, ignore }], canHurt(kierowca, ofiara) -> bool }; cool: odnowienia (mutowane).
// Zwraca trafienia [{ by, victim, kind, dmg, yaw, v }]: najwyżej jedno na parę kierowca-ofiara w kroku
export function runOverStep(cool, o) {
    const hits = [], now = fin(o.now) ? o.now : 0;
    for (const k of Object.keys(cool)) if (now - cool[k] > RUN.COOLDOWN * 4) delete cool[k];
    for (const car of (o.cars || [])) {
        if (!car || !car.driver || !car.prev || !car.cur || !(car.cur.v >= RUN.MIN_V)) continue;
        const dmg = runDamage(car.cur.v);
        for (const v of (o.victims || [])) {
            if (!v || v.id === car.driver || v.busy || v.ignore || !(v.y <= RUN.HEAD_MAX)) continue;
            const key = car.driver + '>' + v.id; if (cool[key] !== undefined && now - cool[key] < RUN.COOLDOWN) continue;
            if (!sweepHit(car.prev, car.cur, car.spec, v.x, v.z)) continue;
            if (v.kind !== 'cop' && !(o.canHurt ? o.canHurt(car.driver, v.id) : false)) continue;
            cool[key] = now; hits.push({ by: car.driver, victim: v.id, kind: v.kind === 'cop' ? 'cop' : 'player', dmg: dmg, yaw: car.cur.yaw, v: car.cur.v });
        }
    }
    return hits;
}
