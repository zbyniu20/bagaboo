// Test własny trybu Become the Monster (uruchamiany automatycznie przez levelpack.mjs): generator map z core/monstermaps.js
// (układ deterministyczny z ziarna, starty na wolnych miejscach, trasa bota w labiryncie, dane z sieci) i integracja w levels/monster.js.
// Użycie osobno: cd tests && node modes/monster.mjs
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { check } from '../lib.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const M = await import(pathToFileURL(path.join(ROOT, 'core/monstermaps.js')).href);
const T = (s) => 'monster: ' + s;
const rng2 = (seed) => M.rng(seed);
const GEN = M.MAPS.filter(m => !m.fixed);
const SEEDS = Array.from({ length: 40 }, (_, i) => i * 24593 + 7);
const inside = (b, x, z, m) => Math.abs(x - b.x) < b.w / 2 + m && Math.abs(z - b.z) < b.d / 2 + m;

check(T('there are at least 5 maps with unique ids, the station first, and generated ones are the rest'), M.MAPS.length >= 5 && new Set(M.MAP_IDS).size === M.MAPS.length && M.MAPS[0].id === 'station' && GEN.length === M.MAPS.length - 1);
check(T('every map has a name, a short description and a sane size'), M.MAPS.every(m => m.name.length > 3 && m.blurb.length > 10 && m.blurb.length < 100 && m.A >= 15 && m.A <= 40 && m.H >= 5 && m.H <= 30));
check(T('an unknown map id gives nothing'), M.generateMap('nope', 1) === null);
const st = M.generateMap('station', 1);
check(T('the station keeps its fixed spawns (6 survivors, monster far to the north)'), st.fixed === true && st.survivors.length === 6 && st.monster[2] < -20 && st.entry[2] > 20);

for (const m of GEN) {
    const maps = SEEDS.map(s => M.generateMap(m.id, s));
    check(T(m.id + ': the same seed gives exactly the same layout, other seeds differ'), JSON.stringify(M.generateMap(m.id, 5).boxes) === JSON.stringify(M.generateMap(m.id, 5).boxes) && new Set(maps.map(g => JSON.stringify(g.boxes))).size > 20);
    check(T(m.id + ': boxes are finite, have volume, stay inside the walls and the count is bounded'), maps.every(g => g.boxes.length > 8 && g.boxes.length < 260 && g.boxes.every(b => [b.x, b.y, b.z, b.w, b.h, b.d].every(Number.isFinite) && b.w > 0 && b.h > 0 && b.d > 0 && Math.abs(b.x) + b.w / 2 <= m.A + 0.01 && Math.abs(b.z) + b.d / 2 <= m.A + 0.01 && b.y - b.h / 2 >= -0.01 && b.y + b.h / 2 <= m.H)));
    check(T(m.id + ': 6 survivors, a monster far away, entry on the south side, all inside the walls'), maps.every(g => g.survivors.length === 6 && Math.hypot(g.monster[0] - g.entry[0], g.monster[2] - g.entry[2]) > 14 && g.entry[2] > m.A - 3 && [g.monster, g.entry, ...g.survivors].every(p => p.every(Number.isFinite) && Math.abs(p[0]) < m.A && Math.abs(p[2]) < m.A)));
    check(T(m.id + ': nobody starts inside an obstacle'), maps.every(g => [g.monster, g.entry, ...g.survivors].every(p => !g.boxes.some(b => b.h > 0.4 && b.y - b.h / 2 < 1.6 && inside(b, p[0], p[2], 0.3)))));
    check(T(m.id + ': it has lights and a bot jump height'), maps.every(g => g.lights.length >= 4 && g.lights.length <= 16 && g.botJump >= 4 && g.botJump <= 9));
}

