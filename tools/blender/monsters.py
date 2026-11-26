# Przepisy na potwory BagaBoo (Blender bez okna, moduł bpy). Każdy przepis to funkcja zwracająca Monster; wynik: assets/monsters/<nazwa>.glb.
# Uruchamianie z katalogu repozytorium: v/bin/python tools/blender/monsters.py [nazwa ...]   (bez argumentów: wszystkie)
# Założenia: potwór patrzy w +Y przepisu (w grze +Z), wysokość 1,0-2,7 m, do ok. 6 tys. trójkątów; kolory wierzchołków dają brud, siniaki i krew.
# Twarze są dopasowane do powierzchni głowy (Monster.front), więc oczy, zęby i brwi nie unoszą się nad skórą.
import sys, os, math
sys.path.insert(0, os.path.dirname(__file__))
from monsterlib import *
import shrink_glb

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
OUT = os.path.join(ROOT, 'assets', 'monsters')

def mats(m, skin, rough=0.85, extra=None):
    m.material('skin', skin, rough); m.material('joint', (0.05, 0.05, 0.06, 1), 0.4, metal=0.5); m.material('dark', (0.008, 0.004, 0.004, 1), 0.95)
    m.material('eye', (0.02, 0.0, 0.0, 1), 0.3, emit=(1.0, 0.04, 0.02, 1), strength=4.5); m.material('tooth', (0.8, 0.74, 0.55, 1), 0.4); m.material('claw', (0.05, 0.045, 0.04, 1), 0.45)
    m.material('bone', (0.78, 0.73, 0.58, 1), 0.65); m.material('blood', (0.3, 0.015, 0.015, 1), 0.3); m.material('thread', (0.015, 0.015, 0.015, 1), 0.8); m.material('steel', (0.3, 0.3, 0.32, 1), 0.35, metal=0.6)
    m.material('crack', (0.08, 0.01, 0.0, 1), 0.5, emit=(1.0, 0.1, 0.02, 1), strength=2.2)
    for k, v in (extra or {}).items():
        if isinstance(v, dict): m.material(k, **v)
        else: m.material(k, *v)

def humanoid(m, leg=1.0, torso=1.0, arm=1.0, thick=1.0, hunch=0.0, shoulder=0.26, neck=0.2, head=(0.12, 0.15), legs=True, tilt=0.0):
    """szkielet humanoidalny; zwraca punkty pomocnicze (środek bryły głowy, dłonie, k = skala głowy)."""
    hip = 0.92 * leg; sp = hip + 0.38 * torso; ch = hip + 0.66 * torso; hu = hunch
    m.bone('pelvis', None, (0, 0.0, hip + 0.06), (0.13 * thick, 0.09 * thick), head=(0, 0, hip))
    m.bone('spine', 'pelvis', (0, 0.03 + hu * 0.25, sp), (0.12 * thick, 0.085 * thick))
    m.bone('chest', 'spine', (0, 0.05 + hu * 0.55, ch), (0.16 * thick, 0.105 * thick))
    top = m.bones['chest']['tail']
    for s, n in ((1, 'L'), (-1, 'R')):
        m.bone('clavicle' + n, 'chest', (s * shoulder, top.y - 0.01, ch - 0.01), (0.045 * thick, 0.045 * thick), role='clavicle')
        sh = m.bones['clavicle' + n]['tail']
        m.bone('upperarm' + n, 'clavicle' + n, (s * (shoulder + 0.07), sh.y - 0.02, ch - 0.38 * arm), (0.05 * thick, 0.05 * thick))
        e = m.bones['upperarm' + n]['tail']
        m.bone('forearm' + n, 'upperarm' + n, (s * (shoulder + 0.11), e.y + 0.14, ch - 0.38 * arm - 0.34 * arm), (0.04 * thick, 0.04 * thick))
        w = m.bones['forearm' + n]['tail']
        m.bone('hand' + n, 'forearm' + n, (w.x + s * 0.01, w.y + 0.05, w.z - 0.13), (0.035, 0.02))
    m.bone('neck', 'chest', (0, top.y + 0.04 + hu * 0.06, ch + neck), (0.05 * thick, 0.05 * thick))
    nt = m.bones['neck']['tail']
    hk = head[1] / 0.16   # Skin nie dodaje czapy poza ostatnim wierzchołkiem, a promień daje ok. 0,6 zadanego: głowa to dłuższa kość i większy promień
    m.bone('head', 'neck', (0, nt.y + 0.03 + tilt * 0.1, nt.z + 0.3 * hk), (head[0] * 1.55, head[1] * 1.55))
    hh = m.bones['head']['head']; ht = m.bones['head']['tail']; mid = hh.lerp(ht, 0.5)
    m.bone('jaw', 'head', (0, mid.y + 0.12 * hk, mid.z - 0.13 * hk), 0.02, head=(0, mid.y, mid.z - 0.06 * hk), skin=False)
    if legs:
        for s, n in ((1, 'L'), (-1, 'R')):
            m.bone('hip' + n, 'pelvis', (s * 0.10, 0, hip - 0.02), (0.07 * thick, 0.07 * thick), head=(0, 0, hip), role='hip')
            m.bone('thigh' + n, 'hip' + n, (s * 0.115, 0.02, hip - 0.43 * leg), (0.065 * thick, 0.065 * thick))
            m.bone('calf' + n, 'thigh' + n, (s * 0.115, -0.035, 0.09), (0.045 * thick, 0.045 * thick))
            m.bone('foot' + n, 'calf' + n, (s * 0.115, 0.16, 0.03), (0.04, 0.03))
    return dict(hz=mid.z + 0.01, hy=mid.y, k=head[0] * 9.3, hand={'L': m.bones['handL']['tail'], 'R': m.bones['handR']['tail']}, hip=hip, ch=ch, sp=sp)

