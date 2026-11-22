// ==========================================
// BECOME THE MONSTER: czysta logika polowania (bez THREE i sieci; testy: tests/modes/monster.mjs). Czas zawsze jako argument.
// Pulsy węchu: co PULSE_EVERY s (gdy został 1 uciekinier: co PULSE_LAST_EVERY s) potwór na PULSE_LEN s widzi uciekinierów przez ściany, a oni dostają ostrzeżenie sekundę wcześniej.
// Final Hunt: w ostatnich FINAL s potwór jest szybszy, a światło się czerwieni i miga. Strach: im bliżej potwór (FEAR_RANGE m), tym mocniejsza czerwona winieta u uciekiniera.
// Wszystko liczy każdy klient sam z zsynchronizowanego czasu rundy (nic dodatkowego nie idzie przez sieć).
// ==========================================
export const HUNT = { ROUND: 120, PULSE_EVERY: 22, PULSE_LAST_EVERY: 10, PULSE_LEN: 2.5, WARN: 1, FINAL: 30, FINAL_BOOST: 1.12, PULSE_BOT_BOOST: 1.2, FEAR_RANGE: 8, FEAR_NEAR: 2 };
const num = (v) => typeof v === 'number' && Number.isFinite(v);
// elapsed = sekundy od startu rundy, alive = liczba uciekinierów na wolności. Zwraca { active, warn, n }: n to numer pulsu (do jednorazowych zdarzeń), -1 gdy poza pulsem.
export function pulseAt(elapsed, alive) {
    if (!num(elapsed) || elapsed < 0 || !(alive >= 1)) return { active: false, warn: false, n: -1 };
    const period = alive <= 1 ? HUNT.PULSE_LAST_EVERY : HUNT.PULSE_EVERY, phase = elapsed % period, start = period - HUNT.PULSE_LEN, n = Math.floor(elapsed / period);
    if (elapsed >= start && phase >= start) return { active: true, warn: false, n: n };
    if (elapsed >= start - HUNT.WARN && phase >= start - HUNT.WARN && phase < start) return { active: false, warn: true, n: n };
    return { active: false, warn: false, n: -1 };
}
export const finalHunt = (timeLeft) => num(timeLeft) && timeLeft > 0 && timeLeft <= HUNT.FINAL;
export const monsterBoost = (base, timeLeft) => base * (finalHunt(timeLeft) ? HUNT.FINAL_BOOST : 1);
export const botBoost = (timeLeft, pulseActive) => (finalHunt(timeLeft) ? HUNT.FINAL_BOOST : 1) * (pulseActive ? HUNT.PULSE_BOT_BOOST : 1);
// Strach 0..1: 0 poza FEAR_RANGE, 1 w odległości FEAR_NEAR i bliżej
export function fearLevel(dist) { if (!num(dist) || dist < 0) return 0; return Math.max(0, Math.min(1, (HUNT.FEAR_RANGE - dist) / (HUNT.FEAR_RANGE - HUNT.FEAR_NEAR))); }
