const express = require('express');
const router = express.Router();

// A lightweight route designed to respond as quickly as possible.
// Intentionally avoiding JSON serialization overhead for raw pinging if possible,
// but JSON is fine for simplicity here.
router.get('/', (req, res) => {
  // Prevent caching
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  
  res.json({ ts: Date.now(), r: req.query.r || '' });
});

module.exports = router;
