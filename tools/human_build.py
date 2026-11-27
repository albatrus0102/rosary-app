# human_build.py — 반실사 아바타 묶음 만들기(오프라인, Python 3 + numpy + Pillow + fast-simplification).
# 몸 바탕: MakeHuman 1.x 기본 메시 hm08·변형 타깃·기본 뼈대 가중치(모두 CC0 1.0 — 아래 MH_RAW 에서 받아 캐시).
# 만드는 것(web/avatar/): human.bin(모든 메시) + human.json(배치) + face_<번호>.jpg(얼굴 그림 8) + 공유 질감(눈·머리카락·니트).
# 사진(소유자 참고 그림)은 붙이지 않는다 — 색·모양 수치만 눈으로 맞춘 값(AV 표)이다.
# 사용: python3 -I tools/human_build.py <캐시 폴더>      (fast_simplification 이 없으면 --pylib <폴더>)
import sys, os, json, math, struct, urllib.request
ARGS = sys.argv[1:]
if '--pylib' in ARGS:
    sys.path.insert(0, ARGS[ARGS.index('--pylib') + 1])
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
import fast_simplification as FS

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..', 'web', 'avatar')
CACHE = ARGS[0] if ARGS and not ARGS[0].startswith('--') else os.path.join(HERE, '..', '.mh_cache')
MH_RAW = 'https://raw.githubusercontent.com/makehumancommunity/makehuman/master/makehuman/data/'
RNG = np.random.default_rng(7)

def fetch(rel):
    p = os.path.join(CACHE, rel.replace('/', '__'))
    if not os.path.exists(p):
        os.makedirs(CACHE, exist_ok=True)
        with urllib.request.urlopen(MH_RAW + rel, timeout=60) as r: data = r.read()
        open(p, 'wb').write(data)
    return p

# ------------------------------------------------------------------ MakeHuman 읽기
def load_obj():
    V = []; F = []; G = []; g = None
    for line in open(fetch('3dobjs/base.obj')):
        if line.startswith('v '): V.append([float(x) for x in line.split()[1:4]])
        elif line.startswith('g '): g = line.split()[1]
        elif line.startswith('f '):
            F.append([int(s.split('/')[0]) - 1 for s in line.split()[1:]]); G.append(g)
    return np.array(V), F, G

_tcache = {}
def target(rel, n):
    if rel in _tcache: return _tcache[rel]
    d = np.zeros((n, 3))
    for line in open(fetch('targets/' + rel + '.target')):
        if line[0] == '#' or not line.strip(): continue
        a = line.split(); d[int(a[0])] += [float(a[1]), float(a[2]), float(a[3])]
    _tcache[rel] = d
    return d

def mod_target(name, v):
    """modeling modifier 이름(예 'nose/nose-scale-horiz-decr|incr')을 값 -1..1 로."""
    grp, rest = name.rsplit('/', 1)
    if '|' in rest:
        base, pair = rest.rsplit('-', 1)
        lo, hi = pair.split('|')
        return (grp + '/' + base + '-' + (hi if v > 0 else lo)), abs(v)
    return grp + '/' + rest, v

# ------------------------------------------------------------------ 우리 뼈대(avatar.js 와 같은 순서·위치)
BN = ['root', 'hips', 'spine', 'chest', 'neck', 'head', 'uaL', 'faL', 'haL', 'uaR', 'faR', 'haR', 'ulL', 'llL', 'ftL', 'ulR', 'llR', 'ftR']
BI = {n: i for i, n in enumerate(BN)}
SX, HX = 0.17, 0.095
OURS = {'hips': (0, 0.93, 0), 'spine': (0, 1.03, 0), 'chest': (0, 1.20, 0), 'neck': (0, 1.42, 0.012), 'head': (0, 1.50, 0),
        'uaL': (-SX, 1.40, 0), 'faL': (-SX, 1.11, 0), 'haL': (-SX, 0.85, 0), 'uaR': (SX, 1.40, 0), 'faR': (SX, 1.11, 0), 'haR': (SX, 0.85, 0),
        'ulL': (-HX, 0.88, 0), 'llL': (-HX, 0.49, 0), 'ftL': (-HX, 0.08, 0), 'ulR': (HX, 0.88, 0), 'llR': (HX, 0.49, 0), 'ftR': (HX, 0.08, 0)}

def map_bone(mb):
    s = 'L' if mb.endswith('.L') else ('R' if mb.endswith('.R') else '')
    n = mb.split('.')[0]
    if n in ('root', 'pelvis', 'spine05'): return [('hips', 1)]
    if n in ('spine04', 'spine03'): return [('spine', 1)]
    if n in ('spine02', 'spine01', 'breast', 'clavicle'): return [('chest', 1)]
    if n == 'shoulder01': return [('chest', 0.45), ('ua' + s, 0.55)]
    if n.startswith('neck'): return [('neck', 1)]
    if n.startswith('upperarm'): return [('ua' + s, 1)]
    if n.startswith('lowerarm'): return [('fa' + s, 1)]
    if n in ('wrist',) or n.startswith('finger') or n.startswith('metacarpal'): return [('ha' + s, 1)]
    if n.startswith('upperleg'): return [('ul' + s, 1)]
    if n.startswith('lowerleg'): return [('ll' + s, 1)]
    if n == 'foot' or n.startswith('toe'): return [('ft' + s, 1)]
    return [('head', 1)]

# ------------------------------------------------------------------ 몸 만들기
def build_body(V0, mods, sk, W):
    n = len(V0)
    V = V0.copy()
    for name, val in mods.items():
        if '/' not in name or name.startswith('macro:'): continue
        rel, w = mod_target(name, val)
        V += w * target(rel, n)
    V = V / 10.0
    V[:, 0] *= -1; V[:, 2] *= -1      # 앞 = -z, 캐릭터 왼쪽(.L) = -x
    J = lambda nm: V[sk['joints'][nm]].mean(0)
    jh = lambda b: J(sk['bones'][b]['head'])
    # 몸통: 고관절 가운데 → (0, 0.88, 0), 목 밑 → 1.42 가 되게 닮음 변환
    hipm = (jh('upperleg01.L') + jh('upperleg01.R')) / 2
    s = (1.42 - 0.88) / (jh('neck01')[1] - hipm[1])
    off = np.array([0, 0.88, 0]) - hipm * s
    Vg = V * s + off
    jg = lambda b: jh(b) * s + off
    T = {}
    I4 = np.eye(4)
    for b in ['root', 'hips', 'spine', 'chest', 'neck', 'head']: T[b] = I4
    def seg(o0, o1, j0, j1, scale_len=True):
        o0 = np.array(o0, float); o1 = np.array(o1, float)
        dm = j1 - j0; do = o1 - o0
        lm = np.linalg.norm(dm); lo = np.linalg.norm(do)
        a = dm / lm; b = do / lo
        R = rot_between(a, b)
        k = lo / lm if scale_len else 1.0
        S = np.eye(3) + (k - 1) * np.outer(a, a)   # 뼈 방향으로만 늘이기
        M = np.eye(4); M[:3, :3] = R @ S; M[:3, 3] = o0 - R @ S @ j0
        return M
    for sd in 'LR':
        T['ua' + sd] = seg(OURS['ua' + sd], OURS['fa' + sd], jg('upperarm01.' + sd), jg('lowerarm01.' + sd))
        T['fa' + sd] = seg(OURS['fa' + sd], OURS['ha' + sd], jg('lowerarm01.' + sd), jg('wrist.' + sd))
        hd = np.array(OURS['ha' + sd]) + [0, -0.1, 0]
        T['ha' + sd] = seg(OURS['ha' + sd], hd, jg('wrist.' + sd), jg('finger3-1.' + sd), False)
        T['ul' + sd] = seg(OURS['ul' + sd], OURS['ll' + sd], jg('upperleg01.' + sd), jg('lowerleg01.' + sd))
        T['ll' + sd] = seg(OURS['ll' + sd], OURS['ft' + sd], jg('lowerleg01.' + sd), jg('foot.' + sd))
        # 발: 정강이 회전을 그대로, 발목을 우리 발목에
        M = T['ll' + sd].copy(); fj = jg('foot.' + sd)
        M[:3, 3] = np.array(OURS['ft' + sd]) - M[:3, :3] @ fj
        T['ft' + sd] = M
    Vh = np.c_[Vg, np.ones(n)]
    out = np.zeros((n, 3))
    for bi, b in enumerate(BN):
        if b == 'root': continue
        w = W[:, bi]
        if not w.any(): continue
        out += w[:, None] * (Vh @ T[b].T)[:, :3]
    tot = W.sum(1)
    out[tot < 1e-6] = Vg[tot < 1e-6]
    return out, s

