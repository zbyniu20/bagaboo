// ==========================================
// MODELE POTWORÓW Z PLIKÓW GLB: CZYSTA LOGIKA (dobór animacji po nazwach, skala, stan ruchu).
// Bez THREE: testy w tests/logic.mjs. Ładowaniem i miksowaniem zajmuje się core/glbmonster.js.
// Plik modelu: assets/monsters/<nazwa>.glb (w paczce z Vite: monsters/<nazwa>.glb); brak pliku = poziom zostaje przy proceduralnym manekinie.
// ==========================================
// Model potwora w trybie Become the Monster: wysokość docelowa (m) i poprawka obrotu (rad), gdy model nie patrzy w +Z
export const MONSTERS = { monster: { file: 'monster.glb', height: 2.3, yaw: 0 } };
export const MAX_BYTES = 6 * 1024 * 1024;   // większy plik to za dużo dla Quest 3S: nie ładujemy
export const MAX_TRIS = 40000;
// Role animacji i ich możliwe nazwy w pliku (małe litery, fragment nazwy wystarcza)
const ROLES = { idle: ['idle', 'stand', 'breath', 'wait'], walk: ['walk', 'creep', 'stalk', 'move'], run: ['run', 'sprint', 'chase', 'charge'], attack: ['attack', 'bite', 'swipe', 'slash', 'hit', 'punch'] };
const FALLBACK = { idle: ['idle', 'walk'], walk: ['walk', 'run', 'idle'], run: ['run', 'walk', 'idle'], attack: ['attack', 'run', 'walk', 'idle'] };
// Nazwa klipu dla roli: dokładna rola, potem zamienniki; ostatecznie pierwszy klip (null, gdy modelu bez animacji)
export function pickClip(names, role) {
    if (!Array.isArray(names) || !names.length) return null;
    const low = names.map(n => String(n).toLowerCase());
    for (const r of FALLBACK[role] || [role]) {
        for (const key of ROLES[r] || [r]) { const i = low.findIndex(n => n.includes(key)); if (i >= 0) return names[i]; }
    }
    return names[0];
}
// Rola animacji z prędkości (m/s) i pościgu: stoi, skrada się, biegnie
export function stateRole(speed, chasing) {
    if (!(speed > 0.15)) return 'idle';
    return chasing || speed > 3.2 ? 'run' : 'walk';
}
// Skala, żeby model miał docelową wysokość; nie ufamy dziwnym rozmiarom
export function fitScale(height, target) {
    if (!(height > 0.01) || !isFinite(height) || !(target > 0)) return 1;
    return Math.max(0.01, Math.min(100, target / height));
}
// Czy plik mieści się w budżecie (bajty i trójkąty)
export function withinBudget(bytes, tris) { return bytes <= MAX_BYTES && tris <= MAX_TRIS; }
// Adresy do sprawdzenia po kolei (repozytorium serwowane wprost, potem paczka z Vite)
export function candidateUrls(file) { return ['assets/monsters/' + file, 'monsters/' + file]; }
