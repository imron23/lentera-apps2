/* ═══════════════════════════════════════════════════════════════
   Lentera Dakwah Indonesia — script.js
   Form submit → MySQL via Express API → WA CS redirect
   ═══════════════════════════════════════════════════════════════ */
'use strict';

// ── Constants ────────────────────────────────────────────────────
const WA_ADMIN = '6285163698187';
const HARGA_PER_MUSHAF = 80000;

// Detect API base: in Docker/prod nginx proxies /api → backend
// In file:// dev mode, use localhost:3000
const API_BASE = window.location.protocol === 'file:'
    ? 'http://localhost:3000'
    : '';

// ── State ────────────────────────────────────────────────────────
let selectedQty = 0;
let selectedNominal = 0;   // 0 = not set via chips/paket

// ── Helpers ──────────────────────────────────────────────────────
function formatRp(n) {
    return 'Rp\u00a0' + Number(n).toLocaleString('id-ID');
}

// ── Quick Chip Logic ─────────────────────────────────────────────
function pilihChip(el, amount) {
    // Deactivate all chips
    document.querySelectorAll('.chip-btn').forEach(b => b.classList.remove('active'));
    el.classList.add('active');

    const wrap = document.getElementById('custom-input-wrap');
    const inp = document.getElementById('f-jumlah');
    const lbl = document.getElementById('f-jumlah-label');

    if (amount === 'custom') {
        wrap.classList.add('show');
        if (inp) { inp.value = ''; inp.focus(); }
        if (lbl) lbl.classList.remove('show');
        selectedNominal = 0;
    } else {
        wrap.classList.remove('show');
        selectedNominal = amount;
        if (inp) inp.value = amount;
        // Update label
        const qty = Math.round(amount / HARGA_PER_MUSHAF);
        if (lbl) {
            lbl.textContent = (qty > 0 ? '\u00b1 ' + qty + ' Mushaf \u2014 ' : '') + formatRp(amount);
            lbl.classList.add('show');
        }
        // Sync mini paket buttons
        document.querySelectorAll('.mini-paket-btn').forEach(b => {
            b.classList.toggle('active', parseInt(b.dataset.qty) === qty);
        });
        selectedQty = qty;
        showSelectedPill(qty, amount);
    }
}