def rot_between(a, b):
    v = np.cross(a, b); c = float(np.dot(a, b))
    if c < -0.9999: return -np.eye(3)
    K = np.array([[0, -v[2], v[1]], [v[2], 0, -v[0]], [-v[1], v[0], 0]])
    return np.eye(3) + K + K @ K / (1 + c)

def our_weights(n, sk):
    wj = json.load(open(fetch('rigs/default_weights.mhw')))['weights']
    W = np.zeros((n, len(BN)))
    for mb, lst in wj.items():
        tgt = map_bone(mb)
        for vi, w in lst:
            for ob, f in tgt: W[vi, BI[ob]] += w * f
    s = W.sum(1); s[s == 0] = 1
    return W / s[:, None]


# ------------------------------------------------------------------ 아바타 8(번호 0..7 = F1..F4, M1..M4) — 참고 그림을 눈으로 보고 정한 수치
BASE_MODS = {
    0: {'macrodetails/asian-female-young': 1.0, 'macrodetails/proportions/female-young-averagemuscle-averageweight-idealproportions': 0.6,
        'macrodetails/universal-female-young-averagemuscle-minweight': 0.35},
    1: {'macrodetails/asian-male-young': 1.0, 'macrodetails/proportions/male-young-averagemuscle-averageweight-idealproportions': 0.6,
        'macrodetails/universal-male-young-averagemuscle-minweight': 0.25},
}
FACE_COMMON = {
    0: {'eyes/r-eye-scale-decr|incr': 0.35, 'eyes/l-eye-scale-decr|incr': 0.35, 'nose/nose-scale-horiz-decr|incr': -0.35, 'nose/nose-point-width-decr|incr': -0.4,
        'chin/chin-width-decr|incr': -0.45, 'mouth/mouth-angles-down|up': 0.6, 'mouth/mouth-scale-horiz-decr|incr': -0.15, 'head/head-oval': 0.5,
        'cheek/l-cheek-volume-decr|incr': -0.2, 'cheek/r-cheek-volume-decr|incr': -0.2, 'mouth/mouth-upperlip-volume-decr|incr': 0.25, 'mouth/mouth-lowerlip-volume-decr|incr': 0.3},
    1: {'eyes/r-eye-scale-decr|incr': 0.15, 'eyes/l-eye-scale-decr|incr': 0.15, 'nose/nose-scale-horiz-decr|incr': -0.2, 'chin/chin-width-decr|incr': -0.2,
        'mouth/mouth-angles-down|up': 0.5, 'head/head-oval': 0.4, 'cheek/l-cheek-volume-decr|incr': -0.25, 'cheek/r-cheek-volume-decr|incr': -0.25},
}
AV = [
    dict(id='F1', g=0, hair='long', hairColor=0x17120f, face={'head/head-oval': 0.7}, outfit=dict(card=0xe6d9bf, rib=0xe6d9bf, top=0xeee4d2, pants=0x2d3550, belt=0x5a3620, shoe=0xebe4d8),
         skin=(236, 204, 186), lip=(206, 112, 118), brow=0.55),
    dict(id='F2', g=0, hair='wavy', hairColor=0x4a2c1e, face={'head/head-round': 0.25, 'mouth/mouth-dimples-in|out': 0.4}, outfit=dict(card=0xe9dcc4, rib=0x2b3352, top=0xeee5d4, pants=0x8c7b67, belt=0x5a3620, shoe=0xebe4d8),
         skin=(238, 206, 190), lip=(214, 118, 116), brow=0.5),
    dict(id='F3', g=0, hair='bob', hairColor=0x2a1c16, face={'head/head-round': 0.45, 'chin/chin-width-decr|incr': 0.1}, outfit=dict(card=0xdcc8a4, rib=0xdcc8a4, top=0xf0e8da, pants=0x45567a, belt=0x6b4226, shoe=0xefe9de),
         skin=(240, 208, 192), lip=(220, 120, 126), brow=0.5),
    dict(id='F4', g=0, hair='ponytail', hairColor=0x241814, face={'head/head-invertedtriangular': 0.4, 'nose/nose-point-width-decr|incr': -0.2}, outfit=dict(card=0xe4d6ba, rib=0xe4d6ba, top=0xece2cf, pants=0x313a55, belt=0x5a3620, shoe=0xebe4d8),
         skin=(234, 200, 182), lip=(204, 116, 112), brow=0.6, freckles=1),
    dict(id='M1', g=1, hair='fringe', hairColor=0x1d1612, face={'head/head-oval': 0.6}, outfit=dict(card=0x283152, rib=0x283152, top=0xe8dfcc, pants=0xb7a68d, belt=0x3a2a20, shoe=0xebe5da),
         skin=(226, 190, 166), lip=(196, 128, 120), brow=1.0),
    dict(id='M2', g=1, hair='neat', hairColor=0x221813, face={'head/head-square': 0.35, 'chin/chin-bones-decr|incr': 0.3}, outfit=dict(card=0x2b3040, rib=0x2b3040, top=0xe4dac6, pants=0xa69783, belt=0x3a2a20, shoe=0xe9e3d8),
         skin=(222, 186, 162), lip=(190, 122, 114), brow=1.0),
    dict(id='M3', g=1, hair='wavylong', hairColor=0x2c1f18, face={'head/head-rectangular': 0.35, 'chin/chin-height-decr|incr': 0.2}, outfit=dict(card=0x22283f, rib=0x22283f, top=0xe6dccb, pants=0x9b8a70, belt=0x3a2a20, shoe=0xe8e2d6),
         skin=(220, 184, 160), lip=(188, 120, 112), brow=1.1, stubble=1),
    dict(id='M4', g=1, hair='round', hairColor=0x231914, face={'head/head-oval': 0.5}, glasses=1, outfit=dict(card=0x2c3456, rib=0x2c3456, top=0xeae1cf, pants=0xc1b199, belt=0x3a2a20, shoe=0xece6db),
         skin=(226, 190, 168), lip=(194, 126, 118), brow=0.95),
]

# ------------------------------------------------------------------ 메시 도구
def tri_faces(F, idx):
    out = []
    for i in idx:
        f = F[i]
        if len(f) == 4: out += [[f[0], f[1], f[2]], [f[0], f[2], f[3]]]
        else: out.append(f[:3])
    return np.array(out, dtype=np.int64)

def compact(V, T):
    u, inv = np.unique(T.ravel(), return_inverse=True)
    return V[u], inv.reshape(-1, 3), u

def decimate(V, T, target_tris):
    if len(T) <= target_tris: return V.copy(), T.copy()
    red = 1 - target_tris / len(T)
    v2, t2 = FS.simplify(V.astype(np.float32), T.astype(np.int64), target_reduction=red, agg=5)
    return v2.astype(np.float64), t2.astype(np.int64)

def vnormals(V, T, weld=True):
    N = np.zeros_like(V)
    fn = np.cross(V[T[:, 1]] - V[T[:, 0]], V[T[:, 2]] - V[T[:, 0]])
    for k in range(3): np.add.at(N, T[:, k], fn)
    if weld:   # 같은 자리(이음매로 나뉜 정점)는 법선을 나눠 쓴다
        key = np.round(V * 2e4).astype(np.int64)
        _, inv = np.unique(key, axis=0, return_inverse=True)
        acc = np.zeros((inv.max() + 1, 3)); np.add.at(acc, inv.ravel(), N); N = acc[inv.ravel()]
    return N / np.maximum(1e-12, np.linalg.norm(N, axis=1))[:, None]

def nearest_weights(Vq, Vsrc, Wsrc, allow=None, k=4):
    from scipy.spatial import cKDTree
    tr = cKDTree(Vsrc); d, ii = tr.query(Vq, k=k)
    w = 1 / np.maximum(d, 1e-4) ** 2
    W = (Wsrc[ii] * w[:, :, None]).sum(1) / w.sum(1)[:, None]
    if allow is not None:
        m = np.zeros(len(BN)); m[[BI[b] for b in allow]] = 1; W = W * m
    s = W.sum(1); s[s == 0] = 1
    return W / s[:, None]

def top4(W):
    idx = np.argsort(-W, axis=1)[:, :4]
    w = np.take_along_axis(W, idx, 1); w = w / np.maximum(1e-9, w.sum(1))[:, None]
    q = np.round(w * 255).astype(np.int32); q[:, 0] += 255 - q.sum(1)
    return idx.astype(np.uint8), np.clip(q, 0, 255).astype(np.uint8)

