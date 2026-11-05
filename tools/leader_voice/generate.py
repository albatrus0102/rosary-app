#!/usr/bin/env python3
"""후창 모드 선창(leader) 음성 클립을 클라우드 신경망 TTS로 미리 만들어 둔다.

수녀님(sister, 여성) / 신부님(priest, 남성) 두 목소리를 지원하며, 결과는
    assets/leader_voice/sister/<cueId>.mp3
    assets/leader_voice/priest/<cueId>.mp3
로 저장된다. 큐 목록은 tools/leader_voice/cues.json (export_cues.dart 가 생성).

API 키는 환경 변수로만 받는다 (절대 인자로 넘기거나 파일에 쓰지 않는다):
    google     : GOOGLE_TTS_API_KEY
    azure      : AZURE_SPEECH_KEY, AZURE_SPEECH_REGION
    openai     : OPENAI_API_KEY
    elevenlabs : ELEVENLABS_API_KEY

표준 라이브러리만 사용한다. 네트워크 호출은 --dry-run / --help 에서는 일어나지 않는다.
"""

from __future__ import annotations

import argparse
import base64
import datetime as dt
import hashlib
import json
import os
import shutil
import subprocess
import sys
import tempfile
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path
from xml.sax.saxutils import escape as xml_escape

HERE = Path(__file__).resolve().parent
REPO_ROOT = HERE.parent.parent
CUES_PATH = HERE / "cues.json"
MANIFEST_PATH = HERE / "manifest.json"

PERSONAS = ("sister", "priest")
PERSONA_LABEL = {"sister": "수녀님(여성)", "priest": "신부님(남성)"}

# 기본 음성. 이름이 실제로 존재하는지는 반드시 --list-voices 로 확인할 것.
DEFAULT_VOICES = {
    "google": {"sister": "ko-KR-Chirp3-HD-Leda", "priest": "ko-KR-Chirp3-HD-Charon"},
    "azure": {"sister": "ko-KR-SunHiNeural", "priest": "ko-KR-InJoonNeural"},
    "openai": {"sister": "coral", "priest": "onyx"},
    # ElevenLabs 는 voice_id 로 음성을 고르므로 검증 불가한 기본값을 두지 않는다.
    # --list-voices 로 voice_id 를 찾아 --voice-sister / --voice-priest 로 반드시 지정.
    "elevenlabs": {},
}
ALT_VOICES = {
    "google": {
        "sister": ["ko-KR-Neural2-A"],
        "priest": ["ko-KR-Neural2-C"],
    },
    "azure": {
        "sister": ["ko-KR-SoonBokNeural", "ko-KR-JiMinNeural", "ko-KR-SeoHyeonNeural", "ko-KR-YuJinNeural"],
        "priest": ["ko-KR-BongJinNeural", "ko-KR-GookMinNeural"],
    },
    "openai": {"sister": [], "priest": ["ash", "echo", "ballad"]},
    "elevenlabs": {"sister": [], "priest": []},
}

OPENAI_MODEL = "gpt-4o-mini-tts"
OPENAI_INSTRUCTIONS = {
    "sister": (
        "한국어로 읽어 주세요. 가톨릭 기도문을 바치는 따뜻하고 부드러우며 경건한 여성 수녀님의 "
        "목소리로, 차분하고 천천히 읽어 주세요. 줄이 바뀌는 곳마다 자연스럽게 잠시 쉬어 "
        "숨을 고르고, 쉼표에서도 짧게 쉬어 주세요. 과장하거나 연기하듯 읽지 말고 "
        "기도하듯 담담하게 읽어 주세요."
    ),
    "priest": (
        "한국어로 읽어 주세요. 가톨릭 기도문을 이끄는 차분하고 낮으며 엄숙한 남성 신부님의 "
        "목소리로, 서두르지 말고 천천히 읽어 주세요. 줄이 바뀌는 곳마다 자연스럽게 잠시 쉬어 "
        "숨을 고르고, 쉼표에서도 짧게 쉬어 주세요. 과장하거나 연기하듯 읽지 말고 "
        "기도하듯 담담하고 경건하게 읽어 주세요."
    ),
}

