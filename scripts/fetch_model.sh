#!/usr/bin/env bash
# 한국어 스트리밍 음성 인식 모델(sherpa-onnx zipformer)을 내려받아
# assets/models/<모델명>/ 에 필요한 4개 파일만 복사한다. 이미 있으면 건너뛴다(멱등).
# 참고: bpe.vocab(핫워드 BPE 분할용)은 저장소에 커밋되어 있어 여기서 내려받지 않는다.
set -euo pipefail

MODEL="sherpa-onnx-streaming-zipformer-korean-2024-06-16"
FILES=(
  "encoder-epoch-99-avg-1.int8.onnx"
  "decoder-epoch-99-avg-1.onnx"
  "joiner-epoch-99-avg-1.int8.onnx"
  "tokens.txt"
)
GH_URL="https://github.com/k2-fsa/sherpa-onnx/releases/download/asr-models/${MODEL}.tar.bz2"
HF_BASE="https://huggingface.co/k2-fsa/${MODEL}/resolve/main"

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEST="${ROOT}/assets/models/${MODEL}"

all_present() {
  local f
  for f in "${FILES[@]}"; do
    [[ -s "${DEST}/${f}" ]] || return 1
  done
}

print_sizes() {
  local f
  for f in "${FILES[@]}"; do
    printf '  %12s bytes  %s\n' "$(wc -c < "${DEST}/${f}" | tr -d ' ')" "${f}"
  done
}

if all_present; then
  echo "모델 파일이 이미 있습니다: ${DEST}"
  print_sizes
  exit 0
fi

mkdir -p "${DEST}"
TMP="$(mktemp -d)"
trap 'rm -rf "${TMP}"' EXIT

download_github() {
  echo "GitHub 릴리스에서 내려받는 중: ${GH_URL}"
  curl -fL --progress-bar --retry 3 --retry-delay 2 -o "${TMP}/model.tar.bz2" "${GH_URL}" || return 1
  mkdir -p "${TMP}/extract"
  tar -xjf "${TMP}/model.tar.bz2" -C "${TMP}/extract" || return 1
  local f
  for f in "${FILES[@]}"; do
    local src
    src="$(find "${TMP}/extract" -type f -name "${f}" | head -n 1)"
    [[ -n "${src}" ]] || { echo "아카이브에 ${f} 가 없습니다." >&2; return 1; }
    cp "${src}" "${DEST}/${f}"
  done
}

download_huggingface() {
  echo "HuggingFace에서 내려받는 중: ${HF_BASE}/<파일>"
  local f
  for f in "${FILES[@]}"; do
    curl -fL --progress-bar --retry 3 --retry-delay 2 -o "${TMP}/${f}" "${HF_BASE}/${f}" || return 1
    cp "${TMP}/${f}" "${DEST}/${f}"
  done
}

if ! download_github; then
  echo "GitHub 다운로드 실패, HuggingFace로 대체합니다." >&2
  if ! download_huggingface; then
    echo "오류: 모델을 내려받지 못했습니다. 네트워크를 확인하고 다시 실행하세요." >&2
    exit 1
  fi
fi

if ! all_present; then
  echo "오류: 일부 파일이 누락되었습니다." >&2
  exit 1
fi

echo "완료: ${DEST}"
print_sizes
