# Material 3 전환 점검표

Flutter 3.47.9 / Material 3(`useMaterial3`) 기준. 이 문서는 (1) 이번에 전환을 끝낸 화면·위젯의 체크리스트,
(2) 병렬 작업 때문에 손대지 못한 `prayer_screen.dart`, `app_shell.dart`, `lib/church/*`의 **TODO**를 담는다.

관련 테스트: `test/theme_contrast_test.dart`(WCAG 대비), `test/m3_theme_test.dart`(테마·동적 색·터치 대상/라벨 가이드라인).

## 1. SDK 점검 결과 (Flutter 3.47.9)

| 항목 | 상태 |
| --- | --- |
| `Easing.*`, `Durations.*` (`material/motion.dart`) | 있음 → 전부 토큰으로 교체 |
| `Slider/ProgressIndicator.year2023` | 있음, 단 **deprecated**(기본값이 아직 `true`). 새 M3 모양을 쓰려면 `false`를 명시해야 해서 `ThemeData`에 `// ignore: deprecated_member_use`와 함께 설정. 기본값이 바뀌면 제거 |
| `IconButton.filled/filledTonal/outlined`, `Card.filled/outlined`, `SegmentedButton`, `SliverAppBar.large/medium`, `NavigationBar/Rail`, `Badge`, `FilterChip`, `DropdownMenu`, `SearchAnchor` | 모두 있음 |
| `SystemUiMode.edgeToEdge` | 있음 |
| `PredictiveBackPageTransitionsBuilder` | 있음. 뒤로가기 제스처 외 앞으로 가기 전환은 M3 기본 `FadeForwardsPageTransitionsBuilder`로 처리됨 |
| `fadeThrough`(탭 전환) | 스톡 위젯 없음(`animations` 패키지 소관) → 탭 전환은 그대로 둠 |
| M3 Expressive(`LoadingIndicator`, 버튼 그룹 등) | **이 SDK에는 없음**(`material/`에 해당 파일 없음, `expressive`는 `DynamicSchemeVariant` 값뿐) → 도입하지 않음 |
| `dynamic_color` | 2.x는 `material_ui` 패키지의 **별도 `ColorScheme` 타입**을 써서 `material.dart`와 호환되지 않음 → **1.9.0**(`^1.9.0`) 사용 (`pubspec.yaml`에 주석) |
| `InkSparkle` | `flutter test`에서 셰이더 에셋(`shaders/ink_sparkle.frag`)을 못 찾아 실패 → M3 표준 물결 `InkRipple` 유지 |

## 2. 색 (Color)

- `AppTheme.seedScheme(brightness)`: `ColorScheme.fromSeed(seedColor: 0xFFC2613E(테라코타), dynamicSchemeVariant: tonalSpot)`.
- **문서화된 덮어쓰기는 단 하나**: `secondary*`(올리브 시드 `0xFF7A8A5A`)와 `tertiary*`(골드 시드 `0xFFC9A04A`) 각 4개 역할.
  각 시드의 tonalSpot primary 톤 쌍(40/100, 90/10)을 그대로 가져오므로 대비 관계가 유지된다. 서피스/중립/오류는 100% 시드 생성값.
- 하드코딩 색 제거: 내 파일의 `Color(0x..)`/`Colors.*`/`withValues(alpha)` 색 해킹 없음(역할 색만 사용). 윤곽선·그림자 대신 `surfaceContainer*` 톤.
- `ThemeData`의 hover/focus/pressed 상태 레이어: 8% / 10% / 10% (`onSurface`).
- **Material You**: `AppSettings.useDynamicColor`(키 `use_dynamic_color`, 기본 `false`) + 설정 > 기도문 표시 첫 줄 스위치
  '기기 배경화면 색 사용(Material You)'.
  - `RosaryApp`은 `DynamicColorBuilder`를 **항상** 트리에 두고(스위치로 내비게이터 상태가 날아가지 않게),
    켜져 있고 기기가 색을 주면 `lightDynamic/darkDynamic.harmonized()`를 `AppTheme.light/dark(dynamicScheme:)`에 넘긴다.
  - Android 12+ 는 OS core palette, macOS/Windows/GTK는 강조색, 그 외/미지원/응답 전은 `null` → 시드 구성으로 대체.
