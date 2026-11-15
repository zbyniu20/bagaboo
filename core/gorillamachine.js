// ==========================================
// MASZYNA GORYLA (lobby, obok sklepu): pełny model twojego goryla w szklanej gablocie i pulpit z kategoriami kosmetyków.
// Kategoria otwiera listę, kliknięcie przedmiotu pokazuje go na modelu (też tych, których jeszcze nie masz: tu się przymierza i sprawdza),
// "Wear" zakłada kupiony przedmiot, emotki odtwarzają się na modelu. Kupuje się wciąż w sklepie na Bagabucks (kupione znikają stamtąd).
// Cała logika przymierzania i zakładania jest tutaj: sklep i garderoba już tego nie robią.
// ==========================================
import { THREE } from './engine.js';
import * as E from './economy.js';
import { Terminal, markAllDirty, toast, AMBER, AMBER_DIM, GOLD, OK_COL, BAD_COL } from './terminal.js';
import { createAvatar } from './avatar.js';
import { EMOTES, emotePose } from './emotes.js';

// Kategorie w kolejności na pulpicie (id = slot w katalogu)
export const CATS = [
    { id: 'skin', name: 'Skins' }, { id: 'badge', name: 'Badges' }, { id: 'hat', name: 'Hats' }, { id: 'glasses', name: 'Glasses' },
    { id: 'mask', name: 'Masks' }, { id: 'sleeve', name: 'Sleeves' }, { id: 'gloves', name: 'Hands' }, { id: 'emote', name: 'Emotes' }, { id: 'mskin', name: 'Monster skins' }
];
const STAFF_HINTS = ['Owner', 'Ultimate', 'Ultimate Admin', 'Co-admin', 'Admin', 'Moderator', 'Staff', 'For hackers'];   // przedmioty tylko dla ekipy: pokazane wyłącznie tym, którzy je mają (np. odznaki Owner i Admin dla BoyIsGamer)
export const itemsFor = (slot) => E.CATALOG.filter(it => it.slot === slot && !(it.locked && STAFF_HINTS.includes(it.hint) && !E.isOwned(it)));
const PER = 7;

// Stan maszyny
export const M = { slot: 'skin', sel: {}, info: null, emote: null, pg: 0, auto: true, spin: 0, dirty: true, avatar: null, pivot: null, clock: 0 };

// Wygląd na modelu: twój założony strój + to, co przymierzasz (po jednym przedmiocie na kategorię)
export function machineLook() {
    const look = E.getLook();
    for (const s in M.sel) if (M.sel[s]) look[s] = M.sel[s];
    return look;
}
function refresh() { M.dirty = true; markAllDirty(); }
function selectItem(it) {
    M.info = it;
    if (it.slot === 'emote') M.emote = M.emote === it.id ? null : it.id;
    else if (it.slot !== 'mskin') M.sel[it.slot] = M.sel[it.slot] === it.id ? undefined : it.id;
    refresh();
}
export function resetTry() { M.sel = {}; M.emote = null; M.info = null; refresh(); }
// Założenie przedmiotu (tylko kupione) kasuje przymiarkę w tej kategorii: model pokazuje już prawdziwy strój
E.onLookChange(() => { const cur = E.getLook(); for (const s in M.sel) if (M.sel[s] === cur[s]) delete M.sel[s]; M.dirty = true; markAllDirty(); });

function statusOf(it) {
    const owned = E.isOwned(it), worn = E.isEquipped(it), locked = E.isLocked(it), price = E.priceOf(it);
    if (worn) return { text: it.slot === 'emote' ? 'Favorite' : 'Wearing', col: OK_COL };
    if (owned) return { text: 'Owned', col: AMBER };
    if (locked) { const l = E.lockText(it); return { text: l, col: it.locked ? BAD_COL : AMBER_DIM, small: l.length > 14 }; }
    return { text: price === 0 ? 'Free' : price + ' B', col: E.SAVE.wallet >= price ? GOLD : BAD_COL };
}

