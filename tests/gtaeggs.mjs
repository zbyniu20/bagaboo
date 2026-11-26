// Test w przeglądarce: Scary GTA: easter eggi (8 jajek: kaczka, złoty automat, pokój 13, głębina, śmietnik, szósta gwiazdka, echo na dachu, pasażer-widmo). Użycie: CHROMIUM_PATH=... node gtaeggs.mjs [SHOTDIR=...]
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
const eg = () => ev(async () => (await import('./levels/scarygta.js')).debugEggs());
const sp = await ev(async () => (await import('./levels/scarygta.js')).debugEggSpots());
const wallet = () => ev(async () => (await import('./core/economy.js')).SAVE.wallet);
await ev(async () => { const G = await import('./levels/scarygta.js'); G.debugGtaNight('calm', 1e9); });   // noc nie wchodzi w drogę (poza jajkiem z blackoutem)
const E0 = await eg();
ok('the eggs build: static mesh in the level, effects hidden, nothing found, the phone hint is the first egg', E0 && E0.stat === true && !E0.eye && !E0.figW && !E0.figG && !E0.coins && E0.found.length === 0 && E0.info.n === 0 && E0.info.total === 8 && /radio tower/.test(E0.info.hint), E0);
ok('the spots reach the page from the layout (duck above the radio tower, knob inside the casino, pier zone on the pier)', sp && sp.duck.y > 40 && sp.slots.knob.y > 1 && sp.kraken.stand.x1 - sp.kraken.stand.x0 <= 5.01 && sp.room13.seconds === 8, sp);
const IN = (o) => Object.assign({ x: 0, y: 1.2, z: 0, speed: 0, dx: 0, dy: 0, dz: 1, mic: 0, stars: 0, ride: null, night: 'calm' }, o);
const step = (n, dt, c) => ev(async ([n, dt, c]) => (await import('./levels/scarygta.js')).debugEggStep(n, dt, c), [n, dt, c]);
const touch = (pts) => ev(async (pts) => { const G = await import('./levels/scarygta.js'); await G.debugGtaTouch(() => pts); }, pts);
const w0 = await wallet();
// ----- kaczka -----
await touch([[sp.duck.x, sp.duck.y + 0.15, sp.duck.z]]); await w(900); await touch([]);
const d1 = await eg(), w1 = await wallet();
ok('the duck: a hand on it finds the egg once and pays 25', d1.found.includes('duck') && w1 - w0 === 25, { f: d1.found, pay: w1 - w0 });
await touch([[sp.duck.x, sp.duck.y + 0.15, sp.duck.z]]); await w(900); await touch([]);
ok('the duck: touching it again pays nothing', (await wallet()) === w1);
// ----- złoty automat -----
await touch([[sp.slots.knob.x, sp.slots.knob.y, sp.slots.knob.z]]); await w(500);
const s1 = await eg(); await touch([]); await w(300);
ok('the lucky machine: the lever finds the egg and shows the coins', s1.found.includes('slots') && s1.coins === true, s1);
// ----- pokój 13 (normalny poziom brutalności: postać w szafie) -----
await ev(async () => { const S = await import('./core/settings.js'); S.SETTINGS.jumpscares = true; });
const r13 = sp.room13;
const q0 = await step(40, 0.1, IN({ x: r13.x, z: r13.z, y: r13.y }));
ok('room 13: four seconds beside the bed is not enough', !q0.found.includes('room13'), q0.det);
const q1 = await step(30, 0.1, IN({ x: r13.x + 3, z: r13.z, y: r13.y }));   // wyjście z pokoju zeruje licznik
const q2 = await step(90, 0.1, IN({ x: r13.x, z: r13.z, y: r13.y })), q3 = q2.figW;
ok('room 13: leaving resets the clock, then eight quiet seconds find the egg and show the figure', q1.det.room13 === 0 && q2.found.includes('room13') && q3 === true, { det: q1.det, f: q2.found, fig: q3 });
const q4 = await step(40, 0.1, IN({ x: r13.x, z: r13.z, y: r13.y }));
ok('room 13: the figure disappears after a few seconds', q4.figW === false);
// ----- głębina -----
const k = sp.kraken, kx = 0, kz = (k.stand.z0 + k.stand.z1) / 2, ldx = k.eye.x - kx, ldz = k.eye.z - kz, ll = Math.hypot(ldx, ldz);
const g0 = await step(40, 0.1, IN({ x: kx, z: kz, dx: ldx / ll, dz: ldz / ll }));
ok('the deep: four seconds of staring is not enough, looking at the sky does not count', !g0.found.includes('kraken'));
await step(30, 0.1, IN({ x: kx, z: kz, dx: 0, dy: 0.95, dz: 0.3 }));
const g1 = await step(70, 0.1, IN({ x: kx, z: kz, dx: ldx / ll, dz: ldz / ll }));
ok('the deep: six steady seconds toward the water from the pier find the egg and raise the eye', g1.found.includes('kraken') && g1.eye === true, g1);
const g2 = await step(60, 0.1, IN({ x: kx, z: kz }));
ok('the deep: the eye sinks again by itself', g2.eye === false);
// ----- śmietnik -----
const ds = sp.dumpster;
const knocks = () => ev(async ([x, y, z, c]) => { const G = await import('./levels/scarygta.js'); let on = false; await G.debugGtaTouch(() => on ? [[x, y, z]] : []); const out = []; for (let i = 0; i < 3; i++) { on = true; G.debugEggStep(1, 0.1, c); on = false; out.push(G.debugEggStep(2, 0.1, c).found.includes('dumpster')); } out.push(G.debugEggStep(12, 0.1, c)); return out; }, [ds.x, ds.y, ds.z, IN({ x: ds.x + 2, z: ds.z })]);   // synchronicznie: żadna prawdziwa klatka nie wcina się w serię
const kn = await knocks();
ok('the dumpster: two knocks are not enough', kn[0] === false && kn[1] === false, kn);
ok('the dumpster: the third knock gets an answer and finds the egg', kn[3].found.includes('dumpster'), kn[3].det);
await touch([]);
// ----- szósta gwiazdka -----
const sx = sp.sixth;
const c0 = await step(100, 0.1, IN({ x: sx.x + 1, y: sx.y + 1.2, z: sx.z, stars: 4 }));
ok('the sixth star: with only four stars the crane top is just a nice view', !c0.found.includes('sixth'));
const c1 = await step(100, 0.1, IN({ x: sx.x + 1, y: 3, z: sx.z, stars: 5 }));
ok('the sixth star: five stars at the bottom of the crane do not count either', !c1.found.includes('sixth'));
const heatBefore = await ev(async () => (await import('./levels/scarygta.js')).debugSim().heat);
const c2 = await step(100, 0.1, IN({ x: sx.x + 1, y: sx.y + 1.2, z: sx.z, stars: 5 }));
const heatAfter = await ev(async () => (await import('./levels/scarygta.js')).debugSim().heat);
ok('the sixth star: five stars and eight calm seconds on top find the egg, and the wanted level is untouched', c2.found.includes('sixth') && Math.abs(heatAfter - heatBefore) < 5, { heatBefore, heatAfter });
// ----- echo na dachu -----
const rf = sp.rooftop, rx = (rf.x0 + rf.x1) / 2, rz = (rf.z0 + rf.z1) / 2;
const e0 = await step(60, 0.1, IN({ x: rx, y: rf.y + 1.2, z: rz, mic: 0.1 }));
ok('the echo: talking quietly on the roof does nothing', !e0.found.includes('rooftop'));
const e1 = await step(60, 0.1, IN({ x: rx, y: 3, z: rz, mic: 0.6 }));
ok('the echo: shouting on the ground does nothing either', !e1.found.includes('rooftop'));
await step(5, 0.1, IN({ x: rx, y: rf.y + 1.2, z: rz, mic: 0.6 }));
const e2 = await step(25, 0.1, IN({ x: rx, y: rf.y + 1.2, z: rz, mic: 0 }));
ok('the echo: a shout on the casino roof is answered by the city and finds the egg', e2.found.includes('rooftop'), e2.found);
// ----- pasażer-widmo -----
const ride = { x: 0, z: 0, yaw: 0.4 };
const h0 = await step(80, 0.1, IN({ ride: ride, night: 'calm' })), h1 = await step(1, 0.1, IN({ ride: null, night: 'calm' }));
ok('the passenger: a ride by day shows nobody and finds nothing', h0.figG === false && !h1.found.includes('ghost'));
const h2 = await step(30, 0.1, IN({ ride: ride, night: 'blackout' })), h3 = await step(1, 0.1, IN({ ride: null, night: 'blackout' }));
ok('the passenger: a short night ride shows the figure but is not enough', h2.figG === true && !h3.found.includes('ghost') && h3.figG === false, { h2: h2.figG, f: h3.found });
const h4 = await step(70, 0.1, IN({ ride: ride, night: 'blackout' })), h5 = await step(1, 0.1, IN({ ride: null, night: 'blackout' }));
ok('the passenger: seven seconds of a night ride find the egg when you arrive, and the figure is gone', h4.figG === true && h5.found.includes('ghost') && h5.figG === false, { fig: h4.figG, f: h5.found });
// ----- komplet i zapis -----
const done = await ev(async () => { const E = await import('./core/economy.js'), G = await import('./core/gtaextras.js'); return { n: E.SAVE.gta.eggs.found.length, paid: E.SAVE.gta.eggs.paid.length, norm: G.normalizeGta(E.SAVE.gta).eggs.found.length, wallet: E.SAVE.wallet }; });
ok('all eight eggs: the save has all of them and the one-time set bonus is paid (8 x 25 + 250)', done.n === 8 && done.paid === 8 && done.norm === 8 && done.wallet - w0 === 8 * 25 + 250, done);
const phoneInfo = (await eg()).info;
ok("the phone: the counter reads 8/8 and the hint is empty", phoneInfo.n === 8 && phoneInfo.hint === "", phoneInfo);
await ev(async () => { const M = await import('./main.js'); await M.loadLevel('lobby'); }); await w(2500);
await ev(async () => { const M = await import('./main.js'); await M.loadLevel('scarygta'); }); await w(6000);
const again = await eg();
ok('after leaving and coming back the eggs are still found (saved at once)', again && again.found.length === 8 && again.stat === true, again && again.found);
// ----- łagodny poziom brutalności: jajko się zalicza, bez straszenia -----
await ev(async () => { const E = await import('./core/economy.js'), S = await import('./core/settings.js'); E.SAVE.gta.eggs = { found: [], paid: [] }; S.SETTINGS.jumpscares = false; const M = await import('./main.js'); await M.loadLevel('lobby'); }); await w(2000);
await ev(async () => { const M = await import('./main.js'); await M.loadLevel('scarygta'); }); await w(6000);
await ev(async () => { const G = await import('./levels/scarygta.js'); G.debugGtaNight('calm', 1e9); });
const gen = await step(100, 0.1, IN({ x: r13.x, z: r13.z, y: r13.y }));
ok('Gentle: room 13 still counts, but no figure appears in the wardrobe', gen.found.includes('room13') && gen.figW === false, gen);
await ev(async () => { const S = await import('./core/settings.js'); S.SETTINGS.jumpscares = true; });
// ----- zrzuty do oceny wyglądu (tylko z SHOTDIR) -----
if (SP) {
    await ev(async () => { const E = await import('./core/economy.js'), S = await import('./core/settings.js'); E.SAVE.gta.eggs = { found: [], paid: [] }; S.SETTINGS.jumpscares = true; const M = await import('./main.js'); await M.loadLevel('lobby'); }); await w(2000);
    await ev(async () => { const M = await import('./main.js'); await M.loadLevel('scarygta'); }); await w(6000);
    await ev(async () => { const G = await import('./levels/scarygta.js'); G.debugGtaNight('calm', 1e9); });
    const look = async (name, x, y, z, tx, ty, tz, wait) => { const dx = tx - x, dz = tz - z, yaw = Math.atan2(-dx, -dz), pitch = Math.atan2(ty - y, Math.hypot(dx, dz)); await ev(async ([x, y, z, yaw, pitch]) => { const PL = await import('./core/player.js'), D = await import('./core/desktop.js'); PL.setPlayerPosition(x, y, z); D.setDesktopFacing(yaw, pitch); }, [x, y, z, yaw, pitch]); await w(wait || 1500); await page.screenshot({ path: SP + '/egg_' + name + '.png', timeout: 120000 }); };
    await look('duck', sp.duck.x + 0.3, sp.duck.y + 1.1, sp.duck.z + 1.4, sp.duck.x, sp.duck.y + 0.15, sp.duck.z);
    const km = sp.slots.knob, mm = sp.slots.machine, mx = (mm.x0 + mm.x1) / 2, mz = (mm.z0 + mm.z1) / 2, fxs = Math.abs(50 - mx) > Math.abs(-65 - mz) ? Math.sign(50 - mx) : 0, fzs = fxs ? 0 : Math.sign(-65 - mz);
    await look('slots', mx + fxs * 2.6, 1.5, mz + fzs * 2.6, mx, 1.1, mz);
    await touch([[km.x, km.y, km.z]]); await w(300); await touch([]);
    await ev(async () => { const G = await import('./levels/scarygta.js'); G.debugEggStep(6, 0.1, { x: 0, y: 1.2, z: 0, speed: 3, dx: 0, dy: 0, dz: 1 }); }); await look('slots_coins', mx + fxs * 2.6, 1.5, mz + fzs * 2.6, mx, 1.4, mz, 300);
    await step(81, 0.1, IN({ x: r13.x, z: r13.z, y: r13.y })); await look('room13', r13.x, 1.5, r13.z, r13.ghost.x, 1.2, r13.ghost.z, 500);
    await step(76, 0.1, IN({ x: kx, z: kz, dx: ldx / ll, dz: ldz / ll })); await look('eye', kx, 1.8, kz, k.eye.x, 0.8, k.eye.z, 80);
}
ok('no page errors', errors.length === 0, errors.slice(0, 5));
await browser.close(); server.close();
console.log(fails ? fails + ' check(s) failed' : 'gtaeggs: all checks passed'); process.exit(fails ? 1 : 0);
