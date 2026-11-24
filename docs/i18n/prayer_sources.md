# 언어·변종별 기도문 공식 출처와 저작권·허락 상태

> **🚩 2026-11-24 LEV(교황청 출판사 Libreria Editrice Vaticana) 사용 허락 거절 — 이 문서에서 Compendium(© 2005 LEV)에서 나온 것은 쓰지 않는다.** LEV는 개인에게 허락할 수 없고 해당 문서는 이미 다른 출판사에 허락돼 있다고 답했다(`docs/legal/church_permission/STATUS.md` P1, README §8-1: 분명한 거절 = 뺀다). 따라서 **Compendium 에서 옮긴 언어별(en·es·it·pt) 번역·판본, 신비 이름·묶음 이름, 악센트 달린 라틴어 본문은 쓰지 않는다.** 아래 표에서 해당 행은 **「⛔ LEV 거절 2026-11-24」**로 표시했다. 웹 데모(`web_demo/gen_prayers.mjs`)는 이미 이 출처를 끊고 해당 기도를 「공식 본문을 받는 대로 넣습니다」 자리로 남겼다. 주교회의 자체 쪽(CEI 현행 주님의 기도·CNBB 「Como rezar o Terço?」·USCCB)에서 받은 본문만 남는다.

> 작성: Claude Opus 5.5 (웹 검색·가져오기, 2026-11-23 UTC). 접속 제한을 우회하지 않았다(USCCB 누리집은 403 응답이라 본문을 가져오지 못했다 → 해당 항목은 「추정」).
> 표시: **확인** = 이번에 해당 URL을 직접 열어 내용을 봤거나, 검색 결과에서 그 페이지와 문구를 확인함 · **추정** = 일반 지식이나 간접 근거뿐이라 착수 때 원문 대조 필요.
> **법률 의견이 아니다.** 저작권 판단은 변호사·저작권자 회신으로 확정한다.
> **2026-11-23 추가(§10)**: 사용자가 ChatGPT 웹 검색으로 확인해 전달한 공식 출처 주소를 맨 아래 §10 표에 모았다. 위 §2~§7 의 「추정」 가운데 §10 에 있는 항목은 §10 이 우선한다.

## 0. 앱이 쓰는 기도 목록(바꿔야 할 단위)

`lib/domain/prayer_data.dart`·`data/stations_prayers.json` 기준.
- 묵주기도: 성호경 · 사도신경 · 주님의 기도 · 성모송 · 영광송 · 구원을 비는 기도(파티마) · 성모 찬송(Salve Regina) · 성모 찬송 응송과 마침 기도(「천주의 성모님, 저희를 위하여 빌어 주시어…」 + 「하느님, 외아드님께서…」, 라틴어 Deus, cuius Unigenitus)
- 신비 4종 이름과 20단 제목. 한국어에는 단마다 「…을 묵상합시다」 선포문이 있다
- 「외운 기도 짧게」 첫 줄, 선창·후창 경계
- 십자가의 길: 14처 명칭, 공식 기도문 125줄(한국 『가톨릭 기도서』 구성), 계응
- 전례 시기·대축일 이름 54
- **호칭기도(성모 호칭 기도)는 앱에 없다.** grep 결과 `church_catalog.dart`·`liturgical_season.dart`의 언급뿐이고 본문은 없다

## 1. 공통 출처(언어를 가로지르는 것)

