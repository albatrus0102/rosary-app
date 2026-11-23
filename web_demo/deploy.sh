#!/usr/bin/env bash
# web_demo/deploy.sh — 빌드한 정적 폴더를 Cloudflare Pages 에 올린다. (이 스크립트를 만든 쪽은 실행하지 않았다.)
#   CLOUDFLARE_API_TOKEN=... CLOUDFLARE_ACCOUNT_ID=... bash web_demo/deploy.sh
# 토큰·계정 번호는 환경 변수로만 읽는다(저장소·문서에 적지 않는다). 토큰 권한: 「Cloudflare Pages: 편집(Edit)」.
# 처음 한 번은 프로젝트가 없으면 만든다(이미 있으면 그대로 넘어간다). 올린 주소: https://rosarium-demo.pages.dev/v/<토큰>/
set -euo pipefail
cd "$(dirname "$0")/.."

: "${CLOUDFLARE_API_TOKEN:?CLOUDFLARE_API_TOKEN 이 필요합니다}"
: "${CLOUDFLARE_ACCOUNT_ID:?CLOUDFLARE_ACCOUNT_ID 가 필요합니다}"
PROJECT="${PROJECT:-rosarium-demo}"

# 1) 빌드(링크 파일 web_demo/links.local.json 으로 토큰 폴더를 만든다; 없으면 기본 대응표로 새로 만든다)
node web_demo/build.mjs --base "https://${PROJECT}.pages.dev"

# 2) 프로젝트가 없으면 만든다(있으면 오류를 무시)
npx --yes wrangler pages project create "$PROJECT" --production-branch main >/dev/null 2>&1 || true

# 3) 올리기
npx --yes wrangler pages deploy build/web_demo --project-name "$PROJECT" --branch main --commit-dirty=true

echo "올렸습니다. 받는 곳별 주소는 build/web_demo_links.txt (비밀 — 저장소·채팅에 올리지 마세요)."
