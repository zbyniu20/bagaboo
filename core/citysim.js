// ==========================================
// SCARY GTA: SYMULACJA MIASTA (oprawa 3D; reguły w czystych core/wantedlogic.js, core/cityai.js i core/citylayout.js; testy: tests/logic.mjs, tests/city.mjs).
// Pula 10 policjantów-zombie (manekin z modelem GLB, latarka jako stożek), aligatory w marinie, linie szybkiego transportu (zjazd na linie: railStep z core/ziplogic.js),
// kryjówki (śmietniki w zaułkach) i znaczniki bezpiecznych punktów odrodzenia. update(dt, players) dostaje LISTĘ graczy { id, x, y, z, speed, busted, carrying },
// więc ta sama symulacja obsłuży potem hosta z wieloma graczami (etap online): heat i gwiazdki są osobne dla każdego gracza. Złapanie zgłasza onBust(id, powód, pozycja).
// ==========================================
import { THREE, CANNON, L, camera, addStaticBody } from './engine.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { buildMannequin, addMonsterFace } from './mannequin.js';
import { swapModel } from './glbmonster.js';
import { createBot, stepBot } from './botkit.js';
import { hands, playerBody } from './player.js';
import { PACE } from './config.js';
import * as SFX from './audio.js';
import * as C from './citylayout.js';
import * as AI from './cityai.js';
import * as WL from './wantedlogic.js';
import * as Z from './ziplogic.js';

const _w = new THREE.Vector3(), POOL = 10, RUN_SPEED = 4.3, HIDE_R = 1.7, WATER = C.blockRect(0, 2);
const paint = (g, r, gr, b) => { const n = g.attributes.position.count, a = new Float32Array(n * 3); for (let i = 0; i < n; i++) { a[i * 3] = r; a[i * 3 + 1] = gr; a[i * 3 + 2] = b; } g.setAttribute('color', new THREE.BufferAttribute(a, 3)); return g; };
const DIFF_COPS = { easy: 0.6, normal: 1, nightmare: 1.3 };

