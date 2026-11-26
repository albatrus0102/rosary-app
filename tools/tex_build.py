# 소유자 제공 PBR 질감(T01~T60)·식물 오림(P01~P07)을 web/tex 로 만든다.
#   python3 -I tools/tex_build.py <base_zip> <pbr_zip> <pbr_zip2> <plants_cut> [--out web/tex] [--report docs/seams.json]
# 하는 일
#  1) 이음매 없애기: 재질마다 색·법선·거칠기·AO 네 장에 '같은' 연산을 한다(정렬 유지).
#     축마다(가로 → 세로) 반 칸 밀기(roll) 사본 S 를 만들고, 원본 I 와 S 의 차이가 가장 작은 세로(가로) 길을 동적 계획으로 찾아
#     가장자리 띠는 S(이음매 없음), 가운데는 I(원본) 를 쓰고 길을 따라 6 px 만 부드럽게 섞는다(넓게 섞으면 두 겹으로 비친다).
#     두 번째 축을 밀 때 첫 축의 이음매 없음은 그대로 남는다(행 전체를 같이 밀기 때문).
#  2) 거칠기 + AO 를 한 장(ORM: R=AO, G=거칠기, B=0)으로 묶는다 — three 의 aoMap 은 .r, roughnessMap 은 .g 를 읽는다.
#  3) 바닥 판재(floor_oak): T01 오크 결을 판 폭 0.15 m 로 잘라 엇갈려 깐 1.2 m 타일(홈·판마다 색 차이) + 법선·ORM 같은 배치.
#  4) 식물 카드: 알파 가장자리 색 번짐(흰 테 방지) + 512/1024 webp(알파).
#  이음매 지표: 가장자리(마지막 열↔첫 열, 마지막 행↔첫 행) 밝기 차 평균 ÷ 안쪽 이웃 픽셀 차 평균. 1.0 이면 안쪽과 구별이 안 된다.
import sys, os, json
import numpy as np
from PIL import Image, ImageFilter

args = sys.argv[1:]
def opt(k, d):
    return args[args.index(k) + 1] if k in args else d
BASE, PBR1, PBR2, PLANTS = args[0], args[1], args[2], args[3]
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = opt('--out', os.path.join(HERE, '..', 'web', 'tex'))
REPORT = opt('--report', os.path.join(HERE, '..', 'docs', 'seams.json'))
os.makedirs(OUT, exist_ok=True)

def P(d, n):
    return os.path.join(d, n)

