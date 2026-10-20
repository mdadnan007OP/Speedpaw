/**
 * SpeedPaw Configuration
 * ────────────────────────────────────────────────────────────
 * Easily switch between Local Development and Production Server.
 *
 * Auto-detects local host vs production deployment, or uses
 * explicit override if set on window.SPEEDPAW_OVERRIDE_URL.
 */
(function () {
  const isLocal = window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1';

  window.SPEEDPAW_CONFIG = {
    // ── SERVER ENDPOINT ──────────────────────────────────────
    // Production AWS EC2 speed test node in Hyderabad, India (Region: ap-south-2).
    // TODO: Future Multi-Server & Nearest-Server Selection Architecture:
    // Support dynamic array of edge endpoints (e.g. AWS Hyderabad, Mumbai, Singapore, Frankfurt).
    // Implement client-side lowest-ping auto-discovery and user manual override.
    backendUrl: window.SPEEDPAW_OVERRIDE_URL || (isLocal
      ? 'http://localhost:3001'
      : 'https://speedpaw-api.duckdns.org'),

    // ── SPEED TEST TUNING ────────────────────────────────────
    // Ping measurement
    pingCount: 10,                 // Number of round-trip samples
    pingWarmup: 2,                 // Discard first N samples (TCP handshake / DNS warmup)

    // Hard payload limits across all concurrent requests (50,000,000 bytes max)
    maxDownloadBytes: 50000000,    // Hard ceiling for entire download test
    maxUploadBytes: 50000000,      // Hard ceiling for entire upload test
    maxPhaseDurationMs: 10000,     // 10s maximum measurement ceiling per direction

    // Adaptive download streams
    concurrentStreams: 3,          // Concurrent HTTP streams for bandwidth saturation
    initialDownloadTarget: 10 * 1024 * 1024, // 10 MB initial target

    // Adaptive upload tuning
    initialUploadChunkSize: 1024 * 1024, // 1 MB initial upload chunk

    // Legacy fallback compatibility
    downloadSize: 25 * 1024 * 1024,
    uploadSize: 8 * 1024 * 1024,

    // ── CLIENT IP & GEO PROVIDER (Privacy-friendly) ───────────
    geoApiUrl: 'https://ipapi.co/json/'
  };
})();
