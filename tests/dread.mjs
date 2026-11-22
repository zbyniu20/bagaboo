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
await page.click('#btnGuest', { timeout: 90000 }); await page.click('#btnSolo', { timeout: 90000 });
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
ok('no page errors', errors.length === 0, errors.slice(0, 5));
await browser.close(); server.close();
console.log(fails ? 'FAILED: ' + fails : 'dread: all checks passed'); process.exit(fails ? 1 : 0);
