// Statyczne kontrole kodu w czystym Node (bez przeglądarki, ułamek sekundy):
//   - każdy import względny wskazuje istniejący plik, a każda importowana nazwa jest tam wyeksportowana (literówka = błąd dopiero w przeglądarce),
//   - brak cykli importów i martwych plików (nikt ich nie importuje i nie ma ich w rejestrze),
//   - tryby: registry <-> MODES w games.js <-> ARRIVAL_FROM_* <-> import w pliku trybu; poziomy: registry <-> LV w levels.js,
//   - karty poziomów i trybów mają komplet pól, a karty trybów mieszczą się w limitach z nagłówka core/levelcards.js.
// Użycie: cd tests && node static.mjs
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { check, done } from './lib.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const R = await import(pathToFileURL(path.join(ROOT, 'core/registry.js')).href);
const LC = await import(pathToFileURL(path.join(ROOT, 'core/levelcards.js')).href);

// ---------- pliki i ich importy / eksporty ----------
const files = ['main.js', ...['core', 'levels'].flatMap(d => fs.readdirSync(path.join(ROOT, d)).filter(f => f.endsWith('.js')).map(f => d + '/' + f))];
// bez komentarzy całoliniowych i blokowych na początku linii (przykłady "import {...}" w opisach nie są kodem)
const code = (p) => read(p).replace(/^\s*\/\*[\s\S]*?\*\//gm, '').split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n');

// Nazwy eksportowane z pliku. Deklaracje const/let/var mogą mieć kilka nazw po przecinku, więc czytamy je z głębokością nawiasów
function exportsOf(src) {
    const names = new Set();
    for (const m of src.matchAll(/^export\s+(?:async\s+)?(?:function\*?|class)\s+([\w$]+)/gm)) names.add(m[1]);
    for (const m of src.matchAll(/^export\s+\{([^}]*)\}/gm)) for (const part of m[1].split(',')) { const s = part.trim().split(/\s+as\s+/); if (s[0]) names.add((s[1] || s[0]).trim()); }
    for (const m of src.matchAll(/^export\s+(?:const|let|var)\s+/gm)) {
        let i = m.index + m[0].length, depth = 0, expectName = true, str = null;
        for (; i < src.length; i++) {
            const c = src[i];
            if (str) { if (c === '\\') i++; else if (c === str) str = null; continue; }
            if (c === '"' || c === "'" || c === '`') { str = c; continue; }
            if (expectName) {
                if (c === '{' || c === '[') { const end = src.indexOf(c === '{' ? '}' : ']', i); for (const n of src.slice(i + 1, end).split(',')) { const w = n.split(':').pop().split('=')[0].trim(); if (/^[\w$]+$/.test(w)) names.add(w); } i = end; expectName = false; continue; }
                const w = /^[\w$]+/.exec(src.slice(i)); if (w) { names.add(w[0]); i += w[0].length - 1; expectName = false; }
                continue;
            }
            if ('([{'.includes(c)) depth++; else if (')]}'.includes(c)) depth--;
            else if (depth === 0 && c === ',') expectName = true;
            else if (depth === 0 && (c === ';' || (c === '\n' && /[;)}\]'"`\w]\s*$/.test(src.slice(Math.max(0, i - 3), i)) && /^\s*(?:\/\/.*)?\n?\s*(?:export|import|function|const|let|var|class|\/\/|\/\*|$)/.test(src.slice(i + 1, i + 40))))) break;
        }
    }
    return names;
}
const SRC = Object.fromEntries(files.map(f => [f, code(f)])), EXP = Object.fromEntries(files.map(f => [f, exportsOf(SRC[f])]));
const IMPORT_RE = /^\s*import\s+(?:([\w$]+)\s*,?\s*)?(?:\{([^}]*)\}|\*\s+as\s+([\w$]+))?\s*(?:from\s*)?['"]([^'"]+)['"]/gm;
const graph = {}, importedBy = {};
for (const f of files) {
    graph[f] = new Set();
    for (const m of SRC[f].matchAll(IMPORT_RE)) {
        const spec = m[4]; if (!spec.startsWith('.')) continue;   // biblioteki (three, cannon-es) pomijamy
        const target = path.posix.normalize(path.posix.join(path.posix.dirname(f), spec));
        if (!fs.existsSync(path.join(ROOT, target))) { check(f + ': imports a missing file ' + spec, false); continue; }
        graph[f].add(target); (importedBy[target] = importedBy[target] || new Set()).add(f);
        if (m[2] !== undefined && EXP[target]) for (const part of m[2].split(',')) {
            const name = part.trim().split(/\s+as\s+/)[0].trim(); if (!name) continue;
            check(f + ': imports ' + name + ' that ' + target + ' does not export', EXP[target].has(name));
        }
    }
    for (const m of SRC[f].matchAll(/import\(\s*['"](\.[^'"]+)['"]\s*\)/g)) {
        const target = path.posix.normalize(path.posix.join(path.posix.dirname(f), m[1]));
        check(f + ': dynamic import of a missing file ' + m[1], fs.existsSync(path.join(ROOT, target)));
        (importedBy[target] = importedBy[target] || new Set()).add(f);
    }
}
// Cykle importów (algorytm Tarjana): każdy zbiór silnie spójny z więcej niż jednym plikiem to cykl
{
    let idx = 0; const stack = [], on = new Set(), index = {}, low = {}, cycles = [];
    const visit = (v) => {
        index[v] = low[v] = idx++; stack.push(v); on.add(v);
        for (const w of graph[v] || []) { if (!(w in index)) { visit(w); low[v] = Math.min(low[v], low[w]); } else if (on.has(w)) low[v] = Math.min(low[v], index[w]); }
        if (low[v] === index[v]) { const comp = []; let w; do { w = stack.pop(); on.delete(w); comp.push(w); } while (w !== v); if (comp.length > 1) cycles.push(comp); }
    };
    for (const f of files) if (!(f in index)) visit(f);
    check('imports: no cycles', cycles.length === 0, cycles.map(c => c.join(' <-> ')).join(' | '));
}
// Martwe pliki: core/ importowany przez kogoś, poziom wczytywany przez rejestr (levelPath) albo dodatkowo przez extras
const loadedByRegistry = new Set(R.LEVEL_DEFS.filter(d => d.kind !== 'virtual').flatMap(d => [R.levelPath(d), ...(d.extras || [])]).map(p => p.replace(/^\.\//, '')));
for (const f of files) if (f !== 'main.js' && !importedBy[f] && !loadedByRegistry.has(f)) check('dead file: ' + f + ' is not imported anywhere nor loaded by the registry', false);

// ---------- tryby (salon Games) i poziomy (sala Levels) ----------
const gamesSrc = read('levels/games.js');
const modesBlock = (gamesSrc.match(/const MODES = \[([\s\S]*?)\n\];/) || ['', ''])[1];
const modes = [...modesBlock.matchAll(/\{\s*cat:\s*'(\w+)',\s*label:\s*'([^']+)'[^}]*?target:\s*'(\w+)'[^}]*?desc:\s*\[([^\]]*)\]/g)].map(m => ({ cat: m[1], label: m[2], target: m[3], desc: [...m[4].matchAll(/'((?:[^'\\]|\\.)*)'/g)].map(x => x[1]) }));
const gameIds = R.LEVEL_DEFS.filter(d => d.kind === 'game').map(d => d.id);
check('games.js: MODES parsed', modes.length > 0, modes.length);
check('modes: every game in the registry has a door in MODES and vice versa', JSON.stringify(gameIds.filter(i => !modes.some(m => m.target === i))) === '[]' && JSON.stringify(modes.filter(m => !gameIds.includes(m.target)).map(m => m.target)) === '[]',
    'missing in MODES: ' + gameIds.filter(i => !modes.some(m => m.target === i)) + '; unknown in MODES: ' + modes.filter(m => !gameIds.includes(m.target)).map(m => m.target));
check('modes: no mode is listed twice', new Set(modes.map(m => m.target)).size === modes.length);
check('modes: categories exist', modes.every(m => ['race', 'party', 'team'].includes(m.cat)));
for (const m of modes) {
    check('mode ' + m.target + ': description has 3-5 short lines', m.desc.length >= 3 && m.desc.length <= 5 && m.desc.every(l => l.length > 0 && l.length <= 40), JSON.stringify(m.desc));
    const up = m.target.toUpperCase(), file = R.levelPath(R.LEVEL_BY_ID[m.target] || { id: m.target });
    const arrival = new RegExp('export const ARRIVAL_FROM_' + up + '\\s*=\\s*AR\\.' + m.target + '\\b');
    const src = fs.existsSync(path.join(ROOT, file)) ? read(file) : '';
    if (/ARRIVAL_FROM_/.test(src) && !/arrival:\s*ARRIVAL_FROM_/.test(src)) check('mode ' + m.target + ': games.js exports ARRIVAL_FROM_' + up, arrival.test(gamesSrc));
    if (new RegExp('spawn:\\s*ARRIVAL_FROM_' + up + '\\b').test(src)) check('mode ' + m.target + ': imports ARRIVAL_FROM_' + up + ' from games.js', new RegExp('import\\s*\\{[^}]*\\bARRIVAL_FROM_' + up + '\\b[^}]*\\}\\s*from\\s*[\'"]\\./games\\.js[\'"]').test(src));
}
const lvSrc = read('levels/levels.js'), lvBlock = (lvSrc.match(/const LV = \[([\s\S]*?)\n\];/) || ['', ''])[1];
const lvTargets = [...lvBlock.matchAll(/target:\s*'(\w+)'/g)].map(m => m[1]), levelIds = R.LEVEL_DEFS.filter(d => d.kind === 'level').map(d => d.id);
check('levels.js: LV parsed', lvTargets.length > 0);
check('levels: every level in the registry is on the LV list and vice versa', levelIds.every(i => lvTargets.includes(i)) && lvTargets.every(t => levelIds.includes(t) || t === 'lab'),
    'missing in LV: ' + levelIds.filter(i => !lvTargets.includes(i)) + '; unknown in LV: ' + lvTargets.filter(t => !levelIds.includes(t) && t !== 'lab'));

// ---------- karty ----------
const isGame = new Set(gameIds), isLevel = new Set(levelIds);
for (const [id, c] of Object.entries(LC.CARDS)) {
    check('card ' + id + ': belongs to a level, a mode or is lab', isGame.has(id) || isLevel.has(id) || id === 'lab');
    for (const k of ['place', 'goal', 'watch']) check('card ' + id + ': ' + k + ' is a non-empty text', typeof c[k] === 'string' && c[k].trim().length > 0);
    check('card ' + id + ': how has 1-3 non-empty points', Array.isArray(c.how) && c.how.length >= 1 && c.how.length <= 3 && c.how.every(h => typeof h === 'string' && h.trim()));
    if (isGame.has(id)) {   // limity z nagłówka core/levelcards.js (karty poziomów mają dłuższe opisy zagrożeń, więc ich nie sprawdzamy)
        for (const k of ['place', 'goal', 'watch']) check('card ' + id + ': ' + k + ' fits ~110 characters', c[k].length <= 110, c[k].length);
        (c.how || []).forEach((h, i) => check('card ' + id + ': how[' + i + '] fits ~60 characters', h.length <= 60, h.length + ': ' + h));
    }
}

// BagaBoo Games (salon Games i wszystkie tryby kind 'game'): bez nametagów i bez jumpscare'ów dla nikogo (flaga GAMES_CALM)
{
    const main = read('main.js'), net = read('core/network.js'), aud = read('core/audio.js'), kit = read('core/levelkit.js');
    check('games calm: main.js turns the flag on for the Games hall and every game mode on each level load', /GAMES_CALM\.on = id === 'games' \|\| cfgKind\(id\) === 'game'/.test(main));
    check('games calm: nametags and role tags are hidden by the flag', /tg\.visible = !TAGS\.hidden && !GAMES_CALM\.on/.test(net));
    check('games calm: both the jumpscare face and its sound are suppressed by the flag', /trigger\(\) \{ if \(t >= 0 \|\| GAMES_CALM\.on\) return false;/.test(kit) && /if \(!ctx \|\| GAMES_CALM\.on\) return;/.test(aud));
}

done('static');
