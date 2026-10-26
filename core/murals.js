// Wektorowe potwory na muralach (krzywe Béziera na canvasie)
import { GFX } from './config.js';
import { makeCanvas, toTex, mkRng, radial } from './textures.js';

export function glowEye(ctx, x, y, r, col, slit) {
    if (slit === undefined) slit = true;
    radial(ctx, x, y, r * 3.2, col + 'cc', col + '00');
    ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(x, y, r * 1.15, r * 0.8, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#fff7d0'; ctx.beginPath(); ctx.ellipse(x, y, r * 0.55, r * 0.4, 0, 0, 7); ctx.fill();
    if (slit) { ctx.fillStyle = '#000'; ctx.beginPath(); ctx.ellipse(x, y, r * 0.16, r * 0.75, 0, 0, 7); ctx.fill(); }
}
function paintBackdrop(ctx, R, glow) {
    const g = ctx.createRadialGradient(512, 512, 40, 512, 512, 540);
    g.addColorStop(0, 'rgba(14,0,0,0.97)'); g.addColorStop(0.7, 'rgba(8,0,0,0.9)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 1024, 1024);
    if (glow) { const h = ctx.createRadialGradient(512, 470, 10, 512, 470, 430); h.addColorStop(0, glow); h.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = h; ctx.fillRect(0, 0, 1024, 1024); }
    ctx.lineCap = 'round';
    for (let i = 0; i < 40; i++) {
        const a = R() * 6.283, r1 = 420 + R() * 80, l = 30 + R() * 120, x = 512 + Math.cos(a) * r1, y = 512 + Math.sin(a) * r1;
        ctx.strokeStyle = 'rgba(100,0,0,' + (0.25 + R() * 0.4) + ')'; ctx.lineWidth = 2 + R() * 9;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * l * 0.3, y + Math.sin(a) * l * 0.3 + l * 0.6); ctx.stroke();
    }
}
export function bloodText(ctx, txt, x, y, size) {
    ctx.save();
    ctx.font = 'bold ' + size + 'px serif'; ctx.textAlign = 'center';
    if ('letterSpacing' in ctx) ctx.letterSpacing = '8px';
    ctx.fillStyle = '#7a0000'; ctx.strokeStyle = '#200000'; ctx.lineWidth = 4;
    ctx.strokeText(txt, x, y); ctx.fillText(txt, x, y);
    const w = ctx.measureText(txt).width;
    for (let i = 0; i < 14; i++) { ctx.fillStyle = 'rgba(122,0,0,0.85)'; ctx.fillRect(x - w / 2 + Math.random() * w, y, 3 + Math.random() * 4, 10 + Math.random() * 40); }
    ctx.restore();
}

export function monsterScream(ctx, R) {
    paintBackdrop(ctx, R, 'rgba(110,0,0,0.55)');
    const cx = 512;
    ctx.beginPath(); ctx.moveTo(cx, 110);
    ctx.bezierCurveTo(cx + 300, 110, cx + 350, 430, cx + 230, 660); ctx.bezierCurveTo(cx + 190, 800, cx + 110, 940, cx, 940);
    ctx.bezierCurveTo(cx - 110, 940, cx - 190, 800, cx - 230, 660); ctx.bezierCurveTo(cx - 350, 430, cx - 300, 110, cx, 110);
    let g = ctx.createLinearGradient(0, 110, 0, 940); g.addColorStop(0, '#7a7266'); g.addColorStop(0.5, '#4a443b'); g.addColorStop(1, '#1c1814');
    ctx.fillStyle = g; ctx.fill(); ctx.lineWidth = 7; ctx.strokeStyle = '#050000'; ctx.stroke();
    ctx.strokeStyle = 'rgba(0,0,0,0.75)'; ctx.lineWidth = 3;
    for (let i = 0; i < 7; i++) { let x = cx - 150 + R() * 300, y = 130 + R() * 80; ctx.beginPath(); ctx.moveTo(x, y); for (let k = 0; k < 9; k++) { x += (R() - 0.5) * 50; y += 30 + R() * 30; ctx.lineTo(x, y); } ctx.stroke(); }
    for (const s of [-1, 1]) {
        ctx.save(); ctx.translate(cx + s * 118, 370); ctx.rotate(s * 0.22); ctx.fillStyle = '#000'; ctx.beginPath(); ctx.ellipse(0, 0, 92, 68, 0, 0, 7); ctx.fill(); ctx.restore();
        glowEye(ctx, cx + s * 118, 372, 24, '#ff2a00');
    }
    for (let i = 0; i < 7; i++) glowEye(ctx, cx - 170 + R() * 340, 170 + R() * 90, 7 + R() * 6, i % 2 ? '#ffb000' : '#ff2a00');
    for (const s of [-1, 1]) glowEye(ctx, cx + s * 190, 520, 9, '#ffb000');
    ctx.fillStyle = '#000'; ctx.beginPath(); ctx.moveTo(cx, 440); ctx.lineTo(cx - 34, 540); ctx.lineTo(cx + 34, 540); ctx.closePath(); ctx.fill();
    const my = 700, mrx = 150, mry = 190;
    ctx.fillStyle = '#030000'; ctx.beginPath(); ctx.ellipse(cx, my, mrx, mry, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#6a0a14'; ctx.beginPath(); ctx.moveTo(cx - 60, my + 120);
    ctx.bezierCurveTo(cx - 50, my + 260, cx + 50, my + 260, cx + 60, my + 120); ctx.bezierCurveTo(cx + 30, my + 60, cx - 30, my + 60, cx - 60, my + 120); ctx.fill();
    ctx.fillStyle = '#cfc4a2'; ctx.strokeStyle = '#150a00'; ctx.lineWidth = 2;
    for (let i = 0; i < 13; i++) {
        const a = Math.PI * (1.1 + 0.8 * (i / 12)), px = cx + mrx * Math.cos(a), py = my + mry * Math.sin(a), len = 50 + R() * 55, w = 13 + R() * 6;
        ctx.beginPath(); ctx.moveTo(px - w, py - 4); ctx.lineTo(px + w, py - 4); ctx.lineTo(px + (R() - 0.5) * 8, py + len); ctx.closePath(); ctx.fill(); ctx.stroke();
    }
    for (let i = 0; i < 11; i++) {
        const a = Math.PI * (0.12 + 0.76 * (i / 10)), px = cx + mrx * Math.cos(a), py = my + mry * Math.sin(a), len = 45 + R() * 50, w = 13 + R() * 6;
        ctx.beginPath(); ctx.moveTo(px - w, py + 4); ctx.lineTo(px + w, py + 4); ctx.lineTo(px + (R() - 0.5) * 8, py - len); ctx.closePath(); ctx.fill(); ctx.stroke();
    }
    ctx.strokeStyle = '#120a08'; ctx.lineWidth = 4;
    for (const s of [-1, 1]) for (let i = 0; i < 9; i++) { const y = 500 + i * 40, x = cx + s * (215 - i * 6); ctx.beginPath(); ctx.moveTo(x - 14, y - 10); ctx.lineTo(x + 14, y + 10); ctx.moveTo(x + 14, y - 10); ctx.lineTo(x - 14, y + 10); ctx.stroke(); }
    for (let i = 0; i < 16; i++) { ctx.fillStyle = 'rgba(120,0,0,0.75)'; ctx.fillRect(cx - 230 + R() * 460, 380 + R() * 120, 4 + R() * 7, 90 + R() * 220); }
    bloodText(ctx, 'TURN BACK', 512, 990, 80);
}

export function monsterTall(ctx, R) {
    paintBackdrop(ctx, R, 'rgba(50,0,0,0.5)');
    const cx = 512; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = '#0a0508';
    for (let i = 0; i < 8; i++) {
        const s = i < 4 ? -1 : 1, k = i % 4;
        ctx.lineWidth = 18 - k * 2; ctx.beginPath(); ctx.moveTo(cx + s * 20, 330);
        ctx.bezierCurveTo(cx + s * (180 + k * 60), 200 - k * 30, cx + s * (300 + k * 40), 500 + k * 50, cx + s * (380 - k * 20), 150 + k * 130 + R() * 60); ctx.stroke();
    }
    ctx.fillStyle = '#060606';
    ctx.beginPath(); ctx.moveTo(cx - 34, 290); ctx.lineTo(cx + 34, 290); ctx.lineTo(cx + 120, 330); ctx.lineTo(cx + 98, 980); ctx.lineTo(cx - 98, 980); ctx.lineTo(cx - 120, 330); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#8a8478'; ctx.beginPath(); ctx.moveTo(cx - 26, 290); ctx.lineTo(cx + 26, 290); ctx.lineTo(cx, 420); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#5a0000'; ctx.beginPath(); ctx.moveTo(cx - 9, 330); ctx.lineTo(cx + 9, 330); ctx.lineTo(cx + 16, 640); ctx.lineTo(cx, 675); ctx.lineTo(cx - 16, 640); ctx.closePath(); ctx.fill();
    const g = ctx.createLinearGradient(0, 80, 0, 300); g.addColorStop(0, '#cfc8b8'); g.addColorStop(1, '#4a463e');
    ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(cx, 190, 64, 110, 0, 0, 7); ctx.fill(); ctx.strokeStyle = '#000'; ctx.lineWidth = 4; ctx.stroke();
    ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 2;
    for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(cx - 40 + i * 20, 120); ctx.lineTo(cx - 34 + i * 17, 270); ctx.stroke(); }
    ctx.strokeStyle = '#ff1a00'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(cx - 34, 205); ctx.quadraticCurveTo(cx, 232, cx + 34, 205); ctx.stroke();
    for (const s of [-1, 1]) {
        ctx.strokeStyle = '#060606'; ctx.lineWidth = 34; ctx.beginPath(); ctx.moveTo(cx + s * 110, 350); ctx.bezierCurveTo(cx + s * 210, 520, cx + s * 150, 720, cx + s * 170, 900); ctx.stroke();
        ctx.lineWidth = 18; ctx.beginPath(); ctx.moveTo(cx + s * 170, 900); ctx.lineTo(cx + s * 178, 960); ctx.stroke();
        ctx.lineWidth = 5; ctx.strokeStyle = '#cfc8b8';
        for (let f = 0; f < 5; f++) { ctx.beginPath(); ctx.moveTo(cx + s * (162 + f * 5), 955); ctx.lineTo(cx + s * (150 + f * 14), 1012 + R() * 10); ctx.stroke(); }
    }
}

export function monsterSpider(ctx, R) {
    paintBackdrop(ctx, R, 'rgba(60,50,0,0.28)');
    const cx = 512, cy = 470;
    ctx.strokeStyle = 'rgba(200,200,190,0.26)'; ctx.lineWidth = 2;
    for (let i = 0; i < 18; i++) { const a = i / 18 * 6.283; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a) * 540, cy + Math.sin(a) * 540); ctx.stroke(); }
    for (let r = 70; r < 540; r += 55) {
        ctx.beginPath();
        for (let i = 0; i <= 18; i++) { const a = i / 18 * 6.283, rr = r * (1 + Math.sin(i * 1.7 + r) * 0.04), x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr + 6; if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); }
        ctx.stroke();
    }
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (const s of [-1, 1]) for (let i = 0; i < 4; i++) {
        const P = [[70, -20 + i * 22], [200 + i * 20, -280 + i * 75], [340, -150 + i * 80], [410 - i * 18, 150 + i * 95]];
        for (let k = 0; k < 3; k++) {
            const x0 = cx + s * P[k][0], y0 = cy + P[k][1], x1 = cx + s * P[k + 1][0], y1 = cy + P[k + 1][1];
            ctx.strokeStyle = '#0b0806'; ctx.lineWidth = [26, 17, 9][k]; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
            ctx.strokeStyle = 'rgba(130,105,70,0.35)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x0 - 2, y0 - 2); ctx.lineTo(x1 - 2, y1 - 2); ctx.stroke();
            ctx.strokeStyle = 'rgba(20,14,10,0.9)'; ctx.lineWidth = 1.5;
            for (let h = 0; h < 9; h++) { const t = R(), hx = x0 + (x1 - x0) * t, hy = y0 + (y1 - y0) * t; ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(hx + (R() - 0.5) * 34, hy + (R() - 0.5) * 34); ctx.stroke(); }
        }
    }
    let g = ctx.createRadialGradient(cx - 30, cy + 120, 10, cx, cy + 170, 230); g.addColorStop(0, '#2a1a14'); g.addColorStop(1, '#050303');
    ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(cx, cy + 170, 150, 215, 0, 0, 7); ctx.fill(); ctx.strokeStyle = '#000'; ctx.lineWidth = 5; ctx.stroke();
    ctx.fillStyle = '#b01010'; ctx.beginPath(); ctx.moveTo(cx - 42, cy + 110); ctx.lineTo(cx + 42, cy + 110); ctx.lineTo(cx + 6, cy + 190); ctx.lineTo(cx + 46, cy + 280); ctx.lineTo(cx - 46, cy + 280); ctx.lineTo(cx - 6, cy + 190); ctx.closePath(); ctx.fill();
    g = ctx.createRadialGradient(cx, cy - 30, 10, cx, cy - 20, 120); g.addColorStop(0, '#2c1c14'); g.addColorStop(1, '#080504');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy - 20, 108, 0, 7); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#d6cdb0';
    for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(cx + s * 22, cy + 50); ctx.quadraticCurveTo(cx + s * 62, cy + 110, cx + s * 30, cy + 160); ctx.quadraticCurveTo(cx + s * 34, cy + 110, cx + s * 8, cy + 60); ctx.closePath(); ctx.fill(); }
    for (const s of [-1, 1]) {
        glowEye(ctx, cx + s * 34, cy - 58, 14, '#ff2a00', false); glowEye(ctx, cx + s * 66, cy - 36, 10, '#ffb000', false);
        glowEye(ctx, cx + s * 22, cy - 96, 8, '#ff2a00', false); glowEye(ctx, cx + s * 62, cy - 84, 7, '#ffb000', false);
    }
}

