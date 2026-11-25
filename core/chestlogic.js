// ==========================================
// SKRZYNIA NOCNA (czysta logika, bez THREE): raz dziennie darmowe losowanie w lobby. Stan: SAVE.chest (core/nightchest.js).
// Kolejne dni z rzędu zwiększają szansę na rzadką nagrodę, a co siódmy dzień z rzędu rzadka nagroda jest pewna. Rzadka to kosmetyk, którego jeszcze nie masz
// (gdy masz wszystkie z puli, dostajesz Bagabucksy). Nagrodę losuje funkcja z przekazanego generatora, więc testy są deterministyczne.
// ==========================================
export const CHEST = { COMMON_BONES: [40, 90], UNCOMMON_BONES: [120, 220], RARE_BONES: 400, RARE_BASE: 0.08, RARE_PER_DAY: 0.02, UNCOMMON_CHANCE: 0.22, PITY: 7 };

// Wczoraj względem daty RRRR-MM-DD (UTC, jak dziennik zadań); zła data daje ''
export function yesterdayOf(iso) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(iso))) return '';
    const d = new Date(iso + 'T00:00:00Z'); if (Number.isNaN(d.getTime())) return '';
    d.setUTCDate(d.getUTCDate() - 1); return d.toISOString().slice(0, 10);
}
export function normalizeChest(raw) {
    const out = { last: '', streak: 0, total: 0, tier: '' };
    if (raw && typeof raw === 'object') {
        if (/^\d{4}-\d{2}-\d{2}$/.test(String(raw.last))) out.last = raw.last;
        if (Number.isInteger(raw.streak) && raw.streak > 0 && raw.streak < 100000) out.streak = raw.streak;
        if (Number.isInteger(raw.total) && raw.total > 0 && raw.total < 1e7) out.total = raw.total;
        if (['common', 'uncommon', 'rare'].includes(raw.tier)) out.tier = raw.tier;
    }
    return out;
}
export const canOpen = (st, today) => /^\d{4}-\d{2}-\d{2}$/.test(String(today)) && st.last !== today;
// Seria po otwarciu dziś: wczoraj otwarta = +1, w przeciwnym razie od nowa
export const streakAfter = (st, today) => (st.last && st.last === yesterdayOf(today) ? st.streak + 1 : 1);
// Ile dni z rzędu (licząc dziś) potrzeba do pewnej rzadkiej nagrody
export const daysToRare = (streak) => { const r = CHEST.PITY - (streak % CHEST.PITY); return r === 0 ? CHEST.PITY : r; };
export function tierWeights(streak) {
    const rare = Math.min(0.3, CHEST.RARE_BASE + CHEST.RARE_PER_DAY * Math.max(0, Math.min(streak, 7) - 1)), unc = CHEST.UNCOMMON_CHANCE;
    return { rare: rare, uncommon: unc, common: 1 - rare - unc };
}
const span = (range, r) => range[0] + Math.floor(r() * (range[1] - range[0] + 1));
// Losowanie: rand to funkcja 0..1, streak to seria PO tym otwarciu, pool to klucze kosmetyków do wygrania ('hat:cap'). Zwraca { tier, bones, item }
export function rollReward(rand, streak, pool) {
    const w = tierWeights(streak), x = rand();
    let tier = x < w.rare ? 'rare' : (x < w.rare + w.uncommon ? 'uncommon' : 'common');
    if (streak > 0 && streak % CHEST.PITY === 0) tier = 'rare';
    if (tier === 'rare') {
        const list = Array.isArray(pool) ? pool : [];
        if (list.length) return { tier: 'rare', bones: 0, item: list[Math.min(list.length - 1, Math.floor(rand() * list.length))] };
        return { tier: 'rare', bones: CHEST.RARE_BONES, item: null };
    }
    return { tier: tier, bones: span(tier === 'uncommon' ? CHEST.UNCOMMON_BONES : CHEST.COMMON_BONES, rand), item: null };
}
export const afterOpen = (st, today, reward) => ({ last: today, streak: streakAfter(st, today), total: st.total + 1, tier: reward.tier });
