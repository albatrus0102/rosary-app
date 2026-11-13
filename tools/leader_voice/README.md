# 후창 모드 선창 음성 생성 도구

후창(responder) 모드에서 앱이 들려주는 "선창" 음성을 **신경망 TTS 클라우드 서비스로 미리 한 번만 만들어** 앱에 번들하기 위한 도구입니다.
목소리는 두 가지입니다.

| persona | 이름 | 성별 | 출력 위치 |
| --- | --- | --- | --- |
| `sister` | 수녀님 | 여성 | `assets/leader_voice/sister/<cueId>.mp3` |
| `priest` | 신부님 | 남성 | `assets/leader_voice/priest/<cueId>.mp3` |

큐는 26개(기도 6 + 신비 20)이므로 목소리당 26개, 합계 **52개** 클립입니다. 예상 용량은 전체 약 **4~6 MB**
(`--normalize` 후 64 kbps 모노 기준 클립당 약 50~120 KB).

## 구성 파일

- `export_cues.dart` : 앱의 `allLeaderCues`를 읽어 `cues.json`(id, title, text 26건)을 만든다. 문구가 바뀌면 다시 실행.
  - `dart run tools/leader_voice/export_cues.dart` (저장소 루트에서)
- `cues.json` : 생성된 큐 목록.
- `generate.py` : TTS 호출/저장 도구 (Python 3 표준 라이브러리만 사용).
- `manifest.json` : 생성 후 자동 작성. persona별 provider, voice, generatedAt, 파일별 bytes/sha256.

## 제공자 선택과 키 발급

`--provider {google,azure,openai,elevenlabs}`. 어느 쪽이든 한 번만 만들면 되므로 무료 구간이나 소액으로 끝나는 경우가 많지만,
**가격과 약관은 어시스턴트가 확인하지 못했으니 직접 확인**하세요.

### 1. Google Cloud Text-to-Speech (`google`)

1. Google Cloud 콘솔에서 프로젝트를 만들고 결제 계정을 연결한다.
2. "API 및 서비스" -> 라이브러리에서 **Cloud Text-to-Speech API**를 사용 설정한다.
3. "사용자 인증 정보" -> 사용자 인증 정보 만들기 -> **API 키**. 만든 키의 "API 제한"을 **Cloud Text-to-Speech API**로 한정한다.
4. 환경 변수 `GOOGLE_TTS_API_KEY`에 넣는다.

기본 음성: 수녀님 `ko-KR-Chirp3-HD-Leda` (대체 `ko-KR-Neural2-A`), 신부님 `ko-KR-Chirp3-HD-Charon` (대체 `ko-KR-Neural2-C`).
Chirp 3: HD 음성은 SSML 지원이 제한적이라 `--ssml auto`(기본)에서는 평문과 줄바꿈을 보내고 `speakingRate`로 속도를 맞춥니다.
Neural2 등 다른 음성은 쉼표/줄 끝 `<break>`가 들어간 SSML을 보냅니다. `--ssml on|off`로 강제할 수 있습니다.
(Chirp 3: HD의 SSML 지원 여부는 어시스턴트가 검증하지 못했습니다. 오디션으로 확인하세요.)

### 2. Azure AI Speech (`azure`)

1. Azure 포털에서 **Speech** 리소스를 만든다 (가격 책정 계층 **F0 무료** 선택 가능).
2. 리소스의 "키 및 엔드포인트"에서 **KEY 1**과 **지역(Region, 예: koreacentral)**을 확인한다.
3. 환경 변수 `AZURE_SPEECH_KEY`, `AZURE_SPEECH_REGION`에 넣는다.

기본 음성: 수녀님 `ko-KR-SunHiNeural` (대체 `ko-KR-SoonBokNeural`, `ko-KR-JiMinNeural`, `ko-KR-SeoHyeonNeural`, `ko-KR-YuJinNeural`),
신부님 `ko-KR-InJoonNeural` (대체 `ko-KR-BongJinNeural`, `ko-KR-GookMinNeural`).

### 3. OpenAI (`openai`)

