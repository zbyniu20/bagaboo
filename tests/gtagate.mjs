// Test w przeglądarce: brama do Scary GTA w aneksie lobby (zamknięte drzwi, trzy próby, klawiatura, trwałe otwarcie). Użycie: CHROMIUM_PATH=... [SHOTDIR=katalog] node gtagate.mjs
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
const SP = process.env.SHOTDIR || '';
const ev = (fn, arg) => page.evaluate(fn, arg);

const w = (ms) => page.waitForTimeout(ms);
await ev(async () => { const M = await import('./main.js'); await M.loadLevel('lobby'); });
await w(6000);
const gate = () => ev(async () => (await import('./core/annexgate.js')).debugGate());
const key = (k) => ev(async (k) => (await import('./core/annexgate.js')).debugGateKey(k), k);
const g0 = await gate();
ok('the gate is built closed: no trial done, three dark lamps', g0 && g0.gate.open === false && g0.gate.climb === false && g0.gate.gallery === false && g0.lamps.every(c => c === 0x401018), g0);
const portal = await ev(async () => { const E = await import('./core/engine.js'), p = E.L.portals.find(q => q.target === 'scarygta'); return p ? { has: true, open: !!p.cond(), deny: p.deny } : { has: false }; });
ok('the door is a portal to scarygta with a condition (closed) and a clear refusal text', portal.has && portal.open === false && /trials/.test(portal.deny), portal);
// zamknięte drzwi nie wpuszczają
const blocked = await ev(async () => { const E = await import('./core/engine.js'), P = await import('./core/player.js'), A = await import('./core/annexlayout.js'), w = (ms) => new Promise(r => setTimeout(r, ms)); P.setPlayerPosition(A.GATE_AT.door.x, 1.2, A.GATE_AT.door.z + 0.7); await w(2500); return E.L.levelId; });
ok('walking into the locked door does not leave the lobby', blocked === 'lobby', blocked);
// klawiatura śpi przed próbami 1 i 2
await key('5'); await key('6'); await key('8'); await key('4'); await key('ENT'); const early = await gate();
ok('the keypad refuses the right code before trials 1 and 2', early.gate.open === false && /trials 1 and 2/i.test(early.msg), early);
// zaliczenie prób (ta sama funkcja, którą wołają Climb Rush i Ghost Gallery po wyniku)
const trials = await ev(async () => { const S = await import('./core/gtastore.js'), w = (ms) => new Promise(r => setTimeout(r, ms)); const a = S.markGate('climb', 60).isNew, b = S.markGate('climb', 40).isNew, c = S.markGate('gallery', 90).isNew, d = S.markGate('gallery', 100).isNew, e = S.markGate('gallery', 150).isNew; await w(1200); return { a, b, c, d, e }; });
const g1 = await gate();
ok('a too slow climb and a too low score do not count; 40 s and 100 points do, once each, and light two lamps', !trials.a && trials.b && !trials.c && trials.d && !trials.e && g1.gate.climb && g1.gate.gallery && g1.lamps.filter(c => c === 0x30ff70).length === 2 && g1.lamps[2] === 0x401018, { trials, lamps: g1.lamps });
// trzy złe kody blokują klawiaturę
for (let r = 0; r < 3; r++) { for (const k of '1111') await key(k); await key('ENT'); }
const lk = await gate(); for (const k of '5684') await key(k); await key('ENT'); const afterLock = await gate();
ok('three wrong codes lock the keypad for 20 s and the right code is ignored during the lock', lk.lockedUntil > 0 && afterLock.gate.open === false, { lk: lk.lockedUntil, open: afterLock.gate.open });
// świeże wejście do lobby kasuje blokadę czasową (stan prób jest zapisany): poprawny kod otwiera bramę
await ev(async () => { const M = await import('./main.js'); await M.loadLevel('lobby'); }); await w(5000);
const kept = await gate();
for (const k of '5684') await key(k); await key('ENT'); await w(800); const g2 = await gate();
ok('the trials are remembered after re-entering the lobby, and the code 5684 opens the gate (all three lamps green)', kept.gate.climb && kept.gate.gallery && !kept.gate.open && g2.gate.open === true && g2.lamps.every(c => c === 0x30ff70), { kept: kept.gate, open: g2.gate.open, lamps: g2.lamps });
const saved = await ev(async () => { const E = await import('./core/economy.js'); return JSON.stringify(E.SAVE.gta.gate); });
ok('the open gate is saved', /"open":true/.test(saved), saved);
// po otwarciu drzwi wpuszczają, także po ponownym wejściu
await ev(async () => { const M = await import('./main.js'); await M.loadLevel('lobby'); }); await w(5000);
const open = await ev(async () => { const E = await import('./core/engine.js'), P = await import('./core/player.js'), A = await import('./core/annexlayout.js'), w = (ms) => new Promise(r => setTimeout(r, ms)); const p = E.L.portals.find(q => q.target === 'scarygta'), cond = !!p.cond(); P.setPlayerPosition(A.GATE_AT.door.x, 1.2, A.GATE_AT.door.z + 0.7); for (let i = 0; i < 60 && E.L.levelId !== 'scarygta'; i++) await w(200); return { cond, level: E.L.levelId }; });
ok('once unlocked the door stays open for good: after re-entering the lobby it takes you to Scary GTA', open.cond === true && open.level === 'scarygta', open);
ok('no page errors', errors.length === 0, errors);
console.log(fails ? 'FAILED: ' + fails : 'gtagate: all checks passed'); await browser.close(); server.close(); process.exit(fails ? 1 : 0);
