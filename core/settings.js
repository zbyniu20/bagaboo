// ==========================================
// USTAWIENIA GRACZA (osobno od zapisu gry): głośność, winieta, jakość grafiki
// ==========================================
const KEY = 'bagaboo_settings';
function read() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } }
// Wersja ustawień: 2 = wszystkie opcje graficzne domyślnie włączone (jakość High, winieta, Gore, Haunt, wibracje). Zapis starszej wersji dostaje te domyślne jednorazowo;
// potem wybory gracza (np. niższa jakość w menu) są zapamiętywane jak dawniej.
export const SETTINGS_VER = 2;
export const GRAPHICS_DEFAULTS = { quality: 'high', vignette: true, gore: true, lobbyEvents: true, haptics: true };
const saved = read(), migrated = (+saved.ver || 0) < SETTINGS_VER;
if (migrated) Object.assign(saved, GRAPHICS_DEFAULTS, { ver: SETTINGS_VER });
export const SETTINGS = Object.assign({
    ver: SETTINGS_VER,
    music: 1.0,        // muzyka tła 0..1
    effects: 1.0,      // efekty dźwiękowe 0..1
    scare: 1.0,        // głośność jumpscare'ów 0..1
    gore: true,        // Become the Monster: pokazuj urwane ręce i głowy złapanych graczy (domyślnie włączone, wyłącza się w menu pauzy)
    lobbyEvents: true,  // Nocna Zmiana w lobby (wydarzenie co kilkanaście minut)
    vignette: true,    // przyciemnianie brzegów przy szybkim ruchu (komfort)
    haptics: true,     // wibracje kontrolerów
    jumpscares: true,  // nagłe straszenie na poziomach (poziom brutalności, core/intensitylogic.js); false = brak jumpscare'ów u tego gracza
    warned: false,     // czy gracz widział ekran ostrzeżenia i wybrał poziom brutalności (strona startowa pokazuje go raz)
    brightness: 1.0,   // jasność obrazu 0.6..1.8 (mnożnik ekspozycji)
    snapTurn: false,   // obrót prawą gałką krokami co 30° zamiast płynnie (komfort VR)
    perfScale: 1.0,    // mnożnik rozdzielczości VR zapamiętany przez regulator wydajności (xrperf.js), 0.7..1
    quality: 'high'    // 'low' | 'medium' | 'high' (zmiana wymaga ponownego uruchomienia gry); domyślnie High
}, saved);
// Tryb spokojny BagaBoo Games (salon Games i wszystkie tryby): bez nametagów nad głowami i bez jumpscare'ów dla nikogo. Ustawia go main.js przy wejściu na poziom; nie jest zapisywany.
if (migrated) { try { localStorage.setItem(KEY, JSON.stringify(SETTINGS)); } catch (e) {} }   // zapamiętaj migrację, żeby nie powtarzała się przy każdym starcie
export const GAMES_CALM = { on: false };
export function saveSettings() { try { localStorage.setItem(KEY, JSON.stringify(SETTINGS)); } catch (e) {} }