# 칸 이름 → (색, 법선, 거칠기, AO, 이음매 고침 여부)
MATS = {
    'wood_oak': (P(BASE, 'T01_oak_basecolor.png'), P(PBR1, 'T19_oak_normal_OpenGL.png'), P(PBR1, 'T27_oak_roughness.png'), P(PBR1, 'T35_oak_AO.png'), 'auto'),
    'rope': (P(BASE, 'T02_rope_basecolor.png'), P(PBR1, 'T20_rope_normal_OpenGL.png'), P(PBR1, 'T28_rope_roughness.png'), P(PBR1, 'T36_rope_AO.png'), True),
    'linen_a': (P(BASE, 'T03_linen_basecolor.png'), P(PBR1, 'T21_linen_normal_OpenGL.png'), P(PBR1, 'T29_linen_roughness.png'), P(PBR1, 'T37_linen_AO.png'), True),
    'metal': (P(BASE, 'T04_metal_basecolor.png'), P(PBR2, 'T52_metal_normal_OpenGL.png'), P(PBR2, 'T53_metal_roughness.png'), P(PBR2, 'T54_metal_AO.png'), 'auto'),
    'wood_end': (P(BASE, 'T05_endgrain_basecolor.png'), P(PBR2, 'T55_endgrain_normal_OpenGL.png'), P(PBR2, 'T56_endgrain_roughness.png'), P(PBR2, 'T57_endgrain_AO.png'), False),  # 나이테 한 장(반복하지 않음)
    'lawn': (P(BASE, 'T06_grass_basecolor.png'), P(PBR1, 'T26_grass_normal_OpenGL.png'), P(PBR1, 'T34_grass_roughness.png'), P(PBR1, 'T42_grass_AO.png'), True),
    'stone': (P(BASE, 'T07_stone_basecolor.png'), P(PBR1, 'T23_stone_normal_OpenGL.png'), P(PBR1, 'T31_stone_roughness.png'), P(PBR1, 'T39_stone_AO.png'), True),
    'plaster_cream': (P(BASE, 'T08_plaster_basecolor.png'), P(PBR1, 'T22_plaster_normal_OpenGL.png'), P(PBR1, 'T30_plaster_roughness.png'), P(PBR1, 'T38_plaster_AO.png'), True),
    'bark': (P(BASE, 'T09_bark_basecolor.png'), P(PBR1, 'T25_bark_normal_OpenGL.png'), P(PBR1, 'T33_bark_roughness.png'), P(PBR1, 'T41_bark_AO.png'), True),
    'soil': (P(BASE, 'T12_soil_basecolor.png'), P(PBR2, 'T46_soil_normal_OpenGL.png'), P(PBR2, 'T47_soil_roughness.png'), P(PBR2, 'T48_soil_AO.png'), True),
    'terracotta': (P(BASE, 'T13_terracotta_basecolor.png'), P(PBR2, 'T43_terracotta_normal_OpenGL.png'), P(PBR2, 'T44_terracotta_roughness.png'), P(PBR2, 'T45_terracotta_AO.png'), True),
    'brick': (P(BASE, 'T17_brick_basecolor.png'), P(PBR1, 'T24_brick_normal_OpenGL.png'), P(PBR1, 'T32_brick_roughness.png'), P(PBR1, 'T40_brick_AO.png'), True),
    'paving': (P(BASE, 'T18_paving_basecolor.png'), P(PBR2, 'T49_paving_normal_OpenGL.png'), P(PBR2, 'T50_paving_roughness.png'), P(PBR2, 'T51_paving_AO.png'), True),
    'linen_b': (P(BASE, '_linen2_from_chat.png'), P(PBR2, 'T58_linen2_normal_OpenGL.png'), P(PBR2, 'T59_linen2_roughness.png'), P(PBR2, 'T60_linen2_AO.png'), True),
}
PLANTS_MAP = {'rose': 'P01_rose.png', 'echinacea': 'P02_echinacea.png', 'daisy': 'P03_daisy.png', 'lavender': 'P04_lavender.png',
              'hydrangea': 'P05_hydrangea.png', 'tree': 'P06_tree.png', 'ivy': 'P07_ivy.png'}


# 색 지도 색조 맞추기(사진처럼 보이는 실제 반사율 쪽으로): (채도 배율, 목표 평균 sRGB 또는 None).
# ChatGPT 색 지도는 채도·밝기가 높아(오크 평균 167,97,34 — 주황) 조명을 받으면 플라스틱처럼 보인다. 실제 오크 반사율 쪽으로 낮춘다.
TONE = {
    'wood_oak': (0.5, (178, 134, 92)),
    'lawn': (0.78, (84, 112, 44)),
    'plaster_cream': (1.0, (218, 207, 190)),
    'terracotta': (0.8, (182, 104, 70)),
    'brick': (0.9, None),
    'soil': (0.9, None),
}


def tone(a, name):
    if name not in TONE:
        return a
    k, tgt = TONE[name]
    L = lum(a)[..., None]
    a = L + (a - L) * k
    if tgt:
        m = a.reshape(-1, 3).mean(0)
        a = a * (np.array(tgt, np.float32) / 255.0) / np.maximum(m, 1e-4)
    return np.clip(a, 0, 1)


def rd(p, mode):
    return np.asarray(Image.open(p).convert(mode), dtype=np.float32) / 255.0


def lum(a):
    return a @ np.array([0.2126, 0.7152, 0.0722], np.float32) if a.ndim == 3 else a


