# 기도문 공식문 대조표 (PRAYER_VERIFICATION)

대조일: **2026-11-15**. 앱 안의 모든 기도문을 한국천주교주교회의(CBCK) 『가톨릭 기도서』(개정판; 주교회의 2017년 추계 정기 총회 승인, 2018-04-01 펴냄)의 **주교회의 누리집 전자 본문**과 글자·띄어쓰기·구두점·줄 나눔까지 대조했다. 대조는 눈이 아니라 프로그램으로 했다(공식 본문 응답을 받아 줄 단위로 `lib/domain/prayer_data.dart`, `tools/leader_voice/*.json`, `docs/church/PRAYER_LINES.txt`, `tools/leader_voice/manifest.json`, `data/stations_*.json` 과 문자열 비교). 이전 조사 `PRAYER_PHRASING.md`(2026-11-12)의 본문 대조(3절)를 다시 확인한 것이며 결론은 같다.

표의 ` / ` 는 줄 바꿈이다. 판정: **일치** = 글자·띄어쓰기·구두점·줄 나눔까지 같음, **수정** = 달라서 이번에 공식 문구로 고침, **표시(줄바꿈) 차이** = 글자는 같고 줄 나눔(띄어 읽기)만 다름(사용자가 확정한 띄어 읽기라 불일치로 세지 않음), **미확인** = 공식 게시본으로 확인하지 못함, **사용자 결정 필요** = 고치지 않고 남김.

## 0. 요약

**일치 185 / 수정 10 / 미확인 2 / 사용자 결정 필요 3** (별도: 표시(줄바꿈) 차이 2)

| 묶음 | 일치 | 수정 | 미확인 | 사용자 결정 필요 |
|---|---|---|---|---|
| 묵주기도 기도문 8 · 신비 20 · 분할 5 · 짧은 기도 6 | 39 | 0 | 0 | 0 |
| 음성 대본: 큐 31 · 끊어 읽기 대본 31 · 클립 대본 62 | 122 | 0 | 0 | 0 (줄바꿈 차이 2) |
| 십자가의 길 명칭 14 | 6 | 8 | 0 | 0 |
| 십자가의 길 기도문(시작 기도·처로 가며·계응·처별 14·지시문) | 18 | 2(앱 자작 문구 삭제) | 1(보조 묵상 검수) | 1(마침 기도) |
| 그 밖 | 0 | 0 | 1(2019-09 이후 개정 여부) | 2(제목 표기 「사도신경」·「묵주기도」) |

- **음성 클립(assets/leader_voice, 62개)에 영향을 주는 문구 변경은 없다.** 클립 62개의 합성 대본은 모두 공식 문구와 글자가 같다(6절).
- 이번에 고친 것은 십자가의 길뿐이다: 처 명칭 8개(공식 표기로), 앱이 지어 쓴 환호·시작 문구 2개(삭제하고 공식 기도문으로 대체). 묵주기도 쪽 기도문은 한 글자도 고치지 않았다.

## 1. 출처

| 출처 | 발행 | 본문 날짜 | 쓴 곳 | 확인 |
|---|---|---|---|---|
| https://cbck.or.kr/Catholic/Prayer — 『가톨릭 기도서』(개정판) 전자 본문. 본문은 `/Catholic/Prayer/PrayerContentsLoad?seq=N` (1 성호경, 2 주님의 기도, 3 성모송, 4 영광송, 5 사도 신경, 15 묵주 기도, 24 구원을 비는 기도, 29 묵주 기도 성월, 37 십자가의 길) | 한국천주교주교회의 | 본문 수정일 2019-09-03~05 (응답의 `modify_dt`) | 모든 항목의 기준 | 원문을 직접 받아 프로그램 대조 |
| 같은 페이지의 「일러두기」 4항(기호 뜻) | 한국천주교주교회의 | 2018-04-01 판 | 기호 ┼ ○ ● ◎ 의 뜻 | 원문 직접 확인 |
| https://cbck.or.kr/Notice/13013414?gb=K1200 — 『가톨릭 기도서』(개정판) 소개 | 한국천주교주교회의 | 2018-06-29 | 개정판에서 바뀐 기도(구원을 비는 기도 추가 등). 주님의 기도·성모송·영광송·사도 신경·십자가의 길은 변경 목록에 없음 | 원문 직접 확인 |
| https://cbck.or.kr/Copyright — 저작권 안내 | 한국천주교주교회의 | - | 『가톨릭 기도서』 내용의 전재·복제는 주교회의 승인 필요 | 원문 직접 확인 |
| https://maria.catholic.or.kr/mi_pr/prayer/prayer.asp (본문 `getPrayer.asp?menu=prayer&pgubun=P&ingId=N&sgubun=w`; 3/1~5 주요 기도, 3/127 구원을 비는 기도, 8/67 묵주 기도, 8/70 묵주기도 바치는 방법, 4/25 묵주 기도 성월, 9/32 십자가의 길) | 가톨릭 굿뉴스(천주교 서울대교구) | 표기 없음 | 둘째 출처(차이 기록, 5절) | 원문 직접 확인 |

확인하지 못한 것: 종이책(인쇄본) 자체, 가톨릭평화신문·서울대교구 누리집의 별도 게시본. 2019-09 이후 주교회의가 이 기도문들을 다시 고쳤다는 근거는 찾지 못했지만 "고치지 않았다"는 것을 적극적으로 밝힌 문서를 본 것도 아니다(미확인 1건으로 셈).

## 2. 묵주기도 기도문 (`lib/domain/prayer_data.dart`)

