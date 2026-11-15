// ==========================================
// GAME MODE: TOWER CLIMB (wejście z salonu BagaBoo Games, grupa RACE & SKILL)
// Wspinaczka wąskim szybem po uchwytach na ścianach (jak w Studni), a od dołu po kilku sekundach zaczyna wzbierać maź, coraz szybciej.
// Kto pierwszy dotrze na górę, wygrywa 200 Bagabucks (2+ osoby). Maź cię złapie: lądujesz na najbliższej półce nad nią, a maź opada o 5 m.
// Solo: próba czasowa z czasem wzorcowym, rekordem i duchem. Układ uchwytów jest stały (ten sam u wszystkich). Rundy: core/racemode.js.
// ==========================================
import { THREE, L, addCrispBlock, addStaticBody, CANNON } from '../core/engine.js';
import * as T from '../core/textures.js';
import { createRaceMode } from '../core/racemode.js';
import { makeOozeMaterial } from '../core/liquids.js';
import { setPlayerPosition } from '../core/player.js';
import { toast } from '../core/terminal.js';
import { ARRIVAL_FROM_TOWERCLIMB } from './games.js';

const HS = 3.4, TOP = 38;                    // pół szerokości szybu i wysokość mety
const LEDGE_EVERY = 8;                       // półka do odpoczynku (i ratunku przed mazią) co tyle metrów
const OOZE = { start: -1.5, delay: 8, speed: 0.10, accel: 0.00045, drop: 5 };   // maź: poziom początkowy, opóźnienie, prędkość, przyspieszenie, o ile opada po złapaniu
const WALL_GRIP = 0.75, HOLD_GRIP = 1.0;     // ściana lekko śliska, uchwyty trzymają

const setGrip = (g) => { const o = L.obstacles[L.obstacles.length - 1]; if (o) o.grip = g; return o; };
const wallPos = (side, t, y, out) => side === 0 ? [t, y, -HS + out] : side === 1 ? [t, y, HS - out] : side === 2 ? [-HS + out, y, t] : [HS - out, y, t];

