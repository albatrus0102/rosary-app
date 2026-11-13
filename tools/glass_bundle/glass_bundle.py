#!/usr/bin/env python3
"""스테인드글라스 번들 정리(용량). 저장소 루트에서 실행한다.

    python3 tools/glass_bundle/glass_bundle.py thumbs   # 갤러리용 소형 썸네일 생성
    python3 tools/glass_bundle/glass_bundle.py slim     # 번들을 BUNDLED_IDS 8점으로 줄임
    python3 tools/glass_bundle/glass_bundle.py check    # 카탈로그와 파일이 맞는지 확인

번들 정책(APK 20MB 목표, 사용자 결정): 성당 안에 걸 창 8점(BUNDLED_IDS)만 앱에 싣는다.
나머지 38점은 서버가 생길 때까지 앱에서 보이지 않는다(카탈로그 항목은 남기되
files.1k/thumb 의 bundled:false 로 표시, 앱은 번들된 창만 읽는다).

번들에 남는 것(창마다)
  - gpack_<id>_1k.js : 1k WebP 를 data URI 로 감싼 스크립트. 3D 감상실(file:// WebView)과
                       Flutter 평면 보기가 **같은 이 파일 하나**를 읽는다(GlassPackImage).
                       평면 보기용 .webp 를 따로 싣지 않으므로 같은 그림이 두 번 들어가지 않는다.
  - glass_<id>_th.webp : 갤러리 카드 썸네일
번들에서 빠지는 것
  - 1k WebP 원본 → art/glass_1k/ (8점; gpack 을 만드는 원본이며 files['1k'].path 가 가리킨다)
  - 2k WebP → art/glass_2k/ (모든 창; 성당 안 연결(G-29)에서 고화질이 필요하면 되살린다)
  - 38점의 1k·썸네일·gpack → art/glass_unbundled/
  - 옛 시험용 glass_*.jpg 20장(어디서도 읽지 않음) → art/glass_legacy_jpg/
  - gpack_<id>_2k.js 는 build_glasspack.mjs 가 webp 에서 만드는 파생물이라 지웠다.

되돌리기
  - 38점을 다시 싣기: art/glass_unbundled/* 를 assets/church/ 로 옮기고, 카탈로그에서
    그 창의 files.1k·thumb 의 path 를 assets/church/... 로, bundled 를 true 로 바꾼다
    (1k 에는 pack 도 적는다). `node tools/church_web/build_glasspack.mjs` 로 gpack 을
    다시 만들 수도 있다.
  - 2k 를 다시 싣기: art/glass_2k/ 의 webp 를 assets/church/ 로 옮기고 files['2k'] 를
    bundled:true 로 바꾼 뒤 build_glasspack.mjs 를 실행한다(3D 는 t2 요청 때 gpack_2k 를 읽는다).

thumbs
  files['1k'].path 의 WebP 를 THUMB_BOX(가로 480 × 세로 800) 안에 들어가게 줄여
  assets/church/glass_<id>_th.webp 로 저장하고 glass_catalog.json 의 files.thumb 에 적는다
  (Pillow 필요: pip install pillow). slim 으로 옮겨진 38점은 건너뛴다.

slim
  여러 번 실행해도 결과가 같다. 끝나면 `node tools/church_web/build_glasspack.mjs` 로
  gpack 과 glass_catalog.js(번들된 창만 담은 사본)를 다시 만든다.
"""

import json
import os
import shutil
import sys

REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
ASSETS = os.path.join(REPO, 'assets', 'church')
CATALOG = os.path.join(ASSETS, 'glass_catalog.json')
ART = os.path.join(REPO, 'art')
ART_1K = os.path.join(ART, 'glass_1k')
ART_2K = os.path.join(ART, 'glass_2k')
ART_UNBUNDLED = os.path.join(ART, 'glass_unbundled')
ART_LEGACY_JPG = os.path.join(ART, 'glass_legacy_jpg')

THUMB_BOX = (480, 800)
THUMB_Q = 80
# 번들에 남는 1k 는 2k 를 절반으로 줄여 이 품질로 다시 저장한다(성당 안에서 보는 크기면 충분).
PACK_Q = 80

