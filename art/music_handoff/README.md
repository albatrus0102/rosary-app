# 로사리움 성가 녹음 받기(선택)
확인일: 2026-11-16

앱에는 이미 **오르간 성가 4곡**(자체 합성, CC0)이 들어 있어 이 폴더 없이도 '성가 듣기'가 동작합니다.
이 폴더는 **사람이 부른 그레고리오 성가 녹음**을 더하고 싶을 때만 씁니다.

## 왜 PC 에서 받아야 하나
작업 환경에서는 위키미디어 커먼즈의 음원 서버(upload.wikimedia.org)가 요청을 제한(HTTP 429)해서
음원 파일을 받지 못했습니다. 제한을 피해 가는 방법은 쓰지 않았습니다.
그래서 후보는 **아직 앱에 넣지 않았고, 음질도 귀로 확인하지 못했습니다.**
(파일 페이지와 API 의 라이선스·작성자·길이·SHA-1 은 2026-11-16 에 확인했습니다.)

## 후보(위키미디어 커먼즈, 사용자 Membeth 의 본인 녹음 · 퍼블릭 도메인)
순위·근거·제외한 후보는 `CHANT_CANDIDATES_ko.md` 에 있습니다.

| 순위 | 파일 페이지 | 곡 | 길이 | 라이선스 |
|---|---|---|---|---|
| 1 | https://commons.wikimedia.org/wiki/File:Veni.sancte.spiritus.ogg | Veni Sancte Spiritus (성령 강림 부속가) | 2:37 | PD-self |
| 2 | https://commons.wikimedia.org/wiki/File:Ostersequenz.ogg | Victimae paschali laudes (부활 부속가) | 1:42 | PD-self |
| 3 | https://commons.wikimedia.org/wiki/File:Puer.natus.est.ogg | Puer natus est (성탄 입당송) | 1:18 | PD-self |
| 4 | https://commons.wikimedia.org/wiki/File:Rorate.ogg | Rorate caeli (대림 제4주일 입당송) | 1:02 | PD-self |
| 5 | https://commons.wikimedia.org/wiki/File:Lamentation.III.Karsamstag.ogg | Lamentatio III (성토요일 애가) | 6:09 | CC0 1.0 |
| 6 | https://commons.wikimedia.org/wiki/File:Dies.irae.ogg | Dies irae (위령 부속가, 예비) | 7:14 | PD-self |

**미확인**: 실제 음질(잡음·울림·음정), 연주자의 실명(Membeth 는 필명). 스크립트가 받을 때 API 로 라이선스를 다시 확인합니다.

## 받는 법(둘 중 하나)
1. **윈도우**: `rosarium_get_chant.bat` 을 더블클릭합니다. 바탕화면에 `rosarium_chant.zip` 이 생깁니다
   (음원 + `report.json`). 그 ZIP 을 Claude 에게 올려 주세요.
2. **파이썬 3 이 있으면**: `python download_chant.py` → 이 폴더의 `originals/` 에 음원과 `report.json` 이 생깁니다
   (이때 3번은 `python3 tools/music/import_handoff.py --received art/music_handoff/originals`).

스크립트는 파일마다 커먼즈 API 로 라이선스를 읽어 **CC0 / Public domain 이 아니면 받지 않고**
(`rejected_license`), 받은 파일의 SHA-1 을 맞춰 봅니다. 요청 사이에 5초씩 쉬고, 서버가 바쁘다고 하면
기다렸다가 두 번까지만 다시 시도합니다.

## Claude 전달 지시
1. ZIP 을 `art/music_handoff/received/` 에 풉니다(저장소에는 올리지 않습니다: `.gitignore`).
2. `report.json` 을 읽고 곡마다 확인합니다: `status` 가 `ok`, `license` 가 `cc0` 또는 `pd…`,
   `artist`(연주자)가 비어 있지 않을 것. 파일 페이지를 열어 올린 사람이 **자기 녹음**을 올린 것인지
   (남의 음반을 옮긴 것이 아닌지)도 봅니다. 의심스러우면 넣지 않습니다. CC BY-SA 는 쓰지 않습니다.
3. `python3 tools/music/import_handoff.py` — 모노 AAC 64 kbps·최대 6분·페이드·조용한 음량으로 줄여
   `assets/music/chant_*.m4a` 를 만들고 `lib/domain/prayer_music_extra.dart` 를 다시 씁니다.
   그러면 앱의 곡 목록과 '성화 · 음악 출처' 화면에 자동으로 나옵니다(코드 수정 없음).
4. `licenses/MUSIC.md` 표에 곡마다 한 줄(연주자·파일 페이지·라이선스)을 보탭니다.
5. `flutter test test/prayer_music_test.dart` — 파일 존재, 합계 10 MB 미만, 출처 문서 일치를 확인합니다.
6. 애가(Lamentatio)와 Dies irae 는 참회·위령 분위기라 평소 배경으로 어울리는지 들어 보고 정합니다.

## 파일
- `manifest.json`: 후보 목록(커먼즈 제목, 파일 페이지, 앱에 보일 이름)
- `download_chant.py`: 파이썬 내려받기(표준 라이브러리만)
- `rosarium_get_chant.bat`: 윈도우용(PowerShell, 설치 필요 없음)
