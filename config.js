/**
 * SpeedPaw Configuration
 * ────────────────────────────────────────────────────────────
 * Easily switch between Local Development and Production Server.
 *
 * Auto-detects local host vs production deployment, or uses
 * explicit override if set on window.SPEEDPAW_OVERRIDE_URL.
 */
(function() {
  const isLocal = window.location.hostname === 'localhost' ||
                  window.location.hostname === '127.0.0.1' ||
                  window.location.hostname === '';

  window.SPEEDPAW_CONFIG = {
    // ── SERVER ENDPOINT ──────────────────────────────────────
    // Auto-detects localhost for development, defaults to production backend domain in production.
    // Replace 'https://speedtest-server-domain' with your actual AWS EC2 domain or IP.
    backendUrl: window.SPEEDPAW_OVERRIDE_URL || (isLocal
      ? 'http://localhost:3001'
      : 'https://speedtest-server-domain'),

    // ── SPEED TEST TUNING ────────────────────────────────────
    // Ping measurement
    pingCount: 10,                 // Number of round-trip samples
    pingWarmup: 2,                 // Discard first N samples (TCP handshake / DNS warmup)

    // Download measurement
    downloadSize: 25 * 1024 * 1024, // 25 MB total test volume
    concurrentStreams: 3,          // Concurrent HTTP streams for bandwidth saturation

    // Upload measurement
    uploadSize: 8 * 1024 * 1024,   // 8 MB payload

    // ── CLIENT IP & GEO PROVIDER (Privacy-friendly) ───────────
    geoApiUrl: 'https://ipapi.co/json/'
  };
})();
