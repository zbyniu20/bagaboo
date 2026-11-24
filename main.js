// ==========================================
// START GRY: menu, ładowanie poziomów (z ekranem ładowania), drużyna za hostem, pauza, winieta,
// tryb testowy na komputerze, okienko błędów, zapis przy wyjściu, pętla gry
// ==========================================
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { updateDebug } from './core/debug.js';
import { THREE, scene, camera, renderer, L, clearLevel, applyLighting, lighting } from './core/engine.js';
import { LIGHT_PRESETS, LIGHT_MODE } from './core/config.js';
import * as ECO from './core/economy.js';
import * as NETM from './core/network.js';
import { createJumpscare } from './core/levelkit.js';
import { updatePlayer, setPlayerPosition, faceWorldYaw, buildHands, hands, playerBody, releaseAll } from './core/player.js';
import { redrawTerminals, updatePointers, updateToast, markAllDirty, toast, terminals } from './core/terminal.js';
import { initAudio, updateListener, hooks as audioHooks } from './core/audio.js';
import { setLevelMusic } from './core/music.js';
import { pollEmoteButtons } from './core/emotepanel.js';
import { setAmbience, dreadUpdate, DREAD } from './core/ambience.js';
import { beginRun, mutFactor } from './core/mutators.js';
import { updateAcoustics } from './core/acoustics.js';
import { bakeLevel, applyArt, updateBake } from './core/lightbake.js';
import { updateDust } from './core/dust.js';
import { buildShafts } from './core/shafts.js';
import { addLevelProps } from './core/props.js';
import { addLevelDecals } from './core/decals.js';
import { addLevelKit } from './core/kit.js';
import { updateSpectate } from './core/spectate.js';
import { updateTutorial, autoStartTutorial } from './core/tutorial.js';
import { updateGlbMonsters } from './core/glbmonster.js';
import { updateHighFive } from './core/highfive.js';
import { startXrPerf, stopXrPerf, updateXrPerf } from './core/xrperf.js';
import { updateDesktopPerf, resetDesktopPerf } from './core/desktopperf.js';   // automatyczna rozdzielczość poza VR
import { drawScoreboard } from './core/ui.js';
import { PAUSE, pauseMenu, pollPauseButtons, closePause } from './core/pause.js';
import { LEVEL_DATA, payload as levelPayload, accept as levelAccept } from './core/leveldata.js';
import './core/workshopstore.js';   // rejestruje dane mapy dla gości (Własna mapa)
import './core/homestore.js';       // rejestruje układ pokoju dla gości (odwiedziny)
import { SETTINGS, saveSettings, GAMES_CALM } from './core/settings.js';
import { enableDesktop, updateDesktop, setDesktopFacing } from './core/desktop.js';
import { startPresence } from './core/presence.js';
import { updateHammer } from './core/hammer.js';
import { updateVrMenu, vrMenuTerminal } from './core/vrmenu.js';
import { onLevelBuilt, updateVisuals } from './core/visuals.js';
import { registerLevelLights, updateLightPool } from './core/lightpool.js';
import { captureEnvironment } from './core/envcapture.js';
import { LEVEL_DEFS, levelPath } from './core/registry.js';
import { isReservedNick, isStaffName } from './core/config.js';
import * as AUTH from './core/auth.js';
import * as SK from './core/staffkey.js';
import { updateModMenu } from './core/modmenu.js';
import { buildPet, updatePet, disposePet } from './core/pet.js';   // Stworek: towarzysz w salach (lobby, Levels, Games, Staff, Wardrobe, My Room)

// Lista poziomów jest w core/registry.js (nowy poziom = plik w levels/ + wpis w rejestrze).
// light: preset oświetlenia z config.js ('@mode' = tryb lobby), extras: dodatkowe pliki doładowywane razem z poziomem
const LEVELS = Object.fromEntries(LEVEL_DEFS.filter(d => d.kind !== 'virtual').map(d => [d.id, { path: levelPath(d), light: d.light === '@mode' ? LIGHT_MODE : d.light, extras: d.extras || [] }]));
let level = null, extras = [], levelId = null, started = false, switching = false;

