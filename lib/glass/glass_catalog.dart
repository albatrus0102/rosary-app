import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:flutter/widgets.dart' show AssetImage, ImageProvider;

import 'glass_pack_image.dart';

/// 창 감상실에서 창 식별에 쓰는 id 규칙(분석 속성 `win`의 값 규칙과 같다).
final RegExp glassIdPattern = RegExp(r'^[a-z0-9_]{1,40}$');

/// 디자이너 사망 후 저작권 보호 기간(년). 카탈로그에 `designer_death_year`가 있으면
/// 이 기간이 지나지 않은 창은 싣지 않는다(GLASS_APP_PLAN §5).
const int kDesignCopyrightYears = 70;

/// 사진 가로세로비와 실제 치수 비율이 이 비율(2%) 이상 어긋나면 오류로 본다.
const double kAspectTolerance = 0.02;

/// 카탈로그가 허용하는 사진 라이선스 계열. `CC0 1.0`·`CC BY 4.0`처럼 버전이 붙은
/// 문자열은 [GlassLicense.parse]로 계열을 구한다.
enum GlassLicense {
  cc0,
  publicDomain,
  ccBy;

  /// 카탈로그 `source.license` 문자열 → 계열. 허용 목록 밖이면 null.
  static GlassLicense? parse(String? raw) {
    final s = (raw ?? '').trim().toLowerCase();
    if (s.startsWith('cc0')) return cc0;
    if (s == 'public domain' || s == 'pd') return publicDomain;
    // 'CC BY 4.0'은 허용, 'CC BY-SA'·'CC BY-NC'는 허용하지 않는다.
    if (RegExp(r'^cc[ -]by( \d(\.\d)?)?$').hasMatch(s)) return ccBy;
    return null;
  }

  /// 작가·라이선스 표시가 의무인지(CC BY).
  bool get attributionRequired => this == ccBy;
}

/// 창 형태 분류(갤러리 필터의 '형태').
enum GlassForm {
  rose('장미창'),
  lancet('첨두창'),
  oculus('원형창'),
  panel('패널'),
  medallion('메달리온'),
  grisaille('그리자유'),
  alabaster('알라바스터'),
  other('기타');

  const GlassForm(this.label);
  final String label;
}

/// 시대 분류(갤러리 필터의 '시대').
enum GlassEra {
  upTo12('12세기 이전'),
  c13('13세기'),
  c14to15('14~15세기'),
  c16to18('16~18세기'),
  c19('19세기'),
  c20('1900년 이후');

  const GlassEra(this.label);
  final String label;

  static GlassEra ofYear(int year) {
    if (year <= 1200) return upTo12;
    if (year <= 1300) return c13;
    if (year <= 1500) return c14to15;
    if (year <= 1800) return c16to18;
    if (year < 1900) return c19;
    return c20;
  }
}

/// 색감 분류(주색 6개, GLASS_APP_PLAN §2.2).
enum GlassColorTag {
  blue('파랑'),
  red('빨강'),
  gold('금·호박'),
  green('녹색'),
  purple('보라'),
  clear('무색');

  const GlassColorTag(this.label);
  final String label;
}

/// '원래 자리' 구분. authentic = 그 창이 실제로 있는 성당의 3D 모형 속 자리,
/// reference = 같은 양식의 다른 성당 창을 참고로 둔 것.
enum GlassPlacementKind { authentic, reference }

/// 이탈리아·바티칸 소재 문화재(고지 문구가 필요하다).
enum GlassHeritage { none, italy, vatican }

class GlassSize {
  const GlassSize({this.width, this.height, this.status = 'unknown'});

  final double? width;
  final double? height;

  /// `known`(실측) | `est`(추정) | `unknown`.
  final String status;

  bool get isKnown => status == 'known';
  bool get isEstimate => status == 'est';
  bool get isUnknown => width == null && height == null;
}

class GlassSource {
  const GlassSource({
    required this.kind,
    required this.title,
    required this.author,
    required this.license,
    required this.licenseUrl,
    required this.url,
    required this.credit,
    required this.creditRequired,
  });

  /// `commons` | `museum`.
  final String kind;
  final String title;
  final String author;

  /// 카탈로그의 원래 문자열(예: 'CC BY 4.0').
  final String license;
  final String licenseUrl;
  final String url;

  /// 표시 문구(카탈로그 그대로).
  final String credit;
  final bool creditRequired;

