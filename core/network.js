// ==========================================
// SIEĆ: 1 HOST + 9 GOŚCI (PeerJS), głos, raporty, wyciszanie, wyrzucanie
// Host rejestruje pokój pod stałym ID (prefiks + kod). Serwer PeerJS nie pozwoli drugiej osobie
// zostać hostem tego samego pokoju, a gość nie połączy się, dopóki host nie jest online.
// ==========================================
import { emoteState, emotePose } from './emotes.js';
import { THREE, camera, scene, L, CANNON, containBall, playerRig, tex, renderer } from './engine.js';
import { createAvatar, poseHand, lookKey, animateFace, TAGS, updateAvatarFx, addWound, clearWounds, applyGrime } from './avatar.js';
import { createVoiceHub } from './voicehub.js';
import { getLook, SESSION, SAVE } from './economy.js';
import { petLookNet, petCarryNet } from './petstore.js';
import { markAllDirty, toast } from './terminal.js';
import { rankOf, setLocalMod, isStaffName, isOwnerName, isUltimateName, isReservedNick, canPunish, BANS_CLEARED, isModMenuUser } from './config.js';
import { MOD } from './modstate.js';
import { getAudioContext, stinger } from './audio.js';
import { GAMES_CALM, SETTINGS } from './settings.js';
import { account as myAccount, vouch, verifyProof, randomNonce } from './auth.js';
import { lostLeft, lostRight, lostHead } from './dismemberlogic.js';
import { SPEC } from './spectatelogic.js';

/* global Peer */
export const GAME_PREFIX = 'bagaboo-vr-v3-';
export const MAX_GUESTS = 9;
export const NET = { mode: 'solo', code: 'MAIN', status: 'Playing solo. Use the computer to host or join a room.', busy: false };
export const voice = { stream: null, on: true };
// Obiekty bez prototypu: klucze pochodzą z sieci (id peera, id przedmiotu), więc '__proto__' czy 'constructor' nie mogą niczego nadpisać
export let playersState = Object.create(null);
export const remoteAvatars = {};
export const audioEls = {}, mutedPeers = new Set(), bannedNames = new Set(), reports = [];
const HOST_PROOF_WAIT_MS = 12000;   // tyle host ma na dowód, zanim jego nick ekipy uznamy za fałszywy
const HOST_AUD_PREFIX = 'H:';
// Dowód hosta z ponawianiem: chwilowy błąd sieci nie może zrobić z prawdziwego hosta podejrzanego (gość czeka na dowód HOST_PROOF_WAIT_MS)
function vouchRetry(aud, nonce, tries) { return vouch(aud, nonce).then((p) => p || (tries > 1 ? new Promise((r) => setTimeout(r, 1500)).then(() => vouchRetry(aud, nonce, tries - 1)) : null)); }   // adresat dowodu hosta (dowód gościa ma sam GAME_PREFIX + kod)
let peer = null, hostConnection = null, clientConnections = [], myPeerId = 'solo-player', leaving = false;
const sharedObjectsState = Object.create(null);
// Wiadomości poziomu (np. stan potwora w trybie Cisza). Poziom rejestruje jeden odbiornik.
let levelHandler = null;
export function onLevelMsg(fn) { levelHandler = fn; }
// Obserwator (core/spectate.js) ukrywa awatar u innych, ale flaga sp pochodzi od klienta: host honoruje ją tylko, gdy poziom potwierdzi, że ten gracz naprawdę odpadł
// (Become the Monster: złapany w trakcie rundy). Bez tego każdy mógłby być niewidoczny, np. w Hide & Seek.
let spectatorCheck = null;
export function setSpectatorCheck(fn) { spectatorCheck = fn; }
export function sendLevelMsg(payload) {
    if (NET.mode === 'host') clientConnections.forEach(c => { if (c.open) c.send({ type: 'lvl', payload: payload }); });
    else if (NET.mode === 'guest' && hostConnection && hostConnection.open) hostConnection.send({ type: 'lvl', payload: payload });
}
export function myId() { return myPeerId; }
// Wiadomości adresowane do jednego gracza (prezenty): goście wysyłają przez hosta, host przekazuje dalej.
let routedHandler = null;
export function onRouted(fn) { routedHandler = fn; }
export function sendRouted(to, msg) {
    if (NET.mode === 'host') { const c = clientConnections.find(x => x.peer === to); if (c && c.open) c.send({ type: 'routed', from: myPeerId, msg: msg }); }
    else if (NET.mode === 'guest' && hostConnection && hostConnection.open) hostConnection.send({ type: 'route', to: to, msg: msg });
}
const cleanRouted = (m) => (m && typeof m === 'object' && typeof m.k === 'string' && m.k.length < 16) ? { k: m.k, item: String(m.item || '').slice(0, 40), ok: !!m.ok } : null;
// Drużyna idzie za hostem: host wysyła poziom (i ziarno układu), goście wchodzą tam za nim
let followHandler = null, lastFollow = null, inviteHandler = null, goobyHandler = null, noobHandler = null;
export function onGooby(fn) { goobyHandler = fn; }
export function onNoob(fn) { noobHandler = fn; }   // main.js: jumpscare "NOOB" dla gracza dotkniętego ręką przez ultimate admina
// ---------- NOOB: gdy ultimate admin (zbyniu) dotknie dłonią innego gracza, dotknięty dostaje jumpscare z napisem NOOB i głośnym dźwiękiem ----------
// Liczy tylko host z własnego widoku graczy (pozycje dłoni i głów), a ultimate admina rozpoznaje po nicku potwierdzonym przez serwer kont (conn.vNick albo własne konto hosta).
// Dotknięty może dostać go najwyżej raz na NOOB_COOLDOWN ms. W BagaBoo Games jumpscare'ów nie ma (GAMES_CALM zatrzymuje go po stronie dotkniętego).
const NOOB_DIST = 0.45, NOOB_COOLDOWN = 8000, noobCd = Object.create(null);
const pt3 = (a) => Array.isArray(a) && a.length >= 3 && a.every(Number.isFinite) ? a : null;
function noobCheck() {
    const now = Date.now(), me = myAccount();
    for (const uid in playersState) {
        const nick = uid === myPeerId ? (me && me.nick) : verifiedNickOf(uid);
        if (!nick || !isUltimateName(nick)) continue;
        const u = playersState[uid], hands = u && u.h1 && u.h2 ? [pt3(u.h1.p), pt3(u.h2.p)].filter(Boolean) : []; if (!hands.length) continue;
        for (const vid in playersState) {
            if (vid === uid || (noobCd[vid] || 0) > now) continue;
            const v = playersState[vid], hd = v && v.head ? pt3(v.head.p) : null; if (!hd || v.lvl !== u.lvl) continue;
            if (hands.some(h => Math.hypot(h[0] - hd[0], h[1] - hd[1], h[2] - hd[2]) < NOOB_DIST || Math.hypot(h[0] - hd[0], h[1] - (hd[1] - 0.45), h[2] - hd[2]) < NOOB_DIST + 0.05)) {   // głowa albo tułów
                noobCd[vid] = now + NOOB_COOLDOWN;
                if (vid === myPeerId) { if (noobHandler) noobHandler(); }
                else { const gc = connById(vid); if (gc) { try { gc.send({ type: 'noob' }); } catch (e) {} } }
            }
        }
    }
}
export function triggerGooby() { if (goobyHandler) goobyHandler(); }   // lokalny podgląd jumpscare'a Gooby (manekin treningowy w lobby)   // main.js: pokazuje jumpscare Gooby, gdy ktoś trafi nas Nothing Hammerem

