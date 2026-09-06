const express = require('express');
const router = express.Router();

router.post('/', (req, res) => {
  const startTime = Date.now();
  let receivedBytes = 0;

  const MAX_UPLOAD = 100 * 1024 * 1024; // 100MB abuse cap

  // We manually handle the 'data' events to count bytes and discard them
  // This avoids storing large buffers in memory or writing to disk.
  req.on('data', (chunk) => {
    receivedBytes += chunk.length;
    if (receivedBytes > MAX_UPLOAD) {
      req.destroy();
    }
  });

  req.on('end', () => {
    const durationMs = Date.now() - startTime;
    res.json({
      status: 'ok',
      received: receivedBytes,
      durationMs: durationMs
    });
  });

  req.on('error', (err) => {
    if (!res.headersSent) {
      res.status(500).json({ error: 'Upload failed or aborted' });
    }
  });
});

module.exports = router;
