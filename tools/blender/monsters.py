# Przepisy na potwory BagaBoo (Blender bez okna, moduł bpy). Każdy przepis to funkcja zwracająca Monster; wynik: assets/monsters/<nazwa>.glb.
# Uruchamianie z katalogu repozytorium: v/bin/python tools/blender/monsters.py [nazwa ...]   (bez argumentów: wszystkie)
# Założenia: potwór patrzy w +Y przepisu (w grze +Z), wysokość 1,0-2,6 m, do ok. 4 tys. trójkątów, kolory wierzchołków dają brud i krew.
import sys, os, math
sys.path.insert(0, os.path.dirname(__file__))
from monsterlib import *

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
OUT = os.path.join(ROOT, 'assets', 'monsters')

def mats(m, skin, rough=0.7, extra=None):
    m.material('skin', skin, rough); m.material('joint', (0.05, 0.05, 0.06, 1), 0.4, metal=0.5); m.material('eye', (0.02, 0.0, 0.0, 1), 0.3, emit=(1.0, 0.07, 0.03, 1), strength=3.0)
    m.material('tooth', (0.86, 0.80, 0.62, 1), 0.35); m.material('claw', (0.06, 0.05, 0.05, 1), 0.4); m.material('bone', (0.82, 0.77, 0.62, 1), 0.6); m.material('dark', (0.01, 0.005, 0.005, 1), 0.9)
    m.material('blood', (0.35, 0.02, 0.02, 1), 0.35)
    for k, v in (extra or {}).items():
        if isinstance(v, dict): m.material(k, **v)
        else: m.material(k, *v)

def humanoid(m, leg=1.0, torso=1.0, arm=1.0, thick=1.0, hunch=0.0, shoulder=0.26, neck=0.2, head=(0.10, 0.11), legs=True, tilt=0.0):
    """szkielet humanoidalny; zwraca punkty pomocnicze (środek głowy, przód twarzy, dłonie, stopy)."""
    hip = 0.92 * leg; sp = hip + 0.38 * torso; ch = hip + 0.66 * torso; hu = hunch
    m.bone('pelvis', None, (0, 0.0, hip + 0.06), (0.13 * thick, 0.09 * thick), head=(0, 0, hip))
    m.bone('spine', 'pelvis', (0, 0.03 + hu * 0.25, sp), (0.12 * thick, 0.085 * thick))
    m.bone('chest', 'spine', (0, 0.05 + hu * 0.55, ch), (0.16 * thick, 0.10 * thick))
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
    m.bone('head', 'neck', (0, nt.y + 0.03 + tilt * 0.1, nt.z + 0.16), head)
    hc = Vector((0, nt.y + 0.02, nt.z + 0.1)); ht = m.bones['head']['tail']
    m.bone('jaw', 'head', (0, hc.y + 0.12, hc.z - 0.10), 0.02, head=(0, hc.y + 0.01, hc.z - 0.045), skin=False)
    if legs:
        for s, n in ((1, 'L'), (-1, 'R')):
            m.bone('hip' + n, 'pelvis', (s * 0.10, 0, hip - 0.02), (0.07 * thick, 0.07 * thick), head=(0, 0, hip), role='hip')   # łączy nogę z miednicą w grafie Skin
            m.bone('thigh' + n, 'hip' + n, (s * 0.115, 0.02, hip - 0.43 * leg), (0.065 * thick, 0.065 * thick))
            m.bone('calf' + n, 'thigh' + n, (s * 0.115, -0.035, 0.09), (0.045 * thick, 0.045 * thick))
            m.bone('foot' + n, 'calf' + n, (s * 0.115, 0.16, 0.03), (0.04, 0.03))
    return dict(hc=hc, hz=hc.z, hy=hc.y, head_top=ht.z + head[1], hand={'L': m.bones['handL']['tail'], 'R': m.bones['handR']['tail']}, neck_top=nt)