# ------------------------------------------------------------------ 얼굴 UV(원통 — 앞쪽을 촘촘하게)
FACE_Y0, FACE_Y1 = 1.30, 1.76
def face_uv(V, zc):
    a = np.arctan2(V[:, 0], -(V[:, 2] - zc))          # 0 = 앞(-z), +x 쪽이 +
    u = 0.5 + 0.5 * np.sign(a) * (np.abs(a) / np.pi) ** 0.62
    v = (V[:, 1] - FACE_Y0) / (FACE_Y1 - FACE_Y0)
    return np.c_[u, np.clip(v, 0, 1)]

def split_seam(V, T, UV, extra):
    """u 가 뒤(0/1)에서 넘어가는 삼각형: 작은 u 쪽 정점을 u+1 로 복제(질감 반복)."""
    V = list(V); UV = [list(x) for x in UV]; ex = [list(e) for e in extra]; T = T.copy(); dup = {}
    for t in range(len(T)):
        us = [UV[i][0] for i in T[t]]
        if max(us) - min(us) > 0.5:
            for k in range(3):
                i = T[t][k]
                if UV[i][0] < 0.5:
                    if i not in dup:
                        dup[i] = len(V); V.append(V[i]); UV.append([UV[i][0] + 1, UV[i][1]]); ex.append(ex[i])
                    T[t][k] = dup[i]
    return np.array(V), T, np.array(UV), np.array(ex)

# ------------------------------------------------------------------ 옷(몸을 잘라 잰 둘레로 만든 고리 메시 — 매끈한 천, 우리 UV)
def ring_radii(P, c, y, band, nb, ax=1):
    """점 P 가운데 높이 y±band 의 점들을 축(c: [x,z]) 둘레 각도 칸(nb)마다 가장 먼 반지름. 빈 칸은 이웃으로 메우고 볼록하게 다듬는다."""
    sel = P[np.abs(P[:, ax] - y) < band]
    r = np.zeros(nb)
    if len(sel):
        a = np.arctan2(sel[:, 0] - c[0], -(sel[:, 2] - c[1])) % (2 * np.pi)
        d = np.hypot(sel[:, 0] - c[0], sel[:, 2] - c[1])
        b = (a / (2 * np.pi) * nb).astype(int) % nb
        np.maximum.at(r, b, d)
    if not r.any(): return r
    for _ in range(nb):   # 빈 칸 메우기
        z = r == 0
        if not z.any(): break
        r[z] = np.maximum(np.roll(r, 1), np.roll(r, -1))[z]
    for _ in range(6):    # 천은 오목한 곳을 건너간다
        r = np.maximum(r, 0.97 * (np.roll(r, 1) + np.roll(r, -1)) / 2)
    r = (np.roll(r, 1) + 2 * r + np.roll(r, -1)) / 4
    return r

class Mesh:
    def __init__(self): self.V = []; self.T = []; self.UV = []; self.R = []; self.W = []; self.K = []
    def n(self): return len(self.V)
    def add(self, v, uv, reg, w, knit=0):
        self.V.append(v); self.UV.append(uv); self.R.append(reg); self.W.append(w); self.K.append(knit); return len(self.V) - 1
    def grid(self, rows, closed, reg, wfun, knit, tile=0.12, flip=False):
        """rows: [[점…]…] 같은 개수. u = 둘레 길이 / tile, v = 고리 사이 길이 / tile"""
        nr, nc = len(rows), len(rows[0]); base = self.n(); vacc = 0
        for i, row in enumerate(rows):
            if i: vacc += np.mean([np.linalg.norm(np.array(row[k]) - np.array(rows[i - 1][k])) for k in range(nc)])
            uacc = 0
            for k, p in enumerate(row):
                if k: uacc += np.linalg.norm(np.array(p) - np.array(row[k - 1]))
                self.add(list(p), [uacc / tile, vacc / tile], reg(i, k) if callable(reg) else reg, wfun(p, i, k), knit(i, k) if callable(knit) else knit)
        cols = nc if closed else nc - 1
        for i in range(nr - 1):
            for k in range(cols):
                a = base + i * nc + k; b = base + i * nc + (k + 1) % nc; c = a + nc; d = b + nc
                if flip: self.T += [[a, c, b], [b, c, d]]
                else: self.T += [[a, b, c], [b, d, c]]
        return base