| 항목 | 앱 문구 | 공식 문구 | 출처 URL | 판정 |
|---|---|---|---|---|
| 성호경 (`sign_of_cross`) | 성부와 성자와 성령의 이름으로. / 아멘. | 같음(2줄) | https://cbck.or.kr/Catholic/Prayer (본문 `/Catholic/Prayer/PrayerContentsLoad?seq=1`) | 일치 |
| 사도 신경 (`apostles_creed`) | 전능하신 천주 성부 / 천지의 창조주를 저는 믿나이다. / 그 외아들 우리 주 예수 그리스도님 / 성령으로 인하여 동정 마리아께 잉태되어 나시고 / 본시오 빌라도 통치 아래서 고난을 받으시고 / 십자가에 못 박혀 돌아가시고 묻히셨으며 / 저승에 가시어 사흗날에 죽은 이들 가운데서 부활하시고 / 하늘에 올라 전능하신 천주 성부 오른편에 앉으시며 / 그리로부터 산 이와 죽은 이를 심판하러 오시리라 믿나이다. / 성령을 믿으며 / 거룩하고 보편된 교회와 모든 성인의 통공을 믿으며 / 죄의 용서와 육신의 부활을 믿으며 / 영원한 삶을 믿나이다. / 아멘. | 같음(14줄) | https://cbck.or.kr/Catholic/Prayer (본문 `/Catholic/Prayer/PrayerContentsLoad?seq=5`) | 일치 |
| 주님의 기도 (`our_father`) | 하늘에 계신 우리 아버지, / 아버지의 이름이 거룩히 빛나시며 / 아버지의 나라가 오시며 / 아버지의 뜻이 하늘에서와 같이 / 땅에서도 이루어지소서! / 오늘 저희에게 일용할 양식을 주시고 / 저희에게 잘못한 이를 저희가 용서하오니 / 저희 죄를 용서하시고 / 저희를 유혹에 빠지지 않게 하시고 / 악에서 구하소서. / 아멘. | 같음(11줄) | https://cbck.or.kr/Catholic/Prayer (본문 `/Catholic/Prayer/PrayerContentsLoad?seq=2`) | 일치 |
| 성모송 (`hail_mary`) | 은총이 가득하신 마리아님, 기뻐하소서! / 주님께서 함께 계시니 여인 중에 복되시며 / 태중의 아들 예수님 또한 복되시나이다. / 천주의 성모 마리아님, / 이제와 저희 죽을 때에 / 저희 죄인을 위하여 빌어 주소서. / 아멘. | 같음(7줄) | https://cbck.or.kr/Catholic/Prayer (본문 `/Catholic/Prayer/PrayerContentsLoad?seq=3`) | 일치 |
| 영광송 (`glory_be`) | 영광이 성부와 성자와 성령께 / 처음과 같이 / 이제와 항상 영원히. / 아멘. | 같음(4줄) | https://cbck.or.kr/Catholic/Prayer (본문 `/Catholic/Prayer/PrayerContentsLoad?seq=4`) | 일치 |
| 구원을 비는 기도 (`fatima`) | 예수님, 저희 죄를 용서하시며 / 저희를 지옥 불에서 구하시고 / 연옥 영혼을 돌보시며 / 가장 버림받은 영혼을 돌보소서. | 같음(4줄) | https://cbck.or.kr/Catholic/Prayer (본문 `/Catholic/Prayer/PrayerContentsLoad?seq=24`) | 일치 |
| 성모 찬송 (`salve_regina`) | 모후이시며 사랑이 넘친 어머니, / 우리의 생명, 기쁨, 희망이시여, / 당신 우러러 하와의 그 자손들이 / 눈물을 흘리며 부르짖나이다, / 슬픔의 골짜기에서. / 우리들의 보호자 성모님, / 불쌍한 저희를 / 인자로운 눈으로 굽어보소서. / 귀양살이 끝날 때에 / 당신의 아들 우리 주 예수님 뵙게 하소서. / 너그러우시고 자애로우시며 / 오! 아름다우신 동정 마리아님. | 같음(12줄). 공식 본문은 ○/● 교송(○ 2줄, ● 3줄, ○ 3줄, ● 4줄) | https://cbck.or.kr/Catholic/Prayer (본문 `/Catholic/Prayer/PrayerContentsLoad?seq=29`) — 묵주 기도 성월 | 일치 |
| 성모 찬송 응송·마침 기도 (`salve_regina_collect`) | 천주의 성모님, 저희를 위하여 빌어 주시어 / 그리스도께서 약속하신 영원한 생명을 얻게 하소서. / 기도합시다. / 하느님, / 외아드님께서 삶과 죽음과 부활로 / 저희에게 영원한 구원을 마련해 주셨나이다. / 복되신 동정 마리아와 함께 이 신비를 묵상하며 / 묵주 기도를 바치오니 / 저희가 그 가르침을 따라 / 영원한 생명을 얻게 하소서. / 우리 주 그리스도를 통하여 비나이다. / 아멘. | 같음(12줄). 공식 본문은 ○ 천주의 성모님… / ● 그리스도께서… / ┼ 기도합시다. … / ◎ 아멘. | https://cbck.or.kr/Catholic/Prayer (본문 `/Catholic/Prayer/PrayerContentsLoad?seq=29`) | 일치 |

- 지시문(성호경 '십자 성호를 그으며', 영광송 '밑줄 부분에서 고개를 숙이며', 사도 신경 '밑줄 부분에서 모두 깊은 절을 한다.')은 앱 본문에서 뺐다(`prayer_data.dart` 머리말). 공식 본문의 밑줄(영광송 첫 줄, 사도 신경 '성령으로 인하여 동정 마리아께 잉태되어 나시고')도 앱에는 표시하지 않는다.
- `salve_regina`·`salve_regina_collect` 는 데이터에만 있고 지금 기도 순서(`rosary_sequence.dart`)에서는 쓰지 않는다(마침은 성호경).
- 구원을 비는 기도는 공식 본문에 '아멘'이 없다(앱도 없음).

## 3. 신비 20단 (`Mysteries`, 선창 큐 `mystery_*`)