def face(m, f, w=0.05, pupil=0.013, eye_z=0.02, teeth=15, tlen=0.045, mouth_z=-0.08, mouth_w=0.085, jaw_drop=0.0, smile=0.02, socket=1.0, brow=True, nose=True,
         cheeks=True, lower=True, eyes=True, tongue=0.0, eye_mat='eye', tooth_mat='tooth', mouth_mat='dark'):
    """oczy (duże ciemne oczodoły + świecące źrenice), groźne brwi, nos, kości policzkowe i paszcza z zębami, wszystko na powierzchni głowy."""
    k = f['k']; hz = f['hz']; dflt = f['hy'] + 0.1 * k
    def Y(x, z):
        v = m.front(x, z, 0.04); return v if v is not None else dflt
    if eyes:
        for s_ in (-1, 1):
            ex, ez = s_ * w * k, hz + eye_z * k; y = Y(ex, ez)
            m.add(ellipsoid((ex, y - 0.004, ez), (0.021 * socket * k, 0.016 * k, 0.029 * socket * k), 8, 5), 'head', 'dark')
            m.add(ellipsoid((ex, y + 0.008, ez - 0.002 * k), (pupil * k * 0.85, pupil * k * 0.6, pupil * k * 0.85), 8, 5), 'head', eye_mat)
            if brow:
                pts = [Vector((s_ * x_ * k, Y(s_ * x_ * k, ez + dz * k) + 0.006, ez + dz * k)) for x_, dz in ((0.014, 0.036), (0.04, 0.046), (0.066, 0.05))]
                m.add(tube(pts, 0.011 * k, 0.007 * k, 4), 'head', 'skin')
            if cheeks: m.add(ellipsoid((s_ * w * 1.25 * k, Y(s_ * w * 1.25 * k, hz - 0.03 * k) - 0.012, hz - 0.03 * k), (0.026 * k, 0.018 * k, 0.02 * k), 6, 4), 'head', 'skin')
    if nose:
        ny = Y(0, hz - 0.03 * k)
        for s_ in (-1, 1): m.add(ellipsoid((s_ * 0.011 * k, ny - 0.003, hz - 0.035 * k), (0.006 * k, 0.008 * k, 0.014 * k), 5, 3), 'head', 'dark')
    mouth_w *= 0.72; tlen *= 0.8; mz = hz + mouth_z * k
    m.add(ellipsoid((0, Y(0, mz) - 0.012, mz + 0.004 - jaw_drop * 0.3), (mouth_w * k * 1.08, 0.018 * k, (0.03 + jaw_drop * 0.3) * k), 10, 4), 'head', mouth_mat)
    if teeth:
        m.teeth('head', (0, 0, mz + 0.016 * k), mouth_w * k, teeth, tlen * k, down=True, smile=smile * k, mat=tooth_mat, ycb=lambda x, z: Y(x, z) - 0.005)
        if lower: m.teeth('jaw', (0, 0, mz - 0.02 * k - jaw_drop), mouth_w * k * 0.9, max(3, teeth - 3), tlen * k * 0.8, down=False, smile=smile * k * 0.7, mat=tooth_mat, ycb=lambda x, z: Y(x, z) - 0.005)
    if tongue: m.tongue('jaw', (0, Y(0, mz) - 0.0, mz - 0.03 * k), tongue, curl=0.4, width=0.016 * k)

def hands(m, f, n=4, length=0.06, spread=0.05, mat='claw'):
    for n_, s in (('L', 1), ('R', -1)):
        h = f['hand'][n_]; m.claws('hand' + n_, (h.x, h.y + 0.01, h.z - 0.01), n, spread, length, mat)

def spine_spikes(m, n=7, length=0.05, mat='bone'):
    for b, c in (('neck', 1), ('chest', 3), ('spine', 3)): m.spikes(b, c, length, mat)
def knobs(m, length=0.07, mat='bone'):
    for s_, n in ((1, 'L'), (-1, 'R')):
        m.spikes('forearm' + n, 1, length, mat, side=(s_ * 0.5, -1, 0.1), t0=0.0, t1=0.0, r=0.016); m.spikes('calf' + n, 1, length * 0.8, mat, side=(s_ * 0.3, 1, 0.1), t0=0.0, t1=0.0, r=0.016)

def finish(m, walk=0.55, run=1.0, **kw):
    m.build(subsurf=1); m.rig(); humanoid_clips(m, walk=walk, run=run, **kw)

def hair(m, f, n, length, mat='thread', width=0.17, back=0.03):
    k = f['k']
    for i in range(n):
        t = i / max(1, n - 1) - 0.5; x = t * width * k * 2; y0 = f['hy'] - 0.02 + back + self_rand(m) * 0.03
        m.add(tube([Vector((x, y0, f['hz'] + 0.13 * k - abs(t) * 0.08)), Vector((x * 1.15, y0 - 0.03, f['hz'] - 0.05 * k)), Vector((x * 1.2, y0 - 0.05, f['hz'] - length))], 0.006, 0.0025, 3), 'head', mat)
def self_rand(m): return m.rng.random()

# ============================ POTWORY ============================
def mannequin():
    """Pęknięty gipsowy manekin: długie kończyny, świecące pęknięcia, szeroki uśmiech, druga paszcza na brzuchu, brakujący kawałek klatki."""
    m = Monster('mannequin', 11); mats(m, (0.78, 0.75, 0.68, 1), 0.6); m.dirt = 1.0; m.blood = 0.2; m.bruise = 0.0
    f = humanoid(m, leg=1.08, torso=0.95, arm=1.14, thick=0.74, hunch=0.2, shoulder=0.23, neck=0.22, head=(0.125, 0.16), tilt=1.0); m.skin()
    face(m, f, w=0.05, pupil=0.012, teeth=17, tlen=0.05, mouth_w=0.095, mouth_z=-0.085, jaw_drop=0.014, smile=0.025, socket=1.2, tongue=0.0)
    for n in ('upperarmL', 'upperarmR', 'forearmL', 'forearmR', 'calfL', 'calfR'): m.joint(n, m.bones[n]['tail'], 0.038)
    k = f['k']; hz = f['hz']
    for x0, z0, ln in ((-0.04, 0.1, 0.18), (0.05, 0.07, 0.15), (0.0, -0.02, 0.12)):   # pęknięcia na głowie
        zz = hz + z0 * k; pts = [Vector((x0 * k + (0.012 if i % 2 else -0.012), (m.front(x0 * k, zz - i * ln / 4 * k, 0.04) or f['hy'] + 0.12 * k) + 0.004, zz - i * ln / 4 * k)) for i in range(5)]
        m.add(tube(pts, 0.0035, 0.0022, 3), 'head', 'crack')
    for bone, t, d, ln in (('chest', 0.5, (0, 1, 0), 0.22), ('spine', 0.4, (0.5, 1, 0), 0.2), ('thighL', 0.4, (0, 1, 0), 0.25), ('thighR', 0.5, (0, 1, 0), 0.22), ('upperarmL', 0.5, (0, 1, 0), 0.2), ('forearmR', 0.4, (0, 1, 0), 0.18), ('calfL', 0.5, (0, 1, 0), 0.2)):
        m.crack(bone, t, d, ln)
    m.wound('chest', 0.35, (-0.6, 1, 0), 0.05)   # brakujący kawałek klatki
    sb = m.bones['spine']; c = m.at('spine', 0.5, (0, sb['r'][1] * 0.9, 0))   # druga paszcza na brzuchu
    m.add(ellipsoid((c.x, c.y, c.z), (0.07, 0.02, 0.025), 8, 4), 'spine', 'dark'); m.teeth('spine', (c.x, c.y + 0.012, c.z + 0.012), 0.07, 9, 0.028, smile=0.012)
    spine_spikes(m, length=0.03); hands(m, f, n=4, length=0.11, spread=0.05)
    finish(m, walk=0.5, run=0.95, twitch=0.4, head_roll=0.22); return m

