import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:rosary_app/analytics/analytics.dart';
import 'package:rosary_app/analytics/analytics_redact.dart';

Map<String, Object?> clean(String name, Map<String, Object?> p) =>
    PropsSanitizer.sanitize(name, p);

void main() {
  group('PropsSanitizer', () {
    test('keeps enum strings, bools and numbers on allowed keys', () {
      expect(
        clean('prayer_start', {
          'set': 'joyful',
          'mode': 'guided',
          'resumed': false,
          'source': 'app',
        }),
        {'set': 'joyful', 'mode': 'guided', 'resumed': false, 'source': 'app'},
      );
      expect(clean('text_scale_change', {'scale': 1.25}), {'scale': 1.25});
      expect(
        clean('church_exit', {
          'church': 'stpeter',
          'seconds': 300,
          'sat_seconds': 40,
        }),
        hasLength(3),
      );
    });

    test('keys outside the per-event allow-list are dropped', () {
      expect(
        clean('screen_view', {'screen': 'home', 'extra': 'x', 'user': 'bob'}),
        {'screen': 'home'},
      );
      expect(clean('avatar_save', {'screen': 'home'}), isEmpty);
      expect(clean('church_candle', {'church': 'basic', 'seconds': 3}), {
        'church': 'basic',
      });
      expect(clean('unknown_event', {'a': 'b'}), isEmpty);
    });

    test('free-text keys never survive, even on events that list them', () {
      for (final key in ['intention', 'text', 'note', 'name']) {
        for (final event in AnalyticsEvents.specs.keys) {
          final out = clean(event, {key: 'abc', key.toUpperCase(): 'abc'});
          expect(out.containsKey(key), isFalse, reason: '$event.$key');
          expect(out.containsKey(key.toUpperCase()), isFalse);
        }
      }
      // 속성 값이 자유 문장(공백·한글 포함)이면 버린다.
      expect(clean('stats_open', {'range': '내 소원은 평화'}), isEmpty);
      expect(clean('stats_open', {'range': 'two words'}), isEmpty);
    });

    test('strings longer than 40 chars, nested values and other types go', () {
      expect(clean('stats_open', {'range': 'a' * 41}), isEmpty);
      expect(clean('stats_open', {'range': 'a' * 40}), {'range': 'a' * 40});
      expect(
        clean('stats_open', {
          'range': ['week'],
        }),
        isEmpty,
      );
      expect(
        clean('stats_open', {
          'range': {'a': 'b'},
        }),
        isEmpty,
      );
      expect(clean('stats_open', {'range': null}), isEmpty);
      expect(clean('stats_open', {'range': DateTime(2026)}), isEmpty);
      expect(clean('text_scale_change', {'scale': double.nan}), isEmpty);
      expect(clean('text_scale_change', {'scale': double.infinity}), isEmpty);
    });

    test('identifying values are dropped: email, uuid, phone, url', () {
      final bad = <String>[
        'bob@example.com',
        'a@b.co',
        '123e4567-e89b-42d3-a456-426614174000',
        '010-1234-5678',
        '01012345678',
        '+82-10-1234-5678',
        'https://example.com/x',
        'example.com',
        'www.example.com',
        'kakao:12345678',
        '/data/user/0/app',
      ];
      for (final v in bad) {
        expect(clean('stats_open', {'range': v}), isEmpty, reason: v);
        expect(clean('church_pick', {'church': v}), isEmpty, reason: v);
      }
      // 큰 정수(전화번호 같은 숫자)도 버린다.
      expect(clean('text_scale_change', {'scale': 1012345678}), isEmpty);
    });

    test('props over 2KB are trimmed (largest values removed first)', () {
      final out = clean('error', {
        'where': 'flutter',
        'message': 'm' * 5000,
        'stack': 's' * 5000,
      });
      expect(utf8.encode(jsonEncode(out)).length, lessThanOrEqualTo(2048));
      expect((out['message'] as String).length, lessThanOrEqualTo(200));
      expect((out['stack'] as String).length, lessThanOrEqualTo(1000));
    });

    test('long fields (error) are redacted rather than trusted', () {
      final out = clean('error', {
        'where': 'flutter',
        'message':
            'fail for bob@example.com id 123456789012 at /data/user/0/a/b.db',
        'stack': 'see https://x.io/a?token=abc',
      });
      final msg = out['message'] as String;
      expect(msg, isNot(contains('bob@')));
      expect(msg, isNot(contains('123456789012')));
      expect(msg, isNot(contains('/data/user')));
      expect(out['stack'], isNot(contains('https')));
    });
  });

  group('Redactor', () {
    test('device paths become <path>/basename; package URIs stay', () {
      expect(
        Redactor.redact('open /data/user/0/kr.x/files/a.json failed'),
        'open <path>/a.json failed',
      );
      expect(Redactor.redact(r'C:\Users\kim\AppData\x.txt'), '<path>/x.txt');
      expect(Redactor.redact('file:///home/kim/p/lib/main.dart:3:4'), '<url>');
      const stack =
          '#0 main (package:rosary_app/main.dart:10:5)\n'
          '#1 _x (dart:async/future.dart:20:3)';
      expect(Redactor.redact(stack), stack);
    });

    test('long digit strings, emails, uuids, tokens are replaced', () {
      expect(Redactor.redact('code 1234567 ok 12345'), 'code <n> ok 12345');
      expect(Redactor.redact('mail a.b@c.com'), 'mail <email>');
      expect(
        Redactor.redact('u 123e4567-e89b-42d3-a456-426614174000'),
        'u <uuid>',
      );
      expect(Redactor.redact('t ${'A' * 40}'), 't <token>');
    });
  });
}
