#!/usr/bin/env python3
"""스테인드글라스 번들 정리(성능·용량). 저장소 루트에서 실행한다.

    python3 tools/glass_bundle/glass_bundle.py thumbs      # 갤러리용 소형 썸네일 생성
    python3 tools/glass_bundle/glass_bundle.py unbundle2k  # 성당 안에서 쓰지 않는 2k를 번들에서 뺌
    python3 tools/glass_bundle/glass_bundle.py check       # 카탈로그와 파일이 맞는지 확인

thumbs
  assets/church/glass_<id>_1k.webp 를 THUMB_BOX(가로 480 × 세로 800) 안에 들어가게 줄여
  assets/church/glass_<id>_th.webp 로 저장하고 glass_catalog.json 의 files.thumb 에 적는다.
  갤러리 카드·오늘의 창 카드는 이 파일만 디코드한다(Pillow 필요: pip install pillow).

unbundle2k
  앱의 3D 감상실은 t1(1k)만 요청하므로 gpack_<id>_2k.js 는 쓰이지 않는다. 성당 3D 안에 걸
  창(KEEP_2K: 진본 배치 창 + 성 바오로 알라바스터 판)만 2k 를 번들에 남기고, 나머지는
    - glass_<id>_2k.webp → art/glass_2k/ 로 옮기고(번들 제외, 파일은 보존)
    - gpack_<id>_2k.js   → 지운다(build_glasspack.mjs 로 webp 에서 다시 만들 수 있는 파생물)
    - glass_catalog.json 의 files.2k 를 bundled:false, path:art/glass_2k/... 로 바꾼다.
  되돌리기: webp 를 assets/church/ 로 다시 옮기고 bundled:true 로 바꾼 뒤
  `node tools/church_web/build_glasspack.mjs` 를 실행한다.

두 명령 모두 여러 번 실행해도 결과가 같다. 끝나면 `node tools/church_web/build_glasspack.mjs`
로 glass_catalog.js(카탈로그 사본)를 다시 만든다.
"""
import json
import os
import shutil
import sys

REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
ASSETS = os.path.join(REPO, 'assets', 'church')
CATALOG = os.path.join(ASSETS, 'glass_catalog.json')
ART_2K = os.path.join(REPO, 'art', 'glass_2k')

THUMB_BOX = (480, 800)
THUMB_Q = 80

# 진본 배치가 아니어도 2k 를 남길 창(성 바오로 대성전의 알라바스터 판, G-29).
KEEP_2K_EXTRA = {'alabaster_slab'}


def load():
    with open(CATALOG, encoding='utf8') as f:
        return json.load(f)


def save(cat):
    # 원래 파일과 같은 모양(indent=1, 끝 줄바꿈 없음)으로 쓴다.
    with open(CATALOG, 'w', encoding='utf8') as f:
        f.write(json.dumps(cat, ensure_ascii=False, indent=1))


def keeps_2k(w):
    if w['id'] in KEEP_2K_EXTRA:
        return True
    return any(p.get('use') == 'authentic' for p in w.get('suggestedChurches') or [])


def thumbs():
    from PIL import Image

    cat = load()
    total = 0
    for w in cat['windows']:
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
    save(cat)
    print('thumbs: %d files, %.2f MB' % (len(cat['windows']), total / 1048576))


def unbundle2k():
    cat = load()
    os.makedirs(ART_2K, exist_ok=True)
    moved = removed = 0
    freed = 0
    for w in cat['windows']:
        if keeps_2k(w):
            continue
        f = w['files']['2k']
        name = 'glass_%s_2k.webp' % w['id']
        src = os.path.join(ASSETS, name)
        dst = os.path.join(ART_2K, name)
        if os.path.exists(src):
            freed += os.path.getsize(src)
            shutil.move(src, dst)
            moved += 1
        pack = os.path.join(ASSETS, 'gpack_%s_2k.js' % w['id'])
        if os.path.exists(pack):
            freed += os.path.getsize(pack)
            os.remove(pack)
            removed += 1
        f['path'] = 'art/glass_2k/' + name
        f['bundled'] = False
    save(cat)
    kept = [w['id'] for w in cat['windows'] if keeps_2k(w)]
    print('unbundle2k: moved %d webp, removed %d gpack, %.1f MB out of the bundle' % (moved, removed, freed / 1048576))
    print('2k kept in bundle (%d): %s' % (len(kept), ', '.join(kept)))


def check():
    cat = load()
    bad = []
    for w in cat['windows']:
        for tier, f in w['files'].items():
            path = os.path.join(REPO, f['path'])
            in_bundle = f['path'].startswith('assets/church/')
            if tier == 'master':
                continue
            if not os.path.exists(path):
                bad.append('%s %s: 파일 없음 %s' % (w['id'], tier, f['path']))
            if bool(f.get('bundled')) != in_bundle:
                bad.append('%s %s: bundled 표시와 경로가 다름' % (w['id'], tier))
            pack = os.path.join(ASSETS, 'gpack_%s_%s.js' % (w['id'], tier))
            if tier in ('1k', '2k') and bool(f.get('bundled')) != os.path.exists(pack):
                bad.append('%s %s: gpack 유무가 bundled 표시와 다름' % (w['id'], tier))
    for b in bad:
        print(b)
    print('check: %d windows, %d problems' % (len(cat['windows']), len(bad)))
    return 1 if bad else 0


if __name__ == '__main__':
    cmd = sys.argv[1] if len(sys.argv) > 1 else ''
    if cmd == 'thumbs':
        thumbs()
    elif cmd == 'unbundle2k':
        unbundle2k()
    elif cmd == 'check':
        sys.exit(check())
    else:
        print(__doc__)
        sys.exit(2)
