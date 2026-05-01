/**
 * k6 Smoke Test — All Core Endpoints
 * ────────────────────────────────────────────────────────────────────────────
 * Purpose : Verify every critical backend route returns a sensible response
 *           under minimal load (2 VUs × 20 s) before running full load tests.
 *
 * Run (unauthenticated public endpoints only):
 *   k6 run smoke.js
 *
 * Run with a real bearer token:
 *   k6 run -e BASE_URL=http://localhost:8000 -e TOKEN=<jwt> smoke.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { BASE_URL, defaultHeaders, SMOKE_STAGES, DEFAULT_THRESHOLDS } from './config.js';

export const options = {
  stages: SMOKE_STAGES,
  thresholds: {
    ...DEFAULT_THRESHOLDS,
    // Smoke: every single request must succeed (stricter than load test)
    http_req_failed: ['rate<0.001'],
  },
};

const TOKEN = __ENV.TOKEN || '';

export default function () {
  const auth = defaultHeaders(TOKEN);

  // ── Auth ────────────────────────────────────────────────────────────────
  const loginRes = http.post(
    `${BASE_URL}/auth/login`,
    JSON.stringify({ email: 'test@example.com', password: 'wrongpassword' }),
    { headers: auth }
  );
  // 401 Unauthorized is the expected response for bad creds — still "up"
  check(loginRes, {
    'POST /auth/login reachable': (r) => r.status !== 0 && r.status !== 502,
  });

  // ── Search (public) ─────────────────────────────────────────────────────
  const searchTracksRes = http.get(
    `${BASE_URL}/search/tracks?q=lofi`,
    { headers: auth }
  );
  check(searchTracksRes, {
    'GET /search/tracks status 2xx or 401': (r) =>
      r.status === 200 || r.status === 401,
  });

  const searchUsersRes = http.get(
    `${BASE_URL}/search/users?q=john`,
    { headers: auth }
  );
  check(searchUsersRes, {
    'GET /search/users status 2xx or 401': (r) =>
      r.status === 200 || r.status === 401,
  });

  // ── Tracks ──────────────────────────────────────────────────────────────
  const tracksRes = http.get(
    `${BASE_URL}/tracks/nonexistent-track-id`,
    { headers: auth }
  );
  check(tracksRes, {
    'GET /tracks/:id reachable (404 or 200 or 401)': (r) =>
      [200, 401, 404].includes(r.status),
  });

  // ── Users ───────────────────────────────────────────────────────────────
  const meRes = http.get(`${BASE_URL}/users/me`, { headers: auth });
  check(meRes, {
    'GET /users/me reachable (200 or 401)': (r) =>
      r.status === 200 || r.status === 401,
  });

  // ── Feed ────────────────────────────────────────────────────────────────
  const feedRes = http.get(`${BASE_URL}/feed`, { headers: auth });
  check(feedRes, {
    'GET /feed reachable (200 or 401)': (r) =>
      r.status === 200 || r.status === 401,
  });

  sleep(1);
}
