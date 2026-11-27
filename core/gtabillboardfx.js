// ==========================================
// SCARY GTA: BILLBOARDY (3D; układ i teksty w czystym core/gtabillboards.js, testy: tests/logic.mjs). JEDNA scalona siatka z jednym atlasem tekstury 2 x 3 (do 6 neonowych reklam z horrorem, +1 wywołanie
// rysowania), bez kolizji i bez sieci. W blackoucie reklamy gasną razem z neonami miasta i płynnie wracają (bez migotania). Atlas rysowany jest raz przy budowie, a tekstura i geometria są zwalniane w dispose().
// ==========================================
import { THREE, L } from './engine.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { makeCanvas, toTex } from './textures.js';
import * as BBm from './gtabillboards.js';

// o: { buildings, api }; api: { night() -> 'calm'|'blackout'|'horde' }
export function createGtaBillboards(o) {
    const api = o.api, root = L.root, sp = BBm.billboardSpots(o.buildings), cw = 512, ch = 256, B = BBm.BB;
    const c = makeCanvas(cw * B.COLS, ch * B.ROWS), x = c.getContext('2d');
    BBm.ADS.forEach((ad, i) => {
        const col = i % B.COLS, row = Math.floor(i / B.COLS), ox = col * cw, oy = row * ch;
        x.fillStyle = '#07040c'; x.fillRect(ox, oy, cw, ch);
        x.strokeStyle = ad.color; x.lineWidth = 10; x.strokeRect(ox + 12, oy + 12, cw - 24, ch - 24); x.lineWidth = 3; x.strokeRect(ox + 28, oy + 28, cw - 56, ch - 56);
        x.fillStyle = ad.color; x.textAlign = 'center'; x.font = 'bold 76px monospace'; x.fillText(ad.top, ox + cw / 2, oy + 118, cw - 70); x.font = 'bold 40px monospace'; x.fillText(ad.bottom, ox + cw / 2, oy + 186, cw - 70);
        x.fillStyle = 'rgba(0,0,0,0.25)'; for (let yy = oy + 4; yy < oy + ch; yy += 6) x.fillRect(ox, yy, cw, 2);
    });
    const tex = toTex(c, false), geos = [];
    for (const s of sp) {
        const g = new THREE.PlaneGeometry(s.w, s.h), col = s.cell % B.COLS, row = Math.floor(s.cell / B.COLS), uv = g.attributes.uv;
        const u0 = col / B.COLS, u1 = (col + 1) / B.COLS, v1 = 1 - row / B.ROWS, v0 = 1 - (row + 1) / B.ROWS;
        for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) < 0.5 ? u0 : u1, uv.getY(i) < 0.5 ? v0 : v1);
        g.rotateY(s.yaw); g.translate(s.x, s.y, s.z); geos.push(g);
    }
    const geo = geos.length ? mergeGeometries(geos) : new THREE.BufferGeometry(); for (const g of geos) g.dispose();
    const m = new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }), mesh = new THREE.Mesh(geo, m); mesh.visible = sp.length > 0; root.add(mesh);
    let k = 1;
    function update(dt) { const target = api.night() === 'blackout' ? 0.06 : 1; k += Math.max(-1.5 * dt, Math.min(1.5 * dt, target - k)); m.color.setScalar(k); }
    return {
        update, spots: sp,
        debug: () => ({ n: sp.length, k: +k.toFixed(3), visible: mesh.visible, parent: mesh.parent === root }),
        dispose() { mesh.removeFromParent(); geo.dispose(); m.dispose(); tex.dispose(); }
    };
}
