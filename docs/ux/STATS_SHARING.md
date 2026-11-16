# 기도 통계 그래프와 이미지 공유

독서공방(reading-journal) 통계·공유 로직을 Dart 위젯으로 옮긴 것. 코드는 `lib/stats/`.

## 구성
- 계산(순수): `logical_day.dart`(논리 날짜), `prayer_goal.dart`(목표·설정 묶음), `stats_logic.dart`(연속·기간·도넛·돌아보기)
- 화면: `stats_screen.dart` → `stats_sections.dart`(발자취·기간·도넛·돌아보기), `stats_painters.dart`
- 공유: `share/share_card.dart`(카드, 배경 8·배치 3·정사각/스토리), `share/share_sheet.dart`, `share/image_share.dart`(채널)
- 안드로이드: `MainActivity.kt` 의 `rosarium/share` 채널, `res/xml/file_paths.xml`, 매니페스트 FileProvider

## 규칙
- 날짜는 항상 논리 날짜(설정의 '하루의 시작 시각', 기본 새벽 4시). `dayKey()` 를 거친다.
- 말투: '끝까지 바친', '이어 온 날', '목표만큼 바친 날'. 순위·점수·배지·'완주'·'최장'·'실패' 없음.
- 이미지 카드는 번들 Pretendard, 글자 배율 1 고정, 고정 팔레트(기기·테마와 무관하게 같은 그림).
- 글자 넘침: `FitText`(크기 줄임 → … 말줄임, 낱말 중간에서 꺾지 않음 `keepAll`).

## 인스타그램 스토리
`com.instagram.share.ADD_TO_STORY` 는 Facebook 앱 ID 가 있어야 동작한다(Meta 정책, 2023-01~;
독서공방도 같은 이유로 쓰지 않는다). 매니페스트 `kr.rosary.rosaryapp.FACEBOOK_APP_ID` 가 비어 있으면
인스타그램을 맨 앞에 둔 일반 공유 시트로 열고, 값을 채우면 스토리 인텐트를 먼저 시도한다.

## 백업
`AppSettings.statsPrefs` / `restoreStatsPrefs(json)` 가 하루 시작 시각·목표·안내 여부를 단순 JSON 으로 주고받는다
(복원 시 값 위생 처리). 기도 기록 `PrayerRecord.kind`(묵주기도/십자가의 길/짧은 기도)는 새 필드이며
없는 옛 기록은 묵주기도로 읽는다. 지금은 묵주기도만 기록되므로 '종류' 도넛은 둘 이상 종류가 있을 때만 보인다.
