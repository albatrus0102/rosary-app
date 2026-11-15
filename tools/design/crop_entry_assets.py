#!/usr/bin/env python3
"""입구 화면 장식·그림을 사용자 시안 이미지에서 잘라 낸다(임시 자산).

사용:  python3 -I tools/design/crop_entry_assets.py <시안.png> [--out assets/images/church_entry]

시안(1190x1322, 사용자가 AI 로 만든 그림)에서 글자가 겹치지 않는 부분만 잘라
assets/images/church_entry/ 의 자산 슬롯에 넣는다. 사용자가 나중에 고해상도 그림을 주면
같은 이름의 파일만 바꾸면 된다(코드 수정 없음, 가장자리 페이드는 앱이 그린다).

  bg_glow.webp        본문 오른쪽 위 배경 장식(스테인드글라스·빛 번짐). 상태 바 아이콘은 지운다.
  rail_decor.webp     내비게이션 레일 아래 장식(아치·촛불·백합).
  hero_milan.webp     큰 카드 대표 그림(밀라노 내부, 16:9).
  thumb_<id>.webp     캐러셀 썸네일(성당 외관, 4:3) 5종.

좌표는 시안 원본 크기 기준이다. 크기가 다른 그림을 주면 비율로 맞춘다.
"""
import argparse
import os
import sys

import numpy as np
from PIL import Image

BASE = (1190, 1322)  # 좌표 기준 크기

# (왼쪽, 위, 오른쪽, 아래)
BG_GLOW = (612, 0, 1190, 330)  # 부제 글자('…공간') 오른쪽부터
STATUS_ICONS = (1030, 8, 1182, 56)  # 상태 바 아이콘(지울 영역)
RAIL_DECOR = (0, 520, 137, 1322)
HERO = {'milan': (287, 335, 1033, 755)}  # 16:9, 책갈피 버튼·둥근 모서리를 피한 가운데
THUMBS = {  # 캐러셀 순서대로. 둥근 모서리·금색 테두리 안쪽만.
    'stpeter': (207, 1077, 365, 1190),
    'maggiore': (394, 1077, 552, 1190),
    'stpaul': (577, 1077, 734, 1190),
    'milan': (761, 1082, 911, 1187),
    'myeongdong': (939, 1077, 1096, 1190),
}


def scaled(box, size):
    sx, sy = size[0] / BASE[0], size[1] / BASE[1]
    return (round(box[0] * sx), round(box[1] * sy), round(box[2] * sx), round(box[3] * sy))


def inpaint(img, box, rounds=1500):
    """box 안을 둘레 색이 스며들게 메운다(흐릿한 배경용 확산 채움)."""
    a = np.asarray(img).astype(np.float32)
    x0, y0, x1, y1 = box
    x0, y0 = max(x0, 1), max(y0, 1)
    x1, y1 = min(x1, a.shape[1] - 1), min(y1, a.shape[0] - 1)
    # 위아래 둘레를 잇는 값으로 시작한 뒤 여러 번 평균을 내 매끈하게 만든다.
    top, bottom = a[y0 - 1, x0:x1], a[y1, x0:x1]
    for y in range(y0, y1):
        t = (y - y0 + 1) / (y1 - y0 + 1)
        a[y, x0:x1] = top * (1 - t) + bottom * t
    for _ in range(rounds):
        region = a[y0 - 1:y1 + 1, x0 - 1:x1 + 1]
        avg = (region[:-2, 1:-1] + region[2:, 1:-1] + region[1:-1, :-2] + region[1:-1, 2:]) / 4
        a[y0:y1, x0:x1] = avg
    return Image.fromarray(np.clip(a, 0, 255).astype(np.uint8))


def save(img, path, quality):
    img.convert('RGB').save(path, 'WEBP', quality=quality, method=6)
    print(f'{os.path.relpath(path)}  {img.size[0]}x{img.size[1]}  {os.path.getsize(path) / 1024:.1f}KB')


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('mockup')
    ap.add_argument('--out', default=os.path.join(os.path.dirname(__file__), '../../assets/images/church_entry'))
    args = ap.parse_args()
    src = Image.open(args.mockup).convert('RGB')
    out = os.path.abspath(args.out)
    os.makedirs(out, exist_ok=True)

    clean = inpaint(src, scaled(STATUS_ICONS, src.size))
    save(clean.crop(scaled(BG_GLOW, src.size)), os.path.join(out, 'bg_glow.webp'), 80)
    save(src.crop(scaled(RAIL_DECOR, src.size)), os.path.join(out, 'rail_decor.webp'), 86)
    for cid, box in HERO.items():
        save(src.crop(scaled(box, src.size)), os.path.join(out, f'hero_{cid}.webp'), 84)
    for cid, box in THUMBS.items():
        save(src.crop(scaled(box, src.size)), os.path.join(out, f'thumb_{cid}.webp'), 88)


if __name__ == '__main__':
    sys.exit(main())