ELEVENLABS_MODEL = "eleven_multilingual_v2"
# 쿼리 파라미터 output_format. 문서상 허용값 중 mp3_44100_64 사용 (--normalize 시 24kHz 모노로 재인코딩).
ELEVENLABS_OUTPUT_FORMAT = "mp3_44100_64"
ELEVENLABS_VOICE_SETTINGS = {"stability": 0.6, "similarity_boost": 0.75, "style": 0, "use_speaker_boost": True}
ELEVENLABS_BREAK_LINE = "0.5s"
ELEVENLABS_BREAK_COMMA = "0.3s"
ELEVENLABS_BREAK_MYSTERY_TITLE = "0.8s"  # 한 번의 break 는 3초 미만으로 유지

BREAK_LEADING_MS = 300
BREAK_LINE_MS = 450
BREAK_COMMA_MS = 250
BREAK_MYSTERY_TITLE_MS = 700

MAX_RETRIES = 5
REQUEST_GAP_SEC = 0.3
HTTP_TIMEOUT = 90


class ToolError(Exception):
    """사용자에게 메시지만 보여 주고 종료할 오류 (트레이스백 없음)."""


# --------------------------------------------------------------------------- #
# 텍스트 준비
# --------------------------------------------------------------------------- #

def is_mystery(cue: dict) -> bool:
    return cue["id"].startswith("mystery_")


def to_plain_text(cue: dict) -> str:
    """줄바꿈을 유지한 평문. 신비 큐는 제목과 묵상 문장 사이를 빈 줄로 띄운다."""
    lines = [ln.strip() for ln in cue["text"].split("\n") if ln.strip()]
    if is_mystery(cue) and len(lines) >= 2:
        return lines[0] + "\n\n" + "\n".join(lines[1:])
    return "\n".join(lines)


def to_ssml_body(cue: dict) -> str:
    """<speak>/<voice>로 감쌀 내부 SSML 조각(쉼 포함)."""
    lines = [ln.strip() for ln in cue["text"].split("\n") if ln.strip()]
    parts = [f'<break time="{BREAK_LEADING_MS}ms"/>']
    for i, line in enumerate(lines):
        esc = xml_escape(line)
        esc = esc.replace(",", f',<break time="{BREAK_COMMA_MS}ms"/>')
        parts.append(esc)
        last = i == len(lines) - 1
        if not last:
            ms = BREAK_MYSTERY_TITLE_MS if (is_mystery(cue) and i == 0) else BREAK_LINE_MS
            parts.append(f'<break time="{ms}ms"/>')
    return "".join(parts)


def to_elevenlabs_text(cue: dict) -> str:
    """평문 + <break time="..." /> 태그 (v2 모델 지원). XML 이스케이프는 하지 않는다."""
    lines = [ln.strip() for ln in cue["text"].split("\n") if ln.strip()]
    out = []
    for i, line in enumerate(lines):
        out.append(line.replace(",", f', <break time="{ELEVENLABS_BREAK_COMMA}" />'))
        if i < len(lines) - 1:
            t = ELEVENLABS_BREAK_MYSTERY_TITLE if (is_mystery(cue) and i == 0) else ELEVENLABS_BREAK_LINE
            out.append(f'<break time="{t}" />')
    return "\n".join(out)


def google_ssml(cue: dict) -> str:
    # 속도는 audioConfig.speakingRate 로 지정한다 (SSML prosody 와 중복 적용 방지).
    return f"<speak>{to_ssml_body(cue)}</speak>"


def azure_ssml(cue: dict, voice: str, rate: float) -> str:
    return (
        '<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="ko-KR">'
        f'<voice name="{xml_escape(voice, {chr(34): "&quot;"})}">'
        f'<prosody rate="{rate:g}">{to_ssml_body(cue)}</prosody>'
        "</voice></speak>"
    )


def google_uses_ssml(voice: str, mode: str) -> bool:
    if mode == "on":
        return True
    if mode == "off":
        return False
    # Chirp 3: HD 음성은 SSML 지원이 제한적이라 auto 에서는 평문 + 줄바꿈을 보낸다.
    return "chirp" not in voice.lower()


