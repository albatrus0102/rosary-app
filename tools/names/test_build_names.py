"""build_names.py 의 파싱·생성 규칙 테스트.  사용: python3 -m unittest tools/names/test_build_names.py"""
import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import build_names as b  # noqa: E402


class ParseTest(unittest.TestCase):
    def test_header_whitespace_duplicates_and_second_column(self):
        text = ('﻿세례명\t축일(MM-DD)\n'
                '가롤로\t01-06, 03-02\n'
                '  나탈리아  \t07-27\n'
                '가롤로\t11-04\n'            # 중복: 첫 항목만
                '\n'
                '가누토  4세\t07-10\r\n'      # 연속 공백·CR 정리
                '다윗\n'                      # 2열 없음
                '\t01-01\n')                  # 이름 없음
        names, dups = b.parse_tsv(text)
        self.assertEqual(names, ['가롤로', '나탈리아', '가누토 4세', '다윗'])
        self.assertEqual(dups, ['가롤로'])
        for n in names:
            self.assertNotRegex(n, r'\d\d-\d\d')   # 축일(2열)은 버린다

    def test_real_source(self):
        with open(b.TSV, encoding='utf-8') as f:
            names, dups = b.parse_tsv(f.read())
        self.assertEqual(len(names), 3774)
        self.assertEqual(dups, [])
        self.assertEqual(names[0], '가누토 4세')
        self.assertEqual(names, sorted(names))

    def test_build(self):
        names, old, dups, extra = b.build()
        self.assertEqual(len(names), 3774 + len(extra))
        self.assertEqual(len(set(names)), len(names))
        self.assertLessEqual(len(names), b.NAME_MAX + 1)
        self.assertEqual(names[3774:], extra)                      # 옛 이름은 끝에만 덧붙는다
        self.assertEqual([len(old[k]) for k in ('female', 'male', 'legacy')], [65, 71, 40])
        self.assertEqual(names[old['female'][0]], '마리아')
        self.assertEqual(names[old['male'][0]], '요셉')
        js, dart = b.js(names, old), b.dart(names, old)
        self.assertNotRegex(js, r'\d\d-\d\d')                      # 생성물에 축일 없음
        self.assertNotRegex(dart, r'\d\d-\d\d')

    def test_generated_files_are_current(self):
        names, old, _, _ = b.build()
        for path, text in ((b.OUT_DART, b.dart(names, old)), (b.OUT_JS, b.js(names, old))):
            with open(path, encoding='utf-8') as f:
                self.assertEqual(f.read(), text, path)


if __name__ == '__main__':
    unittest.main()
