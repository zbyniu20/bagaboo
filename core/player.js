// ==========================================
// GRACZ: ruch rękami, kolizje, anty-ślizg, chwytanie piłek i lin, dłonie
// ==========================================
import { THREE, CANNON, scene, camera, playerRig, renderer, world, L, GROUP, physicsMat, containBall } from './engine.js';
import { createRealHand, poseHand } from './avatar.js';
import { track } from './economy.js';
import { initPointers, clickPointer } from './terminal.js';
import { sendObjectMove } from './network.js';

const radius = 0.35, gorillaStanceOffset = 0.6;
const POWER = 1.2;            // siła odepchnięcia i skoku (1.0 = oryginał)
const HEAD_RADIUS = 0.18;     // kolizja głowy
const FRICTION_IDLE = 0.15;   // hamowanie, gdy stoisz (mniej = mocniej)
const FRICTION_PUSH = 0.85;   // hamowanie w trakcie odpychania się ręką
const FRICTION_RUN = 0.93;    // krótki rozpęd między machnięciami podczas biegu
const MOMENTUM_TIME = 0.15;   // ile sekund trwa rozpęd po mocnym machnięciu
const RUN_MIN_SPEED = 0.7;    // minimalna prędkość ręki (m/s), żeby liczyć to jako bieg
const RUN_BOOST_RATE = 0.7, RUN_BOOST_MAX = 1.0;
const HAND_DEADZONE = 0.006;  // drżenie ręki poniżej tej wartości nie popycha gracza

export const playerBody = new CANNON.Body({ mass: 50, shape: new CANNON.Sphere(radius), material: physicsMat, position: new CANNON.Vec3(0, 2, 0), fixedRotation: true, collisionFilterGroup: GROUP.PLAYER, collisionFilterMask: 0 });
world.addBody(playerBody);

export const controllers = [renderer.xr.getController(0), renderer.xr.getController(1)];
controllers.forEach(c => playerRig.add(c));
initPointers(controllers);

export const hands = { L: null, R: null };
export function buildHands(look) {
    if (hands.L) scene.remove(hands.L);
    if (hands.R) scene.remove(hands.R);
    hands.L = createRealHand(true, look); hands.R = createRealHand(false, look);
    scene.add(hands.L); scene.add(hands.R);
}
export function setPlayerPosition(x, y, z) {
    playerBody.position.set(x, y, z); playerBody.velocity.set(0, 0, 0);
    prevLocal[0].set(0, 0, 0); prevLocal[1].set(0, 0, 0);
}

let grounded = false, handPushing = false, stepped = false, simTime = 0, lastPushTime = -10, lastTrampTime = -10;
let grabbed = null, grabbingIndex = -1, ropeConstraint = null, ropeHand = -1;
const wasTouch = [false, false], lastSpd = [0, 0], lastScrape = [0, 0];
const prevLocal = [new THREE.Vector3(), new THREE.Vector3()];
const ctrlInput = [{ squeeze: false, select: false }, { squeeze: false, select: false }];
const hit = { nx: 0, ny: 0, nz: 0, depth: 0 };

controllers.forEach((c, i) => {
    c.addEventListener('selectstart', () => { ctrlInput[i].select = true; clickPointer(i); });
    c.addEventListener('selectend', () => { ctrlInput[i].select = false; });
    c.addEventListener('squeezestart', () => { ctrlInput[i].squeeze = true; onSqueezeStart(i); });
    c.addEventListener('squeezeend', () => { ctrlInput[i].squeeze = false; onSqueezeEnd(i); });
});

