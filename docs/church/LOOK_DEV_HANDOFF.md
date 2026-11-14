# 성당 룩·성능 작업 인수인계 (2026-11-14, 사용자 지시로 중단 — 월요일 13시 이후 재개)

관련 문서: [LOOK_DEV.md](LOOK_DEV.md)(진단·프리셋·재질), [SPEC.md](SPEC.md) §34(API), [PERF.md](PERF.md).
작업 스크린샷·측정 원자료: `/tmp/claude-0/-home-user/127c52ad-6e6f-576e-8168-2e8eda5aa1ed/scratchpad/look_dev/`(before·after·iter1·iter2, perf_high.log, flicker.log, glassplace.log). 임시 폴더라 지워질 수 있다.

## 1. 끝난 것 (기본 활성)

| 항목 | 파일 | 상태 |
|---|---|---|
| 그림자 맵 정적 캐시(해가 움직일 때만, 아바타는 맵에서 제외 → 발밑 그림자 판) | render.js, world.js | 활성 |
| SSAO 가 RenderPass 결과(MSAA)를 재사용(장면 재렌더 제거) + 반해상도 + 깊이 가중 업샘플, 합성 1패스 | render.js | 활성(`?aofull=1` 전해상도) |
| 바닥 반사끼리 서로 다시 그리기 금지(반사·법선 패스 안에서 갱신 생략) | render.js | 활성 |
| 하늘 구를 불투명 목록 맨 끝으로(가려진 화소 생략) | world.js | 활성 |
| composer 두 번째 타깃 깊이 질감 분리(r149 복제 공유 버그, AO 합성 피드백 방지) | render.js | 활성 |
| 화질 3단계 high/mid/low + 자동(high→mid→low, 해상도 유지) | render.js, world.js, main.js | 활성. 기본 `auto` |
| Flutter `ChurchQuality {auto, high, mid, low}`(예전 저장값 호환), 설정 '성당' 절: 성당 화질 + 성능 표시(진단) | settings.dart, settings_screen.dart | 활성 |
| 성능 표시 오버레이(fps·1% low·ms·GPU 타이머/대기 추정·해상도·단계·draw call, '10초 기록' → 클립보드) | perf_hud.js, church_diagnostics.dart, church_scene_controller.dart | 기본 **꺼짐** |
| 앉아서 가만히 있을 때 한 프레임 걸러 그리기(≈30fps, 끌기·일어서기 즉시 60) | main.js | 활성(`?idle=0` 끔) |
| 룩 프리셋 시스템(looks.js → world env·render setGrade, 대비 S 곡선 uniform) | looks.js, world.js, render.js, main.js | 활성 |
| 성 베드로 룩(따뜻한 금빛 키·낮은 앰비언트·대비·비네트·블룸·바닥 반사 0.55·먼지 140) | looks.js `LOOKS.stpeter` | 활성(낮·밤 화면 확인) |
| 성 베드로 발다키노 솔로몬 기둥 재작성(축 나선 3회전·두 골·아래 잔 홈·금 잎사귀 알) | ch_stpeter.js `twistCol` | 활성 |
| e2e 자동 하향 검사를 `auto` 기준으로 갱신, looks.test.mjs(3) 추가 | tools/church_web | — |
| 측정 도구: look_shots.mjs(전/후 스크린샷), perf_compare.mjs(사본별 프레임 비용, `--passes` 패스별) | tools/church_web | — |

## 2. 남은 것 (우선순위)

1. **다른 성당 룩 검증·적용**: 라테라노·마조레·성 바오로·밀라노·피렌체·명동·본당 값은 `looks.js` 의 `DRAFTS`(적용 안 됨). `?looks=all` 로 켜 보고 성당마다 낮·저녁·밤 스크린샷을 본 뒤 `LOOKS` 로 옮긴다.
2. **측정 마무리**: 피렌체·밀라노의 pre/head/new 프레임 비용(성 베드로만 끝남), `perf_compare.mjs --passes` 패스별 비용 표, high/mid/low 표, 1280×1100 DPR 2 큰 화면 로그. PERF.md 에 표로 기록.
3. **성 베드로 전/후 스크린샷 완성**: 360×800 15장(전은 있음, 후는 일부), 1280×800 가로(전·후 모두 아직). 측랑 시점(x 9, z 12)은 촛불 봉헌대에 카메라가 끼어 의미가 적다 → z 2 정도로 바꿔 전·후 다시 찍기.
4. 실기기 확인(아래 §5).
5. 룩 추가 작업 후보: 제대 촛대 형태, 금박 요소, 벽 줄눈 데칼, 촛불 후광(스프라이트 재사용), 가로 화면 카메라.
6. 동적 해상도(최후 안전장치)는 사용자 지시("해상도 유지")로 **구현하지 않았다**. 자동은 단계만 낮춘다.
7. 텍스처 상주(성 베드로 장면 질감 추정 91MB): 1k 사진 질감·캔버스 아틀라스. KTX2/Basis 는 트랜스코더(wasm 약 0.5MB+)로 APK 예산(0.3MB)을 넘으므로 보류, 큰 캔버스 질감의 해상도 조정이 먼저.

