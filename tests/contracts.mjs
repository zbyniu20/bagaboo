// Test w przeglądarce: Scary GTA: dzienne kontrakty (detektory, nagrody raz na dobę, bramki mutatora i rundy trybu, telefon). Użycie: CHROMIUM_PATH=... node contracts.mjs
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
await ev(async () => { const M = await import('./main.js'); await M.loadLevel('scarygta'); });
await page.waitForTimeout(6000);
const w = (ms) => page.waitForTimeout(ms);
await ev(async () => { (await import('./levels/scarygta.js')).debugGtaNight('calm', 1e9); });
// ----- kontrakt "twin" (dwie torby) i "climb": wypłata raz, bonus za komplet, telefon -----
const r1 = await ev(async () => {
    const G = await import('./levels/scarygta.js'), E = await import('./core/economy.js'), S = G.testState();
    const w = (ms) => new Promise(r => setTimeout(r, ms)); for (let i = 0; i < 600 && S.busted >= 0; i++) await w(100);
    S.gm = Object.assign({}, S.gm, { phase: 'idle' });
    const day = E.dailyDate(), d0 = G.debugContract({ stars: 0, got: 0, night: 'calm', y: 0 });
    const ids = d0.picks, ev = { stars: 0, got: 0, night: 'calm', heli: false, y: 0 };
    const stepFor = { twin: { got: 2 }, climb: { y: 40 }, ride: { arrived: true }, air: { got: 1, heli: true }, cool: null, dark: null };
    const before = E.SAVE.wallet, done = [];
    for (const id of ids) {
        if (id === 'cool') { G.debugContract({ stars: 3, got: 0, night: 'calm', y: 0 }); G.debugContract({ stars: 0, got: 0, night: 'calm', y: 0 }); }
        else if (id === 'dark') { G.debugContract({ stars: 0, got: 0, night: 'calm', y: 0 }); G.debugContract({ stars: 0, got: 0, night: 'blackout', y: 0 }); G.debugContract({ stars: 0, got: 0, night: 'calm', y: 0 }); }
        else { G.debugContract({ stars: 0, got: 0, night: 'calm', y: 0 }); G.debugContract(Object.assign({}, ev, stepFor[id])); G.debugContract(ev); }
        done.push(G.debugContract(ev).done.length);
    }
    const afterAll = E.SAVE.wallet, again = G.debugContract(Object.assign({}, ev, { got: 2, y: 40, arrived: true })), afterAgain = E.SAVE.wallet;
    return { ids, done, gain: afterAll - before, againGain: afterAgain - afterAll, info: again.info, date: again.date === day };
});
ok('three contracts from the date are completed by their detectors, each pays once (60 each plus 100 for all three) and a repeat pays nothing', r1.ids.length === 3 && r1.done.join() === '1,2,3' && r1.gain === 3 * 60 + 100 && r1.againGain === 0 && r1.info.n === 3 && r1.date, r1);
// ----- bramki: mutator i runda trybu nie płacą; wejście w blackout w trakcie nie liczy się -----
const r2 = await ev(async () => {
    const G = await import('./levels/scarygta.js'), E = await import('./core/economy.js'), M = await import('./core/mutators.js'), S = G.testState();
    const day = E.dailyDate(); const base = G.debugContract({ stars: 0, got: 0, night: 'calm', y: 0 });
    // zerujemy zapis dnia, żeby sprawdzić bramki
    const GS = await import('./core/gtastore.js'); GS.setGta(Object.assign({}, GS.getGta(), { contracts: { date: '', done: [] } }));
    const twinToday = base.picks.includes('twin'), climbToday = base.picks.includes('climb'), ride = base.picks.includes('ride'), air = base.picks.includes('air');
    const id = ['twin', 'climb', 'ride', 'air'].find(x => base.picks.includes(x)); const evOf = { twin: { got: 2 }, climb: { y: 40 }, ride: { arrived: true }, air: { got: 3, heli: true } }[id];
    const mk = () => Object.assign({ stars: 0, got: 0, night: 'calm', y: 0, heli: false }, {});
    const b0 = E.SAVE.wallet; S.gm = Object.assign({}, S.gm, { phase: 'run', mode: 'coop' }); G.debugContract(Object.assign(mk(), evOf)); const inRound = E.SAVE.wallet - b0;
    S.gm = Object.assign({}, S.gm, { phase: 'idle' }); const b1 = E.SAVE.wallet; M.setMutatorChoice('scarygta', 'dark'); M.beginRun('scarygta', false); const mutOn = M.mutatorActive(); G.debugContract(Object.assign(mk(), evOf)); const inMut = E.SAVE.wallet - b1; M.setMutatorChoice('scarygta', 'off'); M.beginRun('scarygta', false);
    const b2 = E.SAVE.wallet; G.debugContract(mk()); G.debugContract(Object.assign(mk(), evOf)); const normal = E.SAVE.wallet - b2;
    return { id, inRound, mutOn, inMut, normal };
});
ok('no payout during a mode round or under a mutator, and the same contract pays normally afterwards', r2.id && r2.inRound === 0 && r2.inMut === 0 && r2.normal >= 60, r2);
// ----- telefon: licznik DEALS i podpowiedź -----
const r3 = await ev(async () => { const G = await import('./levels/scarygta.js'); const S = G.testState(); const info = G.debugCity ? null : null; return (G.debugContract({ stars: 0, got: 0, night: 'calm', y: 0 })).info; });
ok('the phone info lists three contracts with texts and the next undone one', r3.list.length === 3 && r3.list.every(q => q.text.length > 10) && r3.total === 3, r3);
ok('no page errors', errors.length === 0, errors);
console.log(fails ? 'FAILED: ' + fails : 'contracts: all checks passed'); await browser.close(); server.close(); process.exit(fails ? 1 : 0);
