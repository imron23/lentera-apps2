// server.js — Main Express server (PostgreSQL + CRM)
'use strict';
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const db = require('./db');
const donasi = require('./routes/donasi');
const wilayah = require('./routes/wilayah');

const app = express();
const PORT = process.env.PORT || 3000;

// Behind nginx reverse proxy
app.set('trust proxy', 1);

// ── Middleware ──────────────────────────────────────────────────
app.use(express.json({ limit: '20kb' }));

app.use(cors({
    origin: process.env.ALLOWED_ORIGINS
        ? process.env.ALLOWED_ORIGINS.split(',')
        : ['http://localhost', 'http://127.0.0.1', 'null'],
    methods: ['POST', 'GET', 'PATCH', 'DELETE', 'OPTIONS'],
}));

// ── CSRF Token Endpoint ─────────────────────────────────────────
const csrfTokens = new Map();
app.get('/api/csrf-token', (req, res) => {
    const token = crypto.randomBytes(32).toString('hex');
    csrfTokens.set(token, Date.now());
    // Cleanup old tokens (> 1 hour)
    for (const [k, v] of csrfTokens) {
        if (Date.now() - v > 3600000) csrfTokens.delete(k);
    }
    res.json({ token });
});

// Rate limit donasi submission
app.use('/api/donasi', rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: { success: false, message: 'Terlalu banyak permintaan. Coba lagi nanti.' }
}));

// ── Auth middleware ─────────────────────────────────────────────
const ADMIN_KEY = process.env.ADMIN_KEY || '@Imron23';
function requireAdmin(req, res, next) {
    if (req.headers['x-admin-key'] !== ADMIN_KEY)
        return res.status(401).json({ success: false, message: 'Unauthorized' });
    next();
}

// ── Tracking.js — GA4 + Meta Pixel + TikTok Pixel ───────────────
app.get('/tracking.js', (req, res) => {
    const gaId = process.env.GA_MEASUREMENT_ID || '';
    const pixelId = process.env.META_PIXEL_ID || '';
    const tiktokId = process.env.TIKTOK_PIXEL_ID || '';
    let js = '/* LDI Tracking */\n';

    if (gaId) {
        js += `
(function(){var s=document.createElement('script');s.async=true;
s.src='https://www.googletagmanager.com/gtag/js?id=${gaId}';
document.head.appendChild(s);})();
window.dataLayer=window.dataLayer||[];
function gtag(){dataLayer.push(arguments);}
gtag('js',new Date());gtag('config','${gaId}');
window._GA_ID='${gaId}';\n`;
    }

    if (pixelId) {
        js += `
!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){
n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;
s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)
}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
fbq('init','${pixelId}');fbq('track','PageView');
window._PIXEL_ID='${pixelId}';\n`;
    }

    if (tiktokId) {
        js += `
!function(w,d,t){w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];
ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"];
ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};
for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);
ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e};
ttq.load=function(e,n){var i="https://analytics.tiktok.com/i18n/pixel/events.js";
ttq._i=ttq._i||{};ttq._i[e]=[];ttq._i[e]._u=i;ttq._t=ttq._t||{};ttq._t[e]=+new Date;ttq._o=ttq._o||{};ttq._o[e]=n||{};
var o=document.createElement("script");o.type="text/javascript";o.async=!0;o.src=i+"?sdkid="+e+"&lib="+t;
var a=document.getElementsByTagName("script")[0];a.parentNode.insertBefore(o,a)};
ttq.load('${tiktokId}');ttq.page();
}(window,document,'ttq');
window._TIKTOK_ID='${tiktokId}';\n`;
    }

    // Universal trackDonasi function
    js += `
window.trackDonasi=function(j){
  if(typeof fbq!=='undefined')fbq('track','Lead',{value:j,currency:'IDR'});
  if(typeof gtag!=='undefined')gtag('event','donation_submitted',{value:j,currency:'IDR'});
  if(typeof ttq!=='undefined')ttq.track('SubmitForm',{value:j,currency:'IDR'});
};\n`;

    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(js);
});

// ── Historical offset ──────────────────────────────────────────
const SEED_MUSHAF = parseInt(process.env.SEED_MUSHAF) || 6550;
const SEED_DONATUR = parseInt(process.env.SEED_DONATUR) || 247;
const SEED_RUPIAH = parseInt(process.env.SEED_RUPIAH) || 32500000;

