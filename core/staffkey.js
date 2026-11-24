// ==========================================
// KLUCZE EKIPY (admini i moderatorzy): konto bez serwera.
// Klucz prywatny (ECDSA P-256) powstaje na urządzeniu admina i zostaje w localStorage zaszyfrowany PIN-em, który ekipa sama wybiera przy pierwszej wizycie; nigdy nie idzie przez sieć.
// Klucze PUBLICZNE ekipy są w repozytorium (`STAFF_KEYS` w core/config.js). Dowód wejścia do pokoju to krótki podpis
// (nick, adresat = host i pokój, nonce, ważność), więc host i gość mogą sprawdzić ekipę bez serwera kont.
// Tożsamości nie da się podrobić bez klucza prywatnego, a sam wpis nicku niczego nie daje.
// ==========================================
import { STAFF_KEYS, RESERVED_NICKS } from './config.js';

const KEY = 'bagaboo_staffkey';     // { nick, pub, enc: { salt, iv, data } }: klucz prywatny jest zaszyfrowany PIN-em (PBKDF2 + AES-GCM)
const TRY = 'bagaboo_staffkey_tries';   // { n, until }: blokada po serii błędnych PIN-ów
const ALG = { name: 'ECDSA', namedCurve: 'P-256' };
const SIGN = { name: 'ECDSA', hash: 'SHA-256' };
const ITER = 150000, MAX_TRIES = 5, LOCK_MS = 5 * 60 * 1000;
export const PIN_RE = /^[0-9]{4,12}$/;
const low = (n) => String(n || '').trim().toLowerCase();
const NICK_RE = /^[A-Za-z0-9_-]{3,16}$/;
const store = () => { try { return globalThis.localStorage || null; } catch (e) { return null; } };
let unlocked = null;   // { nick, key } tylko w pamięci tej karty: po odświeżeniu strony trzeba znów podać PIN

function b64u(bytes) { let s = ''; for (const b of bytes) s += String.fromCharCode(b); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
function unb64u(s) { s = String(s).replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '='; const bin = atob(s), o = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) o[i] = bin.charCodeAt(i); return o; }
const enc = (o) => b64u(new TextEncoder().encode(JSON.stringify(o)));
const pubOf = (jwk) => ({ kty: 'EC', crv: 'P-256', x: jwk.x, y: jwk.y });
const samePub = (a, b) => !!a && !!b && a.x === b.x && a.y === b.y;

async function pinKey(pin, salt) {
    const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(String(pin)), 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey({ name: 'PBKDF2', hash: 'SHA-256', salt: salt, iterations: ITER }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}
async function seal(privJwk, pin) {
    const salt = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12));
    const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv }, await pinKey(pin, salt), new TextEncoder().encode(JSON.stringify(privJwk)));
    return { salt: b64u(salt), iv: b64u(iv), data: b64u(new Uint8Array(ct)) };
}
async function open(box, pin) {
    try { return JSON.parse(new TextDecoder().decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64u(box.iv) }, await pinKey(pin, unb64u(box.salt)), unb64u(box.data)))); } catch (e) { return null; }
}
function validRec(k) { return !!k && typeof k.nick === 'string' && canCreate(k.nick) && k.pub && k.pub.x && k.pub.y && k.enc && typeof k.enc.salt === 'string' && typeof k.enc.iv === 'string' && typeof k.enc.data === 'string'; }

export function readKey() { try { const k = JSON.parse(store().getItem(KEY)); return validRec(k) ? k : null; } catch (e) { return null; } }
export function hasKey() { return !!readKey(); }
// Nick ekipy, którego klucz publiczny jest wpisany w repozytorium (tylko wtedy ktokolwiek mu ufa)
export function registered(nick, pub) { const k = STAFF_KEYS[low(nick)]; return !!k && samePub(k, pub); }
export function canCreate(nick) { return NICK_RE.test(String(nick || '')) && RESERVED_NICKS.has(low(nick)); }

// Blokada po błędnych PIN-ach (lokalna: chroni przed zgadywaniem przy zgubionym urządzeniu, ale PIN i tak jest tylko lokalną osłoną klucza)
function lockLeft() { try { const t = JSON.parse(store().getItem(TRY)); return t && t.until > Date.now() ? t.until - Date.now() : 0; } catch (e) { return 0; } }
function failed() { let t = { n: 0, until: 0 }; try { t = JSON.parse(store().getItem(TRY)) || t; } catch (e) {} t.n = (t.until && t.until <= Date.now() ? 0 : t.n || 0) + 1; if (t.n >= MAX_TRIES) { t.until = Date.now() + LOCK_MS; t.n = 0; } try { store().setItem(TRY, JSON.stringify(t)); } catch (e) {} }
function cleared() { try { store().removeItem(TRY); } catch (e) {} }

