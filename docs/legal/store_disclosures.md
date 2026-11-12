**초안입니다. 시행 전 반드시 법률 전문가의 검토를 받으세요. 운영자 정보의 {{빈칸}}을 채워야 합니다.**

# 스토어 제출용 개인정보 답안 초안

구글 플레이 "데이터 보안(Data safety)" 양식과 애플 "앱 개인정보(App Privacy)" 라벨의 **분류 이름은 각 스토어 도움말(2026-11 조회)을 기준**으로 적었습니다. 양식 화면은 자주 바뀌므로 제출 직전에 실제 화면과 대조하세요(**확인 필요**). 아래는 `data_inventory.md` 와 코드 구현이 일치한다는 전제의 초안이며, 외부 SDK(분석·광고)를 추가하면 다시 작성해야 합니다.

## 1. 공통 전제

- 광고 없음, 광고 식별자 미수집, 제3자 분석·광고 SDK 없음.
- 로그인은 필수(`AuthConfig.requireLogin = true`), 선택 동의 4개는 사용자가 끌 수 있음.
- 서버(Supabase)로 전송되는 모든 데이터는 암호화 전송(HTTPS).
- 계정 삭제를 앱 안에서 할 수 있고(설정 > 계정 > 계정 삭제), 웹 안내 주소를 제공함(`account_deletion.md`).
- 모든 수집 데이터는 계정 식별자에 연결되어 저장되므로 "익명화됨"으로 답하지 않습니다.

## 2. 구글 플레이: 데이터 보안 양식

### 2-1. 데이터 수집·공유 여부
- 앱이 필수 사용자 데이터를 수집하거나 공유하는가: **예**
- 모든 사용자 데이터가 전송 중 암호화되는가: **예** (HTTPS/TLS)
- 사용자가 데이터 삭제를 요청할 수 있는 방법을 제공하는가: **예** (앱 내 계정 삭제 + 웹 URL). 선택 동의 철회 시 해당 범주 데이터 즉시 삭제.

### 2-2. 데이터 유형별 답안

"공유(Shared)"는 아래에서 모두 **아니오**로 초안을 잡았습니다. 구글의 정의상 사용자를 대신해 처리하는 서비스 제공자(Supabase)로의 전송은 "공유"에서 제외되는 것으로 안내되어 있으나, 소셜 로그인 제공자와의 교환을 포함해 **해석은 확인 필요**입니다.

| 범주 → 데이터 유형 (양식의 영문 이름) | 수집 | 공유 | 필수/선택 | 수집 목적 (양식의 영문 이름) | 근거 데이터 |
|---|---|---|---|---|---|
| Personal info → **Email address** | 예 | 아니오 | 필수 (로그인) | App functionality, Account management | 계정 이메일 |
| Personal info → **User IDs** | 예 | 아니오 | 필수 | App functionality, Account management, Analytics | 계정 ID, 소셜 로그인 사용자 식별값, 이벤트에 연결되는 계정 ID |
| Personal info → **Political or religious beliefs** | 예(선택 동의 시) | 아니오 | 선택 | App functionality, Analytics | 기도 기록, 성당 이용 기록. 종교 활동을 보여 줄 수 있어 **보수적으로 신고하는 안**(비신고 여부는 **확인 필요**) |
| App activity → **App interactions** | 예(선택 동의 시) | 아니오 | 선택 | Analytics, App functionality | 화면 조회, 기능 사용 이벤트 |
| App activity → **Other actions** | 예(선택 동의 시) | 아니오 | 선택 | App functionality, Analytics | 기도 시작·종료, 성당 입장·착석 등 앱 안 행동 |
| App info and performance → **Crash logs** | 예(선택 동의 시) | 아니오 | 선택 | Analytics, App functionality | 오류 기록(메시지·추적 정보) |
| App info and performance → **Diagnostics** | 예(선택 동의 시) | 아니오 | 선택 | Analytics, App functionality | 평균 프레임 수 등 성능 정보 |
| Device or other IDs → **Device or other IDs** | 예(선택 동의 시) | 아니오 | 선택 | App functionality, Analytics | 앱이 만든 무작위 기기 ID(하드웨어 ID 아님). 이 유형에 해당하는지 **확인 필요** |

"수집하지 않음"으로 답할 유형: Location(Approximate/Precise), Name(앱이 받지 않음 — 소셜 서비스가 전달하는 이름을 서버가 저장하는지는 **확인 필요**), Address, Phone number, Financial info, Health and fitness, Messages, Photos and videos, Audio files, Files and docs, Calendar, Contacts, Web browsing, In-app search history, Installed apps, Other user-generated content (자유 입력 글을 받지 않음).

### 2-3. 기타 항목
- 사용자가 이 데이터 수집 여부를 선택할 수 있는가: 위 표의 "선택" 항목은 **예**(앱 안 토글). 이메일·User IDs는 로그인 필수이므로 "필수".
- 개인정보처리방침 URL: {{개인정보 처리방침 공개 URL}}
- 가족 정책·아동 대상 앱: 만 14세 미만 가입 제한이며 아동 대상이 아님 — 연령 등급 질문의 답은 **확인 필요**.
- 데이터 안전 라벨의 "Independent security review", "Committed to follow the Play Families Policy": 해당 없음.

