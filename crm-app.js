// API Setup
const API_URL = (window.location.protocol === 'file:') ? 'http://localhost/api' : '/api';
let authToken = localStorage.getItem('munira_crm_token');
let allLeads = []; // Cache for leads

// ============================================================
// RUPIAH UTILITIES — Global formatter system
// ============================================================

/**
 * Tampil singkat: 35.000.000 → "35jt" | 1.500.000 → "1,5jt" | 500.000 → "500rb"
 */
function formatRpShort(n) {
    if (!n || n == 0) return '0';
    if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '').replace('.', ',') + 'jt';
    if (n >= 1_000) return (n / 1_000).toFixed(0) + 'rb';
    return String(n);
}

/**
 * Display lengkap dengan titik: 35000000 → "35.000.000"
 */
function formatRpDot(n) {
    if (!n || n == 0) return '0';
    return Number(n).toLocaleString('id-ID');
}

/**
 * Display KPI: "Rp 35jt" or "Rp 35.000.000" jika < 1jt
 */
function formatRpKPI(n) {
    if (!n || n == 0) return 'Rp 0';
    if (n >= 1_000_000) return 'Rp ' + formatRpShort(n);
    return 'Rp ' + formatRpDot(n);
}

/**
 * Parse nilai dari input yg sudah diformat (hapus titik)
 */
function parseRpInput(str) {
    if (!str) return 0;
    const s = String(str).toLowerCase().trim().replace(/ /g, '');
    let rawStr = s.replace(/[^0-9.,]/g, '');

    // Convert 1,5jt to 1.5 format for math
    rawStr = rawStr.replace(/,/g, '.');
    // Ensure we only keep the last decimal separator if there are multiple dots from grouping
    const parts = rawStr.split('.');
    const decimal = parts.length > 1 && parts[parts.length - 1].length <= 2 ? '.' + parts.pop() : '';
    const numRaw = parts.join('') + decimal;

    let num = parseFloat(numRaw) || 0;

    if (s.includes('jt') || s.includes('j')) return Math.round(num * 1_000_000);
    if (s.includes('m')) return Math.round(num * 1_000_000_000);
    if (s.includes('k') || s.includes('rb')) return Math.round(num * 1_000);

    // fallback plain input
    return parseInt(s.replace(/\./g, '').replace(/[^0-9]/g, '')) || 0;
}

/**
 * Pasang auto-dot-formatter ke elemen input (type=text)
 * Saat user ketik, angka otomatis dipisah titik per 3 digit
 */
function attachRpFormatter(el) {
    if (!el || el.dataset.rpAttached) return;
    el.dataset.rpAttached = '1';
    el.setAttribute('inputmode', 'numeric');
    el.setAttribute('autocomplete', 'off');
    el.placeholder = el.placeholder || 'mis: 35.000.000';

    el.addEventListener('input', function () {
        const val = this.value.toLowerCase().trim();
        if (val === '') { this.value = ''; return; }

        // If user typed 'k', 'jt', 'm', parse it instantly and format it back to short form
        if (/[kjmbt]$/.test(val)) {
            const parsed = parseRpInput(val);
            if (parsed) {
                this.value = formatRpShort(parsed);
            }
            return; // Let them finish or blur
        }

        // Just numeric input -> auto dot
        const pos = this.selectionStart;
        const raw = val.replace(/\./g, '').replace(/[^0-9]/g, '');
        if (raw === '') return;
        const formatted = Number(raw).toLocaleString('id-ID');
        const diff = formatted.length - this.value.length;
        this.value = formatted;

        // Restore cursor
        try { this.setSelectionRange(pos + diff, pos + diff); } catch (e) { }
    });

    // On blur, force short format
    el.addEventListener('blur', function () {
        if (this.value) {
            const parsed = parseRpInput(this.value);
            if (parsed) this.value = formatRpShort(parsed);
            else this.value = '';
        }
    });

    el.addEventListener('keydown', function (e) {
        // Allow backspace, delete, arrows, tab
        if ([8, 46, 37, 38, 39, 40, 9].includes(e.keyCode)) return;
        // Allow ctrl+a, ctrl+c, ctrl+v
        if (e.ctrlKey || e.metaKey) return;
        // Block non-numeric AND non-shortcut chars
        if (!/[0-9kKjJtTmMbBrR,.]/.test(e.key)) {
            e.preventDefault();
        }
    });
}

/**
 * Set nilai ke rp-input (sudah formatted)
 */
function setRpInput(el, value) {
    if (!el) return;
    if (!value || value == 0) { el.value = ''; return; }
    el.value = Number(value).toLocaleString('id-ID');
}

/**
 * Init semua .rp-input di DOM
 */
function initAllRpInputs() {
    document.querySelectorAll('.rp-input').forEach(attachRpFormatter);
}


// Elements
const bladeLogin = document.getElementById('login-blade');
const bladeDashboard = document.getElementById('dashboard-blade');
const loginForm = document.getElementById('loginForm');
const btnLogout = document.getElementById('btnLogout');
const txtUserRole = document.getElementById('txtUserRole');
const navLinks = document.querySelectorAll('.nav-link[data-target]');
const pagesGrid = document.getElementById('pages-grid');

// Theme toggle (dark is default)
const themeToggle = document.getElementById('themeToggle');
const isLightMode = localStorage.getItem('munira_crm_theme') === 'light';
if (isLightMode) document.body.classList.add('light-mode');

themeToggle.addEventListener('click', () => {
    document.body.classList.toggle('light-mode');
    const isLight = document.body.classList.contains('light-mode');
    localStorage.setItem('munira_crm_theme', isLight ? 'light' : 'dark');
});

// Initialization
document.addEventListener('DOMContentLoaded', () => {
    if (authToken) {
        showDashboard();
    } else {
        showLogin();
    }
});

// Mobile menu toggle
document.getElementById('mobileMenuToggle').addEventListener('click', () => {
    document.querySelector('.sidebar').classList.toggle('mobile-open');
});
// Close mobile menu if clicked outside
document.querySelector('.main-wrapper').addEventListener('click', () => {
    if (window.innerWidth <= 768) {
        document.querySelector('.sidebar').classList.remove('mobile-open');
    }
});

// LOGIN LOGIC
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('loginUser').value;
    const password = document.getElementById('loginPass').value;
    const errorMsg = document.getElementById('loginError');

    errorMsg.textContent = 'Authenticating...';

    try {
        const res = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const data = await res.json();
        if (data.success) {
            authToken = data.token;
            localStorage.setItem('munira_crm_token', authToken);
            localStorage.setItem('munira_crm_user', data.user.username);
            showDashboard();
        } else {
            errorMsg.textContent = data.message || 'Access Denied.';
        }
    } catch (err) {
        errorMsg.textContent = 'Server Unreachable.';
    }
});

btnLogout.addEventListener('click', () => {
    authToken = null;
    localStorage.removeItem('munira_crm_token');
    localStorage.removeItem('munira_crm_user');
    showLogin();
});

function showLogin() {
    bladeLogin.classList.add('active');
    bladeDashboard.classList.remove('active');
}

async function showDashboard() {
    bladeLogin.classList.remove('active');
    bladeDashboard.classList.add('active');

    // Set Profile
    const usr = localStorage.getItem('munira_crm_user') || 'Admin';
    txtUserRole.textContent = usr.charAt(0).toUpperCase() + usr.slice(1);

    // Initial load
    await loadProgramsList();
    fetchDashboardData();
    initAllRpInputs(); // Attach formatter to static .rp-input elements
}

// NAVIGATION
navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const targetId = link.dataset.target;

        // Reset UI
        navLinks.forEach(l => l.classList.remove('active'));
        document.querySelectorAll('.view-panel').forEach(v => v.classList.remove('active'));

        // Set Active
        link.classList.add('active');
        document.getElementById(`view-${targetId}`).classList.add('active');

        // Page title
        document.getElementById('pageTitle').textContent = link.textContent.trim();

        // Routings
        if (targetId === 'overview' || targetId === 'leads') {
            fetchDashboardData();
        } else if (targetId === 'pages') {
            fetchPages();
            fetchPrograms();
        } else if (targetId === 'programs') {
            fetchProgramBuilder();
        } else if (targetId === 'marketing') {
            fetchSettings();
        }
    });
});

// LOAD CORE DATA
async function fetchDashboardData() {
    try {
        const resLeads = await fetch(`${API_URL}/leads?status=All&limit=10000`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });

        if (resLeads.status === 401 || resLeads.status === 403) {
            btnLogout.click();
            return;
        }

        const payloadLeads = await resLeads.json();

        if (payloadLeads.success) {
            allLeads = payloadLeads.data || [];

            // Render widgets based on overview date pickers
            const sd = document.getElementById('overviewStartDate').value;
            const ed = document.getElementById('overviewEndDate').value;
            let ovData = filterByDateRange(allLeads, sd, ed);
            renderWidgetsAndCharts(ovData);

            // Render table based on leads date pickers
            renderLeadsTable();
        }
    } catch (err) {
        console.error('Failed fetching data:', err);
    }
}

function filterByDateRange(dataList, startStr, endStr) {
    if (!startStr && !endStr) return dataList;
    let sTime = startStr ? new Date(startStr).getTime() : 0;
    // For end date, push to end of day
    let eTime = endStr ? new Date(endStr).getTime() + 86399000 : Infinity;

    return dataList.filter(L => {
        let t = new Date(L.created_at).getTime();
        return t >= sTime && t <= eTime;
    });
}

