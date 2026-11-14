// ==========================================
// WSPÓLNE POMOCNIKI TRYBÓW RUND (King of the Hill, Infection, Dodgeball): lista uczestników, role w sieci,
// pozycje głów i dłoni graczy (lokalnych, zdalnych i botów), autorytet hosta.
// Host liczy stan rundy i rozsyła go co 0,2 s; gość bez hosta w tym poziomie liczy sam (jak gracz solo).
// ==========================================
import { THREE, camera } from './engine.js';
import { hands } from './player.js';
import * as N from './network.js';

const _p = new THREE.Vector3();
export const toNet = (id) => id === 'me' ? N.myId() : id;
export const fromNet = (id) => id === N.myId() ? 'me' : id;
// Kto bierze udział: ja i (u hosta) goście, którzy są w tym samym poziomie
export function participants(level) {
    const list = ['me'];
    if (N.NET.mode === 'host') for (const id in N.playersState) { if (id === N.myId()) continue; const st = N.playersState[id]; if (st && st.lvl === level && st.head) list.push(id); }
    return list;
}
export function isAuthority(level, S) {
    if (N.NET.mode !== 'guest') return true;
    const hs = N.hostState();
    return !(hs && hs.lvl === level && S.clock - S.lastHostMsg < 1.5);
}
export function handsOf(id, bots) {
    if (id === 'me') return hands.L ? [hands.L.position, hands.R.position] : [];
    if (bots && bots[id]) return [bots[id].head()];
    const st = N.playersState[id]; if (!st || !st.h1) return [];
    return [new THREE.Vector3().fromArray(st.h1.p), new THREE.Vector3().fromArray(st.h2.p)];
}
export function headOf(id, bots) {
    if (id === 'me') { camera.getWorldPosition(_p); return _p.clone(); }
    if (bots && bots[id]) return bots[id].head();
    const st = N.playersState[id]; return st && st.head ? new THREE.Vector3().fromArray(st.head.p) : null;
}
// Czy któraś z dłoni (lista wektorów) jest przy głowie albo tułowiu (0,45 m niżej) celu
export function touching(handList, head, dist) {
    if (!head) return false;
    const d = dist || 0.5, body = head.clone(); body.y -= 0.45;
    return handList.some(h => h.distanceTo(head) < d || h.distanceTo(body) < d + 0.05);
}
