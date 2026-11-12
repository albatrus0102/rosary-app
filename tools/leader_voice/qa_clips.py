#!/usr/bin/env python3
"""생성된 음성 클립 검증: ElevenLabs 음성 인식(scribe)으로 단어 시간표를 얻어
 (1) 읽힌 글이 기대한 글과 같은지(공백·구두점 제외 유사도), (2) 0.25초 넘는 쉼이 모두 단어 사이에 있는지,
 (3) 줄 끝 쉼 개수가 기대(줄 수-1)와 같은지 확인한다.  사용: qa_clips.py DIR  (DIR/sister, DIR/priest)"""
import difflib, json, re, subprocess, sys, urllib.request, uuid
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
import generate_clips_flow as g

def stt(path):
    b = uuid.uuid4().hex; data = Path(path).read_bytes(); body = b''
    for k, v in (('model_id', 'scribe_v1'), ('language_code', 'kor')):
        body += f'--{b}\r\nContent-Disposition: form-data; name="{k}"\r\n\r\n{v}\r\n'.encode()
    body += f'--{b}\r\nContent-Disposition: form-data; name="file"; filename="a.mp3"\r\nContent-Type: audio/mpeg\r\n\r\n'.encode() + data + f'\r\n--{b}--\r\n'.encode()
    req = urllib.request.Request('https://api.elevenlabs.io/v1/speech-to-text', data=body, headers={'Content-Type': f'multipart/form-data; boundary={b}'})
    import time
    for k in range(5):
        try:
            with urllib.request.urlopen(req, timeout=180) as r: return json.loads(r.read())
        except Exception:
            if k == 4: raise
            time.sleep(3 * (k + 1))

def norm(t): return re.sub(r'[^가-힣0-9]', '', t)

def check(args):
    persona, cid, path, lines, pauses = args
    d = stt(path)
    words = [(w['text'], w['start'], w['end']) for w in d.get('words', []) if w.get('type') == 'word']
    exp = norm(''.join(lines)); got = norm(d.get('text', ''))
    sim = difflib.SequenceMatcher(None, exp, got).ratio()
    out = subprocess.run(['ffmpeg', '-hide_banner', '-i', path, '-af', 'silencedetect=noise=-36dB:d=0.25', '-f', 'null', '-'], capture_output=True, text=True).stderr
    starts = [float(x) for x in re.findall(r'silence_start: ([\d.]+)', out)]; durs = [float(x) for x in re.findall(r'silence_duration: ([\d.]+)', out)]
    total = float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', path], capture_output=True, text=True).stdout)
    inner = [(s, s + du) for s, du in zip(starts, durs) if s > 0.3 and s + du < total - 0.3]
    bad = []
    for a, b in inner:
        c = (a + b) / 2
        ok = any(words[i][2] - 0.08 <= c <= words[i + 1][1] + 0.08 for i in range(len(words) - 1))
        if not ok: bad.append(round(c, 2))
    want = sum(1 for p in pauses if p > 0)
    return persona, cid, round(sim, 3), len(inner), want, bad

def main():
    root = Path(sys.argv[1]); lines = g.read_lines_file(); jobs = []
    for persona in ('sister', 'priest'):
        for f in sorted((root / persona).glob('*.mp3')):
            cid = f.stem; ls = [l[0] for l in lines[cid]]; ps = [l[1] for l in lines[cid]]
            jobs.append((persona, cid, str(f), ls, ps))
    problems = 0
    with ThreadPoolExecutor(2) as ex:
        for persona, cid, sim, n, want, bad in ex.map(check, jobs):
            flag = '' if (sim >= (0.9 if cid.startswith('mystery_') else 0.93) and n == want and not bad) else '  <-- CHECK'
            problems += bool(flag)
            print(f'{persona:6s} {cid:24s} text={sim:.3f} pauses={n}/{want} badcuts={bad}{flag}', flush=True)
    print('problems:', problems, 'of', len(jobs))

if __name__ == '__main__':
    main()
