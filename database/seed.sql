-- ============================================================
-- Seed Dummy Data — Total Nominal: Rp 15.000.000
-- Nama Indonesia natural, status bervariasi merata
-- ============================================================

-- Bersihkan dummy sebelumnya
DELETE FROM cs_log WHERE lead_id IN (SELECT id FROM leads WHERE no_wa LIKE '628000%');
DELETE FROM donations WHERE no_wa LIKE '628000%';
DELETE FROM leads WHERE no_wa LIKE '628000%';
DELETE FROM users WHERE no_wa LIKE '628000%';

-- ── 100 Users dengan nama natural Indonesia ─────────────────────
INSERT INTO users (no_wa, id_unik, nama, kota, kecamatan, segmentation, created_at) VALUES
('6280000001', 'UID-0001', 'Andi Prasetyo',      'Jakarta Selatan', 'Pancoran',        'active', NOW() - interval '89 days'),
('6280000002', 'UID-0002', 'Siti Nurhaliza',      'Bandung',         'Coblong',         'active', NOW() - interval '87 days'),
('6280000003', 'UID-0003', 'Budi Santoso',        'Surabaya',        'Tegalsari',       'active', NOW() - interval '85 days'),
('6280000004', 'UID-0004', 'Dewi Lestari',        'Yogyakarta',      'Gondokusuman',    'active', NOW() - interval '83 days'),
('6280000005', 'UID-0005', 'Rizky Hidayat',       'Semarang',        'Gajahmungkur',    'active', NOW() - interval '80 days'),
('6280000006', 'UID-0006', 'Nur Aini Putri',      'Medan',           'Medan Baru',      'active', NOW() - interval '78 days'),
('6280000007', 'UID-0007', 'Hendra Wijaya',       'Makassar',        'Panakkukang',     'active', NOW() - interval '76 days'),
('6280000008', 'UID-0008', 'Ratna Sari',          'Palembang',       'Ilir Timur II',   'active', NOW() - interval '74 days'),
('6280000009', 'UID-0009', 'Agus Setiawan',       'Depok',           'Cimanggis',       'active', NOW() - interval '72 days'),
('6280000010', 'UID-0010', 'Fitri Handayani',     'Bekasi',          'Bekasi Selatan',  'active', NOW() - interval '70 days'),
('6280000011', 'UID-0011', 'Wahyu Nugroho',       'Jakarta Timur',   'Duren Sawit',     'active', NOW() - interval '68 days'),
('6280000012', 'UID-0012', 'Lina Marlina',        'Tangerang',       'Ciledug',         'active', NOW() - interval '66 days'),
('6280000013', 'UID-0013', 'Dimas Ardiansyah',    'Bogor',           'Bogor Tengah',    'active', NOW() - interval '64 days'),
('6280000014', 'UID-0014', 'Yuni Rahayu',         'Malang',          'Klojen',          'active', NOW() - interval '62 days'),
('6280000015', 'UID-0015', 'Fajar Ramadhan',      'Cirebon',         'Kesambi',         'active', NOW() - interval '60 days'),
('6280000016', 'UID-0016', 'Rina Wulandari',      'Solo',            'Laweyan',         'warm',   NOW() - interval '58 days'),
('6280000017', 'UID-0017', 'Taufik Ismail',       'Sidoarjo',        'Waru',            'warm',   NOW() - interval '56 days'),
('6280000018', 'UID-0018', 'Sri Mulyani',         'Gresik',          'Kebomas',         'warm',   NOW() - interval '54 days'),
('6280000019', 'UID-0019', 'Irfan Hakim',         'Tasikmalaya',     'Cihideung',       'warm',   NOW() - interval '52 days'),
('6280000020', 'UID-0020', 'Mega Puspita',        'Garut',           'Garut Kota',      'warm',   NOW() - interval '50 days'),
('6280000021', 'UID-0021', 'Rudi Hartono',        'Cianjur',         'Cianjur',         'warm',   NOW() - interval '48 days'),
('6280000022', 'UID-0022', 'Ani Sulistyowati',    'Purwakarta',      'Purwakarta',      'warm',   NOW() - interval '46 days'),
('6280000023', 'UID-0023', 'Bambang Supriadi',    'Karawang',        'Karawang Barat',  'warm',   NOW() - interval '44 days'),
('6280000024', 'UID-0024', 'Novi Andriani',       'Subang',          'Subang',          'warm',   NOW() - interval '42 days'),
('6280000025', 'UID-0025', 'Eko Prasetyo',        'Sumedang',        'Sumedang Utara',  'warm',   NOW() - interval '40 days'),
('6280000026', 'UID-0026', 'Wati Suryani',        'Indramayu',       'Sindang',         'new',    NOW() - interval '38 days'),
('6280000027', 'UID-0027', 'Joko Susilo',         'Majalengka',      'Majalengka',      'new',    NOW() - interval '36 days'),
('6280000028', 'UID-0028', 'Endah Permatasari',   'Kuningan',        'Kuningan',        'new',    NOW() - interval '34 days'),
('6280000029', 'UID-0029', 'Arief Budiman',       'Brebes',          'Brebes',          'new',    NOW() - interval '32 days'),
('6280000030', 'UID-0030', 'Nita Anggraini',      'Tegal',           'Tegal Barat',     'new',    NOW() - interval '30 days'),
('6280000031', 'UID-0031', 'Surya Dharma',        'Pekalongan',      'Pekalongan Barat','new',    NOW() - interval '29 days'),
('6280000032', 'UID-0032', 'Kartini Dewi',        'Pemalang',        'Pemalang',        'new',    NOW() - interval '28 days'),
('6280000033', 'UID-0033', 'Yanto Setiabudi',     'Purbalingga',     'Purbalingga',     'new',    NOW() - interval '27 days'),
('6280000034', 'UID-0034', 'Dian Permata',        'Banjarnegara',    'Banjarnegara',    'new',    NOW() - interval '26 days'),
('6280000035', 'UID-0035', 'Mulyadi Susanto',     'Wonosobo',        'Wonosobo',        'new',    NOW() - interval '25 days'),
('6280000036', 'UID-0036', 'Indah Cahyani',       'Temanggung',      'Temanggung',      'new',    NOW() - interval '24 days'),
('6280000037', 'UID-0037', 'Faisal Rahman',       'Kendal',          'Kendal',          'new',    NOW() - interval '23 days'),
('6280000038', 'UID-0038', 'Hesti Purnamasari',   'Demak',           'Demak',           'new',    NOW() - interval '22 days'),
('6280000039', 'UID-0039', 'Gunawan Santoso',     'Kudus',           'Kudus',           'new',    NOW() - interval '21 days'),
('6280000040', 'UID-0040', 'Lia Amelia',          'Jepara',          'Jepara',          'new',    NOW() - interval '20 days'),
('6280000041', 'UID-0041', 'Dwi Cahyono',         'Pati',            'Pati',            'new',    NOW() - interval '19 days'),
('6280000042', 'UID-0042', 'Nurul Fikri',         'Blora',           'Blora',           'new',    NOW() - interval '18 days'),
('6280000043', 'UID-0043', 'Sulaiman Rasyid',     'Rembang',         'Rembang',         'new',    NOW() - interval '17 days'),
('6280000044', 'UID-0044', 'Pipit Safitri',       'Tuban',           'Tuban',           'new',    NOW() - interval '16 days'),
('6280000045', 'UID-0045', 'Herman Hermawan',     'Lamongan',        'Lamongan',        'new',    NOW() - interval '15 days'),
('6280000046', 'UID-0046', 'Sari Ratnawati',      'Bojonegoro',      'Bojonegoro',      'new',    NOW() - interval '14 days'),
('6280000047', 'UID-0047', 'Lukman Hakim',        'Ngawi',           'Ngawi',           'new',    NOW() - interval '13 days'),
('6280000048', 'UID-0048', 'Ayu Widiastuti',      'Madiun',          'Madiun',          'new',    NOW() - interval '12 days'),
('6280000049', 'UID-0049', 'Dedi Kurniawan',      'Ponorogo',        'Ponorogo',        'new',    NOW() - interval '11 days'),
('6280000050', 'UID-0050', 'Puji Astuti',         'Magetan',         'Magetan',         'new',    NOW() - interval '10 days'),
('6280000051', 'UID-0051', 'Syamsul Bahri',       'Nganjuk',         'Nganjuk',         'new',    NOW() - interval '9 days'),
('6280000052', 'UID-0052', 'Rini Susanti',        'Kediri',          'Pesantren',       'new',    NOW() - interval '9 days'),
('6280000053', 'UID-0053', 'Hanafi Maulana',      'Tulungagung',     'Tulungagung',     'new',    NOW() - interval '8 days'),
('6280000054', 'UID-0054', 'Nina Hasanah',        'Trenggalek',      'Trenggalek',      'new',    NOW() - interval '8 days'),
('6280000055', 'UID-0055', 'Sapri Hidayatullah',  'Blitar',          'Sananwetan',      'new',    NOW() - interval '7 days'),
('6280000056', 'UID-0056', 'Mila Karmila',        'Lumajang',        'Lumajang',        'new',    NOW() - interval '7 days'),
('6280000057', 'UID-0057', 'Rachmat Hidayat',     'Probolinggo',     'Mayangan',        'new',    NOW() - interval '6 days'),
('6280000058', 'UID-0058', 'Wiwin Setianingsih',  'Pasuruan',        'Panggungrejo',    'new',    NOW() - interval '6 days'),
('6280000059', 'UID-0059', 'Ilham Maulidi',       'Mojokerto',       'Prajurit Kulon',  'new',    NOW() - interval '5 days'),
('6280000060', 'UID-0060', 'Yulia Pramesti',      'Jombang',         'Jombang',         'new',    NOW() - interval '5 days'),
('6280000061', 'UID-0061', 'Saiful Anwar',        'Sampang',         'Sampang',         'new',    NOW() - interval '4 days'),
('6280000062', 'UID-0062', 'Tia Anggraeni',       'Pamekasan',       'Pamekasan',       'new',    NOW() - interval '4 days'),
('6280000063', 'UID-0063', 'Bayu Segara',         'Sumenep',         'Sumenep',         'new',    NOW() - interval '3 days'),
('6280000064', 'UID-0064', 'Anisa Putri Handini', 'Bangkalan',       'Bangkalan',       'new',    NOW() - interval '3 days'),
('6280000065', 'UID-0065', 'Ridwan Kamil',        'Ciamis',          'Ciamis',          'new',    NOW() - interval '3 days'),
('6280000066', 'UID-0066', 'Vera Oktaviani',      'Banjar',          'Banjar',          'new',    NOW() - interval '2 days'),
('6280000067', 'UID-0067', 'Tommy Adriansyah',    'Sukabumi',        'Cikole',          'new',    NOW() - interval '2 days'),
('6280000068', 'UID-0068', 'Maryam Zainal',       'Cilegon',         'Cibeber',         'new',    NOW() - interval '2 days'),
('6280000069', 'UID-0069', 'Hendri Saputra',      'Serang',          'Serang',          'new',    NOW() - interval '1 day'),
('6280000070', 'UID-0070', 'Lastri Widyawati',    'Pandeglang',      'Pandeglang',      'new',    NOW() - interval '1 day'),
('6280000071', 'UID-0071', 'Udin Saripudin',      'Lebak',           'Rangkasbitung',   'new',    NOW() - interval '1 day'),
('6280000072', 'UID-0072', 'Rosa Damayanti',      'Tangerang Selatan','Ciputat',        'new',    NOW() - interval '1 day'),
('6280000073', 'UID-0073', 'Ahmad Zaini',         'Jakarta Barat',   'Kembangan',       'new',    NOW() - interval '12 hours'),
('6280000074', 'UID-0074', 'Lilis Suryani',       'Jakarta Utara',   'Koja',            'new',    NOW() - interval '12 hours'),
('6280000075', 'UID-0075', 'Purnomo Sidik',       'Jakarta Pusat',   'Menteng',         'new',    NOW() - interval '10 hours'),
('6280000076', 'UID-0076', 'Suci Ramadhani',      'Cimahi',          'Cimahi Selatan',  'new',    NOW() - interval '10 hours'),
('6280000077', 'UID-0077', 'Denny Firmansyah',    'Tasikmalaya',     'Tawang',          'new',    NOW() - interval '8 hours'),
('6280000078', 'UID-0078', 'Aisyah Zahra',        'Garut',           'Tarogong Kidul',  'new',    NOW() - interval '8 hours'),
('6280000079', 'UID-0079', 'Kasim Mubarok',       'Sumedang',        'Sumedang Selatan','new',    NOW() - interval '6 hours'),
('6280000080', 'UID-0080', 'Winda Permatasari',   'Majalengka',      'Kadipaten',       'new',    NOW() - interval '6 hours'),
('6280000081', 'UID-0081', 'Rahmat Fauzi',        'Bandung',         'Buahbatu',        'new',    NOW() - interval '5 hours'),
('6280000082', 'UID-0082', 'Tutik Hernawati',     'Surabaya',        'Wonokromo',       'new',    NOW() - interval '5 hours'),
('6280000083', 'UID-0083', 'Zulkifli Hasan',      'Semarang',        'Tembalang',       'new',    NOW() - interval '4 hours'),
('6280000084', 'UID-0084', 'Amira Chairunnisa',   'Yogyakarta',      'Umbulharjo',      'new',    NOW() - interval '4 hours'),
('6280000085', 'UID-0085', 'Soleh Abdurrahman',   'Solo',            'Jebres',          'new',    NOW() - interval '3 hours'),
('6280000086', 'UID-0086', 'Intan Nuraeni',       'Malang',          'Lowokwaru',       'new',    NOW() - interval '3 hours'),
('6280000087', 'UID-0087', 'Wahid Abdillah',      'Kediri',          'Mojoroto',        'new',    NOW() - interval '2 hours'),
('6280000088', 'UID-0088', 'Fatimah Azzahra',     'Probolinggo',     'Kanigaran',       'new',    NOW() - interval '2 hours'),
('6280000089', 'UID-0089', 'Cecep Supriadi',      'Depok',           'Sukmajaya',       'new',    NOW() - interval '1 hour'),
('6280000090', 'UID-0090', 'Kiki Amalia',         'Bekasi',          'Rawalumbu',       'new',    NOW() - interval '1 hour'),
('6280000091', 'UID-0091', 'Aris Munandar',       'Tangerang',       'Karawaci',        'new',    NOW() - interval '50 minutes'),
('6280000092', 'UID-0092', 'Dahlia Kusuma',       'Bogor',           'Bogor Barat',     'new',    NOW() - interval '45 minutes'),
('6280000093', 'UID-0093', 'Mukhtar Efendi',      'Jakarta Selatan', 'Tebet',           'new',    NOW() - interval '40 minutes'),
('6280000094', 'UID-0094', 'Raisa Adriana',       'Jakarta Timur',   'Jatinegara',      'new',    NOW() - interval '35 minutes'),
('6280000095', 'UID-0095', 'Subhan Nurjaman',     'Bandung',         'Lengkong',        'new',    NOW() - interval '30 minutes'),
('6280000096', 'UID-0096', 'Utami Puspitasari',   'Surabaya',        'Gubeng',          'new',    NOW() - interval '25 minutes'),
('6280000097', 'UID-0097', 'Jamaludin Malik',     'Semarang',        'Banyumanik',      'new',    NOW() - interval '20 minutes'),
('6280000098', 'UID-0098', 'Citra Dewi Anggraini','Malang',          'Sukun',           'new',    NOW() - interval '15 minutes'),
('6280000099', 'UID-0099', 'Mansur Hidayatullah', 'Depok',           'Beji',            'new',    NOW() - interval '10 minutes'),
('6280000100', 'UID-0100', 'Sinta Maharani',      'Bekasi',          'Pondok Gede',     'new',    NOW() - interval '5 minutes')
ON CONFLICT (no_wa) DO NOTHING;

