// Narzędzie deweloperskie: zrzut kilku modeli GLB obok siebie (do wyboru potwora). Użycie: CHROMIUM_PATH=... node glbshot.mjs wyjście.png clip plik1.glb plik2.glb ...
import { chromium } from 'playwright';
import fs from 'fs'; import path from 'path'; import http from 'http';
import { fileURLToPath } from 'url';
const HERE = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(HERE, '..'), DEPS = path.join(HERE, 'node_modules');
const V = JSON.parse(fs.readFileSync(path.join(DEPS, 'three/package.json'), 'utf8')).version, MIME = { '.js': 'text/javascript', '.html': 'text/html', '.png': 'image/png', '.json': 'application/json' };
const server = http.createServer((req, res) => {
    let u = decodeURIComponent(req.url.split('?')[0]); if (u === '/') u = '/index.html';
    const f = path.join(ROOT, u);
    if (f.startsWith(ROOT) && fs.existsSync(f) && fs.statSync(f).isFile()) { res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res); } else { res.writeHead(404); res.end(); }
}).listen(0);
const port = server.address().port;
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
const ctx = await browser.newContext({ viewport: { width: 1000, height: 640 } }), errors = [];
await ctx.route(/unpkg\.com/, (route) => {
    const u = route.request().url().split('?')[0], m = u.match(/three@([\d.]+)\/(.*)$/);
    let f = null;
    if (m) f = path.join(DEPS, 'three', m[2]); else if (/cannon-es/.test(u)) f = path.join(DEPS, 'cannon-es/dist/cannon-es.js'); else if (/peerjs/.test(u)) f = path.join(DEPS, 'peerjs/dist/peerjs.min.js');
    if (f && fs.existsSync(f) && fs.statSync(f).isFile()) route.fulfill({ status: 200, contentType: 'text/javascript', body: fs.readFileSync(f) }); else route.fulfill({ status: 404, body: '' });
});
const [OUT, CLIP, ...FILES] = process.argv.slice(2), HEAD = process.env.CAM === 'head';
const page = await ctx.newPage(); page.on('pageerror', (e) => console.log('PAGEERROR', e.message));
await page.goto(`http://localhost:${port}/?three=${V}`);
await page.waitForFunction(() => /Ready|Could not/.test(document.getElementById('status').innerText), null, { timeout: 120000 });
const blobs = FILES.map(f => ({ name: path.basename(f), b64: fs.readFileSync(f).toString('base64') }));
const png = await page.evaluate(async ({ blobs, clip, head }) => {
    const T = await import('three'), { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js'), { MeshoptDecoder } = await import('three/addons/libs/meshopt_decoder.module.js');
    const W = 420, H = 560, n = blobs.length, cv = document.createElement('canvas'); cv.width = W * n; cv.height = H;
    const r = new T.WebGLRenderer({ canvas: cv, antialias: true, preserveDrawingBuffer: true }); r.setSize(W * n, H, false); r.setScissorTest(true); r.setClearColor(0x08080c);
    const info = [];
    for (let i = 0; i < n; i++) {
        const bin = atob(blobs[i].b64), u = new Uint8Array(bin.length); for (let k = 0; k < bin.length; k++) u[k] = bin.charCodeAt(k);
        const L = new GLTFLoader(); L.setMeshoptDecoder(MeshoptDecoder); const g = await L.parseAsync(u.buffer, '');
        const sc = new T.Scene(); sc.fog = new T.FogExp2(0x08080c, 0.08); sc.add(new T.HemisphereLight(0x8890a8, 0x201010, 0.9)); const key = new T.PointLight(0xff5a40, 22, 12, 1.6); key.position.set(1.5, 2.2, 2.2); sc.add(key); const fill = new T.DirectionalLight(0xdde4ff, 1.7); fill.position.set(-1.5, 2, 3); sc.add(fill);
        const m = g.scene; const box = new T.Box3().setFromObject(m), h = box.max.y - box.min.y, k = 2.3 / h; m.scale.setScalar(k); const c = box.getCenter(new T.Vector3()); m.position.set(-c.x * k, -box.min.y * k, -c.z * k); sc.add(m);
        const mix = new T.AnimationMixer(m), names = g.animations.map(a => a.name), pick = names.find(x => x.toLowerCase().endsWith('|' + clip.toLowerCase()) || x.toLowerCase() === clip.toLowerCase()) || names[0];
        if (pick) { mix.clipAction(g.animations[names.indexOf(pick)]).play(); mix.update(0.35); }
        const cam = new T.PerspectiveCamera(40, W / H, 0.1, 50); if (head) { m.updateMatrixWorld(true); const hb = m.getObjectByName('head'), hp = new T.Vector3(); if (hb) hb.getWorldPosition(hp); else hp.set(0, 2, 0); cam.position.set(hp.x + 0.35, hp.y + 0.1, hp.z + 1.15); cam.lookAt(hp.x, hp.y + 0.02, hp.z); } else { cam.position.set(0.6, 1.5, 4.6); cam.lookAt(0, 1.1, 0); }
        r.setViewport(i * W, 0, W, H); r.setScissor(i * W, 0, W, H); r.render(sc, cam); info.push(blobs[i].name + ' clip=' + pick);
    }
    console.log(info.join(' | '));
    return cv.toDataURL('image/png').split(',')[1];
}, { blobs, clip: CLIP, head: HEAD });
fs.writeFileSync(OUT, Buffer.from(png, 'base64')); console.log('saved', OUT);
await browser.close(); server.close();