  GlassLicense? get licenseKind => GlassLicense.parse(license);
}

class GlassFile {
  const GlassFile({
    required this.path,
    required this.width,
    required this.height,
    required this.bundled,
    this.pack,
    this.bytes = 0,
  });

  /// 원본 WebP 경로. 번들 밖(art/…)일 수 있다. [bundled]가 true이고 [pack]이 없을 때만
  /// 이 경로가 곧 자산이다(썸네일).
  final String path;
  final int width;
  final int height;

  /// 앱 번들에 실리는가. 1k가 false인 창은 번들 밖이라 앱이 존재를 모르는 척한다.
  final bool bundled;

  /// 번들에 실린 창 사진 팩(`assets/church/gpack_<id>_1k.js`). 있으면 .webp 가 번들에 없고
  /// 3D 감상실과 평면 보기가 이 팩 하나를 읽는다(용량). 없으면 [path]가 자산이다.
  final String? pack;

  /// 원본 WebP 의 바이트 수(카탈로그 `bytes`, 없으면 0).
  final int bytes;

  /// 이 파일을 그리는 이미지 공급자.
  ImageProvider get provider =>
      pack != null ? GlassPackImage(pack!) : AssetImage(path);
}

class GlassPlacement {
  const GlassPlacement({required this.church, required this.kind});

  /// 3D 성당 id(`ChurchCatalog`).
  final String church;
  final GlassPlacementKind kind;
}

/// 해설 검토 상태(GLASS_APP_PLAN §5). 카탈로그에 없으면 둘 다 대기.
class GlassReview {
  const GlassReview({this.artHistorian = 'pending', this.priest = 'pending'});

  final String artHistorian;
  final String priest;

  bool get artHistorianApproved => artHistorian == 'approved';
  bool get priestApproved => priest == 'approved';
}

class GlassWindow {
  const GlassWindow({
    required this.id,
    required this.titleKo,
    required this.titleEn,
    required this.location,
    required this.dateAuthor,
    required this.form,
    required this.size,
    required this.aspect,
    required this.description,
    required this.verify,
    required this.colorNote,
    required this.source,
    required this.file1k,
    required this.file2k,
    this.fileThumb,
    required this.placements,
    required this.restoration,
    required this.limitations,
    this.designerDeathYear,
    this.review = const GlassReview(),
    this.hidden = false,
    this.heritageOverride,
  });

  final String id;
  final String titleKo;
  final String titleEn;
  final String location;
  final String dateAuthor;
  final String form;
  final GlassSize size;

  /// 가로 ÷ 세로(알파 윤곽 포함한 마스터 비율).
  final double aspect;
  final String description;

  /// 1차 자료로 확인하지 못한 내용. 비어 있지 않으면 화면에 '확인 중'을 붙인다.
  final String verify;
  final String colorNote;
  final GlassSource source;
  final GlassFile file1k;
  final GlassFile file2k;

  /// 갤러리용 소형 썸네일(가로 480·세로 800 안, `tools/glass_bundle`). 없으면 null.
  final GlassFile? fileThumb;
  final List<GlassPlacement> placements;
  final String restoration;
  final String limitations;

  /// 디자이너 사망 연도(있을 때만 70년 규칙을 검사한다).
  final int? designerDeathYear;
  final GlassReview review;

  /// true면 갤러리·오늘의 창에서 숨긴다.
  final bool hidden;
  final GlassHeritage? heritageOverride;

  bool get hasVerify => verify.trim().isNotEmpty;

  /// 갤러리 카드·오늘의 창 카드가 그리는 파일: 썸네일(없으면 1k). 카드에는 1k 원본을
  /// 디코드하지 않는다(성능).
  GlassFile get galleryFile {
    final t = fileThumb;
    return t != null && t.bundled && t.path.isNotEmpty ? t : file1k;
  }

  /// 평면 보기가 그리는 파일: 번들에 2k가 있으면 2k, 아니면 1k(지금은 1k 사진 팩).
  GlassFile get flatFile => file2k.bundled ? file2k : file1k;

  /// 실제 치수(가로·세로를 모두 아는 경우)의 비율이 사진 비율과 어긋나는 정도(0.02 = 2%).
  /// 허용 범위 안이거나 비교할 수 없으면 null.
  double? get sizeMismatch {
    final sw = size.width, sh = size.height;
    if (sw == null || sh == null || sw <= 0 || sh <= 0 || aspect <= 0) {
      return null;
    }
    final real = sw / sh;
    final diff = (real - aspect).abs() / real;
    return diff > kAspectTolerance ? diff : null;
  }

