// Test w przeglądarce: decale (core/decals.js). Użycie: cd tests && CHROMIUM_PATH=... node decals.mjs
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
const WITH = (process.env.WITH || 'hospital,catacombs,cemetery,nursery,laundry,silence,furas,maze,hotel,well,memory,lobby,levels,home,wardrobe').split(','), WITHOUT = (process.env.WITHOUT || 'lava,hideseek,redlight,room000').split(',');
const probe = () => page.evaluate(async () => {
    const E = await import('./core/engine.js'), D = await import('./core/decals.js'); let m = null, n = 0; E.scene.traverse(o => { if (o.name === 'levelDecals') { m = o; n++; } });
    const draw = () => { E.renderer.info.reset(); E.renderer.render(E.scene, E.camera); return E.renderer.info.render.calls; };
    let extra = 0, finite = true, quads = 0; if (m) { draw(); const a = draw(); m.visible = false; const b = draw(); m.visible = true; extra = a - b; quads = m.geometry.index.count / 6; const p = m.geometry.attributes.position.array; for (let i = 0; i < p.length; i++) if (!Number.isFinite(p[i])) finite = false; }
    return { meshes: n, count: D.decalInfo.count, quads, extra, finite, alphaOk: m ? m.geometry.attributes.color.itemSize === 4 : true };
});
for (const id of [...WITH, ...WITHOUT]) {
    await page.evaluate(async (id) => { const M = await import('./main.js'); await M.loadLevel(id); }, id);
    await page.waitForTimeout(2500);
    const r = await probe(), want = WITH.includes(id);
    if (want) ok(id + ': one merged decal mesh with plausible count, finite, RGBA colours, at most +1 draw call', r.meshes === 1 && r.count >= 5 && r.quads === r.count && r.finite && r.alphaOk && r.extra <= 1, r);
    else ok(id + ': no decals (games, calm mode and Room 000)', r.meshes === 0 && r.count === 0, r);
    console.log('     ', id, JSON.stringify(r));
}
ok('no page errors', errors.length === 0, errors);
await browser.close(); server.close();
if (errors.length) console.log(errors.join('\n'));
console.log(fails ? 'decals: FAILED' : 'decals: all checks passed'); process.exit(fails || errors.length ? 1 : 0);
