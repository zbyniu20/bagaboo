// Opcjonalny build produkcyjny (npm run build): bundluje grę razem z three, cannon-es i peerjs z npm, hashuje pliki i usuwa zależność od CDN (unpkg).
// Strona z repozytorium (index.html z ładowarką i modułami ESM) nadal działa bez budowania; ten plik jej nie zmienia.
// W buildzie loader z index.html jest podmieniany na vite-entry.js, a main.js dostaje mapę poziomów z import.meta.glob (stała __BAGABOO_BUNDLED__).
import { defineConfig } from 'vite';

function bagabooHtml() {
    return {
        name: 'bagaboo-html',
        transformIndexHtml: {
            order: 'pre',   // przed przetwarzaniem HTML przez Vite, żeby wstrzyknięty vite-entry.js trafił do bundla
            handler(html) {
                return html
                    .replace(/<script src="https:\/\/unpkg\.com\/peerjs[^>]*><\/script>\s*/, '')   // peerjs idzie z npm (vite-entry.js)
                    .replace(/<script>\s*\/\/ Ładowanie gry z automatycznym numerem wersji[\s\S]*?<\/script>/, '<script type="module" src="/vite-entry.js"></script>');
            }
        }
    };
}
export default defineConfig({
    base: './',
    plugins: [bagabooHtml()],
    define: { __BAGABOO_BUNDLED__: true, __BAGABOO_BUILD__: JSON.stringify(String(Math.floor(Date.now() / 300000))) },
    build: { outDir: 'dist', target: 'es2022', sourcemap: false, chunkSizeWarningLimit: 2500 }
});
