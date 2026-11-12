#!/usr/bin/env python3
"""ElevenLabs 선창·후창 음성 — '한 번에 읽히고, 줄 끝 쉼만 바로잡는' 방식(J2 확정 기준, v5).

문제: 줄마다 따로 합성하면(v4) 억양이 줄마다 새로 시작해 '씹히고 끊기고 늘어지는' 소리가 났다.
방법: 기도문 전체를 J2 시험 때와 똑같이 한 번에 합성하고(줄바꿈·쉼표 없이 띄어쓰기만, 마침표는 맨 끝에만),
글자별 시간표(with-timestamps)로 줄 경계 위치를 찾아 그 자리의 쉼만 정해진 길이로 맞춘다.
- 줄 끝(경계): 쉼을 0.40초(+앞뒤 여유로 실제 약 0.45)로 맞춘다. 모델이 안 쉬었으면 가장 조용한 지점에 넣는다.
- 줄 안: 모델이 넣은 0.15초 넘는 쉼은 0.05초로 줄인다(쉬지 않고 이어 읽기).
- 소리를 자르는 곳은 모두 소리가 가장 작은 지점(단어 사이)이다. 맨 앞뒤는 아주 낮은 문턱으로 다듬어 어두를 깎지 않는다.
사용: python3 tools/leader_voice/generate_clips_flow.py --out DIR [--only id,id] [--persona sister|priest]
"""
import argparse, base64, datetime as dt, hashlib, json, subprocess, time, urllib.error, urllib.request
from pathlib import Path
import numpy as np

HERE = Path(__file__).resolve().parent
VOICES = {'sister': 'yeieVCpNANUQm8gq7quR', 'priest': 'JL0iS7pVcKbJG6tHz7fn'}
MODEL = 'eleven_multilingual_v2'
SETTINGS = dict(stability=1.0, similarity_boost=0.8, style=0.0, use_speaker_boost=True, speed=1.0)
SR = 44100
LINE_PAUSE = 0.40; TITLE_PAUSE = 0.55; INNER_KEEP = 0.05; INNER_MIN = 0.15
KOR_NUM = {'1': '일', '2': '이', '3': '삼', '4': '사', '5': '오'}

def lines_of(cue):
    raw = [l.strip() for l in cue['text'].split('\n') if l.strip()]
    out = []
    for i, l in enumerate(raw):
        t = l
        if cue['id'].startswith('mystery_') and i == 0:
            for d, k in KOR_NUM.items(): t = t.replace(f'{d}단', f'{k} 단')
        for ch in ',.!?': t = t.replace(ch, '')
        out.append(' '.join(t.split()))
    return out

def tts(vid, text, tries=5):
    body = {'text': text, 'model_id': MODEL, 'voice_settings': SETTINGS}
    for k in range(tries):
        req = urllib.request.Request(f'https://api.elevenlabs.io/v1/text-to-speech/{vid}/with-timestamps?output_format=mp3_44100_128',
                                     data=json.dumps(body).encode(), headers={'Content-Type': 'application/json'}, method='POST')
        try:
            with urllib.request.urlopen(req, timeout=240) as r: return json.loads(r.read())
        except urllib.error.HTTPError as e:
            msg = e.read().decode()[:300]
            if e.code in (429, 500, 502, 503) and k < tries - 1: time.sleep(4 * (k + 1)); continue
            raise SystemExit(f'HTTP {e.code}: {msg}')
        except Exception:
            if k < tries - 1: time.sleep(4 * (k + 1)); continue
            raise

def decode(mp3):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', 'pipe:0', '-f', 's16le', '-ac', '1', '-ar', str(SR), '-'], input=mp3, capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.int16).astype(np.float32) / 32768

FR = int(SR * 0.005)
def frames(x):
    n = len(x) // FR
    return np.sqrt((x[:n * FR].reshape(n, FR) ** 2).mean(axis=1)), n