// ── Paket Selection (big cards) ──────────────────────────────────
function pilihPaket(el, qty, nominal) {
    selectedQty = qty;
    selectedNominal = nominal;

    document.querySelectorAll('.paket-card').forEach(c => {
        c.classList.toggle('selected', parseInt(c.dataset.qty) === qty);
    });

    syncMiniPaket(qty, nominal);

    setTimeout(() => {
        document.getElementById('wakaf')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 150);
}

// ── Mini Paket Buttons ────────────────────────────────────────────
function formPilihPaket(el, qty, nominal) {
    selectedQty = qty;
    selectedNominal = nominal;
    syncMiniPaket(qty, nominal);
}

function syncMiniPaket(qty, nominal) {
    document.querySelectorAll('.mini-paket-btn').forEach(b => {
        b.classList.toggle('active', parseInt(b.dataset.qty) === qty);
    });

    // Sync chips
    document.querySelectorAll('.chip-btn').forEach(b => {
        b.classList.toggle('active', parseInt(b.dataset.amount) === nominal);
    });

    // Hide custom input, show preset value
    document.getElementById('custom-input-wrap')?.classList.remove('show');

    const inp = document.getElementById('f-jumlah');
    if (inp) inp.value = nominal;

    const lbl = document.getElementById('f-jumlah-label');
    if (lbl) {
        lbl.textContent = qty + ' Mushaf \u2014 ' + formatRp(nominal);
        lbl.classList.add('show');
    }

    showSelectedPill(qty, nominal);
}

function showSelectedPill(qty, nominal) {
    const pill = document.getElementById('paket-summary');
    const txt = document.getElementById('paket-summary-text');
    if (!pill || !txt) return;
    txt.textContent = qty + ' Mushaf \u2014 ' + formatRp(nominal);
    pill.classList.add('show');
}

function resetPaket() {
    selectedQty = 0;
    selectedNominal = 0;
    document.querySelectorAll('.paket-card').forEach(c => c.classList.remove('selected'));
    document.querySelectorAll('.mini-paket-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.chip-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('custom-input-wrap')?.classList.remove('show');
    const inp = document.getElementById('f-jumlah');
    if (inp) inp.value = '';
    document.getElementById('f-jumlah-label')?.classList.remove('show');
    document.getElementById('paket-summary')?.classList.remove('show');
}

// ── Orang Tua Toggle ─────────────────────────────────────────────
function toggleOrtu() {
    const cb = document.getElementById('f-ortu-check');
    const box = document.getElementById('f-ortu-box');
    if (cb && box) box.classList.toggle('show', cb.checked);
}

// ── Get Jumlah (from chip state or custom input) ──────────────────
function getJumlah() {
    if (selectedNominal > 0) return selectedNominal;
    const inp = document.getElementById('f-jumlah');
    return inp ? parseInt(inp.value) || 0 : 0;
}

// ── Submit → WA (sync) + DB (background, parallel) ──────────────
async function submitDonasi() {
    const nama = (document.getElementById('f-nama')?.value || '').trim();
    const wa = (document.getElementById('f-wa')?.value || '').trim();
    const kota = (document.getElementById('f-kota-hidden')?.value || '').trim();
    const kecamatan = (document.getElementById('f-kecamatan')?.value || '').trim();
    const jumlah = getJumlah();
    const ortuCb = document.getElementById('f-ortu-check')?.checked;
    const ortuNm = (document.getElementById('f-ortu-nama')?.value || '').trim();
    const doa_catatan = (document.getElementById('f-doa')?.value || '').trim();

    // ── Validasi ───────────────────────────────────────────────────
    if (!nama) { showAlert('Mohon isi nama lengkap Anda.'); return; }
    if (!wa || wa.length < 7) { showAlert('Mohon isi nomor WhatsApp yang valid.'); return; }
    if (!kecamatan) { showAlert('Mohon isi kecamatan / kota Anda.'); return; }
    if (!jumlah || jumlah < 1000) { showAlert('Pilih nominal donasi atau isi minimal Rp 1.000.'); return; }

    const qty = selectedQty || Math.round(jumlah / HARGA_PER_MUSHAF) || 1;
    const ortu = ortuCb && ortuNm ? ortuNm : null;

    // ── Loading state ──────────────────────────────────────────────
    const btn = document.getElementById('btn-submit');
    const btnText = document.getElementById('btn-submit-text');
    if (btn) btn.disabled = true;
    if (btnText) btnText.textContent = 'Menghubungkan ke CS…';

    try {
        // ── Tracking: fire Meta Pixel Lead + GA4 event ─────────────────
        if (typeof window.trackDonasi === 'function') window.trackDonasi(jumlah);

        const payload = {
            nama, wa: '0' + wa, kota, kecamatan, jumlah, qty_mushaf: qty, atas_nama: ortu, doa_catatan, source_page: window.location.pathname
        };

        const r = await fetch(API_BASE + '/api/donasi', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const d = await r.json();

        if (btn) btn.disabled = false;
        if (btnText) btnText.textContent = 'Konfirmasi Wakaf Sekarang';

        if (d.success) {
            console.log('[LDI] Donasi tersimpan id:', d.donation_id);
            // Redirect using the smart WA rotator URL
            window.location.href = d.wa_url;
            showSuccess(nama, kecamatan, qty, jumlah, ortu, d.wa_url);
        } else {
            showAlert(d.message || 'Kesalahan Server. Coba lagi.');
        }

    } catch (e) {
        console.warn('[LDI] DB error:', e.message);
        if (btn) btn.disabled = false;
        if (btnText) btnText.textContent = 'Konfirmasi Wakaf Sekarang';

        // Fallback if backend is down
        const pesan = buildPesan(nama, kecamatan, qty, jumlah, ortu);
        const fbUrl = 'https://wa.me/' + WA_ADMIN + '?text=' + encodeURIComponent(pesan);
        window.location.href = fbUrl;
        showSuccess(nama, kecamatan, qty, jumlah, ortu, fbUrl);
    }
}

function buildPesan(nama, kecamatan, qty, jumlah, ortuNm) {
    let p = `Assalamualaikum admin, saya ${nama} di ${kecamatan} ingin wakaf paket ${qty} Alquran sejumlah ${formatRp(jumlah)} mohon segera di bantu ya`;
    if (ortuNm) p += `\n\n📝 Wakaf atas nama: ${ortuNm}`;
    return p;
}

// ── Show Success State ────────────────────────────────────────────
function showSuccess(nama, kecamatan, qty, jumlah, ortuNm, waUrl) {
    // waUrl sudah di-buka sebelum await di submitDonasi.
    // Ini hanya sebagai fallback link di dalam kartu sukses.

    // Replace form card with success page
    const section = document.getElementById('wakaf');
    const wrap = section ? section.querySelector('.form-wrap') : document.querySelector('.form-wrap');
    if (!wrap) return;

    wrap.innerHTML = `
      <div class="success-card">

        <!-- Header -->
        <div class="success-icon">🤲</div>
        <h2 class="success-title">JazaakAllahu Khairan,<br>${nama}!</h2>
        <p class="success-subtitle">Semoga Allah menerima wakaf Anda sebagai sebab mengalirnya pahala<br>yang tak pernah putus, di dunia dan akhirat.</p>

        <!-- Doa -->
        <div class="success-doa">
          <p class="doa-arabic" dir="rtl">بَارَكَ اللهُ فِيكَ وَجَعَلَهُ صَدَقَةً جَارِيَةً</p>
          <p class="doa-text">"Semoga Allah memberkahi Anda dan menjadikannya sebagai sedekah jariyah."</p>
        </div>

        <!-- Donation summary -->
        <div class="success-summary">
          <div class="summary-row">
            <span class="summary-label">Donatur</span>
            <span class="summary-value">${nama}</span>
          </div>
          <div class="summary-row">
            <span class="summary-label">Kecamatan / Kota</span>
            <span class="summary-value">${kecamatan}</span>
          </div>
          ${ortuNm ? `<div class="summary-row"><span class="summary-label">Atas nama</span><span class="summary-value">${ortuNm}</span></div>` : ''}
          <div class="summary-row">
            <span class="summary-label">Jumlah</span>
            <span class="summary-value highlight">${formatRp(jumlah)}</span>
          </div>
          <div class="summary-row">
            <span class="summary-label">Estimasi</span>
            <span class="summary-value">${qty} Mushaf Al-Qur'an</span>
          </div>
        </div>

        <!-- Bank Transfer -->
        <div class="success-bank">
          <p class="bank-label">Silakan transfer ke rekening berikut:</p>
          <div class="bank-card">
            <div class="bank-logo">🏦</div>
            <div class="bank-info">
              <p class="bank-name">Bank BSI (Bank Syariah Indonesia)</p>
              <p class="bank-code">Kode Bank: <strong>451</strong></p>
              <div class="bank-rekening">
                <span class="rekening-num" id="rek-num">6669997001</span>
                <button class="btn-copy" onclick="copyRek()" title="Salin nomor rekening">📋 Salin</button>
              </div>
              <p class="bank-owner">a.n. <strong>Yayasan Lentera Dakwah Indonesia</strong></p>
            </div>
          </div>
        </div>

        <!-- Emotional CTA -->
        <p class="success-note">
          💜 Setiap huruf yang dibaca dari mushaf yang Anda wakafkan,<br>
          akan menjadi cahaya di alam barzakh Anda kelak.<br>
          <em>Teruslah berbuat kebaikan.</em>
        </p>

        <!-- WA link (fallback jika popup diblokir) -->
        <a href="${waUrl}"
           target="_blank" rel="noopener" class="btn-wa-cs">
          <svg fill="currentColor" viewBox="0 0 24 24" style="width:1.1rem;height:1.1rem;flex-shrink:0"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 00-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
          Buka WhatsApp Admin
        </a>
        <p style="font-size:.72rem;color:#94a3b8;margin-top:.75rem">WA admin terbuka otomatis. Jika belum, klik tombol di atas.</p>
      </div>
    `;
}

function copyRek() {
    navigator.clipboard?.writeText('6669997001').then(() => {
        const btn = document.querySelector('.btn-copy');
        if (btn) { btn.textContent = '✅ Disalin!'; setTimeout(() => { btn.textContent = '📋 Salin'; }, 2000); }
    });
}

// ── Alert ─────────────────────────────────────────────────────────
function showAlert(msg) {
    let el = document.getElementById('form-alert');
    if (!el) {
        el = document.createElement('div');
        el.id = 'form-alert';
        el.style.cssText = 'background:#fef2f2;border:1px solid #fca5a5;color:#b91c1c;border-radius:.625rem;padding:.75rem 1rem;font-size:.875rem;font-weight:600;margin-bottom:.75rem;';
        document.querySelector('.form-fields')?.prepend(el);
    }
    el.textContent = '\u26A0\uFE0F ' + msg;
    el.style.display = 'block';
    setTimeout(() => { if (el) el.style.display = 'none'; }, 4000);
}

// ── Gallery Lightbox ──────────────────────────────────────────────
function openLightbox(src, alt) {
    const lb = document.getElementById('lightbox');
    const img = document.getElementById('lightbox-img');
    if (!lb || !img) return;
    img.src = src; img.alt = alt || '';
    lb.classList.add('open');
    document.body.style.overflow = 'hidden';
}

function closeLightbox() {
    document.getElementById('lightbox')?.classList.remove('open');
    document.body.style.overflow = '';
}

// ── Scroll Reveal ────────────────────────────────────────────────
function initReveal() {
    const els = document.querySelectorAll('.reveal');
    if (!('IntersectionObserver' in window)) {
        els.forEach(el => el.classList.add('visible')); return;
    }
    const obs = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) { entry.target.classList.add('visible'); obs.unobserve(entry.target); }
        });
    }, { threshold: 0.12 });
    els.forEach(el => obs.observe(el));
}

