#!/usr/bin/env python3
"""십자가의 길 연작(대체 성화)을 번들용으로 가공한다. 원본은 tools/stations/fetch_series.py 로 받는다.

입력  data/stations_series.json, art/stations_series/<id>/raw/
출력  art/stations_series/<id>/prepared/station_NN.png   잘라 낸 장면(번들 밖, 눈으로 확인용)
      art/stations_series/<id>/contact.jpg               14장 한눈에 보기
      assets/images/stations/<id>/station_NN.webp        가로 600px 이하(원본이 작으면 그대로), 장당 LIMIT 이하
      assets/church/cross_pack_<id>.js                   성당 3D 14처 판용 아틀라스(7×2칸, 칸 216×266, 비율 유지·여백은 짙은 나무색)
푸겔 연작(prepare=existing)은 tools/stations/build_art.py 가 만든다(여기서는 건드리지 않는다).

사용: python3 tools/stations/build_series.py [연작 id ...]
"""
import base64
import io
import json
import os
import subprocess
import sys
import tempfile

import numpy as np
from PIL import Image, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SRC = os.path.join(ROOT, 'data', 'stations_series.json')
ART = os.path.join(ROOT, 'art', 'stations_series')
CELL_W, CELL_H, COLS = 216, 266, 7
MAT = (42, 29, 20)          # 아틀라스 칸 여백(way_cross.js 숫자 판과 같은 짙은 나무색)
LIMIT = 26 * 1024           # 장당 WebP 상한
PACK_LIMIT = 64 * 1024      # 아틀라스 WebP 상한


def webp_under(img, limit, q0=80, qmin=30):
    q = q0
    while True:
        b = io.BytesIO()
        img.save(b, 'WEBP', quality=q, method=6)
        if b.tell() <= limit or q <= qmin:
            return b.getvalue(), q
        q -= 4


