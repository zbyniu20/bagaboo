// Test w przeglądarce: grafika (AO wypalone w shaderze bloków, mokre podłogi, zardzewiałe ściany, krwiste oczy potworów).
// Użycie:  cd tests && CHROMIUM_PATH=... node gfx.mjs      (wymaga npm ci; nie jest częścią testów szybkich ani smoke)
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
const wait = (ms) => page.waitForTimeout(ms);
const scan = () => page.evaluate(async () => {
    const E = await import('./core/engine.js'), out = { walls: 0, floors: 0, ceilings: 0, plain: 0, wet: 0, rust: 0, calls: E.renderer ? 0 : 0, shaderErr: false };
    E.L.root.traverse(o => { if (!o.isMesh || !o.material || Array.isArray(o.material)) return; const m = o.material, ao = m.userData && m.userData.ao; if (!ao) return;
        if (ao.x > 0) out.walls++; else if (ao.z > 0) out.floors++; else if (ao.w > 0) out.ceilings++; else out.plain++;
        if (m.roughnessMap && m.roughnessMap === E.tex.floorWet) out.wet++; if (m.map && m.map === E.tex.wallRust) out.rust++; });
    return out;
});
await page.evaluate(async () => { const M = await import('./main.js'); await M.loadLevel('hospital'); }); await wait(2500);
let s = await scan();
ok('hospital: the walls carry base AO, the big floor edge AO, and the floor uses the wet roughness map', s.walls >= 4 && s.floors >= 1 && s.wet >= 1, s);
await page.evaluate(async () => { const M = await import('./main.js'); await M.loadLevel('laundry'); }); await wait(2500);
s = await scan(); ok('laundry: rusty walls with AO and a wet floor', s.walls >= 2 && s.rust >= 2 && s.wet >= 1 && s.floors >= 1, s);
await page.evaluate(async () => { const M = await import('./main.js'); await M.loadLevel('lobby'); }); await wait(2500);
s = await scan(); ok('lobby: the big floor gets edge AO, the walls base AO', s.floors >= 1 && s.walls >= 1, s);
const eye = await page.evaluate(async () => {
    const E = await import('./core/engine.js'), Mq = await import('./core/mannequin.js'), T = await import('./core/textures.js'), m = Mq.buildMannequin(T.mkRng(5)); Mq.addMonsterFace(m.head, { open: 0.045 });
    const eyes = []; m.head.traverse(o => { if (o.isMesh && o.material && o.material.map && o.material.map === E.tex.eyeBloodshot) eyes.push(o); });
    let spit = 0, gum = 0; m.head.traverse(o => { if (o.isMesh && o.material && o.material.transparent && o.material.clearcoat === 1) spit++; if (o.isMesh && o.geometry.type === 'BoxGeometry' && o.material.clearcoat === 0.8) gum++; });
    const c = E.tex.eyeBloodshot.image; return { eyes: eyes.length, spit: spit, gum: gum, w: c.width, h: c.height };
});
ok('monsters: the bloodshot eye map is used, with saliva strings and gums when the mouth is open', eye.eyes >= 1 && eye.spit >= 2 && eye.gum >= 1 && eye.w === 512 && eye.h === 256, eye);
ok('no page errors', errors.length === 0, errors.slice(0, 5));
await browser.close(); server.close();
console.log(fails ? 'FAILED: ' + fails : 'gfx: all checks passed'); process.exit(fails ? 1 : 0);
