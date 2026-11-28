// Test w przeglądarce: Scary GTA: obrażenia i ciała (procent obrażeń, upadek, kałuża krwi, ukryty awatar, znacznik trafienia, wiadomości gościa). Użycie: CHROMIUM_PATH=... [SHOTDIR=katalog] node gtadamage.mjs
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
const R = await ev(async () => {
    const N = await import('./core/network.js'), G = await import('./levels/scarygta.js'), P = await import('./core/player.js'), E = await import('./core/engine.js'), D = await import('./core/desktop.js'), ST = await import('./core/settings.js');
    const S = G.testState(), wt = (ms) => new Promise(r => setTimeout(r, ms)), clock = async (t) => { for (let i = 0; i < 600 && S.clock < t; i++) await wt(100); };
    N.NET.mode = 'host'; for (let i = 0; i < 600 && S.busted >= 0; i++) await wt(100); S.sim.reset(); P.setPlayerPosition(-38, 1.2, 0); D.setDesktopFacing(0); await wt(800);
    ST.SETTINGS.gore = true;
    delete N.playersState['g1']; S.gunS = { me: S.gunS.me }; S.bustUntil = {}; S.mode = 'ffa'; S.sim.heats = {};
    N.playersState['g1'] = { lvl: 'scarygta', head: { p: [-38, 1.6, 10] }, h1: { p: [0, 0, 0] }, h2: { p: [0, 0, 0] }, profile: { name: 'Bob' } };
    await wt(600);
    const c = E.camera.getWorldPosition(new E.THREE.Vector3()), aim = (ty) => { const v = [0, ty - c.y, 10 - c.z], l = Math.hypot(...v); return v.map(q => q / l); };
    const o = [c.x, c.y, c.z], out = {};
    out.before = G.debugCorpses();
    G.debugShoot('me', o, aim(1.6)); out.hit1 = G.debugCorpses().hit; out.hp1 = S.gunS['g1'].hp;   // trafienie w głowę: 50%
    await clock(S.clock + 0.4); G.debugShoot('me', o, aim(1.6)); out.hit2 = G.debugCorpses().hit; out.hp2 = S.gunS['g1'].hp;   // drugie: zabity
    out.bust = G.debugOutbox().filter(m => m.k === 'bust').pop(); out.fx = G.debugOutbox().filter(m => m.k === 'fx').pop();
    await wt(300); out.c0 = G.debugCorpses();
    G.debugCorpseStep(0.1, 5); out.c1 = G.debugCorpses();            // 0,5 s: upadek w toku
    G.debugCorpseStep(0.5, 6); out.c2 = G.debugCorpses();            // 3,5 s: leży, kałuża rośnie, awatar nadal ukryty
    G.debugCorpseStep(0.5, 3); out.c3 = G.debugCorpses();            // 5 s: awatar wraca
    G.debugCorpseStep(0.5, 40); out.c4 = G.debugCorpses();           // po 25 s ciała już nie ma
    const hud = G.debugGun(); out.hudHp = hud.hp;
    // bez Gore: ciało bez kałuży
    ST.SETTINGS.gore = false; G.debugCorpseAt('g1', -38, 10, 'player', 1); G.debugCorpseStep(0.5, 12); out.nogore = G.debugCorpses(); ST.SETTINGS.gore = true;
    G.debugCorpseStep(0.5, 40);
    // limit ciał i zastępowanie tego samego id
    for (let i = 0; i < 14; i++) G.debugCorpseAt('p' + i, -38 + i, 5, 'player', i); G.debugCorpseAt('p13', 0, 0, 'player', 0); out.cap = G.debugCorpses();
    G.debugCorpseStep(0.5, 40);
    // gość: cudza śmierć, własna śmierć i martwy policjant z wiadomości hosta
    N.NET.mode = 'guest'; const me = N.myId();
    G.debugNet({ k: 'bust', id: 'g7', r: 'shot', x: -30, z: 10, a: 1.5 }, 'host'); G.debugNet({ k: 'bust', id: 'g8', r: 'cop', x: -30, z: 12 }, 'host'); G.debugNet({ k: 'bust', id: 'g9', r: 'shot', x: NaN, z: 1 }, 'host'); G.debugNet({ k: 'bust', id: 'g10', r: 'shot', x: -31, z: 12, a: 99 }, 'host');
    out.guestOther = G.debugCorpses();
    G.debugNet({ k: 'fx', s: me, o: [0, 1, 0], e: [0, 1, 5], h: null, z: 'h', kill: true, c: 1, cb: [-20, 6, 2] }, 'host'); out.guestCop = G.debugCorpses();
    G.debugNet({ k: 'fx', s: me, o: [0, 1, 0], e: [0, 1, 5], h: 'gx', z: 'b', kill: false }, 'host'); out.guestHit = G.debugCorpses().hit;
    G.debugNet({ k: 'fx', s: me, o: [0, 1, 0], e: [0, 1, 5], h: null, z: 'b', kill: false, c: 0, cb: [1e9, 0, 1] }, 'host'); out.badBody = G.debugCorpses().n;
    G.debugCorpseStep(0.5, 40); N.NET.mode = 'host'; delete N.playersState['g1'];
    return out;
});
ok('the hit marker shows HEADSHOT 50% and then KILL for the shooter', R.hit1 === 'HEADSHOT 50%' && R.hit2 === 'KILL' && R.hp1 === 50 && R.hp2 === 0, [R.hit1, R.hit2, R.hp1, R.hp2]);
ok('the kill sends the BUST with a fall direction and an fx with the kill flag', R.bust && R.bust.id === 'g1' && R.bust.r === 'shot' && Number.isFinite(R.bust.a) && R.fx && R.fx.kill === true, [R.bust, R.fx]);
ok('the corpse is spawned at the death spot, the avatar of the dead player is hidden and a pool of blood grows after the fall', R.c0.n === 1 && R.c0.ids[0] === 'g1' && R.c0.hidden.join() === 'g1' && R.c0.bodies === 1 && R.c0.pools === 0 && R.c2.pools === 1 && R.c2.hidden.join() === 'g1', [R.c0, R.c2]);
ok('the avatar comes back after 5 s (the respawn), the corpse fades away after the linger time', R.c3.hidden.length === 0 && R.c3.n === 1 && R.c4.n === 0 && R.c4.bodies === 0 && R.c4.pools === 0, [R.c3, R.c4]);
ok('without Gore there is a body but no pool of blood', R.nogore.bodies === 1 && R.nogore.pools === 0, R.nogore);
ok('at most 10 corpses, a new corpse of the same id replaces the old one', R.cap.n === 10 && R.cap.ids.filter(i => i === 'p13').length === 1, R.cap);
ok('the guest gets the corpse of another shot player (garbage coordinates and non-shot busts are ignored, the yaw is clamped)', R.guestOther.ids.join() === 'g7,g10' || R.guestOther.ids.sort().join() === 'g10,g7', R.guestOther);
ok('the guest gets a dead cop from the fx, a hit marker for its own shot at a player, and a forged far body is ignored', R.guestCop.ids.length === R.guestOther.n + 1 && R.guestCop.ids.some(i => i.startsWith('c')) && R.guestHit === 'HIT 25%' && R.badBody === R.guestCop.n, [R.guestCop, R.guestHit, R.badBody]);
if (SP) {
    fs.mkdirSync(SP, { recursive: true });
    await ev(async () => { const G = await import('./levels/scarygta.js'), P = await import('./core/player.js'), D = await import('./core/desktop.js'), ST = await import('./core/settings.js'); ST.SETTINGS.gore = true; P.setPlayerPosition(-38, 1.2, 0); D.setDesktopFacing(Math.PI, -0.25); const E = await import('./core/engine.js'); for (const c of E.camera.children) c.visible = false; G.debugCorpseAt('c1', -38, 4, 'player', 0.4); G.debugCorpseAt('c2', -36.2, 5.2, 'cop', 2.6); G.debugCorpseAt('c3', -40, 6.5, 'player', 5); G.debugCorpseStep(0.25, 16); });
    await w(600); await page.screenshot({ path: path.join(SP, 'corpses.png') });
    await ev(async () => { const G = await import('./levels/scarygta.js'), D = await import('./core/desktop.js'); G.debugCorpseStep(0.1, 1); D.setDesktopFacing(Math.PI, -0.32); const E = await import('./core/engine.js'); for (const c of E.camera.children) c.visible = false; });
    await w(300); console.log(JSON.stringify(await ev(async () => (await import('./levels/scarygta.js')).debugCorpses()))); await page.screenshot({ path: path.join(SP, 'corpses2.png') });
}
ok('no page errors', errors.length === 0, errors);
await browser.close(); server.close();
if (fails) { console.log(fails + ' check(s) failed'); process.exit(1); } console.log('gtadamage: all checks passed');
