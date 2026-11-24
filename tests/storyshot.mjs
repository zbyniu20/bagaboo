// Narzędzie: zrzuty śladów grozy (addStoryProps) w poziomach: gracz staje przed jednym śladem na ścianie i jednym na podłodze.
// Użycie:  cd tests && CHROMIUM_PATH=... node storyshot.mjs wyjście poziom1,poziom2
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
const OUT = process.argv[2] || path.join(HERE, 'shots'), LEVELS = (process.argv[3] || 'catacombs').split(',');
fs.mkdirSync(OUT, { recursive: true });
for (const lv of LEVELS) {
    await page.evaluate(async (id) => { const M = await import('./main.js'); await M.loadLevel(id); }, lv);
    await page.waitForTimeout(2500);
    const info = await page.evaluate(async () => {
        const E = await import('./core/engine.js'), P = await import('./core/player.js'), g = E.L.root.getObjectByName('storyProps');
        if (!g) return { none: true };
        const out = { meshes: g.children.length, calls: g.children.length, shots: [] };
        for (const mesh of g.children) {
            const pos = mesh.geometry.attributes.position; if (!pos.count) continue;
            // pierwszy wierzchołek pierwszego decala: bierzemy środek czwórki wierzchołków
            const x = (pos.getX(0) + pos.getX(2)) / 2, y = (pos.getY(0) + pos.getY(2)) / 2, z = (pos.getZ(0) + pos.getZ(2)) / 2, nrm = mesh.geometry.attributes.normal;
            out.shots.push({ x, y, z, nx: nrm.getX(0), ny: nrm.getY(0), nz: nrm.getZ(0), dims: pos.count });
        }
        return out;
    });
    console.log(lv, JSON.stringify({ meshes: info.meshes, shots: info.shots && info.shots.length }));
    if (info.none) continue;
    let i = 0;
    for (const sh of info.shots.slice(0, 3)) {
        await page.evaluate(async (sh) => {
            const P = await import('./core/player.js'), E = await import('./core/engine.js');
            const wall = Math.abs(sh.ny) < 0.5, d = 2.2;
            const px = wall ? sh.x + sh.nx * d : sh.x, pz = wall ? sh.z + sh.nz * d : sh.z + d, py = wall ? sh.y - 0.2 : sh.y + 1.7;
            P.setPlayerPosition(px, py - 1.5, pz);
            E.camera.parent && E.camera.parent.updateMatrixWorld(true);
            E.camera.lookAt && 0;
            window.__look = { x: sh.x, y: sh.y, z: sh.z };
        }, sh);
        await page.waitForTimeout(600);
        await page.screenshot({ path: path.join(OUT, `story-${lv}-${i++}.png`) });
    }
}
console.log('errors:', errors.length, errors.slice(0, 5)); await browser.close(); server.close();
