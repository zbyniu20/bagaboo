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
