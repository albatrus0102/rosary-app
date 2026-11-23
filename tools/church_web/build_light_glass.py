# -*- coding: utf-8 -*-
"""빛의 성당(ch_light.js) 창 그림 팩을 만든다 → assets/church/light/gpack_light.js

  python3 tools/church_web/build_light_glass.py

* 창은 **파일 이름으로** 걸린다. 그림을 바꾸려면 같은 이름의 파일만 교체하고 이 스크립트를 다시 돌린다.
  - 신비 경당 20칸: art/light_cathedral/windows/<joyful|luminous|sorrowful|glorious>_<1..5>.webp
  - 장미창: art/light_cathedral/src/glass_rose_marian.webp
  - 후진 3창(아직 그림 없음 — 있으면 들어간다): art/light_cathedral/windows/apse_left.webp · apse_center.webp · apse_right.webp
  - 구슬 회랑 궁륭 모자이크 5점(아직 없음): art/light_cathedral/mosaics/<pater|faith|hope|charity|gloria>.webp
  파일이 없으면 빌더가 그림 없는 빛 유리(자리표시)를 그린다.
* near: 창 하나씩(긴 변 ≤ 1024px, WebP q82). 가까운 경당 8칸만 이 그림을 GPU 에 올린다(ch_light.js 창 흐름).
* far : 20칸을 한 장에 줄인 아틀라스(칸 64×208). 먼 경당은 모두 이 한 장(draw call 1)으로 그린다.
* 이 폴더(assets/church/light/)는 출시 빌드 번들에 없다(tools/release_hidden_assets.txt). 개발용 빌드만 싣는다.
"""
import base64, io, json, os, sys
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
ART = os.path.join(ROOT, 'art', 'light_cathedral')
OUT = os.path.join(ROOT, 'assets', 'church', 'light', 'gpack_light.js')
SETS = ['joyful', 'luminous', 'sorrowful', 'glorious']
MYST = [f'{s}_{i}' for s in SETS for i in range(1, 6)]
CELL = (64, 208)


def webp_uri(im, q=82):
    b = io.BytesIO()
    im.save(b, 'WEBP', quality=q, method=6)
    return 'data:image/webp;base64,' + base64.b64encode(b.getvalue()).decode('ascii')


def fit(im, maxside=1024):
    w, h = im.size
    k = min(1.0, maxside / max(w, h))
    return im.resize((max(1, round(w * k)), max(1, round(h * k))), Image.LANCZOS) if k < 1 else im


def main():
    near, src = {}, {}
    def put(key, path, maxside=1024):
        if not os.path.exists(path):
            return False
        im = Image.open(path).convert('RGB')
        im = fit(im, maxside)
        near[key] = {'w': im.size[0], 'h': im.size[1], 'src': webp_uri(im)}
        src[key] = os.path.relpath(path, ROOT)
        return True

    missing = [k for k in MYST if not put(k, os.path.join(ART, 'windows', k + '.webp'))]
    if missing:
        print('신비 창 그림이 없습니다:', missing, file=sys.stderr)
        sys.exit(1)
    put('rose_marian', os.path.join(ART, 'src', 'glass_rose_marian.webp'))
    for k in ('apse_left', 'apse_center', 'apse_right'):
        put(k, os.path.join(ART, 'windows', k + '.webp'))
    for k in ('pater', 'faith', 'hope', 'charity', 'gloria'):
        put('mosaic_' + k, os.path.join(ART, 'mosaics', k + '.webp'), 512)

    # 먼 창 아틀라스: 10열 × 2행
    cw, ch = CELL
    atlas = Image.new('RGB', (cw * 10, ch * 2), (12, 10, 16))
    cells = {}
    for i, k in enumerate(MYST):
        im = Image.open(os.path.join(ART, 'windows', k + '.webp')).convert('RGB').resize(CELL, Image.LANCZOS)
        cx, cy = (i % 10) * cw, (i // 10) * ch
        atlas.paste(im, (cx, cy))
        # three.js UV(아래가 0): [u0, v0, u1, v1]
        cells[k] = [cx / atlas.size[0], 1 - (cy + ch) / atlas.size[1], (cx + cw) / atlas.size[0], 1 - cy / atlas.size[1]]
    far = {'w': atlas.size[0], 'h': atlas.size[1], 'src': webp_uri(atlas, 80), 'cells': cells}

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    body = {'v': 1, 'near': near, 'far': far, 'src': src}
    js = ('/* 자동 생성: python3 tools/church_web/build_light_glass.py — 직접 고치지 말 것. 원본 그림은 art/light_cathedral/ (사용자 생성 그림). */\n'
          'window.ChurchLightGlass = ' + json.dumps(body, ensure_ascii=False, separators=(',', ':')) + ';\n')
    with open(OUT, 'w', encoding='utf-8') as f:
        f.write(js)
    print(OUT, f'{os.path.getsize(OUT) / 1024:.0f} KB', 'near', len(near), 'far cells', len(cells))


if __name__ == '__main__':
    main()
