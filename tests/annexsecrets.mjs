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
const shot = async (name, x, y, z, yaw) => { if (!SP) return; await ev(async ([x, y, z, yaw]) => { const PL = await import('./core/player.js'), D = await import('./core/desktop.js'); PL.setPlayerPosition(x, y, z); D.setDesktopFacing(yaw); }, [x, y, z, yaw]); await page.waitForTimeout(1500); await page.screenshot({ path: SP + '/sec_' + name + '.png', timeout: 120000 }); };
await shot('slide', 10, 1.6, 30, -1.57);
await shot('platform', 12.6, 12.4, 33, 0);
const slide = await ev(async () => {
    const S = await import('./core/annexslide.js'), E = await import('./core/engine.js'), P = await import('./core/player.js'), w = (ms) => new Promise(r => setTimeout(r, ms));
    P.setPlayerPosition(13, 12.9, 38.2); await w(300); const before = S.debugAnnexSlide();
    S.debugSlideGrab(); await w(700); const mid = S.debugAnnexSlide();
    for (let i = 0; i < 90 && S.debugAnnexSlide().ph === 'ride'; i++) await w(400);
    await w(1500); const after = S.debugAnnexSlide();
    return { before, mid, after, level: E.L.levelId };
});
ok('the slide carries the player from the top platform to the landing (one ride, still in the lobby)', slide.mid.ph === 'ride' && slide.after.ph === 'idle' && slide.after.rides === 1 && slide.after.body[1] < 3.2 && slide.after.body[2] < 27 && slide.after.body[0] > 9 && slide.after.body[0] < 13 && slide.level === 'lobby', slide);
const sk = await ev(async () => {
    const D = await import('./core/deepskulls.js'), K = await import('./core/deep.js'), E = await import('./core/economy.js'), w0 = E.SAVE.wallet;
    const v0 = D.debugDeepSkulls().visible.slice(), a = D.debugTakeSkull('ceil'), b = D.debugTakeSkull('ceil'), c = D.debugTakeSkull('zipskull');
    return { v0, a, b, c, w: E.SAVE.wallet - w0, n: K.deepCountNow(), left: D.debugDeepSkulls().visible, saved: JSON.stringify(E.SAVE.deep) };
});
ok('the three silver skulls pay 50 Bagabucks each exactly once and vanish', sk.v0.length === 3 && sk.a === true && sk.b === false && sk.c === true && sk.w === 100 && sk.n === 2 && sk.left.join() === 'room' && /ceil/.test(sk.saved) && /zipskull/.test(sk.saved), sk);
// Tajne słowa na stole ouija: LEGION (podpowiedź) i BAGABOO (przyciemnienie i posągi), płacą raz; strach stworka przy odpowiedzi ducha
const words = await ev(async () => {
    const P = await import('./core/annexplay.js'), K = await import('./core/deep.js'), E = await import('./core/economy.js'), St = await import('./core/annexstatues.js'), H = await import('./core/hauntlogic.js'), w = (ms) => new Promise(r => setTimeout(r, ms));
    const w0 = E.SAVE.wallet, n0 = K.deepCountNow();
    for (const ch of 'LEGION') P.debugOuijaPick(ch); await w(500); const a = { n: K.deepCountNow() - n0, w: E.SAVE.wallet - w0, text: P.debugAnnexPlay().text };
    for (const ch of 'BAGABOO') P.debugOuijaPick(ch); await w(500); const b = { n: K.deepCountNow() - n0, w: E.SAVE.wallet - w0, dim: P.debugAnnexDim(), stare: St.debugStatues().stare, text: P.debugAnnexPlay().text };
    for (const ch of 'HELLO') P.debugOuijaPick(ch); await w(300); const sc = H.HAUNT_STATE.scare ? { until: H.HAUNT_STATE.scare.until > performance.now() / 1000, x: H.HAUNT_STATE.scare.x } : null;
    H.HAUNT_STATE.scare.pet = true; await w(600); const pet = K.getDeep().found.includes('pet');
    return { a, b, sc, pet };
});
ok('LEGION pays once and clears the board, BAGABOO dims the lights and turns the statues, the ghost reply scares the pet (secret pet)', words.a.n === 1 && words.a.w === 50 && words.a.text === '' && words.b.n === 1 && words.b.dim < 0.5 && words.b.stare > 0 && words.sc && words.sc.until && words.pet === true, words);
await shot('statues', -1, 1.6, 27, 1.57);

