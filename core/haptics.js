// ==========================================
// WIBRACJE KONTROLERÓW: dotyk ścian, jumpscare'y, bicie serca, chwyt liny
// hand: 0 lub 1 (indeks kontrolera, tak jak dłonie gracza), 'both' = oba
// ==========================================
import { renderer } from './engine.js';
import { SETTINGS } from './settings.js';

export function buzz(hand, intensity, ms) {
    if (SETTINGS.haptics === false) return;
    const session = renderer.xr.getSession && renderer.xr.getSession();
    if (!session) return;
    const v = Math.max(0, Math.min(1, intensity));
    if (v <= 0.01) return;
    let i = 0;
    for (const src of session.inputSources) {
        if (hand === 'both' || hand === i) {
            const gp = src.gamepad;
            const act = gp && ((gp.hapticActuators && gp.hapticActuators[0]) || gp.vibrationActuator);
            try {
                if (act && act.pulse) act.pulse(v, ms);
                else if (act && act.playEffect) act.playEffect('dual-rumble', { duration: ms, strongMagnitude: v, weakMagnitude: v });
            } catch (e) {}
        }
        i++;
    }
}
