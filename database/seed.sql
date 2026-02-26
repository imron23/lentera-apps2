-- ============================================================
-- Seed Dummy Data — Total Nominal: Rp 15.000.000
-- Mix of confirmed (revenue) and unconfirmed (potensi revenue)
-- ============================================================

-- Clear previous dummy data (keep real data safe via conflict handling)
DELETE FROM cs_log WHERE cs_name LIKE 'CS %' AND lead_id IN (SELECT id FROM leads WHERE no_wa LIKE '628000%');
DELETE FROM donations WHERE no_wa LIKE '628000%';
DELETE FROM leads WHERE no_wa LIKE '628000%';
DELETE FROM users WHERE no_wa LIKE '628000%';

-- ── 100 Dummy Users ─────────────────────────────────────────────
INSERT INTO users (no_wa, id_unik, nama, kota, kecamatan, segmentation, created_at)
SELECT
   '628000' || LPAD(i::text, 6, '0'),
   'UID-' || LPAD(i::text, 4, '0'),
   CASE
     WHEN i % 20 = 0  THEN 'Ahmad Fauzi ' || i
     WHEN i % 20 = 1  THEN 'Siti Aminah ' || i
     WHEN i % 20 = 2  THEN 'Muhammad Rizky ' || i
     WHEN i % 20 = 3  THEN 'Fatimah Zahra ' || i
     WHEN i % 20 = 4  THEN 'Abdullah Hasan ' || i
     WHEN i % 20 = 5  THEN 'Aisyah Putri ' || i
     WHEN i % 20 = 6  THEN 'Umar Faruq ' || i
     WHEN i % 20 = 7  THEN 'Khadijah Nur ' || i
     WHEN i % 20 = 8  THEN 'Ali Imron ' || i
     WHEN i % 20 = 9  THEN 'Hafidz Rahman ' || i
     WHEN i % 20 = 10 THEN 'Nurul Hidayah ' || i
     WHEN i % 20 = 11 THEN 'Bilal Saputra ' || i
     WHEN i % 20 = 12 THEN 'Maryam Dewi ' || i
     WHEN i % 20 = 13 THEN 'Yusuf Hakim ' || i
     WHEN i % 20 = 14 THEN 'Zainab Fitri ' || i
     WHEN i % 20 = 15 THEN 'Ibrahim Malik ' || i
     WHEN i % 20 = 16 THEN 'Halimah Sari ' || i
     WHEN i % 20 = 17 THEN 'Hamzah Pratama ' || i
     WHEN i % 20 = 18 THEN 'Ruqayyah Indah ' || i
     ELSE 'Salman Alfarisi ' || i
   END,
   CASE
     WHEN i % 10 = 0 THEN 'Jakarta Selatan'
     WHEN i % 10 = 1 THEN 'Bandung'
     WHEN i % 10 = 2 THEN 'Surabaya'
     WHEN i % 10 = 3 THEN 'Yogyakarta'
     WHEN i % 10 = 4 THEN 'Semarang'
     WHEN i % 10 = 5 THEN 'Medan'
     WHEN i % 10 = 6 THEN 'Makassar'
     WHEN i % 10 = 7 THEN 'Palembang'
     WHEN i % 10 = 8 THEN 'Depok'
     ELSE 'Bekasi'
   END,
   CASE
     WHEN i % 8 = 0 THEN 'Cilandak'
     WHEN i % 8 = 1 THEN 'Kebayoran'
     WHEN i % 8 = 2 THEN 'Coblong'
     WHEN i % 8 = 3 THEN 'Tegalsari'
     WHEN i % 8 = 4 THEN 'Gondokusuman'
     WHEN i % 8 = 5 THEN 'Gajahmungkur'
     WHEN i % 8 = 6 THEN 'Medan Baru'
     ELSE 'Panakkukang'
   END,
   CASE WHEN i <= 30 THEN 'active' WHEN i <= 60 THEN 'warm' ELSE 'new' END,
   NOW() - ((100 - i) * interval '1 day') + (random() * interval '12 hours')
FROM generate_series(1, 100) AS i
ON CONFLICT (no_wa) DO NOTHING;

