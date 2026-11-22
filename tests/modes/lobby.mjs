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



// ---------- nawiedzone lobby i Mój Pokój (core/hauntlogic.js, lobby.js, graffiti.js, pet.js, petmodel.js, home.js, audio.js, ambience.js) ----------
const HL = await import(pathToFileURL(path.join(ROOT, 'core/hauntlogic.js')).href);
const rngH = (seed) => { let s = seed >>> 0; return () => ((s = Math.imul(s ^ (s >>> 15), 2246822507) >>> 0) / 4294967296); };
check('haunt: a mannequin step goes one step toward the player and only within range, drift, the hall and clear of other mannequins', (() => {
    const home = { x: 0, z: 0 }, pl = { x: 8, z: 0 }, s = HL.manStep({ x: 0, z: 0 }, home, pl, []);
    return s && Math.abs(s.x - HL.HAUNT.MAN.STEP) < 1e-9 && s.z === 0
        && HL.manStep({ x: 0, z: 0 }, home, { x: 1.5, z: 0 }, []) === null && HL.manStep({ x: 0, z: 0 }, home, { x: 40, z: 0 }, []) === null
        && HL.manStep({ x: 3.0, z: 0 }, home, { x: 12, z: 0 }, []) === null && HL.manStep({ x: 12.8, z: 0 }, { x: 12.8, z: 0 }, { x: 20, z: 0 }, []) === null && HL.manStep({ x: 12.8, z: 0 }, { x: 12.8, z: 0 }, { x: 12.8, z: 9 }, []) !== null
        && HL.manStep({ x: 0, z: 0 }, home, pl, [{ x: 1.5, z: 0 }]) === null && HL.manStep({ x: 0, z: 0 }, home, pl, [{ x: 0, z: 0 }]) !== null;
})());
check('haunt: bad input never gives a step, a pose or a fear', [null, undefined, { x: NaN, z: 0 }, 'x'].every(v => HL.manStep(v, { x: 0, z: 0 }, { x: 5, z: 0 }, []) === null && HL.manStep({ x: 0, z: 0 }, v, { x: 5, z: 0 }, []) === null && HL.petFear(v, { x: 0, z: 0 }) === 0 && HL.hideSpot(v, { x: 0, z: 0 }, 1) === null));
check('haunt: a new pose stays within the ranges used when mannequins are built, and the head is sometimes extremely tilted', (() => {
    const R = rngH(5); let extreme = 0;
    for (let i = 0; i < 500; i++) { const p = HL.poseVariant(R); if (Math.abs(p.leanZ) > 0.11 + 1e-9 || Math.abs(p.leanX) > 0.1 + 1e-9 || p.headX < -0.21 - 1e-9 || p.headX > 0.49 + 1e-9 || Math.abs(p.headZ) > 1.6 + 1e-9) return false; if (Math.abs(p.headZ) > 0.5) extreme++; }
    return extreme > 40 && extreme < 200;
})());
check('haunt: pickKind never repeats the last event and covers all of them', (() => { const R = rngH(9), seen = new Set(); let last = -1; for (let i = 0; i < 400; i++) { const k = HL.pickKind(5, R, last); if (k === last || k < 0 || k > 4) return false; seen.add(k); last = k; } return seen.size === 5 && HL.pickKind(1, R, 0) === 0 && HL.pickKind(0, R, -1) === -1; })());
check('haunt: the pet fear is 0 without a monster or beyond 14 m, 1 within 4 m, and grows as the monster gets closer', HL.petFear(null, { x: 0, z: 0 }) === 0 && HL.petFear({ x: 15, z: 0 }, { x: 0, z: 0 }) === 0 && HL.petFear({ x: 3, z: 0 }, { x: 0, z: 0 }) === 1 && HL.petFear({ x: 8, z: 0 }, { x: 0, z: 0 }) > HL.petFear({ x: 10, z: 0 }, { x: 0, z: 0 }) && HL.petFear({ x: 8, z: 0 }, { x: 0, z: 0 }) > 0 && HL.petFear({ x: 8, z: 0 }, { x: 0, z: 0 }) < 1);
check('haunt: the pet hides on the line monster -> player, behind the player', (() => { const s = HL.hideSpot({ x: 0, z: 0 }, { x: 4, z: 0 }, 0.9); return Math.abs(s.x - 4.9) < 1e-9 && Math.abs(s.z) < 1e-9 && HL.hideSpot({ x: 2, z: 2 }, { x: 2, z: 2 }, 1) !== null; })());
check('haunt: the mural drawing fades in over 1.2 s, holds, flickers away at the end and is invisible outside its time', HL.grafAlpha(0, 8) === 0 && HL.grafAlpha(0.6, 8) === 0.5 && HL.grafAlpha(3, 8) === 1 && HL.grafAlpha(-1, 8) === 0 && HL.grafAlpha(9, 8) === 0 && HL.grafAlpha(NaN, 8) === 0 && (() => { let lo = 1; for (let t = 6.6; t < 8; t += 0.01) lo = Math.min(lo, HL.grafAlpha(t, 8)); return lo < 0.3; })());
check('haunt: the schedules are sane (mural every 2.5-5 min, room every 18-40 s, mannequins every 9-18 s) and fixed lists have the right kinds', HL.HAUNT.GRAF.EVERY[0] >= 120 && HL.HAUNT.HOME.EVERY[0] >= 15 && HL.HAUNT.MAN.EVERY[0] >= 8 && HL.HAUNT.GRAF.KINDS.length === 6 && HL.HAUNT.HOME.KINDS.join() === 'shift,lights,writing,cups,statue' && HL.nextIn([10, 20], () => 0.5) === 15);
const srcOf = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8'), LOB = srcOf('levels/lobby.js'), GRF = srcOf('core/graffiti.js'), PET = srcOf('core/pet.js'), HOM = srcOf('levels/home.js'), AMB = srcOf('core/ambience.js'), REG = srcOf('core/registry.js'), PLY = srcOf('core/lobbyplay.js'), PMD = srcOf('core/petmodel.js'), PAU = srcOf('core/pause.js');
check('haunt: every effect is gated by the lobby events option (the Haunt button in the pause menu)', /SETTINGS\.lobbyEvents !== false\) \{ m\.hauntT/.test(LOB) && /o\.enabled !== false && o\.night === 'calm'/.test(GRF) && /SETTINGS\.lobbyEvents !== false\) \{ h\.t -= dt/.test(HOM) && /r\.t === 'pa' \|\| r\.t === 'laugh'\) && SETTINGS\.lobbyEvents === false/.test(AMB) && /SETTINGS\.lobbyEvents !== false\) \{[^\n]*\n\s*S\.crackT/.test(PLY) && /'Haunt on' : 'Haunt off'/.test(PAU));
check('haunt: the mural overlay is local only (no network call in its code), the pet reads the night from the shared state and the lobby sounds are registered', !/N\.send[\s\S]{0,40}haunt/i.test(GRF) && /HAUNT_STATE\.monster/.test(PET) && /HAUNT_STATE\.monster = S\.night\.ph === 'night'/.test(PLY) && /fear: p\.fear/.test(PET) && /expr === 'scared'/.test(PMD) && /t: 'pa'/.test(REG) && /t: 'laugh'/.test(REG));