# --------------------------------------------------------------------------- #
# HTTP
# --------------------------------------------------------------------------- #

def http_request(url: str, *, data: bytes | None, headers: dict, method: str = "POST", what: str = "요청") -> bytes:
    """429/5xx/네트워크 오류는 지수 백오프로 재시도. 키가 든 헤더/URL 은 메시지에 쓰지 않는다."""
    delay = 2.0
    last_err = ""
    for attempt in range(1, MAX_RETRIES + 1):
        req = urllib.request.Request(url, data=data, headers=headers, method=method)
        try:
            with urllib.request.urlopen(req, timeout=HTTP_TIMEOUT) as resp:
                return resp.read()
        except urllib.error.HTTPError as e:
            body = e.read().decode("utf-8", "replace")[:600]
            if e.code == 429 or 500 <= e.code < 600:
                last_err = f"HTTP {e.code}"
                wait = delay
                ra = e.headers.get("Retry-After") if e.headers else None
                if ra and ra.isdigit():
                    wait = max(wait, float(ra))
                if attempt < MAX_RETRIES:
                    print(f"  {what}: {last_err}, {wait:.0f}초 후 재시도 ({attempt}/{MAX_RETRIES - 1})", file=sys.stderr)
                    time.sleep(wait)
                    delay *= 2
                    continue
                raise ToolError(f"{what} 실패: {last_err} (재시도 한도 초과)\n{body}")
            hint = ""
            if e.code in (401, 403):
                hint = "\n  -> API 키가 올바른지, 해당 API/리소스가 활성화되어 있는지 확인하세요."
            elif e.code in (400, 404, 422):
                hint = ("\n  -> 음성 이름이 없거나 요청 형식이 잘못되었을 수 있습니다. "
                        "`--list-voices` 로 실제 사용 가능한 음성 이름을 확인한 뒤 "
                        "--voice-sister / --voice-priest 로 지정하세요.")
            raise ToolError(f"{what} 실패: HTTP {e.code}\n{body}{hint}")
        except (urllib.error.URLError, TimeoutError, ConnectionError) as e:
            last_err = f"{type(e).__name__}: {getattr(e, 'reason', e)}"
            if attempt < MAX_RETRIES:
                print(f"  {what}: 네트워크 오류({last_err}), {delay:.0f}초 후 재시도", file=sys.stderr)
                time.sleep(delay)
                delay *= 2
                continue
            raise ToolError(f"{what} 실패: 네트워크 오류 {last_err}")
    raise ToolError(f"{what} 실패: {last_err}")


# --------------------------------------------------------------------------- #
# 제공자
# --------------------------------------------------------------------------- #

def require_env(provider: str) -> dict:
    """필요한 환경 변수를 읽는다. 없으면 ToolError (값은 절대 출력하지 않음)."""
    need = {
        "google": ["GOOGLE_TTS_API_KEY"],
        "azure": ["AZURE_SPEECH_KEY", "AZURE_SPEECH_REGION"],
        "openai": ["OPENAI_API_KEY"],
        "elevenlabs": ["ELEVENLABS_API_KEY"],
    }[provider]
    env = {k: os.environ.get(k, "").strip() for k in need}
    missing = [k for k, v in env.items() if not v]
    if missing:
        raise ToolError(
            f"환경 변수 {', '.join(missing)} 가 설정되어 있지 않습니다 (provider={provider}).\n"
            "  로컬: export 로 설정하세요. 예) export " + missing[0] + "='...'\n"
            "  클라우드 세션: 환경 설정(Environment settings)에 환경 변수로 추가하세요.\n"
            "  키를 채팅에 붙여 넣거나 저장소에 커밋하지 마세요. 자세한 방법은 tools/leader_voice/README.md 참고."
        )
    return env


