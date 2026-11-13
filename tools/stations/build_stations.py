#!/usr/bin/env python3
"""십자가의 길(14처) 데이터 생성기 (단일 원본 → Dart + JS).

입력
  data/stations_of_cross.json    처 번호·명칭·성경 근거(장·절만)·묵상·청원·공통 문구(사제·교구 검수 전 초안)

출력(직접 고치지 말 것)
  lib/domain/stations_of_cross_data.dart   앱(묵상 시트·기도 배경·더보기)용 const 목록
  assets/church/cross_data.js              성당 3D 14처 판용 번호·로마 숫자·짧은 이름(window.ChurchCrossData)

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


def gen_js(d):
    items = [{'n': s['n'], 'roman': ROMAN[i], 'short': s['short'], 'title': s['title']} for i, s in enumerate(d['stations'])]
    body = json.dumps({'version': int(d['version']), 'stations': items}, ensure_ascii=False, indent=1)
    return ('/* cross_data.js — 생성 파일(직접 고치지 말 것). 원본 data/stations_of_cross.json,\n'
            '   python3 tools/stations/build_stations.py. 성당 3D 14처 판(way_cross.js)이 번호·로마 숫자를 쓴다. */\n'
            '(function (root) {\n'
            "  'use strict';\n"
            f'  var D = {body};\n'
            "  if (typeof module === 'object' && module.exports) module.exports = D;\n"
            '  else root.ChurchCrossData = D;\n'
            "})(typeof window !== 'undefined' ? window : this);\n")


def main():
    d = load()
    files = {OUT_DART: gen_dart(d), OUT_JS: gen_js(d)}
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