def face(m, f, w=0.042, pupil=0.011, eye_z=0.03, teeth=13, tlen=0.034, mouth_z=-0.05, mouth_w=0.06, eyes=True, lower=True, jaw_drop=0.0, smile=0.012, socket=1.0, brow=True):
    """duże ciemne oczodoły z małym świecącym źrenicznym światłem, groźne brwi, szeroka paszcza z zębami (f z humanoid())."""
    y = f['hy'] + 0.10
    if eyes:
        for s_ in (-1, 1):
            m.add(ellipsoid((s_ * w, y - 0.02, f['hz'] + eye_z), (0.024 * socket, 0.02, 0.032 * socket), 8, 5), 'head', 'dark')   # oczodół
            m.eye('head', (s_ * w, y + 0.002, f['hz'] + eye_z - 0.004), pupil)
            if brow: m.add(tube([Vector((s_ * 0.012, y - 0.004, f['hz'] + eye_z + 0.032)), Vector((s_ * 0.034, y - 0.012, f['hz'] + eye_z + 0.040)), Vector((s_ * 0.054, y - 0.030, f['hz'] + eye_z + 0.046))], 0.009, 0.006, 4), 'head', 'skin')
    m.add(ellipsoid((0, y - 0.01, f['hz'] + mouth_z + 0.004 - jaw_drop * 0.3), (mouth_w * 1.05, 0.016, 0.026 + jaw_drop * 0.3), 10, 4), 'head', 'dark')   # paszcza
    m.teeth('head', (0, y + 0.006, f['hz'] + mouth_z + 0.014), mouth_w, teeth, tlen, down=True, smile=smile)
    if lower: m.teeth('jaw', (0, y + 0.006, f['hz'] + mouth_z - 0.018 - jaw_drop), mouth_w * 0.9, max(3, teeth - 3), tlen * 0.8, down=False, smile=smile * 0.7)

def hands(m, f, n=4, length=0.06, spread=0.05, mat='claw'):
    for n_, s in (('L', 1), ('R', -1)):
        h = f['hand'][n_]; m.claws('hand' + n_, (h.x, h.y + 0.01, h.z - 0.01), n, spread, length, mat)

def finish(m, walk=0.55, run=1.0, **kw):
    m.build(subsurf=1); m.rig(); humanoid_clips(m, walk=walk, run=run, **kw)

# ============================ POTWORY ============================
def mannequin():
    """Pęknięty gipsowy manekin: długie cienkie kończyny, przekrzywiona głowa, świecące oczy, szeroki uśmiech z zębami."""
    m = Monster('mannequin', 11); mats(m, (0.80, 0.77, 0.70, 1), 0.55); m.dirt = 0.9; m.blood = 0.18
    f = humanoid(m, leg=1.08, torso=0.95, arm=1.12, thick=0.72, hunch=0.15, shoulder=0.23, neck=0.22, head=(0.105, 0.135), tilt=1.0)
    face(m, f, w=0.044, teeth=15, tlen=0.04, mouth_w=0.075, mouth_z=-0.055, jaw_drop=0.012, smile=0.018)
    for n in ('upperarmL', 'upperarmR', 'forearmL', 'forearmR', 'calfL', 'calfR'): m.joint(n, m.bones[n]['tail'], 0.036)   # metalowe stawy
    hands(m, f, n=4, length=0.085, spread=0.05)
    finish(m, walk=0.5, run=0.95, twitch=0.35, head_roll=0.22)
    return m

def gravedigger():
    """Grabarz: przygarbiony, bardzo długie ręce, kaptur, peleryna i łopata."""
    m = Monster('gravedigger', 21); mats(m, (0.55, 0.58, 0.5, 1), 0.8, {'cloth': ((0.07, 0.065, 0.06, 1), 0.95), 'wood': ((0.22, 0.14, 0.08, 1), 0.8), 'steel': ((0.35, 0.36, 0.38, 1), 0.4)}); m.dirt = 1.0; m.blood = 0.3
    f = humanoid(m, leg=0.98, torso=1.05, arm=1.5, thick=0.95, hunch=0.95, shoulder=0.29, neck=0.12, head=(0.085, 0.10))
    hc = f['hc']; m.add(ellipsoid((0, hc.y - 0.02, hc.z + 0.03), (0.15, 0.16, 0.17), 10, 6), 'head', 'cloth')   # kaptur
    m.add(ellipsoid((0, hc.y + 0.06, hc.z - 0.02), (0.075, 0.07, 0.085), 8, 5), 'head', 'dark')   # ciemna twarz we wnętrzu kaptura
    for s_ in (-1, 1): m.eye('head', (s_ * 0.035, hc.y + 0.115, hc.z + 0.01), 0.012)
    m.teeth('head', (0, hc.y + 0.115, hc.z - 0.035), 0.04, 7, 0.026, smile=0.008); m.teeth('jaw', (0, hc.y + 0.115, hc.z - 0.05), 0.035, 5, 0.022, down=False)
    m.add(cloth_cone((0, 0.0, 1.62), 0.45, 0.26, 0.5, 12, 0.18, m.rng, 0.8), 'spine', 'cloth')   # peleryna
    h = f['hand']['R']; m.add(frustum((h.x, h.y, h.z + 0.55), (h.x + 0.02, h.y + 0.02, h.z - 0.75), 0.022, 0.018, 6), 'handR', 'wood')   # trzonek łopaty
    m.add(box((h.x + 0.02, h.y + 0.03, h.z - 0.88), (0.24, 0.02, 0.32)), 'handR', 'steel')
    hands(m, f, n=4, length=0.11, spread=0.06)
    finish(m, walk=0.45, run=0.8, arm_walk=0.15, arm_run=0.4, lean_run=0.45, idle_sway=0.05, head_roll=0.1); return m

