const express = require('express');
const router = express.Router();
const crypto = require('crypto');

// Pre-allocate a 1MB chunk of random data to stream
// Using random data prevents compression on the network from skewing results.
const CHUNK_SIZE = 1024 * 1024; 
const chunk = crypto.randomBytes(CHUNK_SIZE);

router.get('/', (req, res) => {
  // Prevent caching
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Content-Type', 'application/octet-stream');
  
  // Determine requested size (default 25 MB, max 100 MB)
  let requestedBytes = parseInt(req.query.size, 10);
  if (isNaN(requestedBytes) || requestedBytes <= 0) {
    requestedBytes = 25 * 1024 * 1024; 
  }
  const MAX_DOWNLOAD = 100 * 1024 * 1024;
  const targetBytes = Math.min(requestedBytes, MAX_DOWNLOAD);
  
  res.setHeader('Content-Length', targetBytes);

  let bytesSent = 0;

  function writeChunk() {
    let ok = true;
    while (bytesSent < targetBytes && ok) {
      const remaining = targetBytes - bytesSent;
      const bytesToWrite = Math.min(remaining, CHUNK_SIZE);
      const bufferToWrite = bytesToWrite === CHUNK_SIZE ? chunk : chunk.slice(0, bytesToWrite);
      
      ok = res.write(bufferToWrite);
      bytesSent += bytesToWrite;
    }
    
    if (bytesSent < targetBytes) {
      // Buffer full, wait for drain event before continuing
      res.once('drain', writeChunk);
    } else {
      res.end();
    }
  }

  // Handle client disconnects to stop streaming
  req.on('close', () => {
    bytesSent = targetBytes; // Stop the loop
  });

  writeChunk();
});

module.exports = router;
