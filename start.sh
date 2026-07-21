#!/usr/bin/env bash
# PostgreSQL(Docker) + Django 백엔드 + React 프론트엔드를 한 번에 켠다.
set -e
cd "$(dirname "$0")"

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
