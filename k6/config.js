/**
 * k6 Shared Configuration
 * ────────────────────────────────────────────────────────────────────────────
 * Centralises the base URL, default headers, and pass/fail thresholds so
 * every scenario script can import from one place.
 *
 * Override BASE_URL at runtime:
 *   k6 run -e BASE_URL=https://api.staging.example.com smoke.js
 */

export const BASE_URL = __ENV.BASE_URL || 'https://streamline-swp.duckdns.org/api';

/** Shared HTTP headers sent with every request. */
export function defaultHeaders(token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

/**
 * Standard thresholds applied to every scenario.
 * Scenarios may extend or override these.
 *
 * Definitions:
 *   http_req_duration p(95) < 500ms  — 95 % of requests complete under 500 ms
 *   http_req_failed   rate < 1 %     — fewer than 1 % of requests return a
 *                                      non-2xx / network-error response
 */
export const DEFAULT_THRESHOLDS = {
  http_req_duration: ['p(95)<500'],
  http_req_failed: ['rate<0.01'],
};

/**
 * Standard ramp-up stages used across load tests.
 *
 *  Stage 1 — 30 s warm-up to  5 VUs
 *  Stage 2 — 60 s ramp  to   20 VUs  (sustained load)
 *  Stage 3 — 30 s spike to   50 VUs  (peak stress)
 *  Stage 4 — 30 s ramp  back to  5 VUs
 *  Stage 5 — 10 s cool-down at  0 VUs
 */
export const STANDARD_STAGES = [
  { duration: '30s', target: 5  },
  { duration: '60s', target: 20 },
  { duration: '30s', target: 50 },
  { duration: '30s', target: 5  },
  { duration: '10s', target: 0  },
];

/** Lightweight stages for smoke tests — just prove endpoints respond. */
export const SMOKE_STAGES = [
  { duration: '10s', target: 2 },
  { duration: '10s', target: 0 },
];
