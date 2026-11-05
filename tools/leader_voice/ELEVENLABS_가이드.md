# 일레븐랩스(ElevenLabs)로 선창·후창 음성 만들기

이 문서는 앱에 넣을 선창(앞단)·후창(뒷단) 음성을 일레븐랩스에서 만드는 방법과, 붙여 넣을 문구 전부를 담고 있습니다. 문구는 앱이 쓰는 기도문 데이터에서 그대로 뽑았습니다.

## 1. 한눈에 보기

- 만들 파일: 목소리 하나당 **31개**, 수녀님과 신부님 두 목소리라서 **총 62개**입니다.
  - 선창(앞단) 26개: 기도 6개와 신비 20개. **후창 모드**에서 AI가 앞단을 읽어 줄 때 씁니다.
  - 후창(뒷단) 5개: 사도신경, 주님의 기도, 성모송, 영광송, 구원송의 뒷단. **선창 모드**에서 사용자가 앞단을 말하고 AI가 뒷단을 받아 줄 때 씁니다.
- 글자 수: 목소리 하나당 약 1,382자(선창 1,093자, 후창 289자)이고 두 목소리 합쳐 약 2,764자입니다. 일레븐랩스는 글자 수만큼 크레딧을 쓰므로, 다시 만드는 횟수까지 넉넉히 잡아도 한 달 크레딧 안에 들어올 것으로 보이지만, 요금제와 크레딧 계산은 직접 확인하세요.
- 성호경은 모두 함께 바치므로 후창 파일이 없습니다.
- 파일 이름은 아래 표의 **파일명 그대로** 저장해야 앱이 찾습니다.

## 2. 준비

1. 유료 플랜이 필요합니다. 무료 플랜 결과물은 상업적으로 쓸 수 없고, 유료 플랜에서 만든 결과물은 구독을 해지한 뒤에도 상업적으로 쓸 수 있다고 안내되어 있습니다. 앱 배포에 쓰기 전에 현재 약관을 직접 확인하세요.
2. 한 달만 가입해서 62개를 다 만들고 해지해도 됩니다. 구독 기간에 만든 파일의 라이선스는 유지된다고 안내되어 있습니다.
3. 앱과 스토어 설명에 "AI로 합성한 음성이며 사람이 녹음한 것이 아닙니다"라고 알려 주세요. 앱에는 이미 들어가 있습니다.

## 3. 목소리 만들기

일레븐랩스에서 **Voice Design**(텍스트로 목소리 설명해서 만들기)을 쓰면 직접 만든 목소리가 되어 권리 관계가 단순합니다. 아래 설명을 영어로 붙여 넣으세요. 영어 설명이 더 안정적으로 먹힙니다. 마음에 드는 미리듣기가 나오면 저장하고 이름을 붙이세요.

**수녀님 목소리**

```
A gentle, warm Korean woman in her late 50s, a Catholic sister leading a prayer. Soft, calm and reverent, kind and comforting, with a clear and steady voice. Low-to-mid pitch, very slow and unhurried pace, natural pauses between lines. Native Korean accent, clear articulation. No dramatic emotion, no singing.
```

**신부님 목소리**

```
A calm, deep Korean man in his 50s, a Catholic priest leading a prayer. Solemn, steady and reverent with a warm baritone voice. Slow, unhurried pace with natural pauses at the end of each line. Native Korean accent, clear articulation. No dramatic emotion, no singing.
```

미리듣기에 넣을 문장은 성모송 앞단을 쓰세요.

```
은총이 가득하신 마리아님, 기뻐하소서!
주님께서 함께 계시니 여인 중에 복되시며
태중의 아들 예수님 또한 복되시나이다.
```

Voice Design이 마음에 들지 않으면 Voice Library에서 언어 Korean, 성별, 나이대 "middle aged" 또는 "old", 용도 narration으로 찾아도 됩니다. 라이브러리 목소리는 목소리마다 상업적 이용 조건이 다를 수 있으니 확인하세요.

## 4. 생성 설정

파일마다 설정이 달라지면 목소리가 들쭉날쭉해집니다. **62개 모두 같은 값**으로 만드세요. 아래는 시작값이고, 샘플 3개를 들어 보고 조절하세요.

