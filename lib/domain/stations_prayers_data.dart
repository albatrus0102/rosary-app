// 생성 파일 — 직접 고치지 말 것.
// 원본: data/stations_prayers.json → python3 tools/stations/build_stations.py
// 한국천주교주교회의 『가톨릭 기도서』(개정판) 여러 가지 기도 > 십자가의 길 (https://cbck.or.kr/Catholic/Prayer, 본문 수정일 2019-09-05, 대조 2026-11-15).
// © 한국천주교주교회의. 전재·복제에는 주교회의의 승인이 필요합니다.

part of 'stations_prayers.dart';

// dart format off
const int _prayersVersion = 1;
const String _sourceTitle = "『가톨릭 기도서』(개정판)";
const String _sourcePublisher = "한국천주교주교회의";
const String _sourceEdition = "주교회의 2017년 추계 정기 총회 승인, 2018년 4월 1일 펴냄";
const String _sourceUrl = "https://cbck.or.kr/Catholic/Prayer";
const String _sourceCopyright = "© 한국천주교주교회의. 전재·복제에는 주교회의의 승인이 필요합니다.";
const String _sourceCredit = "기도문: 한국천주교주교회의 『가톨릭 기도서』(개정판) ‘십자가의 길’ © 한국천주교주교회의";

// 기호별 (공식 일러두기의 뜻, 화면·낭독용 짧은 이름). StationsPrayerRole.values 순서.
const List<(String, String, String)> _markers = [
  ("┼", "집전자 또는 주송자", "주송자"),
  ("○", "계 또는 선창자", "선창자"),
  ("●", "응", "응답"),
  ("◎", "합송", "다 함께"),
];

const List<String> _introRubrics = [
  "아무 때나 바칠 수 있지만 특별히 사순 시기 금요일과 성금요일에는 마땅히 바쳐야 한다.",
  "먼저 깊이 뉘우치고 아래의 기도를 바친다.",
];

const StationsPrayerPart _openingPart = StationsPrayerPart(
      role: StationsPrayerRole.leader,
      lines: [
        StationsPrayerLine("주 예수님,"),
        StationsPrayerLine("저희를 위하여 온갖 수난을 겪으신"),
        StationsPrayerLine("주님의 사랑을 묵상하며"),
        StationsPrayerLine("성모님과 함께"),
        StationsPrayerLine("십자가의 길을 걷고자 하나이다."),
        StationsPrayerLine("저희에게 죄를 뉘우치고"),
        StationsPrayerLine("주님의 수난을 함께 나눌 마음을 주시어"),
        StationsPrayerLine("언제나 주님을 사랑하게 하시며"),
        StationsPrayerLine("성직자들을 거룩하게 하시고"),
        StationsPrayerLine("모든 죄인이 회개하도록 은혜를 내려 주소서."),
      ],
    );

const String _toStationRubric = "제{n}처로 가며";
const StationsPrayerPart _toStationPart = StationsPrayerPart(
      role: StationsPrayerRole.all,
      lines: [
        StationsPrayerLine("어머니께 청하오니"),
        StationsPrayerLine("제 맘속에 주님 상처 깊이 새겨 주소서."),
      ],
    );

const List<StationsPrayerPart> _versePart = [
  StationsPrayerPart(
    role: StationsPrayerRole.leader,
    lines: [
      StationsPrayerLine("주님께서는 십자가로 온 세상을 구원하셨나이다."),
    ],
  ),
  StationsPrayerPart(
    role: StationsPrayerRole.all,
    lines: [
      StationsPrayerLine("예수 그리스도님,"),
      StationsPrayerLine.rubric("깊은 절을 하며"),
      StationsPrayerLine("경배하며 찬송하나이다."),
    ],
  ),
];

const List<String> _afterRubrics = [
  "잠깐 묵상한다.",
  "주님의 기도, 성모송, 영광송.",
];

