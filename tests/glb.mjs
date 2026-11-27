// Test w przeglądarce: modele potworów z plików GLB (ładowanie, skala, animacje, powrót do manekina przy braku, zbyt dużym i uszkodzonym pliku).
// Użycie:  cd tests && CHROMIUM_PATH=... node glb.mjs   (nie jest częścią testów szybkich ani smoke)
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
let fails = 0; const ok = (name, cond, extra) => { if (cond) console.log('ok  ', name); else { fails++; console.log('FAIL', name, extra === undefined ? '' : JSON.stringify(extra)); } };
// Model testowy generowany w locie (żaden zewnętrzny plik): dwa klocki o wysokości 4 (poza środkiem) i klipy Idle, Walk, Run na węzłach
async function makeGlb() {
    const p = await ctx.newPage(); await p.goto(`http://localhost:${port}/?three=${V}`);
    await p.waitForFunction(() => /Ready|Could not/.test(document.getElementById('status').innerText), null, { timeout: 120000 });
    const b64 = await p.evaluate(async () => {
        const T = await import('three'), { GLTFExporter } = await import('three/addons/exporters/GLTFExporter.js');
        const root = new T.Group(); root.name = 'root';
        const body = new T.Mesh(new T.BoxGeometry(1, 3, 1), new T.MeshStandardMaterial({ color: 0x884422 })); body.name = 'body'; body.position.set(5, 7.5, 3);
        const head = new T.Mesh(new T.BoxGeometry(1, 1, 1), new T.MeshStandardMaterial({ color: 0xaa3322 })); head.name = 'head'; head.position.set(5, 9.5, 3);
        root.add(body, head);
        const clip = (n, amp) => new T.AnimationClip(n, 1, [new T.VectorKeyframeTrack('body.position', [0, 0.5, 1], [5, 7.5, 3, 5, 7.5 + amp, 3, 5, 7.5, 3])]);
        const buf = await new Promise((res, rej) => new GLTFExporter().parse(root, res, rej, { binary: true, animations: [clip('Idle', 0.05), clip('Walk', 0.2), clip('Run', 0.4)] }));
        let s = ''; const u = new Uint8Array(buf); for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return btoa(s);
    });
    await p.close(); return Buffer.from(b64, 'base64');
}
async function run(label, body) {
    const page = await ctx.newPage(), errs = [];
    page.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message));
    page.on('console', (m) => { if (m.type() === 'error' && !/peerjs|favicon|Failed to load resource/i.test(m.text())) errs.push('CONSOLE ' + m.text().slice(0, 300)); });
    if (body === 'none') await page.route(/assets\/monsters\/\w+\.glb/, (r) => r.fulfill({ status: 404, body: '' }));
    else if (body) await page.route(/assets\/monsters\/\w+\.glb/, (r) => r.fulfill({ status: 200, contentType: 'application/octet-stream', body }));
    await page.goto(`http://localhost:${port}/?three=${V}`);
    await page.waitForFunction(() => /Ready|Could not/.test(document.getElementById('status').innerText), null, { timeout: 120000 });
    await page.click('#btnSolo', { timeout: 90000 });
    await page.waitForTimeout(1500);
    await page.evaluate(async () => { const M = await import('./main.js'); await M.loadLevel('monster'); });
    await page.waitForTimeout(3500);
    const info = await page.evaluate(async () => (await import('./levels/monster.js')).debugGlb());
    return { page, info, errs };
}
const glb = await makeGlb();
console.log('generated glb bytes', glb.length);
// 1) brak pliku: zostaje manekin
{ const r = await run('none', 'none'); ok('no file: the procedural mannequin stays (no model loaded)', r.info && r.info.loaded === false, r.info); ok('no file: no page errors', r.errs.length === 0, r.errs); await r.page.close(); }
// 2) poprawny plik
{
    const r = await run('ok', glb), i = r.info;
    ok('a valid file is loaded and replaces the bot mesh', i && i.loaded === true && i.same === true, i);
    const want = await r.page.evaluate(async (k) => (await import('./core/glblogic.js')).MONSTERS[k].height, i.kind);
    ok('the model is scaled to the target height of its kind and stands on the floor', i && Math.abs(i.h - want) < 0.1 && Math.abs(i.minY) < 0.05, [i, want]);
    ok('animation clips are found (Idle, Walk, Run)', i && ['Idle', 'Walk', 'Run'].every(n => i.clips.includes(n)), i);
    const play = await r.page.evaluate(async () => {
        const M = await import('./levels/monster.js'), E = await import('./core/engine.js'); M.debugPlay(100, 6); await new Promise(res => setTimeout(res, 2500));
        const d = M.debugGlb(); let moving = false; const g = E.L.root; g.traverse(o => { if (o.name === 'body' && o.position.y > 7.51) moving = true; });
        return { d, moving };
    });
    ok('in play the model is shown instead of the mannequin', play.d.visible === true && play.d.mannequinVisible === false, play.d);
    await r.page.evaluate(async () => { const M = await import('./main.js'); await M.loadLevel('lobby'); }); await r.page.waitForTimeout(1500);
    ok('leaving the level disposes the model without errors', r.errs.length === 0, r.errs); await r.page.close();
}
// 3) za duży plik (ponad 6 MB): odrzucony
{ const big = Buffer.concat([glb, Buffer.alloc(7 * 1024 * 1024)]); const r = await run('big', big); ok('an oversized file is refused and the mannequin stays', r.info && r.info.loaded === false, r.info); ok('oversized: no page errors', r.errs.length === 0, r.errs); await r.page.close(); }
// 4) uszkodzony plik
{ const r = await run('bad', Buffer.from('this is not a glb file at all')); ok('a broken file is ignored and the mannequin stays', r.info && r.info.loaded === false, r.info); ok('broken: no page errors', r.errs.length === 0, r.errs); await r.page.close(); }
// 5) prawdziwe pliki z assets/monsters w poziomach z manekinami
const ONLY = process.env.LEVELS ? process.env.LEVELS.split(',') : null;   // np. LEVELS=hospital,laundry: tylko te prawdziwe poziomy (każdy trwa kilka minut w renderowaniu programowym)
for (const [lvl, min] of [['cemetery', 1], ['nursery', 1], ['hospital', 2], ['laundry', 1], ['furas', 1], ['room000', 1], ['silence', 1]].filter(([l]) => !ONLY || ONLY.includes(l))) {
    const r = await run('real', null); await r.page.evaluate(async () => { const M = await import('./main.js'); await M.loadLevel('lobby'); }); await r.page.waitForTimeout(6000);
    const base = await r.page.evaluate(async () => (await import('./core/glbmonster.js')).glbMonstersLive());   // lobby trzyma figurki bestiariusza (modele GLB): to baza, nie wyciek
    await r.page.evaluate(async (l) => { const M = await import('./main.js'); await M.loadLevel(l); }, lvl); await r.page.waitForTimeout(4000);
    const n = await r.page.evaluate(async () => (await import('./core/glbmonster.js')).glbMonstersLive());
    ok(lvl + ': at least ' + min + ' mannequin(s) were replaced by models from files', n >= min, n);
    await r.page.evaluate(async () => { const M = await import('./main.js'); await M.loadLevel('lobby'); }); await r.page.waitForTimeout(1500);
    const n2 = await r.page.evaluate(async () => { await new Promise(res => setTimeout(res, 500)); return (await import('./core/glbmonster.js')).glbMonstersLive(); });
    ok(lvl + ': leaving the level removes the level models (only the lobby bestiary figurines stay: ' + base + ')', n2 === base, { n2, base }); ok(lvl + ': no page errors', r.errs.length === 0, r.errs); await r.page.close();
}
// 6) głowa i oczy modeli: poświata oczu na kości głowy, obrót głowy z kodu poziomu wokół osi pionowej
{
    const r = await run('real', null);
    const res = await r.page.evaluate(async () => {
        const G = await import('./core/glbmonster.js'), E = await import('./core/engine.js'), T = E.THREE, out = {};
        for (const kind of ['mannequin', 'warden', 'furas', 'ghost', 'threadman', 'lavabeast', 'blind']) {
            const g = await G.loadGlbMonster(kind); E.scene.add(g.group); const sp = []; g.headBone.traverse(o => { if (o.isSprite) sp.push(o); });
            const ang = (yaw) => { g.update(0.016, 0, false, yaw); g.group.updateMatrixWorld(true); const hp = g.headBone.getWorldPosition(new T.Vector3()), m = new T.Vector3(); sp.forEach(s => m.add(s.getWorldPosition(new T.Vector3()))); m.multiplyScalar(1 / Math.max(1, sp.length)); return Math.atan2(m.x - hp.x, m.z - hp.z); };
            out[kind] = { sprites: sp.length, d: sp.length ? +(ang(0.8) - ang(0)).toFixed(2) : null }; E.scene.remove(g.group); g.dispose();
        }
        return out;
    });
    ok('model eyes glow: a sprite pair on the head bone for every monster with eyes, none for the eyeless Blind', ['mannequin', 'warden', 'furas', 'ghost', 'threadman', 'lavabeast'].every(k => res[k].sprites === 2) && res.blind.sprites === 0, res);
    ok('the head turns by the level code about the vertical axis (0.8 rad asked, 0.6-1.0 measured) for every monster with eyes', ['mannequin', 'warden', 'furas', 'ghost', 'threadman', 'lavabeast'].every(k => res[k].d > 0.6 && res[k].d < 1.0), res);
    ok('no page errors (head and eyes)', r.errs.length === 0, r.errs); await r.page.close();
}
await browser.close(); server.close();
console.log(fails ? 'glb: FAILED ' + fails : 'glb: all checks passed'); process.exit(fails ? 1 : 0);
