// ==========================================
// SCARY GTA: DZIENNE KONTRAKTY (czysta logika, bez THREE). Dyspozytor daje co dzień 3 zlecenia (z daty UTC, takie same dla wszystkich graczy danego dnia) z puli 6. Każde zlecenie to czysty detektor krokowy,
// który liczy się WYŁĄCZNIE z tego, co klient zna lokalnie (własne gwiazdki z migawki, wysokość ciała, czy jedzie pickupem, faza nocy, własne torby, helikopter), więc działa też u gościa bez żadnej wiadomości sieciowej.
// Nagroda raz na dobę za zlecenie (CT.REWARD) plus premia za komplet (CT.ALL_BONUS); wypłaca ją `completeContract`, a poziom NIE woła jej przy mutatorze ani w trakcie rundy trybu (bez farmienia).
// Zapis: SAVE.gta.contracts { date, done: [id] } zawsze przez `normalizeContracts` (nowe pole musi być też w jawnej liście `normalizeGta`). Postęp bieżącego biegu (`newRun`) nie jest zapisywany.
// 3D nie ma: telefon (mapa) pokazuje licznik i podpowiedź, napis dostajesz w toaście. Testy: tests/logic.mjs (blok "kontrakty"), w przeglądarce tests/contracts.mjs.
// ==========================================
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const fin = (n) => typeof n === 'number' && Number.isFinite(n);
function fnv(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; }

export const CT = { PICK: 3, REWARD: 60, ALL_BONUS: 100, STARS: 3, CLIMB_Y: 30, BAGS: 2 };
export const CONTRACTS = [
    { id: 'cool', text: 'Lose a three-star wanted level without a Pay n Spray booth' },
    { id: 'climb', text: 'Climb thirty metres above the street' },
    { id: 'ride', text: 'Ride a getaway pickup to its destination' },
    { id: 'dark', text: 'Get through a whole blackout without being caught' },
    { id: 'twin', text: 'Carry two bags at the same time' },
    { id: 'air', text: 'Grab a bag while the police helicopter is up' }
];
export const IDS = CONTRACTS.map(c => c.id);
export const textOf = (id) => { const c = CONTRACTS.find(q => q.id === id); return c ? c.text : ''; };

// Trzy różne zlecenia z daty (stabilne, bez Math.random)
export function todayContracts(iso) {
    const day = DATE.test(String(iso)) ? iso : '0000-00-00', pool = IDS.slice(), out = [];
    for (let i = 0; i < CT.PICK; i++) { const k = fnv('ct:' + day + ':' + i) % pool.length; out.push(pool.splice(k, 1)[0]); }
    return out;
}

// ----- zapis -----
export const newContracts = () => ({ date: '', done: [] });
export function normalizeContracts(raw) {
    const out = newContracts(); if (!raw || typeof raw !== 'object') return out;
    if (typeof raw.date === 'string' && DATE.test(raw.date)) out.date = raw.date;
    if (Array.isArray(raw.done) && out.date) { const picks = todayContracts(out.date); for (const id of raw.done) if (typeof id === 'string' && picks.includes(id) && !out.done.includes(id)) out.done.push(id); }
    return out;
}
// Stan na dziś (stary dzień = świeży)
export const contractsFor = (gta, today) => gta && gta.contracts && gta.contracts.date === today ? gta.contracts : { date: today, done: [] };
// Wypłata: tylko zlecenie z dzisiejszej trójki i tylko raz; zwraca { gta, reward, bonus, all }
export function completeContract(gta, today, id) {
    const none = { gta: gta, reward: 0, bonus: 0, all: false }, picks = todayContracts(today);
    if (!DATE.test(String(today)) || !picks.includes(id)) return none;
    const cur = contractsFor(gta, today); if (cur.done.includes(id)) return none;
    const done = cur.done.concat([id]), all = picks.every(p => done.includes(p));
    return { gta: Object.assign({}, gta, { contracts: { date: today, done: done } }), reward: CT.REWARD, bonus: all ? CT.ALL_BONUS : 0, all: all };
}
// Do telefonu: lista { id, text, done } i pierwsza niezaliczona podpowiedź
export function contractInfo(gta, today) {
    const cur = contractsFor(gta, today), list = todayContracts(today).map(id => ({ id: id, text: textOf(id), done: cur.done.includes(id) })), next = list.find(q => !q.done);
    return { list: list, n: list.filter(q => q.done).length, total: list.length, next: next ? next.text : '' };
}

