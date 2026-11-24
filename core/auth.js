// ==========================================
// KONTA: logowanie do serwera kont (bagaboo-api, Cloudflare Worker) i dowody wejścia do pokoju.
// Gracz zakłada konto albo loguje się nickiem i hasłem; serwer zwraca token sesji (ważny 7 dni), który leży w localStorage.
// Hasła nigdzie się nie zapisują. Wchodząc do pokoju, gracz prosi serwer o krótki dowód przypisany do konkretnego hosta
// (vouch), a host sprawdza go kluczem publicznym serwera (verifyProof), więc nick potwierdza serwer, a nie sam klient.
// Kod serwera: katalog bagaboo-api (osobne repozytorium, nie jest częścią strony).
// ==========================================
export const API_URL = 'https://bagaboo-api.bagaboo-api.workers.dev';
// Klucz publiczny serwera kont (ES256, GET /pubkey). Zmiana klucza na serwerze wymaga wpisania tu nowego.
const SERVER_KEY = { kty: 'EC', crv: 'P-256', x: 'AGYlRJ1xTyj3QBHSlF9-P3uVBTBEAWKO_l6xAR0wxCE', y: 'rQlXVK8g7NcIhxTMPWsMMr3o83efg_4H-VkT3rw-UlU' };
import { FEATURES } from './config.js';
import { localAccount, signProof, verifyLocal, signOut } from './staffkey.js';
const SESSION_KEY = 'bagaboo_session';
export const NICK_RE = /^[A-Za-z0-9_-]{3,16}$/;

const listeners = [];
export function onAuthChange(fn) { listeners.push(fn); }
function notify() { const a = account(); listeners.forEach(f => { try { f(a); } catch (e) {} }); }

function b64uToBytes(s) {
    s = String(s).replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '=';
    const bin = atob(s), out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
}
function parseJwt(t) {
    const p = String(t || '').split('.'); if (p.length !== 3) return null;
    try { return { head: p[0], body: p[1], sig: p[2], claims: JSON.parse(new TextDecoder().decode(b64uToBytes(p[1]))) }; } catch (e) { return null; }
}

// ---------- sesja ----------
function loadSession() {
    try {
        const s = JSON.parse(localStorage.getItem(SESSION_KEY));
        return s && typeof s.token === 'string' && typeof s.nick === 'string' && s.exp * 1000 > Date.now() ? s : null;
    } catch (e) { return null; }
}
let session = loadSession();
function saveSession(token, acc) {
    const j = parseJwt(token);
    session = { token: token, id: acc.id, nick: acc.nick, exp: j && j.claims ? j.claims.exp : 0 };
    try { localStorage.setItem(SESSION_KEY, JSON.stringify(session)); } catch (e) {}
    notify();
}
export function logout() { session = null; signOut(); try { localStorage.removeItem(SESSION_KEY); } catch (e) {} notify(); }
// Zalogowane konto albo null
export function accountsOn() { try { return FEATURES.accounts || /[?&]accounts=1\b/.test(globalThis.location && globalThis.location.search || ''); } catch (e) { return FEATURES.accounts; } }
export function account() { if (!accountsOn()) return null; return session && session.exp * 1000 > Date.now() ? { id: session.id, nick: session.nick } : localAccount(); }   // konto z serwera albo klucz ekipy z tego urządzenia
export function isLoggedIn() { return !!account(); }

// ---------- rozmowa z serwerem ----------
async function call(path, opts) {
    const ctl = new AbortController(), to = setTimeout(() => ctl.abort(), 10000);
    try {
        const r = await fetch(API_URL + path, Object.assign({ signal: ctl.signal }, opts));
        let data = null; try { data = await r.json(); } catch (e) {}
        return { status: r.status, data: data || {} };
    } catch (e) { return { status: 0, data: { ok: false, error: 'network' } }; }
    finally { clearTimeout(to); }
}
const post = (path, body, token) => call(path, { method: 'POST', headers: Object.assign({ 'Content-Type': 'application/json' }, token ? { Authorization: 'Bearer ' + token } : {}), body: JSON.stringify(body) });

