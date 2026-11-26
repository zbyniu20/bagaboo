// ==========================================
// SCARY GTA: EASTER EGGI (3D, dźwięk i napisy; reguły i pozycje w czystym core/gtaeggs.js, zapis przez core/gtastore.js, testy: tests/gtaeggs.mjs).
// Statyczne rekwizyty (złota kaczka na wieży radiowej, złoty automat w kasynie) to JEDNA scalona siatka; efekty (oko z głębiny, postać w szafie i pasażer-widmo, monety) są ukryte (visible = false,
// zero wywołań rysowania), dopóki jajko ich nie odpali. Wszystko lokalne: nic nie idzie przez sieć, nic nie zmienia ciepła ani gwiazdek. Na poziomie brutalności Gentle
// (SETTINGS.jumpscares === false) nie ma ryku ani postaci w szafie, ale jajko nadal się zalicza. Bez stroba: wszystko pojawia się płynnie, a ruch jest wolny (komfort VR).
// ==========================================
import { THREE, L } from './engine.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { toast } from './terminal.js';
import { SETTINGS } from './settings.js';
import { SAVE } from './economy.js';
import * as SFX from './audio.js';
import * as E from './gtaeggs.js';
import { gtaEggs, markGtaEgg } from './gtastore.js';
import { touching } from './gtaprops.js';
import { sanitizeName } from './voicelogic.js';

const paint = (g, c) => { const n = g.attributes.position.count, a = new Float32Array(n * 3); for (let i = 0; i < n; i++) { a[i * 3] = c[0]; a[i * 3 + 1] = c[1]; a[i * 3 + 2] = c[2]; } g.setAttribute('color', new THREE.BufferAttribute(a, 3)); return g; };
const box = (w, h, d, x, y, z, c) => paint(new THREE.BoxGeometry(w, h, d).translate(x, y, z), c);
const ball = (r, x, y, z, c, sx, sy, sz) => paint(new THREE.SphereGeometry(r, 12, 9).scale(sx || 1, sy || 1, sz || 1).translate(x, y, z), c);
const ease = (t) => t * t * (3 - 2 * t);

