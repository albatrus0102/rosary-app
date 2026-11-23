// 번들된 성화(기도 배경·십자가의 길)의 출처 표시. 원자료: docs/ux/ART_REFERENCES.md.
// 기도 배경은 모두 Public domain(PD-Art) 또는 CC0 이라 표시 의무는 없지만 권장 문구를 앱 안에 둔다.
// 십자가의 길은 성당마다 다른 연작(대체 성화)을 쓰고, CC BY 연작은 촬영자·라이선스 링크·변경 여부 표기가 의무다
// (`stations_series.dart`, 원자료 data/stations_series.json).

import '../app/release_gate.dart';
import 'prayer_music_tracks.dart';
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

/// 기도 배경 출처 줄 중 지금 빌드에서 보이는 것(검수용 빌드에서는 [ReleaseGate.hiddenMysteryArtCreditUses] 제외).
List<ArtCredit> get visibleMysteryArtCredits => [
  for (final c in mysteryArtCredits)
    if (ReleaseGate.showAll ||
        !ReleaseGate.hiddenMysteryArtCreditUses.contains(c.use))
      c,
];

/// 십자가의 길 그림 연작 전부(성당별 대체 성화). 출처 화면이 연작마다 작가·촬영자·라이선스·변경 여부를 적는다.
List<StationsSeries> get stationsSeriesCredits => StationsSeriesCatalog.all;

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
    use: '성 베드로 대성전 · 피에타 경당(3D 스캔을 못 읽을 때의 예비 사진)',
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
    use: '성당 안 성모상 3D(우리 본당·당고개·라테라노·성 바오로·밀라노·피렌체·성 베드로의 성모 기도 자리)',
    credit: '성모상 3D: Meshy AI로 생성(CC BY 4.0), 원 그림 사용자 제작. '
        '변경: 삼각형 수를 줄이고(739,044 → 약 36,000) 압축, 흰 대리석 재질을 입힘.',
    license: 'Meshy AI 생성물 · CC BY 4.0(https://creativecommons.org/licenses/by/4.0/)',
  ),
  ArtCredit(
    use: '성당 안 성모상 그림(명동의 한복 성모상 · 3D를 못 읽을 때의 예비)',
    credit: 'AI 생성 성모상(ChatGPT, 사용자 제공) 그림 3점: 흰 돌 성모, 푸른 망토의 원죄 없으신 성모, '
        '한복 차림에 묵주를 든 성모. 실제 조각 작품을 찍은 사진이 아닙니다. 크기를 줄임.',
    license: 'AI 생성 이미지(비상업 앱에서 사용)',
  ),
];