-- ── 100 Leads — Status terdistribusi merata ─────────────────────
-- 25 selesai, 25 terkonfirmasi, 25 dihubungi, 25 baru
INSERT INTO leads (no_wa, source_page, cs_assignee, status, catatan, created_at)
SELECT no_wa, source, cs, st,
  CASE st
    WHEN 'selesai'        THEN 'Sudah transfer & konfirmasi. Alhamdulillah.'
    WHEN 'terkonfirmasi'  THEN 'Konfirmasi via WA, menunggu transfer.'
    WHEN 'dihubungi'      THEN 'Sudah chat WA, belum ada respon balik.'
    ELSE NULL
  END,
  created_at
FROM (
  SELECT
    u.no_wa,
    CASE WHEN ROW_NUMBER() OVER (ORDER BY u.created_at) % 3 = 0 THEN '/index.html'
         WHEN ROW_NUMBER() OVER (ORDER BY u.created_at) % 3 = 1 THEN '/itikaf.html'
         ELSE '/lp2kimi' END AS source,
    CASE WHEN ROW_NUMBER() OVER (ORDER BY u.created_at) % 2 = 0 THEN 'CS Imron'
         ELSE 'CS Fauzi' END AS cs,
    CASE
      WHEN ROW_NUMBER() OVER (ORDER BY u.created_at) <= 25 THEN 'selesai'
      WHEN ROW_NUMBER() OVER (ORDER BY u.created_at) <= 50 THEN 'terkonfirmasi'
      WHEN ROW_NUMBER() OVER (ORDER BY u.created_at) <= 75 THEN 'dihubungi'
      ELSE 'baru'
    END AS st,
    u.created_at
  FROM users u WHERE u.no_wa LIKE '628000%'
  ORDER BY u.created_at
) sub;

