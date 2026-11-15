// ==========================================
// PRAWDZIWE ODBICIA: jednorazowe zdjęcie poziomu (CubeCamera) z miejsca startu zamienione na mapę środowiska (PMREM).
// Podłogi, metal, lakier i szkło odbijają wtedy swoje pomieszczenie, a nie tylko kolory presetu. Zdjęcie robimy raz przy ładowaniu
// poziomu (pod ekranem ładowania), więc nie kosztuje nic na klatkę. Jakość: low 64 px, medium 128 px, high 256 px na ścianę sześcianu.
// ==========================================
import { THREE, scene, renderer, L } from './engine.js';
import { hands } from './player.js';
import { SETTINGS } from './settings.js';

const SIZE = SETTINGS.quality === 'high' ? 256 : (SETTINGS.quality === 'low' ? 64 : 128);
let rt = null, cam = null, pm = null, last = null;

// Średnia jasność zdjęcia (próbkowana co 4. piksel z sześciu ścian)
function cubeLuminance() {
    const n = SIZE * SIZE * 4, buf = new Uint16Array(n); let sum = 0, cnt = 0;
    for (let face = 0; face < 6; face++) {
        renderer.readRenderTargetPixels(rt, 0, 0, SIZE, SIZE, buf, face);
        for (let i = 0; i < n; i += 16) { const r = THREE.DataUtils.fromHalfFloat(buf[i]), g = THREE.DataUtils.fromHalfFloat(buf[i + 1]), b = THREE.DataUtils.fromHalfFloat(buf[i + 2]); sum += 0.2126 * r + 0.7152 * g + 0.0722 * b; cnt++; }
    }
    return sum / Math.max(1, cnt);
}
// Jasność dawnej mapy z kolorów presetu (nieba, horyzontu i ziemi): do niej wyrównujemy zdjęcie, żeby poziomy nie robiły się ciemniejsze
function referenceLuminance(P) {
    const lum = (hex, k) => { const c = new THREE.Color(hex); return (0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b) * k; };
    return (lum(P.hemiSky, 0.25 * P.hemiIntensity) + lum(P.fogColor, 0.9) + lum(P.hemiGround, 0.25 * P.hemiIntensity)) / 3;
}
// Zwraca WebGLRenderTarget z mapą odbić albo null (gdy się nie udało). Poprzednia mapa jest zwalniana.
// P: preset światła poziomu; materiały poziomu dostają wzmocnienie odbić tak, by średnia jasność otoczenia była jak wcześniej.
export function captureEnvironment(P) {
    try {
        if (!rt) { rt = new THREE.WebGLCubeRenderTarget(SIZE, { type: THREE.HalfFloatType, generateMipmaps: false }); cam = new THREE.CubeCamera(0.1, 300, rt); pm = new THREE.PMREMGenerator(renderer); }
        const sp = L.spawn || [0, 1, 0];
        cam.position.set(sp[0], sp[1] + 0.4, sp[2]);
        const xr = renderer.xr.enabled, vis = [hands.L, hands.R].map(h => h ? h.visible : false);
        renderer.xr.enabled = false; for (const h of [hands.L, hands.R]) if (h) h.visible = false;
        cam.update(renderer, scene);
        renderer.xr.enabled = xr; [hands.L, hands.R].forEach((h, i) => { if (h) h.visible = vis[i]; });
        const env = pm.fromCubemap(rt.texture);
        if (last) last.dispose();
        last = env;
        if (P) {
            let lum = null; try { lum = cubeLuminance(); } catch (e) { console.warn('Cube luminance read failed', e); }
            const gain = lum === null ? 2.0 : Math.max(1, Math.min(5, referenceLuminance(P) / Math.max(0.0005, lum)));
            // Wzmocnienie raz na materiał (materiały bywają współdzielone przez wiele siatek i trwają między poziomami): liczymy od wartości bazowej,
            // inaczej gain mnożył się przy każdej siatce (kanapy w Staff miały envMapIntensity rzędu milionów i były białe)
            const seen = new Set();
            if (gain > 1.02) L.root.traverse(o => { if (o.isMesh && o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => { if (m.isMeshStandardMaterial && !seen.has(m)) { seen.add(m); if (m.userData.envBase === undefined) m.userData.envBase = m.envMapIntensity === undefined ? 1 : m.envMapIntensity; m.envMapIntensity = m.userData.envBase * gain; } }); });
            env.gain = gain;
        }
        return env;
    } catch (e) { console.warn('Environment capture failed', e); return null; }
}
