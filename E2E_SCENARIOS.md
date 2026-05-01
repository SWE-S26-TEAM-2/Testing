# SoundCloud-Clone - E2E Test Scenarios

Real user-behavior scenarios grounded in the surfaces that actually exist across the three repos. Scenarios that target unimplemented UI (Flutter upload / messaging / settings, FE forgot-password modal, FE OAuth redirect handler) are intentionally omitted.

> Revision note: corrections applied per code-grounded review of `Backend/app/schemas/auth_schema.py`, `Backend/app/services/{track,user,playlist,follower,auth,search}_service.py`, and `Backend/app/routers/{engagement,user_profile}.py`. Size limits, schema field names, route prefixes, and the privacy/follow contract were aligned to the live implementation. Net result: 60 - 1 (drop A12) - 1 (drop P8) - 1 (merge U4 into U2) + 7 BE-gap additions = **64 scenarios**.

Where to test legend:
- **PW-mock** = Frontend Playwright (`chromium-mock`, `NEXT_PUBLIC_USE_MOCK_API=true`)
- **PW-real** = Frontend Playwright (`chromium-real`, real backend, `storageState`)
- **FL** = Flutter integration (`flutter test integration_test`)
- **BE** = Backend pytest (`tests/api/`, FastAPI TestClient)
- **k6** = perf scenario (`Backend/tests/perf/scenarios/*`)

---

## 1. Auth

### A1 - First-time signup, email verification, then login
Steps:
1. POST `/auth/register` with fresh email + valid password (>= 8 chars)
2. Read verification token (test backdoor) and POST `/auth/verify-email`
3. POST `/auth/login` with `{ identifier: "<email-or-username>", password }` (`LoginRequest.identifier`, not `email`)
4. GET `/users/me` with returned access token

Expected: 201 on register, 200 on verify, 200 on login with `access_token` + `refresh_token`, 200 on `/users/me`.
Where: **BE** (canonical); **PW-real** for the UI happy path.

### A2 - Login via the LoginModal email-then-password flow
Steps:
1. From landing, click header "Sign in"
2. Type a registered email -> Continue
3. Confirm modal advances to password step
4. Type password -> Sign in
5. Wait for redirect to `/discover`

Expected: modal closes, URL becomes `/discover`, `auth_token` in `localStorage`. Note: at the BE the request body uses `identifier`; the FE form labels it "email" but the schema also accepts a username.
Where: **PW-real**.

### A3 - Login fails with bad password and shows inline error
Steps:
1. Open LoginModal, complete email step
2. Submit a wrong password

Expected: error visible inside modal, password field cleared/focused, `auth_token` absent. BE returns 401 strict (not 403).
Where: **PW-real** + **BE** (POST `/auth/login` with `{ identifier, password: "<wrong>" }`).

### A4 - Unverified user is blocked at login with 403
Steps:
1. Register but skip verification
2. POST `/auth/login`

Expected: 403 with `Email not verified`.
Where: **BE**.

### A5 - Logged-in user is redirected from `/` to `/discover`
Steps:
1. Seed `auth_token` in storage state
2. Navigate to `/`

Expected: URL ends on `/discover`.
Where: **PW-mock** (already passing) + **PW-real**.

### A6 - Refresh-token rotation invalidates the original token
Steps:
1. Login -> capture `(at1, rt1)`
2. POST `/auth/refresh` with `rt1` -> capture `(at2, rt2)`
3. POST `/auth/refresh` with `rt1` again

Expected: step 2 returns 200 with new pair; step 3 returns 401 (rt1 revoked on use, per `auth_service.refresh_tokens`).
Where: **BE**.

### A7 - Logout invalidates ALL refresh tokens for the user
Steps:
1. Login twice from two clients -> capture `rtA`, `rtB`
2. POST `/auth/logout` from client A
3. POST `/auth/refresh` with `rtA`, then with `rtB`

Expected: logout 200/204; both subsequent refreshes 401. `auth_service.logout` revokes every refresh token belonging to the user, not just the one in the request body. Worth surfacing in error UX so other open clients are forced to sign in again.
Where: **BE** + **PW-real**.

