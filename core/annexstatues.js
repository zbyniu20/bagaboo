// ==========================================
// OGRÓD POSĄGÓW W ANEKSIE LOBBY (oprawa 3D i zapis; reguły w czystym core/statuelogic.js, układ w core/annexlayout.js; testy: tests/logic.mjs i tests/annexsecrets.mjs).
// Sześć manekinów skrada się do gracza, gdy na nie nie patrzy; cel to dzwonek na końcu ogrodu. Złapanie tylko wraca posągi na miejsca (bez teleportu i bez jumpscare'a).
// Najlepszy czas w SAVE.annex.statueBest. Sekret 'words' (BAGABOO na stole ouija) obraca na chwilę wszystkie posągi twarzą do gracza (statueStare). Lokalne, bez nagród.
// ==========================================
import { THREE, CANNON, L, camera, addStaticBody } from './engine.js';
import * as T from './textures.js';
import { toast } from './terminal.js';
import { SAVE, saveGame } from './economy.js';
import { buildMannequin } from './mannequin.js';
import * as SFX from './audio.js';
import * as St from './statuelogic.js';
import { normalizeAnnex, formatTime } from './climblogic.js';

let G = null;
const _p = new THREE.Vector3(), _d = new THREE.Vector3();
const getBest = () => { const a = normalizeAnnex(SAVE.annex); SAVE.annex = a; return a.statueBest; };

