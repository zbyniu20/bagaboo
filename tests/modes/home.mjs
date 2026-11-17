// Test własny Mojego Pokoju (core/homelogic.js): katalog, zakup, ustawianie, normalizacja zapisu, dane odwiedzin od hosta i integracja.
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { check } from '../lib.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const H = await import(pathToFileURL(path.join(ROOT, 'core/homelogic.js')).href);
const T = (s) => 'home: ' + s;

// ---------- katalog i miejsca ----------
check(T('the catalog has unique ids, positive whole prices and a name'), new Set(H.FURNITURE.map(f => f.id)).size === H.FURNITURE.length && H.FURNITURE.every(f => Number.isInteger(f.price) && f.price > 0 && f.name.length > 0));
check(T('there are 8 spots, all inside the room, away from the walls and apart from each other'), H.SLOTS.length === 8 && H.SLOTS.every(([x, z]) => Math.abs(x) <= H.ROOM.W - 1.5 && Math.abs(z) <= H.ROOM.D - 1.5) && H.SLOTS.every((a, i) => H.SLOTS.every((b, j) => i === j || Math.hypot(a[0] - b[0], a[1] - b[1]) > 2.5)));
check(T('no spot blocks the spawn (0, 5.6) or the screen wall'), H.SLOTS.every(([x, z]) => Math.hypot(x, z - 5.6) > 1.5 && z > -5.6));
check(T('every piece fits a price a player can reach (cheapest under 300, dearest at most 2000)'), Math.min(...H.FURNITURE.map(f => f.price)) < 300 && Math.max(...H.FURNITURE.map(f => f.price)) <= 2000);

// ---------- zakup i ustawianie ----------
const home = (owned, slots) => ({ owned: owned, slots: H.SLOTS.map((_, i) => (slots && slots[i]) || null) });
check(T('buying needs the money and an unknown or owned piece is refused'), H.canBuy(H.emptyHome(), 1000, 'couch').ok && !H.canBuy(H.emptyHome(), 599, 'couch').ok && H.canBuy(H.emptyHome(), 599, 'couch').reason === 'poor' && H.canBuy(home(['couch']), 9999, 'couch').reason === 'owned' && H.canBuy(H.emptyHome(), 9999, 'sofa').reason === 'unknown');
check(T('a broken wallet never buys anything'), [NaN, Infinity, -5, '9999', null, undefined, {}].every(w => !H.canBuy(H.emptyHome(), w, 'plant').ok || w === Infinity));
check(T('buy adds the piece once and leaves the input alone'), (() => { const h = H.emptyHome(), b = H.buy(h, 'lamp'), b2 = H.buy(b, 'lamp'); return b.owned.join() === 'lamp' && b2.owned.length === 1 && h.owned.length === 0 && H.buy(h, 'nope').owned.length === 0; })());
check(T('place puts an owned piece in a spot and moves it if it stood elsewhere'), (() => { let h = home(['plant', 'lamp']); h = H.place(h, 2, 'plant').home; h = H.place(h, 5, 'plant').home; return h.slots[5] === 'plant' && h.slots[2] === null; })());
check(T('place refuses a piece that is not owned, a bad spot and a bad id'), (() => { const h = home(['plant']); return H.place(h, 0, 'couch').error === 'not owned' && [-1, 8, 1.5, '1', NaN, null].every(s => H.place(h, s, 'plant').error === 'bad slot') && H.place(h, 0, 'plant').error === null; })());
check(T('place with null empties a spot'), (() => { let h = home(['plant'], ['plant']); h = H.place(h, 0, null).home; return h.slots[0] === null && h.owned.length === 1; })());
check(T('place keeps the input untouched'), (() => { const h = home(['plant']); const r = H.place(h, 3, 'plant'); return h.slots[3] === null && r.home.slots[3] === 'plant'; })());

// ---------- normalizacja zapisu (ręcznie zmieniony zapis nie daje mebli) ----------
check(T('normalizeHome drops unknown pieces, duplicates and pieces placed but not owned'), (() => {
    const n = H.normalizeHome({ owned: ['plant', 'plant', 'sofa', 7, null, 'lamp'], slots: ['couch', 'plant', 'plant', 'lamp', 'zzz', null, 5, undefined] });
    return n.owned.join() === 'plant,lamp' && n.slots.join() === ',plant,,lamp,,,,' && n.slots.length === 8;
})());
check(T('normalizeHome copes with garbage input'), [null, undefined, 5, 'x', [], {}, { owned: 'x', slots: 5 }, { owned: {}, slots: {} }].every(r => { const n = H.normalizeHome(r); return Array.isArray(n.owned) && n.slots.length === 8 && n.slots.every(s => s === null || H.isFurniture(s)); }));
check(T('normalizeHome ignores prototype tricks and extra fields'), (() => { const n = H.normalizeHome({ owned: ['plant'], slots: [], __proto__: { x: 1 }, wallet: 99999, bonus: 'free' }); return !('wallet' in n) && !('bonus' in n) && n.owned.length === 1; })());
check(T('a normalized home is stable (normalizing twice changes nothing)'), (() => { const a = H.normalizeHome({ owned: ['plant', 'lamp'], slots: ['lamp', 'plant'] }); return JSON.stringify(H.normalizeHome(a)) === JSON.stringify(a); })());

