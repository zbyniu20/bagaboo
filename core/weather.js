// ==========================================
// SCARY GTA: POGODA (3D i dźwięk). Logika w czystym core/cityweatherlogic.js. Deszcz to JEDNA siatka linii wokół kamery (+1 wywołanie rysowania; 300 smug na Medium,
// 520 na High, 0 na Low), błysk to krótkie podniesienie światła otoczenia (jedna gładka górka, bez stroba), gęstsza mgła przez DREAD.fogMul, szum deszczu i grzmot z opóźnieniem.
// Wszystko lokalne i wizualne (każdy klient ma własną pogodę, nic nie idzie przez sieć).
// ==========================================
import { THREE, L, camera, lighting } from './engine.js';
import * as SFX from './audio.js';
import { SETTINGS } from './settings.js';
import { DREAD } from './ambience.js';
import { flashLevel, WX } from './cityweatherlogic.js';

const BOX = 22, TOP = 14, SPEED = 17;
export const rainCount = (quality) => quality === 'low' ? 0 : (quality === 'medium' ? 300 : 520);
export function createWeather() {
    const H = { n: rainCount(SETTINGS.quality), snd: null, base: null, pending: [], bolts: 0, thunders: 0 };
    const n = H.n, pos = new Float32Array(Math.max(1, n) * 6), pts = new Float32Array(Math.max(1, n) * 3);
    for (let i = 0; i < n; i++) { pts[i * 3] = (Math.random() - 0.5) * 2 * BOX; pts[i * 3 + 1] = Math.random() * TOP; pts[i * 3 + 2] = (Math.random() - 0.5) * 2 * BOX; }
    H.geo = new THREE.BufferGeometry(); H.geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); H.geo.setDrawRange(0, n * 2);
    H.mat = new THREE.LineBasicMaterial({ color: 0xaebdd6, transparent: true, opacity: 0.0, depthWrite: false, fog: false });
    H.mesh = new THREE.LineSegments(H.geo, H.mat); H.mesh.frustumCulled = false; H.mesh.visible = n > 0; L.root.add(H.mesh);
    function startSound() {
        const bus = SFX.audioBus(); if (!bus || H.snd) return; const ctx = bus.ctx, nb = SFX.noiseBuf(2); if (!nb) return;
        const src = ctx.createBufferSource(); src.buffer = nb; src.loop = true;
        const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 1100; const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 7000;
        const g = ctx.createGain(); g.gain.value = 0; src.connect(hp); hp.connect(lp); lp.connect(g); g.connect(bus.master); src.start(); H.snd = { src, nodes: [hp, lp, g], g };
    }
    function stopSound() { const s = H.snd; if (!s) return; try { s.src.stop(); } catch (e) { /* już zatrzymane */ } for (const x of [s.src, ...s.nodes]) try { x.disconnect(); } catch (e) { /* ok */ } H.snd = null; }
    // w: stan pogody, ev: zdarzenia z weatherStep, dt: krok
    H.update = (w, ev, dt) => {
        const rain = w.rain;
        H.mat.opacity = 0.05 + 0.3 * rain; H.mesh.visible = n > 0 && rain > 0.02;
        if (H.mesh.visible) {
            const p = H.geo.attributes.position.array, cx = camera.position.x, cz = camera.position.z, d = Math.min(dt, 0.05), fall = SPEED * (0.8 + 0.4 * rain);
            for (let i = 0; i < n; i++) {
                let x = pts[i * 3], y = pts[i * 3 + 1] - fall * d, z = pts[i * 3 + 2];
                if (y < 0) { y += TOP; x = (Math.random() - 0.5) * 2 * BOX; z = (Math.random() - 0.5) * 2 * BOX; }
                pts[i * 3] = x; pts[i * 3 + 1] = y;
                const wx = cx + x, wy = y + Math.max(0, camera.position.y - 2), wz = cz + z, len = 0.5 + 0.4 * rain;
                p[i * 6] = wx; p[i * 6 + 1] = wy; p[i * 6 + 2] = wz; p[i * 6 + 3] = wx + 0.1 * len; p[i * 6 + 4] = wy - len; p[i * 6 + 5] = wz + 0.04 * len;
            }
            H.geo.attributes.position.needsUpdate = true;
        }
        DREAD.fogMul = w.fog;
        // szum deszczu
        if (rain > 0.02) { startSound(); if (H.snd) H.snd.g.gain.value += (rain * 0.07 * SETTINGS.effects - H.snd.g.gain.value) * Math.min(1, dt * 2); } else if (H.snd) { H.snd.g.gain.value *= 0.9; if (H.snd.g.gain.value < 0.001) stopSound(); }
        // błysk: jedna gładka górka na świetle otoczenia (bazę odświeżamy, gdy nie ma błysku)
        const f = flashLevel(w);
        if (f > 0) { if (H.base === null) H.base = lighting.hemi.intensity; lighting.hemi.intensity = H.base * (1 + WX.FLASH_BOOST * f); }
        else if (H.base !== null) { lighting.hemi.intensity = H.base; H.base = null; }
        if (ev && ev.flash) { H.bolts++; H.pending.push(ev.thunder); }
        for (let i = H.pending.length - 1; i >= 0; i--) { H.pending[i] -= dt; if (H.pending[i] <= 0) { H.pending.splice(i, 1); H.thunders++; SFX.thunder(0.35 + 0.4 * rain); } }
    };
    H.dispose = () => { stopSound(); if (H.base !== null) lighting.hemi.intensity = H.base; H.mesh.removeFromParent(); H.geo.dispose(); H.mat.dispose(); DREAD.fogMul = 1; };
    return H;
}