def synth_google(cue: dict, voice: str, rate: float, ssml_mode: str, env: dict) -> bytes:
    if google_uses_ssml(voice, ssml_mode):
        inp = {"ssml": google_ssml(cue)}
    else:
        inp = {"text": to_plain_text(cue)}
    payload = {
        "input": inp,
        "voice": {"languageCode": "ko-KR", "name": voice},
        "audioConfig": {"audioEncoding": "MP3", "sampleRateHertz": 24000, "speakingRate": rate},
    }
    raw = http_request(
        "https://texttospeech.googleapis.com/v1/text:synthesize",
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json; charset=utf-8", "X-Goog-Api-Key": env["GOOGLE_TTS_API_KEY"]},
        what=f"Google TTS({cue['id']})",
    )
    try:
        return base64.b64decode(json.loads(raw)["audioContent"])
    except (KeyError, ValueError):
        raise ToolError("Google TTS 응답에 audioContent 가 없습니다.")


def synth_azure(cue: dict, voice: str, rate: float, env: dict) -> bytes:
    region = env["AZURE_SPEECH_REGION"]
    return http_request(
        f"https://{region}.tts.speech.microsoft.com/cognitiveservices/v1",
        data=azure_ssml(cue, voice, rate).encode("utf-8"),
        headers={
            "Ocp-Apim-Subscription-Key": env["AZURE_SPEECH_KEY"],
            "Content-Type": "application/ssml+xml",
            "X-Microsoft-OutputFormat": "audio-24khz-48kbitrate-mono-mp3",
            "User-Agent": "rosary-leader-voice-tool",
        },
        what=f"Azure TTS({cue['id']})",
    )


def openai_payload(cue: dict, voice: str, persona: str) -> dict:
    return {
        "model": OPENAI_MODEL,
        "voice": voice,
        "input": to_plain_text(cue),
        "instructions": OPENAI_INSTRUCTIONS[persona],
        "response_format": "mp3",
    }


def synth_openai(cue: dict, voice: str, persona: str, env: dict) -> bytes:
    return http_request(
        "https://api.openai.com/v1/audio/speech",
        data=json.dumps(openai_payload(cue, voice, persona)).encode("utf-8"),
        headers={"Content-Type": "application/json", "Authorization": f"Bearer {env['OPENAI_API_KEY']}"},
        what=f"OpenAI TTS({cue['id']})",
    )


def elevenlabs_payload(cue: dict, rate: float) -> dict:
    return {
        "text": to_elevenlabs_text(cue),
        "model_id": ELEVENLABS_MODEL,
        "voice_settings": dict(ELEVENLABS_VOICE_SETTINGS, speed=rate),
    }


def synth_elevenlabs(cue: dict, voice_id: str, rate: float, env: dict) -> bytes:
    url = (f"https://api.elevenlabs.io/v1/text-to-speech/{urllib.parse.quote(voice_id, safe='')}"
           f"?output_format={ELEVENLABS_OUTPUT_FORMAT}")
    return http_request(
        url,
        data=json.dumps(elevenlabs_payload(cue, rate)).encode("utf-8"),
        headers={"Content-Type": "application/json", "Accept": "audio/mpeg", "xi-api-key": env["ELEVENLABS_API_KEY"]},
        what=f"ElevenLabs TTS({cue['id']})",
    )


def synthesize(provider: str, cue: dict, voice: str, persona: str, args, env: dict) -> bytes:
    if provider == "google":
        return synth_google(cue, voice, args.rate, args.ssml, env)
    if provider == "azure":
        return synth_azure(cue, voice, args.rate, env)
    if provider == "elevenlabs":
        return synth_elevenlabs(cue, voice, args.rate, env)
    return synth_openai(cue, voice, persona, env)


