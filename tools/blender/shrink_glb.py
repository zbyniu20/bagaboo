# Zmniejsza plik GLB bez zewnętrznych narzędzi i bez rozszerzeń glTF: wagi kości (WEIGHTS_0) z 4 floatów na 4 znormalizowane bajty, kolory wierzchołków (COLOR_0)
# z float albo 16 bitów na znormalizowane bajty. Reszta danych bez zmian; wynik wczytuje zwykły GLTFLoader (rdzeń glTF dopuszcza te typy).
import json, struct, sys
import numpy as np

CT = {5120: np.int8, 5121: np.uint8, 5122: np.int16, 5123: np.uint16, 5125: np.uint32, 5126: np.float32}
NUM = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4, 'MAT4': 16}

def read_glb(path):
    b = open(path, 'rb').read(); assert b[:4] == b'glTF'
    jl = struct.unpack('<I', b[12:16])[0]; j = json.loads(b[20:20 + jl]); off = 20 + jl
    bl = struct.unpack('<I', b[off:off + 4])[0]; return j, b[off + 8:off + 8 + bl]

def shrink(path):
    j, bin_ = read_glb(path); before = len(open(path, 'rb').read())
    conv = {}   # indeks accessora -> (nowy componentType, normalized, dane)
    for m in j.get('meshes', []):
        for p in m['primitives']:
            for name in ('COLOR_0', 'WEIGHTS_0'):
                if name not in p['attributes']: continue
                ai = p['attributes'][name]; a = j['accessors'][ai]; bv = j['bufferViews'][a['bufferView']]
                if bv.get('byteStride') or a.get('sparse') or ai in conv: continue
                n = NUM[a['type']]; raw = np.frombuffer(bin_, CT[a['componentType']], count=a['count'] * n, offset=bv.get('byteOffset', 0) + a.get('byteOffset', 0)).reshape(a['count'], n)
                if a['componentType'] == 5126: conv[ai] = (5121, True, np.clip(np.rint(raw * 255.0), 0, 255).astype(np.uint8))
                elif a['componentType'] == 5123 and a.get('normalized'): conv[ai] = (5121, True, np.rint(raw / 257.0).astype(np.uint8))
    if not conv: return before, before
    # nowy bufor: widoki w kolejności; widoki zastąpionych accessorów dostają nowe dane, reszta kopiuje bajty
    repl = {a_bv: ai for ai in conv for a_bv in [j['accessors'][ai]['bufferView']]}
    out = bytearray(); newviews = []
    for i, bv in enumerate(j['bufferViews']):
        data = conv[repl[i]][2].tobytes() if i in repl else bin_[bv.get('byteOffset', 0):bv.get('byteOffset', 0) + bv['byteLength']]
        while len(out) % 4: out.append(0)
        nv = {k: v for k, v in bv.items() if k not in ('byteOffset', 'byteLength')}; nv['buffer'] = 0; nv['byteOffset'] = len(out); nv['byteLength'] = len(data); newviews.append(nv); out += data
    while len(out) % 4: out.append(0)
    for ai, (ct, normalized, _) in conv.items():
        a = j['accessors'][ai]; a['componentType'] = ct; a['byteOffset'] = 0
        if normalized: a['normalized'] = True
        a.pop('min', None); a.pop('max', None)
    j['bufferViews'] = newviews; j['buffers'][0]['byteLength'] = len(out)
    js = json.dumps(j, separators=(',', ':')).encode()
    while len(js) % 4: js += b' '
    glb = b'glTF' + struct.pack('<II', 2, 12 + 8 + len(js) + 8 + len(out)) + struct.pack('<I', len(js)) + b'JSON' + js + struct.pack('<I', len(out)) + b'BIN\x00' + bytes(out)
    open(path, 'wb').write(glb); return before, len(glb)

if __name__ == '__main__':
    for p in sys.argv[1:]: a, b = shrink(p); print('%s: %d -> %d KB' % (p, a // 1024, b // 1024))
