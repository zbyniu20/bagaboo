// Test w przeglądarce: Scary GTA: wnętrza budynków (wejście przez drzwi, kolizje mebli, strzały i wzrok przez drzwi, światło). Użycie: CHROMIUM_PATH=... node interiors.mjs
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
const cityInfo = await ev(async () => { const G = await import('./levels/scarygta.js'); return { b: G.debugBuildings().filter(b => b.interior), boxes: G.debugBoxes() }; });
ok('the city has four interiors (casino, motel, shop, warehouse) with doors, and the occluders come from the hollow walls', cityInfo.b.length === 4 && cityInfo.b.map(b => b.interior).sort().join() === 'casino,motel,shop,warehouse' && cityInfo.b.every(b => b.hollow && b.door) && cityInfo.boxes > 60, cityInfo);
// wejście do każdego wnętrza przez drzwi
const walkRes = await ev(async (list) => {
    const P = await import('./core/player.js'), w = (ms) => new Promise(r => setTimeout(r, ms)), out = {};
    const dirs = { N: [0, 1], S: [0, -1], W: [1, 0], E: [-1, 0] };
    for (const b of list) {
        const cx = (b.x0 + b.x1) / 2, cz = (b.z0 + b.z1) / 2, [dx, dz] = dirs[b.door];
        const sx = b.door === 'N' ? cx : b.door === 'S' ? cx : (b.door === 'W' ? b.x0 - 1.5 : b.x1 + 1.5), sz = b.door === 'W' || b.door === 'E' ? cz : (b.door === 'N' ? b.z0 - 1.5 : b.z1 + 1.5);
        P.setPlayerPosition(sx, 1.2, sz); await w(300);
        const depthOf = () => { const p = P.playerBody.position; return b.door === 'N' ? p.z - b.z0 : b.door === 'S' ? b.z1 - p.z : b.door === 'W' ? p.x - b.x0 : b.x1 - p.x; };
        for (let i = 0; i < 30 && depthOf() < 3; i++) { P.playerBody.velocity.set(dx * 8, P.playerBody.velocity.y, dz * 8); await w(100); }
        const p = P.playerBody.position, depth = depthOf();
        out[b.interior] = { depth: +depth.toFixed(1), y: +p.y.toFixed(1) };
    }
    return out;
}, cityInfo.b);
ok('the player walks through the door into every interior and is not pushed out (more than 1.2 m deep, past the wall, on the floor)', Object.values(walkRes).length === 4 && Object.values(walkRes).every(v => v.depth > 1.2 && v.y < 2.5), walkRes);
// strzał z wnętrza przez drzwi trafia, przez ścianę nie
const shotRes = await ev(async (list) => {
    const N = await import('./core/network.js'), G = await import('./levels/scarygta.js'), P = await import('./core/player.js'), E = await import('./core/engine.js'), w = (ms) => new Promise(r => setTimeout(r, ms));
    const S = G.testState(), b = list.find(q => q.interior === 'casino'), cz = (b.z0 + b.z1) / 2; N.NET.mode = 'host'; S.sim.reset(); S.bustUntil = {};
    const fire = async (tz) => {
        P.setPlayerPosition(b.x0 + 6, 1.2, cz); await w(500); N.playersState['g1'] = { lvl: 'scarygta', head: { p: [b.x0 - 3, 1.6, tz] }, h1: { p: [0, 0, 0] }, h2: { p: [0, 0, 0] }, profile: { name: 'Bob' } }; await w(500);
        S.gunS = { me: S.gunS.me }; S.mode = 'ffa'; S.gm = Object.assign(S.gm, { phase: 'idle' });
        const c = E.camera.getWorldPosition(new E.THREE.Vector3()), v = [b.x0 - 3 - c.x, 1.6 - c.y, tz - c.z], l = Math.hypot(...v); G.debugShoot('me', [c.x, c.y, c.z], v.map(q => q / l));
        const hp = S.gunS['g1'] ? S.gunS['g1'].hp : 100; delete N.playersState['g1']; return hp;
    };
    const through = await fire(cz), wall = await fire(cz + 3.4);
    N.NET.mode = 'solo'; return { through, wall };
}, cityInfo.b);
ok('a shot from inside the casino through the open door hits the target outside (50 damage), a shot through the wall does not', shotRes.through === 50 && shotRes.wall === 100, shotRes);
// wzrok policji przez drzwi
const losRes = await ev(async (list) => {
    const G = await import('./levels/scarygta.js'), AI = await import('./core/cityai.js'), S = G.testState(), b = list.find(q => q.interior === 'warehouse'), cz = (b.z0 + b.z1) / 2;
    return { door: AI.lineBlocked([b.x0 - 3, 1.5, cz], [b.x0 + 6, 1.2, cz], S.boxes), wall: AI.lineBlocked([b.x0 - 3, 1.5, cz + 3.5], [b.x0 + 6, 1.2, cz + 3.5], S.boxes) };
}, cityInfo.b);
ok('cops standing in the street see through the open door into the warehouse but not through its wall', losRes.door === false && losRes.wall === true, losRes);
// kolizje mebli: skrzynia w magazynie jest przeszkodą
const colRes = await ev(async (list) => {
    const E = await import('./core/engine.js'), IL = await import('./core/interiorlogic.js'), CY = await import('./core/citylayout.js'), b = CY.cityWithInteriors(1337).find(q => q.interior === 'warehouse'), m = IL.furniture(b).find(q => q.solid && q.y1 >= 3);
    const cx = (m.x0 + m.x1) / 2, cz = (m.z0 + m.z1) / 2, hit = E.L.obstacles.some(o => o.box3 && o.box3.min.x <= cx && o.box3.max.x >= cx && o.box3.min.z <= cz && o.box3.max.z >= cz && o.box3.max.y >= 2.9);
    return { hit, n: IL.furniture(b).length };
}, cityInfo.b);
ok('furniture is solid: the crate stack of the warehouse is an obstacle for the player', colRes.hit === true, colRes);
// widoczność: kwartał z wnętrzem znika z renderu, gdy jesteś daleko
const visRes = await ev(async (list) => { const G = await import('./levels/scarygta.js'), P = await import('./core/player.js'), w = (ms) => new Promise(r => setTimeout(r, ms)), b = list.find(q => q.interior === 'casino'); P.setPlayerPosition(-60, 1.2, 40); await w(1500); const far = G.debugCity().visible; P.setPlayerPosition(b.x0 + 6, 1.2, (b.z0 + b.z1) / 2); await w(1500); return { far, near: G.debugCity().visible, all: G.debugCity().chunks }; }, cityInfo.b);
ok('chunks (with the interiors) are still culled by distance', visRes.far < visRes.all && visRes.near > 0, visRes);
ok('no page errors', errors.length === 0, errors);
console.log(fails ? 'FAILED: ' + fails : 'interiors: all checks passed'); await browser.close(); server.close(); process.exit(fails ? 1 : 0);
