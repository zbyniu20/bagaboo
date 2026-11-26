// ==========================================
// NOWE KOSMETYKI (sezonowe, tygodniowe i za wyzwania): czapki, okulary, maski, rękawy, rękawice, skórki i odznaki.
// Każdy przedmiot to kilka prostych brył. avatar.js wywołuje te funkcje, gdy nie zna id przedmiotu.
// Układ głowy: środek w 0,0,0, patrzy w -Z, góra czaszki na ok. y = 0.14.
// ==========================================
import { THREE, tex } from './engine.js';
import { LP } from './config.js';
import { makeCanvas, toTex } from './textures.js';

const ENV = LP.envIntensity;
const mat = (o) => new THREE.MeshStandardMaterial(Object.assign({ envMapIntensity: ENV, roughness: 0.6 }, o));
const at = (geo, m, x, y, z) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = true; return o; };
const dark = () => new THREE.MeshBasicMaterial({ color: 0x050505 });
const cache = {};

// ---------- CZAPKI ----------
export function extraHat(id) {
    const g = new THREE.Group();
    if (id === 'santa') {
        const red = mat({ color: 0xc01818, roughness: 0.9 }), white = mat({ color: 0xf4f0ea, roughness: 1 });
        const cone = at(new THREE.ConeGeometry(0.13, 0.3, 18), red, 0, 0.26, 0.04); cone.rotation.x = 0.35; g.add(cone);
        g.add(at(new THREE.TorusGeometry(0.135, 0.032, 10, 24), white, 0, 0.1, 0).rotateX(Math.PI / 2));
        g.add(at(new THREE.SphereGeometry(0.04, 12, 10), white, 0, 0.38, 0.14));
    } else if (id === 'pumpkin') {
        const o = mat({ color: 0xe0701a, roughness: 0.6, emissive: 0x3a1000 });
        const p = at(new THREE.SphereGeometry(0.15, 20, 14), o, 0, 0.18, 0); p.scale.set(1, 0.82, 1); g.add(p);
        g.add(at(new THREE.CylinderGeometry(0.018, 0.028, 0.07, 8), mat({ color: 0x2a5a1a }), 0, 0.31, 0));
        for (const s of [-1, 1]) g.add(at(new THREE.ConeGeometry(0.022, 0.04, 3), new THREE.MeshBasicMaterial({ color: 0xffb020 }), s * 0.05, 0.21, -0.14).rotateX(-Math.PI / 2));
    } else if (id === 'witch') {
        const b = mat({ color: 0x14101a, roughness: 0.9 });
        g.add(at(new THREE.CylinderGeometry(0.23, 0.23, 0.012, 28), b, 0, 0.1, 0));
        const cone = at(new THREE.ConeGeometry(0.12, 0.34, 18), b, 0, 0.28, 0.01); cone.rotation.x = -0.12; g.add(cone);
        g.add(at(new THREE.CylinderGeometry(0.122, 0.128, 0.04, 18), mat({ color: 0x7a2aa0 }), 0, 0.14, 0));
    } else if (id === 'bunny') {
        const w = mat({ color: 0xf4f0f0, roughness: 0.9 }), pink = mat({ color: 0xf0a0b8, roughness: 0.9 });
        for (const s of [-1, 1]) {
            const ear = at(new THREE.CapsuleGeometry(0.03, 0.2, 4, 8), w, s * 0.06, 0.31, 0.02); ear.rotation.z = s * 0.15; g.add(ear);
            const in2 = at(new THREE.CapsuleGeometry(0.016, 0.16, 4, 8), pink, s * 0.06, 0.31, -0.005); in2.rotation.z = s * 0.15; g.add(in2);
        }
        g.add(at(new THREE.TorusGeometry(0.135, 0.01, 6, 24, Math.PI), mat({ color: 0x555555 }), 0, 0.06, 0).rotateY(Math.PI / 2));
    } else if (id === 'party') {
        const c = at(new THREE.ConeGeometry(0.08, 0.26, 14), mat({ color: 0xff3aa0, roughness: 0.5 }), 0, 0.26, 0); c.rotation.x = 0.15; g.add(c);
        for (let i = 0; i < 3; i++) g.add(at(new THREE.TorusGeometry(0.06 - i * 0.012, 0.006, 6, 16), mat({ color: 0xffe040 }), 0, 0.18 + i * 0.06, 0.02 + i * 0.008).rotateX(Math.PI / 2 + 0.15));
        g.add(at(new THREE.SphereGeometry(0.025, 10, 8), mat({ color: 0xffe040 }), 0, 0.4, 0.04));
    } else if (id === 'wizard') {
        const b = mat({ color: 0x1a2a7a, roughness: 0.85 });
        g.add(at(new THREE.CylinderGeometry(0.2, 0.2, 0.012, 26), b, 0, 0.1, 0));
        const cone = at(new THREE.ConeGeometry(0.115, 0.42, 18), b, 0, 0.32, 0.03); cone.rotation.x = -0.2; g.add(cone);
        g.add(at(new THREE.CylinderGeometry(0.118, 0.124, 0.035, 18), mat({ color: 0xd4a640, metalness: 1, roughness: 0.3 }), 0, 0.13, 0));
        g.add(at(new THREE.SphereGeometry(0.02, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffe880 }), 0.0, 0.2, -0.12));
    } else if (id === 'cone') {
        g.add(at(new THREE.ConeGeometry(0.11, 0.3, 18), mat({ color: 0xff6a10, roughness: 0.5 }), 0, 0.25, 0));
        g.add(at(new THREE.CylinderGeometry(0.075, 0.09, 0.05, 18), mat({ color: 0xf4f0ea }), 0, 0.23, 0));
        g.add(at(new THREE.BoxGeometry(0.26, 0.02, 0.26), mat({ color: 0xff6a10 }), 0, 0.1, 0));
    } else if (id === 'headphones') {
        const m = mat({ color: 0x1a1a1e, metalness: 0.4, roughness: 0.4 }), cup = mat({ color: 0xff4a2a, roughness: 0.4 });
        g.add(at(new THREE.TorusGeometry(0.155, 0.012, 8, 28, Math.PI), m, 0, 0.0, 0).rotateY(Math.PI / 2));
        for (const s of [-1, 1]) { const c = at(new THREE.CylinderGeometry(0.045, 0.045, 0.035, 18), cup, s * 0.158, -0.005, 0); c.rotation.z = Math.PI / 2; g.add(c); }
    } else if (id === 'nursecap') {
        const w = mat({ color: 0xf4f4f0, roughness: 0.8 });
        g.add(at(new THREE.CylinderGeometry(0.115, 0.13, 0.1, 18), w, 0, 0.14, 0));
        g.add(at(new THREE.BoxGeometry(0.1, 0.1, 0.01), w, 0, 0.12, -0.13));
        const red = mat({ color: 0xd01818 });
        g.add(at(new THREE.BoxGeometry(0.05, 0.016, 0.012), red, 0, 0.155, -0.138));
        g.add(at(new THREE.BoxGeometry(0.016, 0.05, 0.012), red, 0, 0.155, -0.138));
    } else if (id === 'bellhop') {
        const red = mat({ color: 0xb01820, roughness: 0.7 }), gold = mat({ color: 0xd8b040, metalness: 0.8, roughness: 0.35 });
        g.add(at(new THREE.CylinderGeometry(0.1, 0.12, 0.14, 18), red, 0, 0.12, 0));
        g.add(at(new THREE.CylinderGeometry(0.121, 0.121, 0.025, 18), gold, 0, 0.1, 0));
        g.add(at(new THREE.SphereGeometry(0.02, 8, 6), gold, 0, 0.2, 0));
    } else if (id === 'teddyears') {
        const fur = mat({ color: 0xa87038, roughness: 0.95 }), inner = mat({ color: 0xe8a0a0, roughness: 0.9 });
        for (const s of [-1, 1]) { const e = at(new THREE.SphereGeometry(0.06, 10, 8), fur, s * 0.1, 0.15, 0); e.scale.z = 0.7; g.add(e); const i2 = at(new THREE.SphereGeometry(0.035, 8, 6), inner, s * 0.1, 0.15, -0.025); i2.scale.z = 0.5; g.add(i2); }
        g.add(at(new THREE.TorusGeometry(0.14, 0.012, 6, 24, Math.PI), fur, 0, 0.09, 0).rotateY(Math.PI / 2));
    } else if (id === 'prisoncap') {
        const white = mat({ color: 0xe8e4d8, roughness: 0.9 }), black = mat({ color: 0x1a1a1a, roughness: 0.9 });
        g.add(at(new THREE.CylinderGeometry(0.115, 0.13, 0.1, 18), white, 0, 0.14, 0));
        for (const y of [0.12, 0.155]) g.add(at(new THREE.CylinderGeometry(0.1165, 0.1315, 0.016, 18), black, 0, y, 0));
        g.add(at(new THREE.BoxGeometry(0.2, 0.012, 0.07), white, 0, 0.1, -0.14));
    } else if (id === 'palmhat') {
        const straw = mat({ color: 0xd8b86a, roughness: 0.9 }), leaf = mat({ color: 0x2f8a3a, roughness: 0.8, side: THREE.DoubleSide });
        g.add(at(new THREE.CylinderGeometry(0.2, 0.2, 0.012, 20), straw, 0, 0.1, 0)); g.add(at(new THREE.CylinderGeometry(0.11, 0.12, 0.09, 16), straw, 0, 0.14, 0));
        for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2, f = at(new THREE.BoxGeometry(0.05, 0.006, 0.22), leaf, Math.cos(a) * 0.1, 0.26, Math.sin(a) * 0.1); f.rotation.y = -a + Math.PI / 2; f.rotation.x = -0.7; g.add(f); }
    } else if (id === 'minerhelmet') {
        const yellow = mat({ color: 0xe8b820, roughness: 0.55 }), dark = mat({ color: 0x2a2a2e, metalness: 0.6, roughness: 0.45 });
        const dome = at(new THREE.SphereGeometry(0.135, 18, 12, 0, Math.PI * 2, 0, Math.PI / 2), yellow, 0, 0.1, 0); g.add(dome);
        g.add(at(new THREE.CylinderGeometry(0.15, 0.15, 0.025, 18), yellow, 0, 0.1, 0));
        g.add(at(new THREE.BoxGeometry(0.03, 0.02, 0.26), yellow, 0, 0.235, 0));
        g.add(at(new THREE.CylinderGeometry(0.035, 0.04, 0.05, 10), dark, 0, 0.17, -0.15).rotateX(Math.PI / 2));
        const lens = at(new THREE.CircleGeometry(0.03, 10), mat({ color: 0xfff0c0, emissive: 0xffe090, emissiveIntensity: 1.6 }), 0, 0.17, -0.178); lens.rotation.y = Math.PI; g.add(lens);
    } else if (id === 'skullcrown') {
        const bone = mat({ color: 0xe6dcc0, roughness: 0.6 }), dark = mat({ color: 0x1a1412 });
        g.add(at(new THREE.CylinderGeometry(0.14, 0.15, 0.06, 16), bone, 0, 0.1, 0));
        for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2, s = at(new THREE.SphereGeometry(0.04, 8, 6), bone, Math.cos(a) * 0.14, 0.17, Math.sin(a) * 0.14); s.scale.y = 1.2; g.add(s); for (const ex of [-1, 1]) g.add(at(new THREE.SphereGeometry(0.009, 5, 4), dark, Math.cos(a) * 0.17 - Math.sin(a) * 0.015 * ex, 0.18, Math.sin(a) * 0.17 + Math.cos(a) * 0.015 * ex)); }
    } else if (id === 'lanternhat') {
        const iron = mat({ color: 0x2a2a2e, metalness: 0.8, roughness: 0.4 });
        g.add(at(new THREE.CylinderGeometry(0.05, 0.06, 0.1, 10), mat({ color: 0xffc860, emissive: 0xffa020, emissiveIntensity: 1.4 }), 0, 0.28, 0));
        g.add(at(new THREE.ConeGeometry(0.065, 0.05, 10), iron, 0, 0.36, 0));
        g.add(at(new THREE.CylinderGeometry(0.008, 0.008, 0.16, 5), iron, 0, 0.19, 0));
        g.add(at(new THREE.CylinderGeometry(0.13, 0.14, 0.03, 18), iron, 0, 0.1, 0));
        const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex.dot, color: 0xffc070, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.8 })); glow.scale.set(0.35, 0.35, 1); glow.position.set(0, 0.28, 0); g.add(glow);
    } else if (id === 'laurel') {
        const gold = mat({ color: 0xd4a640, metalness: 1, roughness: 0.3, envMapIntensity: Math.max(0.8, ENV) });
        g.add(at(new THREE.TorusGeometry(0.146, 0.008, 6, 32), gold, 0, 0.085, 0).rotateX(Math.PI / 2));
        for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2, l = at(new THREE.SphereGeometry(0.02, 8, 6), gold, Math.cos(a) * 0.148, 0.09 + (i % 2) * 0.015, Math.sin(a) * 0.148); l.scale.set(1.6, 0.5, 0.7); l.rotation.y = -a; g.add(l); }
    } else if (id === 'viking') {
        const steel = mat({ color: 0x9a9ea6, metalness: 0.9, roughness: 0.35, envMapIntensity: Math.max(0.8, ENV) }), bone = mat({ color: 0xece4cc, roughness: 0.6 });
        const dome = at(new THREE.SphereGeometry(0.145, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), steel, 0, 0.04, 0); dome.scale.y = 0.85; g.add(dome);
        g.add(at(new THREE.TorusGeometry(0.146, 0.012, 8, 28), steel, 0, 0.045, 0).rotateX(Math.PI / 2));
        g.add(at(new THREE.BoxGeometry(0.018, 0.09, 0.012), steel, 0, 0.0, -0.142));   // nosal
        for (const s of [-1, 1]) {
            const h = at(new THREE.ConeGeometry(0.028, 0.17, 10), bone, s * 0.17, 0.13, 0); h.rotation.z = -s * 0.85; g.add(h);
            g.add(at(new THREE.CylinderGeometry(0.03, 0.03, 0.025, 10), steel, s * 0.12, 0.075, 0).rotateZ(Math.PI / 2));
        }
    } else if (id === 'chef') {
        const w = mat({ color: 0xfafaf6, roughness: 0.95 });
        g.add(at(new THREE.CylinderGeometry(0.128, 0.132, 0.07, 20), w, 0, 0.115, 0));
        const puff = at(new THREE.SphereGeometry(0.15, 18, 12), w, 0, 0.24, 0); puff.scale.set(1, 0.78, 1); g.add(puff);
        for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; g.add(at(new THREE.SphereGeometry(0.06, 10, 8), w, Math.cos(a) * 0.1, 0.27, Math.sin(a) * 0.1)); }
    } else if (id === 'pirate') {
        const b = mat({ color: 0x15110f, roughness: 0.85 }), gold = mat({ color: 0xd4a640, metalness: 1, roughness: 0.3 });
        const dome = at(new THREE.SphereGeometry(0.14, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), b, 0, 0.05, 0); dome.scale.y = 0.75; g.add(dome);
        const brim = at(new THREE.CylinderGeometry(0.22, 0.22, 0.012, 26), b, 0, 0.055, 0); brim.scale.z = 0.85; g.add(brim);
        for (const s of [-1, 1]) { const w = at(new THREE.BoxGeometry(0.16, 0.012, 0.2), b, s * 0.16, 0.1, 0); w.rotation.z = s * 0.55; g.add(w); }
        g.add(at(new THREE.TorusGeometry(0.142, 0.007, 6, 28), gold, 0, 0.075, 0).rotateX(Math.PI / 2));
        const skull = at(new THREE.SphereGeometry(0.02, 10, 8), mat({ color: 0xf0ece0 }), 0, 0.1, -0.138); g.add(skull);
        for (const s of [-1, 1]) g.add(at(new THREE.SphereGeometry(0.0055, 6, 5), dark(), s * 0.008, 0.103, -0.157));
    } else if (id === 'sprout') {
        const green = mat({ color: 0x3a9a2a, roughness: 0.7 });
        g.add(at(new THREE.CylinderGeometry(0.008, 0.012, 0.12, 6), green, 0, 0.19, 0));
        for (const s of [-1, 1]) { const l = at(new THREE.SphereGeometry(0.05, 10, 8), mat({ color: 0x5ad03a, roughness: 0.6 }), s * 0.045, 0.27, 0); l.scale.set(1.4, 0.25, 0.8); l.rotation.z = s * 0.4; g.add(l); }
    } else if (id === 'ufo') {
        const silver = mat({ color: 0xc8ccd4, metalness: 1, roughness: 0.2, envMapIntensity: Math.max(0.9, ENV) });
        const disc = at(new THREE.SphereGeometry(0.17, 24, 10), silver, 0, 0.17, 0); disc.scale.y = 0.22; g.add(disc);
        g.add(at(new THREE.SphereGeometry(0.075, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x60e8ff, transparent: true, opacity: 0.55, roughness: 0.05, emissive: 0x104050 }), 0, 0.185, 0));
        for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; g.add(at(new THREE.SphereGeometry(0.012, 6, 5), new THREE.MeshBasicMaterial({ color: i % 2 ? 0xff5a5a : 0x6aff6a }), Math.cos(a) * 0.155, 0.165, Math.sin(a) * 0.155)); }
    } else if (id === 'foil') {
        const f = mat({ color: 0xd8dce0, metalness: 1, roughness: 0.18, flatShading: true, envMapIntensity: Math.max(1.0, ENV) });
        g.add(at(new THREE.ConeGeometry(0.11, 0.3, 7, 3), f, 0, 0.26, 0));
    } else if (id === 'earmuffs') {
        const fluff = mat({ color: 0x9ad0f0, roughness: 1 });
        g.add(at(new THREE.TorusGeometry(0.16, 0.01, 8, 28, Math.PI), mat({ color: 0x2a2a30, metalness: 0.5 }), 0, 0.0, 0).rotateY(Math.PI / 2));
        for (const s of [-1, 1]) g.add(at(new THREE.SphereGeometry(0.06, 14, 10), fluff, s * 0.162, -0.005, 0));
    } else if (id === 'batcap') {
        const b = mat({ color: 0x14101a, roughness: 0.9 });
        g.add(at(new THREE.TorusGeometry(0.145, 0.014, 8, 28), b, 0, 0.07, 0).rotateX(Math.PI / 2));
        for (const s of [-1, 1]) {
            const w = at(new THREE.ConeGeometry(0.07, 0.2, 3), b, s * 0.16, 0.17, 0.02); w.rotation.z = -s * 1.0; w.scale.z = 0.25; g.add(w);
            g.add(at(new THREE.ConeGeometry(0.02, 0.05, 6), new THREE.MeshBasicMaterial({ color: 0xff2a2a }), s * 0.04, 0.12, -0.12).rotateX(-Math.PI / 2));
        }
    }

    // ---- nowe: słodkie i bardzo straszne ----
    if (id === 'catears') {   // opaska z kocimi uszami
        const fur = mat({ color: 0xf6e6d4, roughness: 0.95 }), pink = mat({ color: 0xff8ab8, roughness: 0.7 });
        g.add(at(new THREE.TorusGeometry(0.14, 0.011, 6, 24, Math.PI), pink, 0, 0.06, 0).rotateY(Math.PI / 2));
        for (const sd of [-1, 1]) {
            g.add(at(new THREE.ConeGeometry(0.05, 0.11, 4), fur, sd * 0.085, 0.19, 0).rotateZ(-sd * 0.25));
            g.add(at(new THREE.ConeGeometry(0.03, 0.075, 4), pink, sd * 0.085, 0.183, -0.014).rotateZ(-sd * 0.25));
        }
    } else if (id === 'flowercrown') {
        const leaf = mat({ color: 0x3a9a3a, roughness: 0.8 }), cols = [0xff8ab8, 0xffe070, 0xffffff, 0xb8a0ff, 0xff9a60], yel = mat({ color: 0xffd020 });
        g.add(at(new THREE.TorusGeometry(0.14, 0.008, 6, 28), leaf, 0, 0.1, 0).rotateX(Math.PI / 2));
        for (let i = 0; i < 9; i++) {
            const a = i / 9 * Math.PI * 2, x = Math.cos(a) * 0.14, z = Math.sin(a) * 0.14;
            g.add(at(new THREE.SphereGeometry(0.026, 8, 6), mat({ color: cols[i % 5], roughness: 0.7 }), x, 0.115, z));
            g.add(at(new THREE.SphereGeometry(0.01, 6, 4), yel, x * 1.12, 0.125, z * 1.12));
            const lf = at(new THREE.SphereGeometry(0.02, 6, 4), leaf, Math.cos(a + 0.35) * 0.14, 0.1, Math.sin(a + 0.35) * 0.14); lf.scale.set(1.6, 0.5, 0.8); g.add(lf);
        }
    } else if (id === 'donut') {   // pączek z lukrem i posypką
        const dough = mat({ color: 0xd8a060, roughness: 0.8 }), glaze = mat({ color: 0xff7ab8, roughness: 0.25 }), cols = [0xffffff, 0xffe030, 0x40c0ff, 0x80ff60, 0xff4040];
        g.add(at(new THREE.TorusGeometry(0.1, 0.05, 12, 26), dough, 0, 0.17, 0).rotateX(Math.PI / 2));
        const gl = at(new THREE.TorusGeometry(0.1, 0.05, 12, 26), glaze, 0, 0.19, 0).rotateX(Math.PI / 2); gl.scale.set(1.02, 1.02, 0.7); g.add(gl);
        for (let i = 0; i < 16; i++) { const a = i * 2.4, r = 0.075 + (i % 3) * 0.025, sp = at(new THREE.BoxGeometry(0.022, 0.006, 0.006), mat({ color: cols[i % 5] }), Math.cos(a) * r, 0.228, Math.sin(a) * r); sp.rotation.y = a * 3; g.add(sp); }
    } else if (id === 'unicorn') {
        const cream = mat({ color: 0xfaf0ff, roughness: 0.5 }), gold = mat({ color: 0xe8c860, metalness: 0.8, roughness: 0.3 }), pink = mat({ color: 0xffa0c8, roughness: 0.8 }), manes = [0xff8ab8, 0x8ac8ff, 0x9affc8, 0xffe070];
        g.add(at(new THREE.ConeGeometry(0.035, 0.24, 14), cream, 0, 0.28, -0.04).rotateX(-0.25));
        for (let i = 0; i < 5; i++) g.add(at(new THREE.TorusGeometry(0.03 - i * 0.004, 0.004, 5, 14), gold, 0, 0.17 + i * 0.043, -0.04 - i * 0.011).rotateX(Math.PI / 2 - 0.25));
        for (const sd of [-1, 1]) { g.add(at(new THREE.ConeGeometry(0.03, 0.08, 4), cream, sd * 0.09, 0.17, 0.03).rotateZ(-sd * 0.3)); g.add(at(new THREE.ConeGeometry(0.017, 0.05, 4), pink, sd * 0.09, 0.165, 0.018).rotateZ(-sd * 0.3)); }
        for (let i = 0; i < 4; i++) g.add(at(new THREE.SphereGeometry(0.035, 8, 6), mat({ color: manes[i], roughness: 0.8 }), (i % 2 ? 0.02 : -0.02), 0.13 - i * 0.04, 0.12 + i * 0.012));
    } else if (id === 'knifehead') {   // nóż wbity w czubek głowy, krew spływa po czole
        const steel = mat({ color: 0xc8ccd4, metalness: 0.95, roughness: 0.2, envMapIntensity: Math.max(1, ENV) }), grip = mat({ color: 0x2a1a10, roughness: 0.7 }), gore = mat({ color: 0x8a0808, roughness: 0.25, emissive: 0x200000 });
        const k = new THREE.Group(); k.position.set(0.035, 0.135, -0.01); k.rotation.z = -0.3; g.add(k);
        k.add(at(new THREE.BoxGeometry(0.034, 0.16, 0.007), steel, 0, 0, 0)); k.add(at(new THREE.BoxGeometry(0.075, 0.012, 0.018), steel, 0, 0.075, 0));
        k.add(at(new THREE.BoxGeometry(0.026, 0.12, 0.022), grip, 0, 0.14, 0)); k.add(at(new THREE.SphereGeometry(0.016, 8, 6), steel, 0, 0.205, 0));
        const pool = at(new THREE.SphereGeometry(0.034, 10, 6), gore, 0.035, 0.137, -0.01); pool.scale.y = 0.35; g.add(pool);
        for (let i = 0; i < 5; i++) { const phi = 0.45 + i * 0.12, R = 0.143, x = 0.02 + i * 0.012 - 0.025; g.add(at(new THREE.BoxGeometry(0.009, 0.06 + (i % 3) * 0.03, 0.005), gore, x, R * Math.cos(phi), -R * Math.sin(phi)).rotateX(Math.PI / 2 - phi)); }
    } else if (id === 'axehead') {   // siekiera wbita w czaszkę
        const steel = mat({ color: 0x9aa0aa, metalness: 0.9, roughness: 0.3, envMapIntensity: Math.max(1, ENV) }), wood = mat({ color: 0x6a4a2a, roughness: 0.8 }), gore = mat({ color: 0x8a0808, roughness: 0.25, emissive: 0x200000 });
        const a = new THREE.Group(); a.position.set(0, 0.135, -0.02); a.rotation.z = 0.12; g.add(a);
        a.add(at(new THREE.CylinderGeometry(0.014, 0.016, 0.4, 8), wood, 0, 0.2, 0)); a.add(at(new THREE.BoxGeometry(0.012, 0.075, 0.15), steel, 0, 0.0, -0.03));
        a.add(at(new THREE.BoxGeometry(0.03, 0.03, 0.03), steel, 0, 0.045, 0));
        const pool = at(new THREE.SphereGeometry(0.05, 10, 6), gore, 0, 0.135, -0.04); pool.scale.set(1, 0.3, 1.3); g.add(pool);
        for (const sd of [-1, 1]) for (let i = 0; i < 3; i++) { const phi = 0.5 + i * 0.15, R = 0.143; g.add(at(new THREE.BoxGeometry(0.009, 0.06, 0.005), gore, sd * (0.012 + i * 0.016), R * Math.cos(phi), -R * Math.sin(phi)).rotateX(Math.PI / 2 - phi)); }
    } else if (id === 'brainhat') {   // odsłonięty mózg w otwartej czaszce
        const bone = mat({ color: 0xd8cdb0, roughness: 0.7 }), gore = mat({ color: 0x8a0808, roughness: 0.25 }), tones = [0xc87a88, 0xe09aa6, 0xd48898];
        g.add(at(new THREE.TorusGeometry(0.125, 0.016, 6, 26), bone, 0, 0.085, 0).rotateX(Math.PI / 2));
        const dome = at(new THREE.SphereGeometry(0.115, 16, 10), mat({ color: 0xd48898, roughness: 0.3, emissive: 0x2a0810 }), 0, 0.085, 0); dome.scale.y = 0.65; g.add(dome);
        for (let i = 0; i < 16; i++) { const t = i + 0.5, y = 1 - t / 16 * 0.85, r = Math.sqrt(1 - y * y), th = t * 2.399; const b = at(new THREE.SphereGeometry(0.034, 8, 6), mat({ color: tones[i % 3], roughness: 0.3, emissive: 0x2a0810 }), Math.cos(th) * r * 0.105, 0.085 + y * 0.075, Math.sin(th) * r * 0.105); b.scale.set(1, 0.8, 1.2); g.add(b); }
        for (let i = 0; i < 4; i++) g.add(at(new THREE.CylinderGeometry(0.005, 0.005, 0.05 + (i % 2) * 0.03, 5), gore, (i - 1.5) * 0.05, 0.05, -0.128));
    } else if (id === 'nailcrown') {   // korona z gwoździ, krew na czole
        const rust = mat({ color: 0x6a4a3a, metalness: 0.8, roughness: 0.5 }), gore = mat({ color: 0x8a0808, roughness: 0.25, emissive: 0x200000 });
        g.add(at(new THREE.TorusGeometry(0.135, 0.012, 6, 26), rust, 0, 0.07, 0).rotateX(Math.PI / 2));
        for (let i = 0; i < 12; i++) {
            const a = i / 12 * Math.PI * 2, t = 0.35, n = at(new THREE.CylinderGeometry(0.005, 0.0035, 0.12, 5), rust, Math.cos(a) * 0.15, 0.13, Math.sin(a) * 0.15);
            n.rotation.set(Math.sin(a) * t, 0, -Math.cos(a) * t); g.add(n);
            g.add(at(new THREE.SphereGeometry(0.01, 6, 4), rust, Math.cos(a) * (0.15 + Math.cos(a) * 0.0225), 0.19, Math.sin(a) * (0.15 + Math.sin(a) * 0.0225)));
        }
        for (let i = 0; i < 6; i++) { const h = 0.03 + (i % 3) * 0.025; g.add(at(new THREE.CylinderGeometry(0.004, 0.004, h, 5), gore, (i - 2.5) * 0.035, 0.07 - h / 2, -0.135)); g.add(at(new THREE.SphereGeometry(0.007, 6, 4), gore, (i - 2.5) * 0.035, 0.07 - h, -0.135)); }
    } else if (id === 'antlers') {   // poroże z zakrwawionymi korzeniami
        const bone = mat({ color: 0xcfc3a6, roughness: 0.8 }), gore = mat({ color: 0x6a0a0a, roughness: 0.4 });
        for (const sd of [-1, 1]) {
            const al = 0.5, L2 = 0.3, bx = sd * 0.07, by = 0.12, ux = sd * Math.sin(al), uy = Math.cos(al);
            g.add(at(new THREE.CylinderGeometry(0.008, 0.013, L2, 6), bone, bx + ux * L2 / 2, by + uy * L2 / 2, 0).rotateZ(-sd * al));
            g.add(at(new THREE.SphereGeometry(0.024, 8, 6), gore, bx, by, 0));
            for (const f of [0.35, 0.6, 0.9]) { const a2 = al + 0.75, tl = 0.1 + (1 - f) * 0.05, px = bx + ux * L2 * f, py = by + uy * L2 * f; g.add(at(new THREE.CylinderGeometry(0.004, 0.008, tl, 5), bone, px + sd * Math.sin(a2) * tl / 2, py + Math.cos(a2) * tl / 2, 0).rotateZ(-sd * a2)); }
        }
    }

    // ---- druga paczka bardzo strasznych ----
    if (id === 'bolts') {   // śruby Frankensteina i zszyta pokrywa czaszki
        const skin = mat({ color: 0x6a8a5a, roughness: 0.8 }), iron = mat({ color: 0x8a8e96, metalness: 0.9, roughness: 0.35 }), thread = mat({ color: 0x14100e }), gore = mat({ color: 0x7a0808, roughness: 0.3 });
        g.add(at(new THREE.BoxGeometry(0.24, 0.06, 0.22), skin, 0, 0.14, 0));
        for (let i = 0; i < 9; i++) { g.add(at(new THREE.BoxGeometry(0.006, 0.014, 0.05), thread, -0.1 + i * 0.025, 0.172, 0.0)); }
        g.add(at(new THREE.BoxGeometry(0.22, 0.004, 0.004), thread, 0, 0.172, 0));
        for (let i = 0; i < 6; i++) g.add(at(new THREE.SphereGeometry(0.007, 5, 4), gore, -0.1 + i * 0.04, 0.113, -0.112));
        for (const sd of [-1, 1]) { g.add(at(new THREE.CylinderGeometry(0.012, 0.012, 0.09, 8), iron, sd * 0.155, 0.0, 0.0).rotateZ(Math.PI / 2)); g.add(at(new THREE.SphereGeometry(0.022, 8, 6), iron, sd * 0.205, 0.0, 0.0)); g.add(at(new THREE.TorusGeometry(0.02, 0.005, 5, 12), gore, sd * 0.14, 0.0, 0.0).rotateY(Math.PI / 2)); }
    } else if (id === 'spiderhat') {   // wielki pająk na głowie
        const blk = mat({ color: 0x0c0a0e, roughness: 0.4, metalness: 0.2 }), red = new THREE.MeshBasicMaterial({ color: 0xff1010 });
        const ab = at(new THREE.SphereGeometry(0.075, 12, 10), blk, 0, 0.19, 0.07); ab.scale.set(1, 0.8, 1.2); g.add(ab); g.add(at(new THREE.SphereGeometry(0.045, 10, 8), blk, 0, 0.18, -0.045));
        g.add(at(new THREE.BoxGeometry(0.03, 0.008, 0.006), red, 0, 0.2, 0.07));
        for (let i = 0; i < 6; i++) g.add(at(new THREE.SphereGeometry(0.008, 6, 4), red, (i % 3 - 1) * 0.02, 0.19 + (i < 3 ? 0.014 : 0), -0.085));
        for (const sd of [-1, 1]) for (let i = 0; i < 4; i++) {
            const yaw = (i - 1.5) * 0.55, ox = sd * 0.04, oz = -0.01 + (i - 1.5) * -0.012, ux = sd * Math.cos(yaw) * 0.09, uz = Math.sin(yaw) * 0.09;
            const up = at(new THREE.CylinderGeometry(0.0045, 0.004, 0.1, 5), blk, ox + ux * 0.5, 0.2 + 0.03, oz + uz * 0.5 - 0.02); up.rotation.set(0, 0, -sd * 1.05); up.rotation.y = -yaw * sd; g.add(up);
            const lo = at(new THREE.CylinderGeometry(0.004, 0.002, 0.12, 5), blk, ox + ux * 1.15, 0.14, oz + uz * 1.15 - 0.02); lo.rotation.set(0, 0, sd * 0.2); g.add(lo);
        }
    } else if (id === 'crowhat') {   // kruk z czerwonym okiem siedzi na głowie
        const blk = mat({ color: 0x0a0a10, roughness: 0.5, metalness: 0.1 }), beak = mat({ color: 0x3a3a3e, roughness: 0.4 }), eye = new THREE.MeshBasicMaterial({ color: 0xff2010 });
        const body = at(new THREE.SphereGeometry(0.075, 12, 10), blk, 0, 0.2, 0.02); body.scale.set(0.9, 0.85, 1.3); g.add(body);
        g.add(at(new THREE.SphereGeometry(0.042, 10, 8), blk, 0, 0.255, -0.075)); g.add(at(new THREE.ConeGeometry(0.016, 0.075, 6), beak, 0, 0.25, -0.13).rotateX(-Math.PI / 2));
        for (const sd of [-1, 1]) { g.add(at(new THREE.SphereGeometry(0.008, 6, 4), eye, sd * 0.03, 0.265, -0.1)); const w = at(new THREE.SphereGeometry(0.06, 10, 8), blk, sd * 0.07, 0.2, 0.04); w.scale.set(0.35, 0.7, 1.4); g.add(w); g.add(at(new THREE.CylinderGeometry(0.004, 0.004, 0.06, 4), beak, sd * 0.03, 0.14, 0.0)); }
        g.add(at(new THREE.ConeGeometry(0.04, 0.14, 4), blk, 0, 0.19, 0.12).rotateX(Math.PI / 2 + 0.25));
    } else if (id === 'wormhead') {   // macki wyrywają się z czaszki
        const flesh = mat({ color: 0x2a1030, roughness: 0.35, emissive: 0x100418 }), tip = mat({ color: 0xc03a6a, roughness: 0.3 }), gore = mat({ color: 0x8a0808, roughness: 0.3 });
        { const pool = at(new THREE.SphereGeometry(0.05, 10, 6), gore, 0, 0.13, 0); pool.scale.y = 0.4; g.add(pool); }
        for (let t = 0; t < 5; t++) {
            const a = t / 5 * Math.PI * 2, bend = 0.9 + (t % 2) * 0.5;
            for (let i = 0; i < 9; i++) { const u = i / 8, r = 0.026 * (1 - u * 0.75), rad = 0.04 + u * 0.18 * bend, y = 0.13 + Math.sin(u * 2.2) * 0.2 * (1 + (t % 3) * 0.15) - u * u * 0.05; g.add(at(new THREE.SphereGeometry(r, 7, 5), i === 8 ? tip : flesh, Math.cos(a + u * 1.6) * rad, y, Math.sin(a + u * 1.6) * rad)); }
        }
    } else if (id === 'candlecrown') {   // korona z zapalonych, zakrwawionych świec
        const band = mat({ color: 0x14100e, roughness: 0.6, metalness: 0.4 }), wax = mat({ color: 0xe8dcc0, roughness: 0.7 }), gore = mat({ color: 0x8a0808, roughness: 0.3 }), flame = new THREE.MeshBasicMaterial({ color: 0xffb030 });
        g.add(at(new THREE.TorusGeometry(0.135, 0.014, 6, 26), band, 0, 0.09, 0).rotateX(Math.PI / 2));
        for (let i = 0; i < 5; i++) {
            const a = i / 5 * Math.PI * 2, x = Math.cos(a) * 0.13, z = Math.sin(a) * 0.13, h = 0.1 + (i % 3) * 0.04;
            g.add(at(new THREE.CylinderGeometry(0.018, 0.02, h, 8), wax, x, 0.09 + h / 2, z));
            g.add(at(new THREE.CylinderGeometry(0.0045, 0.004, 0.06, 4), gore, x + 0.015, 0.09 + h - 0.02, z)); g.add(at(new THREE.SphereGeometry(0.007, 5, 4), gore, x + 0.015, 0.09 + h - 0.052, z));
            g.add(at(new THREE.ConeGeometry(0.012, 0.04, 6), flame, x, 0.09 + h + 0.02, z));
            const gl = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex.dot, color: 0xffa040, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.6 })); gl.scale.set(0.16, 0.16, 1); gl.position.set(x, 0.09 + h + 0.02, z); g.add(gl);
        }
    } else if (id === 'eyestalks') {   // trzy gałki oczne na szypułkach
        const stalk = mat({ color: 0xa04a5a, roughness: 0.35 }), white = mat({ color: 0xf0e8e0, roughness: 0.25 }), iris = new THREE.MeshBasicMaterial({ color: 0xc01818 }), pupil = new THREE.MeshBasicMaterial({ color: 0x050505 }), gore = mat({ color: 0x7a0808, roughness: 0.3 });
        { const pool = at(new THREE.SphereGeometry(0.045, 8, 6), gore, 0, 0.135, 0); pool.scale.y = 0.4; g.add(pool); }
        for (const [dx, dz, tilt] of [[-0.06, 0.0, 0.5], [0.07, 0.03, -0.45], [0.0, -0.06, 0.3]]) {
            const len = 0.17, sx = Math.sin(tilt) * len, topY = 0.14 + Math.cos(tilt) * len, bz = dz < -0.03 ? -0.02 : 0;
            const st = at(new THREE.CylinderGeometry(0.008, 0.013, len, 6), stalk, dx + sx / 2, 0.14 + Math.cos(tilt) * len / 2, dz + bz); st.rotation.z = -tilt; g.add(st);
            g.add(at(new THREE.SphereGeometry(0.035, 12, 10), white, dx + sx, topY, dz + bz)); g.add(at(new THREE.SphereGeometry(0.018, 8, 6), iris, dx + sx, topY, dz + bz - 0.026)); g.add(at(new THREE.SphereGeometry(0.009, 6, 4), pupil, dx + sx, topY, dz + bz - 0.036));
        }
    } else if (id === 'knifehalo') {   // pierścień lewitujących noży wycelowanych w głowę
        const steel = mat({ color: 0xc8ccd4, metalness: 0.95, roughness: 0.2 }), grip = mat({ color: 0x2a1a10, roughness: 0.7 }), gore = mat({ color: 0x8a0808, roughness: 0.25 });
        for (let i = 0; i < 8; i++) {
            const a = i / 8 * Math.PI * 2, k = new THREE.Group(); k.position.set(Math.cos(a) * 0.19, 0.3 + (i % 2) * 0.03, Math.sin(a) * 0.19); k.rotation.set(Math.sin(a) * 0.45, 0, -Math.cos(a) * 0.45); g.add(k);
            k.add(at(new THREE.BoxGeometry(0.022, 0.12, 0.005), steel, 0, -0.06, 0)); k.add(at(new THREE.BoxGeometry(0.014, 0.05, 0.012), grip, 0, 0.025, 0)); k.add(at(new THREE.BoxGeometry(0.022, 0.03, 0.006), gore, 0, -0.1, 0.003));
        }
    }

    // ---- trzecia paczka bardzo strasznych ----
    if (id === 'noosehat') {   // pętla szubienicy wisi nad głową
        const rope = mat({ color: 0x9a7a4a, roughness: 1 }), gore = mat({ color: 0x7a0808, roughness: 0.3 });
        g.add(at(new THREE.TorusGeometry(0.075, 0.011, 6, 20), rope, 0, 0.3, 0).rotateY(Math.PI / 2));
        g.add(at(new THREE.CylinderGeometry(0.01, 0.01, 0.22, 6), rope, 0, 0.51, 0));
        for (let i = 0; i < 6; i++) g.add(at(new THREE.TorusGeometry(0.016, 0.007, 5, 10), rope, 0, 0.375 + i * 0.012, 0).rotateX(Math.PI / 2));
        g.add(at(new THREE.CylinderGeometry(0.004, 0.006, 0.06, 5), rope, 0.012, 0.35, 0.01).rotateZ(0.3));
        for (let i = 0; i < 3; i++) g.add(at(new THREE.SphereGeometry(0.006, 5, 4), gore, (i - 1) * 0.03, 0.222 + (i % 2) * 0.01, 0));
    } else if (id === 'rodhead') {   // zardzewiały pręt przechodzi przez skronie
        const rust = mat({ color: 0x6a3a1e, metalness: 0.8, roughness: 0.55 }), gore = mat({ color: 0x8a0808, roughness: 0.25, emissive: 0x200000 });
        g.add(at(new THREE.CylinderGeometry(0.013, 0.013, 0.52, 8), rust, 0, 0.02, -0.01).rotateZ(Math.PI / 2));
        for (const sd of [-1, 1]) {
            g.add(at(new THREE.CylinderGeometry(0.02, 0.012, 0.03, 8), gore, sd * 0.14, 0.02, -0.01).rotateZ(Math.PI / 2));
            for (let i = 0; i < 3; i++) g.add(at(new THREE.CylinderGeometry(0.004, 0.004, 0.05 + i * 0.03, 4), gore, sd * 0.14, 0.0 - i * 0.015, -0.03 + i * 0.03));
            g.add(at(new THREE.SphereGeometry(0.012, 6, 5), rust, sd * 0.26, 0.02, -0.01));
        }
    } else if (id === 'maggothat') {   // robaki pełzają po czaszce
        const worm = mat({ color: 0xe8e0b0, roughness: 0.5 }), dark = mat({ color: 0x2a1a10, roughness: 0.9 });
        for (let i = 0; i < 26; i++) {
            const u = (i * 0.618) % 1, a = i * 2.399, ph = 0.1 + u * 1.2, r = 0.145, w = at(new THREE.CapsuleGeometry(0.0075, 0.022, 3, 5), i % 7 === 0 ? dark : worm, Math.sin(ph) * Math.cos(a) * r, Math.cos(ph) * r * 0.95 + 0.01, Math.sin(ph) * Math.sin(a) * r);
            w.rotation.set((i * 0.7) % 3, (i * 1.3) % 6, (i * 0.9) % 3); g.add(w);
        }
    } else if (id === 'ribcrown') {   // korona z żeber, na czubku kręgosłup
        const bone = mat({ color: 0xd8cdb0, roughness: 0.7 }), gore = mat({ color: 0x7a0808, roughness: 0.3 });
        for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; const rib = at(new THREE.TorusGeometry(0.12, 0.009, 5, 14, Math.PI * 0.62), bone, Math.cos(a) * 0.04, 0.07, Math.sin(a) * 0.04); rib.rotation.set(0, -a, 0); rib.rotateZ(0.2); g.add(rib); }
        for (let i = 0; i < 5; i++) g.add(at(new THREE.SphereGeometry(0.02 - i * 0.002, 6, 5), bone, 0, 0.17 + i * 0.03, 0));
        for (let i = 0; i < 5; i++) g.add(at(new THREE.SphereGeometry(0.007, 5, 4), gore, Math.cos(i * 1.26) * 0.14, 0.1, Math.sin(i * 1.26) * 0.14));
    } else if (id === 'bleedhalo') {   // aureola z krwi, z której kapie
        const red = new THREE.MeshBasicMaterial({ color: 0xc01010 }), gore = mat({ color: 0x7a0808, roughness: 0.25, emissive: 0x300000 });
        g.add(at(new THREE.TorusGeometry(0.15, 0.011, 8, 32), red, 0, 0.3, 0).rotateX(Math.PI / 2));
        for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2, len = 0.08 + (i * 37 % 7) * 0.05; g.add(at(new THREE.CylinderGeometry(0.004, 0.0035, len, 4), gore, Math.cos(a) * 0.15, 0.3 - len / 2, Math.sin(a) * 0.15)); g.add(at(new THREE.SphereGeometry(0.0075, 5, 4), gore, Math.cos(a) * 0.15, 0.3 - len, Math.sin(a) * 0.15)); }
        const gl = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex.dot, color: 0xff2010, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.45 })); gl.scale.set(0.55, 0.55, 1); gl.position.set(0, 0.3, 0); g.add(gl);
    } else if (id === 'reaperhood') {   // czarny kaptur Żniwiarza (twarz odsłonięta)
        const cloth = new THREE.MeshStandardMaterial({ color: 0x08080a, roughness: 0.95, side: THREE.DoubleSide });
        const cowl = at(new THREE.SphereGeometry(0.2, 22, 14, Math.PI * 1.5 + 0.95, Math.PI * 2 - 1.9, 0, Math.PI * 0.78), cloth, 0, 0.02, 0.035); cowl.scale.set(1, 1.05, 1.1); g.add(cowl);
        g.add(at(new THREE.ConeGeometry(0.07, 0.2, 10), cloth, 0, 0.2, 0.15).rotateX(0.9));
        g.add(at(new THREE.TorusGeometry(0.15, 0.012, 6, 20, Math.PI * 1.4), cloth, 0, 0.04, -0.03).rotateX(Math.PI / 2));
    } else if (id === 'sirenhat') {   // Scary GTA: koguty policyjne na czubku głowy (świecą na czerwono i niebiesko)
        const base = mat({ color: 0x1a1a22, metalness: 0.5, roughness: 0.4 }), red = new THREE.MeshBasicMaterial({ color: 0xff2020 }), blue = new THREE.MeshBasicMaterial({ color: 0x2060ff });
        g.add(at(new THREE.BoxGeometry(0.3, 0.03, 0.12), base, 0, 0.15, 0));
        g.add(at(new THREE.BoxGeometry(0.12, 0.07, 0.1), red, -0.075, 0.2, 0)); g.add(at(new THREE.BoxGeometry(0.12, 0.07, 0.1), blue, 0.075, 0.2, 0));
        for (const [x, c] of [[-0.075, 0xff2010], [0.075, 0x2050ff]]) { const gl = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex.dot, color: c, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.5 })); gl.scale.set(0.4, 0.4, 1); gl.position.set(x, 0.22, 0); g.add(gl); }
    } else if (id === 'lootbag') {   // Scary GTA: worek z łupem na głowie, z którego wystają monety i banknoty
        const sack = mat({ color: 0x8a6a3a, roughness: 1 }), rope = mat({ color: 0x4a3418, roughness: 1 }), gold = mat({ color: 0xe0b030, metalness: 1, roughness: 0.25 }), bill = mat({ color: 0x3a8a4a, roughness: 0.8, side: THREE.DoubleSide });
        const bag = at(new THREE.SphereGeometry(0.16, 16, 12), sack, 0, 0.22, 0); bag.scale.set(1, 0.9, 1); g.add(bag);
        g.add(at(new THREE.CylinderGeometry(0.05, 0.09, 0.08, 10), sack, 0, 0.37, 0)); g.add(at(new THREE.TorusGeometry(0.06, 0.012, 6, 14), rope, 0, 0.35, 0).rotateX(Math.PI / 2));
        for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2, c = at(new THREE.CylinderGeometry(0.022, 0.022, 0.006, 10), gold, Math.cos(a) * 0.035, 0.43 + (i % 2) * 0.02, Math.sin(a) * 0.035); c.rotation.set(Math.sin(a) * 0.9, 0, Math.cos(a) * 0.9); g.add(c); }
        for (let i = 0; i < 3; i++) { const b = at(new THREE.BoxGeometry(0.07, 0.003, 0.035), bill, (i - 1) * 0.02, 0.45, 0); b.rotation.set(0.3 * (i - 1), i * 1.1, 0.4 * (1 - i)); g.add(b); }
    } else if (id === 'rotorhat') {   // Scary GTA: czapka z wirnikiem helikoptera Oko
        const cap = mat({ color: 0x20242c, roughness: 0.5, metalness: 0.3 }), blade = mat({ color: 0x0e0e12, roughness: 0.6 });
        g.add(at(new THREE.SphereGeometry(0.15, 18, 12, 0, Math.PI * 2, 0, Math.PI / 2), cap, 0, 0.1, 0));
        g.add(at(new THREE.CylinderGeometry(0.012, 0.016, 0.1, 8), cap, 0, 0.27, 0));
        for (let i = 0; i < 2; i++) { const b = at(new THREE.BoxGeometry(0.46, 0.006, 0.035), blade, 0, 0.325, 0); b.rotation.y = 0.5 + i * Math.PI / 2; g.add(b); }
        g.add(at(new THREE.SphereGeometry(0.014, 8, 6), new THREE.MeshBasicMaterial({ color: 0xff2020 }), 0, 0.12, 0.15));
    } else if (id === 'wantedhat') {   // Scary GTA: pięć złotych gwiazdek poszukiwania nad głową
        const star = new THREE.Shape(); for (let i = 0; i < 10; i++) { const r = i % 2 ? 0.02 : 0.045, a = -Math.PI / 2 + i * Math.PI / 5; (i ? star.lineTo : star.moveTo).call(star, Math.cos(a) * r, Math.sin(a) * r); } star.closePath();
        const sg = new THREE.ExtrudeGeometry(star, { depth: 0.012, bevelEnabled: false }), glow = new THREE.MeshBasicMaterial({ color: 0xffd23a });
        for (let i = 0; i < 5; i++) { const st = at(sg, glow, (i - 2) * 0.085, 0.36 + (2 - Math.abs(i - 2)) * 0.025, 0); st.rotation.z = (i - 2) * -0.15; st.castShadow = false; g.add(st); }
    }
    return g;
}

