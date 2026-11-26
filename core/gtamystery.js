// ==========================================
// SCARY GTA: TAJEMNICA "ZAGINIONY DETEKTYW" (czysta logika, bez THREE), wielokrokowa zagadka jak Epsilon albo Mount Chiliad: sześć wskazówek, które zapamiętują się między wizytami.
//   1. radio (burza): dyspozytor mówi o zaginionej jednostce 9 i wiadomości na ścianie; 2. ściana w pokoju 13 w motelu: napis widoczny TYLKO w blackoucie (3 cyfry);
//   3. budka A (miasto): kod ze ściany, głos wskazuje dźwig; 4. skrzynka u stóp dźwigu (widoczna dopiero po budce A): notatka z kodem B;
//   5. budka B (przy pirsie, działa dopiero po skrzynce): głos wskazuje koniec pirsu; 6. walizka na pirsie (pojawia się po budce B): sprawa zamknięta, osiągnięcie `gta_detective` (czapka detektywa).
// Stan: SAVE.gta.mystery { clues: [id] } (core/gtastore.js, zawsze przez normalizeGta -> normalizeMystery; zależności wskazówek są pilnowane także w zapisie). Nagrodą jest zablokowany kosmetyk z osiągnięcia,
// nie Bagabucksy. Wszystko lokalne: nic nie idzie przez sieć, nic nie rusza ciepła ani gwiazdek. 3D, budki i napisy: core/gtamysteryfx.js. Testy: tests/logic.mjs (blok "tajemnica GTA"), w przeglądarce tests/gtamystery.mjs.
// ==========================================
import { CITY, CRANE, INTERIORS, cityWithInteriors, alleyCenter, hideSpots, SAFEHOUSES, bagSpots } from './citylayout.js';
import { frame, furniture } from './interiorlogic.js';
const dtOf = (dt) => Math.min(Math.max(+dt || 0, 0), 0.5);

export const CLUES = ['radio', 'wall', 'boothA', 'crate', 'boothB', 'case'];
// Zależności: skrzynka istnieje dopiero po budce A, budka B odpowiada dopiero po skrzynce, walizka pojawia się po budce B
export const REQUIRES = { crate: 'boothA', boothB: 'crate', case: 'boothB' };
export const CODES = { A: '317', B: '4096' };
// Notatki na telefonie (tylko ASCII i krótko: telefon zawija tekst)
export const NOTES = {
    radio: 'Unit nine vanished near the motel. He left a message on the wall, in the dark.',
    wall: 'The wall says UNIT 9 and three digits. Maybe a number? Find a phone booth.',
    boothA: 'The booth: "I am under the crane. Look at its east foot."',
    crate: 'Note: BADGE 4096. Call the booth near the harbour.',
    boothB: 'The booth: "Unit nine waits at the end of the pier."',
    case: 'Case closed.'
};
export const RADIO_LINE = 'Dispatch to all units. Unit nine has been silent since the motel. He left a message on the wall, but only in the dark.';
export const BOOTH_LINES = { A: 'Unit nine. If you hear this, I am under the crane. Look at its east foot.', B: 'You found my badge. Come to the end of the pier. Alone.' };

// ----- zapis -----
export function normalizeMystery(raw) {
    const out = { clues: [] };
    if (raw && typeof raw === 'object' && Array.isArray(raw.clues)) for (const id of raw.clues) if (typeof id === 'string' && CLUES.includes(id) && !out.clues.includes(id)) out.clues.push(id);
    // zależności: wskazówka bez poprzednika (np. sfałszowany zapis) odpada
    let changed = true; while (changed) { changed = false; for (const id of out.clues.slice()) { const req = REQUIRES[id]; if (req && !out.clues.includes(req)) { out.clues.splice(out.clues.indexOf(id), 1); changed = true; } } }
    out.clues = CLUES.filter(id => out.clues.includes(id));
    return out;
}
export const hasClue = (m, id) => m.clues.includes(id);
export const canDo = (m, id) => CLUES.includes(id) && !hasClue(m, id) && (!REQUIRES[id] || hasClue(m, REQUIRES[id]));
export const solved = (m) => hasClue(m, 'case');
// Zaliczenie wskazówki: nowy stan i czy to rozwiązanie (walizka)
export function addClue(m, id) {
    if (!canDo(m, id)) return { isNew: false, state: m, n: m.clues.length, solved: solved(m) };
    const next = normalizeMystery({ clues: m.clues.concat(id) });
    return { isNew: true, state: next, n: next.clues.length, solved: solved(next) };
}
// Notatka do pokazania na telefonie: ostatnia znaleziona wskazówka (puste, gdy nic nie znaleziono albo sprawa zamknięta)
export function lastNote(m) { if (!m.clues.length || solved(m)) return ''; return NOTES[m.clues[m.clues.length - 1]] || ''; }
export const caseLine = (m) => 'CASE ' + m.clues.length + '/' + CLUES.length;

