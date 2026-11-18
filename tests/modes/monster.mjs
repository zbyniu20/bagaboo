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
check(T('only the host or a solo player changes the map, and only while waiting'), /const canPickMap = \(\) => S && N\.NET\.mode !== 'guest' && S\.phase === 'wait'/.test(src) && /function chooseMap\(sel\) \{\s*if \(!canPickMap\(\)\) return;/.test(src));
check(T('swapping a map removes its bodies, obstacles and portals from the world'), /world\.removeBody\(b\)/.test(src) && /removeFrom\(L\.obstacles, S\.mapObs\)/.test(src) && /removeFrom\(L\.portals, S\.mapPortals\)/.test(src) && /removeFrom\(L\.bodies, S\.mapBodies\)/.test(src));
check(T('starts and the bot come from the current map, not from constants'), /md\.monster\[0\]/.test(src) && /md\.survivors\[/.test(src) && !/MONSTER_SPAWN|SURVIVOR_SPAWN/.test(src));
check(T('the round waits for START on the map board, the host announces the hold and START is host-only'), /hold: N\.NET\.mode !== 'guest'/.test(src) && /S\.phase === 'wait' && S\.hold\) \{ S\.holdT -= dt/.test(src) && /hd: S\.hold \? 1 : 0/.test(src) && /function startRound\(\) \{\s*if \(!canPickMap\(\)\) return;/.test(src));
check(T('the bot follows the maze route when the map has one'), /S\.md\.nav \? S\.md\.nav\.next\(/.test(src));
