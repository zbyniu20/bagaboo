// Test w przeglądarce: Scary GTA: pojazdy na szynach (start z klamki, komfort jazdy, policja nie łapie jadącego, host i gość). Użycie: CHROMIUM_PATH=... node vehicles.mjs
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
await ev(async () => { (await import('./levels/scarygta.js')).debugGtaNight('calm', 1e9); });
const v0 = await ev(async () => { const G = await import('./levels/scarygta.js'), E = await import('./core/engine.js'), VL = await import('./core/vehiclelogic.js'); const d = G.debugVeh(); const near = VL.VEHICLES.map(v => VL.startPoint(v.id)).concat(VL.FREE_CARS.map(v => v.park)).map(s => { return E.L.obstacles.filter(o => o.box3 && o.box3.max.y < 1.6 && o.box3.max.y > 0.5 && Math.hypot((o.box3.min.x + o.box3.max.x) / 2 - s.x, (o.box3.min.z + o.box3.max.z) / 2 - s.z) < 5.5).length; }); return { cars: d.v.cars.length, expect: VL.VEHICLES.length + VL.FREE_CARS.length, free: d.fleet.every(c => !c.occ), near }; });
ok('three getaway cars and the free-only cars stand parked and free, and no parked traffic car stands within 5.5 m of them', v0.cars === v0.expect && v0.expect === 7 && v0.free && v0.near.every(n => n === 0), v0);
// ----- jazda solo: klamka -> jazda -> dojazd -----
const ride = await ev(async () => {
    const G = await import('./levels/scarygta.js'), P = await import('./core/player.js'), E = await import('./core/engine.js'), VL = await import('./core/vehiclelogic.js'), w = (ms) => new Promise(r => setTimeout(r, ms));
    const S = G.testState(); S.sim.reset(); for (let i = 0; i < 600 && S.busted >= 0; i++) await w(100);
    const sp = VL.startPoint('bank'), h = VL.handlePoints('bank')[0]; P.setPlayerPosition(sp.x + 3, 1.2, sp.z + 1.5); await w(400);
    const dir0 = E.camera.getWorldDirection(new E.THREE.Vector3()).clone(), heat0 = S.sim.heatOf('me').v;
    await G.debugGtaTouch(() => [[h.x, h.y, h.z]]); for (let i = 0; i < 40 && !G.debugVeh().v.riding; i++) await w(100); await G.debugGtaTouch(null);
    const boarded = G.debugVeh(); const heat1 = S.sim.heatOf('me').v;
    let vmax = 0, onBed = true; for (let i = 0; i < 20; i++) { await w(150); const b = P.playerBody; vmax = Math.max(vmax, Math.hypot(b.velocity.x, b.velocity.z)); if (b.position.y < 1.5) onBed = false; }
    const dir1 = E.camera.getWorldDirection(new E.THREE.Vector3()), turned = dir0.angleTo(dir1);
    return { boarded: boarded.v.riding, occ: boarded.fleet.find(c => c.id === 'bank').occ, route: boarded.fleet.find(c => c.id === 'bank').route, alarm: heat1 - heat0, vmax: +vmax.toFixed(2), onBed, turned: +turned.toFixed(3) };
});
ok('touching the handle takes the player onto the bed (alarm heat, route pier), at most 7 m/s, standing on the bed, and the view does not turn', ride.boarded && ride.occ === 'me' && ride.route === 'pier' && ride.alarm >= 25 && ride.vmax <= 7.3 && ride.onBed && ride.turned < 0.05, ride);
// cop tuż obok jadącego gracza nie łapie, ale jazda dalej się rejestruje
const cop = await ev(async () => {
    const G = await import('./levels/scarygta.js'), P = await import('./core/player.js'), w = (ms) => new Promise(r => setTimeout(r, ms));
    const S = G.testState(); const b = P.playerBody.position; G.debugSpawnCop(b.x + 0.5, b.z); S.sim.heats.me = { v: 90, seenT: 0 };
    for (let i = 0; i < 25; i++) { await w(120); const c = S.sim.activeCops()[0]; if (c) { c.bot.x = P.playerBody.position.x + 0.4; c.bot.z = P.playerBody.position.z; } }
    return { busted: S.busted, riding: G.debugVeh().v.riding, busts: S.busts };
});
ok('a cop standing right next to the rider cannot catch him while he rides', cop.busted < 0 && cop.busts === 0 && cop.riding === true, cop);
// dojazd: przewijamy start jazdy tak, by zostało ok. 1 s, i sprawdzamy ciało i zwolnienie auta
const arrive = await ev(async () => {
    const G = await import('./levels/scarygta.js'), P = await import('./core/player.js'), VL = await import('./core/vehiclelogic.js'), w = (ms) => new Promise(r => setTimeout(r, ms));
    const S = G.testState(), f = S.fleet.find(c => c.id === 'bank'), R = VL.buildRide('bank', 'pier'); f.t0 = S.clock - (R.T - 1);
    for (let i = 0; i < 80 && G.debugVeh().v.riding; i++) await w(100); await w(500);
    const end = R.pts[R.pts.length - 1], b = P.playerBody.position;
    for (let i = 0; i < 80 && S.fleet.find(c => c.id === 'bank').occ; i++) await w(150);
    return { riding: G.debugVeh().v.riding, dist: +Math.hypot(b.x - end.x, b.z - end.z).toFixed(1), y: +b.y.toFixed(1), speed: +Math.hypot(P.playerBody.velocity.x, P.playerBody.velocity.z).toFixed(2), freed: !S.fleet.find(c => c.id === 'bank').occ };
});
ok('on arrival the ride ends within a few metres of the destination, the body stands on the street and the car frees itself', !arrive.riding && arrive.dist < 4 && arrive.y < 1.6 && arrive.speed < 1 && arrive.freed, arrive);
// zejście w trakcie jazdy
const jump = await ev(async () => {
    const G = await import('./levels/scarygta.js'), P = await import('./core/player.js'), VL = await import('./core/vehiclelogic.js'), w = (ms) => new Promise(r => setTimeout(r, ms));
    const S = G.testState(), sp = VL.startPoint('motel');
    // po kroku z policjantem gracz ma 5 gwiazdek, więc host stawia barykady (jedna blokuje start motelu): czekamy na odrodzenie, zerujemy ciepło i barykady i od razu startujemy jazdę
    for (let i = 0; i < 600 && S.busted >= 0; i++) await w(100);
    S.sim.reset(); S.sim.heats.me = { v: 0, seenT: -99 }; G.debugBlocks([]); P.setPlayerPosition(sp.x + 2, 1.2, sp.z + 1); G.debugDriveAs('me', 'motel', 'warehouse', { x: sp.x + 2, z: sp.z + 1 });
    for (let i = 0; i < 40 && !G.debugVeh().v.riding; i++) await w(100); const on = G.debugVeh().v.riding; G.debugDismount(); await w(600);
    return { on, off: !G.debugVeh().v.riding, free: !S.fleet.find(c => c.id === 'motel').occ };
});
ok('jumping off ends the ride and frees the car', jump.on && jump.off && jump.free, jump);
// ----- host: fałszywi goście -----
const host = await ev(async () => {
    const N = await import('./core/network.js'), G = await import('./levels/scarygta.js'), VL = await import('./core/vehiclelogic.js'), w = (ms) => new Promise(r => setTimeout(r, ms));
    const S = G.testState(); N.NET.mode = 'host'; S.sim.reset(); S.bustUntil = {}; const sp = VL.startPoint('casino');
    const guest = (id, x, z) => { N.playersState[id] = { lvl: 'scarygta', head: { p: [x, 1.6, z] }, h1: { p: [0, 0, 0] }, h2: { p: [0, 0, 0] }, profile: { name: id } }; };
    guest('g1', sp.x + 2, sp.z + 1); guest('g2', sp.x + 2, sp.z - 1); guest('g3', 0, 70); await w(600);
    const occ = () => S.fleet.find(c => c.id === 'casino').occ;
    G.debugNet({ k: 'ev', kind: 'drive', car: 'casino', route: 'plaza' }, 'g3'); const far = occ();
    G.debugNet({ k: 'ev', kind: 'drive', car: 'nope', route: 'plaza' }, 'g1'); G.debugNet({ k: 'ev', kind: 'drive', car: 'casino', route: 'zz' }, 'g1'); const junk = occ();
    G.debugNet({ k: 'ev', kind: 'drive', car: 'casino', route: 'plaza' }, 'ghost'); const forged = occ();
    G.debugNet({ k: 'ev', kind: 'drive', car: 'casino', route: 'plaza' }, 'g1'); const first = occ(); const heat = S.sim.heatOf('g1').v;
    G.debugNet({ k: 'ev', kind: 'drive', car: 'casino', route: 'east' }, 'g2'); const second = occ();
    await w(1200); const snap = G.debugOutbox().filter(m => m.k === 'st').pop(); const veh = snap && snap.veh;
    delete N.playersState['g1']; await w(1200); const afterLeave = occ();
    N.NET.mode = 'solo'; return { far, junk, forged, first, second, heat: heat > 25, veh, afterLeave };
});
ok('host: a guest starts a drive only near the car with a known route; far, unknown, forged and second riders are refused; the snapshot lists the ride; the car frees when the rider leaves', host.far === null && host.junk === null && host.forged === null && host.first === 'g1' && host.second === 'g1' && host.heat && Array.isArray(host.veh) && host.veh.length === 1 && host.veh[0][0] === 'casino' && host.veh[0][3] === 'g1' && host.afterLeave === null, host);
// ----- gość: migawka hosta uruchamia jazdę lokalnego gracza; śmieci są ignorowane -----
const guest = await ev(async () => {
    const N = await import('./core/network.js'), G = await import('./levels/scarygta.js'), P = await import('./core/player.js'), w = (ms) => new Promise(r => setTimeout(r, ms)), me = N.myId();
    const S = G.testState(); N.NET.mode = 'guest'; N.playersState[N.GAME_PREFIX + N.NET.code] = { lvl: 'scarygta', head: { p: [0, 1.6, 0] } };
    const st = (veh) => G.debugNet({ k: 'st', cops: [], bags: [], heats: {}, veh: veh }, 'host');
    st([['evil', 'x', 3, me], ['motel', 'nope', 3, me], 'junk']); await w(400); const junk = G.debugVeh().v.riding;
    st([['motel', 'north', 3, me]]); for (let i = 0; i < 30 && !G.debugVeh().v.riding; i++) await w(100); const on = G.debugVeh().v.riding, y = P.playerBody.position.y;
    st([]); await w(800); const off = G.debugVeh().v.riding;
    N.NET.mode = 'solo'; return { junk, on, y: +y.toFixed(1), off };
});
ok('guest: the host snapshot puts the local player on the car, garbage is ignored, and an empty snapshot ends the ride', guest.junk === false && guest.on === true && guest.y > 1.5 && guest.off === false, guest);
ok('no page errors', errors.length === 0, errors);
console.log(fails ? 'FAILED: ' + fails : 'vehicles: all checks passed'); await browser.close(); server.close(); process.exit(fails ? 1 : 0);