| 출처 | 무엇 | 저작권·허락 | 상태 |
|---|---|---|---|
| ⛔ LEV 거절 2026-11-24 — 교황청 『가톨릭 교회 교리서 요약(Compendium)』 부록 A 「공통 기도」, vatican.va. en https://www.vatican.va/archive/compendium_ccc/documents/archive_2005_compendium-ccc_en.html · es `…_sp.html` · it `…_it.html` · pt `…_po.html`(추정) | 성호경·영광송·성모송·Salve Regina 등 24편과 **「묵주기도」 항목(신비 4종 이름과 20단 이름)**. **각 언어 옆에 라틴어**가 있다 | 「© Copyright 2005 – Libreria Editrice Vaticana」(en 페이지 머리, **확인**). 기도문 자체는 대부분 전통문이지만, **번역문과 편집물의 권리는 LEV** | 부록 구성·라틴어 병기·신비 이름: **확인**(en·es·it 직접 열람). en「The Joyful Mysteries / Mystéria gaudiósa」, es「Misterios gozosos… La encarnación del Hijo de Dios」, it「Misteri della gioia… L'annuncio dell'Angelo a Maria / Annuntiátio」 |
| 교황 요한 바오로 2세 『동정 마리아의 묵주기도(Rosarium Virginis Mariae)』 2002, vatican.va 각 언어판 | 빛의 신비 다섯 이름, 신비 배분(요일) | 교황 문서의 권리는 **LEV가 영구·전 세계 관리**. 2005년 국무원장 교령 — https://www.vatican.va/roman_curia/institutions_connected/lev/docs_lev/copyright_en.htm(**확인**). 「명시적 허락 없이 출판·번역·복제 금지」 문구는 1978년 교령(**확인**) | 허락처: LEV 해외 저작권 담당 https://www.libreriaeditricevaticana.va/en/content/16-foreign-rights, segreteria.lev@spc.va(검색 결과로 **확인**, 절차·요금은 미확인) |
| 전통 라틴어 본문(Pater noster, Ave Maria, Gloria Patri, Symbolum Apostolorum, Salve Regina, Deus cuius Unigenitus) | 라틴어 토글의 본문 | 수백 년 된 전례·신심 본문이라 **공유 저작물**(추정). 다만 특정 판본의 강세 부호·편집은 그 판본의 것이다 | 추정 |
| Wikidata(성인 항목 라벨) | 세례명·성인 이름의 언어별 표기 | CC0 | 추정(사용 시 항목별 확인) |

## 2. 영어 — en-US

