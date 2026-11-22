// ==========================================
// STWOREK: MODEL 3D I ANIMACJE (bez logiki gry; stan podaje core/pet.js, reguły są w core/petlogic.js).
// Proceduralny blob: ciało z brzuszkiem, uszy, łapki, ogon i twarz rysowana na płótnie (jeden mały canvas na stworka, przerysowywany tylko przy zmianie miny:
// oczy otwarte, mrugnięcie, szczęście, smutek, sen, głód, jedzenie). Poziom dokłada rogi (3), grzbiet z kolcami (4) i aureolę (5), kolor i imię są z list.
// Złoty stworek lekko świeci i iskrzy. Budżet: ok. 10-15 siatek, bez świateł punktowych (lobby ma ich już 8 z 12), geometrie wspólne dla wszystkich stworków.
// Cząsteczki (serca, "zzz", obłoczek, iskry) to sprite'y z małej puli, tworzone dopiero przy pierwszym użyciu.
// ==========================================
import { THREE, tex } from './engine.js';
import * as T from './textures.js';
import { PET, scaleOf } from './petlogic.js';
import { GAMES_CALM } from './settings.js';

// ---------- wspólne geometrie i tekstury ----------
let GEO = null, HEART = null, ZEE = null;
function geo() {
    if (GEO) return GEO;
    const cap = new THREE.SphereGeometry(0.263, 26, 14, Math.PI / 2 - 0.75, 1.5, 1.12, 0.83);   // wycinek ciała z przodu: na nim leży twarz (UV rozciągają się na wycinku)
    GEO = {
        body: new THREE.SphereGeometry(0.26, 24, 18), cap: cap, belly: new THREE.SphereGeometry(0.2, 16, 12), ear: new THREE.ConeGeometry(0.075, 0.2, 10), foot: new THREE.SphereGeometry(0.07, 12, 8),
        tail: new THREE.SphereGeometry(0.065, 10, 8), horn: new THREE.ConeGeometry(0.035, 0.14, 8), spike: new THREE.ConeGeometry(0.04, 0.13, 6), halo: new THREE.TorusGeometry(0.14, 0.012, 8, 30),
        shadow: new THREE.CircleGeometry(0.3, 20), claw: new THREE.ConeGeometry(0.012, 0.055, 5),
        // gatunki: wąsy kota, skrzydło smoka, spódnica i frędzle ducha
        whisker: new THREE.BoxGeometry(0.14, 0.006, 0.006), wing: new THREE.ConeGeometry(0.11, 0.3, 3), skirt: new THREE.CylinderGeometry(0.255, 0.215, 0.3, 20), scallop: new THREE.SphereGeometry(0.07, 8, 6),
        // Pet Pack: czapki i dodatki na szyję (podstawy w początku układu, żeby stały na głowie lub wisiały od szyi)
        partyCone: new THREE.ConeGeometry(0.09, 0.22, 12), pom: new THREE.SphereGeometry(0.03, 8, 6), petalRing: new THREE.TorusGeometry(0.042, 0.03, 6, 12), dot: new THREE.SphereGeometry(0.03, 8, 6),
        brim: new THREE.CylinderGeometry(0.2, 0.2, 0.02, 22), hatTop: new THREE.CylinderGeometry(0.095, 0.11, 0.13, 14), hatBand: new THREE.CylinderGeometry(0.112, 0.112, 0.03, 14), wizCone: new THREE.ConeGeometry(0.11, 0.34, 12), wizBrim: new THREE.CylinderGeometry(0.19, 0.19, 0.015, 22),
        crownBand: new THREE.CylinderGeometry(0.1, 0.085, 0.07, 10, 1, true), crownTip: new THREE.ConeGeometry(0.024, 0.06, 6), neckRing: new THREE.TorusGeometry(0.215, 0.04, 8, 24), thinRing: new THREE.TorusGeometry(0.215, 0.02, 8, 24),
        bowWing: new THREE.ConeGeometry(0.06, 0.13, 8), bandana: new THREE.ConeGeometry(0.11, 0.16, 3), scarfTail: new THREE.BoxGeometry(0.07, 0.2, 0.03), bell: new THREE.SphereGeometry(0.042, 10, 8), cape: new THREE.BoxGeometry(0.42, 0.36, 0.015)
    };
    GEO.claw.translate(0, 0.0275, 0); GEO.partyCone.translate(0, 0.11, 0); GEO.wizCone.translate(0, 0.17, 0); GEO.hatTop.translate(0, 0.065, 0); GEO.scarfTail.translate(0, -0.1, 0); GEO.cape.translate(0, -0.18, 0);
    GEO.wing.translate(0, 0.15, 0); GEO.ear.translate(0, 0.1, 0); GEO.horn.translate(0, 0.07, 0); GEO.spike.translate(0, 0.06, 0);   // podstawy w początku układu, żeby obracać wokół nich
    return GEO;
}
function heartTex() {
    if (HEART) return HEART;
    const c = T.makeCanvas(64, 64), x = c.getContext('2d');
    x.shadowColor = SCARY_PET ? '#ff2a2a' : '#ff8aa8'; x.shadowBlur = 8; x.fillStyle = SCARY_PET ? '#a8101c' : '#ff5b8a'; x.beginPath(); x.moveTo(32, 54);
    x.bezierCurveTo(4, 34, 10, 10, 26, 14); x.bezierCurveTo(30, 15, 32, 19, 32, 22); x.bezierCurveTo(32, 19, 34, 15, 38, 14); x.bezierCurveTo(54, 10, 60, 34, 32, 54); x.fill();
    x.shadowBlur = 0; x.fillStyle = 'rgba(255,255,255,0.55)'; x.beginPath(); x.ellipse(21, 22, 5, 3, -0.6, 0, Math.PI * 2); x.fill();
    return (HEART = T.toTex(c, false));
}
function zeeTex() {
    if (ZEE) return ZEE;
    const c = T.makeCanvas(64, 64), x = c.getContext('2d');
    x.font = 'bold 46px "Courier New", monospace'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.lineWidth = 6; x.strokeStyle = 'rgba(20,10,40,0.6)'; x.strokeText('Z', 32, 34); x.fillStyle = '#cfe3ff'; x.fillText('Z', 32, 34);
    return (ZEE = T.toTex(c, false));
}

