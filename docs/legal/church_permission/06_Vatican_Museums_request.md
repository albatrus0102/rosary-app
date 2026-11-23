# 06. 바티칸 박물관 — 프레비아티 〈십자가의 길〉 사진 게재 문의 (법률 검토 M8)

작성일: 2026-11-16 · 근거: `docs/legal/LEGAL_REVIEW_2026-11.md` §2, M8 · 개인 정보는 모두 `〔 〕` 자리 표시(보내기 직전에 채운다).

## 2026-11-23 개정 — 무엇이 바뀌었나

- **근거 분류 (c): 작품의 저작권은 끝났다**(프레비아티 1920년, 라파엘로 1520년 사망). 여쭙는 것은 저작권 이용 허락이 아니라 **소장 기관의 복제 규칙**(방문자 촬영 「개인·가정 용도」, 이미지 이용 절차, 바티칸 시국 저작권법(2011년 3월 19일 법률 제CXXXII호))이 우리 같은 제3자의 재사용에 적용되는지와, **이의가 없는지**다.
- 보낼 본문을 **이탈리아어판 (다)** 로 바꾸었다(앱을 만든 까닭 · 왜 여쭙는지 · 선택지 · 답에 따라 하는 일 포함). 아래 (가) 영어판과 (나) 한국어판은 **이전 판**이며 참고로 남긴다 — 필요하면 (가)를 이탈리아어 본문 아래에 덧붙여 보내도 된다. 전화번호 자리 표시는 지웠다(전자우편으로만 연락).
- 다른 곳과 **같은 날 한꺼번에** 보낸다. 자료: `package/vatican-museums/`.
- 현재 상태(2026-11-23 확인): 맨 아래 「준비해 둔 대안」의 뜻은 `lib/app/release_gate.dart`(`hiddenStationSeriesIds = {'previati'}`, `stationSeriesOverrides`)로 **이미 배포판에 적용**돼 있다 — 프레비아티는 숨겨져 있고 성 베드로에는 1897년 석판화가 걸리며, 〈거룩한 변모〉 배경도 숨겨져 있다. 허락을 받으면 다시 연다. 답이 없거나 거절이면 지금 상태 그대로 간다.

## 0. 보낼 곳

| 받는 곳 | 연락처 | 확인 |
|---|---|---|
| **바티칸 박물관 이미지·저작권 사무실**(Images and Copyright Office) | **id.musei@scv.va** (이 사무실이 이미지 이용 요청의 공식 창구. 같은 페이지에 일반 문의 info.musei@scv.va, 관장실 musei@scv.va 도 있으나 이미지 요청용이 아님) | 2026-11-16 https://www.museivaticani.va/content/museivaticani/en/organizza-visita/servizi-per-i-visitatori/immagini-e-diritti.html ("Images and Copyright") — 이미지는 "연구·출판·전시·개인 용도"로 제공될 수 있고, 제공·이용은 "정해진 경제적·규정 절차"를 따른다고 안내. 비상업 이용의 구체 절차·양식·비용은 그 페이지에 없고 사무실에 문의하라고 되어 있음 |

- 전자우편 한 통으로 보낸다(전화 없음). 영어판을 본문으로, 한국어판은 사용자가 내용을 확인하는 용도다(사무실은 이탈리아어·영어로 응대하므로 필요하면 이탈리아어 번역을 덧붙인다).
- 같은 메일에 라파엘로 〈거룩한 변모〉(바티칸 피나코테카, 앱의 '빛의 신비 4단' 배경)도 함께 묻는다(아래 본문에 포함).
- 답이 오면 `docs/legal/church_permission/replies/` 에 보관한다.

---

## (가) 영어판 — 〔이전 판, 참고용. 보낼 본문은 아래 (다) 이탈리아어판〕

To: id.musei@scv.va
Subject: Permission request: photographs of Previati's Via Crucis in a free, non-commercial prayer app

Dear Images and Copyright Office,

