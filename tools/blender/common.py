# Wspólne funkcje skryptów Blendera (modele awatara BagaBoo). Uruchamianie: python3 -m venv v && v/bin/pip install bpy && v/bin/python skrypt.py
# Układ współrzędnych: model patrzy w stronę +Y Blendera (po eksporcie do glTF to -Z gry), górą jest +Z (w grze +Y), jednostki to metry.
import bpy, math, bmesh
from mathutils import Vector

def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)

def metaball(elements, name='mb', resolution=0.004, threshold=0.6):
    """elements: lista (x, y, z, rx, ry, rz, stiffness). Zwraca obiekt siatki po konwersji."""
    mb = bpy.data.metaballs.new(name); mb.resolution = resolution; mb.render_resolution = resolution; mb.threshold = threshold
    ob = bpy.data.objects.new(name, mb); bpy.context.collection.objects.link(ob)
    for (x, y, z, rx, ry, rz, st) in elements:
        e = mb.elements.new(type='ELLIPSOID'); e.co = (x, y, z); e.radius = 1.0; e.size_x = rx; e.size_y = ry; e.size_z = rz; e.stiffness = st
    bpy.context.view_layer.objects.active = ob; ob.select_set(True)
    bpy.ops.object.convert(target='MESH')
    return bpy.context.view_layer.objects.active

def shade_smooth(ob):
    for p in ob.data.polygons: p.use_smooth = True

def skin_material(name, color=(0.16, 0.12, 0.10, 1), rough=0.45, bump=0.25, scale=60):
    m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree; b = nt.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = color; b.inputs['Roughness'].default_value = rough
    try: b.inputs['Subsurface Weight'].default_value = 0.08
    except KeyError: pass
    n = nt.nodes.new('ShaderNodeTexNoise'); n.inputs['Scale'].default_value = scale; n.inputs['Detail'].default_value = 8
    bm = nt.nodes.new('ShaderNodeBump'); bm.inputs['Strength'].default_value = bump
    nt.links.new(n.outputs['Fac'], bm.inputs['Height']); nt.links.new(bm.outputs['Normal'], b.inputs['Normal'])
    return m

def stage(res=(700, 700), samples=48):
    """Kamera, światła (mroczny podgląd: ciepły klucz i zimne światło z tyłu) i ustawienia Cycles CPU."""
    sc = bpy.context.scene; sc.render.engine = 'CYCLES'; sc.cycles.device = 'CPU'; sc.cycles.samples = samples
    sc.render.resolution_x, sc.render.resolution_y = res
    sc.view_settings.view_transform = 'AgX'
    w = bpy.data.worlds.new('w'); w.use_nodes = True; w.node_tree.nodes['Background'].inputs['Color'].default_value = (0.012, 0.012, 0.016, 1); sc.world = w
    def light(loc, energy, color, size=0.6):
        l = bpy.data.lights.new('l', 'AREA'); l.energy = energy; l.color = color; l.size = size
        o = bpy.data.objects.new('l', l); o.location = loc; bpy.context.collection.objects.link(o)
        d = (Vector((0, 0, 0)) - Vector(loc)); o.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
    light((0.5, 0.8, 0.45), 14, (1.0, 0.72, 0.5), 0.5); light((-0.6, -0.5, 0.4), 10, (0.45, 0.6, 1.0), 0.8); light((0.0, 0.9, -0.2), 5, (1.0, 0.8, 0.7), 0.5)
