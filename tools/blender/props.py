# Zestaw rekwizytów do poziomów (jeden plik GLB z nazwanymi siatkami). Uruchomienie bez okna:
#   /tmp/claude-0/venv/bin/python tools/blender/props.py [katalog_wyjścia]      # domyślnie assets/props, potem: python tools/blender/shrink_glb.py assets/props/props.glb
# Każdy rekwizyt to osobny obiekt 'prop_<nazwa>' z początkiem w środku podstawy (z = 0 to podłoga, w grze y), kolory w wierzchołkach (brud od dołu), 100-600 trójkątów.
# Układ: Blender z do góry (w grze y), wymiary w metrach. Nazwy muszą się zgadzać z PROPS w core/proplogic.js (test pilnuje).
import bpy, bmesh, math, os, random, sys, zlib
from mathutils import Matrix, Vector

def hexc(h): return ((h >> 16 & 255) / 255.0, (h >> 8 & 255) / 255.0, (h & 255) / 255.0, 1.0)
def lin(c):   # kolory w pliku są liniowe: przelicz z sRGB, żeby w grze wyglądały jak zapisane szesnastkowo
    f = lambda v: v / 12.92 if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4
    return (f(c[0]), f(c[1]), f(c[2]), 1.0)

class Prop:
    def __init__(self, name):
        self.name = name; self.bm = bmesh.new(); self.col = self.bm.loops.layers.float_color.new('Col'); self.rng = random.Random(zlib.crc32(name.encode()))
    def _paint(self, verts, color):
        c = lin(hexc(color)); faces = {f for v in verts for f in v.link_faces}
        for f in faces:
            for l in f.loops: l[self.col] = c
    def box(self, cx, cy, cz, sx, sy, sz, color, rz=0.0, rx=0.0, ry=0.0):
        r = bmesh.ops.create_cube(self.bm, size=1.0); vs = r['verts']
        m = Matrix.Translation((cx, cy, cz)) @ Matrix.Rotation(rz, 4, 'Z') @ Matrix.Rotation(ry, 4, 'Y') @ Matrix.Rotation(rx, 4, 'X') @ Matrix.Diagonal((sx, sy, sz, 1.0))
        bmesh.ops.transform(self.bm, matrix=m, verts=vs); self._paint(vs, color); return vs
    def cyl(self, cx, cy, cz, r1, r2, depth, color, axis='Z', segs=12, caps=True):
        res = bmesh.ops.create_cone(self.bm, cap_ends=caps, segments=segs, radius1=r1, radius2=r2, depth=depth); vs = res['verts']
        rot = {'Z': Matrix.Identity(4), 'X': Matrix.Rotation(math.pi / 2, 4, 'Y'), 'Y': Matrix.Rotation(math.pi / 2, 4, 'X')}[axis]
        bmesh.ops.transform(self.bm, matrix=Matrix.Translation((cx, cy, cz)) @ rot, verts=vs); self._paint(vs, color); return vs
    def finish(self, height):
        bmesh.ops.triangulate(self.bm, faces=self.bm.faces[:])
        for f in self.bm.faces:   # brud: ciemniej przy ziemi, drobny szum z pozycji, lekka zmienność koloru
            for l in f.loops:
                p = l.vert.co; k = 0.55 + 0.45 * min(1.0, max(0.0, p.z / max(0.01, height * 0.6)))
                n = 0.86 + 0.14 * math.sin(p.x * 37.0 + p.y * 23.0 + p.z * 51.0)
                c = l[self.col]; l[self.col] = (c[0] * k * n, c[1] * k * n, c[2] * k * n, 1.0)
        me = bpy.data.meshes.new('prop_' + self.name); self.bm.to_mesh(me); self.bm.free()
        for p in me.polygons: p.use_smooth = False
        ob = bpy.data.objects.new('prop_' + self.name, me); bpy.context.scene.collection.objects.link(ob); return ob

def barrel():
    p = Prop('barrel'); body = 0x5a3a28
    p.cyl(0, 0, 0.45, 0.3, 0.3, 0.9, body, segs=14)
    for z in (0.18, 0.72): p.cyl(0, 0, z, 0.322, 0.322, 0.05, 0x2a2420, segs=14, caps=False)
    p.cyl(0, 0, 0.9, 0.27, 0.27, 0.03, 0x1a1614, segs=14); return p, 0.9
def crate():
    p = Prop('crate'); w = 0x7a5a3a
    p.box(0, 0, 0.3, 0.56, 0.56, 0.56, 0x5e4528)
    for sx in (-1, 1):
        for sy in (-1, 1): p.box(sx * 0.27, sy * 0.27, 0.3, 0.07, 0.07, 0.6, w)
    for z in (0.03, 0.57):
        p.box(0, 0.285, z, 0.6, 0.05, 0.06, w); p.box(0, -0.285, z, 0.6, 0.05, 0.06, w); p.box(0.285, 0, z, 0.05, 0.6, 0.06, w); p.box(-0.285, 0, z, 0.05, 0.6, 0.06, w)
    return p, 0.6
