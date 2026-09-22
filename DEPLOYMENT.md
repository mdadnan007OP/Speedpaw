# SpeedPaw Production Deployment & Hardening Guide

This document contains step-by-step instructions to deploy and production-harden **SpeedPaw** on the target production infrastructure architecture:

- **Frontend**: Hosted on **Cloudflare Pages** (Free, Unlimited Bandwidth, Global CDN, SSL)
- **Speed-Test Backend**: Hosted on an **AWS EC2 Linux Instance** in **ap-south-2 (Hyderabad, India)** (AWS Free Tier / cloud credits eligible)

```
                       ┌────────────────────────────────┐
                       │       Cloudflare Pages         │
                       │     (speedpaw.com frontend)    │
                       └───────────────┬────────────────┘
                                       │
                      Direct In-Browser Speed Tests
                                       │
                                       ▼
                       ┌────────────────────────────────┐
                       │        AWS EC2 Instance        │
                       │    (test.speedpaw.com backend) │
                       │    Caddy/Nginx + Express Node  │
                       └────────────────────────────────┘
```

---

## 1. Architecture Overview

To ensure speed measurements are accurate and unthrottled, high-bandwidth download (25 MB+) and upload (8 MB+) test streams are **transferred directly between the user's browser and the dedicated AWS EC2 backend**.

> [!IMPORTANT]
> Download/Upload traffic must **NOT** be proxied through Cloudflare Workers or Cloudflare CDN proxy ("Orange Cloud"), as CDN edge buffering and connection limits will skew bandwidth calculations.

---

## 2. AWS EC2 Instance Setup (Hyderabad, India / ap-south-2)

### Cost & Free Tier Considerations:
AWS offers Free Tier benefits (such as 750 hours per month for eligible micro instances like `t4g.micro` or `t3.micro` for 12 months for new accounts) or promotional cloud credits. Ensure you monitor your AWS usage and data transfer costs according to your AWS account tier.

### Recommended Instance Types:
1. **t4g.micro (Arm64)**: 2 vCPUs, 1 GB RAM (Ubuntu 24.04 / 22.04 LTS Arm64) — **Recommended**
2. **t3.micro / t2.micro (x86_64)**: 2 vCPUs, 1 GB RAM (Ubuntu 24.04 / 22.04 LTS x86_64)

