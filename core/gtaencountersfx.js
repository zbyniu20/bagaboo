// ==========================================
// SCARY GTA: LOSOWE SPOTKANIA (3D, dźwięk i napisy; reguły w czystym core/gtaencounters.js, zapis przez core/gtastore.js, testy: tests/gtaencounters.mjs).
// Autostopowicz-widmo przy ulicy, bezszelestna czarna limuzyna w blackoucie i czerwone światła w morzu. Wszystkie trzy obiekty są ukryte (visible = false), dopóki nie wystąpi
// ich spotkanie, więc nie kosztują wywołań rysowania; światła w morzu to jedna siatka punktów. Każde spotkanie zapowiada krótki napis "RADIO: ...". Nic nie goni ani nie łapie
// gracza, nic nie idzie przez sieć i nic nie rusza ciepła ani gwiazdek. Na poziomie Gentle (SETTINGS.jumpscares === false) autostopowicz nie szepcze. Bez stroba: światła pulsują 0,4 Hz.
// ==========================================
import { THREE, L, tex } from './engine.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { toast } from './terminal.js';
import { SETTINGS } from './settings.js';
import * as SFX from './audio.js';
import * as E from './gtaencounters.js';
import { gtaEncounters, markEncounter } from './gtastore.js';

const paint = (g, c) => { const n = g.attributes.position.count, a = new Float32Array(n * 3); for (let i = 0; i < n; i++) { a[i * 3] = c[0]; a[i * 3 + 1] = c[1]; a[i * 3 + 2] = c[2]; } g.setAttribute('color', new THREE.BufferAttribute(a, 3)); return g; };
const box = (w, h, d, x, y, z, c) => paint(new THREE.BoxGeometry(w, h, d).translate(x, y, z), c);
const side = (p) => Math.abs(p.x) > Math.abs(p.z) * 1.6 ? (p.x < 0 ? 'west' : 'east') : (p.z < 0 ? 'north' : 'south');