function finish(r) {
    const d = r.data;
    if (r.status >= 200 && r.status < 300 && d.ok && d.token && d.account) { saveSession(d.token, d.account); return { ok: true, recoveryCode: d.recoveryCode || null, account: d.account }; }
    return { ok: false, error: d.error || 'server_error', retryAfterSec: d.retryAfterSec };
}
export async function register(nick, password) { return finish(await post('/register', { nick: nick, password: password })); }
export async function login(nick, password) { return finish(await post('/login', { nick: nick, password: password })); }
export async function resetPassword(nick, recoveryCode, newPassword) { return finish(await post('/reset', { nick: nick, recoveryCode: recoveryCode, newPassword: newPassword })); }
// Sprawdza zapisaną sesję na serwerze (np. po zmianie hasła przez admina). Błąd sieci nie wylogowuje.
export async function refresh() {
    if (!accountsOn() || !session) return null;
    const r = await call('/me', { headers: { Authorization: 'Bearer ' + session.token } });
    if (r.status === 401) { logout(); return null; }
    return account();
}
export function errorText(res) {
    const e = res && res.error;
    if (e === 'bad_nick') return 'Nickname: 3 to 16 characters, only letters, digits, _ and -.';
    if (e === 'bad_password') return 'Password must have 8 to 100 characters.';
    if (e === 'nick_taken') return 'This nickname is already taken.';
    if (e === 'reserved_nick') return 'This nickname is reserved for the staff.';
    if (e === 'bad_credentials') return 'Wrong nickname or password.';
    if (e === 'bad_recovery') return 'Wrong recovery code.';
    if (e === 'locked') return 'Too many attempts. Try again in ' + Math.max(1, Math.ceil((res.retryAfterSec || 60) / 60)) + ' min.';
    if (e === 'network') return 'Cannot reach the account server. Check your connection.';
    return 'Something went wrong. Try again.';
}

// ---------- dowód wejścia do pokoju ----------
export function randomNonce() {
    const a = new Uint8Array(16); crypto.getRandomValues(a);
    return Array.from(a).map(b => b.toString(16).padStart(2, '0')).join('');
}
// Gość: prosi serwer o dowód dla tego hosta i tej liczby (nonce). Null, gdy nie jest zalogowany albo serwer nie odpowiada.
export async function vouch(aud, nonce) {
    if (!accountsOn()) return null;
    if (!session) return signProof(aud, nonce);   // ekipa z kluczem lokalnym podpisuje sama, bez serwera
    const r = await post('/vouch', { aud: aud, nonce: nonce }, session.token);
    return r.data && r.data.ok && typeof r.data.proof === 'string' ? r.data.proof : null;
}
// Host: sprawdza dowód (podpis serwera, adresat, nonce, ważność). Zwraca zweryfikowany nick albo null.
let serverKeyPromise = null;
function serverKey() { return serverKeyPromise || (serverKeyPromise = crypto.subtle.importKey('jwk', SERVER_KEY, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify'])); }
export async function verifyProof(proof, aud, nonce) {
    const j = parseJwt(proof); if (!j || !j.claims) return null;
    if (j.head && /^[A-Za-z0-9_-]+$/.test(j.head) && (await verifyLocal(j, aud, nonce))) return j.claims.nick;   // dowód klucza ekipy
    try {
        const ok = await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, await serverKey(), b64uToBytes(j.sig), new TextEncoder().encode(j.head + '.' + j.body));
        if (!ok) return null;
    } catch (e) { return null; }
    const c = j.claims;
    if (c.typ !== 'join' || c.aud !== aud || c.nonce !== nonce || !(c.exp * 1000 > Date.now()) || typeof c.nick !== 'string' || !NICK_RE.test(c.nick)) return null;
    return c.nick;
}
