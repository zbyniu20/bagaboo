// ==========================================
// SREBRNE CZASZKI GŁĘBOKICH SEKRETÓW (oprawa 3D; pozycje w core/annexlayout.js: DEEP_SKULLS, nagrody w core/deep.js, reguły w core/puzzlelogic.js).
// Trzy srebrne czaszki (zipskull nad liną tyrolki, ceil pod sufitem nad dzwonem Climb Rush, room w pokoju w ścianie) odróżniają się od siedmiu złotych (core/secrets.js),
// więc liczniki złotych czaszek się nie zmieniają. Dotknięcie dłonią (0,4 m) zalicza sekret i czaszka znika. Lokalne.
// ==========================================
import { THREE, L, tex } from './engine.js';
import { hands } from './player.js';
import * as A from './annexlayout.js';
import { getDeep, findDeepSecret } from './deep.js';
import { deepFound } from './puzzlelogic.js';

let G = null;
const TOUCH = 0.4, _w = new THREE.Vector3();

export function buildDeepSkulls() {
    const st = getDeep(); G = { items: [], geos: [], mats: [] };
    const skullG = new THREE.SphereGeometry(0.075, 14, 10), jawG = new THREE.BoxGeometry(0.07, 0.035, 0.07), eyeG = new THREE.SphereGeometry(0.017, 6, 5);
    const silver = new THREE.MeshStandardMaterial({ color: 0xd8e4f0, emissive: 0x405878, emissiveIntensity: 0.9, metalness: 0.8, roughness: 0.3 }), black = new THREE.MeshBasicMaterial({ color: 0x0a0c14 });
    G.geos.push(skullG, jawG, eyeG); G.mats.push(silver, black);
    for (const id of Object.keys(A.DEEP_SKULLS)) {
        if (deepFound(st, id)) continue;
        const p = A.DEEP_SKULLS[id], g = new THREE.Group(); g.position.set(p[0], p[1], p[2]); L.root.add(g);
        const skull = new THREE.Mesh(skullG, silver); skull.scale.set(1, 1.1, 1); g.add(skull);
        const jaw = new THREE.Mesh(jawG, silver); jaw.position.set(0, -0.085, 0.02); g.add(jaw);
        for (const sx of [-1, 1]) { const e = new THREE.Mesh(eyeG, black); e.position.set(sx * 0.03, 0.012, 0.062); g.add(e); }
        const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex.dot, color: 0x9fc8ff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.4 })); glow.scale.set(0.5, 0.5, 1); g.add(glow); G.mats.push(glow.material);
        G.items.push({ id: id, g: g, glow: glow, ph: Math.random() * 6 });
    }
}
function take(i) { const it = G.items[i]; findDeepSecret(it.id); L.root.remove(it.g); G.items.splice(i, 1); }
export function updateDeepSkulls(dt, t) {
    if (!G) return;
    for (let i = G.items.length - 1; i >= 0; i--) {
        const it = G.items[i]; it.g.rotation.y = t * 0.8 + it.ph; it.glow.material.opacity = 0.3 + 0.2 * Math.sin(t * 2.2 + it.ph);
        for (const h of [hands.L, hands.R]) { if (!h) continue; h.getWorldPosition(_w); if (_w.distanceTo(it.g.position) < TOUCH) { take(i); break; } }
    }
}
export function disposeDeepSkulls() { if (!G) return; for (const g of G.geos) g.dispose(); for (const m of G.mats) m.dispose(); G = null; }
export const debugDeepSkulls = () => G ? { visible: G.items.map(i => i.id) } : null;   // dla testów
export function debugTakeSkull(id) { if (!G) return false; const i = G.items.findIndex(x => x.id === id); if (i < 0) return false; take(i); return true; }