def build_clothes(Vb, Wb, g, o, body_idx):
    """Vb: 맞춘 몸 정점(몸 무리만), Wb: 가중치. 돌려줌: Mesh(카디건·안 셔츠·바지·벨트·신발·단추) — region: 0 카디건 1 시보리 2 안 셔츠 3 바지 4 벨트 5 신발 6 밑창 7 단추"""
    M = Mesh()
    armW = Wb[:, [BI['uaL'], BI['faL'], BI['haL'], BI['uaR'], BI['faR'], BI['haR']]].sum(1)
    legW = Wb[:, [BI['ulL'], BI['llL'], BI['ftL'], BI['ulR'], BI['llR'], BI['ftR']]].sum(1)
    torsoP = Vb[(armW < 0.25) & (legW < 0.5)]
    zc = np.median(torsoP[(torsoP[:, 1] > 1.0) & (torsoP[:, 1] < 1.3)][:, 2])
    NB = 32
    def wt(allow):
        def f(p, i, k): return list(nearest_weights(np.array([p]), Vb, Wb, allow)[0])
        return f
    TORSO = ['hips', 'spine', 'chest', 'neck', 'uaL', 'uaR']
    # --- 카디건 몸판: 고리마다 앞이 열린 띠(V 넥 → 단추 아래 닫힘)
    hem = 0.86 if g == 0 else 0.81; vbot = 1.2 if g == 0 else 1.14; neck = 1.455
    ys = list(np.linspace(hem, 1.30, 12)) + list(np.linspace(1.315, neck, 10))
    rows = []; opens = []
    for y in ys:
        r = ring_radii(torsoP, (0, zc), y, 0.012, NB)
        if y > 1.36: r = np.minimum(r, 0.068 + (neck - y) * (2.6 if g == 0 else 2.9))   # 어깨 경사: 목 밑에서는 목 둘레로 좁힌다(깃이 턱까지 솟지 않게)
        loose = 0.022 + (0.012 if y < 1.0 else 0) + 0.006 * (g == 1)
        w = 0.035 if y < vbot else 0.035 + 0.55 * ((y - vbot) / (neck - vbot)) ** 0.9   # 앞 열림 반각(rad)
        opens.append(w)
        row = []
        for k in range(NB + 1):
            a = w + (2 * np.pi - 2 * w) * k / NB
            rr = np.interp(a / (2 * np.pi) * NB, np.arange(NB + 1), np.r_[r, r[0]]) + loose
            row.append([np.sin(a) * rr, y, zc - np.cos(a) * rr])
        rows.append(row)
    M.grid(rows, False, lambda i, k: 1 if i < 2 or k < 2 or k > NB - 2 else 0, wt(TORSO), lambda i, k: 1 if i < 2 or k < 2 or k > NB - 2 else 0, 0.11)
    # 단추(앞 여밈 왼쪽 띠 위, 3~5개)
    nbtn = 4 if g == 0 else 5
    for q in range(nbtn):
        y = hem + 0.05 + (vbot - hem - 0.04) * q / max(1, nbtn - 1)
        r = ring_radii(torsoP, (0, zc), y, 0.012, NB)[0] + 0.03
        a0 = opens[0] + 0.05
        c = np.array([np.sin(a0) * r, y, zc - np.cos(a0) * r])
        base = M.n(); ww = wt(TORSO)(list(c), 0, 0)
        for s in range(8):
            th = s / 8 * 2 * np.pi
            M.add(list(c + [0.0085 * np.cos(th), 0.0085 * np.sin(th), -0.004]), [0, 0], 7, ww, 3)
        cc = M.add(list(c + [0, 0, -0.007]), [0, 0], 7, ww, 3)
        for s in range(8): M.T.append([base + s, base + (s + 1) % 8, cc])
    # --- 안 셔츠(앞 V 에 보이는 부분 + 목둘레)
    rows = []
    for y in np.linspace(vbot - 0.06, 1.462, 9):
        r = ring_radii(torsoP, (0, zc), y, 0.012, NB)
        if y > 1.36: r = np.minimum(r, 0.062 + (1.462 - y) * 2.4)
        row = []
        for k in range(13):
            a = -0.95 + 1.9 * k / 12
            rr = np.interp((a % (2 * np.pi)) / (2 * np.pi) * NB, np.arange(NB + 1), np.r_[r, r[0]]) + 0.008
            row.append([np.sin(a) * rr, y, zc - np.cos(a) * rr])
        rows.append(row)
    M.grid(rows, False, lambda i, k: 2, wt(['spine', 'chest', 'neck']), lambda i, k: 1 if i >= 7 else 0, 0.07)
    # --- 소매: 팔 축(±SX, 아래로) 둘레. 위는 어깨를 덮는 둥근 끝
    for sd, side in (('L', -1), ('R', 1)):
        ax = np.array([side * SX, 0.0])
        armP = Vb[(Wb[:, BI['ua' + sd]] + Wb[:, BI['fa' + sd]] + 0.5 * Wb[:, BI['ha' + sd]]) > 0.5]
        ys = np.linspace(0.855, 1.40, 16); rows = []; NS = 16
        for j, y in enumerate(ys):
            r = ring_radii(armP, ax, y, 0.015, NS)
            cuff = y < 0.92
            add = 0.01 if cuff else 0.026 + 0.01 * (1 - (y - 0.92) / 0.48)
            row = []
            for k in range(NS + 1):
                a = 2 * np.pi * k / NS
                rr = np.interp(k, np.arange(NS + 1), np.r_[r, r[0]]) + add
                row.append([ax[0] + np.sin(a) * rr, y, ax[1] - np.cos(a) * rr])
            rows.append(row)
        # 어깨 덮개: 고리를 몸 쪽으로 기울이며 줄인다
        top = rows[-1]
        for j, f in enumerate([0.85, 0.6, 0.3]):
            row = []
            for p in top:
                d = np.array(p) - [ax[0], 1.40, ax[1]]
                row.append(list(np.array([ax[0] - side * 0.035 * (1 - f), 1.40 + 0.05 * (1 - f * f) ** 0.5 + 0.012 * j, ax[1]]) + d * [f, 0, f]))
            rows.append(row)
        M.grid(rows, True, lambda i, k: 1 if i < 3 else 0, wt(['chest', 'ua' + sd, 'fa' + sd, 'ha' + sd]), lambda i, k: 1 if i < 3 else 0, 0.10, flip=(side > 0))
    # --- 바지: 허리 고리(엉덩이) + 다리 둘
    waist = 1.0 if g == 0 else 0.97
    hipP = Vb[(armW < 0.2)]
    rows = []
    for y in np.linspace(0.79, waist, 7):
        r = ring_radii(hipP, (0, zc), y, 0.012, NB)
        row = []
        for k in range(NB + 1):
            a = 2 * np.pi * k / NB
            rr = np.interp(k, np.arange(NB + 1), np.r_[r, r[0]]) + 0.008
            row.append([np.sin(a) * rr, y, zc - np.cos(a) * rr])
        rows.append(row)
    M.grid(rows, True, lambda i, k: 4 if i >= 5 and o.get('belt', True) else 3, wt(['hips', 'spine', 'ulL', 'ulR']), lambda i, k: 2 if i < 5 else 3, 0.1)
    for sd, side in (('L', -1), ('R', 1)):
        ax = np.array([side * HX, 0.0])
        legP = Vb[(Wb[:, BI['ul' + sd]] + Wb[:, BI['ll' + sd]]) > 0.5]
        ys = np.linspace(0.035, 0.86, 18); rows = []; NS = 18
        wide = 0.098 if g == 0 else 0.088
        for y in ys:
            r = ring_radii(legP, ax, max(y, 0.12), 0.015, NS)
            row = []
            for k in range(NS + 1):
                a = 2 * np.pi * k / NS
                rb = np.interp(k, np.arange(NS + 1), np.r_[r, r[0]]) + 0.012
                tlow = np.clip((0.55 - y) / 0.3, 0, 1)          # 무릎 아래는 곧게 넓은 통
                rr = max(rb, wide * tlow + rb * (1 - tlow)) if y < 0.55 else rb + 0.006
                row.append([ax[0] + np.sin(a) * rr, y, ax[1] - np.cos(a) * rr])
            rows.append(row)
        M.grid(rows, True, lambda i, k: 3, wt(['hips', 'ul' + sd, 'll' + sd]), 2, 0.1, flip=(side > 0))
    # --- 운동화: 발 길이 방향 고리(초타원 단면), 밑창은 다른 색
    for sd, side in (('L', -1), ('R', 1)):
        cx = side * HX
        zs = np.linspace(0.075, -0.205, 13); rows = []; NS = 16
        for j, z in enumerate(zs):
            u = (0.075 - z) / 0.28
            hw = 0.036 + 0.014 * np.sin(np.pi * min(1, u * 1.25)) - 0.012 * max(0, u - 0.85) / 0.15
            top = 0.085 - 0.04 * u ** 1.3 if u > 0.15 else 0.085
            hb = top / 2
            row = []
            for k in range(NS + 1):
                a = 2 * np.pi * k / NS
                s_, c_ = np.sin(a), np.cos(a)
                px = cx + hw * np.sign(s_) * abs(s_) ** (2 / 2.6)
                py = hb - hb * np.sign(c_) * abs(c_) ** (2 / 2.6)
                if j == 0 or j == len(zs) - 1:
                    px = cx + (px - cx) * 0.55; py = hb + (py - hb) * 0.6
                row.append([px, max(0.0, py), z])
            rows.append(row)
        M.grid(rows, True, lambda i, k: 6 if (k in (0, 1, 15, 16)) else 5, lambda p, i, k: [1.0 if b == 'ft' + sd else 0.0 for b in BN], 3, 0.1, flip=(side < 0))
    return M

# ------------------------------------------------------------------ 몸(살) · 눈 · 내보내기
class Pack:
    """여러 메시를 한 .bin 에: 위치 int16(÷8192 m) · 법선 int8 · UV uint16(÷4096, 0..16) · 뼈 uint8×4 · 무게 uint8×4 · (선택) 영역 uint8 · (선택) 머리결 방향 int8×3 · 색인 uint16"""
    def __init__(self): self.buf = bytearray(); self.parts = {}
    def _put(self, arr, dt):
        a = np.ascontiguousarray(arr.astype(dt)); off = len(self.buf)
        self.buf += a.tobytes()
        while len(self.buf) % 4: self.buf.append(0)
        return off
    def add(self, name, V, T, UV, W, N=None, reg=None, hdir=None, knit=None):
        V = np.asarray(V, float); T = np.asarray(T, np.int64)
        assert len(V) < 65535, name
        if N is None: N = vnormals(V, T)
        si, sw = top4(np.asarray(W, float))
        p = {'nv': len(V), 'ni': int(T.size), 'tris': int(len(T))}
        p['pos'] = self._put(np.round(V * 8192), np.int16)
        p['nrm'] = self._put(np.round(np.asarray(N) * 127), np.int8)
        p['uv'] = self._put(np.round(np.clip(np.asarray(UV, float), 0, 15.99) * 4096), np.uint16)
        p['si'] = self._put(si, np.uint8); p['sw'] = self._put(sw, np.uint8)
        if reg is not None: p['reg'] = self._put(np.asarray(reg), np.uint8)
        if knit is not None: p['knit'] = self._put(np.asarray(knit), np.uint8)
        if hdir is not None: p['hdir'] = self._put(np.round(np.asarray(hdir) * 127), np.int8)
        p['idx'] = self._put(T.ravel(), np.uint16)
        self.parts[name] = p
        return p

def build_skin(V, W, F, G, sk, lod):
    body = [i for i, g in enumerate(G) if g == 'body']
    hn = W[:, BI['head']] + W[:, BI['neck']]
    ha = W[:, BI['haL']] + W[:, BI['haR']]
    head_f = [i for i in body if hn[F[i]].mean() > 0.5 and V[F[i]][:, 1].min() > 1.33]
    hands = {sd: [i for i in body if W[F[i]][:, BI['ha' + sd]].mean() > 0.5 and V[F[i]][:, 1].max() < 0.9] for sd in 'LR'}
    out = []
    zc = float(np.mean(V[sk['joints'][sk['bones']['head']['head']]][:, 2])) if False else None
    for key, idx, tgt in [('head', head_f, (3400, 900)[lod])] + [('hand' + sd, hands[sd], (420, 110)[lod]) for sd in 'LR']:
        T = tri_faces(F, idx); Vs, Ts, orig = compact(V, T)
        Vd, Td = decimate(Vs, Ts, tgt)
        Wd = nearest_weights(Vd, Vs, W[orig])
        out.append((key, Vd, Td, Wd))
    return out

def eye_mesh(V, F, G, side):
    idx = [i for i, g in enumerate(G) if g == 'helper-%s-eye' % side]
    T = tri_faces(F, idx); Vs, Ts, _ = compact(V, T)
    c = Vs.mean(0); R = np.abs(Vs - c).max()
    # 눈동자 UV: 앞(-z)으로 평면 투영(가운데 = 동공)
    UV = np.c_[0.5 + (Vs[:, 0] - c[0]) / (2.4 * R), 0.5 + (Vs[:, 1] - c[1]) / (2.4 * R)]
    return Vs, Ts, UV, c, R

