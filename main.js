// ==========================================
// START GRY: menu, ładowanie poziomów, zapis przy wyjściu, pętla gry
// ==========================================
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { THREE, scene, camera, renderer, L, clearLevel, applyLighting } from './core/engine.js';
import { LIGHT_PRESETS, LIGHT_MODE } from './core/config.js';
import * as ECO from './core/economy.js';
import * as NETM from './core/network.js';
import { updatePlayer, setPlayerPosition, buildHands, hands, playerBody, releaseAll } from './core/player.js';
import { redrawTerminals, updatePointers, updateToast, markAllDirty, toast, terminals } from './core/terminal.js';
import { initAudio } from './core/audio.js';
import { drawScoreboard } from './core/ui.js';

// Lista poziomów. Nowy poziom = nowy plik w folderze levels/ + wpis tutaj.
// light: preset oświetlenia z config.js, extras: dodatkowe pliki doładowywane razem z poziomem
const LEVELS = {
    lobby: { path: './levels/lobby.js', light: LIGHT_MODE, extras: ['./levels/lobby-door.js'] },
    maze: { path: './levels/maze.js', light: 'night', extras: [] },
    silence: { path: './levels/silence.js', light: 'night', extras: [] },
    well: { path: './levels/well.js', light: 'night', extras: [] }
};
let level = null, extras = [], levelId = null, started = false, switching = false;

export async function loadLevel(id, spawn) {
    const cfg = LEVELS[id];
    releaseAll();
    if (level && level.dispose) level.dispose();
    for (const e of extras) if (e.dispose) e.dispose();
    for (const t of terminals) t.mesh = null;   // ekrany starego poziomu przestają reagować na laser
    clearLevel();
    applyLighting(LIGHT_PRESETS[cfg.light]);
    level = await import(cfg.path);
    extras = [];
    for (const e of cfg.extras) extras.push(await import(e));
    L.levelId = id;   // poziom może to nadpisać (labirynt ma osobne id dla każdego układu)
    for (const e of extras) if (e.prebuild) e.prebuild();
    level.build();
    for (const e of extras) e.build();
    levelId = id;
    const sp = spawn || L.spawn;
    setPlayerPosition(sp[0], sp[1], sp[2]);
    markAllDirty();
}
// Przejście przez drzwi do innego poziomu
async function goToLevel(id, spawn) {
    if (switching) return;
    switching = true;
    try { await loadLevel(id, spawn); saveNow(); }
    catch (e) { console.error(e); toast('Could not load the level'); }
    switching = false;
}

// --- Menu ---
const $ = (id) => document.getElementById(id);
function fillMenu() {
    const p = ECO.SAVE.profile;
    $('playerName').value = p.name; $('playerColor').value = p.color;
    const has = ECO.hasSave();
    $('btnSolo').innerText = has ? 'Continue solo' : 'Play solo';
    $('saveInfo').innerText = has
        ? 'Save found: ' + ECO.SAVE.wallet + ' bones, record ' + Math.floor(ECO.SAVE.best.height) + ' m, ' + ECO.SAVE.owned.filter(o => !/none|cap|cloth/.test(o)).length + ' items bought.'
        : 'No save yet. Your progress is saved on this device when you leave the game.';
    $('btnNew').style.display = has ? 'inline-block' : 'none';
}
function lobbyButtons(on) { ['btnHost', 'btnJoin', 'btnSolo', 'btnNew'].forEach(id => { $(id).disabled = !on; }); }
function readProfile() {
    ECO.setProfile({ name: ($('playerName').value || 'Acrobat').slice(0, 16), color: $('playerColor').value });
    NETM.NET.code = NETM.sanitizeCode($('roomCode').value) || 'MAIN';
}

function startGame(restorePosition) {
    if (started) return;
    started = true;
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
    const reward = ECO.claimLoginReward();
    if (!reward) { const st = ECO.loginStatus(); toast('Next login reward in ' + ECO.fmtDuration(st.msLeft)); }
    setInterval(() => NETM.networkTick(hands.L, hands.R), 1000 / 30);
    setInterval(saveNow, 30000);
}

$('btnSolo').onclick = () => { initAudio(); readProfile(); startGame(true); };
$('btnHost').onclick = () => { initAudio(); readProfile(); lobbyButtons(false); NETM.startHost(NETM.NET.code, { ok: () => startGame(false), fail: () => lobbyButtons(true) }); };
$('btnJoin').onclick = () => { initAudio(); readProfile(); lobbyButtons(false); NETM.startJoin(NETM.NET.code, { ok: () => startGame(false), fail: () => lobbyButtons(true) }); };
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
    updatePlayer(dt, t);
    if (level && !switching) {
        const ctx = { pos: playerBody.position, body: playerBody, goto: (id, sp) => goToLevel(id, sp) };
        level.update(dt, t, ctx);
        for (const e of extras) if (e.update) e.update(dt, t, ctx);
        // Drzwi do innych poziomów
        if (started) for (const pt of L.portals) {
            if (pt.box3.containsPoint(playerBody.position)) { if (pt.onEnter) pt.onEnter(); goToLevel(pt.target, pt.spawn); break; }
        }
    }
    NETM.poseRemoteHands(dt);
    if (started) ECO.tick(dt, NETM.otherPlayers().length);
    updatePointers();
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
