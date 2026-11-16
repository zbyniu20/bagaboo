// ==========================================
// GOOBY: obraz jumpscare'a w całej grze (wzorowany na memie Gooby) i młotek "Nothing Hammer".
// Twarz jest rysowana tu w kodzie (płótno 512x512, przezroczyste tło). Chcesz prawdziwy obrazek: wpisz jego adres w GOOBY_IMAGE
// (np. 'core/gooby.png', najlepiej kwadrat z przezroczystym tłem), a rysunek zostanie podmieniony po jego załadowaniu.
// Używają go: core/levelkit.js (createJumpscare: każdy straszak w grze) i core/avatar.js (płytka na młotku).
// ==========================================
import * as T from './textures.js';

export const GOOBY_IMAGE = null;   // adres własnego obrazka albo null = rysunek z kodu
let tex = null;

function drawFace(x) {
    x.clearRect(0, 0, 512, 512);
    x.lineJoin = 'round'; x.lineCap = 'round'; x.strokeStyle = '#2a1a10'; x.lineWidth = 10;
    // sterczące kępki na czubku głowy
    x.fillStyle = '#f2dd8e';
    for (const s of [-1, 1]) { x.beginPath(); x.moveTo(256 + s * 80, 80); x.lineTo(256 + s * 150, 6); x.lineTo(256 + s * 178, 110); x.closePath(); x.fill(); x.stroke(); }
    // głowa
    x.fillStyle = '#f7e7a8'; x.beginPath(); x.ellipse(256, 272, 214, 218, 0, 0, Math.PI * 2); x.fill(); x.stroke();
    // różowe policzki
    x.fillStyle = 'rgba(255,90,110,0.55)';
    for (const cx of [104, 408]) { x.beginPath(); x.arc(cx, 336, 38, 0, Math.PI * 2); x.fill(); }
    // wybałuszone oczy, każde inne i zezujące
    const eye = (cx, cy, r, px, py) => {
        x.fillStyle = '#ffffff'; x.beginPath(); x.arc(cx, cy, r, 0, Math.PI * 2); x.fill(); x.stroke();
        x.fillStyle = '#120a06'; x.beginPath(); x.arc(px, py, r * 0.2, 0, Math.PI * 2); x.fill();
        x.fillStyle = '#ffffff'; x.beginPath(); x.arc(px - 4, py - 5, r * 0.06, 0, Math.PI * 2); x.fill();
    };
    eye(176, 204, 70, 194, 222); eye(342, 190, 86, 322, 214);
    // krzywe brwi
    x.lineWidth = 14; x.beginPath(); x.moveTo(110, 120); x.quadraticCurveTo(170, 96, 240, 126); x.stroke();
    x.beginPath(); x.moveTo(284, 86); x.quadraticCurveTo(350, 60, 416, 100); x.stroke();
    x.lineWidth = 10;
    // szeroki uśmiech z zębami i językiem
    const mouth = () => { x.beginPath(); x.moveTo(100, 338); x.quadraticCurveTo(256, 540, 412, 338); x.quadraticCurveTo(256, 392, 100, 338); x.closePath(); };
    x.fillStyle = '#4a0f14'; mouth(); x.fill();
    x.save(); mouth(); x.clip();
    x.fillStyle = '#fff8ea';
    for (let i = 0; i < 9; i++) { x.fillRect(104 + i * 35, 330, 33, 62); x.strokeRect(104 + i * 35, 330, 33, 62); }
    x.fillStyle = '#ff7a8a'; x.beginPath(); x.ellipse(256, 462, 64, 38, 0, 0, Math.PI * 2); x.fill();
    x.restore();
    mouth(); x.stroke();
}

export function goobyTexture() {
    if (tex) return tex;
    const c = T.makeCanvas(512, 512), x = c.getContext('2d');
    drawFace(x);
    tex = T.toTex(c, false);
    if (GOOBY_IMAGE) {
        const img = new Image();
        img.onload = () => { x.clearRect(0, 0, 512, 512); x.drawImage(img, 0, 0, 512, 512); tex.needsUpdate = true; };
        img.src = GOOBY_IMAGE;
    }
    return tex;
}
