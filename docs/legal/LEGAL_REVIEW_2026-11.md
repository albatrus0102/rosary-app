# 로사리움 출시 전 권리·법률 검토 (로드맵 T-32 + 관련 자산 항목)

- 작성일: 2026-11-16 · 작성: 개발(Claude) · 대상: Android 첫 배포판(Google Play, 한국 먼저)
- 전제: 개인 개발자(대한민국), **완전 비상업**(광고·결제·후원 없음, `docs/BACKLOG.md` 「결정(2026-11-15)」)
- 관련 로드맵: T-32(사진·그림 권리), T-18(프레비아티), T-30(이름·상표), T-33(기도문·AI 이미지), T-39·T-69(당고개·권리 허락), T-68(CC BY-SA), T-38(개인정보·스토어 문서)
- **이 문서는 조사·정리이며 법률 자문이 아닙니다.** 결론마다 근거(법령·공식 약관 URL)를 달았고, 직접 열어 확인하지 못한 것은 〔미확인〕, 전문가 판단이 필요한 것은 〔변호사 확인〕, 권리자 답이 필요한 것은 〔권리자 확인〕으로 표시했습니다.
- 확인 표기: 「확인 2026-11-16」= 이번 검토에서 해당 페이지를 직접 열어 읽음. 「검색 발췌」= 검색 결과 요약으로만 확인(원문 미열람).

---

## 요약

### 상위 위험 5가지

| 순위 | 위험 | 등급 | 한 줄 결론 |
|---|---|---|---|
| 1 | **주교회의 기도문 게재 승인 미취득** (+ 2023 규정 제8조가 "AI 서비스·애플리케이션 제작"에 협의회 저작물 사용을 금지) | 높음 | 앱의 핵심 기능. 승인 전에는 공개 배포하지 않는다(이미 정한 방침 유지). 음성만 거절될 대비책 있음. §8 |
| 2 | **선창 음성 62개(ElevenLabs)의 생성 플랜이 기록에 없음.** 무료 플랜이면 "비상업만" + 게시 시 `elevenlabs.io` 표기 의무, 목소리 2개는 기본 음성이 아님(출처 미확인) | 높음(확인 전) | 사용자가 결제 내역으로 플랜을 확인해야 한다. 유료였으면 기록만 남기면 끝, 무료였으면 유료로 다시 만들거나 표기를 더하거나 기기 음성으로 대체. §7 |
| 3 | **앱 런처 아이콘이 Flutter 기본 로고**(Google 상표)다 | 높음(수정은 쉬움) | 출시 전에 반드시 자체 아이콘으로 바꾼다. §10 |
| 4 | **이탈리아·바티칸 소장품 이미지**: 프레비아티 14처(바티칸 박물관 소장, 박물관은 방문자 촬영을 "개인·가정 용도"로만 허용), 라파엘로 〈거룩한 변모〉(바티칸), 이탈리아 국립·시립 미술관 소장 기도 배경 6점 | 중간 | 이탈리아법 108조 3-bis 의 비영리 자유 이용에 들어갈 가능성이 높고 한국에서 집행될 가능성은 낮다. 다만 가톨릭 앱으로서 바티칸 박물관에 문의하고, 답이 없으면 프레비아티를 다른 연작으로 바꾸는 것을 권장. §1·§2 |
| 5 | **당고개 순교성지 3D 모형**: 2011년 건물(설계자 미확인). 한국 판례는 실제 공간을 3D 가상공간으로 옮기는 것을 '복제'가 아닌 **2차적저작물 작성**으로 보아 저작권법 제35조 제2항(개방된 장소의 미술저작물 자유 이용)을 적용하지 않았다 | 중간 | 지금처럼 동의 전에는 배포판에서 닫아 둔다. 동의 요청서에 '설계자 권리' 질문과 동의 범위를 보강해야 한다. §5 |

그 밖에 출시 전에 처리할 것: 묵주 그림 24장의 출처 미기록(§0 표 A13), three.js·meshoptimizer MIT 전문이 라이선스 화면에 없음(§9), Meshy 약관의 'AI 식별 표지 제거 금지' 조항(§6), 밀라노 창 사진 1점의 원작 미특정(§4).

### 출시 전 필수 목록 (must-do)

진행 표시(2026-11-16): ☑ 개발 몫 완료 · ◐ 개발 몫 완료/준비, 사용자·외부 단계 남음.
- M4 ☑ — three.js·meshoptimizer·esbuild MIT 전문 등록, 시험 추가.
- M5 ◐ — 출처 조사·기록 완료(출처 미확인), 사용자 확인과 교체 결정 남음. 3D 렌더 대체 프로토타입은 품질 미달이라 적용하지 않음.
- M6 ◐ — 요청서 보강 완료(설계자 권리·동의 범위·성모상 정정). 발송은 사용자.
- M8 ◐ — 문의서 영·한 초안과 대안 실행 절차 준비. 발송·결정은 사용자.
- S3 ☑ — Meshy 원본 GLB 확인, 식별 표지 보존.

| # | 할 일 | 파일·위치 | 담당 |
|---|---|---|---|
| M1 | 주교회의 「저작권 사용 승인」 신청 → 승인 받은 뒤 공개 배포. 승인 문구를 앱에 반영 | `docs/legal/church_permission/01_*`, `lib/domain/prayer_data.dart`, `data/stations_prayers.json`, `lib/ui/more_screen.dart`·`lib/ui/settings_screen.dart`(`prayerSourceNote`) | 사용자(발송) → 외부(주교회의) → 개발(반영) |
| M2 | ElevenLabs 생성 당시 플랜 확인(2026-11-12 전후 결제 내역)과 두 목소리(`yeieVCpNANUQm8gq7quR`, `JL0iS7pVcKbJG6tHz7fn`)의 종류(Voice Design / Voice Library / 기본) 확인. 무료였으면 §7 의 선택지 중 하나 실행 | `assets/leader_voice/sister/*.mp3`, `assets/leader_voice/priest/*.mp3`(62개), `tools/leader_voice/manifest.json`, `lib/app/leader_voice.dart`(`aiVoiceDisclosure`) | 사용자 → 개발 |
| M3 | 런처 아이콘 교체(Flutter 로고 제거) | `android/app/src/main/res/mipmap-{mdpi,hdpi,xhdpi,xxhdpi,xxxhdpi}/ic_launcher.png` | 사용자(디자인 승인) + 개발 |
| M4 ☑ | 오픈소스 라이선스 화면에 three.js(r149, MIT)·meshoptimizer(MIT) 전문 추가 | `lib/app/licenses.dart` (대상 파일: `assets/church/three.min.js`, `assets/church/three_extras.js`, `assets/church/statue3d_mary_meshy.js`) | 개발 |
| M5 ◐ | 묵주 그림 24장 출처 확인·기록(어떤 도구로 누가 만들었는지). 실물 상품 사진을 본뜬 것이면 교체 | `assets/images/{bead,crystal,fatima,jade,jp2,knot,lourdes,pastel,pearl,penal,rosary,rosewood,stuart}.webp`, `assets/images/rosary_*.webp`(원본 `art/images_src/*.png`) | 사용자 → 개발(기록) |
| M6 ◐ | 당고개: 서면 동의 전에는 지금처럼 배포판에서 닫아 둔다. 동의 요청서 보강(§5.4) 후 발송 | `lib/church/church_select_screen.dart`(`pendingConsentIds`), `docs/legal/church_permission/02_Danggogae_consent_request.md` | 개발(문서 보강) → 사용자(발송) → 외부 |
| M7 | 출시 빌드마다 개발용 유리 제외 검사 통과 | `bash tools/check_release_apk.sh <배포 APK>` | 개발 |
| M8 ◐ | 프레비아티(바티칸 박물관 소장) 처리 결정: 바티칸 박물관 이미지·저작권 사무실(`id.musei@scv.va`)에 문의 발송, 출시 때까지 답이 없으면 성 베드로 배정을 다른 연작으로 바꿈 | `data/stations_series.json`(`assignments.stpeter`), `assets/images/stations/previati/`, `assets/church/cross_pack_previati.js` | 사용자(결정·발송) → 개발 |

권장(출시 전이면 좋음): S1 성화 출처 화면에 '이탈리아·바티칸 소장 문화재 이미지는 비상업 이용' 문구(§1.6), S2 밀라노 창 사진의 원작 특정(§4), S3 Meshy 원본 GLB 의 식별 메타데이터 확인·보존(§6), S4 AI 성모상 그림의 역이미지 검색(§6), S5 KIPRIS 상표 검색(§10), S6 세례명 목록 출처 기록(§0 표 A22), S7 명동대성당(서울대교구)에 안내 전자우편(§5).

---

## 0. 범위·방법·한계

- 저장소 기준: 이 작업 사본(브랜치 `claude/rosary-app-voice-recognition-1uzxco` 의 복사본), 커밋 `222f862`.
- 읽은 것: `docs/church/ASSET_LICENSES.md`, `docs/church/licenses/*.md`, `lib/domain/art_credits.dart`, `lib/app/licenses.dart`, `lib/glass/glass_licenses_screen.dart`, `data/stations_series.json`, `docs/ux/STATIONS_OF_CROSS.md`, `docs/church/MILAN_GLASS_RESEARCH.md`, `docs/church/GLASS_ALL_CHURCHES_PLAN.md`, `docs/church/interiors/*.md`, `art/commons_handoff/`(README·manifest), `licenses/MUSIC.md`, `licenses/MESHY_STATUE.md`, `tools/leader_voice/`(README·가이드·manifest·생성 스크립트), `pubspec.yaml`·`pubspec.lock`(pub 캐시의 LICENSE 파일로 분류), `assets/church/glass_catalog.json`, `docs/legal/`(store_disclosures, church_permission 전부), 서버 `server/church/src/room_logic.ts`(자유 글 필드 유무).
- 웹 확인: Wikimedia Commons API 로 배포 파일 41개의 라이선스 메타데이터를 확인(확인 2026-11-16). 이어서 위키텍스트를 받으려 하자 **HTTP 429(요청 제한)** 가 나서 거기서 멈췄다(재시도하지 않음). ElevenLabs 도움말 원 주소와 openai.com 약관은 **403** 으로 막혀 ElevenLabs 는 문서 미러(.md)와 약관 페이지로, OpenAI 는 검색 발췌로 대신했다. 국가법령정보센터(law.go.kr)는 조문 본문을 돌려주지 않아(오류·빈 페이지) 한국 법조문은 2차 자료와 기존 지식으로 적고 〔원문 대조 필요〕로 표시했다. KIPRIS 는 자바스크립트 화면이라 결과를 믿을 수 없었다.
- **APK 를 직접 빌드·검사하지 못했다**(이 환경에 Flutter 없음). 배포 포함 여부는 `pubspec.yaml` 의 자산 목록으로 판정했다. Flutter 의 디렉터리 자산 항목은 **그 폴더의 파일만** 넣고 하위 폴더는 넣지 않으므로 `assets/church/` 항목은 `assets/church/dev/`·`assets/church/glass_src/` 를 포함하지 않는다. `tools/build_dev_apk.sh` 는 개발용 빌드 때만 `- assets/church/dev/` 를 임시로 더했다가 되돌리고, `tools/check_release_apk.sh` 가 배포 APK 에 `assets/church/dev/`·`gpack_dev`·`devglass`·`ch_qa_`·`DEV-0NN` 파일·문자열과 Dart 의 `qa_milan55` 가 없는지 검사한다. → 설계상 개발용 자산은 배포판에서 빠진다. **실제 배포 APK 로 이 스크립트를 돌려 통과를 확인하는 것이 M7 이다.**

### 0.1 배포 APK 에 실제로 들어가는 제3자·AI 자산 목록

판정: ✅ 문제 없음 / ⚠️ 조건부·조치 필요 / ❌ 출시 전 수정 필수 / ❓ 출처 확인 필요

