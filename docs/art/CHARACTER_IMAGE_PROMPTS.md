# 새 캐릭터 교체용 추가 이미지 · 프롬프트 모음

기준 이미지: 사용자가 올린 "여성·남성 정면/측면/후면 3뷰" (부드러운 3D 애니메이션풍 사실 체형, 한국인 성인, 아이보리/브라운 톤 의상).
이 문서의 프롬프트는 **기준 이미지를 같이 첨부**해서 쓰는 것을 전제로 합니다(ChatGPT 이미지, Midjourney `--cref`/`--sref`, Gemini 등).

---

## 0. 먼저 알아 둘 것 — 왜 추가 이미지가 필요한가

앱의 아바타는 **성별 · 피부색 · 머리 모양 · 머리색 · 옷 · 세례명**을 고르고, 걷기 · 앉기 · 기도 · 무릎 꿇기 · 인사 · 성호 · 촛불 봉헌 동작을 합니다. 지금 이미지(3뷰)만으로는 아래가 비어 있습니다.

| 빠진 것 | 이유 |
|---|---|
| 맨몸(기본 몸) 3뷰 | 긴 치마·재킷이 다리와 몸통을 가려서 뼈대(리깅)와 옷 교체를 만들 수 없음 |
| 머리(얼굴) 5방향 | 얼굴·귀·목선을 만들려면 정면/측면/후면/45° 필요 |
| 머리 모양 시트 | 머리 모양 선택지를 만들려면 모양별 3뷰 필요 |
| 옷 시트 | 옷 선택지를 만들려면 옷별 3뷰 필요 |
| 동작 자세 | 앉기·무릎 꿇기·기도 손모양 등 성당에서 쓰는 자세가 없음 |
| 손·묵주 클로즈업 | 기도 손(깍지/합장)과 묵주가 이 앱의 핵심 소품 |

**제작 방식(3D로 만드는 방법)은 문서 맨 아래 §9 에서 결정이 필요합니다.**

---

## 1. 모든 프롬프트 맨 뒤에 붙일 "공통 블록"

```
Use the attached reference image as the exact character: same face, same Korean adult look, same proportions, same semi-realistic 3D animated film style, same soft skin shading and fabric rendering.
Game-asset reference sheet: strictly orthographic (no perspective, no camera tilt), flat even studio lighting, soft ambient occlusion only, no cast shadow, no reflections, plain light warm-grey seamless background (#D9D4D0).
Full body from top of head to soles, shoes visible, centered in each view. Use the same scale and the same horizontal alignment for head top, chin, shoulders, elbows, hips, knees and soles in every view. Leave generous margins. Extremely high resolution, at least 3000 px on the long side, crisp edges, no text, no labels, no watermark, no grid lines.
```

**자세 규칙(모든 3뷰 시트)**: A-포즈(팔을 몸에서 약 35° 벌림), 손은 펴고 손가락을 살짝 벌림, 발은 어깨너비, 표정은 입을 다문 자연스러운 무표정에 가까운 은은한 표정.

---

## 2. 우선순위 A (필수)

### A1. 맨몸(기본 몸) 3뷰 — 여성 / 남성

옷을 입히고 벗기는 구조와 뼈대를 만들기 위한 기준 몸입니다. 모든 의상은 이 몸 위에 얹습니다.

**여성**
```
Front view, left side view and back view of the same adult Korean woman as the reference, wearing only a plain matte mid-grey seamless full-body base suit (like a modeling mannequin suit: long sleeves to the wrists, leggings to the ankles, no clothing details, no logo), barefoot with simple neutral feet. Hair tied back tightly and covered by a plain grey skull cap so the head shape, ears and neck line are clearly visible. A-pose.
[공통 블록]
```

**남성**
```
Front view, left side view and back view of the same adult Korean man as the reference, wearing only a plain matte mid-grey seamless full-body base suit (like a modeling mannequin suit: long sleeves to the wrists, leggings to the ankles, no clothing details, no logo), barefoot with simple neutral feet. Hair covered by a plain grey skull cap so the head shape, ears and neck line are clearly visible. A-pose.
[공통 블록]
```