// RENDER WIDGETS & CHARTS
function renderWidgetsAndCharts(leadsArray) {
    if (!leadsArray) return;

    const todayStr = new Date().toISOString().split('T')[0];
    let todaysCount = 0;
    let closingCount = 0;
    let lostCount = 0;

    leadsArray.forEach(L => {
        if (L.status_followup === 'Order Complete' || L.status_followup === 'DP') closingCount++;
        if (L.status_followup === 'Lost') lostCount++;
        if (L.created_at && L.created_at.startsWith(todayStr)) todaysCount++;
    });

    const totalLeads = leadsArray.length;
    const cvr = totalLeads > 0 ? ((closingCount / totalLeads) * 100).toFixed(1) : '0.0';

    // Revenue calculation (DP + Order Complete)
    let totalRevenue = 0;
    const orderLeads = leadsArray.filter(L => L.status_followup === 'Order Complete' || L.status_followup === 'DP');
    orderLeads.forEach(L => { totalRevenue += (L.revenue || 0); });

    // Repeat customer: same whatsapp number appears more than once
    const phoneCounts = {};
    leadsArray.forEach(L => { phoneCounts[L.whatsapp_num] = (phoneCounts[L.whatsapp_num] || 0) + 1; });
    const repeatCount = Object.values(phoneCounts).filter(c => c > 1).length;

    document.getElementById('stTotalLeads').textContent = totalLeads;
    document.getElementById('stTodayLeads').textContent = todaysCount;
    document.getElementById('stTotalClosing').textContent = closingCount;
    document.getElementById('stTotalLost').textContent = lostCount;
    document.getElementById('stCVR').textContent = cvr + '%';
    document.getElementById('stRevenue').textContent = formatRpKPI(totalRevenue);
    document.getElementById('stTotalPacks').textContent = orderLeads.length;
    document.getElementById('stRepeatCustomer').textContent = repeatCount;

    // Recent 5 leads
    const recents = leadsArray.slice(0, 5);
    const tblRecent = document.getElementById('tblRecentLeads');
    tblRecent.innerHTML = '';

    recents.forEach(L => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>
                <strong>${L.nama_lengkap}</strong><br>
                <small style="color:var(--text-secondary);">${formatDate(L.created_at)}</small>
            </td>
            <td>${L.paket_pilihan || 'N/A'}</td>
            <td><span class="status st-${(L.status_followup || 'New Data').toLowerCase().replace(/\s+/g, '')}">${L.status_followup || 'New Data'}</span></td>
            <td style="font-size:0.8rem; color:var(--text-secondary); max-width:200px;">${L.catatan || '<span style="opacity:0.5;">—</span>'}</td>
        `;
        tblRecent.appendChild(tr);
    });

    drawTrendChart(leadsArray);
    drawPackageChart(leadsArray);
    drawStatusFunnelChart(leadsArray);
    drawCityChart(leadsArray);
    fetchLpShowcase();
}

// Chart Instance Trackers
let chartTrend = null;
let chartPkg = null;

function drawTrendChart(leadsArray) {
    const ctx = document.getElementById('leadsTrendChart');
    if (!ctx) return;

    // Group by week for cleaner visualization
    const weekMap = {};
    leadsArray.forEach(L => {
        if (!L.created_at) return;
        const d = new Date(L.created_at);
        // Get Monday of the week
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        const monday = new Date(d);
        monday.setDate(diff);
        const weekKey = monday.toISOString().split('T')[0];
        weekMap[weekKey] = (weekMap[weekKey] || 0) + 1;
    });

    const sortedWeeks = Object.keys(weekMap).sort();
    const weekVals = sortedWeeks.map(w => weekMap[w]);

    // Format labels: "3 Sep", "10 Sep", etc.
    const labels = sortedWeeks.map(w => {
        const d = new Date(w);
        return d.getDate() + ' ' + d.toLocaleString('id-ID', { month: 'short' });
    });

    // Cumulative running total
    let cumulative = 0;
    const cumulativeVals = weekVals.map(v => { cumulative += v; return cumulative; });

    if (chartTrend) chartTrend.destroy();

    const ctxFill = ctx.getContext('2d');
    const grad1 = ctxFill.createLinearGradient(0, 0, 0, 280);
    grad1.addColorStop(0, 'rgba(37, 99, 234, 0.2)');
    grad1.addColorStop(1, 'rgba(37, 99, 234, 0)');

    const grad2 = ctxFill.createLinearGradient(0, 0, 0, 280);
    grad2.addColorStop(0, 'rgba(16, 185, 129, 0.12)');
    grad2.addColorStop(1, 'rgba(16, 185, 129, 0)');

    chartTrend = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Leads / Minggu',
                    data: weekVals,
                    borderColor: '#2563ea',
                    backgroundColor: grad1,
                    fill: true,
                    tension: 0.45,
                    borderWidth: 2.5,
                    pointRadius: 0,
                    pointHitRadius: 20,
                    pointHoverRadius: 5,
                    pointHoverBackgroundColor: '#2563ea',
                    pointHoverBorderColor: '#fff',
                    pointHoverBorderWidth: 2,
                    yAxisID: 'y'
                },
                {
                    label: 'Total Kumulatif',
                    data: cumulativeVals,
                    borderColor: '#10B981',
                    backgroundColor: grad2,
                    fill: true,
                    tension: 0.45,
                    borderWidth: 1.5,
                    borderDash: [4, 3],
                    pointRadius: 0,
                    pointHitRadius: 20,
                    pointHoverRadius: 4,
                    pointHoverBackgroundColor: '#10B981',
                    yAxisID: 'y1'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    align: 'end',
                    labels: {
                        color: '#8896AB',
                        font: { size: 11 },
                        boxWidth: 12,
                        boxHeight: 2,
                        padding: 12
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(15,23,42,0.95)',
                    titleColor: '#e2e8f0',
                    bodyColor: '#94a3b8',
                    borderColor: 'rgba(255,255,255,0.1)',
                    borderWidth: 1,
                    cornerRadius: 8,
                    padding: 10,
                    displayColors: true,
                    callbacks: {
                        title: (items) => 'Minggu ' + items[0].label
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    position: 'left',
                    grid: { color: 'rgba(255,255,255,0.04)', drawBorder: false },
                    ticks: { color: '#8896AB', font: { size: 11 }, padding: 6 },
                    title: { display: false }
                },
                y1: {
                    beginAtZero: true,
                    position: 'right',
                    grid: { display: false },
                    ticks: { color: '#6ee7b7', font: { size: 10 }, padding: 6 },
                    title: { display: false }
                },
                x: {
                    grid: { display: false },
                    ticks: {
                        color: '#8896AB',
                        font: { size: 10 },
                        maxRotation: 45,
                        autoSkip: true,
                        maxTicksLimit: 12
                    }
                }
            }
        }
    });
}

function drawPackageChart(leadsArray) {
    const ctx = document.getElementById('packageChart');
    if (!ctx) return;

    const grouped = {};
    leadsArray.forEach(L => {
        let p = L.paket_pilihan && L.paket_pilihan.trim() !== '' ? L.paket_pilihan : 'Lainnya / Tidak Disebut';
        grouped[p] = (grouped[p] || 0) + 1;
    });

    if (chartPkg) chartPkg.destroy();
    chartPkg = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(grouped),
            datasets: [{
                data: Object.values(grouped),
                backgroundColor: ['#2563ea', '#ea580c', '#16a34a', '#d97706', '#9333ea', '#64748b']
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'right' }
            }
        }
    });
}

let chartFunnel = null;
let chartCity = null;

function drawStatusFunnelChart(leadsArray) {
    const ctx = document.getElementById('statusFunnelChart');
    if (!ctx) return;

    const statusOrder = ['New Data', 'Contacted', 'Nego Harga', 'Proses FU', 'Negosiasi', 'DP', 'Order Complete', 'Lost'];
    const statusColors = ['#2563ea', '#9333EA', '#D97706', '#3B82F6', '#DB2777', '#F59E0B', '#16a34a', '#DC2626'];
    const counts = statusOrder.map(s => leadsArray.filter(L => L.status_followup === s).length);

    if (chartFunnel) chartFunnel.destroy();
    chartFunnel = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: statusOrder,
            datasets: [{
                label: 'Jumlah',
                data: counts,
                backgroundColor: statusColors,
                borderRadius: 6,
                barThickness: 22
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { beginAtZero: true, grid: { display: false }, ticks: { color: '#8896AB' } },
                y: { grid: { display: false }, ticks: { color: '#8896AB' } }
            }
        }
    });
}

function drawCityChart(leadsArray) {
    const ctx = document.getElementById('cityChart');
    if (!ctx) return;

    const grouped = {};
    leadsArray.forEach(L => {
        const city = L.domisili && L.domisili.trim() !== '' ? L.domisili : 'Tidak Diketahui';
        grouped[city] = (grouped[city] || 0) + 1;
    });

    // Sort by count descending, take top 8
    const sorted = Object.entries(grouped).sort((a, b) => b[1] - a[1]).slice(0, 8);
    const cityColors = ['#2563ea', '#16a34a', '#D97706', '#9333EA', '#DB2777', '#DC2626', '#64748b', '#0891b2'];

    if (chartCity) chartCity.destroy();
    chartCity = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: sorted.map(s => s[0]),
            datasets: [{
                label: 'Leads',
                data: sorted.map(s => s[1]),
                backgroundColor: cityColors.slice(0, sorted.length),
                borderRadius: 6,
                barThickness: 28
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.06)' }, ticks: { color: '#8896AB' } },
                x: { grid: { display: false } }
            }
        }
    });
}

// RENDER LEADS TABLE (Full)
let currentPage = 1;

window.setOptDate = function (prefix, opt) {
    const today = new Date();
    let start = new Date();
    let end = new Date();

    if (opt === 'yesterday') {
        start.setDate(today.getDate() - 1);
        end.setDate(today.getDate() - 1);
    } else if (opt === '7d') {
        start.setDate(today.getDate() - 6);
    } else if (opt === '14d') {
        start.setDate(today.getDate() - 13);
    } else if (opt === '1m') {
        start.setMonth(today.getMonth() - 1);
    }

    if (opt === 'all') {
        document.getElementById(prefix + 'StartDate').value = '';
        document.getElementById(prefix + 'EndDate').value = '';
    } else {
        const fmt = (d) => {
            const tzOff = d.getTimezoneOffset() * 60000;
            return new Date(d.getTime() - tzOff).toISOString().split('T')[0];
        };
        document.getElementById(prefix + 'StartDate').value = fmt(start);
        document.getElementById(prefix + 'EndDate').value = fmt(end);
    }

    if (prefix === 'leads') { currentPage = 1; renderLeadsTable(); }
    else fetchDashboardData();
}

function renderLeadsTable() {
    const searchVal = document.getElementById('searchLead').value.toLowerCase();
    const filterVal = document.getElementById('filterStatus').value;
    const body = document.getElementById('tblLeadsBody');

    body.innerHTML = '';

    // Date range filter
    const sd = document.getElementById('leadsStartDate').value;
    const ed = document.getElementById('leadsEndDate').value;
    let baseData = filterByDateRange(allLeads, sd, ed);

    // Text & Status Filter
    let filtered = baseData.filter(L => {
        let matchS = filterVal === 'All' || L.status_followup === filterVal;
        let matchQ = (L.nama_lengkap || '').toLowerCase().includes(searchVal) ||
            (L.user_id || '').toLowerCase().includes(searchVal) ||
            (L.whatsapp_num || '').includes(searchVal) ||
            (L.paket_pilihan || '').toLowerCase().includes(searchVal);
        return matchS && matchQ;
    });

    if (filtered.length === 0) {
        body.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:32px; color:var(--text-secondary);">No records found.</td></tr>`;
        const pf = document.getElementById('pageInfo');
        if (pf) pf.textContent = `Showing 0 of 0`;
        return;
    }

    // Pagination Logic
    const pageSizeEl = document.getElementById('pageSize');
    let limit = pageSizeEl ? pageSizeEl.value : '20';
    let startIdx = 0;
    let endIdx = filtered.length;
    let totalItems = filtered.length;

    if (limit !== 'All') {
        limit = parseInt(limit, 10);
        let maxPage = Math.ceil(totalItems / limit) || 1;
        if (currentPage > maxPage) currentPage = maxPage;

        startIdx = (currentPage - 1) * limit;
        endIdx = startIdx + limit;

        // update UI info
        let displayEnd = Math.min(endIdx, totalItems);
        const pf = document.getElementById('pageInfo');
        if (pf) pf.textContent = `Showing ${startIdx + 1} - ${displayEnd} of ${totalItems}`;
        const pBtn = document.getElementById('btnPagePrev');
        if (pBtn) pBtn.disabled = currentPage === 1;
        const nBtn = document.getElementById('btnPageNext');
        if (nBtn) nBtn.disabled = currentPage === maxPage;
    } else {
        const pf = document.getElementById('pageInfo');
        if (pf) pf.textContent = `Showing All ${totalItems}`;
        const pBtn = document.getElementById('btnPagePrev');
        if (pBtn) pBtn.disabled = true;
        const nBtn = document.getElementById('btnPageNext');
        if (nBtn) nBtn.disabled = true;
    }

    filtered.slice(startIdx, endIdx).forEach(L => {
        let statCls = (L.status_followup || 'New Data').toLowerCase().replace(/\s+/g, '');

        const tr = document.createElement('tr');
        tr.className = 'table-main-row';
        tr.onclick = (e) => {
            if (e.target.tagName.toLowerCase() === 'button' || e.target.closest('button')) return; // ignore if clicking buttons
            toggleAccordion(L.id);
        };
        tr.innerHTML = `
            <td>
                <strong style="color:var(--brand);">${L.user_id || L.id}</strong>
            </td>
            <td>
                ${L.domisili || '-'}
            </td>
            <td>
                <span>${formatDate(L.created_at)}</span><br>
                <small style="color:var(--text-secondary)">${timeAgo(L.created_at)}</small>
            </td>
            <td>
                <strong>${L.nama_lengkap}</strong><br>
                <a href="#" class="wa-direct" onclick="alertWA('${L.whatsapp_num}'); return false;" style="color:var(--success); font-weight:600; text-decoration:none;">${L.whatsapp_num}</a>
            </td>
            <td>
                ${L.paket_pilihan || 'N/A'}<br>
                <small style="color:var(--text-secondary)">${L.yang_berangkat || '1 Pax'}</small>
            </td>
            <td>
                <small style="color:var(--text-secondary);">${L.program_id ? getProgramName(L.program_id) : '-'}</small>
            </td>
            <td>
                <span style="font-weight:600; font-size:0.85rem;">${formatLpName(L.landing_page)}</span><br>
                <small style="color:var(--text-secondary); text-transform:uppercase;">${L.utm_source || 'organic'}</small>
            </td>
            <td>
                <span class="status st-${statCls}">${L.status_followup}</span>
                ${L.catatan ? `<div style="font-size:0.75rem; color:var(--text-secondary); margin-top:2px;">${L.catatan.substring(0, 25)}...</div>` : ''}
            </td>
             <td style="text-align:right;">
                <div class="act-row" style="justify-content:flex-end;">
                     <!-- Chat / Edit triggers replaced by accordion click, can keep small icons -->
                    <button class="btn-mini btn-outline" onclick="toggleAccordion('${L.id}')"><i class="fas fa-chevron-down"></i> Detail</button>
                    <button class="btn-mini btn-primary" onclick="openWaModal('${encodeURIComponent(JSON.stringify(L))}')"><i class="fab fa-whatsapp"></i></button>
                </div>
            </td>
        `;
        body.appendChild(tr);

        const trAcc = document.createElement('tr');
        trAcc.className = 'accordion-row';
        trAcc.id = 'acc-' + L.id;
        trAcc.innerHTML = `
            <td colspan="9" class="accordion-content">
                <div class="accordion-grid">
                    <!-- Profil Singkat -->
                    <div>
                        <strong style="display:block; margin-bottom:8px; border-bottom:1px solid var(--border); padding-bottom:4px; font-size:0.85rem;"><i class="fas fa-id-card"></i> Kebutuhan Jamaah</strong>
                        <ul style="list-style:none; padding:0; margin:0; font-size:0.8rem; line-height:1.6; color:var(--text-primary);">
                            <li><strong>Domisili:</strong> ${L.domisili || '-'}</li>
                            <li><strong>Paspor:</strong> ${L.kesiapan_paspor || '-'}</li>
                            <li><strong>Jumlah:</strong> ${L.yang_berangkat || '-'}</li>
                            <li><strong>Paket:</strong> ${L.paket_pilihan || '-'}</li>
                            <li><strong>Rencana:</strong> ${L.rencana_umrah || '-'}</li>
                        </ul>
                    </div>
                    <!-- Log Status & Catatan -->
                    <div>
                        <strong style="display:block; margin-bottom:8px; border-bottom:1px solid var(--border); padding-bottom:4px; font-size:0.85rem;"><i class="fas fa-history"></i> Histori & Log Status</strong>
                        <div style="font-size:0.8rem; max-height:80px; overflow-y:auto; background:var(--bg-app); padding:8px; border:1px solid var(--border); border-radius:4px; margin-bottom:8px;">
                            <div style="margin-bottom:4px;"><small style="color:var(--text-secondary);">${formatDate(L.updated_at || L.created_at)}</small><br><strong style="color:var(--brand)">[${L.status_followup}]</strong> - ${L.catatan || 'Lead Masuk Sistem'}</div>
                        </div>
                        <div style="display:flex; gap:8px; align-items:center;">
                            <select id="selStatus-${L.id}" class="select-base" style="padding:4px; font-size:0.75rem; width:130px;" onchange="toggleInlineRevenue('${L.id}')">
                                <option value="New Data" ${L.status_followup === 'New Data' ? 'selected' : ''}>New Data</option>
                                <option value="Contacted" ${L.status_followup === 'Contacted' ? 'selected' : ''}>Contacted</option>
                                <option value="Nego Harga" ${L.status_followup === 'Nego Harga' ? 'selected' : ''}>Nego Harga</option>
                                <option value="Proses FU" ${L.status_followup === 'Proses FU' ? 'selected' : ''}>Proses FU</option>
                                <option value="Negosiasi" ${L.status_followup === 'Negosiasi' ? 'selected' : ''}>Negosiasi</option>
                                <option value="DP" ${L.status_followup === 'DP' ? 'selected' : ''}>DP</option>
                                <option value="Order Complete" ${L.status_followup === 'Order Complete' ? 'selected' : ''}>Order Complete</option>
                                <option value="Lost" ${L.status_followup === 'Lost' ? 'selected' : ''}>Lost</option>
                                <option value="Pembatalan" ${L.status_followup === 'Pembatalan' ? 'selected' : ''}>Pembatalan</option>
                                <option value="Pengembalian" ${L.status_followup === 'Pengembalian' ? 'selected' : ''}>Pengembalian</option>
                            </select>
                            <input type="text" id="note-${L.id}" placeholder="Ketik update..." style="flex:1; padding:4px 8px; font-size:0.75rem; border:1px solid var(--border); border-radius:4px; background:transparent; color:var(--text-primary);">
                            <button class="btn-primary btn-mini" onclick="updateLeadStatus('${L.id}')" title="Simpan Log"><i class="fas fa-save"></i> Save</button>
                        </div>
                        <div style="display:flex; gap:8px; align-items:center; margin-top:8px;">
                            <label style="font-size:0.75rem; font-weight:600; white-space:nowrap;">Program</label>
                            <select id="selProg-${L.id}" class="select-base prog-select" style="padding:4px; font-size:0.75rem; flex:1;" onchange="handleProgramChange('${L.id}')">
                                <option value="">— Belum dipilih —</option>
                                ${programsListCache.map(p => `<option value="${p.id}" ${p.id === L.program_id ? 'selected' : ''}>${p.nama_program}</option>`).join('')}
                            </select>
                        </div>
                        <div id="progSummary-${L.id}">
                            ${L.program_id ? getProgramSummaryHtml(L) : ''}
                        </div>
                        <div id="revRow-${L.id}" style="display:${['DP', 'Order Complete'].includes(L.status_followup) ? 'flex' : 'none'}; gap:8px; align-items:center; margin-top:8px;">
                            <label style="font-size:0.75rem; font-weight:600; white-space:nowrap;"><i class="fas fa-money-bill-wave" style="color:#F59E0B; margin-right:4px;"></i>Revenue Rp</label>
                            <input type="text" id="rev-${L.id}" value="${L.revenue ? Number(L.revenue).toLocaleString('id-ID') : ''}" placeholder="mis: 35.000.000" style="flex:1; padding:4px 8px; font-size:0.75rem; border:1px solid var(--border); border-radius:4px; background:transparent; color:var(--text-primary);" class="rp-input" inputmode="numeric">
                        </div>
                        <div style="margin-top:8px;">
                            <button class="btn-mini btn-outline" onclick="openEditModal('${L.id}', '${L.status_followup}', \`${(L.catatan || '').replace(/`/g, "'")}\`, ${L.revenue || 0}, '${L.program_id || ''}')" title="Full Edit"><i class="fas fa-pen" style="font-size:0.7rem;"></i> Edit</button>
                        </div>
                    </div>
                    <!-- Action & Templates (Brosur / GDrive) -->
                    <div>
                        <strong style="display:block; margin-bottom:8px; border-bottom:1px solid var(--border); padding-bottom:4px; font-size:0.85rem;"><i class="fas fa-paper-plane"></i> Template FU & Lampirkan Link</strong>
                        <div style="display:flex; align-items:center; gap:6px; margin-bottom:8px;">
                            <i class="fab fa-google-drive" style="color:#F4B400; font-size:1.1rem;"></i>
                            <input type="url" id="waLink-${L.id}" placeholder="Link Drive / Brosur PDF (Opsional)" style="flex:1; padding:6px 8px; font-size:0.75rem; border:1px solid var(--border); border-radius:4px; background:var(--bg-app); color:var(--text-primary);">
                        </div>
                        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:6px;">
                            <button class="btn-outline btn-mini" onclick="sendWAtpl('${encodeURIComponent(JSON.stringify(L))}', 1)" style="font-size:0.70rem; padding:6px;"><i class="fab fa-whatsapp" style="color:#25D366"></i> T1: Kirim Katalog</button>
                            <button class="btn-outline btn-mini" onclick="sendWAtpl('${encodeURIComponent(JSON.stringify(L))}', 2)" style="font-size:0.70rem; padding:6px;"><i class="fab fa-whatsapp" style="color:#25D366"></i> T2: Info Paspor</button>
                            <button class="btn-outline btn-mini" onclick="sendWAtpl('${encodeURIComponent(JSON.stringify(L))}', 3)" style="font-size:0.70rem; padding:6px;"><i class="fab fa-whatsapp" style="color:#25D366"></i> T3: Cek Kabar</button>
                            <button class="btn-primary btn-mini" onclick="openWaModal('${encodeURIComponent(JSON.stringify(L))}')" style="font-size:0.70rem; padding:6px;"><i class="fas fa-comment-dots"></i> Chat Manual</button>
                        </div>
                    </div>
                </div>
            </td>
        `;
        body.appendChild(trAcc);
    });
    // Attach Rp formatter to new .rp-input elements rendered inside accordion
    initAllRpInputs();
}