def bench():
    p = Prop('bench'); w = 0x6b4a2d
    p.box(0, 0, 0.45, 1.6, 0.4, 0.06, w); p.box(0, -0.17, 0.78, 1.6, 0.05, 0.3, w)
    for sx in (-0.7, 0.7):
        p.box(sx, 0.12, 0.22, 0.06, 0.06, 0.44, 0x3a3028); p.box(sx, -0.12, 0.22, 0.06, 0.06, 0.44, 0x3a3028); p.box(sx, -0.19, 0.6, 0.06, 0.06, 0.55, 0x3a3028)
    return p, 0.9
def pipes():
    p = Prop('pipes'); r = 0.09
    for i, (y, z, col) in enumerate([(-0.1, r, 0x6a4a38), (0.1, r, 0x5a5a60), (0.0, r * 2.6, 0x7a5030)]): p.cyl(0.0, y, z, r, r, 1.8 - i * 0.15, col, axis='X', segs=10)
    p.cyl(0.9, -0.1, r, r * 1.25, r * 1.25, 0.08, 0x2a2a30, axis='X', segs=10); return p, 0.3
def debris():
    p = Prop('debris'); R = p.rng
    for i in range(11):
        a = R.random() * 6.283; d = R.random() * 0.45; s = 0.08 + R.random() * 0.22
        p.box(math.cos(a) * d, math.sin(a) * d, s * 0.45, s * 1.4, s, s * 0.9, [0x6a6a6e, 0x5a5a5e, 0x7a7670][i % 3], rz=R.random() * 3, rx=(R.random() - 0.5) * 0.5, ry=(R.random() - 0.5) * 0.5)
    for i in range(2): p.cyl(0.1 * i, -0.1 + 0.2 * i, 0.32, 0.012, 0.012, 0.75, 0x6a3a22, segs=6)
    return p, 0.4
def bucket():
    p = Prop('bucket'); p.cyl(0, 0, 0.15, 0.2, 0.17, 0.3, 0x4a5a62, segs=12); p.cyl(0, 0, 0.307, 0.17, 0.17, 0.01, 0x1a1a1c, segs=12); return p, 0.3
def chair():
    p = Prop('chair'); w = 0x5e4528
    p.box(0, 0, 0.45, 0.42, 0.42, 0.05, w)
    for sx, sy in ((-1, -1), (1, -1), (1, 1)): p.box(sx * 0.18, sy * 0.18, 0.22, 0.04, 0.04, 0.44, 0x3a2a1c)
    p.box(0, -0.2, 0.75, 0.4, 0.04, 0.5, w, rx=-0.18); return p, 0.95
def shelf():
    p = Prop('shelf'); m = 0x55575c
    for sx in (-0.48, 0.48):
        for sy in (-0.16, 0.16): p.box(sx, sy, 0.55, 0.04, 0.04, 1.1, m)
    for z in (0.12, 0.55, 1.08): p.box(0, 0, z, 1.0, 0.36, 0.03, 0x6a6258)
    p.box(-0.2, 0, 0.7, 0.28, 0.2, 0.2, 0x7a5a3a); return p, 1.1
def cart():
    p = Prop('cart'); m = 0x7a7c80
    p.box(0, 0, 0.8, 0.9, 0.5, 0.04, m); p.box(0, 0, 0.28, 0.82, 0.46, 0.03, m)
    for sx in (-0.4, 0.4):
        for sy in (-0.22, 0.22): p.box(sx, sy, 0.45, 0.03, 0.03, 0.7, 0x3a3a40); p.cyl(sx, sy, 0.06, 0.06, 0.06, 0.04, 0x1a1a1c, axis='Y', segs=10)
    p.box(0.45, 0, 1.0, 0.03, 0.5, 0.35, m); return p, 1.1

BUILD = [barrel, crate, bench, pipes, debris, bucket, chair, shelf, cart]
def main():
    args = [a for a in sys.argv[1:] if not a.startswith('-') and not a.endswith('.py')]
    out = args[-1] if args else os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'assets', 'props')
    os.makedirs(out, exist_ok=True)
    bpy.ops.wm.read_factory_settings(use_empty=True); objs = []
    for i, fn in enumerate(BUILD):
        p, h = fn(); ob = p.finish(h); ob.location.x = i * 2.5; objs.append(ob)
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs: o.select_set(True)
    path = os.path.join(out, 'props.glb')
    bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', use_selection=True, export_animations=False, export_skins=False, export_yup=True, export_apply=True,
                              export_vertex_color='ACTIVE', export_active_vertex_color_when_no_material=True, export_image_format='NONE', export_cameras=False, export_lights=False)
    for o in objs: print(o.name, len(o.data.polygons), 'trójkątów')
    print('zapisano', path, os.path.getsize(path), 'B')
main()
