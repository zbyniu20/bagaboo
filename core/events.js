// ==========================================
// LOSOWE ZDARZENIA W POZIOMACH (tylko wrażenia, nigdy nie zabijają ani nie zmieniają zasad):
//  blackout  - światło gaśnie na kilka sekund (z migotaniem), słychać stuknięcie
//  flicker   - lampa przygasa i błyska 2-3 razy (wolno: bez stroboskopu)
//  red       - czerwony alarm: całe światło robi się czerwone
//  fog       - mgła na chwilę gęstnieje
//  whisper   - szept tuż przy uchu
// Rzadziej na Easy, częściej na Nightmare. Zdarzenia zmieniają światło ogólne i ekspozycję, a po zakończeniu
// przywracają wartości z chwili startu, więc nie kolidują z latarką ani z własnymi efektami poziomu.
// ==========================================
import { THREE, scene, camera, renderer, lighting } from './engine.js';
import { diffOf } from './economy.js';
import { mutFactor } from './mutators.js';
import * as SFX from './audio.js';

const KINDS = ['blackout', 'flicker', 'red', 'fog', 'whisper'];
const _p = new THREE.Vector3();

// level: id poziomu (dla trudności); opts.skip: lista zdarzeń do pominięcia (np. ['fog'] gdy poziom ma gęstą mgłę)
export function createEvents(level, opts) {
    opts = opts || {};
    const kinds = KINDS.filter(k => !(opts.skip || []).includes(k));
    const df = diffOf(level), scale = df.id === 'easy' ? 1.6 : (df.id === 'nightmare' ? 0.6 : 1);
    const wait = () => (40 + Math.random() * 50) * scale / mutFactor('events');   // nastrój i mutator (core/mutators.js) zmieniają częstość
    let next = wait() * 0.7, cur = null, last = '';
    const hemiColor = new THREE.Color();

    function startEvent() {
        const pool = kinds.filter(k => k !== last); if (!pool.length) return;
        const kind = pool[(Math.random() * pool.length) | 0]; last = kind;
        cur = { kind: kind, t: 0, base: { hemi: lighting.hemi.intensity, fog: scene.fog.density, color: lighting.hemi.color.getHex() }, dur: 4 };
        if (kind === 'blackout') { cur.dur = 3 + Math.random() * 3; SFX.bang(near()); }
        else if (kind === 'flicker') { cur.dur = 2.4; }
        else if (kind === 'red') { cur.dur = 6 + Math.random() * 3; SFX.stinger(near()); }
        else if (kind === 'fog') { cur.dur = 8 + Math.random() * 4; SFX.creak(0.5, near()); }
        else if (kind === 'whisper') { cur.dur = 2; SFX.whisper(near()); }
    }
    function near() { camera.getWorldPosition(_p); return { x: _p.x + (Math.random() - 0.5) * 3, y: _p.y, z: _p.z + (Math.random() - 0.5) * 3 }; }
    function restore() {
        if (!cur) return;
        lighting.hemi.intensity = cur.base.hemi; scene.fog.density = cur.base.fog; lighting.hemi.color.setHex(cur.base.color);
        cur = null;
    }
    return {
        // enabled: czy poziom jest w fazie, w której zdarzenia mają sens (np. nie podczas instrukcji)
        update(dt, enabled) {
            if (cur && !enabled) { restore(); return; }
            if (!cur) { if (!enabled) return; next -= dt; if (next <= 0) { startEvent(); next = wait(); } return; }
            cur.t += dt;
            const k = cur.t / cur.dur, b = cur.base;
            if (cur.kind === 'blackout') {
                const fade = Math.min(1, cur.t / 0.25, (cur.dur - cur.t) / 0.6);   // szybko gaśnie, powoli wraca
                const flick = cur.t > 0.6 && Math.random() < 0.06 ? 0.5 : 1;
                lighting.hemi.intensity = b.hemi * (1 - 0.88 * fade * flick);
            } else if (cur.kind === 'flicker') {
                const dip = (cur.t % 0.8) < 0.18 ? 0.25 : 1;   // krótkie przygaszenia co 0,8 s
                lighting.hemi.intensity = b.hemi * dip;
            } else if (cur.kind === 'red') {
                const a = Math.min(1, cur.t / 0.5, (cur.dur - cur.t) / 1.0);
                hemiColor.setHex(b.color).lerp(new THREE.Color(0xff2010), 0.85 * a); lighting.hemi.color.copy(hemiColor);
            } else if (cur.kind === 'fog') {
                const a = Math.min(1, cur.t / 1.5, (cur.dur - cur.t) / 2.0);
                scene.fog.density = b.fog * (1 + 1.6 * a);
            }
            if (k >= 1) restore();
        },
        // Przy wyjściu z poziomu przywraca światło (poziom i tak zostanie wyczyszczony przez applyLighting)
        dispose() { restore(); }
    };
}
