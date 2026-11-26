// ==========================================
// SCARY GTA: DODATKI (3D i interakcje; reguły w czystym core/gtaextras.js, zapis w core/gtastore.js, testy: tests/gtaextras.mjs).
// Kabiny Pay 'n' Spray, przebranie w kryjówkach, wspinaczki na czas (casino i wieża), 13 paczek-graffiti, manekiny w witrynach, sejf w banku z kodem z paragonu na stacji, dźwignia prądu
// przy kasynie, wspinaczkowy dźwig oraz telefon z mapą (pojawia się, gdy spojrzysz w dół). Statyczne elementy to JEDNA scalona siatka, paczki to jedna InstancedMesh.
// Dłonie liczy hands (core/player.js); testy podstawiają własne punkty przez debugTouchProbe.
// ==========================================
import { THREE, CANNON, L, camera, addStaticBody } from './engine.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Terminal, terminals, toast, AMBER, AMBER_DIM, GOLD, OK_COL, BAD_COL } from './terminal.js';
import { addBones, spendBones, dailyDate, SAVE } from './economy.js';
import { hands } from './player.js';
import { cameraPanel, panelBg } from './levelkit.js';
import * as SFX from './audio.js';
import * as X from './gtaextras.js';
import * as C from './citylayout.js';
import { climbStep, formatTime } from './climblogic.js';
import { getGta, setGta } from './gtastore.js';

const _w = new THREE.Vector3(), _d = new THREE.Vector3();
let probe = null;
export const debugTouchProbe = (fn) => { probe = fn; };
const paint = (g, r, gr, b) => { const n = g.attributes.position.count, a = new Float32Array(n * 3); for (let i = 0; i < n; i++) { a[i * 3] = r; a[i * 3 + 1] = gr; a[i * 3 + 2] = b; } g.setAttribute('color', new THREE.BufferAttribute(a, 3)); return g; };
const box = (w, h, d, x, y, z, c) => paint(new THREE.BoxGeometry(w, h, d).translate(x, y, z), c[0], c[1], c[2]);
const handPoints = () => { if (probe) return probe(); const out = []; for (const h of [hands.L, hands.R]) { if (!h) continue; h.getWorldPosition(_w); out.push([_w.x, _w.y, _w.z]); } return out; };
export const touching = (x, y, z, r) => handPoints().some(p => Math.hypot(p[0] - x, p[1] - y, p[2] - z) < r);

