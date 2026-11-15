// ==========================================
// DYNAMICZNA MUZYKA (Web Audio, bez plików)
// Generatywna muzyka z motywem dla każdego typu poziomu (spokojny pokój, mroczny poziom, szpital, cmentarz, pralnia, lawa, salon gier,
// pościg). Warstwy: pad (akordy), pulsujący bas, arpeggio i napięte smyczki. Tempo i gęstość rosną z poziomem zagrożenia
// (audio.js: bicie serca, ryk, jumpscare), a przy jumpscare'ie muzyka na chwilę cichnie. Głośność = suwak Music w pauzie.
// ==========================================
import { getAudioContext, hooks, threatLevel } from './audio.js';
import { SETTINGS } from './settings.js';

const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
const SCALES = { minor: [0, 2, 3, 5, 7, 8, 10], phrygian: [0, 1, 3, 5, 7, 8, 10], pent: [0, 3, 5, 7, 10], majpent: [0, 2, 4, 7, 9], dim: [0, 2, 3, 5, 6, 8, 9] };
// root: nuta MIDI, bpm: tempo bazowe, pad: kształt fali pada, lp: filtr pada, arp: szansa na nutę arpeggia w kroku (ósemka),
// bass: czy bas pulsuje zawsze (poza tym tylko przy zagrożeniu), lead: kształt fali arpeggia
const THEMES = {
    calm: { root: 45, scale: 'pent', bpm: 60, pad: 'sine', lp: 1400, arp: 0.18, lead: 'triangle', bass: false, vol: 0.9 },
    dread: { root: 40, scale: 'phrygian', bpm: 54, pad: 'sawtooth', lp: 420, arp: 0.06, lead: 'sine', bass: false, vol: 1 },
    hospital: { root: 43, scale: 'dim', bpm: 50, pad: 'triangle', lp: 800, arp: 0.1, lead: 'sine', bass: false, vol: 1 },
    cemetery: { root: 38, scale: 'minor', bpm: 48, pad: 'sine', lp: 1000, arp: 0.09, lead: 'triangle', bass: false, vol: 1 },
    industrial: { root: 36, scale: 'phrygian', bpm: 78, pad: 'square', lp: 320, arp: 0.05, lead: 'sawtooth', bass: true, vol: 0.9 },
    lava: { root: 36, scale: 'minor', bpm: 66, pad: 'sawtooth', lp: 520, arp: 0.07, lead: 'square', bass: true, vol: 0.9 },
    arcade: { root: 55, scale: 'majpent', bpm: 112, pad: 'square', lp: 900, arp: 0.75, lead: 'square', bass: true, vol: 0.7 },
    chase: { root: 41, scale: 'phrygian', bpm: 96, pad: 'sawtooth', lp: 600, arp: 0.2, lead: 'sawtooth', bass: true, vol: 0.9 }
};
const LEVEL_THEME = { lobby: 'calm', wardrobe: 'calm', staff: 'calm', levels: 'dread', maze: 'dread', silence: 'dread', well: 'dread', laundry: 'industrial', memory: 'lava', lava: 'lava',
    hospital: 'hospital', cemetery: 'cemetery', games: 'arcade', range: 'arcade', banana: 'arcade', koth: 'arcade', dodgeball: 'arcade', race: 'arcade', monster: 'chase', infection: 'chase', hideseek: 'dread', redlight: 'chase', potato: 'arcade', lasttile: 'arcade', treasure: 'dread', statues: 'arcade', blindtag: 'dread', swingrun: 'arcade', towerclimb: 'dread' };
let theme = THEMES.calm, bus = null, nextT = 0, step = 0, deg = 0, muted = false;
const BASE = 0.32;   // głośność bazowa muzyki względem efektów

// Tryby, w których cisza jest częścią zasad (Statues, Blind Tag): chwilowe wyciszenie muzyki poziomu (ucina też brzmiące pady)
export function setMusicMute(on) { muted = !!on; if (bus) bus.gain.gain.setTargetAtTime(muted ? 0.0001 : BASE * SETTINGS.music, bus.ctx.currentTime, 0.04); }
export function setLevelMusic(levelId) { theme = THEMES[LEVEL_THEME[levelId] || 'calm']; step = 0; }

