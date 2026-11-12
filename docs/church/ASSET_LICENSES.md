# 외부 자산 라이선스 기록 (ASSET_LICENSES)

웹 성당 장면은 기본적으로 **모든 지오메트리와 질감을 코드로 생성**한다(캔버스 질감, WebAudio 합성). 외부 자산은 선택 사항이며,
쓸 때는 **CC0 또는 MIT** 출처만 허용하고 아래 표에 URL과 라이선스를 반드시 기록한다.

| 용도 | URL | 출처 | 라이선스 | 사용 파일 |
|---|---|---|---|---|
| (없음 — 현재 외부 질감을 사용하지 않는다) | | | | |

## 번들된 오픈소스
| 이름 | 버전 | 파일 | 라이선스 |
|---|---|---|---|
| three.js | 0.149.0 | `assets/church/three.min.js` (npm 레지스트리 `three@0.149.0` 의 `build/three.min.js`, MIT 헤더 유지) | MIT |

## 규칙
1. `ctx.loadTexture(url, fallbackFactory)` 로만 불러온다. 실패해도 대체 질감으로 장면이 정상 동작해야 한다.
2. CC0(ambientCG, Poly Haven 등) 또는 MIT 외의 라이선스(CC-BY 포함)는 쓰지 않는다.
3. 한 번 쓴 URL은 이 표에 추가하고 PR/보고에 언급한다.
