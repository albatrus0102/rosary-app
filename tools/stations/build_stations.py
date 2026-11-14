#!/usr/bin/env python3
"""십자가의 길(14처) 데이터 생성기 (단일 원본 → Dart + JS).

입력
  data/stations_of_cross.json    처 번호·명칭·성경 근거(장·절만)·묵상·청원·공통 문구(사제·교구 검수 전 초안)
  data/stations_series.json      그림 연작(작가·연도·촬영자·라이선스·파일 URL)과 성당 id → 연작 배정

출력(직접 고치지 말 것)
  lib/domain/stations_of_cross_data.dart   앱(묵상 시트·기도 배경·더보기)용 const 목록
  assets/church/cross_data.js              성당 3D 14처 판용 번호·로마 숫자·짧은 이름 + 성당별 그림 연작(window.ChurchCrossData)
  lib/domain/stations_series_data.dart     그림 연작(대체 성화)·성당별 배정·출처(data/stations_series.json 에서)

사용: python3 tools/stations/build_stations.py          생성
      python3 tools/stations/build_stations.py --check  생성물이 최신인지 확인(다르면 종료 코드 1)
"""
import json
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SRC = os.path.join(ROOT, 'data', 'stations_of_cross.json')
OUT_DART = os.path.join(ROOT, 'lib', 'domain', 'stations_of_cross_data.dart')
OUT_JS = os.path.join(ROOT, 'assets', 'church', 'cross_data.js')
SRC_SERIES = os.path.join(ROOT, 'data', 'stations_series.json')
OUT_SERIES_DART = os.path.join(ROOT, 'lib', 'domain', 'stations_series_data.dart')
LICENSE_ENUM = {'PD': 'pd', 'CC0': 'cc0', 'CC-BY': 'ccBy'}

ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV']
FORBIDDEN = set("'\\$`\t\r\n")


def check_text(s, where):
    if not isinstance(s, str) or not s.strip():
        raise SystemExit(f'{where}: 빈 문구')
    bad = FORBIDDEN & set(s)
    if bad:
        raise SystemExit(f'{where}: 쓸 수 없는 글자 {sorted(bad)!r}')
    return s


def load():
    with open(SRC, encoding='utf-8') as f:
        d = json.load(f)
    st = d['stations']
    if len(st) != 14:
        raise SystemExit(f'14처여야 한다: {len(st)}')
    for i, s in enumerate(st):
        if s['n'] != i + 1:
            raise SystemExit(f'번호가 연속이 아니다: {i + 1} 자리에 {s["n"]}')
        for k in ('title', 'short', 'refs', 'meditation', 'petition'):
            check_text(s[k], f'{s["n"]}처 {k}')
        if not isinstance(s['tradition'], bool):
            raise SystemExit(f'{s["n"]}처 tradition 은 true/false')
    for k in ('acclamation', 'opening', 'closing', 'art_credit', 'review'):
        check_text(d[k], k)
    return d


def dq(s):
    return '"' + s.replace('"', '\\"') + '"'


def gen_dart(d):
    out = [
        '// 생성 파일 — 직접 고치지 말 것.',
        '// 원본: data/stations_of_cross.json → python3 tools/stations/build_stations.py',
        f'// 모든 문구: {d["review"]} (docs/ux/STATIONS_OF_CROSS.md 검수표).',
        '',
        "part of 'stations_of_cross.dart';",
        '',
        '// dart format off',
        f'const String _acclamation = {dq(d["acclamation"])};',
        f'const String _opening = {dq(d["opening"])};',
        f'const String _closing = {dq(d["closing"])};',
        f'const String _artCredit = {dq(d["art_credit"])};',
        f'const int _dataVersion = {int(d["version"])};',
        '',
        'const List<StationOfCross> _stations = [',
    ]
    for s in d['stations']:
        out += [
            '  StationOfCross(',
            f'    n: {s["n"]},',
            f'    title: {dq(s["title"])},',
            f'    short: {dq(s["short"])},',
            f'    refs: {dq(s["refs"])},',
            f'    tradition: {"true" if s["tradition"] else "false"},',
            f'    meditation: {dq(s["meditation"])},',
            f'    petition: {dq(s["petition"])},',
            '  ),',
        ]
    out += ['];', '// dart format on', '']
    return '\n'.join(out)