// REFRESH LISTENER
['searchLead', 'filterStatus', 'leadsStartDate', 'leadsEndDate'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
        el.addEventListener(id === 'searchLead' ? 'input' : 'change', () => { currentPage = 1; renderLeadsTable(); });
    }
});

const pageSizeEl = document.getElementById('pageSize');
if (pageSizeEl) pageSizeEl.addEventListener('change', () => { currentPage = 1; renderLeadsTable(); });

const btnPrev = document.getElementById('btnPagePrev');
if (btnPrev) btnPrev.addEventListener('click', () => { if (currentPage > 1) { currentPage--; renderLeadsTable(); } });

const btnNext = document.getElementById('btnPageNext');
if (btnNext) btnNext.addEventListener('click', () => { currentPage++; renderLeadsTable(); });

// FETCH PAGES DIRECTORY (New CMS Features)
let pagesListCache = [];

async function fetchPages() {
    try {
        const res = await fetch(`${API_URL}/pages`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        const data = await res.json();
        pagesGrid.innerHTML = '';
        if (data.success && data.pages) {
            pagesListCache = data.pages;
            data.pages.forEach(pg => {
                const isHome = pg.path === 'index.html';
                const icon = isHome ? 'fa-home' : 'fa-rocket';
                const statusCls = pg.status === 'Live' ? 'ordercomplete' : 'negoharga';
                const thumbUrl = pg.image || '';
                const thumbHtml = thumbUrl
                    ? `<div style="width:100%; height:160px; border-radius:var(--radius-md) var(--radius-md) 0 0; overflow:hidden; background:#0d1117; position:relative;">
                        <img src="${thumbUrl.startsWith('http') ? thumbUrl : pg.url.replace('/index.html', '') + '/' + thumbUrl}" 
                             style="width:100%; height:100%; object-fit:cover;" 
                             onerror="this.parentElement.innerHTML='<div style=\\'height:100%;display:flex;align-items:center;justify-content:center;color:var(--text-secondary);font-size:2rem;\\'><i class=\\'fas fa-image\\'></i></div>'"
                        >
                       </div>`
                    : `<div style="width:100%; height:160px; border-radius:var(--radius-md) var(--radius-md) 0 0; background:linear-gradient(135deg, var(--brand), #9333ea); display:flex; align-items:center; justify-content:center; position:relative;">
                        <i class="fas ${icon}" style="font-size:2.5rem; color:white; opacity:0.7;"></i>
                       </div>`;

                const descSnippet = pg.description
                    ? `<div style="font-size:0.72rem; color:var(--text-secondary); margin-bottom:8px; line-height:1.4; border-left:2px solid var(--brand); padding-left:8px;">${pg.description.substring(0, 100)}${pg.description.length > 100 ? '...' : ''}</div>`
                    : '';

                const folderEncoded = encodeURIComponent(pg.folder);

                pagesGrid.innerHTML += `
                    <div class="page-card" style="padding:0; overflow:hidden;">
                        ${thumbHtml}
                        <div style="padding:16px;">
                            <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:6px;">
                                <h4 style="font-size:0.9rem; line-height:1.3; margin:0; flex:1;">${pg.title}</h4>
                                <span class="status st-${statusCls}" style="margin-left:8px; white-space:nowrap;">${pg.status}</span>
                            </div>
                            <div style="font-size:0.75rem; color:var(--text-secondary); margin-bottom:8px;">
                                <i class="fas fa-folder" style="margin-right:4px;"></i> ${pg.alias || pg.folder}
                            </div>
                            ${descSnippet}
                            <div style="display:flex; justify-content:space-between; align-items:center; gap:6px;">
                                <a href="${pg.url}" target="_blank" style="font-size:0.78rem; color:var(--brand); text-decoration:none;">
                                    <i class="fas fa-external-link-alt" style="margin-right:4px;"></i> Buka
                                </a>
                                <div style="display:flex; gap:4px;">
                                    <button class="btn-mini" title="Edit Gambar & Deskripsi" onclick="openLpEditModal('${folderEncoded}')">
                                        <i class="fas fa-pen" style="font-size:0.7rem;"></i>
                                    </button>
                                    <button class="btn-mini copy" onclick="navigator.clipboard.writeText(window.location.origin + '${pg.url}'); this.innerHTML='<i class=\\'fas fa-check\\'></i>'; setTimeout(()=>this.innerHTML='<i class=\\'far fa-copy\\'></i>',1500)" title="Copy URL">
                                        <i class="far fa-copy"></i>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            });
        }
    } catch (e) { console.error('Error fetching pages', e); }
}

// ==================== LP EDIT MODAL ====================
const lpEditOverlay = document.getElementById('lpEditOverlay');
const lpEditForm = document.getElementById('lpEditForm');
const lpEditImageInput = document.getElementById('lpEditImage');
const lpEditImgPreview = document.getElementById('lpEditImgPreview');
const lpEditImgTag = document.getElementById('lpEditImgTag');
const lpEditImgError = document.getElementById('lpEditImgError');

document.getElementById('lpEditClose')?.addEventListener('click', closeLpEdit);
document.getElementById('lpEditCancelBtn')?.addEventListener('click', closeLpEdit);
lpEditOverlay?.addEventListener('click', (e) => { if (e.target === lpEditOverlay) closeLpEdit(); });

function closeLpEdit() {
    if (lpEditOverlay) lpEditOverlay.style.display = 'none';
    document.body.style.overflow = '';
}

// Live image preview
lpEditImageInput?.addEventListener('input', function () {
    const url = this.value.trim();
    if (url && url.startsWith('http')) {
        lpEditImgPreview.style.display = 'block';
        lpEditImgTag.style.display = 'block';
        lpEditImgError.style.display = 'none';
        lpEditImgTag.src = url;
        lpEditImgTag.onerror = () => {
            lpEditImgTag.style.display = 'none';
            lpEditImgError.style.display = 'flex';
        };
    } else {
        lpEditImgPreview.style.display = 'none';
    }
});

window.openLpEditModal = function (folderEncoded) {
    const folder = decodeURIComponent(folderEncoded);
    const pg = pagesListCache.find(p => p.folder === folder);
    if (!pg) return;

    document.getElementById('lpEditFolder').value = folder;
    document.getElementById('lpEditTitle').textContent = `Edit: ${pg.title}`;
    lpEditImageInput.value = pg.image || '';
    document.getElementById('lpEditDesc').value = pg.description || '';

    // Trigger preview
    if (pg.image && pg.image.startsWith('http')) {
        lpEditImgPreview.style.display = 'block';
        lpEditImgTag.style.display = 'block';
        lpEditImgError.style.display = 'none';
        lpEditImgTag.src = pg.image;
        lpEditImgTag.onerror = () => {
            lpEditImgTag.style.display = 'none';
            lpEditImgError.style.display = 'flex';
        };
    } else {
        lpEditImgPreview.style.display = 'none';
    }

    lpEditOverlay.style.display = 'flex';
    document.body.style.overflow = 'hidden';
};

lpEditForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const folder = document.getElementById('lpEditFolder').value;
    const image_url = lpEditImageInput.value.trim();
    const description = document.getElementById('lpEditDesc').value.trim();

    try {
        const res = await fetch(`${API_URL}/pages/${encodeURIComponent(folder)}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + authToken },
            body: JSON.stringify({ image_url, description })
        });
        const data = await res.json();
        if (data.success) {
            closeLpEdit();
            fetchPages();
        } else {
            alert('Gagal: ' + data.message);
        }
    } catch (err) {
        alert('Server error updating page settings.');
    }
});