// o: { buildings, api }; api: { stars(), night() -> 'calm'|'blackout'|'horde', ride() -> { x, z, yaw } | null, mic() }
export function createGtaEggs(o) {
    const api = o.api, root = L.root, B = o.buildings, sp = E.eggSpots(B);
    const G = { geos: [], mats: [], t: 0, q: [], cd: {}, det: { room13: E.newDetector(), kraken: E.newDetector(), knock: E.newDetector(), sixth: E.newDetector(), rooftop: E.newDetector() }, ghost: E.newGhost(), log: [], figW: 0, eyeT: -1, coinT: -1, found: new Set(gtaEggs().found) };
    const geo = (g) => { G.geos.push(g); return g; }, mat = (m) => { G.mats.push(m); return m; };
    const calm = () => SETTINGS.jumpscares === false;
    const nick = () => (sanitizeName(SAVE.profile && SAVE.profile.name) || 'friend').toUpperCase();
    // ----- statyczne rekwizyty: kaczka i złoty automat -----
    const yellow = [1.3, 1.0, 0.12], orange = [1.5, 0.55, 0.1], gold = [1.6, 1.15, 0.25], dark = [0.1, 0.1, 0.12], red = [2, 0.2, 0.2], glow = [0.4, 2, 0.6];
    const parts = [], d = sp.duck;
    parts.push(ball(0.11, d.x, d.y + 0.09, d.z, yellow, 1, 0.85, 1.2), ball(0.07, d.x, d.y + 0.22, d.z - 0.09, yellow), box(0.06, 0.025, 0.07, d.x, d.y + 0.21, d.z - 0.17, orange), ball(0.012, d.x - 0.03, d.y + 0.24, d.z - 0.14, dark), ball(0.012, d.x + 0.03, d.y + 0.24, d.z - 0.14, dark));
    const m = sp.slots.machine, mc = { x: (m.x0 + m.x1) / 2, z: (m.z0 + m.z1) / 2 }, slotB = B.find(b => b.id === '3,0,0'), bcx = (slotB.x0 + slotB.x1) / 2, bcz = (slotB.z0 + slotB.z1) / 2;
    const fx = Math.abs(bcx - mc.x) > Math.abs(bcz - mc.z) ? Math.sign(bcx - mc.x) : 0, fz = fx ? 0 : Math.sign(bcz - mc.z) || -1, w = m.x1 - m.x0, dp = m.z1 - m.z0;
    parts.push(box(w, 1.7, dp, mc.x, 0.85, mc.z, gold), box(fx ? 0.04 : w * 0.7, 0.5, fz ? 0.04 : dp * 0.7, mc.x + fx * (w / 2 + 0.02), 1.25, mc.z + fz * (dp / 2 + 0.02), glow), box(fx ? 0.04 : w * 0.8, 0.2, fz ? 0.04 : dp * 0.8, mc.x + fx * (w / 2 + 0.02), 1.6, mc.z + fz * (dp / 2 + 0.02), red));
    const k = sp.slots.knob; parts.push(ball(0.06, k.x, k.y, k.z, red), box(fx ? 0.12 : 0.03, 0.03, fz ? 0.12 : 0.03, k.x - fx * 0.06, k.y, k.z - fz * 0.06, dark));
    G.stat = new THREE.Mesh(geo(mergeGeometries(parts)), mat(new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false }))); G.stat.frustumCulled = true; root.add(G.stat);
    // ----- efekty (ukryte do odpalenia) -----
    const eyeMat = mat(new THREE.MeshBasicMaterial({ color: 0xe8e0b0, toneMapped: false })), irisMat = mat(new THREE.MeshBasicMaterial({ color: 0xd01808, toneMapped: false })), pupMat = mat(new THREE.MeshBasicMaterial({ color: 0x050505 }));
    G.eye = new THREE.Group(); G.eye.visible = false;
    G.eye.add(new THREE.Mesh(geo(new THREE.SphereGeometry(1.1, 18, 14)), eyeMat));
    const iris = new THREE.Mesh(geo(new THREE.SphereGeometry(0.55, 14, 10)), irisMat); iris.position.z = -0.7; G.eye.add(iris);
    const pup = new THREE.Mesh(geo(new THREE.SphereGeometry(0.2, 10, 8)), pupMat); pup.scale.set(0.35, 1.6, 0.4); pup.position.z = -1.17; G.eye.add(pup);
    root.add(G.eye);
    const fig = geo(mergeGeometries([box(0.46, 0.7, 0.24, 0, 1.15, 0, [0.8, 0.8, 0.78]), ball(0.13, 0, 1.68, 0, [0.82, 0.82, 0.8]), box(0.15, 0.8, 0.15, -0.13, 0.4, 0, [0.76, 0.76, 0.74]), box(0.15, 0.8, 0.15, 0.13, 0.4, 0, [0.76, 0.76, 0.74]), box(0.12, 0.7, 0.12, -0.32, 1.1, 0, [0.76, 0.76, 0.74]), box(0.12, 0.7, 0.12, 0.32, 1.1, 0, [0.76, 0.76, 0.74])]));
    const figMat = mat(new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false }));
    G.figW = new THREE.Mesh(fig, figMat); G.figW.visible = false; root.add(G.figW);   // postać z szafy w pokoju 13
    G.figG = new THREE.Mesh(fig, figMat); G.figG.visible = false; root.add(G.figG);   // pasażer-widmo na pace
    const cp = new Float32Array(30 * 3), cg = geo(new THREE.BufferGeometry()); cg.setAttribute('position', new THREE.BufferAttribute(cp, 3));
    G.coins = new THREE.Points(cg, mat(new THREE.PointsMaterial({ color: 0xffd23a, size: 0.12, toneMapped: false, sizeAttenuation: true }))); G.coins.visible = false; G.coins.frustumCulled = false; root.add(G.coins);

    const later = (t, fn) => G.q.push({ t: G.t + t, fn });
    const say = (txt, color) => toast(txt, color || '#9ad0ff');
    const where = (p) => ({ x: p.x, y: p.y === undefined ? 1.2 : p.y, z: p.z });
    function award(id) {
        const r = markGtaEgg(id); if (!r.isNew) return; G.found.add(id); G.log.push(id);
        const e = E.eggById(id); say('Easter egg ' + r.state.found.length + '/' + E.EGGS.length + ': ' + e.name + ' (+' + r.bones + ' Bagabucks)', '#ffd23a'); SFX.bell && SFX.bell();
        if (r.all) later(1.2, () => say('All ' + E.EGGS.length + ' Scary GTA eggs found! The city respects you. (+' + E.ALL_BONUS + ')', '#7fff90'));
    }
    const todo = (id) => !G.found.has(id);

    function update(dt, c) {
        dt = Math.min(dt, 0.1); G.t += dt;
        for (let i = G.q.length - 1; i >= 0; i--) if (G.q[i].t <= G.t) { const f = G.q[i].fn; G.q.splice(i, 1); f(); }
        for (const k of Object.keys(G.cd)) G.cd[k] = Math.max(0, G.cd[k] - dt);
        const px = c.x, py = c.y, pz = c.z, ride = c.ride !== undefined ? c.ride : api.ride(), night = c.night || api.night(), stars = c.stars !== undefined ? c.stars : api.stars();
        // kaczka: dotyk (zawsze piszczy, płaci raz)
        const dk = sp.duck;
        if (!G.cd.duck && touching(dk.x, dk.y + 0.15, dk.z, dk.r)) { G.cd.duck = 1.6; SFX.beep && SFX.beep(1700, 0.05, 0.05); later(0.12, () => SFX.beep && SFX.beep(1250, 0.05, 0.07)); if (todo('duck')) say('Squeak! A golden duck. Of course there is one.', '#ffd23a'); award('duck'); }
        // złoty automat: pociągnięcie dźwigni sypie monety
        const kb = sp.slots.knob;
        if (!G.cd.slots && touching(kb.x, kb.y, kb.z, kb.r)) {
            G.cd.slots = 3; G.coinT = 0; for (let i = 0; i < 4; i++) later(0.2 + i * 0.25, () => SFX.beep && SFX.beep(500 + i * 220, 0.05, 0.1)); later(1.2, () => { SFX.bell && SFX.bell(); });
            if (todo('slots')) say('7 - 7 - 7! The machine pays in coins that are not real.', '#ffd23a'); award('slots');
        }
        // pokój 13: stanie w bezruchu obok skrwawionego łóżka
        const r13 = sp.room13;
        if (todo('room13') && E.stillAt(G.det.room13, Math.hypot(px - r13.x, pz - r13.z) < r13.r && Math.abs(py - r13.y) < 1.6, c.speed, dt, r13.seconds)) {
            if (SFX.whisper) SFX.whisper(where(r13)); say('"' + nick() + '... stay..."', '#ffb0b0');
            if (!calm()) { G.figW.position.set(r13.ghost.x, 0, r13.ghost.z); G.figW.rotation.y = Math.atan2(px - r13.ghost.x, pz - r13.ghost.z); G.figW.visible = true; G.figWT = G.t + 2.6; }
            award('room13');
        }
        if (G.figW.visible && G.t > G.figWT) G.figW.visible = false;
        // głębina: wpatrywanie się w wodę z końca pirsu
        const kr = sp.kraken;
        if (todo('kraken') && E.gazeAt(G.det.kraken, E.onPier(kr.stand, px, pz), E.lookDot(px, pz, kr.eye.x, kr.eye.z, c.dx, c.dz), c.dy, dt)) {
            G.eyeT = 0; if (!calm() && SFX.roar) SFX.roar(0.18, where(kr.eye)); say('Something very large just blinked.', '#9ad0ff'); award('kraken');
        }
        // zajęty śmietnik: trzy puknięcia
        const ds = sp.dumpster;
        if (todo('dumpster') && E.knockStep(G.det.knock, touching(ds.x, ds.y, ds.z, ds.r), G.t)) {
            SFX.bang && SFX.bang(where(ds)); later(0.7, () => { SFX.whisper && SFX.whisper(where(ds)); say('"...not now."', '#ffb0b0'); award('dumpster'); });
        }
        // szósta gwiazdka: pięć gwiazdek i spokój na szczycie dźwigu (tylko żart: ciepło się nie zmienia)
        const sx = sp.sixth;
        if (todo('sixth') && E.stillAt(G.det.sixth, stars >= 5 && E.onCraneTop(sx, px, py, pz), c.speed, dt, 8)) {
            say('RADIO: All units, stand down. Nice view. (Your wanted level did not change.)', '#ffd27a'); SFX.beep && SFX.beep(880, 0.05, 0.12); award('sixth');
        }
        // echo na dachu kasyna: krzyk do mikrofonu (policja też go słyszy)
        if (todo('rooftop') && E.onRoof(sp.rooftop, px, py, pz) && E.shoutStep(G.det.rooftop, c.mic || 0, dt)) {
            later(1.4, () => { SFX.whisper && SFX.whisper(where({ x: px + 30, y: py, z: pz + 30 })); say('"' + nick() + '... ' + nick() + '..." The city answers.', '#ffb0b0'); award('rooftop'); });
        }
        // pasażer-widmo
        const gs = E.ghostStep(G.ghost, dt, { riding: !!ride, blackout: night === 'blackout' }); G.ghost = gs.st;
        if (gs.show && ride) {
            const f = [Math.sin(ride.yaw), Math.cos(ride.yaw)], l = [Math.cos(ride.yaw), -Math.sin(ride.yaw)];
            G.figG.position.set(ride.x - f[0] * 1.1 + l[0] * 0.8, 0.8, ride.z - f[1] * 1.1 + l[1] * 0.8); G.figG.rotation.y = ride.yaw + Math.PI; G.figG.visible = true;
        } else G.figG.visible = false;
        if (gs.event === 'found' && todo('ghost')) { say('"Passenger? What passenger?" The truck was empty.', '#ffb0b0'); award('ghost'); }
        // animacje: oko z głębiny (płynnie, bez migotania) i monety
        if (G.eyeT >= 0) {
            G.eyeT += dt; const t = G.eyeT, up = t < 1.6 ? ease(t / 1.6) : t < 3.6 ? 1 : 1 - ease((t - 3.6) / 1.6);
            if (t > 5.2) { G.eyeT = -1; G.eye.visible = false; } else { G.eye.visible = true; G.eye.position.set(kr.eye.x, kr.eye.y - 3.6 + up * 3.6, kr.eye.z); G.eye.rotation.y = Math.atan2(kr.eye.x - px, kr.eye.z - pz); }   // źrenica (lokalne -z) patrzy na gracza
        }
        if (G.coinT >= 0) {
            G.coinT += dt; const t = G.coinT, p = G.coins.geometry.attributes.position, mcn = sp.slots.coins;
            if (t > 1.8) { G.coinT = -1; G.coins.visible = false; } else {
                G.coins.visible = true;
                for (let i = 0; i < 30; i++) { const a = i * 2.399, sp0 = 0.6 + (i % 5) * 0.25, h = Math.max(0, 2.2 * t * sp0 - 4.4 * t * t); p.setXYZ(i, mcn.x + Math.cos(a) * sp0 * t * 0.9, mcn.y - 0.3 + h, mcn.z + Math.sin(a) * sp0 * t * 0.9); }
                p.needsUpdate = true;
            }
        }
    }
    const info = () => ({ n: G.found.size, total: E.EGGS.length, hint: E.nextHint({ found: Array.from(G.found), paid: [] }) });
    const debug = () => ({ info: info(), found: Array.from(G.found), log: G.log.slice(), eye: G.eye.visible, figW: G.figW.visible, figG: G.figG.visible, coins: G.coins.visible, ghostT: G.ghost.t, stat: G.stat.parent === root, det: { room13: G.det.room13.t, kraken: G.det.kraken.t, sixth: G.det.sixth.t, rooftop: G.det.rooftop.t, knock: G.det.knock.n } });
    return {
        update, info, debug, spots: sp,
        dispose() { G.stat.removeFromParent(); for (const x of [G.eye, G.figW, G.figG, G.coins]) x.removeFromParent(); for (const g of G.geos) g.dispose(); for (const m of G.mats) m.dispose(); G.q.length = 0; }
    };
}
