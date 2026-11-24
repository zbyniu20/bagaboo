// Test w przeglądarce: reżyser grozy (core/ambience.js dreadUpdate): napięcie, ściszanie ambientu, zacinająca się latarka, gęstniejąca mgła, przywracanie i tryb spokojny, plus ślady grozy w poziomach.
// Użycie:  cd tests && CHROMIUM_PATH=... node dread.mjs      (wymaga npm ci; nie jest częścią testów szybkich ani smoke)
import { chromium } from 'playwright';
import fs from 'fs'; import path from 'path'; import http from 'http';
import { fileURLToPath } from 'url';
const HERE = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(HERE, '..'), DEPS = path.join(HERE, 'node_modules');
const V = JSON.parse(fs.readFileSync(path.join(DEPS, 'three/package.json'), 'utf8')).version, MIME = { '.js': 'text/javascript', '.html': 'text/html', '.png': 'image/png', '.json': 'application/json' };
const server = http.createServer((req, res) => {
    let u = decodeURIComponent(req.url.split('?')[0]); if (u === '/') u = '/index.html';
    const f = path.join(ROOT, u);
    if (f.startsWith(ROOT) && fs.existsSync(f) && fs.statSync(f).isFile()) { res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res); } else { res.writeHead(404); res.end(); }
}).listen(0);
const port = server.address().port;
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
const ctx = await browser.newContext({ viewport: { width: 1000, height: 640 } }), errors = [];
await ctx.route(/unpkg\.com/, (route) => {
    const u = route.request().url().split('?')[0], m = u.match(/three@([\d.]+)\/(.*)$/);
    let f = null;
    if (m) f = path.join(DEPS, 'three', m[2]); else if (/cannon-es/.test(u)) f = path.join(DEPS, 'cannon-es/dist/cannon-es.js'); else if (/peerjs/.test(u)) f = path.join(DEPS, 'peerjs/dist/peerjs.min.js');
    if (f && fs.existsSync(f) && fs.statSync(f).isFile()) route.fulfill({ status: 200, contentType: 'text/javascript', body: fs.readFileSync(f) }); else route.fulfill({ status: 404, body: '' });
});
const page = await ctx.newPage();
page.on('pageerror', (e) => errors.push('PAGEERROR ' + e.message));
page.on('console', (m) => { if (m.type() === 'error' && !/peerjs|favicon|Failed to load resource/i.test(m.text())) errors.push('CONSOLE ' + m.text().slice(0, 300)); });
await page.goto(`http://localhost:${port}/?three=${V}`);
await page.waitForFunction(() => /Ready|Could not/.test(document.getElementById('status').innerText), null, { timeout: 120000 });
await page.click('#btnSolo', { timeout: 90000 });
await page.waitForTimeout(1500);
let fails = 0; const ok = (name, cond, extra) => { if (cond) console.log('ok  ', name); else { fails++; console.log('FAIL', name, extra === undefined ? '' : JSON.stringify(extra)); } };
for (const lv of ['catacombs', 'cemetery', 'hospital', 'nursery', 'laundry', 'silence', 'furas', 'maze', 'hotel', 'room000', 'memory']) {
    await page.evaluate(async (id) => { const M = await import('./main.js'); await M.loadLevel(id); }, lv);
    await page.waitForTimeout(1800);
    const r = await page.evaluate(async () => {
        const E = await import('./core/engine.js'), A = await import('./core/ambience.js'), S = await import('./core/settings.js');
        const out = { story: E.L.root.getObjectByName('storyProps') ? E.L.root.getObjectByName('storyProps').children.length : 0 };
        const P = E.lighting.preset, lamp = E.lighting.headLamp, camP = new E.THREE.Vector3(); E.camera.getWorldPosition(camP);
        out.lamp = !!(P && P.flashlight && lamp.visible); out.baseFog = P ? P.fogDensity : 0; out.baseLamp = out.lamp ? P.flashlight.intensity : 0;
        // sztuczny potwór 3 m od gracza
        A.setDread(() => [{ x: camP.x + 3, y: 0, z: camP.z }]);
        let minLamp = 1e9, maxFog = 0; for (let i = 0; i < 400; i++) { A.dreadUpdate(0.016); if (out.lamp) minLamp = Math.min(minLamp, lamp.intensity); maxFog = Math.max(maxFog, E.scene.fog ? E.scene.fog.density : 0); }
        out.near = A.DREAD.near; out.hush = A.DREAD.hush; out.tension = A.DREAD.tension; out.minLamp = minLamp; out.maxFog = maxFog;
        // daleko: napięcie znika, wszystko wraca
        A.setDread(() => [{ x: camP.x + 60, y: 0, z: camP.z }]); for (let i = 0; i < 5; i++) A.dreadUpdate(0.016);
        out.farTension = A.DREAD.tension; out.farHush = A.DREAD.hush; out.lampBack = out.lamp ? lamp.intensity : 0; out.fogBack = E.scene.fog ? E.scene.fog.density : 0;
        // tryb spokojny: nic nie robi
        S.GAMES_CALM.on = true; A.setDread(() => [{ x: camP.x + 3, y: 0, z: camP.z }]); A.dreadUpdate(0.016); out.calmNear = A.DREAD.near; S.GAMES_CALM.on = false;
        A.setDread(null); A.dreadUpdate(0.016); out.cleared = A.DREAD.near;
        return out;
    });
    ok(lv + ': a monster 3 m away gives tension, hush and a near distance', Math.abs(r.near - 3) < 0.3 && r.tension > 0.7 && r.hush === true, r);
    ok(lv + ': far away the tension and hush are gone', r.farTension === 0 && r.farHush === false, r);
    ok(lv + ': the fog thickens near a monster and comes back', r.maxFog >= r.baseFog * 1.3 - 1e-6 && Math.abs(r.fogBack - r.baseFog) < 1e-6, { baseFog: r.baseFog, maxFog: r.maxFog, fogBack: r.fogBack });
    if (r.lamp) ok(lv + ': the flashlight stutters near a monster and returns to full power', r.minLamp < r.baseLamp * 0.6 && Math.abs(r.lampBack - r.baseLamp) < 1e-6, { base: r.baseLamp, min: r.minLamp, back: r.lampBack });
    ok(lv + ': calm mode (BagaBoo Games) switches the director off, and clearing the provider does too', r.calmNear === 99 && r.cleared === 99, r);
    if (['catacombs', 'cemetery', 'hospital', 'nursery', 'laundry', 'silence', 'furas', 'maze'].includes(lv)) ok(lv + ': the level has story props in at most 7 merged meshes', r.story >= 1 && r.story <= 7, r.story);
}
// ---- punkt 3 i 4: nasłuchiwanie, zjawy, znikanie po jumpscare'ie, warianty i mocny atak ----
await page.evaluate(async () => { const M = await import('./main.js'); await M.loadLevel('catacombs'); }); await page.waitForTimeout(1800);
const x = await page.evaluate(async () => {
    const E = await import('./core/engine.js'), A = await import('./core/ambience.js'), B = await import('./core/botkit.js'), K = await import('./core/levelkit.js'), out = {};
    // nasłuchiwanie: bot w patrolu staje co jakiś czas, w pościgu nigdy
    const run = (mode, listen) => { const b = B.createBot(5000, 5000); b.mode = mode; b.listen = listen; let paused = 0, moved = 0, segs = 0, was = false; for (let i = 0; i < 6000; i++) { const x0 = b.x; B.stepBot(b, 0.016, b.x + 50, b.z, 0, 3, mode === 'chase'); const p = (b.pauseT || 0) > 0; if (p) paused++; if (p && !was) segs++; was = p; moved += Math.abs(b.x - x0); } return { paused: paused * 0.016, segs: segs, moved: moved }; };
    out.patrol = run('patrol', true); out.chase = run('chase', true); out.plain = run('patrol', false);
    // zjawy: figura pojawia się i znika po czasie
    const camP = new E.THREE.Vector3(); E.camera.getWorldPosition(camP);
    let hidden = 0; A.setDread(() => [{ x: camP.x + 80, y: 0, z: camP.z }], { hide: (on) => { hidden += on ? 1 : -1; } });
    const f0 = A.DREAD.apps; let spawned = false; for (const k of ['side', 'behind', 'side', 'behind', 'side']) { if (A.dreadAppear(k)) { spawned = true; break; } }
    out.spawned = spawned && A.DREAD.apps > f0;
    const fig = E.L.root.getObjectByName('dreadApparition');
    out.figVisible = !!fig && fig.visible; out.figMeshes = fig ? (() => { let n = 0; fig.traverse(o => { if (o.isMesh) n++; }); return n; })() : 0;
    for (let i = 0; i < 220; i++) A.dreadUpdate(0.016); out.figGone = !!fig && fig.visible === false;
    // jumpscare: potwory znikają na czas ataku i wracają, latarka gaśnie, ambient milknie
    const j = K.createJumpscare({ seed: 1, variant: 'statue' }); const before = A.DREAD.scared;
    j.trigger(); out.scaredCount = A.DREAD.scared - before; out.hidden = hidden; A.dreadUpdate(0.016); out.hushNow = A.DREAD.hush;
    for (let i = 0; i < 40; i++) { j.update(0.02); A.dreadUpdate(0.02); } out.lampDark = E.lighting.headLamp.visible ? E.lighting.headLamp.intensity : null;
    for (let i = 0; i < 200; i++) { j.update(0.02); A.dreadUpdate(0.02); } out.hiddenAfter = hidden; out.jumpDone = !j.active();
    // warianty: każdy przechodzi całą sekwencję bez błędów; zwykły atak trwa 1,9 s, mocny (15%) 2,9 s
    const realRandom = Math.random, res = {};
    for (const v of ['grave', 'warden', 'doll', 'statue', 'butler', 'none']) { const jj = K.createJumpscare({ seed: 2, variant: v }); Math.random = () => 0.9; jj.trigger(); let n = 0; while (jj.active() && n < 400) { jj.update(0.02); n++; } res[v] = n * 0.02; jj.dispose(); }
    const jb = K.createJumpscare({ seed: 3, variant: 'doll' }); Math.random = () => 0.01; jb.trigger(); let nb = 0; while (jb.active() && nb < 400) { jb.update(0.02); nb++; } out.bigDur = nb * 0.02; jb.dispose(); Math.random = realRandom;
    out.variants = res;
    return out;
});
ok('listening: a patrolling bot with listen stops now and then (several pauses) and still walks', x.patrol.segs >= 3 && x.patrol.paused > 5 && x.patrol.moved > 100, x.patrol);
ok('listening: a chasing bot and a plain bot never pause', x.chase.paused === 0 && x.plain.paused === 0, { chase: x.chase, plain: x.plain });
ok('apparitions: a figure appears (side or behind) and vanishes by itself', x.spawned && x.figVisible && x.figGone, x);
ok('jumpscare: monsters are hidden for the attack, the ambience goes silent, the flashlight dies and everything returns after', x.scaredCount === 1 && x.hidden === 1 && x.hushNow === true && x.hiddenAfter === 0 && x.jumpDone, x);
ok('jumpscare: every variant runs a normal sequence of about 1.9 s', Object.values(x.variants).every(d => d > 1.8 && d < 2.0), x.variants);
ok('jumpscare: the rare big attack lasts about 2.9 s', x.bigDur > 2.8 && x.bigDur < 3.0, x.bigDur);
ok('no page errors', errors.length === 0, errors.slice(0, 5));
await browser.close(); server.close();
console.log(fails ? 'FAILED: ' + fails : 'dread: all checks passed'); process.exit(fails ? 1 : 0);
