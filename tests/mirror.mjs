// Narzędzie deweloperskie i test: lustro w lobby pokazuje postać gracza. Użycie: CHROMIUM_PATH=... node mirror.mjs [katalog na zrzut]
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
const OUT = process.argv[2] || '/tmp/mirror'; fs.mkdirSync(OUT, { recursive: true });
const page = await ctx.newPage(), errs = []; page.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message)); page.on('console', (m) => { if (m.type() === 'error' && !/peerjs|favicon|Failed to load resource/i.test(m.text())) errs.push('CONSOLE ' + m.text().slice(0, 300)); });
await page.goto(`http://localhost:${port}/?three=${V}`);
await page.waitForFunction(() => /Ready|Could not/.test(document.getElementById('status').innerText), null, { timeout: 120000 });
await page.click('#btnGuest', { timeout: 90000 }); await page.click('#btnSolo', { timeout: 90000 });
await page.waitForTimeout(2500);
await page.evaluate(async () => { const P = await import('./core/player.js'); P.setPlayerPosition(-12.6, 1.4, 3.2); });
await page.waitForTimeout(1500);
const r = await page.evaluate(async () => {
    const E = await import('./core/engine.js'), T = E.THREE, cam = new T.PerspectiveCamera(50, 4 / 5, 0.1, 60), rd = E.renderer;
    cam.position.set(-11.4, 1.7, 3.2); cam.lookAt(-14.9, 1.4, 3.2);   // patrzy w lustro; gracz stoi pomiędzy
    const sz = rd.getSize(new T.Vector2()); rd.setViewport(0, 0, sz.x, sz.y); rd.render(E.scene, cam);
    let rcLayer = null; E.scene.traverse(o => { if (o.getReflectionCamera) rcLayer = o.getReflectionCamera(cam).layers.isEnabled(5); });
    let mirrorLayer = 0, meMeshes = 0; E.scene.traverse(o => { if (o.layers && o.layers.isEnabled(5)) { mirrorLayer++; if (o.isMesh) meMeshes++; } });
    return { png: rd.domElement.toDataURL('image/png').split(',')[1], mirrorLayer, meMeshes, rcLayer };
});
fs.writeFileSync(path.join(OUT, 'mirror.png'), Buffer.from(r.png, 'base64')); console.log('mirror layer objects', r.mirrorLayer, 'meshes', r.meMeshes, 'reflection camera sees the mirror layer:', r.rcLayer, 'errors', JSON.stringify(errs));
const good = r.rcLayer === true && r.meMeshes > 0 && errs.length === 0; console.log(good ? 'mirror: all checks passed' : 'mirror: FAILED');
await browser.close(); server.close();