function ensureBus(ctx) {
    if (bus && bus.ctx === ctx) return bus;
    const g = ctx.createGain(); g.gain.value = BASE * SETTINGS.music; g.connect(ctx.destination);
    bus = { ctx: ctx, gain: g };
    return bus;
}
hooks.onVolumes = () => { if (bus) bus.gain.gain.setTargetAtTime(muted ? 0.0001 : BASE * SETTINGS.music, bus.ctx.currentTime, 0.1); };
hooks.onDuck = (t0) => { if (!bus) return; const g = bus.gain.gain; g.cancelScheduledValues(t0); g.setValueAtTime(BASE * SETTINGS.music * 0.12, t0); g.linearRampToValueAtTime(BASE * SETTINGS.music, t0 + 3); };

function note(ctx, t, freq, dur, wave, vol, lp, attack) {
    const o = ctx.createOscillator(), g = ctx.createGain(), f = ctx.createBiquadFilter();
    o.type = wave; o.frequency.value = freq; f.type = 'lowpass'; f.frequency.value = lp || 2000;
    const a = attack || 0.01;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + dur);
    o.connect(f); f.connect(g); g.connect(bus.gain); o.start(t); o.stop(t + a + dur + 0.05);
}
function thump(ctx, t, freq, vol) {
    const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(freq * 2, t); o.frequency.exponentialRampToValueAtTime(freq, t + 0.12);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
    o.connect(g); g.connect(bus.gain); o.start(t); o.stop(t + 0.35);
}

function scheduleStep(ctx, t, s, th, stepDur) {
    const T = theme, sc = SCALES[T.scale], root = T.root, v = T.vol;
    // Pad: nowy akord co 16 ósemek (trzy nuty skali, wolny atak)
    if (s % 16 === 0) {
        deg = (deg + [0, 2, 3, 1, 4][(Math.random() * 5) | 0]) % sc.length;
        for (const k of [0, 2, 4]) {
            const m = root + 12 + sc[(deg + k) % sc.length] + (((deg + k) >= sc.length) ? 12 : 0);
            note(ctx, t, mtof(m), stepDur * 14, T.pad, 0.07 * v, T.lp * (1 + th * 1.5), stepDur * 4);
            note(ctx, t, mtof(m) * 1.004, stepDur * 14, T.pad, 0.05 * v, T.lp * (1 + th * 1.5), stepDur * 4);   // lekkie rozstrojenie
        }
    }
    // Bas pulsujący: zawsze w motywach rytmicznych, w pozostałych tylko gdy rośnie zagrożenie
    const bassOn = T.bass ? 1 : th;
    if (bassOn > 0.1 && s % 2 === 0) thump(ctx, t, mtof(root - 12 + (s % 8 === 6 ? sc[2] : 0)), 0.35 * bassOn * v);
    if (th > 0.45 && s % 2 === 1) thump(ctx, t, mtof(root - 12), 0.18 * th);   // podwójne uderzenia przy zagrożeniu
    // Arpeggio / dzwonki
    if (Math.random() < T.arp * (1 + th * 0.8)) {
        const m = root + 24 + sc[(Math.random() * sc.length) | 0] + (Math.random() < 0.3 ? 12 : 0);
        note(ctx, t, mtof(m), stepDur * (T.lead === 'sine' || T.lead === 'triangle' ? 3 : 1.2), T.lead, 0.07 * v, 3000, 0.006);
    }
    // Smyczki napięcia: dysonans (półton) tremolo, gdy potwór jest blisko
    if (th > 0.5 && s % 8 === 0) {
        const m = root + 36;
        note(ctx, t, mtof(m), stepDur * 7, 'sawtooth', 0.05 * th, 1800, 0.25);
        note(ctx, t, mtof(m + 1), stepDur * 7, 'sawtooth', 0.04 * th, 1800, 0.25);
    }
}
function tick() {
    const ctx = getAudioContext();
    if (!ctx || ctx.state !== 'running' || SETTINGS.music <= 0.01) return;
    ensureBus(ctx);
    if (muted) { nextT = 0; return; }
    const th = threatLevel(), bpm = theme.bpm * (1 + th * 0.75), stepDur = 60 / bpm / 2;
    if (nextT < ctx.currentTime - 0.5 || nextT === 0) { nextT = ctx.currentTime + 0.1; }   // po przerwie (karta w tle) zaczynamy od nowa
    while (nextT < ctx.currentTime + 0.3) { scheduleStep(ctx, nextT, step, th, stepDur); nextT += stepDur; step++; }
}
setInterval(tick, 100);
