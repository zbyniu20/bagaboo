// ==========================================
// EKONOMIA I ZAPIS GRY: waluta (kości), sklep, nagroda za logowanie, zadania dzienne, bonusy
//
// Bilans: typowy dzień daje ok. 600-800 kości (1-2 nagrody za logowanie ~250, trzy zadania + bonus ~370,
// aktywności ~150). Dlatego tanie rzeczy (250-500) kupisz w jeden dzień, średnie (600-1000) w 1-2 dni,
// rzadkie (2200-3500) w 3-5 dni, a legendarne (6000) w około tydzień regularnej gry.
// ==========================================
import { toast, markAllDirty } from './terminal.js';

const SAVE_KEY = 'bagaboo_save_v1';
export const LOGIN_INTERVAL = 6 * 3600 * 1000;      // nagroda za logowanie co 6 godzin
const STREAK_WINDOW = 30 * 3600 * 1000;              // seria trwa, jeśli wrócisz w ciągu 30 godzin
export const QUEST_ALL_BONUS = 150;                  // premia za wykonanie wszystkich 3 zadań dnia
export const START_BONES = 150;

export const CATALOG = [
    { slot: 'hat', id: 'none', name: 'No hat', price: 0 },
    { slot: 'hat', id: 'cap', name: 'Rusty cap', price: 0 },
    { slot: 'hat', id: 'beanie', name: 'Knitted beanie', price: 300 },
    { slot: 'hat', id: 'tophat', name: 'Undertaker top hat', price: 800 },
    { slot: 'hat', id: 'cowboy', name: 'Dusty cowboy hat', price: 1000 },
    { slot: 'hat', id: 'horns', name: 'Demon horns', price: 2500 },
    { slot: 'hat', id: 'crown', name: 'Rotten crown', price: 3000 },
    { slot: 'hat', id: 'halo', name: 'Broken halo', price: 4500 },
    { slot: 'glasses', id: 'none', name: 'No glasses', price: 0 },
    { slot: 'glasses', id: 'round', name: 'Round spectacles', price: 400 },
    { slot: 'glasses', id: 'sunglasses', name: 'Sunglasses', price: 500 },
    { slot: 'glasses', id: 'eyepatch', name: 'Eye patch', price: 600 },
    { slot: 'glasses', id: 'weld', name: 'Welding goggles', price: 700 },
    { slot: 'glasses', id: 'visor', name: 'Red glowing visor', price: 2200 },
    { slot: 'glasses', id: 'thirdeye', name: 'Third eye', price: 2600 },
    { slot: 'sleeve', id: 'cloth', name: 'Cloth sleeve', price: 0 },
    { slot: 'sleeve', id: 'leather', name: 'Leather sleeve', price: 250 },
    { slot: 'sleeve', id: 'camo', name: 'Camo sleeve', price: 350 },
    { slot: 'sleeve', id: 'straitjacket', name: 'Straitjacket', price: 450 },
    { slot: 'sleeve', id: 'bandage', name: 'Bloody bandages', price: 700 },
    { slot: 'sleeve', id: 'gold', name: 'Gold sleeve', price: 3500 },
    { slot: 'gloves', id: 'none', name: 'Bare hands', price: 0 },
    { slot: 'gloves', id: 'black', name: 'Black gloves', price: 900 },
    { slot: 'gloves', id: 'mannequin', name: 'Mannequin hands', price: 1200 },
    { slot: 'gloves', id: 'burnt', name: 'Burnt hands', price: 1600 },
    { slot: 'gloves', id: 'bone', name: 'Bone gloves', price: 2800 },
    { slot: 'gloves', id: 'ghost', name: 'Ghost hands', price: 6000 },
    { slot: 'mask', id: 'none', name: 'No mask', price: 0 },
    { slot: 'mask', id: 'hockey', name: 'Hockey mask', price: 900 },
    { slot: 'mask', id: 'gas', name: 'Gas mask', price: 1300 },
    { slot: 'mask', id: 'doll', name: 'Porcelain doll face', price: 1800 },
    { slot: 'mask', id: 'plague', name: 'Plague doctor', price: 2400 },
    { slot: 'mask', id: 'skull', name: 'Skull mask', price: 3200 },
    { slot: 'mask', id: 'blind', name: 'Face of the Blind One', price: 5000 }
];
export const SLOTS = [{ id: 'hat', name: 'Hats' }, { id: 'glasses', name: 'Glasses' }, { id: 'mask', name: 'Masks' }, { id: 'sleeve', name: 'Sleeves' }, { id: 'gloves', name: 'Hands' }];

// Pula zadań dziennych: każdego dnia losowane są 3 (takie same dla wszystkich graczy danego dnia)
export const QUEST_POOL = [
    { id: 'tramp', text: 'Bounce on the trampoline 15 times', target: 15, reward: 80 },
    { id: 'height', text: 'Climb 12 m above the floor', target: 12, reward: 100 },
    { id: 'rope', text: 'Grab the guts ropes 5 times', target: 5, reward: 60 },
    { id: 'throw', text: 'Throw an eyeball 8 times', target: 8, reward: 50 },
    { id: 'play', text: 'Play for 15 minutes', target: 15, reward: 70 },
    { id: 'social', text: 'Spend 10 minutes with other players', target: 10, reward: 120 },
    { id: 'top', text: 'Stand on top of the spiral stairs', target: 1, reward: 90 },
    { id: 'shop', text: 'Buy or wear an item in the shop', target: 1, reward: 40 }
];