def gravedigger():
    """Grabarz: przygarbiony, ogromnie długie ręce, kaptur nad czaszką, krwawa łopata, łańcuchy."""
    m = Monster('gravedigger', 21); mats(m, (0.5, 0.54, 0.46, 1), 0.9, {'cloth': ((0.06, 0.055, 0.05, 1), 0.95), 'wood': ((0.2, 0.12, 0.07, 1), 0.85)}); m.dirt = 1.0; m.blood = 0.3; m.bruise = 0.28
    f = humanoid(m, leg=0.98, torso=1.05, arm=1.55, thick=0.98, hunch=1.0, shoulder=0.3, neck=0.1, head=(0.11, 0.14)); m.skin()
    k = f['k']; hy, hz = f['hy'], f['hz']
    face(m, f, w=0.044, pupil=0.014, teeth=11, tlen=0.05, mouth_w=0.07, mouth_z=-0.08, jaw_drop=0.02, smile=0.0, socket=1.4, brow=False)
    m.add(ellipsoid((0, hy - 0.07 * k, hz + 0.04 * k), (0.2 * k, 0.17 * k, 0.2 * k), 10, 6), 'head', 'cloth')   # kaptur wokół czaszki
    m.add(tube([Vector((-0.17 * k, hy + 0.0, hz + 0.0)), Vector((-0.1 * k, hy + 0.12 * k, hz + 0.12 * k)), Vector((0.1 * k, hy + 0.12 * k, hz + 0.12 * k)), Vector((0.17 * k, hy + 0.0, hz + 0.0))], 0.03 * k, 0.03 * k, 5), 'head', 'cloth')   # daszek kaptura
    m.add(cloth_cone((0, 0.0, f['ch'] + 0.08), 0.4, 0.28, 0.55, 12, 0.2, m.rng, 0.85), 'spine', 'cloth')
    for i in range(3): m.add(tube([Vector((-0.2 + i * 0.2, 0.12, f['sp'])), Vector((-0.2 + i * 0.2, 0.18, f['sp'] - 0.25)), Vector((-0.17 + i * 0.2, 0.2, f['sp'] - 0.5))], 0.012, 0.012, 4), 'spine', 'steel')   # łańcuchy
    h = f['hand']['R']; m.add(frustum((h.x, h.y, h.z + 0.55), (h.x + 0.02, h.y + 0.02, h.z - 0.8), 0.024, 0.02, 6), 'handR', 'wood')
    m.add(box((h.x + 0.02, h.y + 0.03, h.z - 0.93), (0.26, 0.025, 0.34)), 'handR', 'steel')
    for i in range(5): m.add(ellipsoid((h.x + 0.02 + (i - 2) * 0.04, h.y + 0.05, h.z - 0.85 - (i % 3) * 0.07), (0.025, 0.006, 0.03 + (i % 2) * 0.02), 5, 3), 'handR', 'blood')   # krew na łopacie
    for i, (b, t) in enumerate((('chest', 0.5), ('upperarmL', 0.5), ('thighR', 0.4))): m.wound(b, t, (0.3 * (1 - i), 1, 0), 0.035)
    spine_spikes(m, length=0.06, mat='bone'); hands(m, f, n=4, length=0.15, spread=0.06)
    finish(m, walk=0.45, run=0.8, arm_walk=0.15, arm_run=0.4, lean_run=0.45, idle_sway=0.05, head_roll=0.1); return m

def warden():
    """Strażnik katakumb: wysoki szkielet z rozłożystym porożem, klatką z żarzącym się sercem, kolcami na grzbiecie i bardzo długimi palcami."""
    m = Monster('warden', 31); mats(m, (0.74, 0.7, 0.58, 1), 0.7, {'cloth': ((0.09, 0.06, 0.05, 1), 0.95), 'glow': dict(color=(0.1, 0.01, 0, 1), rough=0.5, emit=(1.0, 0.1, 0.02, 1), strength=3.5)}); m.dirt = 0.95; m.blood = 0.14; m.bruise = 0.12
    f = humanoid(m, leg=1.22, torso=1.12, arm=1.28, thick=0.56, hunch=0.45, shoulder=0.27, neck=0.2, head=(0.115, 0.16)); m.skin()
    k = f['k']; hy, hz = f['hy'], f['hz']
    face(m, f, w=0.048, pupil=0.014, teeth=15, tlen=0.075, mouth_w=0.075, mouth_z=-0.085, jaw_drop=0.03, smile=0.006, socket=1.5)
    ch = m.bones['chest']['tail'].z
    for i in range(6):
        z = ch - 0.05 - i * 0.07; w = 0.155 - i * 0.012
        for s_ in (-1, 1): m.add(tube([Vector((s_ * 0.02, 0.13, z)), Vector((s_ * w * 0.8, 0.12, z)), Vector((s_ * w, 0.0, z + 0.01)), Vector((s_ * w * 0.9, -0.09, z + 0.02))], 0.012, 0.009, 4), 'chest', 'bone')
    m.add(ellipsoid((0, 0.04, ch - 0.2), (0.05, 0.045, 0.06), 8, 5), 'chest', 'glow')   # żarzące się serce
    for s_ in (-1, 1):
        for pts in ([(s_ * 0.05, 0, 0.1), (s_ * 0.12, 0.0, 0.24), (s_ * 0.18, 0.0, 0.38), (s_ * 0.16, -0.02, 0.54)], [(s_ * 0.12, 0.0, 0.24), (s_ * 0.24, 0.04, 0.32), (s_ * 0.33, 0.05, 0.44)], [(s_ * 0.18, 0.0, 0.38), (s_ * 0.28, 0.05, 0.46), (s_ * 0.34, 0.06, 0.58)], [(s_ * 0.16, -0.02, 0.5), (s_ * 0.1, -0.06, 0.62)]):
            m.horn('head', (0, hy, hz), pts, 0.018 if pts[0][2] < 0.2 else 0.011, 0.004)
    m.add(cloth_cone((0, 0.0, 1.05), 0.6, 0.2, 0.36, 10, 0.2, m.rng), 'pelvis', 'cloth')
    for s_, n in ((1, 'L'), (-1, 'R')): m.add(cloth_cone((s_ * 0.34, 0.1, f['ch'] - 0.35), 0.3, 0.05, 0.1, 6, 0.08, m.rng), 'forearm' + n, 'cloth')   # strzępy na rękach
    spine_spikes(m, length=0.09); knobs(m, 0.09); hands(m, f, n=5, length=0.24, spread=0.08, mat='bone')
    m.wound('head', 0.5, (0.9, 0.3, 0.3), 0.025)
    finish(m, walk=0.5, run=0.95, arm_walk=0.2, arm_run=0.55, lean_run=0.3, idle_sway=0.04, twitch=0.3); return m

