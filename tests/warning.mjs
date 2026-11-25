// Test w przeglądarce: ekran ostrzeżenia z wyborem poziomu brutalności (pokazuje się raz, zapamiętuje wybór). Użycie: CHROMIUM_PATH=... node warning.mjs
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
const open_ = async (q) => { await page.goto(`http://localhost:${port}/?` + q + `three=${V}`); await page.waitForFunction(() => /Ready|Could not/.test(document.getElementById('status').innerText), null, { timeout: 120000 }); await page.waitForTimeout(500); };
const shown = () => page.evaluate(() => getComputedStyle(document.getElementById('warnScreen')).display !== 'none');
const stored = () => page.evaluate(() => JSON.parse(localStorage.getItem('bagaboo_settings') || '{}'));
const forget = () => page.evaluate(() => localStorage.setItem('bagaboo_settings', '{}'));
await open_('');
ok('automated browsers skip the warning (so the other browser tests are not blocked)', !(await shown()));
await forget();
await open_('warn=1&');
ok('a new player sees the warning with three choices', await shown() && (await page.$$('#warnScreen button.lv')).length === 3);
await page.click('#warnScreen button[data-level="gentle"]');
const s1 = await stored();
ok('choosing Gentle turns off gore, jump scares and haunting and remembers the choice', !(await shown()) && s1.gore === false && s1.jumpscares === false && s1.lobbyEvents === false && s1.warned === true, s1);
await open_('warn=1&');
ok('the warning does not come back after a choice', !(await shown()));
const s2 = await page.evaluate(async () => { const I = await import('./core/intensitylogic.js'), S = await import('./core/settings.js'); I.applyIntensity(S.SETTINGS, 'full'); return { gore: S.SETTINGS.gore, jumpscares: S.SETTINGS.jumpscares, lobbyEvents: S.SETTINGS.lobbyEvents, level: I.intensityOf(S.SETTINGS) }; });
ok('switching back to Full horror (the pause menu button does the same) turns everything on', s2.gore === true && s2.jumpscares === true && s2.lobbyEvents === true && s2.level === 'full', s2);
ok('no page errors', errors.length === 0, errors);
console.log(fails ? 'FAILED: ' + fails : 'warning: all checks passed'); await browser.close(); server.close(); process.exit(fails ? 1 : 0);