## 3. 애플: 앱 개인정보(App Privacy) 라벨

애플은 아래 정의로 "Linked to You"(사용자 신원과 연결), "Used to Track You"(제3자 데이터와 결합한 광고·측정이나 데이터 브로커 공유)를 묻습니다. 이 앱은 모든 수집 데이터가 계정과 연결되므로 **Data Linked to You** 로, **Tracking은 아니오(Data Used to Track You 없음)** 로 초안을 잡습니다.

| 분류(Data type category) → 데이터 유형 | 연결됨(Linked) | 추적(Tracking) | 목적 (애플의 용어) |
|---|---|---|---|
| Contact Info → **Email Address** | 예 | 아니오 | App Functionality |
| Identifiers → **User ID** | 예 | 아니오 | App Functionality, Analytics |
| Identifiers → **Device ID** (앱이 만든 무작위 ID, 선택 동의) | 예 | 아니오 | App Functionality, Analytics — 이 유형에 해당하는지 **확인 필요** |
| Sensitive Info → **Sensitive Info** (종교적 신념과 관련될 수 있는 기도·성당 기록, 선택 동의) | 예 | 아니오 | App Functionality, Analytics — 신고 여부 **확인 필요**(보수적 신고 안) |
| Usage Data → **Product Interaction** (선택 동의) | 예 | 아니오 | Analytics, App Functionality |
| Diagnostics → **Crash Data**, **Performance Data** (선택 동의) | 예 | 아니오 | Analytics, App Functionality |

수집하지 않음: Location, Contacts, User Content(자유 입력 글·사진·오디오 없음), Browsing History, Search History, Purchases, Financial Info, Health & Fitness, Other Data.

참고: 선택 동의로 수집되는 데이터라도 애플의 "선택 공개" 예외(드물게·주요 기능이 아닐 때·매번 명시적으로 제공)에 해당하지 않으므로 라벨에는 포함합니다(애플 도움말 기준, **확인 필요**).

## 4. 계정 삭제 안내 문구 (스토어 설명·심사 메모에 붙여 넣기)

> 계정은 앱의 설정 > 계정 > 계정 삭제에서 직접 삭제할 수 있으며, 삭제하면 서버에 저장된 이메일·프로필·동의 이력·기도 기록·사용 기록·기기 정보가 즉시 삭제됩니다. 앱에 접속할 수 없는 경우에는 {{계정 삭제 안내 공개 URL}} 에서 안내하는 방법으로 요청할 수 있습니다. 선택 동의(사용 분석, 기도 기록 동기화, 성당 이용 기록, 오류·기기 정보)는 계정을 삭제하지 않고도 설정에서 끄면 해당 서버 데이터가 즉시 삭제됩니다.

## 5. 앱스토어 심사와 "로그인 필수"에 대한 유의점 (모두 확인 필요)

- 애플 앱 심사 지침에는 계정 기반의 핵심 기능이 없는 앱에서 로그인을 강제하면 안 된다는 취지의 조항(5.1.1 (v) 계열)이 있는 것으로 알고 있습니다. 이 앱의 핵심 기능(묵주기도 진행)이 로그인 없이 작동할 수 있기 때문에, **로그인 필수가 거절 사유가 될 가능성이 있습니다.** 실제 현행 지침 문구와 심사자 판단은 **확인 필요**입니다.
- 대응: 코드 상수 **`AuthConfig.requireLogin`** 을 `false` 로 바꾸면 로그인 없이 앱을 쓸 수 있게 만들 수 있습니다(SPEC §0). 그 경우 로그인 없이도 기도·통계는 되고, 서버 동기화·분석은 로그인 + 동의가 있을 때만 동작하게 두는 방식을 검토하세요(앱 쪽 동작은 구현에 따름 — **확인 필요**).
- 소셜 로그인을 제공하는 앱에는 애플 로그인(또는 동등한 개인정보 보호 로그인) 제공 요구가 있는 것으로 알고 있습니다(4.8 계열, **확인 필요**). 이 앱은 애플 로그인을 포함합니다.
- 앱 안 계정 삭제 제공이 요구되며(5.1.1 (v) 계열), 애플 로그인으로 만든 계정은 삭제 시 애플 쪽 토큰 철회가 필요할 수 있습니다(**확인 필요**).
- 심사 계정: 심사자가 로그인할 수 있도록 이메일 로그인 테스트 계정과 비밀번호를 심사 메모에 제공해야 할 수 있습니다. 이메일 인증을 끄거나 미리 인증된 계정을 만들어 두세요(**확인 필요**).
- 구글 플레이: 계정 생성을 지원하는 앱은 앱 안과 웹에서 계정 삭제 경로를 제공해야 하는 것으로 알고 있습니다(**확인 필요**). 데이터 보안 양식 답과 실제 동작(철회 시 삭제, 암호화 전송)이 일치해야 합니다.
