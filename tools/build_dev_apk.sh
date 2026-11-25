#!/usr/bin/env bash
# 개발용 APK(개발용 임시 유리 = 스테인드글라스 시안 포함) 빌드. docs/church/GLASS_DEV_PIPELINE.md
#
#   bash tools/build_dev_apk.sh [flutter build apk 에 더 넘길 인자...]
#
# 일반(배포) APK 와 다른 점은 두 가지뿐이다.
#   1) assets/church/dev/ (시안 그림 팩·대응표·QA Gallery·프레비아티 3D 팩)와, 검수용(출시) 빌드에서 뺀 자산
#      (tools/release_hidden_assets.txt: AI 음성·프레비아티·바티칸/이탈리아 배경 7점·묵주 그림)를 번들에 넣는다.
#      이 경로들은 pubspec.yaml 에 없으므로 빌드하는 동안만 pubspec.yaml 에 줄을 더했다가 끝나면(실패·중단 포함) 원래대로 되돌린다.
#   2) --dart-define=ROSARIUM_DEV_GLASS=true : Flutter 가 장면을 ?devglass=1 로 열고, '개발용 임시 시안' 배지와
#      '더보기 > QA Gallery' 항목을 켜며, lib/app/release_gate.dart 의 숨김(ReleaseGate)을 모두 푼다.
# 산출물: build/dev-apk/rosarium-dev-<버전>-arm64-v8a.apk (arm64 전용, 서명은 일반 빌드와 같은 디버그 키).
# 절대 배포하지 않는다: 시안은 실제 작품이 아니고(release_approved=false) 권리 확인도 되지 않았다.
set -euo pipefail
cd "$(dirname "$0")/.."

FLUTTER="${FLUTTER:-flutter}"
PACK=assets/church/dev/gpack_dev_milan.js
LINE='    - assets/church/dev/'
BAK="$(mktemp)"

# 0) 그림 팩: 없으면 원본(art/glass_milan55/textures)에서 만든다(Pillow 필요).
if [ ! -f "$PACK" ]; then
  python3 tools/glass_bundle/devglass_pack.py milan
fi

restore() {
  if [ -s "$BAK" ]; then cp "$BAK" pubspec.yaml; fi
  rm -f "$BAK" "${ADDF:-}"
}
cp pubspec.yaml "$BAK"
trap restore EXIT INT TERM

if grep -q 'assets/church/dev' pubspec.yaml; then
  echo "pubspec.yaml 에 이미 assets/church/dev 가 있습니다. 커밋하면 안 되는 상태입니다." >&2
  exit 1
fi

# 1) pubspec.yaml 의 '- assets/church/light/' 바로 뒤에 개발용 폴더와 검수용 빌드에서 뺀 자산을 임시로 더한다.
ADDF="$(mktemp)"
echo "$LINE" > "$ADDF"
while IFS= read -r l; do
  case "$l" in ''|'#'*) continue ;; esac
  echo "    - $l" >> "$ADDF"
done < tools/release_hidden_assets.txt
awk -v addf="$ADDF" '{ print } $0 ~ /^    - assets\/church\/light\/$/ { while ((getline x < addf) > 0) print x; close(addf); n++ } END { if (n != 1) exit 3 }' "$BAK" > pubspec.yaml \
  || { echo "pubspec.yaml 에서 '- assets/church/light/' 줄을 찾지 못했습니다." >&2; exit 1; }

# 2) 빌드. 백엔드 값은 환경 변수로 넘기면 일반 빌드와 같이 들어간다(없으면 '백엔드 미설정' 빌드).
DEFINES=(--dart-define=ROSARIUM_DEV_GLASS=true)
# 빌드 표시(터치 기록 머리에 들어간다: 어느 커밋의 APK 로 찍은 기록인지)
BUILD_ID="$(git rev-parse --short HEAD 2>/dev/null || echo nogit)-$(date +%m%d%H%M)"
DEFINES+=("--dart-define=ROSARIUM_BUILD_ID=$BUILD_ID")
for k in SUPABASE_URL SUPABASE_ANON_KEY CHURCH_SERVER_URL; do
  v="${!k:-}"
  if [ -n "$v" ]; then DEFINES+=("--dart-define=$k=$v"); fi
done
"$FLUTTER" build apk --release --split-per-abi --target-platform android-arm64 "${DEFINES[@]}" "$@"

# 3) pubspec.yaml 원복(여기서 먼저 하고, trap 은 실패·중단 때의 안전망)
restore
trap - EXIT INT TERM
if command -v git >/dev/null 2>&1 && git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  git diff --quiet -- pubspec.yaml || echo "주의: pubspec.yaml 이 커밋된 내용과 다릅니다(빌드 전부터 고쳐져 있었는지 확인하세요)." >&2
fi

# 4) 산출물 이름을 바꿔 따로 둔다(일반 APK 와 섞이지 않게).
SRC=build/app/outputs/flutter-apk/app-arm64-v8a-release.apk
VER="$(awk '/^version:/ { print $2 }' pubspec.yaml | tr '+' '_')"
OUT="build/dev-apk/rosarium-dev-${VER}-arm64-v8a.apk"
mkdir -p build/dev-apk
mv "$SRC" "$OUT"
rm -f "$SRC.sha1"

# 5) 개발용 자산이 실제로 들어갔는지 확인하고, 다음 일반 빌드에 시안이 남지 않게 빌드 중간물을 지운다.
bash tools/check_release_apk.sh --expect-dev "$OUT"
find build .dart_tool -depth -path '*assets/church/dev*' -exec rm -rf {} + 2>/dev/null || true
rm -rf build/app/intermediates/flutter build/app/intermediates/assets .dart_tool/flutter_build 2>/dev/null || true

ls -l "$OUT"
echo "개발용 APK: $OUT  (배포 금지 — 개발용 임시 시안 포함)"