## 3. 측정 표 (헤드리스 SwiftShader, 360×800, high, 성 베드로 신랑, 11시, 군중 켬)

다른 에이전트가 동시에 브라우저·Flutter 시험을 돌려 부하가 15~20 이었다. **ms 는 같은 실행 안의 상대 비교만** 의미가 있다. draw call·삼각형은 기기와 무관한 값(그림자·반사·SSAO 패스 누적).

| 사본 | 프레임 중앙 ms | draw call/프레임 | 삼각형/프레임 | 장면 질감 추정 MB |
|---|---|---|---|---|
| pre = `9d1ccdb`(의자·묵주·14처·사진 창 이전) | 11,403 | 601 | 1,092,738 | 80.4 |
| head = 작업 시작 시 HEAD | 10,904 | 582 | 1,100,842 | 91.0 |
| new = 이번 변경(룩·새 기둥 포함) | **4,828 (−56%)** | **293 (−50%)** | **575,429 (−48%)** | 91.3 |

- pre → head: 프레임 비용 회귀 없음(오히려 −4%), 질감 +10.6MB(G-29 사진 창·14처 아틀라스).
- 반사 갱신: 프레임당 8회(전: 두 바닥이 서로 + SSAO 재렌더) → 2회. 그림자 맵: 매 프레임 → 5초마다.
- 피렌체 pre 9,705ms / 463 calls / 931,722 tris (head·new 는 측정 중단).

## 4. 다음에 할 첫 3가지

1. `node tools/church_web/perf_compare.mjs --roots head=<HEAD 사본>,new=assets/church --churches florence,milan` 과 `--passes`(성 베드로) 를 부하가 적을 때 돌려 PERF.md 표 채우기.
2. `CHURCH_ROOT=<전 사본> node tools/church_web/look_shots.mjs <dir>/before stpeter` / 같은 명령으로 after(1280×800 포함) → 비교 시트로 성 베드로 룩 최종 조정(필요하면 `expK`·`ambK` 만).
3. `?looks=all` 로 다른 성당 초안을 한 성당씩 확인해 `LOOKS` 로 옮기기(밀라노·명동 먼저).

## 5. 주의

- **사진 창 색**: 룩·대비는 최종 패스의 알파 0 경로 밖에서만 적용된다. 바꾸면 `node tools/church_web/glassplace.mjs --only color` 로 ΔE 중앙값 ≤ 3 확인.
- **깜빡임**: SSAO 반해상도·RenderPass 재사용 뒤 `node tools/church_web/flicker.mjs lateran stpeter` 로 확인(결과는 보고서·로그).
- `markCaster` 는 이제 `castShadow` 를 켜지 않는다(아바타가 정적 그림자 맵에 남지 않게). avatar.js 가 스스로 켜는 메시는 렌더 시점에 잠깐 끈다(`userData.dynamic`).
- composer 깊이 질감 공유 버그: `renderTarget2.depthTexture` 를 따로 만드는 줄을 지우면 AO 합성이 검게 나온다.
- `church_screen.dart` 의 이벤트 switch 는 SceneEvent 를 전부 나열한다. 새 SceneEvent 하위 클래스를 만들면 그 파일(HUD 에이전트 영역)을 고쳐야 하므로, 성능 기록은 `ChurchDiagnostics.handleRaw` 로 채널에서 바로 처리한다.
- 자동 하향은 Flutter 설정값을 바꾸지 않는다(다음 입장은 다시 high). 실기기에서 40ms(25fps) 기준이 너무 빠르거나 느린지 성능 표시의 '10초 기록'으로 확인할 것.
- 실기기에서 확인할 점: 대화면(폴더블) high 의 걷기 fps, 자동 하향이 일어나는 시점, 성 베드로 룩의 어두운 부분이 OLED 에서 너무 검지 않은지, 앉아 있을 때 30fps 가 거슬리지 않는지, GPU 타이머 확장 유무.
