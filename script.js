/**
 * SpeedPaw — script.js v0.2
 * ─────────────────────────
 * Architecture:
 *  - Lightweight hash-based SPA router (no frameworks)
 *  - Simulated speed-test engine (v0.1 placeholder — replace with real backend in v0.2)
 *  - Video quality test simulation
 *  - Screen resolution detection (real browser APIs)
 *  - Mascot expression engine
 *  - Dark/Light theme persistence
 *  - History persistence via localStorage
 *
 * FUTURE HOOKS (v0.2 backend):
 *  - Replace `runTestSimulation()` body with real XMLHttpRequest/WebSocket speed measurement
 *  - Replace `MOCK_ISP`, `MOCK_IP`, `MOCK_LOC` with IP geolocation API calls
 *  - Replace `runVideoTestSimulation()` with real bandwidth measurement per bitrate
 */

document.addEventListener('DOMContentLoaded', () => {

    // ══════════════════════════════════════════════════════════
    // ELEMENT REFS
    // ══════════════════════════════════════════════════════════

    // Theme
    const themeToggle       = document.getElementById('theme-toggle');

    // Mobile menu
    const mobileMenuBtn     = document.getElementById('mobile-menu-btn');
    const headerNav         = document.getElementById('header-nav');

    // Nav links for active state
    const navLinks          = document.querySelectorAll('.nav-link[data-route]');

    // Views
    const viewSpeedTest     = document.getElementById('view-speed-test');
    const viewVideoTest     = document.getElementById('view-video-test');
    const viewScreenRes     = document.getElementById('view-screen-res');

    // Speed test elements
    const testArea          = document.getElementById('test-area');
    const primaryBtn        = document.getElementById('primary-btn');
    const btnText           = primaryBtn.querySelector('.btn-text');

    const currentSpeedEl    = document.getElementById('current-speed');
    const currentUnitEl     = document.getElementById('current-unit');
    const phaseText         = document.getElementById('phase-text');
    const gaugeArc          = document.getElementById('gauge-arc');

    const valDlMobile       = document.getElementById('val-dl-mobile');
    const valUl             = document.getElementById('val-ul');
    const valPing           = document.getElementById('val-ping');
    const valJitter         = document.getElementById('val-jitter');

    const cqValue           = document.getElementById('cq-value');
    const cqDesc            = document.getElementById('cq-desc');
    const cqBars            = document.querySelectorAll('.cq-bars .bar');
    const valIp             = document.getElementById('val-ip');
    const valTime           = document.getElementById('val-time');

    const serverStatusText  = document.getElementById('server-status-text');
    const serverLocation    = document.getElementById('server-location');

    const catStatusMsg      = document.getElementById('cat-status-msg');

    const progressWrap      = document.getElementById('progress-wrap');
    const progressBar       = document.getElementById('progress-bar');

    // Smart results
    const smartResults      = document.getElementById('smart-results');
    const srStream          = document.getElementById('sr-stream');
    const srVideo           = document.getElementById('sr-video');
    const srGaming          = document.getElementById('sr-gaming');
    const srBrowsing        = document.getElementById('sr-browsing');
    const sr4k              = document.getElementById('sr-4k');

    // Mascot SVG
    const catMouth          = document.getElementById('cat-mouth');
    const eyeL              = document.getElementById('eye-l');
    const eyeR              = document.getElementById('eye-r');
    const chestLed          = document.getElementById('chest-led');

    // Video test elements
    const btnVideoTest      = document.getElementById('btn-video-test');
    const vtStatus          = document.getElementById('vt-status');
    const vtDesc            = document.getElementById('vt-desc');
    const vtProgressWrap    = document.getElementById('vt-progress-wrap');
    const vtProgressBar     = document.getElementById('vt-progress-bar');

    // ══════════════════════════════════════════════════════════
    // STATE
    // ══════════════════════════════════════════════════════════
    let isTesting       = false;
    let isVideoTesting  = false;

    const ARC_LEN       = 345.4; // SVG gauge arc circumference

    // ── Mock Data (FUTURE: replace with IP geolocation API) ──
    const MOCK_ISP      = 'SpeedPaw Fiber';
    const MOCK_IP       = '198.51.100.42'; // RFC 5737 documentation range — clearly fake
    const MOCK_LOC      = 'London, UK';

    // ══════════════════════════════════════════════════════════
    // THEME
    // ══════════════════════════════════════════════════════════
    let theme = localStorage.getItem('sp_theme') ||
        (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    applyTheme(theme);

    themeToggle.addEventListener('click', () => {
        theme = theme === 'dark' ? 'light' : 'dark';
        applyTheme(theme);
        localStorage.setItem('sp_theme', theme);
    });

    function applyTheme(t) {
        document.documentElement.setAttribute('data-theme', t);
    }

    // ══════════════════════════════════════════════════════════
    // MOBILE MENU
    // ══════════════════════════════════════════════════════════
    mobileMenuBtn.addEventListener('click', () => {
        const open = headerNav.classList.toggle('mobile-open');
        mobileMenuBtn.setAttribute('aria-expanded', open);
    });

    // Inject mobile nav styles via JS to avoid conflicting with CSS media query
    const mobileNavStyle = document.createElement('style');
    mobileNavStyle.textContent = `
        .header-nav.mobile-open {
            display: flex !important;
            flex-direction: column;
            position: absolute;
            top: 70px;
            left: 0;
            right: 0;
            background: var(--bg-panel);
            padding: 1rem 1.5rem;
            border-bottom: 1px solid var(--border);
            z-index: 999;
            gap: 0;
        }
        .header-nav.mobile-open .nav-link { padding: 1rem 0; border-bottom: 1px solid var(--border); }
        .header-nav.mobile-open .nav-dropdown .dropdown-content { display: block; position: static; transform: none; box-shadow: none; border: none; padding-left: 1rem; }
        @media (min-width: 769px) { .header-nav { display: flex !important; } }
    `;
    document.head.appendChild(mobileNavStyle);

    // ══════════════════════════════════════════════════════════
    // SPA HASH ROUTER
    // ══════════════════════════════════════════════════════════
    const VIEWS = {
        '/'             : viewSpeedTest,
        '/video-test'   : viewVideoTest,
        '/screen-res'   : viewScreenRes,
    };

    function getRoute() {
        const hash = window.location.hash.replace('#', '') || '/';
        // Normalise any query/fragment
        return hash.split('?')[0] || '/';
    }

    function navigateTo(route) {
        // Hide all views
        Object.values(VIEWS).forEach(v => { if (v) v.hidden = true; });

        // Show target view
        const target = VIEWS[route] || VIEWS['/'];
        if (target) target.hidden = false;

        // Update active nav link
        navLinks.forEach(link => {
            const linkRoute = link.getAttribute('data-route') || '/';
            link.classList.toggle('active', linkRoute === route);
        });

        // Run view-specific init
        if (route === '/screen-res') detectScreenInfo();

        // Close mobile menu
        headerNav.classList.remove('mobile-open');

        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    window.addEventListener('hashchange', () => navigateTo(getRoute()));
    // Initial load
    navigateTo(getRoute());

    // ══════════════════════════════════════════════════════════
    // UTILITIES
    // ══════════════════════════════════════════════════════════
    const sleep   = ms => new Promise(r => setTimeout(r, ms));
    const easeOut = t  => t * (2 - t);

    function setGauge(value, max) {
        const pct    = Math.min(value / max, 1);
        const visual = Math.pow(pct, 0.55);
        gaugeArc.style.strokeDashoffset = ARC_LEN - visual * ARC_LEN;
    }

    function setProgress(pct) {
        progressBar.style.width = Math.min(pct, 100) + '%';
    }

    function setState(state) {
        testArea.dataset.state = state;
    }

    function formatTime(date) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    // ══════════════════════════════════════════════════════════
    // MASCOT EXPRESSION ENGINE
    // ══════════════════════════════════════════════════════════

    /**
     * Mascot states control:
     *   - eyePath: SVG path `d` attribute for the arc-shaped eyes (↑ = happy, - = neutral, ↓ = concerned)
     *   - mouth: SVG path `d` for the mouth curve
     *   - ledColor: fill color for chest LED
     *   - status: message shown below the cat on mobile
     *   - cq/cqDesc/bars: connection quality box values
     */
    // Mascot state definitions
    // eyeL: left eye path  (left eye  cx: 44–62, cy centred at 99)
    // eyeR: right eye path (right eye cx: 98–116, cy centred at 99 — same shape, offset +54)
    const MASCOT_STATES = {
        idle: {
            eyeL    : 'M 44,101 Q 53,88 62,101',   // happy arc
            eyeR    : 'M 98,101 Q 107,88 116,101',
            mouth   : 'M72,126 Q80,124 88,126',
            ledColor: '#3b82f6',
            status  : 'Ready to sniff out your speed?',
            cq: 'Ready', cqDesc: 'Press Start Test to begin.', bars: 0
        },
        connecting: {
            eyeL    : 'M 44,96 Q 53,96 62,96',     // straight / curious
            eyeR    : 'M 98,96 Q 107,96 116,96',
            mouth   : 'M74,126 Q80,127 86,126',
            ledColor: '#f59e0b',
            status  : 'Finding the best server...',
            cq: 'Connecting', cqDesc: 'Looking for optimal server.', bars: 1
        },
        ping: {
            eyeL    : 'M 44,97 Q 53,92 62,97',     // slightly alert
            eyeR    : 'M 98,97 Q 107,92 116,97',
            mouth   : 'M74,126 Q80,127 86,126',
            ledColor: '#22d3ee',
            status  : 'Measuring your ping...',
            cq: 'Testing Ping', cqDesc: 'Checking latency to server.', bars: 1
        },
        dl: {
            eyeL    : 'M 44,98 Q 53,89 62,98',     // focused
            eyeR    : 'M 98,98 Q 107,89 116,98',
            mouth   : 'M72,125 Q80,128 88,125',
            ledColor: '#3b82f6',
            status  : 'Measuring download speed...',
            cq: 'Download', cqDesc: 'Measuring download bandwidth.', bars: 2
        },
        ul: {
            eyeL    : 'M 44,98 Q 53,90 62,98',
            eyeR    : 'M 98,98 Q 107,90 116,98',
            mouth   : 'M72,126 Q80,129 88,126',
            ledColor: '#8b5cf6',
            status  : 'Measuring upload speed...',
            cq: 'Upload', cqDesc: 'Measuring upload bandwidth.', bars: 3
        },
        excellent: {
            eyeL    : 'M 44,103 Q 53,86 62,103',   // big happy
            eyeR    : 'M 98,103 Q 107,86 116,103',
            mouth   : 'M70,124 Q80,131 90,124',
            ledColor: '#10b981',
            status  : "Blimey, that's fast! 🚀",
            cq: 'Excellent', cqDesc: 'Perfect for 4K, gaming & more.', bars: 4
        },
        good: {
            eyeL    : 'M 44,101 Q 53,88 62,101',
            eyeR    : 'M 98,101 Q 107,88 116,101',
            mouth   : 'M71,125 Q80,129 89,125',
            ledColor: '#3b82f6',
            status  : 'Solid connection! 😸',
            cq: 'Good', cqDesc: 'Good for HD streaming & browsing.', bars: 3
        },
        average: {
            eyeL    : 'M 44,97 Q 53,93 62,97',     // thoughtful
            eyeR    : 'M 98,97 Q 107,93 116,97',
            mouth   : 'M74,126 Q80,127 86,126',
            ledColor: '#f59e0b',
            status  : "Decent, but there's room to improve.",
            cq: 'Average', cqDesc: 'May buffer on high-res video.', bars: 2
        },
        poor: {
            eyeL    : 'M 44,94 Q 53,101 62,94',    // concerned, down arc
            eyeR    : 'M 98,94 Q 107,101 116,94',
            mouth   : 'M72,128 Q80,124 88,128',
            ledColor: '#ef4444',
            status  : "That's a slow connection... 😿",
            cq: 'Poor', cqDesc: 'May cause slow loading or buffering.', bars: 1
        },
        error: {
            eyeL    : 'M 44,93 Q 53,101 62,93',
            eyeR    : 'M 98,93 Q 107,101 116,93',
            mouth   : 'M72,129 Q80,124 88,129',
            ledColor: '#ef4444',
            status  : 'Something went wrong. Try again.',
            cq: 'Error', cqDesc: 'Could not complete the test.', bars: 0
        }
    };

    function setMascot(stateName) {
        const s = MASCOT_STATES[stateName];
        if (!s) return;

        if (eyeL)     eyeL.setAttribute('d', s.eyeL);
        if (eyeR)     eyeR.setAttribute('d', s.eyeR);
        if (catMouth) catMouth.setAttribute('d', s.mouth);
        if (chestLed) chestLed.setAttribute('fill', s.ledColor);
        if (catStatusMsg) catStatusMsg.textContent = s.status;

        // Update CQ box
        if (cqValue)  cqValue.textContent  = s.cq;
        if (cqDesc)   cqDesc.textContent   = s.cqDesc;

        const colorMap = { 'Excellent': 'var(--success)', 'Good': 'var(--accent)', 'Average': 'var(--warning)', 'Poor': 'var(--danger)', 'Error': 'var(--danger)' };
        if (cqValue) cqValue.style.color = colorMap[s.cq] || 'var(--text-muted)';

        cqBars.forEach((bar, i) => {
            bar.classList.toggle('full', i < s.bars);
        });
    }

    // ══════════════════════════════════════════════════════════
    // SMART RESULTS ENGINE
    // ══════════════════════════════════════════════════════════

    /** Approximate thresholds (informational only, not guaranteed accuracy) */
    const SMART_THRESHOLDS = {
        streaming : [{ min: 25, label: 'Excellent' }, { min: 8, label: 'Good' }, { min: 3, label: 'Average' }, { min: 0, label: 'Poor' }],
        video     : [{ min: 20, label: 'Excellent' }, { min: 10, label: 'Good' }, { min: 5, label: 'Average' }, { min: 0, label: 'Poor' }],
        gaming    : [{ min: 50, label: 'Excellent' }, { min: 20, label: 'Good' }, { min: 10, label: 'Average' }, { min: 0, label: 'Poor' }],
        browsing  : [{ min: 10, label: 'Excellent' }, { min: 5, label: 'Good' }, { min: 1, label: 'Average' }, { min: 0, label: 'Poor' }],
        fourK     : [{ min: 50, label: 'Supported' }, { min: 25, label: 'Marginal' }, { min: 0, label: 'Not Ideal' }],
    };

    function getLabel(thresholds, value) {
        for (const t of thresholds) {
            if (value >= t.min) return t.label;
        }
        return 'Poor';
    }

    function applySmartLabel(el, label) {
        if (!el) return;
        el.textContent = label;
        el.className = 'smart-val';
        const cls = { 'Excellent': 'excellent', 'Supported': 'excellent', 'Good': 'good', 'Marginal': 'fair', 'Average': 'fair', 'Not Ideal': 'poor', 'Poor': 'poor' }[label] || '';
        if (cls) el.classList.add(cls);
    }

    function showSmartResults(results) {
        if (!smartResults) return;
        smartResults.hidden = false;

        applySmartLabel(srStream,   getLabel(SMART_THRESHOLDS.streaming, results.download));
        applySmartLabel(srVideo,    getLabel(SMART_THRESHOLDS.video,     results.download));
        applySmartLabel(srGaming,   getLabel(SMART_THRESHOLDS.gaming,    results.download));
        applySmartLabel(srBrowsing, getLabel(SMART_THRESHOLDS.browsing,  results.download));
        applySmartLabel(sr4k,       getLabel(SMART_THRESHOLDS.fourK,     results.download));
    }

    // ══════════════════════════════════════════════════════════
    // SPEED TEST SIMULATION ENGINE
    // ══════════════════════════════════════════════════════════

    function resetSpeedUI() {
        [valDlMobile, valUl, valPing, valJitter].forEach(el => { if (el) el.textContent = '--'; });
        if (currentSpeedEl)  currentSpeedEl.textContent = '0.0';
        if (currentUnitEl)   currentUnitEl.textContent  = 'Mbps';
        if (phaseText)       phaseText.textContent       = 'SPEED TEST';
        if (gaugeArc)        gaugeArc.style.strokeDashoffset = ARC_LEN;
        if (serverLocation)  serverLocation.textContent  = MOCK_LOC;
        if (valIp)           valIp.textContent           = '--';
        if (valTime)         valTime.textContent         = '--';
        if (progressWrap)    progressWrap.hidden          = true;
        if (progressBar)     progressBar.style.width      = '0%';
        if (smartResults)    smartResults.hidden           = true;
    }

    primaryBtn.addEventListener('click', () => { if (!isTesting) runTestSimulation(); });

    async function runTestSimulation() {
        isTesting = true;
        primaryBtn.disabled = true;
        primaryBtn.dataset.mode = 'testing';
        btnText.textContent = 'Testing...';

        resetSpeedUI();
        if (progressWrap) progressWrap.hidden = false;

        // Randomise target values
        const targetPing   = 8 + Math.random() * 65;
        const targetJitter = 1 + Math.random() * 9;
        const roll = Math.random();
        let maxDl, maxUl;
        if (roll > 0.7)       { maxDl = 80  + Math.random() * 200; maxUl = 20 + Math.random() * 80; }
        else if (roll > 0.3)  { maxDl = 20  + Math.random() * 60;  maxUl = 5  + Math.random() * 25; }
        else                  { maxDl = 2   + Math.random() * 18;  maxUl = 0.5 + Math.random() * 7; }

        const results = { ping: targetPing, jitter: targetJitter, download: maxDl, upload: maxUl };

        // Phase 1: Connecting
        setState('connecting');
        setMascot('connecting');
        if (phaseText) phaseText.textContent = 'CONNECTING';
        if (serverStatusText) serverStatusText.textContent = `Connecting to ${MOCK_LOC}...`;
        setProgress(2);
        await sleep(700);

        // Phase 2: Ping
        setState('ping');
        setMascot('ping');
        if (phaseText) phaseText.textContent = 'PING';
        if (currentUnitEl) currentUnitEl.textContent = 'ms';
        if (serverStatusText) serverStatusText.textContent = 'Measuring ping…';

        const pingSteps = 18;
        for (let i = 1; i <= pingSteps; i++) {
            const val = Math.max(1, targetPing + (Math.random() * 10 - 5));
            if (currentSpeedEl) currentSpeedEl.textContent = val.toFixed(1);
            if (valPing)   valPing.textContent   = val.toFixed(0);
            if (valJitter) valJitter.textContent = (targetJitter + Math.random() * 2).toFixed(1);
            setGauge(val, 200);
            setProgress(5 + (i / pingSteps) * 12);
            await sleep(80);
        }
        if (valPing)   valPing.textContent   = targetPing.toFixed(0);
        if (valJitter) valJitter.textContent = targetJitter.toFixed(1);
        setProgress(17);
        await sleep(300);

        // Phase 3: Download
        setState('dl');
        setMascot('dl');
        if (phaseText) phaseText.textContent = 'DOWNLOAD';
        if (currentUnitEl) currentUnitEl.textContent = 'Mbps';
        if (serverStatusText) serverStatusText.textContent = 'Measuring download…';
        setGauge(0, 1);

        const dlScale = maxDl > 500 ? 1000 : 500;
        for (let i = 1; i <= 45; i++) {
            const val = Math.max(0.1, maxDl * easeOut(i / 45) + (Math.random() * 0.08 - 0.04) * maxDl);
            if (currentSpeedEl)  currentSpeedEl.textContent  = val.toFixed(1);
            if (valDlMobile)     valDlMobile.textContent     = val.toFixed(1);
            setGauge(val, dlScale);
            setProgress(17 + (i / 45) * 38);
            await sleep(65);
        }
        if (currentSpeedEl) currentSpeedEl.textContent = maxDl.toFixed(1);
        if (valDlMobile)    valDlMobile.textContent    = maxDl.toFixed(1);
        setProgress(55);
        await sleep(400);

        // Phase 4: Upload
        setState('ul');
        setMascot('ul');
        if (phaseText) phaseText.textContent = 'UPLOAD';
        if (serverStatusText) serverStatusText.textContent = 'Measuring upload…';
        setGauge(0, 1);

        const ulScale = maxUl > 100 ? 200 : 100;
        for (let i = 1; i <= 40; i++) {
            const val = Math.max(0.1, maxUl * easeOut(i / 40) + (Math.random() * 0.08 - 0.04) * maxUl);
            if (currentSpeedEl) currentSpeedEl.textContent = val.toFixed(1);
            if (valUl)          valUl.textContent          = val.toFixed(1);
            setGauge(val, ulScale);
            setProgress(55 + (i / 40) * 38);
            await sleep(65);
        }
        if (currentSpeedEl) currentSpeedEl.textContent = maxUl.toFixed(1);
        if (valUl)          valUl.textContent          = maxUl.toFixed(1);
        setProgress(93);
        await sleep(300);

        // Phase 5: Results
        setProgress(100);
        await sleep(200);
        generateResults(results);
    }

    function generateResults(results) {
        // Score formula (0–100, approximate)
        const dlScore      = Math.min(results.download / 100, 1) * 40;
        const ulScore      = Math.min(results.upload   / 20,  1) * 20;
        const pingScore    = Math.max(0, 20 - (results.ping   / 100 * 20));
        const jitterScore  = Math.max(0, 10 - (results.jitter / 20  * 10));
        const total        = Math.min(Math.round(dlScore + ulScore + pingScore + jitterScore + 10), 100);

        let mascotState, rating;
        if (total >= 80)      { rating = 'excellent'; mascotState = 'excellent'; }
        else if (total >= 60) { rating = 'good';      mascotState = 'good'; }
        else if (total >= 40) { rating = 'average';   mascotState = 'average'; }
        else                  { rating = 'poor';      mascotState = 'poor'; }

        setMascot(mascotState);
        setState(`result-${rating}`);

        setGauge(results.download, results.download > 500 ? 1000 : 500);
        if (currentSpeedEl)   currentSpeedEl.textContent   = results.download.toFixed(1);
        if (currentUnitEl)    currentUnitEl.textContent    = 'Mbps';
        if (phaseText)        phaseText.textContent        = 'DOWNLOAD';
        if (serverStatusText) serverStatusText.textContent = `Completed — ${MOCK_ISP}`;

        // Populate meta info
        if (valIp)   valIp.textContent   = MOCK_IP; // FUTURE: real IP from geolocation API
        if (valTime) valTime.textContent = formatTime(new Date());

        // Smart results
        showSmartResults(results);

        // Re-enable button
        primaryBtn.disabled    = false;
        primaryBtn.dataset.mode = 'start';
        btnText.textContent    = 'Test Again';

        isTesting = false;
        saveHistory({ date: new Date().toISOString(), download: results.download, upload: results.upload, ping: results.ping, jitter: results.jitter, score: rating });
    }

    function saveHistory(record) {
        try {
            let h = JSON.parse(localStorage.getItem('speedpaw_history') || '[]');
            h.unshift(record);
            if (h.length > 30) h = h.slice(0, 30);
            localStorage.setItem('speedpaw_history', JSON.stringify(h));
        } catch (_) {}
    }

    // ══════════════════════════════════════════════════════════
    // VIDEO QUALITY TEST SIMULATION
    // ══════════════════════════════════════════════════════════

    /**
     * Approximate minimum bandwidth required per resolution.
     * FUTURE: Replace simulation with real multi-bitrate bandwidth probing.
     */
    const VIDEO_REQUIREMENTS = [
        { res: '360p',  minMbps: 0.5 },
        { res: '480p',  minMbps: 1.5 },
        { res: '720p',  minMbps: 3   },
        { res: '1080p', minMbps: 5   },
        { res: '1440p', minMbps: 10  },
        { res: '4K',    minMbps: 25  },
    ];

    if (btnVideoTest) {
        btnVideoTest.addEventListener('click', () => {
            if (!isVideoTesting) runVideoTestSimulation();
        });
    }

    async function runVideoTestSimulation() {
        isVideoTesting = true;
        if (btnVideoTest) { btnVideoTest.disabled = true; btnVideoTest.textContent = 'Testing…'; }
        if (vtProgressWrap) vtProgressWrap.hidden = false;

        // Simulate a baseline bandwidth measurement
        const simulatedMbps = 5 + Math.random() * 70;

        if (vtStatus) vtStatus.textContent = 'Measuring…';
        if (vtDesc)   vtDesc.textContent   = 'Detecting available bandwidth';

        // Reset table
        VIDEO_REQUIREMENTS.forEach(({ res }) => {
            const row = document.querySelector(`#vt-table tr[data-res="${res}"] .res-status`);
            if (row) { row.className = 'res-status'; row.textContent = '--'; }
        });

        for (let i = 0; i < VIDEO_REQUIREMENTS.length; i++) {
            const { res, minMbps } = VIDEO_REQUIREMENTS[i];
            const row = document.querySelector(`#vt-table tr[data-res="${res}"] .res-status`);

            if (row) {
                row.className = 'res-status testing';
                row.textContent = 'Testing…';
            }
            if (vtStatus) vtStatus.textContent = `Testing ${res}…`;

            const pct = ((i + 1) / VIDEO_REQUIREMENTS.length) * 100;
            if (vtProgressBar) vtProgressBar.style.width = pct + '%';
            await sleep(500 + Math.random() * 400);

            const supported = simulatedMbps >= minMbps;
            if (row) {
                row.className = `res-status ${supported ? 'supported' : 'unsupported'}`;
                row.textContent = supported ? '✓ Supported' : '✗ Not recommended';
            }
        }

        // Max supported resolution label
        let maxRes = 'None';
        for (let i = VIDEO_REQUIREMENTS.length - 1; i >= 0; i--) {
            if (simulatedMbps >= VIDEO_REQUIREMENTS[i].minMbps) {
                maxRes = VIDEO_REQUIREMENTS[i].res;
                break;
            }
        }

        if (vtStatus) vtStatus.textContent = maxRes === 'None' ? 'No Resolution Supported' : `Max: ${maxRes}`;
        if (vtDesc)   vtDesc.textContent   = `Estimated bandwidth: ${simulatedMbps.toFixed(1)} Mbps (approximate — simulated)`;
        if (vtProgressBar) vtProgressBar.style.width = '100%';

        if (btnVideoTest) { btnVideoTest.disabled = false; btnVideoTest.textContent = 'Test Again'; }
        isVideoTesting = false;
    }

    // ══════════════════════════════════════════════════════════
    // SCREEN RESOLUTION DETECTION (real browser APIs)
    // ══════════════════════════════════════════════════════════

    function detectScreenInfo() {
        const scr = window.screen;

        // Main resolution
        const mainRes = document.getElementById('sr-main-res');
        if (mainRes) mainRes.textContent = `${scr.width} × ${scr.height}`;

        // Viewport
        const viewport = document.getElementById('sr-viewport');
        if (viewport) viewport.textContent = `${window.innerWidth} × ${window.innerHeight}`;

        // DPR
        const dpr = document.getElementById('sr-dpr');
        if (dpr) dpr.textContent = (window.devicePixelRatio || 1).toFixed(2) + 'x';

        // Color depth
        const color = document.getElementById('sr-color');
        if (color && scr.colorDepth) color.textContent = scr.colorDepth + '-bit';
        else if (color) color.textContent = 'Unavailable';

        // Orientation
        const orientEl = document.getElementById('sr-orientation');
        let orientation = 'Unknown';
        if (window.screen.orientation && window.screen.orientation.type) {
            orientation = window.screen.orientation.type.replace('-primary', '').replace('-secondary', '');
            orientation = orientation.charAt(0).toUpperCase() + orientation.slice(1);
        } else {
            orientation = window.innerWidth > window.innerHeight ? 'Landscape' : 'Portrait';
        }
        if (orientEl) orientEl.textContent = orientation;

        // Browser (best-effort, not guaranteed reliable)
        const ua = navigator.userAgent;
        const browser = document.getElementById('sr-browser');
        if (browser) {
            let name = 'Unknown';
            if (/Edg\//.test(ua))     name = 'Microsoft Edge';
            else if (/OPR\//.test(ua)) name = 'Opera';
            else if (/Chrome\//.test(ua)) name = 'Chrome';
            else if (/Firefox\//.test(ua)) name = 'Firefox';
            else if (/Safari\//.test(ua)) name = 'Safari';
            browser.textContent = name;
        }

        // OS (best-effort)
        const osEl = document.getElementById('sr-os');
        if (osEl) {
            let os = 'Unknown';
            if (/Windows NT 10/.test(ua)) os = 'Windows 10/11';
            else if (/Windows/.test(ua))  os = 'Windows';
            else if (/Mac OS X/.test(ua)) os = 'macOS';
            else if (/Linux/.test(ua))    os = 'Linux';
            else if (/Android/.test(ua))  os = 'Android';
            else if (/iPhone|iPad/.test(ua)) os = 'iOS';
            osEl.textContent = os;
        }

        // Platform
        const platEl = document.getElementById('sr-platform');
        if (platEl) {
            platEl.textContent = navigator.platform || 'Unavailable';
        }
    }

    // ══════════════════════════════════════════════════════════
    // INIT
    // ══════════════════════════════════════════════════════════
    setState('ready');
    setMascot('idle');
    primaryBtn.dataset.mode = 'start';
    btnText.textContent = 'Start Test';

    // Update viewport live on screen resolution page
    window.addEventListener('resize', () => {
        if (!viewScreenRes.hidden) detectScreenInfo();

        const viewport = document.getElementById('sr-viewport');
        if (viewport && !viewScreenRes.hidden) {
            viewport.textContent = `${window.innerWidth} × ${window.innerHeight}`;
        }
    });

    window.addEventListener('orientationchange', () => {
        setTimeout(() => { if (!viewScreenRes.hidden) detectScreenInfo(); }, 300);
    });

});
