// ==========================================
// DODATEK DO LOBBY: tor przeszkód i drzwi do labiryntu
// Droga: spiralne schody -> skok na platformę -> wąska kładka -> półka przy zachodniej ścianie -> drzwi.
// Spadek oznacza powrót na podłogę i wspinaczkę od nowa.
// ==========================================
import { THREE, L, tex, addCrispBlock, addStaticBody, CANNON } from '../core/engine.js';
import { LP } from '../core/config.js';
import * as T from '../core/textures.js';
import { toast } from '../core/terminal.js';

const DOOR_Z = -11.7, LEDGE_TOP = 16.45;
export const ARRIVAL = [-13.9, 17.0, DOOR_Z];   // tu pojawia się gracz po powrocie z labiryntu

export function build() {
    // Przeszkody (szczyt spiralnych schodów jest na wysokości ok. 15.5 m)
    addCrispBlock(-10.5, 15.75, -10.0, 1.1, 0.25, 1.1, 0x6a3030, 0xff2000);   // platforma za szczytem schodów
    addCrispBlock(-12.25, 15.95, -10.0, 1.0, 0.2, 0.3, 0x4a4a4a, 0xff2000);   // wąska kładka
    addCrispBlock(-14.0, 16.3, DOOR_Z, 1.8, 0.3, 2.4, 0x5a5a5a, 0xff3010);    // półka przy ścianie

    // Drzwi w zachodniej ścianie (patrzą na wschód, w stronę pokoju)
    const g = new THREE.Group(); g.position.set(-14.97, LEDGE_TOP, DOOR_Z); g.rotation.y = Math.PI / 2; L.root.add(g);
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x1c1416, metalness: 0.7, roughness: 0.45, envMapIntensity: LP.envIntensity });
    const add = (geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; g.add(m); return m; };
    add(new THREE.BoxGeometry(0.14, 2.45, 0.12), frameMat, -0.72, 1.22, 0.04);
    add(new THREE.BoxGeometry(0.14, 2.45, 0.12), frameMat, 0.72, 1.22, 0.04);
    add(new THREE.BoxGeometry(1.58, 0.16, 0.12), frameMat, 0, 2.38, 0.04);
    // Skrzydło drzwi z rdzą i krwawym odciskiem dłoni
    const dc = T.makeCanvas(256, 512), dx = dc.getContext('2d'), R = T.mkRng(4040);
    dx.fillStyle = '#3a1612'; dx.fillRect(0, 0, 256, 512);
    for (let i = 0; i < 4000; i++) { dx.fillStyle = 'rgba(' + (R() > 0.5 ? '120,60,20' : '0,0,0') + ',' + (R() * 0.25) + ')'; dx.fillRect(R() * 256, R() * 512, 2, 2); }
    dx.strokeStyle = 'rgba(0,0,0,0.6)'; dx.lineWidth = 6; dx.strokeRect(24, 30, 208, 200); dx.strokeRect(24, 270, 208, 210);
    T.handPrint(dx, 140, 250, 1.1, 0.2, R);
    dx.fillStyle = '#c8a040'; dx.beginPath(); dx.arc(210, 270, 10, 0, 7); dx.fill();
    const doorTex = T.toTex(dc, false);
    add(new THREE.BoxGeometry(1.3, 2.3, 0.06), new THREE.MeshStandardMaterial({ map: doorTex, bumpMap: doorTex, bumpScale: 1, roughness: 0.6, metalness: 0.3, envMapIntensity: LP.envIntensity }), 0, 1.15, 0.0);
    // Czerwona poświata spod drzwi
    const leak = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 0.05), new THREE.MeshBasicMaterial({ color: 0xff2a10 })); leak.position.set(0, 0.03, 0.035); g.add(leak);
    // Napis nad drzwiami
    const sc = T.makeCanvas(512, 128), sx = sc.getContext('2d');
    sx.fillStyle = '#0c0404'; sx.fillRect(0, 0, 512, 128);
    sx.font = 'bold 70px serif'; sx.textAlign = 'center'; sx.textBaseline = 'middle'; sx.shadowColor = '#ff2a10'; sx.shadowBlur = 26; sx.fillStyle = '#ff6a40';
    sx.fillText('THE MAZE', 256, 66);
    const signTex = new THREE.CanvasTexture(sc); signTex.colorSpace = THREE.SRGBColorSpace;
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.38), new THREE.MeshBasicMaterial({ map: signTex, toneMapped: false })); sign.position.set(0, 2.72, 0.06); g.add(sign);
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex.dot, color: 0xff3010, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.55 }));
    glow.scale.set(3.2, 1.6, 1); glow.position.set(0, 2.72, 0.2); g.add(glow);
    addStaticBody(-14.9, LEDGE_TOP + 1.2, DOOR_Z, new CANNON.Box(new CANNON.Vec3(0.08, 1.2, 0.8)), g, false);

    // Przejście: wejście w drzwi przenosi do labiryntu
    L.portals.push({
        box3: new THREE.Box3(new THREE.Vector3(-15.2, LEDGE_TOP - 0.2, DOOR_Z - 0.7), new THREE.Vector3(-14.25, LEDGE_TOP + 2.4, DOOR_Z + 0.7)),
        target: 'maze', spawn: null,
        onEnter: () => toast('You open the door...', '#ff6a40')
    });
}
export function update() {}
