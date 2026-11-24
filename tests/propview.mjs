// Narzędzie: podgląd zestawu rekwizytów (każdy w osobnym kafelku). Użycie: cd tests && CHROMIUM_PATH=... node propview.mjs wyjście.png [plik.glb]
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
const OUT = process.argv[2] || 'props.png', FILE = process.argv[3] || path.join(ROOT, 'assets/props/props.glb');
const page = await ctx.newPage(); page.on('pageerror', (e) => console.log('PAGEERROR', e.message));
await page.goto(`http://localhost:${port}/?three=${V}`);
await page.waitForFunction(() => /Ready|Could not/.test(document.getElementById('status').innerText), null, { timeout: 120000 });
const b64 = fs.readFileSync(FILE).toString('base64');
const png = await page.evaluate(async (b64) => {
    const T = await import('three'), { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js');
    const bin = atob(b64), u = new Uint8Array(bin.length); for (let k = 0; k < bin.length; k++) u[k] = bin.charCodeAt(k);
    const g = await new GLTFLoader().parseAsync(u.buffer, ''), meshes = []; g.scene.traverse(o => { if (o.isMesh) meshes.push(o); });
    const S = 300, cols = 5, rows = Math.ceil(meshes.length / cols), cv = document.createElement('canvas'); cv.width = S * cols; cv.height = S * rows;
    const r = new T.WebGLRenderer({ canvas: cv, antialias: true, preserveDrawingBuffer: true }); r.setSize(S * cols, S * rows, false); r.setScissorTest(true); r.setClearColor(0x1a1a20);
    meshes.forEach((m, i) => {
        const sc = new T.Scene(); sc.add(new T.HemisphereLight(0xb0b8d0, 0x302418, 1.3)); const d = new T.DirectionalLight(0xfff0dd, 2.2); d.position.set(2, 3, 2.5); sc.add(d);
        const mat = new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.86, metalness: 0.05 }), mesh = new T.Mesh(m.geometry, mat); sc.add(mesh);
        const box = new T.Box3().setFromObject(mesh), c = box.getCenter(new T.Vector3()), sz = box.getSize(new T.Vector3()), rad = Math.max(sz.x, sz.y, sz.z);
        const cam = new T.PerspectiveCamera(35, 1, 0.1, 50); cam.position.set(c.x + rad * 1.5, c.y + rad * 1.0, c.z + rad * 1.9); cam.lookAt(c);
        const x = (i % cols) * S, y = (rows - 1 - Math.floor(i / cols)) * S; r.setViewport(x, y, S, S); r.setScissor(x, y, S, S); r.render(sc, cam);
    });
    console.log(meshes.map(m => m.name).join(', '));
    return cv.toDataURL('image/png').split(',')[1];
}, b64);
fs.writeFileSync(OUT, Buffer.from(png, 'base64')); console.log('saved', OUT);
await browser.close(); server.close();
