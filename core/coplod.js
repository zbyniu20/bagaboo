// ==========================================
// SCARY GTA: POZIOMY SZCZEGÓŁOWOŚCI POLICJI (czysta logika, bez THREE). Pełny model GLB policjanta kosztuje kilka wywołań rysowania (jedno na materiał), a pula ma 10 policjantów,
// więc ich liczba w kadrze decydowała o budżecie (255 z 260 przy 12 widocznych). Teraz koszt jest ograniczony KONSTRUKCJĄ: pełny model dostaje najwyżej LOD.K najbliższych policjantów,
// a wszyscy pozostali w zasięgu LOD.VIS to sylwetki w JEDNEJ siatce instancjonowanej (jedno wywołanie rysowania na wszystkich) wraz ze stożkami latarek (drugie wywołanie).
// Wybór ma histerezę (pełny model zostaje do FAR, nowy dostaje go dopiero poniżej NEAR), żeby w VR nic nie przeskakiwało na granicy. 3D: core/citysim.js. Testy: tests/logic.mjs (blok "LOD policji").
// ==========================================
export const LOD = { NEAR: 24, FAR: 28, K: 3, VIS: 85, MATS: 6 };

// cops: [{ i, d (odległość od kamery w m), active }]; prev: Set indeksów, które miały pełny model w poprzedniej klatce
// Zwraca { full: Set, far: Set, off: Set } (rozłączne, razem obejmują wszystkich aktywnych w zasięgu VIS; nieaktywni są poza wszystkim)
export function pickLod(cops, prev) {
    const keep = prev || new Set(), act = cops.filter(c => c.active && Number.isFinite(c.d)), full = new Set(), far = new Set(), off = new Set();
    const stay = act.filter(c => keep.has(c.i) && c.d < LOD.FAR).sort((a, b) => a.d - b.d);
    for (const c of stay) if (full.size < LOD.K) full.add(c.i);
    const rise = act.filter(c => !full.has(c.i) && c.d < LOD.NEAR).sort((a, b) => a.d - b.d);
    for (const c of rise) if (full.size < LOD.K) full.add(c.i);
    for (const c of act) if (!full.has(c.i)) (c.d < LOD.VIS ? far : off).add(c.i);
    return { full, far, off };
}
// Górna granica wywołań rysowania policji: pełne modele (K x materiały) + jedna siatka sylwetek + jedna siatka stożków
export const maxCopCalls = () => LOD.K * LOD.MATS + 2;
// Koszt dla konkretnego wyniku pickLod (do testów i diagnostyki)
export const copCalls = (r) => r.full.size * LOD.MATS + (r.far.size > 0 ? 1 : 0) + (r.far.size + r.full.size > 0 ? 1 : 0);   // pełne modele + sylwetki + stożki
