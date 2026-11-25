// ==========================================
// SKRZYNIA NOCNA W LOBBY (oprawa 3D i zapis; reguły w czystym core/chestlogic.js, testy: tests/logic.mjs i tests/lobbyextras.mjs).
// Raz dziennie (data UTC jak w zadaniach dziennych) otwierasz skrzynię za darmo: panel obok albo dotknięcie wieczka dłonią. Nagroda to Bagabucksy albo rzadki
// kosmetyk, którego jeszcze nie masz. Seria dni z rzędu podnosi szansę na rzadką nagrodę, a co siódmy dzień z rzędu jest ona pewna.
// Stan w SAVE.chest (zawsze przez normalizeChest). Wszystko lokalne: nic nie idzie przez sieć, a nagroda jest tylko dla otwierającego.
// ==========================================
import { THREE, L, tex, addCollider } from './engine.js';
import * as T from './textures.js';
import { Terminal, terminals, toast, markAllDirty, AMBER, AMBER_DIM, GOLD, OK_COL } from './terminal.js';
import { SAVE, saveGame, addBones, dailyDate, CATALOG, giftable, isOwned } from './economy.js';
import { hands } from './player.js';
import * as SFX from './audio.js';
import * as C from './chestlogic.js';
import { foundCount, SECRETS } from './secretlogic.js';
import { getSecrets } from './secrets.js';
import { getEggs } from './eggs.js';
import { foundCount as eggCount, EGGS } from './egglogic.js';

let G = null;
const _w = new THREE.Vector3(), MAX_PRICE = 900;
export function getChest() { const st = C.normalizeChest(SAVE.chest); SAVE.chest = st; return st; }
// Kosmetyki do wygrania: nie za drogie, niezablokowane i jeszcze nieposiadane
export function rarePool() { return CATALOG.filter(it => giftable(it) && !isOwned(it) && it.price <= MAX_PRICE).map(it => it.slot + ':' + it.id); }

// Otwarcie: jedna próba na dzień. Zwraca nagrodę albo null (już dziś otwarta)
export function openChest(rand) {
    const st = getChest(), today = dailyDate(); if (!C.canOpen(st, today)) return null;
    const streak = C.streakAfter(st, today), reward = C.rollReward(rand || Math.random, streak, rarePool());
    SAVE.chest = C.afterOpen(st, today, reward);
    if (reward.item && !SAVE.owned.includes(reward.item)) SAVE.owned.push(reward.item);
    if (reward.bones > 0) addBones(reward.bones, 'Night chest');
    saveGame(); markAllDirty();
    return Object.assign({ streak: streak }, reward);
}
const itemName = (key) => { const it = CATALOG.find(i => i.slot + ':' + i.id === key); return it ? it.name : key; };
const rewardText = (r) => r.item ? 'RARE: ' + itemName(r.item) : '+' + r.bones + ' Bagabucks';