### A8 - Forgot-password rate limit kicks in after 3 attempts
Steps:
1. POST `/auth/forgot-password` 4 times for the same email within 15 min

Expected: first 3 return 200 (idempotent), 4th returns 429.
Where: **BE**.

### A9 - Reused email at signup returns 409
Steps:
1. Register an email
2. Register the same email again

Expected: second response is 409 with duplicate-email detail.
Where: **BE**.

### A10 - Flutter mock-mode signup -> auto-login -> shell visible
Steps:
1. Launch app, tap Welcome -> "Create an account"
2. Fill email + password -> Submit
3. Welcome appears, tap Log in, fill same credentials

Expected: bottom-nav shell with Home / Feed / Search / Library / Upgrade visible (`Key('nav.home')` etc.).
Where: **FL**.

### A11 - Flutter logout from Library returns to Welcome
Steps:
1. Login as seeded mock user
2. Open Library tab
3. Tap `Key('library.logout')`

Expected: Welcome screen tagline visible, signup + login buttons present.
Where: **FL**.

### A12 - Password below minimum length rejected with 422
Steps:
1. POST `/auth/register` with `password = "short"` (<8 chars)

Expected: 422 with field error on `body.password` referencing the `min_length=8` constraint. (Note: the schema has no uppercase/digit complexity rule today; only length.)
Where: **BE**.

### A13 - Google OAuth: invalid id_token rejected; valid issues a session and flags new users
Steps:
1. POST `/auth/google` with `id_token = "invalid"`
2. POST `/auth/google` with a valid id_token (mocked verifier)

Expected: step 1 returns 401; step 2 returns 200 with `access_token`, `refresh_token`, and `is_new_user: true` for first-time and `false` on subsequent calls.
Where: **BE**.

### A14 - Facebook OAuth: missing token 422, revoked token 401
Steps:
1. POST `/auth/facebook` with `{}` (no token field)
2. POST `/auth/facebook` with a token the FB graph layer rejects

Expected: step 1 returns 422 (Pydantic missing field), step 2 returns 401 with auth-failed detail.
Where: **BE**.

---

## 2. Upload

