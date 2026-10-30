// ==========================================
// EKRANY: komputer sieciowy, automat sklepowy (sklep, nagroda dzienna, zadania) i tablica wyników
// ==========================================
import { THREE } from './engine.js';
import { Terminal, wrapText, AMBER, AMBER_DIM, OK_COL, BAD_COL, GOLD, markAllDirty } from './terminal.js';
import * as N from './network.js';
import * as E from './economy.js';
import { PRESENCE } from './presence.js';
import { isStaffName } from './config.js';

// ---------- KOMPUTER (multiplayer) ----------
const ui = { page: 'main', temp: '', target: null };
function modeName() { return N.NET.mode === 'host' ? 'Host' : (N.NET.mode === 'guest' ? 'Guest' : 'Solo, offline'); }
export const computer = new Terminal((t) => {
    const c = t.ctx, solo = N.NET.mode === 'solo';
    t.background();
    if (ui.page === 'main') {
        t.header('BagaBoo network terminal', modeName() + ' | room ' + N.NET.code, solo ? AMBER_DIM : OK_COL);
        t.text('Mode: ' + modeName(), 40, 104, 28, GOLD, 'left', true);
        t.text('Room code: ' + N.NET.code, 40, 142, 28, GOLD, 'left', true);
        t.text('Players: ' + (solo ? 1 : N.otherPlayers().length + 1) + ' of ' + (N.MAX_GUESTS + 1), 40, 180, 28, GOLD, 'left', true);
        t.text(PRESENCE.ok ? 'Online now: ' + PRESENCE.online + (PRESENCE.online === 1 ? ' player' : ' players') : 'Online now: counting...', 1000, 104, 24, PRESENCE.ok ? OK_COL : AMBER_DIM, 'right', true);
        wrapText(N.NET.status, 62).slice(0, 3).forEach((l, i) => t.text(l, 40, 220 + i * 28, 22, AMBER, 'left'));
        t.text('One host per room. Guests can join only while the host is online.', 40, 308, 18, AMBER_DIM, 'left');
        t.btn('host', 32, 332, 300, 62, 'Host room', () => N.startHost(N.NET.code), { tone: 'ok', disabled: !solo || N.NET.busy });
        t.btn('join', 362, 332, 300, 62, 'Join as guest', () => N.startJoin(N.NET.code), { disabled: !solo || N.NET.busy });
        t.btn('leave', 692, 332, 300, 62, 'Leave room', () => N.leaveNetwork('You left the room. Playing solo.'), { tone: 'bad', disabled: solo && !N.NET.busy });
        t.btn('code', 32, 404, 300, 62, 'Change code', () => { ui.temp = N.NET.code; ui.page = 'keyboard'; }, { disabled: !solo || N.NET.busy });
        t.btn('players', 362, 404, 300, 62, 'Players', () => { ui.page = 'players'; }, { disabled: solo });
        t.btn('reports', 692, 404, 300, 62, 'Reports (' + N.reports.length + ')', () => { ui.page = 'reports'; }, { disabled: N.NET.mode !== 'host' });
        t.btn('voice', 32, 476, 300, 62, N.voice.on ? 'Mic on' : 'Mic off', N.toggleVoice, { tone: N.voice.on ? 'ok' : 'bad', disabled: !N.voice.stream });
        const anyOn = Object.keys(N.audioEls).some(id => !N.mutedPeers.has(id));
        t.btn('muteall', 362, 476, 300, 62, anyOn ? 'Mute everyone' : 'Unmute everyone', () => { for (const id in N.audioEls) { if (anyOn) N.mutedPeers.add(id); else N.mutedPeers.delete(id); N.audioEls[id].muted = N.mutedPeers.has(id); } }, { disabled: Object.keys(N.audioEls).length === 0 });
        t.btn('online', 32, 548, 960, 62, PRESENCE.ok ? "Who's online (" + PRESENCE.online + ')' : "Who's online", () => { ui.page = 'online'; }, { tone: 'gold' });
        t.btn('reset', 692, 476, 300, 62, 'Reset session', () => { E.SESSION.maxH = 0; E.SESSION.jumps = 0; E.SESSION.since = Date.now(); E.SESSION.lastM = 0; N.setStatus('Your session score was reset.'); });
    } else if (ui.page === 'online') {
        // Ilu graczy ma teraz włączoną grę i w jakich pokojach (liczone na żywo między graczami)
        t.header("Who's online", null, null, () => { ui.page = 'main'; });
        if (!PRESENCE.ok) t.text('Connecting to the online counter...', 40, 120, 26, AMBER, 'left');
        else {
            t.text('Players online now: ' + PRESENCE.online, 40, 112, 32, GOLD, 'left', true);
            t.text('In rooms: ' + (PRESENCE.online - PRESENCE.solo) + ', playing solo: ' + PRESENCE.solo, 40, 152, 22, AMBER, 'left');
            if (!PRESENCE.rooms.length) t.text('No open rooms right now. Host one and others will see it here.', 40, 200, 22, AMBER_DIM, 'left');
            PRESENCE.rooms.slice(0, 7).forEach((r, i) => {
                const y = 184 + i * 56, mine = N.NET.mode !== 'solo' && r.code === N.NET.code;
                c.fillStyle = i % 2 ? 'rgba(255,176,0,0.04)' : 'rgba(255,176,0,0.08)'; c.fillRect(24, y, 976, 50);
                t.text('Room ' + r.code, 40, y + 26, 26, mine ? OK_COL : GOLD, 'left', true);
                t.text(r.count + (r.count === 1 ? ' player' : ' players') + (mine ? ' (you are here)' : ''), 420, y + 26, 22, AMBER, 'left');
                t.btn('oj' + r.code, 800, y + 5, 190, 40, 'Join', () => { N.NET.code = r.code; N.startJoin(r.code); ui.page = 'main'; }, { size: 22, disabled: N.NET.mode !== 'solo' || N.NET.busy || r.count >= N.MAX_GUESTS + 1 });
            });
        }
        t.text('Counted live between everyone who has the game open. Room codes are visible to all players.', 40, 612, 16, AMBER_DIM, 'left');
    } else if (ui.page === 'keyboard') {
        t.header('Change room code', null, null, () => { ui.page = 'main'; });
        t.rrect(32, 92, 960, 64, 6); c.fillStyle = '#0c0703'; c.fill(); c.strokeStyle = AMBER; c.lineWidth = 2; c.stroke();
        t.text((ui.temp || '') + ((Math.floor(performance.now() / 500) % 2) ? '_' : ' '), 52, 125, 38, GOLD, 'left', true);
        const keys = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        for (let i = 0; i < 36; i++) { const ch = keys[i]; t.btn('k' + ch, 31 + (i % 9) * 108, 178 + Math.floor(i / 9) * 82, 98, 70, ch, () => { if (ui.temp.length < 12) ui.temp += ch; }, { size: 32 }); }
        t.btn('kdel', 31, 520, 230, 76, 'Delete', () => { ui.temp = ui.temp.slice(0, -1); });
        t.btn('kclr', 271, 520, 230, 76, 'Clear', () => { ui.temp = ''; });
        t.btn('kcan', 511, 520, 230, 76, 'Cancel', () => { ui.page = 'main'; }, { tone: 'bad' });
        t.btn('kok', 751, 520, 242, 76, 'Save code', () => { const s = N.sanitizeCode(ui.temp); if (s) { N.NET.code = s; const rc = document.getElementById('roomCode'); if (rc) rc.value = s; } ui.page = 'main'; }, { tone: 'ok' });
    } else if (ui.page === 'players') {
        t.header('Players in room ' + N.NET.code, null, null, () => { ui.page = 'main'; });
        const list = N.otherPlayers();
        if (!list.length) t.text('Nobody else is here yet. Share the room code: ' + N.NET.code, 40, 130, 24, AMBER, 'left');
        list.slice(0, 9).forEach((p, i) => {
            const y = 88 + i * 58;
            c.fillStyle = i % 2 ? 'rgba(255,176,0,0.04)' : 'rgba(255,176,0,0.08)'; c.fillRect(24, y, 976, 52);
            t.text(p.name, 40, y + 27, 26, GOLD, 'left', true);
            t.text(p.role, 330, y + 27, 22, p.role === 'Host' ? OK_COL : AMBER, 'left', true);
            t.btn('m' + p.id, 440, y + 5, 130, 42, N.mutedPeers.has(p.id) ? 'Unmute' : 'Mute', () => N.toggleMute(p.id), { size: 20, disabled: !N.audioEls[p.id] });
            t.btn('r' + p.id, 580, y + 5, 130, 42, 'Report', () => { ui.target = p; ui.page = 'report'; }, { size: 20 });
            if (N.NET.mode === 'host') {
                if (isStaffName(E.SAVE.profile.name)) t.btn('i' + p.id, 720, y + 5, 140, 42, 'Invite', () => { N.sendInvite(p.id, 'staff'); N.setStatus('Invited ' + p.name + ' to the staff room.'); }, { size: 20, tone: 'gold' });
                t.btn('x' + p.id, 870, y + 5, 120, 42, 'Kick', () => N.kickPlayer(p.id), { size: 20, tone: 'bad' });
            }
        });
    } else if (ui.page === 'report') {
        t.header('Report a player', null, null, () => { ui.page = 'players'; });
        const tg = ui.target;
        t.text('Player: ' + (tg ? tg.name : '?'), 40, 110, 30, GOLD, 'left', true);
        t.text(N.NET.mode === 'host' ? 'You are the host, so the report is saved here.' : 'Pick a reason. The host sees your report on their computer.', 40, 152, 22, AMBER, 'left');
        ['Cheating', 'Harassment', 'Offensive name', 'Spam or trolling'].forEach((r, i) => t.btn('rs' + i, 32 + (i % 2) * 496, 190 + Math.floor(i / 2) * 110, 464, 90, r, () => { N.sendReport(tg, r); ui.page = 'main'; }));
        t.btn('rcan', 32, 430, 960, 80, 'Cancel', () => { ui.page = 'players'; }, { tone: 'bad' });
    } else if (ui.page === 'reports') {
        t.header('Reports from guests', null, null, () => { ui.page = 'main'; });
        if (!N.reports.length) t.text('No reports. Guests can report players from the Players page.', 40, 130, 24, AMBER, 'left');
        const start = Math.max(0, N.reports.length - 8);
        N.reports.slice(start).forEach((r, i) => {
            const idx = start + i, y = 88 + i * 66;
            c.fillStyle = i % 2 ? 'rgba(255,176,0,0.04)' : 'rgba(255,176,0,0.08)'; c.fillRect(24, y, 976, 60);
            t.text(r.from + ' reported ' + r.targetName, 40, y + 20, 22, GOLD, 'left', true);
            t.text(r.reason + ', ' + r.time, 40, y + 44, 18, AMBER, 'left');
            t.btn('rk' + idx, 680, y + 9, 150, 44, 'Kick', () => { N.kickPlayer(r.targetId); N.reports.splice(idx, 1); }, { size: 20, tone: 'bad', disabled: !N.canKick(r.targetId) });
            t.btn('rd' + idx, 840, y + 9, 150, 44, 'Dismiss', () => { N.reports.splice(idx, 1); }, { size: 20 });
        });
    }
    t.scanlines();
});

