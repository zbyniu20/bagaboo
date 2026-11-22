// ==========================================
// STWOREK: TOWARZYSZ W GRZE (zachowanie i sieć; reguły w core/petlogic.js, model w core/petmodel.js, stan w core/petstore.js).
// Stworek chodzi za graczem TYLKO W SALACH (kind === 'hub': lobby, Levels, Games, Staff, Wardrobe, My Room). W poziomach z rekordami i w trybach czeka w lobby:
// nie psuje rekordów, nie zdradza pozycji w trybach ze skradaniem i nie obciąża budżetu rysowania (memory 310, laundry 230).
// Ruch to ten sam bot co w trybach (core/botkit.js): kolizje z przeszkodami, wchodzenie na niskie krawędzie, skok za graczem. Siada po kilku sekundach bezruchu gracza,
// zasypia po pół minuty, skacze, gdy ty skoczysz, prosi o jedzenie głodny, a dłoń trzymana przy jego głowie go głaszcze (serca i mruczenie, humor rośnie).
// SIEĆ: do stanu gracza idzie tylko krotka wyglądu (petLookNet); u odbiorcy stworek innego gracza powstaje WYŁĄCZNIE z cleanLook(st.pt), na tej samej sali, nigdy dla
// niewidzialnych graczy, i chodzi obok głowy właściciela (pozycji nikt nie wysyła). Stworek nic nie daje (żadnych bonusów w grze), więc nie ma czego tu nadużywać.
// ==========================================
import { THREE, L, camera, renderer } from './engine.js';
import { PET, CARRY, carryNext, backAnchor, dropSpot, armsAnchor, cleanCarry, cleanLook, followSpeed, shouldTeleport, idleStage, restSpot, shouldFollow, hatIndex, neckIndex } from './petlogic.js';
import { petStatus, patPet, setPetCarry } from './petstore.js';
import { gripDown } from './player.js';
import { onDesktopKey } from './desktop.js';
import { createPetModel } from './petmodel.js';
import { createBot, stepBot } from './botkit.js';
import { LEVEL_BY_ID } from './registry.js';
import { handsOf } from './roundkit.js';
import * as N from './network.js';
import * as SFX from './audio.js';
import { HAUNT_STATE, petFear, hideSpot } from './hauntlogic.js';
import { toast, GOLD } from './terminal.js';

let HUB = false, P = null, holdSpawn = false, vPress = false;
onDesktopKey('KeyV', () => { vPress = true; });   // klawisz V: stworek z rąk na plecy, z pleców na ziemię
const remote = {};   // id gracza -> { model, x, y, z, sp }
const MAX_REMOTE = 5;
const _v = new THREE.Vector3(), _dir = new THREE.Vector3();

export function buildPet(levelId) { setPetCarry(0); const def = LEVEL_BY_ID[levelId]; HUB = !!def && def.kind === 'hub'; P = null; }
export function disposePet() {
    setPetCarry(0); vPress = false;
    if (P) { P.model.dispose(); P = null; }
    for (const id in remote) { remote[id].model.dispose(); delete remote[id]; }
    HUB = false;
}
const lookFor = (st) => ({ c: st.pet.c, l: st.level, n: st.pet.n, sp: st.pet.sp || 0, h: hatIndex(st.wear.hat), k: neckIndex(st.wear.neck) });
const lookSig = (l) => l.c + ',' + l.l + ',' + l.n + ',' + l.h + ',' + l.k + ',' + l.sp;   // zmiana któregokolwiek pola = nowy model

function spawn(ctx, born, at) {
    const st = petStatus(); if (!st) return;
    const model = createPetModel(lookFor(st), { born: !!born }), pl = ctx.pos, a = Math.random() * Math.PI * 2;
    const x = at ? at.x : pl.x + Math.cos(a) * 1.3, z = at ? at.z : pl.z + Math.sin(a) * 1.3, bot = createBot(x, z);
    bot.y = at && at.y !== undefined ? at.y : Math.max(0, pl.y - 1.0);
    L.root.add(model.group);
    P = { model: model, bot: bot, lvl: st.level, sig: lookSig(lookFor(st)), name: st.name, idleT: 0, last: { x: pl.x, z: pl.z }, sp: 0, petted: 0, eating: 0, handT: 0, patCd: 0, carry: 0, hand: 1, gripPrev: [false, false], squeakIn: 8 + Math.random() * 10, jumpCd: 0, statT: 0, follow: false, fear: 0, fearSnd: 0, hungry: st.hungry, sad: st.mood < 0.35, mood: st.moodLabel, tagMood: '' };
    model.group.position.set(bot.x, bot.y, bot.z);
    model.setTag(st.name, st.level, st.moodLabel);
}
const posOf = () => ({ x: P.bot.x, y: P.bot.y + 0.3, z: P.bot.z });

