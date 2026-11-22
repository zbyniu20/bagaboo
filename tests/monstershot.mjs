// Narzędzie deweloperskie: skórki potworów (core/monsterskins.js) i twarze potworów z manekina (addMonsterFace), bez uruchamiania gry.
// Użycie:  cd tests && CHROMIUM_PATH=... node monstershot.mjs [wyjście]
import { chromium } from 'playwright';
import fs from 'fs'; import path from 'path'; import http from 'http';
import { fileURLToPath } from 'url';
const HERE = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(HERE, '..'), OUT = process.argv[2] || path.join(HERE, 'shots'), SEED = +(process.argv[3] || 4242);   // EXTRA: np. '{"hat":"crown"}', ONLY: nazwa jednego widoku
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
await page.evaluate(async () => {
    const THREE = await import('three'), E = await import('/core/engine.js'), S = await import('/core/monsterskins.js'), Mq = await import('/core/mannequin.js'), T = await import('/core/textures.js');
    const r = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true }); r.setSize(900, 1100); document.body.appendChild(r.domElement); r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.3;
    const scene = new THREE.Scene(); scene.background = new THREE.Color(0x07060a); scene.add(new THREE.HemisphereLight(0x8090b0, 0x201010, 1.1));
    const k = new THREE.DirectionalLight(0xffc890, 3); k.position.set(1, 2, 3); scene.add(k); const rim = new THREE.DirectionalLight(0x6a8aff, 1.4); rim.position.set(-2, 1, -2); scene.add(rim);
    const anim = [], ids = ['mannequin', 'blind', 'ooze', 'thread', 'lava'];
    ids.forEach((id, i) => { const m = S.buildMonsterSkin(id); m.group.position.set((i - 2) * 1.5, 1.6, 0); scene.add(m.group); anim.push(m); });
    const styles = [{ width: 0.05, open: 0.035, toothColor: 0xb8a878, long: 1.2, tears: 0x2a0606 }, { width: 0.058, open: 0.045, teeth: 11, long: 1.5, horns: 0xcfc6a8 }, { width: 0.062, open: 0.012, teeth: 13, toothColor: 0xfaf4e8, cavity: 0x300808, tears: 0x120406 }, { width: 0.06, open: 0.06, teeth: 11, long: 2, cavity: 0, tears: 0x7a0a0a }];
    styles.forEach((st, i) => { const m = Mq.buildMannequin(T.mkRng(900 + i)); Mq.addMonsterFace(m.head, st); m.group.scale.setScalar(0.8); m.group.position.set((i - 1.5) * 1.5, -2.6, 0); scene.add(m.group); });
    const cam = new THREE.PerspectiveCamera(30, 900 / 1100, 0.05, 50);
    window.__shot = (pos, tgt, fov) => { for (const m of anim) m.animate(1.3); cam.position.set(...pos); cam.fov = fov; cam.updateProjectionMatrix(); cam.lookAt(...tgt); r.render(scene, cam); return r.domElement.toDataURL('image/png'); };
});
const views = { skins: [[0, 0.5, 6.5], [0, 0.4, 0], 36], skins_close: [[0, 1.7, 3.2], [0, 1.6, 0], 40], faces: [[0, -1.05, 4.2], [0, -1.05, 0], 34] };
for (const [name, [pos, tgt, fov]] of Object.entries(views)) {
    const url = await page.evaluate(([p, t, f]) => window.__shot(p, t, f), [pos, tgt, fov]);
    fs.writeFileSync(path.join(OUT, `monster-${name}.png`), Buffer.from(url.split(',')[1], 'base64')); console.log('shot', name);
}
console.log('errors:', errs.length, errs.slice(0, 5)); await browser.close(); server.close();