// ---------- AUTOMAT SKLEPOWY (sklep, nagroda za logowanie, zadania dzienne) ----------
const shopUi = { tab: 'shop', slot: 'skin', tryItem: null };
const previewHandlers = [];
export function onPreview(fn) { previewHandlers.push(fn); }
export function previewLook() {
    const look = E.getLook();
    if (shopUi.tryItem) look[shopUi.tryItem.slot] = shopUi.tryItem.id;
    return look;
}
function refreshPreview() { const l = previewLook(); previewHandlers.forEach(f => f(l)); }
E.onLookChange(() => { shopUi.tryItem = null; refreshPreview(); });

export const shop = new Terminal((t) => {
    const c = t.ctx;
    t.background();
    t.header('Bagabucks shop', E.CURRENCY + ': ' + E.SAVE.wallet, GOLD);
    const tabs = [['shop', 'Shop'], ['daily', 'Daily reward'], ['quests', 'Daily quests'], ['records', 'Records']];
    tabs.forEach((tb, i) => t.btn('tab' + tb[0], 28 + i * 246, 84, 232, 54, tb[1], () => { shopUi.tab = tb[0]; }, { size: 23, active: shopUi.tab === tb[0] }));
    const login = E.loginStatus();
    if (login.ready) { c.fillStyle = OK_COL; c.beginPath(); c.arc(28 + 246 + 218, 92, 9, 0, 7); c.fill(); }

    if (shopUi.tab === 'shop') {
        E.SLOTS.forEach((s, i) => t.btn('slot' + s.id, 28 + i * 139, 152, 131, 46, s.name, () => { shopUi.slot = s.id; }, { size: 19, tone: 'gold', active: shopUi.slot === s.id }));
        const items = E.CATALOG.filter(it => it.slot === shopUi.slot);
        const step = items.length > 8 ? 47 : 50;   // przy 9 przedmiotach wiersze są niższe
        items.forEach((it, i) => {
            const y = 208 + i * step, owned = E.isOwned(it), worn = E.isEquipped(it), trying = shopUi.tryItem === it;
            c.fillStyle = i % 2 ? 'rgba(255,176,0,0.04)' : 'rgba(255,176,0,0.08)'; c.fillRect(24, y, 976, step - 6);
            t.text(it.name, 40, y + 22, 24, worn ? OK_COL : GOLD, 'left', true);
            const locked = E.isLocked(it);
            t.text(locked ? (it.hint || 'Locked') + ' only' : (it.price === 0 ? 'Free' : it.price + ' ' + E.CURRENCY), 430, y + 22, 22, locked ? BAD_COL : (owned ? AMBER_DIM : (E.SAVE.wallet >= it.price ? AMBER : BAD_COL)), 'left');
            t.btn('try' + it.id, 610, y + 4, 160, 36, trying ? 'Trying' : 'Try on', () => { shopUi.tryItem = trying ? null : it; refreshPreview(); }, { size: 20, active: trying });
            if (worn) t.btn('worn' + it.id, 790, y + 4, 200, 36, 'Wearing', null, { size: 20, disabled: true });
            else if (owned) t.btn('wear' + it.id, 790, y + 4, 200, 36, 'Wear', () => { E.equipItem(it); }, { size: 20, tone: 'ok' });
            else if (locked) t.btn('lock' + it.id, 790, y + 4, 200, 36, 'Locked', null, { size: 20, disabled: true });
            else t.btn('buy' + it.id, 790, y + 4, 200, 36, E.SAVE.wallet >= it.price ? 'Buy' : 'Need ' + (it.price - E.SAVE.wallet), () => { E.buyItem(it); }, { size: 20, tone: 'gold', disabled: E.SAVE.wallet < it.price });
        });
        if (items.length <= 8) t.text('Look at the stand next to the machine to see the item on a head.', 40, 626, 18, AMBER_DIM, 'left');
    } else if (shopUi.tab === 'daily') {
        t.text('Login reward every 6 hours', 40, 176, 30, GOLD, 'left', true);
        t.text('Current streak: ' + login.streak + '   Next reward: ' + login.nextAmount + ' ' + E.CURRENCY, 40, 222, 24, AMBER, 'left');
        if (login.ready) t.btn('claim', 40, 252, 420, 76, 'Claim ' + login.nextAmount + ' ' + E.CURRENCY, () => { E.claimLoginReward(); }, { tone: 'ok' });
        else { t.text('Next reward in ' + E.fmtDuration(login.msLeft), 40, 290, 28, GOLD, 'left', true); t.bar(40, 316, 600, 16, 1 - login.msLeft / E.LOGIN_INTERVAL, AMBER); }
        t.text('Come back within 30 hours to keep the streak: +15 per step, up to 250.', 40, 362, 18, AMBER_DIM, 'left');
        t.text('Bonus Bagabucks for playing', 40, 410, 26, GOLD, 'left', true);
        const d = E.ensureDaily(), A = E.ACTIVITY;
        const rows = [
            [A.tramp.label, '+' + A.tramp.each, d.caps.tramp, A.tramp.cap], [A.rope.label, '+' + A.rope.each, d.caps.rope, A.rope.cap], [A.throw.label, '+' + A.throw.each, d.caps.throw, A.throw.cap],
            [A.play.label, '+' + A.play.each, d.caps.play, A.play.cap], [A.social.label, '+' + A.social.each, d.caps.social, A.social.cap]
        ];
        rows.forEach((r, i) => {
            const y = 444 + i * 30;
            t.text(r[0], 40, y, 20, AMBER, 'left'); t.text(r[1], 420, y, 20, GOLD, 'left', true);
            t.text(r[2] + ' / ' + r[3] + ' today', 520, y, 20, r[2] >= r[3] ? AMBER_DIM : AMBER, 'left');
        });
        t.text('New height record: +' + E.HEIGHT_RECORD_BONUS + ' per meter. First time at 15 m today: +' + E.HIGH_DAILY_BONUS + '.', 40, 600, 18, AMBER_DIM, 'left');
    } else if (shopUi.tab === 'records') {
        // Najlepsze czasy i osiągnięcia
        t.text('Best times', 40, 176, 28, GOLD, 'left', true);
        E.RECORDS.forEach((r, i) => {
            const v = E.SAVE.records[r.id], y = 208 + i * 30;
            t.text(r.name, 40, y, 22, AMBER, 'left');
            t.text(v === undefined ? (r.score ? '-' : '--:--') : (r.score ? String(v) : E.fmtDuration(v * 1000)), 400, y, 22, v === undefined ? AMBER_DIM : GOLD, 'left', true);
        });
        t.text('Wins: maze ' + (E.SAVE.mazeWins || 0) + ', silence ' + (E.SAVE.silenceWins || 0) + ', well ' + (E.SAVE.wellWins || 0) + ', lava ' + (E.SAVE.lavaWins || 0), 520, 208, 18, AMBER_DIM, 'left');
        t.text('Achievements', 40, 384, 26, GOLD, 'left', true);
        E.ACHIEVEMENTS.forEach((a, i) => {
            const done = !!E.SAVE.achievements[a.id], y = 416 + i * 37;
            c.fillStyle = done ? 'rgba(127,196,127,0.12)' : 'rgba(255,176,0,0.06)'; c.fillRect(24, y - 18, 976, 34);
            t.text((done ? '✓ ' : '• ') + a.name, 40, y - 4, 22, done ? OK_COL : GOLD, 'left', true);
            t.text(a.desc, 40, y + 14, 16, AMBER, 'left');
            t.text(a.rewardName, 980, y - 2, 20, done ? OK_COL : AMBER_DIM, 'right', true);
        });
    } else {
        const d = E.ensureDaily();
        t.text('Today\'s quests (new ones in ' + E.fmtDuration(E.msToMidnight()) + ')', 40, 176, 26, GOLD, 'left', true);
        d.quests.forEach((q, i) => {
            const def = E.questDef(q.id), y = 214 + i * 110;
            c.fillStyle = q.done ? 'rgba(127,196,127,0.10)' : 'rgba(255,176,0,0.07)'; c.fillRect(24, y, 976, 96);
            t.text(def.text, 44, y + 28, 24, q.done ? OK_COL : GOLD, 'left', true);
            t.text(q.done ? 'Done, +' + def.reward + ' paid' : def.reward + ' ' + E.CURRENCY, 980, y + 28, 22, q.done ? OK_COL : AMBER, 'right', true);
            t.bar(44, y + 58, 720, 18, q.p / def.target, q.done ? OK_COL : AMBER);
            t.text(q.p + ' / ' + def.target, 790, y + 67, 22, AMBER, 'left', true);
        });
        t.text(d.bonus ? 'All quests done today. Bonus of ' + E.QUEST_ALL_BONUS + ' paid.' : 'Finish all three for a bonus of ' + E.QUEST_ALL_BONUS + ' ' + E.CURRENCY + '.', 40, 560, 24, d.bonus ? OK_COL : GOLD, 'left', true);
        t.text('Rewards are paid automatically when a quest is done.', 40, 600, 18, AMBER_DIM, 'left');
    }
    t.scanlines();
});