- 대비 테스트(`test/theme_contrast_test.dart`): 요청한 9쌍 + 화면에서 실제로 겹치는 5쌍을 라이트/다크/동적 형태(대표 배경화면 색 4종 × 2모드, `harmonized()` 적용)에서 검사. 모두 통과(조정 불필요).

## 3. 화면·위젯별 체크리스트 (내 파일)

범례: **완료** = M3 기준으로 전환됨, `-` = 해당 없음.

| 대상 | 색 역할 | 타입 역할 | 모양 | 컴포넌트 | 모션 | 레이아웃/적응형 | 접근성 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `app/theme.dart` | 완료(시드+2개 덮어쓰기) | 완료(`Typography.dense2021`+시스템 글꼴) | 완료(`AppShape` 0/4/8/12/16/28/full) | 완료(아래 4장) | 완료(`AppMotion.of`) | 완료(시스템 바 스타일) | 완료(상태 레이어) |
| `main.dart` | - | - | - | - | - | 완료(`SystemUiMode.edgeToEdge`) | - |
| `app/app.dart` | 완료(동적 색+harmonize) | - | - | 완료(`DynamicColorBuilder`) | - | 완료(`AnnotatedRegion` 투명 바+아이콘 밝기) | - |
| `ui/home_screen.dart` | 완료 | 완료(역할 스타일만, `fontSize` 없음) | 완료(카드 12/16, 칩 8) | 완료(`SliverAppBar.large`, `Card.filled/outlined`, `BottomAppBar`+`FilledButton.icon`, `SegmentedButton`, `CircleAvatar`) | 완료(`Durations.medium1`+`Easing.emphasizedDecelerate`) | 완료(`SliverPageBody` 16/24 여백, SafeArea, 8dp 격자, 글자 배율에 맞춘 머리표 폭) | 완료(버튼·선택 의미, 48dp 가이드라인 테스트) |
| `ui/settings_screen.dart` | 완료(`surfaceContainerLow` 카드, 오류 배너 `errorContainer`) | 완료 | 완료 | 완료(`Card.filled`, `SwitchListTile`, `Slider`(2024 모양), `IconButton.filledTonal`, `SegmentedButton`, `FilledButton.tonalIcon`) | 완료(`Durations.short4/medium1`) | 완료(`SliverPageBody`) | 완료(슬라이더 `semanticFormatterCallback`, 헤더 의미, 툴팁) |
| `ui/rosary_style_screen.dart` | 완료 | 완료 | 완료(미리보기 28, 칸 12) | 완료(`Card.filled/outlined`+`InkWell`, `Badge`(테마 색)) | 완료(`AnimatedSwitcher` in/out 이징) | 완료(compact 3열/medium 4열/expanded 분할, 글자 배율 대응 칸 높이를 `labelMedium` 줄 높이로 계산) | 완료(selected 의미, 라벨) |
| `ui/leader_record_screen.dart` | 완료(녹음 중 = `errorContainer` 톤) | 완료 | 완료 | 완료(`SliverAppBar.medium`, `Card.filled/outlined`, `LinearProgressIndicator`(2024), `TextButton.icon`, 스낵바 floating) | - | 완료(`SliverPageBody`, 26개 행) | 완료(진행률 의미 `semanticsLabel`, 상태 아이콘 `semanticLabel`) |
| `ui/widgets/section_header.dart` | 완료(primary) | 완료(`labelLarge`) | - | 완료(목록 소제목) | - | 완료 | 완료(`Semantics(header)`) |
| `ui/widgets/pill.dart` | 완료(기본 secondaryContainer) | 완료(`labelMedium`) | 완료(M3 Chip 8dp) | 완료(**비대화형 `Chip`** 얇은 래퍼. `prayer_screen`이 아직 사용) | - | - | 완료 |
| `ui/widgets/soft_card.dart` | 완료 | - | 완료(`Card` 12) | 완료(**`Card.filled/outlined` 호환 래퍼**. `prayer_screen`이 아직 사용 → 아래 TODO) | - | - | - |
| `ui/widgets/page_body.dart`(신규) | - | - | - | 완료(`SliverSafeArea`+`FocusTraversalGroup`) | - | 완료(창 크기별 여백 16/24, 최대 폭) | 완료(키보드 이동 그룹) |
| `ui/widgets/rosary_map.dart` | 완료(칩 글씨·아이콘 `onSurfaceVariant`, 알파 제거) | 완료(`labelMedium`, `fontSize` 제거) | - | - | - | - | 지도 칠하기는 건드리지 않음. 키보드 조작 TODO는 5장 |
| `app/window_class.dart` | - | - | - | - | - | 완료(`margin`: compact 16 / medium 24 / expanded 24) | - |