const cfgKind = (id) => (LEVEL_DEFS.find(d => d.id === id) || {}).kind;
// Poziomy ładują się dynamicznie. W buildzie Vite (npm run build, stała __BAGABOO_BUNDLED__) ścieżka ze zmiennej nie przejdzie przez bundler, więc bierzemy mapę ładowarek z import.meta.glob;
// w zwykłej przeglądarce (strona z repozytorium) GLOB jest null i działa dotychczasowy import(ścieżka).
const GLOB = typeof __BAGABOO_BUNDLED__ !== 'undefined' ? import.meta.glob('./levels/*.js') : null;
const loadModule = (p) => (GLOB && GLOB[p]) ? GLOB[p]() : import(p);
export async function loadLevel(id, spawn) {
    const cfg = LEVELS[id];
    releaseAll();
    if (level && level.dispose) level.dispose();
    for (const e of extras) if (e.dispose) e.dispose();
    for (const t of terminals) if (t !== pauseMenu && t !== vrMenuTerminal && !t.persistent) t.mesh = null;   // ekrany starego poziomu przestają reagować na laser
    disposePet();   // stworek zostaje w starym poziomie, w nowej sali powstaje od nowa
    clearLevel();
    applyLighting(LIGHT_PRESETS[cfg.light]);
    level = await loadModule(cfg.path);
    extras = [];
    for (const e of cfg.extras) extras.push(await loadModule(e));
    L.levelId = id;   // poziom może to nadpisać (labirynt ma osobne id dla każdego układu)
    for (const e of extras) if (e.prebuild) e.prebuild();
    L.visit = (Math.random() * 1e9) | 0;                   // zapach wizyty: decale, rekwizyty i elementy architektury układają się inaczej przy każdym wejściu (tylko wygląd)
    DREAD.fogMul = 1;                                      // gęstość mgły z poprzedniego poziomu nie przechodzi dalej (Staff room i Final Hunt ustawiają własną)
    const run = beginRun(L.levelId, ECO.dailyOn(id));      // nastrój wizyty i mutator wybrany w terminalu (core/mutators.js), PRZED budową, bo createEvents czyta częstość
    level.build();
    for (const e of extras) e.build();
    buildPet(id);
    const calmLevel = id === 'games' || cfgKind(id) === 'game';   // GAMES_CALM.on jest ustawiane dopiero niżej, więc dekoracje dostają tryb jawnie (inaczej widziałyby wartość z poprzedniego poziomu)
    addLevelDecals(L.levelId, cfgKind(id), calmLevel);        // plamy na ścianach i podłodze wg rodziny kolorystycznej (core/decals.js): jedna siatka
    addLevelKit(L.levelId, cfgKind(id), calmLevel).catch(() => {});   // listwy, rury, korytka i kratki przy ścianach wg rodziny kolorystycznej (core/kit.js): instancje, bez kolizji
    addLevelProps(L.levelId, calmLevel).catch(() => {});             // rekwizyty z assets/props/props.glb (core/props.js): instancje, bez kolizji; brak pliku = bez zmian
    onLevelBuilt(cfg.light, LIGHT_PRESETS[cfg.light]);   // warstwa wizualna (odbicia, szczegół, poświaty, cząsteczki)
    if (run.mutator) { lighting.hemi.intensity *= mutFactor('hemi'); DREAD.fogMul *= mutFactor('fog'); }   // mutator Pitch black: ciemniej i gęstsza mgła (po applyLighting)
    if (run.mutator) toast('Mutator: ' + run.mutator.name + '. ' + run.mutator.info + ' No rewards, no records.', run.mutator.color);
    else if (run.mood && run.mood.name) toast('Tonight the place feels ' + run.mood.name + '...', '#9aa6b0');
    applyArt(L.levelId);                                   // paleta rodziny poziomu (core/artlogic.js): światło otoczenia i mgła
    autoStartTutorial(L.levelId);                          // nowy gracz dostaje samouczek sam przy pierwszym wejściu do lobby (core/tutorial.js)
    buildShafts(calmLevel);                                         // snopy światła pod stałymi lampami (core/shafts.js): jedna siatka
    bakeLevel();                                           // wypalone światło pośrednie ze wszystkich świateł poziomu (core/lightbake.js), PRZED pulą świateł
    registerLevelLights(L.root);                           // pula świateł: do renderu trafia tylko K najważniejszych
    // Prawdziwe odbicia: jednorazowe zdjęcie poziomu z miejsca startu (światła wybrane dla tego miejsca, latarka wyłączona na czas zdjęcia)
    { const sp = L.spawn || [0, 1, 0], lampOn = lighting.headLamp.visible; updateLightPool(1, new THREE.Vector3(sp[0], sp[1], sp[2])); lighting.headLamp.visible = false;
      const env = captureEnvironment(LIGHT_PRESETS[cfg.light]); lighting.headLamp.visible = lampOn; if (env) scene.environment = env.texture; }
    levelId = id; PAUSE.inLobby = id === 'lobby';
    GAMES_CALM.on = id === 'games' || cfgKind(id) === 'game';   // BagaBoo Games: bez nametagów i bez jumpscare'ów
    setLevelMusic(id); setAmbience(id);   // dynamiczna muzyka i ambient 3D dla tego poziomu
    const sp = spawn || L.spawn;
    // W multiplayerze każdy gracz pojawia się w trochę innym miejscu (na okręgu 1,2 m wokół punktu startu),
    // żeby nie stać w sobie nawzajem. Gdy to miejsce jest w ścianie, zostaje zwykły punkt startu.
    let sx = sp[0], sz = sp[2];
    if (NETM.NET.mode !== 'solo') {
        const id = NETM.myId() || ''; let h = 0; for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
        const ang = (h % 360) * Math.PI / 180, ox = sp[0] + Math.cos(ang) * 1.2, oz = sp[2] + Math.sin(ang) * 1.2;
        const probe = new THREE.Vector3(ox, sp[1], oz), B = L.bounds;
        if (ox > B.minX && ox < B.maxX && oz > B.minZ && oz < B.maxZ && !L.obstacles.some(o => o.box3.distanceToPoint(probe) < 0.4)) { sx = ox; sz = oz; }
    }
    setPlayerPosition(sx, sp[1], sz);
    // Sale Levels i Games: gracz patrzy wprost na terminale (-z), a nie w stronę drzwi do lobby; inne poziomy zostają bez zmian
    if (id === 'levels' || id === 'games') { setDesktopFacing(0); faceWorldYaw(renderer.xr.isPresenting ? 0 : null); } else faceWorldYaw(null);
    markAllDirty();
}
// Ekran ładowania przed oczami: zamiast zamrożonego obrazu gracz widzi czerń z napisem
const LEVEL_NAMES = Object.fromEntries(LEVEL_DEFS.filter(d => d.name).map(d => [d.id, d.name]));
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
const SEEDED = { maze: true, well: true, memory: true };   // poziomy z losowym układem, wspólnym dla drużyny
async function goToLevel(id, spawn, opts) {
    if (switching) return;
    switching = true;
    opts = opts || {};
    if (PAUSE.on) closePause();
    // Ziarno układu: od hosta, z restartu albo nowe losowe
    // Daily Run (przełącznik przy pulpicie): układ z daty, taki sam dla wszystkich; w drużynie liczy się ziarno hosta
    L.levelSeed = SEEDED[id] ? (opts.seed !== undefined ? opts.seed : (ECO.dailyOn(id) ? ECO.dailySeed(id) : (Math.random() * 1e9) | 0)) : undefined;
    if (SEEDED[id]) ECO.setRunSeed(id, L.levelSeed);
    // Dane poziomu od hosta (np. mapa Warsztatu): gość przyjmuje je tylko przez walidator poziomu, własne wejście używa danych lokalnych
    LEVEL_DATA.current = opts.data !== undefined ? levelAccept(id, opts.data) : null;
    if (NETM.NET.mode === 'host' && !opts.noFollow && id !== 'staff') NETM.sendFollow(id, { seed: L.levelSeed, data: levelPayload(id) });   // goście idą za hostem (oprócz pokoju szefa)
    showLoading(LEVEL_NAMES[id] || id);
    await nextFrames(3);   // najpierw pokaż czarny ekran, dopiero potem ciężka praca
    try { await loadLevel(id, spawn); saveNow(); }
    catch (e) { console.error(e); toast('Could not load the level'); }
    fade.target = 0;
    switching = false;
}
PAUSE.onLobby = () => goToLevel('lobby');
// Wylogowanie z poziomu gry (menu pauzy): konto -> gość. Zmiana tożsamości w pokoju online = wyjście z pokoju (leaveNetwork), potem lobby solo jako gość;
// strona się NIE przeładowuje, więc sesja VR trwa dalej.
PAUSE.onLogout = () => {
    if (!AUTH.account()) return;
    const online = NETM.NET.mode !== 'solo';
    $('btnLogout').click(); $('btnGuest').click();   // te same przyciski co na stronie startowej: wyloguj, potem graj jako gość
    readProfile();                                    // nick gościa (zastrzeżony nick ekipy zamienia się na zwykły)
    if (online) { NETM.leaveNetwork('Logged out. You left the room and play solo as a guest.'); goToLevel('lobby'); }
    toast('Logged out. You play as a guest now.', '#ffd27a');
};
// Gość: host przeszedł przez drzwi, idziemy za nim (ten sam poziom i układ)
let pendingFollow = null;
NETM.onFollow((level, data) => {
    if (NETM.NET.mode !== 'guest') return;
    if (level === levelId && !SEEDED[level]) return;   // już tu jesteśmy
    if (!started) { pendingFollow = { level: level, data: data }; return; }
    toast('Following the host...', '#9fc8ff');
    goToLevel(level, null, { seed: data.seed, noFollow: true, data: data.data });
});
// Gość: zaproszenie od hosta (pokój szefa) albo odesłanie do lobby
// Haker przyłapany w pokoju szefa: skórka CHEATER na zawsze i ban na tydzień
NETM.onCheater((until) => {
    if (isStaffName(ECO.SAVE.profile.name)) return;   // ekipa nigdy nie dostaje CHEATERA
    ECO.markCheater(); NETM.selfBan(Math.max(0, (until || 0) - Date.now()) || 7 * 24 * 3600 * 1000);
    toast('CHEATER! Breaking into the staff room = one-week ban.', '#ff2a2a');
    NETM.leaveNetwork('You were caught cheating. Banned for one week.');
    setTimeout(() => location.reload(), 3000);
});
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

