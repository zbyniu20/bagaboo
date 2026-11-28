// Test w przeglądarce: potrącanie graczy autem (host, fałszywy gość jako ofiara): obrażenia zależne od prędkości, odnowienie, śmierć po drugim trafieniu z wpisem w dzienniku, CO-OP bez obrażeń, ofiara w aucie pomijana. Użycie: CHROMIUM_PATH=... node runover.mjs
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
    const G = await import('./levels/scarygta.js'), P = await import('./core/player.js'), VL = await import('./core/vehiclelogic.js'), DR = await import('./core/drivelogic.js'), N = await import('./core/network.js'), RO = await import('./core/runoverlogic.js');
    const S = G.testState(), w = (ms) => new Promise(r => setTimeout(r, ms)), st = () => G.debugDrive(), out = {};
    const until = async (f, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms && !f()) { S.sim.reset(); S.sim.heats = {}; await w(100); } return f(); };
    for (let i = 0; i < 300 && S.busted >= 0; i++) await w(100);
    S.sim.reset(); S.sim.heats = {}; G.debugHeat(0); G.debugBlocks && G.debugBlocks([]);
    N.NET.mode = 'host'; S.mode = 'ffa'; const head = (x, z, y) => { N.playersState['g1'] = { lvl: 'scarygta', head: { p: [x, y || 1.6, z] }, h1: { p: [0, 0, 0] }, h2: { p: [0, 0, 0] }, profile: { name: 'Bob' } }; };
    const pp = VL.parkedPose('bank'), door = DR.doorPoint(pp); head(60, 0); P.setPlayerPosition(door.x + 0.4, 1.1, door.z); await w(500);
    await G.debugGtaTouch(() => [[door.x, 1.0, door.z]]); await w(1500); await G.debugGtaTouch(() => []); out.driving = st().driving;
    const run = async (vx, vz, y) => { head(vx, vz, y); const h0 = S.gunS.g1 ? S.gunS.g1.hp : 100; G.debugCarTo(vx, vz - 14, 0); S.roCool = {}; G.debugDriveInput(1, 0, 0); await until(() => (S.gunS.g1 && S.gunS.g1.hp < h0) || !st().drive || st().drive.z > vz + 3, 12000); G.debugDriveInput(0, 0, 0); await until(() => !st().drive || st().drive.v < 0.3, 15000); };
    const hp = () => (S.gunS.g1 ? S.gunS.g1.hp : 100);
    // 1) pierwsze trafienie: obrażenia zależne od prędkości, znacznik RUN OVER u kierowcy, wiadomość hit do gości
    await run(-38, -58); out.hit1 = { hp: hp(), hitMark: S.hitMark.text, msg: G.debugOutbox().filter(q => q.k === 'hit').pop() || null };
    // 2) odnowienie: stojące auto (v < 2.2) i ten sam gracz nie dostają kolejnych obrażeń
    const hpMid = hp(); await w(1500); out.noRepeat = hp() === hpMid;
    // 3) CO-OP: żadnych obrażeń
    S.mode = 'coop'; S.gunS.g1.hp = 100; await run(-38, -58); out.coop = hp(); S.mode = 'ffa';
    // 4) ofiara w aucie jest pomijana
    S.gunS.g1.hp = 100; S.vehs.setRemote('casino', 'g1', { x: 60, z: 60, yaw: 0, v: 0 }); await run(-38, -58); out.inCar = hp(); S.vehs.releaseDriver('g1'); S.vehs.clearRemoteExcept(new Set());
    // 5) dach: głowa wysoko (4 m) nie jest potrącona
    S.gunS.g1.hp = 100; await run(-38, -58, 4.0); out.roof = hp();
    // 6) śmierć: drugie trafienie po odnowieniu zabija (60% + 60%), wpis w dzienniku i bust z kierunkiem jazdy
    S.gunS.g1.hp = 45; G.debugOutbox().length = 0; await run(-38, -58); out.kill = { drive: !!st().drive, busted: S.busted, g1: !!N.playersState.g1, hp: hp(), feed: S.feed.map(f => f.s), bust: G.debugOutbox().filter(q => q.k === 'bust').pop() || null, hitMark: S.hitMark.text };
    out.dmgLimit = RO.runDamage(7);
    G.debugDriveInput(null); delete N.playersState['g1'];
    return out;
} catch (e) { return { err: String(e.stack).slice(0, 700) }; } });
if (R.err) { console.log(R.err); process.exit(1); }
ok('a car driving into a standing guest hurts him by the speed-based percent (12-60), the driver sees RUN OVER n% and the guests get a "hit" message', R.driving && R.hit1.hp < 100 && R.hit1.hp >= 100 - R.dmgLimit && /^RUN OVER \d+%$/.test(R.hit1.hitMark) && R.hit1.msg && R.hit1.msg.v === 'g1' && R.hit1.msg.p === 100 - R.hit1.hp, R);
ok('a car standing still on the victim does not hurt again (speed and cooldown)', R.noRepeat === true, R.noRepeat);
ok('CO-OP mode never hurts, a victim inside a vehicle and a victim with the head on a roof are skipped', R.coop === 100 && R.inCar === 100 && R.roof === 100, { coop: R.coop, inCar: R.inCar, roof: R.roof });
ok('a lethal run-over kills, writes "ran over" in the feed, sends a shot-type bust with the heading of the car, and shows KILL to the driver', R.kill.feed.some(s => /ran over/.test(s)) && R.kill.bust && R.kill.bust.id === 'g1' && R.kill.bust.r === 'shot' && Number.isFinite(R.kill.bust.a) && R.kill.hitMark === 'KILL', R.kill);
ok('no page errors', errors.length === 0, errors);
await browser.close(); server.close();
if (fails) { console.log(fails + ' check(s) failed'); process.exit(1); } console.log('runover: all checks passed');
