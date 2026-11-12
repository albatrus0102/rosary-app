# 성화 참고 자료 — 묵주기도 신비 20점 · 십자가의 길 14처

작성일: 2026-11-12 · 범위: 조사와 자산 수집만 했다. 코드, `pubspec.yaml`, `lib/`, `assets/church/`는 건드리지 않았다.

## 1. 요약

- **묵주기도 신비 배경 20점**: `assets/images/mystery_<set>_<n>.jpg` (set = joyful·luminous·sorrowful·glorious, n = 1~5). 긴 변 1280px, JPEG 품질 72(2점은 64·68), 한 장 110KB 이하.
- **십자가의 길 14처**: `assets/images/station_01.jpg` ~ `station_14.jpg`. 긴 변 1000px, JPEG 품질 80(1점은 76), 한 장 150KB 이하. **한 화가의 한 연작**이라 화풍이 일정하다.
- 34점 합계 **3.91MB(3908956바이트)**. `assets/images/`는 `pubspec.yaml`에 이미 등록되어 있어 따로 등록할 것이 없다.
- 라이선스: 34점 가운데 32점은 Wikimedia Commons에서 **Public domain**으로 표시된 작품(작가 사후 70년 이상 지난 그림을 그대로 찍은 사진), 2점(빛 2단, 고통 4단)은 메트로폴리탄 미술관 오픈 액세스 **CC0**. CC BY 항목은 없어서 **의무 표시 문구는 없다**. 아래 '표시 문구'는 앱의 라이선스 화면에 넣기를 권하는 문구다.
- 모든 항목은 2026-11-12에 Commons API(`action=query&prop=imageinfo&iiprop=url|extmetadata|size`)의 `LicenseShortName`으로 확인했다. 메트로폴리탄 소장품은 미술관 API의 `isPublicDomain: true`도 확인했다(고통 4단, 소장품 번호 459087).

### 가공 내역
- 액자, 벽, 흰 모서리, 그려진 틀을 잘라냈다. 가로로 긴 원화 3점(환희 1·3·5단)은 주요 인물 쪽으로 잘랐다.
- 110KB 한도를 맞추려고 세부가 많은 그림은 **약하게 흐리게 처리**(가우시안 반경 0.6~2.1px)했다. 화면에서 어둡게·흐리게 깔리는 배경용이므로 그림을 선명하게 크게 보여 주는 용도로는 쓰지 말 것. 그런 용도는 `docs/ux/art_src/`의 원본이나 표의 원본 주소에서 다시 만든다.
- Wikimedia가 원본 파일 내려받기를 요청 수로 제한하고 있어, 대부분 Commons의 **표준 축소본(960·1280·1920px)**을 받아 가공했다. `docs/ux/art_src/`에 있는 33개 파일(약 16MB)이 그 축소본이다. 고통 4단만 미술관 원본(1.9MB)이라 보관하지 않았다.
- 초점 x/y는 **최종 파일 기준 비율**(왼쪽 위가 0/0)이다. Flutter에서는 `Alignment(x*2-1, y*2-1)`로 바꿔 `BoxFit.cover`와 함께 쓰면 된다.
- 밝기 숫자는 그림 전체의 평균 밝기(0~255)다. 100을 넘는 그림은 어둡게 덮는 막을 더 진하게 써야 흰 글자가 읽힌다.

### 알아 둘 위험
1. **PD-Art 전제**: 평면 그림을 그대로 찍은 사진에는 새 저작권이 생기지 않는다는 판단(미국 Bridgeman 대 Corel 판결, EU 저작권 지침 2019/790 제14조)에 기대고 있다. 한국에서도 통설은 같지만 판례가 뚜렷하지는 않다. 위험은 낮다.
2. **푸겔 십자가의 길(1921)**: 화가 게프하르트 푸겔은 1939년에 죽어 한국·EU 기준(사후 70년)으로는 2010년부터 퍼블릭 도메인이다. 미국 기준은 1931년 이전 공표 여부에 달려 있는데, Commons는 퍼블릭 도메인으로 분류한다. 위험은 낮다고 본다.
3. **호프만 '겟세마니의 그리스도'**: 제작 연도가 Commons에는 1886, 다른 자료에는 1890으로 나온다. 화가는 1911년에 죽어 어느 쪽이든 퍼블릭 도메인이다.
4. 이탈리아 문화재법은 국가 소장품 사진의 상업적 이용에 사용료를 요구할 수 있다고 한다(우피치, 산 마르코, 카포디몬테 소장품 해당). 저작권 문제는 아니고 한국 앱에 실제로 적용될 가능성은 낮지만, 유료 기능에 이 그림들을 전면에 내세운다면 한 번 확인할 것.

## 2. 묵주기도 신비 20점

