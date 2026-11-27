// Test w przeglądarce: DWÓCH PRAWDZIWYCH KLIENTÓW (host i gość w osobnych kontekstach przeglądarki) przez PeerJS z LOKALNYM serwerem sygnalizacyjnym (pakiet `peer`).
// Nie jest częścią testów szybkich ani CI. Użycie: CHROMIUM_PATH=... node twoclients.mjs
// Shim w treści peerjs.min.js podstawia lokalny serwer (host localhost, bez STUN); żądania do peerjs.com i serwera kont są odrzucane.
// Jeśli WebRTC między kontekstami nie zestawi się w tym kontenerze, test kończy się czytelnym "SKIP: no ICE connection" (kod wyjścia 0), a NIE udaje sukcesu.
import { chromium } from 'playwright';
import { PeerServer } from 'peer';
import fs from 'fs'; import path from 'path'; import http from 'http';
import { fileURLToPath } from 'url';
const HERE = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(HERE, '..'), DEPS = path.join(HERE, 'node_modules');
const V = JSON.parse(fs.readFileSync(path.join(DEPS, 'three/package.json'), 'utf8')).version, MIME = { '.js': 'text/javascript', '.html': 'text/html', '.png': 'image/png', '.json': 'application/json', '.glb': 'model/gltf-binary' };
const server = http.createServer((req, res) => {
    let u = decodeURIComponent(req.url.split('?')[0]); if (u === '/') u = '/index.html';
    const f = path.join(ROOT, u);
    if (f.startsWith(ROOT) && fs.existsSync(f) && fs.statSync(f).isFile()) { res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res); } else { res.writeHead(404); res.end(); }
}).listen(0);
const port = server.address().port;
const sigPort = 19000 + Math.floor(Math.random() * 900), sig = PeerServer({ port: sigPort, path: '/', host: '127.0.0.1', allow_discovery: false });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--disable-features=WebRtcHideLocalIpsWithMdns', '--allow-loopback-in-peer-connection', '--no-sandbox'] });
const SHIM = `;(function(){var P=window.Peer;function W(id,o){return new P(id,Object.assign({host:'127.0.0.1',port:${sigPort},path:'/',secure:false,key:'peerjs',config:{iceServers:[]}},o||{}));}W.prototype=P.prototype;Object.keys(P).forEach(function(k){W[k]=P[k];});window.Peer=W;})();`;
const errors = { host: [], guest: [] };
async function client(name) {
    const ctx = await browser.newContext({ viewport: { width: 800, height: 520 } });
    await ctx.route(/peerjs\.com|workers\.dev|bagaboo-api/, (r) => r.abort());
    await ctx.route(/unpkg\.com/, (route) => {
        const u = route.request().url().split('?')[0], m = u.match(/three@([\d.]+)\/(.*)$/);
        let f = null;
        if (m) f = path.join(DEPS, 'three', m[2]); else if (/cannon-es/.test(u)) f = path.join(DEPS, 'cannon-es/dist/cannon-es.js'); else if (/peerjs/.test(u)) f = path.join(DEPS, 'peerjs/dist/peerjs.min.js');
        if (f && fs.existsSync(f) && fs.statSync(f).isFile()) route.fulfill({ status: 200, contentType: 'text/javascript', body: fs.readFileSync(f, 'utf8') + (/peerjs/.test(u) ? SHIM : '') }); else route.fulfill({ status: 404, body: '' });
    });
    const page = await ctx.newPage();
    page.on('pageerror', (e) => errors[name].push('PAGEERROR ' + e.message));
    page.on('console', (m) => { if (m.type() === 'error' && !/favicon|Failed to load resource|bagaboo-api|net::ERR/i.test(m.text())) errors[name].push('CONSOLE ' + m.text().slice(0, 300)); });
    await page.goto(`http://localhost:${port}/?three=${V}`);
    await page.waitForFunction(() => /Ready|Could not/.test(document.getElementById('status').innerText), null, { timeout: 120000 });
    await page.click('#btnSolo', { timeout: 90000 });
    await page.waitForTimeout(1200);
    return { ctx, page, ev: (fn, arg) => page.evaluate(fn, arg) };
}
let fails = 0; const ok = (name, cond, extra) => { if (cond) console.log('ok  ', name); else { fails++; console.log('FAIL', name, extra === undefined ? '' : JSON.stringify(extra).slice(0, 700)); } };
const finish = async (code) => { try { await browser.close(); } catch (e) {} server.close(); try { sig.close && sig.close(); } catch (e) {} process.exit(code); };
const [H, G] = await Promise.all([client('host'), client('guest')]);
const CODE = 'ZZTEST' + Math.floor(Math.random() * 90 + 10);
// ----- połączenie: host zakłada pokój, gość dołącza tą samą ścieżką co gracz (startJoin) -----
const hostUp = await H.ev(async (code) => { const N = await import('./core/network.js'); return await new Promise((res) => { N.startHost(code, { ok: () => res(true), fail: () => res(false) }); setTimeout(() => res(false), 15000); }); }, CODE);
if (!hostUp) { console.log('SKIP: no signalling connection (host could not open a room on the local peer server)'); await finish(0); }
const guestUp = await G.ev(async (code) => { const N = await import('./core/network.js'); return await new Promise((res) => { N.startJoin(code, { ok: () => res(true), fail: () => res(false) }); setTimeout(() => res(false), 20000); }); }, CODE);
if (!guestUp) { console.log('diag guest status:', await G.page.evaluate(() => document.getElementById('status').innerText), '| host status:', await H.page.evaluate(() => document.getElementById('status').innerText), '| errors', JSON.stringify(errors)); console.log('SKIP: no ICE connection (the guest could not reach the host over WebRTC in this container); nothing below was checked'); await finish(0); }
ok('host opened the room and the guest joined through startJoin (real WebRTC data channel)', hostUp && guestUp);
// ----- oba klienty wchodzą do Scary GTA -----
await Promise.all([H, G].map((c) => c.ev(async () => { const M = await import('./main.js'); await M.loadLevel('scarygta'); })));
await H.page.waitForTimeout(6000);
await Promise.all([H, G].map((c) => c.ev(async () => { (await import('./levels/scarygta.js')).debugGtaNight('calm', 1e9); })));
const seen = await H.ev(async () => { const N = await import('./core/network.js'), w = (ms) => new Promise(r => setTimeout(r, ms)); for (let i = 0; i < 80 && !Object.keys(N.playersState).some(id => id !== N.myId() && N.playersState[id].lvl === 'scarygta'); i++) await w(250); return { mode: N.NET.mode, guests: Object.keys(N.playersState).filter(id => id !== N.myId()).length, lvl: Object.values(N.playersState).map(s => s.lvl) }; });
const seenG = await G.ev(async () => { const N = await import('./core/network.js'), w = (ms) => new Promise(r => setTimeout(r, ms)); for (let i = 0; i < 80 && Object.keys(N.playersState).filter(id => id !== N.myId()).length < 1; i++) await w(250); return { mode: N.NET.mode, others: Object.keys(N.playersState).filter(id => id !== N.myId()).length, gid: N.myId() }; });
ok('host and guest see each other in playersState, both in Scary GTA', seen.mode === 'host' && seen.guests >= 1 && seen.lvl.includes('scarygta') && seenG.mode === 'guest' && seenG.others >= 1, { seen, seenG });
const gid = seenG.gid;
// ----- migawka hosta dociera do gościa (policja, ciepło, flota) -----
const snap = await G.ev(async () => { const G = await import('./levels/scarygta.js'), w = (ms) => new Promise(r => setTimeout(r, ms)); for (let i = 0; i < 60 && !G.testState().snap; i++) await w(250); return { snap: !!G.testState().snap, mode: G.debugMode().gm.mode }; });
ok('the guest receives the host snapshot (st) over the real connection', snap.snap, snap);
// ----- barykada z hosta rysuje się u gościa -----
const rbs = await H.ev(async () => { const G = await import('./levels/scarygta.js'), RB = await import('./core/gtaroadblock.js'); const node = RB.candidates().find(i => RB.rideBlock('motel', 'north', [i]).kind === 'stop'); G.debugBlocks([node]); return { node, stop: RB.rideBlock('motel', 'north', [node]).stop }; });
const rbg = await G.ev(async (node) => { const G = await import('./levels/scarygta.js'), w = (ms) => new Promise(r => setTimeout(r, ms)); for (let i = 0; i < 40 && !G.debugBlocks(null).nodes.includes(node); i++) await w(250); const d = G.debugBlocks(null); return { nodes: d.nodes, fx: d.fx }; }, rbs.node);
ok('a barricade set by the host appears at the guest (node list over the network, one instance drawn)', rbg.nodes.includes(rbs.node) && rbg.fx.count === 1 && rbg.fx.visible, rbg);
// ----- gość prosi o jazdę: host startuje ją z własnego widoku głowy gościa, gość jedzie ze stopem z hosta -----
const ride = await G.ev(async () => {
    const G = await import('./levels/scarygta.js'), P = await import('./core/player.js'), VL = await import('./core/vehiclelogic.js'), w = (ms) => new Promise(r => setTimeout(r, ms));
    const S = G.testState(); for (let i = 0; i < 600 && S.busted >= 0; i++) await w(100);
    const sp = VL.startPoint('motel'); P.setPlayerPosition(sp.x + 2, 1.2, sp.z + 1); await w(1500);   // host zna pozycję gościa z jego stanu
    G.debugRequestDrive('motel', 1);   // trasa 1 = "north"
    let riding = false; for (let i = 0; i < 80 && !riding; i++) { await w(150); riding = G.debugVeh().v.riding; }
    const f = S.fleet.find(c => c.id === 'motel');
    return { riding, route: f.route, stop: f.stop, occ: f.occ };
});
ok('the guest request starts a drive at the host and the guest rides with the stop chosen by the host', ride.riding && ride.route === 'north' && ride.stop === rbs.stop && ride.occ === 'me', { ride, expectedStop: rbs.stop });
const hostFleet = await H.ev(async () => { const G = await import('./levels/scarygta.js'); const f = G.testState().fleet.find(c => c.id === 'motel'); return { occ: f.occ, stop: f.stop, route: f.route }; });
ok('the host fleet entry names the guest as the rider with the same stop', !!hostFleet.occ && hostFleet.occ !== 'me' && hostFleet.stop === rbs.stop && hostFleet.route === 'north', hostFleet);
// ----- znacznik policjanta: rola cop hosta -> czapka nad awatarem hosta u gościa -----
await H.ev(async (gid) => { const G = await import('./levels/scarygta.js'); const S = G.testState(); S.gm = Object.assign({}, S.gm, { mode: 'cops', phase: 'run', t: 200, roles: { me: 'cop', [gid]: 'robber' }, score: { me: 0, [gid]: 0 }, delivered: 0, winner: '' }); }, gid);
const mark = await G.ev(async () => { const G = await import('./levels/scarygta.js'), w = (ms) => new Promise(r => setTimeout(r, ms)); let d = G.debugCopMarks(); for (let i = 0; i < 40 && d.count < 1; i++) { await w(250); d = G.debugCopMarks(); } return d; });
ok('the host cop role shows the cap marker above the host avatar at the guest', mark.count === 1 && mark.visible, mark);
console.log('errors', JSON.stringify({ host: errors.host.slice(0, 3), guest: errors.guest.slice(0, 3) }));
ok('no page errors on either client', errors.host.length === 0 && errors.guest.length === 0, errors);
console.log(fails ? 'FAILED: ' + fails : 'twoclients: all checks passed');
await finish(fails ? 1 : 0);