// ----- detektory krokowe -----
export const newRun = () => ({ hot: false, sprayedSince: false, dark: 'none', prevNight: 'calm', prevGot: 0 });
// ev: { stars, sprayed (czy właśnie użyto Pay n Spray), y (wysokość ciała), arrived (dojazd pickupem, jednorazowo), night ('calm'|'blackout'|'horde'), busted, got (liczba toreb), heli (helikopter w powietrzu) }
// Zwraca { run, hits } (hits: id zleceń spełnionych w TYM kroku; wywołujący sam sprawdza, czy są na dziś i czy nie były zaliczone)
export function contractStep(run, ev) {
    const r = Object.assign({}, run), hits = [], e = ev || {}, stars = fin(e.stars) ? e.stars : 0, got = fin(e.got) ? e.got : 0, night = e.night === 'blackout' || e.night === 'horde' ? e.night : 'calm';
    // cool: wejście na 3+ gwiazdki, zejście do zera bez kabiny Pay n Spray
    if (e.busted) { r.hot = false; r.sprayedSince = false; }   // złapanie (BUSTED) zbija ciepło o gwiazdkę, a kilka złapań z rzędu zeszłoby do zera: to nie jest "zgubienie" poziomu
    if (stars >= CT.STARS && !e.busted) { r.hot = true; if (!run.hot) r.sprayedSince = false; }
    if (e.sprayed) r.sprayedSince = true;
    if (r.hot && stars === 0 && !e.busted) { if (!r.sprayedSince) hits.push('cool'); r.hot = false; r.sprayedSince = false; }
    // climb: ciało wysoko nad ulicą
    if (fin(e.y) && e.y >= CT.CLIMB_Y) hits.push('climb');
    // ride: dojazd pickupem do celu (zdarzenie z pojazdów; poziom nie zgłasza go, gdy jazdę obcięto barykadą)
    if (e.arrived) hits.push('ride');
    // dark: cały blackout od początku do końca, bez złapania (wejście w trakcie blackoutu się nie liczy)
    if (night === 'blackout') { if (run.prevNight !== 'blackout') r.dark = 'in'; if (e.busted) r.dark = 'fail'; }
    else if (run.prevNight === 'blackout') { if (r.dark === 'in') hits.push('dark'); r.dark = 'none'; }
    r.prevNight = night;
    // twin: dwie torby naraz
    if (got >= CT.BAGS) hits.push('twin');
    // air: torba zabrana, gdy helikopter jest w powietrzu
    if (got > run.prevGot && e.heli) hits.push('air');
    r.prevGot = got;
    return { run: r, hits: hits };
}
export function contractProblems() {
    const bad = [];
    if (new Set(IDS).size !== IDS.length || IDS.length < CT.PICK + 2) bad.push('contract pool is too small or has duplicates');
    for (const c of CONTRACTS) { if (!/^[A-Za-z ,.'-]+$/.test(c.text) || c.text.length > 64) bad.push('contract text is malformed: ' + c.text); }
    for (let d = 1; d <= 60; d++) { const iso = '2026-' + String(1 + (d % 12)).padStart(2, '0') + '-' + String(1 + (d % 28)).padStart(2, '0'), p = todayContracts(iso); if (new Set(p).size !== CT.PICK || p.some(id => !IDS.includes(id))) bad.push('bad picks for ' + iso); }
    if (CT.REWARD < 1 || CT.REWARD > 120 || CT.ALL_BONUS > 300) bad.push('contract rewards are out of the sane range');
    return bad;
}