function onSqueezeStart(i) {
    const hand = i === 0 ? hands.L : hands.R; if (!hand) return;
    const pos = new THREE.Vector3(); hand.getWorldPosition(pos);
    for (const ball of L.throwables) {
        if (ball.position.distanceTo(pos) < 0.3) {
            grabbed = ball; grabbingIndex = i; L.heldId = ball.userData.id;
            const b = ball.userData.body; b.type = CANNON.Body.KINEMATIC; b.velocity.set(0, 0, 0); b.angularVelocity.set(0, 0, 0);
            return;
        }
    }
    // Lina: chwyt drugą ręką wyżej przenosi uchwyt, ciągnięcie ręki w dół podciąga gracza (wspinanie)
    for (const rope of L.ropes) {
        const localY = pos.y - rope.body.position.y;
        if (localY < rope.halfHeight && localY > -rope.halfHeight && Math.hypot(pos.x - rope.body.position.x, pos.z - rope.body.position.z) < 0.8) {
            const first = !ropeConstraint;
            if (ropeConstraint) world.removeConstraint(ropeConstraint);
            ropeConstraint = new CANNON.PointToPointConstraint(playerBody, ropePivot(i), rope.body, new CANNON.Vec3(0, localY, 0));
            world.addConstraint(ropeConstraint); ropeHand = i;
            if (first) track('rope');
            return;
        }
    }
}
// Punkt chwytu względem środka gracza, liczony z pozycji kontrolera
function ropePivot(i) {
    const c = controllers[i].position, cam = camera.position;
    return new CANNON.Vec3(c.x - cam.x, c.y - radius - gorillaStanceOffset, c.z - cam.z);
}
function onSqueezeEnd(i) {
    if (ropeConstraint && i === ropeHand) { world.removeConstraint(ropeConstraint); ropeConstraint = null; ropeHand = -1; }
    if (grabbed && grabbingIndex === i) {
        const b = grabbed.userData.body;
        b.type = CANNON.Body.DYNAMIC;
        const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(controllers[i].quaternion).multiplyScalar(15);
        b.velocity.set(dir.x, dir.y + 5, dir.z); containBall(b);
        sendObjectMove(grabbed.userData.id, b);
        track('throw');
        grabbed = null; grabbingIndex = -1; L.heldId = null;
    }
}
// Po zmianie poziomu liny i piłki znikają, więc puszczamy wszystko
export function releaseAll() {
    releaseRope();
    grabbed = null; grabbingIndex = -1; L.heldId = null;
}
export function releaseRope() { if (ropeConstraint) { world.removeConstraint(ropeConstraint); ropeConstraint = null; ropeHand = -1; } }
export function isOnRope() { return !!ropeConstraint; }

function sphereVsBox(px, py, pz, r, b) {
    const cx = Math.max(b.min.x, Math.min(px, b.max.x)), cy = Math.max(b.min.y, Math.min(py, b.max.y)), cz = Math.max(b.min.z, Math.min(pz, b.max.z));
    const dx = px - cx, dy = py - cy, dz = pz - cz, d2 = dx * dx + dy * dy + dz * dz;
    if (d2 >= r * r) return false;
    if (d2 > 1e-12) { const d = Math.sqrt(d2); hit.nx = dx / d; hit.ny = dy / d; hit.nz = dz / d; hit.depth = r - d; }
    else {
        const c = [px - b.min.x, b.max.x - px, py - b.min.y, b.max.y - py, pz - b.min.z, b.max.z - pz];
        let i = 0; for (let k = 1; k < 6; k++) if (c[k] < c[i]) i = k;
        hit.nx = hit.ny = hit.nz = 0;
        if (i === 0) hit.nx = -1; else if (i === 1) hit.nx = 1; else if (i === 2) hit.ny = -1; else if (i === 3) hit.ny = 1; else if (i === 4) hit.nz = -1; else hit.nz = 1;
        hit.depth = c[i] + r;
    }
    return true;
}
function pushOut(p, v) {
    p.x += hit.nx * hit.depth; p.y += hit.ny * hit.depth; p.z += hit.nz * hit.depth;
    const vn = v.x * hit.nx + v.y * hit.ny + v.z * hit.nz;
    if (vn < 0) { v.x -= vn * hit.nx; v.y -= vn * hit.ny; v.z -= vn * hit.nz; }
}

