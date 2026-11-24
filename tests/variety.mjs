// Test w przeglądarce: nastroje i mutatory wizyt (core/mutators.js). Użycie: cd tests && CHROMIUM_PATH=... node variety.mjs
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
const page = await ctx.newPage();
page.on('pageerror', (e) => errors.push('PAGEERROR ' + e.message));
page.on('console', (m) => { if (m.type() === 'error' && !/peerjs|favicon|Failed to load resource/i.test(m.text())) errors.push('CONSOLE ' + m.text().slice(0, 300)); });
await page.goto(`http://localhost:${port}/?three=${V}`);
await page.waitForFunction(() => /Ready|Could not/.test(document.getElementById('status').innerText), null, { timeout: 120000 });
await page.click('#btnSolo', { timeout: 90000 });
await page.waitForTimeout(1500);
let fails = 0; const ok = (name, cond, extra) => { if (cond) console.log('ok  ', name); else { fails++; console.log('FAIL', name, extra === undefined ? '' : JSON.stringify(extra)); } };
const r = await page.evaluate(async () => {
    const M = await import('./main.js'), E = await import('./core/engine.js'), MU = await import('./core/mutators.js'), AM = await import('./core/ambience.js'), EC = await import('./core/economy.js'), TM = await import('./core/terminal.js'), out = {};
    const load = async (id) => { await M.loadLevel(id); await new Promise(r => setTimeout(r, 1200)); return { hemi: E.lighting.hemi.intensity, fog: AM.DREAD.fogMul, mut: MU.mutatorActive(), mood: MU.activeMood().id }; };
    MU.setMutatorChoice('hospital', 'off'); out.normal = await load('hospital');
    MU.setMutatorChoice('hospital', 'dark'); out.dark = await load('hospital');
    MU.setMutatorChoice('hospital', 'loud'); out.loud = await load('hospital'); out.loudFactors = [MU.mutFactor('events'), MU.mutFactor('hear'), MU.mutFactor('whisper')];
    const w0 = EC.SAVE.wallet; EC.levelReward('hospital', 100, 50, 'test'); out.noPay = EC.SAVE.wallet === w0; out.recordRefused = EC.recordTime('hospital', 90) === false;
    MU.setMutatorChoice('hospital', 'dark'); out.darkAgain = await load('lobby'); out.afterLeave = { mut: MU.mutatorActive(), fog: AM.DREAD.fogMul };   // wyjście z poziomu czyści mutator
    out.laundryDaily = await load('maze'); MU.setMutatorChoice('hospital', 'off');
    await load('levels'); let btn = null; const ids = [];
    for (const t of (TM.terminals || [])) { if (!t.buttons) continue; for (const b of t.buttons) ids.push(b.id); }
    out.buttonIds = ids.filter(x => /^(row|mut|diff)/.test(x)).slice(0, 20);
    for (const t of (TM.terminals || [])) { const row = (t.buttons || []).find(b => b.id === 'row5'); if (row && row.action) { row.action(); t.dirty = true; if (t.draw) try { t.draw(); } catch (e) {} } }
    await new Promise(r => setTimeout(r, 800)); await TM.redrawTerminals && TM.redrawTerminals(); await new Promise(r => setTimeout(r, 500));
    out.hasMutButton = (TM.terminals || []).some(t => (t.buttons || []).some(b => b.id === 'mut'));
    if (out.hasMutButton) { for (const t of TM.terminals) { const b = (t.buttons || []).find(x => x.id === 'mut'); if (b) { b.action(); out.clicked = MU.mutatorChoice('hospital'); } } }
    return out;
});
console.log('     ', JSON.stringify(r));
ok('a normal visit has the normal light and fog and no mutator', r.normal.mut === false && Math.abs(r.normal.fog - 1) < 1e-9 && r.normal.hemi > 0, r.normal);
ok('the Pitch black mutator dims the ambient light to about 60% and thickens the fog by 25%', r.dark.mut === true && r.dark.hemi < r.normal.hemi * 0.7 && r.dark.hemi > r.normal.hemi * 0.5 && Math.abs(r.dark.fog - 1.25) < 1e-6, [r.dark, r.normal]);
ok('the Restless mutator leaves light and fog alone and raises the event, hearing and whisper factors', r.loud.mut === true && Math.abs(r.loud.hemi - r.normal.hemi) < 1e-6 && Math.abs(r.loud.fog - 1) < 1e-9 && r.loudFactors.every(f => f > 1), [r.loud, r.loudFactors]);
ok('a run with a mutator pays nothing and records nothing', r.noPay === true && r.recordRefused === true, r);
ok('leaving the level clears the mutator and the fog (the hub and the daily maze are normal)', r.afterLeave.mut === false && Math.abs(r.afterLeave.fog - 1) < 1e-9 && r.laundryDaily.mut === false, [r.afterLeave, r.laundryDaily]);
if (r.hasMutButton) ok('the terminal shows the mutator button for a level with monsters and clicking it cycles the choice', r.clicked === 'dark', r.clicked); else console.log('      (terminal button not reachable from this test: covered by the wiring check in logic.mjs)', JSON.stringify(r.buttonIds));
ok('no page errors', errors.length === 0, errors);
await browser.close(); server.close();
if (errors.length) console.log(errors.join('\n'));
console.log(fails ? 'variety: FAILED' : 'variety: all checks passed'); process.exit(fails || errors.length ? 1 : 0);
