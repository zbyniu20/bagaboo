// ==========================================
// START GRY: menu, ładowanie poziomów (z ekranem ładowania), drużyna za hostem, pauza, winieta,
// tryb testowy na komputerze, okienko błędów, zapis przy wyjściu, pętla gry
// ==========================================
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { updateDebug } from './core/debug.js';
import { THREE, scene, camera, renderer, L, clearLevel, applyLighting } from './core/engine.js';
import { LIGHT_PRESETS, LIGHT_MODE } from './core/config.js';
import * as ECO from './core/economy.js';
import * as NETM from './core/network.js';
import { updatePlayer, setPlayerPosition, buildHands, hands, playerBody, releaseAll } from './core/player.js';
import { redrawTerminals, updatePointers, updateToast, markAllDirty, toast, terminals } from './core/terminal.js';
import { initAudio, updateListener } from './core/audio.js';
import { drawScoreboard } from './core/ui.js';
import { PAUSE, pauseMenu, pollPauseButtons, closePause } from './core/pause.js';
import { SETTINGS, saveSettings } from './core/settings.js';
import { enableDesktop, updateDesktop } from './core/desktop.js';
import { startPresence } from './core/presence.js';

// Lista poziomów. Nowy poziom = nowy plik w folderze levels/ + wpis tutaj.
// light: preset oświetlenia z config.js, extras: dodatkowe pliki doładowywane razem z poziomem
const LEVELS = {
    lobby: { path: './levels/lobby.js', light: LIGHT_MODE, extras: ['./levels/lobby-door.js'] },
    maze: { path: './levels/maze.js', light: 'night', extras: [] },
    silence: { path: './levels/silence.js', light: 'night', extras: [] },
    well: { path: './levels/well.js', light: 'night', extras: [] },
    games: { path: './levels/games.js', light: 'arcade', extras: [] },
    lava: { path: './levels/lava.js', light: 'lava', extras: [] },
    monster: { path: './levels/monster.js', light: 'night', extras: [] },
    range: { path: './levels/range.js', light: 'night', extras: [] },
    staff: { path: './levels/staff.js', light: 'staff', extras: [] }
};
let level = null, extras = [], levelId = null, started = false, switching = false;

export async function loadLevel(id, spawn) {
    const cfg = LEVELS[id];
    releaseAll();
    if (level && level.dispose) level.dispose();
    for (const e of extras) if (e.dispose) e.dispose();
    for (const t of terminals) if (t !== pauseMenu) t.mesh = null;   // ekrany starego poziomu przestają reagować na laser
    clearLevel();
    applyLighting(LIGHT_PRESETS[cfg.light]);
    level = await import(cfg.path);
    extras = [];
    for (const e of cfg.extras) extras.push(await import(e));
    L.levelId = id;   // poziom może to nadpisać (labirynt ma osobne id dla każdego układu)
    for (const e of extras) if (e.prebuild) e.prebuild();
    level.build();
    for (const e of extras) e.build();
    levelId = id; PAUSE.inLobby = id === 'lobby';
    const sp = spawn || L.spawn;
    setPlayerPosition(sp[0], sp[1], sp[2]);
    markAllDirty();
}
// Ekran ładowania przed oczami: zamiast zamrożonego obrazu gracz widzi czerń z napisem
const LEVEL_NAMES = { lobby: 'Lobby', maze: 'The Maze', silence: 'Absolute Silence', well: 'The Well', lava: 'Floor is Lava', staff: 'Staff room', games: 'BagaBoo Games', monster: 'Become the Monster', range: 'Shooting Range' };
const fade = (() => {
    const c = document.createElement('canvas'); c.width = 1024; c.height = 256;
    const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace;
    const black = new THREE.Mesh(new THREE.PlaneGeometry(4, 4), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0, depthTest: false }));
    black.position.z = -0.3; black.renderOrder = 3000;
    const text = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.125), new THREE.MeshBasicMaterial({ map: tx, transparent: true, opacity: 0, depthTest: false, toneMapped: false }));
    text.position.z = -0.29; text.renderOrder = 3001;
    camera.add(black); camera.add(text);
    return { c: c, tx: tx, black: black, text: text, target: 0, value: 0 };
})();
function showLoading(name) {
    const x = fade.c.getContext('2d'); x.clearRect(0, 0, 1024, 256);
    x.textAlign = 'center'; x.textBaseline = 'middle';
    x.font = 'bold 64px serif'; x.fillStyle = '#e8dcc8'; x.fillText(name, 512, 100);
    x.font = '36px sans-serif'; x.fillStyle = '#9a8a7a'; x.fillText('Loading...', 512, 180);
    fade.tx.needsUpdate = true; fade.target = 1; fade.value = 1;
    fade.black.material.opacity = 1; fade.text.material.opacity = 1;
}
const frameWaiters = [];
function nextFrames(n) { return new Promise(r => frameWaiters.push({ n: n, r: r })); }
// Przejście przez drzwi do innego poziomu. opts: { seed (wspólny układ), noFollow (bez prowadzenia drużyny) }
const SEEDED = { maze: true, well: true };
async function goToLevel(id, spawn, opts) {
    if (switching) return;
    switching = true;
    opts = opts || {};
    if (PAUSE.on) closePause();
    // Ziarno układu: od hosta, z restartu albo nowe losowe
    L.levelSeed = SEEDED[id] ? (opts.seed !== undefined ? opts.seed : (Math.random() * 1e9) | 0) : undefined;
    if (NETM.NET.mode === 'host' && !opts.noFollow && id !== 'staff') NETM.sendFollow(id, { seed: L.levelSeed });   // goście idą za hostem (oprócz pokoju szefa)
    showLoading(LEVEL_NAMES[id] || id);
    await nextFrames(3);   // najpierw pokaż czarny ekran, dopiero potem ciężka praca
    try { await loadLevel(id, spawn); saveNow(); }
    catch (e) { console.error(e); toast('Could not load the level'); }
    fade.target = 0;
    switching = false;
}
PAUSE.onLobby = () => goToLevel('lobby');
// Gość: host przeszedł przez drzwi, idziemy za nim (ten sam poziom i układ)
let pendingFollow = null;
NETM.onFollow((level, data) => {
    if (NETM.NET.mode !== 'guest') return;
    if (level === levelId && !SEEDED[level]) return;   // już tu jesteśmy
    if (!started) { pendingFollow = { level: level, data: data }; return; }
    toast('Following the host...', '#9fc8ff');
    goToLevel(level, null, { seed: data.seed, noFollow: true });
});
// Gość: zaproszenie od hosta (pokój szefa) albo odesłanie do lobby
NETM.onInvite((level) => {
    if (!started || level === levelId) return;
    toast(level === 'staff' ? 'The host invited you to the staff room' : 'The host sent you back to the lobby', '#ffd27a');
    goToLevel(level, null, { noFollow: true });
});
// Licznik graczy online (wspólny dla wszystkich, którzy mają włączoną grę)
startPresence(() => ({ room: NETM.NET.mode === 'solo' ? '' : NETM.NET.code, name: ECO.SAVE.profile.name }), () => markAllDirty());