def boundary_region(x, t_end, t_next):
    """줄 경계의 쉼 자리(샘플 구간). 글자 시간표의 '앞 줄 마지막 글자 끝 ~ 다음 줄 첫 글자 시작' 사이가 기준이다.
    그 근처에 실제 무음 구간이 있으면 그 구간 전체를, 없으면(모델이 안 쉬고 이어 읽은 곳) 그 사이에서 가장
    조용한 한 점을 쓴다. 단어 한가운데를 자르지 않도록 이 사이 밖은 보지 않는다."""
    rms, n = frames(x); thr = max(rms.max() * 0.02, 1e-5)
    lo = max(0, int((t_end - 0.06) / 0.005)); hi = min(n, int((t_next + 0.06) / 0.005) + 1)
    sil = [i for i in range(lo, hi) if rms[i] < thr]
    if len(sil) >= 3:
        a = sil[0]; b = sil[-1]
        while a - 1 >= 0 and rms[a - 1] < thr: a -= 1
        while b + 1 < n and rms[b + 1] < thr: b += 1
        return a * FR, (b + 1) * FR
    g0 = max(0, int(t_end / 0.005)); g1 = max(g0 + 1, min(n, int(t_next / 0.005) + 1))
    c = g0 + int(np.argmin(rms[g0:g1]))
    return c * FR, (c + 1) * FR

def squeeze(seg, keep=INNER_KEEP, minlen=INNER_MIN):
    rms, n = frames(seg)
    if n == 0: return seg
    sil = rms < max(rms.max() * 0.02, 1e-4)
    out = []; i = 0
    while i < n:
        j = i
        if sil[i]:
            while j < n and sil[j]: j += 1
            s = seg[i * FR:j * FR]
            if (j - i) * 0.005 > minlen:
                k = int(SR * keep); h = k // 2; s = np.concatenate([s[:h], s[-(k - h):]])
            out.append(s)
        else:
            while j < n and not sil[j]: j += 1
            out.append(seg[i * FR:j * FR])
        i = j
    out.append(seg[n * FR:])
    return np.concatenate(out)

def flat_score(y):
    """낮을수록 평탄(억양이 오르내리지 않음). 줄 끝이 올라가거나(기울기+) 음높이 변동이 크면 벌점."""
    try:
        import librosa
    except ImportError:
        return 0.0
    y22 = librosa.resample(y, orig_sr=SR, target_sr=22050)
    f0, _, _ = librosa.pyin(y22, fmin=70, fmax=400, sr=22050, frame_length=1024, hop_length=256)
    t = librosa.times_like(f0, sr=22050, hop_length=256); voiced = ~np.isnan(f0)
    runs = []; start = None; last = None
    for i, v in enumerate(voiced):
        if v:
            if start is None: start = i
            elif t[i] - t[last] > 0.3: runs.append((start, last)); start = i
            last = i
    if start is not None: runs.append((start, last))
    pen = []; stds = []
    for a, b in runs:
        seg = f0[a:b + 1]; tt = t[a:b + 1]; m = ~np.isnan(seg)
        if m.sum() < 8: continue
        st = 12 * np.log2(seg[m] / np.nanmedian(seg[m])); tm = tt[m]
        w = tm >= tm[-1] - 0.3
        slope = np.polyfit(tm[w], st[w], 1)[0] if w.sum() > 4 else 0.0
        end = st[tm >= tm[-1] - 0.15].mean()
        pen.append(max(0.0, slope) / 10 + 2 * max(0.0, end)); stds.append(float(np.nanstd(st)))
    if not pen: return 0.0
    return float(np.mean(pen) + 0.5 * np.mean(stds))

def xfade(a, b, n=int(SR * 0.004)):
    if len(a) < n or len(b) < n: return np.concatenate([a, b])
    w = np.linspace(0, 1, n)
    return np.concatenate([a[:-n], a[-n:] * (1 - w) + b[:n] * w, b[n:]])

SEP = ' '

TAKES = 1

def build(vid, cue):
    best = None
    for _ in range(TAKES):
        r = build_once(vid, cue)
        if best is None or r[3] < best[3]: best = r
    return best[0], best[1], best[2], best[3]

