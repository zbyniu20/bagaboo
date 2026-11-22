// Test w przeglądarce: polowanie w Become the Monster (Final Hunt, puls węchu, strach, bot szybszy, sprzątanie po wyjściu).
// Użycie:  cd tests && CHROMIUM_PATH=... node hunt.mjs      (wymaga npm ci; nie jest częścią testów szybkich ani smoke)
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
await page.evaluate(async () => { const M = await import('./main.js'); await M.loadLevel('monster'); });
await page.waitForTimeout(2500);
const play = (t, dx) => page.evaluate(async ([t, dx]) => { const M = await import('./levels/monster.js'); return M.debugPlay(t, dx); }, [t, dx]);
const hunt = () => page.evaluate(async () => { const M = await import('./levels/monster.js'); return M.debugHunt(); });
const fog = () => page.evaluate(async () => { const E = await import('./core/engine.js'), A = await import('./core/ambience.js'); return { density: E.scene.fog.density, base: E.lighting.preset.fogDensity, color: E.scene.fog.color.getHex(), fogMul: A.DREAD.fogMul }; });
const f0 = await fog();
ok('the debug hooks work in the monster level', await play(100, 60) === true);
await page.waitForTimeout(500);
let h = await hunt(); ok('a normal moment of the round: no Final Hunt, no pulse, no fear', h.phase === 'play' && h.final === false && h.pulse === false && h.fear === 0 && h.fogMul === 1, h);
await play(101.5, 60); await page.waitForTimeout(500); h = await hunt(); ok('solo (one survivor): at 18.5 s into the round a scent pulse is on', h.pulse === true && h.final === false, h);
await play(105, 60); await page.waitForTimeout(500); h = await hunt(); ok('and 5 s later (15 s into the round) the pulse is off', h.pulse === false, h);
await play(25, 60); await page.waitForTimeout(700); h = await hunt(); let f = await fog();
ok('in the last 30 s the Final Hunt starts: the fog thickens and turns red', h.final === true && f.fogMul === 1.35 && f.color !== f0.color, { h, f });
await play(100, 7); await page.waitForTimeout(350); h = await hunt();
ok('a monster 7 m away gives the survivor a red fear vignette', h.fear > 0 || h.fearVisible, h);
await play(100, 60); await page.waitForTimeout(500); h = await hunt();
ok('far from the monster the fear goes away', h.fear === 0 && h.fearVisible === false, h);
await play(100, 60); await page.waitForTimeout(400); f = await fog();
ok('leaving the Final Hunt restores the fog', f.fogMul === 1 && f.color === f0.color, { f, f0 });
await play(20, 60); await page.waitForTimeout(500);
await page.evaluate(async () => { const M = await import('./main.js'); await M.loadLevel('lobby'); }); await page.waitForTimeout(2000);
f = await fog(); ok('leaving the mode in the middle of the Final Hunt restores the fog and the multiplier', f.fogMul === 1 && Math.abs(f.density - f.base) < 1e-9, f);
ok('no page errors', errors.length === 0, errors.slice(0, 5));
await browser.close(); server.close();
console.log(fails ? 'FAILED: ' + fails : 'hunt: all checks passed'); process.exit(fails ? 1 : 0);