  /// 3D 성당 어딘가에 진본으로 놓이는 창인가.
  bool get isAuthentic =>
      placements.any((p) => p.kind == GlassPlacementKind.authentic);

  /// 진본이 놓이는 3D 성당 id들.
  List<String> get authenticChurches => [
    for (final p in placements)
      if (p.kind == GlassPlacementKind.authentic) p.church,
  ];

  GlassPlacementKind get placementKind =>
      isAuthentic ? GlassPlacementKind.authentic : GlassPlacementKind.reference;

  /// 제목 앞부분 외 '장소'(location에서 ' · '로 나눈 첫 토막).
  String get place => location.split(' · ').first.trim();

  /// 괄호 안 부연을 뺀 짧은 장소('클리블랜드 미술관 소장'). 카드처럼 좁은 곳에서 쓴다.
  String get shortPlace {
    final t = place.replaceAll(RegExp(r'\s*\([^)]*\)'), '').trim();
    return t.isEmpty ? place : t;
  }

  /// 사진 윤곽이 길쭉하다(랜싯류).
  bool get isTall => aspect < 0.75;

  /// 창이 있는 곳을 묶는 이름(갤러리 '성당' 필터).
  String get site => glassSiteOf(location);

  GlassForm get shape => glassFormOf(id, form);

  /// 시대. 날짜 문구에서 읽지 못하면 null.
  GlassEra? get era {
    final y = glassYearOf(dateAuthor);
    return y == null ? null : GlassEra.ofYear(y);
  }

  Set<GlassColorTag> get colors => glassColorsOf(colorNote);

  GlassHeritage get heritage {
    final o = heritageOverride;
    if (o != null) return o;
    if (location.contains('바티칸')) return GlassHeritage.vatican;
    if (location.contains('이탈리아')) return GlassHeritage.italy;
    return GlassHeritage.none;
  }

  /// 날짜·작가 문구에서 작가 부분('미상'이면 null 대신 '미상').
  String get dateText => dateAuthor.split(' · ').first.trim();
  String get authorText {
    final parts = dateAuthor.split(' · ');
    if (parts.length < 2) return '미상';
    final a = parts.sublist(1).join(' · ').trim();
    return a.isEmpty || a == '미상' ? '미상' : a;
  }
}

// ---------------------------------------------------------------------------
// 분류 도우미(카탈로그 문구에서 읽는다). 단위 시험은 test/glass_catalog_test.dart.
// ---------------------------------------------------------------------------

/// 소재지 문구 → (이름, 분석용 영문 키). 앞에서부터 처음 맞는 것을 쓴다.
const List<(String keyword, String label, String key)> _siteKeywords = [
  ('생트샤펠', '파리 생트샤펠', 'sainte_chapelle'),
  ('샤르트르', '샤르트르', 'chartres'),
  ('노트르담', '파리 노트르담', 'notre_dame'),
  ('요크', '요크', 'york'),
  ('캔터베리', '캔터베리', 'canterbury'),
  ('링컨', '링컨', 'lincoln'),
  ('베벌리', '베벌리', 'beverley'),
  ('피렌체', '피렌체', 'florence'),
  ('시에나', '시에나', 'siena'),
  ('밀라노', '밀라노', 'milan'),
  ('성 바오로', '로마 성 바오로', 'st_paul'),
  ('성 베드로', '바티칸', 'vatican'),
  ('클리블랜드', '클리블랜드 미술관', 'cleveland'),
  ('아우크스부르크', '아우크스부르크', 'augsburg'),
  ('쾰른', '쾰른', 'cologne'),
  ('스트라스부르', '스트라스부르', 'strasbourg'),
];

/// 어느 곳에도 묶이지 않은 창.
const String kSiteOther = '그 밖';
const String kSiteOtherKey = 'other';

String glassSiteOf(String location) {
  for (final (k, label, _) in _siteKeywords) {
    if (location.contains(k)) return label;
  }
  return kSiteOther;
}

/// 소재지 이름 → 분석용 영문 키(`glass_filter{kind:church,value}`).
String glassSiteKey(String label) {
  for (final (_, l, key) in _siteKeywords) {
    if (l == label) return key;
  }
  return kSiteOtherKey;
}

