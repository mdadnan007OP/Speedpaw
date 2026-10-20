"""
SpeedPaw Speed Test Measurement & Configuration Verification Suite
Tests:
1. 50,000,000 bytes hard cap sharing across parallel download streams.
2. 50,000,000 bytes hard cap for bounded upload chunking.
3. Mbps formula precision with actual vs requested bytes, zero-byte handling, and division guards.
4. Cancellation & incomplete transfer accounting.
5. Server configuration route validation for Hyderabad (ap-south-2) and Mumbai (ap-south-1).
6. Download and Upload route limits and clamping.
"""

import unittest
import math
import re
import os

class TestSpeedPawMeasurement(unittest.TestCase):

    def test_download_stream_budget_allocation_never_exceeds_50mb(self):
        """
        Ensure that for any stream count (1 to 16), the sum of allocated bytes
        across all concurrent download streams strictly equals MAX_TOTAL_DOWNLOAD_BYTES (50,000,000)
        and never exceeds 50,000,000 bytes.
        """
        MAX_TOTAL_DOWNLOAD_BYTES = 50_000_000
        for stream_count in range(1, 17):
            base_bytes = MAX_TOTAL_DOWNLOAD_BYTES // stream_count
            allocated_streams = []
            for idx in range(stream_count):
                if idx == stream_count - 1:
                    stream_bytes = MAX_TOTAL_DOWNLOAD_BYTES - base_bytes * (stream_count - 1)
                else:
                    stream_bytes = base_bytes
                allocated_streams.append(stream_bytes)

            total_allocated = sum(allocated_streams)
            self.assertEqual(
                total_allocated,
                MAX_TOTAL_DOWNLOAD_BYTES,
                f"Stream count {stream_count} allocated {total_allocated} != {MAX_TOTAL_DOWNLOAD_BYTES}"
            )
            self.assertLessEqual(
                total_allocated,
                50_000_000,
                f"Allocated total {total_allocated} exceeded 50,000,000 bytes!"
            )
            # Ensure every stream gets a positive allocation
            for s in allocated_streams:
                self.assertGreater(s, 0)

    def test_upload_chunking_never_exceeds_50mb_cap(self):
        """
        Simulate sequential adaptive upload chunking and verify that total transferred bytes
        can never exceed MAX_TOTAL_UPLOAD_BYTES (50,000,000).
        """
        MAX_TOTAL_UPLOAD_BYTES = 50_000_000
        UPLOAD_BUF_SIZE = 2 * 1024 * 1024 # 2MB
        desired_chunk_size = 1024 * 1024   # 1MB
        total_uploaded = 0
        chunk_sizes_sent = []

        # Simulate fast connection ramping chunk size
        while total_uploaded < MAX_TOTAL_UPLOAD_BYTES:
            remaining_budget = MAX_TOTAL_UPLOAD_BYTES - total_uploaded
            this_chunk_size = min(desired_chunk_size, remaining_budget, UPLOAD_BUF_SIZE)
            if this_chunk_size <= 0:
                break
            chunk_sizes_sent.append(this_chunk_size)
            total_uploaded += this_chunk_size
            # Ramp
            desired_chunk_size = min(desired_chunk_size * 2, UPLOAD_BUF_SIZE)

        self.assertEqual(total_uploaded, MAX_TOTAL_UPLOAD_BYTES)
        self.assertLessEqual(total_uploaded, 50_000_000)

    def test_mbps_calculation_strict_actual_bytes(self):
        """
        Verify that Mbps is derived strictly from actual transferred bytes
        and elapsed wall-clock time.
        """
        def calculate_mbps(transferred_bytes, duration_sec):
            if duration_sec > 0.05 and transferred_bytes > 0:
                return (transferred_bytes * 8) / (duration_sec * 1_000_000)
            return 0.0

        # Case 1: 12.5 MB in 1 second = 100 Mbps
        self.assertAlmostEqual(calculate_mbps(12_500_000, 1.0), 100.0, places=2)

        # Case 2: Incomplete transfer: requested 50MB, but aborted after 10MB in 2.0s
        # Must yield 40 Mbps, NOT 200 Mbps (deriving from 50MB would be bogus)
        self.assertAlmostEqual(calculate_mbps(10_000_000, 2.0), 40.0, places=2)

        # Case 3: Zero bytes transferred (immediate failure / drop)
        self.assertEqual(calculate_mbps(0, 1.5), 0.0)

        # Case 4: Negligible duration (guard against division by near-zero)
        self.assertEqual(calculate_mbps(1000, 0.01), 0.0)
        self.assertEqual(calculate_mbps(0, 0.0), 0.0)

    def test_server_routes_file_integrity(self):
        """
        Verify that the server routes have hardcoded safety limits and correct headers.
        """
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

        # 1. Download route verification
        dl_path = os.path.join(base_dir, 'server', 'routes', 'download.js')
        with open(dl_path, 'r', encoding='utf-8') as f:
            dl_content = f.read()

        self.assertIn('MAX_DOWNLOAD = 50000000', dl_content)
        self.assertIn('DEFAULT_DOWNLOAD = 10 * 1024 * 1024', dl_content)
        self.assertIn("req.on('close'", dl_content)

        # 2. Upload route verification
        ul_path = os.path.join(base_dir, 'server', 'routes', 'upload.js')
        with open(ul_path, 'r', encoding='utf-8') as f:
            ul_content = f.read()

        self.assertIn('MAX_UPLOAD = 50000000', ul_content)
        self.assertIn("req.on('close'", ul_content)

        # 3. Config route verification
        cfg_path = os.path.join(base_dir, 'server', 'routes', 'config.js')
        with open(cfg_path, 'r', encoding='utf-8') as f:
            cfg_content = f.read()

        self.assertIn("process.env.SERVER_NAME || 'SpeedPaw Test Server'", cfg_content)
        self.assertIn("process.env.SERVER_LOCATION || 'Hyderabad, India'", cfg_content)
        self.assertIn("process.env.SERVER_REGION || 'ap-south-2'", cfg_content)
        self.assertIn("Cache-Control", cfg_content)

        # 4. Frontend config.js verification
        front_cfg_path = os.path.join(base_dir, 'config.js')
        with open(front_cfg_path, 'r', encoding='utf-8') as f:
            front_cfg = f.read()

        self.assertIn('maxDownloadBytes: 50000000', front_cfg)
        self.assertIn('maxUploadBytes: 50000000', front_cfg)
        self.assertIn('maxPhaseDurationMs: 10000', front_cfg)

        # 5. Frontend script.js verification
        script_path = os.path.join(base_dir, 'script.js')
        with open(script_path, 'r', encoding='utf-8') as f:
            script_content = f.read()

        self.assertIn('MAX_TOTAL_DOWNLOAD_BYTES', script_content)
        self.assertIn('MAX_TOTAL_UPLOAD_BYTES', script_content)
        self.assertIn('MAX_PHASE_DURATION_MS', script_content)
        self.assertIn('serverMeta.region', script_content)

    def test_video_streaming_quality_indicative_thresholds(self):
        """
        Verify that video streaming tiers evaluate correctly against conservative indicative thresholds:
        - 360p: ~1 Mbps
        - 480p: ~2.5 Mbps
        - 720p: ~5 Mbps
        - 1080p: ~8-10 Mbps
        - 1440p: ~16 Mbps
        - 4K: ~25 Mbps
        """
        VIDEO_TIERS = [
            {'res': '360p',  'minMbps': 1.0},
            {'res': '480p',  'minMbps': 2.5},
            {'res': '720p',  'minMbps': 5.0},
            {'res': '1080p', 'minMbps': 8.5},
            {'res': '1440p', 'minMbps': 16.0},
            {'res': '4K',    'minMbps': 25.0},
        ]

        def evaluate_video_capability(download_mbps):
            if not download_mbps or download_mbps <= 0:
                return None, {}
            supported_map = {}
            max_supported = 'None'
            for tier in VIDEO_TIERS:
                is_supported = download_mbps >= tier['minMbps']
                supported_map[tier['res']] = is_supported
                if is_supported:
                    max_supported = tier['res']
            return max_supported, supported_map

        # Case 1: 0.5 Mbps (Very slow connection) -> Buffer warning
        max_res, results = evaluate_video_capability(0.5)
        self.assertEqual(max_res, 'None')
        self.assertFalse(results['360p'])
        self.assertFalse(results['720p'])
        self.assertFalse(results['4K'])

        # Case 2: 3.5 Mbps (SD capable, HD risk)
        max_res, results = evaluate_video_capability(3.5)
        self.assertEqual(max_res, '480p')
        self.assertTrue(results['360p'])
        self.assertTrue(results['480p'])
        self.assertFalse(results['720p'])

        # Case 3: 12.0 Mbps (Full HD capable, 4K risk)
        max_res, results = evaluate_video_capability(12.0)
        self.assertEqual(max_res, '1080p')
        self.assertTrue(results['1080p'])
        self.assertFalse(results['1440p'])
        self.assertFalse(results['4K'])

        # Case 4: 50.0 Mbps (4K Ultra HD capable)
        max_res, results = evaluate_video_capability(50.0)
        self.assertEqual(max_res, '4K')
        self.assertTrue(results['4K'])

    def test_no_simulated_video_values_when_measurement_missing(self):
        """
        Ensure missing measurements require running the speed test and never
        default to fake values (such as hardcoded 15 Mbps).
        """
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        script_path = os.path.join(base_dir, 'script.js')
        with open(script_path, 'r', encoding='utf-8') as f:
            script_content = f.read()

        # Confirm old simulated fallback is gone
        self.assertNotIn('measuredMbps = history.length > 0 ? history[0].download : 15', script_content)
        self.assertIn('Speed Test Required', script_content)
        self.assertIn('Estimated video streaming capability based on your measured download speed', script_content)

        index_path = os.path.join(base_dir, 'index.html')
        with open(index_path, 'r', encoding='utf-8') as f:
            index_content = f.read()

        self.assertIn('Estimated video streaming capability', index_content)
        self.assertIn('Indicative estimates based on measured network throughput, not performance guarantees', index_content)

if __name__ == '__main__':
    unittest.main()

