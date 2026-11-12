#!/usr/bin/env python3
"""ElevenLabs 선창(26)·후창(5) 음성 62개를 만든다(여성/남성 각 31개).

- 키는 환경에 두지 않는다: 네트워크 프록시가 api.elevenlabs.io 요청에 키를 붙인다(코드에 키 없음).
- 설정은 오디션에서 확정한 값: 모델 eleven_multilingual_v2, stability 1.0(억양 평탄), style 0, speed 1.0.
- 문구 정리 규칙: 줄바꿈·쉼표·느낌표를 지우고 띄어쓰기로만 잇는다. 마침표는 맨 끝에만 둔다(모델이 구절 사이를
  스스로 0.4~0.5초 쉬며 읽는 것이 가장 자연스럽다는 확인). 신비 큐는 제목과 본문 사이에만 마침표를 둔다.
- 붙여 읽을 구간: "주님께서 함께 계시니 여인 중에 복되시며"만 쉼 없이 잇는다(그 뒤 "태중의"와는 뗀다).
  글자별 시간표(with-timestamps)로 그 구간의 소리를 찾아 안의 쉼만 줄인다.
- 마무리: 앞 0.05초·뒤 0.15초만 남기고 무음 정리, 음량 평준화(loudnorm), mono 96 kbps mp3.
사용: python3 tools/leader_voice/generate_clips_elevenlabs.py [--only id,id] [--persona sister|priest]
"""
import argparse, base64, datetime as dt, hashlib, json, subprocess, sys, time, urllib.error, urllib.request
from pathlib import Path
import numpy as np

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent.parent
VOICES = {'sister': 'yeieVCpNANUQm8gq7quR', 'priest': 'JL0iS7pVcKbJG6tHz7fn'}
MODEL = 'eleven_multilingual_v2'
SETTINGS = dict(stability=1.0, similarity_boost=0.8, style=0.0, use_speaker_boost=True, speed=1.0)
JOIN_PHRASES = ['주님께서 함께 계시니 여인 중에 복되시며']
SR = 44100
KOR_NUM = {'1': '일', '2': '이', '3': '삼', '4': '사', '5': '오'}

def clean(cue):
    text = cue['text']
    if cue['id'].startswith('mystery_'):
        title, body = [l.strip() for l in text.split('\n', 1)]
        for d, k in KOR_NUM.items():
            title = title.replace(f'{d}단', f'{k} 단')
        body = body.replace('\n', ' ')
        t = f'{title}. {body}'
    else:
        t = ' '.join(l.strip() for l in text.split('\n'))
    for ch in ',!?':
        t = t.replace(ch, '')
    # 맨 끝을 뺀 마침표는 지운다.
    t = t.strip()
    end = t.endswith('.')
    body = t[:-1] if end else t
    if cue['id'].startswith('mystery_'):
        head, _, rest = body.partition('. ')
        body = head + '. ' + rest.replace('.', '')
    else:
        body = body.replace('.', '')
    body = ' '.join(body.split())
    return body + ('.' if end or not cue['id'].startswith('mystery_') else '.')

def tts(vid, text, tries=5):
    body = {'text': text, 'model_id': MODEL, 'voice_settings': SETTINGS}
    for k in range(tries):
        req = urllib.request.Request(f'https://api.elevenlabs.io/v1/text-to-speech/{vid}/with-timestamps?output_format=mp3_44100_128',
                                     data=json.dumps(body).encode(), headers={'Content-Type': 'application/json'}, method='POST')
        try:
            with urllib.request.urlopen(req, timeout=240) as r:
                return json.loads(r.read())
        except urllib.error.HTTPError as e:
            msg = e.read().decode()[:300]
            if e.code in (429, 500, 502, 503) and k < tries - 1:
                time.sleep(4 * (k + 1)); continue
            raise SystemExit(f'HTTP {e.code}: {msg}')
        except Exception as e:
            if k < tries - 1: time.sleep(4 * (k + 1)); continue
            raise

def decode(mp3):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', 'pipe:0', '-f', 's16le', '-ac', '1', '-ar', str(SR), '-'], input=mp3, capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.int16).astype(np.float32) / 32768

def squeeze(seg, keep, minlen):
    win = int(SR * 0.01); n = len(seg) // win
    if n == 0: return seg
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

def edges(x):
    win = int(SR * 0.01); n = len(x) // win
    rms = np.sqrt((x[:n * win].reshape(n, win) ** 2).mean(axis=1))
    sil = rms < max(rms.max() * 0.02, 1e-4)
    nz = np.where(~sil)[0]
    a, b = nz[0] * win, (nz[-1] + 1) * win
    a = max(0, a - int(SR * 0.05)); b = min(len(x), b + int(SR * 0.15))
    return x[a:b], a

def process(res, text):
    mp3 = base64.b64decode(res['audio_base64'])
    al = res['alignment']; s = ''.join(al['characters'])
    x = decode(mp3)
    spans = []
    for ph in JOIN_PHRASES:
        p = s.find(ph)
        if p >= 0:
            a = p; b = p + len(ph) - 1
            spans.append((int(al['character_start_times_seconds'][a] * SR), int(al['character_end_times_seconds'][b] * SR) + 1))
    parts = []; cur = 0
    for i0, i1 in sorted(spans):
        parts.append(x[cur:i0]); parts.append(squeeze(x[i0:i1], 0.06, 0.12)); cur = i1
    parts.append(x[cur:])
    y = np.concatenate(parts)
    y, _ = edges(y)
    pcm = (np.clip(y, -1, 1) * 32767).astype(np.int16).tobytes()
    out = subprocess.run(['ffmpeg', '-v', 'error', '-f', 's16le', '-ar', str(SR), '-ac', '1', '-i', 'pipe:0',
                          '-af', 'loudnorm=I=-18:LRA=7:TP=-1.5', '-ar', '44100', '-ac', '1', '-b:a', '96k', '-f', 'mp3', 'pipe:1'],
                         input=pcm, capture_output=True, check=True).stdout
    return out, len(y) / SR, bool(spans)

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--only', default=''); ap.add_argument('--persona', default='')
    a = ap.parse_args()
    cues = json.loads((HERE / 'cues.json').read_text()) + json.loads((HERE / 'responder_cues.json').read_text())
    only = set(filter(None, a.only.split(',')))
    manifest_path = HERE / 'manifest.json'
    manifest = json.loads(manifest_path.read_text()) if manifest_path.exists() else {}
    chars = 0
    for persona, vid in VOICES.items():
        if a.persona and a.persona != persona: continue
        outdir = ROOT / 'assets' / 'leader_voice' / persona; outdir.mkdir(parents=True, exist_ok=True)
        files = manifest.setdefault(persona, {}).setdefault('files', {})
        manifest[persona].update(provider='elevenlabs', voice=vid, model=MODEL, settings=SETTINGS, generatedAt=dt.datetime.now(dt.timezone.utc).isoformat())
        for c in cues:
            if only and c['id'] not in only: continue
            text = clean(c); chars += len(text)
            res = tts(vid, text)
            mp3, dur, joined = process(res, text)
            (outdir / f"{c['id']}.mp3").write_bytes(mp3)
            files[c['id']] = dict(bytes=len(mp3), sha256=hashlib.sha256(mp3).hexdigest(), seconds=round(dur, 2), text=text, joined=joined)
            print(persona, c['id'], f'{dur:.1f}s', f'{len(mp3)//1024}KB', 'JOINED' if joined else '', flush=True)
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=1))
    print('characters sent:', chars)

if __name__ == '__main__':
    main()