// ---------- MODERACJA: wyrzucenie (można wrócić), ban na dobę, role ----------
const BAN_KEY = 'bagaboo_banlist', MY_BAN_KEY = 'bagaboo_banned', DAY = 24 * 3600 * 1000;
function banList() { try { return JSON.parse(localStorage.getItem(BAN_KEY)) || {}; } catch (e) { return {}; } }
function saveBanList(b) { try { localStorage.setItem(BAN_KEY, JSON.stringify(b)); } catch (e) {} }
// Gracze, którzy próbowali wejść z banem (zapisani u hosta), żeby właściciel mógł ich odbanować z listy
const ATT_KEY = 'bagaboo_blocked', UNBAN_KEY = 'bagaboo_unbanned', EPOCH_KEY = 'bagaboo_ban_epoch', WEEK_MS = 7 * DAY;
let unbannedNow = false;
// Jednorazowe zdjęcie wszystkich banów na tym urządzeniu (gdy w config.js wzrośnie BANS_CLEARED)
try {
    if ((+localStorage.getItem(EPOCH_KEY) || 0) < BANS_CLEARED) {
        [BAN_KEY, MY_BAN_KEY, ATT_KEY, UNBAN_KEY].forEach(k => localStorage.removeItem(k));
        localStorage.setItem(EPOCH_KEY, String(BANS_CLEARED));
    }
} catch (e) {}
function readMap(k) { try { return JSON.parse(localStorage.getItem(k)) || {}; } catch (e) { return {}; } }
function writeMap(k, m) { try { localStorage.setItem(k, JSON.stringify(m)); } catch (e) {} }
export function bannedNamesList() {
    const b = banList(), a = readMap(ATT_KEY), now = Date.now(), out = {};
    for (const n of Object.keys(b)) if (b[n] > now) out[n] = b[n];
    for (const n of Object.keys(a)) if (a[n] > now && !out[n]) out[n] = a[n];
    return Object.keys(out).map(n => ({ name: n, until: out[n] }));
}
// Odbanować może tylko właściciel (BoyIsGamer) albo ultimate admin. Odbanowany gracz wchodzi od razu, także jeśli ban został zapisany na jego urządzeniu.
export function canUnban() { const a = myAccount(); return !!a && (isOwnerName(a.nick) || isUltimateName(a.nick)); }   // tylko zalogowane konto właściciela / ultimate admina
export function unbanName(name) {
    if (!canUnban()) return false;
    const k = String(name).toLowerCase(), b = banList(), a = readMap(ATT_KEY), u = readMap(UNBAN_KEY);
    delete b[k]; delete a[k]; saveBanList(b); writeMap(ATT_KEY, a);
    for (const x of [...bannedNames]) if (String(x).toLowerCase() === k) bannedNames.delete(x);
    u[k] = Date.now() + WEEK_MS; writeMap(UNBAN_KEY, u);
    setStatus(name + ' was unbanned. They can join right away.'); markAllDirty();
    return true;
}
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
    const conn = connById(id);
    if (isStaffName(conn && conn.vNick || '') || invitedToStaff.has(id)) return;   // ekipą jest tylko ten, kto ma dowód z serwera kont (nick zgłoszony przez klienta nic nie znaczy)
    if (!conn || conn.cheaterSent) return;
    conn.cheaterSent = true;
    const b = banList(); b[st.profile.name.toLowerCase()] = Date.now() + WEEK; saveBanList(b);
    try { conn.send({ type: 'cheater', until: Date.now() + WEEK }); } catch (e) {}
    setTimeout(() => { try { conn.close(); } catch (e) {} }, 400);
    setStatus(st.profile.name + ' broke into the staff room: CHEATER skin and a one-week ban.');
}
export function myBanUntil() { try { const u = +localStorage.getItem(MY_BAN_KEY) || 0; return u > Date.now() ? u : 0; } catch (e) { return 0; } }
export function nameOfPlayer(id) { return nameOf(id) || 'Someone'; }
function nameOf(id) { const st = playersState[id]; return st && st.profile ? st.profile.name : ''; }
// Nick potwierdzony przez serwer kont (dowód wejścia), a nie nick zgłoszony przez klienta. Pusty = gracz bez konta albo bez dowodu.
// Host sam jest zweryfikowany tylko wtedy, gdy jest zalogowany.
function verifiedNickOf(id) {
    if (id === myPeerId) { const a = myAccount(); return a ? a.nick : ''; }
    const c = connById(id); return c && c.vNick ? c.vNick : '';
}
// Niewidzialność (BagaBooModMenu): liczy się tylko u gracza ze zweryfikowanym kontem z listy menu. Admini z menu zawsze widzą się nawzajem.
function isHiddenFrom(id, st, viewerId) {
    if (!st || !st.inv || !isModMenuUser(verifiedNickOf(id))) return false;
    return !isModMenuUser(verifiedNickOf(viewerId));
}