// ----- budki telefoniczne -----
// Wynik wpisania kodu: 'ok' (dobry, nowa wskazówka), 'done' (już zaliczona), 'bad' (zły kod), 'closed' (budka B przed skrzynką: nikt nie odbiera)
export function boothResult(m, booth, typed) {
    const id = booth === 'A' ? 'boothA' : 'boothB';
    if (hasClue(m, id)) return 'done';
    if (booth === 'B' && !hasClue(m, 'crate')) return 'closed';
    return String(typed) === CODES[booth] ? 'ok' : 'bad';
}
export const codeLen = (booth) => CODES[booth].length;

// ----- radio w burzy: jedna linia na burzę, dopóki wskazówka nie została usłyszana -----
export const RADIO = { DELAY: 14, GAP: 60 };
export const newRadioClue = () => ({ t: RADIO.DELAY, was: false });
// o: { storm, heard (czy wskazówka radiowa już jest w zapisie) }; true w klatce, w której linia ma być powiedziana
export function radioClueStep(st, dt, o) {
    const s = { t: st.t, was: !!o.storm }, d = dtOf(dt);
    if (o.heard) return { st: s, say: false };
    if (!o.storm) { s.t = RADIO.DELAY; return { st: s, say: false }; }
    s.t -= d; if (s.t > 0) return { st: s, say: false };
    s.t = RADIO.GAP; return { st: s, say: true };
}

// ----- ściana: napis widoczny tylko w blackoucie; liczy się, gdy podejdziesz na NEAR m i patrzysz w nią -----
export const WALL = { NEAR: 3.5, SECONDS: 1.2, FACING: 0.5 };
export const wallVisible = (night) => night === 'blackout';
export const newWallLook = () => ({ t: 0, done: false });
// o: { visible, near (m), facing (iloczyn skalarny kierunku wzroku i kierunku do ściany) }
export function wallStep(st, dt, o) {
    if (st.done) return { st: st, found: false };
    const s = { t: o.visible && o.near < WALL.NEAR && o.facing > WALL.FACING ? st.t + dtOf(dt) : 0, done: false };
    if (s.t >= WALL.SECONDS) { s.done = true; return { st: s, found: true }; }
    return { st: s, found: false };
}

// ----- pozycje (z układu miasta) -----
const faceYaw = (door) => ({ N: Math.PI, S: 0, W: -Math.PI / 2, E: Math.PI / 2 }[door] || 0);
export function mysterySpots(B) {
    B = B || cityWithInteriors(1337);
    const motel = B.find(b => b.id === '2,1,0'), f = frame(motel, INTERIORS[motel.id].door), D = f.D, w = f.rect(D - 0.04, D - 0.04, 3.4, 3.4);
    const out = {};
    out.wall = { x: w.x0, y: 1.7, z: w.z0, w: 2.0, h: 0.8, yaw: faceYaw(INTERIORS[motel.id].door) };
    const a = alleyCenter(3, 1);
    out.boothA = { x: a[0], z: a[1] - 3.2, yaw: 0 };
    out.boothB = { x: CITY.PIER.x - 9, z: CITY.BEACH_Z + 3, yaw: Math.PI / 2 };
    out.crate = { x: CRANE.x + CRANE.w / 2 + 1.4, y: 0.3, z: CRANE.z, r: 0.6 };
    out.caseBox = { x: CITY.PIER.x - 1.7, y: 0.25, z: 62, r: 0.55 };
    return out;
}