| id | 신비 | 작품 · 작가 · 연대 · 소장 | 라이선스 | 출처(파일 설명 페이지) | 표시 문구(권장) | 파일 · 크기 | 초점 x/y | 색조 · 배경 적합성 |
|---|---|---|---|---|---|---|---|---|
| joyful_1 | 환희 1단 · 마리아께서 예수님을 잉태하심 | 수태고지 (산 마르코 수도원 북쪽 복도 프레스코) · 프라 안젤리코 · 1440–50년경 · 피렌체 산 마르코 미술관 | Public domain (PD-Art / PD-old-100) | https://commons.wikimedia.org/wiki/File:Fra_Angelico_-_Annunciation.jpg | 프라 안젤리코, 〈수태고지〉, 1440–50년경. 피렌체 산 마르코 미술관. Public domain, Wikimedia Commons | `mystery_joyful_1.jpg` · 1280×1122 · 99KB | 0.78/0.38 | 밝은 상아·분홍·남색. 밝은 편(평균 밝기 127/255)이라 어둡게 덮는 막을 55% 이상 권장. 가로형(1280×1122)이므로 세로 화면에서는 한 인물만 보임 → 성모님 쪽으로 맞춤 |
| joyful_2 | 환희 2단 · 마리아께서 엘리사벳을 찾아보심 | 방문 · 마리오토 알베르티넬리 · 1503 · 피렌체 우피치 미술관 | Public domain (PD-Art / PD-old-100) | https://commons.wikimedia.org/wiki/File:Albertinelli_-_Visitazione_(nella_predella_Episodi_dell%E2%80%99Infanzia_di_Cristo),_1503,_1890_n.1587_(cropped).jpg | 마리오토 알베르티넬리, 〈방문〉, 1503. 피렌체 우피치 미술관. Public domain, Wikimedia Commons | `mystery_joyful_2.jpg` · 808×1280 · 100KB | 0.50/0.30 | 짙은 남색·주황·검은 아치. 중앙 구도, 배경으로 매우 적합 |
| joyful_3 | 환희 3단 · 마리아께서 예수님을 낳으심 | 목자들의 경배 · 헤라르트 판 혼트호르스트 · 1622 · 쾰른 발라프 리하르츠 미술관 | Public domain (PD-Art / PD-old-100) | https://commons.wikimedia.org/wiki/File:Gerard_van_Honthorst_-_Adoration_of_the_Shepherds_(1622).jpg | 헤라르트 판 혼트호르스트, 〈목자들의 경배〉, 1622. 쾰른 발라프 리하르츠 미술관. Public domain, Wikimedia Commons | `mystery_joyful_3.jpg` · 1133×1280 · 103KB | 0.62/0.55 | 어두운 갈색 바탕에 아기 예수님에게서 나오는 빛. 어두운 편(46)으로 글자 가독성 좋음 |
| joyful_4 | 환희 4단 · 마리아께서 예수님을 성전에 바치심 | 성전 봉헌 (산 마르코 수도원 10번 방 프레스코) · 프라 안젤리코 · 1440–42년경 · 피렌체 산 마르코 미술관 | Public domain (PD-Art / PD-old-100) | https://commons.wikimedia.org/wiki/File:Presentation_of_Jesus_at_the_Temple_by_Fra_Angelico_(San_Marco_Cell_10).jpg | 프라 안젤리코, 〈성전 봉헌〉, 1440–42년경. 피렌체 산 마르코 미술관. Public domain, Wikimedia Commons | `mystery_joyful_4.jpg` · 1280×1272 · 106KB | 0.62/0.22 | 황토·노랑·녹색. 밝고 노란 기가 강함(112) → 어둡게 덮는 막 55% 이상. 거의 정사각형. 오른쪽 끝 인물은 원화에서도 가장자리에 붙어 있음 |
| joyful_5 | 환희 5단 · 마리아께서 잃으셨던 예수님을 성전에서 찾으심 | 성전에서 구세주를 찾음 (오른쪽 성가정 부분) · 윌리엄 홀먼 헌트 · 1854–60 · 버밍엄 미술관 | Public domain (PD-Art / PD-old-100) | https://commons.wikimedia.org/wiki/File:William_Holman_Hunt_-_The_Finding_of_the_Saviour_in_the_Temple.jpg | 윌리엄 홀먼 헌트, 〈성전에서 구세주를 찾음〉, 1854–60. 버밍엄 미술관. Public domain, Wikimedia Commons | `mystery_joyful_5.jpg` · 870×1280 · 101KB | 0.42/0.36 | 파랑·보라·금색, 세부가 매우 많음(복잡) → 흐림 효과 권장. 왼쪽의 율법 학자 무리는 잘라냄 |
| luminous_1 | 빛 1단 · 예수님께서 세례받으심 | 그리스도의 세례 · 안드레아 델 베로키오·레오나르도 다 빈치 · 1470–75년경 · 피렌체 우피치 미술관 | Public domain (PD-Art / PD-old-100) | https://commons.wikimedia.org/wiki/File:Baptism_of_Christ_by_Andrea_del_Verrocchio.jpg | 안드레아 델 베로키오·레오나르도 다 빈치, 〈그리스도의 세례〉, 1470–75년경. 피렌체 우피치 미술관. Public domain, Wikimedia Commons | `mystery_luminous_1.jpg` · 977×1280 · 100KB | 0.50/0.33 | 갈색·하늘색·살구색. 중간 밝기(104), 중앙 구도 |
| luminous_2 | 빛 2단 · 예수님께서 카나에서 첫 기적을 행하심 | 카나의 혼인 잔치 · 후안 데 플란데스 · 1500–04년경 · 뉴욕 메트로폴리탄 미술관 | CC0 1.0 (https://creativecommons.org/publicdomain/zero/1.0/) | https://commons.wikimedia.org/wiki/File:The_Marriage_Feast_at_Cana_MET_DT1459.jpg | 후안 데 플란데스, 〈카나의 혼인 잔치〉, 1500–04년경. 뉴욕 메트로폴리탄 미술관. CC0, The Metropolitan Museum of Art | `mystery_luminous_2.jpg` · 939×1280 · 102KB | 0.33/0.52 | 따뜻한 황토·흰 식탁보·돌항아리. 차분한 구도, 다소 밝음(112) |
| luminous_3 | 빛 3단 · 예수님께서 하느님 나라를 선포하심 | 산상 설교 · 카를 블로크 · 1877 · 덴마크 프레데릭스보르 성 국립역사박물관 | Public domain (PD-Art / PD-old-100) | https://commons.wikimedia.org/wiki/File:Bloch-SermonOnTheMount.jpg | 카를 블로크, 〈산상 설교〉, 1877. 덴마크 프레데릭스보르 성 국립역사박물관. Public domain, Wikimedia Commons | `mystery_luminous_3.jpg` · 951×1280 · 105KB | 0.62/0.27 | 밝은 하늘·붉은 겉옷·회색 바위. 위쪽 하늘이 밝음(115) → 위쪽에 놓이는 글자는 덮는 막 필요 |
| luminous_4 | 빛 4단 · 예수님께서 거룩하게 변모하심 | 거룩한 변모 · 라파엘로 · 1516–20 · 바티칸 미술관(피나코테카) | Public domain (PD-Art / PD-old-100) | https://commons.wikimedia.org/wiki/File:Raphael_-_The_Transfiguration_-_Google_Art_Project.jpg | 라파엘로, 〈거룩한 변모〉, 1516–20. 바티칸 미술관(피나코테카). Public domain, Wikimedia Commons | `mystery_luminous_4.jpg` · 884×1280 · 105KB | 0.50/0.13 | 위쪽은 푸른빛 속 그리스도, 아래쪽은 붉고 어두운 군중(복잡). 초점은 위쪽 1/5 지점 |
| luminous_5 | 빛 5단 · 예수님께서 성체성사를 세우심 | 최후의 만찬 (성체 제대화 중앙 패널) · 디르크 바우츠 · 1464–68 · 루뱅 성 베드로 성당(M 루뱅 박물관 관리) | Public domain (PD-Art / PD-old-100) | https://commons.wikimedia.org/wiki/File:Dieric_Bouts_-_The_Last_Supper.jpg | 디르크 바우츠, 〈최후의 만찬〉, 1464–68. 루뱅 성 베드로 성당(M 루뱅 박물관 관리). Public domain, Wikimedia Commons | `mystery_luminous_5.jpg` · 1064×1280 · 100KB | 0.50/0.45 | 회색 실내·흰 식탁·붉은 옷. 세부가 많지만 대칭 구도라 안정적 |
| sorrowful_1 | 고통 1단 · 예수님께서 우리를 위하여 피땀 흘리심 | 겟세마니의 그리스도 · 하인리히 호프만 · 1886 (1890년 설도 있음) · 뉴욕 리버사이드 교회 | Public domain (PD-Art / PD-old-100) | https://commons.wikimedia.org/wiki/File:Christ_in_Gethsemane.jpg | 하인리히 호프만, 〈겟세마니의 그리스도〉, 1886 (1890년 설도 있음). 뉴욕 리버사이드 교회. Public domain, Wikimedia Commons | `mystery_sorrowful_1.jpg` · 894×1280 · 98KB | 0.45/0.33 | 짙은 청록·검정에 얼굴 주위의 빛. 어두움(48) — 배경으로 가장 적합한 축. 1945년 인쇄본을 스캔한 것이라 약간 거침 |
| sorrowful_2 | 고통 2단 · 예수님께서 우리를 위하여 매 맞으심 | 그리스도의 채찍질 · 카라바조 · 1607 · 나폴리 카포디몬테 미술관 | Public domain (PD-Art / PD-old-100) | https://commons.wikimedia.org/wiki/File:Caravaggio_-_La_Flagellazione_di_Cristo.jpg | 카라바조, 〈그리스도의 채찍질〉, 1607. 나폴리 카포디몬테 미술관. Public domain, Wikimedia Commons | `mystery_sorrowful_2.jpg` · 939×1280 · 84KB | 0.52/0.38 | 거의 검은 바탕에 밝은 몸(36). 매우 어두워 글자 가독성 좋음. 장면이 강렬하므로 어린이용 화면에서는 흐림을 강하게 |
| sorrowful_3 | 고통 3단 · 예수님께서 우리를 위하여 가시관 쓰심 | 가시관을 쓰신 그리스도 · 티치아노 · 1542–43 · 파리 루브르 박물관 | Public domain (PD-Art / PD-old-100) | https://commons.wikimedia.org/wiki/File:Titian_-_Christ_crowned_with_Thorns_-_Louvre.jpg | 티치아노, 〈가시관을 쓰신 그리스도〉, 1542–43. 파리 루브르 박물관. Public domain, Wikimedia Commons | `mystery_sorrowful_3.jpg` · 735×1280 · 102KB | 0.42/0.50 | 적갈색·살구색, 움직임이 많아 복잡함 → 흐림 권장. 위쪽에 티베리우스 흉상과 글자(TIBERIVS)가 있음(원화의 일부) |
| sorrowful_4 | 고통 4단 · 예수님께서 우리를 위하여 십자가 지심 | 십자가를 지신 그리스도 · 엘 그레코 · 1577–87년경 · 뉴욕 메트로폴리탄 미술관 (로버트 리먼 컬렉션) | CC0 1.0 (https://creativecommons.org/publicdomain/zero/1.0/) | https://commons.wikimedia.org/wiki/File:Christ_Carrying_the_Cross_MET_DP347226.jpg | 엘 그레코, 〈십자가를 지신 그리스도〉, 1577–87년경. 뉴욕 메트로폴리탄 미술관 (로버트 리먼 컬렉션). CC0, The Metropolitan Museum of Art | `mystery_sorrowful_4.jpg` · 907×1280 · 79KB | 0.38/0.27 | 어두운 청회색 하늘·남색·진홍(41). 단독 인물이라 배경으로 매우 적합 |
| sorrowful_5 | 고통 5단 · 예수님께서 우리를 위하여 십자가에 못 박혀 돌아가심 | 십자가에 못 박히신 그리스도 · 디에고 벨라스케스 · 1632년경 · 마드리드 프라도 미술관 | Public domain (PD-Art / PD-old-100) | https://commons.wikimedia.org/wiki/File:Cristo_crucificado.jpg | 디에고 벨라스케스, 〈십자가에 못 박히신 그리스도〉, 1632년경. 마드리드 프라도 미술관. Public domain, Wikimedia Commons | `mystery_sorrowful_5.jpg` · 841×1280 · 78KB | 0.50/0.22 | 검녹색 바탕에 밝은 몸(52). 단순하고 고요해 배경으로 가장 적합. 맨 위 죄목 패(글자)는 원화의 일부 |
| glorious_1 | 영광 1단 · 예수님께서 부활하심 | 부활 (프레스코, 그려진 틀은 잘라냄) · 피에로 델라 프란체스카 · 1463–65년경 · 산세폴크로 시립 미술관 | Public domain (PD-Art / PD-old-100) | https://commons.wikimedia.org/wiki/File:Piero_della_Francesca_-_Resurrection_-_WGA17609.jpg | 피에로 델라 프란체스카, 〈부활〉, 1463–65년경. 산세폴크로 시립 미술관. Public domain, Wikimedia Commons | `mystery_glorious_1.jpg` · 1058×1280 · 104KB | 0.50/0.42 | 분홍 옷·회녹색 풍경, 중간 밝기(107). 원본 해상도가 낮아(960px) 확대됨 — 흐린 배경용으로만 적합 |
| glorious_2 | 영광 2단 · 예수님께서 승천하심 | 승천 (아치형 윗부분의 흰 모서리는 잘라냄) · 렘브란트 · 1636 · 뮌헨 알테 피나코테크 | Public domain (PD-Art / PD-old-100) | https://commons.wikimedia.org/wiki/File:Rembrandt_The_Ascension_1636_Oil_on_canvas_Alte_Pinakothek_Munich_Germany.jpg | 렘브란트, 〈승천〉, 1636. 뮌헨 알테 피나코테크. Public domain, Wikimedia Commons | `mystery_glorious_2.jpg` · 692×1280 · 97KB | 0.50/0.33 | 어두운 갈색 속 금빛 중앙(71). 배경으로 매우 적합 |
| glorious_3 | 영광 3단 · 예수님께서 성령을 보내심 | 성령 강림 · 엘 그레코 · 1600년경 · 마드리드 프라도 미술관 | Public domain (PD-Art / PD-old-100) | https://commons.wikimedia.org/wiki/File:Pentecost%C3%A9s_(El_Greco,_c._1600)_Prado.jpg | 엘 그레코, 〈성령 강림〉, 1600년경. 마드리드 프라도 미술관. Public domain, Wikimedia Commons | `mystery_glorious_3.jpg` · 533×1280 · 102KB | 0.50/0.36 | 회청색 바탕에 노랑·초록·파랑·빨강 옷. 아주 길쭉한 세로형(533×1280) — 세로 화면에 잘 맞음. 색이 강하므로 채도를 낮추는 것을 권장 |
| glorious_4 | 영광 4단 · 예수님께서 마리아를 하늘에 불러올리심 | 성모 승천 (아순타; 제단 틀은 잘라냄) · 티치아노 · 1516–18 · 베네치아 프라리 성당 | Public domain (PD-Art / PD-old-100) | https://commons.wikimedia.org/wiki/File:Tizian_041.jpg | 티치아노, 〈성모 승천〉, 1516–18. 베네치아 프라리 성당. Public domain, Wikimedia Commons | `mystery_glorious_4.jpg` · 575×1280 · 95KB | 0.50/0.32 | 금빛 하늘·붉은 옷(107). 위쪽 양 모서리에 틀이 아주 조금 남음 — 화면 채움 배치에서는 보이지 않음 |
| glorious_5 | 영광 5단 · 예수님께서 마리아께 천상 모후의 관을 씌우심 | 성모 대관 · 디에고 벨라스케스 · 1635–36 · 마드리드 프라도 미술관 | Public domain (PD-Art / PD-old-100) | https://commons.wikimedia.org/wiki/File:Vel%C3%A1zquez_-_Coronaci%C3%B3n_de_la_Virgen_(Museo_del_Prado,_h._1645).jpg | 디에고 벨라스케스, 〈성모 대관〉, 1635–36. 마드리드 프라도 미술관. Public domain, Wikimedia Commons | `mystery_glorious_5.jpg` · 961×1280 · 105KB | 0.50/0.40 | 자주·남색·은회색 구름(88). 삼각 구도, 배경으로 적합 |

받은 원본(다시 가공할 때 쓰는 주소):

| id | 받은 파일 |
|---|---|
| joyful_1 | https://upload.wikimedia.org/wikipedia/commons/thumb/b/bc/Fra_Angelico_-_Annunciation.jpg/1920px-Fra_Angelico_-_Annunciation.jpg — Commons 표준 축소본 1920px (원본 8646×6273, 33711KB) → `docs/ux/art_src/src_mystery_joyful_1.jpg` |
| joyful_2 | https://upload.wikimedia.org/wikipedia/commons/thumb/c/cc/Albertinelli_-_Visitazione_%28nella_predella_Episodi_dell%E2%80%99Infanzia_di_Cristo%29%2C_1503%2C_1890_n.1587_%28cropped%29.jpg/960px-Albertinelli_-_Visitazione_%28nella_predella_Episodi_dell%E2%80%99Infanzia_di_Cristo%29%2C_1503%2C_1890_n.1587_%28cropped%29.jpg — Commons 표준 축소본 960px (원본 1199×1899, 623KB) → `docs/ux/art_src/src_mystery_joyful_2.jpg` |
| joyful_3 | https://upload.wikimedia.org/wikipedia/commons/thumb/0/05/Gerard_van_Honthorst_-_Adoration_of_the_Shepherds_%281622%29.jpg/1920px-Gerard_van_Honthorst_-_Adoration_of_the_Shepherds_%281622%29.jpg — Commons 표준 축소본 1920px (원본 2057×1690, 945KB) → `docs/ux/art_src/src_mystery_joyful_3.jpg` |
| joyful_4 | https://upload.wikimedia.org/wikipedia/commons/thumb/8/84/Presentation_of_Jesus_at_the_Temple_by_Fra_Angelico_%28San_Marco_Cell_10%29.jpg/1280px-Presentation_of_Jesus_at_the_Temple_by_Fra_Angelico_%28San_Marco_Cell_10%29.jpg — Commons 표준 축소본 1280px (원본 2195×2543, 508KB) → `docs/ux/art_src/src_mystery_joyful_4.jpg` |
| joyful_5 | https://upload.wikimedia.org/wikipedia/commons/thumb/2/27/William_Holman_Hunt_-_The_Finding_of_the_Saviour_in_the_Temple.jpg/1920px-William_Holman_Hunt_-_The_Finding_of_the_Saviour_in_the_Temple.jpg — Commons 표준 축소본 1920px (원본 3906×2525, 3373KB) → `docs/ux/art_src/src_mystery_joyful_5.jpg` |
| luminous_1 | https://upload.wikimedia.org/wikipedia/commons/thumb/4/48/Baptism_of_Christ_by_Andrea_del_Verrocchio.jpg/1280px-Baptism_of_Christ_by_Andrea_del_Verrocchio.jpg — Commons 표준 축소본 1280px (원본 2020×2365, 816KB) → `docs/ux/art_src/src_mystery_luminous_1.jpg` |
| luminous_2 | https://upload.wikimedia.org/wikipedia/commons/thumb/6/67/The_Marriage_Feast_at_Cana_MET_DT1459.jpg/1280px-The_Marriage_Feast_at_Cana_MET_DT1459.jpg — Commons 표준 축소본 1280px (원본 2851×3722, 3253KB) → `docs/ux/art_src/src_mystery_luminous_2.jpg` |
| luminous_3 | https://upload.wikimedia.org/wikipedia/commons/thumb/9/96/Bloch-SermonOnTheMount.jpg/1280px-Bloch-SermonOnTheMount.jpg — Commons 표준 축소본 1280px (원본 1377×1545, 566KB) → `docs/ux/art_src/src_mystery_luminous_3.jpg` |
| luminous_4 | https://upload.wikimedia.org/wikipedia/commons/thumb/5/5d/Raphael_-_The_Transfiguration_-_Google_Art_Project.jpg/1280px-Raphael_-_The_Transfiguration_-_Google_Art_Project.jpg — Commons 표준 축소본 1280px (원본 3514×4980, 2469KB) → `docs/ux/art_src/src_mystery_luminous_4.jpg` |
| luminous_5 | https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/Dieric_Bouts_-_The_Last_Supper.jpg/1280px-Dieric_Bouts_-_The_Last_Supper.jpg — Commons 표준 축소본 1280px (원본 3476×4180, 11086KB) → `docs/ux/art_src/src_mystery_luminous_5.jpg` |
| sorrowful_1 | https://upload.wikimedia.org/wikipedia/commons/thumb/6/68/Christ_in_Gethsemane.jpg/960px-Christ_in_Gethsemane.jpg — Commons 표준 축소본 960px (원본 1141×1600, 205KB) → `docs/ux/art_src/src_mystery_sorrowful_1.jpg` |
| sorrowful_2 | https://upload.wikimedia.org/wikipedia/commons/thumb/0/0e/Caravaggio_-_La_Flagellazione_di_Cristo.jpg/1280px-Caravaggio_-_La_Flagellazione_di_Cristo.jpg — Commons 표준 축소본 1280px (원본 1907×2545, 344KB) → `docs/ux/art_src/src_mystery_sorrowful_2.jpg` |
| sorrowful_3 | https://upload.wikimedia.org/wikipedia/commons/thumb/1/17/Titian_-_Christ_crowned_with_Thorns_-_Louvre.jpg/1280px-Titian_-_Christ_crowned_with_Thorns_-_Louvre.jpg — Commons 표준 축소본 1280px (원본 2024×3456, 399KB) → `docs/ux/art_src/src_mystery_sorrowful_3.jpg` |
| sorrowful_4 | https://images.metmuseum.org/CRDImages/rl/original/DP347226.jpg (메트로폴리탄 미술관 오픈 액세스 원본 2813×3890, 1.9MB — 1.5MB 초과라 저장소에 보관하지 않음) |
| sorrowful_5 | https://upload.wikimedia.org/wikipedia/commons/thumb/d/d7/Cristo_crucificado.jpg/1280px-Cristo_crucificado.jpg — Commons 표준 축소본 1280px (원본 2046×3051, 4703KB) → `docs/ux/art_src/src_mystery_sorrowful_5.jpg` |
| glorious_1 | https://upload.wikimedia.org/wikipedia/commons/thumb/e/eb/Piero_della_Francesca_-_Resurrection_-_WGA17609.jpg/960px-Piero_della_Francesca_-_Resurrection_-_WGA17609.jpg — Commons 표준 축소본 960px (원본 1130×1200, 222KB) → `docs/ux/art_src/src_mystery_glorious_1.jpg` |
| glorious_2 | https://upload.wikimedia.org/wikipedia/commons/thumb/6/67/Rembrandt_The_Ascension_1636_Oil_on_canvas_Alte_Pinakothek_Munich_Germany.jpg/1280px-Rembrandt_The_Ascension_1636_Oil_on_canvas_Alte_Pinakothek_Munich_Germany.jpg — Commons 표준 축소본 1280px (원본 2068×2806, 3458KB) → `docs/ux/art_src/src_mystery_glorious_2.jpg` |
| glorious_3 | https://upload.wikimedia.org/wikipedia/commons/thumb/d/d3/Pentecost%C3%A9s_%28El_Greco%2C_c._1600%29_Prado.jpg/1280px-Pentecost%C3%A9s_%28El_Greco%2C_c._1600%29_Prado.jpg — Commons 표준 축소본 1280px (원본 1365×2964, 3313KB) → `docs/ux/art_src/src_mystery_glorious_3.jpg` |
| glorious_4 | https://upload.wikimedia.org/wikipedia/commons/thumb/9/9e/Tizian_041.jpg/960px-Tizian_041.jpg — Commons 표준 축소본 960px (원본 1050×1932, 1440KB) → `docs/ux/art_src/src_mystery_glorious_4.jpg` |
| glorious_5 | https://upload.wikimedia.org/wikipedia/commons/thumb/f/fc/Vel%C3%A1zquez_-_Coronaci%C3%B3n_de_la_Virgen_%28Museo_del_Prado%2C_h._1645%29.jpg/1280px-Vel%C3%A1zquez_-_Coronaci%C3%B3n_de_la_Virgen_%28Museo_del_Prado%2C_h._1645%29.jpg — Commons 표준 축소본 1280px (원본 2292×3051, 576KB) → `docs/ux/art_src/src_mystery_glorious_5.jpg` |

### 신비 배경으로 쓸 때의 판단
- **그대로 쓰기 좋은 것(어둡고 단순함)**: 환희 2·3, 고통 1·2·4·5, 영광 2·5.
- **밝아서 덮는 막을 더 진하게 써야 하는 것**: 환희 1·4, 빛 1·2·3, 영광 1·4.
- **복잡해서 흐림을 더 줘야 하는 것**: 환희 5, 빛 4·5, 고통 3, 영광 3.
- **화풍이 섞인다**: 15세기 프레스코(프라 안젤리코, 피에로)부터 19세기 아카데미 화풍(블로크, 호프만, 헌트)까지 한 묶음 안에 있다. 어둡게 흐려서 깔면 크게 거슬리지 않지만, 한 화풍으로 통일하려면 아래 대안을 쓴다.
- **고통의 신비를 십자가의 길 그림으로 통일하는 대안**(요청 사항): 푸겔 연작에서 4단 = `station_02.jpg`(십자가를 지심), 5단 = `station_12.jpg`(십자가 위에서 돌아가심)를 그대로 쓸 수 있다. 1~3단(겟세마니, 채찍질, 가시관)은 십자가의 길에 없는 장면이라 거장 그림을 그대로 둬야 한다. `station_01.jpg`에는 가시관을 쓰고 붉은 겉옷을 입으신 예수님이 나오므로 3단의 대체 그림으로 쓸 수는 있다.

## 3. 십자가의 길 14처 그림

**선택한 연작**: 게프하르트 푸겔(Gebhard Fugel, 1863–1939), 바트 자울가우 성 안토니오 성당(Antoniuskirche, Bad Saulgau)의 십자가의 길, 1921년, 유화. 사진: Andreas Praefcke(2014년 4월, 그림을 그대로 찍은 사진이라 따로 권리를 주장하지 않음). 14처가 모두 있고 전통 순서와 일치한다. 그림에 처 번호나 글자가 없다.

| id | 처 | 라이선스 | 출처(파일 설명 페이지) | 파일 · 크기 | 초점 x/y | 색조(밝기) |
|---|---|---|---|---|---|---|
| station_01 | 제1처 예수님께서 사형 선고를 받으심 | Public domain | https://commons.wikimedia.org/wiki/File:Saulgau_Antoniuskirche_Kreuzweg_Fugel_Station_01.jpg | `station_01.jpg` · 809×1000 · 124KB | 0.80/0.20 | 밝은 회색 하늘·흰옷·붉은 겉옷 (94) |
| station_02 | 제2처 예수님께서 십자가를 지심 | Public domain | https://commons.wikimedia.org/wiki/File:Saulgau_Antoniuskirche_Kreuzweg_Fugel_Station_02.jpg | `station_02.jpg` · 807×1000 · 125KB | 0.47/0.50 | 회청색 하늘·갈색 십자가 (85) |
| station_03 | 제3처 예수님께서 처음 넘어지심 | Public domain | https://commons.wikimedia.org/wiki/File:Saulgau_Antoniuskirche_Kreuzweg_Fugel_Station_03.jpg | `station_03.jpg` · 809×1000 · 123KB | 0.55/0.62 | 회색·흰색 (92) |
| station_04 | 제4처 예수님께서 성모님을 만나심 | Public domain | https://commons.wikimedia.org/wiki/File:Saulgau_Antoniuskirche_Kreuzweg_Fugel_Station_04.jpg | `station_04.jpg` · 814×1000 · 134KB | 0.45/0.28 | 밝은 회색·흰색·남색 (106) |
| station_05 | 제5처 키레네 사람 시몬이 예수님을 도와 십자가를 짐 | Public domain | https://commons.wikimedia.org/wiki/File:Saulgau_Antoniuskirche_Kreuzweg_Fugel_Station_05.jpg | `station_05.jpg` · 812×1000 · 131KB | 0.62/0.22 | 황토·주황·흰색 (91) |
| station_06 | 제6처 베로니카가 수건으로 예수님의 얼굴을 닦아 드림 | Public domain | https://commons.wikimedia.org/wiki/File:Saulgau_Antoniuskirche_Kreuzweg_Fugel_Station_06.jpg | `station_06.jpg` · 812×1000 · 145KB | 0.50/0.30 | 어두운 회갈색·흰색 (84) |
| station_07 | 제7처 예수님께서 두 번째 넘어지심 | Public domain | https://commons.wikimedia.org/wiki/File:Saulgau_Antoniuskirche_Kreuzweg_Fugel_Station_07.jpg | `station_07.jpg` · 807×1000 · 131KB | 0.68/0.80 | 어두운 갈색·붉은색 (79) |
| station_08 | 제8처 예수님께서 예루살렘 부인들을 위로하심 | Public domain | https://commons.wikimedia.org/wiki/File:Saulgau_Antoniuskirche_Kreuzweg_Fugel_Station_08.jpg | `station_08.jpg` · 806×1000 · 128KB | 0.42/0.28 | 밝은 하늘·흰색·파랑 (106) |
| station_09 | 제9처 예수님께서 세 번째 넘어지심 | Public domain | https://commons.wikimedia.org/wiki/File:Saulgau_Antoniuskirche_Kreuzweg_Fugel_Station_09.jpg | `station_09.jpg` · 812×1000 · 145KB | 0.72/0.72 | 적갈색·흰색 (80) |
| station_10 | 제10처 예수님께서 옷 벗김을 당하심 | Public domain | https://commons.wikimedia.org/wiki/File:Saulgau_Antoniuskirche_Kreuzweg_Fugel_Station_10.jpg | `station_10.jpg` · 810×1000 · 143KB | 0.58/0.20 | 어두운 회녹색·흰 천 (67) |
| station_11 | 제11처 예수님께서 십자가에 못 박히심 | Public domain | https://commons.wikimedia.org/wiki/File:Saulgau_Antoniuskirche_Kreuzweg_Fugel_Station_11.jpg | `station_11.jpg` · 807×1000 · 143KB | 0.70/0.83 | 회갈색·금색 제의 (83) |
| station_12 | 제12처 예수님께서 십자가 위에서 돌아가심 | Public domain | https://commons.wikimedia.org/wiki/File:Saulgau_Antoniuskirche_Kreuzweg_Fugel_Station_12.jpg | `station_12.jpg` · 818×1000 · 128KB | 0.55/0.17 | 회갈색 하늘·붉은 해·남색 (86) |
| station_13 | 제13처 예수님의 시신을 십자가에서 내림 | Public domain | https://commons.wikimedia.org/wiki/File:Saulgau_Antoniuskirche_Kreuzweg_Fugel_Station_13.jpg | `station_13.jpg` · 822×1000 · 119KB | 0.72/0.68 | 밝은 회색·흰색·남색 (89) |
| station_14 | 제14처 예수님께서 무덤에 묻히심 | Public domain | https://commons.wikimedia.org/wiki/File:Saulgau_Antoniuskirche_Kreuzweg_Fugel_Station_14.jpg | `station_14.jpg` · 807×1000 · 115KB | 0.20/0.48 | 어두운 갈색(가장 어두움) (62) |

- 표시 문구(권장, 14점 공통): `게프하르트 푸겔, 〈십자가의 길〉, 1921, 바트 자울가우 성 안토니오 성당. 사진 Andreas Praefcke. Public domain, Wikimedia Commons`
- 원본은 1700~1936px 너비, 1.2~1.8MB다. 받은 것은 Commons 1280px 축소본이고 `docs/ux/art_src/src_station_NN.jpg`에 있다. 주소 형식: `https://upload.wikimedia.org/wikipedia/commons/thumb/<해시>/Saulgau_Antoniuskirche_Kreuzweg_Fugel_Station_NN.jpg/1280px-Saulgau_Antoniuskirche_Kreuzweg_Fugel_Station_NN.jpg`
- 가장자리 2~2.5%(어두운 테두리)를 잘랐다. 모든 처가 약 0.81:1 세로 비율이라 성당 벽의 액자 14개에 같은 크기로 걸 수 있다.
- 3D 성당 벽에 걸기에는 밝기가 고르다(62~106). 제14처만 눈에 띄게 어둡다.
- 제9·10·11·13처는 고통을 직접 그린 장면이다. 폭력 묘사 수위는 전통 성화 수준이다.

### 검토했지만 쓰지 않은 연작
| 연작 | 쓰지 않은 까닭 |
|---|---|
| 잔도메니코 티에폴로, 베네치아 산 폴로 성당 비아 크루치스(1747–49) | Commons에 14처가 다 있지만 사진가(Didier Descouens)의 사진이라 파일별 라이선스가 CC BY-SA 4.0일 가능성이 높다. 요청 제한(429) 때문에 14개 파일의 라이선스를 끝까지 확인하지 못했다. **확인하지 못했으므로 쓰지 않았다.** |
| 푸겔, 뮌헨 성 요셉 성당 십자가의 길(1908년경, `Fugel Kreuzweg 01~14.jpg`) | 14점 모두 Public domain이지만 813×477의 작은 가로형 흑백에 가까운 옛 인쇄본이라 화질이 낮다. 가로형이 필요하면 대안이 된다. |
| 푸겔, 로이트키르히 본당 십자가의 길(1936) | Commons에서 2점만 찾았다. |
| 요제프 폰 퓌리히, 알로이스 마이어, 19세기 석판화 연작 | 요청 제한 때문에 조사하지 못했다. |
| 한국 화가의 십자가의 길(김기창 등) | 저작권이 살아 있어 제외했다. |

## 4. Stations of the Cross (십자가의 길) — 14처 목록

전통 14처의 이름과 근거다. 이름은 내용을 풀어 쓴 것이며, 한국 천주교의 공식 표기(『가톨릭 기도서』)와 글자 하나까지 같은지는 본당 신부님이나 교구에 확인받아야 한다.

| 처 | 이름 | 근거 | 그림 |
|---|---|---|---|
| 제1처 | 예수님께서 사형 선고를 받으심 | 마태 27,22-26; 마르 15,6-15; 루카 23,13-25; 요한 19,1-16 | `station_01.jpg` |
| 제2처 | 예수님께서 십자가를 지심 | 요한 19,17 (마태 27,31; 마르 15,20) | `station_02.jpg` |
| 제3처 | 예수님께서 처음 넘어지심 | 전승 (성경에 직접 나오지 않음) | `station_03.jpg` |
| 제4처 | 예수님께서 성모님을 만나심 | 전승 (참조: 루카 2,34-35; 요한 19,25-27) | `station_04.jpg` |
| 제5처 | 키레네 사람 시몬이 예수님을 도와 십자가를 짐 | 마태 27,32; 마르 15,21; 루카 23,26 | `station_05.jpg` |
| 제6처 | 베로니카가 수건으로 예수님의 얼굴을 닦아 드림 | 전승 (성경에 직접 나오지 않음) | `station_06.jpg` |
| 제7처 | 예수님께서 두 번째 넘어지심 | 전승 (성경에 직접 나오지 않음) | `station_07.jpg` |
| 제8처 | 예수님께서 예루살렘 부인들을 위로하심 | 루카 23,27-31 | `station_08.jpg` |
| 제9처 | 예수님께서 세 번째 넘어지심 | 전승 (성경에 직접 나오지 않음) | `station_09.jpg` |
| 제10처 | 예수님께서 옷 벗김을 당하심 | 마태 27,33-35; 마르 15,24; 루카 23,34; 요한 19,23-24 | `station_10.jpg` |
| 제11처 | 예수님께서 십자가에 못 박히심 | 마태 27,35-38; 마르 15,24-27; 루카 23,33; 요한 19,18 | `station_11.jpg` |
| 제12처 | 예수님께서 십자가 위에서 돌아가심 | 마태 27,45-56; 마르 15,33-41; 루카 23,44-49; 요한 19,28-30 | `station_12.jpg` |
| 제13처 | 예수님의 시신을 십자가에서 내림 | 마태 27,57-59; 마르 15,42-46; 루카 23,50-53; 요한 19,38 | `station_13.jpg` |
| 제14처 | 예수님께서 무덤에 묻히심 | 마태 27,59-61; 마르 15,46-47; 루카 23,53-56; 요한 19,39-42 | `station_14.jpg` |

- **성경에 직접 나오지 않는 처**: 제3·7·9처(세 번 넘어지심), 제4처(성모님을 만나심), 제6처(베로니카). 교회의 오랜 전승이다.
- **제15처(부활)**: 일부 본당과 기도서에서 덧붙이지만 **전통 14처에는 들어가지 않는다.** 이 앱에서는 넣지 않고, 나중에 선택 사항으로만 검토한다. 그림도 수집하지 않았다.
- 1991년 요한 바오로 2세 교황이 바친 '성경에 따른 십자가의 길'은 처의 구성이 다르다(겟세마니에서 시작). 이 문서의 14처는 전통 형식이다.

### 기도문 저작권 — 반드시 지킬 것
- **한국 천주교의 공식 십자가의 길 기도문**(한국천주교주교회의 『가톨릭 기도서』, 각 교구·수도회 발행본)은 **저작권이 있다. 앱에 베껴 넣지 말 것.** 각 처의 묵상 글과 "구세주 예수 그리스도님, 경배하며 찬송하나이다…" 같은 응답 구절도 공식 번역문이므로 허락 없이 넣지 않는다.
- **성경 본문**: 한국천주교주교회의 『성경』(2005) 번역문도 저작권이 있다. 구절을 그대로 옮기려면 허락이 필요하다. **장·절 표시만 적는 것은 문제없다.**
- **제안**: 각 처의 앱 문구는 ① 처 이름, ② 성경 장·절 표시, ③ 복음 내용을 바탕으로 **새로 쓴 한두 문장의 짧은 묵상**, ④ 침묵 시간으로 구성한다. 주님의 기도, 성모송, 영광송은 묵주기도에서 이미 쓰는 본문과 같은 조건으로 다룬다(이 본문들의 이용 허락 상태도 함께 확인할 것).
- 새로 쓴 문구는 교리와 표현에 문제가 없는지 **신부님과 교구의 검토**를 받는다.

### 누구에게 물을지
| 물을 곳 | 물을 내용 |
|---|---|
| 본당 주임 신부님(또는 아는 사제) | 새로 쓴 14처 묵상 문구의 교리·표현 검토, 처 이름 표기 확인 |
| 소속 교구 사무처·홍보국(전산 담당) | 교구 이름으로 앱 문구를 검토해 줄 수 있는지, 교구 발행 기도문을 쓸 수 있는지 |
| 한국천주교주교회의(CBCK) 저작권 담당 — 한국천주교중앙협의회 출판부 | 『가톨릭 기도서』의 십자가의 길 기도문과 『성경』 본문을 앱에 싣는 허락과 조건 |
| 주교회의 전례위원회 | 공식 처 이름과 응답 구절 표기, 제15처를 다루는 방식 |

연락처는 이 문서에서 확인하지 않았다. 주교회의 누리집(cbck.or.kr)의 저작권 안내에서 확인할 것.

## 5. 남은 일
- 화면에 붙이는 일(배경 표시, 덮는 막, 흐림, 초점 맞춤)과 3D 성당의 액자 14개 배치는 구현 담당이 한다.
- 앱의 라이선스 화면에 `docs/church/licenses/art_mysteries.md`, `art_stations.md` 내용을 연결한다.
- 티에폴로 연작의 파일별 라이선스를 확인하면 18세기 화풍의 대안 연작이 될 수 있다.
