// ==========================================
// GNIAZDO STWORKA (lobby, północna ściana): podest z poduszką i jajem oraz panel opieki na ścianie. Reguły i stan: core/petlogic.js i core/petstore.js, towarzysz: core/pet.js.
// Bez stworka panel oferuje wyklucie jaja (HATCH_COST Bagabucksów): jajo drży, pęka, rozlatuje się odłamkami, a stworek wyskakuje z błyskiem. Ze stworkiem panel pokazuje
// jego kartę (imię, kolor, poziom, paski wzrostu, sytości i humoru) i przyciski: karmienie (płatne, do 6 razy na dobę), głaskanie (za darmo) i zmiana imienia z listy.
// Pet Pack ze sklepu (czapki i ubranka) zakłada się tu strzałkami HAT i WEAR; kupione przedmioty zmieniają model od razu.
// Panel to zwykły Terminal (celownik lub laser kontrolera). Odświeża się po każdej akcji i co ok. sekundę, gdy jesteś blisko.
// ==========================================
import { THREE, L, tex } from './engine.js';
import * as T from './textures.js';
import { Terminal, terminals, AMBER, AMBER_DIM, GOLD, OK_COL, BAD_COL } from './terminal.js';
import { SAVE } from './economy.js';
import { PET } from './petlogic.js';
import { petStatus, hatchPet, feedPet, patPet, cycleName, cycleWear } from './petstore.js';
import { hatchBegin, hatchPop, reactFeed, reactPat } from './pet.js';
import * as SFX from './audio.js';

const SHAKE = 2.7;   // sekundy drżenia jaja przed pęknięciem
let S = null;

// ---------- jajo ----------
function eggTexture(crack) {
    const c = T.makeCanvas(256, 256), x = c.getContext('2d'), R = T.mkRng(crack ? 91 : 90);
    const g = x.createLinearGradient(0, 0, 0, 256); g.addColorStop(0, '#fff6e6'); g.addColorStop(1, '#f1dfc4'); x.fillStyle = g; x.fillRect(0, 0, 256, 256);
    const cols = ['#9fe6c4', '#ffb4a0', '#9fd0ff', '#d2b4ff', '#ffe08a'];
    for (let i = 0; i < 46; i++) { x.fillStyle = cols[(R() * cols.length) | 0]; x.globalAlpha = 0.75; x.beginPath(); x.ellipse(R() * 256, 30 + R() * 200, 4 + R() * 9, 3 + R() * 7, R() * 3, 0, Math.PI * 2); x.fill(); }
    x.globalAlpha = 1;
    if (crack) { x.strokeStyle = '#3a2418'; x.lineWidth = 4; x.lineJoin = 'round'; x.beginPath(); x.moveTo(0, 120); for (let i = 1; i <= 8; i++) x.lineTo(i * 32, 120 + (i % 2 ? 22 : -18) + R() * 10); x.stroke(); x.lineWidth = 3; x.beginPath(); x.moveTo(110, 124); x.lineTo(96, 170); x.lineTo(118, 200); x.stroke(); }
    return T.toTex(c, false);
}
const mat = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.75 }, o || {}));

