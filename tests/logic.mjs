// Testy logiki w czystym Node (bez przeglądarki, kilka sekund): rangi i uprawnienia, dowody serwera kont, ekonomia, reguły zaufania w network.js.
// Użycie: cd tests && node logic.mjs
import './node-setup.mjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { check, done } from './lib.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const url = (p) => pathToFileURL(path.join(ROOT, p)).href;
const C = await import(url('core/config.js'));
const A = await import(url('core/auth.js'));

// ---------- rangi i uprawnienia (core/config.js) ----------
check('rank: ultimate admin', C.rankOf('zbyniu') === 4);
check('rank: owner', C.rankOf('BoyIsGamer') === 3);
check('rank: co-admin', C.rankOf('spikyvr') === 2);
check('rank: moderator', C.rankOf('lincolnvr') === 1);
check('rank: normal player', C.rankOf('RandomPlayer') === 0 && C.rankOf('') === 0 && C.rankOf(undefined) === 0 && C.rankOf(null) === 0);
check('rank: case and spaces do not matter', C.rankOf('ZBYNIU') === 4 && C.rankOf('  zbyniu ') === 4);
check('rank: look-alike nick is a normal player', C.rankOf('zbyniu2') === 0 && C.rankOf('zbynlu') === 0 && C.rankOf('xzbyniu') === 0);
// Każdy nick ekipy musi być zastrzeżony i dać się zarejestrować (NICK_RE), inaczej nikt nie zdobyłby konta ekipy albo ktoś inny zająłby nick
const STAFF = [...C.ULTIMATE_NAMES, ...C.ADMIN_NAMES, ...C.COADMIN_NAMES, ...C.OWNER_NAMES, ...C.MOD_NAMES, ...C.FURAS_NAMES];
for (const n of STAFF) {
    check('reserved: staff nick ' + n + ' is reserved', C.isReservedNick(n));
    check('reserved: staff nick ' + n + ' can be registered (NICK_RE)', A.NICK_RE.test(n));
    check('reserved: staff nick ' + n + ' differs only by case from the reserved set', C.isReservedNick(n.toUpperCase()));
}
check('reserved: a normal nick is free', !C.isReservedNick('RandomPlayer'));
check('menu: only listed accounts get the mod menu', C.isModMenuUser('zbyniu') && C.isModMenuUser('SpikyVR') && !C.isModMenuUser('lincolnvr') && !C.isModMenuUser('RandomPlayer'));
// kto może wyrzucić / zbanować kogo
const P = C.canPunish;
check('punish: ultimate can punish owner, admin, mod and players', P('zbyniu', 'BoyIsGamer') && P('zbyniu', 'spikyvr') && P('zbyniu', 'lincolnvr') && P('zbyniu', 'RandomPlayer'));
check('punish: ultimate cannot punish ultimate', !P('zbyniu', 'zbyniu'));
check('punish: owner, admin and mod can punish only normal players', P('BoyIsGamer', 'RandomPlayer') && P('spikyvr', 'RandomPlayer') && P('lincolnvr', 'RandomPlayer'));
check('punish: staff cannot punish staff', !P('BoyIsGamer', 'lincolnvr') && !P('spikyvr', 'lincolnvr') && !P('lincolnvr', 'spikyvr') && !P('BoyIsGamer', 'zbyniu') && !P('spikyvr', 'zbyniu') && !P('lincolnvr', 'zbyniu'));
check('punish: a normal player (or nobody) can punish no one', !P('RandomPlayer', 'RandomPlayer') && !P('RandomPlayer', 'zbyniu') && !P('', 'RandomPlayer') && !P(undefined, 'RandomPlayer'));
// lokalny moderator (nadany przez admina na tym urządzeniu) ma rangę 1, a po zdjęciu traci ją
C.setLocalMod('FriendlyGuy', true);
check('local mod: gets rank 1 and can punish players only', C.rankOf('friendlyguy') === 1 && P('FriendlyGuy', 'RandomPlayer') && !P('FriendlyGuy', 'lincolnvr'));
check('local mod: does not make the nick reserved', !C.isReservedNick('FriendlyGuy'));
C.setLocalMod('FriendlyGuy', false);
check('local mod: removed again', C.rankOf('FriendlyGuy') === 0);
localStorage.setItem('bagaboo_mods', '{not json'); check('local mod: broken storage is harmless', C.rankOf('RandomPlayer') === 0); localStorage.clear();
// odznaki ekipy: nikt spoza ekipy ich nie dostaje, wyższa ranga ma więcej
check('badges: normal player gets none', C.staffBadgesFor('RandomPlayer').length === 0);
check('badges: ultimate admin gets at least as many as a moderator', C.staffBadgesFor('zbyniu').length > C.staffBadgesFor('lincolnvr').length && C.staffBadgesFor('lincolnvr').length >= 1);