### U1 - Upload an mp3 end-to-end and own the resulting track
Steps:
1. Login (real backend) -> `/creator/upload`
2. Drop a 1-2s silent mp3 fixture (well under the 100 MB limit)
3. Fill title, description, public visibility -> Upload
4. After success screen, GET `/users/{username}/tracks` (note: route uses `username`, not user id; substitute the logged-in user's handle)

Expected: success screen visible with the title; `/tracks/{newId}` returns the track; track appears in owner's track list.
Where: **PW-real** + **BE** (multipart contract).

### U2 - Drag-and-drop pre-fills title from filename and a subsequent file-replace updates it
Steps:
1. Open `/creator/upload`
2. Drag-and-drop `My Demo Track.mp3` -> advance to metadata
3. Click Replace track, drop `Second Track.mp3`

Expected: after step 2, title input value = "My Demo Track" (extension stripped); after step 3, title updates to "Second Track" and the dropzone briefly returns during the swap.
Where: **PW-mock** (canonical; covers what former U2 + U4 asserted separately).

### U3 - Submitting with whitespace-only title shows inline error and does NOT call the API
Steps:
1. Reach metadata step
2. Set title to "   "
3. Click Upload
4. Count POSTs to `/api/tracks` via `page.route`

Expected: visible "Title is required" error; route count = 0.
Where: **PW-mock**.

### U4 - Quit-upload modal preserves draft on Cancel and discards on Confirm
Steps:
1. Reach metadata, fill title "WIP"
2. Click Close -> "Cancel"
3. Click Close -> "Quit"

Expected: after Cancel, title still "WIP"; after Quit, returned to select step with empty title and no draft restored.
Where: **PW-mock**.

### U5 - Track over 100 MB rejected
Steps:
1. POST `/tracks/` multipart with file size = `TRACK_MAX_SIZE` (100 MB) + 1 byte

Expected: 400 with file-too-large detail (per current `track_service`; flip to 413/422 once contract decision is made).
Where: **BE**.

### U6 - Non-audio file shows visible UI error
Steps:
1. Upload a `.txt` via the dropzone

Expected: error banner ("Unsupported file type") visible; submit button disabled or absent.
Where: **PW-mock** (`upload-validation.spec.ts`).

### U7 - Backend rejects wrong MIME at multipart boundary
Steps:
1. POST `/tracks/` with `audio_file` set to a text file pretending to be `audio/mpeg`

Expected: 422 with content-type validation error.
Where: **BE**.

### U8 - Add then remove artwork returns to placeholder
Steps:
1. Upload audio, advance to metadata
2. Add a cover image -> remove it -> click Upload

Expected: preview cleared after remove; final track has `cover_url == null`.
Where: **PW-mock** + **BE** (assert `cover_url` null on GET `/tracks/{id}`).

### U9 - Track cover image over 10 MB rejected
Steps:
1. POST `/tracks/` with cover file size = `COVER_MAX_SIZE` (10 MB) + 1 byte

Expected: 400 with size-related detail.
Where: **BE**.

### U10 - Forced 500 from backend during upload surfaces an error and keeps the form editable
Steps:
1. `page.route('**/api/tracks', r => r.fulfill({ status: 500 }))`
2. Submit a valid metadata payload

Expected: error toast / inline message visible; form fields still editable; success screen NOT visible.
Where: **PW-mock**.

### U11 - Two consecutive uploads in the same session both succeed
Steps:
1. Upload track A -> success -> close success
2. Upload track B without page reload

Expected: both tracks visible in owner's profile; backend issues two distinct ids.
Where: **PW-real**.

### U12 - Multipart with missing required `title` Form field returns 422
Steps:
1. POST `/tracks/` multipart including a valid `audio_file` but omitting the `title` form field

Expected: 422 with FastAPI Form-field validation error pointing at `title`.
Where: **BE**.

---

## 3. Track playback

### P1 - Playing a track records exactly one play
Steps:
1. Open `/track/{id}` (logged in)
2. Click play in GlobalPlayer
3. Wait for the player to start
4. GET `/tracks/{id}` after a short delay

Expected: one POST to `/tracks/{id}/plays` (intercepted), `play_count` increments by exactly 1.
Where: **PW-real** + **BE**.

### P2 - Range streaming returns 206 with `Content-Range`
Steps:
1. GET `/tracks/{id}/audio` with header `Range: bytes=0-1023`

Expected: 206; `Content-Range: bytes 0-1023/<total>`; body length 1024.
Where: **BE**.

### P3 - Pause then resume keeps current position
Steps:
1. Play a track for ~5 s
2. Pause -> note `currentTime`
3. Resume

Expected: on resume, `currentTime` equals the paused value within 250 ms; no second POST to `/plays` for the same session.
Where: **PW-mock**.

### P4 - Scrubbing the progress bar seeks to the clicked position
Steps:
1. Play track
2. Click progress bar at 50% width

Expected: `currentTime` is approximately `duration / 2` within 1 s.
Where: **PW-mock**.

### P5 - Next / Prev advance through the queue and update the title
Steps:
1. Play first track from a list
2. Click Next -> Next -> Prev

Expected: title in `data-testid="player-title"` reflects the second-then-first track; queue index advances accordingly.
Where: **PW-mock**.

### P6 - Repeat-one replays the same track at end-of-track
Steps:
1. Toggle repeat to "one"
2. Seek to near end, let it elapse

Expected: same track restarts from 0 without advancing the queue.
Where: **PW-mock**.

### P7 - Shuffle does not put the currently-playing track at queue head twice
Steps:
1. Play track A from a 5-item queue
2. Toggle shuffle on

Expected: queue length still 5, A at index 0, no duplicate of A elsewhere.
Where: **PW-mock**.

### P8 - Anonymous user can stream but Like surfaces the sign-in modal
Steps:
1. Open `/track/{id}` while logged out
2. Click play -> verify audio plays
3. Click Like

Expected: audio starts (anonymous streaming allowed); LoginModal opens on Like; no POST to `/likes/...`.
Where: **PW-real**. (Cross-listed with Auth as the LoginModal trigger path.)

### P9 - Flutter MiniPlayer toggles play/pause icon and audio actually starts
Steps:
1. Login, tap a Home `Key('home.trackTile.<id>')`
2. Confirm `Key('miniPlayer.root')` visible
3. Tap `Key('miniPlayer.playPause')` twice

Expected: icon transitions play -> pause -> play; `just_audio.AudioPlayer.playing` is true between taps.
Where: **FL**.

### P10 - Switching tracks from a Home tile updates the MiniPlayer title
Steps:
1. Tap track tile A -> note MiniPlayer title
2. Tap track tile B

Expected: `Key('miniPlayer.title')` text changes from A to B.
Where: **FL**.

### P11 - Range past EOF returns 416; missing file on disk returns 404
Steps:
1. GET `/tracks/{id}/audio` with `Range: bytes=999999999-`
2. Manually delete the audio file from `UPLOAD_DIR` (test-only) and GET `/tracks/{id}/audio`

Expected: step 1 returns 416 with `Content-Range: */<total>`; step 2 returns 404 even though the DB row still exists.
Where: **BE**.

### P12 - Streaming concurrency under load
Scenario: 200 concurrent VUs walk Range chunks for 30 min on `/tracks/{id}/audio`.
Expected: `partial_content_206 > 95%`, `5xx < 1%`, first-byte p95 < 800 ms.
Where: **k6** (`scenarios/streaming.js`).

> Dropped: drag-reorder queue (former P8). High implementation cost vs payoff; ordering is already covered by P5 and the Jest queue tests.

---

## 4. Search

### S1 - Exact title returns the track first; clicking opens its page
Steps:
1. Seed a track titled `e2e-perf-keyword-<uuid>` via API
2. Type the keyword in the header search -> Enter
3. Click the first result row

Expected: results list includes the seeded track at index 0; click navigates to `/track/{seededId}`.
Where: **PW-real** + **BE**.

### S2 - Missing keyword returns 422
Steps:
1. GET `/search/tracks` with no `keyword` query param

Expected: 422 with FastAPI Query error.
Where: **BE**.

### S3 - Special characters and unicode round-trip through the URL
Steps:
1. Type `日本語 & co` in header search -> Enter
2. Inspect outgoing request URL

Expected: query string is URL-encoded; response 200; UI does not crash.
Where: **PW-mock** + **BE**.

### S4 - Search users -> click -> opens profile
Steps:
1. Seed user `searchable_<uuid>`
2. Type partial username, Enter
3. Click result

Expected: 200 from `/search/users`; FE navigates to `/{username}`.
Where: **PW-real** + **BE**.

### S5 - No-results keyword shows empty-state copy
Steps:
1. Search for `zxqv-non-existent-string-9999`

Expected: empty-state component visible ("No results"); no result rows rendered.
Where: **PW-mock**.

### S6 - Search playlists 200 with empty array on miss
Steps:
1. GET `/search/playlists?keyword=zxqv9999`

Expected: 200, body `{ results: [] }` (or equivalent).
Where: **BE**.

### S7 - Flutter local filter is case-insensitive and clears on empty input
Steps:
1. Open Search tab
2. Type `LUTHER`, then clear

Expected: while typing, ListView contains the Luther row; after clear, the row is no longer rendered (or full list returns per current behavior).
Where: **FL**.

### S8 - Rapid typing only fires one request per 300 ms (debounce) - conditional
Steps:
1. Confirm FE has a debounce on the header search (`useDebounce` or similar). If absent, drop this scenario.
2. Type 8 chars in 200 ms with `page.keyboard.type`
3. Count requests to `/search/tracks`

Expected (only if debounce exists): <= 2 requests fire (last value wins).
Where: **PW-mock** (or skip if not implemented; do NOT assert behavior the FE does not have).

---

## 5. Profile

### Pr1 - Other user's profile shows public tracks only
Steps:
1. As user B, GET `/users/{userA_username}/tracks`
2. Compare to userA's own GET `/users/me/tracks`

Expected: B's view excludes private/draft tracks; A's view includes them.
Where: **BE**.

### Pr2 - Follow then unfollow updates both profile counts
Steps:
1. POST `/users/{userB}/follow` from A
2. GET `/users/{userB}` (followers count) and `/users/me` (following count)
3. DELETE `/users/{userB}/follow` from A
4. Repeat the GETs

Expected: counts +1 then -1; double-follow returns 400.
Where: **BE**. (FE follow button does not currently fire the call - tracked as a gap signal in `e2e/real/profile-real.spec.ts`.)

### Pr3 - PATCH `/users/me` (bio) reflects on public profile
Steps:
1. PATCH `/users/me` with `bio = "Hello world <uuid>"`
2. GET `/users/{me_username}`

Expected: returned `bio` equals the new value.
Where: **BE** + **PW-real** (`settings-real.spec.ts`).

### Pr4 - Privacy toggle: assert current behavior + flag contract gap
Steps:
1. PATCH `/users/me/privacy` with `is_private=true`
2. As user B (non-follower), GET `/search/users?keyword={my_username}`
3. As user B, GET `/users/{my_username}`

Expected (current code): the private user STILL appears in search results - `search_service.search_users` does not filter on `is_private`; the public profile GET returns the user with `is_private: true`. Test asserts this status quo and flags it as a contract gap to be reviewed (the feature implies hiding from non-followers, the implementation does not enforce it).
Where: **BE**.

### Pr5 - Avatar > 5 MB rejected
Steps:
1. PUT `/users/me/avatar` with a 5 MB + 1 byte JPEG

Expected: 400 (current) with size-related detail. Limit comes from `AVATAR_MAX_SIZE` in `user_service`.
Where: **BE**.

### Pr6 - Social link with non-https URL rejected
Steps:
1. PUT `/users/me/social-links` with `[{platform: "twitter", url: "http://twitter.com/foo"}]`

Expected: 422 with URL validator error.
Where: **BE**.

### Pr7 - Profile tabs switch sections (All / Playlists / Popular / Reposts)
Steps:
1. Open `/{artist}` (mock fixtures)
2. Click each tab in turn

Expected: section heading or tab-specific copy visible per tab; only one tab content active at a time.
Where: **PW-mock**.

### Pr8 - Owner profile shows Upload CTAs, not Follow
Steps:
1. Login -> visit `/{me_username}`

Expected: Upload CTA (`Upload now` text) visible; no Follow button rendered.
Where: **PW-mock**.

### Pr9 - Username-conflict on PATCH `/users/me/username` surfaces 409 in UI
Steps:
1. PATCH `/users/me/username` with an existing handle

Expected: 409 from BE; FE renders inline error in `[data-testid="settings-username-error"]`.
Where: **PW-real** + **BE**.

### Pr10 - Flutter ProfileScreen shows the seeded user's username
Steps:
1. Login as seeded mock user
2. `Navigator.pushNamed(context, '/profile')`

Expected: `Key('profile.username')` Text visible with the user's handle.
Where: **FL**.

### Pr11 - Combined PATCH `/users/me` (username + bio) atomicity
Steps:
1. PATCH `/users/me` with `{ username: "<unique>", bio: "<text>" }`
2. GET `/users/me` -> assert both applied
3. PATCH `/users/me` with `{ username: "<existing-other-user>", bio: "<new-text>" }`
4. GET `/users/me` -> inspect

Expected: step 1 returns 200 with both fields applied; step 3 returns 409 (duplicate username); step 4 reveals whether bio was rolled back atomically or partially applied. Test pins the actual behavior so a future refactor cannot silently change atomicity semantics.
Where: **BE**.

---

## 6. Navigation

### N1 - Hard refresh on a protected page preserves the session
Steps:
1. Login, navigate to `/settings/account` (route exists at `src/app/(with-header)/settings/account/page.tsx`)
2. Reload

Expected: page still on `/settings/account`, no redirect to `/login`, user info still loaded.
Where: **PW-real**.

### N2 - Avatar dropdown -> Sign out lands on landing and clears storage
Steps:
1. Login -> open avatar dropdown -> Sign out

Expected: URL `/`, `localStorage.auth_token` undefined, header shows Sign in button again.
Where: **PW-mock** (canonical; do not duplicate in real).

### N3 - Logo navigates contextually (`/discover` if authed, `/` if not)
Steps:
1. As logged-in user click logo from `/track/{id}`
2. Log out, click logo from `/`

Expected: `/discover` then `/`.
Where: **PW-mock**.

### N4 - Browser back from `/track/{id}` returns to the previous page
Steps:
1. Navigate `/discover` -> `/track/{id}` via UI
2. `page.goBack()`

Expected: URL `/discover`; primary content visible (no white-screen).
Where: **PW-mock**.

### N5 - Deep-link to `/track/{id}` while logged out plays the track and prompts login on Like
Steps:
1. Open `/track/{id}` directly without auth
2. Click Like

Expected: track page renders, audio plays, Like opens LoginModal.
Where: **PW-real**.

### N6 - Regression smoke: 10-cycle nav across Home / Feed / Library / Discover
Steps:
1. Loop visiting the four URLs 10 times

Expected: each step ends with `body` visible, no console errors of severity error.
Where: **PW-mock** (smoke / regression tier; not a feature scenario on its own).

### N7 - Flutter back from inner tab returns to Home, not exits app
Steps:
1. Login, open Library tab
2. Press system back

Expected: Home tab is selected; app does not exit.
Where: **FL**.

### N8 - Flutter deep-link to `/profile` opens ProfileScreen
Steps:
1. Login -> `Navigator.pushNamed(context, '/profile')`

Expected: ProfileScreen mounted, `Key('profile.username')` visible.
Where: **FL**.

---

## 7. Error handling

### E1 - Expired access token on `/users/me` triggers FE auto-logout
Steps:
1. Seed an expired `auth_token` in storage
2. Visit `/discover`
3. Wait for `/users/me` to fire

Expected: FE catches 401, clears storage, redirects to `/`.
Where: **PW-real**.

### E2 - Forgot-password 429 surfaces a "try again later" message
Steps:
1. Trigger 4 forgot-password requests in 15 min via API
2. The FE LoginModal does not expose a forgot-password entry point today, so this scenario is BE-only.

Expected: BE returns 429.
Where: **BE** (FE-side intentionally skipped - no UI path exists).

### E3 - Registration with invalid validators returns field-specific 422
Steps:
1. POST `/auth/register` with `password = "short"` (<8) AND `username = "Bad Name!"` (regex violation)

Expected: 422 with `loc: ["body", "password"]` and `loc: ["body", "username"]` errors. (Password has only `min_length=8`; username has the alphanumeric/`._-` regex.)
Where: **BE**.

### E4 - Following a private user: assert current behavior + flag gap
Steps:
1. User B sets `is_private=true`
2. User A POSTs `/users/{B}/follow`

Expected (current code): 200 with a follow row immediately created; `follower_service.follow_user` does NOT have any pending/request semantics. Test pins this status quo and flags it as a feature gap (privacy implies follow-requests; implementation has none).
Where: **BE**.

### E5 - Empty message body returns 422 from `model_validator`
Steps:
1. POST `/conversations/{id}/messages` with `{}` (no content, no track_id, no playlist_id)

Expected: 422 with model-level validation error.
Where: **BE**.

### E6 - Liking a track twice returns 400 and FE keeps the heart filled
Steps:
1. POST `/likes/tracks/{id}` (note: `engagement` router has no prefix - real path is `/likes/tracks/{id}`, not `/engagement/likes/...`)
2. POST again

Expected: first response 200, second 400 (idempotent contract per `engagement_service`); FE heart UI remains filled (no flicker).
Where: **BE** + **PW-real**.

### E7 - Search times out -> FE shows "Search unavailable" gracefully
Steps:
1. `page.route('**/search/tracks*', r => r.abort('timedout'))`
2. Submit a search

Expected: error banner / empty-state with retry CTA visible; no uncaught console error.
Where: **PW-mock**.

### E8 - Backend 500 on `/tracks/{id}/audio` -> GlobalPlayer pauses with error UI
Steps:
1. Start playing a track
2. `page.route('**/tracks/*/audio*', r => r.fulfill({ status: 500 }))`
3. Force a re-fetch (seek)

Expected: player pauses, error toast visible, play button is re-clickable.
Where: **PW-real**.

### E9 - Flutter login with offline network shows error inline
Steps:
1. Switch app to real-API mode (`USE_MOCK_AUTH=false`)
2. Disable network or point to unreachable BACKEND_URL
3. Login attempt

Expected: `Key('login.error')` Text visible with a clear message; form remains editable.
Where: **FL** (real-api smoke variant).

### E10 - Backend rate limit fires under spike load
Scenario: 0->1000 VUs in 30s on `/auth/login`.
Expected: rate limit fires (429s observable); 5xx + timeout < 5%.
Where: **k6** (`scenarios/spike.js`).

### E11 - `PATCH /conversations/{id}/messages/read-all` permissions + idempotency
Steps:
1. As a non-participant of conversation `C`, PATCH `/conversations/{C}/messages/read-all`
2. As a participant with 0 unread messages, PATCH the same endpoint
3. Repeat step 2 immediately

Expected: step 1 returns 403; steps 2 and 3 return 200 with no side effects on the second call (idempotent).
Where: **BE**.

---

## 8. Playlists (BE contract)

### PL1 - Adding the same track twice to a playlist
Steps:
1. POST `/playlists/{id}/tracks` with `{ track_id }` once
2. POST again with the same `track_id`

Expected: pin the actual contract per `playlist_service.add_track_to_playlist` - either 400 ("track already in playlist") or 200 idempotent. Test asserts whichever the service returns today and locks the behavior so a future refactor cannot silently change it.
Where: **BE**.

---

## Coverage matrix (concise)

| Category | PW-mock | PW-real | FL | BE | k6 |
|---|---|---|---|---|---|
| Auth | A2(modal), A5 | A2, A3, A5, A6, A7, P8(login modal trigger) | A10, A11 | A1, A3, A4, A6, A7, A8, A9, A12, A13, A14 | E10 |
| Upload | U2, U3, U4, U6, U10 | U1, U11 | - | U1, U5, U7, U8, U9, U12 | - |
| Playback | P3, P4, P5, P6, P7 | P1, P8, E8 | P9, P10 | P1, P2, P11 | P12 |
| Search | S3, S5, S8* | S1, S4 | S7 | S1, S2, S3, S4, S6 | - |
| Profile | Pr7, Pr8 | Pr3, Pr9 | Pr10 | Pr1, Pr2, Pr3, Pr4, Pr5, Pr6, Pr9, Pr11 | - |
| Navigation | N2, N3, N4, N6 | N1, N5 | N7, N8 | - | - |
| Error | E7 | E1, E6, E8 | E9 | E2, E3, E4, E5, E6, E11 | E10 |
| Playlists | - | - | - | PL1 | - |

\* S8 only if FE actually debounces. Otherwise drop.

Total scenarios: **64** (was 60: removed A12-old + P8-old + merged U4 into U2; added A12-new, A13, A14, U12, P11, Pr11, E11, PL1).

---

## Known UI gaps deliberately not turned into scenarios

- **FE forgot-password screen** - LoginModal does not expose a forgot link today.
- **FE OAuth redirect handler** - Google/Facebook buttons exist; redirect flow is not implemented.
- **FE follow button -> backend call** - `ProfileActions` does not POST `/users/{u}/follow`. `e2e/real/profile-real.spec.ts` will fail until wired (intentional gap signal).
- **Privacy hides users from search** - `search_service` does not filter on `is_private`. Pr4 documents the gap.
- **Follow-request semantics for private users** - `follower_service` has no pending/request state. E4 documents the gap.
- **Flutter upload / messaging / settings / playlists / public profile** - no screens exist; placeholder skip-tests are in place.
- **Flutter follow control on a public profile** - ProfileScreen only renders the user's own profile.
- **Search Enter on FE** - already a TODO in `search.spec.ts`; the new real spec asserts results-page navigation against the real `/search/tracks` response.
- **`/discover`, `/feed`, `/library` routes** - referenced by tests but no `app/` folders exist; navigation tests treat them as dynamic stubs.
- **Password complexity** - schema has only `min_length=8`; no uppercase/digit/symbol rule. Tests assert the actual constraint, not the assumed one.

## Advanced Scenarios
- **Audio Playback:** Verifies global player appearance and controls.
- **Social Interactions:** Verifies liking, following, and adding to playlists.
