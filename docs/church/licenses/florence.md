# 산타 마리아 델 피오레(피렌체 대성당, `florence`) — 북 측랑 벽 그림 3점

2026-11-15 추가, 같은 날 C-15 로 교체. 처음에는 500px 섬네일을 잘라 만든 60KB 이하 판이었다. 사용자가 받아 올린 위키미디어 공용 사진(긴 변 2000px 사본,
`art/commons_handoff/received/` — 저장소 밖)으로 더 선명한 판을 다시 만들었다. 라이선스·저작자는 인계 목록(`art/commons_handoff/manifest.json`, 확인일 2026-11-15) 기준이다
(이 환경에서는 커먼즈가 429 로 막혀 파일 설명 페이지를 다시 열어 보지 못했다 — 호크우드는 앞서 API 로 CC BY 3.0·Sailko 를 확인한 그 파일이다).

| 자리 | 작품 | 원본 파일 | 사진 · 라이선스 | 변경 | 판 |
|---|---|---|---|---|---|
| 2칸(z 17.85) | 안드레아 델 카스타뇨 〈니콜로 다 톨렌티노 기마 기념상〉 1456, 프레스코(캔버스로 옮김) | [Andrea del castagno, Monumento equestre di Niccolò da Tolentino, 1456, 01.JPG](https://commons.wikimedia.org/wiki/File:Andrea_del_castagno,_Monumento_equestre_di_Niccol%C3%B2_da_Tolentino,_1456,_01.JPG) (1776×2728) | 원작 Public domain · 사진 **Sailko, [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/)** | 그려진 틀의 네 귀를 잡아 원근 보정(위가 좁은 사다리꼴 → 직사각형), 틀 끝에서 자르기, 밝기 +6%, 축소 | 760×1208, WebP q77, 185KB |
| 3칸(z 13.7) | 파올로 우첼로 〈존 호크우드 기마 기념상〉 1436, 프레스코 | [Paolo uccello, Monumento equestre di John Hawkwood, 1436, 01-edit.jpg](https://commons.wikimedia.org/wiki/File:Paolo_uccello,_Monumento_equestre_di_John_Hawkwood,_1436,_01-edit.jpg) (1773×2845) | 원작 Public domain · 사진 **Sailko(편집본 올린이 MenkinAlRire), [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/)** | 그려진 틀 끝에서 자르기, 축소(편집본이 이미 반듯해 원근 보정은 하지 않음) | 760×1208, WebP q80, 188KB |
| 4칸(z 5.55) | 도메니코 디 미켈리노 〈단테와 신곡〉 1465, 캔버스 템페라 | [Dante Domenico di Michelino.jpg](https://commons.wikimedia.org/wiki/File:Dante_Domenico_di_Michelino.jpg) (밝기 보정본, 촬영자 미상 / MuseoFirenze) | 원작 Public domain · 사진 **PD-Art** | 사진에 든 회색 틀 안쪽만 자르기(네 귀 보정), 축소 | 1024×824, WebP q77, 189KB |

고른 까닭: 호크우드는 A(원본)·B(편집본) 가운데 B — 틀이 이미 반듯하고 색이 고르다. 톨렌티노는 A — B(834×1224)보다 해상도가 두 배이고 틀 전체가 들어 있다.
단테는 B — A 는 어둡고 위가 좁게 찍혔고, B 는 정면이고 색이 살아 있다. 틀 크기: 기마상 2.32 × 3.69m(그대로), 단테는 그림 비율(1.243)에 맞춰 1.74 × 1.4m.

만드는 법: `python3 tools/commons_art/make_commons_art.py florence` → `art/images_src/florence/*.webp` → `node tools/church_web/build_art_florence.mjs` → `assets/church/art_florence.js`(data URI, 749KB).
`ch_florence.js` 가 그 성당에 들어올 때만 읽는다(읽기 전·실패 때는 어두운 빈 화면 + 돌 틀).
표기: 앱 '성화 출처' 화면·OSS 라이선스 화면(`lib/domain/art_credits.dart` churchArtCredits)에 저작자·라이선스·원본 주소·변경사항.
주의: 단테 사진은 PD-Art(나라에 따라 인정되지 않을 수 있음), 세 점 모두 이탈리아 문화유산법의 영리 이용 제한 대상일 수 있다 — 비상업 전제(`ASSET_LICENSES.md` 'C-15 메모').
