const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  // Prevent any caching of dynamic node configuration or client IP detection
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  const clientIp = req.headers['cf-connecting-ip'] ||
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.ip ||
    req.socket.remoteAddress ||
    'Unknown';

  res.json({
    serverName: process.env.SERVER_NAME || 'SpeedPaw Test Server',
    location: process.env.SERVER_LOCATION || 'Hyderabad, India',
    region: process.env.SERVER_REGION || 'ap-south-2',
    clientIp: clientIp.replace('::ffff:', ''),
    protocol: req.protocol.toUpperCase() + '/' + req.httpVersion,
    version: '0.2.1'
  });
});

module.exports = router;
