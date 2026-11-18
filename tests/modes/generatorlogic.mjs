// Test logiki z core/generatorlogic.js (dawny tryb Generator; dziś używa jej Nocna Zmiana w lobby; uruchamia go npm run fast): cała logika rundy
// (czyste funkcje, bez Three.js) oraz rozmieszczenie generatorów. Użycie osobno: cd tests && node modes/generatorlogic.mjs
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { check } from '../lib.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const G = await import(pathToFileURL(path.join(ROOT, 'core/generatorlogic.js')).href);
const T = (s) => 'generator: ' + s;
const near = (a, b, e = 1e-6) => Math.abs(a - b) <= e;
const head = (x, z, y = 1.6) => ({ x, y, z });

// ---------- rozmieszczenie (hala, brama, generatory) ----------
check(T('four generators'), G.GENS.length === 4);
for (const [x, z] of G.GENS) {
    check(T('generator (' + x + ', ' + z + ') is inside the hall with a margin'), Math.abs(x) <= G.A - 3 && z <= G.A - 5 && z >= -G.A + 3);
    check(T('generator (' + x + ', ' + z + ') is before the gate, not in the escape zone'), z > G.GATE_Z + G.REPAIR.R + 1);
}
for (let i = 0; i < G.GENS.length; i++) for (let j = i + 1; j < G.GENS.length; j++) check(T('generators ' + (i + 1) + ' and ' + (j + 1) + ' are at least 8 m apart'), Math.hypot(G.GENS[i][0] - G.GENS[j][0], G.GENS[i][1] - G.GENS[j][1]) >= 8);
check(T('a lone player can finish all repairs in half the round time'), G.GENS.length * G.REPAIR.SEC * 2 <= G.TIMES.ROUND);
check(T('rescue is quicker than repairing a generator'), G.RESCUE.SEC < G.REPAIR.SEC);

// ---------- naprawa ----------
const simulate = (helpers, seconds, dt = 0.05) => { let p = 0, t = 0; while (t < seconds - 1e-9) { p = G.repairStep(p, helpers, dt); t += dt; } return p; };
check(T('repair: one player needs REPAIR.SEC seconds'), near(simulate(1, G.REPAIR.SEC), 1, 1e-6) && simulate(1, G.REPAIR.SEC - 1) < 1);
check(T('repair: two players are twice as fast'), near(simulate(2, G.REPAIR.SEC / 2), 1, 1e-6));
check(T('repair: more than MAX_HELPERS does not speed it up further'), near(simulate(9, G.REPAIR.SEC / 3), 1, 1e-6) && simulate(9, G.REPAIR.SEC / 3 - 1) < 1);
check(T('repair: nobody near means no progress'), G.repairStep(0.4, 0, 1) === 0.4 && G.repairStep(0, 0, 100) === 0);
check(T('repair: progress never exceeds 1 and a finished generator stays finished'), G.repairStep(0.99, 3, 100) === 1 && G.repairStep(1, 1, 5) === 1);
const gen0 = G.GENS[0];
check(T('helpers: a head within reach counts, outside or on a shelf does not'), G.helpersAt(gen0, [head(gen0[0] + 1, gen0[1]), head(gen0[0] + 5, gen0[1]), head(gen0[0], gen0[1], 5), null]) === 1);
check(T('gate: opens only when every generator is done'), !G.gateOpen([1, 1, 1, 0.99]) && G.gateOpen([1, 1, 1, 1]) && !G.gateOpen([]) && G.doneCount([1, 0.5, 1, 0]) === 2);

// ---------- klatki ----------
let r = { p: 0 }; for (let t = 0; t < G.RESCUE.SEC - 0.1; t += 0.1) r = G.rescueStep(r.p, 1, 0.1);
check(T('rescue: not free before RESCUE.SEC'), !r.freed && r.p < 1);
r = G.rescueStep(r.p, 1, 0.2); check(T('rescue: free after RESCUE.SEC with a helper'), r.freed);
check(T('rescue: the bar decays without help and stops at 0'), near(G.rescueStep(0.5, 0, 1).p, 0) && G.rescueStep(0, 0, 10).p === 0 && !G.rescueStep(0.9, 0, 0.5).freed);
check(T('rescue: only heads close to the cage help'), G.helpersAtCage({ x: 0, z: 0 }, [head(1, 0), head(3, 0), head(0, 1.5)]) === 2);

// ---------- hałas ----------
check(T('noise: silence below the mic threshold, full at a shout, clamped above'), G.micNoise(0.03) === 0 && near(G.micNoise(G.MIC.LOUD), 1) && G.micNoise(5) === 1 && G.micNoise(0) === 0);
check(T('noise: walking is quiet, running is loud but capped'), G.moveNoise(1) === 0 && G.moveNoise(2) === 0 && near(G.moveNoise(6), 0.5) && G.moveNoise(50) === G.NOISE.MOVE_MAX);
check(T('noise: a report fades out linearly'), near(G.noiseAt({ v: 0.8, t: 10 }, 10), 0.8) && near(G.noiseAt({ v: 0.8, t: 10 }, 10 + G.NOISE.DECAY_SEC / 2), 0.4) && G.noiseAt({ v: 0.8, t: 10 }, 20) === 0 && G.noiseAt(undefined, 5) === 0);