export function buildPetNest(x, z) {
    const g = new THREE.Group(); g.position.set(x, 0, z); L.root.add(g);
    // podest, gniazdo z gałązek, poduszka
    const base = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.65, 0.22, 36), mat(0x4a3a30, { roughness: 0.6 })); base.position.y = 0.11; base.receiveShadow = true; g.add(base);
    const trim = new THREE.Mesh(new THREE.TorusGeometry(1.5, 0.05, 8, 48), new THREE.MeshBasicMaterial({ color: 0xffb7d8, toneMapped: false })); trim.rotation.x = Math.PI / 2; trim.position.y = 0.23; g.add(trim);
    const nest = new THREE.Mesh(new THREE.TorusGeometry(0.78, 0.17, 10, 26), mat(0x7a5436, { roughness: 0.95 })); nest.rotation.x = Math.PI / 2; nest.position.y = 0.34; nest.scale.set(1, 1, 1.4); g.add(nest);
    const cushion = new THREE.Mesh(new THREE.SphereGeometry(0.72, 20, 12), mat(0xe9a8c4, { roughness: 0.9 })); cushion.scale.set(1, 0.3, 1); cushion.position.y = 0.36; g.add(cushion);
    // jajo
    const eggTex = eggTexture(false), crackTex = eggTexture(true);
    const eggM = new THREE.MeshStandardMaterial({ map: eggTex, roughness: 0.35, emissive: 0xffc890, emissiveIntensity: 0.25 });
    const eggG = new THREE.Group(); eggG.position.y = 0.78; g.add(eggG);
    const egg = new THREE.Mesh(new THREE.SphereGeometry(0.32, 26, 20), eggM); egg.scale.set(0.82, 1.1, 0.82); eggG.add(egg);
    // poświata na podłodze i świetliki
    const glow = new THREE.Mesh(new THREE.CircleGeometry(1.3, 32), new THREE.MeshBasicMaterial({ color: 0xffa8d0, transparent: true, opacity: 0.22, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false })); glow.rotation.x = -Math.PI / 2; glow.position.y = 0.245; g.add(glow);
    const flies = []; for (let i = 0; i < 5; i++) { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex.dot, color: i % 2 ? 0xffe9a0 : 0xffb0d8, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })); sp.scale.setScalar(0.1); g.add(sp); flies.push(sp); }
    // odłamki skorupy (lecą przy pęknięciu)
    const shardG = new THREE.SphereGeometry(0.1, 7, 5), shards = [];
    for (let i = 0; i < 8; i++) { const m = new THREE.Mesh(shardG, new THREE.MeshStandardMaterial({ color: 0xf3e4c8, roughness: 0.5, transparent: true })); m.scale.set(1, 0.4, 0.8); m.visible = false; g.add(m); shards.push({ m: m, v: new THREE.Vector3(), life: 0 }); }
    const flash = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex.dot, color: 0xfff2c0, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })); flash.visible = false; g.add(flash);
    // panel opieki na ścianie nad podestem
    const term = new Terminal(draw, 768, 480);
    const pg = new THREE.Group(); pg.position.set(x, 2.55, -14.4); L.root.add(pg);   // 0,6 m od ściany: żeberka ściany północnej nie przecinają ekranu
    pg.add(new THREE.Mesh(new THREE.BoxGeometry(3.45, 2.2, 0.1), mat(0x2a221c, { metalness: 0.4, roughness: 0.5 })));
    const screen = term.createMesh(3.3, 2.06); screen.position.z = 0.055; pg.add(screen);
    L.reserved.push([x, z, 2.6]);
    S = { g: g, x: x, z: z, egg: egg, eggG: eggG, eggM: eggM, eggTex: eggTex, crackTex: crackTex, cushion: cushion, glow: glow, flies: flies, shards: shards, flash: flash, term: term, pg: pg,
        state: 'idle', t: 0, clock: 0, refresh: 1, msg: '', msgTone: '', msgT: 0, tex: [eggTex, crackTex], shardG: shardG, cracked: false };
}
export function disposePetNest() {
    if (!S) return;
    const i = terminals.indexOf(S.term); if (i >= 0) terminals.splice(i, 1);
    for (const t of S.tex) t.dispose(); S.shardG.dispose();
    S = null;
}