def warden():
    """Strażnik katakumb: wysoki szkielet z porożem, widocznymi żebrami i długimi palcami."""
    m = Monster('warden', 31); mats(m, (0.76, 0.72, 0.6, 1), 0.65, {'cloth': ((0.1, 0.07, 0.06, 1), 0.95)}); m.dirt = 0.85; m.blood = 0.12
    f = humanoid(m, leg=1.22, torso=1.12, arm=1.25, thick=0.55, hunch=0.35, shoulder=0.27, neck=0.2, head=(0.085, 0.13))
    face(m, f, w=0.042, pupil=0.012, teeth=13, tlen=0.05, mouth_w=0.06, jaw_drop=0.02, smile=0.006, socket=1.3)
    ch = m.bones['chest']['tail'].z
    for i in range(5):   # żebra: łuki z rur przed klatką piersiową
        z = ch - 0.06 - i * 0.075; w = 0.15 - i * 0.012
        for s_ in (-1, 1): m.add(tube([Vector((s_ * 0.02, 0.12, z)), Vector((s_ * w * 0.8, 0.1, z)), Vector((s_ * w, 0.0, z + 0.01)), Vector((s_ * w * 0.9, -0.09, z + 0.02))], 0.011, 0.008, 4), 'chest', 'bone')
    hz, hy = f['hz'], f['hy']
    for s_ in (-1, 1):   # poroże
        pts = [(s_ * 0.05, 0, 0.1), (s_ * 0.12, 0.0, 0.22), (s_ * 0.17, 0.0, 0.34), (s_ * 0.15, -0.02, 0.48)]; m.horn('head', (0, hy, hz), pts, 0.016, 0.005)
        m.horn('head', (0, hy, hz), [(s_ * 0.12, 0.0, 0.22), (s_ * 0.22, 0.04, 0.30), (s_ * 0.3, 0.05, 0.4)], 0.01, 0.004)
        m.horn('head', (0, hy, hz), [(s_ * 0.17, 0.0, 0.34), (s_ * 0.26, 0.05, 0.42)], 0.008, 0.003)
    m.add(cloth_cone((0, 0.0, 1.05), 0.55, 0.2, 0.34, 10, 0.16, m.rng), 'pelvis', 'cloth')   # strzępy szaty
    hands(m, f, n=5, length=0.14, spread=0.07, mat='bone')
    finish(m, walk=0.5, run=0.95, arm_walk=0.2, arm_run=0.55, lean_run=0.3, idle_sway=0.04, twitch=0.25); return m

