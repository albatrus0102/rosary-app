#!/usr/bin/env python3
"""십자가의 길 연작 원본을 내려받는다(번들 밖 art/stations_series/<연작>/raw/, .gitignore).

입력  data/stations_series.json  (연작별 files[]: 처 번호 → Commons 파일 / 내려받을 주소 / PDF 쪽)
출력  art/stations_series/<id>/raw/station_NN.<ext>      그림(Commons 는 표준 섬네일 폭 fetch_width)
      art/stations_series/<id>/raw/station_NN.wikitext   Commons 파일 설명 원문(라이선스 확인 기록)
      art/stations_series/<id>/raw/book.pdf              PDF 연작(모슬러)
Commons 파일은 설명 원문에 연작의 commons_license 틀({{self|cc-zero}} 등)이 있는지 확인하고, 없으면 멈춘다.

주의: 위키미디어는 원본(섬네일이 아닌 파일)과 API 를 자주 429 로 막는다. 그래서 설명 원문은 index.php?action=raw,
그림은 Special:FilePath?width=<표준 폭 500/960/1280> 로 받고, 요청 사이에 2초 쉰다. 이미 받은 파일은 건너뛴다.

사용: python3 tools/stations/fetch_series.py [연작 id ...] [--out DIR]
"""
import json
import os
import sys
import time
import urllib.parse
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SRC = os.path.join(ROOT, 'data', 'stations_series.json')
UA = {'User-Agent': 'RosaryStationsFetch/1.0 (asset build script)'}


def get(url, tries=5):
    for i in range(tries):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=120) as r:
                return r.read()
        except Exception as e:  # noqa: BLE001 — 429·시간 초과는 기다렸다 다시
            h = getattr(e, 'headers', None)
            wait = int(h.get('retry-after', 10)) if h and h.get('retry-after') else 10
            print(f'  다시 시도({e}) {wait}s: {url[-70:]}', file=sys.stderr)
            if wait > 120:
                break
            time.sleep(wait + 3 * i)
    raise SystemExit(f'내려받지 못함: {url}')


def save(path, data):
    with open(path, 'wb') as f:
        f.write(data)


def fetch(s, out_root):
    if s.get('prepare') == 'existing':
        print(f'{s["id"]}: 이미 번들된 연작(건너뜀)')
        return
    raw = os.path.join(out_root, s['id'], 'raw')
    os.makedirs(raw, exist_ok=True)
    if s.get('pdf'):
        p = os.path.join(raw, 'book.pdf')
        if not os.path.exists(p):
            save(p, get(s['pdf']))
        print(f'{s["id"]}: book.pdf {os.path.getsize(p)}B')
        return
    for f in s['files']:
        base = os.path.join(raw, f'station_{f["n"]:02d}')
        if f.get('commons'):
            name = urllib.parse.quote(f['commons'])
            wt = base + '.wikitext'
            if not os.path.exists(wt):
                save(wt, get('https://commons.wikimedia.org/w/index.php?action=raw&title=File:' + name))
                time.sleep(2)
            with open(wt, encoding='utf-8') as fh:
                text = fh.read()
            if s['commons_license'].lower() not in text.lower():
                raise SystemExit(f'{s["id"]} {f["n"]}처: 설명 원문에 {s["commons_license"]} 틀이 없다 → {f["url"]}')
            url = f'https://commons.wikimedia.org/wiki/Special:FilePath/{name}?width={s["fetch_width"]}'
        else:
            url = f['fetch']
        ext = os.path.splitext(urllib.parse.urlparse(url).path)[1].lower() or '.jpg'
        p = base + ext
        if not os.path.exists(p):
            save(p, get(url))
            time.sleep(2)
        print(f'{s["id"]}: {os.path.basename(p)} {os.path.getsize(p)}B')


def main():
    args = sys.argv[1:]
    out_root = os.path.join(ROOT, 'art', 'stations_series')
    if '--out' in args:
        i = args.index('--out')
        out_root = args[i + 1]
        del args[i:i + 2]
    with open(SRC, encoding='utf-8') as fh:
        d = json.load(fh)
    for s in d['series']:
        if args and s['id'] not in args:
            continue
        fetch(s, out_root)


if __name__ == '__main__':
    main()
