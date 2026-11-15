# 창 시안 요청문 묶음 (ChatGPT 이미지 생성용)

`docs/church/GLASS_ALL_CHURCHES_PLAN.md` 의 "③ 시안 필요" 창을 사용자가 ChatGPT 로 만들 때 쓰는 요청문이다. 밀라노 55종(`art/glass_milan55/`)과 **같은 약속**을 따른다.

- 결과물은 **개발용 임시 AI 시안**이다. 실제 작품의 복원·모사가 아니다(`kind: "AI_generated_prototype"`, `historical_window_id: null`, `restoration_verified: false`, `release_approved: false`). 배포판 APK 에 넣지 않는다.
- **창 하나 = PNG 한 장**(시트에서 잘라 내지 않는다 — 밀라노 004~055 는 시트에서 잘라 65×345px 밖에 안 됐다). 배경은 완전 투명, 창 윤곽 밖도 투명. 돌 창틀·벽은 그리지 않는다(모델이 창틀을 짓는다). 납선은 그린다.
- 캔버스는 세로 창 `1024×1536`, 둥근 창 `1024×1024`, 가로 창 `1536×1024`. 창은 캔버스 가운데에 **표의 비율(가로/세로)** 로 꽉 차게. 받은 뒤 윤곽 상자로 잘라 저장한다(ChatGPT 가 코드 도구를 쓸 수 있으면 직접 자르고 zip 으로 묶게 한다).
- 한 번에 4~6장씩 요청한다(각 문서의 "묶음"이 한 번의 요청). 같은 묶음 안에서 그림체를 맞춘다.
- 실존 20세기 작가(하이날, 이남규 등)의 작품·화풍을 흉내 내라고 요청하지 않는다. 글자·서명·연도·문장(紋章)은 넣지 않는다.
- 받은 파일은 `art/glass_dev/<church>/`(번들 밖)에 `textures/<ID>.png` + `manifest.json` 으로 둔다. `manifest.json` 한 행:

```json
{ "id": "FLO-DEV-001", "texture_file": "textures/FLO-DEV-001.png", "width": 0, "height": 0,
  "church": "florence", "bundle": "florence-A", "slot_group": "facade_side_oculus",
  "target_aspect_w_over_h": 1.0, "subject_hint": "enthroned deacon saint with four angels",
  "kind": "AI_generated_prototype", "historical_window_id": null,
  "restoration_verified": false, "release_approved": false, "notes": "" }
```

| 문서 | 성당 | 묶음 | 장수 |
|---|---|---|---|
| `florence.md` | 피렌체 두오모 | A 정면 오큘러스 1 · B 측랑 이련창 4(선택) · C 트리부나 경당 15 · D 트리부나 윗창 15 | 31 (+4) |
| `myeongdong.md` | 명동대성당 | A 후진 5 · B 익랑 2 · C 무늬창 4 | 11 |
| `maggiore.md` | 산타 마리아 마조레 | A 장미창 1(비모사, 선택) | 0~1 |
| `basic.md` | 우리 본당(가상) | A 측면 10 · B 장미창 2 + 반원창 1 | 13 |

성 베드로·라테라노·성 바오로는 그림 유리가 없어 요청문이 없다(무색 격자·설화석고는 코드로 만드는 절차적 텍스처, 계획서 §8.3).
