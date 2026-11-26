// ==========================================
// SCARY GTA, ETAP 3b (czysta logika, bez THREE): broń, trafienia, życie i tryby PvP. Wszystko rozstrzyga HOST (albo solo) z własnego widoku graczy;
// klient wysyła tylko {o, d} (początek i kierunek strzału), a host sprawdza tempo, magazynek, odległość od głowy strzelca i zasłonięcie przez budynki.
// Tryb: łatwy poziom = CO-OP (bez ognia przyjacielskiego), normalny i koszmar = FFA (wszyscy do wszystkich). Testy: tests/logic.mjs (blok "etap 3b").
// ==========================================
import { lineBlocked } from './cityai.js';
export const GUN = { HP: 100, DMG: 25, HEAD_MUL: 2, RATE: 0.28, MAG: 12, RELOAD: 1.6, RANGE: 60, HEAD_R: 0.2, TORSO_R: 0.34, LEG_R: 0.3, ORIGIN_TOL: 2.5, RESPAWN: 5, PROTECT: 3, COP_EYE: 1.7, COP_HP: 100, MAX_COORD: 400 };
const fin = (n) => typeof n === 'number' && Number.isFinite(n);
const vec = (a) => Array.isArray(a) && a.length === 3 && a.every(v => fin(v) && Math.abs(v) < GUN.MAX_COORD) ? a : null;
export const modeFor = (diffId) => diffId === 'easy' ? 'coop' : 'ffa';
export const friendlyFire = (mode) => mode === 'ffa';
export const newShooter = () => ({ ammo: GUN.MAG, last: -9, reloadAt: -1, hp: GUN.HP, deadUntil: 0, protectUntil: 0 });
// Wiadomość strzału od klienta: tylko dwa trzyelementowe wektory ze skończonych liczb
export function cleanShot(m) {
    if (!m || typeof m !== 'object') return null;
    const o = vec(m.o), d = vec(m.d); if (!o || !d) return null;
    const len = Math.hypot(d[0], d[1], d[2]); if (len < 0.9 || len > 1.1) return null;
    return { o: o, d: [d[0] / len, d[1] / len, d[2] / len] };
}
// Czy strzał jest dozwolony (host): żywy strzelec, tempo, magazynek i przeładowanie, początek lufy blisko głowy strzelca. Zużywa nabój, gdy ok.
export function shotCheck(sh, shot, now, head) {
    if (!sh || !shot) return { ok: false, reason: 'bad' };
    if (now < sh.deadUntil) return { ok: false, reason: 'dead' };
    if (!head || !fin(head.x) || !fin(head.y) || !fin(head.z)) return { ok: false, reason: 'nohead' };
    if (Math.hypot(shot.o[0] - head.x, shot.o[1] - head.y, shot.o[2] - head.z) > GUN.ORIGIN_TOL) return { ok: false, reason: 'origin' };
    if (sh.reloadAt >= 0) { if (now >= sh.reloadAt) { sh.ammo = GUN.MAG; sh.reloadAt = -1; } else return { ok: false, reason: 'reloading' }; }
    if (now - sh.last < GUN.RATE * 0.8) return { ok: false, reason: 'rate' };
    if (sh.ammo <= 0) { sh.reloadAt = now + GUN.RELOAD; return { ok: false, reason: 'empty' }; }
    sh.ammo--; sh.last = now; if (sh.ammo === 0) sh.reloadAt = now + GUN.RELOAD;
    return { ok: true };
}
function raySphere(o, d, c, r) {
    const ox = o[0] - c[0], oy = o[1] - c[1], oz = o[2] - c[2], b = ox * d[0] + oy * d[1] + oz * d[2], cc = ox * ox + oy * oy + oz * oz - r * r, disc = b * b - cc;
    if (disc < 0) return null; const t = -b - Math.sqrt(disc); return t > 0 ? t : (-b + Math.sqrt(disc) > 0 ? 0.0001 : null);
}
// Trafienie w gracza po głowie z widoku hosta: kula głowy (headshot), tors i nogi (ciało)
export function playerHit(o, d, head) {
    const parts = [[[head.x, head.y, head.z], GUN.HEAD_R, 'head'], [[head.x, head.y - 0.5, head.z], GUN.TORSO_R, 'body'], [[head.x, head.y - 0.95, head.z], GUN.LEG_R, 'body']];
    let best = null; for (const [c, r, z] of parts) { const t = raySphere(o, d, c, r); if (t !== null && (!best || t < best.t)) best = { t: t, zone: z }; }
    return best;
}
// Rozstrzygnięcie strzału: najbliższy cel w zasięgu, niezasłonięty budynkiem. targets: [{ id, kind: 'player'|'cop', head:{x,y,z} | pos:{x,z}, ignore }]
export function resolveShot(o, d, targets, boxes, shooterId) {
    let best = null;
    for (const tg of targets) {
        if (tg.id === shooterId || tg.ignore) continue;
        let h = null;
        if (tg.kind === 'cop') h = playerHit(o, d, { x: tg.pos.x, y: GUN.COP_EYE, z: tg.pos.z });   // policjant ma te same strefy co gracz (głowa 1,7 m)
        else h = playerHit(o, d, tg.head);
        if (!h || h.t > GUN.RANGE || (best && h.t >= best.t)) continue;
        const e = [o[0] + d[0] * h.t, o[1] + d[1] * h.t, o[2] + d[2] * h.t];
        if (e[1] < -0.2 || lineBlocked(o, e, boxes)) continue;
        best = { id: tg.id, kind: tg.kind, zone: h.zone, t: h.t, e: e };
    }
    return best;
}
export const damageOf = (zone) => GUN.DMG * (zone === 'head' ? GUN.HEAD_MUL : 1);
// Obrażenia: ochrona po odrodzeniu i martwy cel ignorują trafienie
export function hurt(sh, dmg, now) {
    if (now < sh.protectUntil || now < sh.deadUntil) return { hp: sh.hp, dead: false, ignored: true };
    sh.hp = Math.max(0, sh.hp - dmg);
    if (sh.hp <= 0) { sh.deadUntil = now + GUN.RESPAWN; return { hp: 0, dead: true, ignored: false }; }
    return { hp: sh.hp, dead: false, ignored: false };
}
export function revive(sh, now) { sh.hp = GUN.HP; sh.ammo = GUN.MAG; sh.reloadAt = -1; sh.deadUntil = 0; sh.protectUntil = now + GUN.PROTECT; }
// Efekt strzału od hosta (kreska śladu, trafienie, zabójstwo) i mapa życia: tylko skończone liczby i krótkie identyfikatory
const tidy = (id) => { const s = typeof id === 'string' ? id.replace(/[^\w:.-]/g, '').slice(0, 48) : ''; return s || null; };
export function cleanFx(m) {
    if (!m || typeof m !== 'object') return null;
    const o = vec(m.o), e = vec(m.e), s = tidy(m.s); if (!o || !e || !s) return null;
    return { s: s, o: o, e: e, hit: m.h ? tidy(m.h) : null, zone: m.z === 'h' ? 'head' : 'body', kill: !!m.kill };
}
export function cleanHp(o) {
    const out = {}; if (!o || typeof o !== 'object' || Array.isArray(o)) return out; let n = 0;
    for (const k of Object.keys(o)) { if (n >= 10) break; const id = tidy(k); if (id && fin(o[k])) { out[id] = Math.max(0, Math.min(GUN.HP, o[k])); n++; } }
    return out;
}
// Wpis w dzienniku zabójstw: tylko bezpieczne nicki (bez nowych linii, znaków sterujących i znaczników)
export const feedLine = (a, v, head) => String(a || 'Player').replace(/[^\w-]/g, '').slice(0, 14) + (head ? ' HEADSHOT ' : ' shot ') + String(v || 'Player').replace(/[^\w-]/g, '').slice(0, 14);