// ==================== LP SHOWCASE ON OVERVIEW ====================
async function fetchLpShowcase() {
    const grid = document.getElementById('lpShowcaseGrid');
    if (!grid) return;

    try {
        // Reuse cached pages or fetch fresh
        let pages = pagesListCache;
        if (!pages || pages.length === 0) {
            const res = await fetch(`${API_URL}/pages`, {
                headers: { 'Authorization': `Bearer ${authToken}` }
            });
            const data = await res.json();
            if (data.success) {
                pages = data.pages;
                pagesListCache = pages;
            }
        }

        grid.innerHTML = '';
        if (!pages || pages.length === 0) {
            grid.innerHTML = '<div style="padding:24px; color:var(--text-secondary); text-align:center; width:100%;">Belum ada landing page.</div>';
            return;
        }

        pages.forEach(pg => {
            const thumbUrl = pg.image || '';
            const imgSrc = thumbUrl.startsWith('http') ? thumbUrl : (thumbUrl ? pg.url.replace('/index.html', '') + '/' + thumbUrl : '');
            const thumbStyle = imgSrc
                ? `background:url('${imgSrc}') center/cover no-repeat; background-color:#0d1117;`
                : `background:linear-gradient(135deg, var(--brand), #9333ea); display:flex; align-items:center; justify-content:center;`;
            const thumbInner = imgSrc ? '' : '<i class="fas fa-rocket" style="font-size:1.8rem; color:white; opacity:0.5;"></i>';
            const descText = pg.description ? pg.description.substring(0, 60) + (pg.description.length > 60 ? '...' : '') : '';

            grid.innerHTML += `
                <div style="min-width:220px; max-width:220px; scroll-snap-align:start; background:var(--bg-surface); border:1px solid var(--border); border-radius:var(--radius-md); overflow:hidden; flex-shrink:0; transition:all 0.2s; cursor:pointer;"
                     onmouseenter="this.style.borderColor='var(--brand)'; this.style.transform='translateY(-2px)'"
                     onmouseleave="this.style.borderColor='var(--border)'; this.style.transform='none'"
                     onclick="window.open('${pg.url}', '_blank')">
                    <div style="width:100%; height:120px; ${thumbStyle}">
                        ${thumbInner}
                    </div>
                    <div style="padding:12px;">
                        <div style="font-weight:600; font-size:0.82rem; line-height:1.3; margin-bottom:4px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${pg.title}</div>
                        ${descText ? `<div style="font-size:0.7rem; color:var(--text-secondary); line-height:1.3; margin-bottom:6px;">${descText}</div>` : ''}
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            <span style="font-size:0.65rem; padding:2px 8px; border-radius:50px; background:${pg.status === 'Live' ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)'}; color:${pg.status === 'Live' ? '#10B981' : '#F59E0B'}; font-weight:700;">${pg.status}</span>
                            <span style="font-size:0.68rem; color:var(--text-secondary);"><i class="fas fa-folder" style="margin-right:2px;"></i>${pg.alias || pg.folder}</span>
                        </div>
                    </div>
                </div>
            `;
        });
    } catch (e) {
        console.error('Error fetching LP showcase', e);
    }
}

