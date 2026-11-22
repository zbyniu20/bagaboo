# Modelowanie funkcją odległości (SDF) w numpy: łączenie i wycinanie kształtów z kontrolą gładkości, siatka z marching cubes.
# Dzięki temu da się budować organiczne kształty (czaszka, żuchwa, ręka) deterministycznie, bez rzeźbienia ręcznego.
import numpy as np
from skimage import measure

class Grid:
    def __init__(self, lo, hi, step):
        self.lo, self.hi, self.step = np.array(lo, float), np.array(hi, float), step
        ax = [np.arange(l, h + step, step, dtype=np.float32) for l, h in zip(lo, hi)]
        self.X, self.Y, self.Z = np.meshgrid(*ax, indexing='ij', sparse=True)
        self.shape = (len(ax[0]), len(ax[1]), len(ax[2]))
    def mesh(self, vol, level=0.0):
        v, f, n, _ = measure.marching_cubes(vol, level=level, spacing=(self.step,) * 3)
        v = v + self.lo.astype(np.float32); return v, f[:, ::-1]   # kolejność ścian odwrócona: normalne na zewnątrz

def ell(g, c, r, rot=None):
    """przybliżona odległość do elipsoidy o środku c i półosiach r (znak: wnętrze ujemne)."""
    x, y, z = g.X - c[0], g.Y - c[1], g.Z - c[2]
    q = np.sqrt((x / r[0]) ** 2 + (y / r[1]) ** 2 + (z / r[2]) ** 2)
    return ((q - 1.0) * min(r)).astype(np.float32)

def smin(a, b, k):
    if k <= 0: return np.minimum(a, b)
    h = np.clip(0.5 + 0.5 * (b - a) / k, 0, 1); return (b * (1 - h) + a * h - k * h * (1 - h)).astype(np.float32)
def smax(a, b, k): return -smin(-a, -b, k)
def sub(a, b, k=0.0): return smax(a, -b, k)             # a minus b
def plane_z(g, z0, up=True): return ((g.Z - z0) * (-1 if up else 1) + 0 * g.Y + 0 * g.X).astype(np.float32)