// ---------- twarz ----------
const FACE_W = 256, FACE_H = 144, EYES = [88, 168], EYE_Y = 66;
const SCARY_PET = true;   // straszne stworki: czerwone oczy, kły, blizna, pazury, kolce, mroczne dodatki (wyłącza ta stała)
function drawScaryFace(g, expr, look) {
    g.clearRect(0, 0, FACE_W, FACE_H); g.lineCap = 'round'; g.lineJoin = 'round';
    g.save(); g.translate(128, 60); g.scale(1.22, 1.22); g.translate(-128, -84);   // twarz wyżej i większa: wypukły brzuszek zasłaniał dolną część
    const gold = !!(PET.COLORS[look.c] || {}).rare, glowC = gold ? '#ffd23a' : '#ff2412', teeth = '#f2ead2', blood = '#a50f18';
    const eye = (ex, s) => {   // ciemny oczodół, świecące oko ze szczeliną źrenicy
        g.fillStyle = 'rgba(25,0,6,0.8)'; g.beginPath(); g.ellipse(ex, EYE_Y, 20 * s, 25 * s, 0, 0, Math.PI * 2); g.fill();
        g.shadowColor = glowC; g.shadowBlur = 14; g.fillStyle = glowC; g.beginPath(); g.ellipse(ex, EYE_Y, 14 * s, 19 * s, 0, 0, Math.PI * 2); g.fill(); g.shadowBlur = 0;
        g.fillStyle = '#120000'; g.beginPath(); g.ellipse(ex, EYE_Y, 3.6 * s, 17 * s, 0, 0, Math.PI * 2); g.fill();
        g.fillStyle = 'rgba(255,255,255,0.8)'; g.beginPath(); g.arc(ex - 6 * s, EYE_Y - 8 * s, 2.4 * s, 0, Math.PI * 2); g.fill();
    };
    const brows = (lift) => { g.strokeStyle = '#140309'; g.lineWidth = 9; for (const sx of [-1, 1]) { g.beginPath(); g.moveTo(128 + sx * 66, EYE_Y - 36 + lift); g.lineTo(128 + sx * 18, EYE_Y - 14 + lift); g.stroke(); } };
    const slit = (ex, y) => { g.shadowColor = glowC; g.shadowBlur = 10; g.strokeStyle = glowC; g.lineWidth = 5; g.beginPath(); g.moveTo(ex - 16, y - 4); g.quadraticCurveTo(ex, y + 6, ex + 16, y - 4); g.stroke(); g.shadowBlur = 0; };
    const mouth = (h, wide) => {   // zębata paszcza: otwiera się o h, górne i dolne kły na przemian
        const x0 = 128 - wide, x1 = 128 + wide;
        g.fillStyle = '#34040a'; g.beginPath(); g.moveTo(x0, 90); g.quadraticCurveTo(128, 90 + 20 + h, x1, 90); g.quadraticCurveTo(128, 84, x0, 90); g.fill();
        g.fillStyle = teeth; const n = 9;
        for (let i = 0; i < n; i++) { const t = i / (n - 1), x = x0 + 8 + t * (2 * wide - 16), big = i === 1 || i === n - 2; g.beginPath(); g.moveTo(x - 5, 88 - 2 * Math.sin(t * Math.PI)); g.lineTo(x + 5, 88 - 2 * Math.sin(t * Math.PI)); g.lineTo(x, 88 + (big ? 18 : 10)); g.fill(); }
        for (let i = 0; i < n - 2; i++) { const t = (i + 0.5) / (n - 2), x = x0 + 14 + t * (2 * wide - 28), by = 88 + 10 + (20 + h) * Math.sin(t * Math.PI) * 0.82; g.beginPath(); g.moveTo(x - 4, by); g.lineTo(x + 4, by); g.lineTo(x, by - 9); g.fill(); }
    };
    const scar = () => { g.strokeStyle = blood; g.lineWidth = 4; g.beginPath(); g.moveTo(190, 72); g.lineTo(224, 116); g.stroke(); g.strokeStyle = '#2a0508'; g.lineWidth = 2.5; for (let i = 0; i < 4; i++) { const t = i / 3, x = 190 + 34 * t, y = 72 + 44 * t; g.beginPath(); g.moveTo(x - 6, y + 4); g.lineTo(x + 6, y - 4); g.stroke(); } };
    const drip = (x, y, len) => { g.fillStyle = blood; g.fillRect(x - 2, y, 4, len); g.beginPath(); g.arc(x, y + len, 4, 0, Math.PI * 2); g.fill(); };
    const closed = () => { for (const ex of EYES) slit(ex, EYE_Y + 4); };
    if (expr === 'blink') { closed(); brows(2); mouth(2, 64); }
    else if (expr === 'happy') { for (const ex of EYES) { g.shadowColor = glowC; g.shadowBlur = 12; g.strokeStyle = glowC; g.lineWidth = 7; g.beginPath(); g.arc(ex, EYE_Y + 12, 16, 1.15 * Math.PI, 1.85 * Math.PI); g.stroke(); g.shadowBlur = 0; } brows(6); mouth(16, 72); drip(150, 104, 14); }
    else if (expr === 'eat') { eye(EYES[0], 0.9); eye(EYES[1], 0.9); brows(0); mouth(26, 64); g.fillStyle = '#7a1424'; g.beginPath(); g.ellipse(128, 112, 18, 9, 0, 0, Math.PI); g.fill(); drip(100, 100, 18); }
    else if (expr === 'sleep') { closed(); g.strokeStyle = '#140309'; g.lineWidth = 3; for (const [dx, dy] of [[-8, -8], [8, -8], [-8, 8], [8, 8]]) { g.beginPath(); g.moveTo(EYES[0], EYE_Y + 4); g.lineTo(EYES[0] + dx, EYE_Y + 4 + dy); g.stroke(); } brows(4); mouth(0, 52); }
    else if (expr === 'sad') { eye(EYES[0], 0.85); eye(EYES[1], 0.85); g.strokeStyle = '#140309'; g.lineWidth = 7; for (const sx of [-1, 1]) { g.beginPath(); g.moveTo(128 + sx * 64, EYE_Y - 20); g.lineTo(128 + sx * 20, EYE_Y - 36); g.stroke(); } drip(EYES[0] - 4, EYE_Y + 22, 24); mouth(-6, 40); }
    else if (expr === 'hungry') { eye(EYES[0], 1.12); eye(EYES[1], 1.12); brows(-2); mouth(20, 56); drip(112, 106, 22); drip(150, 106, 12); }
    else { eye(EYES[0], 1); eye(EYES[1], 1); brows(0); mouth(6, 66); }
    scar(); g.restore();
}
function drawFace(g, expr, look) {
    if (SCARY_PET) return drawScaryFace(g, expr, look);
    g.clearRect(0, 0, FACE_W, FACE_H);
    const ink = '#241530', lineW = 8;
    g.lineCap = 'round'; g.lineJoin = 'round';
    const cheek = (a) => { g.fillStyle = 'rgba(255,105,140,' + a + ')'; for (const cx of [48, 208]) { g.beginPath(); g.ellipse(cx, 94, 16, 9, 0, 0, Math.PI * 2); g.fill(); } };
    const eyesOpen = (s) => { for (const ex of EYES) { g.fillStyle = ink; g.beginPath(); g.ellipse(ex, EYE_Y, 14 * s, 19 * s, 0, 0, Math.PI * 2); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.arc(ex - 5 * s, EYE_Y - 7 * s, 5.5 * s, 0, Math.PI * 2); g.fill(); g.beginPath(); g.arc(ex + 5 * s, EYE_Y + 6 * s, 2.6 * s, 0, Math.PI * 2); g.fill(); } };
    const smile = (w) => { g.strokeStyle = '#3a1d2a'; g.lineWidth = 5; g.beginPath(); g.arc(128 - w / 2, 92, w / 2, 0.15 * Math.PI, 0.85 * Math.PI); g.stroke(); g.beginPath(); g.arc(128 + w / 2, 92, w / 2, 0.15 * Math.PI, 0.85 * Math.PI); g.stroke(); };
    g.strokeStyle = ink; g.lineWidth = lineW;
    if (expr === 'blink') { for (const ex of EYES) { g.beginPath(); g.moveTo(ex - 15, EYE_Y + 3); g.quadraticCurveTo(ex, EYE_Y + 9, ex + 15, EYE_Y + 3); g.stroke(); } cheek(0.45); smile(11); }
    else if (expr === 'happy') { for (const ex of EYES) { g.beginPath(); g.arc(ex, EYE_Y + 10, 15, 1.12 * Math.PI, 1.88 * Math.PI); g.stroke(); } cheek(0.75); g.fillStyle = '#7a2b3a'; g.beginPath(); g.ellipse(128, 94, 15, 10, 0, 0, Math.PI); g.fill(); g.fillStyle = '#ff8aa0'; g.beginPath(); g.ellipse(128, 100, 8, 4.5, 0, 0, Math.PI); g.fill(); }
    else if (expr === 'eat') { for (const ex of EYES) { g.beginPath(); g.arc(ex, EYE_Y + 10, 15, 1.12 * Math.PI, 1.88 * Math.PI); g.stroke(); } cheek(0.7); g.fillStyle = '#7a2b3a'; g.beginPath(); g.ellipse(128, 98, 17, 13, 0, 0, Math.PI * 2); g.fill(); g.fillStyle = '#ff8aa0'; g.beginPath(); g.ellipse(128, 105, 9, 5, 0, 0, Math.PI); g.fill(); }
    else if (expr === 'sleep') { for (const ex of EYES) { g.beginPath(); g.arc(ex, EYE_Y - 4, 14, 0.15 * Math.PI, 0.85 * Math.PI); g.stroke(); } cheek(0.35); g.fillStyle = 'rgba(60,30,50,0.8)'; g.beginPath(); g.ellipse(128, 96, 5, 4, 0, 0, Math.PI * 2); g.fill(); }
    else if (expr === 'sad') { eyesOpen(0.8); g.lineWidth = 6; g.beginPath(); g.moveTo(64, 56); g.lineTo(108, 40); g.stroke(); g.beginPath(); g.moveTo(148, 40); g.lineTo(192, 56); g.stroke(); cheek(0.25);
        g.strokeStyle = '#3a1d2a'; g.lineWidth = 5; g.beginPath(); g.arc(128, 108, 13, 1.2 * Math.PI, 1.8 * Math.PI); g.stroke(); }
    else if (expr === 'hungry') { eyesOpen(1.1); cheek(0.4); g.fillStyle = '#7a2b3a'; g.beginPath(); g.ellipse(128, 98, 9, 12, 0, 0, Math.PI * 2); g.fill(); g.fillStyle = '#9fd8ff'; g.beginPath(); g.moveTo(214, 38); g.quadraticCurveTo(226, 58, 214, 64); g.quadraticCurveTo(202, 58, 214, 38); g.fill(); }
    else { eyesOpen(1); cheek(0.5); smile(13); }
}

