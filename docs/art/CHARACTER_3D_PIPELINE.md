# 새 캐릭터 3D 제작 절차 (방식 1: 이미지→3D 서비스 + Mixamo)

역할 분담: **이미지·3D 변환·Mixamo 업로드는 사용자**, **최적화·앱 로더·동작 이식·화면 연결은 Claude**.
이미지 규격과 프롬프트는 `CHARACTER_IMAGE_PROMPTS.md` 참고.

---

## 1. 만들 캐릭터 단위

방식 1은 "옷을 입은 완성 캐릭터 1개 = glb 1개"가 현실적입니다.

| 1차 목표(최소) | 수량 |
|---|---|
| 여성 기본 캐릭터(올려 주신 이미지) | 1 |
| 남성 기본 캐릭터(올려 주신 이미지) | 1 |
| 옷 변형(여성/남성 각 2~3벌 추가) | 4~6 |
| 머리색·피부색 | 앱에서 색조(틴트)로 변경(§6) |

머리 모양은 1차에서는 옷과 함께 모델에 포함된 한 가지입니다(모양 선택은 3D 아티스트 의뢰 단계에서 확장).

---

## 2. 이미지→3D 서비스에서 만들 때(사용자)

서비스 후보: Meshy, Tripo, Rodin(Hyper3D), Hunyuan3D 등(상업 이용 약관을 꼭 확인하세요. 유료 플랜이어야 상업 이용 가능한 경우가 많습니다).

1. 입력: **정면·측면·후면이 있는 3뷰 이미지**(다중 뷰 입력을 지원하는 모드 사용). 단일 이미지만 받으면 정면 이미지를 쓰되 뒷면이 부정확해질 수 있습니다.
2. 자세: **A포즈(팔 벌림)** 로 생성. 팔이 몸에 붙으면 Mixamo 리깅이 실패합니다.
3. 옵션: PBR 텍스처 켬, 해상도 2k 텍스처, 메시는 **쿼드/로우폴리 옵션이 있으면 켜고 면 수 10~30k 정도**(이후 제가 줄입니다).
4. 출력: **FBX 또는 OBJ+텍스처(압축 zip)** (Mixamo 입력용). glb도 같이 받아 두세요.
5. 확인: 손가락이 서로 붙지 않았는지, 팔과 몸통 사이가 벌어져 있는지, 치마가 다리를 감싸고 있지 않은지.

**주의 — 넓은 긴 치마**: 다리 동작을 하면 치마가 다리에 박히거나 늘어납니다. 여성 캐릭터는 **치마폭이 좁은 옷, 바지, 무릎 아래 길이**를 우선 쓰고, 올려 주신 긴 치마(폭 넓음)는 걷기·앉기에서 어색할 수 있어 별도로 확인합니다.

---

## 3. Mixamo에서 뼈대·동작 붙이기(사용자, Adobe 계정)

1. mixamo.com → Upload Character → 위에서 만든 FBX/OBJ(zip) 업로드.
2. 자동 리깅 마커(턱·손목·팔꿈치·무릎·사타구니)를 위치에 맞게 놓기. **Skeleton LOD = "Standard Skeleton (65 joints)"**(손가락 포함; 합장·묵주에 필요).
3. 아래 동작을 골라 내려받기(이름이 정확히 같지 않아도 비슷한 것):

| 필요 동작 | Mixamo에서 찾을 이름 예 | 옵션 |
|---|---|---|
| 서 있기 | Idle (차분한 것) | |
| 걷기 | Walking / Walk (Standing 계열) | **In Place 켬** |
| 앉기/일어나기 | Stand To Sit, Sit To Stand | |
| 앉아 있기 | Sitting Idle | |
| 서서 기도 | Praying / Pray(합장 계열) | |
| 무릎 꿇기 | Kneeling Down(또는 Stand To Kneel), Kneeling Idle, Kneel To Stand | |
| 인사(절) | Quick Formal Bow / Bow | |
| 손 흔들기 | Waving / Standing Greeting | |

십자성호·촛불 봉헌은 Mixamo에 없으므로 **제가 뼈 회전으로 직접 만듭니다.**