function bezPt(p0, p1, p2, p3, t) {
    const u = 1 - t;
    return [u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0], u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1]];
}
function tentacle(ctx, p0, p1, p2, p3, r0, col) {
    let k = 0;
    for (let t = 0; t <= 1.0001; t += 0.012) {
        const p = bezPt(p0, p1, p2, p3, t), r = r0 * Math.pow(1 - t, 0.85) + 3;
        ctx.fillStyle = col; ctx.beginPath(); ctx.arc(p[0], p[1], r, 0, 7); ctx.fill();
        if ((k++) % 6 === 0 && r > 6) { ctx.fillStyle = 'rgba(120,70,100,0.55)'; ctx.beginPath(); ctx.arc(p[0] + r * 0.3, p[1] + r * 0.3, r * 0.28, 0, 7); ctx.fill(); }
    }
}
export function monsterEldritch(ctx, R) {
    paintBackdrop(ctx, R, 'rgba(60,0,80,0.45)');
    const cx = 512, cy = 500;
    for (let i = 0; i < 12; i++) {
        const a = i / 12 * 6.283 + 0.2;
        const e = [cx + Math.cos(a) * (470 + R() * 40), cy + Math.sin(a) * (470 + R() * 40)], c1 = [cx + Math.cos(a + 0.8) * 200, cy + Math.sin(a + 0.8) * 200], c2 = [cx + Math.cos(a - 0.7) * 340, cy + Math.sin(a - 0.7) * 340];
        tentacle(ctx, [cx, cy], c1, c2, e, 62 - (i % 3) * 8, i % 2 ? '#1a0b22' : '#12081a');
        for (let k = 0; k < 2; k++) { const p = bezPt([cx, cy], c1, c2, e, 0.35 + k * 0.3 + R() * 0.1); glowEye(ctx, p[0], p[1], 9 + R() * 5, k ? '#ffd000' : '#ff2a00'); }
    }
    let g = ctx.createRadialGradient(cx, cy, 20, cx, cy, 230); g.addColorStop(0, '#2b1230'); g.addColorStop(1, '#0a040e');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, 230, 0, 7); ctx.fill();
    ctx.strokeStyle = 'rgba(120,20,60,0.6)'; ctx.lineWidth = 3;
    for (let i = 0; i < 22; i++) { let a = R() * 6.283, r = 140; ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); for (let k = 0; k < 6; k++) { a += (R() - 0.5) * 0.6; r += 14 + R() * 10; ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); } ctx.stroke(); }
    ctx.fillStyle = '#a89c80'; ctx.beginPath(); ctx.ellipse(cx, cy, 170, 120, 0, 0, 7); ctx.fill();
    ctx.strokeStyle = 'rgba(170,10,10,0.7)'; ctx.lineWidth = 2.5;
    for (let i = 0; i < 34; i++) { const a = R() * 6.283; ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * 165, cy + Math.sin(a) * 115); ctx.lineTo(cx + Math.cos(a) * (70 + R() * 30), cy + Math.sin(a) * (50 + R() * 20)); ctx.stroke(); }
    g = ctx.createRadialGradient(cx, cy, 10, cx, cy, 86); g.addColorStop(0, '#ffe066'); g.addColorStop(0.6, '#ff7a00'); g.addColorStop(1, '#5a0a00');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, 86, 0, 7); ctx.fill();
    ctx.fillStyle = '#000'; ctx.beginPath(); ctx.ellipse(cx, cy, 15, 74, 0, 0, 7); ctx.fill();
    ctx.strokeStyle = '#050005'; ctx.lineWidth = 12; ctx.beginPath(); ctx.ellipse(cx, cy, 172, 122, 0, 0, 7); ctx.stroke();
    for (let i = 0; i < 18; i++) { const a = R() * 6.283, r = 185 + R() * 38; glowEye(ctx, cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.9, 8 + R() * 8, R() > 0.5 ? '#ffd000' : '#ff2a00'); }
}

