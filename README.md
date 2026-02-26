# Wakaf Al-Qur'an — Lentera Dakwah Indonesia

Landing page donasi wakaf Al-Qur'an Ramadhan dengan backend Node.js, MySQL, dan deployment Docker.

## Struktur Folder

```
LP Donasi Lentera Dakwah Indoensia/
├── index.html          # Halaman utama
├── imron.html          # Panel admin (Imron) — login dengan ADMIN_KEY
├── admin.html          # Panel admin alternatif
├── style.css           # Semua styling
├── script.js           # Logika form, gallery, submit API
├── docker-compose.yml  # Orkestasi 3 container
├── aset foto/          # Gambar & logo
├── backend/
│   ├── server.js       # Express app
│   ├── db.js           # MySQL pool
│   ├── routes/
│   │   └── donasi.js   # POST /api/donasi
│   ├── package.json
│   ├── Dockerfile
│   └── .env.example    # Template env vars — COPY ke .env sebelum deploy!
├── database/
│   └── init.sql        # Skema MySQL (auto-run saat container pertama jalan)
└── nginx/
    └── nginx.conf      # Static + API proxy
```

---

## Kredensial Default

> ⚠️ **Wajib ganti password sebelum deploy ke production!**

| Komponen | Nilai default |
|---|---|
| Database name | `Imron23` |
| MySQL username | `Imron23` |
| MySQL password | `@Imron23` |
| MySQL root password | `rootImron23` |
| Admin panel password | `@Imron23` |
| Admin panel URL | `/imron.html` |

---

## Cara Deploy — Docker (Paling Mudah)

### Langkah 1 — Buat file .env

```bash
# Di folder backend/
cp backend/.env.example backend/.env
```

File `.env` sudah berisi nilai yang benar, tidak perlu diedit kecuali untuk ganti password.

### Langkah 2 — Jalankan

```bash
docker-compose up -d --build
```

### Langkah 3 — Cek apakah jalan

```bash
docker-compose ps
```

Semua harus berstatus `Up`. Lalu buka `http://localhost` di browser.

### Langkah 4 — Lihat data donatur

Buka `http://localhost/imron.html` → masukkan password `@Imron23`

---

## Cara Deploy — EasyPanel

### Persyaratan
- Server VPS (Ubuntu 20.04 / 22.04)
- EasyPanel terinstall (`curl -sSL https://easypanel.io/install.sh | sh`)
- Domain sudah diarahkan ke IP server

### Langkah-langkah

**1. Upload file ke server**
```bash
zip -r ldi-wakaf.zip . -x "*.DS_Store" "node_modules/*" ".git/*"
scp ldi-wakaf.zip user@IP_SERVER:/home/user/
ssh user@IP_SERVER "cd /home/user && unzip ldi-wakaf.zip -d ldi-wakaf"
```

**2. Buat project di EasyPanel**
- Buka `http://IP_SERVER:3000` → login EasyPanel
- Klik **Create Project** → nama: `ldi-wakaf`

**3. Tambahkan service MySQL**
- **Add Service** → **MySQL**
- Isi seperti ini:

| Field | Nilai |
|---|---|
| Database | `Imron23` |
| Username | `Imron23` |
| Password | `@Imron23` |

**4. Tambahkan service Backend (Node.js)**
- **Add Service** → **App** → build dari folder `backend/`
- Environment variables (copy-paste semua ini):

```
DB_HOST=mysql
DB_PORT=3306
DB_NAME=Imron23
DB_USER=Imron23
DB_PASS=@Imron23
PORT=3000
WA_ADMIN=6285163698187
ADMIN_KEY=@Imron23
TARGET_DONASI=50000000
```

> Untuk Google Analytics: tambahkan `GA_MEASUREMENT_ID=G-XXXXXXXXXX`
> Untuk Meta Pixel: tambahkan `META_PIXEL_ID=XXXXXXXXXXXXXXXXX`

**5. Tambahkan service Nginx**
- **Add Service** → pakai image `nginx:1.25-alpine`
- Mount `nginx/nginx.conf` ke `/etc/nginx/conf.d/default.conf`
- Mount folder root ke `/usr/share/nginx/html`
- Port: `80`

**6. Inisialisasi Database**
```bash
# Di terminal EasyPanel atau SSH server:
docker exec -it ldi_mysql mysql -u Imron23 -p"@Imron23" Imron23 < /home/user/ldi-wakaf/database/init.sql
```

---

## Development (Lokal tanpa Docker)

```bash
# 1. Jalankan MySQL lokal, import skema
mysql -u root -p < database/init.sql

# 2. Setup backend
cd backend
cp .env.example .env
# .env sudah terisi — edit DB_HOST=127.0.0.1 untuk lokal
nano .env

npm install
npm run dev   # atau: node server.js

# 3. Buka index.html langsung di browser (file://)
# script.js otomatis detect file:// → pakai localhost:3000
```

Isi `backend/.env` untuk development lokal:
```
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=Imron23
DB_USER=Imron23
DB_PASS=@Imron23
PORT=3000
WA_ADMIN=6285163698187
ADMIN_KEY=@Imron23
TARGET_DONASI=50000000
```