4. **내려받기 설정**
   - 캐릭터 본체: 포맷 **FBX Binary(.fbx)**, 포즈 **T-pose**, **With Skin**(한 번만).
   - 동작들: 포맷 **FBX Binary**, **Without Skin**, Frames per second **30**, Keyframe Reduction **none**, In Place는 걷기 등 이동 동작에만 켬.
5. 파일명: `F01_cardigan_skirt.fbx`(캐릭터), `anim_walk.fbx`, `anim_idle.fbx` 처럼 알아볼 수 있게.

---

## 4. 저에게 전달할 때

압축 파일 하나로 아래 구성(이 대화에 올리거나, 용량이 크면 알려 주세요). **폴더 이름이 곧 CLI 규약**입니다(`avatar_glb.mjs all`, §8).

```
character_pack/
  F01_cardigan_skirt/          ← 폴더 이름 앞부분(F01)이 캐릭터 id(영문·숫자 1~24자). F=여성, M=남성
    F01_cardigan_skirt.fbx     ← Mixamo 'With Skin' T-pose FBX (텍스처 포함 또는 옆에 png/jpg)
    service.glb                ← (선택) 이미지→3D 서비스가 준 원본 glb. FBX 에 텍스처가 빠졌을 때 여기서 가져온다
    tint_mask.png              ← (선택) 원본 텍스처와 같은 UV 의 마스크: 빨강(R)=피부, 초록(G)=머리, 나머지 검정
  M01_blazer_trousers/
  anim/                        ← 동작 FBX(Without Skin). 남녀 동작을 따로 받았으면 anim_F/, anim_M/
    Idle.fbx  Walking.fbx  Stand To Sit.fbx  Sitting Idle.fbx  Sit To Stand.fbx  Praying.fbx ...
```

- 동작 파일 이름은 Mixamo 가 붙여 주는 이름 그대로 두어도 됩니다(§9 표로 자동 매핑). 애매하면 `anim_<정규이름>.fbx`(예: `anim_kneel_idle.fbx`).
- 재질(머티리얼) 이름에 `skin` / `hair` 가 들어가면 그 재질이 피부색·머리색 틴트 슬롯이 됩니다. 서비스가 한 장 텍스처로 구워 주면 `tint_mask.png` 가 있어야 머리색·피부색을 바꿀 수 있습니다(§6).

## 5. Claude가 하는 일(준비·구현)

1. **최적화 도구**: FBX/glb → glb 변환, 면 수 줄이기(본/LOD 3단계), 텍스처 WebP 1024/512, meshopt 압축, 뼈 이름·개수 검증, 크기·삼각형 수 리포트.
2. **앱 로더**(three.js, 성당 WebView): glb 캐릭터 로드, 뼈대 공유, 동작 클립을 기존 상태(걷기·앉기·기도·무릎 꿇기·인사·성호·촛불)로 연결, 내 캐릭터 고해상도·군중 저해상도(LOD), 기존 코드 아바타는 불러오기 실패 시 대체로 유지.
3. **좌석 정합**: 신자석 의자 재설계·무릎 받침과 앉기·무릎 꿇기 자세 위치 맞춤.
4. **편집 화면**: 성별·옷·머리색·피부색 선택, 기존 저장된 아바타를 가장 가까운 새 옵션으로 이전.
5. **용량·성능**: APK 20MB대 목표를 지키기 위해 캐릭터 총합 상한을 두고, 측정한 값을 보고합니다.

---

## 6. 머리색·피부색 변경(색조)

- **피부색**: 피부 재질을 따로 두면 색조 곱으로 바꿀 수 있습니다. 서비스가 한 장의 텍스처로 주면 **피부 마스크**(피부 부분 흰색)로 같은 효과를 냅니다.
- **머리색**: 머리 마스크가 있으면 색조 변경, 없으면 머리색은 모델에 고정(1차에서는 허용).
- 마스크는 제가 UV 기준으로 만들 수 있습니다(머리·피부 영역 자동 분할은 불완전할 수 있어 확인이 필요).

---

## 7. 용량 한도(제안)

| 항목 | 상한 |
|---|---|
| 캐릭터 1개(압축 후) | 0.8MB |
| 기본 캐릭터 여/남 + 옷 4벌 | 약 5MB |
| 동작 클립 전체 | 약 0.5MB |

