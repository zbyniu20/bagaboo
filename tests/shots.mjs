// Narzędzie deweloperskie: zrzuty ekranu poziomów w kilku wersjach three.js (do oceny aktualizacji biblioteki oczami, nie tylko po błędach).
// Użycie:  cd tests && THREE_DIRS='{"0.160.0":"/ścieżka/z/node_modules","0.187.0":"/inna/ścieżka/node_modules"}' CHROMIUM_PATH=... node shots.mjs 0.160.0,0.187.0 lobby,catacombs /tmp/out
// Każda wersja wymaga katalogu z zainstalowanym pakietem `three` (npm i three@WERSJA w osobnym katalogu). cannon-es i peerjs idą z tests/node_modules.
// Gra jest otwierana z ?three=WERSJA (index.html przyjmuje ten parametr), a zapytania do unpkg.com są podmieniane na lokalne pliki. Wynik: <wyjście>/<poziom>-<wersja>.png i lista błędów konsoli.
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import http from 'http';
import { fileURLToPath } from 'url';

const HERE = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(HERE, '..'), DEPS = path.join(HERE, 'node_modules');
const [versionsArg, levelsArg, outArg] = process.argv.slice(2), PROBE = process.env.PROBE_JS ? fs.readFileSync(process.env.PROBE_JS, 'utf8') : null, VERSIONS = (versionsArg || '').split(',').filter(Boolean), LEVELS = (levelsArg || 'lobby').split(','), OUT = outArg || path.join(HERE, 'shots');
const DIRS = JSON.parse(process.env.THREE_DIRS || '{}'), PORT = +process.env.PORT || 8767, MIME = { '.js': 'text/javascript', '.html': 'text/html', '.png': 'image/png', '.json': 'application/json' };
if (!VERSIONS.length) { console.log('Podaj wersje, np. 0.160.0,0.187.0'); process.exit(1); }
fs.mkdirSync(OUT, { recursive: true });
const server = http.createServer((req, res) => {
    let u = decodeURIComponent(req.url.split('?')[0]); if (u === '/') u = '/index.html';
    const f = path.join(ROOT, u);
    if (f.startsWith(ROOT) && fs.existsSync(f) && fs.statSync(f).isFile()) { res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res); }
    else { res.writeHead(404); res.end(); }
}).listen(PORT);
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
for (const ver of VERSIONS) {
    const ctx = await browser.newContext({ viewport: { width: 1000, height: 640 } }), errors = [];
    await ctx.route(/unpkg\.com/, (route) => {
        const u = route.request().url().split('?')[0], m = u.match(/three@([\d.]+)\/(.*)$/);
        let f = null;
        if (m && DIRS[m[1]]) f = path.join(DIRS[m[1]], 'three', m[2]);
        else if (/cannon-es/.test(u)) f = path.join(DEPS, 'cannon-es/dist/cannon-es.js');
        else if (/peerjs/.test(u)) f = path.join(DEPS, 'peerjs/dist/peerjs.min.js');
        if (f && fs.existsSync(f) && fs.statSync(f).isFile()) route.fulfill({ status: 200, contentType: 'text/javascript', body: fs.readFileSync(f) }); else route.fulfill({ status: 404, body: '' });
    });
    const page = await ctx.newPage();
    page.on('pageerror', (e) => errors.push('PAGEERROR ' + e.message));
    page.on('console', (m) => { if (m.type() === 'error' && !/peerjs|favicon|Failed to load resource/i.test(m.text())) errors.push('CONSOLE ' + m.text().slice(0, 300)); });
    await page.goto(`http://localhost:${PORT}/?three=${ver}`);
    await page.waitForFunction(() => /Ready|Could not/.test(document.getElementById('status').innerText), null, { timeout: 120000 });
    await page.click('#btnGuest', { timeout: 90000 }); await page.click('#btnSolo', { timeout: 90000 });
    await page.waitForTimeout(1500);
    const info = await page.evaluate(async () => { const T = await import('three'); return T.REVISION; });
    console.log('three revision in the page:', info, '(requested ' + ver + ')');
    for (const lv of LEVELS) {
        await page.evaluate(async (id) => { const M = await import('./main.js'); await M.loadLevel(id); }, lv);
        await page.waitForTimeout(2500);
        if (PROBE) console.log(lv, ver, JSON.stringify(await page.evaluate(async ([code]) => { const F = Object.getPrototypeOf(async function () {}).constructor; return await new F(code)(); }, [PROBE])));
        else { await page.screenshot({ path: path.join(OUT, `${lv}-${ver}.png`) }); console.log('shot', lv, ver); }
    }
    console.log(ver, 'errors:', errors.length); errors.slice(0, 12).forEach(e => console.log('  ', e));
    await ctx.close();
}
await browser.close(); server.close();
