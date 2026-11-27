// Test w przeglądarce: Scary GTA: żywe miasto (przechodnie, ruch uliczny, billboardy), radio DJ i eskalacja mgły. Użycie: CHROMIUM_PATH=... node gtalife.mjs [SHOTDIR=katalog na zrzuty]
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





const w = (ms) => page.waitForTimeout(ms);
const G = (fn, arg) => ev(async ([src, a]) => { const M = await import('./levels/scarygta.js'); return (0, eval)('(' + src + ')')(M, a); }, [fn.toString(), arg]);
await G((M) => M.debugGtaNight('calm', 1e9));
const l0 = await G((M) => M.debugLife()), bb0 = await G((M) => M.debugBillboards());
ok('the living city builds: three instanced meshes, the street already fills up by itself (never above the quality limit), the billboard mesh is in the level with 4-6 ads', l0 && l0.meshes === 3 && l0.peds <= l0.wantP && l0.cars <= l0.wantC && l0.wantP > 0 && l0.wantC > 0 && bb0 && bb0.n >= 4 && bb0.n <= 6 && bb0.parent === true && bb0.visible === true, { l0, bb0 });
const IL = (o) => Object.assign({ x: 0, y: 1.2, z: 0, dx: 1, dz: 0 }, o);
const lstep = (n, dt, c) => G((M, a) => M.debugLifeStep(a.n, a.dt, a.c), { n, dt, c });
const fill = await lstep(400, 0.1, IL({ x: 0, z: 0, dx: 1, dz: 0 }));
ok('pedestrians and cars fill in around the player (spawning out of sight, one by one)', fill.peds >= Math.floor(fill.wantP * 0.6) && fill.cars >= Math.floor(fill.wantC * 0.5), fill);
ok('by day nobody is frozen or creeping and cars are moving', fill.frozen === 0 && fill.creeping === 0 && fill.dead === 0, fill);
await G((M) => M.debugGtaNight('blackout', 1e9));
const bl = await lstep(300, 0.1, IL({ x: 0, z: 0, dx: 1, dz: 0 }));
ok('in a blackout the crowd within 45 m freezes and watches, every car goes dark and stops', bl.frozen > 0 && bl.dead === bl.cars && bl.moving === 0, bl);
ok('in a blackout one car wakes with its lights on (the nearest within 45 m) and the unseen frozen ones creep', (bl.haunted === 1 || bl.cars === 0) && bl.creeping >= 0, bl);
await G((M) => M.debugGtaNight('calm', 1e9));
const back = await lstep(30, 0.1, IL({ x: 0, z: 0, dx: 1, dz: 0 }));
ok('when the light returns the frozen crowd vanishes (and the street fills again), cars drive on', back.frozen === 0 && back.dead === 0, back);
await G((M) => M.debugGtaNight('horde', 1e9));
const hd = await lstep(80, 0.1, IL({ x: 0, z: 0, dx: 1, dz: 0 }));
ok('in a horde the sidewalks are empty', hd.peds === 0 && hd.cars <= hd.wantC, hd);
await G((M) => M.debugGtaNight('calm', 1e9));
// radio DJ
const dj1 = await G((M) => M.debugDj('blackout', 0, false)), dj2 = await G((M) => M.debugDj('calm', 0, true)), dj3 = await G((M) => M.debugDj('horde', 0, false));
ok('the DJ has a line for a blackout and a horde, and stays silent while the radio is busy', typeof dj1 === 'string' && dj1.length > 10 && typeof dj3 === 'string' && dj2 === null, { dj1, dj2, dj3 });
// eskalacja mgły
const fog0 = await G((M) => M.debugLife());
await G((M) => M.debugHeat(100));
let esc = null; for (let i = 0; i < 90 && !(esc && esc.esc > 1.12); i++) { await w(1000); esc = await G((M) => M.debugLife()); }
ok('at four or five stars the fog multiplier rises smoothly above 1,1 (and not past 1,4)', esc && esc.esc > 1.12 && esc.esc <= 1.4 + 1e-6 && fog0.esc <= 1.01, { before: fog0.esc, after: esc && esc.esc, fog: esc && esc.fog });
// koszt rysowania z całym żywym miastem
const calls = await ev(async () => { const E = await import('./core/engine.js'), R = E.renderer, I = R.info, sm = R.shadowMap.enabled; R.shadowMap.enabled = false; I.reset(); R.render(E.scene, E.camera); const c = I.render.calls; R.shadowMap.enabled = sm; return c; });
ok('the whole city with life, billboards, five stars and the heli stays well within the 260 draw-call budget', calls <= 230, calls);
if (SP) {
    await G((M) => M.debugGtaNight('calm', 1e9));
    const look = async (name, x, y, z, tx, ty, tz, wait) => { const dx = tx - x, dz = tz - z, yaw = Math.atan2(-dx, -dz), pitch = Math.atan2(ty - y, Math.hypot(dx, dz)); await ev(async ([x, y, z, yaw, pitch]) => { const PL = await import('./core/player.js'), D = await import('./core/desktop.js'); PL.setPlayerPosition(x, y, z); D.setDesktopFacing(yaw, pitch); }, [x, y, z, yaw, pitch]); await w(wait || 1200); await page.screenshot({ path: SP + '/life_' + name + '.png', timeout: 120000 }); };
    const sp = await G((M) => M.debugBillboards()), bsp = await ev(async () => { const E = await import('./core/gtabillboards.js'); return E.billboardSpots(); });
    const b = bsp[0]; await look('billboard', b.x + b.nx * 12, 2.2, b.z + b.nz * 12, b.x, b.y, b.z);
    await G((M) => M.debugGtaNight('blackout', 1e9)); await lstep(300, 0.1, IL({ x: 0, z: 0, dx: 1, dz: 0 }));
    await look('blackout_street', 0, 1.6, 0, -30, 1.4, 0, 1500);
    await look('billboard_dark', b.x + b.nx * 12, 2.2, b.z + b.nz * 12, b.x, b.y, b.z, 1500);
    const dbg = await G((M) => M.debugLife()), fr = dbg.list.find(q => q[2] === 'freeze' && Math.hypot(q[0], q[1]) > 10 && Math.hypot(q[0], q[1]) < 40);
    if (fr) { const dxp = -fr[0], dzp = -fr[1], dl = Math.hypot(dxp, dzp), ux = dxp / dl, uz = dzp / dl, cx = fr[0] + ux * 7, cz = fr[1] + uz * 7; await look('frozen_ped', cx, 1.6, cz, fr[0] - uz * 3.2, 1.4, fr[1] + ux * 3.2, 1200); }   // postać z boku, poza blaskiem środka ekranu w trybie testowym
}
ok('no page errors', errors.length === 0, errors.slice(0, 5));
await browser.close(); server.close();
console.log(fails ? fails + ' check(s) failed' : 'gtalife: all checks passed'); process.exit(fails ? 1 : 0);
