// Test własny Hot Potato i botów uzupełniających (core/botcrew.js): polityka liczby botów, dane z sieci, zachowania i integracja w potato.js.
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { check } from '../lib.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const B = await import(pathToFileURL(path.join(ROOT, 'core/botcrew.js')).href);
const T = (s) => 'potato: ' + s;

// ---------- ile botów ----------
check(T('bots fill the room up to 4 players (3, 2, 1, 0 bots for 1, 2, 3, 4 humans)'), [1, 2, 3, 4].map(h => B.botsNeeded('potato', h)).join() === '3,2,1,0');
check(T('a full or bigger room gets no bots, and broken counts get none either'), B.botsNeeded('potato', 5) === 0 && B.botsNeeded('potato', 10) === 0 && [NaN, Infinity, -1, '2', null, undefined, {}].every(h => B.botsNeeded('potato', h) === 0));
check(T('0 humans would be capped by the bot limit'), B.botsNeeded('potato', 0) === 3);
check(T('modes without a fill entry never get bots'), B.botsNeeded('koth', 1) === 0 && B.botsNeeded('', 1) === 0 && B.botsNeeded(undefined, 1) === 0 && B.botsNeeded('__proto__', 1) === 0);
check(T('fractional human counts are floored'), B.botsNeeded('potato', 1.9) === 3);
check(T('bot ids are recognised and humans are filtered out'), B.isBotId('b0') && B.isBotId('b12') && !B.isBotId('me') && !B.isBotId('bagaboo-peer') && !B.isBotId(null) && !B.isBotId('b') && !B.isBotId('b123') && JSON.stringify(B.humansIn(['me', 'b0', 'abc', 'b2'])) === '["me","abc"]');
check(T('bots make the reward smaller'), B.rewardWithBots(0, 200, 150) === 200 && B.rewardWithBots(2, 200, 150) === 150);
check(T('bots start spread along x around the middle'), B.spawnX(0, 3) === -8 && B.spawnX(1, 3) === 0 && B.spawnX(2, 3) === 8 && B.spawnX(0, 1) === 0 && B.spawnX(0, 2) === -4);

// ---------- dane z sieci ----------
const bots = [{ x: 1.234, z: -5.678, dir: 0.4567 }, { x: -3, z: 4, dir: 2 }];
check(T('bot positions survive a round trip through the message'), JSON.stringify(B.decodeBots(B.encodeBots(bots), 3, 15)) === JSON.stringify([[1.2, -5.7, 0.46], [-3, 4, 2]]));
check(T('a guest takes at most max bots'), B.decodeBots([[0, 0, 0], [1, 1, 1], [2, 2, 2], [3, 3, 3]], 3, 15).length === 3 && B.decodeBots([[0, 0, 0]], 0, 15).length === 0);
check(T('a guest clamps far-away positions to the arena'), JSON.stringify(B.decodeBots([[999, -999, 1]], 3, 15)) === '[[15,-15,1]]');
check(T('a guest refuses garbage'), [null, undefined, 5, 'x', {}, [[NaN, 0, 0]], [[0, Infinity, 0]], [['1', 2, 3]], [[1, 2]], [null], [[1, 2, 3], [NaN, 0, 0]]].every(raw => { const r = B.decodeBots(raw, 3, 15); return Array.isArray(r) && r.every(e => e.length === 3 && e.every(Number.isFinite)); }));
check(T('garbage after a valid bot cuts the list instead of trusting the rest'), B.decodeBots([[1, 1, 1], [NaN, 0, 0], [2, 2, 2]], 3, 15).length === 1);

// ---------- zachowania ----------
check(T('nearestTo picks the closest and ignores broken entries'), (() => { const n = B.nearestTo({ x: 0, z: 0 }, [{ x: 5, z: 0 }, null, { x: NaN, z: 0 }, { x: 1, z: 1 }, { x: -9, z: 9 }]); return n.x === 1 && B.nearestTo({ x: 0, z: 0 }, []) === null; })());
const BND = { minX: -13, maxX: 13, minZ: -9, maxZ: 13 };
check(T('fleePoint runs away from the threat and stays inside the bounds'), (() => { const f = B.fleePoint({ x: 0, z: 0 }, { x: 3, z: 0 }, BND); const w = B.fleePoint({ x: 12, z: 12 }, { x: 0, z: 0 }, BND); return f.x < 0 && Math.abs(f.z) < 1e-9 && w.x === 13 && w.z === 13; })());
check(T('fleePoint copes with a threat standing on the bot'), (() => { const f = B.fleePoint({ x: 1, z: 1 }, { x: 1, z: 1 }, BND); return Number.isFinite(f.x) && Number.isFinite(f.z); })());
check(T('wanderPoint stays close to the bot'), (() => { const w = B.wanderPoint({ x: 3, z: 3 }, 10, 1); return Math.hypot(w.x - 3, w.z - 3) <= 2.9; })());

// ---------- integracja w potato.js ----------
const src = fs.readFileSync(path.join(ROOT, 'levels/potato.js'), 'utf8');
check(T('the host asks the policy how many bots to add'), /botsNeeded\('potato', parts\.length\)/.test(src));
check(T('bot positions travel to guests through encodeBots and are read back only through decodeBots'), /bp: encodeBots\(/.test(src) && /decodeBots\(raw, S\.nbots, A\)/.test(src) && !/msg\.bp\[/.test(src));
check(T('the bot count from the network is clamped'), /Math\.min\(3, msg\.nb \| 0\)/.test(src));
check(T('a round with only bots left ends'), /humansIn\(\[\.\.\.S\.alive\]\)\.length === 0/.test(src));
check(T('the reward is smaller when bots played'), /rewardWithBots\(S\.nbots, REWARD, 150\)/.test(src));
check(T('guests draw bots from the message, not from their own logic'), /smoothBots\(dt\)/.test(src) && /i < S\.nbots && b\.st/.test(src));