// ==================== PROGRAM MANAGEMENT ====================
async function fetchPrograms() {
    try {
        const res = await fetch(`${API_URL}/programs`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        const data = await res.json();
        const grid = document.getElementById('programs-grid');
        const empty = document.getElementById('programs-empty');
        if (!grid) return;
        grid.innerHTML = '';

        if (data.success && data.programs && data.programs.length > 0) {
            if (empty) empty.style.display = 'none';
            data.programs.forEach(pg => {
                const activeBadge = pg.is_active
                    ? '<span style="font-size:0.65rem; padding:2px 8px; border-radius:50px; background:rgba(16,185,129,0.15); color:#10B981; font-weight:700;">AKTIF</span>'
                    : '<span style="font-size:0.65rem; padding:2px 8px; border-radius:50px; background:rgba(239,68,68,0.15); color:#EF4444; font-weight:700;">NONAKTIF</span>';

                const fallbackHtml = `<div class="poster-fallback" style="width:100%; height:160px; background:linear-gradient(135deg, #1E3A5F, #0B1120); border-radius:var(--radius-sm); display:flex; align-items:center; justify-content:center;">
                        <i class="fas fa-image" style="font-size:2rem; color:rgba(255,255,255,0.15);"></i>
                       </div>`;

                // If img fails to load, hide img and show fallback div by selecting nextElementSibling
                const posterHtml = pg.poster_url
                    ? `<img src="${pg.poster_url}" style="width:100%; height:160px; object-fit:cover; border-radius:var(--radius-sm);" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                       <div style="display:none; width:100%; height:160px; background:linear-gradient(135deg, #1E3A5F, #0B1120); border-radius:var(--radius-sm); align-items:center; justify-content:center;">
                        <i class="fas fa-image" style="font-size:2rem; color:rgba(255,255,255,0.15);"></i>
                       </div>`
                    : fallbackHtml;

                grid.innerHTML += `
                    <div style="background:var(--bg-surface); border:1px solid var(--border); border-radius:var(--radius-md); overflow:hidden; transition:all 0.2s;" 
                         onmouseenter="this.style.borderColor='var(--brand)'" onmouseleave="this.style.borderColor='var(--border)'">
                        ${posterHtml}
                        <div style="padding:14px;">
                            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                                <strong style="font-size:0.85rem; line-height:1.3;">${pg.nama_program}</strong>
                                ${activeBadge}
                            </div>
                            ${pg.deskripsi ? `<p style="font-size:0.75rem; color:var(--text-secondary); margin-bottom:10px; line-height:1.4;">${pg.deskripsi.substring(0, 80)}${pg.deskripsi.length > 80 ? '...' : ''}</p>` : ''}
                            <div style="display:flex; gap:6px; justify-content:flex-end;">
                                <button class="btn-mini" onclick="openProgramModal('${pg.id}')" title="Edit"><i class="fas fa-pen" style="font-size:0.7rem;"></i></button>
                                <button class="btn-mini" onclick="toggleProgram('${pg.id}', ${pg.is_active ? 0 : 1})" title="${pg.is_active ? 'Nonaktifkan' : 'Aktifkan'}">
                                    <i class="fas fa-${pg.is_active ? 'eye-slash' : 'eye'}" style="font-size:0.7rem;"></i>
                                </button>
                                <button class="btn-mini" onclick="deleteProgram('${pg.id}')" title="Hapus" style="color:var(--danger);"><i class="fas fa-trash" style="font-size:0.7rem;"></i></button>
                            </div>
                        </div>
                    </div>
                `;
            });
        } else {
            if (empty) empty.style.display = 'block';
        }
    } catch (e) { console.error('Error fetching programs', e); }
}

// Store programs data for edit
let programsCache = [];

async function openProgramModal(editId) {
    const overlay = document.getElementById('programOverlay');
    const title = document.getElementById('programModalTitle');
    overlay.style.display = 'flex';

    document.getElementById('programId').value = '';
    document.getElementById('programNama').value = '';
    document.getElementById('programPoster').value = '';
    document.getElementById('programDeskripsi').value = '';
    document.getElementById('programLink').value = '';
    document.getElementById('programOrder').value = '0';
    document.getElementById('programActive').value = '1';
    document.getElementById('programPosterPreview').style.display = 'none';

    if (editId) {
        title.textContent = 'Edit Program';
        try {
            const res = await fetch(`${API_URL}/programs`, { headers: { 'Authorization': `Bearer ${authToken}` } });
            const data = await res.json();
            const pg = data.programs.find(p => p.id === editId);
            if (pg) {
                document.getElementById('programId').value = pg.id;
                document.getElementById('programNama').value = pg.nama_program;
                document.getElementById('programPoster').value = pg.poster_url || '';
                document.getElementById('programDeskripsi').value = pg.deskripsi || '';
                document.getElementById('programLink').value = pg.landing_url || '';
                document.getElementById('programOrder').value = pg.sort_order || 0;
                document.getElementById('programActive').value = pg.is_active ? '1' : '0';
                if (pg.poster_url) {
                    document.getElementById('programPosterPreview').style.display = 'block';
                    document.getElementById('programPosterImg').src = pg.poster_url;
                }
            }
        } catch (e) { console.error(e); }
    } else {
        title.textContent = 'Tambah Program Baru';
    }
}

function closeProgramModal() {
    document.getElementById('programOverlay').style.display = 'none';
}

document.getElementById('programClose')?.addEventListener('click', closeProgramModal);
document.getElementById('programCancelBtn')?.addEventListener('click', closeProgramModal);

// Live poster preview for old modal
document.getElementById('programPoster')?.addEventListener('input', function () {
    const url = this.value.trim();
    const preview = document.getElementById('programPosterPreview');
    const img = document.getElementById('programPosterImg');
    const errObj = document.getElementById('programPosterError');
    if (url) {
        preview.style.display = 'block';
        img.style.display = 'block';
        errObj.style.display = 'none';
        img.src = url;
        img.onerror = () => { img.style.display = 'none'; errObj.style.display = 'flex'; };
    } else {
        preview.style.display = 'none';
        img.src = '';
    }
});

// Live poster preview for new builder modal
document.getElementById('pbPoster')?.addEventListener('input', function () {
    const url = this.value.trim();
    const preview = document.getElementById('pbPosterPreview');
    const img = document.getElementById('pbPosterImg');
    const errObj = document.getElementById('pbPosterError');
    if (url) {
        preview.style.display = 'block';
        img.style.display = 'block';
        errObj.style.display = 'none';
        img.src = url;
        img.onerror = () => { img.style.display = 'none'; errObj.style.display = 'flex'; };
    } else {
        preview.style.display = 'none';
        img.src = '';
    }
});

document.getElementById('programForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('programId').value;
    const payload = {
        nama_program: document.getElementById('programNama').value.trim(),
        poster_url: document.getElementById('programPoster').value.trim(),
        deskripsi: document.getElementById('programDeskripsi').value.trim(),
        landing_url: document.getElementById('programLink').value.trim(),
        sort_order: parseInt(document.getElementById('programOrder').value) || 0,
        is_active: document.getElementById('programActive').value === '1'
    };

    try {
        const method = id ? 'PUT' : 'POST';
        const url = id ? `${API_URL}/programs/${id}` : `${API_URL}/programs`;
        await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
            body: JSON.stringify(payload)
        });
        closeProgramModal();
        fetchPrograms();
    } catch (err) { console.error(err); alert('Gagal menyimpan program'); }
});

