const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

// Routes
const healthRoute = require('./routes/health');
const configRoute = require('./routes/config');
const pingRoute = require('./routes/ping');
const downloadRoute = require('./routes/download');
const uploadRoute = require('./routes/upload');

const app = express();
const PORT = process.env.PORT || 3001;

// Trust proxy for accurate client IP detection behind Nginx / Cloudflare
app.set('trust proxy', 1);

// Basic security / rate limiting (2000 requests per 15 mins per IP)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 2000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests from this IP, please try again in a few minutes.' }
});

app.use(limiter);

// Configure CORS
const configuredOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : null;

app.use(cors({
  origin: function (origin, callback) {
    // If no origin (e.g. mobile app, curl, server-to-server) or in open dev mode
    if (!origin) return callback(null, true);

    if (configuredOrigins && configuredOrigins.length > 0) {
      const isAllowed = configuredOrigins.some(allowed => {
        if (allowed === '*') return true;
        if (allowed.startsWith('*.')) {
          const domain = allowed.slice(2);
          return origin.endsWith(domain);
        }
        return origin === allowed;
      });
      if (isAllowed) return callback(null, true);
      return callback(new Error(`CORS origin ${origin} not permitted`), false);
    }

    // Default development mode allows local addresses and Cloudflare Pages previews
    if (
      origin.startsWith('http://localhost') ||
      origin.startsWith('http://127.0.0.1') ||
      origin.startsWith('https://localhost') ||
      origin.startsWith('https://127.0.0.1') ||
      origin.endsWith('.pages.dev') ||
      origin.includes('speedpaw.com')
    ) {
      return callback(null, true);
    }

    // Permit by default unless strictly configured otherwise in production
    return callback(null, true);
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Cache-Control', 'X-Requested-With'],
  credentials: false
}));

// We do NOT use express.json() or express.urlencoded() globally
// because the upload route streams raw bytes.

// Disable ETag and X-Powered-By to reduce header overhead
app.set('etag', false);
app.disable('x-powered-by');

// Register routes
app.use('/api/health', healthRoute);
app.use('/api/config', configRoute);
app.use('/api/ping', pingRoute);
app.use('/api/download', downloadRoute);
app.use('/api/upload', uploadRoute);

// Global 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`SpeedPaw backend listening on port ${PORT}`);
  console.log(`Configured Origins: ${configuredOrigins ? configuredOrigins.join(', ') : 'Permissive (Dev/Preview)'}`);
});

