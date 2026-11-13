#!/usr/bin/env python3
"""십자가의 길·신비 배경 그림을 번들용 WebP 로 줄인다(원본은 번들 밖 art/images_unused/ 에 둔다).

출력
  assets/images/stations/station_NN.webp   가로 600px, 장당 40KB 이하(묵상 시트·고통의 신비 배경 3·4·5단)
  assets/images/mysteries/<set>_<n>.webp   짧은 변 540px(긴 변 900px 이하), 장당 32KB 이하(기도 화면 배경)
                                           고통의 신비 3·4·5단은 십자가의 길 그림(1·2·12처)을 쓰므로 만들지 않는다.
  assets/church/cross_pack.js              성당 3D 14처 판용 그림 아틀라스(7×2칸, 칸 240×296) WebP data URI
                                           (file:// WebView 에서는 WebGL 이 같은 폴더 그림도 막으므로 <script> 로 싣는다)
출처·라이선스: docs/ux/ART_REFERENCES.md (모두 Public domain 또는 CC0).

사용: python3 tools/stations/build_art.py
"""
import base64
import io
import os

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SRC = os.path.join(ROOT, 'art', 'images_unused')
OUT_ST = os.path.join(ROOT, 'assets', 'images', 'stations')
OUT_MY = os.path.join(ROOT, 'assets', 'images', 'mysteries')
OUT_PACK = os.path.join(ROOT, 'assets', 'church', 'cross_pack.js')

SETS = ['joyful', 'luminous', 'sorrowful', 'glorious']
SKIP = {('sorrowful', 3), ('sorrowful', 4), ('sorrowful', 5)}
CELL_W, CELL_H, COLS = 240, 296, 7


def webp_under(img, limit, q0=82, qmin=30):
    q = q0
    while True:
        b = io.BytesIO()
        img.save(b, 'WEBP', quality=q, method=6)
        if b.tell() <= limit or q <= qmin:
            return b.getvalue(), q
        q -= 4


def main():
    os.makedirs(OUT_ST, exist_ok=True)
    os.makedirs(OUT_MY, exist_ok=True)
    total = 0
    atlas = Image.new('RGB', (CELL_W * COLS, CELL_H * 2), (40, 32, 28))
    for n in range(1, 15):
        im = Image.open(os.path.join(SRC, f'station_{n:02d}.jpg')).convert('RGB')
        w, h = im.size
        big = im.resize((600, round(h * 600 / w)), Image.LANCZOS)
        data, q = webp_under(big, 40 * 1024)
        with open(os.path.join(OUT_ST, f'station_{n:02d}.webp'), 'wb') as f:
            f.write(data)
        total += len(data)
        print(f'station_{n:02d}.webp {big.size} q{q} {len(data)}B')
        # 아틀라스 칸: 비율(약 0.81)이 칸과 같으므로 가운데를 맞춰 채운다(가장자리 1~2px 잘림)
        s = max(CELL_W / w, CELL_H / h)
        cell = im.resize((round(w * s), round(h * s)), Image.LANCZOS)
        cx, cy = (cell.width - CELL_W) // 2, (cell.height - CELL_H) // 2
        cell = cell.crop((cx, cy, cx + CELL_W, cy + CELL_H))
        i = n - 1
        atlas.paste(cell, ((i % COLS) * CELL_W, (i // COLS) * CELL_H))
    for st in SETS:
        for n in range(1, 6):
            if (st, n) in SKIP:
                continue
            im = Image.open(os.path.join(SRC, f'mystery_{st}_{n}.jpg')).convert('RGB')
            w, h = im.size
            s = 540 / min(w, h)
            if max(w, h) * s > 900:
                s = 900 / max(w, h)
            sm = im.resize((round(w * s), round(h * s)), Image.LANCZOS)
            data, q = webp_under(sm, 32 * 1024, q0=72)
            with open(os.path.join(OUT_MY, f'{st}_{n}.webp'), 'wb') as f:
                f.write(data)
            total += len(data)
            print(f'{st}_{n}.webp {sm.size} q{q} {len(data)}B')
    data, q = webp_under(atlas, 150 * 1024, q0=80)
    with open(os.path.join(ROOT, 'art', 'images_unused', 'cross_atlas.webp'), 'wb') as f:
        f.write(data)
    js = ('/* cross_pack.js — 생성 파일(tools/stations/build_art.py). 십자가의 길 14처 그림 아틀라스(7×2칸, 칸 %dx%d),\n'
          '   게프하르트 푸겔 〈십자가의 길〉(1921), 사진 Andreas Praefcke, Public domain (docs/ux/ART_REFERENCES.md §3). */\n'
          'window.ChurchCrossPack = { cols: %d, rows: 2, cellW: %d, cellH: %d, w: %d, h: %d, src: "data:image/webp;base64,%s" };\n'
          % (CELL_W, CELL_H, COLS, CELL_W, CELL_H, atlas.width, atlas.height, base64.b64encode(data).decode('ascii')))
    with open(OUT_PACK, 'w', encoding='ascii') as f:
        f.write(js)
    total += len(js)
    print(f'cross_pack.js atlas {atlas.size} q{q} webp {len(data)}B js {len(js)}B')
    print('total', total)


if __name__ == '__main__':
    main()
