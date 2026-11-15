#!/usr/bin/env python3
"""성모상 그림(투명 배경 PNG, art/statues/*.png) → '돌에 조각한 입체'용 깊이 + 색 묶음.

  python3 tools/statues/make_statue3d.py [--preview DIR]

출력: assets/church/statue3d_<key>.js  (shrine.js 가 그 성당에 들어올 때만 읽는다)
  { w,h,src: 색 webp(512×1024, 알파, 가장자리 색 번짐 + 약한 디라이팅), dw,dh,depth: 깊이 PNG(R=상위·G=하위 8bit = 16bit 깊이,
    B = 윤곽까지 부호 거리), zmax(m) }
깊이 = 실루엣 부풀림 + 그림 밝기의 대역 통과(옷 주름·얼굴·손의 요철). 외부 모델 없이 그림만으로 만든다.
 1) 부풀림: 실루엣 안에서 ∇²h = -2 (가장자리 h=0)를 풀고 sqrt(h) → 폭 w 인 띠의 단면이 반지름 w/2 반원(머리·팔·몸통이
    폭에 따라 저절로 둥글어진다). 몸통처럼 넓은 곳은 tanh 로 눌러 앞뒤 두께를 실제 성상 비율(앞쪽 반 ≈ 0.15m)로.
 2) 요철: 밝기(HSV 명도 — 푸른 망토가 흰 옷보다 '꺼져' 보이지 않게)의 대역 통과(σ 1.5–10px, 10–40px)를 더한다.
    밝은 곳 = 앞으로, 그늘진 주름 골 = 안으로. 가장자리 8px 안에서는 0 으로 줄여 실루엣이 찢어지지 않게.
 3) 디라이팅: 그림에 구운 큰 음영(σ 40px)을 일부(45%) 나눠 빼 실시간 조명과 겹치지 않게. 잔주름 음영은 남긴다(메시가 못 그리는 세부).
"""
import base64, io, os, sys
import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage, sparse
from scipy.sparse.linalg import spsolve

REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
STATUES = {
    'plain_white': ('mary_plain_white', '흰 돌 성모(소박한 형태) — 당고개'),
    'immaculate_blue': ('mary_immaculate_blue', '푸른 망토·열두 별 관의 원죄 없으신 성모 — 우리 본당·라테라노·성 바오로·밀라노·피렌체'),
    'hanbok_rosary': ('mary_hanbok_rosary', '한복 차림에 묵주를 든 성모 — 명동'),
}
H_M = 1.42                 # 성상 높이(m) — shrine.js STATUE.H 와 같게
DW, DH = 112, 224          # 깊이 격자(정점 하나 = 픽셀 하나)
WW, WH = 256, 512          # 깊이 계산 해상도
FRONT = 0.2                # 넓은 몸통의 앞쪽 반 두께 상한(m, tanh 무릎)
DETAIL = (0.018, 0.022)    # 밝기 대역 통과 두 층의 세기(m / 명도 1.0)


def poisson_inflate(mask):
    h, w = mask.shape
    idx = -np.ones(mask.shape, np.int64)
    ys, xs = np.nonzero(mask)
    idx[ys, xs] = np.arange(len(ys))
    n = len(ys)
    rows, cols, vals = [np.arange(n)], [np.arange(n)], [np.full(n, 4.0)]
    for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
        yy, xx = ys + dy, xs + dx
        ok = (yy >= 0) & (yy < h) & (xx >= 0) & (xx < w)
        j = np.full(n, -1); j[ok] = idx[yy[ok], xx[ok]]
        m = j >= 0
        rows.append(np.arange(n)[m]); cols.append(j[m]); vals.append(np.full(m.sum(), -1.0))
    A = sparse.csr_matrix((np.concatenate(vals), (np.concatenate(rows), np.concatenate(cols))), shape=(n, n))
    sol = spsolve(A, np.full(n, 2.0))
    out = np.zeros(mask.shape); out[ys, xs] = np.maximum(sol, 0)
    return out


