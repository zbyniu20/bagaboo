// ==========================================
// SCARY GTA: ZNACZNIK POLICJANTA-GRACZA (czysta logika, bez THREE). W trybie "Policja kontra złodzieje" (core/gtamodes.js) policjant-gracz dostaje nad głową czapkę z kogutem, żeby było widać, kto jest kim.
// Pokazywany TYLKO w fazie `run` trybu `cops`, na głowach innych graczy (własnej głowy w pierwszej osobie nie widać; wystarcza HUD), tylko dla ról z migawki `gm` (host liczy je sam, gość przyjmuje przez cleanModeSnap).
// Czysto wizualne i lokalne: bez sieci, bez fizyki, bez wpływu na zasady. 3D: core/gtacopmarkfx.js. Testy: tests/logic.mjs (blok "znacznik policjanta"), w przeglądarce tests/gtamodes.mjs.
// ==========================================
export const MARK = { MAX: 10, LIFT: 0.3 };
// gm: stan trybu ({ mode, phase, roles: { id: 'cop'|'robber' } }); ids: identyfikatory widocznych zdalnych graczy; zwraca identyfikatory do oznaczenia (najwyżej MARK.MAX, bez duplikatów)
export function markedIds(gm, ids) {
    if (!gm || gm.mode !== 'cops' || gm.phase !== 'run' || !gm.roles || typeof gm.roles !== 'object' || !Array.isArray(ids)) return [];
    const out = [];
    for (const id of ids) { if (typeof id !== 'string' || id === 'me' || out.includes(id)) continue; if (gm.roles[id] === 'cop') out.push(id); if (out.length >= MARK.MAX) break; }
    return out;
}
