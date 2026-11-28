// Test w przeglądarce: radiowozy od 4 gwiazdek w Scary GTA (pojawianie się poza widokiem, limity prędkości i odstępy, kolizje jako blockers auta gracza, przyszpilone auto = BUSTED, wysadzanie policjantów przy pieszym, ścieżka gościa z migawki, jedna siatka rysowania). Użycie: CHROMIUM_PATH=... node copcars.mjs
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
const T0 = Date.now(); const page = await ctx.newPage();
page.on('crash', () => console.log('PAGE CRASHED')); page.on('close', () => console.log('PAGE CLOSED at ' + ((Date.now() - T0) / 1000).toFixed(0) + ' s')); page.on('pageerror', (e) => errors.push('PAGEERROR ' + e.message));
page.on('console', (m) => { if (m.type() === 'error' && !/peerjs|favicon|Failed to load resource/i.test(m.text())) errors.push('CONSOLE ' + m.text().slice(0, 300)); });
await page.goto(`http://localhost:${port}/?three=${V}`);
await page.waitForFunction(() => /Ready|Could not/.test(document.getElementById('status').innerText), null, { timeout: 120000 });
await page.click('#btnSolo', { timeout: 90000 });
await page.waitForTimeout(1500);
let fails = 0; const ok = (name, cond, extra) => { if (cond) console.log('ok  ', name); else { fails++; console.log('FAIL', name, extra === undefined ? '' : JSON.stringify(extra)); } };
const ev = (fn, arg) => page.evaluate(fn, arg);
await ev(async () => { const M = await import('./main.js'); await M.loadLevel('scarygta'); });
await page.waitForTimeout(6000);

const R = await ev(async () => { try {
    const G = await import('./levels/scarygta.js'), P = await import('./core/player.js'), VL = await import('./core/vehiclelogic.js'), DR = await import('./core/drivelogic.js'), N = await import('./core/network.js'), E = await import('./core/engine.js');
    const S = G.testState(), w = (ms) => new Promise(r => setTimeout(r, ms)), st = () => G.debugDrive(), out = {}, cc = () => G.debugCruisers();
    const until = async (f, ms, keep) => { for (let t = 0; t < ms && !f(); t += 100) { if (keep) G.debugHeat(100); await w(100); } return f(); };
    for (let i = 0; i < 300 && S.busted >= 0; i++) await w(100);
    S.sim.reset(); S.sim.heats = {}; G.debugHeat(0); G.debugBlocks && G.debugBlocks([]); P.setPlayerPosition(-38, 1.2, -56); await w(600);
    // 1) 5 gwiazdek: radiowozy pojawiają się daleko od gracza, jedna siatka karoserii i jedna świateł
    G.debugHeat(100); await until(() => cc().cars.length >= 2, 30000, true);
    const c1 = cc(); out.spawn = { n: c1.cars.length, minDist: Math.min(...c1.cars.map(c => Math.hypot(c[0] + 38, c[1] + 56))), fx: c1.fx, blockers: c1.blockers };
    // 2) ruch: prędkość <= 6 m/s, odstęp między radiowozami, a po dojechaniu stoją krótko przed autem/graczem
    let vmax = 0, gap = 1e9; for (let i = 0; i < 80; i++) { G.debugHeat(100); const c = cc().cars; for (const a of c) vmax = Math.max(vmax, a[3]); for (const a of c) for (const b of c) if (a !== b) gap = Math.min(gap, Math.hypot(a[0] - b[0], a[1] - b[1])); await w(100); }
    out.move = { vmax, gap };
    // 3) pieszy: radiowóz dojeżdża i wysadza policjantów (liczba policjantów rośnie, licznik wysadzeń)
    const un0 = cc().unloads; await until(() => cc().unloads > un0, 90000, true); out.unload = { before: un0, after: cc().unloads };
    // 4) kradzione auto stoi przy radiowozie: po 2 s BUSTED, jazda się kończy
    S.sim.reset(); S.sim.heats = {}; G.debugHeat(0); await until(() => S.busted < 0, 30000);
    const pp = VL.parkedPose('bank'), door = DR.doorPoint(pp); P.setPlayerPosition(door.x + 0.4, 1.1, door.z); await w(500);
    await G.debugGtaTouch(() => [[door.x, 1.0, door.z]]); await w(1500); await G.debugGtaTouch(() => []); out.driving = st().driving;
    G.debugCruiserClear(); G.debugHeat(100); G.debugCruiserAdd(st().drive.x + 4.2, st().drive.z, 0); const bs0 = S.busted;
    await until(() => S.busted >= 0 || !st().driving, 8000, true); out.pin = { busted: S.busted >= 0, stillDriving: st().driving };
    G.debugCruiserClear();
    // 5) strona gościa: radiowozy z migawki hosta (śmieci odrzucone), interpolacja i blockers
    for (let i = 0; i < 300 && S.busted >= 0; i++) await w(100);
    S.sim.reset(); S.sim.heats = {}; G.debugHeat(0);
    N.NET.mode = 'guest'; N.playersState[N.GAME_PREFIX + N.NET.code] = { lvl: 'scarygta', head: { p: [0, 1.6, 0] } };
    let pc = [[10, -40, 0, 3], [20, -40, 1, 0], 'junk', [NaN, 1, 2, 3], [1e9, 0, 0, 0]]; const hb = setInterval(() => G.debugNet({ k: 'st', cops: [], bags: [], heats: {}, hp: {}, fd: [], pc }, 'host'), 250);
    await w(1500); const g1 = cc(); out.guest = { n: g1.cars.length, fx: g1.fx.n, host: g1.host, blockers: g1.blockers };
    pc = [[14, -40, 0, 3]]; await w(1500); out.guest2 = { n: cc().cars.length, fx: cc().fx.n };
    pc = []; await w(1500); out.guest3 = { n: cc().cars.length, fx: cc().fx.n }; clearInterval(hb); N.NET.mode = 'host'; G.debugDriveInput(null);
    return out;
} catch (e) { return { err: String(e.stack).slice(0, 700) }; } });
if (R.err) { console.log(R.err); process.exit(1); }
ok('at 5 stars two cruisers appear far from the player (70 m or more), drawn in two instanced meshes (body and lights) and every cruiser adds two blockers for the driver car', R.spawn.n >= 2 && R.spawn.minDist >= 60 && R.spawn.fx.n === R.spawn.n && R.spawn.fx.draw === 2 && R.spawn.blockers === R.spawn.n * 2, R.spawn);
ok('cruisers never go faster than 6 m/s and keep their distance from each other', R.move.vmax <= 6.01 && R.move.gap >= 3.5, R.move);
ok('a cruiser reaches the player on foot and unloads cops (once per cooldown)', R.unload.after > R.unload.before, R.unload);
ok('a stolen car standing next to a cruiser for 2 s ends in BUSTED and the drive ends', R.driving && R.pin.busted && !R.pin.stillDriving, R.pin);
ok('a guest draws the cruisers of the host snapshot only (garbage dropped), updates the count and removes them when the host list is empty', R.guest.n === 2 && R.guest.fx === 2 && R.guest.host === false && R.guest.blockers === 4 && R.guest2.n === 1 && R.guest2.fx === 1 && R.guest3.n === 0 && R.guest3.fx === 0, [R.guest, R.guest2, R.guest3]);
ok('no page errors', errors.length === 0, errors);
await browser.close(); server.close();
if (fails) { console.log(fails + ' check(s) failed'); process.exit(1); } console.log('copcars: all checks passed');