// ---------- OKULARY ----------
export function extraGlasses(id) {
    const g = new THREE.Group(), d = dark();
    if (id === 'monocle') {
        const gold = mat({ color: 0xd4a640, metalness: 1, roughness: 0.25 });
        g.add(at(new THREE.TorusGeometry(0.036, 0.004, 6, 22), gold, 0.045, 0.02, -0.13));
        g.add(at(new THREE.CylinderGeometry(0.0015, 0.0015, 0.14, 4), gold, 0.08, -0.05, -0.125));
    } else if (id === 'neonshades') {
        const frame = mat({ color: 0x14081c, roughness: 0.4 }), pink = mat({ color: 0xff2a9a, emissive: 0xff2a9a, emissiveIntensity: 1.2 }), cyan = mat({ color: 0x20e0ff, emissive: 0x20e0ff, emissiveIntensity: 1.2 });
        g.add(at(new THREE.BoxGeometry(0.2, 0.012, 0.01), frame, 0, 0.045, -0.13));
        g.add(at(new THREE.BoxGeometry(0.085, 0.04, 0.008), pink, -0.05, 0.02, -0.13)); g.add(at(new THREE.BoxGeometry(0.085, 0.04, 0.008), cyan, 0.05, 0.02, -0.13));
    } else if (id === 'heart') {
        const pink = mat({ color: 0xff3a7a, emissive: 0x80103a, emissiveIntensity: 0.7, roughness: 0.3 });
        for (const s of [-1, 1]) {
            const d = at(new THREE.BoxGeometry(0.05, 0.05, 0.012), pink, s * 0.047, 0.02, -0.132); d.rotation.z = Math.PI / 4; g.add(d);
            for (const k of [-1, 1]) g.add(at(new THREE.SphereGeometry(0.0185, 10, 8), pink, s * 0.047 + k * 0.0177, 0.02 + 0.0177, -0.132));
        }
        g.add(at(new THREE.BoxGeometry(0.03, 0.006, 0.006), pink, 0, 0.028, -0.132));
    } else if (id === 'shutter') {
        g.add(at(new THREE.BoxGeometry(0.21, 0.05, 0.012), mat({ color: 0xe8e8ea, roughness: 0.3 }), 0, 0.02, -0.132));
        for (let i = 0; i < 5; i++) g.add(at(new THREE.BoxGeometry(0.2, 0.006, 0.016), mat({ color: 0x111114 }), 0, -0.002 + i * 0.01, -0.136));
    } else if (id === 'night') {
        const body = mat({ color: 0x1a2a1a, metalness: 0.6, roughness: 0.4 });
        for (const s of [-1, 1]) {
            const t = at(new THREE.CylinderGeometry(0.032, 0.036, 0.07, 14), body, s * 0.046, 0.025, -0.16); t.rotation.x = Math.PI / 2; g.add(t);
            const l = at(new THREE.CircleGeometry(0.026, 14), new THREE.MeshBasicMaterial({ color: 0x40ff60 }), s * 0.046, 0.025, -0.1965); l.rotation.y = Math.PI; g.add(l);
        }
        g.add(at(new THREE.TorusGeometry(0.135, 0.008, 6, 36), mat({ color: 0x1a1a1a }), 0, 0.03, 0).rotateX(Math.PI / 2));
    } else if (id === '3d') {
        const w = mat({ color: 0xf0f0f2 });
        g.add(at(new THREE.BoxGeometry(0.2, 0.012, 0.012), w, 0, 0.044, -0.132));
        g.add(at(new THREE.BoxGeometry(0.2, 0.012, 0.012), w, 0, -0.004, -0.132));
        for (const [s, col] of [[-1, 0xff2a2a], [1, 0x2ad8ff]]) {
            g.add(at(new THREE.BoxGeometry(0.088, 0.05, 0.008), new THREE.MeshStandardMaterial({ color: col, transparent: true, opacity: 0.7, roughness: 0.1 }), s * 0.048, 0.02, -0.133));
            g.add(at(new THREE.BoxGeometry(0.01, 0.056, 0.012), w, s * 0.096, 0.02, -0.132));
        }
        g.add(at(new THREE.BoxGeometry(0.01, 0.056, 0.012), w, 0, 0.02, -0.132));
    } else if (id === 'aviator') {
        const gold = mat({ color: 0xd4a640, metalness: 1, roughness: 0.25 }), lens = new THREE.MeshStandardMaterial({ color: 0x8a6a3a, transparent: true, opacity: 0.6, roughness: 0.08, metalness: 0.3 });
        for (const s of [-1, 1]) {
            const l = at(new THREE.CircleGeometry(0.04, 18), lens, s * 0.05, 0.012, -0.134); l.scale.set(1, 1.15, 1); l.rotation.y = Math.PI; g.add(l);
            const r = at(new THREE.TorusGeometry(0.04, 0.0035, 6, 24), gold, s * 0.05, 0.012, -0.134); r.scale.set(1, 1.15, 1); g.add(r);
            g.add(at(new THREE.CylinderGeometry(0.0025, 0.0025, 0.13, 4), gold, s * 0.092, 0.03, -0.065).rotateX(Math.PI / 2));
        }
        g.add(at(new THREE.BoxGeometry(0.03, 0.004, 0.004), gold, 0, 0.03, -0.134));
    } else if (id === 'hippie') {
        const wire = mat({ color: 0x222222, metalness: 0.6 });
        for (const [s, col] of [[-1, 0xff9a2a], [1, 0xff4a9a]]) {
            g.add(at(new THREE.CircleGeometry(0.03, 16), new THREE.MeshStandardMaterial({ color: col, transparent: true, opacity: 0.65, roughness: 0.1 }), s * 0.047, 0.02, -0.134).rotateY(Math.PI));
            g.add(at(new THREE.TorusGeometry(0.03, 0.003, 6, 20), wire, s * 0.047, 0.02, -0.134));
        }
        g.add(at(new THREE.BoxGeometry(0.024, 0.004, 0.004), wire, 0, 0.026, -0.134));
    } else if (id === 'steampunk') {
        const brass = mat({ color: 0xb8863a, metalness: 1, roughness: 0.35 });
        for (const s of [-1, 1]) {
            const c = at(new THREE.CylinderGeometry(0.036, 0.04, 0.035, 18), brass, s * 0.047, 0.022, -0.15); c.rotation.x = Math.PI / 2; g.add(c);
            const lens = at(new THREE.CircleGeometry(0.03, 16), new THREE.MeshStandardMaterial({ color: 0x40d080, emissive: 0x104a28, emissiveIntensity: 0.8, transparent: true, opacity: 0.8, roughness: 0.05 }), s * 0.047, 0.022, -0.1685); lens.rotation.y = Math.PI; g.add(lens);
        }
        g.add(at(new THREE.TorusGeometry(0.135, 0.01, 6, 36), mat({ color: 0x4a2a14, roughness: 0.9 }), 0, 0.03, 0).rotateX(Math.PI / 2));
    } else if (id === 'catseye') {
        const pink = mat({ color: 0xff5aa8, roughness: 0.3 });
        for (const s of [-1, 1]) {
            g.add(at(new THREE.TorusGeometry(0.034, 0.005, 6, 20), pink, s * 0.047, 0.018, -0.134).rotateY(0));
            g.add(at(new THREE.ConeGeometry(0.018, 0.04, 3), pink, s * 0.078, 0.048, -0.134).rotateZ(-s * 0.5));
            g.add(at(new THREE.CircleGeometry(0.032, 16), new THREE.MeshStandardMaterial({ color: 0xffd0e8, transparent: true, opacity: 0.35 }), s * 0.047, 0.018, -0.1335).rotateY(Math.PI));
        }
        g.add(at(new THREE.BoxGeometry(0.02, 0.005, 0.005), pink, 0, 0.026, -0.134));
    } else if (id === 'pixel') {
        const blk = new THREE.MeshBasicMaterial({ color: 0x050505 });
        const rows = [[1, 1, 1, 1, 1, 1, 1, 1, 1, 1], [1, 1, 1, 0, 1, 1, 0, 1, 1, 1], [0, 1, 1, 0, 0, 0, 0, 1, 1, 0]], px = 0.022;
        rows.forEach((row, j) => row.forEach((v, i) => { if (v) g.add(at(new THREE.BoxGeometry(px, px, 0.012), blk, (i - 4.5) * px, 0.04 - j * px, -0.134)); }));
    }

    // ---- nowe ----
    if (id === 'starglasses') {
        const star = (r) => { const sh = new THREE.Shape(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r; if (i) sh.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); else sh.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); } sh.closePath(); return new THREE.ExtrudeGeometry(sh, { depth: 0.008, bevelEnabled: false }); };
        const gl = mat({ color: 0xffd23a, roughness: 0.25, emissive: 0x6a4a00, emissiveIntensity: 0.6 });
        for (const sd of [-1, 1]) { g.add(at(star(0.05), gl, sd * 0.05, 0.025, -0.14)); g.add(at(new THREE.BoxGeometry(0.003, 0.003, 0.1), mat({ color: 0xffd23a }), sd * 0.1, 0.03, -0.09)); }
        g.add(at(new THREE.BoxGeometry(0.03, 0.006, 0.006), mat({ color: 0xffd23a }), 0, 0.03, -0.136));
    } else if (id === 'buttoneyes') {   // czarne guziki zamiast oczu
        const black = mat({ color: 0x0a0a0c, roughness: 0.25, metalness: 0.2 }), hole = mat({ color: 0x4a4a52, roughness: 0.4 }), thread = mat({ color: 0x1a1a1a });
        for (const sd of [-1, 1]) {
            g.add(at(new THREE.CylinderGeometry(0.03, 0.03, 0.01, 18), black, sd * 0.047, 0.03, -0.134).rotateX(Math.PI / 2));
            for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) g.add(at(new THREE.CylinderGeometry(0.0035, 0.0035, 0.012, 6), hole, sd * 0.047 + dx * 0.009, 0.03 + dy * 0.009, -0.1395).rotateX(Math.PI / 2));
            for (const r of [Math.PI / 4, -Math.PI / 4]) g.add(at(new THREE.BoxGeometry(0.036, 0.003, 0.004), thread, sd * 0.047, 0.03, -0.1405).rotateZ(r));
        }
    } else if (id === 'bleedingeyes') {   // świecące czerwone oczy, krew spływa po twarzy
        const red = new THREE.MeshBasicMaterial({ color: 0xff1010 }), gore = mat({ color: 0x7a0606, roughness: 0.25, emissive: 0x200000 });
        for (const sd of [-1, 1]) {
            g.add(at(new THREE.SphereGeometry(0.02, 10, 8), red, sd * 0.047, 0.03, -0.134));
            for (let k = 0; k < 2; k++) { const len = 0.07 + k * 0.035; g.add(at(new THREE.BoxGeometry(0.007, len, 0.004), gore, sd * 0.047 + (k - 0.5) * 0.016, 0.0 - len / 2, -0.131)); g.add(at(new THREE.SphereGeometry(0.006, 6, 4), gore, sd * 0.047 + (k - 0.5) * 0.016, -len, -0.131)); }
        }
    }

    // ---- druga paczka ----
    if (id === 'stitchedeyes') {   // oczy zaszyte nićmi
        const lid = mat({ color: 0x8a7a70, roughness: 0.9 }), thread = mat({ color: 0x2a1410 }), gore = mat({ color: 0x7a0808, roughness: 0.3 });
        for (const sd of [-1, 1]) {
            const l = at(new THREE.SphereGeometry(0.03, 10, 8), lid, sd * 0.047, 0.03, -0.131); l.scale.set(1.1, 0.8, 0.35); g.add(l);
            for (let i = 0; i < 5; i++) { const st = at(new THREE.BoxGeometry(0.003, 0.035, 0.003), thread, sd * 0.047 + (i - 2) * 0.011, 0.03, -0.14); st.rotation.z = (i % 2 ? 0.45 : -0.45); g.add(st); }
            g.add(at(new THREE.BoxGeometry(0.058, 0.003, 0.003), thread, sd * 0.047, 0.03, -0.14)); g.add(at(new THREE.BoxGeometry(0.005, 0.07, 0.004), gore, sd * 0.047, -0.03, -0.132));
        }
    } else if (id === 'manyeyes') {   // sześć dodatkowych, świecących, pajęczych oczu
        const red = new THREE.MeshBasicMaterial({ color: 0xff1010 });
        for (const [x, y, r] of [[-0.03, 0.075, 0.009], [0.03, 0.075, 0.009], [-0.07, 0.055, 0.007], [0.07, 0.055, 0.007], [-0.05, 0.0, 0.008], [0.05, 0.0, 0.008], [0, 0.09, 0.006]]) g.add(at(new THREE.SphereGeometry(r, 8, 6), red, x, y, -0.134));
    } else if (id === 'bloodshot') {   // wyłupiaste, przekrwione gałki
        const white = mat({ color: 0xf2eae0, roughness: 0.25 }), vein = mat({ color: 0xb01818, roughness: 0.4 }), pupil = new THREE.MeshBasicMaterial({ color: 0x050505 });
        for (const sd of [-1, 1]) {
            g.add(at(new THREE.SphereGeometry(0.036, 14, 12), white, sd * 0.047, 0.03, -0.145)); g.add(at(new THREE.SphereGeometry(0.011, 8, 6), pupil, sd * 0.047, 0.03, -0.178));
            for (let i = 0; i < 7; i++) { const a = i * 0.9, v = at(new THREE.BoxGeometry(0.003, 0.028, 0.003), vein, sd * 0.047 + Math.cos(a) * 0.022, 0.03 + Math.sin(a) * 0.022, -0.168); v.rotation.z = a; g.add(v); }
        }
    }

    // ---- trzecia paczka ----
    if (id === 'wormeyes') {   // pustka w oczodołach i wijące się robaki
        const worm = mat({ color: 0xe8e0b0, roughness: 0.5 });
        for (const sd of [-1, 1]) {
            const e = at(new THREE.SphereGeometry(0.026, 10, 8), d, sd * 0.047, 0.03, -0.131); e.scale.set(1.1, 1.2, 0.4); g.add(e);
            for (let w = 0; w < 3; w++) for (let i = 0; i < 4; i++) g.add(at(new THREE.SphereGeometry(0.006 - i * 0.0008, 5, 4), worm, sd * 0.047 + (w - 1) * 0.012 + Math.sin(i * 1.3 + w) * 0.006, 0.03 - 0.012 - i * 0.012, -0.14 - i * 0.004));
        }
    } else if (id === 'nailedeyes') {   // rdzewiejące gwoździe wbite w oczy
        const rust = mat({ color: 0x6a4a3a, metalness: 0.8, roughness: 0.5 }), gore = mat({ color: 0x7a0606, roughness: 0.25, emissive: 0x200000 });
        for (const sd of [-1, 1]) {
            const e = at(new THREE.SphereGeometry(0.026, 10, 8), d, sd * 0.047, 0.03, -0.131); e.scale.set(1.1, 1.2, 0.4); g.add(e);
            g.add(at(new THREE.CylinderGeometry(0.004, 0.003, 0.09, 5), rust, sd * 0.047, 0.03, -0.17).rotateX(Math.PI / 2)); g.add(at(new THREE.CylinderGeometry(0.011, 0.011, 0.004, 8), rust, sd * 0.047, 0.03, -0.216).rotateX(Math.PI / 2));
            for (let i = 0; i < 3; i++) g.add(at(new THREE.BoxGeometry(0.005, 0.05 + i * 0.03, 0.004), gore, sd * 0.047 + (i - 1) * 0.012, -0.01 - i * 0.012, -0.136));
        }
    } else if (id === 'cyclops') {   // jedno wielkie oko na środku twarzy
        const white = mat({ color: 0xf2eae0, roughness: 0.2 }), iris = new THREE.MeshBasicMaterial({ color: 0xd8a010 }), pupil = new THREE.MeshBasicMaterial({ color: 0x050505 }), lid = mat({ color: 0x6a5a50, roughness: 0.8 });
        for (const sd of [-1, 1]) { const cover = at(new THREE.SphereGeometry(0.03, 10, 8), lid, sd * 0.047, 0.03, -0.131); cover.scale.set(1.1, 1.1, 0.4); g.add(cover); }
        g.add(at(new THREE.SphereGeometry(0.05, 16, 12), white, 0, 0.045, -0.145)); g.add(at(new THREE.SphereGeometry(0.03, 12, 10), iris, 0, 0.045, -0.185));
        const slit = at(new THREE.SphereGeometry(0.012, 8, 6), pupil, 0, 0.045, -0.2); slit.scale.set(0.4, 1.8, 0.4); g.add(slit);
        g.add(at(new THREE.TorusGeometry(0.052, 0.008, 6, 20), lid, 0, 0.045, -0.145));
    } else if (id === 'nightvision') {   // Scary GTA: noktowizor, dwa zielone obiektywy
        const body = mat({ color: 0x16181a, metalness: 0.5, roughness: 0.4 }), lens = new THREE.MeshBasicMaterial({ color: 0x40ff60 });
        g.add(at(new THREE.BoxGeometry(0.2, 0.05, 0.02), body, 0, 0.03, -0.135));
        for (const sd of [-1, 1]) { g.add(at(new THREE.CylinderGeometry(0.03, 0.034, 0.07, 14), body, sd * 0.047, 0.03, -0.17).rotateX(Math.PI / 2)); g.add(at(new THREE.CircleGeometry(0.026, 14), lens, sd * 0.047, 0.03, -0.206).rotateY(Math.PI)); }
        g.add(at(new THREE.BoxGeometry(0.02, 0.03, 0.03), body, 0, 0.075, -0.13));
    } else if (id === 'laserscope') {   // Scary GTA: celownik laserowy: jedno czerwone oko z wiązką
        const body = mat({ color: 0x16181a, metalness: 0.6, roughness: 0.35 }), red = new THREE.MeshBasicMaterial({ color: 0xff1a1a }), beam = new THREE.MeshBasicMaterial({ color: 0xff3030, transparent: true, opacity: 0.55 });
        g.add(at(new THREE.CylinderGeometry(0.026, 0.03, 0.08, 12), body, 0.047, 0.03, -0.17).rotateX(Math.PI / 2));
        g.add(at(new THREE.CircleGeometry(0.02, 12), red, 0.047, 0.03, -0.211).rotateY(Math.PI));
        const b = at(new THREE.CylinderGeometry(0.0025, 0.0025, 0.35, 5), beam, 0.047, 0.03, -0.39); b.rotation.x = Math.PI / 2; b.castShadow = false; g.add(b);
        g.add(at(new THREE.BoxGeometry(0.1, 0.012, 0.01), body, -0.03, 0.045, -0.131));
    }
    return g;
}

