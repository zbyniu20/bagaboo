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
await ev(async () => { const M = await import('./main.js'); await M.loadLevel('scarygta'); });
await page.waitForTimeout(6000);
const shot = async (name, x, y, z, yaw) => { if (!SP) return; await ev(async ([x, y, z, yaw]) => { const PL = await import('./core/player.js'), D = await import('./core/desktop.js'); PL.setPlayerPosition(x, y, z); D.setDesktopFacing(yaw); }, [x, y, z, yaw]); await page.waitForTimeout(1800); await page.screenshot({ path: SP + '/city_' + name + '.png', timeout: 120000 }); };
const info = () => ev(async () => { const G = await import('./levels/scarygta.js'), E = await import('./core/engine.js'), P = await import('./core/player.js'); return Object.assign({}, G.debugCity(), { level: E.L.levelId, y: +P.playerBody.position.y.toFixed(2), z: +P.playerBody.position.z.toFixed(1), ms: +(+E.L.moveScale).toFixed(3), maxZ: E.L.bounds.maxZ, ball: !!E.L.ballBounds, calls: E.renderer ? 0 : 0 }); });
const s0 = await info();
ok('the city builds: 12 chunks, 6 bags, lobby movement scale, bounds cover the whole 160 x 150 m map', s0 && s0.chunks === 12 && s0.bags === 6 && s0.ms === 1.15 && s0.maxZ > 70 && s0.ball && s0.level === 'scarygta' && s0.buildings > 30 && s0.cars > 10, s0);
await shot('spawn', 0, 1.2, 56, Math.PI);
await shot('street', -10, 1.2, 20, 0);
await shot('street2', 10, 1.2, -20, 1.57);
await shot('boulevard', -40, 1.2, 40, -1.57);
await shot('marina', -45, 1.2, 40, 3.4);
// chunki: z daleka znikają
const vis = await ev(async () => { const G = await import('./levels/scarygta.js'), P = await import('./core/player.js'); P.setPlayerPosition(-70, 1.2, 40); await new Promise(r => setTimeout(r, 1800)); const a = G.debugCity().visible; P.setPlayerPosition(60, 1.2, -60); await new Promise(r => setTimeout(r, 1800)); const b = G.debugCity().visible; return { a, b, all: G.debugCity().chunks }; });
ok('chunks far from the player are hidden (fewer than all are drawn)', vis.a < vis.all && vis.b < vis.all && vis.a > 0 && vis.b > 0, vis);
// torba: ciężar łupu
const bag = await ev(async () => { const G = await import('./levels/scarygta.js'), E = await import('./core/engine.js'), w = (ms) => new Promise(r => setTimeout(r, ms)); const a = G.debugTakeBag('jewelry'), again = G.debugTakeBag('jewelry'); await w(600); return { a, again, got: G.debugCity().got, ms: +(+E.L.moveScale).toFixed(3) }; });
ok('taking a bag works once and slows the player by 8% (1.15 -> 1.058)', bag.a === true && bag.again === false && bag.got === 1 && Math.abs(bag.ms - 1.058) < 0.002, bag);
// gracz na dachu przez rusztowanie kasyna nie jest teleportowany (granice sięgają wysoko)
await shot('roof', 0, 1.2, -60, Math.PI);
ok('no page errors', errors.length === 0, errors);
console.log(fails ? 'FAILED: ' + fails : 'city: all checks passed'); await browser.close(); server.close(); process.exit(fails ? 1 : 0);
