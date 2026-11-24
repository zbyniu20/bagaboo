// Test w przeglądarce: złapanie w Become the Monster (jedna ręka = żyje, dwie ręce albo głowa = odpada, ochrona po przeżyciu). Użycie: CHROMIUM_PATH=... node catch.mjs
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
let fails = 0; const ok = (name, cond, extra) => { if (cond) console.log('ok  ', name); else { fails++; console.log('FAIL', name, extra === undefined ? '' : JSON.stringify(extra)); } };
const page = await ctx.newPage(), errs = []; page.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message)); page.on('console', (m) => { if (m.type() === 'error' && !/peerjs|favicon|Failed to load resource/i.test(m.text())) errs.push('CONSOLE ' + m.text().slice(0, 200)); });
await page.goto(`http://localhost:${port}/?three=${V}`);
await page.waitForFunction(() => /Ready|Could not/.test(document.getElementById('status').innerText), null, { timeout: 120000 });
await page.click('#btnSolo', { timeout: 90000 }); await page.waitForTimeout(1500);
await page.evaluate(async () => { const M = await import('./main.js'); await M.loadLevel('monster'); await import('./core/tutorial.js').then(t => t.skipTutorial && t.skipTutorial()); });
await page.waitForTimeout(2500);
const fresh = () => page.evaluate(async () => { const M = await import('./levels/monster.js'); return M.debugPlay(100, 40); });   // bot daleko: sami wymuszamy złapania
const hit = (id, pick) => page.evaluate(async ([id, pick]) => { const M = await import('./levels/monster.js'); return M.debugCatch(id, pick); }, [id, pick]);
await fresh(); let r = await hit('me', 1);
ok('the first torn hand (left) leaves the player alive and with the code of that hand', r.dm === 1 && r.caught === false, r);
ok('a surviving player gets protection time', r.grace === true, r);
await page.waitForTimeout(900);
r = await page.evaluate(async () => (await import('./levels/monster.js')).debugCatch('me', 2));
ok('a second grab (the other hand) kills: both hands gone, the player is out', r.dm === 3 && r.caught === true, r);
await fresh(); r = await hit('me', 2); ok('a right hand alone is survivable too', r.dm === 2 && r.caught === false, r);
r = await hit('me', 2); ok('losing the same hand again takes the other one and kills', r.dm === 3 && r.caught === true, r);
await fresh(); r = await hit('me', 3); ok('both hands at once kill', r.dm === 3 && r.caught === true, r);
await fresh(); r = await hit('me', 4); ok('the head kills', r.dm === 4 && r.caught === true, r);
await fresh(); r = await hit('me', 1); await page.waitForTimeout(1500);
const hands = await page.evaluate(async () => { const P = await import('./core/player.js'); return [P.hands.L.visible, P.hands.R.visible]; });
ok('after one torn hand only that hand is hidden and the player keeps the other', hands[0] === false && hands[1] === true, hands);
await page.evaluate(async () => (await import('./levels/monster.js')).debugCatch('me', 2)); await page.waitForTimeout(1500);
const hands2 = await page.evaluate(async () => { const P = await import('./core/player.js'); return [P.hands.L.visible, P.hands.R.visible]; });
ok('the second tear is animated too and then both hands are gone', hands2[0] === false && hands2[1] === false, hands2);
ok('no page errors', errs.length === 0, errs);
await browser.close(); server.close();
console.log(fails ? 'catch: FAILED ' + fails : 'catch: all checks passed'); process.exit(fails ? 1 : 0);