// Winieta: przyciemnia brzegi obrazu przy szybkim ruchu (mniej choroby lokomocyjnej)
const vignette = (() => {
    const c = document.createElement('canvas'); c.width = 256; c.height = 256;
    const x = c.getContext('2d'), g = x.createRadialGradient(128, 128, 0, 128, 128, 128);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.14, 'rgba(0,0,0,0)'); g.addColorStop(0.32, 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,1)');
    x.fillStyle = g; x.fillRect(0, 0, 256, 256);
    // Duża płaszczyzna tuż przed oczami: środek przezroczysty (ok. 45°), brzegi czarne aż poza pole widzenia
    const m = new THREE.Mesh(new THREE.PlaneGeometry(3, 3), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, opacity: 0, depthTest: false, depthWrite: false }));
    m.position.z = -0.2; m.renderOrder = 2500; m.visible = false; camera.add(m);
    return m;
})();

// --- Menu ---
const $ = (id) => document.getElementById(id);
function fillMenu() {
    const p = ECO.SAVE.profile;
    $('playerName').value = p.name; $('playerColor').value = p.color;
    const has = ECO.hasSave();
    $('btnSolo').innerText = has ? 'Continue solo' : 'Play solo';
    $('saveInfo').innerText = has
        ? 'Save found: ' + ECO.SAVE.wallet + ' Bagabucks, record ' + Math.floor(ECO.SAVE.best.height) + ' m, ' + ECO.SAVE.owned.filter(o => !/none|cap|cloth/.test(o)).length + ' items bought.'
        : 'No save yet. Your progress is saved on this device when you leave the game.';
    $('btnNew').style.display = has ? 'inline-block' : 'none';
    if (ECO.loadNotice) $('saveInfo').innerText = ECO.loadNotice + ' ' + $('saveInfo').innerText;
    $('quality').value = SETTINGS.quality;
}
function lobbyButtons(on) { ['btnHost', 'btnJoin', 'btnSolo', 'btnNew'].forEach(id => { $(id).disabled = !on; }); }
function readProfile() {
    ECO.setProfile({ name: ($('playerName').value || 'Acrobat').slice(0, 16), color: $('playerColor').value });
    NETM.NET.code = NETM.sanitizeCode($('roomCode').value) || 'MAIN';
}

function startGame(restorePosition) {
    if (started) return;
    started = true;
    enableDesktop();
    $('lobby').style.display = 'none';
    $('info').style.display = 'block';
    document.body.classList.add('connected');
    buildHands(ECO.getLook());
    ECO.onLookChange((look) => buildHands(look));
    const pos = ECO.SAVE.pos;
    if (restorePosition && pos && pos.level === levelId) setPlayerPosition(pos.x, pos.y + 0.2, pos.z);
    else setPlayerPosition(L.spawn[0], L.spawn[1], L.spawn[2]);
    ECO.SESSION.since = Date.now();
    ECO.ensureDaily();
    if (ECO.loadNotice) toast(ECO.loadNotice, '#e0533f');
    const reward = ECO.claimLoginReward();
    if (!reward) { const st = ECO.loginStatus(); toast('Next login reward in ' + ECO.fmtDuration(st.msLeft)); }
    setInterval(() => NETM.networkTick(hands.L, hands.R), 1000 / 30);
    setInterval(saveNow, 30000);
    if (pendingFollow) { const f = pendingFollow; pendingFollow = null; goToLevel(f.level, null, { seed: f.data.seed, noFollow: true }); }
}

