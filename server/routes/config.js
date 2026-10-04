const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  const clientIp = req.headers['cf-connecting-ip'] ||
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.ip ||
    req.socket.remoteAddress ||
    'Unknown';

  res.json({
    serverName: process.env.SERVER_NAME || 'SpeedPaw Test Server',
    // TODO: Future Multi-Server/Nearest-Server: Return array of available test nodes from DB/config
    // and allow client to auto-select lowest-latency node.
    location: process.env.SERVER_LOCATION || 'Hyderabad, India',
    region: process.env.SERVER_REGION || 'ap-south-2',
    clientIp: clientIp.replace('::ffff:', ''),
    protocol: req.protocol.toUpperCase() + '/' + req.httpVersion,
    version: '0.2.0'
  });
});

module.exports = router;
