# Securecondhand Backend

Django REST Framework + PostgreSQL backend for the used-goods marketplace prototype.

## Setup

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

The React Vite app already proxies `/api` requests to `http://localhost:8000`.

## Main API Routes

- `GET /api/products/`
- `POST /api/products/`
- `GET /api/products/{id}/`
- `PATCH /api/products/{id}/status/`
- `POST /api/products/{id}/images/`
- `GET /api/categories/`
- `GET /api/profiles/me/`
- `GET /api/wishlists/`
- `GET /api/friends/requests/`
- `GET /api/chatrooms/`
- `GET /api/chatrooms/{id}/messages/`
- `POST /api/chatrooms/{id}/messages/`
- `POST /api/chatrooms/{id}/participants/`
- `POST /api/chatrooms/{id}/bluetooth_verify/`
- `POST /api/reports/`
- `GET /api/transfers/`
- `POST /api/transfers/`
- `GET /api/payments/config/`
- `POST /api/payments/orders/`
- `POST /api/payments/orders/confirm/`

## 지갑 충전 (토스페이먼츠 테스트 연동, 선택)

`.env`에 `TOSS_CLIENT_KEY`/`TOSS_SECRET_KEY`를 설정하면 설정 › 송금 › "충전하기"에서 실제 결제창(테스트 모드, 실제 결제 발생 안 함)을 사용할 수 있다. https://developers.tosspayments.com 가입(이메일만 필요, 사업자등록 불필요) 후 API 키 메뉴에서 발급받는다. 비워두면 이 기능만 빠지고 나머지는 정상 동작한다.

## PostgreSQL

Create a database and user matching `.env`, or edit `.env` to match your local PostgreSQL setup.

With Docker:

```bash
docker compose up -d postgres
```
