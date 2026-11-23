// ==========================================
// AKUSTYKA (3D): pogłos liczony z geometrii poziomu i okluzja dźwięku za ścianami. Logika w core/acousticlogic.js.
// updateAcoustics(dt) woła main.js co klatkę. Wszystko lokalne: nic nie idzie przez sieć.
// ==========================================
import { THREE, L, camera } from './engine.js';
import { LEVEL_DEFS } from './registry.js';
import { tuneRoom, setOcclusion } from './audio.js';
import { freeDistances, roomFromRays, blendRoom, smoothRoom, blockCount, occlusionFor } from './acousticlogic.js';

const _p = { x: 0, y: 0, z: 0 }, _w = new THREE.Vector3();
let cur = null, acc = 0, lastLevel = null;
const boxes = () => { const out = []; for (const o of L.obstacles) if (o.box3) out.push(o.box3); return out; };
const baseOf = (id) => { const d = LEVEL_DEFS.find(x => x.id === id); return d && d.room ? d.room : { sec: 1.4, wet: 0.1 }; };
function listener() { camera.getWorldPosition(_w); _p.x = _w.x; _p.y = _w.y; _p.z = _w.z; return _p; }
// Okluzja źródła w punkcie pos: 0 (widać) .. 0,9 (za kilkoma ścianami)
function occludeAt(pos) { return occlusionFor(blockCount(listener(), pos, boxes())); }
setOcclusion(occludeAt);
export function updateAcoustics(dt) {
    if (L.levelId !== lastLevel) { lastLevel = L.levelId; cur = null; acc = 1; }   // nowy poziom: zmierz od razu
    acc += dt; if (acc < 0.4) return; const step = acc; acc = 0;
    const bs = boxes(); if (!bs.length) return;
    const target = blendRoom(baseOf(L.levelId), roomFromRays(freeDistances(listener(), bs)));
    cur = cur ? smoothRoom(cur, target, step) : target;
    tuneRoom(cur.sec, cur.wet);
}
export function debugAcoustics() { return { room: cur, boxes: boxes().length, occ: (pos) => occludeAt(pos) }; }
