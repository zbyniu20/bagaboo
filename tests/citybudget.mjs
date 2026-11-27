// Test w przeglądarce: lobby: bestiariusz, skrzynia nocna i sekrety (budowa, zapis, odkrywanie, jedno otwarcie dziennie). Użycie: CHROMIUM_PATH=... [SHOTDIR=katalog] node lobbyextras.mjs
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
const ev = (fn, arg) => page.evaluate(fn, arg);
const Q = process.env.QUALITY || 'medium';
await ev((q) => { try { localStorage.setItem('bagaboo_settings', JSON.stringify({ ver: 2, quality: q })); } catch (e) {} }, Q);
await ev(async () => { const M = await import('./main.js'); await M.loadLevel('scarygta'); });
await page.waitForTimeout(5000);
const BUDGET = +(process.env.BUDGET || 260);
const views = [['car bank (a)', -38, 1.2, -57, 3.14], ['car bank (b)', -38, 1.2, -67, 0], ['car casino', 0, 1.2, -57, 3.14], ['car motel', 0, 1.2, -19, 3.14], ['casino interior (facing the door)', 53, 1.2, -65, 1.57], ['casino interior (facing the slots)', 50, 1.2, -65, 3.14], ['spawn on the beach', 0, 1.2, 56, Math.PI], ['street crossing', -31, 1.2, -39, 0], ['boulevard centre', 0, 1.2, 40, 1.57], ['bank roof 38 m', -6, 39.5, -52, 0], ['casino roof 46 m', 24, 47.5, -52, 3.14], ['plaza', -3, 1.2, 18, 1.0]];
// z aktywnym helikopterem, policją i 5 gwiazdkami (najgorszy przypadek)
await ev(async () => { const G = await import('./levels/scarygta.js'); G.debugHeat(100); const S = G.testState(); for (let i = 0; i < 100 && S.heli.mode === 'away'; i++) await new Promise(r => setTimeout(r, 100)); });
const out = [];
for (const v of views) {
    const r = await ev(async ([x, y, z, yaw]) => {
        const PL = await import('./core/player.js'), D = await import('./core/desktop.js'), E = await import('./core/engine.js'), G = await import('./levels/scarygta.js');
        PL.setPlayerPosition(x, y, z); D.setDesktopFacing(yaw); await new Promise(r => setTimeout(r, 1500));
        const R = E.renderer, I = R.info, sm = R.shadowMap.enabled; R.shadowMap.enabled = false; I.reset(); R.render(E.scene, E.camera); const a = I.render.calls, tri = I.render.triangles; R.shadowMap.enabled = sm;
        return { calls: a, tris: tri, visible: G.debugCity().visible };
    }, v.slice(1));
    out.push(Object.assign({ view: v[0] }, r)); console.log('     ', v[0], JSON.stringify(r));
}
// ----- widok "stres": najgorszy przypadek zbudowany celowo (cała pula policji blisko kamery, 5 gwiazdek, helikopter, burza, noc z hordą, wnętrze kasyna przodem do drzwi) -----
const STRESS = +(process.env.STRESS || 210);
const measure = (breakdown) => ev(async (bd) => {
    const E = await import('./core/engine.js'), R = E.renderer, I = R.info, sm = R.shadowMap.enabled; R.shadowMap.enabled = false;
    const calls = () => { I.reset(); R.render(E.scene, E.camera); return I.render.calls; };
    const base = calls(), tri = I.render.triangles; let rows = null;
    if (bd) {
        rows = []; const tops = [].concat(E.scene.children.filter(o => o !== E.L.root), E.L.root.children).filter(o => o.visible);
        const describe = (o) => { let meshes = 0, skinned = 0, inst = 0, tr = 0; const mats = new Set(), names = []; o.traverse((q) => { if (q.isMesh || q.isPoints || q.isLine) { meshes++; if (q.isSkinnedMesh) skinned++; if (q.isInstancedMesh) inst++; if (q.transparent) tr++; const ms = [].concat(q.material || []); ms.forEach(m => { mats.add(m.uuid); if (names.length < 4 && m.name) names.push(m.name); }); } }); return { meshes, skinned, inst, mats: mats.size, names: names.join('/'), kids: o.children.length }; };
        for (const o of tops) { o.visible = false; const c = calls(); o.visible = true; const d = base - c; if (d > 0) rows.push({ d: d, type: o.type, name: o.name || '', desc: describe(o), geo: o.isInstancedMesh ? 'inst' + o.count : (o.geometry && o.geometry.attributes ? o.geometry.attributes.position.count + 'v' : '') }); }
        rows.sort((a, b) => b.d - a.d); rows = rows.slice(0, 14);
    }
    R.shadowMap.enabled = sm; return { calls: base, tris: tri, rows: rows };
}, !!breakdown);
const stress = await ev(async () => {
    const PL = await import('./core/player.js'), D = await import('./core/desktop.js'), G = await import('./levels/scarygta.js');
    G.debugGtaNight('horde', 1e9); G.debugWx('storm'); G.debugHeat(100);
    PL.setPlayerPosition(53, 1.2, -65); D.setDesktopFacing(1.57);
    for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; G.debugSpawnCop(53 + Math.cos(a) * (6 + (i % 3) * 7), -65 + Math.sin(a) * (6 + (i % 3) * 7)); }
    await new Promise(r => setTimeout(r, 3000)); return G.debugCops();
});
const st = await measure(!!process.env.BREAKDOWN); st.cops = stress;
console.log('      STRESS casino interior, all cops, storm, horde', JSON.stringify({ calls: st.calls, tris: st.tris, cops: st.cops }));
if (st.rows) for (const r of st.rows) console.log('        ', JSON.stringify(r));
ok('the stress view (all ' + 10 + ' cops, 5 stars, heli, storm, horde, casino interior) stays within ' + STRESS + ' draw calls', st.calls <= STRESS, st);
ok('in the stress view at most ' + 3 + ' cops have a full model and the cop calls stay within their bound', st.cops && st.cops.full <= 3 && st.cops.calls <= st.cops.max, st.cops);
const worst = Math.max(...out.map(o => o.calls));
ok('the worst view stays within the main-pass budget of ' + BUDGET + ' draw calls (' + Q + ')', worst <= BUDGET, out);
console.log('worst: ' + worst + ' draw calls, ' + Math.max(...out.map(o => o.tris)) + ' triangles');
ok('no page errors', errors.length === 0, errors);
console.log(fails ? 'citybudget: FAILED' : 'citybudget: all checks passed'); await browser.close(); server.close(); process.exit(fails ? 1 : 0);
