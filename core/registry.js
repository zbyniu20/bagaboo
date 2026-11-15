// ==========================================
// REJESTR POZIOMÓW: jedno miejsce z listą wszystkich poziomów, gier i sal.
// Z tej listy korzystają: main.js (ładowanie i nazwy na ekranie ładowania), economy.js (rekordy i poziomy z trudnością,
// osiągnięcie Nightmare master), music.js (motyw), audio.js (pogłos), ambience.js (dźwięki 3D) oraz testy (tests/smoke.mjs). Plik jest czystymi danymi, bez importów.
//
// NOWY POZIOM = 1) plik levels/<id>.js, 2) wpis tutaj, 3) nazwa pliku w FILES w index.html (test tego pilnuje),
//   4) w tym samym wpisie: light, theme (muzyka), room (pogłos) i ambience (dźwięki 3D). Nowy preset światła/motyw muzyczny to osobne dane w config.js / music.js.
//
// Pola: id, name (ekran ładowania), kind ('hub' sala, 'level' poziom z drzwi LEVELS, 'game' tryb z salonu Games, 'virtual' tylko rekord),
//   light (preset z config.js; '@mode' = tryb oświetlenia lobby), extras (pliki doładowywane razem), path (domyślnie ./levels/<id>.js),
//   theme (motyw muzyczny z THEMES w music.js), room (pogłos: sec, wet), ambience (dźwięki 3D: loops i rand, jak w ambience.js),
//   rec (nazwa rekordu w tabeli; brak = bez rekordu), score (rekord to wynik, nie czas), diff (ma trudność Easy/Normal/Nightmare).
// ==========================================
export const LEVEL_DEFS = [
    { id: 'lobby', name: 'Lobby', kind: 'hub', light: '@mode', extras: ['./levels/lobby-door.js'], theme: 'calm', room: { sec: 1.5, wet: 0.12 } },
    { id: 'levels', name: 'Levels', kind: 'hub', light: 'levels', theme: 'dread', room: { sec: 1.6, wet: 0.16 }, ambience: { rand: [{ t: 'creak', e: [12, 24], d: [5, 12], v: 0.12 }] } },
    { id: 'games', name: 'BagaBoo Games', kind: 'hub', light: 'arcade', theme: 'arcade', room: { sec: 1.8, wet: 0.13 }, ambience: { rand: [{ t: 'blip', e: [0.5, 1.8], d: [4, 22], v: 0.16 }] } },
    { id: 'staff', name: 'Staff room', kind: 'hub', light: 'staff', theme: 'calm' },
    { id: 'wardrobe', name: 'Wardrobe', kind: 'hub', light: 'staff', theme: 'calm', room: { sec: 0.6, wet: 0.06 } },
    { id: 'maze', name: 'The Maze', kind: 'level', light: 'night', rec: 'The Maze', diff: true, theme: 'dread', room: { sec: 2.0, wet: 0.2 }, ambience: { rand: [{ t: 'creak', e: [7, 15], d: [15, 32], v: 0.18 }, { t: 'whisper', e: [28, 55], d: [8, 20], v: 0.5 }] } },
    { id: 'silence', name: 'Absolute Silence', kind: 'level', light: 'night', rec: 'Absolute Silence', diff: true, theme: 'dread', room: { sec: 3.2, wet: 0.26 }, ambience: { rand: [{ t: 'creak', e: [9, 18], d: [10, 22], v: 0.14 }] } },
    { id: 'well', name: 'The Well', kind: 'level', light: 'night', rec: 'The Well', diff: true, theme: 'dread', room: { sec: 3.6, wet: 0.32 }, ambience: { rand: [{ t: 'drip', e: [2, 5], d: [2, 6], v: 0.3 }, { t: 'creak', e: [10, 20], d: [6, 14], v: 0.18 }] } },
    { id: 'lava', name: 'Floor is Lava', kind: 'game', light: 'lava', rec: 'Floor is Lava', theme: 'lava', room: { sec: 2.2, wet: 0.16 }, ambience: { loops: [['crackle', [[0, 1, -8], [0, 1, -24], [0, 1, -40], [0, 1, -56]]]], rand: [{ t: 'thud', e: [9, 18], d: [10, 25], v: 0.28 }] } },
    { id: 'laundry', name: 'The Industrial Laundromat', kind: 'level', light: 'laundry', rec: 'Laundromat', diff: true, theme: 'industrial', room: { sec: 2.8, wet: 0.26 }, ambience: { loops: [['machine', [[-10, 2, -10], [10, 2, -22], [-10, 2, -36], [10, 2, -46]]]], rand: [{ t: 'thud', e: [4, 9], d: [8, 26], v: 0.35 }, { t: 'drip', e: [3, 7], d: [3, 12], v: 0.2 }] } },
    { id: 'memory', name: 'Burning Memory', kind: 'level', light: 'lava', rec: 'Burning Memory', diff: true, theme: 'lava', room: { sec: 2.4, wet: 0.2 }, ambience: { loops: [['crackle', [[-7, 1, -5], [7, 1, -20], [-7, 1, -35], [7, 1, -50]]]], rand: [{ t: 'thud', e: [8, 16], d: [10, 25], v: 0.3 }] } },
    { id: 'hospital', name: 'The Hospital', kind: 'level', light: 'hospital', rec: 'The Hospital', diff: true, theme: 'hospital', room: { sec: 2.6, wet: 0.24 }, ambience: { loops: [['hum', [[0, 3.2, -4], [0, 3.2, -13], [0, 3.2, -22], [0, 3.2, -31], [0, 3.2, -40]]]], rand: [{ t: 'drip', e: [3, 8], d: [3, 9], v: 0.25 }, { t: 'bang', e: [18, 40], d: [18, 30], v: 0.3 }, { t: 'creak', e: [10, 22], d: [6, 16], v: 0.15 }] } },
    { id: 'cemetery', name: 'The Cemetery', kind: 'level', light: 'cemetery', rec: 'The Cemetery', diff: true, theme: 'cemetery', room: { sec: 1.0, wet: 0.07 }, ambience: { loops: [['wind', null]], rand: [{ t: 'owl', e: [12, 25], d: [18, 34], v: 0.3 }, { t: 'bell', e: [30, 55], d: [25, 40], v: 0.35 }] } },
    { id: 'catacombs', name: 'The Catacombs', kind: 'level', light: 'catacombs', rec: 'The Catacombs', diff: true, theme: 'catacombs', room: { sec: 3.2, wet: 0.3 }, ambience: { loops: [['wind', null]], rand: [{ t: 'drip', e: [2, 5], d: [3, 12], v: 0.3 }, { t: 'creak', e: [6, 13], d: [8, 20], v: 0.2 }, { t: 'whisper', e: [18, 40], d: [3, 9], v: 0.45 }, { t: 'thud', e: [14, 30], d: [12, 28], v: 0.3 }] } },
    { id: 'route', kind: 'virtual', rec: 'Red route' },
    { id: 'race', name: 'Parkour Race', kind: 'game', light: 'arcade', rec: 'Parkour race', theme: 'arcade' },
    { id: 'redlight', name: 'Red Light, Green Light', kind: 'game', light: 'station', rec: 'Red Light, Green Light', theme: 'chase' },
    { id: 'swingrun', name: 'Swing Run', kind: 'game', light: 'arcade', rec: 'Swing Run', theme: 'arcade' },
    { id: 'towerclimb', name: 'Tower Climb', kind: 'game', light: 'night', rec: 'Tower Climb', theme: 'dread' },
    { id: 'lasttile', name: 'Last Tile', kind: 'game', light: 'arcade', rec: 'Last Tile (seconds)', score: true, theme: 'arcade' },
    { id: 'statues', name: 'Statues', kind: 'game', light: 'arcade', rec: 'Statues (silences)', score: true, theme: 'arcade' },
    { id: 'blindtag', name: 'Blind Tag', kind: 'game', light: 'hideseek', rec: 'Blind Tag (seconds)', score: true, theme: 'dread' },
    { id: 'range', name: 'Shooting Range', kind: 'game', light: 'night', rec: 'Shooting range (kills)', score: true, theme: 'arcade' },
    { id: 'monster', name: 'Become the Monster', kind: 'game', light: 'station', theme: 'chase' },
    { id: 'hideseek', name: 'Hide and Seek', kind: 'game', light: 'hideseek', theme: 'dread' },
    { id: 'banana', name: 'Capture the Banana', kind: 'game', light: 'station', theme: 'arcade' },
    { id: 'potato', name: 'Hot Potato', kind: 'game', light: 'station', theme: 'arcade' },
    { id: 'treasure', name: 'Treasure Hunt', kind: 'game', light: 'hideseek', theme: 'dread' },
    { id: 'koth', name: 'King of the Hill', kind: 'game', light: 'station', theme: 'arcade' },
    { id: 'infection', name: 'Infection', kind: 'game', light: 'station', theme: 'chase' },
    { id: 'dodgeball', name: 'Dodgeball', kind: 'game', light: 'station', theme: 'arcade' }
];

export const LEVEL_BY_ID = Object.fromEntries(LEVEL_DEFS.filter(d => d.kind !== 'virtual').map(d => [d.id, d]));
export const levelPath = (d) => d.path || './levels/' + d.id + '.js';
// Poziomy z trudnością (wszystkie dostają osiągnięcie nm_<id> i liczą się do Nightmare master)
export const DIFF_LEVEL_IDS = LEVEL_DEFS.filter(d => d.diff).map(d => d.id);
// Tabela rekordów: normalne, potem Nightmare (tylko poziomy z trudnością)
export const RECORD_DEFS = LEVEL_DEFS.filter(d => d.rec).map(d => ({ id: d.id, name: d.rec, score: d.score }))
    .concat(LEVEL_DEFS.filter(d => d.diff).map(d => ({ id: d.id + '_nm', name: d.rec.replace(/^(The |Burning )/, '').replace('Absolute ', '') + ' (Nightmare)' })));
