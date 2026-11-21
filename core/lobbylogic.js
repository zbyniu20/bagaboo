// ==========================================
// LOGIKA LOBBY (czyste funkcje, bez Three.js i sieci, testowane w Node: tests/modes/lobby.mjs):
//   1) GŁOSOWANIE NA POLACH: gracze głosują, stając na polach; host liczy głosy z pozycji głów (padOf, countVotes, winnerOf, gateStep). Używa tego lobby trybu Become the Monster
//      (głosowanie na mapę, levels/monster.js); z lobby usunięto głosowanie na tryb.
//   2) NOCNA ZMIANA: co kilkanaście minut lobby gaśnie, po sali chodzi potwór (słyszy ruch), a gracze razem naprawiają bezpieczniki.
// Plik nie ma importów, więc działa i w przeglądarce, i w Node. Wszystko, co host liczy, opiera się na pozycjach graczy z jego własnego stanu.
// ==========================================
export const GATE = {
    PADS: [[-9, 4], [-9, 7], [-9, 10]],   // domyślne środki pól (x, z); Monster podaje własne pola
    R: 1.4, MAX_HEAD_Y: 3.2,              // promień pola (m), wyżej niż to (np. na schodach) głos się nie liczy
    VOTE_SEC: 15, QUICK_SEC: 4, SOLO_SEC: 3, LAUNCH_SEC: 3   // czas głosowania, skrócenie gdy wszyscy zagłosowali, solo, odliczanie przed wejściem
};
export const NIGHT = {
    FUSES: [[-10, -10], [10, 4], [4, -12.5]],          // bezpieczniki (x, z), w wolnych miejscach lobby
    FIRST_MIN: 180, FIRST_MAX: 300,                    // pierwsza Nocna Zmiana po wejściu do lobby (s)
    EVERY_MIN: 480, EVERY_MAX: 720,                    // kolejne co 8-12 minut
    WARN_SEC: 20, NIGHT_SEC: 150, RESULT_SEC: 8,
    FUSE_SEC: 8,                                       // naprawa bezpiecznika w pojedynkę (s); więcej osób szybciej
    MONSTER_START: [0, -12], PATROL: 2.0, HUNT: 3.4,   // potwór w lobby jest wolniejszy niż w Generatorze
    MIN_CONTRIB: 3,                                    // tyle sekund przy bezpiecznikach trzeba spędzić, żeby dostać nagrodę
    REWARD: 120, REWARD_REPEAT: 60                     // Bagabucks (dzienny limit powtórek jest w levelReward)
};
const num = (v) => typeof v === 'number' && Number.isFinite(v);

