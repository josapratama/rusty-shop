# Deploy Backend di Raspberry Pi 5 + Frontend di Vercel

## Arsitektur

```
Internet
    │
    ├── [Vercel CDN]
    │     └── Frontend React (global, gratis)
    │
    └── [Rumah]
          └── Raspberry Pi 5
                ├── Nginx (port 80/443) ← reverse proxy + SSL
                ├── Rust Backend (port 8080)
                └── PostgreSQL (port 5432)
                      │
                [Router/Modem]
                Port forwarding 80 & 443
```

---

## Yang Dibutuhkan

### Hardware

- Raspberry Pi 5 (disarankan 4GB atau 8GB RAM)
- MicroSD 32GB+ **atau** SSD via USB (lebih disarankan SSD untuk performa & ketahanan)
- Koneksi internet rumah dengan IP publik

### Domain

| Opsi            | Harga           | Keterangan                  |
| --------------- | --------------- | --------------------------- |
| Domain berbayar | ~Rp 100rb/tahun | Niagahoster, Namecheap, dll |
| DuckDNS         | Gratis          | Cocok jika IP rumah dinamis |

---

## Bagian 1 — Setup Raspberry Pi 5

### 1.1 Install OS

Gunakan **Raspberry Pi OS Lite 64-bit** (tanpa GUI, lebih ringan).

