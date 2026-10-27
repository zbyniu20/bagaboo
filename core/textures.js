// Proceduralne tekstury rysowane na canvasie (bez plików graficznych)
import * as THREE from 'three';
import { GFX } from './config.js';

export function mkRng(seed) {
    let a = seed >>> 0;
    return function() {
        a = (a + 0x6D2B79F5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}
export function makeCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
export function toTex(c, repeat) {
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 16;
    if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; }
    return t;
}
export function radial(ctx, x, y, r, c0, c1) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, c0); g.addColorStop(1, c1);
    ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
}
export function crackWalk(ctx, R, S, n, steps, col, wMin, wMax, stepLen) {
    ctx.lineCap = 'round';
    for (let i = 0; i < n; i++) {
        let x = R() * S, y = R() * S, a = R() * 6.28;
        ctx.strokeStyle = col; ctx.lineWidth = wMin + R() * (wMax - wMin);
        ctx.beginPath(); ctx.moveTo(x, y);
        for (let k = 0; k < steps; k++) { a += (R() - 0.5) * 1.05; x += Math.cos(a) * (stepLen + R() * stepLen * 1.6); y += Math.sin(a) * (stepLen + R() * stepLen * 1.6); ctx.lineTo(x, y); }
        ctx.stroke();
    }
}
export function speckle(ctx, R, S, n, darkA, lightA) {
    for (let i = 0; i < n; i++) {
        ctx.fillStyle = R() > 0.5 ? 'rgba(0,0,0,' + (R() * darkA) + ')' : 'rgba(255,255,255,' + (R() * lightA) + ')';
        ctx.fillRect(R() * S, R() * S, 1 + R() * 2, 1 + R() * 2);
    }
}

export function handPrint(ctx, x, y, s, rot, R) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
    ctx.fillStyle = 'rgba(105,0,0,0.65)';
    ctx.beginPath(); ctx.ellipse(0, 0, 26, 32, 0, 0, 7); ctx.fill();
    const lens = [30, 42, 48, 44, 32];
    for (let i = 0; i < 5; i++) {
        const ang = -Math.PI / 2 + (i - 2) * 0.4, len = lens[i];
        ctx.beginPath(); ctx.ellipse(Math.cos(ang) * (30 + len / 2), Math.sin(ang) * (30 + len / 2), 8, len / 2, ang + Math.PI / 2, 0, 7); ctx.fill();
    }
    ctx.fillRect(-9, 30, 6, 60 + R() * 80);
    ctx.restore();
}

export function createWallTexture() {
    const S = 1024, RES = GFX.surfaceRes, c = makeCanvas(RES, RES), ctx = c.getContext('2d'), R = mkRng(1337);
    ctx.scale(RES / S, RES / S);
    ctx.fillStyle = '#5d6266'; ctx.fillRect(0, 0, S, S);
    speckle(ctx, R, S, 70000, 0.18, 0.05);
    for (let i = 0; i < 46; i++) { const x = R() * S, y = R() * S, r = 60 + R() * 180; radial(ctx, x, y, r, R() > 0.35 ? 'rgba(10,6,6,0.22)' : 'rgba(140,140,150,0.07)', 'rgba(0,0,0,0)'); }
    for (let i = 0; i <= S; i += 256) {
        ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(i - 2, 0, 4, S); ctx.fillRect(0, i - 2, S, 4);
        ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fillRect(i + 2, 0, 2, S); ctx.fillRect(0, i + 2, S, 2);
    }
    for (let x = 0; x <= S; x += 256) for (let y = 0; y <= S; y += 256) for (const o of [[14, 14], [-14, 14], [14, -14], [-14, -14]]) {
        ctx.fillStyle = 'rgba(20,20,22,0.8)'; ctx.beginPath(); ctx.arc(x + o[0], y + o[1], 4, 0, 7); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.beginPath(); ctx.arc(x + o[0] - 1, y + o[1] - 1, 1.6, 0, 7); ctx.fill();
    }
    for (let i = 0; i < 16; i++) {
        const x = R() * S, w = 8 + R() * 26, y = R() * S * 0.6, l = 160 + R() * 420;
        const g = ctx.createLinearGradient(0, y, 0, y + l); g.addColorStop(0, 'rgba(110,50,18,0.4)'); g.addColorStop(1, 'rgba(110,50,18,0)');
        ctx.fillStyle = g; ctx.fillRect(x, y, w, l);
    }
    crackWalk(ctx, R, S, 12, 28, 'rgba(0,0,0,0.65)', 1, 2.8, 8);
    for (let i = 0; i < 14; i++) {
        const x = R() * S, y = R() * S * 0.5, l = 80 + R() * 320, w = 5 + R() * 10;
        ctx.fillStyle = 'rgba(88,0,0,0.7)'; ctx.fillRect(x - w / 2, y, w, l); ctx.beginPath(); ctx.arc(x, y + l, w * 0.8, 0, 7); ctx.fill();
        ctx.fillStyle = 'rgba(150,10,10,0.25)'; ctx.fillRect(x - w / 2, y, w * 0.3, l);
    }
    for (let i = 0; i < 24; i++) {
        const x = R() * S, y = R() * S, r = 3 + R() * 18;
        ctx.fillStyle = 'rgba(95,0,0,0.6)'; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
        for (let k = 0; k < 7; k++) { const a = R() * 6.28, d = r + R() * r * 3; ctx.beginPath(); ctx.arc(x + Math.cos(a) * d, y + Math.sin(a) * d, 1 + R() * 3, 0, 7); ctx.fill(); }
    }
    for (let i = 0; i < 4; i++) handPrint(ctx, 100 + R() * (S - 200), 140 + R() * (S - 300), 0.7 + R() * 0.5, R() * 0.8 - 0.4, R);
    const vg = ctx.createRadialGradient(S / 2, S / 2, S * 0.3, S / 2, S / 2, S * 0.75);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.35)');
    ctx.fillStyle = vg; ctx.fillRect(0, 0, S, S);
    return toTex(c, true);
}

