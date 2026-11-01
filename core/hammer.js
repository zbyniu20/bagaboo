// ==========================================
// MŁOTKI EKIPY: Kick hammer (wyrzuca z sesji, można wrócić) i Ban hammer (ban na dobę).
// Działają tylko dla admina i moderatorów. Trzeba zamachnąć się i trafić główką w głowę albo tułów gracza.
// Młotek zakłada się i kupuje na komputerze w pokoju szefa.
// ==========================================
import { THREE, scene, L } from './engine.js';
import { hands } from './player.js';
import { buildHammer } from './avatar.js';
import { SAVE } from './economy.js';
import * as N from './network.js';
import { isStaffName, isAdminName } from './config.js';
import { toast } from './terminal.js';
import { buzz } from './haptics.js';
import * as SFX from './audio.js';

const SWING_KICK = 1.8, SWING_BAN = 2.5;   // minimalna prędkość zamachu (m/s), żeby nie trafić przypadkiem
let mesh = null, tool = 'none', cool = 0, first = true;
const prev = new THREE.Vector3(), head = new THREE.Vector3(), q = new THREE.Quaternion(), hp = new THREE.Vector3();

export function updateHammer(dt) {
    const want = isStaffName(SAVE.profile.name) ? SAVE.equipped.tool : 'none';
    if (want !== tool) { if (mesh) scene.remove(mesh); mesh = buildHammer(want); if (mesh) scene.add(mesh); tool = want; first = true; }
    if (!mesh || !hands.R) return;
    hands.R.getWorldQuaternion(q);
    mesh.position.copy(hands.R.position); mesh.quaternion.copy(q);
    head.copy(mesh.userData.headOffset).applyQuaternion(q).add(hands.R.position);
    const speed = first ? 0 : head.distanceTo(prev) / Math.max(dt, 1 / 120);
    prev.copy(head); first = false;
    cool -= dt;
    if (cool > 0 || N.NET.mode === 'solo' || speed < (tool === 'ban' ? SWING_BAN : SWING_KICK)) return;
    for (const id in N.playersState) {
        if (id === N.myId()) continue;
        const st = N.playersState[id];
        if (!st || !st.head || !st.profile || (st.lvl || 'lobby') !== L.levelId) continue;
        hp.fromArray(st.head.p);
        const near = head.distanceTo(hp) < 0.45 || head.distanceTo(hp.clone().setY(hp.y - 0.45)) < 0.5;
        if (!near) continue;
        cool = 2;
        if (isAdminName(st.profile.name)) { toast('You cannot hit the admin', '#ffb030'); return; }
        N.requestMod(tool === 'ban' ? 'ban' : 'kick', id);
        SFX.bang(head); buzz(1, 1, 150);
        toast((tool === 'ban' ? 'BANNED ' : 'KICKED ') + st.profile.name, tool === 'ban' ? '#ff4a2a' : '#ffd27a');
        return;
    }
}
