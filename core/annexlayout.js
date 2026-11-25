// ==========================================
// ANEKS LOBBY (czysta logika, bez THREE): układ drugiej hali 30 x 30 m za południową ścianą lobby (razem 2x powierzchni dawnego lobby).
// Dawna hala zostaje bez zmian (te same współrzędne), a aneks dochodzi przez tunel w południowej ścianie, między drzwiami Silence (x = -5) a LEVELS (x = 4).
// Wszystkie miejsca aktywności są w tabeli ZONES (prostokąty w metrach); test w tests/logic.mjs pilnuje, że nic na siebie nie nachodzi,
// środek aneksu (kręgosłup od tunelu do dalekiej ściany) jest wolny, a uchwyty toru wspinaczkowego są w zasięgu rąk.
// Pozycje obiektów (3D) czyta core/annex.js stąd, więc zmieniając układ zmieniasz tylko tę tabelę.
// ==========================================
export const HALL = { x0: -15, x1: 15, z0: -15, z1: 15 };                 // dawne lobby (wnętrze)
export const ANNEX = { x0: -15, x1: 15, z0: 20, z1: 50, H: 20 };          // wnętrze aneksu; ściany 5 m grubości na zewnątrz (do +-20 i do z = 55)
export const TUNNEL = { x0: -3, x1: 1, z0: 15, z1: 20, top: 4.6 };        // otwór w południowej ścianie: 4 m szerokości, 5 m długości, wysokość 4,6 m
export const SPINE = { x0: -3, x1: 1 };                                   // wolny pas od tunelu do dalekiej ściany (równa szerokość tunelu)
export const BOUNDS_MAX_Z = 49.6;                                         // twardy limit ruchu gracza na południu (L.bounds.maxZ)
export const MOUTH_KEEPOUT = 3;                                           // w tej odległości od wylotu tunelu (z = ANNEX.z0) nic nie stoi

// Strefy aktywności (prostokąty x0..x1, z0..z1). Przy ścianie stoją te, które się do niej opierają (climb: ściana wschodnia).
export const ZONES = [
    { id: 'climb', name: 'Climb Rush', x0: 9.5, x1: 15, z0: 21, z1: 39, wall: 'east' },
    { id: 'ouija', name: 'Séance table', x0: -14.5, x1: -6, z0: 38.5, z1: 48.5, wall: null },
    { id: 'music', name: 'Haunted instruments', x0: 5, x1: 14.5, z0: 42, z1: 49, wall: null },
    { id: 'zipline', name: 'Zipline', x0: -15, x1: -9, z0: 23, z1: 37, wall: 'west' },
    { id: 'gallery', name: 'Ghost Gallery', x0: -7, x1: 4.6, z0: 48.6, z1: 50, wall: 'south' },
    { id: 'rack', name: 'Ball rack', x0: -5.5, x1: -3.2, z0: 43, z1: 47, wall: null }
];
export const zoneById = (id) => ZONES.find(z => z.id === id) || null;

// Stół spirytystyczny (okrągły blat, promień 1,1 m; plansza 1 m promienia) i organy (półkole klawiszy wokół środka, wymiary w core/organlogic.js)
export const OUIJA_AT = { x: -10.5, z: 43.5, tableR: 1.1, topY: 0.9, standR: 0.8 };
export const ORGAN_AT = { x: 10, z: 47 };

// Światła aneksu: [x, y, z, kolor, moc, zasięg]. Idą przez tę samą listę co światła lobby (fx.flickers), więc Nocna Zmiana je przyciemnia.
export const LIGHTS = [[-8, 12, 26, 0xffa860, 24, 16], [8, 12, 26, 0xffa860, 24, 16], [-8, 12, 43, 0xff9a50, 22, 15], [9, 12, 45, 0xff9a50, 22, 15], [0, 14, 36, 0xffb070, 20, 18], [12.5, 7, 31, 0xffa060, 16, 12]];