// Host wykonuje polecenie moderatora: kick, ban, invite, mod (nadanie / odebranie roli)
// byNick to ZWERYFIKOWANY nick wywołującego (pusty = brak uprawnień). Ranga celu też liczy się tylko ze zweryfikowanego nicku.
function performMod(action, targetId, byNick, extra) {
    const by = rankOf(byNick || ''), targetNick = verifiedNickOf(targetId), targetName = targetNick || nameOf(targetId), target = rankOf(targetNick);
    if (by === 0) return;
    if (action === 'gooby') {   // Nothing Hammer: to tylko jumpscare, więc bez sprawdzania rangi celu; cel to gość (wiadomość) albo sam host (od razu)
        const gc = connById(targetId);
        if (gc) { try { gc.send({ type: 'gooby' }); } catch (e) {} }
        else if ((targetId === null || targetId === undefined || targetId === myPeerId) && goobyHandler) goobyHandler();   // gość, który trafił hosta, wysyła cel jako null (patrz modreq)
        return;
    }
    if (action !== 'invite' && action !== 'mod' && !canPunish(byNick, targetNick)) return;   // ekipa nie banuje ekipy; wszystkich może tylko ultimate admin
    if (action === 'mod' && target >= by) return;
    if (action === 'mod' && by < 2) return;            // role nadaje tylko admin
    if (action === 'mod' && extra && !targetNick) { setStatus('Only a player who is logged in to an account can become a moderator.'); return; }
    const byName = byNick;
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
    const a = myAccount(), me = a ? a.nick : '';   // bez zalogowanego konta host nie ma rangi
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

// Mikrofon: pytamy przy starcie strony i jeszcze raz przy kliknięciu Host / Join / Solo, jeśli wcześniej się nie udało
export async function ensureMic() { if (!voice.stream) await initMic(); }
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
const voiceCalls = {};
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
// Gość słyszy miks hosta, więc poziomu głosu poszczególnych graczy nie wyliczy ze strumienia: każdy gracz podaje swój poziom (vl, vp) w stanie
function stateVoice(id) { const st = playersState[id]; const l = st && +st.vl, p = st && +st.vp; return { level: l > 0 ? Math.min(1, l) : 0, pitch: p >= 0 && p <= 1 ? p : 0.5 }; }
// Co klatkę: usta i mimika innych graczy w rytm ich głosu
const _cw = new THREE.Vector3(), _hw = new THREE.Vector3();
export function animateFaces(dt) {
    camera.getWorldPosition(_cw);
    for (const id in remoteAvatars) {
        const a = remoteAvatars[id]; a.head.getWorldPosition(_hw);
        const close = _hw.distanceTo(_cw) < 0.9;   // inny gracz tuż przy tobie: widzisz tylko jego dłonie, a nie wnętrze jego ciała
        const dc = tears[id] ? (tears[id].from || 0) : (dismembered[id] || 0);   // w trakcie animacji wcześniej urwane części zostają ukryte, nowa jeszcze widoczna   // urwane części (core/dismemberlogic.js) zostają ukryte, także gdy gracz stoi przy nas
        for (const c of a.group.children) if (c !== a.handL && c !== a.handR) c.visible = !close && !((c === a.head && lostHead(dc)) || (c === a.armL && lostLeft(dc)) || (c === a.armR && lostRight(dc)));
    }
    for (const id in remoteAvatars) { const v = mutedPeers.has(id) ? { level: 0, pitch: 0.5 } : (NET.mode === 'guest' ? stateVoice(id) : readVoice(voiceAn[id])); animateFace(remoteAvatars[id].head, v.level, v.pitch, dt); updateAvatarFx(remoteAvatars[id], camera, !!(renderer.xr && renderer.xr.isPresenting), v.level, performance.now() / 1000); }
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
// Głos gra zwykłym elementem <audio> (najpewniejsza droga w przeglądarce gogli).
// Kontekst dźwięku gry tylko analizuje głos (do ruchu ust), nie odtwarza go.
const pendingPlay = new Set();
function tryPlay(a) { const pr = a.play(); if (pr && pr.catch) pr.catch(() => pendingPlay.add(a)); }
// Przeglądarka może wstrzymać dźwięk do pierwszego kliknięcia: przy każdym kliknięciu / spuście ponawiamy odtwarzanie
export function unlockVoices() { for (const a of pendingPlay) { pendingPlay.delete(a); tryPlay(a); } for (const id in audioEls) if (audioEls[id].paused) tryPlay(audioEls[id]); const ac = getAudioContext(); if (ac && ac.state !== 'running') ac.resume().catch(() => {}); }
window.addEventListener('pointerdown', unlockVoices);
window.addEventListener('keydown', unlockVoices);
function playAudioStream(stream, peerId) {
    removeAudio(peerId, true);
    const a = document.createElement('audio'); a.srcObject = stream; a.autoplay = true; a.playsInline = true;
    a.muted = NET.mode !== 'guest' && mutedPeers.has(peerId); a.volume = 1;   // gość słucha miksu hosta: wyciszanie robi host
    document.getElementById('audio-container').appendChild(a); audioEls[peerId] = a;
    tryPlay(a);
    const ac = getAudioContext();
    if (ac) { try { voiceAn[peerId] = makeAnalyser(ac, ac.createMediaStreamSource(stream)); } catch (e) {} }
    markAllDirty();
}
function removeAudio(id, keepCall) {
    delete voiceAn[id];
    if (!keepCall && voiceCalls[id]) { try { voiceCalls[id].close(); } catch (e) {} delete voiceCalls[id]; }
    if (audioEls[id]) { audioEls[id].srcObject = null; audioEls[id].remove(); delete audioEls[id]; }
}
// Centrala głosu hosta (miksuje głosy dla gości, patrz voicehub.js). Źródło hosta ma id hosta.
let hub = null, hubHostMic = false;
function getHub() {
    const ac = getAudioContext(); if (!ac) return null;
    if (!hub || hub.ac !== ac) { hub = createVoiceHub(ac); hub.ac = ac; hubHostMic = false; ac.onstatechange = () => { if (ac.state !== 'running') resumeVoiceAc(); }; }
    if (ac.state !== 'running') resumeVoiceAc();
    if (!hubHostMic && voice.stream) { hub.addSource(myPeerId, voice.stream); hubHostMic = true; }
    return hub;
}
function answerCall(call) {
    const h = NET.mode === 'host' ? getHub() : null;   // host odpowiada miksem pozostałych; gość nie odbiera już połączeń od gości
    const s = h ? h.mixFor(call.peer) : outStream(); if (s) call.answer(s); else call.answer();
    voiceCalls[call.peer] = call;
    call.on('stream', (st) => { playAudioStream(st, call.peer); if (h) h.addSource(call.peer, st); });
    call.on('close', () => { if (voiceCalls[call.peer] === call) delete voiceCalls[call.peer]; if (h) h.removeListener(call.peer); });
}
const callAt = {};   // kiedy zaczęliśmy dzwonić do danego gracza (do ponawiania połączeń, które nie doszły)
function callPeer(id) {
    if (!peer || voiceCalls[id]) return;
    const s = outStream(); if (!s) return;
    const call = peer.call(id, s); if (!call) return;
    call.silentOut = !voice.stream;   // zadzwoniliśmy z cichym strumieniem (brak mikrofonu): gdy mikrofon się pojawi, podmieniamy ścieżkę (attachMic)
    voiceCalls[id] = call; callAt[id] = performance.now();
    call.on('stream', (st) => playAudioStream(st, id));
    call.on('close', () => { if (voiceCalls[id] === call) delete voiceCalls[id]; if (audioEls[id] && !playersState[id]) removeAudio(id, true); });
    call.on('error', () => { if (voiceCalls[id] === call) delete voiceCalls[id]; });
}
// Pilnowanie głosu. Gdy AudioContext hosta się zawiesi (przeglądarka gogli, wejście w VR, zmiana karty), miks hosta milknie: host dalej słyszy
// wszystkich (bezpośrednie strumienie), a goście nie słyszą nikogo. Dlatego co 1,5 s wznawiamy kontekst, a przy okazji: dołączamy własny mikrofon hosta
// do centrali, jeśli dostał go dopiero teraz, podmieniamy cichą ścieżkę w połączeniach gościa, gdy mikrofon się pojawi, i ponawiamy wstrzymane <audio>.
let voiceWatch = null;
function resumeVoiceAc() { const ac = getAudioContext(); if (ac && ac.state !== 'running') { try { const pr = ac.resume(); if (pr && pr.catch) pr.catch(() => {}); } catch (e) {} } }
function attachMic(id) {
    const call = voiceCalls[id]; if (!call || !call.silentOut || !voice.stream) return;
    const track = voice.stream.getAudioTracks()[0], pc = call.peerConnection; if (!track || !pc) return;
    const sender = pc.getSenders().find((x) => x.track && x.track.kind === 'audio'); if (!sender) return;
    sender.replaceTrack(track).then(() => { call.silentOut = false; }).catch(() => {});
}
function startVoiceWatch() {
    if (voiceWatch) return;
    voiceWatch = setInterval(() => {
        resumeVoiceAc();
        if (NET.mode === 'host') getHub();   // dołącza mikrofon hosta, jeśli pojawił się po utworzeniu centrali
        for (const id in audioEls) if (audioEls[id].paused) tryPlay(audioEls[id]);
        if (voice.stream) for (const id in voiceCalls) attachMic(id);
    }, 1500);
}
function stopVoiceWatch() { if (voiceWatch) { clearInterval(voiceWatch); voiceWatch = null; } }
document.addEventListener('visibilitychange', resumeVoiceAc);
window.addEventListener('focus', resumeVoiceAc);
// Do diagnozy (konsola / testy): stan kontekstu dźwięku, centrali i połączeń głosowych
export function voiceDebug() { const ac = getAudioContext(); return { mode: NET.mode, acState: ac ? ac.state : null, hub: hub ? hub.info() : null, hostMic: hubHostMic, calls: Object.keys(voiceCalls), audio: Object.keys(audioEls) }; }
// Gość łączy się głosowo z każdym innym gościem (każdą parę łączy ten z "mniejszym" id), więc wszyscy słyszą wszystkich
// Połączenie, które nie dało dźwięku w ciągu 10 s (rozmówca jeszcze nie nasłuchiwał albo połączenie zawisło), zamykamy i ponawiamy:
// wcześniej takie zawieszone połączenie blokowało rozmowę do końca sesji, a działał tylko głos hosta.
function retryStaleCall(id) {
    const c = voiceCalls[id];
    if (c && !audioEls[id] && performance.now() - (callAt[id] || 0) > 10000) { try { c.close(); } catch (e) {} delete voiceCalls[id]; callPeer(id); }
}
function meshVoice() {
    // Gość łączy się głosowo tylko z hostem (host miksuje resztę). Zawieszone połączenie z hostem ponawiamy.
    if (NET.mode === 'guest') retryStaleCall(GAME_PREFIX + NET.code);
}

// --- Awatary innych graczy ---
function updateRemote(id, st) {
    if (!st || !st.head || !st.profile) return;
    const k = lookKey(st.profile);
    if (remoteAvatars[id] && remoteAvatars[id].key !== k) removeRemote(id);   // gracz zmienił wygląd w sklepie
    if (!remoteAvatars[id]) { const a = createAvatar(st.profile); scene.add(a.group); remoteAvatars[id] = a; }
    const p = remoteAvatars[id];
    if (p.grimeLv !== L.levelId) { p.grimeLv = L.levelId; applyGrime(p, L.levelId); }   // mokre i brudne futro wg poziomu
    const sz = Math.max(0.25, Math.min(8, +st.sz || 1));   // rozmiar goryla z BagaBooModMenu (host zeruje go u graczy spoza listy menu)
    if ((p.sz || 1) !== sz) {   // skala bazowa (ultimate admin = 4) razy rozmiar; ramiona grubieją razem z gorylem, a nie tylko wydłużają się do dłoni
        p.sz = sz; for (const o of [p.head, p.torso, p.handL, p.handR]) o.scale.setScalar((p.base || 1) * sz);
        for (const a of [p.armL, p.armR]) if (a) a.userData.thick = sz;
    }
    p.head.position.fromArray(st.head.p); p.head.quaternion.fromArray(st.head.q);
    p.handL.position.fromArray(st.h1.p); p.handL.quaternion.fromArray(st.h1.q);
    p.handR.position.fromArray(st.h2.p); p.handR.quaternion.fromArray(st.h2.q);
    applyDismember(p, tears[id] ? 0 : (dismembered[id] || 0));   // w trakcie animacji urywania części jeszcze są na miejscu
    if (st.h1.g !== undefined) p.handL.userData.rig.target = st.h1.g;
    if (st.h2.g !== undefined) p.handR.userData.rig.target = st.h2.g;
    if (st.em && typeof st.em.id === 'string' && typeof st.em.t === 'number') emotePose(p, st.em.id, st.em.t);   // emotka nadpisuje pozę dłoni i głowy
    const e = new THREE.Euler().setFromQuaternion(p.head.quaternion, 'YXZ');
    const drop = Math.min((p.torsoDrop || 0.35) * sz, 0.7 * sz);   // olbrzym (ultimate admin x4): tułów nie zapada się pod podłogę, zostaje blisko głowy
    p.torso.rotation.order = 'YXZ';
    if (st.sl) {   // ślizg na brzuchu: tułów leży poziomo za głową
        const lean = 1.35, bx = Math.sin(e.y), bz = Math.cos(e.y);
        p.torso.position.copy(p.head.position).add(new THREE.Vector3(bx * drop * Math.sin(lean), -drop * Math.cos(lean), bz * drop * Math.sin(lean)));
        p.torso.rotation.set(-lean, e.y, 0);
    } else { p.torso.position.copy(p.head.position).add(new THREE.Vector3(0, -drop, 0)); p.torso.rotation.set(0, e.y, 0); }
    if (p.head.userData.tags) for (const tg of p.head.userData.tags) tg.visible = !TAGS.hidden && !GAMES_CALM.on;   // Hide and Seek i cały BagaBoo Games: bez nazw nad głowami
    p.group.visible = (st.lvl || 'lobby') === L.levelId && !st.sp && !deadAvatars.has(id) && !(NET.mode === 'host' && isHiddenFrom(id, st, myPeerId));   // widać tylko graczy na tym samym poziomie, bez niewidzialnych adminów (goście dostają stan już przefiltrowany przez hosta)
}
// --- Become the Monster: urwane ręce i głowa (kod z core/dismemberlogic.js; wołane tylko, gdy gracz włączył opcję Gore) ---
const dismembered = Object.create(null), debris = [], blood = [];
const STUMP_MAT = new THREE.MeshStandardMaterial({ color: 0x6a0808, roughness: 0.35, emissive: 0x1a0000 });
function makeStumps(p) {   // czerwone kikuty na barkach i szyi tułowia (ukryte, dopóki nic nie urwano)
    const g = new THREE.Group(); p.torso.add(g);
    const mk = (x, y, z, r) => { const m = new THREE.Mesh(new THREE.SphereGeometry(r, 10, 8), STUMP_MAT); m.position.set(x, y, z); m.visible = false; g.add(m); return m; };
    return { l: mk(-0.3, 0.12, -0.02, 0.07), r: mk(0.3, 0.12, -0.02, 0.07), neck: mk(0, 0.27, -0.01, 0.1) };
}
function applyDismember(p, c) {
    p.handL.visible = !lostLeft(c); p.handR.visible = !lostRight(c); p.head.visible = !lostHead(c);
    if (p.armL) p.armL.visible = !lostLeft(c); if (p.armR) p.armR.visible = !lostRight(c);
    if (c && !p.stumps) p.stumps = makeStumps(p);
    if (p.stumps) { p.stumps.l.visible = lostLeft(c); p.stumps.r.visible = lostRight(c); p.stumps.neck.visible = lostHead(c); }
}
function spawnBlood(pos, n, k) {
    k = k || 1;
    for (let i = 0; i < n && blood.length < 90; i++) {
        const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex.dot, color: 0xa80000, transparent: true, depthWrite: false }));
        sp.scale.setScalar(0.06 + Math.random() * 0.06); sp.position.copy(pos); scene.add(sp);
        blood.push({ sp: sp, v: new THREE.Vector3((Math.random() - 0.5) * 2.4 * k, (0.8 + Math.random() * 2.2) * k, (Math.random() - 0.5) * 2.4 * k), life: 0 });
    }
}
export function bloodBurst(pos, n) { spawnBlood(pos, n, 1.4); }
// Własna urwana część widziana oczami ofiary (levels/monster.js): kopia ręki albo głowy odlatuje łukiem i leży na ziemi (sprzątana razem z cudzymi przez clearDismember)
export function tearOffLocal(src, floor) { throwPart(src, 'me', floor); }   // dla własnych rąk ofiary (levels/monster.js)
function throwPart(src, id, floor) {   // kopia urwanego elementu (ręka, głowa) leci łukiem i leży na ziemi
    const c = src.clone(true); c.traverse(o => { if (o.isSprite) o.visible = false; });
    c.visible = true; c.position.copy(src.position); c.quaternion.copy(src.quaternion); scene.add(c);
    const d = { obj: c, id: id, v: new THREE.Vector3((Math.random() - 0.5) * 2.2, 1.8 + Math.random() * 1.6, (Math.random() - 0.5) * 2.2), spin: new THREE.Vector3(Math.random() * 6, Math.random() * 6, Math.random() * 6), floor: floor, rest: false };
    debris.push(d); while (debris.length > 14) { const o = debris.shift(); scene.remove(o.obj); }
    spawnBlood(c.position, 24, 1.5);
}
// Animacja urywania: przez TEAR_TIME s część drży i puchnie, spod niej tryska krew, potem odpada. Stan (kod) jest od razu zapamiętany, więc przebudowany awatar wygląda już po urwaniu.
const TEAR_TIME = 0.6, tears = Object.create(null);
const tornParts = (p, c) => [lostLeft(c) && p.handL, lostRight(c) && p.handR, lostHead(c) && p.head].filter(Boolean);
function restoreScale(p) { const b = (p.base || 1) * (p.sz || 1); for (const o of [p.head, p.handL, p.handR]) o.scale.setScalar(b); }
// code 0 = przywróć ciało (nowa runda, lobby, wyjście z trybu)
export function setDismember(id, code) {
    const prev = dismembered[id] || 0; if (prev === code) return;
    if (!code) { delete dismembered[id]; delete tears[id]; clearDebris(id); const p = remoteAvatars[id]; if (p) { applyDismember(p, 0); restoreScale(p); clearWounds(p); } return; }
    dismembered[id] = code;
    const fresh = code & ~prev;   // nowo urwane części (druga ręka po pierwszej też dostaje animację)
    if (fresh && remoteAvatars[id]) tears[id] = { t: 0, code: code, from: prev, drip: 0 };
    if (fresh && SETTINGS.gore && remoteAvatars[id]) addWound(remoteAvatars[id], (id.length * 31 + Date.now() / 1000) | 0);   // rana (ślad krwi) zostaje na futrze do nowej rundy   // animacja, dopiero potem urywamy
}
function finishTear(id, p, code, from) {
    restoreScale(p); applyDismember(p, code);
    const floor = p.head.position.y - 1.6, nw = code & ~(from || 0);   // do ziemi lecą tylko nowo urwane części
    if (lostLeft(nw)) throwPart(p.handL, id, floor); if (lostRight(nw)) throwPart(p.handR, id, floor); if (lostHead(nw)) throwPart(p.head, id, floor + 0.12);
    try { stinger(p.head.position); } catch (e) {}
}
function clearDebris(id) { for (let i = debris.length - 1; i >= 0; i--) if (!id || debris[i].id === id) { scene.remove(debris[i].obj); debris.splice(i, 1); } }
export function clearDismember() { for (const id in dismembered) { delete dismembered[id]; delete tears[id]; const p = remoteAvatars[id]; if (p) { applyDismember(p, 0); restoreScale(p); clearWounds(p); } } clearDebris(); for (const b of blood) { scene.remove(b.sp); b.sp.material.dispose(); } blood.length = 0; }
export function tickDismember(dt) {
    for (const id in tears) {
        const tr = tears[id], p = remoteAvatars[id]; if (!p) { delete tears[id]; continue; }
        tr.t += dt; tr.drip -= dt;
        if (tr.t >= TEAR_TIME) { delete tears[id]; finishTear(id, p, tr.code, tr.from); continue; }
        const k = tr.t / TEAR_TIME, base = (p.base || 1) * (p.sz || 1), s = base * (1 + (0.1 + 0.35 * k) * Math.sin(tr.t * 60));   // coraz mocniejsze drżenie i puchnięcie
        for (const o of tornParts(p, tr.code & ~(tr.from || 0))) { o.scale.setScalar(s); if (tr.drip <= 0) spawnBlood(o.position, 2, 0.5); }
        if (tr.drip <= 0) tr.drip = 0.06;
    }
    for (const d of debris) {
        if (d.rest) continue;
        d.v.y -= 9.8 * dt; d.obj.position.addScaledVector(d.v, dt); d.obj.rotation.x += d.spin.x * dt; d.obj.rotation.y += d.spin.y * dt; d.obj.rotation.z += d.spin.z * dt;
        if (d.obj.position.y <= d.floor) { d.obj.position.y = d.floor; if (Math.abs(d.v.y) > 1.2) { d.v.y *= -0.3; d.v.x *= 0.6; d.v.z *= 0.6; d.spin.multiplyScalar(0.5); } else d.rest = true; }
    }
    for (let i = blood.length - 1; i >= 0; i--) {
        const b = blood[i]; b.life += dt; b.v.y -= 9 * dt; b.sp.position.addScaledVector(b.v, dt); b.sp.material.opacity = Math.max(0, 1 - b.life / 0.9);
        if (b.life > 0.9) { scene.remove(b.sp); b.sp.material.dispose(); blood.splice(i, 1); }
    }
}
function removeRemote(id) { if (remoteAvatars[id]) { scene.remove(remoteAvatars[id].group); delete remoteAvatars[id]; } }
// Tryb Become the Monster: chowa awatar gracza, który wygląda jak wybrany potwór
export function setAvatarHidden(id, hidden) { const a = remoteAvatars[id]; if (a) a.group.visible = !hidden; }
// Zabity gracz (Scary GTA, core/gtacorpsefx.js): awatar zostaje ukryty u nas także po kolejnych stanach z sieci, aż go odznaczymy (ciało leży w miejscu śmierci)
const deadAvatars = new Set();
export function setAvatarDead(id, dead) { if (dead) deadAvatars.add(id); else deadAvatars.delete(id); const a = remoteAvatars[id]; if (a && dead) a.group.visible = false; }
export function clearDeadAvatars() { deadAvatars.clear(); }
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
    hub = null; hubHostMic = false; stopVoiceWatch();
    playersState = Object.create(null);
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
    p.on('open', (id) => { clearTimeout(to); NET.busy = false; NET.mode = 'host'; myPeerId = id; hostStatus(); startVoiceWatch(); if (cb.ok) cb.ok(); });
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
        // Wyzwanie: gość z kontem odeśle dowód z serwera kont, przypisany do tego pokoju i tej jednorazowej liczby (nonce)
        conn.authNonce = randomNonce();
        try { conn.send({ type: 'authChallenge', nonce: conn.authNonce }); } catch (e) {}
        if (lastFollow && lastFollow.level !== 'lobby') conn.send({ type: 'follow', level: lastFollow.level, data: lastFollow.data });   // nowy gość dołącza tam, gdzie jest host
    });
    conn.on('data', (data) => {
        if (!data || typeof data !== 'object' || !clientConnections.includes(conn)) return;
        if (data.type === 'auth') {
            const nonce = conn.authNonce; conn.authNonce = null;   // nonce jest jednorazowy
            if (!nonce || typeof data.proof !== 'string' || data.proof.length > 2000) return;
            verifyProof(data.proof, GAME_PREFIX + NET.code, nonce).then((nick) => {
                if (!nick || !clientConnections.includes(conn)) return;
                conn.vNick = nick; clearTimeout(conn.gateTimer);
                try { conn.send({ type: 'authOk', nick: nick }); } catch (e) {}
                const st = playersState[conn.peer]; if (st && st.profile) st.profile.name = nick;
                markAllDirty();
            });
        } else if (data.type === 'hostAuth') {   // gość chce sprawdzić, kim jest host: dowód z serwera kont na ten pokój i nonce gościa (adresat z przedrostkiem H:, żeby nie pomylić go z dowodem gościa)
            if (conn.hostAuthDone || typeof data.nonce !== 'string' || data.nonce.length < 8 || data.nonce.length > 80) return;
            conn.hostAuthDone = true;   // jedna prośba na połączenie: bez zalewania serwera kont
            vouchRetry(HOST_AUD_PREFIX + GAME_PREFIX + NET.code, data.nonce, 3).then((proof) => { if (proof && conn.open) { try { conn.send({ type: 'hostProof', proof: proof }); } catch (e) {} } });
        } else if (data.type === 'playerUpdate') {
            const pl = data.payload;
            if (!pl || typeof pl !== 'object' || !pl.profile || typeof pl.profile !== 'object') return;
            let nm = typeof pl.profile.name === 'string' ? pl.profile.name.slice(0, 16) : '';
            // Tożsamość: zalogowany gracz gra pod nickiem swojego konta; nick zastrzeżony dla ekipy bez dowodu nie wchodzi do gry
            if (conn.vNick) { pl.profile.name = nm = conn.vNick; }
            else if (isReservedNick(nm)) { requireLogin(conn); return; }
            if (nm) {
                const low = nm.toLowerCase(), sb = Math.min(+pl.sb || 0, Date.now() + WEEK_MS), un = readMap(UNBAN_KEY);
                if (un[low] && un[low] > Date.now()) {
                    // Odbanowany przez właściciela: gracz dostaje zielone światło i czyści ban na swoim urządzeniu
                    if (sb) { try { conn.send({ type: 'unbanned' }); } catch (e) {} }   // wpis zostaje (gracz może jeszcze chwilę wysyłać stary stan)
                } else if (bannedNames.has(nm) || isBannedName(nm) || sb > Date.now()) {
                    const until = banList()[low] || (sb > Date.now() ? sb : Date.now() + DAY);
                    // Na listę banów hosta trafia tylko ban zgłoszony przez zweryfikowane konto: nick zgłoszony przez klienta mógłby być cudzy
                    if (sb > Date.now() && conn.vNick) { const a = readMap(ATT_KEY); a[low] = sb; writeMap(ATT_KEY, a); markAllDirty(); }
                    try { conn.send({ type: 'banned', until: until }); } catch (e) {} kickConn(conn, null); return;
                }
            }
            if (!isModMenuUser(conn.vNick)) { pl.inv = 0; pl.sz = 1; }   // niewidzialność i rozmiar z BagaBooModMenu tylko dla zweryfikowanych kont z listy menu
            pl.sp = pl.sp && spectatorCheck && spectatorCheck(conn.peer) ? 1 : 0;   // obserwator tylko po potwierdzeniu przez poziom (host liczy to z własnego widoku rundy)
            playersState[conn.peer] = pl; updateRemote(conn.peer, pl); checkIntruder(conn.peer, pl);
        } else if (data.type === 'objectMove') { if (typeof data.id !== 'string' || data.id.length > 64) return; sharedObjectsState[data.id] = data.payload; syncObject(data.id, data.payload); }
        else if (data.type === 'lvl') { if (levelHandler) levelHandler(data.payload, conn.peer); }
        else if (data.type === 'route') {   // prezent od gościa do kogoś: host przekazuje albo odbiera sam
            const m = cleanRouted(data.msg); if (!m) return;
            if (data.to === myPeerId) { if (routedHandler) routedHandler(m, conn.peer); }
            else { const c = clientConnections.find(x => x.peer === data.to); if (c && c.open) c.send({ type: 'routed', from: conn.peer, msg: m }); }
        }
        else if (data.type === 'mute') { const h = getHub(); if (h && typeof data.id === 'string') h.setMuted(conn.peer, data.id.slice(0, 80), !!data.on); }
        else if (data.type === 'modreq') {
            if (typeof data.action !== 'string' || (data.target !== null && data.target !== undefined && typeof data.target !== 'string')) return;
            const extra = typeof data.extra === 'string' ? data.extra.slice(0, 16) : !!data.extra;
            performMod(data.action, data.target === myPeerId ? null : data.target, verifiedNickOf(conn.peer), extra);   // ranga wywołującego tylko z dowodu konta
        }
        else if (data.type === 'report' && data.payload) {
            const from = (playersState[conn.peer] && playersState[conn.peer].profile) ? playersState[conn.peer].profile.name : 'Guest';
            reports.push({ from: from, targetId: data.payload.targetId, targetName: String(data.payload.targetName || '?').slice(0, 16), reason: String(data.payload.reason || '').slice(0, 24), time: new Date().toLocaleTimeString() });
            if (reports.length > 50) reports.shift();
            setStatus('New report from ' + from + '. Open Reports on the computer.');
        }
    });
    conn.on('close', () => {
        clientConnections = clientConnections.filter(c => c !== conn);
        delete playersState[conn.peer]; removeRemote(conn.peer); removeAudio(conn.peer); if (hub) hub.removeListener(conn.peer);
        if (!leaving && NET.mode === 'host') hostStatus();
    });
}
// Gość używa nicku zastrzeżonego dla ekipy, ale nie ma (jeszcze) dowodu z serwera kont: dajemy chwilę na jego odesłanie, potem odrzucamy
function requireLogin(conn) {
    if (conn.gateTimer) return;
    conn.gateTimer = setTimeout(() => {
        if (conn.vNick || !clientConnections.includes(conn)) return;
        try { conn.send({ type: 'authRequired' }); } catch (e) {}
        setTimeout(() => { try { conn.close(); } catch (e) {} }, 300);
    }, 6000);
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
        // Tożsamość hosta: host podszywający się pod ekipę (nick zastrzeżony) bez dowodu z serwera kont wyrzuca gościa z pokoju
        const hostNonce = randomNonce(); let hostNick = null, hostGraceOver = false;
        const checkHost = () => {
            if (NET.mode !== 'guest' || peer !== p) return;
            const st = playersState[GAME_PREFIX + code], nm = st && st.profile && typeof st.profile.name === 'string' ? st.profile.name : '';
            if (!nm || !isReservedNick(nm) || (hostNick && hostNick.toLowerCase() === nm.toLowerCase())) return;
            leaveNetwork('This host uses the staff nickname "' + nm + '" but could not prove it. It may be an impersonator, so you left the room.');
            toast('Impersonator detected: you left the room', '#e0533f');
        };
        conn.on('open', () => {
            clearTimeout(to); NET.busy = false; NET.mode = 'guest'; startVoiceWatch();
            setStatus('Joined room ' + code + ' as a guest.');
            if (cb.ok) cb.ok();
            conn.send({ type: 'hostAuth', nonce: hostNonce });   // prosimy hosta o dowód tożsamości z serwera kont
            setTimeout(() => { hostGraceOver = true; checkHost(); }, HOST_PROOF_WAIT_MS);
            callPeer(GAME_PREFIX + code);   // głos z hostem (także bez mikrofonu, żeby słyszeć innych)
            mutedPeers.forEach((id) => { try { conn.send({ type: 'mute', id: id, on: true }); } catch (e) {} });   // host zna twoją listę wyciszonych
        });
        conn.on('data', (data) => {
            if (!data) return;
            if (data.type === 'serverFull') { leaveNetwork('Room ' + code + ' is full: 1 host and 9 guests.'); if (cb.fail) cb.fail(); return; }
            if (data.type === 'authChallenge') {   // host prosi o dowód tożsamości: serwer kont wystawia go na ten pokój i ten nonce
                if (typeof data.nonce === 'string' && data.nonce.length <= 80) vouch(GAME_PREFIX + code, data.nonce).then((proof) => { if (proof && conn.open) { try { conn.send({ type: 'auth', proof: proof }); } catch (e) {} } });
                return;
            }
            if (data.type === 'authRequired') { leaveNetwork('This nickname is reserved for the staff. Log in to your account first.'); toast('Log in to use this nickname', '#e0533f'); return; }
            if (data.type === 'authOk') return;
            if (data.type === 'hostProof') {
                if (typeof data.proof === 'string' && data.proof.length <= 2000) verifyProof(data.proof, HOST_AUD_PREFIX + GAME_PREFIX + code, hostNonce).then((nick) => { if (nick) hostNick = nick; });
                return;
            }
            if (data.type === 'kicked') { leaveNetwork(data.temp ? 'You were kicked from room ' + code + ' by ' + (data.by || 'the host') + '. You can join again.' : 'The host removed you from room ' + code + '.'); toast('You were kicked from the room', '#e0533f'); return; }
            if (data.type === 'banned') {
                try { localStorage.setItem(MY_BAN_KEY, String(data.until || Date.now() + DAY)); } catch (e) {}
                leaveNetwork('You are banned for one day.'); toast('You were banned for one day', '#e0533f');
                setTimeout(() => location.reload(), 2500);
                return;
            }
            if (data.type === 'unbanned') { try { localStorage.removeItem(MY_BAN_KEY); } catch (e) {} unbannedNow = true; toast('You were unbanned. Welcome back!', '#9aff60'); return; }
            if (data.type === 'cheater') { if (cheaterHandler) cheaterHandler(data.until); return; }
            if (data.type === 'invite' && data.level === 'staff') myInvited = true;
            if (data.type === 'gooby') { if (goobyHandler) goobyHandler(); return; }
            if (data.type === 'noob') { if (noobHandler) noobHandler(); return; }
            if (data.type === 'role') { setLocalMod(data.name, data.mod); toast(data.mod ? 'You are now a moderator!' : 'You are no longer a moderator', '#ffd27a'); markAllDirty(); return; }
            if (data.type === 'lvl') { if (levelHandler) levelHandler(data.payload, 'host'); return; }
            if (data.type === 'routed') { const m = cleanRouted(data.msg); if (m && routedHandler) routedHandler(m, data.from); return; }
            if (data.type === 'follow') { if (followHandler) followHandler(data.level, data.data || {}); return; }
            if (data.type === 'invite') { if (inviteHandler) inviteHandler(data.level); return; }
            if (data.type === 'gameState') { if (performance.now() - (meshT || 0) > 2000) { meshT = performance.now(); setTimeout(meshVoice, 0); }
                const pl = data.payload.players || {};
                for (const pId in pl) { if (pId === myPeerId) continue; playersState[pId] = pl[pId]; updateRemote(pId, pl[pId]); }
                if (hostGraceOver) checkHost();   // po czasie na dowód: nick ekipy bez dowodu = podszywacz
                for (const pId in remoteAvatars) if (!pl[pId]) removeRemote(pId);
                for (const pId in playersState) if (!pl[pId]) { delete playersState[pId]; removeAudio(pId); }
                const objs = data.payload.objects || {};
                for (const objId in objs) if (L.heldId !== objId) syncObject(objId, objs[objId]);
            }
        });
        conn.on('close', () => { if (!leaving && NET.mode === 'guest') migrateHost(code); });
    });
    p.on('error', (err) => {
        clearTimeout(to); if (peer !== p) return;
        if (NET.mode === 'guest' && err.type !== 'peer-unavailable' && err.type !== 'network') return;
        leaveNetwork(err.type === 'peer-unavailable' ? 'No host is online in room ' + code + '. The host has to log in first.' : 'Network error (' + err.type + '). Playing solo.');
        if (cb.fail) cb.fail();
    });
}