// 처별 (알림 문장, 기도 줄).
const List<(String, List<String>)> _stationPrayers = [
  (
    "예수님께서 사형 선고 받으심을 묵상합시다.",
    [
      "구세주 예수님,",
      "저희를 위하여",
      "아무런 죄도 없이 극심한 모욕과 사형 선고를 받으셨으니",
      "죄인들이 마땅히 받아야 할 영원한 벌에서",
      "저희를 구원하소서.",
    ],
  ),
  (
    "예수님께서 십자가 지심을 묵상합시다.",
    [
      "구세주 예수님,",
      "저희를 사랑하신 까닭에",
      "이 무거운 십자가를 기꺼이 지고 가셨으니",
      "저희도 주님을 사랑하며",
      "주님께서 허락하시는 모든 십자가를",
      "기꺼이 지게 하소서.",
    ],
  ),
  (
    "예수님께서 기력이 떨어져 넘어지심을 묵상합시다.",
    [
      "구세주 예수님,",
      "무거운 십자가에 눌려 넘어지시는",
      "고통과 모욕을 당하셨으니",
      "저희가 언제나 주님을 변함없이 섬기며",
      "죄에 떨어지는 일이 없게 하소서.",
    ],
  ),
  (
    "예수님께서 성모님을 만나심을 묵상합시다.",
    [
      "구세주 예수님과 성모 마리아님,",
      "괴로운 십자가의 길에서 서로 만나시어",
      "사무치는 아픔을 겪으셨으니",
      "저희 마음에 사랑을 북돋아 주시어",
      "주님과 성모님을 사랑하는 데에",
      "장애되는 모든 것을 물리치게 하소서.",
    ],
  ),
  (
    "시몬이 예수님을 도와 십자가 짐을 묵상합시다.",
    [
      "구세주 예수님,",
      "시몬이 주님을 도와 십자가를 졌으니",
      "저희도 주님께서 맡겨 주시는 십자가를",
      "날마다 기꺼이 지고 가게 하소서.",
    ],
  ),
  (
    "베로니카, 수건으로 예수님의 얼굴을 닦아 드림을 묵상합시다.",
    [
      "구세주 예수님,",
      "나쁜 무리가 주님의 얼굴에 침을 뱉고",
      "주님을 업신여기며 모욕하였듯이",
      "저희도 죄를 지을 때마다",
      "주님의 얼굴을 더럽히는 것이오니",
      "통회의 눈물로",
      "주님의 얼굴을 씻어 드리게 하소서.",
    ],
  ),
  (
    "기력이 다하신 예수님께서 두 번째 넘어지심을 묵상합시다.",
    [
      "구세주 예수님,",
      "저희를 위하여 두 번째 넘어지시는 고욕을 당하셨으니",
      "주님을 한결같이 섬기지 못하고",
      "다시 죄에 떨어져",
      "주님의 사랑을 저버리는 저희에게 자비를 베푸시어",
      "다시는 세속과 육신의 간교한 유혹에 빠지지 않게 하소서.",
    ],
  ),
  (
    "예수님께서 예루살렘 부인들을 위로하심을 묵상합시다.",
    [
      "구세주 예수님,",
      "저희 죄로 상처를 받으시고",
      "온몸이 헤어지셨으니",
      "저희에게 풍부한 은총을 내리시어",
      "지난날에 지은 모든 죄를 뉘우치며",
      "주님의 품을 찾아들게 하소서.",
    ],
  ),
  (
    "예수님께서 세 번째 넘어지심을 묵상합시다.",
    [
      "구세주 예수님,",
      "무거운 저희 죄에 눌리시어",
      "세 번이나 무참히 넘어지셨으니",
      "그 수난의 공로를 저희에게 나누어 주시어",
      "저희가 이미 지은 죄에서 다시 일어나게 하소서.",
    ],
  ),
  (
    "예수님께서 옷 벗김 당하심을 묵상합시다.",
    [
      "구세주 예수님,",
      "병사들이 난폭하게 주님의 옷을 벗길 때에",
      "살이 묻어나는 극도의 고통을 당하셨으며",
      "죄수로 군중 앞에 서시는 모욕을 당하셨으니",
      "저희가 모든 죄를 벗어 버리게 하소서.",
    ],
  ),
  (
    "예수님께서 십자가에 못 박히심을 묵상합시다.",
    [
      "구세주 예수님,",
      "알몸으로 십자가에 못 박혀 달리셨으니",
      "저희도 주님과 같이",
      "몸과 마음을 희생 제물로 봉헌하게 하소서.",
    ],
  ),
  (
    "예수님께서 십자가 위에서 돌아가심을 묵상합시다.",
    [
      "구세주 예수님,",
      "저희를 위하여 십자가 위에서 숨을 거두셨으니",
      "저희도 십자가에 못 박혀",
      "다시는 저희 자신을 위하여 살지 않고",
      "주님을 위하여 살게 하소서.",
      "구세주 예수님,",
      "혹시라도 영원히 주님을 떠날 불행이 저희에게 닥칠 양이면",
      "차라리 지금 주님과 함께 죽는 행복을 내려 주소서.",
    ],
  ),
  (
    "제자들이 예수님 시신을 십자가에서 내림을 묵상합시다.",
    [
      "구세주 예수님,",
      "주님의 시신을 십자가에서 내려 품에 안으신",
      "성모님의 전구를 들으시어",
      "저희도 성모님 품 안에서",
      "효성스러운 자녀로 살다가",
      "마침내 그 품 안에서 죽게 하소서.",
    ],
  ),
  (
    "예수님께서 무덤에 묻히심을 묵상합시다.",
    [
      "돌무덤에 묻히신 구세주 예수님,",
      "저희가 주님의 죽음을 생각하며",
      "언제나 깨끗한 마음으로 정성을 다하여",
      "사랑의 성체를 받아 모시게 하소서.",
    ],
  ),
];
// dart format on