## 4. ThemeData 컴포넌트 테마

| 컴포넌트 | 설정 |
| --- | --- |
| 색/서피스 | `colorScheme` + 기본 `scaffoldBackground = surface` |
| 타입 | `Typography.dense2021` + 시스템 글꼴(fontFamily 미지정), M3 크기/굵기/행간 그대로(display 57/45/36, headline 32/28/24, title 22/16/14, body 16/14/12, label 14/12/11) |
| AppBar(large/medium) | M3 기본 + `systemOverlayStyle`(투명 상태/내비 바, 아이콘 밝기 반전, `ContrastEnforced=false`) |
| Card | `margin: 0`, `clip: antiAlias`(색·모양은 variant별 M3 기본 유지) |
| FilledButton / tonal / OutlinedButton / TextButton / IconButton | M3 기본(40dp, full 모양, 48dp 터치 영역). 큰 주 행동만 `AppTheme.largeButtonHeight = 56` |
| SegmentedButton | `selectedIcon: check`(색 외 단서) |
| Chip | `shape: small(8)`, `labelLarge` |
| ListTile | `contentPadding: start 16 / end 24` |
| Switch | `thumbIcon: check`(켜짐) |
| Slider / Progress | `year2023: false` (2024 M3 모양) |
| NavigationBar / Rail | `labelBehavior: alwaysShow`, 라벨 `labelMedium`, 레일 인디케이터 full |
| BottomSheet | `showDragHandle: true`, 위 28dp, `maxWidth: 640` |
| Dialog | `extraLarge(28)` |
| SnackBar | `floating`, 닫기 아이콘, `extraSmall(4)` |
| Tooltip | `inverseSurface`/`onInverseSurface`, `bodySmall`, 4dp, 대기 `Durations.long1` |
| PopupMenu | `extraSmall(4)`, elevation 3, `labelLarge` |
| Divider | `outlineVariant`, 1dp |
| Badge | `primary`/`onPrimary` |
| 페이지 전환 | Android `PredictiveBackPageTransitionsBuilder`(앞으로 가기는 FadeForwards), iOS/macOS Cupertino. 확인함 |

## 5. 남은 항목 / 알려진 제한 (내 영역)

- `rosary_map.dart`: 지도 영역은 포인터/스와이프 전용(`GestureDetector`) → 키보드에서 포커스·방향키(`FocusableActionDetector`)로 구슬 넘기기가 안 됨.
  TalkBack은 `onIncrease/onDecrease` 의미로 가능. (painting 로직은 범위 밖이라 보류)
- `AndroidManifest.xml`/`styles.xml`: 변경 없음. `enableOnBackInvokedCallback="true"` 이미 있음. Android 15 edge-to-edge는 `main()`의 `edgeToEdge` 모드로 충족.
  (선택) 노치 가로모드에서 시작 화면 영역을 확장하려면 `values-v28/styles.xml`의 `LaunchTheme`에 `android:windowLayoutInDisplayCutoutMode=shortEdges`.