### A. Launch EC2 Instance
1. Log in to [AWS Management Console](https://aws.amazon.com/console/).
2. Select Region: **Asia Pacific (Hyderabad) `ap-south-2`**.
3. Navigate to **EC2** → **Launch Instance**.
4. Image (AMI): **Ubuntu Server 24.04 LTS** (or 22.04 LTS).
5. Instance Type: Select **`t4g.micro`** or **`t3.micro`** (or your preferred micro shape).
6. Key Pair: Select or create an SSH key pair (`chmod 600 id_rsa`).
7. Click **Launch Instance** and allocate/associate an Elastic IP (or note the assigned Public IPv4 address).

### B. Configure AWS Security Group (Cloud Firewall)
1. Under **Network settings** / **Security Groups**, select your Security Group and edit **Inbound Rules**:
   - **SSH**: Type `SSH`, Port `22`, Source `0.0.0.0/0` (or your specific IP)
   - **HTTP**: Type `HTTP`, Port `80`, Source `0.0.0.0/0`
   - **HTTPS**: Type `HTTPS`, Port `443`, Source `0.0.0.0/0`
   - **Description**: `HTTP and HTTPS for SpeedPaw Backend`
2. Save rules.

---

## 3. Server Setup & Linux Configuration

SSH into your AWS EC2 instance:
```bash
ssh -i /path/to/private_key ubuntu@<YOUR_AWS_EC2_PUBLIC_IP>
```

### A. OS Updates & Local Firewall
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y ufw curl git build-essential

# Open essential firewall ports
sudo ufw allow 22/tcp   # SSH
sudo ufw allow 80/tcp   # HTTP
sudo ufw allow 443/tcp  # HTTPS
sudo ufw --force enable
```

### B. Install Node.js 20 LTS
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node -v # Verify v20.x is displayed
npm -v
```

---

## 4. SpeedPaw Backend Installation

### A. Deploy Backend Code
```bash
# Clone repository into home directory
cd /home/ubuntu
git clone https://github.com/your-username/Speedpaw.git

# Install production dependencies
cd /home/ubuntu/Speedpaw/server
npm install --omit=dev
```

### B. Configure Production Environment Variables
Create `/home/ubuntu/Speedpaw/server/.env`:
```bash
cat << 'EOF' > /home/ubuntu/Speedpaw/server/.env
PORT=3001
NODE_ENV=production
ALLOWED_ORIGINS=https://speedpaw.pages.dev
SERVER_NAME=SpeedPaw AWS Hyderabad Node 1
SERVER_LOCATION=Hyderabad, India
SERVER_REGION=ap-south-2
EOF
```

---

## 5. Systemd Process Manager Setup

Create `/etc/systemd/system/speedpaw-backend.service`:
```bash
sudo tee /etc/systemd/system/speedpaw-backend.service > /dev/null << 'EOF'
[Unit]
Description=SpeedPaw Real Speed-Test Express Backend
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/home/ubuntu/Speedpaw/server
EnvironmentFile=/home/ubuntu/Speedpaw/server/.env
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=5
LimitNOFILE=65535

[Install]
WantedBy=multi-user.target
EOF
```

Enable and start the service:
```bash
sudo systemctl daemon-reload
sudo systemctl enable speedpaw-backend
sudo systemctl start speedpaw-backend

# Check status and logs
sudo systemctl status speedpaw-backend
sudo journalctl -u speedpaw-backend -n 50 --no-pager
```

---

## 6. Reverse Proxy & HTTPS Evaluation

### Reverse Proxy Comparison: Caddy vs. Nginx

| Feature | Caddy (Recommended) | Nginx |
| :--- | :--- | :--- |
| **HTTPS Setup** | **Automatic** (Built-in ACME Let's Encrypt renewal) | Manual (`certbot` + cron job setup) |
| **Streaming / Buffering** | Unbuffered streaming by default (`flush_interval -1`) | Requires explicit `proxy_buffering off;` & `proxy_request_buffering off;` |
| **Config Complexity** | Minimal (10 lines Caddyfile) | Moderate (Requires custom timeouts and body limits) |
| **HTTP/2 & HTTP/3** | Supported out of the box | Supported with extra configuration |

### Option 1: Caddy Installation (Recommended)
```bash
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update
sudo apt install caddy
```

Copy `Caddyfile.example` to `/etc/caddy/Caddyfile`:
```bash
sudo cp /home/ubuntu/Speedpaw/Caddyfile.example /etc/caddy/Caddyfile
# Replace speedtest-server-domain with your actual domain (e.g., test.speedpaw.com)
```

Apply Caddy configuration:
```bash
sudo systemctl reload caddy
```

### Option 2: Nginx Alternative
If you prefer Nginx:
```bash
sudo apt install -y nginx certbot python3-certbot-nginx
```

Copy `nginx.conf.example` to `/etc/nginx/sites-available/speedpaw`:
```bash
sudo cp /home/ubuntu/Speedpaw/nginx.conf.example /etc/nginx/sites-available/speedpaw
# Replace speedtest-server-domain with test.speedpaw.com in file
sudo sed -i 's/speedtest-server-domain/test.speedpaw.com/g' /etc/nginx/sites-available/speedpaw
sudo ln -s /etc/nginx/sites-available/speedpaw /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx

# Issue HTTPS SSL Certificate
sudo certbot --nginx -d test.speedpaw.com --non-interactive --agree-tos -m admin@speedpaw.com
```

---

## 7. DNS Configuration

In your DNS Provider (Cloudflare DNS or Domain Registrar):
- **Record Type**: `A`
- **Name**: `test` (for `test.speedpaw.com`)
- **IP Address**: `<YOUR_AWS_EC2_PUBLIC_IP>`
- **Proxy Status**: **DNS Only (Grey Cloud)** — *Crucial: High-throughput speed testing must bypass Cloudflare Workers / CDN proxy to avoid bandwidth throttling and edge buffering.*

---

## 8. Cloudflare Pages Frontend Deployment

1. Log in to [Cloudflare Dashboard](https://dash.cloudflare.com/) → **Workers & Pages** → **Create application** → **Pages** → **Connect to Git**.
2. Select your `Speedpaw` repository.
3. Configure Build Settings:
   - **Framework preset**: `None`
   - **Build command**: *(leave empty)*
   - **Build output directory**: `/` (root)
4. Click **Save and Deploy**.
5. Custom Domain: Add `speedpaw.com` in Pages **Custom Domains** settings.

---

## 9. Frontend Production Configuration

Before public launch, update `config.js` on your repository root (or set `window.SPEEDPAW_OVERRIDE_URL`):

```javascript
window.SPEEDPAW_CONFIG = {
  // Auto-detects local vs production:
  backendUrl: window.SPEEDPAW_OVERRIDE_URL || (isLocal
    ? 'http://localhost:3001'
    : 'https://test.speedpaw.com'),

  pingCount: 10,
  pingWarmup: 2,
  downloadSize: 25 * 1024 * 1024,
  concurrentStreams: 3,
  uploadSize: 8 * 1024 * 1024,
  geoApiUrl: 'https://ipapi.co/json/'
};
```

---

## 10. Production Test Checklist

Before opening the site to public users, complete this checklist:

- [ ] **Backend Reachable**: `curl -i https://test.speedpaw.com/api/health` returns `200 OK` and `{"status":"ok"}`.
- [ ] **HTTPS Working**: Valid SSL certificate issued via Let's Encrypt; HTTP requests automatically redirect to HTTPS.
- [ ] **CORS Restriction Active**: Cross-origin requests from authorized domains (`https://speedpaw.pages.dev`) succeed; unauthorized origins receive CORS rejection.
- [ ] **Ping Test**: Latency calculation completes accurately within 10 RTT samples; discarded warmup samples prevent TCP handshake distortion.
- [ ] **Jitter Calculation**: RFC 3550 mean deviation of consecutive packet delays produces realistic jitter values (ms).
- [ ] **Download Test**: 3 concurrent streams fetch uncompressible random binary data without proxy buffering skew.
- [ ] **Upload Test**: Binary octet stream payload uploads via `XMLHttpRequest` with live progress tracking and zero disk writing.
- [ ] **Repeated Runs**: Successive speed tests run cleanly without state corruption or stalled connections.
- [ ] **Test Cancellation**: Clicking **Cancel** mid-test instantly aborts all active `fetch` signals and `XMLHttpRequest` streams.
- [ ] **No Stale UI / Leaks**: Memory remains stable under continuous testing; progress gauges reset cleanly.
- [ ] **Console Cleanliness**: Zero JavaScript errors or unhandled promise rejections in browser Developer Tools.
- [ ] **Network Requests Clean**: All test calls complete with `200 OK`; no CORS, mixed-content, or timeout errors.
- [ ] **Mobile Responsiveness**: Test flow, touch controls, and robot cat mascot animations function seamlessly on iOS and Android devices.
- [ ] **Desktop Compatibility**: Layout, 3D mascot expressions, and Smart Results render perfectly on Chrome, Firefox, Safari, and Edge.

---

## 11. Technical Accuracy & Benchmarking Warning

> [!WARNING]
> **Measurement Accuracy Note**:
> SpeedPaw performs genuine network bandwidth measurements directly within the browser using Web API streams and high-throughput backend endpoints. However, in-browser speed measurements are subject to browser engine limits, device CPU state, Wi-Fi hardware, and background browser extensions.
>
> SpeedPaw should **NOT** be claimed to be "more accurate than Ookla Speedtest". Thorough real-world benchmarking against dedicated network hardware nodes across diverse connection speeds (10 Mbps to 1 Gbps) should be conducted after initial deployment to fine-tune stream concurrency and chunk parameters.
