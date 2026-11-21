// Test własny lobby (uruchamiany automatycznie przez levelpack.mjs): pola głosowania (używa ich lobby Become the Monster) i Nocna Zmiana z core/lobbylogic.js.
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { check } from '../lib.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const L = await import(pathToFileURL(path.join(ROOT, 'core/lobbylogic.js')).href);
const T = (s) => 'lobby: ' + s;
const head = (x, z, y = 1.6) => ({ x, y, z });
const seq = (vals) => { let i = 0; return () => vals[i++ % vals.length]; };
const [P0, P1, P2] = L.GATE.PADS;

// ---------- pola głosowania ----------
check(T('pads: standing on a pad votes for it, between pads or far away does not'), L.padOf(head(P0[0], P0[1])) === 0 && L.padOf(head(P2[0] + 0.5, P2[1])) === 2 && L.padOf(head(0, 0)) === -1 && L.padOf(head(P1[0], P1[1] + 1.5)) === -1);
check(T('pads: a head high above the floor (stairs) does not vote'), L.padOf(head(P0[0], P0[1], 6)) === -1 && L.padOf(head(P0[0], P0[1], L.GATE.MAX_HEAD_Y)) === 0);
check(T('pads: broken positions never vote'), [null, undefined, head(NaN, 0), head(P0[0], P0[1], NaN), { x: P0[0] }, 'x'].every(h => L.padOf(h) === -1));
check(T('pads: the pads do not overlap and are inside the lobby'), L.GATE.PADS.every(p => Math.abs(p[0]) < 14 && Math.abs(p[1]) < 14) && L.GATE.PADS.every((a, i) => L.GATE.PADS.every((b, j) => i === j || Math.hypot(a[0] - b[0], a[1] - b[1]) > 2 * L.GATE.R)));
check(T('votes: one vote per player and the totals add up'), (() => { const v = L.countVotes({ a: head(P0[0], P0[1]), b: head(P0[0], P0[1] + 0.3), c: head(P2[0], P2[1]), d: head(0, 0) }); return v.counts.join() === '2,0,1' && v.total === 3 && v.who.a === 0 && v.who.d === undefined; })());
check(T('winner: the most votes wins, a tie is drawn among the tied, nobody voted = -1'), L.winnerOf([1, 3, 2], () => 0) === 1 && L.winnerOf([2, 0, 2], () => 0) === 0 && L.winnerOf([2, 0, 2], () => 0.99) === 2 && L.winnerOf([0, 0, 0], Math.random) === -1);

// ---------- maszyna bramy ----------
const step = (g, dt, total, present) => L.gateStep(g, dt, total, present);
check(T('gate: waits without votes, starts counting on the first vote'), step({ ph: 'open', t: 0 }, 1, 0, 3).event === null && step({ ph: 'open', t: 0 }, 1, 1, 3).ph === 'counting' && step({ ph: 'open', t: 0 }, 1, 1, 3).event === 'start');
check(T('gate: cancels when everybody leaves the pads'), step({ ph: 'counting', t: 9 }, 1, 0, 3).event === 'cancel' && step({ ph: 'counting', t: 9 }, 1, 0, 3).ph === 'open');
check(T('gate: the vote locks after VOTE_SEC and the launch countdown follows'), (() => { let g = { ph: 'counting', t: L.GATE.VOTE_SEC }, ev = []; for (let i = 0; i < 400 && g.ph !== 'open'; i++) { g = step(g, 0.1, 1, 3); if (g.event) ev.push(g.event); } return ev.join() === 'lock,go'; })());
check(T('gate: when everybody voted the wait is shortened (group vs solo)'), step({ ph: 'counting', t: 15 }, 0.1, 3, 3).t <= L.GATE.QUICK_SEC && step({ ph: 'counting', t: 15 }, 0.1, 1, 1).t <= L.GATE.SOLO_SEC && step({ ph: 'counting', t: 15 }, 0.1, 1, 3).t > L.GATE.QUICK_SEC);
check(T('gate: shortening never lengthens a countdown'), step({ ph: 'counting', t: 1 }, 0.1, 3, 3).t < 1);
check(T('gate: launching ends with go and returns to open'), step({ ph: 'launching', t: 0.05 }, 0.1, 1, 1).event === 'go' && step({ ph: 'launching', t: 0.05 }, 0.1, 1, 1).ph === 'open' && step({ ph: 'launching', t: 2 }, 0.1, 0, 1).event === null);
check(T('gate: an unknown phase falls back to open'), step({ ph: 'weird', t: 1 }, 0.1, 1, 1).ph === 'open');


