// ==========================================
// DUCH NAJLEPSZEGO PRZEJŚCIA I WSPÓLNE POMOCNIKI TRUDNOŚCI
// Podczas biegu zapisujemy pozycję gracza co 0,25 s. Gdy bieg bije rekord, trafia do localStorage (osobno od
// podpisanego zapisu, bo to tylko ozdoba) i przy następnym wejściu półprzezroczysty "duch" powtarza ten bieg.
// Easy nie liczy się do rekordów, więc nie ma tam ducha.
// ==========================================
import { THREE, L } from './engine.js';
import { getDiff, recordKey, fmtDuration } from './economy.js';
import { toast } from './terminal.js';

const KEY = 'bagaboo_ghosts_v1', STEP = 0.25, MAX_SAMPLES = 2400, Q = 20;   // maks. 10 minut, pozycje co 5 cm
function readAll() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } }
function writeAll(m) { try { localStorage.setItem(KEY, JSON.stringify(m)); } catch (e) {} }

const NOOP = { tick() {}, reset() {}, finish() {}, dispose() {} };

// level: id poziomu (maze, well...). Zwraca obiekt z tick(dt, pozycja, active), reset(), finish(isRecord, czas), dispose().
export function createGhost(level) {
    if (getDiff(level) === 'easy') return NOOP;
    const key = recordKey(level), best = readAll()[key];
    let rec = [], recT = 0, playT = 0, started = false, done = false, saved = false;
    let mesh = null, yaw = 0;
    if (best && best.d && best.d.length >= 6) {
        const mat = new THREE.MeshBasicMaterial({ color: 0x7fe8ff, transparent: true, opacity: 0.38, depthWrite: false, toneMapped: false });
        mesh = new THREE.Group();
        const body = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.24, 0.95, 10), mat); body.position.y = 0.55; mesh.add(body);
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 10), mat); head.position.y = 1.22; mesh.add(head);
        const lamp = new THREE.PointLight(0x7fe8ff, 3, 5, 2); lamp.position.y = 1.0; mesh.add(lamp);
        mesh.visible = false; mesh.userData.mat = mat; L.root.add(mesh);
    }
    function sample(i) {
        const n = best.d.length / 3, k = Math.max(0, Math.min(n - 1, i)), o = k * 3;
        return [best.d[o] / Q, best.d[o + 1] / Q, best.d[o + 2] / Q];
    }
    return {
        tick(dt, pos, active) {
            if (done) return;
            if (active) {
                if (!started) { started = true; if (mesh) toast('Ghost: your best run ' + fmtDuration(best.t * 1000), '#7fe8ff'); }
                recT += dt; playT += dt;
                while (recT >= STEP && rec.length < MAX_SAMPLES * 3) { recT -= STEP; rec.push(Math.round(pos.x * Q), Math.round(pos.y * Q), Math.round(pos.z * Q)); }
            }
            if (!mesh || !started) return;
            const f = playT / STEP, i = Math.floor(f), a = sample(i), b = sample(i + 1), k = f - i;
            const x = a[0] + (b[0] - a[0]) * k, y = a[1] + (b[1] - a[1]) * k, z = a[2] + (b[2] - a[2]) * k;
            if (Math.hypot(b[0] - a[0], b[2] - a[2]) > 0.02) yaw = Math.atan2(b[0] - a[0], b[2] - a[2]);
            mesh.position.set(x, y - 0.35, z); mesh.rotation.y = yaw;
            const finished = playT / STEP >= best.d.length / 3 - 1;
            mesh.visible = !finished;
            const d = Math.hypot(pos.x - x, pos.z - z); mesh.userData.mat.opacity = d < 1.2 ? 0.12 : 0.38;   // przy graczu robi się prawie niewidoczny
        },
        // Po śmierci i szybkim restarcie bieg zaczyna się od nowa
        reset() { rec = []; recT = 0; playT = 0; started = false; if (mesh) mesh.visible = false; },
        // Przy nowym rekordzie zapisujemy nagrany bieg jako nowego ducha
        finish(isRecord, sec) {
            done = true; if (mesh) mesh.visible = false;
            if (!isRecord || saved || rec.length < 6 || rec.length >= MAX_SAMPLES * 3) return;
            saved = true;
            const m = readAll(); m[key] = { t: Math.round(sec * 10) / 10, d: rec }; writeAll(m);
        },
        dispose() { if (mesh) { L.root.remove(mesh); mesh = null; } }
    };
}
