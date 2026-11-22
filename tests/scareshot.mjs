// Narzędzie deweloperskie: klatki sekwencji jumpscare'a (core/levelkit.js) i głowa manekina, bez uruchamiania gry.
// Użycie:  cd tests && CHROMIUM_PATH=... node scareshot.mjs [wyjście] [ziarno]
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
await page.evaluate(async (seed) => {
    const THREE = await import('three'), E = await import('/core/engine.js'), K = await import('/core/levelkit.js'), Mq = await import('/core/mannequin.js'), T = await import('/core/textures.js');
    const r = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true }); r.setSize(900, 1100); document.body.appendChild(r.domElement);
    const scene = new THREE.Scene(); scene.background = new THREE.Color(0x050407); scene.add(E.camera); E.camera.aspect = 900 / 1100; E.camera.updateProjectionMatrix();
    const j = K.createJumpscare({ seed, scale: 1.6, y: -0.15, restZ: -0.8, fromZ: -0.8 });
    const man = Mq.buildMannequin(T.mkRng(seed)); man.group.position.set(40, 0, 0); scene.add(man.group);
    const rig = new THREE.Group(); scene.add(rig); rig.add(new THREE.HemisphereLight(0x8090b0, 0x201010, 1.2)); const k = new THREE.DirectionalLight(0xffc890, 3); k.position.set(1, 2, 3); rig.add(k);
    window.__scare = (t) => { j.trigger(); let el = 0; while (el < t) { j.update(0.02); el += 0.02; } E.camera.position.set(0, 0, 0); E.camera.rotation.set(0, 0, 0); r.render(scene, E.camera); return r.domElement.toDataURL('image/png'); };
    window.__mannequin = () => { const c = E.camera; c.position.set(40.25, 1.85, 0.7); c.lookAt(40, 1.8, 0); c.fov = 28; c.updateProjectionMatrix(); r.render(scene, c); return r.domElement.toDataURL('image/png'); };
}, SEED);
for (const t of [0.13, 0.29, 0.61, 1.25]) { const url = await page.evaluate((t) => window.__scare(t), t); fs.writeFileSync(path.join(OUT, `scare-${String(t).replace('.', '_')}.png`), Buffer.from(url.split(',')[1], 'base64')); console.log('shot', t); }
const url = await page.evaluate(() => window.__mannequin()); fs.writeFileSync(path.join(OUT, 'mannequin-head.png'), Buffer.from(url.split(',')[1], 'base64'));
console.log('errors:', errs.length, errs.slice(0, 5)); await browser.close(); server.close();
