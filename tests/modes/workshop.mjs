// Test własny Warsztatu (core/workshoplogic.js, core/leveldata.js): format mapy, walidacja z osiągalnością, kod i odporność na złośliwe dane.
// Uruchamiany przez levelpack.mjs (poziom 'workshop'), działa też osobno: cd tests && node modes/workshop.mjs
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { check, done } from '../lib.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const W = await import(pathToFileURL(path.join(ROOT, 'core/workshoplogic.js')).href);
const D = await import(pathToFileURL(path.join(ROOT, 'core/leveldata.js')).href);
const T = (s) => 'workshop: ' + s;
// Poprawna trasa: platforma startu na dole siatki, kamienie co 3 pola w górę, meta na końcu
const goodMap = () => ({ v: 1, n: 'Test', b: [[8, 16, 0, 4, 3, 1], [8, 13, 0, 4, 2, 1], [8, 10, 0, 4, 2, 1], [8, 7, 1, 4, 2, 1], [8, 4, 2, 4, 2, 1], [8, 1, 2, 4, 3, 1]], s: [10, 17], f: [10, 2] });

// ---------- osiągalność ----------
check(T('the default map is a valid shape but has no way yet'), (() => { const v = W.validateMap(W.emptyMap()); return !v.ok && v.errors.some(e => /no way/.test(e)); })());
check(T('a connected route is valid and reports hops, length and par'), (() => { const v = W.validateMap(goodMap()); return v.ok && v.stats.blocks === 6 && v.stats.hops === 5 && v.stats.length > 10 && v.stats.par >= 20; })());
check(T('a gap that is too wide breaks the route'), (() => { const m = goodMap(); m.b[2][1] = 8; return !W.validateMap(m).ok && /no way/.test(W.validateMap(m).errors.join()); })());
check(T('a gap of exactly the jump limit is still fine, just over is not'), (() => { const m = { v: 1, n: 'g', b: [[0, 0, 0, 2, 2, 1], [3, 0, 0, 2, 2, 1]], s: [0, 0], f: [4, 0] }; const ok = W.validateMap(m).ok; m.b[1][0] = 4; return ok && !W.validateMap(m).ok; })());
check(T('a step up of 1 m is fine, 2 m is not, any drop is fine'), (() => {
    const up = (h) => W.validateMap({ v: 1, n: 'u', b: [[0, 0, 0, 3, 3, 1], [3, 0, 0 + 1 + (h - 1), 3, 3, 1]], s: [0, 0], f: [4, 1] }).ok;   // druga płyta wyżej o h
    const down = W.validateMap({ v: 1, n: 'd', b: [[0, 0, 9, 3, 3, 1], [3, 0, 0, 3, 3, 1]], s: [0, 0], f: [4, 1] }).ok;
    return up(1) && !up(3) && down;
})());
check(T('the route has to be walkable only forward: unreachable finish above the start is refused'), !W.validateMap({ v: 1, n: 'x', b: [[0, 0, 0, 3, 3, 1], [3, 0, 8, 3, 3, 1]], s: [0, 0], f: [4, 1] }).ok);
check(T('START and FINISH need a block under them and must differ'), (() => { const m = goodMap(); m.s = [0, 0]; const a = W.validateMap(m).errors.join(); const n = goodMap(); n.f = n.s; return /START needs a block/.test(a) && /same cell/.test(W.validateMap(n).errors.join()); })());
check(T('missing START or FINISH is reported'), (() => { const m = goodMap(); m.s = null; m.f = null; const e = W.validateMap(m).errors.join(); return /set the START/.test(e) && /set the FINISH/.test(e); })());

