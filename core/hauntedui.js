// ==========================================
// NAWIEDZONY TERMINAL (wspólne części dla sal Levels i Games): czcionki i kolory, oko śledzące celownik, monitor tętna, postać w szkle,
// zaciemnienie, tabliczki i budowa stanowisk (kilka ekranów z jedną grafiką). Rysowaniem treści zajmuje się sala (levels.js, games.js).
// Stan animacji ("podchodzenie" postaci) trzyma obiekt z makeDread(): { t, dread, blackT, flick, scared }.
// ==========================================
import { THREE, L, tex, addCrispBlock } from './engine.js';
import * as T from './textures.js';
import { fmtDuration } from './economy.js';
import { IS_QUEST } from './device.js';
import * as N from './network.js';

export const PROX = ['9.0 m', '7.2 m', '5.1 m', '3.4 m', '1.9 m', '0.6 m'];
export const WHISPERS = ['LISTEN.', 'STILL THERE?', 'NOT THAT ONE.', 'BEHIND YOU.', 'I CAN HEAR YOU BREATHE.', 'CHOOSE.', 'HE IS WATCHING THE DOOR.'];
export const TICKER = 'THEY ARE WATCHING YOU  ■  NO ONE CAME BACK  ■  DO NOT LOOK BEHIND YOU  ■  IT HEARS EVERY STEP  ■  TURN BACK NOW  ■  ';
export const BEAT = [[0, 32], [46, 32], [54, 26], [62, 32], [86, 32], [92, 38], [100, 4], [108, 58], [116, 32], [150, 32], [162, 24], [178, 32], [200, 32]];
export const MONO = '"VT323","Courier New",monospace', SERIF = '"IM Fell English SC",Georgia,serif', ITAL = 'italic "IM Fell English",Georgia,serif';
export const BONE = '#e8dcc6', BLOOD = '#ff3b2a', AMB = '#ffb454', AMBD = '#b88442';
let overlay = null, noise = null;

export const mmss = (sec) => fmtDuration(sec * 1000);
// Stan "obecności": postać w szkle podchodzi co 12 s, na końcu jednorazowe zaciemnienie (potem się cofa)
export function makeDread() { return { t: 0, dread: 1, blackT: 0, flick: 0, scared: false }; }
export function stepDread(st, dt, onBlack) {
    st.t += dt;
    const dread = Math.min(5, 1 + Math.floor(st.t / 12));
    if (dread !== st.dread && st.blackT <= 0) {
        st.dread = dread;
        if (dread >= 5 && !st.scared) { st.scared = true; st.blackT = 2.6; if (onBlack) onBlack(); }
    }
    if (st.blackT > 0) { st.blackT -= dt; if (st.blackT <= 0) { st.blackT = 0; st.t = 24; st.dread = 3; } }
    st.flick = Math.random() < dt * 0.25 ? 1 : Math.max(0, st.flick - dt * 4);
}
// Ilu graczy jest teraz w danej sali (ty i inni z sesji)
export function visitorsHere(roomId) {
    let n = 1;
    try { const me = N.myId(); for (const id in N.playersState) { const p = N.playersState[id]; if (id !== me && p && p.lvl === roomId) n++; } } catch (e) { /* solo: tylko ty */ }
    return n;
}
export function plateTexture(label) {   // tabliczka z numerem stanowiska nad ekranem
    const c = T.makeCanvas(256, 52), x = c.getContext('2d');
    x.fillStyle = 'rgba(10,6,4,0.85)'; x.fillRect(0, 0, 256, 52); x.strokeStyle = '#5a2018'; x.lineWidth = 3; x.strokeRect(2, 2, 252, 48);
    x.fillStyle = '#ff6a52'; x.font = 'bold 30px "Courier New", monospace'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(label, 128, 28);
    return T.toTex(c, false);
}
export function ensureAssets(W2, H2) {
    if (!overlay) {   // linie skanowania i winieta rysowane raz
        overlay = document.createElement('canvas'); overlay.width = W2; overlay.height = H2;
        const c = overlay.getContext('2d');
        c.fillStyle = 'rgba(0,0,0,0.3)'; for (let y = 0; y < H2; y += 3) c.fillRect(0, y + 1, W2, 1);
        const v = c.createRadialGradient(W2 / 2, H2 / 2, H2 * 0.35, W2 / 2, H2 / 2, W2 * 0.62); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.78)');
        c.fillStyle = v; c.fillRect(0, 0, W2, H2);
        noise = document.createElement('canvas'); noise.width = 128; noise.height = 128;
        const n = noise.getContext('2d'), img = n.createImageData(128, 128);
        for (let i = 0; i < img.data.length; i += 4) { const g = Math.random() * 255; img.data[i] = img.data[i + 1] = img.data[i + 2] = g; img.data[i + 3] = 22; }
        n.putImageData(img, 0, 0);
    }
}
export function sp(c, px) { try { c.letterSpacing = px + 'px'; } catch (e) { /* starsze przeglądarki: bez rozstrzelenia */ } }
export function tx(c, s, x, y, size, col, align, font, glow) {
    // kursywa musi stać przed rozmiarem w zapisie czcionki
    c.font = font && font.startsWith('italic ') ? 'italic ' + size + 'px ' + font.slice(7) : size + 'px ' + (font || MONO); c.fillStyle = col;
    c.textAlign = align || 'left'; c.textBaseline = 'middle';
    if (glow) { c.shadowColor = col; c.shadowBlur = glow; }
    c.fillText(s, x, y); c.shadowBlur = 0;
}

