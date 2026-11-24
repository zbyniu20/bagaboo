// Narzędzie: zrzuty poziomów do oceny wyglądu. Użycie: cd tests && SRC_ROOT=.. TAG=po LEVELS=hospital,lobby CHROMIUM_PATH=... node levelshot.mjs katalog
import { chromium } from 'playwright';
import fs from 'fs'; import path from 'path'; import http from 'http';
import { fileURLToPath } from 'url';
const HERE = path.dirname(fileURLToPath(import.meta.url)), ROOT = process.env.SRC_ROOT ? path.resolve(process.env.SRC_ROOT) : path.resolve(HERE, '..'), DEPS = path.join(HERE, 'node_modules');
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
const OUT = process.argv[2] || '', LEVELS = (process.env.LEVELS || 'hospital,catacombs,laundry,lobby').split(','), TAG = process.env.TAG || 'shot';
if (!OUT) { console.log('Użycie: node levelshot.mjs katalog_wyjściowy   (SRC_ROOT=ścieżka do źródeł, LEVELS=a,b, TAG=nazwa)'); process.exit(1); }
fs.mkdirSync(OUT, { recursive: true });
const page = await ctx.newPage(), errs = [];
page.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message));
page.on('console', (m) => { if (m.type() === 'error' && !/peerjs|favicon|Failed to load resource/i.test(m.text())) errs.push('CONSOLE ' + m.text().slice(0, 300)); });
await page.goto(`http://localhost:${port}/?three=${V}`);
await page.waitForFunction(() => /Ready|Could not/.test(document.getElementById('status').innerText), null, { timeout: 120000 });
await page.click('#btnSolo', { timeout: 90000 });
await page.waitForTimeout(1500);
for (const id of LEVELS) {
    await page.evaluate(async (id) => { const M = await import('./main.js'); await M.loadLevel(id); }, id);
    await page.waitForTimeout(3000);
    await page.evaluate(async () => { try { const T = await import('./core/tutorial.js'); T.skipTutorial(); } catch (e) {} });
    if (process.env.MONSTER) {
        await page.evaluate((d) => { window.__mdist = d; }, Number(process.env.MDIST || 2.6));
        const w = await page.evaluate(async (k) => {
            const E = await import('./core/engine.js'), PL = await import('./core/player.js'), D = await import('./core/desktop.js'), fy = E.L.floorY || 0, c = []; E.scene.traverse(o => { if (o.isSkinnedMesh && o.visible) c.push(o); });
            const seen = new Set(), v = new E.THREE.Vector3(), list = []; for (const o of c) { let r = o; while (r.parent && r.parent !== E.L.root && r.parent !== E.scene) r = r.parent; if (seen.has(r)) continue; seen.add(r); o.getWorldPosition(v); list.push({ x: v.x, z: v.z, y: v.y }); }
            const f = list[Math.min(list.length - 1, k)]; if (!f) return null; PL.setPlayerPosition(f.x, fy + 1.2, f.z + (Number(window.__mdist) || 2.6)); D.setDesktopFacing(0); return { n: list.length, x: f.x, z: f.z };
        }, Number(process.env.MONSTER) - 1);
        console.log('potwór:', JSON.stringify(w)); await page.waitForTimeout(Number(process.env.WAIT || 2500));
    }
    if (process.env.KIT) {
        const w = await page.evaluate(async (k) => {
            const E = await import('./core/engine.js'), PL = await import('./core/player.js'), D = await import('./core/desktop.js'), fy = E.L.floorY || 0, m = new E.THREE.Matrix4(), c = [];
            E.scene.traverse(o => { if (o.isInstancedMesh && /^kit_(pipe|tray|crown)$/.test(o.name)) for (let i = 0; i < o.count; i++) { o.getMatrixAt(i, m); c.push({ name: o.name, x: m.elements[12], y: m.elements[13], z: m.elements[14], nx: m.elements[8], nz: m.elements[10] }); } });
            const obs = E.L.obstacles.filter(b => b.box3), hit = (x, z) => obs.some(b => b.box3.max.y > fy + 0.25 && b.box3.min.y < fy + 1.8 && x > b.box3.min.x && x < b.box3.max.x && z > b.box3.min.z && z < b.box3.max.z);
            for (let j = 0; j < c.length; j++) { const f = c[(j + k) % c.length], px = f.x + f.nx * 2.4, pz = f.z + f.nz * 2.4; if (!hit(px, pz) && !hit(f.x + f.nx * 1.2, f.z + f.nz * 1.2)) { PL.setPlayerPosition(px, fy + 1.2, pz); D.setDesktopFacing(Math.atan2(f.nx, f.nz)); return { piece: f.name, y: f.y }; } }
            return null;
        }, Number(process.env.KIT) - 1);
        console.log('element:', JSON.stringify(w)); await page.waitForTimeout(1500);
    }
    if (process.env.NOKIT) await page.evaluate(async () => { const E = await import('./core/engine.js'); E.scene.traverse(o => { if (/^kit_/.test(o.name)) o.visible = false; }); });
    if (process.env.DECAL) {
        const w = await page.evaluate(async (k) => {
            const E = await import('./core/engine.js'), PL = await import('./core/player.js'), D = await import('./core/desktop.js'); let m = null; E.scene.traverse(o => { if (o.name === 'levelDecals') m = o; });
            if (!m) return null; const p = m.geometry.attributes.position, c = [], fy = E.L.floorY || 0;
            for (let q = 0; q < p.count / 4; q++) { const a = [0, 1, 2, 3].map(i => [p.getX(q * 4 + i), p.getY(q * 4 + i), p.getZ(q * 4 + i)]); if (Math.abs(a[0][1] - a[2][1]) < 0.2) continue; const cx = (a[0][0] + a[2][0]) / 2, cz = (a[0][2] + a[2][2]) / 2, tx = a[1][0] - a[0][0], tz = a[1][2] - a[0][2], tl = Math.hypot(tx, tz) || 1; let nx = -tz / tl, nz = tx / tl;
                const obs = E.L.obstacles.filter(b => b.box3), hit = (x, z) => obs.some(b => b.box3.max.y > fy + 0.25 && b.box3.min.y < fy + 1.8 && x > b.box3.min.x && x < b.box3.max.x && z > b.box3.min.z && z < b.box3.max.z);
                if (hit(cx + nx * 0.3, cz + nz * 0.3)) { nx = -nx; nz = -nz; } if (hit(cx + nx * 0.3, cz + nz * 0.3) || hit(cx + nx * 2.2, cz + nz * 2.2)) continue; c.push({ px: cx + nx * 2.2, pz: cz + nz * 2.2, yaw: Math.atan2(nx, nz), y: (a[0][1] + a[2][1]) / 2 }); }
            const f = c[Math.min(c.length - 1, k)]; if (!f) return null; PL.setPlayerPosition(f.px, fy + 1.2, f.pz); D.setDesktopFacing(f.yaw); return f;
        }, Number(process.env.DECAL) - 1);
        console.log('decal:', JSON.stringify(w)); await page.waitForTimeout(1500);
    }
    if (process.env.WALL) {
        const w = await page.evaluate(async (k) => {
            const E = await import('./core/engine.js'), PL = await import('./core/player.js'), D = await import('./core/desktop.js'), sp = E.L.spawn || [0, 1, 0], fy = E.L.floorY || 0, c = [];
            const obs = E.L.obstacles.filter(b => b.box3), inside = (x, z) => obs.some(b => b.box3.max.y > fy + 0.25 && b.box3.min.y < fy + 1.8 && x > b.box3.min.x && x < b.box3.max.x && z > b.box3.min.z && z < b.box3.max.z);
            for (const b of obs) { const q = b.box3; if (q.max.y - q.min.y < 2.2 || q.min.y > fy + 0.6) continue;
                for (const [nx, nz, len, cx, cz] of [[0, -1, q.max.x - q.min.x, (q.min.x + q.max.x) / 2, q.min.z], [0, 1, q.max.x - q.min.x, (q.min.x + q.max.x) / 2, q.max.z], [-1, 0, q.max.z - q.min.z, q.min.x, (q.min.z + q.max.z) / 2], [1, 0, q.max.z - q.min.z, q.max.x, (q.min.z + q.max.z) / 2]]) {
                    if (len < 3) continue; const px = cx + nx * 2.2, pz = cz + nz * 2.2; if (inside(px, pz) || inside(cx + nx * 0.4, cz + nz * 0.4) || px < E.L.bounds.minX || px > E.L.bounds.maxX || pz < E.L.bounds.minZ || pz > E.L.bounds.maxZ) continue;
                    c.push({ px, pz, yaw: Math.atan2(nx, nz), d: Math.hypot(px - sp[0], pz - sp[2]) }); } }
            c.sort((a, b) => a.d - b.d); const f = c[Math.min(c.length - 1, k)]; if (!f) return null;
            PL.setPlayerPosition(f.px, fy + 1.2, f.pz); D.setDesktopFacing(f.yaw); return f;
        }, Number(process.env.WALL) - 1);
        console.log('ściana:', JSON.stringify(w)); await page.waitForTimeout(1500);
    }
    if (process.env.CLEAN !== '0') await page.evaluate(async () => {   // HUD przy kamerze gra przestawia co klatkę, więc chowamy go dokładnie na czas rysowania
        const E = await import('./core/engine.js'), r = E.renderer, orig = r.render.bind(r);
        r.render = (sc, cam) => { const hid = []; for (const o of E.camera.children) if ((o.isMesh || o.isGroup) && o.visible) { o.visible = false; hid.push(o); } const out = orig(sc, cam); for (const o of hid) o.visible = true; return out; };
        for (const e of document.querySelectorAll('body *')) if (/^Desktop test mode/.test(e.innerText || '') && getComputedStyle(e).position === 'fixed') e.style.setProperty('display', 'none', 'important');
        const v = document.getElementById('VRButton'); if (v) v.style.setProperty('display', 'none', 'important');
    });
    if (process.env.NEARPROP) {
        const info = await page.evaluate(async (pick) => {
            const E = await import('./core/engine.js'), PL = await import('./core/player.js'), m = new E.THREE.Matrix4(), c = [];
            E.scene.traverse(o => { if (o.isInstancedMesh && /^props_/.test(o.name)) for (let i = 0; i < o.count; i++) { o.getMatrixAt(i, m); c.push([o.name, m.elements[12], m.elements[14]]); } });
            const free = (x, z) => !E.L.obstacles.some(b => b.box3 && b.box3.max.y > 0.25 && b.box3.min.y < 1.8 && x > b.box3.min.x - 0.5 && x < b.box3.max.x + 0.5 && z > b.box3.min.z - 0.5 && z < b.box3.max.z + 0.5);
            for (let k = 0; k < c.length; k++) { const [n, x, z] = c[(k + pick) % c.length]; if (free(x, z + 2.4)) { PL.setPlayerPosition(x, (E.L.floorY || 0) + 1.2, z + 2.4); return n; } }
            return null;
        }, Number(process.env.NEARPROP) - 1);
        console.log('rekwizyt:', info); await page.evaluate(async () => { const D = await import('./core/desktop.js'); D.setDesktopFacing(0); }); await page.waitForTimeout(Number(process.env.WAIT || 14000));
    }
    if (process.env.NOPROPS) await page.evaluate(async () => { const E = await import('./core/engine.js'); E.scene.traverse(o => { if (/^props_/.test(o.name)) o.visible = false; }); });
    if (process.env.NODECALS) await page.evaluate(async () => { const E = await import('./core/engine.js'); E.scene.traverse(o => { if (o.name === 'levelDecals') o.visible = false; }); });
    if (process.env.NOSHAFTS) await page.evaluate(async () => { const E = await import('./core/engine.js'); E.scene.traverse(o => { if (o.name === 'lampShafts') o.visible = false; }); });
    await page.screenshot({ path: path.join(OUT, id + '-' + TAG + '.png') });
    console.log('zrzut', id);
}
console.log(errs.length ? errs.join('\n') : 'bez błędów strony');
await browser.close(); server.close();