def doll():
    """Lalka z żłobka: mała, porcelanowa, wielka głowa, czarne oczodoły z czerwonymi źrenicami, zszyty szeroki uśmiech, sukienka."""
    m = Monster('doll', 41); mats(m, (0.92, 0.88, 0.82, 1), 0.3, {'cloth': ((0.55, 0.35, 0.4, 1), 0.9), 'hair': ((0.03, 0.02, 0.02, 1), 0.9)}); m.dirt = 0.7; m.blood = 0.22
    f = humanoid(m, leg=0.5, torso=0.55, arm=0.55, thick=0.85, hunch=0.2, shoulder=0.15, neck=0.06, head=(0.16, 0.17), tilt=1.0)
    face(m, f, w=0.07, pupil=0.014, eye_z=0.03, teeth=17, tlen=0.036, mouth_w=0.11, mouth_z=-0.075, jaw_drop=0.008, smile=0.03, socket=1.6, brow=False)
    m.add(cloth_cone((0, 0.0, m.bones['chest']['tail'].z - 0.02), 0.2, 0.13, 0.3, 12, 0.07, m.rng), 'spine', 'cloth')   # sukienka
    hz, hy = f['hz'], f['hy']
    for s_ in (-1, 1): m.add(ellipsoid((s_ * 0.13, hy - 0.02, hz + 0.1), (0.05, 0.05, 0.08), 7, 5), 'head', 'hair')   # warkocze
    m.add(ellipsoid((0, hy - 0.04, hz + 0.14), (0.16, 0.15, 0.08), 8, 5), 'head', 'hair')
    for i in range(6): m.add(tube([Vector((-0.09 + i * 0.035, hy + 0.16, hz - 0.075)), Vector((-0.09 + i * 0.035 + 0.012, hy + 0.165, hz - 0.045))], 0.0035, 0.0035, 3), 'head', 'dark')   # szwy przy ustach
    hands(m, f, n=4, length=0.05, spread=0.04)
    finish(m, walk=0.55, run=0.95, arm_walk=0.25, arm_run=0.7, idle_sway=0.07, twitch=0.5, head_roll=0.3); return m

def patient():
    """Pacjent szpitala: wychudzony, w bandażach, długie powykręcane ręce, dziura zamiast oka."""
    m = Monster('patient', 51); mats(m, (0.66, 0.62, 0.56, 1), 0.7, {'gauze': ((0.72, 0.68, 0.55, 1), 0.95), 'blood2': ((0.3, 0.02, 0.02, 1), 0.4)}); m.dirt = 0.95; m.blood = 0.3
    f = humanoid(m, leg=1.02, torso=1.0, arm=1.3, thick=0.62, hunch=0.8, shoulder=0.24, neck=0.18, head=(0.09, 0.115), tilt=-1.0)
    hz, hy = f['hz'], f['hy']
    m.add(ellipsoid((0, hy - 0.005, hz + 0.045), (0.105, 0.125, 0.105), 10, 6), 'head', 'gauze')   # bandaż na górze głowy
    face(m, f, w=0.04, pupil=0.012, teeth=11, tlen=0.03, mouth_w=0.055, jaw_drop=0.03, smile=-0.004, socket=1.2)
    ch = m.bones['chest']['tail'].z
    for i in range(5): m.add(frustum((0, 0.0, ch - 0.05 - i * 0.07), (0, 0.0, ch - 0.07 - i * 0.07), 0.15 - i * 0.004, 0.15 - i * 0.004, 10), 'chest', 'gauze')   # opaski na klatce
    for n_, s_ in (('upperarmL', 1), ('forearmR', -1)):
        b = m.bones[n_]; h, t = b['head'], b['tail']; m.add(frustum(h.lerp(t, 0.2), h.lerp(t, 0.8), 0.06, 0.055, 8), n_, 'gauze')
    for i in range(4): m.add(ellipsoid((0.05 + i * 0.02, f['hy'] + 0.11, hz + 0.06 - i * 0.05), (0.012, 0.006, 0.03), 5, 3), 'head', 'blood2')   # smugi krwi
    hands(m, f, n=5, length=0.09, spread=0.06, mat='bone')
    finish(m, walk=0.4, run=0.75, arm_walk=0.25, arm_run=0.6, lean_run=0.3, idle_sway=0.07, twitch=0.7, head_roll=-0.2); return m