### A2. 얼굴·머리 5방향 — 여성 / 남성

```
Head and neck turnaround of the same adult Korean [woman|man] as the reference, five views in one row: front, left profile, right profile, three-quarter left, back. Hair covered by a plain grey skull cap (no hair visible), ears and jawline clearly visible, relaxed neutral closed-mouth expression, eyes looking straight ahead. Shoulders visible to the collarbone. Orthographic, same scale and same eye-line across all five views.
Same face and art style as the reference. Flat even studio lighting, soft AO only, plain light warm-grey background, at least 3000 px wide, no text.
```

### A3. 머리 모양 시트 — 여성 8종 / 남성 8종(우선 6종씩이면 충분)

머리색은 앱에서 색을 바꿔 입히기 위해 **무채색 중간 회갈색 한 가지**로 그립니다.

**여성 (한 시트에 모양 1개씩 3뷰, 모양마다 따로 생성)**
```
Hairstyle reference: [STYLE] on a plain grey featureless mannequin head with neck, shown in front, left side and back views. Hair color is a neutral mid-grey-brown, a single flat tone with visible strands so it can be tinted later. Orthographic, same scale across views, flat even studio lighting, soft AO only, plain light warm-grey background, at least 2500 px on the long side, no text.
Same hair rendering style as the reference (soft 3D animated film strands, slight sheen).
```
`[STYLE]` 목록(여성): 1) 기준 이미지의 낮은 올림머리(번) 2) 어깨 아래 긴 생머리 3) 하나로 묶은 포니테일 4) 턱선 단발(보브) 5) 어깨 웨이브 중단발 6) 짧은 쇼트컷 7) 중년 파마 짧은 곱슬 8) 한 갈래 땋은 머리

**남성**: 1) 기준 이미지의 단정한 짧은 머리 2) 투블럭 3) 7:3 가르마 4) 짧은 스포츠 컷 5) 약한 곱슬 파마 6) 반삭에 가까운 짧은 머리 7) 앞머리가 내려온 중간 길이 8) 숱이 적은 노년의 짧은 머리(백발 느낌, 중간 회색)

### A4. 옷 시트 — 옷 1벌당 3뷰, 여성 6 / 남성 6 (우선 4벌씩이면 충분)

옷은 **A1 맨몸 마네킹 위에 입힌 상태**로 받아야 몸과 치수가 맞습니다. 머리는 스컬캡.

```
Front view, left side view and back view of the same plain grey mannequin base body (female|male, as in the base-body sheet) wearing ONLY this outfit: [OUTFIT]. Hair covered by a plain grey skull cap, no accessories other than listed. A-pose, sleeves and hems not overlapping the arms' range so the arms are clearly visible. Fabric rendered with visible weave texture (knit, tweed, wool) like the reference. 
[공통 블록]
```
`[OUTFIT]` 목록
- 여성: 1) 기준 이미지의 베이지 카디건 + 아이보리 블라우스 + 브라운 긴 치마 2) 블라우스 + 정장 바지(슬랙스) 3) 미사용 원피스(무릎 아래 길이, 단색) 4) 겨울 롱코트 + 니트 + 치마 5) 가디건 + 청바지(평상복) 6) 단정한 정장 투피스
- 남성: 1) 기준 이미지의 브라운 트위드 재킷 + 베이지 니트 + 면바지 2) 정장 재킷 + 넥타이 + 구두 3) 카디건 + 셔츠 + 치노 4) 겨울 코트 5) 점퍼 + 면바지(평상복) 6) 셔츠 + 조끼 + 슬랙스

### A5. 장신구(소품) 시트

```
Accessory sheet on a plain light warm-grey background, each item shown separately in front and side view at the same scale, no body: (1) lace chapel veil (mantilla), (2) 5-decade rosary with a crucifix, (3) thin gold cross necklace, (4) plain round eyeglasses, (5) small bible/prayer book, (6) wool scarf. Soft AO only, flat even lighting, at least 3000 px wide, no text.
```

