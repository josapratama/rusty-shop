# Panduan Port Forwarding untuk Raspberry Pi Server

## Konsep Dasar

```
Internet
    │
    ▼
[Modem/Router]  ← punya IP Publik (misal: 114.122.x.x)
    │
    ├── Laptop      192.168.1.10
    ├── HP          192.168.1.11
    └── Pi 5        192.168.1.105  ← yang kita expose ke internet
```

Port forwarding = "kalau ada request masuk ke port 80/443,
teruskan ke IP 192.168.1.105 di jaringan lokal"

---

## Langkah 0 — Cari IP Lokal Raspberry Pi

Sebelum setting router, catat dulu IP lokal Pi:

```bash
# Di terminal Raspberry Pi
hostname -I

# Output contoh:
# 192.168.1.105
```

---

## Router IndiHome (Huawei HG8245H / EG8145V5)

Router paling umum di Indonesia.

### Cara Masuk Admin Panel

1. Buka browser → ketik `192.168.100.1`
2. Login:
   - Username: `telecomadmin`
   - Password: `admintelecom`

   > Jika tidak bisa, coba username `admin` password `admin`
   > Atau cek stiker di bawah router

### Langkah Port Forwarding

1. Masuk ke menu **Security** → **NAT** → **Port Mapping**
2. Klik **New**
3. Isi form:

```
Name            : online-shop-http
Protocol        : TCP
External Port   : 80
Internal Host   : 192.168.1.105   ← IP Pi kamu
Internal Port   : 80
Status          : Enable
```

4. Klik **Apply**
5. Ulangi untuk port 443:

```
Name            : online-shop-https
Protocol        : TCP
External Port   : 443
Internal Host   : 192.168.1.105
Internal Port   : 443
Status          : Enable
```

6. Klik **Apply** → **Save**

---

## Router IndiHome (ZTE F609 / F660)

### Cara Masuk Admin Panel

1. Buka browser → ketik `192.168.1.1`
2. Login:
   - Username: `admin`
   - Password: `admin`

   > Atau cek stiker di bawah router

### Langkah Port Forwarding

1. Masuk ke menu **Application** → **Port Forwarding**
2. Klik **Add**
3. Isi form:

```
Application     : online-shop
Protocol        : TCP
WAN Port Start  : 80
WAN Port End    : 80
LAN IP Address  : 192.168.1.105
LAN Port Start  : 80
LAN Port End    : 80
```

4. Klik **Add/Save**
5. Ulangi untuk port 443

---

## Router TP-Link (Archer Series)

### Cara Masuk Admin Panel

1. Buka browser → ketik `192.168.0.1` atau `tplinkwifi.net`
2. Login dengan password yang kamu set saat setup
   > Default: username `admin`, password `admin`

### Langkah Port Forwarding

1. Masuk ke menu **Advanced** → **NAT Forwarding** → **Virtual Servers**
2. Klik **Add**
3. Isi form:

```
Service Type    : Custom
External Port   : 80
Internal IP     : 192.168.0.105   ← IP Pi kamu
Internal Port   : 80
Protocol        : TCP
Status          : Enabled
```

4. Klik **Save**
5. Ulangi untuk port 443

---

## Router Mikrotik (Banyak dipakai ISP lokal / RT-RW Net)

### Cara Masuk Admin Panel

1. Buka browser → ketik `192.168.88.1`
2. Login:
   - Username: `admin`
   - Password: _(kosong)_

### Langkah Port Forwarding via Winbox / Web

```
IP → Firewall → NAT → Add (+)

Tab General:
  Chain         : dstnat
  Protocol      : tcp
  Dst. Port     : 80

Tab Action:
  Action        : dst-nat
  To Addresses  : 192.168.1.105
  To Ports      : 80
```

Klik **OK**, ulangi untuk port 443.

Atau via terminal Mikrotik:

```
/ip firewall nat add chain=dstnat protocol=tcp dst-port=80 \
  action=dst-nat to-addresses=192.168.1.105 to-ports=80

/ip firewall nat add chain=dstnat protocol=tcp dst-port=443 \
  action=dst-nat to-addresses=192.168.1.105 to-ports=443
```

---

## Router Biznet / MyRepublic (Biasanya Huawei atau ZTE)

Sama seperti IndiHome — ikuti panduan Huawei atau ZTE di atas.

Alamat admin panel biasanya:

- `192.168.1.1`
- `192.168.100.1`

---

