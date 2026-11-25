// ==========================================
// STÓŁ SPIRYTYSTYCZNY (czysta logika, bez THREE): tablica ouija w aneksie lobby (core/annexplay.js). Gracz kładzie dłoń nad planszetką i ją prowadzi;
// litera, nad którą planszetka stoi OUIJA.HOVER sekundy, trafia do napisu. Gdy napis kończy się pytaniem z REPLIES, duch odpowiada sam: planszetka sama
// wędruje po literach odpowiedzi. Wszystko lokalne (nic nie idzie przez sieć), bez nagród.
// Współrzędne planszy (u, v) w metrach od środka stołu; u w prawo, v do przodu (od strony gracza).
// ==========================================
export const OUIJA = { R: 1.0, HIT: 0.065, HOVER: 1.0, MAX_TEXT: 24, GHOST_STEP: 1.0, GHOST_GAP: 0.6, REACH: 0.2 };
const ROW1 = 'ABCDEFGHIJKLM', ROW2 = 'NOPQRSTUVWXYZ';
export const KEYS = (() => {
    const k = [];
    for (let i = 0; i < 13; i++) { k.push({ id: ROW1[i], u: (i - 6) * 0.125, v: -0.16 }); k.push({ id: ROW2[i], u: (i - 6) * 0.125, v: 0.12 }); }
    k.push({ id: 'YES', u: -0.55, v: -0.55 }, { id: 'NO', u: 0.55, v: -0.55 }, { id: 'BYE', u: 0, v: 0.58 });
    return k;
})();
export const keyById = (id) => KEYS.find(k => k.id === id) || null;
// Klucz pod punktem (u, v) albo null
export function keyAt(u, v) {
    let best = null, bd = OUIJA.HIT;
    for (const k of KEYS) { const d = Math.hypot(u - k.u, v - k.v); if (d < bd) { bd = d; best = k; } }
    return best;
}
export const onBoard = (u, v) => Math.hypot(u, v) <= OUIJA.R;
// Planszetka pod dłonią: cel (u, v) przycięty do planszy
export function clampToBoard(u, v) { const d = Math.hypot(u, v); return d <= OUIJA.R - 0.1 ? { u: u, v: v } : { u: u / d * (OUIJA.R - 0.1), v: v / d * (OUIJA.R - 0.1) }; }
// Płynne ruszanie planszetki (rate 1/s); niezależne od liczby klatek
export function glide(cur, target, dt, rate) { const a = 1 - Math.exp(-rate * Math.min(Math.max(dt, 0), 0.5)); return { u: cur.u + (target.u - cur.u) * a, v: cur.v + (target.v - cur.v) * a }; }

export const newOuija = () => ({ text: '', hover: { id: '', t: 0, locked: '' }, ghost: null, bye: 0 });
// Najeżdżanie na klucz: po HOVER sekundach wybór; potem klucz jest zablokowany, aż planszetka go opuści
export function hoverStep(hv, id, dt) {
    const h = { id: hv.id, t: hv.t, locked: hv.locked }, d = Math.min(Math.max(dt, 0), 0.5);
    if (!id) { h.id = ''; h.t = 0; h.locked = ''; return { hv: h, picked: '' }; }
    if (id === h.locked) return { hv: h, picked: '' };
    if (id !== h.id) { h.id = id; h.t = 0; h.locked = ''; }
    h.t += d;
    if (h.t >= OUIJA.HOVER) { h.locked = id; h.t = 0; return { hv: h, picked: id }; }
    return { hv: h, picked: '' };
}
// Dopisanie wyboru do napisu: litera, słowo YES/NO (osobno), BYE czyści
export function applyPick(text, id) {
    if (id === 'BYE') return '';
    const add = id === 'YES' || id === 'NO' ? (text && !text.endsWith(' ') ? ' ' : '') + id + ' ' : id;
    return (text + add).slice(-OUIJA.MAX_TEXT);
}
// Odpowiedzi ducha: napis kończący się pytaniem (po usunięciu spacji) wywołuje odpowiedź
export const REPLIES = [{ ask: 'HELLO', say: 'I SEE YOU' }, { ask: 'WHO', say: 'BEHIND YOU' }, { ask: 'HELP', say: 'RUN' }, { ask: 'LEAVE', say: 'NO' }, { ask: 'ALONE', say: 'NO' }, { ask: 'NAME', say: 'LEGION' }, { ask: 'WHERE', say: 'BELOW' }];
export function replyFor(text) {
    const t = String(text).replace(/ /g, '');
    for (const r of REPLIES) if (t.endsWith(r.ask)) return r.say;
    return '';
}
// Droga ducha: lista kluczy (spacja = pauza); nieznane znaki są pomijane
export function ghostPath(say) { const out = []; for (const ch of String(say)) { if (ch === ' ') out.push(' '); else if (keyById(ch)) out.push(ch); } return out; }
export const startGhost = (say) => { const p = ghostPath(say); return p.length ? { path: p, i: 0, t: 0 } : null; };
// Krok ducha: zwraca aktualny klucz i ewentualnie literę do dopisania (gdy planszetka zdążyła dojść) albo koniec
export function ghostStep(g, dt) {
    const s = { path: g.path, i: g.i, t: g.t }, d = Math.min(Math.max(dt, 0), 0.5), tok = s.path[s.i], need = tok === ' ' ? OUIJA.GHOST_GAP : OUIJA.GHOST_STEP;
    s.t += d;
    if (s.t < need) return { g: s, key: tok === ' ' ? '' : tok, add: '', done: false };
    s.t = 0; s.i++;
    return { g: s, key: tok === ' ' ? '' : tok, add: tok === ' ' ? ' ' : tok, done: s.i >= s.path.length };
}
