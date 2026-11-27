// ==========================================
// SCARY GTA: RADIO POLICYJNE (czysta logika, bez THREE). Krótkie komunikaty dyspozytora: wyzwalane zmianą gwiazdek, helikopterem, SWAT-em, strzałami i złapaniem,
// z priorytetami, odnowieniem (żeby nie zagadać gry) i bez powtarzania tej samej linii w 40 s. Tekst jest ASCII (core/voicelogic.js zamienia go na głos z formantów).
// Testy: tests/logic.mjs (blok "pogoda i radio").
// ==========================================
export const RADIO = { GAP: 9, REPEAT: 40, IDLE: [22, 34], SHOW: 6 };
export const LINES = {
    first: { pri: 2, text: 'Dispatch to all units. Robbery in progress.' },
    up3: { pri: 3, text: 'Eye One is airborne. Suspect on foot.' },
    up4: { pri: 3, text: 'Eye One has visual. Keep him in the light.' },
    up5: { pri: 4, text: 'All units. Lethal force authorized. SWAT inbound.' },
    swat: { pri: 4, text: 'SWAT is on the ropes. Move in.' },
    block: { pri: 3, text: 'Roadblock in place. Nothing with wheels gets through.' },
    shots: { pri: 3, text: 'Shots fired. Shots fired.' },
    busted: { pri: 5, text: 'Suspect in custody. Stand down.' },
    lost: { pri: 1, text: 'We lost him. Sweep the last known position.' },
    clear: { pri: 1, text: 'Suspect gone. All units return to patrol.' },
    idle1: { pri: 0, text: 'Unit twelve, check the alley behind the casino.' },
    idle2: { pri: 0, text: 'He is still in the district. Eyes open.' },
    idle3: { pri: 0, text: 'Block the boulevard. Do not let him reach the pier.' },
    idle4: { pri: 0, text: 'Hey {name}. We can see you.' }
};
export const newRadio = () => ({ prevStars: 0, cd: 0, idleT: 18, last: {}, queue: [], clock: 0, heli: false });
// Krok: c = { stars, heli (bool: helikopter w powietrzu), swat, shot, busted }; zwraca { key, text } do wypowiedzenia albo null
export function radioStep(st, dt, c, rnd) {
    const R = rnd || Math.random, d = Math.min(Math.max(dt, 0), 0.5); st.clock += d; st.cd = Math.max(0, st.cd - d);
    const q = (key) => { if (LINES[key] && !st.queue.includes(key)) st.queue.push(key); };
    if (c.stars > st.prevStars) { if (st.prevStars === 0) q('first'); if (c.stars >= 5 && st.prevStars < 5) q('up5'); else if (c.stars === 4) q('up4'); }
    if (c.stars < st.prevStars) q(c.stars === 0 ? 'clear' : 'lost');
    if (c.heli && !st.heli && c.stars >= 3) q('up3'); st.heli = !!c.heli;
    if (c.block) q('block'); if (c.swat) q('swat'); if (c.shot) q('shots'); if (c.busted) q('busted');
    st.prevStars = c.stars;
    if (c.stars > 0 && st.queue.length === 0) { st.idleT -= d; if (st.idleT <= 0) { st.idleT = RADIO.IDLE[0] + R() * (RADIO.IDLE[1] - RADIO.IDLE[0]); q('idle' + (1 + Math.floor(R() * 4))); } }
    if (st.cd > 0 || !st.queue.length) return null;
    st.queue.sort((a, b) => LINES[b].pri - LINES[a].pri);
    while (st.queue.length) {
        const key = st.queue.shift();
        if (st.last[key] !== undefined && st.clock - st.last[key] < RADIO.REPEAT) continue;
        st.last[key] = st.clock; st.cd = RADIO.GAP; st.queue = st.queue.filter(k => LINES[k].pri >= 4);   // po wypowiedzi giną stare, mało ważne zaległości
        return { key: key, text: LINES[key].text };
    }
    return null;
}