// ---------- odwiedziny ----------
check(T('the visit payload carries only the layout, a clean owner name and a clamped count'), (() => { const p = H.visitPayload(home(['plant', 'couch'], ['couch']), '<b>Zed</b>', 1e9); return p.s[0] === 'couch' && p.o === 'bZedb' && p.a === 999 && !('owned' in p); })());
check(T('a guest accepts a valid layout'), (() => { const a = H.acceptVisit(H.visitPayload(home(['plant'], ['plant']), 'Anna', 12)); return a.owner === 'Anna' && a.slots[0] === 'plant' && a.ach === 12; })());
check(T('a guest refuses or cleans evil layouts'), (() => {
    const bad = [null, undefined, 5, 'x', {}, { s: 'nope' }, { s: {} }].every(r => H.acceptVisit(r) === null);
    const evil = H.acceptVisit({ o: '<script>x</script>'.repeat(5), s: ['<img>', 'plant', 'plant', 7, null, 'couch', 'rm -rf', 'lamp', 'extra', 'extra2'], a: -4 });
    return bad && evil.slots.length === 8 && evil.slots.join() === ',plant,,,,couch,,lamp' && /^[A-Za-z0-9_-]{1,16}$/.test(evil.owner) && evil.ach === 0;
})());
check(T('a guest layout never lists a piece twice'), (() => { const a = H.acceptVisit({ s: Array(8).fill('couch') }); return a.slots.filter(s => s === 'couch').length === 1; })());
check(T('fuzz: random layouts always come out valid'), (() => {
    let seed = 11; const rnd = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; }; const pool = [...H.FURNITURE.map(f => f.id), 'x', 5, null, undefined, {}, '', 'plant'];
    for (let i = 0; i < 300; i++) { const a = H.acceptVisit({ o: Math.random() > 0.5 ? 'A' : 7, s: Array.from({ length: Math.floor(rnd() * 12) }, () => pool[Math.floor(rnd() * pool.length)]), a: rnd() * 2000 - 500 }); if (a && (a.slots.length !== 8 || new Set(a.slots.filter(Boolean)).size !== a.slots.filter(Boolean).length || a.slots.some(s => s !== null && !H.isFurniture(s)))) return false; }
    return true;
})());

// ---------- trofea ----------
check(T('records are formatted as times or scores, missing ones as null'), H.fmtRecord({ score: false }, 151.25) === '2:31.3' && H.fmtRecord({ score: false }, 9.04) === '0:09.0' && H.fmtRecord({ score: true }, 42.9) === '42' && [0, -1, NaN, null, undefined, 'x'].every(v => H.fmtRecord({}, v) === null));
check(T('plaques list the achievements first and only records the player has'), (() => { const l = H.plaques(5, 40, [{ id: 'a', name: 'A', score: false }, { id: 'b', name: 'B', score: true }, { id: 'c', name: 'C' }], { a: 61, c: 0 }); return l[0] === 'Achievements 5 / 40' && l.length === 2 && l[1] === 'A: 1:01.0'; })());
check(T('plaques are capped'), H.plaques(0, 1, Array.from({ length: 30 }, (_, i) => ({ id: 'r' + i, name: 'R' + i })), Object.fromEntries(Array.from({ length: 30 }, (_, i) => ['r' + i, 5])), 6).length === 7);
check(T('one cup per 3 achievements, at most 10, never negative or NaN'), H.cupsFor(0) === 0 && H.cupsFor(2) === 0 && H.cupsFor(3) === 1 && H.cupsFor(29) === 9 && H.cupsFor(500) === 10 && [NaN, -9, null, undefined, 'x'].every(v => H.cupsFor(v) === 0));

// ---------- integracja ----------
const read = (p) => fs.existsSync(path.join(ROOT, p)) ? fs.readFileSync(path.join(ROOT, p), 'utf8') : '';
const store = read('core/homestore.js'), lvl = read('levels/home.js'), door = read('levels/lobby-door.js'), eco = read('core/economy.js'), main = read('main.js');
check(T('the store reads the home only through normalizeHome and buys only through canBuy and spendBones'), /normalizeHome\(SAVE\.home\)/.test(store) && /canBuy\(h, SAVE\.wallet, id\)/.test(store) && /spendBones\(/.test(store));
check(T('the store registers the layout for guests with the validator'), /register\('home'/.test(store) && /acceptVisit\(raw\)/.test(store));
check(T('a visit is read-only: no buy or place buttons are drawn for a visitor'), /if \(S\.visit\) \{[\s\S]{0,900}return;\s*\}/.test(lvl) && !/placeFurniture\(/.test(lvl.split('if (S.visit) {')[1].split('return;')[0]));
check(T('the home level reads visitor data only from LEVEL_DATA (validated)'), /LEVEL_DATA\.current/.test(lvl));
check(T('the lobby has the MY ROOM door and the return point'), /label: 'MY ROOM'/.test(door) && /target: 'home'/.test(door) && /export const ARRIVAL_HOME/.test(door));
check(T('spendBones refuses bad amounts in the economy code'), /export function spendBones/.test(eco) && /Number\.isFinite\(n\)/.test(eco) && /SAVE\.wallet < n/.test(eco));
check(T('main.js loads the home store from the start (host sends the layout before the level loads)'), /import '\.\/core\/homestore\.js'/.test(main));
