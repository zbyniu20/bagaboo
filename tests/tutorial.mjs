// Test w przeglądarce: samouczek (auto-start nowego gracza, kroki, zapis, przycisk ekipy, pominięcie). Użycie: CHROMIUM_PATH=... node tutorial.mjs
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
let fails = 0; const ok = (name, cond, extra) => { if (cond) console.log('ok  ', name); else { fails++; console.log('FAIL', name, extra === undefined ? '' : JSON.stringify(extra)); } };
const errs = [];
async function open() {
    const p = await ctx.newPage(); p.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message)); p.on('console', (m) => { if (m.type() === 'error' && !/peerjs|favicon|Failed to load resource/i.test(m.text())) errs.push('CONSOLE ' + m.text().slice(0, 200)); });
    await p.goto(`http://localhost:${port}/?three=${V}`);
    await p.waitForFunction(() => /Ready|Could not/.test(document.getElementById('status').innerText), null, { timeout: 120000 });
    await p.click('#btnSolo', { timeout: 90000 }); await p.waitForTimeout(3500); return p;
}
const dbg = (p) => p.evaluate(async () => (await import('./core/tutorial.js')).debugTutorial());
const wait = (p, id, ms) => p.evaluate(async ([id, ms]) => { const T = await import('./core/tutorial.js'), t0 = performance.now(); while (performance.now() - t0 < ms) { if (T.debugTutorial().id === id) return true; await new Promise(r => setTimeout(r, 100)); } return false; }, [id, ms || 8000]);
let p = await open();
let d = await dbg(p);
ok('a brand new player gets the tutorial by itself in the lobby, from the first step', d.on === true && d.id === 'welcome', d);
await p.keyboard.press('Enter'); ok('Enter moves to the next step (movement)', await wait(p, 'move'));
await p.evaluate(async () => { const P = await import('./core/player.js'), b = P.playerBody.position; P.setPlayerPosition(b.x + 5, b.y, b.z); });
ok('travelling 4 m completes the movement step and the tutorial goes on by itself (climb)', await wait(p, 'climb', 10000));
await p.evaluate(async () => { const P = await import('./core/player.js'), b = P.playerBody.position; P.setPlayerPosition(b.x, b.y + 1.5, b.z); });
ok('climbing 1 m completes the climb step (jump)', await wait(p, 'jump', 10000));
await p.evaluate(async () => { const P = await import('./core/player.js'); P.playerBody.velocity.y = 4; });
ok('a fast upward launch completes the jump step (pause menu)', await wait(p, 'pause', 10000));
await p.keyboard.press('Escape'); ok('opening the pause menu completes that step (levels)', await wait(p, 'levels', 10000));
await p.keyboard.press('Escape');
await p.evaluate(async () => { const T = await import('./core/tutoriallogic.js'); T.TUT.next('trigger'); });
ok('the controller trigger moves info steps on (stay alive)', await wait(p, 'danger'));
await p.evaluate(async () => { const T = await import('./core/tutoriallogic.js'); T.TUT.next('trigger'); T.TUT.next('trigger'); });
d = await p.evaluate(async () => { const T = await import('./core/tutoriallogic.js'); T.TUT.next('trigger'); await new Promise(r => setTimeout(r, 400)); return (await import('./core/tutorial.js')).debugTutorial(); });
ok('after the last step the tutorial ends and is remembered in the save', d.on === false && d.done === true, d);
await p.reload(); await p.waitForFunction(() => /Ready|Could not/.test(document.getElementById('status').innerText), null, { timeout: 120000 });
await p.click('#btnSolo', { timeout: 90000 }); await p.waitForTimeout(3500);
d = await dbg(p); ok('a finished tutorial does not start again after a reload', d.on === false && d.done === true, d);
// przycisk w menu pauzy: zwykły gracz go nie widzi, ekipa tak
const btn = (p2) => p2.evaluate(async () => { const P = await import('./core/pause.js'); P.pauseMenu.redraw(); return P.pauseMenu.buttons.map(b => b.id).includes('tut'); });
ok('an ordinary player has no tutorial button once it is done', (await btn(p)) === false);
await p.evaluate(async () => { (await import('./core/economy.js')).SAVE.profile.name = 'Luna'; });
ok('a moderator has a Tutorial button in the pause menu', (await btn(p)) === true);
await p.evaluate(async () => { const P = await import('./core/pause.js'); P.pauseMenu.redraw(); P.pauseMenu.buttons.find(b => b.id === 'tut').action(); });
d = await dbg(p); ok('pressing it starts the tutorial again at any moment', d.on === true && d.id === 'welcome', d);
await p.evaluate(async () => { (await import('./core/economy.js')).SAVE.profile.name = 'Acrobat'; });
ok('while it runs everybody gets a Skip button', (await btn(p)) === true);
await p.evaluate(async () => { const P = await import('./core/pause.js'); P.pauseMenu.redraw(); P.pauseMenu.buttons.find(b => b.id === 'tut').action(); });
d = await dbg(p); ok('Skip ends the tutorial', d.on === false && d.done === true, d);
ok('no page errors', errs.length === 0, errs);
await browser.close(); server.close();
console.log(fails ? 'tutorial: FAILED ' + fails : 'tutorial: all checks passed'); process.exit(fails ? 1 : 0);
