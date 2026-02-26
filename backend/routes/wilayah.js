// routes/wilayah.js — Kecamatan search with wilayah.id cache
'use strict';
const express = require('express');
const router = express.Router();

let CACHE = []; // [{name, kota, provinsi}]
let LOADING = false;
let LOADED = false;

async function fetchJSON(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
}

// Batch fetch with concurrency limit
async function batchFetch(urls, concurrency = 8) {
    const results = [];
    for (let i = 0; i < urls.length; i += concurrency) {
        const batch = urls.slice(i, i + concurrency);
        const batchResults = await Promise.allSettled(batch.map(u => fetchJSON(u)));
        results.push(...batchResults);
    }
    return results;
}

async function loadAllKecamatan() {
    if (LOADING || LOADED) return;
    LOADING = true;
    console.log('[wilayah] Loading kecamatan data from wilayah.id...');
    try {
        // 1. Fetch all provinces
        const provData = await fetchJSON('https://wilayah.id/api/provinces.json');
        const provinces = provData.data;

        // 2. Fetch all regencies (kabupaten/kota) for each province
        const regUrls = provinces.map(p => `https://wilayah.id/api/regencies/${p.code}.json`);
        const regResults = await batchFetch(regUrls);

        const allRegencies = [];
        regResults.forEach((r, i) => {
            if (r.status === 'fulfilled' && r.value.data) {
                r.value.data.forEach(reg => {
                    allRegencies.push({ ...reg, provinsi: provinces[i].name });
                });
            }
        });

        // 3. Fetch all districts (kecamatan) for each regency
        const distUrls = allRegencies.map(r => `https://wilayah.id/api/districts/${r.code}.json`);
        const distResults = await batchFetch(distUrls);

        const allKecamatan = [];
        distResults.forEach((r, i) => {
            if (r.status === 'fulfilled' && r.value.data) {
                r.value.data.forEach(d => {
                    allKecamatan.push({
                        name: d.name,
                        kota: allRegencies[i].name,
                        provinsi: allRegencies[i].provinsi
                    });
                });
            }
        });

        CACHE = allKecamatan;
        LOADED = true;
        console.log(`[wilayah] Loaded ${CACHE.length} kecamatan successfully.`);
    } catch (err) {
        console.error('[wilayah] Error loading data:', err.message);
    } finally {
        LOADING = false;
    }
}

// GET /api/wilayah/search?q=xxx
router.get('/search', (req, res) => {
    const q = (req.query.q || '').toLowerCase().trim();
    if (q.length < 3) return res.json({ success: true, data: [], message: 'Min 3 karakter' });

    if (!LOADED) {
        if (!LOADING) loadAllKecamatan();
        return res.json({ success: true, data: [], message: 'Data sedang dimuat, coba lagi...' });
    }

    const results = CACHE
        .filter(k => k.name.toLowerCase().includes(q) || k.kota.toLowerCase().includes(q))
        .slice(0, 20)
        .map(k => ({ kecamatan: k.name, kota: k.kota, provinsi: k.provinsi, label: `${k.name}, ${k.kota}` }));

    res.json({ success: true, data: results });
});

// GET /api/wilayah/status
router.get('/status', (_req, res) => {
    res.json({ loaded: LOADED, loading: LOADING, total: CACHE.length });
});

// Start loading on module import
loadAllKecamatan();

module.exports = router;
