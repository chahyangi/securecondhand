#!/usr/bin/env bash
# PostgreSQL(Docker) + Django 백엔드 + React 프론트엔드를 한 번에 켠다.
set -e
cd "$(dirname "$0")"

# vite 8 등 프론트엔드 도구가 Node 20+ 전용 API를 쓰므로 버전을 맞춘다.
REQUIRED_NODE_MAJOR=20
if [ -s "$HOME/.nvm/nvm.sh" ]; then
  # shellcheck disable=SC1091
  . "$HOME/.nvm/nvm.sh"
  nvm use "$REQUIRED_NODE_MAJOR" >/dev/null
fi
NODE_MAJOR=$(node -v | sed -E 's/^v([0-9]+).*/\1/')
if [ "$NODE_MAJOR" -lt "$REQUIRED_NODE_MAJOR" ]; then
  echo "✗ Node.js ${REQUIRED_NODE_MAJOR}+ 가 필요합니다 (현재: $(node -v))." >&2
  echo "  nvm install ${REQUIRED_NODE_MAJOR} 로 설치 후 다시 실행해주세요." >&2
  exit 1
fi

echo "▶ PostgreSQL 기동..."
docker compose up -d postgres

cleanup() {
  echo ""
  echo "▶ 서버 종료 중..."
  kill "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null
  wait "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null
}
trap cleanup EXIT INT TERM

echo "▶ Django 백엔드 기동..."
(cd backend && .venv/bin/python manage.py runserver) &
BACKEND_PID=$!

echo "▶ React 프론트엔드 기동..."
npm run dev &
FRONTEND_PID=$!

wait
