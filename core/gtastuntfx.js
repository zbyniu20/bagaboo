// ==========================================
// SCARY GTA: SKOKI KASKADERSKIE (3D, napisy i zapis; reguły i pozycje w czystym core/gtastunts.js, zapis przez core/gtastore.js, testy: tests/gtastunts.mjs).
// Znaczniki to JEDNA scalona siatka (żółty pas na krawędzi wybicia i błękitna płyta w strefie lądowania), więc +1 wywołanie rysowania. Detektor czyta isGrounded() i pozycję ciała
// (core/player.js), a zaliczenie zapisuje od razu (25 Bagabucksów raz, komplet +200 i osiągnięcie gta_stunts z goglami kaskadera). Wszystko lokalne: nic przez sieć, nic nie rusza ciepła ani gwiazdek.
// Kamera i ruch gracza nie są ruszane (VR): to tylko obserwacja lotu. Brak obrażeń od upadku w tej grze, więc skok z 35 m jest bezpieczny.
// ==========================================
import { THREE, L } from './engine.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { toast } from './terminal.js';
import { unlockAchievement } from './economy.js';
import * as SFX from './audio.js';
import * as X from './gtastunts.js';
import { gtaStunts, markStunt } from './gtastore.js';
import { isGrounded } from './player.js';

const paint = (g, c) => { const n = g.attributes.position.count, a = new Float32Array(n * 3); for (let i = 0; i < n; i++) { a[i * 3] = c[0]; a[i * 3 + 1] = c[1]; a[i * 3 + 2] = c[2]; } g.setAttribute('color', new THREE.BufferAttribute(a, 3)); return g; };
const box = (w, h, d, x, y, z, c) => paint(new THREE.BoxGeometry(w, h, d).translate(x, y, z), c);
const YELLOW = [2, 1.5, 0.15], CYAN = [0.3, 1.5, 1.9];

// o: { buildings }
export function createGtaStunts(o) {
    const root = L.root, sp = X.stuntSpots(o.buildings), G = { geos: [], mats: [], st: X.newStuntState(), done: new Set(gtaStunts().done), log: [] };
    const parts = [];
    for (const s of sp) {
        const f = s.from, w = f.x1 - f.x0, d = f.z1 - f.z0;
        // żółty pas na krawędzi dachu po stronie celu (dir: w którą stronę leży cel)
        if (s.dir === '+z') parts.push(box(w, 0.05, 0.3, (f.x0 + f.x1) / 2, f.y + 0.03, f.z1 - 0.2, YELLOW));
        else if (s.dir === '-z') parts.push(box(w, 0.05, 0.3, (f.x0 + f.x1) / 2, f.y + 0.03, f.z0 + 0.2, YELLOW));
        else if (s.dir === '+x') parts.push(box(0.3, 0.05, d, f.x1 - 0.2, f.y + 0.03, (f.z0 + f.z1) / 2, YELLOW));
        else parts.push(box(0.3, 0.05, d, f.x0 + 0.2, f.y + 0.03, (f.z0 + f.z1) / 2, YELLOW));
        const t = s.to; parts.push(box(Math.min(3, t.x1 - t.x0), 0.04, Math.min(3, t.z1 - t.z0), (t.x0 + t.x1) / 2, t.y + 0.03, (t.z0 + t.z1) / 2, CYAN));
    }
    const geo = mergeGeometries(parts); G.geos.push(geo);
    const m = new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false }); G.mats.push(m);
    G.stat = new THREE.Mesh(geo, m); root.add(G.stat);
    const award = (id) => {
        const r = markStunt(id); if (!r.isNew) return; G.done.add(id); G.log.push(id);
        const e = sp.find(q => q.id === id);
        toast('Stunt jump: ' + e.name + '! ' + r.state.done.length + '/' + X.DEFS.length + ' (+' + r.bones + ' Bagabucks)', '#7fff90'); SFX.bell && SFX.bell();
        if (r.all) { unlockAchievement('gta_stunts'); toast('All stunt jumps landed! Stunt goggles unlocked.', '#ffd23a'); }
    };
    function update(dt, c) {
        const grounded = c.grounded !== undefined ? c.grounded : isGrounded(), r = X.stuntStep(G.st, dt, { x: c.x, y: c.y, z: c.z, grounded: grounded }, sp);
        G.st = r.st; if (r.event === 'done') award(r.id);
    }
    const info = () => ({ n: G.done.size, total: X.DEFS.length, hint: X.nextStuntHint({ done: Array.from(G.done) }) });
    return {
        update, info, spots: sp,
        debug: () => ({ done: Array.from(G.done), log: G.log.slice(), ph: G.st.ph, cands: G.st.cands.map(q => q.id), stat: G.stat.parent === root, info: info() }),
        dispose() { G.stat.removeFromParent(); for (const g of G.geos) g.dispose(); for (const x of G.mats) x.dispose(); }
    };
}