export function createFloorTexture() {
    const S = 1024, RES = GFX.surfaceRes, c = makeCanvas(RES, RES), ctx = c.getContext('2d'), R = mkRng(4242);
    ctx.scale(RES / S, RES / S);
    for (let ty = 0; ty < 4; ty++) for (let tx = 0; tx < 4; tx++) {
        const v = (R() * 18) | 0;
        ctx.fillStyle = 'rgb(' + (74 + v) + ',' + (72 + v) + ',' + (70 + v) + ')'; ctx.fillRect(tx * 256, ty * 256, 256, 256);
    }
    speckle(ctx, R, S, 60000, 0.2, 0.04);
    for (let i = 0; i < 40; i++) radial(ctx, R() * S, R() * S, 40 + R() * 150, 'rgba(8,4,4,0.3)', 'rgba(0,0,0,0)');
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    for (let i = 0; i <= 4; i++) { ctx.fillRect(i * 256 - 3, 0, 6, S); ctx.fillRect(0, i * 256 - 3, S, 6); }
    ctx.lineCap = 'round';
    for (let i = 0; i < 6; i++) {
        ctx.strokeStyle = 'rgba(75,0,0,' + (0.35 + R() * 0.3) + ')'; ctx.lineWidth = 14 + R() * 26;
        const x0 = R() * S, y0 = R() * S;
        ctx.beginPath(); ctx.moveTo(x0, y0);
        ctx.bezierCurveTo(x0 + R() * 300 - 150, y0 + R() * 300 - 150, x0 + R() * 400 - 200, y0 + R() * 400 - 200, x0 + R() * 500 - 250, y0 + R() * 500 - 250);
        ctx.stroke();
    }
    crackWalk(ctx, R, S, 14, 24, 'rgba(0,0,0,0.7)', 1, 3, 8);
    for (let i = 0; i < 40; i++) { ctx.fillStyle = 'rgba(90,0,0,0.55)'; ctx.beginPath(); ctx.arc(R() * S, R() * S, 2 + R() * 9, 0, 7); ctx.fill(); }
    return toTex(c, true);
}

