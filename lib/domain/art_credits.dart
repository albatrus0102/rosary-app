// 번들된 성화(기도 배경·십자가의 길)의 출처 표시. 원자료: docs/ux/ART_REFERENCES.md.
// 기도 배경은 모두 Public domain(PD-Art) 또는 CC0 이라 표시 의무는 없지만 권장 문구를 앱 안에 둔다.
// 십자가의 길은 성당마다 다른 연작(대체 성화)을 쓰고, CC BY 연작은 촬영자·라이선스 링크·변경 여부 표기가 의무다
// (`stations_series.dart`, 원자료 data/stations_series.json).

import 'stations_of_cross.dart';
import 'stations_series.dart';

/// 그림 한 점의 출처 표시.
class ArtCredit {
  const ArtCredit({
    required this.use,
    required this.credit,
    required this.license,
  });

  /// 앱 안에서 쓰는 곳. 예: '환희 1단 배경'.
  final String use;

  /// 작가·작품·연대·소장처·출처.
  final String credit;

  /// 'Public domain' 또는 'CC0 1.0'.
  final String license;
}

const _pd = 'Public domain (PD-Art)';
const _cc0 = 'CC0 1.0';

/// 기도 화면 배경(고통의 신비 3·4·5단은 십자가의 길 그림을 쓴다).
const List<ArtCredit> mysteryArtCredits = [
  ArtCredit(
    use: '환희 1단',
    credit: '프라 안젤리코, 〈수태고지〉, 1440–50년경. 피렌체 산 마르코 미술관. Wikimedia Commons',
    license: _pd,
  ),
  ArtCredit(
    use: '환희 2단',
    credit: '마리오토 알베르티넬리, 〈방문〉, 1503. 피렌체 우피치 미술관. Wikimedia Commons',
    license: _pd,
  ),
  ArtCredit(
    use: '환희 3단',
    credit:
        '헤라르트 판 혼트호르스트, 〈목자들의 경배〉, 1622. 쾰른 발라프 리하르츠 미술관. Wikimedia Commons',
    license: _pd,
  ),
  ArtCredit(
    use: '환희 4단',
    credit: '프라 안젤리코, 〈성전 봉헌〉, 1440–42년경. 피렌체 산 마르코 미술관. Wikimedia Commons',
    license: _pd,
  ),
  ArtCredit(
    use: '환희 5단',
    credit: '윌리엄 홀먼 헌트, 〈성전에서 구세주를 찾음〉, 1854–60. 버밍엄 미술관. Wikimedia Commons',
    license: _pd,
  ),
  ArtCredit(
    use: '빛 1단',
    credit: '안드레아 델 베로키오·레오나르도 다 빈치, 〈그리스도의 세례〉, 1470–75년경. 피렌체 우피치 미술관. Wikimedia Commons',
    license: _pd,
  ),
  ArtCredit(
    use: '빛 2단',
    credit: '후안 데 플란데스, 〈카나의 혼인 잔치〉, 1500–04년경. 뉴욕 메트로폴리탄 미술관(The Metropolitan Museum of Art)',
    license: _cc0,
  ),
  ArtCredit(
    use: '빛 3단',
    credit: '카를 블로크, 〈산상 설교〉, 1877. 덴마크 프레데릭스보르 성 국립역사박물관. Wikimedia Commons',
    license: _pd,
  ),
  ArtCredit(
    use: '빛 4단',
    credit: '라파엘로, 〈거룩한 변모〉, 1516–20. 바티칸 미술관(피나코테카). Wikimedia Commons',
    license: _pd,
  ),
  ArtCredit(
    use: '빛 5단',
    credit: '디르크 바우츠, 〈최후의 만찬〉, 1464–68. 루뱅 성 베드로 성당(M 루뱅 박물관 관리). Wikimedia Commons',
    license: _pd,
  ),
  ArtCredit(
    use: '고통 1단',
    credit: '하인리히 호프만, 〈겟세마니의 그리스도〉, 1886(1890년 설도 있음). 뉴욕 리버사이드 교회. Wikimedia Commons',
    license: _pd,
  ),
  ArtCredit(
    use: '고통 2단',
    credit: '카라바조, 〈그리스도의 채찍질〉, 1607. 나폴리 카포디몬테 미술관. Wikimedia Commons',
    license: _pd,
  ),
  ArtCredit(
    use: '고통 3·4·5단',
    credit: '십자가의 길 1·2·12처 그림(아래 십자가의 길 출처와 같다)',
    license: _pd,
  ),
  ArtCredit(
    use: '영광 1단',
    credit: '피에로 델라 프란체스카, 〈부활〉, 1463–65년경. 산세폴크로 시립 미술관. Wikimedia Commons',
    license: _pd,
  ),
  ArtCredit(
    use: '영광 2단',
    credit: '렘브란트, 〈승천〉, 1636. 뮌헨 알테 피나코테크. Wikimedia Commons',
    license: _pd,
  ),
  ArtCredit(
    use: '영광 3단',
    credit: '엘 그레코, 〈성령 강림〉, 1600년경. 마드리드 프라도 미술관. Wikimedia Commons',
    license: _pd,
  ),
  ArtCredit(
    use: '영광 4단',
    credit: '티치아노, 〈성모 승천〉, 1516–18. 베네치아 프라리 성당. Wikimedia Commons',
    license: _pd,
  ),
  ArtCredit(
    use: '영광 5단',
    credit: '디에고 벨라스케스, 〈성모 대관〉, 1635–36. 마드리드 프라도 미술관. Wikimedia Commons',
    license: _pd,
  ),
];

