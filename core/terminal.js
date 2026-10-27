// ==========================================
// EKRANY W GRZE (komputer, sklep): rysowanie, przyciski, laser z kontrolera, komunikaty
// ==========================================
import { THREE, scene, camera, renderer } from './engine.js';

export const AMBER = '#ffb000', AMBER_DIM = '#7a5a20', TERM_BG = '#140c05', OK_COL = '#7fc47f', BAD_COL = '#e0533f', GOLD = '#ffd27a';
export const terminals = [];

export class Terminal {
    constructor(draw, w = 1024, h = 640) {
        this.W = w; this.H = h;
        this.canvas = document.createElement('canvas'); this.canvas.width = w; this.canvas.height = h;
        this.ctx = this.canvas.getContext('2d');
        this.tex = new THREE.CanvasTexture(this.canvas); this.tex.colorSpace = THREE.SRGBColorSpace; this.tex.anisotropy = 8;
        this.draw = draw; this.buttons = []; this.hover = new Set(); this.hoverKey = ''; this.dirty = true; this.mesh = null;
        this.state = {};
        terminals.push(this);
    }
    createMesh(w, h) {
        this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: this.tex, toneMapped: false }));
        this.mesh.userData.terminal = this;
        return this.mesh;
    }
    redraw() { this.buttons = []; this.draw(this); this.tex.needsUpdate = true; this.dirty = false; }
    rrect(x, y, w, h, r) {
        const c = this.ctx; c.beginPath(); c.moveTo(x + r, y);
        c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
    }
    text(txt, x, y, size, col, align, bold) {
        const c = this.ctx;
        c.font = (bold ? 'bold ' : '') + size + 'px "Courier New", monospace'; c.fillStyle = col;
        c.textAlign = align || 'left'; c.textBaseline = 'middle'; c.fillText(txt, x, y);
    }
    btn(id, x, y, w, h, label, action, opt) {
        opt = opt || {};
        const c = this.ctx, hov = this.hover.has(id), dis = !!opt.disabled;
        const tone = opt.tone === 'bad' ? BAD_COL : (opt.tone === 'ok' ? OK_COL : (opt.tone === 'gold' ? GOLD : AMBER));
        this.rrect(x, y, w, h, 6);
        c.fillStyle = dis ? '#1a1209' : (hov || opt.active ? tone : '#24170a'); c.fill();
        c.lineWidth = hov ? 4 : 2; c.strokeStyle = dis ? '#3a2a14' : tone; c.stroke();
        this.text(label, x + w / 2, y + h / 2 + 1, opt.size || 28, dis ? '#5a4628' : (hov || opt.active ? '#140c05' : tone), 'center', true);
        if (!dis) this.buttons.push({ id: id, x: x, y: y, w: w, h: h, action: action });
    }
    bar(x, y, w, h, frac, col) {
        const c = this.ctx; this.rrect(x, y, w, h, h / 2); c.fillStyle = '#2a1a0a'; c.fill();
        if (frac > 0) { this.rrect(x, y, Math.max(h, w * Math.min(1, frac)), h, h / 2); c.fillStyle = col || OK_COL; c.fill(); }
    }
    background() {
        const c = this.ctx; c.fillStyle = TERM_BG; c.fillRect(0, 0, this.W, this.H);
        const v = c.createRadialGradient(this.W / 2, this.H / 2, 200, this.W / 2, this.H / 2, this.W * 0.62);
        v.addColorStop(0, 'rgba(255,170,40,0.06)'); v.addColorStop(1, 'rgba(0,0,0,0.55)');
        c.fillStyle = v; c.fillRect(0, 0, this.W, this.H);
    }
    header(title, rightText, rightCol, back) {
        const c = this.ctx; c.fillStyle = '#2a1a08'; c.fillRect(0, 0, this.W, 70);
        c.fillStyle = AMBER_DIM; c.fillRect(0, 70, this.W, 2);
        this.text(title, 28, 36, 30, AMBER, 'left', true);
        if (back) this.btn('back', this.W - 178, 12, 160, 46, 'Back', back, { size: 24 });
        else if (rightText) this.text(rightText, this.W - 28, 36, 22, rightCol || AMBER_DIM, 'right', true);
    }
    scanlines() { const c = this.ctx; c.fillStyle = 'rgba(0,0,0,0.18)'; for (let y = 0; y < this.H; y += 3) c.fillRect(0, y, this.W, 1); }
}
export function wrapText(txt, max) {
    const words = String(txt).split(' '), lines = []; let line = '';
    for (const w of words) { if ((line + ' ' + w).trim().length > max) { lines.push(line.trim()); line = w; } else line += ' ' + w; }
    if (line.trim()) lines.push(line.trim());
    return lines;
}
export function markAllDirty() { for (const t of terminals) t.dirty = true; }
export function redrawTerminals() { for (const t of terminals) if (t.dirty && t.mesh) t.redraw(); }