export function createFloorRoughTexture() {
    const S = 512, c = makeCanvas(S, S), ctx = c.getContext('2d'), R = mkRng(808);
    ctx.fillStyle = 'rgb(205,205,205)'; ctx.fillRect(0, 0, S, S);
    for (let i = 0; i < 5000; i++) { const v = (150 + R() * 80) | 0; ctx.fillStyle = 'rgba(' + v + ',' + v + ',' + v + ',0.35)'; ctx.fillRect(R() * S, R() * S, 2 + R() * 4, 2 + R() * 4); }
    for (let i = 0; i < 26; i++) {
        const x = R() * S, y = R() * S, r = 22 + R() * 70;
        for (const dx of [-S, 0, S]) for (const dy of [-S, 0, S]) {
            const g = ctx.createRadialGradient(x + dx, y + dy, 0, x + dx, y + dy, r);
            g.addColorStop(0, 'rgba(30,30,30,0.95)'); g.addColorStop(0.7, 'rgba(60,60,60,0.7)'); g.addColorStop(1, 'rgba(205,205,205,0)');
            ctx.fillStyle = g; ctx.fillRect(x + dx - r, y + dy - r, r * 2, r * 2);
        }
    }
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.NoColorSpace; t.anisotropy = 8;
    return t;
}

export function createPlasterTexture() {
    const S = 512, c = makeCanvas(S, S), ctx = c.getContext('2d'), R = mkRng(77);
    ctx.fillStyle = '#cdc5b6'; ctx.fillRect(0, 0, S, S);
    speckle(ctx, R, S, 20000, 0.07, 0.07);
    for (let i = 0; i < 14; i++) radial(ctx, R() * S, R() * S, 30 + R() * 90, 'rgba(70,50,30,0.22)', 'rgba(0,0,0,0)');
    crackWalk(ctx, R, S, 16, 20, 'rgba(30,20,15,0.8)', 0.8, 2.2, 5);
    for (let i = 0; i < 14; i++) {
        const x = R() * S, y = R() * S * 0.6, l = 40 + R() * 200, w = 2 + R() * 5;
        ctx.fillStyle = 'rgba(110,8,8,0.75)'; ctx.fillRect(x, y, w, l); ctx.beginPath(); ctx.arc(x + w / 2, y + l, w * 0.9, 0, 7); ctx.fill();
    }
    return toTex(c, true);
}

export function createSkinTexture() {
    const S = 256, c = makeCanvas(S, S), ctx = c.getContext('2d'), R = mkRng(4321);
    ctx.fillStyle = '#f2e6dd'; ctx.fillRect(0, 0, S, S);
    for (let i = 0; i < 9000; i++) {
        ctx.fillStyle = R() > 0.5 ? 'rgba(120,60,50,' + (R() * 0.08) + ')' : 'rgba(255,240,230,' + (R() * 0.06) + ')';
        ctx.fillRect(R() * S, R() * S, 1 + R() * 1.5, 1 + R() * 1.5);
    }
    for (let i = 0; i < 14; i++) radial(ctx, R() * S, R() * S, 12 + R() * 30, 'rgba(200,90,80,0.12)', 'rgba(0,0,0,0)');
    ctx.strokeStyle = 'rgba(90,40,35,0.14)'; ctx.lineWidth = 1;
    for (let i = 0; i < 70; i++) { const x = R() * S, y = R() * S; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + (R() - 0.5) * 20, y + (R() - 0.5) * 6); ctx.stroke(); }
    return toTex(c, true);
}

export function createWoodTexture() {
    const S = 512, c = makeCanvas(S, S), ctx = c.getContext('2d'), R = mkRng(2718);
    ctx.fillStyle = '#6b4a2d'; ctx.fillRect(0, 0, S, S);
    for (let p = 0; p < 4; p++) {
        const y0 = p * 128, v = (R() * 26) | 0;
        ctx.fillStyle = 'rgb(' + (96 + v) + ',' + (68 + v) + ',' + (40 + v) + ')'; ctx.fillRect(0, y0, S, 126);
        for (let i = 0; i < 40; i++) {
            ctx.strokeStyle = 'rgba(30,18,8,' + (0.1 + R() * 0.2) + ')'; ctx.lineWidth = 1 + R() * 1.6;
            const y = y0 + R() * 126; ctx.beginPath(); ctx.moveTo(0, y);
            ctx.bezierCurveTo(S * 0.3, y + (R() - 0.5) * 8, S * 0.7, y + (R() - 0.5) * 8, S, y + (R() - 0.5) * 6); ctx.stroke();
        }
        ctx.fillStyle = 'rgba(10,5,2,0.85)'; ctx.fillRect(0, y0 + 126, S, 2);
        ctx.fillStyle = 'rgba(20,20,20,0.9)';
        for (const nx of [18, S - 18]) { ctx.beginPath(); ctx.arc(nx, y0 + 18, 3, 0, 7); ctx.fill(); ctx.beginPath(); ctx.arc(nx, y0 + 108, 3, 0, 7); ctx.fill(); }
    }
    for (let i = 0; i < 9; i++) {
        const x = R() * S, y = R() * S * 0.5, l = 60 + R() * 260, w = 3 + R() * 6;
        ctx.fillStyle = 'rgba(95,0,0,0.65)'; ctx.fillRect(x, y, w, l); ctx.beginPath(); ctx.arc(x + w / 2, y + l, w * 0.8, 0, 7); ctx.fill();
    }
    for (let i = 0; i < 12; i++) radial(ctx, R() * S, R() * S, 20 + R() * 60, 'rgba(15,8,3,0.35)', 'rgba(0,0,0,0)');
    return toTex(c, true);
}

