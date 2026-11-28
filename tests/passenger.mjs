// Test w przeglądarce: pasażer w aucie w Scary GTA (host jako pasażer w aucie gościa-kierowcy z kontrolą gładkości prędkości ciała, gość jako pasażer w aucie hosta: odmowy i miejsca, sprzątanie przy wysiadce i końcu jazdy kierowcy, ścieżka gościa z migawek hosta). Użycie: CHROMIUM_PATH=... node passenger.mjs
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

const R = await ev(async () => { try {
    const G = await import('./levels/scarygta.js'), P = await import('./core/player.js'), VL = await import('./core/vehiclelogic.js'), DR = await import('./core/drivelogic.js'), N = await import('./core/network.js');
    const S = G.testState(), w = (ms) => new Promise(r => setTimeout(r, ms)), st = () => G.debugDrive(), out = {};
    const calm = () => { S.sim.reset(); S.sim.heats = {}; };
    for (let i = 0; i < 300 && S.busted >= 0; i++) await w(100);
    calm(); G.debugHeat(0); G.debugBlocks && G.debugBlocks([]); N.NET.mode = 'host'; S.mode = 'ffa';
    const head = (id, x, z) => { N.playersState[id] = { lvl: 'scarygta', head: { p: [x, 1.6, z] }, h1: { p: [0, 0, 0] }, h2: { p: [0, 0, 0] }, profile: { name: id } }; };
    const free = (id) => (G.debugDrive().free.find(f => f[0] === id) || null), pass = (id) => { const p = G.debugDrive().pass.find(f => f[0] === id); return p ? p[1] : []; };
    // ---- A) ja (host) jako pasażer w hauler'ze gościa g1 ----
    const hp = VL.parkedPose('hauler'), q = DR.specOf('hauler'), door = DR.doorPoint(hp, q);
    P.setPlayerPosition(60, 1.2, 0); head('g1', door.x + 0.4, door.z); await w(500);
    G.debugNet({ k: 'ev', kind: 'drive', car: 'hauler', route: 'drive' }, 'g1'); calm(); out.driver = free('hauler') && free('hauler')[3];
    let pose = { x: hp.x, z: hp.z, yaw: hp.yaw, v: 0 }; const send = () => { G.debugNet({ k: 'drv', car: 'hauler', x: pose.x, z: pose.z, yaw: pose.yaw, v: pose.v }, 'g1'); const b = DR.bodyPos(pose, q); head('g1', b.x, b.z); };
    const hb = setInterval(() => { pose = { x: pose.x + Math.sin(pose.yaw) * pose.v * 0.125, z: pose.z + Math.cos(pose.yaw) * pose.v * 0.125, yaw: pose.yaw, v: pose.v }; send(); calm(); }, 125);
    await w(800); const seat = DR.seatPos(pose, q, 0); P.setPlayerPosition(seat.x + 0.3, 1.1, seat.z); await w(600);
    await G.debugGtaTouch(() => [[seat.x, 1.1, seat.z]]); await w(1500); await G.debugGtaTouch(() => []);
    out.boarded = { passing: st().passing, pass: pass('hauler') };
    pose.v = 5; await w(1200); const samples = []; const t0 = performance.now(); let lv = null, lt = 0, maxA = 0, maxDist = 0;
    while (performance.now() - t0 < 3500) { await new Promise(r => requestAnimationFrame(r)); const v = P.playerBody.velocity, t = performance.now(), cs = free('hauler'); const pi = st().passing; if (lv && t > lt) maxA = Math.max(maxA, Math.hypot(v.x - lv.x, v.z - lv.z) / ((t - lt) / 1000)); lv = { x: v.x, z: v.z }; lt = t; if (pi && cs) { const sp = DR.seatPos({ x: cs[1], z: cs[2], yaw: pose.yaw }, q, 0); maxDist = Math.max(maxDist, Math.hypot(pi.x - pose.x - 0, 0) * 0); } }
    const pi = st().passing, pb = P.playerBody.position; out.ride = { maxA, y: pb.y, deck: q.DECK, near: pi ? Math.hypot(pb.x - (pose.x - Math.sin(pose.yaw) * 2.4 + Math.cos(pose.yaw) * -0.55), pb.z - (pose.z - Math.cos(pose.yaw) * 2.4 - Math.sin(pose.yaw) * -0.55)) : -1, speed: Math.hypot(P.playerBody.velocity.x, P.playerBody.velocity.z) };
    // wysiadam sam (X): ciało na ziemi, miejsce zwolnione
    pose.v = 0; await w(1500); G.debugDriveExit(true); await w(700); G.debugDriveExit(false); out.exitSelf = { passing: st().passing, pass: pass('hauler'), y: P.playerBody.position.y };
    // wsiadam ponownie, a kierowca wysiada: jazda się kończy
    await G.debugGtaTouch(() => [[DR.seatPos(pose, q, 0).x, 1.1, DR.seatPos(pose, q, 0).z]]); await w(1500); await G.debugGtaTouch(() => []); const again = st().passing;
    G.debugNet({ k: 'ev', kind: 'dismount' }, 'g1'); await w(800); out.driverLeft = { again: !!again, passing: st().passing, pass: pass('hauler'), driver: free('hauler') && free('hauler')[3] }; clearInterval(hb); delete N.playersState['g1'];
    // ---- B) gość g2 jako pasażer w MOIM aucie (pickup bank) ----
    const bp = VL.parkedPose('bank'), bq = DR.specOf('pickup'), bdoor = DR.doorPoint(bp, bq); calm(); P.setPlayerPosition(bdoor.x + 0.4, 1.1, bdoor.z); await w(500);
    await G.debugGtaTouch(() => [[bdoor.x, 1.0, bdoor.z]]); await w(1500); await G.debugGtaTouch(() => []); calm(); out.myCar = st().driving;
    const bs = () => DR.seatPos(st().drive, bq, 0), board = (id, x, z) => { head(id, x, z); G.debugNet({ k: 'ev', kind: 'board', car: 'bank' }, id); return pass('bank'); };
    G.debugDriveInput(1, 0, 0); await w(2200); out.fastRefuse = board('g2', bs().x + 0.3, bs().z); G.debugDriveInput(0, 0, 0);
    for (let i = 0; i < 100 && Math.abs(st().drive.v) > 1.5; i++) { G.debugDriveInput(0, 1, 0); calm(); await w(100); } G.debugDriveInput(0, 0, 0); await w(300);
    out.farRefuse = board('g2', bs().x + 30, bs().z); out.ok = board('g2', bs().x + 0.4, bs().z); out.second = board('g3', bs().x + 0.4, bs().z); out.unknown = (G.debugNet({ k: 'ev', kind: 'board', car: 'evil' }, 'g2'), pass('bank'));
    const fd = G.debugOutbox().filter(q => q.k === 'st').pop(); calm(); await w(400); const fd2 = G.debugOutbox().filter(q => q.k === 'st').pop(); out.snap = (fd2 && fd2.fd || []).find(e => e[0] === 'bank') || null;
    out.speedRiding = G.debugRiding ? G.debugRiding('g2') : null;
    G.debugNet({ k: 'ev', kind: 'dismount' }, 'g2'); await w(300); out.leave = pass('bank');
    board('g2', bs().x + 0.4, bs().z); const had = pass('bank')[0]; G.debugDriveExit(true); await w(700); G.debugDriveExit(false); out.driverExit = { had, after: pass('bank') };
    delete N.playersState['g2']; delete N.playersState['g3'];
    // ---- C) strona gościa: migawka z moim id na liście pasażerów ----
    for (let i = 0; i < 300 && S.busted >= 0; i++) await w(100); calm();
    N.NET.mode = 'guest'; N.playersState[N.GAME_PREFIX + N.NET.code] = { lvl: 'scarygta', head: { p: [0, 1.6, 0] } }; const me = N.myId(), hp2 = VL.parkedPose('hauler'); S.fdSeen = 0; S.fdIgnoreUntil = 0;
    let cur = []; const hb2 = setInterval(() => G.debugNet({ k: 'st', cops: [], bags: [], heats: {}, hp: {}, fd: cur }, 'host'), 250);
    cur = [['hauler', 'hostid', hp2.x, hp2.z, hp2.yaw, 0, [null, 'other']]]; await w(900); out.gOther = { passing: st().passing, pass: pass('hauler') };
    cur = [['hauler', 'hostid', hp2.x, hp2.z, hp2.yaw, 0, [me, null]]]; await w(1200); out.gMine = { passing: st().passing, pass: pass('hauler') };
    cur = [['hauler', 'hostid', hp2.x, hp2.z, hp2.yaw, 0, [null, null]]]; await w(900); out.gGone = { passing: st().passing, dismountSent: G.debugOutbox().some(q => q.k === 'ev' && q.kind === 'dismount') };
    cur = [['hauler', 'hostid', hp2.x, hp2.z, hp2.yaw, 0, [me, null]]]; await w(900); const reb = st().passing; G.debugDriveExit(true); await w(700); G.debugDriveExit(false); out.gSelf = { re: !!reb, passing: st().passing, sent: G.debugOutbox().filter(q => q.k === 'ev' && q.kind === 'dismount').length };
    cur = [['hauler', 'hostid', hp2.x, hp2.z, hp2.yaw, 0, [me, null]]]; await w(700); out.gNoRebegin = st().passing; clearInterval(hb2); N.NET.mode = 'host'; G.debugDriveInput(null);
    return out;
} catch (e) { return { err: String(e.stack).slice(0, 700) }; } });
if (R.err) { console.log(R.err); process.exit(1); }
ok('a guest steals the hauler, I touch the seat and board: my seat is listed, I am on the deck', R.driver === 'g1' && R.boarded.passing && R.boarded.passing.car === 'hauler' && R.boarded.pass[0] === 'me', R.boarded);
ok('riding in the guest car my body stays on the seat at the deck height and my velocity never jumps (no 8 Hz sawtooth: the largest change under 6 m/s^2)', R.ride.near >= 0 && R.ride.near < 0.9 && Math.abs(R.ride.y - (R.ride.deck + 1.0)) < 0.2 && R.ride.maxA < 6 && R.ride.speed > 3, R.ride);
ok('getting off (X) puts me on the ground and frees the seat; when the driver gets out, the passenger is removed too', R.exitSelf.passing === null && R.exitSelf.pass.every(q => !q) && R.exitSelf.y < 1.6 && R.driverLeft.again && R.driverLeft.passing === null && R.driverLeft.pass.every(q => !q) && R.driverLeft.driver === null, [R.exitSelf, R.driverLeft]);
ok('in my pickup the host refuses a boarding at speed, from far away, an unknown car, takes a close guest in the one seat and refuses the second guest', R.myCar && R.fastRefuse.every(q => !q) && R.farRefuse.every(q => !q) && R.ok[0] === 'g2' && R.second[0] === 'g2' && R.second.length === 1 && R.unknown[0] === 'g2', R);
ok('the snapshot carries the passenger list of the car, the passenger leaves with a dismount event, and the seats empty when the driver exits', R.snap && Array.isArray(R.snap[6]) && R.snap[6][0] === 'g2' && R.leave.every(q => !q) && R.driverExit.had === 'g2' && R.driverExit.after.every(q => !q), [R.snap, R.leave, R.driverExit]);
ok('guest side: others on the list do not move me, my id on the list puts me on the car, an empty list takes me off, a self dismount notifies the host once and a stale snapshot does not board me again', !R.gOther.passing && R.gMine.passing && R.gMine.passing.car === 'hauler' && !R.gGone.passing && R.gSelf.re && !R.gSelf.passing && R.gSelf.sent >= 1 && !R.gNoRebegin, [R.gOther, R.gMine, R.gGone, R.gSelf, R.gNoRebegin]);
ok('no page errors', errors.length === 0, errors);
await browser.close(); server.close();
if (fails) { console.log(fails + ' check(s) failed'); process.exit(1); } console.log('passenger: all checks passed');
