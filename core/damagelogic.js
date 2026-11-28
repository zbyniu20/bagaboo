// ==========================================
// SCARY GTA: OBRAŻENIA I CIAŁA (czysta logika, bez THREE i sieci). Zdrowie z core/gunlogic.js (HP 100, ciało 25, głowa 50) pokazujemy jako PROCENT OBRAŻEŃ: 0% = cały, 100% = martwy.
// Zabity gracz albo policjant PADA (animacja przewrotu z nóg w kierunku trafienia) i LEŻY w kałuży krwi, która rośnie po upadku; po `LINGER` sekundach ciało blednie i znika.
// Kałuża jest tylko przy włączonej opcji Gore (SETTINGS.gore): na poziomach brutalności Medium i Gentle zostaje samo ciało. Zabity gracz ukryty jest u innych (awatar) do odrodzenia,
// a jego ciało leży w miejscu śmierci. Wszystko wizualne i lokalne: reguły życia i śmierci zostają po stronie hosta (core/gunlogic.js, levels/scarygta.js).
// 3D: core/gtacorpsefx.js. Testy: tests/logic.mjs (blok "obrażenia"), w przeglądarce tests/gtadamage.mjs.
// ==========================================
export const DMG = { MAX_HP: 100, FALL: 0.75, POOL_DELAY: 0.45, POOL_GROW: 5, POOL_R: 1.05, LINGER: 16, FADE: 3, HIDE_AVATAR: 5, MAX_CORPSES: 10, MAX_PEDS: 12, HIT_SHOW: 0.9, MAX_COORD: 400 };
const fin = (n) => typeof n === 'number' && Number.isFinite(n);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
// Procent obrażeń z zdrowia: 100 HP = 0%, 0 HP = 100%; śmieci dają 0%
export const damagePct = (hp, max) => { const m = fin(max) && max > 0 ? max : DMG.MAX_HP; return fin(hp) ? Math.round(clamp((1 - hp / m) * 100, 0, 100)) : 0; };
// Ile procent obrażeń daje jedno trafienie (zdrowie 100: tyle samo co punkty)
export const hitPct = (dmg, max) => { const m = fin(max) && max > 0 ? max : DMG.MAX_HP; return fin(dmg) ? Math.round(clamp(dmg / m * 100, 0, 100)) : 0; };
export const damageColor = (pct) => pct >= 75 ? '#ff4a3a' : pct >= 40 ? '#ffb030' : '#7fff90';
// Napis przy trafieniu strzelca: KILL / HEADSHOT 50% / HIT 25%
export const hitText = (zone, pct, kill) => kill ? 'KILL' : (zone === 'head' ? 'HEADSHOT ' : 'HIT ') + hitPct(pct) + '%';
// Kierunek upadku (rad., kąt wokół osi Y; przód ciała = +Z): od strzelca w stronę ofiary; bez strzelca stabilnie z miejsca (bez losowania, więc każdy klient ma to samo)
export function fallYaw(vx, vz, from) {
    if (from && fin(from.x) && fin(from.z) && fin(vx) && fin(vz) && Math.hypot(vx - from.x, vz - from.z) > 0.3) return Math.atan2(vx - from.x, vz - from.z);
    const h = Math.sin((fin(vx) ? vx : 0) * 12.9898 + (fin(vz) ? vz : 0) * 78.233) * 43758.5453; return (h - Math.floor(h)) * Math.PI * 2;
}
// Nowe ciało: id (identyfikator sieciowy gracza albo 'cN' policjanta), kind 'player' | 'cop', gore = czy rysować krew
export function newCorpse(id, x, z, o) {
    const op = o || {};
    return { id: String(id).slice(0, 48), kind: op.kind === 'cop' ? 'cop' : (op.kind === 'ped' ? 'ped' : 'player'), x: clamp(fin(x) ? x : 0, -DMG.MAX_COORD, DMG.MAX_COORD), z: clamp(fin(z) ? z : 0, -DMG.MAX_COORD, DMG.MAX_COORD), yaw: fin(op.yaw) ? op.yaw : 0, gore: !!op.gore, age: 0 };
}
const smooth = (t) => { const k = clamp(t, 0, 1); return k * k * (3 - 2 * k); };
// Stan ciała po `age` sekundach: fall 0..1 (przewrót: wolny start, szybki koniec), pool 0..1 (rozlewanie), scale 1..0 (blednięcie), alive
export function corpseState(c) {
    const a = c.age, f = clamp(a / DMG.FALL, 0, 1), fall = Math.pow(f, 1.8), t = a - DMG.POOL_DELAY;   // przewrót przyspiesza i kończy się uderzeniem o ziemię
    const fade = a > DMG.LINGER - DMG.FADE ? clamp((DMG.LINGER - a) / DMG.FADE, 0, 1) : 1;
    return { fall: clamp(fall, 0, 1), pool: c.gore ? smooth(t / DMG.POOL_GROW) : 0, scale: fade, alive: a < DMG.LINGER, avatarHidden: c.kind === 'player' && a < DMG.HIDE_AVATAR };
}
// Lista ciał: nowe ciało tego samego id zastępuje stare; gracze i policjanci mają limit MAX_CORPSES, przechodnie OSOBNY limit MAX_PEDS (tłum nie wypiera ciał graczy); po przekroczeniu odpada najstarsze z tego rodzaju
export function addCorpse(list, c) {
    const out = list.filter(q => q.id !== c.id); out.push(c);
    const isPed = (q) => q.kind === 'ped', cap = isPed(c) ? DMG.MAX_PEDS : DMG.MAX_CORPSES;
    while (out.filter(q => isPed(q) === isPed(c)).length > cap) { let k = -1; for (let i = 0; i < out.length; i++) if (isPed(out[i]) === isPed(c) && (k < 0 || out[i].age > out[k].age)) k = i; out.splice(k, 1); }
    return out;
}
export function stepCorpses(list, dt) {
    const d = fin(dt) ? clamp(dt, 0, 0.5) : 0, out = [];
    for (const c of list) { const n = Object.assign({}, c, { age: c.age + d }); if (corpseState(n).alive) out.push(n); }
    return out;
}
// Pozycja i rozmiar kałuży względem ciała: leży za głową, lekko wydłużona w stronę upadku
export function poolSpot(c, st) { const s = st || corpseState(c), r = DMG.POOL_R * (0.3 + 0.7 * s.pool) * s.scale, off = 0.55 * s.pool; return { x: c.x + Math.sin(c.yaw) * off, z: c.z + Math.cos(c.yaw) * off, rx: r * 0.9, rz: r * 1.15 }; }
export function damageProblems() {
    const bad = [];
    if (damagePct(100) !== 0 || damagePct(0) !== 100 || damagePct(75) !== 25 || damagePct(NaN) !== 0) bad.push('damage percent is wrong');
    const c0 = newCorpse('p', 0, 0, { gore: true });
    if (corpseState(c0).fall !== 0 || corpseState(Object.assign({}, c0, { age: DMG.FALL })).fall !== 1) bad.push('the fall does not run from 0 to 1');
    if (DMG.FADE >= DMG.LINGER || DMG.HIDE_AVATAR > DMG.LINGER) bad.push('corpse timings are inconsistent');
    return bad;
}