/// 카탈로그 id와 `form` 문구 → 형태.
GlassForm glassFormOf(String id, String form) {
  if (id.startsWith('alabaster')) return GlassForm.alabaster;
  if (id.startsWith('grisaille')) return GlassForm.grisaille;
  if (id.startsWith('medallion')) return GlassForm.medallion;
  final f = form.toLowerCase();
  if (f.startsWith('rose')) return GlassForm.rose;
  if (f.startsWith('lancet')) return GlassForm.lancet;
  if (f.startsWith('oculus')) return GlassForm.oculus;
  if (f.startsWith('panel')) return GlassForm.panel;
  return GlassForm.other;
}

final RegExp _yearToken = RegExp(
  r'(\d{3,4})\s*(?:[–~\-]\s*\d{3,4})?\s*년|c\.\s*(\d{3,4})|(\d{1,2})\s*세기(\s*[초말])?',
);

/// 날짜 문구('c. 1235년 · 작가 미상', '13세기', '11세기 말~12세기 전반' …)에서 대표 연도를
/// 읽는다. 읽지 못하면 null. '유리 …'가 따로 있으면(석조와 유리 연대가 다른 창) 유리 쪽을 쓴다.
int? glassYearOf(String dateAuthor) {
  var text = dateAuthor.split(' · ').first;
  final g = text.indexOf('유리');
  if (g >= 0) text = text.substring(g + 2);
  final m = _yearToken.firstMatch(text);
  if (m == null) return null;
  if (m.group(1) != null) return int.parse(m.group(1)!);
  if (m.group(2) != null) return int.parse(m.group(2)!);
  final c = int.parse(m.group(3)!);
  final tail = (m.group(4) ?? '').trim();
  final mid = (c - 1) * 100 + 50;
  if (tail == '초') return mid - 35;
  if (tail == '말') return mid + 35;
  return mid;
}

// 색 단어 → 태그. 색 메모(color_note)의 낱말을 훑는다. 메모에 적힌 색만 센다.
const Map<GlassColorTag, List<String>> _colorWords = {
  GlassColorTag.blue: ['파랑', '남색', '하늘색', '청색', '블루'],
  GlassColorTag.red: ['빨강', '루비', '붉은', '적색'],
  GlassColorTag.gold: ['금색', '호박', '노랑', '주황', '황토', '꿀색', '금빛'],
  GlassColorTag.green: ['녹색', '초록', '연두', '녹황'],
  GlassColorTag.purple: ['보라', '자주', '분홍'],
  GlassColorTag.clear: [
    '무색',
    '그리자유',
    '회백',
    '회녹',
    '은회색',
    '크림',
    '무채색',
    '흰 유리 바탕',
    '맑은 흰 유리',
    '대부분 흰 유리',
    '흰색~',
  ],
};

Set<GlassColorTag> glassColorsOf(String note) {
  final out = <GlassColorTag>{};
  _colorWords.forEach((tag, words) {
    if (words.any(note.contains)) out.add(tag);
  });
  return out;
}

// ---------------------------------------------------------------------------
// 검증
// ---------------------------------------------------------------------------

enum GlassIssueLevel { error, warning }

class GlassIssue {
  const GlassIssue(this.level, this.id, this.message);
  final GlassIssueLevel level;
  final String id;
  final String message;

  bool get isError => level == GlassIssueLevel.error;

  @override
  String toString() => '${level.name}: $id: $message';
}