// Kolizje gracza liczone po każdym pod-kroku fizyki
world.addEventListener('postStep', () => {
    stepped = true;
    const p = playerBody.position, v = playerBody.velocity;
    for (let pass = 0; pass < 3; pass++) {
        let any = false;
        for (const o of L.obstacles) if (sphereVsBox(p.x, p.y, p.z, radius, o.box3)) { pushOut(p, v); any = true; }
        if (!any) break;
    }
    if (renderer.xr.isPresenting) {
        const headY = camera.position.y - radius - gorillaStanceOffset;
        if (headY > 0.1) for (const o of L.obstacles) if (sphereVsBox(p.x, p.y + headY, p.z, HEAD_RADIUS, o.box3)) pushOut(p, v);
    }
    grounded = false;
    for (const o of L.obstacles) if (sphereVsBox(p.x, p.y, p.z, radius + 0.03, o.box3) && hit.ny > 0.5) { grounded = true; break; }
    if (grounded && !ropeConstraint) {
        let k;
        if (handPushing) k = FRICTION_PUSH;
        else if (simTime - lastPushTime < MOMENTUM_TIME) k = FRICTION_RUN;
        else k = FRICTION_IDLE;
        v.x *= k; v.z *= k;
        if (k === FRICTION_IDLE) { if (Math.abs(v.x) < 0.08) v.x = 0; if (Math.abs(v.z) < 0.08) v.z = 0; }
    }
    const maxUp = L.maxUp || 99; if (v.y > maxUp) v.y = maxUp;   // limit prędkości w górę ustawiany przez poziom
    const maxV = 12 * POWER, s2 = v.lengthSquared();
    if (s2 > maxV * maxV) v.scale(maxV / Math.sqrt(s2), v);
    for (const ball of L.throwables) if (ball.userData.body.type === CANNON.Body.DYNAMIC) containBall(ball.userData.body);
});

function clampHand(controller, hand) {
    controller.getWorldPosition(hand.position); controller.getWorldQuaternion(hand.quaternion);
    const r = 0.08, hp = hand.position;
    for (const o of L.obstacles) {
        const b = o.box3;
        if (hp.x > b.min.x - r && hp.x < b.max.x + r && hp.y > b.min.y - r && hp.y < b.max.y + r && hp.z > b.min.z - r && hp.z < b.max.z + r) {
            const d = [hp.x - (b.min.x - r), (b.max.x + r) - hp.x, hp.y - (b.min.y - r), (b.max.y + r) - hp.y, hp.z - (b.min.z - r), (b.max.z + r) - hp.z];
            let i = 0; for (let k = 1; k < 6; k++) if (d[k] < d[i]) i = k;
            if (i === 0) hp.x = b.min.x - r; else if (i === 1) hp.x = b.max.x + r; else if (i === 2) hp.y = b.min.y - r; else if (i === 3) hp.y = b.max.y + r; else if (i === 4) hp.z = b.min.z - r; else hp.z = b.max.z + r;
        }
    }
}

