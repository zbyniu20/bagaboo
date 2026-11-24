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
    // ---------- wydajność i narzędzia: regulator rozdzielczości, typy, CI, przełącznik wersji three.js ----------
{
    const PF = await import(url('core/perflogic.js')), run = (dt, n, budget, st, max) => { for (let i = 0; i < n; i++) PF.govern(st, dt, budget, max); return st; };
    const slow = run(25, 400, 20, PF.newGovernor()), up = run(13, 6000, 20, { ...slow, avg: 13 }), cap = run(60, 4000, 20, PF.newGovernor(), 2), calm = run(10, 3000, 20, PF.newGovernor());
    check('perf: slow frames raise the level, long stable frames lower it again, never above the max and never below 0', slow.level >= 1 && slow.level <= PF.GOV.maxLevel && up.level === 0 && cap.level === 2 && calm.level === 0);
    check('perf: the level changes at most once per cooldown (no flicker of the resolution)', (() => { const st = PF.newGovernor(); let changes = 0, last = 0; for (let i = 0; i < 1500; i++) { const lv = PF.govern(st, 33, 20); if (lv !== last) { changes++; if (i < 100 * (changes - 1)) return false; last = lv; } } return changes <= PF.GOV.maxLevel; })());
    check('perf: odd frame times (tab switch, loading, NaN) are clamped and never drop the quality by themselves', PF.clampFrame(5000) === 120 && PF.clampFrame(-5) === 0 && PF.clampFrame(NaN) > 10 && PF.clampFrame(undefined) > 10 && PF.clampFrame(16) === 16 && (() => { const st = PF.newGovernor(); for (let i = 0; i < 40; i++) PF.govern(st, PF.clampFrame(i % 10 === 0 ? 4000 : 14), 20); return st.level === 0; })());
    check('perf: the desktop pixel ratio falls with the level, stays within 0.5 and the base, and survives bad input', [1, 1.5, 2].every(b => [0, 1, 2, 3].every((l, i, a) => PF.desktopRatio(b, l) <= b && PF.desktopRatio(b, l) >= 0.5 && (!i || PF.desktopRatio(b, l) <= PF.desktopRatio(b, a[i - 1])))) && PF.desktopRatio(2, 99) === PF.desktopRatio(2, 3) && PF.desktopRatio(2, -4) === 2 && PF.desktopRatio(1, NaN) === 1 && PF.desktopRatio(0.5, 3) === 0.5);
    const rd = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8'), html = rd('index.html'), ci = rd('.github/workflows/check.yml'), tsc = JSON.parse(rd('tests/tsconfig.json'));
    check('perf: the VR governor shares the pure logic and the desktop one runs only outside VR', /from '\.\/perflogic\.js'/.test(rd('core/xrperf.js')) && /export \{ GOV, govern \}/.test(rd('core/xrperf.js')) && /else updateDesktopPerf\(rawDt\)/.test(rd('main.js')) && /resetDesktopPerf\(\)/.test(rd('main.js')) && /if \(document\.hidden\) return;/.test(rd('core/desktopperf.js')));
        const rootPkg = JSON.parse(rd('package.json')), testPkg = JSON.parse(rd('tests/package.json')), vite = rd('vite.config.js'), main = rd('main.js'), pages = rd('.github/workflows/pages.yml');
    check('bundle: three, cannon-es and peerjs have the same version in the root package.json, tests/package.json and the CDN loader in index.html', ['three', 'cannon-es', 'peerjs'].every(n => rootPkg.dependencies[n] === testPkg.devDependencies[n]) && html.includes("'" + rootPkg.dependencies.three + "';") && html.includes('cannon-es@' + rootPkg.dependencies['cannon-es']) && html.includes('peerjs@' + rootPkg.dependencies.peerjs));
    check('bundle: the Vite build swaps the loader for vite-entry.js, defines the bundled flag, and main.js loads levels through import.meta.glob only when bundled (plain import() otherwise)', /bagabooHtml/.test(vite) && /__BAGABOO_BUNDLED__: true/.test(vite) && /order: 'pre'/.test(vite) && /typeof __BAGABOO_BUNDLED__ !== 'undefined' \? import\.meta\.glob\('\.\/levels\/\*\.js'\) : null/.test(main) && /\(GLOB && GLOB\[p\]\) \? GLOB\[p\]\(\) : import\(p\)/.test(main) && /loadModule\(cfg\.path\)/.test(main) && /window\.BAGABOO_DEBUG = \{ loadLevel: loadLevel, renderer: renderer, scene: scene \}/.test(main) && /window\.Peer = Peer/.test(rd('vite-entry.js')));
    check('bundle: the CI builds the bundle, and the Pages workflow deploys on pushes to main only (plus manual runs), runs the fast tests before publishing and never the smoke tests', /npm run build/.test(ci) && /push:\s*\n\s*branches: \[main\]/.test(pages) && /workflow_dispatch:/.test(pages) && !/pull_request/.test(pages.replace(/#.*$/gm, '')) && /cd tests && npm run fast/.test(pages) && pages.indexOf('npm run fast') < pages.indexOf('npm run build') && pages.indexOf('npm run build') < pages.indexOf('deploy-pages') && !/smoke/.test(pages.replace(/#.*$/gm, '')));
    check('types: tsconfig checks only existing pure modules (no THREE, DOM or network code), and `npm run types` is wired', tsc.files.length >= 10 && tsc.files.every(f => fs.existsSync(path.join(ROOT, 'tests', f)) && !/^\s*import .*['"]three|from '\.\/engine\.js'/m.test(rd(f.replace('../', '')))) && /"types": "tsc -p tsconfig\.json"/.test(rd('tests/package.json')));
    check('ci: the workflow runs the fast tests and the type check on pull requests and main, and never the browser smoke tests', /npm run fast/.test(ci) && /npm run types/.test(ci) && /pull_request/.test(ci) && !/smoke/.test(ci.replace(/#.*$/gm, '')));
    check('three.js: the default version stays 0.187.0 and ?three= accepts only version numbers (no other hosts or paths)', /TV = \/\^0\\\.\\d\{3\}\\\.\\d\{1,2\}\$\/\.test\(tq \|\| ''\) \? tq : '0\.187\.0'/.test(html) && (() => { const re = /^0\.\d{3}\.\d{1,2}$/; return re.test('0.170.0') && re.test('0.160.0') && ['0.170', '1.170.0', '0.170.0/../x', '0.170.0\n', 'evil.com/x', '../0.160.0', '0.17.0', ''].every(v => !re.test(v)); })());
}
check('ultimate: zbyniu runs 2x faster, but only on the verified account, and the avatar is half of the previous size (4)', await (async () => {
    const MS = await import(url('core/modstate.js')), AV = fs.readFileSync(path.join(ROOT, 'core/avatar.js'), 'utf8'), PL = fs.readFileSync(path.join(ROOT, 'core/player.js'), 'utf8');
    const spd = (name, verified) => { E.markNickVerified(verified ? name : ''); E.setProfile({ name: name }); return [MS.PERSONAL.speed, MS.capMul()]; };
    const z = spd('zbyniu', true), un = spd('zbyniu', false), other = spd('RandomPlayer', true), adm = spd('BoyIsGamer', true), back = spd('zbyniu', true);
    E.markNickVerified(''); E.setProfile({ name: 'RandomPlayer' });
    return z[0] === 2 && z[1] === 2 && un[0] === 1 && other[0] === 1 && adm[0] === 1 && back[0] === 2 && MS.PERSONAL.speed === 1 && /ULTIMATE_SCALE = 4;/.test(AV) && /\* PERSONAL\.speed;/.test(PL);
})());
check('noob: the host (not a client) decides when the ultimate admin touched someone, from the verified nick, with a cooldown, and the victim gets the NOOB jumpscare', (() => {
    const AUD = fs.readFileSync(path.join(ROOT, 'core/audio.js'), 'utf8'), KIT = fs.readFileSync(path.join(ROOT, 'core/levelkit.js'), 'utf8'), MAIN = fs.readFileSync(path.join(ROOT, 'main.js'), 'utf8');
    return /function noobCheck\(\)/.test(net) && /uid === myPeerId \? \(me && me\.nick\) : verifiedNickOf\(uid\)/.test(net) && /isUltimateName\(nick\)/.test(net) && /noobCd\[vid\] = now \+ NOOB_COOLDOWN/.test(net) && /gc\.send\(\{ type: 'noob' \}\)/.test(net) && /data\.type === 'noob'/.test(net) && /noobCheck\(\);/.test(net)
        && /createJumpscare\(\{ noob: true \}\)/.test(MAIN) && /NETM\.onNoob\(/.test(MAIN) && /function noobVoice/.test(AUD) && /gooby === 'noob'/.test(AUD) && /fillText\('NOOB'/.test(KIT) && /SFX\.scare\(noob \? 'noob' : gooby[,)]/.test(KIT);
})());
check('therian: only spikyvr owns the Therian skin and it is equipped once, but can be changed and put back at any time', (() => {
    const run = (name, fn) => { E.markNickVerified(''); E.setProfile({ name: name }); return fn(); };
    const sp = run('spikyvr', () => { E.SAVE.owned = E.SAVE.owned.filter(x => x !== 'skin:therian'); E.SAVE.equipped.skin = 'albino'; delete E.SAVE.therianSet; E.refreshStaffItems(); return E.SAVE.owned.includes('skin:therian') && E.SAVE.equipped.skin === 'therian'; });   // stary zapis z inną skórką: Therian zakłada się od razu
    const none = run('spikyvr', () => { E.SAVE.equipped.skin = 'none'; E.refreshStaffItems(); const keeps = E.SAVE.equipped.skin === 'none'; E.SAVE.equipped.skin = 'therian'; return keeps; });   // wybór innej skórki (nawet własnego koloru) zostaje
    const swap = (() => { E.SAVE.equipped.skin = 'albino'; E.refreshStaffItems(); const kept = E.SAVE.equipped.skin === 'albino'; E.SAVE.equipped.skin = 'therian'; E.refreshStaffItems(); return kept && E.SAVE.equipped.skin === 'therian'; })();
    const other = run('RandomPlayer', () => { E.SAVE.owned.push('skin:therian'); E.SAVE.equipped.skin = 'therian'; E.refreshStaffItems(); return !E.SAVE.owned.includes('skin:therian') && E.SAVE.equipped.skin === 'none'; });
    run('spikyvr', () => { E.SAVE.owned = E.SAVE.owned.filter(x => x !== 'skin:therian'); E.SAVE.equipped.skin = 'none'; });
    return sp && none && swap && other && C.isTherianName('SpikyVR') && !C.isTherianName('lincolnvr') && !C.isTherianName('');
})());
check('therian: the skin has bunny ears, a small bunny tail and the carrot, and the avatar builds them', /therian: \{[^}]*bunnyEars: true, bunnyTail: true, carrot: true/.test(fs.readFileSync(path.join(ROOT, 'core/cosmetics.js'), 'utf8')) && /function buildBunnyEars/.test(fs.readFileSync(path.join(ROOT, 'core/avatar.js'), 'utf8')) && /function buildCarrot/.test(fs.readFileSync(path.join(ROOT, 'core/avatar.js'), 'utf8')) && /k\.bunnyTail/.test(fs.readFileSync(path.join(ROOT, 'core/avatar.js'), 'utf8')));
const NEW2 = { skin: ['demonape', 'skeletape', 'plagueape'], hat: ['bolts', 'spiderhat', 'crowhat', 'wormhead', 'candlecrown', 'eyestalks', 'knifehalo'], mask: ['screamer', 'zipperface', 'grin', 'burned'], glasses: ['stitchedeyes', 'manyeyes', 'bloodshot'], sleeve: ['rotting'], gloves: ['rotten'] };
check('cosmetics: the second pack of very scary items is in the shop, buyable and priced sanely', Object.entries(NEW2).every(([slot, ids]) => ids.every(id => { const it = E.CATALOG.find(i => i.slot === slot && i.id === id); return it && !it.locked && !it.season && it.price >= 2000 && it.price <= 5500 && it.name.length <= 24; })));
const NEW3 = { skin: ['voidape', 'rustape', 'frozenape'], hat: ['noosehat', 'rodhead', 'maggothat', 'ribcrown', 'bleedhalo', 'reaperhood'], mask: ['pigmask', 'melted', 'crackeddoll'], glasses: ['wormeyes', 'nailedeyes', 'cyclops'], sleeve: ['barbed'], gloves: ['veined'] };
check('cosmetics: the third pack of very scary items is in the shop, buyable and priced sanely', Object.entries(NEW3).every(([slot, ids]) => ids.every(id => { const it = E.CATALOG.find(i => i.slot === slot && i.id === id); return it && !it.locked && !it.season && it.price >= 2000 && it.price <= 6000 && it.name.length <= 24; })));
check('cosmetics: no hat, mask or glasses model scales the whole group (g.add(...).scale bug)', !/g\.add\([^;]*\)\)\.scale\./.test(fs.readFileSync(path.join(ROOT, 'core/cosmetics.js'), 'utf8')));
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

// ---------- grafika: wypalone AO bloków i nowe materiały (core/gfxlogic.js, core/engine.js, core/textures.js, levels, core/mannequin.js, core/levelkit.js) ----------
{
    const G = await import(url('core/gfxlogic.js'));
    check('gfx: a wall standing on the floor gets base AO (and top AO only when it is tall enough to reach a ceiling)', (() => { const w = G.aoFor(0, 1.8, 0, 20, 3.6, 1), low = G.aoFor(0, 1, 0, 6, 2, 0.4); return w && w.b === 0.5 && w.t === 0.35 && w.f === 0 && w.c === 0 && low && low.b === 0.5 && low.t === 0; })());
    check('gfx: a big floor slab gets edge AO on its top, a big ceiling slab on its underside, and nothing else', (() => { const f = G.aoFor(0, -0.5, 0, 30, 1, 30), f2 = G.aoFor(0, -2.5, 0, 40, 5, 40), c = G.aoFor(0, 4.1, 0, 30, 1, 30); return f && f.f === 0.42 && f.b === 0 && f2 && f2.f === 0.42 && c && c.c === 0.4 && c.f === 0; })());
    check('gfx: small blocks, platforms, steps and blocks floating high get no AO, and opts.noAO switches it off', G.aoFor(0, 0.45, 0, 1.2, 0.9, 2.2) === null && G.aoFor(0, 5, 0, 4, 0.4, 4) === null && G.aoFor(0, 9, 0, 1, 2, 1) === null && G.aoFor(0, 1.8, 0, 20, 3.6, 1, { noAO: true }) === null && G.aoFor(0, 12, 0, 20, 3, 1) === null);
    check('gfx: the AO decision never throws and gives nothing for bad sizes', [[NaN, 0, 0, 1, 1, 1], [0, 0, 0, 0, 2, 1], [0, 0, 0, 1, -2, 1], [0, undefined, 0, 1, 1, 1], ['x', 0, 0, 1, 1, 1]].every(a => G.aoFor(...a) === null));
    const ENG = fs.readFileSync(path.join(ROOT, 'core/engine.js'), 'utf8'), TXT = fs.readFileSync(path.join(ROOT, 'core/textures.js'), 'utf8'), MAN = fs.readFileSync(path.join(ROOT, 'core/mannequin.js'), 'utf8'), KIT = fs.readFileSync(path.join(ROOT, 'core/levelkit.js'), 'utf8');
    check('gfx: the block shader applies AO from its uniform in the same program as the edges (no extra compile, no extra mesh), and the wet/rust/eye textures are lazy', /uniform vec4 uAO/.test(ENG) && /diffuseColor\.rgb \*= aoF/.test(ENG) && /customProgramCacheKey = \(\) => 'crispEdge'/.test(ENG) && /aoFor\(x, y, z, w, h, d, opts\)/.test(ENG) && /get floorWet\(\)/.test(ENG) && /get wallRust\(\)/.test(ENG) && /get eyeBloodshot\(\)/.test(ENG) && /createFloorWetRoughTexture = cached/.test(TXT) && /createWallRustTexture = cached/.test(TXT) && /createBloodshotEyeTexture = cached/.test(TXT));
    const lv = (f) => fs.readFileSync(path.join(ROOT, 'levels', f), 'utf8');
    check('gfx: wet floors in the hospital, cemetery, Silence, the well, Room 000, the laundry and the maze, rusty walls in the laundry', ['hospital.js', 'cemetery.js', 'silence.js', 'well.js', 'room000.js', 'laundry.js', 'maze.js'].every(f => /rough: tex\.floorWet/.test(lv(f))) && /tex\.wallRust/.test(lv('laundry.js')));
    check('gfx: monsters get bloodshot eyes with veins and a slit pupil, wet teeth, gums and strings of saliva, also in the jumpscare mouth', /map: tex\.eyeBloodshot/.test(MAN) && /clearcoat: 1, clearcoatRoughness: 0\.12/.test(MAN) && /const gum = /.test(MAN) && /spit/.test(MAN) && /userData\.strands/.test(KIT) && /tex\.eyeBloodshot/.test(KIT));
}

// ---------- awatar: futro warstwowe, rany, mokre futro, ślina, powieki (core/avatarfxlogic.js) ----------
{
    const A = await import(url('core/avatarfxlogic.js'));
    check('avatarfx: shell count depends on quality (low none, medium 3, high 4)', A.shellCount('low') === 0 && A.shellCount('medium') === 3 && A.shellCount('high') === 4);
    check('avatarfx: shells are drawn only up close, fewer and nearer in VR, never when none were built', A.shellsVisible(3, 2, false) === 3 && A.shellsVisible(4, 2, true) === A.FUR.XR_MAX && A.shellsVisible(3, 6, false) === 0 && A.shellsVisible(3, 4, true) === 0 && A.shellsVisible(0, 1, false) === 0 && A.shellsVisible(3, NaN, false) === 0);
    check('avatarfx: shell offsets grow, the alpha cut grows and shade brightens with the layer', [0, 1, 2].every(i => A.shellOffset(i + 1, 3) > A.shellOffset(i, 3) && A.shellCut(i + 1, 3) > A.shellCut(i, 3) && A.shellShade(i + 1, 3) > A.shellShade(i, 3)) && A.shellCut(2, 3) < 1);
    check('avatarfx: the laundry is wet, the lobby is dry and clean, fur only gets darker and less rough when wet', A.grimeFor('laundry').wet === 1 && A.grimeFor('lobby').wet === 0 && A.grimeFor('lobby').dirt === 0 && A.mixFur(0.5, A.grimeFor('laundry')) < 0.5 && A.mixFur(0.5, A.grimeFor('lobby')) === 0.5 && A.furRoughness(0.9, A.grimeFor('laundry')) < 0.9 && A.furRoughness(0.4, { wet: 1, dirt: 0 }) >= 0.35);
    check('avatarfx: wounds are deterministic, stay on the torso and are capped', (() => { const a = A.woundSpot(7), b = A.woundSpot(7); let l = []; for (let i = 0; i < 20; i++) l = A.addWound(l, i); return a.x === b.x && Math.abs(a.x) <= 0.14 && a.y >= -0.15 && a.y <= 0.15 && l.length === A.WOUND_MAX; })());
    check('avatarfx: drool starts at a roar and is bounded; the blink lid is clamped for any gap', A.droolLevel(0.3) === 0 && A.droolLevel(2) === 1 && A.droolLevel(0.7) > 0 && [0.2, 0.13, 0.065, 0, -1, 99].every(b => { const v = A.lidFactor(b, 0.025); return v >= 0.08 && v <= 1; }) && A.lidFactor(0, 0) === 1);
    check('avatarfx: muscle tremor only during a loud roar and stays small', A.tremor(0.3, 1) === 0 && Math.abs(A.tremor(1, 0.03)) <= 0.012 && Array.from({ length: 50 }, (_, i) => Math.abs(A.tremor(1, i * 0.01))).some(v => v > 0.005));
    const AV = fs.readFileSync(path.join(ROOT, 'core/avatar.js'), 'utf8'), NW = fs.readFileSync(path.join(ROOT, 'core/network.js'), 'utf8');
    check('avatarfx: avatar.js builds shell fur on torso and arms and uses SSS on the skin, face and hands', /addFurShells\(g\.userData\.chest/.test(AV) && /addFurShells\(m, look\)/.test(AV) && (AV.match(/sssify\(/g) || []).length >= 3);
    check('avatarfx: network.js drives fx per frame, wounds only with gore on and cleared with the body, grime by level', /updateAvatarFx\(remoteAvatars\[id\]/.test(NW) && /SETTINGS\.gore && remoteAvatars\[id\]\) addWound/.test(NW) && (NW.match(/clearWounds\(p\)/g) || []).length >= 2 && /applyGrime\(p, L\.levelId\)/.test(NW));
}
// ---------- akustyka: pogłos z geometrii i okluzja (core/acousticlogic.js) ----------
{
    const C = await import(url('core/acousticlogic.js'));
    const box = (x0, y0, z0, x1, y1, z1) => ({ min: { x: x0, y: y0, z: z0 }, max: { x: x1, y: y1, z: z1 } });
    const room = (r) => [box(-r - 0.2, 0, -r, -r, 3, r), box(r, 0, -r, r + 0.2, 3, r), box(-r, 0, -r - 0.2, r, 3, -r), box(-r, 0, r, r, 3, r + 0.2), box(-r, 2.9, -r, r, 3.1, r)];
    const O = { x: 0, y: 1.5, z: 0 };
    check('acoustic: a ray hits a box at the right distance and misses otherwise', C.rayBox(O, { x: 1, y: 0, z: 0 }, box(4, 0, -1, 5, 3, 1), 16) === 4 && C.rayBox(O, { x: 1, y: 0, z: 0 }, box(4, 0, 3, 5, 3, 4), 16) === Infinity && C.rayBox(O, { x: 1, y: 0, z: 0 }, box(40, 0, -1, 41, 3, 1), 16) === Infinity);
    check('acoustic: a small closed room gives a short quiet reverb, a hall a longer and louder one, open space the shortest', (() => { const s = C.roomFromRays(C.freeDistances(O, room(3))), h = C.roomFromRays(C.freeDistances(O, room(12))), o = C.roomFromRays(C.freeDistances(O, [])); return !s.open && !h.open && o.open && h.sec > s.sec && h.wet > s.wet && o.sec < s.sec + 0.01 && o.sec >= C.AC.SEC_MIN && h.sec <= C.AC.SEC_MAX && h.wet <= C.AC.WET_MAX; })());
    check('acoustic: blending keeps the level design in the mix and smoothing converges without overshoot', (() => { const m = C.blendRoom({ sec: 1, wet: 0.1 }, { sec: 3, wet: 0.3 }); let c = { sec: 1, wet: 0.1 }; for (let i = 0; i < 60; i++) c = C.smoothRoom(c, m, 0.1); return m.sec === 2 && Math.abs(m.wet - 0.2) < 1e-9 && Math.abs(c.sec - 2) < 0.01 && c.sec <= 2.0000001; })());
    check('acoustic: walls between listener and source are counted, floors and low obstacles are ignored, the source in the same room is clear', (() => { const wall = [box(4, 0, -5, 4.3, 3, 5)], two = wall.concat([box(8, 0, -5, 8.3, 3, 5)]), floor = [box(-50, -1, -50, 50, 0.1, 50)], low = [box(4, 0, -5, 4.3, 0.6, 5)]; return C.blockCount(O, { x: 10, y: 1.5, z: 0 }, wall) === 1 && C.blockCount(O, { x: 10, y: 1.5, z: 0 }, two) === 2 && C.blockCount(O, { x: 3, y: 1.5, z: 0 }, wall) === 0 && C.blockCount(O, { x: 10, y: 1.5, z: 0 }, floor) === 0 && C.blockCount(O, { x: 10, y: 1.5, z: 0 }, low) === 0 && C.blockCount(O, O, wall) === 0; })());
    check('acoustic: occlusion grows with every wall but stays below 1, the filter only closes and the gain only drops', C.occlusionFor(0) === 0 && C.occlusionFor(1) > 0 && C.occlusionFor(2) > C.occlusionFor(1) && C.occlusionFor(99) <= 0.9 && C.occludedFilter(8000, 0) === 8000 && C.occludedFilter(8000, 0.9) < 8000 && C.occludedFilter(400, 0.9) >= 350 && C.occludedGain(0) === 1 && C.occludedGain(0.9) < 1 && C.occludedGain(0.9) > 0);
    check('acoustic: sound outputs apply occlusion and the reverb is tuned from geometry every 0.4 s (and the level start measures at once)', (() => { const A = fs.readFileSync(path.join(ROOT, 'core/audio.js'), 'utf8'), G = fs.readFileSync(path.join(ROOT, 'core/acoustics.js'), 'utf8'), M = fs.readFileSync(path.join(ROOT, 'main.js'), 'utf8'); return /occFn\(pos\)/.test(A) && /occludedFilter\(/.test(A) && /export function tuneRoom/.test(A) && /setOcclusion\(occludeAt\)/.test(G) && /acc < 0\.4/.test(G) && /updateAcoustics\(dt\)/.test(M); })());
}
// ---------- obserwator (core/spectatelogic.js) ----------
{
    const P = await import(url('core/spectatelogic.js'));
    check('spectate: forward direction from a quaternion (identity looks along -Z, a 90 degree turn looks along -X) and bad input is safe', (() => { const a = P.forwardFromQuat([0, 0, 0, 1]), b = P.forwardFromQuat([0, Math.SQRT1_2, 0, Math.SQRT1_2]), c = P.forwardFromQuat(null), d = P.forwardFromQuat([NaN, 0, 0, 1]); return Math.abs(a.fx) < 1e-9 && Math.abs(a.fz + 1) < 1e-9 && Math.abs(b.fx + 1) < 1e-9 && Math.abs(b.fz) < 1e-9 && c.fz === -1 && d.fz === -1; })());
    check('spectate: the camera stands behind the target and a little above', (() => { const s = P.cameraSpot({ x: 5, y: 1.6, z: 5, fx: 0, fz: -1 }); return s.x === 5 && Math.abs(s.z - (5 + P.CAM.dist)) < 1e-9 && s.y > 1.6; })());
    check('spectate: a wall between the target and the camera pulls the camera in, floors and low blocks do not', (() => { const t = { x: 0, y: 1.6, z: 0 }, w = { x: 0, y: 2, z: 2.4 }, wall = [{ min: { x: -3, y: 0, z: 1.2 }, max: { x: 3, y: 3, z: 1.5 } }], floor = [{ min: { x: -9, y: -1, z: -9 }, max: { x: 9, y: 0.2, z: 9 } }], c = P.clipSpot(t, w, wall); return c.z < 1.2 && c.z >= 0.5 && P.clipSpot(t, w, floor).z === 2.4 && P.clipSpot(t, w, []).z === 2.4; })());
    check('spectate: following is smooth, converges and teleports across big jumps', (() => { let c = { x: 0, y: 0, z: 0 }; const w = { x: 3, y: 0, z: 0 }; const one = P.followStep(c, w, 0.016); for (let i = 0; i < 200; i++) c = P.followStep(c, w, 0.016); const far = P.followStep({ x: 0, y: 0, z: 0 }, { x: 99, y: 0, z: 0 }, 0.016); return one.x > 0 && one.x < 0.5 && Math.abs(c.x - 3) < 0.01 && c.x <= 3 && far.x === 99 && P.followStep(null, w, 0.01).x === 3; })());
    check('spectate: cycling wraps around both ways, falls back to the first target and is null for nobody', P.cycleTarget(['a', 'b', 'c'], 'c', 1) === 'a' && P.cycleTarget(['a', 'b', 'c'], 'a', -1) === 'c' && P.cycleTarget(['a', 'b'], 'zz', 0) === 'a' && P.cycleTarget(['a', 'b'], 'b', 0) === 'b' && P.cycleTarget([], 'a', 1) === null);
    check('spectate: the HUD line is short and shows the position only with more than one target', P.hudLine('Luna', 1, 0) === 'Watching: Luna' && /\(2\/3\)/.test(P.hudLine('Luna', 3, 1)) && P.hudLine('x'.repeat(40), 1, 0).length < 40);
    const PL = fs.readFileSync(path.join(ROOT, 'core/player.js'), 'utf8'), NW2 = fs.readFileSync(path.join(ROOT, 'core/network.js'), 'utf8'), MN = fs.readFileSync(path.join(ROOT, 'levels/monster.js'), 'utf8'), MJ = fs.readFileSync(path.join(ROOT, 'main.js'), 'utf8');
    check('spectate: the player follows SPEC, the trigger switches targets, hands do not anchor, others do not see a spectator, monster mode starts and stops it', /if \(SPEC\.on\) \{ bp\.x = SPEC\.x/.test(PL) && /if \(SPEC\.on\) \{ if \(SPEC\.next\)/.test(PL) && /!SPEC\.on\) \{\s*clampHand/.test(PL) && /sp: SPEC\.on \? 1 : 0/.test(NW2) && /!st\.sp && /.test(NW2) && /startSpectate\(specCandidates\)/.test(MN) && /stopSpectate\(\)/.test(MN) && /stopSpectate\(false\)/.test(MN) && /updateSpectate\(dt\); updatePlayer/.test(MJ));
}
// ---------- wypalane oświetlenie i paleta poziomów (core/bakelogic.js, core/artlogic.js) ----------
{
    const B = await import(url('core/bakelogic.js')), A = await import(url('core/artlogic.js'));
    const box = (x0, y0, z0, x1, y1, z1) => ({ min: { x: x0, y: y0, z: z0 }, max: { x: x1, y: y1, z: z1 } });
    check('bake: segment counts follow the 1 m cell, stay in [1, max] and the vertex count matches a subdivided box', B.segCount(0.3) === 1 && B.segCount(5) === 5 && B.segCount(999) === B.BAKE.maxSeg && B.boxVerts(2, 2, 2) === 2 * (3 * 3 * 3));
    check('bake: a huge level gets a coarser cell so it stays within the vertex budget', (() => { const dims = Array.from({ length: 800 }, () => [10, 3, 10]); const c = B.cellFor(dims, 30000); return B.cellFor([[2, 2, 2]]) === B.BAKE.cell && c > B.BAKE.cell && dims.reduce((n, d) => n + B.boxVerts(d[0], d[1], d[2], c), 0) <= 30000; })());
    check('bake: the falloff drops with distance and vanishes at the light range', B.falloff(1, 10, 2) > B.falloff(3, 10, 2) && B.falloff(10, 10, 2) === 0 && B.falloff(20, 10, 2) === 0 && B.falloff(5, 0, 2) > 0);
    const lamp = { x: 0, y: 3, z: 0, r: 10, g: 10, b: 10, dist: 14, decay: 1.6 };
    const light = B.prepareLights([lamp], [])[0], up = { x: 0, y: 1, z: 0 }, down = { x: 0, y: -1, z: 0 };
    check('bake: a floor facing the lamp is lit, nearer is brighter, a surface facing away gets almost nothing, beyond the range nothing', (() => { const near = B.bakeVertex({ x: 0, y: 0, z: 0 }, up, [light], null), far = B.bakeVertex({ x: 9, y: 0, z: 0 }, up, [light], null), back = B.bakeVertex({ x: 0, y: 0, z: 0 }, down, [light], null), out = B.bakeVertex({ x: 30, y: 0, z: 0 }, up, [light], null); return near[0] > far[0] && far[0] > 0 && back[0] < near[0] * 0.5 && out[0] === 0 && near[0] <= B.BAKE.cap; })());
    check('bake: a wall between the lamp and the point leaves only the soft leak, a low obstacle and the own box do not shadow', (() => { const wall = box(2, 0, -5, 2.3, 4, 5), l2 = B.prepareLights([lamp], [wall])[0], p = { x: 5, y: 1, z: 0 }, n = { x: -1, y: 0, z: 0 }, lit = B.bakeVertex(p, n, [light], null), sh = B.bakeVertex(p, n, [l2], null), low = B.prepareLights([lamp], [box(2, 0, -5, 2.3, 0.2, 5)])[0], self = B.bakeVertex(p, n, [l2], wall); return sh[0] < lit[0] * 0.5 && sh[0] > 0 && B.bakeVertex(p, n, [low], null)[0] === lit[0] && self[0] === lit[0]; })());
    check('bake: colored lights give colored light and the result is always finite and capped', (() => { const red = B.prepareLights([{ x: 0, y: 2, z: 0, r: 50, g: 0, b: 0, dist: 0, decay: 2 }], [])[0], c = B.bakeVertex({ x: 0, y: 0, z: 0 }, up, [red], null); return c[0] > 0 && c[1] === 0 && c[2] === 0 && c.every(v => isFinite(v) && v <= B.BAKE.cap) && B.bakeVertex({ x: 0, y: 2, z: 0 }, up, [red], null).every(v => isFinite(v)); })());
    const R2 = await import(url('core/registry.js')), ids = R2.LEVEL_DEFS.map(d => d.id);
    check('art: every level in the registry has a palette family that exists (new levels must be added to artlogic.js)', ids.every(i => A.knownLevels().includes(i) && A.FAMILIES[A.familyName(i)]), ids.filter(i => !A.knownLevels().includes(i)));
    check('art: variants inherit from the base level, unknown ids fall back to neutral', A.familyName('maze_7') === A.familyName('maze') && A.familyName('maze:3') === 'industrial' && A.familyName('zzz') === 'neutral' && A.familyName(undefined) === 'neutral');
    check('art: grading keeps brightness, pulls toward the family tint, never throws on bad input and leaves arcade almost untouched', (() => { const lum = (h) => 0.2126 * (h >> 16 & 255) + 0.7152 * (h >> 8 & 255) + 0.0722 * (h & 255), c = 0x8a6a4a, g = A.gradeColor(c, A.FAMILIES.clinical), a = A.gradeColor(c, A.FAMILIES.arcade); return Math.abs(lum(g) - lum(c)) < 12 && (g >> 8 & 255) > (c >> 8 & 255) && Math.abs(lum(a) - lum(c)) < 6 && Math.abs((a >> 16 & 255) - (c >> 16 & 255)) < 14 && A.gradeColor('x', A.FAMILIES.crypt) === 'x' && A.gradeColor(NaN, A.FAMILIES.crypt) !== A.gradeColor(NaN, A.FAMILIES.crypt) && A.gradeColor(c, null) === c && A.gradeColor(0xffffff, A.FAMILIES.clinical) <= 0xffffff && A.gradeColor(0, A.FAMILIES.hotel) >= 0; })());
    check('art: mixing colors is exact at the ends and stays a valid color', A.mixHex(0x102030, 0xf0e0d0, 0) === 0x102030 && A.mixHex(0x102030, 0xf0e0d0, 1) === 0xf0e0d0 && A.mixHex(0x000000, 0xffffff, 0.5) === 0x808080 && A.mixHex(0x102030, 0xf0e0d0, 9) === 0xf0e0d0);
    const EN = fs.readFileSync(path.join(ROOT, 'core/engine.js'), 'utf8'), MJ2 = fs.readFileSync(path.join(ROOT, 'main.js'), 'utf8'), LB = fs.readFileSync(path.join(ROOT, 'core/lightbake.js'), 'utf8');
    check('bake: blocks always carry an aBake attribute (zeros) so unbaked ones never read stale defaults, the shader adds baked light times albedo, the palette grades block colors', /geo\.setAttribute\('aBake'/.test(EN) && /attribute vec3 aBake/.test(EN) && /totalEmissiveRadiance \+= vBake \* diffuseColor\.rgb/.test(EN) && /gradeColor\(color, familyFor\(L\.levelId\)\)/.test(EN) && /bakeList: \[\]/.test(EN) && /'bakeList'\]\) L\[k\]\.length = 0/.test(EN));
    check('bake: the level loader applies the palette and bakes BEFORE the light pool hides lights, and ?bake=0 switches it off', /applyArt\(L\.levelId\);[\s\S]*bakeLevel\(\);[\s\S]*registerLevelLights\(L\.root\)/.test(MJ2) && /bake=0/.test(LB) && /userData\.noBake/.test(LB));
}
// ---------- modele potworów z plików GLB (core/glblogic.js) ----------
{
    const G = await import(url('core/glblogic.js'));
    check('glb: clips are picked by role from names in any case, with sensible fallbacks, and null for a model without animations', G.pickClip(['Armature|Idle', 'Armature|Walk', 'Armature|Run'], 'run') === 'Armature|Run' && G.pickClip(['IDLE', 'WALK'], 'run') === 'WALK' && G.pickClip(['Walk_Cycle'], 'idle') === 'Walk_Cycle' && G.pickClip(['Bite'], 'attack') === 'Bite' && G.pickClip(['Dance'], 'walk') === 'Dance' && G.pickClip([], 'walk') === null && G.pickClip(null, 'walk') === null);
    check('glb: the motion role follows the speed (still, creeping, running) and a chase always runs', G.stateRole(0, false) === 'idle' && G.stateRole(1.5, false) === 'walk' && G.stateRole(4.2, false) === 'run' && G.stateRole(1.5, true) === 'run' && G.stateRole(NaN, true) === 'idle');
    check('glb: the scale fits the target height and ignores broken sizes', Math.abs(G.fitScale(1.15, 2.3) - 2) < 1e-9 && G.fitScale(0, 2.3) === 1 && G.fitScale(NaN, 2.3) === 1 && G.fitScale(1, -1) === 1 && G.fitScale(1e-9, 2.3) === 1 && G.fitScale(0.02, 2.3) === 100);
    check('glb: the budget limits file size and triangles, addresses cover the repo and the Vite bundle', G.withinBudget(1000, 1000) && !G.withinBudget(G.MAX_BYTES + 1, 10) && !G.withinBudget(10, G.MAX_TRIS + 1) && G.candidateUrls('monster.glb')[0] === 'assets/monsters/monster.glb' && G.candidateUrls('monster.glb')[1] === 'monsters/monster.glb' && Object.values(G.MONSTERS).every(c => c.height > 0.5 && c.height < 4 && /\.glb$/.test(c.file)) && G.pickClip(['Armature|Idle', 'Jump_Idle'], 'idle') === 'Armature|Idle' && G.BOT_KINDS.every(k => G.MONSTERS[k]));
    {   // pliki modeli i ich użycie w poziomach
        const dir = path.join(ROOT, 'assets/monsters'), have = fs.existsSync(dir) ? fs.readdirSync(dir).filter(f => f.endsWith('.glb')) : [];
        check('glb: every monster in the table has its .glb file in assets/monsters, within the size budget', Object.values(G.MONSTERS).every(c => have.includes(c.file) && fs.statSync(path.join(dir, c.file)).size <= G.MAX_BYTES), Object.values(G.MONSTERS).filter(c => !have.includes(c.file)).map(c => c.file));
        const used = new Set(); for (const f of fs.readdirSync(path.join(ROOT, 'levels'))) { const t = fs.readFileSync(path.join(ROOT, 'levels', f), 'utf8'); for (const m of t.matchAll(/swap(?:Model|Root)\([\w.]+, (?:'(\w+)'|big \? '(\w+)' : '(\w+)')/g)) for (const k of m.slice(1)) if (k) used.add(k); }
        check('glb: every monster kind used by a level (swapModel) exists in the table, and the levels use at least 8 kinds of swaps', [...used].every(k => G.MONSTERS[k]) && used.size >= 10, [...used]);
        const py = fs.readFileSync(path.join(ROOT, 'tools/blender/monsters.py'), 'utf8'), recipes = (/RECIPES = \{[^\n]*\(([^)]*)\)\}/.exec(py) || [, ''])[1].match(/'(\w+)'/g) || [];
        check('glb: every Blender recipe has a table entry and a file (so the models can be rebuilt from tools/blender/monsters.py)', recipes.length >= 10 && recipes.every(r => G.MONSTERS[r.replace(/'/g, '')]), recipes);
    }
    const MN2 = fs.readFileSync(path.join(ROOT, 'levels/monster.js'), 'utf8'), VC = fs.readFileSync(path.join(ROOT, 'vite.config.js'), 'utf8');
    check('glb: Become the Monster loads the model asynchronously (a level change during loading disposes it), animates it in play and disposes it on exit; Vite copies assets', /loadGlbMonster\(kind\)/.test(MN2) && /BOT_KINDS/.test(MN2) && /if \(S !== lvl\) \{ g\.dispose\(\)/.test(MN2) && /S\.glb\.update\(dt, b\.speed, true\)/.test(MN2) && /S\.glb\.dispose\(\)/.test(MN2) && /publicDir: 'assets'/.test(VC));
}
// ---------- lustro i wylogowanie w grze ----------
{
    const LD = fs.readFileSync(path.join(ROOT, 'levels/lobby-door.js'), 'utf8'), VM = fs.readFileSync(path.join(ROOT, 'core/vrmenu.js'), 'utf8'), PS = fs.readFileSync(path.join(ROOT, 'core/pause.js'), 'utf8'), MJ3 = fs.readFileSync(path.join(ROOT, 'main.js'), 'utf8');
    check('mirror: the reflection camera of the mirror sees the mirror layer (three.js r16x+ Reflector has no mirror.camera, it clones the render camera)', /mirror\.getReflectionCamera/.test(LD) && /rc\.layers\.enable\(MIRROR_LAYER\)/.test(LD));
    check('account: the VR menu can log out and pick guest play without the start page, the pause menu logs out after a confirming second tap, main.js switches to guest and leaves online rooms', /Log out \(play as guest\)/.test(VM) && /Play as guest/.test(VM) && /btnLogout'\)\.click\(\)/.test(VM) && /PAUSE\.onLogout/.test(PS) && /logoutArmed/.test(PS) && /PAUSE\.onLogout = \(\) =>/.test(MJ3) && /leaveNetwork\('Logged out/.test(MJ3) && !/PAUSE\.onLogout[\s\S]{0,900}location\.reload/.test(MJ3));
}
// ---------- zwalnianie zasobów GPU (wycieki znalezione w audycie) ----------
{
    const GM = fs.readFileSync(path.join(ROOT, 'core/glbmonster.js'), 'utf8'), LK = fs.readFileSync(path.join(ROOT, 'core/levelkit.js'), 'utf8');
    check('leaks: a GLB monster disposes its skeleton (bone texture), mixer cache, geometry, materials and textures', /o\.skeleton\.dispose\(\)/.test(GM) && /mixer\.uncacheRoot\(inner\)/.test(GM) && /geometry\.dispose\(\)/.test(GM));
    check('leaks: a camera panel (HUD) disposes its texture, material and geometry, not just the mesh', /dispose\(\) \{ camera\.remove\(mesh\); tx\.dispose\(\); mesh\.material\.dispose\(\); mesh\.geometry\.dispose\(\); \}/.test(LK));
}
// ---------- naprawy z audytu: flaga obserwatora, wypalone światło w zaciemnieniach, modele i komfort ----------
{
    const B2 = await import(url('core/bakelogic.js')), S2 = await import(url('core/spectatelogic.js')), G2 = await import(url('core/glblogic.js'));
    const NW3 = fs.readFileSync(path.join(ROOT, 'core/network.js'), 'utf8'), EN3 = fs.readFileSync(path.join(ROOT, 'core/engine.js'), 'utf8'), LB3 = fs.readFileSync(path.join(ROOT, 'core/lightbake.js'), 'utf8'), MJ4 = fs.readFileSync(path.join(ROOT, 'main.js'), 'utf8'), GM3 = fs.readFileSync(path.join(ROOT, 'core/glbmonster.js'), 'utf8'), LD3 = fs.readFileSync(path.join(ROOT, 'levels/lobby-door.js'), 'utf8'), MN3 = fs.readFileSync(path.join(ROOT, 'levels/monster.js'), 'utf8');
    check('audit: the host honors the spectator flag only when the level confirms the player was caught (otherwise anyone could be invisible)', /export function setSpectatorCheck/.test(NW3) && /pl\.sp = pl\.sp && spectatorCheck && spectatorCheck\(conn\.peer\) \? 1 : 0/.test(NW3) && /N\.setSpectatorCheck\(\(id\) => !!\(S && S\.phase === 'play' && S\.caught\.has\(id\)\)\)/.test(MN3) && /N\.setSpectatorCheck\(null\)/.test(MN3));
    check('audit: baked light fades with the lights (bakeScale: weighted by baked power, 0 when out, at most +30%) and the shader scales it by a shared uniform updated every frame', B2.bakeScale([[10, 10], [5, 5]]) === 1 && B2.bakeScale([[0, 10], [0, 5]]) === 0 && Math.abs(B2.bakeScale([[0, 10], [5, 5]]) - 1 / 3) < 1e-9 && B2.bakeScale([[99, 10]]) === 1.3 && B2.bakeScale([]) === 1 && B2.bakeScale([[NaN, 10]]) === 0 && /export const BAKE_U/.test(EN3) && /uBakeK/.test(EN3) && /export function updateBake/.test(LB3) && /updateBake\(dt\)/.test(MJ4));
    check('audit: plain BoxGeometry blocks are baked too (world matrix, patched material, zero aBake on every mesh sharing the material) and a shared geometry is disposed only after its last user', /collectRawBoxes/.test(LB3) && /patchMaterial\(m\.material\)/.test(LB3) && /matrixWorld/.test(LB3) && /bakeInfo\.raw/.test(LB3) && /left <= 0\) old\.dispose\(\)/.test(LB3));
    check('audit: spectator camera flight is capped at CAM.maxSpeed and feeds its velocity to the comfort vignette', (() => { let c = { x: 0, y: 0, z: 0 }; const n = S2.followStep(c, { x: 15, y: 0, z: 0 }, 0.1); return S2.CAM.maxSpeed > 0 && Math.hypot(n.x, n.y, n.z) <= S2.CAM.maxSpeed * 0.1 + 1e-9 && S2.followStep(c, { x: 1, y: 0, z: 0 }, 0.01).x > 0; })() && /SPEC\.vx/.test(fs.readFileSync(path.join(ROOT, 'core/spectate.js'), 'utf8')) && /bv\.set\(SPEC\.vx, SPEC\.vy, SPEC\.vz\)/.test(fs.readFileSync(path.join(ROOT, 'core/player.js'), 'utf8')));
    check('audit: a mirror render error in VR disables the mirror instead of breaking the frame', /catch \(e\) \{ mirror\.visible = false/.test(LD3));
    check('audit: GLB swaps hide only meshes and sprites (lights keep working), turn the head by the level code (world up axis) and add eye glow; the bundle tries monsters/ first', /o\.isMesh \|\| o\.isSprite \|\| o\.isLine \|\| o\.isPoints/.test(GM3) && /setFromAxisAngle\(_up, yaw\)/.test(GM3) && /AdditiveBlending/.test(GM3) && G2.candidateUrls('a.glb', true)[0] === 'monsters/a.glb' && G2.candidateUrls('a.glb', false)[0] === 'assets/monsters/a.glb' && /__BAGABOO_BUNDLED__/.test(GM3));
}
// ---------- ustawienia: wszystkie opcje graficzne domyślnie włączone, migracja starego zapisu ----------
{
    const ST = await import(url('core/settings.js')), E4 = await import(url('core/economy.js'));
    check('settings: graphics options default to on (quality High, vignette, gore, haunt, vibration)', ST.SETTINGS.quality === 'high' && ST.SETTINGS.vignette === true && ST.SETTINGS.gore === true && ST.SETTINGS.lobbyEvents === true && ST.SETTINGS.haptics === true && ST.SETTINGS.ver === ST.SETTINGS_VER && ST.GRAPHICS_DEFAULTS.quality === 'high');
    const SS = fs.readFileSync(path.join(ROOT, 'core/settings.js'), 'utf8');
    check('settings: a saved file of an older version gets the graphics defaults once and the migration is stored (later choices are kept)', /\(\+saved\.ver \|\| 0\) < SETTINGS_VER/.test(SS) && /Object\.assign\(saved, GRAPHICS_DEFAULTS, \{ ver: SETTINGS_VER \}\)/.test(SS) && /if \(migrated\) \{ try \{ localStorage\.setItem/.test(SS));
    check('lobby: the trampoline is gone, so its daily quest is retired and a saved quest list with it is repaired', !/buildTrampoline/.test(fs.readFileSync(path.join(ROOT, 'levels/lobby.js'), 'utf8')) && !E4.QUEST_POOL.some(q => q.id === 'tramp') && /retired/.test(fs.readFileSync(path.join(ROOT, 'core/economy.js'), 'utf8')));
}
// ---------- samouczek (core/tutoriallogic.js) ----------
{
    const TL = await import(url('core/tutoriallogic.js')), PS2 = fs.readFileSync(path.join(ROOT, 'core/pause.js'), 'utf8'), PL2 = fs.readFileSync(path.join(ROOT, 'core/player.js'), 'utf8'), MJ5 = fs.readFileSync(path.join(ROOT, 'main.js'), 'utf8'), TU = fs.readFileSync(path.join(ROOT, 'core/tutorial.js'), 'utf8');
    check('tutorial: every step has an id, a title, 1-3 short lines and a known kind; detected steps have a threshold or are the pause step; ids are unique', TL.STEPS.length >= 6 && new Set(TL.STEPS.map(x => x.id)).size === TL.STEPS.length && TL.STEPS.every(x => x.id && x.title && x.title.length <= 32 && x.lines.length >= 1 && x.lines.length <= 3 && x.lines.every(l => l.length <= 100) && ['next', 'move', 'climb', 'jump', 'pause'].includes(x.kind) && (x.kind === 'next' || x.kind === 'pause' || x.need > 0)));
    check('tutorial: detected steps finish from the metrics (distance, height, jump speed, pause menu) and info steps never finish by themselves', (() => { const g = (id) => TL.STEPS.find(x => x.id === id); return !TL.stepDone(g('move'), { moved: 3.9 }) && TL.stepDone(g('move'), { moved: 4 }) && !TL.stepDone(g('climb'), { climbed: 0.5 }) && TL.stepDone(g('climb'), { climbed: 1.2 }) && !TL.stepDone(g('jump'), { vy: 1 }) && TL.stepDone(g('jump'), { vy: 3 }) && !TL.stepDone(g('pause'), { paused: false }) && TL.stepDone(g('pause'), { paused: true }) && !TL.stepDone(g('welcome'), { moved: 99, climbed: 99, vy: 99, paused: true }) && !TL.stepDone(null, {}) && !TL.stepDone(g('move'), null); })());
    check('tutorial: only a brand new player gets it by itself (no records, achievements, quests, jumps, height or streak), never twice, only in the lobby and once per session', (() => { const fresh = { records: {}, achievements: {}, questsDone: 0, best: { height: 0, jumps: 0 }, login: { streak: 1 } }; return TL.isNewPlayer(fresh) && !TL.isNewPlayer(Object.assign({}, fresh, { tutorialDone: true })) && !TL.isNewPlayer(Object.assign({}, fresh, { records: { lava: {} } })) && !TL.isNewPlayer(Object.assign({}, fresh, { questsDone: 2 })) && !TL.isNewPlayer(Object.assign({}, fresh, { best: { height: 9, jumps: 0 } })) && !TL.isNewPlayer(Object.assign({}, fresh, { login: { streak: 5 } })) && !TL.isNewPlayer(null) && TL.shouldAutoStart(fresh, 'lobby', false) && !TL.shouldAutoStart(fresh, 'lobby', true) && !TL.shouldAutoStart(fresh, 'hospital', false); })());
    check('tutorial: staff can start it any time, everybody can skip a running one, others see no button', TL.tutorialButton(true, false) === 'start' && TL.tutorialButton(false, false) === null && TL.tutorialButton(true, true) === 'skip' && TL.tutorialButton(false, true) === 'skip');
    check('tutorial: wired in (pause button for staff, trigger only on info steps, Enter, auto start in the lobby, panel per frame, saved flag)', /tutorialButton\(isStaffName\(SAVE\.profile\.name\), TUT\.on\)/.test(PS2) && /TUT\.pauseSeen = true/.test(PS2) && /TUT\.next\('trigger'\)/.test(PL2) && /autoStartTutorial\(L\.levelId\)/.test(MJ5) && /updateTutorial\(dt\)/.test(MJ5) && /SAVE\.tutorialDone = true/.test(TU) && /kind !== 'next'\) return/.test(TU) && /e\.key === 'Enter'/.test(TU));
}
    {
        const ML = await import('../core/musiclogic.js');
        const AU = fs.readFileSync(new URL('../core/audio.js', import.meta.url), 'utf8'), AM = fs.readFileSync(new URL('../core/ambience.js', import.meta.url), 'utf8');
        check('music: tension rises fast, falls slowly and stays in 0..1', ML.tensionSmooth(0, 1, 0.5) > 0.5 && ML.tensionSmooth(1, 0, 0.5) > 0.85 && ML.tensionSmooth(0.3, 5, 10) <= 1 && ML.tensionSmooth(0.3, -2, 10) >= 0);
        check('music: filter opens, dissonance and pulse grow only with tension, silent layer at calm', (() => { const a = ML.tensionParams(0), b = ML.tensionParams(0.6), c = ML.tensionParams(1); return a.dissonant === 0 && a.cutoff === ML.TENSION.cutoffLow && b.cutoff > a.cutoff && c.cutoff > b.cutoff && c.dissonant > b.dissonant && c.pulse > b.pulse && c.droneMul > a.droneMul; })());
        check('music: hush mutes the music only at high tension', ML.hushMul(true, 0.9) < 1 && ML.hushMul(true, 0.2) === 1 && ML.hushMul(false, 1) === 1);
        check('music: wired (setTension in audio.js and from dreadUpdate, imported)', /export function setTension/.test(AU) && /setTension\(/.test(AM) && /setTension \}/.test(AM) && /musiclogic\.js/.test(AU));
    }
    {
        const DL = await import('../core/dustlogic.js');
        const DU = fs.readFileSync(new URL('../core/dust.js', import.meta.url), 'utf8'), MJ6 = fs.readFileSync(new URL('../main.js', import.meta.url), 'utf8');
        check('dust: low quality and BagaBoo Games calm mode have none, medium and high have some, unknown quality falls back to medium', DL.dustCount('low', false) === 0 && DL.dustCount('high', true) === 0 && DL.dustCount('medium', false) > 0 && DL.dustCount('high', false) > DL.dustCount('medium', false) && DL.dustCount('???', false) === DL.DUST.counts.medium);
        check('dust: wrap keeps values in the window around the player, also far outside and below', [-50, -6.1, 0, 5.9, 6.1, 123.4].every(v => { const w = DL.wrap(v, 1, 6); return w >= -5 && w < 7; }) && DL.wrap(1, 1, 6) === 1);
        check('dust: motes drift slowly and stay inside the window for a long time', (() => { let p = { x: 3, y: 1, z: -2 }; const c = { x: 0, y: 1.6, z: 0 }; for (let i = 0; i < 6000; i++) { const q = DL.advance(p, 7, i * 0.016, 0.016, c); if (Math.hypot(q.x - p.x, q.z - p.z) > 0.01 && Math.abs(q.x - p.x) < 5) {} p = q; if (Math.abs(p.x - c.x) > DL.DUST.R + 1e-6 || Math.abs(p.z - c.z) > DL.DUST.R + 1e-6 || p.y < c.y - 1.3 || p.y > c.y + DL.DUST.H + 0.1 || !Number.isFinite(p.x + p.y + p.z)) return false; } return true; })());
        check('dust: wired (per frame in main.js, one Points object, disposed, off in calm mode)', /updateDust\(dt\)/.test(MJ6) && /new THREE\.Points/.test(DU) && /disposeDust/.test(DU) && /pts\.geometry\.dispose\(\)/.test(DU) && /GAMES_CALM\.on/.test(DU));
    }
    {
        const HL = await import('../core/heightlogic.js');
        const TX = fs.readFileSync(new URL('../core/textures.js', import.meta.url), 'utf8');
        const W = 256, wall = HL.heightField('wall', W, W), at = (f, x, y) => f[y * W + x];
        const mean = (f) => f.reduce((a, b) => a + b, 0) / f.length;
        check('height: every surface has values in 0..1 and is deterministic', HL.SURFACES.every(k => { const a = HL.heightField(k, 64, 64), b = HL.heightField(k, 64, 64); return a.every(v => v >= 0 && v <= 1) && a.every((v, i) => v === b[i]); }));
        check('height: wall grooves are cut in (the 256 px grid, here at x=0 and x=64) and rivets stick out', at(wall, 0, 30) < mean(wall) - 0.2 && at(wall, 64, 30) < mean(wall) - 0.2 && at(wall, 3, 3) > mean(wall) + 0.1);
        check('height: the floor has grooves between tiles and the wood has gaps between planks', (() => { const f = HL.heightField('floor', W, W), w = HL.heightField('wood', W, W); return at(f, 0, 100) < mean(f) - 0.2 && at(w, 100, 63) < mean(w) - 0.2; })());
        check('height: the relief is independent of the colour (the generator takes no colour input, only the kind and the size)', HL.heightField.length === 3);
        check('height: the result tiles without a seam (edge to edge difference is as small as between neighbours)', ['wall', 'floor', 'wood', 'plaster'].every(k => { const f = HL.heightField(k, 128, 128); let e = 0, n = 0; for (let j = 0; j < 128; j++) { e += Math.abs(f[j * 128] - f[j * 128 + 127]); n += Math.abs(f[j * 128 + 64] - f[j * 128 + 65]); } return e < n * 3 + 0.5; }));
        check('height: flat field gives the flat normal and the strength tilts it the right way', (() => { const flat = new Float32Array(16).fill(0.5), n = HL.normalsFromHeight(flat, 4, 4, 3); const ramp = new Float32Array(16); for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) ramp[j * 4 + i] = i / 4; const r = HL.normalsFromHeight(ramp, 4, 4, 3); return Math.abs(n[0] - 127.5) < 1.5 && Math.abs(n[1] - 127.5) < 1.5 && n[2] > 254 && r[4 + 0 + 4] < 127; })());
        check('height: normalFor uses it for known surfaces (wall, floor, wood, plaster are marked), luminance only for the rest', /heightField\(surf, w, h\)/.test(TX) && ['wall', 'floor', 'plaster', 'wood'].every(k => new RegExp("userData\\.surface = '" + k + "'").test(TX)));
    }
    {
        const SL = await import('../core/shaftlogic.js');
        const SH = fs.readFileSync(new URL('../core/shafts.js', import.meta.url), 'utf8'), MJ7 = fs.readFileSync(new URL('../main.js', import.meta.url), 'utf8');
        const lamps = [{ x: 0, y: 3.5, z: 0, intensity: 10 }, { x: 1, y: 3.5, z: 1, intensity: 9 }, { x: 8, y: 3.5, z: 0, intensity: 6 }, { x: 16, y: 3.5, z: 0, intensity: 1 }, { x: 24, y: 1.0, z: 0, intensity: 12 }, { x: 30, y: 3.5, z: 0, intensity: NaN }, null];
        check('shafts: only medium and high quality outside BagaBoo Games', SL.shaftsEnabled('high', false) && SL.shaftsEnabled('medium', false) && !SL.shaftsEnabled('low', false) && !SL.shaftsEnabled('high', true));
        const p = SL.pickShafts(lamps, 0, 6);
        check('shafts: low lamps, broken input, very weak lights and near neighbours are skipped (2 left of 7)', p.length === 2 && p[0].x === 0 && p[1].x === 8, p.map(x => x.x));
        check('shafts: strongest first, brighter lamp brighter shaft, opacity inside limits, cone widens downwards and ends above the floor', p[0].opacity >= p[1].opacity && p.every(s => s.opacity >= SL.SHAFT.opacityMin && s.opacity <= SL.SHAFT.opacityMax && s.botR > s.topR && s.length > 0 && s.y - s.length > 0));
        check('shafts: count is capped by max and the limit, empty and invalid inputs give nothing', SL.pickShafts(Array.from({ length: 40 }, (_, i) => ({ x: i * 5, y: 4, z: 0, intensity: 10 })), 0, 100).length === SL.SHAFT.max && SL.pickShafts(lamps, 0, 1).length === 1 && SL.pickShafts([], 0).length === 0 && SL.pickShafts(null, 0).length === 0 && SL.pickShafts(lamps, 0, 0).length === 0);
        check('shafts: very long drops are limited to maxLength', SL.pickShafts([{ x: 0, y: 30, z: 0, intensity: 5 }], 0)[0].length === SL.SHAFT.maxLength);
        check('shafts: wired (built after the level and before the bake, one merged mesh, additive, no depth write, fades with the lights, off in calm mode)', /buildShafts\(calmLevel\);[\s\S]*bakeLevel\(\)/.test(MJ7) && /AdditiveBlending/.test(SH) && /depthWrite: false/.test(SH) && /uK: BAKE_U/.test(SH) && /shaftsEnabled\(SETTINGS\.quality, !!calm\)/.test(SH) && !/GAMES_CALM\.on/.test(SH.replace(/\/\/.*$/gm, '')) && /new THREE\.Mesh\(g, mat\)/.test(SH));
    }
    {
        const PL = await import('../core/proplogic.js');
        const PR = fs.readFileSync(new URL('../core/props.js', import.meta.url), 'utf8'), MJ8 = fs.readFileSync(new URL('../main.js', import.meta.url), 'utf8'), PY = fs.readFileSync(new URL('../tools/blender/props.py', import.meta.url), 'utf8');
        const wall = (x0, x1, z0, z1) => ({ minX: x0, maxX: x1, minY: 0, maxY: 3, minZ: z0, maxZ: z1 });
        const base = { seed: 5, count: 14, area: { minX: -20, maxX: 20, minZ: -20, maxZ: 20 }, floorY: 0, boxes: [wall(-20, 20, -1, 1), wall(8, 10, -20, 20)], spawn: [-15, 1, 15], reserved: [[12, 12, 2]], portals: [{ minX: 14, maxX: 16, minZ: -16, maxZ: -14 }], kinds: [['barrel', 3], ['crate', 2], ['bench', 1]] };
        const a = PL.placeProps(base), b = PL.placeProps(base);
        check('props: the same seed gives exactly the same placement, a different seed differs, and the count is respected', JSON.stringify(a) === JSON.stringify(b) && JSON.stringify(PL.placeProps(Object.assign({}, base, { seed: 6 }))) !== JSON.stringify(a) && a.length > 5 && a.length <= base.count);
        check('props: only the allowed kinds, scale and tint inside sane limits, everything inside the area', a.every(p => ['barrel', 'crate', 'bench'].includes(p.name) && p.scale >= 0.9 && p.scale <= 1.15 && p.tint >= 0.8 && p.tint <= 1.1 && p.x > -20 && p.x < 20 && p.z > -20 && p.z < 20 && Number.isFinite(p.rotY)));
        check('props: never inside an obstacle, near the start, a reservation or a portal, and never closer than their own sizes', a.every(p => !base.boxes.some(q => q.maxY > 0.25 && p.x > q.minX - PL.PROPS[p.name].r && p.x < q.maxX + PL.PROPS[p.name].r && p.z > q.minZ - PL.PROPS[p.name].r && p.z < q.maxZ + PL.PROPS[p.name].r)) && a.every(p => Math.hypot(p.x + 15, p.z - 15) > 5 && Math.hypot(p.x - 12, p.z - 12) > 3 && !(p.x > 12 && p.x < 18 && p.z > -18 && p.z < -12)) && a.every((p, i) => a.every((q, j) => i === j || Math.hypot(p.x - q.x, p.z - q.z) >= p.r + q.r + 0.3 - 1e-9)));
        const narrow = PL.placeProps({ seed: 3, count: 20, area: { minX: -10, maxX: 10, minZ: -10, maxZ: 10 }, floorY: 0, boxes: [wall(-10, 10, -2.2, -2), wall(-10, 10, -0.5, -0.3)], spawn: [0, 1, 9], kinds: [['crate', 1]] });
        check('props: a corridor narrower than 1.9 m (here 1.5 m between z -2 and -0.5) stays empty, wide open floor still gets props', narrow.every(p => !(p.z > -2.0 && p.z < -0.5)) && PL.placeProps({ seed: 3, count: 6, area: { minX: -10, maxX: 10, minZ: -10, maxZ: 10 }, floorY: 0, boxes: [], spawn: [0, 1, 9], kinds: [['crate', 1]] }).length > 3, narrow.map(p => [p.x.toFixed(1), p.z.toFixed(1)]));
        check('props: invalid or empty input gives nothing and does not throw', PL.placeProps({ seed: 1, count: 0, area: base.area, kinds: base.kinds }).length === 0 && PL.placeProps({ seed: 1, count: 5, area: base.area, kinds: [['nope', 1]] }).length === 0 && PL.placeProps({ seed: 1, count: 5, kinds: base.kinds }).length === 0);
        check('props: every level set uses only known kinds, maze variants inherit the base set, unknown levels have none', Object.values(PL.PROP_SETS).every(s => s.count > 0 && s.kinds.length > 1 && s.kinds.every(k => PL.PROPS[k[0]] && k[1] > 0)) && PL.propSetFor('maze_3') === PL.PROP_SETS.maze && PL.propSetFor('lobby') === null && PL.baseLevelId('maze_12') === 'maze' && PL.baseLevelId('maze-48213') === 'maze' && PL.propSetFor('maze-7') === PL.PROP_SETS.maze);
        check('props: quality rules (none on low and in BagaBoo Games, fewer on medium)', PL.propsEnabled('high', false) && PL.propsEnabled('medium', false) && !PL.propsEnabled('low', false) && !PL.propsEnabled('high', true) && PL.propCount(PL.PROP_SETS.hospital, 'high') > PL.propCount(PL.PROP_SETS.hospital, 'medium') && PL.propCount(null, 'high') === 0);
        check('props: the mesh names agree with the Blender script and the file exists and is small', Object.values(PL.PROPS).every(p => PY.includes("'" + p.mesh.replace('prop_', '') + "'")) && fs.existsSync(new URL('../assets/props/props.glb', import.meta.url)) && fs.statSync(new URL('../assets/props/props.glb', import.meta.url)).size < 400000 && Object.keys(PL.PROPS).length <= 10);
        check('props: wired (called after the level is built, instances, no collision, level check after loading, parsed again for each level)', /addLevelProps\(L\.levelId, calmLevel\)/.test(MJ8) && /new THREE\.InstancedMesh/.test(PR) && !/addCollider|L\.obstacles\.push/.test(PR) && /\(L\.gen \|\| 0\) !== gen/.test(PR) && /data\.slice\(0\)/.test(PR));
    }
    {
        const AL = await import('../core/artlogic.js'), EN = fs.readFileSync(new URL('../core/engine.js', import.meta.url), 'utf8');
        check('tile break: games (arcade) get almost none, every other family the full strength, and the strength stays small enough not to wash the textures out', AL.tileStrength('arcade') < AL.tileStrength('clinical') && AL.tileStrength('arcade') <= 0.05 && ['neutral', 'clinical', 'crypt', 'industrial', 'hotel', 'dread'].every(f => AL.tileStrength(f) === AL.TILE.base) && AL.TILE.base <= 0.15);
        check('tile break: wired in the block shader (world position varying, uniform strength, one cache key, albedo only)', /vTileP = \(modelMatrix \* vec4\(position, 1\.0\)\)\.xyz/.test(EN) && /uniforms\.uTile = \{ value: tile \|\| 0 \}/.test(EN) && /customProgramCacheKey = \(\) => 'crispEdge'/.test(EN) && /tileStrength\(familyName\(L\.levelId\)\)/.test(EN) && /diffuseColor\.rgb \*= 1\.0 \+ \(tn - 0\.5\)/.test(EN));
        check('tile break: maze variants and unknown levels still resolve to a family (hyphen, underscore)', AL.familyName('maze-48213') === 'industrial' && AL.familyName('maze_3') === 'industrial' && AL.familyName('nope') === 'neutral');
    }
    {
        const SP = await import('../core/spotlogic.js'), DC = await import('../core/decallogic.js'), AL2 = await import('../core/artlogic.js');
        const DJ = fs.readFileSync(new URL('../core/decals.js', import.meta.url), 'utf8'), MJ9 = fs.readFileSync(new URL('../main.js', import.meta.url), 'utf8');
        const bx = (x0, x1, z0, z1, h) => ({ minX: x0, maxX: x1, minY: 0, maxY: h === undefined ? 3 : h, minZ: z0, maxZ: z1 });
        const area = { minX: -20, maxX: 20, minZ: -20, maxZ: 20 };
        const lone = SP.wallFaces({ area, floorY: 0, boxes: [bx(-3, 3, -0.5, 0.5)] });
        check('spots: a lone wall box gives its 4 sides (the short ends too if long enough), normals are unit, lengths and heights right', lone.length === 2 && lone.every(f => Math.hypot(f.nx, f.nz) === 1 && f.len === 6 && f.top === 3), lone.length);
        const touching = SP.wallFaces({ area, floorY: 0, boxes: [bx(-3, 3, -0.5, 0.5), bx(-0.5, 0.5, 0.5, 6)] });
        check('spots: a face covered by another wall (a T junction) and a face behind the perimeter are skipped', touching.every(f => !(f.nz === 1 && Math.abs(f.cz - 0.5) < 1e-9 && f.len === 6)) && SP.wallFaces({ area, floorY: 0, boxes: [bx(19.9, 24, -3, 3)] }).every(f => f.nx !== 1), touching.map(f => [f.nx, f.nz, f.len]));
        const homeBoxes = [bx(-8, 8, -8, -7), bx(-8, 8, 7, 8), bx(-8, -7, -7, 7), bx(7, 8, -7, 7)], homeFaces = SP.wallFaces({ area: { minX: -6.6, maxX: 6.6, minZ: -6.6, maxZ: 6.6 }, floorY: 0, boxes: homeBoxes });
        check('spots: a room whose walls stand outside the movement bounds (Home: walls at 7-8 m, bounds 6.6 m) still gets its 4 inner faces and none of the outer ones', homeFaces.length === 4 && homeFaces.every(f => (f.nx === 0 ? Math.abs(f.cz) === (f.nz === 1 ? 7 : 7) : Math.abs(f.cx) === 7) && ((f.nx !== 0 && Math.sign(f.nx) === -Math.sign(f.cx)) || (f.nz !== 0 && Math.sign(f.nz) === -Math.sign(f.cz)))), homeFaces.map(f => [f.cx, f.cz, f.nx, f.nz]));
        check('spots: low obstacles (under 1.8 m) and floating ones give no wall faces', SP.wallFaces({ area, floorY: 0, boxes: [bx(-3, 3, -0.5, 0.5, 1.2), { minX: 5, maxX: 9, minY: 2, maxY: 5, minZ: 5, maxZ: 6 }] }).length === 0);
        const face = { cx: 0, cz: 0, nx: 0, nz: 1, tx: 1, tz: 0, len: 12 };
        const iv = SP.faceIntervals(face, { reserved: [[1, 0.5, 1]], portals: [] }, 0.5);
        check('spots: intervals along a wall skip the area around a reservation or portal and keep the rest', iv.length === 2 && iv[0][1] < 1 - 1 && iv[1][0] > 1 + 1 && iv[0][0] === -6 && iv[1][1] === 6 && SP.faceIntervals(face, { portals: [{ minX: 20, maxX: 22, minZ: 20, maxZ: 22 }] }, 0.5).length === 1, iv);
        check('decals: games, the arcade family, virtual levels and Room 000 get nothing; hubs get about 45% of a level', DC.decalSet('lava', 'arcade', 'game') === null && DC.decalSet('hospital', 'arcade', 'level') === null && DC.decalSet('route', 'neutral', 'virtual') === null && DC.decalSet('room000', 'dread', 'level') === null && DC.decalSet('monster', 'dread', 'game') === null && DC.decalSet('lobby', 'neutral', 'hub').count < DC.decalSet('hospital', 'clinical', 'level').count && DC.decalSet('lobby', 'neutral', 'hub').count > 0);
        const regs = AL2.knownLevels().map(id => ({ id: id, fam: AL2.familyName(id) }));
        check('decals: every family but arcade has a set with known kinds, so every current and future level is covered', Object.keys(AL2.FAMILIES).filter(f => f !== 'arcade').every(f => DC.FAMILY_DECALS[f] && DC.FAMILY_DECALS[f].kinds.every(k => DC.DECALS[k[0]] && k[1] > 0)) && regs.every(r => r.fam === 'arcade' || DC.DECAL_SKIP.includes(r.id) || DC.decalSet(r.id, r.fam, 'level')) && DC.DECAL_SKIP.every(id => DC.decalSet(id, 'dread', 'level') === null) && DC.decalSet('maze-48213', AL2.familyName('maze-48213'), 'level') && DC.baseId('maze-48213') === 'maze');
        const base2 = { seed: 9, count: 20, area, floorY: 0, boxes: [bx(-12, 12, -0.5, 0.5), bx(8, 9, -15, 15)], spawn: [-15, 1, 15], reserved: [[0, 1, 1]], portals: [{ minX: 3, maxX: 5, minZ: 0, maxZ: 1 }], kinds: DC.FAMILY_DECALS.clinical.kinds };
        const a2 = DC.placeDecals(base2), b2 = DC.placeDecals(base2);
        check('decals: the same seed gives the same placement, other seeds differ, count is respected', JSON.stringify(a2) === JSON.stringify(b2) && JSON.stringify(DC.placeDecals(Object.assign({}, base2, { seed: 10 }))) !== JSON.stringify(a2) && a2.length > 8 && a2.length <= 20);
        const walls = a2.filter(d => d.on === 'wall'), floors = a2.filter(d => d.on === 'floor');
        check('decals: wall ones sit 2 cm off a real wall face, inside its height, never near the portal or reservation; floor ones lie on the floor, away from walls and the start', walls.length > 3 && walls.every(d => { const px = d.x - d.nx * 0.03, pz = d.z - d.nz * 0.03; return base2.boxes.some(q => px > q.minX - 1e-6 && px < q.maxX + 1e-6 && pz > q.minZ - 1e-6 && pz < q.maxZ + 1e-6) && d.y - d.h / 2 >= -1e-6 && d.y + d.h / 2 <= 3.0 + 1e-6 && Math.hypot(Math.max(3 - d.x, 0, d.x - 5), Math.max(0 - d.z, 0, d.z - 1)) > 1.2 && Math.hypot(d.x, d.z - 1) > 1.4; }) && floors.every(d => d.y > 0 && d.y < 0.03 && Math.hypot(d.x + 15, d.z - 15) > 5 && !base2.boxes.some(q => d.x > q.minX - 0.5 && d.x < q.maxX + 0.5 && d.z > q.minZ - 0.5 && d.z < q.maxZ + 0.5)));
        check('decals: sizes and opacity inside the limits of their type, invalid or empty input gives nothing', a2.every(d => d.w >= DC.DECALS[d.name].w[0] - 1e-9 && d.w <= DC.DECALS[d.name].w[1] + 1e-9 && d.alpha >= DC.DECALS[d.name].alpha[0] && d.alpha <= DC.DECALS[d.name].alpha[1]) && DC.placeDecals(Object.assign({}, base2, { count: 0 })).length === 0 && DC.placeDecals(Object.assign({}, base2, { kinds: [['nope', 1]] })).length === 0 && DC.placeDecals({ seed: 1, count: 5, kinds: base2.kinds }).length === 0);
        check('decals: atlas cells are 8 distinct, non-overlapping rectangles inside the texture and the cell numbers of the types are unique', (() => { const r = [0, 1, 2, 3, 4, 5, 6, 7].map(DC.cellUV); return r.every(q => q.u0 >= 0 && q.u1 <= 1 && q.v0 >= 0 && q.v1 <= 1 && q.u1 > q.u0 && q.v1 > q.v0) && r.every((q, i) => r.every((p, j) => i === j || q.u1 <= p.u0 || p.u1 <= q.u0 || q.v1 <= p.v0 || p.v1 <= q.v0)) && new Set(Object.values(DC.DECALS).map(d => d.cell)).size === 8; })());
        check('decals: wired (called after the level is built with the explicit calm flag, one merged mesh, transparent without depth write, atlas from tex, RGBA vertex colors)', /addLevelDecals\(L\.levelId, cfgKind\(id\), calmLevel\)/.test(MJ9) && /new THREE\.Mesh\(g, mat\)/.test(DJ) && /depthWrite: false/.test(DJ) && /forceSinglePass: true/.test(DJ) && /map: tex\.decals/.test(DJ) && /Float32BufferAttribute\(col, 4\)/.test(DJ) && !/GAMES_CALM/.test(DJ.replace(/\/\/.*$/gm, '')));
    }
    {
        const KL = await import('../core/kitlogic.js'), AL3 = await import('../core/artlogic.js'), DC2 = await import('../core/decallogic.js');
        const KJ = fs.readFileSync(new URL('../core/kit.js', import.meta.url), 'utf8'), MJ10 = fs.readFileSync(new URL('../main.js', import.meta.url), 'utf8'), PY2 = fs.readFileSync(new URL('../tools/blender/props.py', import.meta.url), 'utf8'), PJ = fs.readFileSync(new URL('../core/props.js', import.meta.url), 'utf8');
        const bx = (x0, x1, z0, z1, h) => ({ minX: x0, maxX: x1, minY: 0, maxY: h === undefined ? 3.2 : h, minZ: z0, maxZ: z1 });
        const area = { minX: -20, maxX: 20, minZ: -20, maxZ: 20 };
        const base = { seed: 4, p: { base: 1, crown: 1, pipe: 1, tray: 1, vent: 1 }, factor: 1, max: 200, area, floorY: 0, boxes: [bx(-12, 12, -0.5, 0.5), bx(8, 9, -15, -2)], spawn: [-15, 1, 15], reserved: [[-8, 1.5, 1]], portals: [{ minX: 3, maxX: 5, minZ: 0, maxZ: 1 }] };
        const k1 = KL.placeKit(base), k2 = KL.placeKit(base);
        check('kit: the same seed gives the same placement, a different seed differs, and the cap on instances is respected', JSON.stringify(k1) === JSON.stringify(k2) && JSON.stringify(KL.placeKit(Object.assign({}, base, { seed: 5 }))) !== JSON.stringify(k1) && k1.length > 8 && KL.placeKit(Object.assign({}, base, { max: 5 })).length === 5 && KL.placeKit(Object.assign({}, base, { max: 0 })).length === 0);
        check('kit: only known pieces, all numbers finite, strips have a positive length and fixed pieces a scale of exactly 1', k1.every(k => KL.KIT[k.name] && [k.x, k.y, k.z, k.rotY, k.sx].every(Number.isFinite) && (KL.KIT[k.name].mode === 'strip' ? k.sx > 0 : k.sx === 1)) && new Set(k1.map(k => k.name)).size === 5);
        check('kit: every piece sits on a real wall face (back 2 cm inside a wall, front free), never within the portal or reservation margin', k1.every(k => { const nx = Math.round(Math.sin(k.rotY)), nz = Math.round(Math.cos(k.rotY)), inWall = (x, z) => base.boxes.some(q => x > q.minX - 1e-6 && x < q.maxX + 1e-6 && z > q.minZ - 1e-6 && z < q.maxZ + 1e-6); return inWall(k.x - nx * 0.02, k.z - nz * 0.02) && !inWall(k.x + nx * 0.25, k.z + nz * 0.25) && Math.hypot(Math.max(3 - k.x, 0, k.x - 5), Math.max(0 - k.z, 0, k.z - 1)) > 0.5 && Math.hypot(k.x + 8, k.z - 1.5) > 1.5; }));
        check('kit: horizontal pieces hang high (pipes and trays >= 2.4 m, below the wall top), nothing floats above the wall, strips stand on the floor and the crown hangs from the top', k1.filter(k => k.name === 'pipe' || k.name === 'tray').every(k => k.y >= 2.4 && k.y <= 3.2) && k1.filter(k => k.name === 'vent').every(k => k.y > 1.9 && k.y < 2.5) && k1.filter(k => k.name === 'base').every(k => k.y === 0) && k1.filter(k => k.name === 'crown').every(k => k.y === 3.2));
        check('kit: a pipe and a tray on the same piece of wall never overlap (at least 0.25 m apart in height)', (() => { for (const a of k1) for (const b of k1) if (a.name === 'pipe' && b.name === 'tray' && Math.abs(a.x - b.x) < 2.2 && Math.abs(a.z - b.z) < 2.2 && Math.sin(a.rotY) === Math.sin(b.rotY) && Math.cos(a.rotY) === Math.cos(b.rotY) && Math.abs(a.y - b.y) < 0.25) return false; return true; })());
        check('kit: a low wall gets no pipes, trays, crown or vents, only a baseboard', KL.placeKit(Object.assign({}, base, { boxes: [bx(-12, 12, -0.5, 0.5, 1.9)] })).every(k => k.name === 'base') && KL.placeKit(Object.assign({}, base, { boxes: [bx(-12, 12, -0.5, 0.5, 6.5)] })).every(k => k.name !== 'crown'));
        check('kit: games, the arcade family, virtual levels and Room 000 get nothing, hubs half, and every other family has probabilities for every piece', KL.kitSet('lava', 'arcade', 'game') === null && KL.kitSet('hotel', 'arcade', 'level') === null && KL.kitSet('route', 'neutral', 'virtual') === null && KL.kitSet('room000', 'dread', 'level') === null && KL.kitSet('monster', 'dread', 'game') === null && KL.kitSet('lobby', 'neutral', 'hub').factor === 0.5 && KL.kitSet('hospital', 'clinical', 'level').factor === 1 && Object.keys(AL3.FAMILIES).filter(f => f !== 'arcade').every(f => KL.FAMILY_KIT[f] && Object.keys(KL.KIT).every(n => KL.FAMILY_KIT[f][n] >= 0 && KL.FAMILY_KIT[f][n] <= 1)) && AL3.knownLevels().every(id => AL3.familyName(id) === 'arcade' || KL.KIT_SKIP.includes(id) || KL.kitSet(id, AL3.familyName(id), 'level')) && KL.kitSet('maze-48213', AL3.familyName('maze-48213'), 'level'));
        check('kit: the same exclusions as decals (Room 000) and quality rules (none on low, fewer on medium)', JSON.stringify(KL.KIT_SKIP) === JSON.stringify(DC2.DECAL_SKIP) && KL.kitEnabled('high', false) && KL.kitEnabled('medium', false) && !KL.kitEnabled('low', false) && !KL.kitEnabled('high', true) && KL.kitMax('high') > KL.kitMax('medium'));
        check('kit: the mesh names and the model agree (Blender script has every kit_ piece, file is small), wired with the explicit calm flag and a level generation check, no collider', Object.values(KL.KIT).every(k => PY2.includes("'" + k.mesh.replace('kit_', '') + "', 'kit_'")) && /BUILD_KIT = \[kit_base, kit_crown, kit_pipe, kit_tray, kit_vent\]/.test(PY2) && fs.statSync(new URL('../assets/props/props.glb', import.meta.url)).size < 400000 && /addLevelKit\(L\.levelId, cfgKind\(id\), calmLevel\)/.test(MJ10) && /\(L\.gen \|\| 0\) !== gen/.test(KJ) && /levelGeometries/.test(PJ) && /new THREE\.InstancedMesh/.test(KJ) && !/addCollider|L\.obstacles\.push|GAMES_CALM/.test(KJ.replace(/\/\/.*$/gm, '')));
    }
    {
        const GL = await import('../core/glblogic.js');
        const GM = fs.readFileSync(new URL('../core/glbmonster.js', import.meta.url), 'utf8'), ML2 = fs.readFileSync(new URL('../tools/blender/monsterlib.py', import.meta.url), 'utf8'), MEM = fs.readFileSync(new URL('../levels/memory.js', import.meta.url), 'utf8');
        const ALL = { attack: true, scream: true, listen: true }, run = (steps) => { const st = GL.newShotState(), log = []; let last = null; for (const [t, sp, d, j, has] of steps) { const r = GL.shotStep(st, t, sp, d === undefined ? 10 : d, !!j, has || ALL); if (r !== last) { if (r) log.push(r); last = r; } } return log; };
        const seq = (dur, sp, d) => Array.from({ length: Math.round(dur / 0.05) }, () => [0.05, sp, d]);
        check('shots: a monster that was calm and then starts to run screams once, and does not scream again while it keeps running', JSON.stringify(run([...seq(2, 1), ...seq(8, 5)])) === '["scream"]');
        check('shots: hovering around the run threshold (3.0-3.6 m/s) does not scream over and over (hysteresis and cooldown)', run([...seq(2, 1), ...Array.from({ length: 600 }, (_, i) => [0.05, i % 6 < 3 ? 3.0 : 3.6, 10])]).filter(r => r === 'scream').length <= 1);
        check('shots: a long idle gives one Listen per idle spell, again only after moving and after the cooldown', JSON.stringify(run([...seq(4, 0), ...seq(1, 1.2), ...seq(30, 0)]).filter(r => r === 'listen')) === '["listen","listen"]' && run(seq(20, 0)).filter(r => r === 'listen').length === 1);
        check('shots: running close to the camera attacks (and interrupts a scream), with a cooldown', JSON.stringify(run([...seq(2, 1), ...seq(0.5, 5, 10), ...seq(1, 5, 1.5), ...seq(0.5, 5, 1.5)])) === '["scream","attack"]');
        check('shots: a jump of the position (respawn, reset after a catch) resets everything and is not a sprint', run([...seq(2, 1), [0.05, 12, 1, true], ...seq(0.5, 0, 10)]).length === 0 && JSON.stringify(run([...seq(2, 1), ...seq(0.1, 5, 10), [0.05, 12, 1, true], ...seq(0.3, 5, 10)])) === '[]');
        check('shots: nothing plays when the model lacks the clips, and invalid frames do not break the state', run([...seq(2, 1), ...seq(8, 5, 1)].map(r => [...r, {}])).length === 0 && (() => { const st = GL.newShotState(); for (const dt of [0, -1, NaN, 0.05]) GL.shotStep(st, dt, 5, 10, false, ALL); return true; })());
        check('shots: clips are found by name (with the armature prefix) and absent ones are reported, the locomotion fallback is unchanged', GL.hasClip(['A|Idle', 'A|Scream', 'A|Listen'], 'scream') && GL.clipFor(['A|Walk', 'A|Listen'], 'listen') === 'A|Listen' && !GL.hasClip(['Idle', 'Walk'], 'scream') && GL.clipFor(['Idle'], 'attack') === null && GL.pickClip(['A|Idle', 'A|Scream', 'A|Listen', 'A|Walk'], 'idle') === 'A|Idle' && GL.pickClip(['A|Scream', 'A|Walk'], 'idle') === 'A|Walk');
        check('monsters: skin bump in the shader (noise from the bind-pose position, normal from screen derivatives, eyes skipped, one program key) and the one-shot clips are wired in the loader', /vSkinP = position;/.test(GM) && /dFdx\(sh0\)/.test(GM) && /monsterSkin/.test(GM) && /\/eye\/i\.test\(mat\.name/.test(GM) && /shotStep\(e\.shot, dt, e\.speed/.test(GM) && /jumped = d > SHOT_RULES\.jump/.test(GM) && /LoopOnce/.test(GM) && /play\(shot \|\| stateRole\(speed, chasing\)\)/.test(GM));
        check('monsters: the Blender script defines the Scream and Listen clips and every model file in assets/monsters has them (regenerate with tools/blender/monsters.py and shrink_glb.py)', /m\.clip\('Scream', 36, scream\)/.test(ML2) && /m\.clip\('Listen', 48, listen\)/.test(ML2) && Object.values(GL.MONSTERS).every(c => { const b = fs.readFileSync(new URL('../assets/monsters/' + c.file, import.meta.url)), jl = b.readUInt32LE(12), j = JSON.parse(b.slice(20, 20 + jl).toString()), n = (j.animations || []).map(a => a.name); return GL.hasClip(n, 'scream') && GL.hasClip(n, 'listen') && GL.hasClip(n, 'attack'); }));
        check('monsters: the lava beast of the memory level uses the GLB model (swapRoot on its group)', /swapRoot\(b\.group, 'lavabeast'/.test(MEM) && /import \{ swapRoot \}/.test(MEM));
    }
    {
        const HP = await import('../core/hapticlogic.js');
        const AU2 = fs.readFileSync(new URL('../core/audio.js', import.meta.url), 'utf8'), HAP = fs.readFileSync(new URL('../core/haptics.js', import.meta.url), 'utf8');
        check('haptics: strength falls with distance and is zero outside the range, bad input gives zero', HP.attenuate(0, 10) === 1 && Math.abs(HP.attenuate(5, 10) - 0.5) < 1e-9 && HP.attenuate(10, 10) === 0 && HP.attenuate(50, 10) === 0 && HP.attenuate(NaN, 10) === 0 && HP.attenuate(3, 0) > 0);
        check('haptics: a source on the right of the gaze is right, on the left is left, straight ahead or behind or degenerate is both (three.js: forward -Z, right +X)', HP.sideOf(0, -1, 1, 0) === 'right' && HP.sideOf(0, -1, -1, 0) === 'left' && HP.sideOf(0, -1, 0, -1) === 'both' && HP.sideOf(0, -1, 0, 1) === 'both' && HP.sideOf(0, 0, 1, 0) === 'both' && HP.sideOf(0, -1, 0, 0) === 'both' && HP.sideOf(1, 0, 0, 1) === 'right');
        const names = Object.keys(HP.PATTERNS);
        check('haptics: every pattern gives pulses inside the safe limits (strength, length, delay), heartbeat has two and a footstep one on the requested side', names.length >= 7 && names.every(n => { const p = HP.shape(n, 1, 'left'); return p.length >= 1 && p.every(q => q.i >= HP.HAPTIC.minI && q.i <= 1 && q.ms >= 10 && q.ms <= HP.HAPTIC.maxMs && q.at >= 0 && ['both', 'left', 'right'].includes(q.hand)); }) && HP.shape('heartbeat', 1).length === 2 && JSON.stringify(HP.shape('step', 1, 'right').map(q => q.hand)) === '["right"]');
        check('haptics: unknown names, zero or negative scale give nothing, a very strong scale is clamped to 1, a faint one drops the weak pulses', HP.shape('nope', 1).length === 0 && HP.shape('growl', 0).length === 0 && HP.shape('growl', -1).length === 0 && HP.shape('growl', 99).every(q => q.i <= 1) && HP.shape('whisper', 0.1).length === 0);
        check('haptics: a new pulse on a controller is allowed only after the minimum gap (the next one would replace the running one)', HP.canPulse({}, 'left', 100) && !HP.canPulse({ left: 100 }, 'left', 120) && HP.canPulse({ left: 100 }, 'left', 100 + HP.HAPTIC.minGap) && HP.canPulse({ left: 100 }, 'right', 101) && HP.canPulse(null, 'left', 5));
        check('haptics: no vibration for sounds without a position (countdown beeps), nor for the player own steps and hits (nearer than the minimum distance), and the random background creak waits out a silence window', /if \(!pos\) return;/.test(AU2) && /if \(d < \(minDist \|\| 0\)\) return;/.test(AU2) && /hapticAt\('step', vol, pos, 9, 1\.0\)/.test(AU2) && /hapticAt\('knock', 1, pos, 14, 2\.0\)/.test(AU2) && /duck > 0\.5 && Math\.random\(\) < 0\.35\) creak/.test(AU2) && /duck = g;/.test(AU2));
        check('haptics: wired (patterns in step, growl, whisper, knock and breath with distance and side, handedness mapping and the setting respected in haptics.js)', /hapticAt\('step'/.test(AU2) && /hapticAt\('growl'/.test(AU2) && /hapticAt\('whisper'/.test(AU2) && /hapticAt\('knock'/.test(AU2) && /hapticAt\('breath'/.test(AU2) && /sideOf\(_f\.x, _f\.z, dx, dz\)/.test(AU2) && /src\.handedness === 'left'/.test(HAP) && /SETTINGS\.haptics === false\) return 0/.test(HAP) && /canPulse\(lastPulse, key, now\)/.test(HAP));
    }
    {
        const SI = await import('../core/silencelogic.js');
        const AM2 = fs.readFileSync(new URL('../core/ambience.js', import.meta.url), 'utf8'), AU3 = fs.readFileSync(new URL('../core/audio.js', import.meta.url), 'utf8');
        const sim = (secs, fa, opts) => { const st = SI.newSilence(), ev = [], gains = []; opts = opts || {}; for (let t = 0; t < secs; t += 0.05) { const r = SI.silenceStep(st, 0.05, fa(t), !!opts.hush, opts.enabled !== false, () => 0.5); if (r.event) ev.push([r.event, +t.toFixed(2)]); gains.push(r.gain); } return { st, ev, gains }; };
        const rise = sim(12, t => t < 4 ? 0.05 : (t < 6 ? 0.5 : 0.6));
        check('silence: a rising tension crossing the threshold opens one short silent window of about 2.8 s, and the gain really drops and then recovers', rise.ev.filter(e => e[0] === 'start').length === 1 && Math.min(...rise.gains) < 0.2 && rise.gains[rise.gains.length - 1] > 0.9, rise.ev);
        check('silence: not again right after (cooldown), and never when the monster is already right next to the player (hush) or the director is off', sim(30, t => (t % 6) < 3 ? 0.05 : 0.5).ev.filter(e => e[0] === 'start').length <= 1 && sim(12, t => t < 4 ? 0.05 : 0.5, { hush: true }).ev.length === 0 && sim(12, t => t < 4 ? 0.05 : 0.5, { enabled: false }).ev.length === 0 && Math.min(...sim(12, t => t < 4 ? 0.05 : 0.5, { enabled: false }).gains) === 1);
        const calm = sim(75, () => 0.0);
        check('silence: a long calm (55 s with no tension) gives one silent window of 4.5-7 s that ends with a single distant cue', calm.ev.filter(e => e[0] === 'start').length === 1 && calm.ev.filter(e => e[0] === 'cue').length === 1 && (() => { const s0 = calm.ev.find(e => e[0] === 'start')[1], c0 = calm.ev.find(e => e[0] === 'cue')[1]; return c0 - s0 >= 4.4 && c0 - s0 <= 7.1 && s0 >= 54.5; })(), calm.ev);
        check('silence: any tension resets the calm counter, and a calm that is interrupted gives no cue', sim(70, t => (t % 40) < 38 ? 0.0 : 0.2).ev.length === 0);
        check('silence: the silent gain never goes below the dip and never above 1, invalid input is harmless, a zero step changes nothing', (() => { const st = SI.newSilence(); for (const [dt, a] of [[0, 0.5], [-1, 0.5], [0.05, NaN], [0.05, 9], [0.05, -3]]) { const r = SI.silenceStep(st, dt, a, false, true, null); if (!(r.gain >= 0 && r.gain <= 1)) return false; } return Math.min(...rise.gains) >= SI.SILENCE.dip - 1e-9 && Math.max(...rise.gains) <= 1; })());
        check('silence: not in the Silence level (own mic mechanic) and not in BagaBoo Games; variants of levels follow the base id', !SI.silenceAllowed('silence', false) && !SI.silenceAllowed('hospital', true) && SI.silenceAllowed('hospital', false) && SI.silenceAllowed('maze-4821', false) && !SI.silenceAllowed('silence_2', false));
        check('silence: wired through a separate ambient bus (drone, tension layer and ambient loops go through it; threat cues keep going straight to the master), ambient one-shots wait during silence', /ambBus\.connect\(master\)/.test(AU3) && /lp\.connect\(ambBus\)/.test(AU3) && /export function setAmbientDuck/.test(AU3) && !/ambBus/.test(AU3.slice(AU3.indexOf('export function step'), AU3.indexOf('export function step') + 400)) && /silenceStep\(SIL, dt, a, near < 9, en, Math\.random\)/.test(AM2) && /!DREAD\.silent/.test(AM2) && /audioBus\(\)\.ambient/.test(AM2) && /dst\.scaredT <= 0/.test(AM2));
    }
    {
        const VL = await import('../core/voicelogic.js'), AL4 = await import('../core/artlogic.js');
        const AU4 = fs.readFileSync(new URL('../core/audio.js', import.meta.url), 'utf8'), AM3 = fs.readFileSync(new URL('../core/ambience.js', import.meta.url), 'utf8'), VS = fs.readFileSync(new URL('../core/voice.js', import.meta.url), 'utf8');
        check('voice: a nickname is reduced to 2-12 plain letters (Polish letters folded), numbers, symbols and too short ones give nothing, non-strings are safe', VL.sanitizeName('Zbyniu20') === 'zbyniu' && VL.sanitizeName('Łukasz-X') === 'lukaszx' && VL.sanitizeName('12') === null && VL.sanitizeName('a') === null && VL.sanitizeName('x'.repeat(40)).length === 12 && VL.sanitizeName(null) === null && VL.sanitizeName(42) === null && VL.sanitizeName('😀😀') === null);
        check('voice: a phrase uses the name only when it is valid, never leaves an empty {name} or leading dots, and every family has phrases that work without a name', Object.keys(VL.PHRASES).every(f => Array.from({ length: 40 }, (_, i) => VL.pickPhrase(f, i % 2 ? 'Anna' : '12', () => (i * 0.137) % 1)).every(t => t.length > 1 && !t.includes('{') && !/^\.+/.test(t) && !/\s{2}/.test(t)) && VL.PHRASES[f].some(t => !t.includes('{name}'))) && /anna/.test(VL.pickPhrase('crypt', 'Anna', () => 0)) && !/\{|anna/.test(VL.pickPhrase('crypt', null, () => 0)));
        check('voice: families of every level in the registry have a profile and phrases (so do future levels: unknown falls back to neutral)', AL4.knownLevels().every(id => VL.profileFor(AL4.familyName(id)) && (VL.PHRASES[AL4.familyName(id)] || VL.PHRASES.neutral).length >= 3) && VL.profileFor('nope') === VL.PROFILES.neutral && Object.values(VL.PROFILES).every(p => p.f0 > 50 && p.formant > 0.5 && p.formant < 1.5 && p.rate >= 3 && p.breath >= 0 && p.breath <= 1));
        const tv = VL.textToEvents('Zbyniu... come back to us, we are waiting for you, do not run away', VL.PROFILES.hotel), tv2 = VL.textToEvents('', null), tv3 = VL.textToEvents(null, undefined);
        check('voice: text becomes bounded events (at most 44 events and 3.6 s), vowels carry three finite formants, empty and invalid input give nothing', tv.events.length <= VL.VOICE.maxEvents && tv.duration <= VL.VOICE.maxSec + 1e-9 && tv.events.length > 10 && tv.events.filter(e => e.k === 'v').every(e => e.f.length === 3 && e.f.every(x => Number.isFinite(x) && x > 100 && x < 6000)) && tv.events.every(e => e.dur > 0 && e.amp >= 0 && e.amp <= 1 && ['v', 'f', 'n', 'p', 'g', 'z'].includes(e.k)) && tv2.events.length === 0 && tv3.events.length === 0);
        check('voice: a deeper family speaks lower and slower than a clinical one (formants and rate), the same text takes longer', VL.PROFILES.crypt.formant < VL.PROFILES.clinical.formant && VL.PROFILES.crypt.f0 < VL.PROFILES.clinical.f0 && VL.textToEvents('come back', VL.PROFILES.crypt).duration > VL.textToEvents('come back', VL.PROFILES.clinical).duration);
        const vs = VL.newVoiceState(() => 0.5); let said = 0, t = 0; for (let i = 0; i < 4000; i++) { t += 0.1; if (VL.voiceTick(vs, 0.1, 8, 0, false, () => 0.5)) said++; }
        check('voice: speaks only with a monster close (under 14 m), never in calm mode or right after a jumpscare or with two voices running, and not more often than the gap allows', said >= 5 && said <= Math.ceil(400 / VL.VOICE.gap[0]) + 1 && (() => { const v = VL.newVoiceState(() => 0); let n = 0; for (let i = 0; i < 3000; i++) { n += VL.voiceTick(v, 0.1, 30, 0, false, Math.random) ? 1 : 0; n += VL.voiceTick(v, 0.1, 5, 2, false, Math.random) ? 1 : 0; n += VL.voiceTick(v, 0.1, 5, 0, true, Math.random) ? 1 : 0; v.active = 2; n += VL.voiceTick(v, 0.1, 5, 0, false, Math.random) ? 1 : 0; v.active = 0; } return n === 0; })(), said);
        check('voice: the microphone is gated while the monster speaks and for a short tail after (so its voice from the speakers is not taken for the player)', VL.micGated(5, 6) && VL.micGated(5.9, 6) && VL.micGated(6.2, 6) && !VL.micGated(6.5, 6));
        check('voice: wired (synth with a fixed number of nodes and cleanup, spatial through outAt with a voice limit, hooked into the dread director beside the whispers, off in calm mode, mic gate, name only from the local save)', /nsrc\.onended = \(\) => \{ stop\(\)/.test(VS) && !/for \(const e of events\) \{[^}]*create(Gain|BiquadFilter|Oscillator|BufferSource)/.test(VS.replace(/\n/g, ' ')) && /buildVoice\(ctx, events, profile, outAt\(pos\)/.test(AU4) && /voices >= VOICE\.maxVoices/.test(AU4) && /voiceTick\(VST, dt, near, dst\.scaredT, GAMES_CALM\.on, Math\.random\)/.test(AM3) && /!GAMES_CALM\.on && voiceTick/.test(AM3) && /voiceSpeaking\(\) \? 0 : micLevel\(\)/.test(AM3) && /SAVE\.profile && SAVE\.profile\.name/.test(AM3) && !/fetch\(|XMLHttpRequest|sendBeacon/.test(VS + AM3.slice(AM3.indexOf('głos potwora'), AM3.indexOf('głos potwora') + 700)));
    }
    {
        const MY = await import('../core/memorylogic.js');
        const LA = fs.readFileSync(new URL('../levels/laundry.js', import.meta.url), 'utf8');
        const hide = (mem, id, sec) => { for (let t = 0; t < sec; t += 0.1) MY.hideStep(mem, 0.1, id); MY.hideStep(mem, 0.1, null); };
        check('memory: a hide counts only when it lasts at least 4 s, once per stay, and a longer stay is still one hide', (() => { const m = MY.newMemory(() => 0.5, 'normal'); hide(m, 3, 3); const a = m.hides[3]; hide(m, 3, 10); return a === undefined && m.hides[3] === 1; })());
        check('memory: the favourite appears only after two hides in the same place and is the most used one (ties: the latest)', (() => { const m = MY.newMemory(() => 0.5, 'normal'); hide(m, 1, 5); const a = MY.favorite(m); hide(m, 2, 5); const b = MY.favorite(m); hide(m, 2, 5); const c = MY.favorite(m); hide(m, 1, 5); hide(m, 1, 5); return a === null && b === null && c === 2 && MY.favorite(m) === 1; })());
        check('memory: a visit happens only in patrol, never on Easy, and not before the wait is over; then the counter of that spot drops by one', (() => { const m = MY.newMemory(() => 0.5, 'normal'); hide(m, 4, 5); hide(m, 4, 5); hide(m, 4, 5); let early = 0; for (let t = 0; t < 20; t += 0.1) early += MY.checkTick(m, 0.1, true, 'normal', () => 0.5) !== null ? 1 : 0; let got = null; for (let t = 0; t < 60 && got === null; t += 0.1) got = MY.checkTick(m, 0.1, true, 'normal', () => 0.5); const after = m.hides[4]; const easy = MY.newMemory(() => 0, 'easy'); hide(easy, 4, 5); hide(easy, 4, 5); let e = 0; for (let t = 0; t < 200; t += 0.1) e += MY.checkTick(easy, 0.1, true, 'easy', () => 0) !== null ? 1 : 0; const chase = MY.newMemory(() => 0, 'normal'); hide(chase, 4, 5); hide(chase, 4, 5); let c = 0; for (let t = 0; t < 200; t += 0.1) c += MY.checkTick(chase, 0.1, false, 'normal', () => 0) !== null ? 1 : 0; return early === 0 && got === 4 && after === 2 && e === 0 && c === 0; })());
        check('memory: he does not camp (after one visit the spot has to be used again before he comes back), and on Nightmare the first visit comes sooner than on Normal', (() => { const f = (d) => { const m = MY.newMemory(() => 0.5, d); hide(m, 7, 5); hide(m, 7, 5); let n = 0, first = null; for (let t = 0; t < 600; t += 0.1) { const r = MY.checkTick(m, 0.1, true, d, () => 0.5); if (r !== null) { n++; if (first === null) first = t; } } const again = (hide(m, 7, 5), hide(m, 7, 5), 0); let n2 = 0; for (let t = 0; t < 120; t += 0.1) if (MY.checkTick(m, 0.1, true, d, () => 0.5) !== null) n2++; return { n: n, first: first, n2: n2, again: again }; }; const a = f('normal'), b = f('nightmare'); return a.n === 1 && b.n === 1 && b.first < a.first && a.n2 >= 1 && MY.MEMORY.nightmareMul < 1; })());
        check('memory: invalid steps are harmless and the number of remembered spots is bounded', (() => { const m = MY.newMemory(null, 'normal'); MY.hideStep(m, 0, 1); MY.hideStep(m, -1, 1); MY.hideStep(m, NaN, 1); for (let i = 0; i < 100; i++) hide(m, i, 5); return Object.keys(m.hides).length <= MY.MEMORY.maxSpots && MY.checkTick(m, NaN, true, 'normal') === null; })());
        check('memory: wired in the laundry (local monster state, drum index from the real safe spots, fake drums not counted, a cue and a toast, the drum rule untouched)', /newMemory\(Math\.random, diffOf\('laundry'\)\.id\)/.test(LA) && /!S\.fakeUsed\.has\(i\)\) >= 0|hidIn = S\.safe\.findIndex\(\(b, i\) => b\.containsPoint\(p\) && !S\.fakeUsed\.has\(i\)\)/.test(LA) && /checkTick\(S\.mem, dt, true, S\.df\.id, Math\.random\)/.test(LA) && /He remembers where you hide/.test(LA) && /function inSafe\(p\) \{ return S\.safe\.some\(\(b, i\) => b\.containsPoint\(p\) && !S\.fakeUsed\.has\(i\)\); \}/.test(LA) && /SFX\.bang/.test(LA));
    }
    {
        const MU = await import(url('core/mutators.js')), E5 = await import(url('core/economy.js'));
        const MJ11 = fs.readFileSync(new URL('../main.js', import.meta.url), 'utf8'), LV2 = fs.readFileSync(new URL('../levels/levels.js', import.meta.url), 'utf8'), EV = fs.readFileSync(new URL('../core/events.js', import.meta.url), 'utf8'), AM4 = fs.readFileSync(new URL('../core/ambience.js', import.meta.url), 'utf8');
        const dist = {}; for (let i = 0; i < 2000; i++) { const m = MU.rollMood(() => (i + 0.5) / 2000); dist[m.id] = (dist[m.id] || 0) + 1; }
        check('variety: the mood is drawn from four moods in the planned proportions, and only its events and whispers factors differ from 1 (nothing else), bad random input is harmless', Object.keys(MU.MOODS).length === 4 && dist.even > 700 && dist.calm > 300 && dist.uneasy > 300 && dist.restless > 300 && Object.values(MU.MOODS).every(m => Object.keys(m).every(k => ['id', 'name', 'events', 'whisper'].includes(k))) && MU.rollMood(() => 7).id === 'even' && MU.rollMood(null).id.length > 2);
        MU.setMutatorChoice('hospital', 'dark'); MU.setMutatorChoice('maze', 'dark'); MU.setMutatorChoice('silence', 'loud'); MU.setMutatorChoice('hospital', 'nope');
        check('variety: a mutator can be chosen only for levels with monsters (not the daily levels and not Silence), the choice cycles off, dark, loud and unknown ids are ignored', MU.mutatorChoice('hospital') === 'dark' && MU.mutatorChoice('maze') === 'off' && MU.mutatorChoice('silence') === 'off' && MU.nextMutator('off') === 'dark' && MU.nextMutator('dark') === 'loud' && MU.nextMutator('loud') === 'off' && MU.nextMutator('zzz') === 'dark' && MU.MUT_LEVELS.every(id => !['maze', 'well', 'memory', 'silence'].includes(id)));
        check('variety: a daily run never gets a mutator or a mood, hubs and games get neither, a chosen mutator replaces the mood, and ending the run clears everything', (() => { const a = MU.beginRun('hospital', true), b = MU.beginRun('lobby', false), c = MU.beginRun('lava', false), d = MU.beginRun('hospital', false); const on = MU.mutatorActive(); MU.endRun(); return !a.mutator && a.mood.id === 'even' && !b.mutator && b.mood.id === 'even' && !c.mutator && d.mutator && d.mutator.id === 'dark' && d.mood.id === 'even' && on && !MU.mutatorActive() && MU.mutFactor('hemi') === 1; })());
        check('variety: the factors multiply (mutator and mood), default to 1, the dark mutator dims and thickens the fog and the restless one raises events, hearing and whispers', (() => { MU.setMutatorChoice('hospital', 'dark'); MU.beginRun('hospital', false); const dark = [MU.mutFactor('hemi'), MU.mutFactor('fog'), MU.mutFactor('events')]; MU.setMutatorChoice('hospital', 'loud'); MU.beginRun('hospital', false); const loud = [MU.mutFactor('events'), MU.mutFactor('hear'), MU.mutFactor('whisper'), MU.mutFactor('hemi')]; MU.setMutatorChoice('hospital', 'off'); MU.endRun(); return dark[0] < 1 && dark[1] > 1 && dark[2] === 1 && loud[0] > 1 && loud[1] > 1 && loud[2] > 1 && loud[3] === 1 && MU.mutFactor('nonsense') === 1; })());
        const w0 = E5.SAVE.wallet, win0 = E5.SAVE.cemeteryWins || 0, rec0 = JSON.stringify(E5.SAVE.records);
        MU.setMutatorChoice('cemetery', 'dark'); MU.beginRun('cemetery', false);
        E5.levelReward('cemetery', 100, 50, 'test'); const rt = E5.recordTime('cemetery', 111); E5.recordScore('cemetery', 999);
        check('variety: a run with a mutator gives no reward, no clear and no record (wallet, wins and records untouched, recordTime refuses)', E5.SAVE.wallet === w0 && (E5.SAVE.cemeteryWins || 0) === win0 && JSON.stringify(E5.SAVE.records) === rec0 && rt === false);
        MU.setMutatorChoice('cemetery', 'off'); MU.beginRun('cemetery', false); const w1 = E5.SAVE.wallet; E5.levelReward('cemetery', 100, 50, 'test');
        check('variety: the same run without a mutator pays out as before (the gate does not leak into normal runs)', E5.SAVE.wallet > w1 && (E5.SAVE.cemeteryWins || 0) === win0 + 1); MU.endRun();
        check('variety: wired (the run starts BEFORE the level is built with the daily flag, dimming and fog after the lighting, a fresh fog baseline per level, events and ears and whispers read the factors, a terminal button only for allowed levels, a new per-visit seed for the decor)', /beginRun\(L\.levelId, ECO\.dailyOn\(id\)\);[\s\S]*level\.build\(\);/.test(MJ11) && /DREAD\.fogMul = 1;[\s\S]*beginRun/.test(MJ11) && /lighting\.hemi\.intensity \*= mutFactor\('hemi'\)/.test(MJ11) && /scale \/ mutFactor\('events'\)/.test(EV) && /mult \* mutFactor\('hear'\)/.test(AM4) && /\/ mutFactor\('whisper'\)/.test(AM4) && /!d\.daily && MUT_LEVELS\.includes\(d\.rec\)/.test(LV2) && /L\.visit = /.test(MJ11) && ['decals', 'props', 'kit'].every(f => /L\.visit/.test(fs.readFileSync(new URL('../core/' + f + '.js', import.meta.url), 'utf8'))));
    }
done('logic');