/// 창 하나를 검사한다. 오류가 하나라도 있으면 앱은 그 창을 목록에서 뺀다.
List<GlassIssue> validateGlassWindow(GlassWindow w, {int? thisYear}) {
  final issues = <GlassIssue>[];
  void err(String m) => issues.add(GlassIssue(GlassIssueLevel.error, w.id, m));
  void warn(String m) =>
      issues.add(GlassIssue(GlassIssueLevel.warning, w.id, m));

  if (!glassIdPattern.hasMatch(w.id)) err('id 규칙 위반(^[a-z0-9_]{1,40}\$)');
  if (w.titleKo.trim().isEmpty) err('title_ko 없음');
  final lic = w.source.licenseKind;
  if (lic == null) {
    err('허용되지 않은 라이선스: ${w.source.license}');
  } else if (lic.attributionRequired && !w.source.creditRequired) {
    err('CC BY인데 credit_required가 false');
  }
  if (w.source.credit.trim().isEmpty) err('credit 문구 없음');
  if (w.source.author.trim().isEmpty) err('author 없음');
  if (lic == GlassLicense.ccBy && w.source.licenseUrl.isEmpty) {
    err('CC BY 라이선스 링크 없음');
  }
  if (w.aspect <= 0 || !w.aspect.isFinite) err('aspect_w_over_h가 올바르지 않음');
  // 번들 밖 창(file1k.bundled == false)은 [GlassCatalog.parse]가 오류 없이 건너뛴다.
  if (!w.file1k.path.endsWith('.webp')) err('1k 파일 경로가 올바르지 않음');
  final pack = w.file1k.pack;
  if (w.file1k.bundled && pack != null && !pack.endsWith('.js')) {
    err('1k 사진 팩 경로가 올바르지 않음');
  }
  // 2k는 번들에 싣지 않는다(art/glass_2k/). 서버가 생기면 내려받는다.
  if (!w.file2k.path.endsWith('.webp')) err('2k 파일 경로가 올바르지 않음');
  final thumb = w.fileThumb;
  if (thumb != null &&
      (!thumb.path.endsWith('.webp') || (w.file1k.bundled && !thumb.bundled))) {
    err('썸네일이 번들되지 않음');
  }

  // 실제 치수의 가로세로비와 사진 비율이 2% 이내인가(둘 다 알 때만). 어긋나도 창은
  // 보여 주되(사진 비율이 기준) 치수 표기를 '확인 필요'로 바꾸고 경고를 남긴다.
  final mismatch = w.sizeMismatch;
  if (mismatch != null) {
    warn(
      '치수 비율과 사진 비율이 ${(mismatch * 100).toStringAsFixed(1)}% 어긋남'
      '(허용 ${(kAspectTolerance * 100).toStringAsFixed(0)}%): '
      '${w.size.width}x${w.size.height}m vs ${w.aspect}',
    );
  }

  // 70년 규칙: 사망 연도를 아는 디자이너만 검사한다. 필드가 없으면 검사할 수 없으므로
  // 사진 라이선스만 본다(GLASS_CATALOG.md '제외' 항목과 사람이 한 번 더 확인).
  final death = w.designerDeathYear;
  if (death != null) {
    final year = thisYear ?? DateTime.now().year;
    if (year - death < kDesignCopyrightYears) {
      err('디자이너 사망 후 $kDesignCopyrightYears년이 지나지 않음($death)');
    }
  }

  if (w.hasVerify && w.description.trim().isEmpty) {
    warn('verify는 있는데 설명이 비어 있음');
  }
  if (w.placements.isEmpty) warn('suggestedChurches 없음');
  return issues;
}

// ---------------------------------------------------------------------------
// 카탈로그
// ---------------------------------------------------------------------------

class GlassCatalog {
  GlassCatalog._(this.all, this.issues, this.unbundledIds)
    : _byId = {for (final w in all) w.id: w};

  /// 검증을 통과한 창(원래 순서).
  final List<GlassWindow> all;

  /// 읽는 동안 나온 문제. 오류가 난 창은 [all]에서 빠져 있다.
  final List<GlassIssue> issues;

  /// 카탈로그에는 있지만 번들에 싣지 않은 창의 id(앱은 존재를 숨긴다. 서버가 생기면 내려받는다).
  /// [GlassCatalog.parse]의 `includeUnbundled`가 true이면 이 창들이 [all]에도 들어 있다.
  final List<String> unbundledIds;
  final Map<String, GlassWindow> _byId;

  static const String assetPath = 'assets/church/glass_catalog.json';

  /// 갤러리·오늘의 창에 보이는 창(숨김 제외).
  List<GlassWindow> get visible => [
    for (final w in all)
      if (!w.hidden) w,
  ];

  bool get hasErrors => issues.any((i) => i.isError);

  GlassWindow? byId(String id) => _byId[id];

