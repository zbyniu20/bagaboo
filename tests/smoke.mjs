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
const LEVELS = (process.argv[2] || 'lobby,levels,maze,silence,well,laundry,memory,lava,hospital,cemetery,games,wardrobe,hideseek').split(',');
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
    return bad;
`);
if (data.length) data.forEach((m) => fail('data: ' + m)); else ok('data: achievements, catalog and emote poses consistent');

// ---- levels ----
for (const lv of LEVELS) {
    phase = lv;
    try {
        await run(`const M = await import('./main.js'); const PL = await import('./core/player.js'); await M.loadLevel('${lv}'); if ('${lv}' === 'wardrobe') PL.setPlayerPosition(-5, 1.0, 0); return 1;`);
        await page.waitForTimeout(2500);
        const r = await run(`const ENG = await import('./core/engine.js'), I = ENG.renderer.info; let pl = 0; ENG.scene.traverse(o => { if (o.isPointLight && o.visible) pl++; }); return { calls: I.render.calls, tris: I.render.triangles, pl: pl };`);
        const budget = BUDGET[lv] || BUDGET.default;
        if (!(r.calls > 0)) fail(`${lv}: nothing was rendered`);
        else if (r.calls > budget) fail(`${lv}: ${r.calls} draw calls exceed budget ${budget}`);
        else if (r.pl > MAX_POINT_LIGHTS) fail(`${lv}: ${r.pl} point lights exceed ${MAX_POINT_LIGHTS}`);
        else ok(`${lv}: ${r.calls} calls (budget ${budget}), ${r.pl} point lights, ${r.tris} tris`);
    } catch (e) { fail(`${lv}: ${e.message.slice(0, 200)}`); }
}

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