def doll():
    """Lalka z żłobka: porcelanowa, pęknięta twarz, jedno oko to czarna dziura, drugie szklane, uśmiech od ucha do ucha, nóż w ręce, zakrwawiona sukienka."""
    m = Monster('doll', 41); mats(m, (0.9, 0.86, 0.8, 1), 0.35, {'cloth': ((0.5, 0.3, 0.36, 1), 0.9), 'hair': ((0.02, 0.015, 0.015, 1), 0.9), 'glass': ((0.85, 0.85, 0.82, 1), 0.1)}); m.dirt = 0.8; m.blood = 0.2; m.bruise = 0.05
    f = humanoid(m, leg=0.5, torso=0.55, arm=0.55, thick=0.9, hunch=0.25, shoulder=0.15, neck=0.06, head=(0.2, 0.22), tilt=1.0); m.skin()
    k = f['k']; hy, hz = f['hy'], f['hz']
    face(m, f, w=0.06, pupil=0.014, eye_z=0.02, teeth=19, tlen=0.05, mouth_w=0.13, mouth_z=-0.085, jaw_drop=0.01, smile=0.035, socket=1.6, brow=False, nose=False)
    ey = (m.front(0.06 * k, hz + 0.02 * k, 0.04) or hy + 0.1 * k)
    m.add(ellipsoid((-0.06 * k, ey + 0.004, hz + 0.02 * k), (0.032 * k, 0.026 * k, 0.04 * k), 8, 5), 'head', 'glass')   # szklane oko po lewej
    m.add(ellipsoid((-0.06 * k, ey + 0.026 * k, hz + 0.018 * k), (0.008 * k, 0.004, 0.008 * k), 5, 3), 'head', 'eye')
    for x0, ln in ((-0.09, 0.2), (0.07, 0.17), (0.0, 0.12)):   # pęknięcia na porcelanie
        pts = [Vector((x0 * k + (0.01 if i % 2 else -0.01), (m.front(x0 * k, hz + (0.15 - i * ln / 4) * k, 0.04) or hy + 0.12 * k) + 0.004, hz + (0.15 - i * ln / 4) * k)) for i in range(5)]
        m.add(tube(pts, 0.0032, 0.002, 3), 'head', 'thread')
    m.add(cloth_cone((0, 0.0, m.bones['chest']['tail'].z - 0.02), 0.2, 0.14, 0.32, 12, 0.08, m.rng), 'spine', 'cloth')
    for i in range(5): m.add(ellipsoid((-0.1 + i * 0.05, 0.14 + 0.02 * (i % 2), 0.45 - (i % 3) * 0.04), (0.03, 0.006, 0.045), 5, 3), 'spine', 'blood')   # krew na sukience
    hair(m, f, 11, 0.4); m.add(ellipsoid((0, hy - 0.05, hz + 0.16 * k), (0.2 * k, 0.17 * k, 0.1 * k), 8, 5), 'head', 'hair')
    h = f['hand']['R']; m.add(box((h.x, h.y + 0.04, h.z - 0.02), (0.02, 0.03, 0.1)), 'handR', 'bone'); m.add(box((h.x, h.y + 0.1, h.z - 0.17), (0.012, 0.06, 0.22)), 'handR', 'steel')   # nóż
    m.add(ellipsoid((h.x, h.y + 0.1, h.z - 0.22), (0.01, 0.02, 0.08), 5, 3), 'handR', 'blood')
    hands(m, f, n=4, length=0.07, spread=0.04)
    finish(m, walk=0.55, run=0.95, arm_walk=0.25, arm_run=0.7, idle_sway=0.07, twitch=0.6, head_roll=0.3); return m

def patient():
    """Pacjent szpitala: wychudzony, w zakrwawionych bandażach, rurki kroplówki, otwarta rana na klatce, jedno oko świeci spod bandaża."""
    m = Monster('patient', 51); mats(m, (0.64, 0.6, 0.54, 1), 0.8, {'gauze': ((0.7, 0.66, 0.52, 1), 0.95), 'gown': ((0.6, 0.66, 0.68, 1), 0.9), 'iv': ((0.7, 0.75, 0.72, 1), 0.4)}); m.dirt = 1.0; m.blood = 0.32; m.bruise = 0.3
    f = humanoid(m, leg=1.02, torso=1.0, arm=1.34, thick=0.64, hunch=0.9, shoulder=0.24, neck=0.18, head=(0.115, 0.15), tilt=-1.0); m.skin()
    k = f['k']; hy, hz = f['hy'], f['hz']
    face(m, f, w=0.046, pupil=0.014, teeth=13, tlen=0.04, mouth_w=0.07, mouth_z=-0.085, jaw_drop=0.04, smile=-0.004, socket=1.3)
    m.add(ellipsoid((0.0, hy - 0.01, hz + 0.07 * k), (0.125 * k, 0.15 * k, 0.1 * k), 10, 6), 'head', 'gauze')   # bandaż na czaszce
    for i in range(3): m.add(frustum((0, hy - 0.01, hz + (0.06 - i * 0.05) * k), (0, hy - 0.01, hz + (0.075 - i * 0.05) * k), 0.115 * k, 0.115 * k, 10), 'head', 'gauze')
    ch = m.bones['chest']['tail'].z
    m.add(cloth_cone((0, 0.0, ch + 0.0), 0.45, 0.17, 0.26, 12, 0.14, m.rng, 0.75), 'spine', 'gown')   # szpitalna koszula
    for i in range(4): m.add(ellipsoid((-0.1 + i * 0.07, 0.125 + 0.012 * (i % 2), ch - 0.15 - (i % 2) * 0.1), (0.03, 0.006, 0.05), 5, 3), 'spine', 'blood')
    m.wound('chest', 0.5, (0.5, 1, 0), 0.055)
    for j in range(3): m.add(tube([Vector((0.08 + j * 0.01, 0.14, ch - 0.12 - j * 0.03)), Vector((0.14, 0.13, ch - 0.12 - j * 0.03))], 0.006, 0.006, 3), 'chest', 'bone')   # żebra w ranie
    for n_, s_ in (('L', 1), ('R', -1)):
        b = m.bones['upperarm' + n_]; m.add(frustum(b['head'].lerp(b['tail'], 0.15), b['head'].lerp(b['tail'], 0.85), 0.062, 0.057, 8), 'upperarm' + n_, 'gauze')
    a = m.bones['forearmL']['head']
    m.add(tube([a + Vector((0.04, 0.05, -0.02)), a + Vector((0.12, 0.2, -0.2)), a + Vector((0.14, 0.25, -0.55)), a + Vector((0.12, 0.2, -0.95))], 0.007, 0.007, 4), 'forearmL', 'iv')   # rurka kroplówki
    m.add(ellipsoid(a + Vector((0.12, 0.2, -0.98)), (0.05, 0.03, 0.08), 6, 4), 'forearmL', 'iv')
    spine_spikes(m, length=0.04); hands(m, f, n=5, length=0.13, spread=0.07, mat='bone')
    finish(m, walk=0.4, run=0.75, arm_walk=0.25, arm_run=0.6, lean_run=0.3, idle_sway=0.07, twitch=0.8, head_roll=-0.2); return m

