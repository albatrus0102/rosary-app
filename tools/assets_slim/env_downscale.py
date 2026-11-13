#!/usr/bin/env python3
"""assets/church/env_church.js 안의 RGBE HDR 파노라마를 가로·세로 절반으로 줄인다(APK 용량).

    python3 tools/assets_slim/env_downscale.py            # 1024x512 -> 512x256 (이미 줄었으면 아무것도 안 함)

성당 반사·조명용 환경 지도(IBL)라 거칠기를 거치며 흐려져 쓰이므로 절반 해상도로도 구분이 어렵다.
원본(1024x512)은 art/env_church_1k.hdr 로 보존하고, 되돌리려면
`node tools/church_web/build_envpack.mjs art/env_church_1k.hdr small_cathedral_1k.hdr`.
numpy 필요.
"""
import base64
import os
import re
import sys

import numpy as np

REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
JS = os.path.join(REPO, 'assets', 'church', 'env_church.js')
BACKUP = os.path.join(REPO, 'art', 'env_church_1k.hdr')


def read_rgbe(buf):
    p = 0
    while buf[p:p + 1] != b'\n' or buf[p + 1:p + 2] != b'\n':
        p += 1
        if p > 400:
            raise ValueError('header')
    p += 2
    e = buf.index(b'\n', p)
    m = re.match(rb'-Y (\d+) \+X (\d+)', buf[p:e])
    h, w = int(m.group(1)), int(m.group(2))
    p = e + 1
    img = np.zeros((h, w, 4), np.uint8)
    for y in range(h):
        if not (buf[p] == 2 and buf[p + 1] == 2 and (buf[p + 2] << 8 | buf[p + 3]) == w):
            raise ValueError('not scanline RLE')
        p += 4
        for c in range(4):
            x = 0
            while x < w:
                n = buf[p]
                p += 1
                if n > 128:
                    n -= 128
                    img[y, x:x + n, c] = buf[p]
                    p += 1
                else:
                    img[y, x:x + n, c] = np.frombuffer(buf[p:p + n], np.uint8)
                    p += n
                x += n
    return img


def to_float(img):
    e = img[..., 3].astype(np.int32)
    f = np.where(e > 0, np.ldexp(1.0, e - 136), 0.0)
    return img[..., :3].astype(np.float64) * f[..., None]


def to_rgbe(rgb):
    m = rgb.max(axis=2)
    mant, ex = np.frexp(np.maximum(m, 1e-38))
    scale = mant * 256.0 / np.maximum(m, 1e-38)
    out = np.zeros(rgb.shape[:2] + (4,), np.uint8)
    ok = m > 1e-32
    for c in range(3):
        out[..., c] = np.where(ok, np.clip(rgb[..., c] * scale, 0, 255), 0).astype(np.uint8)
    out[..., 3] = np.where(ok, ex + 128, 0).astype(np.uint8)
    return out


def rle_channel(row):
    out = bytearray()
    i, n = 0, len(row)
    while i < n:
        j = i
        while j < n and j - i < 127 and row[j] == row[i]:
            j += 1
        if j - i >= 3:
            out += bytes([128 + (j - i), row[i]])
            i = j
        else:
            k = i
            while k < n and k - i < 128 and not (k + 2 < n and row[k] == row[k + 1] == row[k + 2]):
                k += 1
            k = max(k, i + 1)
            out += bytes([k - i]) + bytes(row[i:k])
            i = k
    return bytes(out)


def write_rgbe(img):
    h, w = img.shape[:2]
    out = bytearray(b'#?RADIANCE\n# downscaled by tools/assets_slim/env_downscale.py\nFORMAT=32-bit_rle_rgbe\n\n')
    out += ('-Y %d +X %d\n' % (h, w)).encode()
    for y in range(h):
        out += bytes([2, 2, w >> 8, w & 255])
        for c in range(4):
            out += rle_channel(img[y, :, c].tolist())
    return bytes(out)


def main():
    s = open(JS, encoding='utf8').read()
    m = re.search(r'name:"([^"]*)",b64:"([^"]*)"', s)
    raw = base64.b64decode(m.group(2))
    img = read_rgbe(raw)
    h, w = img.shape[:2]
    if w <= 512:
        print('이미 %dx%d: 아무것도 안 함' % (w, h))
        return
    if not os.path.exists(BACKUP):
        os.makedirs(os.path.dirname(BACKUP), exist_ok=True)
        open(BACKUP, 'wb').write(raw)
    f = to_float(img)
    f = f.reshape(h // 2, 2, w // 2, 2, 3).mean(axis=(1, 3))
    small = write_rgbe(to_rgbe(f))
    name = m.group(1).replace('1k', '512')
    head = '/* env_church.js — %s (Poly Haven small_cathedral, CC0) RGBE 파노라마 %dx%d(원본 1k 를 절반으로 줄임, tools/assets_slim/env_downscale.py)를 base64 로 넣은 것 */\n' % (name, w // 2, h // 2)
    open(JS, 'w', encoding='utf8').write(head + 'window.ChurchEnvHDR={name:"%s",b64:"%s"};\n' % (name, base64.b64encode(small).decode()))
    print('%dx%d %.0f KB -> %dx%d %.0f KB' % (w, h, len(raw) / 1024, w // 2, h // 2, len(small) / 1024))


if __name__ == '__main__':
    sys.exit(main())
