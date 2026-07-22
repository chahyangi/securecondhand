#!/bin/bash
set -e

cd "$(dirname "$0")"

BRANCH=$(git branch --show-current)
MSG="${1:-Update $(date '+%Y-%m-%d %H:%M:%S')}"

if [ -z "$(git status --porcelain)" ]; then
  echo "변경사항이 없습니다."
  exit 0
fi

echo "== git status =="
git status -s

git add -A
git commit -m "$MSG"
git push origin "$BRANCH"

echo "완료: $BRANCH 브랜치에 push 되었습니다."