// o: { api }; api: { night() -> 'calm'|'blackout'|'horde', storm() -> bool }
export function createGtaEncounters(o) {
    const api = o.api, root = L.root, spots = E.hitchSpots();
    const G = { geos: [], mats: [], seen: new Set(gtaEncounters().seen), hitch: E.newHitch(), limo: E.newLimo(), lights: E.newLights(), t: 0, log: [], lightAnn: 0 };
    const geo = (g) => { G.geos.push(g); return g; }, mat = (m) => { G.mats.push(m); return m; };
    const calm = () => SETTINGS.jumpscares === false;
    // autostopowicz: postać w płaszczu z uniesionym kciukiem
    const fig = geo(mergeGeometries([box(0.46, 0.8, 0.26, 0, 1.1, 0, [0.3, 0.3, 0.34]), paint(new THREE.SphereGeometry(0.13, 10, 8).translate(0, 1.66, 0), [0.7, 0.68, 0.64]), box(0.16, 0.8, 0.16, -0.12, 0.4, 0, [0.22, 0.22, 0.26]), box(0.16, 0.8, 0.16, 0.12, 0.4, 0, [0.22, 0.22, 0.26]), box(0.12, 0.7, 0.12, -0.31, 1.05, 0, [0.3, 0.3, 0.34]), box(0.1, 0.1, 0.1, 0.38, 1.62, 0, [0.7, 0.68, 0.64]), box(0.12, 0.65, 0.12, 0.34, 1.2, 0, [0.3, 0.3, 0.34])]));
    G.hitchM = new THREE.Mesh(fig, mat(new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false }))); G.hitchM.visible = false; root.add(G.hitchM);
    // limuzyna: czarny korpus, dach, czerwone tylne światła
    const limo = geo(mergeGeometries([box(1.9, 0.7, 5.4, 0, 0.55, 0, [0.04, 0.04, 0.05]), box(1.7, 0.6, 2.6, 0, 1.15, -0.2, [0.05, 0.05, 0.07]), box(0.3, 0.14, 0.05, -0.6, 0.65, -2.72, [2, 0.1, 0.1]), box(0.3, 0.14, 0.05, 0.6, 0.65, -2.72, [2, 0.1, 0.1]), box(0.22, 0.1, 0.05, -0.65, 0.6, 2.72, [1.6, 1.5, 1.2]), box(0.22, 0.1, 0.05, 0.65, 0.6, 2.72, [1.6, 1.5, 1.2])]));
    G.limoM = new THREE.Mesh(limo, mat(new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false }))); G.limoM.visible = false; root.add(G.limoM);
    // światła w morzu: jedna siatka punktów
    const pts = new Float32Array(E.ENC.LIGHTS.AT.length * 3); E.ENC.LIGHTS.AT.forEach((p, i) => { pts[i * 3] = p[0]; pts[i * 3 + 1] = p[1]; pts[i * 3 + 2] = p[2]; });
    const lg = geo(new THREE.BufferGeometry()); lg.setAttribute('position', new THREE.BufferAttribute(pts, 3));
    G.lightsM = new THREE.Points(lg, mat(new THREE.PointsMaterial({ color: 0xff2a1a, size: 26, sizeAttenuation: false, fog: false, map: tex.dot, transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending, toneMapped: false, opacity: 0.6 }))); G.lightsM.visible = false; G.lightsM.frustumCulled = false; root.add(G.lightsM);

    const radio = (id, extra) => toast('RADIO: ' + E.RADIO_LINES[id] + (extra ? ' ' + extra : ''), '#ffd27a');
    function award(id, msg) {
        const r = markEncounter(id); G.log.push(id + ':' + (r.isNew ? 'new' : 'again'));
        if (msg) toast(msg, '#9ad0ff');
        if (!r.isNew) return; G.seen.add(id); SFX.bell && SFX.bell();
        toast('Encounter ' + r.state.seen.length + '/' + E.ENC.IDS.length + ': ' + E.NAMES[id] + ' (+' + r.bones + ' Bagabucks)', '#ffd23a');
        if (r.all) toast('You have seen everything this city hides at night. (+' + E.ENC.ALL_BONUS + ')', '#7fff90');
    }
    function update(dt, c) {
        dt = Math.min(dt, 0.1); G.t += dt;
        const night = api.night(), storm = api.storm();
        // autostopowicz
        const h = E.hitchStep(G.hitch, dt, { px: c.x, pz: c.z, spots: spots }); G.hitch = h.st;
        if (h.event === 'appear') { G.hitchM.position.set(h.spot.x, 0, h.spot.z); G.hitchM.visible = true; radio('hitchhiker', '(' + side(h.spot) + ' side)'); }
        if (G.hitchM.visible && G.hitch.spot) G.hitchM.rotation.y = Math.atan2(c.x - G.hitch.spot.x, c.z - G.hitch.spot.z);
        if (h.event === 'found') { G.hitchM.visible = false; if (!calm() && SFX.whisper) SFX.whisper({ x: h.spot.x, y: 1.2, z: h.spot.z }); award('hitchhiker', 'He turns, smiles, and is simply gone.'); }
        else if (h.event === 'gone') G.hitchM.visible = false;
        // limuzyna
        const l = E.limoStep(G.limo, dt, { blackout: night === 'blackout', px: c.x, pz: c.z }); G.limo = l.st;
        if (l.event === 'appear') radio('limo');
        if (l.pos) { G.limoM.position.set(l.pos.x, 0, l.pos.z); G.limoM.rotation.y = G.limo.dir > 0 ? Math.PI / 2 : -Math.PI / 2; G.limoM.visible = true; } else G.limoM.visible = false;
        if (l.event === 'found') award('limo', 'It passes without a sound. Nobody is behind the wheel.');
        // światła w morzu
        const active = storm || night === 'blackout';
        const ls = E.lightsStep(G.lights, dt, { active: active, px: c.x, py: c.y, pz: c.z, dx: c.dx, dy: c.dy, dz: c.dz }); G.lights = ls.st;
        G.lightsM.visible = ls.visible; if (ls.visible) G.lightsM.material.opacity = 0.4 + 0.6 * E.lightPulse(G.t);
        if (ls.visible && !G.seen.has('sealights')) { G.lightAnn -= dt; if (G.lightAnn <= 0) { G.lightAnn = 150; radio('sealights'); } } else if (!ls.visible) G.lightAnn = Math.min(G.lightAnn, 4);
        if (ls.found) award('sealights', 'The red lights blink once... as if they noticed you.');
    }
    const info = () => ({ n: G.seen.size, total: E.ENC.IDS.length });
    return {
        update, info,
        debug: () => ({ seen: Array.from(G.seen), log: G.log.slice(), hitch: G.hitchM.visible, hitchPh: G.hitch.ph, limo: G.limoM.visible, lights: G.lightsM.visible, lightsT: G.lights.t, info: info() }),
        force: (kind, spot) => { if (kind === 'hitch') { G.hitch = { ph: 'live', t: E.ENC.HITCH.STAY, spot: spot || spots[0] }; G.hitchM.position.set(G.hitch.spot.x, 0, G.hitch.spot.z); G.hitchM.visible = true; } },
        spots,
        dispose() { for (const x of [G.hitchM, G.limoM, G.lightsM]) x.removeFromParent(); for (const g of G.geos) g.dispose(); for (const x of G.mats) x.dispose(); }
    };
}