// ---------- MASKI ----------
export function extraMask(id) {
    const g = new THREE.Group(), d = dark();
    const shell = (m, sx, sy, sz) => { const o = at(new THREE.SphereGeometry(1, 24, 16), m, 0, 0, -0.1); o.scale.set(sx, sy, sz); g.add(o); return o; };
    if (id === 'jack') {
        shell(mat({ color: 0xe0701a, roughness: 0.55 }), 0.14, 0.16, 0.07).position.z = -0.1;
        const glow = new THREE.MeshBasicMaterial({ color: 0xffc030 });
        for (const s of [-1, 1]) g.add(at(new THREE.ConeGeometry(0.026, 0.04, 3), glow, s * 0.048, 0.04, -0.165).rotateX(-Math.PI / 2));
        for (let i = 0; i < 5; i++) g.add(at(new THREE.BoxGeometry(0.018, 0.016, 0.01), glow, (i - 2) * 0.026, -0.055 + Math.abs(i - 2) * -0.006, -0.17));
        g.add(at(new THREE.CylinderGeometry(0.014, 0.02, 0.05, 8), mat({ color: 0x2a5a1a }), 0, 0.17, -0.1));
    } else if (id === 'snowman') {
        shell(mat({ color: 0xf6f8fa, roughness: 0.9 }), 0.13, 0.155, 0.065).position.z = -0.1;
        for (const s of [-1, 1]) g.add(at(new THREE.SphereGeometry(0.013, 8, 6), d, s * 0.045, 0.035, -0.158));
        g.add(at(new THREE.ConeGeometry(0.014, 0.1, 8), mat({ color: 0xff7a1a }), 0, -0.005, -0.2).rotateX(-Math.PI / 2));
        for (let i = 0; i < 5; i++) g.add(at(new THREE.SphereGeometry(0.007, 6, 4), d, (i - 2) * 0.022, -0.06 + Math.abs(i - 2) * 0.006 * -1 + 0.012, -0.158));
    } else if (id === 'clown') {
        shell(mat({ color: 0xf4f0ea, roughness: 0.4 }), 0.13, 0.155, 0.065).position.z = -0.1;
        g.add(at(new THREE.SphereGeometry(0.03, 12, 10), mat({ color: 0xe01818, roughness: 0.3 }), 0, -0.005, -0.18));
        for (const s of [-1, 1]) {
            g.add(at(new THREE.SphereGeometry(0.014, 8, 6), d, s * 0.045, 0.035, -0.158));
            g.add(at(new THREE.SphereGeometry(0.045, 12, 10), mat({ color: s < 0 ? 0xe01818 : 0x2a6ae0, roughness: 0.8 }), s * 0.14, 0.1, -0.05));   // włosy po bokach
            const t = at(new THREE.BoxGeometry(0.004, 0.04, 0.004), mat({ color: 0x2a6ae0 }), s * 0.045, -0.01, -0.158); g.add(t);
        }
        const mouth = at(new THREE.TorusGeometry(0.05, 0.007, 6, 16, Math.PI), mat({ color: 0xe01818 }), 0, -0.055, -0.156); mouth.rotation.z = Math.PI; g.add(mouth);
    } else if (id === 'oni') {
        shell(mat({ color: 0xb01a12, roughness: 0.45 }), 0.135, 0.16, 0.07).position.z = -0.1;
        const white = mat({ color: 0xf0e8d8 });
        for (const s of [-1, 1]) {
            g.add(at(new THREE.SphereGeometry(0.02, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffd830 }), s * 0.045, 0.035, -0.158));
            g.add(at(new THREE.ConeGeometry(0.018, 0.1, 8), mat({ color: 0xd8c8a0 }), s * 0.07, 0.17, -0.1).rotateZ(-s * 0.3));
            g.add(at(new THREE.ConeGeometry(0.01, 0.04, 6), white, s * 0.035, -0.06, -0.162).rotateX(Math.PI));
        }
        const brow = at(new THREE.BoxGeometry(0.12, 0.012, 0.01), d, 0, 0.065, -0.158); g.add(brow);
    } else if (id === 'stitched') {
        shell(mat({ color: 0xb09a72, roughness: 1, bumpMap: tex.plaster, bumpScale: 2 }), 0.13, 0.155, 0.065).position.z = -0.1;
        for (const s of [-1, 1]) for (const r of [Math.PI / 4, -Math.PI / 4]) g.add(at(new THREE.BoxGeometry(0.04, 0.007, 0.006), d, s * 0.045, 0.03, -0.159).rotateZ(r));
        g.add(at(new THREE.BoxGeometry(0.11, 0.006, 0.006), d, 0, -0.06, -0.16));
        for (let i = 0; i < 6; i++) g.add(at(new THREE.BoxGeometry(0.006, 0.026, 0.006), d, (i - 2.5) * 0.02, -0.06, -0.16));
    } else if (id === 'luchador') {
        shell(mat({ color: 0x2a5ae0, roughness: 0.55 }), 0.13, 0.155, 0.065).position.z = -0.1;
        const white = mat({ color: 0xf6f6f0, roughness: 0.5 }), gold = mat({ color: 0xffc830, roughness: 0.4 });
        for (const s of [-1, 1]) {
            const e = at(new THREE.SphereGeometry(0.034, 14, 10), white, s * 0.046, 0.03, -0.152); e.scale.set(1.1, 0.8, 0.4); g.add(e);
            g.add(at(new THREE.SphereGeometry(0.013, 8, 6), d, s * 0.046, 0.03, -0.163));
            const wing = at(new THREE.ConeGeometry(0.03, 0.09, 3), gold, s * 0.07, 0.095, -0.15); wing.rotation.z = -s * 0.9; g.add(wing);
        }
        const star = at(new THREE.ConeGeometry(0.035, 0.07, 5), gold, 0, -0.035, -0.162); star.rotation.x = -Math.PI / 2; star.scale.set(1, 1, 0.3); g.add(star);
        const m = at(new THREE.BoxGeometry(0.07, 0.014, 0.01), white, 0, -0.07, -0.16); g.add(m);
    } else if (id === 'ninja') {
        shell(mat({ color: 0x101014, roughness: 0.95 }), 0.135, 0.16, 0.07).position.z = -0.1;
        g.add(at(new THREE.BoxGeometry(0.2, 0.05, 0.012), mat({ color: 0xd8b890, roughness: 0.6 }), 0, 0.03, -0.162));
        for (const s of [-1, 1]) { const eye = at(new THREE.BoxGeometry(0.03, 0.01, 0.006), new THREE.MeshBasicMaterial({ color: 0xf8f8f8 }), s * 0.045, 0.03, -0.1685); eye.rotation.z = -s * 0.25; g.add(eye); }
        g.add(at(new THREE.TorusGeometry(0.14, 0.012, 6, 28), mat({ color: 0xc01818 }), 0, 0.075, -0.02).rotateX(Math.PI / 2 - 0.05));
        const knot = at(new THREE.BoxGeometry(0.04, 0.025, 0.012), mat({ color: 0xc01818 }), 0.14, 0.07, 0.05); g.add(knot);
    } else if (id === 'robot') {
        const metal = mat({ color: 0x7a8090, metalness: 0.9, roughness: 0.3, envMapIntensity: Math.max(0.9, ENV) });
        const plate = at(new THREE.BoxGeometry(0.25, 0.28, 0.07), metal, 0, 0.0, -0.13); g.add(plate);
        g.add(at(new THREE.BoxGeometry(0.2, 0.04, 0.01), new THREE.MeshBasicMaterial({ color: 0x40e8ff }), 0, 0.045, -0.168));
        for (let i = 0; i < 5; i++) g.add(at(new THREE.BoxGeometry(0.14, 0.006, 0.008), d, 0, -0.06 - i * 0.012, -0.167));
        g.add(at(new THREE.CylinderGeometry(0.006, 0.006, 0.08, 6), metal, 0.07, 0.18, -0.12));
        g.add(at(new THREE.SphereGeometry(0.014, 8, 6), new THREE.MeshBasicMaterial({ color: 0xff3030 }), 0.07, 0.225, -0.12));
        for (const s of [-1, 1]) g.add(at(new THREE.CylinderGeometry(0.012, 0.012, 0.03, 8), metal, s * 0.138, 0.0, -0.13).rotateZ(Math.PI / 2));
    } else if (id === 'cat') {
        shell(mat({ color: 0x18141a, roughness: 0.8 }), 0.13, 0.155, 0.065).position.z = -0.1;
        for (const s of [-1, 1]) {
            g.add(at(new THREE.ConeGeometry(0.04, 0.08, 3), mat({ color: 0x18141a }), s * 0.085, 0.17, -0.1).rotateZ(-s * 0.2));
            g.add(at(new THREE.ConeGeometry(0.022, 0.05, 3), mat({ color: 0xff8ab0 }), s * 0.085, 0.165, -0.108).rotateZ(-s * 0.2));
            const eye = at(new THREE.SphereGeometry(0.02, 10, 8), new THREE.MeshBasicMaterial({ color: 0xd8ff30 }), s * 0.045, 0.03, -0.158); eye.scale.set(1, 1.3, 0.4); g.add(eye);
            g.add(at(new THREE.BoxGeometry(0.004, 0.032, 0.004), d, s * 0.045, 0.03, -0.162));
            for (let i = 0; i < 3; i++) { const w = at(new THREE.BoxGeometry(0.09, 0.0025, 0.0025), mat({ color: 0xf0f0f0 }), s * 0.1, -0.035 - i * 0.012, -0.15); w.rotation.z = s * (0.15 - i * 0.12); g.add(w); }
        }
        g.add(at(new THREE.ConeGeometry(0.012, 0.016, 3), mat({ color: 0xff8ab0 }), 0, -0.012, -0.165).rotateX(Math.PI));
    } else if (id === 'furascat') {   // maska kota ze skórki Furas (nie ma jej w sklepie): kremowa, różowe uszy i nos, kępki futra na policzkach
        const cream = mat({ color: 0xf6e6d4, roughness: 0.95 }), pink = mat({ color: 0xff8ab8, roughness: 0.6 });
        shell(cream, 0.13, 0.155, 0.065).position.z = -0.1;
        for (const s of [-1, 1]) {
            g.add(at(new THREE.ConeGeometry(0.045, 0.095, 4), cream, s * 0.085, 0.175, -0.1).rotateZ(-s * 0.22));
            g.add(at(new THREE.ConeGeometry(0.026, 0.062, 4), pink, s * 0.085, 0.168, -0.112).rotateZ(-s * 0.22));
            const eye = at(new THREE.SphereGeometry(0.021, 12, 10), new THREE.MeshBasicMaterial({ color: 0x7dff9a }), s * 0.045, 0.03, -0.158); eye.scale.set(1, 1.35, 0.4); g.add(eye);
            g.add(at(new THREE.BoxGeometry(0.004, 0.034, 0.004), d, s * 0.045, 0.03, -0.162));
            const blush = at(new THREE.SphereGeometry(0.02, 10, 8), mat({ color: 0xff9ab8, roughness: 0.8 }), s * 0.07, -0.02, -0.152); blush.scale.set(1.2, 0.7, 0.3); g.add(blush);
            for (let i = 0; i < 3; i++) {
                const w = at(new THREE.BoxGeometry(0.09, 0.0025, 0.0025), mat({ color: 0xffffff }), s * 0.105, -0.035 - i * 0.012, -0.15); w.rotation.z = s * (0.15 - i * 0.12); g.add(w);   // wąsy
                const tuft = at(new THREE.ConeGeometry(0.014, 0.045, 5), cream, s * (0.12 + i * 0.006), -0.045 - i * 0.03, -0.11).rotateZ(s * (1.2 + i * 0.25)); g.add(tuft);   // kępki na policzkach
            }
        }
        g.add(at(new THREE.ConeGeometry(0.014, 0.018, 3), pink, 0, -0.012, -0.165).rotateX(Math.PI));   // nos
        const m = at(new THREE.TorusGeometry(0.014, 0.0028, 6, 12, Math.PI), d, -0.014, -0.036, -0.162); m.rotation.z = Math.PI; g.add(m);
        const m2 = at(new THREE.TorusGeometry(0.014, 0.0028, 6, 12, Math.PI), d, 0.014, -0.036, -0.162); m2.rotation.z = Math.PI; g.add(m2);   // pyszczek "w"
    }

    // ---- nowe ----
    if (id === 'flayed') {   // twarz bez skóry: mięśnie, gałki oczne i zęby
        shell(mat({ color: 0x9a1a24, roughness: 0.3, emissive: 0x200408 }), 0.13, 0.155, 0.065).position.z = -0.1;
        const white = mat({ color: 0xf0ead8, roughness: 0.4 }), fibre = mat({ color: 0x4a0a10, roughness: 0.5 });
        for (const sd of [-1, 1]) {
            g.add(at(new THREE.SphereGeometry(0.026, 12, 10), white, sd * 0.045, 0.035, -0.15)); g.add(at(new THREE.SphereGeometry(0.012, 8, 6), new THREE.MeshBasicMaterial({ color: 0x1a0a08 }), sd * 0.045, 0.035, -0.172));
            g.add(at(new THREE.SphereGeometry(0.006, 6, 4), d, sd * 0.012, -0.012, -0.166));
        }
        for (let i = 0; i < 5; i++) g.add(at(new THREE.BoxGeometry(0.004, 0.12, 0.004), fibre, (i - 2) * 0.04, 0.0, -0.162).rotateZ((i - 2) * 0.12));
        g.add(at(new THREE.BoxGeometry(0.12, 0.024, 0.01), d, 0, -0.06, -0.158));
        for (let i = 0; i < 10; i++) g.add(at(new THREE.BoxGeometry(0.01, 0.022, 0.008), white, (i - 4.5) * 0.012, -0.052, -0.163));
    } else if (id === 'sewn') {   // zaszyte usta i krwawe łzy
        shell(mat({ color: 0xb8b4aa, roughness: 0.9, bumpMap: tex.plaster, bumpScale: 1.5 }), 0.13, 0.155, 0.065).position.z = -0.1;
        const gore = mat({ color: 0x7a0606, roughness: 0.3 }), thread = mat({ color: 0x2a1a14 });
        for (const sd of [-1, 1]) { const e = at(new THREE.SphereGeometry(0.025, 10, 8), d, sd * 0.045, 0.035, -0.157); e.scale.set(1, 1.5, 0.4); g.add(e); g.add(at(new THREE.BoxGeometry(0.006, 0.08, 0.004), gore, sd * 0.045, -0.025, -0.16)); }
        g.add(at(new THREE.BoxGeometry(0.1, 0.006, 0.004), d, 0, -0.06, -0.161));
        for (let i = 0; i < 7; i++) { const st = at(new THREE.BoxGeometry(0.004, 0.034, 0.005), thread, (i - 3) * 0.015, -0.06, -0.164); st.rotation.z = (i % 2 ? 0.25 : -0.25); g.add(st); g.add(at(new THREE.SphereGeometry(0.004, 5, 4), gore, (i - 3) * 0.015, -0.082, -0.162)); }
    } else if (id === 'faceless') {   // gładka biała twarz, puste oczodoły i czarne zacieki
        shell(mat({ color: 0xf2f0ee, roughness: 0.35 }), 0.13, 0.155, 0.065).position.z = -0.1;
        for (const sd of [-1, 1]) { const e = at(new THREE.SphereGeometry(0.024, 10, 8), d, sd * 0.045, 0.03, -0.158); e.scale.set(1, 1.9, 0.3); g.add(e); g.add(at(new THREE.BoxGeometry(0.008, 0.12, 0.004), d, sd * 0.045, -0.05, -0.159)); g.add(at(new THREE.BoxGeometry(0.003, 0.15, 0.003), d, sd * 0.045 + sd * 0.012, -0.07, -0.158)); }
        const m = at(new THREE.SphereGeometry(0.02, 10, 8), d, 0, -0.06, -0.16); m.scale.set(0.7, 1.4, 0.3); g.add(m);
    }

    // ---- druga paczka ----
    if (id === 'screamer') {   // krzyczący duch: wydłużona biała twarz i otwarte usta
        const sh = shell(mat({ color: 0xeeeeea, roughness: 0.4 }), 0.12, 0.18, 0.065); sh.position.z = -0.1;
        for (const sd of [-1, 1]) { const e = at(new THREE.SphereGeometry(0.025, 10, 8), d, sd * 0.045, 0.045, -0.158); e.scale.set(0.9, 2.1, 0.3); e.rotation.z = sd * 0.25; g.add(e); g.add(at(new THREE.BoxGeometry(0.006, 0.1, 0.004), d, sd * 0.05, -0.02, -0.158)); }
        const m = at(new THREE.SphereGeometry(0.03, 12, 10), d, 0, -0.075, -0.16); m.scale.set(1, 2.6, 0.3); g.add(m); g.add(at(new THREE.BoxGeometry(0.004, 0.09, 0.004), d, 0, -0.14, -0.158));
    } else if (id === 'zipperface') {   // zamek błyskawiczny zamiast ust
        shell(mat({ color: 0xb4b8a8, roughness: 0.7 }), 0.13, 0.155, 0.065).position.z = -0.1;
        const metal = mat({ color: 0xaaaeb4, metalness: 0.9, roughness: 0.3 }), gore = mat({ color: 0x7a0808, roughness: 0.3 });
        for (const sd of [-1, 1]) { g.add(at(new THREE.SphereGeometry(0.022, 10, 8), d, sd * 0.045, 0.035, -0.158)); g.add(at(new THREE.SphereGeometry(0.004, 5, 4), new THREE.MeshBasicMaterial({ color: 0xffffff }), sd * 0.045, 0.04, -0.178)); }
        g.add(at(new THREE.BoxGeometry(0.15, 0.008, 0.004), d, 0, -0.06, -0.161));
        for (let i = 0; i < 14; i++) g.add(at(new THREE.BoxGeometry(0.007, 0.01, 0.006), metal, (i - 6.5) * 0.0105, -0.06 + (i % 2 ? 0.006 : -0.006), -0.163));
        g.add(at(new THREE.BoxGeometry(0.02, 0.026, 0.008), metal, 0.03, -0.06, -0.168)); g.add(at(new THREE.TorusGeometry(0.008, 0.002, 5, 10), metal, 0.03, -0.085, -0.168));
        for (let i = 0; i < 5; i++) g.add(at(new THREE.SphereGeometry(0.004, 5, 4), gore, (i - 2) * 0.025, -0.07, -0.162));
    } else if (id === 'grin') {   // nienaturalnie szeroki uśmiech z mnóstwem zębów
        shell(mat({ color: 0xd8d4c8, roughness: 0.5 }), 0.13, 0.155, 0.065).position.z = -0.1;
        const white = mat({ color: 0xf6f2e4, roughness: 0.4 });
        for (const sd of [-1, 1]) { g.add(at(new THREE.SphereGeometry(0.026, 10, 8), d, sd * 0.045, 0.04, -0.157)); g.add(at(new THREE.SphereGeometry(0.005, 5, 4), new THREE.MeshBasicMaterial({ color: 0xffffff }), sd * 0.045, 0.045, -0.18)); }
        const mouth = at(new THREE.TorusGeometry(0.07, 0.012, 6, 22, Math.PI), d, 0, -0.01, -0.158); mouth.rotation.z = Math.PI; g.add(mouth);
        for (let i = 0; i < 17; i++) { const a = Math.PI + (i / 16) * Math.PI, x = Math.cos(a) * 0.066, y = -0.01 + Math.sin(a) * 0.066 + 0.014; g.add(at(new THREE.BoxGeometry(0.0075, 0.014, 0.006), white, x, y, -0.162)); }
    } else if (id === 'burned') {   // spalona twarz: zwęglona, z żarem w pęknięciach
        shell(mat({ color: 0x1a1210, roughness: 0.95, bumpMap: tex.plaster, bumpScale: 2 }), 0.13, 0.155, 0.065).position.z = -0.1;
        const ember = new THREE.MeshBasicMaterial({ color: 0xff6a10 }), white = mat({ color: 0xe8e0d0, roughness: 0.5 });
        for (const sd of [-1, 1]) g.add(at(new THREE.SphereGeometry(0.024, 10, 8), ember, sd * 0.045, 0.035, -0.158));
        for (let i = 0; i < 9; i++) { const c = at(new THREE.BoxGeometry(0.004, 0.04 + (i % 3) * 0.02, 0.004), ember, (i - 4) * 0.026, -0.01 + (i % 2) * 0.03, -0.163); c.rotation.z = (i - 4) * 0.18; g.add(c); }
        for (let i = 0; i < 8; i++) g.add(at(new THREE.BoxGeometry(0.01, 0.022, 0.008), white, (i - 3.5) * 0.013, -0.062, -0.162));
    }

    // ---- trzecia paczka ----
    if (id === 'pigmask') {   // zakrwawiona maska świni
        shell(mat({ color: 0xe8a0a0, roughness: 0.5 }), 0.13, 0.155, 0.065).position.z = -0.1;
        const dk = mat({ color: 0xc87878, roughness: 0.5 }), gore = mat({ color: 0x7a0808, roughness: 0.3 });
        g.add(at(new THREE.CylinderGeometry(0.05, 0.055, 0.05, 12), dk, 0, -0.025, -0.172).rotateX(Math.PI / 2));
        for (const sd of [-1, 1]) { g.add(at(new THREE.SphereGeometry(0.009, 6, 5), d, sd * 0.02, -0.025, -0.2)); g.add(at(new THREE.SphereGeometry(0.014, 8, 6), d, sd * 0.045, 0.04, -0.157)); g.add(at(new THREE.SphereGeometry(0.004, 5, 4), new THREE.MeshBasicMaterial({ color: 0xff2020 }), sd * 0.045, 0.045, -0.17)); g.add(at(new THREE.ConeGeometry(0.04, 0.07, 4), dk, sd * 0.1, 0.13, -0.07).rotateZ(-sd * 0.8)); g.add(at(new THREE.ConeGeometry(0.008, 0.035, 4), new THREE.MeshStandardMaterial({ color: 0xf0e8d0 }), sd * 0.03, -0.07, -0.17).rotateX(Math.PI)); }
        for (let i = 0; i < 6; i++) g.add(at(new THREE.BoxGeometry(0.01 + (i % 3) * 0.006, 0.05 + (i % 2) * 0.04, 0.004), gore, (i - 2.5) * 0.04, -0.07, -0.16));
    } else if (id === 'melted') {   // twarz topi się jak wosk
        shell(mat({ color: 0xd0c8a0, roughness: 0.35 }), 0.13, 0.155, 0.065).position.z = -0.1;
        const wax = mat({ color: 0xd0c8a0, roughness: 0.35 });
        for (let i = 0; i < 7; i++) { const len = 0.05 + (i * 29 % 6) * 0.025, dr = at(new THREE.SphereGeometry(0.014, 8, 6), wax, (i - 3) * 0.035, -0.06 - len / 2, -0.15); dr.scale.set(0.8, len / 0.014 / 2, 0.6); g.add(dr); g.add(at(new THREE.SphereGeometry(0.016, 8, 6), wax, (i - 3) * 0.035, -0.06 - len, -0.15)); }
        const e1 = at(new THREE.SphereGeometry(0.022, 10, 8), d, -0.045, 0.045, -0.158); e1.scale.set(1, 1.4, 0.4); g.add(e1); const e2 = at(new THREE.SphereGeometry(0.022, 10, 8), d, 0.045, -0.01, -0.158); e2.scale.set(1.1, 1.8, 0.4); g.add(e2);
        const m = at(new THREE.SphereGeometry(0.03, 10, 8), d, 0.01, -0.06, -0.16); m.scale.set(1.4, 0.8, 0.3); m.rotation.z = -0.3; g.add(m);
    } else if (id === 'crackeddoll') {   // pęknięta porcelanowa lalka: jedno oko puste
        shell(mat({ color: 0xf4f0ea, roughness: 0.15, metalness: 0.05 }), 0.13, 0.155, 0.065).position.z = -0.1;
        const gore = mat({ color: 0x8a0a0a, roughness: 0.25 });
        const e = at(new THREE.SphereGeometry(0.024, 10, 8), d, -0.045, 0.035, -0.157); e.scale.set(1, 1.2, 0.4); g.add(e);
        g.add(at(new THREE.SphereGeometry(0.022, 12, 10), mat({ color: 0x4a8ad8, roughness: 0.1 }), 0.045, 0.035, -0.155)); g.add(at(new THREE.SphereGeometry(0.009, 6, 5), d, 0.045, 0.035, -0.172));
        for (const sd of [-1, 1]) { const ch = at(new THREE.SphereGeometry(0.02, 8, 6), mat({ color: 0xf0a0a8, roughness: 0.6 }), sd * 0.07, -0.02, -0.15); ch.scale.set(1.2, 0.7, 0.3); g.add(ch); }
        const lips = at(new THREE.SphereGeometry(0.02, 10, 8), gore, 0, -0.06, -0.16); lips.scale.set(1.5, 0.5, 0.3); g.add(lips);
        const crack = [[-0.02, 0.1, 0.5], [0.03, 0.06, -0.4], [-0.05, 0.0, 0.8], [0.06, -0.03, -0.9], [0.0, -0.1, 0.3]];
        for (const [x, y, r] of crack) { const c = at(new THREE.BoxGeometry(0.004, 0.05, 0.003), d, x, y, -0.16); c.rotation.z = r; g.add(c); }
        g.add(at(new THREE.BoxGeometry(0.006, 0.07, 0.004), gore, -0.045, -0.02, -0.158));
    } else if (id === 'heistmask') {   // Scary GTA: kominiarka rabusia ze świecącymi czerwonymi oczami
        shell(mat({ color: 0x0c0c0e, roughness: 1 }), 0.14, 0.165, 0.07).position.z = -0.1;
        const skin = mat({ color: 0xc89878, roughness: 0.7 }), glow = new THREE.MeshBasicMaterial({ color: 0xff2a10 });
        g.add(at(new THREE.BoxGeometry(0.14, 0.04, 0.01), skin, 0, 0.035, -0.162)); g.add(at(new THREE.BoxGeometry(0.06, 0.02, 0.01), skin, 0, -0.06, -0.165));
        for (const sd of [-1, 1]) g.add(at(new THREE.SphereGeometry(0.012, 8, 6), glow, sd * 0.045, 0.035, -0.168));
        for (let i = 0; i < 7; i++) g.add(at(new THREE.BoxGeometry(0.012, 0.004, 0.004), mat({ color: 0x3a3a40 }), (i - 3) * 0.03, 0.01, -0.166));
    } else if (id === 'bandit') {   // Scary GTA: czerwona bandana z czaszką na dolnej części twarzy
        const red = mat({ color: 0xb01818, roughness: 0.95, side: THREE.DoubleSide }), bone = mat({ color: 0xf0e8d8, roughness: 0.6 });
        const cloth = at(new THREE.SphereGeometry(1, 22, 10, 0, Math.PI * 2, Math.PI * 0.5, Math.PI * 0.4), red, 0, 0.0, -0.1); cloth.scale.set(0.145, 0.17, 0.08); g.add(cloth);
        const sk = at(new THREE.SphereGeometry(0.022, 10, 8), bone, 0, -0.04, -0.168); sk.scale.set(1, 0.9, 0.4); g.add(sk);
        for (const sd of [-1, 1]) g.add(at(new THREE.SphereGeometry(0.006, 6, 5), d, sd * 0.009, -0.037, -0.178));
        for (let i = 0; i < 3; i++) g.add(at(new THREE.BoxGeometry(0.006, 0.01, 0.004), bone, (i - 1) * 0.008, -0.062, -0.172));
        g.add(at(new THREE.BoxGeometry(0.04, 0.05, 0.03), red, 0.1, -0.03, 0.02).rotateZ(0.4));
    } else if (id === 'copzombie') {   // Scary GTA: twarz zombie-policjanta: czapka, czerwono-niebieskie oczy, wyszczerzone zęby
        shell(mat({ color: 0x7a8a7a, roughness: 0.85 }), 0.13, 0.155, 0.065).position.z = -0.1;
        const navy = mat({ color: 0x141c3a, roughness: 0.6 }), tooth = mat({ color: 0xe8e0c0, roughness: 0.5 }), gore = mat({ color: 0x7a0808, roughness: 0.3 });
        g.add(at(new THREE.BoxGeometry(0.27, 0.03, 0.09), navy, 0, 0.1, -0.15)); g.add(at(new THREE.BoxGeometry(0.1, 0.03, 0.01), mat({ color: 0xc8ccd4, metalness: 0.9, roughness: 0.3 }), 0, 0.112, -0.2));
        g.add(at(new THREE.SphereGeometry(0.02, 8, 6), new THREE.MeshBasicMaterial({ color: 0xff2010 }), -0.045, 0.035, -0.158)); g.add(at(new THREE.SphereGeometry(0.02, 8, 6), new THREE.MeshBasicMaterial({ color: 0x2060ff }), 0.045, 0.035, -0.158));
        for (let i = 0; i < 8; i++) g.add(at(new THREE.BoxGeometry(0.011, 0.02 + (i % 2) * 0.008, 0.006), tooth, (i - 3.5) * 0.017, -0.065, -0.162));
        g.add(at(new THREE.BoxGeometry(0.01, 0.07, 0.004), gore, 0.06, -0.01, -0.16));
    }
    return g;
}

