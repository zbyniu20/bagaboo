// ==========================================
// USTAWIENIA GRAFIKI I PRESETY OŚWIETLENIA
// ==========================================
import { SETTINGS } from './settings.js';

// Trzy poziomy jakości. Wybór w menu gry (pole Graphics), zapisany w ustawieniach gracza.
const QUALITY = {
    low: { muralRes: 1024, surfaceRes: 1024, shadowMap: 1024, mannequins: 6, dust: 250, chains: 10, leaves: 200, papers: 20, rubble: 100, shards: 30, xrScale: 0.9, foveation: 0.6, mirror: 384 },
    medium: { muralRes: 1024, surfaceRes: 1024, shadowMap: 2048, mannequins: 8, dust: 400, chains: 12, leaves: 320, papers: 30, rubble: 160, shards: 50, xrScale: 1.0, foveation: 0.45, mirror: 512 },
    high: { muralRes: 2048, surfaceRes: 2048, shadowMap: 4096, mannequins: 10, dust: 600, chains: 16, leaves: 450, papers: 40, rubble: 220, shards: 70, xrScale: 1.15, foveation: 0.3, mirror: 640 }
};
// muralRes: murale, surfaceRes: ściany i podłoga, shadowMap: cienie słońca, xrScale: ostrość w goglach,
// foveation: rozmycie brzegów obrazu (więcej = szybciej), mirror: rozdzielczość lustra
export const GFX = Object.assign({}, QUALITY[SETTINGS.quality] || QUALITY.medium);

// LIGHT_MODE: 'dusk' (zachód słońca / szarówka), 'overcast' (pochmurny dzień), 'night' (nocny horror)
export const LIGHT_PRESETS = {
    dusk: {
        background: 0x3a3c4c, fogColor: 0x5a5466, fogDensity: 0.02, exposure: 0.95,
        hemiSky: 0x7f8bb0, hemiGround: 0x3a2a26, hemiIntensity: 1.6,
        sunColor: 0xff9550, sunIntensity: 3.2, sunPos: [-48, 31, -17],
        envIntensity: 0.35, bounce: 25, flashlight: null, flickers: [],
        bulbs: [[-11, 13, 4, 0xffa860, 26, 15], [10, 12.5, -9, 0xffa860, 24, 15], [-2, 13.5, 11, 0xff9a50, 22, 14]],
        muralBase: 0.35, muralPulse: 0.1, trampBase: 0.45, trampPulse: 0.25, edgeOpacity: 0.16,
        dustColor: 0xffc49a, dustOpacity: 0.55, mist: { color: 0xa898a8, opacity: 0.22 },
        wallTint: 0xe0dde0, floorTint: 0xd8d6d8, ceiling: 'sky',
        sky: {
            base: [[0, '#e08a52'], [0.18, '#c46e5a'], [0.45, '#7a5f7e'], [0.75, '#4a4f6e'], [1, '#2f3550']], sunGlow: true,
            clouds: [['40,32,48', 80, 90, 260, 0.22, 0.36], ['255,160,110', 70, 50, 170, 0.16, 0.3], ['120,90,120', 60, 30, 110, 0.1, 0.18]]
        },
        shafts: true, shaftColor: 0xffa070, shaftOpacity: 0.12
    },
    overcast: {
        background: 0xaeb8bf, fogColor: 0xaeb8bf, fogDensity: 0.012, exposure: 1.1,
        hemiSky: 0xe3eaee, hemiGround: 0x716b64, hemiIntensity: 3.0,
        sunColor: 0xf6f8fa, sunIntensity: 2.4, sunPos: [3, 60, 2],
        envIntensity: 1.0, bounce: 0, flashlight: null, flickers: [], bulbs: [],
        muralBase: 0.22, muralPulse: 0.05, trampBase: 0.4, trampPulse: 0.2, edgeOpacity: 0.12,
        dustColor: 0xd8d2c8, dustOpacity: 0.6, mist: { color: 0xd0d6da, opacity: 0.15 },
        wallTint: 0xffffff, floorTint: 0xffffff, ceiling: 'sky',
        sky: {
            base: [[0, '#c3ccd2'], [0.5, '#d5dbdf'], [1, '#bcc6cc']], sunGlow: false,
            clouds: [['96,106,116', 70, 90, 310, 0.16, 0.28], ['250,252,255', 110, 60, 250, 0.2, 0.4], ['70,78,88', 60, 30, 120, 0.08, 0.16]]
        },
        shafts: true, shaftColor: 0xdfe8ee, shaftOpacity: 0.17
    },
    night: {
        background: 0x020103, fogColor: 0x050204, fogDensity: 0.042, exposure: 1.2,
        hemiSky: 0x2a3350, hemiGround: 0x180808, hemiIntensity: 1.0,
        sunColor: 0xffffff, sunIntensity: 0, sunPos: [3, 60, 2],
        envIntensity: 0, bounce: 0,
        flashlight: { color: 0xfff0d8, intensity: 90, distance: 34, angle: 0.52, penumbra: 0.65, decay: 2 },
        flickers: [[-10, 16, -10, 0xff1a1a, 70, 24], [10, 16, -10, 0xff3010, 60, 24], [-10, 14, 10, 0x6a20ff, 55, 22], [10, 16, 10, 0xff1a1a, 65, 24], [-12, 2.5, -12, 0x30ff70, 22, 12]],
        bulbs: [], muralBase: 0.7, muralPulse: 0.25, trampBase: 0.6, trampPulse: 0.3, edgeOpacity: 0.35,
        dustColor: 0x7a6e64, dustOpacity: 0.5, mist: { color: 0x200a10, opacity: 0.25 },
        wallTint: 0xc8c8c8, floorTint: 0xc8c8c8, ceiling: 'concrete', shafts: false
    }
};
// Dodatkowe presety dla poziomów: lawa (pomarańczowa poświata od dołu) i pokój szefa (ciepłe światło)
LIGHT_PRESETS.lava = {
    background: 0x140303, fogColor: 0x3a0c04, fogDensity: 0.022, exposure: 1.15,
    hemiSky: 0xff7a3a, hemiGround: 0x2a0804, hemiIntensity: 0.9,
    sunColor: 0xff6a2a, sunIntensity: 0, sunPos: [0, 60, 0], envIntensity: 0, flashlight: null
};
LIGHT_PRESETS.staff = {
    background: 0x1a120c, fogColor: 0x1a120c, fogDensity: 0.004, exposure: 1.0,
    hemiSky: 0xffe0c0, hemiGround: 0x3a2a20, hemiIntensity: 1.3,
    sunColor: 0xffffff, sunIntensity: 0, sunPos: [0, 60, 0], envIntensity: 0.4, flashlight: null
};
export const LIGHT_MODE = 'dusk';
export const LP = LIGHT_PRESETS[LIGHT_MODE];
