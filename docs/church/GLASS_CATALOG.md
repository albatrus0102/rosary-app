# 스테인드글라스 카탈로그 (GLASS_CATALOG)

앱의 방향이 「스테인드글라스를 감상하는 앱」으로 바뀌면서 만든 **고해상도 마스터 46점**의 목록. 생성일 2026-11-12. 기계가 읽는 원본은 `assets/church/glass_catalog.json` 이고 이 문서는 그것을 사람이 읽기 좋게 옮긴 것이다.

## 요약

- 창 46점, 그 가운데 긴 변 4096px 마스터 **22점**. 나머지 24점은 구할 수 있는 합법 원본이 작아 4096px 에 못 미친다(원본의 1.5배를 넘겨 확대하지 않음 — 아래 「해상도」 열 참조).
- 라이선스: CC0 13점 · Public domain 19점 · CC BY 14점. CC BY-SA·NC 는 없다. CC BY 14점은 앱 라이선스 화면에 표시 문구가 **필수**다(아래 「출처 표기」).
- 파일: 창마다 `glass_<id>.webp`(마스터, 긴 변 최대 4096) · `glass_<id>_2k.webp`(2048) · `glass_<id>_1k.webp`(1024). 모두 알파 채널 포함 손실 WebP(q≈90, 6MB 초과 시 q 낮춤), `assets/church/` 바로 아래. 합계 약 166 MB.
- 보관 원본: `assets/church/glass_src/<이름>_orig.jpg` (번들 제외).
- 기존 `glass_<id>.jpg`(저해상도 질감)는 지우지 않았다. 렌더러가 WebP 로 옮겨 간 뒤 정리하면 된다. 기존 20점 중 `lancet_milan_1`, `panels_milan_2`, `lancet_chartres_1`, `tracery_cologne`, `grisaille_lancet`, `alabaster_*` 일부는 새 카탈로그에서 id 가 바뀌거나 빠졌다(아래 「기존 id 대응」).
- `authentic` = 그 성당에 실제로 있는 창, `reference` = 같은 양식의 **다른 성당** 창. 앱은 reference 를 쓸 때 반드시 「○○ 대성당의 창(참고용)」처럼 실제 소재지를 밝혀야 한다.
- `verify` = 일반 지식으로 적었으나 이번 작업에서 1차 자료로 확인하지 못한 내용. 앱 화면에 단정적으로 쓰기 전에 확인할 것.

## 「새것 같은」 복원의 범위 — 한 것과 하지 않은 것

모든 마스터는 **사진을 충실하게 손질한 것**이지 유리를 새로 그린 것이 아니다. `tools` 없이 재현할 수 있도록 창마다 수치를 카탈로그의 `restoration` 에 적었다.

한 것:
- 기하: 정면이 아닌 사진은 투시(4점)·사다리꼴·타원→원 보정. 창 윤곽에 정확히 맞춰 자르고 바깥은 알파 0.
- 검은점: 창 안쪽 최암부(0.3%)를 세 채널 같은 값으로 빼서 뿌연 베일링 글레어만 제거(색상 불변).
- 플랫필드: 창 전체에 걸친 **1차(선형) 밝기 기울기만** 최대 ±25% 범위에서 완화. 방사형·국소 밝기 차이는 창의 디자인일 수 있어 건드리지 않음.
- 화이트밸런스: 밝은 무채색 유리를 기준으로 채널 게인 ±5% 이내만. 미술관 촬영본은 보정하지 않음.
- 톤·채도: 노출/감마로 중간톤을 올리고 약한 S 곡선·CLAHE, Lab 크로마를 색상각을 유지한 채 ×1.0–1.15(상한 완만히 제한).
- 약한 노이즈 제거 + 언샤프 마스크.

하지 않은 것(정직한 한계):
- **인페인팅·생성형 보정은 한 곳도 없다.** 인물·얼굴·글자·무늬를 지어내지 않았다. 깨진 유리, 후대의 땜질 조각, 균열 수리 납선, 부식·때, 철제 보강대(실물), 보호 철망은 사진에 찍힌 그대로다.
- 창 앞을 실제로 가리는 것(성 베드로 글로리아의 청동 구름, 생트샤펠 난간, 노트르담 북쪽 장미창 아래 난간)은 지우지 않았다.
- 실내에서 찍은 사진은 대부분 돌 트레이서리·창살이 완전히 검게 찍혀 석재 질감이 없다(노트르담 북쪽 장미창만 예외).
- 색은 「사진가의 카메라가 본 색」을 넘지 못한다. 실물 대조·컬러차트가 없으므로 「실제와 동일」하다고 말할 수 없다. 특히 `rose_notredame_south`(원본이 이미 과보정)는 색 신뢰도가 낮다.
- 실제 크기를 아는 창이 적어, 가로세로비는 대부분 (보정된) 사진의 비례를 그대로 썼다. `milan_apse_lower` 의 비례는 추정이다.
- 4096px 에 못 미치는 창은 확대해도 세부가 생기지 않는다(최대 1.5배 Lanczos).

## 목록