def butler():
    """Lokaj hotelowy: cylinder na głowie, gładka twarz z pionową paszczą pełną drobnych zębów, cztery ręce w białych rękawiczkach, czarny frak."""
    m = Monster('butler', 61); mats(m, (0.8, 0.76, 0.7, 1), 0.6, {'suit': ((0.02, 0.02, 0.024, 1), 0.85), 'glove': ((0.9, 0.9, 0.88, 1), 0.7)}); m.dirt = 0.6; m.blood = 0.1; m.bruise = 0.1
    f = humanoid(m, leg=1.18, torso=1.08, arm=1.2, thick=0.64, hunch=0.15, shoulder=0.24, neck=0.24, head=(0.11, 0.16)); 
    sp = f['sp']; ch = f['ch']
    for s_, n in ((1, 'L'), (-1, 'R')):   # druga para ramion wyrasta niżej na tułowiu
        m.bone('clav2' + n, 'spine', (s_ * 0.19, 0.05, sp + 0.03), (0.04, 0.04), role='clav2')
        m.bone('uarm2' + n, 'clav2' + n, (s_ * 0.27, 0.0, sp - 0.3), (0.04, 0.04), role='uarm2')
        m.bone('farm2' + n, 'uarm2' + n, (s_ * 0.2, 0.22, sp - 0.4), (0.034, 0.034), role='farm2')
        m.bone('hand2' + n, 'farm2' + n, (s_ * 0.17, 0.3, sp - 0.43), (0.03, 0.018), role='hand2')
    m.skin(); k = f['k']; hy, hz = f['hy'], f['hz']
    ym = lambda x, z: (m.front(x, z, 0.04) or hy + 0.12 * k)
    m.add(ellipsoid((0, ym(0, hz - 0.02 * k) - 0.012, hz - 0.01 * k), (0.021 * k, 0.02 * k, 0.1 * k), 8, 5), 'head', 'dark')   # pionowa paszcza
    for i in range(10):
        z = hz - 0.085 * k + i * 0.019 * k
        for s_ in (-1, 1): m.add(frustum(Vector((s_ * 0.016 * k, ym(s_ * 0.016 * k, z) - 0.004, z)), Vector((s_ * 0.004 * k, ym(0, z) - 0.006, z)), 0.007, 0.0, 4), 'head', 'tooth')
    for s_ in (-1, 1): m.add(ellipsoid((s_ * 0.045 * k, ym(s_ * 0.045 * k, hz + 0.04 * k) - 0.006, hz + 0.04 * k), (0.02 * k, 0.012 * k, 0.008 * k), 6, 3), 'head', 'dark')   # zapadnięte oczy
    m.add(frustum((0, hy - 0.02, hz + 0.1 * k), (0, hy - 0.02, hz + 0.34 * k), 0.12 * k, 0.1 * k, 12), 'head', 'suit'); m.add(frustum((0, hy - 0.02, hz + 0.1 * k), (0, hy - 0.02, hz + 0.115 * k), 0.2 * k, 0.2 * k, 14), 'head', 'suit')   # cylinder
    m.add(cloth_cone((0, 0.0, ch + 0.02), 0.5, 0.2, 0.3, 12, 0.0, m.rng, 0.8), 'spine', 'suit')
    m.add(ellipsoid((0, 0.1, ch - 0.02), (0.14, 0.065, 0.18), 8, 5), 'chest', 'suit'); m.add(ellipsoid((0, 0.15, ch + 0.0), (0.05, 0.014, 0.022), 6, 3), 'chest', 'dark')
    for n_ in ('L', 'R'):
        h = f['hand'][n_]; m.add(ellipsoid((h.x, h.y + 0.02, h.z - 0.02), (0.042, 0.048, 0.075), 7, 4), 'hand' + n_, 'glove'); m.claws('hand' + n_, (h.x, h.y + 0.03, h.z - 0.06), 4, 0.05, 0.18, 'glove', fwd=(0, 0.3, -1))
        h2 = m.bones['hand2' + n_]['tail']; m.add(ellipsoid((h2.x, h2.y, h2.z - 0.02), (0.036, 0.04, 0.065), 7, 4), 'hand2' + n_, 'glove'); m.claws('hand2' + n_, (h2.x, h2.y + 0.02, h2.z - 0.05), 4, 0.04, 0.14, 'glove', fwd=(0, 0.4, -1))
    m.wound('chest', 0.5, (0.6, 1, 0), 0.03); spine_spikes(m, length=0.04, mat='bone')
    finish(m, walk=0.42, run=0.8, arm_walk=0.18, arm_run=0.5, lean_run=0.25, idle_sway=0.03, head_roll=0.12); return m