/// 성당 안 성상 3D 스캔(실물 조각을 3D 로 스캔한 모형, `assets/church/scan3d_<키>.js`).
/// 근거: licenses/STATUE_SCANS.md, docs/church/STATUE_SOURCES.md. 스캔의 라이선스와 조각 자체의 저작권은
/// 따로 확인했다(모두 작가 사후 70년이 지난 17~18세기 이전 작품). '대용'은 그 성당의 실제 조각이 아닌 다른 작품이다.
/// CC0·퍼블릭 도메인은 표기 의무가 없지만 박물관 자료라 함께 적는다. CC BY 는 저작자·라이선스 주소·원본 주소·변경을 적는다.
const List<ArtCredit> statueScanCredits = [
  ArtCredit(
    use: '성 베드로 대성전 · 피에타 경당 — 피에타(미켈란젤로)',
    credit: '미켈란젤로 〈피에타〉(1498–99)의 석고 주형 3D 스캔 "Michelangelo, Pietà"(KAS115). '
        '스캔: SMK – Statens Museum for Kunst(덴마크 국립미술관, 왕립 석고 주형 컬렉션). '
        '출처: https://open.smk.dk/artwork/image/KAS115. '
        '변경: 축소·재질 변경(전체 해상도 스캔 삼각형 1,498,118 → 100,000, 흰 대리석 재질을 입힘).',
    license: 'Public domain (Public Domain Mark 1.0, https://creativecommons.org/publicdomain/mark/1.0/)',
  ),
  ArtCredit(
    use: '십자고상(우리 본당 · 피렌체 대성당 · 명동대성당 · 성 바오로 대성전 십자가 경당 · 빛의 성당 십자가 전실) — 그 성당의 실제 십자고상이 아닌 대용',
    credit: '"“Crucified Christ” from St. Jadwiga’s hospital"(채색 목조 십자고상, 비에치 지방 박물관 AH/1273). '
        '스캔: Virtual Museums of Małopolska (Museum of the Biecz Land). '
        '출처: https://sketchfab.com/3d-models/crucified-christ-from-st-jadwigas-hospital-d2404e52b2d144e18f0621903c98c06a. '
        '변경: 축소·재질 변경(삼각형 232,154 → 24,000, 질감을 정점 색으로 바꿈).',
    license: 'CC0 1.0 (https://creativecommons.org/publicdomain/zero/1.0/)',
  ),
  ArtCredit(
    use: '성 베드로 상(라테라노 대성전 신랑 벽감 · 성 바오로 대성전 계단 옆 · 빛의 성당 십자가 전실 사도 벽감) — 대용',
    credit: '"Saint Peter"(17세기 중반 크라쿠프 금박 목조상, 티니에츠 베네딕도회 수도원 박물관 RZ/13/2012). '
        '스캔: Virtual Museums of Małopolska (Museum of the Benedictine Abbey in Tyniec). '
        '출처: https://sketchfab.com/3d-models/saint-peter-9e6b4da152f64fa1b4b0613a57318751. '
        '변경: 축소·재질 변경(삼각형 250,192 → 36,000, 흰 대리석 재질을 입힘).',
    license: 'CC0 1.0 (https://creativecommons.org/publicdomain/zero/1.0/)',
  ),
  ArtCredit(
    use: '성 바오로 상(라테라노 대성전 신랑 벽감 · 성 바오로 대성전 계단 옆 · 빛의 성당 십자가 전실 사도 벽감) — 대용',
    credit: '"Saint Paul the Apostle"(17세기 중반 크라쿠프 금박 목조상, 티니에츠 베네딕도회 수도원 박물관 RZ/12/2012). '
        '스캔: Virtual Museums of Małopolska (Museum of the Benedictine Abbey in Tyniec). '
        '출처: https://sketchfab.com/3d-models/saint-paul-the-apostle-2195c3c0b9a140628e938ddb146d00ca. '
        '변경: 축소·재질 변경(삼각형 249,784 → 36,000, 흰 대리석 재질을 입힘).',
    license: 'CC0 1.0 (https://creativecommons.org/publicdomain/zero/1.0/)',
  ),
  ArtCredit(
    use: '천사상(명동대성당 주제대 양옆) — 대용',
    credit: '"Engel"(마리아 란첸도르프 갈바리아의 천사 석상, 18세기 초, 오스트리아). '
        '스캔: noe-3d.at. '
        '출처: https://sketchfab.com/3d-models/engel-668dcbf72a7243e491f540a6a575213b. '
        '변경: 축소·재질 변경(삼각형 453,628 → 30,000, 흰 대리석 재질을 입힘, 오른쪽 상은 좌우를 뒤집음).',
    license: 'CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/)',
  ),
  // 빛의 성당(앱이 지은 가상의 성당) — 2026-11-24. 근거: docs/church/STATUE_SOURCES.md §10, 묶음 assets/church/light/scan3d_<키>.js
  ArtCredit(
    use: '빛의 성당(가상) 메달 홀 금빛 벽감의 성모자상 — 크루즐로바의 성모(실물 스캔, 가상 성당에 모신 것)',
    credit: '"Madonna of Krużlowa"(크루즐로바의 성모, 1410년경 채색 목조, 아름다운 양식). '
        '스캔: Virtual Museums of Małopolska. '
        '출처: https://sketchfab.com/3d-models/597d14d7e6ec46a8a0becdf57dd6dbec. '
        '변경: 축소·재질 변경(삼각형 564,120 → 26,000, 질감을 정점 색으로 바꿈, 진열장은 뺌).',
    license: 'CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/)',
  ),
  ArtCredit(
    use: '빛의 성당(가상) 제단 양옆 경배 천사 2(오른쪽은 좌우 반전) — 대용',
    credit: '"Engel"(슈트론스도르프 흑사병 기둥의 무릎 꿇은 천사 석상, 1826, 오스트리아). '
        '스캔: noe-3d.at. '
        '출처: https://sketchfab.com/3d-models/4da4a29f59e142af86b8fbdc7aff818c. '
        '변경: 축소·재질 변경(삼각형 567,806 → 36,000, 흰 대리석 재질을 입힘).',
    license: 'CC BY-NC 4.0 (https://creativecommons.org/licenses/by-nc/4.0/)',
  ),
  ArtCredit(
    use: '빛의 성당(가상) 십자가 전실 사도 벽감 — 사도 유다 타대오 상(대용)',
    credit: '"Hl. Judas Thaddäus"(사도 유다 타대오 석상, 18세기 전반, 클라인슈바인바르트). '
        '스캔: noe-3d.at. '
        '출처: https://sketchfab.com/3d-models/2cb9b7c61cea469b9628d62c9fe289aa. '
        '변경: 축소·재질 변경(삼각형 594,962 → 36,000, 흰 대리석 재질을 입힘).',
    license: 'CC BY-NC 4.0 (https://creativecommons.org/licenses/by-nc/4.0/)',
  ),
  ArtCredit(
    use: '빛의 성당(가상) 십자가 전실 사도 벽감 — 앉은 사도상(대용)',
    credit: '"Nürnberger Tonapostel, um 1420 / Pl.O.234"(뉘른베르크 점토 사도상, 1420년경). '
        '스캔: Germanisches Nationalmuseum. '
        '출처: https://sketchfab.com/3d-models/418484f48ef14723865d76dcbcad45fb. '
        '변경: 축소·재질 변경(삼각형 630,083 → 26,000, 질감을 정점 색으로 바꿈).',
    license: 'CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/)',
  ),
];

/// 기도 배경 성가(오르간)의 출처. 곡 목록: `prayer_music_tracks.dart`, 근거: licenses/MUSIC.md.
List<ArtCredit> get musicCredits => [
  for (final t in prayerMusicTracks)
    ArtCredit(
      use: t.title,
      credit: '${t.credit}. 출처: ${t.source}',
      license: t.license,
    ),
];
