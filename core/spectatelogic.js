// ==========================================
// TRYB OBSERWATORA: CZYSTA LOGIKA (wybór celu, kamera za plecami, gładkie podążanie, wycinanie przez ściany).
// Bez THREE: testy w tests/logic.mjs. Stan SPEC czyta core/player.js (nadpisuje pozycję ciała gracza), rysuje core/spectate.js.
// ==========================================
import { rayBox } from './acousticlogic.js';
export const SPEC = { on: false, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, next: null };   // v*: prędkość kamery (m/s), z niej liczy się komfortowa winieta w VR   // next: ustawia core/spectate.js (spust kontrolera przełącza cel)   // docelowa pozycja KAMERY (świat); player.js ustawia pod nią ciało
export const CAM = { dist: 2.4, up: 0.55, speed: 4, teleport: 18, margin: 0.35, minDist: 0.6, maxSpeed: 7 };   // maxSpeed: wolniejszy lot kamery = mniej choroby lokomocyjnej w VR
// Kierunek patrzenia (poziomy, jednostkowy) z kwaternionu [x, y, z, w]: obrót wektora (0, 0, -1)
export function forwardFromQuat(q) {
    if (!Array.isArray(q) || q.length < 4 || q.some(v => typeof v !== 'number' || !isFinite(v))) return { fx: 0, fz: -1 };
    const x = q[0], y = q[1], z = q[2], w = q[3];
    const fx = -2 * w * y - 2 * x * z, fz = -1 + 2 * x * x + 2 * y * y, l = Math.hypot(fx, fz);
    return l < 1e-4 ? { fx: 0, fz: -1 } : { fx: fx / l, fz: fz / l };
}
// Miejsce kamery: za plecami celu (przeciwnie do kierunku patrzenia), trochę wyżej
export function cameraSpot(t) { return { x: t.x - t.fx * CAM.dist, y: t.y + CAM.up, z: t.z - t.fz * CAM.dist }; }
// Kamera nie wchodzi w ściany: odcinek cel -> kamera skracamy przed pierwszą bryłą (podłogi i niskie przeszkody pomijamy)
export function clipSpot(from, want, boxes) {
    const dx = want.x - from.x, dy = want.y - from.y, dz = want.z - from.z, len = Math.hypot(dx, dy, dz); if (len < 1e-6) return want;
    const d = { x: dx / len, y: dy / len, z: dz / len }; let best = Infinity;
    for (const b of boxes) { if (b.max.y - b.min.y < 1.0) continue; const t = rayBox(from, d, b, len); if (t < best) best = t; }
    if (!isFinite(best)) return want;
    const k = Math.max(CAM.minDist, best - CAM.margin); return { x: from.x + d.x * k, y: from.y + d.y * k, z: from.z + d.z * k };
}
// Gładkie podążanie (wykładnicze); daleki skok (cel zmienił miejsce) przenosi od razu
export function followStep(cur, want, dt) {
    if (!cur || Math.hypot(want.x - cur.x, want.y - cur.y, want.z - cur.z) > CAM.teleport) return { x: want.x, y: want.y, z: want.z };
    const a = Math.min(1, Math.max(0, dt) * CAM.speed);
    let dx = (want.x - cur.x) * a, dy = (want.y - cur.y) * a, dz = (want.z - cur.z) * a;
    const len = Math.hypot(dx, dy, dz), cap = CAM.maxSpeed * Math.max(0, dt);   // nigdy szybciej niż maxSpeed
    if (len > cap && len > 0) { const k = cap / len; dx *= k; dy *= k; dz *= k; }
    return { x: cur.x + dx, y: cur.y + dy, z: cur.z + dz };
}
// Następny cel z listy identyfikatorów: dir 1 = dalej, -1 = wstecz, 0 = zostań (jeśli cel zniknął, pierwszy z listy); null gdy lista pusta
export function cycleTarget(ids, cur, dir) {
    if (!ids.length) return null;
    const i = ids.indexOf(cur); if (i < 0) return ids[0];
    return ids[((i + (dir || 0)) % ids.length + ids.length) % ids.length];
}
export function hudLine(label, n, i) { return 'Watching: ' + String(label || '?').slice(0, 18) + (n > 1 ? '  (' + (i + 1) + '/' + n + ')' : ''); }