| 항목 | 앱 문구 | 공식 문구 | 출처 URL | 판정 |
|---|---|---|---|---|
| 환희의 신비 1단 | 마리아께서 예수님을 잉태하심을 묵상합시다. | 같음 | https://cbck.or.kr/Catholic/Prayer (본문 `/Catholic/Prayer/PrayerContentsLoad?seq=15`) | 일치 |
| 환희의 신비 2단 | 마리아께서 엘리사벳을 찾아보심을 묵상합시다. | 같음 | https://cbck.or.kr/Catholic/Prayer (본문 `/Catholic/Prayer/PrayerContentsLoad?seq=15`) | 일치 |
| 환희의 신비 3단 | 마리아께서 예수님을 낳으심을 묵상합시다. | 같음 | https://cbck.or.kr/Catholic/Prayer (본문 `/Catholic/Prayer/PrayerContentsLoad?seq=15`) | 일치 |
| 환희의 신비 4단 | 마리아께서 예수님을 성전에 바치심을 묵상합시다. | 같음 | https://cbck.or.kr/Catholic/Prayer (본문 `/Catholic/Prayer/PrayerContentsLoad?seq=15`) | 일치 |
| 환희의 신비 5단 | 마리아께서 잃으셨던 예수님을 성전에서 찾으심을 묵상합시다. | 같음 | https://cbck.or.kr/Catholic/Prayer (본문 `/Catholic/Prayer/PrayerContentsLoad?seq=15`) | 일치 |
| 빛의 신비 1단 | 예수님께서 세례 받으심을 묵상합시다. | 같음 | https://cbck.or.kr/Catholic/Prayer (본문 `/Catholic/Prayer/PrayerContentsLoad?seq=15`) | 일치 |
| 빛의 신비 2단 | 예수님께서 카나에서 첫 기적을 행하심을 묵상합시다. | 같음 | https://cbck.or.kr/Catholic/Prayer (본문 `/Catholic/Prayer/PrayerContentsLoad?seq=15`) | 일치 |
| 빛의 신비 3단 | 예수님께서 하느님 나라를 선포하심을 묵상합시다. | 같음 | https://cbck.or.kr/Catholic/Prayer (본문 `/Catholic/Prayer/PrayerContentsLoad?seq=15`) | 일치 |
| 빛의 신비 4단 | 예수님께서 거룩하게 변모하심을 묵상합시다. | 같음 | https://cbck.or.kr/Catholic/Prayer (본문 `/Catholic/Prayer/PrayerContentsLoad?seq=15`) | 일치 |
| 빛의 신비 5단 | 예수님께서 성체성사를 세우심을 묵상합시다. | 같음 | https://cbck.or.kr/Catholic/Prayer (본문 `/Catholic/Prayer/PrayerContentsLoad?seq=15`) | 일치 |
| 고통의 신비 1단 | 예수님께서 우리를 위하여 피땀 흘리심을 묵상합시다. | 같음 | https://cbck.or.kr/Catholic/Prayer (본문 `/Catholic/Prayer/PrayerContentsLoad?seq=15`) | 일치 |
| 고통의 신비 2단 | 예수님께서 우리를 위하여 매 맞으심을 묵상합시다. | 같음 | https://cbck.or.kr/Catholic/Prayer (본문 `/Catholic/Prayer/PrayerContentsLoad?seq=15`) | 일치 |
| 고통의 신비 3단 | 예수님께서 우리를 위하여 가시관 쓰심을 묵상합시다. | 같음 | https://cbck.or.kr/Catholic/Prayer (본문 `/Catholic/Prayer/PrayerContentsLoad?seq=15`) | 일치 |
| 고통의 신비 4단 | 예수님께서 우리를 위하여 십자가 지심을 묵상합시다. | 같음 | https://cbck.or.kr/Catholic/Prayer (본문 `/Catholic/Prayer/PrayerContentsLoad?seq=15`) | 일치 |
| 고통의 신비 5단 | 예수님께서 우리를 위하여 십자가에 못 박혀 돌아가심을 묵상합시다. | 같음 | https://cbck.or.kr/Catholic/Prayer (본문 `/Catholic/Prayer/PrayerContentsLoad?seq=15`) | 일치 |
| 영광의 신비 1단 | 예수님께서 부활하심을 묵상합시다. | 같음 | https://cbck.or.kr/Catholic/Prayer (본문 `/Catholic/Prayer/PrayerContentsLoad?seq=15`) | 일치 |
| 영광의 신비 2단 | 예수님께서 승천하심을 묵상합시다. | 같음 | https://cbck.or.kr/Catholic/Prayer (본문 `/Catholic/Prayer/PrayerContentsLoad?seq=15`) | 일치 |
| 영광의 신비 3단 | 예수님께서 성령을 보내심을 묵상합시다. | 같음 | https://cbck.or.kr/Catholic/Prayer (본문 `/Catholic/Prayer/PrayerContentsLoad?seq=15`) | 일치 |
| 영광의 신비 4단 | 예수님께서 마리아를 하늘에 불러올리심을 묵상합시다. | 같음 | https://cbck.or.kr/Catholic/Prayer (본문 `/Catholic/Prayer/PrayerContentsLoad?seq=15`) | 일치 |
| 영광의 신비 5단 | 예수님께서 마리아께 천상 모후의 관을 씌우심을 묵상합시다. | 같음 | https://cbck.or.kr/Catholic/Prayer (본문 `/Catholic/Prayer/PrayerContentsLoad?seq=15`) | 일치 |

- 신비 이름 '환희의 신비', '빛의 신비', '고통의 신비', '영광의 신비'도 공식 표기와 같다. 공식 본문은 '1단', '2단'으로만 적고, 앱 제목 '환희의 신비 1단'은 신비 이름과 단을 이어 붙인 것이다(낭독 대본은 '일 단'으로 읽는다).
- 화면에서 '…을 묵상합시다.'를 떼어 짧게 보여 주는 곳(`home_screen.dart`, `prayer_screen.dart`)은 같은 문장의 앞부분이다.
- 요일 배분(월·토 환희, 목 빛, 화·금 고통, 수·일 영광)은 굿뉴스 묵주 기도 페이지의 안내(요한 바오로 2세 교서 『동정 마리아의 묵주기도』)와 같다. 주교회의 전자 본문에는 요일이 적혀 있지 않다.

