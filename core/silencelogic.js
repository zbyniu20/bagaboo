// ==========================================
// Celowa cisza (czysta logika, bez Web Audio): krótkie okna, w których ambient i muzyka tła milkną niemal całkiem. Cisza przed burzą działa na nerwy lepiej niż hałas.
// Dwa wyzwalacze: (1) napięcie z reżysera grozy rośnie przez próg (potwór zbliża się na ok. 11 m): 2,8 s ciszy tuż przed jego dźwiękami; (2) długi spokój (napięcie
// prawie zero przez 55 s): 4,5-7 s ciszy i na jej końcu jeden daleki dźwięk (zdarzenie 'cue'). Wyciszane są WYŁĄCZNIE ambient, drone i warstwa napięcia (szyna ambient w audio.js),
// nigdy sygnały zagrożenia (kroki, oddech, warczenie, szept, ryk, jumpscare): w tej grze to informacja o potworze, a ich tłumienie zrobiłoby poziomy trudniejszymi.
// Nie działa w poziomie Silence (ma własną mechanikę mikrofonu i ryku) ani w trybie spokojnym gier. Ciszą steruje tylko lokalny czas (nic nie idzie przez sieć).
// ==========================================
export const SILENCE = { dip: 0.08, risingAt: 0.3, risingLen: 2.8, calmTension: 0.08, calmHold: 55, calmLen: [4.5, 7.0], cooldown: 45, tauDown: 0.12, tauUp: 0.8, skip: ['silence'] };
const baseId = (id) => String(id || '').split(/[_:\-.]/)[0];
export const silenceAllowed = (levelId, calm) => !calm && !SILENCE.skip.includes(baseId(levelId));
export const newSilence = () => ({ prevA: 0, kind: null, t: 0, len: 0, calmT: 0, cd: 0, gain: 1 });

// dt w s, a = napięcie 0..1 (DREAD.tension), hush = potwór tuż obok (ambient i tak ucichł), enabled = poziom z reżyserem grozy, nie skip, nie tryb spokojny, nie po jumpscare'ie,
// rnd = funkcja 0..1. Zwraca { gain: mnożnik szyny ambientu 0..1, event: null | 'start' | 'cue' }
export function silenceStep(st, dt, a, hush, enabled, rnd) {
    if (!(dt > 0)) return { gain: st.gain, event: null };
    const A = Number.isFinite(a) ? Math.max(0, Math.min(1, a)) : 0, R = SILENCE;
    let event = null;
    st.cd = Math.max(0, st.cd - dt);
    if (!enabled) { st.kind = null; st.t = 0; st.calmT = 0; }
    else if (st.kind) {
        st.t += dt;
        if (st.t >= st.len) { if (st.kind === 'calm') event = 'cue'; st.kind = null; st.t = 0; st.cd = R.cooldown; }
    } else if (!hush) {
        const start = (kind, len) => { st.kind = kind; st.t = 0; st.len = len; st.calmT = 0; event = 'start'; };
        if (st.prevA < R.risingAt && A >= R.risingAt) { if (st.cd <= 0) start('rising', R.risingLen); }
        else if (A < R.calmTension) { st.calmT += dt; if (st.calmT >= R.calmHold && st.cd <= 0) start('calm', R.calmLen[0] + (R.calmLen[1] - R.calmLen[0]) * (rnd ? rnd() : 0.5)); }
        else st.calmT = 0;
    }
    st.prevA = A;
    const target = st.kind ? R.dip : 1, tau = target < st.gain ? R.tauDown : R.tauUp;
    st.gain += (target - st.gain) * (1 - Math.exp(-dt / tau));
    return { gain: st.gain, event: event };
}