// Zwraca true, gdy dłoń dotyka podłoża albo ściany
function handleMovement(i, dt) {
    const controller = controllers[i], hand = i === 0 ? hands.L : hands.R, prev = prevLocal[i];
    const current = controller.position.clone();
    const spd = prev.lengthSq() > 0 ? current.distanceTo(prev) / Math.max(dt, 1 / 120) : 0;   // prędkość dłoni względem ciała
    let touching = false;
    if (prev.lengthSq() > 0 && !ropeConstraint) {
        const delta = new THREE.Vector3().subVectors(current, prev);
        const hw = hand.position;
        let ground = false, wall = false, grip = 1;
        if (hw.y <= 0.25) ground = true;
        else {
            // Najlepszy chwyt spośród dotykanych powierzchni (śliskie ściany mają grip < 1)
            let best = null, bestGrip = -1;
            for (const o of L.obstacles) if (o.box3.distanceToPoint(hw) <= 0.3) { const g = o.grip === undefined ? 1 : o.grip; if (g > bestGrip) { best = o; bestGrip = g; } }
            if (best) { if (hw.y > best.box3.min.y + 0.15) wall = true; else ground = true; grip = bestGrip; }
        }
        for (const t of L.trampolines) {
            if (t.box3.distanceToPoint(hw) <= 0.25) {
                playerBody.velocity.y = 12 * POWER; ground = false; wall = false;
                if (simTime - lastTrampTime > 0.6) { lastTrampTime = simTime; track('tramp'); if (L.tramp) L.tramp.k = 1; }
                break;
            }
        }
        touching = ground || wall;
        const dl = delta.length();
        if (touching && dl > HAND_DEADZONE) {
            const handSpeed = dl / Math.max(dt, 1 / 120);
            const boost = 1 + Math.min(RUN_BOOST_MAX, Math.max(0, (handSpeed - 0.8) * RUN_BOOST_RATE)), vBoost = 1 + (boost - 1) * 0.5;
            delta.multiplyScalar((dl - HAND_DEADZONE) / dl);
            const dw = delta.applyQuaternion(playerRig.quaternion);
            if (dw.length() > 0.4 * POWER) dw.normalize().multiplyScalar(0.4 * POWER);
            const k = grip * (L.moveScale || 1);   // poziom może osłabić ruch (np. Studnia)
            let fXZ = -650 * POWER * boost * k, fY = -650 * POWER * vBoost * k;
            if (wall) { fY = -800 * POWER * vBoost * k; fXZ = -700 * POWER * boost * k; }
            playerBody.applyImpulse(new CANNON.Vec3(dw.x * fXZ, dw.y * fY, dw.z * fXZ), playerBody.position);
            handPushing = true;
            if (handSpeed > RUN_MIN_SPEED) lastPushTime = simTime;
        }
    }
    // Hałas rąk dla poziomów, które go słuchają (L.onNoise): uderzenie przy dotknięciu i mocne szuranie
    if (L.onNoise) {
        if (touching && !wasTouch[i]) L.onNoise(Math.max(spd, lastSpd[i]), hand.position);
        else if (touching && spd > 2.0 && simTime - lastScrape[i] > 0.25) { lastScrape[i] = simTime; L.onNoise(spd * 0.7, hand.position); }
    }
    wasTouch[i] = touching; lastSpd[i] = spd;
    prev.copy(current);
    return touching;
}
function handTarget(rig, i, touching) {
    if (touching) rig.target = 0.04;
    else if (ctrlInput[i].squeeze) rig.target = 1.0;
    else if (ctrlInput[i].select) rig.target = 0.55;
    else rig.target = 0.22;
}

// Wywoływane co klatkę z main.js
export function updatePlayer(dt, t) {
    simTime = t;
    world.step(1 / 90, dt, 10);
    if (stepped) { handPushing = false; stepped = false; }
    const bp = playerBody.position, bv = playerBody.velocity, B = L.bounds;   // granice ustawia poziom
    if (bp.x < B.minX) { bp.x = B.minX; bv.x = 0; } if (bp.x > B.maxX) { bp.x = B.maxX; bv.x = 0; }
    if (bp.z < B.minZ) { bp.z = B.minZ; bv.z = 0; } if (bp.z > B.maxZ) { bp.z = B.maxZ; bv.z = 0; }
    if (bp.y < radius) { bp.y = radius; if (bv.y < 0) bv.y = 0; }
    if (bp.y > B.maxY) { bp.y = B.maxY; if (bv.y > 0) bv.y = 0; }
    if (!L.noHeightTrack) track('height', bp.y - radius);

    if (hands.L && renderer.xr.isPresenting) {
        clampHand(controllers[0], hands.L); clampHand(controllers[1], hands.R);
        handTarget(hands.L.userData.rig, 0, handleMovement(0, dt));
        handTarget(hands.R.userData.rig, 1, handleMovement(1, dt));
    }
    if (hands.L) { poseHand(hands.L.userData.rig, dt); poseHand(hands.R.userData.rig, dt); }
    if (ropeConstraint && ropeHand >= 0) { ropeConstraint.pivotA.copy(ropePivot(ropeHand)); hands[ropeHand === 0 ? 'L' : 'R'].userData.rig.target = 1.0; }
    if (grabbed) {
        const hm = grabbingIndex === 0 ? hands.L : hands.R, b = grabbed.userData.body;
        b.position.set(hm.position.x, hm.position.y, hm.position.z); containBall(b);
    }
    for (const ball of L.throwables) { ball.position.copy(ball.userData.body.position); ball.quaternion.copy(ball.userData.body.quaternion); }
    for (const rope of L.ropes) { rope.mesh.position.copy(rope.body.position); rope.mesh.quaternion.copy(rope.body.quaternion); }

    const cl = camera.position;
    playerRig.position.set(bp.x - cl.x, bp.y - radius - gorillaStanceOffset, bp.z - cl.z);
    playerRig.updateMatrixWorld(true);
}
export function isGrounded() { return grounded; }