// Ogród posągów: start, nieruchome gdy widziane, wygrana zapisuje czas
const gar = await ev(async () => {
    const St = await import('./core/annexstatues.js'), E = await import('./core/economy.js');
    const e1 = St.debugGardenStep(-6, 25.2, false, 0.1), a = St.debugStatues(), p0 = JSON.stringify(a.pos);
    St.debugGardenStep(-6, 25.2, true, 0.5); const p1 = JSON.stringify(St.debugStatues().pos);
    for (let i = 0; i < 6; i++) St.debugGardenStep(-6, 28, true, 0.5);
    const e2 = St.debugGardenStep(-6, 36.8, true, 0.1), b = St.debugStatues();
    return { e1, e2, still: p0 === p1, count: a.count, ph: b.ph, last: b.last, best: b.best, saved: JSON.stringify(E.SAVE.annex) };
});
ok('the statue garden starts on the pad, seen statues stay put, the bell ends the round and saves the best time', gar.e1 === 'start' && gar.count === 6 && gar.still && gar.e2 === 'won' && gar.last >= 2 && gar.best >= 2 && /statueBest/.test(gar.saved), gar);
// Radio: stacje niosą prawdziwy kod dnia i melodię; organy: numery klawiszy
const radio = await ev(async () => {
    const R = await import('./core/annexradio.js'), A = await import('./core/annexroom.js');
    R.debugTune(91.5); const n = R.debugRadio(); R.debugTune(104.3); const m = R.debugRadio(); R.debugTune(99.9); const b = R.debugRadio(); R.debugTune(95.0); const q = R.debugRadio();
    return { n, m, b, q, code: A.debugVaultCode() };
});
const WORDS = ['ZERO', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE'];
ok('the radio reads the real daily code on 91.5, the melody key numbers on 104.3, the board hint on 99.9 and only static elsewhere', radio.n.station === 'numbers' && radio.n.words.filter(w => WORDS.includes(w)).map(w => WORDS.indexOf(w)).join('') === radio.code && radio.m.station === 'melody' && radio.m.words.join() === 'THREE,FIVE,FOUR,SEVEN,TWO,SIX' && radio.b.words.includes('NAME') && radio.q.station === '', radio);
await shot('radio', 2, 1.6, 35, -1.57);

// Pokój w ścianie: zamknięty z kolizją, melodia otwiera, stan się zapisuje; sejf płaci raz dziennie
const room = await ev(async () => {
    const P = await import('./core/annexplay.js'), A = await import('./core/annexroom.js'), K = await import('./core/deep.js'), E = await import('./core/economy.js'), PL = await import('./core/player.js'), w = (ms) => new Promise(r => setTimeout(r, ms));
    const closed = A.debugRoom(), n0 = K.deepCountNow();
    for (const k of [3, 5, 4, 7, 2, 6]) { P.debugOrganKey(k - 1); await w(60); }
    await w(500); const opening = A.debugRoom();
    for (let i = 0; i < 80 && A.debugRoom().slide < 1; i++) await w(300);
    const open = A.debugRoom();
    PL.setPlayerPosition(-10.9, 1.4, 52.5); for (let i = 0; i < 60 && !K.getDeep().found.includes('room'); i++) await w(250); const inside = PL.playerBody.position.z;
    const w0 = E.SAVE.wallet, code = A.debugVaultCode(), wrong = code === '1234' ? '4321' : '1234';
    const bad1 = A.debugVault(wrong), ok1 = A.debugVault(code), w1 = E.SAVE.wallet - w0, again = A.debugVault(code);
    return { closed, opening, open, inside, bad1, ok1, w1, again, w2: E.SAVE.wallet - w0, n: K.deepCountNow() - n0, saved: JSON.stringify(E.SAVE.deep) };
});
ok('the melody opens the wall room (panel gone, no collider, saved), the player can stand inside it and the vault pays 200 (plus 50 for the secret) once per day for the right code only', room.closed.open === false && room.closed.panel === true && room.closed.blocked === true && room.opening.open === true && room.opening.blocked === false && room.open.panel === false && room.open.saved === true && room.inside > 51.5 && room.bad1 === 'Wrong code.' && room.ok1 === 'ok' && room.w1 === 250 && room.again === 'Already opened today.' && room.w2 === 250 && room.n === 3 && /"open":true/.test(room.saved) && /"vault":"\d{4}-\d{2}-\d{2}"/.test(room.saved), room);
await shot('room', -10.9, 1.6, 48, Math.PI);
await shot('roominside', -10.9, 1.6, 51, Math.PI);
// Tunel: cztery przejścia, napis się zmienia, sekret; złoty duch; trzynasta witryna; wnętrze norki
const tun = await ev(async () => {
    const T = await import('./core/annextunnel.js'), K = await import('./core/deep.js'); const out = [];
    for (const z of [10, 22, 10, 22, 10]) out.push(T.debugTunnelZ(z));
    return { out, st: T.debugTunnel(), found: K.getDeep().found.includes('tunnel') };
});
ok('crossing the tunnel back and forth fires stage 3 on the third crossing and stage 4 (secret and footsteps) on the fourth', tun.out.join() === ',,,stage3,stage4'.replace(/^,/, '') || tun.out.join() === ',,,,stage3,stage4'.slice(1) || (tun.out.includes('stage3') && tun.out.includes('stage4') && tun.st.stage === 2 && tun.found), tun);
const gold = await ev(async () => {
    const G = await import('./core/annexgallery.js'), K = await import('./core/deep.js'), w = (ms) => new Promise(r => setTimeout(r, ms));
    const s0 = G.debugAnnexGallery().score;
    G.debugGalleryForceUp(0); G.debugGalleryForceUp(1); G.debugGalleryForceUp(3);
    G.debugGalleryBall(0, -6, 1.2, 49.45); G.debugGalleryBall(1, -3.5, 1.2, 49.45); G.debugGalleryBall(2, 1.5, 1.2, 49.45);
    for (let i = 0; i < 60 && !K.getDeep().found.includes('gold'); i++) await w(250);
    return { s0, s1: G.debugAnnexGallery().score, found: K.getDeep().found.includes('gold'), hits: G.debugAnnexGallery().hits };
});
ok('three quick hits wake a golden ghost, hitting it adds 90 points and awards the secret', gold.found === true && gold.s1 - gold.s0 >= 120, gold);
const you = await ev(async () => {
    const B = await import('./core/bestiary.js'), L = await import('./core/bestiarylogic.js'), K = await import('./core/deep.js'), PL = await import('./core/player.js'), w = (ms) => new Promise(r => setTimeout(r, ms));
    const before = B.debugYou(); for (const b of L.BEASTS) B.discoverBeast(b.id); await w(600);
    const built = B.debugYou(), cases = B.debugBestiary().cases;
    PL.setPlayerPosition(-9.5, 1.3, 7.2); for (let i = 0; i < 40 && !K.getDeep().found.includes('you'); i++) await w(250);
    return { before, built, cases, found: K.getDeep().found.includes('you') };
});
ok('after meeting all 13 monsters the YOU case appears next to the row (the 13 beast cases stay 13) and standing in front of it awards the secret', you.before === null && you.built && you.cases === 13 && you.found === true, you);
await shot('you', -8, 1.6, 9.5, 0);
const mouse = await ev(async () => {
    const G = await import('./core/eggs.js'), K = await import('./core/deep.js'), E = await import('./core/engine.js'), PL = await import('./core/player.js'), w = (ms) => new Promise(r => setTimeout(r, ms));
    G.debugFindEgg('mouse'); PL.setPlayerPosition(-14.4, 0.3, -8.5); await w(400);
    const cam = new (E.camera.position.constructor)(); E.camera.getWorldPosition(cam); const dy = cam.y - PL.playerBody.position.y;
    PL.setPlayerPosition(-14.2, 1.0 - dy, -8.5); for (let i = 0; i < 40 && !K.getDeep().found.includes('mouse'); i++) await w(250);
    return { found: K.getDeep().found.includes('mouse'), dy };
});
ok('crouching right at the mouse door after finding the egg awards the tiny room secret', mouse.found === true, mouse);

ok('no page errors', errors.length === 0, errors);
console.log(fails ? 'FAILED: ' + fails : 'annexsecrets: all checks passed'); await browser.close(); server.close(); process.exit(fails ? 1 : 0);