1. platform.openai.com 에 로그인해 결제 수단을 등록한다.
2. API keys 메뉴에서 새 키를 만든다.
3. 환경 변수 `OPENAI_API_KEY`에 넣는다.

모델 `gpt-4o-mini-tts`. 수녀님 `coral`, 신부님 `onyx` (대체 `ash`, `echo`, `ballad`). 속도/분위기는 persona별 한국어 `instructions`로 지시합니다
(수녀님: 따뜻하고 부드럽고 경건하게 / 신부님: 차분하고 낮고 엄숙하며 서두르지 않게; 둘 다 줄 바꿈마다 자연스럽게 쉬며 천천히).
음성 목록 API가 없어 `--list-voices`는 쓸 수 없습니다.

### 4. ElevenLabs (`elevenlabs`)

1. elevenlabs.io 에 계정을 만든다.
2. 계정 메뉴의 **API Keys**에서 키를 만든다 (필요한 권한: Text to Speech, Voices 읽기).
3. 환경 변수 `ELEVENLABS_API_KEY`에 넣는다.

모델 `eleven_multilingual_v2`, `voice_settings`는 stability 0.6, similarity_boost 0.75, style 0, speed 0.9(`--rate`), 출력 `mp3_44100_64`.
텍스트에는 줄 끝마다 `<break time="0.5s" />`, 쉼표 뒤 `<break time="0.3s" />`, 신비 큐의 제목과 묵상 문장 사이 `0.8s`를 넣습니다.
**기본 음성이 없습니다.** voice_id는 계정마다 다르므로 `--list-voices`(이름, voice_id, 성별 등 라벨, 한국어 검증 여부)로 고른 뒤
`--voice-sister <voice_id> --voice-priest <voice_id>`를 반드시 지정해야 합니다.
**유료 플랜이 있어야 상업적 이용 라이선스가 인정됩니다. 무료 플랜으로 만든 오디오는 상업적으로 쓸 수 없습니다.** 앱을 배포(특히 유료/광고 포함)할 계획이면 유료 플랜에서 생성하세요.
(`--list-voices`는 문서상의 `GET /v2/voices`를 사용합니다. 어시스턴트가 실제 호출로 검증하지는 못했습니다.)

> 음성 이름은 계정/리전/시점에 따라 달라질 수 있으니 **기본값이 존재한다고 가정하지 말고** 먼저 `--list-voices`로 확인하세요.
> 없는 이름이면 API가 400/404를 돌려주며, 도구가 `--list-voices` 안내 메시지를 출력합니다.

## 키 전달 방법

**키를 채팅에 붙여 넣거나 저장소에 커밋하지 마세요.** 도구는 키를 환경 변수로만 읽고, 출력/매니페스트에 쓰지 않습니다.

- 클라우드(Claude Code) 환경: 환경(Environment) 설정에서 해당 이름의 환경 변수로 추가한 뒤 **새 세션**에서 실행.
- 로컬: 터미널에서 `export GOOGLE_TTS_API_KEY='...'` (셸 기록에 남기기 싫으면 `read -rs GOOGLE_TTS_API_KEY; export GOOGLE_TTS_API_KEY`).

## 실행 순서 (저장소 루트에서)

```bash
# 0) 큐 목록 확인/갱신 (이미 cues.json이 있으면 생략 가능)
dart run tools/leader_voice/export_cues.dart

# 1) 쓸 수 있는 한국어 음성과 성별 확인
python3 tools/leader_voice/generate.py --provider google --list-voices

# 2) 요청 내용만 미리 보기 (키/네트워크 불필요)
python3 tools/leader_voice/generate.py --provider google --dry-run

# 3) 오디션: persona별로 3개 클립만
python3 tools/leader_voice/generate.py --provider google --persona sister --only sign_of_cross,hail_mary,glory_be
python3 tools/leader_voice/generate.py --provider google --persona priest --only sign_of_cross,hail_mary,glory_be
#    마음에 안 들면 음성을 바꿔 --force 로 다시:
#    ... --persona sister --voice-sister ko-KR-Neural2-A --only sign_of_cross,hail_mary,glory_be --force

# 4) 전체 생성 (기존 파일은 persona 폴더별로 건너뜀)
python3 tools/leader_voice/generate.py --provider google

# 5) 음량 정규화(-18 LUFS 근처) + 24kHz 모노 64kbps. ffmpeg 필요, 없으면 알림 후 건너뜀
python3 tools/leader_voice/generate.py --provider google --normalize
```