function _createLeafTexture() {
    const S = 128, c = makeCanvas(S, S), ctx = c.getContext('2d'), R = mkRng(64);
    ctx.translate(64, 64);
    ctx.fillStyle = '#9a6a3a';
    ctx.beginPath(); ctx.moveTo(0, -58); ctx.bezierCurveTo(42, -30, 40, 30, 0, 58); ctx.bezierCurveTo(-40, 30, -42, -30, 0, -58); ctx.fill();
    ctx.strokeStyle = 'rgba(40,20,5,0.75)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, -56); ctx.lineTo(0, 60); ctx.stroke();
    ctx.lineWidth = 1.2;
    for (let i = -4; i <= 4; i++) { ctx.beginPath(); ctx.moveTo(0, i * 11); ctx.lineTo(26, i * 11 - 10); ctx.moveTo(0, i * 11); ctx.lineTo(-26, i * 11 - 10); ctx.stroke(); }
    for (let i = 0; i < 18; i++) { ctx.fillStyle = 'rgba(50,25,8,' + (0.2 + R() * 0.3) + ')'; ctx.beginPath(); ctx.arc((R() - 0.5) * 50, (R() - 0.5) * 90, 1 + R() * 4, 0, 7); ctx.fill(); }
    return toTex(c, false);
}

function _createPaperTexture() {
    const W = 256, H = 360, c = makeCanvas(W, H), ctx = c.getContext('2d'), R = mkRng(99);
    ctx.fillStyle = '#d8d0bc'; ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 2500; i++) { ctx.fillStyle = 'rgba(90,70,40,' + (R() * 0.08) + ')'; ctx.fillRect(R() * W, R() * H, 2, 2); }
    ctx.fillStyle = 'rgba(30,30,40,0.55)';
    for (let y = 40; y < H - 30; y += 14) { let x = 22; while (x < W - 30) { const w = 8 + R() * 30; ctx.fillRect(x, y, w, 3); x += w + 6; } }
    ctx.strokeStyle = 'rgba(80,60,40,0.35)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, H * 0.5); ctx.lineTo(W, H * 0.48); ctx.stroke();
    radial(ctx, W * 0.7, H * 0.7, 70, 'rgba(110,0,0,0.75)', 'rgba(110,0,0,0)');
    return toTex(c, false);
}

function _createMistTexture() {
    const S = 512, c = makeCanvas(S, S), ctx = c.getContext('2d'), R = mkRng(1212);
    for (let i = 0; i < 70; i++) {
        const x = R() * S, y = R() * S, r = 40 + R() * 130, a = 0.05 + R() * 0.12;
        for (const dx of [-S, 0, S]) for (const dy of [-S, 0, S]) radial(ctx, x + dx, y + dy, r, 'rgba(255,255,255,' + a + ')', 'rgba(255,255,255,0)');
    }
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping;
    return t;
}