1. Download [Raspberry Pi Imager](https://www.raspberrypi.com/software/)
2. Pilih **Raspberry Pi OS Lite (64-bit)**
3. Flash ke SD card / SSD
4. Enable SSH di advanced settings sebelum flash

### 1.2 Install Dependencies

```bash
sudo apt update && sudo apt upgrade -y

# PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Nginx
sudo apt install -y nginx

# Certbot (SSL gratis Let's Encrypt)
sudo apt install -y certbot python3-certbot-nginx

# Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source ~/.cargo/env
```

---

## Bagian 2 — Setup PostgreSQL

```bash
# Masuk ke PostgreSQL
sudo -u postgres psql
```

```sql
-- Buat database dan user
CREATE DATABASE online_shop;
CREATE USER shop_user WITH PASSWORD 'password_kuat_anda';
GRANT ALL PRIVILEGES ON DATABASE online_shop TO shop_user;
\q
```

```bash
# Jalankan migration
psql -U shop_user -d online_shop -f /home/pi/online-shop/database/migrations/001_init.sql
psql -U shop_user -d online_shop -f /home/pi/online-shop/database/migrations/002_seed.sql
```

---

## Bagian 3 — Deploy Backend Rust

### 3.1 Copy Project ke Pi

```bash
# Opsi A: via Git
git clone https://github.com/username/online-shop.git /home/pi/online-shop

# Opsi B: via SCP dari komputer lokal
scp -r ./backend pi@192.168.x.x:/home/pi/online-shop/
```

### 3.2 Build Binary

> Build pertama membutuhkan waktu **10–15 menit** di Pi 5.

```bash
cd /home/pi/online-shop/backend
cargo build --release

# Copy binary ke system path
sudo cp target/release/server /usr/local/bin/online-shop-backend
```

### 3.3 Buat File Environment

```bash
sudo nano /etc/online-shop.env
```

```env
DATABASE_URL=postgres://shop_user:password_kuat_anda@localhost:5432/online_shop
JWT_SECRET=ganti-dengan-string-acak-minimal-32-karakter
HOST=0.0.0.0
PORT=8080
FRONTEND_URL=https://your-app.vercel.app
```

```bash
# Amankan file env (hanya root yang bisa baca)
sudo chmod 600 /etc/online-shop.env
```

### 3.4 Buat Systemd Service (Auto-start)

```bash
sudo nano /etc/systemd/system/online-shop.service
```

```ini
[Unit]
Description=Online Shop Backend (Rust)
After=network.target postgresql.service

[Service]
Type=simple
User=pi
EnvironmentFile=/etc/online-shop.env
ExecStart=/usr/local/bin/online-shop-backend
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

```bash
# Aktifkan dan jalankan service
sudo systemctl daemon-reload
sudo systemctl enable online-shop
sudo systemctl start online-shop

# Cek status
sudo systemctl status online-shop

# Lihat log
sudo journalctl -u online-shop -f
```

---

## Bagian 4 — Setup Nginx

### 4.1 Konfigurasi Reverse Proxy

```bash
sudo nano /etc/nginx/sites-available/online-shop
```

```nginx
server {
    listen 80;
    server_name api.yourdomain.com;

    # Limit ukuran request (untuk upload gambar)
    client_max_body_size 10M;

    location / {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 60s;
        proxy_connect_timeout 10s;
    }
}
```

```bash
# Aktifkan konfigurasi
sudo ln -s /etc/nginx/sites-available/online-shop /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 4.2 SSL Gratis dengan Let's Encrypt

> Pastikan domain sudah mengarah ke IP rumah sebelum langkah ini.

```bash
sudo certbot --nginx -d api.yourdomain.com
```

Certbot akan otomatis:

- Mendapatkan sertifikat SSL
- Mengupdate konfigurasi Nginx untuk HTTPS
- Mengatur auto-renewal

```bash
# Test auto-renewal
sudo certbot renew --dry-run
```

---

## Bagian 5 — IP Dinamis dengan DuckDNS (Gratis)

Jika IP internet rumah berubah-ubah, gunakan DuckDNS.

### 5.1 Daftar DuckDNS

1. Buka [duckdns.org](https://www.duckdns.org)
2. Login dengan Google/GitHub
3. Buat subdomain, misal: `yourshop.duckdns.org`
4. Catat **token** yang diberikan

### 5.2 Setup Auto-Update di Pi

```bash
mkdir -p ~/duckdns
nano ~/duckdns/duck.sh
```

```bash
#!/bin/bash
echo url="https://www.duckdns.org/update?domains=yourshop&token=YOUR_TOKEN_HERE&ip=" \
  | curl -k -o ~/duckdns/duck.log -K -
```

```bash
chmod +x ~/duckdns/duck.sh

# Jalankan setiap 5 menit via cron
crontab -e
```

Tambahkan baris berikut:

```
*/5 * * * * ~/duckdns/duck.sh >/dev/null 2>&1
```

---

## Bagian 6 — Port Forwarding di Router

Masuk ke halaman admin router (biasanya `192.168.1.1` atau `192.168.0.1`).

| External Port | Internal IP         | Internal Port | Protokol |
| ------------- | ------------------- | ------------- | -------- |
| 80            | 192.168.x.x (IP Pi) | 80            | TCP      |
| 443           | 192.168.x.x (IP Pi) | 443           | TCP      |

### Cari IP Lokal Pi

```bash
hostname -I
# Contoh output: 192.168.1.105
```

> **Tips:** Set IP statis untuk Pi di router via DHCP Reservation (by MAC address) agar IP lokal tidak berubah.

---

## Bagian 7 — Setup Frontend di Vercel

### 7.1 Environment Variable di Vercel

Buka **Vercel Dashboard → Project → Settings → Environment Variables**:

```
VITE_API_URL = https://api.yourdomain.com/api/v1
```

Atau jika pakai DuckDNS:

```
VITE_API_URL = https://yourshop.duckdns.org/api/v1
```

### 7.2 Redeploy Frontend

Setelah mengubah environment variable, trigger redeploy:

```bash
# Dari lokal
git commit --allow-empty -m "update api url"
git push
```

---

## Bagian 8 — Update CORS di Backend

Edit `/etc/online-shop.env` di Pi:

```env
FRONTEND_URL=https://your-app.vercel.app
```

Restart backend:

```bash
sudo systemctl restart online-shop
```

---

## Bagian 9 — Keamanan

### 9.1 Firewall (UFW)

```bash
# Hanya izinkan port yang diperlukan
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable

# Cek status
sudo ufw status
```

### 9.2 Fail2ban (Blokir Brute Force)

```bash
sudo apt install -y fail2ban

# Konfigurasi dasar
sudo nano /etc/fail2ban/jail.local
```

```ini
[DEFAULT]
bantime  = 1h
findtime = 10m
maxretry = 5

[sshd]
enabled = true
```

```bash
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

### 9.3 Update Otomatis Security Patch

```bash
sudo apt install -y unattended-upgrades
sudo dpkg-reconfigure --priority=low unattended-upgrades
```

---

## Estimasi Performa Raspberry Pi 5

| Spesifikasi      | Detail                                         |
| ---------------- | ---------------------------------------------- |
| CPU              | Cortex-A76 quad-core 2.4GHz                    |
| RAM              | 4GB / 8GB                                      |
| Concurrent users | ~100–500 (lebih dari cukup untuk toko sendiri) |
| Response time    | < 50ms untuk query sederhana                   |
| Konsumsi daya    | ~5–10 watt                                     |

---

## Perintah Maintenance Sehari-hari

```bash
# Cek status semua service
sudo systemctl status online-shop nginx postgresql

# Lihat log backend real-time
sudo journalctl -u online-shop -f

# Restart backend setelah update
sudo systemctl restart online-shop

# Update binary setelah ada perubahan kode
cd /home/pi/online-shop/backend
git pull
cargo build --release
sudo cp target/release/server /usr/local/bin/online-shop-backend
sudo systemctl restart online-shop

# Backup database
pg_dump -U shop_user online_shop > backup_$(date +%Y%m%d).sql

# Cek penggunaan disk
df -h

# Cek penggunaan RAM
free -h

# Cek suhu CPU Pi
vcgencmd measure_temp
```

---

## Troubleshooting

### Backend tidak bisa connect ke database

```bash
# Cek PostgreSQL berjalan
sudo systemctl status postgresql

# Cek koneksi manual
psql -U shop_user -d online_shop -h localhost
```

### SSL certificate expired

```bash
sudo certbot renew
sudo systemctl reload nginx
```

### Backend crash loop

```bash
# Lihat log error
sudo journalctl -u online-shop -n 50 --no-pager

# Cek environment file
sudo cat /etc/online-shop.env
```

### Port forwarding tidak bekerja

```bash
# Test dari luar jaringan (gunakan HP dengan data seluler)
curl https://api.yourdomain.com/api/v1/categories

# Cek IP publik saat ini
curl ifconfig.me
```

---

## Risiko & Mitigasi

| Risiko              | Dampak                 | Solusi                            |
| ------------------- | ---------------------- | --------------------------------- |
| Listrik mati        | Server down            | UPS kecil (~Rp 300rb)             |
| Internet rumah down | API tidak bisa diakses | Tidak ada fallback, terima risiko |
| IP dinamis berubah  | Domain tidak resolve   | DuckDNS auto-update               |
| SD card rusak       | Data hilang            | Pakai SSD + backup rutin          |
| Overheating         | Performa turun / crash | Heatsink + fan untuk Pi 5         |

---

## Ringkasan Biaya

| Item                  | Biaya             |
| --------------------- | ----------------- |
| Raspberry Pi 5 (4GB)  | ~Rp 1.200.000     |
| SSD 128GB + case USB  | ~Rp 200.000       |
| Heatsink + fan        | ~Rp 100.000       |
| Domain (.com/1 tahun) | ~Rp 150.000       |
| Vercel (Frontend)     | **Gratis**        |
| Let's Encrypt SSL     | **Gratis**        |
| DuckDNS               | **Gratis**        |
| **Total**             | **~Rp 1.650.000** |

Dibandingkan VPS cloud (~Rp 100rb–300rb/bulan), Pi 5 balik modal dalam **6–12 bulan**.