## Set IP Statis untuk Raspberry Pi di Router

> **Penting!** Lakukan ini agar IP lokal Pi tidak berubah saat restart.

### Cara 1 — DHCP Reservation di Router (Disarankan)

1. Cari MAC address Pi:

```bash
ip link show eth0 | grep ether
# Output: link/ether b8:27:eb:xx:xx:xx
```

2. Di admin panel router, cari menu:
   - **DHCP** → **Address Reservation** (TP-Link)
   - **LAN** → **DHCP Static IP** (Huawei)
   - **IP Binding** (ZTE)

3. Tambahkan:

```
MAC Address : b8:27:eb:xx:xx:xx
IP Address  : 192.168.1.105
```

### Cara 2 — Set IP Statis Langsung di Pi

```bash
sudo nano /etc/dhcpcd.conf
```

Tambahkan di bagian bawah:

```
interface eth0
static ip_address=192.168.1.105/24
static routers=192.168.1.1
static domain_name_servers=8.8.8.8 8.8.4.4
```

```bash
sudo reboot
```

---

## Cek IP Publik Rumah

```bash
# Di terminal Pi atau komputer
curl ifconfig.me

# Output contoh:
# 114.122.45.67
```

IP inilah yang harus diarahkan oleh domain kamu.

---

## Setting DNS Domain

Setelah dapat IP publik, arahkan domain ke IP tersebut:

### Di Niagahoster / Namecheap

1. Masuk ke DNS Management domain kamu
2. Tambahkan record:

```
Type  : A
Name  : api
Value : 114.122.45.67   ← IP publik rumah kamu
TTL   : 3600
```

Hasilnya: `api.yourdomain.com` → IP rumah kamu

### Jika IP Dinamis — Pakai DuckDNS

Ikuti panduan DuckDNS di file `raspberry-pi-deployment.md`.

---

## Test Port Forwarding

### Test dari luar jaringan rumah

> Gunakan HP dengan **data seluler** (bukan WiFi rumah), atau gunakan situs online.

```bash
# Test port 80
curl http://api.yourdomain.com

# Test port 443 (setelah SSL terpasang)
curl https://api.yourdomain.com/api/v1/categories
```

### Cek port terbuka via online tool

Buka salah satu:

- [portchecker.co](https://portchecker.co)
- [canyouseeme.org](https://canyouseeme.org)

Masukkan port `80` atau `443` → klik Check.

---

## Masalah Umum

### Port forwarding sudah diset tapi tidak bisa diakses

**Kemungkinan 1 — ISP memblokir port 80/443**

Beberapa ISP (terutama paket rumahan) memblokir port 80 dan 443.

Solusi: Gunakan port alternatif, misal `8443`:

```
Port forwarding: External 8443 → Internal 443
Nginx listen: 8443
URL: https://api.yourdomain.com:8443
```

Atau hubungi ISP dan minta dibukakan port 80/443 (biasanya untuk paket bisnis).

**Kemungkinan 2 — Double NAT**

Jika ada 2 router (modem ISP + router tambahan), port forwarding harus diset di **kedua** router.

```
Internet → Modem ISP → Router Tambahan → Pi
              ↑               ↑
         Forward di sini  Forward di sini juga
```

**Kemungkinan 3 — Firewall Pi memblokir**

```bash
# Cek UFW
sudo ufw status

# Pastikan port 80 dan 443 diizinkan
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
```

**Kemungkinan 4 — Nginx tidak berjalan**

```bash
sudo systemctl status nginx
sudo systemctl start nginx
```

### Bisa diakses dari luar tapi SSL error

```bash
# Pastikan certbot sudah jalan
sudo certbot --nginx -d api.yourdomain.com

# Cek sertifikat
sudo certbot certificates
```

### IP publik berubah tapi domain belum update

```bash
# Jalankan manual DuckDNS update
~/duckdns/duck.sh
cat ~/duckdns/duck.log
# Harus output: OK
```

---

## Ringkasan Langkah

```
1. Cari IP lokal Pi          → hostname -I
2. Set IP statis Pi di router → DHCP Reservation
3. Buka admin panel router   → 192.168.1.1 atau 192.168.100.1
4. Port forwarding           → 80 & 443 → IP Pi
5. Cari IP publik            → curl ifconfig.me
6. Arahkan domain ke IP      → DNS A record
7. Install SSL               → sudo certbot --nginx -d api.domain.com
8. Test dari luar            → curl https://api.domain.com
```
