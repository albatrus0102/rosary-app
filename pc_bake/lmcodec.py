"""lmcodec.py — PC 라이트맵 굽기(bake.py)의 순수 파이썬 부분: RGBM/16비트 PNG 쓰기, 진행률·남은 시간, 이어 굽기 기록, manifest.

Blender 없이도 돌고(시험: test/pc_bake.test.mjs 가 python3 로 부른다), Blender 안에서는 bake.py 가 import 한다.
numpy 가 있으면 쓰고(Blender 에는 늘 있다), 없으면 느린 순수 파이썬 길로 같은 값을 낸다.
값의 약속(앱 web/lightmap.js decode 와 짝):
  rgbm   : v = (L / range) ** (1/gamma), a = ceil(max(v) * 255) / 255, rgb = v / a  →  L = range * (rgb * a) ** gamma
  linear : 16비트 rgb = (L / range) ** (1/gamma)                              →  L = range * rgb ** gamma
  L 은 three 물리 조명 단위의 조도(irradiance) — 앱 셰이더가 irradiance 로 바로 쓴다.
"""
import json
import math
import os
import struct
import time
import zipfile
import zlib

try:
    import numpy as np
except Exception:  # pragma: no cover - Blender 에는 numpy 가 있다
    np = None

FORMAT = 'room-lightmap'
VERSION = 1
RANGE = 64.0     # 조도 상한(전구 바로 옆만 넘는다)
GAMMA = 2.2      # 어두운 곳 단계를 늘린다


# ---------- 인코딩 ----------
def _clip01(x):
    return 0.0 if x < 0.0 else (1.0 if x > 1.0 else x)


def encode_rgbm_px(L, rng=RANGE, gamma=GAMMA):
    """조도 (r,g,b) 하나 → RGBA 바이트 4개"""
    v = [_clip01(max(0.0, c) / rng) ** (1.0 / gamma) for c in L]
    m = max(v[0], v[1], v[2], 1e-6)
    a = min(255, max(1, int(math.ceil(m * 255.0))))
    af = a / 255.0
    return [min(255, int(round(c / af * 255.0))) for c in v] + [a]


def decode_rgbm_px(rgba, rng=RANGE, gamma=GAMMA):
    a = rgba[3] / 255.0
    return [rng * ((c / 255.0) * a) ** gamma for c in rgba[:3]]


def encode_rgbm(img, rng=RANGE, gamma=GAMMA):
    """img: 높이×폭×3 float(위→아래) → 높이×폭×4 uint8"""
    if np is not None:
        a = np.asarray(img, dtype=np.float64)
        v = np.clip(np.maximum(a, 0.0) / rng, 0.0, 1.0) ** (1.0 / gamma)
        m = np.maximum(v.max(axis=2), 1e-6)
        al = np.clip(np.ceil(m * 255.0), 1, 255)
        rgb = np.clip(np.round(v / (al / 255.0)[..., None] * 255.0), 0, 255)
        return np.concatenate([rgb, al[..., None]], axis=2).astype(np.uint8)
    return [[encode_rgbm_px(px, rng, gamma) for px in row] for row in img]


def encode_linear16(img, rng=RANGE, gamma=GAMMA):
    if np is not None:
        a = np.asarray(img, dtype=np.float64)
        return np.round(np.clip(np.maximum(a, 0.0) / rng, 0.0, 1.0) ** (1.0 / gamma) * 65535.0).astype(np.uint16)
    return [[[int(round(_clip01(max(0.0, c) / rng) ** (1.0 / gamma) * 65535.0)) for c in px] for px in row] for row in img]


# ---------- PNG ----------
def _chunk(tag, data):
    c = struct.pack('>I', len(data)) + tag + data
    return c + struct.pack('>I', zlib.crc32(tag + data) & 0xffffffff)