// ---------- TABLICA WYNIKÓW ----------
export const board = { canvas: document.createElement('canvas') };
board.canvas.width = 1024; board.canvas.height = 640;
board.tex = new THREE.CanvasTexture(board.canvas); board.tex.colorSpace = THREE.SRGBColorSpace; board.tex.anisotropy = 8;
function fmtTime(s) { s = Math.max(0, Math.floor(s)); const m = Math.floor(s / 60), ss = s % 60; return m + ':' + (ss < 10 ? '0' : '') + ss; }
export function drawScoreboard() {
    const c = board.canvas.getContext('2d'), W = 1024, H = 640;
    const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#1a1f1b'); g.addColorStop(1, '#0c0f0d');
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    c.fillStyle = 'rgba(255,255,255,0.03)'; for (let i = 0; i < 260; i++) c.fillRect((i * 137) % W, (i * 89) % H, 3, 2);
    c.textBaseline = 'middle';
    c.font = 'bold 56px serif'; c.textAlign = 'center'; c.fillStyle = '#c01818'; c.shadowColor = 'rgba(255,40,0,0.8)'; c.shadowBlur = 18;
    c.fillText('Who climbed highest', W / 2, 52); c.shadowBlur = 0;
    c.font = '22px "Courier New", monospace'; c.fillStyle = '#c9b8a8';
    c.fillText('Room ' + N.NET.code + ', ' + modeName().toLowerCase() + ', your record: ' + Math.floor(E.SAVE.best.height) + ' m', W / 2, 100);
    const cols = [40, 90, 470, 610, 800, 910], heads = ['#', 'Player', 'Role', 'Best height', 'Jumps', 'Time'];
    c.font = 'bold 22px "Courier New", monospace'; c.fillStyle = '#ffb347'; c.textAlign = 'left';
    heads.forEach((h, i) => c.fillText(h, cols[i], 142));
    c.fillStyle = 'rgba(255,180,70,0.5)'; c.fillRect(30, 160, 964, 2);
    const rows = [{ name: E.SAVE.profile.name, role: N.NET.mode === 'host' ? 'Host' : (N.NET.mode === 'guest' ? 'Guest' : 'Solo'), h: E.SESSION.maxH, j: E.SESSION.jumps, t: (Date.now() - E.SESSION.since) / 1000, me: true }];
    for (const p of N.otherPlayers()) rows.push({ name: p.name, role: p.role, h: p.s.h || 0, j: p.s.j || 0, t: p.s.e || 0, me: false });
    rows.sort((a, b) => b.h - a.h);
    rows.slice(0, 10).forEach((r, i) => {
        const y = 190 + i * 44;
        if (r.me) { c.fillStyle = 'rgba(255,120,40,0.16)'; c.fillRect(30, y - 20, 964, 40); }
        c.font = (r.me ? 'bold ' : '') + '24px "Courier New", monospace';
        c.fillStyle = i === 0 ? GOLD : '#e8e0d8'; c.fillText(String(i + 1), cols[0], y); c.fillText(r.name, cols[1], y);
        c.fillStyle = r.role === 'Host' ? OK_COL : (r.role === 'Guest' ? AMBER : '#aaaaaa'); c.fillText(r.role, cols[2], y);
        c.fillStyle = '#e8e0d8'; c.fillText(r.h.toFixed(1) + ' m', cols[3], y); c.fillText(String(r.j), cols[4], y); c.fillText(fmtTime(r.t), cols[5], y);
    });
    board.tex.needsUpdate = true;
}
export { markAllDirty };