| id | 한국어 제목 | 원어/영어 제목 | 위치 | 제작 시기 · 작가 | 형태 | 실제 크기 | 마스터(px) · 원본 대비 | 라이선스 | 어울리는 성당 |
|---|---|---|---|---|---|---|---|---|---|
| `dove_stpeter` | 성령의 비둘기 창 (글로리아) | Dove of the Holy Spirit window (Gloria, Cathedra Petri) | 성 베드로 대성전 후진 · 바티칸 시국 | 1657–1666년 · 잔 로렌초 베르니니(사도좌 제대 구성) | oculus(타원) | 미상 | 2828×4096 · ×1.218999981880188 | CC0 1.0 | stpeter(실물) |
| `tiffany_hinds` | 하인즈 저택 창 | Hinds House Window | 클리블랜드 미술관 소장(원래 클리블랜드 하인즈 저택) · 클리블랜드 · 미국 | c. 1900년 · 티파니 유리·장식 회사(Tiffany Glass & Decorating Company) | panel | 1.143×2.273 m | 2068×4096 · ×0.45500001311302185 | CC0 1.0 | basic(참고) |
| `panel_crucified` | 십자가에 못 박히신 그리스도 | Crucified Christ | 클리블랜드 미술관 소장 · 영국 제작 | c. 1480–1500년 · 작가 미상(영국) | panel | 0.435×0.869 m | 2086×4096 · ×0.6869999766349792 | CC0 1.0 | basic(참고), myeongdong(참고) |
| `panel_catherine_donor` | 성녀 가타리나와 무릎 꿇은 기증자 | Saint Catherine with a Kneeling Male Donor | 클리블랜드 미술관 소장 · 프랑스 푸아투 멜 제작 | 15세기 · 작가 미상 | panel | 0.492×1.587 m | 1300×4096 · ×0.6620000004768372 | CC0 1.0 | basic(참고), myeongdong(참고) |
| `leoben_annunciation` | 주님 탄생 예고 (레오벤) | The Annunciation from the Parish Church of Maria am Waasen in Leoben | 클리블랜드 미술관 소장(원래 오스트리아 레오벤 마리아 암 바젠 성당) | c. 1410–1420년 · 작가 미상(오스트리아 슈타이어마르크) | panel | 0.49×0.73 m | 2801×4096 · ×0.45500001311302185 | CC0 1.0 | basic(참고), myeongdong(참고) |
| `leoben_magi` | 동방 박사들의 경배 (레오벤) | The Adoration of the Magi from the Parish Church of Maria am Waasen in Leoben | 클리블랜드 미술관 소장(원래 오스트리아 레오벤 마리아 암 바젠 성당) | c. 1410–1420년 · 작가 미상(오스트리아 슈타이어마르크) | panel | 0.49×0.72 m | 2750×4096 · ×0.45500001311302185 | CC0 1.0 | basic(참고), myeongdong(참고) |
| `panel_gethsemane` | 겟세마니 동산의 그리스도 | Christ in the Garden of Gethsemane | 클리블랜드 미술관 소장(원래 독일 쾰른 근처 마리아발트 수도원 회랑) | 1522–1526년 · 에버하르트 렌지히 또는 게르하르트 레미슈 | panel | 0.718×0.737 m | 3680×4096 · ×0.6819999814033508 | CC0 1.0 | basic(참고) |
| `grisaille_aconite` | 투구꽃 잎 그리자유 패널 | Stained Glass Panel with Aconite Leaves | 클리블랜드 미술관 소장 · 프랑스(알자스?) 제작 | c. 1275–1300년 · 작가 미상 | lancet(뾰족 아치 패널) | 0.334×0.559 m | 1972×4096 · ×1.034999966621399 | CC0 1.0 | basic(참고), lateran(참고) |
| `alabaster_stpaul_1` | 성 바오로 대성전 알라바스터 창 (1) | Alabaster window, Basilica of Saint Paul Outside the Walls (02) | 성 바오로 대성전(산 파올로 푸오리 레 무라) · 로마 · 이탈리아 | 19세기 재건(1823년 화재 이후) 이후 · 작가 미상 | lancet(반원 아치 창) | 미상 | 1770×3397 · ×1.5 ⚠ | CC BY 4.0 | stpaul(실물), lateran(참고), maggiore(참고) |
| `alabaster_stpaul_2` | 성 바오로 대성전 알라바스터 창 (2) | Alabaster window, Basilica of Saint Paul Outside the Walls (04) | 성 바오로 대성전 · 로마 · 이탈리아 | 19세기 재건 이후 · 작가 미상 | lancet(반원 아치 창) | 미상 | 1770×3480 · ×1.5 ⚠ | CC BY 4.0 | stpaul(실물), lateran(참고), maggiore(참고) |
| `alabaster_slab` | 갈라 플라치디아 영묘의 알라바스터 창 | Alabaster window, Mausoleum of Galla Placidia | 갈라 플라치디아 영묘 · 라벤나 · 이탈리아 | 건물 5세기(c. 425–450) · 알라바스터 판 자체의 제작 시기 미상 | panel(단일 석판) | 미상 | 1344×1897 · ×1.5 ⚠ | CC BY 2.0 | stpaul(참고), lateran(참고), maggiore(참고), stpeter(참고) |
| `oculus_florence_donatello` | 성모 대관 오큘러스 | Coronation of the Virgin (Incoronazione della Vergine) | 피렌체 대성당(산타 마리아 델 피오레) 쿠폴라 드럼 · 피렌체 · 이탈리아 | 1434–1437년 · 밑그림 도나텔로 | oculus | 지름 3.8 m (est) | 2859×2859 · ×1.5 ⚠ | Public domain | florence(실물) |
| `oculus_florence_ghiberti_1` | 성모 승천 오큘러스 | Assumption of the Virgin (Assunzione di Maria) | 피렌체 대성당 정면 중앙 오큘러스 · 피렌체 · 이탈리아 | 1404–1405년 · 밑그림 로렌초 기베르티 | oculus | 미상 | 1447×1447 · ×1.5 ⚠ | Public domain | florence(실물) |
| `oculus_florence_ghiberti_2` | 주님 승천 오큘러스 | Ascension of Christ (Ascensione) | 피렌체 대성당 쿠폴라 드럼 · 피렌체 · 이탈리아 | 1443년경 · 밑그림 로렌초 기베르티 | oculus | 미상 | 1440×1440 · ×1.5 ⚠ | Public domain | florence(실물) |
| `rose_chartres_north` | 샤르트르 북쪽 장미창과 랜싯 | North rose window and lancets (Rose de France) | 샤르트르 대성당 북쪽 익랑 · 샤르트르 · 프랑스 | c. 1235년 · 작가 미상 | rose | 폭/지름 10.5 m | 2091×3252 · ×1.5 ⚠ | Public domain | basic(참고), myeongdong(참고) |
| `rose_chartres_west` | 샤르트르 서쪽 장미창 (최후의 심판) | West rose window (Last Judgement) | 샤르트르 대성당 서쪽 정면 · 샤르트르 · 프랑스 | c. 1215년 · 작가 미상 | rose | 지름 12.0 m (est) | 2793×2793 · ×1.5 ⚠ | Public domain | basic(참고), myeongdong(참고) |
| `rose_chartres_south` | 샤르트르 남쪽 장미창 | South rose window (Christ in Glory) | 샤르트르 대성당 남쪽 익랑 · 샤르트르 · 프랑스 | c. 1225–1230년 · 작가 미상 | rose | 지름 10.5 m (est) | 2141×2141 · ×1.5 ⚠ | Public domain | basic(참고), myeongdong(참고) |
| `lancet_chartres_belle` | 아름다운 창의 성모 (푸른 성모) | Notre-Dame de la Belle Verrière (Blue Virgin) | 샤르트르 대성당 남쪽 주보랑 (baie 30a) · 샤르트르 · 프랑스 | 성모자 부분 c. 1180년, 둘레 천사·하단 장면 c. 1225년 · 작가 미상 | lancet | 미상 | 2218×4096 · ×0.5770000219345093 | Public domain | basic(참고), myeongdong(참고) |
| `lancet_chartres_jesse` | 이새의 나무 | Tree of Jesse window | 샤르트르 대성당 서쪽 정면 (baie 49) · 샤르트르 · 프랑스 | c. 1145–1155년 · 작가 미상 | lancet | 미상 | 1212×4096 · ×0.6309999823570251 | Public domain | basic(참고), myeongdong(참고) |
| `lancet_chartres_samaritan` | 착한 사마리아인 창 | Good Samaritan window | 샤르트르 대성당 남쪽 측랑 (baie 44) · 샤르트르 · 프랑스 | c. 1205–1215년 · 작가 미상 | lancet | 미상 | 1269×4096 · ×0.6679999828338623 | Public domain | basic(참고), myeongdong(참고) |
| `medallion_chartres` | 샤르트르 메달리온 패널 (부분) | Chartres medallion scene (detail) | 샤르트르 대성당 · 샤르트르 · 프랑스 | 13세기 · 작가 미상 | panel(부분) | 미상 | 2880×2880 · ×1.5 ⚠ | Public domain | basic(참고), myeongdong(참고) |
| `lancet_cologne` | 쾰른 대성당 측랑 창 | Cologne Cathedral aisle window (19th c.) | 쾰른 대성당 · 쾰른 · 독일 | 19세기 · 작가 미상 | lancet(4연창+트레이서리) | 미상 | 2500×4096 · ×1.3109999895095825 | CC BY 3.0 | myeongdong(참고), basic(참고) |
| `lancet_gesta` | 성 에우트로피오 창 (제스타 공방) | Saint Eutropius window by the Gesta workshop | 마르시이(Marsilly) 성당 · 샤랑트마리팀 · 프랑스 | 19세기 · 루이-빅토르 제스타(툴루즈) 공방 | lancet | 미상 | 939×3803 · ×1.5 ⚠ | Public domain | myeongdong(참고), basic(참고) |
| `grisaille_knot` | 기하학 그리자유 패널 | Geometric grisaille panel | 스테인드글라스 박물관 · 일리 · 영국 | c. 1200–1250년 · 작가 미상 | panel(반원 머리) | 미상 | 1283×3229 · ×1.5 ⚠ | CC0 1.0 | basic(참고), myeongdong(참고), lateran(참고) |
| `rose_saintechapelle` | 생트샤펠 서쪽 장미창 (묵시록) | West rose window (Apocalypse) | 생트샤펠 상부 경당 · 파리 · 프랑스 | 15세기 말(c. 1485–1498) · 작가 미상 | rose | 지름 9.0 m (est) | 2274×2274 · ×1.5 ⚠ | CC0 1.0 | basic(참고) |
| `rose_york` | 요크 민스터 장미창 | York Minster rose window (south transept) | 요크 민스터 남쪽 익랑 · 요크 · 영국 | 석조 13세기, 유리 c. 1515년 · 작가 미상 | rose | 미상 | 2859×2859 · ×1.5 ⚠ | CC BY 2.0 | basic(참고) |
| `canterbury_n3` | 캔터베리 대성당 트리니티 경당 창 n.III | Canterbury Cathedral, Trinity Chapel window n.III | 캔터베리 대성당 트리니티 경당 · 캔터베리 · 영국 | 13세기 초 · 작가 미상 | lancet | 미상 | 1350×4096 · ×1.156999945640564 | CC BY 2.0 | basic(참고), myeongdong(참고) |
| `beverley_west` | 베벌리 민스터 서쪽 대창 | Beverley Minster, Great West Window | 베벌리 민스터 · 베벌리 · 영국 | 석조 15세기(수직 양식), 유리 19세기 · 유리 작가 미상 | lancet(다연창+트레이서리) | 미상 | 2257×4096 · ×0.6179999709129333 | CC BY 2.0 | basic(참고), myeongdong(참고) |
| `strasbourg_rose` | 스트라스부르 대성당 서쪽 장미창 | Strasbourg Cathedral west rose window | 스트라스부르 대성당 서쪽 정면 · 스트라스부르 · 프랑스 | 14세기 · 작가 미상 | rose | 미상 | 1777×1777 · ×1.5 ⚠ | Public domain | basic(참고), milan(참고) |
| `augsburg_daniel` | 아우크스부르크 예언자 창 — 다니엘 | Augsburg Cathedral Prophet Window: Daniel | 아우크스부르크 대성당 신랑 남쪽 고창 · 아우크스부르크 · 독일 | 11세기 말~12세기 전반(연대 논쟁 있음) · 작가 미상 | lancet(반원 아치) | 높이 2.2 m (est) | 1052×3077 · ×1.5 ⚠ | CC BY 2.0 | basic(참고), lateran(참고) |
| `augsburg_hosea` | 아우크스부르크 예언자 창 — 호세아 | Augsburg Cathedral Prophet Window: Hosea | 아우크스부르크 대성당 신랑 남쪽 고창 · 아우크스부르크 · 독일 | 11세기 말~12세기 전반(연대 논쟁 있음) · 작가 미상 | lancet(반원 아치) | 높이 2.2 m (est) | 1097×3344 · ×1.5 ⚠ | CC BY 2.0 | basic(참고), lateran(참고) |
| `tiffany_angel_resurrection` | 부활의 천사 | Angel of the Resurrection | 인디애나폴리스 미술관(뉴필즈) 소장 · 인디애나폴리스 · 미국 | 1904년 · 루이스 컴포트 티파니 / 티파니 스튜디오 | lancet(다연창+트레이서리) | 미상 | 2433×4096 · ×1.4579999446868896 | Public domain | basic(참고), myeongdong(참고) |
| `tiffany_crown_glory` | 의인은 영광의 화관을 받으리라 | The Righteous Shall Receive a Crown of Glory | 미국(소장처 verify) | 1901년 · 티파니 스튜디오, 밑그림 프레더릭 윌슨 | lancet(반원 아치) | 미상 | 2436×4096 · ×1.409000039100647 | Public domain | basic(참고), myeongdong(참고) |
| `tiffany_parakeets` | 잉꼬와 금붕어 어항 | Parakeets and Gold Fish Bowl | 미국(소장처 verify) | 1893년 · 루이스 컴포트 티파니 | panel | 미상 | 2142×4096 · ×1.1150000095367432 | Public domain | basic(참고) |
| `tiffany_wooded_landscape` | 세 폭의 숲 풍경 | A Wooded Landscape in Three Panels | 미국(소장처 verify) | c. 1905년 · 루이스 컴포트 티파니 / 티파니 스튜디오 | panel(3폭) | 미상 | 4096×2634 · ×1.0670000314712524 | Public domain | basic(참고) |
| `lancet_chartres_passion` | 수난과 부활 창 | Passion and Resurrection window | 샤르트르 대성당 서쪽 정면 (baie 51) · 샤르트르 · 프랑스 | c. 1145–1155년 · 작가 미상 | lancet | 미상 | 1145×4096 · ×0.597000002861023 | Public domain | basic(참고), myeongdong(참고) |
| `fivesisters_york` | 다섯 자매 창 | The Five Sisters Window | 요크 민스터 북쪽 익랑 · 요크 · 영국 | c. 1250–1260년 · 작가 미상 | lancet(5연창) | 높이 16.3 m (est) | 2881×3729 · ×1.5 ⚠ | CC BY 2.0 | basic(참고), lateran(참고) |
| `wyspianski_god_father` | 하느님 아버지 — 「있으라!」 | God the Father – Let it Be! (Bóg Ojciec – Stań się) | 프란치스코회 대성당 서쪽 창 · 크라쿠프 · 폴란드 | 1897–1904년 · 스타니스와프 비스피안스키(1869–1907) | lancet(다연창) | 미상 | 1145×2211 · ×1.5 ⚠ | Public domain | basic(참고) |
| `milan_apse_lower` | 밀라노 대성당 대형 창 (하부 부분) | Milan Cathedral great window (lower registers, partial) | 밀라노 대성당 · 밀라노 · 이탈리아 | 미상 | panel(부분) | 미상 | 2634×1505 · ×1.5 ⚠ | CC0 1.0 | milan(실물) |
| `rose_notredame_south` | 파리 노트르담 남쪽 장미창 | Notre-Dame de Paris, south rose window | 노트르담 대성당 남쪽 익랑 · 파리 · 프랑스 | c. 1260년(19세기 대규모 복원) · 작가 미상 | rose | 지름 12.9 m (est) | 2640×2640 · ×1.5 ⚠ | CC BY 3.0 | basic(참고), myeongdong(참고), milan(참고) |
| `canterbury_n14` | 캔터베리 예형론 창 (n.XIV) | Canterbury Cathedral typological window n.XIV | 캔터베리 대성당 북쪽 성가대 측랑 · 캔터베리 · 영국 | 12세기 말~13세기 초 · 작가 미상 | lancet(반원 아치) | 미상 | 2021×4096 · ×1.180999994277954 | CC BY 2.0 | basic(참고), myeongdong(참고) |
| `siena_duccio_oculus` | 시에나 대성당 오큘러스 (두초) | Siena Cathedral oculus (Duccio di Buoninsegna) | 시에나 대성당 부속 미술관(Museo dell'Opera) 소장, 원래 대성당 후진 · 시에나 · 이탈리아 | 1287–1288년 · 두초 디 부오닌세냐(밑그림) | oculus | 지름 5.6 m (est) | 3957×3957 · ×1.5 ⚠ | CC0 1.0 | basic(참고), florence(참고) |
| `lincoln_deans_eye` | 링컨 대성당 「주임 사제의 눈」 장미창 | Lincoln Cathedral, the Dean's Eye | 링컨 대성당 북쪽 익랑 · 링컨 · 영국 | c. 1220–1235년 · 작가 미상 | rose | 지름 7.3 m (est) | 4096×4096 · ×1.1239999532699585 | CC BY 2.0 | basic(참고), myeongdong(참고) |
| `burnejones_stgermans` | 세인트 저먼스 동쪽 창 (번존스·모리스 상회) | St Germans Priory east window (Burne-Jones / Morris & Co.) | 세인트 저먼스 수도원 성당 · 콘월 · 영국 | 1896년경 · 에드워드 번존스 밑그림, 모리스 상회 제작 | lancet(5연창+트레이서리) | 미상 | 1548×2592 · ×1.5 ⚠ | CC0 1.0 | basic(참고), myeongdong(참고) |
| `lancet_chartres_incarnation` | 그리스도의 생애 (강생) 창 | Incarnation / Life of Christ window | 샤르트르 대성당 서쪽 정면 중앙 (baie 50) · 샤르트르 · 프랑스 | c. 1145–1155년 · 작가 미상 | lancet | 미상 | 1421×4096 · ×0.3700000047683716 | Public domain | basic(참고), myeongdong(참고) |
| `rose_notredame_north` | 파리 노트르담 북쪽 장미창 (2024년 재개관 뒤) | Notre-Dame de Paris, north rose window (after the 2024 reopening) | 노트르담 대성당 북쪽 익랑 · 파리 · 프랑스 | c. 1250년 · 작가 미상 | rose | 지름 12.9 m (est) | 3510×3510 · ×1.5 ⚠ | CC BY 4.0 | basic(참고), myeongdong(참고) |

⚠ = 4096px 마스터가 아님(원본 해상도 부족).

## 창별 상세

### `dove_stpeter` — 성령의 비둘기 창 (글로리아)

- **원어/영어 제목**: Dove of the Holy Spirit window (Gloria, Cathedra Petri)
- **위치**: 성 베드로 대성전 후진 · 바티칸 시국
- **제작 시기 · 작가**: 1657–1666년 · 잔 로렌초 베르니니(사도좌 제대 구성)
- **형태**: oculus(타원) · **실제 크기**: 미상 · 마스터 가로세로비 0.6904
- **주제**: 후진의 「성 베드로의 사도좌」 조형물 위에 놓인 타원형 창으로, 가운데 성령을 뜻하는 비둘기에서 빛살이 사방으로 퍼진다. 창 둘레는 금박 청동과 스투코로 만든 구름·천사 무리(글로리아)가 감싼다.
- **verify**: 현재의 유리가 베르니니 당시의 것인지 후대 교체품인지, 창의 실측 크기는 확인하지 못함.
- **사진 출처**: [File:Holy Spirit stained-glass window (Cathedra Petri).jpg](https://commons.wikimedia.org/wiki/File:Holy_Spirit_stained-glass_window_(Cathedra_Petri).jpg) · 작가 Wilfredor · **CC0 1.0** (https://creativecommons.org/publicdomain/zero/1.0/) · 확인일 2026-11-12
- **크레딧 문구**: (표시 의무 없음) Wilfredor, CC0, via Wikimedia Commons
- **받은 원본**: `assets/church/glass_src/dove_stpeter_orig.jpg` — thumb3840 3840×5745 (Commons/미술관 원본 5097×7625)
- **파일**: `assets/church/glass_dove_stpeter.webp` 2828×4096 3.90MB q90 · `assets/church/glass_dove_stpeter_2k.webp` 1414×2048 1.10MB q90 · `assets/church/glass_dove_stpeter_1k.webp` 707×1024 0.27MB q90
- **색감**: 호박색·금색·갈색의 방사형 분할, 중심은 거의 흰색. 납선 굵음.
- **복원 내용**: 기하: 직사각 크롭(투시 보정 없음) · 윤곽: 타원 알파 · 검은점(베일링 글레어 제거, 세 채널 동일값) [0.0, 0.0, 0.0] · 플랫필드: 1차(선형) 기울기만 보정, 측정된 밝기 기울기 1.88배 중 최대 ±25% 범위·강도 0.6 · 화이트밸런스 게인 RGB [0.994, 1.0, 1.003] (밝은 무채색 유리 기준, ±5% 제한) · 노출 ×0.95, 감마 0.77, 채도(Lab 크로마, 색상각 유지) ×1.15 · 노이즈 제거 h=3, 언샤프 0.5/σ1.1 · 인페인팅 없음(지운 것·그려 넣은 것 없음) · 해상도: 창 부분 원본 긴 변 3360px → 마스터 4096px (×1.218999981880188) — 확대본
- **한계**: 타원 가장자리를 실제로 덮고 있는 청동 구름·천사 조각은 창 앞에 있는 실물이라 지우지 않았다(지우면 창작이 됨).
- **어울리는 성당**: stpeter — authentic(실물)

### `tiffany_hinds` — 하인즈 저택 창

- **원어/영어 제목**: Hinds House Window
- **위치**: 클리블랜드 미술관 소장(원래 클리블랜드 하인즈 저택) · 클리블랜드 · 미국
- **제작 시기 · 작가**: c. 1900년 · 티파니 유리·장식 회사(Tiffany Glass & Decorating Company)
- **형태**: panel · **실제 크기**: 1.143×2.273 m · 마스터 가로세로비 0.5049
- **주제**: 기둥이 선 테라스 너머로 해 질 녘 풍경이 보이는 풍경 창. 여러 겹으로 포갠 오팔색 유리로 원근과 빛을 그렸다. 종교 주제가 아닌 저택용 창이다.
- **사진 출처**: [Hinds House Window](https://clevelandart.org/art/1966.432) · 작가 The Cleveland Museum of Art (Open Access) · **CC0 1.0** (https://creativecommons.org/publicdomain/zero/1.0/) · 확인일 2026-11-12
- **크레딧 문구**: Hinds House Window, c. 1900. Tiffany Glass & Decorating Company (America, New York, 1892–1902). Leaded glass; unframed: 227.3 x 114.3 cm (89 1/2 x 45 in.). The Cleveland Museum of Art, Gift of Mrs. Robert M. Fallon, 1966.432 (CC0, Open Access)
- **받은 원본**: `assets/church/glass_src/tiffany_hinds_orig.jpg` — original TIFF downsampled to 9000px re-encoded JPEG q95 4:4:4 4545×9000 (Commons/미술관 원본 6062×12004)
- **파일**: `assets/church/glass_tiffany_hinds.webp` 2068×4096 2.29MB q90 · `assets/church/glass_tiffany_hinds_2k.webp` 1034×2048 0.72MB q90 · `assets/church/glass_tiffany_hinds_1k.webp` 517×1024 0.23MB q90
- **색감**: 녹색 테두리, 주황·노랑 하늘, 흰 꽃.
- **복원 내용**: 기하: 직사각 크롭(투시 보정 없음) · 윤곽: 직사각(알파 전체 불투명) · 검은점(베일링 글레어 제거, 세 채널 동일값) [0.0, 0.0, 0.0] · 플랫필드 보정 안 함 · 화이트밸런스 게인 RGB [1.0, 1.0, 1.0] (보정 안 함) · 노출 ×0.96, 감마 0.82, 채도(Lab 크로마, 색상각 유지) ×1.0 · 노이즈 제거 h=0, 언샤프 0.35/σ1.1 · 인페인팅 없음(지운 것·그려 넣은 것 없음) · 해상도: 창 부분 원본 긴 변 9000px → 마스터 4096px (×0.45500001311302185)
- **한계**: 미술관 촬영본(CC0)이라 색 보정은 최소화. 긴 변 9000px 로 줄인 JPEG 를 보관 원본으로 함(원 TIFF 6062×12004).
- **어울리는 성당**: basic — reference(다른 성당의 창, 표시 필요)

### `panel_crucified` — 십자가에 못 박히신 그리스도

- **원어/영어 제목**: Crucified Christ
- **위치**: 클리블랜드 미술관 소장 · 영국 제작
- **제작 시기 · 작가**: c. 1480–1500년 · 작가 미상(영국)
- **형태**: panel · **실제 크기**: 0.435×0.869 m · 마스터 가로세로비 0.5093
- **주제**: 십자가 위의 그리스도 양옆에서 천사들이 성혈을 성작에 받는 장면. 원래는 더 큰 창의 일부였다.
- **사진 출처**: [Crucified Christ](https://clevelandart.org/art/1948.131) · 작가 The Cleveland Museum of Art (Open Access) · **CC0 1.0** (https://creativecommons.org/publicdomain/zero/1.0/) · 확인일 2026-11-12
- **크레딧 문구**: Crucified Christ, c. 1480–1500. England. Pot metal, white glass with silver stain (with later composite glass); overall: 86.9 x 43.5 cm (34 3/16 x 17 1/8 in.). The Cleveland Museum of Art, Gift of William G. Mather, 1948.131 (CC0, Open Access)
- **받은 원본**: `assets/church/glass_src/panel_crucified_orig.jpg` — original TIFF re-encoded JPEG q95 4:4:4 3635×6400 (Commons/미술관 원본 3635×6400)
- **파일**: `assets/church/glass_panel_crucified.webp` 2086×4096 3.28MB q90 · `assets/church/glass_panel_crucified_2k.webp` 1043×2048 0.82MB q90 · `assets/church/glass_panel_crucified_1k.webp` 522×1024 0.22MB q90
- **색감**: 파랑 바탕, 흰 유리와 은염(노랑).
- **복원 내용**: 기하: 창 윤곽에 맞춘 직사각 크롭(투시 보정 없음) · 윤곽: 직사각(알파 전체 불투명) · 검은점(베일링 글레어 제거, 세 채널 동일값) [0.023, 0.023, 0.023] · 플랫필드 보정 안 함 · 화이트밸런스 게인 RGB [1.0, 1.0, 1.0] (보정 안 함) · 노출 ×0.96, 감마 0.83, 채도(Lab 크로마, 색상각 유지) ×1.0 · 노이즈 제거 h=0, 언샤프 0.35/σ1.1 · 인페인팅 없음(지운 것·그려 넣은 것 없음) · 해상도: 창 부분 원본 긴 변 5960px → 마스터 4096px (×0.6869999766349792)
- **한계**: 미술관 설명에 따르면 후대의 유리 조각이 섞여 있다(composite). 색 보정 최소.
- **어울리는 성당**: basic — reference(다른 성당의 창, 표시 필요), myeongdong — reference(다른 성당의 창, 표시 필요)

### `panel_catherine_donor` — 성녀 가타리나와 무릎 꿇은 기증자

- **원어/영어 제목**: Saint Catherine with a Kneeling Male Donor
- **위치**: 클리블랜드 미술관 소장 · 프랑스 푸아투 멜 제작
- **제작 시기 · 작가**: 15세기 · 작가 미상
- **형태**: panel · **실제 크기**: 0.492×1.587 m · 마스터 가로세로비 0.3174
- **주제**: 성녀 가타리나가 무릎 꿇은 성직자 기증자 뒤에 서 있다. 위쪽은 흰 유리와 은염으로 그린 높은 건축 캐노피다. 원래는 더 큰 구성의 일부였다.
- **사진 출처**: [Saint Catherine with a Kneeling Male Donor](https://clevelandart.org/art/1921.106) · 작가 The Cleveland Museum of Art (Open Access) · **CC0 1.0** (https://creativecommons.org/publicdomain/zero/1.0/) · 확인일 2026-11-12
- **크레딧 문구**: Saint Catherine with a Kneeling Male Donor, 1400s. France, Poitou, Melle, 15th century. Pot metal, white glass with silver stain; overall: 158.7 x 49.2 cm (62 1/2 x 19 3/8 in.). The Cleveland Museum of Art, Dudley P. Allen Fund, 1921.106 (CC0, Open Access)
- **받은 원본**: `assets/church/glass_src/panel_catherine_donor_orig.jpg` — original TIFF re-encoded JPEG q95 4:4:4 2890×6585 (Commons/미술관 원본 2890×6585)
- **파일**: `assets/church/glass_panel_catherine_donor.webp` 1300×4096 2.70MB q90 · `assets/church/glass_panel_catherine_donor_2k.webp` 650×2048 0.63MB q90 · `assets/church/glass_panel_catherine_donor_1k.webp` 325×1024 0.16MB q90
- **색감**: 대부분 흰 유리·은염, 파랑 옷과 빨강 광배.
- **복원 내용**: 기하: 창 윤곽에 맞춘 직사각 크롭(투시 보정 없음) · 윤곽: 직사각(알파 전체 불투명) · 검은점(베일링 글레어 제거, 세 채널 동일값) [0.013, 0.013, 0.013] · 플랫필드 보정 안 함 · 화이트밸런스 게인 RGB [1.0, 1.0, 1.0] (보정 안 함) · 노출 ×0.96, 감마 1.0, 채도(Lab 크로마, 색상각 유지) ×1.0 · 노이즈 제거 h=0, 언샤프 0.35/σ1.1 · 인페인팅 없음(지운 것·그려 넣은 것 없음) · 해상도: 창 부분 원본 긴 변 6186px → 마스터 4096px (×0.6620000004768372)
- **한계**: 균열 수리 납선이 많다(실물). 색 보정 최소.
- **어울리는 성당**: basic — reference(다른 성당의 창, 표시 필요), myeongdong — reference(다른 성당의 창, 표시 필요)

### `leoben_annunciation` — 주님 탄생 예고 (레오벤)

- **원어/영어 제목**: The Annunciation from the Parish Church of Maria am Waasen in Leoben
- **위치**: 클리블랜드 미술관 소장(원래 오스트리아 레오벤 마리아 암 바젠 성당)
- **제작 시기 · 작가**: c. 1410–1420년 · 작가 미상(오스트리아 슈타이어마르크)
- **형태**: panel · **실제 크기**: 0.49×0.73 m · 마스터 가로세로비 0.6838
- **주제**: 가브리엘 대천사가 성모 마리아에게 예수의 잉태를 알리는 장면. 천사의 띠에 인사말이 적혀 있다.
- **사진 출처**: [The Annunciation from the Parish Church of Maria am Waasen in Leoben](https://clevelandart.org/art/2024.171.1) · 작가 The Cleveland Museum of Art (Open Access) · **CC0 1.0** (https://creativecommons.org/publicdomain/zero/1.0/) · 확인일 2026-11-12
- **크레딧 문구**: The Annunciation from the Parish Church of Maria am Waasen in Leoben, c. 1410–20. Austria, Styria, 15th century. Stained glass; overall: 73 x 49 cm (28 3/4 x 19 5/16 in.). The Cleveland Museum of Art, Leonard C. Hanna Jr. Fund, 2024.171.1 (CC0, Open Access)
- **받은 원본**: `assets/church/glass_src/leoben_annunciation_orig.jpg` — original TIFF downsampled to 9000px re-encoded JPEG q95 4:4:4 6155×9000 (Commons/미술관 원본 7475×10930)
- **파일**: `assets/church/glass_leoben_annunciation.webp` 2801×4096 5.51MB q90 · `assets/church/glass_leoben_annunciation_2k.webp` 1400×2048 1.28MB q90 · `assets/church/glass_leoben_annunciation_1k.webp` 700×1024 0.33MB q90
- **색감**: 노랑 천사, 파랑 성모, 빨강 바탕.
- **복원 내용**: 기하: 직사각 크롭(투시 보정 없음) · 윤곽: 직사각(알파 전체 불투명) · 검은점(베일링 글레어 제거, 세 채널 동일값) [0.0, 0.0, 0.0] · 플랫필드 보정 안 함 · 화이트밸런스 게인 RGB [1.0, 1.0, 1.0] (보정 안 함) · 노출 ×0.96, 감마 0.82, 채도(Lab 크로마, 색상각 유지) ×1.0 · 노이즈 제거 h=0, 언샤프 0.35/σ1.1 · 인페인팅 없음(지운 것·그려 넣은 것 없음) · 해상도: 창 부분 원본 긴 변 9000px → 마스터 4096px (×0.45500001311302185)
- **한계**: 미술관 촬영본(CC0), 색 보정 최소. 9000px 로 줄인 JPEG 보관(원 TIFF 7475×10930). 패널 가장자리가 사진 테두리에 거의 닿아 있어 직사각 전체를 그대로 씀.
- **어울리는 성당**: basic — reference(다른 성당의 창, 표시 필요), myeongdong — reference(다른 성당의 창, 표시 필요)

### `leoben_magi` — 동방 박사들의 경배 (레오벤)

- **원어/영어 제목**: The Adoration of the Magi from the Parish Church of Maria am Waasen in Leoben
- **위치**: 클리블랜드 미술관 소장(원래 오스트리아 레오벤 마리아 암 바젠 성당)
- **제작 시기 · 작가**: c. 1410–1420년 · 작가 미상(오스트리아 슈타이어마르크)
- **형태**: panel · **실제 크기**: 0.49×0.72 m · 마스터 가로세로비 0.6714
- **주제**: 성모의 무릎에 앉은 아기 예수에게 세 박사가 예물을 바치는 장면.
- **사진 출처**: [The Adoration of the Magi from the Parish Church of Maria am Waasen in Leoben](https://clevelandart.org/art/2024.171.2) · 작가 The Cleveland Museum of Art (Open Access) · **CC0 1.0** (https://creativecommons.org/publicdomain/zero/1.0/) · 확인일 2026-11-12
- **크레딧 문구**: The Adoration of the Magi from the Parish Church of Maria am Waasen in Leoben, c. 1410–20. Austria, Styria, 15th century. Stained glass; overall: 72 x 49 cm (28 3/8 x 19 5/16 in.). The Cleveland Museum of Art, Leonard C. Hanna Jr. Fund, 2024.171.2 (CC0, Open Access)
- **받은 원본**: `assets/church/glass_src/leoben_magi_orig.jpg` — original TIFF downsampled to 9000px re-encoded JPEG q95 4:4:4 6042×9000 (Commons/미술관 원본 7398×11020)
- **파일**: `assets/church/glass_leoben_magi.webp` 2750×4096 5.12MB q90 · `assets/church/glass_leoben_magi_2k.webp` 1375×2048 1.24MB q90 · `assets/church/glass_leoben_magi_1k.webp` 688×1024 0.32MB q90
- **색감**: 파랑 다마스크 바탕, 녹색·자주 옷.
- **복원 내용**: 기하: 직사각 크롭(투시 보정 없음) · 윤곽: 직사각(알파 전체 불투명) · 검은점(베일링 글레어 제거, 세 채널 동일값) [0.0, 0.0, 0.0] · 플랫필드 보정 안 함 · 화이트밸런스 게인 RGB [1.0, 1.0, 1.0] (보정 안 함) · 노출 ×0.96, 감마 0.82, 채도(Lab 크로마, 색상각 유지) ×1.0 · 노이즈 제거 h=0, 언샤프 0.35/σ1.1 · 인페인팅 없음(지운 것·그려 넣은 것 없음) · 해상도: 창 부분 원본 긴 변 9000px → 마스터 4096px (×0.45500001311302185)
- **한계**: 미술관 촬영본(CC0), 색 보정 최소. 9000px JPEG 보관(원 TIFF 7398×11020).
- **어울리는 성당**: basic — reference(다른 성당의 창, 표시 필요), myeongdong — reference(다른 성당의 창, 표시 필요)

### `panel_gethsemane` — 겟세마니 동산의 그리스도

- **원어/영어 제목**: Christ in the Garden of Gethsemane
- **위치**: 클리블랜드 미술관 소장(원래 독일 쾰른 근처 마리아발트 수도원 회랑)
- **제작 시기 · 작가**: 1522–1526년 · 에버하르트 렌지히 또는 게르하르트 레미슈
- **형태**: panel · **실제 크기**: 0.718×0.737 m · 마스터 가로세로비 0.8984
- **주제**: 잠든 제자들과 다가오는 병사들 사이에서 기도하는 그리스도. 시토회 마리아발트 수도원 회랑의 구약·신약 연작 가운데 하나다.
- **사진 출처**: [Christ in the Garden of Gethsemane](https://clevelandart.org/art/1940.340.1) · 작가 The Cleveland Museum of Art (Open Access) · **CC0 1.0** (https://creativecommons.org/publicdomain/zero/1.0/) · 확인일 2026-11-12
- **크레딧 문구**: Christ in the Garden of Gethsemane, 1522–26. Everhard Rensig (German), or Gerhard Remisch (German). Pot-metal and white glass, silver stain and sanguine; overall: 73.7 x 71.8 cm (29 x 28 1/4 in.). The Cleveland Museum of Art, Gift of S. Livingstone Mather, Constance Mather Bishop, Philip R. Mather, Katherine Hoyt Cross, and Katherine Mather McLean in accordance with the wishes of Samuel Mather, 1940.340.1 (CC0, Open Access)
- **받은 원본**: `assets/church/glass_src/panel_gethsemane_orig.jpg` — original TIFF re-encoded JPEG q95 4:4:4 5394×6003 (Commons/미술관 원본 5394×6003)
- **파일**: `assets/church/glass_panel_gethsemane.webp` 3680×4096 4.63MB q90 · `assets/church/glass_panel_gethsemane_2k.webp` 1840×2048 1.18MB q90 · `assets/church/glass_panel_gethsemane_1k.webp` 920×1024 0.31MB q90
- **색감**: 녹색 풍경, 붉은 옷, 흰 유리와 은염.
- **복원 내용**: 기하: 직사각 크롭(투시 보정 없음) · 윤곽: 직사각(알파 전체 불투명) · 검은점(베일링 글레어 제거, 세 채널 동일값) [0.0, 0.0, 0.0] · 플랫필드 보정 안 함 · 화이트밸런스 게인 RGB [1.0, 1.0, 1.0] (보정 안 함) · 노출 ×1.04, 감마 0.82, 채도(Lab 크로마, 색상각 유지) ×1.0 · 노이즈 제거 h=0, 언샤프 0.35/σ1.1 · 인페인팅 없음(지운 것·그려 넣은 것 없음) · 해상도: 창 부분 원본 긴 변 6003px → 마스터 4096px (×0.6819999814033508)
- **한계**: 색 보정 최소. 9000px 이하 원본 그대로.
- **어울리는 성당**: basic — reference(다른 성당의 창, 표시 필요)

### `grisaille_aconite` — 투구꽃 잎 그리자유 패널

- **원어/영어 제목**: Stained Glass Panel with Aconite Leaves
- **위치**: 클리블랜드 미술관 소장 · 프랑스(알자스?) 제작
- **제작 시기 · 작가**: c. 1275–1300년 · 작가 미상
- **형태**: lancet(뾰족 아치 패널) · **실제 크기**: 0.334×0.559 m · 마스터 가로세로비 0.4814
- **주제**: 무색 유리에 잎무늬를 그린 그리자유 패널로, 색유리 테두리를 둘렀다.
- **verify**: 원래 설치 장소는 미술관도 알 수 없다고 밝힘.
- **사진 출처**: [Stained Glass Panel with Aconite Leaves](https://clevelandart.org/art/1977.89) · 작가 The Cleveland Museum of Art (Open Access) · **CC0 1.0** (https://creativecommons.org/publicdomain/zero/1.0/) · 확인일 2026-11-12
- **크레딧 문구**: Stained Glass Panel with Aconite Leaves, c. 1275–1300. France, Alsace(?), 13th century. Pot-metal and white glass, silver stain; overall: 55.9 x 33.4 cm (22 x 13 1/8 in.). The Cleveland Museum of Art, Gift of Ella Brummer in Memory of her Husband, Ernest Brummer, 1977.89 (CC0, Open Access)
- **받은 원본**: `assets/church/glass_src/grisaille_aconite_orig.jpg` — original TIFF re-encoded JPEG q95 4:4:4 2407×4012 (Commons/미술관 원본 2407×4012)
- **파일**: `assets/church/glass_grisaille_aconite.webp` 1972×4096 1.72MB q90 · `assets/church/glass_grisaille_aconite_2k.webp` 986×2048 0.49MB q90 · `assets/church/glass_grisaille_aconite_1k.webp` 493×1024 0.15MB q90
- **색감**: 회백색 그리자유, 빨강·노랑 테두리.
- **복원 내용**: 기하: 직사각 크롭(투시 보정 없음) · 윤곽: 뾰족 아치 알파(해석적) · 검은점(베일링 글레어 제거, 세 채널 동일값) [0.057, 0.057, 0.057] · 플랫필드 보정 안 함 · 화이트밸런스 게인 RGB [1.0, 1.0, 1.0] (보정 안 함) · 노출 ×1.21, 감마 0.97, 채도(Lab 크로마, 색상각 유지) ×1.0 · 노이즈 제거 h=0, 언샤프 0.35/σ1.1 · 인페인팅 없음(지운 것·그려 넣은 것 없음) · 해상도: 창 부분 원본 긴 변 3957px → 마스터 4096px (×1.034999966621399) — 확대본
- **한계**: 뒤의 블라인드가 비치는 설치 사진이라 무색 유리 뒤로 가로 줄이 약하게 보인다(지우지 않음). 뾰족 아치 윤곽은 해석적 마스크(곡률 k=1.05)로 잘랐다.
- **어울리는 성당**: basic — reference(다른 성당의 창, 표시 필요), lateran — reference(다른 성당의 창, 표시 필요)

### `alabaster_stpaul_1` — 성 바오로 대성전 알라바스터 창 (1)

- **원어/영어 제목**: Alabaster window, Basilica of Saint Paul Outside the Walls (02)
- **위치**: 성 바오로 대성전(산 파올로 푸오리 레 무라) · 로마 · 이탈리아
- **제작 시기 · 작가**: 19세기 재건(1823년 화재 이후) 이후 · 작가 미상
- **형태**: lancet(반원 아치 창) · **실제 크기**: 미상 · 마스터 가로세로비 0.521
- **주제**: 유리 대신 얇게 켠 알라바스터(설화석고) 판을 끼운 반원 아치 창. 돌의 물결 무늬가 좌우 대칭(북매치)으로 배열되어 꿀색의 은은한 빛을 들인다.
- **verify**: 알라바스터 판의 기증·설치 연도는 확인하지 못함.
- **사진 출처**: [File:Alabaster window of the Basilica of Saint Paul Outside the Walls 02.jpg](https://commons.wikimedia.org/wiki/File:Alabaster_window_of_the_Basilica_of_Saint_Paul_Outside_the_Walls_02.jpg) · 작가 Szilas · **CC BY 4.0** (https://creativecommons.org/licenses/by/4.0/) · 확인일 2026-11-12
- **크레딧 문구** (필수): "Alabaster window of the Basilica of Saint Paul Outside the Walls 02" by Szilas, CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/), via Wikimedia Commons — 크롭·투시/색 보정함
- **받은 원본**: `assets/church/glass_src/alabaster_stpaul_1_orig.jpg` — thumb1920 1920×2880 (Commons/미술관 원본 3168×4752)
- **파일**: `assets/church/glass_alabaster_stpaul_1.webp` 1770×3397 3.01MB q90 · `assets/church/glass_alabaster_stpaul_1_2k.webp` 1067×2048 1.19MB q90 · `assets/church/glass_alabaster_stpaul_1_1k.webp` 534×1024 0.30MB q90
- **색감**: 크림·꿀색·갈색 줄무늬, 검은 금속 틀.
- **복원 내용**: 기하: 자동 사다리꼴 보정(위/아래 폭 비 1.0) · 윤곽: 밝은 유리 영역의 볼록 껍질(창 개구부)로 알파 생성 · 검은점(베일링 글레어 제거, 세 채널 동일값) [0.0, 0.0, 0.0] · 플랫필드: 1차(선형) 기울기만 보정, 측정된 밝기 기울기 1.61배 중 최대 ±25% 범위·강도 0.6 · 화이트밸런스 게인 RGB [0.978, 1.0, 1.038] (밝은 무채색 유리 기준, ±5% 제한) · 노출 ×0.89, 감마 1.0, 채도(Lab 크로마, 색상각 유지) ×1.15 · 노이즈 제거 h=3, 언샤프 0.5/σ1.1 · 인페인팅 없음(지운 것·그려 넣은 것 없음) · 해상도: 창 부분 원본 긴 변 2265px → 마스터 3397px (×1.5) — 확대본
- **한계**: 원본 사진이 1920px 썸네일이라 1.5배 확대됨.
- **어울리는 성당**: stpaul — authentic(실물), lateran — reference(다른 성당의 창, 표시 필요), maggiore — reference(다른 성당의 창, 표시 필요)

### `alabaster_stpaul_2` — 성 바오로 대성전 알라바스터 창 (2)

- **원어/영어 제목**: Alabaster window, Basilica of Saint Paul Outside the Walls (04)
- **위치**: 성 바오로 대성전 · 로마 · 이탈리아
- **제작 시기 · 작가**: 19세기 재건 이후 · 작가 미상
- **형태**: lancet(반원 아치 창) · **실제 크기**: 미상 · 마스터 가로세로비 0.5086
- **주제**: 같은 대성전의 다른 알라바스터 창. 세로 줄무늬가 촘촘한 판을 격자 틀에 끼웠다.
- **verify**: 설치 연도 미확인.
- **사진 출처**: [File:Alabaster window of the Basilica of Saint Paul Outside the Walls 04.jpg](https://commons.wikimedia.org/wiki/File:Alabaster_window_of_the_Basilica_of_Saint_Paul_Outside_the_Walls_04.jpg) · 작가 Szilas · **CC BY 4.0** (https://creativecommons.org/licenses/by/4.0/) · 확인일 2026-11-12
- **크레딧 문구** (필수): "Alabaster window of the Basilica of Saint Paul Outside the Walls 04" by Szilas, CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/), via Wikimedia Commons — 크롭·투시/색 보정함
- **받은 원본**: `assets/church/glass_src/alabaster_stpaul_2_orig.jpg` — thumb1920 1920×2880 (Commons/미술관 원본 3168×4752)
- **파일**: `assets/church/glass_alabaster_stpaul_2.webp` 1770×3480 3.62MB q90 · `assets/church/glass_alabaster_stpaul_2_2k.webp` 1042×2048 1.30MB q90 · `assets/church/glass_alabaster_stpaul_2_1k.webp` 521×1024 0.31MB q90
- **색감**: 흰색~황토색 세로 줄무늬.
- **복원 내용**: 기하: 자동 사다리꼴 보정(위/아래 폭 비 1.0) · 윤곽: 밝은 유리 영역의 볼록 껍질(창 개구부)로 알파 생성 · 검은점(베일링 글레어 제거, 세 채널 동일값) [0.0, 0.0, 0.0] · 플랫필드: 1차(선형) 기울기만 보정, 측정된 밝기 기울기 1.35배 중 최대 ±25% 범위·강도 0.6 · 화이트밸런스 게인 RGB [0.987, 1.0, 1.037] (밝은 무채색 유리 기준, ±5% 제한) · 노출 ×0.91, 감마 1.07, 채도(Lab 크로마, 색상각 유지) ×1.15 · 노이즈 제거 h=3, 언샤프 0.5/σ1.1 · 인페인팅 없음(지운 것·그려 넣은 것 없음) · 해상도: 창 부분 원본 긴 변 2320px → 마스터 3480px (×1.5) — 확대본
- **한계**: 1920px 썸네일 원본, 1.5배 확대.
- **어울리는 성당**: stpaul — authentic(실물), lateran — reference(다른 성당의 창, 표시 필요), maggiore — reference(다른 성당의 창, 표시 필요)

### `alabaster_slab` — 갈라 플라치디아 영묘의 알라바스터 창

- **원어/영어 제목**: Alabaster window, Mausoleum of Galla Placidia
- **위치**: 갈라 플라치디아 영묘 · 라벤나 · 이탈리아
- **제작 시기 · 작가**: 건물 5세기(c. 425–450) · 알라바스터 판 자체의 제작 시기 미상
- **형태**: panel(단일 석판) · **실제 크기**: 미상 · 마스터 가로세로비 0.7085
- **주제**: 작은 직사각 창구멍에 알라바스터 석판 한 장을 끼운 창. 납선이나 틀 없이 돌결만으로 호박색 빛이 스민다.
- **verify**: 현재 석판은 근대에 교체된 것으로 알려져 있으나 연도는 확인하지 못함.
- **사진 출처**: [File:Alabaster window in the Mausoleum of Galla Placidia, 425-50; Ravenna (2).jpg](https://commons.wikimedia.org/wiki/File:Alabaster_window_in_the_Mausoleum_of_Galla_Placidia,_425-50%3B_Ravenna_(2).jpg) · 작가 Richard Mortel · **CC BY 2.0** (https://creativecommons.org/licenses/by/2.0/) · 확인일 2026-11-12
- **크레딧 문구** (필수): "Alabaster window in the Mausoleum of Galla Placidia, 425-50; Ravenna (2)" by Richard Mortel, CC BY 2.0 (https://creativecommons.org/licenses/by/2.0/), via Wikimedia Commons — 크롭·투시/색 보정함
- **받은 원본**: `assets/church/glass_src/alabaster_slab_orig.jpg` — thumb1920 1920×2948 (Commons/미술관 원본 3504×5380)
- **파일**: `assets/church/glass_alabaster_slab.webp` 1344×1897 0.33MB q90 · `assets/church/glass_alabaster_slab_2k.webp` 1344×1897 0.33MB q90 · `assets/church/glass_alabaster_slab_1k.webp` 725×1024 0.16MB q90
- **색감**: 꿀색·호박색·주황 띠.
- **복원 내용**: 기하: 손으로 잡은 4점 투시 보정 · 윤곽: 직사각(알파 전체 불투명) · 검은점(베일링 글레어 제거, 세 채널 동일값) [0.05, 0.05, 0.05] · 플랫필드: 1차(선형) 기울기만 보정, 측정된 밝기 기울기 1.13배 중 최대 ±25% 범위·강도 0.6 · 화이트밸런스 게인 RGB [0.989, 1.0, 1.05] (밝은 무채색 유리 기준, ±5% 제한) · 노출 ×0.93, 감마 1.35, 채도(Lab 크로마, 색상각 유지) ×1.15 · 노이즈 제거 h=3, 언샤프 0.5/σ1.1 · 인페인팅 없음(지운 것·그려 넣은 것 없음) · 해상도: 창 부분 원본 긴 변 1265px → 마스터 1897px (×1.5) — 확대본
- **한계**: 비스듬히 찍힌 사진을 4점 투시 보정. 원본 해상도가 낮아(석판 부분 약 850×1260px) 1.5배 확대본이며 4096 마스터가 아님. 석판의 금(crack)은 실물 그대로 둠.
- **어울리는 성당**: stpaul — reference(다른 성당의 창, 표시 필요), lateran — reference(다른 성당의 창, 표시 필요), maggiore — reference(다른 성당의 창, 표시 필요), stpeter — reference(다른 성당의 창, 표시 필요)

### `oculus_florence_donatello` — 성모 대관 오큘러스

- **원어/영어 제목**: Coronation of the Virgin (Incoronazione della Vergine)
- **위치**: 피렌체 대성당(산타 마리아 델 피오레) 쿠폴라 드럼 · 피렌체 · 이탈리아
- **제작 시기 · 작가**: 1434–1437년 · 밑그림 도나텔로
- **형태**: oculus · **실제 크기**: 지름 3.8 m (est) · 마스터 가로세로비 1.0
- **주제**: 쿠폴라 드럼의 여덟 개 원형 창 가운데 하나로, 그리스도가 성모 마리아에게 관을 씌우는 장면이다. 큰 인물 두 명이 원 전체를 채운다.
- **verify**: 지름 약 3.8m 는 추정치. 유리 제작자 이름은 확인하지 못함.
- **사진 출처**: [File:Donatello, incoronazione della vergine.jpg](https://commons.wikimedia.org/wiki/File:Donatello,_incoronazione_della_vergine.jpg) · 작가 Sailko (스캔) · 밑그림 Donatello · **Public domain** (https://commons.wikimedia.org/wiki/Commons:Licensing#Material_in_the_public_domain) · 확인일 2026-11-12
- **크레딧 문구**: (표시 의무 없음) Sailko (스캔) · 밑그림 Donatello, Public domain, via Wikimedia Commons
- **받은 원본**: `assets/church/glass_src/oculus_florence_donatello_orig.jpg` — thumb1920 1920×1906 (Commons/미술관 원본 2409×2391)
- **파일**: `assets/church/glass_oculus_florence_donatello.webp` 2859×2859 1.23MB q90 · `assets/church/glass_oculus_florence_donatello_2k.webp` 2048×2048 0.81MB q90 · `assets/church/glass_oculus_florence_donatello_1k.webp` 1024×1024 0.35MB q90
- **색감**: 진한 빨강·흰색·녹색·파랑, 큰 유리 조각.
- **복원 내용**: 기하: 타원→원 보정(축 [1586.4, 1590.0], 회전 없는 대칭 아핀) · 윤곽: 원형 알파 · 검은점(베일링 글레어 제거, 세 채널 동일값) [0.0, 0.0, 0.0] · 플랫필드: 1차(선형) 기울기만 보정, 측정된 밝기 기울기 17.05배 중 최대 ±25% 범위·강도 0.6 · 화이트밸런스 게인 RGB [0.991, 1.0, 1.05] (밝은 무채색 유리 기준, ±5% 제한) · 노출 ×0.92, 감마 0.63, 채도(Lab 크로마, 색상각 유지) ×1.15 · 노이즈 제거 h=3, 언샤프 0.5/σ1.1 · 인페인팅 없음(지운 것·그려 넣은 것 없음) · 해상도: 창 부분 원본 긴 변 1906px → 마스터 2859px (×1.5) — 확대본
- **한계**: 책 도판 스캔(PD-Art) 1920px 썸네일 → 1.5배 확대. 수평 철제 보강대와 균열 수리 납선은 실물이므로 그대로 둠. 인쇄 망점이 약하게 남아 있을 수 있음.
- **어울리는 성당**: florence — authentic(실물)

### `oculus_florence_ghiberti_1` — 성모 승천 오큘러스

- **원어/영어 제목**: Assumption of the Virgin (Assunzione di Maria)
- **위치**: 피렌체 대성당 정면 중앙 오큘러스 · 피렌체 · 이탈리아
- **제작 시기 · 작가**: 1404–1405년 · 밑그림 로렌초 기베르티
- **형태**: oculus · **실제 크기**: 미상 · 마스터 가로세로비 1.0
- **주제**: 정면 중앙의 원형 창으로, 천사들에게 둘러싸여 하늘로 올라가는 성모를 그렸다.
- **verify**: 유리 제작자(니콜로 디 피에로 테데스코로 전함)와 지름은 확인하지 못함.
- **사진 출처**: [File:Ghiberti, assunzione di maria.jpg](https://commons.wikimedia.org/wiki/File:Ghiberti,_assunzione_di_maria.jpg) · 작가 Sailko (스캔) · 밑그림 Lorenzo Ghiberti · **Public domain** (https://commons.wikimedia.org/wiki/Commons:Licensing#Material_in_the_public_domain) · 확인일 2026-11-12
- **크레딧 문구**: (표시 의무 없음) Sailko (스캔) · 밑그림 Lorenzo Ghiberti, Public domain, via Wikimedia Commons
- **받은 원본**: `assets/church/glass_src/oculus_florence_ghiberti_1_orig.jpg` — thumb960 960×946 (Commons/미술관 원본 1249×1231)
- **파일**: `assets/church/glass_oculus_florence_ghiberti_1.webp` 1447×1447 0.53MB q90 · `assets/church/glass_oculus_florence_ghiberti_1_2k.webp` 1447×1447 0.53MB q90 · `assets/church/glass_oculus_florence_ghiberti_1_1k.webp` 1024×1024 0.35MB q90
- **색감**: 금색 광배, 빨강·파랑 배경, 메달리온 테두리.
- **복원 내용**: 기하: 타원→원 보정(축 [948.8, 964.7], 회전 없는 대칭 아핀) · 윤곽: 원형 알파 · 검은점(베일링 글레어 제거, 세 채널 동일값) [0.05, 0.05, 0.05] · 플랫필드: 1차(선형) 기울기만 보정, 측정된 밝기 기울기 1.85배 중 최대 ±25% 범위·강도 0.6 · 화이트밸런스 게인 RGB [0.954, 1.0, 1.05] (밝은 무채색 유리 기준, ±5% 제한) · 노출 ×0.87, 감마 1.0, 채도(Lab 크로마, 색상각 유지) ×1.15 · 노이즈 제거 h=3, 언샤프 0.5/σ1.1 · 인페인팅 없음(지운 것·그려 넣은 것 없음) · 해상도: 창 부분 원본 긴 변 965px → 마스터 1447px (×1.5) — 확대본
- **한계**: 원본이 책 스캔 1249px(받은 것은 960px 썸네일)뿐이라 저해상도. 1.5배까지만 확대했고 4096 마스터가 아님.
- **어울리는 성당**: florence — authentic(실물)

### `oculus_florence_ghiberti_2` — 주님 승천 오큘러스

- **원어/영어 제목**: Ascension of Christ (Ascensione)
- **위치**: 피렌체 대성당 쿠폴라 드럼 · 피렌체 · 이탈리아
- **제작 시기 · 작가**: 1443년경 · 밑그림 로렌초 기베르티
- **형태**: oculus · **실제 크기**: 미상 · 마스터 가로세로비 1.0
- **주제**: 쿠폴라 드럼의 원형 창으로, 사도들 위로 그리스도가 하늘로 오르는 장면이다. 넓은 꽃무늬 테두리가 둘러싼다.
- **verify**: 유리 제작자와 지름은 확인하지 못함.
- **사진 출처**: [File:Ghiberti, ascensione.jpg](https://commons.wikimedia.org/wiki/File:Ghiberti,_ascensione.jpg) · 작가 Sailko (스캔) · 밑그림 Lorenzo Ghiberti · **Public domain** (https://commons.wikimedia.org/wiki/Commons:Licensing#Material_in_the_public_domain) · 확인일 2026-11-12
- **크레딧 문구**: (표시 의무 없음) Sailko (스캔) · 밑그림 Lorenzo Ghiberti, Public domain, via Wikimedia Commons
- **받은 원본**: `assets/church/glass_src/oculus_florence_ghiberti_2_orig.jpg` — thumb960 960×949 (Commons/미술관 원본 1249×1235)
- **파일**: `assets/church/glass_oculus_florence_ghiberti_2.webp` 1440×1440 0.41MB q90 · `assets/church/glass_oculus_florence_ghiberti_2_2k.webp` 1440×1440 0.41MB q90 · `assets/church/glass_oculus_florence_ghiberti_2_1k.webp` 1024×1024 0.27MB q90
- **색감**: 녹색·노랑 테두리, 파랑 하늘, 흰 옷.
- **복원 내용**: 기하: 타원→원 보정(축 [954.4, 965.9], 회전 없는 대칭 아핀) · 윤곽: 원형 알파 · 검은점(베일링 글레어 제거, 세 채널 동일값) [0.033, 0.033, 0.033] · 플랫필드: 1차(선형) 기울기만 보정, 측정된 밝기 기울기 2.05배 중 최대 ±25% 범위·강도 0.6 · 화이트밸런스 게인 RGB [1.004, 1.0, 1.05] (밝은 무채색 유리 기준, ±5% 제한) · 노출 ×0.83, 감마 1.0, 채도(Lab 크로마, 색상각 유지) ×1.15 · 노이즈 제거 h=3, 언샤프 0.5/σ1.1 · 인페인팅 없음(지운 것·그려 넣은 것 없음) · 해상도: 창 부분 원본 긴 변 960px → 마스터 1440px (×1.5) — 확대본
- **한계**: 원본이 책 스캔 1249px(960px 썸네일)뿐이라 저해상도. 4096 마스터가 아님.
- **어울리는 성당**: florence — authentic(실물)

### `rose_chartres_north` — 샤르트르 북쪽 장미창과 랜싯

- **원어/영어 제목**: North rose window and lancets (Rose de France)
- **위치**: 샤르트르 대성당 북쪽 익랑 · 샤르트르 · 프랑스
- **제작 시기 · 작가**: c. 1235년 · 작가 미상
- **형태**: rose · **실제 크기**: 폭/지름 10.5 m · 마스터 가로세로비 0.643
- **주제**: 성모 마리아를 찬미하는 장미창으로, 중심의 성모자를 비둘기·천사, 유다의 임금들, 예언자들이 동심원으로 둘러싼다. 아래 다섯 랜싯 가운데에는 어린 마리아를 안은 성 안나가 있다. 카스티야의 블랑슈 왕비의 기증으로 전해진다.
- **verify**: 장미창 지름 10.5m 는 통상 인용되는 값. 랜싯을 포함한 전체 높이는 확인하지 못함.
- **사진 출처**: [File:Chartres - cathédrale - rosace nord.jpg](https://commons.wikimedia.org/wiki/File:Chartres_-_cath%C3%A9drale_-_rosace_nord.jpg) · 작가 Eusebius · **Public domain** (https://commons.wikimedia.org/wiki/Commons:Licensing#Material_in_the_public_domain) · 확인일 2026-11-12
- **크레딧 문구**: (표시 의무 없음) Eusebius, Public domain, via Wikimedia Commons
- **받은 원본**: `assets/church/glass_src/rose_chartres_north_orig.jpg` — thumb1920 1920×2658 (Commons/미술관 원본 2167×3000)
- **파일**: `assets/church/glass_rose_chartres_north.webp` 2091×3252 2.13MB q90 · `assets/church/glass_rose_chartres_north_2k.webp` 1317×2048 1.05MB q90 · `assets/church/glass_rose_chartres_north_1k.webp` 658×1024 0.33MB q90
- **색감**: 샤르트르 블루와 루비 레드, 금색 백합 문장.
- **복원 내용**: 기하: 자동 사다리꼴 보정(위/아래 폭 비 0.89) · 윤곽: 밝은 유리 영역의 볼록 껍질(창 개구부)로 알파 생성 · 검은점(베일링 글레어 제거, 세 채널 동일값) [0.0, 0.0, 0.0] · 플랫필드: 1차(선형) 기울기만 보정, 측정된 밝기 기울기 1.33배 중 최대 ±25% 범위·강도 0.6 · 화이트밸런스 게인 RGB [1.049, 1.0, 1.007] (밝은 무채색 유리 기준, ±5% 제한) · 노출 ×0.88, 감마 0.6, 채도(Lab 크로마, 색상각 유지) ×1.15 · 노이즈 제거 h=3, 언샤프 0.5/σ1.1 · 인페인팅 없음(지운 것·그려 넣은 것 없음) · 해상도: 창 부분 원본 긴 변 2168px → 마스터 3252px (×1.5) — 확대본
- **한계**: 아래에서 올려 찍은 사진을 자동 사다리꼴 보정. 장미창과 랜싯 사이의 벽(판형 트레이서리)은 사진에서 완전히 검게 찍혀 돌의 질감은 보이지 않는다. 1920px 썸네일 → 1.5배 확대.
- **어울리는 성당**: basic — reference(다른 성당의 창, 표시 필요), myeongdong — reference(다른 성당의 창, 표시 필요)

### `rose_chartres_west` — 샤르트르 서쪽 장미창 (최후의 심판)

- **원어/영어 제목**: West rose window (Last Judgement)
- **위치**: 샤르트르 대성당 서쪽 정면 · 샤르트르 · 프랑스
- **제작 시기 · 작가**: c. 1215년 · 작가 미상
- **형태**: rose · **실제 크기**: 지름 12.0 m (est) · 마스터 가로세로비 1.0
- **주제**: 최후의 심판을 주제로 한 판형 트레이서리 장미창. 중심의 심판자 그리스도를 사도·천사와 부활하는 이들이 둘러싼다.
- **verify**: 지름 약 12m 는 추정치.
- **사진 출처**: [File:Vitrail Chartres-rosace 143 +net & corrigée.jpg](https://commons.wikimedia.org/wiki/File:Vitrail_Chartres-rosace_143_%2Bnet_%26_corrig%C3%A9e.jpg) · 작가 Micheletb (Michelet-密是力) · **Public domain** (https://commons.wikimedia.org/wiki/Commons:Licensing#Material_in_the_public_domain) · 확인일 2026-11-12
- **크레딧 문구**: (표시 의무 없음) Micheletb (Michelet-密是力), Public domain, via Wikimedia Commons
- **받은 원본**: `assets/church/glass_src/rose_chartres_west_orig.jpg` — thumb1920 1920×1920 (Commons/미술관 원본 3022×3022)
- **파일**: `assets/church/glass_rose_chartres_west.webp` 2793×2793 1.58MB q90 · `assets/church/glass_rose_chartres_west_2k.webp` 2048×2048 0.97MB q90 · `assets/church/glass_rose_chartres_west_1k.webp` 1024×1024 0.31MB q90
- **색감**: 파랑·빨강 위주, 검은 석재 면적이 넓음.
- **복원 내용**: 기하: 타원→원 보정(축 [1545.0, 1558.4], 회전 없는 대칭 아핀) · 윤곽: 원형 알파 · 검은점(베일링 글레어 제거, 세 채널 동일값) [0.0, 0.0, 0.0] · 플랫필드: 1차(선형) 기울기만 보정, 측정된 밝기 기울기 1.91배 중 최대 ±25% 범위·강도 0.6 · 화이트밸런스 게인 RGB [1.04, 1.0, 1.046] (밝은 무채색 유리 기준, ±5% 제한) · 노출 ×0.8, 감마 0.6, 채도(Lab 크로마, 색상각 유지) ×1.15 · 노이즈 제거 h=3, 언샤프 0.5/σ1.1 · 인페인팅 없음(지운 것·그려 넣은 것 없음) · 해상도: 창 부분 원본 긴 변 1862px → 마스터 2793px (×1.5) — 확대본
- **한계**: 업로더가 이미 정면 보정·선명화한 사진(PD). 석재는 검게 찍힘. 1920px 썸네일 → 1.5배 확대.
- **어울리는 성당**: basic — reference(다른 성당의 창, 표시 필요), myeongdong — reference(다른 성당의 창, 표시 필요)

### `rose_chartres_south` — 샤르트르 남쪽 장미창

- **원어/영어 제목**: South rose window (Christ in Glory)
- **위치**: 샤르트르 대성당 남쪽 익랑 · 샤르트르 · 프랑스
- **제작 시기 · 작가**: c. 1225–1230년 · 작가 미상
- **형태**: rose · **실제 크기**: 지름 10.5 m (est) · 마스터 가로세로비 1.0
- **주제**: 영광의 그리스도를 중심으로 묵시록의 스물네 원로가 둘러앉은 장미창. 드뢰-브르타뉴 가문의 기증으로 전해진다.
- **verify**: 지름은 추정치(북쪽 장미창과 같은 크기로 봄).
- **사진 출처**: [File:Vitrail Chartres-122.jpg](https://commons.wikimedia.org/wiki/File:Vitrail_Chartres-122.jpg) · 작가 Micheletb (Michelet-密是力) · **Public domain** (https://commons.wikimedia.org/wiki/Commons:Licensing#Material_in_the_public_domain) · 확인일 2026-11-12
- **크레딧 문구**: (표시 의무 없음) Micheletb (Michelet-密是力), Public domain, via Wikimedia Commons
- **받은 원본**: `assets/church/glass_src/rose_chartres_south_orig.jpg` — thumb1920 1920×2880 (Commons/미술관 원본 3456×5184)
- **파일**: `assets/church/glass_rose_chartres_south.webp` 2141×2141 1.41MB q90 · `assets/church/glass_rose_chartres_south_2k.webp` 2048×2048 1.31MB q90 · `assets/church/glass_rose_chartres_south_1k.webp` 1024×1024 0.47MB q90
- **색감**: 파랑·빨강·보라.
- **복원 내용**: 기하: 타원→원 보정(축 [1006.9, 1189.3], 회전 없는 대칭 아핀) · 윤곽: 원형 알파 · 검은점(베일링 글레어 제거, 세 채널 동일값) [0.0, 0.0, 0.0] · 플랫필드: 1차(선형) 기울기만 보정, 측정된 밝기 기울기 1.12배 중 최대 ±25% 범위·강도 0.6 · 화이트밸런스 게인 RGB [1.05, 1.0, 1.014] (밝은 무채색 유리 기준, ±5% 제한) · 노출 ×0.9, 감마 0.6, 채도(Lab 크로마, 색상각 유지) ×1.15 · 노이즈 제거 h=3, 언샤프 0.5/σ1.1 · 인페인팅 없음(지운 것·그려 넣은 것 없음) · 해상도: 창 부분 원본 긴 변 1427px → 마스터 2141px (×1.5) — 확대본
- **한계**: 아래에서 비스듬히 찍은 사진의 타원을 원으로 펴는 보정(대칭 아핀)이라 미세한 원근 왜곡이 남을 수 있다. 장미창 부분만 약 1400px → 1.5배 확대, 4096 마스터가 아님. 아래 랜싯은 포함하지 않음.
- **어울리는 성당**: basic — reference(다른 성당의 창, 표시 필요), myeongdong — reference(다른 성당의 창, 표시 필요)

### `lancet_chartres_belle` — 아름다운 창의 성모 (푸른 성모)

- **원어/영어 제목**: Notre-Dame de la Belle Verrière (Blue Virgin)
- **위치**: 샤르트르 대성당 남쪽 주보랑 (baie 30a) · 샤르트르 · 프랑스
- **제작 시기 · 작가**: 성모자 부분 c. 1180년, 둘레 천사·하단 장면 c. 1225년 · 작가 미상
- **형태**: lancet · **실제 크기**: 미상 · 마스터 가로세로비 0.5415
- **주제**: 옥좌에 앉아 아기 예수를 안은 성모를 그린 창으로, 성모의 밝은 하늘색 옷 때문에 「푸른 성모」라고도 불린다. 1194년 화재에서 살아남은 12세기 패널을 13세기 창에 다시 짜 넣었다. 아래에는 카나의 혼인 잔치와 그리스도의 유혹 장면이 있다.
- **verify**: 실측 크기는 확인하지 못함.
- **사진 출처**: [File:Chartres -30a- ND de la belle verrière and its angel border.jpg](https://commons.wikimedia.org/wiki/File:Chartres_-30a-_ND_de_la_belle_verri%C3%A8re_and_its_angel_border.jpg) · 작가 Micheletb (Michelet-密是力) · **Public domain** (https://commons.wikimedia.org/wiki/Commons:Licensing#Material_in_the_public_domain) · 확인일 2026-11-12
- **크레딧 문구**: (표시 의무 없음) Micheletb (Michelet-密是力), Public domain, via Wikimedia Commons
- **받은 원본**: `assets/church/glass_src/lancet_chartres_belle_orig.jpg` — thumb3840 3840×7198 (Commons/미술관 원본 4012×7520)
- **파일**: `assets/church/glass_lancet_chartres_belle.webp` 2218×4096 2.80MB q90 · `assets/church/glass_lancet_chartres_belle_2k.webp` 1109×2048 0.89MB q90 · `assets/church/glass_lancet_chartres_belle_1k.webp` 554×1024 0.30MB q90
- **색감**: 깊은 파랑과 루비 레드, 성모 옷은 밝은 하늘색.
- **복원 내용**: 기하: 창 윤곽에 맞춘 직사각 크롭(투시 보정 없음) · 윤곽: 밝은 유리 영역의 볼록 껍질(창 개구부)로 알파 생성 · 검은점(베일링 글레어 제거, 세 채널 동일값) [0.0, 0.0, 0.0] · 플랫필드: 1차(선형) 기울기만 보정, 측정된 밝기 기울기 2.09배 중 최대 ±25% 범위·강도 0.6 · 화이트밸런스 게인 RGB [1.05, 1.0, 1.031] (밝은 무채색 유리 기준, ±5% 제한) · 노출 ×0.84, 감마 0.6, 채도(Lab 크로마, 색상각 유지) ×1.15 · 노이즈 제거 h=3, 언샤프 0.5/σ1.1 · 인페인팅 없음(지운 것·그려 넣은 것 없음) · 해상도: 창 부분 원본 긴 변 7095px → 마스터 4096px (×0.5770000219345093)
- **한계**: 업로더가 정면 보정한 사진(PD). 철제 보강 격자는 실물이라 그대로 둠.
- **어울리는 성당**: basic — reference(다른 성당의 창, 표시 필요), myeongdong — reference(다른 성당의 창, 표시 필요)

### `lancet_chartres_jesse` — 이새의 나무

- **원어/영어 제목**: Tree of Jesse window
- **위치**: 샤르트르 대성당 서쪽 정면 (baie 49) · 샤르트르 · 프랑스
- **제작 시기 · 작가**: c. 1145–1155년 · 작가 미상
- **형태**: lancet · **실제 크기**: 미상 · 마스터 가로세로비 0.2959
- **주제**: 누워 있는 이새의 몸에서 나무가 자라 다윗 등 유다의 임금들과 성모 마리아를 거쳐 꼭대기의 그리스도에 이르는 예수의 족보를 그렸다. 양옆에는 예언자들이 서 있다. 1194년 화재 이전의 12세기 유리다.
- **verify**: 실측 크기는 확인하지 못함.
- **사진 출처**: [File:Vitrail Chartres-049 rectifié.jpg](https://commons.wikimedia.org/wiki/File:Vitrail_Chartres-049_rectifi%C3%A9.jpg) · 작가 Micheletb (Michelet-密是力) · **Public domain** (https://commons.wikimedia.org/wiki/Commons:Licensing#Material_in_the_public_domain) · 확인일 2026-11-12
- **크레딧 문구**: (표시 의무 없음) Micheletb (Michelet-密是力), Public domain, via Wikimedia Commons
- **받은 원본**: `assets/church/glass_src/lancet_chartres_jesse_orig.jpg` — thumb1920 1920×6591 (Commons/미술관 원본 2891×9924)
- **파일**: `assets/church/glass_lancet_chartres_jesse.webp` 1212×4096 2.89MB q90 · `assets/church/glass_lancet_chartres_jesse_2k.webp` 606×2048 0.85MB q90 · `assets/church/glass_lancet_chartres_jesse_1k.webp` 303×1024 0.23MB q90
- **색감**: 맑은 12세기 파랑 바탕, 빨강·녹색·노랑.
- **복원 내용**: 기하: 창 윤곽에 맞춘 직사각 크롭(투시 보정 없음) · 윤곽: 밝은 유리 영역의 볼록 껍질(창 개구부)로 알파 생성 · 검은점(베일링 글레어 제거, 세 채널 동일값) [0.0, 0.0, 0.0] · 플랫필드: 1차(선형) 기울기만 보정, 측정된 밝기 기울기 2.18배 중 최대 ±25% 범위·강도 0.6 · 화이트밸런스 게인 RGB [1.026, 1.0, 1.043] (밝은 무채색 유리 기준, ±5% 제한) · 노출 ×0.8, 감마 0.6, 채도(Lab 크로마, 색상각 유지) ×1.15 · 노이즈 제거 h=3, 언샤프 0.5/σ1.1 · 인페인팅 없음(지운 것·그려 넣은 것 없음) · 해상도: 창 부분 원본 긴 변 6488px → 마스터 4096px (×0.6309999823570251)
- **한계**: 업로더가 정면 보정한 사진(PD), 1920px 폭 썸네일.
- **어울리는 성당**: basic — reference(다른 성당의 창, 표시 필요), myeongdong — reference(다른 성당의 창, 표시 필요)

### `lancet_chartres_samaritan` — 착한 사마리아인 창

- **원어/영어 제목**: Good Samaritan window
- **위치**: 샤르트르 대성당 남쪽 측랑 (baie 44) · 샤르트르 · 프랑스
- **제작 시기 · 작가**: c. 1205–1215년 · 작가 미상
- **형태**: lancet · **실제 크기**: 미상 · 마스터 가로세로비 0.3098
- **주제**: 아래쪽은 착한 사마리아인의 비유를, 위쪽은 아담과 하와의 창조와 타락 이야기를 나란히 보여 주어 비유를 구원의 역사로 풀이한다. 맨 아래에는 기증자인 구두장이들이 그려져 있다.
- **verify**: 실측 크기는 확인하지 못함.
- **사진 출처**: [File:Chartres 44 -Corrected.jpg](https://commons.wikimedia.org/wiki/File:Chartres_44_-Corrected.jpg) · 작가 Micheletb (Michelet-密是力) · **Public domain** (https://commons.wikimedia.org/wiki/Commons:Licensing#Material_in_the_public_domain) · 확인일 2026-11-12
- **크레딧 문구**: (표시 의무 없음) Micheletb (Michelet-密是力), Public domain, via Wikimedia Commons
- **받은 원본**: `assets/church/glass_src/lancet_chartres_samaritan_orig.jpg` — thumb1920 1920×6453 (Commons/미술관 원본 3741×12573)
- **파일**: `assets/church/glass_lancet_chartres_samaritan.webp` 1269×4096 2.44MB q90 · `assets/church/glass_lancet_chartres_samaritan_2k.webp` 634×2048 0.73MB q90 · `assets/church/glass_lancet_chartres_samaritan_1k.webp` 317×1024 0.21MB q90
- **색감**: 파랑·빨강, 사엽·원형 메달리온.
- **복원 내용**: 기하: 창 윤곽에 맞춘 직사각 크롭(투시 보정 없음) · 윤곽: 밝은 유리 영역의 볼록 껍질(창 개구부)로 알파 생성 · 검은점(베일링 글레어 제거, 세 채널 동일값) [0.0, 0.0, 0.0] · 플랫필드: 1차(선형) 기울기만 보정, 측정된 밝기 기울기 1.58배 중 최대 ±25% 범위·강도 0.6 · 화이트밸런스 게인 RGB [1.024, 1.0, 1.046] (밝은 무채색 유리 기준, ±5% 제한) · 노출 ×0.87, 감마 0.6, 채도(Lab 크로마, 색상각 유지) ×1.15 · 노이즈 제거 h=3, 언샤프 0.5/σ1.1 · 인페인팅 없음(지운 것·그려 넣은 것 없음) · 해상도: 창 부분 원본 긴 변 6130px → 마스터 4096px (×0.6679999828338623)
- **한계**: 업로더가 정면 보정한 사진(PD), 1920px 폭 썸네일.
- **어울리는 성당**: basic — reference(다른 성당의 창, 표시 필요), myeongdong — reference(다른 성당의 창, 표시 필요)

### `medallion_chartres` — 샤르트르 메달리온 패널 (부분)

- **원어/영어 제목**: Chartres medallion scene (detail)
- **위치**: 샤르트르 대성당 · 샤르트르 · 프랑스
- **제작 시기 · 작가**: 13세기 · 작가 미상
- **형태**: panel(부분) · **실제 크기**: 미상 · 마스터 가로세로비 1.0
- **주제**: 식탁에 둘러앉은 인물들을 그린 원형 메달리온의 근접 사진. 창 전체가 아니라 한 장면만 잘라 낸 부분이다.
- **verify**: 어느 창의 어떤 장면인지는 확인하지 못함.
- **사진 출처**: [File:Vitrail Chartres 210209 07.jpg](https://commons.wikimedia.org/wiki/File:Vitrail_Chartres_210209_07.jpg) · 작가 Vassil · **Public domain** (https://commons.wikimedia.org/wiki/Commons:Licensing#Material_in_the_public_domain) · 확인일 2026-11-12
- **크레딧 문구**: (표시 의무 없음) Vassil, Public domain, via Wikimedia Commons
- **받은 원본**: `assets/church/glass_src/medallion_chartres_orig.jpg` — thumb1920 1920×1920 (Commons/미술관 원본 2089×2089)
- **파일**: `assets/church/glass_medallion_chartres.webp` 2880×2880 1.80MB q90 · `assets/church/glass_medallion_chartres_2k.webp` 2048×2048 1.07MB q90 · `assets/church/glass_medallion_chartres_1k.webp` 1024×1024 0.37MB q90
- **색감**: 빨강 바탕에 파랑 원.
- **복원 내용**: 기하: 직사각 크롭(투시 보정 없음) · 윤곽: 직사각(알파 전체 불투명) · 검은점(베일링 글레어 제거, 세 채널 동일값) [0.0, 0.0, 0.0] · 플랫필드: 1차(선형) 기울기만 보정, 측정된 밝기 기울기 3.36배 중 최대 ±25% 범위·강도 0.6 · 화이트밸런스 게인 RGB [1.028, 1.0, 1.05] (밝은 무채색 유리 기준, ±5% 제한) · 노출 ×0.84, 감마 0.6, 채도(Lab 크로마, 색상각 유지) ×1.15 · 노이즈 제거 h=3, 언샤프 0.5/σ1.1 · 인페인팅 없음(지운 것·그려 넣은 것 없음) · 해상도: 창 부분 원본 긴 변 1920px → 마스터 2880px (×1.5) — 확대본
- **한계**: 창 전체가 아닌 부분 사진. 1920px 썸네일 → 1.5배 확대.
- **어울리는 성당**: basic — reference(다른 성당의 창, 표시 필요), myeongdong — reference(다른 성당의 창, 표시 필요)

### `lancet_cologne` — 쾰른 대성당 측랑 창

- **원어/영어 제목**: Cologne Cathedral aisle window (19th c.)
- **위치**: 쾰른 대성당 · 쾰른 · 독일
- **제작 시기 · 작가**: 19세기 · 작가 미상
- **형태**: lancet(4연창+트레이서리) · **실제 크기**: 미상 · 마스터 가로세로비 0.6104
- **주제**: 큰 인물 장면과 흰색·금색 건축 캐노피, 아래의 문장 패널로 이루어진 19세기 고딕 리바이벌 4연창.
- **verify**: 남쪽 측랑의 「바이에른 창」(1848) 가운데 하나로 보이나 어느 창인지·주제는 확인하지 못함.
- **사진 출처**: [File:Die Fenster im Kölner Dom - 7 von 9 - panoramio.jpg](https://commons.wikimedia.org/wiki/File:Die_Fenster_im_K%C3%B6lner_Dom_-_7_von_9_-_panoramio.jpg) · 작가 Edgar El · **CC BY 3.0** (https://creativecommons.org/licenses/by/3.0/) · 확인일 2026-11-12
- **크레딧 문구** (필수): "Die Fenster im Kölner Dom - 7 von 9 - panoramio" by Edgar El, CC BY 3.0 (https://creativecommons.org/licenses/by/3.0/), via Wikimedia Commons — 크롭·투시/색 보정함
- **받은 원본**: `assets/church/glass_src/lancet_cologne_orig.jpg` — thumb1920 1920×3167 (Commons/미술관 원본 2091×3449)
- **파일**: `assets/church/glass_lancet_cologne.webp` 2500×4096 2.15MB q90 · `assets/church/glass_lancet_cologne_2k.webp` 1250×2048 0.86MB q90 · `assets/church/glass_lancet_cologne_1k.webp` 625×1024 0.28MB q90
- **색감**: 흰색·금색 캐노피가 많아 밝고, 옷은 파랑·빨강.
- **복원 내용**: 기하: 자동 사다리꼴 보정(위/아래 폭 비 0.583) · 윤곽: 밝은 유리 영역의 볼록 껍질(창 개구부)로 알파 생성 · 검은점(베일링 글레어 제거, 세 채널 동일값) [0.0, 0.0, 0.0] · 플랫필드: 1차(선형) 기울기만 보정, 측정된 밝기 기울기 4.54배 중 최대 ±25% 범위·강도 0.6 · 화이트밸런스 게인 RGB [1.03, 1.0, 1.043] (밝은 무채색 유리 기준, ±5% 제한) · 노출 ×0.8, 감마 0.82, 채도(Lab 크로마, 색상각 유지) ×1.15 · 노이즈 제거 h=3, 언샤프 0.5/σ1.1 · 인페인팅 없음(지운 것·그려 넣은 것 없음) · 해상도: 창 부분 원본 긴 변 3125px → 마스터 4096px (×1.3109999895095825) — 확대본
- **한계**: 아래에서 올려 찍은 사진을 사다리꼴 보정(위쪽 해상도가 낮음). 1920px 썸네일 → 약 1.3배 확대.
- **어울리는 성당**: myeongdong — reference(다른 성당의 창, 표시 필요), basic — reference(다른 성당의 창, 표시 필요)

### `lancet_gesta` — 성 에우트로피오 창 (제스타 공방)

- **원어/영어 제목**: Saint Eutropius window by the Gesta workshop
- **위치**: 마르시이(Marsilly) 성당 · 샤랑트마리팀 · 프랑스
- **제작 시기 · 작가**: 19세기 · 루이-빅토르 제스타(툴루즈) 공방
- **형태**: lancet · **실제 크기**: 미상 · 마스터 가로세로비 0.2469
- **주제**: 주교 복장의 성 에우트로피오 입상을 금색 캐노피 아래에 세운 네오고딕 랜싯 창.
- **verify**: 명동대성당 창을 제스타 공방이 만들었다는 통설은 확인하지 못함.
- **사진 출처**: [File:Saint-Eutrope, vitrail Gesta, Marsilly, Charente-Maritime, august 2015.jpg](https://commons.wikimedia.org/wiki/File:Saint-Eutrope,_vitrail_Gesta,_Marsilly,_Charente-Maritime,_august_2015.jpg) · 작가 Jebulon (사진) · 창: Louis-Victor Gesta · **Public domain** (https://commons.wikimedia.org/wiki/Commons:Licensing#Material_in_the_public_domain) · 확인일 2026-11-12
- **크레딧 문구**: (표시 의무 없음) Jebulon (사진) · 창: Louis-Victor Gesta, Public domain, via Wikimedia Commons
- **받은 원본**: `assets/church/glass_src/lancet_gesta_orig.jpg` — thumb1280 1280×2963 (Commons/미술관 원본 1804×4176)
- **파일**: `assets/church/glass_lancet_gesta.webp` 939×3803 1.33MB q90 · `assets/church/glass_lancet_gesta_2k.webp` 506×2048 0.52MB q90 · `assets/church/glass_lancet_gesta_1k.webp` 253×1024 0.15MB q90
- **색감**: 파랑 다이아퍼 바탕, 빨강 제의, 꽃무늬 테두리.
- **복원 내용**: 기하: 창 윤곽에 맞춘 직사각 크롭(투시 보정 없음) · 윤곽: 밝은 유리 영역의 볼록 껍질(창 개구부)로 알파 생성 · 검은점(베일링 글레어 제거, 세 채널 동일값) [0.0, 0.0, 0.0] · 플랫필드: 1차(선형) 기울기만 보정, 측정된 밝기 기울기 1.21배 중 최대 ±25% 범위·강도 0.6 · 화이트밸런스 게인 RGB [1.029, 1.0, 1.05] (밝은 무채색 유리 기준, ±5% 제한) · 노출 ×0.89, 감마 0.83, 채도(Lab 크로마, 색상각 유지) ×1.15 · 노이즈 제거 h=3, 언샤프 0.5/σ1.1 · 인페인팅 없음(지운 것·그려 넣은 것 없음) · 해상도: 창 부분 원본 긴 변 2535px → 마스터 3803px (×1.5) — 확대본
- **한계**: 1280px 썸네일 → 1.5배 확대, 4096 마스터가 아님.
- **어울리는 성당**: myeongdong — reference(다른 성당의 창, 표시 필요), basic — reference(다른 성당의 창, 표시 필요)

### `grisaille_knot` — 기하학 그리자유 패널

- **원어/영어 제목**: Geometric grisaille panel
- **위치**: 스테인드글라스 박물관 · 일리 · 영국
- **제작 시기 · 작가**: c. 1200–1250년 · 작가 미상
- **형태**: panel(반원 머리) · **실제 크기**: 미상 · 마스터 가로세로비 0.3973
- **주제**: 무색에 가까운 유리 띠를 매듭처럼 엮고 작은 색유리 조각을 박은 그리자유 패널. 납선 자체가 무늬를 이룬다.
- **verify**: 원래 설치되었던 성당은 확인하지 못함.
- **사진 출처**: [File:Geometric Grisaille c.1200-1250 - Stained Glass Museum.jpg](https://commons.wikimedia.org/wiki/File:Geometric_Grisaille_c.1200-1250_-_Stained_Glass_Museum.jpg) · 작가 The wub · **CC0 1.0** (https://creativecommons.org/publicdomain/zero/1.0/) · 확인일 2026-11-12
- **크레딧 문구**: (표시 의무 없음) The wub, CC0, via Wikimedia Commons
- **받은 원본**: `assets/church/glass_src/grisaille_knot_orig.jpg` — thumb960 960×2400 (Commons/미술관 원본 1265×3163)
- **파일**: `assets/church/glass_grisaille_knot.webp` 1283×3229 1.28MB q90 · `assets/church/glass_grisaille_knot_2k.webp` 814×2048 0.63MB q90 · `assets/church/glass_grisaille_knot_1k.webp` 407×1024 0.17MB q90
- **색감**: 옅은 녹황색 무색 유리, 파랑·노랑·빨강 점.
- **복원 내용**: 기하: 창 윤곽에 맞춘 직사각 크롭(투시 보정 없음) · 윤곽: 밝은 유리 영역의 볼록 껍질(창 개구부)로 알파 생성 · 검은점(베일링 글레어 제거, 세 채널 동일값) [0.0, 0.0, 0.0] · 플랫필드: 1차(선형) 기울기만 보정, 측정된 밝기 기울기 1.31배 중 최대 ±25% 범위·강도 0.6 · 화이트밸런스 게인 RGB [1.0, 1.0, 1.05] (밝은 무채색 유리 기준, ±5% 제한) · 노출 ×0.94, 감마 1.11, 채도(Lab 크로마, 색상각 유지) ×1.15 · 노이즈 제거 h=3, 언샤프 0.5/σ1.1 · 인페인팅 없음(지운 것·그려 넣은 것 없음) · 해상도: 창 부분 원본 긴 변 2152px → 마스터 3229px (×1.5) — 확대본
- **한계**: 원본 1265px(960px 썸네일)이라 저해상도, 4096 마스터가 아님.
- **어울리는 성당**: basic — reference(다른 성당의 창, 표시 필요), myeongdong — reference(다른 성당의 창, 표시 필요), lateran — reference(다른 성당의 창, 표시 필요)

### `rose_saintechapelle` — 생트샤펠 서쪽 장미창 (묵시록)

- **원어/영어 제목**: West rose window (Apocalypse)
- **위치**: 생트샤펠 상부 경당 · 파리 · 프랑스
- **제작 시기 · 작가**: 15세기 말(c. 1485–1498) · 작가 미상
- **형태**: rose · **실제 크기**: 지름 9.0 m (est) · 마스터 가로세로비 1.0
- **주제**: 요한 묵시록의 장면들을 담은 플랑부아양 양식 장미창.
- **verify**: 지름 약 9m 와 제작 연대는 통상 인용되는 값으로, 이번에 1차 자료로 확인하지 못함.
- **사진 출처**: [File:Sainte-Chapelle, Paris, upper chapel rose.jpg](https://commons.wikimedia.org/wiki/File:Sainte-Chapelle,_Paris,_upper_chapel_rose.jpg) · 작가 Gerda Arendt · **CC0 1.0** (https://creativecommons.org/publicdomain/zero/1.0/) · 확인일 2026-11-12
- **크레딧 문구**: (표시 의무 없음) Gerda Arendt, CC0, via Wikimedia Commons
- **받은 원본**: `assets/church/glass_src/rose_saintechapelle_orig.jpg` — thumb3840 3840×2880 (Commons/미술관 원본 4000×3000)
- **파일**: `assets/church/glass_rose_saintechapelle.webp` 2274×2274 1.08MB q90 · `assets/church/glass_rose_saintechapelle_2k.webp` 2048×2048 0.94MB q90 · `assets/church/glass_rose_saintechapelle_1k.webp` 1024×1024 0.36MB q90
- **색감**: 파랑·녹색·노랑, 불꽃 모양 트레이서리.
- **복원 내용**: 기하: 타원→원 보정(축 [1169.1, 1522.3], 회전 없는 대칭 아핀) · 윤곽: 원형 알파 · 검은점(베일링 글레어 제거, 세 채널 동일값) [0.0, 0.0, 0.0] · 플랫필드: 1차(선형) 기울기만 보정, 측정된 밝기 기울기 2.87배 중 최대 ±25% 범위·강도 0.6 · 화이트밸런스 게인 RGB [1.05, 1.0, 1.001] (밝은 무채색 유리 기준, ±5% 제한) · 노출 ×0.81, 감마 0.6, 채도(Lab 크로마, 색상각 유지) ×1.15 · 노이즈 제거 h=3, 언샤프 0.5/σ1.1 · 인페인팅 없음(지운 것·그려 넣은 것 없음) · 해상도: 창 부분 원본 긴 변 1516px → 마스터 2274px (×1.5) — 확대본
- **한계**: 아래에서 넓게 찍은 사진 속 작은 장미창(약 1000px)을 타원→원 보정한 것이라 해상도가 낮고 원근 왜곡이 조금 남는다. 장미창 아래를 가리는 난간은 실물이라 그대로 있다. 4096 마스터가 아님.
- **어울리는 성당**: basic — reference(다른 성당의 창, 표시 필요)

### `rose_york` — 요크 민스터 장미창

- **원어/영어 제목**: York Minster rose window (south transept)
- **위치**: 요크 민스터 남쪽 익랑 · 요크 · 영국
- **제작 시기 · 작가**: 석조 13세기, 유리 c. 1515년 · 작가 미상
- **형태**: rose · **실제 크기**: 미상 · 마스터 가로세로비 1.0
- **주제**: 붉은 장미와 흰 장미가 번갈아 놓인 장미창으로, 요크 가문과 랭커스터 가문의 결합을 기념한 것으로 전해진다.
- **verify**: 1984년 화재 뒤 복원된 것으로 알려져 있으나 이번에 확인하지 못함. 지름 미확인.
- **사진 출처**: [File:York Minster Rose window S16 (15563016153).jpg](https://commons.wikimedia.org/wiki/File:York_Minster_Rose_window_S16_(15563016153).jpg) · 작가 Jules & Jenny · **CC BY 2.0** (https://creativecommons.org/licenses/by/2.0/) · 확인일 2026-11-12
- **크레딧 문구** (필수): "York Minster Rose window S16 (15563016153)" by Jules & Jenny, CC BY 2.0 (https://creativecommons.org/licenses/by/2.0/), via Wikimedia Commons — 크롭·투시/색 보정함
- **받은 원본**: `assets/church/glass_src/rose_york_orig.jpg` — thumb1920 1920×1734 (Commons/미술관 원본 2472×2232)
- **파일**: `assets/church/glass_rose_york.webp` 2859×2859 1.96MB q90 · `assets/church/glass_rose_york_2k.webp` 2048×2048 1.23MB q90 · `assets/church/glass_rose_york_1k.webp` 1024×1024 0.36MB q90
- **색감**: 빨강·흰색 장미, 노란 해살, 파랑 테두리.
- **복원 내용**: 기하: 타원→원 보정(축 [1426.3, 1591.7], 회전 없는 대칭 아핀) · 윤곽: 원형 알파 · 검은점(베일링 글레어 제거, 세 채널 동일값) [0.0, 0.0, 0.0] · 플랫필드: 1차(선형) 기울기만 보정, 측정된 밝기 기울기 1.7배 중 최대 ±25% 범위·강도 0.6 · 화이트밸런스 게인 RGB [1.03, 1.0, 0.992] (밝은 무채색 유리 기준, ±5% 제한) · 노출 ×0.85, 감마 0.6, 채도(Lab 크로마, 색상각 유지) ×1.15 · 노이즈 제거 h=3, 언샤프 0.5/σ1.1 · 인페인팅 없음(지운 것·그려 넣은 것 없음) · 해상도: 창 부분 원본 긴 변 1906px → 마스터 2859px (×1.5) — 확대본
- **한계**: 1920px 썸네일 → 1.5배 확대. 석재는 검게 찍힘.
- **어울리는 성당**: basic — reference(다른 성당의 창, 표시 필요)

### `canterbury_n3` — 캔터베리 대성당 트리니티 경당 창 n.III

- **원어/영어 제목**: Canterbury Cathedral, Trinity Chapel window n.III
- **위치**: 캔터베리 대성당 트리니티 경당 · 캔터베리 · 영국
- **제작 시기 · 작가**: 13세기 초 · 작가 미상
- **형태**: lancet · **실제 크기**: 미상 · 마스터 가로세로비 0.3296
- **주제**: 원형 메달리온이 세로로 이어지는 13세기 초 메달리온 창.
- **verify**: 성 토마스 베켓의 기적 이야기를 담은 「기적의 창」 연작에 속하는 것으로 보이나 각 장면의 내용은 확인하지 못함.
- **사진 출처**: [File:Canterbury Cathedral, window n.III (36940593903).jpg](https://commons.wikimedia.org/wiki/File:Canterbury_Cathedral,_window_n.III_(36940593903).jpg) · 작가 Jules & Jenny · **CC BY 2.0** (https://creativecommons.org/licenses/by/2.0/) · 확인일 2026-11-12
- **크레딧 문구** (필수): "Canterbury Cathedral, window n.III (36940593903)" by Jules & Jenny, CC BY 2.0 (https://creativecommons.org/licenses/by/2.0/), via Wikimedia Commons — 크롭·투시/색 보정함
- **받은 원본**: `assets/church/glass_src/canterbury_n3_orig.jpg` — thumb1280 1280×3602 (Commons/미술관 원본 1486×4182)
- **파일**: `assets/church/glass_canterbury_n3.webp` 1350×4096 1.60MB q90 · `assets/church/glass_canterbury_n3_2k.webp` 675×2048 0.64MB q90 · `assets/church/glass_canterbury_n3_1k.webp` 338×1024 0.22MB q90
- **색감**: 깊은 파랑 바탕, 빨강·녹색·흰색.
- **복원 내용**: 기하: 창 윤곽에 맞춘 직사각 크롭(투시 보정 없음) · 윤곽: 밝은 유리 영역의 볼록 껍질(창 개구부)로 알파 생성 · 검은점(베일링 글레어 제거, 세 채널 동일값) [0.0, 0.0, 0.0] · 플랫필드: 1차(선형) 기울기만 보정, 측정된 밝기 기울기 1.83배 중 최대 ±25% 범위·강도 0.6 · 화이트밸런스 게인 RGB [0.998, 1.0, 0.99] (밝은 무채색 유리 기준, ±5% 제한) · 노출 ×1.03, 감마 0.66, 채도(Lab 크로마, 색상각 유지) ×1.15 · 노이즈 제거 h=3, 언샤프 0.5/σ1.1 · 인페인팅 없음(지운 것·그려 넣은 것 없음) · 해상도: 창 부분 원본 긴 변 3539px → 마스터 4096px (×1.156999945640564) — 확대본
- **한계**: 원본 1486px 폭(1280px 썸네일), 약 1.1배 확대.
- **어울리는 성당**: basic — reference(다른 성당의 창, 표시 필요), myeongdong — reference(다른 성당의 창, 표시 필요)

### `beverley_west` — 베벌리 민스터 서쪽 대창

- **원어/영어 제목**: Beverley Minster, Great West Window
- **위치**: 베벌리 민스터 · 베벌리 · 영국
- **제작 시기 · 작가**: 석조 15세기(수직 양식), 유리 19세기 · 유리 작가 미상
- **형태**: lancet(다연창+트레이서리) · **실제 크기**: 미상 · 마스터 가로세로비 0.551
- **주제**: 수직 양식의 큰 서쪽 창으로, 여러 단의 캐노피 아래 인물상이 줄지어 서 있다.
- **verify**: 유리는 19세기 하드먼(Hardman) 공방 작으로 알려져 있으나 확인하지 못함. 인물의 정체도 미확인.
- **사진 출처**: [File:Beverley Minster, West window (23725072089).jpg](https://commons.wikimedia.org/wiki/File:Beverley_Minster,_West_window_(23725072089).jpg) · 작가 Jules & Jenny · **CC BY 2.0** (https://creativecommons.org/licenses/by/2.0/) · 확인일 2026-11-12
- **크레딧 문구** (필수): "Beverley Minster, West window (23725072089)" by Jules & Jenny, CC BY 2.0 (https://creativecommons.org/licenses/by/2.0/), via Wikimedia Commons — 크롭·투시/색 보정함
- **받은 원본**: `assets/church/glass_src/beverley_west_orig.jpg` — thumb3840 3840×6657 (Commons/미술관 원본 4447×7709)
- **파일**: `assets/church/glass_beverley_west.webp` 2257×4096 2.85MB q90 · `assets/church/glass_beverley_west_2k.webp` 1128×2048 0.86MB q90 · `assets/church/glass_beverley_west_1k.webp` 564×1024 0.25MB q90
- **색감**: 파랑·빨강 인물, 흰색·금색 캐노피.
- **복원 내용**: 기하: 자동 사다리꼴 보정(위/아래 폭 비 0.988) · 윤곽: 밝은 유리 영역의 볼록 껍질(창 개구부)로 알파 생성 · 검은점(베일링 글레어 제거, 세 채널 동일값) [0.0, 0.0, 0.0] · 플랫필드: 1차(선형) 기울기만 보정, 측정된 밝기 기울기 2.11배 중 최대 ±25% 범위·강도 0.6 · 화이트밸런스 게인 RGB [1.003, 1.0, 0.971] (밝은 무채색 유리 기준, ±5% 제한) · 노출 ×1.08, 감마 0.6, 채도(Lab 크로마, 색상각 유지) ×1.15 · 노이즈 제거 h=3, 언샤프 0.5/σ1.1 · 인페인팅 없음(지운 것·그려 넣은 것 없음) · 해상도: 창 부분 원본 긴 변 6624px → 마스터 4096px (×0.6179999709129333)
- **한계**: 사다리꼴 자동 보정. 창살(멀리언)과 트레이서리 석재는 검게 찍힘.
- **어울리는 성당**: basic — reference(다른 성당의 창, 표시 필요), myeongdong — reference(다른 성당의 창, 표시 필요)

### `strasbourg_rose` — 스트라스부르 대성당 서쪽 장미창

- **원어/영어 제목**: Strasbourg Cathedral west rose window
- **위치**: 스트라스부르 대성당 서쪽 정면 · 스트라스부르 · 프랑스
- **제작 시기 · 작가**: 14세기 · 작가 미상
- **형태**: rose · **실제 크기**: 미상 · 마스터 가로세로비 1.0
- **주제**: 인물 없이 밀 이삭 모양의 방사형 무늬로 채운 고딕 장미창.
- **verify**: 지름(약 13–14m 로 인용됨)과 설계자(에르빈 폰 슈타인바흐로 전함)는 확인하지 못함.
- **사진 출처**: [File:Rosace cathedrale strasbourg.jpg](https://commons.wikimedia.org/wiki/File:Rosace_cathedrale_strasbourg.jpg) · 작가 Clostridium · **Public domain** (https://commons.wikimedia.org/wiki/Commons:Licensing#Material_in_the_public_domain) · 확인일 2026-11-12
- **크레딧 문구**: (표시 의무 없음) Clostridium, Public domain, via Wikimedia Commons
- **받은 원본**: `assets/church/glass_src/strasbourg_rose_orig.jpg` — thumb1280 1280×1280 (Commons/미술관 원본 1770×1770)
- **파일**: `assets/church/glass_strasbourg_rose.webp` 1777×1777 1.11MB q90 · `assets/church/glass_strasbourg_rose_2k.webp` 1777×1777 1.11MB q90 · `assets/church/glass_strasbourg_rose_1k.webp` 1024×1024 0.45MB q90
- **색감**: 노랑·녹색 이삭, 파랑 중심, 빨강 점.
- **복원 내용**: 기하: 타원→원 보정(축 [1145.1, 1184.9], 회전 없는 대칭 아핀) · 윤곽: 원형 알파 · 검은점(베일링 글레어 제거, 세 채널 동일값) [0.0, 0.0, 0.0] · 플랫필드: 1차(선형) 기울기만 보정, 측정된 밝기 기울기 1.63배 중 최대 ±25% 범위·강도 0.6 · 화이트밸런스 게인 RGB [1.05, 1.0, 1.0] (밝은 무채색 유리 기준, ±5% 제한) · 노출 ×0.85, 감마 0.6, 채도(Lab 크로마, 색상각 유지) ×1.15 · 노이즈 제거 h=3, 언샤프 0.5/σ1.1 · 인페인팅 없음(지운 것·그려 넣은 것 없음) · 해상도: 창 부분 원본 긴 변 1185px → 마스터 1777px (×1.5) — 확대본
- **한계**: 원본 1770px(1280px 썸네일) → 1.5배 확대, 4096 마스터가 아님.
- **어울리는 성당**: basic — reference(다른 성당의 창, 표시 필요), milan — reference(다른 성당의 창, 표시 필요)

### `augsburg_daniel` — 아우크스부르크 예언자 창 — 다니엘

- **원어/영어 제목**: Augsburg Cathedral Prophet Window: Daniel
- **위치**: 아우크스부르크 대성당 신랑 남쪽 고창 · 아우크스부르크 · 독일
- **제작 시기 · 작가**: 11세기 말~12세기 전반(연대 논쟁 있음) · 작가 미상
- **형태**: lancet(반원 아치) · **실제 크기**: 높이 2.2 m (est) · 마스터 가로세로비 0.3419
- **주제**: 두루마리를 든 예언자 다니엘의 정면 입상. 아우크스부르크 대성당의 예언자 창 다섯 점(요나·다니엘·호세아·다윗·모세)은 제자리에 남아 있는 가장 오래된 스테인드글라스 연작으로 꼽힌다.
- **verify**: 높이 약 2.2m 는 통상 인용되는 추정치. 제작 연대는 문헌마다 다르다.
- **사진 출처**: [File:2019-01-27 Augsburg 082 Augsburger Dom, Prophetenfenster Daniel (47101327862).jpg](https://commons.wikimedia.org/wiki/File:2019-01-27_Augsburg_082_Augsburger_Dom,_Prophetenfenster_Daniel_(47101327862).jpg) · 작가 Allie_Caulfield · **CC BY 2.0** (https://creativecommons.org/licenses/by/2.0/) · 확인일 2026-11-12
- **크레딧 문구** (필수): "2019-01-27 Augsburg 082 Augsburger Dom, Prophetenfenster Daniel (47101327862)" by Allie_Caulfield, CC BY 2.0 (https://creativecommons.org/licenses/by/2.0/), via Wikimedia Commons — 크롭·투시/색 보정함
- **받은 원본**: `assets/church/glass_src/augsburg_daniel_orig.jpg` — thumb1920 1920×2982 (Commons/미술관 원본 3430×5327)
- **파일**: `assets/church/glass_augsburg_daniel.webp` 1052×3077 0.71MB q90 · `assets/church/glass_augsburg_daniel_2k.webp` 700×2048 0.43MB q90 · `assets/church/glass_augsburg_daniel_1k.webp` 350×1024 0.14MB q90
- **색감**: 녹색 모자, 주황·자주 옷, 흰 두루마리.
- **복원 내용**: 기하: 손으로 잡은 4점 투시 보정 · 윤곽: 반원 아치 알파(해석적) · 검은점(베일링 글레어 제거, 세 채널 동일값) [0.0, 0.0, 0.0] · 플랫필드: 1차(선형) 기울기만 보정, 측정된 밝기 기울기 2.66배 중 최대 ±25% 범위·강도 0.6 · 화이트밸런스 게인 RGB [1.044, 1.0, 0.985] (밝은 무채색 유리 기준, ±5% 제한) · 노출 ×0.93, 감마 0.83, 채도(Lab 크로마, 색상각 유지) ×1.15 · 노이즈 제거 h=3, 언샤프 0.5/σ1.1 · 인페인팅 없음(지운 것·그려 넣은 것 없음) · 해상도: 창 부분 원본 긴 변 2051px → 마스터 3077px (×1.5) — 확대본
- **한계**: 비스듬히 올려 찍은 사진을 손으로 잡은 4점으로 투시 보정(오차 수 px). 인물 패널만 잘랐고, 둘레의 밝은 보호 유리(후대)는 뺐다. 유리의 부식·후대 보수 조각은 그대로다.
- **어울리는 성당**: basic — reference(다른 성당의 창, 표시 필요), lateran — reference(다른 성당의 창, 표시 필요)

### `augsburg_hosea` — 아우크스부르크 예언자 창 — 호세아

- **원어/영어 제목**: Augsburg Cathedral Prophet Window: Hosea
- **위치**: 아우크스부르크 대성당 신랑 남쪽 고창 · 아우크스부르크 · 독일
- **제작 시기 · 작가**: 11세기 말~12세기 전반(연대 논쟁 있음) · 작가 미상
- **형태**: lancet(반원 아치) · **실제 크기**: 높이 2.2 m (est) · 마스터 가로세로비 0.3281
- **주제**: 붉은 모자를 쓰고 글귀가 적힌 띠를 든 예언자 호세아의 정면 입상. 로마네스크 양식 예언자 창 연작의 하나다.
- **verify**: 높이는 추정치. 연대는 문헌마다 다르다.
- **사진 출처**: [File:2019-01-27 Augsburg 081 Augsburger Dom, Prophetenfenster Hosea (47101330312).jpg](https://commons.wikimedia.org/wiki/File:2019-01-27_Augsburg_081_Augsburger_Dom,_Prophetenfenster_Hosea_(47101330312).jpg) · 작가 Allie_Caulfield · **CC BY 2.0** (https://creativecommons.org/licenses/by/2.0/) · 확인일 2026-11-12
- **크레딧 문구** (필수): "2019-01-27 Augsburg 081 Augsburger Dom, Prophetenfenster Hosea (47101330312)" by Allie_Caulfield, CC BY 2.0 (https://creativecommons.org/licenses/by/2.0/), via Wikimedia Commons — 크롭·투시/색 보정함
- **받은 원본**: `assets/church/glass_src/augsburg_hosea_orig.jpg` — thumb1920 1920×3023 (Commons/미술관 원본 3109×4895)
- **파일**: `assets/church/glass_augsburg_hosea.webp` 1097×3344 0.85MB q90 · `assets/church/glass_augsburg_hosea_2k.webp` 672×2048 0.45MB q90 · `assets/church/glass_augsburg_hosea_1k.webp` 336×1024 0.15MB q90
- **색감**: 빨강 모자, 녹색 겉옷, 빨강 띠, 흰 수염.
- **복원 내용**: 기하: 손으로 잡은 4점 투시 보정 · 윤곽: 반원 아치 알파(해석적) · 검은점(베일링 글레어 제거, 세 채널 동일값) [0.0, 0.0, 0.0] · 플랫필드: 1차(선형) 기울기만 보정, 측정된 밝기 기울기 1.35배 중 최대 ±25% 범위·강도 0.6 · 화이트밸런스 게인 RGB [1.05, 1.0, 0.982] (밝은 무채색 유리 기준, ±5% 제한) · 노출 ×0.97, 감마 0.87, 채도(Lab 크로마, 색상각 유지) ×1.15 · 노이즈 제거 h=3, 언샤프 0.5/σ1.1 · 인페인팅 없음(지운 것·그려 넣은 것 없음) · 해상도: 창 부분 원본 긴 변 2229px → 마스터 3344px (×1.5) — 확대본
- **한계**: 손으로 잡은 4점 투시 보정. 인물 패널만 잘랐다. 후대 보수 조각 그대로.
- **어울리는 성당**: basic — reference(다른 성당의 창, 표시 필요), lateran — reference(다른 성당의 창, 표시 필요)

### `tiffany_angel_resurrection` — 부활의 천사

- **원어/영어 제목**: Angel of the Resurrection
- **위치**: 인디애나폴리스 미술관(뉴필즈) 소장 · 인디애나폴리스 · 미국
- **제작 시기 · 작가**: 1904년 · 루이스 컴포트 티파니 / 티파니 스튜디오
- **형태**: lancet(다연창+트레이서리) · **실제 크기**: 미상 · 마스터 가로세로비 0.594
- **주제**: 아래 가운데에 날개를 편 천사가 서 있고, 위쪽은 마름모 격자 유리와 트레이서리로 이루어진 큰 기념 창.
- **verify**: 벤저민 해리슨 대통령을 기념해 인디애나폴리스 제일장로교회에 설치되었던 창으로 알려져 있으나 이번에 확인하지 못함.
- **사진 출처**: [File:Louis Comfort Tiffany - Angel of the Resurrection - Google Art Project.jpg](https://commons.wikimedia.org/wiki/File:Louis_Comfort_Tiffany_-_Angel_of_the_Resurrection_-_Google_Art_Project.jpg) · 작가 Google Art Project / 소장 미술관 촬영 (작품: Louis Comfort Tiffany) · **Public domain** (https://commons.wikimedia.org/wiki/Commons:Licensing#Material_in_the_public_domain) · 확인일 2026-11-12
- **크레딧 문구**: (표시 의무 없음) Google Art Project / 소장 미술관 촬영 (작품: Louis Comfort Tiffany), Public domain, via Wikimedia Commons
- **받은 원본**: `assets/church/glass_src/tiffany_angel_resurrection_orig.jpg` — thumb1920 1920×2976 (Commons/미술관 원본 3774×5849)
- **파일**: `assets/church/glass_tiffany_angel_resurrection.webp` 2433×4096 1.80MB q90 · `assets/church/glass_tiffany_angel_resurrection_2k.webp` 1216×2048 0.71MB q90 · `assets/church/glass_tiffany_angel_resurrection_1k.webp` 608×1024 0.24MB q90
- **색감**: 푸른 회색·흰색, 금색 테두리.
- **복원 내용**: 기하: 창 윤곽에 맞춘 직사각 크롭(투시 보정 없음) · 윤곽: 밝은 유리 영역의 볼록 껍질(창 개구부)로 알파 생성 · 검은점(베일링 글레어 제거, 세 채널 동일값) [0.0, 0.0, 0.0] · 플랫필드 보정 안 함 · 화이트밸런스 게인 RGB [1.05, 1.0, 1.05] (밝은 무채색 유리 기준, ±5% 제한) · 노출 ×0.91, 감마 0.6, 채도(Lab 크로마, 색상각 유지) ×1.08 · 노이즈 제거 h=3, 언샤프 0.5/σ1.1 · 인페인팅 없음(지운 것·그려 넣은 것 없음) · 해상도: 창 부분 원본 긴 변 2809px → 마스터 4096px (×1.4579999446868896) — 확대본
- **한계**: Google Art Project 사진의 1920px 썸네일 → 약 1.4배 확대. 창살 사이 벽은 검게 처리된 촬영본.
- **어울리는 성당**: basic — reference(다른 성당의 창, 표시 필요), myeongdong — reference(다른 성당의 창, 표시 필요)

### `tiffany_crown_glory` — 의인은 영광의 화관을 받으리라

- **원어/영어 제목**: The Righteous Shall Receive a Crown of Glory
- **위치**: 미국(소장처 verify)
- **제작 시기 · 작가**: 1901년 · 티파니 스튜디오, 밑그림 프레더릭 윌슨
- **형태**: lancet(반원 아치) · **실제 크기**: 미상 · 마스터 가로세로비 0.5947
- **주제**: 세 인물 위로 천사들이 십자가와 화관을 들고 있는 반원 아치 기념 창.
- **verify**: 코닝 유리 박물관 소장, 뉴욕주 워터빌의 교회를 위해 만든 브레이너드 기념 창으로 알려져 있으나 확인하지 못함. Commons 날짜 표기는 1903, 파일 제목은 1901.
- **사진 출처**: [File:Louis Comfort Tiffany - The Righteous Shall Receive A Crown of Glory, 1901.jpg](https://commons.wikimedia.org/wiki/File:Louis_Comfort_Tiffany_-_The_Righteous_Shall_Receive_A_Crown_of_Glory,_1901.jpg) · 작가 Google Art Project / 소장 미술관 촬영 (작품: Louis Comfort Tiffany) · **Public domain** (https://commons.wikimedia.org/wiki/Commons:Licensing#Material_in_the_public_domain) · 확인일 2026-11-12
- **크레딧 문구**: (표시 의무 없음) Google Art Project / 소장 미술관 촬영 (작품: Louis Comfort Tiffany), Public domain, via Wikimedia Commons
- **받은 원본**: `assets/church/glass_src/tiffany_crown_glory_orig.jpg` — thumb1920 1920×3060 (Commons/미술관 원본 3744×5967)
- **파일**: `assets/church/glass_tiffany_crown_glory.webp` 2436×4096 3.15MB q90 · `assets/church/glass_tiffany_crown_glory_2k.webp` 1218×2048 1.02MB q90 · `assets/church/glass_tiffany_crown_glory_1k.webp` 609×1024 0.29MB q90
- **색감**: 금색·호박색 위주, 분홍·파랑 옷.
- **복원 내용**: 기하: 창 윤곽에 맞춘 직사각 크롭(투시 보정 없음) · 윤곽: 밝은 유리 영역의 볼록 껍질(창 개구부)로 알파 생성 · 검은점(베일링 글레어 제거, 세 채널 동일값) [0.0, 0.0, 0.0] · 플랫필드 보정 안 함 · 화이트밸런스 게인 RGB [0.962, 1.0, 1.05] (밝은 무채색 유리 기준, ±5% 제한) · 노출 ×0.99, 감마 1.0, 채도(Lab 크로마, 색상각 유지) ×1.08 · 노이즈 제거 h=3, 언샤프 0.5/σ1.1 · 인페인팅 없음(지운 것·그려 넣은 것 없음) · 해상도: 창 부분 원본 긴 변 2907px → 마스터 4096px (×1.409000039100647) — 확대본
- **한계**: 1920px 썸네일 → 약 1.3배 확대.
- **어울리는 성당**: basic — reference(다른 성당의 창, 표시 필요), myeongdong — reference(다른 성당의 창, 표시 필요)

### `tiffany_parakeets` — 잉꼬와 금붕어 어항

- **원어/영어 제목**: Parakeets and Gold Fish Bowl
- **위치**: 미국(소장처 verify)
- **제작 시기 · 작가**: 1893년 · 루이스 컴포트 티파니
- **형태**: panel · **실제 크기**: 미상 · 마스터 가로세로비 0.5229
- **주제**: 꽃가지에 앉은 잉꼬들과 매달린 금붕어 어항을 그린 장식 창. 종교 주제가 아니다.
- **verify**: 보스턴 미술관 소장, 1893년 시카고 만국박람회 출품작으로 알려져 있으나 확인하지 못함.
- **사진 출처**: [File:Louis Comfort Tiffany - Parakeets and Gold Fish Bowl, 1893.jpg](https://commons.wikimedia.org/wiki/File:Louis_Comfort_Tiffany_-_Parakeets_and_Gold_Fish_Bowl,_1893.jpg) · 작가 Google Art Project / 소장 미술관 촬영 (작품: Louis Comfort Tiffany) · **Public domain** (https://commons.wikimedia.org/wiki/Commons:Licensing#Material_in_the_public_domain) · 확인일 2026-11-12
- **크레딧 문구**: (표시 의무 없음) Google Art Project / 소장 미술관 촬영 (작품: Louis Comfort Tiffany), Public domain, via Wikimedia Commons
- **받은 원본**: `assets/church/glass_src/tiffany_parakeets_orig.jpg` — thumb1920 1920×3707 (Commons/미술관 원본 3418×6600)
- **파일**: `assets/church/glass_tiffany_parakeets.webp` 2142×4096 2.74MB q90 · `assets/church/glass_tiffany_parakeets_2k.webp` 1071×2048 0.79MB q90 · `assets/church/glass_tiffany_parakeets_1k.webp` 536×1024 0.23MB q90
- **색감**: 연두·노랑·하늘색, 흰 꽃.
- **복원 내용**: 기하: 창 윤곽에 맞춘 직사각 크롭(투시 보정 없음) · 윤곽: 직사각(알파 전체 불투명) · 검은점(베일링 글레어 제거, 세 채널 동일값) [0.0, 0.0, 0.0] · 플랫필드 보정 안 함 · 화이트밸런스 게인 RGB [0.958, 1.0, 1.0] (밝은 무채색 유리 기준, ±5% 제한) · 노출 ×1.05, 감마 0.88, 채도(Lab 크로마, 색상각 유지) ×1.05 · 노이즈 제거 h=3, 언샤프 0.5/σ1.1 · 인페인팅 없음(지운 것·그려 넣은 것 없음) · 해상도: 창 부분 원본 긴 변 3672px → 마스터 4096px (×1.1150000095367432) — 확대본
- **한계**: 1920px 썸네일.
- **어울리는 성당**: basic — reference(다른 성당의 창, 표시 필요)

### `tiffany_wooded_landscape` — 세 폭의 숲 풍경

- **원어/영어 제목**: A Wooded Landscape in Three Panels
- **위치**: 미국(소장처 verify)
- **제작 시기 · 작가**: c. 1905년 · 루이스 컴포트 티파니 / 티파니 스튜디오
- **형태**: panel(3폭) · **실제 크기**: 미상 · 마스터 가로세로비 1.555
- **주제**: 큰 나무와 시냇물, 붓꽃이 있는 숲을 세 폭에 이어 그린 풍경 창. 종교 주제가 아니다.
- **verify**: 휴스턴 미술관 소장으로 알려져 있으나 확인하지 못함.
- **사진 출처**: [File:Louis Comfort Tiffany - A Wooded Landscape in Three Panels - Google Art Project.jpg](https://commons.wikimedia.org/wiki/File:Louis_Comfort_Tiffany_-_A_Wooded_Landscape_in_Three_Panels_-_Google_Art_Project.jpg) · 작가 Google Art Project / 소장 미술관 촬영 (작품: Louis Comfort Tiffany) · **Public domain** (https://commons.wikimedia.org/wiki/Commons:Licensing#Material_in_the_public_domain) · 확인일 2026-11-12
- **크레딧 문구**: (표시 의무 없음) Google Art Project / 소장 미술관 촬영 (작품: Louis Comfort Tiffany), Public domain, via Wikimedia Commons
- **받은 원본**: `assets/church/glass_src/tiffany_wooded_landscape_orig.jpg` — thumb3840 3840×2470 (Commons/미술관 원본 8169×5255)
- **파일**: `assets/church/glass_tiffany_wooded_landscape.webp` 4096×2634 3.38MB q90 · `assets/church/glass_tiffany_wooded_landscape_2k.webp` 2048×1317 1.03MB q90 · `assets/church/glass_tiffany_wooded_landscape_1k.webp` 1024×658 0.33MB q90
- **색감**: 녹색·갈색 숲, 밝은 하늘.
- **복원 내용**: 기하: 창 윤곽에 맞춘 직사각 크롭(투시 보정 없음) · 윤곽: 직사각(알파 전체 불투명) · 검은점(베일링 글레어 제거, 세 채널 동일값) [0.0, 0.0, 0.0] · 플랫필드 보정 안 함 · 화이트밸런스 게인 RGB [1.0, 1.0, 1.0] (밝은 무채색 유리 기준, ±5% 제한) · 노출 ×0.96, 감마 0.6, 채도(Lab 크로마, 색상각 유지) ×1.05 · 노이즈 제거 h=3, 언샤프 0.5/σ1.1 · 인페인팅 없음(지운 것·그려 넣은 것 없음) · 해상도: 창 부분 원본 긴 변 3840px → 마스터 4096px (×1.0670000314712524) — 확대본
- **한계**: Google Art Project 사진의 3840px 썸네일. 폭 사이의 검은 틀은 실물.
- **어울리는 성당**: basic — reference(다른 성당의 창, 표시 필요)

### `lancet_chartres_passion` — 수난과 부활 창

- **원어/영어 제목**: Passion and Resurrection window
- **위치**: 샤르트르 대성당 서쪽 정면 (baie 51) · 샤르트르 · 프랑스
- **제작 시기 · 작가**: c. 1145–1155년 · 작가 미상
- **형태**: lancet · **실제 크기**: 미상 · 마스터 가로세로비 0.2795
- **주제**: 서쪽 정면 세 랜싯 가운데 남쪽 창으로, 주님의 거룩한 변모와 최후의 만찬에서 십자가 수난, 부활, 엠마오까지를 원형 메달리온에 담았다.
- **verify**: 실측 크기는 확인하지 못함.
- **사진 출처**: [File:Vitrail Chartres-051 rectifié.JPG](https://commons.wikimedia.org/wiki/File:Vitrail_Chartres-051_rectifi%C3%A9.JPG) · 작가 Micheletb (Michelet-密是力) · **Public domain** (https://commons.wikimedia.org/wiki/Commons:Licensing#Material_in_the_public_domain) · 확인일 2026-11-12
- **크레딧 문구**: (표시 의무 없음) Micheletb (Michelet-密是力), Public domain, via Wikimedia Commons
- **받은 원본**: `assets/church/glass_src/lancet_chartres_passion_orig.jpg` — thumb1920 1920×7057 (Commons/미술관 원본 2734×10049)
- **파일**: `assets/church/glass_lancet_chartres_passion.webp` 1145×4096 1.96MB q90 · `assets/church/glass_lancet_chartres_passion_2k.webp` 572×2048 0.66MB q90 · `assets/church/glass_lancet_chartres_passion_1k.webp` 286×1024 0.21MB q90
- **색감**: 파랑 바탕, 빨강 테두리.
- **복원 내용**: 기하: 창 윤곽에 맞춘 직사각 크롭(투시 보정 없음) · 윤곽: 밝은 유리 영역의 볼록 껍질(창 개구부)로 알파 생성 · 검은점(베일링 글레어 제거, 세 채널 동일값) [0.0, 0.0, 0.0] · 플랫필드: 1차(선형) 기울기만 보정, 측정된 밝기 기울기 1.27배 중 최대 ±25% 범위·강도 0.6 · 화이트밸런스 게인 RGB [1.012, 1.0, 1.05] (밝은 무채색 유리 기준, ±5% 제한) · 노출 ×0.87, 감마 0.6, 채도(Lab 크로마, 색상각 유지) ×1.15 · 노이즈 제거 h=3, 언샤프 0.5/σ1.1 · 인페인팅 없음(지운 것·그려 넣은 것 없음) · 해상도: 창 부분 원본 긴 변 6863px → 마스터 4096px (×0.597000002861023)
- **한계**: 업로더가 정면 보정한 사진(PD), 1920px 폭 썸네일.
- **어울리는 성당**: basic — reference(다른 성당의 창, 표시 필요), myeongdong — reference(다른 성당의 창, 표시 필요)

### `fivesisters_york` — 다섯 자매 창

- **원어/영어 제목**: The Five Sisters Window
- **위치**: 요크 민스터 북쪽 익랑 · 요크 · 영국
- **제작 시기 · 작가**: c. 1250–1260년 · 작가 미상
- **형태**: lancet(5연창) · **실제 크기**: 높이 16.3 m (est) · 마스터 가로세로비 0.7726
- **주제**: 높고 가는 랜싯 다섯 개를 기하학 무늬의 그리자유 유리로 채운 창. 색을 거의 쓰지 않고 납선 무늬와 회녹색 유리만으로 이루어져 있다.
- **verify**: 각 랜싯 높이 약 16.3m 는 통상 인용되는 값. 사진 설명에 따르면 유리 조각 약 10만 개, 1923–25년에 다시 납땜.
- **사진 출처**: [File:York Minster window n16 "The Five sisters" (16157008236).jpg](https://commons.wikimedia.org/wiki/File:York_Minster_window_n16_%22The_Five_sisters%22_(16157008236).jpg) · 작가 Jules & Jenny · **CC BY 2.0** (https://creativecommons.org/licenses/by/2.0/) · 확인일 2026-11-12
- **크레딧 문구** (필수): "York Minster window n16 "The Five sisters" (16157008236)" by Jules & Jenny, CC BY 2.0 (https://creativecommons.org/licenses/by/2.0/), via Wikimedia Commons — 크롭·투시/색 보정함
- **받은 원본**: `assets/church/glass_src/fivesisters_york_jj_orig.jpg` — thumb1920 1920×2486 (Commons/미술관 원본 2716×3516)
- **파일**: `assets/church/glass_fivesisters_york.webp` 2881×3729 5.70MB q86 · `assets/church/glass_fivesisters_york_2k.webp` 1582×2048 2.10MB q90 · `assets/church/glass_fivesisters_york_1k.webp` 791×1024 0.47MB q90
- **색감**: 회녹색·은회색 그리자유, 아주 적은 색 조각.
- **복원 내용**: 기하: 창 윤곽에 맞춘 직사각 크롭(투시 보정 없음) · 윤곽: 밝은 유리 영역의 볼록 껍질(창 개구부)로 알파 생성 · 검은점(베일링 글레어 제거, 세 채널 동일값) [0.0, 0.0, 0.0] · 플랫필드: 1차(선형) 기울기만 보정, 측정된 밝기 기울기 3.88배 중 최대 ±25% 범위·강도 0.6 · 화이트밸런스 게인 RGB [1.0, 1.0, 1.027] (밝은 무채색 유리 기준, ±5% 제한) · 노출 ×0.82, 감마 0.6, 채도(Lab 크로마, 색상각 유지) ×1.05 · 노이즈 제거 h=3, 언샤프 0.5/σ1.1 · 인페인팅 없음(지운 것·그려 넣은 것 없음) · 해상도: 창 부분 원본 긴 변 2486px → 마스터 3729px (×1.5) — 확대본
- **한계**: 랜싯 사이의 돌기둥(실물)을 포함한 창군 전체를 하나로 잘랐다. 1920px 썸네일 → 1.5배 확대. 원래 어두운 창이라 대비를 조금 올렸다.
- **어울리는 성당**: basic — reference(다른 성당의 창, 표시 필요), lateran — reference(다른 성당의 창, 표시 필요)

### `wyspianski_god_father` — 하느님 아버지 — 「있으라!」

- **원어/영어 제목**: God the Father – Let it Be! (Bóg Ojciec – Stań się)
- **위치**: 프란치스코회 대성당 서쪽 창 · 크라쿠프 · 폴란드
- **제작 시기 · 작가**: 1897–1904년 · 스타니스와프 비스피안스키(1869–1907)
- **형태**: lancet(다연창) · **실제 크기**: 미상 · 마스터 가로세로비 0.5179
- **주제**: 혼돈 속에서 손을 들어 세상을 창조하는 하느님 아버지를 그린 아르누보 창. 물결·불꽃 같은 색면이 창살을 가로질러 흐른다.
- **verify**: 제작 연도는 통상 인용되는 범위. 실측 크기 미확인.
- **사진 출처**: [File:016KrakówFranciszkański.JPG](https://commons.wikimedia.org/wiki/File:016Krak%C3%B3wFranciszka%C5%84ski.JPG) · 작가 Rj1979 · **Public domain** (https://commons.wikimedia.org/wiki/Commons:Licensing#Material_in_the_public_domain) · 확인일 2026-11-12
- **크레딧 문구**: (표시 의무 없음) Rj1979, Public domain, via Wikimedia Commons
- **받은 원본**: `assets/church/glass_src/wyspianski_god_father_orig.jpg` — thumb1280 1280×1707 (Commons/미술관 원본 1704×2272)
- **파일**: `assets/church/glass_wyspianski_god_father.webp` 1145×2211 0.64MB q90 · `assets/church/glass_wyspianski_god_father_2k.webp` 1061×2048 0.59MB q90 · `assets/church/glass_wyspianski_god_father_1k.webp` 530×1024 0.21MB q90
- **색감**: 파랑·보라·녹색 물결, 노랑·흰색 빛.
- **복원 내용**: 기하: 자동 사다리꼴 보정(위/아래 폭 비 0.865) · 윤곽: 밝은 유리 영역의 볼록 껍질(창 개구부)로 알파 생성 · 검은점(베일링 글레어 제거, 세 채널 동일값) [0.0, 0.0, 0.0] · 플랫필드: 1차(선형) 기울기만 보정, 측정된 밝기 기울기 3.71배 중 최대 ±25% 범위·강도 0.6 · 화이트밸런스 게인 RGB [1.05, 1.0, 1.024] (밝은 무채색 유리 기준, ±5% 제한) · 노출 ×0.81, 감마 0.87, 채도(Lab 크로마, 색상각 유지) ×1.15 · 노이즈 제거 h=3, 언샤프 0.5/σ1.1 · 인페인팅 없음(지운 것·그려 넣은 것 없음) · 해상도: 창 부분 원본 긴 변 1474px → 마스터 2211px (×1.5) — 확대본
- **한계**: 원본 1704×2272(1280px 썸네일) 속 창 부분이 약 700×1350px 뿐이라 1.5배 확대해도 저해상도. 비스듬한 촬영을 사다리꼴 보정. 4096 마스터가 아님.
- **어울리는 성당**: basic — reference(다른 성당의 창, 표시 필요)

### `milan_apse_lower` — 밀라노 대성당 대형 창 (하부 부분)

- **원어/영어 제목**: Milan Cathedral great window (lower registers, partial)
- **위치**: 밀라노 대성당 · 밀라노 · 이탈리아
- **제작 시기 · 작가**: 미상
- **형태**: panel(부분) · **실제 크기**: 미상 · 마스터 가로세로비 1.7502
- **주제**: 성경 장면 패널이 층층이 쌓인 밀라노 대성당 대형 창의 아랫부분. 창 전체가 아니라 사진에 온전히 찍힌 하부 여섯 단만 펴서 잘랐다.
- **verify**: 어느 창인지(후진 창으로 보임)·제작 시기·주제는 확인하지 못함.
- **사진 출처**: [File:Duomo Milan (Vitraux).jpg](https://commons.wikimedia.org/wiki/File:Duomo_Milan_(Vitraux).jpg) · 작가 Van Der Meulen Christofle · **CC0 1.0** (https://creativecommons.org/publicdomain/zero/1.0/) · 확인일 2026-11-12
- **크레딧 문구**: (표시 의무 없음) Van Der Meulen Christofle, CC0, via Wikimedia Commons
- **받은 원본**: `assets/church/glass_src/milan_window_orig.jpg` — thumb1920 1920×2560 (Commons/미술관 원본 3024×4032)
- **파일**: `assets/church/glass_milan_apse_lower.webp` 2634×1505 1.51MB q90 · `assets/church/glass_milan_apse_lower_2k.webp` 2048×1170 1.06MB q90 · `assets/church/glass_milan_apse_lower_1k.webp` 1024×585 0.34MB q90
- **색감**: 빨강·파랑·노랑·보라 고채도 장면.
- **복원 내용**: 기하: 손으로 잡은 4점 투시 보정 · 가로세로비 1.75 로 고정 · 윤곽: 직사각(알파 전체 불투명) · 검은점(베일링 글레어 제거, 세 채널 동일값) [0.0, 0.0, 0.0] · 플랫필드: 1차(선형) 기울기만 보정, 측정된 밝기 기울기 1.1배 중 최대 ±25% 범위·강도 0.6 · 화이트밸런스 게인 RGB [0.995, 1.0, 1.004] (밝은 무채색 유리 기준, ±5% 제한) · 노출 ×0.94, 감마 0.71, 채도(Lab 크로마, 색상각 유지) ×1.15 · 노이즈 제거 h=3, 언샤프 0.5/σ1.1 · 인페인팅 없음(지운 것·그려 넣은 것 없음) · 해상도: 창 부분 원본 긴 변 1756px → 마스터 2634px (×1.5) — 확대본
- **한계**: 창 전체가 아닌 부분. 심하게 올려 찍은 사진을 4점 투시 보정했고, 세로 비율(가로:세로≈1.75)은 추정이라 실제 비례와 다를 수 있다. 1920px 썸네일 → 1.5배 확대, 위쪽 단은 흐리다.
- **어울리는 성당**: milan — authentic(실물)

### `rose_notredame_south` — 파리 노트르담 남쪽 장미창

- **원어/영어 제목**: Notre-Dame de Paris, south rose window
- **위치**: 노트르담 대성당 남쪽 익랑 · 파리 · 프랑스
- **제작 시기 · 작가**: c. 1260년(19세기 대규모 복원) · 작가 미상
- **형태**: rose · **실제 크기**: 지름 12.9 m (est) · 마스터 가로세로비 1.0
- **주제**: 그리스도를 중심으로 사도·순교자·성인들의 메달리온이 네 겹의 원으로 둘러싼 장미창.
- **verify**: 지름 약 12.9m 는 통상 인용되는 값. 19세기 비올레르뒤크 복원 때 상당 부분이 교체·재배치된 것으로 알려짐.
- **사진 출처**: [File:Notre-Dame-de-Paris - rosace sud.jpg](https://commons.wikimedia.org/wiki/File:Notre-Dame-de-Paris_-_rosace_sud.jpg) · 작가 Albertus teolog (derivative work: Eusebius) · **CC BY 3.0** (https://creativecommons.org/licenses/by/3.0/) · 확인일 2026-11-12
- **크레딧 문구** (필수): "Notre-Dame-de-Paris - rosace sud" by Albertus teolog (derivative work: Eusebius), CC BY 3.0 (https://creativecommons.org/licenses/by/3.0/), via Wikimedia Commons — 크롭·투시/색 보정함
- **받은 원본**: `assets/church/glass_src/rose_notredame_south_orig.jpg` — thumb1920 1920×1987 (Commons/미술관 원본 2091×2164)
- **파일**: `assets/church/glass_rose_notredame_south.webp` 2640×2640 1.70MB q90 · `assets/church/glass_rose_notredame_south_2k.webp` 2048×2048 1.22MB q90 · `assets/church/glass_rose_notredame_south_1k.webp` 1024×1024 0.43MB q90
- **색감**: 보라·파랑·빨강.
- **복원 내용**: 기하: 직사각 크롭(투시 보정 없음) · 윤곽: 원형 알파 · 검은점(베일링 글레어 제거, 세 채널 동일값) [0.0, 0.0, 0.0] · 플랫필드: 1차(선형) 기울기만 보정, 측정된 밝기 기울기 1.42배 중 최대 ±25% 범위·강도 0.6 · 화이트밸런스 게인 RGB [1.003, 1.0, 1.006] (밝은 무채색 유리 기준, ±5% 제한) · 노출 ×0.88, 감마 0.6, 채도(Lab 크로마, 색상각 유지) ×0.95 · 노이즈 제거 h=5, 언샤프 0.5/σ1.1 · 인페인팅 없음(지운 것·그려 넣은 것 없음) · 해상도: 창 부분 원본 긴 변 1760px → 마스터 2640px (×1.5) — 확대본
- **한계**: 원본이 이미 강하게 보정된 파생 사진(노이즈·과채도)이라 채도를 오히려 조금 낮추고 노이즈를 줄였다. 석재는 검게 찍힘. 1920px 썸네일 → 1.5배 확대, 4096 마스터가 아님.
- **어울리는 성당**: basic — reference(다른 성당의 창, 표시 필요), myeongdong — reference(다른 성당의 창, 표시 필요), milan — reference(다른 성당의 창, 표시 필요)

### `canterbury_n14` — 캔터베리 예형론 창 (n.XIV)

- **원어/영어 제목**: Canterbury Cathedral typological window n.XIV
- **위치**: 캔터베리 대성당 북쪽 성가대 측랑 · 캔터베리 · 영국
- **제작 시기 · 작가**: 12세기 말~13세기 초 · 작가 미상
- **형태**: lancet(반원 아치) · **실제 크기**: 미상 · 마스터 가로세로비 0.4934
- **주제**: 신약의 장면과 그것을 예고하는 구약의 장면을 나란히 놓은 예형론(「가난한 이의 성경」) 창. 맨 위에는 별을 따라가는 동방 박사들이 있다.
- **verify**: 사진 설명에 따르면 위쪽 14개 패널만 원래 자리이고 나머지는 다른 창에서 옮겨 온 것. 각 장면 내용은 확인하지 못함.
- **사진 출처**: [File:Canterbury Cathedral window n.XIV (23778480668).jpg](https://commons.wikimedia.org/wiki/File:Canterbury_Cathedral_window_n.XIV_(23778480668).jpg) · 작가 Jules & Jenny · **CC BY 2.0** (https://creativecommons.org/licenses/by/2.0/) · 확인일 2026-11-12
- **크레딧 문구** (필수): "Canterbury Cathedral window n.XIV (23778480668)" by Jules & Jenny, CC BY 2.0 (https://creativecommons.org/licenses/by/2.0/), via Wikimedia Commons — 크롭·투시/색 보정함
- **받은 원본**: `assets/church/glass_src/canterbury_n14_orig.jpg` — thumb1920 1920×3651 (Commons/미술관 원본 2539×4828)
- **파일**: `assets/church/glass_canterbury_n14.webp` 2021×4096 2.74MB q90 · `assets/church/glass_canterbury_n14_2k.webp` 1010×2048 1.00MB q90 · `assets/church/glass_canterbury_n14_1k.webp` 505×1024 0.32MB q90
- **색감**: 깊은 파랑 바탕, 빨강·녹색·흰색.
- **복원 내용**: 기하: 자동 사다리꼴 보정(위/아래 폭 비 0.956) · 윤곽: 밝은 유리 영역의 볼록 껍질(창 개구부)로 알파 생성 · 검은점(베일링 글레어 제거, 세 채널 동일값) [0.0, 0.0, 0.0] · 플랫필드: 1차(선형) 기울기만 보정, 측정된 밝기 기울기 1.87배 중 최대 ±25% 범위·강도 0.6 · 화이트밸런스 게인 RGB [1.05, 1.0, 0.977] (밝은 무채색 유리 기준, ±5% 제한) · 노출 ×0.91, 감마 0.81, 채도(Lab 크로마, 색상각 유지) ×1.15 · 노이즈 제거 h=3, 언샤프 0.5/σ1.1 · 인페인팅 없음(지운 것·그려 넣은 것 없음) · 해상도: 창 부분 원본 긴 변 3468px → 마스터 4096px (×1.180999994277954) — 확대본
- **한계**: 약한 사다리꼴 보정. 1920px 썸네일 → 약 1.1배.
- **어울리는 성당**: basic — reference(다른 성당의 창, 표시 필요), myeongdong — reference(다른 성당의 창, 표시 필요)

### `siena_duccio_oculus` — 시에나 대성당 오큘러스 (두초)

- **원어/영어 제목**: Siena Cathedral oculus (Duccio di Buoninsegna)
- **위치**: 시에나 대성당 부속 미술관(Museo dell'Opera) 소장, 원래 대성당 후진 · 시에나 · 이탈리아
- **제작 시기 · 작가**: 1287–1288년 · 두초 디 부오닌세냐(밑그림)
- **형태**: oculus · **실제 크기**: 지름 5.6 m (est) · 마스터 가로세로비 1.0
- **주제**: 가운데 세로 축에 성모의 죽음·승천·대관을, 양옆에 시에나의 수호성인들을, 네 모서리에 복음사가들을 배치한 큰 원형 창. 이탈리아에 남은 가장 오래된 대형 스테인드글라스 가운데 하나다.
- **verify**: 지름 약 5.6m 는 통상 인용되는 추정치.
- **사진 출처**: [File:Siena Museo dell'Opera del Duomo Rosone.jpg](https://commons.wikimedia.org/wiki/File:Siena_Museo_dell%27Opera_del_Duomo_Rosone.jpg) · 작가 Zairon · **CC0 1.0** (https://creativecommons.org/publicdomain/zero/1.0/) · 확인일 2026-11-12
- **크레딧 문구**: (표시 의무 없음) Zairon, CC0, via Wikimedia Commons
- **받은 원본**: `assets/church/glass_src/siena_duccio_oculus_orig.jpg` — thumb3840 3840×3056 (Commons/미술관 원본 4760×3788)
- **파일**: `assets/church/glass_siena_duccio_oculus.webp` 3957×3957 3.64MB q90 · `assets/church/glass_siena_duccio_oculus_2k.webp` 2048×2048 1.41MB q90 · `assets/church/glass_siena_duccio_oculus_1k.webp` 1024×1024 0.47MB q90
- **색감**: 파랑·빨강·금색, 흰 테두리 무늬.
- **복원 내용**: 기하: 타원→원 보정(축 [1397.2, 1535.3], 회전 없는 대칭 아핀) · 윤곽: 원형 알파 · 검은점(베일링 글레어 제거, 세 채널 동일값) [0.0, 0.0, 0.0] · 플랫필드: 1차(선형) 기울기만 보정, 측정된 밝기 기울기 1.62배 중 최대 ±25% 범위·강도 0.6 · 화이트밸런스 게인 RGB [0.981, 1.0, 1.05] (밝은 무채색 유리 기준, ±5% 제한) · 노출 ×0.9, 감마 0.67, 채도(Lab 크로마, 색상각 유지) ×1.15 · 노이즈 제거 h=3, 언샤프 0.5/σ1.1 · 인페인팅 없음(지운 것·그려 넣은 것 없음) · 해상도: 창 부분 원본 긴 변 2638px → 마스터 3957px (×1.5) — 확대본
- **한계**: 미술관 전시 상태를 비스듬히 찍은 사진을 타원→원 보정. 맨 아래는 받침대에 가려 있을 수 있다.
- **어울리는 성당**: basic — reference(다른 성당의 창, 표시 필요), florence — reference(다른 성당의 창, 표시 필요)

### `lincoln_deans_eye` — 링컨 대성당 「주임 사제의 눈」 장미창

- **원어/영어 제목**: Lincoln Cathedral, the Dean's Eye
- **위치**: 링컨 대성당 북쪽 익랑 · 링컨 · 영국
- **제작 시기 · 작가**: c. 1220–1235년 · 작가 미상
- **형태**: rose · **실제 크기**: 지름 7.3 m (est) · 마스터 가로세로비 1.0
- **주제**: 판형 트레이서리의 큰 원형 창으로, 최후의 심판을 주제로 한 13세기 유리가 많이 남아 있다. 맞은편 남쪽 익랑의 「주교의 눈」과 짝을 이룬다.
- **verify**: 지름 약 7.3m(24피트)는 통상 인용되는 추정치. 2000년대에 석조와 유리가 보존 수리되었다고 알려짐.
- **사진 출처**: [File:Lincoln Cathedral, Deans eye window (High resolution) (38822141462).jpg](https://commons.wikimedia.org/wiki/File:Lincoln_Cathedral,_Deans_eye_window_(High_resolution)_(38822141462).jpg) · 작가 Jules & Jenny · **CC BY 2.0** (https://creativecommons.org/licenses/by/2.0/) · 확인일 2026-11-12
- **크레딧 문구** (필수): "Lincoln Cathedral, Deans eye window (High resolution) (38822141462)" by Jules & Jenny, CC BY 2.0 (https://creativecommons.org/licenses/by/2.0/), via Wikimedia Commons — 크롭·투시/색 보정함
- **받은 원본**: `assets/church/glass_src/lincoln_deans_eye_orig.jpg` — thumb3840 3840×3387 (Commons/미술관 원본 6718×5926)
- **파일**: `assets/church/glass_lincoln_deans_eye.webp` 4096×4096 5.02MB q90 · `assets/church/glass_lincoln_deans_eye_2k.webp` 2048×2048 1.51MB q90 · `assets/church/glass_lincoln_deans_eye_1k.webp` 1024×1024 0.43MB q90
- **색감**: 깊은 파랑·빨강, 13세기 유리.
- **복원 내용**: 기하: 직사각 크롭(투시 보정 없음) · 가로세로비 1.0 로 고정 · 윤곽: 원형 알파 · 검은점(베일링 글레어 제거, 세 채널 동일값) [0.0, 0.0, 0.0] · 플랫필드: 1차(선형) 기울기만 보정, 측정된 밝기 기울기 1.9배 중 최대 ±25% 범위·강도 0.6 · 화이트밸런스 게인 RGB [1.035, 1.0, 1.05] (밝은 무채색 유리 기준, ±5% 제한) · 노출 ×0.94, 감마 0.6, 채도(Lab 크로마, 색상각 유지) ×1.15 · 노이즈 제거 h=3, 언샤프 0.5/σ1.1 · 인페인팅 없음(지운 것·그려 넣은 것 없음) · 해상도: 창 부분 원본 긴 변 3644px → 마스터 4096px (×1.1239999532699585) — 확대본
- **한계**: 정면 고해상도 사진(3840px 썸네일). 석재는 거의 검게 찍힘.
- **어울리는 성당**: basic — reference(다른 성당의 창, 표시 필요), myeongdong — reference(다른 성당의 창, 표시 필요)

### `burnejones_stgermans` — 세인트 저먼스 동쪽 창 (번존스·모리스 상회)

- **원어/영어 제목**: St Germans Priory east window (Burne-Jones / Morris & Co.)
- **위치**: 세인트 저먼스 수도원 성당 · 콘월 · 영국
- **제작 시기 · 작가**: 1896년경 · 에드워드 번존스 밑그림, 모리스 상회 제작
- **형태**: lancet(5연창+트레이서리) · **실제 크기**: 미상 · 마스터 가로세로비 0.5972
- **주제**: 다섯 랜싯에 두 단으로 인물상 열 명을 세우고 위쪽 트레이서리에 천사들을 배치한 라파엘 전파 양식의 창.
- **verify**: 제작 연도(1896)와 각 인물의 정체는 이번에 확인하지 못함.
- **사진 출처**: [File:St Germans Priory east window by Edward Burne Jones.jpg](https://commons.wikimedia.org/wiki/File:St_Germans_Priory_east_window_by_Edward_Burne_Jones.jpg) · 작가 Ojwelch · **CC0 1.0** (https://creativecommons.org/publicdomain/zero/1.0/) · 확인일 2026-11-12
- **크레딧 문구**: (표시 의무 없음) Ojwelch, CC0, via Wikimedia Commons
- **받은 원본**: `assets/church/glass_src/burnejones_stgermans_orig.jpg` — thumb1280 1280×1920 (Commons/미술관 원본 1920×2880)
- **파일**: `assets/church/glass_burnejones_stgermans.webp` 1548×2592 1.06MB q90 · `assets/church/glass_burnejones_stgermans_2k.webp` 1223×2048 0.76MB q90 · `assets/church/glass_burnejones_stgermans_1k.webp` 612×1024 0.25MB q90
- **색감**: 맑은 흰 유리 바탕, 짙은 파랑·빨강·녹색 옷.
- **복원 내용**: 기하: 창 윤곽에 맞춘 직사각 크롭(투시 보정 없음) · 윤곽: 밝은 유리 영역의 볼록 껍질(창 개구부)로 알파 생성 · 검은점(베일링 글레어 제거, 세 채널 동일값) [0.0, 0.0, 0.0] · 플랫필드: 1차(선형) 기울기만 보정, 측정된 밝기 기울기 1.47배 중 최대 ±25% 범위·강도 0.6 · 화이트밸런스 게인 RGB [1.024, 1.0, 1.05] (밝은 무채색 유리 기준, ±5% 제한) · 노출 ×0.85, 감마 0.6, 채도(Lab 크로마, 색상각 유지) ×1.15 · 노이즈 제거 h=3, 언샤프 0.5/σ1.1 · 인페인팅 없음(지운 것·그려 넣은 것 없음) · 해상도: 창 부분 원본 긴 변 1728px → 마스터 2592px (×1.5) — 확대본
- **한계**: 원본 1920×2880(1280px 썸네일) → 1.5배 확대, 4096 마스터가 아님. 석재는 검게 찍힘.
- **어울리는 성당**: basic — reference(다른 성당의 창, 표시 필요), myeongdong — reference(다른 성당의 창, 표시 필요)

### `lancet_chartres_incarnation` — 그리스도의 생애 (강생) 창

- **원어/영어 제목**: Incarnation / Life of Christ window
- **위치**: 샤르트르 대성당 서쪽 정면 중앙 (baie 50) · 샤르트르 · 프랑스
- **제작 시기 · 작가**: c. 1145–1155년 · 작가 미상
- **형태**: lancet · **실제 크기**: 미상 · 마스터 가로세로비 0.3469
- **주제**: 서쪽 정면 세 랜싯 가운데 중앙 창으로, 주님 탄생 예고부터 예루살렘 입성까지 그리스도의 어린 시절과 공생활 장면이 네모·원 패널에 차례로 이어진다. 꼭대기에는 성모자가 있다.
- **verify**: 실측 크기는 확인하지 못함.
- **사진 출처**: [File:Chartres 50 -rectifié.JPG](https://commons.wikimedia.org/wiki/File:Chartres_50_-rectifi%C3%A9.JPG) · 작가 Micheletb (Michelet-密是力) · **Public domain** (https://commons.wikimedia.org/wiki/Commons:Licensing#Material_in_the_public_domain) · 확인일 2026-11-12
- **크레딧 문구**: (표시 의무 없음) Micheletb (Michelet-密是力), Public domain, via Wikimedia Commons
- **받은 원본**: `assets/church/glass_src/lancet_chartres_incarnation_orig.jpg` — thumb3840 3840×11074 (Commons/미술관 원본 4434×12787)
- **파일**: `assets/church/glass_lancet_chartres_incarnation.webp` 1421×4096 2.53MB q90 · `assets/church/glass_lancet_chartres_incarnation_2k.webp` 710×2048 0.78MB q90 · `assets/church/glass_lancet_chartres_incarnation_1k.webp` 355×1024 0.22MB q90
- **색감**: 파랑 바탕에 빨강·녹색·노랑.
- **복원 내용**: 기하: 창 윤곽에 맞춘 직사각 크롭(투시 보정 없음) · 윤곽: 밝은 유리 영역의 볼록 껍질(창 개구부)로 알파 생성 · 검은점(베일링 글레어 제거, 세 채널 동일값) [0.0, 0.0, 0.0] · 플랫필드: 1차(선형) 기울기만 보정, 측정된 밝기 기울기 2.98배 중 최대 ±25% 범위·강도 0.6 · 화이트밸런스 게인 RGB [1.05, 1.0, 1.05] (밝은 무채색 유리 기준, ±5% 제한) · 노출 ×0.83, 감마 0.6, 채도(Lab 크로마, 색상각 유지) ×1.15 · 노이즈 제거 h=3, 언샤프 0.5/σ1.1 · 인페인팅 없음(지운 것·그려 넣은 것 없음) · 해상도: 창 부분 원본 긴 변 11074px → 마스터 4096px (×0.3700000047683716)
- **한계**: 업로더가 정면 보정한 사진(PD), 1920px 폭 썸네일.
- **어울리는 성당**: basic — reference(다른 성당의 창, 표시 필요), myeongdong — reference(다른 성당의 창, 표시 필요)

### `rose_notredame_north` — 파리 노트르담 북쪽 장미창 (2024년 재개관 뒤)

- **원어/영어 제목**: Notre-Dame de Paris, north rose window (after the 2024 reopening)
- **위치**: 노트르담 대성당 북쪽 익랑 · 파리 · 프랑스
- **제작 시기 · 작가**: c. 1250년 · 작가 미상
- **형태**: rose · **실제 크기**: 지름 12.9 m (est) · 마스터 가로세로비 1.0
- **주제**: 중심의 성모자를 구약의 예언자·판관·임금·대사제들이 동심원으로 둘러싼 장미창. 노트르담의 세 장미창 가운데 13세기 유리가 가장 많이 남아 있는 것으로 알려져 있다. 2019년 화재 뒤 청소·복원을 마친 2024년 12월의 모습이다.
- **verify**: 지름 약 12.9m 는 통상 인용되는 값.
- **사진 출처**: [File:North rose window of Notre-Dame de Paris, Dec. 2024 (1).jpg](https://commons.wikimedia.org/wiki/File:North_rose_window_of_Notre-Dame_de_Paris,_Dec._2024_(1).jpg) · 작가 Ibex73 · **CC BY 4.0** (https://creativecommons.org/licenses/by/4.0/) · 확인일 2026-11-12
- **크레딧 문구** (필수): "North rose window of Notre-Dame de Paris, Dec. 2024 (1)" by Ibex73, CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/), via Wikimedia Commons — 크롭·투시/색 보정함
- **받은 원본**: `assets/church/glass_src/notredame_north_2024_orig.jpg` — thumb3840 3840×2560 (Commons/미술관 원본 5368×3579)
- **파일**: `assets/church/glass_rose_notredame_north.webp` 3510×3510 3.74MB q90 · `assets/church/glass_rose_notredame_north_2k.webp` 2048×2048 1.65MB q90 · `assets/church/glass_rose_notredame_north_1k.webp` 1024×1024 0.51MB q90
- **색감**: 파랑·보라 지배, 빨강 점. 밝은 석회암 트레이서리가 보인다.
- **복원 내용**: 기하: 직사각 크롭(투시 보정 없음) · 윤곽: 원형 알파 · 검은점(베일링 글레어 제거, 세 채널 동일값) [0.0, 0.0, 0.0] · 플랫필드 보정 안 함 · 화이트밸런스 게인 RGB [1.05, 1.0, 0.991] (밝은 무채색 유리 기준, ±5% 제한) · 노출 ×0.91, 감마 0.92, 채도(Lab 크로마, 색상각 유지) ×1.15 · 노이즈 제거 h=3, 언샤프 0.5/σ1.1 · 인페인팅 없음(지운 것·그려 넣은 것 없음) · 해상도: 창 부분 원본 긴 변 2340px → 마스터 3510px (×1.5) — 확대본
- **한계**: ★ 창 전체가 아님: 사진에서 장미창 맨 아래 약 9%가 사진 밖(및 난간 뒤)이라 그 부분은 투명(알파 0)으로 비워 두었다 — 지어내지 않음. 아래에서 올려 찍은 원근은 보정하지 않았다(원 외접 정사각 크롭). 사방 모서리의 스팬드럴 유리는 원형 마스크로 잘려 나간다.
- **어울리는 성당**: basic — reference(다른 성당의 창, 표시 필요), myeongdong — reference(다른 성당의 창, 표시 필요)

## 성당별 사용 가능 창

| 성당 | authentic(실물) | reference(참고 — 실제 소재지 표시 필요) |
|---|---|---|
| stpeter | `dove_stpeter` | `alabaster_slab` |
| lateran | **없음** | `grisaille_aconite`, `alabaster_stpaul_1`, `alabaster_stpaul_2`, `alabaster_slab`, `grisaille_knot`, `augsburg_daniel`, `augsburg_hosea`, `fivesisters_york` |
| maggiore | **없음** | `alabaster_stpaul_1`, `alabaster_stpaul_2`, `alabaster_slab` |
| stpaul | `alabaster_stpaul_1`, `alabaster_stpaul_2` | `alabaster_slab` |
| milan | `milan_apse_lower` | `strasbourg_rose`, `rose_notredame_south` |
| florence | `oculus_florence_donatello`, `oculus_florence_ghiberti_1`, `oculus_florence_ghiberti_2` | `siena_duccio_oculus` |
| myeongdong | **없음** | `panel_crucified`, `panel_catherine_donor`, `leoben_annunciation`, `leoben_magi`, `rose_chartres_north`, `rose_chartres_west`, `rose_chartres_south`, `lancet_chartres_belle`, `lancet_chartres_jesse`, `lancet_chartres_samaritan`, `medallion_chartres`, `lancet_cologne`, `lancet_gesta`, `grisaille_knot`, `canterbury_n3`, `beverley_west`, `tiffany_angel_resurrection`, `tiffany_crown_glory`, `lancet_chartres_passion`, `rose_notredame_south`, `canterbury_n14`, `lincoln_deans_eye`, `burnejones_stgermans`, `lancet_chartres_incarnation`, `rose_notredame_north` |
| basic | **없음** | `tiffany_hinds`, `panel_crucified`, `panel_catherine_donor`, `leoben_annunciation`, `leoben_magi`, `panel_gethsemane`, `grisaille_aconite`, `rose_chartres_north`, `rose_chartres_west`, `rose_chartres_south`, `lancet_chartres_belle`, `lancet_chartres_jesse`, `lancet_chartres_samaritan`, `medallion_chartres`, `lancet_cologne`, `lancet_gesta`, `grisaille_knot`, `rose_saintechapelle`, `rose_york`, `canterbury_n3`, `beverley_west`, `strasbourg_rose`, `augsburg_daniel`, `augsburg_hosea`, `tiffany_angel_resurrection`, `tiffany_crown_glory`, `tiffany_parakeets`, `tiffany_wooded_landscape`, `lancet_chartres_passion`, `fivesisters_york`, `wyspianski_god_father`, `rose_notredame_south`, `canterbury_n14`, `siena_duccio_oculus`, `lincoln_deans_eye`, `burnejones_stgermans`, `lancet_chartres_incarnation`, `rose_notredame_north` |

- lateran · maggiore · myeongdong 은 여전히 **실물 사진이 없다**(허용 라이선스로 창이 크게 찍힌 사진을 찾지 못함). 산타 마리아 마조레 정면 장미창(조반니 하이날, 1995)은 현대 저작물이라 쓸 수 없다.
- milan 의 실물은 창 일부(`milan_apse_lower`)뿐이다.

## 출처 표기

CC BY 사진은 아래 문구를 앱의 라이선스/출처 화면에 **그대로** 실어야 한다(필수). 각 창 감상 화면에도 촬영자·라이선스를 함께 보이는 것을 권한다.

- `glass_alabaster_stpaul_1*.webp` — "Alabaster window of the Basilica of Saint Paul Outside the Walls 02" by Szilas, CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/), via Wikimedia Commons — 크롭·투시/색 보정함
- `glass_alabaster_stpaul_2*.webp` — "Alabaster window of the Basilica of Saint Paul Outside the Walls 04" by Szilas, CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/), via Wikimedia Commons — 크롭·투시/색 보정함
- `glass_alabaster_slab*.webp` — "Alabaster window in the Mausoleum of Galla Placidia, 425-50; Ravenna (2)" by Richard Mortel, CC BY 2.0 (https://creativecommons.org/licenses/by/2.0/), via Wikimedia Commons — 크롭·투시/색 보정함
- `glass_lancet_cologne*.webp` — "Die Fenster im Kölner Dom - 7 von 9 - panoramio" by Edgar El, CC BY 3.0 (https://creativecommons.org/licenses/by/3.0/), via Wikimedia Commons — 크롭·투시/색 보정함
- `glass_rose_york*.webp` — "York Minster Rose window S16 (15563016153)" by Jules & Jenny, CC BY 2.0 (https://creativecommons.org/licenses/by/2.0/), via Wikimedia Commons — 크롭·투시/색 보정함
- `glass_canterbury_n3*.webp` — "Canterbury Cathedral, window n.III (36940593903)" by Jules & Jenny, CC BY 2.0 (https://creativecommons.org/licenses/by/2.0/), via Wikimedia Commons — 크롭·투시/색 보정함
- `glass_beverley_west*.webp` — "Beverley Minster, West window (23725072089)" by Jules & Jenny, CC BY 2.0 (https://creativecommons.org/licenses/by/2.0/), via Wikimedia Commons — 크롭·투시/색 보정함
- `glass_augsburg_daniel*.webp` — "2019-01-27 Augsburg 082 Augsburger Dom, Prophetenfenster Daniel (47101327862)" by Allie_Caulfield, CC BY 2.0 (https://creativecommons.org/licenses/by/2.0/), via Wikimedia Commons — 크롭·투시/색 보정함
- `glass_augsburg_hosea*.webp` — "2019-01-27 Augsburg 081 Augsburger Dom, Prophetenfenster Hosea (47101330312)" by Allie_Caulfield, CC BY 2.0 (https://creativecommons.org/licenses/by/2.0/), via Wikimedia Commons — 크롭·투시/색 보정함
- `glass_fivesisters_york*.webp` — "York Minster window n16 "The Five sisters" (16157008236)" by Jules & Jenny, CC BY 2.0 (https://creativecommons.org/licenses/by/2.0/), via Wikimedia Commons — 크롭·투시/색 보정함
- `glass_rose_notredame_south*.webp` — "Notre-Dame-de-Paris - rosace sud" by Albertus teolog (derivative work: Eusebius), CC BY 3.0 (https://creativecommons.org/licenses/by/3.0/), via Wikimedia Commons — 크롭·투시/색 보정함
- `glass_canterbury_n14*.webp` — "Canterbury Cathedral window n.XIV (23778480668)" by Jules & Jenny, CC BY 2.0 (https://creativecommons.org/licenses/by/2.0/), via Wikimedia Commons — 크롭·투시/색 보정함
- `glass_lincoln_deans_eye*.webp` — "Lincoln Cathedral, Deans eye window (High resolution) (38822141462)" by Jules & Jenny, CC BY 2.0 (https://creativecommons.org/licenses/by/2.0/), via Wikimedia Commons — 크롭·투시/색 보정함
- `glass_rose_notredame_north*.webp` — "North rose window of Notre-Dame de Paris, Dec. 2024 (1)" by Ibex73, CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/), via Wikimedia Commons — 크롭·투시/색 보정함

나머지는 CC0 / Public domain 이라 표시 의무는 없지만 위 「크레딧 문구」를 함께 싣는 것을 권한다. 클리블랜드 미술관 CC0 자료는 미술관이 출처 표기를 요청한다(의무 아님).

## 기존 id 대응

| 기존 `glass_<id>.jpg` | 새 카탈로그 |
|---|---|
| lancet_chartres_1 | `lancet_chartres_incarnation` (같은 baie 50, 더 큰 정면 보정 사진) |
| lancet_milan_1, panels_milan_2 | `milan_apse_lower` (같은 사진에서 온전히 찍힌 하부 6단을 하나로) |
| rose_notredame_north | 같은 id, **사진 교체**(2024년 재개관 뒤 사진, CC BY 4.0 Ibex73) |
| tracery_cologne, grisaille_lancet | 새 카탈로그에서 제외(창 전체가 아닌 부분 / 밝은 벽 속 설치 사진). 기존 jpg 는 그대로 있음 |
| 그 밖의 13개 | 같은 id 로 WebP 마스터 추가 |

## 뺀 후보와 이유

- QA(대조 시트 검토)에서 뺀 마스터 3점: `lausanne_rose`(하이라이트가 날아가 유리 색이 흰색으로 뭉개짐 — 충실한 복원 불가), `york_east_window`(심한 노출 부족으로 유리가 판독되지 않음), `clarke_crucifixion`(사진은 CC BY 4.0 이나 「Harry Clarke Studios」 명의라 디자인 저작권 만료를 확인할 수 없음). 더 좋은 사진·근거가 생기면 다시 만들 수 있다.
- 저작권이 남아 있는 작품: 샤갈·루오·마티스·리히터(쾰른 남쪽 익랑 창), 사우스웰 민스터 서쪽 창(패트릭 레인티언스 1996 — 받았다가 삭제), 생드니의 현대 창(받았다가 삭제), 사그라다 파밀리아.
- 창 전체가 아닌 사진: 랭스 장미창 2점, 노트르담 남·북 장미창 2024년 근접 사진들, 캔터베리 s2·「그리스도의 조상」, 요크 동쪽 대창 트레이서리.
- 비스듬해서 보정 불가: 생트샤펠 랜싯 2점, 쾰른 「2 von 9」, 글로스터 동쪽 창, 보스턴 트리니티 교회 번존스 창, 밀라노 정면 창(흐림·날아감).
- 접속 차단: 시카고 미술관(AIC) IIIF 가 403 → 티파니 「백합(Corey Memorial)」 창을 받지 못함. 메트로폴리탄 검색 API 는 410(종료)이라 Met 소장 티파니 창을 찾지 못함.
- 찾지 못한 것: 쾰른 바이에른 창·성령 강림 창의 정면 사진(CC BY-SA 만 있음), 부르주·르망·푸아티에의 창 전체 사진, 산타 마리아 마조레·라테라노·명동대성당의 창 근접 사진.

## 다시 받을 것 (Wikimedia 접속 제한)

이 작업 환경의 IP 에서는 Wikimedia **원본 파일**이 계속 429(Retry-After 600초)로 거절되어, Wikimedia 가 허용하는 표준 썸네일 폭(3840 / 1920 / 1280 / 960px)으로만 받았다. 원본 폭이 3840px 미만인 사진은 한 단계 아래 썸네일이 되어 손해가 크다. 아래는 원본을 받으면 마스터가 좋아지는 순서다.

| id | 받은 것 | Commons 원본 | 원본 URL |
|---|---|---|---|
| `tiffany_wooded_landscape` | 3840×2470 | 8169×5255 | https://commons.wikimedia.org/wiki/File:Louis_Comfort_Tiffany_-_A_Wooded_Landscape_in_Three_Panels_-_Google_Art_Project.jpg |
| `tiffany_angel_resurrection` | 1920×2976 | 3774×5849 | https://commons.wikimedia.org/wiki/File:Louis_Comfort_Tiffany_-_Angel_of_the_Resurrection_-_Google_Art_Project.jpg |
| `tiffany_crown_glory` | 1920×3060 | 3744×5967 | https://commons.wikimedia.org/wiki/File:Louis_Comfort_Tiffany_-_The_Righteous_Shall_Receive_A_Crown_of_Glory,_1901.jpg |
| `lancet_chartres_samaritan` | 1920×6453 | 3741×12573 | https://commons.wikimedia.org/wiki/File:Chartres_44_-Corrected.jpg |
| `alabaster_slab` | 1920×2948 | 3504×5380 | https://commons.wikimedia.org/wiki/File:Alabaster_window_in_the_Mausoleum_of_Galla_Placidia,_425-50%3B_Ravenna_(2).jpg |
| `rose_chartres_south` | 1920×2880 | 3456×5184 | https://commons.wikimedia.org/wiki/File:Vitrail_Chartres-122.jpg |
| `augsburg_daniel` | 1920×2982 | 3430×5327 | https://commons.wikimedia.org/wiki/File:2019-01-27_Augsburg_082_Augsburger_Dom,_Prophetenfenster_Daniel_(47101327862).jpg |
| `tiffany_parakeets` | 1920×3707 | 3418×6600 | https://commons.wikimedia.org/wiki/File:Louis_Comfort_Tiffany_-_Parakeets_and_Gold_Fish_Bowl,_1893.jpg |
| `lincoln_deans_eye` | 3840×3387 | 6718×5926 | https://commons.wikimedia.org/wiki/File:Lincoln_Cathedral,_Deans_eye_window_(High_resolution)_(38822141462).jpg |
| `alabaster_stpaul_1` | 1920×2880 | 3168×4752 | https://commons.wikimedia.org/wiki/File:Alabaster_window_of_the_Basilica_of_Saint_Paul_Outside_the_Walls_02.jpg |
| `alabaster_stpaul_2` | 1920×2880 | 3168×4752 | https://commons.wikimedia.org/wiki/File:Alabaster_window_of_the_Basilica_of_Saint_Paul_Outside_the_Walls_04.jpg |
| `augsburg_hosea` | 1920×3023 | 3109×4895 | https://commons.wikimedia.org/wiki/File:2019-01-27_Augsburg_081_Augsburger_Dom,_Prophetenfenster_Hosea_(47101330312).jpg |
| `milan_apse_lower` | 1920×2560 | 3024×4032 | https://commons.wikimedia.org/wiki/File:Duomo_Milan_(Vitraux).jpg |
| `rose_chartres_west` | 1920×1920 | 3022×3022 | https://commons.wikimedia.org/wiki/File:Vitrail_Chartres-rosace_143_%2Bnet_%26_corrig%C3%A9e.jpg |
| `lancet_chartres_jesse` | 1920×6591 | 2891×9924 | https://commons.wikimedia.org/wiki/File:Vitrail_Chartres-049_rectifi%C3%A9.jpg |
| `burnejones_stgermans` | 1280×1920 | 1920×2880 | https://commons.wikimedia.org/wiki/File:St_Germans_Priory_east_window_by_Edward_Burne_Jones.jpg |
| `lancet_chartres_passion` | 1920×7057 | 2734×10049 | https://commons.wikimedia.org/wiki/File:Vitrail_Chartres-051_rectifi%C3%A9.JPG |
| `fivesisters_york` | 1920×2486 | 2716×3516 | https://commons.wikimedia.org/wiki/File:York_Minster_window_n16_%22The_Five_sisters%22_(16157008236).jpg |
| `lancet_gesta` | 1280×2963 | 1804×4176 | https://commons.wikimedia.org/wiki/File:Saint-Eutrope,_vitrail_Gesta,_Marsilly,_Charente-Maritime,_august_2015.jpg |
| `rose_notredame_north` | 3840×2560 | 5368×3579 | https://commons.wikimedia.org/wiki/File:North_rose_window_of_Notre-Dame_de_Paris,_Dec._2024_(1).jpg |
| `strasbourg_rose` | 1280×1280 | 1770×1770 | https://commons.wikimedia.org/wiki/File:Rosace_cathedrale_strasbourg.jpg |
| `wyspianski_god_father` | 1280×1707 | 1704×2272 | https://commons.wikimedia.org/wiki/File:016Krak%C3%B3wFranciszka%C5%84ski.JPG |
| `dove_stpeter` | 3840×5745 | 5097×7625 | https://commons.wikimedia.org/wiki/File:Holy_Spirit_stained-glass_window_(Cathedra_Petri).jpg |
| `canterbury_n14` | 1920×3651 | 2539×4828 | https://commons.wikimedia.org/wiki/File:Canterbury_Cathedral_window_n.XIV_(23778480668).jpg |
| `grisaille_knot` | 960×2400 | 1265×3163 | https://commons.wikimedia.org/wiki/File:Geometric_Grisaille_c.1200-1250_-_Stained_Glass_Museum.jpg |
| `oculus_florence_ghiberti_1` | 960×946 | 1249×1231 | https://commons.wikimedia.org/wiki/File:Ghiberti,_assunzione_di_maria.jpg |
| `oculus_florence_ghiberti_2` | 960×949 | 1249×1235 | https://commons.wikimedia.org/wiki/File:Ghiberti,_ascensione.jpg |
| `rose_york` | 1920×1734 | 2472×2232 | https://commons.wikimedia.org/wiki/File:York_Minster_Rose_window_S16_(15563016153).jpg |
| `oculus_florence_donatello` | 1920×1906 | 2409×2391 | https://commons.wikimedia.org/wiki/File:Donatello,_incoronazione_della_vergine.jpg |
| `siena_duccio_oculus` | 3840×3056 | 4760×3788 | https://commons.wikimedia.org/wiki/File:Siena_Museo_dell%27Opera_del_Duomo_Rosone.jpg |
| `canterbury_n3` | 1280×3602 | 1486×4182 | https://commons.wikimedia.org/wiki/File:Canterbury_Cathedral,_window_n.III_(36940593903).jpg |
| `beverley_west` | 3840×6657 | 4447×7709 | https://commons.wikimedia.org/wiki/File:Beverley_Minster,_West_window_(23725072089).jpg |
| `lancet_chartres_incarnation` | 3840×11074 | 4434×12787 | https://commons.wikimedia.org/wiki/File:Chartres_50_-rectifi%C3%A9.JPG |
| `rose_chartres_north` | 1920×2658 | 2167×3000 | https://commons.wikimedia.org/wiki/File:Chartres_-_cath%C3%A9drale_-_rosace_nord.jpg |
| `lancet_cologne` | 1920×3167 | 2091×3449 | https://commons.wikimedia.org/wiki/File:Die_Fenster_im_K%C3%B6lner_Dom_-_7_von_9_-_panoramio.jpg |
| `rose_notredame_south` | 1920×1987 | 2091×2164 | https://commons.wikimedia.org/wiki/File:Notre-Dame-de-Paris_-_rosace_sud.jpg |
| `medallion_chartres` | 1920×1920 | 2089×2089 | https://commons.wikimedia.org/wiki/File:Vitrail_Chartres_210209_07.jpg |
