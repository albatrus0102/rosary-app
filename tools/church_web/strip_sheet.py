# 카메라 확인 샷 띠를 한 장으로(docs/church/CAMERA_MODES.md): python3 tools/church_web/strip_sheet.py 폴더 [case ...]
# 폴더 안 before_<case>_NN.jpg · after_<case>_NN.jpg 를 줄마다(위 = 예전, 아래 = 지금) 이어 붙여 sheet_<case>.jpg 로 쓴다.
import glob
import os
import sys

from PIL import Image, ImageDraw

root = sys.argv[1]
cases = sys.argv[2:] or sorted({os.path.basename(p).split('_', 1)[1].rsplit('_', 1)[0] for p in glob.glob(os.path.join(root, '*', '*_*_[0-9][0-9].jpg'))})
for case in cases:
    rows = []
    for tag in ('before', 'after'):
        fs = sorted(glob.glob(os.path.join(root, tag, f'{tag}_{case}_[0-9][0-9].jpg')))
        if fs:
            rows.append((tag, [Image.open(f) for f in fs]))
    if not rows:
        continue
    w, h = rows[0][1][0].size
    sc = 0.5
    tw, th = int(w * sc), int(h * sc)
    n = max(len(r[1]) for r in rows)
    sheet = Image.new('RGB', (tw * n, th * len(rows)), (20, 20, 20))
    d = ImageDraw.Draw(sheet)
    for ri, (tag, ims) in enumerate(rows):
        for ci, im in enumerate(ims):
            sheet.paste(im.resize((tw, th)), (ci * tw, ri * th))
        d.text((6, ri * th + 6), tag, fill=(255, 230, 120))
    out = os.path.join(root, f'sheet_{case}.jpg')
    sheet.save(out, quality=82)
    print(out)
