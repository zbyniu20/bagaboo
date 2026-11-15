// Smoke tests: loads the game in headless Chromium (software GL), enters every level and checks
//   - no uncaught errors / console errors,
//   - the level renders (draw calls > 0) and stays inside its draw-call budget,
//   - economy data is consistent (achievement rewards exist, no duplicate ids),
//   - every emote pose runs without throwing.
// Usage:  cd tests && npm install && npx playwright install chromium   (once)
//         npm run smoke            # all levels
//         node smoke.mjs maze,well # selected levels
// This does NOT measure real VR frame rate: draw calls/point lights are only a proxy for GPU cost.
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import http from 'http';
import { fileURLToPath } from 'url';

const HERE = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(HERE, '..'), DEPS = path.join(HERE, 'node_modules');
const PORT = +process.env.PORT || 8766;
const LEVELS = (process.argv[2] || 'lobby,levels,maze,silence,well,laundry,memory,lava,hospital,cemetery,catacombs,games,wardrobe,hideseek,statues,blindtag,swingrun,towerclimb').split(',');
// Draw-call budget per level (medium quality, renderer.info.render.calls on the first frames). Raise only on purpose.
const BUDGET = { default: 260, laundry: 230, memory: 310 };
const MAX_POINT_LIGHTS = 12;
const MIME = { '.js': 'text/javascript', '.html': 'text/html', '.png': 'image/png', '.json': 'application/json' };

const server = http.createServer((req, res) => {
    let u = decodeURIComponent(req.url.split('?')[0]); if (u === '/') u = '/index.html';
    const f = path.join(ROOT, u);
    if (f.startsWith(ROOT) && fs.existsSync(f) && fs.statSync(f).isFile()) { res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res); }
    else { res.writeHead(404); res.end(); }
}).listen(PORT);

const failures = [], notes = [];
const fail = (m) => { failures.push(m); console.log('FAIL', m); };
const ok = (m) => { notes.push(m); console.log('ok  ', m); };

const browser = await chromium.launch({ args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ viewport: { width: 1000, height: 640 } });
await ctx.route(/unpkg\.com/, (route) => {
    const u = route.request().url();
    let f = null;
    if (u.includes('three@0.160.0/build/three.module.js')) f = DEPS + '/three/build/three.module.js';
    else if (u.includes('three@0.160.0/examples/jsm/')) f = DEPS + '/three/examples/jsm/' + u.split('examples/jsm/')[1].split('?')[0];
    else if (u.includes('cannon-es')) f = DEPS + '/cannon-es/dist/cannon-es.js';
    else if (u.includes('peerjs')) f = DEPS + '/peerjs/dist/peerjs.min.js';
    if (f && fs.existsSync(f)) route.fulfill({ status: 200, contentType: 'text/javascript', body: fs.readFileSync(f) });
    else route.fulfill({ status: 404, body: '' });
});
const page = await ctx.newPage();
let phase = 'boot';
const errors = [];
page.on('pageerror', (e) => errors.push(`[${phase}] PAGEERROR ${e.message}`));
page.on('console', (m) => { if (m.type() === 'error' && !/peerjs|favicon|Failed to load resource/i.test(m.text())) errors.push(`[${phase}] CONSOLE ${m.text().slice(0, 300)}`); });

await page.goto(`http://localhost:${PORT}/`);
await page.waitForFunction(() => /Ready|Could not/.test(document.getElementById('status').innerText), null, { timeout: 90000 });
await page.click('#btnSolo', { timeout: 90000 });
await page.waitForTimeout(1500);

const run = (code, arg) => page.evaluate(async ([code, arg]) => { const F = Object.getPrototypeOf(async function () {}).constructor; return await new F('arg', code)(arg); }, [code, arg]);

