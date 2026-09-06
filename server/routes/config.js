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
    location: process.env.SERVER_LOCATION || 'Oracle Cloud (Frankfurt/London)',
    region: process.env.SERVER_REGION || 'eu-central',
    clientIp: clientIp.replace('::ffff:', ''),
    protocol: req.protocol.toUpperCase() + '/' + req.httpVersion,
    version: '0.2.0'
  });
});

module.exports = router;