현재 APK는 약 25MB이므로 20MB 미만 목표를 지키려면 캐릭터 옷 변형 수와 텍스처 크기를 조정해야 합니다. 그 균형은 변환 후 실제 용량을 보고 정합니다.

---

## 8. 변환·최적화 CLI (`tools/avatar_glb/`, Claude 또는 개발자가 실행)

준비: `cd tools/avatar_glb && npm install` (gltf-transform 4.5.1, meshoptimizer 1.3.0, sharp, three 0.149.0 = `assets/church/three.min.js` 와 같은 판, fbx2gltf 0.9.7-p1, esbuild). `--via three`·`runtime_check.mjs` 는 Playwright(chromium)가 더 필요하다(tools/church_web 시험과 같은 전역 설치).

| 명령 | 하는 일 |
|---|---|
| `node tools/avatar_glb/avatar_glb.mjs all character_pack [--out tools/avatar_glb/out]` | §4 폴더를 통째로: 캐릭터 폴더마다 `character`, `anim*/` 마다 `anims`. 보고서 출력, 하나라도 검증 실패면 종료 코드 1 |
| `… character <캐릭터.fbx\|glb> --id F01 [-o out/F01.glb] [--tex 1024] [--lods 8000,4000,1500] [--mat 원래재질=skin,머리재질=hair] [--textures service.glb] [--mask tint_mask.png] [--via fbx2gltf\|three] [--no-meshopt]` | 캐릭터 1개 → `F01.glb` |
| `… anims <동작.fbx\|폴더 ...> [-o out/anims.glb] [--name 정규이름=파일 ...]` | 동작 여러 개 → 뼈대 1벌 + 정규 이름 클립 묶음(메시 없음) |
| `… validate <glb ...> [--json]` / `… inspect <glb>` | 검증만(필수 뼈, 본 ≤65, LOD 삼각형, 0.8MB, 텍스처 ≤1024·WebP, 키 1.3~2.2m, 필수/권장 동작) |
| `… pack <glb> --id F01 [--out dir]` | `apack_F01.js` (`window.ChurchAvatarPack['F01']='<base64>'`) — file:// WebView 용 `<script>` 데이터 팩(글라스 `gpack_*` 와 같은 방식) |
| `… convert <in.fbx> [-o out.glb] [--via …]` | FBX → glb 변환만(문제 확인용) |
| `node tools/avatar_glb/build_loader.mjs [--install]` | `dist/three_glb.js`(three r149 GLTFLoader + meshopt 디코더, 69KB / gzip 20KB). `--install` 은 앱 연결 단계에서만 `assets/church/three_glb.js` 로 복사 |
| `node tools/avatar_glb/make_standin.mjs [폴더]` | 스탠드인 character_pack(§11) |
| `node --test tools/avatar_glb/avatar_glb.test.mjs` | CLI 로직 시험(규칙 + 스탠드인 엔드투엔드, 약 5초) |
| `node tools/avatar_glb/runtime_check.mjs [--shots 폴더] [--samba X.fbx]` | 런타임 시험(Playwright + SwiftShader, 약 1분): 로드·애니메이션·LOD·틴트·포즈 공유·dispose·80명 군중 비용·스크린샷 |

산출물(`out/`, `work/`, `dist/`, `*.fbx`)은 `.gitignore` 로 커밋하지 않는다. 앱 번들에는 **검증을 통과한 실제 캐릭터의 `apack_*.js` 만** 넣는다(스탠드인·시험 모델 금지).

