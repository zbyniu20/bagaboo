// Narzędzie deweloperskie: awatary z urwanymi rękami i głową (core/network.js setDismember), bez uruchamiania gry.
// Użycie:  cd tests && CHROMIUM_PATH=... node goreshot.mjs [wyjście]
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
    const THREE = await import('three'), E = await import('/core/engine.js'), A = await import('/core/avatar.js'), N = await import('/core/network.js');
    const r = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true }); r.setSize(900, 1100); document.body.appendChild(r.domElement); r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.3;
    const scene = E.scene; scene.background = new THREE.Color(0x07060a); scene.add(new THREE.HemisphereLight(0x8090b0, 0x201010, 1.1));
    const k = new THREE.DirectionalLight(0xffc890, 3); k.position.set(1, 2, -3); scene.add(k); const rim = new THREE.DirectionalLight(0x6a8aff, 1.4); rim.position.set(-2, 1, 3); scene.add(rim);
    const look = { name: 'P', skin: 'default', hat: 'none', glasses: 'none', sleeve: 'none', gloves: 'none', mask: 'none', badge: 'none' };
    for (let i = 0; i < 5; i++) {
        const av = A.createAvatar(look); scene.add(av.group); const x = (i - 2) * 1.3;
        av.head.position.set(x, 1.6, 0); av.torso.position.set(x, 1.25, 0); av.handL.position.set(x - 0.45, 1.0, -0.3); av.handR.position.set(x + 0.45, 1.0, -0.3);
        A.placeArm(av.armL, av.torso, -1, av.handL); A.placeArm(av.armR, av.torso, 1, av.handR); N.remoteAvatars['p' + i] = av;
        if (i > 0) N.setDismember('p' + i, i);
    }
    window.__tick = (t) => { for (let el = 0; el < t; el += 0.02) N.tickDismember(0.02); };
    const cam = new THREE.PerspectiveCamera(30, 900 / 1100, 0.05, 50);
    window.__shot = (pos, tgt, fov) => { cam.position.set(...pos); cam.fov = fov; cam.updateProjectionMatrix(); cam.lookAt(...tgt); r.render(scene, cam); return r.domElement.toDataURL('image/png'); };
});
await page.evaluate(() => window.__tick(2));
const views = { gore: [[0, 1.5, -8.5], [0, 1.1, 0], 40], head: [[2.6, 1.5, -3.2], [2.6, 1.4, 0], 32] };
for (const [name, [pos, tgt, fov]] of Object.entries(views)) {
    const url = await page.evaluate(([p, t, f]) => window.__shot(p, t, f), [pos, tgt, fov]);
    fs.writeFileSync(path.join(OUT, `gore-${name}.png`), Buffer.from(url.split(',')[1], 'base64')); console.log('shot', name);
}
console.log('errors:', errs.length, errs.slice(0, 5)); await browser.close(); server.close();
