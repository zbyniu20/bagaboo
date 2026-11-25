// ==========================================
// SEKRETY W LOBBY (oprawa 3D i zapis; reguły w czystym core/secretlogic.js, testy: tests/logic.mjs i tests/lobbyextras.mjs).
// Siedem złotych czaszek ukrytych w lobby (za automatem, na szczycie schodów, na poprzeczce, za skrzyniami i beczkami, wysoko na linie, za gniazdem).
// Dotknij czaszki dłonią: dostajesz Bagabucksy, a progi 3, 5 i 7 czaszek dodatkowe nagrody. Znalezione znikają na stałe. Wszystkie siedem odsłania wskazówkę do drzwi LAB.
// Stan w SAVE.secrets (zawsze przez normalizeSecrets). Wszystko lokalne.
// ==========================================
import { THREE, L, tex } from './engine.js';
import { toast } from './terminal.js';
import { SAVE, saveGame, addBones } from './economy.js';
import { hands } from './player.js';
import * as SFX from './audio.js';
import * as S from './secretlogic.js';

let G = null;
const TOUCH = 0.32, _w = new THREE.Vector3();
export function getSecrets() { const st = S.normalizeSecrets(SAVE.secrets); SAVE.secrets = st; return st; }

// Znalezienie czaszki (też dla testów): zapis, nagrody, komunikaty. Zwraca wynik z secretlogic albo null
export function collectSecret(id) {
    const r = S.findSecret(getSecrets(), id); if (!r.isNew) return null;
    SAVE.secrets = r.state; addBones(r.bones, 'Hidden skull');
    toast('Hidden skull ' + S.foundCount(r.state) + '/' + S.SECRETS.length + ': ' + S.secretById(id).name + (r.milestone ? ' (bonus!)' : ''), '#ffd27a'); SFX.bell && SFX.bell();
    if (r.all) setTimeout(() => toast(S.FINAL_HINT, '#ff6a52'), 2600);
    saveGame();
    return r;
}

export function buildSecrets() {
    const st = getSecrets(); G = { items: [], geos: [], mats: [], clock: 0 };
    const skullG = new THREE.SphereGeometry(0.07, 14, 10), jawG = new THREE.BoxGeometry(0.07, 0.035, 0.07), eyeG = new THREE.SphereGeometry(0.016, 6, 5);
    const gold = new THREE.MeshStandardMaterial({ color: 0xe0b030, emissive: 0x805010, emissiveIntensity: 0.9, metalness: 0.7, roughness: 0.35 }), black = new THREE.MeshBasicMaterial({ color: 0x100800 });
    G.geos.push(skullG, jawG, eyeG); G.mats.push(gold, black);
    for (const sc of S.SECRETS) {
        if (S.isFound(st, sc.id)) continue;
        const g = new THREE.Group(); g.position.set(sc.pos[0], sc.pos[1], sc.pos[2]); L.root.add(g);
        const skull = new THREE.Mesh(skullG, gold); skull.scale.set(1, 1.1, 1); g.add(skull);
        const jaw = new THREE.Mesh(jawG, gold); jaw.position.set(0, -0.08, 0.02); g.add(jaw);
        for (const sx of [-1, 1]) { const e = new THREE.Mesh(eyeG, black); e.position.set(sx * 0.028, 0.012, 0.058); g.add(e); }
        const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex.dot, color: 0xffc050, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.5 })); glow.scale.set(0.55, 0.55, 1); g.add(glow);
        G.mats.push(glow.material);
        G.items.push({ id: sc.id, g: g, glow: glow, ph: Math.random() * 6 });
    }
}
export function updateSecrets(dt, t) {
    if (!G) return; G.clock += dt;
    for (let i = G.items.length - 1; i >= 0; i--) {
        const it = G.items[i]; it.g.rotation.y = t * 0.9 + it.ph; it.glow.material.opacity = 0.35 + 0.25 * Math.sin(t * 2.4 + it.ph);
        for (const h of [hands.L, hands.R]) {
            if (!h) continue; h.getWorldPosition(_w);
            if (_w.distanceTo(it.g.position) < TOUCH) { if (collectSecret(it.id)) { L.root.remove(it.g); G.items.splice(i, 1); } break; }
        }
    }
}
export function disposeSecrets() { if (!G) return; for (const g of G.geos) g.dispose(); for (const m of G.mats) m.dispose(); G = null; }
export const debugSecrets = () => G ? { visible: G.items.map(i => i.id), found: getSecrets().found.length } : null;   // dla testów
export function debugCollect(id) { const r = collectSecret(id); if (G && r) { const k = G.items.findIndex(i => i.id === id); if (k >= 0) { L.root.remove(G.items[k].g); G.items.splice(k, 1); } } return r; }
