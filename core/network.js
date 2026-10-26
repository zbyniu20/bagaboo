// ==========================================
// SIEĆ: 1 HOST + 9 GOŚCI (PeerJS), głos, raporty, wyciszanie, wyrzucanie
// Host rejestruje pokój pod stałym ID (prefiks + kod). Serwer PeerJS nie pozwoli drugiej osobie
// zostać hostem tego samego pokoju, a gość nie połączy się, dopóki host nie jest online.
// ==========================================
import { THREE, camera, scene, L, CANNON, containBall } from './engine.js';
import { createAvatar, poseHand, lookKey } from './avatar.js';
import { getLook, SESSION, SAVE } from './economy.js';
import { markAllDirty } from './terminal.js';

/* global Peer */
export const GAME_PREFIX = 'bagaboo-vr-v3-';
export const MAX_GUESTS = 9;
export const NET = { mode: 'solo', code: 'MAIN', status: 'Playing solo. Use the computer to host or join a room.', busy: false };
export const voice = { stream: null, on: true };
export let playersState = {};
export const remoteAvatars = {};
export const audioEls = {}, mutedPeers = new Set(), bannedNames = new Set(), reports = [];
let peer = null, hostConnection = null, clientConnections = [], myPeerId = 'solo-player', leaving = false;
const sharedObjectsState = {};
// Wiadomości poziomu (np. stan potwora w trybie Cisza). Poziom rejestruje jeden odbiornik.
let levelHandler = null;
export function onLevelMsg(fn) { levelHandler = fn; }
export function sendLevelMsg(payload) {
    if (NET.mode === 'host') clientConnections.forEach(c => { if (c.open) c.send({ type: 'lvl', payload: payload }); });
    else if (NET.mode === 'guest' && hostConnection && hostConnection.open) hostConnection.send({ type: 'lvl', payload: payload });
}
export function myId() { return myPeerId; }
// Stan hosta widziany przez gościa (pozycja, poziom)
export function hostState() { for (const id in playersState) if (isHostId(id)) return playersState[id]; return null; }
const statusDiv = document.getElementById('status');

export async function initMic() {
    try {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            voice.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            statusDiv.innerText = 'Mic access granted. Ready to play.';
        } else statusDiv.innerText = 'Mic not supported (HTTPS required). Voice disabled.';
    } catch (e) { statusDiv.innerText = 'Mic access denied. Voice chat disabled.'; }
}
export function sanitizeCode(c) { return String(c || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12); }
export function setStatus(msg) { NET.status = msg; statusDiv.innerText = msg; markAllDirty(); }
export function isHostId(id) { return id === GAME_PREFIX + NET.code; }

function playAudioStream(stream, peerId) {
    removeAudio(peerId);
    const a = document.createElement('audio'); a.srcObject = stream; a.autoplay = true; a.muted = mutedPeers.has(peerId);
    document.getElementById('audio-container').appendChild(a); audioEls[peerId] = a; markAllDirty();
}
function removeAudio(id) { if (audioEls[id]) { audioEls[id].srcObject = null; audioEls[id].remove(); delete audioEls[id]; } }

// --- Awatary innych graczy ---
function updateRemote(id, st) {
    if (!st || !st.head || !st.profile) return;
    const k = lookKey(st.profile);
    if (remoteAvatars[id] && remoteAvatars[id].key !== k) removeRemote(id);   // gracz zmienił wygląd w sklepie
    if (!remoteAvatars[id]) { const a = createAvatar(st.profile); scene.add(a.group); remoteAvatars[id] = a; }
    const p = remoteAvatars[id];
    p.head.position.fromArray(st.head.p); p.head.quaternion.fromArray(st.head.q);
    p.handL.position.fromArray(st.h1.p); p.handL.quaternion.fromArray(st.h1.q);
    p.handR.position.fromArray(st.h2.p); p.handR.quaternion.fromArray(st.h2.q);
    if (st.h1.g !== undefined) p.handL.userData.rig.target = st.h1.g;
    if (st.h2.g !== undefined) p.handR.userData.rig.target = st.h2.g;
    const e = new THREE.Euler().setFromQuaternion(p.head.quaternion, 'YXZ');
    p.torso.position.copy(p.head.position).add(new THREE.Vector3(0, -0.35, 0)); p.torso.rotation.set(0, e.y, 0);
    p.group.visible = (st.lvl || 'lobby') === L.levelId;   // widać tylko graczy na tym samym poziomie
}
function removeRemote(id) { if (remoteAvatars[id]) { scene.remove(remoteAvatars[id].group); delete remoteAvatars[id]; } }
export function poseRemoteHands(dt) { for (const id in remoteAvatars) { poseHand(remoteAvatars[id].handL.userData.rig, dt); poseHand(remoteAvatars[id].handR.userData.rig, dt); } }

