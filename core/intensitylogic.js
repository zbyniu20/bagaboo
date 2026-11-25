// ==========================================
// POZIOM BRUTALNOŚCI (czysta logika, bez THREE): jeden wybór gracza ustawia razem krew i urwane kończyny (gore), nagłe straszenie (jumpscare'y)
// i nawiedzenia w salach (lobbyEvents). Ekran ostrzeżenia przy pierwszym wejściu na stronę i przycisk w menu pauzy używają tych samych ustawień.
// ==========================================
export const LEVELS = ['full', 'medium', 'gentle'];
export const PRESETS = {
    full: { gore: true, jumpscares: true, lobbyEvents: true },
    medium: { gore: false, jumpscares: true, lobbyEvents: true },
    gentle: { gore: false, jumpscares: false, lobbyEvents: false }
};
export const LABELS = { full: 'Full horror', medium: 'Medium', gentle: 'Gentle', custom: 'Custom' };
export const DESCRIPTIONS = {
    full: 'Gore, torn-off limbs, jump scares and haunted rooms.',
    medium: 'Jump scares and haunted rooms, no gore.',
    gentle: 'No gore, no jump scares, no haunting. Still dark and tense.'
};
// Który poziom pasuje do ustawień ('custom', gdy gracz przestawił je ręcznie)
export function intensityOf(s) {
    for (const k of LEVELS) { const p = PRESETS[k]; if (!!s.gore === p.gore && s.jumpscares !== false === p.jumpscares && !!s.lobbyEvents === p.lobbyEvents) return k; }
    return 'custom';
}
// Ustawia poziom na obiekcie ustawień; nieznany poziom nic nie zmienia (zwraca false)
export function applyIntensity(s, level) {
    const p = PRESETS[level]; if (!p) return false;
    s.gore = p.gore; s.jumpscares = p.jumpscares; s.lobbyEvents = p.lobbyEvents; return true;
}
// Przycisk w menu pauzy: kolejny poziom (z 'custom' wracamy do pełnego)
export function nextIntensity(level) { const i = LEVELS.indexOf(level); return LEVELS[(i + 1) % LEVELS.length]; }
// Ostrzeżenie pokazujemy raz: dopóki gracz nie wybrał poziomu
export const needsWarning = (s) => s.warned !== true;