# 앱에 싣는 창 8점(사용자 결정): 성당 안(G-29)에 걸 진본 배치 창 + 성 바오로 알라바스터 판.
BUNDLED_IDS = [
    'dove_stpeter',
    'alabaster_stpaul_1',
    'alabaster_stpaul_2',
    'alabaster_slab',
    'oculus_florence_donatello',
    'oculus_florence_ghiberti_1',
    'oculus_florence_ghiberti_2',
    'milan_apse_lower',
]


def load():
    with open(CATALOG, encoding='utf8') as f:
        return json.load(f)


def save(cat):
    # 원래 파일과 같은 모양(indent=1, 끝 줄바꿈 없음)으로 쓴다.
    with open(CATALOG, 'w', encoding='utf8') as f:
        f.write(json.dumps(cat, ensure_ascii=False, indent=1))


def thumbs():
    from PIL import Image

    cat = load()
    total = 0
    n_done = 0
    for w in cat['windows']:
        if w['files']['1k'].get('bundled') is False:
            continue
        src = os.path.join(REPO, w['files']['1k']['path'])
        rel = 'assets/church/glass_%s_th.webp' % w['id']
        dst = os.path.join(REPO, rel)
        im = Image.open(src)
        im.load()
        scale = min(THUMB_BOX[0] / im.width, THUMB_BOX[1] / im.height, 1.0)
        size = (max(1, round(im.width * scale)), max(1, round(im.height * scale)))
        if size != im.size:
            im = im.resize(size, Image.LANCZOS)
        im.save(dst, 'WEBP', quality=THUMB_Q, method=6)
        n = os.path.getsize(dst)
        total += n
        files = w['files']
        entry = {'path': rel, 'px': [size[0], size[1]], 'bytes': n, 'webp_q': THUMB_Q, 'bundled': True}
        # thumb 을 files 의 맨 뒤에 둔다(순서 고정).
        files.pop('thumb', None)
        files['thumb'] = entry
        n_done += 1
    save(cat)
    print('thumbs: %d files, %.2f MB' % (n_done, total / 1048576))


def _mv(src, dst):
    """src 가 있으면 dst 로 옮긴다(이미 옮겼으면 아무것도 안 한다). 옮긴 바이트를 돌려준다."""
    if not os.path.exists(src):
        return 0
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    n = os.path.getsize(src)
    shutil.move(src, dst)
    return n


