/**
 * SpeedPaw Configuration
 * ────────────────────────────────────────────────────────────
 * Easily switch between Local Development and Production Server.
 * Set `backendUrl` to your dedicated Oracle Cloud Always Free VM
 * speed-test endpoint in production (e.g. 'https://test.speedpaw.com').
 */
window.SPEEDPAW_CONFIG = {
  // ── SERVER ENDPOINT ──────────────────────────────────────
  // Local development:
  backendUrl: 'http://localhost:3001',

  // Production (uncomment and replace when deployed to Oracle VM):
  // backendUrl: 'https://test.speedpaw.com',

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
  // Used as fallback for approximate ISP & City detection
  // Client IP is never stored permanently.
  geoApiUrl: 'https://ipapi.co/json/'
};