export function buildNightChest(x, z) {
    const root = L.root;
    G = { x: x, z: z, geos: [], mats: [], texs: [], stars: [], anim: null, clock: 0, touchT: 0, shake: 0, last: '' };
    const mat = (c, o) => { const m = new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.75 }, o || {})); G.mats.push(m); return m; };
    const geo = (g) => { G.geos.push(g); return g; };
    const wood = mat(0x6a4426, { map: tex.wood }), iron = mat(0x2a2a30, { metalness: 0.8, roughness: 0.4 }), gold = mat(0xc8a040, { metalness: 0.8, roughness: 0.3, emissive: 0x402a08 });
    const g = new THREE.Group(); g.position.set(x, 0, z); root.add(g); G.g = g;
    const base = new THREE.Mesh(geo(new THREE.BoxGeometry(1.1, 0.56, 0.7)), wood); base.position.y = 0.28; base.castShadow = base.receiveShadow = true; g.add(base);
    for (const bx of [-0.4, 0.4]) { const band = new THREE.Mesh(geo(new THREE.BoxGeometry(0.09, 0.58, 0.72)), iron); band.position.set(bx, 0.28, 0); g.add(band); }
    // Wieczko na zawiasie przy tylnej krawędzi: łuk (półwalec) z okuciami
    const hinge = new THREE.Group(); hinge.position.set(0, 0.56, -0.35); g.add(hinge); G.hinge = hinge;
    const arch = new THREE.Mesh(geo(new THREE.CylinderGeometry(0.36, 0.36, 1.1, 20, 1, false, -Math.PI / 2, Math.PI).rotateX(-Math.PI / 2).rotateY(Math.PI / 2)), wood); arch.position.set(0, 0, 0.35); arch.scale.set(1, 0.7, 1); arch.castShadow = true; hinge.add(arch);
    for (const bx of [-0.4, 0.4]) { const band = new THREE.Mesh(geo(new THREE.CylinderGeometry(0.365, 0.365, 0.09, 20, 1, false, -Math.PI / 2, Math.PI).rotateX(-Math.PI / 2).rotateY(Math.PI / 2)), iron); band.position.set(bx, 0, 0.35); band.scale.set(1, 0.7, 1); hinge.add(band); }
    const lock = new THREE.Mesh(geo(new THREE.BoxGeometry(0.16, 0.2, 0.05)), gold); lock.position.set(0, 0.0, 0.72); hinge.add(lock);
    // Poświata, światło i gwiazdki (świecą, gdy nagroda czeka)
    G.light = new THREE.PointLight(0xffc860, 0, 7, 2); G.light.position.set(0, 1.2, 0.3); g.add(G.light);
    G.aura = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex.dot, color: 0xffd070, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0 })); G.aura.scale.set(2.4, 1.6, 1); G.aura.position.y = 0.7; g.add(G.aura);
    for (let i = 0; i < 14; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex.dot, color: i % 2 ? 0xffe9a0 : 0xffb060, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0 })); s.scale.setScalar(0.12); s.visible = false; g.add(s); G.stars.push({ s: s, v: new THREE.Vector3(), t: 0 }); }
    // Tabliczka z panelem obok skrzyni
    G.term = new Terminal(draw, 640, 400);
    const pg = new THREE.Group(); pg.position.set(x + 1.5, 0, z); root.add(pg);
    const post = new THREE.Mesh(geo(new THREE.BoxGeometry(0.14, 1.1, 0.14)), iron); post.position.y = 0.55; pg.add(post);
    const frame = new THREE.Mesh(geo(new THREE.BoxGeometry(1.46, 0.96, 0.08)), iron); frame.position.y = 1.5; pg.add(frame);
    const screen = G.term.createMesh(1.36, 0.85); screen.position.set(0, 1.5, 0.045); pg.add(screen);
    addCollider(x - 0.56, 0, z - 0.36, x + 0.56, 0.9, z + 0.36); addCollider(x + 1.43, 0, z - 0.07, x + 1.57, 1.1, z + 0.07);
    L.reserved.push([x + 0.7, z, 3.0]);
    applyLid(); G.term.dirty = true;
}

function draw(t) {
    const st = getChest(), ready = C.canOpen(st, dailyDate()), sec = getSecrets();
    t.background(); t.header('NIGHT CHEST', st.streak > 0 ? 'Streak ' + st.streak : '', GOLD);
    if (G && G.anim && G.anim.reward) {
        t.text('You got', 320, 130, 30, AMBER, 'center'); t.text(rewardText(G.anim.reward), 320, 200, 44, G.anim.reward.tier === 'rare' ? GOLD : OK_COL, 'center', true);
    } else if (ready) {
        t.text('A free reward is waiting.', 320, 120, 32, AMBER, 'center', true);
        t.btn('open', 160, 160, 320, 96, 'OPEN', () => startOpen(), { tone: 'gold', size: 44 });
    } else {
        t.text('Opened today. Come back tomorrow!', 320, 130, 28, AMBER, 'center', true);
        t.text(st.tier ? 'Last: ' + st.tier + ' reward' : '', 320, 180, 24, AMBER_DIM, 'center');
    }
    t.text(pityText(st, ready), 320, 300, 19, AMBER_DIM, 'center');
    t.text('Hidden skulls found: ' + foundCount(sec) + ' / ' + SECRETS.length, 320, 340, 22, foundCount(sec) === SECRETS.length ? OK_COL : AMBER, 'center', true);
    t.text('Easter eggs found: ' + eggCount(getEggs()) + ' / ' + EGGS.length, 320, 372, 20, eggCount(getEggs()) === EGGS.length ? OK_COL : AMBER_DIM, 'center');
    t.scanlines();
}
// Ile dni z rzędu zostało do pewnej rzadkiej nagrody (licząc serię, którą da dzisiejsze otwarcie, gdy skrzynia czeka)
function pityText(st, ready) {
    const s = ready ? C.streakAfter(st, dailyDate()) : st.streak, left = (C.CHEST.PITY - (s % C.CHEST.PITY)) % C.CHEST.PITY;
    if (ready && left === 0) return 'Today is a guaranteed RARE reward!';
    return 'Rare reward guaranteed in ' + (left === 0 ? C.CHEST.PITY : left) + ' more day(s) in a row.';
}
function startOpen() {
    if (!G || G.anim) return;
    const r = openChest(); if (!r) { toast('You already opened the chest today.', '#ffb030'); return; }
    G.anim = { t: 0, reward: r, revealed: false }; G.shake = 0; SFX.bell && SFX.bell();
}
function applyLid() { const open = G.anim ? Math.min(1, G.anim.t / 0.9) : (C.canOpen(getChest(), dailyDate()) ? 0 : 1); G.hinge.rotation.x = -1.75 * open; }