## 4. 선창/후창 분할 (`lib/domain/prayer_splits.dart`)

공식 본문에는 묵주기도 기도문을 어디서 나누어 주고받는지 표시가 없다(기호 없이 한 덩어리). 분할은 본문을 바꾸지 않으며(`앞단 + 줄바꿈 + 뒷단 == 전문`) 사용자가 확정한 것을 그대로 둔다.

| 기도 | 뒷단이 시작하는 줄 | 근거 | 판정 |
|---|---|---|---|
| 사도 신경 | 10번째 줄 「성령을 믿으며」 | 소유자 확정(앞단은 문장이 끝나는 「…오시리라 믿나이다.」까지). 공식 본문에 분할 표시 없음 | 일치(본문) · 분할은 사용자 확정 유지 |
| 주님의 기도 | 6번째 줄 「오늘 저희에게 일용할 양식을 주시고」 | 본당 공동 기도 관행(계응). 공식 본문에 분할 표시 없음 | 일치(본문) · 분할은 사용자 확정 유지 |
| 성모송 | 4번째 줄 「천주의 성모 마리아님,」 | 본당 공동 기도 관행. 굿뉴스 본문은 이 자리에 빈 줄을 둔다 | 일치(본문) · 분할은 사용자 확정 유지 |
| 영광송 | 2번째 줄 「처음과 같이」 | 본당 공동 기도 관행. 공식 본문에 분할 표시 없음 | 일치(본문) · 분할은 사용자 확정 유지 |
| 구원을 비는 기도 | 3번째 줄 「연옥 영혼을 돌보시며」 | 본당 공동 기도 관행. 공식 본문에 분할 표시 없음 | 일치(본문) · 분할은 사용자 확정 유지 |

## 5. 짧은 기도문 (`lib/app/prayer_text_short.dart`)

설정 「외운 기도 짧게 보기」의 첫머리. 공식 문구의 앞부분에 `…`만 붙인 것이다(공식 기도서에 이런 줄임 형태가 있는 것은 아니다).

| 항목 | 앱 문구 | 공식 문구 | 출처 URL | 판정 |
|---|---|---|---|---|
| 성모송 앞단 | 은총이 가득하신 마리아님, … | 「은총이 가득하신 마리아님, 기뻐하소서!」의 앞부분 | https://cbck.or.kr/Catholic/Prayer | 일치(첫머리) |
| 성모송 뒷단 | 천주의 성모 마리아님, … | 「천주의 성모 마리아님,」의 앞부분 | https://cbck.or.kr/Catholic/Prayer | 일치(첫머리) |
| 주님의 기도 앞단 | 하늘에 계신 우리 아버지, … | 「하늘에 계신 우리 아버지,」의 앞부분 | https://cbck.or.kr/Catholic/Prayer | 일치(첫머리) |
| 주님의 기도 뒷단 | 오늘 저희에게 일용할 양식을 주시고 … | 「오늘 저희에게 일용할 양식을 주시고」의 앞부분 | https://cbck.or.kr/Catholic/Prayer | 일치(첫머리) |
| 구원을 비는 기도 앞단 | 예수님, 저희 죄를 용서하시며 … | 「예수님, 저희 죄를 용서하시며」의 앞부분 | https://cbck.or.kr/Catholic/Prayer | 일치(첫머리) |
| 구원을 비는 기도 뒷단 | 연옥 영혼을 돌보시며 … | 「연옥 영혼을 돌보시며」의 앞부분 | https://cbck.or.kr/Catholic/Prayer | 일치(첫머리) |

## 6. 음성 대본과 클립

| 대상 | 개수 | 공식 문구와 비교 | 판정 |
|---|---|---|---|
| `tools/leader_voice/cues.json` 선창 큐 | 26 | 공식 본문의 앞단(또는 신비 제목+묵상문)과 글자·구두점·줄 나눔까지 같음 | 일치 26 |
| `tools/leader_voice/responder_cues.json` 후창 큐 | 5 | 공식 본문의 뒷단과 글자·구두점·줄 나눔까지 같음 | 일치 5 |
| `docs/church/PRAYER_LINES.txt` 끊어 읽기 대본 | 31 | 낭독용이라 문장부호가 없고 숫자를 한글로 적는다(1단 → 일 단). 그 밖의 글자·띄어쓰기는 31개 모두 같음. 줄 나눔은 29개가 공식 본문과 같고 2개가 다름(아래) | 일치 29 · 표시(줄바꿈) 차이 2 |
| `assets/leader_voice/{sister,priest}/*.mp3` 클립(합성 대본은 `tools/leader_voice/manifest.json` 의 `text`) | 62 | 합성에 쓴 대본이 공식 문구와 글자·띄어쓰기까지 같음(쉼표는 합성용 쉼 표시, 숫자는 한글 읽기) | 일치 62 |

### 표시(줄바꿈) 차이 — 사용자가 확정한 띄어 읽기

| 큐 | 대본의 줄 나눔 | 공식 본문의 줄 나눔 |
|---|---|---|
| `resp_apostles_creed` | 성령을 믿으며 / 거룩하고 보편된 교회와 / 모든 성인의 통공을 믿으며 / 죄의 용서와 육신의 부활을 믿으며 / 영원한 삶을 믿나이다 / 아멘 | 성령을 믿으며 / 거룩하고 보편된 교회와 모든 성인의 통공을 믿으며 / 죄의 용서와 육신의 부활을 믿으며 / 영원한 삶을 믿나이다. / 아멘. |
| `resp_glory_be` | 처음과 같이 이제와 항상 영원히 / 아멘 | 처음과 같이 / 이제와 항상 영원히. / 아멘. |

### 클립 영향 목록