// Monitor tętna (EKG): przewija się z prędkością zależną od BPM
export function drawEcg(c, ex, ey, ew, eh, now, bpm, col) {
    c.fillStyle = 'rgba(255,180,84,0.05)'; c.fillRect(ex, ey, ew, eh); c.strokeStyle = '#4a2418'; c.lineWidth = 1; c.strokeRect(ex + 0.5, ey + 0.5, ew - 1, eh - 1);
    c.save(); c.beginPath(); c.rect(ex, ey, ew, eh); c.clip(); c.strokeStyle = col; c.lineWidth = 2.2; c.lineJoin = 'round'; c.beginPath();
    const off = (now * 200 * bpm / 60) % 200;
    for (let x = 0; x <= ew; x += 3) { const xp = (x + off) % 200; let y = 32; for (let k = 1; k < BEAT.length; k++) if (xp <= BEAT[k][0]) { const a = BEAT[k - 1], b = BEAT[k]; y = a[1] + (b[1] - a[1]) * (xp - a[0]) / (b[0] - a[0] || 1); break; } x ? c.lineTo(ex + x, ey + y * 0.85 + 4) : c.moveTo(ex + x, ey + y * 0.85 + 4); }
    c.stroke(); c.restore();
}
// Oko patrzy za celownikiem gracza
export function drawEye(c, cx, cy, t, S) {
    const p = t.pointer, tx0 = p ? p.x : cx - 60, ty0 = p ? p.y : cy + 30;
    const dx = Math.max(-18, Math.min(18, (tx0 - cx) * 0.08)), dy = Math.max(-8, Math.min(8, (ty0 - cy) * 0.08));
    const blink = Math.floor(S.t * 10) % 80 === 0 ? 0.12 : 1;
    c.save(); c.translate(cx, cy); c.scale(1, blink);
    c.beginPath(); c.moveTo(-62, 0); c.quadraticCurveTo(0, -48, 62, 0); c.quadraticCurveTo(0, 48, -62, 0); c.closePath(); c.fillStyle = BONE; c.fill();
    c.save(); c.clip(); c.fillStyle = '#9a0f06'; c.beginPath(); c.arc(dx, dy, 22, 0, 7); c.fill(); c.fillStyle = '#050202'; c.beginPath(); c.arc(dx, dy, 10, 0, 7); c.fill();
    c.fillStyle = '#fff4e4'; c.beginPath(); c.arc(dx - 6, dy - 7, 3.4, 0, 7); c.fill(); c.restore();
    c.strokeStyle = BLOOD; c.lineWidth = 2.5; c.beginPath(); c.moveTo(-62, 0); c.quadraticCurveTo(0, -48, 62, 0); c.quadraticCurveTo(0, 48, -62, 0); c.closePath(); c.stroke();
    c.restore();
}
// Warstwa "szkła": postać w odbiciu, szepty, ziarno, linie skanowania, błysk, zaciemnienie
export function drawGlass(c, W2, H2, t, S) {
    const dread = S.dread, s = 0.5 + dread * 0.13, a = 0.1 + dread * 0.075, bl = Math.max(0, 5 - dread) * 1.2 + 0.4;
    c.save(); c.translate(W2 * 0.58, H2 + 24); c.scale(s * 0.9, s * 0.9); c.globalAlpha = a;
    if (!IS_QUEST) c.filter = 'blur(' + bl.toFixed(1) + 'px)';
    c.fillStyle = '#000';
    c.beginPath(); c.moveTo(-144, 0); c.bezierCurveTo(-136, -112, -70, -148, -30, -158); c.lineTo(30, -158); c.bezierCurveTo(70, -148, 136, -112, 144, 0); c.closePath(); c.fill();
    c.fillRect(-22, -194, 44, 50); c.beginPath(); c.ellipse(0, -254, 56, 70, 0, 0, 7); c.fill();
    c.beginPath(); c.moveTo(-58, -270); c.bezierCurveTo(-70, -210, -66, -140, -44, -98); c.bezierCurveTo(-52, -160, -48, -210, -38, -254); c.fill();
    c.beginPath(); c.moveTo(58, -270); c.bezierCurveTo(70, -210, 66, -140, 44, -98); c.bezierCurveTo(52, -160, 48, -210, 38, -254); c.fill();
    c.strokeStyle = 'rgba(255,196,150,0.2)'; c.lineWidth = 3; c.beginPath(); c.moveTo(-52, -284); c.bezierCurveTo(-38, -332, 38, -332, 52, -284); c.stroke();
    const eo = dread >= 4 ? 0.9 : (dread === 3 ? 0.3 : 0);
    if (eo) { c.filter = 'none'; c.globalAlpha = Math.min(1, a * 2) * eo; c.fillStyle = '#fff4e4'; c.beginPath(); c.ellipse(-22, -248, 7, 5, 0, 0, 7); c.ellipse(22, -248, 7, 5, 0, 0, 7); c.fill(); }
    c.restore(); c.filter = 'none'; c.globalAlpha = 1;
    if (dread >= 3 && S.blackT <= 0) { c.save(); c.translate(W2 - 70, H2 - 96); c.rotate(-0.052); tx(c, WHISPERS[Math.floor(S.t / 6) % WHISPERS.length], 0, 0, 30, 'rgba(255,70,50,0.6)', 'right', ITAL); c.restore(); }
    // ziarno, skanowanie, winieta, błysk lampy
    if (noise) { c.save(); c.globalCompositeOperation = 'overlay'; c.fillStyle = c.createPattern(noise, 'repeat'); c.translate(-Math.floor(Math.random() * 128), -Math.floor(Math.random() * 128)); c.fillRect(0, 0, W2 + 128, H2 + 128); c.restore(); }
    if (overlay) c.drawImage(overlay, 0, 0);
    if (S.flick > 0) { c.fillStyle = 'rgba(255,40,16,' + (0.1 * S.flick).toFixed(2) + ')'; c.fillRect(0, 0, W2, H2); }
    const g = c.createLinearGradient(0, 0, W2 * 0.5, H2 * 0.7); g.addColorStop(0, 'rgba(255,245,230,0.12)'); g.addColorStop(0.45, 'rgba(255,245,230,0)'); c.fillStyle = g; c.fillRect(0, 0, W2, H2);
    // jednorazowe zaciemnienie: dwoje oczu i napis
    if (S.blackT > 0) {
        const al = Math.min(1, S.blackT / 0.5, (2.6 - S.blackT + 0.6) / 0.6); c.globalAlpha = Math.max(0, Math.min(1, al)); c.fillStyle = '#030201'; c.fillRect(0, 0, W2, H2);
        c.fillStyle = '#fff4e4'; c.beginPath(); c.ellipse(W2 / 2 - 70, H2 / 2 - 40, 34, 20, 0, 0, 7); c.ellipse(W2 / 2 + 70, H2 / 2 - 40, 34, 20, 0, 0, 7); c.fill();
        c.fillStyle = '#000'; c.beginPath(); c.arc(W2 / 2 - 70, H2 / 2 - 40, 7, 0, 7); c.arc(W2 / 2 + 70, H2 / 2 - 40, 7, 0, 7); c.fill();
        sp(c, 6); tx(c, 'I SEE YOU.', W2 / 2, H2 / 2 + 50, 58, BONE, 'center', SERIF); sp(c, 0); c.globalAlpha = 1;
    }
}

