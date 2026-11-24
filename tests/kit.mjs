// Test w przeglądarce: elementy architektury (core/kit.js). Użycie: cd tests && CHROMIUM_PATH=... node kit.mjs
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
const WITH = (process.env.WITH || 'hospital,catacombs,cemetery,nursery,laundry,silence,furas,maze,hotel,well,memory,lobby,levels,home,wardrobe').split(','), WITHOUT = (process.env.WITHOUT || 'lava,hideseek,redlight,room000').split(',');
const probe = () => page.evaluate(async () => {
    const E = await import('./core/engine.js'), K = await import('./core/kit.js'), ms = []; E.scene.traverse(o => { if (o.isInstancedMesh && /^kit_/.test(o.name)) ms.push(o); });
    const draw = () => { E.renderer.info.reset(); E.renderer.render(E.scene, E.camera); return E.renderer.info.render.calls; };
    draw(); const a = draw(); ms.forEach(m => m.visible = false); const b = draw(); ms.forEach(m => m.visible = true);
    let n = 0, finite = true, tris = 0; for (const m of ms) { n += m.count; tris += (m.geometry.index ? m.geometry.index.count : m.geometry.attributes.position.count) / 3 * m.count; const arr = m.instanceMatrix.array; for (let i = 0; i < m.count * 16; i++) if (!Number.isFinite(arr[i])) finite = false; }
    return { meshes: ms.length, count: K.kitInfo.placed, instances: n, kinds: K.kitInfo.kinds, extra: a - b, finite, tris: Math.round(tris) };
});
const results = {}, HUBS = ['lobby', 'levels', 'home', 'wardrobe'];
for (const id of [...WITH, ...WITHOUT]) {
    await page.evaluate(async (id) => { const M = await import('./main.js'); await M.loadLevel(id); }, id);
    await page.waitForTimeout(2500);
    const r = await probe(), want = WITH.includes(id); results[id] = r;
    if (want) ok(id + ': a few instanced meshes (one draw call per kind, at most 5), finite, plausible count', r.meshes <= 5 && r.meshes === r.kinds && r.instances === r.count && r.finite && r.extra <= r.meshes && r.tris < 20000, r);
    else ok(id + ': no kit pieces (games, calm mode and Room 000)', r.meshes === 0 && r.count === 0, r);
    console.log('     ', id, JSON.stringify(r));
}
const lv = WITH.filter(id => !HUBS.includes(id));
ok('every level (not a hub) gets at least one piece, and most get 20 or more (a few walls give few pieces, hubs may get none by chance)', lv.every(id => results[id].count >= 1) && lv.filter(id => results[id].count >= 20).length >= 6, lv.map(id => id + ':' + results[id].count));
ok('no page errors', errors.length === 0, errors);
await browser.close(); server.close();
if (errors.length) console.log(errors.join('\n'));
console.log(fails ? 'kit: FAILED' : 'kit: all checks passed'); process.exit(fails || errors.length ? 1 : 0);