async function unlockWith(rec, privJwk) {
    unlocked = { nick: rec.nick, key: await crypto.subtle.importKey('jwk', privJwk, ALG, false, ['sign']) };
}
// Pierwsza wizyta: ekipa wybiera własny PIN (4-12 cyfr). Powstaje nowa para kluczy, klucz prywatny zostaje zaszyfrowany PIN-em.
export async function createKey(nick, pin) {
    if (!canCreate(nick)) return { ok: false, error: 'not_staff_nick' };
    if (!PIN_RE.test(String(pin || ''))) return { ok: false, error: 'bad_pin' };
    const pair = await crypto.subtle.generateKey(ALG, true, ['sign', 'verify']);
    const priv = await crypto.subtle.exportKey('jwk', pair.privateKey), pub = pubOf(await crypto.subtle.exportKey('jwk', pair.publicKey));
    const rec = { nick: String(nick).trim(), pub: pub, enc: await seal(priv, pin) };
    try { store().setItem(KEY, JSON.stringify(rec)); cleared(); } catch (e) { return { ok: false, error: 'storage' }; }
    await unlockWith(rec, priv);
    return { ok: true, nick: rec.nick, pub: pub, registered: registered(rec.nick, pub) };
}
// Odblokowanie PIN-em i logowanie: tylko dla klucza, który jest zarejestrowany w repozytorium
export async function signIn(pin) {
    const rec = readKey(); if (!rec) return { ok: false, error: 'no_key' };
    const left = lockLeft(); if (left > 0) return { ok: false, error: 'locked', retryAfterSec: Math.ceil(left / 1000) };
    const priv = await open(rec.enc, String(pin || '')); if (!priv) { failed(); return { ok: false, error: 'bad_pin' }; }
    cleared();
    if (!registered(rec.nick, rec.pub)) return { ok: false, error: 'not_registered' };
    await unlockWith(rec, priv);
    return { ok: true, nick: rec.nick };
}
export function signOut() { unlocked = null; }
export async function changePin(oldPin, newPin) {
    const rec = readKey(); if (!rec) return { ok: false, error: 'no_key' };
    if (!PIN_RE.test(String(newPin || ''))) return { ok: false, error: 'bad_pin' };
    const left = lockLeft(); if (left > 0) return { ok: false, error: 'locked', retryAfterSec: Math.ceil(left / 1000) };
    const priv = await open(rec.enc, String(oldPin || '')); if (!priv) { failed(); return { ok: false, error: 'bad_pin' }; }
    cleared(); rec.enc = await seal(priv, newPin); try { store().setItem(KEY, JSON.stringify(rec)); } catch (e) { return { ok: false, error: 'storage' }; }
    return { ok: true };
}
// Przenoszenie na inne urządzenie: eksport to ZASZYFROWANY klucz (bez PIN-u nic nie wart), import wymaga tego samego PIN-u przy logowaniu
export function exportKey() { const k = readKey(); return k ? JSON.stringify({ nick: k.nick, pub: k.pub, enc: k.enc }) : ''; }
export function importKey(text) {
    try {
        const k = JSON.parse(String(text || '').trim());
        if (!validRec(k)) return { ok: false, error: 'bad_key' };
        const rec = { nick: String(k.nick).trim(), pub: pubOf(k.pub), enc: { salt: k.enc.salt, iv: k.enc.iv, data: k.enc.data } };
        store().setItem(KEY, JSON.stringify(rec)); cleared(); unlocked = null;
        return { ok: true, nick: rec.nick, registered: registered(rec.nick, rec.pub) };
    } catch (e) { return { ok: false, error: 'bad_key' }; }
}
export function removeKey() { try { store().removeItem(KEY); store().removeItem(TRY); } catch (e) {} unlocked = null; }
// Aktywna tożsamość ekipy (odblokowana PIN-em w tej karcie) albo null
export function localAccount() {
    const k = readKey();
    return unlocked && k && unlocked.nick === k.nick && registered(k.nick, k.pub) ? { id: 0, nick: k.nick, local: true } : null;
}

// Dowód wejścia: JWT-podobny `nagłówek.treść.podpis`; nagłówek ma typ LOCAL, więc nie pomyli się z dowodem serwera
export async function signProof(aud, nonce, lifeSec) {
    const k = readKey(); if (!k || !unlocked || unlocked.nick !== k.nick || !registered(k.nick, k.pub)) return null;
    const head = enc({ alg: 'ES256', typ: 'LOCAL' }), body = enc({ typ: 'join', aud: aud, nonce: nonce, nick: k.nick, exp: Math.floor(Date.now() / 1000) + (lifeSec || 120) });
    const sig = new Uint8Array(await crypto.subtle.sign(SIGN, unlocked.key, new TextEncoder().encode(head + '.' + body)));
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