export function monsterDemon(ctx, R) {
    paintBackdrop(ctx, R, 'rgba(220,70,0,0.55)');
    const cx = 512;
    for (let i = 0; i < 28; i++) {
        const x = cx - 420 + R() * 840, h = 200 + R() * 420, w = 40 + R() * 70;
        const g = ctx.createLinearGradient(0, 980, 0, 980 - h); g.addColorStop(0, 'rgba(255,90,0,0.55)'); g.addColorStop(1, 'rgba(255,200,0,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x - w, 980);
        ctx.bezierCurveTo(x - w, 980 - h * 0.4, x + (R() - 0.5) * 80, 980 - h * 0.7, x, 980 - h); ctx.bezierCurveTo(x + w * 0.3, 980 - h * 0.6, x + w, 980 - h * 0.3, x + w, 980); ctx.fill();
    }
    for (const s of [-1, 1]) {
        ctx.fillStyle = '#1a0c08'; ctx.strokeStyle = '#050000'; ctx.lineWidth = 5;
        ctx.beginPath(); ctx.moveTo(cx + s * 120, 250); ctx.bezierCurveTo(cx + s * 260, 250, cx + s * 330, 150, cx + s * 300, 30);
        ctx.bezierCurveTo(cx + s * 330, 170, cx + s * 270, 330, cx + s * 170, 380); ctx.closePath(); ctx.fill(); ctx.stroke();
    }
    ctx.beginPath(); ctx.moveTo(cx, 200);
    ctx.bezierCurveTo(cx + 200, 200, cx + 260, 380, cx + 200, 560); ctx.bezierCurveTo(cx + 170, 700, cx + 110, 850, cx, 890);
    ctx.bezierCurveTo(cx - 110, 850, cx - 170, 700, cx - 200, 560); ctx.bezierCurveTo(cx - 260, 380, cx - 200, 200, cx, 200);
    let g = ctx.createLinearGradient(0, 200, 0, 890); g.addColorStop(0, '#4a0e0a'); g.addColorStop(1, '#150505');
    ctx.fillStyle = g; ctx.fill(); ctx.lineWidth = 6; ctx.strokeStyle = '#050000'; ctx.stroke();
    ctx.lineCap = 'round'; ctx.strokeStyle = 'rgba(255,110,0,0.85)'; ctx.lineWidth = 3;
    for (let i = 0; i < 6; i++) { let x = cx - 120 + R() * 240, y = 215 + R() * 40; ctx.beginPath(); ctx.moveTo(x, y); for (let k = 0; k < 6; k++) { x += (R() - 0.5) * 40; y += 18 + R() * 20; ctx.lineTo(x, y); } ctx.stroke(); }
    ctx.strokeStyle = '#050000'; ctx.lineWidth = 26;
    for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(cx + s * 190, 330); ctx.lineTo(cx + s * 30, 395); ctx.stroke(); }
    for (const s of [-1, 1]) glowEye(ctx, cx + s * 100, 425, 20, '#ffb000');
    ctx.fillStyle = '#000';
    for (const s of [-1, 1]) { ctx.beginPath(); ctx.ellipse(cx + s * 28, 560, 12, 18, 0, 0, 7); ctx.fill(); }
    ctx.beginPath(); ctx.moveTo(cx - 175, 650); ctx.quadraticCurveTo(cx, 720, cx + 175, 650); ctx.quadraticCurveTo(cx, 860, cx - 175, 650); ctx.closePath();
    ctx.fillStyle = '#050000'; ctx.fill();
    ctx.fillStyle = '#e0d4b0'; ctx.strokeStyle = '#150a00'; ctx.lineWidth = 2;
    for (let i = 0; i < 10; i++) {
        const t = (i + 0.5) / 10, u = 1 - t, x = u * u * (cx - 175) + 2 * u * t * cx + t * t * (cx + 175), y = u * u * 650 + 2 * u * t * 720 + t * t * 650, len = 35 + R() * 35;
        ctx.beginPath(); ctx.moveTo(x - 14, y - 2); ctx.lineTo(x + 14, y - 2); ctx.lineTo(x, y + len); ctx.closePath(); ctx.fill(); ctx.stroke();
    }
    for (let i = 0; i < 9; i++) {
        const t = (i + 0.5) / 9, u = 1 - t, x = u * u * (cx - 175) + 2 * u * t * cx + t * t * (cx + 175), y = u * u * 650 + 2 * u * t * 860 + t * t * 650, len = 30 + R() * 40;
        ctx.beginPath(); ctx.moveTo(x - 14, y + 2); ctx.lineTo(x + 14, y + 2); ctx.lineTo(x, y - len); ctx.closePath(); ctx.fill(); ctx.stroke();
    }
    ctx.fillStyle = '#1a0606';
    for (let i = 0; i < 5; i++) { const x = cx - 80 + i * 40; ctx.beginPath(); ctx.moveTo(x - 16, 870); ctx.lineTo(x + 16, 870); ctx.lineTo(x, 940 + R() * 40); ctx.closePath(); ctx.fill(); }
    ctx.strokeStyle = 'rgba(200,200,170,0.5)'; ctx.lineWidth = 3;
    for (let i = 0; i < 5; i++) { const x = cx - 100 + i * 50; ctx.beginPath(); ctx.moveTo(x, 780); ctx.lineTo(x + (R() - 0.5) * 10, 840 + R() * 80); ctx.stroke(); }
}