def slim():
    from PIL import Image

    cat = load()
    ids = {w['id'] for w in cat['windows']}
    missing = [i for i in BUNDLED_IDS if i not in ids]
    if missing:
        raise SystemExit('카탈로그에 없는 BUNDLED_IDS: %s' % missing)
    freed = 0
    # 1) 어디서도 읽지 않는 옛 시험용 glass_*.jpg
    for name in sorted(os.listdir(ASSETS)):
        if name.startswith('glass_') and name.endswith('.jpg'):
            freed += _mv(os.path.join(ASSETS, name), os.path.join(ART_LEGACY_JPG, name))
    for w in cat['windows']:
        wid = w['id']
        files = w['files']
        n1k = 'glass_%s_1k.webp' % wid
        nth = 'glass_%s_th.webp' % wid
        n2k = 'glass_%s_2k.webp' % wid
        p1k = 'gpack_%s_1k.js' % wid
        p2k = 'gpack_%s_2k.js' % wid
        # 2k 는 모든 창이 번들 밖(art/glass_2k). gpack_2k 는 파생물이라 지운다.
        freed += _mv(os.path.join(ASSETS, n2k), os.path.join(ART_2K, n2k))
        pk2 = os.path.join(ASSETS, p2k)
        if os.path.exists(pk2):
            freed += os.path.getsize(pk2)
            os.remove(pk2)
        files['2k']['path'] = 'art/glass_2k/' + n2k
        files['2k']['bundled'] = False
        files['2k'].pop('pack', None)
        if wid in BUNDLED_IDS:
            # 1k: 2k 를 절반으로 줄여 PACK_Q 로 저장 → art/glass_1k/(gpack 의 원본). 번들에는 gpack 만.
            dst = os.path.join(ART_1K, n1k)
            if not os.path.exists(dst):
                im = Image.open(os.path.join(ART_2K, n2k))
                im.load()
                size = tuple(files['1k']['px'])
                im = im.resize(size, Image.LANCZOS)
                os.makedirs(ART_1K, exist_ok=True)
                im.save(dst, 'WEBP', quality=PACK_Q, method=6)
            old = os.path.join(ASSETS, n1k)
            if os.path.exists(old):
                freed += os.path.getsize(old)
                os.remove(old)  # 옛 q90 1k: git 기록에 남아 있다
            files['1k'].update({
                'path': 'art/glass_1k/' + n1k,
                'pack': 'assets/church/' + p1k,
                'bytes': os.path.getsize(dst),
                'webp_q': PACK_Q,
                'bundled': True,
            })
            files['1k'] = _ordered(files['1k'])
        else:
            freed += _mv(os.path.join(ASSETS, n1k), os.path.join(ART_UNBUNDLED, n1k))
            freed += _mv(os.path.join(ASSETS, nth), os.path.join(ART_UNBUNDLED, nth))
            freed += _mv(os.path.join(ASSETS, p1k), os.path.join(ART_UNBUNDLED, p1k))
            files['1k'].update({'path': 'art/glass_unbundled/' + n1k, 'bundled': False})
            files['1k'].pop('pack', None)
            if 'thumb' in files:
                files['thumb'].update({'path': 'art/glass_unbundled/' + nth, 'bundled': False})
    save(cat)
    print('slim: %.1f MB out of assets/church; bundled windows: %s' % (freed / 1048576, ', '.join(BUNDLED_IDS)))


def _ordered(f):
    keys = ['path', 'pack', 'px', 'bytes', 'webp_q', 'bundled']
    out = {k: f[k] for k in keys if k in f}
    out.update({k: v for k, v in f.items() if k not in out})
    return out


def check():
    cat = load()
    bad = []
    for w in cat['windows']:
        wid = w['id']
        f1 = w['files']['1k']
        bundled = bool(f1.get('bundled'))
        if bundled != (wid in BUNDLED_IDS):
            bad.append('%s: 번들 여부가 BUNDLED_IDS 와 다름' % wid)
        for tier, f in w['files'].items():
            if not os.path.exists(os.path.join(REPO, f['path'])):
                bad.append('%s %s: 파일 없음 %s' % (wid, tier, f['path']))
            in_bundle = f['path'].startswith('assets/church/')
            if tier in ('thumb',) and bool(f.get('bundled')) != in_bundle:
                bad.append('%s %s: bundled 표시와 경로가 다름' % (wid, tier))
        pack = os.path.join(ASSETS, 'gpack_%s_1k.js' % wid)
        if bundled != os.path.exists(pack):
            bad.append('%s: gpack_1k 유무가 bundled 표시와 다름' % wid)
        if bundled and f1.get('pack') != 'assets/church/gpack_%s_1k.js' % wid:
            bad.append('%s: files.1k.pack 이 없거나 다름' % wid)
        for name in ('glass_%s_1k.webp' % wid, 'glass_%s_2k.webp' % wid, 'gpack_%s_2k.js' % wid):
            if os.path.exists(os.path.join(ASSETS, name)):
                bad.append('%s: 번들에 있으면 안 되는 파일 %s' % (wid, name))
    for b in bad:
        print(b)
    print('check: %d windows (%d bundled), %d problems' % (
        len(cat['windows']), sum(1 for w in cat['windows'] if w['files']['1k'].get('bundled')), len(bad)))
    return 1 if bad else 0


if __name__ == '__main__':
    cmd = sys.argv[1] if len(sys.argv) > 1 else ''
    if cmd == 'thumbs':
        thumbs()
    elif cmd == 'slim':
        slim()
    elif cmd == 'check':
        sys.exit(check())
    else:
        print(__doc__)
        sys.exit(2)