// Wykluwanie (core/petnest.js): towarzysz nie pojawia się, dopóki trwa animacja jaja, a potem wyskakuje z jaja
export function hatchBegin() { holdSpawn = true; if (P) { P.model.dispose(); P = null; } }
export function hatchPop(ctx, x, y, z) {
    holdSpawn = false; if (P) { P.model.dispose(); P = null; }
    spawn(ctx, true, { x: x, y: y, z: z });
    if (P) { P.model.burst('poof', 8); P.model.burst('spark', 10); P.model.burst('heart', 3); SFX.squeak(posOf()); SFX.bell && SFX.bell(); }
}
export function reactFeed() { if (!P) return; P.eating = 1.7; P.hungry = false; P.squeakIn = 30; SFX.purr(posOf(), 0.5); }
export function reactPat() { if (!P) return; P.petted = 1.7; P.model.burst('heart', 4); SFX.purr(posOf(), 0.7); }
export const petPos = () => (P ? { x: P.bot.x, y: P.bot.y, z: P.bot.z } : null);

// ---------- co klatkę ----------
export function updatePet(dt, t, ctx) {
    if (!HUB) return;
    if (!P && !holdSpawn && petStatus()) spawn(ctx, false);
    if (P) updateMine(dt, t, ctx);
    updateRemote(dt, t);
}
function updateMine(dt, t, ctx) {
    const p = P, b = p.bot, pl = ctx.pos;
    const dx = pl.x - b.x, dz = pl.z - b.z, d = Math.hypot(dx, dz);
    if (carryStep(p, dt, t, ctx)) return;
    // stan z magazynu raz na 1,5 s: głód, humor, poziom (wzrost = nowy model i fajerwerki), imię
    p.statT -= dt;
    if (p.statT <= 0) {
        p.statT = 1.5; const st = petStatus();
        if (!st) { p.model.dispose(); P = null; return; }
        p.hungry = st.hungry; p.sad = st.mood < 0.35; p.mood = st.moodLabel;
        const look = lookFor(st), sig = lookSig(look);
        if (sig !== p.sig) {   // poziom albo kosmetyki: nowy model w tym samym miejscu
            const g = p.model.group.position.clone(), rot = p.model.group.rotation.y; p.model.dispose();
            p.model = createPetModel(look, { born: false }); L.root.add(p.model.group); p.model.group.position.copy(g); p.model.group.rotation.y = rot; p.sig = sig;
            if (st.level !== p.lvl) { p.model.burst('spark', 14); p.model.burst('heart', 3); p.lvl = st.level; toast(st.name + ' grew to level ' + st.level + '!', GOLD); SFX.bell && SFX.bell(); }
            else { p.model.burst('poof', 5); p.model.burst('spark', 6); SFX.squeak(posOf()); }
        }
        p.name = st.name; p.model.setTag(st.name, st.level, st.moodLabel);
    }
    // bezruch gracza: siadanie i spanie
    const ps = Math.hypot(pl.x - p.last.x, pl.z - p.last.z) / Math.max(dt, 0.001); p.last.x = pl.x; p.last.z = pl.z;
    p.idleT = ps < 0.35 && d < PET.STAY + 0.5 ? p.idleT + dt : 0;
    const stage = idleStage(p.idleT);
    // za daleko: pojawia się obok gracza (z obłoczkiem)
    if (shouldTeleport(d)) { const a = Math.random() * Math.PI * 2; b.x = pl.x + Math.cos(a) * 1.3; b.z = pl.z + Math.sin(a) * 1.3; b.y = Math.max(0, pl.y - 1.0); b.vy = 0; p.model.burst('poof', 6); }
    // ruch: idzie za graczem; skacze razem z nim
    p.petted = Math.max(0, p.petted - dt); p.eating = Math.max(0, p.eating - dt); p.patCd = Math.max(0, p.patCd - dt); p.jumpCd = Math.max(0, p.jumpCd - dt);
    // Gdy gracz odejdzie dalej niż STAY, stworek biegnie do miejsca 2 m przed nim (po prawej), żeby było go widać; blisko gracza zostaje, więc można go pogłaskać
    camera.getWorldDirection(_dir);
    const rest = restSpot(pl.x, pl.z, _dir.x, _dir.z, L.bounds), dRest = Math.hypot(rest.x - b.x, rest.z - b.z);
    p.follow = shouldFollow(p.follow, d, dRest);
    const busy = p.petted > 0 || p.eating > 0 || (stage !== 'idle' && !p.follow);
    let want = busy || !p.follow ? 0 : followSpeed(dRest);
    // strach: gdy potwór Nocnej Zmiany jest blisko, stworek chowa się za graczem, drży i patrzy w stronę potwora (wskazówka, skąd idzie); piszczy co kilka sekund
    const mon = HAUNT_STATE.monster; p.fear += (petFear(mon, { x: b.x, z: b.z }) - p.fear) * Math.min(1, dt * 3);
    const hs = p.fear > 0.3 && mon ? hideSpot(mon, pl, 0.9) : null;
    if (hs) { const dh = Math.hypot(hs.x - b.x, hs.z - b.z); want = dh < 0.35 ? 0 : Math.min(6.5, 1.5 + dh * 3); p.fearSnd -= dt; if (p.fearSnd <= 0) { p.fearSnd = 2.2 + Math.random() * 2; SFX.squeak(posOf()); } }
    if (ctx.body && ctx.body.velocity.y > 3.5 && p.jumpCd <= 0 && b.ground && stage === 'idle' && d < 4) { b.vy = 4.6; b.ground = false; p.jumpCd = 0.9; }
    stepBot(b, dt, hs ? hs.x : (p.follow ? rest.x : pl.x), hs ? hs.z : (p.follow ? rest.z : pl.z), pl.y - 1.0, want, (p.follow && dRest > 2.5) || !!hs);
    if (want === 0 && d > 0.2) { const target = hs ? Math.atan2(mon.x - b.x, mon.z - b.z) : Math.atan2(dx, dz); let dd = target - p.model.group.rotation.y; dd = Math.atan2(Math.sin(dd), Math.cos(dd)); b.dir = p.model.group.rotation.y + dd * Math.min(1, dt * 3); }
    p.model.group.position.set(b.x, b.y, b.z); p.model.group.rotation.y = b.dir;
    p.sp += (Math.min(1, want / 6.5 + (want > 0 ? 0.25 : 0)) - p.sp) * Math.min(1, dt * 8);
    // głodny stworek prosi o jedzenie
    p.squeakIn -= dt;
    if (p.squeakIn <= 0) { p.squeakIn = 25 + Math.random() * 25; if (p.hungry && stage !== 'sleep' && d < 12) SFX.squeak(posOf()); }
    // głaskanie: dłoń przy głowie stworka przez pół sekundy
    const hx = b.x, hy = b.y + 0.4 * p.model.scale, hz = b.z, reach = 0.3 + 0.15 * p.model.scale;
    let near = false;
    for (const h of handsOf('me')) { if (!h) continue; _v.set(hx - h.x, hy - h.y, hz - h.z); if (_v.length() < reach) { near = true; break; } }
    p.handT = near ? p.handT + dt : Math.max(0, p.handT - dt * 2);
    if (p.handT > 0.5 && p.patCd <= 0) {
        p.handT = 0; p.patCd = 6; const r = patPet(); p.petted = 1.7; p.model.burst('heart', r.ok ? 4 : 2);
        if (r.ok) { SFX.purr(posOf(), 0.7); toast(p.name + ' loves it!', '#ff9ec0'); }
    }
    const camD = Math.hypot(ctx.pos.x - b.x, ctx.pos.z - b.z);
    p.model.update(dt, t, { speed: p.sp, sleeping: stage === 'sleep' && p.petted <= 0 && p.eating <= 0, sitting: stage !== 'idle', sad: p.sad, hungry: p.hungry, fear: p.fear, petted: p.petted > 0 ? Math.min(1, p.petted) : 0, eating: p.eating, tag: camD > 1.0 && camD < 9 });   // tuż przy kamerze plakietka byłaby ogromna
    if (p.eating > 0 && Math.random() < dt * 5) p.model.burst('heart', 1);
}

