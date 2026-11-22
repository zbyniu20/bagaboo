// ==========================================
// DŹWIĘK PRZESTRZENNY POZIOMÓW (ambient 3D, bez plików)
// Stałe źródła w konkretnych miejscach (buczenie świetlówek w szpitalu, trzask lawy, huk maszyn w pralni, wiatr na cmentarzu)
// oraz losowe odgłosy z kierunku wokół gracza (kapanie, odległe huki, skrzypienie, pohukiwanie sowy, dzwon, kliknięcia automatów).
// Dźwięk idzie przez HRTF, więc słychać kierunek i odległość. Głośność = suwak Effects.
// ==========================================
import { THREE, camera, scene, lighting, L, tex } from './engine.js';
import { buildMannequin, addMonsterFace } from './mannequin.js';
import { LEVEL_DEFS } from './registry.js';
import { audioBus, spatial, noiseBuf, creak, bang, whisper, setRoom, breath, growl, step, stinger } from './audio.js';
import { GAMES_CALM } from './settings.js';

// loops: stałe źródła [typ, [[x,y,z], ...]], rand: losowe odgłosy { t: typ, e: [min,max] s między, d: [min,max] m od gracza, v: głośność }
const DEFS = Object.fromEntries(LEVEL_DEFS.filter(d => d.ambience).map(d => [d.id, d.ambience]));   // z core/registry.js
export const DREAD = { hush: false, near: 99, tension: 0, apps: 0, scared: 0, fogMul: 1 };   // fogMul: mnożnik gęstości mgły ustawiany przez tryb (np. Final Hunt w Become the Monster)   // stan reżysera grozy (dreadUpdate): odległość do najbliższego potwora i napięcie 0..1
let cur = null, loops = [], timers = [], pending = true;
const rnd = (a, b) => a + Math.random() * (b - a);
const _p = { x: 0, y: 0, z: 0 };

export function setAmbience(levelId) { setRoom(levelId); stopLoops(); cur = DEFS[levelId] || null; pending = true; timers = []; }
function stopLoops() { for (const l of loops) { try { l.stop(); } catch (e) {} } loops = []; }

// ---------- SYNTEZA ----------
function tone(ctx, dst, t0, f0, f1, dur, vol, type) {
    const o = ctx.createOscillator(), g = ctx.createGain(); o.type = type || 'sine';
    o.frequency.setValueAtTime(f0, t0); if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), t0 + Math.min(0.02, dur / 3)); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(dst); o.start(t0); o.stop(t0 + dur + 0.05);
}
function oneShot(ctx, def, pos) {
    const t0 = ctx.currentTime, v = def.v;
    if (def.t === 'creak') return creak(v, pos);
    if (def.t === 'bang') return bang(pos);
    if (def.t === 'whisper') return whisper(pos);
    const dst = spatial(pos);
    if (def.t === 'drip') { tone(ctx, dst, t0, 1900, 800, 0.12, v); tone(ctx, dst, t0 + 0.22, 1500, 700, 0.14, v * 0.35); tone(ctx, dst, t0 + 0.42, 1300, 650, 0.16, v * 0.15); }
    else if (def.t === 'owl') { tone(ctx, dst, t0, 420, 360, 0.5, v); tone(ctx, dst, t0 + 0.7, 400, 330, 0.7, v * 0.9); }
    else if (def.t === 'bell') { for (const [m, a] of [[1, 1], [2.76, 0.5], [5.4, 0.25]]) tone(ctx, dst, t0, 196 * m, 196 * m, 4, v * a); }
    else if (def.t === 'thud') { tone(ctx, dst, t0, 70, 32, 0.4, v); }
    else if (def.t === 'blip') { const n = [330, 392, 440, 523, 660, 784, 880][(Math.random() * 7) | 0]; tone(ctx, dst, t0, n, n, 0.09, v, 'square'); if (Math.random() < 0.4) tone(ctx, dst, t0 + 0.1, n * 1.5, n * 1.5, 0.09, v, 'square'); }
}
// Stałe źródła: zwraca { stop(), tick(dt) }
function startLoop(ctx, type, pos) {
    const dst = pos ? spatial({ x: pos[0], y: pos[1], z: pos[2] }, null, true) : audioBus().master, nodes = [];
    const gainNode = ctx.createGain(); gainNode.connect(dst);
    const src = (kind, f, q) => { const s = ctx.createBufferSource(); s.buffer = noiseBuf(2); s.loop = true; const fl = ctx.createBiquadFilter(); fl.type = kind; fl.frequency.value = f; if (q) fl.Q.value = q; s.connect(fl); fl.connect(gainNode); s.start(); nodes.push(s); return fl; };
    const osc = (wave, f) => { const o = ctx.createOscillator(); o.type = wave; o.frequency.value = f; o.connect(gainNode); o.start(); nodes.push(o); return o; };
    let tick = null;
    if (type === 'hum') { gainNode.gain.value = 0.03; const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 500; gainNode.disconnect(); gainNode.connect(f); f.connect(dst); osc('square', 100); osc('sine', 200); }
    else if (type === 'machine') { gainNode.gain.value = 0.06; const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 220; gainNode.disconnect(); gainNode.connect(f); f.connect(dst); osc('sawtooth', 48 + Math.random() * 6); src('lowpass', 300); }
    else if (type === 'crackle') { gainNode.gain.value = 0.05; src('highpass', 2600); src('bandpass', 700, 1.5); tick = () => gainNode.gain.setTargetAtTime(0.01 + Math.random() * 0.13, ctx.currentTime, 0.05); }
    else if (type === 'wind') {
        gainNode.gain.value = 0.07; src('bandpass', 420, 0.6);
        const lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = 0.12; lg.gain.value = 0.05; lfo.connect(lg); lg.connect(gainNode.gain); lfo.start(); nodes.push(lfo);
    }
    return { stop() { for (const n of nodes) { try { n.stop(); } catch (e) {} } gainNode.disconnect(); }, tick: tick };
}