| 항목 | 권장 출처 | 저작권·허락 | 표시 |
|---|---|---|---|
| ⛔ LEV 거절 2026-11-24 — 성호경·주님의 기도·성모송·영광송 | 전통 영어문(「Our Father, who art in heaven…」「Hail Mary, full of grace…」「Glory be to the Father…」). USCCB 「Prayers of the Rosary」 https://www.usccb.org/prayer-and-worship/prayers-and-devotions/rosaries/prayers-of-the-rosary · Compendium 영어 부록 | 전통문은 공유 저작물(추정). USCCB 페이지 본문을 그대로 베끼면 USCCB 웹 콘텐츠다. **USCCB 허락 정책은 「인터넷 게시용 문서 자료는 현재 허락하지 않는다」**는 문구가 있다(검색 결과, 날짜 미상) | URL은 **확인**(검색 결과에 있음). 본문은 403이라 못 열었다 → **추정** |
| 사도신경 | ① 『로마 미사 경본』 2010 ICEL 번역(「I believe in God, the Father almighty, Creator of heaven and earth, and in Jesus Christ, his only Son, our Lord…」) ② 묵주기도 책자의 전통 번역 | ① **© 2010 ICEL**(https://www.icelweb.org/copyright.htm, **확인**: Roman Missal © 2010). 판매용 출판물은 로열티 대상, 일회성 비영리 인쇄는 무료 조건 있음. 연락처 permission@eliturgy.org, 1100 Connecticut Ave NW Suite 710, Washington DC(**확인**) ② 공유 저작물(추정) | ①확인 ②추정 |
| 구원을 비는 기도(파티마) | 「O my Jesus, forgive us our sins, save us from the fires of hell; lead all souls to heaven, especially those in most need of thy mercy.」(미국 묵주기도 책자의 공통형) | 1917년 발현 전승 기도의 영어 번역. 공유 저작물로 널리 취급(추정) | 추정 |
| 성모 찬송·응송·마침 기도 | USCCB 「How to Pray the Rosary」 https://usccb.org/how-to-pray-the-rosary: Hail Holy Queen 뒤 「V. Pray for us, O holy Mother of God. R. That we may be made worthy of the promises of Christ.」와 마침 기도 | 검색 요약으로 응송 문구는 **확인**, 마침 기도 본문은 미확인. 마침 기도(「O God, whose only begotten Son…」)의 전통 번역은 공유 저작물(추정) | 부분 확인 |
| ⛔ LEV 거절 2026-11-24 — 신비 이름 | Compendium 영어 부록 + RVM 영어판(빛의 신비) | LEV(§1) | 확인(Compendium) |
| 단 선포문(「…을 묵상합시다」에 해당) | **영어에는 공식 선포문이 없다**(추정). 제목과 성경 장절(예: Lk 1:26-38)만 쓴다. USCCB 묵주기도 소책자 PDF(https://www.usccb.org/resources/Final%20Rosary_Booklet%2004.23.2025_0.pdf)에 묵상·장절 구성이 있으나 열람 못 함 | 소책자는 USCCB 저작물 → 쓰려면 허락 | 추정 |
| 십자가의 길 | 처 명칭·계응 「We adore you, O Christ, and we praise you. Because by your holy cross you have redeemed the world.」 | 전통문(추정). 특정 교구 기도서 본문은 그 발행처의 것 | 추정 |
| 전례 시기 이름 | 『로마 미사 경본』·『전례주년 일반 규범』 영어(ICEL): Advent, Christmas Time, Ordinary Time, Lent, Easter Triduum, Easter Time | 낱말 이름은 저작권 대상이 아니라고 봄(추정) | 추정 |
| 교회 인가 | USCCB 전례위 「출판 지침」(2025-06-15 승인): 기도서·교리 자료에는 교구장 인가(임프리마투르) 필요 — https://www.usccb.org/committees/divine-worship/policies/guidelines-for-the-publication-of-liturgical-books | 앱이 「기도서」에 해당하는지는 교구에 문의 | 검색 결과로 **확인**(앱 적용 여부는 추정) |

**누구에게 묻나.** ICEL(permission@eliturgy.org, ICEL 본문을 쓸 때만) · USCCB 허락 담당(CCD Permissions, 202-541-3098, 검색 결과) · 사용자 거주 교구(인가 문의).

## 3. 영어 — en-GB / IE

| 항목 | 출처 | 저작권·허락 | 표시 |
|---|---|---|---|
| ⛔ LEV 거절 2026-11-24 — 기본 기도 전체 | 잉글랜드·웨일스 주교회의 전례국 「Traditional Prayers」 https://liturgyoffice.org/Prayer/Traditional/index.shtml: Compendium의 공통 기도 목록(Lord's Prayer·Glory Be·Hail Mary·Salve Regina·Rosary…) | 페이지에 「© CBCEW」, 「Compendium은 잉글랜드·웨일스에서 Catholic Truth Society가 펴냄」이라고 적혀 있다(**확인**). 본문은 하위 페이지에 있어 이번에 열지 않음 | 목록 **확인**, 본문 추정 |
| 저작권 안내 | https://liturgyoffice.org/Resources/Copyright/index.shtml: 전례문 대부분은 ICEL. 비영리 일회성 복제는 무료지만, 상설·상업 출판물은 권리자에게 직접 문의. 『Divine Office』(1974)는 잉글랜드·웨일스·호주·아일랜드 주교단 저작권 | **확인**. 전통 기도문의 자유 이용 여부는 언급 없음 | 확인 |
| US와의 차이 | 사도신경·주님의 기도는 ICEL 2010을 함께 쓴다. 차이는 철자(-our)·작은 표현 수준(추정). **변종 파일을 따로 두되 대부분은 en-US와 같은 본문**을 예상한다 | — | 추정 |
| 아일랜드 | 아일랜드 주교회의(catholicbishops.ie) | 미조사 | 추정 |

**누구에게 묻나.** Liturgy.Office@cbcew.org.uk(일반 문의, **확인**) · ICEL · Catholic Truth Society(Compendium 영국판).

## 4. 스페인어 — es-ES · es-419

| 항목 | 출처 | 저작권·허락 | 표시 |
|---|---|---|---|
| ⛔ LEV 거절 2026-11-24 — 기본 기도·신비 | Compendium 스페인어 부록(`…_sp.html`): Ave María 「Dios te salve, María, llena eres de gracia;」 · Gloria 「Gloria al Padre y al Hijo y al Espíritu Santo.」 · Salve 「Dios te salve, Reina y Madre de misericordia,」 · 신비 「Misterios gozosos (lunes y sábado): La encarnación del Hijo de Dios」, 「Misterios luminosos (jueves): El Bautismo de Jesús en el Jordán」, 「dolorosos: La Oración de Jesús en el Huerto」, 「gloriosos: La Resurrección del Hijo de Dios」 | LEV | **확인**(직접 열람) |
| es-ES 전례 개정문(Padre nuestro·Credo) | 스페인 주교회의(CEE) 『Misal Romano』 3판: 2016-07-25 제95차 총회 승인, 교황청 인준(검색 결과 **확인**). Padre nuestro 「no nos dejes caer en la tentación」은 스페인에서 오래 써 온 형태(추정) | CEE 전례서 권리(Coeditores Litúrgicos 등, 추정) | 부분 확인 |
| es-419 | 멕시코: 『Misal Romano』 3판 「© 2014 USCCB – Conferencia Episcopal Mexicana」 표기 사례(USCCB 자료, 검색 결과 **확인**). 중남미 공통본(CELAM) 문서는 찾지 못함 | CEM·USCCB 공동 권리(확인된 표기) | 부분 확인 |
| 차이(es-ES ↔ es-419) | 기도문 자체는 대부분 같고(Padre nuestro·Ave María·Gloria), 차이는 사도신경 일부 어구, 파티마 기도 형태(「Oh Jesús mío, perdona nuestros pecados…」 변형), 응송 표현(추정) | — | 추정 |
| 파티마 기도 | 지역마다 형태가 여럿이다. 국가별 주교회의 묵주기도 안내문에서 하나를 고른다 | — | 추정 |

**누구에게 묻나.** CEE 전례위원회(Comisión Episcopal para la Liturgia, conferenciaepiscopal.es, 추정) · CELAM 전례 부서(celam.org, 추정) · CEM(cem.org.mx)·Buena Prensa(멕시코 전례서 발행처, 추정).

## 5. 이탈리아어 — it-IT

| 항목 | 출처 | 저작권·허락 | 표시 |
|---|---|---|---|
| ⛔ LEV 거절 2026-11-24 — 기본 기도·신비(옛 형태) | Compendium 이탈리아어 부록(`…_it.html`): Padre nostro 「e non ci indurre in tentazione」(**2005년 옛 형태**), Gloria al Padre, 신비 「Misteri della gioia: L'annuncio dell'Angelo a Maria」, 「della luce: Il battesimo di Gesù al Giordano」, 「del dolore: Gesù nell'orto degli ulivi」, 「della gloria: Gesù risorge da morte」, 라틴어 병기 「Annuntiátio」·「Baptísma apud Iordánem」·「Agonía in Hortu」·「Resurréctio」 | LEV | **확인**(직접 열람) |
| **현행 Padre nostro·Gloria** | CEI 『Messale Romano』 3판(2020): 「non abbandonarci alla tentazione」, Gloria 「pace in terra agli uomini, amati dal Signore」. 2018-11 CEI 총회 승인, 2020-11-29(대림 1주일) 시행, 2021 부활부터 의무(Avvenire·Il Post 등, 검색 결과 **확인**). 「come anche noi li rimettiamo」 추가는 추정 | **© 2020 Fondazione di Religione Santi Francesco d'Assisi e Caterina da Siena, Roma**(CEI 전례서 발행처, 트리에스테 교구 자료로 **확인**). 복제 허락 절차는 찾지 못함 | 부분 확인 |
| ⛔ LEV 거절 2026-11-24 — 권장 | 묵주기도에도 **2020년 현행문**을 쓴다. 이탈리아 신자가 실제로 바치는 형태이기 때문이다(추정: CEI가 미사 밖에서도 새 문안을 쓰도록 권고). Compendium의 옛 형태를 쓰면 「틀린 기도문」으로 보일 위험이 있다 | — | 추정 |

**누구에게 묻나.** CEI 전국 전례국(Ufficio Liturgico Nazionale, chiesacattolica.it, 추정) · 위 재단(권리자) · LEV(Compendium·RVM).

## 6. 포르투갈어 — pt-BR · pt-PT (**보류: 승인 후 출시**)

| 항목 | 출처 | 저작권·허락 | 표시 |
|---|---|---|---|
| pt-BR | CNBB 『Missal Romano』 3판 브라질 번역: 2023년 대림부터 의무 사용, Edições CNBB 배포(Opus Dei 기사 2023-11-08, 검색 결과 **확인**). 전례문 위원회 CETEL이 번역 담당(CNBB 공지 https://www.cnbb.org.br/wp-content/uploads/2024/03/Comunicado-CETEL.pdf, 검색 결과 **확인**). Pai-Nosso·Glória 현행 문구는 원문 미확인 | 브라질에서는 교회 공식 번역도 저작권 보호와 허락 절차 대상이라는 법률 해설이 있다(conjur.com.br 2026-06, 검색 결과) | 부분 확인 |
| pt-PT | CEP 『Missal Romano』 3판: 2019-11-14 CEP 승인, 2021-01 교황청 인준, **2022-04-14(성목요일) 시행**(rr.pt, 검색 결과 **확인**). Pai-Nosso 문구가 바뀌었는지는 미확인 | 전례서에 「권리 보유」 표기, 권리자는 전국 전례 사무국으로 보임(추정) | 부분 확인 |
| ⛔ LEV 거절 2026-11-24 — 공통 | Compendium 포르투갈어판(vatican.va `…_po.html`) 부록. 어느 나라 표기인지 미확인 | LEV | 추정 |
| 묵주기도 신비 | RVM 포르투갈어판(vatican.va) | LEV | 추정 |

**누구에게 묻나(승인 요청 경로).**
- **브라질**: CNBB 전례문 위원회(CETEL)·전례 위원회 → cnbb.org.br. 출판·복제 허락은 **Edições CNBB**(edicoescnbb.com.br). 둘 다 공식 연락 주소는 착수 때 확인한다(추정).
- **포르투갈**: CEP 전국 전례 사무국(Secretariado Nacional de Liturgia), **secretariado@liturgia.pt**, www.liturgia.pt. 주소는 파티마 성지 내 「Apartado 31, 2496-908 Fátima」 표기와 2024 자료의 「Casa Santa Ana, Apartado 10」 표기가 있어 발송 전에 확인해야 한다(검색 결과 **확인**).
- 두 나라 모두 「앱에 기도문 본문을 싣는 것」의 허락, 표기 문구, 비용 유무, 개정 시 갱신 의무를 묻는다.

## 7. 라틴어 — la(「라틴어로 기도」 토글)

| 항목 | 출처 | 저작권·허락 | 표시 |
|---|---|---|---|
| ⛔ LEV 거절 2026-11-24 — Signum Crucis · Pater noster · Ave Maria · Gloria Patri · Salve Regina | Compendium 각 언어판 부록의 라틴어 병기(예: 「Glória Patri et Fílio et Spirítui Sancto.」, 「Salve, Regína,」, 「et ne nos indúcas in tentatiónem;」) | 본문은 전통문(공유 저작물, 추정). 강세 부호를 붙인 판본은 LEV 편집물 | **확인**(en·it 부록 직접 열람) |
| ⛔ LEV 거절 2026-11-24 — Symbolum Apostolorum | 『로마 미사 경본』 라틴어 표준판·Compendium | 전통문 | 추정 |
| ⛔ LEV 거절 2026-11-24 — 신비 이름 | Compendium 라틴어: 「Mystéria gaudiósa / luminósa / dolorósa / gloriósa」, 단 이름 「Annuntiátio」·「Baptísma apud Iordánem」·「Agonía in Hortu」·「Resurréctio」… | LEV 편집 | **확인** |
| 응송·마침 기도 | 「V. Ora pro nobis, sancta Dei Genetrix. R. Ut digni efficiamur promissionibus Christi.」 + 「Deus, cuius Unigenitus…」(묵주기도의 성모 축일 본기도) | 옛 『로마 미사 경본』 본문, 공유 저작물(추정) | 추정 |
| **파티마 기도** | **교회가 공표한 라틴어 공식본이 없다**는 2차 자료가 여럿이다(wdtprs.com 2018 「Ask Father: Official Latin of Fatima Rosary Prayer」, prayinglatin.com, Musica Sacra 포럼 — 검색 결과 **확인**). 「Domine Iesu, dimitte nobis debita nostra…」, 「O mi Iesu…」 등 비공식 라틴 번역이 돈다 | 비공식 번역은 각 번역자의 것 | 「공식본 없음」은 2차 자료 기준이라 **추정**. 파티마 성지·교황청 확인 필요 |
| 십자가의 길 계응 | 「Adoramus te, Christe, et benedicimus tibi. Quia per sanctam crucem tuam redemisti mundum.」 | 전통문 | 추정 |

**라틴어 표기는 한 판으로 통일한다(2026-11-23).** vatican.va 에 두 표기가 모두 있다 — 「in saecula saeculórum」(스페인어판 Compendium 부록), 「in saecula saeculorum」(Enchiridion Indulgentiarum), 「in sæ´cula sæculórum」(영어판 Compendium 부록의 영광송 — 강세 자리가 어긋남), 「in sæcula sæculórum」(같은 부록의 마니피캇). 판을 섞지 않고 **이미 쓰고 있는 영어판 Compendium 부록 한 판의 표기를 글자 그대로** 따른다(권장). 영광송의 어긋난 강세 한 곳은 LEV 에 바른 표기를 여쭌다(`docs/legal/church_permission/package/prayer-lev/texts.md`). 파티마 기도의 라틴어 공식본은 이번에도 찾지 못했다.

## 8. 한국어 — ko-KR(이미 출시 중, 참고)

- 출처: 한국천주교주교회의 『가톨릭 기도서』 개정판(2017 추계 총회 승인, 2018-04-01). 대조 기록은 `docs/church/PRAYER_VERIFICATION.md`(2026-11-15)에 있다.
- 저작권: https://cbck.or.kr/Copyright — 「『가톨릭 기도서』 내용의 전재·복제는 주교회의 승인 필요」(위 대조 문서에 「원문 직접 확인」이라고 적혀 있다). **새 언어를 열기 전에 한국어도 같은 허락 상태 칸을 채워야** 출처 시험(design.md §5-2)이 통과한다.

## 9. 요약: 무엇이 확인됐고 무엇이 남았나

- **확인**:
  - Compendium 부록의 기도 목록·라틴어 병기·신비 이름(en·es·it)과 LEV 저작권 표기
  - LEV의 교황 문서 권리 관리(2005 교령)
  - ICEL 『로마 미사 경본』 2010 저작권과 연락처
  - 잉글랜드·웨일스 전례국 저작권 안내와 연락처
  - CEI 2020 Padre nostro 시행 일정과 권리자(재단)
  - CNBB 2023·CEP 2022 미사 경본 시행
  - 포르투갈 전례 사무국 이메일
  - 라틴어 파티마 기도에 공식본이 없다는 2차 자료
- **추정(착수 때 원문 대조 필요)**:
  - 미국 USCCB 본문 자체(403)
  - 영어 파티마 기도와 마침 기도의 공유 저작물 여부
  - es-ES·es-419 차이 구절
  - pt-BR·pt-PT 현행 Pai-Nosso 문구
  - CEE·CELAM·CEM·CNBB 허락 절차와 연락처
  - 아일랜드
  - 교회 인가(임프리마투르)가 앱에 적용되는지

## 10. 2026-11-23 에 확인된 공식 출처 주소 (사용자가 ChatGPT 웹 검색으로 확인해 전달)

> 표시: **확인** = 그 쪽에 본문이 실려 있음을 확인 · **부분** = 교회 쪽 문서에 있으나 그 주교회의가 낸(인준한) 본문인지는 확인되지 않음 · **없음** = 찾지 못함.
> 전달받은 것은 주소, 신비 이름, 기도의 첫 구절이다. **기도 전문은 이 저장소에 지어내어 적지 않는다** — 쓸 때 그 쪽에서 글자 그대로 옮긴다.
> 교회 누리집에 실려 있다는 것은 제3자 앱의 저작권 이용 허락이 아니다. 허락은 `docs/legal/church_permission/16_Prayer_text_authorities.md` 의 편지로 따로 구한다.

| 변종 | 항목 | 주소 | 표시 |
|---|---|---|---|
| en-US | 성호경 | https://www.usccb.org/local-celebrations-consecration-united-states-america-most-sacred-heart-jesus | 확인 |
| en-US | 사도신경·주님의 기도·성모송·영광송·성모 찬송 | https://www.usccb.org/prayers/prayers-rosary | 확인 |
| en-US | 마침 기도(「O God, whose Only Begotten Son…」)·신비 20단 이름·파티마 기도(「O my Jesus, forgive us our sins…」, 단마다 선택) | https://www.usccb.org/how-to-pray-the-rosary | 확인 |
| es-ES | 파티마 기도 | 스페인 주교회의가 낸 본문으로는 찾지 못함(CEE 서버에 실린 제3자 Movimiento Laudato Si' 기도서에만) | 부분 |
| es-ES | 묵주기도 마침 기도 | 스페인 주교회의 본문으로 찾지 못함 | 없음 |
| es-ES | 성모 찬송 | 교황청 본문: https://www.vatican.va/archive/compendium_ccc/documents/archive_2005_compendium-ccc_sp.html (CEE 쪽은 제3자 기도서뿐 — 부분) | 확인(교황청 본문) |
| es-419(멕시코) | 파티마 기도 | 멕시코 주교회의 본문 찾지 못함 | 없음 |
| it-IT | 현행 주님의 기도(「e non abbandonarci alla tentazione, ma liberaci dal male」) | 전국 전례국 2026년 전례 자료 https://liturgico.chiesacattolica.it/wp-content/uploads/sites/8/2026/04/21/SUSSIDIO-ASCENSIONE-2026.pdf (끝의 Amen 없음) · Amen 이 붙은 단독 본문: 산미니아토 교구 https://sanminiato.chiesacattolica.it/la-diocesi-di-san-miniato/anno-giubilare-nel-iv-centenario-della-diocesi/indulgenza-giubilare/ | 확인 |
| it-IT | 파티마 기도(「Gesù mio, perdona le nostre colpe…」) | 교황청 새복음화촉진평의회 2020년 묵주기도 책자(CEI 누리집에 실림) https://chiciseparera.chiesacattolica.it/wp-content/uploads/sites/59/2020/05/Rosario-Santo-Padre-liturgia.pdf | 부분 |
| pt-BR | 주님의 기도·성모송·영광송·성모 찬송·사도신경 전문과 신비 20단 | CNBB 청소년 위원회 「Como rezar o Terço?」 https://jovensconectados.org.br/como-rezar-o-terco.html (CNBB 위원회의 공식 자료, 공포된 전례서는 아님) | 확인 |
| pt-BR | 파티마 기도 A(「Ó meu Jesus, perdoai-nos, livrai-nos do fogo do inferno…」) | https://www.cnbb.org.br/nossa-senhora-de-fatima-4/ | 확인 |
| pt-BR | 파티마 기도 B(「Ó Meu Jesus, perdoai-nos e livrai-nos do fogo do Inferno…」 — 끝이 A 와 다름) | https://www.cnbb.org.br/nossa-senhora-de-fatima-3/ | 확인 |
| pt-PT | 파티마 기도, 신심 기도 쪽(「Ó meu Jesus, perdoai-nos, livrai-nos do fogo do inferno…」) | 파티마 성지 https://www.santuario-fatima.pt/pt/pages/oracoes-de-fatima | 확인 |
| pt-PT | 파티마 기도, 묵주기도 안내 쪽(「Ó meu Jesus, perdoai-nos e livrai-nos do fogo do inferno…」) | 파티마 성지 https://www.santuario-fatima.pt/pt/pages/terco | 확인 |
| la | 파티마 기도 | 교황청 라틴어본 없음 | 없음 |
| ⛔ LEV 거절 2026-11-24 — la | 영광송 표기 | vatican.va 에 saecula·sæcula 둘 다 있음 → 영어판 Compendium 부록 한 판으로 통일(§7) | 확인 |

- 미사 경본 권리자(이탈리아): 「Fondazione di Religione Santi Francesco d’Assisi e Caterina da Siena」(§5) — CEI 편지(16-7)에 이름을 적었다.
- 브라질 신비 이름(위 「Como rezar o Terço?」 표기 그대로)과 미국 신비 이름(usccb.org 표기 그대로)은 `docs/legal/church_permission/package/prayer-cnbb/texts.md`·`prayer-usccb/texts.md` 에 옮겨 두었다.