def butler():
    """Lokaj hotelowy: wysoki, w czarnym fraku, białe rękawiczki, gładka twarz z wąską pionową paszczą."""
    m = Monster('butler', 61); mats(m, (0.82, 0.78, 0.72, 1), 0.5, {'suit': ((0.02, 0.02, 0.025, 1), 0.85), 'glove': ((0.9, 0.9, 0.88, 1), 0.7)}); m.dirt = 0.5; m.blood = 0.08
    f = humanoid(m, leg=1.18, torso=1.08, arm=1.18, thick=0.62, hunch=0.15, shoulder=0.24, neck=0.24, head=(0.085, 0.13))
    hz, hy = f['hz'], f['hy']; y = hy + 0.105
    m.add(ellipsoid((0, y - 0.02, hz - 0.01), (0.017, 0.02, 0.085), 8, 5), 'head', 'dark')   # pionowa paszcza
    for i in range(7):
        z = hz - 0.07 + i * 0.024
        for s_ in (-1, 1): m.add(frustum(Vector((s_ * 0.012, y - 0.004, z)), Vector((s_ * 0.004, y - 0.004, z)), 0.006, 0.0, 4), 'head', 'tooth')
    for s_ in (-1, 1): m.add(ellipsoid((s_ * 0.04, y - 0.015, hz + 0.045), (0.016, 0.01, 0.006), 6, 3), 'head', 'dark')   # zapadnięte oczy bez źrenic
    ch = m.bones['chest']['tail'].z
    m.add(cloth_cone((0, 0.0, ch + 0.02), 0.5, 0.2, 0.28, 12, 0.0, m.rng, 0.8), 'spine', 'suit')   # frak
    m.add(ellipsoid((0, 0.1, ch - 0.02), (0.13, 0.06, 0.17), 8, 5), 'chest', 'suit'); m.add(ellipsoid((0, 0.145, ch + 0.0), (0.045, 0.012, 0.02), 6, 3), 'chest', 'dark')
    for n_ in ('L', 'R'):
        h = f['hand'][n_]; m.add(ellipsoid((h.x, h.y + 0.02, h.z - 0.02), (0.04, 0.045, 0.07), 7, 4), 'hand' + n_, 'glove'); m.claws('hand' + n_, (h.x, h.y + 0.03, h.z - 0.06), 4, 0.05, 0.12, 'glove', fwd=(0, 0.3, -1))
    finish(m, walk=0.42, run=0.8, arm_walk=0.18, arm_run=0.5, lean_run=0.25, idle_sway=0.03, head_roll=0.12); return m

def blind():
    """Ślepy: blady, wychudzony, bez oczu, ogromna pionowa paszcza z kłami, długie ręce z pazurami."""
    m = Monster('blind', 71); mats(m, (0.78, 0.74, 0.68, 1), 0.55, {'maw': ((0.18, 0.01, 0.02, 1), 0.35)}); m.dirt = 0.7; m.blood = 0.2
    f = humanoid(m, leg=1.05, torso=1.0, arm=1.4, thick=0.6, hunch=0.7, shoulder=0.25, neck=0.14, head=(0.1, 0.15))
    hz, hy = f['hz'], f['hy']; y = hy + 0.11
    m.add(ellipsoid((0, y - 0.025, hz - 0.01), (0.04, 0.03, 0.115), 9, 6), 'head', 'maw')   # pionowa czerwona paszcza
    for i in range(10):
        z = hz - 0.1 + i * 0.022
        for s_ in (-1, 1): m.add(frustum(Vector((s_ * 0.036, y - 0.012, z)), Vector((s_ * 0.008, y - 0.008, z)), 0.007, 0.0, 4), 'head', 'tooth')
    for s_ in (-1, 1): m.add(ellipsoid((s_ * 0.05, y - 0.02, hz + 0.05), (0.014, 0.008, 0.005), 6, 3), 'head', 'skin')   # zasklepione oczy
    hands(m, f, n=4, length=0.16, spread=0.07)
    finish(m, walk=0.45, run=0.9, arm_walk=0.2, arm_run=0.5, lean_run=0.4, idle_sway=0.06, twitch=0.6, head_roll=0.15); return m

