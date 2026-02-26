# Lentera Dakwah Indonesia — Wakaf Al-Qur'an

## 🚀 Deployment

### Lokal (Docker Compose)
```bash
docker compose up -d
```
Akses:
- **Website**: http://localhost
- **Admin Panel**: http://localhost/imron.html
- **Password Admin**: `@Imron23`

### Easypanel (VPS)
- **Website**: https://lentera-apps2-web.5wjs9m.easypanel.host/
- **Admin Panel**: https://lentera-apps2-web.5wjs9m.easypanel.host/imron.html
- **Backend API**: https://lentera-apps2-backend.5wjs9m.easypanel.host/
- **Health Check**: https://lentera-apps2-backend.5wjs9m.easypanel.host/api/health

---

## 🗄️ Akses Database via DBeaver

### Koneksi ke Database Lokal (Docker)

| Parameter    | Value        |
|-------------|-------------|
| **Host**     | `localhost`  |
| **Port**     | `5432`       |
| **Database** | `Imron23`    |
| **Username** | `Imron23`    |
| **Password** | `@Imron23`   |

> ⚠️ Port 5432 belum di-expose ke host secara default.
> Tambahkan port mapping di `docker-compose.yml` pada service `postgres`:
> ```yaml
> ports:
>   - "5432:5432"
> ```

### Koneksi ke Database VPS (Easypanel) via SSH Tunnel

Karena database di VPS tidak di-expose langsung ke internet (lebih aman), gunakan **SSH Tunnel** di DBeaver:

#### Langkah-langkah:
1. Buka **DBeaver** → **New Database Connection** → pilih **PostgreSQL**
2. Klik tab **SSH** di panel kiri
3. Centang **"Use SSH Tunnel"**
4. Isi data SSH:

| Parameter SSH    | Value                 |
|------------------|-----------------------|
| **Host**         | `129.226.152.134`     |
| **Port**         | `22`                  |
| **Username**     | `root`                |
| **Auth Method**  | Password / SSH Key    |
| **Password**     | *(password VPS Anda)* |

5. Kembali ke tab **Main**, isi data database:

| Parameter DB     | Value                          |
|------------------|-------------------------------|
| **Host**         | `lentera-apps2_postgres`       |
| **Port**         | `5432`                         |
| **Database**     | `lentera-apps2`                |
| **Username**     | `postgres`                     |
| **Password**     | `694ae2150eebe9587a21`         |

6. Klik **Test Connection** → jika sukses, klik **Finish**

#### Alternatif: Direct Port (jika Anda expose port di Easypanel)
Jika Anda membuka port database di Easypanel (tab Advanced → Ports):

| Parameter    | Value                    |
|-------------|--------------------------|
| **Host**     | `129.226.152.134`        |
| **Port**     | `5430` *(port yg dibuka)*|
| **Database** | `lentera-apps2`          |
| **Username** | `postgres`               |
| **Password** | `694ae2150eebe9587a21`   |

---

## 📊 Arsitektur

```
┌─────────────┐     ┌──────────────┐     ┌────────────┐
│   Nginx     │────▶│  Backend     │────▶│ PostgreSQL │
│  (port 80)  │     │  (port 3000) │     │ (port 5432)│
│  static HTML│     │  Node.js API │     │            │
└─────────────┘     └──────────────┘     └────────────┘
```

## 📁 Struktur Database

| Tabel          | Deskripsi                              |
|----------------|----------------------------------------|
| `users`        | Data pengguna/donatur (PK: no_wa)      |
| `leads`        | Data leads dari form submission         |
| `donations`    | Data donasi/wakaf                      |
| `cs_rotator`   | Konfigurasi CS WhatsApp Rotator        |
| `cs_log`       | Log assignment CS ke leads             |
| `global_settings` | Pengaturan global (pixel, target dll) |

## 🔄 Flow Donasi

```
User submit form → Backend API (/api/donasi)
    ├── 1. Upsert User
    ├── 2. Insert Lead (status: baru)
    ├── 3. Select CS via Rotator (weighted round-robin)
    ├── 4. Log CS Assignment
    ├── 5. Insert Donation
    ├── 6. Update User Segmentation
    └── 7. Redirect ke WhatsApp CS → open new tab
```

## 💰 Revenue vs Potensi Revenue

Di Dashboard Admin terdapat 2 metrik keuangan:

| Metrik              | Status Lead                 | Arti                            |
|---------------------|----------------------------|---------------------------------|
| **Revenue**         | `selesai`, `terkonfirmasi` | Donasi yang sudah terkonfirmasi |
| **Potensi Revenue** | `baru`, `dihubungi`        | Donasi yang belum dikonfirmasi  |

## 🧪 Seed Data (Dummy)

Untuk mengisi data dummy di database lokal:
```bash
cat database/seed.sql | docker exec -i ldi_postgres psql -U Imron23 -d Imron23
```

## 🔧 Environment Variables

| Variable            | Default          | Deskripsi                    |
|--------------------|------------------|------------------------------|
| `DB_HOST`          | `postgres`       | Hostname PostgreSQL          |
| `DB_PORT`          | `5432`           | Port PostgreSQL              |
| `DB_NAME`          | `Imron23`        | Nama database                |
| `DB_USER`          | `Imron23`        | Username database            |
| `DB_PASS`          | `@Imron23`       | Password database            |
| `PORT`             | `3000`           | Port backend Express         |
| `ADMIN_KEY`        | `@Imron23`       | Password admin panel         |
| `WA_ADMIN`         | `6285163698187`  | Fallback WhatsApp admin      |
| `ALLOWED_ORIGINS`  | `*`              | CORS origins (comma separated)|
| `GA_MEASUREMENT_ID`| -                | Google Analytics 4 ID        |
| `META_PIXEL_ID`    | -                | Facebook/Meta Pixel ID       |
| `TIKTOK_PIXEL_ID`  | -                | TikTok Pixel ID              |