def load_series():
    with open(SRC_SERIES, encoding='utf-8') as f:
        d = json.load(f)
    ids = [s['id'] for s in d['series']]
    if len(set(ids)) != len(ids):
        raise SystemExit('연작 id 가 겹친다')
    if d['default'] not in ids:
        raise SystemExit(f'기본 연작이 없다: {d["default"]}')
    for church, sid in d['assignments'].items():
        if sid not in ids:
            raise SystemExit(f'{church}: 없는 연작 {sid}')
    check_text(d['disclosure'], 'disclosure')
    for s in d['series']:
        w = f'연작 {s["id"]}'
        for k in ('title', 'short', 'artist', 'year', 'place', 'photographer', 'license_label', 'license_url', 'source', 'changes', 'rights', 'rights_note', 'asset_dir', 'pack'):
            check_text(s[k], f'{w} {k}')
        if s['license'] not in d['allowed_licenses'] or s['license'] not in LICENSE_ENUM:
            raise SystemExit(f'{w}: 허용하지 않는 라이선스 {s["license"]}')
        if [f['n'] for f in s['files']] != list(range(1, 15)):
            raise SystemExit(f'{w}: files 는 1~14처 순서여야 한다')
        for f in s['files']:
            if not f['url'].startswith('https://'):
                raise SystemExit(f'{w} {f["n"]}처: 파일 URL 이 없다')
            check_text(f['url'], f'{w} {f["n"]}처 url')
    return d


def gen_series_dart(d):
    out = [
        '// 생성 파일 — 직접 고치지 말 것.',
        '// 원본: data/stations_series.json → python3 tools/stations/build_stations.py',
        '// 십자가의 길 그림 연작(대체 성화)과 성당별 배정. 그림은 tools/stations/build_series.py 가 만든다.',
        '',
        "part of 'stations_series.dart';",
        '',
        '// dart format off',
        f'const String _disclosure = {dq(d["disclosure"])};',
        f'const String _defaultSeriesId = {dq(d["default"])};',
        '',
        'const Map<String, String> _assignments = {',
    ]
    out += [f'  {dq(c)}: {dq(sid)},' for c, sid in d['assignments'].items()]
    out += ['};', '', 'const List<StationsSeries> _series = [']
    for s in d['series']:
        out += [
            '  StationsSeries(',
            f'    id: {dq(s["id"])},',
            f'    title: {dq(s["title"])},',
            f'    short: {dq(s["short"])},',
            f'    artist: {dq(s["artist"])},',
            f'    year: {dq(s["year"])},',
            f'    artistDeath: {s["artist_death"] if s["artist_death"] else "null"},',
            f'    place: {dq(s["place"])},',
            f'    photographer: {dq(s["photographer"])},',
            f'    license: StationsLicense.{LICENSE_ENUM[s["license"]]},',
            f'    licenseLabel: {dq(s["license_label"])},',
            f'    licenseUrl: {dq(s["license_url"])},',
            f'    source: {dq(s["source"])},',
            f'    changes: {dq(s["changes"])},',
            f'    rights: {dq(s["rights"])},',
            f'    rightsNote: {dq(s["rights_note"])},',
            f'    aspect: {float(s["aspect"])},',
            f'    cover: {"true" if s.get("fit") == "cover" else "false"},',
            f'    assetDir: {dq(s["asset_dir"])},',
            '    fileUrls: [',
        ]
        out += [f'      {dq(f["url"])},' for f in s['files']]
        out += ['    ],', '  ),']
    out += ['];', '// dart format on', '']
    return '\n'.join(out)


def gen_js(d, sd):
    items = [{'n': s['n'], 'roman': ROMAN[i], 'short': s['short'], 'title': s['title']} for i, s in enumerate(d['stations'])]
    series = {'default': sd['default'], 'churches': sd['assignments'],
              'packs': {s['id']: {'file': s['pack'], 'title': s['title']} for s in sd['series']}}
    body = json.dumps({'version': int(d['version']), 'stations': items, 'series': series}, ensure_ascii=False, indent=1)
    return ('/* cross_data.js — 생성 파일(직접 고치지 말 것). 원본 data/stations_of_cross.json,\n'
            '   data/stations_series.json, python3 tools/stations/build_stations.py.\n   성당 3D 14처 판(way_cross.js)이 번호·로마 숫자와 성당별 그림 연작(series)을 쓴다. */\n'
            '(function (root) {\n'
            "  'use strict';\n"
            f'  var D = {body};\n'
            "  if (typeof module === 'object' && module.exports) module.exports = D;\n"
            '  else root.ChurchCrossData = D;\n'
            "})(typeof window !== 'undefined' ? window : this);\n")


def main():
    d = load()
    sd = load_series()
    files = {OUT_DART: gen_dart(d), OUT_JS: gen_js(d, sd), OUT_SERIES_DART: gen_series_dart(sd)}
    if '--check' in sys.argv:
        stale = []
        for p, s in files.items():
            try:
                with open(p, encoding='utf-8') as f:
                    if f.read() != s:
                        stale.append(p)
            except FileNotFoundError:
                stale.append(p)
        if stale:
            print('최신이 아님: ' + ', '.join(os.path.relpath(p, ROOT) for p in stale))
            sys.exit(1)
        print('ok')
        return
    for p, s in files.items():
        with open(p, 'w', encoding='utf-8') as f:
            f.write(s)
        print('wrote', os.path.relpath(p, ROOT))


if __name__ == '__main__':
    main()
