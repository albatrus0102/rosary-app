import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:rosary_app/analytics/analytics.dart';
import 'package:rosary_app/analytics/analytics_types.dart';

Map<String, Object?> clean(String name, Map<String, Object?> p) =>
    PropsSanitizer.sanitize(name, p);

void main() {
  group('glass events allow-list (G-14)', () {
    test('names and categories match GLASS_APP_PLAN §6', () {
      const usage = [
        'glass_open',
        'glass_view_end',
        'glass_filter',
        'glass_info',
        'glass_fav',
        'glass_capture',
        'glass_pray',
        'glass_download',
      ];
      for (final n in usage) {
        expect(AnalyticsEvents.categoryOf(n), ConsentKinds.usage, reason: n);
      }
      for (final n in ['glass_load', 'glass_mem']) {
        expect(
          AnalyticsEvents.categoryOf(n),
          ConsentKinds.diagnostics,
          reason: n,
        );
      }
    });

    test('property keys are exactly the planned ones', () {
      Set<String> keys(String n) => AnalyticsEvents.specs[n]!.keys;
      expect(keys('glass_open'), {'win', 'from', 'view'});
      expect(keys('glass_view_end'), {
        'win',
        'seconds',
        'zoom_max',
        'panned',
        'light',
        'photo_mode',
      });
      expect(keys('glass_filter'), {'kind', 'value'});
      expect(keys('glass_info'), {'win', 'section'});
      expect(keys('glass_fav'), {'win', 'on'});
      expect(keys('glass_capture'), {'win', 'shared', 'saved'});
      expect(keys('glass_pray'), {'win', 'kind'});
      expect(keys('glass_load'), {'win', 'tier', 'ms', 'ok'});
      expect(keys('glass_mem'), {'tex_mb', 'budget_mb', 'downgraded', 'tier'});
      expect(keys('glass_download'), {'scope', 'mb', 'ok', 'wifi'});
      // 자유 글을 받는 긴 키는 없다.
      for (final n in AnalyticsEvents.specs.keys.where(
        (n) => n.startsWith('glass_'),
      )) {
        expect(AnalyticsEvents.specs[n]!.longKeys, isEmpty, reason: n);
      }
    });

    test('catalog ids pass as `win`, and the key is not blocked', () {
      expect(PropsSanitizer.blockedKeys, isNot(contains('win')));
      expect(
        clean('glass_open', {
          'win': 'rose_chartres_north',
          'from': 'gallery',
          'view': 'room',
        }),
        {'win': 'rose_chartres_north', 'from': 'gallery', 'view': 'room'},
      );
      expect(
        clean('glass_view_end', {
          'win': 'dove_stpeter',
          'seconds': 52,
          'zoom_max': 6,
          'panned': true,
          'light': 'sun',
          'photo_mode': false,
        }),
        hasLength(6),
      );
      expect(
        clean('glass_load', {
          'win': 'x',
          'tier': 't2',
          'ms': 840,
          'ok': true,
        }),
        {'win': 'x', 'tier': 't2', 'ms': 840, 'ok': true},
      );
    });

    test('sanitizer blocks free text, ids and unknown keys on glass events', () {
      expect(
        clean('glass_info', {
          'win': '샤르트르 북쪽 장미창', // 한글 자유 글
          'section': 'about',
          'text': '묵상',
          'note': 'x',
          'name': 'y',
          'id': 'z',
        }),
        {'section': 'about'},
      );
      expect(
        clean('glass_open', {
          'win': 'https://example.com/a',
          'from': 'a b',
          'view': 'x@y.com',
        }),
        isEmpty,
      );
      expect(clean('glass_open', {'win': 'a' * 41}), isEmpty);
      expect(clean('glass_filter', {'kind': 'church', 'value': '샤르트르'}), {
        'kind': 'church',
      });
      expect(clean('glass_pray', {'win': 'x', 'kind': 'rosary', 'user': 'u'}), {
        'win': 'x',
        'kind': 'rosary',
      });
      // 중첩 값·null은 버린다.
      expect(
        clean('glass_mem', {
          'tex_mb': {'a': 1},
          'budget_mb': null,
          'downgraded': false,
          'tier': 'low',
        }),
        {'downgraded': false, 'tier': 'low'},
      );
      expect(
        utf8.encode(jsonEncode(clean('glass_open', {'win': 'ok'}))).length,
        lessThan(PropsSanitizer.maxPropsBytes),
      );
    });
  });
}