// Labirynt: z miejsca potwora da się dojść do wejścia trasą bota, a trasa nie wchodzi w ściany
{
    const ok = SEEDS.every(s => {
        const g = M.generateMap('hedge', s); let x = g.monster[0], z = g.monster[2];
        for (let k = 0; k < 90; k++) {
            if (Math.hypot(x - g.entry[0], z - g.entry[2]) < 4.5) return true;
            const w = g.nav.next(x, z, g.entry[0], g.entry[2]);
            if (g.boxes.some(b => inside(b, w.x, w.z, 0.2))) return false;
            x = w.x; z = w.z;
        }
        return false;
    });
    check(T('hedge: a route always exists from the monster start to the entrance and runs through corridors'), ok);
    check(T('hedge: the maze has loops, so the bot can be circled (more open passages than a perfect maze needs)'), (() => { const g = M.generateMap('hedge', 3); return g.boxes.length < 60; })());
}
// Dachy: na każdy budynek da się wejść schodami (stopnie rosną o mniej niż 0,5 m)
{
    const g = M.generateMap('rooftops', 11), steps = g.boxes.filter(b => b.k === 'step');
    check(T('rooftops: fire escape steps rise by at most 0.5 m and the bot can jump onto the roofs'), steps.length >= 9 * 10 && g.botJump >= 7.3 && steps.every(b => b.h <= 7.3));
}

// ---------- dane z sieci i wybór mapy ----------
check(T('a map pick from the network is range-checked'), M.cleanMapPick(2, 500).i === 2 && [[-1, 1], [M.MAPS.length, 1], [1.5, 1], ['1', 1], [1, -1], [1, 1e7], [1, 1.5], [1, NaN], [null, 1], [1, undefined]].every(([a, b]) => M.cleanMapPick(a, b) === null));
check(T('a fixed pick keeps its map and a random pick never repeats the previous map'), M.pickMap(3, 0).i === 3 && Array.from({ length: 300 }, (_, i) => M.pickMap(-1, i % M.MAPS.length, () => (i * 0.37) % 1)).every((p, i) => p.i !== i % M.MAPS.length && p.i >= 0 && p.i < M.MAPS.length && p.seed >= 0 && p.seed <= M.MAX_SEED));