def list_voices(provider: str) -> None:
    env = require_env(provider)
    if provider == "google":
        raw = http_request(
            "https://texttospeech.googleapis.com/v1/voices?languageCode=ko-KR",
            data=None, method="GET",
            headers={"X-Goog-Api-Key": env["GOOGLE_TTS_API_KEY"]},
            what="Google 음성 목록",
        )
        voices = json.loads(raw).get("voices", [])
        rows = [(v["name"], v.get("ssmlGender", "?"), str(v.get("naturalSampleRateHertz", ""))) for v in voices]
        header = ("name", "gender", "sampleRate")
    elif provider == "azure":
        region = env["AZURE_SPEECH_REGION"]
        raw = http_request(
            f"https://{region}.tts.speech.microsoft.com/cognitiveservices/voices/list",
            data=None, method="GET",
            headers={"Ocp-Apim-Subscription-Key": env["AZURE_SPEECH_KEY"]},
            what="Azure 음성 목록",
        )
        voices = [v for v in json.loads(raw) if v.get("Locale") == "ko-KR"]
        rows = [(v["ShortName"], v.get("Gender", "?"), v.get("VoiceType", "")) for v in voices]
        header = ("name", "gender", "type")
    elif provider == "elevenlabs":
        rows = []
        token = None
        while True:
            q = "page_size=100&include_total_count=false"
            if token:
                q += "&next_page_token=" + urllib.parse.quote(token, safe="")
            raw = http_request(
                f"https://api.elevenlabs.io/v2/voices?{q}",
                data=None, method="GET",
                headers={"xi-api-key": env["ELEVENLABS_API_KEY"]},
                what="ElevenLabs 음성 목록",
            )
            page = json.loads(raw)
            for v in page.get("voices", []):
                labels = v.get("labels") or {}
                langs = v.get("verified_languages") or []
                has_ko = "yes" if any(
                    str(l.get("language", "")).lower() in ("ko", "korean")
                    or str(l.get("locale") or "").lower().startswith("ko") for l in langs
                ) else ("no" if langs else "?")
                label_txt = ", ".join(f"{k}={val}" for k, val in sorted(labels.items()))
                rows.append((v.get("name", ""), v["voice_id"], labels.get("gender", "?"), has_ko, label_txt))
            token = page.get("next_page_token")
            if not page.get("has_more") or not token:
                break
        rows.sort(key=lambda r: r[0].lower())
        print(f"[elevenlabs] 계정에서 쓸 수 있는 음성 {len(rows)}개  (korean = verified_languages 에 한국어 포함 여부, ?=정보 없음)")
        print(f"  {'name':<28} {'voice_id':<24} {'gender':<8} {'korean':<7} labels")
        for name, vid, gender, ko, label_txt in rows:
            print(f"  {name:<28} {vid:<24} {gender:<8} {ko:<7} {label_txt}")
        print("\n오디션 후 --voice-sister <voice_id> --voice-priest <voice_id> 로 지정하세요.")
        return
    else:
        raise ToolError("openai 는 음성 목록 API 가 없습니다. 고정 목록(coral, onyx, ash, echo, ballad ...)을 사용합니다.")
    rows.sort()
    defaults = set(DEFAULT_VOICES[provider].values())
    print(f"[{provider}] ko-KR 음성 {len(rows)}개  (* = 이 도구의 기본값)")
    print(f"  {header[0]:<36} {header[1]:<8} {header[2]}")
    for name, gender, extra in rows:
        mark = "*" if name in defaults else " "
        print(f"{mark} {name:<36} {gender:<8} {extra}")
    missing = [v for v in defaults if v not in {r[0] for r in rows}]
    if missing:
        print(f"\n주의: 기본 음성 {', '.join(missing)} 이(가) 목록에 없습니다. --voice-sister / --voice-priest 로 바꾸세요.")


# --------------------------------------------------------------------------- #
# 파일, 매니페스트, 정규화
# --------------------------------------------------------------------------- #

def sha256_of(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1 << 16), b""):
            h.update(chunk)
    return h.hexdigest()


def load_manifest() -> dict:
    try:
        data = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
        if isinstance(data, dict) and isinstance(data.get("personas"), dict):
            return data
    except (OSError, ValueError):
        pass
    return {"personas": {}}


def atomic_write(path: Path, data: bytes) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(path.suffix + ".tmp")
    tmp.write_bytes(data)
    tmp.replace(path)


def normalize_file(path: Path) -> bool:
    """ffmpeg loudnorm(약 -18 LUFS) + 24kHz 모노 64kbps. 성공하면 True."""
    with tempfile.TemporaryDirectory() as td:
        out = Path(td) / "out.mp3"
        cmd = ["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", str(path),
               "-af", "loudnorm=I=-18:TP=-1.5:LRA=11",
               "-ac", "1", "-ar", "24000", "-codec:a", "libmp3lame", "-b:a", "64k", str(out)]
        r = subprocess.run(cmd, capture_output=True, text=True)
        if r.returncode != 0 or not out.exists() or out.stat().st_size == 0:
            print(f"  ffmpeg 실패({path.name}): {r.stderr.strip()[:300]}", file=sys.stderr)
            return False
        shutil.copyfile(out, path)
    return True


