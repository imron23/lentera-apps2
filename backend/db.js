// db.js — PostgreSQL connection pool (pg)
'use strict';
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME || 'Imron23',
    user: process.env.DB_USER || 'Imron23',
    password: process.env.DB_PASS || '',
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 3000,
});

// Test koneksi saat startup
pool.connect()
    .then(c => { console.log('[DB] PostgreSQL connected ✓'); c.release(); })
    .catch(e => console.error('[DB] Connect error:', e.message));

module.exports = pool;
