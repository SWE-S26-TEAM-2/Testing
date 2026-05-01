# E2E Testing Strategy - Implementation Summary

This document captures everything that was built across the three repos plus the perf project and CI matrix, as the synthesis of four parallel build workers.

Plan: [e2e_testing_strategy_audit_e82ab5b1.plan.md](/Users/peter/.cursor/plans/e2e_testing_strategy_audit_e82ab5b1.plan.md)

---

## 1. What was delivered

### 1A. Frontend (Next.js + Playwright + Jest)

Repo: `/Users/Peter/Documents/University/SoftwareProject/Frontend/media`

**New (15 files)**

- `playwright.config.ts` - dual project: `chromium-mock` (port 3100, `NEXT_PUBLIC_USE_MOCK_API=true`) + `chromium-real` (port 3101, real backend, `storageState`).
- `e2e/real/global-setup.ts` - idempotent register -> verify-email (token override / `VERIFICATION_BACKDOOR`) -> login -> persist `e2e/real/.auth/storageState.json`.
- `e2e/real/storage-state-path.ts` - shared storage-state path constant.
- `e2e/real/fixtures/api-client.ts` - token-aware `fetch` wrapper (`apiRequest`, `apiLogin`, `apiSearchTracks`, `apiCreatePlaylist`, `apiUploadTrackMultipart`, `getSeedToken`, `isStorageStateAuthenticated`).
- `e2e/real/fixtures/sample-mp3.ts` - resolves fixture mp3 via `SAMPLE_MP3_PATH` or `e2e/real/fixtures/sample.mp3`.
- `e2e/real/fixtures/README.md` - env vars + ffmpeg one-liner for the silent fixture.
- `e2e/real/.auth/.gitignore`
- 7 real-API specs (~740 LoC test code + 740 LoC harness):
  - `auth-real.spec.ts` (113) - register, login good/bad, refresh, logout, /users/me 401 cleared.
  - `upload-real.spec.ts` (116) - UI upload through `/creator/upload` + direct multipart.
  - `track-real.spec.ts` (121) - play -> POST `/tracks/{id}/plays` -> verify play_count.
  - `search-real.spec.ts` (101) - seed unique-keyword track, query, click-through.
  - `profile-real.spec.ts` (116) - follow / unfollow with `POST/DELETE /users/{u}/follow` interception.
  - `playlist-real.spec.ts` (87) - create -> add track -> like -> delete.
  - `settings-real.spec.ts` (86) - PATCH `/users/me` (bio), `/users/me/privacy`, `/users/me/username` 4xx-on-conflict.
- `.github/workflows/frontend.yml` - jest + playwright-mock active; playwright-real `if: false` stubbed with TODO + secret stubs.

**Edited (12 files)**

- `package.json` - added `test:e2e:mock`, `test:e2e:real`; `test:e2e` runs both.
- `.gitignore` - excludes `e2e/real/.auth/`, `e2e/real/fixtures/sample.mp3`.
- `src/components/Toggle/Toggle.tsx` - adds `role="switch"`, `aria-checked`, `data-state`.
- `src/components/Footer/Footer.tsx` - adds `data-testid="player-progress"`, `player-progress-fill`.
- `src/services/mocks/upload.mock.ts` - sentinel POST `/api/tracks` so `page.route` can count attempts and force 5xx.
- `e2e/tests/search.spec.ts` - real Enter assertion; un-skipped + implemented results / empty / click-through, gated by `test.info().project.name`.
- `e2e/tests/auth-negative.spec.ts` - replaced tautological `expect(isVisible || true).toBe(true)`.
- `e2e/tests/navigation-stability.spec.ts` - replaced 6+ `if (await link.isVisible())` gates with `expect(link).toBeVisible()`.
- `e2e/tests/settings.spec.ts` - removed `getComputedStyle` color-poll -> `aria-checked`; added auth seed.
- `e2e/tests/settings-state.spec.ts` - `getToggleState` now reads `aria-checked` / `data-state` first.
- `e2e/tests/upload-validation.spec.ts` - implemented invalid file type + upload failure (`page.route` -> 500).
- `e2e/tests/upload-flow.spec.ts` - `[MOCK]` console assertion replaced with `page.route` count.
- `src/__tests__/Footer.test.tsx` - real `expect` assertions on volume / progress / queue / drag / audio sync.
- `src/__tests__/Header.test.tsx` - filled three empty `waitFor` blocks.
- `src/__tests__/components/TrackCard.test.tsx` - like-toggle now actually distinguishes increment vs decrement.