export const machine = new Terminal((t) => {
    const c = t.ctx;
    t.background();
    t.header('GORILLA MACHINE', E.CURRENCY + ': ' + E.SAVE.wallet, GOLD);
    CATS.forEach((cat, i) => {
        const n = itemsFor(cat.id).filter(it => E.isOwned(it)).length;
        t.btn('cat' + cat.id, 18, 84 + i * 60, 236, 52, cat.name, () => { M.slot = cat.id; M.pg = 0; M.info = null; markAllDirty(); }, { size: cat.name.length > 10 ? 18 : 22, active: M.slot === cat.id, tone: cat.id === 'mskin' ? 'bad' : undefined });
        void n;
    });
    const items = itemsFor(M.slot), pages = Math.max(1, Math.ceil(items.length / PER));
    M.pg = Math.min(M.pg, pages - 1);
    const cat = CATS.find(x => x.id === M.slot);
    t.text(cat.name + ' (' + items.filter(it => E.isOwned(it)).length + ' / ' + items.length + ' owned)', 276, 100, 24, GOLD, 'left', true);
    items.slice(M.pg * PER, M.pg * PER + PER).forEach((it, i) => {
        const y = 124 + i * 56, worn = E.isEquipped(it), owned = E.isOwned(it);
        const trying = it.slot === 'emote' ? M.emote === it.id : M.sel[it.slot] === it.id;
        c.fillStyle = i % 2 ? 'rgba(255,176,0,0.04)' : 'rgba(255,176,0,0.08)'; c.fillRect(268, y, 740, 50);
        t.btn('it' + it.slot + it.id, 272, y + 2, 560, 46, '', () => selectItem(it), { active: trying });
        const st = statusOf(it), dark = trying || t.hover.has('it' + it.slot + it.id);   // podświetlony wiersz ma ciemny tekst
        t.text(it.name, 288, y + 26, it.name.length > 22 ? 20 : 24, dark ? '#140c05' : (worn ? OK_COL : GOLD), 'left', true);
        t.text(st.text, 822, y + 26, st.small ? 15 : 20, dark ? '#140c05' : st.col, 'right', true);
        if (worn) t.btn('worn' + it.slot + it.id, 840, y + 5, 160, 40, it.slot === 'emote' ? 'Favorite' : 'Wearing', null, { size: 18, disabled: true });
        else if (owned) t.btn('wear' + it.slot + it.id, 840, y + 5, 160, 40, it.slot === 'emote' ? 'Set favorite' : 'Wear', () => E.equipItem(it), { size: it.slot === 'emote' ? 16 : 20, tone: 'ok' });
        else t.btn('lk' + it.slot + it.id, 840, y + 5, 160, 40, 'Shop', null, { size: 18, disabled: true });
    });
    if (!items.length) t.text('Nothing here yet.', 276, 200, 22, AMBER_DIM, 'left');
    if (pages > 1) {
        t.btn('pgPrev', 268, 520, 170, 38, 'Previous', () => { M.pg--; markAllDirty(); }, { size: 18, disabled: M.pg === 0 });
        t.text('Page ' + (M.pg + 1) + ' of ' + pages, 638, 540, 19, AMBER, 'center');
        t.btn('pgNext', 838, 520, 170, 38, 'Next', () => { M.pg++; markAllDirty(); }, { size: 18, disabled: M.pg >= pages - 1 });
    }
    t.btn('reset', 268, 566, 170, 44, 'Reset try', resetTry, { size: 19 });
    t.btn('spin', 448, 566, 230, 44, M.auto ? 'Turntable: auto' : 'Turntable: off', () => { M.auto = !M.auto; markAllDirty(); }, { size: 18, tone: M.auto ? 'ok' : undefined });
    t.btn('left', 688, 566, 60, 44, '<<', () => { M.spin -= 0.6; M.auto = false; markAllDirty(); }, { size: 22 });
    t.btn('right', 758, 566, 60, 44, '>>', () => { M.spin += 0.6; M.auto = false; markAllDirty(); }, { size: 22 });
    // Informacja o wybranym przedmiocie
    const it = M.info;
    let msg = 'Pick a category, then an item to see it on the gorilla.';
    if (it) {
        const owned = E.isOwned(it), locked = E.isLocked(it), price = E.priceOf(it);
        msg = it.slot === 'mskin' ? it.name + ': shows only when you are the monster in Become the Monster.'
            : (owned ? it.name + ': yours. Press Wear to put it on.' : (locked ? it.name + ': ' + E.lockText(it) : it.name + ': ' + (price === 0 ? 'free' : price + ' ' + E.CURRENCY) + ' at the Bagabucks shop.'));
    }
    t.text(msg.length > 78 ? msg.slice(0, 77) + '…' : msg, 276, 622, 16, AMBER_DIM, 'left');
    t.scanlines();
}, 1024, 640);

// ---------- MODEL W GABLOCIE ----------
// pivot: grupa na tarczy w gablocie (tworzy ją lobby). Model stoi jak w garderobie: głowa, tułów i dłonie.
export function attachGorillaMachine(pivot) { M.pivot = pivot; M.avatar = null; M.dirty = true; }
export function detachGorillaMachine() { M.pivot = null; M.avatar = null; }
function basePose(a) {
    a.head.position.set(0, 1.28, 0); a.head.quaternion.identity();
    a.handL.position.set(-0.46, 0.72, -0.06); a.handR.position.set(0.46, 0.72, -0.06); a.handL.quaternion.identity(); a.handR.quaternion.identity();
    a.torso.position.set(0, 1.28 - (a.torsoDrop || 0.35), 0);
}
export function updateGorillaMachine(dt) {
    if (!M.pivot) return;
    M.clock += dt;
    if (M.dirty || !M.avatar) {
        if (M.avatar) { M.pivot.remove(M.avatar.group); M.avatar.group.traverse((o) => { if (o.geometry) o.geometry.dispose(); const m = o.material; if (m) (Array.isArray(m) ? m : [m]).forEach(x => x.dispose()); }); }
        M.avatar = createAvatar(machineLook()); M.pivot.add(M.avatar.group); basePose(M.avatar); M.dirty = false;
    }
    if (M.auto) M.spin += dt * 0.5;
    M.pivot.rotation.y = Math.PI + M.spin;
    if (M.emote && EMOTES[M.emote]) { basePose(M.avatar); emotePose(M.avatar, M.emote, M.clock % (EMOTES[M.emote].dur + 0.8)); M.avatar.torso.position.set(M.avatar.head.position.x, M.avatar.head.position.y - (M.avatar.torsoDrop || 0.35), M.avatar.head.position.z); }
}
void toast; void THREE;