**없음.** 이번 대조로 묵주기도 기도문·신비 문구·선창/후창 분할은 한 글자도 바뀌지 않았으므로 다시 만들 클립이 없다. 62개 클립(자매·사제 각 31개: 선창 26 + 후창 5) 가운데 공식 문구와 어긋나는 것은 없다. 위 2개 큐의 줄 나눔 차이는 쉼 위치만 다른 것이고 글자는 같다.

십자가의 길 기도문에는 음성 클립이 없다(이번에 새로 넣은 기도문은 글자로만 보여 준다).

## 7. 십자가의 길

### 7.1 처 명칭 (`data/stations_of_cross.json` 의 `title`)

공식 본문은 「제N처 …을 묵상합시다.」 꼴이다. 명칭은 그 문장에서 「을 묵상합시다.」를 뗀 부분이며, 생성기(`tools/stations/build_stations.py`)가 두 파일을 대조한다.

| 처 | 고치기 전 앱 문구 | 공식 문구 | 출처 URL | 판정 |
|---|---|---|---|---|
| 1 | 예수님께서 사형 선고를 받으심 | 예수님께서 사형 선고 받으심 | https://cbck.or.kr/Catholic/Prayer (본문 `/Catholic/Prayer/PrayerContentsLoad?seq=37`) | 수정 |
| 2 | 예수님께서 십자가를 지심 | 예수님께서 십자가 지심 | https://cbck.or.kr/Catholic/Prayer (본문 `/Catholic/Prayer/PrayerContentsLoad?seq=37`) | 수정 |
| 3 | 예수님께서 처음 넘어지심 | 예수님께서 기력이 떨어져 넘어지심 | https://cbck.or.kr/Catholic/Prayer (본문 `/Catholic/Prayer/PrayerContentsLoad?seq=37`) | 수정 |
| 4 | 예수님께서 성모님을 만나심 | 예수님께서 성모님을 만나심 | https://cbck.or.kr/Catholic/Prayer (본문 `/Catholic/Prayer/PrayerContentsLoad?seq=37`) | 일치 |
| 5 | 키레네 사람 시몬이 예수님을 도와 십자가를 짐 | 시몬이 예수님을 도와 십자가 짐 | https://cbck.or.kr/Catholic/Prayer (본문 `/Catholic/Prayer/PrayerContentsLoad?seq=37`) | 수정 |
| 6 | 베로니카가 수건으로 예수님의 얼굴을 닦아 드림 | 베로니카, 수건으로 예수님의 얼굴을 닦아 드림 | https://cbck.or.kr/Catholic/Prayer (본문 `/Catholic/Prayer/PrayerContentsLoad?seq=37`) | 수정 |
| 7 | 예수님께서 두 번째 넘어지심 | 기력이 다하신 예수님께서 두 번째 넘어지심 | https://cbck.or.kr/Catholic/Prayer (본문 `/Catholic/Prayer/PrayerContentsLoad?seq=37`) | 수정 |
| 8 | 예수님께서 예루살렘 부인들을 위로하심 | 예수님께서 예루살렘 부인들을 위로하심 | https://cbck.or.kr/Catholic/Prayer (본문 `/Catholic/Prayer/PrayerContentsLoad?seq=37`) | 일치 |
| 9 | 예수님께서 세 번째 넘어지심 | 예수님께서 세 번째 넘어지심 | https://cbck.or.kr/Catholic/Prayer (본문 `/Catholic/Prayer/PrayerContentsLoad?seq=37`) | 일치 |
| 10 | 예수님께서 옷 벗김을 당하심 | 예수님께서 옷 벗김 당하심 | https://cbck.or.kr/Catholic/Prayer (본문 `/Catholic/Prayer/PrayerContentsLoad?seq=37`) | 수정 |
| 11 | 예수님께서 십자가에 못 박히심 | 예수님께서 십자가에 못 박히심 | https://cbck.or.kr/Catholic/Prayer (본문 `/Catholic/Prayer/PrayerContentsLoad?seq=37`) | 일치 |
| 12 | 예수님께서 십자가 위에서 돌아가심 | 예수님께서 십자가 위에서 돌아가심 | https://cbck.or.kr/Catholic/Prayer (본문 `/Catholic/Prayer/PrayerContentsLoad?seq=37`) | 일치 |
| 13 | 예수님의 시신을 십자가에서 내림 | 제자들이 예수님 시신을 십자가에서 내림 | https://cbck.or.kr/Catholic/Prayer (본문 `/Catholic/Prayer/PrayerContentsLoad?seq=37`) | 수정 |
| 14 | 예수님께서 무덤에 묻히심 | 예수님께서 무덤에 묻히심 | https://cbck.or.kr/Catholic/Prayer (본문 `/Catholic/Prayer/PrayerContentsLoad?seq=37`) | 일치 |

- 칩·목록에 쓰는 짧은 이름(`short`: '사형 선고', '처음 넘어지심' 등)은 앱이 줄여 쓴 이름이며 공식 표기가 아니다(그대로 둠).
- 옛 명칭이 남은 문서: `docs/ux/ART_REFERENCES.md`, `docs/church/licenses/art_stations.md`(그림 출처 표의 설명 칸). 그림 출처 기록이라 고치지 않았다.

### 7.2 기도문 (`data/stations_prayers.json` → `lib/domain/stations_prayers_data.dart`)

이번에 새로 넣었다. 공식 전자 본문을 프로그램으로 옮겼고(줄·기호·지시문 그대로) 옮긴 뒤 다시 대조했다.

