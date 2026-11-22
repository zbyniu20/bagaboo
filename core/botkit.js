// ==========================================
// WSPÓLNY RUCH BOTA-MANEKINA (Hide and Seek, Capture the Banana): chodzi po podłodze z kolizją o pudełka,
// wchodzi na niskie krawędzie, w pościgu skacze na wyższe i obchodzi przeszkody, gdy utknie.
// ==========================================
import { L } from './engine.js';

const GRAVITY = 18, JUMP_MAX = 3.6;
export function createBot(x, z) { return { x: x, y: 0, z: z, vy: 0, ground: true, stuck: 0, side: 0, sideT: 0, dir: 0, mode: 'patrol', goal: null, lostT: 0, last: null }; }
// Ruch po podłodze z kolizją o skrzynie (wejście na niskie krawędzie, skok na wyższe, obejście gdy utknie)
export function stepBot(b, dt, tx, tz, ty, speed, chasing) {
    const R = 0.4, TALL = 1.2;
    // Nasłuchiwanie (tylko bot z b.listen = true: Grabarz, Strażnik, Furas, goście hotelu): co kilka sekund patrolu staje, rozgląda się i nasłuchuje 1,5-4 s; w pościgu nigdy
    if (b.listen && !chasing && b.mode === 'patrol') {
        if (b.pauseT > 0) { b.pauseT -= dt; speed = 0; b.dir += Math.sin(b.pauseT * 2.4) * dt * 0.9; }
        else { b.listenT = (b.listenT === undefined ? 4 + Math.random() * 6 : b.listenT) - dt; if (b.listenT <= 0) { b.pauseT = 1.5 + Math.random() * 2.5; b.listenT = 8 + Math.random() * 9; } }
    } else if (b.pauseT > 0) b.pauseT = 0;
    let dx = tx - b.x, dz = tz - b.z; const d = Math.hypot(dx, dz);
    if (d > 0.05) { dx /= d; dz /= d; } else { dx = 0; dz = 0; }
    if (b.side) { const sx = -dz * b.side, sz = dx * b.side; dx = dx * 0.4 + sx; dz = dz * 0.4 + sz; b.sideT -= dt; if (b.sideT <= 0) b.side = 0; }
    if (dx || dz) { const want = Math.atan2(dx, dz); let dd = want - b.dir; while (dd > Math.PI) dd -= Math.PI * 2; while (dd < -Math.PI) dd += Math.PI * 2; b.dir += dd * Math.min(1, dt * 6); }
    const ox = b.x, oz = b.z;
    b.x += dx * speed * dt; b.z += dz * speed * dt;
    b.vy -= GRAVITY * dt; b.y += b.vy * dt;
    let blockedTop = null; b.ground = false;
    for (const o of L.obstacles) {
        const bb = o.box3;
        if (b.x < bb.min.x - R || b.x > bb.max.x + R || b.z < bb.min.z - R || b.z > bb.max.z + R) continue;
        if (b.y + TALL <= bb.min.y || b.y >= bb.max.y) {
            if (b.vy <= 0 && b.y < bb.max.y + 0.05 && b.y > bb.max.y - 0.5 && b.x > bb.min.x - R * 0.5 && b.x < bb.max.x + R * 0.5 && b.z > bb.min.z - R * 0.5 && b.z < bb.max.z + R * 0.5) { b.y = bb.max.y; b.vy = 0; b.ground = true; }
            continue;
        }
        const step = bb.max.y - b.y;
        if (step <= 0.45 && b.vy <= 0) { b.y = bb.max.y; b.vy = 0; b.ground = true; continue; }
        if (b.ground || b.vy <= 0) blockedTop = Math.max(blockedTop || 0, bb.max.y);
        const ex = Math.min(b.x - (bb.min.x - R), bb.max.x + R - b.x), ez = Math.min(b.z - (bb.min.z - R), bb.max.z + R - b.z);
        if (ex < ez) b.x = b.x < (bb.min.x + bb.max.x) / 2 ? bb.min.x - R : bb.max.x + R; else b.z = b.z < (bb.min.z + bb.max.z) / 2 ? bb.min.z - R : bb.max.z + R;
    }
    if (b.y <= 0) { b.y = 0; b.vy = 0; b.ground = true; }
    // Skacze tylko za graczem (do pościgu), a w patrolu omija przeszkody w bok
    if (b.ground && chasing && (blockedTop !== null || (ty > b.y + 0.8 && d < 3.5))) {
        const h = Math.min(JUMP_MAX, Math.max(0.6, (blockedTop !== null ? blockedTop : ty) - b.y + 0.35));
        b.vy = Math.sqrt(2 * GRAVITY * h); b.ground = false;
    }
    const moved = Math.hypot(b.x - ox, b.z - oz);
    if (moved < speed * dt * 0.3 && b.ground) { b.stuck += dt; if (b.stuck > 0.7) { b.stuck = 0; b.side = Math.random() < 0.5 ? -1 : 1; b.sideT = 1.0; if (!chasing) b.goal = null; } } else b.stuck = 0;
}