function _createBloodPoolTexture() {
    const S = 512, c = makeCanvas(S, S), ctx = c.getContext('2d'), R = mkRng(909);
    ctx.fillStyle = '#3d0000';
    for (let i = 0; i < 30; i++) { const a = R() * 6.28, d = R() * 100; ctx.beginPath(); ctx.arc(256 + Math.cos(a) * d, 256 + Math.sin(a) * d, 35 + R() * 70, 0, 7); ctx.fill(); }
    ctx.fillStyle = 'rgba(110,5,5,0.5)';
    for (let i = 0; i < 10; i++) { ctx.beginPath(); ctx.arc(230 + R() * 50, 230 + R() * 50, 20 + R() * 40, 0, 7); ctx.fill(); }
    ctx.globalCompositeOperation = 'destination-in';
    const m = ctx.createRadialGradient(256, 256, 0, 256, 256, 256);
    m.addColorStop(0, 'rgba(255,255,255,1)'); m.addColorStop(0.62, 'rgba(255,255,255,0.95)'); m.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = m; ctx.fillRect(0, 0, S, S);
    return toTex(c, false);
}

export function createDotTexture() {
    const c = makeCanvas(64, 64), ctx = c.getContext('2d');
    radial(ctx, 32, 32, 32, 'rgba(255,255,255,1)', 'rgba(255,255,255,0)');
    return new THREE.CanvasTexture(c);
}

function _createSkyBaseTexture(sky) {
    const W = 1024, H = 1024, c = makeCanvas(W, H), ctx = c.getContext('2d');
    const g = ctx.createLinearGradient(0, 0, W, 0);
    for (const s of sky.base) g.addColorStop(s[0], s[1]);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    if (sky.sunGlow) {
        const r = ctx.createRadialGradient(0, H * 0.65, 0, 0, H * 0.65, W * 0.7);
        r.addColorStop(0, 'rgba(255,214,150,0.9)'); r.addColorStop(0.25, 'rgba(255,150,90,0.45)'); r.addColorStop(1, 'rgba(255,120,80,0)');
        ctx.fillStyle = r; ctx.fillRect(0, 0, W, H);
    }
    return toTex(c, false);
}
function _createCloudLayerTexture(spec) {
    const S = 1024, c = makeCanvas(S, S), ctx = c.getContext('2d'), R = mkRng(555);
    for (const L of spec) for (let i = 0; i < L[1]; i++) {
        const x = R() * S, y = R() * S, r = L[2] + R() * (L[3] - L[2]), a = L[4] + R() * (L[5] - L[4]);
        for (const dx of [-S, 0, S]) radial(ctx, x + dx, y, r, 'rgba(' + L[0] + ',' + a + ')', 'rgba(' + L[0] + ',0)');
    }
    return toTex(c, true);
}
function _createShaftTexture() {
    const c = makeCanvas(8, 256), ctx = c.getContext('2d');
    const g = ctx.createLinearGradient(0, 0, 0, 256);
    g.addColorStop(0, 'rgba(255,255,255,0.95)'); g.addColorStop(0.55, 'rgba(255,255,255,0.28)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 8, 256);
    return new THREE.CanvasTexture(c);
}

function _createSigilTexture() {
    const S = 1024, c = makeCanvas(S, S), ctx = c.getContext('2d'), R = mkRng(2024), cx = S / 2, cy = S / 2;
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    function ring(r, w, a) { ctx.strokeStyle = 'rgba(95,0,0,' + a + ')'; ctx.lineWidth = w; ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.stroke(); }
    ring(480, 14, 0.8); ring(455, 4, 0.7); ring(330, 8, 0.75); ring(305, 3, 0.6);
    ctx.strokeStyle = 'rgba(105,0,0,0.85)'; ctx.lineWidth = 10; ctx.beginPath();
    for (let i = 0; i <= 5; i++) { const a = -Math.PI / 2 + i * 4 * Math.PI / 5; if (i === 0) ctx.moveTo(cx + Math.cos(a) * 330, cy + Math.sin(a) * 330); else ctx.lineTo(cx + Math.cos(a) * 330, cy + Math.sin(a) * 330); }
    ctx.stroke();
    for (let i = 0; i < 36; i++) {
        const a = i / 36 * Math.PI * 2;
        ctx.save(); ctx.translate(cx + Math.cos(a) * 392, cy + Math.sin(a) * 392); ctx.rotate(a + Math.PI / 2);
        ctx.strokeStyle = 'rgba(100,0,0,0.8)'; ctx.lineWidth = 4; ctx.beginPath();
        const n = 2 + ((R() * 3) | 0); let x = -10, y = -24; ctx.moveTo(x, y);
        for (let k = 0; k < n; k++) { x = (R() - 0.5) * 26; y += 48 / n; ctx.lineTo(x, y); }
        ctx.moveTo(-14, (R() - 0.5) * 40); ctx.lineTo(14, (R() - 0.5) * 40); ctx.stroke(); ctx.restore();
    }
    for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + i * 2 * Math.PI / 5; ctx.strokeStyle = 'rgba(100,0,0,0.8)'; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(cx + Math.cos(a) * 330, cy + Math.sin(a) * 330, 26, 0, 7); ctx.stroke(); }
    ctx.fillStyle = 'rgba(90,0,0,0.7)';
    for (let i = 0; i < 70; i++) { const a = R() * 6.28, d = 300 + R() * 190; ctx.beginPath(); ctx.arc(cx + Math.cos(a) * d, cy + Math.sin(a) * d, 1.5 + R() * 5, 0, 7); ctx.fill(); }
    for (let i = 0; i < 20; i++) { const a = R() * 6.28, d = 460 + R() * 30; ctx.fillRect(cx + Math.cos(a) * d, cy + Math.sin(a) * d, 3 + R() * 3, 20 + R() * 60); }
    ctx.globalCompositeOperation = 'destination-in';
    const m = ctx.createRadialGradient(cx, cy, 0, cx, cy, S / 2);
    m.addColorStop(0, 'rgba(255,255,255,1)'); m.addColorStop(0.9, 'rgba(255,255,255,1)'); m.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = m; ctx.fillRect(0, 0, S, S);
    return toTex(c, false);
}