| 항목 | 시작값 | 설명 |
| --- | --- | --- |
| 모델 | Eleven Multilingual v2 | 한국어를 지원하고 아래의 쉼 태그를 씁니다. v3 같은 다른 모델은 쉼 태그를 지원하지 않을 수 있으니 쓴다면 태그를 지우고 줄바꿈만 쓰세요. 이 부분은 제가 현재 문서로 확인하지 못했습니다. |
| Stability | 65% | 높을수록 차분하고 일정합니다. 너무 높으면 단조롭고, 낮으면 감정 기복이 생깁니다. |
| Similarity | 75% | 기본값 근처로 둡니다. |
| Style exaggeration | 0~10% | 기도문이라 과장 없이 0에 가깝게 둡니다. |
| Speaker boost | 켬 | |
| Speed | 0.85~0.9 | 천천히 읽게 합니다. 0.8 아래는 어색해질 수 있습니다. |

문구에 들어 있는 `<break time="0.5s" />`는 그 자리에서 0.5초 쉬라는 태그입니다. 일레븐랩스 화면에 그대로 붙여 넣으면 됩니다. 한 문구에 태그가 너무 많으면 소리가 불안정해질 수 있어 줄 끝에만 넣었습니다.

## 5. 만드는 방법 두 가지

### 방법 A. 화면에서 직접 (62번 반복)

1. 일레븐랩스에 로그인해 Text to Speech 화면을 엽니다.
2. 목소리(수녀님 또는 신부님), 모델, 위 설정값을 고릅니다.
3. 아래 6장의 문구 하나를 복사해 붙여 넣고 Generate를 누릅니다.
4. 들어 보고 괜찮으면 MP3로 내려받습니다.
5. 파일 이름을 표의 **파일명**으로 바꿉니다. 수녀님 파일은 `sister` 폴더, 신부님 파일은 `priest` 폴더에 모읍니다.
6. 이 과정을 목소리마다 31번씩 반복합니다.

### 방법 B. 도구로 한 번에 (권장)

일레븐랩스에서 API 키를 만들어 환경 변수 `ELEVENLABS_API_KEY`로 넣고(채팅에 붙여 넣지 마세요), 이 저장소의 생성 도구로 한 번에 만듭니다. 선창 26개는 지금 도구가 지원합니다. 후창 5개는 도구에 추가해야 합니다.

```
python3 tools/leader_voice/generate.py --provider elevenlabs --list-voices
python3 tools/leader_voice/generate.py --provider elevenlabs --persona sister --voice-sister <수녀님 voice_id> --only sign_of_cross,hail_mary,glory_be
```

## 6. 붙여 넣을 문구 전체

각 블록의 첫 줄 표시(`파일명`)는 저장할 이름이고, 코드 블록 안의 내용만 복사해서 붙여 넣으세요. 수녀님과 신부님 모두 **같은 문구**를 씁니다.

### 6-1. 선창(앞단) 기도 6개 — 후창 모드에서 AI가 읽음

**성호경** — 파일명 `sign_of_cross.mp3`

```
성부와 성자와 성령의 이름으로. <break time="0.5s" />
아멘.
```

**사도신경** — 파일명 `apostles_creed.mp3`

```
전능하신 천주 성부 <break time="0.5s" />
천지의 창조주를 저는 믿나이다. <break time="0.5s" />
그 외아들 우리 주 예수 그리스도님 <break time="0.5s" />
성령으로 인하여 동정 마리아께 잉태되어 나시고 <break time="0.5s" />
본시오 빌라도 통치 아래서 고난을 받으시고 <break time="0.5s" />
십자가에 못 박혀 돌아가시고 묻히셨으며 <break time="0.5s" />
저승에 가시어 사흗날에 죽은 이들 가운데서 부활하시고 <break time="0.5s" />
하늘에 올라 전능하신 천주 성부 오른편에 앉으시며
```

**주님의 기도** — 파일명 `our_father.mp3`

```
하늘에 계신 우리 아버지, <break time="0.5s" />
아버지의 이름이 거룩히 빛나시며 <break time="0.5s" />
아버지의 나라가 오시며 <break time="0.5s" />
아버지의 뜻이 하늘에서와 같이 <break time="0.5s" />
땅에서도 이루어지소서!
```

**성모송** — 파일명 `hail_mary.mp3`

```
은총이 가득하신 마리아님, 기뻐하소서! <break time="0.5s" />
주님께서 함께 계시니 여인 중에 복되시며 <break time="0.5s" />
태중의 아들 예수님 또한 복되시나이다.
```