// ---------- serwer kont (core/auth.js) ----------
check('nick: valid nicks', ['abc', 'Bagaboo_01', 'a-b-c', 'x'.repeat(16)].every(n => A.NICK_RE.test(n)));
check('nick: invalid nicks', ['ab', 'x'.repeat(17), 'has space', 'zażółć', 'a.b', 'a/b', '', "a'b", '<b>x'].every(n => !A.NICK_RE.test(n)));
check('nonce: 32 hex characters and unique', /^[0-9a-f]{32}$/.test(A.randomNonce()) && A.randomNonce() !== A.randomNonce());
// dowód hosta: sfałszowane dowody (podpisane cudzym kluczem, bez podpisu, zepsute) muszą być odrzucone
const b64u = (buf) => Buffer.from(buf).toString('base64url');
const claims = (over) => Object.assign({ typ: 'join', aud: 'H:bagaboo-vr-v3-TEST', nonce: 'n1', nick: 'zbyniu', exp: Math.floor(Date.now() / 1000) + 600 }, over || {});
const attacker = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign', 'verify']);
async function forge(cl, sign) {
    const head = b64u(JSON.stringify({ alg: 'ES256', typ: 'JWT' })), body = b64u(JSON.stringify(cl));
    const sig = sign ? b64u(await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, attacker.privateKey, new TextEncoder().encode(head + '.' + body))) : '';
    return head + '.' + body + '.' + sig;
}
const AUD = 'H:bagaboo-vr-v3-TEST';
check('proof: signed with an attacker key is rejected', (await A.verifyProof(await forge(claims(), true), AUD, 'n1')) === null);
check('proof: with an empty signature is rejected', (await A.verifyProof(await forge(claims(), false), AUD, 'n1')) === null);
check('proof: garbage is rejected', (await Promise.all(['', 'abc', 'a.b.c', '..', null, undefined, 123, 'a.b.c.d'].map(p => A.verifyProof(p, AUD, 'n1')))).every(r => r === null));

