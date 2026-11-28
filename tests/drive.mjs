// Test w przeglądarce: swobodna jazda skradzionym autem w Scary GTA (drzwi kierowcy, gaz i skręt, kolizje i automatyczne hamowanie, broń schowana, wysiadanie, porzucone auto, powrót na parking, potrącenie przechodnia). Użycie: CHROMIUM_PATH=... node drive.mjs
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
const ev = (fn, arg) => page.evaluate(fn, arg);
await ev(async () => { const M = await import('./main.js'); await M.loadLevel('scarygta'); });
await page.waitForTimeout(6000);
const R = await ev(async () => {
    const G = await import('./levels/scarygta.js'), P = await import('./core/player.js'), VL = await import('./core/vehiclelogic.js'), DR = await import('./core/drivelogic.js'), E = await import('./core/engine.js');
    const S = G.testState(), w = (ms) => new Promise(r => setTimeout(r, ms)), out = {}, st = () => G.debugDrive(), until = async (f, ms) => { for (let t = 0; t < ms && !f(); t += 100) await w(100); return f(); };   // czas symulacji odstaje od ściennego w wolnym renderowaniu: czekamy na warunek
    for (let i = 0; i < 300 && S.busted >= 0; i++) await w(100);
    S.sim.reset(); S.sim.heats = {}; G.debugHeat(0); G.debugBlocks && G.debugBlocks([]);
    const pp = VL.parkedPose('bank'), door = DR.doorPoint(pp);
    // 1) dłoń na drzwiach kierowcy kradnie auto (alarm +30 ciepła), ciało trafia do auta
    const h0 = S.sim.heatOf('me').v; P.setPlayerPosition(door.x + 0.5, 1.1, door.z); await w(500);
    await G.debugGtaTouch(() => [[door.x, 1.0, door.z]]); await w(1500); await G.debugGtaTouch(() => []);
    out.start = st(); out.heat = S.sim.heatOf('me').v - h0;
    // 2) gaz: rozpędza się najwyżej do 7 m/s, jedzie do przodu
    G.debugDriveInput(1, 0, 0); const a0 = st().drive; await until(() => st().drive.v >= 6.9, 20000); const a1 = st().drive; out.fwd = { v: a1.v, d: Math.hypot(a1.x - a0.x, a1.z - a0.z), vmax: 0 };
    let vmax = 0; for (let i = 0; i < 20; i++) { vmax = Math.max(vmax, st().drive.v); await w(100); } out.fwd.vmax = vmax;
    // ciało przypięte przy tylnej osi
    const b = DR.bodyPos(st().drive), pb = P.playerBody.position; out.body = { dist: Math.hypot(pb.x - b.x, pb.z - b.z), y: pb.y };
    // 3) skręt w prawo zmniejsza yaw, w lewo zwiększa; przy dużej prędkości skręt jest ograniczony
    G.debugDriveInput(0, 0, 0); await until(() => st().drive.v < 3, 20000); G.debugDriveInput(1, 0, 1); const y0 = st().drive.yaw; await w(2500); const y1 = st().drive.yaw; G.debugDriveInput(1, 0, -1); await w(5000); const y2 = st().drive.yaw;
    let dr = y1 - y0; dr = Math.atan2(Math.sin(dr), Math.cos(dr)); let dl = y2 - y1; dl = Math.atan2(Math.sin(dl), Math.cos(dl)); out.steer = { right: dr, left: dl };
    // 4) broń schowana za kierownicą: spust nie strzela
    const ammo = S.gunS.me.ammo; E.L.onTrigger(1); out.gunKept = S.gunS.me.ammo === ammo;
    // 5) czołowe uderzenie w budynek z pełnym gazem: auto nigdy nie wjeżdża w bryłę, hamuje samo (bez twardego uderzenia)
    const bd = S.boxes.find(q => q.x1 - q.x0 > 8 && q.z1 - q.z0 > 8 && q.y1 > 6 && q.x0 > -60 && q.x1 < 60), zm = (bd.z0 + bd.z1) / 2; const bumps0 = st().bumps;
    G.debugCarTo(bd.x0 - 22, zm, Math.PI / 2); G.debugDriveInput(1, 0, 0); let inside = 0, minGap = 99, maxV = 0; const wd = G.debugDriveWorld();
    for (let i = 0; i < 70; i++) { await w(100); const c = st().drive; maxV = Math.max(maxV, c.v); for (const ci of DR.circles(c)) for (const q of wd.boxes) { const dx = ci.x - Math.min(q.x1, Math.max(q.x0, ci.x)), dz = ci.z - Math.min(q.z1, Math.max(q.z0, ci.z)), dist = Math.hypot(dx, dz); minGap = Math.min(minGap, dist - ci.r); if (dist < ci.r - 0.05) inside++; } }
    out.wall = { inside, minGap, maxV, bumps: st().bumps - bumps0, v: st().drive.v, x: st().drive.x, wall: bd.x0 };
    // 6) wysiadanie: auto zostaje tam, gdzie jest; po szynach z tego miejsca nie pojedzie
    G.debugDriveInput(0, 0, 0); G.debugDriveExit(true); await w(700); G.debugDriveExit(false); out.exit = st(); const carNow = out.exit.free.find(f => f[0] === 'bank');
    const before = JSON.stringify(S.fleet); await G.debugDriveAs('me', 'bank', 'pier', { x: carNow[1], z: carNow[2] }); out.railBlocked = JSON.stringify(S.fleet) === before;
    // 7) wejście z powrotem (auto porzucone w tym miejscu), potrącenie przechodnia z przodu: pada i leży w kałuży
    const cp = st().free.find(f => f[0] === 'bank'); const pose = { x: cp[1], z: cp[2] }; const car = S.vehs.cars.find(c => c.id === 'bank'), fp = car.free.pose, dd = DR.doorPoint(fp);
    P.setPlayerPosition(dd.x + 0.4, 1.1, dd.z); await w(500); await G.debugGtaTouch(() => [[dd.x, 1.0, dd.z]]); await w(1500); await G.debugGtaTouch(() => []); out.again = st().driving;
    G.debugCarTo(pp.x, pp.z, pp.yaw); const f = DR.forward(pp.yaw); G.debugAddPed(pp.x + f.x * 9, pp.z + f.z * 9); const ranBefore = st().ranOver; G.debugDriveInput(1, 0, 0); await until(() => st().ranOver > ranBefore, 45000); G.debugDriveInput(0, 0, 0);
    out.run = { ran: st().ranOver - ranBefore, corpses: G.debugCorpses().ids, car: st().drive, ped: [pp.x + f.x * 9, pp.z + f.z * 9], fixed: G.debugLife().fixed, pp: [pp.x, pp.z, pp.yaw] };
    // 8) porzucone auto wraca na parking po 45 s bez kierowcy, gdy gracz jest daleko
    G.debugDriveExit(true); await w(700); G.debugDriveExit(false); G.debugCarIdle('bank', 44.9); P.setPlayerPosition(60, 1.2, 0); await w(2500);
    out.back = { free: st().free.map(f => f[0]), pos: S.vehs.cars.find(c => c.id === 'bank').m.position.toArray().map(v => +v.toFixed(1)), parked: [+pp.x.toFixed(1), 0, +pp.z.toFixed(1)] };
    G.debugDriveInput(null);
    return out;
});
ok('a hand on the driver door steals the car (alarm adds heat) and puts the player behind the wheel', R.start.driving && R.start.drive.car === 'bank' && R.heat >= 25, [R.start, R.heat]);
ok('gas accelerates forward to at most 7 m/s (the VR comfort speed)', R.fwd.d > 3 && R.fwd.vmax > 3 && R.fwd.vmax <= 7.01, R.fwd);
ok('the body stands next to the rear axle of the moving car (pinned), at bed height', R.body.dist < 0.35 && R.body.y > 1.5, R.body);
ok('steering right turns the heading clockwise (yaw down), steering left turns it back (yaw up)', R.steer.right < -0.02 && R.steer.left > 0.02, R.steer);
ok('the gun is put away behind the wheel (the trigger does not fire)', R.gunKept);
ok('a head-on drive into a building at full throttle never puts the car inside it and brakes by itself (no hard bump)', R.wall.inside === 0 && R.wall.minGap > -0.06 && R.wall.bumps === 0 && R.wall.maxV <= 7.01 && R.wall.v < 1, R.wall);
ok('getting out leaves the car where it stands and a rail ride from that spot is refused', R.exit && !R.exit.driving && !!R.exit.free.find(f => f[0] === 'bank') && R.railBlocked, [R.exit, R.railBlocked]);
ok('the abandoned car can be entered again and running over a pedestrian drops it (corpse of kind ped)', R.again && R.run.ran >= 1 && R.run.corpses.some(i => /^ped/.test(i)), [R.again, R.run]);
ok('an abandoned car returns to its parking place after 45 s without a driver when the player is far away', !R.back.free.includes('bank') && Math.abs(R.back.pos[0] - R.back.parked[0]) < 0.2 && Math.abs(R.back.pos[2] - R.back.parked[2]) < 0.2, R.back);
ok('no page errors', errors.length === 0, errors);
await browser.close(); server.close();
if (fails) { console.log(fails + ' check(s) failed'); process.exit(1); } console.log('drive: all checks passed');
