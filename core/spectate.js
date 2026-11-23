// ==========================================
// TRYB OBSERWATORA (3D): po wyeliminowaniu patrzysz z kamery za plecami żywego gracza (albo potwora). Spust / klawisz Q lub Tab przełącza cel.
// Poziom woła startSpectate(() => [{ id, label, x, y, z, fx, fz }]) i stopSpectate(); main.js woła updateSpectate(dt) przed updatePlayer.
// Wszystko lokalne: inni widzą tylko flagę sp (ukrywa mój awatar), nic więcej nie idzie przez sieć.
// ==========================================
import { L } from './engine.js';
import { cameraPanel, panelBg } from './levelkit.js';
import { setPlayerPosition, playerBody } from './player.js';
import { SPEC, cameraSpot, clipSpot, followStep, cycleTarget, hudLine } from './spectatelogic.js';

const ST = { fn: null, cur: null, pos: null, level: null, hud: null, hudT: 0, saved: null, list: [] };
const boxes = () => { const out = []; for (const o of L.obstacles) if (o.box3) out.push(o.box3); return out; };
export function isSpectating() { return SPEC.on; }
export function startSpectate(getCandidates) {
    if (SPEC.on) { ST.fn = getCandidates; return true; }
    const first = getCandidates() || []; if (!first.length) return false;
    ST.fn = getCandidates; ST.cur = null; ST.pos = null; ST.level = L.levelId; ST.hudT = 0;
    ST.saved = { x: playerBody.position.x, y: playerBody.position.y, z: playerBody.position.z };
    ST.hud = cameraPanel(1024, 120, 0.42, 0.049, -0.3, -0.75, 991);
    SPEC.on = true; return true;
}
export function stopSpectate(restore) {
    if (!SPEC.on) return;
    SPEC.on = false; SPEC.vx = SPEC.vy = SPEC.vz = 0; if (ST.hud) { ST.hud.dispose(); ST.hud = null; }
    if (restore !== false && ST.saved) setPlayerPosition(ST.saved.x, ST.saved.y, ST.saved.z);
    ST.fn = null; ST.cur = null; ST.pos = null; ST.saved = null;
}
export function spectateNext(dir) {
    if (!SPEC.on) return;
    const ids = ST.list.map(c => c.id); ST.cur = cycleTarget(ids, ST.cur, dir === undefined ? 1 : dir); ST.pos = null;
}
SPEC.next = spectateNext;
if (typeof window !== 'undefined') window.addEventListener('keydown', (e) => { if (SPEC.on && (e.code === 'KeyQ' || e.code === 'Tab')) { e.preventDefault(); spectateNext(e.shiftKey ? -1 : 1); } });
export function updateSpectate(dt) {
    if (!SPEC.on) return;
    if (L.levelId !== ST.level) { stopSpectate(false); return; }
    ST.list = ST.fn() || [];
    if (!ST.list.length) { stopSpectate(); return; }
    ST.cur = cycleTarget(ST.list.map(c => c.id), ST.cur, 0);
    const i = ST.list.findIndex(c => c.id === ST.cur), t = ST.list[i];
    const want = clipSpot(t, cameraSpot(t), boxes());
    const fresh = !ST.pos; ST.pos = followStep(ST.pos, want, dt);
    if (dt > 0) { SPEC.vx = (ST.pos.x - SPEC.x) / dt; SPEC.vy = (ST.pos.y - SPEC.y) / dt; SPEC.vz = (ST.pos.z - SPEC.z) / dt; }
    if (fresh) { SPEC.vx = SPEC.vy = SPEC.vz = 0; }   // pierwsza klatka albo zmiana celu: skok pozycji to nie ruch kamery
    SPEC.x = ST.pos.x; SPEC.y = ST.pos.y; SPEC.z = ST.pos.z;
    ST.hudT -= dt; if (ST.hud && ST.hudT <= 0) {
        ST.hudT = 0.25; const x = ST.hud.ctx; panelBg(ST.hud, 'rgba(16,4,4,0.7)');
        x.textBaseline = 'middle'; x.textAlign = 'center'; x.font = 'bold 40px "Courier New", monospace'; x.fillStyle = '#ffd8d0'; x.fillText(hudLine(t.label, ST.list.length, i), 512, 44);
        x.font = '24px "Courier New", monospace'; x.fillStyle = '#ff8a6a'; x.fillText(ST.list.length > 1 ? 'Trigger / Q: next player' : 'You are out', 512, 88); ST.hud.update();
    }
}
export function debugSpectate() { return { on: SPEC.on, cur: ST.cur, n: ST.list.length, pos: ST.pos }; }