// ---------- Quest: wykrywanie przeglądarki gogli i lżejsza strona startowa (dawniej osobny, wolny blok w smoke.mjs) ----------
const setUA = (ua) => Object.defineProperty(globalThis, 'navigator', { configurable: true, writable: true, value: { userAgent: ua } });
const QUEST_UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) OculusBrowser/33.0 SamsungBrowser/4.0 Chrome/126.0 VR Safari/537.36', PC_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';
setUA(QUEST_UA); const DQ = await import(url('core/device.js') + '?quest');
setUA(PC_UA); const DP = await import(url('core/device.js') + '?pc');
check('quest: an OculusBrowser user agent is detected', DQ.IS_QUEST === true);
check('quest: a desktop Chrome user agent is not', DP.IS_QUEST === false);
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8'), liteRe = (html.match(/<script>if \((\/[^/]+\/i)\.test\(navigator\.userAgent\)\) document\.documentElement\.classList\.add\('lite'\)/) || [])[1];
check('quest: index.html switches to the lite landing page for Quest user agents', !!liteRe && new RegExp(liteRe.slice(1, -2), 'i').test(QUEST_UA) && !new RegExp(liteRe.slice(1, -2), 'i').test(PC_UA), liteRe);
check('quest: the lite page drops the heavy effects', /\.lite #grain \{ display: none; \}/.test(html) && /\.lite #card \{ backdrop-filter: none/.test(html));
check('quest: textures cap anisotropic filtering at 2', /const ANISO = \(n\) => IS_QUEST \? Math\.min\(n, 2\) : n;/.test(fs.readFileSync(path.join(ROOT, 'core/textures.js'), 'utf8')));

// ---------- ekonomia (core/economy.js, bez ekranu terminala) ----------
const E = await import(url('core/economy.js'));
check('economy: new save starts with START_BONES', E.SAVE.wallet === E.START_BONES, E.SAVE.wallet);
let w = E.SAVE.wallet; E.addBones(0, 'x'); E.addBones(-50, 'x'); E.addBones(NaN, 'x'); E.addBones(undefined, 'x');
check('economy: addBones ignores zero, negative and NaN', E.SAVE.wallet === w);
E.addBones(40, 'test'); check('economy: addBones adds', E.SAVE.wallet === w + 40);
// nagroda za poziom: pierwsza pełna, potem REPEAT_LIMIT powtórek dziennie, potem nic
const df = E.diffOf('lava').reward;
let before = E.SAVE.wallet; E.levelReward('lava', 200, 100, 'test'); const first = E.SAVE.wallet - before;
check('economy: first win pays the first amount', first === Math.round(200 * df), first);
const repeats = []; for (let i = 0; i < E.REPEAT_LIMIT + 2; i++) { before = E.SAVE.wallet; E.levelReward('lava', 200, 100, 'test'); repeats.push(E.SAVE.wallet - before); }
check('economy: repeats pay up to REPEAT_LIMIT per day, then nothing', repeats.slice(0, E.REPEAT_LIMIT).every(a => a === Math.round(100 * df)) && repeats.slice(E.REPEAT_LIMIT).every(a => a === 0), JSON.stringify(repeats));
check('economy: wins are counted', E.SAVE.lavaWins === E.REPEAT_LIMIT + 3, E.SAVE.lavaWins);
// sklep
const shopItem = E.CATALOG.find(i => i.price > 0 && !E.isOwned(i) && !E.isLocked(i));
check('economy: the shop has a buyable item', !!shopItem);
if (shopItem) {
    E.SAVE.wallet = E.priceOf(shopItem) - 1; const keep = E.SAVE.wallet;
    check('economy: buying without enough money fails and costs nothing', E.buyItem(shopItem) === 'poor' && E.SAVE.wallet === keep && !E.isOwned(shopItem));
    E.SAVE.wallet = E.priceOf(shopItem) + 7;
    check('economy: buying takes exactly the price', E.buyItem(shopItem) === 'ok' && E.SAVE.wallet === 7 && E.isOwned(shopItem));
    check('economy: buying twice is refused and free', E.buyItem(shopItem) === 'owned' && E.SAVE.wallet === 7);
}
const locked = E.CATALOG.find(i => E.isLocked(i));
if (locked) { E.SAVE.wallet = 1e9; check('economy: a locked item cannot be bought even with money', E.buyItem(locked) === 'locked' && !E.isOwned(locked)); }
// spójność danych: osiągnięcia i katalog
const keys = new Set(E.CATALOG.map(i => i.slot + ':' + i.id)), ids = new Set();
check('catalog: no duplicate items', keys.size === E.CATALOG.length);
for (const a of E.ACHIEVEMENTS) {
    check('achievement ' + a.id + ': unique', !ids.has(a.id)); ids.add(a.id);
    check('achievement ' + a.id + ': reward exists', a.reward[0] === 'bones' || keys.has(a.reward[0] + ':' + a.reward[1]));
    check('achievement ' + a.id + ': goal has val()', !a.goal || typeof a.val === 'function');
}
// premia dla ekipy: tylko konto zweryfikowane na serwerze, tylko raz, nigdy dla lokalnego moderatora
E.SAVE.wallet = 0;
localStorage.setItem('bagaboo_mods', JSON.stringify(['hacker'])); E.markNickVerified('hacker'); E.setProfile({ name: 'hacker' });
check('staff bonus: not for a locally promoted moderator', E.SAVE.wallet === 0, E.SAVE.wallet);
localStorage.removeItem('bagaboo_mods'); E.markNickVerified(''); E.setProfile({ name: 'lincolnvr' });
check('staff bonus: not for a staff name without server proof', E.SAVE.wallet === 0, E.SAVE.wallet);
E.markNickVerified('lincolnvr'); E.setProfile({ name: 'lincolnvr' });
check('staff bonus: paid to a verified staff account', E.SAVE.wallet >= E.STAFF_BONUS, E.SAVE.wallet);
const paid = E.SAVE.wallet; E.setProfile({ name: 'lincolnvr' }); check('staff bonus: paid only once', E.SAVE.wallet === paid);
// wydatki spoza sklepu (meble w Moim Pokoju): tylko dodatnia, skończona kwota i tylko gdy stać gracza
E.SAVE.wallet = 100; const sp0 = E.SAVE.wallet;
check('spend: not enough money keeps the wallet and fails', E.spendBones(101, 'x') === false && E.SAVE.wallet === sp0);
check('spend: broken amounts never spend', [0, -5, NaN, Infinity, -Infinity, '50', null, undefined, {}, [5], true].every(v => E.spendBones(v, 'x') === false) && E.SAVE.wallet === sp0);
check('spend: a valid amount is taken exactly and never goes below zero', E.spendBones(40, 'x') === true && E.SAVE.wallet === 60 && E.spendBones(60, 'x') === true && E.SAVE.wallet === 0 && E.spendBones(1, 'x') === false && E.SAVE.wallet === 0);
// zapis jest podpisany: ręczna zmiana portfela w localStorage nie może dać pieniędzy
E.SAVE.wallet = 123; E.saveGame();
const raw = JSON.parse(localStorage.getItem('bagaboo_save_v1'));
const tamper = (r) => { const c = JSON.parse(JSON.stringify(r)); const walk = (o) => { for (const k in o) { if (k === 'wallet' && typeof o[k] === 'number') { o[k] = 9999999; return true; } if (o[k] && typeof o[k] === 'object' && walk(o[k])) return true; } return false; }; return walk(c) ? c : null; };
const bad = tamper(raw);
if (bad) {
    localStorage.setItem('bagaboo_save_v1', JSON.stringify(bad));
    const E2 = await import(url('core/economy.js') + '?tamper');
    check('save: a hand-edited wallet is not accepted', E2.SAVE.wallet !== 9999999, E2.SAVE.wallet);
    check('save: the player is told the save was modified', /modified|damaged/i.test(E2.loadNotice), E2.loadNotice);
} else check('save: could not find the wallet field in the stored save (test needs updating)', false);

// ---------- reguły zaufania w core/network.js (analiza kodu: host nigdy nie ufa nickowi zgłoszonemu przez klienta) ----------
const net = fs.readFileSync(path.join(ROOT, 'core/network.js'), 'utf8'), lines = net.split('\n');
const RANKFN = /\b(rankOf|canPunish|isStaffName|isModName|isAdminName|isModMenuUser|isOwnerName|isUltimateName|isCoAdminName|isFurasName)\(([^)]*)\)/g;
lines.forEach((l, i) => {
    if (/^\s*(export\s+)?function\b/.test(l) && !/\{.*\b(rankOf|canPunish|isStaffName|isOwnerName|isUltimateName)\(/.test(l)) return;
    for (const m of l.matchAll(RANKFN)) check('network.js:' + (i + 1) + ': ' + m[1] + ' must not take a client-reported name', !/profile\.name|nameOf\(|\.name\b|data\./.test(m[2]), m[0]);
});
let callers = 0;
for (const m of net.matchAll(/(?<!function )\bperformMod\(([^;]*?)\);/g)) {
    callers++;
    const args = m[1].split(',').map(s => s.trim());
    check('network.js: performMod caller rank comes from a verified nick or the local account', /^(verifiedNickOf\(|me$)/.test(args[2] || ''), m[0].slice(0, 90));
}
check('network.js: performMod has callers to inspect', callers >= 2, callers);
check('network.js: the host keeps the verified nick in conn.vNick', /conn\.vNick\s*=/.test(net));
check('network.js: reserved nicks without proof are sent to login', /isReservedNick\(nm\)\)\s*\{\s*requireLogin\(conn\)/.test(net));
check('network.js: guests leave a room whose host fakes a reserved nick', /hostGraceOver\)\s*checkHost\(\)/.test(net) && /HOST_PROOF_WAIT_MS/.test(net));

// Zgłoszenia gości w trybach rund (meta, wynik, skarb) host sprawdza strażnikiem z core/netguard.js, a nie przyjmuje na wiarę (CLAUDE.md: nie ufaj klientowi)
const modeFiles = fs.readdirSync(path.join(ROOT, 'levels')).filter(f => f.endsWith('.js')).map(f => 'levels/' + f).concat(['core/racemode.js']);
let guarded = 0;
for (const f of modeFiles) {
    const src = fs.readFileSync(path.join(ROOT, f), 'utf8');
    if (/msg\.k === 'fin'/.test(src)) { guarded++; check(f + ': the host validates a guest finish (guestFinish + finish line from the host\'s own view of the player)', /guestFinish\(from\)/.test(src) && /function guestFinish/.test(src) && /(pastFinishLine|S\.finish)\(/.test(src) && /elapsedSince\(/.test(src)); check(f + ': the host never takes the finish time from the client', !/handleFinish\(from, msg\.t\)/.test(src)); }
    if (/msg\.k === 'score'/.test(src)) { guarded++; check(f + ': the host clamps a guest score and never uses the client-sent name', /clampScore\(/.test(src) && !/msg\.name/.test(src)); }
    if (/msg\.k === 'got'/.test(src)) { guarded++; check(f + ': the host checks that a guest is near the treasure it claims', /nearTarget\(/.test(src) && /validIndex\(/.test(src) && !/take\(\+msg\.i/.test(src)); }
}
check('guest results: the guarded modes were found (race, redlight, racemode, range, treasure)', guarded >= 5, guarded);

// ---------- Ściana Graffiti (core/graffitilogic.js i zasady zaufania w core/graffiti.js) ----------
const G = await import(url('core/graffitilogic.js'));
const NC = G.WALL.COLORS.length;
check('graffiti: clean cells keep valid triples', JSON.stringify(G.cleanCells([0, 0, 1, 47, 23, NC - 1])) === '[0,0,1,47,23,' + (NC - 1) + ']');
check('graffiti: clean cells drop out-of-range, fractional, negative and non-numeric values', G.cleanCells([48, 0, 1, 0, 24, 1, -1, 0, 1, 0, 0, NC, 0.5, 0, 1, '1', 0, 1, null, 0, 1]).length === 0);
check('graffiti: clean cells reject non-arrays', G.cleanCells(null).length === 0 && G.cleanCells('abc').length === 0 && G.cleanCells({ length: 99 }).length === 0);
check('graffiti: one message holds at most MAX_CELLS cells', G.cleanCells(Array.from({ length: 300 }, (_, i) => i % 3 === 2 ? 1 : 0)).length / 3 === G.WALL.MAX_CELLS);
check('graffiti: every brush fits in one message', G.WALL.BRUSHES.every(b => G.brushCells(5, 5, b, 1).length / 3 <= G.WALL.MAX_CELLS));
check('graffiti: 3x3 brush has 9 cells in the middle and is clipped at the corner', G.brushCells(5, 5, 3, 2).length === 27 && G.brushCells(0, 0, 3, 2).length === 12 && G.brushCells(47, 23, 1, 2).length === 3);
{
    const w = G.emptyWall(), n1 = G.paintCells(w, [1, 2, 3, 4, 5, 6]), n2 = G.paintCells(w, [1, 2, 3]);
    check('graffiti: painting counts only changed cells', n1 === 2 && n2 === 0 && w[2 * G.WALL.W + 1] === 3 && w[5 * G.WALL.W + 4] === 6);
    const enc = G.encodeWall(w), dec = G.decodeWall(enc);
    check('graffiti: snapshot round trip', !!dec && dec.length === w.length && dec.every((v, i) => v === w[i]));
    check('graffiti: an empty wall encodes to a single run', G.encodeWall(G.emptyWall()) === '0' + G.WALL.W * G.WALL.H);
    check('graffiti: decode rejects bad snapshots', [null, 5, '', 'zz', '0100', '0' + (G.WALL.W * G.WALL.H + 1), 'c1152', '01152,01', '0' + G.WALL.W * G.WALL.H + ',', 'x'.repeat(30000)].every(x => G.decodeWall(x) === null));
}
{
    const b = G.makeBucket(0);
    check('graffiti: rate limit allows a burst, then refuses', G.takeTokens(b, G.WALL.BURST, 0) && !G.takeTokens(b, 1, 0));
    check('graffiti: rate limit refills over time but never above the burst', G.takeTokens(b, G.WALL.PER_SEC, 1) && !G.takeTokens(makeB(), G.WALL.BURST + 1, 1000));
    function makeB() { return G.makeBucket(0); }
}
check('graffiti: near wall uses the horizontal distance and refuses missing heads', G.near({ x: 12, y: 1.6, z: 3 }, { x: 14.9, z: 3.5 }) && !G.near({ x: -10, y: 1.6, z: 0 }, { x: 14.9, z: 3.5 }) && !G.near(null, { x: 0, z: 0 }) && !G.near({ x: NaN, z: 0 }, { x: 0, z: 0 }));
check('graffiti: cellAt maps the aim point and rejects points outside the picture', JSON.stringify(G.cellAt(0, 0, 960, 480)) === '[0,0]' && JSON.stringify(G.cellAt(959, 479, 960, 480)) === '[47,23]' && G.cellAt(-1, 5, 960, 480) === null && G.cellAt(960, 5, 960, 480) === null && G.cellAt(NaN, 5, 960, 480) === null);
check('graffiti: the wall day turns over at 3:00 UTC', G.dayKey(Date.UTC(2026, 0, 2, 2, 59)) === G.dayKey(Date.UTC(2026, 0, 1, 12, 0)) && G.dayKey(Date.UTC(2026, 0, 2, 3, 0)) === G.dayKey(Date.UTC(2026, 0, 1, 12, 0)) + 1);
const gfx = fs.readFileSync(path.join(ROOT, 'core/graffiti.js'), 'utf8');
check('graffiti.js: the host cleans, rate-limits and position-checks a guest stroke before painting', /cleanCells\(msg\.c\)/.test(gfx) && /takeTokens\(/.test(gfx) && /near\(headOf\(from\), POS\)/.test(gfx) && /st\.lvl !== 'lobby'/.test(gfx));
check('graffiti.js: a guest accepts snapshots only through the validators', /decodeWall\(msg\.w\)/.test(gfx) && /Number\.isInteger\(msg\.d\)/.test(gfx) && /apply\(cleanCells\(msg\.c\)\)/.test(gfx));
check('graffiti.js: only the host or solo can clear the wall', /const canClear = \(\) => N\.NET\.mode !== 'guest'/.test(gfx) && /if \(canClear\(\)\) t\.btn\('clear'/.test(gfx));
check('lobbyplay.js: the lobby routes wall messages and builds, updates and disposes the wall', /onGraffitiMsg\(msg, from\)/.test(fs.readFileSync(path.join(ROOT, 'core/lobbyplay.js'), 'utf8')) && ['buildGraffiti();', 'updateGraffiti(dt, auth, {', 'disposeGraffiti()'].every(x => fs.readFileSync(path.join(ROOT, 'core/lobbyplay.js'), 'utf8').includes(x)));

// ---------- Konkurs i Galeria Ściany Graffiti (core/graffitiround.js) ----------
const R = await import(url('core/graffitiround.js'));
{
    const idle = (t) => ({ ph: 'idle', t }), ok = { enabled: true, present: 2, blocked: false };
    check('contest: waits while the timer runs', R.contestStep(idle(100), 1, ok).ph === 'idle' && R.contestStep(idle(100), 1, ok).t === 99);
    check('contest: starts when the timer ends and 2 players are present', R.contestStep(idle(0.5), 1, ok).event === 'start' && R.contestStep(idle(0.5), 1, ok).ph === 'draw');
    check('contest: does not start with 1 player, while disabled or during the Night Shift', ['present', 'enabled', 'blocked'].every(k => R.contestStep(idle(0), 1, { ...ok, [k]: k === 'present' ? 1 : (k === 'enabled' ? false : true) }).ph === 'idle'));
    check('contest: the timer is frozen while disabled or blocked', R.contestStep(idle(50), 5, { ...ok, enabled: false }).t === 50 && R.contestStep(idle(50), 5, { ...ok, blocked: true }).t === 50);
    check('contest: draw becomes vote, vote becomes result, result ends', R.contestStep({ ph: 'draw', t: 0.5 }, 1, ok).event === 'vote' && R.contestStep({ ph: 'vote', t: 0.5 }, 1, ok).event === 'result' && R.contestStep({ ph: 'result', t: 0.5 }, 1, ok).event === 'end' && R.contestStep({ ph: 'result', t: 0.5 }, 1, ok).ph === 'idle');
    check('contest: drawing is cancelled when players leave or events are switched off', R.contestStep({ ph: 'draw', t: 50 }, 1, { ...ok, present: 1 }).event === 'abort' && R.contestStep({ ph: 'vote', t: 5 }, 1, { ...ok, enabled: false }).event === 'abort');
    check('contest: next contest comes in 25-40 minutes (first in 10-15)', [0, 0.5, 0.999].every(r => R.nextContestIn(false, () => r) >= 1500 && R.nextContestIn(false, () => r) <= 2400 && R.nextContestIn(true, () => r) >= 600 && R.nextContestIn(true, () => r) <= 900));
    check('contest: a theme is always picked', R.ROUND.THEMES.includes(R.pickTheme(() => 0.999999)) && R.ROUND.THEMES.includes(R.pickTheme(() => 0)) && R.ROUND.THEMES.every(t => typeof t === 'string' && t.length <= 40 && /^[A-Za-z0-9 ,.'!?-]+$/.test(t)));
}
{
    const slots = R.assignSlots(['me', 'a', 'b', 'c', 'd', 'e']);
    check('contest slots: the first 4 players get columns, the rest only vote', JSON.stringify(slots) === '{"me":0,"a":1,"b":2,"c":3}' && R.idOfSlot(slots, 2) === 'b' && R.idOfSlot(slots, 4) === null);
    check('contest paint: strokes are cut to the artist\'s own column', JSON.stringify(R.restrictToSlot([0, 0, 1, 11, 0, 1, 12, 0, 1, 47, 23, 1], 0)) === '[0,0,1,11,0,1]' && JSON.stringify(R.restrictToSlot([12, 5, 2, 24, 5, 2], 1)) === '[12,5,2]');
    check('contest paint: spectators and bad slots paint nothing', R.restrictToSlot([0, 0, 1], undefined).length === 0 && R.restrictToSlot([0, 0, 1], -1).length === 0 && R.restrictToSlot([0, 0, 1], 4).length === 0 && R.restrictToSlot([0, 0, 1], 1.5).length === 0);
    const P = R.ROUND.PADS, on = (i) => ({ x: P[i][0], z: P[i][1] });
    check('contest votes: a head on a pad votes for it', JSON.stringify(R.countVotes({ me: on(1) }, { a: 0, b: 1 })) === '[0,1,0,0]');
    check('contest votes: the own pad does not count, a pad without an author does not count, heads off the pads do not count', JSON.stringify(R.countVotes({ a: on(0), b: { x: 0, z: 0 }, c: on(3) }, { a: 0, b: 1 })) === '[0,0,0,0]');
    check('contest votes: many voters add up and a missing head is skipped', JSON.stringify(R.countVotes({ x: on(0), y: on(0), z: on(1), w: null }, { a: 0, b: 1 })) === '[2,1,0,0]');
    check('contest winner: most votes, none = -1, a tie picks one of the tied', R.winnerOf([0, 3, 1, 0], () => 0) === 1 && R.winnerOf([0, 0, 0, 0], () => 0) === -1 && R.winnerOf([2, 0, 2, 0], () => 0) === 0 && R.winnerOf([2, 0, 2, 0], () => 0.99) === 2);
}
{
    const wall = G.emptyWall(); G.paintCells(wall, [12, 0, 3, 23, 23, 5, 11, 0, 7]);
    const poster = R.extractSlot(wall, 1);
    check('gallery: the poster is the winner\'s column only', poster.length === R.POSTER_LEN && poster[0] === 3 && poster[23 * 12 + 11] === 5 && poster.filter(v => v).length === 2);
    const entry = (t, n) => ({ t: t, n: n, d: G.encodeRle(poster) });
    const raw = [entry('A cursed banana', 'Anna'), entry('x', 'Bob')];
    const clean = R.cleanGallery(raw);
    check('gallery: valid entries pass the validator with the poster decoded', clean.length === 2 && clean[0].t === 'A cursed banana' && clean[0].n === 'Anna' && clean[0].cells.length === R.POSTER_LEN && clean[0].cells[0] === 3);
    check('gallery: the validator drops bad posters, bad shapes and cuts long lists', R.cleanGallery([{ t: 'a', n: 'b', d: 'zz' }, null, 5, { t: 'a', n: 'b' }, { t: 'a', n: 'b', d: '0100' }]).length === 0 && R.cleanGallery('x').length === 0 && R.cleanGallery([raw[0], raw[0], raw[0], raw[0], raw[0]]).length === R.ROUND.GALLERY_MAX);
    check('gallery: names and themes from the network are cleaned', (() => { const e = R.cleanGallery([{ t: '<b>Hi</b> there!!' + 'x'.repeat(80), n: '  Evil<script>Name_ok-1234567890XX', d: G.encodeRle(poster) }])[0]; return e.t.length <= 40 && !/[<>]/.test(e.t) && e.n.length <= 16 && /^[A-Za-z0-9_-]+$/.test(e.n); })());
    check('gallery: adding keeps the newest first and at most 3', R.galleryAdd([1, 2, 3], 0).join() === '0,1,2' && R.galleryAdd([], 'a').length === 1);
    check('gallery: the week turns over every 7 days of the wall day', R.weekKey(Date.UTC(2026, 0, 1, 12)) === R.weekKey(Date.UTC(2026, 0, 1, 20)) && R.weekKey(Date.UTC(2026, 0, 1, 12) + 7 * 86400000) === R.weekKey(Date.UTC(2026, 0, 1, 12)) + 1);
    const base = { p: 'draw', t: 90, th: 'A cursed banana', s: [['peer-1', 0, 'Anna'], ['peer-2', 1, 'Bob']], c: [0, 0, 0, 0], w: -1 };
    const cc = R.cleanContest(base);
    check('contest state: a valid host message is accepted', !!cc && cc.ph === 'draw' && cc.slots.length === 2 && cc.slots[0].id === 'peer-1' && cc.slots[1].name === 'Bob' && cc.t === 90 && cc.winner === -1);
    check('contest state: bad phases and shapes are refused', [null, 5, {}, { ...base, p: 'win' }, { ...base, p: 'constructor' }].every(x => R.cleanContest(x) === null));
    check('contest state: slots, counters, time and winner are clamped and duplicates dropped', (() => { const x = R.cleanContest({ ...base, t: 99999, c: [1e9, -1, 'x', 2], w: 9, s: [['a', 0, 'A'], ['b', 0, 'B'], ['c', 7, 'C'], [5, 1, 'D'], ['d'.repeat(200), 2, 'E'], 'x'] }); return x.t === 600 && x.counts.join() === '0,0,0,2' && x.winner === -1 && x.slots.length === 1 && x.slots[0].id === 'a'; })());
}
check('graffiti.js: the host cuts guest strokes to the contest column and ignores them outside the drawing phase', /G\.contest\.ph === 'draw' \? restrictToSlot\(cells, G\.contest\.slots\[from\]\) : \[\]/.test(gfx));
check('graffiti.js: the host counts votes and picks the winner from its own view of the players', /countVotes\(heads, k\.slots\)/.test(gfx) && /winnerOf\(k\.counts, Math\.random\)/.test(gfx) && /headOf\(id\)/.test(gfx));
check('graffiti.js: a guest accepts contest state and gallery only through the validators', /cleanContest\(msg\)/.test(gfx) && /cleanGallery\(msg\.g\)/.test(gfx));
check('graffiti.js: the contest follows the lobby events setting and waits for the Night Shift', /enabled: o\.enabled, present: ids\.length, blocked: o\.night !== 'calm'/.test(gfx) && /SETTINGS\.lobbyEvents !== false/.test(fs.readFileSync(path.join(ROOT, 'core/lobbyplay.js'), 'utf8')));
check('graffiti.js: only the winner of the host-sent result gets the reward', (gfx.match(/levelReward\('graffiti'/g) || []).length === 2 && /wid === 'me'/.test(gfx) && /idOfSlot\(k\.slots, k\.winner\) === 'me'/.test(gfx));
check('graffiti.js: the wall dims with the lobby, sprays when painting and supports VR drag', /setScalar\(dim\)/.test(gfx) && /SFX\.hiss\(/.test(gfx) && /triggerDown\(i\)/.test(gfx) && /pointerHit\(i\)/.test(gfx));

// ---------- Stworek (core/petlogic.js, core/petstore.js, zaufanie w sieci) ----------
const PL = await import(url('core/petlogic.js'));
{
    const D = 86400000, T0 = Date.UTC(2026, 5, 1, 12), P = PL.PET;
    const mk = (o) => ({ ...PL.hatch(T0, 4, () => 0), ...o });
    check('pet: lists are consistent (weights, names, levels, scales)', P.WEIGHTS.length === P.COLORS.length && P.COLORS.every(c => /^#[0-9a-f]{6}$/.test(c.body) && /^#[0-9a-f]{6}$/.test(c.belly) && /^#[0-9a-f]{6}$/.test(c.accent)) && new Set(P.NAMES).size === P.NAMES.length && P.NAMES.every(n => /^[A-Za-z]{2,12}$/.test(n)) && P.LEVELS.length === P.SCALE.length && P.LEVELS.every((v, i) => i === 0 || v > P.LEVELS[i - 1]));
    check('pet: the golden colour is the rare one', P.COLORS.filter(c => c.rare).length === 1 && P.COLORS[P.COLORS.length - 1].rare && P.WEIGHTS[P.WEIGHTS.length - 1] === Math.min(...P.WEIGHTS));
    check('pet: colour pick follows the weights and never goes out of range', PL.pickColor(() => 0) === 0 && PL.pickColor(() => 0.999999) === P.COLORS.length - 1 && PL.pickColor(() => 0.96) === 5 && PL.pickColor(() => 0.94) === 4 && [0, 0.3, 0.7, 0.9999].every(r => { const c = PL.pickColor(() => r); return c >= 0 && c < P.COLORS.length; }));
    check('pet: hatching gives a valid pet at the moment of hatching', (() => { const h = PL.hatch(T0, 7.9, () => 0.5); return PL.normalizePet(h, T0) && JSON.stringify(PL.normalizePet(h, T0)) === JSON.stringify(h) && h.b === 7 && h.s === 0.8 && h.pa === 0; })());
    check('pet: hatching needs no pet and enough Bagabucks', PL.canHatch(null, P.HATCH_COST).ok && !PL.canHatch(null, P.HATCH_COST - 1).ok && PL.canHatch(null, 5).reason === 'poor' && PL.canHatch(mk({}), 1e6).reason === 'have' && !PL.canHatch(null, NaN).ok && !PL.canHatch(null, undefined).ok);
    // zapis: normalizePet nie ufa niczemu
    check('pet save: junk becomes no pet', [null, undefined, 5, 'x', [], {}, { c: 99 }, { c: -1 }, { c: 1.5 }, { c: '1' }].every(x => PL.normalizePet(x, T0) === null) && PL.normalizePet({ c: 1 }, NaN) === null);
    check('pet save: every field is clamped', (() => { const p = PL.normalizePet({ c: 2, n: 999, h: 1e18, b: -5, s: 9, st: 'x', m: -3, mt: 1e18, fd: { d: 'a', n: 99 }, pa: 1e18 }, T0); return p.c === 2 && p.n === 0 && p.h === T0 && p.b === 0 && p.s === 1 && p.st === T0 && p.m === 0 && p.mt === T0 && p.fd.d === 0 && p.fd.n === 0 && p.pa === T0; })());
    check('pet save: a clean pet survives normalisation unchanged', (() => { const p = mk({ c: 3, n: 5 }); return JSON.stringify(PL.normalizePet(JSON.parse(JSON.stringify(p)), T0)) === JSON.stringify(p); })());
    // czas
    const p0 = mk({});
    check('pet hunger: satiety falls with time and stays in 0..1', PL.satiety(p0, T0) === 0.8 && Math.abs(PL.satiety(p0, T0 + 18 * 3600000) - 0.3) < 1e-9 && PL.satiety(p0, T0 + 100 * D) === 0 && PL.satiety(p0, T0 - D) === 0.8);
    check('pet hunger: an absurdly large clock jump is capped and a backwards clock changes nothing', PL.satiety(p0, T0 + 1e15) === 0 && PL.moodOf(p0, T0 + 1e15) >= P.MOOD_FLOOR && PL.satiety(p0, T0 - 5 * D) === p0.s);
    check('pet mood: never below the floor, nothing dies', [0, 1, 10, 100, 1e5].every(d => { const v = PL.moodOf(p0, T0 + d * D); return v >= P.MOOD_FLOOR && v <= 1; }) && PL.moodLabel(PL.moodOf(p0, T0 + 60 * D)) === 'gloomy');
    check('pet mood: labels', PL.moodLabel(0.9) === 'happy' && PL.moodLabel(0.5) === 'content' && PL.moodLabel(0.2) === 'gloomy' && PL.moodLabel(0.66) === 'happy' && PL.moodLabel(0.35) === 'content');
    check('pet hunger: hungry below the threshold only', !PL.isHungry(p0, T0) && PL.isHungry(p0, T0 + 24 * 3600000) && !PL.isHungry(PL.feed(p0, T0 + 24 * 3600000), T0 + 24 * 3600000));
    // karmienie
    const hungry = T0 + 30 * 3600000;
    check('pet feed: needs a pet, an appetite, a daily slot and Bagabucks', PL.canFeed(null, 999, T0).reason === 'nopet' && PL.canFeed(mk({ s: 1 }), 999, T0 + 10).reason === 'full' && PL.canFeed(p0, 999, T0 + 10).ok && PL.canFeed(p0, P.FEED_COST - 1, hungry).reason === 'poor' && PL.canFeed(p0, P.FEED_COST, hungry).ok && PL.canFeed(p0, NaN, hungry).reason === 'poor');
    check('pet feed: it fills the pet and raises the mood but never above 1', (() => { const f = PL.feed(p0, hungry); return Math.abs(PL.satiety(f, hungry) - (Math.max(0, 0.8 - 30 / P.SAT_HOURS) + P.FEED_GAIN)) < 1e-9 && PL.moodOf(f, hungry) > PL.moodOf(p0, hungry) && PL.satiety(PL.feed(mk({ s: 0.8, st: hungry }), hungry), hungry) <= 1; })());
    check('pet feed: a daily limit, back again the next day', (() => { let p = mk({ s: 0, st: T0 }); let n = 0; while (PL.canFeed(p, 999, T0 + n).ok && n < 50) { p = PL.feed(PL.normalizePet({ ...p, s: 0 }, T0 + n + 10), T0 + n); p = { ...p, s: 0, st: T0 + n }; n++; } return n === P.FEED_LIMIT && PL.canFeed(p, 999, T0 + n).reason === 'limit' && PL.canFeed(p, 999, T0 + D).ok && PL.feedsLeft(p, T0 + n) === 0 && PL.feedsLeft(p, T0 + D) === P.FEED_LIMIT; })());
    // głaskanie
    check('pet pat: a cooldown, a small mood gain, free', PL.canPat(p0, T0) && (() => { const q = PL.pat(p0, T0 + 1000); return !PL.canPat(q, T0 + 1000 + P.PAT_COOLDOWN - 1) && PL.canPat(q, T0 + 1000 + P.PAT_COOLDOWN) && PL.moodOf(q, T0 + 1000) >= PL.moodOf(p0, T0 + 1000); })() && !PL.canPat(null, T0));
    check('pet pat: a pat from the future (clock moved back) does not lock the pet for ever', PL.canPat({ ...p0, pa: T0 + 1e12 }, T0));
    check('pet name: cycles through the list in both directions', PL.renamePet(mk({ n: 0 }), -1).n === P.NAMES.length - 1 && PL.renamePet(mk({ n: P.NAMES.length - 1 }), 1).n === 0 && PL.renamePet(mk({ n: 3 }), 1).n === 4 && PL.renamePet(mk({ n: 3 }), 0).n === 4);
    // poziom
    check('pet level: grows with cleared levels since hatching', PL.levelOf(p0, 4) === 1 && PL.levelOf(p0, 4 + 2) === 1 && PL.levelOf(p0, 4 + 3) === 2 && PL.levelOf(p0, 4 + 10) === 3 && PL.levelOf(p0, 4 + 25) === 4 && PL.levelOf(p0, 4 + 50) === 5 && PL.levelOf(p0, 4 + 5000) === 5);
    check('pet level: old clears do not count and bad input is safe', PL.levelOf(p0, 0) === 1 && PL.levelOf(p0, -9) === 1 && PL.levelOf(p0, NaN) === 1 && PL.levelOf(p0, undefined) === 1);
    check('pet level: progress to the next level', (() => { const a = PL.progress(p0, 4), b = PL.progress(p0, 4 + 5), c = PL.progress(p0, 4 + 80); return a.level === 1 && a.frac === 0 && a.left === 3 && !a.max && b.level === 2 && b.left === 5 && b.frac > 0 && b.frac < 1 && c.max && c.frac === 1 && c.left === 0; })());
    check('pet level: the model scale grows with the level', P.SCALE.every((v, i) => PL.scaleOf(i + 1) === v) && PL.scaleOf(0) === P.SCALE[0] && PL.scaleOf(99) === P.SCALE[P.SCALE.length - 1] && PL.scaleOf('x') === P.SCALE[0]);
    // sieć
    check('pet look: the tuple round trip', JSON.stringify(PL.cleanLook(PL.lookOf(mk({ c: 4, n: 7 }), 4 + 10))) === '{"c":4,"l":3,"n":7}');
    check('pet look: bad data from the network is refused', [null, 5, 'x', {}, [], [1, 2], [1, 2, 3, 4], [9, 1, 1], [-1, 1, 1], [0, 0, 0], [0, 6, 0], [0, 1, 99], [0.5, 1, 1], ['0', 1, 1], [0, null, 0], [NaN, 1, 1]].every(x => PL.cleanLook(x) === null));
    // zachowanie
    check('pet follow: speeds by distance and the rest zone', PL.followSpeed(0.5) === 0 && PL.followSpeed(2) > 0 && PL.followSpeed(4) > PL.followSpeed(2) && PL.followSpeed(9) > PL.followSpeed(4) && PL.followSpeed(1.49) === 0 && PL.followSpeed(1.5) > 0);
    check('pet follow: it teleports when far away or when the distance is not a number', !PL.shouldTeleport(5) && !PL.shouldTeleport(P.TELEPORT) && PL.shouldTeleport(P.TELEPORT + 0.1) && PL.shouldTeleport(NaN) && PL.shouldTeleport(Infinity));
    check('pet idle: sits and then sleeps with the player standing still', PL.idleStage(0) === 'idle' && PL.idleStage(P.IDLE_SIT) === 'sit' && PL.idleStage(P.IDLE_SLEEP - 0.1) === 'sit' && PL.idleStage(P.IDLE_SLEEP) === 'sleep');
}
{
    const store = fs.readFileSync(path.join(ROOT, 'core/petstore.js'), 'utf8'), net2 = fs.readFileSync(path.join(ROOT, 'core/network.js'), 'utf8'), pet = fs.readFileSync(path.join(ROOT, 'core/pet.js'), 'utf8');
    check('petstore.js: every read goes through normalizePet', /normalizePet\(SAVE\.pet, Date\.now\(\)\)/.test(store) && !/SAVE\.pet\./.test(store));
    check('petstore.js: hatching and food are paid with spendBones and rolled back when it fails', (store.match(/spendBones\(/g) || []).length === 2 && (store.match(/SAVE\.pet = (old|p); return \{ ok: false/g) || []).length === 2);
    check('petstore.js: the pet never earns Bagabucks', !/addBones|levelReward/.test(store) && !/addBones|levelReward/.test(pet));
    check('network.js: the pet look rides in the player state and nothing else of the pet does', /pt: petLookNet\(\)/.test(net2) && !/SAVE\.pet/.test(net2));
    check('pet.js: other players\' pets are shown only from a validated look, only on the same hub, never for invisible players', /cleanLook\(st\.pt\)/.test(pet) && /st\.lvl !== L\.levelId/.test(pet) && /st\.inv/.test(pet) && !/st\.pt\.[a-z]/.test(pet));
    check('pet.js: the companion lives only in hubs (never in record levels or stealth modes)', /kind === 'hub'/.test(pet));
}

done('logic');
