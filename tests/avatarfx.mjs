// Test w przeglądarce: efekty awatara (futro warstwowe, rany, mokre futro, ślina, drżenie).
// Użycie:  cd tests && CHROMIUM_PATH=... node avatarfx.mjs   (nie jest częścią testów szybkich ani smoke)
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
await page.evaluate(async () => { const M = await import('./main.js'); await M.loadLevel('lobby'); });
await page.waitForTimeout(2000);
const r = await page.evaluate(async () => {
    const N = await import('./core/network.js'), A = await import('./core/avatar.js'), E = await import('./core/engine.js'), S = await import('./core/settings.js');
    const look = { name: 'T', skin: 'default', hat: 'none', glasses: 'none', sleeve: 'none', gloves: 'none', mask: 'none', badge: 'none' };
    const out = {}, cp = new E.THREE.Vector3(); E.camera.getWorldPosition(cp);
    const place = (av, z) => { av.group.position.set(cp.x, cp.y - 0.6, cp.z - z); av.group.updateMatrixWorld(true); };
    const shellsOn = (av) => [av.torso.userData.chest, av.armL, av.armR].map(m => (m.userData.shells || []).filter(s => s.visible).length);
    S.SETTINGS.quality = 'medium'; S.SETTINGS.gore = true;
    const av = A.createAvatar(look); E.scene.add(av.group); N.remoteAvatars.t1 = av;
    out.built = (av.torso.userData.chest.userData.shells || []).length;
    place(av, 1.5); A.updateAvatarFx(av, E.camera, false, 0, 0); out.near = shellsOn(av);
    place(av, 8); A.updateAvatarFx(av, E.camera, false, 0, 0); out.far = shellsOn(av);
    place(av, 1.5); A.updateAvatarFx(av, E.camera, true, 0, 0); out.xr = shellsOn(av);
    place(av, 4.2); A.updateAvatarFx(av, E.camera, true, 0, 0); out.xrFar = shellsOn(av);
    // rany
    N.setDismember('t1', 1); out.wound = av.torso.userData.wounds.length; N.setDismember('t1', 0); out.woundCleared = av.torso.userData.wounds.length;
    S.SETTINGS.gore = false; N.setDismember('t1', 2); out.woundNoGore = (av.torso.userData.wounds || []).length; N.setDismember('t1', 0); S.SETTINGS.gore = true;
    for (let i = 0; i < 9; i++) A.addWound(av, i + 3); out.woundCap = av.torso.userData.wounds.length; A.clearWounds(av);
    // mokre futro
    const m = av.armL.material, c0 = m.color.r, r0 = m.roughness; A.applyGrime(av, 'laundry'); out.wetDarker = m.color.r < c0; out.wetRough = m.roughness < r0; A.applyGrime(av, 'lobby'); out.restored = Math.abs(m.color.r - c0) < 1e-6 && Math.abs(m.roughness - r0) < 1e-6;
    // ślina i drżenie
    const f = av.head.userData.face; A.animateFace(av.head, 0, 0.5, 0.016); out.droolHidden = f.drool.every(d => !d.visible);
    for (let i = 0; i < 20; i++) A.animateFace(av.head, 1, 0.5, 0.05); out.droolShown = f.drool.every(d => d.visible && d.scale.y > 0.3);
    out.eyeLid = f.eyes.every(e => e.scale.y > 0 && e.scale.y < 2);
    out.tremor = [0.01, 0.02, 0.03].some(t => { A.updateAvatarFx(av, E.camera, false, 1, t); return Math.abs(av.torso.userData.chest.rotation.z) > 0.001; });
    A.updateAvatarFx(av, E.camera, false, 0, 0.02); out.tremorOff = av.torso.userData.chest.rotation.z === 0;
    // jakość low: brak warstw
    S.SETTINGS.quality = 'low'; const lo = A.createAvatar(look); out.lowShells = (lo.torso.userData.chest.userData.shells || []).length; S.SETTINGS.quality = 'medium';
    // złota skórka (ultimate) jest metaliczna: bez futra warstwowego
    const ult = A.createAvatar(Object.assign({}, look, { skin: 'ultimate' })); out.ultShells = (ult.torso.userData.chest.userData.shells || []).length + (ult.armL.userData.shells || []).length;
    return out;
});
console.log(JSON.stringify(r));
ok('shell fur is built on torso and both arms (medium: 3 layers)', r.built === 3);
ok('close up all built layers are drawn', JSON.stringify(r.near) === '[3,3,3]', r.near);
ok('far away no layers are drawn', JSON.stringify(r.far) === '[0,0,0]', r.far);
ok('in VR only 2 layers up close and none beyond 3.5 m', JSON.stringify(r.xr) === '[2,2,2]' && JSON.stringify(r.xrFar) === '[0,0,0]', [r.xr, r.xrFar]);
ok('being caught leaves a wound, a new round clears it', r.wound === 1 && r.woundCleared === 0, [r.wound, r.woundCleared]);
ok('with Gore off no wound appears', r.woundNoGore === 0, r.woundNoGore);
ok('wounds are capped', r.woundCap === 6, r.woundCap);
ok('the laundry makes the fur darker and glossier, the lobby restores it', r.wetDarker && r.wetRough && r.restored, r);
ok('drool is hidden when quiet and appears at a loud roar', r.droolHidden && r.droolShown, r);
ok('the eyes stay a sane size', r.eyeLid);
ok('muscles tremble during a roar and are still when quiet', r.tremor && r.tremorOff, r);
ok('low quality builds no shells', r.lowShells === 0, r.lowShells);
ok('the metallic ultimate skin gets no shell fur', r.ultShells === 0, r.ultShells);
ok('no page errors', errors.length === 0, errors);
await browser.close(); server.close();
console.log(fails ? 'avatarfx: FAILED ' + fails : 'avatarfx: all checks passed'); process.exit(fails ? 1 : 0);