/// 십자가의 길 그림 연작 전부(성당별 대체 성화). 출처 화면이 연작마다 작가·촬영자·라이선스·변경 여부를 적는다.
const List<StationsSeries> stationsSeriesCredits = StationsSeriesCatalog.all;

/// 기본 연작(푸겔): 성당 밖 묵상 시트·고통의 신비 3·4·5단 배경.
const ArtCredit stationsArtCredit = ArtCredit(
  use: '십자가의 길 14처(기본 연작)',
  credit: StationsOfCross.artCredit,
  license: 'Public domain',
);

/// 성당 안에 걸린 진본 성화(가상 성당의 그 자리에 실제로 모셔진 작품의 사진).
const List<ArtCredit> churchArtCredits = [
  ArtCredit(
    use: '성 마리아 마조레 대성전 · 파올리나 경당의 성화',
    credit: '〈로마 백성의 구원(Salus Populi Romani)〉, 작가 미상, 7~13세기, 산타 마리아 마조레 대성전(로마). '
        '사진: Wikimedia Commons "Salus Populi Romani after restoration.jpg" (LossRom). '
        '여백을 잘라 내고 크기를 줄임.',
    license: 'Public domain(원작) · CC0 1.0(사진)',
  ),
  ArtCredit(
    use: '피렌체 대성당 · 북 측랑 벽 그림',
    credit: '안드레아 델 카스타뇨 〈니콜로 다 톨렌티노 기마 기념상〉(1456). '
        '사진: Wikimedia Commons "Andrea del castagno, momumento a niccolò da tolentino.jpg" (Web Gallery of Art). '
        '틀에 맞게 잘라 크기를 줄임.',
    license: 'Public domain',
  ),
  ArtCredit(
    use: '피렌체 대성당 · 북 측랑 벽 그림',
    credit: '파올로 우첼로 〈존 호크우드 기마 기념상〉(1436). '
        '사진: Sailko, Wikimedia Commons "Paolo uccello, Monumento equestre di John Hawkwood, 1436, 01-edit.jpg". '
        '틀에 맞게 잘라 크기를 줄임.',
    license: 'Public domain(원작) · CC BY 3.0(사진)',
  ),
  ArtCredit(
    use: '피렌체 대성당 · 북 측랑 벽 그림',
    credit: '도메니코 디 미켈리노 〈단테와 신곡〉(1465). '
        '사진: Jastrow, Wikimedia Commons "Dante Domenico di Michelino Duomo Florence.jpg". '
        '틀에 맞게 잘라 크기를 줄임.',
    license: 'Public domain',
  ),
  ArtCredit(
    use: '성당 안 성모상(우리 본당·명동·당고개·라테라노·성 바오로·밀라노·피렌체의 성모 기도 자리)',
    credit: 'AI 생성 성모상(ChatGPT, 사용자 제공) 그림 3점: 흰 돌 성모, 푸른 망토의 원죄 없으신 성모, '
        '한복 차림에 묵주를 든 성모. 실제 조각 작품을 찍은 사진이 아닙니다. 크기를 줄임.',
    license: 'AI 생성 이미지(비상업 앱에서 사용)',
  ),
];