// ----- kontrola rozmieszczenia (używa jej test) -----
export function mysteryProblems() {
    const bad = [], B = cityWithInteriors(1337), sp = /** @type {any} */ (mysterySpots(B)), bags = bagSpots(B);
    const motel = B.find(b => b.id === '2,1,0'), t = CITY.WALL_T;
    const inside = (x, z, m) => B.some(b => x > b.x0 - m && x < b.x1 + m && z > b.z0 - m && z < b.z1 + m);
    if (!(sp.wall.x > motel.x0 + t - 0.2 && sp.wall.x < motel.x1 - t + 0.2 && sp.wall.z > motel.z0 + t - 0.2 && sp.wall.z < motel.z1 - t + 0.2)) bad.push('the wall text is not inside the motel');
    const f = frame(motel, INTERIORS[motel.id].door), room = f.rect(f.D - 3, f.D, 2.0, 4.4);
    if (!(sp.wall.x >= room.x0 - 0.3 && sp.wall.x <= room.x1 + 0.3 && sp.wall.z >= room.z0 - 0.3 && sp.wall.z <= room.z1 + 0.3)) bad.push('the wall text is not in the haunted room');
    for (const fu of furniture(motel)) if (fu.solid && fu.y1 > 1.2 && Math.abs(fu.x0 - sp.wall.x) < 1.1 && Math.abs(fu.z0 - sp.wall.z) < 1.1 && sp.wall.x > fu.x0 - 1.0 && sp.wall.x < fu.x1 + 1.0 && sp.wall.z > fu.z0 - 1.0 && sp.wall.z < fu.z1 + 1.0) bad.push('the wall text is hidden behind furniture');
    for (const [name, p] of [['boothA', sp.boothA], ['boothB', sp.boothB], ['crate', sp.crate], ['caseBox', sp.caseBox]]) {
        if (inside(p.x, p.z, 1.0)) bad.push('the ' + name + ' is inside a building');
        if (p.x < CITY.X0 + 1 || p.x > CITY.X1 - 1 || p.z < CITY.Z0 + 1 || p.z > CITY.Z1 - 1) bad.push('the ' + name + ' is outside the map');
        for (const s of SAFEHOUSES) if (Math.hypot(s.x - p.x, s.z - p.z) < 2) bad.push('the ' + name + ' sits on safe house ' + s.id);
        for (const h of hideSpots()) if (Math.hypot(h.x - p.x, h.z - p.z) < 2.2) bad.push('the ' + name + ' sits on a dumpster ' + h.id);
        for (const g of bags) if (Math.hypot(g.x - p.x, g.z - p.z) < 1.5 && g.y < 3) bad.push('the ' + name + ' sits on the ' + g.id + ' bag');
    }
    const pier = (p) => p.x > CITY.PIER.x - CITY.PIER.w / 2 + 0.3 && p.x < CITY.PIER.x + CITY.PIER.w / 2 - 0.3 && p.z > CITY.PIER.z0 && p.z < CITY.PIER.z1 - 3;
    if (!pier(sp.caseBox)) bad.push('the briefcase is not on the pier (before the exit door)');
    if (sp.boothB.z < CITY.BEACH_Z || sp.boothB.z > CITY.SEA_Z) bad.push('booth B is not on the beach');
    if (Math.hypot(sp.crate.x - CRANE.x, sp.crate.z - CRANE.z) > 4) bad.push('the crate is not at the foot of the crane');
    if (Math.hypot(sp.boothA.x - sp.boothB.x, sp.boothA.z - sp.boothB.z) < 30) bad.push('the booths are too close to each other');
    const lens = [CODES.A.length, CODES.B.length];
    if (lens[0] !== 3 || lens[1] !== 4 || !/^\d+$/.test(CODES.A + CODES.B)) bad.push('codes are malformed');
    if (CLUES.length !== 6 || Object.keys(NOTES).length !== 6 || Object.values(NOTES).some(n => n.length > 90 || !/^[A-Za-z0-9 ,.'!?":-]+$/.test(n))) bad.push('notes are malformed (6 short plain notes)');
    if (!NOTES.wall.includes('UNIT 9') || !NOTES.crate.includes(CODES.B)) bad.push('notes must carry the codes');
    return bad;
}
