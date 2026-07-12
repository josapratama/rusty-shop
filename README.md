# Online Shop - Single Vendor

Aplikasi online shop single vendor berbasis web.

## Tech Stack

- **Frontend**: React + Vite + TypeScript + TailwindCSS
- **Backend**: Rust (Axum + SQLx)
- **Database**: PostgreSQL 16
- **Auth**: JWT

---

## Struktur Project

```
online-shop/
├── backend/          # Rust backend
│   └── Dockerfile
├── frontend/         # React frontend
│   ├── Dockerfile
│   └── nginx.conf
├── database/         # SQL migrations & Docker
│   ├── Dockerfile
│   ├── docker-compose.yml   ← hanya database
│   └── migrations/
│       ├── 001_init.sql
│       └── 002_seed.sql
├── docker-compose.yml       ← full stack
└── .env.example
```

---

## Cara Menjalankan

### Opsi A — Hanya Database (Docker) + Backend & Frontend lokal

Ini cara yang direkomendasikan saat development.

**1. Jalankan database:**

```bash
cd database
cp .env.example .env
# Edit .env jika perlu ubah password

docker compose up -d
# PostgreSQL berjalan di localhost:5432
# Schema + seed data otomatis dijalankan
```

**2. Jalankan backend:**

```bash
cd backend
cp .env.example .env
# Edit DATABASE_URL sesuai kredensial di database/.env

cargo run
# Backend berjalan di http://localhost:8080
```

**3. Jalankan frontend:**

```bash
cd frontend
npm install
cp .env.example .env

npm run dev
# Frontend berjalan di http://localhost:5173
```

---

### Opsi B — Full Stack dengan Docker Compose

Menjalankan database + backend + frontend sekaligus.

```bash
# Di root project
cp .env.example .env
# Edit .env — minimal ganti POSTGRES_PASSWORD dan JWT_SECRET

docker compose up -d --build
```

Akses:

- Frontend: http://localhost
- Backend API: http://localhost:8080/api/v1
- Database: localhost:5432

Cek status:

```bash
docker compose ps
docker compose logs -f postgres    # log database
docker compose logs -f backend     # log backend
```

Stop:

```bash
docker compose down          # stop, data tetap ada
docker compose down -v       # stop + hapus volume (data hilang)
```

---

### Opsi C — Hanya Database (tanpa docker-compose)

```bash
docker run -d \
  --name online_shop_db \
  -e POSTGRES_DB=online_shop \
  -e POSTGRES_USER=shop_user \
  -e POSTGRES_PASSWORD=shop_password \
  -p 5432:5432 \
  -v online_shop_data:/var/lib/postgresql/data \
  $(docker build -q ./database)
```

---

## Environment Variables

### Database (`database/.env`)

| Variable            | Default                   | Keterangan          |
| ------------------- | ------------------------- | ------------------- |
| `POSTGRES_DB`       | `online_shop`             | Nama database       |
| `POSTGRES_USER`     | `shop_user`               | Username PostgreSQL |
| `POSTGRES_PASSWORD` | `shop_password_change_me` | **Wajib diganti**   |
| `DB_PORT`           | `5432`                    | Port host           |

### Backend (`backend/.env`)

| Variable         | Keterangan                                        |
| ---------------- | ------------------------------------------------- |
| `DATABASE_URL`   | `postgres://user:pass@localhost:5432/online_shop` |
| `JWT_SECRET`     | Secret key JWT — **wajib diganti**                |
| `JWT_EXPIRES_IN` | Masa berlaku token, default `7d`                  |
| `HOST`           | Bind address, default `0.0.0.0`                   |
| `PORT`           | Port backend, default `8080`                      |

### Frontend (`frontend/.env`)

| Variable       | Default   | Keterangan   |
| -------------- | --------- | ------------ |
| `VITE_API_URL` | `/api/v1` | Base URL API |

---

## Default Accounts

| Role  | Email            | Password |
| ----- | ---------------- | -------- |
| Admin | admin@shop.com   | admin123 |
| User  | budi@example.com | user123  |

---

## API Endpoints

### Public

```
POST   /api/v1/auth/register
POST   /api/v1/auth/login
GET    /api/v1/products
GET    /api/v1/products/:slug
GET    /api/v1/categories
GET    /api/v1/categories/:slug
```

### User (JWT required)

```
GET    /api/v1/auth/me
GET    /api/v1/profile
PUT    /api/v1/profile
PUT    /api/v1/profile/password
GET    /api/v1/cart
POST   /api/v1/cart/items
PUT    /api/v1/cart/items/:id
DELETE /api/v1/cart/items/:id
DELETE /api/v1/cart
GET    /api/v1/addresses
POST   /api/v1/addresses
PUT    /api/v1/addresses/:id
DELETE /api/v1/addresses/:id
POST   /api/v1/orders
GET    /api/v1/orders
GET    /api/v1/orders/:id
```

### Admin (JWT + role admin required)

```
GET    /api/v1/admin/dashboard
GET    /api/v1/admin/reports
GET    /api/v1/admin/users
PATCH  /api/v1/admin/users/:id/toggle-status
GET    /api/v1/admin/categories
POST   /api/v1/admin/categories
PUT    /api/v1/admin/categories/:id
DELETE /api/v1/admin/categories/:id
GET    /api/v1/admin/products
POST   /api/v1/admin/products
GET    /api/v1/admin/products/:id
PUT    /api/v1/admin/products/:id
DELETE /api/v1/admin/products/:id
GET    /api/v1/admin/orders
GET    /api/v1/admin/orders/:id
PATCH  /api/v1/admin/orders/:id/status
```