$('btnSolo').onclick = () => { initAudio(); readProfile(); startGame(true); };
$('btnHost').onclick = () => { initAudio(); readProfile(); lobbyButtons(false); NETM.startHost(NETM.NET.code, { ok: () => startGame(false), fail: () => lobbyButtons(true) }); };
$('btnJoin').onclick = () => { initAudio(); readProfile(); lobbyButtons(false); NETM.startJoin(NETM.NET.code, { ok: () => startGame(false), fail: () => lobbyButtons(true) }); };
// Jakość grafiki: zapis ustawienia i ponowne uruchomienie (tekstury i cienie tworzą się przy starcie)
$('quality').onchange = () => { SETTINGS.quality = $('quality').value; saveSettings(); location.reload(); };
$('btnNew').onclick = () => {
    if (!confirm('Delete your save? Bones, bought items and records will be lost.')) return;
    ECO.resetSave(); location.reload();
};

// --- Zapis przy wyjściu z gry (zamknięcie karty, zdjęcie gogli, wyjście z VR) ---
function saveNow() {
    if (!started) return;
    ECO.SAVE.pos = { level: levelId, x: playerBody.position.x, y: playerBody.position.y, z: playerBody.position.z };
    ECO.saveGame();
}
window.addEventListener('pagehide', saveNow);
window.addEventListener('beforeunload', saveNow);
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') saveNow(); });
renderer.xr.addEventListener('sessionend', saveNow);

// --- Pętla gry ---
const clock = new THREE.Clock();
let uiTimer = 0;
renderer.setAnimationLoop(() => {
    const dt = Math.min(clock.getDelta(), 0.1), t = clock.elapsedTime;
    for (let i = frameWaiters.length - 1; i >= 0; i--) if (--frameWaiters[i].n <= 0) { frameWaiters[i].r(); frameWaiters.splice(i, 1); }
    pollPauseButtons();
    // Pauza zatrzymuje świat tylko w grze solo
    const frozen = PAUSE.on && NETM.NET.mode === 'solo';
    if (!frozen) { updatePlayer(dt, t); updateDesktop(dt); }
    if (level && !switching && !frozen) {
        const ctx = { pos: playerBody.position, body: playerBody, goto: (id, sp, o) => goToLevel(id, sp, o) };
        level.update(dt, t, ctx);
        for (const e of extras) if (e.update) e.update(dt, t, ctx);
        // Drzwi do innych poziomów
        if (started) for (const pt of L.portals) {
            if (pt.box3.containsPoint(playerBody.position)) {
                if (pt.cond && !pt.cond()) { if (pt.deny && t - (pt.deniedAt || -9) > 3) { pt.deniedAt = t; toast(pt.deny, '#e0533f'); } continue; }   // drzwi zamknięte dla tego gracza
                if (pt.onEnter) pt.onEnter(); goToLevel(pt.target, pt.spawn, pt.opts); break;
            }
        }
    }
    NETM.poseRemoteHands(dt);
    if (started && !frozen) ECO.tick(dt, NETM.otherPlayers().length);
    updateListener(camera);
    // Ekran ładowania znika płynnie
    fade.value += (fade.target - fade.value) * Math.min(1, dt * 4);
    fade.black.material.opacity = fade.value; fade.text.material.opacity = fade.value;
    fade.black.visible = fade.text.visible = fade.value > 0.01;
    // Winieta wg prędkości
    const sp = Math.hypot(playerBody.velocity.x, playerBody.velocity.y * 0.6, playerBody.velocity.z);
    const vt = SETTINGS.vignette && renderer.xr.isPresenting ? Math.max(0, Math.min(0.85, (sp - 2.2) / 4)) : 0;
    vignette.material.opacity += (vt - vignette.material.opacity) * Math.min(1, dt * 6);
    vignette.visible = vignette.material.opacity > 0.02;
    updatePointers(renderer.xr.isPresenting ? null : camera);
    updateDebug(dt);
    if (t - uiTimer > 1) { uiTimer = t; drawScoreboard(); markAllDirty(); }
    redrawTerminals();
    updateToast(dt);
    renderer.render(scene, camera);
});

// --- Start ---
document.body.appendChild(VRButton.createButton(renderer));
NETM.initMic();
fillMenu();
$('status').innerText = 'Loading the lobby...';
lobbyButtons(false);
loadLevel('lobby').then(() => { lobbyButtons(true); $('status').innerText = 'Ready. Put on your headset and press Enter VR after starting.'; drawScoreboard(); })
    .catch((e) => { console.error(e); $('status').innerText = 'Could not load the level: ' + e.message; });