def update_manifest(manifest: dict, persona: str, provider: str, voice: str, out_dir: Path,
                    cues: list, generated_now: set, normalized_now: set, did_generate: bool) -> None:
    prev = manifest["personas"].get(persona, {})
    prev_files = {f["id"]: f for f in prev.get("files", [])}
    files = []
    for cue in cues:
        p = out_dir / f"{cue['id']}.mp3"
        if not p.exists():
            continue
        digest = sha256_of(p)
        old = prev_files.get(cue["id"])
        if cue["id"] in normalized_now:
            normalized = True
        elif cue["id"] in generated_now:
            normalized = False
        else:
            normalized = bool(old and old.get("sha256") == digest and old.get("normalized"))
        files.append({"id": cue["id"], "bytes": p.stat().st_size, "sha256": digest, "normalized": normalized})
    if did_generate or not prev:
        entry_provider, entry_voice = provider, voice
        stamp = dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    else:
        entry_provider = prev.get("provider", provider)
        entry_voice = prev.get("voice", voice)
        stamp = prev.get("generatedAt") or dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    manifest["personas"][persona] = {
        "provider": entry_provider,
        "voice": entry_voice,
        "generatedAt": stamp,
        "files": files,
    }


# --------------------------------------------------------------------------- #
# CLI
# --------------------------------------------------------------------------- #

