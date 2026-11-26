// Test w przeglądarce: Scary GTA: tajemnice (5 skoków kaskaderskich, tajemnica Zaginiony detektyw z budkami, 3 losowe spotkania). Użycie: CHROMIUM_PATH=... node gtasecrets.mjs [SHOTDIR=katalog na zrzuty]
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
const G = (fn, arg) => ev(async ([src, a]) => { const M = await import('./levels/scarygta.js'); return (0, eval)('(' + src + ')')(M, a); }, [fn.toString(), arg]);
const wallet = () => ev(async () => (await import('./core/economy.js')).SAVE.wallet);
await G((M) => M.debugGtaNight('calm', 1e9));
const w0 = await wallet();
const e0 = await G((M) => M.debugEnc());
const IN = (o) => Object.assign({ x: 0, y: 1.2, z: 0, dx: 0, dy: 0, dz: 1, grounded: true }, o);
// ================= SKOKI KASKADERSKIE =================
const ss = await G((M) => M.debugStuntSpots()), st0 = await G((M) => M.debugStunts());
ok('stunts build: five jumps, the marker mesh is in the level, nothing done yet, the first hint points at the casino', ss.length === 5 && st0.stat === true && st0.done.length === 0 && st0.info.total === 5 && /casino/i.test(st0.info.hint), st0);
const mid = (r) => [(r.x0 + r.x1) / 2, (r.z0 + r.z1) / 2];
const route = (sp, landX, landY, landZ) => { const [fx, fz] = mid(sp.from); return [IN({ x: fx, y: sp.from.y + 1.1, z: fz, grounded: true }), IN({ x: fx, y: sp.from.y + 3, z: fz + 1, grounded: false }), IN({ x: fx, y: sp.from.y + 3, z: fz + 2, grounded: false }), IN({ x: landX, y: landY, z: landZ, grounded: true })]; };
const play = (r) => G((M, r) => { let d; for (const c of r) d = M.debugStuntStep(1, 0.1, c); return d; }, r);
const lf = ss.find(q => q.id === 'longfall'), [lx, lz] = mid(lf.to);
const miss = await play(route(lf, 0, 1.1, 0));
ok('a stunt: leaping and landing on the ground below is a miss and counts nothing', miss.done.length === 0);
const hit = await play(route(lf, lx, lf.to.y + 1.1, lz)), w1 = await wallet();
ok('a stunt: leaping and landing in the target zone counts, announces and pays 25 once', hit.done.includes('longfall') && w1 - w0 === 25, { d: hit.done, pay: w1 - w0 });
await play(route(lf, lx, lf.to.y + 1.1, lz));
ok('a stunt: doing the same jump again pays nothing', (await wallet()) === w1);
for (const id of ['antennadive', 'rooftophop', 'casinodive']) { const sp = ss.find(q => q.id === id), [x, z] = mid(sp.to); await play(route(sp, x, sp.to.y + 1.1, z)); }
const a4 = await G((M) => M.debugStunts());
ok('four of five stunts done show 4/5 and the next hint is the last one', a4.done.length === 4 && a4.info.n === 4 && /neighbour|near rooftop|casino/i.test(a4.info.hint));
const wBeforeReal = await wallet();
// ostatni skok na prawdziwej fizyce: gracz stoi na pasie wybicia wieży kasyna, potem spada na dach sąsiada
const nl = ss.find(q => q.id === 'neonleap'), [nx, nz] = mid(nl.from), [tx, tz] = mid(nl.to);
await ev(async ([x, y, z]) => { const PL = await import('./core/player.js'); PL.setPlayerPosition(x, y, z); }, [nx, nl.from.y + 1.4, nz]);
let armed = null; for (let i = 0; i < 40 && !armed; i++) { await w(500); const d = await G((M) => M.debugStunts()); if (d.cands.includes('neonleap')) armed = d; }
ok('a real jump: standing on the casino roof edge strip arms the detector (real isGrounded)', !!armed, armed);
await ev(async ([x, y, z]) => { const PL = await import('./core/player.js'); PL.setPlayerPosition(x, y, z); }, [tx, nl.to.y + 6, tz]);
let done5 = null; for (let i = 0; i < 80 && !done5; i++) { await w(500); const d = await G((M) => M.debugStunts()); if (d.done.includes('neonleap')) done5 = d; }
const fin5 = await ev(async () => { const E = await import('./core/economy.js'); return { w: E.SAVE.wallet, ach: !!(E.SAVE.achievements && E.SAVE.achievements.gta_stunts), owned: E.SAVE.owned.includes('glasses:stuntgoggles') }; });
ok('a real jump: falling onto the neighbour roof (real physics) counts, the fifth stunt pays the bonus and unlocks the goggles', !!done5 && fin5.w - wBeforeReal >= 25 + 200 && fin5.ach && fin5.owned, { done5: done5 && done5.done, fin5, wBeforeReal });
// ================= TAJEMNICA =================
const wMy0 = await wallet();
const ms = await G((M) => M.debugMysterySpots());
const m0 = await G((M) => M.debugMystery());
ok('the mystery builds: no clues, the wall panel, the crate and the briefcase are hidden, the phone note is empty', m0.clues.length === 0 && !m0.wall && !m0.crate && !m0.case && m0.stat === true && m0.info.line === 'CASE 0/6' && m0.info.note === '', m0);
const IM = (o) => Object.assign({ x: 0, y: 1.2, z: 0, dx: 0, dz: 1 }, o);
const mstep = (n, dt, c) => G((M, a) => M.debugMysteryStep(a.n, a.dt, a.c), { n, dt, c });
await G((M) => M.debugWx('clear'));
const dry = await mstep(300, 0.1, IM({}));
ok('the radio clue does not come in clear weather', !dry.clues.includes('radio'));
await G((M) => M.debugWx('storm'));
const storm = await mstep(160, 0.1, IM({}));
ok('the radio clue comes in a storm and the phone shows the note', storm.clues.includes('radio') && storm.info.line === 'CASE 1/6', storm);
const wl = ms.wall, wdx = Math.sin(wl.yaw), wdz = Math.cos(wl.yaw);   // ściana patrzy w (sin yaw, cos yaw): stoimy przed nią i patrzymy na nią
await G((M) => M.debugGtaNight('calm', 1e9));
const day = await mstep(40, 0.1, IM({ x: wl.x + wdx * 1.5, z: wl.z + wdz * 1.5, dx: -wdx, dz: -wdz }));
ok('the wall text is invisible and finds nothing by day', !day.wall && !day.clues.includes('wall'));
await G((M) => M.debugGtaNight('blackout', 1e9));
const far = await mstep(30, 0.1, IM({ x: wl.x + wdx * 9, z: wl.z + wdz * 9, dx: -wdx, dz: -wdz }));
ok('in a blackout the wall text is visible, but from far away it is not read', far.wall === true && !far.clues.includes('wall'));
const near = await mstep(20, 0.1, IM({ x: wl.x + wdx * 1.5, z: wl.z + wdz * 1.5, dx: -wdx, dz: -wdz }));
ok('standing in front of the wall in a blackout reads the clue', near.clues.includes('wall'), near);
await G((M) => M.debugGtaNight('calm', 1e9));
const press = (b, k) => G((M, a) => M.debugMysteryPress(a.b, a.k), { b, k });
const typeIn = async (b, digits) => { for (const d of digits) await press(b, d); await press(b, 'ENT'); };
await typeIn('B', '4096'); const bEarly = await mstep(2, 0.1, IM({}));
ok('booth B is dead before the crate: nothing is recorded and the line says nobody answers', !bEarly.clues.includes('boothB') && /nobody/i.test(bEarly.msg.B), bEarly.msg);
await typeIn('A', '999'); const bad1 = await mstep(1, 0.1, IM({}));
ok('booth A: a wrong number is refused', !bad1.clues.includes('boothA') && /wrong/i.test(bad1.msg.A), bad1.msg);
await typeIn('A', '317'); const bA = await mstep(2, 0.1, IM({}));
ok('booth A: 317 connects, the voice answers and the crate appears at the crane', bA.clues.includes('boothA') && /crane/i.test(bA.msg.A) && bA.crate === true, bA);
await ev(async (p) => { const G2 = await import('./levels/scarygta.js'); await G2.debugGtaTouch(() => [[p.x, 0.4, p.z]]); }, ms.crate);
const cr = await mstep(3, 0.1, IM({}));
await ev(async () => { const G2 = await import('./levels/scarygta.js'); await G2.debugGtaTouch(() => []); });
ok('a hand on the crate finds the badge, hides the crate and the note shows the second code', cr.clues.includes('crate') && !cr.crate && /4096/.test((await ev(async () => (await import('./core/gtamystery.js')).NOTES.crate))), cr);
await typeIn('B', '1234'); await typeIn('B', '1111'); await typeIn('B', '2222');
await press('B', '4'); const lk = await G((M) => M.debugMystery());
ok('three wrong numbers lock the booth for a while: the digits are ignored', lk.typed.B === '' && !lk.clues.includes('boothB'), lk);
await G((M) => M.debugMysteryStep(1, 0.1, { x: 0, y: 1.2, z: 0, dx: 0, dz: 1 }));
// odblokowanie zamka: zegar kabiny to czas rzeczywisty, więc czekamy 21 s
await w(21000);
await typeIn('B', '4096'); const bB = await mstep(2, 0.1, IM({}));
ok('booth B: 4096 after the lock connects and the briefcase appears on the pier', bB.clues.includes('boothB') && bB.case === true && /pier/i.test(bB.msg.B), bB);
const cb = ms.caseBox;
await ev(async (p) => { const G2 = await import('./levels/scarygta.js'); await G2.debugGtaTouch(() => [[p.x, 0.3, p.z]]); }, cb);
const sol = await mstep(3, 0.1, IM({}));
await ev(async () => { const G2 = await import('./levels/scarygta.js'); await G2.debugGtaTouch(() => []); });
const ach = await ev(async () => { const E = await import('./core/economy.js'); return { a: !!(E.SAVE.achievements && E.SAVE.achievements.gta_detective), owned: E.SAVE.owned.includes('hat:detectivehat'), w: E.SAVE.wallet }; });
const w2 = await wallet();
ok('the briefcase closes the case: six clues, the achievement and the detective hat, and no Bagabucks for the mystery itself', sol.clues.length === 6 && sol.info.line === 'CASE 6/6' && !sol.case && ach.a && ach.owned && w2 === wMy0, { sol: sol.clues, ach, pay: w2 - wMy0 });
// ================= LOSOWE SPOTKANIA =================
const es = await G((M) => M.debugEncSpots());
ok('encounters build (checked right after the level loaded): nothing seen, all three props hidden', e0.seen.length === 0 && !e0.hitch && !e0.limo && !e0.lights && e0.info.total === 3, e0);
const estep = (n, dt, c) => G((M, a) => M.debugEncStep(a.n, a.dt, a.c), { n, dt, c });
const IE = (o) => Object.assign({ x: 0, y: 1.2, z: 0, dx: 0, dy: 0, dz: 1 }, o);
await G((M) => M.debugWx('clear')); await G((M) => M.debugGtaNight('calm', 1e9));
const hSpot = es[0];
const hFar = await G((M, c) => { for (let i = 0; i < 2200; i++) { const d = M.debugEncStep(1, 0.1, c); if (d.hitch) return { t: +(i * 0.1).toFixed(1), d }; } return null; }, IE({ x: hSpot.x + 45, z: hSpot.z }));
ok('the hitchhiker appears by itself after a wait (30-75 m away from you)', !!hFar && hFar.t <= 200, hFar);
const hitchSpot = es[0];
await G((M, sp) => M.debugEncForce('hitch', sp), hitchSpot);
const hf = await estep(5, 0.1, IE({ x: hitchSpot.x + 1.5, z: hitchSpot.z }));
const we1 = await wallet();
ok('walking up to the hitchhiker finds him: he vanishes, the encounter pays 25 once', hf.seen.includes('hitchhiker') && !hf.hitch && we1 - w2 === 25, { seen: hf.seen, pay: we1 - w2 });
await G((M) => M.debugGtaNight('blackout', 1e9));
const lim = await estep(330, 0.1, IE({ x: 0, z: 43 }));
const we2 = await wallet();
ok('the silent limo rolls by in a blackout, and passing near it finds the encounter (pays 25)', lim.seen.includes('limo') && we2 - we1 === 25, { seen: lim.seen, pay: we2 - we1 });
const eng = await ev(async () => { const E = await import('./core/gtaencounters.js'); return E.lightsCenter(); });
const px = 0, pz = 56, ddx = eng[0] - px, ddz = eng[2] - pz, dn = Math.hypot(ddx, ddz);
const li = await estep(50, 0.1, IE({ x: px, y: 1.5, z: pz, dx: ddx / dn, dz: ddz / dn }));
const we3 = await wallet();
ok('looking at the red lights on the water finds the third encounter and the set bonus is paid (3 x 25 + 100)', li.seen.includes('sealights') && li.seen.length === 3 && we3 - w2 === 3 * 25 + 100 && li.lights === true, { seen: li.seen, pay: we3 - w2 });
await G((M) => M.debugGtaNight('calm', 1e9));
// ================= ZAPIS PO PONOWNYM WEJŚCIU =================
await ev(async () => { const M = await import('./main.js'); await M.loadLevel('lobby'); }); await w(2000);
await ev(async () => { const M = await import('./main.js'); await M.loadLevel('scarygta'); }); await w(6000);
const again = await ev(async () => { const M = await import('./levels/scarygta.js'); return { st: M.debugStunts(), my: M.debugMystery(), en: M.debugEnc() }; });
ok('after leaving and coming back everything is still saved (5 jumps, the closed case, 3 encounters)', again.st.done.length === 5 && again.my.clues.length === 6 && again.en.seen.length === 3 && !again.my.case && !again.my.crate, again);
// ================= ZRZUTY (tylko z SHOTDIR) =================
if (SP) {
    await ev(async () => { const E = await import('./core/economy.js'); E.SAVE.gta = undefined; const M = await import('./main.js'); await M.loadLevel('lobby'); }); await w(2000);
    await ev(async () => { const M = await import('./main.js'); await M.loadLevel('scarygta'); }); await w(6000);
    await G((M) => { M.debugGtaNight('calm', 1e9); });
    const look = async (name, x, y, z, tx, ty, tz, wait) => { const dx = tx - x, dz = tz - z, yaw = Math.atan2(-dx, -dz), pitch = Math.atan2(ty - y, Math.hypot(dx, dz)); await ev(async ([x, y, z, yaw, pitch]) => { const PL = await import('./core/player.js'), D = await import('./core/desktop.js'); PL.setPlayerPosition(x, y, z); D.setDesktopFacing(yaw, pitch); }, [x, y, z, yaw, pitch]); await w(wait || 1500); await page.screenshot({ path: SP + '/sec_' + name + '.png', timeout: 120000 }); };
    const bA2 = ms.boothA, bB2 = ms.boothB;
    await look('boothA', bA2.x + Math.sin(bA2.yaw) * 2.4, 1.6, bA2.z + Math.cos(bA2.yaw) * 2.4, bA2.x, 1.5, bA2.z);
    await look('boothB', bB2.x + Math.sin(bB2.yaw) * 2.4, 1.6, bB2.z + Math.cos(bB2.yaw) * 2.4, bB2.x, 1.5, bB2.z);
    await G((M) => M.debugGtaNight('blackout', 1e9));
    await look('wall', wl.x + wdx * 2.2, 1.6, wl.z + wdz * 2.2, wl.x, wl.y, wl.z);
    await G((M) => M.debugGtaNight('calm', 1e9));
    await G((M) => M.debugMysteryStep(1, 0.1, { x: 0, y: 1.2, z: 0, dx: 0, dz: 1 }));
    await ev(async () => { const M = await import('./core/gtastore.js'); M.markClue('boothA'); M.markClue('wall'); const L2 = await import('./levels/scarygta.js'); L2.debugMysteryStep(2, 0.1, { x: 0, y: 1.2, z: 0, dx: 0, dz: 1 }); });
    await w(300);
    await ev(async () => { const M = await import('./core/gtastore.js'); M.markClue('crate'); M.markClue('boothB'); const L2 = await import('./levels/scarygta.js'); L2.debugMysteryStep(2, 0.1, { x: 0, y: 1.2, z: 0, dx: 0, dz: 1 }); });
    await look('case', cb.x + 2.2, 1.6, cb.z + 1.5, cb.x, 0.3, cb.z);
    const sr = ss.find(q => q.id === 'longfall');
    await look('stunt_radio', 64, sr.from.y + 1.7, -50.1, 64, sr.from.y, -52.3);
    await G((M, sp) => M.debugEncForce('hitch', sp), es[3]);
    await look('hitch', es[3].x + 6.5, 1.6, es[3].z, es[3].x, 1.2, es[3].z, 500);
    await G((M) => M.debugGtaNight('blackout', 1e9)); await G((M) => M.debugEncStep(1, 0.1, { x: 0, y: 1.2, z: 43, dx: 0, dy: 0, dz: 1 }));
    await look('lights', 0, 1.6, 56, eng[0], eng[1], eng[2], 400);
}
ok('no page errors', errors.length === 0, errors.slice(0, 5));
await browser.close(); server.close();
console.log(fails ? fails + ' check(s) failed' : 'gtasecrets: all checks passed'); process.exit(fails ? 1 : 0);
