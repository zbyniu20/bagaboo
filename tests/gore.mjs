// Test w przeglądarce: urwane kończyny w Become the Monster (ukrywanie i przywracanie rąk ofiary, opcja Gore, cudze awatary).
// Użycie:  cd tests && CHROMIUM_PATH=... node gore.mjs      (wymaga npm ci; nie jest częścią testów szybkich ani smoke)
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
await page.evaluate(async () => { const M = await import('./main.js'); await M.loadLevel('monster'); });
await page.waitForTimeout(2500);
const state = () => page.evaluate(async () => { const P = await import('./core/player.js'); return { L: P.hands.L.visible, R: P.hands.R.visible }; });
const setCode = (c) => page.evaluate(async (c) => { const M = await import('./levels/monster.js'); return M.debugDismember(c); }, c);
const settle = (ms) => page.waitForTimeout(ms);
ok('the hands exist and are visible at the start', JSON.stringify(await state()) === '{"L":true,"R":true}', await state());
ok('the debug hook works in the monster level', await setCode(0) === true);
// własne ręce: animacja trwa 0,6 s, potem znikają; ręce wracają po kodzie 0
for (const [code, name, wantL, wantR] of [[1, 'left hand', false, true], [2, 'right hand', true, false], [3, 'both hands', false, false], [4, 'head (hands stay)', true, true]]) {
    await setCode(code); await settle(250);
    const mid = await state(); ok(code + ' ' + name + ': during the tearing animation both hands are still there', mid.L === true && mid.R === true, mid);
    await settle(1100);
    const pop = await page.evaluate(async () => (await import('./levels/monster.js')).debugPop()); ok(code + ' ' + name + ': a "TORN OFF!" popup jumps up in front of the caught player', pop && pop.visible === true && pop.t > 0.5, pop);
    const s = await state(); ok(code + ' ' + name + ': after the animation the hands are ' + (wantL ? 'L shown' : 'L hidden') + ', ' + (wantR ? 'R shown' : 'R hidden'), s.L === wantL && s.R === wantR, s);
    await settle(1000); const s2 = await state(); ok(code + ' ' + name + ': the state is stable until the next round (no flicker)', JSON.stringify(s2) === JSON.stringify(s), s2);
    await setCode(0); await settle(300);
    const popGone = await page.evaluate(async () => (await import('./levels/monster.js')).debugPop()); ok(code + ' ' + name + ': the popup disappears with the new round', popGone && popGone.visible === false, popGone);
    const back = await state(); ok(code + ' ' + name + ': a new round or the lobby restores the hands', back.L === true && back.R === true, back);
}
// opcja Gore wyłączona: nic się nie ukrywa
await page.evaluate(async () => { (await import('./core/settings.js')).SETTINGS.gore = false; });
await setCode(3); await settle(1500);
let s = await state(); ok('with Gore off nothing is hidden', s.L === true && s.R === true, s);
await page.evaluate(async () => { (await import('./core/settings.js')).SETTINGS.gore = true; }); await settle(1500);
s = await state(); ok('turning Gore on again in the middle of a round hides the hands', s.L === false && s.R === false, s);
// wyjście z trybu przywraca ręce
await page.evaluate(async () => { const M = await import('./main.js'); await M.loadLevel('lobby'); }); await settle(2000);
s = await state(); ok('leaving the mode restores the hands', s.L === true && s.R === true, s);
// cudze awatary: ukrycie rąk i głowy, kikuty, części na ziemi, przywrócenie
const rem = (code) => page.evaluate(async (code) => {
    const N = await import('./core/network.js'), A = await import('./core/avatar.js'), E = await import('./core/engine.js');
    if (!N.remoteAvatars.t1) { const av = A.createAvatar({ name: 'T', skin: 'default', hat: 'none', glasses: 'none', sleeve: 'none', gloves: 'none', mask: 'none', badge: 'none' }); E.scene.add(av.group); N.remoteAvatars.t1 = av; }
    const av = N.remoteAvatars.t1; if (code === 'status') return { hl: av.handL.visible, hr: av.handR.visible, hd: av.head.visible, al: av.armL.visible, ar: av.armR.visible, stump: !!av.stumps && [av.stumps.l.visible, av.stumps.r.visible, av.stumps.neck.visible] };
    if (code === 'clear') { N.clearDismember(); return true; }
    N.setDismember('t1', code); return true;
}, code);
const tick = async (sec) => { await page.evaluate(async (sec) => { const N = await import('./core/network.js'); for (let t = 0; t < sec; t += 0.02) N.tickDismember(0.02); }, sec); await page.waitForTimeout(400); };   // czekanie: pętla gry (animateFaces) odświeża widoczność co klatkę, stan ma przetrwać
await rem('status');   // tworzy awatara
let r = await page.evaluate(async () => { const N = await import('./core/network.js'), av = N.remoteAvatars.t1; N.setDismember('t1', 1); for (let t = 0; t < 0.2; t += 0.02) N.tickDismember(0.02); return { hl: av.handL.visible, hr: av.handR.visible, hd: av.head.visible, al: av.armL.visible }; });   // jedno wywołanie: bez klatek gry pomiędzy
ok('remote: mid-tear the parts are still there', r.hl && r.hr && r.hd && r.al, r);
await tick(1); r = await rem('status'); ok('remote 1: left hand and arm hidden, stump on the left shoulder only', !r.hl && r.hr && r.hd && !r.al && r.ar && r.stump[0] && !r.stump[1] && !r.stump[2], r);
await rem('clear'); r = await rem('status'); ok('remote: clearing restores everything and hides the stumps', r.hl && r.hr && r.hd && r.al && r.ar && r.stump.every(v => v === false), r);
await rem(2); await tick(1.2); r = await rem('status'); ok('remote 2: right hand hidden only', r.hl && !r.hr && r.hd && r.al && !r.ar && !r.stump[0] && r.stump[1], r); await rem('clear');
await rem(3); await tick(1.2); r = await rem('status'); ok('remote 3: both hands and arms hidden, head stays', !r.hl && !r.hr && r.hd && !r.al && !r.ar && r.stump[0] && r.stump[1] && !r.stump[2], r); await rem('clear');
await rem(4); await tick(1.2); r = await rem('status'); ok('remote 4: head hidden, neck stump, hands stay', r.hl && r.hr && !r.hd && r.al && r.ar && r.stump[2], r);
const debris = await page.evaluate(async () => { const E = await import('./core/engine.js'); let n = 0; E.scene.children.forEach(o => { if (o.type === 'Group' && o.parent === E.scene && o.children.length && o.userData.rig === undefined && o.position.y < 1.2 && o.position.y > -2) n++; }); return n; });
ok('remote: the severed part lies in the scene after the animation', debris >= 1, debris);
await rem('clear'); r = await rem('status'); ok('remote: a new round restores the head too', r.hd && r.hl && r.hr && r.stump.every(v => v === false), r);
ok('no page errors', errors.length === 0, errors.slice(0, 5));
await browser.close(); server.close();
console.log(fails ? 'FAILED: ' + fails : 'gore: all checks passed'); process.exit(fails ? 1 : 0);