// ---------- Nocna Zmiana ----------
const N = (ph, t, extra) => ({ ph, t, ...extra }), IN = { enabled: true, present: 2, allFuses: false }, rnd = () => 0.5;
check(T('night: the first one comes after 3-5 minutes, later ones every 8-12 minutes'), L.nextNightIn(true, () => 0) === L.NIGHT.FIRST_MIN && L.nextNightIn(true, () => 1) === L.NIGHT.FIRST_MAX && L.nextNightIn(false, () => 0) === L.NIGHT.EVERY_MIN && L.nextNightIn(false, () => 1) === L.NIGHT.EVERY_MAX);
check(T('night: stays calm while disabled or when nobody is in the lobby'), L.nightStep(N('calm', 0.5), 1, { ...IN, enabled: false }, rnd).ph === 'calm' && L.nightStep(N('calm', 0.5), 1, { ...IN, present: 0 }, rnd).ph === 'calm' && L.nightStep(N('calm', 0.5), 1, IN, rnd).event === 'warn');
check(T('night: a full cycle (warn, start, lose by time, end)'), (() => { let n = N('calm', 1), ev = []; for (let i = 0; i < 6000 && !(ev.length && n.ph === 'calm'); i++) { n = L.nightStep(n, 0.1, IN, rnd); if (n.event) ev.push(n.event); } return ev.join() === 'warn,start,lose,end'; })());
check(T('night: repairing all fuses wins at once and ends with end'), (() => { let n = L.nightStep(N('night', 100), 0.1, { ...IN, allFuses: true }, rnd); const first = n; n = N(n.ph, 0.05, { outcome: n.outcome }); n = L.nightStep(n, 0.1, IN, rnd); return first.event === 'win' && first.outcome === 'win' && n.event === 'end' && n.ph === 'calm'; })());
check(T('night: the wait after a night is the regular interval'), L.nightStep(N('result', 0.01, { outcome: 'win' }), 0.1, IN, rnd).t === L.nextNightIn(false, rnd));
check(T('night: the reward needs real contribution (anti-AFK)'), JSON.stringify(L.winners(['a', 'b', 'c'], { a: 10, b: 1, c: L.NIGHT.MIN_CONTRIB })) === '["a","c"]' && L.winners(['a'], {}).length === 0);
check(T('night: darkness grows during the warning, is deep at night and fades after'), L.nightDim('calm', 0) === 1 && L.nightDim('warn', L.NIGHT.WARN_SEC) === 1 && L.nightDim('warn', 0) === 0.5 && L.nightDim('night', 50) === 0.12 && L.nightDim('result', L.NIGHT.RESULT_SEC) === 0.12 && L.nightDim('result', 0) === 1);
check(T('night: fuses are spread out and inside the lobby'), L.NIGHT.FUSES.length === 3 && L.NIGHT.FUSES.every(f => Math.abs(f[0]) < 14 && Math.abs(f[1]) < 14) && L.NIGHT.FUSES.every((a, i) => L.NIGHT.FUSES.every((b, j) => i === j || Math.hypot(a[0] - b[0], a[1] - b[1]) > 8)));
check(T('night: the voting pads are not on a fuse'), L.GATE.PADS.every(p => L.NIGHT.FUSES.every(f => Math.hypot(p[0] - f[0], p[1] - f[1]) > 6)));
check(T('night: the monster start is far from the spawn and every fuse is repairable within the night'), Math.hypot(...L.NIGHT.MONSTER_START) > 8 && L.NIGHT.FUSES.length * L.NIGHT.FUSE_SEC * 2 < L.NIGHT.NIGHT_SEC);