const COP_VIS = 65;   // policjanci dalej od kamery nie są rysowane (mgła i tak ich zakrywa; oszczędza wywołania rysowania: każdy model to kilka siatek)
export function createCitySim(o) {
    const G = { geos: [], mats: [], cops: [], gators: [], rails: [], heats: {}, events: [], clock: 0, evT: 0, radioT: 0, boxes: o.boxes, graph: AI.streetGraph(), hides: C.hideSpots(), diff: o.diff || 'normal', busts: 0, extSeen: {}, sightMul: {}, darkZones: [], globalSight: 1, hearMul: 1, extraCops: 0, lastBust: null, seenBy: {}, hiddenNow: {}, stat: { spawned: 0, caught: 0 } };
    const geo = (g) => { G.geos.push(g); return g; }, mat = (m) => { G.mats.push(m); return m; };
    // ----- policjanci: pula, nieaktywni ukryci -----
    const coneG = geo(new THREE.ConeGeometry(2.4, 13, 14, 1, true)); coneG.rotateX(Math.PI / 2); coneG.translate(0, 0, 6.5);
    const coneM = mat(new THREE.MeshBasicMaterial({ color: 0xfff0b0, transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }));
    // stożki latarek wszystkich policjantów to JEDNA siatka instancjonowana (jedno wywołanie rysowania zamiast jednego na policjanta); jasność stożka niesie kolor instancji
    G.cones = new THREE.InstancedMesh(coneG, coneM, POOL); G.cones.frustumCulled = false; G.cones.count = POOL; G.cones.setColorAt(0, new THREE.Color(1, 1, 1)); L.root.add(G.cones);
    for (let i = 0; i < POOL; i++) {
        const m = buildMannequin(Math.random); m.group.visible = false; L.root.add(m.group);
        addMonsterFace(m.head, { width: 0.05, open: 0.03, toothColor: 0xb8b090, long: 1.1, tears: 0x300808 }); swapModel(m, 'officer');
        const cone = { visible: false, material: { opacity: 0.1 } };   // stan stożka (rysuje go G.cones przez syncCones)
        const bot = createBot(0, 0); bot.listen = true;
        G.cops.push({ m: m, bot: bot, st: AI.newCop(0), active: false, cone: cone, sees: null, att: 0, tx: 0, tz: 0 });
    }
    // ----- aligatory w marinie -----
    const gm = mat(new THREE.MeshStandardMaterial({ color: 0x2a4a22, roughness: 0.7, metalness: 0.1 }));
    for (let i = 0; i < 3; i++) {
        const parts = [paint(new THREE.BoxGeometry(0.8, 0.32, 2.6), 1, 1, 1), paint(new THREE.BoxGeometry(0.5, 0.22, 1.1).translate(0, -0.02, 1.7), 0.9, 0.9, 0.9), paint(new THREE.BoxGeometry(0.25, 0.18, 1.4).translate(0, -0.02, -2), 0.8, 0.8, 0.8)];
        for (const sx of [-1, 1]) parts.push(paint(new THREE.SphereGeometry(0.07, 6, 5).translate(sx * 0.18, 0.2, 1.95), 3, 2.4, 0.4));   // oczy
        const g = new THREE.Group(); g.add(new THREE.Mesh(geo(mergeGeometries(parts)), gm)); L.root.add(g);
        const x = WATER.x0 + 6 + i * 6, z = WATER.z0 + 4 + (i % 2) * 14;
        g.position.set(x, -0.15, z); G.gators.push({ g: g, x: x, z: z, dir: 0, goal: [x, z], mode: 'idle', t: 0 });
    }
    // ----- śmietniki (kryjówki, z kolizją) i bezpieczne punkty -----
    const dump = [], safe = [];
    for (const h of G.hides) { dump.push(paint(new THREE.BoxGeometry(2.2, 1.3, 1.2).translate(h.x, 0.65, h.z), 0.2, 0.34, 0.24)); addStaticBody(h.x, 0.65, h.z, new CANNON.Box(new CANNON.Vec3(1.1, 0.65, 0.6)), G, false); }
    for (const s of C.SAFEHOUSES) safe.push(paint(new THREE.CylinderGeometry(1.6, 1.6, 0.04, 24).translate(s.x, 0.06, s.z), 0.2, 2, 0.5));
    const flat = mat(new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false })); const dm = mat(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6, metalness: 0.4 }));
    L.root.add(new THREE.Mesh(geo(mergeGeometries(dump)), dm)); L.root.add(new THREE.Mesh(geo(mergeGeometries(safe)), flat));
    // ----- linie szybkiego transportu -----
    const steel = mat(new THREE.MeshStandardMaterial({ color: 0x9a9da2, metalness: 0.9, roughness: 0.3 })), gold = mat(new THREE.MeshStandardMaterial({ color: 0xffd060, emissive: 0x805010, emissiveIntensity: 0.8, metalness: 0.5 }));
    for (const r of C.RAILS) {
        const dir = new THREE.Vector3(r.B[0] - r.A[0], r.B[1] - r.A[1], r.B[2] - r.A[2]), len = dir.length(), cable = new THREE.Mesh(geo(new THREE.CylinderGeometry(0.02, 0.02, len, 5)), steel);
        cable.position.set((r.A[0] + r.B[0]) / 2, (r.A[1] + r.B[1]) / 2, (r.A[2] + r.B[2]) / 2); cable.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize()); L.root.add(cable);
        const h = new THREE.Group(); const bar = new THREE.Mesh(geo(new THREE.CylinderGeometry(0.03, 0.03, 0.5, 8)), gold); bar.rotation.z = Math.PI / 2; bar.position.y = -0.2; h.add(bar); L.root.add(h);
        const l = new THREE.PointLight(0xffc050, 12, 14, 2); l.position.set(r.A[0], r.A[1] - 1, r.A[2]); L.root.add(l);
        const a1 = new THREE.Mesh(geo(new THREE.BoxGeometry(0.14, 2.4, 0.14)), steel); a1.position.set(r.A[0], r.A[1] - 1, r.A[2] - 0.8); L.root.add(a1);
        G.rails.push({ r: r, st: Z.newZip(), h: h, pos: r.A.slice(), ret: 1, rides: 0 });
    }
    // ----- API -----
    G.addEvent = (kind, x, z) => G.events.push({ kind: kind, x: x, z: z, t: 0 });
    G.heatOf = (id) => G.heats[id] || (G.heats[id] = WL.newHeat());
    G.addHeat = (id, amount) => { G.heats[id] = WL.addHeat(G.heatOf(id), amount, G.diff); };
    G.starsOf = (id) => WL.starsOf(G.heatOf(id).v);
    G.activeCops = () => G.cops.filter(c => c.active);
    G.copPositions = () => G.activeCops().map(c => ({ x: c.bot.x, y: c.bot.y + 1, z: c.bot.z }));
    G.spawnCop = (c, node) => { const n = G.graph.nodes[node]; c.active = true; c.hp = 100; c.drop = 0; c.bot.x = n.x; c.bot.z = n.z; c.bot.y = 0; c.bot.vy = 0; c.bot.mode = 'patrol'; c.st = AI.newCop(node); c.m.group.visible = true; c.cone.visible = true; G.stat.spawned++; };
    // SWAT: n policjantów zjeżdża na linach obok celu (zajmują wolne miejsca w puli albo najdalszych policjantów), od razu szukają gracza
    G.dropSwat = (x, z, n) => {
        const ring = AI.spawnNodes(G.graph, x, z, 8, 22); if (!ring.length) return 0; let done = 0;
        for (let k = 0; k < n; k++) {
            let c = G.cops.find(q => !q.active); if (!c) { c = G.activeCops().sort((a, b) => Math.hypot(b.bot.x - x, b.bot.z - z) - Math.hypot(a.bot.x - x, a.bot.z - z))[0]; if (!c) break; G.despawn(c); }
            G.spawnCop(c, ring[(Math.random() * ring.length) | 0]); c.drop = 2.6; c.st.mode = 'search'; c.st.searchT = 0; c.st.last = { x: x, z: z }; done++;
        }
        return done;
    };
    G.despawn = (c) => { c.active = false; c.m.group.visible = false; c.cone.visible = false; };
    const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s1 = new THREE.Vector3(1, 1, 1), _s0 = new THREE.Vector3(0, 0, 0), _c = new THREE.Color();
    G.syncCones = () => {
        G.cops.forEach((c, i) => {
            const on = c.active && c.m.group.visible && c.cone.visible, b = c.bot;
            _e.set(0, b.dir, 0); _q.setFromEuler(_e); _p.set(b.x, b.y + 1.5 + Math.max(0, c.drop || 0) * 14, b.z); _m.compose(_p, _q, on ? _s1 : _s0);
            G.cones.setMatrixAt(i, _m); const k = Math.min(1.5, c.cone.material.opacity / 0.16); _c.setRGB(k, k, k); G.cones.setColorAt(i, _c);
        });
        G.cones.instanceMatrix.needsUpdate = true; if (G.cones.instanceColor) G.cones.instanceColor.needsUpdate = true;
    };
    G.reset = () => { for (const c of G.cops) G.despawn(c); };
    G.resetCopsNear = (x, z, r) => { for (const c of G.activeCops()) if (Math.hypot(c.bot.x - x, c.bot.z - z) < r) { c.st.mode = 'search'; c.st.searchT = 0; c.st.last = { x: x, z: z }; } };
    // Sieć: host wysyła migawkę policjantów, gość (G.puppet = true) tylko ją odtwarza (bez AI, bez łapania, bez ciepła)
    G.copSnap = () => G.cops.map((c, i) => c.active ? [i, +c.bot.x.toFixed(2), +c.bot.z.toFixed(2), +c.bot.dir.toFixed(2), c.st.mode] : null).filter(Boolean);
    G.applyCops = (list, dt) => {
        const seen = new Set(list.map(e => e.i));
        G.cops.forEach((c, i) => {
            if (!seen.has(i)) { if (c.active) G.despawn(c); return; }
            const e = list.find(q => q.i === i), b = c.bot;
            if (!c.active) { G.spawnCop(c, 0); b.x = e.x; b.z = e.z; b.dir = e.dir; }
            const d = Math.hypot(e.x - b.x, e.z - b.z), k = d > 8 ? 1 : Math.min(1, dt * 10);
            b.x += (e.x - b.x) * k; b.z += (e.z - b.z) * k; let da = e.dir - b.dir; da = Math.atan2(Math.sin(da), Math.cos(da)); b.dir += da * Math.min(1, dt * 12);
            c.st.mode = e.mode; c.m.group.position.set(b.x, b.y, b.z); c.m.group.rotation.y = b.dir; c.m.group.visible = Math.hypot(b.x - camera.position.x, b.z - camera.position.z) < COP_VIS; c.cone.material.opacity = e.mode === 'chase' ? 0.16 : 0.1;
        });
        G.syncCones();
    };
    G.update = (dt, players, rand) => { const out = update(G, dt, players, rand || Math.random); G.syncCones(); return out; };
    G.dispose = () => { G.cones.dispose(); for (const g of G.geos) g.dispose(); for (const m of G.mats) m.dispose(); };
    return G;
}