ElevenLabs 예: `python3 tools/leader_voice/generate.py --provider elevenlabs --list-voices` 후
`... --provider elevenlabs --voice-sister <id> --voice-priest <id> --persona sister --only sign_of_cross,hail_mary,glory_be`.

주요 옵션: `--persona {sister,priest,both}`(기본 both), `--voice-sister`, `--voice-priest`(단일 persona일 때만 `--voice`),
`--rate`(기본 0.9), `--only ID[,ID]`, `--force`, `--out`(기본 `assets/leader_voice`), `--dry-run`, `--list-voices`, `--normalize`.
`python3 tools/leader_voice/generate.py --help`에 제공자별 기본/대체 음성이 모두 나옵니다.

주의: 음성을 바꿀 때는 해당 persona를 `--force`로 전부 다시 만들어 한 목소리로 통일하세요. 같은 persona 폴더에 서로 다른 음성이 섞일 수 있습니다.
오류 시(401/403/400 등) 메시지로 원인을 안내하고, 429/5xx는 지수 백오프로 재시도합니다.

## 앱이 파일을 쓰는 방법

앱은 `assets/leader_voice/<persona>/<cueId>.mp3`를 번들 에셋으로 읽습니다(`<cueId>`는 `cues.json`의 id, 예: `hail_mary`, `mystery_joyful_1`).
파일이 없으면 기기 TTS 음성으로 대체됩니다. 생성 후 `pubspec.yaml`의 assets 등록(앱 쪽 작업)을 확인하고 앱을 다시 빌드하세요.

### 선창 모드의 뒷단 클립 (`resp_*`)

선창(leader) 모드에서는 사용자가 앞단을 하고, **앱이 뒷단을 목소리로 받습니다.** 이때 쓰는 클립이
`assets/leader_voice/<persona>/resp_<기도 id>.mp3` 5개입니다(`resp_apostles_creed`, `resp_our_father`,
`resp_hail_mary`, `resp_glory_be`, `resp_fatima`). 대본은 `responder_cues.json`, 분할선은
`lib/domain/prayer_splits.dart`의 `responderStartLine`입니다.

동작 규칙(`PrayerScreen` + `LeaderVoice.speakResponder`):

- 설정의 '상대 목소리'가 켜져 있고 모드가 선창일 때만 동작합니다. 혼자 모드는 소리가 없고, 후창 모드는 기존대로
  앞단 클립(`<cueId>.mp3`)을 스텝에 들어갈 때 들려줍니다.
- 스텝에 들어갈 때는 아무 소리도 내지 않습니다(앞단은 사용자가 합니다). 사용자가 앞단을 마치고 **다음 구슬 단추 ·
  글 탭 · 볼륨 키**로 넘기면, 뒷단이 있는 스텝은 `resp_*` 클립을 먼저 재생하고 **끝나면 자동으로 다음 스텝**으로
  넘어갑니다. 재생 중에는 '뒷단 듣는 중…' 상태와 뒷단 문장 강조가 보이고, 다시 누르면 재생을 멈추고 바로 넘어갑니다.
- 뒷단이 없는 스텝(성호경·마침)은 곧바로 넘어갑니다. 클립이 없거나 재생에 실패하면 기기 TTS가 뒷단 문장을 읽습니다.
- 이전·지도 이동·앱이 백그라운드로 감·화면 종료 때는 재생을 멈추고 넘기지 않으며, 늦게 도착한 이전 재생의 완료
  신호는 무시합니다(재생 번호 + 클립마다 새 재생기).
