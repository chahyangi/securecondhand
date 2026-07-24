# 중고거래 플랫폼 (Secure Coding 과제)

React(Vite) 프론트엔드 + Django REST Framework 백엔드 + PostgreSQL로 구현한 중고거래 플랫폼이다. 과제 요구사항과 최소 요구사항 충족 현황은 [과제명세.md](과제명세.md), 개발 전 과정은 [개발과정.md](개발과정.md), 발견/수정한 보안 취약점은 [보안점검.md](보안점검.md), 시스템 설계는 [중고거래플랫폼_설계문서.md](중고거래플랫폼_설계문서.md), 수동 QA 체크리스트는 [기능테스트.md](기능테스트.md)를 참고.

## 요구사항 (Prerequisites)

- Node.js 20 이상 (vite 8이 Node 20+ 전용 API 사용)
- Python 3.11 이상 권장
- Docker + Docker Compose (PostgreSQL 실행용 — 로컬에 PostgreSQL이 이미 있다면 생략 가능)

## 환경 설정 및 실행 방법

1. 저장소 clone 후 루트로 이동

   ```bash
   git clone <repo-url>
   cd securecondhand
   ```

2. PostgreSQL 기동 (루트에서, Docker 사용 시)

   ```bash
   docker compose up -d postgres
   ```

3. 백엔드 설정

   ```bash
   cd backend
   python3 -m venv .venv
   source .venv/bin/activate
   pip install -r requirements.txt
   cp .env.example .env
   ```

   `.env`를 열어 `DJANGO_SECRET_KEY`를 임의의 값으로 바꾼다. `POSTGRES_*` 값은 `docker-compose.yml`의 기본값(`securecondhand`/`securecondhand`/`securecondhand`)과 이미 맞춰져 있으므로 Docker로 띄웠다면 그대로 두면 된다. `TOSS_CLIENT_KEY`/`TOSS_SECRET_KEY`는 선택 사항(11장 지갑 충전 기능 전용) — 비워두면 그 기능만 빠지고 나머지는 정상 동작한다. 발급은 https://developers.tosspayments.com (이메일 가입만 필요, 사업자등록 불필요) > API 키 메뉴에서 받는다.

4. DB 마이그레이션 및 관리자 계정 생성

   ```bash
   python manage.py migrate
   python manage.py createsuperuser   # 선택 — /admin 대시보드 확인용
   ```

5. 프론트엔드 의존성 설치 (루트에서)

   ```bash
   cd ..
   npm install
   ```

6. 서버 실행

   가장 간단한 방법은 루트에서 아래 스크립트로 PostgreSQL(Docker) + Django + Vite를 한 번에 띄우는 것이다 (백엔드는 위 3~4단계로 이미 `.venv`/`.env`/마이그레이션이 되어 있어야 함):

   ```bash
   ./start.sh   # 또는 npm run start
   ```

   또는 터미널을 나눠 각각 실행해도 된다:

   ```bash
   # 터미널 1
   cd backend && source .venv/bin/activate && python manage.py runserver

   # 터미널 2
   npm run dev
   ```

7. 브라우저에서 http://localhost:5173 접속 (Vite dev server가 `/api`, `/media`, 웹소켓 요청을 `http://localhost:8000` 백엔드로 프록시한다).

8. 종료

   ```bash
   ./off.sh   # 또는 npm run stop — 백엔드/프론트는 종료, PostgreSQL 컨테이너는 데이터 보존을 위해 stop만 함
   ```

## 주요 스크립트

| 명령 | 설명 |
|---|---|
| `npm run dev` | 프론트엔드(Vite) 개발 서버만 실행 |
| `npm run backend` | Django 백엔드만 실행 (`.venv` 활성화 상태 가정) |
| `npm run build` | 프론트엔드 프로덕션 빌드 |
| `./start.sh` | PostgreSQL(Docker) + 백엔드 + 프론트엔드 한 번에 실행 |
| `./off.sh` | `start.sh`로 띄운 프로세스 정리 |

백엔드 API 라우트 목록과 백엔드 단독 설정은 [backend/README.md](backend/README.md)에 별도로 정리되어 있다.
