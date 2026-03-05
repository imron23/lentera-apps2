const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.PG_URI || 'postgresql://user:password@localhost:5432/munira_crm'
});

const initDB = async () => {
    const client = await pool.connect();
    try {
        await client.query(`
            CREATE TABLE IF NOT EXISTS leads (
                id               VARCHAR(255)  PRIMARY KEY,
                user_id          VARCHAR(255),
                nama_lengkap     VARCHAR(255)  NOT NULL,
                whatsapp_num     VARCHAR(255)  NOT NULL,
                kecamatan        VARCHAR(150),
                kota             VARCHAR(150),
                wilayah          VARCHAR(300),
                jumlah           INTEGER       DEFAULT 0,
                qty_mushaf       INTEGER       DEFAULT 0,
                atas_nama        TEXT,
                doa_catatan      TEXT,
                catatan          TEXT,
                source_page      TEXT,
                landing_page     TEXT,
                status_followup  VARCHAR(50)   DEFAULT 'New Data',
                created_at       TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
                updated_at       TIMESTAMP     DEFAULT CURRENT_TIMESTAMP
            );
        `);

        await client.query(`
            CREATE TABLE IF NOT EXISTS cs_rotator (
                id                SERIAL       PRIMARY KEY,
                cs_name           VARCHAR(100) NOT NULL,
                wa_number         VARCHAR(25)  NOT NULL,
                weight_percentage INTEGER      NOT NULL DEFAULT 50,
                is_active         BOOLEAN      NOT NULL DEFAULT TRUE
            );
            INSERT INTO cs_rotator (cs_name, wa_number, weight_percentage)
            VALUES ('CS Imron', '6285163698187', 100)
            ON CONFLICT DO NOTHING;
        `);

        // Migrasi: tambah kolom baru jika tabel lama punya domisili tanpa kecamatan/kota/wilayah
        await client.query(`
            DO $$
            BEGIN
                IF EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_name='leads' AND column_name='domisili'
                ) AND NOT EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_name='leads' AND column_name='wilayah'
                ) THEN
                    ALTER TABLE leads
                        ADD COLUMN IF NOT EXISTS kecamatan  VARCHAR(150),
                        ADD COLUMN IF NOT EXISTS kota       VARCHAR(150),
                        ADD COLUMN IF NOT EXISTS wilayah    VARCHAR(300);
                    UPDATE leads SET wilayah = domisili WHERE wilayah IS NULL AND domisili IS NOT NULL;
                END IF;

                -- tambah kolom wilayah jika belum ada (tabel baru tanpa domisili)
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_name='leads' AND column_name='wilayah'
                ) THEN
                    ALTER TABLE leads ADD COLUMN wilayah VARCHAR(300);
                END IF;

                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_name='leads' AND column_name='kecamatan'
                ) THEN
                    ALTER TABLE leads ADD COLUMN kecamatan VARCHAR(150);
                END IF;

                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_name='leads' AND column_name='kota'
                ) THEN
                    ALTER TABLE leads ADD COLUMN kota VARCHAR(150);
                END IF;
            END$$;
        `);

        console.log('[PostgreSQL] Database connected and initialized.');
    } catch (err) {
        console.error('[PostgreSQL] Initialization error:', err);
    } finally {
        client.release();
    }
};

module.exports = { pool, initDB };