# ------------------------------------------------------------------ 머리카락(카드 = 가닥 다발 띠 + 두피 덮개)
HAIR_STYLES = {
    #        길이 앞/옆/뒤(머리끝 높이 y), 가르마(x, 0 = 가운데), 앞머리(종류, 끝 높이), 물결(폭, 주기), 부피, 끝 말림
    'long':     dict(front=1.04, side=1.00, back=0.96, part=0.012, bang='curtain', bangY=1.545, wave=(0.003, 0.09), vol=0.012, curl=0.0, n=260),
    'wavy':     dict(front=1.24, side=1.22, back=1.18, part=0.025, bang='side', bangY=1.56, wave=(0.016, 0.075), vol=0.02, curl=0.02, n=240),
    'bob':      dict(front=1.445, side=1.43, back=1.43, part=0.0, bang='full', bangY=1.588, wave=(0.002, 0.1), vol=0.016, curl=0.03, n=230),
    'ponytail': dict(front=1.50, side=1.47, back=1.47, part=0.0, bang='wisp', bangY=1.52, wave=(0.006, 0.08), vol=0.006, curl=0.0, n=200, tail=(1.25,)),
    'fringe':   dict(front=1.585, side=1.56, back=1.47, part=0.0, bang='fringe', bangY=1.585, wave=(0.004, 0.06), vol=0.022, curl=0.0, n=230, short=1),
    'neat':     dict(front=1.62, side=1.57, back=1.47, part=0.03, bang='swept', bangY=1.615, wave=(0.002, 0.06), vol=0.018, curl=0.0, n=210, short=1),
    'wavylong': dict(front=1.52, side=1.49, back=1.43, part=0.0, bang='curtainM', bangY=1.56, wave=(0.012, 0.06), vol=0.026, curl=0.01, n=240, short=1),
    'round':    dict(front=1.595, side=1.56, back=1.47, part=0.0, bang='fringe', bangY=1.592, wave=(0.007, 0.06), vol=0.024, curl=0.0, n=230, short=1),
}

def head_frame(Vh, eyeC):
    """머리 타원체: 가운데·반지름(눈보다 위의 머리 살로)"""
    up = Vh[Vh[:, 1] > eyeC[1] - 0.01]
    c = np.array([0.0, eyeC[1] + 0.012, (up[:, 2].max() + up[:, 2].min()) / 2 + 0.004])
    r = np.array([np.abs(up[:, 0]).max() + 0.004, up[:, 1].max() - c[1] + 0.004, (up[:, 2].max() - up[:, 2].min()) / 2 + 0.004])
    return c, r

def ell_push(p, c, r, off):
    """p 가 타원체(반지름 r + off) 밖에 있게 밀어낸다"""
    q = (p - c) / (r + off); d = np.linalg.norm(q)
    return p if d >= 1 else c + q / max(d, 1e-6) * (r + off)

def build_hair(style, Vh, Th, Nh, eyeC, g, seed, lod):
    S = HAIR_STYLES[style]; rng = np.random.default_rng(seed)
    c, r = head_frame(Vh, eyeC)
    M = Mesh(); hd = []
    rel = Vh - c
    az = np.arctan2(rel[:, 0], -rel[:, 2]); el = np.arcsin(np.clip(rel[:, 1] / np.maximum(np.linalg.norm(rel, axis=1), 1e-6), -1, 1))
    short = S.get('short', 0)
    def eline(a):
        a = np.abs(a) / np.pi
        top = np.radians(30 if not short else 34); low = np.radians(-48 if not short else -38)
        return top + (low - top) * a ** 1.6
    capm = el > eline(az) - np.radians(3)
    # 두피 덮개: 머리 살 삼각형 중 덮이는 것 → 바깥으로 띄움
    tm = capm[Th].all(1)
    Tc = Th[tm]; Vc, Tc2, orig = compact(Vh, Tc)
    Nc = Nh[orig]
    Vc = Vc + Nc * (0.004 + S['vol'] * 0.35)
    Vc, Tc2 = decimate(Vc, Tc2, (700, 260)[lod])
    Ncap = vnormals(Vc, Tc2)
    base = M.n()
    for p, n in zip(Vc, Ncap):
        rp = p - c; t = np.cross(n, [0, 1, 0]); t = np.cross(t, n); t = -t / max(1e-6, np.linalg.norm(t))   # 아래로 흐르는 결
        M.add(list(p), [0.5 + np.arctan2(rp[0], -rp[2]) / np.pi * 2, (p[1] - c[1]) * 8], 0, [1.0 if b == 'head' else 0.0 for b in BN], 0); hd.append(list(t))
    M.T += [[base + a, base + b, base + cc] for a, b, cc in Tc2]
    # 뿌리 고르기: 덮개 위 고른 점(앞머리 띠는 따로 더)
    roots = []
    cand = np.where(capm)[0]
    for _ in range(int(S['n'] * (0.45 if lod else 1))):
        k = cand[rng.integers(len(cand))]
        roots.append((Vh[k] + Nh[k] * 0.002, Nh[k]))
    nseg = (7, 4)[lod]
    def lenY(p):   # 이 뿌리의 머리끝 높이
        a = abs(np.arctan2(p[0] - c[0], -(p[2] - c[2])))
        if a < 0.9: return S['front'] + (S['side'] - S['front']) * a / 0.9
        return S['side'] + (S['back'] - S['side']) * min(1, (a - 0.9) / 1.6)
    def strand(p0, n0, endY, bang=False, toward=None, wscale=1.0):
        pts = [np.array(p0)]
        rp = p0 - c
        side = np.sign(p0[0] - S['part']) or 1.0
        # 처음 방향: 가르마에서 바깥·아래로(앞머리는 앞·아래)
        d = np.array([side * 0.6, -0.3, 0.0]) if not bang else np.array([0.0, -0.4, -0.8])
        if toward is not None: d = toward - p0
        d = d - n0 * np.dot(d, n0); d /= max(1e-6, np.linalg.norm(d))
        L = max(0.03, p0[1] - endY + (0.03 if not bang else 0.0))
        if short and not bang: L = min(L, 0.075 + 0.02 * rng.random())
        step = L / nseg; p = np.array(p0, float)
        front = abs(np.arctan2(rp[0], -rp[2])) < 1.75
        for s in range(1, nseg + 1):
            tt = s / nseg
            gdir = np.array([0, -1.0, 0])
            if bang: gdir = np.array([0, -1.0, -0.12])
            w = min(1, tt * (1.6 if not short else 0.9))
            d2 = d * (1 - w) + gdir * w
            if S['curl'] and tt > 0.75: d2 = d2 + (c - p) * np.array([1, 0, 1]) * S['curl'] * 8
            d2 /= max(1e-6, np.linalg.norm(d2))
            p = p + d2 * step
            # 물결
            amp, per = S['wave']
            if amp and not bang: p = p + np.array([np.cos(p[1] / per * 2 * np.pi), 0, np.sin(p[1] / per * 2 * np.pi + seed)]) * amp * 0.35 * min(1, tt * 2)
            off = S['vol'] * (0.3 + 0.5 * min(1, tt * 1.5)) + 0.002
            p = ell_push(p, c, r, off)
            # 어깨·몸 앞뒤로 떨어지기(긴 머리)
            if p[1] < 1.47:
                tz = 0.0 if p[1] > 1.35 else 0.02
                ex, ez = (0.185 if p[1] < 1.40 else 0.10), (0.115 if p[1] < 1.40 else 0.07)
                qx, qz = p[0] / ex, (p[2] - tz) / ez; dd = np.hypot(qx, qz)
                if dd < 1.04:
                    k = 1.04 / max(dd, 1e-6); p[0] *= k; p[2] = tz + (p[2] - tz) * k
                if p[1] < 1.42 and abs(p[0]) < 0.24:
                    if front and abs(p[0]) > 0.05: p[2] = min(p[2], -0.13 - 0.01)
                    else: p[2] = max(p[2], 0.10)
            pts.append(p.copy())
        return pts
    strands = []
    for p0, n0 in roots: strands.append((strand(p0, n0, lenY(p0)), 1.0))
    # 앞머리
    bang = S['bang']; nb = (40, 16)[lod]
    for q in range(nb):
        u = (q + rng.random() * 0.6) / nb * 2 - 1     # -1..1 이마 가로
        a = u * (0.75 if bang in ('full', 'fringe') else 0.95)
        el0 = eline(a) + np.radians(6)
        p0 = c + np.array([np.sin(a) * np.cos(el0) * r[0], np.sin(el0) * r[1], -np.cos(a) * np.cos(el0) * r[2]]) * 1.01
        n0 = (p0 - c) / np.linalg.norm(p0 - c)
        if bang in ('full', 'fringe'):
            tgt = p0 + np.array([u * 0.01, -0.06, -0.012]); endY = S['bangY'] + 0.004 * rng.standard_normal()
        elif bang in ('curtain', 'curtainM', 'side', 'swept', 'wisp'):
            sgn = np.sign(u) or 1
            if bang == 'side' or bang == 'swept': sgn = 1 if u > -0.3 else -1
            tgt = p0 + np.array([sgn * 0.06, -0.05, -0.008]); endY = S['bangY'] - abs(u) * (0.05 if bang != 'swept' else 0.0)
            if bang == 'wisp' and abs(u) < 0.6: continue
        else: continue
        strands.append((strand(p0, n0, endY, bang=True, toward=tgt), 0.8))
    # 묶은 머리: 뒤통수 아래 묶은 점에서 늘어지는 꼬리
    if 'tail' in S:
        tie = c + np.array([0.0, -0.045, r[2] + 0.012])
        for q in range((60, 24)[lod]):
            p = tie + rng.normal(0, 0.008, 3); pts = [p.copy()]
            dr = np.array([0.06 * rng.standard_normal(), -1.0, 0.25]); dr /= np.linalg.norm(dr)
            for s in range(1, nseg + 1):
                p = p + dr * (tie[1] - S['tail'][0]) / nseg; p = ell_push(p, c, r, 0.01)
                if p[1] < 1.45: p[2] = max(p[2], 0.10)
                pts.append(p.copy())
            strands.append((pts, 0.9))
        # 머리 묶은 고무줄(작은 고리)은 생략 — 머리카락으로 덮는다
    # 띠 만들기
    for pts, ws in strands:
        pts = np.array(pts); base = M.n(); nn = len(pts)
        w0 = (0.03 if not short else 0.024) * ws * (0.8 + 0.4 * rng.random())
        u0 = rng.random() * 0.75
        for s in range(nn):
            tdir = pts[min(nn - 1, s + 1)] - pts[max(0, s - 1)]; tdir /= max(1e-6, np.linalg.norm(tdir))
            out = pts[s] - c; out /= max(1e-6, np.linalg.norm(out))
            side = np.cross(tdir, out); side /= max(1e-6, np.linalg.norm(side))
            tt = s / (nn - 1); w = w0 * (1 - 0.35 * tt ** 2)
            yy = pts[s][1]
            wch = 0.0 if yy > 1.5 else min(1.0, (1.5 - yy) / 0.12)
            wv = [0.0] * len(BN); wv[BI['head']] = 1 - wch; wv[BI['chest']] = wch
            for e in (-1, 1):
                M.add(list(pts[s] + side * w * e / 2 + out * 0.001), [u0 + (e + 1) / 2 * 0.25, 1 - tt], 1, wv, 0); hd.append(list(tdir))
        for s in range(nn - 1):
            a = base + s * 2
            M.T += [[a, a + 1, a + 2], [a + 1, a + 3, a + 2]]
    return M, hd, c, r

