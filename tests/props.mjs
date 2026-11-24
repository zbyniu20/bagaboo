// Test w przeglądarce: rekwizyty w poziomach (core/props.js). Użycie: cd tests && CHROMIUM_PATH=... node props.mjs
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
const LEVELS = (process.env.LEVELS || 'hospital,catacombs,cemetery,nursery,laundry,silence,furas,maze').split(','), probe = () => page.evaluate(async () => {
    const E = await import('./core/engine.js'), P = await import('./core/props.js'), ms = []; E.scene.traverse(o => { if (o.isInstancedMesh && /^props_/.test(o.name)) ms.push(o); });
    const draw = () => { E.renderer.info.reset(); E.renderer.render(E.scene, E.camera); return E.renderer.info.render.calls; };
    draw(); const withP = draw(); ms.forEach(m => m.visible = false); const without = draw(); ms.forEach(m => m.visible = true);
    const pts = []; let tris = 0; for (const m of ms) { tris += (m.geometry.index ? m.geometry.index.count : m.geometry.attributes.position.count) / 3 * m.count; for (let i = 0; i < m.count; i++) { const a = new Float32Array(16); m.getMatrixAt(i, new E.THREE.Matrix4()); const mat = new E.THREE.Matrix4(); m.getMatrixAt(i, mat); pts.push([mat.elements[12], mat.elements[14]]); } }
    const bad = pts.filter(([x, z]) => E.L.obstacles.some(b => b.box3 && b.box3.max.y > 0.25 && b.box3.min.y < 1.6 && x > b.box3.min.x && x < b.box3.max.x && z > b.box3.min.z && z < b.box3.max.z)).length;
    const near = pts.filter(([x, z]) => Math.hypot(x - E.L.spawn[0], z - E.L.spawn[2]) < 5).length;
    return { meshes: ms.length, placed: P.propInfo.placed, kinds: P.propInfo.kinds, extra: withP - without, tris: Math.round(tris), bad, near, collidersAdded: 0 };
});
for (const id of LEVELS) {
    await page.evaluate(async (id) => { const M = await import('./main.js'); await M.loadLevel(id); }, id);
    await page.waitForTimeout(3500);
    const r = await probe();
    ok(id + ': props are placed as a few instanced meshes (one draw call per kind), inside no obstacle and not near the start', r.placed > 4 && r.meshes === r.kinds && r.meshes <= 9 && r.extra <= r.meshes && r.bad === 0 && r.near === 0, r);
    console.log('     ', id, JSON.stringify(r));
}
await page.evaluate(async () => { const M = await import('./main.js'); await M.loadLevel('lobby'); }); await page.waitForTimeout(1500);
const lobby = await probe(); ok('lobby: no props there', lobby.placed === 0 && lobby.meshes === 0, lobby);
// brak pliku: poziom ładuje się jak dotąd
const p2 = await ctx.newPage(), e2 = []; p2.on('pageerror', (e) => e2.push(e.message));
await p2.route(/props\.glb/, (r) => r.fulfill({ status: 404, body: '' }));
await p2.goto(`http://localhost:${port}/?three=${V}`); await p2.waitForFunction(() => /Ready|Could not/.test(document.getElementById('status').innerText), null, { timeout: 120000 });
await p2.click('#btnGuest', { timeout: 90000 }); await p2.click('#btnSolo', { timeout: 90000 }); await p2.waitForTimeout(1200);
await p2.evaluate(async () => { const M = await import('./main.js'); await M.loadLevel('hospital'); }); await p2.waitForTimeout(3000);
const miss = await p2.evaluate(async () => { const E = await import('./core/engine.js'), P = await import('./core/props.js'); let n = 0; E.scene.traverse(o => { if (o.isInstancedMesh && /^props_/.test(o.name)) n++; }); return { n, file: P.propInfo.file, obstacles: E.L.obstacles.length }; });
ok('missing props.glb: the level loads as before (no props, no errors)', miss.n === 0 && miss.file === false && miss.obstacles > 10 && e2.length === 0, [miss, e2]);
ok('no page errors', errors.length === 0, errors);
await browser.close(); server.close();
if (errors.length) console.log(errors.join('\n'));
console.log(fails ? 'props: FAILED' : 'props: all checks passed'); process.exit(fails || errors.length ? 1 : 0);
