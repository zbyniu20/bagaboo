// Test w przeglądarce: snopy światła pod lampami (core/shafts.js). Użycie: cd tests && CHROMIUM_PATH=... node shafts.mjs
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
await page.click('#btnGuest', { timeout: 90000 }); await page.click('#btnSolo', { timeout: 90000 });
await page.waitForTimeout(1500);
let fails = 0; const ok = (name, cond, extra) => { if (cond) console.log('ok  ', name); else { fails++; console.log('FAIL', name, extra === undefined ? '' : JSON.stringify(extra)); } };
const LEVELS = (process.env.LEVELS || 'hospital,catacombs,hotel,laundry,lobby,cemetery').split(',');
for (const id of LEVELS) {
    await page.evaluate(async (id) => { const M = await import('./main.js'); await M.loadLevel(id); }, id);
    await page.waitForTimeout(2500);
    const r = await page.evaluate(async () => {
        const E = await import('./core/engine.js'), S = await import('./core/shafts.js'); let n = 0, tris = 0, finite = true;
        E.scene.traverse(o => { if (o.name === 'lampShafts' && o.isMesh) { n++; const p = o.geometry.attributes.position; tris += o.geometry.index.count / 3; for (let i = 0; i < p.array.length; i++) if (!Number.isFinite(p.array[i])) finite = false; } });
        const meshes = []; E.scene.traverse(o => { if (o.name === 'lampShafts' && o.isMesh) meshes.push(o); });
        const draw = () => { E.renderer.info.reset(); E.renderer.render(E.scene, E.camera); return E.renderer.info.render.calls; };
        draw(); const withS = draw(); meshes.forEach(m => m.visible = false); const withoutS = draw(); meshes.forEach(m => m.visible = true);
        return { n, tris, finite, count: S.shaftInfo.count, calls: withS, extra: withS - withoutS };
    });
    ok(id + ': lamp shafts are one merged mesh (or none when no lamp qualifies), finite, within 6 cones', r.n <= 1 && r.finite && r.count <= 6 && (r.n === 0 || r.tris === r.count * 32), r);
    ok(id + ': the shafts add at most one draw call', r.extra <= 1, r);
    console.log('     ', id, JSON.stringify(r));
}
ok('no page errors', errors.length === 0, errors);
await browser.close(); server.close();
if (errors.length) console.log(errors.join('\n'));
console.log(fails ? 'shafts: FAILED' : 'shafts: all checks passed'); process.exit(fails || errors.length ? 1 : 0);
