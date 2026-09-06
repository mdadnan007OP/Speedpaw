# SpeedPaw Production Deployment Guide

This guide provides instructions for deploying SpeedPaw to production with a **₹0/month budget** within free-tier limits:

- **Frontend**: Hosted globally on **Cloudflare Pages** (Free, Unlimited Bandwidth, Global CDN, SSL)
- **Speed-Test Backend**: Hosted on a dedicated **Oracle Cloud Always Free VM** (10 TB/month outbound bandwidth, low latency, dedicated compute)

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
                       │  Oracle Cloud Always Free VM   │
                       │    (test.speedpaw.com backend) │
                       │    Nginx + Node.js (systemd)   │
                       └────────────────────────────────┘
```

---

## 1. Oracle Cloud Always Free VM Setup

### Recommended Free Tier Instance Options:
1. **Ampere A1 (Arm)**: 1–4 OCPUs, 6–24 GB RAM (Ubuntu 22.04 or 24.04 Arm64 / Oracle Linux 9) — **Recommended**
2. **AMD E2.1.Micro (x86)**: 1 OCPU, 1 GB RAM (Ubuntu 22.04 LTS / Oracle Linux 9)

### A. Create Compute Instance
1. In Oracle Cloud Console: **Compute** → **Instances** → **Create Instance**.
2. Select Image: **Canonical Ubuntu 22.04** (or Oracle Linux 9).
3. Select Shape: **Always Free Eligible** (Ampere A1 or VM.Standard.E2.1.Micro).
4. Save your **SSH Private Key** to your computer.
5. Click **Create** and wait for the public IP address to be assigned.

### B. Configure Oracle Cloud VCN Security List (Ingress Firewall)
1. Go to **Networking** → **Virtual Cloud Networks** → Select your VCN → **Security Lists** → **Default Security List**.
2. Click **Add Ingress Rules**:
   - **Source CIDR**: `0.0.0.0/0`
   - **IP Protocol**: `TCP`
   - **Destination Port Range**: `80, 443`
   - **Description**: `HTTP and HTTPS for SpeedPaw speed-test server`
3. Save rule.

---

## 2. Server Setup & Linux Configuration

Connect to your Oracle VM via SSH:
```bash
ssh -i /path/to/your-private-key.key ubuntu@<YOUR_ORACLE_VM_IP>
```

### A. Update Linux and Configure OS Firewall
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y ufw curl git nginx certbot python3-certbot-nginx

# Open firewall ports
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable
```

*(Note for Oracle Linux users: use `firewall-cmd --permanent --add-port=80/tcp --add-port=443/tcp && firewall-cmd --reload`)*

### B. Install Node.js LTS
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node -v # Should display v20.x or higher
```

---

## 3. SpeedPaw Backend Installation

### A. Copy Backend Code to Server
Clone your repository or copy the `server/` directory to `/opt/speedpaw-server`:

```bash
sudo mkdir -p /opt/speedpaw-server
sudo chown -R ubuntu:ubuntu /opt/speedpaw-server