export function buildAnnexStatues(flickers) {
    const root = L.root, g = St.GARDEN;
    G = { geos: [], mats: [], texs: [], g: St.newGarden(), statues: [], stare: 0, face: [], sig: '', clock: 0 };
    const geo = (x) => { G.geos.push(x); return x; }, mat = (m) => { G.mats.push(m); return m; };
    for (let i = 0; i < g.START.length; i++) {
        const m = buildMannequin(Math.random); m.group.position.set(g.START[i][0], 0, g.START[i][1]); m.group.rotation.y = Math.PI; root.add(m.group); G.statues.push(m); G.face.push(Math.PI);
    }
    const pad = new THREE.Mesh(geo(new THREE.CircleGeometry(g.PADR, 28)), mat(new THREE.MeshBasicMaterial({ color: 0x20c040, transparent: true, opacity: 0.35, depthWrite: false }))); pad.rotation.x = -Math.PI / 2; pad.position.set(g.PAD[0], 0.02, g.PAD[1]); root.add(pad);
    const gold = mat(new THREE.MeshStandardMaterial({ color: 0xe0b030, emissive: 0x805010, emissiveIntensity: 0.9, metalness: 0.8, roughness: 0.3 }));
    const post = new THREE.Mesh(geo(new THREE.CylinderGeometry(0.05, 0.07, 1.2, 8)), gold); post.position.set(g.BELL[0], 0.6, g.BELL[1]); root.add(post);
    addStaticBody(g.BELL[0], 0.6, g.BELL[1], new CANNON.Box(new CANNON.Vec3(0.07, 0.6, 0.07)), post, false);
    const bell = new THREE.Mesh(geo(new THREE.ConeGeometry(0.22, 0.34, 14, 1, true)), gold); bell.material.side = THREE.DoubleSide; bell.position.set(g.BELL[0], 1.38, g.BELL[1]); root.add(bell);
    G.cv = T.makeCanvas(512, 256); G.cx = G.cv.getContext('2d'); G.tx = T.toTex(G.cv, false); G.texs.push(G.tx);
    const board = new THREE.Mesh(geo(new THREE.PlaneGeometry(2.0, 1.0)), mat(new THREE.MeshBasicMaterial({ map: G.tx, toneMapped: false }))); board.position.set(g.PAD[0], 2.1, g.PAD[1] - 0.8); board.rotation.y = Math.PI; root.add(board);
    const l = new THREE.PointLight(0xb0c0ff, 12, 12, 2); l.position.set(-6, 6, 31); root.add(l); flickers.push({ l: l, base: 12, ph: Math.random() * 100, subtle: true });
    L.reserved.push([-6, 31, 6.5]);
    draw();
}
function draw() {
    const x = G.cx, s = G.g, best = getBest();
    x.fillStyle = '#10121a'; x.fillRect(0, 0, 512, 256); x.strokeStyle = '#8aa0d0'; x.lineWidth = 5; x.strokeRect(4, 4, 504, 248);
    x.textAlign = 'center'; x.fillStyle = '#c8d8ff'; x.font = 'bold 40px "Courier New", monospace'; x.fillText('STATUE GARDEN', 256, 56);
    x.font = 'bold 74px "Courier New", monospace'; x.fillStyle = s.ph === 'run' ? '#ff6a40' : (s.ph === 'won' ? '#7fff90' : '#586080'); x.fillText(formatTime(s.ph === 'won' ? s.last : s.t), 256, 140);
    x.font = '24px "Courier New", monospace'; x.fillStyle = '#d8c8b0'; x.fillText(s.ph === 'idle' ? 'Step on the green pad. Never look away.' : (s.ph === 'run' ? 'Ring the bell at the end' : 'You made it!'), 256, 184);
    x.fillStyle = '#c8d8ff'; x.font = 'bold 28px "Courier New", monospace'; x.fillText('Best: ' + (best ? formatTime(best) + ' s' : '--'), 256, 230);
    G.tx.needsUpdate = true;
}
function onEvent(ev) {
    const s = G.g;
    if (ev === 'start') { toast('Statue Garden: do not blink.', '#c8d8ff'); SFX.beep && SFX.beep(300, 0.06, 0.3); }
    else if (ev === 'caught') { toast('They moved... the garden resets.', '#ff6a52'); SFX.bang && SFX.bang({ x: -6, y: 1, z: 31 }); }
    else if (ev === 'abandon') toast('Statue Garden: you left, the garden resets.', '#ffb030');
    else if (ev === 'won') {
        SFX.bell && SFX.bell(); const best = getBest();
        if (!best || s.last < best) { SAVE.annex = Object.assign({}, normalizeAnnex(SAVE.annex), { statueBest: Math.round(s.last * 100) / 100 }); saveGame(); toast('New Statue Garden record: ' + formatTime(s.last) + ' s', '#ffd27a'); }
        else toast('Statue Garden: ' + formatTime(s.last) + ' s (best ' + formatTime(best) + ')', '#7fff90');
    }
}
export function updateAnnexStatues(dt, t) {
    if (!G) return; G.clock += dt;
    camera.getWorldPosition(_p); camera.getWorldDirection(_d);
    const seen = G.g.pos.map(p => St.seenBy(_p.x, _p.z, _d.x, _d.z, p[0], p[1]));
    const r = St.gardenStep(G.g, { x: _p.x, z: _p.z }, seen, dt); G.g = r.g; if (r.event) onEvent(r.event);
    G.stare = Math.max(0, G.stare - dt);
    G.statues.forEach((m, i) => {
        const p = G.g.pos[i]; m.group.position.set(p[0], 0, p[1]);
        if (G.stare > 0 || G.g.ph === 'run') { const ty = Math.atan2(_p.x - p[0], _p.z - p[1]); let dd = ty - G.face[i]; dd = Math.atan2(Math.sin(dd), Math.cos(dd)); if (G.stare > 0) G.face[i] = ty; else if (!seen[i]) G.face[i] += dd * Math.min(1, dt * 6); }
        m.group.rotation.y = G.face[i];
    });
    const sig = G.g.ph + ':' + Math.floor(G.g.t * 10) + ':' + getBest() + ':' + Math.floor(G.g.shown); if (sig !== G.sig && (G.g.ph !== 'run' || Math.floor(G.clock * 10) % 2 === 0)) { G.sig = sig; draw(); }
}
export function statueStare(seconds) { if (G) G.stare = Math.max(G.stare, seconds); }
export function disposeAnnexStatues() { if (!G) return; for (const g of G.geos) g.dispose(); for (const m of G.mats) m.dispose(); for (const x of G.texs) x.dispose(); G = null; }
export const debugStatues = () => G ? { ph: G.g.ph, t: G.g.t, last: G.g.last, count: G.statues.length, pos: G.g.pos.map(p => p.slice()), best: getBest(), stare: G.stare } : null;   // dla testów
export function debugGardenStep(x, z, seenAll, dt) { if (!G) return ''; const r = St.gardenStep(G.g, { x: x, z: z }, G.g.pos.map(() => !!seenAll), dt); G.g = r.g; if (r.event) onEvent(r.event); return r.event; }
