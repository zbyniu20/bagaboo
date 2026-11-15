// ==========================================
// URZĄDZENIE: wykrywa przeglądarkę gogli Meta Quest (Oculus Browser). Na Quest tniemy koszty, które na komputerze są pomijalne
// (filtrowanie anizotropowe, animacje strony startowej), a w trybie VR włącza się regulator wydajności (xrperf.js).
// ==========================================
export const IS_QUEST = typeof navigator !== 'undefined' && /OculusBrowser|Quest|Oculus/i.test(navigator.userAgent || '');
