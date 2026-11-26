// ==========================================
// USTAWIENIA GRAFIKI I PRESETY OŚWIETLENIA
// ==========================================
import { SETTINGS } from './settings.js';

// Trzy poziomy jakości. Wybór w menu gry (pole Graphics), zapisany w ustawieniach gracza.
const QUALITY = {
    low: { lights: 5, muralRes: 1024, surfaceRes: 1024, shadowMap: 1024, mannequins: 6, dust: 250, chains: 10, leaves: 200, papers: 20, rubble: 100, shards: 30, xrScale: 0.9, foveation: 0.6, mirror: 384 },
    medium: { lights: 8, muralRes: 1024, surfaceRes: 1024, shadowMap: 2048, mannequins: 8, dust: 400, chains: 12, leaves: 320, papers: 30, rubble: 160, shards: 50, xrScale: 1.0, foveation: 0.45, mirror: 512 },
    high: { lights: 12, muralRes: 2048, surfaceRes: 2048, shadowMap: 4096, mannequins: 10, dust: 600, chains: 16, leaves: 450, papers: 40, rubble: 220, shards: 70, xrScale: 1.15, foveation: 0.3, mirror: 640 }
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
        background: 0x2a2a38, fogColor: 0x3a3444, fogDensity: 0.02, exposure: 1.5,   // jaśniej, jak w lobby (wcześniej 0.042 / 1.0)
        hemiSky: 0x9aa6cc, hemiGround: 0x4a3a36, hemiIntensity: 3.4,
        sunColor: 0xffffff, sunIntensity: 0, sunPos: [3, 60, 2],
        envIntensity: 0.35, bounce: 0,
        flashlight: { color: 0xfff0d8, intensity: 90, distance: 34, angle: 0.52, penumbra: 0.65, decay: 2 },
        flickers: [[-10, 16, -10, 0xff1a1a, 70, 24], [10, 16, -10, 0xff3010, 60, 24], [-10, 14, 10, 0x6a20ff, 55, 22], [10, 16, 10, 0xff1a1a, 65, 24], [-12, 2.5, -12, 0x30ff70, 22, 12]],
        bulbs: [], muralBase: 0.7, muralPulse: 0.25, trampBase: 0.6, trampPulse: 0.3, edgeOpacity: 0.35,
        dustColor: 0x7a6e64, dustOpacity: 0.5, mist: { color: 0x200a10, opacity: 0.25 },
        wallTint: 0xc8c8c8, floorTint: 0xc8c8c8, ceiling: 'concrete', shafts: false
    }
};
// Dodatkowe presety dla poziomów: lawa (pomarańczowa poświata od dołu) i pokój szefa (ciepłe światło)
LIGHT_PRESETS.lava = {
    background: 0x3a1a10, fogColor: 0x5a2a1a, fogDensity: 0.009, exposure: 1.55,
    hemiSky: 0xffb890, hemiGround: 0x6a3a2a, hemiIntensity: 3.4,
    sunColor: 0xff6a2a, sunIntensity: 0, sunPos: [0, 60, 0], envIntensity: 0.35, flashlight: null
};
LIGHT_PRESETS.staff = {
    background: 0x0c0806, fogColor: 0x0c0806, fogDensity: 0.006, exposure: 1.15,   // przyciemniony gabinet (meble były białe przez błąd odbić, teraz naprawiony)
    hemiSky: 0xe8c8a8, hemiGround: 0x3a2e24, hemiIntensity: 2.0,
    sunColor: 0xffffff, sunIntensity: 0, sunPos: [0, 60, 0], envIntensity: 0.4, flashlight: null
};
LIGHT_PRESETS.laundry = {
    background: 0x6a706a, fogColor: 0x6a706a, fogDensity: 0.085, exposure: 1.2,   // gęsta, brudna para: widać ok. 10-12 m
    hemiSky: 0xd0dcd8, hemiGround: 0x4a4644, hemiIntensity: 1.9,
    sunColor: 0xffffff, sunIntensity: 0, sunPos: [0, 60, 0], envIntensity: 0.4, flashlight: { color: 0xfff4e0, intensity: 70, distance: 22, angle: 0.5, penumbra: 0.7, decay: 2 }
};
LIGHT_PRESETS.station = {
    background: 0x20262e, fogColor: 0x2a3038, fogDensity: 0.01, exposure: 1.5,
    hemiSky: 0xb0c4e0, hemiGround: 0x5a5248, hemiIntensity: 3.4,
    sunColor: 0xffffff, sunIntensity: 0, sunPos: [0, 60, 0], envIntensity: 0.3, flashlight: null
};
LIGHT_PRESETS.levels = {
    background: 0x2a1614, fogColor: 0x3a2220, fogDensity: 0.012, exposure: 1.5,
    hemiSky: 0xffc0a0, hemiGround: 0x6a4440, hemiIntensity: 3.6,
    sunColor: 0xffffff, sunIntensity: 0, sunPos: [0, 60, 0], envIntensity: 0.5, flashlight: null
};
LIGHT_PRESETS.arcade = {
    background: 0x1c1628, fogColor: 0x241c34, fogDensity: 0.008, exposure: 1.5,
    hemiSky: 0xa088ff, hemiGround: 0x5a3a5a, hemiIntensity: 3.6,
    sunColor: 0xffffff, sunIntensity: 0, sunPos: [0, 60, 0], envIntensity: 0.5, flashlight: null
};
LIGHT_PRESETS.hideseek = {   // ciemny magazyn: każdy ma latarkę
    background: 0x20262e, fogColor: 0x2a3038, fogDensity: 0.012, exposure: 1.5,
    hemiSky: 0xa0b4d0, hemiGround: 0x504840, hemiIntensity: 3.6,
    sunColor: 0xffffff, sunIntensity: 0, sunPos: [0, 60, 0], envIntensity: 0.4,
    flashlight: { color: 0xfff0d8, intensity: 75, distance: 30, angle: 0.55, penumbra: 0.6, decay: 2 }
};
LIGHT_PRESETS.hospital = {   // szpital: zimne, zielonkawe światło i latarka (posągi ruszają się, gdy nie świecisz)
    background: 0x0e1414, fogColor: 0x182020, fogDensity: 0.016, exposure: 1.4,
    hemiSky: 0xb0d0d0, hemiGround: 0x384444, hemiIntensity: 2.6,
    sunColor: 0xffffff, sunIntensity: 0, sunPos: [0, 60, 0], envIntensity: 0.3,
    flashlight: { color: 0xf4fff8, intensity: 90, distance: 30, angle: 0.6, penumbra: 0.5, decay: 2 }
};
LIGHT_PRESETS.hotel = {   // hotel: ciemny, ciepły półmrok, gęsta mgła i latarka
    background: 0x050302, fogColor: 0x0c0806, fogDensity: 0.04, exposure: 1.3,
    hemiSky: 0xb08868, hemiGround: 0x2a1c14, hemiIntensity: 1.0,
    sunColor: 0xffffff, sunIntensity: 0, sunPos: [0, 60, 0], envIntensity: 0.15,
    flashlight: { color: 0xfff0d0, intensity: 80, distance: 18, angle: 0.5, penumbra: 0.7, decay: 2 }
};
LIGHT_PRESETS.nursery = {   // pokój dziecięcy: ciepły półmrok, lekka mgła i latarka
    background: 0x140a08, fogColor: 0x20140e, fogDensity: 0.03, exposure: 1.35,
    hemiSky: 0xd0a888, hemiGround: 0x4a3028, hemiIntensity: 1.5,
    sunColor: 0xffffff, sunIntensity: 0, sunPos: [0, 60, 0], envIntensity: 0.2,
    flashlight: { color: 0xfff0d8, intensity: 85, distance: 22, angle: 0.55, penumbra: 0.65, decay: 2 }
};
LIGHT_PRESETS.catacombs = {   // katakumby: prawie całkowita ciemność, gęsta mgła i słaba latarka
    background: 0x030303, fogColor: 0x060504, fogDensity: 0.05, exposure: 1.3,
    hemiSky: 0x806050, hemiGround: 0x201814, hemiIntensity: 0.9,
    sunColor: 0xffffff, sunIntensity: 0, sunPos: [0, 60, 0], envIntensity: 0.15,
    flashlight: { color: 0xfff0d0, intensity: 80, distance: 20, angle: 0.5, penumbra: 0.7, decay: 2 }
};
LIGHT_PRESETS.mine = {   // kopalnia: ciemna jaskinia z ciepłymi lampami i zimnymi kryształami, kurz w powietrzu
    background: 0x070504, fogColor: 0x1a1109, fogDensity: 0.022, exposure: 1.5,
    hemiSky: 0x9a8268, hemiGround: 0x3a2c1e, hemiIntensity: 1.25,
    sunColor: 0xffffff, sunIntensity: 0, sunPos: [0, 60, 0], envIntensity: 0.15,
    flashlight: { color: 0xfff0d0, intensity: 85, distance: 26, angle: 0.5, penumbra: 0.7, decay: 2 }
};
LIGHT_PRESETS.room000 = {   // Room 000: opuszczone więzienie, prawie zupełna ciemność, zimna mgła i bardzo słaba latarka
    background: 0x010101, fogColor: 0x030304, fogDensity: 0.07, exposure: 1.15,
    hemiSky: 0x504860, hemiGround: 0x141218, hemiIntensity: 0.45,
    sunColor: 0xffffff, sunIntensity: 0, sunPos: [0, 60, 0], envIntensity: 0.1,
    flashlight: { color: 0xe8ecff, intensity: 65, distance: 15, angle: 0.45, penumbra: 0.75, decay: 2 }
};
LIGHT_PRESETS.cemetery = {   // cmentarz nocą: błękitny księżyc, mgła i latarka
    background: 0x0c1218, fogColor: 0x1c2630, fogDensity: 0.022, exposure: 1.45,
    hemiSky: 0x90a8d0, hemiGround: 0x30403a, hemiIntensity: 2.8,
    sunColor: 0xffffff, sunIntensity: 0, sunPos: [0, 60, 0], envIntensity: 0.3,
    flashlight: { color: 0xfff0d8, intensity: 90, distance: 30, angle: 0.6, penumbra: 0.6, decay: 2 }
};
// ---------- ROLE I ZASTRZEŻONE NICKI ----------
// Ultimate admin: uprawnienia admina, złota postać 2 razy większa, jako jedyny może zbanować admina.
// Admin ma wszystkie uprawnienia. Moderatorzy: wejście do pokoju szefa, młotki, wyrzucanie i bany (poza adminem).
export const ULTIMATE_NAMES = ['zbyniu'];
export const ADMIN_NAMES = ['BoyIsGamer'];
export const COADMIN_NAMES = ['spikyvr'];   // co-admin: uprawnienia admina, własny napis CO-ADMIN i odznaka
export const OWNER_NAMES = ['BoyIsGamer'];   // właściciel gry: napis OWNER nad głową i odznaka Owner
export const FURAS_NAMES = ['BoyIsGamer'];   // ranga FURAS: napis FURAS nad głową, odznaka z kotkiem i skórka Furas (maska kota + puchaty ogon); sama ranga nie daje żadnych uprawnień
export const THERIAN_NAMES = ['spikyvr'];   // skórka Therian (uszy królika, kitka i marchewka): odblokowana tylko dla tych nicków; zwykła skórka, bez uprawnień
export const MOD_NAMES = ['lincolnvr', 'Luna', 'BoyIsGamer'];   // BoyIsGamer: właściciel + admin + moderator (wszystkie trzy napisy nad głową i odznaki)
const low = (n) => String(n || '').trim().toLowerCase();
// BagaBooModMenu (core/modmenu.js): sekretne menu admina, otwierane przytrzymaniem B przez 5 s. Mają je tylko te konta (po nicku zweryfikowanym przez serwer kont).
export const MODMENU_NAMES = ['zbyniu', 'BoyIsGamer', 'spikyvr'];
const MODMENU_SET = new Set(MODMENU_NAMES.map(low));
export function isModMenuUser(name) { return MODMENU_SET.has(low(name)); }
// Zastrzeżone nicki (stała ekipa): grać pod nimi może tylko zalogowane konto o tym nicku (core/auth.js).
// Host nie wpuści gościa z takim nickiem bez dowodu z serwera kont (core/network.js). Konta ekipy zakłada admin w bazie (bagaboo-api, ADMIN_KEY).
export const RESERVED_NICKS = new Set([...ULTIMATE_NAMES, ...ADMIN_NAMES, ...COADMIN_NAMES, ...OWNER_NAMES, ...MOD_NAMES, ...FURAS_NAMES].map(low));
// Logowanie (konto z hasłem na serwerze albo klucz ekipy z PIN-em, core/staffkey.js) jest WŁĄCZONE, ale obowiązkowe tylko dla nicków z `RESERVED_NICKS`
// (ekipa): bez hasła albo PIN-u nikt nie wejdzie pod takim nickiem. Zwykły gracz wpisuje nick i gra bez konta. `accounts: false` wyłącza całe logowanie
// (wtedy nicki ekipy są po prostu zablokowane dla wszystkich).
export const FEATURES = { accounts: true };
// Klucze PUBLICZNE ekipy (core/staffkey.js): nick małymi literami -> JWK { kty:'EC', crv:'P-256', x, y }. Klucz prywatny zostaje na urządzeniu admina.
// Nowy admin tworzy klucz w grze (Account -> Staff key), przekazuje właścicielowi tekst klucza publicznego, a ten dopisuje go tutaj.
export const STAFF_KEYS = {
    boyisgamer: { kty: 'EC', crv: 'P-256', x: 'vdU9ODlL8hhtSAMpW8GO3UlDRchLfXvOZHcWlL6ecT4', y: 'sS_wcQ38QNGixqMF81UhTyc0Rv7kV8Uw67GxTZiEWe8' },
};
// Moderatorzy wybrani przez admina w grze (zapisani na tym urządzeniu)
export function localMods() { try { return JSON.parse(localStorage.getItem('bagaboo_mods')) || []; } catch (e) { return []; } }
export function setLocalMod(name, on) {
    const list = localMods().filter(n => n !== low(name));
    if (on) list.push(low(name));
    try { localStorage.setItem('bagaboo_mods', JSON.stringify(list)); } catch (e) {}
}
// Odznaki ekipy, które dany nick może założyć. Ultimate admin ma wszystkie, właściciel (BoyIsGamer) Owner i Admin.
export function staffBadgesFor(name) {
    if (isUltimateName(name)) return ['owner', 'ultimate', 'coadmin', 'admin', 'mod'];
    const out = [];
    if (isOwnerName(name)) out.push('owner');
    if (isCoAdminName(name)) out.push('coadmin');
    if (isAdminName(name)) out.push('admin');
    if (isModName(name)) out.push('mod');
    if (isFurasName(name)) out.push('furas');
    return out;
}
export function isTherianName(name) { return THERIAN_NAMES.some(n => low(n) === low(name)); }
export function isFurasName(name) { return FURAS_NAMES.some(n => low(n) === low(name)); }
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
// Wszystkie napisy roli nad głową, od najwyższej: właściciel z adminem i moderatorem (BoyIsGamer) ma OWNER, ADMIN, MODERATOR i FURAS naraz.
// Ultimate admin i co-admin zostają przy jednym napisie jak dotąd.
// Każdy napis ma id (owner / admin / mod / ultimate / coadmin / furas), po którym gracz wybiera w Gorilla Machine, które z nich pokazać.
export function roleTagsFor(name) {
    if (isUltimateName(name)) return [Object.assign({ id: 'ultimate' }, roleTagFor(name))];
    const out = [], base = roleTagFor(name);
    if (isOwnerName(name)) out.push(Object.assign({ id: 'owner' }, base));   // OWNER
    else if (base) out.push(Object.assign({ id: isCoAdminName(name) ? 'coadmin' : (isModName(name) && !isAdminName(name) ? 'mod' : 'admin') }, base));
    if (isOwnerName(name) && ADMIN_NAMES.some(n => low(n) === low(name))) out.push({ id: 'admin', text: 'ADMIN', color: '#ff8a5a', glow: '#ff4a10' });
    if (isOwnerName(name) && isModName(name)) out.push({ id: 'mod', text: 'MODERATOR', color: '#8ab8ff', glow: '#3a6aff' });
    if (isFurasName(name)) out.push({ id: 'furas', text: 'FURAS', color: '#ffb8e0', glow: '#ff5ab8' });   // ranga FURAS, najniżej pod rolami ekipy
    return out;
}
// Ranga: 4 ultimate admin (zbyniu), 3 właściciel (BoyIsGamer), 2 admin / co-admin, 1 moderator, 0 gracz.
// Wyrzucić / zbanować można tylko kogoś z niższą rangą, więc właściciel może wszystko poza ultimate adminem.
export function rankOf(name) { return isUltimateName(name) ? 4 : (isOwnerName(name) ? 3 : (isAdminName(name) ? 2 : (isModName(name) ? 1 : 0))); }
export function isModName(name) { return MOD_NAMES.some(n => low(n) === low(name)) || localMods().includes(low(name)); }
export function isStaffName(name) { return isAdminName(name) || isModName(name); }
export function isReservedNick(name) { return RESERVED_NICKS.has(low(name)); }
// Kto może wyrzucić / zbanować kogo: ekipa (admin, moderator) nawzajem nie, tylko ultimate admin (zbyniu) może każdego (poza sobą)
export function canPunish(byName, targetName) {
    const by = rankOf(byName), target = rankOf(targetName);
    if (by === 0) return false;
    if (by >= 4) return target < 4;
    return target === 0;
}
// Zwiększ tę liczbę, a przy następnym wejściu każde urządzenie zdejmuje wszystkie bany i listy odbanowań
export const BANS_CLEARED = 1;
export const LIGHT_MODE = 'dusk';
export const LP = LIGHT_PRESETS[LIGHT_MODE];

// Mnożnik ruchu napędzanego dłońmi w lobby, Games i garderobie (poziomy z własnym ruchem ustawiają swoje wartości)
export const LOBBY_MOVE_SCALE = 1.15;
// PACE: ruch gracza we WSZYSTKICH poziomach jest taki jak w lobby (L.moveScale = LOBBY_MOVE_SCALE ustawia clearLevel), więc prędkości potworów i progi hałasu
// liczone względem prędkości ciała gracza mnożymy przez PACE (stałe w poziomach zapisane jako baza * PACE). Wyjątek: poziomy z limitami prędkości gracza (lava, memory, wyścig własny).
export const PACE = LOBBY_MOVE_SCALE;