### 8.1 character 처리 순서
1. **FBX → glb**: 기본 `fbx2gltf`(npm 패키지에 든 Autodesk FBX SDK 기반 바이너리; Linux/Windows x64, macOS 는 x86_64 바이너리라 Apple Silicon 은 Rosetta). 30fps 로 굽는다. 대안 `--via three`: Playwright chromium 안에서 three r149 `FBXLoader` → `GLTFExporter`(바이너리를 못 쓰는 환경용). 실제 Mixamo FBX(three.js 예제 'Samba Dancing', X Bot 뼈대 67관절·55k 삼각형)로 두 방식 모두 확인: 키·Hips·허벅지·종아리 수치가 같고 런타임 포즈가 같다(서로의 동작 묶음도 바꿔 쓸 수 있음). Blender 는 이 샌드박스에 없어 쓰지 않았다(쓸 경우 glb 로 내보내면 `character` 가 그대로 받는다).
2. **뼈 이름 정규화**(§9.2), **단위 굽기**: 뼈대 위 노드의 균일 스케일(Mixamo FBX 의 cm → Armature 0.01)을 정점·뼈 이동·IBM·이동 트랙에 구워 미터 단위·스케일 1 로.
3. 같은 관절의 스킨 합치기, **스킨 없는 메시 버림**(경고), 재질 이름 바꾸기(`--mat`), 텍스처 없는 재질에 `--textures` glb 의 baseColor 붙이기.
4. 재질별로 프리미티브 합치기, 쓰지 않는 속성 버림(POSITION·NORMAL·TEXCOORD_0·JOINTS_0·WEIGHTS_0 만), **무게 없는 관절을 스킨에서 뺌**(Mixamo 65 → 보통 52; 노드는 남아 동작 트랙 대상이 된다).
5. 휴식 자세 기준 **좌석 수치**(`scene.extras.rosary`: 키, Hips 높이, 고관절 높이, 허벅지·종아리 길이, 앉을 때 고관절 아래 살 두께 `seatDrop`, 무릎 앞 두께 `kneeFront`, 발목 높이)와 **틴트 기준색**(`tintRef`, 피부·머리 평균색) 기록.
6. **LOD 3단계**(meshoptimizer `simplify`, 오차 한도를 늘려 가며, 안 되면 `simplifySloppy`): 노드 `LOD0`/`LOD1`/`LOD2`, 같은 스킨을 공유.
7. 텍스처 긴 변 1024(`--tex`)·**WebP**(q82), **meshopt 압축**(EXT_meshopt_compression + 양자화), 틴트 마스크는 512 WebP 로 쓰지 않는 재질 `__tintmask` 에 싣는다.

### 8.2 anims 처리 순서
파일 이름(없으면 테이크 이름)으로 정규 이름 결정(§9.1) → 뼈 이름 정규화·단위 굽기 → **스케일 트랙·Hips 밖 이동 트랙 제거**(뼈 길이가 다른 캐릭터끼리 같은 클립을 쓰도록) → Mixamo 65(+눈) 밖 뼈 트랙 제거 → **루트 모션 정리**(반복 동작은 Hips 수평 이동의 시작~끝 경향을 빼 제자리로, 전환 동작은 첫 프레임 기준) → 첫 파일 뼈대에 클립을 이름으로 옮겨 붙임(휴식 자세가 10° 넘게 다르면 경고: 다른 캐릭터로 받은 동작) → resample·meshopt. 걷기는 발이 땅에 닿은 동안의 속도로 **걸음 속도(m/s)** 를 재어 `extras.rosary.clips.walk.speed` 에 둔다(런타임이 이동 속도에 맞춰 재생 속도 조절).

## 9. 이름 규칙

### 9.1 Mixamo 동작 → 앱 정규 이름

| 정규 이름 | 필수 | 반복 | 자동 매핑되는 Mixamo 이름(대소문자 무시, 위에서부터 먼저 맞는 것) | 없을 때 런타임 |
|---|---|---|---|---|
| `idle` | ● | ● | Idle, Breathing Idle | — |
| `walk` | ● | ● | Walking, Walk, Female Walk … (In Place 켬 권장; 꺼져 있으면 제거하고 경고) | — |
| `sit_down` | ● | | Stand To Sit, Standing To Sitting, Sit Down | — |
| `sit_idle` | ● | ● | Sitting Idle, Sitting (… sit 이 들어간 나머지) | — |
| `stand_up` | ● | | Sit To Stand, Sitting To Standing, Stand Up, Getting Up | — |
| `pray` | | ● | Praying, Pray … | 절차: 두 손을 가슴 앞에 모음(무릎 꿇으면 앞 등받이 윗단) |
| `kneel_down` | | | Standing To Kneeling, Kneeling Down | 절차: 다리 IK(0.7초). 지금 런타임은 클립이 있어도 IK 전환을 쓴다(앉은 자리→무릎틀 정합 우선; 실제 동작을 보고 결정) |
| `kneel_idle` | | ● | Kneeling Idle (… kneel 이 들어간 나머지) | 절차: `sit_idle` 윗몸 + 다리 IK |
| `kneel_up` | | | Kneeling To Standing, Kneel Up | 절차(위와 같음) |
| `bow` | | | Bow, Quick Formal Bow | 절차: 허리·목 숙이기(앉아 있을 때는 항상 절차) |
| `wave` | | | Waving, Standing Greeting, Hello | 절차: 오른팔 IK + 손 흔들기 |