---

## 3. 우선순위 B (권장 — 동작·기도 자세)

동작 애니메이션은 모션 라이브러리로 만들 수 있지만, **무릎 꿇기·앉아 기도·합장/깍지 손**은 성당 앱 특성상 따로 확인용 참고가 필요합니다. 맨몸 마네킹(A1) 또는 의상 1번을 입은 같은 캐릭터로.

### B1. 기도 자세 5종 — 여성 / 남성(옆면 + 정면)

```
Pose reference of the same character (female|male, outfit #1) in a plain studio, two views side by side: left side view and front view, orthographic, flat even lighting, plain light warm-grey background. Pose: [POSE]. No furniture except where stated. Same face, proportions and style as the reference. At least 3000 px on the long side, no text.
```
`[POSE]` 목록
1. 서서 두 손을 모은 기도(합장, 손끝이 턱 아래, 팔꿈치 살짝 벌림)
2. **긴 나무 의자에 앉아 두 손을 모은 기도** (등받이 있는 단순한 나무 신자석 의자 옆면만 그림, 무릎·발 위치가 보이게)
3. **무릎 받침(kneeler)에 무릎 꿇고 기도** (앞줄 의자 등받이에 두 팔꿈치와 손을 얹고 고개를 숙임; 앞줄 등받이와 무릎 받침을 단순한 나무 구조로 그림, 레그룸 간격이 보이게)
4. 고개 숙여 인사(절, 상체 30°)
5. 십자성호를 긋는 동작 4컷(이마→가슴→왼쪽 어깨→오른쪽 어깨, 한 시트에 4장 나란히)

### B2. 보행 키포즈 + 인사 + 촛불

```
Same character as the reference, side view only, orthographic, flat even lighting, plain light warm-grey background, same scale in every frame, evenly spaced in one row. Frames: (a) walking cycle in 8 key poses (contact, down, passing, up for left and right foot), arms swinging naturally; (b) waving greeting with the right hand raised; (c) standing and lighting a votive candle with the right hand holding a taper at chest height. At least 4000 px wide, no text.
```

### B3. 손과 묵주 클로즈업

```
Close-up reference of two adult hands holding a 5-decade rosary, three views: front, left side and top-down. Soft realistic 3D animated film skin shading, same as the reference, neutral background, soft AO only, no wrist jewelry, nails natural. At least 3000 px wide, no text.
```

---

## 4. 우선순위 C (선택)

### C1. 피부색 차트(색 맞춤용)
```
Six head-and-shoulders portraits of the same neutral adult face in a row, only skin tone changes from fair to deep (Korean/East Asian to other tones, six evenly spaced steps), flat even lighting, plain grey background, same pose, no hair (grey skull cap). At least 3000 px wide, no text.
```

### C2. 연령 변형(노년)
기준 캐릭터와 같은 스타일로 **60대 후반 여성/남성**의 A1 맨몸 3뷰와 A2 얼굴 5방향. (프롬프트에 `aged late 60s, slightly softer posture, subtle wrinkles` 추가)

### C3. 체형 변형
같은 스타일의 **마른 체형 / 보통(기준) / 통통한 체형** 맨몸 정면·측면(A1 형식), 남녀 각각.

### C4. 천 질감 타일(옷 질감 확인용, 이음매 없는 타일)
```
Seamless tileable fabric texture, 2048x2048, flat top-down, even lighting, no shadows, no seams: [FABRIC]
```
`[FABRIC]`: ribbed beige knit / brown tweed wool / ivory cotton blouse / grey wool trousers / dark brown leather shoe / white lace veil

---

## 5. 파일 규격(올릴 때)

