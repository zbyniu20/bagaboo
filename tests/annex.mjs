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
const ev = (fn, arg) => page.evaluate(fn, arg);
await ev(async () => { const M = await import('./main.js'); await M.loadLevel('lobby'); });
await page.waitForTimeout(5000);
const shot = async (name, x, y, z, yaw) => { if (!SP) return; await ev(async ([x, y, z, yaw]) => { const PL = await import('./core/player.js'), D = await import('./core/desktop.js'); PL.setPlayerPosition(x, y, z); D.setDesktopFacing(yaw); }, [x, y, z, yaw]); await page.waitForTimeout(1500); await page.screenshot({ path: SP + '/annex_' + name + '.png', timeout: 120000 }); };
const state = () => ev(async () => { const E = await import('./core/engine.js'), P = await import('./core/player.js'), A = await import('./core/annex.js'); return { level: E.L.levelId, z: +P.playerBody.position.z.toFixed(2), maxZ: E.L.bounds.maxZ, a: A.debugAnnex() }; });

const s0 = await state();
ok('the lobby builds the annex with 13 climb holds and the bounds reach into the far wall room', s0.level === 'lobby' && s0.a && s0.a.holds === 13 && s0.maxZ === 54.4, s0);
await shot('tunnel', -1, 1.6, 11, Math.PI);
await shot('mouth', -1, 1.6, 22, Math.PI);
await shot('back', -1, 1.6, 40, 0);
await shot('climb', 8, 1.6, 30, -1.57);

// Przejście tunelem do aneksu: poziom się nie zmienia (żaden portal nie odpala), gracz może tam stać
const walk = await ev(async () => { const P = await import('./core/player.js'), E = await import('./core/engine.js'); const out = []; for (const z of [12, 16, 18, 22, 35, 48]) { P.setPlayerPosition(-1, 1.5, z); await new Promise(r => setTimeout(r, 700)); out.push([z, +P.playerBody.position.z.toFixed(1), E.L.levelId]); } return out; });
ok('walking through the tunnel and across the annex stays in the lobby and nothing pushes the player back', walk.every(w => w[2] === 'lobby' && Math.abs(w[1] - w[0]) < 1.2), walk);

// Ściany: tylko ściana dawnej hali jest śliska, zachodnia ściana aneksu nie
const slip = await ev(async () => { const E = await import('./core/engine.js'); const west = E.L.obstacles.filter(o => o.box3.max.x <= -14.9 && o.box3.min.x < -19); return west.map(o => ({ z0: o.box3.min.z, grip: o.grip })); });
ok('only the west wall of the old hall is slippery, the annex wall is normal', slip.length >= 2 && slip.filter(w => w.z0 < 0).every(w => w.grip === 0.45) && slip.filter(w => w.z0 > 0).every(w => w.grip === undefined || w.grip >= 1), slip);

// Climb Rush: start, bieg, dzwon, rekord w zapisie
const climb = await ev(async () => {
    const A = await import('./core/annex.js'), E = await import('./core/economy.js'), w = (ms) => new Promise(r => setTimeout(r, ms));
    A.debugClimbTouch('start'); await w(400); const a = A.debugAnnex();
    for (let i = 0; i < 60 && A.debugAnnex().t < 2.3; i++) await w(300);
    A.debugClimbTouch('end'); await w(600); const b = A.debugAnnex();
    return { a, b, saved: JSON.stringify(E.SAVE.annex) };
});
ok('Climb Rush runs from the first hold to the bell and saves the record', climb.a.ph === 'run' && climb.b.ph === 'done' && climb.b.last >= 2 && Math.abs(climb.b.best - climb.b.last) < 0.01 && /climbBest/.test(climb.saved), climb);
await shot('climb_done', 10, 1.6, 22.5, -1.57);