`anim_<정규이름>.fbx` 처럼 정규 이름을 파일 이름에 쓰면 그대로 받는다. `--name 정규이름=파일` 로 강제할 수 있다. 십자성호·촛불 봉헌은 Mixamo 에 없으므로 항상 절차 오버레이(§10).

### 9.2 뼈 이름
- 접두 제거: `mixamorig:Hips`, `mixamorig1:Hips`(여러 캐릭터를 한 번에 올리면 숫자가 붙음), `mixamorig_Hips`, `mixamorigHips`(three FBXLoader 가 `:` 를 지운 것) → `Hips`. Blender 를 거친 `Armature|mixamorig:Hips`, `LeftArm.001` 도 정리. 그 밖의 이름은 그대로.
- 필수 뼈(52, 정규화 뒤): Hips, Spine, Spine1, Spine2, Neck, Head, 좌우 Shoulder/Arm/ForeArm/Hand/UpLeg/Leg/Foot/ToeBase, **좌우 손가락 5개 × 1~3 마디**. 손가락이 없으면(Mixamo 'No Fingers' 25관절) 거부 — 합장·성호·묵주에 필요.
- 스킨 본 ≤ 65(Mixamo Standard Skeleton). 끝 뼈(`*_End`, `*4`)와 눈은 무게가 없어 스킨에서 빠진다.

## 10. 런타임 (`assets/church/avatar_glb.js`, 아직 index.html 에 연결하지 않음)