def span_box(im, t, diff=None, dark=None):
    """종이 바탕과 다른(또는 어두운) 화소가 줄의 t 비율을 넘는 첫 줄~끝 줄, 그 안에서 첫 칸~끝 칸."""
    a = np.asarray(im.convert('RGB')).astype(int)
    if dark is not None:
        d = a.max(axis=2) < dark
    else:
        h, w = a.shape[:2]
        k = max(4, w // 40)
        corners = [a[:k, :k], a[:k, -k:], a[-k:, :k], a[-k:, -k:]]
        paper = np.median(np.concatenate([c.reshape(-1, 3) for c in corners]), axis=0)
        d = np.abs(a - paper).max(axis=2) > diff
    r = np.nonzero(d.mean(axis=1) > t)[0]
    y0, y1 = int(r[0]), int(r[-1]) + 1
    c = np.nonzero(d[y0:y1].mean(axis=0) > t)[0]
    return int(c[0]), y0, int(c[-1]) + 1, y1


def raw_image(s, n):
    raw = os.path.join(ART, s['id'], 'raw')
    for ext in ('.jpg', '.jpeg', '.png'):
        p = os.path.join(raw, f'station_{n:02d}{ext}')
        if os.path.exists(p):
            return Image.open(p).convert('RGB')
    raise SystemExit(f'{s["id"]} {n}처 원본이 없다(먼저 fetch_series.py)')


def frac_crop(im, bx):
    w, h = im.size
    return im.crop((round(bx[0] * w), round(bx[1] * h), round(bx[2] * w), round(bx[3] * h)))


def prep_plain(s, f):
    return raw_image(s, f['n'])


def prep_hermann_paul(s, f):
    # 책장을 찍은 사진: 판화의 검은 테두리 안쪽만
    im = raw_image(s, f['n'])
    return im.crop(span_box(im, 0.12, dark=90))


def prep_oreilly(s, f):
    # 책장 스캔: 위 'STATION n.' 제목과 아래 설명 글을 빼고 그림만
    im = raw_image(s, f['n'])
    if f.get('box'):                         # 자동으로 못 찾는 쪽(기울거나 바랜 책장)은 처마다 비율 상자로
        return frac_crop(im, f['box'])
    x0, y0, x1, y1 = span_box(im, 0.6, diff=45)
    return im.crop((x0 + 3, y0 + 3, x1 - 3, y1 - 3))


def prep_previati(s, f):
    # 금색 액자째 찍은 사진: 액자 안쪽 그림만(연작 전체가 같은 액자라 비율로 자른다, f.box 로 처마다 고칠 수 있다)
    im = raw_image(s, f['n'])
    return frac_crop(im, f.get('box') or s['box'])


def prep_mosler(s, f):
    # PDF 책장(홀수 쪽마다 삽화 한 점)을 300dpi 로 그려, 제목과 설명 사이의 삽화 덩어리만
    pdf = os.path.join(ART, s['id'], 'raw', 'book.pdf')
    with tempfile.TemporaryDirectory() as td:
        out = os.path.join(td, 'p')
        subprocess.run(['pdftoppm', '-r', '300', '-gray', '-png', '-f', str(f['pdf_page']), '-l', str(f['pdf_page']), '-singlefile', pdf, out],
                       check=True, stderr=subprocess.DEVNULL)
        im = Image.open(out + '.png').convert('L')
    a = np.asarray(im) < 150
    h, w = a.shape
    m = w // 12                              # 책장 가장자리(스캔 그림자·세로줄)는 보지 않는다
    a[:, :m] = False
    a[:, w - m:] = False
    # 빈 줄로 나뉜 덩어리들: 맨 위 제목(낮은 덩어리)과 아래 설명·워터마크(낮은 덩어리)를 빼고 그 사이를 모두 삽화로 본다
    rows = a.sum(axis=1) > 3
    segs, st = [], None
    for i, v in enumerate(list(rows) + [False]):
        if v and st is None:
            st = i
        if not v and st is not None:
            segs.append((st, i))
            st = None
    low = 70
    while segs and segs[0][1] - segs[0][0] < low:
        segs.pop(0)
    while segs and segs[-1][1] - segs[-1][0] < low:
        segs.pop()
    y0, y1 = segs[0][0], segs[-1][1]
    cols = np.nonzero(a[y0:y1].sum(axis=0) > 3)[0]
    # 흑백 2값 스캔: 살짝 흐려 회색조로 만들어야 WebP 가 작아지고 줄였을 때 물결 무늬가 안 생긴다
    return im.crop((int(cols[0]), y0, int(cols[-1]) + 1, y1)).filter(ImageFilter.GaussianBlur(1.6)).convert('RGB')


PREP = {'plain': prep_plain, 'hermann_paul': prep_hermann_paul, 'oreilly': prep_oreilly, 'previati': prep_previati, 'mosler': prep_mosler}


def build(s):
    sid = s['id']
    prep_dir = os.path.join(ART, sid, 'prepared')
    out_dir = os.path.join(ROOT, s['asset_dir'])
    os.makedirs(prep_dir, exist_ok=True)
    os.makedirs(out_dir, exist_ok=True)
    atlas = Image.new('RGB', (CELL_W * COLS, CELL_H * 2), MAT)
    contact = Image.new('RGB', (300 * 7, 300 * 2), (255, 0, 255))
    total = 0
    for f in s['files']:
        n = f['n']
        im = PREP[s['prepare']](s, f)
        im.save(os.path.join(prep_dir, f'station_{n:02d}.png'))
        w, h = im.size
        bw = min(s.get('bundle_width', 600), w)   # 원본이 더 작으면 키우지 않는다(판화·사진 질감은 bundle_width 로 줄여 용량을 맞춘다)
        big = im.resize((bw, round(h * bw / w)), Image.LANCZOS) if bw != w else im
        data, q = webp_under(big, LIMIT)
        with open(os.path.join(out_dir, f'station_{n:02d}.webp'), 'wb') as fh:
            fh.write(data)
        total += len(data)
        print(f'{sid} station_{n:02d}.webp {big.size} 비율 {w / h:.2f} q{q} {len(data)}B')
        k = min(CELL_W / w, CELL_H / h)        # contain: 비율 유지
        cell = im.resize((max(1, round(w * k)), max(1, round(h * k))), Image.LANCZOS)
        i = n - 1
        atlas.paste(cell, ((i % COLS) * CELL_W + (CELL_W - cell.width) // 2, (i // COLS) * CELL_H + (CELL_H - cell.height) // 2))
        t = im.copy()
        t.thumbnail((292, 292))
        contact.paste(t, ((i % 7) * 300 + 4, (i // 7) * 300 + 4))
    contact.save(os.path.join(ART, sid, 'contact.jpg'), quality=85)
    data, q = webp_under(atlas, PACK_LIMIT)
    js = ('/* %s — 생성 파일(tools/stations/build_series.py). 십자가의 길 14처 그림 아틀라스(7×2칸, 칸 %dx%d, 비율 유지).\n'
          '   %s, %s. %s. %s (data/stations_series.json). 대체 성화: 성당에 실제로 걸린 작품이 아니다. */\n'
          '(window.ChurchCrossPacks = window.ChurchCrossPacks || {})[%s] = { id: %s, cols: %d, rows: 2, cellW: %d, cellH: %d, w: %d, h: %d, src: "data:image/webp;base64,%s" };\n'
          % (s['pack'], CELL_W, CELL_H, s['title'], s['year'], '사진·스캔 ' + s['photographer'], s['license_label'],
             json.dumps(sid), json.dumps(sid), COLS, CELL_W, CELL_H, atlas.width, atlas.height, base64.b64encode(data).decode('ascii')))
    with open(os.path.join(ROOT, 'assets', 'church', s['pack']), 'w', encoding='utf-8') as fh:
        fh.write(js)
    total += len(js)
    print(f'{sid} {s["pack"]} q{q} webp {len(data)}B js {len(js)}B · 연작 합계 {total}B')
    return total


def main():
    with open(SRC, encoding='utf-8') as fh:
        d = json.load(fh)
    grand = 0
    for s in d['series']:
        if s['prepare'] == 'existing' or (sys.argv[1:] and s['id'] not in sys.argv[1:]):
            continue
        grand += build(s)
    print('합계', grand, 'B')


if __name__ == '__main__':
    main()