function syncObject(id, data) {
    const ball = L.throwables.find(b => b.userData.id === id);
    if (ball && ball.userData.body.type === CANNON.Body.DYNAMIC && data && data.p) {
        const b = ball.userData.body;
        b.position.set(data.p[0], data.p[1], data.p[2]); b.quaternion.set(data.q[0], data.q[1], data.q[2], data.q[3]); b.velocity.set(data.v[0], data.v[1], data.v[2]);
        containBall(b);
    }
}
function bodyState(b) { return { p: [b.position.x, b.position.y, b.position.z], q: [b.quaternion.x, b.quaternion.y, b.quaternion.z, b.quaternion.w], v: [b.velocity.x, b.velocity.y, b.velocity.z] }; }
export function sendObjectMove(id, body) { if (NET.mode === 'guest' && hostConnection && hostConnection.open) hostConnection.send({ type: 'objectMove', id: id, payload: bodyState(body) }); }

function resetPeer() {
    leaving = true;
    clientConnections.forEach(c => { try { c.close(); } catch (e) {} }); clientConnections = [];
    if (hostConnection) { try { hostConnection.close(); } catch (e) {} } hostConnection = null;
    if (peer) { try { peer.destroy(); } catch (e) {} } peer = null;
    for (const id in remoteAvatars) removeRemote(id);
    for (const id in audioEls) removeAudio(id);
    playersState = {};
    leaving = false;
}
export function leaveNetwork(msg) { resetPeer(); NET.mode = 'solo'; NET.busy = false; myPeerId = 'solo-player'; setStatus(msg || 'Playing solo.'); }
function connById(id) { return clientConnections.find(c => c.peer === id); }
export function canKick(id) { return NET.mode === 'host' && !!connById(id); }
function hostStatus() { setStatus('Hosting room ' + NET.code + '. Players: ' + (clientConnections.length + 1) + ' of ' + (MAX_GUESTS + 1) + '.'); }