// ---------- edycja ----------
check(T('placeBlock validates size, grid, height, duplicates and the block limit'), (() => {
    let m = goodMap(); const bad = [[-1, 0, 0, 1, 1, 1], [19, 0, 0, 2, 1, 1], [0, 0, 13, 1, 1, 1], [0, 0, 0, 7, 1, 1], [0, 0, 0, 1, 1, 4], [0.5, 0, 0, 1, 1, 1], ['1', 0, 0, 1, 1, 1], [0, 0, 0, 1, 1], null, 'x'];
    const allBad = bad.every(b => W.placeBlock(m, b).error !== null && W.placeBlock(m, b).map === m);
    const dup = W.placeBlock(m, m.b[0]).error === 'already there', ok = W.placeBlock(m, [0, 0, 0, 1, 1, 1]);
    let full = W.emptyMap(); for (let i = 0; i < W.LIM.BLOCKS; i++) full = W.placeBlock(full, [i % 19, (i * 7) % 19, i % 12, 1, 1, 1]).map;
    return allBad && dup && ok.error === null && ok.map.b.length === 7 && goodMap().b.length === 6 && W.placeBlock(full, [0, 19, 12, 1, 1, 1]).error !== null && full.b.length <= W.LIM.BLOCKS;
})());
check(T('eraseAt removes the highest block and drops a START or FINISH that lost its support'), (() => {
    const m = goodMap(); const r = W.eraseAt(m, 10, 17); const none = W.eraseAt(m, 0, 0);
    return r.error === null && r.map.b.length === 5 && r.map.s === null && r.map.f !== null && none.error === 'nothing here' && m.b.length === 6;
})());
check(T('setMark needs a block under the cell'), W.setMark(goodMap(), 's', 0, 0).error !== null && W.setMark(goodMap(), 'f', 9, 14).error === null && W.setMark(goodMap(), 'x', 9, 14).error === 'bad mark' && W.setMark(goodMap(), 's', 99, 0).error !== null);
check(T('topAt finds the highest surface'), W.topAt(goodMap(), 10, 17) === 1 && W.topAt(goodMap(), 10, 3) === 3 && W.topAt(goodMap(), 0, 0) === -1);

// ---------- kod ----------
check(T('encode then decode gives the same map'), (() => { const m = goodMap(), r = W.decodeMap(W.encodeMap(m)); return r.map && JSON.stringify(r.map) === JSON.stringify(m); })());
check(T('a code of a full 80-block map stays small enough to send'), (() => { let m = W.emptyMap(); for (let i = 0; i < 80; i++) m = W.placeBlock(m, [i % 19, (i * 7) % 19, 0, 1, 1, 1]).map; return W.encodeMap(m).length < W.LIM.MAX_CODE; })());
const evil = (obj) => W.encodeMap(Object.assign(goodMap(), obj));
check(T('decode refuses garbage, wrong types, bad characters and oversized codes'), [null, undefined, 5, {}, [], '', '!!!', 'a b', 'x'.repeat(W.LIM.MAX_CODE + 1), '____', 'e30', 'W10'].every(c => W.decodeMap(c).map === null));
check(T('decode refuses valid base64 that is not a valid map'), [evil({ b: 'nope' }), evil({ b: [] }), evil({ b: Array(81).fill([0, 0, 0, 1, 1, 1]) }), evil({ b: [[0, 0, 0, 1.5, 1, 1], [3, 0, 0, 1, 1, 1]] }), evil({ b: [[0, 0, 0, 99, 1, 1], [3, 0, 0, 1, 1, 1]] }), evil({ b: [[-5, 0, 0, 1, 1, 1], [3, 0, 0, 1, 1, 1]] }), evil({ s: null }), evil({ f: [99, 99] }), evil({ b: [['a', 'b', 'c', 'd', 'e', 'f'], [0, 0, 0, 1, 1, 1]] })].every(c => W.decodeMap(c).map === null));
check(T('decode ignores extra fields and cleans the name'), (() => { const r = W.decodeMap(evil({ n: '<script>alert(1)</script>very long name here', hax: { x: 1 }, __proto__: { polluted: 1 } })); return r.map && !('hax' in r.map) && /^[A-Za-z0-9 _-]{1,16}$/.test(r.map.n) && ({}).polluted === undefined; })());
check(T('fuzz: random garbage never throws and never yields a map'), (() => {
    let seed = 7; const rnd = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; }; let bad = 0;
    for (let i = 0; i < 400; i++) { const len = 1 + Math.floor(rnd() * 80), s = Array.from({ length: len }, () => 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'[Math.floor(rnd() * 64)]).join(''); try { if (W.decodeMap(s).map !== null) bad++; } catch (e) { bad++; } }
    return bad === 0;
})());
check(T('fuzz: mutated valid codes are either refused or valid maps (never half-valid)'), (() => {
    const code = W.encodeMap(goodMap()); let seed = 3; const rnd = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; }; let bad = 0;
    for (let i = 0; i < 300; i++) { const k = Math.floor(rnd() * code.length), c = 'AZaz09-_'[Math.floor(rnd() * 8)], m = code.slice(0, k) + c + code.slice(k + 1); try { const r = W.decodeMap(m); if (r.map && !W.validateMap(r.map).ok) bad++; } catch (e) { bad++; } }
    return bad === 0;
})());

