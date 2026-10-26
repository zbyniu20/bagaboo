// ==========================================
// START GRY: menu, ładowanie poziomów, zapis przy wyjściu, pętla gry
// ==========================================
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { THREE, scene, camera, renderer, L, clearLevel } from './core/engine.js';
import * as ECO from './core/economy.js';
import * as NETM from './core/network.js';
import { updatePlayer, setPlayerPosition, buildHands, hands, playerBody, releaseAll } from './core/player.js';
import { redrawTerminals, updatePointers, updateToast, markAllDirty, toast } from './core/terminal.js';
import { drawScoreboard } from './core/ui.js';

// Lista poziomów. Nowy poziom = nowy plik w folderze levels/ + wpis tutaj.
const LEVELS = { lobby: './levels/lobby.js' };
let level = null, levelId = null, started = false;

export async function loadLevel(id) {
    releaseAll();
    clearLevel();
    level = await import(LEVELS[id]);
    level.build();
    levelId = id;
    markAllDirty();
}

// --- Menu ---
const $ = (id) => document.getElementById(id);
function fillMenu() {
    const p = ECO.SAVE.profile;
    $('playerName').value = p.name; $('playerSkin').value = p.skin; $('playerColor').value = p.color;
    const has = ECO.hasSave();
    $('btnSolo').innerText = has ? 'Continue solo' : 'Play solo';
    $('saveInfo').innerText = has
        ? 'Save found: ' + ECO.SAVE.wallet + ' bones, record ' + Math.floor(ECO.SAVE.best.height) + ' m, ' + (ECO.SAVE.owned.length - 5) + ' items bought.'
        : 'No save yet. Your progress is saved on this device when you leave the game.';
    $('btnNew').style.display = has ? 'inline-block' : 'none';
}
function lobbyButtons(on) { ['btnHost', 'btnJoin', 'btnSolo', 'btnNew'].forEach(id => { $(id).disabled = !on; }); }
function readProfile() {
    ECO.setProfile({ name: ($('playerName').value || 'Acrobat').slice(0, 16), skin: $('playerSkin').value, color: $('playerColor').value });
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

$('btnSolo').onclick = () => { readProfile(); startGame(true); };
$('btnHost').onclick = () => { readProfile(); lobbyButtons(false); NETM.startHost(NETM.NET.code, { ok: () => startGame(false), fail: () => lobbyButtons(true) }); };
$('btnJoin').onclick = () => { readProfile(); lobbyButtons(false); NETM.startJoin(NETM.NET.code, { ok: () => startGame(false), fail: () => lobbyButtons(true) }); };
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
    if (level) level.update(dt, t, { pos: playerBody.position });
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