-- ── Donations — Total = Rp 15.000.000 ──────────────────────────
-- Selesai (25):        total Rp 6.250.000  → Revenue
-- Terkonfirmasi (25):  total Rp 3.750.000  → Revenue
-- Dihubungi (25):      total Rp 3.125.000  → Potensi
-- Baru (25):           total Rp 1.875.000  → Potensi
-- Grand Total = 15.000.000

-- Selesai: 25 orang × Rp 250.000 avg = Rp 6.250.000
INSERT INTO donations (no_wa, jumlah, qty_mushaf, atas_nama, doa_catatan, created_at)
SELECT u.no_wa,
  CASE
    WHEN rn <= 5  THEN 500000
    WHEN rn <= 10 THEN 300000
    WHEN rn <= 15 THEN 250000
    WHEN rn <= 20 THEN 200000
    ELSE 100000
  END,
  CASE WHEN rn <= 5 THEN 10 WHEN rn <= 10 THEN 6 WHEN rn <= 15 THEN 5 WHEN rn <= 20 THEN 4 ELSE 2 END,
  CASE WHEN rn % 3 = 0 THEN 'Alm. Bapak' WHEN rn % 3 = 1 THEN 'Ibu Tersayang' ELSE NULL END,
  'Semoga menjadi amal jariyah, aamiin.',
  u.created_at + interval '2 hours'