// ---------- model ----------
export function createPetModel(look, opts) {
    opts = opts || {};
    const G = geo(), col = PET.COLORS[look.c] || PET.COLORS[0], sc = scaleOf(look.l), gold = !!col.rare;
    const group = new THREE.Group();
    const mats = [], mat = (c, o) => { const m = new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.55 }, o || {})); mats.push(m); return m; };
    const grimy = (c, k) => SCARY_PET ? new THREE.Color(c).multiplyScalar(gold ? 0.95 : k).lerp(new THREE.Color(0x2a1018), gold ? 0 : 0.14) : c;   // zabrudzone, przygaszone kolory
    const bodyM = mat(grimy(col.body, 0.68), gold ? { metalness: 0.35, roughness: 0.3, emissive: 0x6b4a00, emissiveIntensity: 0.35 } : null), bellyM = mat(grimy(col.belly, 0.6)), accM = mat(grimy(col.accent, 0.62)), hornM = mat(SCARY_PET ? '#d8cdb0' : '#fff2c8', { roughness: 0.4 });
    const part = (g, m, x, y, z, parent) => { const o = new THREE.Mesh(g, m); o.position.set(x, y, z); (parent || root).add(o); return o; };

    // cień na ziemi (poza skaczącym ciałem)
    const shadow = new THREE.Mesh(G.shadow, new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.3, depthWrite: false })); shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.012; shadow.scale.setScalar(sc); group.add(shadow); mats.push(shadow.material);
    const root = new THREE.Group(); group.add(root);
    const bodyG = new THREE.Group(); bodyG.scale.set(1, 0.92, 1); root.add(bodyG);
    part(G.body, bodyM, 0, 0, 0, bodyG);
    const belly = part(G.belly, bellyM, 0, -0.07, 0.15, bodyG); belly.scale.set(1, 1.05, SCARY_PET ? 0.5 : 0.62);
    // twarz: wycinek sfery z płótnem
    const fc = T.makeCanvas(FACE_W, FACE_H), fg = fc.getContext('2d'), fTex = T.toTex(fc, false);
    const faceM = new THREE.MeshBasicMaterial({ map: fTex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, toneMapped: false }); mats.push(faceM);
    part(G.cap, faceM, 0, 0, 0, bodyG);
    // uszy, łapki, ogon
    const earL = new THREE.Group(), earR = new THREE.Group(); earL.position.set(-0.16, 0.2, 0.0); earR.position.set(0.16, 0.2, 0.0); root.add(earL, earR);
    part(G.ear, bodyM, 0, 0, 0, earL); part(G.ear, bodyM, 0, 0, 0, earR);
    const footL = part(G.foot, accM, -0.1, -0.245, 0.07), footR = part(G.foot, accM, 0.1, -0.245, 0.07); footL.scale.set(1, 0.62, 1.3); footR.scale.set(1, 0.62, 1.3);
    const tailP = new THREE.Group(); tailP.position.set(0, -0.12, -0.23); root.add(tailP); part(G.tail, accM, 0, 0, -0.05, tailP); part(G.tail, bodyM, 0, 0.03, -0.12, tailP).scale.setScalar(0.7);
    if (SCARY_PET) {   // pazury na łapkach i małe kolce na grzbiecie (poziom 4 dokłada duże)
        const clawM = mat('#15100c', { roughness: 0.35, metalness: 0.2 });
        for (const f of [footL, footR]) for (let i = -1; i <= 1; i++) { const c = part(G.claw, clawM, i * 0.045, 0.0, 0.085, f); c.rotation.x = Math.PI / 2 - 0.25; c.scale.set(1, 1, 1 / 1.3); }
    }
    // gatunek: ta sama bryła, ale inne uszy, ogon i dodatki (indeks z PET.SPECIES; 0 = Blobby bez zmian)
    const spId = (PET.SPECIES[look.sp || 0] || PET.SPECIES[0]).id, wings = [], ghost = spId === 'ghost', inkM = mat('#241530');
    if (spId === 'bunny') { for (const e of [earL, earR]) e.scale.set(0.8, 2.1, 0.8); tailP.scale.setScalar(1.7); footL.scale.set(1.2, 0.7, 1.7); footR.scale.set(1.2, 0.7, 1.7); }
    else if (spId === 'cat') {
        for (const e of [earL, earR]) e.scale.set(1.15, 0.75, 1.15); tailP.scale.set(0.8, 0.8, 2.4);
        for (const sx of [-1, 1]) for (let k = 0; k < 3; k++) { const w = part(G.whisker, inkM, sx * 0.27, -0.02 + k * 0.035, 0.16); w.rotation.set(0, sx * 0.5, sx * (0.12 - k * 0.12)); }
    } else if (spId === 'dragon') {
        earL.visible = earR.visible = false;
        for (const sx of [-1, 1]) {
            const h = part(G.horn, hornM, sx * 0.09, 0.235, 0.02); h.rotation.set(-0.2, 0, -sx * 0.3); h.scale.setScalar(1.3);
            const wg = new THREE.Group(); wg.position.set(sx * 0.18, 0.06, -0.2); root.add(wg); part(G.wing, accM, 0, 0, 0, wg).scale.set(1.5, 1.2, 0.35); wings.push({ g: wg, s: -sx });
        }
        const ts = part(G.spike, accM, 0, 0, -0.2, tailP); ts.rotation.x = -Math.PI / 2; ts.scale.setScalar(1.5);
        if (look.l < 4) [[0, 0.2, -0.17, -0.6], [0, 0.1, -0.245, -0.95], [0, -0.01, -0.275, -1.25]].forEach(([x, y, z, rx], i) => { const sp2 = part(G.spike, accM, x, y, z); sp2.rotation.x = rx; sp2.scale.setScalar(1 - i * 0.18); });
    } else if (ghost) {
        earL.visible = earR.visible = tailP.visible = footL.visible = footR.visible = false;
        bodyM.transparent = true; bodyM.opacity = 0.88; bodyM.depthWrite = true;
        part(G.skirt, bodyM, 0, -0.16, 0, bodyG);
        for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2; part(G.scallop, bodyM, Math.cos(a) * 0.19, -0.3, Math.sin(a) * 0.19, bodyG); }
    }
    if (SCARY_PET && !ghost && spId !== 'dragon' && look.l < 4) [[0, 0.2, -0.17, -0.6], [0, 0.1, -0.245, -0.95]].forEach(([x, y, z, rx], i) => { const sp2 = part(G.spike, hornM, x, y, z); sp2.rotation.x = rx; sp2.scale.setScalar(0.7 - i * 0.12); });
    // poziomy: rogi, grzbiet z kolcami, aureola (nad wysoką czapką wyżej)
    const hatId = PET.HATS[look.h || 0] || 'none', neckId = PET.NECKS[look.k || 0] || 'none', haloBase = 0.47 + (hatId === 'wizard' ? 0.2 : (hatId !== 'none' ? 0.08 : 0));
    let halo = null; const spikes = [];
    if (look.l >= 3) for (const sx of [-1, 1]) { const h = part(G.horn, hornM, sx * 0.075, 0.245, 0.05); h.rotation.set(0.15, 0, -sx * 0.25); }
    if (look.l >= 4) [[0, 0.2, -0.17, -0.6], [0, 0.1, -0.245, -0.95], [0, -0.01, -0.275, -1.25]].forEach(([x, y, z, rx], i) => { const s = part(G.spike, accM, x, y, z); s.rotation.x = rx; s.scale.setScalar(1 - i * 0.18); spikes.push(s); });
    if (look.l >= 5) { halo = part(G.halo, new THREE.MeshBasicMaterial({ color: SCARY_PET ? 0xc01420 : 0xffe27a, toneMapped: false }), 0, haloBase, 0); mats.push(halo.material); halo.rotation.x = Math.PI / 2; }
    // Pet Pack: czapka na głowie i dodatek na szyi (identyfikatory z PET.HATS i PET.NECKS)
    let capeP = null, scarfT = null, star = null;
    const P = (a, b) => SCARY_PET ? b : a;
    const acc = (c, o) => mat(c, Object.assign({ roughness: 0.6 }, o || {})), glow = (c) => acc(c, { emissive: c, emissiveIntensity: 0.35, metalness: 0.4, roughness: 0.35 });
    if (hatId === 'party') { const c = part(G.partyCone, acc(P('#ff5fa8', '#5a0c1c')), 0, 0.225, 0); c.rotation.z = -0.12; const p = part(G.pom, glow(P('#ffe27a', '#c02030')), 0.03, 0.455, 0); p.scale.setScalar(1.1); }
    else if (hatId === 'flower') { const f = new THREE.Group(); f.position.set(0.12, 0.23, 0.08); f.rotation.set(-0.5, 0, -0.35); root.add(f); part(G.petalRing, acc(P('#ff8fc0', '#7a0f1c')), 0, 0, 0, f); part(G.dot, acc(P('#ffd24a', '#2a0a0a')), 0, 0, 0.01, f).scale.setScalar(1.15); }
    else if (hatId === 'cowboy') { const b = acc(P('#8a5a32', '#4a2c1a')); part(G.brim, b, 0, 0.245, 0).rotation.z = 0.04; part(G.hatTop, b, 0, 0.255, 0); part(G.hatBand, acc(P('#3a2a1c', '#6a0c10')), 0, 0.28, 0); }
    else if (hatId === 'wizard') { const w = acc(P('#6a43c8', '#2a1850')); const c = part(G.wizCone, w, 0, 0.235, 0); c.rotation.z = 0.12; part(G.wizBrim, w, 0, 0.24, 0); const st = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex.dot, color: P(0xffe27a, 0xff3030), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); st.scale.setScalar(0.09); st.position.set(0.03, 0.4, 0.04); root.add(st); mats.push(st.material); star = st; }
    else if (hatId === 'crown') { const g = glow(P('#ffd24a', '#8a6a20')); part(G.crownBand, g, 0, 0.255, 0).material.side = THREE.DoubleSide; for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; part(G.crownTip, g, Math.cos(a) * 0.092, 0.31, Math.sin(a) * 0.092); } part(G.dot, acc(P('#ff5b8a', '#c01020')), 0, 0.27, 0.098).scale.setScalar(0.8); }
    if (neckId === 'bow') { const m = acc(P('#e0334e', '#5a0a14')); for (const sx of [-1, 1]) { const w = part(G.bowWing, m, sx * 0.07, -0.13, 0.235); w.rotation.z = -sx * Math.PI / 2; } part(G.dot, m, 0, -0.13, 0.245).scale.setScalar(0.85); }
    else if (neckId === 'bandana') { part(G.thinRing, acc(P('#2f7fe0', '#1a1a22')), 0, -0.13, 0).rotation.x = Math.PI / 2; const b = part(G.bandana, acc(P('#2f7fe0', '#1a1a22'), { side: THREE.DoubleSide }), 0, -0.2, 0.2); b.rotation.set(0.15, 0, Math.PI); }
    else if (neckId === 'scarf') { part(G.neckRing, acc(P('#f58a1f', '#4a1a12')), 0, -0.13, 0).rotation.x = Math.PI / 2; scarfT = new THREE.Group(); scarfT.position.set(0.14, -0.15, 0.18); root.add(scarfT); part(G.scarfTail, acc(P('#f6d928', '#7a1a14')), 0, 0, 0, scarfT); }
    else if (neckId === 'bell') { part(G.thinRing, acc(P('#d9393a', '#3a0a0a')), 0, -0.13, 0).rotation.x = Math.PI / 2; part(G.bell, glow(P('#ffd24a', '#8a6a20')), 0, -0.19, 0.225); }
    else if (neckId === 'cape') { const m = acc(P('#c0283a', '#3a0610'), { side: THREE.DoubleSide }); capeP = new THREE.Group(); capeP.position.set(0, -0.05, -0.215); root.add(capeP); part(G.cape, m, 0, 0, 0, capeP); part(G.dot, glow(P('#ffd24a', '#8a6a20')), 0, -0.07, 0.24).scale.setScalar(1.1); part(G.thinRing, m, 0, -0.13, 0).rotation.x = Math.PI / 2; }
    // iskry złotego stworka
    const sparks = [];   // iskry krążące wokół złotego stworka
    if (gold) for (let i = 0; i < 3; i++) { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex.dot, color: 0xffe27a, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); sp.scale.setScalar(0.07); root.add(sp); sparks.push(sp); mats.push(sp.material); }

    // plakietka z imieniem
    const tc = T.makeCanvas(256, 84), tg = tc.getContext('2d'), tTex = T.toTex(tc, false), tag = new THREE.Sprite(new THREE.SpriteMaterial({ map: tTex, transparent: true, depthWrite: false, toneMapped: false }));
    tag.scale.set(0.62, 0.204, 1); tag.position.y = 0.66 * sc + 0.1; tag.renderOrder = 5; group.add(tag); mats.push(tag.material);
    let tagSig = '';
    function setTag(name, lv, mood) {
        const sig = name + '|' + lv + '|' + mood; if (sig === tagSig) return; tagSig = sig;
        tg.clearRect(0, 0, 256, 84); tg.fillStyle = 'rgba(22,12,34,0.62)'; tg.beginPath(); tg.roundRect(6, 6, 244, 72, 24); tg.fill(); tg.lineWidth = 3; tg.strokeStyle = col.accent; tg.stroke();
        tg.textAlign = 'center'; tg.textBaseline = 'middle'; tg.font = 'bold 34px sans-serif'; tg.fillStyle = '#fff'; tg.fillText(name, 128, 32);
        tg.font = 'bold 22px sans-serif'; tg.fillStyle = '#ffe9a8'; tg.fillText('Lv ' + lv + '  ' + (mood === 'happy' ? '♥ happy' : (mood === 'content' ? '♥ content' : '♡ gloomy')), 128, 60);
        tTex.needsUpdate = true;
    }

    // twarz: przerysowanie tylko przy zmianie miny
    let expr = '';
    const setExpr = (e) => { if (e === expr) return; expr = e; drawFace(fg, e, look); fTex.needsUpdate = true; };
    setExpr('open');

    // cząsteczki
    const parts = [];
    function emit(kind, n) {
        for (let i = 0; i < n && parts.length < 16; i++) {
            const map = kind === 'heart' ? heartTex() : (kind === 'zee' ? zeeTex() : tex.dot), add = kind === 'spark' || kind === 'poof';
            const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: map, transparent: true, depthWrite: false, toneMapped: false, blending: add ? THREE.AdditiveBlending : THREE.NormalBlending, color: kind === 'poof' ? 0xfff2d0 : (kind === 'spark' ? 0xffe27a : 0xffffff) }));
            const a = Math.random() * Math.PI * 2, s = kind === 'poof' ? 0.9 : (kind === 'spark' ? 1.3 : 0.25);
            const p = { sp: sp, vx: Math.cos(a) * s * (0.4 + Math.random() * 0.6), vy: kind === 'zee' ? 0.22 : (kind === 'heart' ? 0.5 + Math.random() * 0.3 : 0.5 + Math.random() * 0.9), vz: Math.sin(a) * s * (0.4 + Math.random() * 0.6), life: 0, max: kind === 'zee' ? 2.4 : (kind === 'heart' ? 1.5 : 0.9), kind: kind, size: kind === 'zee' ? 0.16 : (kind === 'heart' ? 0.17 : 0.13) };
            sp.position.set((Math.random() - 0.5) * 0.2, (kind === 'poof' ? 0.1 : 0.45) * sc, (Math.random() - 0.5) * 0.2); sp.scale.setScalar(0.001); group.add(sp); parts.push(p);
        }
    }
    function stepParts(dt) {
        for (let i = parts.length - 1; i >= 0; i--) {
            const p = parts[i]; p.life += dt; const k = p.life / p.max;
            if (k >= 1) { group.remove(p.sp); p.sp.material.dispose(); parts.splice(i, 1); continue; }
            p.sp.position.x += p.vx * dt; p.sp.position.y += p.vy * dt; p.sp.position.z += p.vz * dt;
            if (p.kind === 'poof' || p.kind === 'spark') { p.vx *= 0.94; p.vz *= 0.94; p.vy *= 0.96; }
            p.sp.material.opacity = k < 0.15 ? k / 0.15 : 1 - Math.pow((k - 0.15) / 0.85, 1.5);
            p.sp.scale.setScalar(p.size * sc * (p.kind === 'poof' ? 0.6 + k * 2.4 : 0.55 + Math.min(1, k * 4) * 0.45));
        }
    }

    let phase = Math.random() * 6, blinkIn = 2 + Math.random() * 3, blinkT = 0, zeeIn = 0, born = opts.born ? 0 : 1, tailWag = 0;
    const easeBack = (x) => { const c1 = 1.9, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };

    // st: { speed 0..1, sleeping, sitting, sad, hungry, petted 0..1, eating 0..1 }
    function update(dt, t, st) {
        stepParts(dt);
        if (born < 1) born = Math.min(1, born + dt / 0.9);
        const moving = st.speed > 0.05;
        phase += dt * (moving ? 7 + 8 * st.speed : 0);
        const hopUp = moving ? Math.abs(Math.sin(phase)) : 0, hop = hopUp * 0.1 * (0.5 + 0.5 * st.speed) + (st.petted > 0 ? Math.abs(Math.sin(t * 13)) * 0.07 * st.petted : 0);
        const breathe = Math.sin(t * (st.sleeping ? 1.3 : 2.3)) * (st.sleeping ? 0.03 : 0.018);
        let sy = 1 + breathe + (moving ? Math.cos(phase * 2) * 0.05 * st.speed : 0), ty = 0;
        if (st.sitting && !moving) { sy *= 0.93; ty = -0.02; }
        if (st.sleeping) { sy *= 0.9; ty = -0.035; }
        if (st.sad && !st.sleeping) { sy *= 0.97; ty -= 0.012; }
        const sx = 1 / Math.sqrt(sy), b = born >= 1 ? 1 : Math.max(0.001, easeBack(born));
        root.scale.set(sc * sx * b, sc * sy * b, sc * sx * b); root.position.y = (0.28 + ty) * sc * sy * b + hop * sc + (ghost ? (0.1 + Math.sin(t * 2) * 0.03) * sc : 0);
        shadow.scale.setScalar(sc * b * (1 - hop * 1.4)); shadow.material.opacity = 0.3 * (1 - hop * 2);
        // ogon, uszy, łapki
        tailWag = st.sleeping ? 0.05 : (st.sad ? 0.12 : (0.35 + 0.45 * (st.petted || 0)));
        tailP.rotation.y = Math.sin(t * (st.petted > 0 ? 16 : 4.2)) * tailWag; tailP.rotation.x = st.sad ? 0.5 : (st.sleeping ? 0.3 : -0.1 + Math.sin(t * 2) * 0.04);
        const earBase = st.sad || st.sleeping ? 0.95 : (st.petted > 0 ? 0.15 : 0.38), wig = st.sleeping ? 0 : Math.sin(t * 3.1 + 1) * 0.06 + (moving ? Math.sin(phase) * 0.14 : 0);
        earL.rotation.z = earBase + wig; earR.rotation.z = -(earBase + wig);
        const step = moving ? Math.sin(phase) : 0, fy = st.sitting || st.sleeping ? -0.235 : -0.245;
        footL.position.set(-0.1, fy + Math.max(0, step) * 0.05, st.sitting ? 0.12 : 0.07); footR.position.set(0.1, fy + Math.max(0, -step) * 0.05, st.sitting ? 0.12 : 0.07);
        if (star) star.material.opacity = 0.45 + 0.55 * Math.abs(Math.sin(t * 3));
        if (capeP) capeP.rotation.x = 0.2 + Math.sin(t * 3) * 0.05 + (moving ? 0.35 * st.speed + Math.sin(phase * 2) * 0.06 : 0) + (st.sleeping ? -0.12 : 0);
        if (scarfT) scarfT.rotation.z = Math.sin(t * 2.4) * 0.12 + (moving ? Math.sin(phase) * 0.25 * st.speed : 0);
        for (const w of wings) w.g.rotation.z = w.s * (0.9 + Math.sin(t * (moving ? 14 : 3)) * 0.4);
        if (halo) { halo.position.y = haloBase + Math.sin(t * 2) * 0.015; halo.rotation.z += dt * 1.6; }
        sparks.forEach((sp, i) => { const a = t * (1.2 + i * 0.4) + i * 2.1; sp.position.set(Math.cos(a) * 0.36, 0.1 + Math.sin(a * 1.7) * 0.25, Math.sin(a) * 0.36); sp.material.opacity = 0.35 + 0.65 * Math.abs(Math.sin(t * 3 + i * 1.3)); });
        // mina
        blinkIn -= dt; if (blinkIn <= 0) { blinkT = 0.13; blinkIn = 2 + Math.random() * 3.5; } if (blinkT > 0) blinkT -= dt;
        setExpr(st.sleeping ? 'sleep' : (st.eating > 0 ? 'eat' : (st.petted > 0 ? 'happy' : (blinkT > 0 ? 'blink' : (st.hungry ? 'hungry' : (st.sad ? 'sad' : 'open'))))));
        if (st.sleeping) { zeeIn -= dt; if (zeeIn <= 0) { zeeIn = 1.1; emit('zee', 1); } }
        tag.visible = born >= 1 && st.tag !== false && !GAMES_CALM.on;   // BagaBoo Games: bez nametagów, także nad stworkami
    }
    function dispose() {
        for (const p of parts) { group.remove(p.sp); p.sp.material.dispose(); } parts.length = 0;
        for (const m of mats) m.dispose(); fTex.dispose(); tTex.dispose();
        if (group.parent) group.parent.remove(group);
    }
    return { group: group, look: look, scale: sc, update: update, setTag: setTag, burst: emit, dispose: dispose, born: () => born };
}
