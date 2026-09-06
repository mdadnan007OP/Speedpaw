# SpeedPaw Project

## Project
SpeedPaw - Free Internet Speed & Network Quality Tester

## Tagline
Know your Internet.

## Brand
- Friendly
- Modern
- Trustworthy
- Simple
- Mobile-first
- Mascot: cute friendly robot cat 🤖🐱

## Main Goal
Create a fast, user-friendly Internet speed testing website that measures:
- Download speed
- Upload speed
- Ping
- Jitter
- Stability

The website should explain the results in simple language.

## Main Features

### Speed Test
- Start Test
- Real-time progress
- Download speed
- Upload speed
- Ping
- Jitter
- Stability
- Test Again

### Smart Results
Show:
- Internet Health Score
- Connection quality
- Simple explanation
- Recommended activities

### Estimated Video Quality
Estimate:
- 360p
- 480p
- 720p
- 1080p
- 1440p
- 4K

Do not claim to directly test Netflix, YouTube, or other streaming services.

### Gaming Quality
Estimate gaming suitability using:
- Ping
- Jitter
- Stability
- Packet loss when measurable

Do not claim to test specific games unless their servers are actually tested.

### Video Call Quality
Estimate suitability for:
- HD calls
- Group calls
- Large meetings

### Test History
Use browser local storage.

No accounts or database for V1.

## Robot Cat

The mascot should be:
- Cute
- Friendly
- Modern
- Simple
- Not childish
- Suitable for mobile and desktop

Expressions:
- Slow connection = concerned
- Average = happy
- Good = excited
- Excellent = celebrating

## Pages

Initial:
- Home
- Results
- About
- Privacy
- Terms
- Contact

Future:
- Gaming Test
- Video Quality Test
- Wi-Fi Test
- Ping Test
- Internet Guides
- Troubleshooting

## Design

- Mobile-first
- Responsive
- Fast
- Accessible
- Clean
- Professional
- Friendly
- Light mode
- Dark mode

Avoid unnecessary animations and clutter.

## Infrastructure

Frontend:
Cloudflare Pages

Backend:
Separate free-tier/always-free VPS for high-bandwidth speed testing.

The browser performs the measurements using the test server.

Do not use Cloudflare Workers as the primary high-bandwidth speed-test server.

## Development Strategy

Build the complete frontend first using simulated test data.

Do NOT connect the real speed-test server during the first version.

## Do NOT Add

- Login
- User accounts
- QR codes
- Result URLs
- Paid APIs
- Paid services
- Unnecessary database
- Cryptocurrency
- Social features

## Privacy

V1 should:
- Require no login
- Require no account
- Create no result URLs
- Use local browser storage for history
- Avoid unnecessary personal data collection

## Monetization

Advertising will be added later.

Do not add advertisements during initial development.

User experience comes before monetization.

## SEO

Future content should cover:
- Internet speed
- Download speed
- Upload speed
- Ping
- Jitter
- Wi-Fi
- Gaming
- Video streaming
- Video calls
- Internet troubleshooting

Content must be useful and original.

## Cost Goal

Target:
₹0/month during initial launch within available free-tier limits.

Never assume free infrastructure has unlimited bandwidth.

Build bandwidth limits and abuse protection before public launch.

## Security

Never expose:
- Passwords
- API keys
- Cloud credentials
- SSH private keys
- Environment secrets

Never put secrets in frontend JavaScript.

## Code

Prefer:
- HTML
- CSS
- JavaScript

Keep the project simple and maintainable.

Use semantic HTML.

Make the site keyboard accessible.

Optimize for mobile and performance.

Do not unnecessarily rewrite working code.

Do not add unnecessary dependencies.

## Versions

v0.1 - Complete frontend with simulated test
v0.2 - Real speed-test server
v0.3 - Smart results and quality analysis
v0.4 - Production hardening
v0.5 - SEO and growth
v1.0 - Public launch

## Current Version

v0.2 - Real Speed Test Architecture Implemented

### v0.2 Architecture Summary
- **Frontend Engine**: Replaced simulated timing loops in `script.js` with real measurements:
  - Latency: Multi-sample `fetch` with warmup drop, median ping, and mean absolute deviation jitter calculation.
  - Download: High-performance chunked `ReadableStream` reader using `fetch` to measure Mbps in real time with low memory footprint.
  - Upload: Binary array payload streamed via `XMLHttpRequest` tracking `xhr.upload.onprogress`.
  - Abort / Cancel: Integrated `AbortController` hooked into the primary button (`data-mode="cancel"`), cleanly halting streams.
  - Configuration: Isolated environment target via `config.js` (`window.SPEEDPAW_CONFIG`).
- **Backend Architecture (`server/`)**:
  - Dedicated Node.js & Express service designed for zero-cost deployment on Oracle Cloud Always Free (ARM Ampere A1).
  - Routes:
    - `/api/health`: Health check and timestamp.
    - `/api/config`: Dynamic server location and capability metadata.
    - `/api/ping`: Ultra-lightweight endpoint with no-cache headers.
    - `/api/download`: Cryptographically random uncompressible byte stream with backpressure handling (`res.write` / `drain`).
    - `/api/upload`: High-throughput stream consumer discarding chunks to measure ingress without disk I/O bottleneck.
  - Security: Rate limiting (`express-rate-limit`) and CORS restriction for production readiness.