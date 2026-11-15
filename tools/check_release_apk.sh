#!/usr/bin/env bash
# APK 안에 개발용 임시 유리(스테인드글라스 시안)가 들어 있는지 검사한다. docs/church/GLASS_DEV_PIPELINE.md
#
#   bash tools/check_release_apk.sh <apk>...               # 일반(배포) APK: 시안이 하나도 없어야 통과(있으면 종료 코드 1)
#   bash tools/check_release_apk.sh --expect-dev <apk>...  # 개발용 APK: 시안이 들어 있어야 통과
#
# 보는 것
#   1) 파일 목록: assets/church/dev/ 아래 파일, gpack_dev*, devglass*, ch_qa_*, DEV-0NN 그림
#   2) 번들 자산 내용(flutter_assets 의 글 파일·자산 목록): 'gpack_dev', 'ChurchDevGlassPack', 'DEV-0NN' 문자열
#      (index.html 의 'dev/devglass_boot.js' 한 줄은 '있으면 읽는다'는 훅이라 허용한다. 그 파일 자체가 없어야 한다.)
#   3) 컴파일된 Dart(libapp.so): QA Gallery 의 성당 id 'qa_milan55' — 일반 빌드에서는 컴파일 상수(false)라 코드째 빠진다.
set -euo pipefail

EXPECT_DEV=0
if [ "${1:-}" = "--expect-dev" ]; then EXPECT_DEV=1; shift; fi
if [ "$#" -lt 1 ]; then echo "사용: $0 [--expect-dev] <apk>..." >&2; exit 2; fi

FAIL=0
for APK in "$@"; do
  if [ ! -f "$APK" ]; then echo "없음: $APK" >&2; FAIL=1; continue; fi
  TMP="$(mktemp -d)"
  NAMES="$(unzip -Z1 "$APK")"
  HITS_NAME="$(printf '%s\n' "$NAMES" | grep -E 'assets/church/dev/|gpack_dev|devglass|ch_qa_|DEV-0[0-9][0-9]|glass_milan55' || true)"

  unzip -q -o "$APK" 'assets/flutter_assets/*' 'lib/*/libapp.so' -d "$TMP" 2>/dev/null || true
  HITS_TEXT=""
  if [ -d "$TMP/assets/flutter_assets" ]; then
    HITS_TEXT="$(grep -rlaE 'gpack_dev|ChurchDevGlassPack|DEV-0[0-9][0-9]' "$TMP/assets/flutter_assets" 2>/dev/null | sed "s#^$TMP/##" || true)"
  fi
  HITS_DART=""
  for so in "$TMP"/lib/*/libapp.so; do
    [ -f "$so" ] || continue
    if grep -qa 'qa_milan55' "$so"; then HITS_DART="$HITS_DART ${so#"$TMP"/}"; fi
  done
  rm -rf "$TMP"

  N_NAME="$(printf '%s' "$HITS_NAME" | grep -c . || true)"
  N_TEXT="$(printf '%s' "$HITS_TEXT" | grep -c . || true)"
  SIZE="$(wc -c < "$APK" | tr -d ' ')"
  if [ "$EXPECT_DEV" = "1" ]; then
    if [ "$N_NAME" -gt 0 ] && printf '%s\n' "$NAMES" | grep -q 'assets/church/dev/gpack_dev_' && [ -n "$HITS_DART" ]; then
      echo "OK(개발용): $APK — 개발용 파일 ${N_NAME}개, Dart 개발 플래그 켜짐, ${SIZE} bytes"
    else
      echo "실패(개발용이어야 함): $APK — 개발용 파일 ${N_NAME}개, Dart 표시: ${HITS_DART:-없음}" >&2
      FAIL=1
    fi
  else
    if [ "$N_NAME" -eq 0 ] && [ "$N_TEXT" -eq 0 ] && [ -z "$HITS_DART" ]; then
      echo "OK(일반): $APK — 개발용 임시 유리 없음(파일 0, 문자열 0, Dart 0), ${SIZE} bytes"
    else
      echo "실패: $APK 에 개발용 임시 유리가 들어 있습니다." >&2
      [ -n "$HITS_NAME" ] && printf '  파일:\n%s\n' "$HITS_NAME" | head -20 >&2
      [ -n "$HITS_TEXT" ] && printf '  문자열이 든 자산:\n%s\n' "$HITS_TEXT" | head -20 >&2
      [ -n "$HITS_DART" ] && echo "  Dart 코드에 QA Gallery 가 남아 있음:$HITS_DART" >&2
      FAIL=1
    fi
  fi
done
exit "$FAIL"
