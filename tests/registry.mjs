// Kontrola rejestru poziomów w czystym Node (bez przeglądarki, trwa ułamek sekundy).
// Sprawdza: unikalne id, preset światła, motyw muzyczny, kartę poziomu, osiągnięcie nm_<id> dla poziomów z trudnością,
// pliki poziomów, listę FILES w index.html, drzwi powrotne trybów do salonu Games i EXIT na końcu poziomów.
// Użycie: cd tests && node registry.mjs   (nie wymaga npm ci ani Chromium)
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const load = (p) => import(pathToFileURL(path.join(ROOT, p)).href);
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const R = await load('core/registry.js'), C = await load('core/config.js'), LC = await load('core/levelcards.js');

const bad = [];
// music.js i economy.js importują Three.js (działa tylko w przeglądarce), więc ich dane czytamy z kodu źródłowego
const themes = new Set([...(read('core/music.js').match(/export const THEMES = \{([\s\S]*?)\n\};/) || ['', ''])[1].matchAll(/^ {4}(\w+):/gm)].map(m => m[1]));
const achievements = new Set([...read('core/economy.js').matchAll(/\bid: '([\w]+)', name:/g)].map(m => m[1]));
if (!themes.size) bad.push('could not read THEMES from core/music.js');
if (!achievements.size) bad.push('could not read achievements from core/economy.js');

const ids = new Set();
for (const d of R.LEVEL_DEFS) {
    if (ids.has(d.id)) bad.push('duplicate id ' + d.id); ids.add(d.id);
    if (d.kind === 'virtual') continue;
    if (d.light !== '@mode' && !C.LIGHT_PRESETS[d.light]) bad.push(d.id + ': unknown light preset ' + d.light);
    if ((d.kind === 'level' || d.kind === 'game') && !LC.CARDS[d.id]) bad.push(d.id + ': no level card in core/levelcards.js');
    if (!d.theme) bad.push(d.id + ': no music theme'); else if (!themes.has(d.theme)) bad.push(d.id + ': unknown music theme ' + d.theme);
    if (d.diff && !achievements.has('nm_' + d.id)) bad.push(d.id + ': difficulty level without nm_' + d.id + ' achievement');
    const pth = R.levelPath(d);
    if (!fs.existsSync(path.join(ROOT, pth))) { bad.push('registry path missing ' + pth); continue; }
    const src = read(pth);
    // każdy tryb z salonu Games ma drzwi powrotne do salonu (portal do 'games' albo fabryka trybu wyścigu z arrival:)
    if (d.kind === 'game' && !/target:\s*'games'|arrival:\s*ARRIVAL_FROM_/.test(src)) bad.push('game ' + d.id + ' has no door back to the Games room');
    // każdy poziom z terminala Levels ma EXIT na końcu
    if (d.kind === 'level' && !/['"]EXIT['"]/.test(src)) bad.push('level ' + d.id + ' has no EXIT door/sign at its end');
}

// każdy plik z core/ i levels/ jest na liście FILES w index.html i odwrotnie
const listed = new Set(((read('index.html').match(/var FILES = \[(.*?)\]/s) || ['', ''])[1].match(/"[^"]+"/g) || []).map(x => x.slice(1, -1)));
for (const dir of ['core', 'levels']) for (const f of fs.readdirSync(path.join(ROOT, dir))) if (f.endsWith('.js') && !listed.has(dir + '/' + f)) bad.push('index.html FILES lacks ' + dir + '/' + f);
for (const f of listed) if (!fs.existsSync(path.join(ROOT, f))) bad.push('FILES lists missing file ' + f);

if (bad.length) { bad.forEach((m) => console.log('FAIL registry: ' + m)); console.log(bad.length + ' problem(s)'); process.exit(1); }
console.log('ok   registry: ' + R.LEVEL_DEFS.filter(d => d.kind !== 'virtual').length + ' levels, files, index.html FILES, cards, themes, lights, doors and Nightmare achievements agree');
