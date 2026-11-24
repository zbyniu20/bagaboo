// ==========================================
// KLUCZE EKIPY (admini i moderatorzy): konto bez serwera.
// Klucz prywatny (ECDSA P-256) powstaje na urządzeniu admina i zostaje w localStorage; nigdy nie idzie przez sieć.
// Klucze PUBLICZNE ekipy są w repozytorium (`STAFF_KEYS` w core/config.js). Dowód wejścia do pokoju to krótki podpis
// (nick, adresat = host i pokój, nonce, ważność), więc host i gość mogą sprawdzić ekipę bez serwera kont.
// Tożsamości nie da się podrobić bez klucza prywatnego, a sam wpis nicku niczego nie daje.
// ==========================================
import { STAFF_KEYS, RESERVED_NICKS } from './config.js';

const KEY = 'bagaboo_staffkey';     // { nick, priv, pub } (JWK)
const ON = 'bagaboo_staffkey_on';   // '1' = ekipa zalogowała się kluczem na tym urządzeniu
const ALG = { name: 'ECDSA', namedCurve: 'P-256' };
const SIGN = { name: 'ECDSA', hash: 'SHA-256' };
const low = (n) => String(n || '').trim().toLowerCase();
const NICK_RE = /^[A-Za-z0-9_-]{3,16}$/;
const store = () => { try { return globalThis.localStorage || null; } catch (e) { return null; } };

function b64u(bytes) { let s = ''; for (const b of bytes) s += String.fromCharCode(b); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
function unb64u(s) { s = String(s).replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '='; const bin = atob(s), o = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) o[i] = bin.charCodeAt(i); return o; }
const enc = (o) => b64u(new TextEncoder().encode(JSON.stringify(o)));
const pubOf = (jwk) => ({ kty: 'EC', crv: 'P-256', x: jwk.x, y: jwk.y });
const samePub = (a, b) => !!a && !!b && a.x === b.x && a.y === b.y;

export function readKey() {
    try { const s = JSON.parse(store().getItem(KEY)); return s && typeof s.nick === 'string' && s.priv && s.pub ? s : null; } catch (e) { return null; }
}
// Nick ekipy, którego klucz publiczny jest wpisany w repozytorium (tylko wtedy ktokolwiek mu ufa)
export function registered(nick, pub) { const k = STAFF_KEYS[low(nick)]; return !!k && samePub(k, pub); }
export function canCreate(nick) { return NICK_RE.test(String(nick || '')) && RESERVED_NICKS.has(low(nick)); }

// Tworzy nową parę kluczy dla nicku ekipy i zapisuje ją lokalnie. Zwraca klucz publiczny do wpisania w config.js.
export async function createKey(nick) {
    if (!canCreate(nick)) return { ok: false, error: 'not_staff_nick' };
    const pair = await crypto.subtle.generateKey(ALG, true, ['sign', 'verify']);
    const priv = await crypto.subtle.exportKey('jwk', pair.privateKey), pub = pubOf(await crypto.subtle.exportKey('jwk', pair.publicKey));
    const rec = { nick: String(nick).trim(), priv: priv, pub: pub };
    try { store().setItem(KEY, JSON.stringify(rec)); } catch (e) { return { ok: false, error: 'storage' }; }
    return { ok: true, nick: rec.nick, pub: pub, registered: registered(rec.nick, pub) };
}
// Przenoszenie klucza na inne urządzenie (np. z telefonu do gogli): tekst z kluczem prywatnym, trzymaj go w tajemnicy
export function exportKey() { const k = readKey(); return k ? JSON.stringify({ nick: k.nick, priv: k.priv, pub: k.pub }) : ''; }
export function importKey(text) {
    try {
        const k = JSON.parse(String(text || '').trim());
        if (!k || !canCreate(k.nick) || !k.priv || k.priv.kty !== 'EC' || k.priv.crv !== 'P-256' || !k.priv.d || !k.priv.x || !k.priv.y) return { ok: false, error: 'bad_key' };
        const rec = { nick: String(k.nick).trim(), priv: k.priv, pub: pubOf(k.priv) };
        store().setItem(KEY, JSON.stringify(rec));
        return { ok: true, nick: rec.nick, registered: registered(rec.nick, rec.pub) };
    } catch (e) { return { ok: false, error: 'bad_key' }; }
}
export function removeKey() { try { store().removeItem(KEY); store().removeItem(ON); } catch (e) {} }

// Logowanie kluczem na tym urządzeniu: tylko dla klucza, który jest zarejestrowany w repozytorium
export function signIn() { const k = readKey(); if (!k || !registered(k.nick, k.pub)) return null; try { store().setItem(ON, '1'); } catch (e) {} return k.nick; }
export function signOut() { try { store().removeItem(ON); } catch (e) {} }
// Aktywna tożsamość ekipy albo null
export function localAccount() {
    const k = readKey(); let on = false; try { on = store().getItem(ON) === '1'; } catch (e) {}
    return on && k && registered(k.nick, k.pub) ? { id: 0, nick: k.nick, local: true } : null;
}

// Dowód wejścia: JWT-podobny `nagłówek.treść.podpis`; nagłówek ma typ LOCAL, więc nie pomyli się z dowodem serwera
export async function signProof(aud, nonce, lifeSec) {
    const k = readKey(); if (!k || !registered(k.nick, k.pub)) return null;
    const head = enc({ alg: 'ES256', typ: 'LOCAL' }), body = enc({ typ: 'join', aud: aud, nonce: nonce, nick: k.nick, exp: Math.floor(Date.now() / 1000) + (lifeSec || 120) });
    const key = await crypto.subtle.importKey('jwk', k.priv, ALG, false, ['sign']);
    const sig = new Uint8Array(await crypto.subtle.sign(SIGN, key, new TextEncoder().encode(head + '.' + body)));
    return head + '.' + body + '.' + b64u(sig);
}
// Sprawdza dowód klucza ekipy. Zwraca nick albo null. `parsed` to { head, body, sig, claims } z auth.js
export async function verifyLocal(parsed, aud, nonce) {
    try {
        const h = JSON.parse(new TextDecoder().decode(unb64u(parsed.head)));
        if (!h || h.typ !== 'LOCAL') return null;
        const c = parsed.claims;
        if (!c || c.typ !== 'join' || c.aud !== aud || c.nonce !== nonce || !(c.exp * 1000 > Date.now()) || typeof c.nick !== 'string' || !NICK_RE.test(c.nick)) return null;
        const pub = STAFF_KEYS[low(c.nick)]; if (!pub) return null;
        const key = await crypto.subtle.importKey('jwk', pubOf(pub), ALG, false, ['verify']);
        const ok = await crypto.subtle.verify(SIGN, key, unb64u(parsed.sig), new TextEncoder().encode(parsed.head + '.' + parsed.body));
        return ok ? c.nick : null;
    } catch (e) { return null; }
}