def camera(loc, target=(0, 0, 0), lens=70):
    c = bpy.data.cameras.new('c'); c.lens = lens; o = bpy.data.objects.new('c', c); o.location = loc; bpy.context.collection.objects.link(o)
    o.rotation_euler = (Vector(target) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler(); bpy.context.scene.camera = o
def render(path): bpy.context.scene.render.filepath = path; bpy.ops.render.render(write_still=True)

def add_mesh(name, v, f, mat=None, smooth=True):
    import numpy as np
    me = bpy.data.meshes.new(name); me.from_pydata(np.asarray(v).tolist(), [], np.asarray(f).tolist()); me.update()
    ob = bpy.data.objects.new(name, me); bpy.context.collection.objects.link(ob)
    if smooth: shade_smooth(ob)
    if mat is not None: ob.data.materials.append(mat)
    return ob

def tufts(v, f, count, mask, length=(0.03, 0.06), radius=0.006, seed=1, down=0.45, up=0.0):
    """kępy sierści jako małe ostrosłupy (3 ściany) rozsiane po powierzchni siatki (v, f); mask(p, n) -> prawdopodobieństwo 0..1.
    Zwraca (wierzchołki, ściany, kolory wierzchołków: ciemna nasada i jaśniejszy czubek)."""
    import numpy as np
    rng = np.random.default_rng(seed); v = np.asarray(v, np.float32); f = np.asarray(f)
    a, b, c = v[f[:, 0]], v[f[:, 1]], v[f[:, 2]]; cr = np.cross(b - a, c - a); area = np.linalg.norm(cr, axis=1) / 2; nrm = cr / (np.linalg.norm(cr, axis=1)[:, None] + 1e-12)
    idx = rng.choice(len(f), size=count * 3, p=area / area.sum()); r1, r2 = rng.random(len(idx)), rng.random(len(idx)); s = np.sqrt(r1)
    p = a[idx] * (1 - s)[:, None] + b[idx] * (s * (1 - r2))[:, None] + c[idx] * (s * r2)[:, None]; n = nrm[idx]
    keep = rng.random(len(idx)) < np.array([mask(p[i], n[i]) for i in range(len(idx))]); p, n = p[keep][:count], n[keep][:count]
    L = rng.uniform(length[0], length[1], len(p)); dirv = n * 0.55 + np.array([0, 0, -down + up]) + rng.normal(0, 0.25, (len(p), 3))
    dirv /= np.linalg.norm(dirv, axis=1)[:, None]; tip = p + dirv * L[:, None]
    t1 = np.cross(dirv, np.array([0.3, 0.2, 1.0])); t1 /= np.linalg.norm(t1, axis=1)[:, None] + 1e-9; t2 = np.cross(dirv, t1)
    ang = [0, 2.094, 4.189]; base = [p + (t1 * math.cos(q) + t2 * math.sin(q)) * radius for q in ang]
    n_ = len(p); verts = np.concatenate([base[0], base[1], base[2], tip]); i = np.arange(n_)
    faces = np.concatenate([np.stack([i, i + n_, i + 3 * n_], 1), np.stack([i + n_, i + 2 * n_, i + 3 * n_], 1), np.stack([i + 2 * n_, i, i + 3 * n_], 1)])
    cols = np.concatenate([np.full((3 * n_, 4), (0.02, 0.018, 0.016, 1)), np.tile(np.array([0.1, 0.085, 0.07, 1]), (n_, 1)) * rng.uniform(0.6, 1.4, (n_, 1))]); cols[:, 3] = 1
    return verts, faces, cols

def fur_object(name, v, f, cols, mat):
    ob = add_mesh(name, v, f, mat, smooth=False)
    ca = ob.data.color_attributes.new('Col', 'FLOAT_COLOR', 'POINT')
    for i, c in enumerate(cols): ca.data[i].color = tuple(c)
    return ob

def fur_material(name='fur', rough=0.8):
    m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree; b = nt.nodes['Principled BSDF']
    at = nt.nodes.new('ShaderNodeAttribute'); at.attribute_name = 'Col'
    nt.links.new(at.outputs['Color'], b.inputs['Base Color']); b.inputs['Roughness'].default_value = rough
    return m

def emission(name, color, strength=8):
    m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree
    for n in list(nt.nodes):
        if n.type != 'OUTPUT_MATERIAL': nt.nodes.remove(n)
    e = nt.nodes.new('ShaderNodeEmission'); e.inputs['Color'].default_value = color; e.inputs['Strength'].default_value = strength
    nt.links.new(e.outputs['Emission'], nt.nodes['Material Output'].inputs['Surface']); return m

def flesh_material(name, base=(0.075, 0.06, 0.055, 1), rough=0.4, bump=0.35, blood=None, pore=90):
    """skóra: wariacje koloru (szum), pory i zmarszczki (voronoi i szum jako nierówność), opcjonalnie zakrwawienie w strefie blood=(oś, od, do, siła)."""
    m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree; b = nt.nodes['Principled BSDF']; N = nt.nodes; L = nt.links
    tc = N.new('ShaderNodeTexCoord'); no = N.new('ShaderNodeTexNoise'); no.inputs['Scale'].default_value = 14; no.inputs['Detail'].default_value = 6
    L.new(tc.outputs['Object'], no.inputs['Vector']) if hasattr(L, 'new') else None
    cr = N.new('ShaderNodeValToRGB'); cr.color_ramp.elements[0].color = (base[0] * 0.5, base[1] * 0.5, base[2] * 0.5, 1); cr.color_ramp.elements[1].color = (base[0] * 1.9, base[1] * 1.6, base[2] * 1.5, 1)
    L.new(no.outputs['Fac'], cr.inputs['Fac'])
    vo = N.new('ShaderNodeTexVoronoi'); vo.inputs['Scale'].default_value = pore; vo.feature = 'DISTANCE_TO_EDGE'; L.new(tc.outputs['Object'], vo.inputs['Vector'])
    n2 = N.new('ShaderNodeTexNoise'); n2.inputs['Scale'].default_value = 220; n2.inputs['Detail'].default_value = 3; L.new(tc.outputs['Object'], n2.inputs['Vector'])
    mx = N.new('ShaderNodeMath'); mx.operation = 'ADD'; L.new(vo.outputs['Distance'], mx.inputs[0]); L.new(n2.outputs['Fac'], mx.inputs[1])
    bm = N.new('ShaderNodeBump'); bm.inputs['Strength'].default_value = bump; bm.inputs['Distance'].default_value = 0.01; L.new(mx.outputs['Value'], bm.inputs['Height'])
    L.new(bm.outputs['Normal'], b.inputs['Normal']); b.inputs['Roughness'].default_value = rough
    out = cr.outputs['Color']
    if blood:
        axis, lo, hi, amt = blood; sp = N.new('ShaderNodeSeparateXYZ'); L.new(tc.outputs['Object'], sp.inputs['Vector'])
        mr = N.new('ShaderNodeMapRange'); mr.inputs['From Min'].default_value = lo; mr.inputs['From Max'].default_value = hi; mr.inputs['To Min'].default_value = 0; mr.inputs['To Max'].default_value = amt
        L.new(sp.outputs[axis], mr.inputs['Value'])
        nb = N.new('ShaderNodeTexNoise'); nb.inputs['Scale'].default_value = 18; nb.inputs['Detail'].default_value = 5; L.new(tc.outputs['Object'], nb.inputs['Vector'])
        mul = N.new('ShaderNodeMath'); mul.operation = 'MULTIPLY'; L.new(mr.outputs['Result'], mul.inputs[0]); L.new(nb.outputs['Fac'], mul.inputs[1])
        cl = N.new('ShaderNodeMath'); cl.operation = 'MULTIPLY'; cl.inputs[1].default_value = 2.2; L.new(mul.outputs['Value'], cl.inputs[0])
        mc = N.new('ShaderNodeMix'); mc.data_type = 'RGBA'; mc.inputs['B'].default_value = (0.18, 0.005, 0.005, 1); L.new(cl.outputs['Value'], mc.inputs['Factor']); L.new(out, mc.inputs['A']); out = mc.outputs['Result']
        L.new(cl.outputs['Value'], b.inputs['Roughness']) if False else None
    L.new(out, b.inputs['Base Color'])
    return m