function _createCobwebTexture() {
    const S = 512, c = makeCanvas(S, S), ctx = c.getContext('2d'), R = mkRng(31);
    ctx.strokeStyle = 'rgba(238,238,232,0.7)'; ctx.lineWidth = 1.3; ctx.lineCap = 'round';
    const cx = S / 2, cy = 0, spokes = [];
    for (let i = 0; i < 11; i++) spokes.push(Math.PI * (0.08 + 0.84 * i / 10) + (R() - 0.5) * 0.05);
    for (const a of spokes) { ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a) * S * 0.98, cy + Math.sin(a) * S * 0.98); ctx.stroke(); }
    for (let r = 40; r < S * 0.95; r += 34 + R() * 12) {
        ctx.beginPath(); let px = 0, py = 0;
        for (let i = 0; i < spokes.length; i++) {
            const a = spokes[i], rr = r * (0.92 + R() * 0.12), x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr;
            if (i === 0) ctx.moveTo(x, y); else ctx.quadraticCurveTo((x + px) / 2, (y + py) / 2 + 12, x, y);
            px = x; py = y;
        }
        ctx.stroke();
    }
    return toTex(c, false);
}

export function createEyeballTexture() {
    const c = makeCanvas(256, 256), ctx = c.getContext('2d');
    ctx.fillStyle = '#dddddd'; ctx.fillRect(0, 0, 256, 256);
    ctx.strokeStyle = '#aa0000'; ctx.lineWidth = 2;
    for (let i = 0; i < 40; i++) { ctx.beginPath(); ctx.moveTo(128, 128); ctx.lineTo(128 + Math.cos(i) * 256, 128 + Math.sin(i) * 256); ctx.stroke(); }
    ctx.fillStyle = '#440000'; ctx.beginPath(); ctx.arc(128, 128, 40, 0, 7); ctx.fill();
    ctx.fillStyle = '#000000'; ctx.beginPath(); ctx.arc(128, 128, 15, 0, 7); ctx.fill();
    return new THREE.CanvasTexture(c);
}