// ---------- MIGRACJA HOSTA ----------
// Gdy host wyjdzie, pokój nie ginie: goście wybierają nowego hosta spośród siebie i wracają pod ten sam kod pokoju (id hosta zależy od kodu,
// więc nowy host po prostu zajmuje zwolnione id). Kandydaci są uszeregowani po id; kandydat o randze r zaczyna próbować po r * 5 s,
// więc zwykle zostaje hostem pierwszy, a gdy go nie ma (np. też wyszedł), przejmuje kolejny. Pozostali dołączają do nowego hosta.
export function electNewHost(selfId, ids, oldHostId) {
    const order = Array.from(new Set(ids.concat([selfId]))).filter(id => id !== oldHostId).sort();
    return { order: order, rank: order.indexOf(selfId) };
}
export const MIGRATE = { stepMs: 5000, retryMs: 2500, giveUpMs: 60000 };
let migrating = false;
function migrateHost(code) {
    if (migrating) return;
    migrating = true;
    const oldHost = GAME_PREFIX + code, { rank } = electNewHost(myPeerId, Object.keys(playersState), oldHost), t0 = performance.now();
    resetPeer(); NET.mode = 'solo'; NET.busy = false;
    setStatus('The host left room ' + code + '. Choosing a new host...');
    toast('The host left. Choosing a new host...', '#ffb030');
    const finish = (hosting) => { migrating = false; toast(hosting ? 'You are the new host of room ' + code : 'Reconnected to room ' + code, '#9aff60'); };
    const attempt = () => {
        if (!migrating) return;
        const elapsed = performance.now() - t0;
        if (elapsed > MIGRATE.giveUpMs) { migrating = false; leaveNetwork('The host left room ' + code + '. Playing solo.'); return; }
        const myTurn = elapsed >= rank * MIGRATE.stepMs;
        const retry = () => setTimeout(attempt, MIGRATE.retryMs);
        // Najpierw sprawdzamy, czy ktoś już został hostem (dołączamy), dopiero potem sami próbujemy nim zostać
        startJoin(code, { ok: () => finish(false), fail: () => { if (myTurn) startHost(code, { ok: () => finish(true), fail: retry }); else retry(); } });
    };
    setTimeout(attempt, 800);   // chwila, żeby serwer zwolnił id zamkniętego hosta
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
    if (NET.mode === 'guest') { if (hostConnection && hostConnection.open) hostConnection.send({ type: 'mute', id: id, on: mutedPeers.has(id) }); }   // host wyłącza ten głos w twoim miksie
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
        if (NET.mode === 'host' && isHiddenFrom(id, s, myPeerId)) continue;   // niewidzialny admin nie ma być na listach u zwykłego hosta
        out.push({ id: id, name: String(s.profile.name || 'Player').slice(0, 16), role: isHostId(id) ? 'Host' : 'Guest', s: s.s || {} });
    }
    return out;
}

