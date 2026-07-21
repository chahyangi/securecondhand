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

## PostgreSQL

Create a database and user matching `.env`, or edit `.env` to match your local PostgreSQL setup.

With Docker:

```bash
docker compose up -d postgres
```
