// ==========================================
// MODELE POTWORÓW Z PLIKÓW GLB: CZYSTA LOGIKA (dobór animacji po nazwach, skala, stan ruchu).
// Bez THREE: testy w tests/logic.mjs. Ładowaniem i miksowaniem zajmuje się core/glbmonster.js.
// Plik modelu: assets/monsters/<nazwa>.glb (w paczce z Vite: monsters/<nazwa>.glb); brak pliku = poziom zostaje przy proceduralnym manekinie.
// ==========================================
// Potwory z plików assets/monsters/<nazwa>.glb (powstają w Blenderze: tools/blender/monsters.py). height: docelowa wysokość (m), yaw: poprawka obrotu (rad, przód = +Z)
export const MONSTERS = {
    mannequin: { file: 'mannequin.glb', height: 2.2, yaw: 0 }, gravedigger: { file: 'gravedigger.glb', height: 2.1, yaw: 0 }, warden: { file: 'warden.glb', height: 2.7, yaw: 0 },
    doll: { file: 'doll.glb', height: 1.05, yaw: 0 }, patient: { file: 'patient.glb', height: 1.9, yaw: 0 }, butler: { file: 'butler.glb', height: 2.4, yaw: 0 },
    blind: { file: 'blind.glb', height: 2.2, yaw: 0 }, threadman: { file: 'threadman.glb', height: 2.3, yaw: 0 }, furas: { file: 'furas.glb', height: 1.7, yaw: 0 },
    ghost: { file: 'ghost.glb', height: 2.5, yaw: 0 }, lavabeast: { file: 'lavabeast.glb', height: 2.2, yaw: 0 }
};
// Potwory, spośród których losowany jest bot w Become the Monster
export const BOT_KINDS = ['mannequin', 'blind', 'threadman', 'lavabeast', 'warden'];
export const MAX_BYTES = 6 * 1024 * 1024;   // większy plik to za dużo dla Quest 3S: nie ładujemy
export const MAX_TRIS = 40000;
// Role animacji i ich możliwe nazwy w pliku (małe litery, fragment nazwy wystarcza)
const ROLES = { idle: ['idle', 'stand', 'breath', 'wait'], walk: ['walk', 'creep', 'stalk', 'move'], run: ['run', 'sprint', 'chase', 'charge'], attack: ['attack', 'bite', 'swipe', 'slash', 'hit', 'punch'] };
const FALLBACK = { idle: ['idle', 'walk'], walk: ['walk', 'run', 'idle'], run: ['run', 'walk', 'idle'], attack: ['attack', 'run', 'walk', 'idle'] };
// Nazwa klipu dla roli: dokładna rola, potem zamienniki; ostatecznie pierwszy klip (null, gdy modelu bez animacji)
export function pickClip(names, role) {
    if (!Array.isArray(names) || !names.length) return null;
    const low = names.map(n => String(n).toLowerCase()), last = low.map(n => n.split('|').pop());
    for (const r of FALLBACK[role] || [role]) {
        for (const key of ROLES[r] || [r]) { const e = last.indexOf(key); if (e >= 0) return names[e]; }   // dokładna nazwa (np. "Armature|Walk")
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
// (w paczce Vite `bundled` = true: pliki leżą w monsters/, więc próbujemy ich pierwszych i konsola nie dostaje 404)
export function candidateUrls(file, bundled) { const a = 'assets/monsters/' + file, b = 'monsters/' + file; return bundled ? [b, a] : [a, b]; }