async function toggleProgram(id, newState) {
    try {
        await fetch(`${API_URL}/programs/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
            body: JSON.stringify({ is_active: newState })
        });
        fetchPrograms();
    } catch (e) { console.error(e); }
}

async function deleteProgram(id) {
    if (!confirm('Hapus program ini?')) return;
    try {
        await fetch(`${API_URL}/programs/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        fetchPrograms();
    } catch (e) { console.error(e); }
}

document.getElementById('btnAddProgram')?.addEventListener('click', () => openProgramModal(null));

document.getElementById('btnExport').addEventListener('click', async () => {
    try {
        const btn = document.getElementById('btnExport');
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Exporting...';
        btn.disabled = true;

        const res = await fetch(`${API_URL}/leads?status=All&limit=10000`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        const payload = await res.json();

        btn.innerHTML = '<i class="fas fa-download"></i> Export CSV';
        btn.disabled = false;

        if (payload.success && payload.data.length > 0) {
            const exportData = payload.data.map(L => ({
                "Lead UID": L.user_id || L.id,
                "Tanggal": formatDate(L.created_at),
                "Nama Lengkap": L.nama_lengkap,
                "No. WhatsApp": L.whatsapp_num,
                "Domisili": L.domisili,
                "Jumlah Peserta": L.yang_berangkat,
                "Paket Pilihan": L.paket_pilihan,
                "Kesiapan Paspor": L.kesiapan_paspor,
                "Status": L.status_followup,
                "Catatan CRM": L.catatan,
                "Sumber Halaman": L.landing_page
            }));

            const ws = XLSX.utils.json_to_sheet(exportData);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Munira Leads API");
            XLSX.writeFile(wb, `Munira_Leads_DB_${new Date().toISOString().split('T')[0]}.xlsx`);
        } else {
            alert('Tidak ada data untuk diexport.');
        }
    } catch (err) {
        console.error(err);
        alert('Gagal mengekspor data.');
        document.getElementById('btnExport').innerHTML = '<i class="fas fa-download"></i> Export CSV';
        document.getElementById('btnExport').disabled = false;
    }
});

// MARKETING HUB Settings Logic
const marketingForm = document.getElementById('marketingForm');
async function fetchSettings() {
    try {
        const res = await fetch(`${API_URL}/settings/admin`, { headers: { 'Authorization': 'Bearer ' + authToken } });
        const data = await res.json();
        if (data.success && data.data) {
            document.getElementById('mFbPixel').value = data.data.meta_pixel_id || '';
            document.getElementById('mGa4').value = data.data.ga4_id || '';
            document.getElementById('mTgToken').value = data.data.tg_bot_token || '';
            document.getElementById('mTgChat').value = data.data.tg_chat_id || '';
        }
    } catch (e) { }
}

if (marketingForm) {
    marketingForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const payload = {
            meta_pixel_id: document.getElementById('mFbPixel').value,
            ga4_id: document.getElementById('mGa4').value,
            tg_bot_token: document.getElementById('mTgToken').value,
            tg_chat_id: document.getElementById('mTgChat').value
        };
        try {
            const res = await fetch(`${API_URL}/settings/admin`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + authToken },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            alert(data.message || 'Saved successfully');
        } catch (e) { alert('Error saving configurations'); }
    });
}

// MODAL WA EDITOR Logic
let activeWhatsApp = '';
const waOverlay = document.getElementById('waOverlay');
const waText = document.getElementById('waText');
window.openWaModal = function (leadStr) {
    const L = JSON.parse(decodeURIComponent(leadStr));
    activeWhatsApp = L.whatsapp_num.replace(/[^\d]/g, ''); // sanitize dial string
    if (activeWhatsApp.startsWith('0')) activeWhatsApp = '62' + activeWhatsApp.substring(1);

    const txt = `Assalamu'alaikum Bpk/Ibu ${L.nama_lengkap},\n\nTerima kasih telah mengunjungi halaman Munira World (${L.landing_page || 'Official Site'}).\nKami melihat Anda tertarik dengan program ${L.paket_pilihan || 'Umrah'}.\n\nApakah ada informasi yang bisa kami bantu jelaskan lebih lanjut terkait ketersediaan Seat atau Fasilitas?\n\nSalam Hangat,\nKonsultan Munira World`;
    waText.value = txt;
    waOverlay.classList.add('active');
}

document.getElementById('waClose').addEventListener('click', () => waOverlay.classList.remove('active'));
document.getElementById('waCopy').addEventListener('click', () => { navigator.clipboard.writeText(waText.value); alert('Script copied!'); });

const waAttachLink = document.getElementById('waAttachLink');
if (waAttachLink) {
    waAttachLink.addEventListener('click', () => {
        const link = prompt("Masukkan Link Google Drive atau Website:");
        if (link && link.trim() !== '') {
            waText.value += `\n\nBapak/Ibu juga bisa melihat informasi selengkapnya melalui tautan berikut:\n${link}`;
        }
    });
}
const waAttachPdf = document.getElementById('waAttachPdf');
if (waAttachPdf) {
    waAttachPdf.addEventListener('click', () => {
        const link = prompt("Masukkan Link URL Berkas Brosur PDF:");
        if (link && link.trim() !== '') {
            waText.value += `\n\nUntuk rincian paket selengkapnya, Bapak/Ibu dapat meninjau brosur pada tautan berikut:\n${link}`;
        }
    });
}

document.getElementById('waSend').addEventListener('click', () => {
    const link = `https://wa.me/${activeWhatsApp}?text=${encodeURIComponent(waText.value)}`;
    window.open(link, '_blank');
    waOverlay.classList.remove('active');
});
window.alertWA = function (num) {
    let clean = num.replace(/[^\d]/g, '');
    if (clean.startsWith('0')) clean = '62' + clean.substring(1);
    window.open(`https://wa.me/${clean}`, '_blank');
}

// MODAL EDIT LOGIC
const editOverlay = document.getElementById('editOverlay');
const editForm = document.getElementById('editForm');
const editStatusEl = document.getElementById('editStatus');

// Revenue visibility toggle for edit modal
if (editStatusEl) {
    editStatusEl.addEventListener('change', () => {
        const revGroup = document.getElementById('revenueGroup');
        if (['DP', 'Order Complete'].includes(editStatusEl.value)) {
            revGroup.style.display = 'block';
        } else {
            revGroup.style.display = 'none';
        }
    });
}

// Revenue toggle for manual order modal
const moStatusEl = document.getElementById('moStatus');
if (moStatusEl) {
    moStatusEl.addEventListener('change', () => {
        const g = document.getElementById('moRevenueGroup');
        g.style.display = ['DP', 'Order Complete'].includes(moStatusEl.value) ? 'block' : 'none';
    });
}

// Inline revenue toggle
window.toggleInlineRevenue = function (id) {
    attachRpFormatter(document.getElementById('rev-' + id));
    const sel = document.getElementById('selStatus-' + id);
    const row = document.getElementById('revRow-' + id);
    if (sel && row) {
        row.style.display = ['DP', 'Order Complete'].includes(sel.value) ? 'flex' : 'none';
    }
}

// Programs cache for name lookup
let programsListCache = [];
async function loadProgramsList() {
    try {
        const res = await fetch(`${API_URL}/programs`, { headers: { 'Authorization': `Bearer ${authToken}` } });
        const data = await res.json();
        if (data.success) programsListCache = data.programs || [];
    } catch (e) { /* silent */ }
}

function getProgramName(progId) {
    if (!progId) return '-';
    const p = programsListCache.find(x => x.id === progId);
    return p ? p.nama_program : progId.substring(0, 8);
}

function getProgramSummaryHtml(L) {
    const progId = L.program_id;
    if (!progId) return '';
    const p = programsListCache.find(x => x.id === progId);
    if (!p) return '';

    // Dates format rendering
    const dates = (p.departure_dates || []);
    const datesHtml = dates.length > 0
        ? dates.map(d => `<span style="background:var(--brand-light); color:var(--brand); border-radius:4px; padding:2px 6px; font-size:0.7rem; margin-right:4px; margin-bottom:4px; display:inline-block;">${d.label || 'Tgl'}: ${d.start ? d.start.replace(/-/g, '/').substring(2) : ''} — ${d.end ? d.end.replace(/-/g, '/').substring(2) : ''}</span>`).join('')
        : '<span style="color:var(--text-secondary); font-size:0.7rem;">Tidak ada jadwal</span>';

    // Packages
    const pkgs = (p.packages || []).filter(x => x.price > 0);
    const minPrice = pkgs.length > 0 ? Math.min(...pkgs.map(x => x.price)) : 0;
    const priceStr = minPrice ? `Mulai Rp ${formatRpShort(minPrice)}` : 'Harga belum diatur';

    let pkgOptionsHtml = `<option value="">— Pilih Paket (Opsional) —</option>`;
    pkgs.forEach(pkg => {
        const pkgName = `${pkg.tier} - ${pkg.room_type}`;
        const selected = (L.paket_pilihan === pkgName) ? 'selected' : '';
        pkgOptionsHtml += `<option value="${pkgName}" data-price="${pkg.price}" ${selected}>${pkgName} (Rp ${formatRpShort(pkg.price)})</option>`;
    });

    const packageSelector = pkgs.length > 0 ? `
        <div style="margin-top:8px; border-top:1px dashed var(--border); padding-top:8px;">
            <label style="font-size:0.7rem; font-weight:600; display:block; margin-bottom:4px; color:var(--text-secondary);">Pilih Paket Khusus untuk Lead ini:</label>
            <select id="selPkg-${L.id}" class="select-base" style="width:100%; font-size:0.75rem; padding:4px;" onchange="handlePackageSelect('${L.id}')">
                ${pkgOptionsHtml}
            </select>
        </div>
    ` : '';

    return `
        <div style="margin-top:6px; padding:8px 10px; background:var(--bg-app); border:1px solid var(--border); border-radius:6px; font-size:0.75rem;">
            <div style="font-weight:600; color:var(--text-primary); margin-bottom:4px; display:flex; align-items:center; justify-content:space-between;">
                <span><i class="fas fa-cube" style="color:var(--brand); margin-right:4px;"></i> ${p.nama_program}</span>
                <span style="color:#F59E0B; font-weight:700;">${priceStr}</span>
            </div>
            <div style="color:var(--text-secondary); line-height:1.4;">${p.deskripsi ? p.deskripsi : ''}</div>
            <div style="margin-top:6px;">${datesHtml}</div>
            ${packageSelector}
        </div>
    `;
}

function populateProgramSelects(selectedId) {
    const selectors = document.querySelectorAll('#editProgram, #moProgram');
    selectors.forEach(sel => {
        const currentVal = sel.value || selectedId || '';
        const first = sel.querySelector('option:first-child');
        sel.innerHTML = '';
        const opt0 = document.createElement('option');
        opt0.value = '';
        opt0.textContent = '— Belum dipilih —';
        sel.appendChild(opt0);
        programsListCache.forEach(p => {
            const opt = document.createElement('option');
            opt.value = p.id;
            opt.textContent = p.nama_program;
            if (p.id === currentVal) opt.selected = true;
            sel.appendChild(opt);
        });
    });
}

