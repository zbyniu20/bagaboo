// Narzędzie deweloperskie: zrzuty modeli potworów w prawdziwych poziomach (kamera z bliska). Użycie: CHROMIUM_PATH=... node monsterview.mjs katalog poziom1,poziom2
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
const OUT = process.argv[2] || '/tmp/mv', LEVELS = (process.argv[3] || 'hospital').split(','); fs.mkdirSync(OUT, { recursive: true });
const page = await ctx.newPage(); page.on('pageerror', (e) => console.log('PAGEERROR', e.message));
await page.goto(`http://localhost:${port}/?three=${V}`);
await page.waitForFunction(() => /Ready|Could not/.test(document.getElementById('status').innerText), null, { timeout: 120000 });
await page.click('#btnSolo', { timeout: 90000 });
await page.waitForTimeout(1500);
for (const lvl of LEVELS) {
    await page.evaluate(async (l) => { const M = await import('./main.js'); await M.loadLevel(l); }, lvl); await page.waitForTimeout(4500);
    const shots = await page.evaluate(async () => {
        const E = await import('./core/engine.js'), T = E.THREE, out = [], seen = [];
        E.L.root.traverse(o => { if (o.isSkinnedMesh) { let h = o; while (h.parent && h.parent !== E.L.root) h = h.parent; if (!seen.includes(h)) seen.push(h); } });
        const cam = new T.PerspectiveCamera(45, 4 / 5, 0.1, 80), r = E.renderer;
        for (const h of seen.slice(0, 3)) {
            const box = new T.Box3().setFromObject(h), c = box.getCenter(new T.Vector3()), size = box.getSize(new T.Vector3()), d = Math.max(size.y, 1) * 1.7;
            const f = new T.Vector3(0, 0, 1).applyQuaternion(h.getWorldQuaternion(new T.Quaternion()));   // przód modelu = +Z
            cam.position.set(c.x + f.x * d + 0.3, c.y + 0.1, c.z + f.z * d); cam.lookAt(c.x, c.y + size.y * 0.1, c.z);
            const sz = r.getSize(new T.Vector2()); r.setViewport(0, 0, sz.x, sz.y); r.render(E.scene, cam); out.push({ png: r.domElement.toDataURL('image/png').split(',')[1], h: +size.y.toFixed(2) });
        }
        return out;
    });
    shots.forEach((s, i) => { fs.writeFileSync(path.join(OUT, `${lvl}-${i}.png`), Buffer.from(s.png, 'base64')); console.log(lvl, i, 'height', s.h); });
    if (!shots.length) console.log(lvl, 'no skinned monsters found');
}
await browser.close(); server.close();
