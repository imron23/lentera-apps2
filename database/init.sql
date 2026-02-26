-- ============================================================
-- Lentera Dakwah Indonesia — Wakaf Al-Qur'an (PostgreSQL)
-- DB: Imron23  |  User: Imron23  |  Pass: @Imron23
-- ============================================================

-- Table users (PK = no_wa)
CREATE TABLE IF NOT EXISTS users (
  no_wa         VARCHAR(25)     PRIMARY KEY,
  id_unik       VARCHAR(50)     UNIQUE NOT NULL,
  nama          VARCHAR(150)    NOT NULL,
  kota          VARCHAR(150),
  kecamatan     VARCHAR(150),
  segmentation  VARCHAR(30)     NOT NULL DEFAULT 'new',
  created_at    TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- Table leads
CREATE TABLE IF NOT EXISTS leads (
  id           SERIAL          PRIMARY KEY,
  no_wa        VARCHAR(25)     REFERENCES users(no_wa) ON DELETE CASCADE,
  source_page  VARCHAR(255),
  cs_assignee  VARCHAR(150),
  status       VARCHAR(50)     NOT NULL DEFAULT 'baru',
  catatan      TEXT,
  created_at   TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- Table donations
CREATE TABLE IF NOT EXISTS donations (
  id           SERIAL          PRIMARY KEY,
  no_wa        VARCHAR(25)     REFERENCES users(no_wa) ON DELETE CASCADE,
  jumlah       INTEGER         NOT NULL CHECK (jumlah > 0),
  qty_mushaf   SMALLINT,
  atas_nama    VARCHAR(150),
  doa_catatan  TEXT,
  created_at   TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- Table cs_rotator
CREATE TABLE IF NOT EXISTS cs_rotator (
  id                SERIAL          PRIMARY KEY,
  cs_name           VARCHAR(100)    NOT NULL,
  wa_number         VARCHAR(25)     NOT NULL,
  weight_percentage INTEGER         NOT NULL DEFAULT 0,
  is_active         BOOLEAN         NOT NULL DEFAULT TRUE
);

-- Table cs_log (log setiap assignment)
CREATE TABLE IF NOT EXISTS cs_log (
  id           SERIAL          PRIMARY KEY,
  cs_name      VARCHAR(100)    NOT NULL,
  lead_id      INTEGER         REFERENCES leads(id) ON DELETE SET NULL,
  no_wa        VARCHAR(25),
  assigned_at  TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- Seed default CS
INSERT INTO cs_rotator (cs_name, wa_number, weight_percentage) VALUES
  ('CS Imron', '6285163698187', 50),
  ('CS Fauzi', '6281234567890', 50)
ON CONFLICT DO NOTHING;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_leads_wa           ON leads (no_wa);
CREATE INDEX IF NOT EXISTS idx_leads_created       ON leads (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_status        ON leads (status);
CREATE INDEX IF NOT EXISTS idx_donations_wa        ON donations (no_wa);
CREATE INDEX IF NOT EXISTS idx_donations_created   ON donations (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_users_seg           ON users (segmentation);
CREATE INDEX IF NOT EXISTS idx_cs_log_cs           ON cs_log (cs_name);
CREATE INDEX IF NOT EXISTS idx_cs_log_assigned     ON cs_log (assigned_at DESC);