// ---------- Staff room, który się psuje (core/hauntlogic.js STAFF, levels/staff.js) ----------
check('staff: the tension rises linearly over 4 minutes in the room and is clamped, bad input gives 0', HL.staffDread(0) === 0 && HL.staffDread(120) === 0.5 && HL.staffDread(240) === 1 && HL.staffDread(9999) === 1 && HL.staffDread(-5) === 0 && HL.staffDread(NaN) === 0 && HL.staffDread(undefined) === 0);
check('staff: events come more often with more tension, never faster than 40% of the base gap and never slower than the base', (() => { const lo = HL.staffGap(0, () => 0.5), hi = HL.staffGap(1, () => 0.5), mid = HL.staffGap(0.5, () => 0.5); return lo === 20 && Math.abs(hi - 8) < 1e-9 && mid < lo && mid > hi && HL.staffGap(5, () => 0.5) === hi && HL.staffGap(NaN, () => 0.5) === lo; })());
check('staff: the blackout is due once at the peak of tension and never twice', !HL.staffBlackoutDue(0.5, false) && HL.staffBlackoutDue(0.85, false) && HL.staffBlackoutDue(1, false) && !HL.staffBlackoutDue(1, true) && !HL.staffBlackoutDue(NaN, false));
check('staff: the red eyes come from 7 m to 1.6 m over the 6 s blackout and stay put outside it', HL.eyesDistance(0) === 7 && HL.eyesDistance(-3) === 7 && HL.eyesDistance(6) === 1.6 && HL.eyesDistance(60) === 1.6 && Math.abs(HL.eyesDistance(3) - 4.3) < 1e-9 && HL.eyesDistance(NaN) === 7);
check('staff: a portrait pupil follows the player and rests when the player is behind the picture', (() => { const a = HL.pupilOffset({ x: 1, y: 0, z: 2 }), b = HL.pupilOffset({ x: -5, y: 5, z: 1 }), c = HL.pupilOffset({ x: 1, y: 1, z: -1 }), d = HL.pupilOffset(null); return a.x === 0.5 && a.y === 0 && b.x === -1 && b.y === 1 && c.x === 0 && c.y === 0 && d.x === 0 && d.y === 0; })());
check('staff: the creeping mannequin steps stop 1.8 m from the player and keep 1.4 m from each other', HL.manStep({ x: 0, z: 0 }, { x: 0, z: 0 }, { x: 2, z: 0 }, [], HL.STAFF.CREEP) === null && HL.manStep({ x: 0, z: 0 }, { x: 0, z: 0 }, { x: 4, z: 0 }, [], HL.STAFF.CREEP) !== null && HL.manStep({ x: 0, z: 0 }, { x: 0, z: 0 }, { x: 4, z: 0 }, [{ x: 0.9, z: 0 }], HL.STAFF.CREEP) === null);
const STF = srcOf('levels/staff.js');
check('staff: the room keeps its door, TV and computer, restores lights and fog when it ends, and respects the Haunt switch', /target: 'lobby'/.test(STF) && /tv\.createMesh/.test(STF) && /staffPC\.createMesh/.test(STF) && /DREAD\.fogMul = 1; setDread\(null\)/.test(STF) && /const on = SETTINGS\.lobbyEvents !== false/.test(STF) && /if \(!on\) return;\s*\n\s*h\.elapsed/.test(STF) && /theme: 'dread'/.test(REG.slice(REG.indexOf("id: 'staff'"), REG.indexOf("id: 'staff'") + 200)));

