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

done('logic');
