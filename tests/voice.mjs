// Test w przeglądarce: głosy potworów (core/voice.js, core/voicelogic.js). Użycie: cd tests && CHROMIUM_PATH=... node voice.mjs
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
    const V = await import('./core/voice.js'), L = await import('./core/voicelogic.js'), A = await import('./core/audio.js'), out = {};
    const noise = (ctx) => { const b = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; return b; };
    const render = async (text, fam) => {
        const pr = L.profileFor(fam), tv = L.textToEvents(text, pr), ctx = new OfflineAudioContext(1, 44100 * 5, 44100); let nodes = 0;
        for (const m of ['createGain', 'createBiquadFilter', 'createOscillator', 'createBufferSource']) { const o = ctx[m].bind(ctx); ctx[m] = (...a) => { nodes++; return o(...a); }; }
        const v = V.buildVoice(ctx, tv.events, pr, ctx.destination, noise(ctx), 0.9), buf = await ctx.startRendering(), d = buf.getChannelData(0);
        let sum = 0, nan = 0, peak = 0, lastLoud = 0; for (let i = 0; i < d.length; i++) { const x = d[i]; if (!Number.isFinite(x)) nan++; sum += x * x; peak = Math.max(peak, Math.abs(x)); if (Math.abs(x) > 0.002) lastLoud = i; }
        return { rms: Math.sqrt(sum / d.length), nan: nan, peak: peak, dur: v.duration, expected: tv.duration, lastLoudSec: lastLoud / 44100, nodes: nodes, events: tv.events.length };
    };
    out.short = await render('i see you', 'clinical'); out.long = await render('Zbyniu... come back to us, we are waiting for you', 'crypt'); out.silent = await render('', 'hotel');
    const bus = A.audioBus(); out.audio = !!bus;
    if (bus) {
        if (bus.ctx.state !== 'running') { try { await bus.ctx.resume(); } catch (e) {} }
        const tv = L.textToEvents('i see you', L.profileFor('hotel')), pos = { x: 1, y: 1.5, z: 3 };
        const a = A.speak(tv.events, L.profileFor('hotel'), pos, 0.9), b = A.speak(tv.events, L.profileFor('hotel'), pos, 0.9), c = A.speak(tv.events, L.profileFor('hotel'), pos, 0.9);
        out.limit = { first: a > 0, second: b > 0, third: c, count: A.voiceCount(), speaking: A.voiceSpeaking() };
        await new Promise(r => setTimeout(r, (a + 0.9) * 1000)); out.after = { count: A.voiceCount(), speaking: A.voiceSpeaking() };
        out.emptyInput = A.speak([], L.profileFor('hotel'), pos, 0.9);
    }
    return out;
});
console.log('     ', JSON.stringify(r));
ok('a phrase renders to audible sound with no NaN and a sane peak (no clipping)', r.short.rms > 0.002 && r.short.nan === 0 && r.short.peak < 1 && r.long.rms > 0.002 && r.long.nan === 0 && r.long.peak < 1, [r.short, r.long]);
ok('the sound lasts about as long as the text says and then is quiet (no tail left running)', Math.abs(r.short.lastLoudSec - r.short.expected) < 0.6 && r.long.lastLoudSec <= r.long.dur + 0.1 && r.long.dur <= 4.0, [r.short, r.long]);
ok('the number of audio nodes does not depend on the phrase length (a fixed graph, only automation changes)', r.short.nodes === r.long.nodes && r.short.nodes <= 25 && r.long.events > r.short.events, [r.short.nodes, r.long.nodes]);
ok('an empty phrase renders silence without errors', r.silent.nan === 0 && r.silent.rms < 0.001, r.silent);
if (r.audio) {
    ok('at most two voices at the same time: the third is refused', r.limit.first && r.limit.second && r.limit.third === 0 && r.limit.count === 2, r.limit);
    ok('while a monster speaks the microphone is gated, and after the speech and its tail the voices are released and the gate opens', r.limit.speaking === true && r.after.count === 0 && r.after.speaking === false, [r.limit, r.after]);
    ok('speaking with no events does nothing', r.emptyInput === 0, r.emptyInput);
} else console.log('      (audio not started: live checks skipped)');
ok('no page errors', errors.length === 0, errors);
await browser.close(); server.close();
if (errors.length) console.log(errors.join('\n'));
console.log(fails ? 'voice: FAILED' : 'voice: all checks passed'); process.exit(fails || errors.length ? 1 : 0);
