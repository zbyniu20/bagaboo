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
check('rank: Luna is a moderator', C.rankOf('Luna') === 1 && C.rankOf('luna') === 1 && C.isReservedNick('Luna'));
check('rank: victoryboy is a normal player', C.rankOf('victoryboy') === 0 && !C.isModName('victoryboy') && !C.isReservedNick('victoryboy'));
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
    for (const q of E.ensureDaily().quests) if (q.id === 'shop') q.done = true;   // dzienne zadanie sklepowe (+40) zależy od daty, a test mierzy samą cenę
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
check('guest results: the guarded modes were found (redlight, racemode, range)', guarded >= 3, guarded);

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
check('graffiti.js: only the host or solo can clear the shared wall (a guest clears only the private screen)', /const canClear = \(\) => G\.contest\.ph === 'idle' && \(G\.mode === 'private' \|\| N\.NET\.mode !== 'guest'\)/.test(gfx) && /function clearWall\(\) \{ if \(!canClear\(\)\) return; if \(isPrivate\(\)\)/.test(gfx) && /if \(canClear\(\)\) t\.btn\('clear'/.test(gfx));
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
    check('gallery: the validator drops bad posters, bad shapes and cuts long lists', R.cleanGallery([{ t: 'a', n: 'b', d: 'zz' }, null, 5, { t: 'a', n: 'b' }, { t: 'a', n: 'b', d: '0100' }]).length === 0 && R.cleanGallery('x').length === 0 && R.cleanGallery(Array.from({ length: 30 }, () => raw[0])).length === R.ROUND.GALLERY_MAX);
    check('gallery: names and themes from the network are cleaned', (() => { const e = R.cleanGallery([{ t: '<b>Hi</b> there!!' + 'x'.repeat(80), n: '  Evil<script>Name_ok-1234567890XX', d: G.encodeRle(poster) }])[0]; return e.t.length <= 40 && !/[<>]/.test(e.t) && e.n.length <= 16 && /^[A-Za-z0-9_-]+$/.test(e.n); })());
    check('gallery: a poster of the whole wall (48x24) is accepted as wide, a winner column stays narrow, wrong lengths are dropped', (() => { const wide = new Uint8Array(G.WALL.W * G.WALL.H); wide[5] = 3; wide[G.WALL.W * G.WALL.H - 1] = 7; const out = R.cleanGallery([{ t: 'a', n: 'b', d: G.encodeRle(wide) }, { t: 'c', n: 'd', d: G.encodeRle(new Uint8Array(R.POSTER_LEN)) }, { t: 'e', n: 'f', d: G.encodeRle(new Uint8Array(100)) }]); return out.length === 2 && out[0].w === G.WALL.W && out[0].cells.length === R.WIDE_LEN && out[0].cells[5] === 3 && out[0].cells[R.WIDE_LEN - 1] === 7 && out[1].w === R.ROUND.COLS; })());
    {   // publiczna Galeria: zgłoszenia, głosy i ranking (czyste funkcje)
        const mkE = (n, v) => ({ t: 't', n: n, d: 'x', cells: new Uint8Array(1), w: 48, v: v || 0, s: [] });
        check('gallery: one entry per author, a resubmission replaces the old one and resets its votes', (() => { let l = R.gallerySubmit([], mkE('Ann')); l = R.galleryVote(l, 'Ann', 'p1', []).list; l = R.gallerySubmit(l, mkE('Bob')); const before = l.find(x => x.n === 'Ann').v; l = R.gallerySubmit(l, mkE('Ann')); return before === 1 && l.length === 2 && l[0].n === 'Ann' && l[0].v === 0 && l[0].s.length === 0; })());
        check('gallery: when full the entry with the fewest votes (oldest on a tie) is dropped, never the new one', (() => { let l = []; for (let i = 0; i < R.ROUND.GALLERY_MAX; i++) l = R.gallerySubmit(l, mkE('P' + i)); l = R.galleryVote(l, 'P0', 'v', []).list; l = R.gallerySubmit(l, mkE('New')); return l.length === R.ROUND.GALLERY_MAX && l[0].n === 'New' && l.some(x => x.n === 'P0') && !l.some(x => x.n === 'P1'); })());
        check('gallery vote: one vote per voter per entry, never for your own work, unknown authors are refused', (() => { const l = R.gallerySubmit([], mkE('Ann')), a = R.galleryVote(l, 'Ann', 'p1', []), b = R.galleryVote(a.list, 'Ann', 'p1', []), c = R.galleryVote(l, 'Ann', 'p9', ['Ann']), d = R.galleryVote(l, 'Zed', 'p1', []), e = R.galleryVote([{ ...mkE('Cy'), o: 'me' }], 'Cy', 'me', []); return a.ok && a.list[0].v === 1 && !b.ok && b.reason === 'dup' && b.list[0].v === 1 && !c.ok && c.reason === 'own' && !d.ok && d.reason === 'none' && !e.ok && e.reason === 'own' && !R.galleryVote(l, 'Ann', '', []).ok && !R.galleryVote(l, 'Ann', 5, []).ok; })());
        check('gallery: the ranking puts the most votes first and newer first on a tie, without changing the list', (() => { const l = [mkE('A', 1), mkE('B', 3), mkE('C', 1), mkE('D', 3)], r = R.galleryRank(l); return r.map(x => x.n).join('') === 'BDAC' && l.map(x => x.n).join('') === 'ABCD'; })());
        check('gallery: votes and the voter list from storage are range-checked, the network copy carries counts only', (() => { const wide = new Uint8Array(G.WALL.W * G.WALL.H); wide[1] = 2; const d = G.encodeRle(wide), o = R.cleanGallery([{ t: 'a', n: 'b', d: d, v: 5, s: ['x', 5, 'y'.repeat(200)] }, { t: 'a', n: 'c', d: d, v: -3 }, { t: 'a', n: 'e', d: d, v: 1e9 }, { t: 'a', n: 'f', d: d, v: 1.5 }]); return o[0].v === 5 && o[0].s.join() === 'x' && o[1].v === 0 && o[2].v === 0 && o[3].v === 0 && /g: G\.gallery\.map\(e => \(\{ t: e\.t, n: e\.n, d: e\.d, v: e\.v \}\)\)/.test(gfx); })());
    }
check('graffiti.js: a guest vote needs a string author, the board nearby, the right level and a rate limit, and the voter is the network id', /msg\.k === 'gb'/.test(gfx) && /typeof msg\.a !== 'string'/.test(gfx) && /near\(headOf\(from\), GPOS\)/.test(gfx) && /castVote\(from, msg\.a\)/.test(gfx) && /galleryVote\(G\.gallery, author, voterId, \[nameOf\(voterId\)\]\)/.test(gfx));
    check('gallery: the week turns over every 7 days of the wall day', R.weekKey(Date.UTC(2026, 0, 1, 12)) === R.weekKey(Date.UTC(2026, 0, 1, 20)) && R.weekKey(Date.UTC(2026, 0, 1, 12) + 7 * 86400000) === R.weekKey(Date.UTC(2026, 0, 1, 12)) + 1);
    const base = { p: 'draw', t: 90, th: 'A cursed banana', s: [['peer-1', 0, 'Anna'], ['peer-2', 1, 'Bob']], c: [0, 0, 0, 0], w: -1 };
    const cc = R.cleanContest(base);
    check('contest state: a valid host message is accepted', !!cc && cc.ph === 'draw' && cc.slots.length === 2 && cc.slots[0].id === 'peer-1' && cc.slots[1].name === 'Bob' && cc.t === 90 && cc.winner === -1);
    check('contest: when every author has pressed SAVE the voting starts early, not otherwise', R.contestStep({ ph: 'draw', t: 90 }, 0.1, { enabled: true, present: 2, blocked: false, ready: true }, () => 0).ph === 'vote' && R.contestStep({ ph: 'draw', t: 90 }, 0.1, { enabled: true, present: 2, blocked: false, ready: false }, () => 0).ph === 'draw');
    check('contest state: the saved flag of an author is read as a strict 1', (() => { const x = R.cleanContest({ ...base, s: [['a', 0, 'A', 1], ['b', 1, 'B', true], ['c', 2, 'C']] }); return x.slots[0].ready === true && x.slots[1].ready === false && x.slots[2].ready === false; })());
    check('contest state: bad phases and shapes are refused', [null, 5, {}, { ...base, p: 'win' }, { ...base, p: 'constructor' }].every(x => R.cleanContest(x) === null));
    check('contest state: slots, counters, time and winner are clamped and duplicates dropped', (() => { const x = R.cleanContest({ ...base, t: 99999, c: [1e9, -1, 'x', 2], w: 9, s: [['a', 0, 'A'], ['b', 0, 'B'], ['c', 7, 'C'], [5, 1, 'D'], ['d'.repeat(200), 2, 'E'], 'x'] }); return x.t === 600 && x.counts.join() === '0,0,0,2' && x.winner === -1 && x.slots.length === 1 && x.slots[0].id === 'a'; })());
}
check('graffiti.js: the host cuts guest strokes to the contest column and ignores them outside the drawing phase', /G\.contest\.ph === 'draw' && !G\.contest\.ready\[from\] \? restrictToSlot\(cells, G\.contest\.slots\[from\]\) : \[\]/.test(gfx));
check('graffiti.js: the idle SAVE poster message is range-checked, near the wall, rate-limited and named from the host view', /msg\.k === 'gq'/.test(gfx) && /near\(headOf\(from\), POS\)/.test(gfx) && /POSTER_CD/.test(gfx) && /addPoster\(from, pw\)/.test(gfx) && /\(wall \|\| G\.wall\)\.slice\(\)/.test(gfx) && !/msg\.n\b/.test(gfx));
check('graffiti.js: every player starts on the private screen, so nobody else can disturb the drawing until the shared wall is chosen', /mode: 'private'/.test(gfx) && !/mode: 'shared'/.test(gfx));
check('graffiti.js: the private screen paints only into the local array and returns before anything is queued or sent', (() => { const i = gfx.indexOf('if (isPrivate()) {   // prywatny ekran'); const j = gfx.indexOf('return;\n    }', i); const body = gfx.slice(i, j); return i > 0 && /paintCells\(G\.priv/.test(body) && !/sendLevelMsg|G\.out|apply\(/.test(body); })());
check('graffiti.js: a guest private drawing reaches the gallery only through the wall validator, and the contest always uses the shared wall', /decodeWall\(msg\.w\)/.test(gfx) && /if \(msg\.w !== undefined && !pw\) return true/.test(gfx) && /const isPrivate = \(\) => G\.mode === 'private' && G\.contest\.ph === 'idle'/.test(gfx) && /PKEY/.test(gfx));
check('graffiti.js: the SAVE message is honoured only from a slot owner in the drawing phase', /msg\.k === 'gv'/.test(gfx) && /k\.ph === 'draw' && k\.slots\[from\] !== undefined/.test(gfx));
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
    check('pet name: arrows cycle inside the current group (cute or scary) in both directions', PL.renamePet(mk({ n: 0 }), -1).n === P.CUTE_NAMES - 1 && PL.renamePet(mk({ n: P.CUTE_NAMES - 1 }), 1).n === 0 && PL.renamePet(mk({ n: P.CUTE_NAMES }), -1).n === P.NAMES.length - 1 && PL.renamePet(mk({ n: P.NAMES.length - 1 }), 1).n === P.CUTE_NAMES && PL.renamePet(mk({ n: 5 }), 1).n === 6);
    check('pet name: the cute/scary switch jumps to the other group, twice returns, always in range', (() => { for (let n = 0; n < P.NAMES.length; n++) { const a = PL.toggleNameStyle(mk({ n })); if (a.n < 0 || a.n >= P.NAMES.length || PL.nameStyle(a) === PL.nameStyle(mk({ n })) || PL.toggleNameStyle(a).n !== n) return false; } return PL.nameStyle(mk({ n: 0 })) === 'cute' && PL.nameStyle(mk({ n: P.CUTE_NAMES })) === 'scary' && P.NAMES[P.CUTE_NAMES - 1] === 'Bubbles'; })());
    // poziom
    check('pet level: grows with cleared levels since hatching', PL.levelOf(p0, 4) === 1 && PL.levelOf(p0, 4 + 2) === 1 && PL.levelOf(p0, 4 + 3) === 2 && PL.levelOf(p0, 4 + 10) === 3 && PL.levelOf(p0, 4 + 25) === 4 && PL.levelOf(p0, 4 + 50) === 5 && PL.levelOf(p0, 4 + 5000) === 5);
    check('pet level: old clears do not count and bad input is safe', PL.levelOf(p0, 0) === 1 && PL.levelOf(p0, -9) === 1 && PL.levelOf(p0, NaN) === 1 && PL.levelOf(p0, undefined) === 1);
    check('pet level: progress to the next level', (() => { const a = PL.progress(p0, 4), b = PL.progress(p0, 4 + 5), c = PL.progress(p0, 4 + 80); return a.level === 1 && a.frac === 0 && a.left === 3 && !a.max && b.level === 2 && b.left === 5 && b.frac > 0 && b.frac < 1 && c.max && c.frac === 1 && c.left === 0; })());
    check('pet level: the model scale grows with the level', P.SCALE.every((v, i) => PL.scaleOf(i + 1) === v) && PL.scaleOf(0) === P.SCALE[0] && PL.scaleOf(99) === P.SCALE[P.SCALE.length - 1] && PL.scaleOf('x') === P.SCALE[0]);
    check('pet color: a normal pet cycles the five normal colors and never reaches the golden one', (() => { let p = { ...p0, c: 0, u: 0 }; const seen = new Set(); for (let i = 0; i < 12; i++) { p = PL.cycleColor(p, 1); seen.add(p.c); } return seen.size === 5 && !seen.has(5) && PL.cycleColor({ ...p0, c: 0, u: 0 }, -1).c === 4; })());
    check('pet color: a pet hatched golden keeps the golden color in the cycle', (() => { const g = { ...p0, c: 5, u: 1 }; return PL.colorChoices(g).length === 6 && PL.cycleColor({ ...g, c: 4 }, 1).c === 5 && PL.normalizePet({ c: 5 }, 1e12).u === 1 && PL.normalizePet({ c: 1, u: 7 }, 1e12).u === 0; })());
    check('pet names: scary names are on the list, short, clean and appended after the cute ones', P.NAMES.length >= 40 && ['Grimm', 'Wraith', 'Banshee', 'Reaper'].every(n => P.NAMES.includes(n)) && P.NAMES.indexOf('Bubbles') === 23 && P.NAMES.every(n => /^[A-Za-z]{2,9}$/.test(n)) && new Set(P.NAMES).size === P.NAMES.length);
    check('pet species: five species, hatching and cycling stay in range and bad values fall back to Blobby', P.SPECIES.length === 5 && PL.hatch(T0, 0, () => 0.5, 3).sp === 3 && PL.hatch(T0, 0, () => 0.5, 99).sp === 0 && PL.hatch(T0, 0, () => 0.5).sp === 0 && PL.normalizePet({ c: 0, sp: 7 }, T0).sp === 0 && PL.normalizePet({ c: 0, sp: 'x' }, T0).sp === 0 && (() => { let q = { ...p0, sp: 0 }; const seen = new Set(); for (let i = 0; i < 7; i++) { q = PL.cycleSpecies(q, 1); seen.add(q.sp); } return seen.size === 5 && PL.cycleSpecies({ ...p0, sp: 0 }, -1).sp === 4; })());
    check('pet carry: hands, back and ground follow the rules', (() => { const C = PL.CARRY, n = PL.carryNext; return n(0, 'grab') === 1 && n(0, 'back') === 0 && n(1, 'back') === 2 && n(1, 'drop') === 0 && n(2, 'back') === 0 && n(2, 'drop') === 2 && n(2, 'grab') === 2 && C.NONE === 0; })());
    check('pet carry: the back is behind the head and the network value is range-checked', (() => { const b = PL.backAnchor({ x: 1, y: 1.7, z: 2 }, 0, -1); return b.z > 2 && b.x === 1 && b.y < 1.7 && PL.cleanCarry(2) === 2 && [3, -1, '1', null, 1.5].every(v => PL.cleanCarry(v) === 0); })());
    check('pet.js: carrying is wired to the grip, the V key and the network state', (() => { const pt = fs.readFileSync(new URL('../core/pet.js', import.meta.url), 'utf8'); return /gripDown\(/.test(pt) && /onDesktopKey\('KeyV'/.test(pt) && /cleanCarry\(st\.pc\)/.test(pt) && /pc: petCarryNet\(\)/.test(fs.readFileSync(new URL('../core/network.js', import.meta.url), 'utf8')); })());
    // sieć
    check('pet look: the tuple round trip (with and without Pet Pack items)', JSON.stringify(PL.cleanLook(PL.lookOf(mk({ c: 4, n: 7 }), 4 + 10))) === '{"c":4,"l":3,"n":7,"h":0,"k":0,"sp":0}' && JSON.stringify(PL.cleanLook(PL.lookOf(mk({ c: 1, n: 2 }), 4, 'crown', 'cape'))) === '{"c":1,"l":1,"n":2,"h":5,"k":5,"sp":0}' && JSON.stringify(PL.cleanLook([2, 3, 4])) === '{"c":2,"l":3,"n":4,"h":0,"k":0,"sp":0}' && PL.cleanLook(PL.lookOf(mk({ c: 1, n: 2, sp: 3 }), 4)).sp === 3);
    check('pet look: an unknown hat or neck item id means none', PL.hatIndex('nope') === 0 && PL.neckIndex(undefined) === 0 && PL.hatIndex('party') === 1 && PL.neckIndex('bow') === 1 && PL.lookOf(mk({}), 4, 'hack', {}).slice(3, 5).join() === '0,0');
    check('pet look: cosmetic indices from the network are range-checked', [[0, 1, 0, 6, 0], [0, 1, 0, 0, 6], [0, 1, 0, -1, 0], [0, 1, 0, 0, 1.5], [0, 1, 0, '1', 0], [0, 1, 0, null, 0], [0, 1, 0, NaN, 0], [0, 1, 0, 0], [0, 1, 0, 0, 0, 5], [0, 1, 0, 0, 0, -1], [0, 1, 0, 0, 0, 1.5], [0, 1, 0, 0, 0, '1'], [0, 1, 0, 0, 0, 0, 0]].every(x => PL.cleanLook(x) === null) && PL.cleanLook([0, 1, 0, 5, 5]) !== null);
    check('pet look: bad data from the network is refused', [null, 5, 'x', {}, [], [1, 2], [1, 2, 3, 4], [9, 1, 1], [-1, 1, 1], [0, 0, 0], [0, 6, 0], [0, 1, 99], [0.5, 1, 1], ['0', 1, 1], [0, null, 0], [NaN, 1, 1]].every(x => PL.cleanLook(x) === null));
    // zachowanie
    check('pet follow: speeds by distance to the rest spot (stand, walk, trot, run)', PL.followSpeed(0.49) === 0 && PL.followSpeed(0) === 0 && PL.followSpeed(0.5) > 0 && PL.followSpeed(2) > PL.followSpeed(1) && PL.followSpeed(5) > PL.followSpeed(2) && PL.followSpeed(NaN) === 0 && PL.followSpeed(-3) === 0);
    check('pet follow: the rest spot is 2 m in front of the player, a bit to the right of the view direction', (() => { const r = PL.restSpot(0, 0, 0, 1, null); return Math.abs(Math.hypot(r.x, r.z) - P.REST) < 1e-9 && r.z > 0 && r.x < 0; })());
    check('pet follow: the rest spot ignores the length of the direction vector and survives a missing or broken direction', (() => { const a = PL.restSpot(1, 2, 0, 5, null), b = PL.restSpot(1, 2, 0, 1, null), c = PL.restSpot(1, 2, 0, 0, null), d = PL.restSpot(1, 2, NaN, undefined, null); return Math.abs(a.x - b.x) < 1e-9 && Math.abs(a.z - b.z) < 1e-9 && Number.isFinite(c.x) && Number.isFinite(d.z) && Math.hypot(c.x - 1, c.z - 2) > 1.9; })());
    check('pet follow: the rest spot is kept inside the room', (() => { const B = { minX: -15, maxX: 15, minZ: -15, maxZ: 15 }, r = PL.restSpot(14.5, 14.5, 1, 1, B); return r.x <= 14.4 && r.z <= 14.4 && PL.restSpot(-14.5, -14.5, -1, -1, B).x >= -14.4; })());
    check('pet follow: it starts running only when the player is farther than STAY and runs until it reaches the rest spot (no running away from a hand)', !PL.shouldFollow(false, P.STAY - 0.1, 5) && !PL.shouldFollow(false, 1, 5) && PL.shouldFollow(false, P.STAY + 0.1, 5) && PL.shouldFollow(true, 1, 3) && !PL.shouldFollow(true, 1, P.REST_ARRIVE - 0.01) && !PL.shouldFollow(true, 9, 0));
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
    const nestSrc = fs.readFileSync(path.join(ROOT, 'core/petnest.js'), 'utf8');
    check('petnest.js: the care panel and the nest are really added to the level (a trailing comment must not swallow the add call)', /pg\.position\.set\(x, 2\.55, -14\.4\); L\.root\.add\(pg\);/.test(nestSrc) && /const g = new THREE\.Group\(\); g\.position\.set\(x, 0, z\); L\.root\.add\(g\);/.test(nestSrc) && nestSrc.split('\n').every(l => !/\/\/[^'"`]*\bL\.root\.add\(/.test(l)));
    check('pet.js: the companion lives only in hubs (never in record levels or stealth modes)', /kind === 'hub'/.test(pet));
}

// ---------- kosmetyki: każdy przedmiot ze sklepu ma model albo paletę (inaczej po założeniu byłby niewidoczny) ----------
{
    const src = ['core/cosmetics.js', 'core/avatar.js', 'core/gorillamachine.js'].map(f => fs.readFileSync(path.join(ROOT, f), 'utf8')).join('\n');
    const has = (id) => new RegExp("['\"]" + id + "['\"]|\\b" + id + "\\s*:").test(src);
    const missing = E.CATALOG.filter(i => ['hat', 'glasses', 'mask', 'sleeve', 'gloves', 'skin', 'tool', 'badge'].includes(i.slot) && i.id !== 'none' && !(i.slot === 'sleeve' && i.id === 'cloth') && !has(i.id)).map(i => i.slot + ':' + i.id);
    check('cosmetics: every hat, glasses, mask, sleeve, glove, skin, hammer and badge in the catalog has a model or palette', missing.length === 0, missing.join(', '));
    const NEW = { skin: ['furasek', 'bubblegum', 'cottoncandy', 'honeyape', 'mintape', 'cadaver'], hat: ['catears', 'flowercrown', 'donut', 'unicorn', 'knifehead', 'axehead', 'brainhat', 'nailcrown', 'antlers'], glasses: ['starglasses', 'buttoneyes', 'bleedingeyes'], mask: ['flayed', 'sewn', 'faceless'], sleeve: ['bloodstained'], gloves: ['blooded'] };
    check('cosmetics: the new sweet and scary items are in the shop, buyable and priced sanely', Object.entries(NEW).every(([slot, ids]) => ids.every(id => { const it = E.CATALOG.find(i => i.slot === slot && i.id === id); return it && !it.locked && !it.season && it.price >= 900 && it.price <= 5000 && it.name.length <= 24; })));
    check('ultimate: zbyniu runs 2x faster, but only on the verified account, and the avatar is 4x bigger than before (8)', await (async () => {
    const MS = await import(url('core/modstate.js')), AV = fs.readFileSync(path.join(ROOT, 'core/avatar.js'), 'utf8'), PL = fs.readFileSync(path.join(ROOT, 'core/player.js'), 'utf8');
    const spd = (name, verified) => { E.markNickVerified(verified ? name : ''); E.setProfile({ name: name }); return [MS.PERSONAL.speed, MS.capMul()]; };
    const z = spd('zbyniu', true), un = spd('zbyniu', false), other = spd('RandomPlayer', true), adm = spd('BoyIsGamer', true), back = spd('zbyniu', true);
    E.markNickVerified(''); E.setProfile({ name: 'RandomPlayer' });
    return z[0] === 2 && z[1] === 2 && un[0] === 1 && other[0] === 1 && adm[0] === 1 && back[0] === 2 && MS.PERSONAL.speed === 1 && /ULTIMATE_SCALE = 8;/.test(AV) && /\* PERSONAL\.speed;/.test(PL);
})());
check('therian: only spikyvr owns the Therian skin and it is equipped once, but can be changed and put back at any time', (() => {
    const run = (name, fn) => { E.markNickVerified(''); E.setProfile({ name: name }); return fn(); };
    const sp = run('spikyvr', () => { E.SAVE.owned = E.SAVE.owned.filter(x => x !== 'skin:therian'); E.SAVE.equipped.skin = 'none'; E.refreshStaffItems(); return E.SAVE.owned.includes('skin:therian') && E.SAVE.equipped.skin === 'therian'; });
    const swap = (() => { E.SAVE.equipped.skin = 'albino'; E.refreshStaffItems(); const kept = E.SAVE.equipped.skin === 'albino'; E.SAVE.equipped.skin = 'therian'; E.refreshStaffItems(); return kept && E.SAVE.equipped.skin === 'therian'; })();
    const other = run('RandomPlayer', () => { E.SAVE.owned.push('skin:therian'); E.SAVE.equipped.skin = 'therian'; E.refreshStaffItems(); return !E.SAVE.owned.includes('skin:therian') && E.SAVE.equipped.skin === 'none'; });
    run('spikyvr', () => { E.SAVE.owned = E.SAVE.owned.filter(x => x !== 'skin:therian'); E.SAVE.equipped.skin = 'none'; });
    return sp && swap && other && C.isTherianName('SpikyVR') && !C.isTherianName('lincolnvr') && !C.isTherianName('');
})());
check('therian: the skin has bunny ears, a small bunny tail and the carrot, and the avatar builds them', /therian: \{[^}]*bunnyEars: true, bunnyTail: true, carrot: true/.test(fs.readFileSync(path.join(ROOT, 'core/cosmetics.js'), 'utf8')) && /function buildBunnyEars/.test(fs.readFileSync(path.join(ROOT, 'core/avatar.js'), 'utf8')) && /function buildCarrot/.test(fs.readFileSync(path.join(ROOT, 'core/avatar.js'), 'utf8')) && /k\.bunnyTail/.test(fs.readFileSync(path.join(ROOT, 'core/avatar.js'), 'utf8')));
check('cosmetics: Furasek has the cat mask and the fluffy tail (catMask and tail) and no other sold skin does', /furasek: \{[^}]*tail: true, catMask: true/.test(src) && !/(bubblegum|cottoncandy|honeyape|mintape|cadaver): \{[^}]*catMask/.test(src) && /k\.catMask && \(!look\.mask/.test(src));
}

// ---------- Pet Pack: kosmetyki Stworka w sklepie (CATALOG, SLOTS, petstore) ----------
{
    const PS = await import(url('core/petstore.js')), P = PL.PET, snap = JSON.stringify(E.SAVE), pk = { pethat: P.HATS, petneck: P.NECKS };
    check('pet pack: the catalog items match the PET lists in both slots', Object.keys(pk).every(slot => { const ids = E.CATALOG.filter(i => i.slot === slot).map(i => i.id); return ids.length === pk[slot].length && pk[slot].every(id => ids.includes(id)) && new Set(ids).size === ids.length; }));
    check('pet pack: "none" is free and first, the rest cost Bagabucks within the shop range', Object.keys(pk).every(slot => { const items = E.CATALOG.filter(i => i.slot === slot); return items[0].id === 'none' && items[0].price === 0 && items.slice(1).every(i => Number.isInteger(i.price) && i.price >= 200 && i.price <= 3500 && !i.locked); }));
    check('pet pack: names are unique, short and plain', (() => { const names = E.CATALOG.filter(i => pk[i.slot]).map(i => i.name); return names.length === 12 && new Set(names).size === 12 && names.every(n => /^[A-Za-z ]{3,16}$/.test(n)); })());
    check('pet pack: the shop has a tab for each slot and all tabs fit in one row', ['pethat', 'petneck'].every(id => E.SLOTS.some(s => s.id === id)) && 28 + E.SLOTS.length * Math.floor(970 / E.SLOTS.length) <= 1024 && Math.floor(970 / E.SLOTS.length) >= 80 && /Math\.floor\(970 \/ E\.SLOTS\.length\)/.test(fs.readFileSync(path.join(ROOT, 'core/ui.js'), 'utf8')));
    check('pet pack: a fresh save owns and wears "none" in both slots', (() => { E.SAVE.owned = ['skin:none']; E.SAVE.equipped = {}; E.SAVE.owned.push('pethat:none', 'petneck:none'); return PS.petWear().hat === 'none' && PS.petWear().neck === 'none'; })());
    check('pet pack: an item that is not bought is never worn (tampered save)', (() => { E.SAVE.equipped = { pethat: 'crown', petneck: 'cape' }; return PS.petWear().hat === 'none' && PS.petWear().neck === 'none'; })());
    check('pet pack: an unknown id in the save is never worn', (() => { E.SAVE.equipped = { pethat: 'hack', petneck: { x: 1 } }; E.SAVE.owned.push('pethat:hack'); return PS.petWear().hat === 'none' && PS.petWear().neck === 'none'; })());
    check('pet pack: buying takes the price, adds the item and points to the nest', (() => { E.SAVE.wallet = 2000; E.SAVE.owned = ['pethat:none', 'petneck:none']; E.SAVE.equipped = { pethat: 'none', petneck: 'none' }; globalThis.__toasts.length = 0; const it = E.findItem('pethat:party'), r = E.buyItem(it), r2 = E.buyItem(it); return r === 'ok' && r2 === 'owned' && E.SAVE.wallet === 2000 - 300 && E.isOwned(it) && globalThis.__toasts.some(t => /nest/.test(t)) && !globalThis.__toasts.some(t => /Gorilla Machine/.test(t)); })());
    check('pet pack: a poor player cannot buy', (() => { E.SAVE.wallet = 100; const r = E.buyItem(E.findItem('petneck:cape')); return r === 'poor' && E.SAVE.wallet === 100 && !E.isOwned(E.findItem('petneck:cape')); })());
    check('pet pack: wearing needs a pet and an owned item, the arrows cycle through owned ones only', (() => {
        E.SAVE.pet = null; const noPet = PS.cycleWear('hat', 1).ok;
        E.SAVE.pet = PL.hatch(Date.now(), 0, () => 0); E.SAVE.owned = ['pethat:none', 'petneck:none']; E.SAVE.equipped = { pethat: 'none', petneck: 'none' };
        const nothing = PS.cycleWear('hat', 1);   // tylko "none" w posiadaniu: nie ma czego przełączać
        E.SAVE.owned.push('pethat:party', 'pethat:crown');
        const a = PS.cycleWear('hat', 1), b = PS.cycleWear('hat', 1), c = PS.cycleWear('hat', 1), d = PS.cycleWear('hat', -1);
        return noPet === false && nothing.ok === false && a.id === 'party' && b.id === 'crown' && c.id === 'none' && d.id === 'crown' && E.SAVE.equipped.pethat === 'crown' && PS.cycleWear('wing', 1).ok === false;
    })());
    check('pet pack: the look sent to other players carries the worn item indices and nothing unowned', (() => { E.SAVE.owned = ['pethat:none', 'petneck:none', 'pethat:wizard']; E.SAVE.equipped = { pethat: 'wizard', petneck: 'cape' }; const l = PS.petLookNet(); return l.length === 6 && l[3] === P.HATS.indexOf('wizard') && l[4] === 0 && PL.cleanLook(l) !== null; })());
    check('pet pack: the care panel status shows what is worn and how many items are owned', (() => { E.SAVE.owned = ['pethat:none', 'petneck:none', 'petneck:bow', 'petneck:bell']; E.SAVE.equipped = { pethat: 'none', petneck: 'bell' }; const st = PS.petStatus(); return st.wear.neck === 'bell' && st.wearNames.neck === 'Bell collar' && st.wearCount.neck === 2 && st.wearCount.hat === 0 && st.wearNames.hat === 'No pet hat'; })());
    const mdl = fs.readFileSync(path.join(ROOT, 'core/petmodel.js'), 'utf8');
    check('pet pack: the model has a branch for every hat and every neck item', P.HATS.filter(x => x !== 'none').every(id => new RegExp("hatId === '" + id + "'").test(mdl)) && P.NECKS.filter(x => x !== 'none').every(id => new RegExp("neckId === '" + id + "'").test(mdl)));
    check('pet pack: the care panel lets you wear items and pet.js rebuilds the model when they change', /cycleWear\(kind, dir\)/.test(fs.readFileSync(path.join(ROOT, 'core/petnest.js'), 'utf8')) && /sig !== p\.sig/.test(fs.readFileSync(path.join(ROOT, 'core/pet.js'), 'utf8')) && /h: hatIndex\(st\.wear\.hat\)/.test(fs.readFileSync(path.join(ROOT, 'core/pet.js'), 'utf8')));
    for (const k of Object.keys(E.SAVE)) delete E.SAVE[k]; Object.assign(E.SAVE, JSON.parse(snap));   // przywraca zapis z początku bloku
}

done('logic');
