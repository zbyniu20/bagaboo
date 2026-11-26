// ==========================================
// TUNEL, KTÓRY SIĘ ZMIENIA (oprawa 3D; reguły w czystym core/puzzlelogic.js: tunnelStep, TUNNEL_LOOP; sekret tunnel w core/deep.js).
// Dwie tabliczki w tunelu do aneksu. Gdy przejdziesz tunel tam i z powrotem kilka razy (przerwa dłuższa niż 90 s zaczyna od nowa): po trzecim przejściu napis się zmienia,
// po czwartym zmienia się jeszcze raz i słychać kroki za plecami (sekret). Pozycję gracza liczy każdy klient lokalnie z kamery; nic nie idzie przez sieć.
// ==========================================
import { THREE, L, camera } from './engine.js';
import * as T from './textures.js';
import * as SFX from './audio.js';
import * as A from './annexlayout.js';
import * as P from './puzzlelogic.js';
import { findDeepSecret } from './deep.js';

let G = null;
const _p = new THREE.Vector3(), _d = new THREE.Vector3();
const TEXTS = ['THE ANNEX', 'THE TUNNEL IS LONGER', "DON'T LOOK BACK"];

export function buildAnnexTunnel() {
    const root = L.root, mx = (A.TUNNEL.x0 + A.TUNNEL.x1) / 2;
    G = { geos: [], mats: [], texs: [], st: P.newTunnel(), stage: 0, cvs: [], timers: [] };
    const gg = new THREE.PlaneGeometry(1.5, 0.56); G.geos.push(gg);
    for (const sx of [-1, 1]) {
        const c = T.makeCanvas(256, 96), tx = T.toTex(c, false); G.texs.push(tx); G.cvs.push({ c: c, tx: tx });
        const m = new THREE.MeshBasicMaterial({ map: tx, toneMapped: false }); G.mats.push(m);
        const sign = new THREE.Mesh(gg, m); sign.position.set(mx + sx * (A.TUNNEL.x1 - A.TUNNEL.x0) / 2 - sx * 0.03, 2.3, (A.TUNNEL.z0 + A.TUNNEL.z1) / 2); sign.rotation.y = -sx * Math.PI / 2; root.add(sign);
    }
    paint();
}
function paint() {
    const text = TEXTS[Math.min(2, G.stage === 0 ? 0 : (G.stage >= 2 ? 2 : 1))];
    for (const o of G.cvs) {
        const x = o.c.getContext('2d'); x.fillStyle = '#0c0806'; x.fillRect(0, 0, 256, 96); x.strokeStyle = G.stage >= 2 ? '#a02020' : '#c8a040'; x.lineWidth = 5; x.strokeRect(3, 3, 250, 90);
        x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = G.stage >= 2 ? '#ff5040' : '#ffd27a'; x.font = 'bold ' + (text.length > 14 ? 21 : 34) + 'px "Courier New", monospace'; x.fillText(text, 128, 50);
        o.tx.needsUpdate = true;
    }
}
function feed(z, now) {
    const r = P.tunnelStep(G.st, z, now); G.st = r.st;
    if (r.event === 'stage3') { G.stage = 1; paint(); }
    else if (r.event === 'stage4') {
        G.stage = 2; paint(); findDeepSecret('tunnel');
        camera.getWorldPosition(_p); camera.getWorldDirection(_d);
        for (let i = 0; i < 3; i++) G.timers.push(setTimeout(() => { if (G) SFX.step && SFX.step(0.5, { x: _p.x - _d.x * (2.4 - i * 0.5), y: 0, z: _p.z - _d.z * (2.4 - i * 0.5) }); }, 500 + i * 520));
    }
    if (G.st.crosses === 0 && G.stage > 0 && r.event === '' && z < 0) { /* reset po długiej przerwie wraca napis na pierwotny */ }
    if (G.st.crosses === 0 && G.stage !== 0) { G.stage = 0; paint(); }
    return r.event;
}
export function updateAnnexTunnel(dt, t) { if (!G) return; camera.getWorldPosition(_p); feed(_p.z, performance.now() / 1000); }
export function disposeAnnexTunnel() { if (!G) return; for (const t of G.timers) clearTimeout(t); for (const g of G.geos) g.dispose(); for (const m of G.mats) m.dispose(); for (const x of G.texs) x.dispose(); G = null; }
export const debugTunnel = () => G ? { stage: G.stage, crosses: G.st.crosses } : null;   // dla testów
export function debugTunnelZ(z) { return G ? feed(z, performance.now() / 1000) : ''; }