- 형식 PNG(투명 배경이면 더 좋음, 아니면 단색 회색 배경 그대로), 긴 변 3000px 이상(손·묵주·세부는 2000px 이상도 됨)
- 파일명 예: `F_base_3view.png`, `M_head_5view.png`, `F_hair_01_bun.png`, `F_outfit_01_cardigan_skirt.png`, `M_pose_kneel.png`
- 한 이미지에 **같은 스케일**로만. AI가 시점마다 키를 다르게 그리면 정렬선(머리 꼭대기·턱·어깨·엉덩이·무릎·발바닥)이 어긋나서 모델링에 쓸 수 없습니다. 어긋나면 다시 생성하거나 알려 주세요(제가 정렬을 보정합니다).
- 얼굴·옷이 시트마다 바뀌면(AI의 흔한 문제) 기준 이미지를 매번 첨부하고 첫 이미지 결과를 다시 첨부해서 "이 캐릭터와 같게"를 반복해 주세요.

---

## 6. 앱 쪽 제약(결과물의 품질 기준)

| 항목 | 기준 |
|---|---|
| 한 화면에 보이는 인원 | 최대 약 80명 → 멀리 있는 사람은 단순화(LOD) |
| 삼각형 수 | 내 캐릭터 약 8,000 / 가까운 사람 약 4,000 / 먼 사람 약 1,500 |
| 텍스처 | 캐릭터당 1024px 1~2장(WebP/KTX2), 군중은 512px |
| 용량 | 캐릭터 1개 약 0.3~0.8MB(압축 후). 앱 전체 20MB대 유지가 목표 |
| 뼈대 | 휴머노이드(Mixamo 호환 이름), 손가락 뼈 포함(합장·묵주용) |
| 형식 | glb(meshopt/Draco 압축) |

---

## 7. 받으면 제가 하는 일

1. 이미지 정렬 검사(스케일·정렬선), 모자란 이미지 목록 다시 안내
2. (§9 방식에 따라) 모델 변환·최적화·LOD 생성 스크립트와 앱의 아바타 로더(three.js GLTFLoader) 교체
3. 걷기·앉기·무릎 꿇기·기도·인사·성호·촛불 동작을 새 뼈대에 맞춰 이식, 기존 세례명·이름표·좌석 위치(의자 재설계 포함)와 정합
4. 아바타 편집 화면을 새 옵션(머리 모양·머리색·옷·피부색)에 맞게 조정, 저장된 기존 아바타를 가장 가까운 새 옵션으로 이전
5. 성능·용량 측정, 전후 스크린샷

---

## 8. 현재 앱의 옵션 수(참고)

성별 2, 머리 모양 4종, 머리색·피부색 팔레트, 옷 여러 벌(코드로 그린 단순 형태). 새 캐릭터에서 몇 가지를 지원할지는 §9 결정에 따라 달라집니다.

---

## 9. 결정이 필요한 것 — 3D로 만드는 방법

| 방법 | 설명 | 장점 | 한계 |
|---|---|---|---|
| **1. 이미지→3D 서비스(Meshy·Tripo·Rodin 등) + Mixamo** | 위 이미지를 서비스에 넣어 메시를 만들고, Mixamo(Adobe 계정, 사용자가 직접 업로드)로 뼈대·동작을 붙임. 제가 최적화·로더·동작 정합을 맡음 | 지금 이미지와 가장 비슷한 결과, 비용 낮음 | 옷·머리를 분리한 조합 선택은 어려움(옷 1벌 = 캐릭터 1개 단위가 현실적). 서비스 약관(상업 이용) 확인 필요 |
| **2. 3D 아티스트에게 의뢰** | 이 문서의 이미지를 작업 지시서로 사용 | 옷·머리 조합 자유, 품질 최고 | 비용·시간 |
| **3. 코드로 계속 모델링(현재 방식)** | 제가 지금처럼 도형·뼈대를 코드로 그림 | 외부 도구 불필요, 용량 최소 | 이 이미지만큼 사실적인 얼굴·천 질감은 한계 |

제 추천: **1번으로 기본 캐릭터(여/남 각 옷 3~4벌)를 만들고, 머리색·피부색은 색조(틴트)로 바꾸는 구성**. 머리 모양 전체 조합은 2번으로 확장할 때 고려.