`npx tsc --noEmit` passes; `npx playwright test --list` reports **97 mock + 16 real** tests parsing cleanly.

### 1B. Cross-Platform (Flutter)

Repo: `/Users/Peter/Documents/University/SoftwareProject/Cross-Platform`

**New (10 files)**

- `.github/workflows/flutter.yml` - analyze + unit jobs; integration job gated `if: false` until a runner with emulator/chromedriver lands.
- `integration_test/player/mini_player_integration_test.dart`
- `integration_test/profile/profile_screen_test.dart`
- `integration_test/library/library_actions_test.dart`
- `integration_test/upload/upload_flow_test.dart` (skip until UploadScreen exists)
- `integration_test/messaging/conversations_test.dart` (skip until messaging exists)
- `integration_test/settings/settings_test.dart` (skip until settings exists)
- `integration_test/auth/logout_test.dart`
- `integration_test/auth/oauth_test.dart`
- `integration_test/real_api/real_api_smoke_test.dart` - runs only with `--dart-define=BACKEND_URL=...`.

**Edited (12 files)**

- `lib/main.dart` - `ProviderScope`, `kUseMockAuth = bool.fromEnvironment('USE_MOCK_AUTH', defaultValue: true)`, registered `/profile` and `/change_password` routes.
- `lib/services/mock_auth_service.dart` - added no-op `logout()` for parity.
- `lib/screens/auth/login_screen.dart` - `ConsumerStatefulWidget`; mock path preserved, real-Dio path consumes `authProvider`.
- `lib/screens/auth/signup_screen.dart` - same dual-mode pattern.
- `lib/screens/auth/welcome_screen.dart` - keys.
- `lib/screens/auth/forget_password_screen.dart` - inline `forgot.error` / `forgot.success` Text widgets.
- `lib/widgets/social_buttons.dart` - `login.google`, `login.facebook`.
- `lib/widgets/mini_player.dart` - `miniPlayer.{root,title,playPause,favorite}`.
- `lib/screens/home/today_pick_card.dart` - `home.todayPick.0`.
- `lib/screens/home/your_likes_card.dart` - `home.trackTile.<id>` per tile.
- `lib/screens/library/library_screen.dart` - `ConsumerWidget`, section keys, `library.logout` IconButton.
- `lib/screens/upgrade/upgrade_screen.dart` - `upgrade.subscribe`, `upgrade.faq.expand`.
- `lib/screens/profile/profile_screen.dart` - `profile.{playlistsTab,tracksTab}`.
- `lib/screens/profile/widgets/profile_header_section.dart` - `profile.username`, `profile.followBtn` (mapped to existing Edit IconButton; see anomalies).
- `lib/screens/search/search_screen.dart` - `search.{field,results,empty}`.
- `lib/navigation/bottom_nav_bar.dart` - `nav.{home,feed,search,library,upgrade}`.
- `integration_test/helpers/app_test_helpers.dart` - added `byKey`, `keyedField`, `keyedButton`, `tapKey`, `enterTextByKey`, `welcomeTaglineFinder`; replaced `simulateLogout` TODO with the real Library-tab logout flow.

### 1C. Backend (FastAPI + pytest)

Repo: `/Users/Peter/Documents/University/SoftwareProject/Backend`

**New (14 files)**