// o: { buildings, api }; api: { stars, seenT, clearHeat, addHeat, setSight, setPower(on), bags() -> [{id,x,z,got}], cops() -> [{x,z}], heli() -> {x,z}|null }
export function createGtaProps(o) {
    const api = o.api, B = o.buildings, root = L.root, G = { geos: [], mats: [], terms: [], spray: X.newSpray(), dis: X.newDisguise(), power: X.newPower(), climbs: {}, lock: X.newLock(), typed: '', msg: '', phoneT: 0, mans: [], tagsGot: 0, lastClimb: '' };
    const geo = (g) => { G.geos.push(g); return g; }, mat = (m) => { G.mats.push(m); return m; };
    const spots = { climb: X.climbSpots(B), tags: X.tagSpots(B), win: X.windowSpots(), power: X.powerSpot() };
    // ----- statyczna siatka: kabiny, pola startu, dzwony, podstacja, dźwig -----
    const parts = [], green = [0.2, 2, 0.5], pink = [2.2, 0.3, 1.2], steel = [0.3, 0.32, 0.36], gold = [2, 1.5, 0.3];
    for (const s of X.SPRAY.SPOTS) {
        parts.push(paint(new THREE.CylinderGeometry(X.SPRAY.R, X.SPRAY.R, 0.04, 28).translate(s.x, 0.06, s.z), green[0], green[1], green[2]));
        for (const sx of [-1.4, 1.4]) parts.push(box(0.15, 3, 0.15, s.x + sx, 1.5, s.z, steel));
        parts.push(box(3.2, 0.16, 1.4, s.x, 3.05, s.z, steel)); parts.push(box(2.6, 0.5, 0.06, s.x, 2.6, s.z + 0.7, pink));
    }
    for (const c of spots.climb) {
        parts.push(paint(new THREE.CylinderGeometry(1.1, 1.1, 0.04, 20).translate(c.pad[0], 0.06, c.pad[2]), 0.3, 1.8, 2));
        parts.push(paint(new THREE.SphereGeometry(0.28, 12, 9).translate(c.bell[0], c.bell[1], c.bell[2]), gold[0], gold[1], gold[2]));
        parts.push(box(0.06, 0.6, 0.06, c.bell[0], c.bell[1] + 0.5, c.bell[2], steel));
    }
    const ps = spots.power; parts.push(box(1.0, 1.9, 0.9, ps.x + 0.9, 0.95, ps.z, [0.22, 0.24, 0.27])); parts.push(box(0.16, 0.34, 0.16, ps.x, ps.y, ps.z, [2.2, 0.3, 0.2]));
    const CR = C.CRANE; parts.push(box(CR.w, CR.h, CR.w, CR.x, CR.h / 2, CR.z, [0.9, 0.72, 0.1])); parts.push(box(14, 0.7, 0.7, CR.x + 6, CR.h + 1.2, CR.z, [0.9, 0.72, 0.1])); parts.push(box(2.4, 1.6, 1.6, CR.x - 2.2, CR.h + 0.8, CR.z, [0.35, 0.34, 0.3]));
    G.stat = new THREE.Mesh(geo(mergeGeometries(parts)), mat(new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false }))); root.add(G.stat);
    addStaticBody(CR.x, CR.h / 2, CR.z, new CANNON.Box(new CANNON.Vec3(CR.w / 2, CR.h / 2, CR.w / 2)), G.stat, false);   // dźwig: lita wieża, chwytna jak rusztowanie
    // ----- paczki-graffiti -----
    G.tagM = new THREE.InstancedMesh(geo(new THREE.OctahedronGeometry(0.2)), mat(new THREE.MeshBasicMaterial({ toneMapped: false })), spots.tags.length); G.tagM.frustumCulled = false; root.add(G.tagM);
    const found = getGta().found, dummy = new THREE.Object3D(), col = new THREE.Color();
    spots.tags.forEach((t, i) => { dummy.position.set(t.x, t.y, t.z); dummy.scale.setScalar(found.includes(t.id) ? 0 : 1); dummy.updateMatrix(); G.tagM.setMatrixAt(i, dummy.matrix); G.tagM.setColorAt(i, col.setHex(i % 2 ? 0xff2a9a : 0x20e0ff)); }); G.tagM.instanceMatrix.needsUpdate = true; G.tagsGot = found.length;
    // ----- manekiny w witrynach (4 siatki) -----
    const mp = [box(0.5, 0.7, 0.26, 0, 1.15, 0, [0.82, 0.8, 0.76]), paint(new THREE.SphereGeometry(0.14, 10, 8).translate(0, 1.67, 0), 0.85, 0.83, 0.8), box(0.16, 0.8, 0.16, -0.14, 0.4, 0, [0.8, 0.78, 0.74]), box(0.16, 0.8, 0.16, 0.14, 0.4, 0, [0.8, 0.78, 0.74]), box(0.12, 0.7, 0.12, -0.34, 1.12, 0, [0.8, 0.78, 0.74]), box(0.12, 0.7, 0.12, 0.34, 1.12, 0, [0.8, 0.78, 0.74])];
    const manG = geo(mergeGeometries(mp)), manMat = mat(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55 }));
    spots.win.forEach((w) => { const m = new THREE.Mesh(manG, manMat); m.position.set(w.x, 0, w.z); root.add(m); G.mans.push({ m: m, x: w.x, z: w.z, hx: w.x, hz: w.z }); });
    // ----- terminal sejfu w banku i paragon na stacji -----
    const bank = B.find(b => b.name === 'bank'), gas = B.find(b => b.name === 'gas');
    const press = (k) => {
        const now = performance.now() / 1000; if (now < G.lock.until) return;
        SFX.beep && SFX.beep(700 + (k.length === 1 ? +k * 40 : 0), 0.04, 0.05);
        if (k === 'CLR') G.typed = ''; else if (k === 'ENT') enter(); else if (G.typed.length < 4) G.typed += k;
        G.vt.dirty = true;
    };
    const enter = () => {
        const today = dailyDate(), gta = getGta(), res = X.gtaVaultCheck(gta, G.typed, today), lk = X.lockStep(G.lock, res, performance.now() / 1000);
        G.lock = lk.lock; G.vt.dirty = true;
        if (res === 'ok') { setGta(Object.assign({}, gta, { vault: today })); addBones(X.GVAULT.BONES, 'Bank vault'); api.addHeat(X.GVAULT.HEAT); G.msg = 'OPEN! +' + X.GVAULT.BONES; toast('The bank vault opens: +' + X.GVAULT.BONES + ' Bagabucks. The alarm is ringing!', '#ffd27a'); SFX.bell && SFX.bell(); G.vaultOpened = (G.vaultOpened || 0) + 1; }
        else if (res === 'done') G.msg = 'Already emptied today.';
        else { G.msg = lk.locked ? 'Too many tries. Alarm!' : 'Wrong code.'; if (lk.locked) api.addHeat(X.GVAULT.HEAT); SFX.beep && SFX.beep(150, 0.06, 0.3); }
        G.typed = '';
    };
    G.press = press;
    if (bank) {
        G.vt = new Terminal((t) => {
            const done = getGta().vault === dailyDate(), locked = performance.now() / 1000 < G.lock.until;
            t.background(); t.header('BANK VAULT', done ? 'EMPTY TODAY' : '', done ? OK_COL : AMBER_DIM);
            t.text((G.typed + '----').slice(0, 4).split('').join(' '), 240, 118, 64, locked ? BAD_COL : GOLD, 'center', true);
            t.text(locked ? 'LOCKED' : (G.msg || (done ? 'Come back tomorrow.' : 'Code: see the fuel receipt')), 240, 168, 22, locked ? BAD_COL : AMBER, 'center');
            ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'CLR', '0', 'ENT'].forEach((k, i) => t.btn('k' + k, 40 + (i % 3) * 140, 200 + Math.floor(i / 3) * 90, 120, 78, k, () => press(k), { size: 34, tone: k === 'ENT' ? 'ok' : (k === 'CLR' ? 'bad' : undefined) }));
            t.scanlines();
        }, 480, 600);
        const scr = G.vt.createMesh(1.0, 1.25); scr.position.set((bank.x0 + bank.x1) / 2, 1.5, (bank.z0 + bank.z1) / 2 - 1.5); root.add(scr); G.vt.dirty = true; G.terms.push(G.vt);
    }
    if (gas) {
        G.rt = new Terminal((t) => { t.background(); t.header('FUEL RECEIPT', dailyDate(), AMBER_DIM); t.text('TOTAL', 240, 150, 30, AMBER, 'center'); t.text(X.gtaCode(dailyDate()), 240, 260, 110, GOLD, 'center', true); t.text('No. ' + X.gtaCode(dailyDate()) + '  THANK YOU', 240, 360, 20, AMBER_DIM, 'center'); t.scanlines(); }, 480, 420);
        const scr = G.rt.createMesh(0.9, 0.79); scr.position.set((gas.x0 + gas.x1) / 2 + 1.5, 1.4, (gas.z0 + gas.z1) / 2); scr.rotation.y = -Math.PI / 2; root.add(scr); G.rt.dirty = true; G.terms.push(G.rt);
    }
    // ----- telefon (mapa) -----
    G.phone = cameraPanel(X.PHONE.SIZE, X.PHONE.SIZE, 0.34, 0.34, -0.14, -0.55, 992); G.phone.mesh.visible = false;
    function drawPhone(c) {
        const x = G.phone.ctx, S = X.PHONE.SIZE; panelBg(G.phone, 'rgba(8,10,18,0.9)', '#20e0ff');
        for (const b of B) { const a = X.mapXY(b.x0, b.z0), z = X.mapXY(b.x1, b.z1); x.fillStyle = b.name ? '#4a5368' : '#262c3a'; x.fillRect(a[0], a[1], z[0] - a[0], z[1] - a[1]); }
        const dot = (px, pz, col, r, ch) => { const p = X.mapXY(px, pz); x.fillStyle = col; x.beginPath(); x.arc(p[0], p[1], r, 0, 7); x.fill(); if (ch) { x.fillStyle = '#000'; x.font = 'bold 12px monospace'; x.textAlign = 'center'; x.fillText(ch, p[0], p[1] + 4); } };
        for (const s of C.SAFEHOUSES) dot(s.x, s.z, '#4a9aff', 6, 'S');
        for (const s of X.SPRAY.SPOTS) dot(s.x, s.z, '#40ff80', 6, 'P');
        dot(spots.power.x, spots.power.z, '#ffe040', 5, '!');
        dot(C.CRANE.x, C.CRANE.z, '#ffb020', 6, 'C');
        for (const b of api.bags()) if (!b.got) dot(b.x, b.z, '#ffd060', 7, '$');
        if (api.vehicles) for (const v of api.vehicles()) dot(v.x, v.z, '#7ad0ff', 6, 'V');
        const me = c;
        for (const q of api.cops()) if (Math.hypot(q.x - me.x, q.z - me.z) < 45) dot(q.x, q.z, '#ff3a3a', 4);
        const h = api.heli(); if (h) dot(h.x, h.z, '#ff3a3a', 8, 'H');
        const pp = X.mapXY(me.x, me.z); x.save(); x.translate(pp[0], pp[1]); x.rotate(Math.PI - me.yaw); x.fillStyle = '#ffffff'; x.beginPath(); x.moveTo(0, -11); x.lineTo(7, 8); x.lineTo(-7, 8); x.closePath(); x.fill(); x.restore();
        const dh = X.dailyHeist(dailyDate()), g = getGta();
        x.textAlign = 'left'; x.fillStyle = '#ffd27a'; x.font = 'bold 18px monospace'; x.fillText('DAILY: ' + dh.target.toUpperCase() + ' under ' + formatTime(dh.par) + (g.daily.date === dailyDate() ? '  (best ' + formatTime(g.daily.best) + ')' : ''), 14, 24);
        x.fillStyle = '#9ad0ff'; x.font = '15px monospace'; x.fillText('TAGS ' + G.tagsGot + '/' + spots.tags.length + '  CLIMB casino ' + (g.climbBest.casino ? formatTime(g.climbBest.casino) : '--') + ' radio ' + (g.climbBest.radio ? formatTime(g.climbBest.radio) : '--'), 14, S - 14);
        const ei = api.eggs && api.eggs(); if (ei) {   // licznik jajek i podpowiedź do następnego (zawinięta na dwie linie nad linią TAGS)
            x.fillStyle = '#ffb0b0'; x.font = '14px monospace'; x.fillText('EGGS ' + ei.n + '/' + ei.total + (ei.hint ? '' : '  all found'), 14, S - 34);
            if (ei.hint) { const cut = ei.hint.length <= 56 ? ei.hint.length : (ei.hint.lastIndexOf(' ', 56) > 0 ? ei.hint.lastIndexOf(' ', 56) : 56); x.fillStyle = '#d8a0a0'; x.fillText(ei.hint.slice(0, cut), 14, S - 66); if (ei.hint.length > cut) x.fillText(ei.hint.slice(cut + 1), 14, S - 50); }
        }
        const run = Object.keys(G.climbs).find(k => G.climbs[k].st.ph === 'run'); if (run) { x.fillStyle = '#7fff90'; x.font = 'bold 22px monospace'; x.fillText('CLIMB ' + run + ': ' + formatTime(G.climbs[run].st.t), 14, 52); }
        G.phone.update();
    }
    for (const c of spots.climb) G.climbs[c.id] = { st: { ph: 'idle', t: 0, last: 0, shown: 0 }, spot: c };
    // ----- aktualizacja: c = { x, y, z, speed, yaw, pitchDown, now } -----
    G.update = (dt, c) => {
        // lakiernia
        const near = X.SPRAY.SPOTS.some(s => Math.hypot(c.x - s.x, c.z - s.z) < X.SPRAY.R) && c.y < 3.2, stars = api.stars();
        let r = X.sprayStep(G.spray, dt, { near: near, speed: c.speed, seenT: api.seenT(), stars: stars, wallet: SAVE.wallet }); G.spray = r.st;
        if (r.event === 'paid') { if (spendBones(X.SPRAY.COST, 'Pay n Spray')) { api.clearHeat(); const g = getGta(); setGta(Object.assign({}, g, { sprayed: g.sprayed + 1 })); toast('New paint job: the cops lost track of you.', '#7fff90'); SFX.bell && SFX.bell(); } else G.spray.done--; }
        else if (r.event === 'poor') toast('Pay n Spray costs ' + X.SPRAY.COST + ' Bagabucks.', '#ff9a6a');
        else if (r.event === 'seen') toast('Too hot: the cops saw you a moment ago.', '#ff9a6a');
        else if (r.event === 'cooldown') toast('The booth is busy. Try again soon.', '#9ad0ff');
        else if (r.event === 'clean') toast('You are not wanted. Save your money.', '#9ad0ff');
        // przebranie
        const nearSafe = C.SAFEHOUSES.some(s => Math.hypot(c.x - s.x, c.z - s.z) < X.DISGUISE.R) && c.y < 3.2;
        const dr = X.disguiseStep(G.dis, dt, { near: nearSafe, speed: c.speed }); G.dis = dr.st; if (dr.event === 'on') toast('Disguised for 60 s: cops see you less.', '#9ad0ff'); api.setSight(X.sightMul(G.dis));
        // wspinaczki
        for (const k of Object.keys(G.climbs)) {
            const cl = G.climbs[k], sp = cl.spot, startT = Math.hypot(c.x - sp.pad[0], c.z - sp.pad[2]) < 1.2 && c.y < 2.4, endT = touching(sp.bell[0], sp.bell[1], sp.bell[2], 0.6), best = getGta().climbBest[k];
            const cr = climbStep(cl.st, startT, endT, dt, best); cl.st = cr.st;
            if (cr.event === 'start') toast('Climb ' + k + ': GO!', '#7fff90');
            else if (cr.event === 'record' || cr.event === 'finish') { const g = getGta(); if (cr.event === 'record') setGta(Object.assign({}, g, { climbBest: Object.assign({}, g.climbBest, { [k]: cl.st.last }) })); toast('Climb ' + k + ': ' + formatTime(cl.st.last) + (cr.event === 'record' ? ' NEW BEST' : ''), cr.event === 'record' ? '#ffd27a' : '#9ad0ff'); G.lastClimb = k + ':' + cr.event; SFX.bell && SFX.bell(); }
        }
        // paczki
        spots.tags.forEach((t, i) => {
            if (G.tagM.userData.gone && G.tagM.userData.gone[i]) return;
            if (!touching(t.x, t.y, t.z, X.TAG.TOUCH)) return;
            const res = X.findTag(getGta(), t.id); if (!res.isNew) return;
            setGta(res.gta); addBones(res.bones, 'Neon tag ' + res.gta.found.length + '/' + spots.tags.length); G.tagsGot = res.gta.found.length; SFX.bell && SFX.bell();
            dummy.position.set(t.x, t.y, t.z); dummy.scale.setScalar(0); dummy.updateMatrix(); G.tagM.setMatrixAt(i, dummy.matrix); G.tagM.instanceMatrix.needsUpdate = true;
        });
        // dźwignia prądu
        const pw = X.powerStep(G.power, dt, touching(spots.power.x, spots.power.y, spots.power.z, X.POWER.R)); G.power = pw.st;
        if (pw.event === 'cut') { toast('Power cut at the casino! Dark for 45 s.', '#ffe040'); SFX.beep && SFX.beep(120, 0.08, 0.5); } else if (pw.event === 'back') toast('The casino power is back.', '#9ad0ff');
        api.setPower(G.power.left > 0);
        // manekiny w witrynach: tylko gdy na nie nie patrzysz
        camera.getWorldDirection(_d);
        for (const m of G.mans) {
            const near2 = Math.hypot(m.m.position.x - c.x, m.m.position.z - c.z) < 70; m.m.visible = near2; if (!near2) continue;
            const w = X.wmanStep({ x: m.m.position.x, z: m.m.position.z }, dt, { x: c.x, z: c.z }, { fx: _d.x, fz: _d.z });
            if (w.moved) { m.m.position.x = w.x; m.m.position.z = w.z; m.m.rotation.y = Math.atan2(c.x - w.x, c.z - w.z); G.moved = (G.moved || 0) + 1; }
        }
        // telefon: widoczny, gdy patrzysz w dół
        const vis = X.phoneVisible(c.pitchDown); G.phone.mesh.visible = vis; G.phoneT -= dt;
        if (vis && G.phoneT <= 0) { G.phoneT = 0.25; drawPhone(c); }
    };
    G.dispose = () => {
        for (const t of G.terms) { const i = terminals.indexOf(t); if (i >= 0) terminals.splice(i, 1); t.tex.dispose(); }
        G.phone.dispose(); G.stat.removeFromParent(); G.tagM.removeFromParent(); G.tagM.dispose(); for (const m of G.mans) m.m.removeFromParent();
        for (const g of G.geos) g.dispose(); for (const m of G.mats) m.dispose();
    };
    G.debug = () => ({ sprayDone: G.spray.done, dis: G.dis.left, power: G.power.left, tags: G.tagsGot, climb: G.lastClimb, run: Object.keys(G.climbs).filter(k => G.climbs[k].st.ph === 'run'), vault: getGta().vault, vaultOpened: G.vaultOpened || 0, moved: G.moved || 0, phone: G.phone.mesh.visible, typed: G.typed, mans: G.mans.map(m => [+m.m.position.x.toFixed(1), +m.m.position.z.toFixed(1)]), spots: { tags: spots.tags, climb: spots.climb, win: spots.win, power: spots.power } });
    return G;
}
