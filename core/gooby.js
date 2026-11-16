// ==========================================
// GOOBY: obraz jumpscare'a w całej grze (puchaty biały królik-stworek z zeza patrzącymi oczami) i młotek "Nothing Hammer".
// Obraz leży w core/gooby.webp (GOOBY_IMAGE). Zanim się wczyta, pokazuje się rysunek z kodu (płótno 512x512, przezroczyste tło).
// Po wczytaniu obraz jest kadrowany do kwadratu i lekko "podkręcany" na straszniejszy (scareUp): ciemniej, mniej koloru, czerwony nalot,
// cienie pod oczami, czerwona poświata w oczach, winieta i szum. Przesuń GOOBY_EYES, jeśli zmienisz obraz.
// Używają go: core/levelkit.js (createJumpscare: każdy straszak w grze) i core/avatar.js (płytka na młotku).
// Dźwięk "gooby" jest w core/audio.js (goobyVoice), odtwarza go SFX.scare().
// ==========================================
import * as T from './textures.js';

export const GOOBY_IMAGE = 'core/gooby.webp';   // adres własnego obrazka albo null = rysunek z kodu
// Kadr kwadratowy w pikselach oryginału (720x811) i środki oczu na oryginale
const CROP = { x: 70, y: 14, s: 400 };
const GOOBY_EYES = [{ x: 172, y: 242, r: 20 }, { x: 223, y: 246, r: 22 }];
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

// Rysuje obraz (kadr kwadratowy) na płótnie 512x512 i delikatnie go "psuje": bez dodawania nowych rzeczy, tylko nastrój
function scareUp(x, img) {
    const W = 512, k = W / CROP.s;
    x.clearRect(0, 0, W, W);
    x.globalCompositeOperation = 'source-over';
    x.drawImage(img, CROP.x, CROP.y, CROP.s, CROP.s, 0, 0, W, W);
    const eyes = GOOBY_EYES.map(e => ({ x: (e.x - CROP.x) * k, y: (e.y - CROP.y) * k, r: e.r * k }));
    // odbarwienie i przyciemnienie (trupia bladość)
    x.globalCompositeOperation = 'saturation'; x.fillStyle = 'rgba(128,128,128,0.55)'; x.fillRect(0, 0, W, W);
    x.globalCompositeOperation = 'multiply'; x.fillStyle = 'rgb(176,150,150)'; x.fillRect(0, 0, W, W);
    // ciemne, zapadnięte oczodoły pod i wokół oczu
    x.globalCompositeOperation = 'multiply';
    for (const e of eyes) {
        const g = x.createRadialGradient(e.x, e.y + e.r * 0.5, e.r * 0.4, e.x, e.y + e.r * 0.5, e.r * 3.2);
        g.addColorStop(0, 'rgba(40,10,10,0.9)'); g.addColorStop(1, 'rgba(255,255,255,0)');
        x.fillStyle = g; x.fillRect(0, 0, W, W);
    }
    // czerwona poświata w oczach (blask, nie wypełnienie: oczy nadal są tymi samymi czarnymi koralikami)
    x.globalCompositeOperation = 'lighter';
    for (const e of eyes) {
        const g = x.createRadialGradient(e.x, e.y, e.r * 0.2, e.x, e.y, e.r * 2.1);
        g.addColorStop(0, 'rgba(255,40,20,0.55)'); g.addColorStop(0.45, 'rgba(200,10,10,0.25)'); g.addColorStop(1, 'rgba(120,0,0,0)');
        x.fillStyle = g; x.beginPath(); x.arc(e.x, e.y, e.r * 2.1, 0, Math.PI * 2); x.fill();
    }
    // krwawy nalot na całości
    x.globalCompositeOperation = 'source-over';
    x.fillStyle = 'rgba(110,0,0,0.16)'; x.fillRect(0, 0, W, W);
    // szum filmowy i poziome przesunięcia ("zakłócenia")
    for (let i = 0; i < 1400; i++) { const v = (Math.random() * 255) | 0; x.fillStyle = 'rgba(' + v + ',' + v + ',' + v + ',0.07)'; x.fillRect(Math.random() * W, Math.random() * W, 2 + Math.random() * 3, 1); }
    for (const [sy, sh, dx] of [[150, 14, 9], [300, 8, -12], [372, 18, 7]]) x.drawImage(x.canvas, 0, sy, W, sh, dx, sy, W, sh);
    // winieta: brzegi toną w czerni i robią się przezroczyste (obraz nie wygląda jak prostokątne zdjęcie)
    const v = x.createRadialGradient(W / 2, W * 0.46, W * 0.2, W / 2, W * 0.5, W * 0.72);
    v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(0.7, 'rgba(0,0,0,0.4)'); v.addColorStop(1, 'rgba(0,0,0,0.95)');
    x.fillStyle = v; x.fillRect(0, 0, W, W);
    x.globalCompositeOperation = 'destination-in';
    const a = x.createRadialGradient(W / 2, W / 2, W * 0.42, W / 2, W / 2, W * 0.5);
    a.addColorStop(0, 'rgba(0,0,0,1)'); a.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = a; x.fillRect(0, 0, W, W);
    x.globalCompositeOperation = 'source-over';
}

export function goobyTexture() {
    if (tex) return tex;
    const c = T.makeCanvas(512, 512), x = c.getContext('2d');
    drawFace(x);
    tex = T.toTex(c, false);
    if (GOOBY_IMAGE) {
        const img = new Image();
        img.onload = () => { try { scareUp(x, img); } catch (e) { x.globalCompositeOperation = 'source-over'; x.clearRect(0, 0, 512, 512); x.drawImage(img, 0, 0, 512, 512); } tex.needsUpdate = true; };
        img.src = GOOBY_IMAGE;
    }
    return tex;
}