// ---------- głos z mikrofonu przyciąga potwory i fałszywe kryjówki (core/hauntlogic.js VOICE, core/ambience.js, levels/hotel.js, levels/laundry.js) ----------
check('voice: quiet below 0.06 does nothing, 0.25 and louder is the maximum level, bad input is silent', HL.voiceLevel(0) === 0 && HL.voiceLevel(0.06) === 0 && HL.voiceLevel(0.25) === 1 && HL.voiceLevel(2) === 1 && Math.abs(HL.voiceLevel(0.155) - 0.5) < 1e-9 && [NaN, -1, undefined, null, 'x'].every(v => HL.voiceLevel(v) === 0));
check('voice: the hearing range grows from 6 m to 20 m with the level and is 0 in silence', HL.voiceRange(0) === 0 && HL.voiceRange(0.0001) > 6 && HL.voiceRange(1) === 20 && HL.voiceRange(0.5) === 13 && HL.voiceRange(5) === 20 && HL.voiceRange(NaN) === 0 && HL.voiceRange(-1) === 0);
check('voice: a monster hears the voice only within the range, a hidden player is heard at 40% of it and bad input never hears', HL.voiceHeard(1, 19) && !HL.voiceHeard(1, 21) && !HL.voiceHeard(0, 1) && HL.voiceHeard(1, 7, 0.4) && !HL.voiceHeard(1, 9, 0.4) && HL.voiceHeard(1, 25, 1.3) && !HL.voiceHeard(1, NaN) && !HL.voiceHeard(NaN, 5));
check('voice: the level rises fast, falls slowly (pauses in speech do not silence it at once) and never goes wrong on bad input', (() => { let v = 0; for (let i = 0; i < 4; i++) v = HL.voiceSmooth(v, 1, 0.05); const up = v; v = HL.voiceSmooth(v, 0, 0.1); return up >= 0.99 && v > 0.8 && v < 1 && HL.voiceSmooth(0.5, 1, 0) === 0.5 && HL.voiceSmooth(NaN, NaN, NaN) === 0 && HL.voiceSmooth(0.5, 0.5, 0.1) === 0.5; })());
const HTL = srcOf('levels/hotel.js'), LND = srcOf('levels/laundry.js'), CEM = srcOf('levels/cemetery.js'), CAT = srcOf('levels/catacombs.js'), FUR = srcOf('levels/furas.js');
check('voice: the cemetery, catacombs, Furas and the hotel hear the microphone, the hotel also for the blind one in room 50, and the level start resets it', [CEM, CAT, FUR].every(s => /\|\| heardVoice\(d, /.test(s)) && /heardVoice\(d, S\.hidden \? VOICE\.HIDDEN_MUL : 1\)/.test(HTL) && /Math\.max\(DREAD\.voice,/.test(HTL) && /voiceToast = false; DREAD\.voice = 0/.test(AMB) && /DREAD\.voice = voiceSmooth\(DREAD\.voice, voiceLevel\(micLevel\(\)\), dt\)/.test(AMB));
check('hide: in the hotel every fifth wardrobe is a fake hiding place (own seed, so the layouts do not change), revealed once and never during a rush', /nw\.fake = T\.mkRng\(9100 \+ i \* 31 \+ room\.wardrobes\.length\)\(\) < FAKE\.chance/.test(HTL) && /S\.rush\.state === 'wait' && S\.phase === 'play'/.test(HTL) && /w\.fakeDone = true/.test(HTL) && /SFX\.breath\(\{ x: w\.x/.test(HTL));
check('hide: in the laundry some open drums are fake (fixed seed), the Rag Man heads for the spot and a revealed drum stops protecting', /T\.mkRng\(4411\)/.test(LND) && /!S\.fakeUsed\.has\(i\)/.test(LND) && /S\.tm\.mode = 'investigate'; S\.tm\.investigate = p\.clone\(\)/.test(LND) && /checkFake\(dt, p\)/.test(LND));
check('staff: the ceiling lights are a bit brighter than before (9 instead of 6, the original 10) and the diffuse light and fog are a bit lighter', HL.STAFF.CEIL === 9 && HL.STAFF.HEMI === 0.8 && HL.STAFF.FOG === 1.35 && /STAFF\.CEIL/.test(srcOf('levels/staff.js')));
