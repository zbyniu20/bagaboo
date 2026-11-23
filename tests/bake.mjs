// Test w przeglądarce: wypalone oświetlenie i paleta poziomów (zrzuty z wypalaniem i bez, czas, dane wierzchołków).
// Użycie:  cd tests && CHROMIUM_PATH=... node bake.mjs [katalog na zrzuty]   (nie jest częścią testów szybkich ani smoke)
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
const OUT = process.argv[2] || '', LEVELS = (process.env.LEVELS || 'hospital,catacombs,hotel,laundry,lava,lobby').split(',');
if (OUT) fs.mkdirSync(OUT, { recursive: true });
let fails = 0; const ok = (name, cond, extra) => { if (cond) console.log('ok  ', name); else { fails++; console.log('FAIL', name, extra === undefined ? '' : JSON.stringify(extra)); } };
async function run(bake) {
    const page = await ctx.newPage(), errs = [];
    page.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message));
    page.on('console', (m) => { if (m.type() === 'error' && !/peerjs|favicon|Failed to load resource/i.test(m.text())) errs.push('CONSOLE ' + m.text().slice(0, 300)); });
    await page.goto(`http://localhost:${port}/?three=${V}` + (bake ? '' : '&bake=0'));
    await page.waitForFunction(() => /Ready|Could not/.test(document.getElementById('status').innerText), null, { timeout: 120000 });
    await page.click('#btnGuest', { timeout: 90000 }); await page.click('#btnSolo', { timeout: 90000 });
    await page.waitForTimeout(1500);
    const res = {};
    for (const id of LEVELS) {
        await page.evaluate(async (id) => { const M = await import('./main.js'); await M.loadLevel(id); }, id);
        await page.waitForTimeout(2500);
        res[id] = await page.evaluate(async () => {
            const B = await import('./core/lightbake.js'), E = await import('./core/engine.js'), info = Object.assign({}, B.bakeInfo);
            let bakedMeshes = 0, nonzero = 0, maxv = 0, finite = true, total = 0;
            for (const e of E.L.bakeList) { const a = e.mesh.geometry.attributes.aBake; if (!a) continue; if (e.mesh.material.userData.baked) bakedMeshes++; for (let i = 0; i < a.array.length; i++) { const v = a.array[i]; if (!isFinite(v) || v < 0) finite = false; if (v > 0.001) nonzero++; if (v > maxv) maxv = v; total++; } }
            E.renderer.info.autoReset = true;
            return { info, bakedMeshes, blocks: E.L.bakeList.length, nonzero, total, maxv, finite };
        });
        if (OUT) await page.screenshot({ path: path.join(OUT, id + '-' + (bake ? 'bake' : 'off') + '.png') });
    }
    res.errors = errs; await page.close(); return res;
}
const on = await run(true), off = await run(false);
for (const id of LEVELS) {
    const a = on[id], b = off[id];
    console.log(id, 'bake', JSON.stringify({ ms: Math.round(a.info.ms), meshes: a.info.meshes, verts: a.info.verts, lights: a.info.lights, cell: +a.info.cell.toFixed(2), nonzero: a.nonzero, total: a.total, max: +a.maxv.toFixed(2) }));
    ok(id + ': the bake finishes quickly (under 3 s even in software rendering)', a.info.ms < 3000, a.info.ms);
    ok(id + ': baked values are finite, non-negative and capped', a.finite && a.maxv <= 1.0001, a);
    if (a.info.lights > 0) ok(id + ': with lights the blocks get geometry and some lit vertices', a.info.meshes > 0 && a.nonzero > 0, a);
    ok(id + ': with ?bake=0 nothing is baked', b.info.meshes === 0 && b.bakedMeshes === 0 && b.nonzero === 0, b);
}
ok('no page errors (bake on)', on.errors.length === 0, on.errors); ok('no page errors (bake off)', off.errors.length === 0, off.errors);
await browser.close(); server.close();
console.log(fails ? 'bake: FAILED ' + fails : 'bake: all checks passed'); process.exit(fails ? 1 : 0);