def threadman():
    """Szmaciarz: worek na głowie z zszytą paszczą, czerwone oczy, łaty i szwy, długie igły zamiast palców."""
    m = Monster('threadman', 81); mats(m, (0.45, 0.36, 0.26, 1), 0.95, {'sack': ((0.4, 0.31, 0.2, 1), 0.95), 'thread': ((0.02, 0.02, 0.02, 1), 0.7), 'needle': ((0.6, 0.6, 0.62, 1), 0.3), 'blood2': ((0.35, 0.02, 0.02, 1), 0.4)}); m.dirt = 0.9; m.blood = 0.28
    f = humanoid(m, leg=1.1, torso=1.05, arm=1.35, thick=0.65, hunch=0.45, shoulder=0.25, neck=0.2, head=(0.11, 0.15))
    hz, hy = f['hz'], f['hy']; y = hy + 0.11
    m.add(ellipsoid((0, hy, hz + 0.01), (0.135, 0.15, 0.17), 10, 6), 'head', 'sack')   # worek
    for s_ in (-1, 1):
        m.add(ellipsoid((s_ * 0.045, y + 0.015, hz + 0.035), (0.022, 0.012, 0.03), 8, 5), 'head', 'dark'); m.eye('head', (s_ * 0.045, y + 0.03, hz + 0.03), 0.011)
        m.add(tube([Vector((s_ * 0.045, y + 0.03, hz + 0.0)), Vector((s_ * 0.05, y + 0.032, hz - 0.06)), Vector((s_ * 0.05, y + 0.03, hz - 0.12))], 0.007, 0.004, 4), 'head', 'blood2')   # krwawe łzy
    zz = [Vector((-0.07 + i * 0.0233, y + 0.025, hz - 0.075 + (0.012 if i % 2 else -0.012))) for i in range(7)]
    m.add(tube(zz, 0.005, 0.005, 4), 'head', 'thread')   # zszyta paszcza
    for i in range(6): m.add(tube([Vector((-0.07 + i * 0.026, y + 0.02, hz - 0.095)), Vector((-0.07 + i * 0.026 + 0.01, y + 0.035, hz - 0.055))], 0.004, 0.004, 3), 'head', 'thread')
    ch = m.bones['chest']['tail'].z
    for i in range(4): m.add(tube([Vector((-0.1, 0.13, ch - 0.05 - i * 0.09)), Vector((0.0, 0.14, ch - 0.07 - i * 0.09)), Vector((0.1, 0.13, ch - 0.05 - i * 0.09))], 0.006, 0.006, 4), 'chest', 'thread')   # szwy
    for n_ in ('L', 'R'):
        h = f['hand'][n_]
        for i in range(4): b = Vector((h.x + (i - 1.5) * 0.02, h.y + 0.02, h.z - 0.02)); m.add(frustum(b, b + Vector((0, 0.04, -0.3)), 0.006, 0.0, 4), 'hand' + n_, 'needle')   # igły
    finish(m, walk=0.5, run=0.95, arm_walk=0.25, arm_run=0.7, lean_run=0.4, idle_sway=0.06, twitch=0.3, head_roll=0.12); return m

def furas():
    """Furas: dziki kocioludek: przygarbiony, uszy, ogon, wielkie kły i pazury."""
    m = Monster('furas', 91); mats(m, (0.3, 0.17, 0.09, 1), 0.9, {'cat': ((0.3, 0.17, 0.09, 1), 0.9)}); m.dirt = 0.6; m.blood = 0.25
    f = humanoid(m, leg=0.9, torso=0.95, arm=1.15, thick=1.1, hunch=1.0, shoulder=0.27, neck=0.1, head=(0.12, 0.13))
    hz, hy = f['hz'], f['hy']
    face(m, f, w=0.05, pupil=0.013, teeth=9, tlen=0.05, mouth_w=0.07, jaw_drop=0.03, smile=0.004, socket=1.2, brow=True)
    for s_ in (-1, 1): m.add(frustum(Vector((s_ * 0.08, hy - 0.01, hz + 0.1)), Vector((s_ * 0.11, hy - 0.04, hz + 0.28)), 0.045, 0.0, 5), 'head', 'skin')   # uszy
    m.bone('tail1', 'pelvis', (0, -0.3, 1.0), 0.04, head=(0, -0.05, 0.95), role='tail'); m.bone('tail2', 'tail1', (0, -0.55, 1.12), 0.032, role='tail'); m.bone('tail3', 'tail2', (0, -0.75, 1.3), 0.022, role='tail')
    hands(m, f, n=4, length=0.13, spread=0.06)
    finish(m, walk=0.55, run=1.05, arm_walk=0.4, arm_run=0.95, lean_run=0.5, idle_sway=0.06, twitch=0.4, head_roll=0.1); return m