| # | 자산 종류 | 번들 경로 | 출처·작가 | 라이선스·권리 근거 | 앱 안 표기 | 판정 |
|---|---|---|---|---|---|---|
| A1 | 사진 질감 36장(대리석·석재·나무·벽돌·회반죽) | `assets/church/tex_pack.js`(data URI) | ambientCG, Poly Haven(Rob Tuytel 외) | CC0 | 의무 없음(표기 없음) | ✅ |
| A2 | 질감 3장: 금 모자이크·천장화·금박 부조 | `assets/church/tex_pack.js` (`tex_mosaic_gold`, `tex_fresco_dome`, `tex_gold_relief`) | Jastrow(로마 산 클레멘테 후진 모자이크 사진), Rottmayr 천장화(빈 카를스키르헤, 편집 Alberto Fernandez Fernandez), Jebulon(퐁텐블로) | Commons: Public domain / Public domain / CC0 (확인 2026-11-16) | 의무 없음 | ✅ (산 클레멘테는 이탈리아 소재 — §1 참고, 위험 낮음) |
| A3 | 환경광 HDRI | `assets/church/env_church.js` | Poly Haven `small_cathedral`(Sergej Majboroda) | CC0 | 의무 없음 | ✅ |
| A4 | 절차 생성 질감·3D 성당 모형 9곳(우리 본당, 성 베드로, 라테라노, 마조레, 성 바오로, 밀라노, 피렌체, 명동, 당고개) | `assets/church/ch_*.js`, `kit.js`, `kit_tex.js`, `liturgy.js` 등 | 자체 코드(모델링) | 자체 저작. 건물 원작의 권리는 §5 | 성당 안내 화면의 '3D 모형' 고지 | ✅ / 당고개 ⚠️(§5) |
| A5 | 스테인드글라스 사진 8점(1k 팩·먼 창 사본·섬네일) + 목록 | `assets/church/gpack_*_1k.js`(8), `gpack_far_{florence,milan,stpaul,stpeter}.js`, `glass_*_th.webp`(8), `glass_catalog.json` | Commons: Wilfredor(성 베드로 비둘기 창, CC0), Szilas(성 바오로 알라바스터 2점, **CC BY 4.0**), Richard Mortel(라벤나 알라바스터, **CC BY 2.0**), Sailko 스캔(피렌체 오큘러스 3점, PD), Van Der Meulen Christofle(밀라노, CC0) | Commons 메타데이터와 일치(확인 2026-11-16). 번들 안 38점·2k·마스터는 번들 밖 | 더보기 → 스테인드글라스 출처(CC BY 강조, 변경 사항·원본 URL·라이선스 URL) | ✅ / 밀라노 1점 ⚠️(§4) |
| A6 | 성당 안 진본 성화 사진 8장 | `assets/church/art_maggiore.js`, `art_florence.js`, `art_stpaul.js`, `art_stpeter.js` | 〈로마 백성의 구원〉(LossRom, CC0+PD-Art), 피렌체 톨렌티노·호크우드(Sailko, **CC BY 3.0**), 단테(PD-Art), 성 바오로 후진 모자이크(Alberto Fernandez Fernandez, **CC BY 2.5**), 사도 바오로 무덤(StPaul.jpg, **CC BY 4.0**), 피에타·성 베드로 청동상(Gary Todd, Public Domain Mark) | Commons 메타데이터와 일치(확인 2026-11-16) | 더보기 → 성화·음악 출처 '성당 안 성화' + OSS 화면 | ⚠️(§1·§2: 이탈리아·바티칸 소재) |
| A7 | 묵주기도 신비 배경 17장 | `assets/images/mysteries/*.webp` | 프라 안젤리코, 알베르티넬리, 혼트호르스트, 홀먼 헌트, 베로키오, 후안 데 플란데스(MET), 블로크, 라파엘로, 바우츠, 호프만, 카라바조, 피에로 델라 프란체스카, 렘브란트, 엘 그레코, 티치아노, 벨라스케스 | PD(PD-Art) 15 + CC0 2 (Commons 확인 2026-11-16) | 성화·음악 출처 + OSS 화면 | ⚠️(§1: 이탈리아 국립·시립 소장 6점, §2: 바티칸 1점) |
| A8 | 십자가의 길 기본 연작(푸겔 1921) | `assets/images/stations/station_01~14.webp`, `assets/church/cross_pack.js` | Gebhard Fugel(†1939), 사진 Andreas Praefcke | Public domain (Commons 확인) | 묵상 시트·성화 출처 | ✅ |
| A9 | 십자가의 길 연작 8개 | `assets/images/stations/{previati,oreilly,corot,hermann_paul,mosler,tiepolo,fugel_munich,fahnroth}/`, `assets/church/cross_pack_<연작>.js` | 프레비아티(사진 Sailko **CC BY 3.0**), 1897 석판화(PD), 코로(PD-Art), 헤르만 폴(CC0), 모슬러(PD), 티에폴로(Rijksmuseum CC0), 푸겔 뮌헨(PD), 판로트(PD-Art) | `data/stations_series.json` 의 `allowed_licenses` 검사, 프레비아티 파일별 URL 14개 | 묵상 시트 출처 줄 + 성화 출처(작가·촬영자·라이선스 URL·출처·변경·파일별 URL) | ✅ / 프레비아티 ⚠️(§2) |
| A10 | AI 성모상 그림 3장(색+깊이) | `assets/church/statue3d_{hanbok_rosary,immaculate_blue,plain_white}.js` | 사용자가 ChatGPT 로 생성(원본 PNG 에 C2PA 메타데이터 있음, `art/statues/*.png`) | OpenAI 약관: 출력 소유권을 사용자에게 양도(§6) | 성화 출처 'AI 생성 성모상(ChatGPT, 사용자 제공)' | ✅ / 유사성 확인 권장 ⚠️ |
| A11 | Meshy 3D 성모상 | `assets/church/statue3d_mary_meshy.js`(meshoptimizer 디코더 동봉) | Meshy AI 무료 플랜, 입력 그림은 사용자의 GPT/Gemini 그림 | Meshy 약관 3.2: 무료 플랜 출력은 **Meshy 소유, CC BY 4.0 으로 제공, Meshy 표기 조건**(확인 2026-11-16) | 성화 출처 "성모상 3D: Meshy AI로 생성(CC BY 4.0)" | ⚠️(§6: 약관 2.4 식별 표지) |
| A12 | 입구 화면 장식·대표 그림 | `assets/images/church_entry/{bg_glow,rail_decor,hero_milan,thumb_stpeter,thumb_maggiore,thumb_stpaul,thumb_milan,thumb_myeongdong}.webp` | 사용자가 올린 AI 생성 시안에서 잘라 냄(`docs/church/ENTRY_ART.md`) | 생성 도구 약관(OpenAI 추정 〔미확인〕) | 없음(의무 없음) | ✅(도구 기록 권장) |
| A13 | 묵주·구슬 그림 24장 | `assets/images/*.webp`(성당 입구 폴더 제외) | **출처 미기록**(2026-10-30 커밋, 메타데이터 없음) | 미확인 | 없음 | ❓ → M5(조사 완료, 출처 미확인) |
| A14 | 자체 3D 렌더 | `assets/images/church_entry/render_*.webp`, `assets/church_thumbs/*.webp` | 우리 3D 장면을 찍은 것(`tools/church_web/entry_shots.mjs`, `thumbs.mjs`) | 자체 | — | ✅ (당고개 그림은 §5 참고) |
| A15 | 선창·후창 AI 음성 62개 | `assets/leader_voice/sister/*.mp3`(31), `assets/leader_voice/priest/*.mp3`(31) | ElevenLabs `eleven_multilingual_v2`, 2026-11-12 생성, 목소리 ID 2개 | **플랜 미기록**. ElevenLabs 약관 1(c)·도움말(§7) | 합성 음성 안내(“AI로 합성한 음성…”) — 서비스명·`elevenlabs.io` 표기 없음 | ❓/⚠️ → M2 |
| A16 | 기도 배경 오르간 4곡 | `assets/music/organ_*.m4a` | 자체 합성(`tools/music/make_organ_tracks.py`), 선율은 그레고리오 성가(PD), 음높이는 GregoBase(CC0) | CC0(우리 것), `licenses/MUSIC.md` | 성화·음악 출처 + OSS 화면 | ✅ |
| A17 | 효과음 | `assets/sounds/*.wav` | 자체 합성(`tools/rosary3d/make_sounds.mjs`; `bead_tick`·`decade_chime` 은 2026-10-30 커밋, 합성으로 추정) | 자체 | — | ✅(옛 2개는 추정) |
| A18 | 글꼴 Pretendard 4종 | `assets/fonts/Pretendard-*.otf`, `assets/fonts/OFL-Pretendard.txt` | Kil Hyung-jin(orioncactus), v1.309, 수정 없음(글리프 14,716 확인) | SIL OFL 1.1, 예약 글꼴 이름 "Pretendard" | OSS 화면(LicenseRegistry 등록) | ✅ |
| A19 | three.js r149 + examples 번들 | `assets/church/three.min.js`, `assets/church/three_extras.js` (`assets/rosary3d/` 가 상대 경로로 같이 씀) | three.js authors | MIT(파일 머리에 저작권+SPDX 만) | **OSS 화면에 없음** | ✅ M4 완료(2026-11-16) |
| A20 | meshoptimizer 디코더 | `assets/church/statue3d_mary_meshy.js` 안 | Arseny Kapoulkine | MIT | OSS 화면에 등록 | ✅ |
| A21 | Flutter·Dart 패키지 | 앱 바이너리 | pub.dev | BSD 97, MIT 24, Apache-2.0 8, MPL-2.0 1(`dbus`, Linux 전용 전이 의존) | `showLicensePage` 가 자동 수집 | ✅ |
| A22 | 세례명 목록 3,788개 | `assets/church/baptismal_names.js`, `lib/church/baptismal_names_data.dart` (원본 `data/baptismal_names.tsv`) | **출처 미기록** | 이름(사실) 자체는 저작물 아님. 남의 목록을 통째로 옮겼다면 데이터베이스 제작자 권리 쟁점 가능 〔미확인〕 | — | ❓(낮음) → S6 |
| A23 | 공식 기도문 | `lib/domain/prayer_data.dart`, `data/stations_prayers.json`(→ Dart) | 한국천주교주교회의 『가톨릭 기도서』 | 승인 필요 | 기도문 출처 표기 | ⚠️ → M1 |
| A24 | 앱이 쓴 묵상·안내 글, 순교자 안내 | `lib/`·`assets/church/` | 자체 작성(사실만 간추려 다시 씀) | 자체 | — | ✅ |
| A25 | 런처 아이콘 | `android/app/src/main/res/mipmap-*/ic_launcher.png` | **Flutter 기본 로고**(2026-10-30 `flutter create` 그대로) | Google 상표 | — | ❌ → M3 |

배포에서 빠지는 것(확인): `assets/church/dev/`(개발용 유리 시안, `release_approved=false`), `assets/church/glass_src/`(원본 JPG), `art/`(마스터·2k·원본·Meshy 원본 GLB·커먼즈 원본), `docs/`, `tools/`. `assets/church/test.html` 은 들어가지만 제3자 자산이 아니다.

---

## 1. 이탈리아 문화유산법(D.Lgs. 42/2004 「Codice dei beni culturali e del paesaggio」) 107–108조

### 1.1 조문 (확인 2026-11-16)

- **107조 1항**: 문화부(Ministero), 주(regioni), 그 밖의 **지방 공공단체(enti pubblici territoriali)** 는 자신이 **맡아 관리하는(in consegna)** 문화재의 복제와 일시 사용을 허락할 수 있다(저작권 규정은 따로 적용). 〔원문은 Normattiva 로 대조 필요: https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:decreto.legislativo:2004-01-22;42 〕 — 프로젝트의 이전 조사(`docs/church/MILAN_GLASS_RESEARCH.md` §5.3)와 같은 내용.
- **108조 1항**: 사용료·복제 대가는 그 문화재를 맡은 기관이 활동의 성격, 복제 수단, 이용·용도와 **신청인이 얻는 경제적 이익**을 고려해 정한다.
- **108조 3항**: 개인의 사적 이용·연구 목적, 또는 공·사 주체의 가치 증진 목적으로 **영리 목적 없이** 하는 복제에는 사용료를 받지 않는다(실비는 낼 수 있음).
- **108조 3-bis**: "Sono in ogni caso libere le seguenti attività, svolte senza scopo di lucro, per finalità di studio, ricerca, libera manifestazione del pensiero o espressione creativa, promozione della conoscenza del patrimonio culturale:" — ① 저작권 규정을 지키고, 물리적 접촉·조명 노출·(문화 시설 안) 삼각대 없이 하는 문화재 복제 ② "la divulgazione con qualsiasi mezzo delle immagini di beni culturali, legittimamente acquisite, **in modo da non poter essere ulteriormente riprodotte a scopo di lucro**."
  - 출처: Brocardi.it 108조 https://www.brocardi.it/codice-dei-beni-culturali-e-del-paesaggio/parte-seconda/titolo-ii/capo-i/sezione-ii/art108.html (확인 2026-11-16, 페이지 갱신일 2026-05-10)
  - 3-bis 는 D.L. 83/2014(이른바 'Art Bonus' 법령, L. 106/2014 로 전환)가 넣었고, L. 124/2017(연례 경쟁법) 제1조 171항이 대상을 넓혀(서지 자료 포함, 열람 제한 기록물만 제외) 지금 문구가 됐다고 알려져 있다 〔개정 연혁은 Normattiva 로 대조 필요〕.
