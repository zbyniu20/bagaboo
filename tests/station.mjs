// Test w przeglądarce: mapa Train Station 80 x 80 w Become the Monster (budowa, budżet rysowania z kilku miejsc, sprzątanie przy zmianie mapy, zrzuty). Użycie: CHROMIUM_PATH=... [SHOTDIR=katalog] node station.mjs
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
const SP = process.env.SHOTDIR || "";
await ev(async () => { const M = await import('./main.js'); await M.loadLevel('monster'); });
await page.waitForTimeout(4000);
const info = await ev(async () => { const G = await import('./levels/monster.js'); return G.debugMap(0, 7); });
await page.waitForTimeout(1500);
ok('the station builds: 80 x 80 (A = 40), colliders for the instanced blocks, 16 lights at most, 21 hiding places', info && info.map === 0 && info.A === 40 && info.obstacles > 500 && info.lights <= 16 && info.hides >= 20, info);
// pomiar wywołań rysowania z kilku punktów (cienie wyłączone, jak w budżecie: liczy się główny przebieg)
const spots = { entry: [0, 1.2, 33, 0, 0.05], 'platform south': [0, 2.4, 20, 0, -0.05], 'platform north': [-16, 2.4, -20, Math.PI, 0], bridge: [0, 7.2, -4, Math.PI / 2, -0.1], 'inside a train': null, 'north yard': [0, 1.2, -36, 0, 0] };
const calls = {};
for (const name of Object.keys(spots)) {
    const s = spots[name] || (await ev(async () => { const G = await import('./levels/monster.js'); return null; })) || [0, 2.2, 0, 0, 0];
    calls[name] = await ev(async ([x, y, z, yaw, pitch]) => {
        const E = await import('./core/engine.js'), P = await import('./core/player.js'), D = await import('./core/desktop.js'), R = E.renderer, I = R.info;
        P.setPlayerPosition(x, y, z); D.setDesktopFacing(yaw, pitch); await new Promise(r => setTimeout(r, 700));
        const sm = R.shadowMap.enabled; R.shadowMap.enabled = false; I.reset(); R.render(E.scene, E.camera); I.reset(); R.render(E.scene, E.camera); const c = I.render.calls, t = I.render.triangles; R.shadowMap.enabled = sm; return { calls: c, tris: t };
    }, s);
}
console.log('      draw calls:', JSON.stringify(calls));
ok('the main pass of the station stays within the 260 draw-call budget in every view', Object.values(calls).every(c => c.calls <= 260), calls);
// zmiana mapy sprząta kolizje i wraca do tego samego stanu
const sw = await ev(async () => { const G = await import('./levels/monster.js'), E = await import('./core/engine.js'), w = (ms) => new Promise(r => setTimeout(r, ms)); const n0 = E.L.obstacles.length; G.debugMap(1, 5); await w(300); const n1 = E.L.obstacles.length; G.debugMap(0, 7); await w(300); const n2 = E.L.obstacles.length; G.debugMap(0, 7); await w(300); const n3 = E.L.obstacles.length; return { n0, n1, n2, n3 }; });
ok('changing the map removes the old colliders (no leak: the station twice gives the same count)', sw.n2 === sw.n3 && sw.n1 < sw.n2, sw);
// wyjście ze stacji przez drzwi GAMES jest wolne: gracz stoi przy drzwiach i nie jest w przeszkodzie
const door = await ev(async () => { const E = await import('./core/engine.js'), P = await import('./core/player.js'); P.setPlayerPosition(0, 1.0, 38); await new Promise(r => setTimeout(r, 500)); const b = P.playerBody.position; return { x: b.x, y: b.y, z: b.z }; });
ok('the player can stand at the GAMES door (nothing blocks it)', Math.abs(door.x) < 0.5 && door.z > 37 && door.y < 2, door);
// bot-potwór (solo) musi umieć złapać gracza ukrytego w każdym rodzaju kryjówki (dach nad kryjówką nie może go zatrzymać)
const bots = await ev(async () => {
    const G = await import('./levels/monster.js'), out = {}, md = G.debugMap(0, 7); const sp = md.spots;
    const ms = { car: sp.car, tunnel: sp.tunnel, room: sp.room, duct: sp.duct, platform: [0, 1.2, 20], bridge: [0, 6.0, -4], roof: [sp.car[0], 3.55, sp.car[2]] };
    for (const [k, v] of Object.entries(ms)) out[k] = G.debugBotRun(-30, -36, v[0], v[1] + 0.3, v[2], 70, k === 'duct');
    out.far = G.debugBotRun(-30, -36, 0, 1.5, 33, 70);
    return out;
});
console.log('      bot:', JSON.stringify(bots));
for (const k of ['car', 'tunnel', 'room', 'duct', 'platform', 'bridge', 'roof', 'far']) ok('the bot reaches a player hiding in: ' + k + ' (within 70 s)', bots[k] && bots[k].contact, bots[k]);
if (SP) {
    fs.mkdirSync(SP, { recursive: true });
    if (process.env.REF) { await ev(async (i) => { const G = await import('./levels/monster.js'), E = await import('./core/engine.js'), P = await import('./core/player.js'), D = await import('./core/desktop.js'); G.debugMap(i, 5); await new Promise(r => setTimeout(r, 1200)); for (const c of E.camera.children) c.visible = false; P.setPlayerPosition(0, 1.2, 20); D.setDesktopFacing(0, -0.05); }, +process.env.REF); await page.waitForTimeout(900); await page.screenshot({ path: path.join(SP, 'ref-' + process.env.REF + '.png') }); }
    const sp = info.spots, shots = { 'st-entry': [0, 1.2, 33, 0, 0.02], 'st-platform': [-16, 2.4, 22, 0, -0.05], 'st-bridge': [-28, 7.2, -4, -Math.PI / 2, -0.15], 'st-north': [0, 1.2, -35, Math.PI, 0.0], 'st-train': [sp.car[0], 2.4, sp.car[2], 0, -0.1], 'st-tunnel': [sp.tunnel[0], 1.2, sp.tunnel[2], Math.PI / 2, 0], 'st-room': [sp.room[0], 2.6, sp.room[2], 0, -0.1], 'st-duct': [sp.duct[0], 2.4, sp.duct[2] + 5, Math.PI, 0] };
    for (const [n, s] of Object.entries(shots)) {
        await ev(async ([x, y, z, yaw, pitch]) => { const E = await import('./core/engine.js'), P = await import('./core/player.js'), D = await import('./core/desktop.js'); for (const c of E.camera.children) c.visible = false; P.setPlayerPosition(x, y, z); D.setDesktopFacing(yaw, pitch); }, s);
        await page.waitForTimeout(900); await page.screenshot({ path: path.join(SP, n + '.png') });
    }
}
ok('no page errors', errors.length === 0, errors);
await browser.close(); server.close();
if (fails) { console.log(fails + ' check(s) failed'); process.exit(1); } console.log('station: all checks passed');