**영광송** — 파일명 `glory_be.mp3`

```
영광이 성부와 성자와 성령께
```

**구원을 비는 기도** — 파일명 `fatima.mp3`

```
예수님, 저희 죄를 용서하시며 <break time="0.5s" />
저희를 지옥 불에서 구하시고
```

### 6-2. 선창(앞단) 신비 20개 — 신비 묵상 안내

제목과 묵상 문구 사이를 0.8초 쉽니다.

**환희의 신비 1단** — 파일명 `mystery_joyful_1.mp3`

```
환희의 신비 1단 <break time="0.8s" />
마리아께서 예수님을 잉태하심을 묵상합시다.
```

**환희의 신비 2단** — 파일명 `mystery_joyful_2.mp3`

```
환희의 신비 2단 <break time="0.8s" />
마리아께서 엘리사벳을 찾아보심을 묵상합시다.
```

**환희의 신비 3단** — 파일명 `mystery_joyful_3.mp3`

```
환희의 신비 3단 <break time="0.8s" />
마리아께서 예수님을 낳으심을 묵상합시다.
```

**환희의 신비 4단** — 파일명 `mystery_joyful_4.mp3`

```
환희의 신비 4단 <break time="0.8s" />
마리아께서 예수님을 성전에 바치심을 묵상합시다.
```

**환희의 신비 5단** — 파일명 `mystery_joyful_5.mp3`

```
환희의 신비 5단 <break time="0.8s" />
마리아께서 잃으셨던 예수님을 성전에서 찾으심을 묵상합시다.
```

**빛의 신비 1단** — 파일명 `mystery_luminous_1.mp3`

```
빛의 신비 1단 <break time="0.8s" />
예수님께서 세례 받으심을 묵상합시다.
```

**빛의 신비 2단** — 파일명 `mystery_luminous_2.mp3`

```
빛의 신비 2단 <break time="0.8s" />
예수님께서 카나에서 첫 기적을 행하심을 묵상합시다.
```

**빛의 신비 3단** — 파일명 `mystery_luminous_3.mp3`

```
빛의 신비 3단 <break time="0.8s" />
예수님께서 하느님 나라를 선포하심을 묵상합시다.
```

**빛의 신비 4단** — 파일명 `mystery_luminous_4.mp3`

```
빛의 신비 4단 <break time="0.8s" />
예수님께서 거룩하게 변모하심을 묵상합시다.
```

**빛의 신비 5단** — 파일명 `mystery_luminous_5.mp3`

```
빛의 신비 5단 <break time="0.8s" />
예수님께서 성체성사를 세우심을 묵상합시다.
```

**고통의 신비 1단** — 파일명 `mystery_sorrowful_1.mp3`

```
고통의 신비 1단 <break time="0.8s" />
예수님께서 우리를 위하여 피땀 흘리심을 묵상합시다.
```

**고통의 신비 2단** — 파일명 `mystery_sorrowful_2.mp3`

```
고통의 신비 2단 <break time="0.8s" />
예수님께서 우리를 위하여 매 맞으심을 묵상합시다.
```

**고통의 신비 3단** — 파일명 `mystery_sorrowful_3.mp3`

```
고통의 신비 3단 <break time="0.8s" />
예수님께서 우리를 위하여 가시관 쓰심을 묵상합시다.
```

**고통의 신비 4단** — 파일명 `mystery_sorrowful_4.mp3`

```
고통의 신비 4단 <break time="0.8s" />
예수님께서 우리를 위하여 십자가 지심을 묵상합시다.
```

**고통의 신비 5단** — 파일명 `mystery_sorrowful_5.mp3`

```
고통의 신비 5단 <break time="0.8s" />
예수님께서 우리를 위하여 십자가에 못 박혀 돌아가심을 묵상합시다.
```

**영광의 신비 1단** — 파일명 `mystery_glorious_1.mp3`

```
영광의 신비 1단 <break time="0.8s" />
예수님께서 부활하심을 묵상합시다.
```

**영광의 신비 2단** — 파일명 `mystery_glorious_2.mp3`

```
영광의 신비 2단 <break time="0.8s" />
예수님께서 승천하심을 묵상합시다.
```

**영광의 신비 3단** — 파일명 `mystery_glorious_3.mp3`