// ---- data consistency ----
phase = 'data';
const data = await run(`
    const E = await import('./core/economy.js'), EM = await import('./core/emotes.js');
    const bad = [], keys = new Set(E.CATALOG.map(i => i.slot + ':' + i.id)), ids = new Set();
    for (const a of E.ACHIEVEMENTS) {
        if (ids.has(a.id)) bad.push('duplicate achievement ' + a.id); ids.add(a.id);
        if (a.reward[0] !== 'bones' && !keys.has(a.reward[0] + ':' + a.reward[1])) bad.push('achievement ' + a.id + ' rewards unknown item ' + a.reward.join(':'));
        if (a.goal && typeof a.val !== 'function') bad.push('achievement ' + a.id + ' has goal without val()');
    }
    const catKeys = new Set(); for (const k of E.CATALOG.map(i => i.slot + ':' + i.id)) { if (catKeys.has(k)) bad.push('duplicate catalog item ' + k); catKeys.add(k); }
    for (const it of E.CATALOG) if (it.slot === 'emote' && !EM.EMOTES[it.id]) bad.push('emote item without animation ' + it.id);
    for (const id of Object.keys(EM.EMOTES)) if (!keys.has('emote:' + id)) bad.push('animation without catalog item ' + id);
    // every emote pose must run on a dummy avatar
    const T = (await import('./core/engine.js')).THREE;
    const mk = () => { const o = new T.Object3D(); o.userData.rig = { target: 0 }; return o; };
    for (const id of Object.keys(EM.EMOTES)) for (const t of [0, 0.3, 1, EM.EMOTES[id].dur - 0.1]) {
        const a = { head: mk(), handL: mk(), handR: mk() }; a.head.position.set(0, 1.6, 0);
        try { if (!EM.emotePose(a, id, t)) bad.push('emote ' + id + ' not applied at t=' + t); } catch (e) { bad.push('emote ' + id + ' threw: ' + e.message); }
        for (const h of [a.head, a.handL, a.handR]) if (![h.position.x, h.position.y, h.position.z].every(Number.isFinite)) bad.push('emote ' + id + ' produced NaN');
    }
    // every cosmetic must build into something visible (hats, glasses, masks, badges) or a distinct material (sleeves, gloves, skins)
    const AV = await import('./core/avatar.js'), ECO = E;
    for (const it of E.CATALOG) {
        if (it.id === 'none') continue;
        try {
            if (it.slot === 'hat' && AV.buildHat(it.id).children.length === 0 && it.id !== 'cap') bad.push('hat builds empty: ' + it.id);
            if (it.slot === 'glasses' && AV.buildGlasses(it.id).children.length === 0) bad.push('glasses build empty: ' + it.id);
            if (it.slot === 'mask' && AV.buildMask(it.id).children.length === 0) bad.push('mask builds empty: ' + it.id);
            if (it.slot === 'badge' && !AV.buildBadge(it.id)) bad.push('badge missing: ' + it.id);
            if (['sleeve', 'gloves', 'skin'].includes(it.slot)) { const a = AV.createAvatar(Object.assign({}, E.getLook(), { [it.slot]: it.id })); if (!a.group.children.length) bad.push(it.slot + ' avatar empty: ' + it.id); }
        } catch (e) { bad.push(it.slot + ':' + it.id + ' threw ' + e.message); }
    }
    // host migration election: deterministic order, old host excluded, rank 0 first
    const NW = await import('./core/network.js');
    const e1 = NW.electNewHost('b', ['a', 'b', 'c', 'H'], 'H'); if (e1.order.join() !== 'a,b,c' || e1.rank !== 1) bad.push('election order/rank wrong: ' + JSON.stringify(e1));
    const e2 = NW.electNewHost('solo', [], 'H'); if (e2.rank !== 0) bad.push('lone guest should be rank 0');
    // staff bonus: only password-verified permanent staff, once, never for locally promoted moderators
    const MODS = E.SAVE.profile.name, w0 = E.SAVE.wallet;
    localStorage.setItem('bagaboo_mods', JSON.stringify(['hacker'])); E.markNickVerified('hacker'); E.setProfile({ name: 'hacker' });
    if (E.SAVE.wallet !== w0) bad.push('locally promoted moderator received the staff bonus');
    localStorage.removeItem('bagaboo_mods'); E.setProfile({ name: 'lincolnvr' });
    if (E.SAVE.wallet !== w0) bad.push('staff name without a verified password received the bonus');
    E.markNickVerified('lincolnvr'); E.setProfile({ name: 'lincolnvr' });
    if (E.SAVE.wallet < w0 + 10000) bad.push('verified staff did not receive the bonus');
    const w1 = E.SAVE.wallet; E.setProfile({ name: 'lincolnvr' }); if (E.SAVE.wallet !== w1) bad.push('staff bonus paid twice');
    E.markNickVerified(''); E.setProfile({ name: MODS });
    // voice hub: each listener hears everyone except himself; mute works
    const A0 = await import('./core/audio.js'); A0.initAudio(); const ac = A0.getAudioContext();
    if (ac) {
        try { await ac.resume(); } catch (e) {}
        const VH = await import('./core/voicehub.js'), hub = VH.createVoiceHub(ac);
        const tone = (f) => { const o = ac.createOscillator(); o.frequency.value = f; const d = ac.createMediaStreamDestination(); o.connect(d); o.start(); return d.stream; };
        hub.addSource('host', tone(1760)); const mixA = hub.mixFor('A'); hub.addSource('A', tone(440)); hub.addSource('B', tone(880)); const mixB = hub.mixFor('B');
        const level = async (stream, f) => { const an = ac.createAnalyser(); an.fftSize = 4096; ac.createMediaStreamSource(stream).connect(an); await new Promise(r => setTimeout(r, 500)); const d = new Float32Array(an.frequencyBinCount); an.getFloatFrequencyData(d); const k = Math.round(f / (ac.sampleRate / 2) * d.length); return Math.max(d[k - 1], d[k], d[k + 1]); };
        if (ac.state === 'running') {
            const a440 = await level(mixA, 440), a880 = await level(mixA, 880), a1760 = await level(mixA, 1760), b880 = await level(mixB, 880), b440 = await level(mixB, 440);
            if (!(a880 > -70 && a1760 > -70)) bad.push('listener A does not hear B and host (' + a880.toFixed(0) + ', ' + a1760.toFixed(0) + ' dB)');
            if (!(a440 < -90)) bad.push('listener A hears his own voice (' + a440.toFixed(0) + ' dB)');
            if (!(b440 > -70 && b880 < -90)) bad.push('listener B mix wrong (' + b440.toFixed(0) + ', ' + b880.toFixed(0) + ' dB)');
            hub.setMuted('A', 'B', true); const a880m = await level(mixA, 880); if (!(a880m < -90)) bad.push('muted source still audible (' + a880m.toFixed(0) + ' dB)');
        } else console.log('voice hub mixing not measured: AudioContext is ' + ac.state);
    }
    // Gorilla Machine: every category lists items, trying shows them on the model only, buying then wearing works; shop sells only unowned items and has no try/wear
    const GM = await import('./core/gorillamachine.js'), UIM = await import('./core/ui.js');
    for (const c of GM.CATS) if (!GM.itemsFor(c.id).length) bad.push('machine category empty: ' + c.id);
    GM.machine.redraw(); const catBtns = GM.machine.buttons.filter(b => b.id.startsWith('cat')).length; if (catBtns !== GM.CATS.length) bad.push('machine shows ' + catBtns + ' category buttons');
    GM.machine.buttons.find(b => b.id === 'cathat').action(); GM.machine.redraw();
    const beanieBtn = GM.machine.buttons.find(b => b.id === 'ithatbeanie'); if (!beanieBtn) bad.push('machine: beanie row missing'); else {
        const worn0 = E.getLook().hat; beanieBtn.action();
        if (GM.machineLook().hat !== 'beanie') bad.push('machine: trying a hat does not show it on the model');
        if (E.getLook().hat !== worn0) bad.push('machine: trying a hat changed the real outfit');
        GM.machine.redraw(); if (GM.machine.buttons.find(b => b.id === 'wearhatbeanie')) bad.push('machine: unowned item can be worn');
        E.SAVE.wallet += 5000; E.buyItem(E.CATALOG.find(i => i.slot === 'hat' && i.id === 'beanie')); GM.machine.redraw();
        const wear = GM.machine.buttons.find(b => b.id === 'wearhatbeanie'); if (!wear) bad.push('machine: bought item has no Wear button'); else { wear.action(); if (E.getLook().hat !== 'beanie') bad.push('machine: Wear did not equip'); if (GM.M.sel.hat) bad.push('machine: try state not cleared after wearing'); }
        E.equipItem(E.CATALOG.find(i => i.slot === 'hat' && i.id === worn0)); GM.resetTry();
    }
    UIM.shop.redraw(); const sb = UIM.shop.buttons.map(b => b.id);
    if (sb.some(id => id.startsWith('try') || id.startsWith('wear') || id.startsWith('worn'))) bad.push('shop still has try/wear buttons: ' + sb.filter(id => /^(try|wear|worn)/.test(id)).join());
    for (const it of E.CATALOG.filter(i => i.slot === 'skin' && E.isOwned(i))) if (sb.includes('buy' + it.slot + it.id) || sb.includes('lock' + it.slot + it.id)) bad.push('shop still lists owned item ' + it.id);
    // VR performance governor: slow frames raise the level, long stable frames lower it again
    const XP = await import('./core/xrperf.js'), g = { avg: 0, slow: 0, fast: 0, cool: 0, level: 0 }, budget = 1000 / 72;
    for (let i = 0; i < 400; i++) XP.govern(g, 25, budget);              // ~10 s at 40 fps
    if (g.level < 1) bad.push('governor did not react to slow frames (level ' + g.level + ')');
    if (g.level > XP.GOV.maxLevel) bad.push('governor exceeded max level');
    for (let i = 0; i < 6000; i++) XP.govern(g, 13.9, budget);           // ~83 s at 72 fps (3 levels x 20 s)
    if (g.level !== 0) bad.push('governor did not recover after stable frames (level ' + g.level + ')');
    const calm = { avg: 0, slow: 0, fast: 0, cool: 0, level: 0 }; for (let i = 0; i < 2000; i++) XP.govern(calm, 13.9, budget);
    if (calm.level !== 0) bad.push('governor changed level on stable 72 fps');
    return bad;
`);
if (data.length) data.forEach((m) => fail('data: ' + m)); else ok('data: achievements, catalog and emote poses consistent');