// ---------- integracja: lobby.js i lobbyplay.js ----------
const play = fs.existsSync(path.join(ROOT, 'core/lobbyplay.js')) ? fs.readFileSync(path.join(ROOT, 'core/lobbyplay.js'), 'utf8') : '';
const lob = fs.readFileSync(path.join(ROOT, 'levels/lobby.js'), 'utf8');
check(T('lobby.js wires the play module in build, update and dispose'), /buildLobbyPlay\(/.test(lob) && /updateLobbyPlay\(/.test(lob) && /disposeLobbyPlay\(/.test(lob));
check(T('lobby.js builds the play module at the start of build() (not inside a helper)'), /export function build\(\) \{[\s\S]{0,400}buildLobbyPlay\(\)/.test(lob));
check(T('lobbyplay.js unregisters its network handler on exit'), /onLevelMsg\(null\)/.test(play) && /onLevelMsg\(onMsg\)/.test(play));
check(T('lobbyplay.js restores the normal lighting after the night'), /applyLighting\(LP\)/.test(play));
check(T('lobbyplay.js uses the host-side view of players (no client-reported positions) and the shared logic'), /headOf\(/.test(play) && /from '\.\/lobbylogic\.js'/.test(play) && !/msg\.(pos|head|x|z)\b/.test(play));

// ---------- kącik gier: kosz i tarcza (core/minigames.js, core/lobbygames.js) ----------
const MG = await import(pathToFileURL(path.join(ROOT, 'core/minigames.js')).href);
const H = MG.HOOP, TG = MG.TARGET, p3 = (x, y, z) => ({ x, y, z });
check(T('hoop: a ball falling through the middle of the ring scores, also a fast one that skips over the plane between frames'), MG.hoopScored(p3(H.X, H.Y + 0.1, H.Z), p3(H.X, H.Y - 0.1, H.Z)) && MG.hoopScored(p3(H.X + 0.05, H.Y + 0.8, H.Z), p3(H.X + 0.05, H.Y - 0.8, H.Z)));
check(T('hoop: a miss, a ball going up, a ball below the ring and a ball on the rim do not score'), !MG.hoopScored(p3(H.X + 0.6, H.Y + 0.1, H.Z), p3(H.X + 0.6, H.Y - 0.1, H.Z)) && !MG.hoopScored(p3(H.X, H.Y - 0.1, H.Z), p3(H.X, H.Y + 0.1, H.Z)) && !MG.hoopScored(p3(H.X, H.Y - 0.5, H.Z), p3(H.X, H.Y - 0.9, H.Z)) && !MG.hoopScored(p3(H.X + H.R, H.Y + 0.1, H.Z), p3(H.X + H.R, H.Y - 0.1, H.Z)));
check(T('hoop: a slanted shot counts by where it crosses the ring plane, not by where it ends'), MG.hoopScored(p3(H.X + 0.5, H.Y + 0.5, H.Z), p3(H.X - 0.5, H.Y - 0.5, H.Z)) && !MG.hoopScored(p3(H.X + 0.2, H.Y + 0.1, H.Z), p3(H.X + 1.6, H.Y - 0.1, H.Z)));
check(T('hoop: broken positions never score'), [null, undefined, p3(NaN, 1, 1), { x: 1, y: 2 }, 'x'].every(b => !MG.hoopScored(b, p3(H.X, H.Y - 1, H.Z)) && !MG.hoopScored(p3(H.X, H.Y + 1, H.Z), b)));
const wallBall = (dy, dz, x = TG.WALL_HIT - 0.04) => [p3(x + 0.05, TG.Y + dy, TG.Z + dz), p3(x, TG.Y + dy, TG.Z + dz)];
check(T('target: rings give 50, 20, 10 and 5, a miss gives nothing'), MG.targetPoints(...wallBall(0, 0)) === 50 && MG.targetPoints(...wallBall(0.15, 0)) === 20 && MG.targetPoints(...wallBall(0, 0.3)) === 10 && MG.targetPoints(...wallBall(-0.5, 0)) === 5 && MG.targetPoints(...wallBall(0.9, 0)) === 0);
check(T('target: a ball far from the wall, flying away from it or standing still does not score'), MG.targetPoints(p3(-10, TG.Y, TG.Z), p3(-10.05, TG.Y, TG.Z)) === 0 && MG.targetPoints(p3(TG.WALL_HIT - 0.1, TG.Y, TG.Z), p3(TG.WALL_HIT - 0.05, TG.Y, TG.Z)) === 0 && MG.targetPoints(p3(TG.WALL_HIT - 0.1, TG.Y, TG.Z), p3(TG.WALL_HIT - 0.1, TG.Y, TG.Z)) === 0 && MG.targetPoints(null, p3(0, 0, 0)) === 0 && MG.targetPoints(p3(NaN, 0, 0), p3(0, 0, 0)) === 0);
check(T('streak: baskets within the window build a streak, a pause resets it, the first basket starts at 1'), MG.nextStreak(2, 10, 20) === 3 && MG.nextStreak(2, 10, 10 + MG.STREAK_WINDOW + 1) === 1 && MG.nextStreak(0, -1, 5) === 1 && MG.nextStreak(5, NaN, 5) === 1);
check(T('state: scoring returns a new state, remembers the best streak and the best target, ignores zero points and is capped'), (() => {
    const a = MG.newMinigames(), b = MG.addHoop(a, 1), c = MG.addHoop(b, 5), d = MG.addHoop(c, 60), e = MG.addTarget(d, 20), f = MG.addTarget(e, 0), g = MG.addTarget(MG.addTarget(f, 50), 5);
    const huge = MG.addTarget({ ...a, target: MG.MAX_SCORE - 1 }, 50);
    return a.hoops === 0 && b.hoops === 1 && c.streak === 2 && d.streak === 1 && d.bestStreak === 2 && d.hoops === 3 && e.target === 20 && f === e && g.bestTarget === 50 && g.lastTarget === 5 && huge.target === MG.MAX_SCORE;
})());
check(T('network: counters survive the round trip and bad data from a guest or a host is rejected'), (() => {
    const s = MG.addTarget(MG.addHoop(MG.newMinigames(), 3), 50), r = MG.cleanMinigames(MG.netMinigames(s));
    return r && r.hoops === 1 && r.target === 50 && r.bestTarget === 50 && [null, 'x', [], [1, 2, 3], [1, 2, 3, 4, 5, 6, 7], [1, 2, 3, 4, 5, -1], [1, 2, 3, 4, 5, 1.5], [1, 2, 3, 4, 5, MG.MAX_SCORE + 1], [1, 2, 3, 4, 5, '6'], [1, 2, 3, 4, 5, NaN]].every(x => MG.cleanMinigames(x) === null);
})());
check(T('layout: the hoop and the target sit on the west wall inside the lobby, do not overlap the daily board (z 3.75-7.25) or the shop, and the ring is high enough to shoot at'), H.X > -14.93 && H.X < -13.5 && H.Z - 0.9 > 7.25 && TG.Z - TG.R > 7.25 && TG.Z + TG.R < H.Z - 0.9 && H.Z + 0.9 < 12 && H.Y >= 2.5 && H.Y <= 3.6 && TG.Y - TG.R > 0.5 && TG.R <= 0.7 && TG.RINGS.every((r, i) => i === 0 || r[0] > TG.RINGS[i - 1][0]) && TG.RINGS[TG.RINGS.length - 1][0] === TG.R);
{
    const lg = fs.readFileSync(path.join(ROOT, 'core/lobbygames.js'), 'utf8'), lp = fs.readFileSync(path.join(ROOT, 'core/lobbyplay.js'), 'utf8');
    check(T('arcade: only the host (or solo) counts points, guests take counters only through cleanMinigames, and it never pays out'), /if \(auth\) for \(const ball of L\.throwables\)/.test(lg) && /cleanMinigames\(a\)/.test(lg) && !/levelReward|addBones|spendBones|SAVE\./.test(lg) && /updateLobbyGames\(dt, auth\)/.test(lp) && /mg: lobbyGamesNet\(\)/.test(lp) && /acceptLobbyGames\(msg\.mg\)/.test(lp) && /disposeLobbyGames\(\)/.test(lp));
    check(T('arcade: the extra balls have fixed ids, so guests build the same objects as the host'), (lg.match(/mgball' \+ \(i \+ 1\)/g) || []).length === 1 && /\[-9, 1, 8\.4\], \[-9, 1, 9\.6\], \[-9, 1, 10\.8\]/.test(lg));
}

