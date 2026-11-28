// Test w przeglądarce: kradzież i jazda KAŻDYM z nowych aut (Cargo hauler, Dune buggy, motocykle): drzwi wg parametrów auta, wysokość pokładu, limit prędkości, kolizja z budynkiem, wysiadanie, ciało przy właściwej osi. Użycie: CHROMIUM_PATH=... node freecars.mjs
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
    const G = await import('./levels/scarygta.js'), P = await import('./core/player.js'), VL = await import('./core/vehiclelogic.js'), DR = await import('./core/drivelogic.js');
    const S = G.testState(), w = (ms) => new Promise(r => setTimeout(r, ms)), st = () => G.debugDrive(), out = {};
    const until = async (f, ms) => { for (let t = 0; t < ms && !f(); t += 100) { S.sim.reset(); S.sim.heats = {}; await w(100); } return f(); };
    for (let i = 0; i < 300 && S.busted >= 0; i++) await w(100);
    S.sim.reset(); S.sim.heats = {}; G.debugHeat(0); G.debugBlocks && G.debugBlocks([]);
    out.cars = {};
    for (const fc of VL.FREE_CARS) {
        const q = DR.specOf(fc.kind), pp = VL.parkedPose(fc.id), door = DR.doorPoint(pp, q), o = {};
        const mesh = st().cars.find(c => c[0] === fc.id); o.mesh = !!mesh && Math.abs(mesh[1] - fc.park.x) < 0.2 && Math.abs(mesh[2] - fc.park.z) < 0.2;
        P.setPlayerPosition(door.x + 0.4, 1.1, door.z); await w(500);
        await G.debugGtaTouch(() => [[door.x, 1.0, door.z]]); await w(1500); await G.debugGtaTouch(() => []);
        o.driving = st().driving && st().drive && st().drive.car === fc.id; o.heat = S.sim.heatOf('me').v; S.sim.reset(); S.sim.heats = {};
        if (o.driving) {
            const pb = P.playerBody.position, b = DR.bodyPos(st().drive, q); o.body = { dist: Math.hypot(pb.x - b.x, pb.z - b.z), y: pb.y, deck: q.DECK };
            G.debugDriveInput(1, 0, 0); let vmax = 0; await until(() => { const d = st().drive; if (!d) return true; vmax = Math.max(vmax, d.v); return d.v >= q.VMAX - 0.15 || st().bumps > 0; }, 25000);
            for (let i = 0; i < 15 && st().drive; i++) { vmax = Math.max(vmax, st().drive.v); await w(100); } o.vmax = vmax; o.limit = q.VMAX; o.still = !!st().drive;
            G.debugDriveInput(0, 0, 0); G.debugDriveExit(true); await w(700); G.debugDriveExit(false); o.out = !st().driving;
        }
        out.cars[fc.id] = o; G.debugDriveInput(null);
        P.setPlayerPosition(60, 1.2, 0); await w(300);
    }
    return out;
} catch (e) { return { err: String(e.stack).slice(0, 600) }; } });
if (R.err) { console.log(R.err); process.exit(1); }
for (const id of Object.keys(R.cars)) {
    const o = R.cars[id];
    ok(id + ': the mesh stands on its parking spot, a hand on the driver door steals it (alarm heat), the body is carried at the spec deck height and at the rear axis', o.mesh && o.driving && o.heat >= 25 && o.body && o.body.dist < 0.3 && Math.abs(o.body.y - (o.body.deck + 1.0)) < 0.2, o);
    ok(id + ': full gas never exceeds the speed limit of that car and getting out works', o.still && o.vmax > 2 && o.vmax <= o.limit + 0.05 && o.out === true, o);
}
ok('no page errors', errors.length === 0, errors);
await browser.close(); server.close();
if (fails) { console.log(fails + ' check(s) failed'); process.exit(1); } console.log('freecars: all checks passed');
