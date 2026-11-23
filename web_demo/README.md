# 웹 데모 — 허락 요청 편지에 붙이는 「비밀 링크」 3D 성당

받는 곳마다 **추측할 수 없는 링크 하나**가 열어 주는 정적 사이트입니다. 데스크톱·휴대폰 브라우저에서 그 곳의 가상 성당(앱의 `assets/church/` 장면 그대로)을 걸어 볼 수 있고, 시작 화면의 **▶ 둘러보기**가 60~90초짜리 자동 시연(들어와서 → 천장을 올려다보고 → 제대 쪽으로 가다 제단 경계에서 멈추고 → 성호(성수대가 있는 곳만) → 초 켜기 → 앉아 기도 → 마침)을 보여 줍니다. 영상(60초)과 함께 편지에 넣는 용도입니다.

## 구성

| 경로 | 하는 일 |
|---|---|
| `web_demo/shell/` | 웹 껍데기(앱의 Flutter 자리): `shell.js`(불러오기·단추·손잡이·이벤트), `tour.js`(둘러보기), `i18n.js`(ko·it·en·es·pt 문구), `shell.css` |
| `web_demo/build.mjs` | 정적 폴더 `build/web_demo/` 를 만든다(저장소에 올리지 않음). `assets/church/` 는 **고치지 않고 그대로 복사**(개발용 `dev/`·창 원본 `glass_src/`·시험 페이지는 뺀다) |
| `web_demo/links.defaults.json` | 받는 곳 id → 성당·언어 기본 대응표(토큰 없음, 저장소에 올림) |
| `web_demo/links.local.json` | **비밀 대응표**(id → 성당·언어·토큰). `.gitignore` 에 있다. 첫 빌드에 기본 대응표로 만들어지고 토큰이 채워진다 |
| `web_demo/deploy.sh` | Cloudflare Pages 에 올린다(실행은 사람이/메인이) |
| `web_demo/build.test.mjs` | 빌드 시험(`node --test web_demo/build.test.mjs`) |
| `web_demo/shell_stuck.test.mjs` | 「성당을 짓는 중」 안전망 시험(가짜 장면, Playwright 있으면): 장면 자동 시작 끔(`ChurchNoAutoStart`) · 30초 뒤 「다시 시도」 · init 예외/WebGL 문맥 잃음 안내 |
| `web_demo/e2e.mjs` | 헤드리스 Chromium 점검·캡처(`node web_demo/e2e.mjs --out <폴더>`; Playwright 필요) |

## 만들기

```
node web_demo/build.mjs                       # build/web_demo/ 와 build/web_demo_links.txt(받는 곳별 주소, 비밀)
node web_demo/build.mjs --base https://rosarium-demo.pages.dev   # 주소 목록에 도메인을 붙임
node web_demo/build.mjs --links 내파일.json --out /tmp/site       # 다른 대응표·출력 폴더(시험용)
```

- 배포 폴더: `build/web_demo/index.html`(중립 「Not found」) · `404.html`(같은 글) · `robots.txt`(모두 막음) · `_headers`(`X-Robots-Tag: noindex, nofollow, noarchive`, `Referrer-Policy: no-referrer`, `/v/*` 는 `no-store`) · `v/<토큰>/index.html`(받는 곳마다 하나) · `assets/church/`·`assets/shell/`(공용).
- 토큰: 무작위 160비트, 소문자 base32 32자(최소 26자 = 130비트). 대응표에 토큰이 없는 칸만 새로 만들고, 있는 토큰은 다시 만들 때도 **그대로**(같은 링크가 유지된다).
- 장면 스크립트는 성당마다 필요한 빌더만 싣는다(다른 성당의 `ch_*.js` 는 안 불러옴). 모든 페이지 HTML 에 `<meta name="robots" content="noindex,nofollow,noarchive">`.
- 용량: 합계 약 19.6 MB(gzip 약 12.5 MB), 파일 약 150개, 가장 큰 파일 `tex_pack.js` 3.6 MB. Cloudflare Pages 한도(파일당 25 MB, 20,000개)보다 한참 작고, 빌드가 넘으면 멈춘다.

## 올리기 (Cloudflare Pages)

```
export CLOUDFLARE_API_TOKEN=...   # 권한: Cloudflare Pages — Edit
export CLOUDFLARE_ACCOUNT_ID=...
bash web_demo/deploy.sh           # 빌드 → (없으면) 프로젝트 rosarium-demo 만들기 → wrangler pages deploy build/web_demo
```