// Przed startem: ban na dobę i konto dla zastrzeżonego nicku
async function canStart(allowBanned) {
    await NETM.ensureMic();   // jeśli przeglądarka nie dała mikrofonu przy wczytaniu strony, pytamy jeszcze raz przy kliknięciu
    const ban = NETM.myBanUntil();
    if (ban && !allowBanned) { $('status').innerText = 'You are banned until ' + new Date(ban).toLocaleString() + '.'; return false; }
    const acc = AUTH.account();
    if (acc) $('playerName').value = acc.nick;   // zalogowany gracz gra pod nickiem swojego konta
    else if (!guestMode) {   // najpierw logowanie albo świadomy wybór gry jako gość (dotyczy też przycisków z menu w goglach)
        showStage('auth'); acctMsg('Log in or create an account, or go back and play with a nickname.', false);
        $('status').innerText = 'Log in or go back and play with a nickname.';
        return false;
    } else {
        const name = ($('playerName').value || '').trim();
        if (isReservedNick(name)) {
            if (AUTH.accountsOn()) { guestMode = false; showStage('auth'); }
            acctMsg('The nickname "' + name + '" is reserved for the staff. Staff: log in with your password or your PIN below. Everyone else: go back and pick another nickname.', false); openStaffKey(name);
            $('status').innerText = 'The nickname "' + name + '" is reserved. Pick another nickname.';
            return false;
        }
    }
    return true;
}
$('btnSolo').onclick = async () => { if (!(await canStart())) return; initAudio(); readProfile(); startGame(true); };
$('btnHost').onclick = async () => { if (!(await canStart())) return; initAudio(); readProfile(); lobbyButtons(false); NETM.startHost(NETM.NET.code, { ok: () => startGame(false), fail: () => lobbyButtons(true) }); };
$('btnJoin').onclick = async () => { if (!(await canStart(true))) return; initAudio(); readProfile(); lobbyButtons(false); NETM.startJoin(NETM.NET.code, { ok: () => startGame(false), fail: () => lobbyButtons(true) }); };
// --- Konto (core/auth.js): logowanie, rejestracja, odzyskiwanie hasła ---
// Hasła nie są nigdzie zapisywane. Poprzednia wersja zapamiętywała je jawnie w localStorage, więc przy starcie je kasujemy.
try { localStorage.removeItem('bagaboo_saved_pw'); } catch (e) {}
let confirmedNick = '';   // nick potwierdzony przez serwer kont w tej sesji (po logowaniu albo po udanym sprawdzeniu sesji)
const acctMsg = (text, good) => { const m = $('acctMsg'); m.innerText = text || ''; m.style.color = good ? '#9aff60' : '#ff8a70'; };
function acctBusy(on) { ['btnLogin', 'btnRegister', 'btnReset', 'btnGuest', 'btnKeyCreate', 'btnKeyLogin'].forEach(id => { $(id).disabled = on; }); }
// Dwa ekrany: najpierw logowanie ('auth'), potem menu z trybami gry ('menu'). Do menu wchodzi się po zalogowaniu albo jako gość.
let guestMode = true, recoveryPending = false;   // domyślnie: wpisz nick i graj; konto jest opcjonalne (chroni nick)
function showStage(stage) { $('authStage').style.display = stage === 'auth' ? 'block' : 'none'; $('menuStage').style.display = stage === 'menu' ? 'block' : 'none'; }
function syncAccountUi() {
    const a = AUTH.account(), nm = $('playerName');
    $('acctWho').innerText = a ? 'Signed in as ' + a.nick : 'Playing as a guest';
    $('btnLogout').style.display = a ? 'inline-block' : 'none'; $('btnToLogin').style.display = a ? 'none' : 'inline-block';
    $('acctBar').style.display = AUTH.accountsOn() ? 'flex' : 'none';   // bez logowania nie ma paska konta
    $('authForm').style.display = recoveryPending ? 'none' : 'block';
    nm.readOnly = !!a; nm.title = a ? 'Your account nickname. Log out to use another.' : '';
    if (a) nm.value = a.nick;
    else if (isReservedNick(nm.value)) nm.value = 'Acrobat';   // bez konta nick ekipy nie zostaje w polu
    ECO.markNickVerified(a && confirmedNick === a.nick ? a.nick : '');   // premia ekipy (economy.js) tylko po potwierdzeniu przez serwer
    if (recoveryPending) showStage('auth');   // najpierw kod odzyskiwania, dopiero potem menu
    else showStage(!AUTH.accountsOn() || a || guestMode ? 'menu' : 'auth');
}
AUTH.onAuthChange(syncAccountUi);
function showRecovery(code) { $('recoveryCode').innerText = code; $('recoveryBox').style.display = 'block'; }
async function runAuth(kind) {
    const nick = $('acctNick').value.trim(), pass = $('acctPass').value;
    recoveryPending = kind === 'register';   // po rejestracji pokazujemy kod odzyskiwania przed wejściem do menu
    acctBusy(true); acctMsg('Contacting the account server...', true);
    const res = kind === 'register' ? await AUTH.register(nick, pass) : await AUTH.login(nick, pass);
    acctBusy(false);
    if (!res.ok) { recoveryPending = false; acctMsg(AUTH.errorText(res), false); return; }
    $('acctPass').value = ''; confirmedNick = res.account.nick; acctMsg('');
    if (res.recoveryCode) showRecovery(res.recoveryCode); else recoveryPending = false;
    syncAccountUi();
}
$('btnLogin').onclick = () => runAuth('login');
$('btnRegister').onclick = () => runAuth('register');
$('acctPass').addEventListener('keydown', (e) => { if (e.key === 'Enter') runAuth('login'); });
$('acctNick').addEventListener('keydown', (e) => { if (e.key === 'Enter') $('acctPass').focus(); });
$('btnForgot').onclick = () => { const r = $('acctReset'); r.style.display = r.style.display === 'none' ? 'block' : 'none'; };
$('btnReset').onclick = async () => {
    recoveryPending = true;
    acctBusy(true); acctMsg('Contacting the account server...', true);
    const res = await AUTH.resetPassword($('acctNick').value.trim(), $('acctCode').value, $('acctNewPass').value);
    acctBusy(false);
    if (!res.ok) { recoveryPending = false; acctMsg(AUTH.errorText(res), false); return; }
    $('acctCode').value = $('acctNewPass').value = ''; $('acctReset').style.display = 'none'; confirmedNick = res.account.nick; acctMsg('');
    if (res.recoveryCode) showRecovery(res.recoveryCode); else recoveryPending = false;   // stary kod przestaje działać, więc pokazujemy nowy
    syncAccountUi();
};
// Klucz ekipy (core/staffkey.js): konto admina i moda bez serwera. Przy pierwszej wizycie ekipa wybiera własny PIN; klucz prywatny
// zostaje na tym urządzeniu zaszyfrowany tym PIN-em, a po każdym wejściu na stronę trzeba go podać.
const keyErr = { not_staff_nick: 'Type your staff nickname in the nickname field first.', bad_pin: 'Wrong PIN. A new PIN needs 4 to 12 digits.', no_key: 'No staff key on this device yet. Choose a PIN and create one.', not_registered: 'Right PIN, but this key is not registered yet. Send the public key to the owner.', storage: 'Could not save the key on this device.', bad_key: 'That is not a valid staff key.' };
const keyMsg = (r) => r.error === 'locked' ? 'Too many wrong PINs. Try again in ' + Math.max(1, Math.ceil((r.retryAfterSec || 60) / 60)) + ' min.' : (keyErr[r.error] || 'Something went wrong.');
function syncKeyUi() {
    const has = SK.hasKey();
    $('keyPin2').style.display = has ? 'none' : 'block'; $('btnKeyCreate').style.display = has ? 'none' : 'inline-block'; $('btnKeyLogin').style.display = has ? 'inline-block' : 'none';
    $('keyHint').innerText = has ? 'Enter your PIN to log in as ' + SK.readKey().nick + '.' : 'First visit: choose your own PIN. It protects your staff key on this device.';
}
function openStaffKey(nick) { $('staffKey').open = true; if (nick) $('acctNick').value = nick; syncKeyUi(); }
$('btnKeyCreate').onclick = async () => {
    const pin = $('keyPin').value;
    if (pin !== $('keyPin2').value) { acctMsg('The two PINs are different.', false); return; }
    acctBusy(true); const res = await SK.createKey($('acctNick').value.trim(), pin); acctBusy(false);
    if (!res.ok) { acctMsg(keyMsg(res), false); return; }
    $('keyPin').value = $('keyPin2').value = ''; $('keyText').value = JSON.stringify({ [res.nick.toLowerCase()]: res.pub }); syncKeyUi();
    if (res.registered) { confirmedNick = res.nick; acctMsg('PIN set. You are logged in as ' + res.nick + '.', true); syncAccountUi(); }
    else acctMsg('PIN set and key created. Send the public key below to the owner so it can be added to STAFF_KEYS (core/config.js). Until then nobody trusts it.', true);
};
$('btnKeyLogin').onclick = async () => {
    acctBusy(true); const r = await SK.signIn($('keyPin').value); acctBusy(false); $('keyPin').value = '';
    if (!r.ok) { acctMsg(keyMsg(r), false); return; }
    confirmedNick = r.nick; acctMsg(''); syncAccountUi();
};
$('keyPin').addEventListener('keydown', (e) => { if (e.key === 'Enter') { if (SK.hasKey()) $('btnKeyLogin').click(); else $('keyPin2').focus(); } });
$('btnKeyExport').onclick = () => { const t = SK.exportKey(); $('keyText').value = t; acctMsg(t ? 'Encrypted key. It only works with your PIN, but still do not share it.' : 'No staff key on this device.', !!t); };
$('btnKeyImport').onclick = () => { const r = SK.importKey($('keyText').value); acctMsg(r.ok ? (r.registered ? 'Key imported. Enter your PIN and log in.' : 'Key imported, but its public key is not registered yet.') : keyMsg(r), !!r.ok); if (r.ok) { $('keyText').value = ''; syncKeyUi(); } };
syncKeyUi();
$('btnGuest').onclick = () => { guestMode = true; acctMsg(''); syncAccountUi(); };
$('btnToLogin').onclick = () => { guestMode = false; acctMsg(''); syncAccountUi(); };
$('btnLogout').onclick = () => { confirmedNick = ''; guestMode = true; AUTH.logout(); acctMsg('Signed out.', true); };
$('btnRecoverySaved').onclick = () => { recoveryPending = false; $('recoveryBox').style.display = 'none'; $('recoveryCode').innerText = ''; syncAccountUi(); };
syncAccountUi();
{ const la = AUTH.account(); if (la && la.local) confirmedNick = la.nick; syncAccountUi(); }   // klucz ekipy z tego urządzenia: tożsamość potwierdza podpis, nie serwer
AUTH.refresh().then((a) => { if (a) confirmedNick = a.nick; syncAccountUi(); });   // zapisana sesja: serwer potwierdza ją albo wylogowuje
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
const _stepP = new THREE.Vector3(), _stepLast = new THREE.Vector3();
audioHooks.onScare = () => ECO.bumpStat('scares');
let uiTimer = 0;
const goobyScare = createJumpscare({ gooby: true });   // Nothing Hammer (młotek Gooby): jedyny jumpscare z Gooby (obraz i głos), dla trafionego gracza na każdym poziomie
NETM.onGooby(() => goobyScare.trigger());
const noobScare = createJumpscare({ noob: true });   // ultimate admin (zbyniu) dotknął cię ręką: napis NOOB i głośny dźwięk "noob" (nie działa w BagaBoo Games)
NETM.onNoob(() => noobScare.trigger());
renderer.setAnimationLoop(() => {
    const rawDt = clock.getDelta(), dt = Math.min(rawDt, 0.1), t = clock.elapsedTime;
    if (renderer.xr.isPresenting) { updateXrPerf(rawDt); resetDesktopPerf(); } else updateDesktopPerf(rawDt);
    for (let i = frameWaiters.length - 1; i >= 0; i--) if (--frameWaiters[i].n <= 0) { frameWaiters[i].r(); frameWaiters.splice(i, 1); }
    pollPauseButtons(); pollEmoteButtons();
    updateModMenu(dt);   // BagaBooModMenu: B przez 2 s (tylko konta z MODMENU_NAMES), opcje admina
    goobyScare.update(dt); noobScare.update(dt);
    // Pauza zatrzymuje świat tylko w grze solo
    const frozen = PAUSE.on && NETM.NET.mode === 'solo';
    if (!frozen) { updateSpectate(dt); updatePlayer(dt, t); updateDesktop(dt); updateHammer(dt); }
    if (level && !switching && !frozen) {
        const ctx = { pos: playerBody.position, body: playerBody, goto: (id, sp, o) => goToLevel(id, sp, o) };
        level.update(dt, t, ctx);
        for (const e of extras) if (e.update) e.update(dt, t, ctx);
        updatePet(dt, t, ctx);
        // Drzwi do innych poziomów
        if (started) for (const pt of L.portals) {
            if (pt.box3.containsPoint(playerBody.position)) {
                if (pt.cond && !pt.cond()) { if (pt.deny && t - (pt.deniedAt || -9) > 3) { pt.deniedAt = t; toast(pt.deny, '#e0533f'); } continue; }   // drzwi zamknięte dla tego gracza
                if (pt.onEnter) pt.onEnter(); goToLevel(pt.target, pt.spawn, pt.opts); break;
            }
        }
    }
    NETM.poseRemoteHands(dt); NETM.tickDismember(dt); dreadUpdate(dt); updateAcoustics(dt); updateGlbMonsters(dt); updateBake(dt); updateDust(dt); updateTutorial(dt);
    NETM.animateFaces(dt);
    if (started && !frozen) {
        ECO.tick(dt, NETM.otherPlayers().length);
        // dystans: poziomy ruch głowy, pomijamy teleporty (> 3 m na klatkę) i oderwane skoki
        camera.getWorldPosition(_stepP); const dm = Math.hypot(_stepP.x - _stepLast.x, _stepP.z - _stepLast.z); if (dm > 0.001 && dm < 3) ECO.bumpStat('meters', dm); _stepLast.copy(_stepP);
    }
    updateHighFive();
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
    updateVrMenu(started);   // menu startowe w goglach, dopóki gra się nie zacznie
    updateVisuals(dt, t); updateLightPool(dt);
    updatePointers(renderer.xr.isPresenting ? null : camera);
    updateDebug(dt);
    if (t - uiTimer > 1) { uiTimer = t; drawScoreboard(); markAllDirty(); }
    redrawTerminals();
    updateToast(dt);
    renderer.render(scene, camera);
});