# ------------------------------------------------------------------ 얼굴 그림(UV 공간에 3D 위치를 래스터 → 거리·마스크로 칠한다. 사진은 쓰지 않는다)
TEX = 1024
def raster(UV, T, attrs, size=TEX):
    """삼각형을 UV 격자에 그려 정점 속성(attrs: N×k)을 보간. 돌려줌: (size,size,k), 덮인 칸 mask"""
    k = attrs.shape[1]; out = np.zeros((size, size, k)); cov = np.zeros((size, size), bool)
    P = UV * size
    for t in T:
        a, b, cc = P[t[0]], P[t[1]], P[t[2]]
        if max(a[0], b[0], cc[0]) - min(a[0], b[0], cc[0]) > size / 2: continue
        x0 = int(max(0, np.floor(min(a[0], b[0], cc[0])))); x1 = int(min(size - 1, np.ceil(max(a[0], b[0], cc[0]))))
        y0 = int(max(0, np.floor(min(a[1], b[1], cc[1])))); y1 = int(min(size - 1, np.ceil(max(a[1], b[1], cc[1]))))
        if x1 < x0 or y1 < y0: continue
        xs, ys = np.meshgrid(np.arange(x0, x1 + 1) + 0.5, np.arange(y0, y1 + 1) + 0.5)
        det = (b[1] - cc[1]) * (a[0] - cc[0]) + (cc[0] - b[0]) * (a[1] - cc[1])
        if abs(det) < 1e-9: continue
        l1 = ((b[1] - cc[1]) * (xs - cc[0]) + (cc[0] - b[0]) * (ys - cc[1])) / det
        l2 = ((cc[1] - a[1]) * (xs - cc[0]) + (a[0] - cc[0]) * (ys - cc[1])) / det
        l3 = 1 - l1 - l2
        m = (l1 >= -0.02) & (l2 >= -0.02) & (l3 >= -0.02)
        if not m.any(): continue
        val = l1[..., None] * attrs[t[0]] + l2[..., None] * attrs[t[1]] + l3[..., None] * attrs[t[2]]
        sub = out[y0:y1 + 1, x0:x1 + 1]; sub[m] = val[m]
        cov[y0:y1 + 1, x0:x1 + 1] |= m
    return out, cov

def seg_dist(P, A, B):
    """점들 P(…,3) 에서 선분 모음(A,B: m×3)까지 가장 가까운 거리 + 그 선분 위 위치(0..1 전체 길이 비율)"""
    best = np.full(P.shape[:-1], 1e9); pos = np.zeros(P.shape[:-1])
    L = np.linalg.norm(B - A, axis=1); cum = np.r_[0, np.cumsum(L)]; tot = cum[-1] or 1
    for i in range(len(A)):
        ab = B[i] - A[i]; t = np.clip(((P - A[i]) @ ab) / max(1e-12, ab @ ab), 0, 1)
        d = np.linalg.norm(P - (A[i] + t[..., None] * ab), axis=-1)
        m = d < best; best[m] = d[m]; pos[m] = (cum[i] + t[m] * L[i]) / tot
    return best, pos