---

## Akses Database via DBeaver

DBeaver adalah aplikasi GUI untuk melihat dan mengelola data donatur secara visual.

### Konfigurasi Koneksi

1. Buka **DBeaver** → **New Database Connection** → pilih **MySQL** → **Next**
2. Isi detail koneksi:

| Field | Nilai |
|---|---|
| **Server Host** | IP server Anda (atau `localhost` / `127.0.0.1` jika lokal) |
| **Port** | `3306` |
| **Database** | `Imron23` |
| **Username** | `Imron23` |
| **Password** | `@Imron23` |

3. Klik **Test Connection** → jika OK → **Finish**

### Jika MySQL di Docker (port tidak terbuka ke luar)

Tambahkan port mapping di `docker-compose.yml`:
```yaml
mysql:
  ports:
    - "3306:3306"   # Tambahkan baris ini
```
Lalu `docker-compose up -d`. Setelah selesai pakai DBeaver, bisa hapus lagi untuk keamanan.

### Query Berguna

```sql
-- Lihat semua donatur terbaru
SELECT id, nama, wa, kecamatan, jumlah, qty_mushaf, atas_nama, created_at
FROM donatur
ORDER BY created_at DESC;

-- Total terkumpul
SELECT
  COUNT(*)            AS total_donatur,
  SUM(jumlah)         AS total_rupiah,
  SUM(qty_mushaf)     AS total_mushaf,
  AVG(jumlah)         AS rata_rata
FROM donatur;

-- Donasi hari ini
SELECT * FROM donatur
WHERE DATE(created_at) = CURDATE();

-- Export CSV (jalankan di terminal server)
SELECT * FROM donatur INTO OUTFILE '/tmp/donatur_export.csv'
FIELDS TERMINATED BY ',' ENCLOSED BY '"' LINES TERMINATED BY '\n';
```

---

## API Endpoint

### `POST /api/donasi`
```json
// Request
{
  "nama": "Abdullah Rahman",
  "wa": "081234567890",
  "kecamatan": "Ciawi",
  "jumlah": 400000,
  "qty_mushaf": 5,
  "atas_nama": null
}

// Response OK
{ "success": true, "id": 1 }

// Response Error
{ "success": false, "message": "Nama tidak valid" }
```

### `GET /api/stats`
```json
{ "success": true, "total_donatur": 42, "total_terkumpul": 3360000, "total_mushaf": 42, "target": 50000000, "persen": 7 }
```

### `GET /api/admin/donatur`
Header: `X-Admin-Key: @Imron23`
```json
{ "success": true, "rows": [...], "stats": { "total_donatur": 42, ... } }
```

### `GET /tracking.js`
Otomatis load GA4 + Meta Pixel dari env. Tidak perlu request manual.

### `GET /api/health`
```json
{ "status": "ok", "ts": "2025-03-01T..." }
```

---

## Environment Variables Lengkap

| Variable | Nilai default | Keterangan |
|---|---|---|
| `DB_HOST` | `mysql` | Hostname MySQL (nama service Docker) |
| `DB_PORT` | `3306` | Port MySQL |
| `DB_NAME` | `Imron23` | Nama database |
| `DB_USER` | `Imron23` | Username MySQL |
| `DB_PASS` | `@Imron23` | Password MySQL |
| `PORT` | `3000` | Port backend Node.js |
| `WA_ADMIN` | `6285163698187` | Nomor WhatsApp admin |
| `ADMIN_KEY` | `@Imron23` | Password panel admin Imron |
| `TARGET_DONASI` | `50000000` | Target donasi (Rp 50 juta) |
| `GA_MEASUREMENT_ID` | *(kosong)* | Google Analytics 4 ID (G-XXXXXXX) |
| `META_PIXEL_ID` | *(kosong)* | Meta Pixel ID (15 digit) |

---

## Docker Commands

```bash
docker-compose up -d --build    # Jalankan pertama kali
docker-compose ps               # Cek status container
docker-compose logs -f backend  # Log backend realtime
docker-compose logs -f mysql    # Log MySQL
docker-compose restart backend  # Restart backend saja
docker-compose down             # Stop semua container
docker-compose down -v          # Stop + HAPUS semua data (HATI-HATI!)
```

---

## Troubleshooting

### Logo tidak muncul saat deploy
Pastikan file `Logo Lentera New 5.png` ada di root folder (bukan di `aset foto/`).

### Video YouTube tidak autoplay
Browser modern memblokir autoplay kecuali video di-mute. Video sudah di-set `mute=1`, tapi beberapa browser mobile tetap memblokir. Ini perilaku normal browser, bukan bug.

### Backend tidak bisa connect ke MySQL
Pastikan:
1. Service MySQL sudah `Up` (cek `docker-compose ps`)
2. `DB_HOST=mysql` (bukan `localhost`) untuk koneksi antar container
3. Kredensial di `docker-compose.yml` dan `.env` sama persis

### Admin panel tidak bisa login
- Cek `ADMIN_KEY` di environment backend sudah diset
- Default: `@Imron23`
- Akses: `http://domain-anda/imron.html`
