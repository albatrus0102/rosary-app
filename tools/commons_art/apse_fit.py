#!/usr/bin/env python3
"""성 밖 성 바오로 후진 모자이크 사진(아래에서 올려다본 원근)을 앱의 반돔(반지름 r, 높이 rise 의 타원체 반쪽) 곡면에 맞추는 카메라 맞춤.

반돔 점 P(φ, el) = (cos el·sin φ, k·sin el, −cos el·cos φ)  (k = rise / r, φ −90°…90°, el 0…90°; ch_stpaul.js 의 후진 반돔과 같은 매개변수)
사진 속 표지(가장자리 띠·발밑 땅 띠·꼭대기 부채 장식·좌우 대칭 인물)를 바늘구멍 카메라로 되비춰 맞춘다 → make_commons_art.py 가 이 값으로 사진을 (φ, el) 격자에 편다.
  python3 tools/commons_art/apse_fit.py [사진]   # 맞춤 값과 오차를 찍는다(값은 make_commons_art.py 의 APSE_CAM 에 적어 둔다)
"""
import sys
import numpy as np
from scipy.optimize import least_squares

K = 5.2 / 6.6
W, H = 1500, 1000
# 사진 표지(05_B, 1500×1000 기준 화소)
RIM_IN = [(0, 255), (100, 215), (200, 180), (300, 140), (400, 105), (500, 75)]          # 가장자리 띠 안쪽 끝
GROUND = [(0, 930), (100, 950), (180, 965), (1150, 870), (1250, 820), (1350, 765), (1450, 705), (1500, 670)]   # 발밑 마름모 띠 윗선
FAN = (700, -5)                                                                          # 꼭대기 부채 장식 중심 = 반돔 정점(가장자리 아치의 꼭대기)
CHRIST = (750, 385)                                                                      # 그리스도 후광 중심(φ = 0 자오선 위)
PAIRS = [((485, 495), (1035, 365)), ((300, 425), (1175, 235))]                           # 좌우 대칭 인물의 후광 중심


def dome(phi, el):
    return np.stack([np.cos(el) * np.sin(phi), K * np.sin(el), -np.cos(el) * np.cos(phi)], -1)


def rot(yaw, pitch, roll):
    cy, sy, cp, sp, cr, sr = np.cos(yaw), np.sin(yaw), np.cos(pitch), np.sin(pitch), np.cos(roll), np.sin(roll)
    Ry = np.array([[cy, 0, sy], [0, 1, 0], [-sy, 0, cy]]); Rx = np.array([[1, 0, 0], [0, cp, -sp], [0, sp, cp]]); Rz = np.array([[cr, -sr, 0], [sr, cr, 0], [0, 0, 1]])
    return Rz @ Rx @ Ry


def project(cam, P):
    """cam = (cx, cy, cz, yaw, pitch, roll, f). 카메라는 −z(후진 쪽)를 본다. 화소 좌표를 돌려준다."""
    C = np.asarray(cam[:3]); R = rot(*cam[3:6]); f = cam[6]
    q = (np.asarray(P) - C) @ R.T
    z = -q[..., 2]
    return np.stack([W / 2 + f * q[..., 0] / z, H / 2 - f * q[..., 1] / z], -1), z


def curve_dist(cam, curve, pts):
    c, _ = project(cam, curve)
    d = np.linalg.norm(c[None, :, :] - np.asarray(pts, float)[:, None, :], axis=2)
    return d.min(1)


def residuals(p):
    cam = p[:7]; t_in, e0, pe1, pp1, pe2, pp2 = p[7:13]
    el = np.linspace(0, np.pi / 2, 160)
    r = []
    # 가장자리 띠 안쪽 끝: 앞 평면에서 깊이 t_in 인 곡선(cos el·cos φ = t_in), 왼쪽(φ<0)
    phi_in = -np.arccos(np.clip(t_in / np.maximum(np.cos(el), 1e-6), -1, 1))
    r += list(curve_dist(cam, dome(phi_in, el), RIM_IN))
    ph = np.linspace(-np.pi / 2, np.pi / 2, 240)
    r += list(curve_dist(cam, dome(ph, np.full_like(ph, e0)), GROUND))
    fan, _ = project(cam, dome(np.array(0.0), np.array(np.pi / 2)))
    r += list((fan - np.array(FAN)) * 1.0)
    r += list(curve_dist(cam, dome(np.zeros_like(el), el), [CHRIST]) * 2)
    for (a, b), (pe, pp) in zip(PAIRS, ((pe1, pp1), (pe2, pp2))):
        pa, _ = project(cam, dome(np.array(-pp), np.array(pe))); pb, _ = project(cam, dome(np.array(pp), np.array(pe)))
        r += list(pa - np.array(a)) + list(pb - np.array(b))
    return np.array(r)


def fit():
    best = None
    for cy, pt in ((-1.0, -0.6), (-0.5, -0.4), (-1.0, 0.6)):
        for cz in (0.5, 1.5):
            p0 = [0, cy, cz, 0, pt, 0, 900, 0.08, 0.15, 0.6, 0.45, 0.75, 0.95]
            lo = [-1.5, -3, -0.6, -1, -1.5, -0.8, 300, 0.0, 0.0, 0.1, 0.05, 0.1, 0.3]
            hi = [1.5, 0.3, 4, 1, 1.5, 0.8, 4000, 0.4, 0.6, 1.4, 1.4, 1.4, 1.5]
            try:
                s = least_squares(residuals, p0, bounds=(lo, hi), loss='soft_l1', f_scale=6)
            except Exception as e:
                continue
            if best is None or s.cost < best.cost: best = s
    return best


if __name__ == '__main__':
    s = fit()
    np.set_printoptions(precision=5, suppress=True)
    print('cost', s.cost, 'rms px', np.sqrt(np.mean(residuals(s.x) ** 2)))
    print('APSE_CAM =', [round(float(v), 5) for v in s.x[:7]])
    print('t_in, e0 =', s.x[7:9], 'pairs', s.x[9:])