// --- Start ---
document.body.appendChild(VRButton.createButton(renderer, { optionalFeatures: ['local-floor'] }));   // bez hand-tracking i layers: gra używa kontrolerów, a Quest nie pyta o zbędne zgody
NETM.initMic();
// Spust w goglach odblokowuje dźwięk głosów innych graczy (przeglądarka wymaga gestu użytkownika)
for (const i of [0, 1]) renderer.xr.getController(i).addEventListener('selectstart', NETM.unlockVoices);
renderer.xr.addEventListener('sessionstart', NETM.unlockVoices);
renderer.xr.addEventListener('sessionstart', () => startXrPerf(renderer.xr.getSession()));
renderer.xr.addEventListener('sessionend', stopXrPerf);
fillMenu();
$('status').innerText = 'Loading the lobby...';
lobbyButtons(false);
loadLevel('lobby').then(() => {
    lobbyButtons(true); syncAccountUi(); drawScoreboard();
    const ban = NETM.myBanUntil();
    $('status').innerText = ban ? 'You are banned until ' + new Date(ban).toLocaleString() + '. If the owner unbanned you, press Join Room.' : 'Ready. Put on your headset and press Enter VR after starting.';
    if (ban) { lobbyButtons(false); $('btnJoin').disabled = false; }   // zbanowany może tylko dołączyć do pokoju (host może go odbanować)
})
    .catch((e) => { console.error(e); $('status').innerText = 'Could not load the level: ' + e.message; });
// Uchwyt dla testów w przeglądarce (tests/smoke-dist.mjs sprawdza nim zbudowaną paczkę): ładowanie poziomu i licznik rysowania
window.BAGABOO_DEBUG = { loadLevel: loadLevel, renderer: renderer, scene: scene };
