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
const NW = await ev(async () => { try {
    const N = await import('./core/network.js'), G = await import('./levels/scarygta.js'), P = await import('./core/player.js'), VL = await import('./core/vehiclelogic.js'), DR = await import('./core/drivelogic.js');
    const S = G.testState(), w = (ms) => new Promise(r => setTimeout(r, ms)), out = {}, free = (id) => (G.debugDrive().free.find(f => f[0] === id) || [id, NaN, NaN, 'MISSING', false, NaN, NaN]), fd = () => { const m = G.debugOutbox().filter(q => q.k === 'st').pop(); return m ? m.fd : null; };
    for (let i = 0; i < 300 && S.busted >= 0; i++) await w(100);
    G.debugDriveExit(true); await w(600); G.debugDriveExit(false); G.debugDriveInput(null); S.sim.reset(); S.sim.heats = {}; G.debugHeat(0);
    N.NET.mode = 'host'; P.setPlayerPosition(60, 1.2, 0);
    const pp = VL.parkedPose('casino'), door = DR.doorPoint(pp), f = DR.forward(pp.yaw);
    const head = (x, z) => { N.playersState['g1'] = { lvl: 'scarygta', head: { p: [x, 1.6, z] }, h1: { p: [0, 0, 0] }, h2: { p: [0, 0, 0] }, profile: { name: 'Bob' } }; };
    head(door.x + 0.4, door.z); await w(600);
    // 1) gość prosi o kradzież; host zapisuje go jako kierowcę (alarm tylko dla gościa); drugi gość nie może zająć tego samego auta
    G.debugNet({ k: 'ev', kind: 'drive', car: 'casino', route: 'drive' }, 'g1'); out.req = free('casino'); out.heat = S.sim.heatOf('g1').v;
    G.debugNet({ k: 'ev', kind: 'drive', car: 'casino', route: 'drive' }, 'g2'); out.second = free('casino');
    G.debugNet({ k: 'ev', kind: 'drive', car: 'nope', route: 'drive' }, 'g1'); G.debugNet({ k: 'ev', kind: 'drive', car: 'bank', route: 'nope' }, 'g1');
    // 2) poza od kierowcy: mały ruch przyjęty (cel auta się przesuwa); teleport zwalnia kierowcę (głowa daleko od zadeklarowanej pozy), a poza w budynku (z głową przy niej), zła nazwa auta, obcy nadawca i śmieci są odrzucone
    const pose = (x, z, v, car) => ({ k: 'drv', car: car || 'casino', x, z, yaw: pp.yaw, v }), tgt = () => { const c = free('casino'); return c ? [c[5], c[6]] : null; }, moved = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
    await w(300); head(door.x + 1.0 + f.x * 0.5, door.z + f.z * 0.5); const t0 = tgt(); G.debugNet(pose(pp.x + f.x * 0.6, pp.z + f.z * 0.6, 3), 'g1'); const t1 = tgt(); out.ok1 = moved(t0, t1);
    await w(300); G.debugNet(pose(pp.x + 40, pp.z, 3), 'g1'); out.teleport = { driver: free('casino')[3], moved: moved(t1, tgt()) };
    const reenter = async () => { const q = tgt(), dp = DR.doorPoint({ x: q[0], z: q[1], yaw: pp.yaw }); head(dp.x + 0.4, dp.z); await w(300); G.debugNet({ k: 'ev', kind: 'drive', car: 'casino', route: 'drive' }, 'g1'); return free('casino')[3]; };
    out.reenter = await reenter(); const bd = S.boxes.find(q => q.x1 - q.x0 > 8 && q.z1 - q.z0 > 8 && q.y1 > 6 && q.x0 > -60 && q.x1 < 60), cx = (bd.x0 + bd.x1) / 2, cz = (bd.z0 + bd.z1) / 2, t2 = tgt();
    await w(300); head(cx, cz); G.debugNet(pose(cx, cz, 3), 'g1'); out.wall = { moved: moved(t2, tgt()), driver: free('casino')[3] };
    const q2 = tgt(), dq = DR.doorPoint({ x: q2[0], z: q2[1], yaw: pp.yaw }); head(dq.x + 0.4, dq.z); await w(300);
    const ff = { x: q2[0] + f.x * 0.5, z: q2[1] + f.z * 0.5 }; G.debugNet(pose(ff.x, ff.z, 3, 'bank'), 'g1'); G.debugNet(pose(ff.x, ff.z, 3), 'ghost'); G.debugNet({ k: 'drv', car: 'casino', x: NaN, z: 0, yaw: 0, v: 0 }, 'g1'); G.debugNet({ k: 'drv', car: 'casino', x: 0, z: 0, yaw: 'a', v: 0 }, 'g1'); G.debugNet({ k: 'drv', car: 'casino', x: ff.x, z: ff.z, yaw: 0, v: 'x' }, 'g1');
    out.bad = { moved: moved(t2, tgt()), driver: free('casino')[3] }; await w(300); G.debugNet(pose(ff.x, ff.z, 3), 'g1'); out.ok2 = moved(t2, tgt());
    // 3) migawka hosta niesie swobodne auto z kierowcą i pozą
    await w(400); out.snap = fd();
    // 4) policja: jadący gość (szybciej niż 2 m/s) jest jadącym, stojący nie
    out.speed = S.vehs.freeSpeedOf('g1');
    // 5) głowa gościa daleko od auta: host zwalnia kierowcę (auto zostaje porzucone w ostatniej pozie)
    head(door.x + 30, door.z); await w(200); G.debugNet(pose(pp.x + f.x * 1.4, pp.z + f.z * 1.4, 3), 'g1'); out.far = free('casino');
    // 6) ponowne wejście i wysiadka gościa: auto zostaje, migawka niesie je bez kierowcy
    head(door.x + 0.6 + f.x * 0.5, door.z + f.z * 0.5); await w(300); G.debugNet({ k: 'ev', kind: 'drive', car: 'casino', route: 'drive' }, 'g1'); out.again = free('casino'); G.debugNet({ k: 'ev', kind: 'dismount' }, 'g1'); out.out = free('casino'); await w(500); out.snap2 = fd();
    // 7) rozłączony gość: auto nie ma już kierowcy
    G.debugNet({ k: 'ev', kind: 'drive', car: 'casino', route: 'drive' }, 'g1'); out.again2 = free('casino')[3]; delete N.playersState['g1']; await w(600); out.gone = free('casino')[3];
    // 8) strona gościa (z żywym hostem: stan hosta i regularne migawki `st`): cudze auto interpoluje, wpis z MOIM kierowcą zaczyna jazdę, brak wpisu ją kończy; śmieci w migawce są ignorowane, a po wysiadce krótkie okno nie pozwala wsiąść od starej migawki
    N.NET.mode = 'guest'; N.playersState[N.GAME_PREFIX + N.NET.code] = { lvl: 'scarygta', head: { p: [0, 1.6, 0] } }; const me = N.myId(), pb = VL.parkedPose('bank'); S.fdSeen = 0; S.fdIgnoreUntil = 0;
    let cur = []; const hb = setInterval(() => G.debugNet({ k: 'st', cops: [], bags: [], heats: {}, hp: {}, fd: cur }, 'host'), 250);
    cur = [['casino', 'hostid', pb.x + 5, pb.z + 5, 1, 3]]; await w(700); out.other = free('casino');
    cur = [['evil', 'x', 0, 0, 0, 0], ['casino', 'hostid', NaN, 0, 0, 0], 'junk', null, ['casino', 'hostid', pb.x + 6, pb.z + 6, 1, 3]]; await w(700); out.junk = { casino: free('casino'), evil: free('evil')[3] };
    cur = [['bank', me, pb.x, pb.z, pb.yaw, 0]]; await w(900); out.mine = G.debugDrive().driving; G.debugDriveInput(1, 0, 0); await w(2500); out.poses = G.debugOutbox().filter(q => q.k === 'drv');
    cur = []; for (let i = 0; i < 80 && G.debugDrive().driving; i++) await w(100); out.dropped = !G.debugDrive().driving; out.dismountSent = G.debugOutbox().some(q => q.k === 'ev' && q.kind === 'dismount');
    cur = [['bank', me, pb.x, pb.z, pb.yaw, 0]]; await w(700); out.noRebegin = G.debugDrive().driving; clearInterval(hb);
    G.debugDriveInput(null); N.NET.mode = 'host'; return out;
} catch (e) { return { err: String(e.stack).slice(0, 600) }; } });
if (NW.err) { console.log(NW.err); process.exit(1); }
ok('a guest request steals the car for that guest only (alarm heat for the guest), a second guest, an unknown car and an unknown route are refused', NW.req && NW.req[3] === 'g1' && NW.req[4] === true && NW.heat >= 25 && NW.second[3] === 'g1', [NW.req, NW.heat, NW.second]);
ok('the host takes poses only from the driver of that car: a small move is accepted (the car target moves), a forged teleport drops the driver, a pose inside a building, a wrong car, a foreign sender and garbage are not accepted', NW.ok1 > 0.3 && NW.teleport.driver === null && NW.teleport.moved < 0.01 && NW.reenter === 'g1' && NW.wall.moved < 0.01 && NW.wall.driver === 'g1' && NW.bad.moved < 0.01 && NW.bad.driver === 'g1' && NW.ok2 > 0.2, [NW.ok1, NW.teleport, NW.reenter, NW.wall, NW.bad, NW.ok2]);
ok('the snapshot carries the free car with its driver and pose, and a moving guest driver counts as riding (cops cannot touch-catch him)', NW.snap && NW.snap.some(e => e[0] === 'casino' && e[1] === 'g1' && Number.isFinite(e[2]) && Number.isFinite(e[3])) && NW.speed > 2, [NW.snap, NW.speed]);
ok('a driver whose head is far from the car is released (the car stays where it was); a getting-out guest leaves the car, listed without a driver; a disconnected driver loses the car', NW.far[3] === null && NW.out[3] === null && NW.snap2.some(e => e[0] === 'casino' && e[1] === null) && NW.again[3] === 'g1' && NW.again2 === 'g1' && NW.gone === null, [NW.far, NW.out, NW.snap2, NW.again, NW.gone]);
ok('the guest side interpolates another driver car, drops a garbage entry but keeps the valid one, starts driving when the host names it the driver (sending poses at about 8 Hz), and gets out when the host stops naming it (telling the host)', NW.other && NW.other[3] === 'hostid' && NW.junk.casino[3] === 'hostid' && Math.abs(NW.junk.casino[5] - NW.other[5]) > 0.5 && NW.junk.evil === 'MISSING' && NW.mine === true && NW.poses.length >= 4 && NW.poses.every(m => Number.isFinite(m.x) && Number.isFinite(m.z) && Number.isFinite(m.yaw) && m.car === 'bank') && NW.dropped === true && NW.dismountSent, [NW.other, NW.junk, NW.mine, NW.poses.length, NW.dropped, NW.dismountSent]);
ok('after getting out the guest does not start driving again from a stale snapshot (short ignore window)', NW.noRebegin === false, NW.noRebegin);
ok('no page errors', errors.length === 0, errors);
await browser.close(); server.close();
if (fails) { console.log(fails + ' check(s) failed'); process.exit(1); } console.log('drive: all checks passed');
