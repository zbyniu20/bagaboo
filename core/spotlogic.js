// ==========================================
// Wspólne reguły rozmieszczania dekoracji w poziomach (czysta logika, bez THREE): gdzie wolno stawiać rzeczy i jakie płaskie ściany są dostępne.
// Używają jej rekwizyty (core/proplogic.js), decale (core/decallogic.js) i elementy architektury (core/kitlogic.js). Reguły unikania powtarzają te z
// addStoryProps (core/levelkit.js), które zostaje bez zmian (jego ciąg liczb losowych nie może się przesunąć); zmieniając je, zmień oba miejsca.
// Pudełko: { minX, maxX, minY, maxY, minZ, maxZ }. Dane poziomu: { area, floorY, boxes, spawn, reserved: [[x, z, r]], portals: [pudełko] }.
// ==========================================
export const SPOT = { tallH: 1.8, floorSlop: 0.6, startGap: 5, portalGap: 2, probe: 0.25, minFace: 1.2 };

export function makeSpots(o) {
    const A = o.area, fy = o.floorY || 0, boxes = o.boxes || [], sp = o.spawn || [0, 1, 0];
    const free = (x, z, r) => !boxes.some(q => q.maxY > fy + 0.25 && q.minY < fy + 1.6 && x > q.minX - r && x < q.maxX + r && z > q.minZ - r && z < q.maxZ + r);
    const clear = (x, z) => Math.hypot(x - sp[0], z - sp[2]) > SPOT.startGap && !(o.reserved || []).some(r => Math.hypot(x - r[0], z - r[1]) < (r[2] || 2) + 1) && !(o.portals || []).some(p => x > p.minX - SPOT.portalGap && x < p.maxX + SPOT.portalGap && z > p.minZ - SPOT.portalGap && z < p.maxZ + SPOT.portalGap);
    const inside = (x, z, m) => !!A && x > A.minX + (m || 0) && x < A.maxX - (m || 0) && z > A.minZ + (m || 0) && z < A.maxZ - (m || 0);
    const tall = boxes.filter(q => q.maxY - q.minY >= SPOT.tallH && q.minY <= fy + SPOT.floorSlop);
    return { free, clear, inside, tall };
}

// Płaskie ściany: dla każdej wysokiej bryły cztery ściany boczne, z pominięciem tych, które są zasłonięte przez inną bryłę (styk, T) albo leżą na zewnątrz poziomu
// (tył ścian obwodowych). L.bounds to obszar ruchu gracza i bywa mniejszy niż pomieszczenie (w Home ściany stoją na 7-8 m, granice to 6,6 m), więc "zewnątrz" ocenia się
// względnie: dla pary przeciwległych ścian tej samej bryły zostaje ta bliższa granicom (a ściana dalsza niż 1,5 m od granic odpada).
// Zwraca [{ cx, cz, nx, nz, tx, tz, len, top, bottom }]; (nx, nz) = normalna na zewnątrz bryły, (tx, tz) = kierunek wzdłuż ściany
const boundsDist = (A, x, z) => A ? Math.hypot(Math.max(A.minX - x, 0, x - A.maxX), Math.max(A.minZ - z, 0, z - A.maxZ)) : 0;
export function wallFaces(o) {
    const { free, tall } = makeSpots(o), out = [], A = o.area;
    for (const q of tall) {
        const defs = [[0, -1, 1, 0, q.maxX - q.minX, (q.minX + q.maxX) / 2, q.minZ], [0, 1, 1, 0, q.maxX - q.minX, (q.minX + q.maxX) / 2, q.maxZ], [-1, 0, 0, 1, q.maxZ - q.minZ, q.minX, (q.minZ + q.maxZ) / 2], [1, 0, 0, 1, q.maxZ - q.minZ, q.maxX, (q.minZ + q.maxZ) / 2]];
        const cand = defs.map(([nx, nz, tx, tz, len, cx, cz]) => {
            if (len < SPOT.minFace) return null;
            let dist = 0;
            for (const t of [-0.375, 0, 0.375]) { const px = cx + tx * len * t + nx * SPOT.probe, pz = cz + tz * len * t + nz * SPOT.probe; if (!free(px, pz, 0)) return null; dist = Math.max(dist, boundsDist(A, px, pz)); }
            return { cx: cx, cz: cz, nx: nx, nz: nz, tx: tx, tz: tz, len: len, top: q.maxY, bottom: q.minY, dist: dist };
        });
        for (const [a, b] of [[0, 1], [2, 3]]) {
            const fa = cand[a], fb = cand[b];
            for (const [f, other] of [[fa, fb], [fb, fa]]) { if (!f || f.dist > 1.5) continue; if (other && other.dist < f.dist && (f.dist > 0 || other.dist > 0)) continue; out.push(f); }
        }
    }
    return out.map(f => { delete f.dist; return f; });
}
// Przedziały ściany [t0, t1] (w metrach od środka, wzdłuż ściany), z których wycięto okolice portali i rezerwacji (margin m)
export function faceIntervals(face, o, m) {
    const half = face.len / 2, cut = [];
    const pts = [...(o.reserved || []).map(r => [r[0], r[1], (r[2] || 2) + m]), ...(o.portals || []).map(p => [(p.minX + p.maxX) / 2, (p.minZ + p.maxZ) / 2, Math.max(p.maxX - p.minX, p.maxZ - p.minZ) / 2 + m])];
    for (const [x, z, r] of pts) {
        const along = (x - face.cx) * face.tx + (z - face.cz) * face.tz, across = (x - face.cx) * face.nx + (z - face.cz) * face.nz;
        if (Math.abs(across) < r) { const w = Math.sqrt(r * r - across * across); cut.push([along - w, along + w]); }
    }
    cut.sort((a, b) => a[0] - b[0]);
    const out = []; let cur = -half;
    for (const [a, b] of cut) { if (a > cur) out.push([cur, Math.min(a, half)]); cur = Math.max(cur, b); }
    if (cur < half) out.push([cur, half]);
    return out.filter(([a, b]) => b - a > 0.3);
}