// Tor wspinaczkowy Climb Rush na ścianie wschodniej: platformy 0,8 x 0,25 x 0,9 m przy ścianie x = 15 (środek 14,6), po przekątnej w górę.
// Odstęp między sąsiednimi uchwytami nie przekracza CLIMB.MAX_STEP (łatwiej niż czerwona trasa Parkour King, której największy krok to ok. 2,1 m).
export const CLIMB = { WALL_X: 14.6, Z0: 25, DZ: 1.0, Y0: 1.3, DY: 0.85, COUNT: 13, MAX_STEP: 1.5, MIN_Y: 0.6, MAX_Y: 12.5, TOUCH: 0.5, REF_ROUTE_STEP: 2.1 };
export function climbHolds() {
    const out = [];
    for (let i = 0; i < CLIMB.COUNT; i++) out.push([CLIMB.WALL_X, CLIMB.Y0 + i * CLIMB.DY, CLIMB.Z0 + i * CLIMB.DZ]);
    return out;
}
// Dzwon na szczycie (dotknięcie kończy bieg): nad ostatnim uchwytem
export function climbBell() { const l = climbHolds().slice(-1)[0]; return [l[0], l[1] + 0.85, l[2] + 0.55]; }
// Mata startowa na podłodze pod pierwszym uchwytem
export function climbMat() { return [CLIMB.WALL_X - 1.2, 0.02, CLIMB.Z0 - 0.4]; }

// --- Sprawdzenia geometrii (używa ich test) ---
export const rectOverlap = (a, b) => a.x0 < b.x1 && b.x0 < a.x1 && a.z0 < b.z1 && b.z0 < a.z1;
export const insideAnnex = (r) => r.x0 >= ANNEX.x0 && r.x1 <= ANNEX.x1 && r.z0 >= ANNEX.z0 && r.z1 <= ANNEX.z1;
export const WALL_STRIP = 1.5;                                            // ostatnie 1,5 m przy dalekiej ścianie nie należy do kręgosłupa (stoją tam rzeczy wiszące na ścianie)
export const spineRect = () => ({ x0: SPINE.x0, x1: SPINE.x1, z0: ANNEX.z0, z1: ANNEX.z1 - WALL_STRIP });
export const mouthRect = () => ({ x0: TUNNEL.x0 - MOUTH_KEEPOUT, x1: TUNNEL.x1 + MOUTH_KEEPOUT, z0: ANNEX.z0, z1: ANNEX.z0 + MOUTH_KEEPOUT });
// Lista usterek układu (pusta = dobrze)
export function layoutProblems() {
    const bad = [];
    for (const z of ZONES) {
        if (!insideAnnex(z)) bad.push(z.id + ': outside the annex');
        if (rectOverlap(z, spineRect())) bad.push(z.id + ': blocks the spine');
        if (rectOverlap(z, mouthRect())) bad.push(z.id + ': too close to the tunnel mouth');
    }
    for (let i = 0; i < ZONES.length; i++) for (let j = i + 1; j < ZONES.length; j++) if (rectOverlap(ZONES[i], ZONES[j])) bad.push(ZONES[i].id + ' overlaps ' + ZONES[j].id);
    for (const l of LIGHTS) if (l[0] < ANNEX.x0 || l[0] > ANNEX.x1 || l[2] < ANNEX.z0 || l[2] > ANNEX.z1 || l[1] > ANNEX.H) bad.push('a light is outside the annex');
    return bad;
}
// Uchwyty toru: w strefie climb, w zasięgu rąk (kroki <= MAX_STEP, pionowo <= 1 m), nad podłogą i pod sufitem; zwraca listę usterek
export function climbProblems() {
    const bad = [], h = climbHolds(), z = zoneById('climb'), b = climbBell();
    if (h.length !== CLIMB.COUNT) bad.push('wrong count');
    h.forEach((p, i) => {
        if (p[0] + 0.4 > ANNEX.x1 + 0.001 || p[0] - 0.4 < z.x0) bad.push('hold ' + i + ' outside the zone');
        if (p[2] - 0.45 < z.z0 || p[2] + 0.45 > z.z1) bad.push('hold ' + i + ' outside the zone (z)');
        if (p[1] < CLIMB.MIN_Y || p[1] > CLIMB.MAX_Y) bad.push('hold ' + i + ' height');
        if (i > 0) { const q = h[i - 1], d = Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]); if (d > CLIMB.MAX_STEP || p[1] - q[1] > 1.0) bad.push('hold ' + i + ' too far from the previous one'); }
    });
    const last = h[h.length - 1];
    if (Math.hypot(b[0] - last[0], b[1] - last[1], b[2] - last[2]) > CLIMB.MAX_STEP) bad.push('the bell is out of reach');
    if (b[2] + 0.3 > z.z1) bad.push('the bell is outside the zone');
    return bad;
}
