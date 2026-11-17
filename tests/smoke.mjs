// Smoke tests: loads the game in headless Chromium (software GL), enters every level and checks
//   - no uncaught errors / console errors,
//   - the level renders (draw calls > 0) and stays inside its draw-call budget,
//   - economy data is consistent (achievement rewards exist, no duplicate ids),
//   - every emote pose runs without throwing.
// Usage:  cd tests && npm install && npx playwright install chromium   (once)
//         (or point CHROMIUM_PATH at an installed Chromium; CI: .github/workflows/smoke.yml)
//         npm run smoke            # all levels and modes from core/registry.js
//         node registry.mjs        # registry/files/cards check only: pure Node, under a second, no browser
//         node smoke.mjs maze,well # selected levels
// This does NOT measure real VR frame rate: draw calls/point lights are only a proxy for GPU cost.
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import http from 'http';
import { fileURLToPath, pathToFileURL } from 'url';

const HERE = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(HERE, '..'), DEPS = path.join(HERE, 'node_modules');
const PORT = +process.env.PORT || 8766;
// Domyślnie wszystkie poziomy, sale i tryby z rejestru (nowy tryb jest testowany od razu); lista po przecinku w argumencie zawęża
const { LEVEL_DEFS } = await import(pathToFileURL(path.join(ROOT, 'core/registry.js')).href);
const LEVELS = (process.argv[2] || LEVEL_DEFS.filter(d => d.kind !== 'virtual').map(d => d.id).join(',')).split(',');
// Draw-call budget per level (medium quality, renderer.info.render.calls on the first frames). Raise only on purpose.
const BUDGET = { default: 260, laundry: 230, memory: 310 };
const MAX_POINT_LIGHTS = 12;
const MIME = { '.js': 'text/javascript', '.html': 'text/html', '.png': 'image/png', '.webp': 'image/webp', '.json': 'application/json' };

const server = http.createServer((req, res) => {
    let u = decodeURIComponent(req.url.split('?')[0]); if (u === '/') u = '/index.html';
    const f = path.join(ROOT, u);
    if (f.startsWith(ROOT) && fs.existsSync(f) && fs.statSync(f).isFile()) { res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res); }
    else { res.writeHead(404); res.end(); }
}).listen(PORT);

const failures = [], notes = [];
const fail = (m) => { failures.push(m); console.log('FAIL', m); };
const ok = (m) => { notes.push(m); console.log('ok  ', m); };

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
// ---- Quest browser: user agent detection, light landing page, level still loads ----
// (runs first, before the main page exists, on purpose: on slow CI runners a second software-GL page next to a rendering page starved and hung for minutes; a lone page starts normally)
let phase = 'quest';
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
const qstatus = await qpage.evaluate(() => document.getElementById('status').innerText); if (/Could not/.test(qstatus)) fail('quest: game did not start: ' + qstatus);
await qpage.click('#btnGuest', { timeout: 240000 }); await qpage.click('#btnSolo', { timeout: 240000 });   // pierwszy ekran to logowanie: test gra jako gość await qpage.waitForTimeout(1500);
const qinfo = await qpage.evaluate(async () => { const D = await import('./core/device.js'), M = await import('./main.js'); await M.loadLevel('maze'); const E = await import('./core/engine.js'); return { quest: D.IS_QUEST, aniso: E.tex.wall.anisotropy }; });
if (!qinfo.quest || qinfo.aniso > 2) fail('quest: device detection or anisotropy cap failed ' + JSON.stringify(qinfo)); else ok('quest: detected, anisotropy capped at ' + qinfo.aniso);
if (qerr.length) qerr.forEach((e) => fail('quest: ' + e)); await qctx.close();


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
phase = 'boot';
const errors = [];
page.on('pageerror', (e) => errors.push(`[${phase}] PAGEERROR ${e.message}`));
page.on('console', (m) => { if (m.type() === 'error' && !/peerjs|favicon|Failed to load resource/i.test(m.text())) errors.push(`[${phase}] CONSOLE ${m.text().slice(0, 300)}`); });

