**초안입니다. 시행 전 반드시 법률 전문가의 검토를 받으세요. 운영자 정보의 {{빈칸}}을 채워야 합니다.**

# 데이터 인벤토리

`supabase/migrations/20261112000000_init.sql` 에 정의된 표와 실제 코드를 기준으로 한 목록입니다. 동의서·처리방침·스토어 답안은 이 표와 일치해야 합니다. 표나 이벤트가 바뀌면 이 표를 먼저 고치고 `consentVersion`을 올립니다.

## 1. 분류 원칙

| 데이터 | 분류 |
|---|---|
| 이메일 주소, 소셜 로그인 사용자 식별값, 계정 식별자(UUID) | **개인정보** (식별 가능) |
| 계정 식별자에 연결된 모든 이벤트·기도 기록·기기 정보 | **식별 가능한 개인정보**로 취급 (익명 정보가 아님). 이름이 없더라도 계정 ID로 특정 이용자와 연결됨 |
| 기도 기록, 성당 이용 기록, 기도 관련 사용 이벤트 | 종교 활동과 관련되어 **민감정보에 해당할 수 있음** → 선택 동의를 분리해 받음 (**법률 검토 필요**) |
| 관리자 화면의 합계·비율 | 집계 통계 (이용자별 행 없음). 단, 이용자 수가 매우 적을 때는 개인을 추정할 수 있으므로 소규모 구간 해석에 주의 |

## 2. 표 단위 목록

| 데이터 | 표 | 동의 종류 | 목적 | 보유 | 삭제 방법 |
|---|---|---|---|---|---|
| 계정(이메일, 로그인 수단, 소셜 식별값, 암호화된 비밀번호, 공급자 제공 이름·이미지 주소) | `auth.users`, `auth.identities` (Supabase 인증) | `privacy` (필수) | 로그인·본인 확인 | 탈퇴 시까지 | `delete_my_account()` (앱: 계정 삭제) |
| 프로필(가입 시각, 마지막 접속 시각, 로그인 수단, 언어) | `profiles` | `privacy` (필수) | 계정 관리 | 탈퇴 시까지 | 계정 삭제 시 연쇄 삭제 |
| 동의 이력(종류, 버전, 여부, 시각, 경로) | `consents` | `terms`·`privacy`·`age14`·선택 4종 모두 기록 | 동의 증빙·권리 행사 대응 | 탈퇴 시까지 (추가만 가능) | 계정 삭제 시 연쇄 삭제 (**동의 이력의 보관 필요성은 법률 검토 필요**) |
| 화면·기능 사용 이벤트 | `events` (category=`usage`) | `usage` | 앱 개선, 이용자 수·유지율 통계 | 철회 시 즉시, 최대 24개월 | `set_consent('usage', false, …)`, `purge_old_data()`, 계정 삭제 |
| 성당 이용 이벤트 | `events` (category=`church`) | `church` | 성당 기능 개선 | 철회 시 즉시, 최대 24개월 | `set_consent('church', false, …)`, `purge_old_data()`, 계정 삭제 |
| 오류·성능 이벤트 | `events` (category=`diagnostics`) | `diagnostics` | 오류 수정, 안정성 | 철회 시 즉시, 최대 24개월 | `set_consent('diagnostics', false, …)`, `purge_old_data()`, 계정 삭제 |
| 기기 정보(기기 ID(무작위), 모델, OS, 앱 버전, 언어, 최초·마지막 확인) | `devices` | `diagnostics` | 호환성 점검 | 철회 시 즉시, 마지막 확인 후 24개월 | `set_consent('diagnostics', false, …)`, `purge_old_data()`, 계정 삭제 |
| 기도 기록(일시, 신비, 단 수, 성모송 수, 완주, 시간, 출처) | `prayer_records` | `sync` | 백업·복원, 통계 | 철회·탈퇴 시까지 | `set_consent('sync', false, …)`, 계정 삭제 |
| 관리자 목록(관리자 사용자 ID, 이메일) | `admins` | 해당 없음(운영 인력 정보) | 관리자 권한 확인 | 관리자 해제 시까지 | SQL로 행 삭제, 계정 삭제 시 연쇄 삭제 |

## 3. 이벤트 단위 목록 (SPEC §4)

| 이벤트 | 범주(동의) | 속성 (열거형·숫자만) |
|---|---|---|
| `app_open` | usage | 없음 |
| `screen_view` | usage | `screen` |
| `login_success` | usage | `provider` |
| `consent_change` | usage | `kind`, `granted` |
| `prayer_start` | usage | `set`, `mode`, `resumed`, `source` |
| `decade_complete` | usage | `set`, `decade` |
| `prayer_finish` | usage | `set`, `completed`, `decades`, `seconds` |
| `rosary_style_change`, `mode_change`, `leader_voice_change`, `text_scale_change`, `setting_change`, `stats_open` | usage | `style` / `mode` / `source`,`persona` / `scale` / `key` / `range` |
| `church_pick`, `church_enter`, `church_exit`, `church_sit`, `church_candle`, `avatar_save` | church | `church`, `online`, `seconds`, `sat_seconds` (촛불의 지향은 기록하지 않음, 아바타 이미지는 전송하지 않음) |
| `error` | diagnostics | `where`, `message`(≤200자), `stack`(≤1000자) |
| `perf` | diagnostics | `fps_avg`, `church` |

모든 이벤트 공통: 계정 식별자, 세션 ID(무작위), 발생 시각, 앱 버전, 플랫폼(android/ios), 속성 JSON(2,048바이트 이하).

## 4. 수집하지 않는 정보

자유 입력 글, 기도 내용, 촛불 지향, 정확한 위치, 연락처, 광고 식별자, 사진, 녹음. 코드 리뷰 시 이벤트 속성에 이런 값이 들어가지 않는지 확인합니다.

## 5. 서버에서의 보호 장치 (코드로 강제)

- 모든 표 행 단위 접근 제어(RLS): 사용자는 자기 행만 읽고 쓰기, anon 역할은 접근 불가
- 선택 동의 없이는 서버가 INSERT를 거부 (`has_consent()`를 정책에서 호출)
- 동의 철회 시 해당 범주 데이터 즉시 삭제 (트리거)
- 동의 이력은 추가만 가능 (UPDATE 트리거와 권한 제한)
- 관리자 집계 함수는 집계 JSON만 반환, 관리자 목록(`admins`)에 있는 계정만 실행

## 6. 법률 검토 때 물어볼 사항

1. 기도 기록·성당 이용·사용 이벤트가 민감정보(종교)에 해당하는지, 그리고 **로그인 사실(종교 앱 이용 자체)** 이 필수 동의 범위에서 문제가 없는지
2. 국외 이전의 근거(별도 동의 vs 계약 이행을 위한 위탁과 처리방침 공개)와 서버 지역 선택
3. 동의 이력을 탈퇴 후에도 일정 기간 보관해야 하는지
4. 만 14세 확인 방식(자기 확인 체크)이 충분한지
5. 개인정보 보호책임자 지정 의무 여부와 운영 형태(개인/단체)