def seam_metric(a):
    L = lum(a)
    edge = (np.abs(L[:, 0] - L[:, -1]).mean() + np.abs(L[0, :] - L[-1, :]).mean()) / 2
    inner = (np.abs(np.diff(L[:, 1:-1], axis=1)).mean() + np.abs(np.diff(L[1:-1, :], axis=0)).mean()) / 2
    return float(edge / max(inner, 1e-6))


def min_path(cost, start=None):
    # cost: (H, W) — 위에서 아래로 한 줄에 한 칸, 옆으로 최대 1칸 움직이는 최소 비용 길(열 번호 배열)
    H, W = cost.shape
    acc = cost.copy()
    if start is not None:
        acc[0, :] = np.inf; acc[0, start] = cost[0, start]
    back = np.zeros((H, W), np.int8)
    for y in range(1, H):
        prev = acc[y - 1]
        l = np.concatenate(([np.inf], prev[:-1]))
        r = np.concatenate((prev[1:], [np.inf]))
        st = np.stack([l, prev, r])
        k = np.argmin(st, axis=0)
        acc[y] += st[k, np.arange(W)]
        back[y] = k - 1
    path = np.zeros(H, np.int32)
    path[-1] = int(np.argmin(acc[-1])) if start is None else start
    if start is not None and not np.isfinite(acc[-1, start]):
        return None, np.inf
    total = float(acc[-1, path[-1]])
    for y in range(H - 1, 0, -1):
        path[y - 1] = path[y] + back[y, path[y]]
    return path, total


def periodic_path(cost):
    # 첫 줄과 끝 줄이 같은 열에서 만나는 길(다음 축을 밀어도 이음 위치가 어긋나지 않게)
    free, _ = min_path(cost)
    cands = sorted(set([int(free[0]), int(free[-1])] + [int(c) for c in np.argsort(cost[0])[:6]]))
    best, bt = free, np.inf
    for c in cands:
        p, t = min_path(cost, c)
        if p is not None and t < bt:
            best, bt = p, t
    return best


