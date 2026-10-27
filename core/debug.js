// ==========================================
// OKIENKO BŁĘDÓW: czerwone komunikaty na ekranie komputera i przed oczami w goglach.
// Gdy coś nie działa, przepisz albo sfotografuj ten komunikat.
// ==========================================
import { THREE, camera } from './engine.js';

const box = document.createElement('div');
box.style.cssText = 'position:fixed;right:12px;bottom:12px;max-width:520px;padding:10px 14px;background:rgba(60,0,0,0.88);color:#ffd8d0;font:12px/1.45 monospace;border-radius:8px;z-index:300;display:none;white-space:pre-wrap';
document.body.appendChild(box);
const c = document.createElement('canvas'); c.width = 1024; c.height = 256;
const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace;
const mesh = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.125), new THREE.MeshBasicMaterial({ map: tx, transparent: true, depthTest: false, toneMapped: false }));
mesh.position.set(0, -0.24, -0.8); mesh.renderOrder = 2800; mesh.visible = false; camera.add(mesh);
const errors = []; let showT = 0;

export function report(msg) {
    msg = String(msg || 'Unknown error').slice(0, 220);
    if (errors.length && errors[errors.length - 1] === msg) return;
    errors.push(msg); if (errors.length > 4) errors.shift();
    box.style.display = 'block'; box.textContent = 'Errors (copy them into the chat):\n' + errors.join('\n');
    const x = c.getContext('2d'); x.clearRect(0, 0, 1024, 256);
    x.fillStyle = 'rgba(70,0,0,0.9)'; x.beginPath(); x.roundRect(4, 4, 1016, 248, 20); x.fill();
    x.fillStyle = '#ffd8d0'; x.font = 'bold 30px monospace'; x.fillText('Error:', 24, 44);
    x.font = '24px monospace';
    const words = msg.split(' '); let line = '', y = 86;
    for (const w of words) { if (x.measureText(line + ' ' + w).width > 970) { x.fillText(line, 24, y); y += 32; line = w; if (y > 230) break; } else line = line ? line + ' ' + w : w; }
    if (y <= 230) x.fillText(line, 24, y);
    tx.needsUpdate = true; mesh.visible = true; showT = 12;
}
window.addEventListener('error', (e) => report(e.message + (e.filename ? ' (' + e.filename.split('/').pop().split('?')[0] + ':' + e.lineno + ')' : '')));
window.addEventListener('unhandledrejection', (e) => report('Promise: ' + (e.reason && e.reason.message ? e.reason.message : e.reason)));
const origError = console.error.bind(console);
console.error = function () { origError.apply(null, arguments); report(Array.from(arguments).map(a => a && a.message ? a.message : String(a)).join(' ')); };
export function updateDebug(dt) { if (showT > 0) { showT -= dt; if (showT <= 0) mesh.visible = false; } }
