#!/usr/bin/env python3
"""위키미디어 공용 사진(art/commons_handoff/received/, 저장소 밖 보관) → 성당 배포용 그림 판(art/images_src/<성당>/*.webp).

  python3 tools/commons_art/make_commons_art.py [--preview DIR] [키 ...]
  → node tools/church_web/build_art_florence.mjs · node tools/church_web/build_art_commons.mjs 로 art_*.js 묶음을 만든다.

사진마다 한 일(변경사항 — 저작자 표시와 함께 docs/church/licenses/*.md · lib/domain/art_credits.dart 에 적는다):
  피렌체 벽 그림 3점: 그림 틀 네 귀를 잡아 원근을 펴고(직사각형), 틀 비율로 자르고, 줄임.
  성 바오로 후진 모자이크: 아래에서 올려다본 사진을 카메라 맞춤(apse_fit.py)으로 반돔 곡면 (φ, el) 격자에 다시 폄 + 사진 밖은 금 모자이크 바탕으로 채움.
  성 바오로 무덤: 창살 정면을 원근 보정해 자름.  성 베드로 피에타·청동상: 자르고 줄임(피에타는 가장자리를 어둡게).
"""
import io, os, sys
import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage

REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
SRC = os.path.join(REPO, 'art/commons_handoff/received')
OUT = os.path.join(REPO, 'art/images_src')
sys.path.insert(0, os.path.dirname(__file__))


def load(name):
    return Image.open(os.path.join(SRC, name)).convert('RGB')


def save_webp(im, church, key, max_kb=200, q0=86):
    """손실 VP8 WebP 로, max_kb 이하가 될 때까지 품질을 낮춘다."""
    os.makedirs(os.path.join(OUT, church), exist_ok=True)
    q = q0
    while True:
        b = io.BytesIO(); im.save(b, 'WEBP', quality=q, method=6); n = b.tell()
        if n <= max_kb * 1024 or q <= 40: break
        q -= 3
    p = os.path.join(OUT, church, key + '.webp')
    with open(p, 'wb') as f: f.write(b.getvalue())
    print('%-22s %4dx%-4d q%d %6.1fKB' % (church + '/' + key, im.width, im.height, q, n / 1024))
    return p


def warp_quad(im, quad, w, h):
    """quad = 왼위·오른위·오른아래·왼아래 화소 → w×h 직사각형(원근 펴기)."""
    (x0, y0), (x1, y1), (x2, y2), (x3, y3) = quad
    dst = [(0, 0), (w, 0), (w, h), (0, h)]; A = []; B = []
    for (dx, dy), (sx, sy) in zip(dst, [(x0, y0), (x1, y1), (x2, y2), (x3, y3)]):
        A.append([dx, dy, 1, 0, 0, 0, -sx * dx, -sx * dy]); B.append(sx)
        A.append([0, 0, 0, dx, dy, 1, -sy * dx, -sy * dy]); B.append(sy)
    co = np.linalg.solve(np.array(A, float), np.array(B, float))
    return im.transform((w, h), Image.PERSPECTIVE, tuple(co), Image.BICUBIC)


def tone(im, gain=1.0, sat=1.0, gamma=1.0):
    a = np.asarray(im, np.float64) / 255
    if gamma != 1.0: a = a ** gamma
    g = a.mean(2, keepdims=True)
    a = np.clip((g + (a - g) * sat) * gain, 0, 1)
    return Image.fromarray((a * 255 + 0.5).astype(np.uint8))


# ---------------------------------------------------------------- 성 바오로 후진 모자이크(05_B: 색을 낮춘 보정본)
APSE_CAM = [-0.05314, -0.44577, 0.32384, 0.01768, -0.80407, 0.22395, 904.42208]   # apse_fit.py 결과(오차 rms 7.5 화소 / 1500×1000)


def gold_fill(w, h, mean, seed=5):
    """사진의 금 바탕 평균색으로 만든 모자이크 바탕(4화소 조각의 밝기 흔들림 + 큰 얼룩)."""
    r = np.random.default_rng(seed)
    t = r.random((h // 4 + 1, w // 4 + 1)); t = np.kron(t, np.ones((4, 4)))[:h, :w]
    lo = ndimage.gaussian_filter(r.random((h, w)), 40); lo = (lo - lo.mean()) / (lo.std() + 1e-9)
    k = 0.86 + 0.26 * t + 0.07 * lo
    return np.clip(mean[None, None, :] * k[..., None], 0, 255)


def apse(preview=None, tw=1344, th=672):
    import apse_fit as F
    im = np.asarray(load('05_apse_mosaic_B.jpg'), np.float64)
    ph, pw = im.shape[:2]
    u = (np.arange(tw) + 0.5) / tw; v = 1 - (np.arange(th) + 0.5) / th
    U, V = np.meshgrid(u, v)
    px, z = F.project(APSE_CAM, F.dome(-np.pi / 2 + np.pi * U, np.pi / 2 * V))
    out = np.stack([ndimage.map_coordinates(im[..., c], [px[..., 1], px[..., 0]], order=3, mode='nearest') for c in range(3)], -1)
    # 사진에 든 정도(가장자리 14화소에서 0 → 1)
    edge = np.minimum.reduce([px[..., 0], pw - 1 - px[..., 0], px[..., 1], ph - 1 - px[..., 1]])
    a = np.clip(edge / 10, 0, 1) * (z > 0)
    # 1) 사진이 잘라 낸 아래 귀퉁이(바깥 인물의 다리·종려나무 밑동)는 좌우 대칭 자리의 그림으로 잇는다(구도가 좌우 대칭)
    am = a[:, ::-1]; om = out[:, ::-1]
    out = out * a[..., None] + om * ((1 - a) * am)[..., None]; a2 = a + (1 - a) * am
    # 2) 그래도 빈 곳(맨 아래 양 귀퉁이): 사진의 금 바탕 한 띠(인물 머리 위)를 위아래로 접어 되풀이 + 아래 땅 띠(사진의 띠 한 토막을 되풀이). 경계는 넓게 번지게
    g0, g1 = int(th * 0.165), int(th * 0.255); band = out[g0:g1]; tile = np.concatenate([band, band[::-1]], 0)
    fill = np.concatenate([tile] * (th // tile.shape[0] + 1), 0)[:th].copy()
    y0 = int(th * 0.905); strip = out[y0:, int(tw * 0.20):int(tw * 0.215)]
    reps = int(np.ceil(tw / strip.shape[1] / 2)) + 1
    fill[y0:] = np.concatenate([strip, strip[:, ::-1]] * reps, 1)[:, :tw]
    a3 = np.clip(ndimage.gaussian_filter(np.where(a2 > 0.5, 1.0, 0.0), 6) * 2 - 1, 0, 1) * (a2 > 0)
    out = out * a3[..., None] + fill * (1 - a3[..., None])
    res = Image.fromarray(np.clip(out + 0.5, 0, 255).astype(np.uint8))
    if preview: res.save(os.path.join(preview, 'apse_tex.jpg'), quality=88)
    return save_webp(res, 'stpaul', 'apse_mosaic', 230, 80)
