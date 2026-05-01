/**
 * k6 Load Test — Feed & Track Streaming Endpoints
 * ────────────────────────────────────────────────────────────────────────────
 * These are the highest-traffic authenticated endpoints:
 *   GET /feed                     — personalised activity feed
 *   GET /tracks/:id               — single track metadata
 *   GET /tracks/:id/stream        — streaming URL redirect
 *   POST /tracks/:id/plays        — play-count increment (write under load)
 *   GET /tracks/:id/waveform      — waveform data
 *
 * All require a valid JWT.  Supply one via:
 *   k6 run -e TOKEN=<jwt> -e TRACK_ID=<uuid> feed_tracks.load.js
 *
 * Without TOKEN the test still runs — all requests return 401 and
 * the reachability checks pass (server is up, auth is working).
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { group } from 'k6';
import { Trend, Counter } from 'k6/metrics';
import { BASE_URL, defaultHeaders, STANDARD_STAGES, DEFAULT_THRESHOLDS } from './config.js';

// ── Custom metrics ────────────────────────────────────────────────────────────
const feedDuration      = new Trend('feed_duration',         true);
const trackMetaDuration = new Trend('track_meta_duration',   true);
const trackPlayDuration = new Trend('track_play_duration',   true);
const waveformDuration  = new Trend('waveform_duration',     true);
const playErrors        = new Counter('track_play_errors');

// ── Options ───────────────────────────────────────────────────────────────────
export const options = {
  stages: STANDARD_STAGES,
  thresholds: {
    ...DEFAULT_THRESHOLDS,
    // Feed must be fast — it's the landing page after login
    'feed_duration':       ['p(95)<600', 'p(99)<1000'],
    // Track metadata fetches should be sub-300 ms (frequently cached)
    'track_meta_duration': ['p(95)<300'],
    // Waveform can take a bit longer
    'waveform_duration':   ['p(95)<600'],
  },
};

// ── Config ────────────────────────────────────────────────────────────────────
const TOKEN    = __ENV.TOKEN    || '';
const TRACK_ID = __ENV.TRACK_ID || 'test-track-id-placeholder';

// ── Virtual user scenario ─────────────────────────────────────────────────────
export default function () {
  const headers = defaultHeaders(TOKEN);

  // 1. Load the feed (primary landing after login — highest priority)
  group('GET /feed', () => {
    const start = Date.now();
    const res = http.get(`${BASE_URL}/feed`, { headers });
    feedDuration.add(Date.now() - start);

    check(res, {
      'feed 200 or 401':          (r) => r.status === 200 || r.status === 401,
      'feed response time < 1s':  (r) => r.timings.duration < 1000,
    });
  });

  sleep(0.5);

  // 2. Fetch individual track metadata
  group('GET /tracks/:id', () => {
    const start = Date.now();
    const res = http.get(`${BASE_URL}/tracks/${TRACK_ID}`, { headers });
    trackMetaDuration.add(Date.now() - start);

    check(res, {
      'track meta 200, 401, or 404': (r) =>
        [200, 401, 404].includes(r.status),
    });
  });

  sleep(0.3);

  // 3. Fetch waveform data (triggered on every track card mount)
  group('GET /tracks/:id/waveform', () => {
    const start = Date.now();
    const res = http.get(`${BASE_URL}/tracks/${TRACK_ID}/waveform`, { headers });
    waveformDuration.add(Date.now() - start);

    check(res, {
      'waveform 200, 401, or 404': (r) =>
        [200, 401, 404].includes(r.status),
    });
  });

  sleep(0.3);

  // 4. Record a play (write path — every play generates a DB write)
  group('POST /tracks/:id/plays', () => {
    const start = Date.now();
    const res = http.post(
      `${BASE_URL}/tracks/${TRACK_ID}/plays`,
      null,
      { headers }
    );
    trackPlayDuration.add(Date.now() - start);

    const ok = check(res, {
      'play count 200, 401, or 404': (r) =>
        [200, 401, 404].includes(r.status),
      'play response time < 500ms':  (r) => r.timings.duration < 500,
    });
    if (!ok) playErrors.add(1);
  });

  // Think time — simulate user listening before next interaction
  sleep(Math.random() * 3 + 1);
}