| 항목 | 앱 문구 | 공식 문구 | 출처 URL | 판정 |
|---|---|---|---|---|
| 시작 기도 (┼) | 주 예수님, / 저희를 위하여 온갖 수난을 겪으신 / 주님의 사랑을 묵상하며 / 성모님과 함께 / 십자가의 길을 걷고자 하나이다. / 저희에게 죄를 뉘우치고 / 주님의 수난을 함께 나눌 마음을 주시어 / 언제나 주님을 사랑하게 하시며 / 성직자들을 거룩하게 하시고 / 모든 죄인이 회개하도록 은혜를 내려 주소서. | 같음(10줄). 앞 지시문 「먼저 깊이 뉘우치고 아래의 기도를 바친다.」 | https://cbck.or.kr/Catholic/Prayer (본문 `/Catholic/Prayer/PrayerContentsLoad?seq=37`) | 일치(신규 반영) |
| 제N처로 가며 (◎) | 어머니께 청하오니 / 제 맘속에 주님 상처 깊이 새겨 주소서. | 같음. 공식 본문은 2~14처에서 「어머니께 청하오니…….」로 줄여 적는다(앱은 두 줄을 매번 다 보여 줌) | https://cbck.or.kr/Catholic/Prayer (본문 `/Catholic/Prayer/PrayerContentsLoad?seq=37`) | 일치(신규 반영) |
| 각 처 계응 (┼ / ◎) | ┼ 주님께서는 십자가로 온 세상을 구원하셨나이다. / ◎ 예수 그리스도님, / (깊은 절을 하며) / 경배하며 찬송하나이다. | 같음(14처 모두 같은 문구) | https://cbck.or.kr/Catholic/Prayer (본문 `/Catholic/Prayer/PrayerContentsLoad?seq=37`) | 일치(신규 반영) |
| 제1처 기도 (○) | 구세주 예수님, / 저희를 위하여 / 아무런 죄도 없이 극심한 모욕과 사형 선고를 받으셨으니 / 죄인들이 마땅히 받아야 할 영원한 벌에서 / 저희를 구원하소서. | 같음(5줄) | https://cbck.or.kr/Catholic/Prayer (본문 `/Catholic/Prayer/PrayerContentsLoad?seq=37`) | 일치(신규 반영) |
| 제2처 기도 (○) | 구세주 예수님, / 저희를 사랑하신 까닭에 / 이 무거운 십자가를 기꺼이 지고 가셨으니 / 저희도 주님을 사랑하며 / 주님께서 허락하시는 모든 십자가를 / 기꺼이 지게 하소서. | 같음(6줄) | https://cbck.or.kr/Catholic/Prayer (본문 `/Catholic/Prayer/PrayerContentsLoad?seq=37`) | 일치(신규 반영) |
| 제3처 기도 (○) | 구세주 예수님, / 무거운 십자가에 눌려 넘어지시는 / 고통과 모욕을 당하셨으니 / 저희가 언제나 주님을 변함없이 섬기며 / 죄에 떨어지는 일이 없게 하소서. | 같음(5줄) | https://cbck.or.kr/Catholic/Prayer (본문 `/Catholic/Prayer/PrayerContentsLoad?seq=37`) | 일치(신규 반영) |
| 제4처 기도 (○) | 구세주 예수님과 성모 마리아님, / 괴로운 십자가의 길에서 서로 만나시어 / 사무치는 아픔을 겪으셨으니 / 저희 마음에 사랑을 북돋아 주시어 / 주님과 성모님을 사랑하는 데에 / 장애되는 모든 것을 물리치게 하소서. | 같음(6줄) | https://cbck.or.kr/Catholic/Prayer (본문 `/Catholic/Prayer/PrayerContentsLoad?seq=37`) | 일치(신규 반영) |
| 제5처 기도 (○) | 구세주 예수님, / 시몬이 주님을 도와 십자가를 졌으니 / 저희도 주님께서 맡겨 주시는 십자가를 / 날마다 기꺼이 지고 가게 하소서. | 같음(4줄) | https://cbck.or.kr/Catholic/Prayer (본문 `/Catholic/Prayer/PrayerContentsLoad?seq=37`) | 일치(신규 반영) |
| 제6처 기도 (○) | 구세주 예수님, / 나쁜 무리가 주님의 얼굴에 침을 뱉고 / 주님을 업신여기며 모욕하였듯이 / 저희도 죄를 지을 때마다 / 주님의 얼굴을 더럽히는 것이오니 / 통회의 눈물로 / 주님의 얼굴을 씻어 드리게 하소서. | 같음(7줄) | https://cbck.or.kr/Catholic/Prayer (본문 `/Catholic/Prayer/PrayerContentsLoad?seq=37`) | 일치(신규 반영) |
| 제7처 기도 (○) | 구세주 예수님, / 저희를 위하여 두 번째 넘어지시는 고욕을 당하셨으니 / 주님을 한결같이 섬기지 못하고 / 다시 죄에 떨어져 / 주님의 사랑을 저버리는 저희에게 자비를 베푸시어 / 다시는 세속과 육신의 간교한 유혹에 빠지지 않게 하소서. | 같음(6줄) | https://cbck.or.kr/Catholic/Prayer (본문 `/Catholic/Prayer/PrayerContentsLoad?seq=37`) | 일치(신규 반영) |
| 제8처 기도 (○) | 구세주 예수님, / 저희 죄로 상처를 받으시고 / 온몸이 헤어지셨으니 / 저희에게 풍부한 은총을 내리시어 / 지난날에 지은 모든 죄를 뉘우치며 / 주님의 품을 찾아들게 하소서. | 같음(6줄) | https://cbck.or.kr/Catholic/Prayer (본문 `/Catholic/Prayer/PrayerContentsLoad?seq=37`) | 일치(신규 반영) |
| 제9처 기도 (○) | 구세주 예수님, / 무거운 저희 죄에 눌리시어 / 세 번이나 무참히 넘어지셨으니 / 그 수난의 공로를 저희에게 나누어 주시어 / 저희가 이미 지은 죄에서 다시 일어나게 하소서. | 같음(5줄) | https://cbck.or.kr/Catholic/Prayer (본문 `/Catholic/Prayer/PrayerContentsLoad?seq=37`) | 일치(신규 반영) |
| 제10처 기도 (○) | 구세주 예수님, / 병사들이 난폭하게 주님의 옷을 벗길 때에 / 살이 묻어나는 극도의 고통을 당하셨으며 / 죄수로 군중 앞에 서시는 모욕을 당하셨으니 / 저희가 모든 죄를 벗어 버리게 하소서. | 같음(5줄) | https://cbck.or.kr/Catholic/Prayer (본문 `/Catholic/Prayer/PrayerContentsLoad?seq=37`) | 일치(신규 반영) |
| 제11처 기도 (○) | 구세주 예수님, / 알몸으로 십자가에 못 박혀 달리셨으니 / 저희도 주님과 같이 / 몸과 마음을 희생 제물로 봉헌하게 하소서. | 같음(4줄) | https://cbck.or.kr/Catholic/Prayer (본문 `/Catholic/Prayer/PrayerContentsLoad?seq=37`) | 일치(신규 반영) |
| 제12처 기도 (○) | 구세주 예수님, / 저희를 위하여 십자가 위에서 숨을 거두셨으니 / 저희도 십자가에 못 박혀 / 다시는 저희 자신을 위하여 살지 않고 / 주님을 위하여 살게 하소서. / 구세주 예수님, / 혹시라도 영원히 주님을 떠날 불행이 저희에게 닥칠 양이면 / 차라리 지금 주님과 함께 죽는 행복을 내려 주소서. | 같음(8줄) | https://cbck.or.kr/Catholic/Prayer (본문 `/Catholic/Prayer/PrayerContentsLoad?seq=37`) | 일치(신규 반영) |
| 제13처 기도 (○) | 구세주 예수님, / 주님의 시신을 십자가에서 내려 품에 안으신 / 성모님의 전구를 들으시어 / 저희도 성모님 품 안에서 / 효성스러운 자녀로 살다가 / 마침내 그 품 안에서 죽게 하소서. | 같음(6줄) | https://cbck.or.kr/Catholic/Prayer (본문 `/Catholic/Prayer/PrayerContentsLoad?seq=37`) | 일치(신규 반영) |
| 제14처 기도 (○) | 돌무덤에 묻히신 구세주 예수님, / 저희가 주님의 죽음을 생각하며 / 언제나 깨끗한 마음으로 정성을 다하여 / 사랑의 성체를 받아 모시게 하소서. | 같음(4줄) | https://cbck.or.kr/Catholic/Prayer (본문 `/Catholic/Prayer/PrayerContentsLoad?seq=37`) | 일치(신규 반영) |
| 각 처 뒤 지시문 | 잠깐 묵상한다. / 주님의 기도, 성모송, 영광송. | 같음 | https://cbck.or.kr/Catholic/Prayer (본문 `/Catholic/Prayer/PrayerContentsLoad?seq=37`) | 일치(신규 반영) |
| (삭제) 앱이 지어 쓴 각 처 환호 | 우리는 당신을 경배하며 찬미하나이다. 거룩한 십자가로 세상을 구하셨나이다. | ┼ 주님께서는 십자가로 온 세상을 구원하셨나이다. / ◎ 예수 그리스도님, 경배하며 찬송하나이다. | https://cbck.or.kr/Catholic/Prayer (본문 `/Catholic/Prayer/PrayerContentsLoad?seq=37`) | 수정(삭제하고 공식 계응으로 대체) |
| (삭제) 앱이 지어 쓴 시작 문구 | 주님, 사랑으로 걸으신 십자가의 길을 저희도 따라 걷습니다. 한 처 한 처에서 주님의 고통을 묵상하며 저희 마음을 새롭게 하소서. | ┼ 주 예수님, … 모든 죄인이 회개하도록 은혜를 내려 주소서.(위 시작 기도) | https://cbck.or.kr/Catholic/Prayer (본문 `/Catholic/Prayer/PrayerContentsLoad?seq=37`) | 수정(삭제하고 공식 시작 기도로 대체) |
| 마침 기도(14처 뒤) | 주님, 십자가의 길을 함께 걸었습니다. 주님께서 보여 주신 사랑을 기억하며 오늘 만나는 이웃에게 그 사랑을 나누게 하소서. 아멘. (앱이 쓴 글) | **없음.** 주교회의 전자 본문과 굿뉴스 게시본 모두 제14처 기도(와 주님의 기도, 성모송, 영광송)로 끝난다 | https://cbck.or.kr/Catholic/Prayer (본문 `/Catholic/Prayer/PrayerContentsLoad?seq=37`) | 사용자 결정 필요(앱 글을 「공식 기도문 아님」으로 밝히고 남김) |
| 처별 묵상·청원 14쌍(접힌 「묵상」) | 앱이 새로 쓴 글(`data/stations_of_cross.json` 의 `meditation`, `petition`) | 해당 없음(공식 기도문이 아님) | - | 미확인(사제·교구 검수 전 초안, `docs/ux/STATIONS_OF_CROSS.md`) |

