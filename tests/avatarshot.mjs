// Narzędzie deweloperskie: zrzuty awatara goryla (z przodu, z boku, zbliżenie głowy) bez uruchamiania gry.
// Użycie:  cd tests && CHROMIUM_PATH=... node avatarshot.mjs [wyjście] [skin] [color]
import { chromium } from 'playwright';
import fs from 'fs'; import path from 'path'; import http from 'http';
import { fileURLToPath } from 'url';
const HERE = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(HERE, '..'), OUT = process.argv[2] || path.join(HERE, 'shots'), SKIN = process.argv[3] || 'default', COLOR = process.argv[4] || '', EXTRA = JSON.parse(process.argv[5] || '{}'), ONLY = process.argv[6] || '';   // EXTRA: np. '{"hat":"crown"}', ONLY: nazwa jednego widoku
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
await page.evaluate(async ([skin, color, extra]) => {
    const THREE = await import('three'), A = await import('/core/avatar.js');
    const r = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true }); r.setSize(900, 1100); document.body.appendChild(r.domElement); r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.25;
    const scene = new THREE.Scene(); scene.background = new THREE.Color(0x07060a); scene.fog = new THREE.Fog(0x07060a, 4, 9);
    scene.add(new THREE.HemisphereLight(0x8090b0, 0x201010, 0.9));
    const key = new THREE.DirectionalLight(0xffc890, 3.4); key.position.set(1.5, 2, -2.5); scene.add(key);
    const rim = new THREE.DirectionalLight(0x6a8aff, 1.8); rim.position.set(-2, 1.5, 2.5); scene.add(rim);
    const look = { name: 'Preview', skin, color: color || undefined, hat: 'none', glasses: 'none', sleeve: 'none', gloves: 'none', mask: 'none', badge: 'none' }; Object.assign(look, extra);
    const av = A.createAvatar(look); scene.add(av.group);
    av.head.position.set(0, 0.36, -0.03); av.torso.position.set(0, 0, 0);
    av.handL.position.set(-0.5, -0.3, -0.3); av.handR.position.set(0.5, -0.3, -0.3); av.handL.rotation.set(0.3, 0, 0); av.handR.rotation.set(0.3, 0, 0);
    A.placeArm(av.armL, av.torso, -1, av.handL); A.placeArm(av.armR, av.torso, 1, av.handR);
    const cam = new THREE.PerspectiveCamera(30, 900 / 1100, 0.05, 50);
    window.__shot = (pos, tgt, fov, mouth) => { cam.position.set(...pos); cam.fov = fov; cam.updateProjectionMatrix(); cam.lookAt(...tgt); A.animateFace(av.head, mouth || 0, 0.5, 0.016); r.render(scene, cam); return r.domElement.toDataURL('image/png'); };
}, [SKIN, COLOR, EXTRA]);
const views = { front: [[0, 0.15, -2.6], [0, 0.0, 0], 34, 0], front_snarl: [[0, 0.15, -2.6], [0, 0.0, 0], 34, 1], three_quarter: [[-1.7, 0.4, -2.0], [0, 0.0, 0], 34, 0.5], side: [[-2.6, 0.2, 0], [0, 0.05, -0.1], 34, 0.3], head: [[0.25, 0.42, -0.62], [0, 0.36, -0.1], 30, 0], head_snarl: [[0, 0.40, -0.55], [0, 0.34, -0.1], 28, 1] };
for (const [name, [pos, tgt, fov, mouth]] of Object.entries(views)) {
    if (ONLY && name !== ONLY) continue;
    const url = await page.evaluate(([p, t, f, m]) => window.__shot(p, t, f, m), [pos, tgt, fov, mouth]);
    fs.writeFileSync(path.join(OUT, `avatar-${name}.png`), Buffer.from(url.split(',')[1], 'base64')); console.log('shot', name);
}
console.log('errors:', errs.length, errs.slice(0, 5)); await browser.close(); server.close();