// ---------- RĘKAWY (materiał rękawa przy dłoni) ----------
function patternTex(key, draw) {
    if (cache[key]) return cache[key];
    const c = makeCanvas(256, 256), x = c.getContext('2d'); draw(x, 256); return (cache[key] = toTex(c, true));
}
export function extraSleeveMat(id, base) {
    if (id === 'sweater') return new THREE.MeshStandardMaterial(Object.assign(base, { roughness: 0.95, map: patternTex('sweater', (x, S) => {
        x.fillStyle = '#b01818'; x.fillRect(0, 0, S, S); x.fillStyle = '#f0f0f0';
        for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) if ((i + j) % 2 === 0) { x.beginPath(); x.moveTo(i * 32 + 16, j * 32 + 4); x.lineTo(i * 32 + 26, j * 32 + 28); x.lineTo(i * 32 + 6, j * 32 + 28); x.closePath(); x.fill(); }
        x.fillStyle = '#1a6a2a'; x.fillRect(0, 0, S, 22); x.fillRect(0, S - 22, S, 22);
    }) }));
    if (id === 'hawaii') return new THREE.MeshStandardMaterial(Object.assign(base, { roughness: 0.8, map: patternTex('hawaii', (x, S) => {
        x.fillStyle = '#1a6ab0'; x.fillRect(0, 0, S, S);
        for (let i = 0; i < 14; i++) { const px = (i * 73) % S, py = (i * 131) % S; x.fillStyle = i % 2 ? '#ff5a8a' : '#ffd23a'; for (let k = 0; k < 5; k++) { const a = k / 5 * 6.28; x.beginPath(); x.arc(px + Math.cos(a) * 12, py + Math.sin(a) * 12, 9, 0, 7); x.fill(); } x.fillStyle = '#ffffff'; x.beginPath(); x.arc(px, py, 6, 0, 7); x.fill(); }
    }) }));
    if (id === 'plaid') return new THREE.MeshStandardMaterial(Object.assign(base, { roughness: 0.95, map: patternTex('plaid', (x, S) => {
        x.fillStyle = '#a01818'; x.fillRect(0, 0, S, S); x.fillStyle = 'rgba(0,0,0,0.55)';
        for (let i = 0; i < S; i += 64) { x.fillRect(i, 0, 22, S); x.fillRect(0, i, S, 22); }
        x.fillStyle = 'rgba(255,255,255,0.35)'; for (let i = 32; i < S; i += 64) { x.fillRect(i, 0, 4, S); x.fillRect(0, i, S, 4); }
    }) }));
    if (id === 'ember') return new THREE.MeshStandardMaterial(Object.assign(base, { color: 0x1a1210, emissive: 0xff5a10, emissiveIntensity: 0.8, roughness: 0.9, emissiveMap: patternTex('ember', (x, S) => {
        x.fillStyle = '#300800'; x.fillRect(0, 0, S, S); x.strokeStyle = '#ffa030'; x.lineWidth = 3;
        for (let i = 0; i < 26; i++) { let px = (i * 97) % S, py = (i * 61) % S; x.beginPath(); x.moveTo(px, py); for (let k = 0; k < 5; k++) { px += ((i * 7 + k * 13) % 31) - 15; py += ((i * 11 + k * 17) % 31) - 15; x.lineTo(px, py); } x.stroke(); }
    }) }));
    if (id === 'denim') return new THREE.MeshStandardMaterial(Object.assign(base, { roughness: 0.95, map: patternTex('denim', (x, S) => {
        x.fillStyle = '#2a4a86'; x.fillRect(0, 0, S, S);
        for (let i = 0; i < 4000; i++) { x.fillStyle = 'rgba(' + (i % 2 ? '120,160,220' : '10,20,50') + ',0.12)'; x.fillRect((i * 37) % S, (i * 91) % S, 1, 3); }
        x.strokeStyle = '#e8c070'; x.lineWidth = 2; x.setLineDash([8, 6]); x.beginPath(); x.moveTo(0, 20); x.lineTo(S, 20); x.moveTo(0, S - 20); x.lineTo(S, S - 20); x.stroke();
    }) }));
    if (id === 'galaxy') return new THREE.MeshStandardMaterial(Object.assign(base, { color: 0x1a1240, roughness: 0.7, emissive: 0xffffff, emissiveIntensity: 0.9, emissiveMap: patternTex('galaxy', (x, S) => {
        x.fillStyle = '#05030f'; x.fillRect(0, 0, S, S);
        for (let i = 0; i < 90; i++) { const v = 140 + (i * 53) % 115; x.fillStyle = 'rgb(' + v + ',' + v + ',' + (v + 20 > 255 ? 255 : v + 20) + ')'; x.beginPath(); x.arc((i * 89) % S, (i * 151) % S, 0.8 + (i % 4) * 0.5, 0, 7); x.fill(); }
        const g2 = x.createRadialGradient(150, 110, 4, 150, 110, 90); g2.addColorStop(0, 'rgba(200,90,255,0.55)'); g2.addColorStop(1, 'rgba(60,20,160,0)'); x.fillStyle = g2; x.fillRect(0, 0, S, S);
    }) }));
    if (id === 'chain') return new THREE.MeshStandardMaterial(Object.assign(base, { color: 0xffffff, metalness: 0.95, roughness: 0.4, envMapIntensity: Math.max(0.9, ENV), map: patternTex('chain', (x, S) => {
        x.fillStyle = '#3a3c42'; x.fillRect(0, 0, S, S); x.strokeStyle = '#b8bcc8'; x.lineWidth = 2;
        for (let j = 0; j < 16; j++) for (let i = 0; i < 16; i++) { x.beginPath(); x.arc(i * 16 + (j % 2) * 8 + 8, j * 12 + 8, 6.5, 0, 7); x.stroke(); }
    }) }));
    if (id === 'bloodstained') return new THREE.MeshStandardMaterial(Object.assign(base, { roughness: 0.9, map: patternTex('bloodstained', (x, S) => {
        x.fillStyle = '#d8d0c0'; x.fillRect(0, 0, S, S);
        for (let i = 0; i < 26; i++) { const px = (i * 97) % S, py = (i * 61) % S, r = 8 + (i * 13) % 28; x.fillStyle = 'rgba(' + (90 + (i * 7) % 40) + ',4,4,0.85)'; x.beginPath(); x.arc(px, py, r, 0, 7); x.fill(); x.fillRect(px - 2, py, 4, 20 + (i * 11) % 60); }
        x.fillStyle = 'rgba(60,0,0,0.7)'; x.fillRect(0, S - 30, S, 30);
    }) }));
    if (id === 'rotting') return new THREE.MeshStandardMaterial(Object.assign(base, { roughness: 0.95, map: patternTex('rotting', (x, S) => {
        x.fillStyle = '#6a7458'; x.fillRect(0, 0, S, S);
        for (let i = 0; i < 40; i++) { const px = (i * 89) % S, py = (i * 53) % S, r = 6 + (i * 7) % 22; x.fillStyle = i % 3 === 0 ? 'rgba(90,10,10,0.8)' : (i % 3 === 1 ? 'rgba(160,150,60,0.6)' : 'rgba(30,40,20,0.7)'); x.beginPath(); x.arc(px, py, r, 0, 7); x.fill(); }
        x.fillStyle = '#e8e4d0'; for (let i = 0; i < 60; i++) x.fillRect((i * 37) % S, (i * 71) % S, 3, 8);
    }) }));
    if (id === 'barbed') return new THREE.MeshStandardMaterial(Object.assign(base, { color: 0xffffff, metalness: 0.7, roughness: 0.5, map: patternTex('barbed', (x, S) => {
        x.fillStyle = '#26262a'; x.fillRect(0, 0, S, S); x.strokeStyle = '#8a8e96'; x.lineWidth = 4;
        for (let i = -S; i < S * 2; i += 48) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i + S, S); x.stroke(); }
        x.lineWidth = 3; for (let i = 0; i < 40; i++) { const px = (i * 61) % S, py = (i * 97) % S; x.beginPath(); x.moveTo(px - 8, py - 8); x.lineTo(px + 8, py + 8); x.moveTo(px + 8, py - 8); x.lineTo(px - 8, py + 8); x.stroke(); }
        x.fillStyle = 'rgba(110,50,20,0.55)'; for (let i = 0; i < 30; i++) x.fillRect((i * 43) % S, (i * 29) % S, 22, 10); x.fillStyle = 'rgba(120,6,6,0.7)'; for (let i = 0; i < 10; i++) x.fillRect((i * 83) % S, (i * 47) % S, 9, 26);
    }) }));
    if (id === 'woven') return new THREE.MeshStandardMaterial(Object.assign(base, { roughness: 1, map: patternTex('woven', (x, S) => {
        x.fillStyle = '#c8c0b0'; x.fillRect(0, 0, S, S); x.strokeStyle = 'rgba(70,60,50,0.5)'; x.lineWidth = 2;
        for (let i = 0; i < S; i += 12) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i + 40, S); x.stroke(); x.beginPath(); x.moveTo(0, i); x.lineTo(S, i + 40); x.stroke(); }
    }) }));
    if (id === 'copuniform') return new THREE.MeshStandardMaterial(Object.assign(base, { roughness: 0.85, map: patternTex('copuniform', (x, S) => {   // Scary GTA: granatowy mundur ze srebrnym paskiem i krwią
        x.fillStyle = '#101a3a'; x.fillRect(0, 0, S, S); x.fillStyle = '#c0c8d8'; x.fillRect(0, S * 0.45, S, 10); x.fillRect(0, S * 0.45 + 18, S, 4);
        x.fillStyle = '#6a0808'; for (let i = 0; i < 9; i++) { x.beginPath(); x.ellipse((i * 97) % S, (i * 53) % S, 10 + i % 4 * 6, 6 + i % 3 * 5, i, 0, 7); x.fill(); }
    }) }));
    return null;
}