My name is 〔성명〕, a Catholic layperson from 〔소속 본당〕 in 〔교구명〕, South Korea. I am developing a free Android prayer app called "Rosarium" that helps users pray the Rosary and the Stations of the Cross. It is entirely non-commercial: there are no ads, no paid features and no donations, and I publish it as an individual. It is not an official service of the Church.

I would like to ask whether I may use, at low resolution, two groups of images of works in the Vatican collections:

1. Gaetano Previati, "Via Crucis" (1901-02), the fourteen panels in the Collection of Modern Religious Art of the Vatican Museums. The app would show the 14 panels as the pictures for the Stations of the Cross (for a virtual St. Peter's Basilica), each shown with a caption.
2. Raphael, "The Transfiguration" (Pinacoteca Vaticana), as a small background image for one Luminous Mystery meditation.

The images I would use are not my own photographs. They are visitors' photographs published on Wikimedia Commons, licensed CC BY 3.0:
- Previati panels: photographs by Sailko, category https://commons.wikimedia.org/wiki/Category:Via_Crucis_by_Gaetano_Previati (14 files, {{self|cc-by-3.0}}).
- Raphael: the Google Art Project image on Wikimedia Commons (marked public domain, PD-Art).

How the images would be used:
- Free app, distributed through Google Play. No advertising, no sale, no sponsorship.
- Reduced size (about 1280 px at most), frame cropped, with the credit line: the title and artist, "Vatican Museums", the photographer's name (Sailko), the CC BY 3.0 licence and its link, the Commons source link, and a note that the image was cropped and reduced.
- The app states that it is not an official service of the Church and does not imply any endorsement by the Vatican Museums.

My questions:
1. May I show these photographs in the app under the conditions above? If a permission or licence from the Vatican Museums is needed, what are the procedure and any conditions or fees for a free, non-commercial use?
2. Are the Vatican Museums' visitor photography rules ("personal and domestic use only") applicable to a third party like me who reuses photographs already published on Wikimedia Commons under CC BY 3.0?
3. Is there a credit line you would like me to use, or any wording I should avoid?
4. If you prefer that I not use these images, please tell me, and I will remove them from the app. I would replace them with other works.

I will not publish the app with these images until I hear from you, and I will remove them at once if you ask me to, also after publication. I can send screenshots of how the images would appear.

Thank you very much for your time. May peace be with you.

Sincerely,
〔성명〕 〔세례명〕
〔소속 본당〕, 〔교구명〕, South Korea
〔이메일〕

---

## (나) 한국어판 (사용자 확인용)

받는 곳: id.musei@scv.va (바티칸 박물관 이미지·저작권 사무실)
제목: [문의] 무료 비상업 기도 앱에 프레비아티 〈십자가의 길〉 사진을 싣는 일

바티칸 박물관 이미지·저작권 사무실 담당자님께

저는 대한민국 〔교구명〕교구 〔소속 본당〕 본당 신자 〔성명〕 〔세례명〕입니다. 묵주 기도와 십자가의 길을 바치도록 돕는 무료 안드로이드 앱 「로사리움」을 개인으로 만들고 있습니다. 광고, 유료 기능, 후원 모금이 없는 완전 비상업 앱이며, 교회의 공식 서비스가 아닙니다.

바티칸 소장품을 찍은 두 묶음의 그림을 낮은 해상도로 싣고자 하여 여쭙니다.

1. 가에타노 프레비아티 〈십자가의 길〉(1901–02), 바티칸 박물관 현대 종교 미술 컬렉션의 14점. 가상 성 베드로 대성전의 십자가의 길 14처 그림으로, 설명 글과 함께 보여 줍니다.
2. 라파엘로 〈거룩한 변모〉(바티칸 피나코테카). 빛의 신비 한 단의 묵상 화면에 작은 배경 그림으로 씁니다.

쓰려는 그림은 제가 찍은 사진이 아니라 위키미디어 커먼즈에 CC BY 3.0 으로 올라온 방문자 사진입니다.
- 프레비아티: Sailko 촬영, https://commons.wikimedia.org/wiki/Category:Via_Crucis_by_Gaetano_Previati (14개 파일, CC BY 3.0).
- 라파엘로: 커먼즈의 Google Art Project 이미지(퍼블릭 도메인, PD-Art 표시).

사용 방식은 다음과 같습니다.
- 구글 플레이로 배포하는 무료 앱. 광고·판매·후원 없음.
- 작은 크기(가로세로 최대 약 1280px)로 줄이고 액자를 잘라 냄. 작품명·작가·"바티칸 박물관"·촬영자(Sailko)·CC BY 3.0 이름과 주소·커먼즈 원본 주소·"잘라 내고 줄였음" 표기를 함께 밝힘.
- 앱이 교회의 공식 서비스가 아니며 바티칸 박물관의 후원·보증을 뜻하지 않음을 밝힘.

여쭙는 것은 다음과 같습니다.
1. 위 조건으로 이 사진들을 앱에 실어도 되는지요. 바티칸 박물관의 허락이나 이용 계약이 필요하다면, 무료 비상업 이용의 절차와 조건·비용을 알려 주시기 바랍니다.
2. 박물관의 방문자 촬영 규칙("개인·가정 용도")이, 이미 위키미디어 커먼즈에 CC BY 3.0 으로 공개된 사진을 다시 쓰는 저 같은 제3자에게도 적용되는지요.
3. 쓰기를 원하시는 출처 표기 문구나 피해야 할 표현이 있는지요.
4. 쓰지 않았으면 하시면 말씀해 주십시오. 앱에서 빼고 다른 작품으로 바꾸겠습니다.

답을 받기 전에는 이 그림을 넣은 채로 배포하지 않겠습니다. 요청하시면 배포한 뒤에라도 바로 빼겠습니다. 실제 화면이 어떻게 보이는지 캡처를 보내 드릴 수도 있습니다.

바쁘신 가운데 살펴 주셔서 감사합니다. 주님의 평화를 빕니다.

〔성명〕 〔세례명〕 올림
〔소속 본당〕, 〔교구명〕교구 · 〔이메일〕

---

## (다) 이탈리아어판 — 2026-11-23 개정, **보낼 본문**

A: id.musei@scv.va
Oggetto: App di preghiera gratuita «Rosarium»: una domanda su due fotografie (Previati, Raffaello) — basta rispondere con un numero

Spettabile Ufficio Immagini e Diritti dei Musei Vaticani,

mi chiamo 〔성명〕 (nome di battesimo: 〔세례명〕) e sono un fedele laico cattolico della parrocchia 〔소속 본당〕, 〔교구명〕, Corea del Sud. A titolo personale sto preparando «Rosarium», un’app gratuita e non commerciale (senza pubblicità né pagamenti) che aiuta a pregare il Rosario e la Via Crucis. Non è ancora pubblicata.

Vorrei mostrare nell’app, a bassa risoluzione e con la dicitura completa, le fotografie di due opere delle Vostre collezioni già pubblicate su Wikimedia Commons con licenza libera: la «Via Crucis» di Gaetano Previati (quattordici tavole) e la «Trasfigurazione» di Raffaello. Le opere non sono più protette dal diritto d’autore, ma sono custodite da Voi e so che l’uso delle immagini segue le Vostre regole: per questo lo chiedo a Voi prima di usarle. Oggi non sono nell’app. L’app è pensata con riverenza: serve soltanto a pregare, e nulla in essa imita la Messa o i Sacramenti.

Basta rispondere a questa e-mail con un numero:

① Nessuna obiezione, alle condizioni descritte.
② Sì, a queste condizioni (dicitura, procedura, eventuale compenso): ______
③ Preferiamo che queste immagini non siano usate (non le userò).

In allegato trovate una scheda con tutti i dettagli (chi sono e perché ho fatto l’app, le immagini, le fonti e le licenze, la dicitura, le voci più specifiche), 4 schermate e il link a un breve video: 〔YouTube 링크〕

Se questa richiesta spetta a un altro ufficio, Vi sarei grato se voleste inoltrarla. Grazie di cuore per il tempo che vorrete dedicarmi. La pace del Signore sia con Voi.

〔성명〕 〔세례명〕
〔소속 본당〕, 〔교구명〕, Corea del Sud
〔이메일〕

---

## (라) 한국어 요약 — 2026-11-23 개정(사용자 확인용)

- **2차 개정(2026-11-23, 짧은 편지)**: 보낼 본문을 약 251 낱말로 줄였다(이전 약 1324 낱말). 본문에는 누구인지 · 앱 한 문장(무료·비상업, 경건함 한 줄) · 무엇을 왜 여쭙는지 · **선택지 셋**(① 이의 없음·허락 ② 조건·고칠 점 ③ 싣지 않기를 원함) · 붙임만 있다. 아래 항목 가운데 「앱을 만든 까닭」「경건함을 지키기 위해 한 일」「근거」「자세한 설명」「세부 선택지(요약에서는 D1, D2 …)」「답에 따라 하는 일」「답이 없을 때」는 **편지가 아니라 붙이는 요약 `package/vatican-museums/summary.md` 의 「자세한 내용」** 에 옮겨 두었다(빠진 것 없음). 불교계·다른 앱 이야기는 뺐다(「최근 종교 메타버스 앱들이 주목받으면서 … 경건함을 지키며 기도문을 정확히 담은 앱이 필요하다고 느꼈다」로 바꿈).
- **유료 견적이 오면 쓰지 않는다**(README 8-1): 무료·비상업 앱이고 비용을 개인이 부담하므로, 요금이 붙으면 그 이미지를 쓰지 않는다. 무료 조건일 때만 서식을 낸다. 요약의 「자세한 내용」에 그렇게 적었다.
- 바티칸 저작권법은 2011년 3월 19일 법률 제CXXXII호로 고쳐 적었다(2017년은 국무원 성명). 「문화재 복제물을 보호한다」는 확인되지 않은 풀이는 뺐다.
- 받는 곳: 바티칸 박물관 이미지·저작권 사무실 · `id.musei@scv.va`
- 요약에 **앱을 만든 까닭**을 사용자 말 그대로 한 절로 적었다.
- 요약에 **경건함을 지키기 위해 한 일** 절을 두고, 편지에는 한 줄로 줄였다(2026-11-23, 코드에서 확인한 사실만): 제단 출입 금지 구역 · 미사·성사 흉내 없음 · 기도하는 동작만(초는 봉헌대에서만, 성호 긋기 단추는 성수대가 있는 성당에서만) · 대화 기능 없음(지향은 정해진 문구) · 기도문 대조 · 전례력 · 실제와 다르다는 고지 · 광고·결제·정보 판매 없음. 다른 사례나 다른 앱 이야기는 더하지 않았다.
- **무엇을 여쭙는가(근거 분류 c)**: 프레비아티 〈십자가의 길〉 14점과 라파엘로 〈거룩한 변모〉의 사진(위키미디어 커먼즈, CC BY 3.0 / PD-Art)을 낮은 해상도로 실어도 되는지. 두 작품은 저작권이 끝났으므로 작품에 대한 허락이 아니라, 박물관의 규칙 — 방문자 촬영은 「개인·가정 용도」만, 이미지 이용은 정해진 절차, 바티칸 시국 저작권법(2011년 3월 19일 법률 제CXXXII호)의 문화재 복제물 보호 — 이 커먼즈 사진을 다시 쓰는 제3자에게도 적용되는지를 묻는다. 확실하지 않다고 적고, 다른 절차가 있으면 바로잡아 달라고 했다.
- **선택지**: ① 적은 조건대로 써도 됨(기본) ② 표기·조건을 달아 허락 ③ 박물관의 계약·절차 필요(절차·비용) ④ 공식 이미지를 주거나 박물관 누리집 링크를 실을 것 ⑤ 쓰지 않기를 원함 ⑥ 방문자 규칙이 커먼즈 재사용자에게도 적용되는지(예/아니오)
- **답에 따라**: ① 적은 표기로 싣는다 ② 알려 준 대로 ③ 절차를 마치기 전에는 쓰지 않는다 ④ 공식 이미지를 쓰거나 링크를 싣는다 ⑤ 쓰지 않는다.
- **답이 없으면**: 쓰지 않는다. 지금처럼 프레비아티 자리에는 1897년 석판화, 〈거룩한 변모〉 자리에는 그림 없는 배경을 둔다.
- 허락을 받으면 그 범위를 앱 안에 밝혀 적고, 범위를 넘는 요소는 더하지 않는다. 필요하면 지정하는 분께 앱 검수를 청한다.
- 자료: 한 쪽 요약(PDF, 이탈리아어) · 영상 1~2분 〔YouTube 링크〕 · 화면 캡처 4장. APK 는 보내지 않는다.

## 별첨 — 보낼 때 첨부할 것

- 14처 판·묵상 시트의 앱 화면 캡처(프레비아티가 보이는 장면, 출처 줄이 보이는 화면) 1~3장 — 성 베드로 대성전의 14처 판(`stpeter`), 성화 출처 화면
- 출처 표기 문구 전문(`lib/domain/art_credits.dart`, `data/stations_series.json` `previati`)

## 준비해 둔 대안(fallback) — 적용하지 않음, 필요할 때 그대로 실행

**발동 조건**: 출시 날까지 답이 없거나 거절 · 조건부(우리가 못 지키는 조건)일 때. 답이 오면 `docs/legal/church_permission/replies/` 에 보관하고 이 절은 닫는다.

**목표**: 성 베드로(`stpeter`) 성당의 14처를 PD/CC0 연작으로 바꾸고, 프레비아티 연작을 번들·칩 목록에서 완전히 뺀다.

1. `data/stations_series.json`: `"assignments"` 의 `"stpeter": "previati"` → `"stpeter": "oreilly"` (또는 `"fugel"`; 둘 다 PD. 연작 배정은 성당마다 겹쳐도 된다 — 지금 `lateran` 이 `oreilly`). 같은 파일의 `"series"` 배열에서 `"id": "previati"` 항목을 삭제한다.
2. 생성기 다시 실행(`data/stations_series.json` 머리말의 순서): `python3 tools/stations/fetch_series.py && python3 tools/stations/build_series.py && python3 tools/stations/build_stations.py` — `assets/church/cross_data.js`(+`cross_pack_previati.js` 항목), `lib/domain/stations_series_data.dart` 가 다시 만들어진다. `cross_pack_previati.js` 가 더 이상 목록에 없는지 `assets/church/cross_data.js` 의 `"file":` 줄로 확인한다.
3. 번들에서 파일 삭제: `rm -r assets/images/stations/previati/ assets/church/cross_pack_previati.js` 그리고 `pubspec.yaml` 의 `- assets/images/stations/previati/` 줄 삭제.
4. 시험 고치기: `test/stations_series_test.dart` 의 `forChurch('stpeter').id` 기대값(101행 근처, `'previati'` → 새 연작 id), `byId('previati')`(163행 근처) 항목 삭제, 연작 개수·칩 개수 기대값. `flutter test test/stations_series_test.dart test/art_credits_test.dart` 로 확인.
5. 문서 고치기: `docs/ux/STATIONS_OF_CROSS.md` 의 연작 표(74행 근처)·위험 1, `docs/legal/LEGAL_REVIEW_2026-11.md` §2 표, `docs/church/ASSET_LICENSES.md` 의 프레비아티·Sailko 줄(성화 출처 화면은 데이터에서 자동으로 빠짐).
6. 〈거룩한 변모〉(`assets/images/mysteries/luminous_4.webp`, `lib/domain/art_credits.dart` 76행 근처)도 거절 시 다른 작품으로 바꾼다 — 바티칸·이탈리아 국가 소장품이 아닌 PD 그림(예: 이탈리아·바티칸 밖 소장품)을 고르고 `tools/stations/build_art.py` 의 목록과 출처 표기를 함께 고친다.
7. 확인: `flutter analyze` → `flutter test` → `node --test "tools/church_web/*.test.mjs"` → `bash tools/check_release_apk.sh <APK>`.