- `year2023` 플래그는 deprecated 경고를 `ignore`로 억제 중(주석 설명). Flutter가 기본값을 바꾸면 두 줄 삭제.
- 탭 전환(`IndexedStack`)에는 fade-through 같은 전환이 없다(스톡 위젯 없음).
- `widget_shell_test.dart`의 'medium width ... hasLength(3)'은 `app_shell.dart`에 '성당' 4번째 목적지가 추가돼 실패 중(내 변경과 무관, 위 파일 소유자가 갱신).

## 6. TODO — `lib/ui/prayer_screen.dart` (내가 수정하지 않음)

| 줄(대략) | 문제 | 해야 할 일 |
| --- | --- | --- |
| 237-250 | `AlertDialog` + TextButton/FilledButton | 테마(28dp)로 충분. 파괴적 행동이면 확인 버튼 문구/`FilledButton`은 유지, 별도 변경 없음(확인만) |
| 265-272 | `showModalBottomSheet(showDragHandle:true, SafeArea, padding 20)` | `showDragHandle`는 이제 테마 기본이라 제거 가능. 안쪽 여백 20 → 24(8dp 격자). `useSafeArea:true` 사용 권장 |
| 283-290 | `Card.filled(color: surfaceContainerHigh)`+`padding 16` | 마진을 `CardTheme`이 0으로 주므로 OK. 색은 기본(`surfaceContainerHighest`)으로 단순화 가능 |
| 304 | `Slider(...)` | 테마가 2024 모양으로 바뀜. `divisions`/`label` 있으면 값 표시기 확인, `semanticFormatterCallback` 추가(`'${(v*100).round()}%'`) |
| 356-388 | `AppBar(centerTitle: true, bottom: LinearProgressIndicator(minHeight: 5, borderRadius: 3))` | M3 기본(왼쪽 정렬)으로: `centerTitle` 제거. 진행 표시줄은 `minHeight`/`borderRadius` 제거(2024 모양이 자체 둥근 끝) |
| 390 | `body: SafeArea(...)` | AppBar 아래라 OK. 가로모드 노치 대응은 `left/right`만 유지 |
| 419-431 | `Container(circle, color secondaryContainer, border secondary 40%)` + 체크 아이콘 | 완료 화면 원: 테두리·`withValues(alpha)` 제거, `CircleAvatar(radius:56, backgroundColor: secondaryContainer, foregroundColor: onSecondaryContainer)` 또는 `Icon` 단독 |
| 441-460 | `headlineSmall.copyWith(fontWeight: w700)`, `SizedBox(28/10/36/12)` | 굵기 override 제거(M3 `headlineSmall` 그대로), 간격 28/10/36/12 → 24/8/32/16 |
| 466-470 | `OutlinedButton.styleFrom(minimumSize: Size(64, 56))` | 56 높이가 필요하면 `AppTheme.largeButtonHeight` 사용(리터럴 56 제거) |
| 513-520 | `AnimatedSwitcher/AnimatedContainer(Duration(160ms), Curves.easeOut)` | `AppMotion.of(context, Durations.short3)` + `Easing.standard`(`reduce` 분기도 `AppMotion.of`가 대신함) |
| 536-545 | `fontSize: (titleStyle.fontSize ?? 14) * scale` | 기도문 배율은 의도된 커스텀 크기이므로 유지하되 주석으로 문서화. `TextScaler`가 아니라 앱 설정 배율임을 명시 |
| 565-595 | `FilledButton.tonal/FilledButton` 에 `minimumSize 56`, `titleLarge.copyWith(w600)` | `AppTheme.largeButtonHeight`로 높이 통일, 굵기 override 제거(`labelLarge` 기본). `SizedBox(width: 12)` → 16 |
| 610-625 | `_buildWide`: `DecoratedBox(surface + radius 28 + border outlineVariant)` | 직접 만든 윤곽선 판 → `Card.filled(shape: AppShape.extraLargeBorder, color: surfaceContainerLow)`(윤곽선 제거) |
| 685-707 | 크기 조절 손잡이 `GestureDetector`+`Container(40x4, outline)`+`SizedBox(36)` | M3 시트 핸들 규격은 32x4(`BottomSheetThemeData.dragHandleSize`). `Semantics`에 `onIncrease/onDecrease`(↑↓)와 키보드 `Shortcuts` 추가 |
| 709-713 | `AnimatedContainer(220ms, Curves.easeOutCubic)` | `Durations.medium1`(250)+`Easing.emphasizedDecelerate`, `AppMotion.of` |
| 742-756 | `_ControlBar`: `DecoratedBox(surface, 위 28, 3면 outlineVariant 테두리)`, padding `(16,12,16,10)` | `Material(color: surfaceContainerLow, shape: top 28, elevation 0)` 또는 `BottomAppBar`로 교체, 테두리 제거, padding `(16,16,16,8)`로 8dp 격자 |
| 775 | `Pill(background:, foreground:)` | `Pill`이 이제 `Chip` 래퍼. 색 인자 생략 가능(secondaryContainer 기본) 또는 `Chip`/`AssistChip` 직접 사용 |
| 799-830 | `_HeadingCard`: `SoftCard(color: secondaryContainer, borderColor: transparent)` + `titleMedium/bodyLarge.copyWith(fontSize*scale, w700, height 1.5)` | `Card.filled(color: secondaryContainer)`로 교체(그러면 `SoftCard` 삭제 가능). 굵기·행간 override 제거 |
| 856 | `onSurface.withValues(alpha: 0.45)`(흐린 문장) | 알파 합성 대신 `onSurfaceVariant`(대비 4.5:1 보장). 기도문 가독성을 위해 **대비 테스트 필요** |
| 919 | `_RoleLabel`: `Pill(dense:true)` | 위와 같음 |
| 전반 | 주 영역 `SafeArea`와 `ListView` 여백 | 좌우 여백을 `windowClassOf(context).margin`(16/24)으로, 하단은 시스템 제스처 영역 고려 |
| 전반 | 키보드 | 다음/이전을 `Shortcuts`/`Actions`(→, 스페이스, ←)로도 묶기 |

