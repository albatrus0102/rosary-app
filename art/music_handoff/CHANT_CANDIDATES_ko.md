# 그레고리오 성가 녹음 후보 (사람 목소리)
확인일: 2026-11-16

## 한 줄 결론
조건(녹음 자체가 CC0/퍼블릭 도메인, 올린 사람이 직접 부른 것, 출처 분명)을 **확실히** 채우는 것은
위키미디어 커먼즈 사용자 **Membeth** 의 본인 녹음뿐이었습니다. 6점을 골랐고 `manifest.json` 에 넣었습니다.
**성모 찬송가(Salve Regina, Regina caeli, Alma Redemptoris Mater, Ave maris stella)는 조건에 맞는 녹음을 찾지 못했습니다**
— 커먼즈에 있는 것은 모두 CC BY-SA 이거나 미디(MIDI)·낭독입니다.

## 확인한 것 / 못 한 것
- 확인함(2026-11-16): 파일 페이지의 라이선스 틀, 작성자·출처 표기, 길이, 비트레이트, 올린 날짜,
  커먼즈 API(`extmetadata`)의 License 값, 파일 크기, SHA-1.
- **확인 못 함**: 실제 소리. 음원 서버(upload.wikimedia.org)가 HTTP 429(Retry-After 600초)를 돌려줘 한 번 시도하고 멈췄습니다.
  그래서 잡음·울림·음정·독창인지 여부는 **들어 보지 못했습니다**(설명과 파일 이름으로 보아 남성 독창으로 짐작).
- **확인 못 함**: Membeth 의 실명. 커먼즈·독일어 위키백과 모두 사용자 문서가 없습니다(필명 계정).
  다만 2007~2015년에 걸쳐 음향·조율 예시, 피아노·하프시코드 연주, 종소리, 성가 등 오디오 73점을 꾸준히
  '자기 작품'으로 올린 계정이어서 남의 음반을 옮긴 흔적은 없습니다.

## 후보 순위
모두 연주: Membeth (커먼즈 사용자, 출처 "Own work"), 형식 Ogg Vorbis, 곡은 중세 선율(저작권 없음).

| 순위 | 곡 | 길이 | 라이선스 | 근거(파일 페이지) | 묵주기도와의 어울림 |
|---|---|---|---|---|---|
| 1 | Veni Sancte Spiritus (성령 강림 부속가) | 2:37 · 2.31 MB · 123 kbps | PD-self | https://commons.wikimedia.org/wiki/File:Veni.sancte.spiritus.ogg | 영광의 신비 3단. 차분한 부속가, 길이 적당 |
| 2 | Victimae paschali laudes (부활 부속가) | 1:42 · 1.49 MB | PD-self | https://commons.wikimedia.org/wiki/File:Ostersequenz.ogg | 영광의 신비 1단 |
| 3 | Puer natus est (성탄 입당송) | 1:18 · 1.16 MB | PD-self | https://commons.wikimedia.org/wiki/File:Puer.natus.est.ogg | 환희의 신비 3단. 커먼즈 '오늘의 미디어' 이력 |
| 4 | Rorate caeli (대림 제4주일 입당송) | 1:02 · 0.90 MB | PD-self | https://commons.wikimedia.org/wiki/File:Rorate.ogg | 환희의 신비 1단(로라테 미사는 성모 신심 미사). 짧음 |
| 5 | Lamentatio III (성토요일 애가, 예레 5,1-11) | 6:09 · 6.96 MB · 158 kbps | **CC0 1.0** | https://commons.wikimedia.org/wiki/File:Lamentation.III.Karsamstag.ogg | 고통의 신비용. 참회 분위기, 가장 길다 |
| 6 (예비) | Dies irae (위령 부속가) | 7:14 · 6.26 MB | PD-self | https://commons.wikimedia.org/wiki/File:Dies.irae.ogg | 위령 성가라 평소 배경으로는 무거움. 들어 보고 결정 |

### 왜 안전한가
- 1~4·6번의 라이선스 틀(PD-self) 원문: "I, the copyright holder of this work, release this work into the public domain.
  This applies worldwide. … I grant anyone the right to use this work for any purpose, without any conditions,
  unless such conditions are required by law." → 저작자 표시 의무도 없습니다(앱에서는 예의상 표기 권장).
- 5번: "This file is made available under the Creative Commons CC0 1.0 Universal Public Domain Dedication."
- 여섯 파일 모두 출처 "Own work", 작성자 "Membeth", 올린 사람도 Membeth(2010-08-11~14, 5번은 2015-02-11), 판 기록은 1개.
- API 재확인 주소(한 번에 6점):
  `https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=imageinfo&iiprop=user|size|sha1|extmetadata&titles=File:Veni.sancte.spiritus.ogg|File:Ostersequenz.ogg|File:Puer.natus.est.ogg|File:Rorate.ogg|File:Lamentation.III.Karsamstag.ogg|File:Dies.irae.ogg`
  → License 값: `pd` 5점, `cc0` 1점. 내려받기 스크립트의 허용 목록(`cc0`, `pd`)과 맞습니다.
- 남는 위험(작음): 필명 계정이라 "본인이 불렀다"는 것은 본인 표기에 의존합니다. PD-self 는 CC0 같은 정식 문서는 아니지만
  "조건 없이 누구나 어떤 목적으로든" 이라는 대체 허락 문구가 붙어 있어 한국·EU 에서도 쓸 수 있습니다.

