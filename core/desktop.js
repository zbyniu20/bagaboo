// ==========================================
// TRYB TESTOWY NA KOMPUTERZE (bez gogli)
// Kliknij w obraz, żeby złapać mysz. WASD ruch, Shift bieg, Spacja skok, mysz rozglądanie.
// Lewy przycisk: sięgnij prawą dłonią / kliknij ekran. E: chwyt (liny, kule, łańcuchy). Q: pociągnij w dół.
// F: lot (Spacja w górę, C w dół). Esc: pauza.
// ==========================================
import { THREE, camera, renderer } from './engine.js';
import { playerBody, hands, squeeze, external, isGrounded } from './player.js';
import { clickPointer } from './terminal.js';

export const DESKTOP = { enabled: false };
const keys = {};
let yaw = 0, pitch = 0, fly = false, mouseL = false, reach = 0, pull = 0;
const canvas = renderer.domElement;

// Celownik i podpowiedź klawiszy
const cross = document.createElement('div');
cross.style.cssText = 'position:fixed;left:50%;top:50%;width:8px;height:8px;margin:-4px 0 0 -4px;border-radius:50%;background:#ffd27a;box-shadow:0 0 6px #000;z-index:200;display:none;pointer-events:none';
const help = document.createElement('div');
help.style.cssText = 'position:fixed;left:12px;bottom:12px;padding:10px 14px;background:rgba(10,8,8,0.75);color:#e8dcc8;font:13px/1.5 sans-serif;border-radius:8px;z-index:200;display:none;max-width:360px';
help.innerHTML = '<b>Desktop test mode</b><br>Click the view to capture the mouse.<br>WASD move, Shift run, Space jump, mouse look.<br>Left click: reach with your hand, press screens.<br>E: grab (ropes, balls, chains), Q: pull down.<br>F: fly mode (Space up, C down). Esc: pause.';
document.body.appendChild(cross); document.body.appendChild(help);

export function enableDesktop() { DESKTOP.enabled = true; }
const locked = () => document.pointerLockElement === canvas;

window.addEventListener('keydown', (e) => {
    if (!DESKTOP.enabled || renderer.xr.isPresenting) return;
    if (keys[e.code]) return;
    keys[e.code] = true;
    if (e.code === 'KeyE') squeeze(1, true);
    if (e.code === 'KeyF') fly = !fly;
});
window.addEventListener('keyup', (e) => {
    if (!keys[e.code]) return;
    keys[e.code] = false;
    if (e.code === 'KeyE') squeeze(1, false);
});
canvas.addEventListener('mousedown', (e) => {
    if (!DESKTOP.enabled || renderer.xr.isPresenting) return;
    if (!locked()) { canvas.requestPointerLock(); return; }
    if (e.button === 0) { mouseL = true; clickPointer(0); }
});
window.addEventListener('mouseup', (e) => { if (e.button === 0) mouseL = false; });
window.addEventListener('mousemove', (e) => {
    if (!locked()) return;
    yaw -= e.movementX * 0.0022;
    pitch = Math.max(-1.45, Math.min(1.45, pitch - e.movementY * 0.0022));
});

const _o = new THREE.Vector3(), _q = new THREE.Quaternion();
export function updateDesktop(dt) {
    const on = DESKTOP.enabled && !renderer.xr.isPresenting;
    cross.style.display = help.style.display = on ? 'block' : 'none';
    if (!on) { external.move = false; return; }
    camera.position.set(0, 1.35, 0);
    camera.rotation.set(pitch, yaw, 0, 'YXZ');
    // Ruch względem kierunku patrzenia
    const f = (keys.KeyW ? 1 : 0) - (keys.KeyS ? 1 : 0), r = (keys.KeyD ? 1 : 0) - (keys.KeyA ? 1 : 0);
    const sin = Math.sin(yaw), cos = Math.cos(yaw);
    let dx = -sin * f + cos * r, dz = -cos * f - sin * r;
    const len = Math.hypot(dx, dz); if (len > 0) { dx /= len; dz /= len; }
    const sp = keys.ShiftLeft || keys.ShiftRight ? 6 : 3.2, v = playerBody.velocity;
    if (fly) {
        v.set(dx * sp * 1.5, ((keys.Space ? 1 : 0) - (keys.KeyC ? 1 : 0)) * sp + 12 * dt, dz * sp * 1.5);
    } else {
        v.x = dx * sp; v.z = dz * sp;
        if (keys.Space && isGrounded()) v.y = 6.5;
    }
    external.move = fly || len > 0;
    // Dłonie przed kamerą; lewy przycisk wysuwa prawą dłoń, Q opuszcza ją (ciągnięcie łańcucha)
    reach += ((mouseL ? 1 : 0) - reach) * Math.min(1, dt * 12);
    pull += ((keys.KeyQ ? 1 : 0) - pull) * Math.min(1, dt * 8);
    camera.updateMatrixWorld(true); camera.getWorldQuaternion(_q);
    [hands.L, hands.R].forEach((h, i) => {
        if (!h) return;
        _o.set(i ? 0.22 : -0.22, -0.25 - (i ? pull * 0.45 : 0), -(0.42 + (i ? reach * 0.38 : 0)));
        camera.localToWorld(_o);
        h.position.copy(_o); h.quaternion.copy(_q);
        h.userData.rig.target = i && keys.KeyE ? 1.0 : (i && mouseL ? 0.55 : 0.22);
    });
}
