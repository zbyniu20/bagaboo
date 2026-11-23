// Test w przeglądarce: tryb obserwatora (Become the Monster) i akustyka (pogłos z geometrii, okluzja).
// Użycie:  cd tests && CHROMIUM_PATH=... node audio3d.mjs   (nie jest częścią testów szybkich ani smoke)
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
const st = () => page.evaluate(async () => { const S = await import('./core/spectate.js'), E = await import('./core/engine.js'), P = await import('./core/player.js'), c = new E.THREE.Vector3(); E.camera.getWorldPosition(c); const d = S.debugSpectate(); const t = (await import('./core/network.js')).playersState.fk; return { on: d.on, cur: d.cur, n: d.n, cam: [c.x, c.y, c.z], t: t ? t.head.p : null, body: [P.playerBody.position.x, P.playerBody.position.y, P.playerBody.position.z] }; });
// --- obserwator ---
const before = await page.evaluate(async () => { const P = await import('./core/player.js'); return [P.playerBody.position.x, P.playerBody.position.y, P.playerBody.position.z]; });
const started = await page.evaluate(async () => {
    const N = await import('./core/network.js'), M = await import('./levels/monster.js'), E = await import('./core/engine.js'), p = new E.THREE.Vector3(); E.camera.getWorldPosition(p);
    for (const [id, dx] of [['fk', 6], ['fk2', 10]]) N.playersState[id] = { lvl: 'monster', profile: { name: 'Fake' + id }, head: { p: [p.x + dx, 1.6, p.z + 3], q: [0, 0, 0, 1] } };
    N.NET.mode = 'host';   // uczestnikami są też gracze z playersState: złapanie jednego nie kończy rundy
    return M.debugPlay(100, 0) && M.debugSpectate();
});
ok('spectating starts when there are others to watch', started === true);
await page.waitForTimeout(2500);
let s = await st();
ok('spectator is on with 3 targets (2 players and the bot)', s.on && s.n === 3, s);
const d = Math.hypot(s.cam[0] - s.t[0], s.cam[2] - s.t[2]);
ok('the camera follows the first target from behind: close, above its head', s.cur === 'fk' && d > 0.5 && d < 3 && s.cam[1] > s.t[1] - 0.1, { d, s });
await page.keyboard.press('KeyQ'); await page.waitForTimeout(2500);
s = await page.evaluate(async () => (await import('./core/spectate.js')).debugSpectate());
ok('Q switches to the next target', s.cur === 'fk2', s);
await page.evaluate(async () => { const N = await import('./core/network.js'); delete N.playersState.fk2; delete N.playersState.fk; });
await page.waitForTimeout(1500);
s = await page.evaluate(async () => (await import('./core/spectate.js')).debugSpectate());
ok('when every other player is gone the round ends and spectating stops', s.on === false, s);
await page.evaluate(async () => { (await import('./core/spectate.js')).stopSpectate(); (await import('./core/network.js')).NET.mode = 'solo'; });
const after = await page.evaluate(async () => { const P = await import('./core/player.js'); return [P.playerBody.position.x, P.playerBody.position.y, P.playerBody.position.z]; });
ok('stopping returns the player to where they were caught', Math.hypot(after[0] - before[0], after[2] - before[2]) < 0.01, { before, after });
ok('no longer spectating', (await page.evaluate(async () => (await import('./core/spectate.js')).isSpectating())) === false);
// wyjście z poziomu w trakcie obserwacji
await page.evaluate(async () => { const N = await import('./core/network.js'), M = await import('./levels/monster.js'), E = await import('./core/engine.js'), p = new E.THREE.Vector3(); E.camera.getWorldPosition(p); N.playersState.fk = { lvl: 'monster', profile: { name: 'F' }, head: { p: [p.x + 5, 1.6, p.z], q: [0, 0, 0, 1] } }; M.debugSpectate(); });
await page.waitForTimeout(500);
await page.evaluate(async () => { const M = await import('./main.js'); await M.loadLevel('lobby'); }); await page.waitForTimeout(2000);
ok('leaving the level ends spectating', (await page.evaluate(async () => (await import('./core/spectate.js')).isSpectating())) === false);
// --- akustyka ---
await page.evaluate(async () => { const M = await import('./main.js'); await M.loadLevel('maze'); });
await page.waitForTimeout(3000);
const ac = await page.evaluate(async () => {
    const A = await import('./core/acoustics.js'), E = await import('./core/engine.js'), au = await import('./core/audio.js');
    au.initAudio(); await new Promise(r => setTimeout(r, 1200));
    const d = A.debugAcoustics(), out = { boxes: d.boxes, room: d.room };
    // źródło za ścianą: szukamy pary słuchacz-źródło przeciętej wysoką bryłą
    const cp = new E.THREE.Vector3(); E.camera.getWorldPosition(cp);
    const walls = E.L.obstacles.filter(o => o.box3 && o.box3.max.y - o.box3.min.y > 1.5);
    let best = null; for (const o of walls) { const b = o.box3, c = b.getCenter(new E.THREE.Vector3()), dir = c.clone().sub(cp).setY(0); if (dir.length() < 1 || dir.length() > 14) continue; dir.normalize(); const far = c.clone().addScaledVector(dir, 1.5).setY(cp.y); if (A.debugAcoustics().occ(far) > 0 && A.debugAcoustics().occ(cp.clone().addScaledVector(dir, 0.8)) === 0) { best = far; break; } }
    out.hasOccluded = !!best; out.occNear = A.debugAcoustics().occ({ x: cp.x + 0.6, y: cp.y, z: cp.z }); out.occBehind = best ? A.debugAcoustics().occ(best) : 0;
    return out;
});
console.log(JSON.stringify(ac));
ok('the maze level has obstacles and a measured room (sec and wet in range)', ac.boxes > 10 && ac.room && ac.room.sec >= 0.4 && ac.room.sec <= 3.2 && ac.room.wet >= 0.04 && ac.room.wet <= 0.3, ac);
ok('a source behind a wall is occluded and one right beside you is not', ac.hasOccluded && ac.occBehind > 0 && ac.occNear === 0, ac);
ok('no page errors', errors.length === 0, errors);
await browser.close(); server.close();
console.log(fails ? 'audio3d: FAILED ' + fails : 'audio3d: all checks passed'); process.exit(fails ? 1 : 0);
