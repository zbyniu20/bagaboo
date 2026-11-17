// ==========================================
// MANEKIN TRENINGOWY (lobby): cel dla młotków ekipy, głównie do sprawdzenia Nothing Hammer (Gooby) bez drugiego gracza.
// Działa także solo. Trafiony kołysze się na sprężynie; Nothing Hammer pokazuje na jego twarzy Gooby'ego i odpala TWÓJ podgląd jumpscare'a
// (to, co widziałby trafiony gracz). Kick i Ban młotek nic mu nie robią, tylko go kołyszą. Tablica obok liczy trafienia.
// Rejestruje się w L.hammerTargets (core/engine.js), a trafienia obsługuje core/hammer.js.
// ==========================================
import { THREE, CANNON, L, addStaticBody, addBlobAO } from './engine.js';
import * as T from './textures.js';
import { goobyTexture } from './gooby.js';
import { toast } from './terminal.js';
import * as N from './network.js';

const GOOBY_COOL = 3.2;   // jumpscare trwa 1,4 s: ponowny podgląd dopiero po chwili
let D = null;

// Tarcza w kołach (czerwono-białe), do namalowania na piersi, głowie i podstawie
function bullseye(size, rings, bg) {
    const c = T.makeCanvas(size, size), x = c.getContext('2d'), h = size / 2;
    x.fillStyle = bg || '#e8dcc8'; x.fillRect(0, 0, size, size);
    for (let i = rings; i >= 1; i--) { x.fillStyle = i % 2 ? '#c01818' : '#f4ecdc'; x.beginPath(); x.arc(h, h, h * i / rings, 0, Math.PI * 2); x.fill(); }
    x.fillStyle = '#7a0808'; x.beginPath(); x.arc(h, h, h / (rings * 2.6), 0, Math.PI * 2); x.fill();
    return T.toTex(c, false);
}
function signTexture(hits, last) {
    const c = T.makeCanvas(512, 256), x = c.getContext('2d');
    x.fillStyle = '#16100c'; x.fillRect(0, 0, 512, 256);
    x.strokeStyle = '#ff7ad9'; x.lineWidth = 8; x.strokeRect(10, 10, 492, 236);
    x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillStyle = '#ffd0f0'; x.font = 'bold 50px sans-serif'; x.fillText('TRAINING DUMMY', 256, 62);
    x.fillStyle = '#e8d8c8'; x.font = '26px sans-serif'; x.fillText('Staff hammers only. Swing the Nothing', 256, 118); x.fillText('Hammer to see the Gooby jumpscare.', 256, 150);
    x.fillStyle = '#ffb030'; x.font = 'bold 38px monospace'; x.fillText('Hits: ' + hits, 256, 200);
    if (last) { x.fillStyle = last.color; x.font = 'bold 22px sans-serif'; x.fillText(last.text, 256, 232); }
    return T.toTex(c, false);
}