// Stół spirytystyczny: wybór liter, odpowiedź ducha; organy: nuty i odstęp między dźwiękami
const play = await ev(async () => {
    const P = await import('./core/annexplay.js'), w = (ms) => new Promise(r => setTimeout(r, ms));
    for (const ch of 'HELP') P.debugOuijaPick(ch);
    await w(300); const g1 = P.debugAnnexPlay(); let g2 = g1;
    for (let i = 0; i < 80 && g2.ghost; i++) { await w(300); g2 = P.debugAnnexPlay(); }
    await w(2500); g2 = P.debugAnnexPlay();   // planszetka stoi na ostatniej literze: nie wolno jej wybrać drugi raz
    const k1 = P.debugOrganKey(0), k2 = P.debugOrganKey(0), k3 = P.debugOrganKey(7);
    return { start: g1, end: g2, k: [k1, k2, k3], organ: P.debugAnnexPlay().organPlays };
});
ok('the ouija ghost answers a question letter by letter (HELP -> RUN) and the organ plays notes but not twice in a row on one key', play.start.keys === 8 && play.start.ghost && play.end.ghost === false && play.end.text === 'HELPRUN' && play.k[0] === true && play.k[1] === false && play.k[2] === true && play.organ === 2, play);
await shot('ouija', -10.5, 1.6, 40, Math.PI);
await shot('organ', 10, 1.6, 47.5, 0);
await shot('annex_wide', -1, 1.6, 22, Math.PI);

// Tyrolka: dotknięcie uchwytu zabiera gracza w dół, na końcu puszcza; poziom się nie zmienia
await shot('zip', -8, 1.6, 30, 1.57);
const zip = await ev(async () => {
    const Z = await import('./core/annexzip.js'), E = await import('./core/engine.js'), P = await import('./core/player.js'), w = (ms) => new Promise(r => setTimeout(r, ms));
    P.setPlayerPosition(-13.7, 10.4, 35.4); await w(300); const before = Z.debugAnnexZip();
    Z.debugZipGrab(); await w(700); const mid = Z.debugAnnexZip();
    for (let i = 0; i < 90 && Z.debugAnnexZip().ph === 'ride'; i++) await w(400);
    await w(1500); const after = Z.debugAnnexZip();
    return { before, mid, after, level: E.L.levelId };
});
ok('the zipline carries the player down the rope and lets go at the bottom (one ride, still in the lobby)', zip.mid.ph === 'ride' && zip.after.ph === 'idle' && zip.after.rides === 1 && zip.mid.body[1] < zip.before.body[1] + 0.5 && zip.after.body[1] < 4.5 && zip.after.body[2] < 28 && zip.level === 'lobby', zip);

// Ghost Gallery: trafienie piłką startuje rundę, koniec rundy zapisuje wynik i nie kasuje rekordu wspinaczki
await shot('gallery', -1, 1.6, 44, Math.PI);
const gal = await ev(async () => {
    const G = await import('./core/annexgallery.js'), E = await import('./core/economy.js'), w = (ms) => new Promise(r => setTimeout(r, ms));
    G.debugGalleryForceUp(2); G.debugGalleryBall(0, -1, 1.2, 49.45); for (let i = 0; i < 40 && G.debugAnnexGallery().hits < 1; i++) await w(300); const a = G.debugAnnexGallery();
    G.debugGalleryEnd(); for (let i = 0; i < 40 && G.debugAnnexGallery().ph === 'run'; i++) await w(300); await w(300); const b = G.debugAnnexGallery();
    return { a, b, saved: JSON.stringify(E.SAVE.annex) };
});
ok('a ball hitting a standing ghost scores and starts the round; the end of the round saves the best and keeps the climb record', gal.a.balls === 3 && gal.a.hits >= 1 && gal.a.score >= 10 && gal.b.last >= 10 && gal.b.best >= 10 && /galleryBest/.test(gal.saved) && /"climbBest":[1-9]/.test(gal.saved), gal);

// Po wyjściu i powrocie rekord jest zapamiętany, a nic nie przecieka do innych poziomów
await ev(async () => { const M = await import('./main.js'); await M.loadLevel('levels'); });
await page.waitForTimeout(1500);
const gone = await ev(async () => { try { const A = await import('./core/annex.js'); return A.debugAnnex(); } catch (e) { return 'err'; } });
ok('the annex is cleaned up when the lobby is left', gone === null, gone);
await ev(async () => { const M = await import('./main.js'); await M.loadLevel('lobby'); });
await page.waitForTimeout(4000);
const again = await state();
ok('coming back to the lobby remembers the climb record', again.a && again.a.best >= 2 && again.a.ph === 'idle', again);
ok('no page errors', errors.length === 0, errors);
console.log(fails ? 'FAILED: ' + fails : 'annex: all checks passed'); await browser.close(); server.close(); process.exit(fails ? 1 : 0);
