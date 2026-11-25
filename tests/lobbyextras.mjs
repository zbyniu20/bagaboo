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
const SP = process.env.SHOTDIR || '';
await page.evaluate(async () => { const M = await import('./main.js'); await M.loadLevel('lobby'); });
await page.waitForTimeout(5000);
const ev = (fn, arg) => page.evaluate(fn, arg);
const shot = async (name, x, y, z, yaw) => { if (!SP) return; await ev(async ([x, y, z, yaw]) => { const PL = await import('./core/player.js'), D = await import('./core/desktop.js'); PL.setPlayerPosition(x, y, z); D.setDesktopFacing(yaw); }, [x, y, z, yaw]); await page.waitForTimeout(1200); await page.screenshot({ path: SP + '/lobbyx_' + name + '.png', timeout: 120000 }); };

const start = await ev(async () => { const B = await import('./core/bestiary.js'), C = await import('./core/nightchest.js'), S = await import('./core/secrets.js'); return { b: B.debugBestiary(), c: C.debugNightChest(), s: S.debugSecrets() }; });
ok('the lobby builds 12 showcases, a ready chest and 7 hidden skulls', start.b && start.b.cases === 12 && start.b.seen === 0 && start.c && start.c.ready === true && start.c.lid === 0 && start.s && start.s.visible.length === 7, start);
const hts = await ev(async () => (await import('./core/bestiary.js')).debugFigureHeights());
ok('every figurine fits inside its glass case (about 0.85 m tall)', hts.length === 12 && hts.every(h => h > 0.3 && h < 1.05), hts);
await shot('gallery', -6, 1.2, 12, 0);
await shot('gallery_close', -9.3, 1.5, 6.2, -Math.PI / 2);
await shot('chest', 1.5, 1.2, 12, 0);
await shot('chest_close', 1.5, 1.3, 10.2, 0);

// Bestiariusz: odkrycie zapisuje się, wybór witryny działa
const best = await ev(async () => {
    const B = await import('./core/bestiary.js'), E = await import('./core/economy.js');
    const first = B.discoverBeast('mannequin'), again = B.discoverBeast('mannequin'), sel = B.debugSelectBeast(5);
    return { first, again, sel, seen: B.debugBestiary().seen, saved: JSON.stringify(E.SAVE.bestiary) };
});
ok('meeting a monster is saved once and a showcase can be selected', best.first === true && best.again === false && best.sel === 5 && best.seen === 1 && /"mannequin":1/.test(best.saved), best);
const tick = await ev(async () => { const B = await import('./core/bestiary.js'); let n = 0; for (let i = 0; i < 30; i++) B.bestiaryTick('hospital', 1); return B.debugBestiary().seen; });
ok('25 s on a level reveals its monster through the clock', tick === 2, tick);
await shot('gallery2', -6, 1.2, 12, 0);

// Skrzynia: jedno otwarcie dziennie, nagroda trafia do zapisu
const chest = await ev(async () => {
    const C = await import('./core/nightchest.js'), E = await import('./core/economy.js'), w0 = E.SAVE.wallet, o0 = E.SAVE.owned.length;
    const r = C.debugOpenChest(); await new Promise(res => setTimeout(res, 1500));
    const r2 = C.debugOpenChest();
    return { r, r2: !!r2, w: E.SAVE.wallet - w0, o: E.SAVE.owned.length - o0, after: C.debugNightChest(), saved: E.SAVE.chest };
});
ok('the chest opens once per day (a second try during the animation changes nothing), pays out and remembers it', chest.r && chest.r.streak === 1 && ((chest.r.item && chest.o === 1 && chest.w === 0) || (!chest.r.item && chest.w === chest.r.bones && chest.r.bones >= 40)) && chest.r2 === true && chest.after.ready === false && chest.saved.streak === 1 && chest.saved.total === 1 && /^\d{4}-\d{2}-\d{2}$/.test(chest.saved.last), chest);
await shot('egg_duck', -12.2, 1.6, 10.5, 3.14);
await shot('egg_chalk', -10.5, 1.5, -11.5, 0);
await shot('egg_hand', 14.3, 0.9, -10.6, 1.57);
await shot('egg_mouse', -12.0, 0.9, -8.5, 1.57);
await shot('chest_open', 1.5, 1.2, 12, 0);

// Sekrety: czaszka znika po znalezieniu i płaci raz
const sec = await ev(async () => {
    const S = await import('./core/secrets.js'), E = await import('./core/economy.js'), w0 = E.SAVE.wallet;
    const a = S.debugCollect('plush'), b = S.debugCollect('plush');
    return { a: !!a, b: !!b, w: E.SAVE.wallet - w0, vis: S.debugSecrets().visible, found: S.debugSecrets().found };
});
ok('a hidden skull pays once and disappears for good', sec.a === true && sec.b === false && sec.w === 40 && sec.vis.length === 6 && !sec.vis.includes('plush') && sec.found === 1, sec);

// Easter eggi: znalezienie płaci raz, zapis przetrwa wyjście z lobby
const egg = await ev(async () => {
    const G = await import('./core/eggs.js'), E = await import('./core/economy.js'), w0 = E.SAVE.wallet;
    const a = G.debugFindEgg('duck'), b = G.debugFindEgg('duck'), c = G.debugFindEgg('shout');
    return { a, b, c, w: E.SAVE.wallet - w0, d: G.debugEggs() };
});
ok('an easter egg pays once and is counted', egg.a === true && egg.b === false && egg.c === true && egg.w === 50 && egg.d.count === 2, egg);

// Po ponownym wejściu do lobby: zapis działa (znaleziona czaszka nie wraca, skrzynia zamknięta, potwór odkryty)
await ev(async () => { const M = await import('./main.js'); await M.loadLevel('levels'); });
await page.waitForTimeout(1500);
await ev(async () => { const M = await import('./main.js'); await M.loadLevel('lobby'); });
await page.waitForTimeout(4000);
const again = await ev(async () => { const B = await import('./core/bestiary.js'), C = await import('./core/nightchest.js'), S = await import('./core/secrets.js'), G = await import('./core/eggs.js'); return { b: B.debugBestiary(), c: C.debugNightChest(), s: S.debugSecrets(), e: G.debugEggs() }; });
ok('after leaving and coming back everything is remembered (and nothing leaks into other levels)', again.b && again.b.cases === 12 && again.b.seen === 2 && again.c.ready === false && again.c.lid < -1.5 && again.s.visible.length === 6 && again.e && again.e.count === 2, again);
ok('no page errors', errors.length === 0, errors);
console.log(fails ? 'FAILED: ' + fails : 'lobbyextras: all checks passed'); await browser.close(); server.close(); process.exit(fails ? 1 : 0);
