// Test w przeglądarce: Scary GTA: pogoda i radio policyjne. Użycie: CHROMIUM_PATH=... node weather.mjs
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


const wx = () => ev(async () => (await import('./levels/scarygta.js')).debugWeather());
await ev(async () => { const G = await import('./levels/scarygta.js'); G.debugWx('storm'); });
await ev(async () => { const G = await import('./levels/scarygta.js'); for (let i = 0; i < 300 && G.debugWeather().rain < 0.5; i++) await new Promise(r => setTimeout(r, 100)); });
const a = await wx();
ok('in a storm the rain streaks are drawn (one mesh) and the fog thickens', a.state === 'storm' && a.rain >= 0.5 && a.mesh === true && a.n > 0 && a.fog > 1.05, a);
// błysk: jedna górka światła otoczenia i powrót do bazy, grzmot po opóźnieniu
const fl = await ev(async () => {
    const G = await import('./levels/scarygta.js'), E = await import('./core/engine.js'), w = (ms) => new Promise(r => setTimeout(r, ms));
    const base = E.lighting.hemi.intensity; G.debugWx(null, true); const samples = [];
    for (let i = 0; i < 40; i++) { await w(50); samples.push(E.lighting.hemi.intensity); }
    for (let i = 0; i < 200 && G.debugWeather().thunders < 1; i++) await w(100);
    await w(800); const after = E.lighting.hemi.intensity;
    let peaks = 0; for (let i = 1; i < samples.length - 1; i++) if (samples[i] > samples[i - 1] + 1e-6 && samples[i] >= samples[i + 1] && samples[i] > base * 1.2) peaks++;
    return { base, max: Math.max(...samples), after, peaks, thunders: G.debugWeather().thunders };
});
ok('a lightning flash is one smooth bump of the ambient light (no strobe), returns to the base level, and thunder follows', fl.max > fl.base * 1.1 && fl.peaks <= 1 && Math.abs(fl.after - fl.base) < 1e-6 && fl.thunders >= 1, fl);
await ev(async () => { const G = await import('./levels/scarygta.js'); G.debugWx('clear'); });
await ev(async () => { const G = await import('./levels/scarygta.js'); for (let i = 0; i < 400 && G.debugWeather().mesh; i++) await new Promise(r => setTimeout(r, 100)); });
const c = await wx();
ok('when the weather clears the rain fades out and the mesh is hidden', c.rain <= 0.05 && c.mesh === false, c);
// radio: pierwsza gwiazdka daje komunikat dyspozytora w HUD
const rd = await ev(async () => { const G = await import('./levels/scarygta.js'), P = await import('./core/player.js'); P.setPlayerPosition(-70, 1.2, 40); G.debugHeat(30); for (let i = 0; i < 120; i++) { await new Promise(r => setTimeout(r, 100)); if (G.debugWeather().radio) break; } return G.debugWeather().radio; });
ok('the first star triggers a police radio line shown on the HUD', typeof rd === 'string' && /Robbery|Dispatch/.test(rd), rd);
ok('no page errors', errors.length === 0, errors);
console.log(fails ? 'FAILED: ' + fails : 'weather: all checks passed'); await browser.close(); server.close(); process.exit(fails ? 1 : 0);