- 소스가 '직접 녹음'이면 뒷단은 AI 음성(선택한 화자)으로 들려줍니다(녹음은 앞단뿐).
- 화자는 후창 모드와 같은 설정(`leaderPersona`)을 씁니다. 클립 id→스텝 매핑은 `RosaryStep.responderCueId`
  (순수 함수, `test/leader_cues_test.dart`).

## 라이선스 / 약관

- 개인용으로 생성하는 것을 전제로 만든 도구입니다. 앱을 **배포**한다면 선택한 제공자의 약관(생성 음성의 재배포/상업적 이용, 출처 표기, 플랜 조건)을 반드시 확인하세요.
- **어시스턴트는 각 제공자의 현재 약관과 가격을 확인하지 못했습니다.**

## 배포 시 확인할 약관

2026년 11월에 검색으로 확인한 내용입니다. 검색 결과의 발췌만 읽은 것이고 약관 전문 검토나 법률 자문이 아니므로, 배포 전에 각 서비스의 현재 약관과 요금을 직접 확인하세요.

- **구글 클라우드 Text-to-Speech**: [문서](https://docs.cloud.google.com/text-to-speech/docs/basics)에 만든 오디오 파일을 애플리케이션에 쓸 수 있다고 적혀 있습니다. [서비스별 약관](https://cloud.google.com/terms/service-terms)은 커스텀 음성을 최종 사용자용 앱에 넣는 것을 금지하며, 생성물로 경쟁 서비스를 만드는 것도 금지합니다. 표준 음성은 커스텀 음성이 아닙니다. 정적 오디오 파일을 앱에 넣는 경우를 직접 다룬 문구는 찾지 못했습니다.
- **마이크로소프트 Azure Speech**: 유료 등급의 기본 신경망 음성은 결과물을 상업적으로 쓰고 재배포할 수 있다는 [커뮤니티 답변](https://learn.microsoft.com/en-us/answers/questions/5987029/can-audio-generated-with-azure-text-to-speech-be-p)이 있으나 공식 문구는 확인하지 못했습니다. 무료(F0) 등급 결과물은 피하라는 답변이 있습니다. 합성 음성임을 사용자에게 알려야 합니다([투명성 노트](https://learn.microsoft.com/en-us/azure/foundry/responsible-ai/speech-service/text-to-speech/transparency-note)).
- **오픈AI**: [TTS 문서](https://platform.openai.com/docs/guides/text-to-speech)가 음성이 AI로 만든 것임을 사용자에게 명확히 알리도록 요구합니다. 같은 문서에 따르면 tts-1, tts-1-hd, gpt-4o-mini-tts 모델은 2027년 1월 6일에 종료될 예정입니다.
- **일레븐랩스**: 유료 플랜은 [상업적 이용 라이선스를 포함](https://help.elevenlabs.io/hc/en-us/articles/13313564601361-Can-I-publish-the-content-I-generate-on-the-platform)하고, 무료 플랜 결과물은 상업적으로 쓸 수 없습니다. 구독 기간에 만든 음성은 [해지한 뒤에도 계속 상업적으로 쓸 수 있습니다](https://help.elevenlabs.io/hc/en-us/articles/15993008593297-What-happens-to-my-content-after-my-subscription-ends). 앱에 파일을 넣는 경우를 직접 다룬 문구는 찾지 못했습니다. 일레븐랩스는 구독 기간 밖에 만든 결과물에 출처 표기를 요구합니다.
- **공통**: 앱 안과 스토어 설명에 "AI로 합성한 음성이며 사람이 녹음한 것이 아닙니다"라고 알려 주세요. 앱에는 이미 이 안내가 들어갑니다.
- **입력 문장의 권리**: 음성으로 만드는 기도문과 앱 화면의 기도문은 한국천주교주교회의 『가톨릭 기도서』 번역을 기준으로 합니다. 앱에 싣고 음성으로 합성해 배포하는 것의 사용 허락 범위는 확인하지 못했으니, 배포 전에 주교회의에 문의하세요. 음성 서비스들도 입력 문장에 대한 권리는 사용자 책임이라고 안내합니다.
