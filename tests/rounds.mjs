// Testy wspólnej logiki rund w czystym Node: strażnik hosta (core/netguard.js) i wyścigi (core/racelogic.js).
// Użycie: cd tests && node rounds.mjs
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { check, done } from './lib.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const G = await import(pathToFileURL(path.join(ROOT, 'core/netguard.js')).href);
const R = await import(pathToFileURL(path.join(ROOT, 'core/racelogic.js')).href);
const head = (x, y, z) => ({ x, y, z });
const BAD = [NaN, Infinity, -Infinity, '5', null, undefined, {}, [], true];

// ---------- strażnik hosta: pozycja ----------
check('guard: a valid head position passes, broken ones do not', G.validHead(head(1, 2, 3)) !== null && [null, undefined, head(NaN, 1, 1), head(1, Infinity, 1), head(1, 1, '3'), {}].every(h => G.validHead(h) === null));
check('guard: finish needs a head past the line (with network tolerance)', G.pastFinishLine(head(0, 1.6, -50), -48) && G.pastFinishLine(head(0, 1.6, -46), -48) && !G.pastFinishLine(head(0, 1.6, -30), -48) && !G.pastFinishLine(head(0, 1.6, 20), -48));
check('guard: a guest at the START cannot claim the finish', !G.pastFinishLine(head(0, 1.6, 20), -48) && !G.pastFinishLine(head(0, 1.6, -48 + G.TOL.FINISH + 0.01), -48));
check('guard: finish with a minimum height (gate on a platform)', G.pastFinishLine(head(0, 12, -50), -48, 11) && !G.pastFinishLine(head(0, 2, -50), -48, 11));
check('guard: finish with a missing, broken or non-numeric line is refused', !G.pastFinishLine(null, -48) && !G.pastFinishLine(head(0, 1, NaN), -48) && !G.pastFinishLine(head(0, 1, -50), NaN) && !G.pastFinishLine(head(0, 1, -50), '-48'));
check('guard: a target must be close in the horizontal plane', G.nearTarget(head(1, 1.6, 1), { x: 0, z: 0 }, 3) && !G.nearTarget(head(10, 1.6, 0), { x: 0, z: 0 }, 3) && !G.nearTarget(null, { x: 0, z: 0 }) && !G.nearTarget(head(0, 1, 0), null) && !G.nearTarget(head(0, 1, 0), { x: NaN, z: 0 }));
check('guard: indexes from the network are validated', G.validIndex(0, 8) && G.validIndex(7, 8) && !G.validIndex(8, 8) && !G.validIndex(-1, 8) && BAD.concat([1.5]).every(i => !G.validIndex(i, 8)));

// ---------- strażnik hosta: wynik ----------
check('score: a normal climb is accepted', G.clampScore(10, 12, 2, 1, 3) === 12 && G.clampScore(0, 3, 0, 1, 3) === 3);
check('score: a huge jump is clamped to what the mode allows', G.clampScore(0, 9999, 1, 1, 3) === 4 && G.clampScore(5, 1e9, 10, 1, 3) === 18);
check('score: garbage keeps the previous score', BAD.filter(v => typeof v !== 'string' || true).every(v => G.clampScore(7, v, 5, 1, 3) === 7 || (typeof v === 'string' && G.clampScore(7, v, 5, 1, 3) === 7)) && G.clampScore(7, -5, 5, 1, 3) === 7);
check('score: a lower score (new round) is accepted and fractions are floored', G.clampScore(20, 2, 1, 1, 3) === 2 && G.clampScore(0, 2.9, 5, 1, 3) === 2);
check('score: a bad previous value or time never opens the door', G.clampScore(NaN, 100, 1, 1, 3) === 4 && G.clampScore(0, 100, NaN, 1, 3) === 3 && G.clampScore(0, 100, -50, 1, 3) === 3);
check('name: only safe characters, max 16, never empty', G.safeName('Anna_01') === 'Anna_01' && G.safeName('<b>Hax</b>') === 'bHaxb' && G.safeName('x'.repeat(40)).length === 16 && G.safeName('') === 'Player' && G.safeName(null) === 'Player' && G.safeName('😀😀') === 'Player' && G.safeName({}) === 'objectObject');
check('time: the host clock decides and never goes negative or NaN', G.elapsedSince(100, 90) === 10 && G.elapsedSince(5, 90) === 0 && G.elapsedSince(NaN, 1) === 0 && G.elapsedSince(1, undefined) === 0);

