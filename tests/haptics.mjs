// Test w przeglądarce: haptyka (core/haptics.js) na atrapie sesji XR. Użycie: cd tests && CHROMIUM_PATH=... node haptics.mjs
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
const r = await page.evaluate(async () => {
    const E = await import('./core/engine.js'), H = await import('./core/haptics.js'), S = await import('./core/settings.js'), A = await import('./core/audio.js');
    const log = [], mk = (side) => ({ handedness: side, gamepad: { buttons: Array.from({ length: 8 }, () => ({ pressed: false, touched: false, value: 0 })), axes: [0, 0, 0, 0], hapticActuators: [{ pulse: (i, ms) => log.push({ side: side, i: i, ms: ms }) }] } });
    E.renderer.xr.getSession = () => ({ inputSources: [mk('right'), mk('left')] });   // kolejność prawa, lewa: indeks nie oznacza strony
    const wait = (ms) => new Promise(r => setTimeout(r, ms)), out = {}, count = (side) => log.filter(l => l.side === side).length;
    S.SETTINGS.haptics = true;
    log.length = 0; H.hapticPlay('step', 1, 'left'); await wait(30); out.stepLeft = { left: count('left'), right: count('right') };
    log.length = 0; H.hapticPlay('step', 1, 'right'); await wait(120); out.stepRight = { left: count('left'), right: count('right') };
    log.length = 0; await wait(80); H.hapticPlay('step', 1, 'left'); H.hapticPlay('step', 1, 'left'); await wait(30); out.throttle = { left: count('left') };
    log.length = 0; await wait(80); H.hapticPlay('growl', 1); await wait(900); out.growl = { left: count('left'), right: count('right'), max: Math.max(0, ...log.map(l => l.i)), maxMs: Math.max(0, ...log.map(l => l.ms)) };
    log.length = 0; await wait(80); H.buzz(0, 0.5, 50); await wait(20); out.index0 = { right: count('right'), left: count('left') };   // stary interfejs: indeks 0 to pierwsze źródło wejścia (tu prawe)
    S.SETTINGS.haptics = false; log.length = 0; const n = H.hapticPlay('growl', 1); H.buzz('both', 1, 100); await wait(300); out.off = { n: n, pulses: log.length }; S.SETTINGS.haptics = true;
    log.length = 0; H.hapticPlay('growl', 0); H.hapticPlay('nope', 1); await wait(50); out.invalid = { pulses: log.length };
    out.audio = !!A.audioBus();
    if (out.audio) { await wait(100); log.length = 0; A.growl({ x: 1, y: 1, z: 2 }); await wait(900); out.growlAudio = { pulses: log.length }; log.length = 0; await wait(100); A.growl({ x: 400, y: 1, z: 400 }); await wait(900); out.farAudio = { pulses: log.length }; }
    return out;
});
console.log('     ', JSON.stringify(r));
ok('a step on the left goes only to the controller whose handedness is left, although it is the second input source', r.stepLeft.left === 1 && r.stepLeft.right === 0, r.stepLeft);
ok('a step on the right goes only to the right controller', r.stepRight.right === 1 && r.stepRight.left === 0, r.stepRight);
ok('two pulses in the same instant on one controller: only the first is sent (the next would replace the running one)', r.throttle.left === 1, r.throttle);
ok('a growl rumbles both controllers several times, within the strength and length limits', r.growl.left >= 2 && r.growl.right >= 2 && r.growl.max <= 1 && r.growl.maxMs <= 900, r.growl);
ok('the old index interface still works (index 0 = first input source)', r.index0.right === 1 && r.index0.left === 0, r.index0);
ok('with the haptics setting off nothing is sent, also through the old buzz', r.off.n === 0 && r.off.pulses === 0, r.off);
ok('unknown names and zero strength send nothing', r.invalid.pulses === 0, r.invalid);
if (r.audio) { ok('a growl sound close to the player vibrates the controllers, a very distant one does not', r.growlAudio.pulses >= 2 && r.farAudio.pulses === 0, [r.growlAudio, r.farAudio]); } else console.log('      (audio not started in this run: sound-driven check skipped)');
ok('no page errors', errors.length === 0, errors);
await browser.close(); server.close();
if (errors.length) console.log(errors.join('\n'));
console.log(fails ? 'haptics: FAILED' : 'haptics: all checks passed'); process.exit(fails || errors.length ? 1 : 0);