def blind():
    """Ślepy: blady, napięta skóra na żebrach, wielkie nasłuchujące uszy, bez oczu, ogromna pionowa paszcza z kłami i długim językiem."""
    m = Monster('blind', 71); mats(m, (0.76, 0.72, 0.66, 1), 0.7, {'maw': ((0.2, 0.01, 0.02, 1), 0.3)}); m.dirt = 0.8; m.blood = 0.22; m.bruise = 0.2
    f = humanoid(m, leg=1.05, torso=1.0, arm=1.42, thick=0.6, hunch=0.8, shoulder=0.25, neck=0.14, head=(0.13, 0.19)); m.skin()
    k = f['k']; hy, hz = f['hy'], f['hz']; ym = lambda x, z: (m.front(x, z, 0.05) or hy + 0.15 * k)
    m.add(ellipsoid((0, ym(0, hz) - 0.02, hz - 0.005), (0.05 * k, 0.03 * k, 0.13 * k), 10, 6), 'head', 'maw')   # pionowa czerwona paszcza
    for i in range(13):
        z = hz - 0.11 * k + i * 0.018 * k
        for s_ in (-1, 1): m.add(frustum(Vector((s_ * 0.046 * k, ym(0, z) - 0.014, z)), Vector((s_ * 0.008 * k, ym(0, z) - 0.008, z)), 0.009, 0.0, 4), 'head', 'tooth')
    m.tongue('jaw', (0, ym(0, hz) - 0.02, hz - 0.1 * k), 0.4, curl=0.5, width=0.02)
    for s_ in (-1, 1):
        m.add(ellipsoid((s_ * 0.165 * k, hy - 0.01, hz + 0.02 * k), (0.022 * k, 0.07 * k, 0.12 * k), 7, 5), 'head', 'skin')   # wielkie uszy
        m.add(ellipsoid((s_ * 0.06 * k, ym(s_ * 0.06 * k, hz + 0.06 * k) - 0.012, hz + 0.06 * k), (0.016 * k, 0.01 * k, 0.005 * k), 6, 3), 'head', 'dark')   # zasklepione oczy
    for i in range(6): m.spikes('chest', 1, 0.02, 'bone', side=(0, 1, 0), r=0.012, t0=0.1 + i * 0.08, t1=0.1 + i * 0.08)
    m.wound('chest', 0.6, (-0.5, 1, 0), 0.03); spine_spikes(m, length=0.07); knobs(m, 0.08); hands(m, f, n=4, length=0.22, spread=0.07)
    finish(m, walk=0.45, run=0.9, arm_walk=0.2, arm_run=0.5, lean_run=0.4, idle_sway=0.06, twitch=0.7, head_roll=0.15); return m

def threadman():
    """Szmaciarz: worek na głowie z zszytą paszczą i czerwonymi łzami, guziki, szwy ze zszywkami na całym ciele, nożyce i igły, zwisające nici."""
    m = Monster('threadman', 81); mats(m, (0.42, 0.34, 0.24, 1), 0.95, {'sack': ((0.38, 0.29, 0.19, 1), 0.95), 'patch': ((0.3, 0.27, 0.22, 1), 0.95), 'needle': ((0.62, 0.62, 0.65, 1), 0.3, 0.0)}); m.dirt = 0.95; m.blood = 0.3; m.bruise = 0.1
    f = humanoid(m, leg=1.1, torso=1.05, arm=1.4, thick=0.68, hunch=0.5, shoulder=0.25, neck=0.2, head=(0.13, 0.17)); m.skin()
    k = f['k']; hy, hz = f['hy'], f['hz']; ym = lambda x, z: (m.front(x, z, 0.05) or hy + 0.14 * k)
    m.add(ellipsoid((0, hy + 0.0, hz + 0.01 * k), (0.17 * k, 0.18 * k, 0.2 * k), 10, 6), 'head', 'sack')   # worek
    fy = hy + 0.18 * k - 0.02
    for s_ in (-1, 1):
        ex = s_ * 0.055 * k; m.add(ellipsoid((ex, fy - 0.01, hz + 0.04 * k), (0.03 * k, 0.014, 0.038 * k), 8, 5), 'head', 'dark'); m.add(ellipsoid((ex, fy + 0.002, hz + 0.038 * k), (0.012 * k, 0.01, 0.012 * k), 6, 4), 'head', 'eye')
        m.add(tube([Vector((ex, fy + 0.01, hz + 0.0)), Vector((ex * 1.05, fy + 0.012, hz - 0.08 * k)), Vector((ex * 1.05, fy + 0.01, hz - 0.2 * k))], 0.009, 0.005, 4), 'head', 'blood')   # krwawe łzy
    m.add(tube([Vector((-0.1 * k + i * 0.0333 * k, fy + 0.006, hz - 0.09 * k + (0.016 if i % 2 else -0.016))) for i in range(7)], 0.006, 0.006, 4), 'head', 'thread')   # zszyta paszcza
    for i in range(8): m.add(tube([Vector((-0.1 * k + i * 0.0286 * k, fy + 0.002, hz - 0.12 * k)), Vector((-0.1 * k + i * 0.0286 * k + 0.012, fy + 0.012, hz - 0.06 * k))], 0.0045, 0.0045, 3), 'head', 'thread')
    for b, t, d in (('chest', 0.45, (0, 1, 0)), ('spine', 0.5, (0.3, 1, 0)), ('upperarmL', 0.5, (0, 1, 0)), ('upperarmR', 0.5, (0, 1, 0)), ('thighL', 0.4, (0, 1, 0)), ('thighR', 0.5, (0, 1, 0)), ('forearmL', 0.4, (0, 1, 0))): m.stitches(b, t, d, 0.2, 7)
    for b, t in (('chest', 0.6), ('thighL', 0.7), ('upperarmR', 0.3)):   # łaty z innego płótna
        bb = m.bones[b]; c = m.at(b, t) + Vector((0, bb['r'][1] * 0.95, 0)); m.add(box((c.x, c.y, c.z), (0.1, 0.012, 0.1)), b, 'patch')
    for i in range(12):   # zwisające nici
        n_ = ('chest', 'spine', 'upperarmL', 'upperarmR', 'forearmL', 'forearmR')[i % 6]; c = m.at(n_, 0.3 + (i % 4) * 0.15, (0, m.bones[n_]['r'][1] * 0.9, 0)); m.add(tube([c, c + Vector((0, 0.03, -0.25)), c + Vector((0, 0.05, -0.55 - (i % 3) * 0.1))], 0.0035, 0.002, 3), n_, 'thread')
    h = f['hand']['R']; m.add(box((h.x - 0.05, h.y + 0.05, h.z - 0.22), (0.018, 0.012, 0.36)), 'handR', 'needle'); m.add(box((h.x + 0.05, h.y + 0.05, h.z - 0.22), (0.018, 0.012, 0.36)), 'handR', 'needle')   # nożyce
    m.add(tube([Vector((h.x, h.y + 0.05, h.z - 0.02)), Vector((h.x, h.y + 0.05, h.z + 0.04))], 0.03, 0.03, 6), 'handR', 'steel')
    hl = f['hand']['L']
    for i in range(5): b = Vector((hl.x + (i - 2) * 0.018, hl.y + 0.02, hl.z - 0.02)); m.add(frustum(b, b + Vector((0, 0.04, -0.4)), 0.006, 0.0, 4), 'handL', 'needle')
    finish(m, walk=0.5, run=0.95, arm_walk=0.25, arm_run=0.7, lean_run=0.4, idle_sway=0.06, twitch=0.35, head_roll=0.12); return m

