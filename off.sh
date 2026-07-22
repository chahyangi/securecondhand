#!/usr/bin/env bash
# start.sh로 띄운 것들을 전부 내린다.
# start.sh는 Ctrl+C 한 번으로 백엔드/프론트엔드는 종료되지만, PostgreSQL 컨테이너는
# 의도적으로 계속 띄워둔다 (재기동할 때마다 DB를 다시 올리지 않아도 되도록). 이 스크립트는
# 터미널을 그냥 닫아서 트랩이 안 걸렸거나, PostgreSQL까지 마저 내리고 싶을 때 쓴다.
set -e
cd "$(dirname "$0")"

echo "▶ Django 백엔드 종료..."
pkill -f "manage.py runserver" 2>/dev/null && echo "  - 종료함" || echo "  - 실행 중이지 않음"

echo "▶ React 프론트엔드(vite) 종료..."
pkill -f "vite" 2>/dev/null && echo "  - 종료함" || echo "  - 실행 중이지 않음"

echo "▶ PostgreSQL 컨테이너 정지 (데이터는 보존됨, 완전히 지우려면 docker compose down)..."
docker compose stop postgres

echo "✓ 모두 종료되었습니다."