- 필요: 전역 `THREE`(r149), `window.ThreeGLB`(build_loader). 선택: `ChurchPalette`(틴트 색), `ChurchAvatar`(이름표 재질·cfg 정규화·적재 실패 시 옛 아바타로 대체), `ChurchLabelFit`.
- 적재: `<script src="apack_F01.js">` 들 → `ChurchGlb.load('F01')`, `ChurchGlb.loadAnims('anims')`(base64 → ArrayBuffer → GLTFLoader.parse, 끝나면 base64 문자열을 놓는다). http(s) 시험에서는 `load(id, {url})`.
- `ChurchGlb.setCatalog({F:['F01','F02'], M:['M01'], anims:{F:'anims_F', M:'anims_M'}})` → `cfg.g`(성별) + `cfg.outfit % 목록 길이` 로 캐릭터를 고른다. `ChurchGlb.create(cfg, opts)` 는 적재된 glb 가 없거나 실패하면 `ChurchAvatar.Avatar` 를 돌려준다.
- 공개 API(avatar.js 와 같은 형태): `new GlbAvatar(cfg, {self, showTag, type?, anims?, seat?})`, `root`, `setConfig`, `setLod(0|1|2)`, `setWalk(0..1)`, `setSeated`, `setPray`, `setKneel(b, {fwd,y,rail})`, `kneelOffset()`, `playEmote(0 인사|1 성호|2 절|3 촛불)`, `setPose(x,y,z,yaw)`, `snapPose`, `update(dt,t)`, `tag`/`tagY`/`tagPx`, `seatLift`, `dispose`. 추가: `setSeatGeom({h, back})`, `setReach({x,y,z})`(촛불 손 목표), 전역 `ChurchGlb.tick(dt,t)`(포즈 공유 대표 갱신, 프레임마다 1번), `ChurchGlb.setView(cam, h)`, `ChurchGlb.stats()`.
- 구조: 캐릭터 종류(`CharType`) 1개당 LOD 지오메트리·재질·뼈대 틀을 모든 사람이 공유하고, 사람마다 뼈대 1벌(장면 밖 포즈 공간) + LOD 별 `SkinnedMesh`(detached bind) + `AnimationMixer` 1개. 틴트는 (피부색·머리색) 조합마다 재질 사본 1벌(참조 계수, 마지막 사용자가 놓으면 dispose). 마스크 틴트는 `onBeforeCompile` 로 프로그램 하나를 공유.
- 상태머신: 서기(idle↔walk 가중치 섞기, 걸음 속도 = `walkAmt × 3.2 m/s ÷ 클립 속도` 로 timeScale) → `sit_down`(1.0초로 맞춤) → `sit_idle` → `stand_up`(0.9초). 앉기↔무릎 꿇기는 클립 없이 다리 IK 로 0.7초 보간(avatar.js 와 같은 속도·smoothstep). 전환 클립 끝 20% 에서 다음 상태로 섞는다.
- **절차 오버레이**(클립 결과 위에 뼈 회전을 덧입힘, 뼈 로컬 축 규약에 무관한 '방향 맞추기'·2관절 IK): 좌석 정합(골반을 좌석 윗면 + `seatDrop`, 골반 0.14 뒤; 발은 바닥에 다시 디딤), 무릎 꿇기(무릎을 받침 윗면 + `kneeFront`, 허벅지 0.12rad, 정강이 뒤로 눕힘), 기도 손(클립 없을 때), 십자성호(이마 → 가슴 → 왼어깨 → 오른어깨, 손 방향까지), 촛불 봉헌(손 뻗기 + 손가락 쥐기), 인사·절(클립 없을 때). 오버레이는 매 프레임 지운 뒤 다시 계산한다(믹서 출력 포즈를 저장해 두고 되돌림 — r149 PropertyMixer 는 값이 바뀌지 않은 트랙을 다시 쓰지 않기 때문).
- 군중 비용: LOD1 은 2프레임, LOD2 는 4프레임마다 갱신(아바타마다 엇갈리게, `CFG.lodEvery`). `CFG.sharePose`(기본 켬)면 LOD2 는 같은 (캐릭터·동작 묶음·상태·좌석/무릎 자리) 끼리 머리 없는 대표 1명의 뼈대를 공유 → 먼 사람은 믹서 0개.
- 좌석 기하는 파라미터: `CFG.seat {h 0.45, back 0.14}`, `CFG.kneel {fwd 1.22, y 0.145, rail}` 기본값은 `ChurchLogic.PEW`·`kneelSpot` 과 같다. 연결할 때는 `setKneel(true, logic.kneelSpot(seatId))`, 의자 재설계 값이 바뀌면 `setSeatGeom`.

## 11. 스탠드인과 시험 결과(실제 에셋 없이 확인한 것)

- 스탠드인(`make_standin.mjs`): Mixamo 65관절과 같은 이름·계층(`mixamorig:` 접두, Armature 0.01 + cm 뼈대, 뼈 로컬 +Y 가 자식 쪽, 앞 +Z, T 포즈), 테이퍼 캡슐 휴머노이드 10,160 삼각형, 텍스처 1024 PNG 1장. 두 배치: `S01`(재질 skin/hair/cloth 3개), `S02`(재질 1개 + `tint_mask.png`). 동작 5개(Idle, Walking(In Place 꺼짐), Stand To Sit, Sitting Idle, Sit To Stand).
- CLI 결과: S01 LOD 7,501 / 3,999 / 1,497 삼각형, 스킨 본 52, 163KB(gzip 92KB), 키 1.84m. anims(5클립) 63KB(gzip 13KB), 걷기 원본 Hips 이동 1.43m 감지·제거, 걸음 속도 1.95m/s. 실제 Mixamo(X Bot, 55k 삼각형) → LOD 7,998 / 3,998 / 1,516, 244KB(텍스처 없음).
- 런타임(SwiftShader): 로드·틴트(재질 슬롯 4색, 마스크 프로그램 공유)·걷기·앉기 정합(골반 0.669m = 좌석 0.45 + 살 0.169 + 0.05)·무릎 꿇기(무릎 0.55m 앞)·LOD·포즈 공유(20명 → 대표 2명, 상태가 바뀌면 3명, 해제 후 0)·dispose(아바타 해제 시 뼈 텍스처·재질 사본 회수, 종류 해제 시 지오메트리 18개 모두 dispose)·페이지 오류 없음. 스크린샷은 `--shots` 폴더.
- 80명 군중(내 1 + LOD0 15 + LOD1 24 + LOD2 40, 앉음·기도·걷기 섞음, 3회 중앙값): 코드 아바타 대비 프레임 약 1.35배(삼각형 2.1배: 276k vs 129k, 그리기 호출 300 vs 180), 갱신 CPU 약 3.6배(80명 3.1ms vs 0.9ms, 데스크톱). 실제 기기 값은 연결 뒤 다시 잰다.

