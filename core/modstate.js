// ==========================================
// BagaBooModMenu: wspólny stan opcji admina (bez importów, żeby player.js, network.js i modmenu.js mogły go czytać bez cykli).
// Opcje włącza się w menu (core/modmenu.js), a efekty liczą: player.js (boost, fly, noclip, size), network.js (invisible) i modmenu.js (xray).
// Menu mają tylko konta z listy MODMENU_NAMES w core/config.js; po wylogowaniu wszystko wraca do normy (resetMods).
// ==========================================
export const MOD = {
    allowed: false,     // zalogowane konto z listy menu (ustawia modmenu.js co klatkę; pause.js czyta, żeby B nie otwierało pauzy przy przytrzymaniu)
    open: false,        // panel menu jest otwarty
    boost: false,       // 3 x większa prędkość ruchu
    fly: false,         // latanie: prawy chwyt = lecisz tam, gdzie patrzysz, lewy chwyt = do tyłu, bez chwytu zawisasz
    noclip: false,      // przechodzenie przez przeszkody
    size: 1,            // skala goryla (1 = normalnie)
    sizeOn: false,      // spusty zmieniają rozmiar: lewy zmniejsza, prawy powiększa
    xray: false,        // inni gracze jako zielone poświaty z nametagami, widoczne przez ściany
    invisible: false    // inni gracze (poza adminami) cię nie widzą
};
// Osobisty mnożnik prędkości konta (ultimate admin zbyniu = 2; ustawia go economy.js tylko dla konta potwierdzonego przez serwer). To nie opcja menu: resetMods go nie zeruje.
export const PERSONAL = { speed: 1 };
export const BOOST_MULT = 3, FLY_SPEED = 7, SIZE_MIN = 0.25, SIZE_MAX = 8;
// Mnożnik twardych limitów prędkości w player.js (maxV, maxUp, maxSpeedXZ, wyrzut): bez niego boost 3 x i duży goryl rozbijałyby się o limity
export const capMul = () => (MOD.boost ? BOOST_MULT : 1) * Math.max(1, MOD.size) * PERSONAL.speed;
export function resetMods() {
    MOD.open = MOD.boost = MOD.fly = MOD.noclip = MOD.sizeOn = MOD.xray = MOD.invisible = false;
    MOD.size = 1;
}
