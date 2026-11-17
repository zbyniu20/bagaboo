// Kontrola większej zmiany (czysty Node, ułamek sekundy): patrzy, co zmieniłeś względem gałęzi bazowej, i przypomina o testach.
//   - nowy plik poziomu/trybu: nazwa, rejestr, FILES, karta i tryb w salonie (levelpack/registry/static łapią resztę),
//   - zmiana w kodzie zaufania (network, config, auth, economy, modstate) bez zmiany testów,
//   - duża zmiana kodu gry (domyślnie > 300 linii) bez zmiany testów,
//   - zmiana kodu gry bez odświeżonego grafu wiedzy (graphify-out/), jak każe CLAUDE.md.
// Domyślnie wypisuje ostrzeżenia i kończy z kodem 0. Z --strict ostrzeżenia kończą z kodem 1.
// Użycie: cd tests && node changed.mjs [baza] [--strict]    (baza domyślnie origin/main)
import { execFileSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2), strict = args.includes('--strict'), BIG = 300;
const git = (...a) => { try { return execFileSync('git', a, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }); } catch (e) { return null; } };
let base = args.find(a => !a.startsWith('--')) || 'origin/main';
if (git('rev-parse', '--verify', base) === null) base = git('rev-parse', '--verify', 'HEAD~1') !== null ? 'HEAD~1' : 'HEAD';
const mergeBase = (git('merge-base', base, 'HEAD') || '').trim() || base;

// pliki zmienione względem bazy: zatwierdzone, niezatwierdzone i nowe (jeszcze nie w git)
const stat = new Map();   // plik -> { added, deleted, isNew }
for (const l of (git('diff', '--numstat', mergeBase) || '').split('\n')) {
    const m = l.match(/^(\d+|-)\t(\d+|-)\t(.+)$/); if (m) stat.set(m[3], { added: +m[1] || 0, deleted: +m[2] || 0, isNew: false });
}
for (const l of (git('diff', '--name-status', '--diff-filter=A', mergeBase) || '').split('\n')) { const m = l.match(/^A\t(.+)$/); if (m && stat.has(m[1])) stat.get(m[1]).isNew = true; }
for (const f of (git('ls-files', '--others', '--exclude-standard') || '').split('\n').filter(Boolean)) stat.set(f, { added: 0, deleted: 0, isNew: true });

const files = [...stat.keys()];
const isGame = (f) => f === 'main.js' || f === 'index.html' || /^(core|levels)\/[^/]+\.js$/.test(f);
const isTest = (f) => /^tests\/[^/]+\.mjs$|^tests\/modes\/[^/]+\.mjs$/.test(f);
const TRUST = ['core/network.js', 'core/config.js', 'core/auth.js', 'core/economy.js', 'core/modstate.js'];
const gameFiles = files.filter(isGame), testFiles = files.filter(isTest);
const lines = gameFiles.reduce((s, f) => s + stat.get(f).added + stat.get(f).deleted, 0);
const warn = [], info = [];

info.push('base ' + base + ': ' + files.length + ' changed file(s), ' + gameFiles.length + ' game file(s), ' + lines + ' changed line(s), ' + testFiles.length + ' test file(s)');
for (const f of files.filter(f => /^levels\/[^/]+\.js$/.test(f) && stat.get(f).isNew)) {
    const id = path.basename(f, '.js');
    info.push('new level/mode ' + id + ': covered automatically by levelpack.mjs; add tests/modes/' + id + '.mjs for its own rules');
    for (const need of ['core/registry.js', 'index.html']) if (!files.includes(need)) warn.push('new ' + f + ' but ' + need + ' is not changed (register the level there)');
    if (!files.includes('core/levelcards.js')) warn.push('new ' + f + ' but core/levelcards.js is not changed (every level and mode needs a card)');
}
const trust = files.filter(f => TRUST.includes(f));
if (trust.length && !testFiles.length) warn.push('trust/economy code changed (' + trust.join(', ') + ') but no test changed: add a case to tests/logic.mjs');
if (lines > BIG && !testFiles.length) warn.push('a big change (' + lines + ' lines > ' + BIG + ') without any test change');
if (gameFiles.length && !files.some(f => f.startsWith('graphify-out/'))) warn.push('game files changed but graphify-out/ did not: run `graphify update` (CLAUDE.md)');

info.forEach(m => console.log('info ' + m));
warn.forEach(m => console.log('WARN ' + m));
if (!warn.length) console.log('ok   changed: no test or graph gaps for this change');
else if (strict) { console.log(warn.length + ' warning(s) (--strict)'); process.exit(1); }
