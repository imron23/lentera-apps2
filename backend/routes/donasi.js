// routes/donasi.js — POST /api/donasi (PostgreSQL)
'use strict';
const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { pool } = require('../db');

function sanitize(str) {
    return String(str || '')
        .replace(/[\x00-\x1f\x7f]/g, '')
        .replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;')
        .trim().slice(0, 500);
}

router.post('/', async (req, res) => {
    try {
        const {
            nama, wa, kota, kecamatan,
            jumlah, qty_mushaf, atas_nama,
            doa_catatan, source_page
        } = req.body;

        // ── Validasi ──────────────────────────────────────────────
        if (!nama || typeof nama !== 'string' || nama.trim().length < 2)
            return res.status(400).json({ success: false, message: 'Nama tidak valid' });
        if (!wa || typeof wa !== 'string' || wa.trim().length < 7)
            return res.status(400).json({ success: false, message: 'No. WhatsApp tidak valid' });
        const jumlahInt = parseInt(jumlah);
        if (!jumlahInt || jumlahInt < 1000 || jumlahInt > 1_000_000_000)
            return res.status(400).json({ success: false, message: 'Jumlah donasi tidak valid' });

        // ── Sanitasi ──────────────────────────────────────────────
        const cleanNama = sanitize(nama);
        const cleanWa = sanitize(wa).replace(/\D/g, '');
        const cleanKecamatan = kecamatan ? sanitize(kecamatan) : null;
        const cleanKota = kota ? sanitize(kota) : null;
        // wilayah: gabungan kecamatan + kota (untuk display / search)
        const cleanWilayah =
            cleanKecamatan && cleanKota ? `${cleanKecamatan}, ${cleanKota}`
                : (cleanKecamatan || cleanKota || null);
        const cleanAtasNama = atas_nama ? sanitize(atas_nama) : null;
        const cleanDoa = doa_catatan ? sanitize(doa_catatan) : null;
        const cleanSource = source_page ? sanitize(source_page) : null;

        const csNumber = process.env.WA_ADMIN || '6285163698187';

        // ── ID unik donatur ──────────────────────────────────────
        const id = cleanWa || uuidv4();

        const countRes = await pool.query('SELECT count(*) FROM leads');
        const count = parseInt(countRes.rows[0].count);

        const d = new Date();
        const tgl = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
        const last4 = cleanWa.slice(-4);
        const seqTxt = String(count + 1).padStart(5, '0');
        const user_id = `ID${tgl}-${seqTxt}-${last4}`;

        // ── Simpan ke DB ──────────────────────────────────────────
        await pool.query(
            `INSERT INTO leads
                (id, user_id, nama_lengkap, whatsapp_num,
                 kecamatan, kota, wilayah,
                 jumlah, qty_mushaf, atas_nama, doa_catatan,
                 source_page, landing_page, updated_at)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,CURRENT_TIMESTAMP)
             ON CONFLICT (id) DO UPDATE SET
                nama_lengkap = EXCLUDED.nama_lengkap,
                whatsapp_num = EXCLUDED.whatsapp_num,
                kecamatan    = EXCLUDED.kecamatan,
                kota         = EXCLUDED.kota,
                wilayah      = EXCLUDED.wilayah,
                jumlah       = EXCLUDED.jumlah,
                qty_mushaf   = EXCLUDED.qty_mushaf,
                atas_nama    = EXCLUDED.atas_nama,
                doa_catatan  = EXCLUDED.doa_catatan,
                source_page  = EXCLUDED.source_page,
                landing_page = EXCLUDED.landing_page,
                updated_at   = CURRENT_TIMESTAMP`,
            [
                id, user_id, cleanNama, cleanWa,
                cleanKecamatan, cleanKota, cleanWilayah,
                jumlahInt, parseInt(qty_mushaf) || 1,
                cleanAtasNama || '', cleanDoa || '',
                cleanSource || '', cleanSource || ''
            ]
        );

        // ── Bangun pesan WA ───────────────────────────────────────
        const formatRp = (n) => 'Rp ' + Number(n).toLocaleString('id-ID');
        const lines = [
            `Assalamu'alaikum, saya ${cleanNama} ingin wakaf Al-Qur'an:`,
            ``,
            `📖 ${qty_mushaf || 1} Mushaf`,
            `💰 ${formatRp(jumlahInt)}`,
        ];
        if (cleanWilayah) lines.push(`📍 Wilayah: ${cleanWilayah}`);
        if (cleanAtasNama) lines.push(`🎁 Atas Nama: ${cleanAtasNama}`);
        if (cleanDoa) lines.push(`🤲 Doa: ${cleanDoa}`);
        lines.push(``, `ID: ${user_id}`, `Mohon info lanjutan. Jazakallahu khairan 🤲`);

        const waMsg = lines.join('\n');
        const waUrl = `https://wa.me/${csNumber}?text=${encodeURIComponent(waMsg)}`;

        return res.json({
            success: true,
            user_id_unik: user_id,
            donation_id: id,
            lead_id: id,
            wa_url: waUrl
        });

    } catch (err) {
        console.error('[donasi] DB error:', err.message);
        return res.status(500).json({ success: false, message: 'Kesalahan server, coba lagi' });
    }
});

module.exports = router;
