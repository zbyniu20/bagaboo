// Wejście buildu Vite (zastępuje loader z index.html): peerjs z npm jako globalny Peer (tak go używa core/network.js i core/presence.js), potem start gry.
import Peer from 'peerjs';
window.Peer = Peer;
window.BAGABOO_VERSION = typeof __BAGABOO_BUILD__ !== 'undefined' ? __BAGABOO_BUILD__ : 'dev';
window.addEventListener('DOMContentLoaded', () => {
    import('./main.js').catch((e) => {
        const s = document.getElementById('status');
        if (s) { s.style.color = '#ff6a4a'; s.innerText = 'Could not start the game: ' + e.message; }
    });
});
