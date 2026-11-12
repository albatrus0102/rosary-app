#!/usr/bin/env python3
"""ElevenLabs 선창·후창 음성 — 줄 단위 호흡 방식(소유자 확정 J2 기준).

확정 기준(성모송 J2 시험 클립을 측정한 결과): 호흡 단위 = 큐 문구의 줄(공식 기도서 줄 나눔),
쉼은 줄 끝에서만 약 0.45초(0.38~0.54), 줄 안에서는 쉬지 않는다. 억양은 평탄(stability 1.0).
그래서 줄마다 따로 합성하고(앞뒤 줄을 previous_text/next_text로 넘겨 이음새를 맞춘다) 정해진 쉼으로 잇는다.
모델이 쉼 위치를 정하지 않으므로 같은 문구는 언제나 같은 호흡이 된다.
사용: python3 tools/leader_voice/generate_clips_lines.py --out DIR [--only id,id] [--persona sister|priest]
      (--out 에 assets/leader_voice 를 주면 앱에 바로 들어간다. 시험은 임시 폴더로.)
"""
import argparse, base64, datetime as dt, hashlib, json, subprocess, time, urllib.error, urllib.request
from pathlib import Path
import numpy as np

HERE = Path(__file__).resolve().parent
VOICES = {'sister': 'yeieVCpNANUQm8gq7quR', 'priest': 'JL0iS7pVcKbJG6tHz7fn'}
MODEL = 'eleven_multilingual_v2'
SETTINGS = dict(stability=1.0, similarity_boost=0.8, style=0.0, use_speaker_boost=True, speed=1.0)
SR = 44100
LINE_PAUSE = 0.40          # 줄 끝 쉼(초). 앞뒤 여유가 더해져 실제 쉼은 약 0.45초
TITLE_PAUSE = 0.55         # 신비 제목 뒤 쉼
KOR_NUM = {'1': '일', '2': '이', '3': '삼', '4': '사', '5': '오'}

def lines_of(cue):
    """[(text, pause_after)] — 구두점은 지우고 마지막 줄에만 마침표."""
    raw = [l.strip() for l in cue['text'].split('\n') if l.strip()]
    out = []
    for i, l in enumerate(raw):
        t = l
        if cue['id'].startswith('mystery_') and i == 0:
            for d, k in KOR_NUM.items(): t = t.replace(f'{d}단', f'{k} 단')
        for ch in ',.!?': t = t.replace(ch, '')
        t = ' '.join(t.split())
        last = i == len(raw) - 1
        pause = 0.0 if last else (TITLE_PAUSE if cue['id'].startswith('mystery_') and i == 0 else LINE_PAUSE)
        out.append([t + ('.' if last else ''), pause])
    return out

def tts(vid, text, prev, nxt, tries=5):
    body = {'text': text, 'model_id': MODEL, 'voice_settings': SETTINGS}
    if prev: body['previous_text'] = prev
    if nxt: body['next_text'] = nxt
    for k in range(tries):
        req = urllib.request.Request(f'https://api.elevenlabs.io/v1/text-to-speech/{vid}?output_format=mp3_44100_128',
                                     data=json.dumps(body).encode(), headers={'Content-Type': 'application/json', 'Accept': 'audio/mpeg'}, method='POST')
        try:
            with urllib.request.urlopen(req, timeout=240) as r: return r.read()
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

def trim(x, lead=0.02, tail=0.04):
    win = int(SR * 0.005); n = len(x) // win
    rms = np.sqrt((x[:n * win].reshape(n, win) ** 2).mean(axis=1))
    nz = np.where(rms >= max(rms.max() * 0.02, 1e-4))[0]
    a = max(0, nz[0] * win - int(SR * lead)); b = min(len(x), (nz[-1] + 1) * win + int(SR * tail))
    return x[a:b]

def squeeze(seg, keep=0.05, minlen=0.15):
    """줄 안에서는 쉬지 않는다: 모델이 줄 안에 넣은 긴 쉼을 keep 초로 줄인다."""
    win = int(SR * 0.01); n = len(seg) // win
    rms = np.sqrt((seg[:n * win].reshape(n, win) ** 2).mean(axis=1))
    sil = rms < max(rms.max() * 0.02, 1e-4)
    out = []; i = 0
    while i < n:
        j = i
        if sil[i]:
            while j < n and sil[j]: j += 1
            s = seg[i * win:j * win]
            if (j - i) * 0.01 > minlen:
                k = int(SR * keep); h = k // 2; s = np.concatenate([s[:h], s[-(k - h):]])
            out.append(s)
        else:
            while j < n and not sil[j]: j += 1
            out.append(seg[i * win:j * win])
        i = j
    out.append(seg[n * win:])
    return np.concatenate(out)

def build(vid, cue):
    ls = lines_of(cue); parts = []
    for i, (t, pause) in enumerate(ls):
        prev = ' '.join(l[0] for l in ls[max(0, i - 2):i]) or None
        nxt = ' '.join(l[0] for l in ls[i + 1:i + 3]) or None
        x = squeeze(trim(decode(tts(vid, t, prev, nxt))))
        # 줄 사이 이음새 잡음 방지: 8ms 페이드
        f = int(SR * 0.008); x[:f] *= np.linspace(0, 1, f); x[-f:] *= np.linspace(1, 0, f)
        parts.append(x)
        if pause: parts.append(np.zeros(int(SR * pause), dtype=np.float32))
    y = np.concatenate([np.zeros(int(SR * 0.05), dtype=np.float32)] + parts + [np.zeros(int(SR * 0.15), dtype=np.float32)])
    pcm = (np.clip(y, -1, 1) * 32767).astype(np.int16).tobytes()
    mp3 = subprocess.run(['ffmpeg', '-v', 'error', '-f', 's16le', '-ar', str(SR), '-ac', '1', '-i', 'pipe:0',
                          '-af', 'loudnorm=I=-18:LRA=7:TP=-1.5', '-ar', '44100', '-ac', '1', '-b:a', '96k', '-f', 'mp3', 'pipe:1'],
                         input=pcm, capture_output=True, check=True).stdout
    return mp3, len(y) / SR, ls

def main():
    ap = argparse.ArgumentParser(); ap.add_argument('--out', required=True); ap.add_argument('--only', default=''); ap.add_argument('--persona', default='')
    a = ap.parse_args()
    cues = json.loads((HERE / 'cues.json').read_text()) + json.loads((HERE / 'responder_cues.json').read_text())
    only = set(filter(None, a.only.split(','))); out = Path(a.out); chars = 0
    manifest = {}
    for persona, vid in VOICES.items():
        if a.persona and a.persona != persona: continue
        d = out / persona; d.mkdir(parents=True, exist_ok=True)
        manifest[persona] = dict(provider='elevenlabs', voice=vid, model=MODEL, settings=SETTINGS, method='line-by-line, pause 0.45s', generatedAt=dt.datetime.now(dt.timezone.utc).isoformat(), files={})
        for c in cues:
            if only and c['id'] not in only: continue
            mp3, dur, ls = build(vid, c); chars += sum(len(l[0]) for l in ls)
            (d / f"{c['id']}.mp3").write_bytes(mp3)
            manifest[persona]['files'][c['id']] = dict(bytes=len(mp3), sha256=hashlib.sha256(mp3).hexdigest(), seconds=round(dur, 2), lines=[l[0] for l in ls])
            print(persona, c['id'], f'{dur:.1f}s', f'{len(mp3)//1024}KB', flush=True)
    (out / 'manifest_lines.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=1))
    print('characters sent:', chars)

if __name__ == '__main__':
    main()