window.openEditModal = async function (id, status, notes, revenue, programId) {
    await loadProgramsList();
    document.getElementById('editId').value = id;
    document.getElementById('editStatus').value = status;
    document.getElementById('editCatatan').value = notes || '';
    const revEl = document.getElementById('editRevenue');
    attachRpFormatter(revEl);
    setRpInput(revEl, revenue);
    document.getElementById('revenueGroup').style.display = ['DP', 'Order Complete'].includes(status) ? 'block' : 'none';
    populateProgramSelects(programId);
    if (programId) document.getElementById('editProgram').value = programId;
    editOverlay.classList.add('active');
}
document.getElementById('editClose').addEventListener('click', () => editOverlay.classList.remove('active'));

if (editForm) {
    editForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('editId').value;
        const status = document.getElementById('editStatus').value;
        const notes = document.getElementById('editCatatan').value;
        const revenue = parseRpInput(document.getElementById('editRevenue').value);
        const program_id = document.getElementById('editProgram').value;

        try {
            const res = await fetch(`${API_URL}/leads/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + authToken },
                body: JSON.stringify({ status_followup: status, catatan: notes, revenue, program_id })
            });
            const data = await res.json();
            if (data.success) {
                editOverlay.classList.remove('active');
                fetchDashboardData();
            } else {
                alert('Update gagal: ' + data.message);
            }
        } catch (err) {
            alert('Server error.');
        }
    });
}

// MANUAL ORDER LOGIC
document.getElementById('btnManualOrder')?.addEventListener('click', async () => {
    await loadProgramsList();
    populateProgramSelects('');
    attachRpFormatter(document.getElementById('moRevenue'));
    document.getElementById('manualOrderOverlay').classList.add('active');
});
document.getElementById('manualOrderClose')?.addEventListener('click', () => {
    document.getElementById('manualOrderOverlay').classList.remove('active');
});

document.getElementById('manualOrderForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
        nama_lengkap: document.getElementById('moNama').value.trim(),
        whatsapp_num: document.getElementById('moWA').value.trim(),
        domisili: document.getElementById('moDomisili').value.trim(),
        yang_berangkat: document.getElementById('moBerangkat').value.trim(),
        paket_pilihan: document.getElementById('moPaket').value.trim(),
        kesiapan_paspor: document.getElementById('moPaspor').value,
        status_followup: document.getElementById('moStatus').value,
        revenue: parseRpInput(document.getElementById('moRevenue').value),
        program_id: document.getElementById('moProgram').value,
        catatan: document.getElementById('moCatatan').value.trim()
    };

    try {
        const res = await fetch(`${API_URL}/leads/manual`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + authToken },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.success) {
            document.getElementById('manualOrderOverlay').classList.remove('active');
            document.getElementById('manualOrderForm').reset();
            fetchDashboardData();
            alert('Order berhasil ditambahkan!');
        } else {
            alert('Gagal: ' + data.message);
        }
    } catch (err) {
        alert('Server error.');
    }
});

// UTILS
function formatLpName(lpPath) {
    if (!lpPath || lpPath.trim() === '') return 'Organic';
    // Convert 'lp-bakti-anak' -> 'Bakti Anak', '/lp-itikaf/index.html' -> 'Itikaf'
    let name = lpPath.replace(/^\//, '').replace(/\/index.*\.html$/i, '').replace(/^lp-/, '');
    return name.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') || lpPath;
}

function formatDate(dateString) {
    if (!dateString) return '-';
    const d = new Date(dateString);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yy = String(d.getFullYear()).slice(-2);
    const hr = String(d.getHours()).padStart(2, '0');
    const mn = String(d.getMinutes()).padStart(2, '0');
    return `${dd}/${mm}/${yy} ${hr}:${mn}`;
}

function timeAgo(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000);

    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 2592000) return `${Math.floor(diff / 86400)}d ago`;
    return 'Older';
}

// INLINE TABLE LOGIC & ACCORDION
window.toggleAccordion = function (id) {
    const row = document.getElementById('acc-' + id);
    if (row) row.classList.toggle('expanded');
}

window.handleProgramChange = function (id) {
    const progSel = document.getElementById('selProg-' + id);
    const summaryDiv = document.getElementById('progSummary-' + id);
    if (progSel && summaryDiv) {
        // Mock L object just to render the summary and packages
        const fakeL = { id: id, program_id: progSel.value, paket_pilihan: '' };
        summaryDiv.innerHTML = progSel.value ? getProgramSummaryHtml(fakeL) : '';
    }
}

window.updateLeadStatus = async function (id) {
    const status = document.getElementById('selStatus-' + id).value;
    const notesInput = document.getElementById('note-' + id);
    const notes = notesInput.value.trim();
    const revInput = document.getElementById('rev-' + id);
    const revenue = revInput ? parseRpInput(revInput.value) : undefined;

    try {
        const payload = { status_followup: status };
        if (notes) payload.catatan = notes;
        if (revenue !== undefined) payload.revenue = revenue;
        const progSel = document.getElementById('selProg-' + id);
        if (progSel && progSel.value !== undefined) payload.program_id = progSel.value;
        const pkgSel = document.getElementById('selPkg-' + id);
        if (pkgSel) payload.paket_pilihan = pkgSel.value;

        const res = await fetch(`${API_URL}/leads/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + authToken },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.success) {
            notesInput.value = '';
            fetchDashboardData();
        } else {
            alert('Update gagal: ' + data.message);
        }
    } catch (err) {
        alert('Server error saving data.');
    }
}

window.handlePackageSelect = function (id) {
    const pkgSel = document.getElementById('selPkg-' + id);
    if (!pkgSel) return;
    const option = pkgSel.options[pkgSel.selectedIndex];
    const price = option ? option.getAttribute('data-price') : null;

    if (price) {
        const revInput = document.getElementById('rev-' + id);
        if (revInput) {
            // Un-hide revenue row since they are selecting a priced package
            const revRow = document.getElementById('revRow-' + id);
            if (revRow) revRow.style.display = 'flex';

            attachRpFormatter(revInput);
            setRpInput(revInput, price);
        }
    }
}

window.sendWAtpl = function (leadStr, type) {
    const L = JSON.parse(decodeURIComponent(leadStr));
    let clean = L.whatsapp_num.replace(/[^\d]/g, '');
    if (clean.startsWith('0')) clean = '62' + clean.substring(1);

    activeWhatsApp = clean; // store for WA Editor Modal

    const linkInput = document.getElementById('waLink-' + L.id).value.trim();
    let attachmentText = linkInput ? `\n\nBapak/Ibu juga bisa melihat brosur/informasi lebih lengkap melalui tautan Drive berikut:\n${linkInput}` : '';

    let template = '';
    if (type === 1) {
        template = `Assalamu'alaikum Bpk/Ibu ${L.nama_lengkap || ''}, saya Konsultan Munira World. Terkait ketertarikan Anda pada paket ${L.paket_pilihan || 'Umrah'}, apakah ada informasi brosur atau jadwal yang bisa kami kirimkan?`;
    } else if (type === 2) {
        template = `Assalamu'alaikum Bpk/Ibu ${L.nama_lengkap || ''}, terkait kesiapan ${L.kesiapan_paspor === 'Belum ada' ? 'pembuatan paspor baru' : 'paspor Anda'}, tim kami siap membantu mendampingi. Apakah ada waktu luang untuk berdiskusi?`;
    } else if (type === 3) {
        template = `Assalamu'alaikum Bpk/Ibu ${L.nama_lengkap || ''}, sekadar menyapa dan mengingatkan untuk rencana ibadah umrahnya. Kuota kami bulan ini semakin terbatas, kabari kami bila berminat untuk lock seat ya.`;
    }

    const txt = template + attachmentText;

    // Instead of sending immediately, preview it via WA Modal
    waText.value = txt;
    waOverlay.classList.add('active');
}

// ============================================================
// PROGRAM BUILDER
// ============================================================

const TIERS = ['bronze', 'silver', 'gold'];
const ROOMS = ['quad', 'double', 'triple'];

const pbOverlay = document.getElementById('pbOverlay');
const pbForm = document.getElementById('pbForm');

function pbOpenOverlay() {
    pbOverlay.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}
function pbCloseOverlay() {
    pbOverlay.style.display = 'none';
    document.body.style.overflow = '';
}

document.getElementById('pbClose')?.addEventListener('click', pbCloseOverlay);
document.getElementById('pbCancelBtn')?.addEventListener('click', pbCloseOverlay);
pbOverlay?.addEventListener('click', (e) => { if (e.target === pbOverlay) pbCloseOverlay(); });

// Departure date rows
function pbAddDateRow(val = { label: '', start: '', end: '' }) {
    const c = document.getElementById('pbDatesContainer');
    const div = document.createElement('div');
    div.className = 'pb-date-row';
    div.style.cssText = 'display:grid; grid-template-columns:2fr 1fr 1fr auto; gap:8px; align-items:center;';
    div.innerHTML = `
        <input type="text" placeholder="Label (mis: Maret 2026, Ramadhan Waw...)" value="${val.label || ''}"
            class="select-base pb-date-label" style="width:100%; font-size:0.8rem;">
        <input type="date" value="${val.start || ''}" class="select-base pb-date-start" style="width:100%; font-size:0.8rem;">
        <input type="date" value="${val.end || ''}" class="select-base pb-date-end" style="width:100%; font-size:0.8rem;">
        <button type="button" style="background:var(--danger-light); color:var(--danger); border:none; border-radius:8px; width:32px; height:32px; cursor:pointer; display:flex; align-items:center; justify-content:center;" onclick="this.parentElement.remove()">
            <i class="fas fa-trash" style="font-size:0.7rem;"></i>
        </button>`;
    c.appendChild(div);
}

document.getElementById('pbAddDate')?.addEventListener('click', () => pbAddDateRow());

function pbGetDates() {
    const rows = document.querySelectorAll('#pbDatesContainer .pb-date-row');
    return Array.from(rows).map(r => ({
        label: r.querySelector('.pb-date-label').value.trim(),
        start: r.querySelector('.pb-date-start').value,
        end: r.querySelector('.pb-date-end').value
    })).filter(d => d.label || d.start);
}

function pbGetPackages() {
    const pkgs = [];
    TIERS.forEach(t => ROOMS.forEach(r => {
        const val = parseRpInput(document.getElementById(`price-${t}-${r}`)?.value);
        pkgs.push({ tier: t, room_type: r, price: val });
    }));
    return pkgs;
}

