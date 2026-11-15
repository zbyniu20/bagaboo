// ==========================================
// PRZYBIJANIE PIĄTKI: dwóch graczy blisko siebie robi emotkę "High five" w tym samym czasie = klaśnięcie dłoni.
// Każdy klient wykrywa to sam (po stanie emotki drugiego gracza z sieci), więc nie potrzeba osobnej wiadomości. Cooldown 5 s na parę.
// ==========================================
import { THREE, camera } from './engine.js';
import { EMOTE } from './emotes.js';
import { remoteAvatars, playersState, nameOfPlayer } from './network.js';
import * as SFX from './audio.js';
import { toast } from './terminal.js';
import { bumpStat } from './economy.js';
import { buzz } from './haptics.js';

export const HF = { range: 1.7, minT: 0.4, maxT: 3.8, cooldown: 5000 };
const cool = {}, _a = new THREE.Vector3(), _b = new THREE.Vector3();
export function updateHighFive() {
    if (EMOTE.id !== 'highfive') return;
    const mine = (performance.now() - EMOTE.t0) / 1000;
    if (mine < HF.minT || mine > HF.maxT) return;
    camera.getWorldPosition(_a);
    const now = performance.now();
    for (const id in remoteAvatars) {
        const em = playersState[id] && playersState[id].em;
        if (!em || em.id !== 'highfive' || em.t < HF.minT || em.t > HF.maxT || (cool[id] || 0) > now) continue;
        remoteAvatars[id].head.getWorldPosition(_b);
        if (Math.abs(_a.y - _b.y) > 0.8 || Math.hypot(_a.x - _b.x, _a.z - _b.z) > HF.range) continue;
        cool[id] = now + HF.cooldown;
        SFX.slap({ x: (_a.x + _b.x) / 2, y: (_a.y + _b.y) / 2 - 0.2, z: (_a.z + _b.z) / 2 });
        buzz('both', 0.8, 120);
        toast('High five with ' + nameOfPlayer(id) + '!', '#ffd27a');
        bumpStat('highFives');
        return;
    }
}