// ---------- maszyna faz ----------
const O = { play: 'race', countdown: 3, roundMax: 60, results: 8, wait: 12, allFinished: false };
const run = (phase, t, dt, o = O) => R.stepPhase(phase, t, dt, o);
check('phases: waiting counts down, then the countdown starts', run('wait', 5, 1).event === null && run('wait', 5, 1).t === 4 && run('wait', 0.5, 1).phase === 'countdown' && run('wait', 0.5, 1).t === 3 && run('wait', 0.5, 1).event === 'countdown');
check('phases: the countdown ends with the run', run('countdown', 0.5, 1).phase === 'race' && run('countdown', 0.5, 1).t === 60 && run('countdown', 0.5, 1).event === 'play' && run('countdown', 2, 1).event === null);
check('phases: the run ends on time or when everybody finished', run('race', 0.5, 1).event === 'results' && run('race', 30, 1, { ...O, allFinished: true }).event === 'results' && run('race', 30, 1).event === null && run('race', 30, 1).t === 29);
check('phases: results go back to waiting (solo uses a short wait from the caller)', run('results', 0.5, 1).phase === 'wait' && run('results', 0.5, 1).t === 12 && run('results', 0.5, 1).event === 'wait');
check('phases: other phase names (Red Light uses "play") work the same', R.stepPhase('play', 0.5, 1, { ...O, play: 'play' }).event === 'results' && R.stepPhase('countdown', 0.5, 1, { ...O, play: 'play' }).phase === 'play');
check('phases: a full cycle returns to the start', (() => { let s = { phase: 'wait', t: 1, event: null }, seen = []; for (let i = 0; i < 400 && seen.at(-1) !== 'wait'; i++) { s = R.stepPhase(s.phase, s.t, 1, O); if (s.event) seen.push(s.event); } return seen.join() === 'countdown,play,results,wait'; })());
check('phases: the input is not mutated and an unknown phase just ticks', (() => { const r = R.stepPhase('weird', 5, 1, O); return r.phase === 'weird' && r.t === 4 && r.event === null; })());

// ---------- meta, wynik, nagroda ----------
const S = () => ({ order: [], times: {}, t: 50 });
let s = S();
check('finish: the first finisher is registered and shortens the round', R.registerFinish(s, 'a', 12.34, 15) && s.order[0] === 'a' && s.times.a === 12.3 && s.t === 15);
check('finish: a second finisher keeps the clock, a repeat is refused', R.registerFinish(s, 'b', 20, 15) && s.t === 15 && !R.registerFinish(s, 'a', 1, 15) && s.order.join() === 'a,b');
s = S(); s.t = 5; R.registerFinish(s, 'a', 1, 15); check('finish: the grace period never lengthens a round', s.t === 5);
check('outcome: multiplayer win, place and no finish', R.raceOutcome(['me', 'x'], 2, {}, 100).kind === 'won' && R.raceOutcome(['x', 'me'], 2, {}, 100).place === 2 && R.raceOutcome(['x'], 2, {}, 100).kind === 'dnf');
check('outcome: solo under par, over par and no time', R.raceOutcome(['me'], 1, { me: 90 }, 100).kind === 'par' && R.raceOutcome(['me'], 1, { me: 100 }, 100).kind === 'par' && R.raceOutcome(['me'], 1, { me: 100.1 }, 100).kind === 'slow' && R.raceOutcome([], 1, {}, 100).kind === 'timeout');
check('reward: only a win (200) or beating par solo (150) pays', R.outcomeReward({ kind: 'won' }) === 200 && R.outcomeReward({ kind: 'par' }) === 150 && ['place', 'dnf', 'slow', 'timeout'].every(k => R.outcomeReward({ kind: k }) === 0));

done('rounds');