## 7. TODO — `lib/ui/app_shell.dart` (내가 수정하지 않음)

| 줄(대략) | 문제 | 해야 할 일 |
| --- | --- | --- |
| 51-74 | `IndexedStack` 탭 전환(전환 효과 없음) | 스톡 fade-through 위젯 없음. 필요하면 `AnimatedSwitcher`+`FadeTransition`(`Durations.short4`, `Easing.standard`)만. 해도 되고 안 해도 됨 |
| 76-83 | `PopScope` 구성 | 유지(예측형 뒤로가기와 호환). 확인만 |
| 86-105 | `NavigationBar` 목적지에 `selectedIcon` 없음 | M3는 선택 시 채운 아이콘 권장: `Icons.self_improvement`(동일), `radio_button_checked`, `settings_outlined`→`settings`, `church_outlined`→`church` 로 `icon`/`selectedIcon` 분리. 라벨 4개일 때 `labelBehavior`는 테마(`alwaysShow`)가 처리 |
| 108-146 | `NavigationRail` + `SafeArea(right:false)` | 가로모드 노치: body 쪽 `SafeArea(left:false)`가 이중 인셋을 만들 수 있음 → `Scaffold` 밖이 아니라 `Row` 전체를 한 번 `SafeArea`로 감싸고 레일에는 `SafeArea` 제거. 레일 `labelType`은 테마의 라벨 스타일 사용, expanded에서 `extended: true` 유지, 상단에 `leading`으로 `FloatingActionButton`은 불필요 |
| 108-146 | 레일 `minExtendedWidth` | 기본 256 유지. `NavigationRail.trailing`/`groupAlignment`는 기본(-1) |
| 전반 | 키보드 | `NavigationRail`/`NavigationBar`는 기본 포커스 지원. `Shortcuts`로 Ctrl+1..4 탭 이동 추가는 선택 |
| 테스트 | `test/widget_shell_test.dart` | 목적지 4개(성당 포함) 기준으로 `hasLength(4)` 갱신(현재 hasLength(3)로 실패) |

