# web/tex 의 지도를 '실제로 샘플되는 크기'로 미리 줄여 싣는다(photos.js maxOf 와 같은 규칙 — 그전에는 1k 를 싣고 올리기 전에 줄였다).
#   python3 -I tools/tex_shrink.py [web/tex]   — 이미 작은 파일은 그대로(여러 번 돌려도 같다)
# 규칙: photos.js maxOf 와 같다(HERO 색 1024 · 색·법선 512 · 작은 물건 법선 256 · 아주 작은 것 색 256 · ORM 256(HERO 512) · 식물 512, 나무 1024).
# 이음매가 다시 생기지 않게 반복 질감은 둘레를 감싸(wrap) 붙인 뒤 줄이고 가운데를 잘라 낸다. 식물 카드(알파)는 그대로 줄인다.
import sys, os
from PIL import Image, ImageFile
ImageFile.MAXBLOCK = 1 << 24   # optimize=True 저장이 큰 그림에서 끊기지 않게

HERO = {'floor_oak', 'plaster_cream', 'plant_tree'}
SMALL = {'rope', 'linen_a', 'linen_b', 'metal', 'wood_end', 'terracotta', 'cork', 'concrete'}
TINY = {'rope', 'metal', 'wood_end'}
D = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'web', 'tex')


def target(name):   # photos.js maxOf 와 같은 규칙(test/textures.test.mjs 가 맞춰 본다)
    for suf in ('_orm', '_r', '_n'):
        if name.endswith(suf):
            base = name[:-len(suf)]
            if suf == '_n':
                return 256 if base in SMALL else 512
            return 512 if base in HERO else 256
    if name.startswith('plant_'):
        return 1024 if name in HERO else 512
    return 1024 if name in HERO else (256 if name in TINY else 512)


def wrap_resize(im, w, h):
    W, H = im.size
    p = max(8, W // 16)
    big = Image.new(im.mode, (W + 2 * p, H + 2 * p))
    for dx in (-1, 0, 1):
        for dy in (-1, 0, 1):
            big.paste(im, (p + dx * W, p + dy * H))
    k = w / W
    q = round(p * k)
    small = big.resize((w + 2 * q, h + 2 * q), Image.LANCZOS)
    return small.crop((q, q, q + w, q + h))


tot0 = tot1 = 0
for f in sorted(os.listdir(D)):
    path = os.path.join(D, f)
    name, ext = os.path.splitext(f)
    tot0 += os.path.getsize(path)
    im = Image.open(path); im.load()
    W, H = im.size
    m = target(name)
    if max(W, H) <= m:
        tot1 += os.path.getsize(path)
        continue
    k = m / max(W, H)
    w, h = max(1, round(W * k)), max(1, round(H * k))
    if ext == '.webp':
        im.convert('RGBA').resize((w, h), Image.LANCZOS).save(path, quality=88, method=6)
    else:
        out = wrap_resize(im.convert('RGB'), w, h)
        data = name.endswith(('_n', '_orm', '_r'))   # 데이터 지도는 4:4:4(색 하위 표본이 가장자리에서 이음매를 만든다)
        out.save(path, quality=90 if data else 86, subsampling=0 if data else 2, optimize=True)
    tot1 += os.path.getsize(path)
    print('%-24s %dx%d -> %dx%d' % (f, W, H, w, h))
print('total %.1f MB -> %.1f MB' % (tot0 / 1e6, tot1 / 1e6))