export function updateNightChest(dt, t) {
    if (!G) return; G.clock += dt;
    const ready = C.canOpen(getChest(), dailyDate());
    // Dotknięcie wieczka dłonią otwiera skrzynię (gdy czeka nagroda)
    G.touchT -= dt;
    if (ready && !G.anim && G.touchT <= 0) for (const h of [hands.L, hands.R]) { if (!h) continue; h.getWorldPosition(_w); if (_w.y < 1.15 && Math.hypot(_w.x - G.x, _w.z - G.z) < 0.7) { startOpen(); G.touchT = 1; break; } }
    G.aura.material.opacity = ready ? 0.35 + 0.2 * Math.sin(t * 3) : 0; G.light.intensity = ready ? 5 + 2 * Math.sin(t * 3) : 0;
    if (ready && !G.anim) { G.g.rotation.z = Math.sin(t * 9) * 0.01 * (Math.sin(t * 0.7) > 0.8 ? 1 : 0); }   // co kilka sekund skrzynia drży
    if (G.anim) {
        const a = G.anim; a.t += dt;
        G.hinge.rotation.x = -1.75 * Math.min(1, a.t / 0.9);
        if (a.t >= 0.5 && !a.revealed) {
            a.revealed = true; G.light.intensity = 40; G.term.dirty = true; if (a.reward.tier === 'rare') SFX.bell && SFX.bell(); else SFX.beep && SFX.beep(1200, 0.12, 0.06);
            toast('Night chest: ' + rewardText(a.reward) + (a.reward.streak > 1 ? ' (streak ' + a.reward.streak + ')' : ''), a.reward.tier === 'rare' ? '#ffd27a' : '#7fff90');
            for (const s of G.stars) { s.t = 1.4; s.s.visible = true; s.s.position.set(0, 0.7, 0.1); s.v.set((Math.random() - 0.5) * 2.2, 1.6 + Math.random() * 1.6, (Math.random() - 0.5) * 2.2); }
        }
        if (a.revealed) G.light.intensity = Math.max(0, G.light.intensity - dt * 30);
        if (a.t > 5) { G.anim = null; G.term.dirty = true; }
    }
    for (const s of G.stars) if (s.t > 0) { s.t -= dt; s.v.y -= 3 * dt; s.s.position.addScaledVector(s.v, dt); s.s.material.opacity = Math.max(0, Math.min(1, s.t)); if (s.t <= 0) s.s.visible = false; }
    if (!G.anim) applyLid();
    const sig = ready + ':' + getChest().last + ':' + foundCount(getSecrets()) + ':' + eggCount(getEggs()); if (sig !== G.last) { G.last = sig; G.term.dirty = true; }
}
export function disposeNightChest() {
    if (!G) return;
    const i = terminals.indexOf(G.term); if (i >= 0) terminals.splice(i, 1);
    for (const g of G.geos) g.dispose(); for (const m of G.mats) m.dispose(); G.term.tex.dispose();
    G = null;
}
export const debugNightChest = () => G ? { ready: C.canOpen(getChest(), dailyDate()), anim: !!G.anim, lid: +G.hinge.rotation.x.toFixed(2), streak: getChest().streak } : null;   // dla testów
export function debugOpenChest() { if (!G) return null; startOpen(); return G.anim ? G.anim.reward : null; }
