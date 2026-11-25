// Test w przeglądarce: The Mine: bateria lampy, reakcja Kopacza na światło i ciemność, zasilacze i wyjście, złapanie. Użycie: CHROMIUM_PATH=... node mine.mjs
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
await page.evaluate(async () => { const M = await import('./main.js'); await M.loadLevel('mine'); });
await page.waitForTimeout(3000);
const ev = (fn, arg) => page.evaluate(fn, arg);
// pomocnicy w stronie: stan poziomu, teleport, ustawianie potwora
await ev(async () => {
    const M = await import('./levels/mine.js'), PL = await import('./core/player.js');
    window.__M = M; window.__PL = PL;
    window.__bot = (x, y, z, mode) => { const S = M.testState(), c = S.bots[0]; c.pos.set(x, y, z); c.path = []; c.mode = mode || 'patrol'; c.wait = 999; c.noticeT = 0; c.lostT = 0; c.huntT = 0; c.node = c.last = 0; };
    window.__go = (x, y, z) => PL.setPlayerPosition(x, y, z);
    window.__wait = (cond, ms) => new Promise((res) => { const t0 = performance.now(); const poll = () => { if (cond() || performance.now() - t0 > ms) res(cond()); else setTimeout(poll, 100); }; poll(); });
    const S = M.testState(); S.introT = 0.05;   // następna klatka: faza gry
});
await page.waitForTimeout(1200);
const base = await ev(async () => { const S = window.__M.testState(); const E = await import('./core/engine.js'); return { phase: S.phase, bots: S.bots.length, gate: E.L.obstacles.includes(S.gateOb), bat: S.bat, lamp: S.lampOn }; });
ok('the mine starts in play with one Digger, a closed gate and a full lit lamp', base.phase === 'play' && base.bots === 1 && base.gate === true && base.bat > 0.9 && base.lamp === true, base);

// Bateria: paczka doładowuje o 45%
const pack = await ev(async () => { const S = window.__M.testState(); window.__bot(-7, 20, 7.2, 'patrol'); S.bat = 0.2; const p = S.packMesh[0].position; window.__go(p.x, p.y + 0.6, p.z); await window.__wait(() => S.packGot[0], 8000); return { got: S.packGot[0], bat: S.bat }; });
ok('a battery pack is picked up and recharges the lamp by about 45%', pack.got === true && pack.bat > 0.55 && pack.bat < 0.7, pack);

// Lampa: klawisz G gasi i zapala
const lamp = await ev(async () => { const E = await import('./core/engine.js'), S = window.__M.testState(); const a = S.lampOn; E.L.onKeyG(); await new Promise(r => setTimeout(r, 300)); const off = { on: S.lampOn, vis: E.lighting.headLamp.visible }; E.L.onKeyG(); await new Promise(r => setTimeout(r, 300)); return { a, off, on: { on: S.lampOn, vis: E.lighting.headLamp.visible } }; });
ok('G switches the lamp off and on and the real light follows', lamp.a === true && lamp.off.on === false && lamp.off.vis === false && lamp.on.on === true && lamp.on.vis === true, lamp);

// Ciemność i dystans: lampa zgaszona, potwór 14 m dalej na podłodze: nie goni
const dark = await ev(async () => { const E = await import('./core/engine.js'), S = window.__M.testState(); E.L.onKeyG(); window.__go(-6, 1.0, 6.5); window.__bot(0, 0, -7, 'patrol'); await new Promise(r => setTimeout(r, 3500)); const c = S.bots[0]; return { lamp: S.lampOn, mode: c.mode, caught: S.caughtT >= 0 }; });
ok('with the lamp off the Digger 14 m away does not notice the player', dark.lamp === false && dark.mode !== 'chase' && !dark.caught, dark);

// Światło z bliska: lampa zapalona, potwór 7 m: rusza w pościg
const chase = await ev(async () => { const E = await import('./core/engine.js'), S = window.__M.testState(); E.L.onKeyG(); S.bat = 1; window.__go(0, 1.0, 0); window.__bot(7, 0, 0, 'patrol'); const c = S.bots[0]; const r = await window.__wait(() => c.mode === 'chase' || S.caughtT >= 0, 9000); return { chase: c.mode === 'chase' || S.caughtT >= 0, mode: c.mode }; });
ok('a lit lamp 7 m from the Digger makes it chase', chase.chase === true, chase);

// Zasilacze: trzy sztuki otwierają wyjście, a punkt kontrolny zapisuje się
await ev(async () => { const S = window.__M.testState(); S.caughtT = -1; window.__bot(7, 20, 7.2, 'patrol'); });
const cells = await ev(async () => {
    const E = await import('./core/engine.js'), S = window.__M.testState(); const out = [];
    for (let i = 0; i < 3; i++) { S.caughtT = -1; window.__bot(-7, 20, 7.2, 'patrol'); const p = S.cellMesh[i].position; window.__go(p.x, p.y, p.z); await window.__wait(() => S.got[i], 8000); out.push(S.cells); }
    return { counts: out, gateOpen: !E.L.obstacles.includes(S.gateOb), gateVisible: S.gate.visible, cp: S.cp };
});
ok('three power cells are counted, the gate by the exit opens and the last chamber is a checkpoint', cells.counts.join() === '1,2,3' && cells.gateOpen === true && cells.gateVisible === false && cells.cp === 2, cells);

// Złapanie: potwór na graczu
const hit = await ev(async () => { const S = window.__M.testState(); S.caughtT = -1; window.__go(-7.25, 6.0, 0); window.__bot(-7.25, 5.0, 0.3, 'chase'); const r = await window.__wait(() => S.caughtT >= 0, 4000); return { caught: S.caughtT >= 0 }; });
ok('a Digger on top of the player catches them', hit.caught === true, hit);
ok('no page errors', errors.length === 0, errors);
console.log(fails ? 'FAILED: ' + fails : 'mine: all checks passed'); await browser.close(); server.close(); process.exit(fails ? 1 : 0);
