-- ============================================================
-- Lentera Dakwah Indonesia — Wakaf Al-Qur'an (PostgreSQL)
-- DB: Imron23  |  User: Imron23  |  Pass: @Imron23
-- ============================================================

-- Table leads (satu tabel utama, semua data donatur + CRM)
CREATE TABLE IF NOT EXISTS leads (
  id               VARCHAR(255)  PRIMARY KEY,          -- no_wa atau UUID
  user_id          VARCHAR(255)  UNIQUE,               -- ID unik format IDyyyymmdd-xxxxx-last4
  nama_lengkap     VARCHAR(255)  NOT NULL,
  whatsapp_num     VARCHAR(25)   NOT NULL,
  -- Wilayah —— disimpan terpisah sesuai field form
  kecamatan        VARCHAR(150),
  kota             VARCHAR(150),
  wilayah          VARCHAR(300),                        -- gabungan "kecamatan, kota" untuk display/search
  -- Data donasi
  jumlah           INTEGER       NOT NULL DEFAULT 0,
  qty_mushaf       SMALLINT               DEFAULT 1,
  atas_nama        VARCHAR(150)           DEFAULT '',
  doa_catatan      TEXT                   DEFAULT '',
  -- CRM
  catatan          TEXT                   DEFAULT '',
  source_page      TEXT,
  landing_page     TEXT,
  status_followup  VARCHAR(50)            DEFAULT 'New Data',
  -- Timestamps
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- Table cs_rotator
CREATE TABLE IF NOT EXISTS cs_rotator (
  id                SERIAL      PRIMARY KEY,
  cs_name           VARCHAR(100) NOT NULL,
  wa_number         VARCHAR(25)  NOT NULL,
  weight_percentage INTEGER      NOT NULL DEFAULT 0,
  is_active         BOOLEAN      NOT NULL DEFAULT TRUE
);

-- Table cs_log (log setiap assignment CS)
CREATE TABLE IF NOT EXISTS cs_log (
  id           SERIAL       PRIMARY KEY,
  cs_name      VARCHAR(100) NOT NULL,
  lead_id      VARCHAR(255) REFERENCES leads(id) ON DELETE SET NULL,
  no_wa        VARCHAR(25),
  assigned_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ── Seed default CS ──────────────────────────────────────────────
INSERT INTO cs_rotator (cs_name, wa_number, weight_percentage) VALUES
  ('CS Imron', '6285163698187', 50),
  ('CS Fauzi', '6281234567890', 50)
ON CONFLICT DO NOTHING;

-- ── Indexes ────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_leads_wa          ON leads (whatsapp_num);
CREATE INDEX IF NOT EXISTS idx_leads_created     ON leads (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_status      ON leads (status_followup);
CREATE INDEX IF NOT EXISTS idx_leads_wilayah     ON leads (wilayah);
CREATE INDEX IF NOT EXISTS idx_leads_kota        ON leads (kota);
CREATE INDEX IF NOT EXISTS idx_cs_log_cs         ON cs_log (cs_name);
CREATE INDEX IF NOT EXISTS idx_cs_log_assigned   ON cs_log (assigned_at DESC);
