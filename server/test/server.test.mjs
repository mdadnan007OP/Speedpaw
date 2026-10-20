import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serverDir = path.resolve(__dirname, '..');
const rootDir = path.resolve(serverDir, '..');

test('Download Route Limit: Enforces 50,000,000 bytes hard cap', () => {
  const content = fs.readFileSync(path.join(serverDir, 'routes', 'download.js'), 'utf8');
  assert.ok(content.includes('MAX_DOWNLOAD = 50000000'), 'Download route must cap at 50,000,000 bytes');
  assert.ok(content.includes('DEFAULT_DOWNLOAD = 10 * 1024 * 1024'), 'Download route default must be safe 10MB');
  assert.ok(content.includes("req.on('close'"), 'Must handle client disconnect cleanly');
});

test('Upload Route Limit: Enforces 50,000,000 bytes hard cap', () => {
  const content = fs.readFileSync(path.join(serverDir, 'routes', 'upload.js'), 'utf8');
  assert.ok(content.includes('MAX_UPLOAD = 50000000'), 'Upload route must cap at 50,000,000 bytes');
  assert.ok(content.includes("req.on('close'"), 'Upload route must handle close event');
});

test('Config Route: Reports environment variables with Hyderabad (ap-south-2) defaults', () => {
  const content = fs.readFileSync(path.join(serverDir, 'routes', 'config.js'), 'utf8');
  assert.ok(content.includes("process.env.SERVER_NAME || 'SpeedPaw Test Server'"));
  assert.ok(content.includes("process.env.SERVER_LOCATION || 'Hyderabad, India'"));
  assert.ok(content.includes("process.env.SERVER_REGION || 'ap-south-2'"));
  assert.ok(content.includes('Cache-Control'), 'Config route must prevent caching');
});

test('Frontend Config: Configures 50MB hard ceilings and 10s ceiling', () => {
  const content = fs.readFileSync(path.join(rootDir, 'config.js'), 'utf8');
  assert.ok(content.includes('maxDownloadBytes: 50000000'), 'config.js must set maxDownloadBytes to 50000000');
  assert.ok(content.includes('maxUploadBytes: 50000000'), 'config.js must set maxUploadBytes to 50000000');
  assert.ok(content.includes('maxPhaseDurationMs: 10000'), 'config.js must set maxPhaseDurationMs to 10000');
});

test('Frontend Script: Strict Mbps calculation and aggregate 50MB sharing', () => {
  const content = fs.readFileSync(path.join(rootDir, 'script.js'), 'utf8');
  assert.ok(content.includes('MAX_TOTAL_DOWNLOAD_BYTES'), 'Must define MAX_TOTAL_DOWNLOAD_BYTES');
  assert.ok(content.includes('MAX_TOTAL_UPLOAD_BYTES'), 'Must define MAX_TOTAL_UPLOAD_BYTES');
  assert.ok(content.includes('totalBytesDownloaded * 8'), 'Must derive download Mbps strictly from actual bytes');
  assert.ok(content.includes('totalBytesUploaded * 8'), 'Must derive upload Mbps strictly from actual bytes');
});

test('Video Capability: Real download measurement basis without simulation', () => {
  const scriptContent = fs.readFileSync(path.join(rootDir, 'script.js'), 'utf8');
  assert.ok(!scriptContent.includes('history[0].download : 15'), 'Must not contain simulated 15 Mbps fallback');
  assert.ok(scriptContent.includes('Speed Test Required'), 'Must prompt for speed test if no measurement');
  assert.ok(scriptContent.includes('updateVideoQualityEstimate'), 'Must provide updateVideoQualityEstimate');

  const indexContent = fs.readFileSync(path.join(rootDir, 'index.html'), 'utf8');
  assert.ok(indexContent.includes('Estimated video streaming capability'), 'Must label as estimated capability');
  assert.ok(indexContent.includes('Indicative estimates based on measured network throughput'), 'Must include disclaimer');
});