// ---------- potwór: słyszenie, łapanie, prędkość ----------
const bot = { x: 0, y: 0, z: 0 }, P = (id, x, z, noise = 0, immune = false) => ({ id, x, y: 1.6, z, noise, immune });
check(T('monster: ignores a quiet player beyond sight range'), G.pickTarget(bot, [P('a', 8, 0)]) === null);
check(T('monster: sees a quiet player up close'), G.pickTarget(bot, [P('a', G.MON.see - 0.5, 0)])?.id === 'a');
check(T('monster: hears a loud player from far away'), G.pickTarget(bot, [P('a', 20, 0, 0.8)])?.id === 'a' && G.pickTarget(bot, [P('a', 40, 0, 1)]) === null);
check(T('monster: picks the nearest of several targets'), G.pickTarget(bot, [P('far', 12, 0, 0.6), P('near', 4, 0)])?.id === 'near');
check(T('monster: skips protected (just freed) players'), G.pickTarget(bot, [P('a', 2, 0, 0, true)]) === null && G.pickTarget(bot, [P('a', 2, 0, 0, true), P('b', 4, 0)])?.id === 'b');
check(T('monster: nobody around means no target'), G.pickTarget(bot, []) === null);
check(T('monster: hearing radius grows with noise'), G.hearRadius(0) === G.MON.hearBase && G.hearRadius(1) === G.MON.hearBase + G.MON.hearMax);
check(T('catch: close and at body height'), G.canCatch(bot, head(0.9, 0)) && !G.canCatch(bot, head(1.1, 0)));
check(T('catch: a head high on a shelf is out of reach'), !G.canCatch(bot, head(0.5, 0, 4.2)) && G.canCatch(bot, head(0.5, 0, 1.0)));
check(T('speed: hunting is faster than patrolling and both grow with repaired generators'), G.monsterSpeed('hunt', 0) > G.monsterSpeed('patrol', 0) && G.monsterSpeed('hunt', 4) > G.monsterSpeed('hunt', 0) && G.monsterSpeed('patrol', 4) > G.monsterSpeed('patrol', 0));

// ---------- koniec rundy, wynik, nagroda ----------
const S = (...a) => new Set(a);
check(T('round: runs while someone is still free and time is left'), !G.roundOver(['a', 'b'], S('a'), S(), 100));
check(T('round: ends when time runs out'), G.roundOver(['a', 'b'], S(), S(), 0) && G.roundOver(['a'], S(), S(), -1));
check(T('round: ends when everybody is caged or escaped'), G.roundOver(['a', 'b'], S('a'), S('b'), 100) && G.roundOver(['a'], S('a'), S(), 100));
check(T('round: nobody present never ends the round by itself'), !G.roundOver([], S(), S(), 100));
check(T('outcome: escaped, caged or timeout, and only escaping pays'), G.outcomeOf('a', S(), S('a')) === 'escaped' && G.outcomeOf('a', S('a'), S()) === 'caged' && G.outcomeOf('a', S(), S()) === 'timeout'
    && G.rewardFor('escaped') === G.REWARD && G.rewardFor('caged') === 0 && G.rewardFor('timeout') === 0);

// ---------- symulacja całej rundy solo: cichy gracz naprawia wszystkie generatory po kolei i ucieka ----------
{
    const dt = 0.1, gen = G.GENS.map(() => 0); let t = G.TIMES.ROUND, now = 0, noise = { v: 0, t: 0 }, caged = new Set(), esc = new Set();
    let i = 0, escaped = false;
    while (t > 0 && !escaped) {
        // gracz stoi przy kolejnym niedokończonym generatorze (drogi pomijamy: sprawdzamy sam bilans czasu naprawy)
        while (i < gen.length && gen[i] >= 1) i++;
        if (i < gen.length) { gen[i] = G.repairStep(gen[i], G.helpersAt(G.GENS[i], [head(G.GENS[i][0], G.GENS[i][1])]), dt); noise = { v: G.NOISE.REPAIR, t: now }; }
        else if (G.gateOpen(gen)) { esc.add('me'); escaped = true; }
        now += dt; t -= dt;
        if (G.roundOver(['me'], caged, esc, t)) break;
    }
    check(T('simulated solo round: repairs finish well before time runs out and the player escapes'), escaped && G.outcomeOf('me', caged, esc) === 'escaped' && t > G.TIMES.ROUND / 2, 'time left ' + t.toFixed(1));
    check(T('simulated solo round: repairing is audible to the monster (noise while working)'), noise.v === G.NOISE.REPAIR);
}

// ---------- logikę współdzieli Nocna Zmiana w lobby (core/lobbyplay.js), samego poziomu Generator już nie ma ----------
const lp = fs.readFileSync(path.join(ROOT, 'core/lobbyplay.js'), 'utf8');
check(T('the lobby night shift imports the logic module'), /from '\.\/generatorlogic\.js'/.test(lp));
