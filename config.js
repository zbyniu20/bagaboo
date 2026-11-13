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
    background: 0x1e0805, fogColor: 0x4a1608, fogDensity: 0.015, exposure: 1.35,
    hemiSky: 0xffa070, hemiGround: 0x3a1208, hemiIntensity: 1.7,
    sunColor: 0xff6a2a, sunIntensity: 0, sunPos: [0, 60, 0], envIntensity: 0, flashlight: null
};
LIGHT_PRESETS.staff = {
    background: 0x1a120c, fogColor: 0x1a120c, fogDensity: 0.004, exposure: 1.0,
    hemiSky: 0xffe0c0, hemiGround: 0x3a2a20, hemiIntensity: 1.3,
    sunColor: 0xffffff, sunIntensity: 0, sunPos: [0, 60, 0], envIntensity: 0.4, flashlight: null
};
LIGHT_PRESETS.laundry = {
    background: 0x6a706a, fogColor: 0x6a706a, fogDensity: 0.085, exposure: 0.95,   // gęsta, brudna para: widać ok. 10-12 m
    hemiSky: 0xb8c4c0, hemiGround: 0x2a2624, hemiIntensity: 0.85,
    sunColor: 0xffffff, sunIntensity: 0, sunPos: [0, 60, 0], envIntensity: 0.4, flashlight: { color: 0xfff4e0, intensity: 40, distance: 18, angle: 0.5, penumbra: 0.7, decay: 2 }
};
LIGHT_PRESETS.station = {
    background: 0x0a0c10, fogColor: 0x10141a, fogDensity: 0.02, exposure: 1.15,
    hemiSky: 0x9ab0d0, hemiGround: 0x2a2620, hemiIntensity: 1.2,
    sunColor: 0xffffff, sunIntensity: 0, sunPos: [0, 60, 0], envIntensity: 0.3, flashlight: null
};
LIGHT_PRESETS.levels = {
    background: 0x0c0606, fogColor: 0x140808, fogDensity: 0.03, exposure: 1.1,
    hemiSky: 0xffb090, hemiGround: 0x200808, hemiIntensity: 0.9,
    sunColor: 0xffffff, sunIntensity: 0, sunPos: [0, 60, 0], envIntensity: 0.3, flashlight: null
};
LIGHT_PRESETS.arcade = {
    background: 0x08060c, fogColor: 0x0c0814, fogDensity: 0.012, exposure: 1.1,
    hemiSky: 0x8a6aff, hemiGround: 0x200a20, hemiIntensity: 0.9,
    sunColor: 0xffffff, sunIntensity: 0, sunPos: [0, 60, 0], envIntensity: 0.3, flashlight: null
};
// ---------- ROLE I ZASTRZEŻONE NICKI ----------
// Ultimate admin: uprawnienia admina, złota postać 2 razy większa, jako jedyny może zbanować admina.
// Admin ma wszystkie uprawnienia. Moderatorzy: wejście do pokoju szefa, młotki, wyrzucanie i bany (poza adminem).
export const ULTIMATE_NAMES = ['zbyniu'];
export const ADMIN_NAMES = ['BoyIsGamer'];
export const COADMIN_NAMES = ['spikyvr'];   // co-admin: uprawnienia admina, własny napis CO-ADMIN i odznaka
export const OWNER_NAMES = ['BoyIsGamer'];   // właściciel gry: napis OWNER nad głową i odznaka Owner
export const MOD_NAMES = ['lincolnvr'];
// Zastrzeżone nicki: żeby grać pod tym nickiem, trzeba podać hasło na stronie startowej.
// Wartość to skrót SHA-256 z tekstu "bagaboo:" + nick małymi literami + ":" + hasło.
// Nowy skrót wygenerujesz narzędziem na stronie z plikami do wgrania (sekcja "Hasła do nicków").
export const RESERVED_NICKS = {
    'boyisgamer': 'c511d81e82b67718a164546ec9e98845084e8793ba2af30298093f32a3baba15',
    'spikyvr': '01d78f02137245bfe78f82dc4989497d94b5b8ec4ec41cde4e65a8905a32071c',
    'zbyniu': 'feed385a1982fea19f574cc0e867a3d9f7a7e8e5dcd35c68f2676bc64c49868e',
    'lincolnvr': '5cdeaae62ff9bb4a7884d64ad076deceae01d21c8492d1dbd54f0f0bfe070f88'
};
const low = (n) => String(n || '').trim().toLowerCase();
// Moderatorzy wybrani przez admina w grze (zapisani na tym urządzeniu)
export function localMods() { try { return JSON.parse(localStorage.getItem('bagaboo_mods')) || []; } catch (e) { return []; } }
export function setLocalMod(name, on) {
    const list = localMods().filter(n => n !== low(name));
    if (on) list.push(low(name));
    try { localStorage.setItem('bagaboo_mods', JSON.stringify(list)); } catch (e) {}
}
export function isOwnerName(name) { return OWNER_NAMES.some(n => low(n) === low(name)); }
export function isUltimateName(name) { return ULTIMATE_NAMES.some(n => low(n) === low(name)); }
export function isCoAdminName(name) { return COADMIN_NAMES.some(n => low(n) === low(name)); }
export function isAdminName(name) { return isUltimateName(name) || isCoAdminName(name) || ADMIN_NAMES.some(n => low(n) === low(name)); }
// Napis z rolą nad głową (null = brak). Gracz z ekipy może go ukryć w pokoju szefa.
export function roleTagFor(name) {
    if (isUltimateName(name)) return { text: 'ULTIMATE ADMIN', color: '#ffe070', glow: '#ffb000' };
    if (isOwnerName(name)) return { text: 'OWNER', color: '#ff5a7a', glow: '#ff1a40' };
    if (isCoAdminName(name)) return { text: 'CO-ADMIN', color: '#5af0ff', glow: '#00b0ff' };
    if (isAdminName(name)) return { text: 'ADMIN', color: '#ff8a5a', glow: '#ff4a10' };
    if (isModName(name)) return { text: 'MODERATOR', color: '#8ab8ff', glow: '#3a6aff' };
    return null;
}
// Ranga: 4 ultimate admin (zbyniu), 3 właściciel (BoyIsGamer), 2 admin / co-admin, 1 moderator, 0 gracz.
// Wyrzucić / zbanować można tylko kogoś z niższą rangą, więc właściciel może wszystko poza ultimate adminem.
export function rankOf(name) { return isUltimateName(name) ? 4 : (isOwnerName(name) ? 3 : (isAdminName(name) ? 2 : (isModName(name) ? 1 : 0))); }
export function isModName(name) { return MOD_NAMES.some(n => low(n) === low(name)) || localMods().includes(low(name)); }
export function isStaffName(name) { return isAdminName(name) || isModName(name); }
export function isReservedNick(name) { return Object.prototype.hasOwnProperty.call(RESERVED_NICKS, low(name)); }
export async function checkNickPassword(name, password) {
    const hash = RESERVED_NICKS[low(name)]; if (!hash) return true;
    const data = new TextEncoder().encode('bagaboo:' + low(name) + ':' + String(password || ''));
    const buf = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('') === hash;
}
export const LIGHT_MODE = 'dusk';
export const LP = LIGHT_PRESETS[LIGHT_MODE];