def build_parser() -> argparse.ArgumentParser:
    voices_help = []
    for prov in ("google", "azure", "openai"):
        d = DEFAULT_VOICES[prov]
        voices_help.append(
            f"  {prov}: 수녀님={d['sister']} (대체: {', '.join(ALT_VOICES[prov]['sister']) or '-'}); "
            f"신부님={d['priest']} (대체: {', '.join(ALT_VOICES[prov]['priest']) or '-'})"
        )
    voices_help.append("  elevenlabs: 기본값 없음. --list-voices 로 voice_id 를 찾아 --voice-sister / --voice-priest 를 반드시 지정")
    epilog = (
        "기본 음성 (여성=수녀님 sister, 남성=신부님 priest):\n" + "\n".join(voices_help) + "\n\n"
        "주의: 음성 이름은 계정/리전/시점에 따라 다를 수 있으므로 반드시 먼저\n"
        "  python3 tools/leader_voice/generate.py --provider google --list-voices\n"
        "로 실제 존재 여부와 성별을 확인하세요. 없는 이름이면 API가 400/404를 돌려주며 이 도구가 안내 메시지를 냅니다.\n\n"
        "키 환경 변수: GOOGLE_TTS_API_KEY | AZURE_SPEECH_KEY + AZURE_SPEECH_REGION | OPENAI_API_KEY | ELEVENLABS_API_KEY"
    )
    p = argparse.ArgumentParser(
        description="후창 모드 선창 음성(수녀님/신부님)을 클라우드 TTS로 미리 생성합니다.",
        epilog=epilog, formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    p.add_argument("--provider", choices=["google", "azure", "openai", "elevenlabs"], required=True)
    p.add_argument("--persona", choices=["sister", "priest", "both"], default="both",
                   help="생성할 목소리 (기본 both)")
    p.add_argument("--voice-sister", metavar="NAME", help="수녀님(여성) 음성 이름 덮어쓰기")
    p.add_argument("--voice-priest", metavar="NAME", help="신부님(남성) 음성 이름 덮어쓰기")
    p.add_argument("--voice", metavar="NAME",
                   help="단일 persona 선택 시 그 음성 이름 덮어쓰기 (--persona both 에서는 사용 불가)")
    p.add_argument("--rate", type=float, default=0.9,
                   help="말하기 속도 (google/azure/elevenlabs, 기본 0.9). openai 는 instructions 로 지시")
    p.add_argument("--ssml", choices=["auto", "on", "off"], default="auto",
                   help="google 전용: SSML 사용 여부. auto=Chirp 음성은 평문, 그 외 SSML (기본 auto)")
    p.add_argument("--only", metavar="ID[,ID]", help="쉼표로 구분한 큐 id만 생성")
    p.add_argument("--force", action="store_true", help="이미 있는 파일도 다시 생성")
    p.add_argument("--out", default="assets/leader_voice",
                   help="출력 루트 (기본 assets/leader_voice; 아래에 sister/, priest/ 생성)")
    p.add_argument("--list-voices", action="store_true", help="음성 목록과 성별 출력 (google/azure: ko-KR만, elevenlabs: 계정 전체 + 한국어 검증 여부)")
    p.add_argument("--dry-run", action="store_true", help="네트워크/키 없이 보낼 요청 내용만 출력")
    p.add_argument("--normalize", action="store_true",
                   help="ffmpeg 로 약 -18 LUFS 정규화, 24kHz 모노 64kbps 로 재인코딩 (없으면 건너뜀)")
    return p


def resolve_voices(args) -> dict:
    voices = _resolve_voices(args)
    if args.provider == "elevenlabs":
        missing = [p for p, v in voices.items() if not v]
        if missing and args.dry_run:
            for p in missing:
                voices[p] = f"<VOICE_ID_{p.upper()}>"
        elif missing:
            flags = " ".join(f"--voice-{p} <voice_id>" for p in missing)
            raise ToolError("elevenlabs 는 기본 음성이 없습니다. 먼저 `--provider elevenlabs --list-voices` 로 "
                            f"voice_id 를 확인하고 {flags} 를 지정하세요.")
    return voices


def _resolve_voices(args) -> dict:
    personas = list(PERSONAS) if args.persona == "both" else [args.persona]
    if args.voice and len(personas) != 1:
        raise ToolError("--voice 는 --persona sister|priest 와 함께만 쓸 수 있습니다. "
                        "둘 다 생성하려면 --voice-sister / --voice-priest 를 사용하세요.")
    voices = {}
    for persona in personas:
        override = getattr(args, f"voice_{persona}") or args.voice
        voices[persona] = override or DEFAULT_VOICES[args.provider].get(persona, "")
    return voices


def load_cues(only: str | None) -> list:
    try:
        cues = json.loads(CUES_PATH.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        raise ToolError(f"{CUES_PATH} 를 읽을 수 없습니다. 먼저 `dart run tools/leader_voice/export_cues.dart` 를 실행하세요.")
    if only:
        wanted = [x.strip() for x in only.split(",") if x.strip()]
        known = {c["id"] for c in cues}
        unknown = [w for w in wanted if w not in known]
        if unknown:
            raise ToolError("알 수 없는 큐 id: " + ", ".join(unknown) + "\n사용 가능: " + ", ".join(c["id"] for c in cues))
        cues = [c for c in cues if c["id"] in wanted]
    return cues


def print_dry_run(provider: str, persona: str, voice: str, cue: dict, args) -> None:
    print(f"--- [{persona}] {cue['id']} ({cue['title']}) voice={voice}")
    if provider == "google":
        use_ssml = google_uses_ssml(voice, args.ssml)
        payload = {
            "input": {"ssml": google_ssml(cue)} if use_ssml else {"text": to_plain_text(cue)},
            "voice": {"languageCode": "ko-KR", "name": voice},
            "audioConfig": {"audioEncoding": "MP3", "sampleRateHertz": 24000, "speakingRate": args.rate},
        }
        print("POST https://texttospeech.googleapis.com/v1/text:synthesize   (키: 헤더 X-Goog-Api-Key, 출력 안 함)")
        print(json.dumps(payload, ensure_ascii=False, indent=2))
    elif provider == "azure":
        print("POST https://<AZURE_SPEECH_REGION>.tts.speech.microsoft.com/cognitiveservices/v1")
        print("X-Microsoft-OutputFormat: audio-24khz-48kbitrate-mono-mp3   Content-Type: application/ssml+xml")
        print(azure_ssml(cue, voice, args.rate))
    elif provider == "elevenlabs":
        print(f"POST https://api.elevenlabs.io/v1/text-to-speech/{voice}?output_format={ELEVENLABS_OUTPUT_FORMAT}   (키: 헤더 xi-api-key, 출력 안 함)")
        print(json.dumps(elevenlabs_payload(cue, args.rate), ensure_ascii=False, indent=2))
    else:
        print("POST https://api.openai.com/v1/audio/speech")
        print(json.dumps(openai_payload(cue, voice, persona), ensure_ascii=False, indent=2))


def run(args) -> int:
    provider = args.provider

    if args.list_voices:
        list_voices(provider)
        return 0

    voices = resolve_voices(args)
    cues = load_cues(args.only)
    out_root = Path(args.out)
    if not out_root.is_absolute():
        out_root = Path.cwd() / out_root

    if args.dry_run:
        print(f"[dry-run] provider={provider} personas={','.join(voices)} cues={len(cues)} out={out_root} (네트워크 호출 없음)")
        for persona, voice in voices.items():
            for cue in cues:
                print_dry_run(provider, persona, voice, cue, args)
        return 0

    # 만들어야 할 것 계산 (페르소나별 디렉터리 기준으로 기존 파일 건너뜀)
    pending = {}
    for persona in voices:
        out_dir = out_root / persona
        pending[persona] = [c for c in cues if args.force or not (out_dir / f"{c['id']}.mp3").exists()]
    total_pending = sum(len(v) for v in pending.values())

    env = require_env(provider) if total_pending else {}

    ffmpeg_ok = True
    if args.normalize and not shutil.which("ffmpeg"):
        print("알림: ffmpeg 를 찾을 수 없어 --normalize 를 건너뜁니다.", file=sys.stderr)
        ffmpeg_ok = False

    manifest = load_manifest()
    for persona, voice in voices.items():
        out_dir = out_root / persona
        out_dir.mkdir(parents=True, exist_ok=True)
        print(f"== {PERSONA_LABEL[persona]} [{provider}] voice={voice} -> {out_dir}")
        generated, normalized = set(), set()
        todo = pending[persona]
        skipped = len(cues) - len(todo)
        if skipped:
            print(f"  기존 파일 {skipped}개 건너뜀 (다시 만들려면 --force)")
        for n, cue in enumerate(todo, 1):
            print(f"  [{n}/{len(todo)}] {cue['id']} ...", end=" ", flush=True)
            try:
                audio = synthesize(provider, cue, voice, persona, args, env)
            except ToolError:
                print("실패")
                raise
            if len(audio) < 200:
                raise ToolError(f"{cue['id']}: 응답 오디오가 비정상적으로 작습니다({len(audio)} bytes).")
            atomic_write(out_dir / f"{cue['id']}.mp3", audio)
            generated.add(cue["id"])
            print(f"{len(audio):,} bytes")
            time.sleep(REQUEST_GAP_SEC)

        if args.normalize and ffmpeg_ok:
            prev_files = {f["id"]: f for f in manifest["personas"].get(persona, {}).get("files", [])}
            for cue in cues:
                p = out_dir / f"{cue['id']}.mp3"
                if not p.exists():
                    continue
                old = prev_files.get(cue["id"])
                already = (cue["id"] not in generated and old and old.get("normalized")
                           and old.get("sha256") == sha256_of(p))
                if already and not args.force:
                    continue
                print(f"  normalize {cue['id']} ...", end=" ", flush=True)
                if normalize_file(p):
                    normalized.add(cue["id"])
                    print("ok")
                else:
                    print("건너뜀")

        update_manifest(manifest, persona, provider, voice, out_dir, cues, generated, normalized, bool(generated))

    manifest["note"] = "generate.py 가 만든 파일. API 키는 포함되지 않음."
    atomic_write(MANIFEST_PATH, (json.dumps(manifest, ensure_ascii=False, indent=2) + "\n").encode("utf-8"))
    print(f"매니페스트: {MANIFEST_PATH}")
    return 0


def main(argv=None) -> int:
    args = build_parser().parse_args(argv)
    try:
        return run(args)
    except ToolError as e:
        print(f"오류: {e}", file=sys.stderr)
        return 2
    except KeyboardInterrupt:
        print("중단됨", file=sys.stderr)
        return 130


if __name__ == "__main__":
    sys.exit(main())