// ── Public: Stats ───────────────────────────────────────────────
app.get('/api/stats', async (req, res) => {
    try {
        const r = await db.query(
            `SELECT (SELECT COUNT(*)::int FROM users) AS total_donatur,
                    (SELECT COALESCE(SUM(jumlah),0)::bigint FROM donations) AS total_terkumpul,
                    (SELECT COALESCE(SUM(qty_mushaf),0)::int FROM donations) AS total_mushaf`
        );
        const row = r.rows[0];
        const dbDon = Number(row.total_donatur);
        const dbRp = Number(row.total_terkumpul);
        const dbMsh = Number(row.total_mushaf);
        const totalDon = dbDon + SEED_DONATUR;
        const totalRp = dbRp + SEED_RUPIAH;
        const totalMsh = dbMsh + SEED_MUSHAF;
        const target = parseInt(process.env.TARGET_DONASI) || 50000000;
        const persen = Math.min(100, Math.round((totalRp / target) * 100));
        res.json({
            success: true, total_donatur: totalDon, total_terkumpul: totalRp,
            total_mushaf: totalMsh, target, persen,
            db_donatur: dbDon, db_terkumpul: dbRp, db_mushaf: dbMsh
        });
    } catch {
        res.json({
            success: true, total_donatur: SEED_DONATUR, total_terkumpul: SEED_RUPIAH,
            total_mushaf: SEED_MUSHAF, target: 50000000, persen: 65
        });
    }
});

// ── Public: Recent donations (hashed names for social proof) ────
app.get('/api/stats/recent', async (req, res) => {
    try {
        const r = await db.query(
            `SELECT u.nama, u.kota, d.jumlah, d.qty_mushaf, d.doa_catatan, d.created_at
             FROM donations d
             JOIN users u ON d.no_wa = u.no_wa
             ORDER BY d.created_at DESC LIMIT 15`
        );
        const recent = r.rows.map(row => ({
            nama: row.nama,
            kota: row.kota || '',
            jumlah: row.jumlah,
            qty_mushaf: row.qty_mushaf,
            doa_catatan: row.doa_catatan || '',
            created_at: row.created_at
        }));
        res.json({ success: true, recent });
    } catch {
        res.json({ success: true, recent: [] });
    }
});

