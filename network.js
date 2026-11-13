// ==========================================
// SIEĆ: 1 HOST + 9 GOŚCI (PeerJS), głos, raporty, wyciszanie, wyrzucanie
// Host rejestruje pokój pod stałym ID (prefiks + kod). Serwer PeerJS nie pozwoli drugiej osobie
// zostać hostem tego samego pokoju, a gość nie połączy się, dopóki host nie jest online.
// ==========================================
import { THREE, camera, scene, L, CANNON, containBall } from './engine.js';
import { createAvatar, poseHand, lookKey, animateFace } from './avatar.js';
import { getLook, SESSION, SAVE } from './economy.js';
import { markAllDirty, toast } from './terminal.js';
import { rankOf, setLocalMod, isStaffName } from './config.js';
import { getAudioContext } from './audio.js';

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
// Drużyna idzie za hostem: host wysyła poziom (i ziarno układu), goście wchodzą tam za nim
let followHandler = null, lastFollow = null, inviteHandler = null;

// ---------- MODERACJA: wyrzucenie (można wrócić), ban na dobę, role ----------
const BAN_KEY = 'bagaboo_banlist', MY_BAN_KEY = 'bagaboo_banned', DAY = 24 * 3600 * 1000;
function banList() { try { return JSON.parse(localStorage.getItem(BAN_KEY)) || {}; } catch (e) { return {}; } }
function saveBanList(b) { try { localStorage.setItem(BAN_KEY, JSON.stringify(b)); } catch (e) {} }
export function bannedNamesList() { const b = banList(), now = Date.now(); return Object.keys(b).filter(n => b[n] > now).map(n => ({ name: n, until: b[n] })); }
export function unbanName(name) { const b = banList(); delete b[String(name).toLowerCase()]; saveBanList(b); markAllDirty(); }
function isBannedName(name) { const b = banList(), u = b[String(name || '').toLowerCase()]; return u && u > Date.now(); }
// Czy to urządzenie ma bana (sprawdzane na stronie startowej)
// ---------- WŁAMANIE DO POKOJU SZEFA ----------
// Host pilnuje, kto jest w pokoju szefa. Gość bez roli i bez zaproszenia = haker: skórka CHEATER na zawsze i ban na tydzień.
const WEEK = 7 * DAY, invitedToStaff = new Set();
let myInvited = false;
export function setInvitedToStaff(on) { myInvited = on; }
export function isInvitedToStaff() { return myInvited; }
export function selfBan(ms) { try { localStorage.setItem(MY_BAN_KEY, String(Date.now() + ms)); } catch (e) {} }
function checkIntruder(id, st) {
    if (NET.mode !== 'host' || !st || st.lvl !== 'staff' || !st.profile) return;
    if (isStaffName(st.profile.name) || invitedToStaff.has(id)) return;
    const conn = connById(id); if (!conn || conn.cheaterSent) return;
    conn.cheaterSent = true;
    const b = banList(); b[st.profile.name.toLowerCase()] = Date.now() + WEEK; saveBanList(b);
    try { conn.send({ type: 'cheater', until: Date.now() + WEEK }); } catch (e) {}
    setTimeout(() => { try { conn.close(); } catch (e) {} }, 400);
    setStatus(st.profile.name + ' broke into the staff room: CHEATER skin and a one-week ban.');
}
export function myBanUntil() { try { const u = +localStorage.getItem(MY_BAN_KEY) || 0; return u > Date.now() ? u : 0; } catch (e) { return 0; } }
function nameOf(id) { const st = playersState[id]; return st && st.profile ? st.profile.name : ''; }