// Wysyłanie stanu ~30 razy na sekundę
export function networkTick(handL, handR) {
    if (NET.mode === 'solo' || !handL || !handR) return;
    const mv = myVoice();
    const hp = new THREE.Vector3(), hq = new THREE.Quaternion(); camera.getWorldPosition(hp); camera.getWorldQuaternion(hq);
    const l1p = new THREE.Vector3(), l1q = new THREE.Quaternion(); handL.getWorldPosition(l1p); handL.getWorldQuaternion(l1q);
    const l2p = new THREE.Vector3(), l2q = new THREE.Quaternion(); handR.getWorldPosition(l2p); handR.getWorldQuaternion(l2q);
    const myState = {
        profile: getLook(),
        lvl: L.levelId,
        ses: SESSION.wins || 0,   // wygrane w sesji: tablica Bramy Wspólnej w lobby (tylko do wyświetlania, bez nagród)
        pc: petCarryNet(),   // 0 idzie, 1 na rękach, 2 na plecach (odbiorca przyjmuje przez cleanCarry)
        pt: petLookNet(),   // wygląd stworka [kolor, poziom, imię] (tylko liczby; odbiorca przyjmuje go przez cleanLook, pozycję liczy sam)
        inv: MOD.invisible ? 1 : 0, sz: MOD.size,   // BagaBooModMenu: niewidzialność i rozmiar (host honoruje je tylko dla kont z listy menu)
        head: { p: hp.toArray(), q: hq.toArray() },
        h1: { p: l1p.toArray(), q: l1q.toArray(), g: handL.userData.rig.grip },
        h2: { p: l2p.toArray(), q: l2q.toArray(), g: handR.userData.rig.grip },
        sb: unbannedNow ? 0 : myBanUntil(),   // ban zapisany na tym urządzeniu (host może go zdjąć, jeśli właściciel odbanował gracza)
        sl: playerRig.userData.sliding ? 1 : 0,   // ślizg na brzuchu
        sp: SPEC.on ? 1 : 0,                       // obserwator (core/spectate.js): inni nie widzą mojego awatara
        em: emoteState(),                         // trwająca emotka {id, t}
        vl: Math.round(mv.level * 100) / 100, vp: Math.round(mv.pitch * 100) / 100,   // poziom i wysokość mojego głosu (usta u innych)
        s: { h: SESSION.maxH, j: SESSION.jumps, e: (Date.now() - SESSION.since) / 1000 }
    };
    if (NET.mode === 'host') {
        for (const ball of L.throwables) sharedObjectsState[ball.userData.id] = bodyState(ball.userData.body);
        playersState[myPeerId] = myState;
        noobCheck();   // ultimate admin dotknął kogoś ręką: jumpscare NOOB
        // Niewidzialni admini (BagaBooModMenu) są pomijani w stanie wysyłanym graczom spoza listy menu; admini z menu widzą wszystkich
        // UWAGA: playersState i sharedObjectsState nie mają prototypu (Object.create(null)), a serializator PeerJS (BinaryPack) czyta value.constructor i na takim obiekcie rzuca
        // "Cannot read properties of undefined (reading 'toString')": wysyłamy więc zwykłe kopie. Bez tego goście nie dostawali żadnego stanu i nikogo nie widzieli.
        const all = Object.assign({}, playersState), objs = Object.assign({}, sharedObjectsState);
        let hidden = null; for (const id in all) { const s = all[id]; if (s && s.inv && isModMenuUser(verifiedNickOf(id))) (hidden || (hidden = [])).push(id); }
        clientConnections.forEach(c => {
            if (!c.open) return;
            let pl = all;
            if (hidden && !isModMenuUser(verifiedNickOf(c.peer))) { pl = {}; for (const id in all) if (!hidden.includes(id)) pl[id] = all[id]; }
            try { c.send({ type: 'gameState', payload: { players: pl, objects: objs } }); } catch (e) { console.error('gameState send failed', e); }
        });
    } else if (hostConnection && hostConnection.open) {
        hostConnection.send({ type: 'playerUpdate', payload: myState });
    }
}
