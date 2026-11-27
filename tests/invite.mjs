// Test w przeglądarce: zaproszenie od hosta (panel, ACCEPT, DECLINE, klawisze Y/N, wygaśnięcie po 10 s, zastąpienie nowym). Użycie: CHROMIUM_PATH=... node invite.mjs
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
const R = await ev(async () => {
    const I = await import('./core/invite.js'), L = await import('./core/invitelogic.js'), T = await import('./core/terminal.js'), out = {};
    const mk = (lv) => L.newInvite({ level: lv, seed: 7, data: undefined }, lv === 'hospital' ? 'Hospital' : lv);
    const results = [];
    // 1) przycisk ACCEPT (jak laser)
    I.showInvite(mk('hospital'), (inv) => results.push(inv.state));
    out.shown = I.debugInvite(); T.redrawTerminals();
    const term = I.debugPanel(); out.btns = term.buttons.map(b => b.id); out.hasButtons = !!term && term.buttons.some(b => b.id === 'no');
     term.buttons.find(b => b.id === 'yes').action(); out.afterYes = I.debugInvite();
    // 2) przycisk DECLINE
    I.showInvite(mk('hospital'), (inv) => results.push(inv.state)); T.redrawTerminals();
    I.debugPanel().buttons.find(b => b.id === 'no').action();
    // 3) klawisze
    I.showInvite(mk('hospital'), (inv) => results.push(inv.state)); window.dispatchEvent(new KeyboardEvent('keydown', { key: 'y' }));
    I.showInvite(mk('hospital'), (inv) => results.push(inv.state)); window.dispatchEvent(new KeyboardEvent('keydown', { key: 'n' }));
    // 4) brak odpowiedzi: 10 s w krokach po 0,5 s
    I.showInvite(mk('hospital'), (inv) => results.push(inv.state)); let steps = 0; while (I.debugInvite().on && steps < 40) { I.updateInvite(0.5); steps++; } out.timeoutSteps = steps; out.afterTimeout = I.debugInvite();
    // 5) nowe zaproszenie zastępuje trwające (stare liczy się jako odrzucone)
    I.showInvite(mk('hospital'), (inv) => results.push('old:' + inv.state)); I.showInvite(mk('mine'), (inv) => results.push('new:' + inv.state));
    out.replaced = I.debugInvite(); I.debugAnswer(true);
    // 6) odpowiedź po wygaśnięciu nic nie robi
    I.debugAnswer(true); out.results = results; out.end = I.debugInvite();
    return out;
});
ok('the panel shows with a name and has ACCEPT and DECLINE buttons, and it is in the scene', R.shown.on && R.shown.name === 'Hospital' && R.shown.inScene && R.hasButtons, [R.shown, R.btns]);
ok('ACCEPT closes the panel and removes it from the scene', !R.afterYes.on && !R.afterYes.inScene, R.afterYes);
ok('accept, decline, keys Y and N and no answer all give the right final state', JSON.stringify(R.results.slice(0, 5)) === JSON.stringify(['accepted', 'declined', 'accepted', 'declined', 'timeout']), R.results);
ok('no answer ends after exactly 10 s (20 steps of 0.5 s)', R.timeoutSteps === 20 && !R.afterTimeout.on, [R.timeoutSteps, R.afterTimeout]);
ok('a new invitation replaces the running one (the old one counts as declined) and the new one can be accepted', R.replaced.name === 'mine' && R.results.slice(5).join() === 'old:declined,new:accepted' && !R.end.on, [R.replaced, R.results]);
const kept = await ev(async () => { const I = await import('./core/invite.js'), L = await import('./core/invitelogic.js'), M = await import('./main.js'); await M.loadLevel('hospital'); await new Promise(r => setTimeout(r, 1500)); I.showInvite(L.newInvite({ level: 'lobby' }, 'Lobby'), () => {}); const p = I.debugPanel(); const r = { mesh: !!p.mesh, shown: I.debugInvite().inScene }; I.debugAnswer(false); return r; });
ok('the panel keeps its mesh after a level change (laser still works)', kept.mesh && kept.shown, kept);
ok('no page errors', errors.length === 0, errors);
await browser.close(); server.close();
if (fails) { console.log(fails + ' check(s) failed'); process.exit(1); } console.log('invite: all checks passed');
