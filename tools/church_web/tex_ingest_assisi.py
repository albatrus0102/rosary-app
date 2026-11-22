# 아시시(assisi) 질감: 사용자가 ChatGPT 로 만든 T-26·T-27·T-28(2026-11-22, art/gpt_1122/tex/) → 심리스 확인·1024 리사이즈·노말/러프니스 유도
#   → art/church_tex_src/tex_assisi_{stone,vault,fresco}.jpg (+_n, stone 은 _r) → node tools/church_web/build_texpack.mjs --church assisi
# 고른 판(장면에서 비교, docs/church/interiors/assisi.md §질감): T-26 A(분홍·흰 돌이 섞인 수바시오 돌), T-27 B(이음매 없음, 작은 별이 궁륭 크기에 맞다),
# T-28 A(채도 낮은 황토 회벽 — B 는 붉은 얼룩이 강하다).
# 사용: python3 tools/church_web/tex_ingest_assisi.py
import os, sys
import numpy as np
from PIL import Image
from scipy.ndimage import gaussian_filter

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '../..'))
SRC = os.path.join(ROOT, 'art/gpt_1122/tex')
OUT = os.path.join(ROOT, 'art/church_tex_src')

def load(n): return np.array(Image.open(os.path.join(SRC, n)).convert('RGB')).astype(np.float32)
def resize(a, w):
    return np.array(Image.fromarray(np.clip(a, 0, 255).astype(np.uint8)).resize((w, w), Image.LANCZOS)).astype(np.float32)
def luma(a): return a[..., 0] * 0.299 + a[..., 1] * 0.587 + a[..., 2] * 0.114
def seam(a):
    """가장자리(맞닿는 줄) 차 대 안쪽 이웃 줄 차 — 이음매 점검(오프셋 블렌드가 필요한가)"""
    e = (np.abs(a[0] - a[-1]).mean() + np.abs(a[:, 0] - a[:, -1]).mean()) / 2
    i = (np.abs(a[1] - a[2]).mean() + np.abs(a[:, 1] - a[:, 2]).mean()) / 2
    return e, i
def xfade(a, b):
    """이음매 보정: 마지막 b 줄을 처음 b 줄과 섞어 이어지게(가로·세로). 크기는 b 만큼 줄어든다"""
    def ax0(x):
        W = x.shape[0]; Wp = W - b; out = x[:Wp].copy()
        t = np.arange(b, dtype=np.float32) / b; t = (t * t * (3 - 2 * t))[:, None, None]
        out[:b] = t * x[:b] + (1 - t) * x[Wp:Wp + b]
        return out
    a = ax0(a)
    return ax0(a.transpose(1, 0, 2)).transpose(1, 0, 2)
def normal(h, strength, blur=0.8):
    h = gaussian_filter(h, blur, mode='wrap')
    gx = (np.roll(h, -1, 1) - np.roll(h, 1, 1)) * 0.5
    gy = (np.roll(h, -1, 0) - np.roll(h, 1, 0)) * 0.5
    nx = -gx * strength; ny = gy * strength; nz = np.ones_like(h)
    l = np.sqrt(nx * nx + ny * ny + nz * nz)
    return ((np.stack([nx / l, ny / l, nz / l], -1) * 0.5 + 0.5) * 255).astype(np.uint8)
def save(a, name, q=82, mode='RGB'):
    im = Image.fromarray(np.clip(a, 0, 255).astype(np.uint8))
    if mode == 'L': im = im.convert('L')
    im.save(os.path.join(OUT, name), 'JPEG', quality=q, optimize=True)

def run():
    os.makedirs(OUT, exist_ok=True)
    report = []
    # T-26 수바시오 돌(벽·기둥·바닥 테두리): 1024, 노말 강하게(줄눈), 러프니스 = 밝기 반전
    a = load('T-26_subasio_A.jpg'); e, i = seam(a); report.append(('T-26 A', e, i))
    a = resize(a, 1024)
    save(a, 'tex_assisi_stone.jpg')
    L = luma(a) / 255.0
    save(normal(L * 255.0, 0.055, 1.0), 'tex_assisi_stone_n.jpg', 70)
    r = 0.72 + 0.22 * (1 - (L - L.min()) / (L.max() - L.min() + 1e-6))
    save(r * 255.0, 'tex_assisi_stone_r.jpg', 78, 'L')
    # T-27 별 궁륭: 1024, 노말 약하게(갈라진 회벽)
    a = load('T-27_starvault_B.jpg'); e, i = seam(a); report.append(('T-27 B', e, i))
    if e > i * 1.3: a = xfade(a, 48)
    a = resize(a, 1024)
    save(a, 'tex_assisi_vault.jpg', 84)
    save(normal(luma(a), 0.02, 1.2), 'tex_assisi_vault_n.jpg', 68)
    # T-28 빛바랜 회벽(그림 칸 바탕·민 회벽·벽 위 칸): 1024, 노말 약하게
    a = load('T-28_fresco_plain_A.jpg'); e, i = seam(a); report.append(('T-28 A', e, i))
    if e > i * 1.3: a = xfade(a, 48)
    a = resize(a, 1024)
    save(a, 'tex_assisi_fresco.jpg')
    save(normal(luma(a), 0.025, 1.2), 'tex_assisi_fresco_n.jpg', 68)
    for n, e, i in report: print('%s 가장자리 차 %.1f / 안쪽 %.1f' % (n, e, i))

if __name__ == '__main__':
    run()