FROM (
  SELECT no_wa, created_at, ROW_NUMBER() OVER (ORDER BY created_at) AS rn
  FROM users WHERE no_wa LIKE '628000%' ORDER BY created_at LIMIT 25
) u;

-- Terkonfirmasi: 25 orang × Rp 150.000 avg = Rp 3.750.000
INSERT INTO donations (no_wa, jumlah, qty_mushaf, atas_nama, doa_catatan, created_at)
SELECT u.no_wa,
  CASE
    WHEN rn <= 10 THEN 200000
    WHEN rn <= 20 THEN 150000
    ELSE 50000
  END,
  CASE WHEN rn <= 10 THEN 4 WHEN rn <= 20 THEN 3 ELSE 1 END,
  NULL,
  'Mohon doakan keluarga kami.',
  u.created_at + interval '3 hours'
FROM (
  SELECT no_wa, created_at, ROW_NUMBER() OVER (ORDER BY created_at) AS rn
  FROM users WHERE no_wa LIKE '628000%' ORDER BY created_at OFFSET 25 LIMIT 25
) u;

-- Dihubungi: 25 orang × Rp 125.000 avg = Rp 3.125.000
INSERT INTO donations (no_wa, jumlah, qty_mushaf, atas_nama, doa_catatan, created_at)
SELECT u.no_wa,
  CASE
    WHEN rn <= 5  THEN 250000
    WHEN rn <= 15 THEN 125000
    ELSE 75000
  END,
  CASE WHEN rn <= 5 THEN 5 WHEN rn <= 15 THEN 2 ELSE 1 END,
  NULL,
  NULL,
  u.created_at + interval '1 hour'
