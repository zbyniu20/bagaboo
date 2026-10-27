// ==========================================
// LICZNIK GRACZY ONLINE (bez własnego serwera)
// Jedna z włączonych gier zostaje "centralą" pod stałym adresem PeerJS, reszta co kilka sekund
// melduje się jej, kim jest i w jakim pokoju gra. Centrala liczy wszystkich i odsyła wynik.
// Gdy centrala się wyłączy, inna gra przejmuje jej rolę. Wynik może się spóźniać o kilka sekund.
// ==========================================
/* global Peer */
const HUB_ID = 'bagaboo-vr-presence-hub-v1';
const STALE = 35000;
export const PRESENCE = { ok: false, online: 0, solo: 0, rooms: [], role: 'none' };
let getInfo = () => ({}), hub = null, client = null, hubConn = null, retryT = null;
const members = new Map();   // centrala: peerId -> { info, conn, t }
let onChange = () => {};

export function startPresence(infoFn, changed) {
    getInfo = infoFn; if (changed) onChange = changed;
    tryHub();
    setInterval(tick, 8000);
}
function retry(ms) { clearTimeout(retryT); retryT = setTimeout(tryHub, ms + Math.random() * 3000); }
function tryHub() {
    if (typeof Peer === 'undefined') return;
    cleanup();
    const p = new Peer(HUB_ID); hub = p;
    p.on('open', () => {
        PRESENCE.role = 'hub';
        p.on('connection', (conn) => {
            conn.on('data', (d) => { if (d && d.type === 'hello') members.set(conn.peer, { info: d.info || {}, conn: conn, t: Date.now() }); });
            conn.on('close', () => { members.delete(conn.peer); });
        });
        tick();
    });
    p.on('error', (e) => {
        if (hub !== p) return;
        if (e.type === 'unavailable-id') { try { p.destroy(); } catch (x) {} hub = null; connectClient(); }
        else retry(15000);
    });
    p.on('disconnected', () => { if (hub === p) retry(10000); });
}
function connectClient() {
    const p = new Peer(); client = p;
    p.on('open', () => {
        const c = p.connect(HUB_ID, { reliable: true }); hubConn = c;
        c.on('open', () => { PRESENCE.role = 'client'; sendHello(); });
        c.on('data', (d) => { if (d && d.type === 'presence') apply(d); });
        c.on('close', () => { if (hubConn === c) { hubConn = null; PRESENCE.ok = false; retry(2000); } });
    });
    p.on('error', () => { if (client === p) retry(8000); });
}
function cleanup() {
    if (hubConn) { try { hubConn.close(); } catch (e) {} hubConn = null; }
    if (client) { try { client.destroy(); } catch (e) {} client = null; }
    if (hub) { try { hub.destroy(); } catch (e) {} hub = null; }
    members.clear(); PRESENCE.role = 'none';
}
function sendHello() { if (hubConn && hubConn.open) hubConn.send({ type: 'hello', info: getInfo() }); }
function apply(d) {
    PRESENCE.ok = true; PRESENCE.online = d.online; PRESENCE.solo = d.solo; PRESENCE.rooms = d.rooms || [];
    onChange();
}
function tick() {
    if (PRESENCE.role === 'client') { sendHello(); return; }
    if (PRESENCE.role !== 'hub') return;
    const now = Date.now(), all = [getInfo()];
    for (const [id, m] of members) { if (now - m.t > STALE || !m.conn.open) members.delete(id); else all.push(m.info); }
    const rooms = new Map(); let solo = 0;
    for (const i of all) { if (i.room) rooms.set(i.room, (rooms.get(i.room) || 0) + 1); else solo++; }
    const summary = { type: 'presence', online: all.length, solo: solo, rooms: [...rooms].map(([code, count]) => ({ code: code, count: count })).sort((a, b) => b.count - a.count) };
    apply(summary);
    for (const m of members.values()) if (m.conn.open) m.conn.send(summary);
}
