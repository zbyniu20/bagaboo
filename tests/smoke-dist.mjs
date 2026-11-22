// Test dymny zbudowanej paczki (npm run build, katalog dist/): uruchamia grę z dist w headless Chromium, klika Guest i Solo i wchodzi do wszystkich poziomów z rejestru.
// Sprawdza: brak błędów strony i konsoli, że paczka nie sięga po CDN (unpkg), że każdy poziom coś rysuje (wywołania rysowania > 0) i że window.Peer pochodzi z paczki.
// Użycie:  npm run build && cd tests && CHROMIUM_PATH=... node smoke-dist.mjs [lista,poziomów]
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import http from 'http';
import { fileURLToPath, pathToFileURL } from 'url';

const HERE = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(HERE, '..'), DIST = path.join(ROOT, 'dist'), PORT = +process.env.PORT || 8768;
if (!fs.existsSync(path.join(DIST, 'index.html'))) { console.log('Brak dist/: uruchom najpierw npm run build'); process.exit(1); }
const { LEVEL_DEFS } = await import(pathToFileURL(path.join(ROOT, 'core/registry.js')).href);
// staff pomijamy: gość bez uprawnień wchodzący do pokoju szefa dostaje karę i przeładowanie strony po 3 s (levels/staff.js), co zakłóciłoby kolejne poziomy
const LEVELS = (process.argv[2] || LEVEL_DEFS.filter(d => d.kind !== 'virtual' && d.id !== 'staff').map(d => d.id).join(',')).split(',');
const MIME = { '.js': 'text/javascript', '.html': 'text/html', '.css': 'text/css', '.png': 'image/png', '.json': 'application/json' };
const server = http.createServer((req, res) => {
    let u = decodeURIComponent(req.url.split('?')[0]); if (u === '/') u = '/index.html';
    const f = path.join(DIST, u);
    if (f.startsWith(DIST) && fs.existsSync(f) && fs.statSync(f).isFile()) { res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res); }
    else { res.writeHead(404); res.end(); }
}).listen(PORT);
const failures = [], fail = (m) => { failures.push(m); console.log('FAIL', m); }, ok = (m) => console.log('ok  ', m);
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
const ctx = await browser.newContext({ viewport: { width: 1000, height: 640 } }), cdn = [];
await ctx.route(/^https?:\/\/(?!localhost)/, (route) => { const u = route.request().url(); if (!/fonts\.(googleapis|gstatic)\.com/.test(u)) cdn.push(u); route.fulfill({ status: 404, body: '' }); });   // każde zapytanie poza localhost (poza czcionkami strony startowej) to sięgnięcie po CDN albo sieć
const page = await ctx.newPage(), errors = [];
page.on('pageerror', (e) => errors.push('PAGEERROR ' + e.message));
page.on('console', (m) => { if (m.type() === 'error' && !/peerjs|favicon|Failed to load resource/i.test(m.text())) errors.push('CONSOLE ' + m.text().slice(0, 300)); });
if (process.env.DEBUG_NAV) page.on('framenavigated', (f) => console.log('navigated', f.url()));
await page.goto(`http://localhost:${PORT}/`);
await page.waitForFunction(() => /Ready|Could not/.test(document.getElementById('status').innerText), null, { timeout: 120000 });
const status = await page.evaluate(() => document.getElementById('status').innerText);
/Ready/.test(status) ? ok('the bundled game boots: ' + status) : fail('the bundled game did not boot: ' + status);
await page.click('#btnGuest', { timeout: 90000 }); await page.click('#btnSolo', { timeout: 90000 });
await page.waitForFunction(() => !!window.BAGABOO_DEBUG, null, { timeout: 120000 });   // uchwyt powstaje na końcu main.js
await page.waitForTimeout(1500);
(await page.evaluate(() => typeof window.Peer === 'function')) ? ok('Peer comes from the bundle (window.Peer)') : fail('window.Peer is missing');
for (const lv of LEVELS) {
    const before = errors.length;
    try { await page.evaluate(async (id) => { await window.BAGABOO_DEBUG.loadLevel(id); }, lv); } catch (e) { fail(`${lv}: loadLevel threw ${String(e.message).slice(0, 200)}`); continue; }
    await page.waitForTimeout(1200);
    const calls = await page.evaluate(() => window.BAGABOO_DEBUG.renderer.info.render.calls);
    if (errors.length > before) fail(`${lv}: ${errors.slice(before).join(' | ').slice(0, 300)}`);
    else if (!(calls > 0)) fail(`${lv}: nothing was rendered`);
    else ok(`${lv}: ${calls} draw calls`);
}
cdn.length ? fail('the bundle reached for the network/CDN: ' + [...new Set(cdn)].slice(0, 4).join(', ')) : ok('no requests to any CDN or other host');
await browser.close(); server.close();
console.log(failures.length ? `\n${failures.length} failure(s)` : '\nAll bundle checks passed'); process.exit(failures.length ? 1 : 0);
