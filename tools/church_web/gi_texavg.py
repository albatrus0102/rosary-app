#!/usr/bin/env python3
"""gi_texavg.py — 사진 질감 팩(assets/church/tex_pack*.js)의 사진마다 평균 색(선형, sRGB 풀어서)을 잰다.
빛 번짐 굽기(gi_bake.mjs, docs/church/RENDER_GI.md)가 표면의 반사율(알베도)로 쓴다. 법선(_n)·거칠기(_r) 지도는 건너뛴다.
사용: python3 tools/church_web/gi_texavg.py <assets/church> → 표준 출력에 JSON {"tex_x.jpg": {"len": 글자 수, "rgb": [r, g, b]}}
gi_bake.mjs 가 tools/church_web/gi_texavg.json 에 없는(또는 글자 수가 바뀐) 사진이 있을 때만 부른다(결과는 그 파일에 저장)."""
import base64
import io
import json
import os
import re
import sys

from PIL import Image


def lin(c):
    c = c / 255.0
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def main():
    root = sys.argv[1]
    lut = [lin(i) for i in range(256)]
    out = {}
    rx = re.compile(r'P\["([^"]+)"\]=\'data:image/[a-z]+;base64,([^\']+)\'')
    for f in sorted(os.listdir(root)):
        if not re.match(r'^tex_pack(_[a-z]+)?\.js$', f):
            continue
        src = open(os.path.join(root, f), encoding='utf-8').read()
        for m in rx.finditer(src):
            name, b64 = m.group(1), m.group(2)
            if re.search(r'_(n|r)\.jpg$', name):
                continue
            im = Image.open(io.BytesIO(base64.b64decode(b64))).convert('RGB')
            im.thumbnail((128, 128))
            raw = im.tobytes()
            n = float(len(raw) // 3) or 1.0
            rgb = [sum(lut[v] for v in raw[k::3]) / n for k in range(3)]
            out[name] = {'len': len(b64), 'rgb': [round(v, 4) for v in rgb]}
    json.dump(out, sys.stdout, sort_keys=True)


if __name__ == '__main__':
    main()
