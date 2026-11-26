// ==========================================
// SCARY GTA: POGODA (czysta logika, bez THREE). Trzy stany: pogodnie, kapuśniaczek, burza. Stan zmienia się co 35-110 s losowo, deszcz narasta i opada płynnie,
// a w burzy co 5-16 s uderza błyskawica: JEDEN krótki błysk (0,35 s, bez stroba i bez podwójnych błysków, komfort VR i fotoczułość), a grzmot dochodzi z opóźnieniem 0,5-4 s.
// 3D, dźwięk i mgła: core/weather.js. Testy: tests/logic.mjs (blok "pogoda i radio").
// ==========================================
export const WX = {
    STATES: ['clear', 'drizzle', 'storm'],
    HOLD: { clear: [50, 110], drizzle: [40, 90], storm: [35, 80] },
    RAIN: { clear: 0, drizzle: 0.45, storm: 1 },
    FOG: { clear: 1, drizzle: 1.15, storm: 1.35 },
    NEXT: { clear: [['drizzle', 0.7], ['storm', 0.3]], drizzle: [['clear', 0.5], ['storm', 0.5]], storm: [['drizzle', 0.6], ['clear', 0.4]] },
    EASE: 0.25, BOLT_GAP: [5, 16], FLASH: 0.35, FLASH_BOOST: 1.6, THUNDER: [0.5, 4]
};
const between = (r, ab) => ab[0] + r() * (ab[1] - ab[0]);
export function newWeather(rand, start) {
    const R = rand || Math.random, state = WX.STATES.includes(start) ? start : 'clear';
    return { state: state, hold: between(R, WX.HOLD[state]), rain: WX.RAIN[state], fog: WX.FOG[state], bolt: between(R, WX.BOLT_GAP), flash: 0, thunder: [] };
}
export function nextState(state, r) {
    let acc = 0; const roll = r(); for (const [s, p] of WX.NEXT[state] || WX.NEXT.clear) { acc += p; if (roll < acc) return s; }
    return WX.NEXT[state][0][0];
}
// Krok czasu: zwraca { flash: true, thunder: opóźnienie } w chwili uderzenia (inaczej pola false/null)
export function weatherStep(w, dt, rand) {
    const R = rand || Math.random, d = Math.min(Math.max(dt, 0), 0.5), ev = { flash: false, thunder: null };
    w.hold -= d; if (w.hold <= 0) { w.state = nextState(w.state, R); w.hold = between(R, WX.HOLD[w.state]); if (w.state === 'storm') w.bolt = between(R, [3, 8]); }
    const k = Math.min(1, WX.EASE * d), tr = WX.RAIN[w.state], tf = WX.FOG[w.state];
    w.rain += (tr - w.rain) * k * 2; w.fog += (tf - w.fog) * k;
    if (w.flash > 0) w.flash = Math.max(0, w.flash - d);
    if (w.state === 'storm') { w.bolt -= d; if (w.bolt <= 0) { w.bolt = between(R, WX.BOLT_GAP); w.flash = WX.FLASH; const delay = between(R, WX.THUNDER); w.thunder.push(delay); ev.flash = true; ev.thunder = delay; } }
    for (let i = w.thunder.length - 1; i >= 0; i--) { w.thunder[i] -= d; if (w.thunder[i] <= 0) w.thunder.splice(i, 1); }
    return ev;
}
// Siła błysku 0..1: jedna gładka górka (nigdy dwa piki)
export const flashLevel = (w) => w.flash > 0 ? Math.sin(Math.PI * (1 - w.flash / WX.FLASH)) : 0;
