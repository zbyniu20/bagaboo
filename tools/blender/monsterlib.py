# Biblioteka do modelowania potworów BagaBoo w Blenderze bez okna (moduł bpy): szkielet -> siatka (modyfikator Skin) -> dodatki (zęby, rogi, oczy)
# -> wagi -> kolory wierzchołków (brud, krew) -> animacje (idle, walk, run, attack) -> eksport GLB do assets/monsters/.
# Układ współrzędnych w przepisach: potwór patrzy w +Y, góra to +Z, jednostki to metry. Biblioteka odwraca Y (P), więc w pliku GLB przód jest w +Z gry.
# Uruchamianie: python3 -m venv v && v/bin/pip install bpy numpy && v/bin/python tools/blender/monsters.py [nazwa ...]
import bpy, math, random
from mathutils import Vector

def P(x, y, z): return Vector((x, -y, z))   # przepis (przód +Y) -> Blender (przód -Y = +Z w glTF)

def reset(): bpy.ops.wm.read_factory_settings(use_empty=True)

# ---------- prymitywy (zwracają (wierzchołki, ściany) w przestrzeni przepisu; P stosuje się przy dodawaniu) ----------
def _basis(axis):
    a = Vector(axis).normalized(); t = Vector((0, 0, 1)) if abs(a.z) < 0.9 else Vector((1, 0, 0))
    u = a.cross(t).normalized(); v = a.cross(u).normalized(); return a, u, v
def ellipsoid(c, r, seg=8, rings=5):
    v, f = [], []
    v.append(Vector(c) + Vector((0, 0, r[2])))
    for i in range(1, rings):
        th = math.pi * i / rings
        for j in range(seg):
            ph = 2 * math.pi * j / seg; v.append(Vector(c) + Vector((r[0] * math.sin(th) * math.cos(ph), r[1] * math.sin(th) * math.sin(ph), r[2] * math.cos(th))))
    v.append(Vector(c) - Vector((0, 0, r[2])))
    last = len(v) - 1
    for j in range(seg): f.append((0, 1 + j, 1 + (j + 1) % seg))
    for i in range(rings - 2):
        for j in range(seg):
            a = 1 + i * seg + j; b = 1 + i * seg + (j + 1) % seg; f.append((a, a + seg, b + seg)); f.append((a, b + seg, b))
    base = 1 + (rings - 2) * seg
    for j in range(seg): f.append((last, base + (j + 1) % seg, base + j))
    return v, f
def frustum(b, t, r0, r1=0.0, seg=6):
    ax, u, w = _basis(Vector(t) - Vector(b)); v, f = [], []
    for k, (p, r) in enumerate(((Vector(b), r0), (Vector(t), r1))):
        for j in range(seg):
            ph = 2 * math.pi * j / seg; v.append(p + (u * math.cos(ph) + w * math.sin(ph)) * r)
    for j in range(seg): a, b2 = j, (j + 1) % seg; f.append((a, b2, seg + b2)); f.append((a, seg + b2, seg + a))
    v.append(Vector(b)); v.append(Vector(t)); cb, ct = len(v) - 2, len(v) - 1
    for j in range(seg): f.append((cb, (j + 1) % seg, j)); f.append((ct, seg + j, seg + (j + 1) % seg))
    return v, f
def tube(pts, r0, r1, seg=5):
    """rura wzdłuż łamanej (rogi, ogon, macki): promień od r0 do r1."""
    v, f = [], []; n = len(pts)
    for i, p in enumerate(pts):
        d = (Vector(pts[min(i + 1, n - 1)]) - Vector(pts[max(i - 1, 0)])); ax, u, w = _basis(d if d.length > 1e-6 else (0, 0, 1)); r = r0 + (r1 - r0) * i / max(1, n - 1)
        for j in range(seg):
            ph = 2 * math.pi * j / seg; v.append(Vector(p) + (u * math.cos(ph) + w * math.sin(ph)) * r)
    for i in range(n - 1):
        for j in range(seg):
            a = i * seg + j; b = i * seg + (j + 1) % seg; f.append((a, b, b + seg)); f.append((a, b + seg, a + seg))
    v.append(Vector(pts[-1])); f.extend((len(v) - 1, (n - 1) * seg + (j + 1) % seg, (n - 1) * seg + j) for j in range(seg))
    return v, f