def build_once(vid, cue):
    ls = lines_of(cue)
    text = SEP.join(ls) + '.'
    res = tts(vid, text)
    x = decode(base64.b64decode(res['audio_base64']))
    al = res['alignment']; chars = al['characters']; st = al['character_start_times_seconds']; en = al['character_end_times_seconds']
    # 줄 경계 시각: 각 줄의 마지막 글자 끝 ↔ 다음 줄 첫 글자 시작
    pos = 0; idx = []
    s = ''.join(chars)
    for l in ls:
        a = s.index(l, pos); idx.append((a, a + len(l) - 1)); pos = a + len(l)
    cuts = []
    for i in range(len(ls) - 1):
        a, b = boundary_region(x, en[idx[i][1]], st[idx[i + 1][0]])
        cuts.append((a, b, TITLE_PAUSE if cue['id'].startswith('mystery_') and i == 0 else LINE_PAUSE))
    # 겹침 방지
    cuts.sort(); parts = []; cur = 0
    for a, b, pause in cuts:
        a = max(a, cur)
        seg = squeeze(x[cur:a])
        parts.append(('s', seg)); parts.append(('p', np.zeros(int(SR * pause), dtype=np.float32))); cur = max(b, a)
    parts.append(('s', squeeze(x[cur:])))
    y = np.zeros(0, dtype=np.float32)
    for kind, seg in parts:
        y = seg.copy() if len(y) == 0 else (np.concatenate([y, seg]) if kind == 'p' or True else y)
    # 맨 앞뒤 다듬기(낮은 문턱)
    rms, n = frames(y)
    nz = np.where(rms >= rms.max() * 0.004)[0]
    a = max(0, nz[0] * FR - int(SR * 0.05)); b = min(len(y), (nz[-1] + 1) * FR + int(SR * 0.15))
    y = np.concatenate([np.zeros(int(SR * 0.05), dtype=np.float32), y[a:b], np.zeros(int(SR * 0.10), dtype=np.float32)])
    score = flat_score(y) if TAKES > 1 else 0.0
    pcm = (np.clip(y, -1, 1) * 32767).astype(np.int16).tobytes()
    mp3 = subprocess.run(['ffmpeg', '-v', 'error', '-f', 's16le', '-ar', str(SR), '-ac', '1', '-i', 'pipe:0',
                          '-af', 'loudnorm=I=-18:LRA=7:TP=-1.5', '-ar', '44100', '-ac', '1', '-b:a', '96k', '-f', 'mp3', 'pipe:1'],
                         input=pcm, capture_output=True, check=True).stdout
    return mp3, len(y) / SR, text, score

def main():
    ap = argparse.ArgumentParser(); ap.add_argument('--out', required=True); ap.add_argument('--only', default=''); ap.add_argument('--persona', default=''); ap.add_argument('--takes', type=int, default=1, help='같은 큐를 여러 번 합성해 가장 평탄한 것을 고른다'); ap.add_argument('--sep', default=' ', help="줄 사이 구분(' ' | '. ' | ', ')")
    a = ap.parse_args()
    global SEP, TAKES; SEP = a.sep.replace('\\n','\n'); TAKES = a.takes
    cues = json.loads((HERE / 'cues.json').read_text()) + json.loads((HERE / 'responder_cues.json').read_text())
    only = set(filter(None, a.only.split(','))); out = Path(a.out); chars = 0; manifest = {}
    for persona, vid in VOICES.items():
        if a.persona and a.persona != persona: continue
        d = out / persona; d.mkdir(parents=True, exist_ok=True)
        manifest[persona] = dict(provider='elevenlabs', voice=vid, model=MODEL, settings=SETTINGS, method='whole-prayer synthesis + line-end pause edit (v5)', generatedAt=dt.datetime.now(dt.timezone.utc).isoformat(), files={})
        for c in cues:
            if only and c['id'] not in only: continue
            mp3, dur, text, score = build(vid, c); chars += len(text) * TAKES
            (d / f"{c['id']}.mp3").write_bytes(mp3)
            manifest[persona]['files'][c['id']] = dict(bytes=len(mp3), sha256=hashlib.sha256(mp3).hexdigest(), seconds=round(dur, 2), text=text, flat_score=round(score, 2))
            print(persona, c['id'], f'{dur:.1f}s', f'{len(mp3)//1024}KB', f'flat={score:.2f}', flush=True)
    (out / 'manifest_flow.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=1))
    print('characters sent:', chars)

if __name__ == '__main__':
    main()