-- ── 100 Leads with mixed statuses ───────────────────────────────
-- 30% selesai, 20% terkonfirmasi = Revenue
-- 30% baru, 20% dihubungi = Potensi Revenue
INSERT INTO leads (no_wa, source_page, cs_assignee, status, catatan, created_at)
SELECT
   '628000' || LPAD(i::text, 6, '0'),
   CASE WHEN i % 3 = 0 THEN '/index.html' WHEN i % 3 = 1 THEN '/itikaf.html' ELSE '/lp2kimi' END,
   CASE WHEN i % 2 = 0 THEN 'CS Imron' ELSE 'CS Fauzi' END,
   CASE
     WHEN i <= 30 THEN 'selesai'
     WHEN i <= 50 THEN 'terkonfirmasi'
     WHEN i <= 80 THEN 'baru'
     ELSE 'dihubungi'
   END,
   CASE
     WHEN i <= 30 THEN 'Sudah transfer & konfirmasi. Alhamdulillah.'
     WHEN i <= 50 THEN 'Sudah konfirmasi, menunggu transfer.'
     WHEN i <= 80 THEN NULL
     ELSE 'Sudah dihubungi via WA, menunggu respon.'
   END,
   NOW() - ((100 - i) * interval '1 day') + (random() * interval '12 hours')
FROM generate_series(1, 100) AS i;

-- ── Donations — Total = Rp 15.000.000 ──────────────────────────
-- 30 orang (selesai)    × Rp 300.000 avg = Rp 9.000.000  (Revenue)
-- 20 orang (terkonfirmasi) × Rp 0 (belum bayar) = Rp 0
-- 30 orang (baru) dengan donasi form submit = Rp 4.500.000 (Potensi)
-- 20 orang (dihubungi) dengan donasi form = Rp 1.500.000 (Potensi)
-- Total = 9.000.000 + 4.500.000 + 1.500.000 = 15.000.000

-- Grup 1: 30 orang "selesai" — Rp 9.000.000
INSERT INTO donations (no_wa, jumlah, qty_mushaf, atas_nama, doa_catatan, created_at)
SELECT
   '628000' || LPAD(i::text, 6, '0'),
   CASE
     WHEN i <= 10 THEN 500000   -- 10 × 500k = 5.000.000
     WHEN i <= 20 THEN 250000   -- 10 × 250k = 2.500.000
     ELSE 150000                -- 10 × 150k = 1.500.000
   END,
   CASE WHEN i <= 10 THEN 10 WHEN i <= 20 THEN 5 ELSE 3 END,
   CASE WHEN i % 3 = 0 THEN 'Alm. Bapak' WHEN i % 3 = 1 THEN 'Ibu Tercinta' ELSE NULL END,
   'Semoga menjadi amal jariyah, aamiin.',
   NOW() - ((100 - i) * interval '1 day') + (random() * interval '6 hours')
FROM generate_series(1, 30) AS i;

-- Grup 2: 30 orang "baru" — Rp 4.500.000
INSERT INTO donations (no_wa, jumlah, qty_mushaf, atas_nama, doa_catatan, created_at)
SELECT
   '628000' || LPAD(i::text, 6, '0'),
   CASE
     WHEN i <= 60 THEN 200000   -- 10 × 200k = 2.000.000
     WHEN i <= 70 THEN 150000   -- 10 × 150k = 1.500.000
     ELSE 100000                -- 10 × 100k = 1.000.000
   END,
   CASE WHEN i <= 60 THEN 4 WHEN i <= 70 THEN 3 ELSE 2 END,
   NULL,
   'Mohon doakan keluarga kami.',
   NOW() - ((100 - i) * interval '1 day') + (random() * interval '6 hours')
FROM generate_series(51, 80) AS i;

-- Grup 3: 20 orang "dihubungi" — Rp 1.500.000
INSERT INTO donations (no_wa, jumlah, qty_mushaf, atas_nama, doa_catatan, created_at)
SELECT
   '628000' || LPAD(i::text, 6, '0'),
   CASE
     WHEN i <= 90 THEN 100000   -- 10 × 100k = 1.000.000
     ELSE 50000                 -- 10 ×  50k =   500.000
   END,
   CASE WHEN i <= 90 THEN 2 ELSE 1 END,
   NULL,
   NULL,
   NOW() - ((100 - i) * interval '1 day') + (random() * interval '6 hours')
FROM generate_series(81, 100) AS i;

-- ── CS Log ──────────────────────────────────────────────────────
INSERT INTO cs_log (cs_name, lead_id, no_wa, assigned_at)
SELECT
   CASE WHEN l.id % 2 = 0 THEN 'CS Imron' ELSE 'CS Fauzi' END,
   l.id,
   l.no_wa,
   l.created_at
FROM leads l WHERE l.no_wa LIKE '628000%';