def box(c, s):
    x, y, z = [q / 2 for q in s]; cx, cy, cz = c
    v = [Vector((cx + sx * x, cy + sy * y, cz + sz * z)) for sx in (-1, 1) for sy in (-1, 1) for sz in (-1, 1)]
    f = [(0, 1, 3, 2), (4, 6, 7, 5), (0, 4, 5, 1), (2, 3, 7, 6), (0, 2, 6, 4), (1, 5, 7, 3)]
    return v, [tuple(q) for q in f]
def cloth_cone(top, bottom_z, r_top, r_bot, seg=10, jag=0.0, rng=None, ry=1.0):
    """spódnica/całun: stożek ze zębatym dolnym brzegiem (jag)."""
    v, f = [], []; rng = rng or random.Random(1)
    for ring, (z, r) in enumerate(((top[2], r_top), (bottom_z, r_bot))):
        for j in range(seg):
            ph = 2 * math.pi * j / seg; zz = z - (rng.random() * jag if ring == 1 and j % 2 else 0)
            v.append(Vector((top[0] + math.cos(ph) * r, top[1] + math.sin(ph) * r * ry, zz)))
    for j in range(seg): a, b = j, (j + 1) % seg; f.append((a, b, seg + b, seg + a))
    return v, f

# ---------- model ----------
class Monster:
    def __init__(self, name, seed=1):
        self.name = name; self.rng = random.Random(seed); self.bones = {}; self.order = []; self.shapes = []; self.mats = {}; self.mat_ids = {}; self.dirt = 0.5; self.blood = 0.0; self.bruise = 0.0; self.skin_mat = 'skin'
    # material: kolor bazowy, chropowatość, emisja
    def material(self, key, color, rough=0.6, emit=None, strength=0.0, metal=0.0):
        self.mats[key] = dict(color=color, rough=rough, emit=emit, strength=strength, metal=metal); return key
    def bone(self, name, parent, tail, r=0.05, head=None, role=None, skin=True, rh=None):
        """tail: punkt końca kości; head domyślnie = koniec rodzica. r: promień (rx, ry) lub liczba na końcu kości; rh: promień w nasadzie (korzeń)."""
        h = head if head is not None else (self.bones[parent]['tail'] if parent else (0, 0, 0))
        r = (r, r) if isinstance(r, (int, float)) else tuple(r)
        self.bones[name] = dict(parent=parent, head=Vector(h), tail=Vector(tail), r=r, rh=rh, role=role or name, skin=skin); self.order.append(name)
    def add(self, shape, bone, mat, tint=None):
        v, f = shape; self.shapes.append(dict(v=[Vector(p) for p in v], f=f, bone=bone, mat=mat, tint=tint))
    # --- gotowe dodatki ---
    def eye(self, bone, c, r, mat='eye'): self.add(ellipsoid(c, (r, r * 0.8, r), 8, 5), bone, mat)
    def teeth(self, bone, center, width, n, length, row_y=0.0, down=True, mat='tooth', lean=0.0, rr=0.008, smile=0.0, ycb=None):
        for i in range(n):
            t = i / max(1, n - 1) - 0.5; x = center[0] + t * width * 2; curve = (abs(t) * 2) ** 2 * 0.02
            big = 1.0 + (0.9 if i % 3 == 1 else 0.0) + self.rng.random() * 0.4; ln = length * big * (1 - abs(t) * 0.5)
            zz = center[2] + (abs(t) * 2) ** 2 * smile; yy = (ycb(x, zz) if ycb else None); b = Vector((x, (yy if yy is not None else center[1] - curve) + row_y, zz)); tip = b + Vector((0, lean, -ln if down else ln))
            self.add(frustum(b, tip, rr, 0.0, 4), bone, mat)
    def claws(self, bone, base, n, spread, length, mat='claw', fwd=(0, 0.6, -0.8)):
        for i in range(n):
            t = i / max(1, n - 1) - 0.5; b = Vector(base) + Vector((t * spread, 0, 0)); d = Vector(fwd).normalized() * length * (1 + self.rng.random() * 0.3)
            self.add(frustum(b, b + d + Vector((t * 0.04, 0, 0)), 0.011, 0.0, 4), bone, mat)
    def horn(self, bone, base, pts_off, r0, r1, mat='bone', seg=5):
        pts = [Vector(base) + Vector(o) for o in pts_off]; self.add(tube(pts, r0, r1, seg), bone, mat)
    def joint(self, bone, c, r, mat='joint'): self.add(ellipsoid(c, (r, r, r), 7, 4), bone, mat)

    # --- budowa ---
    def skin(self, subsurf=1, smooth=0.9):
        """siatka ze Skin + wagi + kolory skóry; po wywołaniu można pytać o powierzchnię (front) i dopasowywać do niej dodatki."""
        if getattr(self, '_skin', None): return
        names = [n for n in self.order if self.bones[n]['skin']]; verts = []; edges = []; radii = []
        def vid(p):
            for i, q in enumerate(verts):
                if (q - p).length < 1e-5: return i
            verts.append(p.copy()); radii.append((0.03, 0.03)); return len(verts) - 1
        for n in names:
            b = self.bones[n]; a = vid(b['head']); c = vid(b['tail']); edges.append((a, c)); radii[c] = b['r']
            if b['rh'] is not None: radii[a] = (b['rh'], b['rh']) if isinstance(b['rh'], (int, float)) else tuple(b['rh'])
            elif b['parent'] is None or not self.bones[b['parent']]['skin']: radii[a] = b['r']
        me = bpy.data.meshes.new('skel'); me.from_pydata([tuple(P(*p)) for p in verts], edges, []); me.update()
        ob = bpy.data.objects.new('skel', me); bpy.context.collection.objects.link(ob)
        bpy.context.view_layer.objects.active = ob
        md = ob.modifiers.new('skin', 'SKIN'); md.branch_smoothing = smooth; md.use_smooth_shade = True
        sv = me.skin_vertices[0].data
        for i, r in enumerate(radii): sv[i].radius = (r[0], r[1])
        roots = set(vid(self.bones[n]['head']) for n in names if self.bones[n]['parent'] is None or not self.bones[self.bones[n]['parent']]['skin'])
        for i in roots: sv[i].use_root = True
        ss = ob.modifiers.new('sub', 'SUBSURF'); ss.levels = subsurf; ss.render_levels = subsurf
        dg = bpy.context.evaluated_depsgraph_get(); ev = ob.evaluated_get(dg); em = ev.to_mesh()
        sk_v = [v.co.copy() for v in em.vertices]; sk_f = [tuple(p.vertices) for p in em.polygons]; sk_n = [v.normal.copy() for v in em.vertices]
        ev.to_mesh_clear(); bpy.data.objects.remove(ob); bpy.data.meshes.remove(me)
        segs = [(n, P(*self.bones[n]['head']), P(*self.bones[n]['tail'])) for n in self.order if self.bones[n]['skin']]
        def dist_seg(p, a, b):
            ab = b - a; t = max(0.0, min(1.0, (p - a).dot(ab) / max(ab.length_squared, 1e-9))); return (p - (a + ab * t)).length
        weights = []
        for p in sk_v:
            ds = sorted(((dist_seg(p, a, b), n) for n, a, b in segs))[:2]; w = [1.0 / (d + 0.02) ** 2 for d, _ in ds]; sm = sum(w); weights.append([(ds[i][1], w[i] / sm) for i in range(len(ds)) if w[i] / sm > 0.04])
        rng = self.rng; ph = [rng.random() * 6 for _ in range(10)]
        def noise(p, k=1.0, o=0):
            return (math.sin(p.x * 17 * k + ph[o]) * math.sin(p.y * 13 * k + ph[o + 1]) + math.sin(p.z * 21 * k + ph[o + 2]) * math.sin(p.x * 9 * k + ph[o + 3]) + math.sin((p.y + p.z) * 29 * k + ph[o + 4]) * 0.6) / 2.6 * 0.5 + 0.5
        cols = []
        for i, p in enumerate(sk_v):
            n1 = noise(p); n2 = noise(Vector((p.x * 2.1 + 3, p.y * 2.1, p.z * 2.1 + 5)), 1.0, 5); n3 = noise(p, 1.7, 0)
            ao = 0.72 + 0.28 * max(0.0, min(1.0, sk_n[i].z * 0.5 + 0.55))   # spody i zagłębienia ciemniejsze
            dirt = (1.0 - self.dirt * (0.45 * n1 + 0.3 * max(0, 0.55 - p.z * 0.25))) * ao; c = [dirt, dirt, dirt]
            if self.bruise > 0 and n3 > 1.0 - self.bruise:   # siniaki: fioletowo-zielone plamy
                k = min(1, (n3 - (1 - self.bruise)) / 0.1); c = [c[0] * (1 - 0.25 * k), c[1] * (1 - 0.45 * k), c[2] * (1 - 0.1 * k)]
            if self.blood > 0 and n2 > 1.0 - self.blood: k = min(1, (n2 - (1 - self.blood)) / 0.1); c = [c[0] * (1 - 0.3 * k), c[1] * (1 - 0.85 * k), c[2] * (1 - 0.85 * k)]
            cols.append(c)
        self._skin = dict(v=sk_v, f=sk_f, w=weights, c=cols, n=sk_n)
    def front(self, x, z, r=0.035, bone='head'):
        """współrzędna Y (przepisu, przód = +Y) powierzchni skóry bone w pobliżu (x, z); None gdy brak siatki w pobliżu."""
        for rr in (r, r * 1.6, r * 2.4, r * 3.4):   # rzadka siatka: poszerzamy okno, aż coś znajdziemy
            best = None
            for p, w in zip(self._skin['v'], self._skin['w']):
                if not w or max(w, key=lambda q: q[1])[0] != bone: continue
                y = -p.y
                if abs(p.x - x) < rr and abs(p.z - z) < rr and (best is None or y > best): best = y
            if best is not None: return best
        return None
    def at(self, bone, t, off=(0, 0, 0)):
        b = self.bones[bone]; return b['head'].lerp(b['tail'], t) + Vector(off)
    # --- dodatki grozy ---
    def spikes(self, bone, n, length, mat='bone', side=(0, -1, 0.25), r=0.014, t0=0.15, t1=0.95):
        """kolce (kręgosłup, grzbiet, stawy) wzdłuż kości, skierowane w stronę side."""
        b = self.bones[bone]; d = Vector(side).normalized()
        for i in range(n):
            t = t0 + (t1 - t0) * i / max(1, n - 1); base = self.at(bone, t) + Vector((d.x * b['r'][0], d.y * b['r'][1], d.z * b['r'][0])) * 0.9
            self.add(frustum(base, base + d * length * (0.7 + self.rng.random() * 0.6), r, 0.0, 4), bone, mat)
    def wound(self, bone, t, dirv, size=0.03, mat='dark', rim='blood'):
        """otwarta rana: ciemna wnęka z czerwoną obwódką na powierzchni kości."""
        b = self.bones[bone]; d = Vector(dirv).normalized(); c = self.at(bone, t) + Vector((d.x * b['r'][0], d.y * b['r'][1], d.z * b['r'][0])) * 0.88
        sx, sz = (size * 1.4, size * 1.4); self.add(ellipsoid(c, (sx, 0.011, sz), 8, 4), bone, rim); self.add(ellipsoid(c + d * 0.006, (size, 0.009, size * 0.9), 8, 4), bone, mat)   # płaska rana: nie wystaje jak guz
    def stitches(self, bone, t, dirv, length=0.12, n=5, mat='thread', vertical=True):
        """zszycie: wzdłużna nić z poprzecznymi ściegami."""
        b = self.bones[bone]; d = Vector(dirv).normalized(); c = self.at(bone, t) + Vector((d.x * b['r'][0], d.y * b['r'][1], d.z * b['r'][0])) * 0.97
        ax = Vector((0, 0, 1)) if vertical else Vector((1, 0, 0)); pe = d.cross(ax).normalized()
        self.add(tube([c - ax * length / 2, c + ax * length / 2], 0.0035, 0.0035, 3), bone, mat)
        for i in range(n):
            q = c + ax * (length * (i / max(1, n - 1) - 0.5)); self.add(tube([q - pe * 0.02, q + pe * 0.02], 0.0032, 0.0032, 3), bone, mat)
    def tongue(self, bone, base, length, mat='blood', curl=0.25, width=0.012):
        pts = [Vector(base) + Vector((0, 0.0 + curl * (i / 4) ** 2 * 0.4, -length * i / 4 * (1.0 if i < 4 else 1.0))) for i in range(5)]
        self.add(tube(pts, width, width * 0.5, 4), bone, mat)
    def crack(self, bone, t, dirv, length=0.2, mat='crack', along=(0, 0, 1), r=0.0035, segs=6):
        """pęknięcie (zygzak rurką) na powierzchni kości."""
        b = self.bones[bone]; d = Vector(dirv).normalized(); c = self.at(bone, t) + Vector((d.x * b['r'][0], d.y * b['r'][1], d.z * b['r'][0])) * 0.99
        ax = Vector(along).normalized(); pe = d.cross(ax).normalized(); pts = []
        for i in range(segs):
            q = c + ax * (length * (i / (segs - 1) - 0.5)) + pe * ((self.rng.random() - 0.5) * length * 0.35); pts.append(q)
        self.add(tube(pts, r, r * 0.6, 3), bone, mat)
    def drips(self, bone, base, n, spread, length, mat='blood'):
        for i in range(n):
            x = base[0] + (i / max(1, n - 1) - 0.5) * spread; ln = length * (0.5 + self.rng.random()); b = Vector((x, base[1], base[2]))
            self.add(tube([b, b + Vector((0, 0.005, -ln))], 0.0035, 0.002, 3), bone, mat)

    def build(self, subsurf=1, smooth=0.9):
        self.skin(subsurf, smooth); sk = self._skin; sk_v, sk_f, weights, cols = sk['v'], sk['f'], sk['w'], sk['c']
        V, F, M, C, W = [], [], [], [], []
        for i, p in enumerate(sk_v): V.append(p); C.append(cols[i]); W.append(weights[i])
        F.extend(sk_f); M.extend([self.skin_mat] * len(sk_f))
        for s in self.shapes:
            vv = [P(*p) for p in s['v']]; col = s['tint'] or [1, 1, 1]; o = len(V); V.extend(vv); C.extend([col] * len(vv)); W.extend([[(s['bone'], 1.0)]] * len(vv))
            F.extend(tuple(o + i for i in fc) for fc in s['f']); M.extend([s['mat']] * len(s['f']))
        mkeys = list(dict.fromkeys(M)); me = bpy.data.meshes.new(self.name); me.from_pydata([tuple(v) for v in V], [], F); me.update()
        for k in mkeys:
            d = self.mats[k]; m = bpy.data.materials.new(self.name + '_' + k); m.use_nodes = True; b = m.node_tree.nodes['Principled BSDF']
            b.inputs['Base Color'].default_value = d['color']; b.inputs['Roughness'].default_value = d['rough']; b.inputs['Metallic'].default_value = d['metal']
            if d['emit']:
                b.inputs['Emission Color'].default_value = d['emit']; b.inputs['Emission Strength'].default_value = d['strength']
            me.materials.append(m)
        for pi, p in enumerate(me.polygons): p.material_index = mkeys.index(M[pi]); p.use_smooth = True
        ca = me.color_attributes.new('Col', 'FLOAT_COLOR', 'POINT')
        for i, c in enumerate(C): ca.data[i].color = (c[0], c[1], c[2], 1.0)
        ob = bpy.data.objects.new(self.name, me); bpy.context.collection.objects.link(ob)
        for n in self.order: ob.vertex_groups.new(name=n)
        for i, w in enumerate(W):
            for n, wt in w: ob.vertex_groups[n].add([i], wt, 'REPLACE')
        self.mesh_ob = ob; self.tris = sum(len(f) - 2 for f in F)
        return ob

    # --- szkielet i animacje ---
    def rig(self):
        arm = bpy.data.armatures.new(self.name + '_arm'); ao = bpy.data.objects.new(self.name + '_rig', arm); bpy.context.collection.objects.link(ao)
        bpy.context.view_layer.objects.active = ao; ao.select_set(True); bpy.ops.object.mode_set(mode='EDIT')
        eb = {}
        for n in self.order:
            b = self.bones[n]; e = arm.edit_bones.new(n); h, t = P(*b['head']), P(*b['tail']); e.head, e.tail = h, t
            if (t - h).length < 0.02: e.tail = h + Vector((0, 0, 0.02))
            y = (e.tail - e.head).normalized(); z = Vector((1, 0, 0)).cross(y)
            if z.length < 0.2: z = Vector((0, 1, 0)).cross(y)   # kość równoległa do X: oś obrotu wokół Y
            e.align_roll(z); eb[n] = e
        for n in self.order:
            p = self.bones[n]['parent']
            if p: eb[n].parent = eb[p]; eb[n].use_connect = (eb[p].tail - eb[n].head).length < 1e-5
        bpy.ops.object.mode_set(mode='OBJECT')
        self.rig_ob = ao; self.mesh_ob.parent = ao
        mod = self.mesh_ob.modifiers.new('arm', 'ARMATURE'); mod.object = ao
        return ao
    def clip(self, name, frames, fn, fps=24):
        """fn(pose_bones, t) ustawia rotacje (radiany) dla t w [0,1); klatki 0..frames, ostatnia = pierwsza (pętla)."""
        ao = self.rig_ob; ao.animation_data_create(); act = bpy.data.actions.new(name); ao.animation_data.action = act
        for pb in ao.pose.bones: pb.rotation_mode = 'XYZ'
        step = max(1, frames // 12)   # klucz co kilka klatek (ok. 12 na cykl): gładkie krzywe, a plik mniejszy o połowę; ostatnia klatka = pierwsza (pętla)
        fl = list(range(0, frames, step)) + [frames]
        for f in fl:
            t = (f % frames) / frames; fn(ao.pose.bones, t)
            for pb in ao.pose.bones:
                pb.keyframe_insert('rotation_euler', frame=f + 1)   # położenia kości nie animujemy: kanał 'location' tylko puchł w pliku
            for pb in ao.pose.bones: pb.rotation_euler = (0, 0, 0); pb.location = (0, 0, 0)
        act.use_fake_user = True
        tr = ao.animation_data.nla_tracks.new(); tr.name = name; st = tr.strips.new(name, 1, act); st.name = name
        ao.animation_data.action = None
        return act
    def export(self, path):
        for o in bpy.context.scene.objects: o.select_set(False)
        self.mesh_ob.select_set(True); self.rig_ob.select_set(True)
        bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', use_selection=True, export_animations=True, export_animation_mode='NLA_TRACKS', export_skins=True,
                                  export_yup=True, export_apply=False, export_vertex_color='ACTIVE', export_active_vertex_color_when_no_material=True, export_image_format='NONE',
                                  export_optimize_animation_size=True, export_frame_step=2)

