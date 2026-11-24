// Test w przeglądarce: celowa cisza (core/silencelogic.js, szyna ambient w core/audio.js). Użycie: cd tests && CHROMIUM_PATH=... node silence.mjs
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
await page.evaluate(async () => { const M = await import('./main.js'); await M.loadLevel('cemetery'); }); await page.waitForTimeout(2500);
const r = await page.evaluate(async () => {
    const E = await import('./core/engine.js'), AM = await import('./core/ambience.js'), A = await import('./core/audio.js'), bus = A.audioBus();
    const out = { hasBus: !!bus, ambientIsOwnNode: !!bus && bus.ambient !== bus.master };
    if (!bus) return out;
    if (bus.ctx.state !== 'running') { try { await bus.ctx.resume(); } catch (e) {} }
    out.state = bus.ctx.state;
    const wait = (ms) => new Promise(r => setTimeout(r, ms)), cam = new E.THREE.Vector3(); let dist = 30;
    AM.setDread(() => { E.camera.getWorldPosition(cam); return [{ x: cam.x + dist, y: 0, z: cam.z }]; }, { apparitions: false });
    const samples = []; let silentSeen = false; const step = async (n, d, ms) => { for (let k = 0; k < n; k++) { AM.dreadUpdate(d); samples.push(bus.ambient.gain.value); if (AM.DREAD.silent) silentSeen = true; await wait(ms); } };   // własne kroki z dt, bo klatki w renderowaniu programowym są wolniejsze od zegara
    await step(30, 0.1, 20); out.before = { gain: bus.ambient.gain.value, silent: AM.DREAD.silent };
    dist = 10.5; await step(18, 0.1, 30);   // napięcie przeskakuje przez próg 0,3: okno ciszy (2,8 s gry)
    out.during = { silentSeen: silentSeen, minG: Math.min(...samples) };
    await step(40, 0.1, 30); await wait(1500); AM.dreadUpdate(0.1); await wait(500);
    out.after = { gain: bus.ambient.gain.value, silent: AM.DREAD.silent };
    AM.setDread(null);
    out.master = bus.master.gain.value;
    return out;
});
console.log('     ', JSON.stringify(r));
ok('audio is running and the ambient bus is a separate node in front of the master', r.hasBus && r.ambientIsOwnNode, r);
if (r.state === 'running') {
    ok('at rest (monster far away) the ambient bus is at full level and not silent', r.before.gain > 0.95 && r.before.silent === false, r.before);
    ok('when the monster closes in the ambient bus drops to a low level and the ambience is marked silent', r.during.silentSeen === true && r.during.minG < 0.3, r.during);
    ok('after the window the ambient bus recovers by itself', r.after.gain > 0.8 && r.after.silent === false, r.after);
    ok('the master gain (where the threat cues go) is untouched by the silence', r.master > 0.3, r.master);
} else console.log('      (audio context could not run in this browser: level checks skipped, structure is covered by logic.mjs)');
ok('no page errors', errors.length === 0, errors);
await browser.close(); server.close();
if (errors.length) console.log(errors.join('\n'));
console.log(fails ? 'silence: FAILED' : 'silence: all checks passed'); process.exit(fails || errors.length ? 1 : 0);
