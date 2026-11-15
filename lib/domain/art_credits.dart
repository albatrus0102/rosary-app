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
        '사진: Sailko, Wikimedia Commons "Andrea del castagno, Monumento equestre di Niccolò da Tolentino, 1456, 01.JPG" '
        '(https://commons.wikimedia.org/wiki/File:Andrea_del_castagno,_Monumento_equestre_di_Niccol%C3%B2_da_Tolentino,_1456,_01.JPG). '
        '변경: 원근 보정, 틀에 맞게 자르기, 밝기 보정, 크기 줄임.',
    license: 'Public domain(원작) · CC BY 3.0(사진, https://creativecommons.org/licenses/by/3.0/)',
  ),
  ArtCredit(
    use: '피렌체 대성당 · 북 측랑 벽 그림',
    credit: '파올로 우첼로 〈존 호크우드 기마 기념상〉(1436). '
        '사진: Sailko(편집본 올린이 MenkinAlRire), Wikimedia Commons "Paolo uccello, Monumento equestre di John Hawkwood, 1436, 01-edit.jpg" '
        '(https://commons.wikimedia.org/wiki/File:Paolo_uccello,_Monumento_equestre_di_John_Hawkwood,_1436,_01-edit.jpg). '
        '변경: 틀에 맞게 자르기, 크기 줄임.',
    license: 'Public domain(원작) · CC BY 3.0(사진, https://creativecommons.org/licenses/by/3.0/)',
  ),
  ArtCredit(
    use: '피렌체 대성당 · 북 측랑 벽 그림',
    credit: '도메니코 디 미켈리노 〈단테와 신곡〉(1465). '
        '사진: 촬영자 미상, Wikimedia Commons "Dante Domenico di Michelino.jpg" '
        '(https://commons.wikimedia.org/wiki/File:Dante_Domenico_di_Michelino.jpg). '
        '변경: 틀 안쪽만 자르기, 크기 줄임.',
    license: 'Public domain (PD-Art)',
  ),
  ArtCredit(
    use: '성 밖 성 바오로 대성전 · 후진 반돔 모자이크',
    credit: '후진 모자이크 〈옥좌의 그리스도와 사도들〉(13세기, 19세기 복원). '
        '사진: Alberto Fernandez Fernandez(색 보정본 올린이 Amandajm), Wikimedia Commons '
        '"Apse mosaic Basilica of St Paul Outside the Walls.jpg" '
        '(https://commons.wikimedia.org/wiki/File:Apse_mosaic_Basilica_of_St_Paul_Outside_the_Walls.jpg). '
        '변경: 반돔 곡면에 맞게 원근을 다시 폄, 사진에 없는 가장자리는 금 바탕으로 채우고 아래 귀퉁이는 좌우 대칭으로 이음, 크기 줄임.',
    license: 'Public domain(원작) · CC BY 2.5(사진, https://creativecommons.org/licenses/by/2.5/)',
  ),
  ArtCredit(
    use: '성 밖 성 바오로 대성전 · 콘페시오(사도 바오로의 무덤)',
    credit: '사도 바오로의 무덤 창살과 석관 자리. '
        '사진: StPaul.jpg(Commons 사용자), Wikimedia Commons "St. Paul\'s Tomb.jpg" '
        '(https://commons.wikimedia.org/wiki/File:St._Paul%27s_Tomb.jpg). '
        '변경: 창살 벽과 유리 바닥으로 나누어 자르기, 바닥은 원근 보정, 크기 줄임.',
    license: 'CC BY 4.0(https://creativecommons.org/licenses/by/4.0/)',
  ),
  ArtCredit(
    use: '성 베드로 대성전 · 피에타 경당',
    credit: '미켈란젤로 〈피에타〉(1498–99). '
        '사진: Gary Todd, Wikimedia Commons "Michelangelo\'s Pieta, St. Peter\'s Basilica, Vatican City (48466681337).jpg" '
        '(https://commons.wikimedia.org/wiki/File:Michelangelo%27s_Pieta,_St._Peter%27s_Basilica,_Vatican_City_(48466681337).jpg). '
        '변경: 자르기, 가장자리를 어둡게, 크기 줄임.',
    license: 'Public domain(원작) · Public Domain Mark 1.0(사진)',
  ),
  ArtCredit(
    use: '성 베드로 대성전 · 성 베드로 청동 좌상',
    credit: '성 베드로 청동 좌상(13세기, 아르놀포 디 캄비오 작으로 전함). '
        '사진: Gary Todd, Wikimedia Commons "St. Peter\'s Basilica, Bronze Statue of St. Peter (48466478846).jpg" '
        '(https://commons.wikimedia.org/wiki/File:St._Peter%27s_Basilica,_Bronze_Statue_of_St._Peter_(48466478846).jpg). '
        '변경: 자르기, 크기 줄임.',
    license: 'Public domain(원작) · Public Domain Mark 1.0(사진)',
  ),
  ArtCredit(
    use: '성당 안 성모상(우리 본당·명동·당고개·라테라노·성 바오로·밀라노·피렌체의 성모 기도 자리)',
    credit: 'AI 생성 성모상(ChatGPT, 사용자 제공) 그림 3점: 흰 돌 성모, 푸른 망토의 원죄 없으신 성모, '
        '한복 차림에 묵주를 든 성모. 실제 조각 작품을 찍은 사진이 아닙니다. 크기를 줄임.',
    license: 'AI 생성 이미지(비상업 앱에서 사용)',
  ),
];
