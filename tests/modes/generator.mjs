// Test własny trybu Generator (uruchamiany automatycznie przez levelpack.mjs): rozmieszczenie generatorów i czasy rundy.
// Stałe czytamy z kodu źródłowego, bo levels/generator.js importuje Three.js (działa tylko w przeglądarce).
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { check } from '../lib.mjs';

const src = fs.readFileSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../levels/generator.js'), 'utf8');
const n = (re) => { const m = src.match(re); return m ? Number(m[1]) : NaN; };
const A = n(/const A = (\d+)/), ROUND = n(/\bROUND = (\d+)/), REPAIR = n(/REPAIR_SEC = (\d+)/), RESCUE = n(/RESCUE_SEC = ([\d.]+)/), REPAIR_R = n(/REPAIR_R = ([\d.]+)/);
const GATE_Z = new Function('A', 'return ' + (src.match(/const GATE_Z = ([^;]+);/) || [, 'NaN'])[1])(A);
const GENS = JSON.parse((src.match(/GENS = (\[\[[^;]*\]\])/) || [, '[]'])[1]);
const T = (s) => 'generator: ' + s;

check(T('constants parsed'), [A, ROUND, REPAIR, RESCUE, REPAIR_R, GATE_Z].every(Number.isFinite) && GENS.length === 4, JSON.stringify({ A, ROUND, REPAIR, GATE_Z, gens: GENS.length }));
for (const [x, z] of GENS) {
    check(T('generator (' + x + ', ' + z + ') is inside the hall with a margin'), Math.abs(x) <= A - 3 && z <= A - 5 && z >= -A + 3);
    check(T('generator (' + x + ', ' + z + ') is before the gate, not in the escape zone'), z > GATE_Z + REPAIR_R + 1, 'gate at z=' + GATE_Z);
}
// generatory daleko od siebie, żeby trzeba było się przemieszczać (potwór ma kogo gonić)
for (let i = 0; i < GENS.length; i++) for (let j = i + 1; j < GENS.length; j++) check(T('generators ' + (i + 1) + ' and ' + (j + 1) + ' are at least 8 m apart'), Math.hypot(GENS[i][0] - GENS[j][0], GENS[i][1] - GENS[j][1]) >= 8);
// rundę da się wygrać: sam czas naprawy w pojedynkę (4 generatory) plus drogę i zapas na ucieczkę mieści się w połowie czasu rundy
check(T('a lone player can finish all repairs in half the round time'), GENS.length * REPAIR * 2 <= ROUND, GENS.length * REPAIR * 2 + ' vs ' + ROUND);
check(T('rescue is quicker than repairing a generator'), RESCUE < REPAIR);
// karta trybu mówi prawdę o liczbie generatorów i bramie
const card = fs.readFileSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../core/levelcards.js'), 'utf8').match(/generator:\s*\{[^\n]*/)?.[0] || '';
check(T('the card mentions the number of generators (' + GENS.length + ')'), new RegExp('\\b(' + GENS.length + '|four)\\b', 'i').test(card));