// ---------- RĘKAWICE (materiał dłoni) ----------
export function extraGloveMat(id) {
    if (id === 'mittens') return new THREE.MeshStandardMaterial({ color: 0xc02020, roughness: 1, bumpMap: tex.plaster, bumpScale: 2, envMapIntensity: ENV });
    if (id === 'boxing') return new THREE.MeshStandardMaterial({ color: 0xd01818, roughness: 0.3, metalness: 0.1, envMapIntensity: ENV });
    if (id === 'rubber') return new THREE.MeshStandardMaterial({ color: 0xf2d020, roughness: 0.2, envMapIntensity: ENV });
    if (id === 'tar') return new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 0.05, metalness: 0.5, emissive: 0x1a0020, envMapIntensity: ENV });
    if (id === 'golden') return new THREE.MeshStandardMaterial({ color: 0xd4a640, metalness: 1, roughness: 0.2, envMapIntensity: Math.max(0.8, ENV) });
    if (id === 'chrome') return new THREE.MeshStandardMaterial({ color: 0xe8ecf0, roughness: 0.06, metalness: 1, envMapIntensity: Math.max(1.2, ENV) });
    if (id === 'lavaglove') return new THREE.MeshStandardMaterial({ color: 0x1a0a06, roughness: 0.85, emissive: 0xff5a10, emissiveIntensity: 1.1, emissiveMap: patternTex('lavaglove', (x, S) => {
        x.fillStyle = '#200600'; x.fillRect(0, 0, S, S); x.strokeStyle = '#ffb040'; x.lineWidth = 4; x.lineCap = 'round';
        for (let i = 0; i < 20; i++) { let px = (i * 83) % S, py = (i * 47) % S; x.beginPath(); x.moveTo(px, py); for (let k = 0; k < 5; k++) { px += ((i * 5 + k * 11) % 41) - 20; py += ((i * 9 + k * 19) % 37) - 8; x.lineTo(px, py); } x.stroke(); }
    }), envMapIntensity: ENV });
    if (id === 'blooded') return new THREE.MeshStandardMaterial({ color: 0x7a0808, roughness: 0.12, metalness: 0.1, emissive: 0x200000, envMapIntensity: ENV });
    if (id === 'rotten') return new THREE.MeshStandardMaterial({ color: 0x6a7a5a, roughness: 0.9, bumpMap: tex.plaster, bumpScale: 1.5, emissive: 0x101808, envMapIntensity: ENV });
    if (id === 'veined') return new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6, emissive: 0x1a0820, envMapIntensity: ENV, map: patternTex('veined', (x, S) => {
        x.fillStyle = '#d8d0d8'; x.fillRect(0, 0, S, S); x.strokeStyle = '#1a0a1e'; x.lineCap = 'round';
        for (let i = 0; i < 22; i++) { let px = (i * 71) % S, py = (i * 53) % S; x.lineWidth = 2 + (i % 3); x.beginPath(); x.moveTo(px, py); for (let k = 0; k < 6; k++) { px += ((i * 13 + k * 29) % 41) - 20; py += 14 + (i + k * 7) % 14; x.lineTo(px, py); } x.stroke(); }
    }) });
    if (id === 'cashgloves') return new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6, envMapIntensity: ENV, map: patternTex('cashgloves', (x, S) => {   // Scary GTA: dłonie z banknotów
        x.fillStyle = '#4a9a5a'; x.fillRect(0, 0, S, S); x.strokeStyle = '#1e5a2a'; x.lineWidth = 6; x.strokeRect(8, 8, S - 16, S - 16);
        x.fillStyle = '#2a6a3a'; x.beginPath(); x.arc(S / 2, S / 2, 70, 0, 7); x.fill(); x.fillStyle = '#c8f0c8'; x.font = 'bold 110px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('$', S / 2, S / 2 + 6);
    }) });
    if (id === 'candy') return new THREE.MeshStandardMaterial({ color: 0xff7ac8, roughness: 0.22, emissive: 0x401030, envMapIntensity: ENV });
    if (id === 'rainbow') return new THREE.MeshStandardMaterial({ roughness: 0.4, map: patternTex('rainbow', (x, S) => { ['#ff3a3a', '#ff9a2a', '#ffe23a', '#3ad84a', '#3a8aff', '#9a4aff'].forEach((c, i) => { x.fillStyle = c; x.fillRect(0, i * S / 6, S, S / 6 + 1); }); }), envMapIntensity: ENV });
    return null;
}

