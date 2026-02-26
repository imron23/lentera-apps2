# 🚀 Panduan Deploy ke EasyPanel — Step by Step

## Persiapan yang Diperlukan
- File `ldi-production.zip` (sudah dibuat, ada di folder project)
- Akses ke VPS/server dengan EasyPanel terinstall
- Domain atau subdomain yang sudah diarahkan ke IP server

---

## LANGKAH 1 — Upload File ke Server

Dari terminal Mac Anda, jalankan perintah ini (ganti `USER` dan `IP_SERVER`):

```bash
# Upload ZIP ke server
scp "/Users/user/Documents/LP Donasi Lentera Dakwah Indoensia/ldi-production.zip" USER@IP_SERVER:/home/USER/

# Masuk ke server via SSH
ssh USER@IP_SERVER

# Ekstrak ZIP
cd /home/USER
mkdir -p ldi-wakaf
unzip ldi-production.zip -d ldi-wakaf
cd ldi-wakaf
ls -la   # pastikan semua file ada
```

---

## LANGKAH 2 — Buka EasyPanel

Buka browser → `http://IP_SERVER:3000`

Login dengan akun EasyPanel Anda.

---

## LANGKAH 3 — Buat Project

1. Klik **+ Create Project**
2. Nama project: `ldi-wakaf`
3. Klik **Create**

---

## LANGKAH 4 — Tambah Service PostgreSQL

Di dalam project `ldi-wakaf`:

1. Klik **+ Create Service** → pilih **Postgres**
2. Isi konfigurasi:

| Field | Nilai |
|---|---|
| **Service Name** | `postgres` |
| **Image** | `postgres:16-alpine` (default) |
| **POSTGRES_DB** | `Imron23` |
| **POSTGRES_USER** | `Imron23` |
| **POSTGRES_PASSWORD** | `@Imron23` |

3. Klik **Create**
4. Tunggu sampai status menjadi **Running** ✅

### Inisialisasi Database

Setelah Postgres running, klik tab **Terminal** di service Postgres, lalu jalankan:

```sql
-- Buat tabel donatur
CREATE TABLE IF NOT EXISTS donatur (
  id          SERIAL          PRIMARY KEY,
  nama        VARCHAR(150)    NOT NULL,
  wa          VARCHAR(20)     NOT NULL,
  kecamatan   VARCHAR(150),
  jumlah      INTEGER         NOT NULL CHECK (jumlah > 0),
  qty_mushaf  SMALLINT,
  atas_nama   VARCHAR(150),
  created_at  TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wa      ON donatur (wa);
CREATE INDEX IF NOT EXISTS idx_created ON donatur (created_at DESC);
```

Atau lewat SSH server:
```bash
docker exec -it ldi-wakaf_postgres_1 psql -U Imron23 -d Imron23 < /home/USER/ldi-wakaf/database/init.sql
```

---

## LANGKAH 5 — Tambah Service Backend (Node.js)

Di project `ldi-wakaf`:

1. Klik **+ Create Service** → pilih **App**
2. Konfigurasi:

| Field | Nilai |
|---|---|
| **Service Name** | `backend` |
| **Build Method** | **Dockerfile** |
| **Dockerfile Path** | `backend/Dockerfile` |
| **Build Context** | `backend` |

> Jika diminta GitHub URL, pilih **Upload** atau **Custom Docker Image**.
> Jika EasyPanel support upload folder: upload folder `backend/` saja.

3. **Environment Variables** — isi semua ini (klik + Add Variable untuk tiap baris):

```
DB_HOST=postgres
DB_PORT=5432
DB_NAME=Imron23
DB_USER=Imron23
DB_PASS=@Imron23
PORT=3000
WA_ADMIN=6285163698187
ADMIN_KEY=@Imron23
TARGET_DONASI=50000000
```

4. **Port**: `3000`
5. **Tidak perlu** expose ke public (Nginx yang akan proxy)
6. Klik **Create** → tunggu build selesai ✅

---

## LANGKAH 6 — Tambah Service Nginx (Static + Proxy)

1. Klik **+ Create Service** → pilih **App**
2. Konfigurasi:

| Field | Nilai |
|---|---|
| **Service Name** | `nginx` |
| **Docker Image** | `nginx:1.25-alpine` |
| **Port** | `80` |

3. **Mounts / Volumes** — tambahkan 2 volume:
   - `/home/USER/ldi-wakaf/nginx/nginx.conf` → `/etc/nginx/conf.d/default.conf` (read-only)
   - `/home/USER/ldi-wakaf` → `/usr/share/nginx/html` (read-only)

4. **Domain** — tambahkan domain Anda di tab **Domains**
5. Klik **Create** ✅

---

## LANGKAH 7 — Aktifkan HTTPS (SSL)

Di service Nginx → tab **Domains**:
1. Klik **Add Domain**
2. Masukkan domain: `wakaf.domainanda.com` (atau domain utama)
3. Aktifkan **HTTPS / Let's Encrypt**
4. Klik **Save** → EasyPanel otomatis generate SSL certificate

---

## LANGKAH 8 — Verifikasi

Buka di browser:
- `https://domainanda.com` → Landing page ✅
- `https://domainanda.com/imron.html` → Dashboard admin ✅
- `https://domainanda.com/api/health` → `{"status":"ok"}` ✅

---

## Cara Alternatif: Docker Compose Langsung di SSH

Jika EasyPanel support Docker Compose:

```bash
# Di server, masuk ke folder project
cd /home/USER/ldi-wakaf

# Buat .env dari example
cp backend/.env.example backend/.env
# Edit jika perlu ganti nilai
nano backend/.env

# Jalankan dengan docker compose
docker compose up -d --build

# Cek status
docker compose ps
```

Lalu di EasyPanel, tambahkan domain dan proxy ke port 80.

---

## Troubleshooting

### Backend tidak konek ke Postgres
```bash
# Cek nama container/service Postgres di EasyPanel
docker ps | grep postgres
# Sesuaikan DB_HOST dengan nama container tersebut
```

### Logo tidak muncul
Pastikan file `Logo Lentera New 5.png` ada di root folder `/home/USER/ldi-wakaf/`

### 502 Bad Gateway
Nginx tidak bisa reach backend. Cek:
```bash
docker logs ldi_backend
# Pastikan backend running dan DB_HOST benar
```

### HTTPS tidak aktif
```bash
# Pastikan port 80 dan 443 sudah dibuka di firewall
ufw allow 80
ufw allow 443
ufw allow 3000
```