// ---- level registry (core/registry.js): the single list of levels must agree with files, index.html, economy and lighting ----
phase = 'registry';
const reg = await run(`
    const R = await import('./core/registry.js'), E = await import('./core/economy.js'), C = await import('./core/config.js');
    const bad = [], ids = new Set(), ach = new Set(E.ACHIEVEMENTS.map(a => a.id)), recIds = new Set(E.RECORDS.map(r => r.id));
    for (const d of R.LEVEL_DEFS) {
        if (ids.has(d.id)) bad.push('duplicate id ' + d.id); ids.add(d.id);
        if (d.kind === 'virtual') continue;
        if (d.light !== '@mode' && !C.LIGHT_PRESETS[d.light]) bad.push(d.id + ': unknown light preset ' + d.light);
        if (d.diff && !ach.has('nm_' + d.id)) bad.push(d.id + ': difficulty level without nm_' + d.id + ' achievement');
        if (d.rec && !recIds.has(d.id)) bad.push(d.id + ': missing record entry');
    }
    if (E.DIFF_LEVELS.length !== R.DIFF_LEVEL_IDS.length) bad.push('DIFF_LEVELS out of sync');
    return { bad: bad, paths: R.LEVEL_DEFS.filter(d => d.kind !== 'virtual').map(d => R.levelPath(d)) };
`);
reg.bad.forEach((m) => fail('registry: ' + m));
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8'), listed = new Set((html.match(/var FILES = \[(.*?)\]/s) || ['', ''])[1].match(/"[^"]+"/g)?.map(x => x.slice(1, -1)) || []);
const missing = [];
for (const dir of ['core', 'levels']) for (const f of fs.readdirSync(path.join(ROOT, dir))) if (f.endsWith('.js') && !listed.has(dir + '/' + f)) missing.push(dir + '/' + f);
for (const f of listed) if (!fs.existsSync(path.join(ROOT, f))) missing.push('FILES lists missing file ' + f);
for (const pth of reg.paths) if (!fs.existsSync(path.join(ROOT, pth))) missing.push('registry path missing ' + pth);
missing.forEach((m) => fail('registry/index.html: ' + m));
if (!reg.bad.length && !missing.length) ok('registry: levels, files, index.html FILES, records and Nightmare achievements agree');

