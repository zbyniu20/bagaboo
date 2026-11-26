// Test w przeglądarce: Scary GTA, etap 3a: sieć (ścieżka hosta z fałszywym gościem i ścieżka gościa z fabrykowanymi migawkami; PeerJS nie jest potrzebny). Użycie: CHROMIUM_PATH=... node gtanet.mjs
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
const shot = async (name, x, y, z, yaw) => { if (!SP) return; await ev(async ([x, y, z, yaw]) => { const PL = await import('./core/player.js'), D = await import('./core/desktop.js'); PL.setPlayerPosition(x, y, z); D.setDesktopFacing(yaw); }, [x, y, z, yaw]); await page.waitForTimeout(1800); await page.screenshot({ path: SP + '/city_' + name + '.png', timeout: 120000 }); };
const info = () => ev(async () => { const G = await import('./levels/scarygta.js'), E = await import('./core/engine.js'), P = await import('./core/player.js'); return Object.assign({}, G.debugCity(), { level: E.L.levelId, y: +P.playerBody.position.y.toFixed(2), z: +P.playerBody.position.z.toFixed(1), ms: +(+E.L.moveScale).toFixed(3), maxZ: E.L.bounds.maxZ, ball: !!E.L.ballBounds, calls: E.renderer ? 0 : 0 }); });


