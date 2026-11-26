// Test w przeglądarce: Scary GTA, etap 4: helikopter Oko (pojawienie się, reflektor, SWAT, migawka dla gościa). Użycie: CHROMIUM_PATH=... node heli.mjs
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


const heli = () => ev(async () => (await import('./levels/scarygta.js')).debugHeli());
const a0 = await heli();
ok('there is no helicopter at 0 stars', a0 && a0.mode === 'away' && a0.vis === false, a0);
await ev(async () => { const G = await import('./levels/scarygta.js'), P = await import('./core/player.js'); P.setPlayerPosition(-38, 1.2, 0); G.debugHeat(60); });
await ev(async () => { const G = await import('./levels/scarygta.js'); for (let i = 0; i < 300; i++) { if (G.debugHeli().mode !== 'away') return; await new Promise(r => setTimeout(r, 100)); } });
const a1 = await heli();
ok('at 3 stars the helicopter flies in above the rooftops and its model is visible', a1.mode !== 'away' && a1.vis === true && a1.y >= 50, a1);
// reflektor na graczu: ciepło rośnie, HUD ostrzega
const eye = await ev(async () => {
    const G = await import('./levels/scarygta.js'), S = G.testState(), w = (ms) => new Promise(r => setTimeout(r, ms));
    S.sim.reset(); const before = S.sim.heatOf('me').v; S.heli.mode = 'investigate'; S.heli.x = -38; S.heli.z = 0; S.heli.known = { x: -38, z: 0 };
    let on = false; for (let i = 0; i < 60; i++) { S.heli.lx = -38; S.heli.lz = 0; S.heli.mode = 'investigate'; await w(100); if (S.eyeOnMe) { on = true; break; } }
    const h0 = S.sim.heatOf('me').v; for (let i = 0; i < 20; i++) { S.heli.lx = -38; S.heli.lz = 0; S.sim.heats.me.seenT = 99; await w(100); } return { on, before, h0, h1: S.sim.heatOf('me').v };
});
ok('standing in the search light is detected (the Eye sees you) and the wanted heat keeps rising', eye.on && eye.h1 > eye.h0, eye);
// 5 gwiazdek: SWAT zjeżdża z helikoptera (dwóch policjantów z animacją opadania)
const swat = await ev(async () => {
    const G = await import('./levels/scarygta.js'), S = G.testState(), w = (ms) => new Promise(r => setTimeout(r, ms));
    G.debugHeat(100); S.sim.reset(); S.heli.mode = 'chase'; S.heli.swatDone = false; S.heli.x = -30; S.heli.z = 5;
    let drops = 0, y = 0; for (let i = 0; i < 80; i++) { await w(100); const d = S.sim.cops.filter(c => c.active && c.drop > 0); if (d.length) { drops = d.length; await w(120); const d2 = S.sim.cops.filter(c => c.active && c.drop > 0); y = d2.length ? d2[0].m.group.position.y : 0; break; } }
    return { drops, y, low: S.heli.y };
});
ok('at 5 stars two SWAT officers rappel in from above (they drop from a height)', swat.drops === 2 && swat.y > 2, swat);
// gość: migawka z helikopterem; śmieci są ignorowane
const gu = await ev(async () => {
    const N = await import('./core/network.js'), G = await import('./levels/scarygta.js'), S = G.testState(), w = (ms) => new Promise(r => setTimeout(r, ms));
    N.NET.mode = 'guest'; N.playersState[N.GAME_PREFIX + N.NET.code] = { lvl: 'scarygta', head: { p: [0, 1.6, 0] } };
    G.debugNet({ k: 'st', cops: [], bags: [], heats: {}, hl: [10, 58, -5, 1.2, 12, -6, 'chase'] }, 'host'); await w(700);
    const a = G.debugHeli();
    G.debugNet({ k: 'st', cops: [], bags: [], heats: {}, hl: [NaN, 58, -5, 1.2, 12, -6, 'chase'] }, 'host'); G.debugNet({ k: 'st', cops: [], bags: [], heats: {}, hl: 'zzz' }, 'host'); const b = G.debugHeli().mode;
    G.debugNet({ k: 'st', cops: [], bags: [], heats: {}, hl: null }, 'host'); await w(400); const c = G.debugHeli();
    N.NET.mode = 'solo'; return { a, b, c };
});
ok('a guest sees the helicopter from the host snapshot, garbage is ignored, and null removes it', gu.a.mode === 'chase' && gu.a.vis === true && gu.b === 'chase' && gu.c.mode === 'away' && gu.c.vis === false, gu);
ok('no page errors', errors.length === 0, errors);
console.log(fails ? 'FAILED: ' + fails : 'heli: all checks passed'); await browser.close(); server.close(); process.exit(fails ? 1 : 0);