const mode = createRaceMode({
    id: 'towerclimb', name: 'Tower Climb', color: '#7fe8a0',
    spawn: [0, 1.0, -0.4], startSpread: 3, arrival: ARRIVAL_FROM_TOWERCLIMB,
    bounds: { minX: -HS + 0.2, maxX: HS - 0.2, minZ: -HS + 0.2, maxZ: HS - 0.2, maxY: TOP + 3 },
    moveScale: 1.0, maxUp: 6.5, extraGravity: -3.0,     // lżejsza grawitacja jak w Studni
    par: 120, roundMax: 215, reward: 200, respawn: 'none', fallY: null,
    door: { x: 0, y: 0, z: HS - 0.03, rotY: Math.PI },
    introStyle: { bg: 'rgba(4,18,10,0.9)', border: '#7fe8a0', title: '#d8ffe4', text: '#dcf0e0', footer: '#ffb030', size: 29 },
    introLines: ['Climb the shaft by pushing off the holds on its walls. The walls are a bit slippery, the holds are safe.', 'Ooze starts rising from below after a few seconds, faster and faster. Stay above it!', 'If it catches you, you land on the nearest ledge above it and the ooze drops 5 m.', 'First to the top wins 200 Bagabucks.'],
    hud: { bg: 'rgba(4,18,10,0.72)', ink: '#d8ffe4' }, fallsLabel: 'Caught', caughtText: 'The ooze got you!',
    build(S) {
        const R = T.mkRng(5151);
        // Szyb: podłoga, strop i cztery ściany (lekko śliskie)
        addCrispBlock(0, -0.5, 0, HS * 2 + 2, 1, HS * 2 + 2, 0x4a5048, 0x101810);
        addCrispBlock(0, TOP + 4.5, 0, HS * 2 + 2, 1, HS * 2 + 2, 0x2a3028, 0x101810);
        for (const [x, z, w, d] of [[0, -HS - 0.5, HS * 2 + 2, 1], [0, HS + 0.5, HS * 2 + 2, 1], [-HS - 0.5, 0, 1, HS * 2], [HS + 0.5, 0, 1, HS * 2]]) { addCrispBlock(x, (TOP + 5) / 2, z, w, TOP + 5, d, 0x3a4438, 0x101810); setGrip(WALL_GRIP); }
        S.ledges = [];
        const boneMat = new THREE.MeshStandardMaterial({ color: 0xcfc2a8, roughness: 0.75 }), ledgeMat = new THREE.MeshStandardMaterial({ color: 0x5a6a52, roughness: 0.8 });
        let y = 1.0, lastSide = -1, nextLedge = LEDGE_EVERY, k = 0;
        while (y < TOP - 2.5) {
            if (y >= nextLedge) {   // półka odpoczynkowa na kolejnej ścianie
                const side = (k++ % 3) + 0, sd = side === 1 ? 3 : side;   // omija stronę drzwi (z = +HS)
                const p = wallPos(sd, 0, y, 0.55), horiz = sd < 2;
                const m = addCrispBlock(p[0], p[1], p[2], horiz ? 3.0 : 1.1, 0.22, horiz ? 1.1 : 3.0, 0x5a6a52, 0x0a100a); setGrip(HOLD_GRIP); void m;
                S.ledges.push({ x: p[0] + (sd === 2 ? 0.3 : sd === 3 ? -0.3 : 0), y: y + 0.11, z: p[2] + (sd === 0 ? 0.3 : 0) });
                nextLedge += LEDGE_EVERY; lastSide = sd;
            }
            const n = 1 + (R() < 0.35 ? 1 : 0);
            for (let i = 0; i < n; i++) {
                let side = (R() * 4) | 0; if (side === lastSide) side = (side + 1 + ((R() * 3) | 0)) % 4;
                if (y < 3 && side === 1) side = 0;   // nie zasłaniaj drzwi na dole
                lastSide = side;
                const t = (R() * 2 - 1) * (HS - 0.6), p = wallPos(side, t, y, 0.3), horiz = side < 2, w = 0.9, d = 0.6;
                const geo = new THREE.BoxGeometry(horiz ? w : d, 0.22, horiz ? d : w);
                const m = new THREE.Mesh(geo, boneMat); m.position.set(p[0], p[1], p[2]); m.castShadow = true; L.root.add(m);
                addStaticBody(p[0], p[1], p[2], new CANNON.Box(new CANNON.Vec3((horiz ? w : d) / 2, 0.11, (horiz ? d : w) / 2)), m, false); setGrip(HOLD_GRIP);
            }
            y += 0.85 + R() * 0.35;
        }
        void ledgeMat;
        // Meta: szeroka półka pod stropem przy północnej ścianie
        addCrispBlock(0, TOP - 0.1, -HS + 1.0, HS * 2 - 0.4, 0.2, 2.0, 0x6a5a2a, 0xffd23a); setGrip(HOLD_GRIP);
        const fc = T.makeCanvas(512, 128), g = fc.getContext('2d');
        g.fillStyle = '#ffd23a'; g.fillRect(0, 0, 512, 128);
        for (let i = 0; i < 16; i++) for (let j = 0; j < 4; j++) if ((i + j) % 2) { g.fillStyle = '#101010'; g.fillRect(i * 32, j * 32, 32, 32); }
        g.fillStyle = 'rgba(0,0,0,0.6)'; g.fillRect(96, 32, 320, 64); g.fillStyle = '#ffffff'; g.font = 'bold 52px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('FINISH', 256, 66);
        const banner = new THREE.Mesh(new THREE.PlaneGeometry(5.4, 1.35), new THREE.MeshBasicMaterial({ map: T.toTex(fc, false), toneMapped: false })); banner.position.set(0, TOP + 1.6, -HS + 0.15); L.root.add(banner);
        // Maź (rośnie od dołu) i światła
        S.oozeMesh = new THREE.Mesh(new THREE.PlaneGeometry(HS * 2 - 0.1, HS * 2 - 0.1), makeOozeMaterial()); S.oozeMesh.rotation.x = -Math.PI / 2; S.oozeMesh.position.y = OOZE.start; L.root.add(S.oozeMesh);
        S.ooze = OOZE.start; S.oozeDrop = 0;
        const moon = new THREE.PointLight(0xa8c8ff, 40, 34, 1.6); moon.position.set(0, TOP + 2, 0); L.root.add(moon);
        for (let ly = 6; ly < TOP; ly += 9) { const l = new THREE.PointLight(0x9affc0, 12, 12, 2); l.position.set(0, ly, 0); L.root.add(l); }
        return { finish: (p) => p.y > TOP - 0.3 && p.z < -HS + 2.4, exit: { x: -HS + 0.03, y: TOP, z: -HS + 1.0, rotY: Math.PI / 2 } };   // drzwi EXIT na zachodniej ścianie przy mecie
    },
    onReset(S) { S.oozeDrop = 0; S.ooze = OOZE.start; if (S.oozeMesh) S.oozeMesh.position.y = OOZE.start; },
    frame(S, dt, p, ctx) {
        const t = Math.max(0, S.myT - OOZE.delay);
        S.ooze = OOZE.start + OOZE.speed * t + OOZE.accel * t * t - S.oozeDrop;
        S.oozeMesh.position.y = S.ooze;
        S.extra = 'Height ' + Math.max(0, p.y - 0.35).toFixed(0) + ' / ' + TOP + ' m   Ooze ' + Math.max(0, S.ooze).toFixed(0) + ' m';
        if (p.y - 0.35 < S.ooze) {   // maź złapała gracza: półka nad mazią (jeśli jest), a maź opada
            S.oozeDrop += OOZE.drop;
            const ledge = S.ledges.find(l => l.y > S.ooze + 2.5);
            if (ledge) { setPlayerPosition(ledge.x, ledge.y + 0.9, ledge.z); ctx.body.velocity.set(0, 0, 0); S.falls++; toast('The ooze got you! You land on a ledge above it.', '#ff6a4a'); return null; }
            return 'caught';
        }
        return null;
    }
});
export const info = mode.info, build = mode.build, update = mode.update, dispose = mode.dispose, debug = mode.debug;
