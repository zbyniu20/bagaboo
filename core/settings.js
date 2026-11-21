// ==========================================
// USTAWIENIA GRACZA (osobno od zapisu gry): głośność, winieta, jakość grafiki
// ==========================================
const KEY = 'bagaboo_settings';
function read() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } }
export const SETTINGS = Object.assign({
    music: 1.0,        // muzyka tła 0..1
    effects: 1.0,      // efekty dźwiękowe 0..1
    scare: 1.0,        // głośność jumpscare'ów 0..1
    lobbyEvents: true,  // Nocna Zmiana w lobby (wydarzenie co kilkanaście minut)
    vignette: true,    // przyciemnianie brzegów przy szybkim ruchu (komfort)
    haptics: true,     // wibracje kontrolerów
    brightness: 1.0,   // jasność obrazu 0.6..1.8 (mnożnik ekspozycji)
    snapTurn: false,   // obrót prawą gałką krokami co 30° zamiast płynnie (komfort VR)
    perfScale: 1.0,    // mnożnik rozdzielczości VR zapamiętany przez regulator wydajności (xrperf.js), 0.7..1
    quality: 'medium'  // 'low' | 'medium' | 'high' (zmiana wymaga ponownego uruchomienia gry)
}, read());
// Tryb spokojny BagaBoo Games (salon Games i wszystkie tryby): bez nametagów nad głowami i bez jumpscare'ów dla nikogo. Ustawia go main.js przy wejściu na poziom; nie jest zapisywany.
export const GAMES_CALM = { on: false };
export function saveSettings() { try { localStorage.setItem(KEY, JSON.stringify(SETTINGS)); } catch (e) {} }
