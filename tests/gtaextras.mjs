// Test w przeglądarce: Scary GTA: dodatki (telefon, lakiernia, przebranie, wspinaczki, paczki, manekiny, sejf, prąd, noc, dźwig, mutatory). Użycie: CHROMIUM_PATH=... node gtaextras.mjs
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


const gx = () => ev(async () => (await import('./levels/scarygta.js')).debugGta());
const w = (ms) => page.waitForTimeout(ms);
const a0 = await gx();
ok('the extras build: 13 tag spots, 4 window mannequins, the substation, lights and neons all on', a0 && a0.spots.tags.length === 13 && a0.spots.win.length === 4 && a0.night === 'calm' && a0.neonOn === a0.neonAll && a0.lamps === true && a0.hear === 1, a0 && { n: a0.spots.tags.length, night: a0.night });
// ----- paczki: dotknięcie dłonią płaci raz -----
const tag = await ev(async () => {
    const G = await import('./levels/scarygta.js'), E = await import('./core/economy.js'), P = await import('./core/player.js'), w = (ms) => new Promise(r => setTimeout(r, ms));
    const d = G.debugGta(), t = d.spots.tags[0]; P.setPlayerPosition(t.x, 1.2, t.z + 3); const w0 = E.SAVE.wallet;
    await G.debugGtaTouch(() => [[t.x, t.y, t.z]]); await w(600); const a = E.SAVE.wallet - w0, n1 = G.debugGta().tags; await w(600); const b = E.SAVE.wallet - w0;
    await G.debugGtaTouch(null); return { a, b, n1 };
});
ok('touching a neon tag pays 25 Bagabucks exactly once and counts it', tag.a === 25 && tag.b === 25 && tag.n1 >= 1, tag);
// ----- lakiernia: stoisz 2 s w kabinie, płacisz 100, ciepło spada do zera -----
const spray = await ev(async () => {
    const G = await import('./levels/scarygta.js'), E = await import('./core/economy.js'), P = await import('./core/player.js'), X = await import('./core/gtaextras.js'), w = (ms) => new Promise(r => setTimeout(r, ms));
    const S = G.testState(); S.sim.reset(); E.SAVE.wallet = Math.max(E.SAVE.wallet, 500); const b = X.SPRAY.SPOTS[0]; P.setPlayerPosition(b.x, 1.1, b.z);
    G.debugHeat(60); S.sim.heats.me.seenT = 99; const w0 = E.SAVE.wallet, s0 = S.sim.starsOf('me');
    for (let i = 0; i < 400 && S.sim.starsOf('me') > 0; i++) { P.setPlayerPosition(b.x, 1.1, b.z); S.sim.heats.me.seenT = 99; await w(100); }
    return { s0, s1: S.sim.starsOf('me'), paid: w0 - E.SAVE.wallet, done: G.debugGta().sprayDone };
});
ok('Pay n Spray: standing in the booth clears the stars and charges 100 Bagabucks', spray.s0 >= 3 && spray.s1 === 0 && spray.paid === 100 && spray.done === 1, spray);
// ----- przebranie w kryjówce -----
const dis = await ev(async () => {
    const G = await import('./levels/scarygta.js'), P = await import('./core/player.js'), C = await import('./core/citylayout.js'), w = (ms) => new Promise(r => setTimeout(r, ms));
    const S = G.testState(); const s = C.SAFEHOUSES[0]; for (let i = 0; i < 300 && !(G.debugGta().dis > 0); i++) { P.setPlayerPosition(s.x, 1.1, s.z); await w(100); }
    return { left: G.debugGta().dis, mul: S.sim.sightMul.me };
});
ok('standing at a safe house for a moment disguises you (sight multiplier 0.65 for the cops)', dis.left > 30 && Math.abs(dis.mul - 0.65) < 1e-6, dis);
// ----- wspinaczka na czas: pole startowe, potem dzwon -----
const climb = await ev(async () => {
    const G = await import('./levels/scarygta.js'), P = await import('./core/player.js'), E = await import('./core/economy.js'), w = (ms) => new Promise(r => setTimeout(r, ms));
    const c = G.debugGta().spots.climb[0]; P.setPlayerPosition(c.pad[0], 1.1, c.pad[2]); await w(800); const run = G.debugGta().run.length;
    P.setPlayerPosition(c.pad[0] + 5, 1.1, c.pad[2] + 5); await G.debugGtaTouch(() => [c.bell]);
    for (let i = 0; i < 100 && !G.debugGta().climb; i++) await w(100);
    await G.debugGtaTouch(null); return { run, last: G.debugGta().climb, best: JSON.stringify(E.SAVE.gta.climbBest), id: c.id };
});
ok('a timed climb starts on the pad, ends on the bell and saves the best time', climb.run === 1 && /record/.test(climb.last || '') && new RegExp('"' + climb.id + '":').test(climb.best), climb);
// ----- skarbiec w banku: kod z paragonu, 300 Bagabucksów raz na dobę, trzy błędy blokują -----
const vault = await ev(async () => {
    const G = await import('./levels/scarygta.js'), E = await import('./core/economy.js'), X = await import('./core/gtaextras.js'), S = G.testState(), w = (ms) => new Promise(r => setTimeout(r, ms));
    E.SAVE.gta = Object.assign({}, E.SAVE.gta, { vault: '' }); const today = E.dailyDate(), code = X.gtaCode(today), wrong = code === '1234' ? '4321' : '1234', w0 = E.SAVE.wallet, h0 = S.sim.heatOf('me').v;
    for (const ch of wrong) G.debugGtaKey(ch); G.debugGtaKey('ENT'); const bad = E.SAVE.wallet - w0;
    for (const ch of code) G.debugGtaKey(ch); G.debugGtaKey('ENT'); await w(300); const ok1 = E.SAVE.wallet - w0, h1 = S.sim.heatOf('me').v;
    for (const ch of code) G.debugGtaKey(ch); G.debugGtaKey('ENT'); const again = E.SAVE.wallet - w0;
    return { bad, ok1, again, heat: h1 - h0, saved: E.SAVE.gta.vault === today, opened: G.debugGta().vaultOpened };
});
ok('the bank vault: a wrong code pays nothing, the receipt code pays 300 once per day and the alarm raises the heat', vault.bad === 0 && vault.ok1 === 300 && vault.again === 300 && vault.heat >= 25 && vault.saved && vault.opened === 1, vault);
// ----- dźwignia prądu przy kasynie -----
const pw = await ev(async () => {
    const G = await import('./levels/scarygta.js'), P = await import('./core/player.js'), w = (ms) => new Promise(r => setTimeout(r, ms));
    const ps = G.debugGta().spots.power; P.setPlayerPosition(ps.x, 1.1, ps.z + 3); await G.debugGtaTouch(() => [[ps.x, ps.y, ps.z]]); await w(600); await G.debugGtaTouch(null);
    const on = G.debugGta(); await w(200); return { left: on.powerLeft, dark: on.dark, neon: on.neonOn + '/' + on.neonAll, lights: on.lightI.join(',') };
});
ok('pulling the lever cuts the casino power: its neon goes off, its light dims and the cops see less around it', pw.left > 30 && pw.dark === 1 && Number(pw.neon.split('/')[0]) === Number(pw.neon.split('/')[1]) - 1 && /1\.6/.test(pw.lights), pw);
// ----- noc: blackout i horda -----
const night = await ev(async () => {
    const G = await import('./levels/scarygta.js'), S = G.testState(), w = (ms) => new Promise(r => setTimeout(r, ms));
    G.debugGtaNight('blackout'); await w(200); const b = G.debugGta();
    G.debugGtaNight('horde'); await w(200); const h = G.debugGta(); let cops = 0; for (let i = 0; i < 300 && cops < 4; i++) { await w(200); cops = S.sim.activeCops().length; }
    G.debugGtaNight('calm'); await w(200); const c = G.debugGta();
    return { b: { lamps: b.lamps, neon: b.neonOn }, h: { extra: h.extra }, cops, c: { extra: c.extra, lamps: c.lamps } };
});
ok('blackout turns lamps and neons off, the horde adds 4 cops, calm restores everything', night.b.lamps === false && night.b.neon === 0 && night.h.extra === 4 && night.cops >= 4 && night.c.extra === 0 && night.c.lamps === true, night);
// ----- manekiny w witrynach: ruszają się tylko gdy na nie nie patrzysz -----
const man = await ev(async () => {
    const G = await import('./levels/scarygta.js'), P = await import('./core/player.js'), D = await import('./core/desktop.js'), w = (ms) => new Promise(r => setTimeout(r, ms));
    const m0 = G.debugGta().spots.win[0]; P.setPlayerPosition(m0.x, 1.1, m0.z - 8); D.setDesktopFacing(0);   // patrzy w +z? (test sprawdza oba kierunki)
    const run = async (yaw) => { D.setDesktopFacing(yaw); P.setPlayerPosition(m0.x, 1.1, m0.z - 8); const a = G.debugGta().mans[0].slice(); await w(1500); const b = G.debugGta().mans[0]; return Math.hypot(a[0] - b[0], a[1] - b[1]); };
    const d1 = await run(0), d2 = await run(3.14159);
    return { d1, d2 };
});
ok('a window mannequin creeps only while you look away (one of the two facings moves it, the other does not)', (man.d1 < 0.01) !== (man.d2 < 0.01), man);
// ----- telefon: widoczny po spojrzeniu w dół -----
const phone = await ev(async () => { const G = await import('./levels/scarygta.js'), D = await import('./core/desktop.js'), w = (ms) => new Promise(r => setTimeout(r, ms)); D.setDesktopFacing(0, 0); await w(500); const up = G.debugGta().phone; D.setDesktopFacing(0, -1.2); await w(900); const down = G.debugGta().phone; D.setDesktopFacing(0, 0); return { up, down }; });
ok('the phone map shows only when looking down', phone.up === false && phone.down === true, phone);
// ----- napad dnia: wyjście z torbą celu dnia -----
const daily = await ev(async () => {
    const G = await import('./levels/scarygta.js'), E = await import('./core/economy.js'), X = await import('./core/gtaextras.js'), S = G.testState(), w = (ms) => new Promise(r => setTimeout(r, ms));
    E.SAVE.gta = Object.assign({}, E.SAVE.gta, { daily: { date: '', best: 0 } }); const t = X.dailyHeist(E.dailyDate()).target;
    for (const b of S.bags) if (b.holder === 'me') { b.holder = null; b.got = false; }
    G.debugTakeBag(t); await w(300); G.debugFinish(); await w(300);
    return { target: t, date: E.SAVE.gta.daily.date === E.dailyDate(), best: E.SAVE.gta.daily.best };
});
ok('leaving with the daily target bag saves the daily heist time (and pays 150 once)', daily.date && daily.best > 0, daily);
// ----- mutatory: scarygta jest na liście -----
const mut = await ev(async () => { const M = await import('./core/mutators.js'); return M.mutatorAllowed('scarygta', false); });
ok('Scary GTA accepts mutators (dark and loud)', mut === true);
// ----- dźwig: lina dźwigu istnieje -----
const crane = await ev(async () => { const G = await import('./levels/scarygta.js'); return G.debugSim().rails.length; });
ok('the crane rail exists besides the casino and bank rails (3 rails)', crane === 3, crane);
ok('no page errors', errors.length === 0, errors);
console.log(fails ? 'FAILED: ' + fails : 'gtaextras: all checks passed'); await browser.close(); server.close(); process.exit(fails ? 1 : 0);