```
영광의 신비 3단 <break time="0.8s" />
예수님께서 성령을 보내심을 묵상합시다.
```

**영광의 신비 4단** — 파일명 `mystery_glorious_4.mp3`

```
영광의 신비 4단 <break time="0.8s" />
예수님께서 마리아를 하늘에 불러올리심을 묵상합시다.
```

**영광의 신비 5단** — 파일명 `mystery_glorious_5.mp3`

```
영광의 신비 5단 <break time="0.8s" />
예수님께서 마리아께 천상 모후의 관을 씌우심을 묵상합시다.
```

### 6-3. 후창(뒷단) 5개 — 선창 모드에서 AI가 뒷단을 받음

이 5개는 앱에 아직 재생 기능이 없습니다. 파일을 만들어 두면 앱에 추가하겠습니다. 파일 이름 앞의 `resp_`를 꼭 붙이세요.

**사도신경 뒷단** — 파일명 `resp_apostles_creed.mp3`

```
그리로부터 산 이와 죽은 이를 심판하러 오시리라 믿나이다. <break time="0.5s" />
성령을 믿으며 <break time="0.5s" />
거룩하고 보편된 교회와 모든 성인의 통공을 믿으며 <break time="0.5s" />
죄의 용서와 육신의 부활을 믿으며 <break time="0.5s" />
영원한 삶을 믿나이다. <break time="0.5s" />
아멘.
```

**주님의 기도 뒷단** — 파일명 `resp_our_father.mp3`

```
오늘 저희에게 일용할 양식을 주시고 <break time="0.5s" />
저희에게 잘못한 이를 저희가 용서하오니 <break time="0.5s" />
저희 죄를 용서하시고 <break time="0.5s" />
저희를 유혹에 빠지지 않게 하시고 <break time="0.5s" />
악에서 구하소서. <break time="0.5s" />
아멘.
```

**성모송 뒷단** — 파일명 `resp_hail_mary.mp3`

```
천주의 성모 마리아님, <break time="0.5s" />
이제와 저희 죽을 때에 <break time="0.5s" />
저희 죄인을 위하여 빌어 주소서. <break time="0.5s" />
아멘.
```

**영광송 뒷단** — 파일명 `resp_glory_be.mp3`

```
처음과 같이 <break time="0.5s" />
이제와 항상 영원히. <break time="0.5s" />
아멘.
```

**구원을 비는 기도 뒷단** — 파일명 `resp_fatima.mp3`

```
연옥 영혼을 돌보시며 <break time="0.5s" />
가장 버림받은 영혼을 돌보소서.
```

## 7. 들어 보고 확인할 것

- 줄 끝마다 자연스럽게 쉬는지, 쉼이 너무 길거나 짧지 않은지.
- 아래 낱말을 또박또박 읽는지: 천주, 성모, 영광, 통공, 심판, 빌어 주소서, 돌보소서.
- 62개의 음량과 속도가 비슷한지. 한두 개만 크거나 빠르면 그 파일만 같은 설정으로 다시 만드세요.
- 앞뒤에 잡음이나 이상한 숨소리가 없는지.

## 8. 앱에 넣기

1. 파일을 `sister/` 폴더와 `priest/` 폴더에 나눠 담고 하나의 zip으로 묶습니다.
2. 그 zip을 이 채팅에 첨부해 주세요. 제가 `assets/leader_voice/sister/`와 `assets/leader_voice/priest/`에 넣고 소리 크기를 맞춘 뒤 APK를 다시 빌드합니다.
3. 첨부가 어려우면 GitHub 저장소 웹 화면에서 같은 폴더에 직접 올리셔도 됩니다.

## 9. 파일 이름 요약

| 종류 | 개수 | 이름 형식 |
| --- | --- | --- |
| 선창 기도 | 6 | `sign_of_cross`, `apostles_creed`, `our_father`, `hail_mary`, `glory_be`, `fatima` |
| 선창 신비 | 20 | `mystery_joyful_1`~`5`, `mystery_luminous_1`~`5`, `mystery_sorrowful_1`~`5`, `mystery_glorious_1`~`5` |
| 후창 | 5 | `resp_apostles_creed`, `resp_our_father`, `resp_hail_mary`, `resp_glory_be`, `resp_fatima` |

모두 끝에 `.mp3`를 붙입니다. 목소리마다 31개씩입니다.