- `tests/api/__init__.py`, `tests/api/conftest.py` - TestClient + in-memory SQLite + StaticPool + `auth_headers` / seed fixtures / `tmp_upload_dir`.
- `tests/api/test_root.py` - `GET /` health check.
- `tests/api/test_auth_router.py` - register / 409 dup / login / 401 wrong / 403 unverified / refresh / logout / 429 rate limit.
- `tests/api/test_follower_router.py` - follow self -> 400, double-follow -> 400, unfollow -> 204 / 409, block, pagination 422, private profile.
- `tests/api/test_notification_router.py` - 401 unauth, mark-read, 403 on other user's notif, pagination 422, idempotent read-all.
- `tests/api/test_messaging_router.py` - self-conv 400, non-existent user 400, all-null body 422, track-only 201, mark-read non-participant 403.
- `tests/api/test_search_playlists.py` - `/search/playlists?keyword=` 200, missing keyword 422.
- `tests/api/test_oversize_uploads.py` - track / cover / avatar / user-cover oversize -> **400** (services raise 400; TODO inline to flip to 413/422).
- `tests/api/test_playlist_extras.py` - liked, like / 400 idempotent, cover upload, 403 on other-user mutation.
- `tests/api/test_engagement_router.py` - like/unlike, repost, comment 1..500 + 422 outside, pagination, 403 cross-user.
- `tests/api/test_openapi_snapshot.py` - compares `app.openapi()` to `tests/api/snapshots/openapi.json`; first-run writes; refresh via `UPDATE_OPENAPI_SNAPSHOT=1`.
- `tests/api/snapshots/.gitkeep`
- `.github/workflows/backend.yml` - lint -> unit -> api -> openapi (Ubuntu, Python 3.12, Postgres 15 service, pip cache).

**Edited (4 files)**

- `app/main.py` - `app.include_router(engagement_router)` (engagement routes now live).
- `pytest.ini` - `testpaths = tests/unit tests/api`.
- `tests/unit/test_user_profile_router.py` - 6 `[401, 403]` blurs -> strict `== 401`.
- `tests/unit/test_playlist_router.py` - `[401, 403]` -> strict 401.
- `tests/unit/test_track_router.py` - 5 `[401, 403]` -> strict; one ambiguous case left with `# TODO clarify auth contract`.

**Strict status codes settled (per actual service contract)**


| Case                              | Code                  |
| --------------------------------- | --------------------- |
| Missing auth                      | 401                   |
| Login wrong password              | 401                   |
| Login unverified                  | 403                   |
| Register duplicate                | 409                   |
| Follow self                       | 400                   |
| Double-follow                     | 400                   |
| Like a track twice                | 400                   |
| Repost twice                      | 400                   |
| Like a playlist twice             | 400                   |
| Mark other user's notif read      | 403                   |
| Conversation w/ non-existent user | 400                   |
| Send empty message                | 422                   |
| Track / cover / avatar oversize   | 400 (TODO -> 413/422) |
| Pagination out-of-range           | 422                   |
| Forgot-password rate limit        | 429 after 3           |
| Resend-verification rate limit    | 429 after 3           |


### 1D. Performance (k6) + CI orchestration

Repo: `/Users/Peter/Documents/University/SoftwareProject/Backend/tests/perf/`

**New k6 project (13 files, 1,693 LoC code + 162 LoC docs)**

- `README.md` - layout, env vars, run cmds, seeding, thresholds, troubleshooting.
- `lib/config.js` - `BASE`, env reading, `FLAGS.engagementMounted/verificationBackdoor`.
- `lib/auth.js` - `register`, `login`, `mustLogin`, `setupTestUser`, `verifyEmail`, `logout`, token cache.
- `lib/journeys.js` - `journey_listener`, `journey_creator`, `journey_social`, `journey_browse_anon`.
- `scenarios/smoke.js` (1 VU x 1 min)
- `scenarios/load.js` (50 VUs x 10 min, weighted 70/20/10)
- `scenarios/stress.js` (ramp 0->500 VU over 15 min)
- `scenarios/spike.js` (0->1000 VU in 30s)
- `scenarios/soak.js` (100 VU x 2h)
- `scenarios/streaming.js` (200 VU x 30 min, Range walk)
- `scenarios/chat.js` (constant-arrival-rate 33/s, 500 conversations)
- `scripts/seed.sh` - prefer `Backend/scripts/seed_team.py`, fallback to k6 seeder.
- `scripts/seed_perf.js` - k6-native seed.

**CI orchestration**

- `Backend/.github/workflows/perf-smoke.yml` - PostgreSQL service, alembic upgrade, uvicorn or `docker compose`, seed, `k6 run smoke.js`. Triggers: push, PR, nightly cron, `workflow_dispatch` with scenario dropdown for the long ones.
- `Testing/CI_README.md` - mermaid topology, secrets table, per-suite local commands, coverage matrix across 8 surfaces.

---

## 2. Cross-repo contract decisions left for you


