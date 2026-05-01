/**
 * k6 Load Test — User Profile & Follow/Follower Endpoints
 * ────────────────────────────────────────────────────────────────────────────
 * Endpoints:
 *   GET  /users/me                      — authenticated current user
 *   GET  /users/:username               — public profile fetch
 *   GET  /users/:username/followers     — follower list
 *   GET  /users/:username/following     — following list
 *   POST /users/:username/follow        — follow a user (write, rate-limited)
 *   DELETE /users/:username/follow      — unfollow (write)
 *
 * Run:
 *   k6 run -e TOKEN=<jwt> -e TARGET_USER=someusername user_profile.load.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { group } from 'k6';
import { Trend, Counter } from 'k6/metrics';
import { BASE_URL, defaultHeaders, STANDARD_STAGES, DEFAULT_THRESHOLDS } from './config.js';

// ── Custom metrics ────────────────────────────────────────────────────────────
const meDuration          = new Trend('user_me_duration',          true);
const profileDuration     = new Trend('user_profile_duration',     true);
const followersDuration   = new Trend('user_followers_duration',   true);
const followWriteDuration = new Trend('user_follow_write_duration', true);
const followErrors        = new Counter('user_follow_errors');

// ── Options ───────────────────────────────────────────────────────────────────
export const options = {
  stages: STANDARD_STAGES,
  thresholds: {
    ...DEFAULT_THRESHOLDS,
    'user_me_duration':          ['p(95)<300'],
    'user_profile_duration':     ['p(95)<400'],
    'user_followers_duration':   ['p(95)<500'],
    'user_follow_write_duration':['p(95)<600'],
  },
};

// ── Config ────────────────────────────────────────────────────────────────────
const TOKEN       = __ENV.TOKEN        || '';
const TARGET_USER = __ENV.TARGET_USER  || 'testuser';

// ── Virtual user scenario ─────────────────────────────────────────────────────
export default function () {
  const headers = defaultHeaders(TOKEN);

  // 1. Fetch own profile — called on every page load when logged in
  group('GET /users/me', () => {
    const start = Date.now();
    const res = http.get(`${BASE_URL}/users/me`, { headers });
    meDuration.add(Date.now() - start);

    check(res, {
      '/users/me returns 200 or 401': (r) => r.status === 200 || r.status === 401,
      '/users/me response < 300ms':   (r) => r.timings.duration < 300,
    });
  });

  sleep(0.3);

  // 2. View a public profile
  group('GET /users/:username', () => {
    const start = Date.now();
    const res = http.get(`${BASE_URL}/users/${TARGET_USER}`, { headers });
    profileDuration.add(Date.now() - start);

    check(res, {
      'profile 200, 401, or 404': (r) =>
        [200, 401, 404].includes(r.status),
    });
  });

  sleep(0.3);

  // 3. Fetch follower list — common on profile pages
  group('GET /users/:username/followers', () => {
    const start = Date.now();
    const res = http.get(
      `${BASE_URL}/users/${TARGET_USER}/followers`,
      { headers }
    );
    followersDuration.add(Date.now() - start);

    check(res, {
      'followers list 200, 401, or 404': (r) =>
        [200, 401, 404].includes(r.status),
    });
  });

  sleep(0.3);

  // 4. Follow / unfollow — only run for 10% of VUs to avoid flooding writes
  if (__VU % 10 === 0) {
    group('POST /users/:username/follow', () => {
      const start = Date.now();
      const res = http.post(
        `${BASE_URL}/users/${TARGET_USER}/follow`,
        null,
        { headers }
      );
      followWriteDuration.add(Date.now() - start);

      const ok = check(res, {
        'follow 200, 201, 401, or 404': (r) =>
          [200, 201, 401, 404].includes(r.status),
      });
      if (!ok) followErrors.add(1);
    });

    sleep(0.5);

    group('DELETE /users/:username/follow (unfollow)', () => {
      const res = http.del(
        `${BASE_URL}/users/${TARGET_USER}/follow`,
        null,
        { headers }
      );
      check(res, {
        'unfollow 200, 204, 401, or 404': (r) =>
          [200, 204, 401, 404].includes(r.status),
      });
    });
  }

  sleep(Math.random() * 2 + 0.5);
}