// ---------- SKÓRKI (futro goryla) ----------
export const EXTRA_SKINS = {
    snowape: { fur: 0xe4ecf4, face: 0x8aa4c0 },
    pumpkinape: { fur: 0xd86a10, face: 0x3a2008 },
    zombie: { fur: 0x6a8a4a, face: 0x2a3a1e, glowEyes: true },
    jungle: { fur: 0x2f6a2a, face: 0x12200e },
    nightmare: { fur: 0x2a0a3a, face: 0x100418, glowEyes: true },
    sakura: { fur: 0xf2b8cc, face: 0x8a4a5a },
    lavaape: { fur: 0x1c0a06, face: 0x3a0e04, glowEyes: true },
    panda: { fur: 0xf2f2f0, face: 0x141414 },
    midnight: { fur: 0x14204a, face: 0x070a1a },
    demonape: { fur: 0x5a0808, face: 0x0e0000, glowEyes: true },
    skeletape: { fur: 0xe6dfc8, face: 0x15110e, glowEyes: true },
    plagueape: { fur: 0x7a8a3a, face: 0x2a3010, glowEyes: true },
    voidape: { fur: 0x050308, face: 0x000000, glowEyes: true },
    rustape: { fur: 0x8a4a22, face: 0x3a1a0a, metal: true },
    frozenape: { fur: 0xa8c8d8, face: 0x30485a, glowEyes: true },
    therian: { fur: 0xc9a47e, face: 0xe8b4a4, bunnyEars: true, bunnyTail: true, carrot: true },   // spikyvr: uszy królika, mały ogonek i marchewka, którą wciąż gryzie (avatar.js)
    furasek: { fur: 0xf8d6b8, face: 0xe89aa8, tail: true, catMask: true },   // słodki kotek: brzoskwiniowe futro, maska kota i puchaty ogon (w sklepie)
    bubblegum: { fur: 0xff9ac8, face: 0xc85a8a },
    cottoncandy: { fur: 0xb8e0ff, face: 0xe890c0 },
    honeyape: { fur: 0xf0b830, face: 0x6a3a10 },
    mintape: { fur: 0x9ae8c8, face: 0x5a3a2a },
    cadaver: { fur: 0x8a9088, face: 0x1e221e, glowEyes: true },   // trup: szare, rozkładające się futro i świecące oczy
    prisonape: { fur: 0xe8721a, face: 0x3a1a08 },   // Scary GTA: pomarańczowy kombinezon więźnia
    swatape: { fur: 0x161c2a, face: 0x080a10, glowEyes: true },   // Scary GTA: oddział SWAT w ciemnym granacie
    neonape: { fur: 0x1a0a3a, face: 0xff2a9a, glowEyes: true },   // Scary GTA: neonowe miasto nocą
    vaultape: { fur: 0xd4a640, face: 0x4a3008, metal: true },   // Scary GTA: złoty skarbiec
    furas: { fur: 0xf6e2cc, face: 0xc89a88, tail: true, catMask: true }   // ranga FURAS (BoyIsGamer): kremowe futro; maskę kota i puchaty ogon dokłada avatar.js
};

