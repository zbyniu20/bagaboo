// ==========================================
// EMOTKI: krótkie animacje avatara (machanie, brawa, taniec...) widoczne dla innych graczy.
// Poza to dokładnie sterujesz dłońmi sam (w VR kontrolerami), więc emotka zmienia tylko to, co widzą INNI i podgląd w szatni.
// Stan emotki (id i czas startu) idzie w stanie gracza (network.js), a zdalny avatar ustawia dłonie i głowę wg emotePose().
// ==========================================
import { THREE } from './engine.js';

export const EMOTES = {
    wave: { name: 'Wave', dur: 3.5 },
    cheer: { name: 'Cheer', dur: 3.2 },
    clap: { name: 'Clap', dur: 3.5 },
    bow: { name: 'Bow', dur: 3.0 },
    dance: { name: 'Dance', dur: 5.0 },
    flex: { name: 'Flex', dur: 3.5 },
    highfive: { name: 'High five', dur: 4.0 },   // dwóch graczy blisko siebie z tą emotką = przybijają piątkę (core/highfive.js)
    salute: { name: 'Salute', dur: 3.0 },
    shrug: { name: 'Shrug', dur: 3.0 },
    heart: { name: 'Heart', dur: 3.5 }
};
export const EMOTE = { id: null, t0: 0 };
export function playEmote(id) { if (!EMOTES[id]) return false; EMOTE.id = id; EMOTE.t0 = performance.now(); return true; }
export function stopEmote() { EMOTE.id = null; }
// Do stanu gracza: { id, t } (t = sekundy od startu) albo undefined. Po czasie trwania emotka sama się kończy.
export function emoteState() {
    if (!EMOTE.id) return undefined;
    const t = (performance.now() - EMOTE.t0) / 1000;
    if (t > EMOTES[EMOTE.id].dur) { EMOTE.id = null; return undefined; }
    return { id: EMOTE.id, t: Math.round(t * 100) / 100 };
}

const _e = new THREE.Euler(), _q = new THREE.Quaternion(), _pq = new THREE.Quaternion();
// a: avatar z polami head, handL, handR (Object3D z już ustawioną pozycją bazową). Zwraca true, gdy emotka trwa i pozy zostały nałożone.
export function emotePose(a, id, t) {
    const def = EMOTES[id]; if (!def || t > def.dur) return false;
    _e.setFromQuaternion(a.head.quaternion, 'YXZ'); const yaw = _e.y;
    const sn = Math.sin(yaw), cs = Math.cos(yaw), hx = a.head.position.x, hy = a.head.position.y, hz = a.head.position.z;
    // x w prawo, y w górę, z do przodu (względem głowy i jej kierunku patrzenia)
    const put = (hand, x, y, z, roll, pitch, grip) => {
        hand.position.set(hx + x * cs - z * sn, hy + y, hz - x * sn - z * cs);
        hand.quaternion.setFromEuler(_e.set(pitch || 0, yaw, roll || 0, 'YXZ'));
        if (hand.userData.rig) hand.userData.rig.target = grip === undefined ? 0 : grip;
    };
    const fade = Math.min(1, t / 0.25, (def.dur - t) / 0.25);   // płynne wejście i wyjście z pozy
    const S = Math.sin;
    if (id === 'wave') {
        put(a.handR, 0.3, 0.22 + 0.04 * S(t * 3), 0.15, S(t * 12) * 0.6 * fade, 0, 0);
        put(a.handL, -0.28, -0.5, 0.05, 0, 0, 0.3);
    } else if (id === 'cheer') {
        const y = 0.4 + 0.06 * S(t * 9) * fade;
        put(a.handL, -0.3, y, 0.05, 0.2, 0, 0); put(a.handR, 0.3, y, 0.05, -0.2, 0, 0);
        a.head.quaternion.premultiply(_q.setFromEuler(_e.set(-0.25 * fade, 0, 0, 'YXZ')));
    } else if (id === 'clap') {
        const open = 0.03 + 0.13 * (0.5 + 0.5 * Math.cos(t * 11));
        put(a.handL, -open, -0.3, 0.32, 0.9, 0, 0); put(a.handR, open, -0.3, 0.32, -0.9, 0, 0);
    } else if (id === 'bow') {
        const ph = S(Math.min(1, t / def.dur) * Math.PI);
        a.head.position.y -= 0.22 * ph; a.head.position.x += -sn * 0.12 * ph; a.head.position.z += -cs * 0.12 * ph;
        a.head.quaternion.premultiply(_q.setFromEuler(_e.set(0.9 * ph, 0, 0, 'YXZ')));
        put(a.handL, -0.3, -0.55 - 0.15 * ph, 0.05, 0, 0, 0.2); put(a.handR, 0.3, -0.55 - 0.15 * ph, 0.05, 0, 0, 0.2);
    } else if (id === 'dance') {
        const b = Math.abs(S(t * 6));
        a.head.position.y += 0.05 * b * fade;
        a.head.quaternion.premultiply(_q.setFromEuler(_e.set(0, 0, S(t * 3) * 0.12 * fade, 'YXZ')));
        put(a.handR, 0.45, 0.2 + 0.3 * S(t * 6), 0.1, S(t * 6) * 0.4, 0, 0); put(a.handL, -0.45, 0.2 + 0.3 * S(t * 6 + Math.PI), 0.1, -S(t * 6) * 0.4, 0, 0);
    } else if (id === 'flex') {
        const y = 0.12 + 0.05 * S(t * 7) * fade;
        put(a.handL, -0.42, y, 0.0, 0.5, 0, 1); put(a.handR, 0.42, y, 0.0, -0.5, 0, 1);
    } else if (id === 'highfive') {
        // prawa dłoń wyciągnięta w górę i do przodu, lekko drga w oczekiwaniu na przybicie
        put(a.handR, 0.22, 0.28 + 0.03 * S(t * 8) * fade, 0.42 + 0.03 * S(t * 8), -0.2, 0, 0);
        put(a.handL, -0.28, -0.5, 0.05, 0, 0, 0.3);
    } else if (id === 'salute') {
        // dłoń przy skroni, głowa lekko do góry
        put(a.handR, 0.13, 0.06 * fade, 0.2, -0.5, 0, 0);
        put(a.handL, -0.28, -0.5, 0.05, 0, 0, 0.3);
        a.head.quaternion.premultiply(_q.setFromEuler(_e.set(-0.12 * fade, 0, 0, 'YXZ')));
    } else if (id === 'shrug') {
        const up = 0.12 * (0.5 - 0.5 * Math.cos(Math.min(1, t / 0.4) * Math.PI)) * fade;
        a.head.position.y -= 0.03 * fade;
        a.head.quaternion.premultiply(_q.setFromEuler(_e.set(0, 0, 0.18 * fade * S(t * 2.5), 'YXZ')));
        put(a.handL, -0.45, -0.28 + up, 0.22, 0.6, 0, 0); put(a.handR, 0.45, -0.28 + up, 0.22, -0.6, 0, 0);
    } else if (id === 'heart') {
        // obie dłonie przed klatką, kciuki i palce razem: kształt serca, które bije
        const b = 1 + 0.12 * Math.max(0, S(t * 7));
        put(a.handL, -0.09 * b, -0.18, 0.36, 0.9, 0, 0.6); put(a.handR, 0.09 * b, -0.18, 0.36, -0.9, 0, 0.6);
        a.head.quaternion.premultiply(_q.setFromEuler(_e.set(0, 0, 0.1 * fade * S(t * 2), 'YXZ')));
    }
    return true;
}