export function buildTrainingDummy(x, z, rotY) {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rotY || 0; L.root.add(g);
    const wood = new THREE.MeshStandardMaterial({ color: 0x6a4a30, roughness: 0.8 }), cloth = new THREE.MeshStandardMaterial({ color: 0xc8b890, roughness: 1 });
    // Podstawa z tarczą i słup, na którym stoi kołyszący się korpus
    const baseTex = bullseye(256, 5);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.75, 0.12, 28), [new THREE.MeshStandardMaterial({ color: 0x3a2a20, roughness: 0.7 }), new THREE.MeshStandardMaterial({ map: baseTex, roughness: 0.6 }), new THREE.MeshStandardMaterial({ color: 0x3a2a20 })]);
    base.position.y = 0.06; base.receiveShadow = true; g.add(base);
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.95, 10), wood); post.position.y = 0.55; g.add(post);
    // Korpus na zawiasie w biodrach (y = 0.9): kołysze się po uderzeniu
    const tilt = new THREE.Group(); tilt.position.y = 0.9; g.add(tilt);
    const chestTex = bullseye(256, 4);
    const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.22, 0.72, 20), cloth);
    torso.position.y = 0.42; torso.castShadow = true; tilt.add(torso);
    const decal = new THREE.Mesh(new THREE.CircleGeometry(0.2, 28), new THREE.MeshStandardMaterial({ map: chestTex, roughness: 0.9 })); decal.position.set(0, 0.5, 0.262); tilt.add(decal);   // tarcza na piersi
    for (const s of [-1, 1]) { const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.075, 0.5, 4, 10), cloth); arm.position.set(s * 0.38, 0.5, 0.02); arm.rotation.z = s * -0.25; arm.castShadow = true; tilt.add(arm); }
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 0.14, 10), cloth); neck.position.y = 0.84; tilt.add(neck);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.19, 20, 14), new THREE.MeshStandardMaterial({ color: 0xd8c8a0, roughness: 0.9 })); head.position.y = 1.05; head.castShadow = true; tilt.add(head);
    const face = new THREE.Mesh(new THREE.CircleGeometry(0.15, 24), new THREE.MeshStandardMaterial({ map: bullseye(128, 3), roughness: 0.8 })); face.position.set(0, 1.05, 0.185); tilt.add(face);
    // Gooby na twarzy tylko po trafieniu Nothing Hammerem
    const goo = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.4), new THREE.MeshBasicMaterial({ map: goobyTexture(), transparent: true, toneMapped: false })); goo.position.set(0, 1.05, 0.22); goo.visible = false; tilt.add(goo);
    // Tablica na słupku obok
    const sPost = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.6, 8), wood); sPost.position.set(1.15, 0.8, 0.1); g.add(sPost);
    const signMat = new THREE.MeshBasicMaterial({ map: signTexture(0), toneMapped: false });
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 0.5), signMat); sign.position.set(1.15, 1.75, 0.14); g.add(sign);
    const sBack = new THREE.Mesh(new THREE.BoxGeometry(1.04, 0.54, 0.04), new THREE.MeshStandardMaterial({ color: 0x1a120c })); sBack.position.set(1.15, 1.75, 0.1); g.add(sBack);
    const lamp = new THREE.PointLight(0xffd0f0, 5, 5, 2); lamp.position.set(0.5, 2.3, 0.8); g.add(lamp);
    addStaticBody(x, 0.5, z, new CANNON.Box(new CANNON.Vec3(0.35, 0.5, 0.35)), g, false);   // podstawa i dolna część: nie da się przez nią przejść
    addBlobAO(x, z, 1.6);
    L.reserved.push([x, z, 2.4]);
    D = { g: g, tilt: tilt, goo: goo, signMat: signMat, hits: 0, last: null, ax: 0, az: 0, vx: 0, vz: 0, gooT: 0, cool: 0, chest: new THREE.Vector3(x, 1.5, z) };
    // Cel dla młotków: środek korpusu i głowy (promień obejmuje oba)
    L.hammerTargets.push({ chest: D.chest, r: 0.75, hit: hitDummy });
    return D;
}

function setSign(text, color) {
    D.last = text ? { text: text, color: color } : null;
    if (D.signMat.map) D.signMat.map.dispose();
    D.signMat.map = signTexture(D.hits, D.last); D.signMat.needsUpdate = true;
}
function hitDummy(tool, headPos) {
    if (!D) return;
    D.hits++;
    // Kierunek uderzenia w układzie manekina: popchnięcie od młotka
    const dx = D.chest.x - headPos.x, dz = D.chest.z - headPos.z, len = Math.hypot(dx, dz) || 1, c = Math.cos(-D.g.rotation.y), s = Math.sin(-D.g.rotation.y);
    const lx = (dx / len) * c + (dz / len) * s, lz = -(dx / len) * s + (dz / len) * c, K = tool === 'gooby' ? 7 : 5;
    D.vx += lz * K; D.vz -= lx * K;
    if (tool === 'gooby') {
        D.goo.visible = true; D.gooT = 1.3;
        toast('GOOBY! Training dummy hit (' + D.hits + ')', '#ff7ad9');
        setSign('Last hit: Nothing Hammer', '#ff7ad9');
        if (D.cool <= 0) { D.cool = GOOBY_COOL; N.triggerGooby(); }   // podgląd tego, co widzi trafiony gracz
    } else {
        toast('The dummy does not care about the ' + (tool === 'ban' ? 'Ban' : 'Kick') + ' hammer. Try the Nothing Hammer.', '#ffb030');
        setSign('Last hit: ' + (tool === 'ban' ? 'Ban' : 'Kick') + ' hammer (no effect)', '#ffb030');
    }
}

export function updateTrainingDummy(dt) {
    if (!D) return;
    const k = 38, c = 3.4, h = Math.min(dt, 0.05);   // sprężyna z tłumieniem
    D.vx += (-k * D.ax - c * D.vx) * h; D.vz += (-k * D.az - c * D.vz) * h;
    D.ax = Math.max(-0.7, Math.min(0.7, D.ax + D.vx * h)); D.az = Math.max(-0.7, Math.min(0.7, D.az + D.vz * h));
    D.tilt.rotation.x = D.ax; D.tilt.rotation.z = D.az;
    if (D.gooT > 0) { D.gooT -= dt; if (D.gooT <= 0) D.goo.visible = false; }
    D.cool -= dt;
}
export function disposeTrainingDummy() { D = null; }