def build(key, preview=None):
    name, note = STATUES[key]
    src = Image.open(os.path.join(REPO, 'art/statues', name + '.png')).convert('RGBA')
    m_per_px = H_M / WH
    # --- 실루엣·밝기(작업 해상도) ---
    im = src.resize((WW, WH), Image.LANCZOS)
    a = np.asarray(im, np.float64)[..., 3] / 255
    mask = a > 0.5
    lab = ndimage.label(mask)[0]                       # 떨어진 작은 조각(별 관 사이 티끌 등)은 버리지 않고 그대로 — 부풀림이 작게 처리
    rgb = np.asarray(im, np.float64)[..., :3] / 255
    val = rgb.max(-1)
    # 실루엣 밖은 가장자리 명도로 채워 흐림이 가장자리에서 꺾이지 않게
    _, (iy, ix) = ndimage.distance_transform_edt(~mask, return_indices=True)
    valf = val[iy, ix]
    # --- 1) 부풀림 ---
    h = poisson_inflate(mask)
    r = np.sqrt(h) * m_per_px                          # 반원 단면 높이(m)
    base = FRONT * np.tanh(r * 0.8 / FRONT)           # 좁은 곳(머리·팔)은 반원의 0.8배, 넓은 몸통은 FRONT 에 수렴
    # --- 2) 요철 ---
    g = lambda s: ndimage.gaussian_filter(valf, s)
    b1, b2 = g(1.5) - g(10), g(10) - g(40)
    dist = ndimage.distance_transform_edt(mask)
    fade = np.clip(dist / 8, 0, 1); fade = fade * fade * (3 - 2 * fade)
    depth = np.where(mask, base + (DETAIL[0] * b1 + DETAIL[1] * b2) * fade, 0)
    depth = np.maximum(depth, 0)
    # --- 격자 해상도로(정점 = 픽셀) ---
    dsm = ndimage.zoom(depth, (DH / WH, DW / WW), order=1)
    msm = ndimage.zoom(mask.astype(float), (DH / WH, DW / WW), order=1) > 0.5
    dsm = np.where(msm, np.maximum(dsm, 0.002), 0)     # 안쪽 정점은 0 보다 크게(0 = 실루엣 밖)
    zmax = float(dsm.max()) * 1.001
    q = np.round(dsm / zmax * 65535).astype(np.int64)
    q[msm & (q == 0)] = 1
    # 실루엣까지의 부호 거리(격자 칸 단위, 바깥 +) — 원본 해상도에서 재서 정점 자리로 표본. shrine.js 가 바깥 고리 정점을
    # 이 거리만큼 기울기 반대로 옮겨 메시 가장자리를 실제 윤곽에 붙인다(격자 계단 → 옆에서 볼 때 톱니가 생기던 것).
    fa = np.asarray(src, np.float64)[..., 3] / 255 > 0.5
    sd = ndimage.distance_transform_edt(~fa) - ndimage.distance_transform_edt(fa)
    sd = ndimage.gaussian_filter(sd, 1.0)
    gy, gx = np.mgrid[0:DH, 0:DW].astype(np.float64)
    cell = (src.width - 1) / (DW - 1)
    sdg = ndimage.map_coordinates(sd, [gy * (src.height - 1) / (DH - 1), gx * cell], order=1) / cell
    dimg = np.zeros((DH, DW, 3), np.uint8); dimg[..., 0] = q >> 8; dimg[..., 1] = q & 255
    dimg[..., 2] = np.clip(np.round(128 + sdg * 60), 0, 255)
    buf = io.BytesIO(); Image.fromarray(dimg, 'RGB').save(buf, 'PNG', optimize=True); dpng = buf.getvalue()
    # --- 3) 색: 디라이팅 + 가장자리 색 번짐(512×1024) ---
    cim = src.resize((512, 1024), Image.LANCZOS)
    c = np.asarray(cim, np.float64) / 255
    ca = c[..., 3]; cm = ca > 0.5
    lum = c[..., :3].max(-1)
    _, (cy, cx) = ndimage.distance_transform_edt(~cm, return_indices=True)
    lumf = lum[cy, cx]
    big = ndimage.gaussian_filter(lumf, 80)
    gain = (np.clip(big, 0.2, 1) / np.mean(big[cm])) ** -0.45
    col = np.clip(c[..., :3] * gain[..., None], 0, 1)
    col = col[cy, cx]                                   # 실루엣 밖 RGB = 가장 가까운 가장자리 색(필터링 시 검은 테 없음, 옆면은 가장자리 색이 늘어남)
    # 두꺼운 몸(몸통·팔·머리)은 알파를 반 칸쯤 넓혀 실루엣을 메시 가장자리(윤곽에 붙인 정점)가 정하게 한다 — 가파른 옆면에서
    # 알파 경계가 잘리면 옆에서 볼 때 톱니가 된다. 별 관·손가락 틈처럼 가는 곳은 원래 알파 그대로(메시 격자보다 가늘다).
    disk = lambda r: (np.hypot(*np.mgrid[-r:r + 1, -r:r + 1]) <= r)
    thick = ndimage.binary_opening(cm, disk(6))
    grow = ndimage.binary_dilation(thick, disk(4))
    ca = np.maximum(ca, ndimage.gaussian_filter(grow.astype(float), 0.7))
    out = np.dstack([col, ca])
    cbuf = io.BytesIO()
    Image.fromarray(np.round(out * 255).astype(np.uint8), 'RGBA').save(cbuf, 'WEBP', quality=80, alpha_quality=90, method=6, exact=True)
    cwebp = cbuf.getvalue()
    js = ('/* statue3d_' + key + '.js — 생성 파일(tools/statues/make_statue3d.py). ' + note + '.\n'
          '   AI 생성 성모상 그림(ChatGPT, 사용자 제공, art/statues/' + name + '.png; 출처 docs/church/ASSET_LICENSES.md \'AI 생성 성모상\')에서\n'
          '   만든 색(512×1024 webp, 디라이팅·가장자리 번짐) + 깊이(' + str(DW) + '×' + str(DH) + ' PNG, R·G = 16bit 깊이·0 = 실루엣 밖, B = 윤곽까지 부호 거리 128±60/칸). shrine.js 가 변위 메시로 세운다. */\n'
          '((window.ChurchArt = window.ChurchArt || {}).statues3d = window.ChurchArt.statues3d || {}).' + key +
          ' = { w: 512, h: 1024, dw: ' + str(DW) + ', dh: ' + str(DH) + ', zmax: ' + ('%.4f' % zmax) + ', H: ' + str(H_M) +
          ',\n  src: "data:image/webp;base64,' + base64.b64encode(cwebp).decode() + '",\n  depth: "data:image/png;base64,' + base64.b64encode(dpng).decode() + '" };\n')
    with open(os.path.join(REPO, 'assets/church/statue3d_' + key + '.js'), 'w') as f:
        f.write(js)
    print('statue3d_%s.js  %.1fKB (webp %.1fKB, depth png %.1fKB)  zmax %.3fm  inside verts %d' % (key, len(js) / 1024, len(cwebp) / 1024, len(dpng) / 1024, zmax, msm.sum()))
    if preview:
        os.makedirs(preview, exist_ok=True)
        dv = depth / depth.max()
        # 깊이 회색조 + 왼쪽 위 빛으로 음영(형태 확인용)
        gy, gx = np.gradient(depth / m_per_px)
        nz = 1 / np.sqrt(1 + gx * gx + gy * gy)
        shade = np.clip((-gx * -0.5 + -gy * -0.6 + 0.62) * nz, 0, 1) * mask
        Image.fromarray(np.uint8(np.hstack([dv, shade]) * 255)).save(os.path.join(preview, key + '_depth.png'))
        Image.fromarray(np.round(out * 255).astype(np.uint8), 'RGBA').save(os.path.join(preview, key + '_color.png'))


if __name__ == '__main__':
    pv = sys.argv[sys.argv.index('--preview') + 1] if '--preview' in sys.argv else None
    for k in STATUES:
        build(k, pv)
