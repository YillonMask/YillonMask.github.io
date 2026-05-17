#!/usr/bin/env bash
#
# publish.sh — copy the briefing markdown into this repo, rebuild HTML,
# commit, and push. GitHub Pages picks it up automatically (~30–60s).
#
# Usage:
#   ./publish.sh               # today's briefing
#   ./publish.sh 2026-05-12    # specific date
#
set -euo pipefail

DATE="${1:-$(date +%Y-%m-%d)}"
REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SRC_DIR="$HOME/Library/CloudStorage/OneDrive-NortheasternUniversity/playground/daily_briefing_prompting"
SRC_FILE="$SRC_DIR/${DATE}-briefing.md"

echo "→ Publishing briefing for $DATE"

if [[ ! -f "$SRC_FILE" ]]; then
  echo "error: source markdown not found: $SRC_FILE" >&2
  exit 1
fi

/bin/cp -f "$SRC_FILE" "$REPO_DIR/briefings/"
echo "  copied $(basename "$SRC_FILE") → briefings/"

SRC_MP3="$SRC_DIR/podcast/${DATE}-podcast.mp3"
if [[ -f "$SRC_MP3" ]]; then
  mkdir -p "$REPO_DIR/briefings/audio"
  /bin/cp -f "$SRC_MP3" "$REPO_DIR/briefings/audio/"
  echo "  copied $(basename "$SRC_MP3") → briefings/audio/"
fi

cd "$REPO_DIR"
python3 build_briefings.py

git add briefings/
if git diff --cached --quiet; then
  echo "  nothing to commit — site is already up to date"
  exit 0
fi

git commit -m "Daily briefing $DATE"
git push
echo "✓ pushed — live in ~30–60s at https://yillonmask.github.io/briefings/"
