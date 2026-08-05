# Online Shop - Single Vendor

Aplikasi online shop single vendor berbasis web.

## Tech Stack

- **Frontend**: React + Vite + TypeScript + TailwindCSS
- **Backend**: Rust (Axum + SQLx)
- **Database**: PostgreSQL 16
- **Auth**: JWT (disimpan di sessionStorage)

---

## Struktur Project

```text
online-shop/
├── backend/          # Rust backend (Axum)
├── frontend/         # React frontend (Vite)
├── database/         # SQL migrations & Docker
│   └── migrations/
│       ├── 001_init.sql      # Schema awal
│       ├── 002_seed.sql      # Data awal
│       └── 003_improvements.sql  # password_changed_at, shop_config
├── docker-compose.yml        # Full stack
└── .env.example
```

---

## Quick Start

Pastikan [Docker](https://docs.docker.com/get-docker/) sudah terinstall dan berjalan.

**Linux / macOS:**

```bash
chmod +x start.sh
./start.sh
```

**Windows (PowerShell):**

```powershell
.\start.ps1
```

Setelah selesai:

| Service  | URL                            |
| -------- | ------------------------------ |
| Frontend | <http://localhost>             |
| API      | <http://localhost:8080/api/v1> |
| Database | localhost:5432                 |

**Perintah lainnya:**

```bash
./start.sh --logs    # Lihat logs semua service
./start.sh --down    # Stop semua container
./start.sh --build   # Rebuild image
```

---

## Cara Menjalankan (Manual / Development)

### 1. Jalankan database

```bash
cd database
cp .env.example .env
docker compose up -d
```

### 2. Jalankan backend

```bash
cd backend
cp .env.example .env
# Edit .env — isi DATABASE_URL dan optionally SMTP_*

cargo run
# Berjalan di http://localhost:8080
```

### 3. Jalankan frontend

```bash
cd frontend
bun install        # atau: npm install
cp .env.example .env

bun run dev        # atau: npm run dev
# Berjalan di http://localhost:5173
```

---

## Environment Variables

### Backend (`backend/.env`)

| Variable         | Default                 | Keterangan                              |
| ---------------- | ----------------------- | --------------------------------------- |
| `DATABASE_URL`   | —                       | Wajib diisi                             |
| `JWT_SECRET`     | —                       | Min 32 karakter, **wajib diganti**      |
| `JWT_EXPIRES_IN` | `7d`                    | Masa berlaku token, format: `7d`, `30d` |
| `HOST`           | `0.0.0.0`               | Bind address                            |
| `PORT`           | `8080`                  | Port backend                            |
| `BASE_URL`       | `http://localhost:8080` | URL publik backend (untuk link upload)  |
| `FRONTEND_URL`   | `http://localhost:5173` | URL frontend (untuk link di email)      |
| `APP_NAME`       | `Online Shop`           | Nama toko (muncul di email)             |
| `UPLOAD_DIR`     | `./uploads`             | Direktori simpan file upload            |

#### Email / SMTP (semua opsional)

Kalau tidak diisi, email dilewati tanpa error.

| Variable        | Keterangan                                            |
| --------------- | ----------------------------------------------------- |
| `SMTP_HOST`     | Host SMTP, misal `smtp.gmail.com`                     |
| `SMTP_PORT`     | Port SMTP, default `587` (STARTTLS), atau `465` (SSL) |
| `SMTP_USERNAME` | Username / email akun SMTP                            |
| `SMTP_PASSWORD` | Password SMTP (Gmail: gunakan App Password)           |
| `EMAIL_FROM`    | Alamat pengirim, misal `noreply@tokoku.com`           |

#### Contoh konfigurasi SMTP

**Gmail:**

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=emailanda@gmail.com
SMTP_PASSWORD=xxxx-xxxx-xxxx-xxxx   # App Password dari Google Account
EMAIL_FROM=emailanda@gmail.com
```

> Aktifkan "2-Step Verification" di akun Google, lalu buat App Password di:
> Google Account → Security → 2-Step Verification → App Passwords

**Mailtrap (testing — tidak kirim email sungguhan):**

```env
SMTP_HOST=sandbox.smtp.mailtrap.io
SMTP_PORT=587
SMTP_USERNAME=<dari dashboard mailtrap>
SMTP_PASSWORD=<dari dashboard mailtrap>
EMAIL_FROM=noreply@example.com
```

**Hosting SMTP (cPanel/Niagahoster/dll):**

```env
SMTP_HOST=mail.domainanda.com
SMTP_PORT=587
SMTP_USERNAME=noreply@domainanda.com
SMTP_PASSWORD=passwordemail
EMAIL_FROM=noreply@domainanda.com
```

---

## Default Accounts

| Role  | Email              | Password   |
| ----- | ------------------ | ---------- |
| Admin | `admin@shop.com`   | `admin123` |
| User  | `budi@example.com` | `user123`  |

---

## Fitur

### User

- Register & login
- Katalog produk dengan filter kategori, harga, pencarian, dan sorting
- Detail produk
- Keranjang belanja (dengan indikator stok habis)
- Checkout dengan kalkulasi ongkir berdasarkan berat
- Pilih/tambah alamat pengiriman saat checkout
- Riwayat pesanan & detail pesanan
- Cancel pesanan (hanya status pending)
- Upload bukti pembayaran (bank transfer)
- Ubah profil & ganti password

### Admin

- Dashboard statistik
- Manajemen produk (CRUD, soft-delete)
- Manajemen kategori (CRUD)
- Manajemen pesanan (lihat & ubah status)
- Manajemen user (lihat & toggle aktif/nonaktif)
- Laporan penjualan

### Keamanan

- JWT dengan expiry yang bisa dikonfigurasi
- JWT otomatis invalid setelah ganti password
- Rate limiting di `/auth/login` dan `/auth/register` (10 req/menit per IP)
- Password di-hash dengan bcrypt
- JWT disimpan di sessionStorage (bukan localStorage)
- Checkout dengan database transaction + row-level lock (mencegah race condition stok)

### Notifikasi Email (jika SMTP dikonfigurasi)

- Email selamat datang saat register
- Konfirmasi pesanan setelah checkout
- Update status pesanan (paid, processing, shipped, completed, cancelled)

---

## API Endpoints

### Public

```text
POST   /api/v1/auth/register
POST   /api/v1/auth/login
GET    /api/v1/products           ?page, per_page, category, search, min_price, max_price, sort
GET    /api/v1/products/:slug
GET    /api/v1/categories
GET    /api/v1/categories/:slug
```

### User (JWT required)

```text
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
GET    /api/v1/orders             ?page, per_page, status
GET    /api/v1/orders/:id
POST   /api/v1/orders/:id/cancel
POST   /api/v1/orders/:id/payment-proof

POST   /api/v1/upload/payment-proof
```

### Admin (JWT + role admin required)

```text
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
DELETE /api/v1/admin/products/:id    # soft-delete (is_active = false)

GET    /api/v1/admin/orders          ?page, per_page, status
GET    /api/v1/admin/orders/:id
PATCH  /api/v1/admin/orders/:id/status
```

### Static Files

```text
GET    /uploads/payment_proofs/:user_id/:filename
```

---

## Konfigurasi Ongkir

Ongkir dihitung otomatis berdasarkan total berat produk. Rate disimpan di tabel `shop_config`:

```sql
-- Default: Rp 0.5 per gram = Rp 500/kg
SELECT * FROM shop_config WHERE key = 'shipping_cost_per_gram';

-- Ubah rate:
UPDATE shop_config SET value = '1.0' WHERE key = 'shipping_cost_per_gram';
```

Produk yang tidak memiliki kolom `weight` diisi tidak dihitung beratnya (0 gram).

---

## Deployment ke Raspberry Pi

Lihat [docs/raspberry-pi-deployment.md](docs/raspberry-pi-deployment.md).