def write_png(path, img, bits=8):
    """img: 높이×폭×채널(3 또는 4) 정수(8 또는 16비트), 첫 줄 = 그림 위. 원자적으로 쓴다(임시 파일 → 바꾸기)."""
    if np is not None:
        a = np.asarray(img)
        h, w, ch = a.shape
        if bits == 16:
            rows = a.astype('>u2').reshape(h, w * ch).view(np.uint8).reshape(h, w * ch * 2)
        else:
            rows = a.astype(np.uint8).reshape(h, w * ch)
        raw = np.concatenate([np.zeros((h, 1), np.uint8), rows], axis=1).tobytes()
    else:
        h, w, ch = len(img), len(img[0]), len(img[0][0])
        out = bytearray()
        for row in img:
            out.append(0)
            for px in row:
                for c in px:
                    out += struct.pack('>H', c) if bits == 16 else bytes([c])
        raw = bytes(out)
    color_type = 6 if ch == 4 else 2
    data = b'\x89PNG\r\n\x1a\n' + _chunk(b'IHDR', struct.pack('>IIBBBBB', w, h, bits, color_type, 0, 0, 0)) + \
        _chunk(b'IDAT', zlib.compress(raw, 6)) + _chunk(b'IEND', b'')
    tmp = path + '.tmp'
    with open(tmp, 'wb') as f:
        f.write(data)
    os.replace(tmp, path)
    return len(data)


