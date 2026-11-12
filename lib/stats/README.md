# 기도 통계(`lib/stats`) 연결 가이드

이 폴더는 기존 파일을 수정하지 않는 독립 모듈이다. 아래 스니펫대로 4곳에 연결한다.

| 파일 | 역할 |
| --- | --- |
| `prayer_record.dart` | `PrayerRecord`(id, at, set, decades, hailMarys, completed, seconds, source) + JSON |
| `prayer_stats_calc.dart` | 순수 집계 `PrayerStatsCalc` (월/년/전체, 연속, 월별 12칸, 신비 분포 …) |
| `prayer_stats_store.dart` | `PrayerStatsStore` (ChangeNotifier, `prayer_stats_v1`, 최신 5000개). calc/record를 re-export |
| `prayer_session_tracker.dart` | `PrayerSessionTracker` — 세션에 붙여 기록 생성 |
| `stats_widgets.dart` | `StatsSummaryCard`, `MonthBarChart`, `MonthCalendar`, `MysteryDistributionBar` |
| `stats_screen.dart` | `StatsScreen` |

저장소를 쓰는 쪽은 `import '../stats/prayer_stats_store.dart';` 하나면 `PrayerRecord`, `PrayerStatsCalc`까지 쓸 수 있다.

## 기록 id (동기화용)

`PrayerRecord.id`는 UUID v4 형식 문자열이다(`Random.secure`, 생성자에서 생략하면 자동 생성).
JSON의 `id`로 저장되며 저장/불러오기를 거쳐도 바뀌지 않는다. `id`가 없는 구버전 JSON은
불러올 때 새 id를 받고 즉시 다시 저장된다. `PrayerSessionTracker`는 기록마다 새 id를 만든다.
로그인/동기화는 `record.id`를 멱등 키로 업로드하면 된다.

## 1. main.dart — 저장소 만들기

```dart
import 'stats/prayer_stats_store.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  final settings = await AppSettings.load();
  final stats = await PrayerStatsStore.load(); // 추가
  runApp(RosaryApp(settings, stats));          // stats를 생성자로 넘긴다
}
```

`RosaryApp` → `AppShell` → `HomeScreen`/`PrayerScreen`/성당 카드까지 `final PrayerStatsStore stats;`
생성자 파라미터로 내려보낸다(별도 InheritedWidget 불필요). 위젯 테스트에서는
`PrayerStatsStore.inMemory()`를 넘기면 저장소 없이 동작한다.

## 2. PrayerScreen — 트래커

```dart
import '../stats/prayer_session_tracker.dart';

class _PrayerScreenState extends State<PrayerScreen> {
  late final PrayerSessionTracker _tracker;

  @override
  void initState() {
    super.initState();
    _session = widget.session ?? RosarySession(buildRosarySequence(widget.mysterySet));
    if (widget.initialIndex > 0 && widget.initialIndex < _session.steps.length) {
      _session.jumpTo(widget.initialIndex);   // 이어하기 인덱스 적용 "뒤에"
    }
    // ↓ 반드시 jumpTo 뒤: 이때의 인덱스가 기준선(baseline)이 된다.
    _tracker = PrayerSessionTracker(
      store: widget.stats,
      session: _session,
      mysterySet: widget.mysterySet,
    )..start();
    ...
  }

  // '잠깐 쉬기'를 켤 때/끌 때
  void _setRest(bool resting) {
    resting ? _tracker.pause() : _tracker.resume();
    ...
  }

  @override
  void dispose() {
    _tracker.dispose();          // 진행이 있으면 기록 1건을 남기고 종료(멱등)
    ...                          // 기존 정리 코드(_session.dispose() 등)보다 먼저 호출
    super.dispose();
  }
}
```

- 세션이 끝나면(`isFinished`) 트래커가 즉시 `completed: true` 기록을 쓴다. 따로 호출할 필요 없다.
- 완주 후 `_session.restart()`를 누르면 새 구간이 시작되어 다시 끝/이탈할 때 새 기록이 쓰인다.
- 나갈 때 `await _tracker.finish()`가 필요하면 `dispose()` 대신 `finish()`를 부르면 된다
  (둘 다 멱등).
- 진행이 전혀 없으면(성모송 0, 단 0, 미완주) 아무것도 기록하지 않는다.
- `PrayerScreen(stats: ...)` 파라미터를 `required PrayerStatsStore stats`로 추가해야 한다.

## 3. 성당 기도 카드 (church_prayer_card.dart의 컨트롤러)

컨트롤러가 자체 `RosarySession`과 `pause()/resume()`을 갖고 있으므로 같은 방식으로 붙인다.

```dart
// 생성자에서 session 만들고 saved 위치로 jumpTo 한 "뒤에"
tracker = PrayerSessionTracker(
  store: stats,
  session: session,
  mysterySet: mysterySet,
  source: 'church',            // 앱 기도와 구분
)..start();

void pause()  { ...; tracker.pause(); }
void resume() { ...; tracker.resume(); }

@override
void dispose() {
  if (_disposed) return;
  _disposed = true;
  tracker.dispose();           // session.dispose()보다 먼저
  ...
}
```

## 4. 홈 화면 — 요약 카드와 통계 화면 열기

```dart
import '../stats/prayer_stats_store.dart';
import '../stats/stats_screen.dart';
import '../stats/stats_widgets.dart';

// build() 안, 이어서 기도하기 카드 아래 등 적당한 위치:
StatsSummaryCard(
  store: widget.stats,
  onTap: () => Navigator.of(context).push(
    MaterialPageRoute<void>(builder: (_) => StatsScreen(store: widget.stats)),
  ),
),
```

카드는 저장소가 바뀌면 스스로 다시 그리므로 기도 화면에서 돌아오는 즉시 숫자가 갱신된다.
홈의 최대 폭(720) 안에 그대로 넣으면 된다.

## 5. 위젯 단독 사용

- `MonthBarChart(values: calc.completedPerMonth(year), highlightMonth: now.month)` — 길이 12 리스트.
- `MonthCalendar(store: store)` — 일요일 시작, 이전/다음 달 버튼(다음 달은 이번 달까지만).
- `MysteryDistributionBar(counts: calc.decadesBySet(from: f, to: t))`.
- 모든 위젯의 `now:` 파라미터는 테스트에서 시계를 고정하기 위한 것이다(기본 `DateTime.now`).

## 집계 규칙 메모

- "N회"는 **완주한 묵주기도** 수다. 단/성모송/시간은 부분 기도까지 모두 합산한다.
- 기도한 날 = 성모송·단·완주 중 하나라도 있는 기록이 있는 날(로컬 날짜).
- 연속 일수는 오늘 기록이 없어도 어제 기록이 있으면 이어진다.
- 개수는 "도달한 가장 큰 스텝 인덱스"로 계산하므로 뒤로 갔다 다시 가도 중복되지 않는다.
  다만 `jumpTo`로 앞으로 건너뛰면 건너뛴 스텝도 기도한 것으로 센다.
- 신비 분포는 신비별 바친 **단** 수 기준이다.
- 시간은 스텝 변화 사이 공백을 최대 3분으로 잘라 합산하며, 잠깐 쉬기 시간은 뺀다.