// ---------- głosowanie ----------
// Na którym polu stoi gracz: najbliższe w promieniu R (w poziomie), głowa nie wyżej niż MAX_HEAD_Y; -1 gdy na żadnym
export function padOf(head, pads = GATE.PADS, r = GATE.R, maxY = GATE.MAX_HEAD_Y) {
    if (!head || !num(head.x) || !num(head.y) || !num(head.z) || head.y > maxY) return -1;
    let best = -1, bd = Infinity;
    pads.forEach((p, i) => { const d = Math.hypot(head.x - p[0], head.z - p[1]); if (d < r && d < bd) { bd = d; best = i; } });
    return best;
}
// Liczy głosy z pozycji głów (mapa id -> głowa). Każdy gracz ma jeden głos, bo stoi najwyżej na jednym polu
export function countVotes(heads, pads = GATE.PADS) {
    const counts = pads.map(() => 0), who = {};
    for (const id of Object.keys(heads)) { const i = padOf(heads[id], pads); if (i >= 0) { counts[i]++; who[id] = i; } }
    return { counts: counts, total: counts.reduce((a, b) => a + b, 0), who: who };
}
// Zwycięskie pole: najwięcej głosów, remis rozstrzyga losowanie spośród remisujących; -1 bez głosów
export function winnerOf(counts, rand) {
    const max = Math.max(0, ...counts); if (max <= 0) return -1;
    const tied = counts.map((c, i) => c === max ? i : -1).filter(i => i >= 0);
    return tied[Math.floor(rand() * tied.length) % tied.length];
}
// Maszyna stanów bramy: open (czeka na głosy) -> counting (głosowanie) -> launching (odliczanie) -> go. Zwraca {ph, t, event}
// event: 'start' (pierwszy głos), 'cancel' (wszyscy odeszli), 'lock' (głosy zamknięte: host wybiera zwycięzcę), 'go' (wchodzimy do trybu)
export function gateStep(g, dt, total, present) {
    if (g.ph === 'open') return total > 0 ? { ph: 'counting', t: GATE.VOTE_SEC, event: 'start' } : { ph: 'open', t: 0, event: null };
    if (g.ph === 'counting') {
        if (total <= 0) return { ph: 'open', t: 0, event: 'cancel' };
        let t = g.t - dt;
        if (total >= present) t = Math.min(t, present <= 1 ? GATE.SOLO_SEC : GATE.QUICK_SEC);   // wszyscy zagłosowali: nie każemy czekać
        return t <= 0 ? { ph: 'launching', t: GATE.LAUNCH_SEC, event: 'lock' } : { ph: 'counting', t: t, event: null };
    }
    if (g.ph === 'launching') { const t = g.t - dt; return t <= 0 ? { ph: 'open', t: 0, event: 'go' } : { ph: 'launching', t: t, event: null }; }
    return { ph: 'open', t: 0, event: null };
}
// ---------- Nocna Zmiana ----------
export const nextNightIn = (first, rand) => first ? NIGHT.FIRST_MIN + rand() * (NIGHT.FIRST_MAX - NIGHT.FIRST_MIN) : NIGHT.EVERY_MIN + rand() * (NIGHT.EVERY_MAX - NIGHT.EVERY_MIN);
// calm -> warn (zapowiedź) -> night -> result -> calm. input: { enabled, present, allFuses }. Zwraca {ph, t, event, outcome}
// event: 'warn' | 'start' | 'win' | 'lose' | 'end'
export function nightStep(n, dt, input, rand) {
    const left = n.t - dt;
    if (n.ph === 'calm') return (left <= 0 && input.enabled && input.present > 0) ? { ph: 'warn', t: NIGHT.WARN_SEC, event: 'warn' } : { ph: 'calm', t: Math.max(0, left), event: null };
    if (n.ph === 'warn') return left <= 0 ? { ph: 'night', t: NIGHT.NIGHT_SEC, event: 'start' } : { ph: 'warn', t: left, event: null };
    if (n.ph === 'night') {
        if (input.allFuses) return { ph: 'result', t: NIGHT.RESULT_SEC, event: 'win', outcome: 'win' };
        return left <= 0 ? { ph: 'result', t: NIGHT.RESULT_SEC, event: 'lose', outcome: 'lose' } : { ph: 'night', t: left, event: null };
    }
    if (n.ph === 'result') return left <= 0 ? { ph: 'calm', t: nextNightIn(false, rand), event: 'end' } : { ph: 'result', t: left, event: null, outcome: n.outcome };
    return { ph: 'calm', t: nextNightIn(false, rand), event: null };
}
// Kto dostaje nagrodę za uratowane lobby: obecni gracze, którzy naprawiali bezpieczniki co najmniej MIN_CONTRIB sekund (anty-AFK)
export const winners = (present, contrib) => present.filter(id => (contrib[id] || 0) >= NIGHT.MIN_CONTRIB);
// Jasność lobby podczas nocy (1 = normalnie): zapowiedź przygasza, noc jest ciemna, wynik rozjaśnia
export function nightDim(ph, t) {
    if (ph === 'warn') return 1 - 0.5 * (1 - Math.min(1, t / NIGHT.WARN_SEC));
    if (ph === 'night') return 0.12;
    if (ph === 'result') return 0.12 + 0.88 * (1 - Math.min(1, t / NIGHT.RESULT_SEC));
    return 1;
}
