// server.js — Main Express server (PostgreSQL + CRM)
'use strict';
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const { pool, initDB } = require('./db');
const donasi = require('./routes/donasi');
const wilayah = require('./routes/wilayah');

const app = express();
const PORT = process.env.PORT || 3000;

// ── Database Connection ─────────────────────────────────────────
initDB();

// Behind nginx reverse proxy
app.set('trust proxy', 1);

// ── Middleware ──────────────────────────────────────────────────
app.use(express.json({ limit: '20kb' }));

const allowedOrigins = process.env.ALLOWED_ORIGINS || 'http://localhost,http://127.0.0.1,null';
app.use(cors({
    origin: allowedOrigins === '*' ? true : allowedOrigins.split(','),
    methods: ['POST', 'GET', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
}));

// ── CSRF Token Endpoint ─────────────────────────────────────────
const csrfTokens = new Map();
app.get('/api/csrf-token', (req, res) => {
    const token = crypto.randomBytes(32).toString('hex');
    csrfTokens.set(token, Date.now());
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

const SEED_MUSHAF = parseInt(process.env.SEED_MUSHAF) || 6550;
const SEED_DONATUR = parseInt(process.env.SEED_DONATUR) || 247;
const SEED_RUPIAH = parseInt(process.env.SEED_RUPIAH) || 32500000;

app.get('/api/stats', async (req, res) => {
    try {
        const { rows } = await pool.query('SELECT COUNT(*) as total_donatur, COALESCE(SUM(jumlah), 0) as total_terkumpul, COALESCE(SUM(qty_mushaf), 0) as total_mushaf FROM leads');
        const stats = rows[0];

        const dbDon = parseInt(stats.total_donatur);
        const dbRp = parseInt(stats.total_terkumpul);
        const dbMsh = parseInt(stats.total_mushaf);
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
    } catch (err) {
        console.error(err);
        res.json({
            success: true, total_donatur: SEED_DONATUR, total_terkumpul: SEED_RUPIAH,
            total_mushaf: SEED_MUSHAF, target: 50000000, persen: 65
        });
    }
});

app.get('/api/stats/recent', async (req, res) => {
    try {
        const { rows: leads } = await pool.query(
            'SELECT nama_lengkap, kecamatan, kota, wilayah, jumlah, qty_mushaf, doa_catatan, created_at FROM leads WHERE jumlah > 0 ORDER BY created_at DESC LIMIT 15'
        );

        const recent = leads.map(lead => ({
            nama: lead.nama_lengkap,
            kota: lead.wilayah || lead.kota || lead.kecamatan || '',
            jumlah: lead.jumlah,
            qty_mushaf: lead.qty_mushaf,
            doa_catatan: lead.doa_catatan || '',
            created_at: lead.created_at
        }));
        res.json({ success: true, recent });
    } catch (err) {
        console.error(err);
        res.json({ success: true, recent: [] });
    }
});

app.get('/api/admin/donatur', requireAdmin, async (req, res) => {
    try {
        const { rows } = await pool.query(
            `SELECT id as "user_id", nama_lengkap as nama,
                    kecamatan, kota, wilayah,
                    whatsapp_num as wa, atas_nama,
                    jumlah, qty_mushaf, created_at, doa_catatan
             FROM leads WHERE jumlah > 0 ORDER BY created_at DESC`
        );
        const { rows: aggrRows } = await pool.query('SELECT COUNT(*) as total_donatur, COALESCE(SUM(jumlah), 0) as total_terkumpul, COALESCE(SUM(qty_mushaf), 0) as total_mushaf FROM leads WHERE jumlah > 0');

        const stats = {
            total_donatur: parseInt(aggrRows[0].total_donatur),
            total_terkumpul: parseInt(aggrRows[0].total_terkumpul),
            total_mushaf: parseInt(aggrRows[0].total_mushaf),
        };
        res.json({ success: true, rows, stats });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: err.message });
    }
});

const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'crm_secret_123';

function requireAuth(req, res, next) {
    const header = req.headers['authorization'];
    if (!header) return res.status(401).json({ success: false, message: 'Unauthorized' });
    const token = header.split(' ')[1];
    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) return res.status(403).json({ success: false, message: 'Invalid token' });
        req.user = decoded;
        next();
    });
}

app.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body;
    if (password === '@Imron23' || password === process.env.WA_ADMIN) {
        const token = jwt.sign({ username: username || 'admin' }, JWT_SECRET, { expiresIn: '7d' });
        res.json({ success: true, token, user: { username: username || 'admin' } });
    } else {
        res.status(401).json({ success: false, message: 'Invalid password' });
    }
});

