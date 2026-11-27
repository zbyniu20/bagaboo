// Test w przeglądarce: Scary GTA: tryby gry (policja kontra złodzieje, wyścig o torby, kooperacja; ścieżka hosta z fałszywym gościem i ścieżka gościa z migawką). Użycie: CHROMIUM_PATH=... node gtamodes.mjs
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
const m0 = await ev(async () => (await import('./levels/scarygta.js')).debugMode());
ok('the mode panel starts in free roam, idle, with only the host in the player list', m0.gm.mode === 'free' && m0.gm.phase === 'idle' && m0.ids.length === 1 && m0.myRole === 'robber', m0);
const solo = await ev(async () => { const G = await import('./levels/scarygta.js'); G.debugModeSet('cops', true); const a = G.debugMode().gm.phase; G.debugModeSet('coop', true); const b = G.debugMode().gm; G.debugModeSet('free'); const c = G.debugMode().gm.phase; return { a, b: { ph: b.phase, t: b.t }, c }; });
ok('solo: cops vs robbers needs 2 players (stays idle), co-op can start alone with a 300 s timer, and a running round cannot be re-picked', solo.a === 'idle' && solo.b.ph === 'run' && solo.b.t > 290 && solo.c === 'run', solo);
// ----- host + fałszywy gość g1 -----
const cops = await ev(async () => {
    const N = await import('./core/network.js'), G = await import('./levels/scarygta.js'), P = await import('./core/player.js'), E = await import('./core/engine.js'), w = (ms) => new Promise(r => setTimeout(r, ms));
    const S = G.testState(); N.NET.mode = 'host'; G.debugModeSet('free'); for (let i = 0; i < 20; i++) { G.debugModeSet('free', true); if (G.debugMode().gm.phase === 'idle') break; }
    S.sim.reset(); for (let i = 0; i < 400 && S.busted >= 0; i++) await w(100);
    P.setPlayerPosition(-38, 1.2, 0); await w(500);
    N.playersState['g1'] = { lvl: 'scarygta', head: { p: [-38, 1.6, 20] }, h1: { p: [0, 0, 0] }, h2: { p: [0, 0, 0] }, profile: { name: 'Bob' } }; await w(600);
    G.debugModeSet('cops', true); const st = G.debugMode().gm; S.gm.roles = { me: 'robber', g1: 'cop' };
    N.playersState['g1'].head.p = [-38, 1.6, 0.4];   // policjant-gracz tuż przy złodzieju-hoście
    for (let i = 0; i < 100 && S.busted < 0; i++) await w(100);
    return { started: st.phase, bustedMe: S.busted >= 0, score: S.gm.score.g1 };
});
ok('cops vs robbers with a guest: a human cop touching the robber busts him and scores 1', cops.started === 'run' && cops.bustedMe === true && cops.score === 1, cops);
const bags = await ev(async () => {
    const N = await import('./core/network.js'), G = await import('./levels/scarygta.js'), P = await import('./core/player.js'), w = (ms) => new Promise(r => setTimeout(r, ms));
    const S = G.testState(); for (let i = 0; i < 600 && S.busted >= 0; i++) await w(100);
    S.sim.reset(); S.gm.roles = { me: 'cop', g1: 'robber' }; N.playersState['g1'].head.p = [-38, 1.6, 40];
    const jw = S.bags.find(b => b.id === 'jewelry'); for (const b of S.bags) { b.holder = null; b.got = false; b.g.visible = true; }
    P.setPlayerPosition(jw.x, jw.y + 1.0, jw.z); await w(1500); const meCop = jw.holder;
    S.gm.roles = { me: 'robber', g1: 'cop' }; N.playersState['g1'].head.p = [jw.x + 1, jw.y + 1.0 + 0.6, jw.z]; G.debugNet({ k: 'take', b: 'jewelry' }, 'g1'); const guestCop = jw.holder;
    S.gm.roles = { me: 'cop', g1: 'robber' }; return { meCop, guestCop };
});
ok('a cop (host or guest) cannot pick up bags', bags.meCop === null && bags.guestCop === null, bags);
const shots = await ev(async () => {
    const N = await import('./core/network.js'), G = await import('./levels/scarygta.js'), P = await import('./core/player.js'), E = await import('./core/engine.js'), w = (ms) => new Promise(r => setTimeout(r, ms));
    const S = G.testState(); S.sim.reset(); for (let i = 0; i < 600 && S.busted >= 0; i++) await w(100);
    P.setPlayerPosition(-38, 1.2, 0); N.playersState['g1'].head.p = [-38, 1.6, 10]; await w(400); S.bustUntil = {}; S.gunS = { me: S.gunS.me }; S.gm = Object.assign(S.gm, { phase: 'run', mode: 'cops', t: 200, roles: { me: 'cop', g1: 'robber' } });
    const c = E.camera.getWorldPosition(new E.THREE.Vector3()), v = [0, 1.6 - c.y, 10 - c.z], l = Math.hypot(...v), d = v.map(q => q / l), o = [c.x, c.y, c.z];
    G.debugShoot('me', o, d); const cross = S.gunS['g1'] ? S.gunS['g1'].hp : 100;
    S.gm.roles = { me: 'robber', g1: 'robber' }; for (let i = 0; i < 20 && S.clock < S.gunS.me.last + 0.4; i++) await w(100); const hp0 = S.gunS['g1'].hp; G.debugShoot('me', o, d); const same = S.gunS['g1'].hp;
    return { cross, hp0, same };
});
ok('shots hurt across teams only in cops mode (cop shoots robber: -50 for a headshot; robber shoots robber: nothing)', shots.cross === 50 && shots.same === shots.hp0, shots);
const race = await ev(async () => {
    const N = await import('./core/network.js'), G = await import('./levels/scarygta.js'), w = (ms) => new Promise(r => setTimeout(r, ms));
    const S = G.testState(); S.gm = { mode: 'race', phase: 'run', t: 150, roles: { me: 'robber', g1: 'robber' }, score: { me: 0, g1: 0 }, delivered: 0, winner: '' };
    for (const id of ['jewelry', 'bank', 'gas']) { const b = S.bags.find(q => q.id === id); b.holder = 'g1'; b.got = true; b.g.visible = false; }
    G.debugNet({ k: 'ev', kind: 'deliver' }, 'g1'); await w(300);
    return { ph: S.gm.phase, winner: S.gm.winner, free: S.bags.filter(b => b.holder === null).length };
});
ok('the bag race: a guest leaving with 3 bags wins the round and the bags return to the city', race.ph === 'over' && race.winner === 'g1' && race.free === 6, race);
const coop = await ev(async () => {
    const N = await import('./core/network.js'), G = await import('./levels/scarygta.js'), w = (ms) => new Promise(r => setTimeout(r, ms));
    const S = G.testState(); S.sim.reset(); S.gm = { mode: 'coop', phase: 'run', t: 250, roles: { me: 'robber', g1: 'robber' }, score: { me: 0, g1: 0 }, delivered: 0, winner: '' };
    S.sim.heats.me = { v: 10, seenT: 99 }; S.sim.heats.g1 = { v: 70, seenT: 99 }; await w(500);
    return { me: Math.round(S.sim.heatOf('me').v), g1: Math.round(S.sim.heatOf('g1').v) };
});
ok('co-op shares the heat: everyone gets the highest wanted level of the team', coop.me >= 60 && coop.g1 >= 60, coop);
// ----- gość: migawka hosta ustawia rolę i zegar; śmieci są ignorowane -----
const guest = await ev(async () => {
    const N = await import('./core/network.js'), G = await import('./levels/scarygta.js'), S = G.testState(), w = (ms) => new Promise(r => setTimeout(r, ms)), me = N.myId();
    delete N.playersState['g1']; N.NET.mode = 'guest'; N.playersState[N.GAME_PREFIX + N.NET.code] = { lvl: 'scarygta', head: { p: [0, 1.6, 0] } };
    G.debugNet({ k: 'st', cops: [], bags: [], heats: {}, gm: { m: 'cops', ph: 'run', t: 100, r: { [me]: 'cop', zzz: 'robber', '<b>': 'cop' }, s: { [me]: 2 }, d: 0, w: '' } }, 'host'); await w(300);
    const a = G.debugMode(); G.debugNet({ k: 'st', cops: [], bags: [], heats: {}, gm: 'junk' }, 'host'); const b = G.debugMode();
    N.NET.mode = 'solo'; return { role: a.myRole, mode: a.gm.mode, score: a.gm.score.me, after: b.gm.phase };
});
ok('a guest follows the host snapshot (role cop, score 2, cops mode); garbage resets to idle free roam', guest.role === 'cop' && guest.mode === 'cops' && guest.score === 2 && guest.after === 'idle', guest);
// ----- znacznik policjanta-gracza: czapka z kogutem nad renderowaną głową zdalnego policjanta, tylko w fazie run trybu cops -----
const mark = await ev(async () => {
    const N = await import('./core/network.js'), G = await import('./levels/scarygta.js'), A = await import('./core/avatar.js'), E = await import('./core/engine.js'), w = (ms) => new Promise(r => setTimeout(r, ms));
    const S = G.testState(), made = [];
    for (const id of ['g1', 'g2']) { const av = A.createAvatar({}); E.scene.add(av.group); av.head.position.set(id === 'g1' ? 5 : -5, 1.7, 3); N.remoteAvatars[id] = av; made.push([id, av]); }
    const set = (o) => { S.gm = Object.assign({ mode: 'cops', phase: 'run', t: 200, roles: { me: 'robber', g1: 'cop', g2: 'robber' }, score: {}, delivered: 0, winner: '' }, o); };
    set({}); await w(400); const run = G.debugCopMarks();
    const hw = new E.THREE.Vector3(); made[0][1].head.getWorldPosition(hw);
    set({ phase: 'lobby' }); await w(300); const lobby = G.debugCopMarks();
    set({ mode: 'race' }); await w(300); const race = G.debugCopMarks();
    set({}); made[0][1].group.visible = false; await w(300); const hidden = G.debugCopMarks(); made[0][1].group.visible = true;
    set({ roles: { me: 'cop', g1: 'robber', g2: 'robber' } }); await w(300); const robbers = G.debugCopMarks();
    set({}); await w(300); const back = G.debugCopMarks();
    for (const [id, av] of made) { av.group.removeFromParent(); delete N.remoteAvatars[id]; }
    await w(300); const gone = G.debugCopMarks();
    return { run, lobby, race, hidden, robbers, back, gone };
});
ok('a remote cop gets the cap marker only in the run phase of the cops mode (not in the lobby phase or another mode), hidden players are skipped, robbers and my own role give none, and it disappears with the avatar', mark.run.count === 1 && mark.run.visible && mark.run.ids[0] === 'g1' && mark.lobby.count === 0 && mark.race.count === 0 && mark.hidden.count === 0 && mark.robbers.count === 0 && mark.back.count === 1 && mark.gone.count === 0, mark);
ok('no page errors', errors.length === 0, errors);
console.log(fails ? 'FAILED: ' + fails : 'gtamodes: all checks passed'); await browser.close(); server.close(); process.exit(fails ? 1 : 0);
