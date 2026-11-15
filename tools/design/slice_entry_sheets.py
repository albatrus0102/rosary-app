#!/usr/bin/env python3
"""ChatGPT 등으로 만든 3x3 시트를 성당별 입구 화면 자산으로 자른다.

사용:
  python3 -I tools/design/slice_entry_sheets.py exterior <외관 시트.png>   # -> thumb_<id>.webp (4:3, 폭 480)
  python3 -I tools/design/slice_entry_sheets.py interior <내부 시트.png>   # -> hero_<id>.webp  (16:9, 폭 1280)
  python3 -I tools/design/slice_entry_sheets.py bg <배경 장식.png>          # -> bg_glow.webp    (폭 1280)
  python3 -I tools/design/slice_entry_sheets.py rail <레일 장식.png>        # -> rail_decor.webp (폭 360)

시트는 3x3 격자이고 칸 순서(왼쪽 위부터 가로로)는 --ids 로 바꿀 수 있다. 기본:
  1 우리 본당(basic)  2 성 베드로(stpeter)  3 라테라노(lateran)
  4 성 마리아 마조레(maggiore)  5 성 밖의 성 바오로(stpaul)  6 밀라노(milan)
  7 피렌체(florence)  8 명동(myeongdong)  9 당고개 순교성지(danggogae)

각 칸은 가장자리(--inset, 칸 크기 대비 비율)를 잘라 낸 뒤 목표 비율로 가운데를 잘라 줄인다.
결과는 assets/images/church_entry/ 에 같은 이름으로 덮어쓴다. 앱은 파일만 있으면 그 그림을 쓰고
(lib/church/church_entry_art.dart), 없으면 3D 렌더 샷(render_<id>.webp, tools/church_web/entry_shots.mjs)
으로 대신한다. 잘라 낸 뒤 hero 가 생긴 성당의 render_<id>.webp 는 지워도 된다(용량).
카탈로그(lib/church/church_catalog.dart)에 없는 id 의 파일은 쓰이지 않을 뿐 해롭지 않다.
"""
import argparse
import os
import sys

from PIL import Image

DEFAULT_IDS = ['basic', 'stpeter', 'lateran', 'maggiore', 'stpaul', 'milan', 'florence', 'myeongdong', 'danggogae']
KINDS = {
    # 종류: (파일 이름 틀, 가로:세로, 최대 폭, WebP 품질)
    'exterior': ('thumb_{id}.webp', 4 / 3, 480, 80),
    'interior': ('hero_{id}.webp', 16 / 9, 1280, 78),
}
SINGLES = {'bg': ('bg_glow.webp', 1280, 80), 'rail': ('rail_decor.webp', 360, 84)}


def center_crop(img, aspect):
    w, h = img.size
    if w / h > aspect:
        nw = round(h * aspect)
        x = (w - nw) // 2
        return img.crop((x, 0, x + nw, h))
    nh = round(w / aspect)
    y = (h - nh) // 2
    return img.crop((0, y, w, y + nh))


def fit_width(img, max_w):
    if img.size[0] <= max_w:
        return img
    return img.resize((max_w, round(img.size[1] * max_w / img.size[0])), Image.LANCZOS)


def save(img, path, quality):
    img.convert('RGB').save(path, 'WEBP', quality=quality, method=6)
    print(f'{os.path.relpath(path)}  {img.size[0]}x{img.size[1]}  {os.path.getsize(path) / 1024:.1f}KB')


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('kind', choices=[*KINDS, *SINGLES])
    ap.add_argument('image')
    ap.add_argument('--ids', default=','.join(DEFAULT_IDS), help='칸 순서대로 쉼표로 나눈 성당 id(건너뛸 칸은 -)')
    ap.add_argument('--rows', type=int, default=3)
    ap.add_argument('--cols', type=int, default=3)
    ap.add_argument('--inset', type=float, default=0.02, help='칸 가장자리에서 잘라 낼 비율(격자 선·여백 제거)')
    ap.add_argument('--out', default=os.path.join(os.path.dirname(__file__), '../../assets/images/church_entry'))
    args = ap.parse_args()
    out = os.path.abspath(args.out)
    os.makedirs(out, exist_ok=True)
    src = Image.open(args.image).convert('RGB')

    if args.kind in SINGLES:
        name, max_w, q = SINGLES[args.kind]
        save(fit_width(src, max_w), os.path.join(out, name), q)
        return 0

    name, aspect, max_w, q = KINDS[args.kind]
    ids = [s.strip() for s in args.ids.split(',')]
    if len(ids) > args.rows * args.cols:
        ap.error(f'id 가 칸 수({args.rows * args.cols})보다 많다')
    cw, ch = src.size[0] / args.cols, src.size[1] / args.rows
    for i, cid in enumerate(ids):
        if not cid or cid == '-':
            continue
        r, c = divmod(i, args.cols)
        dx, dy = cw * args.inset, ch * args.inset
        cell = src.crop((round(c * cw + dx), round(r * ch + dy), round((c + 1) * cw - dx), round((r + 1) * ch - dy)))
        save(fit_width(center_crop(cell, aspect), max_w), os.path.join(out, name.format(id=cid)), q)
    return 0


if __name__ == '__main__':
    sys.exit(main())
