/**
 * k6 README — Stress Testing Suite
 * ────────────────────────────────────────────────────────────────────────────
 * This directory contains k6 performance tests for the SoundCloud Clone API.
 * Target backend: FastAPI + PostgreSQL running at http://localhost:8000
 */

# k6 Stress Testing Suite

## Prerequisites

### 1. Install k6
```bash
# macOS (Homebrew)
brew install k6

# Direct download
# https://k6.io/docs/getting-started/installation/
```

### 2. Start the backend
```bash
cd Backend
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### 3. Obtain a test JWT token
```bash
curl -s -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"your@email.com","password":"yourpassword"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])"
```

---

## Test Files

| File | Purpose | Needs Token? | Needs TRACK_ID? |
|------|---------|-------------|----------------|
| `smoke.js` | Verify all endpoints are reachable | Optional | No |
| `auth.load.js` | Auth endpoints under load | No | No |
| `search.load.js` | Search endpoints — realistic query mix | Optional | No |
| `feed_tracks.load.js` | Feed + track streaming under load | **Yes** | **Yes** |
| `user_profile.load.js` | Profile, followers, follow/unfollow | **Yes** | No |

---

## Running Tests

### Smoke test first (always do this before load tests)
```bash
k6 run k6/smoke.js
```

### With a real backend URL
```bash
k6 run -e BASE_URL=http://localhost:8000 k6/smoke.js
```

### Auth load test (no credentials needed)
```bash
k6 run k6/auth.load.js
```

### Search load test
```bash
k6 run -e TOKEN=$MY_TOKEN k6/search.load.js
```

### Feed + Tracks load test (requires token and a real track ID)
```bash
k6 run \
  -e TOKEN=$MY_TOKEN \
  -e TRACK_ID=<uuid-of-a-real-track> \
  k6/feed_tracks.load.js
```

### User profile load test
```bash
k6 run \
  -e TOKEN=$MY_TOKEN \
  -e TARGET_USER=testuser \
  k6/user_profile.load.js
```

### Run all tests sequentially and save results
```bash
for script in k6/smoke.js k6/auth.load.js k6/search.load.js; do
  k6 run --out json=results/$(basename $script .js).json $script
done
```

---

## Load Profile (Standard Stages)

```
VUs: 5 ──(30s)──► 20 ──(60s)──► 50 ──(30s)──► 5 ──(10s)──► 0
      warm-up       sustained      spike         cool-down
```

---

## Pass/Fail Thresholds

| Metric | Threshold |
|--------|-----------|
| `http_req_duration p(95)` | < 500 ms |
| `http_req_failed` | < 1 % |
| `auth_login_duration p(95)` | < 400 ms |
| `auth_refresh_duration p(95)` | < 300 ms |
| `feed_duration p(95)` | < 600 ms |
| `track_meta_duration p(95)` | < 300 ms |
| `user_me_duration p(95)` | < 300 ms |

A test **fails** if any threshold is breached. k6 exits with code 99.

---

## Results Interpretation for DevOps

After each run, k6 prints a summary. Key lines to check:

```
✓ http_req_duration.........: avg=123ms  p(90)=220ms  p(95)=310ms
✗ http_req_failed...........: 2.34%       ← BAD: exceeds 1% threshold
```

Export full JSON for log ingestion:
```bash
k6 run --out json=results/run.json k6/smoke.js
```

JSON output fields useful for log analysis:
- `metric` — metric name
- `type` — "Point"
- `data.value` — the measured value
- `data.tags.url` — which endpoint
- `data.tags.status` — HTTP status code
