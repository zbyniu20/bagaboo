// Test w przeglądarce: lobby: bestiariusz, skrzynia nocna i sekrety (budowa, zapis, odkrywanie, jedno otwarcie dziennie). Użycie: CHROMIUM_PATH=... [SHOTDIR=katalog] node lobbyextras.mjs
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
const ev = (fn, arg) => page.evaluate(fn, arg);
const Q = process.env.QUALITY || 'medium';
await ev((q) => { try { localStorage.setItem('bagaboo_settings', JSON.stringify({ ver: 2, quality: q })); } catch (e) {} }, Q);
await ev(async () => { const M = await import('./main.js'); await M.loadLevel('scarygta'); });
await page.waitForTimeout(5000);
const BUDGET = +(process.env.BUDGET || 260);
const views = [['casino interior (facing the door)', 53, 1.2, -65, 1.57], ['casino interior (facing the slots)', 50, 1.2, -65, 3.14], ['spawn on the beach', 0, 1.2, 56, Math.PI], ['street crossing', -31, 1.2, -39, 0], ['boulevard centre', 0, 1.2, 40, 1.57], ['bank roof 38 m', -6, 39.5, -52, 0], ['casino roof 46 m', 24, 47.5, -52, 3.14], ['plaza', -3, 1.2, 18, 1.0]];
// z aktywnym helikopterem, policją i 5 gwiazdkami (najgorszy przypadek)
await ev(async () => { const G = await import('./levels/scarygta.js'); G.debugHeat(100); const S = G.testState(); for (let i = 0; i < 100 && S.heli.mode === 'away'; i++) await new Promise(r => setTimeout(r, 100)); });
const out = [];
for (const v of views) {
    const r = await ev(async ([x, y, z, yaw]) => {
        const PL = await import('./core/player.js'), D = await import('./core/desktop.js'), E = await import('./core/engine.js'), G = await import('./levels/scarygta.js');
        PL.setPlayerPosition(x, y, z); D.setDesktopFacing(yaw); await new Promise(r => setTimeout(r, 1500));
        const R = E.renderer, I = R.info, sm = R.shadowMap.enabled; R.shadowMap.enabled = false; I.reset(); R.render(E.scene, E.camera); const a = I.render.calls, tri = I.render.triangles; R.shadowMap.enabled = sm;
        return { calls: a, tris: tri, visible: G.debugCity().visible };
    }, v.slice(1));
    out.push(Object.assign({ view: v[0] }, r)); console.log('     ', v[0], JSON.stringify(r));
}
const worst = Math.max(...out.map(o => o.calls));
ok('the worst view stays within the main-pass budget of ' + BUDGET + ' draw calls (' + Q + ')', worst <= BUDGET, out);
console.log('worst: ' + worst + ' draw calls, ' + Math.max(...out.map(o => o.tris)) + ' triangles');
ok('no page errors', errors.length === 0, errors);
console.log(fails ? 'citybudget: FAILED' : 'citybudget: all checks passed'); await browser.close(); server.close(); process.exit(fails ? 1 : 0);