// Stanowiska: obudowa + pulpit + ekran(y) z tą samą grafiką + tabliczka + poświata (bez światła punktowego). st: { x, z, rotY, both }
// rotY=0: ekran patrzy na +z; both: wolnostojący pylon z ekranami po obu stronach (drugi obrócony o pi)
export function addStations(term, stations, drawCfg) {
    let first = !term.mesh;   // po zmianie poziomu główny ekran jest zerowany: pierwszy ekran tworzy grafikę od nowa, reszta dokłada widoki
    stations.forEach((st, k) => {
        const faces = st.both ? [st.rotY, st.rotY + Math.PI] : [st.rotY];
        const horiz = Math.abs(Math.sin(st.rotY)) < 0.5;
        const baseAlong = (r, dx, dz) => [st.x + Math.cos(r) * dx + Math.sin(r) * dz, st.z - Math.sin(r) * dx + Math.cos(r) * dz];
        const r0 = st.rotY, bez = st.both ? [st.x, st.z] : baseAlong(r0, 0, 0.18), desk = st.both ? [st.x, st.z] : baseAlong(r0, 0, 1.0);
        addCrispBlock(bez[0], 2.65, bez[1], horiz ? 5.5 : 0.36, 3.55, horiz ? 0.36 : 5.5, 0x14100e, 0x2a1a14);
        if (st.both) addCrispBlock(desk[0], 0.45, desk[1], horiz ? 6.2 : 2.6, 0.9, horiz ? 2.6 : 6.2, 0x2a1a14, 0x100808);
        else addCrispBlock(desk[0], 0.45, desk[1], horiz ? 6.2 : 1.2, 0.9, horiz ? 1.2 : 6.2, 0x2a1a14, 0x100808);
        faces.forEach((r, fi) => {
            const off = st.both ? 0.19 : 0.37, scr = baseAlong(r, 0, st.both ? off : off);
            const sp0 = st.both ? [st.x + Math.sin(r) * off, st.z + Math.cos(r) * off] : scr;
            const screen = first ? term.createMesh(4.8, 3.0) : term.addMesh(4.8, 3.0); first = false;
            screen.position.set(sp0[0], 2.65, sp0[1]); screen.rotation.y = r; L.root.add(screen);
            const plate = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.3), new THREE.MeshBasicMaterial({ map: plateTexture((drawCfg && drawCfg.label ? drawCfg.label : 'TERMINAL') + ' ' + (k * faces.length + fi + 1)), transparent: true, toneMapped: false }));
            const pl = st.both ? [st.x + Math.sin(r) * 0.22, st.z + Math.cos(r) * 0.22] : baseAlong(r, 0, 0.4); plate.position.set(pl[0], 4.72, pl[1]); plate.rotation.y = r; L.root.add(plate);
            const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex.dot, color: (drawCfg && drawCfg.halo) || 0xff3020, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.35 }));
            const hp = st.both ? [st.x + Math.sin(r) * 1.4, st.z + Math.cos(r) * 1.4] : baseAlong(r, 0, 1.2); halo.scale.set(6.5, 4.2, 1); halo.position.set(hp[0], 2.65, hp[1]); L.root.add(halo);
        });
    });
}