// ---------- panel ----------
function say(text, tone) { S.msg = text; S.msgTone = tone || ''; S.msgT = 4; S.term.dirty = true; }
const REASONS = { poor: 'Not enough Bagabucks', full: 'Not hungry right now', limit: 'Enough snacks for today', have: 'You already have a pet', nopet: 'No pet yet' };
function doHatch() {
    const r = hatchPet(); if (!r.ok) { say(REASONS[r.reason] || 'Cannot hatch now', BAD_COL); return; }
    S.state = 'shake'; S.t = 0; S.cracked = false; hatchBegin(); SFX.bell && SFX.bell(); say('Something is moving in there...', GOLD);
}
function doFeed() { const r = feedPet(); if (!r.ok) { say(REASONS[r.reason] || 'Cannot feed now', BAD_COL); return; } reactFeed(); say('Yum! It loves the snack', OK_COL); }
function doWear(kind, dir) { const r = cycleWear(kind, dir); if (!r.ok) { say('Buy pet items in the shop first', BAD_COL); return; } say(r.name, GOLD); S.term.dirty = true; }
function doPat() { const r = patPet(); if (!r.ok) { say(r.reason === 'cooldown' ? 'Give it a moment to enjoy it' : (REASONS[r.reason] || ''), BAD_COL); return; } reactPat(); say('Aww! That feels great', OK_COL); }
const bar = (t, x, y, w, frac, col, label, val) => { t.text(label, x, y - 14, 20, AMBER_DIM, 'left', true); t.bar(x, y, w, 20, frac, col); t.text(val, x + w, y - 14, 20, '#e8d8b8', 'right', true); };
function portrait(c, x, y, st) {   // mała ilustracja stworka w kolorze i z miną wg humoru
    const col = st.color, r = 70; c.save(); c.translate(x, y);
    c.fillStyle = 'rgba(0,0,0,0.3)'; c.beginPath(); c.ellipse(0, r + 8, r * 0.9, 12, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = col.body; for (const sx of [-1, 1]) { c.beginPath(); c.moveTo(sx * 30, -r * 0.7); c.lineTo(sx * 62, -r * 1.3); c.lineTo(sx * 58, -r * 0.4); c.fill(); }
    c.beginPath(); c.ellipse(0, 0, r, r * 0.92, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = col.belly; c.beginPath(); c.ellipse(0, 26, r * 0.62, r * 0.55, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = col.accent; for (const sx of [-1, 1]) { c.beginPath(); c.ellipse(sx * 30, r * 0.92, 20, 11, 0, 0, Math.PI * 2); c.fill(); }
    const sad = st.moodLabel === 'gloomy', happy = st.moodLabel === 'happy'; c.strokeStyle = '#241530'; c.fillStyle = '#241530'; c.lineWidth = 6; c.lineCap = 'round';
    for (const sx of [-1, 1]) { if (happy) { c.beginPath(); c.arc(sx * 27, -2, 11, 1.12 * Math.PI, 1.88 * Math.PI); c.stroke(); } else { c.beginPath(); c.ellipse(sx * 27, -6, 8, sad ? 10 : 13, 0, 0, Math.PI * 2); c.fill(); c.fillStyle = '#fff'; c.beginPath(); c.arc(sx * 27 - 3, -10, 3.5, 0, Math.PI * 2); c.fill(); c.fillStyle = '#241530'; } }
    c.strokeStyle = '#3a1d2a'; c.lineWidth = 4; c.beginPath(); if (sad) c.arc(0, 38, 9, 1.2 * Math.PI, 1.8 * Math.PI); else c.arc(0, 18, 10, 0.15 * Math.PI, 0.85 * Math.PI); c.stroke();
    c.fillStyle = 'rgba(255,105,140,0.5)'; for (const sx of [-1, 1]) { c.beginPath(); c.ellipse(sx * 48, 14, 11, 6, 0, 0, Math.PI * 2); c.fill(); }
    c.restore();
}
// Rząd wyboru kosmetyku: strzałki przełączają po posiadanych przedmiotach (bez posiadanych: podpowiedź o sklepie)
function wearRow(t, kind, label, x0, st) {
    const none = st.wearCount[kind] < 1, name = st.wear[kind] === 'none' ? 'none' : st.wearNames[kind];
    t.text(label, x0, 358, 16, AMBER_DIM, 'left', true);
    t.btn('w' + kind + 'l', x0, 366, 44, 44, '<', () => doWear(kind, -1), { size: 24, disabled: none }); t.btn('w' + kind + 'r', x0 + 252, 366, 44, 44, '>', () => doWear(kind, 1), { size: 24, disabled: none });
    t.text(none ? 'buy in the shop' : name.slice(0, 15), x0 + 148, 389, none ? 16 : 20, none ? AMBER_DIM : '#e8d8b8', 'center', true);
}
function draw(t) {
    const c = t.ctx, st = S.state === 'idle' ? petStatus() : null; t.background();   // w czasie wykluwania panel nadal pokazuje jajo
    t.text('Bagabucks: ' + Math.floor(SAVE.wallet), 744, 36, 20, AMBER_DIM, 'right', true);
    if (!st) {
        t.text('PET EGG', 28, 36, 34, AMBER, 'left', true);
        c.save(); c.translate(150, 230); const eg = c.createLinearGradient(0, -95, 0, 95); eg.addColorStop(0, '#fff6e6'); eg.addColorStop(1, '#f1dfc4'); c.fillStyle = eg; c.beginPath(); c.ellipse(0, 0, 70, 95, 0, 0, Math.PI * 2); c.fill();
        const dots = [['#9fe6c4', -30, -40], ['#ffb4a0', 24, -56], ['#9fd0ff', 36, 4], ['#d2b4ff', -40, 20], ['#ffe08a', 6, 52], ['#ffb4a0', -12, -4]]; for (const [col, dx, dy] of dots) { c.fillStyle = col; c.beginPath(); c.ellipse(dx, dy, 11, 8, 0.4, 0, Math.PI * 2); c.fill(); } c.restore();
        ['Hatch your very own Stworek!', '', 'It follows you around the lobby,', 'Levels, Games and My Room.', 'Feed it, pet it, name it.', 'It grows as you clear levels.', '', 'Every egg is different.', '1 in 20 is a rare GOLDEN one!'].forEach((ln, i) => t.text(ln, 270, 96 + i * 30, 22, i === 0 ? GOLD : (i === 8 ? '#ffe27a' : '#e8d8b8'), 'left', i === 0));
        t.btn('hatch', 270, 390, 300, 64, 'HATCH  ' + PET.HATCH_COST, doHatch, { tone: 'gold', disabled: S.state !== 'idle', size: 32 });
    } else {
        t.text(st.name.toUpperCase(), 28, 36, 34, st.color.rare ? '#ffe27a' : AMBER, 'left', true);
        t.text('Lv ' + st.level + (st.color.rare ? '   GOLDEN' : '   ' + st.color.name), 744, 62, 22, GOLD, 'right', true);
        portrait(c, 130, 215, st);
        const bx = 270, bw = 280, p = st.progress;
        bar(t, bx, 118, bw, p.frac, '#ffd24a', 'GROWTH', p.max ? 'MAX' : p.left + ' to Lv ' + (p.level + 1));
        bar(t, bx, 176, bw, st.satiety, st.hungry ? BAD_COL : OK_COL, 'FULLNESS', st.hungry ? 'hungry!' : Math.round(st.satiety * 100) + '%');
        bar(t, bx, 234, bw, st.mood, st.mood >= 0.66 ? OK_COL : (st.mood >= 0.35 ? '#ffd24a' : BAD_COL), 'MOOD', st.moodLabel);
        const feedLabel = 'FEED  ' + PET.FEED_COST;
        t.btn('feed', 28, 288, 232, 52, feedLabel, doFeed, { tone: 'ok', size: 26, disabled: !st.feed.ok && st.feed.reason !== 'poor' });
        t.btn('pat', 276, 288, 232, 52, 'PET', doPat, { size: 26, disabled: !st.pat });
        t.btn('namel', 524, 288, 56, 52, '<', () => { cycleName(-1); t.dirty = true; }, { size: 28 }); t.btn('namer', 592, 288, 56, 52, '>', () => { cycleName(1); t.dirty = true; }, { size: 28 });
        t.text('name', 586, 276, 16, AMBER_DIM, 'center', true);
        // Pet Pack: czapka i ubranko z kupionych w sklepie (zakładanie po kolei)
        wearRow(t, 'hat', 'HAT', 28, st); wearRow(t, 'neck', 'WEAR', 390, st);
        t.text(st.feeds + ' snacks left today  |  pet it with your hand too', 28, 424, 18, AMBER_DIM, 'left', true);
    }
    if (S.msg && S.msgT > 0) t.text(S.msg, 28, 450, 24, S.msgTone || GOLD, 'left', true);
    else t.text(st ? 'Hold a hand near its head to pet it.' : 'Needs ' + PET.HATCH_COST + ' Bagabucks.', 28, 450, 20, AMBER_DIM, 'left', true);
}

// ---------- co klatkę ----------
export function updatePetNest(dt, t, ctx) {
    if (!S) return;
    S.clock += dt;
    const has = !!petStatus(), hatching = S.state !== 'idle', near = Math.hypot(ctx.pos.x - S.x, ctx.pos.z - S.z) < 4;
    S.egg.visible = !has || hatching;
    const mood = near ? 1 : 0;
    // poświata i świetliki
    S.glow.material.opacity = 0.18 + 0.08 * Math.sin(t * 2);
    S.flies.forEach((f, i) => { const a = t * (0.6 + i * 0.13) + i * 1.3, r = 1.0 + 0.2 * Math.sin(t + i); f.position.set(Math.cos(a) * r, 0.7 + Math.sin(t * 1.3 + i * 2) * 0.35, Math.sin(a) * r); f.material.opacity = 0.35 + 0.5 * Math.abs(Math.sin(t * 2 + i)); });
    // jajo: spokojny oddech i kołysanie, mocniejsze, gdy ktoś stoi blisko
    if (S.state === 'idle') {
        S.eggG.position.y = 0.78 + Math.sin(t * 1.6) * 0.02; const wob = ((Math.floor(t * 0.5) % 4) === 0 ? Math.sin(t * 22) * 0.06 * Math.max(0, Math.sin(t * Math.PI)) : 0) * (0.5 + mood);
        S.eggG.rotation.z = Math.sin(t * 0.9) * 0.04 + wob; S.eggM.emissiveIntensity = 0.25 + 0.12 * Math.sin(t * 2.2);
    } else if (S.state === 'shake') {
        S.t += dt; const k = Math.min(1, S.t / SHAKE);
        S.eggG.rotation.z = Math.sin(S.t * 32) * (0.05 + 0.3 * k); S.eggG.rotation.x = Math.sin(S.t * 27 + 1) * 0.12 * k; S.eggG.position.y = 0.78 + Math.abs(Math.sin(S.t * 9)) * 0.08 * k;
        S.eggM.emissiveIntensity = 0.3 + 1.4 * k * k;
        if (!S.cracked && k > 0.55) { S.cracked = true; S.eggM.map = S.crackTex; S.eggM.needsUpdate = true; SFX.beep && SFX.beep(520, 0.12, 0.08); }
        if (S.t >= SHAKE) {
            S.state = 'pop'; S.t = 0; S.egg.visible = false; S.eggM.map = S.eggTex; S.eggM.needsUpdate = true; S.eggG.rotation.set(0, 0, 0); S.eggM.emissiveIntensity = 0.25;
            for (const s of S.shards) { s.life = 1.4; s.m.visible = true; s.m.material.opacity = 1; s.m.position.set(0, 0.85, 0); s.v.set((Math.random() - 0.5) * 3.2, 2.6 + Math.random() * 2, (Math.random() - 0.5) * 3.2); s.m.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3); }
            S.flash.visible = true; S.flash.position.set(0, 0.9, 0); hatchPop(ctx, S.x, 0.6, S.z + 1.4);
        }
    } else if (S.state === 'pop') {
        S.t += dt; const k = Math.min(1, S.t / 0.7);
        S.flash.material.opacity = 1 - k; S.flash.scale.setScalar(0.4 + k * 3.6); if (k >= 1) S.flash.visible = false;
        let alive = false;
        for (const s of S.shards) { if (s.life <= 0) continue; alive = true; s.life -= dt; s.v.y -= 9 * dt; s.m.position.addScaledVector(s.v, dt); if (s.m.position.y < 0.3) { s.m.position.y = 0.3; s.v.multiplyScalar(0.3); } s.m.rotation.x += dt * 5; s.m.material.opacity = Math.max(0, Math.min(1, s.life / 0.5)); if (s.life <= 0) s.m.visible = false; }
        if (!alive && S.t > 0.8) S.state = 'idle', S.term.dirty = true;
    }
    S.msgT = Math.max(0, S.msgT - dt);
    S.refresh -= dt; if (S.refresh <= 0) { S.refresh = near ? 1.0 : 4; S.term.dirty = true; }
}
export function debugPetNest() { return S ? { state: S.state, eggVisible: S.egg.visible } : null; }