// ── DOMContentLoaded ──────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function () {
    initReveal();

    // Gallery lightbox
    document.querySelectorAll('.gallery-item').forEach(el => {
        el.addEventListener('click', () => {
            const img = el.querySelector('img');
            if (img) openLightbox(img.src, img.alt);
        });
    });
    document.getElementById('lightbox-close')?.addEventListener('click', closeLightbox);
    document.getElementById('lightbox')?.addEventListener('click', function (e) {
        if (e.target === this) closeLightbox();
    });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeLightbox(); });

    // Custom amount live feedback
    document.getElementById('f-jumlah')?.addEventListener('input', function () {
        const val = parseInt(this.value);
        const lbl = document.getElementById('f-jumlah-label');
        if (!lbl) return;
        if (val >= 1000) {
            const qty = Math.round(val / HARGA_PER_MUSHAF);
            lbl.textContent = (qty > 0 ? '\u00b1 ' + qty + ' Mushaf \u2014 ' : '') + formatRp(val);
            lbl.classList.add('show');
            selectedNominal = val;
            selectedQty = qty;
        } else {
            lbl.classList.remove('show');
            selectedNominal = 0;
        }
    });

    // Big paket cards click (delegated via data-qty)
    document.querySelectorAll('.paket-card[data-qty]').forEach(c => {
        const qty = parseInt(c.dataset.qty);
        const nominal = qty * HARGA_PER_MUSHAF;
        c.addEventListener('click', () => pilihPaket(c, qty, nominal));
    });

    // ── Tracker: fire Pixel/GA event on submit ──────────────────────
    // trackDonasi() is injected by /tracking.js from backend env
    if (typeof window.trackDonasi === 'undefined') {
        window.trackDonasi = function () { }; // no-op if tracking not configured
    }

    // Navbar active section highlight
    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('.nav-links a[href^="#"]');
    const obs = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                navLinks.forEach(a => {
                    a.style.color = a.getAttribute('href') === '#' + entry.target.id ? 'var(--magenta)' : '';
                });
            }
        });
    }, { threshold: 0.4 });
    sections.forEach(s => obs.observe(s));

    // ── Countdown Ramadhan ──────────────────────────────────────────
    // Sumber: api.aladhan.com/v1/gToH?date=19-03-2026
    // → 19 Mar 2026 = 30 Ramadhan 1447H (hari terakhir Ramadhan)
    // → 20 Mar 2026 = 1 Syawal 1447H (Idul Fitri)
    // → 18 Feb 2026 = 1 Ramadhan 1447H (awal Ramadhan)
    // Akhir Ramadhan 1447H = 19 Maret 2026 pukul 23:59:59 WIB
    const RAMADHAN_END = new Date('2026-03-19T23:59:59+07:00');
    function updateCountdown() {
        const diff = RAMADHAN_END - Date.now();
        if (diff <= 0) {
            ['cd-days', 'cd-hours', 'cd-mins', 'cd-secs'].forEach(id => {
                const el = document.getElementById(id); if (el) el.textContent = '00';
            });
            const bar = document.getElementById('countdown-bar');
            if (bar) bar.textContent = 'Wakaf dibuka sepanjang tahun!';
            return;
        }
        const days = Math.floor(diff / 864e5);
        const hours = Math.floor((diff % 864e5) / 36e5);
        const mins = Math.floor((diff % 36e5) / 6e4);
        const secs = Math.floor((diff % 6e4) / 1e3);
        const pad = n => String(n).padStart(2, '0');
        const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = pad(v); };
        set('cd-days', days); set('cd-hours', hours); set('cd-mins', mins); set('cd-secs', secs);
        // Update announcement bar too
        const bar = document.getElementById('countdown-bar');
        if (bar) bar.textContent = `${days} hari ${pad(hours)} jam ${pad(mins)} mnt`;
    }
    updateCountdown();
    setInterval(updateCountdown, 1000);

    // ── Active Visitor Simulation ───────────────────────────────────
    const activeEl = document.getElementById('active-num');
    if (activeEl) {
        setInterval(() => {
            const n = Math.floor(8 + Math.random() * 18);
            activeEl.textContent = n;
        }, 12000);
    }

    // ── Live Stats from API ─────────────────────────────────────────
    fetch(API_BASE + '/api/stats')
        .then(r => r.json())
        .then(d => {
            if (!d.success) return;
            const mushaf = document.getElementById('stat-mushaf');
            const donatur = document.getElementById('stat-donatur');
            const bar = document.getElementById('stat-bar');
            const pct = document.getElementById('stat-pct');
            if (mushaf) mushaf.textContent = Number(d.total_mushaf).toLocaleString('id-ID') + '+';
            if (donatur) donatur.textContent = Number(d.total_donatur).toLocaleString('id-ID') + '+';
            if (bar) bar.style.width = d.persen + '%';
            if (pct) pct.textContent = d.persen + '% — Butuh bantuan Anda!';
        })
        .catch(() => { }); // graceful: keep placeholder values

    const FEED_DATA = [
        { nama: 'Ahmad F.', kec: 'Depok', qty: 5, jumlah: 400000 },
        { nama: 'Siti R.', kec: 'Bandung', qty: 1, jumlah: 80000 },
        { nama: 'Budi S.', kec: 'Surabaya', qty: 10, jumlah: 800000 },
        { nama: 'Ummu K.', kec: 'Jakarta Sel.', qty: 1, jumlah: 80000 },
        { nama: 'Rizky M.', kec: 'Bekasi', qty: 5, jumlah: 400000 },
        { nama: 'Aisyah W.', kec: 'Bogor', qty: 2, jumlah: 150000 },
        { nama: 'Hasan B.', kec: 'Makassar', qty: 10, jumlah: 800000 },
        { nama: 'Fathia N.', kec: 'Medan', qty: 1, jumlah: 80000 },
        { nama: 'Yusuf K.', kec: 'Semarang', qty: 5, jumlah: 400000 },
        { nama: 'Nur H.', kec: 'Yogyakarta', qty: 2, jumlah: 150000 },
        { nama: 'Dian P.', kec: 'Palembang', qty: 1, jumlah: 80000 },
        { nama: 'Farhan A.', kec: 'Tangerang', qty: 5, jumlah: 400000 },
        { nama: 'Rini S.', kec: 'Depok', qty: 10, jumlah: 800000 },
        { nama: 'Wahyu D.', kec: 'Malang', qty: 1, jumlah: 80000 },
        { nama: 'Lilis A.', kec: 'Cirebon', qty: 5, jumlah: 400000 },
        { nama: 'Taufik I.', kec: 'Pontianak', qty: 2, jumlah: 150000 },
        { nama: 'Dewi R.', kec: 'Balikpapan', qty: 1, jumlah: 80000 },
        { nama: 'Irfan H.', kec: 'Pekanbaru', qty: 10, jumlah: 800000 },
        { nama: 'Maya S.', kec: 'Banjarmasin', qty: 5, jumlah: 400000 },
        { nama: 'Eko P.', kec: 'Solo', qty: 1, jumlah: 80000 },
        { nama: 'Annisa R.', kec: 'Banten', qty: 2, jumlah: 150000 },
        { nama: 'Fauzan A.', kec: 'Padang', qty: 5, jumlah: 400000 },
        { nama: 'Zahra M.', kec: 'Mataram', qty: 1, jumlah: 80000 },
        { nama: 'Ridwan T.', kec: 'Lampung', qty: 10, jumlah: 800000 },
        { nama: 'Nadia F.', kec: 'Samarinda', qty: 2, jumlah: 150000 },
        { nama: 'Hafiz M.', kec: 'Ambon', qty: 1, jumlah: 80000 },
        { nama: 'Putri L.', kec: 'Denpasar', qty: 5, jumlah: 400000 },
        { nama: 'Rahmad S.', kec: 'Aceh', qty: 10, jumlah: 800000 },
        { nama: 'Fitriani W.', kec: 'Manado', qty: 1, jumlah: 80000 },
        { nama: 'Abdullah R.', kec: 'Kupang', qty: 5, jumlah: 400000 },
        { nama: 'Yanti K.', kec: 'Jambi', qty: 2, jumlah: 150000 },
        { nama: 'Syarif H.', kec: 'Bengkulu', qty: 1, jumlah: 80000 },
        { nama: 'Lina D.', kec: 'Sorong', qty: 10, jumlah: 800000 },
        { nama: 'Agus S.', kec: 'Jayapura', qty: 5, jumlah: 400000 },
        { nama: 'Hamidah N.', kec: 'Ternate', qty: 1, jumlah: 80000 },
        { nama: 'Umar F.', kec: 'Gorontalo', qty: 2, jumlah: 150000 },
        { nama: 'Sari W.', kec: 'Kendari', qty: 5, jumlah: 400000 },
        { nama: 'Rachmat D.', kec: 'Palu', qty: 1, jumlah: 80000 },
        { nama: 'Khairul A.', kec: 'Tanjungpinang', qty: 10, jumlah: 800000 },
        { nama: 'Ibu Nuri', kec: 'Subang', qty: 2, jumlah: 150000 },
        { nama: 'Pak Deni', kec: 'Garut', qty: 5, jumlah: 400000 },
        { nama: 'Munawwarah', kec: 'Tasikmalaya', qty: 1, jumlah: 80000 },
        { nama: 'Firdaus A.', kec: 'Karawang', qty: 10, jumlah: 800000 },
        { nama: 'Hasnah M.', kec: 'Cianjur', qty: 2, jumlah: 150000 },
        { nama: 'Ihsan R.', kec: 'Purwokerto', qty: 5, jumlah: 400000 },
        { nama: 'Salwa K.', kec: 'Kediri', qty: 1, jumlah: 80000 },
        { nama: 'Arief N.', kec: 'Jember', qty: 10, jumlah: 800000 },
        { nama: 'Umi Fatimah', kec: 'Madiun', qty: 2, jumlah: 150000 },
        { nama: 'Miftah H.', kec: 'Magelang', qty: 5, jumlah: 400000 },
        { nama: 'Khansa A.', kec: 'Kudus', qty: 1, jumlah: 80000 },
        { nama: 'Burhan F.', kec: 'Pati', qty: 10, jumlah: 800000 },
        { nama: 'Zainab R.', kec: 'Brebes', qty: 2, jumlah: 150000 },
        { nama: 'Sulton H.', kec: 'Tegal', qty: 5, jumlah: 400000 },
        { nama: 'Amanah S.', kec: 'Indramayu', qty: 1, jumlah: 80000 },
        { nama: 'Rasyid A.', kec: 'Sukabumi', qty: 10, jumlah: 800000 },
        { nama: 'Nabilah M.', kec: 'Cilegon', qty: 2, jumlah: 150000 },
        { nama: 'Zulfikri', kec: 'Serang', qty: 5, jumlah: 400000 },
        { nama: 'Faridah T.', kec: 'Tangerang Sel.', qty: 1, jumlah: 80000 },
        { nama: 'Hakim S.', kec: 'Depok', qty: 10, jumlah: 800000 },
        { nama: 'Wulandari N.', kec: 'Jakarta Timur', qty: 2, jumlah: 150000 },
        { nama: 'Fathur R.', kec: 'Jakarta Barat', qty: 5, jumlah: 400000 },
        { nama: 'Lia K.', kec: 'Jakarta Utara', qty: 1, jumlah: 80000 },
        { nama: 'Zaki A.', kec: 'Bekasi Timur', qty: 10, jumlah: 800000 },
        { nama: 'Rahma D.', kec: 'Bogor Barat', qty: 2, jumlah: 150000 },
        { nama: 'Hamzah F.', kec: 'Bandung Barat', qty: 5, jumlah: 400000 },
        { nama: 'Nisa F.', kec: 'Sumedang', qty: 1, jumlah: 80000 },
        { nama: 'Yusron A.', kec: 'Cimahi', qty: 10, jumlah: 800000 },
        { nama: 'Mutiara R.', kec: 'Kuningan', qty: 2, jumlah: 150000 },
        { nama: 'Asep K.', kec: 'Majalengka', qty: 5, jumlah: 400000 },
        { nama: 'Faizah H.', kec: 'Sidoarjo', qty: 1, jumlah: 80000 },
        { nama: 'Ridho S.', kec: 'Gresik', qty: 10, jumlah: 800000 },
        { nama: 'Maryam A.', kec: 'Mojokerto', qty: 2, jumlah: 150000 },
        { nama: 'Zulham A.', kec: 'Pasuruan', qty: 5, jumlah: 400000 },
        { nama: 'Zahwa N.', kec: 'Probolinggo', qty: 1, jumlah: 80000 },
        { nama: 'Imam S.', kec: 'Tuban', qty: 10, jumlah: 800000 },
        { nama: 'Farah K.', kec: 'Lamongan', qty: 2, jumlah: 150000 },
        { nama: 'Nasrul H.', kec: 'Bojonegoro', qty: 5, jumlah: 400000 },
        { nama: 'Ulfa R.', kec: 'Ngawi', qty: 1, jumlah: 80000 },
        { nama: 'Taqiyuddin', kec: 'Blitar', qty: 10, jumlah: 800000 },
        { nama: 'Naila S.', kec: 'Tulungagung', qty: 2, jumlah: 150000 },
        { nama: 'Rifat A.', kec: 'Banyuwangi', qty: 5, jumlah: 400000 },
        { nama: 'Haura M.', kec: 'Jombang', qty: 1, jumlah: 80000 },
        { nama: 'Fuad H.', kec: 'Bangkalan', qty: 10, jumlah: 800000 },
        { nama: 'Nuraini K.', kec: 'Pamekasan', qty: 2, jumlah: 150000 },
        { nama: 'Alwi R.', kec: 'Sumenep', qty: 5, jumlah: 400000 },
        { nama: 'Salsabela', kec: 'Sampang', qty: 1, jumlah: 80000 },
        { nama: 'Yahya K.', kec: 'Gowa', qty: 10, jumlah: 800000 },
        { nama: 'Hanifa D.', kec: 'Bone', qty: 2, jumlah: 150000 },
        { nama: 'Thariq A.', kec: 'Palopo', qty: 5, jumlah: 400000 },
        { nama: 'Sulaeman', kec: 'Luwu', qty: 1, jumlah: 80000 },
        { nama: 'Mariam F.', kec: 'Pinrang', qty: 10, jumlah: 800000 },
        { nama: 'Syariful', kec: 'Wajo', qty: 2, jumlah: 150000 },
        { nama: 'Ibnu R.', kec: 'Bulukumba', qty: 5, jumlah: 400000 },
        { nama: 'Khadijah H.', kec: 'Sinjai', qty: 1, jumlah: 80000 },
        { nama: 'Nasr F.', kec: 'Enrekang', qty: 10, jumlah: 800000 },
        { nama: 'Raudhah A.', kec: 'Mamuju', qty: 2, jumlah: 150000 },
        { nama: 'Fairuz M.', kec: 'Ternate', qty: 5, jumlah: 400000 },
        { nama: 'Widad H.', kec: 'Tidore', qty: 1, jumlah: 80000 },
    ];
    let feedIdx = Math.floor(Math.random() * 20);

    function showLiveToast() {
        const d = FEED_DATA[feedIdx % FEED_DATA.length];
        feedIdx++;
        const minsAgo = Math.floor(Math.random() * 14) + 1;
        const feed = document.getElementById('live-feed');
        if (!feed) return;

        const toast = document.createElement('div');
        toast.className = 'live-toast';
        toast.innerHTML = `
            <span class="toast-icon">📖</span>
            <div class="toast-body">
                <strong>${d.nama}</strong> dari ${d.kec}<br>
                <span>wakaf ${d.qty} Mushaf • ${minsAgo} mnt lalu</span>
            </div>`;
        feed.prepend(toast);
        // Batasi maksimal 2 toast terlihat
        while (feed.children.length > 2) feed.lastChild.remove();

        setTimeout(() => {
            toast.classList.add('hide');
            setTimeout(() => toast.remove(), 450);
        }, 5500);
    }

    // Toast pertama setelah 3.5 detik, lalu tiap ~17-25 detik
    setTimeout(() => {
        showLiveToast();
        setInterval(showLiveToast, 17000 + Math.random() * 8000);
    }, 3500);
});