- 환경 변수로만 읽습니다. 저장소·문서·채팅에 키를 적지 마세요. 프로젝트 이름은 `PROJECT=이름` 으로 바꿀 수 있습니다(기본 `rosarium-demo`).
- 올린 뒤 주소: `https://rosarium-demo.pages.dev/v/<토큰>/`. `build/web_demo_links.txt` 에 받는 곳별 전체 주소가 있습니다(id · 성당 · 언어 · 주소; 비밀). 편지의 〔웹 링크〕 자리에 넣습니다.
- 루트(`/`)와 모르는 경로는 중립 「Not found」 페이지입니다(Pages 가 `404.html` 을 줍니다).

## 철회(링크 끊기)

1. `web_demo/links.local.json` 에서 그 받는 곳 칸을 **지웁니다**(또는 토큰만 지우면 **새 토큰**으로 바뀝니다 — 옛 링크는 죽습니다).
2. 다시 `bash web_demo/deploy.sh` (빌드가 `build/web_demo/` 를 비우고 다시 짓기 때문에 옛 `v/<토큰>/` 폴더가 사라지고, Pages 새 배포에는 없습니다).
3. 옛 배포 미리보기 주소(`<해시>.rosarium-demo.pages.dev`)에는 옛 판이 남을 수 있으니, 급하면 Cloudflare 대시보드에서 그 배포를 지웁니다.

## 조작 · 규칙

- 데스크톱: W A S D·방향키로 걷기, 마우스 끌기로 둘러보기, 휠로 확대. 휴대폰: 왼쪽 아래 손잡이로 걷기, 화면 끌기로 둘러보기, 두 손가락으로 확대.
- 큰 단추: 「제대 앞으로」 · 「초 켜기」(정해진 지향 8가지 중 하나 — 글 입력 칸 없음) · 「앉아 기도」 · 「성호」(성수대가 있는 성 베드로·아시시 모형에서만, 앱과 같은 규칙) · 「시점」(자동·1인칭·뒤에서).
- 제단 출입 금지 구역은 **장면 자체**가 막습니다(셸에서 따로 풀 수 없음). 둘러보기·직접 걷기 모두 같습니다.
- 화질: 휴대폰은 「보통」(mid), 데스크톱은 「높음」(high)으로 시작하고, 위쪽 「화질」 단추로 낮음·보통·높음을 돌려 고릅니다.
- 어떤 입력이든(키·누름·휠·단추) 둘러보기를 멈추고 자유 모드로 넘깁니다.

## 문구 · 번역

- 시작 화면 문구는 `shell/i18n.js` 에 있습니다. **ko 는 앱 문구를 줄인 것이고, it·es·pt(·en)는 기계가 초안을 쓴 번역이라 사람이 검수하지 않았습니다.** 보내기 전에 원어민 확인이 필요합니다.
- 둘러보기 자막은 `docs/legal/church_permission/package/<id>/video_plan.md` 의 자막 줄에서 장면 설명으로 역할(제목·걷기·천장·제단 경계·성호·초 켜기·앉아 기도)을 찾아 가져옵니다. 자막 언어가 받는 분의 링크 언어와 같을 때만 쓰고, 맞는 줄이 없으면 `i18n.js` 의 기본 자막을 씁니다. 〔이메일〕 같은 자리 표시가 든 줄(마침 카드)은 쓰지 않습니다.
- 받는 곳 id 는 `docs/legal/church_permission/README.md` 1절과 같습니다. 서울대교구는 세 곳(명동·당고개·여의도동)을 다루므로 링크가 셋(`seoul-archdiocese`, `-danggogae`, `-yeouido`)입니다. 기도문 권리자(`prayer-*`)는 앱 소개용으로 「우리 본당」을 그 언어로 엽니다.

## 시험

```
node --test web_demo/build.test.mjs                 # 토큰 폴더·중립 루트·noindex·토큰이 저장소에 없음
node --test web_demo/shell_stuck.test.mjs           # 「짓는 중」이 끝없이 돌지 않는가(2026-11-23 멈춤 결함 회귀)
node --test "tools/church_web/*.test.mjs"           # 장면(assets/church) 불변 확인
node web_demo/e2e.mjs --out /tmp/shots --cases ko:danggogae,it:stpeter,en:basic:phone   # 헤드리스 점검·캡처(느림)
```
