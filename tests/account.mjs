// Test w przeglądarce: konto na stronie startowej (zapisana sesja -> wylogowanie -> gra jako gość -> start). Użycie: CHROMIUM_PATH=... node account.mjs
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
const page = await ctx.newPage(), errs = []; page.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message)); page.on('console', (m) => { if (m.type() === 'error' && !/peerjs|favicon|Failed to load resource/i.test(m.text())) errs.push('CONSOLE ' + m.text().slice(0, 300)); });
await page.route(/bagaboo-api/, (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) }));   // serwer kont: potwierdza sesję
await page.addInitScript(() => { localStorage.setItem('bagaboo_session', JSON.stringify({ token: 'a.b.c', id: 7, nick: 'Tester', exp: Math.floor(Date.now() / 1000) + 86400 })); });
await page.goto(`http://localhost:${port}/?three=${V}`);
await page.waitForFunction(() => /Ready|Could not/.test(document.getElementById('status').innerText), null, { timeout: 120000 });
const vis = (id) => page.evaluate((id) => { const e = document.getElementById(id); return !!e && e.offsetParent !== null; }, id);
ok('a saved session opens the menu stage as a signed-in player', await vis('menuStage') && !(await vis('authStage')) && /Signed in as Tester/.test(await page.innerText('#acctWho')));
ok('the Log out button is visible and the nickname field is locked', await vis('btnLogout') && await page.evaluate(() => document.getElementById('playerName').readOnly === true));
await page.click('#btnLogout');
ok('after logging out the login stage is shown with the guest button', await vis('authStage') && await vis('btnGuest') && !(await vis('menuStage')));
await page.click('#btnGuest');
ok('choosing "Play as guest" opens the menu as a guest with an editable nickname', await vis('menuStage') && /Playing as a guest/.test(await page.innerText('#acctWho')) && await page.evaluate(() => document.getElementById('playerName').readOnly === false));
ok('the saved session is gone from this device', await page.evaluate(() => localStorage.getItem('bagaboo_session') === null));
await page.click('#btnSolo', { timeout: 90000 }); await page.waitForTimeout(2500);
ok('a guest can start the game', await page.evaluate(async () => { const N = await import('./core/network.js'); return N.NET.mode === 'solo'; }));
ok('no page errors', errs.length === 0, errs);
await page.close();
// --- menu VR (w goglach nie ma strony startowej) i menu pauzy w grze ---
async function openPage(session) {
    const p = await ctx.newPage(); p.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message));
    await p.route(/bagaboo-api/, (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) }));
    if (session) await p.addInitScript(() => { localStorage.setItem('bagaboo_session', JSON.stringify({ token: 'a.b.c', id: 7, nick: 'Tester', exp: Math.floor(Date.now() / 1000) + 86400 })); });
    await p.goto(`http://localhost:${port}/?three=${V}`);
    await p.waitForFunction(() => /Ready|Could not/.test(document.getElementById('status').innerText), null, { timeout: 120000 });
    return p;
}
const vrButtons = (p) => p.evaluate(async () => { const M = await import('./core/vrmenu.js'); M.vrMenuTerminal.redraw(); return M.vrMenuTerminal.buttons.map(b => b.id); });
const vrPress = (p, id) => p.evaluate(async (id) => { const M = await import('./core/vrmenu.js'); const b = M.vrMenuTerminal.buttons.find(x => x.id === id); if (b) b.action(); return !!b; }, id);
const shown = (p, id) => p.evaluate((id) => { const e = document.getElementById(id); return !!e && e.offsetParent !== null; }, id);
{
    const p = await openPage(true); const ids = await vrButtons(p);
    ok('VR menu: a signed-in player gets a "Log out (play as guest)" button', ids.includes('logout') && !ids.includes('guest'), ids);
    await vrPress(p, 'logout');
    ok('VR menu: pressing it logs out and opens the menu as a guest', await shown(p, 'menuStage') && /Playing as a guest/.test(await p.innerText('#acctWho')) && await p.evaluate(() => localStorage.getItem('bagaboo_session') === null));
    const ids2 = await vrButtons(p); ok('VR menu: a guest sees neither log out nor the guest button', !ids2.includes('logout') && !ids2.includes('guest'), ids2);
    await p.close();
}
{
    const p = await openPage(false); const ids = await vrButtons(p);
    ok('VR menu: before choosing, a "Play as guest" button is offered', ids.includes('guest') && !ids.includes('logout'), ids);
    await vrPress(p, 'guest'); ok('VR menu: pressing it opens the guest menu', await shown(p, 'menuStage'));
    await p.close();
}
{
    const p = await openPage(true); await p.click('#btnSolo', { timeout: 90000 }); await p.waitForTimeout(2500);
    const r = await p.evaluate(async () => {
        const P = await import('./core/pause.js'), A = await import('./core/auth.js'); P.pauseMenu.redraw(); const out = {};
        const b = () => P.pauseMenu.buttons.find(x => x.id === 'logout'); out.has = !!b(); b().action();   // pierwsze dotknięcie tylko uzbraja
        out.afterFirst = !!A.account(); P.pauseMenu.redraw(); b().action();   // drugie potwierdza
        out.afterSecond = !!A.account(); out.pauseClosed = !P.PAUSE.on; out.guestUi = document.getElementById('acctWho').innerText;
        P.pauseMenu.redraw(); out.stillThere = !!b(); return out;
    });
    ok('pause menu: a signed-in player has a log out button', r.has, r);
    ok('pause menu: the first tap only arms it, the second logs out and the game goes on as a guest', r.afterFirst === true && r.afterSecond === false && /Playing as a guest/.test(r.guestUi) && r.stillThere === false, r);
    await p.close();
}
{
    const p = await openPage(true); await p.click('#btnSolo', { timeout: 90000 }); await p.waitForTimeout(2500);
    await p.evaluate(() => { window.__marker = 'same-page'; });
    const r = await p.evaluate(async () => { const N = await import('./core/network.js'), P = await import('./core/pause.js'); N.NET.mode = 'host'; P.PAUSE.onLogout(); await new Promise(res => setTimeout(res, 1500)); return { mode: N.NET.mode, marker: window.__marker }; });
    ok('logging out in an online room leaves the room and plays solo as a guest WITHOUT reloading the page (the VR session survives)', r.mode === 'solo' && r.marker === 'same-page', r);
    await p.close();
}
ok('no page errors (VR menu and pause)', errs.length === 0, errs);
await browser.close(); server.close();
console.log(fails ? 'account: FAILED ' + fails : 'account: all checks passed'); process.exit(fails ? 1 : 0);