  /// JSON 문자열을 읽는다. 오류가 있는 창은 [issues]에 남기고 목록에서 뺀다.
  ///
  /// 번들에 싣지 않은 창(`files.1k.bundled:false`)은 갤러리·오늘의 창·필터·검색·라이선스
  /// 화면 어디에도 나오지 않도록 [all]에서 뺀다([unbundledIds]에만 남는다). 분류·검증
  /// 시험처럼 전체 카탈로그가 필요할 때만 [includeUnbundled]를 켠다.
  static GlassCatalog parse(
    String source, {
    int? thisYear,
    bool includeUnbundled = false,
  }) {
    final root = jsonDecode(source);
    if (root is! Map) throw const FormatException('카탈로그 최상위가 객체가 아님');
    final list = root['windows'];
    if (list is! List) throw const FormatException('windows 목록이 없음');
    final windows = <GlassWindow>[];
    final issues = <GlassIssue>[];
    final unbundled = <String>[];
    final seen = <String>{};
    for (final raw in list) {
      if (raw is! Map) continue;
      final GlassWindow w;
      try {
        w = _parseWindow(raw.cast<String, Object?>());
      } catch (e) {
        issues.add(
          GlassIssue(GlassIssueLevel.error, '${raw['id']}', '읽을 수 없음: $e'),
        );
        continue;
      }
      if (!w.file1k.bundled) {
        unbundled.add(w.id);
        if (!includeUnbundled) continue;
      }
      final found = validateGlassWindow(w, thisYear: thisYear);
      if (!seen.add(w.id)) {
        found.add(GlassIssue(GlassIssueLevel.error, w.id, 'id 중복'));
      }
      issues.addAll(found);
      if (!found.any((i) => i.isError)) windows.add(w);
    }
    return GlassCatalog._(
      List.unmodifiable(windows),
      List.unmodifiable(issues),
      List.unmodifiable(unbundled),
    );
  }

  static Future<GlassCatalog>? _shared;

  /// 앱 번들의 카탈로그. 한 번만 읽고 같은 Future를 돌려준다.
  static Future<GlassCatalog> shared({AssetBundle? bundle}) =>
      _shared ??= (bundle ?? rootBundle).loadString(assetPath).then(parse);

  /// 시험용: 공유 캐시를 비운다.
  @visibleForTesting
  static void debugResetShared() => _shared = null;

  /// 시험용: 자산 읽기 대신 이 카탈로그를 쓴다(위젯 시험에서 자산 읽기는 비동기라
  /// `pumpAndSettle`이 불러오기 표시를 기다리다 멈춘다).
  @visibleForTesting
  static void debugSetShared(Future<GlassCatalog> f) => _shared = f;

  // --- 질의 ---

  /// 3D 성당 [churchId]에 놓을 수 있는 창(진본이 앞).
  List<GlassWindow> byChurch(String churchId, {GlassPlacementKind? kind}) {
    final out = <GlassWindow>[];
    for (final w in all) {
      for (final p in w.placements) {
        if (p.church == churchId && (kind == null || p.kind == kind)) {
          out.add(w);
          break;
        }
      }
    }
    out.sort((a, b) {
      final ai = a.authenticChurches.contains(churchId) ? 0 : 1;
      final bi = b.authenticChurches.contains(churchId) ? 0 : 1;
      return ai - bi;
    });
    return out;
  }

  List<GlassWindow> bySite(String site) => [
    for (final w in all)
      if (w.site == site) w,
  ];

  List<GlassWindow> byEra(GlassEra era) => [
    for (final w in all)
      if (w.era == era) w,
  ];

  List<GlassWindow> byForm(GlassForm form) => [
    for (final w in all)
      if (w.shape == form) w,
  ];

  List<GlassWindow> byColor(GlassColorTag tag) => [
    for (final w in all)
      if (w.colors.contains(tag)) w,
  ];

  /// 필터에 쓰는 소재지 이름 목록(창 수 많은 순, 같으면 이름순, '그 밖'은 마지막).
  List<String> get sites {
    final count = <String, int>{};
    for (final w in all) {
      count[w.site] = (count[w.site] ?? 0) + 1;
    }
    final keys = count.keys.toList()
      ..sort((a, b) {
        if (a == kSiteOther) return 1;
        if (b == kSiteOther) return -1;
        final c = count[b]!.compareTo(count[a]!);
        return c != 0 ? c : a.compareTo(b);
      });
    return keys;
  }