// --- Laser z kontrolerów: celujesz w ekran, spust = kliknięcie ---
const raycaster = new THREE.Raycaster(), _m = new THREE.Matrix4();
let ctrls = [];
const lasers = [], cursors = [], hits = [null, null];
export function initPointers(controllers) {
    ctrls = controllers;
    controllers.forEach((c) => {
        const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -1)]), new THREE.LineBasicMaterial({ color: 0xffb347, transparent: true, opacity: 0.85 }));
        line.visible = false; c.add(line); lasers.push(line);
        const cur = new THREE.Mesh(new THREE.SphereGeometry(0.008, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffd27a }));
        cur.visible = false; scene.add(cur); cursors.push(cur);
    });
}
// desktopCam: na komputerze celujesz środkiem ekranu (celownik), klik = spust
export function updatePointers(desktopCam) {
    const hoverIds = new Map();
    const meshes = terminals.filter(t => t.mesh && t.mesh.parent).map(t => t.mesh);
    for (let i = 0; i < ctrls.length; i++) {
        hits[i] = null; lasers[i].visible = false; cursors[i].visible = false;
        if (!renderer.xr.isPresenting && desktopCam && i === 0 && meshes.length) {
            raycaster.setFromCamera({ x: 0, y: 0 }, desktopCam); raycaster.far = 4;
            const r = raycaster.intersectObjects(meshes, false);
            if (r.length && r[0].uv) {
                const h = r[0], term = h.object.userData.terminal, px = h.uv.x * term.W, py = (1 - h.uv.y) * term.H;
                const b = term.buttons.find(bt => px >= bt.x && px <= bt.x + bt.w && py >= bt.y && py <= bt.y + bt.h) || null;
                hits[0] = { term: term, btn: b };
                if (b) hoverIds.set(term, [b.id]);
            }
            continue;
        }
        if (!renderer.xr.isPresenting || !meshes.length) continue;
        const c = ctrls[i];
        _m.identity().extractRotation(c.matrixWorld);
        raycaster.ray.origin.setFromMatrixPosition(c.matrixWorld);
        raycaster.ray.direction.set(0, 0, -1).applyMatrix4(_m);
        raycaster.far = 4;
        const res = raycaster.intersectObjects(meshes, false);
        if (!res.length || !res[0].uv) continue;
        const h = res[0], term = h.object.userData.terminal, px = h.uv.x * term.W, py = (1 - h.uv.y) * term.H;
        const b = term.buttons.find(bt => px >= bt.x && px <= bt.x + bt.w && py >= bt.y && py <= bt.y + bt.h) || null;
        hits[i] = { term: term, btn: b };
        if (b) { if (!hoverIds.has(term)) hoverIds.set(term, []); hoverIds.get(term).push(b.id); }
        lasers[i].visible = true; lasers[i].scale.z = h.distance;
        cursors[i].visible = true; cursors[i].position.copy(h.point);
    }
    for (const t of terminals) {
        const ids = hoverIds.get(t) || [], key = ids.join('|');
        if (key !== t.hoverKey) { t.hoverKey = key; t.hover = new Set(ids); t.dirty = true; }
    }
}
export function isPointingAtScreen(i) { return !!hits[i]; }
export function clickPointer(i) {
    const h = hits[i];
    if (h && h.btn) { try { h.btn.action(); } catch (e) { console.error(e); } h.term.dirty = true; return true; }
    return false;
}

// --- Komunikaty przed oczami gracza (monety, nagrody, zadania) ---
const toastCanvas = document.createElement('canvas'); toastCanvas.width = 1024; toastCanvas.height = 160;
const toastTex = new THREE.CanvasTexture(toastCanvas); toastTex.colorSpace = THREE.SRGBColorSpace;
const toastMat = new THREE.MeshBasicMaterial({ map: toastTex, transparent: true, depthTest: false, depthWrite: false, toneMapped: false });
const toastMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.078), toastMat);
toastMesh.position.set(0, -0.13, -0.7); toastMesh.renderOrder = 999; toastMesh.visible = false; camera.add(toastMesh);
const toastQueue = []; let toastCur = null, toastTime = 0;
export function toast(msg, color) {
    toastQueue.push({ msg: msg, color: color || GOLD });
    if (toastQueue.length > 6) toastQueue.shift();
    const info = document.getElementById('info'); if (info) info.innerText = msg;
}
export function updateToast(dt) {
    if (!toastCur && toastQueue.length) {
        toastCur = toastQueue.shift(); toastTime = 2.6;
        const c = toastCanvas.getContext('2d');
        c.clearRect(0, 0, 1024, 160);
        c.fillStyle = 'rgba(20,12,5,0.86)'; c.strokeStyle = toastCur.color; c.lineWidth = 4;
        c.beginPath(); c.roundRect(8, 8, 1008, 144, 24); c.fill(); c.stroke();
        c.font = 'bold 46px "Courier New", monospace'; c.fillStyle = toastCur.color; c.textAlign = 'center'; c.textBaseline = 'middle';
        c.fillText(toastCur.msg.length > 40 ? toastCur.msg.slice(0, 39) + '…' : toastCur.msg, 512, 82);
        toastTex.needsUpdate = true; toastMesh.visible = true;
    }
    if (toastCur) {
        toastTime -= dt; toastMat.opacity = Math.min(1, toastTime * 3);
        if (toastTime <= 0) { toastCur = null; toastMesh.visible = false; }
    }
}