def axis_mask(maps, feather=6.0):
    # 가로축(열) 처리용 가중치 w(H,W): 1 = 원본 I, 0 = 반 칸 민 S
    H, W = maps[0].shape[:2]
    cost = np.zeros((H, W), np.float32)
    for i, a in enumerate(maps):
        s = np.roll(a, W // 2, axis=1)
        d = np.abs(a - s)
        d = d.mean(axis=2) if d.ndim == 3 else d
        cost += d * (1.0 if i == 0 else 0.35)
    x = np.arange(W)
    lo0, lo1, hi0, hi1 = W // 8, 3 * W // 8, 5 * W // 8, 7 * W // 8
    big = 1e3
    cl = cost.copy(); cl[:, :lo0] = big; cl[:, lo1:] = big
    ch = cost.copy(); ch[:, :hi0] = big; ch[:, hi1:] = big
    pl, ph = periodic_path(cl), periodic_path(ch)
    w = ((x[None, :] >= pl[:, None]) & (x[None, :] <= ph[:, None])).astype(np.float32)
    im = Image.fromarray((w * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(feather / 2))
    w = np.asarray(im, np.float32) / 255.0
    # 가장자리 열은 반드시 S(0), 가운데 열은 반드시 I(1)
    w[:, :lo0 // 2] = 0; w[:, W - lo0 // 2:] = 0
    return w


def blend(a, s, w, kind):
    ww = w[..., None] if a.ndim == 3 else w
    o = a * ww + s * (1 - ww)
    if kind == 'n':  # 법선: 벡터로 섞고 다시 정규화
        v = o * 2 - 1
        v /= np.maximum(np.linalg.norm(v, axis=2, keepdims=True), 1e-6)
        o = v * 0.5 + 0.5
    return o


def make_seamless(maps, kinds):
    for axis in (1, 0):
        if axis == 0:
            maps = [np.swapaxes(m, 0, 1) for m in maps]
        H, W = maps[0].shape[:2]
        w = axis_mask(maps)
        maps = [blend(m, np.roll(m, W // 2, axis=1), w, k) for m, k in zip(maps, kinds)]
        if axis == 0:
            maps = [np.swapaxes(m, 0, 1) for m in maps]
    return maps


def save(a, path, q=88):
    im = Image.fromarray(np.clip(a * 255 + 0.5, 0, 255).astype(np.uint8))
    im.save(path, quality=q, subsampling=0 if q >= 92 else 2, optimize=True)


def orm(ao, r):
    return np.stack([ao, r, np.zeros_like(ao)], axis=2)


def floor_planks(col, nor, rgh, ao, seed=7):
    # 1024 px = 1.2 m: 판 폭 0.15 m(128 px) × 8 줄, 판 길이 0.6~1.2 m, 줄마다 이음 위치가 엇갈림(가로로 이음매 없음)
    rng = np.random.default_rng(seed)
    N = 1024
    oc, on, orr, oa = (np.zeros_like(col), np.zeros_like(nor), np.zeros_like(rgh), np.zeros_like(ao))
    rows = 8
    ph = N // rows
    for r in range(rows):
        x = int(rng.integers(0, N))
        start = x
        while True:
            L = int(rng.integers(N // 2, N + 1))
            if (x - start) + L > N - N // 4:
                L = N - (x - start)
            sx, sy = int(rng.integers(0, N)), int(rng.integers(0, N))
            tint = 1.0 + rng.uniform(-0.12, 0.10)
            warm = rng.uniform(-0.03, 0.03)
            for xx in range(L):
                X = (x + xx) % N
                srcx = (sx + xx) % N
                ys = (sy + np.arange(ph)) % N
                oc[r * ph:(r + 1) * ph, X] = col[ys, srcx] * tint * np.array([1 + warm, 1, 1 - warm])
                on[r * ph:(r + 1) * ph, X] = nor[ys, srcx]
                orr[r * ph:(r + 1) * ph, X] = np.clip(rgh[ys, srcx] + rng.uniform(-0.0, 0.0), 0, 1)
                oa[r * ph:(r + 1) * ph, X] = ao[ys, srcx]
            # 판 끝 이음(세로 홈)
            ex = (x + L) % N
            for d, k in ((-1, 0.55), (0, 0.45), (1, 0.7)):
                Xg = (ex + d) % N
                oc[r * ph:(r + 1) * ph, Xg] *= k
                oa[r * ph:(r + 1) * ph, Xg] *= 0.6 + 0.3 * (d != 0)
            for d, nx in ((-1, 0.35), (1, -0.35)):
                Xg = (ex + d) % N
                on[r * ph:(r + 1) * ph, Xg] = np.array([0.5 + nx, 0.5, 0.9])
            x += L
            if x - start >= N:
                break
        # 줄 사이 긴 홈
        y0 = r * ph
        for d, k, ny in ((0, 0.42, 0.0), (1, 0.6, -0.35), (-1 + ph, 0.75, 0.35)):
            yy = (y0 + d) % N
            oc[yy] *= k
            oa[yy] *= 0.55 if d == 0 else 0.8
            if ny:
                on[yy] = np.array([0.5, 0.5 + ny, 0.9])
    oc = np.clip(oc, 0, 1)
    v = on * 2 - 1; v /= np.maximum(np.linalg.norm(v, axis=2, keepdims=True), 1e-6); on = v * 0.5 + 0.5
    return oc, on, orr, oa


def bleed(rgba, iters=24):
    # 투명 픽셀 색을 둘레 불투명 색으로 채운다(밉맵·필터에서 흰 테가 비치지 않게)
    a = rgba[..., 3]
    c = rgba[..., :3] * (a[..., None] > 0.5)
    m = (a > 0.5).astype(np.float32)
    for _ in range(iters):
        s = np.zeros_like(c); n = np.zeros_like(m)
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1), (1, 1), (-1, -1), (1, -1), (-1, 1)):
            s += np.roll(np.roll(c * m[..., None], dy, 0), dx, 1)
            n += np.roll(np.roll(m, dy, 0), dx, 1)
        fill = (m == 0) & (n > 0)
        c[fill] = s[fill] / n[fill][:, None]
        m = np.maximum(m, fill.astype(np.float32))
    mean = c[m > 0].mean(axis=0) if (m > 0).any() else np.zeros(3)
    c[m == 0] = mean
    out = rgba.copy(); out[..., :3] = c
    return out


report = {'metric': 'edge/inner luminance step ratio (1.0 = edge indistinguishable from interior)', 'materials': {}}
for name, (pc, pn, pr, pa, fix) in MATS.items():
    col, nor, rgh, ao = rd(pc, 'RGB'), rd(pn, 'RGB'), rd(pr, 'L'), rd(pa, 'L')
    before = {'color': seam_metric(col), 'normal': seam_metric(nor), 'rough': seam_metric(rgh), 'ao': seam_metric(ao)}
    if fix == 'auto':   # 이미 거의 이음매 없는 것(모든 지도 1.3 미만)은 손대지 않는다 — 고치면 오히려 결이 흐려진다
        fix = max(before.values()) >= 1.3
    col = tone(col, name)
    if fix:
        col, nor, rgh, ao = make_seamless([col, nor, rgh, ao], ['c', 'n', 'r', 'a'])
    after = {'color': seam_metric(col), 'normal': seam_metric(nor), 'rough': seam_metric(rgh), 'ao': seam_metric(ao)}
    report['materials'][name] = {'fixed': fix, 'before': {k: round(v, 2) for k, v in before.items()}, 'after': {k: round(v, 2) for k, v in after.items()}}
    print('%-14s color %.2f -> %.2f  normal %.2f -> %.2f  rough %.2f -> %.2f  ao %.2f -> %.2f' % (name, before['color'], after['color'], before['normal'], after['normal'], before['rough'], after['rough'], before['ao'], after['ao']))
    save(col, os.path.join(OUT, name + '.jpg'), 86)
    save(nor, os.path.join(OUT, name + '_n.jpg'), 90)
    save(orm(ao, rgh), os.path.join(OUT, name + '_orm.jpg'), 86)
    if name == 'wood_oak':
        fc, fn, fr, fa = floor_planks(col, nor, rgh, ao)
        report['materials']['floor_oak'] = {'fixed': 'derived', 'after': {'color': round(seam_metric(fc), 2)}}
        print('floor_oak      color %.2f (planks from wood_oak)' % seam_metric(fc))
        save(fc, os.path.join(OUT, 'floor_oak.jpg'), 86)
        save(fn, os.path.join(OUT, 'floor_oak_n.jpg'), 90)
        save(orm(fa, fr), os.path.join(OUT, 'floor_oak_orm.jpg'), 86)

for name, f in PLANTS_MAP.items():
    im = Image.open(os.path.join(PLANTS, f)).convert('RGBA')
    bb = im.getbbox()
    if bb:
        im = im.crop(bb)
    W, H = im.size
    m = 1024 if name == 'tree' else 512
    k = m / max(W, H)
    im = im.resize((max(8, round(W * k)), max(8, round(H * k))), Image.LANCZOS)
    a = np.asarray(im, np.float32) / 255.0
    a = bleed(a)
    out = Image.fromarray(np.clip(a * 255 + 0.5, 0, 255).astype(np.uint8), 'RGBA')
    out.save(os.path.join(OUT, 'plant_' + name + '.webp'), quality=88, method=6)
    report.setdefault('plants', {})[name] = {'size': list(out.size), 'aspect': round(out.size[0] / out.size[1], 3)}
    print('plant_%-10s %dx%d' % (name, out.size[0], out.size[1]))

os.makedirs(os.path.dirname(REPORT), exist_ok=True)
with open(REPORT, 'w') as fh:
    json.dump(report, fh, indent=1, ensure_ascii=False)