### SHA-1 (받은 뒤 대조용, manifest.json 에도 있음)
| 파일 | 바이트 | SHA-1 |
|---|---|---|
| Veni.sancte.spiritus.ogg | 2418909 | 56d9778c0c2d7f53460558f5f5349fd7fec977ee |
| Ostersequenz.ogg | 1562888 | 12153e4b790266bbdb5ba6b3b301bf4167182b1c |
| Puer.natus.est.ogg | 1211892 | 5e606a0898f8f8cd6dcefafe01f252af1779d39d |
| Rorate.ogg | 946785 | 4eed29927c2ab42a3298b0fe6dd52eb73299bf17 |
| Lamentation.III.Karsamstag.ogg | 7295213 | cfa5f9b250b650768339c4f0ac4dd5e9d23ad798 |
| Dies.irae.ogg | 6562097 | d13e914db3016ab43bcb89c695e501ac8fd19605 |

## 제외한 것과 이유
**(a) 위키미디어 커먼즈**
- Ad.te.levavi.VIII.Ton.ogg(17초), Factus.est.repente.VII.Ton.ogg(10초): CC0·Bautsch 본인 녹음이 맞지만 첫 소절만 있는 예시 음원 — 너무 짧음.
- Membeth 의 다른 성가: Improperia(16:37, 성금요일 비탄의 노래 — 너무 길고 무거움), Veni creator spiritus(30초), Johannes-Hymnus(41초),
  Ecce lignum Crucis(53초) — 필요하면 같은 조건(PD-self)으로 추가할 수 있습니다. Nos.autem.*.ogg 는 틀이 "Copyrighted free use"라 뺐습니다.
- 성모 찬송가: Alma Redemptoris Mater.ogg(Rick Dechance), Salve Regina.ogg, Petits Chanteurs de Passy – Salve Regina,
  Regina Caeli.wav, Schola Gregoriana-Ave Maria.ogg 등 → 모두 **CC BY-SA**(정책상 제외).
  Salve regina.ogg(Geremia, PD-self, 26초)는 노래가 아니라 라틴어 **낭독**.
- Kyrie XI.ogg, Kyrie 55, De profundis, Loquetur Dominus, Rorate Caeli ~ Gregorian Chant, Pueri hebraeorum → CC BY-SA.
- GloriaGregorianChant.ogg(CC BY 3.0, 건반 반주 자가 녹음), KevinMacLeod – Gregorian Chant(CC BY, 성가를 흉내 낸 창작곡) → 목적에 안 맞음.
- Antifona Terra Tremuit mIV.ogg: PD-self 지만 "Ensamble Lauda 음반에서 양도받음"이라고만 적혀 있어 권리 근거 불분명.

**(b) Freesound** — CC0 필터로 "gregorian chant" 검색 결과 6건뿐: 신시사이저/VST 3건, 9~31초 짜리, 남의 전례를 성당에서 녹음한
현장음(연주자 권리 미정리) → 쓸 것 없음.

**(c) Internet Archive / FMA / ccMixter** — 퍼블릭 도메인 표시가 붙은 성가 항목 27건을 봤으나 연주자 본인의 선언이 확인되는 것이 없습니다.
- GregorianChantMass: 설명이 "Sacred Polyphony by ???", 트랙 이름 "Track 2" — 음반 추출로 보임.
- SalveRegina_889(CC0 표시): 연주자·녹음 정보 없음.
- 02-f-adoro-te-devote-st(그리스 이라클리오 성 루카 성당, 2026): Public Domain Mark(선언이 아니라 표지)뿐이고 누가 불렀는지 불명.
- CantoGregoriano1h(유튜브 주소가 작성자), Abbey of St Ottilien, Escolania de Montserrat 현장 녹음 → 제외.
- EdwardYongPaschalChants: 본인 녹음·PD 선언은 맞지만 비잔틴 성가(그레고리오 성가 아님), 23~101초.

**(d) 1926년 이전 옛 음반** — 조건에 맞는 실물을 찾지 못했습니다.
- LoC National Jukebox: "gregorian" 검색 결과 없음. Internet Archive 78rpm(1900~1925): "Gregorian Choir"의 모차르트 Gloria(성가 아님),
  1902년 시스티나 성가대 Ave verum(모차르트) 정도.
- 1904년 로마 그레고리오 대회 녹음(Gramophone, Dom Pothier 등)은 목록(UCSB DAHR)에만 있고 자유 이용 가능한 원반 전사본은 못 찾았습니다.
- 법적으로는: 미국은 1925년까지 발행된 녹음이 2026-01-01부터 퍼블릭 도메인(음악현대화법), EU 는 1963년 이전 녹음이 50년으로 만료,
  한국은 1987-07-01 이전 음반에 구 저작권법(1957)이 적용되어 저작자 사후 30년(단체명의는 발행 후 30년) → 1900~1920년대 음반은 만료.
  다만 CD 복각본을 옮긴 파일은 복각 작업의 권리 문제가 남을 수 있고, 잡음이 커서 기도 배경으로는 권하지 않습니다.

## 다음 단계
1. PC 에서 `rosarium_get_chant.bat`(또는 `python download_chant.py`) 실행 → 6점을 받고 라이선스·SHA-1 재확인.
2. **들어 보기**: 잡음, 울림, 음정, 숨소리. 마음에 들지 않는 곡은 빼면 됩니다(추천 조합: 1·2·3·5번, 합계 약 12분).
3. README 의 'Claude 전달 지시'대로 가져오기. `licenses/MUSIC.md` 에는
   "노래: Membeth, Wikimedia Commons, 퍼블릭 도메인(PD-self / CC0 1.0)" 과 파일 페이지 주소를 적습니다.
4. 성모 찬송가(Salve Regina 등)를 꼭 넣고 싶다면: 직접 부르거나 아는 성가대의 녹음을 받아 CC0 로 내놓는 것이 가장 확실합니다.
