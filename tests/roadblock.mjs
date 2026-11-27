// Test w przeglądarce: Scary GTA: barykady (stop pickupa przed barykadą, odmowa startu, ścieżka hosta i gościa, siatka, sprzątanie). Użycie: CHROMIUM_PATH=... node roadblock.mjs
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
const w = (ms) => page.waitForTimeout(ms);
await ev(async () => { (await import('./levels/scarygta.js')).debugGtaNight('calm', 1e9); });
// ----- solo: barykada na trasie -> auto staje przed nią, gracz zostaje na ulicy, auto się zwalnia -----
const solo = await ev(async () => {
    const G = await import('./levels/scarygta.js'), P = await import('./core/player.js'), VL = await import('./core/vehiclelogic.js'), RB = await import('./core/gtaroadblock.js'), w = (ms) => new Promise(r => setTimeout(r, ms));
    const S = G.testState(); S.sim.reset(); for (let i = 0; i < 600 && S.busted >= 0; i++) await w(100);
    const node = RB.candidates().find(i => RB.rideBlock('bank', 'pier', [i]).kind === 'stop'), np = RB.nodePos(node), sp = VL.startPoint('bank');
    const before = G.debugBlocks(null); const set = G.debugBlocks([node]); await w(300); const fxOn = G.debugBlocks(null).fx;
    P.setPlayerPosition(sp.x + 3, 1.2, sp.z + 1.5); await w(400); G.debugDriveAs('me', 'bank', 'pier', { x: sp.x + 3, z: sp.z + 1.5 });
    const f = S.fleet.find(c => c.id === 'bank'), R = VL.rideFor(f), plain = VL.buildRide('bank', 'pier');
    for (let i = 0; i < 40 && !G.debugVeh().v.riding; i++) await w(100); const riding = G.debugVeh().v.riding;
    f.t0 = S.clock - (R.T - 1); for (let i = 0; i < 80 && G.debugVeh().v.riding; i++) await w(100); await w(400);
    const b = P.playerBody.position, carPos = G.debugVeh().v.cars.find(c => c[0] === 'bank');
    const gap = Math.hypot(b.x - np.x, b.z - np.z), carGap = Math.hypot(carPos[1] - np.x, carPos[2] - np.z);
    for (let i = 0; i < 80 && S.fleet.find(c => c.id === 'bank').occ; i++) await w(150);
    return { noneBefore: before.nodes.length === 0, set: set.nodes.length, fxOn, stop: f.stop, rideLen: +R.len.toFixed(1), plainLen: +plain.len.toFixed(1), riding, gap: +gap.toFixed(1), carGap: +carGap.toFixed(1), stillRiding: G.debugVeh().v.riding, freed: !S.fleet.find(c => c.id === 'bank').occ, stopAfter: S.fleet.find(c => c.id === 'bank').stop, busted: S.busted };
});
ok('a barricade appears as ONE instanced mesh, the pickup ride is cut short (stop set, shorter than the ordinary route) and ends with the player standing on the street 5-20 m before the barricade (not in it)', solo.noneBefore && solo.set === 1 && solo.fxOn.count === 1 && solo.fxOn.visible && solo.stop > 0 && solo.rideLen < solo.plainLen - 10 && solo.riding && !solo.stillRiding && solo.gap > 5 && solo.gap < 20 && solo.carGap > 5, solo);
ok('after the ride the car is freed and its stop is cleared, and the player was not busted', solo.freed && solo.stopAfter === 0 && solo.busted < 0, solo);
// ----- barykada tuż przy starcie: host odmawia -----
const blocked = await ev(async () => {
    const G = await import('./levels/scarygta.js'), P = await import('./core/player.js'), VL = await import('./core/vehiclelogic.js'), RB = await import('./core/gtaroadblock.js'), w = (ms) => new Promise(r => setTimeout(r, ms));
    const S = G.testState(); S.fleet = VL.newFleet(); let node = -1, car = '', route = '';
    for (const v of VL.VEHICLES) for (const r of v.routes) for (const i of RB.candidates()) if (node < 0 && RB.rideBlock(v.id, r.id, [i]).kind === 'blocked') { node = i; car = v.id; route = r.id; }
    G.debugBlocks([node]); const sp = VL.startPoint(car); P.setPlayerPosition(sp.x + 3, 1.2, sp.z + 1.5); await w(300);
    G.debugDriveAs('me', car, route, { x: sp.x + 3, z: sp.z + 1.5 }); const occ = S.fleet.find(c => c.id === car).occ;
    G.debugBlocks([]); await w(100); G.debugDriveAs('me', car, route, { x: sp.x + 3, z: sp.z + 1.5 }); const occ2 = S.fleet.find(c => c.id === car).occ;
    G.debugDismount(); await w(300); return { node, car, route, occ, occ2 };
});
ok('a barricade right at the start refuses the drive (nobody boards), and the same drive works once the barricade is gone', blocked.node >= 0 && blocked.occ === null && blocked.occ2 === 'me', blocked);
// ----- 5 gwiazdek stawia barykady (host), a 20 s bez gwiazdek je zdejmuje -----
const stars = await ev(async () => {
    const G = await import('./levels/scarygta.js'), P = await import('./core/player.js'), w = (ms) => new Promise(r => setTimeout(r, ms));
    const S = G.testState(); G.debugBlocks([]); S.sim.reset(); P.setPlayerPosition(0, 1.2, -20); await w(400); S.sim.heats.me = { v: 99, seenT: 0 };
    let n = 0; for (let i = 0; i < 40 && n < 1; i++) { await w(150); S.sim.heats.me = { v: 99, seenT: 0 }; n = G.debugBlocks(null).nodes.length; }
    const placed = G.debugBlocks(null).nodes.length;
    S.sim.heats.me = { v: 0, seenT: -99 }; S.blocks.quiet = 19.8; S.sim.heats.me = { v: 0, seenT: -99 };
    for (let i = 0; i < 30 && G.debugBlocks(null).nodes.length; i++) await w(150);
    return { placed, after: G.debugBlocks(null).nodes.length };
});
ok('at 3+ stars the host puts a barricade on the street, and without stars it is removed after the quiet time', stars.placed >= 1 && stars.after === 0, stars);
// ----- gość: migawka z barykadą i stopem; śmieci są ignorowane -----
const guest = await ev(async () => {
    const N = await import('./core/network.js'), G = await import('./levels/scarygta.js'), P = await import('./core/player.js'), VL = await import('./core/vehiclelogic.js'), RB = await import('./core/gtaroadblock.js'), w = (ms) => new Promise(r => setTimeout(r, ms)), me = N.myId();
    const S = G.testState(); N.NET.mode = 'guest'; N.playersState[N.GAME_PREFIX + N.NET.code] = { lvl: 'scarygta', head: { p: [0, 1.6, 0] } };
    const st = (m) => G.debugNet(Object.assign({ k: 'st', cops: [], bags: [], heats: {} }, m), 'host');
    const node = RB.candidates().find(i => RB.rideBlock('motel', 'north', [i]).kind === 'stop'), stop = RB.rideBlock('motel', 'north', [node]).stop;
    st({ rb: [node, 1.5, 'x', -4, 99999, node], veh: [] }); await w(300); const fx = G.debugBlocks(null);
    st({ rb: [node], veh: [['motel', 'north', 3, me, stop]] }); for (let i = 0; i < 30 && !G.debugVeh().v.riding; i++) await w(100);
    const ent = S.fleet.find(c => c.id === 'motel'), on = G.debugVeh().v.riding, R = VL.rideFor(ent);
    st({ rb: [node], veh: [['motel', 'north', 3, me, 'junk']] }); await w(300); const R2 = VL.rideFor(S.fleet.find(c => c.id === 'motel'));
    const node2 = RB.candidates().find(i => i !== node); st({ rb: [node, node2], veh: [] }); let said = ''; for (let i = 0; i < 40 && !/Roadblock/i.test(said); i++) { await w(100); said = (S.radioText && S.radioText.t) || ''; }
    st({ rb: 'zzz', veh: [] }); await w(400); const cleared = G.debugBlocks(null).nodes.length;
    N.NET.mode = 'solo'; return { said, nodes: fx.nodes, fxCount: fx.fx.count, on, stopped: ent.stop === stop && R.stop === stop, R2stop: R2.stop, plain: VL.buildRide('motel', 'north').len, len: R.len, cleared };
});
ok('guest: the host snapshot brings the barricade (garbage and duplicates dropped) and a ride with the stop, a forged stop gives the ordinary ride, and a bad list removes the barricades', guest.nodes.length === 1 && guest.fxCount === 1 && guest.on && guest.stopped && guest.R2stop === 0 && guest.len < guest.plain && guest.cleared === 0, guest);
ok('guest: a NEW node in the snapshot makes the dispatcher say the roadblock line at the guest', /Roadblock/i.test(guest.said), guest.said);
ok('no page errors', errors.length === 0, errors);
console.log(fails ? 'FAILED: ' + fails : 'roadblock: all checks passed'); await browser.close(); server.close(); process.exit(fails ? 1 : 0);