# ---------- standardowe animacje dla humanoidów (kości z rolami; obrót wokół osi X kości = wahnięcie przód/tył, ujemny kąt = do przodu) ----------
def humanoid_clips(m, walk=0.55, run=1.0, arm_walk=0.35, arm_run=0.9, knee=0.9, lean_run=0.35, idle_sway=0.04, twitch=0.0, head_roll=0.0):
    R = lambda pb, n: pb.get(n)
    def setx(pb, n, a, y=0.0, z=0.0):
        b = pb.get(n)
        if b: b.rotation_euler = (a, y, z)
    def legs(pb, ph, amp, kn):
        for side, s in (('L', 1), ('R', -1)):
            a = math.sin(ph + (0 if side == 'L' else math.pi)); setx(pb, 'thigh' + side, -amp * a); setx(pb, 'calf' + side, kn * max(0.0, math.sin(ph + (0 if side == 'L' else math.pi) + 0.9)) )
            setx(pb, 'upperarm' + side, amp * 0.0 + 0)
    def gait(amp_leg, amp_arm, kn, lean):
        def fn(pb, t):
            ph = t * 2 * math.pi
            for side in ('L', 'R'):
                a = math.sin(ph + (0 if side == 'L' else math.pi)); b = math.sin(ph + (math.pi if side == 'L' else 0))
                setx(pb, 'thigh' + side, -amp_leg * a); setx(pb, 'calf' + side, kn * max(0.0, math.sin(ph + (0 if side == 'L' else math.pi) + 0.9)))
                setx(pb, 'upperarm' + side, -amp_arm * b); setx(pb, 'forearm' + side, -0.25 - 0.3 * abs(amp_arm) * max(0.0, b))
            setx(pb, 'spine', -lean * 0.5 + 0.03 * math.sin(2 * ph)); setx(pb, 'chest', -lean * 0.5, 0, 0.05 * math.sin(ph)); setx(pb, 'head', lean * 0.7, 0, head_roll * math.sin(ph * 0.5))
            if pb.get('pelvis'): pb['pelvis'].rotation_euler = (0, 0, 0.05 * math.sin(ph))
        return fn
    def idle(pb, t):
        ph = t * 2 * math.pi; s = math.sin(ph)
        setx(pb, 'spine', 0.02 * s); setx(pb, 'chest', 0.03 * s, 0, idle_sway * math.sin(ph * 2)); setx(pb, 'head', -0.02 * s + twitch * max(0, math.sin(ph * 3)) ** 8, 0, head_roll + idle_sway * math.sin(ph))
        for side in ('L', 'R'): setx(pb, 'upperarm' + side, 0.04 * s); setx(pb, 'forearm' + side, -0.1 - 0.05 * s)
    def attack(pb, t):
        ph = math.sin(t * math.pi); setx(pb, 'chest', -0.2 * ph); setx(pb, 'head', 0.3 * ph)
        for side in ('L', 'R'): setx(pb, 'upperarm' + side, -1.7 * ph); setx(pb, 'forearm' + side, -0.4 * ph)
        setx(pb, 'jaw', 0.7 * ph)
    def scream(pb, t):   # głowa w tył, szeroka paszcza, ręce w górę, klatka wygięta (jednorazowy klip: gra odtwarza go, gdy potwór zauważa gracza i rusza biegiem)
        ph = math.sin(t * math.pi); setx(pb, 'chest', 0.25 * ph); setx(pb, 'head', -0.5 * ph, 0, 0.06 * math.sin(t * 28) * ph); setx(pb, 'jaw', 0.95 * ph)
        for side in ('L', 'R'): setx(pb, 'upperarm' + side, -2.5 * ph); setx(pb, 'forearm' + side, -0.25 * ph)
    def listen(pb, t):   # nasłuchiwanie: głowa przechylona i powoli skręcana na boki, klatka lekko pochylona (klip w pętli)
        ph = t * 2 * math.pi; setx(pb, 'chest', -0.1 + 0.02 * math.sin(ph)); setx(pb, 'head', 0.08, 0.45 * math.sin(ph), 0.3)
        for side in ('L', 'R'): setx(pb, 'upperarm' + side, 0.05); setx(pb, 'forearm' + side, -0.15)
    m.clip('Idle', 48, idle); m.clip('Scream', 36, scream); m.clip('Listen', 48, listen); m.clip('Walk', 24, gait(walk, arm_walk, knee, 0.05)); m.clip('Run', 16, gait(run, arm_run, knee * 1.2, lean_run)); m.clip('Attack', 24, attack)

# ---------- scena podglądowa (Cycles CPU) ----------
def new_scene(): reset()
