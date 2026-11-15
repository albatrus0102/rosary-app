#!/usr/bin/env python3
"""개발용 임시 유리 그림 팩 만들기(E-4, docs/church/GLASS_DEV_PIPELINE.md). 저장소 루트에서 실행한다.

    python3 tools/glass_bundle/devglass_pack.py milan                  # 원본 → assets/church/dev/gpack_dev_milan.js
    python3 tools/glass_bundle/devglass_pack.py milan --check          # 팩이 원본과 맞는지(장수·크기)만 확인
    python3 tools/glass_bundle/devglass_pack.py milan --resample 1024  # 성능 부하 시험용 리샘플 팩(커밋하지 않음)

- 원본: SETS[세트].src 의 PNG(시안). **원본 해상도 그대로** WebP(q90, 알파 무손실)로 바꿔 data URI 로 싼다(업스케일 없음).
  file:// WebView 에서는 WebGL 이 파일 그림을 못 읽으므로 기존 gpack 과 같이 <script> 로 읽는 JS 한 파일이다.
  형식: window.ChurchDevGlassPack['gpack_dev_<세트>.js'] = {set, kind:'orig', built, images:{'DEV-001':{w,h,src}, ...}}
- 고해상도 그림이 오면 같은 이름(DEV-0xx.png)으로 원본 폴더의 파일만 바꾸고 이 스크립트를 다시 돌린다.
  판 크기는 실행 때 팩의 실제 크기(w/h)로 계산하므로 대응표(dev/devglass_<성당>.js)는 고치지 않아도 된다.
- --resample N: 긴 변이 N 이 되게 키운(리샘플) 별도 팩 gpack_devrs_<세트>_<N>.js. 세부가 생기지는 않는다. 로딩·메모리 부하를 보는 용도다.
  그림마다 위쪽에 'LOAD TEST' 띠를 넣어 원본과 헷갈리지 않게 하고, .gitignore 에 있어 커밋되지 않는다. 보려면 URL 에 devpack=rs<N>.
- 이 폴더(assets/church/dev/)는 pubspec.yaml 의 assets 에 없다 → 일반(배포) APK 에 들어가지 않는다(tools/build_dev_apk.sh 만 넣는다).
Pillow 필요(pip install pillow).
"""
import base64
import datetime
import glob
import io
import json
import os
import re
import sys

from PIL import Image, ImageDraw

SETS = {
    # 세트 이름: 원본 폴더, 파일 무늬. 다른 성당을 더하려면 한 줄을 더한다.
    'milan': {'src': 'art/glass_milan55/textures', 'pattern': 'DEV-*.png', 'set': 'milan55'},
}
OUT_DIR = 'assets/church/dev'
QUALITY = 90


def sources(name):
    conf = SETS[name]
    files = sorted(glob.glob(os.path.join(conf['src'], conf['pattern'])))
    if not files:
        sys.exit('원본이 없습니다: ' + conf['src'])
    return files


def encode(im):
    buf = io.BytesIO()
    im.save(buf, 'WEBP', quality=QUALITY, method=4, exact=True)
    return buf.getvalue()


def build(name, resample=0):
    conf = SETS[name]
    images, raw = {}, 0
    for f in sources(name):
        key = os.path.splitext(os.path.basename(f))[0]
        if not re.match(r'^[A-Za-z0-9_-]{1,24}$', key):
            sys.exit('이름 규칙 위반: ' + key)
        im = Image.open(f).convert('RGBA')
        if resample:
            k = resample / max(im.size)
            im = im.resize((max(1, round(im.size[0] * k)), max(1, round(im.size[1] * k))), Image.LANCZOS)
            d = ImageDraw.Draw(im)
            band = max(12, im.size[1] // 28)
            d.rectangle([0, im.size[1] // 3, im.size[0], im.size[1] // 3 + band], fill=(255, 0, 255, 255))
            d.text((4, im.size[1] // 3 + 1), 'LOAD TEST', fill=(0, 0, 0, 255))
        data = encode(im)
        raw += len(data)
        images[key] = {'w': im.size[0], 'h': im.size[1], 'src': 'data:image/webp;base64,' + base64.b64encode(data).decode('ascii')}
    fname = ('gpack_devrs_%s_%d.js' % (name, resample)) if resample else ('gpack_dev_%s.js' % name)
    pack = {'set': conf['set'], 'kind': ('resampled_%d_load_test' % resample) if resample else 'orig',
            'release_approved': False, 'built': datetime.date.today().isoformat(), 'images': images}
    head = '/* tools/glass_bundle/devglass_pack.py 로 생성(직접 고치지 말 것). 개발용 임시 시안 — 실제 작품이 아니다. 일반(배포) APK 에 넣지 않는다. */\n'
    os.makedirs(OUT_DIR, exist_ok=True)
    out = os.path.join(OUT_DIR, fname)
    with open(out, 'w', encoding='utf-8') as fp:
        fp.write(head + "(window.ChurchDevGlassPack=window.ChurchDevGlassPack||{})['%s']=%s;\n" % (fname, json.dumps(pack, separators=(',', ':'))))
    print('%s: %d장, WebP 합 %.2f MB, 파일 %.2f MB' % (out, len(images), raw / 1048576, os.path.getsize(out) / 1048576))
    return out


def check(name):
    out = os.path.join(OUT_DIR, 'gpack_dev_%s.js' % name)
    if not os.path.exists(out):
        sys.exit('팩이 없습니다: ' + out + ' (python3 tools/glass_bundle/devglass_pack.py ' + name + ')')
    txt = open(out, encoding='utf-8').read()
    pack = json.loads(txt[txt.index(']=') + 2:txt.rindex(';')])
    bad = 0
    files = sources(name)
    for f in files:
        key = os.path.splitext(os.path.basename(f))[0]
        w, h = Image.open(f).size
        e = pack['images'].get(key)
        if not e or (e['w'], e['h']) != (w, h):
            print('불일치:', key, (w, h), e and (e['w'], e['h']))
            bad += 1
    extra = set(pack['images']) - {os.path.splitext(os.path.basename(f))[0] for f in files}
    if extra:
        print('팩에만 있음:', sorted(extra))
        bad += 1
    print('%s: %d장, %s' % (out, len(pack['images']), '원본과 일치' if not bad else '불일치 %d' % bad))
    sys.exit(1 if bad else 0)


if __name__ == '__main__':
    args = sys.argv[1:]
    if not args or args[0] not in SETS:
        sys.exit(__doc__)
    if '--check' in args:
        check(args[0])
    rs = int(args[args.index('--resample') + 1]) if '--resample' in args else 0
    build(args[0], rs)