const w = (ms) => page.waitForTimeout(ms);
// host + fałszywy gość g1 stojący przy torbie jubilera
const setup = await ev(async () => {
    const N = await import('./core/network.js'), G = await import('./levels/scarygta.js'), P = await import('./core/player.js');
    N.NET.mode = 'host'; const S = G.testState(), jw = S.bags.find(b => b.id === 'jewelry');
    P.setPlayerPosition(-70, 1.2, 40);
    N.playersState['g1'] = { lvl: 'scarygta', head: { p: [jw.x + 1, jw.y + 1.0 + 0.6, jw.z] }, h1: { p: [0, 0, 0] }, h2: { p: [0, 0, 0] } };
    return { x: jw.x, y: jw.y, z: jw.z, me: N.myId() };
});
await w(1500);
const out1 = await ev(async () => (await import('./levels/scarygta.js')).debugOutbox());
const st = out1.filter(m => m.k === 'st').pop();
ok('the host broadcasts snapshots with cops, 6 bags and heat for itself and the guest', st && Array.isArray(st.cops) && st.bags.length === 6 && st.heats && st.heats[setup.me] && st.heats['g1'], st && { bags: st.bags && st.bags.length, heats: st.heats });
const far = await ev(async () => { const G = await import('./levels/scarygta.js'), S = G.testState(), bank = S.bags.find(b => b.id === 'bank'); G.debugNet({ k: 'take', b: 'bank' }, 'g1'); G.debugNet({ k: 'take', b: 'jewelry' }, 'ghost'); G.debugNet({ k: 'take', b: 'nope' }, 'g1'); G.debugNet(null, 'g1'); return { bank: bank.holder, jw: S.bags.find(b => b.id === 'jewelry').holder }; });
ok('a far-away take, an unknown sender, an unknown bag and null are all rejected', far.bank === null && far.jw === null, far);
const near = await ev(async () => { const G = await import('./levels/scarygta.js'), S = G.testState(); G.debugNet({ k: 'take', b: 'jewelry' }, 'g1'); const jw = S.bags.find(b => b.id === 'jewelry'); return { holder: jw.holder, vis: jw.g.visible, heat: S.sim.heatOf('g1').v, mine: S.got }; });
ok('a guest next to the bag takes it (host view), the alarm adds heat to the guest only', near.holder === 'g1' && near.vis === false && near.heat >= 25 && near.mine === 0, near);
const sh = await ev(async () => { const G = await import('./levels/scarygta.js'), S = G.testState(), a = S.sim.heatOf('g1').v; G.debugNet({ k: 'ev', kind: 'shout' }, 'g1'); const b = S.sim.heatOf('g1').v; G.debugNet({ k: 'ev', kind: 'shout' }, 'g1'); const c = S.sim.heatOf('g1').v; return { a, b, c }; });
ok('a guest shout adds heat once per 3 s (rate limit on the host)', sh.b > sh.a && sh.c === sh.b, sh);
// BUST gościa: policjant tuż obok niego
await ev(async () => { const G = await import('./levels/scarygta.js'), S = G.testState(), g = (await import('./core/network.js')).playersState['g1']; G.debugHeat(0); S.sim.heats['g1'] = { v: 90, seenT: 0 }; G.debugSpawnCop(g.head.p[0] + 3, g.head.p[2]); });
await ev(async () => { const G = await import('./levels/scarygta.js'), g = (await import('./core/network.js')).playersState['g1']; for (let i = 0; i < 300; i++) { if (G.debugOutbox().some(m => m.k === 'bust')) return; if (i % 25 === 24) G.debugSpawnCop(g.head.p[0] + 2, g.head.p[2]); await new Promise(r => setTimeout(r, 200)); } });   // ponawiamy policjanta obok gościa, gdy poprzedni się oddalił
const bu = await ev(async () => { const G = await import('./levels/scarygta.js'), S = G.testState(); const m = G.debugOutbox().filter(m => m.k === 'bust').pop(); return { m: m || null, holder: S.bags.find(b => b.id === 'jewelry').holder }; });
ok('a cop catching the guest sends BUST to that guest and the bag falls back to the street', bu.m && bu.m.id === 'g1' && bu.m.r === 'cop' && bu.holder === null, bu);
// rozłączenie: gość z torbą znika
const dc = await ev(async () => { const G = await import('./levels/scarygta.js'), N = await import('./core/network.js'), S = G.testState(), jw = S.bags.find(b => b.id === 'jewelry'); S.sim.reset(); S.sim.heats['g1'] = { v: 0, seenT: 99 }; for (let i = 0; i < 600 && (S.bustUntil['g1'] || 0) > S.clock; i++) await new Promise(r => setTimeout(r, 100)); G.debugNet({ k: 'take', b: 'jewelry' }, 'g1'); const had = jw.holder; delete N.playersState['g1']; await new Promise(r => setTimeout(r, 800)); return { had, holder: jw.holder, home: Math.hypot(jw.x - jw.ox, jw.z - jw.oz) < 0.01 && jw.g.visible }; });
ok('a guest who leaves while carrying loses the bag: it returns to its home spot', dc.had === 'g1' && dc.holder === null && dc.home, dc);
// ścieżka gościa: migawki hosta
const gu = await ev(async () => {
    const N = await import('./core/network.js'), G = await import('./levels/scarygta.js'), S = G.testState(), me = N.myId();
    N.NET.mode = 'guest'; N.playersState[N.GAME_PREFIX + N.NET.code] = { lvl: 'scarygta', head: { p: [0, 1.6, 0] } };
    G.debugNet({ k: 'st', cops: [[0, 10, 10, 0, 'chase'], [1, NaN, 1, 0, 'patrol'], 'zzz', null, [99, 1, 1, 1, 'x']], bags: [['bank', 1, 2, 3, me], ['evil', 1, 2, 3, null], ['gas', 'x', 1, 1, null]], heats: { [me]: [80, 0], '<bad>': 'zz' } }, 'host');
    await new Promise(r => setTimeout(r, 1200));
    const a = { cops: S.sim.activeCops().length, modes: S.sim.activeCops().map(c => c.st.mode), got: S.got, stars: S.sim.starsOf('me'), bank: S.bags.find(b => b.id === 'bank').holder, puppet: S.sim.puppet };
    G.debugNet({ k: 'st', cops: [], bags: [], heats: {} }, 'ghost'); G.debugNet({ k: 'bust', id: me, r: 'cop', x: 5, z: 5 }, 'host');
    await new Promise(r => setTimeout(r, 400)); a.busted = S.busted; a.gotAfter = S.got;
    N.NET.mode = 'solo'; return a;
});
ok('a guest follows the host snapshot (one cop in chase, its bag, 4 stars), ignores garbage and a forged sender, and a BUST for it starts the busted state', gu.cops === 1 && gu.modes[0] === 'chase' && gu.got === 1 && gu.stars === 4 && gu.bank === 'me' && gu.puppet === true && gu.busted >= 0, gu);

