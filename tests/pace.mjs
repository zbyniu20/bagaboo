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
const ids = (process.env.LEVELS || 'lobby,hospital,laundry,room000,mine,lava,memory,well,games,hideseek,monster,range,scarygta,lobby').split(',');
const out = [];
for (const id of ids) {
    await ev(async (id) => { const M = await import('./main.js'); await M.loadLevel(id); }, id);
    await page.waitForTimeout(id === 'monster' ? 4000 : 2500);
    out.push(await ev(async (id) => { const E = await import('./core/engine.js'); return { id, ms: +(+E.L.moveScale).toFixed(3), up: E.L.maxUp || 0, sp: E.L.maxSpeedXZ || 0 }; }, id));
}
ok('every level starts with the lobby movement scale (1.15)', out.every(o => o.ms === 1.15), out);
const gtaBag = await ev(async () => { const M = await import('./main.js'); await M.loadLevel('scarygta'); await new Promise(r => setTimeout(r, 2500)); const G = await import('./levels/scarygta.js'), E = await import('./core/engine.js'); const before = +E.L.moveScale; G.debugTakeBag('bank'); await new Promise(r => setTimeout(r, 600)); return { before, after: +E.L.moveScale, got: G.debugCity().got }; });
ok('Scary GTA keeps the lobby movement (1.15) also while carrying a bag (no loot-weight slowdown)', gtaBag.before === 1.15 && gtaBag.after === 1.15 && gtaBag.got >= 1, gtaBag);
ok('the capped levels keep their absolute caps (lava and memory: speed and climb limits)', out.filter(o => o.id === 'lava').every(o => o.sp === 3.8 && o.up === 4.2) && out.filter(o => o.id === 'memory').every(o => o.sp === 4 && o.up === 4) && out.filter(o => o.id === 'hospital').every(o => o.sp === 0), out);
ok('the lobby again at the end is back to 1.15 and has no caps (identical to the first visit)', out[out.length - 1].id === 'lobby' && out[out.length - 1].ms === 1.15 && out[out.length - 1].sp === 0 && out[0].ms === out[out.length - 1].ms, [out[0], out[out.length - 1]]);
ok('no page errors', errors.length === 0, errors);
console.log(fails ? 'FAILED: ' + fails : 'pace: all checks passed'); await browser.close(); server.close(); process.exit(fails ? 1 : 0);