| Decision                                                                                           | Where it bites                                                                                                                     |
| -------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Upload-size status (currently 400, audit suggested 413/422)                                        | `Backend/tests/api/test_oversize_uploads.py`, `Frontend/media/e2e/tests/upload-validation.spec.ts`, `e2e/real/upload-real.spec.ts` |
| Verification backdoor (`VERIFICATION_BACKDOOR=true` or `TEST_VERIFY_TOKEN_OVERRIDE`)               | `Frontend/media/e2e/real/global-setup.ts`, k6 seeders                                                                              |
| Settings drift - 4 FE settings tabs (advertising, content, notifications, 2FA) have no BE endpoint | `Frontend/media/e2e/real/settings-real.spec.ts` (currently `test.skip`)                                                            |
| Profile follow control in Flutter currently maps to Edit IconButton                                | `Cross-Platform/lib/screens/profile/widgets/profile_header_section.dart`, `integration_test/profile/profile_screen_test.dart`      |
| Pre-existing test bug: `Send reset link` vs `Change password` label                                | `Cross-Platform/integration_test/authentication/authentication_test.dart`, `stability_test.dart`                                   |


---

## 3. To bring everything green locally / in CI

1. Set GitHub secrets on the repos: `BACKEND_URL`, optionally `VERIFICATION_BACKDOOR`, `TEST_VERIFY_TOKEN_OVERRIDE`, `K6_CLOUD_TOKEN`.
2. Backend: run `pytest tests/api -q` once and commit `Backend/tests/api/snapshots/openapi.json`.
3. Backend up: `cd Backend && uvicorn app.main:app --host 0.0.0.0 --port 8000`.
4. Frontend: `BACKEND_URL=http://localhost:8000 npm run test:e2e` from `Frontend/media`.
5. Flutter: `flutter test` and `flutter test integration_test --dart-define=USE_MOCK_AUTH=true` from `Cross-Platform`.
6. k6: `k6 run Backend/tests/perf/scenarios/smoke.js` after seeding (`Backend/scripts/seed_team.py` then optional `tests/perf/scripts/seed_perf.js`).
7. Drop a real silent mp3 at `Frontend/media/e2e/real/fixtures/sample.mp3` (or set `SAMPLE_MP3_PATH`) - the ffmpeg one-liner is in the fixtures README.

---

## 4. CI workflows wired


| Workflow                                        | Purpose                                                            |
| ----------------------------------------------- | ------------------------------------------------------------------ |
| `Frontend/media/.github/workflows/frontend.yml` | jest + playwright-mock active; playwright-real stubbed `if: false` |
| `Cross-Platform/.github/workflows/flutter.yml`  | analyze + unit; integration gated `if: false`                      |
| `Backend/.github/workflows/backend.yml`         | lint -> unit -> api -> openapi snapshot                            |
| `Backend/.github/workflows/perf-smoke.yml`      | k6 smoke nightly + on demand for long scenarios                    |


Top-level orchestration doc: [Testing/CI_README.md](/Users/Peter/Documents/University/SoftwareProject/Testing/CI_README.md).

---

## 5. Coverage delta


| Surface                          | Before                                              | After                                                                                                                                        |
| -------------------------------- | --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Frontend Playwright real-API     | 0                                                   | 16 specs across 7 files                                                                                                                      |
| Frontend repaired weak tests     | 6 weak / skipped                                    | All implemented or strengthened                                                                                                              |
| Frontend Jest outcome assertions | Footer + Header + TrackCard had silent gaps         | Filled                                                                                                                                       |
| Flutter integration suites       | 4 (auth/nav/search/stability)                       | 9 (added player/profile/library/logout/oauth + 3 ready-to-promote skips + real-API smoke)                                                    |
| Flutter semantic Keys            | 0                                                   | ~25 across welcome/login/signup/forgot/nav/search/miniPlayer/home/library/upgrade/profile                                                    |
| Backend HTTP/contract tests      | 4 router files (tracks, profile, playlists, search) | 14 router test files (added auth, follower, notification, messaging, search-playlists, root, oversize, playlist-extras, engagement, openapi) |
| Backend engagement endpoints     | not mounted                                         | mounted + tested                                                                                                                             |
| Backend strict status codes      | many `[401,403]` blurs                              | strict per service contract                                                                                                                  |
| k6 perf scenarios                | 0                                                   | 7 scenarios + 4 reusable journeys + seeders                                                                                                  |
| CI workflows                     | per-repo informal                                   | 4 orchestrated workflows + top-level matrix doc                                                                                              |