FROM (
  SELECT no_wa, created_at, ROW_NUMBER() OVER (ORDER BY created_at) AS rn
  FROM users WHERE no_wa LIKE '628000%' ORDER BY created_at OFFSET 50 LIMIT 25
) u;

-- Baru: 25 orang × Rp 75.000 avg = Rp 1.875.000
INSERT INTO donations (no_wa, jumlah, qty_mushaf, atas_nama, doa_catatan, created_at)
SELECT u.no_wa,
  CASE
    WHEN rn <= 5  THEN 150000
    WHEN rn <= 15 THEN 75000
    ELSE 50000
  END,
  CASE WHEN rn <= 5 THEN 3 WHEN rn <= 15 THEN 1 ELSE 1 END,
  NULL,
  NULL,
  u.created_at + interval '30 minutes'
FROM (
  SELECT no_wa, created_at, ROW_NUMBER() OVER (ORDER BY created_at) AS rn
  FROM users WHERE no_wa LIKE '628000%' ORDER BY created_at OFFSET 75 LIMIT 25
) u;

-- ── CS Log ──────────────────────────────────────────────────────
INSERT INTO cs_log (cs_name, lead_id, no_wa, assigned_at)
SELECT l.cs_assignee, l.id, l.no_wa, l.created_at
FROM leads l WHERE l.no_wa LIKE '628000%';