  /// [date]의 '오늘의 창'. 숨기지 않은 창이 없으면 null. 같은 날짜는 항상 같은 창이고,
  /// 창 수만큼의 날이 지나야 한 바퀴를 돈다(날마다 순서가 섞여 이웃한 날이 비슷하지 않다).
  GlassWindow? windowOfTheDay(DateTime date) {
    final list = visible;
    if (list.isEmpty) return null;
    final ordered = [...list]
      ..sort((a, b) {
        final c = _fnv(a.id).compareTo(_fnv(b.id));
        return c != 0 ? c : a.id.compareTo(b.id);
      });
    final day = DateTime.utc(
      date.year,
      date.month,
      date.day,
    ).difference(DateTime.utc(2026, 1, 1)).inDays;
    return ordered[day % ordered.length];
  }

  static int _fnv(String s) {
    var h = 0x811c9dc5;
    for (final c in s.codeUnits) {
      h ^= c;
      h = (h * 0x01000193) & 0x7fffffff;
    }
    return h;
  }
}

// ---------------------------------------------------------------------------
// JSON → 모델
// ---------------------------------------------------------------------------

String _s(Object? v) => v is String ? v : '';
double? _d(Object? v) => v is num ? v.toDouble() : null;

GlassFile _file(Object? raw) {
  final m = raw is Map ? raw : const {};
  final px = m['px'];
  return GlassFile(
    path: _s(m['path']),
    width: px is List && px.isNotEmpty && px[0] is num
        ? (px[0] as num).toInt()
        : 0,
    height: px is List && px.length > 1 && px[1] is num
        ? (px[1] as num).toInt()
        : 0,
    bundled: m['bundled'] == true,
    bytes: m['bytes'] is num ? (m['bytes'] as num).toInt() : 0,
    pack: m['pack'] is String && (m['pack'] as String).isNotEmpty
        ? m['pack'] as String
        : null,
  );
}

GlassWindow _parseWindow(Map<String, Object?> j) {
  final src = (j['source'] as Map?)?.cast<String, Object?>() ?? const {};
  final files = (j['files'] as Map?)?.cast<String, Object?>() ?? const {};
  final size = (j['real_size_m'] as Map?)?.cast<String, Object?>() ?? const {};
  final review = (j['review'] as Map?)?.cast<String, Object?>();
  final heritage = _s(j['heritage']);
  final churches = j['suggestedChurches'];
  return GlassWindow(
    id: _s(j['id']),
    titleKo: _s(j['title_ko']),
    titleEn: _s(j['title_en']),
    location: _s(j['location']),
    dateAuthor: _s(j['date_author']),
    form: _s(j['form']),
    size: GlassSize(
      width: _d(size['width']),
      height: _d(size['height']),
      status: _s(size['status']).isEmpty ? 'unknown' : _s(size['status']),
    ),
    aspect: _d(j['aspect_w_over_h']) ?? 0,
    description: _s(j['description_ko']),
    verify: _s(j['verify']),
    colorNote: _s(j['color_note']),
    source: GlassSource(
      kind: _s(src['kind']),
      title: _s(src['title']),
      author: _s(src['author']),
      license: _s(src['license']),
      licenseUrl: _s(src['license_url']),
      url: _s(src['url']),
      credit: _s(src['credit']),
      creditRequired: src['credit_required'] == true,
    ),
    file1k: _file(files['1k']),
    file2k: _file(files['2k']),
    fileThumb: files['thumb'] is Map ? _file(files['thumb']) : null,
    placements: [
      if (churches is List)
        for (final c in churches)
          if (c is Map && c['church'] is String)
            GlassPlacement(
              church: c['church'] as String,
              // 카탈로그는 `use`, 계획 문서는 `kind`라고 쓴다. 둘 다 받는다.
              kind: (c['use'] ?? c['kind']) == 'authentic'
                  ? GlassPlacementKind.authentic
                  : GlassPlacementKind.reference,
            ),
    ],
    restoration: _s(j['restoration']),
    limitations: _s(j['limitations']),
    designerDeathYear: j['designer_death_year'] is num
        ? (j['designer_death_year'] as num).toInt()
        : null,
    review: review == null
        ? const GlassReview()
        : GlassReview(
            artHistorian: _s(review['art_historian']).isEmpty
                ? 'pending'
                : _s(review['art_historian']),
            priest: _s(review['priest']).isEmpty
                ? 'pending'
                : _s(review['priest']),
          ),
    hidden: j['hidden'] == true,
    heritageOverride: switch (heritage) {
      'it' => GlassHeritage.italy,
      'va' => GlassHeritage.vatican,
      _ => null,
    },
  );
}
