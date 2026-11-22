// Test w przeglądarce: Staff room, który się psuje (portrety, słoiki, manekiny, zdarzenia, zaciemnienie, sprzątanie). Opcjonalny argument: katalog na zrzuty.
// Użycie:  cd tests && CHROMIUM_PATH=... node staffhaunt.mjs [katalog]      (wymaga npm ci; nie jest częścią testów szybkich ani smoke)
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
const wait = (ms) => page.waitForTimeout(ms), OUT = process.argv[2] || '';
await page.evaluate(async () => { (await import('./core/economy.js')).SAVE.profile.name = 'Luna'; const M = await import('./main.js'); await M.loadLevel('staff'); }); await wait(2500);   // nick moderatora: wejście do pokoju jest dozwolone
const st = (cmd, arg) => page.evaluate(async ([c, a]) => (await import('./levels/staff.js')).debugStaff(c, a), [cmd, arg]);
let s = await st();
ok('staff: portraits, jars, the hanging figure and three mannequins are there and the fog is thicker', s.portraits === 4 && s.jars === 5 && s.hang === true && s.mans.length === 3 && s.fogMul === 1.5, s);
const parts = await page.evaluate(async () => { const E = await import('./core/engine.js'); return { story: !!E.L.root.getObjectByName('storyProps'), door: E.L.portals.some(p => p.target === 'lobby'), terminals: (await import('./core/terminal.js')).terminals.length }; });
ok('staff: blood and writing on the walls exist, the exit door still leads to the lobby and the screens are still there', parts.story && parts.door && parts.terminals >= 3, parts);
if (OUT) { await wait(500); await page.screenshot({ path: OUT + '/staff-start.png' }); }
s = await page.evaluate(async () => { const M = await import('./levels/staff.js'); for (const k of ['whisper', 'slam', 'step', 'drip', 'flicker', 'tv', 'writing']) M.debugStaff('event', k); return M.debugStaff(); });   // jedno wywołanie: bez klatek gry pomiędzy
ok('staff: the events leave their marks (steps queued, a drop falling, the lights flickering, the TV ghost, a message)', s.steps > 0 && s.drops > 0 && s.flick > 0 && s.tv === true && s.writes.some(a => a >= 0), s);
if (OUT) { await wait(200); await page.screenshot({ path: OUT + '/staff-events.png' }); }
for (let i = 0; i < 40 && (await st()).flick > 0; i++) await wait(300); s = await st();
ok('staff: after the flicker the lights are back at their normal level', s.flick <= 0 && s.lights.every(v => Math.abs(v - 6) < 1e-9), s);
s = await st('elapsed', 100); ok('staff: after a while in the room the tension grows', s.dread > 0.4 && s.dread < 0.45 && s.done === false, s);
s = await st('elapsed', 205); await wait(700); s = await st();
ok('staff: at the peak the blackout starts once: every light goes out and red eyes appear', s.done === true && s.blackout >= 0 && s.lights.every(v => v === 0) && s.eyes && s.eyes.every(v => v === true), s);
if (OUT) { await page.screenshot({ path: OUT + '/staff-blackout.png' }); }
for (let i = 0; i < 60 && (await st()).blackout >= 0; i++) await wait(400); s = await st();
ok('staff: the blackout ends by itself: lights return, eyes vanish, a message appears and the tension drops to 40%', s.blackout === -1 && s.lights.every(v => Math.abs(v - 6) < 1e-9) && s.eyes.every(v => v === false) && s.writes[0] >= 0 && Math.abs(s.dread - 0.4) < 0.05, s);
s = await st('elapsed', 235); await wait(1500); s = await st(); ok('staff: the blackout never repeats in the same visit', s.blackout === -1 && s.done === true, s);
const inB = s.mans.every(m => Math.abs(m.x) <= 7 && Math.abs(m.z) <= 5.5 && Math.hypot(m.x - m.home.x, m.z - m.home.z) <= 9.5); ok('staff: the mannequins stay inside the room and near their place', inB, s.mans);
await page.evaluate(async () => { const M = await import('./main.js'); await M.loadLevel('lobby'); }); await wait(2000);
const after = await page.evaluate(async () => { const A = await import('./core/ambience.js'); return { fogMul: A.DREAD.fogMul }; });
ok('staff: leaving the room restores the fog multiplier', after.fogMul === 1, after);
ok('no page errors', errors.length === 0, errors.slice(0, 5));
await browser.close(); server.close();
console.log(fails ? 'FAILED: ' + fails : 'staffhaunt: all checks passed'); process.exit(fails ? 1 : 0);