def smooth(x, e0, e1): t = np.clip((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t)

def boundary_loops(T):
    from collections import Counter
    E = Counter()
    for t in T:
        for a, b in ((t[0], t[1]), (t[1], t[2]), (t[2], t[0])): E[(min(a, b), max(a, b))] += 1
    adj = {}
    for (a, b), n in E.items():
        if n == 1: adj.setdefault(a, []).append(b); adj.setdefault(b, []).append(a)
    loops = []; seen = set()
    for s in adj:
        if s in seen: continue
        loop = [s]; seen.add(s); prev = None; cur = s
        while True:
            nx = [q for q in adj[cur] if q != prev and q not in seen]
            if not nx: break
            prev, cur = cur, nx[0]; loop.append(cur); seen.add(cur)
        loops.append(loop)
    return loops

def paint_face(av, Vh, Th, UVh, masks, eyes, mouthC):
    P3, cov = raster(UVh, Th, np.c_[Vh, masks])
    P = P3[..., :3]; lipU = P3[..., 3]; lipL = P3[..., 4]
    sk = np.array(av['skin'], float) / 255; col = np.ones((TEX, TEX, 3)) * sk
    rng = np.random.default_rng(len(av['id']) * 7 + ord(av['id'][1]))
    F = av['g'] == 0
    x, y, z = P[..., 0], P[..., 1], P[..., 2]
    # 피부 결: 아주 약한 얼룩 + 이마·볼 밝게
    nz = np.array(Image.fromarray((rng.random((64, 64)) * 255).astype(np.uint8)).resize((TEX, TEX), Image.BICUBIC)) / 255 - 0.5
    col *= (1 + 0.025 * nz)[..., None]
    def blend(c, a):
        nonlocal col
        col = col * (1 - a[..., None]) + np.array(c, float)[None, None, :] / 255 * a[..., None]
    for (ec, upA, upB, loA, loB) in eyes:
        side = np.sign(ec[0])
        dx = (x - ec[0]) * side; dy = y - ec[1]
        # 볼 홍조
        bl = np.exp(-(((x - ec[0] - side * 0.004) / 0.024) ** 2 + ((y - ec[1] + 0.034) / 0.017) ** 2)) * (z < ec[2] + 0.03)
        blend((236, 150, 150) if F else (222, 156, 146), bl * (0.30 if F else 0.10))
        # 쌍꺼풀 주름(위 눈꺼풀 선 위 3.5mm, 옅은 그늘)
        d, pos = seg_dist(P, upA, upB)
        crease = np.exp(-((d - 0.0042) / 0.0011) ** 2) * (dy > -0.001)
        blend((150, 105, 95), crease * (0.22 if F else 0.14))
        # 아이라인 + 위 속눈썹 선(바깥 끝에서 굵어지고 살짝 올라간 꼬리)
        wid = 0.0009 + 0.0011 * pos * F + 0.0004
        liner = smooth(-(d - wid), -0.0004, 0.0002) * (dy > -0.0045)
        blend((38, 26, 24), liner * (0.92 if F else 0.6))
        if F:
            tail = np.exp(-(((dx - 0.017) / 0.004) ** 2 + ((dy - 0.0012 - (dx - 0.012) * 0.25) / 0.0007) ** 2)) * (dx > 0.011)
            blend((38, 26, 24), np.clip(tail, 0, 1) * 0.8)
        # 아래 속눈썹 선(옅게) + 애교살 밝게
        d2, pos2 = seg_dist(P, loA, loB)
        blend((96, 66, 58), smooth(-(d2 - 0.0006), -0.0004, 0.0002) * 0.45)
        if F: blend((250, 232, 224), np.exp(-((d2 - 0.0026) / 0.0014) ** 2) * (dy < 0) * 0.28)
        # 눈썹: 눈 위 아치, 안쪽 굵고 바깥 가늘게, 가닥 결
        t = np.clip((dx + 0.016) / 0.05, 0, 1)
        yb = ec[1] + 0.0195 + (0.0055 if F else 0.003) * np.sin(np.pi * np.clip(t * 1.15, 0, 1)) - 0.004 * t * t
        th = (0.0042 if F else 0.0058) * (1 - 0.55 * t) * av.get('brow', 1)
        inb = smooth(th - np.abs(y - yb), -0.0006, 0.0006) * (dx > -0.017) * (dx < 0.036) * (z < ec[2] + 0.02)
        strokes = 0.75 + 0.25 * np.sin((dx * 900 + (y - yb) * 2500) + nz * 6)
        blend((62, 44, 38) if F else (34, 26, 22), inb * strokes * (0.85 if F else 0.95))
    # 입술: 표적 마스크(윗·아랫입술 부피)로 모양, 경계는 또렷하게
    mu = smooth(lipU, 0.18, 0.36); ml = smooth(lipL, 0.16, 0.34)
    lipm = np.clip(mu + ml, 0, 1) * (np.abs(y - mouthC[1]) < 0.02)
    lc = np.array(av['lip'], float)
    blend(lc, lipm * (0.85 if F else 0.5))
    blend(np.clip(lc * 1.18 + 10, 0, 255), ml * np.exp(-((x / 0.012) ** 2)) * (y < mouthC[1] - 0.002) * (0.25 if F else 0.1))   # 아랫입술 가운데 윤기
    mline = np.exp(-(((y - mouthC[1]) / 0.0009) ** 2)) * (np.abs(x) < 0.022) * (z < mouthC[2] + 0.01) * smooth(0.024 - np.abs(x), 0, 0.004)
    blend((120, 62, 64) if F else (110, 72, 68), mline * 0.55)
    # 코끝 살짝 붉게
    if F: blend((238, 176, 170), np.exp(-((x / 0.008) ** 2 + ((y - mouthC[1] - 0.033) / 0.007) ** 2)) * (z < mouthC[2]) * 0.18)
    # 수염 자국(M3)
    if av.get('stubble'):
        jaw = ((y < mouthC[1] + 0.014) & (y > mouthC[1] - 0.075) & (z < mouthC[2] + 0.06)) * (1 - lipm)
        jaw = jaw * smooth(0.075 - np.abs(x), 0, 0.02)
        dots = (rng.random((TEX, TEX)) < 0.35) * 1.0
        blend((70, 58, 52), jaw * dots * 0.22 + jaw * 0.08)
    # 주근깨(F4)
    if av.get('freckles'):
        for _ in range(70):
            fx = rng.normal(0, 0.03); fy = mouthC[1] + 0.045 + rng.normal(0, 0.008)
            blend((176, 120, 96), np.exp(-(((x - fx) / 0.0012) ** 2 + ((y - fy) / 0.0012) ** 2)) * (z < mouthC[2] + 0.02) * 0.35)
    # 덮이지 않은 칸은 가까운 색으로 메운다(이음매 번짐 막기)
    img = Image.fromarray((np.clip(col, 0, 1) * 255).astype(np.uint8))
    m = Image.fromarray((cov * 255).astype(np.uint8))
    bg = Image.new('RGB', img.size, tuple(int(v) for v in av['skin']))
    filled = Image.composite(img, bg, m)
    for _ in range(4): filled = Image.composite(filled, filled.filter(ImageFilter.MaxFilter(5)), m)
    return filled.transpose(Image.FLIP_TOP_BOTTOM)   # 질감 v=0 이 아래(three flipY)

# ------------------------------------------------------------------ 공유 질감(모두 절차 생성 — 자작)
def tex_iris(path):
    S = 256; yy, xx = np.mgrid[0:S, 0:S] / (S - 1) * 2 - 1; r = np.hypot(xx, yy); a = np.arctan2(yy, xx)
    rng = np.random.default_rng(3)
    col = np.zeros((S, S, 3))
    sclera = np.array([238, 234, 228]) / 255
    col[:] = sclera * (1 - 0.08 * smooth(r, 0.55, 1.0))[..., None]
    IR = 0.43
    fib = 0.85 + 0.15 * np.sin(a * 37 + rng.random() * 6) * np.sin(a * 13)
    iris = np.array([92, 58, 40]) / 255 * (0.55 + 0.6 * smooth(r, 0.12, IR)[..., None] * 0 + 0.45 * (1 - r / IR)[..., None]) * fib[..., None]
    iris = iris * (1 - 0.55 * smooth(r, IR * 0.78, IR))[..., None]       # 가장자리 짙은 고리
    m = smooth(IR + 0.01 - r, 0, 0.02)
    col = col * (1 - m[..., None]) + iris * m[..., None]
    pm = smooth(0.17 - r, 0, 0.015); col = col * (1 - pm[..., None]) + np.array([12, 9, 8]) / 255 * pm[..., None]
    for (cx, cy, rr) in [(-0.13, 0.15, 0.07), (0.12, -0.12, 0.03)]:    # 빛 맺힘
        hm = smooth(rr - np.hypot(xx - cx, yy - cy), 0, 0.02); col = col * (1 - hm[..., None]) + hm[..., None]
    Image.fromarray((np.clip(col, 0, 1) * 255).astype(np.uint8)).transpose(Image.FLIP_TOP_BOTTOM).save(path, quality=90)

def tex_hair(path):
    W, H = 128, 256; rng = np.random.default_rng(5)
    a = np.zeros((H, W)); lum = np.zeros((H, W))
    for _ in range(160):
        x0 = rng.random() * W; w = 0.6 + rng.random() * 1.6; L = 0.55 + rng.random() * 0.45; sh = 0.6 + rng.random() * 0.5
        ys = np.arange(H); xs = x0 + np.sin(ys / H * 3 + rng.random() * 6) * 1.5
        for y in range(int(H * L)):
            xi = xs[y]; lo = int(max(0, xi - w - 1)); hi = int(min(W - 1, xi + w + 1))
            for x in range(lo, hi + 1):
                v = max(0.0, 1 - abs(x - xi) / w)
                if v > a[y, x]: a[y, x] = v; lum[y, x] = sh
    a = np.clip(a * 1.6, 0, 1)
    a[:, :3] *= np.linspace(0.2, 1, 3)[None, :]; a[:, -3:] *= np.linspace(1, 0.2, 3)[None, :]
    img = np.dstack([np.clip(lum * 255, 0, 255)] * 3 + [a * 255]).astype(np.uint8)
    Image.fromarray(img, 'RGBA').save(path)

def tex_knit(path):
    """법선 지도 아틀라스 512²: 칸 0 꽈배기(케이블) · 1 고무뜨기(시보리) · 2 능직(바지) · 3 매끈 — 칸마다 따로 반복"""
    S = 256; out = np.zeros((512, 512, 3))
    yy, xx = np.mgrid[0:S, 0:S] / S
    def nmap(h):
        gy, gx = np.gradient(h * 6.0)
        n = np.dstack([-gx, -gy, np.ones_like(h)]); n /= np.linalg.norm(n, axis=2)[..., None]
        return n * 0.5 + 0.5
    # 메리야스 V 코(작은 V 반복) + 꽈배기 두 줄
    st = np.abs(((xx * 16) % 1) - 0.5) * 2; vv = ((yy * 22 + st * 0.5) % 1)
    knit = 0.5 + 0.5 * np.cos(vv * 2 * np.pi) * (1 - st * 0.6)
    cab = np.zeros_like(xx)
    for cx in (0.25, 0.75):
        u = (xx - cx) / 0.09
        for ph in (0, np.pi):
            cpath = np.sin(yy * 2 * np.pi * 3 + ph) * 0.5
            cab = np.maximum(cab, np.clip(1 - np.abs(u - cpath) * 2.2, 0, 1) * (np.abs(u) < 1))
    h0 = knit * 0.35 * (1 - (cab > 0.05)) + cab * 1.2
    out[0:S, 0:S] = nmap(h0)
    rib = 0.5 + 0.5 * np.cos(xx * 2 * np.pi * 14); out[0:S, S:] = nmap(rib * 0.6 + knit * 0.15)
    tw = 0.5 + 0.5 * np.cos((xx * 40 + yy * 40) * 2 * np.pi); out[S:, 0:S] = nmap(tw * 0.12)
    out[S:, S:] = nmap(np.zeros_like(xx))
    Image.fromarray((out * 255).astype(np.uint8)).transpose(Image.FLIP_TOP_BOTTOM).save(path, quality=92)

# ------------------------------------------------------------------ 만들기
def lod_mesh(M, target):
    """옷·머리 Mesh 를 줄인다(속성은 가까운 원래 정점에서)"""
    V = np.array(M.V); T = np.array(M.T)
    Vd, Td = decimate(V, T, target)
    from scipy.spatial import cKDTree
    _, ii = cKDTree(V).query(Vd)
    return Vd, Td, ii

def main():
    os.makedirs(OUT, exist_ok=True)
    V0, F, G = load_obj()
    sk = json.load(open(fetch('rigs/default.mhskel')))
    W = our_weights(len(V0), sk)
    n = len(V0)
    lipU_t = np.linalg.norm(target('mouth/mouth-upperlip-volume-incr', n), axis=1)
    lipL_t = np.linalg.norm(target('mouth/mouth-lowerlip-volume-incr', n), axis=1)
    lipU_t /= lipU_t.max() or 1; lipL_t /= lipL_t.max() or 1
    pack = Pack(); meta = {'version': 1, 'bones': BN, 'avatars': [], 'parts': None, 'license': 'body base: MakeHuman 1.x assets (CC0 1.0); everything else self-made'}
    clothes = {}
    body_idx = np.unique(np.concatenate([F[i] for i, g in enumerate(G) if g == 'body']))
    tex_iris(os.path.join(OUT, 'iris.jpg')); tex_hair(os.path.join(OUT, 'hair.png')); tex_knit(os.path.join(OUT, 'knit_n.jpg'))
    for ai, av in enumerate(AV):
        g = av['g']
        mods = dict(BASE_MODS[g]); mods.update(FACE_COMMON[g])
        for k, v in av['face'].items(): mods[k] = mods.get(k, 0) + v
        V, s = build_body(V0, mods, sk, W)
        # 눈(살 구멍 가장자리 = 눈꺼풀)
        eyesM = []; eyeInfo = []
        headF = [i for i, gg in enumerate(G) if gg == 'body' and (W[F[i]][:, BI['head']] + W[F[i]][:, BI['neck']]).mean() > 0.5 and V[F[i]][:, 1].min() > 1.33]
        Th_full = tri_faces(F, headF)
        loops = boundary_loops(Th_full)
        for sd in 'lr':
            Ve, Te, UVe, ec, R = eye_mesh(V, F, G, sd)
            eyesM.append((Ve, Te, UVe))
            lp = min(loops, key=lambda L: np.linalg.norm(V[L].mean(0) - ec))
            pts = V[lp]; up = pts[pts[:, 1] >= ec[1] - 0.001]; lo = pts[pts[:, 1] < ec[1] - 0.001]
            up = up[np.argsort(up[:, 0])]; lo = lo[np.argsort(lo[:, 0])]
            eyeInfo.append((ec, up[:-1], up[1:], lo[:-1], lo[1:]))
        eyeC = (eyeInfo[0][0] + eyeInfo[1][0]) / 2
        mouth_vi = np.where((lipU_t > 0.5) | (lipL_t > 0.5))[0]
        mouthC = V[mouth_vi].mean(0) if len(mouth_vi) else eyeC + [0, -0.06, -0.01]
        # 살 + 얼굴 그림
        Vs, Ts, origH = compact(V, Th_full)
        zc = float(eyeC[2] + 0.075)
        UVs = face_uv(Vs, zc)
        img = paint_face(av, Vs, Ts, UVs, np.c_[lipU_t[origH], lipL_t[origH]], eyeInfo, mouthC)
        img.save(os.path.join(OUT, 'face_%s.jpg' % av['id']), quality=86, optimize=True)
        for lod in (0, 1):
            parts = build_skin(V, W, F, G, sk, lod)
            AVs = []; ATs = []; AUV = []; AW = []; off = 0
            for key, Vd, Td, Wd in parts:
                if key == 'head': uv = face_uv(Vd, zc)
                else: uv = np.tile([0.012, 0.012], (len(Vd), 1))
                AVs.append(Vd); ATs.append(Td + off); AUV.append(uv); AW.append(Wd); off += len(Vd)
            Vc = np.vstack(AVs); Tc = np.vstack(ATs); UVc = np.vstack(AUV); Wc = np.vstack(AW)
            Nc = vnormals(Vc, Tc)
            Vc, Tc, UVc, ex = split_seam(Vc, Tc, UVc, np.c_[Wc, Nc])
            pack.add('skin%d_%d' % (ai, lod), Vc, Tc, UVc, ex[:, :len(BN)], N=ex[:, len(BN):])
        Ve = np.vstack([eyesM[0][0], eyesM[1][0]]); Te = np.vstack([eyesM[0][1], eyesM[1][1] + len(eyesM[0][0])]); UVe = np.vstack([eyesM[0][2], eyesM[1][2]])
        pack.add('eyes%d' % ai, Ve, Te, UVe, np.tile([1.0 if b == 'head' else 0.0 for b in BN], (len(Ve), 1)))
        # 옷(성별마다 한 벌 — 몸이 같다)
        if g not in clothes:
            Vb = V[body_idx]; Wb = W[body_idx]
            M = build_clothes(Vb, Wb, g, av['outfit'], body_idx)
            clothes[g] = True
            Vm = np.array(M.V); Tm = np.array(M.T)
            pack.add('cloth%d_0' % g, Vm, Tm, np.array(M.UV), np.array(M.W), reg=M.R, knit=M.K)
            Vd, Td, ii = lod_mesh(M, 1100)
            pack.add('cloth%d_1' % g, Vd, Td, np.array(M.UV)[ii], np.array(M.W)[ii], reg=np.array(M.R)[ii], knit=np.array(M.K)[ii])
        # 머리카락
        Vh = Vs; Nh = vnormals(Vs, Ts)
        for lod in (0, 1):
            HM, hd, hc, hr = build_hair(av['hair'], Vh, Ts, Nh, eyeC, g, ai + 11, lod)
            pack.add('hair%d_%d' % (ai, lod), np.array(HM.V), np.array(HM.T), np.array(HM.UV), np.array(HM.W), reg=HM.R, hdir=np.array(hd))
        top = float(max(np.array(HM.V)[:, 1].max(), Vs[:, 1].max()))
        meta['avatars'].append({'id': av['id'], 'g': g, 'hair': av['hair'], 'hairColor': av['hairColor'], 'outfit': av['outfit'], 'skin': av['skin'], 'glasses': av.get('glasses', 0),
                                'eyes': [list(np.round(e[0], 4)) for e in eyeInfo], 'eyeR': float(np.round(R, 4)), 'head': {'c': list(np.round(hc, 4)), 'r': list(np.round(hr, 4))}, 'top': round(top, 3),
                                'face': 'face_%s.jpg' % av['id']})
        print(av['id'], {k: v['tris'] for k, v in pack.parts.items() if k.endswith(str(ai) + '_0') or k == 'eyes%d' % ai})
    meta['parts'] = pack.parts
    open(os.path.join(OUT, 'human.bin'), 'wb').write(bytes(pack.buf))
    json.dump(meta, open(os.path.join(OUT, 'human.json'), 'w'), separators=(',', ':'))
    print('bin', len(pack.buf), 'bytes')

if __name__ == '__main__':
    main()