function update(G, dt, players, rand) {
    G.clock += dt; const live = players.filter(p => !p.busted), out = { busts: [], seen: {} };
    // zdarzenia hałasu: bieg co 0,5 s, krzyk i inne wpisuje poziom; zdarzenia żyją 0,6 s
    G.evT -= dt; for (const e of G.events) e.t += dt; G.events = G.events.filter(e => e.t < 0.6);
    if (G.evT <= 0) { G.evT = 0.5; for (const p of live) if (p.speed > RUN_SPEED && !G.hiddenNow[p.id] && p.y < 8) G.addEvent('run', p.x, p.z); }
    for (const p of live) {
        const near = G.hides.some(h => Math.hypot(h.x - p.x, h.z - p.z) < HIDE_R) && p.speed < 0.7 && p.y < 2.6;
        G.hiddenNow[p.id] = near;
    }
    const maxStars = Math.max(0, ...live.map(p => G.starsOf(p.id)));
    const want = Math.min(POOL, Math.max(2, Math.round(WL.starRules(maxStars).maxCops * (DIFF_COPS[G.diff] || 1))) + (G.extraCops || 0));
    // populacja: dopełniaj przy graczach (pierścień 28-62 m), usuwaj dalekich
    if (live.length && !G.puppet) {
        const act = G.activeCops(); for (const c of act) if (!live.some(p => Math.hypot(p.x - c.bot.x, p.z - c.bot.z) < 115)) G.despawn(c);
        const cnt = G.activeCops().length;
        if (cnt < want) { const free = G.cops.find(c => !c.active), pl = live[(rand() * live.length) | 0]; if (free) { const ring = AI.spawnNodes(G.graph, pl.x, pl.z, 28, 62); if (ring.length) { G.spawnCop(free, ring[(rand() * ring.length) | 0]); if (G.extraCops) { free.st.mode = 'search'; free.st.searchT = 0; free.st.last = { x: pl.x, z: pl.z }; } } } }
        else if (cnt > want + 1) { const dMin = (c) => Math.min(...live.map(q => Math.hypot(c.bot.x - q.x, c.bot.z - q.z))); const far = G.activeCops().sort((a, b) => dMin(b) - dMin(a))[0]; if (far && dMin(far) > 45) G.despawn(far); }   // najdalszy od WSZYSTKICH graczy (nie tylko pierwszego)
    }
    G.radioT -= dt; const radio = G.radioT <= 0; if (radio) G.radioT = 6;
    const seenNow = {};
    for (const c of (G.puppet ? [] : G.activeCops())) {
        const b = c.bot; let tgt = null, bd = 1e9;
        for (const p of live) {
            const rules = WL.starRules(G.starsOf(p.id)), blocked = AI.lineBlocked([b.x, 1.5, b.z], [p.x, p.y, p.z], G.boxes);
            if (AI.copSees({ x: b.x, z: b.z, y: b.y, dir: b.dir }, p, { sight: rules.sight * (G.sightMul[p.id] || 1) * G.globalSight, hidden: G.hiddenNow[p.id], blocked: blocked, dark: G.darkZones.reduce((m, z) => Math.hypot(p.x - z.x, p.z - z.z) < z.r ? m * z.mul : m, 1) })) { const d = Math.hypot(p.x - b.x, p.z - b.z); if (d < bd) { bd = d; tgt = p; } }
        }
        const lead = tgt || live.slice().sort((a, b2) => G.starsOf(b2.id) - G.starsOf(a.id))[0] || null, rules = WL.starRules(lead ? G.starsOf(lead.id) : 0);
        const ev = G.events.find(e => AI.copHears(b, e, G.hearMul)) || null, radioPos = radio && rules.radio && lead && G.starsOf(lead.id) > 0 ? { x: lead.x + (rand() - 0.5) * 2 * rules.radio, z: lead.z + (rand() - 0.5) * 2 * rules.radio } : null;
        const dcs = AI.copDecide(c.st, { rules: rules, sees: !!tgt, px: tgt ? tgt.x : 0, pz: tgt ? tgt.z : 0, heard: ev, radioPos: radioPos }, dt);
        if (tgt) seenNow[tgt.id] = true;
        let tx, tz, speed = dcs.speed * PACE;
        if (dcs.goal) { tx = dcs.goal.x; tz = dcs.goal.z; if (tgt && AI.playerOnRoof(tgt)) { const nn = G.graph.nodes[AI.nearestNode(G.graph, tgt.x, tgt.z)]; tx = nn.x; tz = nn.z; speed *= 0.5; } }
        else { const pt = AI.patrolTarget(G.graph, c.st, rand); if (pt) { tx = pt.x; tz = pt.z; if (Math.hypot(tx - b.x, tz - b.z) < 1.6) AI.patrolArrived(G.graph, c.st); } else { tx = b.x; tz = b.z; speed = 0; } }
        stepBot(b, dt, tx, tz, 0, speed, dcs.mode === 'chase');
        if (c.drop > 0) c.drop -= dt;   // SWAT zjeżdża z helikoptera: model opada z wysokości, a w tym czasie nie łapie
        c.m.group.position.set(b.x, b.y + Math.max(0, c.drop || 0) * 14, b.z); c.m.group.rotation.y = b.dir; c.m.group.visible = Math.hypot(b.x - camera.position.x, b.z - camera.position.z) < COP_VIS; c.cone.visible = true; c.cone.material.opacity = dcs.mode === 'chase' ? 0.16 : 0.1;
        if (b.y < -3 || Math.abs(b.x) > 90 || b.z > 80) G.despawn(c);
        if (!(c.drop > 0.3)) for (const p of live) if (AI.caughtBy({ x: b.x, z: b.z, y: b.y }, p)) { out.busts.push({ id: p.id, reason: 'cop', x: p.x, z: p.z }); G.stat.caught++; G.resetCopsNear(p.x, p.z, 30); break; }
    }
    for (const id in G.extSeen) seenNow[id] = true; G.extSeen = {};   // widziany przez helikopter też odnawia ciepło
    // poziom poszukiwania: widzenie (policja) odnawia heat, kryjówka go obniża
    if (!G.puppet) for (const p of live) { const h = G.heatOf(p.id); G.heats[p.id] = WL.heatStep(h, dt, { seen: !!seenNow[p.id], hidden: !!G.hiddenNow[p.id] }); if (p.carrying) G.heats[p.id] = { v: WL.clampHeat(G.heats[p.id].v + WL.eventHeat('carry', dt) * 0), seenT: G.heats[p.id].seenT }; }
    out.seen = seenNow;
    // aligatory: patrol po wodzie, polowanie na wchodzących do wody
    for (const a of G.gators) {
        let target = null, td = 1e9; for (const p of live) { const inWater = p.x > WATER.x0 && p.x < WATER.x1 && p.z > WATER.z0 && p.z < WATER.z1 && p.y - 1 < 0.45 && !onDock(p.z); if (inWater) { const d = Math.hypot(p.x - a.x, p.z - a.z); if (d < 11 && d < td) { td = d; target = p; } } }
        if (target) { a.mode = 'hunt'; a.goal = [target.x, target.z]; } else if (a.mode === 'hunt') { a.mode = 'idle'; a.t = 0; }
        a.t -= dt; if (a.mode === 'idle' && (a.t <= 0 || Math.hypot(a.goal[0] - a.x, a.goal[1] - a.z) < 0.8)) { a.t = 3 + rand() * 4; a.goal = [WATER.x0 + 3 + rand() * (WATER.x1 - WATER.x0 - 6), WATER.z0 + 3 + rand() * (WATER.z1 - WATER.z0 - 6)]; }
        const sp = (a.mode === 'hunt' ? 3.8 : 0.9) * PACE, dx = a.goal[0] - a.x, dz = a.goal[1] - a.z, d = Math.hypot(dx, dz);
        if (d > 0.1) { a.x += dx / d * Math.min(d, sp * dt); a.z += dz / d * Math.min(d, sp * dt); a.dir = Math.atan2(dx, dz); }
        a.x = Math.max(WATER.x0 + 1, Math.min(WATER.x1 - 1, a.x)); a.z = Math.max(WATER.z0 + 1, Math.min(WATER.z1 - 1, a.z));
        a.g.position.set(a.x, a.mode === 'hunt' ? 0.05 + Math.sin(G.clock * 6) * 0.03 : -0.18, a.z); a.g.rotation.y = a.dir;
        for (const p of live) if (a.mode === 'hunt' && Math.hypot(p.x - a.x, p.z - a.z) < 1.5 && p.y - 1 < 1) { out.busts.push({ id: p.id, reason: 'gator', x: p.x, z: p.z }); a.mode = 'idle'; a.t = 6; }
    }
    return out;
}
const onDock = (z) => { for (let zz = WATER.z0 + 2; zz < WATER.z1; zz += 6) if (Math.abs(z - zz) < 0.9) return true; return false; };

