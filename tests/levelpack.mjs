// Pakiet krótkich testów dla KAŻDEGO poziomu, sali i trybu z core/registry.js (czysty Node, ułamek sekundy, bez pisania nic ręcznie):
// nowy poziom dopisany do rejestru dostaje je automatycznie. Sprawdza kontrakt pliku, spójność id, sprzątanie po wyjściu,
// drzwi powrotne, dane w rejestrze (ambient, pogłos) i higienę kodu. Gdy istnieje tests/modes/<id>.mjs, uruchamia też ten test własny.
// Użycie: cd tests && node levelpack.mjs [id,id,...]
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { check, done } from './lib.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(HERE, '..');
const R = await import(pathToFileURL(path.join(ROOT, 'core/registry.js')).href);
const only = process.argv[2] ? new Set(process.argv[2].split(',')) : null;
const defs = R.LEVEL_DEFS.filter(d => d.kind !== 'virtual' && (!only || only.has(d.id)));
const num = (v) => typeof v === 'number' && Number.isFinite(v);
const range = (r) => Array.isArray(r) && r.length === 2 && num(r[0]) && num(r[1]) && r[0] >= 0 && r[0] <= r[1];

for (const d of defs) {
    const id = d.id, file = R.levelPath(d).replace(/^\.\//, ''), p = path.join(ROOT, file), T = (s) => id + ': ' + s;
    if (!fs.existsSync(p)) { check(T('level file exists ' + file), false); continue; }
    const src = fs.readFileSync(p, 'utf8');
    const factory = /createRaceMode\(/.test(src);   // swingrun, towerclimb: build/update/dispose dostarcza fabryka core/racemode.js

    // 1. kontrakt pliku: info, build, update, dispose
    if (!factory) {
        for (const fn of ['build', 'update', 'dispose']) check(T('exports ' + fn + '()'), new RegExp('export (async )?function ' + fn + '\\b').test(src));
        const info = src.match(/export const info = \{\s*id:\s*'(\w+)'[^}]*?spawn:\s*\[([^\]]*)\]/);
        check(T('exports info with id and spawn'), !!info);
        if (info) {
            check(T('info.id matches the registry id'), info[1] === id, info[1]);
            const sp = info[2].split(',').map(x => x.trim());   // x i z mogą być wyrażeniami (np. -X + P / 2), y musi być liczbą nad podłogą
            check(T('info.spawn is [x, y, z] with y above the floor'), sp.length === 3 && sp.every(x => x.length > 0) && num(Number(sp[1])) && Number(sp[1]) > 0 && Number(sp[1]) < 30, info[2]);
        }
    }

    // 2. spójność id: poziom używa tylko własnych kluczy nagród, samouczka, ducha, zdarzeń i rund
    for (const [re, what] of [[/levelReward\('(\w+)'/g, 'levelReward'], [/introSeen\('(\w+)'\)/g, 'introSeen'], [/createGhost\('(\w+)'\)/g, 'createGhost'], [/createEvents\('(\w+)'\)/g, 'createEvents'], [/isAuthority\('(\w+)'/g, 'isAuthority'], [/participants\('(\w+)'\)/g, 'participants'], [/recordTime\('(\w+)'/g, 'recordTime']])
        for (const m of src.matchAll(re)) check(T(what + ' uses its own id'), m[1] === id, m[1]);
    if (/hs\.lvl\s*===\s*'(\w+)'|st\.lvl\s*===\s*'(\w+)'/.test(src)) for (const m of src.matchAll(/(?:hs|st)\.lvl\s*===\s*'(\w+)'/g)) check(T('network level checks use its own id'), m[1] === id, m[1]);
    if (d.kind === 'game' && /levelReward\(/.test(src) && !d.rec) check(T('a rewarded mode without rec has a wins counter key equal to its id'), new RegExp("levelReward\\('" + id + "'").test(src));

    // 3. sprzątanie po wyjściu z poziomu (wycieki stanu między poziomami)
    if (!factory) {
        if (/onLevelMsg\(/.test(src)) check(T('unregisters its network handler: onLevelMsg(null)'), /onLevelMsg\(null\)/.test(src));
        if (/TAGS\.hidden\s*=\s*true/.test(src)) check(T('restores name tags: TAGS.hidden = false'), /TAGS\.hidden\s*=\s*false/.test(src));
        if (/setInterval\(/.test(src)) check(T('clears its intervals'), /clearInterval\(/.test(src));
        if (/(?:window|document)\.addEventListener\(/.test(src)) check(T('removes its window/document listeners'), /(?:window|document)\.removeEventListener\(/.test(src));
        if (/\.dispose\(\)/.test(src) === false && /cameraPanel\(/.test(src)) check(T('disposes its camera panels'), false);
        // panel jest sprzątany wprost (S.hud.dispose()) albo w pętli po liście (for (const o of [S.face, S.hud]) o.dispose())
        for (const m of src.matchAll(/S\.(\w+)\s*=\s*cameraPanel\(/g)) check(T('disposes camera panel S.' + m[1]), new RegExp('S\\.' + m[1] + '\\.dispose\\(\\)|for \\(const \\w+ of \\[[^\\]]*S\\.' + m[1] + '\\b[^\\]]*\\]\\)[^\\n]*\\.dispose\\(\\)').test(src));
    }

    // 4. drzwi powrotne
    if (d.kind === 'game' && !factory) {
        const up = id.toUpperCase();
        check(T('has a door back to Games with spawn ARRIVAL_FROM_' + up), new RegExp("target:\\s*'games',\\s*spawn:\\s*ARRIVAL_FROM_" + up + '\\b').test(src));
        for (const m of src.matchAll(/ARRIVAL_FROM_(\w+)/g)) check(T('uses only its own arrival point (not copied from another mode): ' + m[0]), m[1] === up, m[0]);
        check(T('has an EXIT door or a GAMES door'), /label:\s*'(GAMES|EXIT)'/.test(src));
    }
    if (d.kind === 'level') check(T('has an EXIT door or sign'), /['"]EXIT['"]/.test(src));

    // 5. dane rejestru: ambient i pogłos
    if (d.room) check(T('room reverb has positive sec and wet in 0..1'), num(d.room.sec) && d.room.sec > 0 && num(d.room.wet) && d.room.wet >= 0 && d.room.wet <= 1, JSON.stringify(d.room));
    if (d.ambience) {
        for (const [name, pts] of d.ambience.loops || []) {
            check(T('ambience loop ' + name + ' has a name'), typeof name === 'string' && name.length > 0);
            if (pts !== null) check(T('ambience loop ' + name + ' points are [x, y, z] numbers'), Array.isArray(pts) && pts.length > 0 && pts.every(q => Array.isArray(q) && q.length === 3 && q.every(num)));
        }
        for (const r of d.ambience.rand || []) check(T('ambience random sound ' + r.t + ' has valid ranges and volume'), typeof r.t === 'string' && range(r.e) && range(r.d) && num(r.v) && r.v > 0 && r.v <= 1, JSON.stringify(r));
    }
    if (d.rec) check(T('record name is a non-empty text'), typeof d.rec === 'string' && d.rec.trim().length > 0);
    if (d.score) check(T('a score record has a rec name'), !!d.rec);

    // 6. higiena kodu
    check(T('no console.log left in the level file'), !/console\.log\(/.test(src));
    check(T('no debugger statement'), !/\bdebugger\b/.test(src));
    check(T('no leftover FIXME / XXX'), !/\b(FIXME|XXX)\b/.test(src));
    check(T('the file is not empty or truncated (ends with a newline)'), src.length > 200 && src.endsWith('\n'));

    // 7. test własny poziomu (opcjonalny): tests/modes/<id>.mjs
    const own = path.join(HERE, 'modes', id + '.mjs');
    if (fs.existsSync(own)) await import(pathToFileURL(own).href);
}

done('levelpack (' + defs.length + ' levels and modes)');