def ghost():
    """Duch z Room 000: biały całun bez nóg, bardzo długie chude ręce, pusta twarz z opadniętą szczęką."""
    m = Monster('ghost', 101); mats(m, (0.86, 0.88, 0.9, 1), 0.85, {'shroud': ((0.8, 0.82, 0.86, 1), 0.95)}); m.dirt = 0.4; m.blood = 0.0
    f = humanoid(m, leg=1.3, torso=1.0, arm=1.6, thick=0.5, hunch=0.5, shoulder=0.22, neck=0.16, head=(0.1, 0.14), legs=False)
    face(m, f, w=0.042, pupil=0.012, teeth=0, tlen=0.0, mouth_w=0.05, mouth_z=-0.075, jaw_drop=0.06, socket=1.6, brow=False, lower=False)
    hz, hy = f['hz'], f['hy']; m.add(ellipsoid((0, hy + 0.1, hz - 0.1), (0.04, 0.02, 0.09), 8, 5), 'head', 'dark')
    m.add(cloth_cone((0, 0.0, 1.55), 0.1, 0.17, 0.62, 14, 0.35, m.rng), 'spine', 'shroud')   # całun do ziemi
    m.add(cloth_cone((0, 0.0, 1.45), 0.35, 0.2, 0.42, 12, 0.3, m.rng), 'pelvis', 'shroud')
    hands(m, f, n=5, length=0.2, spread=0.07, mat='bone')
    finish(m, walk=0.25, run=0.45, arm_walk=0.2, arm_run=0.45, lean_run=0.2, idle_sway=0.09, twitch=0.3, head_roll=0.2); return m

def lavabeast():
    """Lawowa Bestia: masywna, czarna jak węgiel, rogi i żarzące się pęknięcia na ciele."""
    m = Monster('lavabeast', 111); mats(m, (0.05, 0.04, 0.04, 1), 0.85, {'lava': dict(color=(0.1, 0.02, 0.0, 1), rough=0.5, emit=(1.0, 0.25, 0.02, 1), strength=3.0), 'horn': ((0.1, 0.07, 0.06, 1), 0.5)}); m.dirt = 0.5; m.blood = 0.0
    f = humanoid(m, leg=0.82, torso=1.2, arm=1.05, thick=1.9, hunch=0.55, shoulder=0.36, neck=0.1, head=(0.14, 0.15))
    face(m, f, w=0.06, pupil=0.016, teeth=11, tlen=0.06, mouth_w=0.09, jaw_drop=0.03, smile=0.004, socket=1.3)
    hz, hy = f['hz'], f['hy']
    for s_ in (-1, 1): m.horn('head', (0, hy, hz), [(s_ * 0.1, 0, 0.1), (s_ * 0.2, 0.0, 0.2), (s_ * 0.27, 0.05, 0.36)], 0.045, 0.008, 'horn')
    ch = m.bones['chest']['tail'].z
    for i in range(7):   # żarzące się pęknięcia (rury z emisją) na klatce, plecach i ramionach
        a = m.rng.random() * 6.28; x0 = (m.rng.random() - 0.5) * 0.3; z0 = ch - 0.05 - m.rng.random() * 0.4
        m.add(tube([Vector((x0, 0.17, z0)), Vector((x0 + 0.04, 0.18, z0 - 0.07)), Vector((x0 - 0.02, 0.17, z0 - 0.15)), Vector((x0 + 0.05, 0.16, z0 - 0.22))], 0.008, 0.004, 4), 'chest', 'lava')
    for n_, s_ in (('upperarmL', 1), ('upperarmR', -1)):
        b = m.bones[n_]; m.add(tube([b['head'] + Vector((s_ * 0.0, 0.07, 0.0)), b['head'].lerp(b['tail'], 0.5) + Vector((s_ * 0.02, 0.07, 0)), b['tail'] + Vector((0, 0.06, 0))], 0.01, 0.006, 4), n_, 'lava')
    hands(m, f, n=4, length=0.14, spread=0.09)
    finish(m, walk=0.4, run=0.75, arm_walk=0.25, arm_run=0.55, lean_run=0.3, idle_sway=0.05, twitch=0.2, head_roll=0.08); return m

RECIPES = {n: g for n, g in globals().items() if n in ('mannequin', 'gravedigger', 'warden', 'doll', 'patient', 'butler', 'blind', 'threadman', 'furas', 'ghost', 'lavabeast')}

def run(names):
    os.makedirs(OUT, exist_ok=True)
    for n in names:
        reset(); m = RECIPES[n](); path = os.path.join(OUT, n + '.glb'); m.export(path)
        print('%-12s tris %5d  %4d KB  -> %s' % (n, m.tris, os.path.getsize(path) // 1024, os.path.relpath(path, ROOT)))

if __name__ == '__main__':
    run(sys.argv[1:] or list(RECIPES))
