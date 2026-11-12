import 'consent_store.dart';

// 문구의 원본은 docs/legal/consent_texts.md 이다. 이 파일은 그 내용을 옮긴 것이며,
// 문서 본문(약관·처리방침 등)은 tool/gen_legal_docs.py 가 만든 legal_docs.dart 에 있다.
// 문구를 고치면 consentVersion도 함께 올려야 한다.
export 'legal_docs.dart';

// ---------------------------------------------------------------------------
// 서버 전송 고지(공통)
// ---------------------------------------------------------------------------

/// 동의 화면 상단 고지.
const String consentTransmissionNotice =
    '동의한 항목의 데이터는 서비스 서버(Supabase)로 전송되어 저장됩니다. '
    '저장되는 항목은 항목마다 이름을 하나씩 적어 두었습니다. '
    '동의하지 않은 항목은 서버로 전송되거나 저장되지 않습니다.';

/// 동의 화면 하단 '수집하지 않는 정보'.
const String consentNotCollectedLine =
    '수집하지 않는 정보: 직접 입력한 글, 기도 내용, 촛불 지향(의향)의 내용, '
    '정확한 위치, 연락처·사진·마이크 녹음, 광고 식별자.';

/// 국외 저장 고지 한 줄.
const String consentCrossBorderNotice =
    '데이터는 Supabase 서버에 저장되며, 프로젝트 지역 설정에 따라 대한민국 밖(국외)에 보관될 수 있습니다.';

/// 선택 동의 거부 안내 한 줄.
const String consentRefusalLine =
    '선택 항목에 동의하지 않아도 앱의 모든 기능을 그대로 사용할 수 있고, 불이익이 없습니다.';

/// 종교 활동 정보(민감정보 가능성) 안내.
const String consentSensitiveNote =
    '종교 활동과 관련된 정보로서 개인정보 보호법상 민감정보에 해당할 수 있어 별도로 동의를 받습니다.';

/// 필수 동의로 서버에 저장되는 계정 정보(필드 이름).
const List<String> requiredServerFields = [
  '로그인 수단(카카오·Google·이메일)',
  '이메일 주소(이메일 가입 시 직접 입력, 소셜 로그인은 해당 서비스가 제공한 경우)',
  '이메일 가입 시 비밀번호(암호화된 값으로만 저장)',
  '서버가 부여한 계정 식별자(무작위 ID)',
  '가입 시각, 마지막 접속 시각, 앱 언어 설정',
  '동의 이력(동의 종류, 버전, 동의·철회 여부, 시각, 경로)',
];

// ---------------------------------------------------------------------------
// 선택 동의 항목별 문구(네 가지 표준 요소 + 철회 방법)
// ---------------------------------------------------------------------------

class ConsentItemText {
  const ConsentItemText({
    required this.kind,
    required this.title,
    required this.summary,
    required this.purpose,
    required this.fields,
    required this.retention,
    this.sensitive = false,
    this.refusal = '거부할 수 있으며 거부해도 서비스 이용에 불이익이 없습니다. 앱의 모든 기능을 그대로 쓸 수 있습니다.',
    this.withdraw = '설정 > 계정 > 선택 동의에서 끄세요. 끄는 즉시 이 범주의 서버 데이터가 삭제됩니다.',
  });

  final String kind;

  /// 예: '화면·기능 사용 분석'
  final String title;

  /// 한 줄 설명(동의 화면 행).
  final String summary;

  /// 수집·이용 목적.
  final String purpose;

  /// 수집 항목(서버로 전송되는 필드).
  final List<String> fields;

  /// 보유·이용 기간.
  final String retention;

  /// 민감정보 안내를 보일지.
  final bool sensitive;

  /// 동의 거부 권리와 불이익.
  final String refusal;

  /// 철회 방법.
  final String withdraw;
}