await page.goto(`http://localhost:${PORT}/`);
await page.waitForFunction(() => /Ready|Could not/.test(document.getElementById('status').innerText), null, { timeout: 90000 });
await page.click('#btnGuest', { timeout: 90000 }); await page.click('#btnSolo', { timeout: 90000 });   // pierwszy ekran to logowanie: test gra jako gość
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
    // staff badges: the owner/admin/ultimate badges must be offered in the wardrobe (Gorilla Machine) to the people who may wear them, and to nobody else
    const GMACH = await import('./core/gorillamachine.js'), prevName = E.SAVE.profile.name;
    const badgesFor = (n) => { E.setProfile({ name: n }); return GMACH.itemsFor('badge').map(i => i.id).filter(id => ['owner', 'ultimate', 'coadmin', 'admin', 'mod', 'furas'].includes(id)).sort().join(); };
    const bB = badgesFor('BoyIsGamer'), bZ = badgesFor('zbyniu'), bX = badgesFor('RandomPlayer');
    if (bB !== 'admin,furas,mod,owner') bad.push('BoyIsGamer should be offered admin+furas+mod+owner badges, got: ' + bB);
    if (bZ !== 'admin,coadmin,mod,owner,ultimate') bad.push('zbyniu should be offered all 5 staff badges, got: ' + bZ);
    if (bX !== '') bad.push('a normal player must not be offered staff badges, got: ' + bX);
    E.setProfile({ name: prevName });
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

