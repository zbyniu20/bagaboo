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
    return g;
}

// ---------- OKULARY ----------
export function extraGlasses(id) {
    const g = new THREE.Group();
    if (id === 'monocle') {
        const gold = mat({ color: 0xd4a640, metalness: 1, roughness: 0.25 });
        g.add(at(new THREE.TorusGeometry(0.036, 0.004, 6, 22), gold, 0.045, 0.02, -0.13));
        g.add(at(new THREE.CylinderGeometry(0.0015, 0.0015, 0.14, 4), gold, 0.08, -0.05, -0.125));
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
    if (id === 'woven') return new THREE.MeshStandardMaterial(Object.assign(base, { roughness: 1, map: patternTex('woven', (x, S) => {
        x.fillStyle = '#c8c0b0'; x.fillRect(0, 0, S, S); x.strokeStyle = 'rgba(70,60,50,0.5)'; x.lineWidth = 2;
        for (let i = 0; i < S; i += 12) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i + 40, S); x.stroke(); x.beginPath(); x.moveTo(0, i); x.lineTo(S, i + 40); x.stroke(); }
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
    midnight: { fur: 0x14204a, face: 0x070a1a }
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
    paw: { bg: '#2a1a0a', draw: (x) => { x.fillStyle = '#e8c890'; x.beginPath(); x.ellipse(64, 78, 24, 20, 0, 0, 7); x.fill(); for (const [cx, cy] of [[34, 56], [52, 38], [76, 38], [94, 56]]) { x.beginPath(); x.ellipse(cx, cy, 9, 12, 0, 0, 7); x.fill(); } } }
};