// ---------- świat gry ----------
check(T('levelOf puts the start at x 0, z 3 and the finish ahead (smaller z)'), (() => { const l = W.levelOf(goodMap()); return l.spawn[0] === 0 && l.spawn[2] === 3 && l.spawn[1] === 1.9 && l.finish.z < l.spawn[2] && l.blocks.length === 6 && l.bounds.minZ < l.finish.z && l.bounds.maxZ > 3; })());
check(T('the finish check is radial and needs the right height'), (() => { const l = W.levelOf(goodMap()), f = l.finish; return W.atFinish({ x: f.x, y: f.y + 0.9, z: f.z }, f) && !W.atFinish({ x: f.x + 3, y: f.y + 0.9, z: f.z }, f) && !W.atFinish({ x: f.x, y: f.y - 1, z: f.z }, f) && !W.atFinish({ x: f.x, y: f.y + 9, z: f.z }, f) && W.atFinish({ x: f.x + 3, y: f.y + 0.9, z: f.z }, f, 4); })());
check(T('par grows with the length of the route'), W.parOf(goodMap()) > W.parOf({ v: 1, n: 's', b: [[0, 0, 0, 3, 3, 1], [3, 0, 0, 3, 3, 1]], s: [0, 0], f: [4, 1] }));

// ---------- przekazywanie danych hosta do gości ----------
D.register('t1', () => ({ a: 1 }), (raw) => typeof raw.a === 'number' ? { a: raw.a } : null);
D.register('boom', () => { throw new Error('x'); }, () => { throw new Error('y'); });
D.register('big', () => ({ s: 'x'.repeat(D.MAX_BYTES + 1) }), (r) => r);
check(T('leveldata: payload is what the provider returns, nothing for unknown, throwing or oversized providers'), JSON.stringify(D.payload('t1')) === '{"a":1}' && D.payload('nope') === undefined && D.payload('boom') === undefined && D.payload('big') === undefined);
check(T('leveldata: accept goes only through the validator and refuses junk, throwing validators and oversized data'), D.accept('t1', { a: 5, evil: 1 }).a === 5 && !('evil' in D.accept('t1', { a: 5, evil: 1 })) && D.accept('t1', { a: 'x' }) === null && D.accept('t1', null) === null && D.accept('t1', undefined) === null && D.accept('nope', { a: 1 }) === null && D.accept('boom', { a: 1 }) === null && D.accept('big', { s: 'x'.repeat(D.MAX_BYTES + 1) }) === null);
check(T('leveldata: a circular object does not crash it'), (() => { const o = {}; o.o = o; return D.accept('t1', o) === null; })());

// ---------- integracja: zapis i tryb ----------
const store = fs.existsSync(path.join(ROOT, 'core/workshopstore.js')) ? fs.readFileSync(path.join(ROOT, 'core/workshopstore.js'), 'utf8') : '';
const custom = fs.existsSync(path.join(ROOT, 'levels/custom.js')) ? fs.readFileSync(path.join(ROOT, 'levels/custom.js'), 'utf8') : '';
check(T('the store registers the map with the validator (decodeMap) as the only way in'), /register\('custom'/.test(store) && /decodeMap\(/.test(store));
const rm = fs.readFileSync(path.join(ROOT, 'core/racemode.js'), 'utf8'), rmLine = rm.split('\n').find(l => /outcomeReward\(o, REWARD/.test(l)) || '';
check(T('the race factory turns off the par reward too when reward is 0'), /outcomeReward\(o, REWARD, REWARD === 0 \? 0 : 150\)/.test(rmLine));
check(T('the race factory still pays the reward (levelReward call is code, not inside a comment)'), /levelReward\(cfg\.id, reward, reward/.test(rmLine) && rmLine.indexOf('//') < 0);
check(T('the custom race never pays out Bagabucks and never writes records'), /reward:\s*0/.test(custom) && /noRecord:\s*true/.test(custom));
const mainJs = fs.readFileSync(path.join(ROOT, 'main.js'), 'utf8');
check(T('the custom race reads the map only from validated data (LEVEL_DATA) or the local store'), /LEVEL_DATA\.current/.test(custom) && /currentMap\(\)/.test(custom) && /demoMap\(\)/.test(custom));
check(T('main.js passes level data from the network only through the level validator'), /LEVEL_DATA\.current = opts\.data !== undefined \? levelAccept\(id, opts\.data\)/.test(mainJs) && /data: c\.data/.test(mainJs) && /levelPayload\(id\)/.test(mainJs));
if (process.argv[1] && process.argv[1].endsWith('workshop.mjs')) done('workshop');