// ---- levels ----
for (const lv of LEVELS) {
    phase = lv;
    try {
        await run(`const M = await import('./main.js'); const PL = await import('./core/player.js'); await M.loadLevel('${lv}'); if ('${lv}' === 'wardrobe') PL.setPlayerPosition(-5, 1.0, 0); return 1;`);
        await page.waitForTimeout(2500);
        const r = await run(`const ENG = await import('./core/engine.js'), I = ENG.renderer.info; let pl = 0; ENG.scene.traverse(o => { if (o.isPointLight && o.visible) pl++; }); return { calls: I.render.calls, tris: I.render.triangles, pl: pl };`);
        // level-specific rules fixed in the last round
        const rules = await run(`const E = await import('./core/engine.js'), A = await import('./core/avatar.js'); return { floorY: E.L.floorY, moveScale: E.L.moveScale, tagsHidden: A.TAGS.hidden, maxZ: E.L.bounds.maxZ, minZ: E.L.bounds.minZ, minX: E.L.bounds.minX, maxX: E.L.bounds.maxX };`);
        if ((lv === 'lasttile' || lv === 'race') && !(rules.floorY < -5)) fail(`${lv}: no pit floor (floorY=${rules.floorY}): players cannot fall`);
        if ((lv === 'games' || lv === 'wardrobe') && rules.moveScale !== 1.15) fail(`${lv}: movement scale ${rules.moveScale}, expected the lobby value 1.15`);
        if ((lv === 'hideseek' || lv === 'blindtag') && !rules.tagsHidden) fail(`${lv}: name tags are not hidden`);
        if (lv !== 'hideseek' && lv !== 'blindtag' && rules.tagsHidden) fail(`${lv}: name tags still hidden after leaving a hiding mode`);
        if (lv === 'redlight' && !(rules.maxX - rules.minX > 24 && rules.maxZ - rules.minZ > 70)) fail('redlight: hall is not big enough');
        if (['lasttile', 'race', 'maze', 'lava'].includes(lv)) {
            // pit levels: with no floor under the player he must fall; floor levels: the global floor must still hold him up
            const fell = await run(`const E = await import('./core/engine.js'), PL = await import('./core/player.js'); E.L.obstacles.length = 0; PL.setPlayerPosition(0, 2, 0); for (let i = 0; i < 150; i++) PL.updatePlayer(1 / 60, i / 60); return PL.playerBody.position.y;`);
            if ((lv === 'lasttile' || lv === 'race') && !(fell < -2)) fail(`${lv}: player did not fall without a floor (y=${fell.toFixed(2)})`);
            if ((lv === 'maze' || lv === 'lava') && !(fell > 0.2)) fail(`${lv}: player fell through the floor (y=${fell.toFixed(2)})`);
        }
        const budget = BUDGET[lv] || BUDGET.default;
        if (!(r.calls > 0)) fail(`${lv}: nothing was rendered`);
        else if (r.calls > budget) fail(`${lv}: ${r.calls} draw calls exceed budget ${budget}`);
        else if (r.pl > MAX_POINT_LIGHTS) fail(`${lv}: ${r.pl} point lights exceed ${MAX_POINT_LIGHTS}`);
        else ok(`${lv}: ${r.calls} calls (budget ${budget}), ${r.pl} point lights, ${r.tris} tris`);
    } catch (e) { fail(`${lv}: ${e.message.slice(0, 200)}`); }
}