// Host wykonuje polecenie moderatora: kick, ban, invite, mod (nadanie / odebranie roli)
function performMod(action, targetId, byName, extra) {
    const by = rankOf(byName), targetName = nameOf(targetId), target = rankOf(targetName);
    if (by === 0) return;
    if (action !== 'invite' && target >= by) return;   // tylko ktoś z wyższą rangą (ultimate admin może zbanować admina)
    if (action === 'mod' && by < 2) return;            // role nadaje tylko admin
    const conn = connById(targetId);
    if (action === 'kick' && conn) {
        try { conn.send({ type: 'kicked', temp: true, by: byName }); } catch (e) {}
        setTimeout(() => { try { conn.close(); } catch (e) {} }, 300);
        setStatus(targetName + ' was kicked by ' + byName + '. They can come back.');
    } else if (action === 'ban' && conn) {
        const b = banList(); b[targetName.toLowerCase()] = Date.now() + DAY; saveBanList(b);
        try { conn.send({ type: 'banned', until: Date.now() + DAY, by: byName }); } catch (e) {}
        setTimeout(() => { try { conn.close(); } catch (e) {} }, 300);
        setStatus(targetName + ' was banned for one day by ' + byName + '.');
    } else if (action === 'invite' && conn) { if ((extra || 'staff') === 'staff') invitedToStaff.add(targetId); conn.send({ type: 'invite', level: extra || 'staff' }); }
    else if (action === 'mod') {
        setLocalMod(targetName, !!extra);
        if (conn) conn.send({ type: 'role', mod: !!extra, name: targetName });
        setStatus(targetName + (extra ? ' is now a moderator.' : ' is no longer a moderator.'));
    }
}
// Wywołanie z gry (komputer, telewizor, młotek): host robi to od razu, gość prosi hosta
export function requestMod(action, targetId, extra) {
    const me = getLook().name;
    if (NET.mode === 'host') performMod(action, targetId, me, extra);
    else if (NET.mode === 'guest' && hostConnection && hostConnection.open) hostConnection.send({ type: 'modreq', action: action, target: targetId, extra: extra });
}
// Zaproszenie jednego gościa (np. do pokoju szefa) albo odesłanie go do lobby
export function onInvite(fn) { inviteHandler = fn; }
export function sendInvite(peerId, level) { const c = clientConnections.find(x => x.peer === peerId); if (NET.mode === 'host' && c && c.open) c.send({ type: 'invite', level: level }); }
export function onFollow(fn) { followHandler = fn; }
export function sendFollow(level, data) {
    lastFollow = { level: level, data: data || {} };
    if (NET.mode === 'host') clientConnections.forEach(c => { if (c.open) c.send({ type: 'follow', level: level, data: lastFollow.data }); });
}
// Stan hosta widziany przez gościa (pozycja, poziom)
export function hostState() { for (const id in playersState) if (isHostId(id)) return playersState[id]; return null; }
const statusDiv = document.getElementById('status');

export async function initMic() {
    try {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            voice.stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
            statusDiv.innerText = 'Mic access granted. Ready to play.';
        } else statusDiv.innerText = 'Mic not supported (HTTPS required). Voice disabled.';
    } catch (e) { statusDiv.innerText = 'Mic access denied. Voice chat disabled.'; }
}
export function sanitizeCode(c) { return String(c || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12); }
export function setStatus(msg) { NET.status = msg; statusDiv.innerText = msg; markAllDirty(); }
export function isHostId(id) { return id === GAME_PREFIX + NET.code; }

