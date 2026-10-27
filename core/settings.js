// ==========================================
// USTAWIENIA GRACZA (osobno od zapisu gry): głośność, winieta, jakość grafiki
// ==========================================
const KEY = 'bagaboo_settings';
function read() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } }
export const SETTINGS = Object.assign({
    music: 1.0,        // muzyka tła 0..1
    effects: 1.0,      // efekty dźwiękowe 0..1
    scare: 1.0,        // głośność jumpscare'ów 0..1
    vignette: true,    // przyciemnianie brzegów przy szybkim ruchu (komfort)
    haptics: true,     // wibracje kontrolerów
    quality: 'medium'  // 'low' | 'medium' | 'high' (zmiana wymaga ponownego uruchomienia gry)
}, read());
export function saveSettings() { try { localStorage.setItem(KEY, JSON.stringify(SETTINGS)); } catch (e) {} }
