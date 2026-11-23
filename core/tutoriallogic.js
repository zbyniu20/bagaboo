// ==========================================
// SAMOUCZEK DLA NOWYCH GRACZY: CZYSTA LOGIKA (kroki, wykrywanie ukończenia kroku, rozpoznanie nowego gracza). Bez THREE: testy w tests/logic.mjs.
// Stan TUT jest współdzielony z player.js (spust kontrolera = dalej) i pause.js (przyciski Tutorial / Skip); rysuje core/tutorial.js.
// Nowy gracz dostaje samouczek sam przy pierwszym wejściu do lobby; ekipa (moderatorzy i admini) może go włączyć w menu pauzy w każdej chwili.
// ==========================================
export const TUT = { on: false, step: 0, pauseSeen: false, next: null, start: null, skip: null };
// kind: next = dalej spustem/Enter; move/climb/jump/pause = wykrywane z gry (metryki), Enter też przeskakuje
export const STEPS = [
    { id: 'welcome', kind: 'next', title: 'Welcome to BagaBoo VR', lines: ['A short tutorial: moving, climbing, the pause menu and the rules.', 'Trigger (or Enter) = next. You can skip it in the pause menu.'] },
    { id: 'move', kind: 'move', need: 4, title: 'Move with your arms', lines: ['Hold a grip (squeeze) on the floor or a wall and pull yourself along.', 'Travel about 4 metres to continue.'] },
    { id: 'climb', kind: 'climb', need: 1.0, title: 'Climb', lines: ['Grab a ledge or a wall and pull yourself up.', 'Get about 1 metre above where you started.'] },
    { id: 'jump', kind: 'jump', need: 2.5, title: 'Jump', lines: ['Swing both arms down and let go to launch yourself into the air.'] },
    { id: 'pause', kind: 'pause', title: 'The pause menu', lines: ['Press Y, B or the stick (Esc on a keyboard).', 'Volume, comfort options, your pet and the way out are there.'] },
    { id: 'levels', kind: 'next', title: 'Levels and games', lines: ['The doors in the lobby lead to levels and games.', 'Point at a terminal and pull the trigger to read what each one is about.'] },
    { id: 'danger', kind: 'next', title: 'Stay alive', lines: ['Monsters hunt you: hide, stay quiet, run.', 'In Become the Monster one torn hand = you live; two hands or the head = out.'] },
    { id: 'done', kind: 'next', title: 'You are ready!', lines: ['Collect Bagabucks, buy cosmetics, play with friends.', 'Staff can restart this tutorial from the pause menu.'] }
];
// Metryki z gry: { moved: m poziomo od startu kroku, climbed: m w górę od startu kroku, vy: największa prędkość w górę, paused: czy otwarto menu pauzy }
export function stepDone(step, m) {
    if (!step || !m) return false;
    switch (step.kind) {
        case 'move': return (m.moved || 0) >= step.need;
        case 'climb': return (m.climbed || 0) >= step.need;
        case 'jump': return (m.vy || 0) >= step.need;
        case 'pause': return !!m.paused;
        default: return false;   // 'next': tylko ręcznie
    }
}
// Nowy gracz: zapis bez postępów i bez ukończonego samouczka (obecni gracze z historią nie dostają go sami)
export function isNewPlayer(save) {
    if (!save || save.tutorialDone) return false;
    const n = (o) => (o && typeof o === 'object' ? Object.keys(o).length : 0), b = save.best || {};
    return n(save.records) === 0 && n(save.achievements) === 0 && !(save.questsDone > 0) && !(b.jumps > 0) && !(b.height > 3) && ((save.login && save.login.streak) || 0) <= 1;
}
// Samouczek ma się włączyć sam: tylko w lobby, tylko nowemu graczowi i tylko raz na sesję
export function shouldAutoStart(save, levelId, alreadyTried) { return levelId === 'lobby' && !alreadyTried && isNewPlayer(save); }
// Przycisk w menu pauzy: ekipa może włączyć zawsze, każdy może przerwać trwający
export function tutorialButton(isStaff, on) { return on ? 'skip' : (isStaff ? 'start' : null); }
export const progressText = (i) => Math.min(i + 1, STEPS.length) + '/' + STEPS.length;