def furas():
    """Furas: dziki kocioludek: zjeżona grzywa i kolce na grzbiecie, żółte ślepia, gigantyczne kły we krwi, kościane pazury, kłaczasty ogon."""
    m = Monster('furas', 91); mats(m, (0.28, 0.16, 0.08, 1), 0.95, {'cat': ((0.24, 0.13, 0.06, 1), 0.95), 'eyeY': dict(color=(0.02, 0.02, 0.0, 1), rough=0.3, emit=(1.0, 0.75, 0.05, 1), strength=4.5)}); m.dirt = 0.75; m.blood = 0.3; m.bruise = 0.0
    f = humanoid(m, leg=0.9, torso=0.95, arm=1.18, thick=1.15, hunch=1.1, shoulder=0.28, neck=0.1, head=(0.14, 0.16))
    m.bone('tail1', 'pelvis', (0, -0.3, 1.0), 0.05, head=(0, -0.05, 0.95), role='tail'); m.bone('tail2', 'tail1', (0, -0.55, 1.14), 0.04, role='tail'); m.bone('tail3', 'tail2', (0, -0.78, 1.34), 0.028, role='tail'); m.skin()
    k = f['k']; hy, hz = f['hy'], f['hz']
    face(m, f, w=0.056, pupil=0.015, teeth=11, tlen=0.09, mouth_w=0.085, mouth_z=-0.085, jaw_drop=0.04, smile=0.004, socket=1.25, eye_mat='eyeY')
    for s_ in (-1, 1): m.add(frustum(Vector((s_ * 0.09 * k, hy - 0.01, hz + 0.1 * k)), Vector((s_ * 0.13 * k, hy - 0.05, hz + 0.34 * k)), 0.055 * k, 0.0, 5), 'head', 'cat'); m.add(frustum(Vector((s_ * 0.092 * k, hy - 0.0, hz + 0.1 * k)), Vector((s_ * 0.125 * k, hy - 0.03, hz + 0.3 * k)), 0.03 * k, 0.0, 5), 'head', 'blood')
    m.drips('jaw', (0, m.front(0, hz - 0.08 * k, 0.05) or hy + 0.14 * k, hz - 0.1 * k), 5, 0.12, 0.12)
    for b in ('neck', 'chest', 'spine', 'upperarmL', 'upperarmR', 'tail1', 'tail2'): m.spikes(b, 4 if b in ('chest', 'spine') else 3, 0.1, 'cat', r=0.02)   # zjeżona sierść
    m.wound('upperarmL', 0.4, (0.8, 0.5, 0), 0.04); hands(m, f, n=4, length=0.2, spread=0.07, mat='bone')
    finish(m, walk=0.55, run=1.05, arm_walk=0.4, arm_run=0.95, lean_run=0.5, idle_sway=0.06, twitch=0.45, head_roll=0.1); return m

def ghost():
    """Duch z Room 000: poszarpany całun z dziurami, długie włosy, czarne łzy, szeroko rozdziawiona pusta paszcza, zimne świecące oczy, łańcuchy."""
    m = Monster('ghost', 101); mats(m, (0.84, 0.86, 0.9, 1), 0.9, {'shroud': ((0.78, 0.8, 0.85, 1), 0.95), 'eyeB': dict(color=(0.0, 0.0, 0.02, 1), rough=0.3, emit=(0.55, 0.75, 1.0, 1), strength=5.0), 'hole': ((0.005, 0.005, 0.01, 1), 0.95), 'tear': ((0.01, 0.01, 0.015, 1), 0.4)}); m.dirt = 0.5; m.blood = 0.0; m.bruise = 0.0
    f = humanoid(m, leg=1.3, torso=1.0, arm=1.65, thick=0.52, hunch=0.55, shoulder=0.22, neck=0.16, head=(0.125, 0.18), legs=False); m.skin()
    k = f['k']; hy, hz = f['hy'], f['hz']
    face(m, f, w=0.05, pupil=0.014, teeth=0, tlen=0.0, mouth_w=0.07, mouth_z=-0.1, jaw_drop=0.1, socket=1.8, brow=False, nose=False, lower=False, eye_mat='eyeB')
    m.add(ellipsoid((0, hy + 0.12 * k, hz - 0.12 * k), (0.045 * k, 0.025 * k, 0.1 * k), 8, 5), 'head', 'hole')
    for s_ in (-1, 1): m.add(tube([Vector((s_ * 0.05 * k, hy + 0.15 * k, hz + 0.0)), Vector((s_ * 0.052 * k, hy + 0.152 * k, hz - 0.1 * k)), Vector((s_ * 0.05 * k, hy + 0.15 * k, hz - 0.3 * k))], 0.012, 0.006, 4), 'head', 'tear')
    hair(m, f, 13, 0.55, 'tear', width=0.15)
    m.add(cloth_cone((0, 0.0, 1.58), 0.08, 0.18, 0.66, 14, 0.4, m.rng), 'spine', 'shroud'); m.add(cloth_cone((0, 0.0, 1.45), 0.34, 0.22, 0.46, 12, 0.35, m.rng), 'pelvis', 'shroud')
    for i in range(6): a = i * 1.1; m.add(ellipsoid((math.cos(a) * 0.3, math.sin(a) * 0.3 * 0.9 + 0.0, 0.5 + (i % 3) * 0.3), (0.05, 0.012, 0.07), 5, 3), 'pelvis', 'hole')   # dziury w całunie
    for i in range(5): m.add(tube([Vector((math.cos(a) * 0.19, math.sin(a) * 0.19, 1.0 - i * 0.03)) for a in [j * 0.4 + i * 0.5 for j in range(8)]], 0.011, 0.011, 4), 'pelvis', 'steel') if i == 0 else None   # łańcuch wokół pasa
    hands(m, f, n=5, length=0.3, spread=0.07, mat='bone')
    finish(m, walk=0.25, run=0.45, arm_walk=0.2, arm_run=0.45, lean_run=0.2, idle_sway=0.09, twitch=0.4, head_roll=0.2); return m