// ----- etap 3b: broń i PvP -----
const gun = await ev(async () => {
    const N = await import('./core/network.js'), G = await import('./levels/scarygta.js'), P = await import('./core/player.js'), E = await import('./core/engine.js'), D = await import('./core/desktop.js');
    const S = G.testState(), w = (ms) => new Promise(r => setTimeout(r, ms)), clock = async (t) => { for (let i = 0; i < 600 && S.clock < t; i++) await w(100); };
    N.NET.mode = 'host'; for (let i = 0; i < 600 && S.busted >= 0; i++) await w(100); S.sim.reset(); P.setPlayerPosition(-38, 1.2, 0); D.setDesktopFacing(0); await w(800);
    delete N.playersState['g1']; S.gunS = { me: S.gunS.me }; S.bustUntil = {}; S.mode = 'ffa'; S.sim.heats = {};
    N.playersState['g1'] = { lvl: 'scarygta', head: { p: [-38, 1.6, 10] }, h1: { p: [0, 0, 0] }, h2: { p: [0, 0, 0] }, profile: { name: 'Bob' } };
    await w(600);
    const c = E.camera.getWorldPosition(new E.THREE.Vector3()), aim = (ty) => { const v = [0, ty - c.y, 10 - c.z], l = Math.hypot(...v); return v.map(q => q / l); };
    const o = [c.x, c.y, c.z], out = {};
    // trafienie w głowę: -50 HP
    G.debugShoot('me', o, aim(1.6)); out.hp1 = S.gunS['g1'] && S.gunS['g1'].hp;
    G.debugShoot('me', o, aim(1.6)); out.rate = S.gunS['g1'].hp;   // zbyt szybko: odrzucony
    await clock(S.clock + 0.4); G.debugShoot('me', o, aim(1.6)); out.dead = S.gunS['g1'].hp;
    out.bust = G.debugOutbox().filter(m => m.k === 'bust').pop(); out.fx = G.debugOutbox().filter(m => m.k === 'fx').length; out.feed = G.debugGun().feed;
    out.heatMe = S.sim.heatOf('me').v;
    // poza własną głową (podrobiony początek lufy) i śmieciowe dane
    await clock(S.clock + 0.4); const before = S.gunS['me'].ammo; G.debugShoot('me', [c.x + 20, c.y, c.z], aim(1.6)); out.forged = S.gunS['me'].ammo === before;
    G.debugNet({ k: 'shot', o: [NaN, 1, 1], d: [0, 0, 1] }, 'g1'); G.debugNet({ k: 'shot', o: [1, 1, 1], d: [0, 0, 0] }, 'g1'); G.debugNet({ k: 'shot', o: [1, 1, 1], d: [0, 0, 1] }, 'ghost');
    // gość strzela w hosta (FFA): host traci HP
    await clock(S.bustUntil['g1'] + 0.2); { const g = N.playersState['g1']; g.head.p = [-38, 1.6, 10]; }
    const hp0 = S.gunS.me.hp, gs = S.gunS['g1']; gs.deadUntil = 0; gs.protectUntil = 0; S.bustUntil['g1'] = 0;
    const v = [c.x + 0 - -38, c.y - 1.6, c.z - 10], l = Math.hypot(...v), d = v.map(q => q / l);
    G.debugNet({ k: 'shot', o: [-38, 1.6, 10.2], d: d.map(q => +q.toFixed(4)) }, 'g1'); out.hostHp = [hp0, S.gunS.me.hp];
    // CO-OP: bez ognia przyjacielskiego
    S.mode = 'coop'; await clock(S.clock + 0.4); const hp1 = S.gunS['g1'].hp; G.debugShoot('me', o, aim(1.6)); out.coop = S.gunS['g1'].hp === hp1;
    // opcje admina w grze online są neutralizowane
    const M = await import('./core/modstate.js'); M.MOD.fly = true; M.MOD.boost = true; M.MOD.size = 5; M.PERSONAL.speed = 2; await w(500); out.admin = [M.MOD.fly, M.MOD.boost, M.MOD.size, M.PERSONAL.speed];
    N.NET.mode = 'solo'; return out;
});
ok('a headshot takes 50 HP, a second shot right after is rejected by the host (rate limit)', gun.hp1 === 50 && gun.rate === 50, gun);
ok('the second headshot kills the guest: BUST (shot) goes to them, a kill feed line appears, the shooter gets wanted heat', gun.dead === 0 && gun.bust && gun.bust.id === 'g1' && gun.bust.r === 'shot' && gun.feed.some(f => /HEADSHOT/.test(f) && /Bob/.test(f)) && gun.heatMe > 20 && gun.fx === 2, gun);
ok('a forged muzzle origin is rejected without using ammo, garbage and unknown senders do nothing', gun.forged === true, gun);
ok('a guest shot at the host hurts the host in FFA (25 body or 50 head damage)', gun.hostHp && gun.hostHp[1] < gun.hostHp[0], gun.hostHp);
ok('in CO-OP mode players cannot hurt each other', gun.coop === true, gun);
ok('in online play the ultimate speed, flying, boost and size are neutralized in this level', gun.admin && gun.admin[0] === false && gun.admin[1] === false && gun.admin[2] === 1 && gun.admin[3] === 1, gun.admin);
ok('no page errors', errors.length === 0, errors);
console.log(fails ? 'FAILED: ' + fails : 'gtanet: all checks passed'); await browser.close(); server.close(); process.exit(fails ? 1 : 0);
