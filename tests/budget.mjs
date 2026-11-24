// Narzędzie: budżet wywołań rysowania głównego przebiegu (bez cieni, jak w smoke) z rekwizytami i snopami światła oraz bez nich.\n// Użycie: cd tests && QUALITY=medium CHROMIUM_PATH=... node budget.mjs\nimport { chromium } from 'playwright';
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
const Q = process.env.QUALITY || 'medium';
await page.evaluate((q) => { try { localStorage.setItem('bagaboo_settings', JSON.stringify({ ver: 2, quality: q })); } catch (e) {} }, Q);
let fails = 0; const ok = (name, cond, extra) => { if (cond) console.log('ok  ', name); else { fails++; console.log('FAIL', name, extra === undefined ? '' : JSON.stringify(extra)); } };
const BUDGET = { default: 260, laundry: 230 }, LEVELS = (process.env.LEVELS || 'hospital,catacombs,cemetery,nursery,laundry,silence,furas,maze').split(',');
await page.reload(); await page.waitForFunction(() => /Ready|Could not/.test(document.getElementById('status').innerText), null, { timeout: 120000 });
await page.click('#btnGuest', { timeout: 90000 }); await page.click('#btnSolo', { timeout: 90000 }); await page.waitForTimeout(1200);
for (const id of LEVELS) {
    await page.evaluate(async (id) => { const M = await import('./main.js'); await M.loadLevel(id); }, id);
    await page.waitForTimeout(3500);
    const r = await page.evaluate(async () => {
        const E = await import('./core/engine.js'), R = E.renderer, I = R.info, ex = []; E.scene.traverse(o => { if (o.name === 'lampShafts' || /^props_/.test(o.name)) ex.push(o); });
        const sm = R.shadowMap.enabled; R.shadowMap.enabled = false;
        const draw = () => { I.reset(); R.render(E.scene, E.camera); return I.render.calls; };
        draw(); const withAll = draw(); ex.forEach(o => o.visible = false); const base = draw(); ex.forEach(o => o.visible = true); R.shadowMap.enabled = sm;
        return { withAll, base, added: withAll - base };
    });
    const lim = BUDGET[id] || BUDGET.default;
    console.log('     ', id, Q, JSON.stringify(r), 'budżet', lim);
    ok(id + ': main pass within the budget with props and shafts', r.withAll <= lim, r);
}
await browser.close(); server.close();
console.log(fails ? 'budget: FAILED' : 'budget: all checks passed'); process.exit(fails ? 1 : 0);