app.get('/api/leads', requireAuth, async (req, res) => {
    try {
        const { rows: leads } = await pool.query('SELECT * FROM leads ORDER BY created_at DESC');
        res.json({
            success: true, data: leads.map(l => ({
                ...l,
                id: l.user_id,
                revenue: l.jumlah,
            }))
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

app.put('/api/leads/:id', requireAuth, async (req, res) => {
    try {
        const keys = Object.keys(req.body);
        const values = Object.values(req.body);
        if (keys.length === 0) return res.json({ success: true });

        const setString = keys.map((k, i) => `${k} = $${i + 2}`).join(', ');
        const query = `UPDATE leads SET ${setString} WHERE user_id = $1 RETURNING *`;
        const { rows } = await pool.query(query, [req.params.id, ...values]);

        res.json({ success: true, data: rows[0] });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ── /api/admin/data — endpoint utama imron.html ──────────────────
app.get('/api/admin/data', requireAdmin, async (req, res) => {
    try {
        // Leads
        const { rows: leadsRaw } = await pool.query(
            `SELECT id, user_id, nama_lengkap AS nama, whatsapp_num AS wa,
                    kecamatan, kota, wilayah, jumlah, qty_mushaf, atas_nama,
                    doa_catatan, catatan, source_page, landing_page,
                    status_followup AS status, created_at, updated_at
             FROM leads ORDER BY created_at DESC`
        );
        // Donations (leads yang sudah ada jumlah)
        const donations = leadsRaw.filter(l => (l.jumlah || 0) > 0).map(l => ({
            id: l.id, nama: l.nama, wa: l.wa,
            kecamatan: l.kecamatan, kota: l.kota, wilayah: l.wilayah,
            jumlah: l.jumlah, qty_mushaf: l.qty_mushaf,
            atas_nama: l.atas_nama, doa_catatan: l.doa_catatan,
            catatan: l.catatan, created_at: l.created_at
        }));

        // Stats
        const { rows: ag } = await pool.query(
            `SELECT
                COUNT(*)                                             AS total_donatur,
                COALESCE(SUM(jumlah), 0)                            AS total_terkumpul,
                COALESCE(SUM(qty_mushaf), 0)                        AS total_mushaf,
                COALESCE(SUM(CASE WHEN status_followup='terkonfirmasi' OR status_followup='selesai' THEN jumlah ELSE 0 END), 0) AS revenue,
                COALESCE(SUM(CASE WHEN status_followup NOT IN ('selesai') THEN jumlah ELSE 0 END), 0) AS potensi_revenue,
                COUNT(CASE WHEN status_followup='New Data' OR status_followup='baru' THEN 1 END) AS total_baru,
                COUNT(CASE WHEN status_followup='dihubungi' THEN 1 END)      AS total_dihubungi,
                COUNT(CASE WHEN status_followup='terkonfirmasi' THEN 1 END)  AS total_terkonfirmasi,
                COUNT(CASE WHEN status_followup='selesai' THEN 1 END)        AS total_selesai
             FROM leads WHERE jumlah > 0`
        );
        const stats = {
            total_donatur: parseInt(ag[0].total_donatur),
            total_terkumpul: parseInt(ag[0].total_terkumpul),
            total_mushaf: parseInt(ag[0].total_mushaf),
            revenue: parseInt(ag[0].revenue),
            potensi_revenue: parseInt(ag[0].potensi_revenue),
            total_baru: parseInt(ag[0].total_baru),
            total_dihubungi: parseInt(ag[0].total_dihubungi),
            total_terkonfirmasi: parseInt(ag[0].total_terkonfirmasi),
            total_selesai: parseInt(ag[0].total_selesai),
        };

        res.json({ success: true, leads: leadsRaw, donations, stats });
    } catch (err) {
        console.error('/api/admin/data', err);
        res.status(500).json({ success: false, message: err.message });
    }
});

// ── /api/admin/analytics — chart data ────────────────────────────
app.get('/api/admin/analytics', requireAdmin, async (req, res) => {
    try {
        // Daily trend (last 30 days)
        const { rows: daily } = await pool.query(
            `SELECT DATE(created_at) AS date,
                    COALESCE(SUM(jumlah), 0) AS amount,
                    COUNT(*) AS count
             FROM leads WHERE jumlah > 0 AND created_at >= NOW() - INTERVAL '30 days'
             GROUP BY DATE(created_at) ORDER BY date`
        );
        // Status distribution
        const { rows: statuses } = await pool.query(
            `SELECT COALESCE(status_followup,'baru') AS status, COUNT(*) AS count
             FROM leads GROUP BY status_followup ORDER BY count DESC`
        );
        // Top regions
        const { rows: regions } = await pool.query(
            `SELECT COALESCE(wilayah, kota, kecamatan, 'Lainnya') AS region,
                    COALESCE(SUM(jumlah), 0) AS amount
             FROM leads WHERE jumlah > 0
             GROUP BY 1 ORDER BY amount DESC LIMIT 10`
        );
        // Recent activity
        const { rows: recent } = await pool.query(
            `SELECT nama_lengkap AS nama, kecamatan, jumlah, qty_mushaf, created_at
             FROM leads WHERE jumlah > 0 ORDER BY created_at DESC LIMIT 10`
        );

        res.json({ success: true, daily, statuses, regions, recent });
    } catch (err) {
        console.error('/api/admin/analytics', err);
        res.status(500).json({ success: false, message: err.message });
    }
});

// ── /api/admin/leads/:id PATCH — update status & catatan ─────────
app.patch('/api/admin/leads/:id', requireAdmin, async (req, res) => {
    try {
        const { status, catatan } = req.body;
        await pool.query(
            `UPDATE leads SET status_followup = $1, catatan = $2, updated_at = NOW()
             WHERE id = $3`,
            [status || 'baru', catatan || '', req.params.id]
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ── /api/admin/leads/:id DELETE ───────────────────────────────────
app.delete('/api/admin/leads/:id', requireAdmin, async (req, res) => {
    try {
        await pool.query('DELETE FROM leads WHERE id = $1', [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ── /api/admin/donations/:id DELETE ──────────────────────────────
app.delete('/api/admin/donations/:id', requireAdmin, async (req, res) => {
    try {
        await pool.query('DELETE FROM leads WHERE id = $1', [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ── CS Rotator CRUD ───────────────────────────────────────────────
app.get('/api/admin/cs-rotator', requireAdmin, async (req, res) => {
    try {
        const { rows } = await pool.query('SELECT * FROM cs_rotator ORDER BY id');
        res.json({ success: true, data: rows });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

app.post('/api/admin/cs-rotator', requireAdmin, async (req, res) => {
    try {
        const { cs_name, wa_number, weight_percentage } = req.body;
        const { rows } = await pool.query(
            `INSERT INTO cs_rotator (cs_name, wa_number, weight_percentage)
             VALUES ($1, $2, $3) RETURNING *`,
            [cs_name, wa_number, weight_percentage || 50]
        );
        res.json({ success: true, data: rows[0] });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

app.patch('/api/admin/cs-rotator/:id', requireAdmin, async (req, res) => {
    try {
        const { is_active, weight_percentage } = req.body;
        const updates = [];
        const vals = [];
        if (is_active !== undefined) { updates.push(`is_active = $${vals.length + 1}`); vals.push(is_active); }
        if (weight_percentage !== undefined) { updates.push(`weight_percentage = $${vals.length + 1}`); vals.push(weight_percentage); }
        if (!updates.length) return res.json({ success: true });
        vals.push(req.params.id);
        await pool.query(`UPDATE cs_rotator SET ${updates.join(', ')} WHERE id = $${vals.length}`, vals);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

app.delete('/api/admin/cs-rotator/:id', requireAdmin, async (req, res) => {
    try {
        await pool.query('DELETE FROM cs_rotator WHERE id = $1', [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

app.get('/api/programs', requireAuth, (req, res) => res.json({ success: true, data: [] }));
app.get('/api/pages', requireAuth, (req, res) => res.json({ success: true, data: [] }));
app.get('/api/settings/admin', requireAuth, (req, res) => res.json({ success: true, data: {} }));

app.use('/api/donasi', donasi);
app.use('/api/wilayah', wilayah);
app.get('/api/health', (_req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }));
app.use((_req, res) => res.status(404).json({ success: false, message: 'Not found' }));

app.listen(PORT, () => {
    console.log(`[LDI Backend] Running on port ${PORT}`);
    if (process.env.GA_MEASUREMENT_ID) console.log(`  GA4    : ${process.env.GA_MEASUREMENT_ID}`);
    if (process.env.META_PIXEL_ID) console.log(`  Pixel  : ${process.env.META_PIXEL_ID}`);
    if (process.env.TIKTOK_PIXEL_ID) console.log(`  TikTok : ${process.env.TIKTOK_PIXEL_ID}`);
});
