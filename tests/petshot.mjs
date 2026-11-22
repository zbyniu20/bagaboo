// Narzędzie deweloperskie: zrzuty stworków: pięć gatunków w rzędzie, kilka min i poziomów, bez uruchamiania gry.
// Użycie:  cd tests && CHROMIUM_PATH=... node petshot.mjs [wyjście] [poziom] [wygląd JSON: h,k]
import { chromium } from 'playwright';
import fs from 'fs'; import path from 'path'; import http from 'http';
import { fileURLToPath } from 'url';
const HERE = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(HERE, '..'), OUT = process.argv[2] || path.join(HERE, 'shots'), LEVEL = +(process.argv[3] || 1), EXTRA = JSON.parse(process.argv[4] || '{}');   // EXTRA: np. '{"hat":"crown"}', ONLY: nazwa jednego widoku
fs.mkdirSync(OUT, { recursive: true });
const MIME = { '.js': 'text/javascript', '.html': 'text/html', '.png': 'image/png' };
const PAGE = `<!doctype html><meta charset=utf-8><body style="margin:0;background:#000"><script type="importmap">{"imports":{"three":"/tests/node_modules/three/build/three.module.js","three/addons/":"/tests/node_modules/three/examples/jsm/","cannon-es":"/tests/node_modules/cannon-es/dist/cannon-es.js"}}</script>`;
const server = http.createServer((req, res) => {
    let u = decodeURIComponent(req.url.split('?')[0]);
    if (u === '/preview') { res.writeHead(200, { 'content-type': 'text/html' }); return res.end(PAGE); }
    const f = path.join(ROOT, u);
    if (f.startsWith(ROOT) && fs.existsSync(f) && fs.statSync(f).isFile()) { res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res); } else { res.writeHead(404); res.end(); }
}).listen(0);
const port = server.address().port;
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 900, height: 1100 } }), errs = [];
page.on('pageerror', e => errs.push(e.message)); page.on('console', m => { if (m.type() === 'error') errs.push(m.text().slice(0, 200)); }); page.on('response', r => { if (r.status() === 404) errs.push('404 ' + r.url()); });
await page.goto(`http://localhost:${port}/preview`);
await page.evaluate(async ([level, extra]) => {
    const THREE = await import('three'), M = await import('/core/petmodel.js');
    const r = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true }); r.setSize(900, 1100); document.body.appendChild(r.domElement); r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.2;
    const scene = new THREE.Scene(); scene.background = new THREE.Color(0x07060a);
    scene.add(new THREE.HemisphereLight(0x8090b0, 0x201010, 1.0));
    const key = new THREE.DirectionalLight(0xffc890, 3.2); key.position.set(1, 2, 3); scene.add(key);
    const rim = new THREE.DirectionalLight(0x6a8aff, 1.6); rim.position.set(-2, 1.5, -2); scene.add(rim);
    const moods = [{}, { petted: 1 }, { eating: 1 }, { sad: true }, { hungry: true }];
    const rows = [];
    for (let sp = 0; sp < 5; sp++) for (let m = 0; m < 5; m++) {
        const p = M.createPetModel(Object.assign({ c: sp % 3, l: level, n: 0, h: 0, k: 0, sp: sp }, extra), { born: false });
        p.group.position.set((sp - 2) * 0.8, 0, -m * 0.9); scene.add(p.group); rows.push([p, moods[m]]);
    }
    const base = { speed: 0, sleeping: false, sitting: false, sad: false, hungry: false, petted: 0, eating: 0, tag: false };
    const cam = new THREE.PerspectiveCamera(30, 900 / 1100, 0.05, 50);
    window.__shot = (pos, tgt, fov) => { cam.position.set(...pos); cam.fov = fov; cam.updateProjectionMatrix(); cam.lookAt(...tgt); for (const [p, st] of rows) { p.update(0.5, 1, Object.assign({}, base, st)); p.update(0.5, 1.5, Object.assign({}, base, st)); } r.render(scene, cam); return r.domElement.toDataURL('image/png'); };
}, [LEVEL, EXTRA]);
const views = { grid: [[0, 5.2, 3.4], [0, 0, -1.7], 38], row: [[0, 1.2, 7], [0, 0.3, -1.6], 36], front: [[0, 0.9, 3.4], [0, 0.3, 0], 32], blobby: [[-1.6, 0.6, 1.5], [-1.6, 0.3, 0], 24] };
for (const [name, [pos, tgt, fov]] of Object.entries(views)) {
    const url = await page.evaluate(([p, t, f]) => window.__shot(p, t, f), [pos, tgt, fov]);
    fs.writeFileSync(path.join(OUT, `pet-${name}.png`), Buffer.from(url.split(',')[1], 'base64')); console.log('shot', name);
}
console.log('errors:', errs.length, errs.slice(0, 5)); await browser.close(); server.close();
