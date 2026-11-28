// ==========================================
// SCARY GTA: CIAŁA I KAŁUŻE KRWI (3D; reguły w czystym core/damagelogic.js, testy: tests/logic.mjs, w przeglądarce tests/gtadamage.mjs).
// Zabity gracz albo policjant pada (przewrót z nóg, głową od strzelca) i leży w kałuży krwi. Dwie siatki instancjonowane (ciała i kałuże = +2 wywołania rysowania, najwyżej DMG.MAX_CORPSES sztuk),
// bez kolizji i bez ciała fizyki (dekoracja: gracz i policja przechodzą). Kałuża tylko przy włączonym Gore (api.gore). Awatar zabitego gracza jest ukryty u innych do odrodzenia (api.dead).
// Wszystko lokalne: pozycje przychodzą z wiadomości hosta, które i tak są (bust, fx).
// ==========================================
import { THREE, L } from './engine.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import * as DL from './damagelogic.js';

const paint = (g, c) => { const n = g.attributes.position.count, a = new Float32Array(n * 3), col = new THREE.Color(c); for (let i = 0; i < n; i++) { a[i * 3] = col.r; a[i * 3 + 1] = col.g; a[i * 3 + 2] = col.b; } g.setAttribute('color', new THREE.BufferAttribute(a, 3)); return g; };
const part = (g, x, y, z, c) => paint(g.translate(x, y, z), c);
const hash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; };
const TINT = [0xffffff, 0xe0d0c0, 0xc0d0e0, 0xd0e0c0, 0xe0c0d0], COP = 0x6070a0;

export function createGtaCorpses({ api }) {
    const parts = [
        part(new THREE.BoxGeometry(0.15, 0.8, 0.17), -0.1, 0.4, 0, 0x6a7a9a), part(new THREE.BoxGeometry(0.15, 0.8, 0.17), 0.1, 0.4, 0, 0x6a7a9a),   // nogi
        part(new THREE.BoxGeometry(0.44, 0.6, 0.22), 0, 1.1, 0, 0xb8b8c0),   // tułów
        part(new THREE.BoxGeometry(0.1, 0.56, 0.11), -0.28, 1.05, 0, 0xb8b8c0), part(new THREE.BoxGeometry(0.1, 0.56, 0.11), 0.28, 1.05, 0, 0xb8b8c0),   // ręce
        part(new THREE.SphereGeometry(0.13, 10, 8), 0, 1.55, 0, 0xd8b090)   // głowa
    ];
    const geo = mergeGeometries(parts.map(g => g.toNonIndexed())); for (const g of parts) g.dispose();
    const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, metalness: 0.05 });
    const bodies = new THREE.InstancedMesh(geo, mat, DL.DMG.MAX_CORPSES + DL.DMG.MAX_PEDS);
    const pgeo = new THREE.CircleGeometry(1, 24); pgeo.rotateX(-Math.PI / 2);
    const pmat = new THREE.MeshBasicMaterial({ color: 0x3e0505, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    const pools = new THREE.InstancedMesh(pgeo, pmat, DL.DMG.MAX_CORPSES + DL.DMG.MAX_PEDS);
    for (const m of [bodies, pools]) { m.frustumCulled = false; m.count = 0; m.visible = false; L.root.add(m); }
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), qx = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3(), c = new THREE.Color(), ax = new THREE.Vector3(1, 0, 0), ay = new THREE.Vector3(0, 1, 0);
    let list = [], hidden = new Set();
    function spawn(id, x, z, o) {
        const op = o || {}, cp = DL.newCorpse(id, x, z, { kind: op.kind, yaw: op.yaw, gore: api.gore ? api.gore() : true });
        list = DL.addCorpse(list, cp);
    }
    function update(dt) {
        list = DL.stepCorpses(list, dt);
        let nb = 0, np = 0; const nowHidden = new Set();
        for (const cp of list) {
            const st = DL.corpseState(cp), ang = st.fall * Math.PI / 2;
            qx.setFromAxisAngle(ax, -ang); q.setFromAxisAngle(ay, cp.yaw + Math.PI).multiply(qx);   // głową od strzelca, przodem do góry
            p.set(cp.x, 0.11 * Math.sin(ang), cp.z); s.setScalar(Math.max(0.001, st.scale));
            bodies.setMatrixAt(nb, m4.compose(p, q, s)); bodies.setColorAt(nb, c.set(cp.kind === 'cop' ? COP : TINT[hash(cp.id) % TINT.length])); nb++;
            if (st.pool > 0.01) { const pl = DL.poolSpot(cp, st); q.setFromAxisAngle(ay, cp.yaw); p.set(pl.x, 0.035, pl.z); s.set(Math.max(0.001, pl.rx), 1, Math.max(0.001, pl.rz)); pools.setMatrixAt(np++, m4.compose(p, q, s)); }
            if (st.avatarHidden && cp.kind === 'player') nowHidden.add(cp.id);
        }
        bodies.count = nb; bodies.visible = nb > 0; bodies.instanceMatrix.needsUpdate = true; if (bodies.instanceColor) bodies.instanceColor.needsUpdate = true;
        pools.count = np; pools.visible = np > 0; pools.instanceMatrix.needsUpdate = true;
        if (api.dead) { for (const id of nowHidden) if (!hidden.has(id)) api.dead(id, true); for (const id of hidden) if (!nowHidden.has(id)) api.dead(id, false); }
        hidden = nowHidden;
    }
    return {
        spawn, update,
        count: () => list.length,
        debug: () => ({ n: list.length, bodies: bodies.count, pools: pools.count, hidden: Array.from(hidden), ids: list.map(x => x.id), parent: bodies.parent === L.root, ages: list.map(x => +x.age.toFixed(2)) }),
        dispose() { if (api.dead) for (const id of hidden) api.dead(id, false); hidden.clear(); list = []; for (const m of [bodies, pools]) { m.removeFromParent(); m.dispose(); } geo.dispose(); mat.dispose(); pgeo.dispose(); pmat.dispose(); }
    };
}