// Bonusy za aktywności (z dziennym limitem, żeby nie dało się ich nabijać w nieskończoność)
export const ACTIVITY = {
    tramp: { each: 2, cap: 40, label: 'Trampoline bounce' },
    rope: { each: 3, cap: 30, label: 'Rope grab' },
    throw: { each: 1, cap: 20, label: 'Eyeball throw' },
    play: { each: 10, every: 300, cap: 120, label: 'Every 5 min played' },
    social: { each: 15, every: 300, cap: 150, label: 'Every 5 min with others' }
};
export const HEIGHT_RECORD_BONUS = 10;   // za każdy nowy metr rekordu wysokości
export const HIGH_DAILY_BONUS = 30;      // pierwsze wejście na 15 m danego dnia

function defaultSave() {
    return {
        v: 1, wallet: START_BONES, earned: 0,
        owned: ['hat:none', 'hat:cap', 'glasses:none', 'mask:none', 'sleeve:cloth', 'gloves:none'],
        equipped: { hat: 'none', glasses: 'none', mask: 'none', sleeve: 'cloth', gloves: 'none' },
        profile: { name: 'Acrobat', skin: '#d9a07a', color: '#3d2314' },
        best: { height: 0, jumps: 0 },
        login: { last: 0, streak: 0 },
        daily: null, pos: null, savedAt: 0
    };
}
function load() {
    const d = defaultSave();
    try {
        const raw = localStorage.getItem(SAVE_KEY);
        if (!raw) return d;
        const s = JSON.parse(raw);
        const owned = Array.isArray(s.owned) ? s.owned : d.owned.slice();
        for (const o of d.owned) if (!owned.includes(o)) owned.push(o);   // nowe darmowe przedmioty dla starych zapisów
        return Object.assign(d, s, {
            equipped: Object.assign(d.equipped, s.equipped || {}),
            profile: Object.assign(d.profile, s.profile || {}),
            best: Object.assign(d.best, s.best || {}),
            login: Object.assign(d.login, s.login || {}),
            owned: owned
        });
    } catch (e) { return d; }
}
export const SAVE = load();
export const SESSION = { maxH: 0, jumps: 0, since: Date.now(), lastM: 0 };

export function hasSave() { try { return !!localStorage.getItem(SAVE_KEY); } catch (e) { return false; } }
export function saveGame() {
    try { SAVE.savedAt = Date.now(); localStorage.setItem(SAVE_KEY, JSON.stringify(SAVE)); return true; }
    catch (e) { return false; }
}
export function resetSave() { try { localStorage.removeItem(SAVE_KEY); } catch (e) {} }

export function addBones(n, why) {
    if (!(n > 0)) return;
    SAVE.wallet += n; SAVE.earned += n;
    toast('+' + n + ' bones: ' + why);
    markAllDirty();
}

// --- Wygląd i sklep ---
const lookListeners = [];
export function onLookChange(fn) { lookListeners.push(fn); }
function notifyLook() { const l = getLook(); lookListeners.forEach(f => f(l)); markAllDirty(); }
export function getLook() {
    return { name: SAVE.profile.name, skin: SAVE.profile.skin, color: SAVE.profile.color, hat: SAVE.equipped.hat, glasses: SAVE.equipped.glasses, mask: SAVE.equipped.mask, sleeve: SAVE.equipped.sleeve, gloves: SAVE.equipped.gloves };
}
export function setProfile(p) { Object.assign(SAVE.profile, p); saveGame(); notifyLook(); }
export function isOwned(item) { return SAVE.owned.includes(item.slot + ':' + item.id); }
export function isEquipped(item) { return SAVE.equipped[item.slot] === item.id; }
export function buyItem(item) {
    if (isOwned(item)) return 'owned';
    if (SAVE.wallet < item.price) { toast('Not enough bones for ' + item.name, '#e0533f'); return 'poor'; }
    SAVE.wallet -= item.price; SAVE.owned.push(item.slot + ':' + item.id);
    SAVE.equipped[item.slot] = item.id;
    toast('Bought ' + item.name + ' (-' + item.price + ')', '#7fc47f');
    track('shop'); saveGame(); notifyLook();
    return 'ok';
}
export function equipItem(item) {
    if (!isOwned(item)) return;
    SAVE.equipped[item.slot] = item.id;
    track('shop'); saveGame(); notifyLook();
}