const Map<String, ConsentItemText> consentItemTexts = {
  ConsentKind.usage: ConsentItemText(
    kind: ConsentKind.usage,
    title: '화면·기능 사용 분석',
    summary: '화면·기능 사용 정보를 서버로 보내 앱 개선에 씁니다.',
    purpose: '어떤 화면과 기능이 많이 쓰이는지 파악하여 앱을 개선하고, 이용자 수·유지율 등 통계를 내기 위함',
    fields: [
      '앱 열기, 화면 이름(예: 홈, 기도, 통계, 설정)',
      '로그인 성공과 로그인 수단, 동의 변경(동의 종류와 여부)',
      '기도 시작(신비 종류, 모드, 이어하기 여부, 기록 출처)',
      '단 완료(신비 종류, 몇 단)',
      '기도 종료(신비 종류, 완주 여부, 완료 단 수, 걸린 시간(초))',
      '묵주 모양·모드·선창 음성(종류)·글자 크기 단계 변경 값, 설정 항목 이름, 통계 화면 열람 범위',
      '각 사건의 발생 시각, 임의로 만든 세션 ID, 앱 버전, 운영체제 종류(안드로이드/iOS)',
    ],
    retention:
        '철회하거나 탈퇴할 때까지, 최대 24개월. 24개월이 지난 기록은 자동 삭제합니다. 철회·탈퇴 시 즉시 삭제합니다.',
    sensitive: true,
  ),
  ConsentKind.sync: ConsentItemText(
    kind: ConsentKind.sync,
    title: '기도 기록 동기화',
    summary: '기도 기록을 서버에 저장해 기기를 바꿔도 이어 볼 수 있게 합니다.',
    purpose: '기도 기록(통계)을 계정에 백업하고, 기기를 바꾸거나 다시 설치해도 복원하며, 이용 현황 통계를 내기 위함',
    fields: [
      '기록 ID(앱이 만든 무작위 값)',
      '기도한 날짜·시각',
      '신비 종류(환희/빛/고통/영광)',
      '마친 단 수(0~5), 성모송 횟수(0~60)',
      '완주 여부, 걸린 시간(초)',
      '기록 출처(앱 또는 성당), 서버 저장 시각',
    ],
    retention: '철회하거나 탈퇴할 때까지. 철회·탈퇴 시 즉시 삭제합니다.',
    sensitive: true,
    refusal: '거부할 수 있으며 거부해도 불이익이 없습니다. 기도 기록은 이 기기에만 저장되고, 기기를 바꾸면 이어 볼 수 없다는 점만 다릅니다.',
    withdraw:
        '설정 > 계정 > 선택 동의에서 끄세요. 끄는 즉시 서버의 기도 기록이 삭제됩니다(이 기기의 기록은 그대로 남습니다).',
  ),
  ConsentKind.church: ConsentItemText(
    kind: ConsentKind.church,
    title: '성당 이용 기록',
    summary: '가상 성당 이용 기록을 서버로 보내 서비스 개선에 씁니다.',
    purpose: '어느 성당이 많이 쓰이는지, 얼마나 머무는지 등 성당 기능의 이용 현황을 파악해 기능을 개선하기 위함',
    fields: [
      '성당 선택(성당 이름 또는 ID)',
      '성당 입장(성당, 온라인 여부)',
      '성당 퇴장(성당, 머문 시간(초), 앉아 있던 시간(초))',
      '착석 횟수, 촛불 켠 횟수(지향의 내용은 기록하지 않음), 아바타 저장 횟수(아바타 이미지는 보내지 않음)',
      '각 사건의 발생 시각, 세션 ID, 앱 버전, 운영체제 종류',
    ],
    retention:
        '철회하거나 탈퇴할 때까지, 최대 24개월. 24개월이 지난 기록은 자동 삭제합니다. 철회·탈퇴 시 즉시 삭제합니다.',
    sensitive: true,
    refusal: '거부할 수 있으며 거부해도 불이익이 없습니다. 성당 기능은 그대로 쓸 수 있습니다.',
  ),
  ConsentKind.diagnostics: ConsentItemText(
    kind: ConsentKind.diagnostics,
    title: '오류·기기 정보',
    summary: '오류 기록과 기기 정보를 서버로 보내 앱 안정성 개선에 씁니다.',
    purpose: '앱 오류를 찾아 고치고, 기기·운영체제·앱 버전별 호환성과 성능을 점검하기 위함',
    fields: [
      '오류 기록(오류가 난 위치, 오류 메시지 200자 이내, 오류 추적 정보 1,000자 이내, 발생 시각)',
      '성능 정보(평균 프레임 수, 성당 ID)',
      '기기 정보(앱이 만든 무작위 기기 ID, 기기 모델명, 운영체제 버전, 앱 버전, 언어 설정, 처음·마지막 확인 시각)',
      '세션 ID, 앱 버전, 운영체제 종류',
    ],
    retention: '철회하거나 탈퇴할 때까지. 오류·성능 기록은 최대 24개월, 기기 정보는 마지막 확인 후 24개월이 지나면 자동 삭제합니다. 철회·탈퇴 시 즉시 삭제합니다.',
    withdraw: '설정 > 계정 > 선택 동의에서 끄세요. 끄는 즉시 오류 기록과 기기 정보가 삭제됩니다.',
  ),
};

/// 동의 종류의 화면용 이름(필수 포함).
String consentTitle(String kind) {
  switch (kind) {
    case ConsentKind.terms:
      return '이용약관';
    case ConsentKind.privacy:
      return '개인정보 수집·이용';
    case ConsentKind.age14:
      return '만 14세 이상';
  }
  return consentItemTexts[kind]?.title ?? kind;
}

// 문서 제목(LegalScreen 제목).
const String legalTermsTitle = '이용약관';
const String legalPrivacyTitle = '개인정보처리방침';
const String legalPrivacyConsentTitle = '개인정보 수집·이용 동의';
const String legalAge14Title = '만 14세 이상 확인';
