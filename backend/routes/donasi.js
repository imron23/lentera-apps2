// routes/donasi.js — POST /api/donasi  (PostgreSQL + CRM)
'use strict';
const express = require('express');
const router = express.Router();
const db = require('../db');

// ── Sanitize: strip XSS / non-printable chars ──────────────────
function sanitize(str) {
    return String(str || '')
        .replace(/[\x00-\x1f\x7f]/g, '')
        .replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;')
        .trim().slice(0, 500);
}

// ── Weighted Round-Robin CS Selection ───────────────────────────
function selectCS(rotators) {
    if (!rotators || rotators.length === 0) return null;
    const active = rotators.filter(r => r.is_active !== false);
    if (!active.length) return null;
    const totalWeight = active.reduce((sum, r) => sum + r.weight_percentage, 0);
    if (totalWeight === 0) return active[Math.floor(Math.random() * active.length)];
    let random = Math.random() * totalWeight;
    for (const r of active) {
        if (random < r.weight_percentage) return r;
        random -= r.weight_percentage;
    }
    return active[0];
}

// ── Unique ID Generator: ID[YYYYMMDD]-[Count]-[Last4WA] ────────
function generateUniqId(wa) {
    const d = new Date();
    const tgl = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
    const count = String(Math.floor(Math.random() * 9999)).padStart(4, '0');
    const uniq = wa.slice(-4);
    return `ID${tgl}-${count}-${uniq}`;
}

// ── Donor Segmentation Logic ────────────────────────────────────
async function updateSegmentation(no_wa) {
    try {
        const r = await db.query(
            `SELECT COUNT(*)::int AS total, MAX(created_at) AS last_donation FROM donations WHERE no_wa = $1`,
            [no_wa]
        );
        const { total, last_donation } = r.rows[0];
        const daysSinceLast = last_donation
            ? Math.floor((Date.now() - new Date(last_donation).getTime()) / 86400000)
            : 0;

        let seg = 'new';
        if (total >= 2 && daysSinceLast <= 90) seg = 'active';
        else if (total >= 1 && daysSinceLast > 90) seg = 'churn';
        else if (total >= 1) seg = 'active';

        await db.query('UPDATE users SET segmentation = $1, updated_at = NOW() WHERE no_wa = $2', [seg, no_wa]);
    } catch (e) {
        console.warn('[seg] Error:', e.message);
    }
}

// ── POST /api/donasi ────────────────────────────────────────────
router.post('/', async (req, res) => {
    try {
        const { nama, wa, kota, kecamatan, jumlah, qty_mushaf, atas_nama, doa_catatan, source_page } = req.body;

        // Validate
        if (!nama || typeof nama !== 'string' || nama.trim().length < 2)
            return res.status(400).json({ success: false, message: 'Nama tidak valid' });
        if (!wa || typeof wa !== 'string' || wa.trim().length < 7)
            return res.status(400).json({ success: false, message: 'No. WhatsApp tidak valid' });
        const jumlahInt = parseInt(jumlah);
        if (!jumlahInt || jumlahInt < 1000 || jumlahInt > 1_000_000_000)
            return res.status(400).json({ success: false, message: 'Jumlah donasi tidak valid' });

        const cleanNama = sanitize(nama);
        const cleanWa = sanitize(wa).replace(/\D/g, '');
        const cleanKota = kota ? sanitize(kota) : null;
        const cleanKec = kecamatan ? sanitize(kecamatan) : null;
        const cleanAtasNama = atas_nama ? sanitize(atas_nama) : null;
        const cleanDoa = doa_catatan ? sanitize(doa_catatan) : null;
        const cleanSource = source_page ? sanitize(source_page) : null;

        // 1. Get CS Rotators & Select
        const csResult = await db.query('SELECT cs_name, wa_number, weight_percentage, is_active FROM cs_rotator');
        const selectedCS = selectCS(csResult.rows);
        const csAssignee = selectedCS ? selectedCS.cs_name : 'Admin System';
        const csNumber = selectedCS ? selectedCS.wa_number : (process.env.WA_ADMIN || '6285163698187');

        // 2. Upsert User
        const userCheck = await db.query('SELECT id_unik FROM users WHERE no_wa = $1', [cleanWa]);
        let idUnik;
        if (userCheck.rows.length > 0) {
            idUnik = userCheck.rows[0].id_unik;
            await db.query(
                `UPDATE users SET kota = COALESCE($1, kota), kecamatan = COALESCE($2, kecamatan), nama = $3, updated_at = NOW() WHERE no_wa = $4`,
                [cleanKota, cleanKec, cleanNama, cleanWa]
            );
        } else {
            idUnik = generateUniqId(cleanWa);
            await db.query(
                `INSERT INTO users (no_wa, id_unik, nama, kota, kecamatan) VALUES ($1, $2, $3, $4, $5)`,
                [cleanWa, idUnik, cleanNama, cleanKota, cleanKec]
            );
        }

        // 3. Insert Lead
        const leadRes = await db.query(
            `INSERT INTO leads (no_wa, source_page, cs_assignee) VALUES ($1, $2, $3) RETURNING id`,
            [cleanWa, cleanSource, csAssignee]
        );

        // 4. Log CS Assignment
        await db.query(
            `INSERT INTO cs_log (cs_name, lead_id, no_wa) VALUES ($1, $2, $3)`,
            [csAssignee, leadRes.rows[0].id, cleanWa]
        );

        // 5. Insert Donation
        const donRes = await db.query(
            `INSERT INTO donations (no_wa, jumlah, qty_mushaf, atas_nama, doa_catatan)
             VALUES ($1, $2, $3, $4, $5) RETURNING id`,
            [cleanWa, jumlahInt, parseInt(qty_mushaf) || null, cleanAtasNama, cleanDoa]
        );

        // 6. Update Segmentation
        await updateSegmentation(cleanWa);

        // 7. Build WA redirect URL
        const formatRp = (n) => 'Rp ' + Number(n).toLocaleString('id-ID');
        const lines = [
            `Assalamu'alaikum, saya ${cleanNama} ingin wakaf Al-Qur'an:`,
            ``,
            `📖 ${qty_mushaf || 1} Mushaf`,
            `💰 ${formatRp(jumlahInt)}`,
        ];
        if (cleanAtasNama) lines.push(`🎁 Atas Nama: ${cleanAtasNama}`);
        if (cleanDoa) lines.push(`🤲 Doa: ${cleanDoa}`);
        lines.push(``, `ID: ${idUnik}`, `Mohon info lanjutan. Jazakallahu khairan 🤲`);
        const waMsg = lines.join('\n');
        const waUrl = `https://wa.me/${csNumber}?text=${encodeURIComponent(waMsg)}`;

        return res.json({
            success: true,
            user_id_unik: idUnik,
            donation_id: donRes.rows[0].id,
            lead_id: leadRes.rows[0].id,
            cs_assignee: csAssignee,
            wa_url: waUrl
        });

    } catch (err) {
        console.error('[donasi] DB error:', err.message);
        return res.status(500).json({ success: false, message: 'Kesalahan server, coba lagi' });
    }
});

module.exports = router;
