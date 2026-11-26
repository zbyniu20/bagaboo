// ==========================================
// SCARY GTA: TAJEMNICA "ZAGINIONY DETEKTYW" (3D, budki, napisy; reguły, kody i pozycje w czystym core/gtamystery.js, zapis przez core/gtastore.js, testy: tests/gtamystery.mjs).
// Dwie budki z klawiaturą (Terminal jak sejf w banku, więc wpisywanie jest wygodne w VR, w przeciwieństwie do telefonu przy głowie), napis w pokoju 13 widoczny TYLKO w blackoucie,
// skrzynka u stóp dźwigu (widoczna po budce A) i walizka na pirsie (po budce B). Budki i panel ściany to jedna scalona siatka plus jeden panel z teksturą; skrzynka i walizka są ukryte
// (visible = false), dopóki nie nadejdzie ich krok. Nagrodą jest osiągnięcie gta_detective (czapka detektywa), nie Bagabucksy. Wszystko lokalne: nic przez sieć, nic nie rusza ciepła.
// ==========================================
import { THREE, L } from './engine.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Terminal, terminals, toast, AMBER, AMBER_DIM, GOLD, OK_COL, BAD_COL } from './terminal.js';
import { makeCanvas, toTex } from './textures.js';
import { unlockAchievement } from './economy.js';
import * as SFX from './audio.js';
import * as M from './gtamystery.js';
import { gtaMystery, markClue } from './gtastore.js';
import { touching } from './gtaprops.js';

const paint = (g, c) => { const n = g.attributes.position.count, a = new Float32Array(n * 3); for (let i = 0; i < n; i++) { a[i * 3] = c[0]; a[i * 3 + 1] = c[1]; a[i * 3 + 2] = c[2]; } g.setAttribute('color', new THREE.BufferAttribute(a, 3)); return g; };
const box = (w, h, d, x, y, z, c) => paint(new THREE.BoxGeometry(w, h, d).translate(x, y, z), c);
const RED = [0.75, 0.08, 0.08], DARK = [0.12, 0.12, 0.14], GLASS = [0.25, 1.2, 1.5], SIGN = [2, 0.5, 0.2];
const wrap = (text, n) => { const out = []; let line = ''; for (const w of String(text).split(' ')) { if ((line + ' ' + w).trim().length > n) { out.push(line); line = w; } else line = (line + ' ' + w).trim(); } if (line) out.push(line); return out; };

