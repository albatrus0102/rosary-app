#!/usr/bin/env python3
"""로사리움 런처 아이콘 만들기(법률 검토 M3: 기본 Flutter 로고 = Google 상표 대체).

원본: art/launcher_icon_src.png — 사용자가 ChatGPT 로 생성(2026-11-16), 짙은 갈색 바탕 + 금색 묵주 고리와 십자가(평면).

  python3 tools/make_launcher_icon.py            # 안드로이드(레거시 mipmap 5장, 적응형 아이콘) + iOS AppIcon 을 만든다
  python3 tools/make_launcher_icon.py --preview OUT.png   # 원형·스쿼클·48px 미리보기 시트

만드는 것
  * android/app/src/main/res/mipmap-*/ic_launcher.png            레거시(전체 그림, 48~192px)
  * android/app/src/main/res/mipmap-*/ic_launcher_foreground.png 적응형 전경: 금색 모양만 투명 바탕에(밝기 키), 108dp 캔버스의 66% 안전 영역에 맞춤
  * android/app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml   적응형(배경색 = 원본의 짙은 갈색)
  * android/app/src/main/res/values/ic_launcher_background.xml
  * ios/Runner/Assets.xcassets/AppIcon.appiconset/*.png          Contents.json 의 크기대로(불투명 정사각)
Pillow 필요.
"""
import os
import sys

from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'art', 'launcher_icon_src.png')
RES = os.path.join(ROOT, 'android', 'app', 'src', 'main', 'res')
LEGACY = {'mdpi': 48, 'hdpi': 72, 'xhdpi': 96, 'xxhdpi': 144, 'xxxhdpi': 192}
ADAPTIVE = {'mdpi': 108, 'hdpi': 162, 'xhdpi': 216, 'xxhdpi': 324, 'xxxhdpi': 432}
SAFE = 0.66


def load():
    return Image.open(SRC).convert('RGB')


def background(im):
    """바탕색: 네 모서리 평균."""
    w, h = im.size
    px = [im.getpixel(p) for p in ((4, 4), (w - 5, 4), (4, h - 5), (w - 5, h - 5))]
    return tuple(round(sum(c[i] for c in px) / 4) for i in range(3))


def foreground(im, bg):
    """금색 모양만 남긴 RGBA: 바탕 대비 밝기 키(부드러운 가장자리), 모양 둘레 상자로 자른다."""
    w, h = im.size
    out = Image.new('RGBA', im.size)
    src, dst = im.load(), out.load()
    bl = max(bg)
    for y in range(h):
        for x in range(w):
            r, g, b = src[x, y]
            v = max(r, g, b)
            a = (v - bl - 6) / 60.0  # 바탕보다 6 이상 밝아지기 시작해 66 에서 완전 불투명
            a = max(0.0, min(1.0, a))
            dst[x, y] = (r, g, b, round(a * 255))
    return out


def adaptive_fg(fg, px):
    """모양 둘레 상자를 캔버스(px)의 66% 안에 맞춰 가운데에 놓는다."""
    bbox = fg.getchannel('A').point(lambda a: 255 if a > 24 else 0).getbbox()
    shape = fg.crop(bbox)
    k = px * SAFE / max(shape.size)
    shape = shape.resize((max(1, round(shape.width * k)), max(1, round(shape.height * k))), Image.LANCZOS)
    canvas = Image.new('RGBA', (px, px), (0, 0, 0, 0))
    canvas.alpha_composite(shape, ((px - shape.width) // 2, (px - shape.height) // 2))
    return canvas


def write_android(im, bg):
    fg = foreground(im, bg)
    for dens, px in LEGACY.items():
        p = os.path.join(RES, f'mipmap-{dens}', 'ic_launcher.png')
        im.resize((px, px), Image.LANCZOS).save(p, optimize=True)
        print('wrote', os.path.relpath(p, ROOT))
    for dens, px in ADAPTIVE.items():
        p = os.path.join(RES, f'mipmap-{dens}', 'ic_launcher_foreground.png')
        adaptive_fg(fg, px).save(p, optimize=True)
        print('wrote', os.path.relpath(p, ROOT))
    hexbg = '#%02x%02x%02x' % bg
    os.makedirs(os.path.join(RES, 'mipmap-anydpi-v26'), exist_ok=True)
    with open(os.path.join(RES, 'mipmap-anydpi-v26', 'ic_launcher.xml'), 'w', encoding='utf-8') as f:
        f.write('<?xml version="1.0" encoding="utf-8"?>\n'
                '<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">\n'
                '    <background android:drawable="@color/ic_launcher_background"/>\n'
                '    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>\n'
                '</adaptive-icon>\n')
    with open(os.path.join(RES, 'values', 'ic_launcher_background.xml'), 'w', encoding='utf-8') as f:
        f.write('<?xml version="1.0" encoding="utf-8"?>\n<resources>\n'
                f'    <color name="ic_launcher_background">{hexbg}</color>\n</resources>\n')
    print('adaptive background', hexbg)


def write_ios(im):
    d = os.path.join(ROOT, 'ios', 'Runner', 'Assets.xcassets', 'AppIcon.appiconset')
    import json
    with open(os.path.join(d, 'Contents.json'), encoding='utf-8') as f:
        for e in json.load(f)['images']:
            size = float(e['size'].split('x')[0]) * int(e['scale'].rstrip('x'))
            px = round(size)
            im.resize((px, px), Image.LANCZOS).save(os.path.join(d, e['filename']), optimize=True)
    print('wrote iOS AppIcon')


def preview(im, bg, out):
    """원형 · 스쿼클 마스크의 적응형 아이콘, 레거시 48px 를 한 장에."""
    fg = adaptive_fg(foreground(im, bg), 432)
    base = Image.new('RGBA', (432, 432), bg + (255,))
    base.alpha_composite(fg)

    def masked(kind, px):
        m = Image.new('L', (432 * 4, 432 * 4), 0)
        d = ImageDraw.Draw(m)
        if kind == 'circle':
            d.ellipse([0, 0, 432 * 4 - 1, 432 * 4 - 1], fill=255)
        else:  # 스쿼클(초타원 n=4 근사: 큰 둥근 사각형)
            d.rounded_rectangle([0, 0, 432 * 4 - 1, 432 * 4 - 1], radius=int(432 * 4 * 0.30), fill=255)
        m = m.resize((px, px), Image.LANCZOS)
        t = base.resize((px, px), Image.LANCZOS)
        o = Image.new('RGBA', (px, px), (0, 0, 0, 0))
        o.paste(t, (0, 0), m)
        return o

    sheet = Image.new('RGBA', (1100, 460), (236, 233, 227, 255))
    sheet.alpha_composite(masked('circle', 400), (20, 20))
    sheet.alpha_composite(masked('squircle', 400), (440, 20))
    sheet.alpha_composite(im.resize((48, 48), Image.LANCZOS).convert('RGBA'), (880, 20))
    sheet.alpha_composite(masked('circle', 48), (880, 88))
    sheet.alpha_composite(masked('squircle', 48), (880, 156))
    d = ImageDraw.Draw(sheet)
    d.text((20, 430), 'circle mask / squircle mask (adaptive, 66% safe zone) / 48px: legacy, circle, squircle', fill=(60, 60, 60))
    sheet.convert('RGB').save(out)
    print('wrote', out)


def main():
    im = load()
    bg = background(im)
    if '--preview' in sys.argv:
        preview(im, bg, sys.argv[sys.argv.index('--preview') + 1])
        return 0
    write_android(im, bg)
    write_ios(im)
    return 0


if __name__ == '__main__':
    sys.exit(main())
