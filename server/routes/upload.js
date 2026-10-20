const express = require('express');
const router = express.Router();

// Hard ceiling per upload request (50,000,000 bytes hard cap)
const MAX_UPLOAD = 50000000;

router.post('/', (req, res) => {
  // Prevent caching
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  const startTime = Date.now();
  let receivedBytes = 0;
  let aborted = false;

  // We manually handle the 'data' events to count bytes and discard them immediately
  // This avoids storing buffers in memory or writing to disk.
  req.on('data', (chunk) => {
    if (aborted) return;
    receivedBytes += chunk.length;
    if (receivedBytes > MAX_UPLOAD) {
      aborted = true;
      req.destroy();
    }
  });

  req.on('end', () => {
    if (aborted) return;
    const durationMs = Date.now() - startTime;
    res.json({
      status: 'ok',
      received: receivedBytes,
      durationMs: durationMs
    });
  });

  req.on('close', () => {
    aborted = true;
  });

  req.on('error', (err) => {
    aborted = true;
    if (!res.headersSent) {
      res.status(500).json({ error: 'Upload failed or aborted' });
    }
  });
});

module.exports = router;