// ---------- ODZNAKI (rysowane na okrągłej przypince; x = kontekst 2D 128x128) ----------
export const EXTRA_BADGES = {
    ghost: { bg: '#16202e', draw: (x) => { x.fillStyle = '#e8f4ff'; x.beginPath(); x.arc(64, 58, 28, Math.PI, 0); x.lineTo(92, 96); for (let i = 0; i < 4; i++) x.lineTo(92 - (i + 1) * 14, i % 2 ? 96 : 84); x.closePath(); x.fill(); x.fillStyle = '#16202e'; x.beginPath(); x.arc(54, 58, 5, 0, 7); x.arc(74, 58, 5, 0, 7); x.fill(); } },
    banana: { bg: '#3a2c06', draw: (x) => { x.strokeStyle = '#ffe040'; x.lineWidth = 16; x.lineCap = 'round'; x.beginPath(); x.arc(64, 44, 38, Math.PI * 0.15, Math.PI * 0.85); x.stroke(); x.strokeStyle = '#6a4a10'; x.lineWidth = 6; x.beginPath(); x.moveTo(30, 66); x.lineTo(24, 58); x.stroke(); } },
    flag: { bg: '#10101a', draw: (x) => { for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { x.fillStyle = (i + j) % 2 ? '#f4f4f4' : '#101010'; x.fillRect(28 + i * 18, 30 + j * 18, 18, 18); } x.fillStyle = '#d0d0d0'; x.fillRect(24, 26, 4, 80); } },
    pumpkin: { bg: '#2a1004', draw: (x) => { x.fillStyle = '#e8781a'; x.beginPath(); x.ellipse(64, 70, 36, 30, 0, 0, 7); x.fill(); x.fillStyle = '#2a5a1a'; x.fillRect(60, 34, 8, 14); x.fillStyle = '#2a1004'; x.beginPath(); x.moveTo(46, 64); x.lineTo(56, 64); x.lineTo(51, 54); x.moveTo(72, 64); x.lineTo(82, 64); x.lineTo(77, 54); x.fill(); x.fillRect(48, 80, 32, 6); } },
    snow: { bg: '#0a1a30', draw: (x) => { x.strokeStyle = '#d8f0ff'; x.lineWidth = 6; x.lineCap = 'round'; for (let i = 0; i < 3; i++) { const a = i * Math.PI / 3; x.beginPath(); x.moveTo(64 + Math.cos(a) * 38, 64 + Math.sin(a) * 38); x.lineTo(64 - Math.cos(a) * 38, 64 - Math.sin(a) * 38); x.stroke(); } } },
    sun: { bg: '#3a1a00', draw: (x) => { x.fillStyle = '#ffd030'; x.beginPath(); x.arc(64, 64, 22, 0, 7); x.fill(); x.strokeStyle = '#ffd030'; x.lineWidth = 6; x.lineCap = 'round'; for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; x.beginPath(); x.moveTo(64 + Math.cos(a) * 32, 64 + Math.sin(a) * 32); x.lineTo(64 + Math.cos(a) * 44, 64 + Math.sin(a) * 44); x.stroke(); } } },
    present: { bg: '#3a0a1a', draw: (x) => { x.fillStyle = '#e03a5a'; x.fillRect(34, 52, 60, 44); x.fillStyle = '#ffd23a'; x.fillRect(60, 52, 8, 44); x.fillRect(34, 70, 60, 8); x.beginPath(); x.ellipse(52, 46, 14, 9, -0.4, 0, 7); x.ellipse(76, 46, 14, 9, 0.4, 0, 7); x.fill(); } },
    daily: { bg: '#0a2a3a', draw: (x) => { x.fillStyle = '#f4f4f4'; x.fillRect(34, 40, 60, 56); x.fillStyle = '#e03a3a'; x.fillRect(34, 40, 60, 14); x.fillStyle = '#0a2a3a'; for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) x.fillRect(42 + i * 18, 62 + j * 11, 10, 6); x.fillRect(46, 32, 6, 14); x.fillRect(76, 32, 6, 14); } },
    nm: { bg: '#1a0420', draw: (x) => { x.fillStyle = '#ff2a4a'; x.beginPath(); x.moveTo(64, 26); x.lineTo(96, 54); x.lineTo(88, 100); x.lineTo(40, 100); x.lineTo(32, 54); x.closePath(); x.fill(); x.fillStyle = '#1a0420'; x.beginPath(); x.arc(52, 64, 7, 0, 7); x.arc(76, 64, 7, 0, 7); x.fill(); x.fillRect(46, 82, 36, 6); } },
    heart: { bg: '#3a0a1a', draw: (x) => { x.fillStyle = '#ff3a6a'; x.beginPath(); x.moveTo(64, 98); x.bezierCurveTo(14, 62, 30, 24, 64, 48); x.bezierCurveTo(98, 24, 114, 62, 64, 98); x.fill(); } },
    bolt: { bg: '#10142a', draw: (x) => { x.fillStyle = '#ffe23a'; x.beginPath(); x.moveTo(72, 18); x.lineTo(38, 70); x.lineTo(60, 70); x.lineTo(52, 110); x.lineTo(92, 56); x.lineTo(68, 56); x.closePath(); x.fill(); } },
    clover: { bg: '#0a2a14', draw: (x) => { x.fillStyle = '#3ad86a'; for (const [cx, cy] of [[48, 48], [80, 48], [48, 80], [80, 80]]) { x.beginPath(); x.arc(cx, cy, 20, 0, 7); x.fill(); } x.fillStyle = '#0a2a14'; x.fillRect(62, 62, 4, 40); } },
    goldfish: { bg: '#2a1a04', draw: (x) => {   // nagroda za The Fur Den na Nightmare: złota rybka
        x.fillStyle = '#ffd23a'; x.beginPath(); x.ellipse(60, 64, 34, 20, 0, 0, 7); x.fill(); x.beginPath(); x.moveTo(88, 64); x.lineTo(112, 44); x.lineTo(112, 84); x.closePath(); x.fill();
        x.fillStyle = '#ffb020'; x.beginPath(); x.moveTo(52, 46); x.lineTo(68, 36); x.lineTo(70, 48); x.closePath(); x.fill();
        x.fillStyle = '#1a0a02'; x.beginPath(); x.arc(42, 58, 4, 0, 7); x.fill(); } },
    furas: { bg: '#3a0a2a', draw: (x) => {   // ranga FURAS: biały kotek z różowymi uszami, zielonymi oczami i wąsami
        x.fillStyle = '#fff2e4'; x.beginPath(); x.moveTo(28, 70); x.lineTo(32, 26); x.lineTo(58, 44); x.lineTo(70, 44); x.lineTo(96, 26); x.lineTo(100, 70); x.quadraticCurveTo(100, 108, 64, 108); x.quadraticCurveTo(28, 108, 28, 70); x.closePath(); x.fill();
        x.fillStyle = '#ff8ab8'; x.beginPath(); x.moveTo(37, 40); x.lineTo(50, 50); x.lineTo(40, 62); x.closePath(); x.moveTo(91, 40); x.lineTo(78, 50); x.lineTo(88, 62); x.closePath(); x.fill();
        x.fillStyle = '#5aff8a'; for (const cx of [48, 80]) { x.beginPath(); x.ellipse(cx, 66, 7, 9, 0, 0, 7); x.fill(); } x.fillStyle = '#111'; for (const cx of [48, 80]) x.fillRect(cx - 1.5, 58, 3, 16);
        x.fillStyle = '#ff6a9a'; x.beginPath(); x.moveTo(58, 80); x.lineTo(70, 80); x.lineTo(64, 87); x.closePath(); x.fill();
        x.strokeStyle = '#2a1a1a'; x.lineWidth = 3; x.lineCap = 'round'; x.beginPath(); x.arc(58, 88, 6, 0.2, Math.PI - 0.2); x.arc(70, 88, 6, 0.2, Math.PI - 0.2); x.stroke();
        x.strokeStyle = '#ffffff'; x.lineWidth = 2; for (const s of [-1, 1]) for (let i = 0; i < 2; i++) { x.beginPath(); x.moveTo(64 + s * 26, 82 + i * 6); x.lineTo(64 + s * 46, 78 + i * 12); x.stroke(); } } },
    paw: { bg: '#2a1a0a', draw: (x) => { x.fillStyle = '#e8c890'; x.beginPath(); x.ellipse(64, 78, 24, 20, 0, 0, 7); x.fill(); for (const [cx, cy] of [[34, 56], [52, 38], [76, 38], [94, 56]]) { x.beginPath(); x.ellipse(cx, cy, 9, 12, 0, 0, 7); x.fill(); } } }
};

