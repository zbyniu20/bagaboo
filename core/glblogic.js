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
    ghost: { file: 'ghost.glb', height: 2.5, yaw: 0 }, lavabeast: { file: 'lavabeast.glb', height: 2.2, yaw: 0 }, officer: { file: 'officer.glb', height: 2.1, yaw: 0 }
};
// Potwory, spośród których losowany jest bot w Become the Monster
export const BOT_KINDS = ['mannequin', 'blind', 'threadman', 'lavabeast', 'warden'];
export const MAX_BYTES = 6 * 1024 * 1024;   // większy plik to za dużo dla Quest 3S: nie ładujemy
export const MAX_TRIS = 40000;
// Role animacji i ich możliwe nazwy w pliku (małe litery, fragment nazwy wystarcza)
const ROLES = { scream: ['scream', 'roar', 'howl'], listen: ['listen', 'sniff', 'tilt'], idle: ['idle', 'stand', 'breath', 'wait'], walk: ['walk', 'creep', 'stalk', 'move'], run: ['run', 'sprint', 'chase', 'charge'], attack: ['attack', 'bite', 'swipe', 'slash', 'hit', 'punch'] };
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

// ---------- jednorazowe animacje: Scream (zauważył gracza i rusza biegiem), Attack (biegnie tuż przy kamerze), Listen (po dłuższym staniu). Czysta logika; stan na potwora. ----------
// Reguły: z histerezą i czasami odnowienia, żeby potwór kręcący się wokół progu biegu (3,2 m/s) nie krzyczał w kółko; przeskok pozycji (odrodzenie, reset po złapaniu) zeruje stan.
export const SHOTS = { attack: { dur: 1.0, cd: 3.0, pri: 3 }, scream: { dur: 1.5, cd: 10.0, pri: 2 }, listen: { dur: 2.4, cd: 12.0, pri: 1 } };
export const SHOT_RULES = { runOn: 3.4, runOff: 2.8, restSpeed: 0.15, calmBefore: 1.5, runHold: 0.35, attackDist: 2.2, idleHold: 2.5, jump: 1.0 };
export const newShotState = () => ({ isRun: false, calm: 0, run: 0, idle: 0, armed: false, listened: false, cd: { attack: 0, scream: 0, listen: 0 }, cur: null, left: 0 });
// Czy plik ma klip dla roli (bez zamienników: brak klipu = ta animacja po prostu się nie odtwarza)
export function hasClip(names, role) {
    if (!Array.isArray(names) || !ROLES[role]) return false;
    const low = names.map(n => String(n).toLowerCase()); return ROLES[role].some(k => low.some(n => n.split('|').pop() === k || n.includes(k)));
}
export function clipFor(names, role) {
    if (!Array.isArray(names) || !ROLES[role]) return null;
    const low = names.map(n => String(n).toLowerCase()), last = low.map(n => n.split('|').pop());
    for (const k of ROLES[role]) { const e = last.indexOf(k); if (e >= 0) return names[e]; }
    for (const k of ROLES[role]) { const i = low.findIndex(n => n.includes(k)); if (i >= 0) return names[i]; }
    return null;
}
// dt w s, speed w m/s, dist = odległość do kamery (m), jumped = pozycja przeskoczyła o > SHOT_RULES.jump w tej klatce, has = { attack, scream, listen }. Zwraca aktywną rolę albo null
export function shotStep(st, dt, speed, dist, jumped, has) {
    const R = SHOT_RULES;
    for (const k of Object.keys(st.cd)) st.cd[k] = Math.max(0, st.cd[k] - dt);
    if (!(dt > 0)) return st.cur;
    if (jumped) { st.isRun = false; st.calm = 0; st.run = 0; st.idle = 0; st.armed = false; st.listened = false; st.cur = null; st.left = 0; return null; }
    st.isRun = st.isRun ? speed > R.runOff : speed > R.runOn;
    if (st.isRun) { if (st.run === 0) st.armed = st.calm >= R.calmBefore; st.run += dt; st.calm = 0; st.idle = 0; st.listened = false; }
    else { st.run = 0; st.calm += dt; if (speed < R.restSpeed) st.idle += dt; else { st.idle = 0; st.listened = false; } }
    if (st.left > 0) { st.left -= dt; if (st.left <= 0) { st.left = 0; st.cur = null; } }
    let want = null;
    if (st.isRun && dist < R.attackDist && has && has.attack && st.cd.attack <= 0) want = 'attack';
    else if (st.isRun && st.armed && st.run >= R.runHold && has && has.scream && st.cd.scream <= 0) want = 'scream';
    else if (!st.isRun && st.idle >= R.idleHold && !st.listened && has && has.listen && st.cd.listen <= 0) want = 'listen';
    if (want && (!st.cur || SHOTS[want].pri > SHOTS[st.cur].pri)) { st.cur = want; st.left = SHOTS[want].dur; st.cd[want] = SHOTS[want].cd; if (want === 'scream') st.armed = false; if (want === 'listen') st.listened = true; }
    return st.cur;
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
