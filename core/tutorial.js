// ==========================================
// SAMOUCZEK (3D): panel przed twarzą z krokami z core/tutoriallogic.js. Wykrywa ruch, wspinaczkę, skok i otwarcie menu pauzy; spust albo Enter przechodzi dalej.
// Start sam dla nowego gracza w lobby (autoStartTutorial z main.js), ekipa włącza go w menu pauzy (TUT.start), każdy może go przerwać (TUT.skip).
// Ukończenie albo pominięcie zapisuje SAVE.tutorialDone. Wszystko lokalne: nic nie idzie przez sieć.
// ==========================================
import { camera } from './engine.js';
import { cameraPanel, panelBg } from './levelkit.js';
import { playerBody } from './player.js';
import { SAVE, saveGame } from './economy.js';
import { toast } from './terminal.js';
import { TUT, STEPS, stepDone, shouldAutoStart, progressText } from './tutoriallogic.js';

const ST = { hud: null, hudT: 0, x0: 0, y0: 0, z0: 0, vy: 0, doneT: -1, tried: false, level: null };
function metrics() {
    const p = playerBody.position;
    return { moved: Math.hypot(p.x - ST.x0, p.z - ST.z0), climbed: p.y - ST.y0, vy: ST.vy, paused: TUT.pauseSeen };
}
function enterStep(i) {
    TUT.step = i; TUT.pauseSeen = false; ST.doneT = -1; ST.hudT = 0; ST.vy = 0;
    ST.x0 = playerBody.position.x; ST.y0 = playerBody.position.y; ST.z0 = playerBody.position.z;
}
function finish(msg) {
    if (!TUT.on) return;
    TUT.on = false; if (ST.hud) { ST.hud.dispose(); ST.hud = null; }
    SAVE.tutorialDone = true; saveGame(); toast(msg, '#9aff60');
}
export function startTutorial() {
    if (TUT.on) return;
    TUT.on = true; ST.hud = cameraPanel(1024, 250, 0.52, 0.127, -0.27, -0.8, 992); enterStep(0);
}
export function skipTutorial() { finish('Tutorial skipped.'); }
export function nextStep() {
    if (!TUT.on) return;
    if (TUT.step >= STEPS.length - 1) { finish('Tutorial complete! Have fun.'); return; }
    enterStep(TUT.step + 1);
}
TUT.start = startTutorial; TUT.skip = skipTutorial;
TUT.next = (src) => { if (src === 'trigger' && STEPS[TUT.step] && STEPS[TUT.step].kind !== 'next') return; nextStep(); };   // spust przechodzi dalej tylko w krokach informacyjnych (inaczej klikanie w menu przeskakiwałoby kroki)
if (typeof window !== 'undefined') window.addEventListener('keydown', (e) => { if (TUT.on && e.key === 'Enter') nextStep(); });
// Wołane z main.js po zbudowaniu poziomu: nowy gracz dostaje samouczek sam przy pierwszym wejściu do lobby
export function autoStartTutorial(levelId) {
    if (!shouldAutoStart(SAVE, levelId, ST.tried)) return;
    ST.tried = true; startTutorial();
}
function wrap(c, text, x, y, maxW, lh) {
    const words = String(text).split(' '); let line = '';
    for (const w of words) { const t = line ? line + ' ' + w : w; if (c.measureText(t).width > maxW && line) { c.fillText(line, x, y); y += lh; line = w; } else line = t; }
    if (line) { c.fillText(line, x, y); y += lh; } return y;
}
export function updateTutorial(dt) {
    if (!TUT.on) return;
    ST.vy = Math.max(ST.vy, playerBody.velocity.y);
    const step = STEPS[TUT.step];
    if (ST.doneT < 0 && stepDone(step, metrics())) ST.doneT = 1.0;   // chwila na pokazanie, że krok zaliczony
    if (ST.doneT >= 0) { ST.doneT -= dt; if (ST.doneT <= 0) { nextStep(); return; } }
    ST.hudT -= dt;
    if (ST.hud && ST.hudT <= 0) {
        ST.hudT = 0.2; const c = ST.hud.ctx, W = ST.hud.canvas.width; panelBg(ST.hud, 'rgba(10,8,16,0.82)', ST.doneT >= 0 ? '#9aff60' : '#ffb030');
        c.textBaseline = 'alphabetic'; c.textAlign = 'left'; c.font = 'bold 40px sans-serif'; c.fillStyle = ST.doneT >= 0 ? '#9aff60' : '#ffd27a';
        c.fillText((ST.doneT >= 0 ? '✔ ' : '') + step.title, 40, 66);
        c.textAlign = 'right'; c.font = '26px sans-serif'; c.fillStyle = '#a8a0b0'; c.fillText(progressText(TUT.step), W - 40, 62);
        c.textAlign = 'left'; c.font = '29px sans-serif'; c.fillStyle = '#f4ece6'; let y = 118;
        for (const l of step.lines) y = wrap(c, l, 40, y, W - 80, 36);
        c.font = '23px sans-serif'; c.fillStyle = '#ff9a6a'; c.fillText(step.kind === 'next' ? 'Trigger / Enter: next   |   Pause menu: skip' : 'Do it to continue   |   Enter: skip this step', 40, 232);
        ST.hud.update();
    }
}
export function debugTutorial() { return { on: TUT.on, step: TUT.step, id: STEPS[TUT.step] && STEPS[TUT.step].id, metrics: TUT.on ? metrics() : null, done: !!SAVE.tutorialDone }; }