// ----- linie transportu: dotknięcie uchwytu dłonią zabiera gracza; zwraca { body, vel, event } albo null -----
export function updateRails(G, dt, force) {
    let res = null;
    for (let i = 0; i < G.rails.length; i++) {
        const R = G.rails[i], r = R.r;
        let near = force === i;
        if (!near && R.st.ph === 'idle' && R.st.cd <= 0) for (const h of [hands.L, hands.R]) { if (!h) continue; h.getWorldPosition(_w); if (Math.hypot(_w.x - r.A[0], _w.y - (r.A[1] - 0.2), _w.z - r.A[2]) < 0.55) near = true; }
        const s = Z.railStep(r, R.st, near, dt); R.st = s.st;
        if (s.body) { playerBody.position.set(s.body[0], s.body[1], s.body[2]); if (s.vel) playerBody.velocity.set(s.vel[0], s.vel[1], s.vel[2]); res = { id: r.id, event: s.event }; }
        if (s.event === 'start') { R.rides++; SFX.beep && SFX.beep(420, 0.06, 0.5); R.ret = 0; }
        if (R.st.ph === 'ride') R.pos = s.pos; else { R.ret = Math.min(1, R.ret + dt / r.COOLDOWN); const e = r.B; R.pos = [e[0] + (r.A[0] - e[0]) * R.ret, e[1] + (r.A[1] - e[1]) * R.ret, e[2] + (r.A[2] - e[2]) * R.ret]; }
        R.h.position.set(R.pos[0], R.pos[1], R.pos[2]);
    }
    return res;
}
export const ridingAny = (G) => G.rails.some(R => R.st.ph === 'ride');
export function cancelRails(G) { for (const R of G.rails) { R.st = Z.newZip(); R.ret = 1; R.pos = R.r.A.slice(); } }