## 8. TODO — `lib/church/*` (내가 수정하지 않음)

| 파일:줄(대략) | 문제 | 해야 할 일 |
| --- | --- | --- |
| `church_hud.dart:59,125,157` | 3D 장면 위 버튼 배경 `scheme.surface.withValues(alpha: 0.86)`를 직접 합성 | 투명 합성 대신 `IconButton.filledTonal`(내장 `secondaryContainer`)로 교체하고 `Material(color: surfaceContainerHigh)`. 장면 위 가독성이 필요하면 `elevation: 3` 사용. `Container(48x48, circle)`(157) → `IconButton.filledTonal`을 `PopupMenuButton.icon/style`로 |
| `church_hud.dart:34-41` | 접속 점 `Container(8x8, circle)` | 문서화된 의도적 점이면 유지하되 `Semantics(label)` 보장(현재 `Text('N명')`가 있어 OK). `Badge`로 대체 가능 |
| `church_hud.dart:124-128` | `IconButton.styleFrom(minimumSize: Size(48,48))` | 테마가 이미 48 터치 영역 → 제거 |
| `church_hud.dart:186-189` | `Duration(milliseconds: 180)` ×2, 기본 curve | `Durations.short3`/`short4`, `Easing.standard`; 등장 `Easing.emphasizedDecelerate`, 퇴장 `emphasizedAccelerate`. `AppMotion.of(context, ...)`로 '동작 줄이기' 존중 |
| `church_hud.dart:334-353` | 홀드 진행 `Container`에 `surface 45%`, `onSurface 35%`, `primary 85%` 알파 | `LinearProgressIndicator`/`CircularProgressIndicator`(2024 모양)로 교체하거나 알파 제거 |
| `church_prayer_card.dart:190-195` | `Material(surface 93% 알파, elevation 3, radius cardRadius+4)` | `Card.filled`/`Card.elevated(color: surfaceContainerHigh)`, `shape: AppShape.largeBorder`(16)로(`AppTheme.cardRadius`는 12로 바뀜: +4=16이라 모양은 거의 동일) |
| `church_prayer_card.dart:112` | `Timer.periodic(1s)` | 모션 아님, 변경 없음 |
| `church_select_screen.dart:230-235` | `SearchBar(elevation 0)` | 검색 제안이 필요하면 `SearchAnchor.bar`(제안 목록/전체 화면 검색). 현재 단순 필터라면 `SearchBar` 유지, `elevation` 인자 제거(M3 기본 1) |
| `church_select_screen.dart:258,448` | `FilterChip`(avatar+라벨, `showCheckmark:false`) | M3 필터 칩은 선택 시 체크 표시 권장 → `showCheckmark` 기본값 사용, 칩 간격 `SizedBox(8)` → `Wrap(spacing: 8)` |
| `church_select_screen.dart:349-356` | 헤더 `DecoratedBox(gradient primaryContainer→surface, 아래 32dp)` | 모양 토큰으로: 아래 28dp(`extraLarge`). 그라디언트 대신 단색 `primaryContainer`(대비 보장) 권장. 안쪽 `onPrimaryContainer.withValues(alpha .12/.8)`(368,387)는 알파 제거 → `onPrimaryContainer`/`secondaryContainer` |
| `church_select_screen.dart:532-545` | '준비 중' 라벨 `inverseSurface 80%` + radius 12 + `labelSmall` | `Chip`(비대화형)/`Badge.count` 스타일: `Chip(backgroundColor: inverseSurface, labelStyle: onInverseSurface, shape: small)` |
| `church_select_screen.dart:631-640` | 라벨 `DecoratedBox(surface, radius 8, padding 8/3)` | `Chip(visualDensity: compact, side: none)`(`Pill` 래퍼 사용 가능), 3dp padding은 8dp 격자 밖 |
| `church_select_screen.dart:130-134` | 시트 `showModalBottomSheet(isScrollControlled, useSafeArea)` | 테마가 `showDragHandle`/모양을 이미 설정 → OK. 안쪽 여백만 8dp 격자 확인 |
| `church_screen.dart:308-312,420-424` | `SnackBar(behavior: floating)` 중복 지정 | 테마가 `floating`이므로 `behavior` 제거. 닫기 아이콘은 테마가 제공 |
| `church_screen.dart:518` | `SafeArea(...)`(edge-to-edge) | 3D 장면은 전체 화면 확장, HUD만 `SafeArea`가 되도록 위치 확인. Android 15 가로 모드 컷아웃 점검 |
| `church_screen.dart:640-652` | 로딩 `LinearProgressIndicator(borderRadius: 4)` | `borderRadius` 제거(2024 모양이 자체 처리), 폭 160 유지 시 `ConstrainedBox`로 |
| `church_candle_sheet.dart:55-70` | `ListTile(selected, selectedTileColor secondaryContainer, shape radius 16)` + `Padding(vertical 2)` | 선택 목록은 `RadioListTile`(또는 `RadioGroup`) 사용 → 키보드/접근성 의미(`inMutuallyExclusiveGroup`) 자동. 모양 16 → `AppShape.largeBorder` 상수 |
| `church_candle_sheet.dart:7-11` | `showModalBottomSheet<int>(useSafeArea)` | 확인만 |
| `church_scene_controller.dart:268,385` | `Colors.transparent`, `Color(0xFF202020)`(가짜 장면, 테스트용) | WebView 투명 배경은 의도. 가짜 장면 색은 테스트 전용이라 유지 |
| `avatar/avatar_editor_screen.dart:67` | `SliverAppBar.large` | 이미 M3. `ChoiceChip`(112) 선택 표시 확인 |
| `avatar/avatar_editor_screen.dart:179` | `bottomNavigationBar: SafeArea(...)` | `BottomAppBar`(홈과 동일 패턴)로 교체 → 톤 표면·inset 자동 처리 |
| `avatar/avatar_editor_screen.dart:280-282,296-297` | 색 견본 위 체크 색 `Colors.white/black87`, `AnimatedContainer(120ms)` | 견본 위 체크는 견본 밝기 기반이라 필요한 하드코딩(문서화). 모션은 `Durations.short2` + `Easing.standard` |
| `avatar/avatar_preview.dart:43-46,90-254` | `BorderRadius.circular(999)`, `CustomPainter` 고정 색(`0xFF1A1A1A` 등) | 캐릭터 그림 색은 도메인 색이라 유지. `999`는 `StadiumBorder`/`AppShape.full`로 |
| `church_select_screen.dart` 전반 | 그리드 열 수 | 이미 compact 2/medium 3/expanded 4. 좌우 여백을 `windowClassOf(context).margin`으로 통일 |
| 전반 | 터치 대상/라벨 | 새 `test/m3_theme_test.dart`의 `androidTapTargetGuideline`/`labeledTapTargetGuideline`를 성당 선택 화면에도 적용 |

## 9. 적용 순서 제안 (리드용)

1. `app_shell.dart`(아이콘 쌍, SafeArea 정리, 테스트 갱신) → 2. `prayer_screen.dart`(AppBar·진행 표시줄·컨트롤 바·모션 토큰) 후 `SoftCard` 삭제 →
3. `church/*`(알파 합성 제거, 칩·검색·시트·스낵바) → 4. `flutter analyze`, `flutter test`(특히 `theme_contrast_test`, `m3_theme_test`) 재실행.
