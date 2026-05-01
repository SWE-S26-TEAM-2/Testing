/**
 * k6 Load Test — Search Endpoints
 * ────────────────────────────────────────────────────────────────────────────
 * Search is the most read-heavy public surface — the goal is to confirm:
 *   - p95 latency stays under 500 ms at 50 concurrent users
 *   - The search service does not degrade under sustained parallel queries
 *   - Different query lengths / types are represented (realistic distribution)
 *
 * Endpoints:
 *   GET /search/tracks?q=<query>
 *   GET /search/users?q=<query>
 *   GET /search/playlists?q=<query>
 *   GET /search/albums?q=<query>
 *
 * Run:
 *   k6 run search.load.js
 *   k6 run -e BASE_URL=http://localhost:8000 -e TOKEN=<jwt> search.load.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { group } from 'k6';
import { Trend } from 'k6/metrics';
import { BASE_URL, defaultHeaders, STANDARD_STAGES, DEFAULT_THRESHOLDS } from './config.js';

// ── Custom metrics ────────────────────────────────────────────────────────────
const searchTracksDuration    = new Trend('search_tracks_duration',    true);
const searchUsersDuration     = new Trend('search_users_duration',     true);
const searchPlaylistsDuration = new Trend('search_playlists_duration', true);
const searchAlbumsDuration    = new Trend('search_albums_duration',    true);

// ── Options ───────────────────────────────────────────────────────────────────
export const options = {
  stages: STANDARD_STAGES,
  thresholds: {
    ...DEFAULT_THRESHOLDS,
    'search_tracks_duration':    ['p(95)<500', 'p(99)<800'],
    'search_users_duration':     ['p(95)<500'],
    'search_playlists_duration': ['p(95)<500'],
    'search_albums_duration':    ['p(95)<500'],
  },
};

// ── Realistic query pool ──────────────────────────────────────────────────────
const TRACK_QUERIES  = ['lofi', 'jazz', 'hip hop', 'ambient', 'chill beats', 'electronic', 'rock', 'pop'];
const USER_QUERIES   = ['john', 'dj', 'producer', 'artist', 'music'];
const ALBUM_QUERIES  = ['greatest hits', 'debut', 'live', 'acoustic'];
const LIST_QUERIES   = ['summer', 'workout', 'chill', 'morning'];

function randomPick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ── Virtual user scenario ─────────────────────────────────────────────────────
export default function () {
  const TOKEN   = __ENV.TOKEN || '';
  const headers = defaultHeaders(TOKEN);

  // Every VU runs a weighted mix: tracks (50%), users (25%), playlists (15%), albums (10%)
  const roll = Math.random();

  if (roll < 0.50) {
    // Track search — highest traffic
    group('GET /search/tracks', () => {
      const q = randomPick(TRACK_QUERIES);
      const start = Date.now();
      const res = http.get(
        `${BASE_URL}/search/tracks?q=${encodeURIComponent(q)}`,
        { headers }
      );
      searchTracksDuration.add(Date.now() - start);
      check(res, {
        'tracks search 200 or 401':   (r) => r.status === 200 || r.status === 401,
        'tracks response body exists': (r) => r.body && r.body.length > 0,
      });
    });

  } else if (roll < 0.75) {
    // User search
    group('GET /search/users', () => {
      const q = randomPick(USER_QUERIES);
      const start = Date.now();
      const res = http.get(
        `${BASE_URL}/search/users?q=${encodeURIComponent(q)}`,
        { headers }
      );
      searchUsersDuration.add(Date.now() - start);
      check(res, {
        'users search 200 or 401': (r) => r.status === 200 || r.status === 401,
      });
    });

  } else if (roll < 0.90) {
    // Playlist search
    group('GET /search/playlists', () => {
      const q = randomPick(LIST_QUERIES);
      const start = Date.now();
      const res = http.get(
        `${BASE_URL}/search/playlists?q=${encodeURIComponent(q)}`,
        { headers }
      );
      searchPlaylistsDuration.add(Date.now() - start);
      check(res, {
        'playlists search 200 or 401': (r) => r.status === 200 || r.status === 401,
      });
    });

  } else {
    // Album search
    group('GET /search/albums', () => {
      const q = randomPick(ALBUM_QUERIES);
      const start = Date.now();
      const res = http.get(
        `${BASE_URL}/search/albums?q=${encodeURIComponent(q)}`,
        { headers }
      );
      searchAlbumsDuration.add(Date.now() - start);
      check(res, {
        'albums search 200 or 401': (r) => r.status === 200 || r.status === 401,
      });
    });
  }

  // Think time — simulate user reading results before next search
  sleep(Math.random() * 2 + 0.5);
}
