#!/usr/bin/env python3
"""세례명 통합 목록 생성기 (단일 소스 → Dart + JS).

입력
  data/baptismal_names.tsv      세례명 원본(헤더 1줄, 1열 = 이름). 2열(축일)은 쓰지 않고 버린다.
  tools/names/known_names.json  옛 앱의 성별별 목록(female 65 / male 71, 앞쪽이 인기순)과
                                g 없는 옛 목록(legacy 40). 옛 저장값 마이그레이션·인기 이름에 쓴다.

출력(직접 고치지 말 것)
  lib/church/baptismal_names_data.dart   이름(줄바꿈으로 이은 문자열 하나) + 옛 목록 → 새 인덱스 표
  assets/church/baptismal_names.js       성당 3D 이름표용 같은 목록(window.ChurchNames)

통합 목록 순서 = TSV 순서(같은 이름이 또 나오면 첫 항목만) + 옛 목록에만 있는 이름(끝에 덧붙임).
인덱스가 곧 와이어 값(avatar.name, nv=2)이므로 **이미 있는 이름의 순서를 바꾸거나 지우면 안 된다**
(TSV 중간에 줄을 끼워 넣지 말고 known_names.json 뒤쪽이나 TSV 끝에 더한다).

사용: python3 tools/names/build_names.py          생성
      python3 tools/names/build_names.py --check  생성물이 최신인지 확인(다르면 종료 코드 1)
"""
import json
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
TSV = os.path.join(ROOT, 'data', 'baptismal_names.tsv')
KNOWN = os.path.join(ROOT, 'tools', 'names', 'known_names.json')
OUT_DART = os.path.join(ROOT, 'lib', 'church', 'baptismal_names_data.dart')
OUT_JS = os.path.join(ROOT, 'assets', 'church', 'baptismal_names.js')

# 와이어 상한(서버 NAME_MAX, Flutter baptismalNameMaxIndex). 목록은 이 값 + 1 개를 넘을 수 없다.
NAME_MAX = 4095
FORBIDDEN = set("'\"\\$|`\t\r\n")


def parse_tsv(text):
    """(이름 목록, 버린 중복 이름 목록). 헤더 제외, 앞뒤 공백 제거·연속 공백 1칸, 빈 줄 무시."""
    names, seen, dups = [], set(), []
    lines = text.lstrip('\ufeff').split('\n')
    for line in lines[1:]:
        name = ' '.join(line.split('\t')[0].split())
        if not name:
            continue
        if name in seen:
            dups.append(name)
            continue
        seen.add(name)
        names.append(name)
    return names, dups


def build():
    with open(TSV, encoding='utf-8') as f:
        names, dups = parse_tsv(f.read())
    with open(KNOWN, encoding='utf-8') as f:
        known = json.load(f)
    extra = []
    index = {n: i for i, n in enumerate(names)}
    for key in ('female', 'male', 'legacy'):
        for n in known[key]:
            if n not in index:
                index[n] = len(names)
                names.append(n)
                extra.append(n)
    for n in names:
        bad = FORBIDDEN & set(n)
        if bad:
            raise SystemExit('이름에 쓸 수 없는 문자: %r in %r' % (bad, n))
    if len(names) > NAME_MAX + 1:
        raise SystemExit('이름이 너무 많다: %d > %d' % (len(names), NAME_MAX + 1))
    old = {k: [index[n] for n in known[k]] for k in ('female', 'male', 'legacy')}
    return names, old, dups, extra


def ints(values, per=16, indent='  '):
    rows = [values[i:i + per] for i in range(0, len(values), per)]
    return '\n'.join(indent + ', '.join(str(v) for v in r) + ',' for r in rows)


def dart(names, old):
    return '''// GENERATED FILE — 직접 고치지 말 것. tools/names/build_names.py 가 만든다.
// 원본: data/baptismal_names.tsv + tools/names/known_names.json
// dart format off

/// 통합 세례명 개수.
const int baptismalNameCount = %d;

/// 기본 세례명(마리아 = 옛 여성 목록의 첫 이름)의 인덱스. 범위를 벗어난 값은 이것으로 읽는다.
const int defaultBaptismalNameIndex = %d;

/// 통합 세례명(한 줄에 하나, 줄 번호 = 인덱스 = 와이어 `avatar.name`).
const String baptismalNamesJoined = \'\'\'
%s\'\'\';

/// 옛 여성 목록(인기순 65개)의 인덱스 → 통합 목록 인덱스.
const List<int> oldFemaleNameIndices = [
%s
];

/// 옛 남성 목록(인기순 71개)의 인덱스 → 통합 목록 인덱스.
const List<int> oldMaleNameIndices = [
%s
];

/// 성별 필드가 없던 옛 목록(40개: 0..19 여성, 20..39 남성)의 인덱스 → 통합 목록 인덱스.
const List<int> legacyNameIndices = [
%s
];
''' % (len(names), old['female'][0], '\n'.join(names), ints(old['female']), ints(old['male']), ints(old['legacy']))


def js(names, old):
    rows = ['|'.join(names[i:i + 40]) for i in range(0, len(names), 40)]
    body = ',\n'.join("    '%s'" % r for r in rows)
    return '''/* GENERATED FILE — 직접 고치지 말 것. tools/names/build_names.py 가 만든다.
   통합 세례명 목록(%d개). avatar.name(nv=2)은 list 의 인덱스다. Flutter baptismalNames 와 순서가 같다.
   def: 기본 이름(마리아). oldF/oldM/legacy: 옛 형식(nv 없음)의 성별별·g 없는 목록 인덱스 → list 인덱스. */
(function (root) {
  'use strict';
  var N = {
    list: [
%s
    ].join('|').split('|'),
    def: %d,
    oldF: [%s],
    oldM: [%s],
    legacy: [%s]
  };
  root.ChurchNames = N;
  if (typeof module === 'object' && module.exports) module.exports = N;
})(typeof window !== 'undefined' ? window : this);
''' % (len(names), body, old['female'][0], ','.join(map(str, old['female'])), ','.join(map(str, old['male'])),
       ','.join(map(str, old['legacy'])))


def main():
    names, old, dups, extra = build()
    outputs = ((OUT_DART, dart(names, old)), (OUT_JS, js(names, old)))
    if '--check' in sys.argv:
        stale = []
        for path, text in outputs:
            try:
                with open(path, encoding='utf-8') as f:
                    if f.read() != text:
                        stale.append(path)
            except FileNotFoundError:
                stale.append(path)
        if stale:
            print('생성물이 최신이 아니다: ' + ', '.join(os.path.relpath(p, ROOT) for p in stale))
            sys.exit(1)
        print('ok %d' % len(names))
        return
    for path, text in outputs:
        with open(path, 'w', encoding='utf-8', newline='\n') as f:
            f.write(text)
        print('%s  %d bytes' % (os.path.relpath(path, ROOT), len(text.encode('utf-8'))))
    print('이름 %d개 (TSV %d + 옛 목록에만 있는 %d: %s), TSV 중복 %d' %
          (len(names), len(names) - len(extra), len(extra), ', '.join(extra), len(dups)))


if __name__ == '__main__':
    main()