function aroundPlayer(d) {
    camera.getWorldPosition(_q);
    const a = Math.random() * Math.PI * 2, r = rnd(d[0], d[1]);
    return { x: _q.x + Math.cos(a) * r, y: Math.max(0.5, _q.y + rnd(-0.5, 2)), z: _q.z + Math.sin(a) * r };
}
const _q = camera.position.clone();
let last = performance.now();
function tick() {
    const bus = audioBus(), now = performance.now(), dt = Math.min(1, (now - last) / 1000); last = now;
    if (!bus || bus.ctx.state !== 'running' || !cur) return;
    const ctx = bus.ctx;
    if (pending) {
        pending = false;
        for (const [type, poss] of (cur.loops || [])) { if (poss) for (const p of poss) loops.push(startLoop(ctx, type, p)); else loops.push(startLoop(ctx, type, null)); }
        timers = (cur.rand || []).map(r => rnd(r.e[0], r.e[1]) * 0.6);
    }
    for (const l of loops) if (l.tick) l.tick();
    (cur.rand || []).forEach((r, i) => { timers[i] -= dt; if (timers[i] <= 0) { timers[i] = rnd(r.e[0], r.e[1]); if (!DREAD.hush) oneShot(ctx, r, aroundPlayer(r.d)); } });   // blisko potwora ambient milknie: słychać tylko jego
}
setInterval(tick, 250);