function drawShadowPerson(ctx, x, y, s, R) {
    const h = 240 * s, headR = 22 * s, bw = 34 * s;
    ctx.fillStyle = 'rgba(2,0,2,0.96)';
    ctx.beginPath(); ctx.moveTo(x - bw, y); ctx.lineTo(x - bw * 0.7, y - h * 0.7); ctx.quadraticCurveTo(x, y - h * 0.82, x + bw * 0.7, y - h * 0.7); ctx.lineTo(x + bw, y); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.ellipse(x, y - h * 0.88, headR, headR * 1.25, 0, 0, 7); ctx.fill();
    ctx.strokeStyle = 'rgba(2,0,2,0.96)'; ctx.lineWidth = 7 * s; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x - bw * 0.7, y - h * 0.68); ctx.lineTo(x - bw * 1.25, y - h * 0.2); ctx.moveTo(x + bw * 0.7, y - h * 0.68); ctx.lineTo(x + bw * 1.25, y - h * 0.2); ctx.stroke();
    ctx.strokeStyle = 'rgba(120,100,140,0.25)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.ellipse(x, y - h * 0.88, headR, headR * 1.25, 0, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
    if (R() < 0.9) { const col = R() < 0.2 ? '#ff2a00' : '#e8f0ff', ey = y - h * 0.9, er = 4.2 * s; glowEye(ctx, x - headR * 0.45, ey, er, col, false); glowEye(ctx, x + headR * 0.45, ey, er, col, false); }
    if (R() < 0.3) { ctx.strokeStyle = '#f0f0e0'; ctx.lineWidth = 2 * s; ctx.beginPath(); ctx.arc(x, y - h * 0.84, headR * 0.55, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke(); }
}
export function monsterCrowd(ctx, R) {
    paintBackdrop(ctx, R, 'rgba(30,30,60,0.35)');
    for (let row = 0; row < 7; row++) {
        const sc = 0.35 + row * 0.16, y = 300 + row * 95, n = Math.round(14 - row * 1.4);
        for (let i = 0; i < n; i++) drawShadowPerson(ctx, 40 + (i + (row % 2 ? 0.5 : 0)) * (1000 / n) + (R() - 0.5) * 30, y, sc, R);
        const fg = ctx.createLinearGradient(0, y - 60, 0, y + 120); fg.addColorStop(0, 'rgba(10,0,0,0)'); fg.addColorStop(1, 'rgba(10,0,0,0.35)');
        ctx.fillStyle = fg; ctx.fillRect(0, y - 60, 1024, 180);
    }
    bloodText(ctx, 'THEY ARE WATCHING', 512, 120, 70);
}

export function createMural(painter, seed) {
    const res = GFX.muralRes, c = makeCanvas(res, res), ctx = c.getContext('2d');
    ctx.scale(res / 1024, res / 1024);
    painter(ctx, mkRng(seed));
    return toTex(c, false);
}
