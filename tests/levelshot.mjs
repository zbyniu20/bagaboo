// Narzędzie: zrzuty poziomów do oceny wyglądu. Użycie: cd tests && SRC_ROOT=.. TAG=po LEVELS=hospital,lobby CHROMIUM_PATH=... node levelshot.mjs katalog
import { chromium } from 'playwright';
import fs from 'fs'; import path from 'path'; import http from 'http';
import { fileURLToPath } from 'url';
const HERE = path.dirname(fileURLToPath(import.meta.url)), ROOT = process.env.SRC_ROOT ? path.resolve(process.env.SRC_ROOT) : path.resolve(HERE, '..'), DEPS = path.join(HERE, 'node_modules');
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
const OUT = process.argv[2] || '', LEVELS = (process.env.LEVELS || 'hospital,catacombs,laundry,lobby').split(','), TAG = process.env.TAG || 'shot';
if (!OUT) { console.log('Użycie: node levelshot.mjs katalog_wyjściowy   (SRC_ROOT=ścieżka do źródeł, LEVELS=a,b, TAG=nazwa)'); process.exit(1); }
fs.mkdirSync(OUT, { recursive: true });
const page = await ctx.newPage(), errs = [];
page.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message));
page.on('console', (m) => { if (m.type() === 'error' && !/peerjs|favicon|Failed to load resource/i.test(m.text())) errs.push('CONSOLE ' + m.text().slice(0, 300)); });
await page.goto(`http://localhost:${port}/?three=${V}`);
await page.waitForFunction(() => /Ready|Could not/.test(document.getElementById('status').innerText), null, { timeout: 120000 });
await page.click('#btnGuest', { timeout: 90000 }); await page.click('#btnSolo', { timeout: 90000 });
await page.waitForTimeout(1500);
for (const id of LEVELS) {
    await page.evaluate(async (id) => { const M = await import('./main.js'); await M.loadLevel(id); }, id);
    await page.waitForTimeout(3000);
    await page.evaluate(async () => { try { const T = await import('./core/tutorial.js'); T.skipTutorial(); } catch (e) {} });
    if (process.env.WALL) {
        const w = await page.evaluate(async (k) => {
            const E = await import('./core/engine.js'), PL = await import('./core/player.js'), D = await import('./core/desktop.js'), sp = E.L.spawn || [0, 1, 0], fy = E.L.floorY || 0, c = [];
            const obs = E.L.obstacles.filter(b => b.box3), inside = (x, z) => obs.some(b => b.box3.max.y > fy + 0.25 && b.box3.min.y < fy + 1.8 && x > b.box3.min.x && x < b.box3.max.x && z > b.box3.min.z && z < b.box3.max.z);
            for (const b of obs) { const q = b.box3; if (q.max.y - q.min.y < 2.2 || q.min.y > fy + 0.6) continue;
                for (const [nx, nz, len, cx, cz] of [[0, -1, q.max.x - q.min.x, (q.min.x + q.max.x) / 2, q.min.z], [0, 1, q.max.x - q.min.x, (q.min.x + q.max.x) / 2, q.max.z], [-1, 0, q.max.z - q.min.z, q.min.x, (q.min.z + q.max.z) / 2], [1, 0, q.max.z - q.min.z, q.max.x, (q.min.z + q.max.z) / 2]]) {
                    if (len < 3) continue; const px = cx + nx * 2.2, pz = cz + nz * 2.2; if (inside(px, pz) || inside(cx + nx * 0.4, cz + nz * 0.4) || px < E.L.bounds.minX || px > E.L.bounds.maxX || pz < E.L.bounds.minZ || pz > E.L.bounds.maxZ) continue;
                    c.push({ px, pz, yaw: Math.atan2(nx, nz), d: Math.hypot(px - sp[0], pz - sp[2]) }); } }
            c.sort((a, b) => a.d - b.d); const f = c[Math.min(c.length - 1, k)]; if (!f) return null;
            PL.setPlayerPosition(f.px, fy + 1.2, f.pz); D.setDesktopFacing(f.yaw); return f;
        }, Number(process.env.WALL) - 1);
        console.log('ściana:', JSON.stringify(w)); await page.waitForTimeout(1500);
    }
    if (process.env.CLEAN !== '0') await page.evaluate(async () => {   // HUD przy kamerze gra przestawia co klatkę, więc chowamy go dokładnie na czas rysowania
        const E = await import('./core/engine.js'), r = E.renderer, orig = r.render.bind(r);
        r.render = (sc, cam) => { const hid = []; for (const o of E.camera.children) if ((o.isMesh || o.isGroup) && o.visible) { o.visible = false; hid.push(o); } const out = orig(sc, cam); for (const o of hid) o.visible = true; return out; };
        for (const e of document.querySelectorAll('body *')) if (/^Desktop test mode/.test(e.innerText || '') && getComputedStyle(e).position === 'fixed') e.style.setProperty('display', 'none', 'important');
        const v = document.getElementById('VRButton'); if (v) v.style.setProperty('display', 'none', 'important');
    });
    if (process.env.NEARPROP) {
        const info = await page.evaluate(async (pick) => {
            const E = await import('./core/engine.js'), PL = await import('./core/player.js'), m = new E.THREE.Matrix4(), c = [];
            E.scene.traverse(o => { if (o.isInstancedMesh && /^props_/.test(o.name)) for (let i = 0; i < o.count; i++) { o.getMatrixAt(i, m); c.push([o.name, m.elements[12], m.elements[14]]); } });
            const free = (x, z) => !E.L.obstacles.some(b => b.box3 && b.box3.max.y > 0.25 && b.box3.min.y < 1.8 && x > b.box3.min.x - 0.5 && x < b.box3.max.x + 0.5 && z > b.box3.min.z - 0.5 && z < b.box3.max.z + 0.5);
            for (let k = 0; k < c.length; k++) { const [n, x, z] = c[(k + pick) % c.length]; if (free(x, z + 2.4)) { PL.setPlayerPosition(x, (E.L.floorY || 0) + 1.2, z + 2.4); return n; } }
            return null;
        }, Number(process.env.NEARPROP) - 1);
        console.log('rekwizyt:', info); await page.evaluate(async () => { const D = await import('./core/desktop.js'); D.setDesktopFacing(0); }); await page.waitForTimeout(Number(process.env.WAIT || 14000));
    }
    if (process.env.NOPROPS) await page.evaluate(async () => { const E = await import('./core/engine.js'); E.scene.traverse(o => { if (/^props_/.test(o.name)) o.visible = false; }); });
    if (process.env.NOSHAFTS) await page.evaluate(async () => { const E = await import('./core/engine.js'); E.scene.traverse(o => { if (o.name === 'lampShafts') o.visible = false; }); });
    await page.screenshot({ path: path.join(OUT, id + '-' + TAG + '.png') });
    console.log('zrzut', id);
}
console.log(errs.length ? errs.join('\n') : 'bez błędów strony');
await browser.close(); server.close();
