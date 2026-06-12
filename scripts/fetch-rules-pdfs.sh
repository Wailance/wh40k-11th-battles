#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
mkdir -p "$ROOT/data/sources"
CORE_URL='https://assets.warhammer-community.com/warhammer40000_core&key_corerules_eng_24.09-5xfayxjekm.pdf'
TC_URL='https://assets.warhammer-community.com/eng_4-xglmycxyvf.pdf'
echo "Downloading Core Rules PDF..."
curl -fsSL -o "$ROOT/data/sources/core-rules.pdf" "$CORE_URL"
echo "Downloading Tournament Companion PDF..."
curl -fsSL -o "$ROOT/data/sources/tournament-companion.pdf" "$TC_URL"
ls -lh "$ROOT/data/sources/"*.pdf