## 12. 사용자 입력 체크리스트

- [ ] 서비스 상업 이용 가능한 플랜·약관 확인(Meshy/Tripo/Rodin/Hunyuan3D 등), Mixamo(Adobe 계정) 약관 확인
- [ ] 캐릭터마다: A포즈 3뷰 이미지로 생성, 손가락 분리, 팔·몸통 사이 틈, 치마는 좁고 무릎 아래 길이(§2)
- [ ] Mixamo 업로드 시 **Standard Skeleton (65 joints)**, 마커 위치 확인
- [ ] 캐릭터 본체 FBX: **FBX Binary, T-pose, With Skin**(캐릭터마다 1번)
- [ ] 동작 FBX: **FBX Binary, Without Skin, 30fps, Keyframe Reduction none**, 걷기는 **In Place 켬**. 필수 5개(Idle, Walking, Stand To Sit, Sitting Idle, Sit To Stand), 권장 6개(Praying, Standing To Kneeling, Kneeling Idle, Kneeling To Standing, Bow, Waving)
- [ ] 남녀 체형이 많이 다르면 동작을 각 성별 대표 캐릭터로 따로 받아 `anim_F/`, `anim_M/`
- [ ] 머리색·피부색을 바꾸려면: 피부·머리 재질 이름에 `skin`/`hair`, 또는 `tint_mask.png`(빨강 피부, 초록 머리)
- [ ] 서비스 원본 glb 를 `service.glb` 로 같이(텍스처 복구용)
- [ ] §4 폴더 구성으로 zip 하나

## 13. 한계·리스크

- **넓은 치마**: Mixamo 자동 리깅은 치마를 다리 뼈에 나눠 묶어 걷기·앉기에서 치마가 갈라지거나 다리에 박힌다. 치마 뼈·물리 없음. 좁은 치마·바지·무릎 아래 길이를 우선, 넓은 치마는 3D 아티스트 리깅(치마 뼈) 단계로.
- **머리색 틴트**: 곱셈 틴트라 원래 머리가 진하면(검정) 밝은 색(금발·흰머리)으로 못 바꾼다. 원본 머리를 중간 밝기(밝은 갈색·회색)로 만들거나 머리를 별도 재질로. 마스크 경계는 텍스처 해상도(1024)만큼 번질 수 있다.
- **손가락**: 서비스 메시의 손가락이 붙어 있으면 Mixamo 가 손가락 무게를 섞어 합장·성호·촛불의 손 모양이 뭉개진다. 손가락 IK 는 굽힘 정도만(엄지 제외).
- **절차 오버레이와 체형**: 목표점은 키 비율로만 맞춘다. 배·가슴이 큰 체형은 기도 손·성호 손이 몸에 박힐 수 있어 캐릭터별 오프셋이 필요할 수 있다.
- **동작 공유**: 클립은 Hips 이동만 키 비율로 맞춘다. 체형 차이가 크면 손이 몸을 뚫거나 발이 미끄러진다 → 성별별 동작 묶음 권장.
- **성능**: 갱신 CPU 가 코드 아바타의 약 3.6배. 기기 측정 뒤 `CFG.lodEvery` 를 [1,3,6] 처럼 늘리거나 LOD1 도 포즈 공유로 넓힐 수 있다. LOD2 1.5k 삼각형도 코드 아바타 임포스터(판 몇 장)보다 무겁다.
- **용량**: 캐릭터 1개 0.8MB 상한이면 여/남 기본 + 옷 4벌 ≈ 2~5MB(텍스처 크기에 따라). APK 20MB대 목표를 지키려면 텍스처 512 또는 옷 변형 수를 줄여야 할 수 있다.