def lavabeast():
    """Lawowa Bestia: masywna, czarna jak węgiel, rogi i skalne płyty, żarzące się pęknięcia na całym ciele, rozpalona paszcza ociekająca lawą."""
    m = Monster('lavabeast', 111); mats(m, (0.045, 0.035, 0.035, 1), 0.9, {'lava': dict(color=(0.1, 0.02, 0.0, 1), rough=0.5, emit=(1.0, 0.25, 0.02, 1), strength=3.5), 'horn': ((0.09, 0.06, 0.05, 1), 0.6), 'eyeH': dict(color=(0.02, 0.01, 0.0, 1), rough=0.3, emit=(1.0, 0.8, 0.3, 1), strength=6.0), 'rock': ((0.07, 0.06, 0.06, 1), 0.95)}); m.dirt = 0.6; m.blood = 0.0; m.bruise = 0.0
    f = humanoid(m, leg=0.84, torso=1.22, arm=1.08, thick=1.95, hunch=0.6, shoulder=0.38, neck=0.1, head=(0.16, 0.18)); m.skin()
    k = f['k']; hy, hz = f['hy'], f['hz']
    face(m, f, w=0.066, pupil=0.018, teeth=13, tlen=0.08, mouth_w=0.1, mouth_z=-0.085, jaw_drop=0.05, smile=0.004, socket=1.35, eye_mat='eyeH', mouth_mat='lava', tooth_mat='horn')
    for s_ in (-1, 1):
        m.horn('head', (0, hy, hz), [(s_ * 0.12, 0, 0.12), (s_ * 0.24, 0.0, 0.24), (s_ * 0.31, 0.06, 0.42)], 0.052, 0.008, 'horn'); m.horn('head', (0, hy, hz), [(s_ * 0.1, -0.06, 0.1), (s_ * 0.2, -0.12, 0.2), (s_ * 0.24, -0.14, 0.34)], 0.036, 0.007, 'horn')
        m.add(box((s_ * 0.5, 0.02, f['ch'] - 0.02), (0.22, 0.2, 0.12)), 'clavicle' + ('L' if s_ > 0 else 'R'), 'rock')   # skalne płyty na barkach
    ch = f['ch']
    for bone, t, d, ln in (('chest', 0.3, (0, 1, 0), 0.3), ('chest', 0.7, (0.4, 1, 0), 0.25), ('chest', 0.5, (-0.5, 1, 0), 0.28), ('spine', 0.5, (0, 1, 0), 0.25), ('chest', 0.5, (0, -1, 0), 0.3), ('upperarmL', 0.5, (0, 1, 0), 0.3), ('upperarmR', 0.5, (0, 1, 0), 0.3), ('forearmL', 0.5, (0, 1, 0), 0.25), ('forearmR', 0.5, (0, 1, 0), 0.25), ('thighL', 0.5, (0, 1, 0), 0.3), ('thighR', 0.5, (0, 1, 0), 0.3), ('calfL', 0.5, (0, 1, 0), 0.25)):
        m.crack(bone, t, d, ln, 'lava', r=0.009)
    m.drips('jaw', (0, m.front(0, hz - 0.08 * k, 0.05) or hy + 0.16 * k, hz - 0.12 * k), 4, 0.1, 0.18, 'lava')
    spine_spikes(m, length=0.12, mat='horn'); knobs(m, 0.12, 'horn'); hands(m, f, n=4, length=0.2, spread=0.09, mat='horn')
    finish(m, walk=0.4, run=0.75, arm_walk=0.25, arm_run=0.55, lean_run=0.3, idle_sway=0.05, twitch=0.25, head_roll=0.08); return m

def officer():
    """Zombie-policjant ze Scary GTA: zgniłe ciało w granatowym mundurze, czapka z daszkiem, świecąca odznaka, czerwone światła na barkach, pazury i zęby."""
    m = Monster('officer', 51); mats(m, (0.55, 0.62, 0.5, 1), 0.7, {'cloth': ((0.04, 0.06, 0.16, 1), 0.85), 'glow': dict(color=(0.1, 0.01, 0, 1), rough=0.5, emit=(1.0, 0.05, 0.02, 1), strength=4.0)}); m.dirt = 0.8; m.blood = 0.2; m.bruise = 0.18
    f = humanoid(m, leg=1.08, torso=1.05, arm=1.05, thick=0.82, hunch=0.3, shoulder=0.25, neck=0.17, head=(0.12, 0.15)); m.skin()
    k = f['k']; hy, hz = f['hy'], f['hz']
    face(m, f, w=0.05, pupil=0.014, teeth=15, tlen=0.06, mouth_w=0.08, mouth_z=-0.085, jaw_drop=0.025, smile=0.008, socket=1.4)
    ch = m.bones['chest']['tail'].z
    m.add(ellipsoid((0, hy - 0.005, hz + 0.095 * k), (0.135 * k, 0.14 * k, 0.065 * k), 10, 6), 'head', 'cloth')          # denko czapki
    m.add(ellipsoid((0, hy + 0.115 * k, hz + 0.05 * k), (0.1 * k, 0.085 * k, 0.012 * k), 10, 4), 'head', 'cloth')        # daszek
    m.add(ellipsoid((0, hy + 0.132 * k, hz + 0.1 * k), (0.03 * k, 0.012, 0.025 * k), 6, 4), 'head', 'tooth')            # znaczek na czapce
    m.add(ellipsoid((0.09, 0.12, ch - 0.12), (0.035, 0.012, 0.045), 7, 4), 'chest', 'tooth')                              # odznaka
    m.add(ellipsoid((0.09, 0.128, ch - 0.12), (0.014, 0.006, 0.02), 5, 3), 'chest', 'glow')                               # żarząca się gwiazda odznaki
    for s_, g_ in ((-1, 'glow'), (1, 'glow')): m.add(ellipsoid((s_ * 0.2, 0.02, ch + 0.03), (0.045, 0.045, 0.03), 7, 4), 'chest', g_)   # światła na barkach
    m.add(cloth_cone((0, 0.0, 1.0), 0.5, 0.2, 0.3, 10, 0.12, m.rng), 'pelvis', 'cloth')                                   # poły munduru
    for s_, n in ((1, 'L'), (-1, 'R')): m.add(cloth_cone((s_ * 0.33, 0.08, f['ch'] - 0.3), 0.26, 0.05, 0.09, 6, 0.06, m.rng), 'forearm' + n, 'cloth')   # strzępy rękawów
    spine_spikes(m, n=5, length=0.05, mat='claw'); hands(m, f, n=4, length=0.1, spread=0.05, mat='claw')
    m.wound('head', 0.45, (0.8, 0.25, 0.25), 0.03)
    finish(m, walk=0.5, run=1.0, arm_walk=0.2, arm_run=0.5, lean_run=0.25, idle_sway=0.04, twitch=0.2); return m

RECIPES = {n: g for n, g in globals().items() if n in ('mannequin', 'gravedigger', 'warden', 'doll', 'patient', 'butler', 'blind', 'threadman', 'furas', 'ghost', 'lavabeast', 'officer')}

def run(names):
    os.makedirs(OUT, exist_ok=True)
    for n in names:
        reset(); m = RECIPES[n](); path = os.path.join(OUT, n + '.glb'); m.export(path); shrink_glb.shrink(path)   # kolory i indeksy kości w bajtach (mniejszy plik)
        print('%-12s tris %5d  %4d KB  -> %s' % (n, m.tris, os.path.getsize(path) // 1024, os.path.relpath(path, ROOT)))

if __name__ == '__main__':
    run(sys.argv[1:] or list(RECIPES))
