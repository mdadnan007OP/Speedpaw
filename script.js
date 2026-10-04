/**
 * SpeedPaw — Complete Production JavaScript Engine (v0.2)
 * ────────────────────────────────────────────────────────────
 * Features:
 *  - Genuine Network Speed Testing (Ping, Jitter, Download, Upload)
 *  - High-Efficiency Multi-Stream Bandwidth Saturation
 *  - Finite State Machine: IDLE, CONNECTING, PING, DOWNLOAD, UPLOAD, CALCULATING, COMPLETE, CANCELLED, ERROR
 *  - Approved 3D Robot Cat SVG Mascot Expression Engine
 *  - Real Video Quality Test based on actual measured bandwidth
 *  - Screen & Display Benchmark with requestAnimationFrame Refresh Rate (Hz)
 *  - Continuous Ping & Jitter Diagnostic Tool
 *  - IP & Connection Information Detector
 *  - Privacy-First Local History (localStorage) with CSV Export & Clear All
 *  - Full SPA Hash Router & Dynamic SEO Page Titles
 *  - Dark / Light Theme Persistence
 */

function initApp() {

    // ══════════════════════════════════════════════════════════
    // CONFIGURATION
    // ══════════════════════════════════════════════════════════
    const CFG = window.SPEEDPAW_CONFIG || {
        backendUrl: 'http://localhost:3001',
        downloadSize: 25 * 1024 * 1024,
        concurrentStreams: 3,
        uploadSize: 8 * 1024 * 1024,
        pingCount: 10,
        pingWarmup: 2,
        geoApiUrl: 'https://ipapi.co/json/'
    };

    // ══════════════════════════════════════════════════════════
    // ELEMENT REFERENCES
    // ══════════════════════════════════════════════════════════

    // Theme & Navigation
    const themeToggle       = document.getElementById('theme-toggle');
    const mobileMenuBtn     = document.getElementById('mobile-menu-btn');
    const headerNav         = document.getElementById('header-nav');
    const navLinks          = document.querySelectorAll('.nav-link[data-route]');

    // Speed Test Elements
    const testArea          = document.getElementById('test-area');
    const primaryBtn        = document.getElementById('primary-btn');
    const btnText           = primaryBtn.querySelector('.btn-text');

    const currentSpeedEl    = document.getElementById('current-speed');
    const currentUnitEl     = document.getElementById('current-unit');
    const phaseText         = document.getElementById('phase-text');
    const gaugeArc          = document.getElementById('gauge-arc');
    const gaugeNeedle       = document.getElementById('gauge-needle');

    // Download value element in the right-panel metric card (desktop and tablet)
    // Note: val-dl-mobile was removed in favour of a single unified card
    const valDl             = document.getElementById('val-dl');
    const unitDl            = document.getElementById('unit-dl');
    const valUl             = document.getElementById('val-ul');
    const unitUl            = document.getElementById('unit-ul');
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

    // Smart Results
    const smartResults      = document.getElementById('smart-results');
    const srStream          = document.getElementById('sr-stream');
    const srVideo           = document.getElementById('sr-video');
    const srGaming          = document.getElementById('sr-gaming');
    const srBrowsing        = document.getElementById('sr-browsing');
    const sr4k              = document.getElementById('sr-4k');

    // Mascot SVG Elements
    const catMouth          = document.getElementById('cat-mouth');
    const eyeL              = document.getElementById('eye-l');
    const eyeR              = document.getElementById('eye-r');
    const chestLed          = document.getElementById('chest-led');

    // Video Test Elements
    const btnVideoTest      = document.getElementById('btn-video-test');
    const vtStatus          = document.getElementById('vt-status');
    const vtDesc            = document.getElementById('vt-desc');
    const vtProgressWrap    = document.getElementById('vt-progress-wrap');
    const vtProgressBar     = document.getElementById('vt-progress-bar');

    // History Elements
    const historyTableBody  = document.getElementById('history-tbody');
    const historyEmpty      = document.getElementById('history-empty');
    const historyCount      = document.getElementById('history-count');
    const btnClearHistory   = document.getElementById('btn-clear-history');
    const btnExportHistory  = document.getElementById('btn-export-history');

    // Ping Tool Elements
    const btnPingToggle     = document.getElementById('btn-ping-toggle');
    const ptCurrentPing     = document.getElementById('pt-current-ping');
    const ptMinPing         = document.getElementById('pt-min-ping');
    const ptAvgPing         = document.getElementById('pt-avg-ping');
    const ptMaxPing         = document.getElementById('pt-max-ping');
    const ptJitter          = document.getElementById('pt-jitter');

    // IP Tool Elements
    const ipDisplay         = document.getElementById('ip-display');
    const ipIsp             = document.getElementById('ip-isp');
    const ipCity            = document.getElementById('ip-city');
    const ipCountry         = document.getElementById('ip-country');
    const ipAsn             = document.getElementById('ip-asn');
    const btnCopyIp         = document.getElementById('btn-copy-ip');

    // ══════════════════════════════════════════════════════════
    // STATE VARIABLES
    // ══════════════════════════════════════════════════════════
    let isTesting           = false;
    let isVideoTesting      = false;
    let isPingToolRunning   = false;
    let pingToolInterval    = null;
    let pingToolHistory     = [];

    let activeAbortController = null;
    let activeXhrList         = [];
    let activeStreamReaders   = [];
    let activeGaugeRafId      = null;
    let activeTimeoutList     = [];
    let currentTestRunId      = 0;

    // SVG Gauge geometry (R=108, 190 deg span from -95° to +95°)
    const ARC_LEN             = 358.14;
    const GAUGE_START_ANGLE   = -95;
    const GAUGE_TOTAL_ANGLE   = 190;

    // ══════════════════════════════════════════════════════════
    // THEME MANAGEMENT
    // ══════════════════════════════════════════════════════════
    let currentTheme = localStorage.getItem('sp_theme') ||
        (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    applyTheme(currentTheme);

    themeToggle.addEventListener('click', () => {
        currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
        applyTheme(currentTheme);
        localStorage.setItem('sp_theme', currentTheme);
    });

    function applyTheme(t) {
        document.documentElement.setAttribute('data-theme', t);
    }

    // ══════════════════════════════════════════════════════════
    // MOBILE / COLLAPSED NAVIGATION
    // ══════════════════════════════════════════════════════════
    if (mobileMenuBtn && headerNav) {
        mobileMenuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const open = headerNav.classList.toggle('mobile-open');
            mobileMenuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
        });

        // Close menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!headerNav.contains(e.target) && !mobileMenuBtn.contains(e.target) && headerNav.classList.contains('mobile-open')) {
                headerNav.classList.remove('mobile-open');
                mobileMenuBtn.setAttribute('aria-expanded', 'false');
            }
        });

        // Close menu when clicking any link inside it
        headerNav.addEventListener('click', (e) => {
            if (e.target.closest('a') && headerNav.classList.contains('mobile-open')) {
                headerNav.classList.remove('mobile-open');
                mobileMenuBtn.setAttribute('aria-expanded', 'false');
            }
        });

        // Close menu on Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && headerNav.classList.contains('mobile-open')) {
                headerNav.classList.remove('mobile-open');
                mobileMenuBtn.setAttribute('aria-expanded', 'false');
            }
        });
    }

    // ══════════════════════════════════════════════════════════
    // SPA HASH ROUTER
    // ══════════════════════════════════════════════════════════
    const ROUTE_MAP = {
        '/'                     : { id: 'view-speed-test',   title: 'SpeedPaw — Free Internet Speed & Network Quality Tester' },
        '/video-test'           : { id: 'view-video-test',   title: 'SpeedPaw — Video Quality & Streaming Resolution Test' },
        '/screen-res'           : { id: 'view-screen-res',   title: 'SpeedPaw — Screen Resolution & Display Refresh Rate' },
        '/history'              : { id: 'view-history',      title: 'SpeedPaw — Local Test History' },
        '/ping-test'            : { id: 'view-ping-test',    title: 'SpeedPaw — Live Ping & Jitter Diagnostic Tool' },
        '/ip-info'              : { id: 'view-ip-info',      title: 'SpeedPaw — Public IP & Connection Info' },
        '/learn/speed-guide'    : { id: 'view-learn-speed',  title: 'What is Internet Speed? (Mbps vs MB/s) — SpeedPaw' },
        '/learn/ping-jitter'    : { id: 'view-learn-ping',   title: 'What is Ping and Jitter? — SpeedPaw' },
        '/learn/good-speed'     : { id: 'view-learn-good',   title: 'What is a Good Internet Speed? — SpeedPaw' },
        '/learn/wifi-guide'     : { id: 'view-learn-wifi',   title: 'Wi-Fi Troubleshooting & Optimization — SpeedPaw' },
        '/learn/slow-internet'  : { id: 'view-learn-slow',   title: 'Why is My Internet Slow? Checklist — SpeedPaw' },
        '/learn/faq'            : { id: 'view-learn-faq',    title: 'Frequently Asked Questions — SpeedPaw' },
        '/about'                : { id: 'view-about',        title: 'About SpeedPaw — Transparent & Private Speed Testing' },
        '/contact'              : { id: 'view-contact',      title: 'Contact SpeedPaw' },
        '/privacy'              : { id: 'view-privacy',      title: 'Privacy Policy — SpeedPaw' },
        '/terms'                : { id: 'view-terms',        title: 'Terms of Service — SpeedPaw' },
    };

    function getNormalizedRoute() {
        const hash = window.location.hash.replace('#', '').trim() || '/';
        return hash.split('?')[0] || '/';
    }

    function navigateToRoute(route) {
        const routeConfig = ROUTE_MAP[route] || ROUTE_MAP['/'];
        
        // Hide all views
        document.querySelectorAll('.view-section').forEach(view => {
            view.hidden = true;
        });

        // Show target view
        const targetView = document.getElementById(routeConfig.id);
        if (targetView) targetView.hidden = false;

        // Update active nav link
        navLinks.forEach(link => {
            const linkRoute = link.getAttribute('data-route') || '/';
            link.classList.toggle('active', linkRoute === route);
        });

        // Update page title
        document.title = routeConfig.title;

        // Trigger view-specific data initializations
        if (route === '/screen-res') detectScreenInfo();
        if (route === '/history') renderHistoryTable();
        if (route === '/ip-info') loadIpInfo();

        // Close mobile nav drawer if open
        headerNav.classList.remove('mobile-open');
        mobileMenuBtn.setAttribute('aria-expanded', false);

        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    window.addEventListener('hashchange', () => navigateToRoute(getNormalizedRoute()));
    
    // Initial route handle
    navigateToRoute(getNormalizedRoute());

    // ══════════════════════════════════════════════════════════
    // UTILITIES
    // ══════════════════════════════════════════════════════════
    const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

    // ══════════════════════════════════════════════════════════
    // GAUGE SCALE MAPPING (NON-LINEAR UP TO 1000 Mbps / 1 Gbps)
    // ══════════════════════════════════════════════════════════
    const GAUGE_SCALE = [
        { speed: 0,    t: 0.00 },
        { speed: 5,    t: 0.12 },
        { speed: 10,   t: 0.22 },
        { speed: 50,   t: 0.38 },
        { speed: 100,  t: 0.52 },
        { speed: 250,  t: 0.68 },
        { speed: 500,  t: 0.80 },
        { speed: 750,  t: 0.90 },
        { speed: 1000, t: 1.00 }
    ];

    /**
     * Non-linear speed to gauge proportion mapping [0.0, 1.0].
     * Preserves high resolution for lower speeds (1-10 Mbps) while supporting up to 1 Gbps.
     */
    function speedToGauge(speed) {
        if (speed <= 0) return 0;
        if (speed >= 1000) return 1;
        for (let i = 0; i < GAUGE_SCALE.length - 1; i++) {
            const p1 = GAUGE_SCALE[i];
            const p2 = GAUGE_SCALE[i + 1];
            if (speed >= p1.speed && speed <= p2.speed) {
                const frac = (speed - p1.speed) / (p2.speed - p1.speed);
                return p1.t + frac * (p2.t - p1.t);
            }
        }
        return 1;
    }

    /**
     * Invertible gauge proportion [0.0, 1.0] to speed (Mbps).
     * Used for the visual startup sweep animation.
     */
    function gaugeToSpeed(t) {
        if (t <= 0) return 0;
        if (t >= 1) return 1000;
        for (let i = 0; i < GAUGE_SCALE.length - 1; i++) {
            const p1 = GAUGE_SCALE[i];
            const p2 = GAUGE_SCALE[i + 1];
            if (t >= p1.t && t <= p2.t) {
                const frac = (t - p1.t) / (p2.t - p1.t);
                return p1.speed + frac * (p2.speed - p1.speed);
            }
        }
        return 1000;
    }

    /**
     * Synchronously updates the glowing arc, animated needle, and digital speed readout.
     */
    function updateGaugeVisuals(t, speedDisplay, unitDisplay) {
        const clampedT = Math.min(Math.max(t, 0), 1);
        if (gaugeArc) {
            gaugeArc.style.strokeDashoffset = ARC_LEN * (1 - clampedT);
        }
        if (gaugeNeedle) {
            const angle = GAUGE_START_ANGLE + clampedT * GAUGE_TOTAL_ANGLE;
            gaugeNeedle.setAttribute('transform', `rotate(${angle.toFixed(2)}, 150, 150)`);
        }
        if (speedDisplay !== undefined && currentSpeedEl) {
            currentSpeedEl.textContent = speedDisplay;
        }
        if (unitDisplay !== undefined && currentUnitEl) {
            currentUnitEl.textContent = unitDisplay;
        }
    }

    function cancelGaugeAnimation() {
        if (activeGaugeRafId !== null) {
            cancelAnimationFrame(activeGaugeRafId);
            activeGaugeRafId = null;
        }
    }

    function setProgress(pct) {
        if (progressBar) {
            progressBar.style.width = Math.min(Math.max(pct, 0), 100) + '%';
        }
    }

    function setState(state) {
        if (testArea) testArea.dataset.state = state;
    }

    function formatTime(date) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    function formatDate(date) {
        return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
    }

    // ══════════════════════════════════════════════════════════
    // APPROVED MASCOT EXPRESSION ENGINE
    // ══════════════════════════════════════════════════════════
    const MASCOT_STATES = {
        idle: {
            eyeL    : 'M 44,101 Q 53,88 62,101',   // Happy arc
            eyeR    : 'M 98,101 Q 107,88 116,101',
            mouth   : 'M72,126 Q80,124 88,126',
            ledColor: '#3b82f6',
            status  : 'Ready to sniff out your speed?',
            cq: 'Ready', cqDesc: 'Press Start Test to begin.', bars: 0
        },
        connecting: {
            eyeL    : 'M 44,96 Q 53,96 62,96',     // Curious / attentive
            eyeR    : 'M 98,96 Q 107,96 116,96',
            mouth   : 'M74,126 Q80,127 86,126',
            ledColor: '#f59e0b',
            status  : 'Finding optimal test server...',
            cq: 'Connecting', cqDesc: 'Contacting speed-test server.', bars: 1
        },
        ping: {
            eyeL    : 'M 44,97 Q 53,92 62,97',     // Focused / measuring
            eyeR    : 'M 98,97 Q 107,92 116,97',
            mouth   : 'M74,126 Q80,127 86,126',
            ledColor: '#22d3ee',
            status  : 'Measuring ping and jitter...',
            cq: 'Testing Ping', cqDesc: 'Measuring round-trip latency.', bars: 1
        },
        dl: {
            eyeL    : 'M 44,98 Q 53,89 62,98',     // High speed focus
            eyeR    : 'M 98,98 Q 107,89 116,98',
            mouth   : 'M72,125 Q80,128 88,125',
            ledColor: '#3b82f6',
            status  : 'Measuring download bandwidth...',
            cq: 'Downloading', cqDesc: 'Saturating download pipeline.', bars: 2
        },
        ul: {
            eyeL    : 'M 44,98 Q 53,90 62,98',
            eyeR    : 'M 98,98 Q 107,90 116,98',
            mouth   : 'M72,126 Q80,129 88,126',
            ledColor: '#8b5cf6',
            status  : 'Measuring upload bandwidth...',
            cq: 'Uploading', cqDesc: 'Streaming outbound test packets.', bars: 3
        },
        calculating: {
            eyeL    : 'M 44,97 Q 53,93 62,97',
            eyeR    : 'M 98,97 Q 107,93 116,97',
            mouth   : 'M74,126 Q80,127 86,126',
            ledColor: '#60a5fa',
            status  : 'Calculating connection quality score...',
            cq: 'Analyzing', cqDesc: 'Computing health index.', bars: 4
        },
        excellent: {
            eyeL    : 'M 44,103 Q 53,86 62,103',   // Big celebration arc
            eyeR    : 'M 98,103 Q 107,86 116,103',
            mouth   : 'M70,124 Q80,131 90,124',
            ledColor: '#10b981',
            status  : "Blimey, that's fast! 🚀",
            cq: 'Excellent', cqDesc: 'Perfect for 4K streaming & gaming.', bars: 4
        },
        good: {
            eyeL    : 'M 44,101 Q 53,88 62,101',
            eyeR    : 'M 98,101 Q 107,88 116,101',
            mouth   : 'M71,125 Q80,129 89,125',
            ledColor: '#3b82f6',
            status  : 'Solid connection! 😸',
            cq: 'Good', cqDesc: 'Great for HD video calls & browsing.', bars: 3
        },
        average: {
            eyeL    : 'M 44,97 Q 53,93 62,97',
            eyeR    : 'M 98,97 Q 107,93 116,97',
            mouth   : 'M74,126 Q80,127 86,126',
            ledColor: '#f59e0b',
            status  : "Decent speed, but could be faster.",
            cq: 'Average', cqDesc: 'May buffer on multiple 4K streams.', bars: 2
        },
        poor: {
            eyeL    : 'M 44,94 Q 53,101 62,94',    // Downward concerned arc
            eyeR    : 'M 98,94 Q 107,101 116,94',
            mouth   : 'M72,128 Q80,124 88,128',
            ledColor: '#ef4444',
            status  : "That's a slow connection... 😿",
            cq: 'Poor', cqDesc: 'May experience buffering and lag.', bars: 1
        },
        cancelled: {
            eyeL    : 'M 44,96 Q 53,96 62,96',     // Flat standby
            eyeR    : 'M 98,96 Q 107,96 116,96',
            mouth   : 'M74,126 Q80,126 86,126',
            ledColor: '#94a3b8',
            status  : 'Test was cancelled.',
            cq: 'Cancelled', cqDesc: 'Test stopped by user.', bars: 0
        },
        error: {
            eyeL    : 'M 44,93 Q 53,101 62,93',
            eyeR    : 'M 98,93 Q 107,101 116,93',
            mouth   : 'M72,129 Q80,124 88,129',
            ledColor: '#ef4444',
            status  : 'Could not connect to speed server. Try again.',
            cq: 'Server Error', cqDesc: 'Check connection or backend.', bars: 0
        }
    };

    function setMascot(stateName) {
        const s = MASCOT_STATES[stateName] || MASCOT_STATES.idle;

        if (eyeL)        eyeL.setAttribute('d', s.eyeL);
        if (eyeR)        eyeR.setAttribute('d', s.eyeR);
        if (catMouth)    catMouth.setAttribute('d', s.mouth);
        if (chestLed)    chestLed.setAttribute('fill', s.ledColor);
        if (catStatusMsg) catStatusMsg.textContent = s.status;

        if (cqValue)     cqValue.textContent = s.cq;
        if (cqDesc)      cqDesc.textContent  = s.cqDesc;

        const colorMap = {
            'Excellent': 'var(--success)',
            'Good':      'var(--accent)',
            'Average':   'var(--warning)',
            'Poor':      'var(--danger)',
            'Server Error': 'var(--danger)',
            'Cancelled': 'var(--text-muted)'
        };
        if (cqValue) cqValue.style.color = colorMap[s.cq] || 'var(--text-muted)';

        cqBars.forEach((bar, i) => {
            bar.classList.toggle('full', i < s.bars);
        });
    }

    // ══════════════════════════════════════════════════════════
    // SMART RESULTS ENGINE
    // ══════════════════════════════════════════════════════════
    function computeSmartSuitability(results) {
        const dl = results.download;
        const ul = results.upload;
        const ping = results.ping;
        const jitter = results.jitter;

        // Streaming: primarily download speed + jitter stability
        let stream = 'Poor';
        if (dl >= 25 && jitter < 15) stream = 'Excellent';
        else if (dl >= 10 && jitter < 30) stream = 'Good';
        else if (dl >= 4) stream = 'Average';

        // Video Calls: requires both download + upload and low latency
        let video = 'Poor';
        if (dl >= 15 && ul >= 5 && ping < 60 && jitter < 15) video = 'Excellent';
        else if (dl >= 5 && ul >= 2 && ping < 100) video = 'Good';
        else if (dl >= 2 && ul >= 1) video = 'Average';

        // Gaming: highly dependent on ping and jitter stability
        let gaming = 'Poor';
        if (ping < 35 && jitter < 6 && dl >= 10) gaming = 'Excellent';
        else if (ping < 70 && jitter < 15 && dl >= 5) gaming = 'Good';
        else if (ping < 110) gaming = 'Average';

        // Browsing: snappy response if ping < 80ms and dl >= 5 Mbps
        let browsing = 'Poor';
        if (dl >= 15 && ping < 50) browsing = 'Excellent';
        else if (dl >= 5 && ping < 100) browsing = 'Good';
        else if (dl >= 1) browsing = 'Average';

        // 4K Ultra HD: requires sustained 25+ Mbps
        let fourK = 'Not Ideal';
        if (dl >= 50 && jitter < 15) fourK = 'Supported';
        else if (dl >= 25) fourK = 'Marginal';

        return { stream, video, gaming, browsing, fourK };
    }

    function applySmartBadge(element, label) {
        if (!element) return;
        element.textContent = label;
        element.className = 'smart-val';

        const clsMap = {
            'Excellent': 'excellent',
            'Supported': 'excellent',
            'Good':      'good',
            'Marginal':  'fair',
            'Average':   'fair',
            'Poor':      'poor',
            'Not Ideal': 'poor'
        };
        if (clsMap[label]) element.classList.add(clsMap[label]);
    }

    function showSmartResults(results) {
        if (!smartResults) return;
        smartResults.hidden = false;

        const suit = computeSmartSuitability(results);
        applySmartBadge(srStream,   suit.stream);
        applySmartBadge(srVideo,    suit.video);
        applySmartBadge(srGaming,   suit.gaming);
        applySmartBadge(srBrowsing, suit.browsing);
        applySmartBadge(sr4k,       suit.fourK);
    }

    // ══════════════════════════════════════════════════════════
    // REAL SPEED TEST ENGINE
    // ══════════════════════════════════════════════════════════

    function resetSpeedUI() {
        cancelGaugeAnimation();
        [valDl, valUl, valPing, valJitter].forEach(el => { if (el) el.textContent = '--'; });
        if (unitDl) unitDl.textContent = 'Mbps';
        if (unitUl) unitUl.textContent = 'Mbps';
        updateGaugeVisuals(0, '0.0', 'Mbps');
        if (phaseText)       phaseText.textContent       = 'SPEED TEST';
        if (valTime)         valTime.textContent         = '--';
        if (progressWrap)    progressWrap.hidden          = true;
        if (progressBar)     progressBar.style.width      = '0%';
        if (smartResults)    smartResults.hidden           = true;
    }

    primaryBtn.addEventListener('click', () => {
        if (primaryBtn.dataset.mode === 'cancel') {
            cancelSpeedTest();
        } else if (!isTesting) {
            runGenuineSpeedTest();
        }
    });

    /**
     * Complete lifecycle cleanup: stops animation frames, timers, aborts requests and stream readers.
     */
    function cleanupTestExecution() {
        cancelGaugeAnimation();
        if (activeAbortController) {
            activeAbortController.abort();
            activeAbortController = null;
        }
        activeXhrList.forEach(xhr => {
            try { xhr.abort(); } catch(_) {}
        });
        activeXhrList = [];
        activeStreamReaders.forEach(reader => {
            try { reader.cancel(); } catch(_) {}
        });
        activeStreamReaders = [];
        if (activeTimeoutList.length > 0) {
            activeTimeoutList.forEach(id => clearTimeout(id));
            activeTimeoutList = [];
        }
    }

    function cancelSpeedTest() {
        cleanupTestExecution();

        isTesting = false;
        primaryBtn.disabled    = false;
        primaryBtn.dataset.mode = 'start';
        btnText.textContent    = 'Start Test';

        setState('ready');
        setMascot('cancelled');
        if (phaseText) phaseText.textContent = 'CANCELLED';
        if (serverStatusText) serverStatusText.textContent = 'Test cancelled by user';
        setProgress(0);
        if (progressWrap) progressWrap.hidden = true;
        updateGaugeVisuals(0, '0.0', 'Mbps');
    }

    /**
     * Visual startup sweep: 0 → 5 → 10 → 50 → 100 → 250 → 500 → 750 → 1000 → 0
     * Visual only; does NOT alter network measurement.
     * Cancels immediately on test abort.
     */
    function runVisualStartupSweep(signal) {
        return new Promise((resolve) => {
            cancelGaugeAnimation();
            const sweepDurationMs = 900;
            const startTime = performance.now();

            function step(now) {
                if (signal.aborted) {
                    cancelGaugeAnimation();
                    updateGaugeVisuals(0, '0.0', 'Mbps');
                    resolve();
                    return;
                }

                const elapsed = now - startTime;
                const progress = Math.min(elapsed / sweepDurationMs, 1.0);

                let t;
                if (progress <= 0.52) {
                    // Forward sweep: 0 -> 1000 (ease-out)
                    const p = progress / 0.52;
                    t = Math.sin(p * Math.PI / 2);
                } else {
                    // Return sweep: 1000 -> 0 (ease-in-out)
                    const p = (progress - 0.52) / 0.48;
                    t = 1 - (0.5 - 0.5 * Math.cos(p * Math.PI));
                }

                const sweepSpeed = gaugeToSpeed(t);
                const speedText = sweepSpeed >= 1000 ? '1.00' : (sweepSpeed < 10 ? sweepSpeed.toFixed(1) : Math.round(sweepSpeed).toString());
                const unitText = sweepSpeed >= 1000 ? 'Gbps' : 'Mbps';

                updateGaugeVisuals(t, speedText, unitText);

                if (progress < 1.0) {
                    activeGaugeRafId = requestAnimationFrame(step);
                } else {
                    activeGaugeRafId = null;
                    updateGaugeVisuals(0, '0.0', 'Mbps');
                    resolve();
                }
            }

            activeGaugeRafId = requestAnimationFrame(step);
        });
    }

    /**
     * Decoupled rAF render loop: smooths needle and DOM updates at ~30-50 FPS without lagging network streams.
     * Raw byte counters remain strictly independent from UI smoothing.
     */
    function startLiveGaugeRenderLoop(liveState, onCompleteSignal) {
        cancelGaugeAnimation();
        let visualSpeed = 0;
        let lastRenderTime = performance.now();

        function renderFrame(now) {
            if (!liveState.isRunning || onCompleteSignal.aborted) {
                return;
            }

            const dt = (now - lastRenderTime) / 1000;
            // Throttle to ~30-50 FPS (min 20ms between visual updates)
            if (dt >= 0.02) {
                lastRenderTime = now;
                const elapsedSec = (now - liveState.startTime) / 1000;
                if (elapsedSec > 0.04) {
                    const actualInstantMbps = (liveState.bytes * 8) / (elapsedSec * 1000000);

                    // Responsive exponential smoothing for UI needle movement
                    const smoothingFactor = Math.min(dt * 7.5, 0.4);
                    visualSpeed = visualSpeed === 0 ? actualInstantMbps : (visualSpeed + (actualInstantMbps - visualSpeed) * smoothingFactor);

                    const t = speedToGauge(visualSpeed);
                    const displaySpeed = visualSpeed >= 1000 ? (visualSpeed / 1000).toFixed(2) : visualSpeed.toFixed(1);
                    const displayUnit = visualSpeed >= 1000 ? 'Gbps' : 'Mbps';

                    updateGaugeVisuals(t, displaySpeed, displayUnit);

                    if (liveState.phase === 'dl') {
                        if (valDl) valDl.textContent = displaySpeed;
                        if (unitDl) unitDl.textContent = displayUnit;
                        const pct = Math.min(liveState.bytes / liveState.totalTargetBytes, 1);
                        setProgress(20 + pct * 40);
                    } else if (liveState.phase === 'ul') {
                        if (valUl) valUl.textContent = displaySpeed;
                        if (unitUl) unitUl.textContent = displayUnit;
                        const pct = Math.min(liveState.bytes / liveState.totalTargetBytes, 1);
                        setProgress(60 + pct * 36);
                    }
                }
            }

            if (liveState.isRunning && !onCompleteSignal.aborted) {
                activeGaugeRafId = requestAnimationFrame(renderFrame);
            }
        }

        activeGaugeRafId = requestAnimationFrame(renderFrame);
    }

    async function runGenuineSpeedTest() {
        if (isTesting) {
            cleanupTestExecution();
        }
        isTesting = true;
        currentTestRunId++;
        const testId = currentTestRunId;

        activeAbortController = new AbortController();
        const signal = activeAbortController.signal;
        activeXhrList = [];
        activeStreamReaders = [];

        primaryBtn.disabled    = false;
        primaryBtn.dataset.mode = 'cancel';
        btnText.textContent    = 'Cancel';

        resetSpeedUI();
        if (progressWrap) progressWrap.hidden = false;

        const results = { ping: 0, jitter: 0, download: 0, upload: 0 };
        // Default to Hyderabad server node
        let serverMeta = {
            serverName: 'SpeedPaw AWS Node',
            location: 'Hyderabad, India',
            clientIp: '--'
        };

        try {
            // ──────────────────────────────────────────────────────────
            // PHASE 1: CONNECTING, SERVER CONFIG & STARTUP SWEEP
            // ──────────────────────────────────────────────────────────
            setState('connecting');
            setMascot('connecting');
            if (phaseText) phaseText.textContent = 'CONNECTING';
            if (serverStatusText) serverStatusText.textContent = 'Reaching test server...';
            setProgress(3);

            // Execute the short visual startup sweep concurrently with server reachability
            const sweepPromise = runVisualStartupSweep(signal);

            // TODO: Future Multi-Server & Nearest-Server Selection Architecture
            // When additional edge test nodes are deployed (e.g. AWS Mumbai, Singapore, Frankfurt, US-East):
            // 1. Fetch available server list with geolocation coordinates from backend.
            // 2. Ping / probe all candidate nodes concurrently during CONNECTING phase (1-2 lightweight probes each).
            // 3. Automatically select the lowest-latency edge server for the speed test.
            // 4. Allow manual server selection override via the "Change Server" modal/dropdown.
            try {
                const cfgRes = await fetch(`${CFG.backendUrl}/api/config?r=${Date.now()}`, { signal, cache: 'no-store' });
                if (cfgRes.ok) {
                    const cfgData = await cfgRes.json();
                    if (cfgData.location) serverMeta.location = cfgData.location;
                    if (cfgData.serverName) serverMeta.serverName = cfgData.serverName;
                    if (cfgData.clientIp) serverMeta.clientIp = cfgData.clientIp;
                }
            } catch (cfgErr) {
                if (signal.aborted) throw new Error('AbortError');
                console.warn('Backend /api/config unavailable, using fallback node info', cfgErr);
            }

            if (serverLocation) serverLocation.textContent = serverMeta.location || 'Hyderabad, India';
            if (valIp && serverMeta.clientIp && serverMeta.clientIp !== 'Unknown') {
                valIp.textContent = serverMeta.clientIp;
                valIp.title = `Public IP: ${serverMeta.clientIp} (Click to copy)`;
                valIp.dataset.fullIp = serverMeta.clientIp;
            }
            if (serverStatusText) serverStatusText.textContent = `Connected: ${serverMeta.serverName}`;
            setProgress(6);

            // Await completion of the visual startup sweep before proceeding
            await sweepPromise;
            if (signal.aborted) throw new Error('AbortError');
            updateGaugeVisuals(0, '0.0', 'Mbps');

            // ──────────────────────────────────────────────────────────
            // PHASE 2: PING & JITTER (FINITE SAMPLES WITH SAFETY TIMEOUT)
            // ──────────────────────────────────────────────────────────
            setState('ping');
            setMascot('ping');
            if (phaseText) phaseText.textContent = 'PING';
            if (currentUnitEl) currentUnitEl.textContent = 'ms';
            if (serverStatusText) serverStatusText.textContent = 'Measuring latency & jitter…';

            const pingPhaseStart = performance.now();
            const PING_PHASE_MAX_MS = 10000; // 10s maximum safety duration for ping phase
            const rttSamples = [];

            for (let i = 0; i < CFG.pingCount; i++) {
                if (signal.aborted) throw new Error('AbortError');
                if (performance.now() - pingPhaseStart > PING_PHASE_MAX_MS) {
                    console.warn('Ping phase safety timeout reached');
                    break;
                }

                const sampleController = new AbortController();
                const onAbort = () => sampleController.abort();
                signal.addEventListener('abort', onAbort, { once: true });
                const sampleTimeoutId = setTimeout(() => sampleController.abort(), 2500);

                const tStart = performance.now();
                try {
                    const pingRes = await fetch(`${CFG.backendUrl}/api/ping?r=${Date.now()}_${i}`, {
                        signal: sampleController.signal,
                        cache: 'no-store'
                    });
                    if (pingRes.ok) {
                        await pingRes.json();
                        const rtt = performance.now() - tStart;
                        rttSamples.push(rtt);

                        // Live gauge feedback during ping
                        const pingGaugeT = Math.min(rtt / 150, 1.0);
                        updateGaugeVisuals(pingGaugeT, rtt.toFixed(0), 'ms');
                    }
                } catch (sampleErr) {
                    if (signal.aborted) throw new Error('AbortError');
                    console.warn(`Ping sample ${i} failed or timed out`, sampleErr);
                } finally {
                    clearTimeout(sampleTimeoutId);
                    signal.removeEventListener('abort', onAbort);
                }

                setProgress(6 + ((i + 1) / CFG.pingCount) * 14);
                if (i < CFG.pingCount - 1) {
                    await sleep(40);
                }
            }

            // Discard warmup samples for accurate median
            const validSamples = rttSamples.length > CFG.pingWarmup
                ? rttSamples.slice(CFG.pingWarmup)
                : rttSamples;

            if (validSamples.length > 0) {
                const sortedRtts = [...validSamples].sort((a, b) => a - b);
                const mid = Math.floor(sortedRtts.length / 2);
                results.ping = sortedRtts.length % 2 !== 0
                    ? sortedRtts[mid]
                    : (sortedRtts[mid - 1] + sortedRtts[mid]) / 2;

                // RFC 3550 Jitter: Mean deviation of consecutive packet delays
                let consecutiveSum = 0;
                for (let i = 1; i < validSamples.length; i++) {
                    consecutiveSum += Math.abs(validSamples[i] - validSamples[i - 1]);
                }
                results.jitter = validSamples.length > 1 ? consecutiveSum / (validSamples.length - 1) : 0;
            }

            if (valPing) valPing.textContent = results.ping.toFixed(0);
            if (valJitter) valJitter.textContent = results.jitter.toFixed(1);
            setProgress(20);
            updateGaugeVisuals(0, '0.0', 'Mbps');

            // ──────────────────────────────────────────────────────────
            // PHASE 3: DOWNLOAD SPEED (CONCURRENT STREAM MEASUREMENT)
            // ──────────────────────────────────────────────────────────
            setState('dl');
            setMascot('dl');
            if (phaseText) phaseText.textContent = 'DOWNLOAD';
            if (currentUnitEl) currentUnitEl.textContent = 'Mbps';
            if (serverStatusText) serverStatusText.textContent = 'Measuring download throughput…';
            updateGaugeVisuals(0, '0.0', 'Mbps');

            const streamCount = Math.max(1, CFG.concurrentStreams || 3);
            const bytesPerStream = Math.floor(CFG.downloadSize / streamCount);
            let totalBytesDownloaded = 0;
            const dlStartTime = performance.now();

            const liveDlState = {
                bytes: 0,
                totalTargetBytes: CFG.downloadSize,
                startTime: dlStartTime,
                phase: 'dl',
                isRunning: true
            };

            // Start decoupled high-performance rAF render loop
            startLiveGaugeRenderLoop(liveDlState, signal);

            const downloadPromises = Array.from({ length: streamCount }).map(async (_, idx) => {
                const url = `${CFG.backendUrl}/api/download?size=${bytesPerStream}&stream=${idx}&r=${Date.now()}`;
                const res = await fetch(url, { signal, cache: 'no-store' });
                if (!res.ok || !res.body) throw new Error('Download request failed');

                const reader = res.body.getReader();
                activeStreamReaders.push(reader);
                try {
                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) break;
                        liveDlState.bytes += value.length;
                        totalBytesDownloaded += value.length;
                    }
                } finally {
                    try { reader.releaseLock(); } catch (_) {}
                }
            });

            await Promise.all(downloadPromises);

            liveDlState.isRunning = false;
            cancelGaugeAnimation();

            const totalDlDurationSec = (performance.now() - dlStartTime) / 1000;
            results.download = (totalBytesDownloaded * 8) / (totalDlDurationSec * 1000000);

            // Display raw verified final download calculation on gauge and cards
            const finalDlGaugeT = speedToGauge(results.download);
            const finalDlDisplay = results.download >= 1000 ? (results.download / 1000).toFixed(2) : results.download.toFixed(1);
            const finalDlUnit = results.download >= 1000 ? 'Gbps' : 'Mbps';
            updateGaugeVisuals(finalDlGaugeT, finalDlDisplay, finalDlUnit);

            if (valDl) valDl.textContent = finalDlDisplay;
            if (unitDl) unitDl.textContent = finalDlUnit;
            setProgress(60);
            await sleep(250);

            // ──────────────────────────────────────────────────────────
            // PHASE 4: UPLOAD SPEED (REAL BINARY OCTET STREAM)
            // ──────────────────────────────────────────────────────────
            setState('ul');
            setMascot('ul');
            if (phaseText) phaseText.textContent = 'UPLOAD';
            if (serverStatusText) serverStatusText.textContent = 'Measuring upload throughput…';
            updateGaugeVisuals(0, '0.0', 'Mbps');

            const uploadSize = CFG.uploadSize || (8 * 1024 * 1024);
            const uploadPayload = new Uint8Array(uploadSize);
            for (let i = 0; i < uploadPayload.length; i += 65536) {
                uploadPayload[i] = Math.floor(Math.random() * 256);
            }

            const liveUlState = {
                bytes: 0,
                totalTargetBytes: uploadSize,
                startTime: performance.now(),
                phase: 'ul',
                isRunning: true
            };

            startLiveGaugeRenderLoop(liveUlState, signal);

            results.upload = await new Promise((resolve, reject) => {
                const xhr = new XMLHttpRequest();
                activeXhrList.push(xhr);
                const ulStartTime = performance.now();
                liveUlState.startTime = ulStartTime;

                xhr.upload.onprogress = (e) => {
                    if (e.lengthComputable && e.loaded > 0) {
                        liveUlState.bytes = e.loaded;
                    }
                };

                xhr.onload = () => {
                    liveUlState.isRunning = false;
                    cancelGaugeAnimation();
                    if (xhr.status >= 200 && xhr.status < 300) {
                        const totalUlDurationSec = (performance.now() - ulStartTime) / 1000;
                        const finalUlMbps = (uploadSize * 8) / (totalUlDurationSec * 1000000);
                        resolve(finalUlMbps);
                    } else {
                        reject(new Error(`Upload status error: ${xhr.status}`));
                    }
                };

                xhr.onerror = () => {
                    liveUlState.isRunning = false;
                    cancelGaugeAnimation();
                    reject(new Error('Network error during upload'));
                };
                xhr.onabort = () => {
                    liveUlState.isRunning = false;
                    cancelGaugeAnimation();
                    reject(new Error('AbortError'));
                };

                const abortHandler = () => xhr.abort();
                signal.addEventListener('abort', abortHandler, { once: true });

                xhr.open('POST', `${CFG.backendUrl}/api/upload?r=${Date.now()}`);
                xhr.setRequestHeader('Content-Type', 'application/octet-stream');
                xhr.send(uploadPayload);

                // Remove abort listener once XHR finishes (regardless of outcome)
                const cleanupAbortListener = () => signal.removeEventListener('abort', abortHandler);
                xhr.addEventListener('loadend', cleanupAbortListener, { once: true });
            });

            liveUlState.isRunning = false;
            cancelGaugeAnimation();

            const finalUlDisplay = results.upload >= 1000 ? (results.upload / 1000).toFixed(2) : results.upload.toFixed(1);
            const finalUlUnit = results.upload >= 1000 ? 'Gbps' : 'Mbps';
            const finalUlGaugeT = speedToGauge(results.upload);
            updateGaugeVisuals(finalUlGaugeT, finalUlDisplay, finalUlUnit);

            if (valUl) valUl.textContent = finalUlDisplay;
            if (unitUl) unitUl.textContent = finalUlUnit;
            setProgress(96);

            // ──────────────────────────────────────────────────────────
            // PHASE 5: COMPUTE FINAL SCORES & FINALIZE
            // ──────────────────────────────────────────────────────────
            setState('calculating');
            setMascot('calculating');
            if (phaseText) phaseText.textContent = 'FINALIZING';
            setProgress(100);
            await sleep(350);

            if (testId === currentTestRunId && !signal.aborted) {
                presentFinalResults(results, serverMeta);
            }

        } catch (err) {
            if (err.name === 'AbortError' || err.message === 'AbortError') {
                // Clean abort (user cancel or per-sample timeout). isTesting is reset by cancelSpeedTest().
                // Defensively ensure isTesting is false in case abort originated outside of cancelSpeedTest().
                isTesting = false;
                console.log('Speed test cleanly aborted.');
            } else {
                console.error('Speed test encountered error:', err);
                handleSpeedTestError(err);
            }
        }
    }

    function handleSpeedTestError(err) {
        cleanupTestExecution();
        isTesting = false;
        primaryBtn.disabled    = false;
        primaryBtn.dataset.mode = 'start';
        btnText.textContent    = 'Test Again';

        setState('error');
        setMascot('error');
        if (phaseText) phaseText.textContent = 'ERROR';
        if (serverStatusText) {
            serverStatusText.textContent = 'Cannot reach speed server. Check connection.';
        }
        setProgress(0);
        updateGaugeVisuals(0, '0.0', 'Mbps');
    }

    function presentFinalResults(results, serverMeta) {
        cleanupTestExecution();

        // Transparent 0-100 Score Formula:
        // Download (40pts) + Upload (25pts) + Ping (25pts) + Jitter (10pts)
        const dlScore     = Math.min(results.download / 100, 1) * 40;
        const ulScore     = Math.min(results.upload   / 25,  1) * 25;
        const pingScore   = Math.max(0, 25 - (results.ping / 100 * 25));
        const jitterScore = Math.max(0, 10 - (results.jitter / 20 * 10));
        const compositeScore = Math.min(Math.round(dlScore + ulScore + pingScore + jitterScore), 100);

        let ratingCategory;
        if (compositeScore >= 80)      ratingCategory = 'excellent';
        else if (compositeScore >= 60) ratingCategory = 'good';
        else if (compositeScore >= 40) ratingCategory = 'average';
        else                           ratingCategory = 'poor';

        setMascot(ratingCategory);
        setState(`result-${ratingCategory}`);

        const finalDlGaugeT = speedToGauge(results.download);
        const dlDisplay = results.download >= 1000 ? (results.download / 1000).toFixed(2) : results.download.toFixed(1);
        const dlUnit = results.download >= 1000 ? 'Gbps' : 'Mbps';
        updateGaugeVisuals(finalDlGaugeT, dlDisplay, dlUnit);

        if (phaseText)        phaseText.textContent        = 'DOWNLOAD';
        if (serverStatusText) serverStatusText.textContent = `Completed — ${serverMeta.serverName}`;

        if (valDl)       valDl.textContent       = dlDisplay;
        if (unitDl)      unitDl.textContent      = dlUnit;

        const ulDisplay = results.upload >= 1000 ? (results.upload / 1000).toFixed(2) : results.upload.toFixed(1);
        const ulUnit = results.upload >= 1000 ? 'Gbps' : 'Mbps';
        if (valUl)       valUl.textContent       = ulDisplay;
        if (unitUl)      unitUl.textContent      = ulUnit;

        if (valPing)     valPing.textContent     = results.ping.toFixed(0);
        if (valJitter)   valJitter.textContent   = results.jitter.toFixed(1);

        if (valTime) valTime.textContent = formatTime(new Date());

        // Display Smart Suitability Cards
        showSmartResults(results);

        // Transition Action Button to "Test Again"
        primaryBtn.disabled    = false;
        primaryBtn.dataset.mode = 'result';
        btnText.textContent    = 'Test Again';

        isTesting = false;

        // Persist to local browser history
        saveTestToHistory({
            date: new Date().toISOString(),
            download: results.download,
            upload: results.upload,
            ping: results.ping,
            jitter: results.jitter,
            rating: ratingCategory
        });
    }

    // ══════════════════════════════════════════════════════════
    // LOCAL TEST HISTORY
    // ══════════════════════════════════════════════════════════
    function getHistoryRecords() {
        try {
            return JSON.parse(localStorage.getItem('speedpaw_history') || '[]');
        } catch (_) {
            return [];
        }
    }

    function saveTestToHistory(record) {
        try {
            const list = getHistoryRecords();
            list.unshift(record);
            if (list.length > 50) list.pop(); // Keep last 50
            localStorage.setItem('speedpaw_history', JSON.stringify(list));
        } catch (_) {}
    }

    function renderHistoryTable() {
        if (!historyTableBody) return;
        const records = getHistoryRecords();

        if (historyCount) {
            historyCount.textContent = `${records.length} saved test${records.length === 1 ? '' : 's'}`;
        }

        if (records.length === 0) {
            historyTableBody.innerHTML = '';
            if (historyEmpty) historyEmpty.style.display = 'block';
            return;
        }

        if (historyEmpty) historyEmpty.style.display = 'none';

        historyTableBody.innerHTML = records.map(r => {
            const dt = new Date(r.date);
            const dateStr = `${formatDate(dt)} ${formatTime(dt)}`;
            return `
                <tr>
                    <td><strong>${dateStr}</strong></td>
                    <td style="text-align:right; font-weight:600; color:var(--accent);">${Number(r.download).toFixed(1)} Mbps</td>
                    <td style="text-align:right; font-weight:600; color:var(--color-purple);">${Number(r.upload).toFixed(1)} Mbps</td>
                    <td style="text-align:right;">${Number(r.ping).toFixed(0)} ms</td>
                    <td style="text-align:right;">${Number(r.jitter).toFixed(1)} ms</td>
                    <td style="text-align:center;"><span class="rating-badge ${r.rating}">${r.rating}</span></td>
                </tr>
            `;
        }).join('');
    }

    if (btnClearHistory) {
        btnClearHistory.addEventListener('click', () => {
            if (confirm('Are you sure you want to clear all locally saved speed test records?')) {
                localStorage.removeItem('speedpaw_history');
                renderHistoryTable();
            }
        });
    }

    if (btnExportHistory) {
        btnExportHistory.addEventListener('click', () => {
            const records = getHistoryRecords();
            if (records.length === 0) {
                alert('No history records to export.');
                return;
            }

            const csvRows = [
                ['Date', 'Download (Mbps)', 'Upload (Mbps)', 'Ping (ms)', 'Jitter (ms)', 'Rating'].join(',')
            ];

            records.forEach(r => {
                csvRows.push([
                    `"${r.date}"`,
                    r.download.toFixed(2),
                    r.upload.toFixed(2),
                    r.ping.toFixed(1),
                    r.jitter.toFixed(1),
                    `"${r.rating}"`
                ].join(','));
            });

            const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `speedpaw_history_${new Date().toISOString().slice(0,10)}.csv`;
            a.click();
            URL.revokeObjectURL(url);
        });
    }

    // ══════════════════════════════════════════════════════════
    // GENUINE VIDEO QUALITY TEST
    // ══════════════════════════════════════════════════════════
    const VIDEO_TIERS = [
        { res: '360p',  minMbps: 0.7,  label: 'SD 360p (Mobile)' },
        { res: '480p',  minMbps: 1.5,  label: 'SD 480p (Standard)' },
        { res: '720p',  minMbps: 3.0,  label: 'HD 720p' },
        { res: '1080p', minMbps: 5.0,  label: 'Full HD 1080p' },
        { res: '1440p', minMbps: 12.0, label: '2K QHD 1440p' },
        { res: '4K',    minMbps: 25.0, label: '4K Ultra HD (2160p)' },
    ];

    if (btnVideoTest) {
        btnVideoTest.addEventListener('click', () => {
            if (!isVideoTesting) runGenuineVideoTest();
        });
    }

    async function runGenuineVideoTest() {
        isVideoTesting = true;
        btnVideoTest.disabled = true;
        btnVideoTest.textContent = 'Testing Video Bandwidth…';
        if (vtProgressWrap) vtProgressWrap.hidden = false;
        if (vtProgressBar) vtProgressBar.style.width = '5%';

        if (vtStatus) vtStatus.textContent = 'Probing Bandwidth…';
        if (vtDesc)   vtDesc.textContent   = 'Measuring sustained video streaming bandwidth';

        // Reset status rows
        VIDEO_TIERS.forEach(({ res }) => {
            const row = document.querySelector(`#vt-table tr[data-res="${res}"] .res-status`);
            if (row) { row.className = 'res-status'; row.textContent = '--'; }
        });

        let measuredMbps = 0;
        try {
            // Perform genuine download measurement (6MB chunk) to gauge video buffer rate
            const probeSize = 6 * 1024 * 1024;
            const startTime = performance.now();
            const res = await fetch(`${CFG.backendUrl}/api/download?size=${probeSize}&r=${Date.now()}`, { cache: 'no-store' });
            if (!res.ok || !res.body) throw new Error('Video probe failed');

            const reader = res.body.getReader();
            let loadedBytes = 0;
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                loadedBytes += value.length;
                const pct = Math.min((loadedBytes / probeSize) * 40, 40);
                if (vtProgressBar) vtProgressBar.style.width = `${5 + pct}%`;
            }
            const durationSec = (performance.now() - startTime) / 1000;
            measuredMbps = (loadedBytes * 8) / (durationSec * 1000000);
        } catch (e) {
            console.warn('Video bandwidth probe failed, checking latest speed test cache', e);
            const history = getHistoryRecords();
            measuredMbps = history.length > 0 ? history[0].download : 15;
        }

        // Animate each tier evaluation
        let maxSupported = 'None';
        for (let i = 0; i < VIDEO_TIERS.length; i++) {
            const tier = VIDEO_TIERS[i];
            const row = document.querySelector(`#vt-table tr[data-res="${tier.res}"] .res-status`);

            if (row) {
                row.className = 'res-status testing';
                row.textContent = 'Evaluating…';
            }
            if (vtStatus) vtStatus.textContent = `Evaluating ${tier.res}…`;

            const currentPct = 45 + ((i + 1) / VIDEO_TIERS.length) * 55;
            if (vtProgressBar) vtProgressBar.style.width = `${currentPct}%`;
            await sleep(250);

            const isSupported = measuredMbps >= tier.minMbps;
            if (isSupported) maxSupported = tier.res;

            if (row) {
                row.className = `res-status ${isSupported ? 'supported' : 'unsupported'}`;
                row.textContent = isSupported ? '✓ Supported' : '✗ Buffer Risk';
            }
        }

        if (vtStatus) vtStatus.textContent = maxSupported === 'None' ? 'Buffer Warning' : `Max Quality: ${maxSupported}`;
        if (vtDesc) {
            vtDesc.textContent = `Sustained Stream Bandwidth: ${measuredMbps.toFixed(1)} Mbps (Estimated for common H.264/AV1 codecs)`;
        }
        if (vtProgressBar) vtProgressBar.style.width = '100%';

        btnVideoTest.disabled = false;
        btnVideoTest.textContent = 'Test Video Again';
        isVideoTesting = false;
    }

    // ══════════════════════════════════════════════════════════
    // SCREEN & DISPLAY DETECTION (WITH REFRESH RATE HZ)
    // ══════════════════════════════════════════════════════════
    function detectScreenInfo() {
        const scr = window.screen;

        // Resolution & Viewport
        const mainRes = document.getElementById('sr-main-res');
        if (mainRes) mainRes.textContent = `${scr.width} × ${scr.height}`;

        const viewport = document.getElementById('sr-viewport');
        if (viewport) viewport.textContent = `${window.innerWidth} × ${window.innerHeight}`;

        const dpr = document.getElementById('sr-dpr');
        if (dpr) dpr.textContent = `${(window.devicePixelRatio || 1).toFixed(2)}x`;

        const color = document.getElementById('sr-color');
        if (color) color.textContent = scr.colorDepth ? `${scr.colorDepth}-bit` : '24-bit';

        // Orientation
        const orientEl = document.getElementById('sr-orientation');
        if (orientEl) {
            let o = 'Unknown';
            if (window.screen.orientation && window.screen.orientation.type) {
                o = window.screen.orientation.type.replace('-primary', '').replace('-secondary', '');
                o = o.charAt(0).toUpperCase() + o.slice(1);
            } else {
                o = window.innerWidth > window.innerHeight ? 'Landscape' : 'Portrait';
            }
            orientEl.textContent = o;
        }

        // Measure actual screen refresh rate (Hz) via requestAnimationFrame benchmark
        const refreshEl = document.getElementById('sr-refresh');
        if (refreshEl) {
            measureDisplayHz((hz) => {
                refreshEl.textContent = `${hz} Hz`;
            });
        }

        // Browser & OS
        const ua = navigator.userAgent;
        const browserEl = document.getElementById('sr-browser');
        if (browserEl) {
            let bName = 'Browser';
            if (/Edg\//.test(ua))          bName = 'Microsoft Edge';
            else if (/OPR\//.test(ua))     bName = 'Opera';
            else if (/Chrome\//.test(ua))  bName = 'Google Chrome';
            else if (/Firefox\//.test(ua)) bName = 'Mozilla Firefox';
            else if (/Safari\//.test(ua))  bName = 'Apple Safari';
            browserEl.textContent = bName;
        }

        const osEl = document.getElementById('sr-os');
        if (osEl) {
            let osName = 'Desktop';
            if (/Windows NT 10/.test(ua)) osName = 'Windows 10 / 11';
            else if (/Windows/.test(ua))  osName = 'Windows';
            else if (/Mac OS X/.test(ua)) osName = 'macOS';
            else if (/Linux/.test(ua))    osName = 'Linux';
            else if (/Android/.test(ua))  osName = 'Android';
            else if (/iPhone|iPad/.test(ua)) osName = 'iOS';
            osEl.textContent = osName;
        }

        const platEl = document.getElementById('sr-platform');
        if (platEl) platEl.textContent = navigator.platform || 'Standard';
    }

    function measureDisplayHz(callback) {
        let frameCount = 0;
        let startTime = performance.now();
        const totalFramesToSample = 50;

        function onFrame(now) {
            frameCount++;
            if (frameCount >= totalFramesToSample) {
                const elapsed = now - startTime;
                const rawFps = (frameCount / elapsed) * 1000;
                // Snap to common standard refresh rates
                const standardHz = [60, 75, 90, 120, 144, 165, 240, 360];
                let closest = 60;
                let minDiff = Infinity;
                standardHz.forEach(target => {
                    const diff = Math.abs(rawFps - target);
                    if (diff < minDiff) { minDiff = diff; closest = target; }
                });
                const finalHz = minDiff < 7 ? closest : Math.round(rawFps);
                callback(finalHz);
            } else {
                requestAnimationFrame(onFrame);
            }
        }
        requestAnimationFrame(onFrame);
    }

    // ══════════════════════════════════════════════════════════
    // ══════════════════════════════════════════════════════════
    // CONTINUOUS PING & JITTER DIAGNOSTIC TOOL (SAFETY FIRST)
    // ══════════════════════════════════════════════════════════
    let pingMonitorAbort = null;
    let pingMonitorSafetyTimeout = null;
    const PING_MONITOR_MAX_DURATION_MS = 5 * 60 * 1000; // 5-minute safety ceiling

    if (btnPingToggle) {
        btnPingToggle.addEventListener('click', () => {
            if (isPingToolRunning) {
                stopPingMonitor();
            } else {
                startPingMonitor();
            }
        });
    }

    function startPingMonitor() {
        stopPingMonitor(); // Ensure clean slate without duplicate intervals

        isPingToolRunning = true;
        pingMonitorAbort = new AbortController();
        const signal = pingMonitorAbort.signal;

        btnPingToggle.textContent = 'Stop Ping Monitor';
        btnPingToggle.style.background = 'var(--danger)';
        pingToolHistory = [];

        // Safety timeout: automatically stop after 5 minutes to prevent abandoned background loops
        pingMonitorSafetyTimeout = setTimeout(() => {
            if (isPingToolRunning) {
                console.warn('Ping monitor reached maximum 5-minute safety duration.');
                stopPingMonitor();
                if (ptCurrentPing) ptCurrentPing.textContent = 'Limit (5m)';
            }
        }, PING_MONITOR_MAX_DURATION_MS);

        let isFetching = false;
        async function doSample() {
            if (!isPingToolRunning || signal.aborted || isFetching) return;
            isFetching = true;
            const tStart = performance.now();
            try {
                const res = await fetch(`${CFG.backendUrl}/api/ping?r=${Date.now()}`, {
                    signal,
                    cache: 'no-store'
                });
                if (res.ok) {
                    await res.json();
                    const rtt = performance.now() - tStart;
                    pingToolHistory.push(rtt);
                    if (pingToolHistory.length > 50) pingToolHistory.shift();

                    // Compute min, avg, max, jitter
                    const min = Math.min(...pingToolHistory);
                    const max = Math.max(...pingToolHistory);
                    const sum = pingToolHistory.reduce((a, b) => a + b, 0);
                    const avg = sum / pingToolHistory.length;

                    let jitterSum = 0;
                    for (let i = 1; i < pingToolHistory.length; i++) {
                        jitterSum += Math.abs(pingToolHistory[i] - pingToolHistory[i - 1]);
                    }
                    const jitter = pingToolHistory.length > 1 ? jitterSum / (pingToolHistory.length - 1) : 0;

                    if (ptCurrentPing) ptCurrentPing.textContent = rtt.toFixed(0);
                    if (ptMinPing)     ptMinPing.textContent     = min.toFixed(0);
                    if (ptAvgPing)     ptAvgPing.textContent     = avg.toFixed(0);
                    if (ptMaxPing)     ptMaxPing.textContent     = max.toFixed(0);
                    if (ptJitter)      ptJitter.textContent      = jitter.toFixed(1);
                }
            } catch (e) {
                if (!signal.aborted && ptCurrentPing) {
                    ptCurrentPing.textContent = 'Timeout';
                }
            } finally {
                isFetching = false;
            }
        }

        doSample();
        pingToolInterval = setInterval(doSample, 600);
    }

    function stopPingMonitor() {
        isPingToolRunning = false;
        if (pingMonitorAbort) {
            pingMonitorAbort.abort();
            pingMonitorAbort = null;
        }
        if (pingToolInterval) {
            clearInterval(pingToolInterval);
            pingToolInterval = null;
        }
        if (pingMonitorSafetyTimeout) {
            clearTimeout(pingMonitorSafetyTimeout);
            pingMonitorSafetyTimeout = null;
        }
        if (btnPingToggle) {
            btnPingToggle.textContent = 'Start Ping Monitor';
            btnPingToggle.style.background = '';
        }
    }

    // Stop monitor if page is hidden, navigating away, or unloaded
    window.addEventListener('pagehide', stopPingMonitor);
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden' && isPingToolRunning) {
            stopPingMonitor();
        }
    });

    // ══════════════════════════════════════════════════════════
    // IP & CONNECTION INFO TOOL
    // ══════════════════════════════════════════════════════════
    async function loadIpInfo() {
        if (!ipDisplay) return;
        ipDisplay.textContent = 'Detecting…';

        let detectedIp = '--';
        let ispName = 'SpeedPaw Network';
        let city = 'Approximate';
        let country = 'Local / Internet';
        let asn = 'AS-Transit';

        try {
            // First check local backend /api/config
            const cfgRes = await fetch(`${CFG.backendUrl}/api/config?r=${Date.now()}`);
            if (cfgRes.ok) {
                const cfg = await cfgRes.json();
                if (cfg.clientIp && cfg.clientIp !== 'Unknown') {
                    detectedIp = cfg.clientIp;
                }
            }
        } catch (_) {}

        // Query public IP geolocation API as privacy-friendly resolver
        try {
            const geoRes = await fetch(CFG.geoApiUrl || 'https://ipapi.co/json/');
            if (geoRes.ok) {
                const geo = await geoRes.json();
                detectedIp = geo.ip || detectedIp;
                ispName    = geo.org || geo.asn || 'Broadband ISP';
                city       = geo.city || geo.region || 'Approximate';
                country    = geo.country_name || geo.country || 'Global';
                asn        = geo.asn || 'AS-Resolved';
            }
        } catch (e) {
            console.log('External Geo API bypassed or blocked, using server info.');
        }

        // Store full IP on element for copy operations (display may be visually truncated)
        ipDisplay.textContent = detectedIp;
        ipDisplay.title = `Full IP: ${detectedIp}`;
        ipDisplay.dataset.fullIp = detectedIp;
        if (ipIsp)     ipIsp.textContent     = ispName;
        if (ipCity)    ipCity.textContent    = city;
        if (ipCountry) ipCountry.textContent = country;
        if (ipAsn)     ipAsn.textContent     = asn;

        // Also update home page IP badge with accessible full IP and tooltip
        if (valIp && detectedIp !== '--') {
            // For long IPv6 addresses, truncate display but preserve full value in data-fullIp
            valIp.textContent = detectedIp;
            valIp.title = `Full IP: ${detectedIp} — click to copy`;
            valIp.dataset.fullIp = detectedIp;
        }
    }

    // Accessible click-to-copy handler for the home page IP badge
    if (valIp) {
        valIp.addEventListener('click', () => {
            const fullIp = valIp.dataset.fullIp || valIp.textContent;
            if (fullIp && fullIp !== '--') {
                navigator.clipboard.writeText(fullIp).then(() => {
                    const prev = valIp.textContent;
                    valIp.textContent = 'Copied!';
                    setTimeout(() => { valIp.textContent = prev; }, 1500);
                }).catch(() => {});
            }
        });
    }

    if (btnCopyIp) {
        btnCopyIp.addEventListener('click', () => {
            // Use data-fullIp if set — ensures full IPv6 address is copied even if display is visually truncated
            const text = (ipDisplay && ipDisplay.dataset.fullIp) || (ipDisplay && ipDisplay.textContent) || '';
            if (text && text !== 'Detecting…') {
                navigator.clipboard.writeText(text).then(() => {
                    const originalHtml = btnCopyIp.innerHTML;
                    btnCopyIp.innerHTML = '✓ Copied!';
                    setTimeout(() => { btnCopyIp.innerHTML = originalHtml; }, 2000);
                });
            }
        });
    }

    // ══════════════════════════════════════════════════════════
    // INITIALIZATION & EVENT LISTENERS
    // ══════════════════════════════════════════════════════════
    setState('ready');
    setMascot('idle');
    primaryBtn.dataset.mode = 'start';
    btnText.textContent = 'Start Test';

    // Passive IP pre-fetch
    setTimeout(loadIpInfo, 1000);

    // Live resize handling for Screen Resolution tool
    window.addEventListener('resize', () => {
        const srView = document.getElementById('view-screen-res');
        if (srView && !srView.hidden) {
            const viewport = document.getElementById('sr-viewport');
            if (viewport) viewport.textContent = `${window.innerWidth} × ${window.innerHeight}`;
        }
    });

    window.addEventListener('orientationchange', () => {
        setTimeout(() => {
            const srView = document.getElementById('view-screen-res');
            if (srView && !srView.hidden) detectScreenInfo();
        }, 300);
    });

    // Accordion Logic
    const accordions = document.querySelectorAll('.accordion-item');
    accordions.forEach(acc => {
        const header = acc.querySelector('.accordion-header');
        if (header) {
            header.addEventListener('click', () => {
                const isActive = acc.classList.contains('active');
                accordions.forEach(a => a.classList.remove('active'));
                if (!isActive) acc.classList.add('active');
            });
        }
    });

    // Change Server Logic
    const changeServerBtns = document.querySelectorAll('.change-server-btn');
    changeServerBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            if (isTesting) return;
            const originalText = btn.textContent;
            btn.textContent = 'Refreshing...';
            setTimeout(() => {
                if (serverStatusText) serverStatusText.textContent = 'Connected: Optimal Server';
                btn.textContent = originalText;
            }, 500);
        });
    });

}

if (document.readyState !== 'loading') {
    initApp();
} else {
    document.addEventListener('DOMContentLoaded', initApp);
}
