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
const SP = process.env.SHOTDIR || '';
const ev = (fn, arg) => page.evaluate(fn, arg);
await ev(async () => { const M = await import('./main.js'); await M.loadLevel('lobby'); });
await page.waitForTimeout(5000);
const shot = async (name, x, y, z, yaw) => { if (!SP) return; await ev(async ([x, y, z, yaw]) => { const PL = await import('./core/player.js'), D = await import('./core/desktop.js'); PL.setPlayerPosition(x, y, z); D.setDesktopFacing(yaw); }, [x, y, z, yaw]); await page.waitForTimeout(1500); await page.screenshot({ path: SP + '/sec_' + name + '.png', timeout: 120000 }); };
await shot('slide', 10, 1.6, 30, -1.57);
await shot('platform', 12.6, 12.4, 33, 0);
const slide = await ev(async () => {
    const S = await import('./core/annexslide.js'), E = await import('./core/engine.js'), P = await import('./core/player.js'), w = (ms) => new Promise(r => setTimeout(r, ms));
    P.setPlayerPosition(13, 12.9, 38.2); await w(300); const before = S.debugAnnexSlide();
    S.debugSlideGrab(); await w(700); const mid = S.debugAnnexSlide();
    for (let i = 0; i < 90 && S.debugAnnexSlide().ph === 'ride'; i++) await w(400);
    await w(1500); const after = S.debugAnnexSlide();
    return { before, mid, after, level: E.L.levelId };
});
ok('the slide carries the player from the top platform to the landing (one ride, still in the lobby)', slide.mid.ph === 'ride' && slide.after.ph === 'idle' && slide.after.rides === 1 && slide.after.body[1] < 3.2 && slide.after.body[2] < 27 && slide.after.body[0] > 9 && slide.after.body[0] < 13 && slide.level === 'lobby', slide);
const sk = await ev(async () => {
    const D = await import('./core/deepskulls.js'), K = await import('./core/deep.js'), E = await import('./core/economy.js'), w0 = E.SAVE.wallet;
    const v0 = D.debugDeepSkulls().visible.slice(), a = D.debugTakeSkull('ceil'), b = D.debugTakeSkull('ceil'), c = D.debugTakeSkull('zipskull');
    return { v0, a, b, c, w: E.SAVE.wallet - w0, n: K.deepCountNow(), left: D.debugDeepSkulls().visible, saved: JSON.stringify(E.SAVE.deep) };
});
ok('the three silver skulls pay 50 Bagabucks each exactly once and vanish', sk.v0.length === 3 && sk.a === true && sk.b === false && sk.c === true && sk.w === 100 && sk.n === 2 && sk.left.join() === 'room' && /ceil/.test(sk.saved) && /zipskull/.test(sk.saved), sk);

ok('no page errors', errors.length === 0, errors);
console.log(fails ? 'FAILED: ' + fails : 'annexsecrets: all checks passed'); await browser.close(); server.close(); process.exit(fails ? 1 : 0);