// Pasy ostrzegawcze na obręczy trampoliny
function _createHazardTexture() {
    const c = makeCanvas(256, 64), ctx = c.getContext('2d');
    ctx.fillStyle = '#140909'; ctx.fillRect(0, 0, 256, 64);
    ctx.fillStyle = '#c01808';
    for (let x = -64; x < 320; x += 48) { ctx.beginPath(); ctx.moveTo(x, 64); ctx.lineTo(x + 24, 64); ctx.lineTo(x + 56, 0); ctx.lineTo(x + 32, 0); ctx.closePath(); ctx.fill(); }
    const t = toTex(c, true); t.repeat.set(10, 1);
    return t;
}
// Tkana mata trampoliny z zabrudzeniami
function _createTrampMatTexture() {
    const S = 512, c = makeCanvas(S, S), ctx = c.getContext('2d'), R = mkRng(5150);
    ctx.fillStyle = '#0e0e11'; ctx.fillRect(0, 0, S, S);
    ctx.fillStyle = 'rgba(255,255,255,0.04)';
    for (let i = 0; i < S; i += 6) { ctx.fillRect(i, 0, 2, S); ctx.fillRect(0, i, S, 2); }
    ctx.strokeStyle = 'rgba(190,30,20,0.85)'; ctx.lineWidth = 10; ctx.beginPath(); ctx.arc(256, 256, 205, 0, 7); ctx.stroke();
    ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(256, 256, 120, 0, 7); ctx.stroke();
    ctx.fillStyle = 'rgba(190,30,20,0.9)'; ctx.font = 'bold 56px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('JUMP', 256, 256);
    for (let i = 0; i < 9; i++) radial(ctx, R() * S, R() * S, 20 + R() * 50, 'rgba(90,0,0,0.5)', 'rgba(90,0,0,0)');
    for (let i = 0; i < 30; i++) radial(ctx, R() * S, R() * S, 30 + R() * 60, 'rgba(255,255,255,0.03)', 'rgba(255,255,255,0)');
    return toTex(c, false);
}

// Tekstury kosmetyków ze sklepu
export function createCamoTexture() {
    const S = 256, c = makeCanvas(S, S), ctx = c.getContext('2d'), R = mkRng(7070);
    ctx.fillStyle = '#4a5233'; ctx.fillRect(0, 0, S, S);
    const cols = ['#2f3521', '#6b6a3f', '#1e2016', '#5a4a2e'];
    for (let i = 0; i < 70; i++) {
        ctx.fillStyle = cols[i % 4]; ctx.beginPath();
        const x = R() * S, y = R() * S, r = 10 + R() * 26;
        for (let k = 0; k < 7; k++) { const a = k / 7 * 6.28, rr = r * (0.6 + R() * 0.6); if (k === 0) ctx.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); else ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
        ctx.closePath(); ctx.fill();
    }
    return toTex(c, true);
}
export function createBandageTexture() {
    const S = 256, c = makeCanvas(S, S), ctx = c.getContext('2d'), R = mkRng(8080);
    ctx.fillStyle = '#d8d0c0'; ctx.fillRect(0, 0, S, S);
    for (let y = 0; y < S; y += 18) { ctx.fillStyle = 'rgba(120,100,80,0.25)'; ctx.fillRect(0, y, S, 2); }
    for (let i = 0; i < 6000; i++) { ctx.fillStyle = 'rgba(90,70,50,' + (R() * 0.08) + ')'; ctx.fillRect(R() * S, R() * S, 2, 2); }
    for (let i = 0; i < 6; i++) radial(ctx, R() * S, R() * S, 20 + R() * 40, 'rgba(130,0,0,0.75)', 'rgba(130,0,0,0)');
    return toTex(c, true);
}

// Pamięć podręczna tekstur poziomów: przy powrocie do lobby nie rysujemy ich od nowa (szybsze ładowanie)
const _texCache = new Map();
function cached(name, fn) {
    return function () {
        const key = name + JSON.stringify(Array.from(arguments));
        if (!_texCache.has(key)) _texCache.set(key, fn.apply(null, arguments));
        return _texCache.get(key);
    };
}
export const createSkyBaseTexture = cached('createSkyBaseTexture', _createSkyBaseTexture);
export const createCloudLayerTexture = cached('createCloudLayerTexture', _createCloudLayerTexture);
export const createSigilTexture = cached('createSigilTexture', _createSigilTexture);
export const createBloodPoolTexture = cached('createBloodPoolTexture', _createBloodPoolTexture);
export const createCobwebTexture = cached('createCobwebTexture', _createCobwebTexture);
export const createLeafTexture = cached('createLeafTexture', _createLeafTexture);
export const createPaperTexture = cached('createPaperTexture', _createPaperTexture);
export const createMistTexture = cached('createMistTexture', _createMistTexture);
export const createHazardTexture = cached('createHazardTexture', _createHazardTexture);
export const createTrampMatTexture = cached('createTrampMatTexture', _createTrampMatTexture);
export const createShaftTexture = cached('createShaftTexture', _createShaftTexture);