// cb = { ok(), fail() } – wywoływane po udanym lub nieudanym połączeniu
export function startHost(code, cb) {
    cb = cb || {}; code = sanitizeCode(code);
    if (!code) { setStatus('Type a room code first.'); if (cb.fail) cb.fail(); return; }
    resetPeer(); NET.busy = true; NET.code = code; setStatus('Creating room ' + code + '...');
    const p = new Peer(GAME_PREFIX + code); peer = p;
    const to = setTimeout(() => { if (peer === p && NET.busy) { leaveNetwork('The server did not answer. Try again.'); if (cb.fail) cb.fail(); } }, 9000);
    p.on('open', (id) => { clearTimeout(to); NET.busy = false; NET.mode = 'host'; myPeerId = id; hostStatus(); if (cb.ok) cb.ok(); });
    p.on('error', (err) => {
        clearTimeout(to); if (peer !== p) return;
        if (err.type === 'unavailable-id') leaveNetwork('Room ' + code + ' already has a host. Join it as a guest.');
        else if (NET.mode === 'host' && (err.type === 'peer-unavailable' || err.type === 'webrtc')) return;
        else leaveNetwork('Network error (' + err.type + '). Playing solo.');
        if (cb.fail) cb.fail();
    });
    p.on('connection', handleGuest);
    p.on('call', (call) => { if (voice.stream) call.answer(voice.stream); else call.answer(); call.on('stream', (s) => playAudioStream(s, call.peer)); });
}
function handleGuest(conn) {
    conn.on('open', () => {
        if (clientConnections.length >= MAX_GUESTS) { conn.send({ type: 'serverFull' }); setTimeout(() => { try { conn.close(); } catch (e) {} }, 500); return; }
        clientConnections.push(conn); hostStatus();
    });
    conn.on('data', (data) => {
        if (!data || !clientConnections.includes(conn)) return;
        if (data.type === 'playerUpdate') {
            const nm = data.payload && data.payload.profile && data.payload.profile.name;
            if (nm && bannedNames.has(nm)) { kickConn(conn, nm); return; }
            playersState[conn.peer] = data.payload; updateRemote(conn.peer, data.payload);
        } else if (data.type === 'objectMove') { sharedObjectsState[data.id] = data.payload; syncObject(data.id, data.payload); }
        else if (data.type === 'lvl') { if (levelHandler) levelHandler(data.payload, conn.peer); }
        else if (data.type === 'report' && data.payload) {
            const from = (playersState[conn.peer] && playersState[conn.peer].profile) ? playersState[conn.peer].profile.name : 'Guest';
            reports.push({ from: from, targetId: data.payload.targetId, targetName: String(data.payload.targetName || '?').slice(0, 16), reason: String(data.payload.reason || '').slice(0, 24), time: new Date().toLocaleTimeString() });
            if (reports.length > 50) reports.shift();
            setStatus('New report from ' + from + '. Open Reports on the computer.');
        }
    });
    conn.on('close', () => {
        clientConnections = clientConnections.filter(c => c !== conn);
        delete playersState[conn.peer]; removeRemote(conn.peer); removeAudio(conn.peer);
        if (!leaving && NET.mode === 'host') hostStatus();
    });
}
function kickConn(conn, name) {
    try { conn.send({ type: 'kicked' }); } catch (e) {}
    setTimeout(() => { try { conn.close(); } catch (e) {} }, 300);
    if (name) bannedNames.add(name);
}
export function kickPlayer(id) {
    if (NET.mode !== 'host') return;
    const st = playersState[id], name = st && st.profile ? st.profile.name : 'player', conn = connById(id);
    if (conn) kickConn(conn, st && st.profile ? st.profile.name : null);
    delete playersState[id]; removeRemote(id); removeAudio(id);
    setStatus('Removed ' + name + ' from the room. They cannot rejoin this session.');
}

export function startJoin(code, cb) {
    cb = cb || {}; code = sanitizeCode(code);
    if (!code) { setStatus('Type a room code first.'); if (cb.fail) cb.fail(); return; }
    resetPeer(); NET.busy = true; NET.code = code; setStatus('Looking for the host of room ' + code + '...');
    const p = new Peer(); peer = p;
    const to = setTimeout(() => { if (peer === p && NET.busy) { leaveNetwork('No host is online in room ' + code + '. The host has to log in first.'); if (cb.fail) cb.fail(); } }, 9000);
    p.on('open', (id) => {
        myPeerId = id;
        const conn = p.connect(GAME_PREFIX + code, { reliable: true }); hostConnection = conn;
        conn.on('open', () => {
            clearTimeout(to); NET.busy = false; NET.mode = 'guest';
            setStatus('Joined room ' + code + ' as a guest.');
            if (cb.ok) cb.ok();
            if (voice.stream) { const call = p.call(GAME_PREFIX + code, voice.stream); if (call) call.on('stream', (s) => playAudioStream(s, call.peer)); }
        });
        conn.on('data', (data) => {
            if (!data) return;
            if (data.type === 'serverFull') { leaveNetwork('Room ' + code + ' is full: 1 host and 9 guests.'); if (cb.fail) cb.fail(); return; }
            if (data.type === 'kicked') { leaveNetwork('The host removed you from room ' + code + '.'); return; }
            if (data.type === 'lvl') { if (levelHandler) levelHandler(data.payload, 'host'); return; }
            if (data.type === 'gameState') {
                const pl = data.payload.players || {};
                for (const pId in pl) { if (pId === myPeerId) continue; playersState[pId] = pl[pId]; updateRemote(pId, pl[pId]); }
                for (const pId in remoteAvatars) if (!pl[pId]) removeRemote(pId);
                for (const pId in playersState) if (!pl[pId]) delete playersState[pId];
                const objs = data.payload.objects || {};
                for (const objId in objs) if (L.heldId !== objId) syncObject(objId, objs[objId]);
            }
        });
        conn.on('close', () => { if (!leaving && NET.mode === 'guest') leaveNetwork('The host left room ' + code + '. Playing solo.'); });
    });
    p.on('error', (err) => {
        clearTimeout(to); if (peer !== p) return;
        if (NET.mode === 'guest' && err.type !== 'peer-unavailable' && err.type !== 'network') return;
        leaveNetwork(err.type === 'peer-unavailable' ? 'No host is online in room ' + code + '. The host has to log in first.' : 'Network error (' + err.type + '). Playing solo.');
        if (cb.fail) cb.fail();
    });
}