// (kontrola rejestru poziomów, FILES, kart i drzwi jest w registry.mjs: działa w czystym Node, bez przeglądarki)

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
    // Nursery: the music box drains, winding refills it, a teddy eats part of it, and a silent music box wakes the doll who catches an idle player
    m = await load('nursery');
    if (!until(m, d => d.phase === 'play', 200)) bad.push('nursery: never left the intro');
    const n0 = m.debug(); if (!n0.modes.every(x => x === 'asleep')) bad.push('nursery: doll should sleep while the music plays');
    if (!until(m, d => d.music < d.m0 * 0.6, 400, () => { PL.playerBody.position.set(-19.5, 1.0, -1.6); PL.playerBody.velocity.set(0, 0, 0); })) bad.push('nursery: music never drained');
    const st0 = n0.stationPos[0]; PL.playerBody.position.set(st0[0], 1.0, st0[1]); step(m, 2); if (!(m.debug().music > n0.m0 * 0.95)) bad.push('nursery: winding did not refill the music box (' + m.debug().music.toFixed(1) + ')');
    const kp = n0.keyPos[0]; PL.playerBody.position.set(kp[0], 1.0, kp[1]); step(m, 2); const nk = m.debug(); if (nk.keys !== 1 || !(nk.music < n0.m0 * 0.85)) bad.push('nursery: teddy not taken or did not eat the music (keys=' + nk.keys + ', music=' + nk.music.toFixed(1) + ')');
    if (!until(m, d => d.caught, 1500, () => { PL.playerBody.position.set(-19.5, 1.0, -1.6); PL.playerBody.velocity.set(0, 0, 0); })) bad.push('nursery: the awake doll never caught an idle player (modes=' + m.debug().modes + ')');
    // Hotel: big rooms stream in and out, doors open, the locked door needs the key, wardrobes have doors you open by hand (grip near the handle)
    // and close from inside with the latch; RUSH spares a player in a CLOSED wardrobe and kills one in the open or behind open doors
    m = await load('hotel');
    if (!until(m, d => d.phase === 'play', 200)) bad.push('hotel: never left the intro');
    let fl = m._flash(); if (!fl.held || fl.lampOnCamera || !fl.on || !fl.lampVisible) bad.push('hotel: flashlight should be in the right hand and on at the start ' + JSON.stringify(fl));
    m._toggleFlash(); step(m, 1); fl = m._flash(); if (fl.on || fl.lampVisible) bad.push('hotel: flashlight switch did not turn it off ' + JSON.stringify(fl));
    m._toggleFlash(); step(m, 1); fl = m._flash(); if (!fl.on || !fl.lampVisible) bad.push('hotel: flashlight switch did not turn it on again ' + JSON.stringify(fl));
    let hd = m.debug(); if (hd.rooms.join() !== '0,1,2') bad.push('hotel: expected rooms 0,1,2 at the start, got ' + hd.rooms);
    const zs = hd.zs, mid = (i) => (zs[i] + zs[i + 1]) / 2, len = (i) => zs[i] - zs[i + 1];
    if (hd.n !== 100) bad.push('hotel: expected 100 rooms, got ' + hd.n);
    if (!(len(0) === 12 && len(24) === 20 && len(66) === 20 && len(85) === 20 && len(50) === 40)) bad.push('hotel: room lengths wrong (12 m rooms, 20 m key halls 25/67/86, 40 m room 51): ' + [len(0), len(24), len(50)]);
    PL.playerBody.position.set(0, 1.0, zs[1] + 0.8); step(m, 3); if (!m.debug().doorsOpen.find(x => x[0] === 0 && x[1])) bad.push('hotel: door 1 did not open when approached');
    const obs1 = (PL.playerBody.position.set(0, 1.0, mid(1)), step(m, 3), m.debug().obstacles);
    for (const i of [2, 3]) { PL.playerBody.position.set(0, 1.0, mid(i)); step(m, 3); if (m.debug().cur !== i) bad.push('hotel: expected to be in room ' + i + ', got ' + m.debug().cur); }
    hd = m.debug(); if (hd.rooms.includes(0) || hd.rooms.includes(1) || !hd.rooms.includes(5)) bad.push('hotel: rooms did not stream (' + hd.rooms + ')');
    if (Math.abs(hd.obstacles - obs1) > 160) bad.push('hotel: collider count grows (' + obs1 + ' -> ' + hd.obstacles + ')');
    // Key halls: 4 wardrobes (2 in the hall + 1 per side room), the key lies in a side room, the walkable width grows, a blind butler patrols
    const hubI = 24; PL.playerBody.position.set(0, 1.0, mid(hubI)); step(m, 3); hd = m.debug();
    if (hd.wardrobes.filter(w => w[0] === hubI).length !== 4) bad.push('hotel: key hall should have 4 wardrobes');
    if (!(hd.bounds[1] > 14)) bad.push('hotel: the walkable width did not grow in the key hall (' + hd.bounds + ')');
    if (!hd.blinds.find(x => x[0] === hubI)) bad.push('hotel: no butler in the key hall');
    const key = hd.keys.find(x => x && x[0] === hubI); if (!key || Math.abs(key[1]) < 6.4) bad.push('hotel: the key must lie in a side room'); else { PL.playerBody.position.set(key[1], 1.0, key[2]); step(m, 3); if (m.debug().keysTaken !== 1) bad.push('hotel: key not picked up'); }
    // Room 51 (index 50, behind door 50): big and wider, with the blind one
    PL.playerBody.position.set(0, 1.0, mid(50)); step(m, 3); hd = m.debug(); if (!(hd.bounds[1] > 11)) bad.push('hotel: big room should be wider (' + hd.bounds + ')'); if (!hd.blinds.find(x => x[0] === 50)) bad.push('hotel: no blind monster in room 51');
    // The wardrobe test below needs a checkpoint to respawn at (checkpoints are saved every 10th door)
    m.testState().cp = 4;
    let wd = null; for (const i of [4, 5, 6]) { PL.playerBody.position.set(0, 1.0, mid(i)); step(m, 3); wd = m.debug().wardrobes.find(x => x && x[0] === i); if (wd) break; }
    if (!wd) bad.push('hotel: no wardrobe in rooms 4-6'); else {
        const W = () => m.debug().wardrobes.find(x => x[0] === wd[0] && x[1] === wd[1] && x[2] === wd[2]);
        const H = PL.hands.R; if (!H || !H.userData || !H.userData.rig) bad.push('hotel: hands not available for the wardrobe test'); else {
            const squeeze = (on) => { H.userData.rig.target = on ? 1.0 : 0; };
            const press = (x, y, z) => { H.position.set(x, y, z); squeeze(false); step(m, 1); squeeze(true); step(m, 1); squeeze(false); step(m, 1); };
            const stay = () => { PL.playerBody.position.set(wd[1], 1.0, wd[2]); PL.playerBody.velocity.set(0, 0, 0); };
            PL.playerBody.position.set(0, 1.0, wd[2]); step(m, 2); if (W()[3]) bad.push('hotel: wardrobe should start closed');
            press(wd[5], wd[6], wd[7]); if (!W()[3]) bad.push('hotel: grip near the handle did not open the wardrobe');
            step(m, 20); if (!(W()[4] > 0.99)) bad.push('hotel: wardrobe doors did not finish opening (t=' + W()[4] + ')');
            stay(); step(m, 2, stay); if (m.debug().hidden) bad.push('hotel: standing in a wardrobe with OPEN doors must not hide you');
            press(wd[8], wd[9], wd[10]); step(m, 20, stay); if (W()[3] || !(W()[4] < 0.01)) bad.push('hotel: latch did not close the doors (open=' + W()[3] + ', t=' + W()[4] + ')');
            if (!m.debug().hidden) bad.push('hotel: closed wardrobe does not hide');
            m._forceRush(); step(m, 90, stay); if (m.debug().caught || m.debug().rush !== 'wait') bad.push('hotel: RUSH should pass a player hidden behind closed doors (' + m.debug().rush + ', caught=' + m.debug().caught + ')');
            press(wd[8], wd[9], wd[10]); step(m, 20, stay); if (!W()[3] || m.debug().hidden) bad.push('hotel: latch did not open the doors again');
            m._forceRush(); if (!until(m, d => d.caught, 90, stay)) bad.push('hotel: RUSH should kill a player standing in a wardrobe with open doors');
            if (!until(m, d => !d.caught && d.cur === 4, 80)) bad.push('hotel: no respawn at the checkpoint after dying');
        }
        PL.playerBody.position.set(0, 1.0, mid(wd[0])); step(m, 2); m._forceRush();
        if (!until(m, d => d.caught, 90, () => { PL.playerBody.position.set(0, 1.0, mid(wd[0])); PL.playerBody.velocity.set(0, 0, 0); })) bad.push('hotel: RUSH did not kill a player in the open');
        if (!until(m, d => !d.caught && d.cur === 4, 80)) bad.push('hotel: no respawn at the checkpoint after dying (2)');
    }
    PL.playerBody.position.set(0, 1.0, mid(24)); step(m, 5); step(m, 30, () => PL.playerBody.velocity.set(4, 0, 0));   // key hall 25 has the butler: must run without errors
    // Door 100 needs 3 keys; opening it ends the level (exit to the lobby)
    {
        const St = m.testState(); St.keys = 0; PL.playerBody.position.set(0, 1.0, mid(99)); step(m, 3); PL.playerBody.position.set(0, 1.0, zs[100] + 0.8); step(m, 4);
        if (m.debug().doorsOpen.find(x => x[0] === 99 && x[1])) bad.push('hotel: door 100 opened without the keys');
        St.keys = 3; step(m, 4); if (!m.debug().doorsOpen.find(x => x[0] === 99 && x[1]) || !(m.debug().exitT >= 0)) bad.push('hotel: door 100 did not open with 3 keys / no exit timer');
    }
    // Levels terminal: picking a row and difficulty works, OPEN THE DOOR sends you to that level, the secret door scares on the 2nd knock
    {
        const TM = await import('./core/terminal.js'); let went = null; const gctx = Object.assign({}, ctx, { goto: (id) => { went = id; } });
        m = await load('levels'); if (ENG.lighting.headLamp.parent !== ENG.camera) bad.push('levels: the flashlight lamp was not returned to the camera after leaving the hotel'); const tick = (n) => { for (let i = 0; i < n; i++) m.update(0.1, T += 0.1, gctx); TM.redrawTerminals(); };
        tick(3); let ld = m.debug(); if (ld.screens !== 5) bad.push('levels: expected 5 terminal screens, got ' + ld.screens); if (!(ld.visitors >= 1)) bad.push('levels: visitor count wrong'); if (!ld || !ld.buttons.includes('enter') || ld.buttons.filter(x => x.startsWith('row')).length !== 11) bad.push('levels: terminal buttons missing (' + (ld && ld.buttons.length) + ')');
        if (!m._press('row2')) bad.push('levels: row2 not clickable'); tick(1); if (m.debug().sel !== 2) bad.push('levels: row click did not select');
        const E2 = await import('./core/economy.js'); E2.setDiff('well', 'normal');
        tick(1); if (!m._press('diff-nightmare')) bad.push('levels: difficulty buttons missing'); if (E2.getDiff('well') !== 'nightmare') bad.push('levels: difficulty not set'); E2.setDiff('well', 'normal');
        tick(1); m._press('enter'); if (went !== 'well') bad.push('levels: OPEN THE DOOR did not go to the well (went=' + went + ')');
        went = null; tick(1); m._press('row10'); tick(1); m._press('enter'); m._press('enter'); if (m.debug().knocks < 2 || went) bad.push('levels: secret door knocking wrong (knocks=' + m.debug().knocks + ', went=' + went + ')');
    }
    // Games terminals: 6 computers in a ring, category tabs, pick a mode, PLAY goes to it
    {
        const TM = await import('./core/terminal.js'); let went = null; const gctx = Object.assign({}, ctx, { goto: (id) => { went = id; } });
        m = await load('games'); const tick = (n) => { for (let i = 0; i < n; i++) m.update(0.1, T += 0.1, gctx); TM.redrawTerminals(); };
        tick(3); let gd = m.debug(); if (!gd || gd.screens !== 6) bad.push('games: expected 6 terminal screens, got ' + (gd && gd.screens));
        if (!gd.buttons.includes('play') || !gd.buttons.includes('tab-party') || !gd.buttons.includes('tab-team')) bad.push('games: terminal buttons missing');
        if (!m._press('tab-party')) bad.push('games: party tab not clickable'); tick(1); if (m.debug().cat !== 'party') bad.push('games: tab did not switch category');
        m._press('row2'); tick(1); m._press('play'); if (went !== 'blindtag') bad.push('games: PLAY went to ' + went + ', expected blindtag');
        went = null; m = await load('games'); tick(3); m._press('tab-team'); tick(1); m._press('row0'); tick(1); m._press('play'); if (went !== 'banana') bad.push('games: team tab PLAY went to ' + went + ', expected banana');
    }
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
if (modeSim.length) modeSim.forEach((m) => fail('modes: ' + m)); else ok('modes: Swing Run, Tower Climb, Nursery, Hotel, Levels and Games terminals, Statues and Blind Tag simulate correctly');

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