// ---- memory: repeated level changes must not keep growing GPU resources (Quest tabs have little memory) ----
phase = 'memory';
const CYCLE = ['maze', 'well', 'hospital', 'cemetery', 'lobby'];
const memAfterCycle = async () => { for (const lv of CYCLE) { await run(`const M = await import('./main.js'); await M.loadLevel('${lv}'); return 1;`); await page.waitForTimeout(600); } return run(`const I = (await import('./core/engine.js')).renderer.info.memory; return { geo: I.geometries, tex: I.textures };`); };
const m1 = await memAfterCycle(), m2 = await memAfterCycle(), m3 = await memAfterCycle();
console.log('     memory after cycles:', JSON.stringify([m1, m2, m3]));
if (m3.tex > m2.tex + 30 || m3.geo > m2.geo + 100) fail(`memory: resources keep growing across level changes (${JSON.stringify(m2)} -> ${JSON.stringify(m3)})`); else ok('memory: textures/geometries stable across level cycles');

// ---- Quest browser: user agent detection, light landing page, level still loads ----
phase = 'quest';
const qctx = await browser.newContext({ viewport: { width: 1000, height: 640 }, userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) OculusBrowser/33.0 SamsungBrowser/4.0 Chrome/126.0 VR Safari/537.36' });
const qpage = await qctx.newPage();
const qerr = []; qpage.on('pageerror', (e) => qerr.push(e.message));
await qctx.route(/unpkg\.com/, async (route) => { const u = route.request().url(); let f = null;
    if (u.includes('three@0.160.0/build/three.module.js')) f = DEPS + '/three/build/three.module.js';
    else if (u.includes('three@0.160.0/examples/jsm/')) f = DEPS + '/three/examples/jsm/' + u.split('examples/jsm/')[1].split('?')[0];
    else if (u.includes('cannon-es')) f = DEPS + '/cannon-es/dist/cannon-es.js'; else if (u.includes('peerjs')) f = DEPS + '/peerjs/dist/peerjs.min.js';
    if (f && fs.existsSync(f)) route.fulfill({ status: 200, contentType: 'text/javascript', body: fs.readFileSync(f) }); else route.fulfill({ status: 404, body: '' }); });
await qpage.goto(`http://localhost:${PORT}/`);
await qpage.waitForFunction(() => /Ready|Could not/.test(document.getElementById('status').innerText), null, { timeout: 90000 });
const lite = await qpage.evaluate(() => document.documentElement.classList.contains('lite'));
if (!lite) fail('quest: landing page did not switch to lite mode for an OculusBrowser user agent'); else ok('quest: lite landing page');
await qpage.click('#btnSolo', { timeout: 90000 }); await qpage.waitForTimeout(1500);
const qinfo = await qpage.evaluate(async () => { const D = await import('./core/device.js'), M = await import('./main.js'); await M.loadLevel('maze'); const E = await import('./core/engine.js'); return { quest: D.IS_QUEST, aniso: E.tex.wall.anisotropy }; });
if (!qinfo.quest || qinfo.aniso > 2) fail('quest: device detection or anisotropy cap failed ' + JSON.stringify(qinfo)); else ok('quest: detected, anisotropy capped at ' + qinfo.aniso);
if (qerr.length) qerr.forEach((e) => fail('quest: ' + e)); await qctx.close();

// ---- new game modes: simulate rounds by stepping each level's update() ----
phase = 'modes';
const modeSim = await run(`
    const M = await import('./main.js'), PL = await import('./core/player.js'), ENG = await import('./core/engine.js'), E = await import('./core/economy.js');
    const bad = [], ctx = { body: PL.playerBody, pos: PL.playerBody.position, goto() {} };
    const load = async (id) => { await M.loadLevel(id); return await import('./levels/' + id + '.js'); };
    let T = 0; const step = (mod, n, fn) => { for (let i = 0; i < n; i++) { if (fn) fn(i); mod.update(0.1, T += 0.1, ctx); } };
    const until = (mod, cond, max, fn) => { for (let i = 0; i < max; i++) { if (fn) fn(i); mod.update(0.1, T += 0.1, ctx); if (cond(mod.debug())) return true; } return false; };
    // Swing Run
    let m = await load('swingrun');
    if (ENG.L.ropes.length < 15) bad.push('swingrun: only ' + ENG.L.ropes.length + ' ropes');
    if (!(ENG.L.floorY < -5)) bad.push('swingrun: no pit');
    if (!until(m, d => d.phase === 'race', 200)) bad.push('swingrun: race never started');
    PL.playerBody.position.set(0, -10, -20); step(m, 1); if (!(PL.playerBody.position.y > 0) || m.debug().falls !== 1) bad.push('swingrun: no respawn after a fall (y=' + PL.playerBody.position.y.toFixed(1) + ')');
    PL.playerBody.position.set(0, 3, -101); step(m, 1); if (!m.debug().finished) bad.push('swingrun: finish line not detected');
    if (!until(m, d => d.phase === 'results', 100)) bad.push('swingrun: round did not end after the finish'); if (!(E.SAVE.records.swingrun > 0)) bad.push('swingrun: time not recorded');
    // Tower Climb: the ooze must catch an idle player, and the top ledge must finish the run
    m = await load('towerclimb');
    if (!until(m, d => d.phase === 'race', 200)) bad.push('towerclimb: race never started');
    if (!until(m, d => d.falls >= 1, 700, () => { PL.playerBody.position.set(0, 1.0, -0.4); PL.playerBody.velocity.set(0, 0, 0); })) bad.push('towerclimb: ooze never caught an idle player');
    PL.playerBody.position.set(0, 38.2, -2.5); step(m, 1); if (!m.debug().finished) bad.push('towerclimb: finish ledge not detected');
    if (!until(m, d => d.phase === 'results', 100)) bad.push('towerclimb: round did not end after the finish'); if (!(E.SAVE.records.towerclimb > 0)) bad.push('towerclimb: time not recorded');
    // Statues: standing still survives a silence, moving in a silence puts you out on the balcony
    m = await load('statues');
    PL.playerBody.velocity.set(0, 0, 0);
    if (!until(m, d => d.phase === 'play' && d.cycle >= 1, 600, () => { PL.playerBody.velocity.set(0, 0, 0); })) bad.push('statues: no silence passed while standing still');
    else if (m.debug().out) bad.push('statues: a frozen player was eliminated');
    m = await load('statues');
    if (!until(m, d => d.out, 800, () => { PL.playerBody.velocity.set(3, 0, 0); })) bad.push('statues: a moving player was not eliminated');
    else if (!(PL.playerBody.position.y > 5)) bad.push('statues: eliminated player not moved to the balcony (y=' + PL.playerBody.position.y.toFixed(1) + ')');
    // Blind Tag: solo bot hunts a noisy player nearby
    m = await load('blindtag');
    if (!until(m, d => d.phase === 'hunt', 300)) bad.push('blindtag: hunt never started');
    if (!until(m, d => d.caught >= 1 || d.phase === 'results', 200, () => { PL.playerBody.position.set(1.2, 1.0, 0.2); PL.playerBody.velocity.set(4, 0, 0); })) bad.push('blindtag: the bot did not catch a noisy player next to it');
    return bad;
`);
if (modeSim.length) modeSim.forEach((m) => fail('modes: ' + m)); else ok('modes: Swing Run, Tower Climb, Statues and Blind Tag rounds simulate correctly');

// ---- stats / achievements / audio ----
phase = 'stats';
const st = await run(`
    const E = await import('./core/economy.js'); const bad = [];
    const before = E.stat('emotes'); E.bumpStat('emotes', 3); if (E.stat('emotes') !== before + 3) bad.push('bumpStat did not add');
    const w = E.SAVE.wallet; E.SAVE.stats.highFives = 4; E.bumpStat('highFives'); if (!E.SAVE.achievements.hf_5) bad.push('hf_5 not unlocked at 5 high fives'); if (!E.SAVE.owned.includes('emote:heart')) bad.push('heart emote not granted');
    E.SAVE.stats.playSec = 5 * 3600 - 1; E.bumpStat('playSec', 2); if (!E.SAVE.achievements.play_5h || E.SAVE.wallet < w + 1000) bad.push('play_5h bones reward missing');
    return bad;
`);
if (st.length) st.forEach((m) => fail('stats: ' + m)); else ok('stats: counters and stat achievements work');

phase = 'highfive';
const hf = await run(`
    const E = await import('./core/economy.js'), EM = await import('./core/emotes.js'), N = await import('./core/network.js'), H = await import('./core/highfive.js'), ENG = await import('./core/engine.js'), AV = await import('./core/avatar.js');
    const bad = [], before = E.stat('highFives');
    const av = AV.createAvatar(E.SAVE.profile), head = av.head; ENG.scene.add(av.group);
    const cp = ENG.camera.getWorldPosition(new ENG.THREE.Vector3()); av.group.position.set(cp.x + 1.0, 0, cp.z); head.position.set(0, cp.y, 0);
    N.remoteAvatars.fake = av; N.playersState.fake = { em: { id: 'highfive', t: 1.0 } };
    EM.playEmote('highfive'); await new Promise(r => setTimeout(r, 700));
    H.updateHighFive(); if (E.stat('highFives') !== before + 1) bad.push('high five with a close player was not detected');
    H.updateHighFive(); if (E.stat('highFives') !== before + 1) bad.push('high five repeated during cooldown');
    delete N.remoteAvatars.fake; delete N.playersState.fake; ENG.scene.remove(av.group); EM.stopEmote();
    return bad;
`);
if (hf.length) hf.forEach((m) => fail('highfive: ' + m)); else ok('highfive: detected once, cooldown respected');

phase = 'audio';
const au = await run(`
    const A = await import('./core/audio.js'); A.initAudio(); await new Promise(r => setTimeout(r, 300));
    const bad = []; try { for (const r of ['levels','maze','well','cemetery','nonexistent']) A.setRoom(r); A.step(1, { x: 3, y: 0, z: -4 }); A.slap({ x: 0, y: 1, z: -1 }); A.roar(1, { x: 20, y: 1, z: 20 }); } catch (e) { bad.push(e.message); }
    return bad;
`);
if (au.length) au.forEach((m) => fail('audio: ' + m)); else ok('audio: rooms, reverb sends and spatial sounds run');

errors.forEach((e) => fail(e));
await browser.close(); server.close();
console.log(failures.length ? `\n${failures.length} failure(s)` : `\nAll ${notes.length} checks passed`);
process.exit(failures.length ? 1 : 0);