// ---------- WARSTWA GROZY NA WSZYSTKICH KOSMETYKACH ----------
// Każda czapka, okulary i maska dostaje zabrudzone, przyciemnione materiały oraz krew i pęknięcia; słodkie przedmioty (CUTE) przechodzą w paletę zaschniętej krwi.
// Rękawy i rękawice dostają tylko przyciemnienie (grim). Świecące (emissive), przezroczyste i bezcieniowe (MeshBasic) materiały zostają bez zmian, żeby aureole, neony i duchy nadal świeciły.
const CUTE = new Set(['hat:party', 'hat:bunny', 'hat:teddyears', 'hat:sprout', 'hat:catears', 'hat:flowercrown', 'hat:donut', 'hat:unicorn', 'hat:santa', 'hat:chef', 'hat:beanie', 'hat:propeller',
    'glasses:heart', 'glasses:starglasses', 'glasses:hippie', 'glasses:round', 'glasses:3d', 'mask:cat', 'mask:snowman', 'mask:luchador', 'mask:clown', 'sleeve:sweater', 'sleeve:hawaii', 'sleeve:plaid', 'sleeve:woven',
    'gloves:mittens', 'gloves:candy', 'gloves:rainbow', 'gloves:boxing', 'gloves:rubber']);
const grimCache = new WeakMap(), BLOOD_DARK = new THREE.Color(0x3a0b0b), GRIME = new THREE.Color(0x1e1612);
export function grim(m, strong) {
    if (!m || !m.color) return m;
    const glow = m.emissive ? m.emissiveIntensity * Math.max(m.emissive.r, m.emissive.g, m.emissive.b) : 0;
    if (!strong && (m.isMeshBasicMaterial || m.transparent || glow > 0.3)) return m;   // aureole, neony i duchy świecą dalej; słodkie przedmioty (strong) tracą też nieoświetlone, przezroczyste i różowe świecące barwy
    const k = strong ? 1 : 0; let c = grimCache.get(m); if (!c) grimCache.set(m, c = [null, null]);
    if (c[k]) return c[k];
    const n = m.clone(); n.color.multiplyScalar(strong ? 0.55 : 0.62).lerp(strong ? BLOOD_DARK : GRIME, strong ? 0.6 : 0.36);
    if (strong && n.emissive) n.emissive.multiplyScalar(0.25);
    if (n.roughness !== undefined) n.roughness = Math.min(1, n.roughness + 0.15);
    if (n.metalness > 0.5) n.metalness *= 0.8;
    c[k] = n; return n;
}
export const isCute = (slot, id) => CUTE.has(slot + ':' + id);
const BLOOD = () => new THREE.MeshStandardMaterial({ color: 0x7a0a0a, roughness: 0.35, emissive: 0x2a0000, envMapIntensity: ENV });
function seedOf(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return () => ((h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0) / 4294967296); }
export function scaryify(g, slot, id) {
    if (!g || !g.children.length) return g;
    const strong = isCute(slot, id), R = seedOf(slot + id);
    g.traverse(o => { if (o.isMesh) o.material = Array.isArray(o.material) ? o.material.map(m => grim(m, strong)) : grim(o.material, strong); });
    g.updateMatrixWorld(true);
    const b = new THREE.Box3().setFromObject(g), w = b.max.x - b.min.x, red = BLOOD(), dropN = strong ? 4 : 3;
    const drip = (x, y, z, len) => g.add(at(new THREE.CylinderGeometry(0.0032, 0.0016, len, 5), red, x, y - len / 2, z));
    if (slot === 'hat') {   // krew skapuje z dolnej krawędzi czapki
        for (let i = 0; i < dropN; i++) { const x = b.min.x + w * (0.12 + 0.76 * R()), z = b.min.z + (b.max.z - b.min.z) * (0.1 + 0.5 * R()); drip(x, b.min.y + 0.004, z, 0.025 + R() * 0.045); }
    } else if (slot === 'glasses') {   // pęknięte szkło i kropla krwi pod szkłem
        const crackMat = new THREE.MeshBasicMaterial({ color: 0xe8e0d0 }), cy = (b.min.y + b.max.y) / 2, z = b.min.z - 0.001;
        for (const [dx, rot, l] of [[-0.35, 0.8, 0.05], [-0.3, -0.5, 0.035], [0.3, 0.6, 0.03]]) { const c = at(new THREE.BoxGeometry(l, 0.0015, 0.0015), crackMat, (b.min.x + b.max.x) / 2 + w * dx * 0.5, cy, z); c.rotation.z = rot; g.add(c); }
        drip(b.min.x + w * 0.7, b.min.y + 0.003, z, 0.03 + R() * 0.02);
    } else if (slot === 'mask') {   // krwawe łzy z oczu, pęknięcie
        const z = b.min.z - 0.001;
        for (const x of [-0.045, 0.045]) { drip(x, 0.008, z, 0.05 + R() * 0.03); g.add(at(new THREE.SphereGeometry(0.004, 6, 5), red, x, 0.008, z)); }
        const c = at(new THREE.BoxGeometry(0.06, 0.0015, 0.0015), new THREE.MeshBasicMaterial({ color: 0x1a0a0a }), 0.03, 0.07, z); c.rotation.z = -0.7; g.add(c);
        if (strong) { const c2 = at(new THREE.BoxGeometry(0.04, 0.0015, 0.0015), new THREE.MeshBasicMaterial({ color: 0x1a0a0a }), -0.035, 0.05, z); c2.rotation.z = 0.5; g.add(c2); }
    }
    return g;
}