function pbResetForm() {
    document.getElementById('pbId').value = '';
    document.getElementById('pbModalTitle').textContent = 'Buat Program Baru';
    document.getElementById('pbNama').value = '';
    document.getElementById('pbPoster').value = '';
    document.getElementById('pbDeskripsi').value = '';
    document.getElementById('pbLanding').value = '';
    document.getElementById('pbOrder').value = '0';
    document.getElementById('pbActive').value = '1';
    document.getElementById('pbDatesContainer').innerHTML = '';
    TIERS.forEach(t => ROOMS.forEach(r => {
        const el = document.getElementById(`price-${t}-${r}`);
        if (el) { el.value = ''; attachRpFormatter(el); }
    }));
}

function pbFillForm(p) {
    document.getElementById('pbId').value = p.id;
    document.getElementById('pbModalTitle').textContent = 'Edit Program';
    document.getElementById('pbNama').value = p.nama_program || '';
    document.getElementById('pbPoster').value = p.poster_url || '';
    document.getElementById('pbDeskripsi').value = p.deskripsi || '';
    document.getElementById('pbLanding').value = p.landing_url || '';
    document.getElementById('pbOrder').value = p.sort_order ?? 0;
    document.getElementById('pbActive').value = p.is_active ? '1' : '0';
    document.getElementById('pbDatesContainer').innerHTML = '';
    (p.departure_dates || []).forEach(d => pbAddDateRow(d));
    TIERS.forEach(t => ROOMS.forEach(r => {
        const pkg = (p.packages || []).find(x => x.tier === t && x.room_type === r);
        const el = document.getElementById(`price-${t}-${r}`);
        if (el) { attachRpFormatter(el); setRpInput(el, pkg ? pkg.price : 0); }
    }));
}

// Keep formatRp for backward compat — now delegates to formatRpShort
function formatRp(n) {
    if (!n || n === 0) return '–';
    return 'Rp ' + formatRpShort(n);
}

function pbRenderCard(p) {
    const isActive = p.is_active;
    const dates = (p.departure_dates || []);
    const pkgs = (p.packages || []);

    const datesHtml = dates.length > 0
        ? dates.map(d => `<span style="display:inline-block; background:var(--brand-light); color:var(--brand); border-radius:20px; padding:3px 10px; font-size:0.72rem; margin:2px;">${d.label || ''} ${d.start ? d.start.replace(/-/g, '/').substring(2) : ''} - ${d.end ? d.end.replace(/-/g, '/').substring(2) : ''}</span>`).join('')
        : '<span style="color:var(--text-secondary); font-size:0.78rem;">Belum ada jadwal</span>';

    const priceRows = ROOMS.map(room => {
        const cells = TIERS.map(tier => {
            const pkg = pkgs.find(x => x.tier === tier && x.room_type === room);
            const price = pkg ? pkg.price : 0;
            return `<td style="text-align:center; padding:6px 10px; font-size:0.8rem; font-weight:${price ? '600' : '400'}; color:${price ? 'var(--text-primary)' : 'var(--text-secondary)'};">${formatRp(price)}</td>`;
        }).join('');
        return `<tr><td style="padding:6px 10px; font-size:0.8rem; font-weight:600; color:var(--text-secondary);">${room.charAt(0).toUpperCase() + room.slice(1)}</td>${cells}</tr>`;
    }).join('');

    const poster = p.poster_url
        ? `<img src="${p.poster_url}" alt="Poster" style="width:80px; height:80px; object-fit:cover; border-radius:10px; flex-shrink:0;" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
           <div style="display:none; width:80px; height:80px; border-radius:10px; background:var(--brand-light); align-items:center; justify-content:center; flex-shrink:0;"><i class="fas fa-image" style="color:var(--brand); font-size:1.5rem; opacity:0.5;"></i></div>`
        : `<div style="width:80px; height:80px; border-radius:10px; background:var(--brand-light); display:flex; align-items:center; justify-content:center; flex-shrink:0;"><i class="fas fa-image" style="color:var(--brand); font-size:1.5rem; opacity:0.5;"></i></div>`;

    return `
    <div style="background:var(--bg-card); backdrop-filter:var(--glass-blur); border:1px solid var(--border); border-radius:var(--radius-md); padding:20px; transition:box-shadow 0.2s;">
        <div style="display:flex; gap:16px; align-items:flex-start;">
            ${poster}
            <div style="flex:1; min-width:0;">
                <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:8px;">
                    <div>
                        <h3 style="font-size:1rem; font-weight:700; margin-bottom:2px;">${p.nama_program}</h3>
                        <span style="font-size:0.75rem; background:${isActive ? 'var(--success-light)' : 'var(--danger-light)'}; color:${isActive ? 'var(--success)' : 'var(--danger)'}; border-radius:20px; padding:2px 10px;">${isActive ? '🟢 Aktif' : '🔴 Nonaktif'}</span>
                    </div>
                    <div style="display:flex; gap:8px; flex-shrink:0;">
                        <button class="btn-mini btn-outline" onclick="pbEditProgram('${p.id}')"><i class="fas fa-pen"></i> Edit</button>
                        <button class="btn-mini" style="background:var(--danger-light); color:var(--danger); border:none; border-radius:8px; padding:6px 12px; cursor:pointer; font-size:0.75rem;" onclick="pbDeleteProgram('${p.id}', '${p.nama_program.replace(/'/g, "\\'")}')"><i class="fas fa-trash"></i></button>
                    </div>
                </div>
                ${p.deskripsi ? `<p style="font-size:0.8rem; color:var(--text-secondary); margin-top:6px;">${p.deskripsi}</p>` : ''}

                <div style="margin-top:10px; margin-bottom:8px;">
                    <small style="color:var(--text-secondary); font-size:0.72rem; font-weight:600; text-transform:uppercase; letter-spacing:1px;">📅 Tanggal Keberangkatan</small><br>
                    <div style="margin-top:4px;">${datesHtml}</div>
                </div>
            </div>
        </div>

        <!-- Pricing Matrix -->
        <div style="margin-top:14px; border-top:1px solid var(--border); padding-top:12px; overflow-x:auto;">
            <small style="color:var(--text-secondary); font-size:0.72rem; font-weight:600; text-transform:uppercase; letter-spacing:1px; display:block; margin-bottom:8px;">💰 Harga Paket</small>
            <table style="width:100%; border-collapse:collapse; font-size:0.8rem;">
                <thead>
                    <tr style="background:rgba(0,0,0,0.2);">
                        <th style="padding:6px 10px; text-align:left; color:var(--text-secondary); font-size:0.72rem;">Kamar</th>
                        <th style="padding:6px 10px; text-align:center; color:#CD7F32; font-size:0.72rem;">🥉 Bronze</th>
                        <th style="padding:6px 10px; text-align:center; color:#C0C0C0; font-size:0.72rem;">🥈 Silver</th>
                        <th style="padding:6px 10px; text-align:center; color:#FFD700; font-size:0.72rem;">🥇 Gold</th>
                    </tr>
                </thead>
                <tbody>${priceRows}</tbody>
            </table>
        </div>

        <!-- Lead count badge -->
        <div style="margin-top:10px; border-top:1px solid var(--border); padding-top:8px;">
            <small style="color:var(--text-secondary); font-size:0.75rem;"><i class="fas fa-users" style="margin-right:4px;"></i>${(allLeads.filter(l => l.program_id === p.id)).length} lead terdaftar ke program ini</small>
            ${p.landing_url ? `<a href="${p.landing_url}" target="_blank" style="margin-left:12px; font-size:0.75rem; color:var(--brand);"><i class="fas fa-external-link-alt"></i> Landing Page</a>` : ''}
        </div>
    </div>`;
}

async function fetchProgramBuilder() {
    try {
        const res = await fetch(`${API_URL}/programs`, { headers: { 'Authorization': `Bearer ${authToken}` } });
        const data = await res.json();
        if (!data.success) return;

        // Also update programsListCache for dropdowns
        programsListCache = data.programs || [];

        const list = document.getElementById('programBuilderList');
        const empty = document.getElementById('programBuilderEmpty');
        if (!data.programs.length) {
            list.innerHTML = '';
            empty.style.display = 'block';
        } else {
            empty.style.display = 'none';
            list.innerHTML = data.programs.map(p => pbRenderCard(p)).join('');
        }
    } catch (e) {
        console.error('fetchProgramBuilder error:', e);
    }
}

document.getElementById('btnCreateProgram')?.addEventListener('click', () => {
    pbResetForm();
    pbOpenOverlay();
    // formatters already attached in pbResetForm
});

window.pbEditProgram = async function (id) {
    try {
        const res = await fetch(`${API_URL}/programs/${id}`, { headers: { 'Authorization': `Bearer ${authToken}` } });
        const data = await res.json();
        if (data.success) {
            pbFillForm(data.program);
            pbOpenOverlay();
            // formatters already attached in pbFillForm
        }
    } catch (e) { console.error(e); }
};

window.pbDeleteProgram = async function (id, name) {
    if (!confirm(`Hapus program "${name}"? Semua lead yang terhubung ke program ini akan tetap ada.`)) return;
    try {
        const res = await fetch(`${API_URL}/programs/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        const data = await res.json();
        if (data.success) fetchProgramBuilder();
        else alert('Gagal hapus: ' + data.message);
    } catch (e) { alert('Error menghapus program.'); }
};

pbForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('pbId').value;
    const payload = {
        nama_program: document.getElementById('pbNama').value.trim(),
        poster_url: document.getElementById('pbPoster').value.trim(),
        deskripsi: document.getElementById('pbDeskripsi').value.trim(),
        landing_url: document.getElementById('pbLanding').value.trim(),
        sort_order: parseInt(document.getElementById('pbOrder').value) || 0,
        is_active: document.getElementById('pbActive').value === '1',
        departure_dates: pbGetDates(),
        packages: pbGetPackages()
    };
    if (!payload.nama_program) { alert('Nama program wajib diisi'); return; }

    const submitBtn = pbForm.querySelector('[type=submit]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Menyimpan...';

    try {
        const url = id ? `${API_URL}/programs/${id}` : `${API_URL}/programs`;
        const method = id ? 'PUT' : 'POST';
        const res = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.success) {
            pbCloseOverlay();
            fetchProgramBuilder();
        } else {
            alert('Gagal: ' + data.message);
        }
    } catch (err) {
        alert('Server error.');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-save"></i> Simpan Program';
    }
});