// ---------- noszenie: na rękach i na plecach ----------
const _f = new THREE.Vector3(), _fq = new THREE.Quaternion();
function flatForward() { camera.getWorldDirection(_f); _f.y = 0; if (_f.lengthSq() < 1e-4) _f.set(0, 0, -1); return _f.normalize(); }
function setCarry(p, v) { p.carry = v; setPetCarry(v); p.model.burst('poof', 3); SFX.squeak(posOf()); }
// Zwraca true, gdy stworek jest niesiony (wtedy zwykły ruch jest pomijany)
function carryStep(p, dt, t, ctx) {
    const pl = ctx.pos, b = p.bot, hs = handsOf('me'), f = flatForward(), fx = f.x, fz = f.z, xr = !!(renderer.xr && renderer.xr.isPresenting);
    const back = backAnchor(pl, fx, fz), press = vPress; vPress = false;
    let ev = null;
    if (press && p.carry === CARRY.NONE && Math.hypot(pl.x - b.x, pl.z - b.z) < CARRY.DESKTOP_REACH) { ev = 'grab'; p.hand = 1; }
    else if (press) ev = 'back';
    for (let i = 0; i < 2; i++) {   // chwyt (grip / klawisz E): zbocze narastające
        const down = gripDown(i), edge = down && !p.gripPrev[i]; p.gripPrev[i] = down;
        if (!edge || ev) continue;
        const h = hs[i];
        if (p.carry === CARRY.NONE) {
            const near = h ? Math.hypot(h.x - b.x, h.y - (b.y + 0.3 * p.model.scale), h.z - b.z) < CARRY.REACH : false;
            if (near || (!xr && Math.hypot(pl.x - b.x, pl.z - b.z) < CARRY.DESKTOP_REACH)) { ev = 'grab'; p.hand = i; }
        } else {
            const nearBack = h ? Math.hypot(h.x - back.x, h.y - (back.y + 0.4), h.z - back.z) < CARRY.BACK_REACH : false;
            ev = nearBack ? 'back' : 'drop';
        }
    }
    if (ev) {
        const was = p.carry, now = carryNext(was, ev);
        if (now !== was) {
            if (now === CARRY.NONE) { const d = dropSpot(pl, fx, fz); b.x = d.x; b.y = d.y; b.z = d.z; b.vy = 0; b.ground = false; p.follow = false; }
            setCarry(p, now);
            if (now === CARRY.ARMS) toast('Holding ' + p.name + ' (grip / E: put down, V: on your back)', '#ff9ec0');
            else if (now === CARRY.BACK) toast(p.name + ' is on your back (V or grip behind you: put down)', '#ff9ec0');
            else toast(p.name + ' is on the ground', '#ff9ec0');
        }
    }
    if (p.carry === CARRY.NONE) return false;
    const a = p.carry === CARRY.BACK ? back : armsAnchor(pl, fx, fz, hs[p.hand] || (xr ? null : hs[1]));
    b.x = a.x; b.y = a.y; b.z = a.z; b.vy = 0; b.ground = false;
    b.dir = Math.atan2(p.carry === CARRY.BACK ? fx : -fx, p.carry === CARRY.BACK ? fz : -fz);   // na plecach patrzy w przód, na rękach na gracza
    p.model.group.position.set(b.x, b.y, b.z); p.model.group.rotation.y = b.dir;
    p.idleT = 0; p.last.x = pl.x; p.last.z = pl.z; p.sp = 0;
    p.model.update(dt, t, { speed: 0, sleeping: false, sitting: true, sad: p.sad, hungry: false, petted: 0, eating: 0, tag: false });
    return true;
}

