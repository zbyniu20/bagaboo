import sys; sys.path.insert(0, '/home/user/bagaboo/tools/blender')
from common import *
from sdf import *
OUT = sys.argv[-1] if sys.argv[-1].endswith('/') else '/tmp/'
STEP = float(__import__('os').environ.get('STEP', '0.0018'))
g = Grid((-0.17, -0.16, -0.19), (0.17, 0.2, 0.17), STEP)

def mirror_union(d, c, r, k):
    for s in (-1, 1): d = smin(d, ell(g, (s * c[0], c[1], c[2]), r), k)
    return d

# ---------- GÓRNA CZĘŚĆ GŁOWY ----------
d = ell(g, (0, -0.015, 0.02), (0.118, 0.115, 0.115))                         # czaszka
d = smin(d, ell(g, (0, -0.05, 0.088), (0.022, 0.095, 0.06)), 0.04)            # grzebień kostny na czubku (stożkowaty szczyt)
d = smin(d, ell(g, (0, -0.06, -0.01), (0.1, 0.07, 0.1)), 0.03)                # potylica
d = smin(d, ell(g, (0, 0.07, 0.05), (0.116, 0.05, 0.04)), 0.03)               # ciężki łuk brwiowy, płynnie zrośnięty z czołem
d = smin(d, ell(g, (0, 0.09, -0.04), (0.08, 0.07, 0.085)), 0.025)             # szczęka górna / środek twarzy
d = smin(d, ell(g, (0, 0.135, -0.075), (0.066, 0.045, 0.045)), 0.025)         # pysk (długa górna warga)
d = smin(d, ell(g, (0, 0.152, -0.04), (0.052, 0.024, 0.034)), 0.02)           # szeroki, płaski nos
d = mirror_union(d, (0.036, 0.146, -0.052), (0.022, 0.02, 0.02), 0.015)       # duże skrzydełka nosa
d = mirror_union(d, (0.092, 0.04, -0.03), (0.03, 0.055, 0.038), 0.02)         # kości policzkowe
d = mirror_union(d, (0.127, -0.025, 0.002), (0.011, 0.02, 0.03), 0.01)        # uszy
d = mirror_union(d, (0.083, 0.0, -0.075), (0.04, 0.07, 0.04), 0.02)           # policzki przy żuchwie
# wycięcia: głębokie oczodoły pod brwiami, szerokie nozdrza, wklęsłe skronie i policzki (wychudzony, upiorny wygląd), bruzdy
for s in (-1, 1):
    d = sub(d, ell(g, (s * 0.046, 0.112, 0.016), (0.03, 0.036, 0.026)), 0.014)
    d = sub(d, ell(g, (s * 0.02, 0.164, -0.05), (0.011, 0.024, 0.009)), 0.004)
    d = sub(d, ell(g, (s * 0.108, 0.03, -0.075), (0.03, 0.05, 0.045)), 0.02)
    d = sub(d, ell(g, (s * 0.07, 0.125, -0.082), (0.012, 0.045, 0.014)), 0.01)  # bruzdy nosowo-wargowe
    d = sub(d, ell(g, (s * 0.06, 0.11, 0.078), (0.045, 0.012, 0.008)), 0.008)   # zmarszczki nad brwiami
d = sub(d, ell(g, (0, 0.02, 0.1), (0.014, 0.1, 0.01)), 0.006)                   # blizna wzdłuż czoła
front = np.clip((g.Y - 0.02) / 0.04, 0, 1).astype(np.float32)
zcut = (-0.092 * front + -0.13 * (1 - front)).astype(np.float32)
d = smax(d, (zcut - g.Z), 0.004)
upper = d

# ---------- ŻUCHWA (osobna siatka, obracana przy mówieniu) ----------
j = ell(g, (0, 0.095, -0.122), (0.058, 0.058, 0.034))
j = smin(j, ell(g, (0, 0.132, -0.128), (0.038, 0.032, 0.028)), 0.015)          # broda
for s in (-1, 1):
    j = smin(j, ell(g, (s * 0.068, 0.0, -0.1), (0.026, 0.06, 0.04)), 0.02)     # kąty żuchwy
    j = smin(j, ell(g, (s * 0.08, -0.02, -0.07), (0.018, 0.02, 0.035)), 0.015) # gałąź żuchwy w stronę stawu
j = sub(j, ell(g, (0, 0.11, -0.095), (0.05, 0.05, 0.03)), 0.01)                # wnętrze ust (zagłębienie na zęby i język)
j = smax(j, (g.Z - (-0.087 - 0.0 * g.Y)), 0.004)                                 # górna granica: poniżej linii ust
jaw = j

for name, vol in (('upper', upper), ('jaw', jaw)):
    v, f = g.mesh(vol)
    me = bpy.data.meshes.new(name); me.from_pydata(v.tolist(), [], f.tolist()); me.update()
    ob = bpy.data.objects.new(name, me); bpy.context.collection.objects.link(ob); shade_smooth(ob)
    ob.data.materials.append(skin_material('skin' + name, color=(0.075, 0.06, 0.055, 1), rough=0.38, bump=0.12, scale=110))
    print(name, 'verts', len(v), 'tris', len(f), 'bbox', v.min(0).round(3), v.max(0).round(3))
stage((700, 700), 40)
camera((0.0, 0.7, 0.0), (0, 0.03, -0.01)); render(OUT + 'head_front.png')
camera((0.7, 0.12, 0.0), (0, 0.03, -0.01)); render(OUT + 'head_side.png')
camera((0.5, 0.5, 0.18), (0, 0.03, -0.01)); render(OUT + 'head_34.png')
