#!/usr/bin/env python3
"""로사리움 런처 아이콘(자체 제작): 짙은 갈색 바탕(#1c1611) 위에 금색(#d9b25c) 묵주 고리와 그 아래 작은 십자가.

법률 검토 M3: 기본 Flutter 로고(Google 상표)를 대체한다. 사용자가 나중에 다른 그림으로 바꿀 수 있다.

  python3 tools/make_launcher_icon.py            # android/app/src/main/res/mipmap-*/ic_launcher.png 5장 + art/launcher_icon_1024.png
  python3 tools/make_launcher_icon.py --check    # 파일이 있고 크기가 맞는지만 확인(시험용)

Pillow 필요. 1024px 로 4배 확대해 그린 뒤 줄여 가장자리를 매끈하게 한다.
"""
import math
import os
import sys

from PIL import Image, ImageDraw

BG = (0x1C, 0x16, 0x11)
GOLD = (0xD9, 0xB2, 0x5C)
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SIZES = {'mdpi': 48, 'hdpi': 72, 'xhdpi': 96, 'xxhdpi': 144, 'xxxhdpi': 192}


def draw(size: int) -> Image.Image:
    """size×size 아이콘(RGB)."""
    k = 4
    s = size * k
    im = Image.new('RGB', (s, s), BG)
    d = ImageDraw.Draw(im)
    cx, cy, r = s * 0.5, s * 0.40, s * 0.27
    ring_w = s * 0.045
    # 고리
    d.ellipse([cx - r - ring_w / 2, cy - r - ring_w / 2, cx + r + ring_w / 2, cy + r + ring_w / 2], outline=GOLD, width=round(ring_w))
    # 구슬: 열 알(다섯 알마다 큰 알)
    n = 20
    for i in range(n):
        a = -math.pi / 2 + i * 2 * math.pi / n
        big = i % 5 == 0
        br = s * (0.058 if big else 0.040)
        x, y = cx + r * math.cos(a), cy + r * math.sin(a)
        d.ellipse([x - br, y - br, x + br, y + br], fill=GOLD)
    # 고리 아래 사슬과 십자가
    bx, by = cx, cy + r
    top = by + s * 0.05
    d.line([bx, by, bx, top], fill=GOLD, width=round(s * 0.03))
    arm = s * 0.095   # 가로팔 반폭
    stem = s * 0.20   # 세로 길이
    t = s * 0.045     # 굵기
    d.rounded_rectangle([bx - t / 2, top, bx + t / 2, top + stem], radius=t * 0.2, fill=GOLD)
    cy2 = top + stem * 0.32
    d.rounded_rectangle([bx - arm, cy2 - t / 2, bx + arm, cy2 + t / 2], radius=t * 0.2, fill=GOLD)
    return im.resize((size, size), Image.LANCZOS)


def main() -> int:
    res = os.path.join(ROOT, 'android', 'app', 'src', 'main', 'res')
    if '--check' in sys.argv:
        ok = True
        for dens, px in SIZES.items():
            p = os.path.join(res, f'mipmap-{dens}', 'ic_launcher.png')
            if not os.path.exists(p) or Image.open(p).size != (px, px):
                print('불일치:', p)
                ok = False
        return 0 if ok else 1
    for dens, px in SIZES.items():
        p = os.path.join(res, f'mipmap-{dens}', 'ic_launcher.png')
        draw(px).save(p, optimize=True)
        print('wrote', os.path.relpath(p, ROOT), px)
    big = os.path.join(ROOT, 'art', 'launcher_icon_1024.png')
    os.makedirs(os.path.dirname(big), exist_ok=True)
    draw(1024).save(big, optimize=True)
    print('wrote', os.path.relpath(big, ROOT))
    return 0


if __name__ == '__main__':
    sys.exit(main())
