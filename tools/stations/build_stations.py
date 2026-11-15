#!/usr/bin/env python3
"""십자가의 길(14처) 데이터 생성기 (단일 원본 → Dart + JS).

입력
  data/stations_of_cross.json    처 번호·명칭(공식 표기)·성경 근거(장·절만)·보조 묵상·청원(사제·교구 검수 전 초안)
  data/stations_prayers.json     공식 기도문(한국천주교주교회의 『가톨릭 기도서』 ‘십자가의 길’; 줄·기호·지시문·출처)
  data/stations_series.json      그림 연작(작가·연도·촬영자·라이선스·파일 URL)과 성당 id → 연작 배정

출력(직접 고치지 말 것)
  lib/domain/stations_of_cross_data.dart   앱(묵상 시트·기도 배경·더보기)용 const 목록
  assets/church/cross_data.js              성당 3D 14처 판용 번호·로마 숫자·짧은 이름 + 성당별 그림 연작(window.ChurchCrossData)
  lib/domain/stations_series_data.dart     그림 연작(대체 성화)·성당별 배정·출처(data/stations_series.json 에서)
  lib/domain/stations_prayers_data.dart    공식 기도문(시작 기도·처별 기도·기호)(data/stations_prayers.json 에서)

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
SRC_PRAYERS = os.path.join(ROOT, 'data', 'stations_prayers.json')
OUT_PRAYERS_DART = os.path.join(ROOT, 'lib', 'domain', 'stations_prayers_data.dart')
# 공식 기도서 기호(일러두기 4): 역할 키 → 기호. Dart enum StationsPrayerRole 과 같은 순서·이름.
PRAYER_ROLES = {'leader': '┼', 'cantor': '○', 'response': '●', 'all': '◎'}
ANNOUNCE_TAIL = '을 묵상합시다.'
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
    for k in ('closing', 'art_credit', 'review'):
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


def load_prayers(d):
    """공식 기도문을 읽고 형식을 확인한다. [d]는 load() 결과(처 명칭 대조용)."""
    with open(SRC_PRAYERS, encoding='utf-8') as f:
        p = json.load(f)

    def check_lines(lines, where):
        if not isinstance(lines, list) or not lines:
            raise SystemExit(f'{where}: 줄이 없다')
        for i, ln in enumerate(lines):
            if isinstance(ln, dict):
                if list(ln.keys()) != ['rubric']:
                    raise SystemExit(f'{where} {i + 1}줄: 지시문은 {{"rubric": …}} 형식')
                check_text(ln['rubric'], f'{where} {i + 1}줄 지시문')
            else:
                check_text(ln, f'{where} {i + 1}줄')
        if all(isinstance(ln, dict) for ln in lines):
            raise SystemExit(f'{where}: 기도문 줄이 없다(지시문뿐)')

    def check_part(part, where):
        if part.get('role') not in PRAYER_ROLES:
            raise SystemExit(f'{where}: 알 수 없는 역할 {part.get("role")!r}')
        check_lines(part['lines'], where)

    for k in ('title', 'publisher', 'edition', 'section', 'url', 'text_modified', 'retrieved', 'copyright', 'credit'):
        check_text(p['source'][k], f'기도문 source.{k}')
    if list(p['markers'].keys()) != list(PRAYER_ROLES.keys()):
        raise SystemExit('markers 는 leader, cantor, response, all 순서여야 한다')
    for role, m in p['markers'].items():
        if m['glyph'] != PRAYER_ROLES[role]:
            raise SystemExit(f'markers.{role}: 기호는 {PRAYER_ROLES[role]} 이어야 한다')
        check_text(m['official'], f'markers.{role}.official')
        check_text(m['label'], f'markers.{role}.label')
    for i, r in enumerate(p['intro_rubrics']):
        check_text(r, f'intro_rubrics {i + 1}')
    check_part(p['opening'], '시작 기도')
    check_part(p['to_station'], '처로 가며')
    if '{n}' not in p['to_station']['rubric']:
        raise SystemExit('to_station.rubric 에 {n} 이 있어야 한다')
    check_text(p['to_station']['rubric'], 'to_station.rubric')
    if not p['verse']:
        raise SystemExit('verse 가 비었다')
    for i, part in enumerate(p['verse']):
        check_part(part, f'계응 {i + 1}')
    for i, r in enumerate(p['after']):
        check_text(r, f'after {i + 1}')
    st = p['stations']
    if [s['n'] for s in st] != list(range(1, 15)):
        raise SystemExit('기도문 stations 는 1~14처 순서여야 한다')
    for s, base in zip(st, d['stations']):
        w = f'기도문 {s["n"]}처'
        check_text(s['announce'], f'{w} announce')
        # 처 명칭은 공식 본문의 '…을 묵상합시다.' 앞부분과 글자까지 같아야 한다.
        if s['announce'] != base['title'] + ANNOUNCE_TAIL:
            raise SystemExit(f'{w}: 명칭이 공식 본문과 다르다: {base["title"]!r} / {s["announce"]!r}')
        check_lines(s['prayer'], f'{w} prayer')
        if any(isinstance(ln, dict) for ln in s['prayer']):
            raise SystemExit(f'{w}: 처별 기도에는 지시문을 넣지 않는다(after 에 둔다)')
    return p


def gen_prayers_dart(p):
    def line(ln):
        if isinstance(ln, dict):
            return f'StationsPrayerLine.rubric({dq(ln["rubric"])})'
        return f'StationsPrayerLine({dq(ln)})'

    def part(pt, indent):
        o = [f'{indent}StationsPrayerPart(', f'{indent}  role: StationsPrayerRole.{pt["role"]},', f'{indent}  lines: [']
        o += [f'{indent}    {line(ln)},' for ln in pt['lines']]
        o += [f'{indent}  ],', f'{indent}),']
        return o

    src = p['source']
    out = [
        '// 생성 파일 — 직접 고치지 말 것.',
        '// 원본: data/stations_prayers.json → python3 tools/stations/build_stations.py',
        f'// {src["publisher"]} {src["title"]} {src["section"]} ({src["url"]}, 본문 수정일 {src["text_modified"]}, 대조 {src["retrieved"]}).',
        f'// {src["copyright"]}',
        '',
        "part of 'stations_prayers.dart';",
        '',
        '// dart format off',
        f'const int _prayersVersion = {int(p["version"])};',
        f'const String _sourceTitle = {dq(src["title"])};',
        f'const String _sourcePublisher = {dq(src["publisher"])};',
        f'const String _sourceEdition = {dq(src["edition"])};',
        f'const String _sourceUrl = {dq(src["url"])};',
        f'const String _sourceCopyright = {dq(src["copyright"])};',
        f'const String _sourceCredit = {dq(src["credit"])};',
        '',
        '// 기호별 (공식 일러두기의 뜻, 화면·낭독용 짧은 이름). StationsPrayerRole.values 순서.',
        'const List<(String, String, String)> _markers = [',
    ]
    out += [f'  ({dq(m["glyph"])}, {dq(m["official"])}, {dq(m["label"])}),' for m in p['markers'].values()]
    out += ['];', '', 'const List<String> _introRubrics = [']
    out += [f'  {dq(r)},' for r in p['intro_rubrics']]
    out += ['];', '', 'const StationsPrayerPart _openingPart =']
    o = part(p['opening'], '    ')
    o[0] = o[0].lstrip()
    out[-1] += ' ' + o[0]
    out += o[1:-1] + ['    );', '']
    out += [f'const String _toStationRubric = {dq(p["to_station"]["rubric"])};', 'const StationsPrayerPart _toStationPart =']
    o = part(p['to_station'], '    ')
    out[-1] += ' ' + o[0].lstrip()
    out += o[1:-1] + ['    );', '', 'const List<StationsPrayerPart> _versePart = [']
    for pt in p['verse']:
        out += part(pt, '  ')
    out += ['];', '', 'const List<String> _afterRubrics = [']
    out += [f'  {dq(r)},' for r in p['after']]
    out += ['];', '', '// 처별 (알림 문장, 기도 줄).', 'const List<(String, List<String>)> _stationPrayers = [']
    for s in p['stations']:
        out += ['  (', f'    {dq(s["announce"])},', '    [']
        out += [f'      {dq(ln)},' for ln in s['prayer']]
        out += ['    ],', '  ),']
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
    pd = load_prayers(d)
    files = {OUT_DART: gen_dart(d), OUT_JS: gen_js(d, sd), OUT_SERIES_DART: gen_series_dart(sd),
             OUT_PRAYERS_DART: gen_prayers_dart(pd)}
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