### 7.3 기호의 뜻

『가톨릭 기도서』(개정판) 「일러두기」 4항(https://cbck.or.kr/Catholic/Prayer 의 「일러두기」 탭) 원문:

> 4. 기도하기에 편리하도록 여러 기도문과 응송 등을 그 성격에 따라 아래와 같이 표기하였다.
> ╋ 사제가 하는 부분 / ┼ 집전자 또는 주송자 / ✠ 사제가 십자 표시를 할 때 / † 기도문 선택의 연결 부분 / ○ 계 또는 선창자 / ● 응 / ◎ 합송
> 5. 설명이나 지시문 등은 붉은 글씨로 표기하였다.

| 기호 | 공식 뜻 | 십자가의 길에서 쓰이는 곳 | 앱 표시 |
|---|---|---|---|
| ┼ (U+253C) | 집전자 또는 주송자 | 시작 기도, 각 처 「주님께서는 십자가로 온 세상을 구원하셨나이다.」 | 줄 앞 기호 `┼`, 화면 낭독 「주송자」 |
| ◎ | 합송 | 「어머니께 청하오니 …」, 「예수 그리스도님, 경배하며 찬송하나이다.」 | 줄 앞 기호 `◎`, 화면 낭독 「다 함께」 |
| ○ | 계 또는 선창자 | 각 처의 기도(「구세주 예수님, …」) | 줄 앞 기호 `○`, 화면 낭독 「선창자」 |
| ● | 응 | 십자가의 길에는 나오지 않음(성모 찬송 등에 쓰임) | 데이터에만 정의 |

- 사용자가 말한 「+」는 기도서의 `┼`(가는 십자)다. 십자가의 길 본문에는 사제 전용 기호 `╋`(굵은 십자)가 쓰이지 않는다. 굿뉴스 게시본은 같은 자리에 `╋`를 쓴다(5절).
- 범례는 기도문 아래에 공식 뜻 그대로 보여 준다(「┼ 집전자 또는 주송자 · ◎ 합송 · ○ 계 또는 선창자」).
- 앱 글꼴 Pretendard 에는 `┼`, `◎` 글리프가 없어 기기 기본 한글 글꼴로 대체되어 그려진다(`○`, `●`는 있음). 실기기에서 모양을 한 번 확인할 것.

## 8. 출처마다 다르게 적은 곳

주교회의 전자 본문을 기준으로 삼았고, 아래는 가톨릭 굿뉴스 게시본이 다르게 적은 곳이다(글자가 아니라 띄어쓰기·구두점·기호 차이). 앱은 모두 주교회의 본문을 따른다.

| 기도 | 주교회의 | 굿뉴스 | 굿뉴스 위치 |
|---|---|---|---|
| 성모송 | 빌어 주소서. | 빌어주소서. | pgubun=3 ingId=3, 「묵주기도 바치는 방법」(8/70) |
| 구원을 비는 기도 | 용서하시며 / 구하시고 (쉼표 없음) | 용서하시며, / 구하시고, | 「묵주기도 바치는 방법」(8/70). 주요 기도(3/127)는 주교회의와 같음 |
| 성모 찬송 | 부르짖나이다, / 슬픔의 골짜기에서. · 너그러우시고 자애로우시며 · 빌어 주시어 · 묵주 기도를 | 부르짖나이다. 슬픔의 골짜기에서, · 너그러우시고, 자애로우시며 · 빌어주시어 · 묵주기도를 | 「묵주기도 바치는 방법」(8/70). 묵주 기도 성월(4/25)은 「너그러우시고, 자애로우시며」만 다르고, 묵주 기도(8/67)는 주교회의와 같음 |
| 신비 | 세례 받으심 · 매 맞으심 | 세례받으심 · 매맞으심 | 「묵주기도 바치는 방법」(8/70). 묵주 기도(8/67)는 주교회의와 같음 |
| 사도 신경(제목) | 사도 신경 | 사도 신경(3/5) / 사도신경(8/70) | - |
| 십자가의 길 | 사순 시기 · 내려 주소서 · 새겨 주소서 · 사형 선고를 · 장애되는 · 맡겨 주시는 · 닦아 드림 · 씻어 드리게 · 찾아들게 · 벗어 버리게 · 못 박히심 · 못 박혀 · 희생 제물 · 닥칠 양이면 · 품 안에서 | 사순시기 · 내려주소서 · 새겨주소서 · 사형선고를 · 장애 되는 · 맡겨주시는 · 닦아드림 · 씻어드리게 · 찾아 들게 · 벗어버리게 · 못박히심 · 못박혀 · 희생제물 · 닥칠양이면 · 품안에서 | pgubun=9 ingId=32 (개정 전 띄어쓰기로 보임) |
| 십자가의 길(기호·지시문) | ┼ · 각 처 기도 앞 ○ · 「깊은 절을 하며」 14처 모두 · 시작 기도 전체가 ┼ | ╋ · 각 처 기도 앞 기호 없음 · 「깊은 절을 하며」 1처에만 · 시작 기도가 「╋ 주 예수님,◎ 저희를 위하여 …」 | pgubun=9 ingId=32 |

## 9. 사용자 결정 필요

요약의 「사용자 결정 필요 3」은 문구에 관한 1~3번이다. 4·5번은 문구 대조가 아닌 운영 결정이다.

1. **십자가의 길 마침 기도**: 공식 기도서에는 14처 뒤 마침 기도가 없다. 지금은 앱이 쓴 마침 글을 「공식 기도문이 아님」이라고 밝혀 남겼다. (가) 그대로 둔다 (나) 마침 화면에서 앱 글을 빼고 「마치기」만 둔다 — 중 선택.
2. **제목 띄어쓰기 「사도신경」**: 공식 제목은 「사도 신경」이다. 앱은 제목·안내 문구·시험·음성 대본 제목에 「사도신경」을 쓴다(기도문 본문에는 영향 없음, 클립 영향 없음). 공식 표기로 바꿀지 결정 필요.
3. **「묵주기도」 표기**: 주교회의 기도서 제목은 「묵주 기도」(띄어 씀)이고 앱 전체(화면 문구·약관·성당 화면 등 40여 곳)는 「묵주기도」다. 굿뉴스와 교황 교서 한국어판 제목(『동정 마리아의 묵주기도』)은 붙여 쓴다. 바꿀지 결정 필요.
4. **십자가의 길 기도문의 게재 허락**: 『가톨릭 기도서』 내용의 전재·복제는 주교회의 승인이 필요하다(https://cbck.or.kr/Copyright; 한국천주교중앙협의회 총무부 02-460-7552, mano@cbck.or.kr, 「저작권 사용 승인 신청서」). 묵주기도 기도문도 같은 기도서의 내용이다. 출시 전 승인 신청 여부·시점 결정 필요(`docs/BACKLOG.md` 「출시 전 확인」).
5. **보조 묵상(접힌 「묵상」)을 계속 둘지**: 공식 기도문이 들어갔으므로 앱이 쓴 묵상·청원 14쌍은 접어 두었다. 사제 검수 전 초안이므로 빼는 것도 선택지다.