export function sendReport(target, reason) {
    if (!target) return;
    if (NET.mode === 'guest' && hostConnection && hostConnection.open) {
        hostConnection.send({ type: 'report', payload: { targetId: target.id, targetName: target.name, reason: reason } });
        setStatus('Report sent to the host: ' + target.name + ', ' + reason.toLowerCase() + '.');
    } else if (NET.mode === 'host') {
        reports.push({ from: SAVE.profile.name, targetId: target.id, targetName: target.name, reason: reason, time: new Date().toLocaleTimeString() });
        setStatus('Report saved for ' + target.name + '.');
    }
}
export function toggleMute(id) { if (mutedPeers.has(id)) mutedPeers.delete(id); else mutedPeers.add(id); if (audioEls[id]) audioEls[id].muted = mutedPeers.has(id); }
export function toggleVoice() {
    voice.on = !voice.on;
    if (voice.stream) voice.stream.getAudioTracks().forEach(t => t.enabled = voice.on);
    setStatus(voice.on ? 'Your microphone is on.' : 'Your microphone is off.');
}
export function otherPlayers() {
    const out = [];
    for (const id in playersState) {
        if (id === myPeerId) continue;
        const s = playersState[id]; if (!s || !s.profile) continue;
        out.push({ id: id, name: String(s.profile.name || 'Player').slice(0, 16), role: isHostId(id) ? 'Host' : 'Guest', s: s.s || {} });
    }
    return out;
}

// Wysyłanie stanu ~30 razy na sekundę
export function networkTick(handL, handR) {
    if (NET.mode === 'solo' || !handL || !handR) return;
    const hp = new THREE.Vector3(), hq = new THREE.Quaternion(); camera.getWorldPosition(hp); camera.getWorldQuaternion(hq);
    const l1p = new THREE.Vector3(), l1q = new THREE.Quaternion(); handL.getWorldPosition(l1p); handL.getWorldQuaternion(l1q);
    const l2p = new THREE.Vector3(), l2q = new THREE.Quaternion(); handR.getWorldPosition(l2p); handR.getWorldQuaternion(l2q);
    const myState = {
        profile: getLook(),
        lvl: L.levelId,
        head: { p: hp.toArray(), q: hq.toArray() },
        h1: { p: l1p.toArray(), q: l1q.toArray(), g: handL.userData.rig.grip },
        h2: { p: l2p.toArray(), q: l2q.toArray(), g: handR.userData.rig.grip },
        s: { h: SESSION.maxH, j: SESSION.jumps, e: (Date.now() - SESSION.since) / 1000 }
    };
    if (NET.mode === 'host') {
        for (const ball of L.throwables) sharedObjectsState[ball.userData.id] = bodyState(ball.userData.body);
        playersState[myPeerId] = myState;
        clientConnections.forEach(c => { if (c.open) c.send({ type: 'gameState', payload: { players: playersState, objects: sharedObjectsState } }); });
    } else if (hostConnection && hostConnection.open) {
        hostConnection.send({ type: 'playerUpdate', payload: myState });
    }
}
