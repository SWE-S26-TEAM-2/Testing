/**
 * k6 Load Test — Authentication Endpoints
 * ────────────────────────────────────────────────────────────────────────────
 * Scenarios tested:
 *   1. POST /auth/login        — sustained login load (wrong-creds 401 flood)
 *   2. POST /auth/refresh      — token refresh under load
 *   3. POST /auth/check-email  — email uniqueness check (used during signup)
 *   4. POST /auth/register     — new user registration (low rate, unique data)
 *
 * Run:
 *   k6 run auth.load.js
 *   k6 run -e BASE_URL=https://api.staging.example.com auth.load.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { group } from 'k6';
import { Trend, Counter } from 'k6/metrics';
import { BASE_URL, defaultHeaders, STANDARD_STAGES, DEFAULT_THRESHOLDS } from './config.js';

// ── Custom metrics ────────────────────────────────────────────────────────────
const loginDuration     = new Trend('auth_login_duration',    true);
const refreshDuration   = new Trend('auth_refresh_duration',  true);
const registerDuration  = new Trend('auth_register_duration', true);
const loginFailures     = new Counter('auth_login_failures');

// ── Options ───────────────────────────────────────────────────────────────────
export const options = {
  stages: STANDARD_STAGES,
  thresholds: {
    ...DEFAULT_THRESHOLDS,
    // Auth endpoints must be fast — tighter than the global p95
    'auth_login_duration':    ['p(95)<400'],
    'auth_refresh_duration':  ['p(95)<300'],
    'auth_register_duration': ['p(95)<600'],
  },
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function uniqueEmail() {
  return `qa_load_${__VU}_${Date.now()}@example.com`;
}

// ── Virtual user scenario ─────────────────────────────────────────────────────
export default function () {
  const headers = defaultHeaders(null);

  // 1. Login with wrong credentials (tests auth throughput, not business logic)
  group('POST /auth/login (bad creds)', () => {
    const start = Date.now();
    const res = http.post(
      `${BASE_URL}/auth/login`,
      JSON.stringify({ email: 'loadtest@example.com', password: 'wrongpassword123!' }),
      { headers }
    );
    loginDuration.add(Date.now() - start);

    const ok = check(res, {
      'login returns 401 or 200': (r) => r.status === 401 || r.status === 200,
      'login response < 500ms':   (r) => r.timings.duration < 500,
    });
    if (!ok) loginFailures.add(1);
  });

  sleep(0.5);

  // 2. Email check — happens during registration flow
  group('POST /auth/check-email', () => {
    const res = http.post(
      `${BASE_URL}/auth/check-email`,
      JSON.stringify({ email: 'existing@example.com' }),
      { headers }
    );
    check(res, {
      'check-email returns 200 or 422': (r) => r.status === 200 || r.status === 422,
    });
  });

  sleep(0.5);

  // 3. Token refresh — only do this for every 10th VU to keep rate realistic
  if (__VU % 10 === 0) {
    group('POST /auth/refresh (with fake token)', () => {
      const start = Date.now();
      const res = http.post(
        `${BASE_URL}/auth/refresh`,
        JSON.stringify({ refresh_token: 'fake-refresh-token-for-load-test' }),
        { headers }
      );
      refreshDuration.add(Date.now() - start);
      check(res, {
        'refresh returns 401 or 200': (r) => r.status === 401 || r.status === 200,
      });
    });
  }

  sleep(0.5);

  // 4. Registration — only every 20th VU to avoid flooding with real writes
  if (__VU % 20 === 0) {
    group('POST /auth/register', () => {
      const start = Date.now();
      const res = http.post(
        `${BASE_URL}/auth/register`,
        JSON.stringify({
          email:    uniqueEmail(),
          password: 'LoadTestPw123!',
          username: `loaduser_${__VU}_${__ITER}`,
        }),
        { headers }
      );
      registerDuration.add(Date.now() - start);
      check(res, {
        'register returns 201 or 422': (r) => r.status === 201 || r.status === 422,
      });
    });
  }

  sleep(1);
}