// ---------- zwierzaki innych graczy (tylko wygląd z sieci, pozycja liczona lokalnie przy głowie właściciela) ----------
function updateRemote(dt, t) {
    const seen = {};
    let count = Object.keys(remote).length;
    for (const id in N.playersState) {
        if (id === N.myId()) continue;
        const st = N.playersState[id]; if (!st || !st.head || !st.head.p) continue;
        const look = cleanLook(st.pt);
        if (!look || st.inv || st.lvl !== L.levelId) continue;
        let e = remote[id];
        if (!e) { if (count >= MAX_REMOTE) continue; count++; e = remote[id] = { model: null, look: '', x: 0, z: 0, y: 0, sp: 0, init: false }; }
        const sig = lookSig(look);
        if (!e.model || e.look !== sig) {
            if (e.model) e.model.dispose();
            e.model = createPetModel(look, { born: false }); e.look = sig; L.root.add(e.model.group); e.model.setTag(PET.NAMES[look.n], look.l, 'happy');
        }
        seen[id] = true;
        const hp = st.head.p; if (!Number.isFinite(hp[0]) || !Number.isFinite(hp[1]) || !Number.isFinite(hp[2])) continue;
        const pc = cleanCarry(st.pc);
        if (pc) {   // niesiony: na rękach przed graczem, na plecach za nim (kierunek z obrotu głowy); chodzenie wyłączone
            const hq = st.head.q; _fq.set(0, 0, 0, 1); if (Array.isArray(hq) && hq.length === 4 && hq.every(Number.isFinite)) _fq.fromArray(hq);
            _f.set(0, 0, -1).applyQuaternion(_fq); _f.y = 0; if (_f.lengthSq() < 1e-4) _f.set(0, 0, -1); _f.normalize();
            const head = { x: hp[0], y: hp[1], z: hp[2] }, a = pc === CARRY.BACK ? backAnchor(head, _f.x, _f.z) : armsAnchor(head, _f.x, _f.z, null);
            e.x = a.x; e.y = a.y; e.z = a.z; e.init = true; e.sp = 0;
            e.model.group.position.set(e.x, e.y, e.z); e.model.group.rotation.y = Math.atan2(pc === CARRY.BACK ? _f.x : -_f.x, pc === CARRY.BACK ? _f.z : -_f.z);
            e.model.update(dt, t, { speed: 0, sleeping: false, sitting: true, sad: false, hungry: false, petted: 0, eating: 0, tag: false });
            continue;
        }
        const dx = hp[0] - e.x, dz = hp[2] - e.z, d = Math.hypot(dx, dz);
        if (!e.init || shouldTeleport(d)) { e.x = hp[0] + 1.2; e.z = hp[2]; e.y = Math.max(0, hp[1] - 1.62); e.init = true; continue; }
        const sp = followSpeed(d - 1.8); if (sp > 0) { const k = Math.min(1, sp * dt / d); e.x += dx * k; e.z += dz * k; }
        e.y += (Math.max(0, hp[1] - 1.62) - e.y) * Math.min(1, dt * 6);
        e.sp += (Math.min(1, sp / 6.5 + (sp > 0 ? 0.25 : 0)) - e.sp) * Math.min(1, dt * 8);
        const face = Math.atan2(dx, dz); let dd = face - e.model.group.rotation.y; dd = Math.atan2(Math.sin(dd), Math.cos(dd));
        e.model.group.rotation.y += dd * Math.min(1, dt * (sp > 0 ? 8 : 3)); e.model.group.position.set(e.x, e.y, e.z);
        e.model.update(dt, t, { speed: e.sp, sleeping: false, sitting: sp === 0, sad: false, hungry: false, petted: 0, eating: 0, tag: true });
    }
    for (const id in remote) if (!seen[id]) { remote[id].model.dispose(); delete remote[id]; }
}

export function debugPet() { return { hub: HUB, mine: P ? { x: P.bot.x, y: P.bot.y, z: P.bot.z, lvl: P.lvl, sig: P.sig, follow: P.follow, sp: P.sp, petted: P.petted, eating: P.eating, idleT: P.idleT, hungry: P.hungry } : null, remote: Object.keys(remote), hold: holdSpawn }; }