// o: { buildings, api }; api: { night() -> 'calm'|'blackout'|'horde', storm() -> bool }
export function createGtaMystery(o) {
    const api = o.api, root = L.root, sp = M.mysterySpots(o.buildings);
    const G = { geos: [], mats: [], texs: [], terms: [], radio: M.newRadioClue(), wall: M.newWallLook(), lock: { A: { bad: 0, until: 0 }, B: { bad: 0, until: 0 } }, typed: { A: '', B: '' }, msg: { A: '', B: '' }, t: 0, log: [] };
    const geo = (g) => { G.geos.push(g); return g; }, mat = (m) => { G.mats.push(m); return m; };
    let m = gtaMystery();
    const has = (id) => M.hasClue(m, id);
    // ----- budki (scalona siatka) -----
    const parts = [];
    for (const b of [sp.boothA, sp.boothB]) {
        const f = [Math.sin(b.yaw), Math.cos(b.yaw)], l = [Math.cos(b.yaw), -Math.sin(b.yaw)], at = (u, v, y, w, h, d, c) => box(Math.abs(f[0]) > 0.5 ? d : w, h, Math.abs(f[0]) > 0.5 ? w : d, b.x + f[0] * u + l[0] * v, y, b.z + f[1] * u + l[1] * v, c);
        for (const sx of [-0.5, 0.5]) for (const sz of [-0.5, 0.5]) parts.push(at(sz, sx, 1.2, 0.1, 2.4, 0.1, RED));
        parts.push(at(0, 0, 2.45, 1.2, 0.12, 1.2, RED), at(-0.5, 0, 1.2, 1.0, 2.2, 0.05, DARK), at(0, -0.5, 1.2, 0.05, 2.2, 1.0, GLASS), at(0, 0.5, 1.2, 0.05, 2.2, 1.0, GLASS), at(0.1, 0, 0.05, 1.1, 0.1, 1.1, DARK), at(0.55, 0, 2.62, 0.8, 0.2, 0.05, SIGN));
    }
    G.stat = new THREE.Mesh(geo(mergeGeometries(parts)), mat(new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false }))); root.add(G.stat);
    // ----- napis w pokoju 13 (tylko blackout) -----
    const c = makeCanvas(512, 200), x = c.getContext('2d'); x.fillStyle = '#060606'; x.fillRect(0, 0, 512, 200); x.strokeStyle = '#2aff6a'; x.lineWidth = 6; x.strokeRect(8, 8, 496, 184);
    x.fillStyle = '#2aff6a'; x.font = 'bold 64px monospace'; x.textAlign = 'center'; x.fillText('UNIT 9', 256, 92); x.font = 'bold 76px monospace'; x.fillText(M.CODES.A.split('').join(' '), 256, 170);
    const wt = toTex(c, false); G.texs.push(wt);
    G.wallM = new THREE.Mesh(geo(new THREE.PlaneGeometry(sp.wall.w, sp.wall.h)), mat(new THREE.MeshBasicMaterial({ map: wt, toneMapped: false, transparent: true, opacity: 0.92 })));
    G.wallM.position.set(sp.wall.x, sp.wall.y, sp.wall.z); G.wallM.rotation.y = sp.wall.yaw; G.wallM.visible = false; root.add(G.wallM);
    // ----- skrzynka i walizka (ukryte do swojego kroku) -----
    G.crateM = new THREE.Mesh(geo(mergeGeometries([box(0.7, 0.5, 0.5, 0, 0.25, 0, [0.45, 0.3, 0.12]), box(0.74, 0.06, 0.54, 0, 0.53, 0, [0.35, 0.22, 0.08]), box(0.1, 0.12, 0.02, 0, 0.35, -0.26, [1.6, 1.2, 0.2])])), mat(new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false })));
    G.crateM.position.set(sp.crate.x, 0, sp.crate.z); G.crateM.visible = false; root.add(G.crateM);
    G.caseM = new THREE.Mesh(geo(mergeGeometries([box(0.5, 0.3, 0.16, 0, 0.15, 0, [0.12, 0.1, 0.1]), box(0.18, 0.05, 0.04, 0, 0.33, 0, [0.12, 0.1, 0.1]), box(0.06, 0.05, 0.02, 0, 0.18, -0.09, [1.8, 1.4, 0.2]), box(1.1, 0.015, 1.1, 0, 0.005, 0, [1.6, 1.2, 0.2])])), mat(new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false })));   // złota płyta pod walizką ułatwia ją znaleźć
    G.caseM.position.set(sp.caseBox.x, 0.09, sp.caseBox.z); G.caseM.visible = false; root.add(G.caseM);

    const note = (id) => toast(M.NOTES[id], '#9ad0ff');
    function clue(id) { const r = markClue(id); if (!r.isNew) return false; m = r.state; G.log.push(id); return true; }
    // ----- klawiatury w budkach -----
    const mkBooth = (name) => {
        const b = name === 'A' ? sp.boothA : sp.boothB, len = M.codeLen(name);
        const press = (k) => {
            const now = performance.now() / 1000; if (now < G.lock[name].until) return;
            SFX.beep && SFX.beep(700 + (k.length === 1 ? +k * 40 : 0), 0.04, 0.05);
            if (k === 'CLR') G.typed[name] = ''; else if (k === 'ENT') enter(name); else if (G.typed[name].length < len) G.typed[name] += k;
            t.dirty = true;
        };
        const enter = (n) => {
            const res = M.boothResult(m, n, G.typed[n]), lk = ((r, now) => { const s = { bad: G.lock[n].bad, until: G.lock[n].until }; if (r === 'bad') { s.bad++; if (s.bad >= 3) { s.bad = 0; s.until = now + 20; } } else if (r === 'ok') s.bad = 0; return s; })(res, performance.now() / 1000);
            G.lock[n] = lk;
            if (res === 'ok') { clue(n === 'A' ? 'boothA' : 'boothB'); G.msg[n] = M.BOOTH_LINES[n]; SFX.beep && SFX.beep(880, 0.05, 0.15); later(0.3, () => SFX.bell && SFX.bell()); toast('The line clicks. A voice answers...', '#ffd27a'); }
            else if (res === 'done') G.msg[n] = M.BOOTH_LINES[n];
            else if (res === 'closed') G.msg[n] = 'Ringing... nobody answers. Not yet.';
            else { G.msg[n] = lk.until > 0 && performance.now() / 1000 < lk.until ? 'Line dead for a moment.' : 'Wrong number.'; SFX.beep && SFX.beep(150, 0.06, 0.3); }
            G.typed[n] = ''; t.dirty = true;
        };
        const t = new Terminal((tt) => {
            const done = has(name === 'A' ? 'boothA' : 'boothB'), locked = performance.now() / 1000 < G.lock[name].until;
            tt.background(); tt.header('PHONE BOOTH ' + name, done ? 'CONNECTED' : '', done ? OK_COL : AMBER_DIM);
            tt.text((G.typed[name] + '-----').slice(0, len).split('').join(' '), 240, 110, 56, locked ? BAD_COL : GOLD, 'center', true);
            const lines = wrap(locked ? 'The line is dead for a moment.' : (G.msg[name] || (done ? M.BOOTH_LINES[name] : 'Dial a number.')), 30);
            lines.slice(0, 3).forEach((ln, i) => tt.text(ln, 240, 152 + i * 22, 18, locked ? BAD_COL : AMBER, 'center'));
            ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'CLR', '0', 'ENT'].forEach((k, i) => tt.btn('k' + k, 40 + (i % 3) * 140, 230 + Math.floor(i / 3) * 84, 120, 72, k, () => press(k), { size: 32, tone: k === 'ENT' ? 'ok' : (k === 'CLR' ? 'bad' : undefined) }));
            tt.scanlines();
        }, 480, 600);
        const scr = t.createMesh(0.9, 1.125); scr.position.set(b.x + Math.sin(b.yaw) * 0.62, 1.5, b.z + Math.cos(b.yaw) * 0.62); scr.rotation.y = b.yaw; root.add(scr); t.dirty = true; G.terms.push(t);
        return { press, t, enter };
    };
    G.bA = mkBooth('A'); G.bB = mkBooth('B');

    function update(dt, c) {
        dt = Math.min(dt, 0.1); G.t += dt;
        const night = api.night(), storm = api.storm();
        // radio w burzy
        const rs = M.radioClueStep(G.radio, dt, { storm: storm, heard: has('radio') }); G.radio = rs.st;
        if (rs.say) { toast('RADIO: ' + M.RADIO_LINE, '#ffd27a'); SFX.beep && SFX.beep(520, 0.04, 0.1); if (clue('radio')) later(2.5, () => note('radio')); }
        // ściana: napis widoczny tylko w blackoucie
        const vis = M.wallVisible(night); G.wallM.visible = vis;
        const wx = sp.wall.x - c.x, wz = sp.wall.z - c.z, wd = Math.hypot(wx, wz), lh = Math.hypot(c.dx, c.dz), face = wd > 1e-6 && lh > 1e-6 ? (wx * c.dx + wz * c.dz) / (wd * lh) : 0;
        const ws = M.wallStep(G.wall, dt, { visible: vis, near: wd, facing: face }); G.wall = has('wall') ? { t: 0, done: true } : ws.st;
        if (ws.found && clue('wall')) { toast('Green letters on the wall: UNIT 9 ' + M.CODES.A.split('').join(' '), '#2aff6a'); SFX.creak && SFX.creak(0.2); later(2.5, () => note('wall')); }
        // skrzynka (po budce A) i walizka (po budce B)
        G.crateM.visible = has('boothA') && !has('crate'); G.caseM.visible = has('boothB') && !has('case');
        if (G.crateM.visible && touching(sp.crate.x, 0.4, sp.crate.z, sp.crate.r + 0.1) && clue('crate')) { G.crateM.visible = false; SFX.bell && SFX.bell(); toast('Inside the crate: a badge and a note. BADGE 4096.', '#ffd27a'); later(2.5, () => note('crate')); }
        if (G.caseM.visible && touching(sp.caseBox.x, 0.3, sp.caseBox.z, sp.caseBox.r) && clue('case')) {
            G.caseM.visible = false; SFX.bell && SFX.bell(); unlockAchievement('gta_detective');
            toast('CASE CLOSED. Unit nine was never missing. He was waiting for someone to listen.', '#7fff90'); later(3, () => toast('Detective hat unlocked.', '#ffd23a'));
        }
        for (let i = G.q.length - 1; i >= 0; i--) if (G.q[i].t <= G.t) { const f = G.q[i].fn; G.q.splice(i, 1); f(); }
    }
    G.q = [];
    function later(t, fn) { G.q.push({ t: G.t + t, fn: fn }); }
    const info = () => ({ line: M.caseLine(m), n: m.clues.length, total: M.CLUES.length, note: M.lastNote(m) });
    return {
        update, info, spots: sp, press: (booth, k) => (booth === 'A' ? G.bA : G.bB).press(k), refresh: () => { m = gtaMystery(); },
        debug: () => ({ clues: m.clues.slice(), log: G.log.slice(), wall: G.wallM.visible, crate: G.crateM.visible, case: G.caseM.visible, typed: Object.assign({}, G.typed), msg: Object.assign({}, G.msg), stat: G.stat.parent === root, info: info(), radioT: G.radio.t, wallT: G.wall.t }),
        dispose() {
            for (const t of G.terms) { const i = terminals.indexOf(t); if (i >= 0) terminals.splice(i, 1); t.tex.dispose(); }
            for (const x of [G.stat, G.wallM, G.crateM, G.caseM]) x.removeFromParent();
            for (const g of G.geos) g.dispose(); for (const x of G.mats) x.dispose(); for (const x of G.texs) x.dispose(); G.q.length = 0;
        }
    };
}