def read_png(path):
    """시험용 최소 읽기(필터 0 만 — write_png 가 쓴 것) → (폭, 높이, 비트, 채널, 바이트열)"""
    with open(path, 'rb') as f:
        d = f.read()
    assert d[:8] == b'\x89PNG\r\n\x1a\n'
    p, idat, w, h, bits, ct = 8, b'', None, None, 8, 2
    while p < len(d):
        n = struct.unpack('>I', d[p:p + 4])[0]
        tag = d[p + 4:p + 8]
        body = d[p + 8:p + 8 + n]
        if tag == b'IHDR':
            w, h, bits, ct = struct.unpack('>IIBB', body[:10])
        elif tag == b'IDAT':
            idat += body
        p += 12 + n
    ch = 4 if ct == 6 else 3
    raw = zlib.decompress(idat)
    stride = w * ch * (bits // 8) + 1
    rows = b''.join(raw[y * stride + 1:(y + 1) * stride] for y in range(h))
    return w, h, bits, ch, rows


# ---------- 화질·크기 ----------
def size_for(w, h, q):
    """기준 해상도 × 배율(상한) — tools/lm_export.mjs sizeFor 와 같은 식"""
    s = q['scale']
    if max(w, h) * s > q['maxSize']:
        s = q['maxSize'] / float(max(w, h))
    return max(4, int(round(w * s))), max(4, int(round(h * s)))


def margin_for(base_pad, w, base_w):
    return max(1, int(round(base_pad * w / float(base_w))))


# ---------- 진행률·남은 시간 ----------
def fmt_dur(sec):
    sec = int(max(0, round(sec)))
    h, r = divmod(sec, 3600)
    m, s = divmod(r, 60)
    if h:
        return '%dh%02dm' % (h, m)
    if m:
        return '%dm%02ds' % (m, s)
    return '%ds' % s


class Progress(object):
    """일감(무게 = 텍셀 × 표본) 합계에 대한 끝낸 몫으로 % 와 남은 시간을 낸다. 이미 끝난(건너뛴) 일감은 속도 계산에서 뺀다."""

    def __init__(self, total, clock=time.time):
        self.total = float(max(total, 1e-9))
        self.done = 0.0
        self.skipped = 0.0
        self.clock = clock
        self.t0 = clock()

    def skip(self, w):
        self.done += w
        self.skipped += w

    def step(self, w):
        self.done += w

    def pct(self):
        return min(100.0, 100.0 * self.done / self.total)

    def eta(self):
        work = self.done - self.skipped
        el = self.clock() - self.t0
        if work <= 0 or el <= 0:
            return None
        return (self.total - self.done) * el / work

    def line(self, label):
        e = self.eta()
        return '[%5.1f%%] %s | elapsed %s | ETA %s' % (self.pct(), label, fmt_dur(self.clock() - self.t0), fmt_dur(e) if e is not None else '?')


# ---------- 이어 굽기 ----------
def job_sig(target, q, qname, time_name, scene_hash, enc=None):
    enc = enc or {'encoding': 'rgbm', 'range': RANGE, 'gamma': GAMMA}
    return {'target': target['id'], 'n': target['n'], 'sum': target['sum'], 'quality': qname, 'samples': q['samples'],
            'time': time_name, 'scene': scene_hash, 'encoding': enc['encoding'], 'range': enc['range'], 'gamma': enc['gamma']}


def state_path(out, time_name, tid):
    return os.path.join(out, 'state', '%s_%s.json' % (time_name, tid))


def is_done(out, time_name, tid, sig):
    p = state_path(out, time_name, tid)
    try:
        with open(p, 'r', encoding='utf-8') as f:
            rec = json.load(f)
    except Exception:
        return None
    if rec.get('sig') != sig:
        return None
    if not os.path.isfile(os.path.join(out, rec.get('file', ''))):
        return None
    return rec


def mark_done(out, time_name, tid, sig, rec):
    os.makedirs(os.path.join(out, 'state'), exist_ok=True)
    rec = dict(rec)
    rec['sig'] = sig
    p = state_path(out, time_name, tid)
    with open(p + '.tmp', 'w', encoding='utf-8') as f:
        json.dump(rec, f, indent=1, sort_keys=True)
    os.replace(p + '.tmp', p)
    return rec


# ---------- manifest ----------
def build_manifest(targets_json, lights_json, out, qname, times, info=None, enc=None):
    """끝난 일감 기록(state/*.json)으로 앱이 읽는 manifest.json 을 만든다. 두 시각 모두 끝난 대상만 files 를 갖는다."""
    enc = enc or {'encoding': 'rgbm', 'range': RANGE, 'gamma': GAMMA}
    rows, done_all = [], True
    for t in targets_json['targets']:
        if not t.get('lm'):
            continue
        files = {}
        for tm in ('day', 'night'):
            p = state_path(out, tm, t['id'])
            if os.path.isfile(p):
                with open(p, 'r', encoding='utf-8') as f:
                    rec = json.load(f)
                if os.path.isfile(os.path.join(out, rec.get('file', ''))):
                    files[tm] = rec['file']
        row = {'id': t['id'], 'kind': t['kind'], 'n': t['n'], 'sum': t['sum'], 'off': t['off']}
        if files:
            row['files'] = files
            row['size'] = None
        rows.append(row)
        if any(tm not in files for tm in times):
            done_all = False
    for r in rows:
        if 'files' in r:
            rec_p = state_path(out, 'day' if 'day' in r['files'] else 'night', r['id'])
            with open(rec_p, 'r', encoding='utf-8') as f:
                rec = json.load(f)
            r['size'] = [rec.get('w'), rec.get('h')]
    man = {
        'format': FORMAT, 'v': VERSION, 'scene': targets_json['scene'], 'quality': qname,
        'encoding': enc['encoding'], 'range': enc['range'], 'gamma': enc['gamma'],
        'unit': 'irradiance (three.js physicallyCorrectLights), lightMap uv2 = glTF v-down, PNG row 0 = top, flipY false',
        'uv2': 'uv2.bin', 'complete': done_all,
        'times': {tm: {'hour': lights_json['times'][tm]['hour'], 'key': lights_json['times'][tm]['key']['mode']} for tm in ('day', 'night')},
        'targets': rows,
    }
    if info:
        man['info'] = info
    return man


def write_json(path, obj):
    with open(path + '.tmp', 'w', encoding='utf-8') as f:
        json.dump(obj, f, indent=1, ensure_ascii=False)
        f.write('\n')
    os.replace(path + '.tmp', path)


def zip_dir(folder, zip_path):
    tmp = zip_path + '.tmp'
    with zipfile.ZipFile(tmp, 'w', zipfile.ZIP_DEFLATED) as z:
        for root, _dirs, files in os.walk(folder):
            for fn in sorted(files):
                if fn.endswith('.tmp') or fn.endswith('.exr'):
                    continue
                full = os.path.join(root, fn)
                z.write(full, os.path.relpath(full, os.path.dirname(folder)))
    os.replace(tmp, zip_path)
    return zip_path


def estimate(texels, q, cores_rate):
    """대충 걸리는 초: 텍셀 × (표본 + 해/달 표본) / 초당 표본·텍셀 + 대상당 준비 3초 × 2패스"""
    return texels * (q['samples'] + q.get('keySamples', 0)) / float(cores_rate)


if __name__ == '__main__':  # 작은 자기 시험
    px = encode_rgbm_px([1.0, 0.5, 0.01])
    back = decode_rgbm_px(px)
    print(px, [round(v, 4) for v in back])
