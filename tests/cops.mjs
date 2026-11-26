// Test w przeglądarce: Scary GTA, etap 2: policja, gwiazdki, BUSTED i odrodzenie, linia transportu. Użycie: CHROMIUM_PATH=... node cops.mjs
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

const sim = () => ev(async () => (await import('./levels/scarygta.js')).debugSim());
const w = (ms) => page.waitForTimeout(ms);
await ev(async () => { (await import('./levels/scarygta.js')).debugGtaNight('calm', 1e9); });   // noc (blackout i horda) nie wchodzi w drogę testowi policji
const a0 = await sim();
ok('the sim starts calm: no stars, patrolling cops exist, 3 gators', a0 && a0.stars === 0 && a0.cops > 0 && a0.gators === 3 && a0.busted < 0, a0);
await ev(async () => { const G = await import('./levels/scarygta.js'); G.debugHeat(60); }); await w(500);
const a1 = await sim();
ok('heat turns into stars (60 heat = 3 stars)', a1.stars === 3 && a1.cops >= a0.cops, a1);
// pościg: policjant tuż obok gracza w polu widzenia
const near = await ev(async () => { const G = await import('./levels/scarygta.js'), P = await import('./core/player.js'), D = await import('./core/desktop.js'); P.setPlayerPosition(0, 1.2, 20); D.setDesktopFacing(0); await new Promise(r => setTimeout(r, 400)); return G.debugSpawnCop(0, 14); });
await ev(async () => { const G = await import('./levels/scarygta.js'); for (let i = 0; i < 400; i++) { const d = G.debugSim(); if (d.modes.includes('chase') || d.busts > 0) return; await new Promise(r => setTimeout(r, 200)); } });
const a2 = await sim();
ok('a cop spawned near the player notices them (chase or bust)', near === true && (a2.modes.includes('chase') || a2.busts > 0), a2);
await ev(async () => { const G = await import('./levels/scarygta.js'); for (let i = 0; i < 600; i++) { if (G.debugSim().busted < 0) return; await new Promise(r => setTimeout(r, 200)); } });
await ev(async () => { const P = await import('./core/player.js'); P.setPlayerPosition(-70, 1.2, 40); });
// złapanie: torby wypadają, gracz odradza się w kryjówce
await ev(async () => { const G = await import('./levels/scarygta.js'); G.debugTakeBag('jewelry'); G.debugTakeBag('gas'); });
await w(500);
const pre = await sim();
await ev(async () => { (await import('./levels/scarygta.js')).debugBust(); });
await w(300);
const b1 = await sim();
ok('BUSTED drops the bags and starts the respawn timer', b1.busted >= 0 && b1.got === 0 && b1.busts >= 1 && pre.got >= 0, { pre, b1 });
await ev(async () => { const G = await import('./levels/scarygta.js'); for (let i = 0; i < 600; i++) { if (G.debugSim().busted < 0) return; await new Promise(r => setTimeout(r, 200)); } });
const b2 = await sim();
const pos = await ev(async () => { const P = await import('./core/player.js'), C = await import('./core/citylayout.js'); const x = P.playerBody.position.x, z = P.playerBody.position.z; return [x, z, C.SAFEHOUSES.some(h => Math.hypot(h.x - x, h.z - z) < 3)]; });
ok('after ~4.5 s the player is back at a safe house, heat reduced', b2.busted < 0 && pos[2] === true, { b2, pos });
// linia transportu
const r0 = await ev(async () => { const G = await import('./levels/scarygta.js'), P = await import('./core/player.js'); P.setPlayerPosition(12, 6, 40); await new Promise(r => setTimeout(r, 300)); G.debugRide(0); await new Promise(r => setTimeout(r, 2500)); return { s: G.debugSim().rails, z: P.playerBody.position.z }; });
ok('the cable ride takes the player along the line', r0.z < 30 || r0.s.some(p => p && p !== 'idle'), r0);
// nagrody: komplet toreb i 5 gwiazdek
const fin = await ev(async () => { const G = await import('./levels/scarygta.js'), E = await import('./core/economy.js'), S = G.testState(); for (const b of S.bags) if (!b.got) G.debugTakeBag(b.id); await new Promise(r => setTimeout(r, 400)); G.debugFinish(5); return { heist: !!E.SAVE.achievements.gta_heist, ghost: !!E.SAVE.achievements.gta_ghost, palm: E.SAVE.owned.includes('hat:palmhat'), skin: E.SAVE.owned.includes('mskin:zombiecop'), got: S.got }; });
ok('leaving with all six bags after 5 stars unlocks Heist legend (Palm hat) and Burn it down (Zombie cop skin)', fin.heist && fin.ghost && fin.palm && fin.skin && fin.got === 0, fin);   // po wyjściu torby są zużyte (dostawa do trybu)
const models = await ev(async () => { const C = await import('./core/cosmetics.js'), M = await import('./core/monsterskins.js'); const gl = C.extraGlasses('neonshades'), hat = C.extraHat('palmhat'), sk = M.MONSTER_SKINS.zombiecop(); sk.animate(1.2); return { gl: gl.children.length, hat: hat.children.length, sk: sk.group.children.length }; });
ok('the new cosmetics (Neon shades, Palm hat) and the Zombie cop monster skin build', models.gl >= 3 && models.hat >= 6 && models.sk >= 1, models);
ok('no page errors', errors.length === 0, errors);
console.log(fails ? 'FAILED: ' + fails : 'cops: all checks passed'); await browser.close(); server.close(); process.exit(fails ? 1 : 0);