- **DM 161/2023**(2023-04-11, 국가 문화 시설이 맡은 문화재 이용 대가의 최저액 지침)과 이를 고친 **DM 108/2024**(2024-03-21, 대가 면제 확대 — 무료 공개 출판물 등): 국가 시설(istituti e luoghi della cultura statali)에만 적용되는 **대가 산정 지침**이다. 법률(108조 3-bis)의 비영리 자유 이용을 덮어쓸 수 없다. 출처: 문화부 공지 https://cultura.gov.it/comunicato/26075 , DM 161 본문 https://www.edizionieuropee.it/LAW/HTML/221/zn14_06_062.html , DM 108/2024 https://archiviodistatotrento.cultura.gov.it/pdf/DM%2021%20marzo%202024%20rep.%20108-signed.pdf (검색 발췌; 2024년 개정의 세부 면제 기준은 〔미확인〕). DM 161/2023 을 행정법원이 취소했다는 자료는 찾지 못했다 〔미확인〕.
- **저작권법과의 관계**: 이탈리아는 EU DSM 지침 제14조(보호기간이 끝난 시각 미술의 충실한 복제물에는 새 권리가 생기지 않음, https://eur-lex.europa.eu/eli/dir/2019/790/oj )를 L. 633/1941 **제32-quater 조**(D.Lgs. 177/2021)로 받아들이면서 마지막 문장에 "Restano ferme le disposizioni in materia di riproduzione dei beni culturali di cui al decreto legislativo 22 gennaio 2004, n. 42." 를 두었다. 즉 **저작권은 없어도 문화유산법의 복제 규제는 그대로**다. 출처: https://brocardi.it/legge-diritto-autore/titolo-i/capo-iii/sezione-iii/art32quater.html , https://www.normattiva.it/eli/id/2021/11/27/21G00192/ORIGINAL (검색 발췌).

### 1.2 최근 판례 흐름

| 사건 | 결과 | 의미 |
|---|---|---|
| 베네치아 법원, 아카데미아 미술관·문화부 v. Ravensburger(〈비트루비우스 인간〉 퍼즐), 2022-10/11 가처분 | 외국 회사의 **세계** 판매 금지, 1일 1,500유로 | 이탈리아 법원은 문화유산법을 외국 사업자·외국 판매에도 적용하려 했다. https://www.ipinitalia.com/copyright/extraterritorial-application-of-the-italian-cultural-heritage-code-the-court-of-venice-orders-ravensburger-to-cease-the-marketing-of-its-puzzles-with-the-image-of-the-vitruvian-man/ |
| 피렌체 법원 2023-04-20, 아카데미아 미술관 v. Condé Nast(GQ 이탈리아 표지의 다비드상) | 영리 출판물의 무단 이용 위법, '문화재의 이미지권' 인정 | 영리 이용·문화재의 품위(decoro, 20조)를 근거로 한 강한 해석. https://legalblogs.wolterskluwer.com/copyright-blog/michelangelos-david-and-cultural-heritage-images-the-italian-pseudo-intellectual-property-and-the-end-of-public-domain/ |
| 독일 슈투트가르트 지방법원 2024-03-14 (17 O 247/22) → 고등법원 2025-06-11 (4 U 136/24) | Ravensburger 승소: 이탈리아 문화유산법은 **이탈리아 밖에서 효력이 없다**(속지주의) | 외국에서의 이용에 이탈리아 규제가 미치지 않는다는 판단. https://www.beck-aktuell.de/heute-im-recht/rechtsprechung/olg-stuttgart-4u13624-italien-da-vinci-kulturgut-puzzlemotiv-2025-06-11 , https://communia-association.org/2025/07/10/higher-regional-court-of-stuttgart-confirms-territoriality-of-italian-cultural-heritage-code/ (검색 발췌; 판결문 미열람, 확정 여부 〔미확인〕) |

과제에서 말한 '2024년 사건'은 위 슈투트가르트 지방법원 판결(2024-03)로 보인다. 베네치아 법원의 2024년 본안 판결은 찾지 못했다 〔미확인〕.

### 1.3 우리 자산에 적용되는가 — 소유·관리 주체별

107조는 **문화부·주·지방 공공단체가 맡은 문화재**에만 적용된다. 교회 소유(법인격 있는 교회 기관·대성당 관리 단체)이거나 교황청 소유라면 107–108조가 직접 적용되지 않고, 소유자의 출입·촬영 규칙(사법·계약)이 문제다.

| 자산 | 소재·관리 주체 | 107–108조 직접 적용 | 허락 주체(필요하다면) |
|---|---|---|---|
| 신비 배경: 프라 안젤리코 〈수태고지〉·〈성전 봉헌〉(산 마르코 미술관), 알베르티넬리 〈방문〉·베로키오 〈그리스도의 세례〉(우피치), 카라바조 〈채찍질〉(카포디몬테 전시) | **국가 미술관**(문화부 산하) | **예** | 각 미술관(우피치 갤러리, 산 마르코 미술관을 관할하는 문화부 지역 박물관국, 카포디몬테 미술관). 카라바조 작품의 소유는 내무부 산하 FEC 라는 자료가 있어 〔미확인〕 |
| 신비 배경: 피에로 델라 프란체스카 〈부활〉(산세폴크로 시립 미술관) | **지방자치단체**(코무네) | **예** | 산세폴크로 시 〔미확인: 관리 방식〕 |
| 신비 배경: 티치아노 〈성모 승천〉(베네치아 프라리 성당) | 성당(교회 기관 또는 FEC 소유) 〔미확인〕 | 소유자에 따라 다름 | 성당 측 |
| 피렌체 대성당: 벽화 3점(톨렌티노·호크우드·단테), 오큘러스 창 3점 | **Opera di Santa Maria del Fiore**(대성당 관리 단체, 공공 지방단체 아님) | 아니오(소유자 규칙) | Opera di Santa Maria del Fiore 〔촬영물 이용 규정 미확인〕 |
| 밀라노 대성당: 후진 창 사진 1점 | **Veneranda Fabbrica del Duomo** | 아니오(소유자 규칙: 출판·홍보용 촬영물 이용에 사전 허가·수수료, `MILAN_GLASS_RESEARCH.md` §5.2) | Veneranda Fabbrica(archivio@ / comunicazione@duomomilano.it) |
| 로마 산 클레멘테 금 모자이크(질감 일부) | 로마 산 클레멘테 성당 〔소유 미확인〕 | 소유자에 따라 다름 | — (패턴 일부만 잘라 쓴 질감, 위험 매우 낮음) |
| 라벤나 갈라 플라치디아 알라바스터 창(성당에 걸지 않고 유리 갤러리에만) | 라벤나 교구 기관 〔미확인〕 | 아니오(추정) | — (자연석 판, 창작 도안 없음) |
| 라테라노·마조레·성 바오로(〈로마 백성의 구원〉, 후진 모자이크, 무덤, 알라바스터 창) | **교황청 소유, 치외법권 지위**(라테란 조약 13조: 이탈리아는 세 대성전의 교황청 완전 소유를 인정, 15조: 외국 외교 공관과 같은 면제) — https://www.vatican.va/roman_curia/secretariat_state/archivio/documents/rc_seg-st_19290211_patti-lateranensi_it.html (확인 2026-11-16) | 실무상 **아니오**(이탈리아 영토이나 면제 대상 — 적용 여부는 〔변호사 확인〕) | 각 대성전 관리처 / 교황청 |
| 성 베드로 대성전·바티칸 박물관 | 바티칸 시국 | **아니오**(이탈리아 법 아님) | §2 |
| 3D 성당 모형(밀라노·피렌체) | 위 각 소유자 | 107조는 '복제'에 관한 것이고 대상이 공공단체 소유가 아니므로 해당 없음. 공개 자료를 보고 단순화해 새로 지은 모형은 사진 복제와 성격이 다르다 | — |

### 1.4 비영리 무료 배포는 면제되는가

- 앱이 **광고·결제·후원 없이 무료**이고 목적이 신심·문화유산 알리기이므로 **108조 3-bis 의 "senza scopo di lucro … promozione della conoscenza del patrimonio culturale" 에 해당할 가능성이 높다**(3항의 사용료 면제도 같은 방향).
- 조건 두 가지를 지켜야 한다: (가) 이미지가 **적법하게 얻은 것**일 것 — 우리 이미지는 모두 Commons 의 공개 이미지다(방문자 촬영·미술관 공개본). (나) **"영리 목적으로 다시 복제될 수 없는 방식"** — 법이 방법을 정하지 않았다. 실무에서는 저해상도·이용 조건 고지로 이해한다. 우리 파일은 1,024~1,280px 이하로 줄였고 APK 안의 data URI 다. 다만 APK 에서 뽑아낼 수는 있으므로 **출처 화면에 '영리 목적 재사용 불가' 고지를 두는 것을 권장**(S1). 유리 출처 화면에는 이미 `kGlassHeritageNote`("이탈리아·바티칸 소재 문화재 이미지는 비상업적 감상·신심 용도로, 무료이고 광고가 없는 앱에서만 사용합니다.")가 있다(`lib/glass/glass_policy.dart`). 같은 문구를 성화 출처 화면(`lib/ui/art_credits_screen.dart`)에도 두면 된다.
- **유료화·광고·후원을 넣는 순간 이 결론은 무너진다.** 그때는 위 표의 국가·시립 소장품 6점과 피렌체·밀라노·로마 사진 전부를 다시 검토하거나 뺀다(`ASSET_LICENSES.md` 의 기존 방침과 같다).

### 1.5 한국 개발자의 세계 배포에도 적용되는가

- 문화유산법은 이탈리아 공법이다. 저작권이 아니므로 베른협약의 내국민대우·보호국법 원칙으로 한국에서 보호되는 권리가 아니고, 한국 법원이 외국의 행정적 대가 규제를 집행할 근거는 찾기 어렵다 〔변호사 확인〕.
- 이탈리아 법원은 외국 사업자에게도 적용하려 했지만(베네치아 2022), 독일 법원은 이탈리아 밖 이용에는 미치지 않는다고 봤다(슈투트가르트 2024·2025). 이탈리아 사용자에게 내려받게 하는 부분에 대해서는 이론상 이탈리아 법원이 관할을 주장할 여지가 남는다.
- 실무상 위험: 국가 미술관이 영리성이 없는 개인의 무료 신심 앱을 상대로 다툴 가능성은 낮다. 가장 현실적인 것은 Google Play 에 대한 권리 신고이고, 그때는 해당 이미지를 빼면 된다.

### 1.6 결론

- **위험 등급: 중간**(국가·시립 소장품 6점은 낮음~중간, 교회·교황청 소유는 낮음).
- **출시 전 필요 조치**: ① 비상업 유지(필수 전제). ② 해상도 상한(1,280px) 유지. ③ 권장 S1: 성화 출처 화면에 비상업·재사용 제한 고지 추가(`lib/ui/art_credits_screen.dart`). ④ 국가·시립 미술관에 허가를 따로 받을 필요는 없다고 본다(3-bis) 〔변호사 확인 권장: 이탈리아 변호사 1회 자문이면 충분〕.
- **대안(fallback)**: 문제 제기 시 해당 배경을 같은 장면의 **이탈리아 밖 소장품**(이미 쓰는 MET·프라도·루브르·알테 피나코테크처럼 CC0/PD 공개 정책이 있는 곳)으로 바꾼다. 교체 대상 파일: `assets/images/mysteries/{joyful_1,joyful_2,joyful_4,luminous_1,sorrowful_2,glorious_1}.webp` (+ 필요하면 `glorious_4`), 출처 `lib/domain/art_credits.dart`. 피렌체 벽화는 절차적 색면으로 되돌릴 수 있다(`art_florence.js` 를 읽지 못할 때의 대체 경로가 이미 있음).

---

## 2. 바티칸·교황청 규정

### 2.1 확인한 규정

- **바티칸 박물관 방문 규칙**: 시스티나 경당을 뺀 전 구역에서 사진은 **"for personal and domestic use only"**, 플래시·삼각대 금지, 작품을 복제·모사하려면 박물관·문화유산 관리국의 특별 허가 필요. https://www.museivaticani.va/content/museivaticani/en/organizza-visita/consigli-utili.html (확인 2026-11-16)
- **바티칸 박물관 이미지·저작권 사무실**: 박물관 이미지는 연구·출판·전시·개인 용도로 제공되며 이용은 "precise economic and regulatory procedures" 를 따른다. 연락처 **id.musei@scv.va**. https://www.museivaticani.va/content/museivaticani/en/organizza-visita/servizi-per-i-visitatori/immagini-e-diritti.html (확인 2026-11-16). 박물관 누리집 이미지는 무단 복제 금지(https://www.museivaticani.va/content/museivaticani/en/copyright.html , 검색 발췌) — 우리는 박물관 누리집 이미지를 쓰지 않았다.
- **바티칸 시국 저작권법(2017-09-01, 2017-10-01 시행)**: 제4조가 문화재의 '순수 기록용(purely documentary)' 복제물에 고정 시점부터 70년의 배타적 권리를 둔다고 정리돼 있다. 법률 번호(Legge N. CXCVII 로 보임)와 권리 귀속 주체는 〔미확인〕. 출처: Commons 정리 https://commons.wikimedia.org/wiki/Commons:Copyright_rules_by_territory/Vatican_City (확인 2026-11-16). 바티칸에는 파노라마의 자유가 없다(같은 페이지).
- **성 베드로 대성전**: 관리 주체는 Fabbrica di San Pietro(2024-06-29 교황 서한으로 새 규범, https://www.vatican.va/content/francesco/it/apost_letters/documents/20240629-norme-fabbrica-san-pietro.html , 검색 발췌). 대성전 안 촬영물의 상업 이용 규정은 공개된 문서를 **찾지 못했다** 〔미확인〕.

### 2.2 우리 자산 대입

| 자산 | 사실 | 판단 |
|---|---|---|
| 프레비아티 〈십자가의 길〉 14점 (`assets/images/stations/previati/`, `cross_pack_previati.js`, 성 베드로 배정) | 작품은 1970년대 초 바티칸 박물관 '현대 종교 미술 컬렉션'에 기증(https://turismoroma.it/en/node/77000 , 바티칸 박물관 출판 안내 https://www.museivaticani.va/content/museivaticani/en/eventi-e-novita/editoria/2021/gaetano-previati.html — 검색 발췌). 원작은 PD(작가 1920 사망). 사진은 Sailko 의 CC BY 3.0(Commons) | 사진가 Sailko 가 박물관의 '개인·가정 용도' 조건으로 찍었다면 그 조건은 **촬영자와 박물관 사이의 약정**이고, 우리(제3자)에게 직접 미치는 권리는 아니다. 한국법상 평면 회화의 충실한 복제 사진에는 창작성이 없어(§3.2) 박물관이 한국에서 주장할 저작권도 약하다. 다만 ① 바티칸 2017년법 제4조의 '기록용 복제물' 권리의 범위가 불명확하고 ② 가톨릭 신심 앱이 교황청 기관의 공개 방침과 어긋나는 모양은 평판상 좋지 않다. `docs/BACKLOG.md` 의 "바티칸 허가는 상업 복제만 해당"이라는 전제는 박물관 규칙("개인·가정 용도만")보다 넓게 읽은 것이다 |
| 라파엘로 〈거룩한 변모〉(`assets/images/mysteries/luminous_4.webp`) | 바티칸 피나코테카 소장, Commons 의 Google Art Project 이미지(PD-Art) | 프레비아티와 같은 구조. 문의할 때 함께 적는다 |
| 피에타·성 베드로 청동상(`art_stpeter.js`) | 입체 작품(원작 PD) 사진 — 사진 자체는 창작물이지만 촬영자 Gary Todd 가 Public Domain Mark 를 붙임 | PDM 은 권리 포기 문서가 아니라 '알려진 권리 없음' 표시다(https://creativecommons.org/publicdomain/mark/1.0/). 촬영자 본인이 붙였으므로 이용 허락 의사로 볼 수 있다. 대성전 촬영 규칙은 촬영자와 Fabbrica 의 관계다. 위험 낮음 |
| 성령의 비둘기 창(`gpack_dove_stpeter_1k.js` 등) | Wilfredor CC0 | 위와 같음. 유리 자체가 후대 교체품인지 미확인이나 베르니니 도안의 재현이면 새 저작권 없음. 위험 낮음 |
| 〈로마 백성의 구원〉(`art_maggiore.js`) | 사진은 2018년 바티칸 박물관 보존 처리 뒤 모습. 기존 기록에는 파일 설명이 CC0+PD-Art 로 적혀 있고(`docs/church/licenses/maggiore.md`), 이번 API 메타데이터는 'Public domain' 으로 나옴(복수 표기 중 하나로 보임). **올린 사람이 실제 촬영자인지 미확인**(전문 촬영으로 보임) | 평면 성화의 충실한 복제라 한국·미국·EU 기준 사진에 새 권리가 없다. 표기('CC0 1.0(사진)')는 'Public domain(PD-Art) · Commons 표기 CC0' 로 바꾸면 더 정확하다(선택) |
| 성 바오로 후진 모자이크·무덤·알라바스터 창 | 치외법권 대성전(교황청 소유). 사진은 CC BY 2.5/4.0 | 이탈리아법 적용 실무상 없음(§1.3). 교황청 측 규정 〔미확인〕. 위험 낮음 |

### 2.3 결론

- **위험 등급: 중간**(프레비아티·라파엘로), 낮음(성 베드로·세 대성전의 사진).
- **출시 전 필요 조치(M8)**: 바티칸 박물관 이미지·저작권 사무실(`id.musei@scv.va`)에 짧은 문의를 보낸다 — "무료·비상업 가톨릭 기도 앱에서, 위키미디어 커먼즈의 방문자 사진(CC BY 3.0, Sailko)으로 프레비아티 〈십자가의 길〉 14점과 라파엘로 〈거룩한 변모〉를 저해상도로 싣고 출처를 밝혀도 되는지". 출시 때까지 답이 없거나 거절이면 대안으로 간다.
- **대안(fallback)**: `data/stations_series.json` 의 `assignments.stpeter` 를 `oreilly` 또는 `fugel_munich` 등 PD/CC0 연작으로 바꾸고 생성기를 다시 돌린다(`docs/ux/STATIONS_OF_CROSS.md` 위험 1). 프레비아티 파일(`assets/images/stations/previati/`, `assets/church/cross_pack_previati.js`)은 연작 선택 칩에서도 빼야 완전히 빠진다(번들에서 제거). 〈거룩한 변모〉는 다른 소장처의 '변모' 그림(예: 조반니 벨리니, 나폴리 카포디몬테 — 단 이탈리아 국가 소장이라 §1 대상 / 또는 이탈리아·바티칸 밖 소장품)으로 바꾼다.

---

## 3. 위키미디어 커먼즈 사진(CC0·PD·CC BY)

### 3.1 사진가의 권리와 원작의 권리

| 원작 | 사진 | 원칙 |
|---|---|---|
| PD 평면 작품(회화·판화·책 삽화) | 충실한 정면 복제 | **사진에 새 저작권 없음**: 미국 *Bridgeman Art Library v. Corel Corp.*, 36 F. Supp. 2d 191 (S.D.N.Y. 1999), EU DSM 지침 제14조(https://eur-lex.europa.eu/eli/dir/2019/790/oj ), 이탈리아 L. 633/1941 제32-quater 조(단 문화유산법 유보), 독일 저작권법 §68. 한국은 저작물의 요건이 '인간의 사상 또는 감정을 표현한 **창작물**'(저작권법 제2조 제1호)이고, 대법원은 피사체를 충실히 재현할 뿐인 사진의 창작성을 부정한 적이 있다(대법원 2001. 5. 8. 선고 98다43366 판결, 제품 사진 사건 〔판결문 대조 필요〕). 한국에는 독일식 '단순 사진' 인접권이 없다 → **한국에서도 PD-Art 논리가 통한다고 본다** 〔변호사 확인 권장〕 |
| PD 입체 작품(조각·모자이크 곡면·현장의 스테인드글라스) | 각도·조명을 고른 현장 사진 | **사진에 저작권이 있을 수 있다** → 촬영자의 라이선스를 따라야 한다. 우리 해당 자산은 모두 CC0/CC BY/PDM/PD-self 라 문제없음 |
| 저작권이 살아 있는 작품 | 어떤 사진이든 | 사진의 라이선스로 원작 권리가 풀리지 않는다 → 쓰지 않는다(§4) |

촬영자를 모르는 PD-Art 자산: 단테(MuseoFirenze), 코로 연작(amolenuvolette.it), 판로트 연작(본당 누리집), 1897 석판화·모슬러(도서관 스캔). 모두 평면 작품의 복제라 위험 낮음.

### 3.2 CC BY 표기(TASL) 점검 — 배포 자산 전부

CC 권장 표기: **T**itle(있으면), **A**uthor, **S**ource(원본 링크), **L**icense(이름+링크), 그리고 **변경 여부**. CC BY 4.0 은 3(a)(1) 에서 변경 표시를 요구하고(https://creativecommons.org/licenses/by/4.0/legalcode ), 3.0 은 4(b) 에서 저작자·제목(제공된 경우)·지정 URI·2차적 저작물의 이용 사실 표시를 요구한다(https://creativecommons.org/licenses/by/3.0/legalcode ). 2.0·2.5 도 같은 취지(저작권 고지 유지, 저작자·제목·URI). 실무 안내: https://wiki.creativecommons.org/wiki/Recommended_practices_for_attribution

| 자산 | 라이선스 | T | A | S | L(+URL) | 변경 표시 | 표시 위치 | 결과 |
|---|---|---|---|---|---|---|---|---|
| 프레비아티 14처 | CC BY 3.0 | 연작 제목 | Sailko | 범주 URL + **파일별 URL 14개** | ✓ | "액자를 잘라 내고 크기를 줄임" | 성화 출처(연작 카드), 묵상 시트 출처 줄 | ✅ |
| 톨렌티노 벽화 | CC BY 3.0 | 파일명 | Sailko | 파일 URL | ✓ | 원근 보정·자르기·밝기·축소 | 성화 출처, OSS 화면 | ✅ |
| 호크우드 벽화(편집본) | CC BY 3.0 | 파일명 | Sailko(편집본 올린이 MenkinAlRire) | 파일 URL | ✓ | 자르기·축소 | 같음 | ✅ (Commons 메타데이터 저자 'user:Sailko' 와 일치) |
| 성 바오로 후진 모자이크 | CC BY 2.5 | 파일명 | Alberto Fernandez Fernandez(색 보정 Amandajm) | 파일 URL | ✓ | 재투영·채움·대칭 이음·축소 | 같음 | ✅ |
| 사도 바오로 무덤 | CC BY 4.0 | 파일명 | StPaul.jpg | 파일 URL | ✓ | 나눔·원근 보정·축소 | 같음 | ✅ |
| 알라바스터 창 2점(성 바오로) | CC BY 4.0 | 파일명 | Szilas | 파일 URL | ✓ | "크롭·투시/색 보정함"(화면이 덧붙임) | 스테인드글라스 출처(CC BY 강조) | ✅ |
| 라벤나 알라바스터 창 | CC BY 2.0 | 파일명 | Richard Mortel | 파일 URL | ✓ | 같음 | 같음 | ✅ |
| Meshy 3D 성모상 | CC BY 4.0(Meshy 약관) | — | "Meshy AI" | (생성물, 원본 URL 없음) | ✓ | 삼각형 축소·압축·재질 | 성화 출처 | ✅ (§6) |

- 결과: **배포되는 CC BY 자산 모두 TASL + 변경 표시를 갖췄다.** 묵상 시트의 짧은 출처 줄(`StationsSeries.creditLine`)에는 라이선스 URL 이 없지만 같은 앱의 출처 화면에 있으므로 '합리적 방법'(CC BY 4.0 3(a)(2), 3.0 4(b))으로 충분하다고 본다.
- 개선(선택): Commons 파일 페이지가 바뀌거나 지워질 수 있으므로 받은 날짜와 당시 라이선스를 `docs/church/licenses/` 에 남겨 둔 지금 방식을 유지.

### 3.3 BY-SA·NC 가 배포되지 않는지

- 배포 자산 중 BY-SA·NC: **없음.** 근거: 위 0.1 표, Commons API 메타데이터 41건(확인 2026-11-16, 전부 Public domain/CC0/CC BY), `assets/church/glass_catalog.json` 의 배포 창 8점(CC0 2·CC BY 3·PD 3), `lib/glass/glass_catalog.dart` 가 BY-SA·NC 를 거부, `data/stations_series.json` 의 `allowed_licenses` 와 시험(`test/stations_series_test.dart`), 번들 텍스트 검색에서 BY-SA 는 '쓰지 않은 후보(not_used)' 설명에만 나옴.
- T-68(BY-SA 허용 여부)은 지금 결정 그대로 '쓰지 않음'을 권장한다. BY-SA 는 앱 안 2차적 저작물(3D 장면 합성) 범위 해석이 불확실하다.

### 3.4 결론

- **위험 등급: 낮음.**
- **출시 전 필요 조치**: 없음(필수 아님). 선택: 〈로마 백성의 구원〉 라이선스 문구 정밀화(`lib/domain/art_credits.dart`).
- **대안**: Commons 파일이 삭제·라이선스 분쟁 상태가 되면 해당 이미지만 빼고 절차적 대체(이미 있는 대체 경로)로 돌린다.

---

## 4. 스테인드글라스 — 현대 창의 저작권과 '흉내 금지' 방침

### 4.1 저작권이 살아 있는 창(프로젝트 조사 결과)

| 창 | 작가(사망) | 보호 기간 | 앱에서 |
|---|---|---|---|
| 밀라노 V07, V44, V46, V47 | János(Giovanni) Hajnal(2010) | 2080년 말까지 | 절차적 일반 창(`ch_milan.js` `windowPanel`), 사진·시안 없음 |
| 밀라노 V39 | Aldo Carpi(1973) | 2043년 말까지 | 같음 |
| 밀라노 티부리오 창 | 1968년 작(Cristoforo De Amicis 외) | 존속 | 같음 |
| 마조레 정면 장미창 | Hajnal(2010), 1995 | 2080년 말까지 | `ch_maggiore.js` 의 `ctx.rose({petals: 12, colors: GL, …})` — 12잎 일반 장미 무늬, 원작의 성모·촛대·율법판 도상 없음 |
| 명동 가운데 문 위 반월창 | 이남규(1993), 1989 | 2063년 말까지 | `ch_myeongdong.js` 318행: "색조만 있는 중립 방사 무늬" |
| 당고개 한지 유리화 | 작가 미확인(생존 작가로 봄) | 존속으로 봄 | 무늬 없는 한지 빛 판 + 창살 |

출처: `docs/church/MILAN_GLASS_RESEARCH.md` §5.4, `docs/church/GLASS_ALL_CHURCHES_PLAN.md` §2.6·마조레 절, `docs/church/interiors/danggogae.md` §4.

### 4.2 배포판에 실린 창 사진 8점의 원작

| 창 | 원작 시기 | 원작 권리 |
|---|---|---|
| 성 베드로 비둘기 창 | 1657–66 베르니니 구성(현재 유리의 교체 여부 미확인) | PD(교체품이어도 원 도안의 재현으로 봄) |
| 성 바오로 알라바스터 2점, 라벤나 알라바스터 | 19세기 이후 설치, 자연석 판 | 창작 도안 없음 |
| 피렌체 오큘러스 3점 | 1404–1443 | PD |
| 밀라노 후진 창(하부) | **카탈로그에 '미상'** — 12랜싯×4장면 구성으로 보아 후진 3대창(V19·V20·V21: 15~16세기 패널 + 1830~60년대 Bertini 공방) 중 하나로 추정 | PD 로 추정(Bertini 일가 최장 사망 1899) 〔미확인〕 |

### 4.3 '흉내 금지' 확인

- 개발용 AI 시안(밀라노 55장 등)은 `assets/church/dev/` 에만 있고 배포에서 빠진다(§0, M7).
- 배포 코드에서 저작권 존속 창 자리는 모두 **절차적 일반 무늬**다(위 표). 원작의 인물·구도·화풍을 담은 텍스처는 없다.
- 입구 화면의 AI 시안 그림(`thumb_myeongdong.webp` 등, A12)에 실제 현대 창이 비슷하게 그려졌는지는 코드로 알 수 없다 → 사용자가 눈으로 한 번 확인(작은 섬네일이라 위험 낮음).

### 4.4 결론

- **위험 등급: 낮음.**
- **출시 전 필요 조치**: M7(배포 APK 검사). 권장 S2: `milan_apse_lower` 사진을 Fabbrica 의 Google Arts & Culture V19·V20·V21 이미지와 눈으로 대조해 어느 창인지 적는다(`assets/church/glass_catalog.json` 의 `date_author`·`verify`). 20세기 창으로 밝혀지면 뺀다.
- **대안**: `milan_apse_lower` 를 빼려면 `assets/church/glass_placements.js` 의 밀라노 줄과 `gpack_milan_apse_lower_1k.js`, `gpack_far_milan.js`, `glass_milan_apse_lower_th.webp` 를 번들에서 제거(절차적 유리만 남음).

---

## 5. 건축 — 성당 3D 실내 모형

### 5.1 옛 성당

- 성 베드로·라테라노·마조레·성 바오로·밀라노·피렌체: 건축 원작은 모두 수백 년 전 작품으로 **PD**. 모형 안의 근현대 요소(성 베드로·성 바오로의 20세기 청동문, 성 바오로의 최근 교황 초상 모자이크 등)는 코드상 **일반 형태·절차적 그림**이다(예: `ch_stpaul.js` 625행의 교황 메달리온은 특정 초상이 아닌 무작위 색 도식). 위험 낮음.
- 명동대성당: 1898년 봉헌, 설계 코스트 신부(1896 사망) → **PD**. 실내의 이남규 창은 중립 무늬(§4). 서울대교구에 법적 허락이 필요하다고 보지는 않지만, 같은 교구에 당고개 동의를 구하는 만큼 **명동도 함께 안내하는 것을 권장**(S7, 02 문서의 (나) 편지에 한 문단 추가).

### 5.2 한국 저작권법과 3D 가상 모형 〔조문은 국가법령정보센터 원문 대조 필요 — 현행 법률 제21595호, 2026-10-29 시행〕

- 건축저작물: 건축물·건축을 위한 모형·설계도서(제4조 제1항 제5호). 건축물의 '복제'에는 모형·설계도서에 따라 시공하는 것이 포함된다(제2조 제22호).
- **제35조 제2항**: "개방된 장소에 항시 전시되어 있는 미술저작물등은 어떠한 방법으로든지 이를 복제하여 이용할 수 있다. 다만, … 1. 건축물을 건축물로 복제하는 경우 2. 조각 또는 회화를 조각 또는 회화로 복제하는 경우 3. … 개방된 장소 등에 항시 전시하기 위하여 복제하는 경우 4. 판매의 목적으로 복제하는 경우" 는 제외(2차 자료 기준).
  - '건축물을 건축물로 복제'의 뜻: 실제로 같은 건물을 다시 짓는 것. **3D 가상 모형은 '건축물'이 아니므로 이 단서에 걸리지 않는다** — 문언상으로는 자유 이용 쪽이다.
  - 그러나 **서울고등법원 2016. 12. 1. 선고 2015나2016239 판결**(실제 골프장을 스크린골프용 3D 영상으로 구현)은 이를 **복제가 아닌 2차적저작물 작성**으로 보아 "저작권법 제35조 제2항에 따라 허용되는 적법한 행위라고 볼 수도 없다"고 했다(2차 자료 https://maily.so/allculture/posts/8do77e20ogq ). 상고심은 대법원 2020. 3. 26. 선고 2016다276467 판결로 알려져 있다 〔판결문 대조 필요〕. → **실내 공간을 3D 로 재구성하는 우리 방식도 2차적저작물 작성(제22조 2차적저작물작성권)으로 볼 위험이 있다.**
  - '개방된 장소'는 가로·공원·건물 외벽처럼 공중에게 열린 곳을 말하고, **건물 안**(지하 성당)이 여기에 드는지는 다툼이 있다 〔변호사 확인〕.
  - 보호되는 것은 창작적 표현(공간 구성·형태의 선택과 배열)이고, 황토벽·한지 창·마루 같은 재료·분위기·일반 형태는 아이디어에 가깝다. 우리 모형은 '사진을 보고 분위기를 재현한 단순화 모형'(치수 추정)이어서 실질적 유사성이 낮을 수 있으나, 공간 배치가 실제와 비슷하면 문제가 될 수 있다.

### 5.3 당고개 순교성지(2011 건축)

- 건축·실내 구성의 저작권은 **설계자**(미확인)에게 있을 가능성이 높다. 업무상저작물(제9조)이나 계약으로 성지·교구가 권리를 가졌을 수도 있다. 성지 안의 성화·모자이크·유리화·14처·조각(심순화 화백 등 생존 작가)은 싣지 않았다(코드·문서 확인: `ch_danggogae.js` 5행, `docs/church/interiors/danggogae.md` §4.3).
- 성모상: 입구 홀 성모 자리에 지금은 **Meshy AI 3D 성모상**을 쓴다(`lib/domain/art_credits.dart`: "우리 본당·당고개·…"). 실제 성지의 성모자상(화강암)을 본뜬 것은 아니다.
- 배포판에서는 `ChurchSelectScreen.pendingConsentIds = {'danggogae'}` 로 닫혀 있다(개발용 빌드에서만 열림). 다만 `assets/church/ch_danggogae.js`, `assets/church_thumbs/danggogae.webp`, `assets/images/church_entry/render_danggogae.webp` 는 APK 에 들어 있고 '준비 중 보기'를 켜면 목록에 이름이 보인다.

### 5.4 동의 요청서(`docs/legal/church_permission/02_Danggogae_consent_request.md`) 평가

잘된 점: 담은 것/담지 않은 것을 구체적으로 밝힘, 작품 무복제 원칙, 앱 안 고지 문구, 경건 규칙, 수정·삭제 약속, 서면(전자우편) 진행과 답신 보관, 동의 전 배포 제외.

**충분하지 않은 점(보강 필요)**:
1. **설계자 권리**: 5번 질문("건축 설계자와 작가분들께 여쭈어야 할 일이 있다면")만으로는 약하다. 판례상 3D 구현이 2차적저작물 작성일 수 있으므로 "성지 건물(지하 성당·입구 홀)의 설계자는 누구이며, 건축물의 저작권을 성지·교구가 가지고 있는지, 아니면 설계자의 동의가 따로 필요한지" 를 **직접** 묻고, 필요하면 설계자에게 같은 동의를 구한다.
2. **동의 범위를 문장으로 특정**: ① 무료 앱으로 Google Play 를 통해 **전 세계** 배포 ② 앱 업데이트에 따른 모형 수정 ③ 스토어 소개 그림·설명에 모형 화면 사용 ④ 기간(정함 없음, 철회 시 다음 업데이트에서 삭제). 답신이 "좋습니다" 한 줄이어도 이 범위에 대한 동의가 되도록 요청서에 범위를 적어 두어야 한다.
3. **성모상 설명 갱신**: "성모상은 실제 성모자상을 본뜨지 않은 단순한 형태" → "성모상은 AI 로 만든 일반적인 흰 대리석 성모상 3D 모형(Meshy AI, 특정 작품을 본뜨지 않음)" 으로 사실대로 고친다.
4. **답신의 권한**: 성지 사무실의 답이 교구의 뜻인지 확인(편지 (나)로 교구에 함께 보내는 지금 구성 유지).
- 결론: 위 1~3을 보강한 요청서에 **성지(소유·관리자)와 교구의 서면 동의 + 설계자 권리 확인**이 있으면 실무상 충분하다고 본다. 설계자 확인이 끝내 안 되면 위험이 남는다(중간 → 낮음~중간).

### 5.5 결론

- **위험 등급: 중간**(당고개), 낮음(나머지).
- **출시 전 필요 조치**: M6 — 동의 전에는 닫아 둔다(적용됨). 요청서 보강 후 발송. 동의를 받으면 `pendingConsentIds` → `releaseIds`, 답신은 `docs/legal/church_permission/replies/` 에 보관.
- **대안**: 거절·무응답이면 배포판에서 계속 닫아 둔다. 더 보수적으로는 `assets/church/ch_danggogae.js`·당고개 그림 2장을 배포 번들에서도 빼고 '준비 중 보기' 목록에서도 숨긴다.

---

## 6. AI 생성 자산

### 6.1 도구별 약관

| 도구 | 소유·이용 | 제한·주의 | 출처 |
|---|---|---|---|
| ChatGPT(OpenAI) — 성모상 그림 3장, 입구 시안(추정) | 사용자가 출력을 소유하고 OpenAI 가 출력에 대한 권리를 사용자에게 양도("We hereby assign to you all our right, title, and interest, if any, in and to Output"), 법이 허용하는 범위에서 | 출력이 고유하지 않을 수 있음(남도 비슷한 출력을 받음), 이용 정책 준수, AI 생성물을 사람이 만든 것처럼 표시하지 말 것 | https://openai.com/policies/row-terms-of-use/ (직접 열람 403, 검색 발췌·이전 판 기준) |
| Gemini(Google) — Meshy 입력 그림 일부 | "Google won't claim ownership over that content"(Gemini API 추가 약관 문구, 소비자용 Google 서비스 약관에도 같은 취지가 있는 것으로 알려짐 〔미확인〕). 같은·비슷한 출력을 남에게도 줄 수 있음, 이용 책임은 사용자 | Generative AI 금지 이용 정책 | https://ai.google.dev/gemini-api/terms (검색 발췌), https://policies.google.com/terms |
| Meshy AI — 3D 성모상(무료 플랜) | **3.2: 무료 플랜 출력은 Meshy 가 소유**하고 "Creative Commons Attribution 4.0 International License" 로 제공, **Meshy 표기가 조건**. 유료 플랜이면 사용자가 소유(법이 허용하는 범위). 3.3: 커뮤니티에 올린 모델은 CC0, 그 밖의 커뮤니티 콘텐츠(올린 그림 등)는 비상업 CC 라이선스 | **2.4: Meshy 가 넣은 메타데이터·워터마크 등 AI 식별 표지를 제거·변경·무력화하면 안 됨.** 2.6: 경쟁 서비스·AI 학습용 사용 금지 | https://www.meshy.ai/terms-of-use (확인 2026-11-16, Last Updated: September 19, 2026) |

- 우리 Meshy 표기("성모상 3D: Meshy AI로 생성(CC BY 4.0) …", `lib/domain/art_credits.dart`)는 3.2 의 조건을 충족한다.
- **약관 2.4 와 우리 처리**: 원본 GLB(16.9MB)를 단순화·양자화·meshopt 압축해 위치·법선만 남겼다(`tools/statues/meshy_decimate.mjs`, `make_statue_meshy_pack.mjs`). 원본 GLB 에 Meshy 식별 메타데이터(예: glTF `asset.generator`·`extras`)가 있었다면 이 변환에서 빠졌을 수 있다. 팩 파일 머리말에 "원본: Meshy AI 로 생성(CC BY 4.0 — 'Meshy AI'…)" 이 남아 있고 앱 화면에도 표기하므로 취지는 지키고 있으나 문언상 위험이 남는다 → **S3**: 사용자 PC 의 원본 GLB 에서 식별 필드를 확인해, 있으면 그 문자열을 팩 머리말 또는 팩 객체의 메타 필드에 그대로 보존(개발).
- OpenAI 그림 원본 PNG 에는 C2PA 메타데이터가 있었고 webp 변환에서 빠졌다. OpenAI 약관에서 C2PA 제거를 금지하는 조항은 확인하지 못했다 〔미확인〕. 앱에 'AI 생성'이라고 밝히고 있다.

### 6.2 한국에서 AI 산출물의 저작권

- 저작물은 '인간의 사상 또는 감정을 표현한 창작물'(저작권법 제2조 제1호). 문화체육관광부 「생성형 AI 저작권 안내서」(2023-12-27)는 AI 산출물 자체는 저작물로 보지 않고 인간의 창작적 기여 부분만 등록할 수 있다고 안내했고, 2025년 6월 「생성형 AI 활용 저작물의 저작권 등록 안내서」·「… 분쟁 예방 안내서」가 이를 구체화했다(검색 발췌: https://www.lawtimes.co.kr/news/articleView.html?idxno=209882 , https://www.kocca.kr/trendott/vol04/trend_1.html ).
- 함의: ① 우리 AI 그림·3D 는 **남이 베껴도 막기 어렵다**(앱에는 큰 문제 아님). ② 반대로 OpenAI·Google 이 우리에게 권리를 주장할 근거도 약하다. ③ Meshy 의 'CC BY 4.0' 은 저작권이 없을 수 있는 대상에 붙은 라이선스라 실질은 **약관(계약) 의무**로 이해하는 편이 정확하다 — 표기를 유지하면 된다. ④ 다만 **기존 저작물과 비슷하게 나온 AI 산출물은 침해가 될 수 있다**(의거성·실질적 유사성).

### 6.3 기존 성모상과 닮을 위험

- 푸른 망토·열두 별 관(원죄 없으신 성모, 기적의 메달 자세)·흰 대리석 성모는 수백 년 된 **공통 도상**이라 도상 자체는 보호되지 않는다.
- **한복 성모**는 한국 근현대 작가들의 '한국의 성모' 작품이 여럿 있어(저작권 존속 가능) 구도·얼굴·옷 문양이 특정 작품과 가깝다면 문제가 될 수 있다 〔미확인: 비교 대상 작품 목록〕.
- **S4(권장)**: 사용자가 `art/statues/mary_hanbok_rosary.png`, `mary_immaculate_blue.png`, `mary_plain_white.png`, `art/statues/marble_views/*.jpg` 를 Google 렌즈·TinEye 로 역이미지 검색하고, 한복 성모는 '한국 성모상/한복 성모 성화'로 검색해 눈으로 대조한 결과를 `docs/church/ASSET_LICENSES.md` 에 한 줄 남긴다.

### 6.4 결론

- **위험 등급: 낮음~중간**(Meshy 2.4·한복 성모 유사성).
- **출시 전 필요 조치**: 필수 없음. 권장 S3·S4. 입구 시안 그림(A12)의 생성 도구를 기록.
- **대안**: 한복 성모가 특정 작품과 닮았다면 명동도 Meshy 흰 대리석 성모로 바꾼다(`assets/church/statue3d_hanbok_rosary.js` 제거, `shrine.js` 배정 변경). Meshy 쪽 문제가 생기면 예비 그림 성모(`statue3d_immaculate_blue.js`·`statue3d_plain_white.js`)로 되돌린다(이미 대체 경로 있음).

---

## 7. 오디오

### 7.1 ElevenLabs 선창 음성 62개 — 실제 문제가 될 수 있음

**사실(저장소 기록)**
- `tools/leader_voice/manifest.json`: provider `elevenlabs`, model `eleven_multilingual_v2`, voice `yeieVCpNANUQm8gq7quR`(수녀님/여성), `JL0iS7pVcKbJG6tHz7fn`(신부님/남성), 생성 2026-11-12. API 로 생성(`generate_clips_elevenlabs.py`).
- **어느 플랜으로 만들었는지 기록이 없다.** `tools/leader_voice/README.md`·`ELEVENLABS_가이드.md` 는 "유료 플랜이 필요합니다"라고 안내했을 뿐, 실제 플랜은 적혀 있지 않다.
- 두 목소리 ID 는 ElevenLabs 기본(premade) 목소리로 보이지 않는다. 가이드는 Voice Design 을 권했지만 Voice Library(다른 사용자가 공유한 목소리)일 수도 있다 〔미확인〕.
- 앱 표기: "AI로 합성한 음성이며, 사람이 녹음한 것이 아닙니다." / "AI로 만든 음성입니다. 성사가 아니며, 교회의 공식 녹음이 아닙니다."(`lib/app/leader_voice.dart`). **서비스명·`elevenlabs.io` 표기는 없다.**

**약관(확인 2026-11-16)**
- 이용약관(Last Updated 09 October 2026) 1(c): 무료 이용자는 "you may only use the Services for non-commercial purposes", 유료 구독자는 상업적 이용 가능. 4(c)(ii): 이용자와 ElevenLabs 사이에서 출력의 권리는 이용자가 가진다. 출력 배포를 금지하는 조항은 없다. '상업적'의 정의는 없다. https://elevenlabs.io/terms
- 도움말 「Can I publish the content I generate on the platform?」: 무료 플랜에는 상업 라이선스가 없고, **무료 플랜(또는 로그인하지 않은 상태)으로 만든 콘텐츠를 게시하면 제목에 "elevenlabs.io" 또는 "11.ai" 를 넣어 ElevenLabs 를 표기해야 한다.** 유료 플랜은 상업 라이선스 포함(베타 서비스 제외). https://elevenlabs.io/docs/help-center/legal/can-i-publish-the-content-i-generate-on-the-platform (원 도움말 주소는 403, 같은 문서의 공식 미러로 확인). 구독 중 만든 콘텐츠는 해지 뒤에도 상업적으로 쓸 수 있다는 기존 안내(`tools/leader_voice/README.md`)와 같은 취지.
- Voice Library 부록(Last Updated 6 March 2026): 무료·유료 이용자 모두 공유 목소리를 쓸 수 있고, 목소리 주인이 공유를 거둬도 그 전에 만든 출력은 남는다. 별도 표기 의무는 없다. https://elevenlabs.io/vla

**판단**
- **유료 플랜에서 만들었다면**: 문제 없음. 결제 내역(날짜·플랜 이름)을 개인정보를 가린 형태로 기록하면 끝(`tools/leader_voice/README.md` 에 한 줄).
- **무료 플랜에서 만들었다면**: (가) 로사리움은 수익이 없으므로 '비상업'에 들 가능성이 높지만 약관에 정의가 없어 해석 위험이 남는다. (나) 게시 조건으로 **`elevenlabs.io` 표기 의무**가 생기는데 지금 앱에는 없다 → 그대로 출시하면 약관 위반.
- 이 문제와 별도로 주교회의가 음성 수록을 승인하지 않을 수 있다(§8).

**선택지(무료였을 경우, 권장 순)**
1. **유료 플랜(최저 등급 1개월)으로 62개를 다시 생성**하고 플랜을 기록한다. 구독 중 생성분만 상업 라이선스가 붙으므로 **기존 파일에 소급되지 않는다** — 다시 만들어야 한다. 같은 목소리·설정으로 `tools/leader_voice/generate_clips_elevenlabs.py` 재실행(개발), 음성 인식 대조(`qa_clips.py`) 후 교체.
2. 그대로 쓰되 표기 추가: `aiVoiceDisclosure` 를 예: "AI로 합성한 음성이며(elevenlabs.io), 사람이 녹음한 것이 아닙니다." 로 바꾸고 성화·음악 출처와 OSS 화면에도 "선창 음성: ElevenLabs(elevenlabs.io)로 합성" 을 더한다. 비상업 유지가 전제. 해석 위험은 남는다.
3. **번들 음성을 빼고 기기 TTS(`flutter_tts`)만 쓴다**: `pubspec.yaml` 의 `- assets/leader_voice/sister/`·`- assets/leader_voice/priest/` 두 줄을 빼면 앱은 이미 기기 음성으로 대체한다(`tools/leader_voice/README.md` '앱이 파일을 쓰는 방법'). 품질은 떨어지나 권리 문제는 사라진다. 주교회의가 음성을 거절할 때의 대안과 같다.
- 목소리 출처: 어느 경우든 ElevenLabs 'My Voices'에서 두 ID 의 종류(Voice Design/Library/Default)와 이름을 확인해 `tools/leader_voice/manifest.json` 에 적는다. Library 목소리라면 실존 인물의 목소리 복제일 수 있으므로, 앱에서 특정인처럼 소개하지 않는 지금 방식('여성 목소리(AI)', '남성 목소리(AI)')을 유지한다.

### 7.2 오르간(자체 합성, CC0)

- 선율은 그레고리오 성가(PD), 음높이만 GregoBase(“All chant transcriptions are released under CC0”, `licenses/MUSIC.md` 2026-11-15 확인)에서 읽고, 소리는 코드로 합성 → 저작인접권 없음. 출처 화면에 표기. **위험 낮음.** 남은 일: 사람이 한 번 들어 보기(품질).

### 7.3 계획 중인 커먼즈 성가 녹음

- `licenses/MUSIC.md` 의 후보 3점은 Commons 요청 제한(429)으로 라이선스 틀·연주자를 확인하지 못해 **앱에 없다**. 넣을 때는 ① 파일 페이지의 라이선스 틀이 CC0 또는 PD-self 인지 ② 올린 이가 **실제 연주·녹음자**인지(남의 음반을 올린 'PD-self' 는 무효) ③ 합창단 구성원 등 실연자 권리가 정리됐는지 확인한다. BY-SA 는 방침상 제외.

### 7.4 결론

- **위험 등급: 높음(플랜 확인 전)** → 유료 생성이 확인되면 낮음. 오르간 낮음.
- **출시 전 필요 조치**: M2.
- **대안**: 위 선택지 1~3(3번은 즉시 가능).

---

## 8. 기도문(한국천주교주교회의)

- 이미 정리된 절차: `docs/legal/church_permission/README.md`, `01_CBCK_copyright_request.md` — 『가톨릭 기도서』 전재·복제에는 주교회의 승인 필요(https://cbck.or.kr/Copyright ), 「전례문의 저작권 사용 절차 규정」(1997) 제5조 ③ 비매품 사용료 없음, 제7조 표시 의무.
- **2023 규정 제8조**(「복음화를 위한 개별 교구의 저작권 사용에 관한 규정」, 2023-10-12 시행, 확인 2026-11-16 https://cbck.or.kr/Board/K7300/20230535 ): 제8조 ①항 가목 "인공 지능(Artificial Intelligence) 서비스, 수익 창출을 목적으로 하는 동영상 공유 웹 사이트 업로드, **애플리케이션 제작과 판매** 등에는 협의회 저작물을 사용할 수 없다." ②항 승인 없이 쓰거나 조건을 어기면 즉시 사용 금지. 제6조 표준 표기 임의 변형 금지, 제10조 원문 동일성(전례문은 "수정·증감·도치·반복 등 어떤 변형도 할 수 없으며").
  - 이 규정은 **교구·본당의 승인 면제 범위**를 정한 것이라 개인에게 그대로 적용되지는 않는다(개인은 원래 신청 절차를 밟음). 그러나 주교회의가 **앱 제작과 AI 이용을 원칙적으로 허용하지 않는 방향**임을 보여 준다. 로사리움은 ① 앱이고 ② 기도문을 AI 합성 음성으로 낭독한다 → **승인 거절·조건부 승인 가능성이 실재한다.** 신청서에 두 가지를 숨기지 않고 적은 지금 방식이 맞다.
  - 제10조 관련: 선창/후창 분할, '외운 기도 짧게 보기'(첫 구절만 표시)가 '변형'으로 보일 수 있다 → 신청서 별첨 1에 이미 밝혔다. 답신 지시를 따른다.
  - 주교회의 AI 태스크포스가 2026년 중 지침을 낼 예정이라는 보도가 있다(검색 발췌) — 승인 조건에 반영될 수 있다.
- **위험 등급: 높음**(핵심 기능, 승인 전).
- **출시 전 필요 조치**: M1. 승인 전 공개 배포 금지(이미 방침). 승인 문구("© 한국천주교중앙협의회" 등)를 앱에 반영.
- **대안**: 음성만 거절 → §7 선택지 3(번들 음성 제거). 십자가의 길만 거절 → 공식 기도문(`data/stations_prayers.json`) 빼고 검수한 묵상만. 묵주기도 기도문까지 거절 → 글자 없이 순서·횟수 안내만 남기는 방식 등 별도 결정(README §5). 기기 TTS 로 기도문을 읽는 것도 '기도문 사용'이므로 승인 범위 안에서만 한다.

---

## 9. 글꼴·코드 라이선스

| 항목 | 라이선스 | 의무 | 현재 | 판정 |
|---|---|---|---|---|
| Pretendard v1.309(수정 없음, 4종) | SIL OFL 1.1, 예약 글꼴 이름 "Pretendard"(https://openfontlicense.org/ ) | 라이선스 동봉, 단독 판매 금지, 수정 시 이름 변경 | `assets/fonts/OFL-Pretendard.txt` 동봉 + `registerFontLicenses()` 로 OSS 화면 등록 | ✅ |
| 그 밖의 글꼴 | 웹 장면은 시스템 글꼴(`system-ui, sans-serif`, Georgia)만 사용, 웹 글꼴 없음 | — | — | ✅ |
| three.js r149 (`three.min.js`, `three_extras.js`) | MIT(https://github.com/mrdoob/three.js/blob/r149/LICENSE ) | 저작권 고지 + **허락 문구 전문** 동봉 | 파일 머리에 "Copyright 2010-2023 Three.js Authors / SPDX-License-Identifier: MIT" 만. OSS 화면에 없음 | ✅ M4 완료 |
| meshoptimizer 디코더 | MIT(https://github.com/zeux/meshoptimizer/blob/master/LICENSE.md ) | 같음 | 팩 머리말에 "MIT" 표기만 | ✅ M4 완료 |
| esbuild 런타임 도우미(`three_extras.js` 번들 안의 몇 줄) | MIT | 같음(사소) | 없음 | M4 에 함께 |
| Flutter 엔진·SDK, pub 패키지 130개(pubspec.lock 기준, 개발용 포함) | BSD 97 · MIT 24 · Apache-2.0 8 · MPL-2.0 1(`dbus` 0.8.0, Linux 데스크톱용 전이 의존, Android 코드에는 쓰이지 않을 것으로 봄) | 고지 | `showLicensePage` 가 패키지 LICENSE 와 엔진 NOTICES 를 자동으로 모은다 | ✅ |
| 앱 안 라이선스 화면 | — | — | 더보기 → 「오픈소스 라이선스」(`lib/ui/more_screen.dart`), 설정 → 정보(`lib/ui/settings_screen.dart`) 에서 `showLicensePage(applicationName: '로사리움')`. 성화·성가 목록도 `LicenseRegistry` 에 등록(`lib/app/licenses.dart`) | ✅ |

- **M4 구현 안(개발)**: `assets/licenses/` 에 `three.js-LICENSE.txt`, `meshoptimizer-LICENSE.md` 를 두고 `pubspec.yaml` 자산에 등록, `registerFontLicenses()` 에 `(['three.js (r149)'], …)`, `(['meshoptimizer'], …)` 를 더한다. 같은 기회에 'Meshy AI 3D(CC BY 4.0)', 'ElevenLabs 음성'(플랜 결과에 따라), 'ambientCG·Poly Haven 질감(CC0)' 한 줄씩도 넣으면 좋다.
- **위험 등급: 낮음**(누락 고지는 쉽게 고침).
- **대안**: 해당 없음(고지 추가가 해법).

---

## 10. 상표·이름

### 10.1 '로사리움'

- KIPRIS 검색을 시도했으나 결과 화면이 자바스크립트로 그려져 '0건' 표시를 믿을 수 없었다 〔미확인〕. **S5(사용자)**: https://www.kipris.or.kr → 상표 → 검색어 `로사리움`, `ROSARIUM`, `로자리움`, `로사리오`(칭호 유사) → 상품류 **제9류**(내려받는 앱·소프트웨어), **제41류**(교육·오락·온라인 콘텐츠), **제42류**(SaaS), **제45류**(종교 관련 서비스 포함 여부 확인) → 출원·등록·거절 상태와 지정상품을 캡처해 `docs/legal/` 에 보관.
- 앱 마켓: 영어권에 'Rosarium' 이름의 묵주 앱이 여럿 있다(예: App Store "Rosarium Pro", "Rosarium: Rosary and Prayers", Google Play 패키지 `rcr.rosario` 의 "Rosarium" — 검색 발췌, https://apps.apple.com/us/app/id1494536588 , https://apps.apple.com/us/app/id6753740741 ). 'Rosarium'은 라틴어로 '묵주(장미 화관)'라는 뜻이라 묵주 앱에는 설명적 이름에 가깝고, 남이 독점하기도 우리가 독점하기도 어렵다. 한글 '로사리움'으로 한국 스토어에 내는 데 큰 장애는 없어 보이나, 스토어 이름은 **"로사리움 - 3D 가상 성당 묵주기도"** 처럼 구별되게 하고 영어 표기 'Rosarium' 단독은 피하는 것을 권장. 비상업 앱이라 상표 출원은 필수 아님.

### 10.2 교회 이름·교황청/바티칸 이름과 문장

- 성당 이름(명동대성당, 성 베드로 대성전, 밀라노 대성당 등)과 '바티칸'·'교황청'을 장소를 설명하는 데 쓰는 것은 설명적 사용으로 위험 낮음(상표법 제90조의 효력 제한 취지 〔원문 대조 필요〕). 다만 **공식·제휴로 오인하게 하면 안 된다** — 앱에 이미 "이 앱은 가톨릭 교회의 공식 서비스가 아닙니다." 가 있다(`appUnofficialNotice`). 스토어 설명 첫 부분에도 같은 문장을 넣는다(Google Play 사칭 정책: https://support.google.com/googleplay/android-developer/answer/9888374 ).
- 교황청 문장(교차한 열쇠·삼중관): 파리협약 제6조의3·상표법 제34조 제1항 제1호는 **상표 등록**을 막는 조항이다. 앱 안 라테라노 천장 장식에 절차적으로 그린 교차 열쇠 문양(`assets/church/ch_lateran.js` `cartouche(withEmblem)`)은 건축 장식 재현이라 문제없다. **아이콘·스토어 그림·로고에는 교황청 문장, 바티칸 국기, 교구 문장, 성당 관리 단체의 로고(예: Fabbrica 로고)를 쓰지 않는다.**

### 10.3 앱 안 로고

- **런처 아이콘이 Flutter 기본 로고**다(`android/app/src/main/res/mipmap-*/ic_launcher.png`, `AndroidManifest.xml` `android:icon="@mipmap/ic_launcher"`). Flutter 로고는 Google 상표이고 Flutter 브랜드 지침은 앱 아이콘에 로고를 쓰는 것을 허용하지 않는 것으로 안다(https://flutter.dev/brand 〔미확인〕). 스토어 등록 아이콘(512px)과 별개로 기기 홈 화면에 이 로고가 보인다 → **M3: 반드시 교체.**
- 로그인 버튼 아이콘은 공식 로고가 아닌 일반 아이콘(`lib/auth/account_screen.dart` "출시 전 공식 자산 적용 TODO"). 카카오·구글 로그인 버튼은 각 사의 브랜드 지침(카카오 로그인 디자인 가이드, Google 로그인 브랜딩 지침)을 따른 공식 자산을 쓰는 것이 원칙이다 → T-35 와 함께 처리. 위험 낮음.

### 10.4 결론

- **위험 등급**: 런처 아이콘 **높음**(쉬운 수정), 이름 낮음~중간(KIPRIS 확인 전), 교회 이름·문장 낮음.
- **출시 전 필요 조치**: M3, S5, 스토어 설명에 비공식 고지.
- **대안**: KIPRIS 에서 9류 등에 같은·비슷한 등록 상표가 나오면 부제 위주의 이름으로 바꾸거나(예: '로사리움 성당'), 변호사에게 유사 판단을 맡긴다.

---

## 11. 개인정보·Play 정책 중 권리와 겹치는 부분 (자세한 개인정보는 T-38)

- **다른 사람에게 보이는 사용자 콘텐츠**: 서버 프로토콜상 아바타 이름은 세례명 목록의 **인덱스**(`name: number`, `server/church/src/room_logic.ts`), 봉헌초 지향도 **정해진 8가지 중 번호**(`intention: number`), 대화 기능 없음. 자유 입력 글·사진이 다른 사용자에게 보이는 경로가 없다 → Google Play **사용자 생성 콘텐츠(UGC) 정책**(신고·차단 기능, 이용약관의 금지 행위 명시 — https://support.google.com/googleplay/android-developer/answer/9876937 )의 의무가 직접 생기지 않는다고 본다. 데이터 보안 답안의 "Other user-generated content: 수집 안 함"과도 맞다(`docs/legal/store_disclosures.md`). 자유 글(닉네임·지향 문구·대화)을 넣는 순간 UGC 정책·모더레이션 의무가 생긴다.
- 세례명 목록(A22)에 부적절한 항목이 없는지는 목록이 고정이라 한 번 검토로 끝난다.
- 종교 정보(기도·성당 이용 기록) 처리는 민감정보 쟁점 → T-38 에서 다룬다(`docs/legal/privacy_policy.md`, `data_inventory.md`).
- 스토어 소개 그림: 동의 전인 당고개 화면, Flutter 로고, 교황청 문장은 넣지 않는다. 'AI 음성'·'AI 생성 성모상'은 스토어 설명에도 밝힌다.
- **위험 등급: 낮음.** **필요 조치**: 스토어 설명에 비공식·AI 고지. **대안**: 해당 없음.

---

## 검수용(출시) 빌드에서 숨긴 것

교회 검토·법률 확인을 받는 동안 일반(배포) 빌드는 아래 항목을 **보이지도, 번들에 넣지도 않는다**(2026-11-16). 개발용 빌드(`tools/build_dev_apk.sh`, `ROSARIUM_DEV_GLASS=true`)에서는 모두 그대로 켜진다. 관문은 한 곳이다: `lib/app/release_gate.dart`(`ReleaseGate`, 항목별 이유·풀리는 조건을 한글 주석으로 적었다). 번들에서 빼는 파일 목록은 `tools/release_hidden_assets.txt`(pubspec 에는 없고 개발용 빌드 스크립트만 임시로 더한다). 웹 장면은 주소의 `devglass=1`(개발용 빌드만 붙임)이 있을 때만 숨김을 푼다(`assets/church/way_cross.js`). `bash tools/check_release_apk.sh <apk>` 가 배포 APK 에 그 경로들이 없는지 검사한다(M7 확장). 핵심 기도문(주교회의 승인 대기)과 그 출처 표기는 숨기지 않았다.

| # | 항목(법률 검토 표) | 숨기는 방법 · 대신 보이는 것 | 풀리는 조건 |
|---|---|---|---|
| 1 | AI 선창·후창 음성 62개(A15, M2) | 설정에서 'AI 음성' 칸·화자 선택·'합성 음성 안내' 숨김, 저장값이 AI 음성이어도 기기 음성(flutter_tts)으로 읽음, `assets/leader_voice/` 번들 제외. 음성 제목 안내는 원래 기기 음성이라 그대로 | ElevenLabs 결제 내역으로 유료 플랜·목소리 종류 확인(또는 유료 재생성) + 주교회의가 합성 음성 허용 |
| 2 | 당고개·여의도동(M6) | `ReleaseGate.pendingConsentChurchIds`(`ChurchSelectScreen.pendingConsentIds` 가 이를 가리킴): 목록에 '준비 중', 입장·이어하기·입구 카드에서 제외. 여의도동 임시 그리스도상도 그 안이라 함께 숨음 | 성지·본당·서울대교구(·설계자) 서면 동의 |
| 3 | 프레비아티 〈십자가의 길〉(A9, M8) | 연작 목록·출처 화면에서 제외, 성 베드로는 `oreilly`(PD, 라테라노와 공유 — 시험의 공유 예외에 추가), 3D 팩은 `assets/church/dev/` 로 옮기고 `assets/images/stations/previati/` 번들 제외 | 바티칸 박물관 이미지·저작권 사무실 회신(허락). 거절·무응답이면 영구 교체 |
| 4 | 기도 배경: 라파엘로 〈거룩한 변모〉 + 이탈리아 국립·시립 6점(A7) | 해당 7단은 그림 없이 표면색 배경, 출처 줄 숨김, 7개 파일 번들 제외 | 바티칸 박물관·각 미술관 허락 또는 이탈리아 변호사의 108조 3-bis 적용 확인 |
| 5 | 출처 미확인 묵주 그림 25장(A13, M5) | 오늘 탭 카드·묵주 지도·성당 기도 선택 시트·로그인 화면에서 묵주 색의 단순 도형(구슬 고리+십자가, `RosaryGlyph`)을 그림, `assets/images/` 바로 아래 25개 번들 제외. 3D 묵주(`assets/rosary3d/`)는 그대로 | 생성 도구·약관·참고 이미지 확인(`ROSARY_IMAGES_PROVENANCE.md` '확인 기록') 또는 새 그림·3D 정지 컷으로 교체 |
| 6 | 밀라노 개발용 유리 55장(M7) | 이미 개발용 전용(`DevGlass.enabled`, `assets/church/dev/`) — 확인함, 관문에도 같은 값을 둠 | 실제 작품 도안·권리 확인 |
| 7 | CC BY-NC 자산 | 비상업 앱이라 허용 — 유지(현재 NC 자산은 번들에 없음) | — |
| 8 | 여의도동 임시 그리스도상 | 항목 2 안에 있어 함께 숨음 | 항목 2 |
| 9 | 런처 아이콘(A25, M3) | 숨길 수 없어 교체: 사용자가 ChatGPT 로 만든 그림(`art/launcher_icon_src.png`, 짙은 갈색 바탕·금색 묵주 고리와 십자가)으로 레거시 mipmap 5장 + 적응형 아이콘(배경 #140806, 전경은 금색만 66% 안전 영역) + iOS AppIcon 을 `tools/make_launcher_icon.py` 로 생성 | 사용자가 다른 그림을 정하면 원본만 바꿔 스크립트 재실행 |
| 10 | 그 밖의 높음·중간 | 점검 결과 더 숨길 것은 없음. 성당 안 진본 성화 사진(A6, 이탈리아·바티칸 소재 중간 위험)은 성당 장면의 핵심 요소라 숨기면 빈 벽이 되므로 둠(M8 문의에 포함해 처리). 기도문은 핵심 기능이라 둠(M1) | M1·M8 회신 |

---

## 12. 최종 조치 점검표

담당: **개발(Claude)** / **사용자** / **외부(권리자·변호사)**

| ☐ | # | 할 일 | 담당 | 관련 파일·근거 | 출시 차단 |
|---|---|---|---|---|---|
| ☐ | 1 | 『가톨릭 기도서』 승인 신청 발송(전자우편, hwp 신청서·별첨) | 사용자 | `docs/legal/church_permission/01_*`, `04_*` | 예 |
| ☐ | 2 | 주교회의 승인·조건 회신 | 외부(주교회의) | — | 예 |
| ☐ | 3 | 승인 문구·조건 앱 반영(표기, 음성 허용 여부) | 개발 | `lib/ui/more_screen.dart`, `lib/ui/settings_screen.dart`, `lib/domain/prayer_data.dart` | 예 |
| ☐ | 4 | ElevenLabs 결제 내역으로 2026-11-12 생성 당시 플랜 확인, 두 목소리 종류·이름 확인 | 사용자 | `tools/leader_voice/manifest.json` | 예 |
| ☐ | 5 | (무료였으면) 유료 1개월로 62개 재생성 / 또는 `elevenlabs.io` 표기 추가 / 또는 번들 음성 제거 | 사용자(결정·구독) + 개발 | `assets/leader_voice/`, `lib/app/leader_voice.dart`, `pubspec.yaml` | 예 |
| ☐ | 6 | 플랜·목소리 기록 남기기 | 개발 | `tools/leader_voice/README.md`, `manifest.json` | 예 |
| ☐ | 7 | 앱 아이콘 디자인 확정 | 사용자 | — | 예 |
| ☐ | 8 | 런처 아이콘 교체(적응형 아이콘 포함) | 개발 | `android/app/src/main/res/mipmap-*/ic_launcher.png` | 예 |
| ☑ | 9 | three.js·meshoptimizer MIT 전문을 OSS 화면에 등록 → 완료(2026-11-16): `assets/licenses/*.txt` 3종(three.js·meshoptimizer·esbuild 도우미) + `licenses.dart` + `test/licenses_test.dart`. 번들 `three_glb.js`·GLTFLoader 는 앱에 싣지 않음(`assets/church/index.html` 에 없음). | 개발 | `lib/app/licenses.dart`, `pubspec.yaml` | 예 |
| ☐ | 10 | 묵주 그림 24장 출처 확인(도구·날짜) → 개발 조사 완료(2026-11-16): 저장소 기록만으로 출처 미확인, 이미지 생성 AI 풍. 사용자 확인 필요 — `docs/legal/ROSARY_IMAGES_PROVENANCE.md` 의 확인 표. | 사용자 | `assets/images/*.webp`, `art/images_src/*.png` | 예 |
| ◐ | 11 | 그 결과를 자산 기록에 반영(필요하면 교체) → 기록 완료(`ASSET_LICENSES.md`·`ROSARY_IMAGES_PROVENANCE.md`: "출처 미확인 — 출시 전 교체 필요"). 교체는 미실행: 3D 렌더 프로토타입(`tools/rosary3d/render_stills.mjs`)의 품질이 기존 그림에 못 미쳐 파일은 그대로 둠. | 개발 | `docs/church/ASSET_LICENSES.md` | 예 |
| ☐ | 12 | 배포 APK 로 개발용 유리 제외 검사 | 개발 | `tools/check_release_apk.sh` | 예 |
| ☑ | 13 | 당고개 요청서 보강(설계자 권리, 동의 범위, 성모상 설명) → 완료(2026-11-16): 설계자 권리 직접 질문, 동의 범위 5항, 성모상 = Meshy AI 3D 로 정정. | 개발 | `docs/legal/church_permission/02_Danggogae_consent_request.md` | 당고개 공개 시 |
| ☐ | 14 | 당고개 성지·서울대교구에 발송(명동 안내 한 문단 포함) | 사용자 | 같음 | 당고개 공개 시 |
| ☐ | 15 | 당고개 서면 동의(+설계자 권리 확인) | 외부(성지·교구·설계자) | `replies/` 보관 | 당고개 공개 시 |
| ◐ | 16 | 프레비아티·라파엘로 문의 발송(`id.musei@scv.va`) 여부 결정 → 문의서 초안 준비됨(`docs/legal/church_permission/06_Vatican_Museums_request.md`, 영·한). 보낼지 결정은 사용자. | 사용자 | §2.3 | 예(결정) |
| ◐ | 17 | 바티칸 박물관 회신(없으면 프레비아티 교체) → 대안 실행 절차 준비됨(같은 문서 "준비해 둔 대안", 적용 안 함). | 외부 → 개발 | `data/stations_series.json` | 조건부 |
| ☐ | 18 | 성화 출처 화면에 비상업·재사용 제한 고지(S1) | 개발 | `lib/ui/art_credits_screen.dart` | 아니오 |
| ☐ | 19 | 밀라노 창 사진 원작 특정(S2) | 개발(조사) + 사용자(눈 확인) | `assets/church/glass_catalog.json` | 아니오 |
| ☑ | 20 | Meshy 원본 GLB 식별 메타데이터 확인·보존(S3) → 완료(2026-11-16): 원본 GLB 의 식별 표지는 `asset.generator = "xpostprocessing"` 하나뿐이었고 팩에서 빠져 있었음 → `meta.src` 로 보존(`licenses/MESHY_STATUE.md`). | 사용자(파일 제공) + 개발 | `art/statues/meshy/*.glb`(저장소 밖), `assets/church/statue3d_mary_meshy.js` | 아니오 |
| ☐ | 21 | AI 성모상 역이미지 검색(S4) | 사용자 | `art/statues/` | 아니오 |
| ☐ | 22 | KIPRIS 상표 검색·캡처 보관(S5) | 사용자 | `docs/legal/` | 아니오(권장) |
| ☐ | 23 | 세례명 목록 출처 기록(S6) | 사용자 → 개발 | `data/baptismal_names.tsv` | 아니오 |
| ☐ | 24 | 이탈리아 문화유산법 3-bis 적용·역외 효력 1회 자문 | 외부(이탈리아 변호사) | §1 | 아니오(권장) |
| ☐ | 25 | 3D 실내 모형 = 2차적저작물 작성 판례의 적용과 동의 범위 검토 | 외부(한국 변호사) | §5 | 당고개 공개 시 권장 |
| ☐ | 26 | 스토어 설명에 비공식·AI 음성·AI 성모상 고지, 스크린샷에서 당고개·로고 제외 | 사용자 + 개발(문안) | `docs/legal/store_disclosures.md` | 예 |
| ☐ | 27 | 유료화·광고·후원 도입 시 이 문서 전체 재검토 | 개발 | — | (조건) |

---

## English summary

**Scope.** Pre-release rights review (roadmap T-32 and related asset items) for 로사리움 (Rosarium), a free, fully non-commercial Catholic prayer app for Android by an individual developer in South Korea, distributed on Google Play (Korea first). Research and documentation only, not legal advice. Sources were checked on 2026-11-16 where marked. Wikimedia Commons rate-limited (HTTP 429) after the license-metadata pass. openai.com and the ElevenLabs help-center URL returned 403, and law.go.kr did not serve statute text; items depending on those are marked unverified.

**Inventory.** Shipped third-party or AI content: CC0 textures and an HDRI (ambientCG, Poly Haven); 8 stained-glass photos (CC0, CC BY 4.0/2.0, PD); 8 in-church artwork photos (4 CC BY, 4 PD/PDM); 17 PD/CC0 mystery paintings; 9 Stations of the Cross series (one CC BY 3.0, Previati); ChatGPT-generated statue images; a Meshy AI 3D statue (free plan, CC BY 4.0, Meshy-owned); 62 ElevenLabs voice clips; self-synthesized organ (CC0) and sound effects; Pretendard (OFL); three.js and meshoptimizer (MIT); Flutter packages; CBCK prayer texts. Dev-only glass under `assets/church/dev/` is excluded by design (non-recursive pubspec asset entries, `tools/check_release_apk.sh`). That check still has to be run on the real release APK.

**Top risks.**
1. **CBCK prayer-text approval** is not yet granted, and the CBCK 2023 regulation, Art. 8(1)(a), bars use of CBCK works in "AI services" and "app production and sale" within the diocesan exemption. High; do not publish before approval.
2. **ElevenLabs plan unknown.** Free-plan output is non-commercial only and must carry "elevenlabs.io" when published, and the app has no such credit. The two voice IDs are not default voices. High until the user confirms; options are to regenerate on a paid plan, add attribution, or drop the bundled clips for on-device TTS.
3. **The launcher icon is the default Flutter logo.** Must replace.
4. **Italian and Vatican heritage images.** The Previati Stations are in the Vatican Museums, whose visitor rule is "personal and domestic use only". The Raphael *Transfiguration* is also in the Vatican, and 6 mystery paintings belong to Italian state or municipal museums. Codice art. 108(3-bis) likely frees non-profit dissemination, and German courts (LG/OLG Stuttgart 2024/2025) rejected extraterritorial effect. Medium; send an inquiry to the Vatican Museums or swap the Previati series.
5. **Danggogae 3D model.** Korean case law (Seoul High Court 2015나2016239) treated rebuilding a real space in 3D as making a derivative work, outside Copyright Act art. 35(2). Medium; keep the church hidden until written consent, and strengthen the request to cover the architect's rights and the scope of consent.

**Other findings.**
- MIT notices for three.js and meshoptimizer are missing from the in-app license page.
- The 24 rosary images have no recorded provenance.
- Meshy ToS §2.4 forbids removing AI identifiers; check the original GLB metadata.
- One Milan window photo is not identified (likely a PD 19th-century Bertini window).
- Every shipped CC BY item has full TASL plus a change note, and no CC BY-SA or NC item ships.
- No free-text user content is visible to other users, so the Play UGC duties do not apply.

**Owners.** Developer (Claude): code and docs fixes. User: plan and provenance checks, icon, KIPRIS search, sending letters. External: CBCK, Danggogae shrine and Seoul Archdiocese (and architect), Vatican Museums, plus optional Italian and Korean counsel.
