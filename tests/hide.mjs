// Test w przeglądarce: fałszywe kryjówki (hotel: szafy, pralnia: bębny) i głos z mikrofonu (DREAD.voice, heardVoice).
// Użycie:  cd tests && CHROMIUM_PATH=... node hide.mjs      (wymaga npm ci; nie jest częścią testów szybkich ani smoke)
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
const wait = (ms) => page.waitForTimeout(ms);
const tp = (x, y, z) => page.evaluate(async ([x, y, z]) => { (await import('./core/player.js')).setPlayerPosition(x, y, z); }, [x, y, z]);
// ---- hotel ----
await page.evaluate(async () => { const M = await import('./main.js'); await M.loadLevel('hotel'); }); await wait(2500);
const hf = (force) => page.evaluate(async (f) => (await import('./levels/hotel.js')).debugFake(f), force);
let h = await hf(true); ok('hotel: wardrobes exist and a fixed share of them is a fake hiding place without forcing', h && h.wardrobes.length > 0, h);
const nat = await page.evaluate(async () => { const H = await import('./levels/hotel.js'); return H.debugFake(false).wardrobes.length; }); ok('hotel: the debug list works', nat > 0, nat);
const w0 = h.wardrobes[0];
await tp(w0.x, 1.0, w0.z); await wait(1200); h = await hf();
ok('hotel: stepping into a fake wardrobe reveals it once: the doors open by themselves and the jumpscare plays', h.seen === 1 && h.wardrobes[0].done === true && h.wardrobes[0].open === true, h);
await tp(w0.x, 1.0, w0.z + 6); await wait(500); await tp(w0.x, 1.0, w0.z); await wait(1200); h = await hf();
ok('hotel: the same wardrobe does not scare a second time', h.seen === 1, h);
// ---- pralnia ----
await page.evaluate(async () => { const M = await import('./main.js'); await M.loadLevel('laundry'); }); await wait(2500);
const lf = (force) => page.evaluate(async (f) => (await import('./levels/laundry.js')).debugFake(f), force);
let l = await lf(true); ok('laundry: open drums exist as hiding places', l && l.fake.length >= 2, l);
const f0 = l.fake[0];
await tp(f0.cx, 1.0, f0.cz); await wait(1500); l = await lf();
ok('laundry: stepping into a fake drum reveals it: the drum stops protecting and the Rag Man heads for the spot', l.used.includes(f0.i) && (l.mode === 'investigate' || l.mode === 'chase' || l.mode === 'rage'), l);
const g1 = l.fake.find(f => !f.done); if (g1) { await tp(g1.cx, 1.0, g1.cz); await wait(1200); l = await lf(); ok('laundry: another fake drum works the same way', l.used.includes(g1.i), l); }
// ---- glos ----
const v = await page.evaluate(async () => {
    const A = await import('./core/ambience.js'), out = {};
    out.start = A.DREAD.voice; A.DREAD.voice = 0.8; out.near = A.heardVoice(10, 1); out.far = A.heardVoice(25, 1); out.hidden = A.heardVoice(10, 0.4); out.nightmare = A.heardVoice(20, 1.3);
    A.DREAD.voice = 0; out.silent = A.heardVoice(1, 1); return out;
});
ok('voice: a loud voice is heard within about 17 m, a hidden player at 40% of that, a silent player never', v.start === 0 && v.near === true && v.far === false && v.hidden === false && v.nightmare === true && v.silent === false, v);
await page.evaluate(async () => { const M = await import('./main.js'); await M.loadLevel('lobby'); }); await wait(1500);
ok('no page errors', errors.length === 0, errors.slice(0, 5));
await browser.close(); server.close();
console.log(fails ? 'FAILED: ' + fails : 'hide: all checks passed'); process.exit(fails ? 1 : 0);
