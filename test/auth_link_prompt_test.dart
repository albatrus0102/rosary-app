import 'package:flutter_test/flutter_test.dart';
import 'package:rosary_app/auth/guest_link_prompt.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  final first = DateTime(2026, 11, 1);

  group('linkSuggestionDue (순수 규칙)', () {
    test('7일 미만 + 기록 7개 미만이면 권하지 않는다', () {
      expect(
        linkSuggestionDue(
          firstSeen: first,
          records: 6,
          now: first.add(const Duration(days: 6, hours: 23)),
        ),
        isFalse,
      );
    });

    test('7일 이상이면 권한다', () {
      expect(
        linkSuggestionDue(
          firstSeen: first,
          records: 0,
          now: first.add(const Duration(days: 7)),
        ),
        isTrue,
      );
    });

    test('기록 7개 이상이면 첫날이라도 권한다', () {
      expect(
        linkSuggestionDue(firstSeen: first, records: 7, now: first),
        isTrue,
      );
    });

    test('한 번 권한 뒤 30일 안에는 다시 권하지 않고, 30일 뒤에는 가능', () {
      final suggested = first.add(const Duration(days: 8));
      expect(
        linkSuggestionDue(
          firstSeen: first,
          records: 20,
          now: suggested.add(const Duration(days: 29)),
          lastSuggested: suggested,
          suggestedCount: 1,
        ),
        isFalse,
      );
      expect(
        linkSuggestionDue(
          firstSeen: first,
          records: 20,
          now: suggested.add(const Duration(days: 30)),
          lastSuggested: suggested,
          suggestedCount: 1,
        ),
        isTrue,
      );
    });

    test('최대 횟수를 넘기면 더는 권하지 않는다', () {
      expect(
        linkSuggestionDue(
          firstSeen: first,
          records: 99,
          now: first.add(const Duration(days: 400)),
          lastSuggested: first.add(const Duration(days: 300)),
          suggestedCount: linkSuggestMaxCount,
        ),
        isFalse,
      );
    });
  });

  group('shouldSuggestLinking (prefs)', () {
    setUp(() => SharedPreferences.setMockInitialValues({}));

    test('권하고 → 기록하면 30일 동안 false', () async {
      final prefs = await SharedPreferences.getInstance();
      final now = first.add(const Duration(days: 10));
      expect(
        await shouldSuggestLinking(
          firstSeen: first,
          records: 0,
          now: now,
          prefs: prefs,
        ),
        isTrue,
      );
      await markLinkingSuggested(now: now, prefs: prefs);
      expect(
        await shouldSuggestLinking(
          firstSeen: first,
          records: 50,
          now: now.add(const Duration(days: 5)),
          prefs: prefs,
        ),
        isFalse,
      );
      expect(
        await shouldSuggestLinking(
          firstSeen: first,
          records: 50,
          now: now.add(const Duration(days: 31)),
          prefs: prefs,
        ),
        isTrue,
      );
    });

    test('조건 미달이면 false이고 아무것도 쓰지 않는다', () async {
      final prefs = await SharedPreferences.getInstance();
      expect(
        await shouldSuggestLinking(
          firstSeen: first,
          records: 1,
          now: first.add(const Duration(days: 1)),
          prefs: prefs,
        ),
        isFalse,
      );
      expect(prefs.getKeys(), isEmpty);
    });

    test('guestFirstSeen은 처음 한 번만 기록한다', () async {
      final prefs = await SharedPreferences.getInstance();
      final a = await guestFirstSeen(now: first, prefs: prefs);
      final b = await guestFirstSeen(
        now: first.add(const Duration(days: 3)),
        prefs: prefs,
      );
      expect(a, first);
      expect(b.millisecondsSinceEpoch, first.millisecondsSinceEpoch);
    });
  });
}