# If using git:
git clone https://github.com/your-username/Speedpaw.git /tmp/speedpaw-repo
cp -r /tmp/speedpaw-repo/server/* /opt/speedpaw-server/
rm -rf /tmp/speedpaw-repo

# Install production dependencies
cd /opt/speedpaw-server
npm install --omit=dev
```

### B. Create Production Environment Configuration
Create `/opt/speedpaw-server/.env`:
```bash
cat << 'EOF' > /opt/speedpaw-server/.env
PORT=3001
ALLOWED_ORIGINS=https://speedpaw.com,https://www.speedpaw.com,https://*.pages.dev
SERVER_NAME=SpeedPaw Frankfurt Primary
SERVER_LOCATION=Frankfurt, Germany
SERVER_REGION=eu-central-1
EOF
```

---

## 4. Set Up systemd Service (Auto-Start on Boot)

Create `/etc/systemd/system/speedpaw.service`:
```bash
sudo tee /etc/systemd/system/speedpaw.service > /dev/null << 'EOF'
[Unit]
Description=SpeedPaw Speed-Test Backend Service
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/opt/speedpaw-server
EnvironmentFile=/opt/speedpaw-server/.env
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
sudo systemctl enable speedpaw
sudo systemctl start speedpaw
sudo systemctl status speedpaw
```

---

## 5. Domain & HTTPS Setup (Nginx + Let's Encrypt)

### A. DNS Configuration
In your DNS provider (e.g. Cloudflare or domain registrar), create an `A` record:
- **Type**: `A`
- **Name**: `test` (for `test.speedpaw.com`)
- **Value**: `<YOUR_ORACLE_VM_PUBLIC_IP>`
- **Proxy Status**: **DNS Only** (Grey Cloud if using Cloudflare DNS — speed tests transfer high data volumes which Cloudflare CDN proxies may throttle or cache).

### B. Nginx Reverse Proxy Configuration
Create `/etc/nginx/sites-available/speedpaw`:
```bash
sudo tee /etc/nginx/sites-available/speedpaw > /dev/null << 'EOF'
server {
    listen 80;
    server_name test.speedpaw.com;

    # Maximum allowed request body for upload testing (100MB)
    client_max_body_size 100M;
    client_body_buffer_size 128k;

    # Disable buffering for real-time speed measurement
    proxy_buffering off;
    proxy_request_buffering off;
    proxy_read_timeout 120s;
    proxy_send_timeout 120s;

    # Disable gzip/brotli compression so raw bytes are accurately measured
    gzip off;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

sudo ln -s /etc/nginx/sites-available/speedpaw /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

### C. Issue Free Let's Encrypt SSL Certificate
```bash
sudo certbot --nginx -d test.speedpaw.com --non-interactive --agree-tos -m admin@speedpaw.com
```
Certbot automatically configures HTTPS and sets up auto-renewal cron jobs.

---

## 6. Cloudflare Pages Frontend Deployment

### A. Push Code to GitHub
Ensure your repository is pushed to GitHub.

### B. Connect Cloudflare Pages
1. Log in to [Cloudflare Dashboard](https://dash.cloudflare.com/) → **Workers & Pages** → **Create application** → **Pages** → **Connect to Git**.
2. Select the `Speedpaw` repository.
3. Configure Build Settings:
   - **Framework preset**: `None`
   - **Build command**: `(leave empty)`
   - **Build output directory**: `/` (or root)
4. Click **Save and Deploy**.

### C. Custom Domain on Cloudflare Pages
1. In Cloudflare Pages project settings, go to **Custom domains** → **Set up a custom domain**.
2. Enter `speedpaw.com` (and `www.speedpaw.com`).
3. Follow the one-click DNS activation.

---

## 7. Point Frontend to Production Backend

Before deploying to production, update `config.js` on `main` branch:

```javascript
window.SPEEDPAW_CONFIG = {
  // Point to your production Oracle VM endpoint:
  backendUrl: 'https://test.speedpaw.com',

  pingCount: 10,
  pingWarmup: 2,
  downloadSize: 25 * 1024 * 1024,
  concurrentStreams: 3,
  uploadSize: 8 * 1024 * 1024,
  geoApiUrl: 'https://ipapi.co/json/'
};
```

Commit and push to trigger an automatic instant deployment on Cloudflare Pages.

---

## 8. Verification & Production Health Checks

### CLI Verification:
```bash
# 1. Health check
curl -i https://test.speedpaw.com/api/health

# 2. Config check
curl -i https://test.speedpaw.com/api/config

# 3. Ping check
curl -i https://test.speedpaw.com/api/ping

# 4. Download test (1 MB)
curl -o /dev/null -w "%{size_download} bytes in %{time_total}s\n" https://test.speedpaw.com/api/download?size=1048576

# 5. Upload test (100 KB test payload)
head -c 102400 /dev/urandom | curl -X POST -H "Content-Type: application/octet-stream" --data-binary @- https://test.speedpaw.com/api/upload
```

### Browser Verification:
1. Open `https://speedpaw.com/`
2. Click **Start Test** → Verify Ping, Download, Upload phases transition smoothly.
3. Check robot cat reactions (alert during ping, focused during download/upload, celebration on completion).
4. Verify **Smart Results** cards display sensible ratings.
5. Click **Cancel** mid-test → Verify instant abort without errors.
6. Verify **Video Quality Test**, **Screen Resolution** (with live Hz), and **History** pages.