// ── Admin: Init DB (Temporary migration route) ────────────────────
app.get('/api/admin/init-db', requireAdmin, async (req, res) => {
    try {
        const https = require('https');
        const url = 'https://raw.githubusercontent.com/imron23/lentera-apps2/main/database/init.sql';
        const sqlScript = await new Promise((resolve, reject) => {
            https.get(url, (resp) => {
                let data = '';
                resp.on('data', chunk => data += chunk);
                resp.on('end', () => resolve(data));
            }).on('error', reject);
        });
        await db.query(sqlScript);
        res.json({ success: true, message: 'Database initialized successfully!' });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ── Admin: List All Data ────────────────────────────────────────
app.get('/api/admin/data', requireAdmin, async (req, res) => {
    try {
        const leads = await db.query(
            `SELECT l.id, u.id_unik, u.nama, u.no_wa AS wa, u.kota, u.kecamatan, u.segmentation,
                    l.source_page, l.cs_assignee, l.status, l.catatan, l.created_at
             FROM leads l
             JOIN users u ON l.no_wa = u.no_wa
             ORDER BY l.created_at DESC LIMIT 1000`
        );
        const donations = await db.query(
            `SELECT d.id, u.id_unik, u.nama, u.no_wa AS wa, u.kota, u.kecamatan, u.segmentation,
                    d.jumlah, d.qty_mushaf, d.atas_nama, d.doa_catatan, d.created_at
             FROM donations d
             JOIN users u ON d.no_wa = u.no_wa
             ORDER BY d.created_at DESC LIMIT 1000`
        );
        const stats = await db.query(
            `SELECT (SELECT COUNT(*)::int FROM users) AS total_donatur,
                    (SELECT COALESCE(SUM(jumlah),0)::bigint FROM donations) AS total_terkumpul,
                    (SELECT COALESCE(SUM(qty_mushaf),0)::int FROM donations) AS total_mushaf,
                    (SELECT COUNT(*)::int FROM leads WHERE status='baru' OR status IS NULL) AS total_baru,
                    (SELECT COUNT(*)::int FROM leads WHERE status='dihubungi') AS total_dihubungi,
                    (SELECT COUNT(*)::int FROM leads WHERE status='terkonfirmasi') AS total_terkonfirmasi,
                    (SELECT COUNT(*)::int FROM leads WHERE status='selesai') AS total_selesai`
        );
        res.json({ success: true, leads: leads.rows, donations: donations.rows, stats: stats.rows[0] });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ── Admin: Update lead status/catatan ───────────────────────────
app.patch('/api/admin/leads/:id', requireAdmin, async (req, res) => {
    try {
        const { status, catatan } = req.body;
        const validStatus = ['baru', 'dihubungi', 'terkonfirmasi', 'selesai'];
        if (status && !validStatus.includes(status))
            return res.status(400).json({ success: false, message: 'Status tidak valid' });

        const sets = [];
        const vals = [];
        let idx = 1;
        if (status !== undefined) { sets.push(`status=$${idx++}`); vals.push(status); }
        if (catatan !== undefined) { sets.push(`catatan=$${idx++}`); vals.push(catatan); }
        if (!sets.length) return res.status(400).json({ success: false, message: 'Tidak ada data' });

        vals.push(parseInt(req.params.id));
        const q = `UPDATE leads SET ${sets.join(', ')} WHERE id=$${idx} RETURNING id, status, catatan`;
        const r = await db.query(q, vals);
        if (!r.rows.length) return res.status(404).json({ success: false, message: 'Lead tidak ditemukan' });
        res.json({ success: true, data: r.rows[0] });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ── Admin: Analytics ────────────────────────────────────────────
app.get('/api/admin/analytics', requireAdmin, async (req, res) => {
    try {
        const daily = await db.query(
            `SELECT DATE(created_at) AS date, COUNT(*)::int AS count,
                    COALESCE(SUM(jumlah),0)::bigint AS amount
             FROM donations WHERE created_at >= NOW() - INTERVAL '30 days'
             GROUP BY DATE(created_at) ORDER BY date`
        );
        const regions = await db.query(
            `SELECT COALESCE(u.kota, u.kecamatan, 'Tidak diisi') AS region,
                    COUNT(*)::int AS count, COALESCE(SUM(d.jumlah),0)::bigint AS amount
             FROM donations d JOIN users u ON d.no_wa = u.no_wa
             GROUP BY region ORDER BY amount DESC LIMIT 10`
        );
        const statuses = await db.query(
            `SELECT COALESCE(status,'baru') AS status, COUNT(*)::int AS count
             FROM leads GROUP BY status`
        );
        const recent = await db.query(
            `SELECT d.id, u.nama, u.kota, u.kecamatan, d.jumlah, d.qty_mushaf,
                    d.created_at
             FROM donations d JOIN users u ON d.no_wa = u.no_wa
             ORDER BY d.created_at DESC LIMIT 10`
        );
        const hourly = await db.query(
            `SELECT EXTRACT(HOUR FROM created_at)::int AS hour, COUNT(*)::int AS count
             FROM donations GROUP BY hour ORDER BY hour`
        );
        res.json({
            success: true, daily: daily.rows, regions: regions.rows,
            statuses: statuses.rows, recent: recent.rows, hourly: hourly.rows
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ── Admin: CS Analytics ─────────────────────────────────────────
app.get('/api/admin/cs-analytics', requireAdmin, async (req, res) => {
    try {
        const csPerf = await db.query(
            `SELECT cl.cs_name,
                    COUNT(cl.id)::int AS total_leads,
                    COUNT(DISTINCT CASE WHEN l.status = 'selesai' THEN l.id END)::int AS total_converted,
                    COUNT(DISTINCT CASE WHEN l.status = 'baru' THEN l.id END)::int AS total_pending
             FROM cs_log cl
             LEFT JOIN leads l ON cl.lead_id = l.id
             GROUP BY cl.cs_name
             ORDER BY total_leads DESC`
        );
        const csByDay = await db.query(
            `SELECT DATE(assigned_at) AS date, cs_name, COUNT(*)::int AS count
             FROM cs_log WHERE assigned_at >= NOW() - INTERVAL '30 days'
             GROUP BY DATE(assigned_at), cs_name ORDER BY date`
        );
        res.json({ success: true, performance: csPerf.rows, daily: csByDay.rows });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ── Admin: CS Rotator CRUD ──────────────────────────────────────
app.get('/api/admin/cs-rotator', requireAdmin, async (req, res) => {
    try {
        const r = await db.query('SELECT * FROM cs_rotator ORDER BY id');
        res.json({ success: true, data: r.rows });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

app.post('/api/admin/cs-rotator', requireAdmin, async (req, res) => {
    try {
        const { cs_name, wa_number, weight_percentage } = req.body;
        if (!cs_name || !wa_number) return res.status(400).json({ success: false, message: 'cs_name & wa_number required' });
        const r = await db.query(
            `INSERT INTO cs_rotator (cs_name, wa_number, weight_percentage) VALUES ($1, $2, $3) RETURNING *`,
            [cs_name, wa_number.replace(/\D/g, ''), parseInt(weight_percentage) || 50]
        );
        res.json({ success: true, data: r.rows[0] });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

app.delete('/api/admin/cs-rotator/:id', requireAdmin, async (req, res) => {
    try {
        const r = await db.query('DELETE FROM cs_rotator WHERE id=$1 RETURNING id', [parseInt(req.params.id)]);
        if (!r.rows.length) return res.status(404).json({ success: false, message: 'Not found' });
        res.json({ success: true });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ── Delete Data ─────────────────────────────────────────────────
app.delete('/api/admin/leads/:id', requireAdmin, async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const r = await db.query('DELETE FROM leads WHERE id=$1 RETURNING id', [id]);
        if (!r.rows.length) return res.status(404).json({ success: false, message: 'Tidak ditemukan' });
        res.json({ success: true, message: 'Deleted' });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

app.delete('/api/admin/donations/:id', requireAdmin, async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const r = await db.query('DELETE FROM donations WHERE id=$1 RETURNING id', [id]);
        if (!r.rows.length) return res.status(404).json({ success: false, message: 'Tidak ditemukan' });
        res.json({ success: true, message: 'Deleted' });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ── Admin: Settings (tracking pixels) ───────────────────────────
app.get('/api/admin/settings', requireAdmin, (_req, res) => {
    res.json({
        success: true,
        settings: {
            GA_MEASUREMENT_ID: process.env.GA_MEASUREMENT_ID || '',
            META_PIXEL_ID: process.env.META_PIXEL_ID || '',
            TIKTOK_PIXEL_ID: process.env.TIKTOK_PIXEL_ID || '',
            TARGET_DONASI: process.env.TARGET_DONASI || '50000000',
            SEED_DONATUR: process.env.SEED_DONATUR || '247',
            SEED_MUSHAF: process.env.SEED_MUSHAF || '6550',
            SEED_RUPIAH: process.env.SEED_RUPIAH || '32500000'
        }
    });
});

app.patch('/api/admin/settings', requireAdmin, (req, res) => {
    const allowed = ['GA_MEASUREMENT_ID', 'META_PIXEL_ID', 'TIKTOK_PIXEL_ID', 'TARGET_DONASI', 'SEED_DONATUR', 'SEED_MUSHAF', 'SEED_RUPIAH'];
    const updated = {};
    for (const key of allowed) {
        if (req.body[key] !== undefined) {
            process.env[key] = String(req.body[key]);
            updated[key] = process.env[key];
        }
    }
    res.json({ success: true, updated });
});

// ── Admin: CS Rotator PATCH ─────────────────────────────────────
app.patch('/api/admin/cs-rotator/:id', requireAdmin, async (req, res) => {
    try {
        const { cs_name, wa_number, weight_percentage, is_active } = req.body;
        const sets = [], vals = [];
        let idx = 1;
        if (cs_name !== undefined) { sets.push(`cs_name=$${idx++}`); vals.push(cs_name); }
        if (wa_number !== undefined) { sets.push(`wa_number=$${idx++}`); vals.push(wa_number.replace(/\D/g, '')); }
        if (weight_percentage !== undefined) { sets.push(`weight_percentage=$${idx++}`); vals.push(parseInt(weight_percentage)); }
        if (is_active !== undefined) { sets.push(`is_active=$${idx++}`); vals.push(Boolean(is_active)); }
        if (!sets.length) return res.status(400).json({ success: false, message: 'No data' });
        vals.push(parseInt(req.params.id));
        const r = await db.query(`UPDATE cs_rotator SET ${sets.join(', ')} WHERE id=$${idx} RETURNING *`, vals);
        if (!r.rows.length) return res.status(404).json({ success: false, message: 'Not found' });
        res.json({ success: true, data: r.rows[0] });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ── Routes ──────────────────────────────────────────────────────
app.use('/api/donasi', donasi);
app.use('/api/wilayah', wilayah);
app.get('/api/health', (_req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }));
app.use((_req, res) => res.status(404).json({ success: false, message: 'Not found' }));

// ── Start ────────────────────────────────────────────────────────
app.listen(PORT, () => {
    console.log(`[LDI Backend] Running on port ${PORT}`);
    if (process.env.GA_MEASUREMENT_ID) console.log(`  GA4    : ${process.env.GA_MEASUREMENT_ID}`);
    if (process.env.META_PIXEL_ID) console.log(`  Pixel  : ${process.env.META_PIXEL_ID}`);
    if (process.env.TIKTOK_PIXEL_ID) console.log(`  TikTok : ${process.env.TIKTOK_PIXEL_ID}`);
});
