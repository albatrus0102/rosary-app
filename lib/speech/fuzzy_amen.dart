/// "아멘" 인식 오류를 흡수하는 음운(자모) 규칙. 실험실에서 검증된 규칙을 그대로 옮겼다.
/// 규칙 A/T는 '아멘', 규칙 F는 파티마 기도 끝맺음("가장 버림받은 영혼을 돌보소서")용이다.
library;

final RegExp _noise = RegExp(r'[\s\p{P}\p{S}\p{Z}]', unicode: true);
String norm(String t) => t.replaceAll(_noise, '');

// Jamo index constants: initial ㄴ ㄹ ㅁ ㅂ ㅇ ㅎ, vowel ㅏ ㅐ ㅓ ㅔ, final none ㄴ ㅁ ㅇ.
const _iN = 2, _iR = 5, _iM = 6, _iB = 7, _iO = 11, _iH = 18;
const _vA = 0, _vAE = 1, _vEO = 4, _vE = 5; // ㅏ ㅐ ㅓ ㅔ
const _fNone = 0, _fN = 4, _fM = 16, _fNG = 21; // (none) ㄴ ㅁ ㅇ

/// (initial, vowel, final) indices, or null when [cu] is not a Hangul syllable.
(int, int, int)? dec(int cu) {
  final c = cu - 0xAC00;
  if (c < 0 || c >= 11172) return null;
  return (c ~/ 588, (c % 588) ~/ 28, c % 28);
}

bool _s1Vowel(int v) => v == _vA || v == _vAE || v == _vEO || v == _vE;

/// Rule A (strict; safe on streaming partials): number of non-overlapping matches of
///   S1 = [ㅇㅎㄹㄴ][ㅏㅐㅓㅔ](none|ㅁ)  followed by
///   S2 = (ㅁ if S1 has no final, ㅇ/ㅁ if S1 ends in ㅁ)[ㅔㅐ](ㄴ|ㅇ)
int ruleA(String text) {
  final t = norm(text).codeUnits;
  var n = 0;
  var i = 0;
  while (i + 1 < t.length) {
    final a = dec(t[i]), b = dec(t[i + 1]);
    if (a != null && b != null) {
      final (ai, av, af) = a;
      final (bi, bv, bf) = b;
      final s1 =
          (ai == _iO || ai == _iH || ai == _iR || ai == _iN) &&
          _s1Vowel(av) &&
          (af == _fNone || af == _fM);
      final link =
          (af == _fNone && bi == _iM) ||
          (af == _fM && (bi == _iO || bi == _iM));
      final s2 = (bv == _vE || bv == _vAE) && (bf == _fN || bf == _fNG);
      if (s1 && link && s2) {
        n++;
        i += 2;
        continue;
      }
    }
    i++;
  }
  return n;
}

/// Rule T (loose; evaluate ONLY on a finished segment, i.e. at endpoint, and only
/// when rule A found nothing in that segment).
bool ruleT(String segment) {
  final t = norm(segment).codeUnits;
  if (t.isEmpty) return false;
  final whole = String.fromCharCodes(t);
  if (whole == '멘' || whole == '맨' || whole == '메' || whole == '멩') return true;
  final last = dec(t.last);
  if (last == null) return false;
  bool tIni(int i) => i == _iO || i == _iR || i == _iN || i == _iB;
  final (li, lv, lf) = last;
  if (tIni(li) && _s1Vowel(lv) && lf == _fM) return true; // 암 남 엄 밤
  if (t.length >= 2) {
    final p = dec(t[t.length - 2]);
    if (p == null) return false;
    final (pi, pv, pf) = p;
    if (tIni(pi) && _s1Vowel(pv) && pf == _fM && (li == _iO || li == _iH)) {
      return true; // 암에 암호 암은
    }
    if ((pi == _iO || pi == _iH || pi == _iR || pi == _iN) &&
        _s1Vowel(pv) &&
        pf == _fNone &&
        li == _iM &&
        (lv == _vE || lv == _vAE)) {
      return true; // 아메 라메
    }
  }
  return false;
}

/// Fatima-prayer ending ("가장 버림받은 영혼을 돌보소서"); the model never spells 돌보소서.
final RegExp _fatima = RegExp(r'[버어]림받|버린바|받은영혼|영혼을돌[보고봐][썼섰써서소줬쓰]');
bool ruleF(String text) => _fatima.hasMatch(norm(text));
