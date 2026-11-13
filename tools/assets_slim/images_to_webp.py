#!/usr/bin/env python3
"""assets/images 의 묵주 PNG 를 WebP 로 바꿔 APK 용량을 줄인다(저장소 루트에서 실행).

    python3 tools/assets_slim/images_to_webp.py

- 원본 PNG 는 art/images_src/ 로 옮겨 보존한다(되돌리기: 다시 assets/images/ 로 옮기고
  lib/app/rosary_style.dart · lib/auth/login_screen.dart 의 확장자를 .png 로).
- 전체 묵주 사진(rosary*.png, 600~1000px): 손실 q88 (원본과 평균 오차 약 1/255, 눈으로 구분 안 됨).
- 구슬 하나(256px, 투명 배경): 손실 q94 + 알파 무손실.
- 코드가 읽지 않는 station_NN.jpg(십자가의 길)·mystery_*.jpg(신비 그림)는 art/images_unused/ 로 옮긴다.
Pillow 필요.
"""
import glob
import os
import shutil

from PIL import Image

REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
IMAGES = os.path.join(REPO, 'assets', 'images')
SRC = os.path.join(REPO, 'art', 'images_src')
UNUSED = os.path.join(REPO, 'art', 'images_unused')


def main():
    os.makedirs(SRC, exist_ok=True)
    os.makedirs(UNUSED, exist_ok=True)
    before = after = 0
    for f in sorted(glob.glob(os.path.join(IMAGES, '*.png'))):
        im = Image.open(f)
        im.load()
        out = f[:-4] + '.webp'
        if im.width <= 256:
            im.save(out, 'WEBP', quality=94, alpha_quality=100, method=6)
        else:
            im.convert('RGB').save(out, 'WEBP', quality=88, method=6)
        before += os.path.getsize(f)
        after += os.path.getsize(out)
        shutil.move(f, os.path.join(SRC, os.path.basename(f)))
    moved = 0
    for pat in ('station_*.jpg', 'mystery_*.jpg'):
        for f in sorted(glob.glob(os.path.join(IMAGES, pat))):
            moved += os.path.getsize(f)
            shutil.move(f, os.path.join(UNUSED, os.path.basename(f)))
    print('png -> webp: %.2f MB -> %.2f MB; unused jpg moved out: %.2f MB' % (before / 1e6, after / 1e6, moved / 1e6))


if __name__ == '__main__':
    main()
