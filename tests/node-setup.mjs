// Przygotowanie środowiska Node do testów logiki bez przeglądarki: atrapa localStorage i podmiana core/terminal.js
// (ekran terminala wymaga Three.js i DOM) na pustą atrapę dla core/economy.js. Importuj ten plik jako pierwszy.
import { register } from 'node:module';

const store = new Map();
Object.defineProperty(globalThis, 'localStorage', { configurable: true, writable: true, value: {
    getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => { store.set(k, String(v)); },
    removeItem: (k) => { store.delete(k); }, clear: () => store.clear(), get length() { return store.size; }, key: (i) => [...store.keys()][i] ?? null
} });
globalThis.__toasts = [];
const TERMINAL_STUB = 'export const toast = (m) => { (globalThis.__toasts || (globalThis.__toasts = [])).push(String(m)); }; export const markAllDirty = () => {};';
const hooks = `export async function resolve(spec, ctx, next) {
    if (spec === './terminal.js' && /\\/core\\/economy\\.js/.test(ctx.parentURL || '')) return { url: 'data:text/javascript,' + encodeURIComponent(${JSON.stringify(TERMINAL_STUB)}), shortCircuit: true };
    return next(spec, ctx);
}`;
register('data:text/javascript,' + encodeURIComponent(hooks));
