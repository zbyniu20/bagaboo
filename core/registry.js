// ==========================================
// REJESTR POZIOMÓW: jedno miejsce z listą wszystkich poziomów, gier i sal.
// Z tej listy korzystają: main.js (ładowanie i nazwy na ekranie ładowania), economy.js (rekordy i poziomy z trudnością,
// osiągnięcie Nightmare master) oraz testy (tests/smoke.mjs). Plik jest czystymi danymi, bez importów.
//
// NOWY POZIOM = 1) plik levels/<id>.js, 2) wpis tutaj, 3) nazwa pliku w FILES w index.html (test tego pilnuje),
//   4) tylko jeśli ma być w innym miejscu: preset światła w config.js, muzyka (music.js), ambient (ambience.js), pogłos (audio.js).
//
// Pola: id, name (ekran ładowania), kind ('hub' sala, 'level' poziom z drzwi LEVELS, 'game' tryb z salonu Games, 'virtual' tylko rekord),
//   light (preset z config.js; '@mode' = tryb oświetlenia lobby), extras (pliki doładowywane razem), path (domyślnie ./levels/<id>.js),
//   rec (nazwa rekordu w tabeli; brak = bez rekordu), score (rekord to wynik, nie czas), diff (ma trudność Easy/Normal/Nightmare).
// ==========================================
export const LEVEL_DEFS = [
    { id: 'lobby', name: 'Lobby', kind: 'hub', light: '@mode', extras: ['./levels/lobby-door.js'] },
    { id: 'levels', name: 'Levels', kind: 'hub', light: 'levels' },
    { id: 'games', name: 'BagaBoo Games', kind: 'hub', light: 'arcade' },
    { id: 'staff', name: 'Staff room', kind: 'hub', light: 'staff' },
    { id: 'wardrobe', name: 'Wardrobe', kind: 'hub', light: 'staff' },
    { id: 'maze', name: 'The Maze', kind: 'level', light: 'night', rec: 'The Maze', diff: true },
    { id: 'silence', name: 'Absolute Silence', kind: 'level', light: 'night', rec: 'Absolute Silence', diff: true },
    { id: 'well', name: 'The Well', kind: 'level', light: 'night', rec: 'The Well', diff: true },
    { id: 'lava', name: 'Floor is Lava', kind: 'game', light: 'lava', rec: 'Floor is Lava' },
    { id: 'laundry', name: 'The Industrial Laundromat', kind: 'level', light: 'laundry', rec: 'Laundromat', diff: true },
    { id: 'memory', name: 'Burning Memory', kind: 'level', light: 'lava', rec: 'Burning Memory', diff: true },
    { id: 'hospital', name: 'The Hospital', kind: 'level', light: 'hospital', rec: 'The Hospital', diff: true },
    { id: 'cemetery', name: 'The Cemetery', kind: 'level', light: 'cemetery', rec: 'The Cemetery', diff: true },
    { id: 'catacombs', name: 'The Catacombs', kind: 'level', light: 'catacombs', rec: 'The Catacombs', diff: true },
    { id: 'route', kind: 'virtual', rec: 'Red route' },
    { id: 'race', name: 'Parkour Race', kind: 'game', light: 'arcade', rec: 'Parkour race' },
    { id: 'redlight', name: 'Red Light, Green Light', kind: 'game', light: 'station', rec: 'Red Light, Green Light' },
    { id: 'swingrun', name: 'Swing Run', kind: 'game', light: 'arcade', rec: 'Swing Run' },
    { id: 'towerclimb', name: 'Tower Climb', kind: 'game', light: 'night', rec: 'Tower Climb' },
    { id: 'lasttile', name: 'Last Tile', kind: 'game', light: 'arcade', rec: 'Last Tile (seconds)', score: true },
    { id: 'statues', name: 'Statues', kind: 'game', light: 'arcade', rec: 'Statues (silences)', score: true },
    { id: 'blindtag', name: 'Blind Tag', kind: 'game', light: 'hideseek', rec: 'Blind Tag (seconds)', score: true },
    { id: 'range', name: 'Shooting Range', kind: 'game', light: 'night', rec: 'Shooting range (kills)', score: true },
    { id: 'monster', name: 'Become the Monster', kind: 'game', light: 'station' },
    { id: 'hideseek', name: 'Hide and Seek', kind: 'game', light: 'hideseek' },
    { id: 'banana', name: 'Capture the Banana', kind: 'game', light: 'station' },
    { id: 'potato', name: 'Hot Potato', kind: 'game', light: 'station' },
    { id: 'treasure', name: 'Treasure Hunt', kind: 'game', light: 'hideseek' },
    { id: 'koth', name: 'King of the Hill', kind: 'game', light: 'station' },
    { id: 'infection', name: 'Infection', kind: 'game', light: 'station' },
    { id: 'dodgeball', name: 'Dodgeball', kind: 'game', light: 'station' }
];

export const LEVEL_BY_ID = Object.fromEntries(LEVEL_DEFS.filter(d => d.kind !== 'virtual').map(d => [d.id, d]));
export const levelPath = (d) => d.path || './levels/' + d.id + '.js';
// Poziomy z trudnością (wszystkie dostają osiągnięcie nm_<id> i liczą się do Nightmare master)
export const DIFF_LEVEL_IDS = LEVEL_DEFS.filter(d => d.diff).map(d => d.id);
// Tabela rekordów: normalne, potem Nightmare (tylko poziomy z trudnością)
export const RECORD_DEFS = LEVEL_DEFS.filter(d => d.rec).map(d => ({ id: d.id, name: d.rec, score: d.score }))
    .concat(LEVEL_DEFS.filter(d => d.diff).map(d => ({ id: d.id + '_nm', name: d.rec.replace(/^(The |Burning )/, '').replace('Absolute ', '') + ' (Nightmare)' })));