// ---------- GŁOS ----------
// Głos gracza gra przez kontekst dźwięku gry (odblokowany kliknięciem w menu), więc przeglądarka go nie blokuje.
// Element <audio> (wyciszony) jest potrzebny, bo bez niego Chrome nie oddaje dźwięku ze strumienia WebRTC.
const voiceGain = {}, voiceCalls = {};
// Analiza głosu (głośność i wysokość) do ruchu ust awatarów
const voiceAn = {}, faceBuf = new Uint8Array(256);
let myAn = null;
let cheaterHandler = null;
export function onCheater(fn) { cheaterHandler = fn; }
function makeAnalyser(ac, src) { const an = ac.createAnalyser(); an.fftSize = 512; an.smoothingTimeConstant = 0.3; src.connect(an); return an; }
function readVoice(an) {
    if (!an) return { level: 0, pitch: 0.5 };
    an.getByteFrequencyData(faceBuf);
    let sum = 0, wsum = 0;
    for (let i = 2; i < 120; i++) { sum += faceBuf[i]; wsum += faceBuf[i] * i; }   // pasmo mowy
    const level = Math.max(0, Math.min(1, (sum / 118 - 18) / 70));
    const pitch = sum > 0 ? Math.max(0, Math.min(1, (wsum / sum - 8) / 30)) : 0.5;
    return { level: level, pitch: pitch };
}
// Mój własny głos (do odbicia w lustrze)
export function myVoice() {
    const ac = getAudioContext();
    if (!myAn && ac && voice.stream) { try { myAn = makeAnalyser(ac, ac.createMediaStreamSource(voice.stream)); } catch (e) {} }
    return voice.on ? readVoice(myAn) : { level: 0, pitch: 0.5 };
}
// Co klatkę: usta i mimika innych graczy w rytm ich głosu
export function animateFaces(dt) {
    for (const id in remoteAvatars) { const v = mutedPeers.has(id) ? { level: 0, pitch: 0.5 } : readVoice(voiceAn[id]); animateFace(remoteAvatars[id].head, v.level, v.pitch, dt); }
}
let meshT = 0;
let silent = null;
// Cisza zamiast mikrofonu: gracz bez mikrofonu (albo bez zgody) nadal słyszy innych
function outStream() {
    if (voice.stream) return voice.stream;
    if (silent) return silent;
    const ac = getAudioContext(); if (!ac) return null;
    const dst = ac.createMediaStreamDestination(); silent = dst.stream; return silent;
}
function playAudioStream(stream, peerId) {
    removeAudio(peerId);
    const a = document.createElement('audio'); a.srcObject = stream; a.autoplay = true; a.muted = true; a.playsInline = true;
    document.getElementById('audio-container').appendChild(a); audioEls[peerId] = a;
    a.play().catch(() => {});
    const ac = getAudioContext();
    if (ac) {
        try {
            const src = ac.createMediaStreamSource(stream), g = ac.createGain();
            g.gain.value = mutedPeers.has(peerId) ? 0 : 1.6;
            src.connect(g); g.connect(ac.destination); voiceGain[peerId] = { src: src, g: g };
            voiceAn[peerId] = makeAnalyser(ac, src);
            if (ac.state !== 'running') ac.resume().catch(() => {});
        } catch (e) { a.muted = mutedPeers.has(peerId); }
    } else a.muted = mutedPeers.has(peerId);
    markAllDirty();
}
function removeAudio(id) {
    if (voiceGain[id]) { try { voiceGain[id].src.disconnect(); voiceGain[id].g.disconnect(); } catch (e) {} delete voiceGain[id]; }
    delete voiceAn[id];
    if (voiceCalls[id]) { try { voiceCalls[id].close(); } catch (e) {} delete voiceCalls[id]; }
    if (audioEls[id]) { audioEls[id].srcObject = null; audioEls[id].remove(); delete audioEls[id]; }
}
function answerCall(call) {
    const s = outStream(); if (s) call.answer(s); else call.answer();
    voiceCalls[call.peer] = call;
    call.on('stream', (st) => playAudioStream(st, call.peer));
    call.on('close', () => { if (voiceCalls[call.peer] === call) delete voiceCalls[call.peer]; });
}
function callPeer(id) {
    if (!peer || voiceCalls[id]) return;
    const s = outStream(); if (!s) return;
    const call = peer.call(id, s); if (!call) return;
    voiceCalls[id] = call;
    call.on('stream', (st) => playAudioStream(st, id));
    call.on('close', () => { if (voiceCalls[id] === call) delete voiceCalls[id]; });
    call.on('error', () => { if (voiceCalls[id] === call) delete voiceCalls[id]; });
}
// Gość łączy się głosowo z każdym innym gościem (każdą parę łączy ten z "mniejszym" id), więc wszyscy słyszą wszystkich
function meshVoice() {
    if (NET.mode !== 'guest') return;
    for (const id in playersState) {
        if (id === myPeerId || isHostId(id) || voiceCalls[id]) continue;
        if (myPeerId < id) callPeer(id);
    }
}

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
    p.torso.position.copy(p.head.position).add(new THREE.Vector3(0, -(p.torsoDrop || 0.35), 0)); p.torso.rotation.set(0, e.y, 0);
    p.group.visible = (st.lvl || 'lobby') === L.levelId;   // widać tylko graczy na tym samym poziomie
}
function removeRemote(id) { if (remoteAvatars[id]) { scene.remove(remoteAvatars[id].group); delete remoteAvatars[id]; } }
// Tryb Become the Monster: chowa awatar gracza, który wygląda jak wybrany potwór
export function setAvatarHidden(id, hidden) { const a = remoteAvatars[id]; if (a) a.group.visible = !hidden; }
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
    p.on('call', answerCall);
}
function handleGuest(conn) {
    conn.on('open', () => {
        if (clientConnections.length >= MAX_GUESTS) { conn.send({ type: 'serverFull' }); setTimeout(() => { try { conn.close(); } catch (e) {} }, 500); return; }
        clientConnections.push(conn); hostStatus();
        if (lastFollow && lastFollow.level !== 'lobby') conn.send({ type: 'follow', level: lastFollow.level, data: lastFollow.data });   // nowy gość dołącza tam, gdzie jest host
    });
    conn.on('data', (data) => {
        if (!data || !clientConnections.includes(conn)) return;
        if (data.type === 'playerUpdate') {
            const nm = data.payload && data.payload.profile && data.payload.profile.name;
            if (nm && (bannedNames.has(nm) || isBannedName(nm))) { try { conn.send({ type: 'banned', until: banList()[nm.toLowerCase()] || Date.now() + DAY }); } catch (e) {} kickConn(conn, null); return; }
            playersState[conn.peer] = data.payload; updateRemote(conn.peer, data.payload); checkIntruder(conn.peer, data.payload);
        } else if (data.type === 'objectMove') { sharedObjectsState[data.id] = data.payload; syncObject(data.id, data.payload); }
        else if (data.type === 'lvl') { if (levelHandler) levelHandler(data.payload, conn.peer); }
        else if (data.type === 'modreq') performMod(data.action, data.target === myPeerId ? null : data.target, nameOf(conn.peer), data.extra);
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
    p.on('call', answerCall);   // inni goście dzwonią do nas głosowo
    p.on('open', (id) => {
        myPeerId = id;
        const conn = p.connect(GAME_PREFIX + code, { reliable: true }); hostConnection = conn;
        conn.on('open', () => {
            clearTimeout(to); NET.busy = false; NET.mode = 'guest';
            setStatus('Joined room ' + code + ' as a guest.');
            if (cb.ok) cb.ok();
            callPeer(GAME_PREFIX + code);   // głos z hostem (także bez mikrofonu, żeby słyszeć innych)
        });
        conn.on('data', (data) => {
            if (!data) return;
            if (data.type === 'serverFull') { leaveNetwork('Room ' + code + ' is full: 1 host and 9 guests.'); if (cb.fail) cb.fail(); return; }
            if (data.type === 'kicked') { leaveNetwork(data.temp ? 'You were kicked from room ' + code + ' by ' + (data.by || 'the host') + '. You can join again.' : 'The host removed you from room ' + code + '.'); toast('You were kicked from the room', '#e0533f'); return; }
            if (data.type === 'banned') {
                try { localStorage.setItem(MY_BAN_KEY, String(data.until || Date.now() + DAY)); } catch (e) {}
                leaveNetwork('You are banned for one day.'); toast('You were banned for one day', '#e0533f');
                setTimeout(() => location.reload(), 2500);
                return;
            }
            if (data.type === 'cheater') { if (cheaterHandler) cheaterHandler(data.until); return; }
            if (data.type === 'invite' && data.level === 'staff') myInvited = true;
            if (data.type === 'role') { setLocalMod(data.name, data.mod); toast(data.mod ? 'You are now a moderator!' : 'You are no longer a moderator', '#ffd27a'); markAllDirty(); return; }
            if (data.type === 'lvl') { if (levelHandler) levelHandler(data.payload, 'host'); return; }
            if (data.type === 'follow') { if (followHandler) followHandler(data.level, data.data || {}); return; }
            if (data.type === 'invite') { if (inviteHandler) inviteHandler(data.level); return; }
            if (data.type === 'gameState') { if (performance.now() - (meshT || 0) > 2000) { meshT = performance.now(); setTimeout(meshVoice, 0); }
                const pl = data.payload.players || {};
                for (const pId in pl) { if (pId === myPeerId) continue; playersState[pId] = pl[pId]; updateRemote(pId, pl[pId]); }
                for (const pId in remoteAvatars) if (!pl[pId]) removeRemote(pId);
                for (const pId in playersState) if (!pl[pId]) { delete playersState[pId]; removeAudio(pId); }
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
export function toggleMute(id) {
    if (mutedPeers.has(id)) mutedPeers.delete(id); else mutedPeers.add(id);
    if (voiceGain[id]) voiceGain[id].g.gain.value = mutedPeers.has(id) ? 0 : 1.6;
    else if (audioEls[id]) audioEls[id].muted = mutedPeers.has(id);
}
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