// ---------- REŻYSER GROZY ----------
// Poziom z potworami woła setDread(() => [pozycje {x, y, z}]) na końcu build(); main.js woła dreadUpdate(dt) co klatkę. Im bliżej potwór (do 16 m), tym bardziej:
// ambient milknie (poniżej 9 m), słychać jego kroki, oddech, charczenie i szepty za plecami, latarka się zacina i gaśnie na ułamki sekundy, a mgła gęstnieje.
// Wyłączone w BagaBoo Games (GAMES_CALM). Rejestracja jest ważna tylko dla poziomu, który ją zrobił (id z L.levelId).
let dread = null;
const _dp = new THREE.Vector3(), _fw = new THREE.Vector3(), dst = { scaredT: 0, blackT: 0, hideFn: null, stepT: [], last: [], breathT: 3, growlT: 6, whisperT: 8, stutter: 0, mul: 1, lampDirty: false, fogDirty: false };
// opts: { hide(on): chowa/pokazuje potwory (znikają na czas jumpscare'a), apparitions: false wyłącza zjawy (Memory, Cisza, Room 000 mają własne) }
export function setDread(fn, opts) { dread = fn ? { id: L.levelId, fn: fn, hide: opts && opts.hide, app: !(opts && opts.apparitions === false), calm: !!(opts && opts.calm) } : null; }   // calm: true = działa też w BagaBoo Games (kroki, oddech, latarka, mgła; bez jumpscare'ów i zjaw)
// Wołane przez createJumpscare().trigger(): potwory znikają na ok. 2,8 s, latarka gaśnie na pół sekundy, a ambient milknie (cisza po ataku)
export function dreadScared() {
    if (!dread || dread.id !== L.levelId || GAMES_CALM.on) return;
    dst.scaredT = 2.8; dst.blackT = 0.55; DREAD.scared++;
    if (dread.hide && !dst.hideFn) { dst.hideFn = dread.hide; try { dst.hideFn(true); } catch (e) { dst.hideFn = null; } }
}
// Zjawy: nieszkodliwa figura mignie na skraju widzenia ("side") albo stanie tuż za plecami ("behind") i znika, gdy na nią spojrzysz albo po chwili. Nie ma kolizji i nie łapie.
const app = { id: '', fig: null, t: 35, live: 0, kind: '', eyes: null };
const _ap = new THREE.Vector3(), _af = new THREE.Vector3();
function appFigure() {
    if (app.fig && app.fig.parent === L.root) return app.fig;
    const dark = new THREE.MeshStandardMaterial({ color: 0x0e0c0c, roughness: 1 }), pale = new THREE.MeshStandardMaterial({ color: 0xd8d0c0, roughness: 0.6 }), mn = buildMannequin(Math.random);
    mn.group.traverse(o => { if (o.isMesh) o.material = dark; }); mn.head.traverse(o => { if (o.isMesh) o.material = pale; });
    addMonsterFace(mn.head, { width: 0.058, open: 0.045, teeth: 11, long: 1.6, tears: 0x7a0a0a });
    for (const sx of [-1, 1]) { const e = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex.dot, color: 0xff2000, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); e.scale.set(0.12, 0.12, 1); e.position.set(sx * 0.04, 0.152, 0.11); mn.head.add(e); }
    mn.group.scale.setScalar(1.15); mn.group.visible = false; mn.group.name = 'dreadApparition'; L.root.add(mn.group); app.fig = mn.group; return app.fig;
}
function freeSpot(x, z) { const fy = L.floorY || 0; for (const o of L.obstacles) { const q = o.box3; if (q && q.max.y > fy + 0.25 && q.min.y < fy + 1.8 && x > q.min.x - 0.6 && x < q.max.x + 0.6 && z > q.min.z - 0.6 && z < q.max.z + 0.6) return false; } return x > L.bounds.minX + 1 && x < L.bounds.maxX - 1 && z > L.bounds.minZ + 1 && z < L.bounds.maxZ - 1; }
export function dreadAppear(kind) {   // też dla testów: wymusza zjawę
    camera.getWorldPosition(_ap); camera.getWorldDirection(_af); const yaw = Math.atan2(_af.x, _af.z);
    for (let i = 0; i < 16; i++) {
        const side = kind === 'behind' ? Math.PI + (Math.random() - 0.5) * 0.6 : (Math.random() < 0.5 ? -1 : 1) * (0.9 + Math.random() * 0.5), dist = kind === 'behind' ? 4.5 + Math.random() * 1.5 : 8 + Math.random() * 4, a = yaw + side;
        const x = _ap.x + Math.sin(a) * dist, z = _ap.z + Math.cos(a) * dist;
        if (!freeSpot(x, z)) continue;
        const f = appFigure(); f.position.set(x, L.floorY || 0, z); f.rotation.y = Math.atan2(_ap.x - x, _ap.z - z); f.visible = true; app.live = kind === 'behind' ? 1.6 : 2.3; app.kind = kind; DREAD.apps++;
        if (kind === 'behind') whisper({ x: x, y: 1.4, z: z }); else try { stinger({ x: x, y: 1.4, z: z }); } catch (e) {}
        return true;
    }
    return false;
}
export function dreadUpdate(dt) {
    dt = Math.min(0.1, dt);
    let list = null;
    if (dread && dread.id === L.levelId && (!GAMES_CALM.on || dread.calm)) { try { list = dread.fn(); } catch (e) { dread = null; } }
    camera.getWorldPosition(_dp);
    let near = 99, nearM = null;
    if (list) for (let i = 0; i < list.length; i++) {
        const m = list[i]; if (!m) continue;
        const d = Math.hypot(m.x - _dp.x, m.z - _dp.z);
        if (d < near) { near = d; nearM = m; }
        // kroki: ciężkie, gdy potwór się przemieszcza
        const lp = dst.last[i]; dst.last[i] = { x: m.x, z: m.z };
        if (lp && d < 24) { const sp = Math.hypot(m.x - lp.x, m.z - lp.z) / Math.max(dt, 0.001); if (sp > 0.6 && sp < 14) { dst.stepT[i] = (dst.stepT[i] || 0) - dt; if (dst.stepT[i] <= 0) { dst.stepT[i] = Math.max(0.28, 0.75 - sp * 0.07); step(Math.max(0.15, Math.min(1, 1.3 - d / 20)), { x: m.x, y: m.y || 0, z: m.z }); } } }
    }
    const a = near < 16 ? 1 - near / 16 : 0;
    if (dst.scaredT > 0) { dst.scaredT -= dt; if (dst.scaredT <= 0 && dst.hideFn) { try { dst.hideFn(false); } catch (e) {} dst.hideFn = null; } }
    DREAD.near = near; DREAD.tension = a; DREAD.hush = near < 9 || dst.scaredT > 0;
    // zjawy: tylko gdy poziom je dopuszcza, nic nie goni i nie trwa jumpscare
    if (dread && dread.id === L.levelId && dread.app && !GAMES_CALM.on) {
        if (app.id !== dread.id) { app.id = dread.id; app.fig = null; app.t = 30 + Math.random() * 30; app.live = 0; }
        if (app.live > 0) {
            app.live -= dt; camera.getWorldDirection(_fw); const f = app.fig, dx = f.position.x - _dp.x, dz = f.position.z - _dp.z, dl = Math.hypot(dx, dz) || 1, cosA = (dx * _fw.x + dz * _fw.z) / (dl * (Math.hypot(_fw.x, _fw.z) || 1));
            const looked = cosA > (app.kind === 'behind' ? 0.55 : 0.91);   // spojrzałeś na nią (ok. 55° dla stojącej z tyłu, ok. 24° z boku)
            if (looked || app.live <= 0) { f.visible = false; app.live = 0; if (looked && app.kind === 'side') try { stinger({ x: f.position.x, y: 1.4, z: f.position.z }); } catch (e) {} }
        } else {
            app.t -= dt;
            if (app.t <= 0) { if (near > 20 && dst.scaredT <= 0) { dreadAppear(Math.random() < 0.3 ? 'behind' : 'side'); } app.t = 45 + Math.random() * 50; }
        }
    } else if (app.fig && app.live > 0) { app.fig.visible = false; app.live = 0; }
    if (nearM) {
        const pos = { x: nearM.x, y: (nearM.y || 0) + 1.4, z: nearM.z };
        dst.breathT -= dt; if (near < 14 && dst.breathT <= 0) { dst.breathT = 2.4 + near * 0.12 + Math.random() * 1.6; breath(pos, 0.15 + 0.5 * (1 - near / 14)); }
        dst.growlT -= dt; if (near < 10 && dst.growlT <= 0) { dst.growlT = 7 + Math.random() * 8; growl(pos); }
        dst.whisperT -= dt; if (near < 16 && dst.whisperT <= 0) { dst.whisperT = 9 + Math.random() * 10; camera.getWorldDirection(_fw); whisper({ x: _dp.x - _fw.x * 1.3, y: _dp.y - 0.1, z: _dp.z - _fw.z * 1.3 }); }   // szept tuż za plecami
    }
    const P = lighting.preset;
    // latarka: im bliżej potwór, tym częstsze zacięcia (krótkie przygaśnięcia i mrugnięcia)
    if (P && P.flashlight && lighting.headLamp.visible) {
        const base = P.flashlight.intensity;
        if (dst.blackT > 0) { dst.blackT -= dt; lighting.headLamp.intensity = 0; dst.lampDirty = true; }   // po jumpscare'ie latarka gaśnie
        else if (a > 0.04) {
            dst.stutter -= dt;
            if (dst.stutter <= 0 && Math.random() < dt * (0.5 + 4 * a * a)) { dst.stutter = 0.05 + Math.random() * 0.22 * (0.5 + a); dst.mul = Math.random() < 0.5 ? 0 : 0.12 + Math.random() * 0.35; }
            lighting.headLamp.intensity = base * (dst.stutter > 0 ? dst.mul : 1 - 0.15 * a * Math.random()); dst.lampDirty = true;
        } else if (dst.lampDirty) { lighting.headLamp.intensity = base; dst.lampDirty = false; dst.stutter = 0; }
    }
    // mgła gęstnieje wraz z napięciem
    if (P && scene.fog) {
        if (a > 0 || DREAD.fogMul !== 1) { scene.fog.density = P.fogDensity * DREAD.fogMul * (1 + 0.6 * a); dst.fogDirty = true; }
        else if (dst.fogDirty) { scene.fog.density = P.fogDensity; dst.fogDirty = false; }
    }
}
