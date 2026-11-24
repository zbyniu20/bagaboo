// Test w przeglądarce: nawiedzone lobby i Mój Pokój (manekiny, mural na Ścianie Graffiti, strach stworka, zdarzenia w pokoju, dźwięki).
// Użycie:  cd tests && CHROMIUM_PATH=... node haunt.mjs      (wymaga npm ci; nie jest częścią testów szybkich ani smoke)
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
// ---- lobby: manekin ----
await page.evaluate(async () => { const M = await import('./main.js'); await M.loadLevel('lobby'); }); await wait(2500);
const man = (i, step) => page.evaluate(async ([i, step]) => { const L = await import('./levels/lobby.js'); return L.debugHauntMannequin(i, step); }, [i, step]);
let r = await man(0, false);
ok('lobby: a mannequin changes its pose when haunted', r && r.count > 0 && Math.abs(r.after.head - 0.441) < 1e-6 && r.after.x === r.before.x && r.after.z === r.before.z, r);
// gracz 6 m od manekina, żeby krok był dozwolony
const home = r.home, px = Math.abs(home.x + 6) < 12 ? home.x + 6 : home.x - 6;
await page.evaluate(async ([x, z]) => { const P = await import('./core/player.js'); P.setPlayerPosition(x, 1.0, z); }, [px, home.z]); await wait(900);
r = await man(0, true); const dx = r.after.x - r.before.x, dz = r.after.z - r.before.z;
ok('lobby: a haunted step is one 0.45 m step toward the player', Math.abs(Math.hypot(dx, dz) - 0.45) < 1e-6 && Math.sign(dx) === Math.sign(px - home.x), r);
ok('lobby: the collision box and the physics body move with the mannequin', Math.abs((r.after.box - r.before.box) - dx) < 1e-6 && Math.abs((r.after.body - r.before.body) - dx) < 1e-6, r);
for (let i = 0; i < 30; i++) r = await man(0, true);
ok('lobby: many steps never take the mannequin farther than 3.2 m from its place', Math.hypot(r.after.x - r.home.x, r.after.z - r.home.z) <= 3.2 + 1e-9, r);
// ---- lobby: mural na ścianie ----
const gh = (kind, len) => page.evaluate(async ([k, l]) => { const G = await import('./core/graffiti.js'); return G.debugGrafHaunt(k, l); }, [kind, len]);
let s = await gh(0, 3); ok('mural: a forced drawing starts', s && s.t >= 0 && s.kind === 0, s);
await wait(1700); s = await gh(); ok('mural: a moment later it is visible', s.visible === true && s.alpha > 0.3, s);
for (let i = 0; i < 40 && s.t !== -1; i++) { await wait(400); s = await gh(); }   // czas gry liczy się z klatek, w tej przeglądarce wolniej niż zegar
ok('mural: after its time it is gone', s.t === -1 && s.visible === false, s);
const kinds = []; for (let k = 0; k < 6; k++) { await gh(k, 2); kinds.push((await gh()).kind); } ok('mural: all six drawings can be drawn without errors', kinds.join() === '0,1,2,3,4,5', kinds);
// ---- stworek: strach ----
const pet = await page.evaluate(async () => {
    const P = await import('./core/petmodel.js'), m = P.createPetModel({ c: 0, l: 1, n: 0, h: 0, k: 0, sp: 0 }, { born: false }), root = m.group.children[1], st = { speed: 0, sleeping: false, sitting: false, sad: false, hungry: false, petted: 0, eating: 0, tag: false };
    for (let i = 0; i < 20; i++) m.update(0.05, 1 + i * 0.05, Object.assign({ fear: 1 }, st)); const scared = Math.abs(root.rotation.z) + Math.abs(root.rotation.x);
    for (let i = 0; i < 5; i++) m.update(0.05, 3 + i * 0.05, Object.assign({ fear: 0 }, st)); const calm = Math.abs(root.rotation.z) + Math.abs(root.rotation.x); m.dispose();
    return { scared: scared, calm: calm };
});
ok('pet: a scared pet trembles and a calm one is still', pet.scared > 0.001 && pet.calm === 0, pet);
// ---- dźwięk lobby ----
const snd = await page.evaluate(async () => {
    const A = await import('./core/audio.js'), R = await import('./core/registry.js'), out = {};
    try { A.pa({ x: 0, y: 1, z: 0 }, 0.5); A.childLaugh({ x: 0, y: 1, z: 0 }, 0.4); A.crackle({ x: 0, y: 3, z: 0 }); A.breath({ x: 0, y: 1, z: 0 }, 0.3); out.thrown = false; } catch (e) { out.thrown = String(e); }
    const lob = R.LEVEL_DEFS.find(d => d.id === 'lobby'); out.types = lob.ambience.rand.map(r => r.t);
    return out;
});
ok('sound: the lobby sounds run without errors and are in the lobby ambience', snd.thrown === false && snd.types.includes('pa') && snd.types.includes('laugh'), snd);
// ---- Mój Pokój ----
await page.evaluate(async () => { const M = await import('./main.js'); await M.loadLevel('home'); }); await wait(2500);
const hh = (kind) => page.evaluate(async (k) => { const H = await import('./levels/home.js'); return H.debugHomeHaunt(k); }, kind);
await page.evaluate(async () => { (await import('./core/economy.js')).SAVE.wallet = 99999; const H = await import('./levels/home.js'); H._press('buy-statue'); H._press('pick-statue'); H._press('slot0'); });
await wait(500);
const placed = await page.evaluate(async () => (await import('./levels/home.js')).debug().slots[0]); ok('home: a statue could be placed for the test', placed === 'statue', placed);
let h = await hh('lights'); ok('home: the lights flicker for a moment', h.flick > 0, h);
await page.evaluate(() => { window.__rnd = Math.random; Math.random = () => 0.1; });   // migotanie losuje przyciemnienie w każdej klatce (55%), a w renderowaniu programowym klatek w oknie próbkowania jest kilka: wymuszamy przyciemnienie, żeby test nie był loteryjny
await wait(300); const lv = []; for (let i = 0; i < 12; i++) { lv.push(...(await hh()).lights); await wait(60); }
await page.evaluate(() => { Math.random = window.__rnd; });
ok('home: during the flicker the lights dip to a fraction of their power', Math.min(...lv) < 10, lv.slice(0, 6));
await wait(1500); h = await hh(); ok('home: afterwards the lights are back at full power', h.flick <= 0 && h.lights.every(v => Math.abs(v - 36) < 1e-9), h);
h = await hh('writing'); ok('home: a message appears on the wall', h.write >= 0, h);
await wait(1200); const vis = await page.evaluate(async () => { const E = await import('./core/engine.js'); let v = false; E.L.root.traverse(o => { if (o.isMesh && o.geometry.parameters && o.geometry.parameters.width === 3.2 && o.geometry.parameters.height === 1 && o.visible) v = true; }); return v; });
ok('home: the message is visible on the wall', vis === true);
const rot0 = await page.evaluate(async () => { const E = await import('./core/engine.js'); let r = null; E.L.root.traverse(o => { if (!r && o.userData && o.userData.statue) r = o.rotation.y; }); return r; });
await hh('shift'); const rot1 = await page.evaluate(async () => { const E = await import('./core/engine.js'); let r = null; E.L.root.traverse(o => { if (!r && o.userData && o.userData.statue) r = o.rotation.y; }); return r; });
ok('home: furniture shifts by itself (the statue turned by 0.3-0.6 rad)', rot0 !== null && Math.abs(rot1 - rot0) >= 0.29 && Math.abs(rot1 - rot0) <= 0.61, { rot0, rot1 });
h = await hh('statue'); ok('home: the statue event runs', h !== null);
h = await hh('cups'); ok('home: the cups event runs (a cup tips over when there are cups, else the lights flicker)', h !== null && (h.tipping > 0 || h.flick > 0), h);
await page.evaluate(async () => { const M = await import('./main.js'); await M.loadLevel('lobby'); }); await wait(2000);
ok('no page errors', errors.length === 0, errors.slice(0, 5));
await browser.close(); server.close();
console.log(fails ? 'FAILED: ' + fails : 'haunt: all checks passed'); process.exit(fails ? 1 : 0);