// --- Nagroda za logowanie co 6 godzin ---
export function loginRewardAmount(streak) { return Math.min(250, 100 + 15 * (streak - 1)); }
function nextStreak() { const now = Date.now(); return (SAVE.login.last && now - SAVE.login.last <= STREAK_WINDOW) ? Math.min(11, SAVE.login.streak + 1) : 1; }
export function loginStatus() {
    const now = Date.now(), next = SAVE.login.last + LOGIN_INTERVAL, s = nextStreak();
    return { ready: now >= next, msLeft: Math.max(0, next - now), nextStreak: s, nextAmount: loginRewardAmount(s), streak: SAVE.login.streak };
}
export function claimLoginReward() {
    const st = loginStatus();
    if (!st.ready) return 0;
    SAVE.login.streak = st.nextStreak; SAVE.login.last = Date.now();
    addBones(st.nextAmount, 'login reward, streak ' + st.nextStreak);
    saveGame();
    return st.nextAmount;
}

// --- Zadania dzienne ---
function todayKey() { const d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }
function hashStr(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
export function msToMidnight() { const n = new Date(), m = new Date(n.getFullYear(), n.getMonth(), n.getDate() + 1); return m - n; }
export function ensureDaily() {
    const k = todayKey();
    if (SAVE.daily && SAVE.daily.date === k) return SAVE.daily;
    let h = hashStr(k);
    const pool = QUEST_POOL.slice(), picks = [];
    while (picks.length < 3) { h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0; picks.push(pool.splice(h % pool.length, 1)[0]); }
    SAVE.daily = {
        date: k, quests: picks.map(q => ({ id: q.id, p: 0, done: false })), bonus: false,
        caps: { tramp: 0, rope: 0, throw: 0, play: 0, social: 0 }, acc: { play: 0, social: 0, playMin: 0, socialMin: 0 }, highBonus: false
    };
    saveGame(); markAllDirty();
    return SAVE.daily;
}
export function questDef(id) { return QUEST_POOL.find(q => q.id === id); }
function questProgress(id, value, isMax) {
    const d = ensureDaily();
    for (const q of d.quests) {
        if (q.id !== id || q.done) continue;
        const def = questDef(id);
        q.p = isMax ? Math.max(q.p, value) : q.p + value;
        if (q.p >= def.target) {
            q.p = def.target; q.done = true;
            addBones(def.reward, 'daily quest done');
            if (d.quests.every(x => x.done) && !d.bonus) { d.bonus = true; addBones(QUEST_ALL_BONUS, 'all daily quests'); }
            saveGame();
        }
        markAllDirty();
    }
}
function capped(key, amount) {
    const d = ensureDaily(), a = ACTIVITY[key], give = Math.min(amount, a.cap - d.caps[key]);
    if (give > 0) { d.caps[key] += give; addBones(give, a.label.toLowerCase()); }
}

// Zdarzenia z gry: 'tramp', 'rope', 'throw', 'shop', 'top', 'height' (v = metry nad podłogą)
export function track(ev, v) {
    if (ev === 'height') {
        if (v > SESSION.maxH) SESSION.maxH = v;
        const m = Math.floor(v);
        if (m <= SESSION.lastM) return;
        SESSION.lastM = m;
        questProgress('height', m, true);
        const prevBest = Math.floor(SAVE.best.height);
        if (m > prevBest) { SAVE.best.height = m; addBones((m - prevBest) * HEIGHT_RECORD_BONUS, 'new height record ' + m + ' m'); }
        const d = ensureDaily();
        if (m >= 15 && !d.highBonus) { d.highBonus = true; addBones(HIGH_DAILY_BONUS, 'reached 15 m today'); }
        return;
    }
    if (ev === 'tramp') { SESSION.jumps++; SAVE.best.jumps++; capped('tramp', ACTIVITY.tramp.each); questProgress('tramp', 1); }
    else if (ev === 'rope') { capped('rope', ACTIVITY.rope.each); questProgress('rope', 1); }
    else if (ev === 'throw') { capped('throw', ACTIVITY.throw.each); questProgress('throw', 1); }
    else if (ev === 'shop') questProgress('shop', 1);
    else if (ev === 'top') { const d = ensureDaily(); if (d.quests.some(q => q.id === 'top' && !q.done)) questProgress('top', 1, true); }
}

// Wywoływane co klatkę: czas gry i czas z innymi graczami
export function tick(dt, othersCount) {
    const d = ensureDaily(), a = d.acc;
    a.play += dt; a.playMin += dt;
    if (a.playMin >= 60) { a.playMin -= 60; questProgress('play', 1); }
    if (a.play >= ACTIVITY.play.every) { a.play -= ACTIVITY.play.every; capped('play', ACTIVITY.play.each); }
    if (othersCount > 0) {
        a.social += dt; a.socialMin += dt;
        if (a.socialMin >= 60) { a.socialMin -= 60; questProgress('social', 1); }
        if (a.social >= ACTIVITY.social.every) { a.social -= ACTIVITY.social.every; capped('social', ACTIVITY.social.each); }
    }
}
export function fmtDuration(ms) {
    const s = Math.max(0, Math.floor(ms / 1000)), h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), ss = s % 60;
    return h > 0 ? h + 'h ' + (m < 10 ? '0' : '') + m + 'm' : m + 'm ' + (ss < 10 ? '0' : '') + ss + 's';
}