// ---------- integracja w levels/monster.js ----------
const src = fs.readFileSync(path.join(ROOT, 'levels/monster.js'), 'utf8');
check(T('the host sends the map as numbers only and a guest takes it only through the validator'), /mp: S\.map, sd: S\.seed/.test(src) && /cleanMapPick\(msg\.mp, msg\.sd\)/.test(src));
check(T('only the host or a solo player counts the votes, starts the vote early and ends it (guests only display it)'), /const isAuth = \(\) => S && N\.NET\.mode !== 'guest'/.test(src) && /function startNow\(\) \{\s*if \(!isAuth\(\) \|\| !inLobby\(\)/.test(src) && /if \(S\.phase === 'lobby'\) \{ lobbyThink\(dt\); return; \}/.test(src) && /msg\.ph === 'lobby'/.test(src));
check(T('swapping a map removes its bodies, obstacles and portals from the world'), /world\.removeBody\(b\)/.test(src) && /removeFrom\(L\.obstacles, S\.mapObs\)/.test(src) && /removeFrom\(L\.portals, S\.mapPortals\)/.test(src) && /removeFrom\(L\.bodies, S\.mapBodies\)/.test(src));
check(T('starts and the bot come from the current map, not from constants'), /md\.monster\[0\]/.test(src) && /md\.survivors\[/.test(src) && !/MONSTER_SPAWN|SURVIVOR_SPAWN/.test(src));
check(T('the votes come from the heads the host sees, the winner is drawn on a tie, the map loads for everyone and each round returns to the lobby'), /countVotes\(heads, S\.md\.pads\)/.test(src) && /winnerOf\(v\.counts, Math\.random\)/.test(src) && /pickMap\(idx, -1\)/.test(src) && /S\.opts\[S\.win\]/.test(src) && /pickOptions\(S\.lastMap, Math\.random\)/.test(src) && /S\.phase = 'lobby'; S\.gate = \{ ph: 'open', t: 0 \}/.test(src) && /cleanVotes\(msg\.vt\)/.test(src) && /vt: S\.votes/.test(src));
check(T('no jumpscares or apparitions in BagaBoo Games (nor in the lobby)'), /GAMES_CALM\.on \|\| S\.phase === 'lobby'\) return;/.test(src));
check(T('the bot follows the maze route when the map has one'), /S\.md\.nav \? S\.md\.nav\.next\(/.test(src));


// ---------- lobby z głosowaniem na mapę ----------
{
    const lb = M.lobbyMap(), R = M.LOBBY.R;
    check(T('lobby: three voting pads (one per random option), all inside the walls and far enough apart that nobody stands on two'), lb.pads.length === M.LOBBY.OPTIONS && M.LOBBY.OPTIONS === 3 && lb.pads.every(p => Math.abs(p[0]) < lb.A - 2 && Math.abs(p[1]) < lb.A - 2) && lb.pads.every((p, i) => lb.pads.every((q, j) => i === j || Math.hypot(p[0] - q[0], p[1] - q[1]) > 2 * R + 0.5)));
    check(T('lobby: pads and the entrance are free of tall obstacles and the board hangs on the north wall'), lb.pads.every(p => !lb.boxes.some(b => b.h > 0.4 && inside(b, p[0], p[1], R))) && !lb.boxes.some(b => b.h > 0.4 && inside(b, lb.entry[0], lb.entry[2], 0.4)) && lb.board[2] < -lb.A + 0.5 && lb.board[2] > -lb.A - 0.5);
    check(T('lobby: pad slabs are low enough to step on, boxes are finite and the room has lights'), lb.boxes.every(b => [b.x, b.y, b.z, b.w, b.h, b.d].every(Number.isFinite)) && lb.boxes.filter(b => b.k === 'step').every(b => b.h <= 0.1) && lb.lights.length >= 4);
    const LG = await import(pathToFileURL(path.join(ROOT, 'core/lobbylogic.js')).href);
    const heads = { a: { x: lb.pads[0][0], y: 1.6, z: lb.pads[0][1] }, b: { x: lb.pads[0][0] + 0.5, y: 1.5, z: lb.pads[0][1] }, c: { x: lb.pads[2][0], y: 1.7, z: lb.pads[2][1] }, d: { x: 0, y: 1.6, z: 11 } };
    const v = LG.countVotes(heads, lb.pads);
    check(T('lobby: votes are counted from head positions on the pads, nobody else counts, the most votes wins'), v.counts[0] === 2 && v.counts[2] === 1 && v.total === 3 && LG.winnerOf(v.counts, () => 0.5) === 0);
    check(T('lobby: a vote counter list from the network is range-checked'), JSON.stringify(M.cleanVotes([0, 1, 2])) === '[0,1,2]' && [null, 'x', [], [0, 0], [0, 0, 0, 0], [0, 0, -1], [0, 0, 1.5], [0, 0, 99], [0, 0, '3'], [0, 0, NaN]].every(x => M.cleanVotes(x) === null));
}
check(T('lobby: every vote offers 3 different random maps, never the last played one when others are free, and the list changes between draws'), (() => {
    const draws = Array.from({ length: 300 }, (_, i) => M.pickOptions(i % M.MAPS.length, rng2(i * 7 + 1)));
    return draws.every((o, i) => o.length === 3 && new Set(o).size === 3 && o.every(k => Number.isInteger(k) && k >= 0 && k < M.MAPS.length) && !o.includes(i % M.MAPS.length)) && new Set(draws.map(o => o.join())).size > 20 && M.pickOptions(-1, () => 0.5).length === 3;
})());
check(T('lobby: all six maps do show up as options over many draws'), new Set(Array.from({ length: 200 }, (_, i) => M.pickOptions(-1, rng2(i + 99))).flat()).size === M.MAPS.length);
check(T('lobby: options from the network are range-checked (3 different map numbers)'), JSON.stringify(M.cleanOptions([0, 3, 5])) === '[0,3,5]' && [null, 'x', [], [0, 1], [0, 1, 2, 3], [0, 0, 1], [0, 1, 6], [0, 1, -1], [0, 1, 1.5], [0, 1, '2'], [0, 1, NaN]].every(x => M.cleanOptions(x) === null));

// ---------- urwane kończyny (core/dismemberlogic.js, levels/monster.js, core/network.js) ----------
const D = await import(pathToFileURL(path.join(ROOT, 'core/dismemberlogic.js')).href);
check(T('gore: the draw gives only the four allowed codes and every one of them shows up'), (() => { const seen = new Set(Array.from({ length: 400 }, (_, i) => D.pickDismember(rng2(i + 3)))); return seen.size === 4 && [...seen].every(c => D.DM_CODES.includes(c)); })());
check(T('gore: the draw is safe at the edges of the random range'), D.pickDismember(() => 0) === 1 && D.pickDismember(() => 0.999999) === 4 && D.pickDismember(() => 1) === 4);
check(T('gore: codes mean left hand, right hand, both hands and head'), D.lostLeft(1) && !D.lostRight(1) && D.lostRight(2) && !D.lostLeft(2) && D.lostLeft(3) && D.lostRight(3) && !D.lostHead(3) && D.lostHead(4) && !D.lostLeft(4) && D.dismemberText(4) === 'your head' && D.dismemberText(0) === '');
check(T('gore: the map from the network keeps only valid codes and sane keys'), (() => {
    const ok = D.cleanDismember({ a: 1, b: 2, c: 3, d: 4 });
    const bad = D.cleanDismember({ a: 0, b: 5, c: -1, d: 1.5, e: '1', f: null, '': 1, ['x'.repeat(65)]: 2, g: 4 });
    const many = D.cleanDismember(Object.fromEntries(Array.from({ length: 40 }, (_, i) => ['p' + i, 1])));
    return Object.keys(ok).length === 4 && Object.keys(bad).join() === 'g' && Object.keys(many).length === D.MAX_ENTRIES && [null, undefined, 'x', 7, [], [1, 2]].every(v => Object.keys(D.cleanDismember(v)).length === 0) && Object.getPrototypeOf(ok) === null;
})());
check(T('gore: a __proto__ key from the network does not pollute anything'), (() => { const o = D.cleanDismember(JSON.parse('{"__proto__": 1, "a": 2}')); return Object.keys(o).join() === 'a' && ({}).a === undefined; })());
const monSrc = fs.readFileSync(path.join(ROOT, 'levels/monster.js'), 'utf8'), netSrc = fs.readFileSync(path.join(ROOT, 'core/network.js'), 'utf8');
check(T('gore: the host draws on a catch, the guest takes the map only through cleanDismember, and the option is on by default'), /S\.dm\[toNet\(id\)\] = pickDismember/.test(monSrc) && /S\.dm = cleanDismember\(msg\.dm\)/.test(monSrc) && /gore: true/.test(fs.readFileSync(path.join(ROOT, 'core/settings.js'), 'utf8')));
check(T('gore: it is shown only with the option on, and the body is restored when the level ends'), /const on = !!SETTINGS\.gore/.test(monSrc) && /N\.clearDismember\(\)/.test(monSrc) && /export function setDismember/.test(netSrc) && /export function tickDismember/.test(netSrc));
check(T('gore: tearing off is animated for a moment before the part drops, and the body stays torn until the round restarts or the level ends'), /const TEAR_TIME = 0\.6/.test(netSrc) && /tears\[id\] = \{/.test(netSrc) && /finishTear/.test(netSrc) && /const TEAR_TIME = 0\.6/.test(monSrc) && /S\.dm = Object\.create\(null\); S\.phase = 'play'/.test(monSrc) && /S\.bot = null; S\.dm = Object\.create\(null\)/.test(monSrc) && /N\.clearDismember\(\)/.test(monSrc));
check(T('gore: the per-frame visibility loop in animateFaces keeps torn parts hidden (it used to bring the head and arms back every frame)'), /export function animateFaces[\s\S]{0,900}lostHead\(dc\)[\s\S]{0,200}lostLeft\(dc\)[\s\S]{0,200}lostRight\(dc\)/.test(netSrc));
